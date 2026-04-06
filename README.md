# Transcendence (ft_transcendence)

Web application for an online chess experience with coalitions, OAuth, real-time play (in progress), monitoring, and security hardening. This repository implements the **42 ft_transcendence** subject: a full-stack project with a **Dockerized** infrastructure, **HTTPS**, and modular features aligned with the official grading grid.

---

## Table of contents

1. [Overview](#overview)
2. [Team & responsibilities](#team--responsibilities)
3. [Architecture](#architecture)
4. [Prerequisites](#prerequisites)
5. [Installation & deployment](#installation--deployment)
6. [Frontend (local development)](#frontend-local-development)
7. [Usage & access](#usage--access)
8. [Features (honest scope)](#features-honest-scope)
9. [Known limitations](#known-limitations)
10. [Grading & modules](#grading--modules)
11. [Contributions & workflow](#contributions--workflow)
12. [Challenges](#challenges)
13. [License & credits](#license--credits)

---

## Overview

- **Goal**: Deliver a playable chess experience in the browser with user accounts, coalition-themed UI, statistics, and operational tooling (logging, metrics).
- **Constraints**: Subject **Part III** must be satisfied (HTTPS, DB, Git, Docker one-command startup, README in English, Privacy/Terms, form validation, etc.). Module points are tracked in `**Todo.md`** (French, internal).

---

## Team & responsibilities


| Member     | Focus                                                                                                           |
| ---------- | --------------------------------------------------------------------------------------------------------------- |
| **Cloe**   | Project management, cybersecurity (WAF/ModSecurity, Vault), Nginx HTTPS, monitoring (Prometheus/Grafana), Scrum |
| **Theo**   | Tech lead, backend core API, database, ELK logging                                                              |
| **Alexis** | Product owner, UI/UX, chess game logic (frontend)                                                               |


*Adjust names/logins in commits and evaluation materials to match your official group roster.*

---

## Architecture

- **Reverse proxy**: Nginx as the single HTTPS entry point for the application and tooling UIs.
- **TLS**: HTTPS with project-provided or generated certificates (see `transcendence/nginx/`).
- **Stack (high level)**: React (Vite) frontend, Django backend, PostgreSQL, Redis, background workers; ELK and Prometheus/Grafana for observability (see `transcendence/docker-compose.yml` and `Makefile` targets).
- **Secrets**: Never commit real secrets. Use `.env` (from `.env.example` where provided) and Vault where applicable.

---

## Prerequisites

- **Docker** and **Docker Compose**
- **GNU Make**
- **Node.js** (LTS recommended) if you run the **frontend** outside Docker for development

---

## Installation & deployment

1. Copy and configure environment variables from the project’s `**.env.example`** (or team template) to `**.env**` at the paths documented for this repo.
2. From the repository root, build and start the stack:
  ```bash
   make up
  ```
3. Consult `**make help**` for logs, teardown, and other targets.

Database volumes and runtime logs paths are listed in `**.gitignore**` to avoid committing local data.

---

## Frontend (local development)

The SPA lives under `**transcendence/frontend/interface/**`.

```bash
cd transcendence/frontend/interface
npm ci
npm run dev
```

- `**npm run build**` — production bundle (runs tile manifest generation via `prebuild`).
- `**npm run lint**` — ESLint.
- `**scripts/generate-board-tiles-manifest.mjs**` — regenerates chess tile manifests from `public/` assets (invoked automatically before dev/build).

See `**transcendence/frontend/interface/README.md**` for npm script details (tile manifest generation, etc.).

---

## Usage & access

Typical entry points (exact URLs depend on your Nginx routing and `.env`):


| Service     | Example URL (see your deployment)                            |
| ----------- | ------------------------------------------------------------ |
| Application | `https://localhost/`                                         |
| Grafana     | `https://localhost/grafana/`                                 |
| Kibana      | `https://localhost/kibana/`                                  |
| Prometheus  | `https://localhost/prometheus/` (may require auth via Nginx) |


---

## Features (honest scope)

What is **implemented or demonstrable** evolves with each sprint. As of the latest iteration:

- **Chess UI**: Board, move rules via `chess.js`, timers (white clock does not tick until the first move is played; UI sync), end-of-game panel, coalition-themed pieces and board tiles.
- **Audio**: Shared volume/mute in **Settings** (`gameAudioPrefs`). **Home** BGM (`public/sounds/home/Beth's Story.m4a`) plays across the app **except** on `/game/*`. **In-game** BGM (`public/sounds/game/Theme_of_game.wav`) loops and starts **with the clock** (after the first move). SFX remain procedural or file-based per `public/sounds/game/README.md`.
- **Auth**: OAuth 42 integration path; **development mock user** optional via env for UI work without a live backend.
- **Profile & settings**: Profile view, settings for audio and **reduced motion** (accessibility); coalition-themed ambient background and particles respect this preference where applicable.
- **Statistics**: Personal statistics page with charts (**Recharts**), coalition theming; data may be **mock JSON** until the backend exposes real game history.
- **Infrastructure**: Monitoring and logging stacks as defined in compose files (finalize dashboards and alerting per subject).

Treat `**Todo.md`** as the source of truth for **which modules** you claim at evaluation.

---

## Known limitations

- **README** and **Privacy Policy / Terms of Service** must stay accurate; link them from the app when required by Part III.
- **Remote multiplayer**, **WebSocket** resilience, and **full stats persistence** may still be **in progress**—verify before claiming points.
- **Browser support**: Chrome is the baseline; extended browser support is a separate minor module if claimed.
- **i18n** (3+ languages) is optional/bonus unless you implement it.
- Some UI toggles were removed when they had **no backend or product behavior** (e.g. placeholder 2FA, notifications)—restore them when the feature is real.

---

## Grading & modules

- Official rules: **ft_transcendence** PDF (modules in chapter IV, bonuses in chapter VII).
- Internal tracking: `**Todo.md`** — module list, owners, status (**Fait** / **Quasi** / **En cours** / **À faire**), and bonus suffix `**, bonus`** for modules beyond the 14-point core.

---

## Contributions & workflow

- Use **clear commit messages** and **shared branches** as required by the subject.
- Prefer small, reviewable changes; document notable decisions in `**Todo.md`** history and this README when behavior or deployment changes.

---

## Challenges

- Aligning **frontend mock flows** with **backend APIs** and WebSocket semantics for remote games.
- Meeting **Part III** bar (HTTPS, DB schema documentation, email/password auth alongside OAuth, etc.) while iterating on gameplay and DevOps.
- Keeping the **README** and `**Todo.md`** honest so evaluators see what is demo-ready versus planned.

---

## License & credits

- Academic / **42 Network** project context; reuse and publication are subject to **42** rules and your campus policies—not a standalone open-source license unless you add one explicitly.
- **Third-party**: React, Vite, chess.js, Recharts, Remix Icon, Framer Motion, and other dependencies are listed in `package.json` and their respective licenses.
- **Assets**: Coalition visuals, audio, and chess sprites are team or subject-sourced; attribute external work in commits or a `CREDITS` file if required.

---

*For French-language sprint tracking and module point math, see `**Todo.md`**. For interface-only npm details, see `**transcendence/frontend/interface/README.md**`.*