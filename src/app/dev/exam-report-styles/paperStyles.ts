import { EXAM_REPORT_PAPER_CSS } from "@/components/exam-report/paperStyles";

/** 네 양식은 제품 CSS 그대로. 제외된 세 후보의 비교 이력만 개발 경로에 둔다. */
export const STYLE_CANDIDATE_CSS = `${EXAM_REPORT_PAPER_CSS}
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

`;
