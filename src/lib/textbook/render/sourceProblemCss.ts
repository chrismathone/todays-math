/** Native v15 question values, scoped to source projections; saved and bank layouts keep their styles. */
export const SOURCE_PROBLEM_CSS = `
.tb-editorial[data-source-tone="forest"],.tb-paper[data-source-tone="forest"]{--tb-accent:#086c61;--tb-dark:#073f3b;--tb-soft:#edf5f0;--tb-light:#d6e4df;--tb-signal:#d6ed75;--tb-subink:#526461;color:#253836}
.tb-editorial[data-source-tone="tree"],.tb-paper[data-source-tone="tree"]{--tb-accent:#6250a0;--tb-dark:#342752;--tb-soft:#f3f0f8;--tb-light:#e1dced;--tb-signal:#ffbea4;--tb-subink:#635d70;color:#253836}
.tb-source-problem:not([data-example-role]){padding:3mm 0 3mm;border:0;min-height:0}
.tb-source-problem .tb-problem-head strong{font-size:12.5pt;line-height:1.1;letter-spacing:-.5px}
.tb-source-problem .tb-problem-head strong span{font:inherit;line-height:inherit;letter-spacing:inherit;color:inherit;background:none;padding:0;border-radius:0}
.tb-source-fragments .daily-banner{display:flex;justify-content:space-between;align-items:baseline;background:var(--tb-soft);padding:3mm 4mm;border-top:1.4pt solid var(--tb-accent);border-radius:0 3mm 0 0}
.tb-source-fragments .daily-banner>strong{font-size:10pt;color:var(--tb-accent)}.tb-source-fragments .daily-banner>span{font-size:7pt;color:var(--tb-subink,#526461)}
.tb-source-fragments .return-strip{border-top:.6pt solid var(--tb-light);padding-top:3mm;display:flex;gap:4mm;font-size:7.3pt;align-items:baseline}.tb-source-fragments .return-strip>strong{color:var(--tb-accent);white-space:nowrap}
.tb-source-problem .tb-problem-head{flex-wrap:nowrap;min-height:5.5mm;margin-bottom:1.2mm;line-height:1.65}
.tb-editorial-problem[data-source-kind] .tb-source-problem{height:auto}
.tb-source-fragments[data-source-kind="basic"] .mini-concepts{display:grid;grid-template-columns:1fr 1fr;gap:4mm}
.tb-source-fragments[data-source-kind="basic"] .mini-concepts>div{padding:2mm 3mm;border:0;border-top:1.3pt solid var(--tb-accent);border-radius:0 3mm 0 0;background:var(--tb-soft);font-size:7.8pt;line-height:1.8}
.tb-source-fragments[data-source-kind="basic"] .mini-concepts strong{display:block;font-size:8.2pt;line-height:1.65;margin-bottom:1mm;color:var(--tb-accent)}
.tb-source-question-grid{position:absolute;min-width:0}
.tb-source-question-grid:before{content:'';position:absolute;left:50%;top:1mm;bottom:2mm;border-left:.5pt solid #edf0eb}
.tb-source-problem .tb-problem-head>.tag{margin-left:auto;font-size:6.5pt;line-height:1.65;padding:.7mm 1.5mm;border-radius:0;background:var(--tb-soft);color:var(--tb-accent);font-weight:700}
.tb-source-problem[data-example-role] .tb-problem-question>.tb-prose{min-height:12mm}
.tb-source-problem[data-source-kind^="concept"]:not([data-example-role]){padding:1mm 0 3mm}
.tb-source-problem[data-source-kind="scriptcheck"]{padding:1mm 0}
.tb-source-problem[data-source-kind="basic"]{padding:1.4mm 0}
.tb-source-problem[data-source-kind="basic"] .tb-problem-head{min-height:4.5mm;margin-bottom:.3mm}
.tb-source-problem[data-source-kind="basic"] .tb-prose{font-size:8.5pt;line-height:1.8}
.tb-source-problem[data-source-kind="drill"]{padding:2.5mm 0 2mm}
.tb-source-problem[data-source-kind="exercise"]{padding:2mm 0;min-height:40mm}
.tb-source-problem[data-source-kind="practice"]{padding:2.5mm 0 3mm}
.tb-source-problem[data-source-kind="reasoning"]{padding:3mm 0}
.tb-source-problem[data-source-kind="reasoning"] .tb-prose{font-size:9.6pt;line-height:1.95}
.tb-source-problem[data-source-kind="reasoning"] .tb-work-area{margin-top:3mm}
.tb-editorial[data-source-kind="scriptcheck"] .tb-stage-head{min-height:20mm}
.tb-editorial[data-source-kind="basic"] .tb-stage-head{min-height:21mm}
.tb-editorial[data-source-kind="drill"] .tb-stage-head{min-height:20mm}
`;
