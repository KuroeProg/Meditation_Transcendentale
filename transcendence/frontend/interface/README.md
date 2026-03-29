# Interface Transcendance (React + Vite)

## Scripts npm

- **`npm run dev` / `npm run build`** — `predev` / `prebuild` lancent **`generate:tiles-manifest`** (`scripts/generate-board-tiles-manifest.mjs`), qui régénère `src/chess/boardTilesManifest.json` à partir des tuiles dans `public/chess/tiles/`. **Indispensable au build.**

- **`npm run lint`**, **`npm run preview`** — qualité et prévisualisation du bundle.

Les environnements Python locaux pour outils graphiques (ex. **`.venv-sprites`**) ne sont **pas** utilisés par npm ; le dossier est ignoré par Git (voir `.gitignore` du package interface).

---

## Template Vite (référence)

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown-vite)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
