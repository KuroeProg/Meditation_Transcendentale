# Pièces PNG (manuel)

Même schéma pour **les 4 coalitions** : `eau`, `feu`, `terre`, `air`.

## Chemin URL (servi par Vite depuis `public/`)

```
/chess/pieces/<coalition>/<light|dark>/<fichier>.png
```

Exemples :

| Coalition | Blancs (clair) | Noirs (sombre) |
|-----------|----------------|----------------|
| Eau | `/chess/pieces/eau/light/k.png` | `/chess/pieces/eau/dark/k.png` |
| Feu | `/chess/pieces/feu/light/q.png` | `/chess/pieces/feu/dark/q.png` |
| Terre | `/chess/pieces/terre/light/r.png` | `/chess/pieces/terre/dark/r.png` |
| Air | `/chess/pieces/air/light/n.png` | `/chess/pieces/air/dark/n.png` |

## Arborescence disque (`public/chess/pieces/`)

```
pieces/
  eau/light/   + eau/dark/
  feu/light/   + feu/dark/
  terre/light/ + terre/dark/
  air/light/   + air/dark/
```

## Fichiers attendus dans **chaque** dossier `light/` et `dark/`

| Fichier | Pièce |
|---------|--------|
| `k.png` | Roi |
| `q.png` | Dame |
| `r.png` | Tour |
| `n.png` | Cavalier |
| `p.png` | Pion |
| `bg.png` | Fou sur **case claire** |
| `bd.png` | Fou sur **case foncée** |

Total : **7 fichiers × 2 variantes × 4 coalitions** = 56 PNG si tout est rempli.
