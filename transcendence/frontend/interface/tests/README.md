# Frontend E2E Test Runbook (Playwright)

This folder documents how to run and maintain E2E tests for the frontend interface.

## Test suites

- `tests/e2e/smoke/`
  - Fast deployment health checks.
  - Expected to run frequently.
- `tests/e2e/critical/`
  - Core product flows (auth, matchmaking, game shell, chat invites, profile updates).
  - Blocking quality gate before integration.
- `tests/e2e/extended/`
  - Resilience and non-blocking edge behavior.
  - Useful for deeper validation runs.

## Core architecture files

- `playwright.config.js`: shared config (base URL, retries, trace policy).
- `tests/e2e/setup/global.setup.js`: role storage state bootstrap.
- `tests/e2e/helpers/e2eEnv.js`: E2E env loading (shared + legacy fallback).
- `tests/e2e/helpers/storageState.js`: role storage path helpers.
- `tests/e2e/helpers/multiUser.js`: multi-context role orchestration.
- `tests/e2e/helpers/waits.js`: user-visible wait helpers.
- `tests/e2e/helpers/wsMocks.js`: deterministic websocket mocks.

## Commands

From repository root:

- `npm run test:e2e`
- `npm run test:e2e:headed`
- `make test-e2e-list`
- `make test-e2e`
- `make test-e2e-suite SUITE=smoke`
- `make test-e2e-suite SUITE=critical`
- `make test-e2e-suite SUITE=extended`
- `make test-e2e-file FILE=tests/e2e/critical/auth-flow.spec.js`
- `make test-e2e-grep GREP="matchmaking"`

From `transcendence/frontend/interface`:

- `npm run test:e2e`
- `npm run test:e2e:headed`
- `npm run test:e2e:list`

## Environment

- Preferred base env file: `transcendence/env/e2e/.env.e2e`
- Preferred overrides: `transcendence/env/e2e/.env.e2e.local`
- Example template: `transcendence/env/e2e/.env.e2e.example`
- Legacy fallback (still supported):
  - `transcendence/frontend/interface/.env.e2e`
  - `transcendence/frontend/interface/.env.e2e.local`

Main variables:

- `E2E_BASE_URL` (default: `https://localhost`)
- `E2E_SMOKE_USER_EMAIL`, `E2E_SMOKE_USER_PASSWORD`
- `E2E_USER_A_EMAIL`, `E2E_USER_A_PASSWORD`
- `E2E_USER_B_EMAIL`, `E2E_USER_B_PASSWORD`
- `E2E_USER_C_EMAIL`, `E2E_USER_C_PASSWORD`
- `E2E_RETRIES` (optional override for Playwright retries)
- `E2E_TRACE` (optional override for Playwright trace mode)

## Role storage states

Global setup creates role sessions in `tests/e2e/.auth/`.

- If credentials are present, setup attempts login and writes storage state.
- If credentials are missing or login fails, setup writes an empty state.
- Authenticated specs reuse role state with `test.use({ storageState: getRoleStateFilePath('ROLE_NAME') })`.

This keeps authenticated tests fast and avoids repeated UI logins in specs.

## First-time setup

1. Copy `transcendence/env/e2e/.env.e2e.example` to `transcendence/env/e2e/.env.e2e` and fill test accounts.
2. Install dependencies in `transcendence/frontend/interface`.
3. Seed deterministic fixtures:
   - `make seed-e2e-users`
4. Install browser binaries:
   - `npx playwright install chromium`

## Using another test user

1. Prefer changing only env values, not code.
  - Update `E2E_SMOKE_USER_*` or `E2E_USER_A/B/C_*` in `transcendence/env/e2e/.env.e2e`.
2. Re-seed deterministic data before running tests:
  - `make seed-e2e-users`
3. Run tests normally.

When code changes are needed:

- Only if you introduce a new role name (for example `USER_D`).
- In that case, add credentials variables and include the role in `tests/e2e/setup/global.setup.js` `ROLES`.

## Maintenance rules

- Prefer helpers over duplicated setup logic.
- Prefer assertions on user-visible outcomes.
- Avoid fixed sleeps.
- Keep selectors stable through `data-testid` on critical flows.
- Update `tests/e2e/README.md` when adding or renaming test ids.
