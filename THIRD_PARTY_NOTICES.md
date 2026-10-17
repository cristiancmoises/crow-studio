# Third-party notices

Crow Studio application source, original templates and crow SVG: Apache-2.0.
Copyright 2026 Security Ops contributors.

Direct dependencies (their authors retain their copyrights):

| Package | License | Purpose |
| --- | --- | --- |
| @qwen-code/qwen-code 0.25.2 | Apache-2.0 | Official CLI, included unmodified |
| React / React DOM | MIT | Interface runtime |
| Konva / react-konva | MIT | Canvas editor |
| Zod | MIT | Input and document validation |
| Lucide React | ISC | Interface icons |
| jsPDF | MIT | PDF export |
| PptxGenJS 4.0.1 | MIT | Editable PowerPoint export |
| TypeScript | Apache-2.0 | Build-time type checks |
| Vite / @vitejs/plugin-react | MIT | Development and build |

Qwen includes bundled dependencies and optional native components whose own
license files remain inside the installed npm package. sharp is overridden to
0.35.5 to avoid the reviewed librsvg advisory GHSA-wq5f-xc86-pv6w. The override
does not modify the CLI source. The complete dependency versions and integrity
hashes are in package-lock.json. Run `npm ci` to install the exact tree and
inspect each package's LICENSE/NOTICE before redistributing its binaries.

PptxGenJS 4.0.1 declares image-size 1.x as a dependency, although its published
browser and CommonJS bundles do not call that parser. The dependency is pinned
to image-size 2.0.3 to remove the ICNS and JXL/HEIF denial-of-service findings
GHSA-w3rx-r6r6-pgpr and GHSA-5p2g-fcmc-qvqq. Crow decodes supported raster images
through the browser and supplies their dimensions to PptxGenJS. The original
dependency sources and licenses remain unmodified.

No Canva source code, logo, proprietary template, paid asset or font is bundled.
Fonts use the user's system installation. User-imported files and selected AI
models/providers are governed by their respective licenses and terms.
