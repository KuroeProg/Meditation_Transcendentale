#!/bin/bash
set -e

# 1. Start Elasticsearch in the background
# We use the official entrypoint to ensure all environment variables are loaded
/usr/local/bin/docker-entrypoint.sh elasticsearch &

# 2. Wait for the Elasticsearch API to become responsive
echo "Waiting for Elasticsearch API to be ready..."
until curl -s -k -u "elastic:${ELASTIC_PASSWORD}" https://localhost:9200 > /dev/null; do
    echo "Elasticsearch is still starting up..."
    sleep 5
done

# 3. Check if the kibana_system password is already working
# This makes the script "idempotent" (it won't fail if run twice)
RESPONSE=$(curl -s -k -o /dev/null -w "%{http_code}" -u "kibana_system:${KIBANA_PASSWORD}" https://localhost:9200/_security/_authenticate)

if [ "$RESPONSE" != "200" ]; then
    echo "Initializing kibana_system password..."
    curl -s -k -u "elastic:${ELASTIC_PASSWORD}" \
        -X POST "https://localhost:9200/_security/user/kibana_system/_password" \
        -H "Content-Type: application/json" \
        -d "{\"password\":\"${KIBANA_PASSWORD}\"}"
    echo "Password successfully initialized."
else
    echo "kibana_system user is already authenticated. Skipping initialization."
fi

# 4. Keep the container alive by waiting for the background process
wait