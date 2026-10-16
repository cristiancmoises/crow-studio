# Implantação

O endereço principal é https://crow.securityops.co. O domínio
https://crow.securityops.com.br redireciona para ele, preservando caminho e
parâmetros. O serviço exige uma senha compartilhada; não há contas individuais.

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

O editor funciona sem provedor de geração. Ative essa integração somente após
configurar e testar um endpoint autorizado; a implantação não inclui pesos de
modelo nem habilita cobrança externa.
