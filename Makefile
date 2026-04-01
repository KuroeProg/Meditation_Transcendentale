# Transcendence — Makefile
# Désactiver les couleurs : NO_COLOR=1 make help

NAME        := transcendence
COMPOSE_DIR := transcendence
COMPOSE     := cd $(COMPOSE_DIR) && docker compose

# Logs affichés par « make up » / « make logs » (hors ELK / monitoring / vault)
LOGS_CORE := frontend backend nginx db redis worker

CERT_NGINX_DIR   := ./transcendence/nginx/certs
CERT_ELASTIC_DIR := ./transcendence/elasticsearch/certs
CERT_NGINX_FILE  := $(CERT_NGINX_DIR)/nginx.crt
KEY_NGINX_FILE   := $(CERT_NGINX_DIR)/nginx.key
CERT_ELASTIC_FILE := $(CERT_ELASTIC_DIR)/elasticsearch.crt
KEY_ELASTIC_FILE  := $(CERT_ELASTIC_DIR)/elasticsearch.key

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

.DEFAULT_GOAL := help

.PHONY: help all certs build build-nc up up-attach up-bg down stop restart reup logs logs-all ps ps-a clean fclean re

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

all: certs build up-bg migrations ## Certificats + build + démarrage en arrière-plan

certs: ## Générer les certificats TLS nginx / elasticsearch si absents
	@printf '%b\n' "$(C_CYAN)▶$(C_RESET) Certificats TLS…"
	@mkdir -p $(CERT_NGINX_DIR) $(CERT_ELASTIC_DIR)
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
	@chmod 644 $(CERT_NGINX_FILE) $(CERT_ELASTIC_FILE) 2>/dev/null || true
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
	@rm -rf $(CERT_NGINX_DIR) $(CERT_ELASTIC_DIR)
	@printf '%b\n' "$(C_GREEN)✓$(C_RESET) fclean terminé."

re: fclean all ## fclean puis all (repartir de zéro)

migrations: ## Lancer les migrations Django (makemigrations + migrate)
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
	@$(COMPOSE) exec -T backend python manage.py makemigrations
	@$(COMPOSE) exec -T backend python manage.py migrate
	@printf '%b\n' "$(C_GREEN)✓$(C_RESET) Migrations terminées."
