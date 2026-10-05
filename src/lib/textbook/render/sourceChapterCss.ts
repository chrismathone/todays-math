/** Static source chapter structure rules, SHA-256 provenance in source-css-measurements. */
export const SOURCE_CHAPTER_CSS = `
.tb-recovered[data-template-key^="reference-unitSpread"] .tb-header{border-bottom:.5pt solid #b9d0c1;padding-bottom:1mm}
.tb-recovered[data-template-key^="reference-"] .tb-footer-brand{display:flex;align-items:center;gap:2mm}
.tb-recovered[data-template-key^="reference-"].tb-page-odd .tb-footer-brand{flex-direction:row-reverse}
.tb-recovered[data-template-key^="reference-"] .tb-footer-brand i{margin-left:0}
.tb-source-fragments .chapter-number{position:absolute;top:7mm;left:0;display:flex;align-items:flex-start;gap:4mm;color:var(--tb-accent)}
.tb-source-fragments .chapter-number span.tb-source-small{font-size:7pt;font-weight:700;letter-spacing:1.8px;padding-top:5mm;border-top:2pt solid #cee66c;margin-top:3mm}
.tb-source-fragments .chapter-number strong{font-size:76pt;line-height:1;letter-spacing:-6px;color:#2f7e62;font-weight:700}
.tb-source-fragments .chapter-title{position:absolute;left:0;right:0;top:48mm;font-size:31pt!important;line-height:1.25;letter-spacing:-1.7px;color:#123f35;font-weight:700;margin:.67em 0}
.tb-source-fragments .chapter-title span{display:block}
.tb-source-fragments .chapter-question{position:absolute;top:83mm;left:0;right:4mm;font-size:11.1pt;line-height:1.7;letter-spacing:-.2px;color:#2f6551;word-break:keep-all;font-weight:700}
.tb-source-fragments .chapter-hero{position:absolute;left:-4mm;right:-4mm;top:101mm;height:119mm}
.tb-source-fragments .chapter-title.single-line~.chapter-question{top:70mm}
.tb-source-fragments .chapter-title.single-line~.chapter-hero{top:90mm;height:130mm}
.tb-source-fragments .chapter-hero img{width:100%;height:100%;object-fit:contain;display:block}
.tb-source-fragments .chapter-lead{position:absolute;top:225mm;left:0;right:3mm;font-size:8.9pt;line-height:1.85;color:#516f60;word-break:keep-all}
.tb-source-fragments .chapter-key{position:absolute;top:248mm;left:0;right:0;display:flex;gap:2.2mm;align-items:center;font-size:7.6pt;color:#3c6f58;font-weight:700;letter-spacing:.1px}
.tb-source-fragments .chapter-key em{width:2.2mm;height:2.2mm;background:#b6d453;transform:rotate(45deg)}
.tb-source-fragments .chapter-route-head{position:absolute;top:10mm;left:0;right:0;border-bottom:1.1pt solid #7da28f;padding-bottom:4mm}
.tb-source-fragments .chapter-route-head>span{font-size:7pt;letter-spacing:.7px;color:#61816d;font-weight:700}
.tb-source-fragments .chapter-route-head h2{font-size:23pt;color:#174c3e;line-height:1.4;letter-spacing:-1px;margin-top:1mm}
.tb-source-fragments .chapter-route-head>strong{position:absolute;right:0;top:1mm;font-size:32pt;line-height:1;color:#c5d9c8;letter-spacing:-2px}
.tb-source-fragments[data-source-kind="unitSpreadRight"] section h2{font-size:9pt;color:#1b6650;line-height:1.5;margin:0 0 3mm;font-weight:700}
.tb-source-fragments .chapter-goals{position:absolute;top:40mm;left:0;right:0}
.tb-source-fragments .chapter-goals p,.tb-source-fragments .chapter-readiness p{display:flex;align-items:baseline;gap:2.3mm;font-size:8.25pt;line-height:1.75;color:#365746;margin-bottom:1.7mm;word-break:keep-all}
.tb-source-fragments .chapter-goals p>em,.tb-source-fragments .chapter-readiness p>em{width:2.1mm;height:2.1mm;flex:none;display:inline-block;border:.6pt solid #86a68b;border-radius:.3mm}
.tb-source-fragments .chapter-roadmap{position:absolute;top:83mm;left:0;right:0;height:81mm}
.tb-source-fragments .chapter-roadmap h2{display:flex;justify-content:space-between;align-items:baseline}
.tb-source-fragments .chapter-roadmap h2 span.tb-source-small{font-size:6.2pt;color:#7a9281;font-weight:400}
.tb-source-fragments .chapter-topics{height:68mm;display:flex;flex-direction:column;border-top:1pt solid #93b39e}
.tb-source-fragments .chapter-topics>div{flex:1;display:flex;align-items:center;gap:3mm;border-bottom:.5pt solid #c3d7c8;padding:1mm 0;min-height:0}
.tb-source-fragments .chapter-topics span.tb-source-small{font-size:9pt;color:#8da977;flex:none;width:8mm}
.tb-source-fragments .chapter-topics strong{font-size:10.2pt;letter-spacing:-.3px;line-height:1.5;font-weight:700;color:#284f3e;word-break:keep-all}
.tb-source-fragments .chapter-topics>div>span:not(.tb-source-small){margin-left:auto;font-size:12pt;font-weight:700;color:#2d7055;white-space:nowrap}
.tb-source-fragments .chapter-topics>div>span:not(.tb-source-small) em{font-size:6pt;font-style:normal;margin-left:1mm;font-weight:400;color:#738f7c}
.tb-source-fragments .chapter-connections{position:absolute;top:173mm;left:0;right:0}
.tb-source-fragments .connection-columns{display:grid;grid-template-columns:1fr 1fr 1fr;gap:2.7mm;position:relative}
.tb-source-fragments .connection-columns>div{padding:2.8mm 2.6mm;background:#e5eee3;min-height:28mm;border-radius:0 3mm 0 0}
.tb-source-fragments .connection-columns>div.current{background:#226d54;color:white}
.tb-source-fragments .connection-columns .tb-source-small{font-size:6.4pt;display:block;margin-bottom:1.7mm;color:#719175;font-weight:700}
.tb-source-fragments .connection-columns .current .tb-source-small{color:#d6e989}
.tb-source-fragments .connection-columns p{font-size:6.9pt;line-height:1.9;color:#506e57;word-break:keep-all}
.tb-source-fragments .connection-columns .current p{color:#f3f8e8}
.tb-source-fragments .chapter-readiness{position:absolute;top:216mm;left:0;right:0}
.tb-source-fragments .chapter-readiness h2{margin-bottom:2mm!important}
.tb-source-fragments .chapter-readiness p{font-size:7.1pt;margin-bottom:.9mm;line-height:1.65}
.tb-source-fragments .chapter-date{position:absolute;top:250mm;left:0;right:0;display:flex;justify-content:space-between;font-size:6.5pt;color:#7b9480}
`;
