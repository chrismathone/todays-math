# 브리프 — 치수 점선을 도형 **바깥**으로

원장님 지적(2026-08-27): 화면에서 이등변삼각형의 길이 점선이 **도형을 가로지르고**
라벨이 겹쳐 보였다(`1111 cm` — 「11 cm」 둘이 포개진 것).
「저런 류 도형은 다 안쪽으로 구현되었을 것 같은데 확인.」

## 0. 내가 이미 잰 것 — 다시 조사하지 마라

```
python scripts/qa/probe-dim-outside.py --specs <스펙목록.json>

  잰 그림 143 · 치수 점선이 안쪽인 것 **141**
```

걸린 kind: `markedShape`(isoTri·para·pentagon·nonagon) · `areaPoly`(para·rhombus·trap)
· `trapFour`. **거의 전부다.**

판정기는 `scripts/qa/probe-dim-outside.py` 에 이미 있고 눈금(양성 1·음성 1)이 맞다.
`--selftest` 로 확인할 수 있다. **이 판정기를 고치지 마라** — 네 성적을 네가 매기게 된다.
필요하면 **왜 부족한지 보고서에 적어라.**

⚠️ 이 판정기는 한 번 눈이 멀었다. `core.figure_svg` 가 저장소 밖 의존물이라
import 가 죽으면 **치수가 있는 그림만 정확히 예외로 빠져** 「잰 그림 3」이 나온다.
지금은 제품과 같은 엔진 경로를 타고, 못 찾으면 멈춘다.

## 1. 원인을 이미 짚어 뒀다 (확인하고 시작하라)

`scripts/figure/elementary.py` 의 `_marked_shape` (약 2000행):

```python
# 변 길이 — `measured()`. 도형 **바깥**으로 벌린다.
nx, ny = -(b[1] - a[1]), b[0] - a[0]
outward = (mx - cx) * nx + (my - cy) * ny
parts.append(_length_mark(..., off=-11.0 if outward > 0 else 11.0))
```

주석은 「바깥으로 벌린다」인데 **부호가 뒤집힌 것으로 보인다.**
다만 `measured()` 의 `off` 부호 규약을 **내가 확인하지 않았다** — 저장소 밖
모듈(`vendor/figure-engine/core/figure_svg.py`)이다. **읽고 확인한 뒤 고쳐라.**
`areaPoly` · `trapFour` 도 같은 자리가 있는지 보라.

## 2. 목표

```
python scripts/qa/probe-dim-outside.py --specs specs.json
  → 치수 점선이 안쪽인 것 **0**
```

스펙 목록은 엔진에서 뽑는다(초등 문형 2,300개가 내는 그림 전량, 중복 제거):

```ts
// scratch/dump-specs.ts 로 만들어 쓰라 — 내가 쓴 것과 같은 방식
import { elementaryUnits, generateElementaryForm, listedForms, supportedTiers }
  from "@/lib/elementary/generate";
// 소단원 × 문형 × 씨앗 2 → figureSpec 을 JSON.stringify 로 중복 제거해 배열로
```

## 3. ⚠️ 바깥으로 밀면 **캔버스를 넘칠 수 있다**

지금 `_marked_shape` 는 `pad=30, size=104` 로 여백을 잡는다. 치수를 바깥으로
빼면 라벨이 그 여백을 넘어 **잘린다.** 여백을 함께 키워라.

그리고 **지면 폭이 등급을 가른다**(`figureSvgFrame`: viewBox 폭 ≤160 이면 140px,
≤320 이면 240px). 폭이 문턱을 넘나들면 **같은 유형인데 지면 글자 크기가 갈린다** —
2026-08-23 에 실제로 겪었다. 폭을 바꿨으면 **바꾼 뒤 폭을 찍어 보고서에 적어라.**

## 4. 겹치는 라벨도 같이 본다

원장님 화면의 `1111 cm` 는 두 라벨이 포개진 것이다. 바깥으로 빼면 대개 풀리지만,
**풀렸는지 재라** — 라벨 `<text>` 의 대략적 상자가 서로 겹치는지 세는 검사를
판정기에 **더해도 좋다**(그건 새 축이니 눈금 양성·음성을 같이 넣어라).

## 5. 지켜야 할 것

- `docs/planning/09-figure-engine-guide.md` 를 **먼저 읽어라** (D-61 · 재발 금지 §4).
- **관문**: `node scripts/qa/run-tests.mjs` — 「N passed」가 아니라 **종료 코드**.
- `npx tsc --noEmit` 를 따로 (관문은 타입을 안 본다). 기존 오류 2건
  `src/__tests__/unit/import.test.ts` 는 다른 세션 것이니 두어라.
- 새 워크트리이니 **`npx prisma generate` 를 먼저** 돌려라.
- 초등 판정기 `npx tsx scripts/qa/probe-elem-forms.ts` 가 **230/230 그대로**여야 한다.
- **공유 DB 를 건드리지 마라.** 이미 적재된 그림은 내가 따로 다시 그린다.
- 커밋은 kind 별로 나눠서. 보고는 파일로: `scratch/REPORT-dim.md`.

## 6. 착수 전에

`measured()` 의 `off` 규약을 **읽고** 무엇이 바깥인지 한 문단으로 보고한 뒤 시작하라.
추측으로 부호를 뒤집지 마라 — 뒤집어서 141이 0이 되는지는 **판정기가 말해 준다.**
