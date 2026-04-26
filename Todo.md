# ft_transcendence — Suivi modules & objectifs points

Document de pilotage aligné sur le sujet **ft_transcendence v20** (`transcendance.pdf`) : **Major = 2 pts**, **Minor = 1 pt**.

## Répartition équipe (owners)


| Personne                         | Rôle principal                                                                          |
| -------------------------------- | --------------------------------------------------------------------------------------- |
| **Vyke** (toi), **Fey** (Alexie) | **Frontend** (React, UI jeu, design system, i18n/a11y côté interface, client WebSocket) |
| **Even**                         | **Backend** (Django, APIs, auth, WebSockets serveur, jeu à distance, persistance…)      |
| **Cloé**                         | **Cybersécurité** (WAF / ModSecurity, Vault, durcissement, accès monitoring / logs)     |
| **Mileum** (Théo)                | **Statistiques & data** (IV.8, stats / historique IV.3), **appui backend**              |


---

## Objectifs


| Cible                        | Détail                                                                                                                                                                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Minimum obligatoire**      | **14 points** de modules (chapitre IV) + respect de la **partie III** (sinon projet refusé).                                                                                                                          |
| **Bonus officiel (ch. VII)** | Au-delà de 14 pts **validés**, l’évaluateur peut compter **au plus +5 pts** de bonus (ex. 5× Minor, ou 2× Major + 1× Minor). **Plafond courant : 19 pts** au total (14 + 5).                                          |
| **Marge « oral »**           | Prévoir **plus** de modules que nécessaire : si un module est jugé **non fonctionnel** → **0 pt** pour ce module. Une cible interne de **17–20+ pts « prévus »** avant évaluation réduit le risque de tomber sous 14. |


> **À compléter en équipe** : cocher les statuts, ajuster les lignes selon les modules **réellement** présentés à la soutenance.

---

## Légende des statuts


| Statut / repère | Signification                                          |
| --------------- | ------------------------------------------------------ |
| **Fait**        | Démo possible, exigences du PDF couvertes.             |
| **Quasi**       | Presque prêt ; reste polish, tests, doc README.        |
| **En cours**    | Implémentation active.                                 |
| **À faire**     | Pas commencé ou insuffisant pour revendiquer le point. |
|                 |                                                        |
|                 |                                                        |


---

## Partie III — Obligatoire (0 pt module, mais barrière de validation)

À traiter comme une **checklist séparée** du barème IV.


| Exigence (résumé PDF)                                                                                                                               | Statut   | Owner               | Notes / preuve                                                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `README.md` complet (VI) — **en anglais**, équipe, gestion de projet, stack, schéma DB, **liste features**, **modules + calcul pts**, contributions | Quasi    | Équipe              | **Racine** : README structuré (EN) — usage, limites honnêtes, équipe, licence/credits, modules ; détail npm dans `interface/README.md`. Compléter schéma DB + Privacy/ToS dans README si pas encore fait. |
| App web : **frontend + backend + base de données**                                                                                                  | Fait     | Equipe              |                                                                                                                                                                                                           |
| **Git** : commits de tous, messages clairs, répartition du travail                                                                                  | Fait     | Équipe              | Branche `vbonnard` : gros lot **2026-04-05** (feat chat / profil / CSS) + merges `main`.                                                                                                                  |
| **Docker** (ou équivalent) : lancement **en une commande**                                                                                          | Fait     | Even, Cloé + équipe | `Makefile` / `docker compose`                                                                                                                                                                             |
| Compatible **Chrome** stable récent                                                                                                                 | Fait     | Équipe              |                                                                                                                                                                                                           |
| **Aucune erreur / warning** console navigateur (requis sujet)                                                                                       | Pas fait | Vyke, Fey + Even    |                                                                                                                                                                                                           |
| **Privacy Policy** + **Terms of Service** : contenu réel, accessibles depuis l’app (ex. footer)                                                     | Fait     | Vyke, Fey + équipe  | Vérifier liens UI + contenu non placeholder                                                                                                                                                               |
| **Multi-utilisateurs** : plusieurs users simultanés, pas de corruption évidente                                                                     | Fait     | Even + Vyke, Fey    | Lié temps réel / backend                                                                                                                                                                                  |
| Front **clair, responsive** ; solution **CSS** (framework ou autre)                                                                                 | Fait     | Vyke, Fey           | Bottom nav mobile, panneau stats sous le plateau en étroit, shell commun.                                                                                                                                 |
| `**.env.example`** ; secrets **hors Git**                                                                                                           | Fait     | Even, Cloé (Vault)  |                                                                                                                                                                                                           |
| Schéma DB **clair** + relations                                                                                                                     | En cours | Even, Mileum        | Documenter dans README                                                                                                                                                                                    |
| **Compte utilisateur minimal** : **inscription / connexion email + mot de passe** (hash + sel, etc.)                                                | Fait     | Even + Cloe         | **Requis III** même si OAuth en module                                                                                                                                                                    |
| Validation **front + back** des formulaires / entrées                                                                                               | A verif  | Even                |                                                                                                                                                                                                           |
| Backend servi en **HTTPS**                                                                                                                          | Fait     | Cloé + Even         | Nginx TLS                                                                                                                                                                                                 |


---

## Modules revendiqués — tableau principal

*Remplir la colonne « Statut » avec la réalité du repo. Les points ne sont comptés **que** si le module est **entièrement** démontrable. Ajouter le suffixe `, bonus` au statut pour tout ce qui est **bleu** sur les slides (marge au-delà des 14 pts visés, max +5).*

*Sections PDF **non suivies** dans ce fichier : **IV.9** (blockchain) uniquement. **IV.4** (IA) et **IV.10** (module sur mesure / Surprise) : suivies ci-dessous.*

### IV.1 Web


| Module (PDF)                                                                         | Type  | Pts | Statut   | Owner                | Notes / preuve démo                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------ | ----- | --- | -------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework **frontend + backend** (un Major couvrant les deux)                        | Major | 2   | Fait     | Vyke, Fey + Even     | React + Django — **confirmer** avec évaluateur vs 2× Minor séparés                                                                                                                                                         |
| **WebSockets** (temps réel, déconnexions, diffusion efficace)                        | Major | 2   | Fait     | Even, Fey            | Serveur : Even ; client : Vyke, Fey                                                                                                                                                                                        |
| **Interaction utilisateurs** (chat minimal, profil visible, amis add/remove + liste) | Major | 2   | Fait     | Vyke, Fey + Even     | **2026-04** : app **chat** Django + WS, drawer React, contacts/conv ; **profil** éditable + avatar + amis + classement ; API friends. Le **chat avancé** (invite partie, etc.) reste **Minor bonus** si revendiqué à part. |
| ORM                                                                                  | Minor | 1   | Fait     | Even + Cloe + Mileum | Django ORM                                                                                                                                                                                                                 |
|                                                                                      |       |     |          |                      |                                                                                                                                                                                                                            |
| **PWA** — *Progressive Web App* (hors ligne, installabilité)                         | Minor | 1   | Pas fait | Vyke, Fey + Even     | *Offline support and installability* — service worker, manifest, stratégie cache.                                                                                                                                          |


**Sous-total Web (périmètre retenu)** : Majors FE+BE, WebSockets, interaction users + ORM + design system + PWA (selon démo).

---

### IV.2 Accessibilité & internationalisation


| Module (PDF)                                         | Type  | Pts | Statut                           | Owner              | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------- | ----- | --- | -------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **≥ 3 langues** + i18n + switcher                    | Minor | 1   | Pas fait                         | Vyke, Fey + équipe |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Navigateurs additionnels** (compatibilité étendue) | Minor | 1   | Safari done, test Edge & Firefox | Vyke, Fey + équipe | **EN (PDF)** : *Support for additional browsers* — compatibilité pleine avec **au moins 2 navigateurs** en plus de la base (Firefox, Safari, Edge, etc.) ; tester et corriger toutes les fonctionnalités sur chaque navigateur ; documenter les limites spécifiques ; **UI/UX cohérente** sur tous les navigateurs supportés. **2026-04** : PostCSS + Autoprefixer + Browserslist configurés (last 2 Firefox/Safari/Edge/iOS) ; `-webkit-backdrop-filter` ajouté partout ; ordre `100vh` / `100dvh` corrigé ; règles `::-webkit-scrollbar` ajoutées aux zones scrollables. Reste : vérification visuelle sur chaque navigateur cible. |


---

### IV.3 User management


| Module (PDF)                                                                                     | Type  | Pts | Statut | Owner                           | Notes                                                                                                                                                |
| ------------------------------------------------------------------------------------------------ | ----- | --- | ------ | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gestion **standard** (profil éditable, avatar + défaut, **amis** + statut en ligne, page profil) | Major | 2   | Fait   | Vyke, Fey + Even                | **2026-04** : endpoints profil, upload avatar, friendships, leaderboard mock/API ; UI profil refonte.                                                |
| **OAuth 2.0** (42, Google, GitHub…)                                                              | Minor | 1   | Fait   | Even + Vyke, Fey                | **42** : niveau Intra exposé côté user ; autres providers selon démo.                                                                                |
| **Stats & historique de parties** (nécessite jeu fonctionnel)                                    | Minor | 1   | Fait   | Mileum (Théo), Even + Vyke, Fey | **Front** : page `/statistics` (stats perso, graphiques Recharts, thème coalition, mock JSON) ; **reste** : persistance / API parties réelles (Even) |
| **Analytics d’activité utilisateur** + tableau de bord d’insights                                | Minor | 1   | ?      | Mileum (Théo), Even + Vyke, Fey | *User activity analytics and insights dashboard* (bonus)                                                                                             |
| **2FA** complet                                                                                  | Minor | 1   | Fait   | Even                            | **Front** : toggle placeholder retiré des Paramètres tant que pas de backend ; réintégrer UI quand TOTP/API prêts.                                   |


---

### IV.4 Intelligence artificielle (Artificial Intelligence)


| Module (PDF)                                                                                            | Type  | Pts | Statut   | Owner            | Notes / exigences                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------- | ----- | --- | -------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Major : adversaire IA pour les parties** — introduire une IA qui joue contre l’utilisateur            | Major | 2   | Pas fait | Even + Vyke, Fey | L’IA doit être **exigeante** et **pouvoir gagner de temps en temps**. Comportement **proche d’un humain** (pas du jeu parfait type moteur optimal pur). Si le projet inclut des **options de customisation** du jeu, l’IA doit **pouvoir les utiliser**. **Soutenance** : pouvoir **expliquer l’implémentation** de l’IA (choix d’algo, profondeur, heuristiques, etc.). |
|                                                                                                         |       |     |          |                  |                                                                                                                                                                                                                                                                                                                                                                          |
| **Minor : modération de contenu par IA** — auto-modération, suppression auto, avertissements auto, etc. | Minor | 1   | Pas fait | Even + Vyke, Fey | *Content moderation AI* — à cadrer (chat, tournois, profils…) selon périmètre réel.                                                                                                                                                                                                                                                                                      |


---

### IV.5 Cybersécurité


| Module (PDF)                                                                  | Type  | Pts | Statut | Owner | Notes                                        |
| ----------------------------------------------------------------------------- | ----- | --- | ------ | ----- | -------------------------------------------- |
| **WAF ModSecurity** (durci) + **HashiCorp Vault** (secrets chiffrés / isolés) | Major | 2   | Fait   | Cloé  | Démontrer règles actives + secrets via Vault |


---

### IV.6 Gaming & expérience


| Module (PDF)                                                                          | Type  | Pts | Statut                                                         | Owner              | Notes                                                                                                                             |
| ------------------------------------------------------------------------------------- | ----- | --- | -------------------------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| **Jeu web complet** (règles, conditions victoire, parties live)                       | Major | 2   | Fait                                                           | Vyke, Fey + Even   | UI : Vyke, Fey ; sync : Even                                                                                                      |
| **Remote players** (2 machines, latence, déco, **reconnexion**)                       | Major | 2   | Fait                                                           | Even + Vyke, Fey   | **Cœur du gap** vs hot-seat / mock                                                                                                |
| **Customisation** jeu (thèmes, options, cartes / thèmes visuels, réglages par défaut) | Minor | 1   | Quasi (faire le power-up et donc faire un nouveau mode de jeu) | Vyke, Fey (+ Even) | Tuiles / coalitions ; **promotion** pion au choix ; logo site + favicon ; réglages accessibles avec **options par défaut** (PDF). |
| **Système de tournois** (tableaux, appariements, inscription & gestion, matchmaking)  | Minor | 1   | Pas fait                                                       | Even + Vyke, Fey   | **Bonus** — prérequis : **jeu implémenté** (*Gaming*). *You cannot have tournaments without a game to play.*                      |
|                                                                                       |       |     |                                                                |                    |                                                                                                                                   |
| **Mode spectateur**                                                                   | Minor | 1   | Fait                                                           | Even               |                                                                                                                                   |


---

### IV.7 DevOps


| Module (PDF)                                                                   | Type  | Pts | Statut                                                      | Owner                 | Notes                                                                                                       |
| ------------------------------------------------------------------------------ | ----- | --- | ----------------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------- |
| **ELK** (ES + Logstash + Kibana, rétention, sécurisation)                      | Major | 2   | En cours (Theo est encore desssus sur elasticsearch etc...) | Mileum (Théo) + Cloe  | Finaliser rétention / accès                                                                                 |
| **Prometheus + Grafana** (metrics, dashboards, **alerting**, sécurité Grafana) | Major | 2   | Fait                                                        | Cloé                  | **Alerting** à finaliser                                                                                    |
| **Microservices** (découplage, interfaces claires, REST ou files, **SRP**)     | Major | 2   | Pas sur                                                     | Cloe + Mileum         | Argumenter frontières de services                                                                           |
| **Health checks**, page de statut, **sauvegardes auto** + **PRA / reprise**    | Minor | 1   | En cours                                                    | Even, Cloé (+ Mileum) | EN : *Health check and status page system with automated backups and disaster recovery procedures.* — bonus |


---

### IV.8 Data & Analytics


| Module (PDF)                                                               | Type  | Pts | Statut   | Owner            | Notes                                                                                                                                                                                                                                                                                                                             |
| -------------------------------------------------------------------------- | ----- | --- | -------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard analytique avancé (charts, temps réel, export, filtres)          | Major | 2   | Pas fait | Mileum (Théo)    | **Front** : écran stats perso avec graphiques (complémentaire au dashboard global IV.8)                                                                                                                                                                                                                                           |
|                                                                            |       |     |          |                  |                                                                                                                                                                                                                                                                                                                                   |
| **RGPD** (accès données, suppression, export lisible, emails confirmation) | Minor | 1   | En cours | Even + Vyke, Fey | **2026-04** : `DELETE /api/auth/me/delete-data` (anonymisation compte hybride : PII effacés, messages/amitiés/invites supprimés, parties conservées anonymisées, session invalidée). Frontend : section « Données personnelles (RGPD) » dans Paramètres avec double confirmation. Reste : export lisible + email de confirmation. |


---

### IV.10 Module sur mesure (*Surprise* — bonus)

*PDF : module libre (périmètre réduit vs un Major), valeur ajoutée + justification dans le README — compte **souvent** comme **Minor** dans le plafond bonus (+5 pts, ch. VII).*


| Module (choix équipe)                                                                                           | Type  | Pts | Statut | Owner | Notes / preuve                                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------------- | ----- | --- | ------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Audio** — expérience sonore globale (BGM, SFX, préférences partagées jeu + home, polish fin de partie / menu) | Minor | 1   | Fait   | Vyke  | BGM home (`Beth's Story.m4a`) hors `/game/`* ; BGM partie (`Theme_of_game.wav`) au 1er coup ; chrono blanc figé avant 1er coup (UI) ; README `public/sounds/` + racine à jour. |


---

## Feuille de calcul rapide (à maintenir)

1. Lister **uniquement** les modules **Fait / Quasi** (avec ou sans suffixe `, bonus`) que vous présenterez.
2. Somme : `Σ (2 × nb Majors) + (1 × nb Minors)`.
3. Vérifier **≥ 14** pour la validation en comptant d’abord les modules **sans** suffixe `, bonus` dans le statut (socle).
4. Au-delà de 14 **et** si tout est validé à l’oral : jusqu’à **+5** pts bonus (ch. VII) — modules dont le statut comporte le suffixe `, bonus` (bleu slides).

**Exemple de feuille interne** (à adapter) :


| Scénario                                                                                                 | Points                                                |
| -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Jeu complet (2) + Remote (2) + Web FE+BE (2) + ORM (1) + OAuth (1) + ELK (2) + Prom/Graf (2) + Cyber (2) | **14** (socle, statuts **sans** `, bonus`)            |
| + Spectateur (1) + Stats parties (1)                                                                     | **16** → **14 validés + 2 bonus** (cap bonus reste 5) |


---

## Historique


| Date       | Changement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 27/03/2026 | Création du fichier                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 27/03/2026 | Owners : Vyke + Fey (front), Even (back), Cloé (cyber), Mileum (Théo) (data)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 27/03/2026 | Sections 100 % hors périmètre retirées ; bonus intégré au statut (suffixe `, bonus`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 27/03/2026 | Nettoyage lignes vides / troncatures ; bonus : analytics users (IV.3), multijoueur 3+ (IV.6), health/PRA (IV.7)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 28/03/2026 | **Front** : page **Statistiques** perso (`/statistics`, sidebar), winrates donuts, perf time/advantage, usage pièces %/raw, tableau métriques, thème **coalition** ; fin de partie **GameStatsPanel** ; **audio** BGM (jeu + home, prefs partagées) ; **logo** marque + favicon ; **promotion** au choix avec skins coalition                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 28/03/2026 | **README racine (EN)** : sections usage, architecture, limitations honnêtes, équipe, licence/credits, grading ; `**.gitignore`** : `.cursor/` (règles Cursor locales non partagées). **Paramètres** : retrait **2FA** / **notifications** (non fonctionnels) ; **« Réduire les animations »** branché (hook + Home, Recharts stats, CSS, CoalitionAmbient sans rAF si actif). Renommage `**Coalition_Earth`** (typo Colation). `**interface/README.md`** : rôle des `scripts/` npm vs `.venv-sprites`.                                                                                                                                                                                                                                                                                         |
| 28/03/2026 | **Scripts front** optionnels retirés volontairement (`generate-coalition-svgs`, `measure-board-terre`, asset source) ; `**package.json`** et READMEs alignés — reste `**generate-board-tiles-manifest`** (build). **Règle Cursor locale** : mise à jour `**Todo.md`** + **README** (racine EN + interface) quand utile.                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 28/03/2026 | **Stats** : `profileSummary` dans `**mockPersonalStats.json`** ; `**resolveProfileGameStats`** + composant `**GameStatsSummarySection`** (Profil + Paramètres) alignés sur le même mock que la page Statistiques. **Statistics** : espacement vertical colonne graphes (`padding` / `gap`) pour mieux s’aligner avec le panneau métriques.                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 28/03/2026 | **Mocks** : fusion `**mockPlayerStats.json`** → clé `**gamePanel`** dans `**mockPersonalStats.json`** (une seule source) ; chiffres panneau fin de partie alignés sur winrate global / parties totales / ELO courbe ; `**GameStatsPanel`** importe ce fichier.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 01/04/2026 | **UI / jeu** : shell **responsive** (bottom nav, layout partie), onglets stats isolés ; **audio** : nouveaux assets BGM, musique **home** par route, BGM **partie** au 1er coup, correctifs cycle de vie BGM accueil, audibilité, **budget hauteur** plateau ; **échiquier** : coordonnées, mobile ; **chess** : fantôme de coup + **roque** (plateau pré-mouvement), seed tuiles, son refus coup illégal ; **DevOps** : Postgres prêt avant migrations / worker Celery ; **nginx** `conf.d` ; **Makefile**.                                                                                                                                                                                                                                                                                   |
| 03/04/2026 | **Sécurité** : commit `security modification` (alignement post-audit / durcissement — détail dans le diff Git).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 05/04/2026 | **README + Todo** : mise à jour documentation / suivi (`2d76e56`, ~15:19 heure locale du dépôt selon `git`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 05/04/2026 | **Livraison majeure** (`54b8d79`, ~16:48) : **backend** — app **Django chat** (modèles, REST, WebSocket consumer, routing ASGI), **Friendship** + vues friends / profile, champs user (ex. **niveau 42** OAuth), nginx ; **frontend** — **Auth** refonte (split, coalitions), **Dashboard** v2 (cadences, matchmaking, thème coalition), **Profil** (avatar, amis, leaderboard), **Chat** (drawer, FAB), **Home** / **SiteBrandLogo**, **CSS** découpé (`styles/*`, `profile-page`, `layout-main`, `responsive`, `game-board`), **App** + features ; **Makefile**.                                                                                                                                                                                                                             |
| 05/04/2026 | **Merge `main` → `vbonnard`** (`d0a36ff`, ~16:48).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 26/04/2026 | **Revanche + ELO + RGPD** : (1) Protocole WS `rematch_offer/response` + `rematch_started` (backend `game_consumer.py`, swap couleurs, nouvelle `game_id` Redis). (2) Frontend : boutons « Nouvelle partie » (→ file matchmaking auto) + « Revanche » + bannières offer/incoming (`RematchOfferBanner`), navigation `useChessEngine → onRematchStarted → navigate`. (3) ELO timeout : `clock_tick.py` retourne le signal de timeout → `_save_and_broadcast_final_state` déclenché ; ELO fallback 1500 → 1200 partout (backend `game/views.py`, frontend `GameStatsPanel`). (4) RGPD hybride : `DELETE /api/auth/me/delete-data` + UI double confirmation dans Paramètres. (5) Tests E2E : `game-rematch.spec.js`, `settings-delete-server-data.spec.js`, mock WS `installRematchWebSocketMock`. |


---

*Ce fichier est un outil d’équipe : le sujet officiel et l’évaluateur font foi. Mettre à jour avant chaque sprint review.*