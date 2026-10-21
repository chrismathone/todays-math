# math-figure-editor → todays-math 전달 묶음 (2026-10-21)

독립 웹앱 **math-figure-editor**(todays-math 도형 편집기를 떼어 낸 것)에서 고친 것을 todays-math 에 똑같이 들이기 위한 묶음입니다.
사용자 지시: «우리 웹앱에서 업데이트한 부분은 마무리되면 todays-math에도 넘겨서 동일하게 업데이트 적용».

- 앱 저장소: `D:\math-figure-editor` (커밋 `52dfe92`, 2차 `54bc560`). **읽기만** 해 주세요.
- **2차(병목 전수검사)는 아래 «2차» 절** — 패치 03 · 대조 지적 거르기 · 마지막 대조 생략.
- 편집기·AI 지시문·엔진 파일은 todays-math 와 **같은 경로·같은 파일**이라(상류 `3aa03a021` 에서 줄바꿈 말고 동일했음) 패치가 그대로 붙습니다.
- 표시: ★ 바로 들이기 · ◆ 검토 후 옮겨 심기(구조가 달라 손이 감) · ○ 참고 · ✕ 해당 없음

## 패치 (★) — `git apply --check` 가 todays-math `main`(3aa03a021)에서 통과

| 파일 | 담긴 것 |
|---|---|
| `patches/01-editor-grid-labels.patch` | 편집기 모눈 무리 · 라벨 표기 · 한글 수식 결함 · 요소 목록 칩 조판 · 편집기 prop 2개 · 프롬프트 한 줄 |
| `patches/02-engine-grid.patch` | 엔진 graph-1 `grid`(모눈 배경) · 정제기 `data-grid` 허용 · 엔진 카탈로그 |
| `patches/03-engine-label-markup-escape.patch` | (2차) 엔진 불러오기 100~130ms → 21ms — 출력 바이트 동일 |

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

## 부탁
적용 여부·범위는 todays-math 사정에 맞게 판단해 주시고, 맞지 않는 항목은 가져오지 않아도 됩니다. math-figure-editor 저장소는 읽기만 해 주세요.
반영하면 관련 검사 결과와 가져온/뺀 항목을 사용자에게 보고해 주세요.
