# Guia do Crow Studio 0.2.0

[English](GUIDE.en.md) · [Início](../README.md)

## Entradas e dados

O [estúdio](https://crow.securityops.co) usa uma senha compartilhada e guarda
projetos no SQLite do servidor. [crow.securityops.com.br](https://crow.securityops.com.br)
redireciona para a origem principal, preservando caminhos e parâmetros.

A [demo pública](https://crow.securityops.co/demo) abre sem login, também pelo
[domínio alternativo](https://crow.securityops.com.br/demo). Projetos, favoritos
e kit de marca ficam no armazenamento local daquele navegador, sem acesso a
projetos, sessões ou marcas privados. Somente status e pedidos de geração usam
a API pública, sem cookies de autenticação. Não há sincronização entre browsers.

Exporte JSON para guardar um projeto da demo. Limpar dados do site, usar janela
privada ou trocar de navegador pode remover ou separar esse armazenamento.

| Limite da demonstração | Valor |
| --- | --- |
| Projetos locais | 5 |
| Páginas por projeto | 3 |
| Elementos por página | 60 |
| Dimensão por lado | 1920 px |
| Documento serializado | 64 KiB |
| Estado local completo | 512 KiB |
| Importação de arquivos/imagens | Desabilitada |
| Pedido de geração | 800 caracteres; corpo HTTP de até 64 KiB |
| Geração por rede identificada pelo IP | 2 por hora |
| Geração pública total | 8 por hora e 30 por dia |
| Execuções simultâneas | 1, compartilhada com o estúdio |

Redes com o mesmo IP público compartilham o orçamento. Uma execução aceita
consome a reserva mesmo se falhar ou for cancelada; requisições malformadas não
reservam o modelo. Totais persistem após reinícios. Quotas esgotadas retornam
erro claro e `Retry-After`. O banco de quotas usa identificadores derivados por
HMAC; registros expiram após 24 horas, com limpeza no próximo pedido. Não envie
dados confidenciais à geração pública.

## Instalação e modelo local

Use Docker Engine e Compose v2, memória disponível e espaço para imagens/pesos.
Um provisionamento novo pode exigir 20 GiB livres para baixar e descompactar a
imagem; com ela presente, reserve 8 GiB. Preserve um piso final de 6 GiB.
Verifique a release conforme [INTEGRITY.md](INTEGRITY.md), extraia e execute:

```sh
sh scripts/provision-model.sh && sh scripts/start.sh
```

O provisionador aceita `qwen3:1.7b` e confere o manifesto
`sha256:8f68893c685c3ddff2aa3fffce2aa60a30bb2da65ca488b61fff134a4d1730e7`.
Esse é o manifesto de origem; o script também confere o wrapper local do Ollama
e o blob de pesos, cujos digests têm valores próprios.
O download usa um container temporário com saída de rede e sem portas
publicadas. O volume é reutilizado pela inferência definitiva, que permanece em
rede interna e não publica sua porta. Pesos não acompanham o pacote fonte.

O runtime limita inferência a 2 CPUs, 2500 MiB de memória, contexto de 2048
tokens, uma execução e descarga do modelo após uso. São tetos, não medidas de
consumo ou garantias de latência. Reserve recursos adicionais para o sistema,
Docker e o editor, limitado separadamente a 1 GiB. A geração usa CPU, sem GPU.

`start.sh` gera senha e segredo de sessão somente quando `.env` ainda não
existe e preserva a configuração existente. Instalações novas usam
`AI_PROVIDER=ollama` e `AI_TIMEOUT_MS=85000`. Para Ollama, ele executa o
provisionador e valida os digests fixados antes de iniciar os serviços; um cache
válido evita baixar os pesos novamente. Com `AI_PROVIDER=qwen-code`, pula esse
provisionamento e inicia apenas o estúdio. Consulte a senha no `.env` local,
preserve o arquivo com permissão 600 e abra `http://localhost:8098` ou
`http://localhost:8098/demo`. Para usar apenas o editor, o modelo é opcional.

```sh
docker compose ps
docker compose logs --tail=100 studio
docker compose stop
docker compose start
```

O volume estável `crow-studio_crow_data` guarda projetos privados;
`crow-studio_ollama` guarda os pesos. Não use `docker compose down -v` se quiser
preservá-los.

## Geração

Abra o painel de geração, descreva a composição e aguarde a proposta. O modelo
retorna um briefing estruturado de layout, paleta e textos; os construtores do
catálogo produzem objetos editáveis pelo schema existente. Respostas inválidas
são recusadas com erro visível, sem resultados fabricados para esconder falhas.

Revise a prévia antes de aplicar. Aplicar substitui a página atual e entra no
histórico, permitindo desfazer. Revise texto, fatos e diagramação. O pedido e o
contexto textual da página podem ser enviados ao provedor configurado; bytes de
imagens não são enviados.

Padrões locais:

```dotenv
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://inference:11434
OLLAMA_MODEL=qwen3:1.7b
AI_TIMEOUT_MS=85000
```

A geração pública tem timeout de no máximo 90 segundos. O estúdio autenticado
permite 12 criações/hora por workspace e compartilha a execução única com a
demo. A instalação padrão não chama API paga.

O adaptador Qwen Code permanece disponível:

```dotenv
AI_PROVIDER=qwen-code
OPENAI_API_KEY=chave-do-provedor
OPENAI_BASE_URL=https://endpoint-compativel.example/v1
OPENAI_MODEL=modelo-da-sua-conta
```

Esse modo usa `@qwen-code/qwen-code` 0.25.2. Um provedor externo pode cobrar e
ter suas próprias regras de retenção; configure um endpoint autorizado. O
processo de geração não tem ferramentas, shell ou acesso aos segredos do estúdio.
Recrie o serviço após mudar variáveis:

```sh
docker compose up -d --force-recreate
```

## Templates e edição

São **4.812 composições**: 20 famílias de layout × 6 paletas × 8 temas ×
5 formatos = 4.800 variações, mais 12 templates preservados. Não são 4.812
layouts independentes. Formatos: post 1080×1080, apresentação 1920×1080, story
1080×1920, cartaz 794×1123 e capa 1280×720. As cenas são montadas sob demanda;
busca e paginação não materializam o acervo inteiro.

Busque por palavras, filtre por tema/formato e avance pelas páginas. A busca
normaliza acentos. Abra uma composição, edite texto, formas e cores e use o
histórico. Novas variações usam fontes do sistema e formas locais, sem baixar
imagens ou fontes externas.

No estúdio, importe PNG, JPEG ou WebP. Arquivos de até 15 MB são otimizados no
browser para até 1800 px no lado maior e cerca de 3 MB de dados de imagem. Um
projeto privado aceita 20 páginas, 200 elementos/página, 4096 px por lado e
20 MB serializados. A demo aplica os limites menores da tabela.

## Apresentações e exportação

Escolha apresentação no catálogo e adicione páginas. PPTX inclui **todas** as
páginas em ordem, um slide por página, incluindo as que não estão selecionadas.

| Formato | Conteúdo |
| --- | --- |
| JSON | Projeto inteiro no schema editável do Crow |
| PNG | Página atual rasterizada; lado maior até 4096 px |
| SVG | Página atual com texto/formas vetoriais e imagens incorporadas |
| PDF | Todas as páginas rasterizadas |
| PPTX | Todas as páginas, texto/formas/linhas editáveis e imagens incorporadas |

PPTX usa o tamanho da primeira página. Páginas com outras proporções são
centralizadas e ajustadas proporcionalmente, sem deformar objetos. Elementos
ocultos são omitidos. Rotação, cores, opacidade, contornos e arredondamento de
retângulos viram propriedades Office. WebP é convertido para PNG; o recorte
central proporcional acompanha SVG.

Fontes não são incorporadas; leitores podem substituí-las e mudar métricas.
Linhas fora da altura visível do quadro de texto já são omitidas pelo editor.
Fundos transparentes podem aparecer brancos. O bloqueio de objetos no Crow não
impede editar os objetos no PPTX.

Ao alterar manualmente a proporção da moldura de uma imagem, o canvas pode
esticá-la, enquanto SVG/PPTX recortam no centro. Preserve a proporção original
para comparar a imagem sem essa diferença.

## HTTPS, backup e atualização

Configure `PUBLIC_URL` com a origem HTTPS exata e `COOKIE_SECURE=true`. Exponha
apenas a aplicação ao proxy e mantenha a inferência sem portas públicas.
`TRUSTED_PROXY_IPS` aceita IPs exatos; o proxy deve substituir o cabeçalho de IP
por um valor validado. Consulte [DEPLOYMENT.md](DEPLOYMENT.md).

O workspace usa uma senha compartilhada, sem contas isoladas nem colaboração
em tempo real. Backups incluem projetos/imagens e precisam permanecer privados.
Em uma instalação em `/srv/crow`:

```sh
sh scripts/backup-persistent.sh
```

O backup online inclui WAL. Preserve `.env` separadamente. Para restaurar, pare
o serviço, preserve o volume anterior e ensaie em outro volume. Copie o banco
validado como UID/GID 1000 e remova somente WAL/SHM daquele banco parado.
Confira integridade, projetos e revisões antes de substituir o volume principal.

Antes de atualizar, faça backup e preserve `.env`, volumes e imagem anterior.
Recrie o serviço com o código novo e valide login, edição, geração, exportação
e reinício. [VERIFICATION.md](VERIFICATION.md) registra os resultados observados
por versão; desempenho e recursos precisam ser qualificados em cada host.
