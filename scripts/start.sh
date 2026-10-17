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
  printf 'STUDIO_PASSWORD=%s\nSESSION_SECRET=%s\nSTUDIO_PORT=8098\nBIND_ADDRESS=127.0.0.1\nPUBLIC_URL=\nCOOKIE_SECURE=false\nTRUSTED_PROXY_IPS=\nAI_PROVIDER=ollama\nOLLAMA_BASE_URL=http://inference:11434\nOLLAMA_MODEL=qwen3:1.7b\nOPENAI_API_KEY=\nOPENAI_BASE_URL=\nOPENAI_MODEL=\nAI_TIMEOUT_MS=85000\n' "$studio_password" "$studio_secret" > .env
  printf '\n%s\n' 'Credenciais gravadas em .env com acesso restrito. Abra o arquivo localmente para consultar sua senha.'
fi
provider=${AI_PROVIDER:-$(awk '
  /^[[:space:]]*(export[[:space:]]+)?AI_PROVIDER[[:space:]]*=/ {
    value=$0; sub(/^[^=]*=[[:space:]]*/,"",value); sub(/[[:space:]]+#.*/,"",value);
    sub(/[[:space:]]+$/,"",value); gsub(/^["\047]|["\047]$/,"",value); selected=value;
  }
  END {print selected}
' .env)}
case "${provider:-ollama}" in
  ollama) sh scripts/provision-model.sh; docker compose up -d --build;;
  qwen-code) docker compose up -d --build studio;;
  *) printf '%s\n' 'AI_PROVIDER deve ser ollama ou qwen-code.' >&2; exit 1;;
esac
printf '\n%s\n%s\n' 'Crow Studio iniciado. Padrão: http://localhost:8098' 'Se alterou STUDIO_PORT ou PUBLIC_URL, use o endereço configurado.'
