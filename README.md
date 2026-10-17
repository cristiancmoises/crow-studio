# Crow Studio

**Suas ideias. Suas asas.**

Editor visual aberto e hospedável para posts, cartazes e apresentações. A versão
**0.2.0** reúne catálogo de composições originais, geração com Qwen local,
demonstração pública limitada e exportação de apresentações editáveis.
Licença **Apache-2.0**. By Security Ops®.

[English](README.en.md) · [Guia PT-BR](docs/GUIDE.pt-BR.md) ·
[Implantação](docs/DEPLOYMENT.md) · [Integridade](docs/INTEGRITY.md)

## Acessar

| Entrada | Endereço |
| --- | --- |
| Estúdio com autenticação | [crow.securityops.co](https://crow.securityops.co) |
| Domínio alternativo | [crow.securityops.com.br](https://crow.securityops.com.br) |
| Demonstração sem login | [crow.securityops.co/demo](https://crow.securityops.co/demo) |
| Demonstração alternativa | [crow.securityops.com.br/demo](https://crow.securityops.com.br/demo) |

Os projetos da demonstração ficam no navegador e não acessam o workspace
privado. Edição e exportação são locais; a geração pública possui orçamento
limitado. A interface de edição está em português brasileiro.

## Iniciar com Docker

Requisitos: Docker Engine com Compose v2. Em Windows, use containers Linux e Git
Bash ou WSL. A primeira instalação precisa de rede para obter imagens e pesos.
Verifique o pacote, extraia e entre em `crow-studio-0.2.0`:

```sh
sh scripts/provision-model.sh && sh scripts/start.sh
```

O provisionador baixa o modelo padrão em uma etapa temporária sem publicar
portas; a inferência de uso normal permanece em rede Docker interna.
`start.sh` gera um `.env` privado quando necessário e preserva a configuração
existente. Instalações novas usam Ollama com timeout de 85 segundos; o script
provisiona ou verifica o modelo fixado antes de iniciar. Consulte a senha no
`.env` local. Com `AI_PROVIDER=qwen-code`, ele inicia apenas o estúdio e pula
o provisionamento local.

Abra **http://localhost:8098** ou **http://localhost:8098/demo**. A porta padrão
fica em loopback. O editor também funciona sem provisionar o modelo; a geração
fica indisponível até configurá-lo. Consulte o [guia](docs/GUIDE.pt-BR.md) para
requisitos de espaço, HTTPS, limites, backup e recuperação.

## Recursos

- **4.812 composições**: 20 famílias de layout × 6 paletas × 8 temas × 5 formatos,
  mais 12 templates preservados. São variações combinadas, não 4.812 layouts
  independentes. As cenas são construídas sob demanda.
- Texto, formas, imagens locais no estúdio, alinhamento, camadas, páginas,
  histórico e salvamento automático com controle de revisão.
- Propostas editáveis com Qwen local, sem chamadas pagas por padrão. O adaptador
  Qwen Code permanece disponível para instalações compatíveis.
- PNG/SVG da página atual, PDF de todas as páginas, JSON completo e **PPTX com um
  slide por página**, mantendo texto e formas editáveis.
- Demo com até 5 projetos locais e 3 páginas por projeto, sem importação de
  arquivos e com limites explícitos de armazenamento e geração.

Fontes podem variar entre computadores. PDF é rasterizado. PPTX converte WebP
para PNG e ajusta páginas de tamanhos diferentes ao formato da primeira.
Veja [os detalhes de exportação](docs/GUIDE.pt-BR.md#apresentações-e-exportação).

## Código e verificação

| Remoto | Repositório |
| --- | --- |
| Security Ops | [git.securityops.co/cristiancmoises/crow-studio](https://git.securityops.co/cristiancmoises/crow-studio) |
| Security Ops Brasil | [git.securityops.com.br/cristiancmoises/crow-studio](https://git.securityops.com.br/cristiancmoises/crow-studio) |
| Codeberg | [codeberg.org/berkeley/crow-studio](https://codeberg.org/berkeley/crow-studio) |
| GitHub | [github.com/cristiancmoises/crow-studio](https://github.com/cristiancmoises/crow-studio) |

Desenvolvimento com Node.js 24 ou superior:

```sh
npm ci --ignore-scripts
npm test
npm run build
node scripts/compress.mjs
npm run smoke
```

Use o lockfile incluído. [VERIFICATION.md](docs/VERIFICATION.md) identifica os
resultados observados e a versão a que se referem. A verificação de releases usa
tags GPG, checksums e CodeMark híbrido sem adicionar comentários ao fonte;
siga [INTEGRITY.md](docs/INTEGRITY.md).

Código e templates originais são Apache-2.0. Dependências e modelos mantêm suas
licenças: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Crow Studio é
independente e não possui associação com o Canva.
