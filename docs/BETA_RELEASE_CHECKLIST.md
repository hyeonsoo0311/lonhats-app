# Beta Release Checklist

Lonhats beta release is for learning from real users, not for a full public launch.

The beta should only start when the core loop works:

1. Sign up or log in.
2. Record one small proof in any stack.
3. See the record on Home.
4. Optionally share the proof to Community.
5. Send feedback from My.

## Release Position

- Stage: closed beta.
- Target size: 10-30 testers.
- Test period: 7 days.
- Primary goal: find friction in recording, food search, criteria setup, community proof sharing,
  and feedback submission.
- Not a goal: growth, monetization, public ranking, or large-scale marketing.

## Required Manual Checks

### Auth

- New user can sign up with email and password.
- Email verification link opens the app.
- Existing user can log in.
- User can log out.
- Password reset email opens the password update screen.
- Account deletion request can be submitted from My.

### Today's Better

- Home loads after login.
- User can create at least one Move Stack record.
- User can create at least one Meal Stack record with multiple foods.
- User can search common Korean foods, packaged foods, fruit, and vegetables.
- User can create one Recovery Stack record.
- User can create one Mind Stack record.
- Diary can be saved separately.
- Saved records appear on Home and expanded calendar.

### Life Direction

- User can create weekly routine criteria from My.
- Manual routine check-in updates weekly temperature and humidity signals.
- Report screen loads without permission errors.

### Community

- Community feed loads.
- User can share a small proof from a saved record.
- Post detail opens.
- User can comment.
- User can report inappropriate content.
- User can block another user.

### Beta Feedback

- User can submit feedback from My.
- Feedback appears in Supabase Dashboard `user_feedback`.
- Admin can see the feedback row.

## Technical Verification

Run before handing a build to testers:

```powershell
npm run format:check
npm run typecheck
npm run lint
npm run test
npm run check:food-search
npx expo export --platform android --output-dir "C:\Users\Public\Documents\ESTsoft\CreatorTemp\lonhats-export"
```

## Build Path

### Android First

Use Android as the first beta path when possible.

```powershell
npx eas-cli@latest build -p android --profile production
```

For Google Play beta distribution, use an internal or closed testing track.

### iOS Next

Use TestFlight after the Android beta flow is stable.

```powershell
npx eas-cli@latest build -p ios --profile production
```

iOS external beta requires Apple Developer Program and TestFlight review.

## Store Assets Needed

- App name: Lonhats.
- Short description.
- Long description.
- App icon.
- Splash screen.
- Privacy policy URL.
- Support email.
- Screenshots.
- Tester instructions.

## Beta Success Criteria

The beta is useful if we can answer:

- Where do users stop?
- Which record screen feels unclear?
- Does Meal Stack feel realistic enough?
- Do users understand life temperature and humidity?
- Do users want to share small proof?
- What feedback appears more than once?

Do not add large features during the first beta unless a core loop is blocked.
