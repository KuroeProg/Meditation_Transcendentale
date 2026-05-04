# Module audio (`features/audio`)

Ambiance (BGM) et effets (SFX) côté interface. **Aucune route backend** : préférences en `localStorage`, événement global pour resynchroniser l’UI.

## Point d’entrée public

```js
import { GameAmbientBgm, GameMusicPanel, HomeAmbientBgm, GameAudioPrefsForm } from '@/features/audio'
```

| Export | Rôle |
|--------|------|
| `HomeAmbientBgm` | Musique d’accueil (toutes les routes **sauf** `/game/*`). Monté dans `App.jsx`. |
| `GameAmbientBgm` | Musique de partie : `HTMLAudioElement` en boucle, piste choisie au montage. Monté dans `Game.jsx`. |
| `GameMusicPanel` | Bouton + popover volume / mute BGM partie (`data-testid="ingame-bgm-fab"`), ancré au panneau stats. |
| `GameAudioPrefsForm` | Formulaire complet (accueil, partie, SFX, mode de piste) — page Paramètres. |

## Fichiers audio statiques

Servis depuis **`public/sounds/`** (hors bundle Vite). Inventaire et briefs SFX : `public/sounds/game/README.md`.

**Partie** — plusieurs pistes listées dans `config/gameAudioPrefs.js` (`GAME_BGM_FILES`), fichiers sous `public/sounds/game/`.

**Accueil** — une piste fixe dans `HomeAudio.jsx` : `public/sounds/home/Beth's Story.m4a`.

## Préférences (`src/config/gameAudioPrefs.js`)

- Clé `localStorage` : `transcendence_game_audio_v2`.
- Champs principaux : `homeBgmVolume` / `homeBgmMuted`, `gameBgmVolume` / `gameBgmMuted`, `sfxVolume` / `sfxMuted`, `gameBgmTrackMode` (`rotate` | `random` | `fixed`), `gameBgmFixedTrack`.
- Migration depuis l’ancien schéma `bgmVolume` / `bgmMuted` (alias conservés pour le jeu).
- Courbe de volume BGM non linéaire (`effectiveBgmVolume`, `effectiveHomeBgmVolume`) : curseur 0–100 % → volume HTMLAudio avec montée douce en bas de plage.
- Après `saveGameAudioPrefs`, dispatch de `window` : **`transcendence-game-audio-changed`** (détail = prefs fusionnées).

## Comportement BGM partie

1. `GameAmbientBgm` crée l’audio, appelle `registerGameBgmElement`, charge une piste via `nextGameBgmSrc()` (rotation `sessionStorage`, aléatoire, ou piste fixe selon les prefs).
2. La lecture **ne** démarre **pas** au chargement de la page : `useChessAudio` (`features/chess/hooks/useChessAudio.js`) appelle `tryPlayGameBgm()` après **au moins 2 demi-coups** dans `moveLog` (aligné sur le démarrage du chrono côté client).
3. Autoplay : `tryPlayGameBgm` fait `play()` puis fondu montant via `audioFade.js` (smoothstep + `requestAnimationFrame`), sauf si la BGM partie est muette (volume 0).
4. Sortie / cleanup : `cancelGameBgmFade`, pause, `unregisterGameBgmElement`, `resetGameBgmFadeController`.

Constantes de fondu : `FADE_IN_MS` (520), `FADE_OUT_MS` (380), `FADE_IN_INITIAL_MS` (640) — utilisées selon le flux (montée principalement côté `tryPlayGameBgm`).

## Comportement BGM accueil

- `HomeAmbientBgm` : boost de gain fixe `HOME_BGM_EXTRA_GAIN` (1.65) pour équilibrer le ressenti vs la partie.
- Déblocage lecture : `pointerdown`, `keydown`, `touchstart`, `canplay`, retour onglet (`visibilitychange`).
- Sur route `/game/*` : pause immédiate (pas de fondu).

## SFX (`services/gameSfx.js`)

- **Web Audio API** : sons procéduraux (coups, échec, fin de partie, timeout, coup refusé).
- `unlockGameAudio()` : crée `AudioContext`, gain maître `sfxMasterGain`, écoute `transcendence-game-audio-changed` pour appliquer `effectiveSfxGain`.
- Contexte suspendu jusqu’à **geste utilisateur** ; `Board.jsx` et `useChessAudio` appellent `unlockGameAudio()` sur interaction / coup.
- `playPieceMoveFromFlags(flags)` : route vers legal / capture / roque selon drapeaux chess.js (`c`, `e`, `k`, `q`).
- Fichiers WAV optionnels sous `public/sounds/game/` : décrits dans `public/sounds/game/README.md` (remplacement futur par buffers, pas encore câblé).

## Hooks

- `useGameAudioPrefsLive` : état React synchronisé sur `loadGameAudioPrefs` + listener `transcendence-game-audio-changed`.

## Tests E2E

Sélecteurs stables : ex. `data-testid="ingame-bgm-fab"`, `settings-audio-form`, `settings-home-bgm-muted`, `settings-game-bgm-muted` — voir `tests/e2e/README.md`.

## Fichiers du module

| Chemin | Rôle |
|--------|------|
| `components/GameAudio.jsx` | BGM partie + panneau musique in-game |
| `components/HomeAudio.jsx` | BGM accueil |
| `components/AudioPrefsForm.jsx` | Formulaire paramètres |
| `services/gameBgm.js` | Registre global + `tryPlayGameBgm` |
| `services/homeBgm.js` | Registre + `tryPlayHomeBgm` (déblocage depuis menu accueil) |
| `services/audioFade.js` | Fondus volume sur `HTMLAudioElement` |
| `services/gameSfx.js` | Web Audio SFX |
| `hooks/useGameAudioPrefs.js` | Prefs réactives |
