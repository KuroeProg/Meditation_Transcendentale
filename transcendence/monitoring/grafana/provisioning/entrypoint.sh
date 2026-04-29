#!/bin/sh

echo "🔍 [Grafana] Fetching secrets from Vault..."

MAX_RETRIES=10
RETRY_COUNT=0
GRAFANA_PW=""

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    GRAFANA_PW=$(curl -s -k --header "X-Vault-Token: ${VAULT_TOKEN}" \
        ${VAULT_ADDR}/v1/secret/data/database \
        | jq -r '.data.data.grafana_pass')

    if [ -n "$GRAFANA_PW" ] && [ "$GRAFANA_PW" != "null" ]; then
        echo "[Grafana] Password successfully retrieved from Vault!"
        break
    fi

    echo "⏳ [Grafana] Vault not ready or secret missing. Retrying in 3 seconds... ($((RETRY_COUNT+1))/$MAX_RETRIES)"
    sleep 3
    RETRY_COUNT=$((RETRY_COUNT+1))
done

if [ -z "$GRAFANA_PW" ] || [ "$GRAFANA_PW" = "null" ]; then
    echo "[Grafana] Failed to retrieve password. Using safe default."
    export GF_SECURITY_ADMIN_PASSWORD="VaultConnectionFailed_AccessDenied"
else
    export GF_SECURITY_ADMIN_PASSWORD=$GRAFANA_PW
fi

echo "🚀 [Grafana] Starting Grafana server..."
exec /run.sh "$@"