# 교재 복구 — 대화 지면 렌더 (P2) 구현 기록 (2026-10-05)

작성: Claude Opus 5.5 (Orca 작업자, Task `task_52b956ee5fc1`). 가지 `BIGSHOL/textbook-recovery-content-20261005`, local main `62d8c42e1`을 병합한 뒤 작업했다. 근거 계획: `docs/planning/textbook-v15-recovery-plan-final-20261005.md` §5(대화 글자 크기 · 판서), §6(P2). 계획 파일은 건드리지 않았다(SHA-256 `0ab8ac18…04bb7`).

이 작업은 두 커밋이다. 먼저 원고 조건 교정 `ee4967b54`(내용은 [교정 기록](textbook-recovery-content-corrections-20261005.md) §8), 그다음 이 문서의 대화 렌더다.

## 0. 결과

대화 한 대사를 그리는 `render/blocks/dialogue.ts`가 원본 2-1-1의 대화 지면을 따르게 됐다. 사람 말은 얼굴과 이름이 붙은 말풍선으로, 판서는 사람 말풍선이 아니라 제목 · 수식 · 주석이 있는 연녹색 판으로 그린다. 대사 하나가 자기 배경을 칠하지 않는다. 글자 크기는 CSS 속성 하나(`--tb-dialogue-size`)를 따른다.

여기까지가 블록 렌더와 그 CSS다. **지면에 붙이는 일은 root의 몫으로 남아 있다**: 이 CSS를 공통 CSS에 넣기, 판서 글 블록을 dispatcher에서 부르기, 쪽마다 하나의 배경 칠하기, 수업별 글자 크기 재기, 수업 소제목과 「이어집니다」 띠 놓기. §4에 필요한 함수와 칸을 적었다.

Chromium으로 실제 조판해 잰 것은 블록 렌더의 치수다. 완성된 쪽을 조판한 것이 아니고, 사람이 본 검수도 실물 인쇄도 아니다.

## 1. 바뀐 파일

| 파일 | 내용 |
| --- | --- |
| `src/lib/textbook/render/blocks/dialogue.ts` | 말풍선 · 판서 렌더, 판서 글 블록 렌더, 크기 맞춤 도우미, 수업 묶기, 띠 세 가지 |
| `src/lib/textbook/render/blocks/dialogueCss.ts` (새 파일) | `DIALOGUE_CSS` |
| `src/__tests__/unit/textbookRecoveryDialogueRender.test.ts` (새 파일) | 13개 검사 + 실제 Chromium 계측 1개 |

`html.ts` · `editorialCss.ts` · `model.ts` · `markdown.ts` · `paginate.ts` · 계약 · `shared.ts` · `front.ts` · 서버 · 원고 QA는 고치지 않았다.

## 2. 무엇을 어떻게 그리나

원천은 원본 조판기의 `app.js`(`opening`, `fitConversations`)와 `.opening` 규칙의 마지막 값(`editorial.css` 194–227, `full.css` 97–103), 그리고 기준 이미지 `original-p010.png`다.

### 사람 말

- 자리는 블록의 `side`가 정한다. route가 선생님을 왼쪽, 학생을 오른쪽에 두므로 **어떤 인물을 골라도 역할의 자리는 같다**. 색은 인물의 역할이 정한다(선생님 흰색, 학생 노랑).
- 얼굴은 표정 네 칸 그림에서 한 칸만 잘라 보인다. 우리 인물 목록(`tb-portrait-…`)에 있는 화자는 언제나 잘라 보이고, 그림 전체를 보이는 일이 없다.
- 이름은 `speakerName`(root가 넣는 렌더 전용 칸)이 있으면 그것, 없으면 인물 표의 이름이다. 선생님 이름 뒤 「선생님」은 한 번만 붙는다 — 「지은」, 「지은 선생님」, 「지은 선생님 선생님」 모두 「지은 선생님」.
- 본문에서 이름 글자를 찾아 바꾸는 일은 하지 않는다. 호칭은 원고 트랙의 `conceptScriptForCast`가 닻이 있는 자리에만 쓴다.
- 목록에 없는 화자(옛 초안 · 가져온 화자)는 이전과 **바이트로 같은** HTML이다. 그림 한 장을 그대로 보이고, 표정 그림으로 여겨 자르지 않는다.

### 판서

`presentation.kind`가 `board`인 대사는 판으로 그린다. 저장된 글 `**제목**`, 빈 줄, 본문을 읽어

- 본문 첫 문단이 수식 하나면 가운데 놓인 수식과 그 아래 주석(v15 원본 판서 24개),
- 아니면 핵심어 강조가 있는 글(은행 정의에서 온 판서 163개)

로 나눈다. 187개 모두 얼굴과 말풍선 없이 그려진다.

원본 U01을 QA로 옮긴 자료에서는 판서가 `board` 노드를 가진 **글 블록**이다. `renderDialogueBoardHtml(block, resources?)`이 그 노드의 제목 · TeX · 주석으로 같은 모양의 판을 그린다. 블록의 markdown은 쓰지 않는다. 같은 판서를 두 길로 그린 HTML이 같은지 검사한다.

### 수식과 강조

- 원본은 모든 수식을 `\displaystyle`로 조판해 글줄 속 분수가 작아지지 않는다. `displayStyleMath`가 **조판할 때만** 그것을 붙인다. 저장된 글은 바뀌지 않는다(얼린 블록으로 검사).
- 이번에 찾은 결함: 공용 markdown 렌더는 `**$7$**입니다`처럼 수식 뒤에 조사가 바로 오는 강조를 닫지 못해 **별표가 글자로 찍힌다**. CommonMark의 규칙이고, 7,792대사 가운데 558대사가 해당한다. `markdown.ts`는 root의 파일이라 고치지 않았고, 대화 렌더 안에서 남은 `**` 쌍을 같은 문단 안에서만 강조로 바꾼다(`dialogueMarkdownHtml`). 360개 원고의 모든 대사를 그려 별표가 하나도 남지 않음을 검사한다. **같은 결함이 대화 밖(개념 · 회상 지면)에도 있을 수 있다. 재지 않았다.**

### 배경과 크기

- 대사를 감싸는 요소와 대사 자체는 배경이 없다. 지금 `editorialCss.ts`의 `.tb-editorial-dialogue.tb-stage-opening`이 대사마다 칠하는 둥근 띠는 이 CSS가 투명으로 덮는다.
- 쪽의 배경은 `.tb-dialogue-backdrop` 한 장이다. root가 그 쪽의 첫 대사 · 판서 위 3mm부터 마지막 아래 3mm까지, 블록 너비 그대로 놓는다. 대사는 자기 블록 안에서 이미 3.5mm 들여 있다.
- 말풍선 글자 · 판서 수식의 크기는 `var(--tb-dialogue-size, 10.5pt)`다. 얼굴 크기와 말풍선 안쪽 여백은 CSS `calc`로 따라간다(원본 식: 9.5mm + 크기가 9.2pt보다 큰 만큼 pt당 0.77mm, 1.5mm + pt당 0.23mm). **속성 하나만 바꾸면 되므로 재는 쪽이 크기를 짐작할 일이 없다.**

## 3. 실제 Chromium으로 잰 것

`TEXTBOOK_VISUAL_TEST=1`일 때 도는 검사다. 중2 「유리수와 소수」의 v15 첫 수업(대사 13 · 판서 1)을 교재의 실제 글꼴 · KaTeX · 인물 그림으로 조판했다. 블록 너비는 176mm다. 지어낸 치수는 없다.

두 조합으로 돌렸다: 기본 배역(서연 선생님 · 민서 · 지호)에 이 CSS를 공통 CSS **뒤**에 둔 것, 다른 배역(지은 선생님 · 다은 · 도현)에 **앞**에 둔 것. 둘 다 통과했다. 순서와 상관없이 이 CSS가 정한다는 뜻이다.

| 잰 것 | 결과 |
| --- | --- |
| 글꼴 | 교재 글꼴이 실제로 실린 뒤에 잼 |
| 감싸는 요소와 대사의 배경 | 투명, 안쪽 여백 0 |
| 선생님 대사 | 왼쪽에서 3.5mm, 말풍선 흰색, 꼬리 왼쪽 |
| 학생 대사 | 오른쪽에서 3.5mm, 말풍선 `rgb(255, 240, 184)`, 꼬리 오른쪽, 얼굴 좌우 뒤집힘 |
| 대사 너비 | (176 − 7)mm의 93% · 89% 안 |
| 말풍선 글자 | 10.5pt (기본) |
| 얼굴 틀 | 10.50mm 정사각형, 넘침 숨김, 그림은 틀의 2배 |
| 이름 | 5.5pt, 한 줄 |
| 판서 | 너비 176 − 17mm, 왼쪽 8.5mm, 배경 `rgb(237, 243, 231)`, 수식 10.5pt 가운데 |
| 넘침 | 글 · 수식 · 얼굴이 블록 너비와 말풍선을 벗어난 곳 0 |
| 크기 열네 단계(10.5 → 9.2pt) | 단계마다 글자 · 얼굴 · 여백이 식대로 바뀜. 넘침 0 |

열네 단계에서 잰 이 수업의 블록 높이 합(간격 제외): 10.5pt 224.1mm, 10.0pt 211.1mm, 9.6pt 195.4mm, 9.2pt 189.3mm. 크기를 줄이면 높이가 늘지 않는다. 이 실측 높이를 `solveDialogueSize`에 넣어, 한도 아래로 들어가는 가장 큰 크기를 고르고 9.2pt로도 안 들어가면 `fits: false`를 내는 것을 확인했다.

조판 결과 그림 두 장과 높이 표를 저장소 밖 `Downloads/교재_복구_실행검증_20261005/dialogue-render-sample/`에 두었다. 이 그림의 배경은 검사가 임시로 그린 것이다 — 제품에서는 root가 그린다. 그림은 블록을 간격 없이 쌓은 것이고 쪽이 아니다.

## 4. root에 넘기는 접점

### 내보낸 함수 (`@/lib/textbook/render/blocks/dialogue`)

| 이름 | 쓰는 곳 |
| --- | --- |
| `renderDialogueHtml(block, resources)` | 지금처럼 dispatcher의 `dialogue`. 블록에 아래 선택 칸이 있으면 쓴다 |
| `renderDialogueBoardHtml(block, resources?)` | dispatcher의 `text`에서 `block.semantic?.node?.kind === "board"`일 때 |
| `isDialoguePlacement(block)` | 배경이 덮을 블록인지(대사 또는 판서 글 블록) |
| `dialogueLessonRuns(blocks)` | 이어진 대사를 수업으로 묶음: `{ lessonKey, lessonTitle, blockIds, speech, boards }` |
| `dialogueSizeSteps()` · `solveDialogueSize(fits)` · `dialogueSizeStyle(pt)` · `dialogueGapMm(spareMm, n)` · `DIALOGUE_FIT` | 크기 맞춤 |
| `DIALOGUE_BACKDROP` | 배경의 클래스 이름과 치수(위아래 3mm, 대사 들임 3.5mm) |
| `renderDialogueLessonTitleHtml(lesson, continued?)` · `renderDialogueGuideHtml(text)` · `renderDialogueContinueHtml({ label, index, total, note })` | 수업 소제목, 안내 한 줄, 「N / 전체」 띠 |
| `renderDialogueInlineHtml(text)` | 제목처럼 `$TeX$`가 섞인 한 줄 |
| `dialogueSpeakerLabel` · `displayStyleMath` · `dialogueMarkdownHtml` | 위 함수들이 쓰는 것. 따로 부를 수도 있다 |

`DIALOGUE_CSS`는 `@/lib/textbook/render/blocks/dialogueCss`에 있다.

### 블록에 더할 수 있는 렌더 전용 칸 (`DialogueRenderFields`)

저장하지 않는 칸이다. 없으면 블록의 저장된 값만으로 그린다.

| 칸 | 뜻 |
| --- | --- |
| `speakerName?: string` | 그 책에 동결된 배역 이름. 「지은 선생님」, 「다은」 |
| `castRole?: "teacher" \| "student1" \| "student2"` | 배역 자리. QA 속성으로만 나간다 |
| `dialogueSizePt?: number` | 그 수업에서 잰 크기. 9.2~10.5의 0.1 단위가 아니면 예외 |

### 렌더가 내는 속성

`data-dialogue-role`(teacher · student · board), `data-dialogue-kind`(speech · board), `data-dialogue-cast`(칸이 있을 때), `data-lesson-key` · `data-lesson-title`(이스케이프됨), `data-dialogue-font-pt`와 `style="--tb-dialogue-size:…"`(크기 칸이 있을 때). `browser.ts` · `server.ts`가 보는 `.tb-dialogue-atlas[data-speaker-id]` · `.tb-portrait-frame` · `img[data-textbook-portrait-atlas]`는 그대로다.

### root가 할 일

1. `TEXTBOOK_CSS`에 `DIALOGUE_CSS`를 넣는다. `html.ts`와 `editorialCss.ts`의 옛 대화 규칙은 지워도 되고 두어도 된다(이 CSS가 덮는다).
2. dispatcher의 `text`에서 판서 노드를 `renderDialogueBoardHtml`로 보낸다.
3. 쪽마다 `isDialoguePlacement`인 첫 블록과 마지막 블록 사이에 `.tb-dialogue-backdrop` 한 장을 놓는다. 쪽이 넘어가면 쪽마다 한 장이다.
4. 크기: 재는 화면의 조상에 `--tb-dialogue-size`를 `dialogueSizeSteps()` 순서로 넣어 가며 재고 `solveDialogueSize`로 고른다. 원본은 한 단원의 대화 쪽들이 같은 크기를 쓴다. 고른 값은 쪽 요소에 속성으로 두거나 블록의 `dialogueSizePt`로 넘긴다. 9.2pt로도 안 들어가면 더 줄이지 않고 다음 쪽으로 넘긴다.
5. 대사 사이 간격은 조판기가 준다. 원본은 최소 0.85mm이고 남는 높이를 나눠 최대 5mm까지다(`dialogueGapMm`). 판서 블록은 위아래 1mm 여백을 높이에 이미 품고 있다.
6. 수업 소제목 · 이어지는 쪽의 제목 · 「N / 전체」 띠는 투영이 놓는다. 수업이 어디서 바뀌는지는 `dialogueLessonRuns`가 **열쇠 또는 제목이 바뀌는 곳**으로 가른다 — 원본을 옮긴 자료는 네 쪽이 모두 열쇠 `U01`이고 제목만 다르기 때문이다. 띠의 말(「단원을 여는 수업」, 「다음 쪽에서 이어집니다.」, 「이어서 개념을 정리합니다.」)은 켜진 구성과 뒤따르는 쪽을 아는 투영이 넘긴다. 렌더는 말을 짓지 않는다.
7. route가 `conceptScriptForCast`를 부르고 `turn.presentation`을 싣는다(원고 트랙의 앞선 보고와 같다).
8. 이름: 투영이 동결된 배역 이름을 `speakerName`에 넣는다. 넣지 않으면 지금처럼 인물 표의 이름이 나온다.
9. 실물 인쇄 검수 항목(`src/app/dev/print-check/items.ts`)에 대화 지면을 「대기」로 올린다. 이 트랙은 그 파일을 고치지 않았다.

### 지면이 달라지는 것

- 목록에 있는 화자의 대사 HTML이 달라진다(속성이 더해지고 수식이 display style이 된다). 분수가 든 말풍선은 전보다 높아진다. 옛 초안도 다시 재면 쪽 나눔이 달라질 수 있다.
- root의 분리 증명(`scripts/qa/textbook/extraction-proof/render.proof.test.ts`)은 분리 전 HTML의 다이제스트와 견준다. 읽기 전용으로 돌려 보니 실패하고, 달라진 산출물은 220개다: `blocks/dialogue` 192, `guards/…/dialogue` 22, `models/rich` 4, `pages` 2. 전부 목록에 있는 화자의 대사가 든 것이다. **목록 밖 화자의 산출물(`legacy-*`, `unknown-portrait-*`)은 하나도 달라지지 않았다.** 대화 항목이 달라지는 것은 이번 변경의 뜻이므로 root가 기준을 다시 떠야 한다. 이 트랙은 그 검사와 기준 파일을 고치지 않았다.

## 5. 돌린 검사

| 검사 | 결과 |
| --- | --- |
| `textbookRecoveryDialogueRender` | 13개 통과 |
| 같은 파일의 Chromium 계측 (`TEXTBOOK_VISUAL_TEST=1`) | 1개 통과 — §3 |
| `textbookVisualRender` (기존 대화 · 얼굴 검사) | 7개 통과 |
| textbook vitest 설정 전체 (`src/__tests__/unit/textbook*.test.ts`, 45파일) | 40파일 통과 · 3파일 건너뜀 · **2파일 실패** — 742개 통과, 12개 실패, 7개 건너뜀. 아래 |
| `tsc --noEmit` (힙 8GB) | 종료 코드 0 |
| ESLint (이 트랙의 파일) | 경고 · 오류 0 |

실패한 12개는 이 트랙의 변경에서 온 것이 아니다.

- `textbookQuickCreate` 11개: 병합한 main에서 계약에는 새 구성 키 열 개가 있고 `server/quickCreate.ts`에는 아직 없어서 난다. 앞선 교정 기록 §5와 같은 실패다. 대사를 그리기 전에 멈춘다.
- `textbookArchive` 1개: 「Unbundled CSS font reference」. `dialogue.ts`를 이 작업 전의 것으로 되돌려 돌려도 똑같이 실패했다(되돌린 뒤 새 파일을 다시 놓고 해시가 같음을 확인). 원인은 보지 않았다.

검사가 지키는 것: 역할의 자리와 이름(기본 · 다른 배역), 「선생님」 한 번, 닻이 있는 자리에만 이름이 들어가고 「짝지은」은 그대로, 속성 이스케이프, 목록 밖 화자의 HTML이 이전과 바이트로 같음, 수식의 display style과 저장 글 불변, 강조 별표 0, 판서 187개와 말 7,605개 전부 렌더, 판서 글 블록과 대사 판서의 같은 모양, 수업 묶기, 크기 열네 단계와 고르기, CSS에서 배경을 칠하는 규칙이 다섯뿐임.

## 6. 남은 것과 한계

- **쪽이 아니다.** 배경 · 크기 맞춤 · 간격 · 소제목 · 띠는 root가 붙여야 지면이 된다. 원본과의 ±0.5mm 대조(G0a)는 그 뒤에 할 수 있다.
- **사람이 보지 않았고 인쇄하지 않았다.** Chromium 계측과 내가 본 조판 그림 두 장이 전부다.
- 선생님 이름표: 원본은 「선생님」뿐이고 우리는 「서연 선생님」처럼 이름이 붙는다. 얼굴 틀(10.5mm)보다 넓어질 수 있지만 줄바꿈하지 않는다.
- 은행 정의에서 온 판서(글로 된 판)는 원본에 없는 모양이다. 원본 판서의 틀과 색을 그대로 쓰고 본문만 글이다. 계획 §11의 시안 대상인지 root가 정해야 한다.
- 학생 얼굴의 좌우 뒤집기는 블록의 `mirrorPortrait`를 따른다. 원본은 둘째 학생만 뒤집었고 지금 route는 두 학생을 모두 뒤집는다. 바꾸려면 route의 일이다.
- KaTeX 글자 크기(공통 CSS의 `1.12em`)와 본문 글꼴은 공통 CSS의 것이다. 원본과의 차이는 재지 않았다.
- 별표가 글자로 찍히는 결함은 대화 밖에서는 그대로일 수 있다(§2).
- 원고 쪽 한계(틀의 말투, 여는 질문의 되풀이)는 앞선 기록 그대로다.
