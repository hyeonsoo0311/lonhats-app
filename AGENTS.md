# AGENTS.md

This file is the working guide for AI agents and human contributors building Lonhats.

## Product North Star

Lonhats is a record-based community app for people who quietly try to become better than yesterday.

It is not a precision workout tracker. It is not a calorie-optimization product. It is not a social comparison app.

The core loop is `Today's Better`:

1. Record something small and real.
2. Attach meaning to it.
3. Read the user's life direction through four stacks.
4. Optionally share a small proof with the community.

The four stacks are:

- `Move Stack`: movement, exercise, walking, running, yoga, pilates, home training.
- `Meal Stack`: food, meal rhythm, nutrition reference.
- `Recovery Stack`: sleep, rest, fatigue, stretching, recovery.
- `Mind Stack`: reading, studying, writing, reflection, projects.

## Source Of Truth

Before implementing product work, read these files:

- `docs/PRODUCT_DIRECTION.md`: product identity, audience, principles, non-goals.
- `docs/FEATURE_SPEC.md`: current feature requirements and behavior.
- `docs/UI_RULES.md`: interface, tone, writing, and visual rules.
- `docs/TASKS.md`: current backlog and implementation priorities.

Older files such as `docs/product.md`, `docs/features.md`, and `docs/data-model.md` may contain useful context, but the uppercase docs above are the current working references.

## Role Switching Workflow

When the user asks for a new feature or a product change, do not jump directly into code. Work through these roles in order.

### 1. Product Strategist

Check whether the request supports Lonhats' north star:

"record a small honest proof of effort, understand life direction, and feel less alone without comparison."

Classify the request as one of:

- `aligned`
- `partially aligned`
- `risky`
- `out of scope`

### 2. UX Designer

Design the user flow before implementation.

Prefer:

- Simple recording.
- Low friction.
- Emotional meaning.
- A clear default path.
- Optional details only when they add real value.

### 3. UI Designer

Define the interface before editing screens:

- Screen states.
- CTA copy.
- Empty states.
- Button hierarchy.
- Card layout.

Use `docs/UI_RULES.md`. Avoid generic fitness-app language.

### 4. Developer

Inspect existing code patterns before editing.

Rules:

- Use the smallest safe change.
- Do not refactor unrelated code.
- Preserve Supabase RLS.
- Preserve existing data ownership rules.

### 5. QA Reviewer

Check:

- Behavior.
- Edge cases.
- Empty states.
- Loading states.
- Error states.

Run typecheck, format, lint, and tests when meaningful.

### 6. Handoff

Summarize:

- Product decision.
- UX/UI changes.
- Files changed.
- How to test.
- Assumptions and risks.

## Implementation Rules

- Keep recording fast, simple, and emotionally meaningful.
- Prefer one clear action over several detailed tracking fields.
- Detailed workout, meal, recovery, or mind fields should be optional.
- Calories, macros, MET estimates, and scores are supporting signals, not the center of the product.
- Community should encourage consistency and belonging, not ranking, streak pressure, or comparison.
- Do not introduce public leaderboards, body transformation ranking, or shame-based language.
- Use existing project patterns before adding new abstractions.
- Keep Supabase Row Level Security on for user-owned data.
- Never expose secret API keys in app code.

## Development Commands

Use these commands before handing off meaningful changes:

```powershell
npm run typecheck
npm run format:check
npm run lint
npm run test
npx expo export --platform android --output-dir "C:\Users\Public\Documents\ESTsoft\CreatorTemp\lonhats-export"
```

For Expo Go testing:

```powershell
npm run start:tunnel
```

For Git in this workspace:

```powershell
git --git-dir=.git-codex --work-tree=. status -sb
git --git-dir=.git-codex --work-tree=. add -A
git --git-dir=.git-codex --work-tree=. commit -m "Describe change"
git --git-dir=.git-codex --work-tree=. push
```

## Current App Shape

- Expo Router app.
- Supabase Auth and database.
- `life_entries` is the core record table for the four stacks.
- `community_posts` supports small proof posts through `post_type`, `proof_kind`, `stack`, `source_life_entry_id`, and `challenge_day`.
- `journal_entries` stores the separate diary screen.
- `life_gauge_criteria` stores each user's personal life temperature and humidity criteria.
- `life_routines` and `life_routine_checkins` store each user's personal routine criteria and manual confirmations for life temperature and humidity.
- `body_logs` stores private body state records and must not be shared automatically.
- The `Better tomorrow` community is one channel for now.
- Bottom tabs should stay focused on `홈`, `Today`, `커뮤니티`, and `일기`. Stack recording screens are reached from Today/Home.
- The active brand direction is minimal, typographic, black-and-white, and editorial. Avoid pastel stack cards and playful category colors.

## Decision Rule

When a task is ambiguous, choose the option that best supports this sentence:

The user should be able to record a small honest proof of effort, understand what it meant for their life direction, and feel less alone without comparing themselves to others.
