# 양식 색 C2 · 입력 패널 P1 — 제품 구현 (원장님 2026-10-19 «C2 로 가고 패널은 P1»)

앞 작업: `docs/planning/tracks/brief-print-info-color-codex.md` · 보고서 `docs/planning/tracks/reports/print-info-color-codex-20261019.md` · 시안 `/dev/print-color-hifi`(이 작업트리, 미커밋).

## 구현할 것 (시안 그대로 — 새로 정하지 않는다)
1. **C2 머리 면 · 번호**: 실제 여섯 템플릿(`src/components/unified/print/templates/`)에서 강조 색이 머리 면 · 번호 상자를 채운다. 면 위 글자는 검정/흰색 중 대비가 맞는 쪽(시안의 규칙). 정보 글자는 `readableColor` 규칙 유지. 기본 남색 포함 9색 전부.
2. **양식별 칸 구성**: 보고서 «서로 다른 템플릿별 제안 구성» 표대로 — 여섯 양식이 싣는 칸과 자리. 워크북 유형 · 전략 상자는 새 자리(시안대로).
3. **시험 종류는 여섯 양식 모두에 찍는다**(«없음»이면 생략). `SheetTagPicker` 의 «지면에 찍히지 않습니다 …» 안내는 걷고, 시안 패널의 문구를 쓴다.
4. **P1 패널**: 고른 양식이 싣지 않는 칸은 흐리게 · `disabled` · «이 양식에는 찍히지 않음» + 짧은 까닭. 입력값은 보존(양식을 바꿔 돌아오면 그대로).
5. 연산대장 · 시험지 만들기 · 문제 추출 · 내 시험지 등 이 양식을 쓰는 모든 출력 경로(미리보기 · 인쇄 · 서버 PDF · HWPX 가 양식 색/칸을 반영하는 범위)에서 같은 결과. HWPX 가 색 · 새 칸을 못 싣는 부분은 보고서에 적는다(억지로 넣지 않는다).
6. 시안 페이지 `/dev/print-color-hifi` 는 남겨 두되 C5(현재) 비교는 «이전»으로 이름만.

## 지키기
- 인쇄 지면을 바꿨으므로 `src/app/dev/print-check/items.ts` 에 여섯 양식 × C2 항목을 **대기**로(이미 등록한 것이 있으면 갱신).
- 기존 저장된 시험지 · 내 양식(print presets)이 열리면 새 규칙으로 그려지되 데이터는 바뀌지 않는다(저장 형식 변경 없음).
- 지면 넘침 · 쪽 나눔이 바뀌지 않는지 기존 지면 시험(`useMeasuredPages` 관련 · PrintCheck)으로 확인.
- 시험 · `npm run type-check` · 변경 파일 eslint · `npm run lint:affordance` 통과. DB · 커밋 금지. 보고서 `docs/planning/tracks/reports/print-color-impl-codex-20261019.md`.
