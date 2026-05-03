# Transcendence — Makefile
# Désactiver les couleurs : NO_COLOR=1 make help

NAME        := transcendence
# Répertoire du dépôt (Makefile à la racine) : `make` fonctionne même lancé depuis un sous-dossier.
_REPO_MAKEFILE := $(abspath $(lastword $(MAKEFILE_LIST)))
REPO_ROOT      := $(dir $(_REPO_MAKEFILE))
COMPOSE_DIR    := $(REPO_ROOT)transcendence
COMPOSE        := cd $(COMPOSE_DIR) && docker compose
INTERFACE_DIR  := $(COMPOSE_DIR)/frontend/interface

# E2E test controls
E2E_BASE_URL ?= https://localhost
PROJECT ?= chromium
WORKERS ?=
FILE ?=
GREP ?=
SUITE ?=

# Logs affichés par « make up » / « make logs » (hors ELK / monitoring / vault)
LOGS_CORE := frontend backend nginx db redis worker

CERT_NGINX_DIR   := $(COMPOSE_DIR)/nginx/certs
CERT_ELASTIC_DIR := $(COMPOSE_DIR)/elasticsearch/certs
CERT_BACKEND_DIR := $(COMPOSE_DIR)/backend/certs
CERT_KIBANA_DIR  := $(COMPOSE_DIR)/monitoring/kibana/certs
CERT_GRAFANA_DIR := $(COMPOSE_DIR)/monitoring/grafana/certs
CERT_FRONTEND_DIR := $(COMPOSE_DIR)/frontend/certs
CERT_PROMETHEUS_DIR := $(COMPOSE_DIR)/monitoring/prometheus/certs

CERT_NGINX_FILE  := $(CERT_NGINX_DIR)/nginx.crt
KEY_NGINX_FILE   := $(CERT_NGINX_DIR)/nginx.key
CERT_ELASTIC_FILE := $(CERT_ELASTIC_DIR)/elasticsearch.crt
KEY_ELASTIC_FILE  := $(CERT_ELASTIC_DIR)/elasticsearch.key
CERT_BACKEND_FILE := $(CERT_BACKEND_DIR)/backend.crt
KEY_BACKEND_FILE  := $(CERT_BACKEND_DIR)/backend.key
CERT_KIBANA_FILE  := $(CERT_KIBANA_DIR)/kibana.crt
KEY_KIBANA_FILE   := $(CERT_KIBANA_DIR)/kibana.key
CERT_GRAFANA_FILE := $(CERT_GRAFANA_DIR)/grafana.crt
KEY_GRAFANA_FILE  := $(CERT_GRAFANA_DIR)/grafana.key
CERT_FRONTEND_FILE := $(CERT_FRONTEND_DIR)/frontend.crt
KEY_FRONTEND_FILE  := $(CERT_FRONTEND_DIR)/frontend.key
CERT_PROMETHEUS_FILE := $(CERT_PROMETHEUS_DIR)/prometheus.crt
KEY_PROMETHEUS_FILE  := $(CERT_PROMETHEUS_DIR)/prometheus.key

# Couleurs (NO_COLOR=1 pour tout désactiver)
ifeq ($(strip $(NO_COLOR)),)
  C_RESET   := \033[0m
  C_BOLD    := \033[1m
  C_DIM     := \033[2m
  C_CYAN    := \033[36m
  C_GREEN   := \033[32m
  C_YELLOW  := \033[33m
  C_RED     := \033[31m
  C_MAGENTA := \033[35m
else
  C_RESET :=
  C_BOLD :=
  C_DIM :=
  C_CYAN :=
  C_GREEN :=
  C_YELLOW :=
  C_RED :=
  C_MAGENTA :=
endif

.DEFAULT_GOAL := all

# Profil = nom du fichier dans env/profiles/<profil>.env (ex: local, lan).
# « localhost » est un alias de « local » pour compatibilité.
PROFILE ?= local
ENV_PROFILES_DIR := $(COMPOSE_DIR)/env/profiles
ENV_TARGET := $(COMPOSE_DIR)/.env
PROFILE_FILE := $(PROFILE)
ifeq ($(strip $(PROFILE)),localhost)
  PROFILE_FILE := local
endif
ENV_SOURCE := $(ENV_PROFILES_DIR)/$(PROFILE_FILE).env

.PHONY: help mock-help all certs build build-nc up up-attach up-bg down stop restart reup logs logs-all ps ps-a clean fclean reset-db-safe re env-list env-use env-reload seed-e2e-users test-e2e-list test-e2e test-e2e-headed test-e2e-file test-e2e-grep test-e2e-suite

# ---------------------------------------------------------------------------
help: ## Afficher cette aide (cible par défaut)
	@printf '%b\n' ""
	@printf '%b\n' "$(C_BOLD)$(C_CYAN)$(NAME)$(C_RESET) $(C_DIM)— Docker Compose$(C_RESET)"
	@printf '%b\n' "$(C_DIM)Répertoire compose : $(COMPOSE_DIR)/$(C_RESET)"
	@printf '%b\n' ""
	@printf '%b\n' "$(C_BOLD)Usage :$(C_RESET) $(C_GREEN)make$(C_RESET) $(C_YELLOW)<cible>$(C_RESET)"
	@printf '%b\n' "$(C_DIM)        NO_COLOR=1 make help   → sans couleurs$(C_RESET)"
	@printf '%b\n' ""
	@printf '%b\n' "$(C_BOLD)Cibles :$(C_RESET)"
	@grep -hE '^[a-zA-Z0-9_.-]+:.*?##' $(MAKEFILE_LIST) \
		| sort \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  $(C_GREEN)%-16s$(C_RESET) %s\n", $$1, $$2}'
	@printf '%b\n' ""

mock-help: ## Vite : rappel .env.local pour user fictif + choixpeau (voir interface/.env.example)
	@printf '%b\n' "$(C_BOLD)Mock utilisateur (npm run dev)$(C_RESET)"
	@printf '%b\n' "$(C_DIM)Créer$(C_RESET) $(C_YELLOW)$(COMPOSE_DIR)/frontend/interface/.env.local$(C_RESET) $(C_DIM)avec par ex. :$(C_RESET)"
	@printf '%b\n' ""
	@printf '%b\n' "  $(C_GREEN)VITE_DEV_MOCK_USER=true$(C_RESET)"
	@printf '%b\n' "  $(C_GREEN)VITE_MOCK_COALITION=eau$(C_RESET)          $(C_DIM)# feu | eau | terre | air$(C_RESET)"
	@printf '%b\n' "  $(C_GREEN)VITE_MOCK_AUTH_PROVIDER=local$(C_RESET)   $(C_DIM)# pour tester le choixpeau$(C_RESET)"
	@printf '%b\n' "  $(C_GREEN)VITE_MOCK_RESET_SORTING_HAT=true$(C_RESET) $(C_DIM)# efface le flag choixpeau à chaque reload$(C_RESET)"
	@printf '%b\n' "  $(C_DIM)# optionnel : VITE_MOCK_USER_ID=42$(C_RESET)"
	@printf '%b\n' ""
	@printf '%b\n' "$(C_DIM)Compte réel : choixpeau si auth_provider=local (API), coalition vide, et pas de clé localStorage transcendance_sorting_hat_v1_<id>.$(C_RESET)"
	@printf '%b\n' ""

all: certs build up-bg migrations ## Certificats + build + démarrage en arrière-plan

certs: ## Générer les certificats TLS pour tous les services si absents
	@printf '%b\n' "$(C_CYAN)▶$(C_RESET) Certificats TLS…"
	@mkdir -p $(CERT_NGINX_DIR) $(CERT_ELASTIC_DIR) $(CERT_BACKEND_DIR) $(CERT_KIBANA_DIR) $(CERT_GRAFANA_DIR) $(CERT_FRONTEND_DIR) $(CERT_PROMETHEUS_DIR)
	@if [ ! -f $(CERT_NGINX_FILE) ]; then \
		printf '%b\n' "$(C_YELLOW)  → création nginx (localhost)$(C_RESET)"; \
		openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
			-keyout $(KEY_NGINX_FILE) -out $(CERT_NGINX_FILE) \
			-subj "/C=FR/ST=Paris/L=Paris/O=42/CN=localhost"; \
	else \
		printf '%b\n' "$(C_DIM)  nginx : déjà présent$(C_RESET)"; \
	fi
	@if [ ! -f $(CERT_ELASTIC_FILE) ]; then \
		printf '%b\n' "$(C_YELLOW)  → création elasticsearch$(C_RESET)"; \
		openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
			-keyout $(KEY_ELASTIC_FILE) -out $(CERT_ELASTIC_FILE) \
			-subj "/C=FR/ST=Paris/L=Paris/O=42/CN=elasticsearch"; \
	else \
		printf '%b\n' "$(C_DIM)  elasticsearch : déjà présent$(C_RESET)"; \
	fi
	@if [ ! -f $(CERT_BACKEND_FILE) ]; then \
		printf '%b\n' "$(C_YELLOW)  → création backend$(C_RESET)"; \
		openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
			-keyout $(KEY_BACKEND_FILE) -out $(CERT_BACKEND_FILE) \
			-subj "/C=FR/ST=Paris/L=Paris/O=42/CN=backend"; \
	else \
		printf '%b\n' "$(C_DIM)  backend : déjà présent$(C_RESET)"; \
	fi
	@if [ ! -f $(CERT_KIBANA_FILE) ]; then \
		printf '%b\n' "$(C_YELLOW)  → création kibana$(C_RESET)"; \
		openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
			-keyout $(KEY_KIBANA_FILE) -out $(CERT_KIBANA_FILE) \
			-subj "/C=FR/ST=Paris/L=Paris/O=42/CN=kibana"; \
	else \
		printf '%b\n' "$(C_DIM)  kibana : déjà présent$(C_RESET)"; \
	fi
	@if [ ! -f $(CERT_GRAFANA_FILE) ]; then \
		printf '%b\n' "$(C_YELLOW)  → création grafana$(C_RESET)"; \
		openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
			-keyout $(KEY_GRAFANA_FILE) -out $(CERT_GRAFANA_FILE) \
			-subj "/C=FR/ST=Paris/L=Paris/O=42/CN=grafana"; \
	else \
		printf '%b\n' "$(C_DIM)  grafana : déjà présent$(C_RESET)"; \
	fi
	@if [ ! -f $(CERT_FRONTEND_FILE) ]; then \
		printf '%b\n' "$(C_YELLOW)  → création frontend$(C_RESET)"; \
		openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
			-keyout $(KEY_FRONTEND_FILE) -out $(CERT_FRONTEND_FILE) \
			-subj "/C=FR/ST=Paris/L=Paris/O=42/CN=frontend"; \
	else \
		printf '%b\n' "$(C_DIM)  frontend : déjà présent$(C_RESET)"; \
	fi
	@if [ ! -f $(CERT_PROMETHEUS_FILE) ]; then \
		printf '%b\n' "$(C_YELLOW)  → création prometheus$(C_RESET)"; \
		openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
			-keyout $(KEY_PROMETHEUS_FILE) -out $(CERT_PROMETHEUS_FILE) \
			-subj "/C=FR/ST=Paris/L=Paris/O=42/CN=prometheus"; \
	else \
		printf '%b\n' "$(C_DIM)  prometheus : déjà présent$(C_RESET)"; \
	fi
	# Les clés sont bind-mountées dans des conteneurs avec des UID différents en CI.
	# On force des droits lisibles pour éviter des erreurs de lecture TLS au démarrage.
	@chmod 644 $(CERT_NGINX_FILE) $(KEY_NGINX_FILE) $(CERT_ELASTIC_FILE) $(KEY_ELASTIC_FILE) \
		$(CERT_BACKEND_FILE) $(KEY_BACKEND_FILE) $(CERT_KIBANA_FILE) $(KEY_KIBANA_FILE) \
		$(CERT_GRAFANA_FILE) $(KEY_GRAFANA_FILE) $(CERT_FRONTEND_FILE) $(KEY_FRONTEND_FILE) \
		$(CERT_PROMETHEUS_FILE) $(KEY_PROMETHEUS_FILE) 2>/dev/null || true
	@printf '%b\n' "$(C_GREEN)✓$(C_RESET) Certificats OK."

build: ## docker compose build
	@printf '%b\n' "$(C_CYAN)▶$(C_RESET) Build des images…"
	@$(COMPOSE) build
	@printf '%b\n' "$(C_GREEN)✓$(C_RESET) Build terminé."

build-nc: ## docker compose build --no-cache
	@printf '%b\n' "$(C_CYAN)▶$(C_RESET) Build sans cache…"
	@$(COMPOSE) build --no-cache
	@printf '%b\n' "$(C_GREEN)✓$(C_RESET) Build terminé."

up: certs ## Démarrer en arrière-plan + suivre les logs « app » (Ctrl+C = arrêter le suivi seulement)
	@printf '%b\n' "$(C_CYAN)▶$(C_RESET) Démarrage de la stack…"
	@$(COMPOSE) up -d
	@printf '%b\n' "$(C_GREEN)✓$(C_RESET) Conteneurs lancés."
	@printf '%b\n' "$(C_DIM)Suivi des logs : $(LOGS_CORE)$(C_RESET)"
	@printf '%b\n' "$(C_DIM)$(C_YELLOW)Ctrl+C$(C_RESET)$(C_DIM) coupe le suivi des logs, pas les conteneurs.$(C_RESET) $(C_DIM)make down$(C_RESET)$(C_DIM) pour tout arrêter.$(C_RESET)"
	@printf '%b\n' "$(C_DIM)Tout le bruit (ELK, prom, vault…) : $(C_GREEN)make logs-all$(C_RESET)$(C_DIM) ou $(C_GREEN)make up-attach$(C_RESET).$(C_RESET)"
	@printf '%b\n' ""
	@$(COMPOSE) logs -f --tail=80 $(LOGS_CORE)

up-attach: certs ## Tous les services au premier plan (très verbeux — debug seulement)
	@printf '%b\n' "$(C_YELLOW)▶$(C_RESET) docker compose up sans -d (tous les flux mélangés)…"
	@$(COMPOSE) up

up-bg: certs ## Démarrer en arrière-plan sans ouvrir les logs
	@printf '%b\n' "$(C_CYAN)▶$(C_RESET) Démarrage en arrière-plan…"
	@$(COMPOSE) up -d
	@printf '%b\n' "$(C_GREEN)✓$(C_RESET) Stack lancée. $(C_DIM)make logs$(C_RESET) pour suivre les logs « app »."

down: ## Arrêter les conteneurs (docker compose down)
	@printf '%b\n' "$(C_CYAN)▶$(C_RESET) Arrêt des conteneurs…"
	@$(COMPOSE) down
	@printf '%b\n' "$(C_GREEN)✓$(C_RESET) Arrêt OK."

stop: down

restart: ## Redémarrer tout, ou un service : make restart SERVICE=nginx  |  make restart-nginx
	@if [ -n "$(SERVICE)" ]; then \
		printf '%b\n' "$(C_CYAN)▶$(C_RESET) Redémarrage du service « $(SERVICE) »…"; \
		$(COMPOSE) restart $(SERVICE); \
	else \
		printf '%b\n' "$(C_CYAN)▶$(C_RESET) Redémarrage de tous les services…"; \
		$(COMPOSE) restart; \
	fi
	@printf '%b\n' "$(C_GREEN)✓$(C_RESET) OK."

restart-%: ## Redémarrer un seul service (ex: make restart-nginx, make restart-db)
	@printf '%b\n' "$(C_CYAN)▶$(C_RESET) Redémarrage du service « $(subst restart-,,$@) »…"
	@$(COMPOSE) restart $(subst restart-,,$@)
	@printf '%b\n' "$(C_GREEN)✓$(C_RESET) OK."

reup: down up-bg ## down puis up en arrière-plan (recrée le réseau ; ancien comportement de « restart »)

logs: ## Suivre les logs « app » (frontend, backend, nginx, db, redis, worker)
	@$(COMPOSE) logs -f --tail=100 $(LOGS_CORE)

logs-all: ## Suivre tous les services (ELK, monitoring, etc. — très verbeux)
	@$(COMPOSE) logs -f --tail=100

ps: ## docker compose ps
	@$(COMPOSE) ps

ps-a: ## docker compose ps -a
	@$(COMPOSE) ps -a

clean: ## down + --remove-orphans
	@printf '%b\n' "$(C_CYAN)▶$(C_RESET) Nettoyage léger…"
	@$(COMPOSE) down --remove-orphans
	@printf '%b\n' "$(C_GREEN)✓$(C_RESET) OK."

fclean: clean ## Supprimer volumes, images du projet, et dossiers certs
	@printf '%b\n' "$(C_RED)▶$(C_RESET) Nettoyage profond (images + volumes + certs)…"
	@$(COMPOSE) down --rmi all --volumes 2>/dev/null || true
	@rm -rf $(CERT_NGINX_DIR) $(CERT_ELASTIC_DIR) $(CERT_BACKEND_DIR) $(CERT_KIBANA_DIR) $(CERT_GRAFANA_DIR)
	@printf '%b\n' "$(C_GREEN)✓$(C_RESET) fclean terminé."

reset-db-safe: ## Réinitialiser uniquement Postgres (purge bind-mount) puis relancer + migrations
	@printf '%b\n' "$(C_RED)▶$(C_RESET) Réinitialisation DB PostgreSQL (données supprimées)…"
	@$(COMPOSE) down
	@docker run --rm -v "$(COMPOSE_DIR)/database/data:/data" alpine:3.20 sh -c 'rm -rf /data/*'
	@$(COMPOSE) up -d
	@$(MAKE) -f "$(REPO_ROOT)Makefile" migrations
	@printf '%b\n' "$(C_GREEN)✓$(C_RESET) Base PostgreSQL réinitialisée et migrations appliquées."

re: fclean all ## fclean puis all (repartir de zéro)

migrations: ## Migrations Django (toutes les apps par défaut, ou APP=<nom>)
	@printf '%b\n' "$(C_CYAN)▶$(C_RESET) Migrations Django…"
	@printf '%b\n' "$(C_DIM)  Attente PostgreSQL (prêt à accepter les connexions)…$(C_RESET)"
	@i=0; \
	until $(COMPOSE) exec -T db sh -c 'pg_isready -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"' 2>/dev/null; do \
		i=$$((i+1)); \
		if [ $$i -gt 120 ]; then \
			printf '%b\n' "$(C_RED)✗$(C_RESET) Timeout : la base ne répond pas. Vérifie $(C_DIM)docker compose ps$(C_RESET) et $(C_DIM)docker compose logs db$(C_RESET)."; \
			exit 1; \
		fi; \
		sleep 1; \
	done
	@if [ -n "$(APP)" ]; then \
		printf '%b\n' "$(C_DIM)  App ciblée : $(APP)$(C_RESET)"; \
		$(COMPOSE) exec -T backend python manage.py makemigrations "$(APP)"; \
		$(COMPOSE) exec -T backend python manage.py migrate "$(APP)"; \
	else \
		printf '%b\n' "$(C_DIM)  Toutes les apps installées$(C_RESET)"; \
		$(COMPOSE) exec -T backend python manage.py makemigrations; \
		$(COMPOSE) exec -T backend python manage.py migrate; \
	fi
	@printf '%b\n' "$(C_GREEN)✓$(C_RESET) Migrations terminées."

env-list: ## Lister les profils d'environnement disponibles
	@printf '%b\n' "$(C_BOLD)Profils .env disponibles :$(C_RESET)"
	@ls -1 $(ENV_PROFILES_DIR)/*.env 2>/dev/null | sed 's#^.*/##; s#\.env$$##' | sed 's/^/  - /'

env-use: ## Appliquer un profil .env (PROFILE=lan : IP auto en0/en1 ou surcharger LAN_IP=…)
	@if [ ! -f "$(ENV_SOURCE)" ]; then \
		printf '%b\n' "$(C_RED)✗$(C_RESET) Profil introuvable: $(ENV_SOURCE)"; \
		printf '%b\n' "$(C_DIM)Profils disponibles: make env-list$(C_RESET)"; \
		exit 1; \
	fi; \
	_ip=""; \
	if [ "$(PROFILE_FILE)" = "lan" ]; then \
		_ip="$${LAN_IP:-}"; \
		if [ -z "$$_ip" ]; then \
			case "$$(uname -s)" in \
				Darwin) \
					_ip=$$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true);; \
				Linux) \
					_ip=$$(hostname -I 2>/dev/null | awk '{print $$1}'); \
					if [ -z "$$_ip" ]; then \
						_ip=$$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if ($$i=="src") {print $$(i+1); exit}}'); \
					fi;; \
			esac; \
		fi; \
		if [ -z "$$_ip" ]; then \
			printf '%b\n' "$(C_RED)✗$(C_RESET) Impossible de détecter l’IP LAN."; \
			printf '%b\n' "$(C_DIM)  Indiquez-la : $(C_GREEN)LAN_IP=192.168.x.x make env-use PROFILE=lan$(C_RESET)"; \
			printf '%b\n' "$(C_DIM)  Tu peux forcer l’IP : $(C_GREEN)LAN_IP=<résultat-de-iplocal> make env-use PROFILE=lan$(C_RESET)"; \
			exit 1; \
		fi; \
	fi; \
	cp "$(ENV_SOURCE)" "$(ENV_TARGET)"; \
	if [ "$(PROFILE_FILE)" = "lan" ]; then \
		_tmp="$$(mktemp)"; \
		sed "s/@LAN_HOST@/$$_ip/g" "$(ENV_TARGET)" > "$$_tmp" && mv "$$_tmp" "$(ENV_TARGET)"; \
		printf '%b\n' "$(C_DIM)  IP LAN utilisée : $$_ip$(C_RESET)"; \
	fi; \
	printf '%b\n' "$(C_GREEN)✓$(C_RESET) Profil appliqué: $(PROFILE) -> $(ENV_TARGET)"; \
	printf '%b\n' "$(C_DIM)Recharger les variables d'environnement: make env-reload$(C_RESET)"; \
	$(MAKE) env-reload

env-reload: ## Recréer la stack pour recharger toutes les variables d'environnement
	@printf '%b\n' "$(C_CYAN)▶$(C_RESET) Recréation des services (reload des variables d'environnement)…"
	@$(COMPOSE) up -d --force-recreate
	@printf '%b\n' "$(C_GREEN)✓$(C_RESET) Variables d'environnement rechargées sur la stack."

seed-e2e-users: ## Créer ou rafraîchir les comptes E2E en base
	@printf '%b\n' "$(C_CYAN)▶$(C_RESET) Seeding des comptes E2E…"
	@$(COMPOSE) exec -T backend python manage.py seed_e2e_users
	@printf '%b\n' "$(C_GREEN)✓$(C_RESET) Comptes E2E prêts."

check-db-integrity: ## Vérifier l'intégrité de l'index Elasticsearch (games/moves) et réparer si besoin
	@printf '%b\n' "$(C_CYAN)▶$(C_RESET) Vérification de l'intégrité Elasticsearch (Postgres -> ES)…"
	@$(COMPOSE) exec -T backend python manage.py check_db_integrity --cleanup
	@printf '%b\n' "$(C_GREEN)✓$(C_RESET) Vérification terminée."

test-e2e-list: ## Lister les tests E2E Playwright détectés
	@printf '%b\n' "$(C_CYAN)▶$(C_RESET) Découverte des tests E2E…"
	@cd $(INTERFACE_DIR) && E2E_BASE_URL="$(E2E_BASE_URL)" npm run test:e2e:list

test-e2e: ## Lancer toute la suite E2E (vars: PROJECT, WORKERS, E2E_BASE_URL)
	@printf '%b\n' "$(C_CYAN)▶$(C_RESET) Exécution E2E (project=$(PROJECT), base_url=$(E2E_BASE_URL))…"
	@cd $(INTERFACE_DIR) && E2E_BASE_URL="$(E2E_BASE_URL)" npx playwright test --project "$(PROJECT)" $(if $(WORKERS),--workers $(WORKERS),)

test-e2e-headed: ## Lancer la suite E2E en mode headed (vars: PROJECT, E2E_BASE_URL)
	@printf '%b\n' "$(C_CYAN)▶$(C_RESET) Exécution E2E headed (project=$(PROJECT), base_url=$(E2E_BASE_URL))…"
	@cd $(INTERFACE_DIR) && E2E_BASE_URL="$(E2E_BASE_URL)" npx playwright test --headed --project "$(PROJECT)"

test-e2e-file: ## Lancer un fichier de test E2E (usage: make test-e2e-file FILE=tests/e2e/auth-flow.spec.js)
	@if [ -z "$(FILE)" ]; then \
		printf '%b\n' "$(C_RED)✗$(C_RESET) FILE est requis. Ex: make test-e2e-file FILE=tests/e2e/auth-flow.spec.js"; \
		exit 1; \
	fi
	@printf '%b\n' "$(C_CYAN)▶$(C_RESET) Exécution E2E ciblée fichier=$(FILE) (project=$(PROJECT))…"
	@cd $(INTERFACE_DIR) && E2E_BASE_URL="$(E2E_BASE_URL)" npx playwright test "$(FILE)" --project "$(PROJECT)" $(if $(WORKERS),--workers $(WORKERS),)

test-e2e-grep: ## Lancer des tests E2E filtrés par nom (usage: make test-e2e-grep GREP="auth flow")
	@if [ -z "$(GREP)" ]; then \
		printf '%b\n' "$(C_RED)✗$(C_RESET) GREP est requis. Ex: make test-e2e-grep GREP=\"auth flow\""; \
		exit 1; \
	fi
	@printf '%b\n' "$(C_CYAN)▶$(C_RESET) Exécution E2E filtrée grep='$(GREP)' (project=$(PROJECT))…"
	@cd $(INTERFACE_DIR) && E2E_BASE_URL="$(E2E_BASE_URL)" npx playwright test --grep "$(GREP)" --project "$(PROJECT)" $(if $(WORKERS),--workers $(WORKERS),)

test-e2e-suite: ## Lancer une suite par dossier (usage: make test-e2e-suite SUITE=smoke)
	@if [ -z "$(SUITE)" ]; then \
		printf '%b\n' "$(C_RED)✗$(C_RESET) SUITE est requis. Ex: make test-e2e-suite SUITE=smoke"; \
		exit 1; \
	fi
	@printf '%b\n' "$(C_CYAN)▶$(C_RESET) Exécution E2E suite=$(SUITE) (project=$(PROJECT))…"
	@cd $(INTERFACE_DIR) && E2E_BASE_URL="$(E2E_BASE_URL)" npx playwright test "tests/e2e/$(SUITE)" --project "$(PROJECT)" $(if $(WORKERS),--workers $(WORKERS),)