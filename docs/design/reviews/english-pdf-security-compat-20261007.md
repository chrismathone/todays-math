# English D: PDF.js security patch compatibility

Date: 2026-10-07. Worker branch: `chrismathone/english-pdf-compat`.
Reviewed PDF.js **5.7.284 → 6.2.108**; dependency installation, release integration
and push belong to the `todayenglish-hifi` coordinator.

## Required correction

PDF.js 6 removes `PDFDocumentProxy.destroy()`. Replace it with
`document.loadingTask.destroy()` in Studio unmount/stale import cleanup, listening
text/question import finalizers and page-limit rejection, and textbook QR verification.
The independent-answer integration helper and three existing PDF QA scripts use
the same replacement. Existing loading-task destruction and canvas-factory
destruction remain valid.

Primary references: [Mozilla migration note](https://github.com/mozilla/pdf.js/pull/21245),
[6.0 release](https://github.com/mozilla/pdf.js/releases/tag/v6.0.227),
[6.1 release](https://github.com/mozilla/pdf.js/releases/tag/v6.1.200),
[6.2.108 release](https://github.com/mozilla/pdf.js/releases/tag/v6.2.108),
[patched-version advisory](https://github.com/mozilla/pdf.js/security/advisories/GHSA-hq66-cqwq-w95j).

## Compatibility findings

- All inspected `getDocument` calls already pass parameter objects. Studio,
  listening cropping and QR verification already pass the canvas to `render`.
  `getPage`, `getViewport`, `getTextContent`, `Util.transform`, render cancellation
  and page cleanup remain available.
- Studio/dev worker routes still resolve `build/pdf.worker.min.mjs`. The QR
  verifier's `build/pdf.mjs` and `build/pdf.worker.mjs` still exist and work.
- The asset filename allowlists and MIME types cover the patched package's
  CMaps, standard fonts, WASM and JavaScript decoder files. Authentication,
  development-only access, traversal rejection and cache behavior were preserved.
- Existing production tracing includes retain the package metadata, all three
  asset directories, Studio worker and textbook PDF/worker modules. The isolated
  Lambda test copies only explicit tracing includes and checks installed assets;
  no tracing change was needed for this upgrade.
- The listening importer continues to use its existing `useSystemFonts` loader
  configuration. Adding CMap/decoder URLs is a separate existing capability gap,
  not required to fix the removed cleanup API.

Read `AGENTS.md` and the installed Next route-handler/output-tracing guides before
editing. Shared `node_modules` was linked only after the coordinator confirmed
installation complete; installed PDF.js is 6.2.108 and Vitest is 4.1.11.

## Verification

Node executable:
`C:/Users/user/AppData/Local/npm-cache/_npx/387698761821791d/node_modules/node/bin/node.exe`
(v24.21.0). Every Vitest command used `--maxWorkers 1 --no-file-parallelism --no-cache`.
The new checks also used `--configLoader native`.

| Check | Result |
| --- | --- |
| `devPdfAssets`, `studioPdfAssetsLambda`, `studioWorkspace`, `listeningPdfImport` | 4 files, 76 tests passed |
| `StudioView.pdfCleanup`, `StudioView.restoreCopy`, `listeningPdfImport.lifecycle` | 3 files, 10 tests passed |
| `PDFJS_COMPAT_TEST=1` + `pdfjsCompatibility.integration` | 1 real browser test passed |

**87 tests across 8 unique files passed.** The new browser check launches its own
headless Edge (installed executable 154.0.4258.62) and loopback server. It prints a
synthetic PDF, uses both actual worker route handlers with the patched module,
renders/re-renders one canvas (four rasters), invokes the actual listening adapter
for text extraction/two PNG question crops/cancellation, and invokes the actual
textbook QR verifier to decode a QR from final PDF pixels. Browser resources are
local or intercepted; it uses no application session, live DB or provider.

After formatting, the three new test files passed again (7 tests). The final QR
verification raster was visually inspected: both questions, circled choices and
the QR render clearly without clipping. Scoped ESLint over all 10 changed code/test
files passed with zero errors and one pre-existing unused `StudioAiProvider`
import warning in `StudioView.tsx:55`. `git diff --check` passed.

Reproduce the browser check with PowerShell:

```powershell
$env:PDFJS_COMPAT_TEST='1'
& 'C:/Users/user/AppData/Local/npm-cache/_npx/387698761821791d/node_modules/node/bin/node.exe' node_modules/vitest/vitest.mjs run src/__tests__/unit/pdfjsCompatibility.integration.test.ts --maxWorkers 1 --no-file-parallelism --no-cache --configLoader native
```

Set `PDFJS_COMPAT_RASTER` to an existing-directory PNG path to inspect the final
PDF raster without committing generated artifacts.

## Limits

No installation, dependency edits, live DB/provider access, external browser UI
control or push occurred in this worker. No full build or full TypeScript check
was run under the memory constraint; the coordinator owns the release build.
The tracing check is an isolated explicit-include simulation, not a new production
`.nft.json` build. The browser fixture covers embedded text and a raster QR, not
every scanned JBIG2/CCITT/JPX or nonembedded CJK document. Asset-byte tests confirm
those decoders/fonts are present, not that all such documents render. Safari,
Firefox and older browser versions were not exercised; upstream raised browser
requirements in [6.0](https://github.com/mozilla/pdf.js/pull/21152).
