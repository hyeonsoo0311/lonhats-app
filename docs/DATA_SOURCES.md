# Data Sources

This document defines which data Lonhats may use. Registering an API key does not mean the app
currently uses that API.

## Food Nutrition

### Official MFDS Food Nutrition Database

- Provider: 식품의약품안전처
- API: `FoodNtrCpntDbInfo02/getFoodNtrCpntDbInq02`
- Endpoint: `https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo02`
- Used through: Supabase Edge Function `search-food`
- Allowed origins:
  - 가정식 실제 분석값
  - 외식 실제 분석값
  - 외식 재료량 산출값
  - 가공식품
- Required quality conditions:
  - Explicit `g` serving basis
  - Positive calories
  - At least one positive carbohydrate, protein, or fat value

### Official Raw Ingredient Nutrition Data

- Provider: 전국 통합 식품영양성분정보
- API: `tn_pubr_public_nutri_material_info_api`
- Endpoint: `https://api.data.go.kr/openapi/tn_pubr_public_nutri_material_info_api`
- Used through: Supabase Edge Function `search-food`
- Search field: `foodLv4Nm`
- Allowed origin: 원재료성 식품
- Required quality conditions:
  - Explicit `g` serving basis such as `100g`
  - Positive calories
  - At least one positive carbohydrate, protein, or fat value
  - Official food code
  - Official data source reference such as `srcNm`

This source is used for raw fruits, vegetables, nuts, grains, and other ingredient-level foods that
may not appear in the MFDS dish/product search.

### Historical Official Meal Records

Some existing meal records were created while these official data.go.kr APIs were active:

- 전국통합식품영양성분정보표준데이터:
  `https://api.data.go.kr/openapi/tn_pubr_public_nutri_info_api`
- 전국통합식품영양성분정보(가공식품)표준데이터:
  `https://api.data.go.kr/openapi/tn_pubr_public_nutri_process_info_api`

They remain as sourced historical records, but new searches use the MFDS Food Nutrition Database
through `search-food`.

### Approved Community Food

- Provider: Lonhats users
- Storage: `food_submissions` and approved `food_items`
- Publication rule: administrator approval required
- Required source: `reference_note`
- Display: contributor nickname and submitted verification reference

## Exercise Energy Reference

- Provider: Adult Compendium of Physical Activities
- Storage: `exercise_catalog`
- Usage: supporting MET-based calorie estimates
- Traceability: every activity stores a source name and source code

Exercise calories are estimates, not measurements.

## User-Owned Data

Profiles, stacks, meals, workouts, routines, body logs, diary entries, and community activity are
created by users and stored in Supabase under the existing ownership and RLS rules.

## Derived Data

Life temperature, life humidity, weekly summaries, and calorie totals are calculated by Lonhats
from the user's records. They are derived signals, not external facts.

## Forbidden Data

- Unsourced development seed data
- Invented nutrition values
- Automatic `mL` to `g` conversion without verified food-specific density
- Community food without a verification reference and administrator approval
