# Backend Refactor Plan

## Purpose
This document defines the backend refactor roadmap, phase by phase.
The goal is to improve maintainability, reliability, and clarity without breaking current behavior.

## Guiding principles
- Small, atomic changes.
- Keep behavior stable during each phase.
- Validate after every step.
- Prioritize readability and explicit ownership.
- Avoid large cross-cutting rewrites in one commit.

## Global sequence
1. Phase A: Cleanup and hardening baseline
2. Phase B: Architecture split (views and websocket)
3. Phase C: Quality, tests, and operational readiness

---

## Phase A - Cleanup and hardening baseline

### Objectives
- Remove backend leftovers and ambiguous files.
- Clean route/import conventions.
- Move sensitive settings to environment variables.
- Keep existing API and websocket behavior unchanged.

### Scope
- Remove dead or duplicate files if not used.
- Normalize URL patterns (slash strategy, import style).
- Strengthen settings defaults for security.
- Keep compatibility for current frontend flow.

### Concrete tasks
1. Identify and remove unused backend relic files.
   - Candidate examples: legacy consumer/model files in backend root.
2. Standardize imports in URL modules.
   - Prefer explicit app/module imports over root-level implicit imports.
3. Normalize endpoint declarations.
   - Use a single convention for trailing slashes.
4. Externalize sensitive settings.
   - SECRET_KEY from env.
   - DEBUG from env.
   - host/origin lists from env.
5. Add a short settings section in docs for required env vars.

### Deliverables
- Cleaner backend tree.
- Settings driven by environment.
- URL files easier to navigate and maintain.

### Definition of Done
- Server starts successfully with updated settings.
- Existing auth and websocket routes still work.
- No unresolved imports after cleanup.

---

## Phase B - Architecture split

### Objectives
- Break down monolithic files into focused modules.
- Separate business logic from transport layer.

### Scope
- Split auth views by concern.
- Split websocket consumer logic by domain.

### Concrete tasks
1. Split HTTP auth views into modules.
   - oauth views
   - session/login/logout/me views
   - 2fa views
2. Introduce service layer for auth helpers and shared logic.
3. Split websocket game logic.
   - matchmaking service
   - clock service
   - game state transitions
4. Keep consumer class thin.
   - routing and orchestration only.

### Deliverables
- Smaller files with clear ownership.
- Better separation of concerns.

### Definition of Done
- API contract preserved.
- Matchmaking and game flows unchanged for users.
- Reduced file complexity in main hot spots.

---

## Phase C - Quality, tests, and operations

### Objectives
- Improve confidence and long-term reliability.
- Prepare for smoother production operations.

### Scope
- Add targeted tests around critical paths.
- Improve observability and error handling.

### Concrete tasks
1. Add tests for auth and 2FA flows.
2. Add tests for websocket game and matchmaking invariants.
3. Add stronger validation and typed payload checks where practical.
4. Improve logging consistency for key events.
5. Add an operational runbook section (env vars, startup, diagnostics).

### Deliverables
- Baseline automated checks for critical backend behavior.
- Better visibility during incidents.

### Definition of Done
- Core auth and game workflows covered by tests.
- Failures provide actionable logs.
- Team has a clear runbook for local and container environments.

---

## Risk management
- Do not mix behavior changes with structural refactor in the same commit.
- Keep rollback simple via atomic commits.
- Validate websocket matchmaking after each backend step.
- Avoid simultaneous frontend/backed refactors on the same flow.

## Suggested commit strategy
- One commit per sub-step.
- Message format example: refactor(backend): <small explicit action>
- Always run smoke checks before next step.

## Suggested execution order now
1. Execute Phase A first.
2. Once stable, start Phase B with views split.
3. Finish with Phase C tests and operational improvements.
