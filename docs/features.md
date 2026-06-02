# Feature Spec

## Record First

Every core screen is a recording surface. The user should be able to leave a useful record even when they only have one minute and no detailed data.

## Move Stack

- Exercise kind: health training, running, yoga, pilates, walking, home training, or custom.
- Duration.
- Intensity: light, moderate, hard, or beyond the limit.
- Today's meaning.
- Optional details:
  - Health or home training: body part, sets, weight, reps, memo.
  - Running or walking: distance, pace, course, memo.
- Calorie burn estimate from exercise catalog and MET values as a supporting reference.

## Meal Stack

- Meal type and free-text food input.
- Automatic nutrition lookup through the configured Korean food nutrition API.
- Meal rhythm score.
- Today's meaning.
- Calories and macros as supporting reference.

## Recovery Stack

- Sleep, nap, rest, stretching, meditation, bath, or custom recovery category.
- Duration.
- Recovery quality score.
- Today's meaning.
- Notes for fatigue, sleep quality, and body condition.

## Mind Stack

- Reading, studying, writing, reflection, meditation, project, or custom category.
- Optional duration.
- Focus quality score.
- Today's meaning.
- Notes for what was read, studied, written, or realized.

## Weekly Life Direction Report

- Life temperature: movement and mental momentum.
- Life humidity: recovery, meal regularity, and steadiness.
- Routine score across Move, Meal, Recovery, and Mind.
- Stack-level signals that explain what was sufficient or missing.
- No shame-based recommendations.

## Future Enhancements

- User-defined personal temperature and humidity targets.
- Admin page built on the prepared Supabase tables.
- Weekly letter generated from life entries.
- Gentle reminders that respect missed days.
- More robust food and exercise search.
