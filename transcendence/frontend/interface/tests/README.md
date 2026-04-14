# E2E Test Architecture (Playwright)

This folder contains end-to-end test architecture for the frontend interface.

## Structure

- `tests/e2e/`: executable E2E specs
- `tests/e2e/helpers/`: shared helpers for auth, navigation, and setup
- `tests/e2e/auth-flow.spec.js`: first auth scenario using the shared helper
- `playwright.config.js`: shared runtime config

## Commands

From repository root:

- `npm run test:e2e`
- `npm run test:e2e:headed`

Or from `transcendence/frontend/interface`:

- `npm run test:e2e`
- `npm run test:e2e:headed`
- `npm run test:e2e:list`

## Environment Variables

- Local configuration is loaded from `transcendence/frontend/interface/.env.e2e`.
- Optional local overrides can live in `transcendence/frontend/interface/.env.e2e.local`.
- Example file: `transcendence/frontend/interface/.env.e2e.example`
- `E2E_BASE_URL` (default: `https://localhost`)
- Shared credential roles use the pattern `E2E_<ROLE>_EMAIL` and `E2E_<ROLE>_PASSWORD`.
- Current roles used by the scaffold:
  - `SMOKE_USER`
  - `USER_A`
  - `USER_B`
  - `USER_C`

## First-time setup

1. Copy `.env.e2e.example` to `.env.e2e` and fill the real test accounts.
2. Install dependencies in `transcendence/frontend/interface`.
3. Install Playwright browser:
   - `npx playwright install chromium`

## Notes

- Keep this branch focused on test architecture only.
- Add business-critical scenarios in dedicated follow-up PRs.
- Prefer the shared auth helper instead of reimplementing login steps in each spec.
- Reuse `auth-flow.spec.js` as the reference pattern for future E2E scenarios.
