# Transcendence - Diagramme ASCII des services Docker

Ce document cartographie les services visibles via `make ps` et leurs liaisons réelles dans `transcendence/docker-compose.yml`.

- Source de vérité: `transcendence/docker-compose.yml`
- Commande d'observation: `make ps`
- Note: `vault-init` est un job one-shot (il peut ne pas apparaître dans `make ps` une fois terminé)

---

## Légende

- `A --> B`: flux principal de données / appel
- `A ==depends_on==> B`: dépendance de démarrage Compose
- `[Entrée] -> [Traitement] -> [Sortie]`: chaîne de transformation

---

## 1) Vue globale (diagramme ASCII)

```text
                                          INTERNET / NAVIGATEUR
                                                   |
                                                   v
                                      +---------------------------+
                                      |   Utilisateur (Browser)   |
                                      |   https://localhost:443   |
                                      +-------------+-------------+
                                                    |
                                                    v
                                      +---------------------------+
                                      |           nginx           |
                                      |  reverse proxy + TLS +    |
                                      |  ModSecurity + routing    |
                                      +-----+---------------+-----+
                                            |               |
                                UI assets   |               | API/WS
                                            |               |
                                            v               v
                                +----------------+   +----------------------+
                                |    frontend    |   |       backend        |
                                |   Vite :5173   |   |  Daphne/Django :8000 |
                                +--------+-------+   +---+----+----+----+---+
                                         ^               |    |    |    |   |
                                         |               |    |    |    |   +--> elasticsearch
                                         |               |    |    |    +------> vault (secrets)
                                         |               |    |    +-----------> mailhog (SMTP dev)
                                         |               |    +----------------> redis (broker/cache)
                                         |               +---------------------> db (Postgres)
                                         |
                                         +--------- (servi derrière nginx)

  +----------------------+        +-------------------------+        +----------------------+
  |        worker        | -----> | redis + db + vault      | -----> | résultats tâches     |
  | Celery (data_script) |        | (broker, persistence,   |        | async côté app       |
  |                      |        | secrets)                |        |                      |
  +----------------------+        +-------------------------+        +----------------------+

  +----------------------+        +----------------------+          +----------------------+
  | logs app/nginx files | -----> |      logstash        | -------> |    elasticsearch     |
  | (/logs/app,/logs/..) |        | parsing / pipeline   |          | indexation/recherche |
  +----------------------+        +----------------------+          +----------+-----------+
                                                                              |
                                                                              v
                                                                     +------------------+
                                                                     |      kibana      |
                                                                     | visualisation    |
                                                                     +------------------+

  +----------------------+        +----------------------+          +----------------------+
  |   nginx-exporter     | -----> |     prometheus       | -------> |      grafana         |
  +----------------------+        | scraping + stockage  |          | dashboards + alertes |
                                  +----------------------+          +----------------------+
  +----------------------+
  |    node_exporter     |
  +----------------------+
               \______________________________> prometheus

  +----------------------+      (one-shot init)      +----------------------+
  |        vault         | <------------------------- |      vault-init       |
  | secrets manager TLS  |                            | injection des secrets |
  +----+-----------+-----+                            +----------------------+
       |           | \
       |           |  \____> backend / worker / grafana / logstash / elasticsearch
       |           |
       +-----------> tous les services configurés avec VAULT_ADDR + VAULT_TOKEN
```

---

## 2) Dépendances Compose exactes (`depends_on`)

```text
backend ==depends_on==> db (service_healthy)
backend ==depends_on==> redis (service_started)
backend ==depends_on==> mailhog (service_started)
backend ==depends_on==> vault-init (service_completed_successfully)
backend ==depends_on==> elasticsearch (service_healthy)

worker ==depends_on==> db (service_healthy)
worker ==depends_on==> redis (service_started)

nginx ==depends_on==> backend
nginx ==depends_on==> frontend

grafana ==depends_on==> prometheus (service_started)
grafana ==depends_on==> vault-init (service_completed_successfully)

kibana ==depends_on==> elasticsearch

logstash ==depends_on==> elasticsearch (service_healthy)
logstash ==depends_on==> vault-init (service_completed_successfully)

vault-init ==depends_on==> vault
```

---

## 3) Flux de donnees detailles (entree -> traitement -> sortie)

### 3.1 Flux Web principal (UI + API)

```text
[Entrée]
Navigateur utilisateur (requête HTTPS)
    ->
[Traitement]
nginx termine TLS, applique les règles de sécurité et route:
  - vers frontend pour assets/UI
  - vers backend pour API/WS
    ->
[Sortie]
Réponse HTML/CSS/JS + réponses API + flux WebSocket vers le navigateur
```

### 3.2 Flux backend applicatif

```text
[Entrée]
Requête API/WS depuis nginx
    ->
[Traitement]
backend:
  - logique métier Django
  - lecture/écriture DB (Postgres)
  - cache/broker (Redis)
  - accès secrets (Vault)
  - envoi mail dev (Mailhog)
  - éventuelle interaction Elastic
    ->
[Sortie]
JSON/API response + événements WS + jobs asynchrones publiés
```

### 3.3 Flux asynchrone (Celery worker)

```text
[Entrée]
Tâches publiées via Redis broker
    ->
[Traitement]
worker Celery exécute la tâche, consulte DB et secrets Vault
    ->
[Sortie]
Données persistées en DB, artefacts partagés (shared_assets), état de tâche
```

### 3.4 Flux logs / observabilité ELK

```text
[Entrée]
Fichiers de logs:
  - /logs/nginx
  - /logs/app
    ->
[Traitement]
logstash lit, parse et enrichit les événements
    ->
[Sortie]
Documents indexés dans Elasticsearch, consultables dans Kibana
```

### 3.5 Flux métriques Prometheus/Grafana

```text
[Entrée]
Métriques exposées par:
  - nginx-exporter (métriques Nginx)
  - node_exporter (métriques host)
    ->
[Traitement]
prometheus scrape, stocke et agrège les séries temporelles
    ->
[Sortie]
grafana visualise dashboards et alertes
```

### 3.6 Flux secrets Vault

```text
[Entrée]
Variables sensibles depuis .env / bootstrap
    ->
[Traitement]
vault-init écrit les secrets dans Vault (KV), puis les services lisent via VAULT_ADDR/VAULT_TOKEN
    ->
[Sortie]
Services configurés sans hardcoder les secrets applicatifs dans les images
```

---

## 4) Reseaux Docker (segmentation)

```text
frontend_net:
  - nginx
  - nginx-exporter

backend_net:
  - db
  - redis
  - backend
  - worker
  - frontend
  - nginx
  - prometheus
  - elasticsearch
  - kibana
  - logstash
  - mailhog

monitor_net:
  - vault
  - vault-init
  - backend
  - worker
  - nginx
  - mailhog
  - prometheus
  - node_exporter
  - nginx-exporter
  - grafana
  - elasticsearch
  - kibana
  - logstash
```

---

## 5) Ports visibles depuis l'hote (d'apres la stack actuelle)

```text
443   -> nginx (entrée unique HTTPS)
8025  -> mailhog (UI SMTP dev, bind localhost)
8202  -> vault (bind localhost)

non publiés vers l'hôte (interne Docker):
  db:5432, redis:6379, backend:8000, frontend:5173,
  prometheus:9090, grafana:3000, elasticsearch:9200, kibana:5601, logstash:5044/9600
```

---

## 6) Lecture rapide (chaînes critiques)

```text
Web:       Browser -> nginx -> (frontend + backend) -> Browser
Data:      backend <-> db, backend <-> redis, worker <-> (redis + db)
Logs:      app/nginx logs -> logstash -> elasticsearch -> kibana
Metrics:   exporters -> prometheus -> grafana
Secrets:   vault-init -> vault -> services consommateurs
```

