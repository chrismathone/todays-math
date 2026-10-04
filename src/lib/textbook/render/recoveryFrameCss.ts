/** Measured v15 frame values. Applied only to semantic recovery projections. */
export const RECOVERY_FRAME_CSS = `
.tb-recovery{font-size:10pt;line-height:1.65}
.tb-recovered .tb-header{top:10mm;height:6mm;border:0;padding:0;align-items:center}.tb-recovered .tb-running-context small{display:inline}
.tb-recovery.tb-stage-opening .tb-stage-head{min-height:25mm;padding:3.5mm 22mm 3.5mm 5mm;border-left:1.5pt solid var(--tb-accent)}
.tb-recovery.tb-stage-opening .tb-kicker{font-size:6.4pt;line-height:1.65;margin-bottom:1.5mm;letter-spacing:.1em}
.tb-recovery.tb-stage-opening .tb-section-heading{font-size:23pt;letter-spacing:-.9px;margin-bottom:1.5mm}
.tb-recovery.tb-stage-opening .tb-stage-subtitle{font-size:9.2pt;line-height:1.7;color:var(--tb-accent)}
.tb-recovery.tb-stage-recall .tb-stage-head{padding-bottom:2.4mm}
.tb-recovered .tb-dialogue-page-note{position:absolute;top:270mm;height:8mm}.tb-dialogue-page-note .tb-dialogue-continue{height:100%;align-items:center}
.tb-source-fragments{min-width:0}.tb-source-fragments[data-source-kind="unitSpreadLeft"],.tb-source-fragments[data-source-kind="unitSpreadRight"]{height:254mm;position:relative;background:#f2f6ef;--tb-accent:#0c6b5b;--tb-light:#cbded2}
.tb-recovered[data-template-key^="reference-unitSpread"]{background:#f2f6ef}.tb-recovered[data-template-key^="reference-unitSpread"] .tb-edge-tab{display:none}
`;
