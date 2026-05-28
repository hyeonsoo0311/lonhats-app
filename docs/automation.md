# Development Automation

## Commands

```powershell
npm run start
npm run start:clear
npm run start:tunnel
npm run start:go
npm run lint
npm run typecheck
npm run format
npm run format:check
npm run test
```

Codex Run button:

```powershell
powershell -ExecutionPolicy Bypass -File ./script/build_and_run.ps1
```

## Checks

- `lint`: static code quality.
- `typecheck`: TypeScript correctness.
- `format:check`: formatting drift.
- `test`: pure business logic such as calorie and weekly analysis.

## Expo Go

Use `npm run start`, then scan the QR code with Expo Go.

## Supabase

Copy `.env.example` to `.env` and fill:

```text
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Only publishable client keys should be used in the Expo app. Do not put service role keys in the app.
