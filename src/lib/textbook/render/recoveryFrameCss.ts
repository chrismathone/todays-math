/** Measured v15 frame values. Applied only to semantic recovery projections. */
export const RECOVERY_FRAME_CSS = `
.tb-recovery{font-size:10pt;line-height:1.65}
.tb-recovery .tb-stage-subtitle{margin:0}
.tb-recovered .tb-footer-brand{font-size:6.8pt;line-height:1.65;display:flex;align-items:center;gap:2mm}
.tb-recovered .tb-footer-brand i{margin-left:0}
.tb-source-study-footer{position:absolute;top:270mm;height:8mm}
.tb-source-study-footer>.study-footer{display:flex;justify-content:space-between;align-items:baseline;height:8mm;padding-top:1.5mm;border-top:.7pt solid var(--tb-light);font-size:6.8pt;line-height:1.6;color:#84958a}
.tb-source-page-footer{position:absolute;top:270mm;height:8mm;font-size:10pt;line-height:1.65}
.tb-source-page-footer>.checkbar{display:flex;justify-content:space-between;align-items:baseline;height:8mm;margin:0;padding:1.5mm 0 0;border-top:.5pt solid var(--tb-light);font-size:7.3pt;line-height:1.6;color:var(--tb-accent);background:none}
.tb-source-page-footer>.checkbar>strong,.tb-source-page-footer>.checkbar>b{font-size:7.6pt;line-height:1.6}
.tb-source-page-footer>.checkbar>span{font-size:6.7pt;color:#89958e;white-space:nowrap}
.tb-source-page-footer .checkbar em:empty{display:inline-block;width:1.8mm;height:1.8mm;margin:0 .8mm;border:.265mm solid #a7b6ab;border-radius:50%;vertical-align:middle}
.tb-continuation-label{position:absolute;right:22mm;top:0;font-size:7pt;line-height:1.65;color:var(--tb-accent)}
.tb-recovery .tb-stage-head{min-height:23mm;padding:0 19mm 0 0}.tb-recovery .tb-kicker{line-height:1.65}.tb-recovery .tb-section-heading{letter-spacing:-1.35px}.tb-recovery .tb-progress{margin-top:3mm;line-height:1.65}.tb-recovery .tb-stage-number{letter-spacing:-3px}
.tb-recovery.tb-stage-concept .tb-stage-head{min-height:25mm;padding-right:29mm}.tb-recovery.tb-stage-concept .tb-section-heading{font-size:23pt}.tb-recovery.tb-stage-recall .tb-stage-head{min-height:22mm}
.tb-recovered .tb-header{top:10mm;height:6mm;border:0;padding:0;align-items:center}.tb-recovered .tb-running-context small{display:inline}
.tb-recovery.tb-stage-opening .tb-stage-head{min-height:25mm;padding:3.5mm 22mm 3.5mm 5mm;border-left:1.5pt solid var(--tb-accent)}
.tb-recovery.tb-stage-opening .tb-kicker{font-size:6.4pt;line-height:1.65;margin-bottom:1.5mm;letter-spacing:.1em}
.tb-recovery.tb-stage-opening .tb-section-heading{font-size:23pt;letter-spacing:-.9px;margin-bottom:1.5mm}
.tb-recovery.tb-stage-opening .tb-stage-subtitle{font-size:9.2pt;line-height:1.7;color:var(--tb-accent)}
.tb-source-fragments p{margin:0}.tb-source-fragments h2,.tb-source-fragments h3,.tb-source-fragments h4{margin:0;line-height:1.5}
.tb-source-fragments[data-source-kind^="concept"] .section-label>em:first-child{flex:none;width:6.3mm;height:6.3mm;border-radius:0 2mm 0 2mm;background:var(--tb-accent);color:white;font-size:8.6pt;line-height:6.3mm;text-align:center;font-style:normal}
.tb-recovered .tb-dialogue-page-note{position:absolute;top:270mm;height:8mm}.tb-dialogue-page-note .tb-dialogue-continue{height:100%;align-items:center}
.tb-source-fragments{min-width:0}.tb-source-fragments[data-source-kind="unitSpreadLeft"],.tb-source-fragments[data-source-kind="unitSpreadRight"]{height:254mm;position:relative;background:#f2f6ef;--tb-accent:#0c6b5b;--tb-light:#cbded2}
.tb-recovered[data-template-key^="reference-unitSpread"]{background:#f2f6ef}.tb-recovered[data-template-key^="reference-unitSpread"] .tb-edge-tab{display:none}
.tb-recovery .tb-pair-heading{padding:0;background:none;border:0;font-size:10pt;line-height:1.65}
.tb-pair-heading .tb-paired-title{display:flex;align-items:center;gap:3mm;min-height:10mm;margin-bottom:2mm;padding-bottom:2mm;border-bottom:1pt solid var(--tb-accent)}
.tb-pair-heading .tb-paired-title h3{font-size:12pt;line-height:1.4;margin:0;color:var(--tb-dark);letter-spacing:-.4px}.tb-pair-index{display:flex;gap:1.4mm;align-items:baseline;min-width:15mm;color:var(--tb-accent)}.tb-pair-index small{font-size:7pt;letter-spacing:-.3px}.tb-pair-index b{font-size:23pt;line-height:1;letter-spacing:-1.2px;font-weight:700}
.tb-pair-heading .tb-example-strategy{padding:0;background:none;font-size:7.8pt;line-height:1.8;margin-bottom:3mm}.tb-example-strategy p{margin:0}
.tb-recovery .tb-problem[data-example-role]{padding:3mm 0 2mm;border-top:.6pt solid var(--tb-light);border-radius:0;background:none}
.tb-recovery .tb-problem[data-example-role="example"]{border:0;padding:3mm 3.8mm;background:var(--tb-soft)}
.tb-recovery .tb-problem[data-confirm-index="0"]{padding-top:0;border-top:0}
.tb-recovery .tb-problem[data-example-role] .tb-problem-head{height:6mm;min-height:6mm;margin-bottom:1.5mm;line-height:1.65;flex-wrap:nowrap}
.tb-recovery .tb-problem[data-example-role] .tb-problem-head strong,.tb-source-problem .tb-problem-head strong{font-size:12.5pt;line-height:1.65;letter-spacing:-.5px}
.tb-recovery .tb-problem[data-example-role] .tb-prose,.tb-source-problem .tb-prose{font-size:9.1pt;line-height:1.8}
.tb-recovery .tb-problem[data-example-role] .tb-problem-question{min-height:12mm}
.tb-recovery .tb-problem[data-example-role] .tb-work-area,.tb-source-problem .tb-work-area{margin-top:1.2mm;flex:none}
.tb-recovery .tb-problem[data-example-role] .tb-work-area[data-empty-work],.tb-source-problem .tb-work-area[data-empty-work]{display:none}
.tb-recovery .tb-problem[data-example-role] .tb-worked{font-size:8.5pt;line-height:1.95;border-top:.5pt solid #dce2d6;padding-top:2mm;margin-top:3mm}
.tb-recovery .tb-problem[data-example-role] .tb-worked h4{display:block;font-size:7pt;line-height:1.65;border:0;padding:0;margin:0 0 1mm;background:none;border-radius:0}
.tb-recovery .tb-problem[data-example-role] .tb-worked-answer{border:0;padding:0;margin-top:2mm}
.tb-paired-group,.tb-paired-cols,.tb-paired-worked,.tb-paired-twins{position:absolute;min-width:0}
.tb-source-problem{padding:3mm 0 2mm;border-top:.6pt solid var(--tb-light)}.tb-source-problem .tb-problem-head{min-height:5.5mm;margin-bottom:1.2mm;line-height:1.65}
.tb-source-problem[data-source-kind="drill"] .tb-problem-head{min-height:4.5mm}.tb-source-problem[data-source-kind="drill"] .tb-prose{font-size:8.8pt}
.tb-source-problem[data-source-kind="basic"]{padding:1.2mm 0 .8mm}.tb-source-problem[data-source-kind="basic"] .tb-problem-head{margin:0}.tb-source-problem[data-source-kind="basic"] .tb-prose{font-size:8.7pt}
`;
