#!/bin/sh
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
destination=${1:-backups}
mkdir -p "$destination"
umask 077
filename="crow-studio-$(date -u +%Y%m%d-%H%M%S).sqlite"
docker compose exec -T studio node scripts/backup.mjs /tmp/crow-studio-backup.sqlite
docker compose cp studio:/tmp/crow-studio-backup.sqlite "$destination/$filename"
docker compose exec -T studio node -e "require('node:fs').unlinkSync('/tmp/crow-studio-backup.sqlite')"
printf 'Backup salvo: %s/%s\n' "$destination" "$filename"
