# 치수 점선을 도형 바깥으로 — 결과 보고

작업일: 2026-08-27

## 결론

초등 문형 2,300개를 씨앗 2개씩 생성한 4,600개 결과에서 `figureSpec` 936개를
중복 제거해 제품 렌더 경로로 검사했다.

```text
수리 전  잰 그림 143 · 치수 점선이 안쪽인 것 141
수리 후  잰 그림 111 · 치수 점선이 안쪽인 것   0
```

수리 후 집계가 111로 줄어든 이유는 렌더 실패나 엔진 경로 이탈이 아니다. 수리 전
판정기는 `stroke-dasharray`가 있는 선을 모두 읽으므로 치수가 전혀 없는 `trapFour`,
`areaPoly/rhombus`, `prism`, `pyramid`, `cone`의 내부 분할선·숨은 모서리·숨은 호
32장도 치수로 세었다. 구조 점선은 보이는 점선 무늬를 그대로 유지하면서 짧은 실선
조각으로 표현하고, 실제 `measured()` 치수만 인라인 `stroke-dasharray` 식별자를 갖게
분리했다. 실제 치수가 있는 `cuboid`·`cylinder` 등은 수리 후에도 계속 집계된다.

## `measured()`의 `off` 규약

`vendor/figure-engine/core/figure_svg.py`의 `meas()`는 선분 `P→Q`의 단위 법선
`n=(-uy, ux)`를 만들고, `off>0`이면 `n` 쪽, `off<0`이면 반대쪽에 치수 곡선과
라벨을 함께 놓는다. SVG 좌표에서 수평선을 왼쪽→오른쪽으로 주면 `+off`는 아래다.
따라서 `_marked_shape`의 `(변 중점-무게중심)·(-(by-ay), bx-ax)`가 양수이면
`+11`, 음수이면 `-11`이 바깥이다. 종전 구현은 이 부호를 반대로 넘겼다.

## kind별 수리

| kind | 수리 내용 | 안쪽 수리 결과 |
|---|---|---:|
| `markedShape` | 무게중심 반대 법선으로 `off` 부호 수정, pad 30→40 | 10→0 |
| `areaPoly` | 삼각형·평행사변형·사다리꼴 높이 치수를 오른쪽 바깥으로 이동; 마름모 구조 점선을 치수 식별자와 분리 | 4→0 |
| `trapFour` | 내부 분할 점선을 치수 식별자와 분리 | 2→0 |
| `cuboid` | 숨은 모서리를 치수 식별자와 분리 | 81→0 |
| `prism` | 숨은 모서리를 치수 식별자와 분리 | 6→0 |
| `pyramid` | 숨은 모서리를 치수 식별자와 분리 | 4→0 |
| `cylinder` | 뒤쪽 밑면 호를 치수 식별자와 분리 | 17→0 |
| `cone` | 뒤쪽 밑면 호를 치수 식별자와 분리 | 17→0 |

## 캔버스·지면 폭 문턱

제품 문턱은 viewBox 폭 `≤160 → compact(140px)`, `≤320 → mid(240px)`, 그 위는
wide다.

| kind | 수리 전 폭 | 수리 후 폭 | 문턱 결과 |
|---|---:|---:|---|
| `markedShape` | 164 | 184 | 둘 다 mid; 문턱 이동 없음 |
| `areaPoly/para·trap` | 208 | 236 | 둘 다 mid; 문턱 이동 없음 |
| `areaPoly/rhombus` | 112 | 112 | compact 유지 |
| `trapFour` | 124 | 124 | compact 유지 |
| `cylinder` | 101.11~140 | 동일 | compact 유지 |
| `prism` | 111.14~129.06 | 동일 | compact 유지 |
| `pyramid` | 114.6~133.9 | 동일 | compact 유지 |
| `cone` | 71~106 | 동일 | compact 유지 |
| `cuboid` | 140.97~372.97 | 동일 | 입력 크기에 따라 기존부터 세 등급에 걸치지만 이번 수리 전후 폭은 동일 |

`cuboid`와 `cylinder`의 긴 높이 라벨 13개가 근사 상자 기준으로 왼쪽 viewBox를
1px 넘는 것도 발견했다. 왼쪽 여백을 4px 늘리고 오른쪽 여백을 4px 줄여 총 폭은
바꾸지 않았다. 최종 936개 스펙의 치수 라벨 285개를 재어 `라벨끼리 겹침 0`,
`viewBox 밖 라벨 0`이다.

## 판정기 한계

`scripts/qa/probe-dim-outside.py`의 설명은 “라벨과 가까운 치수 점선만 센다”고 되어
있지만, 실제 `parse_dashed_points()`는 모든 `stroke-dasharray` 선을 읽고 라벨 근접
조건을 구현하지 않는다. 판정기는 지시대로 수정하지 않았다. 대신 렌더 출력에서
구조 점선과 `measured()` 치수의 표현을 분리했다. 이 때문에 최종 `잰 그림`은
143이 아니라 실제 치수 후보가 있는 111이다. 눈금 2건은 그대로 통과한다.

## 검증

| 명령 | 결과 |
|---|---|
| `npx prisma generate` | 종료 코드 0 |
| `python scripts/qa/probe-dim-outside.py --selftest` | 눈금 2/2, 종료 코드 0 |
| `python scripts/qa/probe-dim-outside.py --specs scratch/specs.json` | 잰 그림 111 · 안쪽 0, 종료 코드 0 |
| `python scratch/audit-dim.py` | 치수 라벨 285 · 겹침 0 · viewBox 밖 0 |
| `npx tsx scripts/qa/probe-elem-forms.ts` | 230/230, 종료 코드 0 |
| `npx tsc --noEmit` | 종료 코드 0 |
| `node scripts/qa/run-tests.mjs` | 298 files, 11,291 tests 통과; 실데이터 판정기 19개 빨강 0; 종료 코드 0 |

공유 DB는 건드리지 않았다.
