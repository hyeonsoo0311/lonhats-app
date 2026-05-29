-- Exercise catalog and MET-based calorie estimation support.

create table if not exists public.exercise_catalog (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  category text not null check (category in ('헬스', '요가', '필라테스', '러닝', '유산소', '스포츠')),
  name text not null,
  aliases text[] not null default '{}',
  met_value numeric not null check (met_value > 0),
  intensity text not null check (intensity in ('light', 'moderate', 'vigorous')),
  default_minutes integer not null default 30,
  description text not null,
  source text not null default '2024 Adult Compendium of Physical Activities',
  source_code text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.exercise_catalog enable row level security;

drop policy if exists "exercise_catalog_read_authenticated" on public.exercise_catalog;
create policy "exercise_catalog_read_authenticated" on public.exercise_catalog
  for select using ((select auth.uid()) is not null and is_active = true);

drop policy if exists "exercise_catalog_admin_all" on public.exercise_catalog;
create policy "exercise_catalog_admin_all" on public.exercise_catalog
  for all using (app_private.is_admin())
  with check (app_private.is_admin());

alter table public.workout_logs
  add column if not exists exercise_id uuid references public.exercise_catalog(id),
  add column if not exists exercise_category text,
  add column if not exists met_value numeric,
  add column if not exists estimated_calories integer,
  add column if not exists body_weight_kg numeric;

create index if not exists workout_logs_exercise_id_idx on public.workout_logs (exercise_id);
create index if not exists exercise_catalog_category_idx on public.exercise_catalog (category);

insert into public.exercise_catalog
  (slug, category, name, aliases, met_value, intensity, default_minutes, description, source_code)
values
  ('weight-training-general', '헬스', '웨이트 트레이닝', array['헬스', '근력운동', '웨이트', '중량운동'], 3.5, 'moderate', 45, '일반적인 근력 운동 세션', '02050'),
  ('weight-training-vigorous', '헬스', '고강도 웨이트 트레이닝', array['고강도 헬스', '파워리프팅', '무거운 중량'], 6.0, 'vigorous', 45, '짧은 휴식과 높은 강도의 근력 운동', '02052'),
  ('circuit-training', '헬스', '서킷 트레이닝', array['서킷', '순환운동', '인터벌 근력'], 8.0, 'vigorous', 30, '여러 동작을 짧은 휴식으로 반복하는 운동', '02045'),
  ('calisthenics-moderate', '헬스', '맨몸운동', array['푸시업', '스쿼트', '버피 제외 맨몸'], 3.8, 'moderate', 30, '중간 강도의 맨몸 근력 운동', '02024'),
  ('calisthenics-vigorous', '헬스', '고강도 맨몸운동', array['버피', '마운틴클라이머', '고강도 맨몸'], 8.0, 'vigorous', 25, '격렬한 맨몸 인터벌 운동', '02025'),
  ('stretching', '헬스', '스트레칭', array['가벼운 스트레칭', '모빌리티'], 2.3, 'light', 20, '관절 가동성과 회복 중심의 낮은 강도 활동', '02101'),
  ('hatha-yoga', '요가', '하타 요가', array['요가', '기본 요가', '하타'], 2.5, 'light', 40, '정적인 자세와 호흡 중심의 요가', '02100'),
  ('vinyasa-yoga', '요가', '빈야사 요가', array['빈야사', '플로우 요가', 'vinyasa'], 4.0, 'moderate', 45, '자세 전환이 이어지는 흐름형 요가', '02103'),
  ('power-yoga', '요가', '파워 요가', array['파워요가', '강한 요가'], 4.0, 'moderate', 45, '근력과 유연성을 함께 쓰는 중간 강도 요가', '02105'),
  ('restorative-yoga', '요가', '리스토러티브 요가', array['회복 요가', '릴렉스 요가'], 2.0, 'light', 40, '회복과 이완 중심의 낮은 강도 요가', '02108'),
  ('pilates-general', '필라테스', '필라테스', array['필라테스 일반', 'pilates'], 3.0, 'moderate', 45, '코어 안정성과 조절 중심의 필라테스', '02120'),
  ('pilates-mat', '필라테스', '매트 필라테스', array['매트필라테스', '홈 필라테스'], 3.0, 'moderate', 40, '매트에서 진행하는 코어 중심 필라테스', '02121'),
  ('pilates-reformer', '필라테스', '리포머 필라테스', array['기구 필라테스', '리포머'], 3.5, 'moderate', 50, '리포머 기구 저항을 활용하는 필라테스', '02122'),
  ('barre', '필라테스', '바레', array['바레 운동', '발레핏'], 3.5, 'moderate', 45, '발레 기반의 하체/코어 반복 운동', '02123'),
  ('running-8kph', '러닝', '러닝 8km/h', array['조깅', '천천히 달리기', '러닝'], 8.3, 'vigorous', 30, '대화가 어려워지는 수준의 가벼운 러닝', '12030'),
  ('running-9-7kph', '러닝', '러닝 9.7km/h', array['빠른 러닝', '6mph 러닝'], 9.8, 'vigorous', 30, '중상 강도의 지속 러닝', '12050'),
  ('running-10-8kph', '러닝', '러닝 10.8km/h', array['빠르게 달리기', '템포런'], 10.5, 'vigorous', 30, '높은 심박의 빠른 러닝', '12060'),
  ('running-interval', '러닝', '인터벌 러닝', array['인터벌', '스프린트 반복', '질주'], 11.0, 'vigorous', 20, '고강도 구간과 회복 구간을 반복하는 러닝', '12120'),
  ('walking-brisk', '유산소', '빠르게 걷기', array['파워워킹', '걷기', '빠른 걷기'], 4.3, 'moderate', 40, '약 5.6km/h 수준의 빠른 걷기', '17190'),
  ('incline-walking', '유산소', '경사 걷기', array['인클라인 걷기', '트레드밀 경사'], 5.0, 'moderate', 30, '트레드밀 경사를 활용한 걷기', '17200'),
  ('cycling-moderate', '유산소', '자전거 중강도', array['실내자전거', '사이클', '자전거'], 7.5, 'vigorous', 40, '중간 이상의 페이스로 타는 자전거', '01015'),
  ('spinning', '유산소', '스피닝', array['스핀바이크', '스피닝 수업'], 8.5, 'vigorous', 40, '고강도 실내 사이클 세션', '01018'),
  ('elliptical', '유산소', '일립티컬', array['엘립티컬', '크로스트레이너'], 5.0, 'moderate', 35, '관절 부담이 낮은 전신 유산소', '02048'),
  ('rowing-machine', '유산소', '로잉머신', array['로잉', '실내조정'], 7.0, 'vigorous', 25, '등과 하체를 함께 쓰는 전신 유산소', '14080'),
  ('swimming-moderate', '유산소', '수영 중강도', array['수영', '자유형', '평영'], 5.8, 'moderate', 40, '지속 가능한 중간 강도의 수영', '18310'),
  ('stair-climber', '유산소', '스텝밀', array['계단오르기', '천국의계단', '스테어마스터'], 8.8, 'vigorous', 20, '계단을 오르는 고강도 하체 유산소', '17133'),
  ('boxing-bag', '스포츠', '샌드백 복싱', array['복싱', '샌드백', '킥복싱'], 5.5, 'moderate', 30, '샌드백 타격 중심의 복싱 운동', '03050'),
  ('hiking', '스포츠', '등산', array['하이킹', '산행'], 6.0, 'vigorous', 90, '경사를 포함한 야외 보행 운동', '17080')
on conflict (slug) do update
set category = excluded.category,
    name = excluded.name,
    aliases = excluded.aliases,
    met_value = excluded.met_value,
    intensity = excluded.intensity,
    default_minutes = excluded.default_minutes,
    description = excluded.description,
    source_code = excluded.source_code,
    is_active = true,
    updated_at = now();
