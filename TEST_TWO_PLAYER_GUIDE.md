# Guide: Tester le Jeu d'Échecs avec 2 Joueurs

## 🎮 2 Onglets = 2 Joueurs

Chaque onglet/fenêtre du navigateur reçoit **un User ID différent** via `sessionStorage`:
- **Onglet 1** → ID `42` (Blanc)
- **Onglet 2** → ID `999` (Noir)

Cela est aléatoire à chaque nouvelle fenêtre, permettant des tests multi-joueurs réalistes.

---

## ✅ Procédure de Test Complète (5 minutes)

### Étape 1️⃣: Ouvrir Onglet 1 (Blanc)

```
URL: https://localhost/game/default_room
Attendre: ~2 secondes pour la connexion
```

**Vérifier dans Debug ▼ (coin bas-droit vert):**
- `User ID: 42` ✓
- `Auth: OK` ✓
- `WS: ✓` (Connected)
- `Color: w` ✓
- `Status: active` ✓

**Observé:**
- Échiquier initial s'affiche
- Les 16 pions/pièces blanches sont prêts à jouer

---

### Étape 2️⃣: Ouvrir Onglet 2 (Noir)

```
Raccourci: Ctrl+T (Windows/Linux) ou Cmd+T (Mac)
URL: https://localhost/game/default_room
Attendre: ~1 seconde
```

**Vérifier dans Debug ▼:**
- `User ID: 999` ✓ (DIFFÉRENT d'Onglet 1)
- `Auth: OK` ✓
- `WS: ✓` (Connected)
- `Color: b` ✓
- `Status: active` ✓

**IMPORTANT: Comparer les deux onglets**
- ✓ **MÊME échiquier initial** (les deux voient `FEN: rnbqkbnr/pppppppp/...`)
- ✓ Onglet 2 synchronisé automatiquement sans créer une new partie
- ✓ Les pions noirs en bas (rangée 7-8)

---

### Étape 3️⃣: Onglet 1 Joue Blanc (e2 → e4)

**Dans Onglet 1:**
1. Clicker sur le **pion blanc e2** (2e rangée, 5e colonne)
2. Clicker sur **e4** (4e rangée, 5e colonne)
3. **Attendre < 1 seconde**

**Résultat attendu Onglet 1:**
- ✓ Pion passe de e2 à e4
- ✓ Message de debug disparaît (pas d'erreur)
- ✓ Board actualisé
- ✓ Tour passe aux Noirs (en bas de l'écran)

---

### Étape 4️⃣: Vérifier Onglet 2 Reçoit la Mise à Jour

**Regarder Onglet 2 (sans rien faire):**

**Résultat MAGIQUE:**
- ✓ Pion blanc **e2 → e4 s'affiche instantanément**
- ✓ **Aucun rafraîchissement** (F5) nécessaire
- ✓ La position est **exacte** même que Onglet 1
- ✓ Tour passe aussi aux Noirs

**C'est le Server-Side Truth en action!** 🎉

---

### Étape 5️⃣: Onglet 2 Joue Noir (e7 → e5)

**Dans Onglet 2:**
1. Clicker sur le **pion noir e7** (7e rangée, 5e colonne)
2. Clicker sur **e5** (5e rangée, 5e colonne)
3. **Attendre < 1 seconde**

**Résultat attendu Onglet 2:**
- ✓ Pion noir passe de e7 à e5
- ✓ Pas de message d'erreur
- ✓ Tour repasse aux Blancs

---

### Étape 6️⃣: Vérifier Onglet 1 Reçoit (SANS RAFRAÎCHIR!)

**Regarder Onglet 1:**

**Résultat:**
- ✓ Pion noir **e7 → e5 s'affiche instantanément**
- ✓ **Board synchronisé** en temps réel
- ✓ Tour revient aux Blancs

---

## 🛡️ Test de Sécurité: Turn Validation

### Tentative d'Attaquer hors Ligne

**Sans changer d'onglet, dans Onglet 1:**
1. Essayer de re-jouer (c'est au tour noir)
   - Par exemple: Clicker g1 → f3

**Résultat attendu:**
```
Message d'erreur: "Ce n'est pas votre tour !"
Board ne change PAS
```

**Vérification:**
- ✓ Le serveur rejette le coup
- ✓ Le State reste inchangé
- ✓ Onglet 2 n'a rien reçu d'anormal

---

### Tentative de Coup Illégal

**Attendre que ce soit le tour Blanc**
1. Tenter un coup impossible: Ex. **h2 → h4** (trop loin pour un pion)

**Résultat attendu:**
```
Message utilisateur: "Coup illégal"
Board inchangé (FEN reste pareil)
```

---

## 🔄 Test de Reconnexion

### Étape 1: Rafraîchir Onglet 1

```
F5 (ou Ctrl+R)
```

**Résultat attendu:**
- ✓ **Immédiatement** voit la position actuelle (pas d'attente)
- ✓ FEN correcte reçue du serveur
- ✓ Debug ▼ → `User ID: 42` (Session conservée)
- ✓ Board affiche **exactement** ce qu'il y avait avant le refresh

**Test probant:** Le serveur envoie l'état depuis Redis au moment de la reconnexion.

---

## 📊 Tableau des Comportements Attendus

| Action | Onglet 1 | Onglet 2 | Latence | Status |
|--------|----------|----------|---------|---------|
| Initialisation | Crée partie | Reçoit partie | < 2sec | ✓ |
| Blanc joue | Change Board | ✅ Sync auto | < 1sec | ✓ |
| Noir joue | ✅ Sync auto | Change Board | < 1sec | ✓ |
| Mauvais tour | Erreur "ton tour pas" | Rien | N/A | ✓ |
| Coup illégal | Erreur "illégal" | Rien | N/A | ✓ |
| Refresh | Conserve état + User ID | N/A | < 500ms | ✓ |

---

## 🔍 Débogage: Pourquoi ça ne Fonctionne Pas?

### Problème: User ID identique dans les 2 onglets

**Cause:**
- Mock auth désactivée ou `.env.local` absent

**Solution:**
```bash
cd transcendence/frontend/interface
cat > .env.local <<EOF
VITE_DEV_MOCK_USER=true
VITE_API_ORIGIN=https://localhost
VITE_WS_ORIGIN=wss://localhost
EOF
# Puis rafraîchir
```

---

### Problème: Onglet 2 ne voit pas le coup d'Onglet 1

**Cause:**
- WebSocket non connecté
- Nginx route `/ws/` mal configurée
- Redis pas accessible

**Vérification:**
```bash
# 1. Debug panel → WS: ✗
# 2. Redémarrer nginx
docker compose restart nginx

# 3. Vérifier Redis
docker compose exec redis redis-cli --requirepass $REDIS_PASSWORD
> KEYS *
# Vous devez voir "default_room"
```

---

### Problème: "Utilisateur non connecté"

**Cause:**
- `sessionStorage` bugué
- User ID null ou non détecté

**Solution:**
1. Ouvrir DevTools (F12)
2. Application → Cookies
3. Chercher `sessionStorage('mockUserId')`
4. Si absent: PageLoad issue
5. Tests manuels: Console → `sessionStorage.getItem('mockUserId')`

---

## 🎯 Checklist Succès

Tous les items doivent être ✓:

- [ ] Onglet 1 & 2 ouverts sur même URL
- [ ] User ID différents (42 vs 999)
- [ ] Couleurs assignées correctement (w vs b)
- [ ] Coup Blanc s'affiche Noir < 1sec
- [ ] Coup Noir s'affiche Blanc < 1sec
- [ ] Mauvais tour: rejeté côté serveur
- [ ] Coup illégal: rejeté avec msg
- [ ] Refresh conserve L'état

**Si tout est ✓: Server-Side Truth fonctionne parfaitement!** 🎉

---

## 📝 Notes Techniques

### sessionStorage vs localStorage

- **sessionStorage**: Unique par onglet/fenêtre
  - Chaque nouvel onglet a son propre `sessionStorage`
  - À la fermeture de l'onglet: données supprimées
  - Refresh dans même onglet: données conservées

- **localStorage**: Partagé globalement par domaine
  - Tous les onglets voient les mêmes données
  - Persiste après fermeture du navigateur

**Décision**: On utilise `sessionStorage` pour que chaque onglet soit indépendant. Parfait pour les tests!

### Aléatoire 50/50

À chaque nouvel onglet, `getMockSessionUser()` génère aléatoirement:
```javascript
id = Math.random() > 0.5 ? '42' : '999'
```

50% chance d'être Blanc, 50% d'être Noir. Variable!

Para une session déterministe, vous pouvez forcer:
```javascript
// Dans mockSessionUser.js
id = ongletNumber === 1 ? '42' : '999'  // Non implémenté
```

---

## 🚀 Prochaines Étapes

Une fois que le test 2-joueurs passe:

1. **Ajouter Heure**: Timer décrémentant par joueur
2. **Persistance DB**: Sauvegarder game_state en PostgreSQL
3. **Matchmaking**: Trouver adversaire automatiquement
4. **Ratings**: Calculer ELO après chaque partie
5. **UI Replay**: Regarder les coups joués

---

## ❓ Questions?

Consultez [PROTOCOL_TEST_CHESS.md](./PROTOCOL_TEST_CHESS.md) pour les détails avancés.

Bonne chance! 🎲♟️
