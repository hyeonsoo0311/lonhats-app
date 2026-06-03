-- lonhats personal gauge range criteria.

alter table public.life_gauge_criteria
  add column if not exists temperature_min_c numeric(3, 1) not null default 36.0
    check (temperature_min_c between 30.0 and 45.0),
  add column if not exists temperature_max_c numeric(3, 1) not null default 37.3
    check (temperature_max_c between 30.0 and 45.0),
  add column if not exists humidity_min_percent integer not null default 40
    check (humidity_min_percent between 0 and 100),
  add column if not exists humidity_max_percent integer not null default 50
    check (humidity_max_percent between 0 and 100);

do $$
begin
  alter table public.life_gauge_criteria
    add constraint life_gauge_criteria_temperature_range
      check (temperature_min_c <= temperature_max_c) not valid;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.life_gauge_criteria
    add constraint life_gauge_criteria_humidity_range
      check (humidity_min_percent <= humidity_max_percent) not valid;
exception
  when duplicate_object then null;
end $$;
