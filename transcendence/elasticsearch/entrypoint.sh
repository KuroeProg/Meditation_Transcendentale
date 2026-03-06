#!/bin/bash
set -e

CERT_DIR="/usr/share/elasticsearch/config/certs"
CA_FILE="$CERT_DIR/elastic-stack-ca.p12"
CERT_FILE="$CERT_DIR/instance.p12"

# 1. Certificates Logic
if [ ! -f "$CA_FILE" ]; then
    bin/elasticsearch-certutil ca --out "$CA_FILE" --pass "" --silent
fi

if [ ! -f "$CERT_FILE" ]; then
    bin/elasticsearch-certutil cert \
      --ca "$CA_FILE" --ca-pass "" \
      --dns elasticsearch,localhost --ip 127.0.0.1,172.19.0.3 \
      --out "$CERT_FILE" --pass "" --silent
fi

chmod 644 "$CERT_DIR"/*.p12

exec bin/elasticsearch