# E2E Test Architecture (Playwright)

This folder contains end-to-end test architecture for the frontend interface.

## Structure

- `tests/e2e/smoke/`: fast checks for app health and entry points
- `tests/e2e/critical/`: blocking business flows (auth, matchmaking, payments, etc.)
- `tests/e2e/extended/`: non-blocking longer flows and edge cases
- `tests/e2e/helpers/`: shared helpers for auth, navigation, and setup
- `tests/e2e/critical/auth-flow.spec.js`: first auth scenario using the shared helper
- `playwright.config.js`: shared runtime config

## 3-Step Technical Plan

1. Foundation stability:
  - deterministic E2E users (`make seed-e2e-users`)
  - centralized env loading (`.env.e2e`, optional `.env.e2e.local`)
  - robust Playwright defaults for CI diagnostics (trace/video/screenshot on failure)
2. Suite scaling:
  - split tests into `smoke`, `critical`, `extended`
  - keep helpers reusable and side-effect free
  - run the minimum needed suite per context (local PR/nightly)
3. Execution targeting:
  - run by file, grep, suite, project and workers via Makefile variables
  - standardize naming so grep/suite filtering remains predictable

## Commands

From repository root:

- `npm run test:e2e`
- `npm run test:e2e:headed`
- `make test-e2e-list`
- `make test-e2e`
- `make test-e2e-suite SUITE=smoke`
- `make test-e2e-file FILE=tests/e2e/critical/auth-flow.spec.js`
- `make test-e2e-grep GREP="auth flow"`

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

## Role Storage States

Playwright runs a global setup before tests and creates role session files in `tests/e2e/.auth/`.

- If credentials exist for a role, setup logs in and writes a valid storage state.
- If credentials are missing (or login fails), setup writes an empty state file instead of failing the run.
- Authenticated specs can reuse these files with `test.use({ storageState: getRoleStateFilePath('ROLE_NAME') })`.

This keeps auth-dependent tests faster and reduces flaky re-login steps.

## First-time setup

1. Copy `.env.e2e.example` to `.env.e2e` and fill the real test accounts.
2. Install dependencies in `transcendence/frontend/interface`.
3. Create or refresh E2E users in DB:
  - `make seed-e2e-users`
4. Install Playwright browser:
   - `npx playwright install chromium`

## Notes

- Keep this branch focused on test architecture only.
- Add business-critical scenarios in dedicated follow-up PRs.
- Prefer the shared auth helper instead of reimplementing login steps in each spec.
- Reuse `auth-flow.spec.js` as the reference pattern for future E2E scenarios.
- Makefile variables for scalable targeting: `PROJECT`, `WORKERS`, `E2E_BASE_URL`, `FILE`, `GREP`.
- Add `SUITE` to select `smoke`, `critical`, or `extended` folders quickly.
