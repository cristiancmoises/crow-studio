# Crow Studio

**Your ideas. Your wings.**

An open, self-hostable visual editor for posts, posters and presentations.
Version **0.2.0** adds an original composition catalog, local Qwen generation, a
limited public demo and editable presentation export. **Apache-2.0** license.
By Security Ops®.

[Português brasileiro](README.md) · [English guide](docs/GUIDE.en.md) ·
[Integrity verification](docs/INTEGRITY.md)

## Open the studio

| Entry | Address |
| --- | --- |
| Authenticated studio | [crow.securityops.co](https://crow.securityops.co) |
| Alternate domain | [crow.securityops.com.br](https://crow.securityops.com.br) |
| Public demo, no login | [crow.securityops.co/demo](https://crow.securityops.co/demo) |
| Alternate demo address | [crow.securityops.com.br/demo](https://crow.securityops.com.br/demo) |

Demo projects remain in the browser and cannot access the private workspace.
Editing and export run locally; public generation has a limited budget.
The editing interface is in Brazilian Portuguese.

## Start with Docker

Use Docker Engine with Compose v2. On Windows, use Linux containers and Git Bash
or WSL. The first installation needs network access to fetch images and weights.
Verify and extract the package, then enter `crow-studio-0.2.0`:

```sh
sh scripts/provision-model.sh && sh scripts/start.sh
```

The provisioner downloads the default model through a temporary container
without published ports. Normal inference remains on an internal Docker network.
`start.sh` creates a private `.env` when needed and preserves existing
configuration. New installations use Ollama with an 85-second timeout; the
script provisions or verifies the pinned model before startup. Read the password
in the local `.env`. With `AI_PROVIDER=qwen-code`, it starts only the studio and
skips local model provisioning.

Open **http://localhost:8098** or **http://localhost:8098/demo**. The default port
binds to loopback. The editor also works without provisioning a model;
generation stays unavailable until configured. See the
[English guide](docs/GUIDE.en.md) for disk requirements, HTTPS configuration,
limits, backup and recovery.

## Features

- **4,812 compositions**: 20 layout families × 6 palettes × 8 topics × 5 formats,
  plus 12 preserved templates. These are combined variations, not 4,812 distinct
  layout designs. Scenes are built on demand.
- Text, shapes, local studio images, alignment, layers, pages, history and
  automatic saving with revision checks.
- Editable proposals from local Qwen, without paid calls by default. The Qwen
  Code adapter remains available for compatible installations.
- Current-page PNG/SVG, all-page PDF, complete project JSON and **PPTX with one
  slide per page**, preserving editable text and shapes.
- A demo limited to 5 local projects and 3 pages per project, with file import
  disabled and explicit storage and generation budgets.

Fonts can render differently across computers. PDF is rasterized. PPTX converts
WebP images to PNG and fits mixed page sizes into the first page's format.
See [presentation export details](docs/GUIDE.en.md#presentations-and-export).

## Source and validation

| Remote | Repository |
| --- | --- |
| Security Ops | [git.securityops.co/cristiancmoises/crow-studio](https://git.securityops.co/cristiancmoises/crow-studio) |
| Security Ops Brazil | [git.securityops.com.br/cristiancmoises/crow-studio](https://git.securityops.com.br/cristiancmoises/crow-studio) |
| Codeberg | [codeberg.org/berkeley/crow-studio](https://codeberg.org/berkeley/crow-studio) |
| GitHub | [github.com/cristiancmoises/crow-studio](https://github.com/cristiancmoises/crow-studio) |

Development requires Node.js 24 or newer:

```sh
npm ci --ignore-scripts
npm test
npm run build
node scripts/compress.mjs
npm run smoke
```

Use the supplied lockfile. [VERIFICATION.md](docs/VERIFICATION.md) identifies
observed results and their release version. Release checks use GPG tags,
checksums and hybrid CodeMark attestations without adding comments to source
files; follow [INTEGRITY.md](docs/INTEGRITY.md).

Original source and templates are Apache-2.0. Dependencies and models retain
their licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Crow Studio
is independent and is not affiliated with Canva.
