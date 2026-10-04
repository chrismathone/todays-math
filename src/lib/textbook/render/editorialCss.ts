/** Reference: v15 editorial.css, full.css and chapters.css. All body decoration is measured. */
export const EDITORIAL_CSS = `
.tb-stage-opening,.tb-stage-concept,.tb-stage-guide,.tb-stage-unit{--tb-accent:#086c61;--tb-dark:#073f3b;--tb-soft:#edf5f0;--tb-light:#d6e4df;--tb-signal:#d6ed75}
.tb-stage-recall{--tb-accent:#a77928;--tb-dark:#5c4727;--tb-soft:#fbf6e9;--tb-light:#e7dac0;--tb-signal:#e9cf83}
.tb-stage-basic,.tb-stage-practice,.tb-stage-application{--tb-accent:#6250a0;--tb-dark:#342752;--tb-soft:#f3f0f8;--tb-light:#e1dced;--tb-signal:#ffbea4}
.tb-stage-review{--tb-accent:#517957;--tb-dark:#29452e;--tb-soft:#f1f5ec;--tb-light:#d6e1cf;--tb-signal:#d6ed75}
.tb-stage-rest{--tb-accent:#517957;--tb-dark:#29452e;--tb-soft:#f7f5e9;--tb-light:#dce3d1;--tb-signal:#d6ed75}
.tb-editorial{display:flow-root;width:100%;min-width:0}.tb-editorial-problem{height:100%}
.tb-header{top:15mm;height:8mm;align-items:center;padding:0 0 1.5mm;border-bottom:.5pt solid var(--tb-light);font-size:6.8pt;line-height:1.5}
.tb-running-brand{display:flex;align-items:center;gap:1.6mm;flex:none;font-size:8.2pt;font-weight:700;color:var(--tb-accent);letter-spacing:-.1px}
.tb-running-brand i{display:block;width:3mm;height:3mm;border-radius:50% 0 50% 0;background:var(--tb-accent);transform:rotate(-10deg)}
.tb-running-context{text-align:right;min-width:0;font-size:6.6pt;color:#82918e}.tb-running-context small{display:block;font-size:6.2pt}
.tb-edge-tab{position:absolute;top:28mm;left:3mm;width:5.5mm;padding:4mm 0;background:var(--tb-accent);color:white;writing-mode:vertical-rl;text-orientation:upright;text-align:center;letter-spacing:1.6px;font-size:6.8pt;border-radius:0 0 3mm 0;line-height:1.6}
.tb-page-odd .tb-edge-tab{left:auto;right:3mm;border-radius:0 0 0 3mm}
.tb-stage-head{position:relative;min-height:24mm;padding:0 22mm 3mm 0}
.tb-kicker{display:flex;align-items:center;gap:2mm;font-size:7.2pt;line-height:1.5;letter-spacing:.045em;color:var(--tb-accent);margin-bottom:2.2mm;font-weight:700}
.tb-kicker:before{content:'';width:6mm;height:1.25mm;background:var(--tb-signal);display:inline-block;border-radius:1mm;flex:none}
.tb-stage-heading .tb-section-heading{font-size:25.5pt;letter-spacing:-1.1px;line-height:1.25;color:var(--tb-dark);margin:0 0 2mm;padding:0;background:none;border:0}
.tb-stage-subtitle{font-size:7.7pt;line-height:1.7;color:#6e7d7a}
.tb-stage-number{position:absolute;top:-1mm;right:0;font-size:41pt;font-weight:700;line-height:1;letter-spacing:-2px;color:var(--tb-soft);-webkit-text-stroke:.6pt var(--tb-light)}
.tb-progress{display:flex;flex-wrap:wrap;column-gap:4.5mm;row-gap:1mm;border-bottom:.65pt solid var(--tb-light);min-height:7mm;margin-top:2mm;padding-bottom:0;font-size:7pt;line-height:1.6}
.tb-progress>span{position:relative;padding:0 0 2.1mm;color:#88938f;display:flex;align-items:center;white-space:nowrap}
.tb-progress .tb-progress-active{color:var(--tb-accent);font-weight:700}.tb-progress-active:after{content:'';position:absolute;bottom:-.65pt;left:0;right:0;height:2pt;background:var(--tb-accent)}
.tb-stage-opening .tb-stage-head{padding:4.5mm 22mm 4.5mm 5mm;border-left:2pt solid var(--tb-accent);background:#f0f6ee;border-radius:0 5mm 0 0;min-height:27mm}
.tb-stage-opening .tb-section-heading{font-size:23pt}.tb-stage-opening .tb-stage-number{right:4mm;top:6mm;font-size:28pt;color:#dce9d9;-webkit-text-stroke:0}
.tb-stage-opening .tb-progress{margin-top:3mm}
.tb-concept{border:0;background:none;padding:0;border-radius:0;color:#293936}
.tb-concept-title{display:flex;align-items:baseline;gap:2.4mm;color:var(--tb-accent);font-size:10.8pt;letter-spacing:-.3px;line-height:1.5!important;margin:0 0 2mm!important}
.tb-concept-number{display:inline-flex;align-items:center;justify-content:center;background:var(--tb-accent);color:white;border-radius:0 2mm 0 2mm;min-width:6.3mm;min-height:6.3mm;padding:.4mm 1mm;font-size:8.6pt;font-weight:700;flex:none}
.tb-goal{display:grid;grid-template-columns:23mm 1fr;gap:3mm;font-size:8.3pt;line-height:1.85;border-bottom:.55pt solid var(--tb-light);padding:1.5mm 0 2mm;margin-bottom:2.5mm}
.tb-goal>b{font-size:7.5pt;color:var(--tb-accent)}
.tb-definition{background:var(--tb-soft);border-left:2.3pt solid var(--tb-accent);border-radius:0 4mm 0 0;padding:3.5mm 4.5mm;color:var(--tb-dark);font-size:10pt;line-height:1.85}
.tb-definition h4{font-size:7.2pt;color:var(--tb-accent);margin:0 0 1.4mm}
.tb-conditions{display:grid;grid-template-columns:23mm 1fr;gap:3mm;padding:2.4mm 3mm;border-bottom:.6pt solid var(--tb-light);font-size:8.4pt;line-height:1.85}
.tb-conditions h4{font-size:8pt;color:var(--tb-accent);margin:0}
.tb-concept-part{display:grid;grid-template-columns:23mm 1fr;gap:3mm;margin-top:2mm;padding:2.6mm 3.5mm;border-bottom:.55pt solid var(--tb-light);font-size:8.8pt;line-height:1.9}
.tb-concept-part h4{font-size:7.5pt;line-height:1.7;align-self:start;margin:0;border-left:2pt solid var(--tb-signal);padding-left:2mm;color:var(--tb-accent)}
.tb-concept-part ul{margin:0;padding-left:4.5mm}.tb-concept-part li+li{margin-top:1.2mm}
.tb-concept-examples{background:#f7faf7;border-top:1.3pt solid var(--tb-accent)}
.tb-concept-nonexamples{background:#fafaf5;border-top:1.3pt solid #b6bdad}
.tb-concept-caution{background:#fbf8ef;border:0;border-radius:0 2mm 2mm 2mm;color:#666453;font-size:8pt}
.tb-concept-caution h4{color:#7a693e;border-left:0;border-bottom:1.5pt solid #e4cd91;padding:0 0 .3mm;font-size:7.3pt}
.tb-prompt{display:grid;grid-template-columns:23mm 1fr;gap:3mm;margin-top:2.5mm;padding:3mm 4mm;border-left:2.3pt solid var(--tb-accent);background:var(--tb-soft);border-radius:0 3mm 0 0;font-size:9.1pt;line-height:1.95}
.tb-prompt>b{font-size:8pt;color:var(--tb-accent)}
.tb-problem{padding:2mm 0 0}.tb-problem-head{margin-bottom:1.5mm;gap:2mm;flex-wrap:wrap;line-height:1.5}
.tb-problem-head strong{font-size:16pt;line-height:1.1;color:var(--tb-accent)}.tb-problem-head span{font-weight:700;font-size:6.2pt}
.tb-work-area{margin-top:2mm}.tb-work-line{height:7mm;border-bottom:.45pt solid #e0e6e0}
.tb-problem-body,.tb-problem-question{min-width:0}.tb-problem-worked{background:var(--tb-soft);border-top:1.6pt solid var(--tb-accent);border-radius:0 5mm 0 0;padding:3mm 4mm}
.tb-problem-worked .tb-example-label{background:white;border:.5pt solid var(--tb-light)}
.tb-problem-worked.tb-problem-wide .tb-problem-body{display:grid;grid-template-columns:1fr 1.15fr;gap:5mm}
.tb-problem-worked .tb-prose{font-size:9.2pt;line-height:1.9}
.tb-worked,.tb-problem-worked .tb-answer{padding:2mm 0 0;margin-top:3mm;background:none;border-top:.55pt solid var(--tb-light);font-size:8.3pt;line-height:1.95}
.tb-problem-worked.tb-problem-wide .tb-worked,.tb-problem-worked.tb-problem-wide .tb-answer{border-top:0;border-left:.6pt solid var(--tb-light);padding:0 0 0 4mm;margin-top:0}
.tb-worked h4{display:table;font-size:7pt;line-height:1.6;margin:0 0 1.5mm;color:var(--tb-accent);background:white;padding:.3mm 1.6mm;border-radius:4mm}
.tb-worked-answer{display:flex;align-items:baseline;gap:2mm;border-top:.5pt solid var(--tb-light);padding-top:1.5mm;margin-top:2mm}.tb-worked-answer>b{font-size:7pt;color:var(--tb-accent);flex:none}
.tb-dialogue-atlas{max-width:96%;gap:1.7mm}.tb-dialogue-atlas.tb-dialogue-right{max-width:93%}
.tb-dialogue-atlas .tb-bubble{font-size:9.6pt;line-height:1.9;padding:1.6mm 2.7mm}
.tb-recall{padding:0;border:0}.tb-recall-phases{display:flex;flex-wrap:wrap;gap:5mm;border-bottom:.65pt solid var(--tb-light);font-size:7pt;line-height:1.6;margin-bottom:3mm}
.tb-recall-phases>span{padding-bottom:2mm;color:#89958e}.tb-recall-phases .tb-recall-active{color:var(--tb-accent);border-bottom:2pt solid var(--tb-accent);font-weight:700}
.tb-recall-checkbar{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:2mm;font-size:7.3pt;line-height:1.7;margin-bottom:3mm;color:var(--tb-accent)}
.tb-recall-checkbar>span{font-size:6.7pt;color:#89958e}.tb-recall-content{border-top:1pt solid var(--tb-light);border-bottom:.65pt solid var(--tb-light);padding:3mm 0;font-size:9pt;line-height:1.9}
.tb-recall-text{display:inline}.tb-recall-text p{display:inline}.tb-recall-text h2,.tb-recall-text h3,.tb-recall-text h4{display:block;color:var(--tb-dark);border-bottom:.6pt solid var(--tb-light);padding-bottom:1.5mm;margin-top:3mm}
.tb-blank{background:#f7f5ec;border-bottom:.7pt solid #baad91;height:7mm;min-width:22mm}.tb-blank-sentence{display:block;width:100%;height:21mm;background:repeating-linear-gradient(transparent,transparent calc(7mm - .45pt),#e0e6e0 calc(7mm - .45pt),#e0e6e0 7mm);border-bottom:0;margin:1.5mm 0}
.tb-repetition{font-size:6.5pt;color:#83948b;margin-top:2mm;letter-spacing:.15mm}.tb-study-footer{font-size:6.8pt;color:#84958a;margin-top:2mm!important}
.tb-recall-continuation .tb-recall-content{border-top:0;padding:1mm 0 2mm}
.tb-cover.tb-paper{background:#073f3b;color:#f7f5e9;padding:17mm 18mm 19mm;display:flex;flex-direction:column;gap:0}
.tb-cover-top{display:flex;justify-content:space-between;align-items:baseline;gap:5mm;font-size:9pt;line-height:1.6;letter-spacing:1.8px;border-top:1pt solid #cce984;padding-top:5mm}
.tb-cover-top>span{font-size:8pt;letter-spacing:1px;color:#d6ed75;flex:none}
.tb-cover-title{margin-top:24mm}.tb-cover-title>p:first-child{font-size:16pt;color:#d6ed75;margin:0 0 5mm}
.tb-cover .tb-cover-title h1{font-size:var(--tb-cover-title-size,68pt);line-height:1.15;letter-spacing:-1.8px;margin:0;color:#f7f5e9;overflow-wrap:anywhere}
.tb-cover .tb-cover-code{font-size:var(--tb-cover-code-size,45pt);font-weight:700;line-height:1.25;letter-spacing:-1px;color:#d6ed75;margin-top:8mm;border:0;padding:0;overflow-wrap:anywhere}
.tb-cover .tb-cover-sub{font-size:10pt;letter-spacing:.3px;line-height:1.8;margin-top:7mm;color:#dceac0}
.tb-cover-art{flex:1;min-height:0;max-height:116mm;margin:3mm -9mm 3mm;display:flex;align-items:center;justify-content:center}.tb-cover-art img{width:100%;height:100%;min-height:0;object-fit:contain}
.tb-cover-equations{display:flex;align-items:center;gap:5mm;font-size:11pt;color:#dceac0;line-height:1.6;margin-top:3mm}.tb-cover-equations>i{height:.5pt;background:#5b8066;flex:1}
.tb-cover-bottom{display:flex;justify-content:space-between;align-items:baseline;gap:5mm;border-bottom:.5pt solid #9fbaaa;padding:5mm 0;font-size:8.5pt;line-height:1.6;margin-top:2mm}.tb-cover-bottom b{letter-spacing:1.5px}
.tb-cover-edition{font-size:7.5pt!important;color:#d6ed75;line-height:1.6;margin:2mm 0 0!important}
.tb-unit-intro{padding:0;background:#f2f6ef}.tb-unit-heading{background:#f2f6ef;padding:5mm 7mm 6mm;border-radius:0 0 12mm 0}
.tb-unit-number{display:flex;align-items:flex-start;gap:4mm;color:var(--tb-accent)}.tb-unit-number small{font-size:7pt;letter-spacing:1.8px;padding-top:3mm;border-top:2pt solid #cee66c;margin-top:2mm}
.tb-unit-number b{font-size:64pt;line-height:1;letter-spacing:-3px;color:#2f7e62}
.tb-unit-heading .tb-unit-title{font-size:31pt;line-height:1.3;letter-spacing:-1.3px;color:#123f35;margin:5mm 0 2mm}
.tb-unit-question{font-size:10.5pt;color:#2f6551;line-height:1.7;font-weight:700}.tb-unit-art{margin:3mm 0 2mm;height:75mm}
.tb-editorial-heading.tb-stage-unit .tb-unit-heading{min-height:220mm;display:flex;flex-direction:column}.tb-editorial-heading.tb-stage-unit .tb-unit-art{height:110mm;flex:1;min-height:75mm;display:flex;align-items:center}.tb-editorial-heading.tb-stage-unit .tb-unit-key{margin-top:auto}
.tb-unit-art img{height:100%;width:100%;object-fit:contain}.tb-unit-key{display:flex;align-items:center;gap:2.2mm;font-size:7.6pt;color:#3c6f58;font-weight:700}
.tb-unit-key i{width:2.2mm;height:2.2mm;background:#b6d453;transform:rotate(45deg);flex:none}
.tb-unit-goals{padding:4mm 7mm 6mm}.tb-unit-goals h3{font-size:9pt;color:#1b6650;border-top:.6pt solid #c3d7c8;padding-top:3mm;margin:0 0 2mm}.tb-unit-goals ul{font-size:8.5pt;line-height:1.85}
.tb-paper.tb-stage-unit{background:#f2f6ef}.tb-paper.tb-stage-rest{background:#fffdf6}
.tb-stage-unit .tb-prose h2,.tb-stage-unit .tb-prose h3{font-size:15pt;color:#1b6650;margin-top:3mm;border-bottom:1.1pt solid #7da28f;padding-bottom:3mm}.tb-stage-unit .tb-prose ul{list-style:none;padding-left:0}.tb-stage-unit .tb-prose li{position:relative;padding:2mm 0 2mm 5mm;border-bottom:.5pt solid #c3d7c8}.tb-stage-unit .tb-prose li:before{content:'';position:absolute;left:0;top:4mm;width:2.1mm;height:2.1mm;border:.6pt solid #86a68b;border-radius:.3mm}
.tb-editorial-dialogue.tb-stage-opening{padding:1mm 2mm;background:#f4f6f5;border-radius:0 2mm 2mm 2mm}
.tb-stage-rest .tb-stage-head{padding:2mm 27mm 3mm 0;border-bottom:1pt solid var(--tb-light)}
.tb-stage-rest .tb-stage-number{display:none}.tb-rest-sprout{position:absolute;right:0;top:0;width:22mm;height:22mm;margin:0}.tb-rest-sprout img{width:100%;height:100%;object-fit:contain}
.tb-editorial.tb-stage-rest .tb-prose{font-size:9.2pt;line-height:1.8;color:#354a37;border-left:2pt solid #d3dec7;padding:1mm 0 1mm 4mm}
.tb-editorial.tb-stage-rest .tb-prose h3{font-size:9pt;border-top:.65pt solid #d3dec7;padding-top:3mm;margin-top:4mm;color:#5b7550}
.tb-stage-rest .tb-figure{background:#f2f6ef;border-radius:0 8mm 0 2mm;padding:3mm;margin:0}.tb-editorial.tb-stage-rest .tb-figure img{max-height:72mm}
`;
