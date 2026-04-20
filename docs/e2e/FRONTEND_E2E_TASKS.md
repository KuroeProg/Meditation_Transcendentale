# Frontend E2E - Task Backlog (execution-ready)

Date: 2026-04-15
Scope: transcendence/frontend/interface
Source: docs/e2e/FRONTEND_E2E_FIRST_REPORT.md

## 1) Current baseline (already present)

Existing tests:
- tests/e2e/smoke/app-smoke.spec.js
- tests/e2e/smoke/dashboard-authenticated.spec.js
- tests/e2e/critical/auth-flow.spec.js

Existing infra:
- Role-based auth storageState in global setup (SMOKE_USER, USER_A, USER_B, USER_C)
- Suite run commands already wired:
  - make test-e2e-suite SUITE=smoke
  - make test-e2e-suite SUITE=critical
  - make test-e2e-suite SUITE=extended

## 2) Definition of Done for each task

A task is done only if all checks pass:
- The spec is in the correct suite folder (smoke/critical/extended).
- It is deterministic (no arbitrary sleep, no flaky timing assertions).
- It asserts user-visible outcomes only (redirect, modal, badge, message, page state).
- It can run alone with make test-e2e-file FILE=...
- It can run through its suite with make test-e2e-suite SUITE=...
- New helper code is in tests/e2e/helpers and reused when needed.

## 3) Wave A (immediate ROI)

Priority from report: 1, 4, 5, 9, 10, 12, 15, 16, 19

- [x] A0 - Stabilize selectors and test IDs for critical screens
  - Goal: avoid selector drift before adding many tests.
  - Deliverables:
    - Add stable data-testid hooks in auth, dashboard, game, chat, profile screens where missing.
    - Document selector contract in tests/e2e/README.md.
  - Accept criteria:
    - No new test uses fragile text-only selectors for core actions.

- [x] A1 - Smoke: public routes and guard sanity
  - Scenarios: #1 home render, #4 protected redirect
  - Target files:
    - tests/e2e/smoke/home-public.spec.js
    - tests/e2e/smoke/protected-redirect.spec.js
  - Accept criteria:
    - Guest visiting /dashboard is redirected to /auth.
    - Home shows main CTA and no blocking error UI.

- [x] A2 - Critical: login success shell access
  - Scenario: #5 login success redirects to app shell
  - Target file: tests/e2e/critical/auth-login-success.spec.js
  - Accept criteria:
    - Login lands on authenticated shell (dashboard or app landing).
    - Session is valid on refresh.

- [x] A3 - Critical: matchmaking start -> match found -> redirect
  - Scenarios: #9 and #10
  - Target file: tests/e2e/critical/matchmaking-redirect.spec.js
  - Dependencies: deterministic test data or mocked websocket event handshake.
  - Accept criteria:
    - Start matchmaking opens searching state/modal.
    - match_found leads to /game/:id with visible board shell.

- [x] A4 - Critical: game shell loads for existing game id
  - Scenario: #12
  - Target file: tests/e2e/critical/game-shell-load.spec.js
  - Accept criteria:
    - Visiting /game/:id as authenticated user renders board + player bars.

- [x] A5 - Critical: chat open + send message
  - Scenarios: #15 and #16
  - Target file: tests/e2e/critical/chat-send-message.spec.js
  - Dependencies: seeded conversation for USER_A/USER_B.
  - Accept criteria:
    - Chat drawer opens and conversation list is visible.
    - Sent message appears in thread for sender.

- [x] A6 - Critical: profile inline edit persistence
  - Scenario: #19
  - Target file: tests/e2e/critical/profile-edit-persistence.spec.js
  - Accept criteria:
    - Edit username or bio, save, reload, value persists.

## 4) Wave B (core completeness)

Priority from report: 6, 7, 8, 11, 13, 14, 17, 18, 20

- [x] B1 - Critical: invalid login shows error (#6)
  - File: tests/e2e/critical/auth-login-error.spec.js

- [x] B2 - Critical: 2FA branch completion (#7)
  - File: tests/e2e/critical/auth-2fa.spec.js
  - Note: gated by backend 2FA fixture support.

- [x] B3 - Critical: logout clears session (#8)
  - File: tests/e2e/critical/auth-logout.spec.js

- [x] B4 - Critical: cancel matchmaking (#11)
  - File: tests/e2e/critical/matchmaking-cancel.spec.js

- [x] B5 - Critical: resign reaches terminal state (#13)
  - File: tests/e2e/critical/game-resign-terminal.spec.js

- [x] B6 - Critical: draw offer accept path (#14)
  - File: tests/e2e/critical/game-draw-accept.spec.js

- [x] B7 - Critical: invite creation in chat thread (#17)
  - File: tests/e2e/critical/chat-invite-create.spec.js

- [x] B8 - Critical: invite accept navigates to game (#18)
  - File: tests/e2e/critical/chat-invite-accept.spec.js

- [x] B9 - Critical: avatar upload success/failure boundary (#20)
  - File: tests/e2e/critical/profile-avatar-upload.spec.js

## 5) Wave C (extended resilience)

Priority from report: 21-30

- [x] C1 - Notification invite update on non-chat page (#21)
- [x] C2 - Presence ping after visibility change (#22)
- [x] C3 - activeGameId session restore redirect (#23)
- [x] C4 - reduce motion persistence after reload (#24)
- [x] C5 - statistics chart toggles no UI error (#25)
- [x] C6 - typing indicator appears and clears (#26)
- [x] C7 - invite cancel status sync for sender (#27)
- [x] C8 - profile update transient API failure recovery (#28)
- [x] C9 - game websocket disconnect recoverable UI state (#29)
- [x] C10 - OAuth route behavior if enabled (#30)

Target folder for all C tasks:
- tests/e2e/extended/

## 6) Cross-cutting infra tasks (must be scheduled)

- [x] I1 - Seed strategy for deterministic data
  - Extend backend seed command to guarantee users, friendships, conversations, and match fixtures for E2E.

- [x] I2 - Multi-user orchestration helpers
  - Add helpers for USER_A/USER_B synchronized actions.
  - Prefer explicit two-context flow for invite and game interaction specs.

- [ ] I3 - API/websocket test control layer
  - Introduce stable helper utilities for waiting on user-visible state transitions.
  - Ban fixed sleeps in specs.

- [ ] I4 - E2E run profiles in CI
  - Smoke on each PR.
  - Critical on risky PR labels and pre-release.
  - Extended on nightly schedule.

- [ ] I5 - Reporting and flake triage
  - Add retry/trace policy per suite.
  - Document triage playbook for flaky tests.

### Execution plan to close I1-I5 (5 mini-steps, 1 commit each)

1. I1 - Deterministic backend seed pack
   - Goal:
     - Seed not only users, but also accepted friendships, at least one conversation pair, and one reusable online game fixture.
   - Deliverables:
     - Extend backend E2E seed service to create relationship fixtures and game fixture ids used by tests.
     - Add a single command entrypoint to seed all E2E fixtures in one shot.
   - Definition of done:
     - Running seed command twice is idempotent (same functional state).
     - Critical invite/game tests can run without inline data fabrication for baseline entities.
   - Proposed commit message:
     - chore(e2e-backend): add deterministic friendships conversations and game fixtures seeding

2. I2 - Multi-user orchestration helpers
   - Goal:
     - Standardize two-user and three-user test orchestration to remove duplicated setup logic.
   - Deliverables:
     - Add helper utilities for opening role contexts/pages and synchronizing actions between USER_A and USER_B.
     - Add helper patterns for invite flow and game interaction flow.
   - Definition of done:
     - At least 2 existing tests migrated to orchestration helpers.
     - No test logic regression and readability improves.
   - Proposed commit message:
     - chore(e2e): add multi-user orchestration helpers for synchronized role flows

3. I3 - API and websocket control layer hardening
   - Goal:
     - Centralize deterministic wait and event trigger primitives and remove ad hoc timing behavior.
   - Deliverables:
     - Expand helper layer with reusable waitForVisibleState style utilities.
     - Ensure websocket mocks expose explicit trigger methods for key transitions.
     - Explicitly ban fixed sleeps in tests.
   - Definition of done:
     - Search check confirms no fixed sleeps in E2E specs.
     - New helper API is used by both critical and extended suites.
   - Proposed commit message:
     - refactor(e2e): harden api websocket control layer and remove fixed timing waits

4. I4 - CI run profiles by risk level
   - Goal:
     - Automate suite selection by lifecycle: smoke on PR, critical on gated events, extended nightly.
   - Deliverables:
     - Add CI workflows or jobs with suite-specific commands.
     - Document triggering rules and required env vars/secrets.
   - Definition of done:
     - CI includes smoke required gate.
     - Critical and extended jobs are runnable with clear conditions.
   - Proposed commit message:
     - ci(e2e): add suite-based smoke critical extended workflows

5. I5 - Reporting and flake triage playbook
   - Goal:
     - Make failures diagnosable and reduce recurring flakes with a shared process.
   - Deliverables:
     - Add E2E triage doc (symptom, probable cause, first checks, rerun protocol, ownership).
     - Define retry and trace policy per suite and align Playwright config/documentation.
   - Definition of done:
     - Team can follow one documented checklist to classify flaky vs real regression.
     - CI artifacts needed for triage are explicitly referenced in docs.
   - Proposed commit message:
     - docs(e2e): add flake triage playbook and suite-level retry trace policy

## 7) First implementation pack requested by report section 9

- [x] P1 - matchmaking redirect success (A3)
- [x] P2 - matchmaking cancel (B4)
- [x] P3 - friend invite accept -> game (B8)
- [x] P4 - profile edit persistence (A6)
- [x] P5 - avatar upload success/failure boundary (B9)

## 8) Suggested commit plan (one small step at a time)

1. chore(e2e): add selector contract and stable test ids for critical flows
2. test(e2e-smoke): add home public and protected redirect smoke specs
3. test(e2e-critical): add deterministic matchmaking redirect spec
4. test(e2e-critical): add matchmaking cancel spec
5. test(e2e-critical): add invite accept to game navigation spec
6. test(e2e-critical): add profile edit persistence spec
7. test(e2e-critical): add avatar upload success and failure boundary specs
8. chore(e2e): add multi-user helpers and fixture seeding extensions
9. ci(e2e): wire suite-based smoke critical extended pipelines

## 9) Runbook commands

- Discover specs:
  - make test-e2e-list
- Run one suite:
  - make test-e2e-suite SUITE=smoke
  - make test-e2e-suite SUITE=critical
  - make test-e2e-suite SUITE=extended
- Run one file:
  - make test-e2e-file FILE=tests/e2e/critical/matchmaking-redirect.spec.js
- Run filtered tests:
  - make test-e2e-grep GREP="matchmaking"
