#!/bin/bash

echo "[Elasticsearch] Fetching secrets from Vault..."

MAX_RETRIES=20
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    VAULT_RESPONSE=$(curl -s -k --header "X-Vault-Token: ${VAULT_TOKEN}" ${VAULT_ADDR}/v1/secret/data/database)
    
    ELASTIC_PW=$(echo "$VAULT_RESPONSE" | jq -r '.data.data.elastic_pass // empty')
    KIBANA_PW=$(echo "$VAULT_RESPONSE" | jq -r '.data.data.kibana_pass // empty')

    if [ -n "$ELASTIC_PW" ] && [ -n "$KIBANA_PW" ]; then
        echo "[Elasticsearch] Passwords successfully retrieved from Vault!"
        export ELASTIC_PASSWORD=$ELASTIC_PW
        export KIBANA_PASSWORD=$KIBANA_PW
        break
    fi

    echo "[Elasticsearch] Vault not ready... Retrying ($((RETRY_COUNT+1))/$MAX_RETRIES)"
    sleep 3
    RETRY_COUNT=$((RETRY_COUNT+1))
done

if [ -z "$ELASTIC_PASSWORD" ]; then
    echo "[Elasticsearch] Failed to retrieve passwords. Using Fail-Secure defaults."
    export ELASTIC_PASSWORD="VaultConnectionFailed"
    export KIBANA_PASSWORD="VaultConnectionFailed"
fi

set -e

echo "[Elasticsearch] Starting Elasticsearch in the background..."
/usr/local/bin/docker-entrypoint.sh elasticsearch &

echo "Waiting for Elasticsearch API to be ready..."
until curl -s -k -u "elastic:${ELASTIC_PASSWORD}" https://localhost:9200 > /dev/null; do
    echo "Elasticsearch is still starting up..."
    sleep 5
done

RESPONSE=$(curl -s -k -o /dev/null -w "%{http_code}" -u "kibana_system:${KIBANA_PASSWORD}" https://localhost:9200/_security/_authenticate)

if [ "$RESPONSE" != "200" ]; then
    echo "🔧 Initializing kibana_system password..."
    curl -s -k -u "elastic:${ELASTIC_PASSWORD}" \
        -X POST "https://localhost:9200/_security/user/kibana_system/_password" \
        -H "Content-Type: application/json" \
        -d "{\"password\":\"${KIBANA_PASSWORD}\"}"
    echo "Password successfully initialized."
else
    echo "kibana_system user is already authenticated. Skipping initialization."
fi

echo "⚙️  Configuring ILM (Index Lifecycle Management) Policy (7 days retention)..."
# Update the existing transcendence_logs_policy
curl -s -k -u "elastic:${ELASTIC_PASSWORD}" \
    -X PUT "https://localhost:9200/_ilm/policy/transcendence_logs_policy" \
    -H "Content-Type: application/json" \
    -d '{
          "policy": {
            "phases": {
              "hot": {
                "min_age": "0ms",
                "actions": {
                  "rollover": {
                    "max_age": "7d",
                    "max_primary_shard_size": "500mb"
                  }
                }
              },
              "delete": {
                "min_age": "7d",
                "actions": {
                  "delete": {}
                }
              }
            }
          }
        }' > /dev/null
echo "ILM Policy 'transcendence_logs_policy' updated to 7 days retention."

wait