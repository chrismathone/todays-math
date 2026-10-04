/** Measured v15 frame values. Applied only to semantic recovery projections. */
export const RECOVERY_FRAME_CSS = `
.tb-recovery{font-size:10pt;line-height:1.65}
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
`;
