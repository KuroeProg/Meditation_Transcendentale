# React Frontend Refactoring: Feature-Based Architecture Plan

**Status:** Analysis & Planning Phase (No changes applied yet)  
**Date:** 2026-03-30  
**Project:** Meditation Transcendentale - Chess Game Frontend

---

## 1. CURRENT STATE ANALYSIS

### 1.1 Existing Structure (Flat/Hybrid)
```
src/
├── api/                    # Minimal API layer
├── audio/                  # Audio utilities (3 files)
├── chess/                  # Chess-specific code (5 files)
├── Coalition_symbol/       # Coalition UI (4 SVG components)
├── components/             # Mixed purposes (20 files, 3KB+ total)
├── config/                 # Config files
├── constants/              # Constants
├── context/                # React Context (AuthContext only)
├── dev/                    # Dev/mock data
├── game/                   # Game logic (partially structured)
│   ├── core/               # Reducer, types, selectors
│   └── hooks/              # useChessEngine, useChessReplay, useChessAudio
├── hooks/                  # Global hooks (mixed concerns)
├── objects/                # Board & Chrono (large files)
├── pages/                  # 7 page components
├── theme/                  # Theme utilities
├── utils/                  # Utility functions
└── App.jsx
```

### 1.2 Identified Functional Domains

#### Domain 1: **Authentication & User Management**
- **Files:** `context/AuthContext.jsx`, `components/TwoFactorVerify.jsx`, `pages/Auth.jsx`, `hooks/useAuth.js`
- **Purpose:** Handle user login, 2FA, protected routes, session
- **Smart Components:** Auth page, TwoFactorVerify, AuthContext
- **Dumb Components:** None (all auth-related are logic-driven)
- **Dependencies:** useChessSocket (for socket during game)
- **Type:** Core Feature

#### Domain 2: **Chess Engine & Gameplay**
- **Files:** `objects/Board.jsx` (757 lines), `objects/Chrono.jsx`, `game/core/*`, `game/hooks/useChessEngine.js`, `chess/*`, `pages/Game.jsx`
- **Purpose:** Game logic, board rendering, move execution, timers, animation
- **Smart Components:** Board.jsx, Chrono.jsx, Game.jsx (page), useChessEngine
- **Dumb Components:** ChessPiecePng.jsx
- **Dependencies:** Chess.js library, audio system
- **Type:** Core Feature (largest, most complex)

#### Domain 3: **Audio System**
- **Files:** `audio/*.js`, `components/GamePageAudio.jsx`, `components/HomePageAudio.jsx`, `game/hooks/useChessAudio.js`, `components/GameAudioPrefsForm.jsx`
- **Purpose:** Background music, SFX, audio preferences
- **Smart Components:** GamePageAudio, HomePageAudio, useChessAudio
- **Dumb Components:** None
- **Dependencies:** Canvas for waveform visualization
- **Type:** Feature (cross-cutting)

#### Domain 4: **Theming & Visual Branding**
- **Files:** `theme/coalitionAmbience.js`, `components/CoalitionAmbient.jsx`, `components/CoalitionParticleCanvas.jsx`, `components/CoalitionHtmlSync.jsx`, `Coalition_symbol/*.jsx`, `utils/coalitionTheme.js`, `utils/coalitionPstatsTheme.js`
- **Purpose:** Coalition-based theming, particle effects, HTML sync
- **Smart Components:** CoalitionAmbient, CoalitionParticleCanvas, CoalitionHtmlSync, ThemeSync
- **Dumb Components:** Coalition_* symbol components
- **Dependencies:** Three.js (particles), CSS custom properties
- **Type:** Feature (visual/branding)

#### Domain 5: **Statistics & Game History**
- **Files:** `pages/Statistics.jsx`, `components/GameStatsPanel.jsx`, `utils/coalitionPstatsTheme.js`, `dev/mockPersonalStats.json`
- **Purpose:** Game analytics, win/loss charts, material balance, time analysis
- **Smart Components:** Statistics page, GameStatsPanel
- **Dumb Components:** Sub-chart components (WinrateDonut, MiniDonut, etc.)
- **Dependencies:** Recharts (charting library)
- **Type:** Feature

#### Domain 6: **User Profile & Dashboard**
- **Files:** `pages/Profile.jsx`, `pages/Dashboard.jsx`, `pages/Settings.jsx`, `components/ProfileCoalitionIcon.jsx`
- **Purpose:** User profile display, game settings, preferences
- **Smart Components:** Profile, Dashboard, Settings pages
- **Dumb Components:** ProfileCoalitionIcon
- **Dependencies:** Auth context, coalitionTheme
- **Type:** Feature

#### Domain 7: **Shared/Common UI Components**
- **Files:** `components/MenuHome.jsx`, `components/SiteBrandLogo.jsx`, `components/Logo42.jsx`, `components/sidebar.jsx`, `components/ProtectedRoute.jsx`
- **Purpose:** Reusable UI building blocks
- **Smart Components:** ProtectedRoute (router wrapper), sidebar (might use auth)
- **Dumb Components:** MenuHome, SiteBrandLogo, Logo42
- **Dependencies:** Router hooks
- **Type:** Shared infrastructure

#### Domain 8: **Global State & Config**
- **Files:** `config/*.js`, `hooks/useGameAudioPrefs.js`, `hooks/useReduceMotionPref.js`, `context/AuthContext.jsx`, `dev/` (mocks)
- **Purpose:** Global preferences, environment config, local storage
- **Type:** Infrastructure

---

## 2. COMPONENT CLASSIFICATION

### Smart Components (Logic-Driven)
These hook into state management, API calls, or complex logic:
- **Game.jsx** (284 lines) - Orchestrates chess engine, sockets, audio
- **Statistics.jsx** (422 lines) - Data fetching, chart rendering
- **GameStatsPanel.jsx** (804 lines) - Complex data processing
- **CoalitionParticleCanvas.jsx** (762 lines) - Three.js particle rendering
- **Auth.jsx** (321 lines) - Auth flow, form handling
- **Board.jsx** (757 lines) - Game state, animation, move handling
- **Chrono.jsx** (95 lines) - Timer logic with custom hooks
- **CoalitionAmbient.jsx** (150 lines) - Theme + animation orchestration

### Dumb Components (Presentational)
These receive props and render UI:
- **MenuHome.jsx** - Pure UI
- **SiteBrandLogo.jsx** - Pure UI
- **Logo42.jsx** - Pure UI
- **ProfileCoalitionIcon.jsx** - Pure UI
- **Coalition_symbol/*.jsx** - SVG wrappers
- **ChessPiecePng.jsx** - Image wrapper

### Partially Smart (Router/Context Consumers)
- **ProtectedRoute.jsx** - Wraps authentication logic
- **Settings.jsx** - Preference management
- **Profile.jsx** - User data display
- **Dashboard.jsx** - Home after login

---

## 3. PROPOSED FEATURE-BASED ARCHITECTURE

```
src/
├── api/
│   ├── authClient.js           # Auth API calls
│   └── chessonlineClient.js     # (NEW) Online chess API
│
├── components/
│   ├── common/                  # Atomic, reusable components
│   │   ├── Buttons/
│   │   │   └── Button.jsx
│   │   ├── Modals/
│   │   │   └── Modal.jsx
│   │   ├── Forms/
│   │   │   └── FormInput.jsx
│   │   ├── Cards/
│   │   │   └── Card.jsx
│   │   └── Logo/
│   │       ├── SiteBrandLogo.jsx
│   │       └── Logo42.jsx
│   │
│   └── shared/                 # Feature-agnostic, page-level
│       ├── Sidebar/
│       │   └── sidebar.jsx
│       ├── ProtectedRoute/
│       │   └── ProtectedRoute.jsx
│       ├── DevToolbar/
│       │   └── DevAuthToolbar.jsx
│       └── PageLayout/         # (NEW) Layout wrappers
│           ├── MainLayout.jsx
│           └── AuthLayout.jsx
│
├── config/
│   ├── authEndpoints.js
│   ├── gameAudioPrefs.js
│   └── uiPrefs.js
│
├── constants/
│   └── brandAssets.js
│
├── features/
│   │
│   ├── auth/
│   │   ├── components/
│   │   │   ├── TwoFactorVerify.jsx
│   │   │   ├── AuthForm.jsx           # (NEW) Extracted
│   │   │   └── LoginPrompt.jsx        # (NEW) Extracted
│   │   ├── hooks/
│   │   │   └── useAuth.js             # (move from global)
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── services/
│   │   │   └── authService.js         # (NEW) Auth business logic
│   │   ├── pages/
│   │   │   └── Auth.jsx
│   │   └── types/
│   │       └── auth.types.js          # (NEW) TypeScript-like defs
│   │
│   ├── chess/
│   │   ├── components/
│   │   │   ├── Board.jsx
│   │   │   ├── Chrono.jsx
│   │   │   ├── ChessPiecePng.jsx
│   │   │   ├── MoveGhost.jsx          # (NEW) Extracted from Board
│   │   │   ├── PromotionPicker.jsx    # (NEW) Extracted from Board
│   │   │   └── CellRenderer.jsx       # (NEW) Extracted from Board
│   │   ├── hooks/
│   │   │   ├── useChessEngine.js      # (move from game/hooks)
│   │   │   ├── useChessSocket.js      # (move from global hooks)
│   │   │   └── useChessReplay.js      # (move from game/hooks)
│   │   ├── core/
│   │   │   ├── chessReducer.js
│   │   │   ├── chessSelectors.js
│   │   │   ├── chessTypes.js
│   │   │   └── chessConstants.js      # (NEW) Chess game constants
│   │   ├── assets/                    # Chess-specific assets
│   │   │   ├── boardTiles.js
│   │   │   ├── boardTilesManifest.json
│   │   │   ├── chessAssetPreload.js
│   │   │   └── chessColorVariant.js
│   │   ├── pages/
│   │   │   └── Game.jsx               # (move from /pages)
│   │   ├── services/
│   │   │   └── chessAiService.js      # (NEW) Future AI integration
│   │   └── types/
│   │       └── chess.types.js         # (NEW) Chess type defs
│   │
│   ├── audio/
│   │   ├── components/
│   │   │   ├── GameAudio.jsx          # (rename GamePageAudio)
│   │   │   ├── HomeAudio.jsx          # (rename HomePageAudio)
│   │   │   └── AudioPrefsForm.jsx     # (rename GameAudioPrefsForm)
│   │   ├── hooks/
│   │   │   ├── useChessAudio.js       # (move from game/hooks)
│   │   │   └── useGameAudioPrefs.js   # (move from global hooks)
│   │   ├── services/
│   │   │   ├── gameBgm.js
│   │   │   ├── gameSfx.js
│   │   │   └── homeBgm.js
│   │   └── types/
│   │       └── audio.types.js         # (NEW)
│   │
│   ├── theme/
│   │   ├── components/
│   │   │   ├── CoalitionAmbient.jsx
│   │   │   ├── CoalitionParticleCanvas.jsx
│   │   │   ├── CoalitionHtmlSync.jsx
│   │   │   ├── ThemeSync.jsx          # (move from components)
│   │   │   └── CoalitionSymbols/      # Reorganized
│   │   │       ├── Coalition_Fire.jsx
│   │   │       ├── Coalition_Earth.jsx
│   │   │       ├── Coalition_Water.jsx
│   │   │       └── Coalition_Wind.jsx
│   │   ├── hooks/
│   │   │   └── useReduceMotionPref.js # (move from global hooks)
│   │   ├── services/
│   │   │   ├── coalitionTheme.js
│   │   │   └── coalitionAmbience.js
│   │   ├── styles/
│   │   │   └── coalitionThemes.css    # (NEW) Centralized
│   │   └── types/
│   │       └── theme.types.js         # (NEW)
│   │
│   ├── stats/
│   │   ├── components/
│   │   │   ├── GameStatsPanel.jsx
│   │   │   ├── charts/                # (NEW) Sub-components
│   │   │   │   ├── WinrateDonut.jsx
│   │   │   │   ├── MaterialBalance.jsx
│   │   │   │   └── TimeAnalysis.jsx
│   │   │   └── StatsDetailView.jsx    # (NEW) Extracted
│   │   ├── pages/
│   │   │   └── Statistics.jsx
│   │   ├── services/
│   │   │   ├── statsCalculator.js     # (NEW) Business logic
│   │   │   └── chartThemes.js         # (NEW) Recharts theming
│   │   ├── assets/
│   │   │   └── mockPersonalStats.json # (move from dev)
│   │   └── types/
│   │       └── stats.types.js         # (NEW)
│   │
│   ├── profile/
│   │   ├── components/
│   │   │   ├── ProfileCard.jsx        # (NEW) Extracted from Profile page
│   │   │   ├── ProfileCoalitionIcon.jsx
│   │   │   ├── ProfileStats.jsx       # (NEW) Extracted
│   │   │   └── ProfileSettings.jsx    # (NEW) Extracted
│   │   ├── pages/
│   │   │   ├── Profile.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   └── Settings.jsx
│   │   ├── services/
│   │   │   └── profileService.js      # (NEW) API calls
│   │   └── types/
│   │       └── profile.types.js       # (NEW)
│   │
│   └── home/
│       ├── components/
│       │   ├── Menu/
│       │   │   └── MenuHome.jsx
│       │   └── Hero/
│       │       └── HeroSection.jsx    # (NEW) Extracted visuals
│       ├── pages/
│       │   └── Home.jsx
│       ├── services/
│       │   └── homeContentService.js  # (NEW) Static content
│       └── types/
│           └── home.types.js          # (NEW)
│
├── hooks/
│   └── README.md                      # Deprecated (moved to features)
│
├── layouts/
│   ├── MainLayout.jsx                 # (Extract from App)
│   ├── AuthLayout.jsx                 # (Extract from App)
│   ├── GameLayout.jsx                 # (NEW) Game-specific layout
│   └── README.md                      # Layout documentation
│
├── pages/
│   └── README.md                      # Deprecated (moved to features)
│
├── store/                             # (NEW) Global state
│   ├── context/
│   │   ├── AppContext.jsx             # (NEW) App-level context
│   │   └── AuthContext.jsx            # (move from features/auth/context)
│   └── README.md
│
├── utils/
│   ├── componentUtils.js              # (NEW) Component helpers
│   ├── formatters.js                  # (NEW) Date, number formatting
│   ├── validators.js                  # (NEW) Form validation
│   ├── sessionUser.js
│   ├── coalitionTheme.js              # (move to features/theme/services)
│   ├── coalitionPstatsTheme.js        # (move to features/stats/services)
│   └── README.md
│
├── mock/
│   ├── mockSessionUser.js             # (move from dev)
│   ├── mockPersonalStats.json         # (move to features/stats/assets)
│   └── mockGameOpponent.js            # (move to features/chess/mock)
│
├── App.jsx                            # Simplified: only routes
├── main.jsx
└── index.css                          # Global styles only
```

---

## 4. DETAILED DECISION LOG

### 4.1 Why Reorganize into Features?

**Current Problem:**
- Components folder is a dumping ground (20 files, mixed concerns)
- Chess logic lives in 4 different locations (objects/, chess/, game/, pages/)
- Audio, theme, stats scattered across multiple folders
- Difficult to onboard new developers
- Impossible to extract features or reuse in other projects

**Solution Benefits:**
- **Co-location:** Feature code stays together (components + hooks + logic)
- **Clear Dependencies:** Each feature independently recognizable
- **Scalability:** Adding new features doesn't pollute root
- **Testing:** Easier to mock/test isolated features
- **Maintenance:** Clear ownership per domain

---

## 5. MIGRATION STRATEGY (Phased)

### Phase 1: Foundation (Week 1)
Create folder structure without breaking anything.

### Phase 2: Move Common Components (Week 1-2)
De-clutter the root `components/` folder.

### Phase 3: Move Auth Feature (Week 2)
First complete feature extraction.

### Phase 4: Move Chess Feature (Week 2-3)
Move the largest feature.

### Phase 5: Move Audio Feature (Week 3)
Feature dependency on chess/auth complete.

### Phase 6: Move Theme Feature (Week 3-4)
Consolidate theme-related code.

### Phase 7: Move Stats Feature (Week 4)
Extract complex component.

### Phase 8: Move Profile & Home Features (Week 4-5)
Remaining pages.

### Phase 9: Centralize Global State (Week 5)
Create `store/` and deprecate old patterns.

### Phase 10: Move Dev & Utilities (Week 5-6)
Clean up root.

### Phase 11: Update App.jsx & Entry Points (Week 6)
Simplify root orchestration.

### Phase 12: Testing & Documentation (Week 6-7)
Validate and document.

---

## 6. IMPORT CONVENTIONS (Post-Refactor)

### ✅ DO

```js
// Import from feature barrel exports
import { useAuth } from '@/hooks'
import { Board } from '@/features/chess/components'
import { GameStatsPanel } from '@/features/stats/components'

// Import layout
import { MainLayout } from '@/layouts'

// Import common components
import { Button, Modal } from '@/components/common'

// Import services (business logic)
import { statsCalculator } from '@/features/stats/services'
```

### ❌ DON'T

```js
// Don't import directly from deep folders
import Board from '@/features/chess/components/Board.jsx'

// Don't cross-import between features (except via hooks)
import { useChessEngine } from '@/features/chess/hooks'
  .then(/* use state from chess to drive audio */)
  // OK: one feature consumes hook from another

// import styles directly if possible
import '@/features/chess/components/Board.css'  // ❌
// DO: import CSS within component or via barrel
```

---

## 7. EXPECTED OUTCOMES

### Current State
- 67 files scattered across 18 folders
- Components folder has 20 unrelated files
- Chess logic in 4 places (objects/, chess/, game/, pages/)
- Hooks confused with pages
- Difficult to onboard new developers

### After Refactor
- ~10 well-organized features
- Clear ownership per domain
- Easy to extract features to separate package
- Faster developer onboarding
- Easier testing & mocking
- Better IDE autocomplete (co-located files)

### Metrics
- **Folder depth:** avg 4-5 levels (vs. current 2-3 scattered)
- **File colocation:** 95% of feature code in one folder
- **Circular deps:** 0 (enforced by linter)
- **Lines in largest file:** Board.jsx still 757 lines (but extracted components available)

---

## 8. NEXT STEPS

1. **REVIEW this plan** - Feedback on structure, naming, decisions
2. **APPROVE structure** - Once consensus, proceed with Phase 1
3. **IMPLEMENT Phase 1** - Create folders, write barrel exports
4. **VALIDATE** - Ensure all imports still work after creating structure  
5. **GRADUAL MIGRATION** - Phase 2-12 over 6-7 weeks

---

**Report Generated:** 2026-03-30  
**Status:** Ready for Review & Approval
