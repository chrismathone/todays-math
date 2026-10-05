/** Native v15 question values, scoped to source projections; saved and bank layouts keep their styles. */
export const SOURCE_PROBLEM_CSS = `
.tb-editorial[data-source-tone="forest"],.tb-paper[data-source-tone="forest"]{--tb-accent:#086c61;--tb-dark:#073f3b;--tb-soft:#edf5f0;--tb-light:#d6e4df;--tb-signal:#d6ed75;--tb-subink:#526461;color:#253836}
.tb-editorial[data-source-tone="tree"],.tb-paper[data-source-tone="tree"]{--tb-accent:#6250a0;--tb-dark:#342752;--tb-soft:#f3f0f8;--tb-light:#e1dced;--tb-signal:#ffbea4;--tb-subink:#635d70;color:#253836}
.tb-source-problem:not([data-example-role]){padding:3mm 0 3mm;border:0;min-height:0}
.tb-source-problem .tb-problem-head strong,.tb-recovery .tb-source-problem[data-example-role] .tb-problem-head strong{font-size:12.5pt;line-height:1.1;letter-spacing:-.5px}
.tb-source-problem .tb-problem-head>strong,.tb-source-problem .tb-problem-head>.tag{flex:none;white-space:nowrap;overflow-wrap:normal;word-break:normal}
.tb-source-problem .tb-problem-head strong span{font:inherit;line-height:inherit;letter-spacing:inherit;color:inherit;background:none;padding:0;border-radius:0}
.tb-source-fragments .daily-banner{display:flex;justify-content:space-between;align-items:baseline;background:var(--tb-soft);padding:3mm 4mm;border-top:1.4pt solid var(--tb-accent);border-radius:0 3mm 0 0}
.tb-source-fragments .daily-banner>strong{font-size:10pt;color:var(--tb-accent)}.tb-source-fragments .daily-banner>span{font-size:7pt;color:var(--tb-subink,#526461)}
.tb-source-fragments .return-strip{border-top:.6pt solid var(--tb-light);padding-top:3mm;display:flex;gap:4mm;font-size:7.3pt;align-items:baseline}.tb-source-fragments .return-strip>strong{color:var(--tb-accent);white-space:nowrap}
.tb-source-fragments[data-source-kind="exercise"] .review-note{border-top:.6pt solid var(--tb-light);padding-top:3mm;font-size:8pt;line-height:1.65;display:flex;gap:4mm;margin-top:3mm}
.tb-source-fragments[data-source-kind="exercise"] .review-note>strong{color:var(--tb-accent);white-space:nowrap}
.tb-source-problem .tb-problem-head{flex-wrap:nowrap;min-height:5.5mm;margin-bottom:1.2mm;line-height:1.65}
.tb-editorial-problem[data-source-kind] .tb-source-problem{height:auto}
.tb-source-fragments[data-source-kind="basic"] .mini-concepts{display:grid;grid-template-columns:1fr 1fr;gap:4mm}
.tb-source-fragments[data-source-kind="basic"] .mini-concepts>div{padding:2mm 3mm;border:0;border-top:1.3pt solid var(--tb-accent);border-radius:0 3mm 0 0;background:var(--tb-soft);font-size:7.8pt;line-height:1.8}
.tb-source-fragments[data-source-kind="basic"] .mini-concepts strong{display:block;font-size:8.2pt;line-height:1.8;margin-bottom:1mm;color:var(--tb-accent)}
.tb-source-question-grid{position:absolute;min-width:0}
.tb-source-question-grid:before{content:'';position:absolute;left:50%;top:1mm;bottom:2mm;border-left:.5pt solid #edf0eb}
.tb-source-problem .tb-problem-head>.tag{margin-left:auto;font-size:6.2pt;line-height:1.65;padding:.5mm 1.5mm;border-radius:4mm;background:var(--tb-soft);color:var(--tb-accent);font-weight:700}
.tb-source-problem .tb-prose{overflow-wrap:normal}
.tb-source-problem [data-textbook-math],.tb-source-fragments .math{display:inline-block;white-space:nowrap;vertical-align:baseline}
.tb-source-problem[data-example-role] .tb-problem-question>.tb-prose{min-height:12mm}
.tb-source-example-heading .tb-example-strategy{display:flex;align-items:baseline;gap:2mm}
.tb-source-example-heading .tb-example-strategy>b{flex:none;font-size:6.6pt;font-weight:700;color:var(--tb-dark);background:var(--tb-signal);padding:.35mm 1.4mm;border-radius:4mm}
.tb-recovery .tb-source-problem[data-example-role="example"]{position:relative;border-radius:0 5mm 0 0}
.tb-recovery .tb-source-problem[data-example-role="example"]:before{content:'';position:absolute;top:0;left:0;height:1.2mm;width:12mm;background:var(--tb-accent)}
.tb-source-problem[data-example-role="example"] .tb-problem-head>.tag{background:white;border:.5pt solid var(--tb-light)}
.tb-source-problem[data-source-kind^="concept"]:not([data-example-role]){padding:1mm 0 3mm}
.tb-source-problem[data-source-kind="scriptcheck"]{padding:1mm 0}
.tb-source-problem[data-source-kind="basic"]{padding:1.4mm 0}
.tb-source-problem[data-source-kind="basic"] .tb-problem-head{min-height:4.5mm;margin-bottom:.3mm}
.tb-source-problem[data-source-kind="basic"] .tb-prose{font-size:8.5pt;line-height:1.8}
.tb-source-problem[data-source-kind="drill"]{padding:2.5mm 0 2mm}
.tb-source-problem[data-source-kind="exercise"]{padding:2mm 0;min-height:40mm}
.tb-source-problem[data-source-kind="practice"]{padding:2.5mm 0 3mm}
.tb-source-problem[data-source-kind="practice"] .tb-problem-head{margin-bottom:2mm}
.tb-source-problem[data-source-kind="clinic"]{padding:2.5mm 0 3mm}
.tb-source-fragments[data-source-kind="practice"] .reflection{background:var(--tb-soft);border:0;border-radius:0 4mm 0 0;padding:3mm 4mm;font-size:8pt;line-height:1.8}
.tb-source-fragments[data-source-kind="practice"] .reflection strong{display:block;color:var(--tb-accent);font-size:9pt;margin-bottom:1.3mm}
.tb-source-problem[data-source-kind="reasoning"]{padding:3mm 0}
.tb-source-problem[data-source-kind="reasoning"] .tb-prose{font-size:9.6pt;line-height:1.95}
.tb-source-problem[data-source-kind="reasoning"] .tb-work-area{margin-top:3mm}
.tb-editorial[data-source-kind="scriptcheck"] .tb-stage-head{min-height:20mm}
.tb-editorial[data-source-kind="basic"] .tb-stage-head{min-height:21mm}
.tb-editorial[data-source-kind="drill"] .tb-stage-head{min-height:20mm}
.tb-editorial[data-source-kind="recall"] .tb-stage-head{min-height:23mm}
.tb-source-fragments[data-source-kind="drill"] .drill-labels{display:grid;grid-template-columns:1fr 1fr;gap:9mm;font-size:8pt;line-height:1.65;color:var(--tb-accent)}
.tb-source-fragments[data-source-kind="drill"] .drill-labels strong{padding:1.5mm 0;border-bottom:1.5pt solid var(--tb-accent);background:none}
.tb-recovery .tb-source-problem[data-example-role="example"] .tb-worked{font-size:8.3pt;line-height:1.95;border-top:.55pt solid var(--tb-light)}
.tb-recovery .tb-source-problem[data-example-role="example"] .tb-worked h4{display:table;font-size:7pt;line-height:1.95;margin:0 0 1.5mm;background:white;padding:.3mm 1.6mm;border-radius:4mm}
.tb-recovery .tb-source-problem[data-example-role="example"] .tb-worked-answer{display:block;font-size:8.5pt;line-height:1.65;border-top:.5pt solid var(--tb-light);padding:1.5mm 0 0;margin-top:2mm;color:var(--tb-accent)}
.tb-source-problem[data-example-role="example"] .tb-worked-answer>b{display:inline-block;padding:0 1mm 0 0;font-size:7pt;line-height:1.65}
.tb-source-problem[data-example-role="example"] .tb-worked-answer p{display:inline}
.tb-recovery .tb-source-problem[data-example-role="confirm"]:not([data-confirm-index="0"]){margin-top:1mm;padding-top:2.5mm}
`;
