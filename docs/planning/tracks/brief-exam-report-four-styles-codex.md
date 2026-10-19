# 성적표 네 양식 — 제품 구현 (합의 `exam-report-style-consensus-20261019.md`)

1. 합의의 «구현 전 고칠 것»을 시안(`/dev/exam-report-styles`)에 먼저 적용하고 codex 의 기존 측정 방식(182벌 → 이번엔 4양식 × 2구성 × 13상황 = 104벌, 실제 Chromium PDF)으로 다시 잰다. 목표: 요약 한 장에서 넘치는 것은 오답 행뿐 · 재시험/문의가 2쪽으로 가는 일 0.
2. **제품**: 성적표 작업 화면(`ExamReportWorkspace`)에서 양식을 고를 수 있게 한다 — H1(기본) · 편지형 · 정오 격자형 · 장부형. 반 단위 지면 설정과 같은 자리 · 같은 방식(기존 구성 선택 옆, 새 모양을 지어내지 말고 기존 선택 부품 재사용 — D-159 PickerDialog 가 맞으면 그것). 선택은 기존 반 지면 설정 저장에 함께(저장 형식은 호환 — 값이 없으면 H1). 확정 보관 PDF 는 그대로 · 반 인쇄 · 미리보기 · 서버 PDF(paperHtml) 모두 같은 양식.
3. 시안 페이지에서 뺀 세 후보(증서 · 신문 · 큰 숫자)는 제품에 넣지 않는다(시안 페이지에는 «제외»로 남겨도 됨).
4. `src/app/dev/print-check/items.ts` 에 네 양식 실물 검수 항목(대기)과 시험 수 갱신. 관련 시험 · `npm run type-check` · 변경 파일 eslint · `npm run lint:affordance`. DB 스키마 변경이 필요하면 하지 말고 보고(저장값이 JSON 이면 그 안에). 커밋 금지. 보고서 `docs/planning/tracks/reports/exam-report-four-styles-codex-20261019.md`.
