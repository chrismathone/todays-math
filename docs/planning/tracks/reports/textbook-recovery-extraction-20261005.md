# 교재 복구 P1 선행 작업 — 렌더러·자동 제작 조립의 분리 (동작 무변경)

작성일: 2026-10-05. 근거: [복구 실행 계획 최종 표결본](../../textbook-v15-recovery-plan-final-20261005.md) §6 «P0/P1 뒤 조율 담당이 동작을 바꾸지 않는 분리 커밋을 먼저 main에 병합한다».

`render/html.ts` 의 블록 렌더와 `server/quickCreate.ts` 의 조립 걸음을 트랙별 모듈로 옮겼다. **출력은 한 바이트도 바뀌지 않았다.** CSS · 번호 · 대화 의미 · 개념 집합 · 토글 · 스키마 · 모델 · 투영 · SQL 은 손대지 않았다. 지면이 달라지지 않으므로 `/dev/print-check` 에 새 항목은 없다.

## 1. 커밋

| 커밋 | 내용 |
| --- | --- |
| `143dafcb1` | 출발점. main 을 빨리 감아 받았다(읽기 계약 `9d8064b7d` 포함). 기준선과 추출이 **같은 의존 판** 위에 있다. |
| `4c62d01ba` | 증명 하네스와 기준선 매니페스트. **제품 파일 변경 0.** 추출 전 소스에서 뽑은 해시를 얼렸다. |
| `f866bdc77` | 추출. 매니페스트 두 파일은 건드리지 않았다(`git diff 4c62d01ba f866bdc77 -- scripts/` 가 비어 있다). |

브랜치 `BIGSHOL/textbook-recovery-extraction-20261005` 는 main `143dafcb1` 에 빨리 감기로 올라간다.

## 2. 모듈 경계

원본 줄을 **옮겼다** — 다시 쓰지 않았다. 새로 쓴 것은 import · 함수 머리 · 조립 문맥뿐이다. 아래 표의 «소유 트랙» 열은 계획 §6 의 소유권 표를 내가 읽은 것이다 — 확정은 조율 담당의 몫이다.

### 렌더 — `src/lib/textbook/render/`

`html.ts` 의 공개 API 는 그대로다: `renderBlockHtml` · `TEXTBOOK_CSS` · `renderPageHtml` · `measurementHtml` · `textbookHtmlDocument` · `RenderResources`(다시 내보냄). `text` · `image` 두 갈래와 CSS 는 `html.ts` 에 남겼다.

| 파일 | 내보내는 것 | 계획의 소유 트랙 |
| --- | --- | --- |
| `blocks/shared.ts` | `RenderResources` · `attrUrl` · `editorialImage` · `progressHtml` · `imageHtml(resources, id, alt, width?, atlas?)` · `qrHtml(resources, id, url)` | 조율 담당 |
| `blocks/front.ts` | `renderUnitIntroHtml` · `renderHeadingHtml(block, resources, stage)` · `renderCoverHtml(page, model, resources)` | 조율 담당 (P7) |
| `blocks/dialogue.ts` | `renderDialogueHtml` | 대화 (P2) |
| `blocks/concept.ts` | `renderConceptHtml` | 개념·회상 (P3) |
| `blocks/recall.ts` | `renderRecallHtml(block)` | 개념·회상 (P4) |
| `blocks/problem.ts` | `renderProblemHtml` | 문제 (P5) |

블록 함수의 꼴은 `(block: Extract<EditorialBlock, { kind }>, resources: RenderResources) => string` 이다. 블록 모듈은 `./shared` 와 위쪽 모듈(`../editorial` · `../markdown` · `../model`)만 읽고 **`../html` 을 읽지 않는다** — 순환이 없다.

### 자동 제작 — `src/lib/textbook/server/`

`quickCreate.ts` 의 공개 API 는 그대로다: `createQuickTextbook` · `listQuickCreateUnits` · `quickCreateSemester` · `QUICK_CREATE_DIFFICULTIES` · `DEFAULT_QUICK_CREATE_CAST` · `QuickCreateDependencies`. 거래와 멱등 영수증(`runOnce`) · 목록 조회 · 설정 · 판본 삽입 · **저장 SQL 전부**가 여기 남았다.

| 파일 | 내보내는 것 | 계획의 소유 트랙 |
| --- | --- | --- |
| `quickCreate/context.ts` | `QuickCreateAssembly` · `QuickCreateLesson` · `UnitRow` · `SectionPlan` · `ItemPlan` · `QuickCreateDependencies` · 상수 · `text` · `keyOf` · `conceptIndex` · `plainDefinition` · `gradeLabel` | 조율 담당 |
| `quickCreate/frontMatter.ts` | `appendFrontMatter(ctx)` — 학습 안내 · 학습 계획 · 질문 기록 | 조율 담당 (P7) |
| `quickCreate/unitIntro.ts` | `appendUnitIntro(ctx)` | 조율 담당 (P7) |
| `quickCreate/rest.ts` | `appendRest(ctx)` | 원고·자산 (P8) |
| `quickCreate/preparation.ts` | `appendPreparation(ctx, lesson)` | 미배정 — 계획 표에 «준비»의 소유가 없다 |
| `quickCreate/errorCheck.ts` | `appendErrorCheck(ctx, lesson)` | 개념·회상 (P4) |
| `quickCreate/conceptRecall.ts` | `appendConceptAndRecall(ctx, lesson)` · `wantsConceptFamily(components)` | 개념·회상 (P3·P4) |
| `quickCreate/dialogue.ts` | `prependDialogue(ctx, lesson)` | 대화 (P2) |
| `quickCreate/problemStages.ts` | `appendProblemStages(ctx, lesson)` · `enabledProblemStages(components)` · `quickCreateItemLayout(stage)` | 문제 (P5) |

`QuickCreateAssembly` 는 한 거래가 모으는 것 전부다 — `tx` · `actor` · `input` · `components` · `deps` · `units` · `visuals` · `stages` · `now` 와 모으는 통(`sections` · `items` · `concepts` · `assets` · `outline` · `warnings`), 커서 둘(`chapter` · `unitKey`), 그리고 주입된 `addSection`. 걸음 모듈은 형제 가운데 `./context` 만 읽고, DB 는 `ctx.tx` 로만 말한다 — 거래 밖으로 나가는 길이 없다.

🔴 **걸음을 부르는 차례가 곧 저장되는 차례이고 id 가 뽑히는 차례다.** `quickCreate.ts` 의 소단원 고리는 `준비 → 오류 점검 → 개념·회상 → 대화(맨 앞에 끼움) → 문제` 순서로 부른다. 차례를 바꾸면 구획 JSON 이 달라진다(§4 변이 3).

## 3. 증명

위치: `scripts/qa/textbook/extraction-proof/`. 다시 돌리기(약 1분):

```bash
npx vitest run --config scripts/qa/textbook/extraction-proof/vitest.config.mts
```

- **렌더** — 블록 종류 · 편집 단계 열 · 표지 · URL 문지기 · 손으로 놓은 쪽 · 원고 통째(학생용/정답용)를 합성 입력으로 돌려 HTML 을 얼렸다. 자산·QR·편집 그림 풀이 함수가 **불린 차례**도 같이 얼렸다. 이 사례들은 추출 전 `html.ts` 의 문장·줄·함수 100%, 가지 99.39% 를 지난다(안 닿는 한 가지는 `templates.get(id) ?? ""` 의 뒤쪽이다).
- **자동 제작** — PGlite(저장소 마이그레이션 전부) 위에서, `randomUUID` 를 «뽑힌 차례가 박힌» 값으로 바꾸고 시계를 멈춰 144 사례를 돌렸다. 사례마다 **SQL 문장과 인자 전부(거래 경계 포함)** · 주입 함수가 불린 차례 · 돌려준 JSON 또는 던진 오류 · DB 에 남은 행(구획 `content` 는 저장된 글 그대로) · 그 원고를 조판한 학생용/정답용 HTML 을 얼렸다. 추출 전 `quickCreate.ts` 의 문장 96% · 가지 91.5% 를 지난다(충돌 사례와 새 구성 열쇠 사례를 더하기 **전에** 잰 값이다 — 그 뒤로는 다시 재지 않았다).
- 사례 구성: 기본값 · 전부 켬(단원 경계, 표지 끔, 개념 제외, 초3-1 31소단원 전체, 중2-1 33소단원 전체) · 표지를 뺀 27 구성 각각 하나만(표지 켬/끔, 단원 경계) · 짝 조합 13 · 문제 단계 할당(5·6·7·9·13·30) · 난이도 셋 · 서술형 부족 재배분 · 빈 수업 삭제 · 같은 요청 재전송 · 요청 번호 재사용 · 거절 9 · 늦은 쓰기 실패 6(되돌림) · 원본이 그사이 바뀐 충돌 3.

| 얼린 산출물 | 수 |
| --- | ---: |
| 렌더 사례 | 1,365 (HTML 752) |
| 자동 제작 사례 | 1,701 (HTML 384 · 저장 행 144 · SQL 흔적 144) |
| **합계** | **3,066** |

결과: **추출 전 덤프와 추출 후 덤프의 `diff -rq` 가 0건 / 3,066 파일.** 기준선을 두 번 따로 뽑아 서로 견준 것도 0건이다(하네스가 결정적이다).

매니페스트에는 SHA-256 과 바이트 수만 있다. 입력은 합성 문항과 커밋된 개념 은행뿐이고, 운영 DB · 원본 문항 · 정답은 쓰지 않았다. 산출물 바이트(123MB)는 저장소 밖에 두었다.

## 4. 증명이 «무는가»

늘 초록인 자는 증명이 아니다. 커밋한 뒤 일부러 깨뜨려 봤다 — 셋 다 빨개졌고, `git checkout HEAD` 로 되돌린 뒤 작업 폴더가 깨끗한 것을 확인했다.

| 변이 | 달라진 산출물 |
| --- | ---: |
| 1. `blocks/problem.ts` 의 «대표예제» 표지에 빈칸 하나 | 19 |
| 2. `addSection` 이 id 를 하나 더 뽑음 | 1,075 |
| 3. 소단원 고리에서 «준비»와 «오류 점검»의 차례를 바꿈 | 60 |

## 5. 돌린 검사

| 검사 | 결과 |
| --- | --- |
| 추출 증명 (2파일) | 통과 2 / 2 |
| `tsc --noEmit` 저장소 전체, `f866bdc77` | 오류 0 |
| ESLint · Prettier (바뀐 파일과 하네스) | 오류 0 |
| 렌더러·투영·배치 9파일 (`textbookV15Editorial` · `textbookVisualRender` · `textbookEditorialProjection` · `textbookFigureMapping` · `textbookEditorState` · `textbookSemanticCompatibility` · `textbookLayout` · `textbookAutomaticPagination` · `textbookPrintMapping`) | 통과 109 / 109 |
| `html.ts` · `quickCreate.ts` 를 읽는 주변 4파일 (`textbookAdminUsability` · `TextbookPreviewNavigation` · `textbookQuickCreateClient` · `textbookQuickCreateRoute`) | 통과 42 / 42 |
| 자동 제작 2파일 (`textbookQuickCreate` · `textbookQuickCreateIntegration`) | 통과 47 · **실패 11** · 건너뜀 2 |
| 넓힌 12파일 (발행 · 구획 미리보기 · 경로 · 통합 화면 …) | 통과 111 · **실패 1** · 건너뜀 6 |

### 실패 12건은 추출 탓이 아니다

- **`textbookQuickCreate.test.ts` 11건** — 추출 전 소스(`4c62d01ba`)로 같은 파일을 돌려 **똑같은 11건**이 실패하는 것을 확인했다(실패 목록 diff 가 비어 있다). main `143dafcb1` 에 있던 것이다. 원인은 읽기 계약 커밋이 구성 열쇠 10개를 더했는데 쓰는 쪽이 아직 없다는 것이다. 새 열쇠 하나만 켜면 «교재에 넣을 구성요소가 없습니다.»가 나고(10건), 전부 켠 사례는 문제 구성이 7개가 되어 `problemCountPerUnit: 5` 가 계약에서 거절된다(1건). 이 시험 파일은 내 소유가 아니라 그대로 두었다 — **조율 담당이 판단할 일이다.**
- **`textbookRoutes.test.ts` 1건** («내보내기 → 가져오기 → 연결») — `archive/package.server.ts` 가 «Unbundled CSS font reference»를 던진다. 패키지의 글꼴 CSS 를 보는 자리이고 `html.ts` · `quickCreate.ts` 를 지나지 않는다. 추출 전 소스로 같은 파일을 돌려 **같은 1건**(통과 26 · 실패 1)을 확인했다. 원인은 조사하지 않았다 — 이 워크트리의 환경 탓인지 main 의 결함인지는 **모른다.** main 작업 폴더에서 한 번 돌려 가를 일이다.

## 6. 한계

- **이 증명은 «지금 동작»을 얼린 것이다.** P2~P7 이 지면이나 조립을 일부러 바꾸면 매니페스트가 빨개지는 것이 정상이다. 그때는 `TEXTBOOK_EXTRACTION_PROOF=freeze` 로 다시 얼리거나 이 하네스를 거둔다. 그래서 기본 시험 묶음(`npm test`)에 넣지 않고 따로 부르게 했다.
- 닿지 못한 가지(옮긴 줄은 글자 그대로다): 문항 2,000개 · 구획 150개 · 그림 64MB · 구획 262KB 상한(지금 교육과정으로는 못 넘는다) · 개념 또는 OX 가 없는 소단원의 거절 셋(지금 은행에 그런 소단원이 범위 안에 없다) · 서술형 몫의 나머지 가지(서술형이 늘 마지막 단계라 원래 못 닿는다).
- 실제 Chromium 조판 시험 셋(`TEXTBOOK_PDF_TEST=1` · `TEXTBOOK_VISUAL_TEST=1`)은 켜지 않았다. 브라우저에 들어가는 HTML 글자가 같다는 것까지가 이 증명의 범위다.
- 조판 입력의 블록 높이는 실측이 아니라 고정값(제목 16mm · 그 밖 75mm)이다. 쪽 HTML 이 같다는 것이지 쪽 배치가 옳다는 뜻이 아니다.
- 실제 그림 자산 경로(`route.ts` 의 `prepareVisuals` → `visualLibrary`)는 대역으로 바꿔 돌렸다. 그 파일들은 건드리지 않았다.
- 새 구성 열쇠 10개는 이 추출에서 **쓰는 쪽을 만들지 않았다**(동작 무변경). `effectiveQuickCreateComponents` 가 주는 값을 걸음 모듈이 그대로 읽으므로, 각 트랙이 자기 모듈에서 켜면 된다.
- 병합 · 원격 푸시 · 배포는 하지 않았다.
