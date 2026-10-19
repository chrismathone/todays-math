/** 네 제품 양식의 공통 CSS. 자체 글꼴 선언과 A4 경계는 paperStyles.ts가 소유한다. */
export const FOUR_STYLE_CSS = `
[data-report-style] .sc-sheet {
  box-sizing: border-box; width: 210mm; height: 297mm; padding: 14mm 15mm 10mm;
  display: flex; flex-direction: column; gap: 0; overflow: visible;
  color: var(--paper-ink); background: var(--paper-color); box-shadow: none;
  font: 10pt/1.65 "Noto Serif KR", serif; font-variant-numeric: tabular-nums;
}
[data-report-style] .sc-sheet :is(p,h2,h3,h4,dl,dd,ol) { margin: 0; }
[data-report-style] .sc-sheet * { box-sizing: border-box; }
[data-report-style] .sc-running {
  display: flex; justify-content: space-between; gap: 4mm; margin-bottom: 3mm;
  font: 9pt/1.5 Pretendard, sans-serif; min-height: 5mm;
}
[data-report-style] .sc-running span { overflow-wrap: anywhere; }
[data-report-style] .sc-running span:last-child { flex: none; }
[data-report-style] .sc-body { display: flex; flex-direction: column; gap: var(--sc-gap); }
[data-report-style] .sc-block { flex: none; min-width: 0; break-inside: avoid; overflow-wrap: anywhere; }
[data-report-style] .sc-block h3 { margin: 0 0 2mm; font: 700 10pt/1.5 Pretendard, sans-serif; }
[data-report-style] .sc-academy { border-top: 2px solid; padding-top: 3mm; }
[data-report-style] .sc-academyName { font-size: 11pt; font-weight: 700; }
[data-report-style] .sc-motto { font: 9pt/1.5 Pretendard, sans-serif; }
[data-report-style] .sc-nameRow { display: grid; grid-template-columns: auto 1fr auto; align-items: end; gap: 4mm; margin-top: 3mm; }
[data-report-style] .sc-nameRow h2 { font-size: 23pt; line-height: 1.3; font-weight: 400; }
[data-report-style] .sc-nameRow p { font: 9pt/1.5 Pretendard, sans-serif; white-space: pre-wrap; }
[data-report-style] .sc-examTitle { text-align: right; max-width: 70mm; }
[data-report-style] .sc-scoreValue { font-family: Pretendard, sans-serif; line-height: 1.2; }
[data-report-style] .sc-scoreValue strong { font-size: 26pt; font-weight: 750; }
[data-report-style] .sc-scoreValue span, [data-report-style] .sc-original { font: 9pt/1.5 Pretendard, sans-serif; }
[data-report-style] .sc-scoreValue strong + span { padding-left: 2mm; }
[data-report-style] .sc-correct { display: flex; align-items: baseline; gap: 2mm; font-family: Pretendard, sans-serif; }
[data-report-style] .sc-correct strong { font-size: 18pt; line-height: 1.3; }
[data-report-style] .sc-correct span { font-size: 9pt; }
[data-report-style] .sc-scoreValue, [data-report-style] .sc-correct { break-inside: avoid; }
[data-report-style] .sc-noteText { font-size: 10pt; line-height: 1.7; white-space: pre-wrap; }
[data-report-style] .sc-marks { display: grid; grid-template-columns: repeat(10, minmax(0,1fr)); gap: 2mm; }
[data-report-style] .sc-mark { min-width: 0; padding: 1mm; border: 1px solid var(--paper-ink30); font: 9pt/1.5 Pretendard, sans-serif; }
[data-report-style] .sc-mark > div { display: flex; justify-content: space-between; align-items: baseline; gap: 1mm; }
[data-report-style] .sc-mark strong { font-size: 11pt; font-weight: 400; line-height: 1.2; }
[data-report-style] .sc-mark[data-wrong="true"] { border: 1px solid var(--paper-ink30); }
[data-report-style] .sc-mark[data-wrong="true"] strong { font-weight: 400; }

[data-report-style] .sc-mark p { margin-top: 1mm; font-size: 9pt; }
[data-report-style] .sc-legend { margin-top: 1mm; font: 9pt/1.5 Pretendard, sans-serif; }
[data-report-style] .sc-wrongTable { width: 100%; border-collapse: collapse; table-layout: fixed; font: 9pt/1.6 Pretendard, sans-serif; }
[data-report-style] .sc-wrongTable caption { text-align: left; padding-bottom: 1mm; font-size: 9pt; }
[data-report-style] .sc-wrongTable :is(th,td) { text-align: left; padding: 1.2mm 2mm; border-bottom: 1px solid var(--paper-ink30); vertical-align: top; white-space: pre-wrap; overflow-wrap: anywhere; }
[data-report-style] .sc-wrongTable th { font-weight: 650; }
[data-report-style] .sc-wrongTable[data-er-wrong-columns="2"] :is(th,td):nth-child(4) { border-left: 1px solid var(--paper-ink); }
[data-report-style] .sc-wrongTable tr { break-inside: avoid; }
[data-report-style] .sc-average, [data-report-style] .sc-retries, [data-report-style] .sc-units, [data-report-style] .sc-contact { font: 9pt/1.65 Pretendard, sans-serif; }
[data-report-style] .sc-average strong { font-size: 14pt; }
[data-report-style] .sc-units { padding-left: 6mm; }
[data-report-style] .sc-contact { border-top: 1px solid; padding-top: 2mm; white-space: pre-wrap; }
[data-report-style] .sc-pageEnd { margin-top: auto; padding-top: 2mm; border-top: 1px solid var(--paper-ink30); font: 9pt/1.5 Pretendard, sans-serif; text-align: right; }

/* H1 — 선택된 지면의 명조 이름·얇은 머리선·가로 숫자 기록. */



[data-report-style="H1"] .sc-score { border-top: 1px solid var(--paper-ink30); padding-top: 2mm; }
[data-report-style="H1"] .sc-teacherNote { border-bottom: 1px solid var(--paper-ink30); padding-bottom: 2mm; }

/* 편지 — 넓은 행간의 본문, 작은 덧붙임, 표에는 가로선만. */
[data-report-style="letter"] .sc-sheet { font-family: "Noto Serif KR", serif; }
[data-report-style="letter"] .sc-academy { border: 0; padding: 0; }
[data-report-style="letter"] .sc-nameRow { grid-template-columns: 1fr auto; border-bottom: 1px solid; padding-bottom: 3mm; }
[data-report-style="letter"] .sc-nameRow h2 { font-size: 18pt; }
[data-report-style="letter"] .sc-examTitle { grid-column: 1 / -1; text-align: left; max-width: none; }
[data-report-style="letter"] .sc-teacherNote { padding: 2mm 0 4mm; }
[data-report-style="letter"] .sc-teacherNote h3 { font-weight: 400; }
[data-report-style="letter"] .sc-noteText { font-size: 11pt; line-height: 1.9; }
[data-report-style="letter"] .sc-score, [data-report-style="letter"] .sc-correctCount, [data-report-style="letter"] .sc-classAverage { display: grid; grid-template-columns: 33mm minmax(0,1fr); align-content: start; gap: 1mm 4mm; }
[data-report-style="letter"] .sc-original { grid-column: 2; }
[data-report-style="letter"] .sc-scoreValue strong { font-size: 18pt; }
[data-report-style="letter"] .sc-score h3, [data-report-style="letter"] .sc-correctCount h3 { padding-top: 1mm; }
[data-report-style="letter"] .sc-wrongTable :is(th,td) { padding-left: 0; padding-right: 3mm; border-bottom-style: dotted; }
[data-report-style="letter"] .sc-contact { border: 0; }
[data-report-style="letter"] .sc-marks { gap: 3mm; }
[data-report-style="letter"] .sc-mark { border: 0; border-bottom: 1px solid; }

/* 정오 격자 — 번호와 기호가 먼저, 틀린 칸의 두 줄 기록이 바로 아래에. */
[data-report-style="grid"] .sc-sheet { font-family: Pretendard, sans-serif; }
[data-report-style="grid"] .sc-academy { border-top: 4px solid; }
[data-report-style="grid"] .sc-nameRow h2 { font-family: Pretendard, sans-serif; font-weight: 750; }
[data-report-style="grid"] .sc-block > h3 { display: inline-block; border-bottom: 2px solid; }
[data-report-style="grid"] .sc-mark { border-color: var(--paper-ink30); padding: 1mm; }
[data-report-style="grid"] .sc-mark strong { font-size: 11pt; }
[data-report-style="grid"] .sc-mark[data-wrong="true"] { border-width: 1px; }
[data-report-style="grid"] .sc-score { display: flex; align-items: baseline; gap: 3mm; }
[data-report-style="grid"] .sc-correctCount { border-top: 1px solid; padding-top: 1mm; }

/* 장부 — 이름표 열과 기록 열, 모든 기록이 가는 줄 위에 놓인다. */
[data-report-style="ledger"] .sc-sheet { font: 10pt/1.65 Pretendard, sans-serif; }
[data-report-style="ledger"] .sc-body { border: .5px solid; }
[data-report-style="ledger"] .sc-block { display: grid; grid-template-columns: 30mm minmax(0,1fr); gap: 0 3mm; padding: 2mm; border-bottom: .5px solid; }
[data-report-style="ledger"] .sc-block:last-child { border-bottom: 0; }
[data-report-style="ledger"] .sc-block > h3 { grid-column: 1; grid-row: 1 / span 3; margin: 0; font-size: 9pt; font-weight: 600; border-right: .5px solid; padding-right: 2mm; }
[data-report-style="ledger"] .sc-block > :not(h3) { grid-column: 2; min-width: 0; }
[data-report-style="ledger"] .sc-academyHeader > *, [data-report-style="ledger"] .sc-footer > * { grid-column: 1 / -1; }
[data-report-style="ledger"] .sc-academy { border: 0; padding: 0; }
[data-report-style="ledger"] .sc-nameRow { margin-top: 1mm; }
[data-report-style="ledger"] .sc-nameRow h2 { font-family: Pretendard, sans-serif; font-size: 18pt; font-weight: 700; }
[data-report-style="ledger"] .sc-scoreValue strong { font-size: 21pt; font-weight: 750; }
[data-report-style="ledger"] .sc-correct strong { font-size: 14pt; }
[data-report-style="ledger"] .sc-noteText { font: 10pt/1.7 Pretendard, sans-serif; }
[data-report-style="ledger"] .sc-wrongTable :is(th,td) { padding: .8mm 1mm; border-color: var(--paper-ink); }
[data-report-style="ledger"] .sc-mark { padding: .6mm; }
[data-report-style="ledger"] .sc-contact { padding: 0; border: 0; }

[data-report-style] .sc-body { flex: none; }
[data-report-style] .sc-sheet .sc-pageEnd { margin-top: auto; }
[data-report-style] .sc-numberRow { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 4mm; }
[data-report-style] .sc-numberRow .sc-block { min-width: 0; }
[data-report-style] .sc-wrongTable { min-width: 0; }
[data-report-style="letter"] .sc-numberRow :is(.sc-score,.sc-correctCount) { display: block; }
[data-report-style="letter"] .sc-numberRow h3 { margin-bottom: 1mm; padding-top: 0; }
[data-report-style="letter"] .sc-numberRow .sc-original { grid-column: auto; }
[data-report-style="letter"] .sc-numberRow .sc-correct strong { font-size: 18pt; }
[data-report-style="ledger"] .sc-wrongTable.sc-block { display: block; }
[data-report-style="ledger"] .sc-wrongTable.sc-block > h3 { border-right: 0; padding: 0; margin-bottom: 2mm; }
[data-report-style="ledger"] .sc-wrongTable.sc-block > table { width: 100%; }
[data-report-style="ledger"] .sc-footer { display: block; }
@media print { [data-report-style] { margin: 0; } }
`;
