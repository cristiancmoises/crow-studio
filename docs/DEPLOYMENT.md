# Implantação

O endereço principal é https://crow.securityops.co. O domínio
https://crow.securityops.com.br redireciona para ele, preservando caminho e
parâmetros. O estúdio exige uma senha compartilhada; não há contas individuais.
A [demonstração pública](https://crow.securityops.co/demo) abre sem login e
mantém projetos no navegador, separados do workspace privado.

## Configuração

Use Node 24, Docker Engine e Compose. A imagem base está fixada por digest no
Dockerfile e o lockfile fixa a árvore de dependências. Scripts de instalação de
dependências permanecem desativados. O build executa testes, TypeScript, Vite,
compressão e smoke antes de produzir a imagem de execução.

Crie um `.env` privado, com permissão 600. Defina senha forte, segredo de sessão,
`PUBLIC_URL=https://crow.securityops.co` e `COOKIE_SECURE=true`. A porta publicada
deve aceitar conexões somente do proxy. Nunca publique `.env` ou o volume de
dados no Git.

`TRUSTED_PROXY_IPS` aceita uma lista de IPs exatos separados por vírgula. Configure
somente o endereço do proxy que aparece no socket do aplicativo. Esse proxy
precisa substituir `X-Real-IP` por um IP validado. O aplicativo ignora esse
cabeçalho quando o peer não é confiável, e rejeita nomes, redes e curingas na
configuração. Sem a variável, o limite de login usa o IP do socket.

No proxy HTTPS, permita corpo de 24 MB e timeout de leitura de 190 segundos.
Redirecione domínios secundários para a origem configurada em `PUBLIC_URL` antes
de encaminhar mutações. Preserve a validação dos certificados.

```sh
docker compose config --quiet
docker compose build
docker compose up -d
docker compose ps
```

O volume `crow-studio_crow_data` mantém os projetos. A aplicação roda como UID
1000, com raiz somente para leitura, capabilities removidas, limite de memória
de 1 GiB e limite de 128 processos. `/tmp` é temporário e limitado a 256 MiB.

## Backup e recuperação

Em instalações em `/srv/crow`, use:

```sh
sh scripts/backup-persistent.sh
```

O script usa o backup online do SQLite dentro do volume e copia o resultado para
`backups/`, com permissão 600. Ele não depende de espaço no tmpfs de `/tmp`.
`CROW_DIR` permite outro diretório de instalação; o primeiro argumento escolhe
o diretório de destino. Armazene também uma cópia privada do `.env`.

As unidades `deploy/crow-backup.service` e `deploy/crow-backup.timer` agendam um
backup diário. Revise espaço e retenção conforme o uso. Os backups locais
protegem contra alterações acidentais; uma cópia em outro servidor precisa de
um destino privado definido pelo administrador.

Para restaurar, pare o serviço e preserve o volume atual. Teste primeiro o backup
em outro volume. Copie o banco validado para `/data/studio.sqlite`, mantenha dono
1000:1000 e remova somente os arquivos WAL/SHM daquele banco parado. Inicie o
serviço e confira `PRAGMA integrity_check`, projetos e revisões. Nunca substitua
o banco de um processo ativo.

## Atualizações

Faça backup antes de trocar a versão. Preserve `.env` e o volume, construa a nova
imagem e recrie o serviço. Mantenha a imagem anterior até validar login,
salvamento e restauração. A reinicialização do CT deve preservar o endereço
interno, as regras de acesso do proxy, o serviço e o agendamento de backup.

## Inferência local e demonstração

Antes da primeira inicialização com o modelo padrão, execute
`sh scripts/provision-model.sh`. O script provisiona `qwen3:1.7b` em um container
temporário sem portas publicadas e valida seu manifesto fixado. A imagem pode
exigir 20 GiB livres para download/descompactação; com a imagem presente,
reserve 8 GiB e preserve um piso final de 6 GiB.

Na operação normal, `AI_PROVIDER=ollama` usa `http://inference:11434`. A inferência
está em rede Docker `internal: true`, sem portas publicadas, com 2 CPUs, limite
de memória de 2500 MiB, contexto de 2048 tokens, uma execução e descarga do
modelo após uso. O aplicativo compartilha esse slot entre estúdio e demo.
Use o provisionador para baixar pesos, preservando o isolamento da operação.

A API pública limita pedidos a 800 caracteres e corpos a 64 KiB. Os orçamentos
são 2/hora por rede identificada pelo IP, 8/hora e 30/dia no total, persistidos
em um banco de quotas separado. Reservas aceitas são consumidas inclusive em
falhas/cancelamentos. A demo não reutiliza o banco privado de projetos. O proxy
precisa fornecer um IP real validado para os limites por rede funcionarem.

O editor funciona sem modelo. O adaptador Qwen Code pode ser selecionado com
`AI_PROVIDER=qwen-code`; provedores externos têm custos e políticas próprios.
Pesos não acompanham a release fonte. Veja os guias [PT-BR](GUIDE.pt-BR.md) e
[English](GUIDE.en.md) para instalação, uso, limites e exportações.
