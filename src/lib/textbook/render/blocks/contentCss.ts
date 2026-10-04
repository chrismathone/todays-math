/**
 * Concept, recall and problem content. Loaded after the editorial CSS, so equal selectors win here.
 * Writing space is vector only: 0.265mm rules on a 7mm pitch, no fill and no gradient.
 * Values of the nested concept layout come from the v15 source stylesheets.
 * `.tb-memory-source` is a sheet converted from an original v15 page: it keeps that page's title
 * leading (1.65) and row padding (1.5mm), has no 7mm body floor, and a single writing line fills
 * its row as one bottom rule. Sheets written from the bank keep the defaults above those rules.
 */
const RULE = ".265mm solid #bfcdbd";
/** Source-authored concept pages (concept1–3), wrapped by the shared fragment renderer. */
const C = '.tb-source-fragments[data-source-kind^="concept"]';

export const TEXTBOOK_CONTENT_CSS = `
.tb-work-area{display:block;margin-top:2mm}.tb-work-lines{width:100%;padding:0;background:none}.tb-work-line{height:7mm;border-bottom:${RULE};background:none}
.tb-write-line{display:block;flex:none;height:7mm;border-bottom:${RULE}}
.tb-blank{display:inline-block;vertical-align:-.35em;height:1.5em;min-width:22mm;max-width:100%;margin:0 .6mm;background:none;border:0;border-bottom:.265mm solid #a6b8a5}
.tb-blank-sentence{display:flex;flex-direction:column;justify-content:flex-end;width:100%;height:auto;min-width:0;margin:0;border:0;background:none;vertical-align:top}.tb-recall-content .tb-blank-sentence{margin:1.5mm 0}
.tb-problem-main{min-width:0}.tb-problem-has-qr>.tb-problem-main{display:grid;grid-template-columns:minmax(0,1fr) 24mm;column-gap:3mm;align-items:start}.tb-problem-main>.tb-qr{margin:0;align-self:start}
.tb-problem[data-example-role] .tb-problem-head>span:first-of-type{margin-left:auto}
.tb-memory{padding:0 0 3mm;border-bottom:.65pt solid var(--tb-light)}
.tb-memory-title{display:flex;align-items:center;gap:2.3mm;min-height:7mm;margin-bottom:2.3mm;padding:0 0 1.5mm;border-bottom:.6pt solid var(--tb-light);font-size:10pt;line-height:1.5}.tb-memory-title b{font-size:10.5pt;letter-spacing:-.2px;color:var(--tb-dark)}
.tb-memory-code{display:flex;align-items:center;justify-content:center;min-width:10mm;padding:1.3mm 1.5mm;border-radius:0 2mm 0 2mm;background:var(--tb-accent);color:#fff;font-size:7pt;font-weight:700;letter-spacing:-.2px}
.tb-memory-rounds{margin-left:auto;font-size:5.7pt;color:#83948b;white-space:nowrap}.tb-memory-rounds i{display:inline-block;width:1.7mm;height:1.7mm;margin:0 1mm 0 .5mm;border:.265mm solid #a7b7ac;border-radius:50%;vertical-align:middle}
.tb-memory-row{display:grid;grid-template-columns:24mm minmax(0,1fr);column-gap:2mm;margin:1.4mm 0;padding-block:1.1mm;font-size:8.3pt;line-height:1.9;word-break:keep-all}
.tb-memory-label{padding-top:.7mm;font-size:7.4pt;font-weight:700;color:var(--tb-accent)}
.tb-memory-body{min-width:0;min-height:calc(var(--tb-row-lines,1)*7mm)}.tb-memory-body p{margin:0}
.tb-memory-body>.tb-blank-sentence{height:100%;min-height:calc(var(--tb-row-lines,1)*7mm)}
.tb-memory-row-measured .tb-memory-body,.tb-memory-row-measured .tb-memory-body>.tb-blank-sentence{min-height:0;height:100%}
.tb-memory-source .tb-memory-title{line-height:1.65}
.tb-memory-source .tb-memory-row{padding-block:1.5mm}
.tb-memory-source .tb-memory-body,.tb-memory-source .tb-memory-body>.tb-blank-sentence{min-height:0}
.tb-memory-source .tb-blank-sentence>.tb-write-line:only-child{flex:1 1 auto;height:auto;min-height:calc(var(--tb-row-lines,1)*1.9em)}
.tb-memory-source .tb-memory-row-measured .tb-write-line:only-child{min-height:0}
.tb-memory .tb-blank-keyword,.tb-term-recall .tb-blank-keyword{min-width:0}
.tb-memory-key{border-bottom:.265mm solid var(--tb-accent);color:var(--tb-accent);font-weight:700}
.tb-error-item{padding:2mm 0 2.5mm;border-bottom:.265mm solid var(--tb-light);font-size:9pt;line-height:1.9;word-break:keep-all}.tb-error-statement p{margin:0}
.tb-error-answer{display:grid;grid-template-columns:18mm minmax(0,1fr);column-gap:3mm;align-items:end;margin-top:1mm}
.tb-error-ox{display:flex;gap:2mm;padding-bottom:1mm}.tb-error-ox i{display:inline-flex;align-items:center;justify-content:center;width:7mm;height:7mm;border:.265mm solid #a7b7ac;border-radius:50%;font-style:normal;font-size:10pt;line-height:1;color:#6f8179}
.tb-term-row{display:grid;grid-template-columns:34mm minmax(0,1fr);column-gap:3mm;align-items:start;padding:1.6mm 0;border-bottom:.265mm solid var(--tb-light);font-size:8.8pt;line-height:1.9;word-break:keep-all}
.tb-term-name .tb-blank{width:100%;margin:0}.tb-term-definition p{margin:0}
.tb-concept-rows{border-top:.6pt solid var(--tb-light)}
.tb-concept-row{display:grid;grid-template-columns:23mm minmax(0,1fr);column-gap:3mm;padding:2.2mm 3mm;border-bottom:.55pt solid var(--tb-light);font-size:8.8pt;line-height:1.9;word-break:keep-all}
.tb-concept-row:first-child{padding:3.2mm 4.5mm;border-bottom:0;border-left:2.3pt solid var(--tb-accent);border-radius:0 4mm 0 0;background:var(--tb-soft);color:var(--tb-dark);font-size:10pt;line-height:1.85}
.tb-concept-row-label{padding-top:.5mm;font-size:7.5pt;font-weight:700;color:var(--tb-accent)}.tb-concept-row-body{min-width:0}.tb-concept-row-body p{margin:0}.tb-concept-row-body p+p{margin-top:1.2mm}
${C}{display:flex;flex-direction:column;gap:2.6mm;min-width:0}
${C} .section-label{display:flex;align-items:center;gap:2.4mm;margin:2mm 0 1.5mm;color:var(--tb-accent);font-size:10.8pt;font-weight:700;letter-spacing:-.3px;line-height:1.5}
${C} .section-label>span:first-child{flex:none;width:6.3mm;height:6.3mm;border-radius:0 2mm 0 2mm;background:var(--tb-accent);color:#fff;font-size:8.6pt;line-height:6.3mm;text-align:center}
${C} .rule-box{position:relative;padding:3.5mm 4.5mm;border-left:2.3pt solid var(--tb-accent);border-radius:0 4mm 0 0;background:var(--tb-soft);color:var(--tb-dark);font-size:10pt;line-height:1.85;word-break:keep-all}
${C} .rule-box h3{margin:0 0 2mm;color:var(--tb-accent);font-size:10.2pt;line-height:1.6}${C} .rule-box p{margin:0}${C} .rule-box>strong{padding:0 .5mm;box-shadow:inset 0 -.45em 0 var(--tb-signal)}
${C} .definition-figure{display:grid;grid-template-columns:30mm minmax(0,1fr);gap:4mm;align-items:center;padding:4mm;border-bottom:.65pt solid var(--tb-light);background:#fbfcfa}
${C} .definition-figure>.root-label{display:flex;align-items:center;justify-content:center;justify-self:center;width:22mm;height:22mm;border-radius:50%;background:var(--tb-accent);color:#fff;font-size:10.5pt}
${C} .branches{display:flex;flex-direction:column;gap:5mm;padding-left:5mm;border-left:1pt solid var(--tb-accent)}
${C} .branches>div{position:relative;display:flex;align-items:center;justify-content:space-between;font-size:8.8pt}${C} .branches>div:before{content:'';position:absolute;left:-5mm;top:50%;width:3.5mm;border-top:.6pt solid var(--tb-accent)}${C} .branches strong{color:var(--tb-accent)}
${C} .note{padding:2.3mm 3mm;border-radius:0 2mm 2mm 2mm;background:#fbf8ef;color:#666453;font-size:8pt;line-height:1.85;word-break:keep-all}
${C} .note strong{display:inline-block;margin-right:2mm;padding-bottom:.3mm;border-bottom:1.5pt solid #e4cd91;color:#7a693e;font-size:7.3pt}
${C} .decimal-pair{display:grid;grid-template-columns:1fr 1fr;gap:4mm}${C} .decimal-pair>div{padding:3mm 4mm;border-top:1.4pt solid var(--tb-accent);background:#f7faf7}${C} .decimal-pair>div+div{border-top-color:#b6bdad;background:#fafaf5}
${C} .decimal-pair h3{margin:0;color:var(--tb-accent);font-size:9pt}${C} .decimal-pair .big{margin:2.5mm 0;color:var(--tb-dark);font-size:17pt}${C} .decimal-pair p{margin:0;font-size:8.2pt;line-height:1.85}
${C} .example-strip{display:grid;grid-template-columns:23mm minmax(0,1fr);gap:3mm;padding:2.6mm 3.5mm;border-top:.55pt solid var(--tb-light);border-bottom:.55pt solid var(--tb-light);font-size:8.8pt;line-height:1.95}
${C} .example-strip .label{align-self:center;padding-left:2mm;border-left:2pt solid var(--tb-signal);color:var(--tb-accent);font-size:7.5pt;font-weight:700}${C} .example-strip p{margin:0}
${C} .cycle-strip{display:flex;align-items:center;justify-content:center;gap:2mm;margin:3mm 0}${C} .cycle-strip>span{padding:1.1mm 3mm;border-radius:2mm;background:#fff;box-shadow:0 1pt 0 var(--tb-accent);font-size:14pt}
${C} .cycle-strip .prefix{background:#fbefca;box-shadow:0 1pt 0 #d5ab52}${C} .cycle-strip .dots{padding:1mm;background:none;box-shadow:none}
${C} .small{font-size:8pt;line-height:1.85}
${C} .grid-table{width:100%;border-collapse:collapse;font-size:8.3pt;line-height:1.8}${C} .grid-table th{padding:2.2mm 3mm;border:0;border-top:1.5pt solid var(--tb-accent);background:var(--tb-soft);color:var(--tb-accent);font-size:7.5pt;text-align:left}
${C} .grid-table td{padding:2.4mm 3mm;border:0;border-bottom:.5pt solid var(--tb-light);vertical-align:top}
${C} .index-table{width:100%;margin:2mm 0;border-collapse:collapse;font-size:9.2pt;text-align:center}${C} .index-table th,${C} .index-table td{padding:1.8mm 1mm;border:.265mm solid #d3e2d8}
${C} .index-table td{background:#fff}${C} .index-table th{background:var(--tb-accent);color:#fff;font-size:7.5pt}${C} .index-table .highlight{background:var(--tb-signal);color:var(--tb-dark);font-weight:700}
${C} .explain-grid{display:grid;grid-template-columns:1fr 1fr;gap:4mm}${C} .explain-grid>div{padding:2.5mm 3.5mm;border-left:1.5pt solid var(--tb-light);background:#fafcf9;font-size:8.7pt;line-height:1.9}${C} .explain-grid h3{margin:0 0 1.5mm;color:var(--tb-accent);font-size:8.8pt}
${C} .subheading{display:flex;align-items:center;justify-content:space-between;margin-top:2mm;padding-bottom:2mm;border-bottom:1pt solid var(--tb-accent)}${C} .subheading h2{margin:0;color:var(--tb-accent);font-size:11pt;letter-spacing:-.4px}
${C} .subheading h2:before{content:'CHECK';display:inline-block;margin-right:2.2mm;padding:.6mm 1.4mm;background:var(--tb-signal);color:var(--tb-accent);font-size:6.5pt;letter-spacing:.6px;vertical-align:middle}
${C} .question-grid:empty{display:none}
${C} .checkbar{display:flex;align-items:center;justify-content:space-between;gap:2mm;padding:2mm 0 0;border-top:.7pt solid var(--tb-light);font-size:7.3pt}${C} .checkbar>strong{color:var(--tb-accent);font-size:7.6pt;line-height:1.6}
${C} .checkbar>span{color:#89958e;font-size:6.7pt;white-space:nowrap}${C} .checkbar span:empty{display:inline-block;width:1.8mm;height:1.8mm;margin:0 .8mm;border:.265mm solid #a7b6ab;border-radius:50%;vertical-align:middle}
`;
