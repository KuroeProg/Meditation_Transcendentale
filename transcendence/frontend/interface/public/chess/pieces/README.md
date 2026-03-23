# Pièces PNG (manuel)

Place ici tes fichiers exportés. Le Board charge :

`/{eau|feu}/{light|dark}/{nom}.png`

**Fichiers attendus par variante** (même liste pour `light` et `dark`) :

| Fichier | Pièce |
|---------|--------|
| `k.png` | Roi |
| `q.png` | Dame |
| `r.png` | Tour |
| `n.png` | Cavalier |
| `p.png` | Pion |
| `bg.png` | Fou sur **case claire** |
| `bd.png` | Fou sur **case foncée** |

**Terre / Air** : tant qu’il n’y a pas de dossiers dédiés, l’app retombe sur les assets **feu** (`ChessPiecePng.jsx`).
