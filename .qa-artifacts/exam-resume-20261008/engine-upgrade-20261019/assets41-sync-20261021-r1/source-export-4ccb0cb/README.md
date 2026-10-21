# math-figure-editor → todays-math 전달 묶음 (2026-10-21)

독립 웹앱 **math-figure-editor**(todays-math 도형 편집기를 떼어 낸 것)에서 고친 것을 todays-math 에 똑같이 들이기 위한 묶음입니다.
사용자 지시: «우리 웹앱에서 업데이트한 부분은 마무리되면 todays-math에도 넘겨서 동일하게 업데이트 적용».

- 앱 저장소: `D:\math-figure-editor` (커밋 `52dfe92`, 2차 `54bc560`, 4차 `e90f66d`). **읽기만** 해 주세요.
- **4차(최종 통합)는 바로 아래 «4차» 절 — 패치 07·08 두 개면 끝.**
- **2차(병목 전수검사)는 아래 «2차» 절** — 패치 03 · 대조 지적 거르기 · 마지막 대조 생략.
- **3차(실물 그림 조각·원근 직각·단위 정자)는 «3차» 절** — 패치 04·05.
- 편집기·AI 지시문·엔진 파일은 todays-math 와 **같은 경로·같은 파일**이라(상류 `3aa03a021` 에서 줄바꿈 말고 동일했음) 패치가 그대로 붙습니다.
- 표시: ★ 바로 들이기 · ◆ 검토 후 옮겨 심기(구조가 달라 손이 감) · ○ 참고 · ✕ 해당 없음

## ★★★ 4차 — 최종 통합: `07` + `08` 두 개면 끝 (2026-10-21 저녁, 앱 `e90f66d`)

사용자 지시 «우리 엔진 마무리되면 todays-math 와 시험지 한글화에도 재적용». 01~06 은 이 둘에 모두 들어 있으므로
**아직 아무것도 붙이지 않았다면 07·08 만 붙이면 됩니다**(아래 01~06 절은 이력·설명용).

| 파일 | 담긴 것 | 적용 검사 |
|---|---|---|
| `patches/07-engine-all.patch` | 엔진 전부(06 + 그 뒤): `figure_scene`(perspective)·`label_markup`·`figure_quality`·`graph_scene`(grid)·`render_spec`·`scene_assets`·`engine-catalog.json` + **그림 조각 41종**(이미지 생성 → 회색 4단 다각형 추적, 평면 29·입체 12 — 태그 `입체`) · `anchors.json`(건물 앞 모서리 `edgeBase`·`edgeTop`) | main(3aa03a021)·origin/main 둘 다 통과 |
| `patches/08-editor-all.patch` | 편집기·지시문 전부(01·05 의 `src/` + 그 뒤) — 27개 파일 | main·origin/main 둘 다 통과 |

```
git apply --3way <이 폴더>/patches/07-engine-all.patch      # todays-math 저장소 루트에서
git apply --3way <이 폴더>/patches/08-editor-all.patch
python <이 폴더>/engine-check/check_engine.py <todays-math 루트>   # 8종 모두 «같음»(입체 조각 · 조각만 있는 장면 추가)
```

### 07 — 엔진에서 06 뒤로 바뀐 것
- **그림 조각 41종을 다시 만들었다**(사용자 «코드로 만든 에셋 말고 이미지 생성으로»). 원본 이미지는 앱 `docs/asset-sources/`,
  도구는 `scripts/asset-tools/`(`trace_asset.py`·`build_assets.py`). 각 조각은 엔진 정제기(`sanitize_svg`)를 통과하는지 빌드에서 확인.
- `scene_assets.py` ① `from`·`to` 조각은 `anchors.json` 의 **`edgeBase`·`edgeTop`** 에 맞춘다 — 건물은 잰 선(CD)이 **앞 모서리**
  (가운데 축에 세우면 건물이 선을 가로질렀다, 제일고 기하 삼수선). ② 한 점(`at`) 조각은 **줄여서 맞출 수 있을 때만** 줄인다
  (도형만으로 틀을 넘으면 조각만 쪼그라들어 집이 원래의 14% 가 됐다).
- 시험지 한글화는 같은 내용을 반영했고 대조 8종 «모두 같음»(조각만 있는 장면 수정 포함).

### 08 — 편집기·지시문에서 05 뒤로 바뀐 것 (★ 그대로)
- 툴바 **«그림» 메뉴**(`FigureAssetMenu.tsx`·`figureAssetLibrary.ts`) — 조각을 평면/입체 탭으로 골라 넣는다(배경·모눈 뒤 층, 선 굵기 맞춤).
- **겹친 묶음 · 한 겹 풀기**(`pushFigureGroup`/`popFigureGroup`, `data-group-stack`) — 묶음을 다시 묶을 수 있고 Ctrl+Shift+G 가 한 겹만 푼다.
- 크기 조절 조절점 위에서 **↖↘·↗↙·↔·↕ 커서**(끄는 동안에도 유지) · 목록 단추가 다시 그려져 초점이 body 로 떨어져도 단축키가 먹는다.
- AI 고치기 `addAngle` 의 **`perspective`**(원근 그림의 비스듬한 직각 — «D 직각 표시»가 125° 라며 거절되던 것).
- 지시문(`figure-prompt.ts`): 계약표 사본에 `assets` 를 더한다(카탈로그에 없어 모델이 «자산으로 넣지 못해 제외»하던 것) ·
  좌표는 그림 픽셀이 아닌 명세 단위 · 각 호는 angles 항목으로 · 치수 활꼴 규칙 · 건물 모서리/flip · 첫 바퀴 점검 목록 ·
  대조 지적은 **`review-issues-data`** 칸에(«신뢰하지 않는 자료» 칸에 실으면 모델이 지적을 따르지 않았다 — `review-issues.ts` 의 `REVIEW_PREFIX`).
- 명세 자동 정리(`figure-repair.ts`): 틀 맞춤(픽셀 좌표 → 균일 축소) · 조각 모서리 선분 보태기 · 칸 이름 오타(`perpective`) 바로잡기.
- ⚠️ 앱 전용은 **뺐다**: «이미지 저장(PNG)»·닫을 때 묻기·임시저장(`onAutosave`)·첫 화면 최근 작업. 08 의 `FigureEditor.tsx` 는 todays-math 의
  «도형 적용»·«SVG 저장»·«취소» 그대로다. 확인: 앱 시험 1,519개 중 앱 전용 저장 동작 4개만 다르고 나머지 통과, 타입 검사 통과.

### ◆ 이번 차례의 참고(구조가 달라 옮겨 심기) — `reference/`
- ◆9 **두 바퀴 작도**(`redrawFigure.ts`) — 명세 → 대조 → 최종 명세로 끝(종전 세 바퀴). 그림이 아직 없는데 엔진이 거부했을 때만 한 바퀴 더.
  실측 6만 → 3.8만 토큰(약 40%↓). 실물 찾기(`objects.ts`, Haiku 저강도)를 위치 찾기와 **함께** 돌려, 원본에 있는 실물이 명세에 빠졌으면
  대조 지적(`REVIEW_PREFIX`)으로 한 번 더 요구한다.
- ◆10 대조 지적 거르기(`reviewFilter.ts`) 보강 — 엔진이 정하는 모양(굵기·점선 모양·호/직각 표시 크기·그림 조각 세부)과 «라벨 조금 옮기기»를 버린다(시험 갱신본 동봉).
- ◆11 작업별 모델·강도(`tasks.ts`)에 `objects`(Haiku · low · 1000) 추가 · 대조 지시 덧붙임(`server/ai.ts` 의 `REVIEW_FOCUS`)에 그림 조각 예외.
- ○ `specFit.test.ts` — 실제 엔진으로 제일고 명세가 정리·통과하는지 보는 시험(엔진 경로만 맞추면 그대로 돈다).
- ✕ 하루 토큰 한도·모두의 최근 작업·Supabase 저장소 — 공개 주소용 앱 기능이다.

## 패치 (★) — `git apply --check` 가 todays-math `main`(3aa03a021)에서 통과

| 파일 | 담긴 것 |
|---|---|
| `patches/01-editor-grid-labels.patch` | 편집기 모눈 무리 · 라벨 표기 · 한글 수식 결함 · 요소 목록 칩 조판 · 편집기 prop 2개 · 프롬프트 한 줄 |
| `patches/02-engine-grid.patch` | 엔진 graph-1 `grid`(모눈 배경) · 정제기 `data-grid` 허용 · 엔진 카탈로그 |
| `patches/03-engine-label-markup-escape.patch` | (2차) 엔진 불러오기 100~130ms → 21ms — 출력 바이트 동일 |
| `patches/04-engine-perspective-units-asset.patch` | (3차) 직각 표시 `perspective` · 한 글자 단위 정자 · 정제기 `data-asset` |
| `patches/06-engine-all.patch` | **엔진 전부 통합(02~05 의 엔진 부분 + render_spec) — 이것 하나면 엔진은 앱과 같아진다** |
| `patches/05-editor-prompt-assets.patch` | (3차) 그림 조각 39종(흑백 통일) · `scene_assets.py` · 편집기(조각=요소 하나) · 지시문 · 조판기 단위 정자 |

01→05 를 차례로 붙이면 todays-math main(3aa03a021)의 파일에 모두 붙는다(그 파일만 꺼낸 임시 저장소에서 `git apply` 확인).

적용: `git apply --ignore-whitespace <패치>` (줄바꿈 차이 대비). 시험: `reference/figureGridLabels.test.ts` 를
`src/__tests__/unit/` 에 두면 패치가 넣는 것만 시험합니다(이 앱에서 8/8 통과).

### ★1 모눈 배경 — 엔진 + 편집기 (사용자: «배경을 모눈으로, 여백은 원본처럼, 가로세로 선을 조절할 수 있게»)
- **엔진**(02): graph-1 에 `grid: {step?, from?, to?, color?, dashed?}`. 모눈을 **맨 뒤 층 하나** `<g data-grid="x y 칸폭 칸높이 열 행">`
  로 그린다. 칸은 늘 화면에서 정사각형 — 엔진이 width/height 를 칸에 맞춰 잡는다(모델이 준 크기는 «대략»으로만).
  `(to-from)/step` 이 정수가 아니면 고칠 길을 알려 주는 오류. 정제기(`figure_quality.py`)는 `g` 에 `data-grid`(수 여섯 개만) 허용.
  카탈로그 `graph-1.fields.grid` + `gridExample`, 명세 지시문(`figure-prompt.ts`)에 «모눈종이 그림 = graph-1 + grid, 격자선을 선분으로 그리지 말 것» 한 줄.
- **편집기**(01): `figureGrid.ts`(새) · `FigureGridPanel.tsx`(새) · 오른쪽 칸 «모눈» 무리(`FigurePanelFold`).
  - 모눈은 **요소가 아니다** — `prepareFigureSvg` 가 `[data-grid]` 안을 번호 매기지 않는다(고르기·옮기기·AI 요소 목록에 안 걸림).
  - 칸 수·칸 크기·자리(한 칸씩·가운데로)·선 진하기·굵기·점선. **칸 수를 바꿔도 그림은 그대로**(사용자 «찌그러지지 않게»):
    늘거나 준 칸은 양쪽에 반씩, 칸 단위라 격자점이 그대로다. 가운데로도 칸 단위로만.
  - **모눈이 그림보다 작으면 경고**(사용자 «칸수를 그림보다 줄일 경우 경고알림»): 빨간 띠 «왼쪽 3칸 더 필요» +
    «그림이 다 들어가게 늘리기», 접힌 머리글에도 «⚠ 그림이 모눈 밖». 선·도형 상자는 숨은 DOM 에 그려 잰다(글자는 뺌).
  - 모눈이 틀 밖으로 나가면 틀(viewBox)만 넓힌다(줄이기는 «다 보이게»).

### ★2 라벨 (사용자: «벡터를 입력할 방법이 없다», «요소 목록이 카텍스 처리가 덜 됐다», «한글 수식→TeX»)
- 수식 틀에 **벡터 `\vec{}` · 선분 `\overline{}` · 호 `\overparen{}`** (`FigureLabelInput.tsx`).
- 표기(`src/lib/figure/vectorLabel.ts` 새 파일 → 두 `mathjaxLabel.ts` 가 공유): `\vec{AB}` → `\overrightarrow{\mathrm{AB}}`,
  한글 수식 `arch AB` 가 바뀐 `\overset{\frown}{AB}` → `\overparen{…}`(긴 호), 선분·화살·호 위 **순수 대문자 이름 정자** —
  todays-math 본문 조판(`components/math/editor/textPreprocess.ts`)과 같은 규칙. 소문자 `\vec{a}` 는 그대로.
- ⭐ **결함 수정**(두 앱 공통이었음): 수식 칸에 `root2` 를 치고 Enter 없이 캔버스를 누르면 변환 전 값이 놓였다 →
  `hwpLabelToTex` 를 내보내 글자를 놓는 순간에도 같은 변환. 변환 경고(«중괄호 짝이 맞지 않습니다» 등)를 입력칸 아래에 보인다.
- 요소 목록 칩(`FigureObjectList` → `FigureChipText.tsx` 새 파일): 수식 글자는 TeX 원문 대신 **조판한 모양**(MathJax 는 처음 쓸 때만 동적 import).

### ★3 편집기 prop 두 개 (선택)
`types.ts` 의 `initialNotice`(열 때 위 띠 안내) · `redrawStage`(«원본으로 다시 그리기» 단추에 진행 단계). 넘기지 않으면 종전과 같다.

## 이 앱 구조에만 있는 것 (◆/○) — `reference/`

### ◆1 모눈 그림 정확도 — 실측 효과가 가장 큼
벡터 6개 문제(모눈 17×10)로 같은 그림을 여러 번 돌린 결과:

| | 끝점 12개 중 원본과 같음 | 자동 작도 시간 | 바퀴 |
|---|---|---|---|
| 처음(모델이 칸을 셈) | 6 | 46초 | 3 |
| + 대조 지시 짧게(◆2) | — | 39초 | 3 |
| + 픽셀로 잰 칸 수·좌표 숫자·격자점 맞춤 | **12** | **24초** | 3(지적은 이름표 위치뿐) |

- `gridMeasure.ts`: 원본 픽셀에서 모눈 재기 — 열·행 어두운 점 봉우리 → 일정 간격 선 묶음(이어진 묶음만) →
  **교차 확인**(세로선이 뻗은 범위 = 가로선 처음~끝) → 크롭에 잘린 쪽은 그대로, 정수 칸만큼 더 뻗었으면 넓힘(글줄과 섞여
  세로 10칸을 6칸으로 잡던 것 복원). 모눈 없는 그림(직육면체)은 null. 칸 수는 근사여도 된다(사용자 «칸 수는 근사치, 그림은 최대한 정확»).
- `annotateGrid`: 명세 모델에 보내는 원본 둘레에 **격자 좌표 숫자**(x 위·아래, y 왼쪽·오른쪽, 아래가 0)를 빨간 글씨로 —
  모델이 칸을 세지 않고 숫자로 끝점을 읽는다. 반 칸 어림(13.5)이 사라졌다.
- `comparison.ts`: 대조 그림의 **두 판 모두** 좌표 숫자(재작도 판은 SVG 의 `data-grid` 로) + `gridReviewHint` — 칸 수 대신 끝점 좌표를 맞댄다.
- `gridSnap.ts`: graph-1 + grid 면 선분 끝점·다각형 꼭짓점을 격자점으로(점·원 중심은 0.3칸 이내만).
- ⚠️ todays-math 는 «다시 그리기»를 서버(`lib/dev-ai/figure-engine.ts`)에서 지휘하므로 픽셀 접근이 다르다 — 브라우저 캔버스로
  쓴 `measureGrid`/`annotateGrid` 를 서버로 옮기려면 이미지 디코더가 필요하다. **클라이언트에서 재고 좌표 표시 그림을 요청에 실어
  보내는** 편이 손이 적을 것이다. 판정 함수(`measureGridFromGray`·`latticeFromProfile`·`gridSnap`)는 순수 함수라 그대로 옮겨진다.

### ◆2 대조 지시 덧붙임(`server/ai.ts` 의 `REVIEW_FOCUS`)
```
Do NOT report stroke widths, arrowhead size, grid line colour or darkness, or font: the engine fixes those styles and the spec cannot change them. Report only geometry, positions, counts, labels, dashes and marks. Do not report a label whose placement differs by less than about one grid cell or its own height, as long as it stays beside the same object.
Each issue is ONE short Korean sentence (under 80 characters) naming the object and the fix.
```
대조 지시문 끝(데이터 블록 앞)에 붙인다. 출력 토큰이 곧 대기 시간이라 대조 한 번 8~9초 → 4~5초. 엔진이 못 바꾸는 서식을 지적해 바퀴를 버리던 것도 줄었다.

### ◆3 작업별 모델·강도(`reference/tasks.ts`)
detect Haiku 5.5 low · spec Sonnet 5.5 medium · review Sonnet 5.5 low · edit Sonnet 5.5 medium, 대체 Opus 5.5(detect 는 Sonnet).
환경변수 `AI_<작업>_MODEL/_FALLBACK/_EFFORT`. todays-math 의 모델 라우팅 사정에 맞게 판단.

### ○ 참고
- `detect.ts`(그림 위치 찾기 지시문 — todays-math `figures` 지시문 바탕) · 앱의 크롭 단계·자동 작도 화면은 todays-math 작업실이 이미 하는 일.
- `redrawFigure.ts` — 브라우저 지휘자 전체(위 ◆1 이 어디에 끼는지 보는 용도).

## ✕ 해당 없음
Pretendard·전역 커서/summary CSS(todays-math 는 원래 있음) · Vercel 함수 묶음 · `crypto.randomUUID` 보완 · 상류에서 옮겨 온 시험.

## ★★ 엔진 통합 반영 — `patches/06-engine-all.patch` (사용자 «엔진 관련 모든 것을 한 치 오차 없이 그대로»)

02~05 에 나뉘어 있던 **엔진 쪽 전부**를 한 패치로 모았다(52개 파일 — todays-math `3aa03a021` 기준 객체 번호가 들어 있어
작업 브랜치가 main 보다 앞서 있어도 `--3way` 로 병합된다):
`vendor/figure-engine/core/figure_scene.py`(perspective) · `label_markup.py`(escape·단위 정자) · `figure_quality.py`(data-grid·data-asset) ·
`scripts/figure/graph_scene.py`(grid) · `engine-catalog.json` · `render_spec.py`(앱 판 그대로 — `render_json` 분리 + assets 연결) ·
`scene_assets.py`(새) · `assets/` 39종 + `anchors.json` · `picture-assets.json` · `manifest-exam.json` · README.

```
git apply --3way <이 폴더>/patches/06-engine-all.patch      # todays-math 저장소 루트에서
python <이 폴더>/engine-check/check_engine.py <todays-math 루트>   # 07 이후로는 8종
```
- 확인 스크립트는 모눈 벡터·에셋 얹기·원근 직각·단위 정자·거부 문구 둘(원근 없는 직각 / 도형으로 그릴 물체)을 그려
  `engine-check/expected/` 와 **바이트 대조**한다. 앱(`c4921c2`)과 시험지 한글화(`6d3d6f1`, 같은 방식으로 반영)는 이미 «모두 같음».
- 02~05 의 엔진 부분을 이미 붙였다면 겹친다 — 그 파일들을 main 상태로 되돌리고 06 을 붙이거나, 병합 뒤 확인 스크립트로 판정한다.
- ⚠️ 에셋 27종이 흑백으로 바뀌므로 `elem-1 assetScene`(초등 실물 장면) 지면 그림의 색이 빠진다(사용자 지시 «모든 에셋 스타일 통일»).
- 편집기·지시문(01·05 의 `src/` 부분)은 엔진이 아니라 06 에 없다 — 따로 판단.

## 2차 — 병목 전수검사 반영 (2026-10-21 오후, 앱 `54bc560`)

벡터 모눈 문제 실측: 자동 작도 23초(늘 세 바퀴) → **8~17초**(한두 바퀴), 끝점 12/12 그대로. 기다림의 9할이 AI 호출이었고,
그중 대조가 통과를 못 해 세 바퀴를 다 도는 것이 가장 컸다.

### ★4 엔진 `escape` — `patches/03-engine-label-markup-escape.patch` (main 3aa03a021 에 `git apply --check` 통과)
- `core/label_markup.py` 가 `xml.sax.saxutils.escape` 하나 때문에 urllib·http·email 까지 불러와 엔진 불러오기가
  100~130ms 였다(도형 하나 그리기는 2.5ms). 같은 결과의 함수로 바꿔 21ms. 엔진을 호출마다 새 프로세스로 띄우면 그만큼 빨라진다.
- 확인: 카탈로그 예시(graph-1·grid·v2·native 3종) + 앱 모눈 명세 + 특수 문자(`<`·`&`) 라벨 — 출력 SVG 가 바이트까지 같다.
  `xml.sax.saxutils.escape` 와 같은 값(엔티티 인자 포함)도 따로 검사했다.

### ◆4 대조 지적 거르기 — `reference/reviewFilter.ts` + `reference/reviewFilter.test.ts`(16개, 이 앱에서 통과)
- 대조 모델(Sonnet 5.5 low)이 고칠 것이 아닌 줄을 `issues` 에 섞어 `parseReview` 가 늘 실패했다. 실제로 받은 문장들:
  «(14,6)이며 일치하므로 수정 불필요» · «…멈춤 – 확인 필요» · «…검증이 불확실하다» · «화살촉이 너무 작아 … 키울 것».
- 거르는 것: 고칠 것 없다고 스스로 말한 줄(언제나), «일치·확인 필요·불확실» 줄(고칠 동작이 함께 없을 때만),
  엔진이 정하는 서식(화살촉 크기·선 굵기·모눈 선 색·글꼴 — 명세로 못 바꾼다). 「시작점 화살촉 제거」「라벨을 왼쪽으로 옮겨야」는 남는다.
- 실측: 거른 뒤에도 첫 대조가 실제 오류(벡터 몇 개의 y 가 한 칸 아래)를 잡아 둘째 바퀴에서 고쳤다 — 진짜 지적은 막지 않는다.
- 붙이는 곳(`figure-engine.ts` 의 `parseReview`) — 이 앱은 이렇게 했다:
  ```ts
  const { kept, dropped } = filterReviewIssues(review.issues);
  // 지적이 전부 걸러지면 통과, 지적 없이 실패만 한 답·통과인데 남은 지적이 있는 답은 종전대로 실패
  return { passed: kept.length === 0 && (review.passed || dropped.length > 0), issues: kept };
  ```
  todays-math 는 대조 결과를 `figureReview` 로 초안에 남기므로 `dropped` 도 함께 남길지는 판단해 주세요.
- 대조 지시(`REVIEW_FOCUS`, ◆2)에 한 줄 더:
  ```
  "issues" lists ONLY differences that need a change in the spec. Leave out anything you found matching, anything that needs no fix, and anything you could not verify or are unsure about. If nothing needs a change, answer passed true with an empty issues list.
  ```
  (◆2 의 첫 줄도 `arrowhead size` → `arrowhead size or thickness` 로 바꿨다.)

### ◆5 마지막 바퀴 대조 생략 — 판단 필요
- 이 앱은 세 번째 바퀴의 대조 판정을 어디에도 쓰지 않아(경고에도 안 싣는다) 뺐다 — 매번 약 4초(`reference/redrawFigure.ts` 의 `attempt === 2`).
- todays-math 는 그 판정을 `figureReview` 로 초안에 저장하고 `draftStore.ts` 가 검사하므로 그대로는 못 뺀다.
  저장 형식에 «대조 생략»을 허용할 만한지 보고 결정해 주세요.

### ○ 이 앱 구조에만 해당(참고)
- AI 로 보내는 그림을 같은 해상도 WebP(품질 0.9)로 — 대조 그림 624KB → 82KB. 이 앱은 브라우저가 만든 그림을 사용자 회선으로
  올려서 효과가 컸다. todays-math 는 대조 그림을 서버에서 만들어 바로 보내므로 업로드 비용이 없다(이미지 토큰 수는 형식과 무관).
- 첫 화면 분할(편집기·MathJax 를 첫 화면 뒤에 미리 받기) · Pretendard 분할판(2MB → 254KB) · 요청 제한 120회 — 앱 전용.

## 3차 — 실물 그림 조각 · 원근 직각 · 단위 정자 (앱 `c4921c2`)

발단: 제일고 기하 25-2-기말 10번(삼수선 — 도로 옆 집 A, 진입로 B, 건물 발 D·꼭대기 C)을 붙여 넣자 명세 모델이
«건물·집이 그려진 삽화라 재현할 수 없다»며 통째 거절했다. 원인은 셋 — 지시문의 «삽화면 spec:null» 규칙, 작은 캡처
(236×176: 이미지 토큰 60개쯤 — 두 번에 한 번 거절, 2배로 키우면 매번 그림), 원근 그림의 직각(종이 위 121°)을 엔진이 그릴 수 없음.

### ★5 엔진 — `patches/04` (엔진 예시 출력은 바이트 동일)
- **직각 표시 `perspective: true`** — `angles.X: {vertex, points, right: true, perspective: true}`. 원근(입체) 그림에서
  인쇄된 직각이 종이 위에서 비스듬할 때 90° 검산을 건너뛰고 두 변을 따라 평행사변형 표시를 그린다(그리는 코드는 원래
  두 변 단위벡터의 합이라 그대로). 평면 그림은 종전대로 90°±0.5° 검산. `right` 없이 `perspective` 만 주면 거부.
  거부 문구 끝에 «(only in a perspective/3D drawing whose printed mark is slanted, add perspective:true)» 한 줄.
- **한 글자 단위 정자** — `label_markup._romanize_unit_letters`: 숫자 뒤에 **띄어 쓴** `m`·`g`(와 `mL`·`dL`·`kL` 의 앞 글자)는
  정자. `2m` 은 2×m 일 수 있어 그대로. 두 글자 이상(cm·km)은 기존 규칙.
- 정제기: `g` 에 `data-asset`(kebab-case slug 만).

### ★6 편집기·지시문·그림 조각 — `patches/05`
- **그림 조각 39종 한 스타일**(`scripts/figure/assets/`): 선 `#333333` 하나, 채움 흰색·`#ececec`·`#c6c6c6`(원래 검은 것만 `#333333`),
  굵기 1.4/1, 땅선 없음. 기존 27종 다시 칠하기 + 9종 재작도(수조·컵 둘·롤케이크·주사위·터널·산·기차·검은 바둑돌) +
  12종 추가(집·등대·비행기·탑·사다리·전봇대·열기구·연·해·미끄럼틀·관람차·반구 그릇). `anchors.json`(바닥·꼭대기·가운데).
  ⚠️ **todays-math 의 `elem-1 assetScene`(초등 실물 장면) 그림도 흑백으로 바뀐다** — 지면에 색이 빠진다. 원하지 않으면 05 에서
  `scripts/figure/assets/` 의 기존 svg 변경만 빼고 붙이면 된다(새 12종·json 은 독립).
- **FigureSpec `assets`**(`scripts/figure/scene_assets.py`, v2·graph-1): `{"asset":"building","from":"D","to":"C"}` — 바닥을 D, 꼭대기를 C 에
  (12° 안쪽이면 똑바로 세움, 사다리처럼 기울면 돌림) · `{"asset":"house","at":"A","anchor":"base","width":40,"flip":false}`.
  엔진 그림의 **맨 뒤 층**에 `<g data-asset>` 로 얹는다. v2 는 컴파일 한 번 → 조각 자리 → 보이지 않는 점 둘을 장면에 더해 틀 확보 →
  배치(`resolve`) 한 번(결과를 그리기에 재사용). 고정 `canvas.width/height` 는 조각이 있을 때만 뺀다. 640 한도를 넘으면 한 점 조각만 줄인다.
- **명세에 쓸 수 있는 조각 = 도형으로 못 그리는 실물만** — `assets/picture-assets.json` 한 파일(지시문과 엔진이 같이 읽음).
  사용자: «SVG 로 구현 가능한 그림(직육면체·공 같은 것)은 도형으로, 정말 그림이 필요한 것만». 캔·컵·주사위·그릇·관람차를 쓰면 엔진이 거부.
- **편집기**: 조각 하나 = 요소 하나(속 도형은 세지 않음) · 이름은 조각 이름(«건물») · AI 고치기 요소 목록에는 이름+상자 한 줄.
  끌기·되돌리기·지우기·회전·대칭이 그대로 된다(편집기가 조상 transform 을 계산에 넣는다). 실측: 오류 없음.
- **지시문**(`figure-prompt.ts`): 삽화 거절 규칙을 «기하가 하나도 없을 때만»으로, PICTURED OBJECTS(수학 도형인 물체는 도형으로) ·
  PICTURE ASSETS(쓰는 법·목록) · 원근 직각 `perspective`. `외부 URL·폰트를 넣지 않는다(그림은 PICTURE ASSETS 의 것만)`.
- `src/lib/figure/assetCatalog.ts` — 목록·이름표·지시문 한 줄을 모듈 불러올 때 한 번 만든다. `stripAssetBodies`(아래 ◆7).
- 두 `mathjaxLabel.ts`: 엔진과 같은 한 글자 단위 정자 규칙.

### ◆6 render_spec 연결 — todays-math 의 `render_spec.py` 는 이 앱과 모양이 달라 패치 대신(앱 `scripts/figure/render_spec.py`)
```python
from scene_assets import render_graph_with_assets, render_v2_with_assets, split_assets
spec, assets = split_assets(spec)                      # 엔진은 모르는 필드를 거부 — 떼어 그린다
if version == "graph-1":
    svg = render_graph(spec)
    if assets is not None: svg = render_graph_with_assets(spec, svg, assets)
elif version == "elem-1":
    if assets is not None: raise ValueError("assets 는 version 2·graph-1 에서만")
    svg = render_elementary(spec)
elif assets is not None:
    svg = render_v2_with_assets(spec, assets)
else:
    svg = render_figure_spec(spec)                     # 조각이 없으면 종전과 같은 길
```
### ◆7 지시문에 SVG 를 실을 때 조각 속 비우기 — `stripAssetBodies(svg)`(조각 하나 1~2천 토큰 → 이름·자리만). 이 앱은 서버 `request()`·대조에서.
### ◆8 마지막 바퀴 명세가 엔진에 거부돼도 앞 바퀴 그림을 쓴다 — 이 앱은 그랬다가(대조가 원근 그림에 직각을 요구 → 셋째 거부) 멀쩡한 둘째 그림까지 잃었다.
### ○ 작은 그림 키우기(긴 변 640 까지, `imageEncode.ts enlargeSmallImage`) — 이 앱은 사용자가 화면을 작게 캡처해 붙인다. 1000 까지 키우면 모델이 그 픽셀로 좌표를 잡아 엔진 한도(640)를 넘었다.

## 부탁
적용 여부·범위는 todays-math 사정에 맞게 판단해 주시고, 맞지 않는 항목은 가져오지 않아도 됩니다. math-figure-editor 저장소는 읽기만 해 주세요.
반영하면 관련 검사 결과와 가져온/뺀 항목을 사용자에게 보고해 주세요.
