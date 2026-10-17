#!/bin/sh
set -eu
umask 077
cd "${CROW_DIR:-/srv/crow}"
destination=${1:-backups}
mkdir -p "$destination"
chmod 700 "$destination"
filename="crow-$(date -u +%Y%m%dT%H%M%SZ).sqlite"
docker compose exec -T studio sh -c 'umask 077; mkdir -p /data/.backups; node scripts/backup.mjs "/data/.backups/$1"' sh "$filename"
docker compose cp "studio:/data/.backups/$filename" "$destination/$filename"
chmod 600 "$destination/$filename"
docker compose exec -T studio rm "/data/.backups/$filename"
printf '%s\n' "$destination/$filename"
