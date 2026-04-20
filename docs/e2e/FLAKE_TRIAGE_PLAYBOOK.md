# E2E Flake Triage Playbook

This playbook standardizes how to classify and resolve unstable E2E failures.

## 1) Initial classification

For every failure, classify it first:

1. Product regression
- Reproducible locally in a single clean run.
- Fails with the same step/assertion repeatedly.

2. Test flake
- Passes on immediate rerun without code changes.
- Failure signature points to timing, race, selector interception, transient infra.

3. Environment issue
- Service not ready, seed missing, auth state invalid, network/container instability.

## 2) Mandatory rerun protocol

1. Re-run the failed file only, once.
2. If still failing, re-run the single failing test with `--grep` once.
3. If still failing, run the suite once in clean conditions.
4. If result is inconsistent across runs, mark as candidate flake and collect artifacts.

Do not classify as flaky before at least one isolated rerun.

## 3) Artifacts to collect

From CI artifacts and local run outputs:

1. Playwright HTML report
2. test-results folder (video, screenshot, error-context)
3. Exact command used
4. Failure signature (file, test name, failing assertion)

## 4) Suite-level policy

Configured in CI via `E2E_RETRIES` and `E2E_TRACE`:

1. Smoke
- retries: `0`
- trace: `retain-on-failure`
- objective: fast, strict merge gate

2. Critical
- retries: `1`
- trace: `on-first-retry`
- objective: reduce false negatives while preserving signal

3. Extended
- retries: `2`
- trace: `on-first-retry`
- objective: maximize resilience checks on nightly runs

## 5) Fast diagnosis map

1. Timeout waiting for selector
- Check route/mocks and visibility conditions.
- Prefer wait helper based on user-visible state.

2. Element click intercepted
- Check overlays/fabs and z-index interactions.
- Use resilient click target strategy.

3. Wrong URL or missing redirect
- Check websocket trigger order and route guards.
- Ensure explicit event trigger exists in mocks.

4. Random auth failures
- Validate seeded users and storage state generation.
- Confirm base URL and HTTPS availability.

## 6) Ownership and follow-up

1. Create an issue tagged `e2e-flake` with artifacts and failure signature.
2. Assign owner by impacted domain:
- auth/profile: backend-auth owner
- game/matchmaking: game owner
- chat/invite/ws: chat owner
- CI/runtime: infra owner
3. If unresolved after 2 occurrences, prioritize in next sprint.

## 7) Exit criteria for flake fixes

A flake fix is considered done when:

1. Failing test passes in 3 consecutive local runs.
2. Next CI run of the impacted suite is green.
3. Root cause and fix note added to issue or changelog.
