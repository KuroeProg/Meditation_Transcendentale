NAME = transcendence

CERT_DIR = ./transcendence/nginx/certs
CERT_FILE = $(CERT_DIR)/transcendence.crt
KEY_FILE = $(CERT_DIR)/transcendence.key

all: certs build up

certs:
	@mkdir -p $(CERT_DIR)
	@if [ ! -f $(CERT_FILE) ] || [ ! -f $(KEY_FILE) ]; then \
		openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
			-keyout $(KEY_FILE) \
			-out $(CERT_FILE) \
			-subj "/C=FR/ST=Paris/L=Paris/O=42/CN=localhost"; \
	fi

build:
	cd transcendence && docker compose build

up:
	cd transcendence && docker compose up

down:
	cd transcendence && docker compose down

re: clean all

clean:
	cd transcendence && docker compose down --remove-orphans

fclean: clean
	cd transcendence && docker compose down --rmi all --volumes
	rm -rf $(CERT_DIR)

.PHONY: all certs build up down clean fclean re