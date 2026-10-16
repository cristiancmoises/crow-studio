# Crow Studio

**Suas ideias. Suas asas.**

Editor visual open source e self-hosted, com identidade própria, templates
originais e Qwen Code integrado. Interface PT-BR escura com ciano e símbolo de
corvo. By Security Ops®.

Versão **0.1.0**. Licença **Apache-2.0**. Disponível em
[crow.securityops.co](https://crow.securityops.co), com autenticação.
Consulte [a verificação](docs/VERIFICATION.md) para os testes e limites desta
implantação. Não possui associação com o Canva.

## Iniciar com Docker

Requisitos: Docker Engine com Compose v2, acesso ao registry npm e às imagens
oficiais Node no primeiro build. Em Windows, use Docker Desktop com containers
Linux e execute o script pelo Git Bash ou WSL. Em servidores GNU/Linux, use `sh`.

Extraia o pacote, entre na pasta `crow-studio-0.1.0` e execute:

```sh
sh scripts/start.sh
```

O script gera uma senha aleatória de 48 caracteres e um secret de sessão, grava
`.env` com permissão 600 e inicia `docker compose up -d --build`. A senha aparece
uma vez no terminal. Guarde-a. O script preserva um `.env` existente.

Abra **http://localhost:8098**. A porta padrão é publicada apenas em loopback.
O primeiro build depende da conexão e do cache; não existe imagem pré-publicada
nesta entrega. O projeto não requer PostgreSQL, Redis ou GPU para o editor.
Modelos locais de IA têm requisitos próprios, separados do aplicativo.

```sh
docker compose ps
docker compose logs --tail=100 studio
docker compose stop
docker compose start
```

Os projetos permanecem no volume `crow-studio_crow_data`. O nome estável do
projeto Compose preserva o mesmo volume quando a pasta do código muda de versão.
Não execute `docker compose down -v` se quiser manter seus dados.

## O que você pode criar

- Posts, stories, capas, cartazes, apresentações e formatos personalizados.
- 12 templates vetoriais originais, sem downloads de bancos de imagem.
- Texto, fontes do sistema, cores, formas, imagens PNG/JPEG/WebP locais.
- Arrastar, redimensionar, girar, alinhar, ordenar, ocultar e bloquear elementos.
- Páginas, zoom, duplicação, undo/redo e atalhos de teclado.
- Projetos persistentes, favoritos, busca e kit de marca compartilhado.
- Salvamento automático serializado com detecção de conflito entre abas.
- PNG/SVG da página atual, PDF de todas as páginas e JSON editável completo.

PNG e PDF são renderizados no navegador a partir do mesmo SVG da página. O PDF
é rasterizado. SVG mantém texto e formas vetoriais; imagens raster permanecem
embutidas. Fontes podem variar entre sistemas. Imagens importadas são otimizadas
para até 1800 px no lado maior; não há upload separado ou serviço de fotos.
Miniaturas da listagem representam imagens enviadas com um bloco de cor para
evitar transferir imagens grandes em todas as consultas. Abrir/exportar preserva
a imagem real.

Limites de integridade: 20 páginas, 200 elementos/página, 4096 px por lado e 20 MB
por projeto. PNG de alta resolução respeita 4096 px no lado maior. A listagem
mostra até 500 projetos mais recentes. Não há colaboração em tempo real,
contas individuais, vídeo, arquivos Canva ou biblioteca de fotos licenciadas.

## Qwen Code incluído de verdade

O pacote oficial `@qwen-code/qwen-code` **0.25.2** está na imagem Docker. O painel
do editor chama esse CLI no backend; não é um simulador nem um link externo.
Configure um provedor de inferência para ativar as criações. Pesos de modelos
não são incluídos e uma conta ChatGPT não fornece automaticamente uma chave.

Edite `.env` e configure um endpoint OpenAI-compatible:

```dotenv
OPENAI_API_KEY=sua-chave-do-provedor
OPENAI_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
OPENAI_MODEL=qwen3-coder-plus
```

Os valores acima ilustram um provedor remoto; use o endpoint, região e modelo
disponíveis na sua conta. O uso pode ter custo conforme o provedor.

Para um servidor Ollama já instalado e acessível ao container:

```dotenv
OPENAI_API_KEY=ollama
OPENAI_BASE_URL=http://host.docker.internal:11434/v1
OPENAI_MODEL=nome-exato-do-modelo-instalado
```

O Ollama precisa aceitar conexões da rede Docker. `localhost` dentro do container
aponta para o próprio container. Em outra máquina, use um endereço privado
alcançável. Restrinja o serviço de inferência à rede de confiança. Se o modelo
local não seguir JSON de maneira consistente, a proposta será rejeitada e o
editor mostrará o erro. Nunca são gerados resultados falsos para ocultar falhas.

Depois de alterar `.env`:

```sh
docker compose up -d --force-recreate
```

Abra o design, clique em **Qwen Code**, descreva uma composição e revise a prévia.
**Aplicar nesta página** substitui a página original e pode ser desfeito. O modelo
recebe o pedido e o conteúdo textual/geometria da página, sem bytes de imagens.
O próprio modelo, como serviço separado, pode usar rede, recursos e regras de
retenção do seu provedor. O editor continua disponível sem configurar IA.

As execuções têm diretório temporário próprio, ambiente sem senha/secret do
estúdio, ferramentas explicitamente excluídas e orçamento de zero chamadas de
ferramenta. Não há shell, Docker socket ou pasta do host montada no agente.
Saída validada contra schema, limite de 2 MB e timeout de 120s (configurável até
180s). O limite padrão é de 12 pedidos/hora por workspace.

## Rede, HTTPS e Nginx Proxy Manager

Para acessar pela LAN sem proxy, altere `BIND_ADDRESS` para o IP da interface ou
`0.0.0.0` e configure firewall. Para publicar na internet, prefira proxy HTTPS.

Configure:

```dotenv
PUBLIC_URL=https://studio.seu-dominio.example
COOKIE_SECURE=true
```

No Nginx Proxy Manager que também roda em Docker, o `127.0.0.1` do NPM é o
próprio container NPM. Conecte `studio` à mesma rede Docker do proxy e use
**studio:8080** como upstream. Exemplo de `compose.override.yaml` para uma rede
externa que já exista e seja usada pelo seu NPM:

```yaml
services:
  studio:
    networks:
      - default
      - proxy
networks:
  proxy:
    external: true
    name: npm-bridge
```

Substitua `npm-bridge` pelo nome real da rede do seu proxy. Preserve a rede
`default` para a conectividade padrão. No proxy, permita corpo de 24 MB e timeout
de leitura de pelo menos 190 segundos para IA. Exemplo nas opções avançadas:

```nginx
client_max_body_size 24m;
proxy_read_timeout 190s;
```

Ative certificado e redirecionamento HTTPS. Configure `PUBLIC_URL` com a origem
exata, sem caminhos; ela é usada na proteção de origem das mutações. Ao definir
`COOKIE_SECURE=true`, faça login pela URL HTTPS. Atualizar apenas `.env` sem
recriar o container não atualiza suas variáveis.

## Backup, restauração e atualização

```sh
sh scripts/backup.sh
```

O script usa a API de backup online do SQLite, inclui transações no WAL e grava
um arquivo consistente em `backups/`. Pode receber uma pasta de destino como
primeiro argumento. Preserve `.env` separadamente em local privado. O backup
contém projetos e imagens, portanto trate-o como dado privado.

Restauração manual, com o serviço parado: preserve uma cópia do volume atual;
substitua `/data/studio.sqlite` pelo backup; remova arquivos `studio.sqlite-wal`
e `studio.sqlite-shm` **somente desse banco parado**; mantenha dono UID/GID 1000;
inicie o serviço. Faça o primeiro ensaio em outro volume antes de substituir
dados importantes. Não copie apenas `studio.sqlite` de um banco ativo.

Para atualizar: faça backup, preserve `.env`, substitua o código e execute
`docker compose up -d --build`. A versão 0.1.0 inicializa seu schema sem apagar
projetos. Migrações futuras precisam ser verificadas antes de usar bancos reais.

## Desenvolvimento e verificação

Node.js **24 ou superior**:

```sh
npm ci
npm test
npm run build
node scripts/compress.mjs
npm run smoke
```

Para iniciar sem Docker, defina `STUDIO_PASSWORD` (mínimo 16 caracteres) e
`SESSION_SECRET` no ambiente e execute `npm start`. `DATA_DIR` permite escolher
a pasta do banco; padrão `./data`. O backend serve o build em `dist` na porta
8080. Para desenvolvimento visual, use `npm run dev` em outro terminal; o Vite
encaminha `/api` para o backend em 127.0.0.1:8080. Use apenas em desenvolvimento:
as duas portas precisam compartilhar o mesmo hostname para os cookies.

O relatório [VERIFICATION.md](docs/VERIFICATION.md) distingue testes com CLI real
e endpoint controlado de inferência com provedor real. A configuração Docker é
fornecida, mas sua execução precisa ser homologada no host de destino.

## Estrutura e continuidade

`src/`: interface e exportações. `shared/`: modelo, templates, histórico e fila de
salvamento. `server/`: HTTP, sessões, SQLite e adaptador Qwen. `scripts/`: bootstrap,
backup, compressão e smoke. `tests/`: testes automatizados.

Veja [ROADMAP.md](docs/ROADMAP.md) para os próximos passos e
[DEPLOYMENT.md](docs/DEPLOYMENT.md) para a configuração do serviço.

## Licenças

Código e templates originais do Crow Studio: Apache-2.0, Copyright 2026 Security
Ops contributors. O nome/logo identificam este projeto e não indicam afiliação
ao Canva. Dependências mantêm suas próprias licenças; consulte
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). O fornecedor/modelo escolhido
para IA tem licença, termos e custos próprios.
