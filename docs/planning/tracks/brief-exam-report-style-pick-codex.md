# 성적표 스타일 4가지 — codex 독립 판단 (리드와 합의용, 원장님 2026-10-19 «합의 방향으로»)

원장님이 성적표 스타일 선택을 리드(Claude) · codex 합의에 맡겼다(23번 문서 §7.2 와 같은 방식 — 둘이 **따로** 답하고 맞춘다). 리드의 답은 보지 말고 너의 판단만 낸다.

대상: `/dev/exam-report-styles`(이 작업트리, 3220 포트 dev 서버) — H1(현행) + 편지형 · 증서형 · 신문형 · 정오 격자형 · 큰 숫자형 · 장부형. 구성 «요약 한 장» · «숫자만», 상황 13가지. 풀이는 성적표에 싣지 않는다(원장님 확정).
근거 문서: `docs/planning/23-achievement-report.md`(§7 확정 4건: 숙제는 안 해온 학생만 · A4 한 장 인쇄 · 월 1회 · 종합 점수 없음; 태도는 숫자가 아니라 문장), `docs/planning/05-design-system.md` §0(오늘의수학만의 틀 · AI 공장식 금지 목록), 기존 합의 `docs/planning/tracks/reports/exam-report-screen-hifi-consensus.md` · `exam-report-wrong-table-consensus.md`.

## 할 일
1. **실측**: 일곱 후보 × 두 구성 × 대표 상황(보통 · 틀린 16개 · 만점 · 결시 · 긴 문장 · 이력 한 회)을 서버 HTML(`renderStyleCandidate`) → 실제 Chromium PDF 로 만들어 쪽 수 · 넘침 · A4 한 장 여부 · 흑백(회색조) 가독을 잰다. 산출물은 저장소 밖 /Users/pss/Desktop/creative/report-style-pick-20261019/ (PDF · 첫 쪽 PNG).
2. **평가 기준**(각 후보 점수 + 한 줄 근거): ① 학부모가 10초 안에 «점수 · 잘한 것 · 보완할 것 · 다음 할 일»을 읽는가 ② A4 한 장 안에 끝나는가(요약 한 장) ③ 흑백 인쇄에서도 정보가 남는가 ④ 상황 13가지에서 깨지지 않는가 ⑤ 서로 다른 성격 — 4개가 서로 겹치지 않는 선택지인가 ⑥ 05 §0 «오늘의수학만의 틀» · AI 공장식 회피 ⑦ 숫자 과시 · 종합 점수 느낌 회피(23번 §7).
3. **4개 선택**과 각자의 «언제 쓰는 양식인가» 한 줄, 기본값 1개 추천, 탈락 후보의 탈락 이유. 고칠 점(선택 4개 각각 최대 3개)도.
4. 코드 변경 · 커밋 금지(측정 스크립트는 산출물 폴더에). 보고서 `docs/planning/tracks/reports/exam-report-style-pick-codex-20261019.md`.
