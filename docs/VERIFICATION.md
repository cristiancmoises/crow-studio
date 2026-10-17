# Verificação do Crow Studio 0.2.0

Data: 16/10/2026, horário de Brasília. Evidências correspondem às versões e ao
ambiente observados; não constituem garantia de ausência de defeitos.

## Build e regressão

| Verificação | Resultado |
| --- | --- |
| Build Docker real no CT | Concluído; Node 24 fixado por digest, instalação com scripts desativados |
| `npm test` | 71 testes aprovados; zero falhas, cancelamentos ou skips |
| TypeScript, Vite e compressão | Concluídos no build da imagem |
| `npm run smoke` | Entrypoint, estáticos, compressão, autenticação, CRUD, backup SQLite e persistência aprovados |
| `npm audit --omit=dev` | Zero vulnerabilidades conhecidas na consulta desta implantação |
| Catálogo | 4.812 cenas validadas: identificadores, schema, limites geométricos e texto |
| Amostra visual | 20 famílias de layout inspecionadas em renderização real |
| Inicialização | Instalação nova, cache verificado, configuração existente preservada e senha ausente dos logs |
| Recuperação do deploy | Seis cenários controlados de preflight e rollback aprovados, incluindo falhas entre renames e durante stop |

O primeiro build identificou um fixture antigo de inicialização e um teste de
cancelamento que incluía o tempo de partida do CLI em seu prazo. O fixture foi
atualizado para o provisionamento atual; o teste aguarda o endpoint controlado e
exige cancelamento em menos de 1,5 segundo. O teste separado de timeout continua
em 1,2 segundo. Nenhuma falha foi desativada.

A revisão também reproduziu a perda de proposta ao mudar de página durante a
geração. O painel agora preserva uma proposta recusada e só confirma aplicação
após a validação do editor. A regressão React foi observada antes e depois da
correção.

## Inferência e limites públicos

Qwen local respondeu por API de verdade, em ambientes isolados, sem fixtures de
resposta. Gerações observadas levaram aproximadamente 20 a 35 segundos, com
JSON válido, composição editável e modelo descarregado após uso. Houve chamadas
públicas de demo e chamadas privadas autenticadas. Uma proposta com caracteres
inesperados motivou validação de texto e instruções mais curtas; a requalificação
produziu texto completo em português brasileiro.

O modelo roda com 2 CPUs e 2500 MiB de memória/swap, contexto de 2048 tokens,
saída limitada e uma execução. O cache atingiu o limite de memória durante a
qualificação, sem OOM ou encerramento do container. Essas observações não
prometem latência ou qualidade para todos os pedidos.

Os testes verificam quotas persistentes de 2 solicitações/hora por IP, 8/hora e
30/dia no total, normalização de IPv4/IPv6, rejeição de cabeçalhos falsificados,
concorrência compartilhada, cancelamento e resposta a corpos chunked acima de
64 KiB. Pedidos aceitos consomem a reserva mesmo quando falham ou são cancelados.
O runtime de inferência usa rede interna, sem porta publicada e sem ferramentas
ou acesso aos arquivos do estúdio.

## Navegador e apresentações

Chromium 153 real, perfis novos, sandbox e Seccomp-BPF ativos. A demonstração
passou em 33 verificações; o estúdio privado, em 24. Os relatórios registraram
zero erros de console, exceções ou falhas HTTP/rede. As checagens adicionais dos
arquivos baixados passaram em 40 verificações.

Foram conferidos login/logout privado, entrada pública, busca e paginação do
catálogo, criação, edição, autosave e reabertura. A demo não fez chamadas às APIs
privadas. Upload e importação foram recusados; adicionar ou duplicar páginas
ficou desabilitado no limite de três. O aviso público permaneceu visível em
desktop e mobile após corrigir sua sobreposição com a barra lateral.

PNG, SVG, PDF, JSON e PPTX foram baixados. O PPTX da demo contém três slides;
o do estúdio incorpora como PNG uma imagem importada e convertida a WebP pelo
navegador. CRC, relacionamentos Office, texto editável e estrutura dos slides
foram validados. O PNG 1920 × 1080 foi decodificado e inspecionado.

A conversão adicional PPTX→PDF com LibreOffice local não foi qualificada: o
processo abortou com uma asserção NSS. O mesmo erro ocorreu com TXT simples,
perfis novos e sem `LD_LIBRARY_PATH`, indicando uma limitação desse ambiente.
Não foi feita alteração no NSS nem alegação de conversão Office aprovada.
A exportação PDF do próprio Crow passou no navegador.

## Produção e persistência

A versão 0.2.0 foi implantada com a mesma senha e o mesmo volume. O backup
integral offline recebeu `quick_check`; os IDs e as revisões dos projetos foram
comparados antes e depois, sem mudanças. A imagem anterior foi preservada.

Após reiniciar o CT, foram reconferidos identidade, imagem, credenciais em
memória, persistência, endereço interno, modelo e manifests pinados. Firewall
restrito ao proxy, direção original das conexões e timer diário de backup
continuaram ativos. O piso de 6 GiB livres permaneceu atendido.

HTTPS público retornou versão 0.2.0. A demo e seu status responderam 200;
projetos anônimos receberam 401. O domínio brasileiro redirecionou com 301,
preservando caminho e parâmetros. Acesso temporário de validação foi removido;
a política original do transporte administrativo foi restaurada.

O probe Chromium público após o reinício passou em 21 verificações: entrada
login→demo, recarga direta, catálogo, banner desktop/mobile e 13 respostas de
assets com HTTP 200. Não houve erro de console/rede, chamada privada na demo ou
tentativa de escrita. O perfil isolado foi removido ao concluir.

Uma geração privada autenticada pelo HTTPS público também passou após o reboot:
HTTP 200 em 33,923 segundos, com sete elementos editáveis. Ela não salvou projeto
nem consumiu a cota pública da demo; a sessão de verificação foi encerrada.

## Limites do produto

O estúdio usa uma senha compartilhada e um workspace; não oferece isolamento
entre contas ou colaboração em tempo real. A demo guarda até cinco projetos no
navegador, com três páginas, 60 elementos por página, 1920 px por lado e 64 KiB
por projeto. Seu armazenamento total é limitado a 512 KiB e não aceita imagens.
Limpar os dados do navegador remove esses projetos; exporte antes de limpar.

O catálogo combina 20 famílias de layout, seis paletas, oito temas e cinco
formatos, além de 12 modelos originais. O total de composições não representa
4.812 famílias desenhadas individualmente. Textos gerados precisam de revisão
do usuário. PPTX ajusta páginas de proporções diferentes ao formato da primeira;
fontes dependem do aplicativo que abre o arquivo.

Backups locais precisam de uma cópia externa privada para recuperar uma perda
completa do servidor. A listagem privada mostra até 500 projetos. O editor
permanece um aplicativo independente, sem equivalência integral ao Canva.
