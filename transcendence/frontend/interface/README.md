# Interface Transcendance (React + Vite)

## Scripts npm

- **`npm run dev` / `npm run build`** — `predev` / `prebuild` lancent **`generate:tiles-manifest`** (`scripts/generate-board-tiles-manifest.mjs`), qui régénère `src/chess/boardTilesManifest.json` à partir des tuiles dans `public/chess/tiles/`. **Indispensable au build.**

- **`npm run lint`**, **`npm run preview`** — qualité et prévisualisation du bundle.
- **`npm run migrate:css-to-scss`** — renomme les fichiers `.css` en `.scss` sous `src/`.
- **`npm run migrate:css-imports-to-scss`** — remplace les imports locaux `.css` par `.scss` dans les fichiers source.
- **`npm install -D sass`** — ajoute le compilateur Sass requis par Vite pour lire les `.scss`.

Les environnements Python locaux pour outils graphiques (ex. **`.venv-sprites`**) ne sont **pas** utilisés par npm ; le dossier est ignoré par Git (voir `.gitignore` du package interface).

---

## Audio (BGM + SFX)

Documentation détaillée du module React : **`src/features/audio/README.md`**.

### Fichiers statiques

Sous **`public/sounds/`** (non bundlés par Vite). **Partie** : plusieurs pistes dans `public/sounds/game/` (liste canonique `GAME_BGM_FILES` dans `src/config/gameAudioPrefs.js`). **Accueil** : `public/sounds/home/Beth's Story.m4a`.

### Préférences

- Stockage : `localStorage`, clé `transcendence_game_audio_v2` (`gameAudioPrefs.js`).
- Accueil et partie ont chacun volume + mute ; SFX ont volume + mute ; mode de piste partie : **rotation** (défaut), **aléatoire**, ou **piste fixe**.
- Mise à jour globale : événement `transcendence-game-audio-changed` sur `window`.

### Comportement

| Zone | Composant | Lecture |
| ---- | --------- | ------- |
| Hors `/game/*` | `HomeAmbientBgm` (`App.jsx`) | Boucle ; déblocage après geste utilisateur ; pause sur `/game/*`. |
| Partie | `GameAmbientBgm` (`Game.jsx`) | Boucle ; **démarrage après 2 demi-coups** dans le journal (comme le chrono), via `useChessAudio` + `tryPlayGameBgm`. |
| Contrôle in-game | `GameMusicPanel` | Volume / mute BGM partie ; `tryPlayGameBgm` sur interaction pour l’autoplay. |

**Fondus** (`src/features/audio/services/audioFade.js`) : montée en volume sur la BGM partie au lancement (smoothstep + `requestAnimationFrame`). Pas de fondu sur la BGM accueil (pause simple).

**SFX** : Web Audio API procédurale dans `src/features/audio/services/gameSfx.js` ; brief fichiers WAV futurs : `public/sounds/game/README.md`.

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
