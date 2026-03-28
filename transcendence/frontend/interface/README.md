# Interface Transcendance (React + Vite)

## Scripts npm utiles

- **`npm run dev` / `npm run build`** — avant lancement, `predev` / `prebuild` exécutent **`generate:tiles-manifest`** (`scripts/generate-board-tiles-manifest.mjs`) pour régénérer `src/chess/boardTilesManifest.json` à partir des PNG dans `public/chess/tiles/`. **Le dossier `scripts/` est donc nécessaire au build**, pas du bruit.
- **`npm run generate:coalition-svgs`** — génération optionnelle d’assets SVG (`scripts/generate-coalition-svgs.mjs`).
- **`scripts/measure-board-terre.mjs`** — utilitaire ponctuel de mesure sur une image ; hors runtime navigateur.

Les environnements Python locaux pour outils graphiques (ex. **`.venv-sprites`**) ne sont **pas** utilisés par npm ; ils sont listés dans `.gitignore` pour éviter de les versionner.

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
