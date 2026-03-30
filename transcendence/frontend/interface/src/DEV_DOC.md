# Frontend Dev Doc

## Purpose
This document explains how to work with the frontend architecture in this project.
Goal: keep code scalable, readable, and safe to refactor.

## High-level architecture
The frontend uses a feature-based structure.
Instead of grouping by technical type only, code is grouped by business domain.

Main domains:
- auth
- chess
- stats
- profile
- home
- theme
- audio

Core entry points:
- `main.jsx`: app bootstrap, providers
- `App.jsx`: routes and app-level composition

## Folder structure

```txt
src/
  api/                # API clients
  components/
    common/           # Reusable UI primitives
    shared/           # App-level shared components (layout, route guards, sidebar)
  config/             # Runtime config and preferences
  constants/          # Global constants
  features/
    <feature>/
      components/     # Feature UI components
      hooks/          # Feature custom hooks
      pages/          # Route-level pages for this feature
      services/       # Business logic and pure helpers
      styles/         # Feature styles
      assets/         # Feature static data/assets
      types/          # Domain constants/types (JS-based)
      index.js        # Feature public API (barrel)
  store/
    context/          # Global contexts (cross-feature state)
  utils/              # Generic helpers shared by many features
  features/index.js   # Global feature-level barrel
```

## Layer responsibilities

### pages
- Route-level orchestration only.
- Compose components, call hooks/services.
- Keep heavy logic out when possible.

### components
- UI composition and interaction.
- Can own local UI state.
- Complex components should be split into smaller components.

### hooks
- Reusable stateful logic.
- Encapsulate effects and domain interactions.

### services
- Pure business logic and data transformation.
- No JSX rendering.
- Prefer deterministic functions for easier tests.

### store/context
- Global state used by multiple features.
- Example: authentication context provider.

## Import rules

### Preferred imports
Use feature public APIs (`index.js`) when available.

```js
import { GamePage, StatisticsPage } from './features/index.js'
import { useAuth } from './features/auth/index.js'
```

For feature-internal code, relative imports inside the same feature are fine.

```js
import { buildGamePanelState } from '../services/statsCalculator.js'
```

### Avoid
- Deep imports into unrelated feature internals.
- Legacy bridge paths.
- Duplicating the same logic in multiple layers.

## Why `index.js` (barrel files)
Barrel files define a clear public API for each feature.

Benefits:
- Single import surface.
- Easier refactors (internal file moves do not impact all callers).
- Better encapsulation (export only what should be used externally).
- Cleaner route-level and app-level imports.

## Coding methodology used in this project
Refactors are done incrementally and safely:

1. Move/reshape structure first.
2. Recable imports without changing behavior.
3. Extract large components into smaller units.
4. Move pure logic to services.
5. Validate errors after each step.
6. Commit small atomic changes.

This minimizes regressions and keeps review simple.

## Practical workflow when adding new code

1. Pick the target feature.
2. Add pure logic in `services/` if needed.
3. Add/update UI in `components/`.
4. Keep route integration in `pages/`.
5. Export public symbols in the feature `index.js`.
6. Consume from barrels where relevant.

## Cross-feature dependency guidance

- Prefer feature API imports (`features/<name>/index.js`) over deep paths.
- Shared global concerns go to `store/`, `components/shared/`, `config/`, or `utils/`.
- If two features need the same logic, move it to an appropriate shared layer.

## Anti-patterns to avoid

- Monolithic components with mixed rendering + business logic + side effects.
- Importing private files from another feature.
- Reintroducing compatibility/legacy bridges when not required.
- Keeping dead files after migrations.

## Quick checklist before committing

- Imports follow architecture rules.
- No new legacy paths introduced.
- Extracted logic sits in the correct layer.
- Modified files have no IDE errors.
- Change is atomic and message is explicit.
