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
- Short meaning.
- Optional note.
- Creation date.

The meaning field is required for the product experience. A record without emotional context becomes plain tracking, which is not the direction of Lonhats.

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
- Food text or meal note.
- Meal rhythm signal.
- Today's meaning.

Optional:

- Calories.
- Protein, carbohydrates, fat.
- Food source data.
- Amount.

Food analysis should help the user understand the record. It should not make the app feel like a strict diet audit.

## Recovery Stack

Required:

- Recovery type: sleep, nap, rest, stretching, meditation, bath, or custom.
- Recovery quality.
- Today's meaning.

Optional:

- Duration.
- Fatigue note.
- Sleep quality note.
- Body condition.

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

- Life temperature: movement and mental momentum.
- Life humidity: recovery, steadiness, and rhythm.
- Routine score: overall stack consistency.
- Stack signals: simple messages for Move, Meal, Recovery, Mind.

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

## Non-Goals For Now

- Public rankings.
- Complex challenge marketplace.
- Full coach dashboard.
- Paid subscription.
- AI-generated medical or nutritional advice.
- Precision fitness programming.
