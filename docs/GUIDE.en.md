# Crow Studio 0.2.0 guide

[Português brasileiro](GUIDE.pt-BR.md) · [Home](../README.en.md)

## Entry points and data

The [studio](https://crow.securityops.co) uses a shared password and server-side
SQLite. [crow.securityops.com.br](https://crow.securityops.com.br) redirects to
the primary origin, preserving paths and query parameters.

The [public demo](https://crow.securityops.co/demo) needs no login and also opens
through the [alternate domain](https://crow.securityops.com.br/demo). Its
projects, favorites and brand settings remain in that browser's local storage,
without access to private projects, sessions or brand data. Only generation
status and requests use the public API, without authentication cookies. Projects
do not synchronize between browsers.

Export JSON to keep a demo project. Clearing site data, using a private window
or changing browsers can remove or separate this storage.

| Demo limit | Value |
| --- | --- |
| Local projects | 5 |
| Pages per project | 3 |
| Elements per page | 60 |
| Maximum dimension | 1920 px per side |
| Serialized document | 64 KiB |
| Complete local state | 512 KiB |
| File/image import | Disabled |
| Generation request | 800 characters; HTTP body up to 64 KiB |
| Generation per network identified by IP | 2 per hour |
| Total public generation | 8 per hour and 30 per day |
| Concurrent executions | 1, shared with the studio |

Networks sharing a public IP share its budget. An accepted execution uses its
reservation even if it fails or is cancelled; malformed requests do not reserve
the model. Budgets persist across restarts. Exhausted quotas return a clear
error and `Retry-After`. Quota records use HMAC-derived identifiers and expire
after 24 hours, with cleanup on the next request. Do not send confidential
information to public generation.

## Installation and local model

Use Docker Engine and Compose v2 with free disk space and memory for the host,
editor and inference. New provisioning can require 20 GiB free to download and
unpack the image; with the image present, allow 8 GiB. Preserve a final 6 GiB
free-space floor. Verify the release using [INTEGRITY.md](INTEGRITY.md), extract
it and run:

```sh
sh scripts/provision-model.sh && sh scripts/start.sh
```

The provisioner accepts `qwen3:1.7b` and checks manifest
`sha256:8f68893c685c3ddff2aa3fffce2aa60a30bb2da65ca488b61fff134a4d1730e7`.
This identifies the source manifest; the script also checks Ollama's local
wrapper and the weight blob, which have separate digests.
Download uses a temporary container with outbound access and no published ports.
Normal inference reuses its volume on an internal network without a published
inference port. Model weights are not included in the source archive.

Runtime limits are 2 CPUs, 2500 MiB of memory, a 2048-token context, one execution
and model unloading after use. These are limits, not measured resource use or
latency guarantees. Allow extra resources for the system, Docker and the editor,
whose separate memory limit is 1 GiB. Generation uses CPU, without requiring GPU.

`start.sh` creates credentials only if `.env` is absent and preserves existing
configuration. New installations use `AI_PROVIDER=ollama` and
`AI_TIMEOUT_MS=85000`. For Ollama, it runs the provisioner and validates the
pinned digests before starting services; a valid cache avoids downloading the
weights again. With `AI_PROVIDER=qwen-code`, it skips provisioning and starts
only the studio. Read the password in the local `.env`, keep that file private
with mode 600 and open `http://localhost:8098` or `http://localhost:8098/demo`.
Model setup is optional when using only the editor.

```sh
docker compose ps
docker compose logs --tail=100 studio
docker compose stop
docker compose start
```

The stable `crow-studio_crow_data` volume stores private projects;
`crow-studio_ollama` stores weights. Do not use `docker compose down -v` when
these data must be preserved.

## Generation

Open the generation panel, describe a composition and wait for its proposal.
The model returns a structured brief with layout, palette and text choices.
Catalog constructors produce editable objects using the existing scene schema.
Invalid responses are rejected with a visible error, without fabricated results.

Review the preview before applying it. Applying replaces the current page and
creates a history entry, allowing undo. Review text, facts and layout. Request
text and textual page context may be sent to the configured provider; image
bytes are not sent.

Local defaults:

```dotenv
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://inference:11434
OLLAMA_MODEL=qwen3:1.7b
AI_TIMEOUT_MS=85000
```

Public generation has a maximum timeout of 90 seconds. The authenticated studio
allows 12 creations per hour per workspace and shares the single execution slot
with the demo. The default installation does not call a paid API.

The Qwen Code adapter remains available:

```dotenv
AI_PROVIDER=qwen-code
OPENAI_API_KEY=provider-key
OPENAI_BASE_URL=https://compatible-endpoint.example/v1
OPENAI_MODEL=model-in-your-account
```

This mode uses `@qwen-code/qwen-code` 0.25.2. External providers can have charges
and retention policies; configure an authorized endpoint. Generation has no
tools, shell or access to studio secrets. Recreate after changing variables:

```sh
docker compose up -d --force-recreate
```

## Templates and editing

There are **4,812 compositions**: 20 layout families × 6 palettes × 8 topics ×
5 formats = 4,800 variations, plus 12 preserved templates. These are not 4,812
independent layout designs. Formats are 1080×1080 posts, 1920×1080 presentations,
1080×1920 stories, 794×1123 posters and 1280×720 covers. Scenes are built on
demand; search and pagination do not materialize the complete catalog.

Search by words, filter by topic/format and browse pages. Search normalizes
accents. Open a composition and edit text, shapes and colors, using history to
undo. New variations use system fonts and local shapes, without external image
or font downloads.

The studio imports PNG, JPEG and WebP files up to 15 MB, optimized in the browser
to 1800 px on the longest side and about 3 MB of image data. Private projects
allow 20 pages, 200 elements per page, 4096 px per side and a 20 MB serialized
document. The demo applies the smaller limits above.

## Presentations and export

Choose a presentation in the catalog and add pages. PPTX includes **all pages**
in order, one slide per page, including pages other than the selected page.

| Format | Content |
| --- | --- |
| JSON | Complete project in Crow's editable scene schema |
| PNG | Rasterized current page; maximum longest side of 4096 px |
| SVG | Current page with vector text/shapes and embedded raster images |
| PDF | Rasterized export of all pages |
| PPTX | All pages with editable text/shapes/lines and embedded images |

PPTX uses the first page's dimensions. Other proportions are centered and scaled
uniformly to fit, without deforming objects. Hidden elements are omitted.
Rotation, colors, opacity, outlines and rectangle corners become Office
properties. WebP is converted to PNG; proportional center cropping matches SVG.

Fonts are not embedded; readers can substitute them and change text metrics.
Text lines outside the visible box are already omitted by the editor.
Transparent backgrounds can appear white. Crow's object lock does not prevent
editing the exported PPTX objects.

If an image frame's aspect ratio is changed manually, the canvas can stretch it
while SVG/PPTX crop proportionally in the center. Preserve the original aspect
ratio to avoid this comparison difference.

## HTTPS, backup and upgrades

Set `PUBLIC_URL` to the exact HTTPS origin and `COOKIE_SECURE=true`. Expose only
the studio to its proxy and keep inference without public ports.
`TRUSTED_PROXY_IPS` accepts exact IPs; the proxy must replace the client-IP header
with a validated value.

The workspace has a shared password, without individual accounts or real-time
collaboration. Backups contain projects/images and must remain private.
For an installation in `/srv/crow`:

```sh
sh scripts/backup-persistent.sh
```

Online backups include WAL transactions. Preserve `.env` separately. To restore,
stop the service, preserve the old volume and rehearse in another volume. Copy
the validated database with UID/GID 1000 and remove only WAL/SHM files belonging
to that stopped database. Check integrity, projects and revisions before
replacing the main volume.

Before upgrading, back up data and preserve `.env`, volumes and the previous
image. Recreate using the new source and test login, editing, generation, export
and restart. [VERIFICATION.md](VERIFICATION.md) records observed results by
version; qualify performance and resources on each host.
