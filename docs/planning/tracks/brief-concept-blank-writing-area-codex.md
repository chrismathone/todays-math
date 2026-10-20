# 지시서 — 개념 백지 답란을 공용 `WritingArea` 로 (2026-10-20)

한국어로 보고한다(코드 · 경로 · 식별자만 원문).

## 결정

원장님이 «서술형 B와 개념 백지 양식 공유 비교»(`docs/planning/tracks/reports/descriptive-paper-concept-comparison-20261020.md`) §4 의 **1안 «답란만 공유»** 를 고르셨다(2026-10-20 «추천으로 진행»).

- 개념 백지의 줄 · 모눈 · 빈 내부를 공용 `src/components/print/WritingArea.tsx` 로 그린다.
- 🔴 **지면은 한 픽셀도 바뀌지 않는 것이 목표다.** 30px 줄 · `#d4d4d8` · A 그림 칸 16px 모눈 · `#e8e8eb` · 점선 예 상자 · 최소 높이 · flex 채움 · 쪽 나눔(`planSheet`) · 지면 코드 · 머리말 · 채점표는 그대로 둔다.
- A 그림 칸을 4mm 모눈으로 바꾸는 일, B/D/E 줄을 모눈으로 바꾸는 일은 **하지 않는다**(원장님이 따로 정할 일).
- 문장 속 빈칸(C 밑줄), 이름표, 지도 연결선, ○× 표시는 공용 부품 대상이 아니다.

## 할 일

1. 비교 보고서 §2 · §2 형식별 표에서 공유 후보로 적힌 자리(A 왼쪽 줄 · A 그림 모눈/예 상자 · B 쓰기 줄 · C «나» 풀 자리 · D 가지 줄 · E 쓰기 줄)를 코드에서 찾는다.
2. `WritingArea` 가 그 치수를 표현하지 못하면 부품을 넓힌다(선택 속성 · 기본값은 서술형 B 그대로). 서술형 B 의 출력은 바뀌면 안 된다.
3. TDD: 먼저 회귀 기준을 세운다 — 바꾸기 전 개념 백지 다섯 형식(학생지 · 채점표, 새 질문/옛 자료 둘 다)과 서술형 B 지면을 Chromium A4 PDF/스크린샷으로 떠 두고, 바꾼 뒤 픽셀 비교로 차이 0(또는 안티에일리어싱 수준만)을 보인다. `planSheet` 결과 · 지면 코드 지문이 같음을 시험으로 고정한다.
4. 기존 시험의 단정을 느슨하게 하지 않는다.
5. `/dev/print-check` 에 «대기» 항목 하나를 더한다(렌더러가 바뀌었으니 실물 회귀 확인).
6. 보고서: `docs/planning/tracks/reports/concept-blank-writing-area-20261020.md` — 바꾼 자리(파일:줄), 픽셀 비교 결과, 남긴 것. 큰 이미지는 저장소에 넣지 말고 경로만.

## 규칙

- 작업 폴더: 이 워크트리(외장 SSD · ExFAT). `._*` 파일은 커밋 금지. `node_modules` 는 심볼릭 링크 — `npm ci` · `prisma generate` · `git add` 금지. `git add -A` 금지.
- DB 무변경. 커밋 · 푸시하지 않는다(리드가 검토 후 올린다).
- 전체 `vitest` 대신 관련 시험 묶음 + `npx tsc --noEmit -p tsconfig.json` + 대상 ESLint + `npm run lint:affordance`.
- 개념 백지 필독: `docs/planning/26-concept-blank.md`.
