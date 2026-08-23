# 도형 엔진 기능 확장 브리프 — «완전 불가» 2갈래 착수 (2026-08-23, 원장님 지시)

`mid1-stat-figure-feasibility.md` 의 ❌ 두 줄을 엔진 기능으로 연다.
**원본 지면이 정본이다** — RPM 1-2 의 해당 쪽을 렌더해 눈으로 보고 맞춘다
(main 워크트리 `C:/Creative/testautocreator/.rpm-src/RPM 중학 1-2 학생용.pdf` —
워크트리에는 이 폴더가 없다. **절대경로로 읽어라**. 본문·수치를 베끼지 말 것 — 모양만).

시작 전 필독: `docs/planning/09-figure-engine-guide.md` **§4 전체** (재발 금지 목록 —
특히 §4-12 접함, §4-14 숨은 모서리, §4-15 ROUND_RATIO, §4-16 치수 표기 한 벌,
§4-17 viewBox 여백은 kind 가 세지 않는다, §4-20 받은 치수 전부 표기).

## 파일 소유권

| 세션 | 소유 | 새 테스트 |
|---|---|---|
| **v2-채색** | `vendor/figure-engine/core/figure_scene.py` (+ 필요시 `figure_quality.py`) | `src/__tests__/unit/figureRegions.test.ts` + probe 파이썬 스크립트(scripts/qa/) |
| **입체-kind** | `scripts/figure/elem_advanced.py` | `src/__tests__/unit/figureSolidKinds.test.ts` + probe |

서로의 파일·`elementary.py`·`render_spec.py`·기존 테스트 파일 수정 금지.
(등록은 `ADV_FIELDS/ADV_OPTIONAL/ADV_RENDER` 가 elem_advanced 안에서 끝난다 —
elementary.py 는 그걸 update 로 읽기만 한다. 건드릴 일 없음.)

## 세션 v2-채색 — FigureSpec v2 에 «영역» 축 신설

목표 유형(RPM 1-2 원과 부채꼴): **13·14·15 색칠한 부분의 넓이** (p92 0614 꽃잎 ·
0616 · 0619 · 0622 회전 반원 · 0623 반원 셋) · **16 끈의 길이** (p93 0625~0627 —
원 n개 배치 + 접선·호 벨트) · **11·12 (p91 — 원본 먼저 볼 것: 굴리기·자취 계열)**.

설계 지침:
- 최상위 키 `regions` 신설: 닫힌 경계를 **선분·원호 조각의 시퀀스**로 받는다.
  예: `{"boundary": [{"seg": ["A","B"]}, {"arc": {"circle":"c","from":"B","to":"A","dir":"ccw"}}], "fill": "#f2d5c8"}`
  — 정확한 스키마는 세션이 정하되, 기존 spec 문법(이름 참조·엄격 검증·모르는 키는
  FigureSpecError)과 한 결로. **조각 끝점이 이어지지 않으면 던진다** (조용히 채우기 금지).
- 호 **스트로크**(채색 없이 호만 긋기)도 같은 축에서 나오게 — 끈 유형의 곡선 부분.
- fill 은 `_safe_paint` 를 통과한 연한 색만. 채색이 라벨·치수를 가리면 안 된다.
- **실증**: 위 RPM 문항 5개 이상을 스펙으로 재현해 스크린샷 육안 + 원본과 나란히 대조.

## 세션 입체-kind — elem_advanced 에 kind 3+1

목표 유형(RPM 1-2): **입체도형의 겉넓이와 부피 07 구멍이 뚫린 기둥** (p127 0845~0848 —
원기둥⊖원기둥·직육면체⊖직육면체·정육면체⊖원기둥) · **08 일부를 잘라 낸 입체**
(p127 0849~0851 — L자·홈·계단 직육면체) · **회전체 계열** (p130~ 원본 먼저 볼 것 —
회전 **전** 반평면 도형 + 회전축 점선 + 화살표).

- `hollowSolid`: outer(cuboid|cylinder) × inner(cuboid|cylinder), 관통 구멍.
  숨은 윤곽(구멍 안쪽) 점선 — §4-14 규칙. 치수는 dimension 표기 한 벌(§4-16).
- `cutCuboid`: 직육면체에서 작은 직육면체를 코너/홈/계단으로 잘라 낸 입체.
  잘라 낸 자리의 안쪽 면이 보이는 각도로. RPM 0849·0850·0851 세 모양이 표본.
- `revolvePlan`: 회전 전 그림 — 반평면 도형(rect | rightTri | semicircle | 그 조합)
  + 회전축(점선, 축 라벨 ℓ) + 회전 화살표. 원본 지면과 대조.
- (원본에서 필요가 확인되면) `stackCubes`·기존 kind 재사용 우선 — **같은 그림이면
  새 kind 를 만들지 말고 있는 것을 쓴다.**
- **실증**: RPM 문항 6개 이상 재현 스크린샷 육안 + 원본 대조.

## 공통 계약

1. 렌더 경로는 그대로 `render_spec.py` — 배선 수정 없이 새 kind/키가 통과해야 한다.
2. 검증 실패는 **던진다**(FigureSpecError/ValueError) — 조용한 폴백 금지.
3. 테스트: 스펙→SVG 스모크 + **불변식**(닫힘 검사·점선 존재·접함·치수 개수)
   + 변이 3개 이상(검증 끄기·불변식 깨기) 빨강 확인. 변이 전 파일 변경 여부 확인
   (2026-08-21 교훈). 파이썬 쪽 검증도 vitest 에서 render_spec.py 를 spawn 해 잰다
   (기존 elementaryFigure.test.ts 패턴 참고 — 파일은 새로 만들 것).
4. 커밋은 만들자마자. main 병합 금지(main 세션이 한다). 완료 시
   `orca worktree set --worktree active --comment` 로 요약.
5. **D-07**: 이 그림들은 최종적으로 원장님 육안 확정 대상이다. 스크린샷 산출물을
   `C:/tmp/` 에 남겨 병합 검수 때 바로 볼 수 있게 하라.
