# E2E CI Run Profiles

This document defines how E2E suites are executed in CI by risk level.

## Workflow files

- [.github/workflows/e2e-smoke.yml](.github/workflows/e2e-smoke.yml)
- [.github/workflows/e2e-critical.yml](.github/workflows/e2e-critical.yml)
- [.github/workflows/e2e-extended.yml](.github/workflows/e2e-extended.yml)

## Profile rules

1. Smoke
- Trigger:
  - every PR update (opened, synchronize, reopened, ready_for_review)
  - manual (`workflow_dispatch`)
- Purpose:
  - fast required quality gate before merge.

2. Critical
- Trigger:
  - PR only when label contains `e2e-critical` or `risk:high`
  - pre-release (`release.prereleased`)
  - manual (`workflow_dispatch`)
- Purpose:
  - run business-critical flows when change risk is high.

3. Extended
- Trigger:
  - nightly schedule (`02:30 UTC`)
  - manual (`workflow_dispatch`)
- Purpose:
  - resilience and non-blocking deeper checks.

## CI execution steps (all profiles)

1. checkout repository
2. `make up-bg`
3. `make seed-e2e-users`
4. run target suite (`make test-e2e-suite SUITE=<smoke|critical|extended>`)
5. `make down` (always)

## Required environment values

Current workflows use deterministic default test users seeded by backend command:

- `E2E_SMOKE_USER_EMAIL=smoke@e2e.local`
- `E2E_SMOKE_USER_PASSWORD=Smoke1234!`
- `E2E_USER_A_EMAIL=user-a@e2e.local`
- `E2E_USER_A_PASSWORD=MatchA1234!`
- `E2E_USER_B_EMAIL=user-b@e2e.local`
- `E2E_USER_B_PASSWORD=MatchB1234!`
- `E2E_USER_C_EMAIL=user-c@e2e.local`
- `E2E_USER_C_PASSWORD=MatchC1234!`
- `E2E_BASE_URL=https://localhost`

If your CI policy disallows inline credentials, move these values to repository secrets and reference them in workflow `env`.
