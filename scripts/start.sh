#!/bin/sh
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
command -v docker >/dev/null 2>&1 || { printf '%s\n' 'Instale Docker Engine e o plugin Docker Compose antes de iniciar.' >&2; exit 1; }
docker compose version >/dev/null 2>&1 || { printf '%s\n' 'Docker Compose v2 não foi encontrado.' >&2; exit 1; }
if [ ! -f .env ]; then
  umask 077
  studio_password=$(od -An -N24 -tx1 /dev/urandom | tr -d ' \n')
  studio_secret=$(od -An -N32 -tx1 /dev/urandom | tr -d ' \n')
  [ "${#studio_password}" -eq 48 ] && [ "${#studio_secret}" -eq 64 ] || { printf '%s\n' 'Não foi possível gerar credenciais.' >&2; exit 1; }
  printf 'STUDIO_PASSWORD=%s\nSESSION_SECRET=%s\nSTUDIO_PORT=8098\nBIND_ADDRESS=127.0.0.1\nPUBLIC_URL=\nCOOKIE_SECURE=false\nOPENAI_API_KEY=\nOPENAI_BASE_URL=\nOPENAI_MODEL=\nAI_TIMEOUT_MS=120000\n' "$studio_password" "$studio_secret" > .env
  printf '\n%s\n%s\n\n' 'Senha do workspace (guarde em local seguro):' "$studio_password"
fi
docker compose up -d --build
printf '\n%s\n%s\n' 'Crow Studio iniciado. Padrão: http://localhost:8098' 'Se alterou STUDIO_PORT ou PUBLIC_URL, use o endereço configurado.'
