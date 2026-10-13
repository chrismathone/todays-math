# 경상 통계 q13 r5 검수 r1 — Claude 검수자 절차

r5 는 r4 와 학생이 보는 본문·보기·답·해설·수학 사실이 같고, 학생에게 안 보이는 내부 설명 9곳의 편차 방향(«평균에서 각 관측값을 뺀» → «각 관측값에서 평균을 뺀»)만 고친 새 ID 다(`../gyeongsang-q13-metadata-repair-r5/repair-receipt.json`). **r4 의 승인은 r5 로 옮기지 않는다.** r5 는 아직 선택되지 않았다.

절차와 판정 12개 · 학생 7면 · 보고서 꼴은 GF14 절차 `../../gyeongsang-remaining-final14-r1/claude-review-r1/REVIEW-KIT.md` 와 같다. 다른 것만 적는다.

## 1단계 — 답을 모른 채 풀기

읽어도 되는 것: `blind/student-problems.json` · `blind/SOLVE-BRIEF.md` · `blind/blind-manifest.json`(그림 없음 — 표는 본문에 있다). 그 밖의 파일(`package/` · `source-identity-unsealed-r1/` · `../gyeongsang-q13-metadata-repair-r5/` · `../gyeongsang-stat-*` · 저장소의 다른 파일 · git 이력)은 열지 않는다.

결과: `claude-review-r1/solve/q13.json`, `solverId: "claude-opus-5-5-q13r5-r1"`.

## 2단계 — 봉인 뒤 검토

| 자료 | 경로 |
|---|---|
| r5 후보 | `package/private/q13/candidate.json` |
| r4 → r5 고친 기록 | `../gyeongsang-q13-metadata-repair-r5/repair-receipt.json` |
| r4 검수(비교만 — 승인 이전 금지) | `../gyeongsang-stat-final-review-r1/reports/q13.json` · `../gyeongsang-stat-final-review-r1/REVIEW.md` |
| r4 70mm 지면(학생 표면은 r5 와 같다고 적혀 있다 — 같은지 직접 대조) | `../gyeongsang-stat-final-review-r1/inspection/q13-expanded.png` |
| r5 학생 지면(SourceIdentity 가 만든 것) | `source-identity-unsealed-r1/qa/q13-student.png` |
| SourceIdentity 의 봉인 안 된 정확 계산(교차 검산) | `source-identity-unsealed-r1/proofs/q13-exact-calculations.json` |
| 원문·교육과정·단원 근거 | `../gyeongsang-stat-final-review-r1/evidence/source/` · `…/evidence/curriculum.json` · `…/evidence/bank-read-fresh-r3-20261008.json` · `…/evidence/family-rule-comparison.json` |

추가로 확인할 것:

- r4 와 r5 의 학생 표면(본문·보기·답·해설·표)이 바이트 수준에서 같은지 — 다르면 그 차이를 적는다.
- r5 의 비학생 칸 9곳이 편차의 정의(관측값 − 평균)와 맞는지, 다른 비학생 칸에 같은 방향 오류가 남았는지.
- 표는 그림이 아니다 — `figuresAndTables` 면은 표의 칸·값·빈칸으로 판정한다.

보고서: `claude-review-r1/reports/q13.json`(디지스트 · `status` 는 부모가 채운다).
