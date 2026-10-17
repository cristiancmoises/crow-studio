#!/bin/sh
set -eu

image=ollama/ollama@sha256:0e8ff22ff86b4718cfa886844062117af13b50eb5689cca78279778e15744980
model=qwen3:1.7b
expected=8f68893c685c3ddff2aa3fffce2aa60a30bb2da65ca488b61fff134a4d1730e7
stored_expected=0f45bae8cd2fec097cf09b400b078cf42388a1f5702f4058d2d6d641a09db46d
weights_expected=3d0b790534fe4b79525fc3692950408dca41171676ed7e21db57af5c65ef6ab6
volume=crow-studio_ollama
manifest=/root/.ollama/models/manifests/registry.ollama.ai/library/qwen3/1.7b
container=
cleanup() { if [ -n "$container" ]; then docker rm -f "$container" >/dev/null; fi; }
trap cleanup EXIT
trap 'exit 1' HUP INT TERM

command -v docker >/dev/null || { printf '%s\n' 'Docker não encontrado.' >&2; exit 1; }
docker_root=$(docker info --format '{{.DockerRootDir}}')
check_space() {
  available=$(df -Pk "$docker_root" | awk 'NR==2 {print $4}')
  case "$available" in ''|*[!0-9]*) printf '%s\n' 'Não foi possível conferir o espaço do Docker.' >&2; exit 1;; esac
  [ "$available" -ge "$1" ] || { printf '%s\n' "$2" >&2; exit 1; }
}
verify_blobs() {
  sums=$(docker run --rm --network none --read-only --cap-drop ALL --security-opt no-new-privileges --memory 128m --memory-swap 128m --cpus 1 --pids-limit 32 --entrypoint sha256sum --mount "type=volume,src=$volume,dst=/root/.ollama,readonly" "$image" "/root/.ollama/models/blobs/sha256-$expected" "/root/.ollama/models/blobs/sha256-$weights_expected")
  source_hash=$(printf '%s\n' "$sums" | awk 'NR==1 {print $1}')
  weights_hash=$(printf '%s\n' "$sums" | awk 'NR==2 {print $1}')
  [ "$source_hash" = "$expected" ] && [ "$weights_hash" = "$weights_expected" ] || { printf '%s\n' 'Os blobs do manifesto original ou dos pesos têm digest diferente.' >&2; exit 1; }
}
if ! docker image inspect "$image" >/dev/null 2>&1; then
  check_space 20971520 'Separe 20 GiB livres para baixar e descompactar a imagem de inferência.'
  docker pull "$image"
fi
check_space 6291456 'Mantenha pelo menos 6 GiB livres no armazenamento do Docker.'
docker volume inspect "$volume" >/dev/null 2>&1 || docker volume create "$volume" >/dev/null
if cached=$(docker run --rm --network none --read-only --cap-drop ALL --security-opt no-new-privileges --entrypoint /bin/sh --mount "type=volume,src=$volume,dst=/root/.ollama,readonly" "$image" -c 'if [ -f "$1" ]; then sha256sum "$1"; else exit 44; fi' sh "$manifest"); then
  actual=$(printf '%s\n' "$cached" | awk '{print $1}')
  [ "$actual" = "$stored_expected" ] || { printf '%s\n' 'O manifesto existente tem um digest diferente. Nenhum modelo foi substituído.' >&2; exit 1; }
  verify_blobs
  printf '%s\n' "Modelo $model já verificado: $expected"
  exit 0
else
  status=$?
  [ "$status" -eq 44 ] || { printf '%s\n' 'Falha ao verificar o manifesto do modelo.' >&2; exit "$status"; }
fi
check_space 8388608 'Separe 8 GiB livres antes de baixar os pesos do modelo.'
container=$(docker run -d --network bridge --read-only --cap-drop ALL --security-opt no-new-privileges --memory 2500m --memory-swap 2500m --cpus 2 --pids-limit 128 --tmpfs /tmp:size=256m,mode=1777,noexec,nosuid --env OLLAMA_HOST=127.0.0.1:11434 --env OLLAMA_NO_CLOUD=1 --env OLLAMA_NUM_PARALLEL=1 --env OLLAMA_KEEP_ALIVE=0 --mount "type=volume,src=$volume,dst=/root/.ollama" "$image")
ready=0
for attempt in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  if docker exec "$container" ollama list >/dev/null 2>&1; then ready=1; break; fi
  sleep 1
done
[ "$ready" -eq 1 ] || { printf '%s\n' 'O serviço temporário de download não iniciou.' >&2; exit 1; }
docker exec "$container" ollama pull "$model"
actual=$(docker exec "$container" sha256sum "$manifest" | awk '{print $1}')
[ "$actual" = "$stored_expected" ] || { printf '%s\n' 'O manifesto baixado tem um digest diferente do esperado. Revise a versão antes de iniciar.' >&2; exit 1; }
verify_blobs
check_space 6291456 'O download terminou, mas o piso de 6 GiB livres não foi atendido.'
printf '%s\n' "Modelo $model verificado: $expected"
