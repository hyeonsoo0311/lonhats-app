# Tasks

This file tracks current product and implementation priorities. Update it when a major direction changes.

## Current Priority

Make Lonhats usable as a record-based community app centered on `Today's Better`.

## Completed Foundation

- Expo app setup.
- Supabase connection.
- Auth and profile foundation.
- Four stack recording structure.
- `life_entries` table.
- Food API integration through Supabase.
- Exercise catalog with calorie estimate support.
- Weekly life direction report.
- Better tomorrow community foundation.
- Small proof community metadata.
- Small proof feed and detail UI.
- Separate diary screen.
- Personal life temperature and humidity criteria.
- Personal routine criteria for life temperature and humidity.
- Minimal black-and-white brand direction.
- Unified Today stack creation flow.
- Daily Dashboard home structure.
- Meal recording with meal slots, gram amount, and nutrition basis.
- Recovery sleep recording with bedtime, wake time, and calculated sleep duration.
- Private Body records.

## Near-Term Tasks

### 1. Test The Full User Loop

Goal: confirm that a real user can complete the core loop.

Flow:

1. Sign up or log in.
2. Create one Move, Meal, Recovery, or Mind stack from Today.
3. View the record on the home screen.
4. Open community.
5. Select today's record.
6. Share a small proof.
7. Open the post detail.
8. Add a comment.

Acceptance criteria:

- No database permission error.
- No missing table or column error.
- The proof post shows stack, proof kind, summary, quote, votes, and comments.

### 2. Improve Small Proof Writing UX

Goal: make sharing feel natural, not like filling a form.

Ideas:

- Add one-tap prompt examples by stack.
- Add auto-generated proof summaries from selected records.
- Add quote placeholder variations.
- Add confirmation after sharing.

### 3. Add Weekly Share Flow

Goal: let users share a weekly Better summary.

Possible behavior:

- Pull weekly `life_entries`.
- Generate a simple stack summary.
- Let user edit the final community post before sharing.

### 4. Add Gentle Challenge Support

Goal: support a simple 7-day challenge without leaderboards.

Possible data:

- Challenge title.
- User challenge enrollment.
- Day number.
- Completed proof posts.

Rule:

- Do not rank users.
- Do not punish missed days.

### 5. Admin Dashboard Preparation

Goal: keep Supabase Dashboard useful now and prepare for a future admin page.

Check:

- `profiles`
- `life_entries`
- `community_posts`
- `community_comments`
- `user_feedback`
- `admin_notes`
- `app_notices`

### 6. Visual QA On Device

Goal: make sure Expo Go screens are readable and not crowded.

Check:

- Home screen.
- Each stack record screen.
- Report screen.
- Community feed.
- Post detail screen.
- Sign-in screen.
- Today unified stack screen.

## Later Tasks

- Push notifications with non-shaming copy.
- Weekly letter from records.
- Better food search UX.
- Better exercise activity matching.
- Profile editing.
- Account deletion flow.
- Report sharing.

## Task Decision Rule

When choosing what to build next, ask:

Does this make it easier for the user to record a small honest effort, understand its meaning, or feel less alone?

If the answer is no, lower the priority.
