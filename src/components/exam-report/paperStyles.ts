/** 선택된 H1 CSS의 정본. 화면과 서버 HTML이 같은 문자열을 쓴다. */
export const EXAM_REPORT_PAPER_CSS = `
@font-face {
  font-family: "Noto Serif KR";
  src: url("/fonts/NotoSerifKR-subset.woff2") format("woff2");
  font-weight: 100 900;
  font-style: normal;
  font-display: block;
}
@font-face {
  font-family: Pretendard;
  src: url("/fonts/PretendardVariable.woff2") format("woff2");
  font-weight: 45 920;
  font-style: normal;
  font-display: block;
}
[data-exam-report-page] {
  --report-width: 210mm;
  --report-height: 297mm;
  --font-noto-serif-kr: "Noto Serif KR";
  width: var(--report-width);
  height: var(--report-height);
  break-after: page;
}
[data-exam-report-page][data-landscape="true"] {
  --report-width: 297mm;
  --report-height: 210mm;
}
[data-exam-report-page]:last-child {
  break-after: auto;
}
[data-exam-report-page] .er-sheet {
  width: var(--report-width);
  height: var(--report-height);
  padding: 14mm 15mm 10mm;
  display: flex;
  flex-direction: column;
  gap: 5mm;
  background: var(--paper-color);
  box-shadow: none;
  font-size: 10pt;
  font-weight: 400;
  line-height: 1.65;
  font-variant-numeric: tabular-nums;
  --report-tone: var(--paper-ink);
}
[data-exam-report-page] .er-sheet :is(p, h2, h3, dl, dd) {
  margin: 0;
}
[data-exam-report-page] .er-paperHead {
  border-top: 2px solid var(--report-tone);
  padding-top: 4mm;
}
[data-exam-report-page] .er-brand {
  font-weight: 700;
  font-size: 11pt;
}
[data-exam-report-page] .er-brand span {
  padding-left: 4mm;
  font-family: var(--paper-font-sans);
  font-size: 9pt;
  font-weight: 400;
}
[data-exam-report-page] .er-titleRow {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 6mm;
  margin-top: 5mm;
}
[data-exam-report-page] .er-titleRow h2 {
  font-size: 23pt;
  font-weight: inherit;
  line-height: 1.35;
  overflow-wrap: anywhere;
}
[data-exam-report-page] .er-titleRow p {
  font-size: 9pt;
}
[data-exam-report-page] .er-examName {
  flex: none;
  text-align: right;
}
[data-exam-report-page] .er-numbers {
  display: flex;
  gap: 4mm;
  border-top: 1px solid var(--paper-ink15);
  border-bottom: 1px solid var(--paper-ink15);
  padding: 5mm 0;
  font-family: var(--paper-font-sans);
}
[data-exam-report-page] .er-numbers > div {
  flex: 1;
}
[data-exam-report-page] .er-numbers p {
  font-size: 9pt;
}
[data-exam-report-page] .er-numbers strong {
  font-size: 26pt;
  line-height: 1.4;
  font-weight: 750;
  padding-right: 2mm;
}
[data-exam-report-page] .er-numbers span {
  display: block;
  font-size: 9pt;
}
[data-exam-report-page] .er-area h3,
[data-exam-report-page] .er-problem h3 {
  font-family: var(--paper-font-sans);
  font-weight: 700;
  font-size: 11pt;
  margin-bottom: 2mm;
}
[data-exam-report-page] .er-wrongTable {
  width: 100%;
  border-collapse: collapse;
  font-size: 9pt;
  font-family: var(--paper-font-sans);
}
[data-exam-report-page] .er-wrongTable th {
  text-align: left;
  font-weight: 600;
  border-bottom: 1px solid var(--paper-ink30);
}
[data-exam-report-page] .er-wrongTable :is(th, td) {
  padding: 1.4mm 2mm;
  border-bottom: 1px solid var(--paper-ink15);
}
[data-exam-report-page] .er-wrongTable :is(th, td):first-child {
  width: 16mm;
}
[data-exam-report-page] .er-note {
  padding-top: 3mm;
  border-top: 1px solid var(--paper-ink30);
}
[data-exam-report-page] .er-note p {
  white-space: pre-line;
  overflow-wrap: anywhere;
}
[data-exam-report-page] .er-method,
[data-exam-report-page] .er-coverage {
  font: 9pt/1.6 var(--paper-font-sans);
  color: var(--paper-ink70, #3a3a40);
}
[data-exam-report-page] .er-coverage {
  margin-top: auto !important;
}
[data-exam-report-page] .er-footer {
  display: flex;
  justify-content: space-between;
  border-top: 1px solid var(--paper-ink15);
  padding-top: 2mm;
  margin-top: auto;
  font: 9pt/1.5 var(--paper-font-sans);
}
[data-exam-report-page] .er-problemList {
  display: grid;
  grid-template-rows: 1fr 1fr;
  flex: 1;
  gap: 8mm;
}
[data-exam-report-page] .er-problem {
  border-bottom: 1px solid var(--paper-ink15);
}
[data-exam-report-page] .er-problem h3 span {
  font-size: 9pt;
  font-weight: 400;
  padding-left: 3mm;
}
[data-exam-report-page] .er-stem {
  padding: 6mm 0 12mm;
  font-size: 11pt;
}
[data-exam-report-page] .er-problem dl {
  display: grid;
  grid-template-columns: 12mm 1fr;
  gap: 3mm;
  font-size: 10pt;
}
[data-exam-report-page] .er-problem dt {
  font-family: var(--paper-font-sans);
  font-size: 9pt;
  font-weight: 600;
}
[data-exam-report-page] .er-classMeta {
  font: 10pt/1.6 var(--paper-font-sans);
}
[data-exam-report-page] .er-matrix {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  font: 9pt/1.5 var(--paper-font-sans);
  text-align: center;
}
[data-exam-report-page] .er-matrix caption {
  text-align: left;
  margin-bottom: 3mm;
  font-weight: 600;
}
[data-exam-report-page] .er-matrix :is(th, td) {
  border: 1px solid var(--paper-ink15);
  padding: 3mm 0.4mm;
}
[data-exam-report-page] .er-matrix th:first-child {
  width: 31mm;
  word-break: keep-all;
  overflow-wrap: anywhere;
}
[data-exam-report-page] .er-matrix :is(th, td):last-child {
  width: 17mm;
}
[data-exam-report-page] .er-matrix td[data-wrong="true"] {
  font-weight: 700;
}
[data-exam-report-page] .er-matrix tfoot {
  border-top: 2px solid var(--paper-ink);
}
/* A4Page의 외부 CSS나 앱 Tailwind 없이도 같은 H1을 그린다. */
[data-exam-report-page] .er-sheet {
  box-sizing: border-box;
  overflow: visible;
  color: var(--paper-ink);
  font-family: var(--paper-font-serif);
  flex: none;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
[data-exam-report-page] .er-examName {
  white-space: pre-line;
  max-width: 70mm;
  overflow-wrap: anywhere;
}
[data-exam-report-page] .er-titleRow > div {
  min-width: 0;
}
[data-exam-report-page] .er-problemList[data-question-count="1"] {
  grid-template-rows: 1fr;
}
[data-exam-report-page] .er-problem {
  min-width: 0;
  min-height: 0;
  break-inside: avoid;
}
[data-exam-report-page] .er-problem h3,
[data-exam-report-page] .er-problem dd {
  overflow-wrap: anywhere;
}
[data-exam-report-page] .er-note p {
  min-height: 1.65em;
}
[data-exam-report-page] .er-stem [data-paper-view] > div {
  font: inherit;
  line-height: inherit;
}
[data-exam-report-page] .prose {
  font-family: inherit;
  color: inherit;
  max-width: none;
}
[data-exam-report-page] .prose :is(p, div) {
  line-height: inherit;
}
[data-exam-report-page] .prose p {
  margin: 0;
}
[data-exam-report-page] .er-problem img {
  display: block;
  max-width: min(100%, 70mm);
  height: auto;
  margin: 3mm auto;
  mix-blend-mode: multiply;
}
[data-exam-report-page] [data-figure-svg] {
  margin: 3mm auto;
  max-width: 70mm;
}
[data-exam-report-page] [data-figure-svg][data-figure-size="compact"] {
  max-width: 37mm;
}
[data-exam-report-page] [data-figure-svg][data-figure-size="mid"] {
  max-width: 64mm;
}
[data-exam-report-page] [data-figure-svg][data-figure-size="pair"] {
  max-width: 97mm;
}
[data-exam-report-page] [data-figure-svg] > svg {
  width: 100%;
  height: auto;
}
[data-exam-report-page] .er-problem svg {
  display: block;
  vertical-align: middle;
}
[data-exam-report-page] [data-paper-view] .grid {
  display: grid;
  gap: 2mm 4mm;
}
[data-exam-report-page] [data-paper-view] .grid-cols-1 {
  grid-template-columns: 1fr;
}
[data-exam-report-page] [data-paper-view] .grid-cols-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
[data-exam-report-page] [data-paper-view] .grid-cols-3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
[data-exam-report-page] [data-paper-view] .flex {
  display: flex;
}
[data-exam-report-page] [data-paper-view] .flex-wrap {
  flex-wrap: wrap;
}
[data-exam-report-page] [data-paper-view] .flex-col {
  flex-direction: column;
}
[data-exam-report-page] [data-paper-view] .items-start {
  align-items: flex-start;
}
[data-exam-report-page] [data-paper-view] .items-center {
  align-items: center;
}
[data-exam-report-page] [data-paper-view] .items-baseline {
  align-items: baseline;
}
[data-exam-report-page] [data-paper-view] .justify-center {
  justify-content: center;
}
[data-exam-report-page] [data-paper-view] .flex-1 {
  flex: 1 1 0%;
  min-width: 0;
}
[data-exam-report-page] [data-paper-view] .flex-shrink-0 {
  flex-shrink: 0;
}
[data-exam-report-page] [data-paper-view] [class~="gap-1.5"] {
  gap: 6px;
}
[data-exam-report-page] [data-paper-view] img.w-full {
  width: 100%;
}
[data-exam-report-page] [data-paper-view] .gap-4 {
  gap: 16px;
}
[data-exam-report-page] [data-paper-view] .mt-4 {
  margin-top: 16px;
}
[data-exam-report-page] [data-paper-view] .gap-y-2 {
  row-gap: 8px;
}
[data-exam-report-page] [data-paper-view] .gap-x-8 {
  column-gap: 32px;
}
[data-exam-report-page] [data-paper-view] [data-box-card] {
  border: 1px solid var(--paper-ink30);
  padding: 4mm;
  margin: 4mm 0;
  overflow: visible;
}
[data-exam-report-page] .prose .border:not([data-box-card]) {
  border: 1px solid var(--paper-ink30);
  padding: 4mm;
  margin: 4mm 0;
}
[data-exam-report-page] [data-paper-view] [data-side-by-side] {
  border: 0;
  padding: 0;
  margin: 2mm 0;
}
[data-exam-report-page] [data-box-header] {
  text-align: center;
  margin-bottom: 1mm;
}
[data-exam-report-page] [data-box-item] {
  min-width: 0;
  overflow-wrap: anywhere;
}
[data-exam-report-page] [data-hwpx-grid] {
  gap: 1mm 6mm;
  align-items: baseline;
}
[data-exam-report-page] .katex {
  font-size: 1.1em;
}
@media print {
  [data-exam-report-page] {
    margin: 0;
    box-shadow: none;
  }
}
`;
