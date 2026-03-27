#!/bin/sh
cd /app/interface || exit 1
# Volume anonyme node_modules : peut être obsolète après un nouveau package (ex. recharts).
echo "[frontend entrypoint] npm install dans /app/interface …"
if ! npm install --no-audit --no-fund; then
	echo "[frontend entrypoint] ERREUR: npm install a échoué — vérifie les logs ci-dessus." >&2
	exit 1
fi
echo "[frontend entrypoint] lancement: $*"
exec "$@"
