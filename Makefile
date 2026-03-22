NAME = transcendence

CERT_NGINX_DIR = ./transcendence/nginx/certs
CERT_ELASTIC_DIR = ./transcendence/elasticsearch/certs

CERT_NGINX_FILE = $(CERT_NGINX_DIR)/nginx.crt
KEY_NGINX_FILE = $(CERT_NGINX_DIR)/nginx.key

CERT_ELASTIC_FILE = $(CERT_ELASTIC_DIR)/elasticsearch.crt
KEY_ELASTIC_FILE = $(CERT_ELASTIC_DIR)/elasticsearch.key

all: certs build up

certs:
	@mkdir -p $(CERT_NGINX_DIR) $(CERT_ELASTIC_DIR)
	@if [ ! -f $(CERT_NGINX_FILE) ]; then \
		openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
			-keyout $(KEY_NGINX_FILE) -out $(CERT_NGINX_FILE) \
			-subj "/C=FR/ST=Paris/L=Paris/O=42/CN=localhost"; \
	fi
	@if [ ! -f $(CERT_ELASTIC_FILE) ]; then \
		openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
			-keyout $(KEY_ELASTIC_FILE) -out $(CERT_ELASTIC_FILE) \
			-subj "/C=FR/ST=Paris/L=Paris/O=42/CN=elasticsearch"; \
	fi
	@# Granting read permissions so the container user (1000) can access them
	@chmod 644 $(CERT_NGINX_FILE) $(CERT_ELASTIC_FILE)

build:
	cd transcendence && docker compose build

up:
	cd transcendence && docker compose up

down:
	cd transcendence && docker compose down

re: fclean all

clean:
	cd transcendence && docker compose down --remove-orphans

fclean: clean
	cd transcendence && docker compose down --rmi all --volumes
	rm -rf $(CERT_NGINX_DIR) $(CERT_ELASTIC_DIR)

.PHONY: all certs build up down clean fclean re