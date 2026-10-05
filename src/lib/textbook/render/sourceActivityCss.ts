/** Native authored activity primitives, scoped to the validated source AST. */
const R = '.tb-source-fragments[data-source-kind="recall"]';
const M = '.tb-source-fragments[data-source-kind="mindmap"]';
const O = '.tb-source-fragments[data-source-kind="oral"]';
const C = '.tb-source-fragments[data-source-kind="clinic"]';
const A = `${R},${M},${O}`;

export const SOURCE_ACTIVITY_CSS = `
${A},${C}{display:flex;flex-direction:column;font-size:10pt;line-height:1.65}
${R}{gap:3mm}${M},${O}{gap:4mm}${C}{gap:5mm}
:is(${A}) .note{background:#fbf8ef;border-left:0;border-radius:0 2mm 2mm 2mm;padding:2.3mm 3mm;font-size:8pt;line-height:1.85;color:#666453;word-break:keep-all}
:is(${A}) .note strong{display:inline-block;color:#7a693e;font-size:7.3pt;margin-right:2mm;border-bottom:1.5pt solid #e4cd91;padding-bottom:.3mm}
${R} .recall-area{height:156mm;position:relative;padding:4mm;background:none;border:.7pt solid var(--tb-light);border-top:1.6pt solid var(--tb-accent);border-radius:0 5mm 0 0}
${R} .recall-area:after{content:'INJAEWON';position:absolute;left:0;right:0;top:62mm;text-align:center;font-size:38pt;color:#f3f6f0;letter-spacing:5px;font-weight:700;z-index:0}
${R} .recall-area .tb-source-small{position:relative;z-index:1;background:white;color:var(--tb-accent);font-size:7pt}
${R} .recall-rules{position:absolute;inset:8mm 4mm 4mm;display:flex;flex-direction:column;z-index:1}
${R} .recall-rules span{flex:1;border-bottom:.45pt solid #dfe6d9}
${R} .two{display:grid;grid-template-columns:1fr 1fr;gap:5mm;font-size:8pt;border-top:.6pt solid var(--tb-light);padding-top:2mm}
${R} .small{font-size:8pt;line-height:1.85}
${M} .map-canvas.map-premium{height:126mm;border:0;background:none;position:relative}
${M} .map-premium .mindmap-svg{display:block;width:100%;height:100%;position:static;overflow:visible;object-fit:fill}
${M} .section-label{display:flex;align-items:center;gap:2.4mm;color:var(--tb-accent);font-size:10.8pt;font-weight:700;margin:2mm 0 1.5mm;letter-spacing:-.3px;line-height:1.5}
${M} .section-label em{font-style:normal;background:var(--tb-accent);color:white;border-radius:0 2mm 0 2mm;width:6.3mm;height:6.3mm;line-height:6.3mm;font-size:8.6pt;flex:none;text-align:center}
${M} .small{font-size:8pt;line-height:1.85}
${M} .work{height:20mm;margin-top:2mm;display:flex;flex-direction:column}
${M} .work span{flex:1;border-bottom:1px solid #e6eae4}
${C} .clinic-intro{padding:4mm;background:var(--tb-soft);border-left:2pt solid var(--tb-accent);font-size:9.5pt}
${C} .clinic-intro p{font-size:7.5pt;margin-top:1.5mm;color:var(--tb-subink)}
${C} .repair-example{display:grid;grid-template-columns:1fr 1fr;gap:9mm}
${C} .repair-example>div{border-top:.7pt solid var(--tb-light);padding:3mm 0}
${C} .repair-example .tb-source-small{font-size:7pt;display:block;margin-bottom:2mm;color:var(--tb-subink)}
${C} .repair-example .math,${C} .repair-example [data-textbook-math]{font-size:17pt;line-height:1.65;display:inline-block;white-space:nowrap;vertical-align:baseline;color:var(--tb-accent)}
${C} .repair-example p{font-size:8pt;margin-top:2mm;color:var(--tb-subink)}
${O} .oral-route{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;margin-bottom:2mm}
${O} .oral-route>span{border-bottom:1pt solid var(--tb-light);font-size:8pt;padding-bottom:3mm;color:var(--tb-subink)}
${O} .oral-route strong{font-size:18pt;color:var(--tb-accent);margin-right:3mm}
${O} .oral-task{border-bottom:.6pt solid var(--tb-light);padding-bottom:3mm}
.tb-source-problem[data-source-kind="oral"]{padding-top:0;padding-bottom:2mm}
${O} .follow-question{background:var(--tb-soft);padding:2mm 3mm;font-size:8pt}
${O} .follow-question strong{font-size:7pt;margin-right:3mm;color:var(--tb-accent)}
${O} .oral-rubric{width:100%;border-collapse:collapse;table-layout:auto;font-size:8pt}
${O} .oral-rubric td,${O} .oral-rubric th{border:0;border-bottom:.6pt solid var(--tb-light);padding:2mm 3mm;text-align:center}
${O} .oral-rubric th{background:var(--tb-soft);color:var(--tb-accent);font-size:7pt}
${O} .oral-rubric td:first-child{text-align:left;width:65%}
`;
