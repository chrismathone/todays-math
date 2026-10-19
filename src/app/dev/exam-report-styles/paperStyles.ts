import { EXAM_REPORT_PAPER_CSS } from "@/components/exam-report/paperStyles";

/** 개발 시안과 서버 HTML이 같은 CSS를 쓴다. 모든 상태는 흑백의 선·글자·기호로 남는다. */
export const STYLE_CANDIDATE_CSS = `${EXAM_REPORT_PAPER_CSS}
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
[data-report-style] .sc-correct strong { font-size: 18pt; line-height: 1.1; }
[data-report-style] .sc-correct span { font-size: 9pt; }
[data-report-style] .sc-scoreValue, [data-report-style] .sc-correct { break-inside: avoid; }
[data-report-style] .sc-noteText { font-size: 10pt; line-height: 1.7; white-space: pre-wrap; }
[data-report-style] .sc-marks { display: grid; grid-template-columns: repeat(5, minmax(0,1fr)); gap: 2mm; }
[data-report-style] .sc-mark { min-width: 0; padding: 1mm; border: 1px solid var(--paper-ink30); font: 9pt/1.5 Pretendard, sans-serif; }
[data-report-style] .sc-mark > div { display: flex; justify-content: space-between; align-items: baseline; gap: 1mm; }
[data-report-style] .sc-mark strong { font-size: 15pt; font-weight: 400; line-height: 1.2; }
[data-report-style] .sc-mark[data-wrong="true"] { border: 1.5px solid var(--paper-ink); }
[data-report-style] .sc-mark[data-wrong="true"] strong { font-weight: 850; }
[data-report-style] .sc-mark[data-wrong="true"] .sc-no { font-weight: 700; text-decoration: underline; text-underline-offset: 2px; }
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
[data-report-style="H1"] .sc-body { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); align-items: start; }
[data-report-style="H1"] .sc-block { grid-column: span 2; }
[data-report-style="H1"] :is(.sc-score,.sc-correctCount) { grid-column: span 1; }
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

/* 증서 — 실제 인쇄되는 이중 액자, 중앙의 큰 이름, 대칭의 기록. */
[data-report-style="certificate"] .sc-sheet { padding: 17mm 22mm 14mm; position: relative; }
[data-report-style="certificate"] .sc-sheet::before, [data-report-style="certificate"] .sc-sheet::after { content: ""; position: absolute; inset: 8mm; border: 1.5px solid var(--paper-ink); pointer-events: none; }
[data-report-style="certificate"] .sc-sheet::after { inset: 10mm; border-width: .5px; }
[data-report-style="certificate"] .sc-academy { border: 0; text-align: center; padding-top: 2mm; }
[data-report-style="certificate"] .sc-academyName { font-size: 14pt; font-weight: 500; letter-spacing: .15em; }
[data-report-style="certificate"] .sc-nameRow { display: flex; flex-direction: column; align-items: center; gap: 2mm; margin-top: 5mm; }
[data-report-style="certificate"] .sc-nameRow h2 { font-size: 30pt; font-weight: 500; }
[data-report-style="certificate"] .sc-nameRow p { text-align: center; }
[data-report-style="certificate"] .sc-examTitle { max-width: 100%; }
[data-report-style="certificate"] .sc-block > h3 { text-align: center; font-family: "Noto Serif KR", serif; font-weight: 500; }
[data-report-style="certificate"] .sc-score, [data-report-style="certificate"] .sc-original, [data-report-style="certificate"] .sc-average { text-align: center; }
[data-report-style="certificate"] .sc-scoreValue strong { font-family: "Noto Serif KR", serif; font-size: 32pt; font-weight: 500; }
[data-report-style="certificate"] .sc-correct { justify-content: center; }
[data-report-style="certificate"] .sc-noteText { text-align: center; line-height: 1.8; }
[data-report-style="certificate"] .sc-wrongTable { border: .5px solid; }
[data-report-style="certificate"] .sc-wrongTable :is(th,td) { text-align: center; }
[data-report-style="certificate"] .sc-contact, [data-report-style="certificate"] .sc-retries { text-align: center; }
[data-report-style="certificate"] .sc-pageEnd { text-align: center; }

/* 신문 — 제호와 호수, 점수 제목, 본문 2단과 오답 2단. */
[data-report-style="newspaper"] .sc-academy { border-top: 3px double; border-bottom: 3px double; padding: 2mm 0; }
[data-report-style="newspaper"] .sc-academyName { font-size: 26pt; text-align: center; font-weight: 800; letter-spacing: -.05em; line-height: 1.2; }
[data-report-style="newspaper"] .sc-motto { text-align: center; letter-spacing: .2em; }
[data-report-style="newspaper"] .sc-nameRow { margin-top: 3mm; grid-template-columns: 1fr 1fr 1.5fr; }
[data-report-style="newspaper"] .sc-nameRow h2 { font-size: 13pt; font-weight: 700; }
[data-report-style="newspaper"] .sc-block > h3 { padding-bottom: 1mm; border-bottom: 1px solid; font-family: "Noto Serif KR", serif; font-size: 11pt; }
[data-report-style="newspaper"] .sc-noteText { column-count: 2; column-gap: 8mm; column-rule: .5px solid; }
[data-report-style="newspaper"] .sc-scoreValue strong { font-size: 64pt; font-weight: 850; letter-spacing: -.08em; }
[data-report-style="newspaper"] .sc-scoreValue span { display: inline-block; margin-left: 5mm; }
[data-report-style="newspaper"] .sc-correctCount { display: flex; gap: 6mm; align-items: baseline; border-block: .5px solid; padding-block: 2mm; }
[data-report-style="newspaper"] .sc-correctCount h3 { border: 0; padding: 0; }
[data-report-style="newspaper"] .sc-retries { column-count: 2; column-gap: 8mm; }
[data-report-style="newspaper"] .sc-units { display: flex; gap: 10mm; }
[data-report-style="newspaper"] .sc-mark { border: 0; border-bottom: 1px solid; }

/* 정오 격자 — 번호와 기호가 먼저, 틀린 칸의 두 줄 기록이 바로 아래에. */
[data-report-style="grid"] .sc-sheet { font-family: Pretendard, sans-serif; }
[data-report-style="grid"] .sc-academy { border-top: 4px solid; }
[data-report-style="grid"] .sc-nameRow h2 { font-family: Pretendard, sans-serif; font-weight: 750; }
[data-report-style="grid"] .sc-block > h3 { display: inline-block; border-bottom: 2px solid; }
[data-report-style="grid"] .sc-mark { border-color: var(--paper-ink); padding: 1mm 1.5mm; }
[data-report-style="grid"] .sc-mark strong { font-size: 17pt; }
[data-report-style="grid"] .sc-mark[data-wrong="true"] { border-width: 2px; }
[data-report-style="grid"] .sc-score { display: flex; align-items: baseline; gap: 3mm; }
[data-report-style="grid"] .sc-correctCount { border-top: 1px solid; padding-top: 1mm; }

/* 큰 숫자 — 숫자가 지면의 주인, 나머지는 얇고 짧은 줄. */
[data-report-style="numbers"] .sc-sheet { font-family: Pretendard, sans-serif; }
[data-report-style="numbers"] .sc-academy { border: 0; padding: 0; }
[data-report-style="numbers"] .sc-academyName { font: 600 10pt/1.5 Pretendard, sans-serif; }
[data-report-style="numbers"] .sc-nameRow h2 { font-family: Pretendard, sans-serif; font-weight: 750; }
[data-report-style="numbers"] .sc-scoreValue strong { font-size: 86pt; font-weight: 850; letter-spacing: -.075em; line-height: 1; }
[data-report-style="numbers"] .sc-scoreValue span { display: block; padding: 1mm 0 0; font-size: 11pt; }
[data-report-style="numbers"] .sc-correct strong { font-size: 52pt; font-weight: 800; letter-spacing: -.05em; }
[data-report-style="numbers"] .sc-correctCount { border-bottom: 2px solid; padding-bottom: 3mm; }
[data-report-style="numbers"] .sc-block > h3 { font-size: 9pt; font-weight: 500; }
[data-report-style="numbers"] .sc-mark { border: 0; border-left: 1px solid; }
[data-report-style="numbers"] .sc-contact { border: 0; }

/* 장부 — 이름표 열과 기록 열, 모든 기록이 가는 줄 위에 놓인다. */
[data-report-style="ledger"] .sc-sheet { font: 9pt/1.6 Pretendard, sans-serif; }
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
[data-report-style="ledger"] .sc-noteText { font: 9pt/1.6 Pretendard, sans-serif; }
[data-report-style="ledger"] .sc-wrongTable :is(th,td) { padding: .8mm 1mm; border-color: var(--paper-ink); }
[data-report-style="ledger"] .sc-mark { padding: .6mm; }
[data-report-style="ledger"] .sc-contact { padding: 0; border: 0; }
@media print { [data-report-style] { margin: 0; } }
@page { size: A4 portrait; margin: 0; }
`;
