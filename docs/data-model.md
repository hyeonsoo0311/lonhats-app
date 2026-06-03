# Data Model Draft

## Core Tables

- `profiles`: display name, app role, body data, and user preferences.
- `life_entries`: shared record table for Move, Meal, Recovery, and Mind.
- `life_gauge_criteria`: user-defined criteria for interpreting life temperature and humidity.
- `life_routines`: user-defined routine criteria that drive life temperature and humidity.
- `life_routine_checkins`: manual confirmations for routine criteria that cannot be inferred from stack records.
- `body_logs`: private body state records.
- `workout_logs`: supporting workout output table for MET and calorie estimates.
- `exercise_catalog`: reusable exercise activity catalog with MET values.
- `meal_logs`: supporting food and nutrition record table.
- `food_items`: cached or seeded nutrition items.
- `journal_entries`: legacy daily reflection table, kept for compatibility.
- `weekly_summaries`: future generated weekly reports.
- `community_posts`, `community_comments`, `community_votes`, `community_reports`: Better tomorrow community.
- `user_feedback`: user-submitted feedback.
- `admin_notes`: private admin notes about users or operations.
- `app_notices`: admin-published notices.

## `life_entries`

`life_entries` is the product center. It stores the minimum common shape for any life record:

- `stack`: `move`, `meal`, `recovery`, or `mind`.
- `category`: user-facing category such as running, lunch, sleep, or reading.
- `title`: short display label.
- `entry_date`: record date.
- `duration_minutes`: optional duration.
- `intensity`: optional Move intensity.
- `meaning`: why today's record mattered.
- `note`: optional free text.
- `score`: optional 0-100 signal used in reports.
- `details`: optional JSON for stack-specific fields.

## Ownership

Every user-owned table includes `user_id uuid references auth.users(id)` and Row Level Security. Users can read and write only their own rows. Admin-only access uses `public.profiles.role = 'admin'` through the private helper `app_private.is_admin()`.

## Community Proofs

`community_posts` supports both general discussion and structured small proof posts:

- `post_type`: `discussion` or `proof`.
- `proof_kind`: `daily_better`, `challenge_day`, or `weekly_share`.
- `stack`: optional Move, Meal, Recovery, or Mind stack.
- `source_life_entry_id`: optional link back to the user's record.
- `challenge_day`: optional progress day for challenge posts.

## Personal Gauge Criteria

`life_gauge_criteria` stores one row per user:

- `target_temperature`: the user's desired life temperature.
- `target_humidity`: the user's desired life humidity.
- `temperature_min_c`: default `36.0`, user-configurable.
- `temperature_max_c`: default `37.3`, user-configurable.
- `humidity_min_percent`: default `40`, user-configurable.
- `humidity_max_percent`: default `50`, user-configurable.
- `temperature_definition`: what life temperature means to the user.
- `temperature_low_note`: how low temperature shows up.
- `temperature_high_note`: how overly high temperature shows up.
- `humidity_definition`: what life humidity means to the user.
- `humidity_low_note`: how low humidity shows up.
- `humidity_high_note`: how overly high humidity shows up.

`life_routines` stores the user's personal routine criteria:

- `title`: user-facing routine name, such as `주 3회 운동 가기`.
- `stack`: optional related stack, or `null` for general life criteria.
- `cadence`: `daily`, `weekly`, or `monthly`.
- `target_count`: expected completion count for weekly or monthly routines.
- `temperature_weight`: how strongly the routine affects life temperature.
- `humidity_weight`: how strongly the routine affects life humidity.
- `is_active`: inactive routines stay out of new calculations.

`life_routine_checkins` stores manual routine confirmations:

- `routine_id`: the routine being checked.
- `checked_on`: the day the user kept the routine.
- `completed`: whether the routine was kept.
- `note`: optional context.

When a routine has a related stack, matching `life_entries` can also count toward that routine's progress. Manual check-ins are used for criteria like water intake, screen-time limits, or waking up early.

## Body Logs

`body_logs` stores private user-owned body state records:

- `measured_on`: record date.
- `height_cm`: height.
- `weight_kg`: weight.
- `birth_date`: birth date.
- `sex`: `female`, `male`, or `other`.
- `skeletal_muscle_kg`: skeletal muscle mass.
- `body_fat_percent`: body fat percentage.
- `condition`: short user-facing condition label.
- `note`: optional private note.

Body logs are not automatically shared to the community.
