# UI Rules

## Product Feel

Lonhats should feel quiet, grounded, and personal. It should not feel like a fitness competition, a diet punishment tool, or a noisy social network.

The interface should help the user say:

"I did one small thing today, and it counts."

## First Screen Priority

The first screen is a date-led daily dashboard. It should focus on:

1. The current week and today's date.
2. Life temperature, humidity, and personal routine completion.
3. Clear daily entry rows for meal, move, recovery, mind, body, and diary.
4. Today's saved entries.

Water belongs inside meal rhythm, should save as a Meal Stack entry, and should not appear as a
separate Home row.

The expanded Home calendar should show year controls, all twelve months, the full selected month,
and compact record signals for days that contain saved entries.

Do not make a marketing-style landing page inside the app.

## Bottom Navigation

Bottom tabs should remain simple and non-duplicative:

- `오늘`
- `커뮤니티`
- `리포트`
- `마이`

Do not expose `Move`, `Meal`, `Recovery`, `Mind`, `Body`, `일기`, or a second generic recording tab as bottom tabs. These flows are reached from the daily dashboard.

## Visual Direction

The active Lonhats visual direction is a dense, high-contrast, dark graphite recording interface. It should feel like a personal daily instrument rather than a collection of generic cards.

Use:

- Dark graphite backgrounds and elevated neutral surfaces.
- White and muted-gray typography.
- Restrained accent colors for category identity and completion state.
- Compact rows, linework, spacing, and typography to organize information.
- Simple cards with minimal radius only when a section needs a boundary.

Avoid:

- Pastel stack cards.
- Cute or playful category colors.
- Generic habit-app softness.
- Color-coded productivity pressure.
- A separate card for every small action.

## Recording UI

Recording should be fast.

Rules:

- Use stack-specific screens.
- Put today's saved items before the entry form.
- Keep primary fields visible, labeled, and simple.
- Put detailed fields in an explicit optional section after the core fields.
- Make details optional.
- Keep the meaning field prominent.
- Avoid long forms that feel like tax documents.
- Meal entry should make meal type, fullness, score, time, multi-food composition, amount, source,
  and nutrition preview understandable.
- Meal search results should disclose a readable source and serving basis before the user adds them.
- Food sources should read like `가정식 실제 분석값` or `외식 재료량 산출값`, not raw database
  codes.
- Approved community food results should credit the contributor's Lonhats nickname without turning
  contribution into a ranking.
- Incorrect food data should be reportable from the selected-food state.
- Move entry should make title, start time, duration, content, type, intensity, and optional activity-specific details understandable.

Primary action wording:

- `Today’s Better 완료`
- `Move`
- `Meal`
- `Recovery`
- `Mind`
- `작은 인증 공유`

## Community UI

Community cards should look like small proof certificates, not status competition posts.

Good structure:

```text
현수님이 7일 챌린지 5일차를 완료했습니다.
Meal Stack · 단백질 충분 · 간식 없음

"완벽하진 않았지만 오늘은 야식을 참았다."
```

Community cards should show:

- Proof type.
- Stack.
- Author.
- Short proof title.
- Summary.
- Reflection quote.
- Comment count.
- Support vote count.

Avoid:

- Rank number.
- Before and after body comparison.
- Aggressive streak pressure.
- "You failed" messages.
- Competitive badges that imply hierarchy.

## Language

Use language that is warm and direct.

Prefer:

- "오늘 남긴 기록"
- "작은 인증"
- "삶의 방향"
- "움직임의 의미"
- "회복의 흔적"
- "완벽하지 않아도 기록할 수 있습니다."

Avoid:

- "실패"
- "게으름"
- "살 빼야 합니다"
- "상위 n%"
- "랭킹"
- "무조건"

## Visual Rules

- Use restrained cards for repeated records and community posts.
- Avoid decorative clutter.
- Avoid making every screen one color family.
- Keep text readable on mobile.
- Keep buttons stable in size.
- Use familiar icons for tabs and actions.
- Do not hide the main recording action.

## Stack Identity

Each stack should have a recognizable but not overwhelming identity:

- Move: active, grounded, body energy.
- Meal: warm, nourishing, rhythm.
- Recovery: cool, calm, rest.
- Mind: focused, reflective, quiet growth.

## Metrics

Metrics should be framed as signals, not judgments.

Good:

- `삶의 온도`
- `삶의 습도`
- `루틴 점수`
- `기록된 날`

Be careful with:

- Calories.
- Weight.
- Burned calories.
- Productivity scores.

These can exist only as supporting references.

When users define personal metric meanings, explain what changes the metric and what only changes
the interpretation. Example text should appear as placeholder guidance, not prefilled copy that
looks like the app has already decided the user's meaning.

Routine criteria guidance should be concrete before it is emotional. Ask users to write criteria as
`behavior + period + number`, such as going to the gym 3 times a week or sleeping at least 6 hours
each day. If the current MVP evaluates weekly progress, daily and monthly goals should be explained
as weekly check-in counts or weekly action units.
