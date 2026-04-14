# Frontend E2E - First Report

Date: 2026-04-14
Scope: transcendence/frontend/interface
Goal: define what must be tested first, and why each scenario belongs to smoke, critical, or extended.

## 1) How to think about E2E test creation

E2E tests should follow product risk, not component count.

Use this order:
1. User can enter and navigate core app (smoke)
2. User can complete revenue or core gameplay loops (critical)
3. User can handle edge cases and long workflows (extended)

Simple decision rule for each feature:
- If broken, does the app become unusable now? -> critical
- If broken, does release confidence drop but app still runs? -> extended
- If broken, can we no longer trust deployment health? -> smoke

## 2) Frontend map (from current code)

Main routing and guards are in:
- src/App.jsx
- src/components/shared/ProtectedRoute/ProtectedRoute.jsx

Observed user routes:
- / (home)
- /auth
- /auth/reset-password
- /dashboard (protected)
- /game/:gameId (protected)
- /profile (protected)
- /settings (protected)
- /statistics (protected)
- /contact
- /about

Major frontend domains:
- Auth and session (AuthContext, login, register, 2FA, logout)
- Matchmaking and game launch (Dashboard + chess websocket)
- Live game board and game controls (Game page + chess engine/socket)
- Chat and invites (drawer, conversations, invite cards, chat websocket)
- Profile management (editable fields, avatar upload, friends)
- Settings and local prefs (audio + reduce motion)
- Statistics and charts
- Presence and notifications (websocket notifications + periodic presence ping)

## 3) Integration surfaces to cover in E2E

REST (examples seen in code):
- /api/auth/*
- /api/chat/*

WebSocket channels:
- /ws/chess/:gameId/
- /ws/chat/:conversationId/
- /ws/notifications/:userId/

Browser storage used by product behavior:
- sessionStorage: activeGameId
- localStorage: ui/audio prefs and auth-related UX flags

Why this matters:
- A lot of UX depends on eventual consistency between REST, websocket pushes, and local/session storage.
- These are prime sources of real user regressions that unit tests miss.

## 4) Grouping strategy for this frontend

### Smoke (run on each PR)
Purpose: deployment health and minimal confidence.

Include:
- Public home loads
- Auth page loads
- User can access dashboard with existing session
- Basic protected-route redirect sanity

Do not include long websocket waits or multi-user orchestration in smoke.

### Critical (run on PR for risky changes, always before release)
Purpose: core product loops with direct user impact.

Include:
- Login flow (including 2FA branch if enabled)
- Matchmaking join -> match_found -> redirect game
- Live game basic move exchange and end-state actions (resign/draw path sanity)
- Friend invite flow: send, accept/decline, join game
- Profile update and avatar upload

Critical tests should be deterministic and focused.

### Extended (nightly or scheduled)
Purpose: non-blocking depth, resilience, and edge behavior.

Include:
- Reconnect/resume edge cases
- Presence and unread counters timing behavior
- Error states and retries for degraded API/socket conditions
- Statistics chart toggles and long navigation paths
- Preferences persistence across reloads and session transitions

## 5) First recommended E2E inventory (phase 1)

Smoke candidates:
1. Home renders and main CTA visible
2. Auth page renders login controls
3. Authenticated user opens dashboard directly
4. Protected route redirects guest to auth

Critical candidates:
5. Login success redirects to app shell
6. Invalid login shows error message
7. 2FA required branch verifies code and completes login
8. Logout clears authenticated UI and returns to auth
9. Dashboard start matchmaking opens search modal
10. Match found event redirects to /game/:id
11. Cancel matchmaking closes modal and leaves queue
12. Game page loads board and player bars
13. Resign action reaches terminal game state
14. Draw offer -> accept path updates game state
15. Chat drawer opens, conversation list loads
16. Send message appears in thread
17. Send friend invite from thread creates invite card
18. Accept invite navigates to /game/:id
19. Profile inline edit (username or bio) persists after refresh
20. Avatar upload success updates avatar image

Extended candidates:
21. Notification channel receives invite update while on non-chat page
22. Presence ping keeps online indicator fresh after visibility change
23. Session restore via activeGameId redirects back to active game
24. Settings reduce motion persists after reload
25. Stats page chart mode toggles work without UI errors
26. Chat typing indicator appears and auto-clears
27. Invite cancel flow updates card status for sender
28. API transient failure on profile update shows recoverable error
29. Websocket disconnect during game shows recoverable state
30. OAuth entry route behavior (if enabled in environment)

## 6) Priority order to implement now

Implementation wave A (immediate ROI):
- 1, 4, 5, 9, 10, 12, 15, 16, 19

Implementation wave B (core completeness):
- 6, 7, 8, 11, 13, 14, 17, 18, 20

Implementation wave C (resilience and regressions):
- 21-30

## 7) Practical test design rules for this project

- Prefer role-based storageState for auth-dependent specs.
- For websocket flows, assert user-visible states (modal, redirect, badge) instead of internal events.
- Keep multi-user scenarios explicit (USER_A, USER_B) and synchronized with deterministic test data.
- Avoid broad visual assertions; assert behavior and business outcomes.
- Keep each critical spec single-purpose and fast.

## 8) Mapping to existing architecture

Current suite folders already support this model:
- tests/e2e/smoke
- tests/e2e/critical
- tests/e2e/extended

Current infra already supports targeted runs:
- make test-e2e-suite SUITE=smoke
- make test-e2e-suite SUITE=critical
- make test-e2e-suite SUITE=extended
- make test-e2e-file FILE=...
- make test-e2e-grep GREP=...

## 9) Next concrete step

Create and implement the first 5 critical business scenarios in this order:
1) matchmaking redirect success
2) matchmaking cancel
3) friend invite accept -> game
4) profile edit persistence
5) avatar upload success/failure boundary
