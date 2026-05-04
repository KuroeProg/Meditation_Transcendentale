# Audio jeu — Transcendance

## Musique d’ambiance (partie)

| Fichier | Rôle |
|---------|------|
| `Theme_of_game.wav` | Thème **in-game** (page `/game`), boucle ; la lecture démarre au premier coup, avec le chrono (`GameAudio.jsx` / `useChessAudio.js`). |

## Musique d’accueil (hors partie)

Fichier : `../home/Beth's Story.m4a` — jouée sur toutes les routes sauf `/game/*` (`HomeAudio.jsx`).

Réglages : **Paramètres** → Audio, ou bouton volume en haut à droite pendant la partie.

---

## SFX (coups, UI…)

Fichiers attendus (stéréo ou mono, **44,1 kHz**, WAV 16-bit conseillé). Tant qu’ils sont absents, l’app utilise la **synthèse Web Audio** (`src/features/audio/services/gameSfx.js`).

| Fichier | Brief | Déclencheur in-game |
|--------|--------|---------------------|
| `move_legal.wav` | Bois dense / pierre polie, ~150 ms, sec, peu de réverb | Coup sur case vide |
| `move_capture.wav` | Comme legal + cloche métal mate étouffée, ~250 ms, +3 dB | Capture |
| `move_castling.wav` | Double impact rapide, léger feutre, ~300 ms | Roque |
| `move_check.wav` | Synthé sinus, ping cristal, ~400 ms | Échec (pas mat) |
| `game_win.wav` | Nappe shimmer, crescendo résolu, ~2,5 s | Mat / victoire |
| `game_draw.wav` | Piano bas low-pass, neutre, ~2 s | Pat / nulle |
| `game_resign.wav` | Impact sourd + souffle pitch down, ~1,5 s | Abandon |
| `clock_timeout.wav` | 3 bips étouffés, ~800 ms | Temps écoulé |
| `ui_error_deny.wav` | Thump très bas, ~100 ms | Coup illégal |

Intégration future : charger ces fichiers via `AudioBuffer` et les jouer à la place des fonctions procédurales (même mapping d’événements que `gameSfx.js`).

Manifest machine-readable : `sfx-manifest.json`.
