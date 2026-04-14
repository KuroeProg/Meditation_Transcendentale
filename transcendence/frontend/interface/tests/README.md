# E2E Test Architecture (Playwright)

This folder contains end-to-end test architecture for the frontend interface.

## Structure

- `tests/e2e/`: executable E2E specs
- `tests/e2e/helpers/`: shared helpers for auth, navigation, and setup
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

- `E2E_BASE_URL` (default: `https://localhost`)

## First-time setup

1. Install dependencies in `transcendence/frontend/interface`.
2. Install Playwright browser:
   - `npx playwright install chromium`

## Notes

- Keep this branch focused on test architecture only.
- Add business-critical scenarios in dedicated follow-up PRs.
- Prefer the shared auth helper instead of reimplementing login steps in each spec.
