#!/bin/bash

echo "[Logstash] Fetching secrets from Vault..."

MAX_RETRIES=10
RETRY_COUNT=0
ELASTIC_PW=""

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    ELASTIC_PW=$(curl -s -k --header "X-Vault-Token: ${VAULT_TOKEN}" \
        ${VAULT_ADDR}/v1/secret/data/database \
        | jq -r '.data.data.elastic_pass // empty')

    if [ -n "$ELASTIC_PW" ] && [ "$ELASTIC_PW" != "null" ]; then
        echo "[Logstash] Password successfully retrieved from Vault!"
        break
    fi

    echo "[Logstash] Vault not ready... Retrying ($((RETRY_COUNT+1))/$MAX_RETRIES)"
    sleep 3
    RETRY_COUNT=$((RETRY_COUNT+1))
done

if [ -z "$ELASTIC_PW" ] || [ "$ELASTIC_PW" = "null" ]; then
    echo "[Logstash] Failed to retrieve password. Using safe default."
    export ELASTIC_PASSWORD="VaultConnectionFailed"
else
    export ELASTIC_PASSWORD=$ELASTIC_PW
fi

echo "[Logstash] Passing control to the official entrypoint..."
exec /usr/local/bin/docker-entrypoint "$@"