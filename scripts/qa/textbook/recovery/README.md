This directory owns QA evidence and converters only. It never reads or writes the DB, changes production contracts, invokes the ZIP print renderer, or writes private manuscript content into Git.

The pinned reference is the original 259-page student PDF, SHA-256 `6c24ba6e65e7dd4dec18dd24fafe0fb483e0bde0f7bbd5144f6d2411d0c773d0`, and raw ZIP manuscript, SHA-256 `520d1f437599ac6cc627aa5ba9962844e7b8a98eb12d8521aa1b4797c3c00cdb`. `reference-manifest.json` contains only page kinds, stages, IDs, hashes and measurements. It selects all U01 pages 8–43, FRONT pages 1–7, and the first physical page of every remaining kind and exercise stage, including FINAL; 60 pages total. Both U01 curriculum section keys are retained in the private provenance output.

Use PowerShell from the repository root:

```powershell
$referenceSource = 'C:/Users/user/AppData/Local/Temp/textbook-v15-reference-20261004/인재원_KaTeX_교재조판기_v15'
$referenceOut = 'C:/Users/user/Downloads/교재_복구_실행검증_20261005/reference'
$env:PYTHONIOENCODING = 'utf-8'
python scripts/qa/textbook/recovery/inspect_reference.py --manuscript "$referenceSource/manuscript.json" --pdf 'C:/Users/user/Downloads/인재원_수학_2-1-1_수와식_학생용.pdf' --output $referenceOut --public-manifest scripts/qa/textbook/recovery/reference-manifest.json
python scripts/qa/textbook/recovery/source_css.py $referenceSource --output "$referenceOut/source-css-measurements.json" --public-output scripts/qa/textbook/recovery/source-css-measurements.json
node --conditions=react-server --import tsx scripts/qa/textbook/recovery/convert-reference.ts $referenceSource $referenceOut
node --conditions=react-server --import tsx scripts/qa/textbook/recovery/test-reference.ts $referenceSource $referenceOut
python scripts/qa/textbook/recovery/test_geometry.py --output "$referenceOut/guard-mutations.json"
node --max-old-space-size=8192 node_modules/typescript/bin/tsc --noEmit --pretty false -p scripts/qa/textbook/recovery/tsconfig.qa.json
node --conditions=react-server --import tsx scripts/qa/textbook/recovery/render-reference.ts $referenceOut base both
python scripts/qa/textbook/recovery/geometry.py "$referenceOut/new-u01-base-student.pdf" --witness "$referenceOut/new-u01-base-student-witness.json" --output "$referenceOut/new-u01-base-student-geometry.json"
python scripts/qa/textbook/recovery/geometry.py "$referenceOut/new-u01-base-answers.pdf" --witness "$referenceOut/new-u01-base-answers-witness.json" --output "$referenceOut/new-u01-base-answers-geometry.json"
```

`convert-reference.ts` produces `exchange-semantic.json`, a strict TextbookExchange with optional source nodes, and `exchange-base.json`, an explicitly documented compatibility projection. The original board remains a separate node; raw rows carry `textFormat: v15-tex`; speech titles, original question IDs, TeX bodies, public examples and unsolved confirmations are preserved. Source-authored concept1/2/3 diagrams and tables are extracted into the bounded safe fragment contract from the trusted original functions because their content is absent from the manuscript page objects. This extraction does not print or render the ZIP application. Private source trees and raw question records remain in `source-map.json` outside Git. Original chapter PNGs and the sanitized mindmap SVG are hash-verified image assets.

The render harness calls the existing `launchExportBrowser`, `renderTextbookChunk` and `mergeTextbookPdfs`. In `base` mode each original source page is scoped to a separate bounded call because the old continuation policy chains all 36 sections together; this is compatibility evidence, not G0 acceptance. `semantic` mode requires the integrated reference template isolation/renderers. Both outputs use the original U01 source, with answer pagination independent of student pagination and references supplied from verified student chunk pages.

`geometry.py` inventories all PDF pages, fonts, spans, images and horizontal vector operations. Its verification mode requires the matching PDF SHA and complete DOM coverage declarations. It checks 0.5 mm coordinates, row keys and phase-relative page splits, vector write-line width 0.2–0.35 mm, pitch 7±0.5 mm, written line length, thick grey bands, QR placement, dialogue fonts, semantic disabled nodes and student answer fields/roles. It deliberately does not search ordinary prose or choices for matching answer words. PDF spans cannot reveal a glyph clipped before painting; the DOM clipping witness remains required. Filled thin vector rectangles count as vector lines, while raster gradients do not.

The mutation suite proves failures for deliberately broken geometry and semantics; source conservation rejects changed answers and TeX. Those passes establish the QA guards and functional answer handling. They do not establish visual equality, editorial mathematics approval, G0b actual-bank assembly, saved draft/published compatibility, all human page review, or physical printing. Missing anchor/row/semantic DOM evidence is reported as failed coverage, never silently accepted.
