# Verificação do Crow Studio 0.1.0

Data: 16/10/2026. Implantação com acesso autenticado por HTTPS.

## Evidências atuais

| Verificação | Resultado |
| --- | --- |
| Checksums do pacote original | Todos conferidos antes das alterações |
| Build Docker real | Concluído no CT de destino; imagem Node 24 fixada por digest |
| `npm test` | 35 testes aprovados; zero falhas, cancelamentos ou skips |
| TypeScript e Vite | Compilação concluída; ativos comprimidos gerados |
| `npm run smoke` | Entrypoint real, estáticos, autenticação, CRUD, backup SQLite e persistência aprovados |
| `npm audit --omit=dev` | Zero vulnerabilidades conhecidas na consulta desta implantação |
| Runtime | Usuário 1000, raiz somente para leitura, capabilities removidas, healthcheck saudável |
| HTTPS público | Página e health retornam 200; projetos exigem autenticação |
| Domínio alternativo | Redirecionamento 301 preserva caminho e parâmetros |
| Cookie e origem | HttpOnly, Secure e SameSite=Strict; mutação de origem externa recusada |
| Proxy | Cabeçalhos falsificados ignorados na borda; IP do peer confirmado no socket do aplicativo |
| Firewall | Entrada direta de outro CT recusada; acesso do proxy permitido |
| Backup e restauração | Banco consistente restaurado em volume separado; login, projeto e revisão conferidos |
| Reinício do CT | Aplicação saudável, projeto/revisão persistentes, endereço interno, firewall e timer ativos |
| Chromium 153 real | 24 verificações aprovadas; sandbox ativo, sem erros ou avisos no console e sem falhas HTTP/rede |
| Edição e exportação no navegador | Login, 12 templates, texto, arraste, autosave, reabertura e PNG/SVG/PDF/JSON aprovados |
| Layout | Desktop 1440×1000 e mobile 390×844 verificados, sem overflow horizontal |

O backup diário está habilitado. Os arquivos permanecem privados no servidor.
O ensaio de restauração não substituiu o volume em uso.

## Regressão de login pelo proxy

Os testes novos reproduziram a mistura de limites entre clientes no código
original. Depois da correção, a suíte completa passou. A lista de proxies aceita
IPs exatos; cabeçalhos de um peer não confiável não alteram a identidade usada
pelo limite. Endereços inválidos retornam ao IP do socket, e IPv4 mapeado em IPv6
é tratado como o mesmo endereço.

## Limites

A geração pelo Qwen está desativada até configurar um provedor autorizado.
Os testes do CLI usam endpoint controlado e não comprovam inferência com um
modelo real, qualidade das composições, custo ou latência do provedor.

O estúdio usa uma senha compartilhada e armazena os projetos no mesmo workspace.
Não oferece isolamento entre contas ou colaboração em tempo real. A listagem
mostra até 500 projetos. Backups locais precisam de uma cópia externa privada
para recuperação após perda completa do servidor.

O aplicativo continua sendo um editor independente, sem equivalência integral
ao Canva. A validação descrita corresponde ao ambiente e às versões observados,
não constitui uma garantia de ausência de defeitos.
