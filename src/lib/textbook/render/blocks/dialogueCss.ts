/**
 * Dialogue pages, after the final cascade of the v15 `.opening` rules (editorial.css
 * 194–227, full.css 97–103). Every size that the conversation fit changes follows one
 * custom property, `--tb-dialogue-size` (10.5pt → 9.2pt): the fit sets it on any ancestor
 * and measures; portrait size and bubble padding follow as they did in the typesetter
 * (9.5mm + 0.77mm per pt above 9.2pt, 1.5mm + 0.23mm per pt above 9.2pt).
 *
 * A turn paints no background of its own. The page paints one `.tb-dialogue-backdrop`
 * behind the run of turns and boards, 3mm above the first and below the last; turns are
 * already inset 3.5mm inside their block width. Selectors carry one class more than the
 * earlier dialogue rules so that this sheet decides wherever it is placed.
 */
export const DIALOGUE_CSS = `
.tb-editorial.tb-editorial-dialogue,.tb-editorial.tb-editorial-dialogue.tb-stage-opening{padding:0;background:transparent;border-radius:0}
.tb-dialogue-backdrop{position:absolute;background:#f4f7f5;border-radius:4mm;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.tb-dialogue.tb-dialogue-atlas{--tb-dialogue-portrait:calc(9.5mm + (var(--tb-dialogue-size,10.5pt) - 9.2pt)*2.18268);--tb-dialogue-padding:calc(1.5mm + (var(--tb-dialogue-size,10.5pt) - 9.2pt)*.65197);--tb-dialogue-edge:#dfe8e1;display:flex;flex-direction:row;align-items:flex-start;gap:1.7mm;width:fit-content;max-width:calc((100% - 7mm)*.93);margin:0 auto 0 3.5mm;padding:0;background:transparent}
.tb-dialogue.tb-dialogue-atlas.tb-dialogue-right{flex-direction:row-reverse;max-width:calc((100% - 7mm)*.89);margin:0 3.5mm 0 auto}
.tb-dialogue.tb-dialogue-atlas.tb-speaker-student{--tb-dialogue-edge:#eadfaf}
.tb-dialogue.tb-dialogue-atlas .tb-portrait{display:flex;flex:0 0 var(--tb-dialogue-portrait);width:var(--tb-dialogue-portrait);flex-direction:column;align-items:center;gap:.15mm;padding-top:0}
.tb-dialogue.tb-dialogue-atlas .tb-portrait-frame{position:relative;display:block;width:var(--tb-dialogue-portrait);height:var(--tb-dialogue-portrait);flex:none;overflow:hidden;isolation:isolate}
.tb-paper .tb-dialogue.tb-dialogue-atlas .tb-portrait-frame img,.tb-measure .tb-dialogue.tb-dialogue-atlas .tb-portrait-frame img{position:absolute;display:block;width:200%;height:200%;max-width:none;left:0;top:0}
.tb-paper .tb-dialogue.tb-dialogue-atlas .tb-expression-question img,.tb-measure .tb-dialogue.tb-dialogue-atlas .tb-expression-question img{left:-100%}
.tb-paper .tb-dialogue.tb-dialogue-atlas .tb-expression-thinking img,.tb-measure .tb-dialogue.tb-dialogue-atlas .tb-expression-thinking img{top:-100%}
.tb-paper .tb-dialogue.tb-dialogue-atlas .tb-expression-aha img,.tb-measure .tb-dialogue.tb-dialogue-atlas .tb-expression-aha img{left:-100%;top:-100%}
.tb-dialogue.tb-dialogue-atlas .tb-frame-mirrored{transform:scaleX(-1)}
.tb-dialogue.tb-dialogue-atlas .tb-portrait-name{font-size:5.5pt;line-height:1.1;white-space:nowrap;font-weight:400;color:#657c70;letter-spacing:0}
.tb-dialogue.tb-dialogue-atlas .tb-bubble{position:relative;flex:initial;min-width:0;margin:0;padding:var(--tb-dialogue-padding) 2.7mm;border:.45pt solid var(--tb-dialogue-edge);background:white;border-radius:.9mm 3mm 3mm 3mm;font-size:var(--tb-dialogue-size,10.5pt);line-height:1.77;word-break:keep-all;box-shadow:0 .3mm .4mm #253c2c08;color:#263d32}
.tb-dialogue.tb-dialogue-atlas .tb-bubble:before{content:'';position:absolute;left:-1.8mm;right:auto;top:2.4mm;width:2mm;height:2.6mm;background:inherit;clip-path:polygon(100% 0,0 0,100% 100%);filter:drop-shadow(-.2mm 0 .05mm var(--tb-dialogue-edge))}
.tb-dialogue.tb-dialogue-atlas.tb-dialogue-right .tb-bubble{border-radius:3mm .9mm 3mm 3mm}
.tb-dialogue.tb-dialogue-atlas.tb-dialogue-right .tb-bubble:before{left:auto;right:-1.8mm;clip-path:polygon(0 0,100% 0,0 100%);filter:drop-shadow(.2mm 0 .05mm var(--tb-dialogue-edge))}
.tb-dialogue.tb-dialogue-atlas.tb-speaker-student .tb-bubble{background:#fff0b8}
.tb-dialogue-board{width:calc(100% - 17mm);margin:1mm 8.5mm;padding:2.3mm 4mm;background:#edf3e7;border:0;border-top:1pt solid #adc4a0;border-radius:0 0 2.5mm 2.5mm;box-shadow:none;color:#073f3b}
.tb-dialogue-board>.tb-board-title{display:flex;align-items:center;gap:1.3mm;font-size:7pt;line-height:1.5;letter-spacing:.02em;margin:0 0 1.6mm;color:#6b815b}
.tb-dialogue-board>.tb-board-title>i{display:inline-block;flex:none;width:2mm;height:2mm;border:1pt solid #a3b690;transform:rotate(45deg)}
.tb-dialogue-board>.tb-board-formula{text-align:center;font-size:var(--tb-dialogue-size,10.5pt);line-height:1.77}
.tb-dialogue-board>.tb-board-text{font-size:var(--tb-dialogue-size,10.5pt);line-height:1.77;word-break:keep-all}
.tb-dialogue-board>.tb-board-note{font-size:8pt;line-height:1.8;margin-top:1.5mm;color:#727e6a}
.tb-dialogue-lesson-title{font-size:9.2pt;line-height:1.6;color:var(--tb-accent,#086c61)}
.tb-dialogue-guide{font-size:7pt;line-height:1.6;color:#7c8779;text-align:center;margin:0 0 .5mm;padding:0}
.tb-dialogue-continue{display:flex;align-items:baseline;gap:2mm;justify-content:flex-end;font-size:6pt;line-height:1.6;color:#8d978a;padding-top:1.5mm;border-top:.5pt solid var(--tb-light,#d6e4df)}
.tb-dialogue-continue>b{background:#edf4e9;color:var(--tb-accent,#086c61);padding:.4mm 1.5mm;border-radius:2mm;margin-right:auto;font-size:6.8pt}
`;
