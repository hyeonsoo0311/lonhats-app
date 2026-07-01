# Feature Spec

## Core Concept

The app is built around `Today's Better`, a simple record of something the user did today to move toward a better life.

Every record belongs to one of four stacks:

- `Move Stack`
- `Meal Stack`
- `Recovery Stack`
- `Mind Stack`

## Recording Requirements

Every stack record should support:

- Category.
- Optional duration.
- Optional quality, intensity, or rhythm score.
- Short meaning, encouraged but optional for Meal Stack.
- Optional note.
- Creation date.

Meaning adds emotional context, but Meal Stack must still be savable when the user only wants to
capture what they ate.

## Daily Recording

Home is the daily dashboard and the single entry point for today's activity. Each stack opens a
focused recording screen so the user can complete one small action without navigating through a
second generic recording page.

Rules:

- The user should not be forced to complete all stacks.
- One completed stack is a valid Today's Better.
- Detailed fields stay optional.
- Meal and Move supporting logs must be saved atomically with their matching stack entry.
- Saving personal stacks should happen before community sharing.
- Private details, especially Meal details, should not be automatically shared.

## Home Daily Dashboard

Home should behave like a daily record dashboard, not a marketing screen.

It should show:

- Life temperature.
- Life humidity.
- Personal routine completion rate.
- Clear entry points for `Meal`, `Move`, `Recovery`, `Mind`, `Body`, and diary.
- Meal slot status for breakfast, lunch, dinner, and snacks.
- Water intake should be saved as a Meal Stack rhythm entry, not as a separate Home row.
- A short list of today's saved records.

Home should make it obvious what the user can record next.

The Home calendar should support:

- A seven-day strip with today centered and three days on each side.
- An expanded calendar with year controls, all twelve months, and the selected month grid.
- A visible signal on dates that contain saved records.
- A short summary of the selected day's saved records inside the expanded calendar.

## Move Stack

Required:

- Movement type: health training, running, yoga, pilates, walking, home training, or custom.
- Duration.
- Intensity: light, moderate, hard, or beyond the limit.
- Today's meaning.

Optional:

- Body part.
- Sets, reps, weight, or workout memo.
- Distance.
- Pace.
- Course.
- Estimated calories.

## Meal Stack

Required:

- Meal type or meal category.
- Meal slot: breakfast, lunch, dinner, snack, drink, or custom.
- One or more foods in the same meal.
- Amount in grams for each food when available.
- Meal rhythm signal.

Optional:

- Calories.
- Protein, carbohydrates, fat.
- Food source data.
- Today's meaning.

Food analysis should show the serving basis clearly, such as `현미밥 210g 기준 320kcal`. It should help the user understand the record. It should not make the app feel like a strict diet audit.
Every search result and saved food should show a human-readable data source. One meal creates one
Meal Stack entry and links all included food items to it.

Food data quality rules:

- Public API nutrients must be mapped per source schema and implausible incomplete results are hidden.
- Official MFDS food results are limited by the API's origin metadata, not by individual food-code
  exceptions: household analyzed foods, restaurant analyzed foods, and restaurant
  ingredient-derived foods, and processed foods.
- Official raw ingredient results use the national integrated raw ingredient endpoint and are limited
  to sourced `원재료성 식품` records with an explicit gram basis. This covers fruit, vegetables, nuts,
  grains, and similar ingredient-level foods.
- Raw ingredient search results should display common food names such as `사과`, `바나나`, or `오이`
  instead of technical source names such as cultivar plus preparation state. Keep the source code and
  official reference for traceability.
- Unsourced development seed foods must not appear in search or production data.
- Every approved community food must retain its submitted verification reference.
- MFDS source codes are presented as readable origin labels instead of raw database codes.
- Only results with an explicit gram serving basis are shown. Volume-based results are hidden unless
  a verified food-specific density conversion becomes available.
- Common Korean aliases such as `계란/달걀` and `후라이/프라이` should resolve to useful foods.
- Users can report incorrect food information.
- Users can propose a missing food with serving basis, nutrients, and a verification reference.
- Proposed foods remain pending until an admin approves them in Supabase Dashboard.
- Approved community foods show the contributor's Lonhats nickname.

## Recovery Stack

Required:

- Recovery type: sleep, nap, rest, stretching, meditation, bath, or custom.
- Recovery quality.
- Today's meaning.

Optional:

- Duration.
- Bedtime.
- Wake time.
- Calculated sleep duration.
- Fatigue note.
- Sleep quality note.
- Body condition.

## Body

Body records are private personal state records.

Supported fields:

- Height.
- Weight.
- Birth date.
- Sex.
- Skeletal muscle mass.
- Body fat percentage.
- Condition.
- Note.

Body data should not be automatically shared to community posts. It exists to help the user understand their own state, not to compare bodies.

## Mind Stack

Required:

- Mind category: reading, studying, writing, reflection, meditation, project, or custom.
- Focus quality.
- Today's meaning.

Optional:

- Duration.
- What was read, studied, written, or realized.

## Weekly Report

The weekly report should analyze life direction, not athletic performance.

It should answer:

- Was there enough movement?
- Was recovery present or missing?
- Was meal rhythm stable?
- Did the user keep a routine across the four stacks?
- Which stack needs gentle attention next?

Current report concepts:

- Life temperature: the user's personal routine criteria for movement, effort, and momentum.
- Life humidity: the user's personal routine criteria for recovery, steadiness, and rhythm.
- Routine score: overall stack consistency.
- Stack signals: simple messages for Move, Meal, Recovery, Mind.

## Diary

The diary is separate from Mind Stack.

Purpose:

- Let the user write a longer reflection.
- Store the mood of the day.
- Store one small win or sentence to remember.
- Keep recent diary entries visible.

The diary should not replace stack records. Stack records are for `Today's Better`; diary is for longer emotional context.

## Personal Criteria

Users can define their own meanings and routine targets for life temperature and life humidity.
The app owns the healthy display ranges.

The criteria page should support:

- App-defined optimal life temperature range: `15°C` to `25°C`.
- Default optimal life humidity range: `40%` to `50%`.
- User-defined routine criteria.
- Weekly routine targets as the default MVP criteria unit.
- Routine targets such as waking up early, drinking water, exercising weekly, limiting reels, reading monthly, studying, or recovering.
- Routine association with `Move`, `Meal`, `Recovery`, `Mind`, or general `Life`.
- Manual routine check-ins for criteria that cannot be inferred from stack records.
- Automatic routine progress only when the routine title clearly matches the saved stack category.
- Manual routine check-ins when a match cannot be determined safely.
- Criteria writing guidance based on measurable behavior, period, and target count. Examples:
  `go to the gym 3 times a week`, `drink 2L of water each day`, `sleep at least 6 hours each day`,
  and `read one book a month` translated into weekly action units for MVP.
- What temperature means to the user.
- What low temperature means.
- What overly high temperature means.
- What humidity means to the user.
- What low humidity means.
- What overly high humidity means.

The temperature and humidity meaning fields are interpretive writing, not the scoring formula. The
UI must explain that values are calculated from weekly routine criteria, routine check-ins, and
records. Empty meaning fields should show light example placeholders so users know how to write
their own criteria without mistaking examples for saved values.

Temperature and humidity should represent different signals and should not use the same fallback score when one side has no matching routine weight:

- Life temperature is a more quantitative execution signal: movement, study, project work, and other routines that show action and momentum.
- Life humidity is a more qualitative rhythm signal: recovery, meal rhythm, sleep, mental steadiness, and other routines that keep the day from drying out.

The home screen compares the current report against the app-defined ranges. If the user has active routine criteria, life temperature and humidity should be based on how those routines are maintained. If no routine criteria exist yet, the app can fall back to stack-record analysis.

## Community

The community channel is `Better tomorrow`.

Primary post type:

- Small proof.

Small proof kinds:

- `Today's Better`
- `7-day challenge`
- `Weekly share`

Small proof posts should support:

- Author name.
- Proof title.
- Stack.
- Proof kind.
- Optional source record.
- Optional challenge day.
- Short summary.
- Quoted reflection.
- Votes.
- Comments.
- Reporting inappropriate posts or comments.
- Blocking a user so their posts and comments are hidden from the blocker.

Example:

```text
민지님이 오늘의 Better를 완료했습니다.
Move Stack · 30분 걷기 · 적당히

"퇴근하고 바로 누울 뻔했는데, 20분만 걷고 왔다."
```

Community should reward consistency and belonging. It should not rank bodies, weight loss, calories burned, or productivity.

## Admin And Data

Supabase Dashboard is the admin surface for now.

Data structures should leave room for a future admin page:

- User profiles.
- Life entries.
- Meal logs.
- Workout logs.
- Weekly summaries.
- Community posts.
- Community comments.
- User feedback.
- Admin notes.
- App notices.
- Food submissions and food reports.
- Community reports.
- Account deletion requests.

## Beta Feedback

Closed beta users can submit feedback from My.

Feedback should support:

- Category: blocked flow, friction, feature request, or general.
- Free text body.
- Authenticated user ownership.
- Admin review in Supabase Dashboard.

Feedback is for product learning. It should not be shown publicly and should not become a ranking or
voting feature.

## Account Management

Required:

- Email/password sign-in.
- Email verification link handling through the app deep link.
- Password reset email.
- Password update screen after opening the reset link.
- In-app account deletion request.

Account deletion is handled as a request for MVP. The request is stored in Supabase for admin
review and processing. Do not expose service-role deletion from the client app.

## Non-Goals For Now

- Public rankings.
- Complex challenge marketplace.
- Full coach dashboard.
- Paid subscription.
- AI-generated medical or nutritional advice.
- Precision fitness programming.
