# Data Model Draft

## Core Tables

- `profiles`: display name, app role, body data, and user preferences.
- `life_entries`: shared record table for Move, Meal, Recovery, and Mind.
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
