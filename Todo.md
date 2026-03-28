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


| Statut / repère | Signification                                                                                                                                                                                                   |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fait**        | Démo possible, exigences du PDF couvertes.                                                                                                                                                                      |
| **Quasi**       | Presque prêt ; reste polish, tests, doc README.                                                                                                                                                                 |
| **En cours**    | Implémentation active.                                                                                                                                                                                          |
| **À faire**     | Pas commencé ou insuffisant pour revendiquer le point.                                                                                                                                                          |
| **Buffer**      | Optionnel : uniquement pour marge si un autre module saute.                                                                                                                                                     |
| **Suffixe `, bonus`** | Ajouter après le statut (ex. `En cours, bonus`) : module prévu **après** les **14 pts** du socle (repère **bleu** sur les slides), dans la limite **+5** (ch. VII). Sans suffixe = compte pour le socle des 14. |


---

## Partie III — Obligatoire (0 pt module, mais barrière de validation)

À traiter comme une **checklist séparée** du barème IV.


| Exigence (résumé PDF)                                                                                                                               | Statut   | Owner               | Notes / preuve                              |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------- | ------------------------------------------- |
| `README.md` complet (VI) — **en anglais**, équipe, gestion de projet, stack, schéma DB, **liste features**, **modules + calcul pts**, contributions | Quasi    | Équipe              | **Racine** : README structuré (EN) — usage, limites honnêtes, équipe, licence/credits, modules ; détail npm dans `interface/README.md`. Compléter schéma DB + Privacy/ToS dans README si pas encore fait. |
| App web : **frontend + backend + base de données**                                                                                                  | Quasi    | Vyke, Fey + Even    |                                             |
| **Git** : commits de tous, messages clairs, répartition du travail                                                                                  | En cours | Équipe              |                                             |
| **Docker** (ou équivalent) : lancement **en une commande**                                                                                          | Quasi    | Even, Cloé + équipe | `Makefile` / `docker compose`               |
| Compatible **Chrome** stable récent                                                                                                                 | Quasi    | Équipe              |                                             |
| **Aucune erreur / warning** console navigateur (requis sujet)                                                                                       | En cours | Vyke, Fey + Even    |                                             |
| **Privacy Policy** + **Terms of Service** : contenu réel, accessibles depuis l’app (ex. footer)                                                     | Quasi    | Vyke, Fey + équipe  | Vérifier liens UI + contenu non placeholder |
| **Multi-utilisateurs** : plusieurs users simultanés, pas de corruption évidente                                                                     | À faire  | Even + Vyke, Fey    | Lié temps réel / backend                    |
| Front **clair, responsive** ; solution **CSS** (framework ou autre)                                                                                 | Quasi    | Vyke, Fey           |                                             |
| `**.env.example`** ; secrets **hors Git**                                                                                                           | Quasi    | Even, Cloé (Vault)  |                                             |
| Schéma DB **clair** + relations                                                                                                                     | En cours | Even, Mileum        | Documenter dans README                      |
| **Compte utilisateur minimal** : **inscription / connexion email + mot de passe** (hash + sel, etc.)                                                | À faire  | Even + Vyke, Fey    | **Requis III** même si OAuth en module      |
| Validation **front + back** des formulaires / entrées                                                                                               | En cours | Vyke, Fey + Even    |                                             |
| Backend servi en **HTTPS**                                                                                                                          | Quasi    | Cloé + Even         | Nginx TLS                                   |


---

## Modules revendiqués — tableau principal

*Remplir la colonne « Statut » avec la réalité du repo. Les points ne sont comptés **que** si le module est **entièrement** démontrable. Ajouter le suffixe `, bonus` au statut pour tout ce qui est **bleu** sur les slides (marge au-delà des 14 pts visés, max +5).*

*Sections PDF **non retenues** et retirées de ce fichier : **IV.4** (IA), **IV.9** (blockchain), **IV.10** (module sur mesure).*

### IV.1 Web


| Module (PDF)                                                                         | Type  | Pts | Statut         | Owner            | Notes / preuve démo                                                |
| ------------------------------------------------------------------------------------ | ----- | --- | -------------- | ---------------- | ------------------------------------------------------------------ |
| Framework **frontend + backend** (un Major couvrant les deux)                        | Major | 2   | Quasi          | Vyke, Fey + Even | React + Django — **confirmer** avec évaluateur vs 2× Minor séparés |
| **WebSockets** (temps réel, déconnexions, diffusion efficace)                        | Major | 2   | En cours       | Even + Vyke, Fey | Serveur : Even ; client : Vyke, Fey                                |
| **Interaction utilisateurs** (chat minimal, profil visible, amis add/remove + liste) | Major | 2   | À faire, bonus | Vyke, Fey + Even | UI : Vyke, Fey ; API : Even                                        |
| ORM                                                                                  | Minor | 1   | Quasi          | Even             | Django ORM                                                         |
| **Design system** (≥10 composants réutilisables, palette, typo, icônes)              | Minor | 1   | En cours       | Vyke, Fey        | Panneau fin de partie, page stats, audio préfs, logo marque — **à cadrer / documenter** dans README |


**Sous-total Web (périmètre retenu)** : Majors FE+BE, WebSockets, interaction users + ORM + design system (selon démo).

---

### IV.2 Accessibilité & internationalisation


| Module (PDF)                      | Type  | Pts | Statut         | Owner              | Notes |
| --------------------------------- | ----- | --- | -------------- | ------------------ | ----- |
| **≥ 3 langues** + i18n + switcher | Minor | 1   | À faire, bonus | Vyke, Fey + équipe |       |
| **Navigateurs additionnels** (compatibilité étendue) | Minor | 1   | À faire, bonus | Vyke, Fey + équipe | **EN (PDF)** : *Support for additional browsers* — compatibilité pleine avec **au moins 2 navigateurs** en plus de la base (Firefox, Safari, Edge, etc.) ; tester et corriger toutes les fonctionnalités sur chaque navigateur ; documenter les limites spécifiques ; **UI/UX cohérente** sur tous les navigateurs supportés. |


---

### IV.3 User management


| Module (PDF)                                                                                     | Type  | Pts | Statut          | Owner                           | Notes                              |
| ------------------------------------------------------------------------------------------------ | ----- | --- | --------------- | ------------------------------- | ---------------------------------- |
| Gestion **standard** (profil éditable, avatar + défaut, **amis** + statut en ligne, page profil) | Major | 2   | En cours        | Vyke, Fey + Even                | Major dans le PDF                  |
| **OAuth 2.0** (42, Google, GitHub…)                                                              | Minor | 1   | Quasi           | Even + Vyke, Fey                | Finir branchement réel vs mock dev |
| **Stats & historique de parties** (nécessite jeu fonctionnel)                                    | Minor | 1   | Quasi, bonus | Mileum (Théo), Even + Vyke, Fey | **Front** : page `/statistics` (stats perso, graphiques Recharts, thème coalition, mock JSON) ; **reste** : persistance / API parties réelles (Even) |
| **Analytics d’activité utilisateur** + tableau de bord d’insights                                 | Minor | 1   | À faire, bonus  | Mileum (Théo), Even + Vyke, Fey | *User activity analytics and insights dashboard* (bonus) |
| **2FA** complet                                                                                  | Minor | 1   | En cours        | Even + Vyke, Fey                | **Front** : toggle placeholder retiré des Paramètres tant que pas de backend ; réintégrer UI quand TOTP/API prêts. |


---

### IV.5 Cybersécurité


| Module (PDF)                                                                  | Type  | Pts | Statut   | Owner | Notes                                        |
| ----------------------------------------------------------------------------- | ----- | --- | -------- | ----- | -------------------------------------------- |
| **WAF ModSecurity** (durci) + **HashiCorp Vault** (secrets chiffrés / isolés) | Major | 2   | En cours | Cloé  | Démontrer règles actives + secrets via Vault |


---

### IV.6 Gaming & expérience


| Module (PDF)                                                    | Type  | Pts | Statut   | Owner            | Notes                              |
| --------------------------------------------------------------- | ----- | --- | -------- | ---------------- | ---------------------------------- |
| **Jeu web complet** (règles, conditions victoire, parties live) | Major | 2   | Quasi    | Vyke, Fey + Even | UI : Vyke, Fey ; sync : Even       |
| **Remote players** (2 machines, latence, déco, **reconnexion**) | Major | 2   | En cours       | Even + Vyke, Fey | **Cœur du gap** vs hot-seat / mock |
| **Multijoueur 3+** (Major PDF : jeu **>2 joueurs**, synchro tous clients, équité) | Major | 2   | À faire, bonus | Even + Vyke, Fey | EN : *Multiplayer game (more than two players). Support for three or more players simultaneously. Fair gameplay mechanics for all participants. Proper synchronization across all clients.* — bonus |
| **Customisation** jeu (thèmes, options…)                        | Minor | 1   | Quasi          | Vyke, Fey (+ Even) | Tuiles / coalitions ; **promotion** pion au choix (Dame/Tour/Fou/Cavalier) ; BGM/SFX ; logo site + favicon |
| **Mode spectateur**                                             | Minor | 1   | En cours, bonus | Even + Vyke, Fey |                                    |


---

### IV.7 DevOps


| Module (PDF)                                                                   | Type  | Pts | Statut   | Owner                     | Notes                             |
| ------------------------------------------------------------------------------ | ----- | --- | -------- | ------------------------- | --------------------------------- |
| **ELK** (ES + Logstash + Kibana, rétention, sécurisation)                      | Major | 2   | Quasi    | Cloé, Mileum (Théo), Even | Finaliser rétention / accès       |
| **Prometheus + Grafana** (metrics, dashboards, **alerting**, sécurité Grafana) | Major | 2   | Quasi    | Cloé, Mileum (Théo), Even | **Alerting** à finaliser          |
| **Microservices** (découplage, interfaces claires, REST ou files, **SRP**)     | Major | 2   | En cours | Even (+ Mileum)           | Argumenter frontières de services |
| **Health checks**, page de statut, **sauvegardes auto** + **PRA / reprise** | Minor | 1   | À faire, bonus | Even, Cloé (+ Mileum) | EN : *Health check and status page system with automated backups and disaster recovery procedures.* — bonus |


---

### IV.8 Data & Analytics


| Module (PDF)                                                               | Type  | Pts | Statut   | Owner                           | Notes                                      |
| -------------------------------------------------------------------------- | ----- | --- | -------- | ------------------------------- | ------------------------------------------ |
| Dashboard analytique avancé (charts, temps réel, export, filtres)          | Major | 2   | En cours | Mileum (Théo), Even + Vyke, Fey | **Front** : écran stats perso avec graphiques (complémentaire au dashboard global IV.8) |
| Export / import données (formats, validation, bulk)                        | Minor | 1   | À faire  | Mileum (Théo), Even             |                                    |
| **RGPD** (accès données, suppression, export lisible, emails confirmation) | Minor | 1   | À faire  | Mileum (Théo), Even + Vyke, Fey | Écrans : Vyke, Fey                 |


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

## Priorités suggérées (ordre risque / sujet)

1. **Partie III** : auth email/mot de passe, README, Privacy/ToS, multi-users réel.
2. **Remote players** + **WebSockets** (souvent la même brique technique).
3. **Interaction users** (chat + profil + amis) si vous revendiquez le Major Web.
4. **Cyber** : ModSecurity effectif + secrets Vault **utilisés** (Cloé).
5. **DevOps** : règles d’**alerting** Grafana ; **microservices** argumentés.
6. **Data / stats** : IV.8 + historique parties (Mileum + Even ; UI avec Vyke, Fey).

---

## Historique


| Date       | Changement                                                                           |
| ---------- | ------------------------------------------------------------------------------------ |
| 27/03/2026 | Création du fichier                                                                  |
| 27/03/2026 | Owners : Vyke + Fey (front), Even (back), Cloé (cyber), Mileum (Théo) (data)         |
| 27/03/2026 | Sections 100 % hors périmètre retirées ; bonus intégré au statut (suffixe `, bonus`) |
| 27/03/2026 | Nettoyage lignes vides / troncatures ; bonus : analytics users (IV.3), multijoueur 3+ (IV.6), health/PRA (IV.7) |
| 28/03/2026 | **Front** : page **Statistiques** perso (`/statistics`, sidebar), winrates donuts, perf time/advantage, usage pièces %/raw, tableau métriques, thème **coalition** ; fin de partie **GameStatsPanel** ; **audio** BGM (jeu + home, prefs partagées) ; **logo** marque + favicon ; **promotion** au choix avec skins coalition |
| 28/03/2026 | **README racine (EN)** : sections usage, architecture, limitations honnêtes, équipe, licence/credits, grading ; **`.gitignore`** : `.cursor/` (règles Cursor locales non partagées). **Paramètres** : retrait **2FA** / **notifications** (non fonctionnels) ; **« Réduire les animations »** branché (hook + Home, Recharts stats, CSS, CoalitionAmbient sans rAF si actif). Renommage **`Coalition_Earth`** (typo Colation). **`interface/README.md`** : rôle des `scripts/` npm vs `.venv-sprites`. |
| 28/03/2026 | **Scripts front** optionnels retirés volontairement (`generate-coalition-svgs`, `measure-board-terre`, asset source) ; **`package.json`** et READMEs alignés — reste **`generate-board-tiles-manifest`** (build). **Règle Cursor locale** : mise à jour **`Todo.md`** + **README** (racine EN + interface) quand utile. |

---

*Ce fichier est un outil d’équipe : le sujet officiel et l’évaluateur font foi. Mettre à jour avant chaque sprint review.*