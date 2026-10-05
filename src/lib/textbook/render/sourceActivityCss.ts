/** Native authored activity primitives, scoped to the validated source AST. */
const R = '.tb-source-fragments[data-source-kind="recall"]';

export const SOURCE_ACTIVITY_CSS = `
${R}{display:flex;flex-direction:column;gap:3mm;font-size:10pt;line-height:1.65}
${R} .note{background:#fbf8ef;border-left:0;border-radius:0 2mm 2mm 2mm;padding:2.3mm 3mm;font-size:8pt;line-height:1.85;color:#666453;word-break:keep-all}
${R} .note strong{display:inline-block;color:#7a693e;font-size:7.3pt;margin-right:2mm;border-bottom:1.5pt solid #e4cd91;padding-bottom:.3mm}
${R} .recall-area{height:156mm;position:relative;padding:4mm;background:none;border:.7pt solid var(--tb-light);border-top:1.6pt solid var(--tb-accent);border-radius:0 5mm 0 0}
${R} .recall-area:after{content:'INJAEWON';position:absolute;left:0;right:0;top:62mm;text-align:center;font-size:38pt;color:#f3f6f0;letter-spacing:5px;font-weight:700;z-index:0}
${R} .recall-area .tb-source-small{position:relative;z-index:1;background:white;color:var(--tb-accent);font-size:7pt}
${R} .recall-rules{position:absolute;inset:8mm 4mm 4mm;display:flex;flex-direction:column;z-index:1}
${R} .recall-rules span{flex:1;border-bottom:.45pt solid #dfe6d9}
${R} .two{display:grid;grid-template-columns:1fr 1fr;gap:5mm;font-size:8pt;border-top:.6pt solid var(--tb-light);padding-top:2mm}
${R} .small{font-size:8pt;line-height:1.85}
`;
