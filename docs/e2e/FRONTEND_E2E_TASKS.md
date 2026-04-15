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

- [ ] B1 - Critical: invalid login shows error (#6)
  - File: tests/e2e/critical/auth-login-error.spec.js

- [ ] B2 - Critical: 2FA branch completion (#7)
  - File: tests/e2e/critical/auth-2fa.spec.js
  - Note: gated by backend 2FA fixture support.

- [ ] B3 - Critical: logout clears session (#8)
  - File: tests/e2e/critical/auth-logout.spec.js

- [ ] B4 - Critical: cancel matchmaking (#11)
  - File: tests/e2e/critical/matchmaking-cancel.spec.js

- [ ] B5 - Critical: resign reaches terminal state (#13)
  - File: tests/e2e/critical/game-resign-terminal.spec.js

- [ ] B6 - Critical: draw offer accept path (#14)
  - File: tests/e2e/critical/game-draw-accept.spec.js

- [ ] B7 - Critical: invite creation in chat thread (#17)
  - File: tests/e2e/critical/chat-invite-create.spec.js

- [ ] B8 - Critical: invite accept navigates to game (#18)
  - File: tests/e2e/critical/chat-invite-accept.spec.js

- [ ] B9 - Critical: avatar upload success/failure boundary (#20)
  - File: tests/e2e/critical/profile-avatar-upload.spec.js

## 5) Wave C (extended resilience)

Priority from report: 21-30

- [ ] C1 - Notification invite update on non-chat page (#21)
- [ ] C2 - Presence ping after visibility change (#22)
- [ ] C3 - activeGameId session restore redirect (#23)
- [ ] C4 - reduce motion persistence after reload (#24)
- [ ] C5 - statistics chart toggles no UI error (#25)
- [ ] C6 - typing indicator appears and clears (#26)
- [ ] C7 - invite cancel status sync for sender (#27)
- [ ] C8 - profile update transient API failure recovery (#28)
- [ ] C9 - game websocket disconnect recoverable UI state (#29)
- [ ] C10 - OAuth route behavior if enabled (#30)

Target folder for all C tasks:
- tests/e2e/extended/

## 6) Cross-cutting infra tasks (must be scheduled)

- [ ] I1 - Seed strategy for deterministic data
  - Extend backend seed command to guarantee users, friendships, conversations, and match fixtures for E2E.

- [ ] I2 - Multi-user orchestration helpers
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

## 7) First implementation pack requested by report section 9

- [x] P1 - matchmaking redirect success (A3)
- [ ] P2 - matchmaking cancel (B4)
- [ ] P3 - friend invite accept -> game (B8)
- [x] P4 - profile edit persistence (A6)
- [ ] P5 - avatar upload success/failure boundary (B9)

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
