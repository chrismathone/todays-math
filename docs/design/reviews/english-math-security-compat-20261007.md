# English D: math security patch compatibility, 2026-10-07

KaTeX 0.18.2 and the MathJax transitive xmldom 0.9.12 work with the reviewed rendering paths after three minimal selector corrections. No unresolved regression remains in the checks below. Dependency files, installation, production build and push belong to the coordinator.

## What changed

[KaTeX 0.18.0 introduced prefixed internal CSS classes](https://github.com/KaTeX/KaTeX/blob/v0.18.2/CHANGELOG.md). The installed 0.18.2 output required these corrections:

- Operator-limit styling: `.sizing` becomes `.katex-sizing`; limits retain the existing 0.6 scale and ordinary exponents remain unaffected.
- Textbook fraction choices: extent detection reads `.katex-strut` and spacing targets `.katex-base`. Without this, 12 existing assertions failed and fraction choices lost their spacing rows.
- HWPX export: the first formula baseline is measured from `.katex-base > .katex-strut`, rather than falling back to the enclosing box bottom.

The associated browser measurement selectors and print-check reference were updated. The command census was regenerated using the existing generator: 883 commands and 178 infix commands are unchanged; only its version marker moved from 0.16.47 to 0.18.2.

The operator-limit test now checks the production selector against actual rendered integral, sum and limit formulas. The HWPX regression uses the actual editor renderer and asserts its first-line baseline. All 20 historical parity hashes still match after normalizing only the explicit upstream class renames in class attributes. The stored hash fixture was not rewritten; the remainder of the HTML must still match byte for byte.

## Exact verification results

Environment: Node **24.21.0**, Vitest **4.1.11**, TypeScript **5.9.3**, KaTeX **0.18.2**, mathjax-full **3.2.1**, speech-rule-engine **4.1.4**, xmldom **0.9.12**. This worktree used a junction to the coordinator's stable `todayenglish-hifi/node_modules` after the installation-ready notification. No packages were installed or modified here.

All Vitest runs used `--maxWorkers=1 --no-file-parallelism --no-cache --configLoader runner`. Final results, counting repeated files only once: **19 files, 234 tests passed; 4 intentionally unselected figure-engine tests skipped**.

| Check | Result |
| --- | --- |
| Original upgrade reproduction | 4 files: 13 failed, 25 passed. Twelve failures were fraction-choice rendering; one was the stale census version. |
| Main rendering battery | 15 files: 212 passed, 2 failed. The remaining failures were the historical raw hashes and the newly strengthened baseline assertion's initial expectation. Both were corrected and rerun below. The other 13 files contributed 196 passing tests. |
| Final rerun: `hwpxLayout`, `renderParity`, `figureLabelUpright` (components), `figureEditorMixedLabel`, `figureDropSafety` | 5 files, 33 passed, 0 failed. This replaces the two failed files in the preceding run and adds three MathJax/editor files. |
| Server `figureLabelTypeset`, selected core checks | 1 file, 5 passed, 4 skipped by the explicit test-name filter. Actual glyph paths, CJK fallback, placement metrics, halo and label width table checked. |
| Scoped ESLint | 6 changed implementation/test/QA files, exit 0, no diagnostics. |
| Focused TypeScript API probe, no emit | Native KaTeX types and rehype options checked with both production safe-render helpers; 11 project source files, 0 diagnostics, 0 emitted files. No full-project type check. |
| Package/CSS/font probe | App, rehype-katex and remark-math resolve the same KaTeX 0.18.2 package. Native `types/katex.d.ts` exists. CSS contains the new selectors and 0.18.2 marker; all 60 referenced font assets exist. |
| MathJax + patched xmldom runtime probe | Five actual labels (`125°`, `5 cm`, `A`, fraction, radical) produce 15 glyph paths in total. Positive metrics, safe fragments, no font-dependent text or broken `use` references, 0 XML parse errors; serialization/reparse preserves SVG namespace, paths and label metadata. SRE's Node DOMParser is the patched parser; Korean fallback remains intact. |
| Headless Edge screen and print smoke | Edge **154.0.4258.62**: 5 fraction-choice rows, minimum formula gap **17.40625 px**, formula margin **8.712 px**, operator scale **0.6**, 3 loaded KaTeX font faces, 7 semantic MathML formulas with hidden MathML styling, repeat-dot class retained, 0 error/fallback nodes and 0 blocked/missing asset requests, in both media modes. |

The 13 other files in the main battery were `katexCommands.sync`, `textbookFractionChoices`, `opLimitScale`, `katexRender`, `renderMathHtml`, `uiKatexOptions`, `mathRenderQaParity`, `MathText`, `sourceMathAccessibility`, `ExplorerMathKatex`, `boxRender`, `tableCellMath`, and `normalizeMathgenText`.

Representative reproduction commands (substitute the supplied Node 24 executable for `node`):

```powershell
node node_modules/tsx/dist/cli.mjs scripts/qa/gen-katex-commands.ts
node node_modules/vitest/vitest.mjs run --maxWorkers=1 --no-file-parallelism --no-cache --configLoader runner src/__tests__/unit/hwpxLayout.test.ts src/__tests__/unit/renderParity.test.tsx src/__tests__/components/figureLabelUpright.test.ts src/__tests__/unit/figureEditorMixedLabel.test.ts src/__tests__/unit/figureDropSafety.test.ts
node node_modules/vitest/vitest.mjs run --maxWorkers=1 --no-file-parallelism --no-cache --configLoader runner src/__tests__/unit/figureLabelTypeset.test.ts --testNamePattern '조판이 살아|글리프가 없는|조판된 라벨은|halo 는|글자 폭 표'
```

## Boundaries and handoff

The production MathJax label helpers use `liteAdaptor`; xmldom enters through the optional speech-rule-engine dependency. The probe explicitly checked that transitive resolution and parsed actual MathJax SVG with the patched parser, without implying that the ordinary label path uses xmldom. [xmldom 0.9.12's release notes](https://github.com/xmldom/xmldom/releases/tag/0.9.12) describe parser complexity fixes with preserved serialized output.

The private frozen textbook/PDF corpus integration was not run; its affected browser selectors were updated and synthetic fraction rendering was checked in real screen/print media. No full build, full-project tsc, live database, provider request, dependency write, or push was performed. All seven background command sessions started by this worker exited, and the headless browser was closed. No background verification work remains for handoff.
