# Studio PDF.js development assets

`GET /api/dev/unified/pdf-assets/{kind}/{filename}` serves resources directly
from the installed `pdfjs-dist` package, resolved with Node's `createRequire`.
No vendor assets or source PDFs are copied into the repository. The endpoint
returns 404 unless `NODE_ENV` is `development`.

Use these same-origin directory URLs, including the trailing slash, with PDF.js:

| PDF.js option | URL | Installed resources |
| --- | --- | --- |
| `cMapUrl` (with `cMapPacked: true`) | `/api/dev/unified/pdf-assets/cmaps/` | `.bcmap` |
| `standardFontDataUrl` | `/api/dev/unified/pdf-assets/standard_fonts/` | `.pfb`, `.ttf` |
| `wasmUrl` | `/api/dev/unified/pdf-assets/wasm/` | `.wasm`, `.js` |

In PDF.js 5.7.284, both JBIG2 and CCITT Fax images require `jbig2.wasm` or
`jbig2_nowasm_fallback.js`; missing decoder resources can omit image masks that
contain scanned text. The same directory also supplies OpenJPEG and its JavaScript
fallback, QCMS, and QuickJS assets. `useSystemFonts` cannot replace image decoders.
The optional CMYK profile uses a separate `iccUrl` and `iccs` directory, which this
endpoint does not expose.

Only the three listed kinds and a single validated filename with an appropriate
extension are accepted. Resolved files must remain within that installed asset
directory, including after resolving symlinks. Responses use explicit binary,
font, WebAssembly, or JavaScript MIME types, `nosniff`, and `Cache-Control: no-store`
so dependency upgrades do not reuse stale resources.

Run the focused real-package byte and rejection checks with
`npx vitest run src/__tests__/api/devPdfAssets.test.ts`.
