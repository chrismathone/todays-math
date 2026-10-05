# 교재 v15 출시 관문 독립 검수 — Grok — 2026-10-05

제공자: Grok. Dispatch `ctx_c159841a87e0`, task `task_d47f49a6abc8`. 이 문서는 Grok이 소스를 직접 읽고 파일 해시를 직접 잰 독립 검수다. 합의문이 아니고, Claude·Codex의 판정을 대신하지 않는다.

검수 대상은 `C:/Users/user/orca/workspaces/testautocreator/testbook` 분기 `BIGSHOL/testbook` HEAD `677b79ee201a976025c45732bd3ecf9f88121523`이다. 부모 코드 커밋은 `182625813398f92ff819fa33d92461ff91246c25`이다. `677b79ee2`는 실행 원장 문서 커밋이다. 이 검수는 그 워크트리를 수정하지 않았다. 계획 파일은 읽기만 했다.

판정: 출시 수용이 아니다. G0–G6 통과가 아니다. 이 검수가 새로 확인한 발행 결함은 하나다. 단일 HTML이 검증된 쪽수 참조를 채우지 않는다. 목차 활동 이름과 은행 활동의 원본·레거시 배제는 읽은 함수 안에서 추가 결함이 없다. 원본 필기선 437개의 전수 소비를 단정하는 검사는 현재 오라클에 없다.

이미 기록된 미결은 새 발견으로 세지 않는다. 원본 전체 학생 36쪽·답지 48쪽에서 R23 필기선 14개가 ±0.5mm를 넘는 것, R9 연결 카드 CSS, 중3-2 예제 묶음 0.82mm, 과거 27PDF/1,171쪽은 루트 원장과 조정 메시지 `msg_51a61ea8311f`·`msg_fda8ddbc71e0`에 있다. `182625813`의 Chromium 24/24는 루트가 기록한 통과이며 Grok이 다시 돌리지 않았다. 답지 고립 제목과 `paginate.ts`·`html.ts`의 예제 묶음은 Claude dispatch의 수정 범위로 남아 있다. 14학기 두 단계 재출력 전에는 출시 완료를 말하지 않는다.

이 검수는 구현, DB, 환경 변수, 공유 모듈, 배포, push, 14학기 발행, Chromium 재실행, 원본 PDF 오라클 재실행을 하지 않았다. 운영 생성, 실물 인쇄, 사람의 편집 승인을 한 것으로 기록하지 않는다.

## 고정값

계획 `docs/planning/textbook-v15-recovery-plan-final-20261005.md`의 작업 파일 SHA-256은 `0ab8ac18fc033936e52a300752dd73894fbccfa52c740c0acc52c0d03cb04bb7`이다. Get-FileHash로 HEAD `677b79ee2` 작업 트리에서 다시 맞췄다. 계획 바이트는 이 검수에서 바꾸지 않았다.

현재 코드의 판 번호는 그대로다.

| 고정 | 위치 | 값 |
| --- | --- | --- |
| exchange | `src/contracts/textbookPrimitives.contract.ts:37` | `injaewon.textbook.exchange.v1` |
| renderer | `src/lib/textbook/render/versions.ts:1` | `injaewon.textbook.renderer.v5` |
| template | `src/lib/textbook/render/versions.ts:2-3` | `injaewon.textbook.a4.v15.editorial.v2` |
| 작성기 | `src/app/api/textbook/quick-create/route.ts:20,63-64` | `TEXTBOOK_RECOVERY_WRITER_ENABLED === "true"` 일 때만 POST. 기본 경로는 거절 |

발행 묶음 한도는 현재 코드에 있다. `codexRenderer.planChunks`는 구획 4부터 1까지 줄이고, 원고 블록 300을 넘기면 더 작은 묶음을 고른다(`src/lib/textbook/publish/codexRenderer.ts:35-77`). `planTextbookChunks`는 한 묶음 구획 수를 1–8로 제한한다(`src/lib/textbook/render/server.ts:764-773`). 조판 청크는 투영 블록 600(`server.ts:387-392`, `414-416`)과 기본 32쪽(`server.ts:490`)에서 실패한다.

## 현재 결함 — 단일 HTML이 쪽수를 비운다

PDF 최종 조판은 쪽수를 채운다. 발행기가 저장하는 단일 HTML은 그 채우기를 호출하지 않는다.

채우기 함수는 `withTextbookPageReferences` 하나다(`src/lib/textbook/render/pageReferences.ts:16-88`). 반환은 새 렌더 모델이고, 저장 교환 문서를 고쳐 쓰지 않는다. `contentsEntries`가 만드는 목차 항목에는 `pageLabel`이 없다(`src/lib/textbook/server/quickCreate/contents.ts:51-56`). 쪽 칸 글자는 `entry.pageLabel ?? ""`이다(`src/lib/textbook/render/blocks/semantic.ts:69-70`).

`renderTextbookChunk`만 그 함수를 호출한다(`server.ts:381-382`). 예약 쪽 `reservedPages`가 있으면 채운 뒤 배치가 같은지 `assertTextbookReferenceLayoutUnchanged`로 본다(`server.ts:524-525`).

단일 HTML은 다른 함수다.

1. `reservePublish`는 조판기가 `offlineHtml`을 가지면 학생용 `offline` 걸음을 만든다(`src/lib/textbook/publish/reserve.ts:330-336`).
2. `runNextStep`의 offline 가지는 학생용 조판 걸음의 `carry`만 넘긴다(`src/lib/textbook/publish/step.ts:382-396`). `rendersOf`는 `artifactRenderSteps`라서 예약 단계는 빠진다(`src/lib/textbook/publish/job.ts:34-43`). 최종 배치 쪽은 넘어간다.
3. `codexRenderer.offlineHtml`은 그 쪽 배열로 `renderTextbookOfflineHtml`을 호출한다(`src/lib/textbook/publish/codexRenderer.ts:170-180`). `referencePages`도 `reservedPages`도 없다.
4. `renderTextbookOfflineHtml`은 `createTextbookRenderModel(input.exchange, input.variant)`만 만들고(`server.ts:830`) 쪽마다 `renderPageHtml`을 다시 그린다(`server.ts:853-862`). `withTextbookPageReferences` 호출이 없다.

그래서 최종 PDF의 목차·색인 칸에는 검증된 쪽수가 있고, 같은 발행의 단일 HTML은 빈 쪽 칸을 저장한다. 쪽의 물리 배치를 carry로 넘겨도, 글자는 다시 만든 모델의 `pageLabel`에서 나온다. 넷째 인자 `input.pages`는 대화 진행용 문맥 쪽이고 참조 칸을 채우지 않는다(`server.ts:862`, 청크 쪽의 같은 형태는 `server.ts:528-533`).

이 경로를 재는 시험이 없다. `scripts/qa/textbook/recovery/local-books.ts`는 `renderTextbookChunk`와 `withTextbookPageReferences`로 PDF·DOM을 보고(`local-books.ts:388` 근처), `renderTextbookOfflineHtml`은 호출하지 않는다. 초3 두 단계 PDF 사전 검사가 목차 숫자를 확인했다는 원장 기록은 이 HTML 산출물을 포함하지 않는다. `textbookVisualRender.integration.test.ts:246`의 offline 호출은 인라인 이미지 공유를 보고 쪽 칸은 보지 않는다.

Grok은 이 호출 그래프를 HEAD에서 읽었다. 단일 HTML 바이트를 만들어 해시하지는 않았다. 재현은 참조 노드가 있는 교환 문서로 `renderTextbookChunk`의 최종 HTML과 `renderTextbookOfflineHtml`의 `.tb-reference-page` 글자를 비교하면 된다. 14학기 발행을 돌릴 필요는 없다.

TypeScript 재배치 가드는 쪽 수, `physicalPageIndex`, `sectionKey`, 블록 수, `blockId`, `itemId`, 단, x/y/폭/높이(0.01mm)만 본다(`pageReferences.ts:99-131`). `printedPageLabel`과 `unitKey`는 비교하지 않는다. Python `scripts/qa/textbook/recovery/page_references.py:127`은 `printedPageLabel`과 `unitKey`를 비교한다. 이번 결함은 그 차이로 생긴 재배치가 아니다. 단일 HTML이 채우기 자체에 들어가지 않는 것이다.

## 두 단계 PDF 발행

PDF 걸음은 요청한 순서대로 연결돼 있다. 참조 노드가 있으면 보기마다 예약 렌더를 모두 끝내고 최종 렌더를 한다(`reserve.ts:306-318`). 최종 렌더는 같은 보기의 예약 carry를 `referencePages`로, 자기 조각의 예약 쪽을 `reservedPages`로 넘긴다(`step.ts:292-319`, `codexRenderer.ts:91` 이후). 해설은 같은 구획의 학생용 최종 carry를 `studentPages`로 요구한다(`codexRenderer.ts:81-82`, `server.ts:367-379`). 병합·쪽 지도는 예약 단계를 뺀다(`job.ts:34-43`).

`local-books.ts`는 `reservePublish` 뒤에 자신의 루프로 `renderTextbookChunk`를 두 번 호출한다. `runNextStep`과 offline 걸음은 타지 않는다. 따라서 그 QA의 통과는 위의 단일 HTML 결함을 닫지 못한다. 답지 안쪽 모델과 바깥 목차 모델의 쪽 지도가 갈리는지는 이번 검수에서 다시 출력하지 않았다.

## 목차 활동 이름

`contentsEntries`(`contents.ts:15-57`)는 `unitKey`와 제목이 한 번만 나오면 제목만 쓴다. 같은 단원에서 제목이 반복되면 그 구획 블록의 활동 이름을 `ACTIVITY_LABELS`로 붙인다. 붙인 라벨도 반복되면 ` (n/N)`을 붙인다. 각 항목은 `targetUnitKey`와 `targetSectionKey`를 가진다. `targetUnitKey`가 있으므로 `pageReferences.ts:64-73`의 단원 없는 접미 섹션 모호 분기는 이 목차의 경로가 아니다.

읽은 알고리즘과 `src/__tests__/unit/textbookContents.test.ts`의 세 경우(반복 분할은 활동 이름, 같은 활동의 계속은 번호, 유일한 제목은 제목만)는 서로 맞다. 이 함수에서 추가 결함은 없다. 14학기 저장 원고의 목차 문자열이 모두 그렇게 나왔는지는 다시 출력하지 않았다.

## 은행 활동의 원본·레거시 배제

`renderBankActivityHtml`(`src/lib/textbook/render/blocks/bankActivities.ts:56-69`)은 다음이면 `null`이다. semantic이 없음, `semantic.source`가 있음, 노드 종류가 `rows`가 아님, 활동이 `conceptBlankTest`·`explainActivity`·`conceptMap`이 아님, `groupKey`가 `bank-activity.v1.<activity>.<digits>`가 아님. 통과한 묶음은 행이 비거나, 설명 2행·그 외 4행을 넘거나, `textFormat`이 `bank-blank`가 아니면 throw한다. CSS는 `.tb-bank-*`만 대상으로 한다(`bankActivities.ts:86` 이후).

`renderSemanticTextHtml`은 은행 HTML이 있으면 그것을 반환하고, `null`이면 원본 fragment와 레거시 writing으로 내려간다(`semantic.ts:54-68`). 원본 행과 레거시 글쓰기는 은행 렌더러에 들어가지 않는다. 읽은 배제 게이트에서 추가 결함은 없다. 은행 카드 제목 CSS가 `display:block`인 것(`bankActivities.ts`의 `.tb-bank-map-card>strong`)은 배제 조건의 변경이 아니다.

## 원본 437 필기선 오라클

`dom-witness.ts:352-361`은 문항 컨테이너를 `nativeQuestionWritingAreas.find(questionId)`의 첫 일치로 고른다. 같은 `questionId`의 둘째 컨테이너는 첫 영역과 비교되고, 둘째 오라클 영역을 소비하지 않는다. `geometry.py:241-299`는 증인에 있는 쓰기 상자만 검사한다. 파일 안에 전역 437 잔여 카운트는 없다. 이것은 오라클이 인구 전체를 닫지 않는다는 검사 한계다. 현재 픽스처에서 규칙 하나가 빠졌다는 재현은 아니다.

실행 원장이 인용하는 집중 9작업 차이 0(`7660aded5`)과 v6 oracle SHA `cac3612a9193b7c27cd04b87601ea92a973b2a9f18e6445e9784f42a10d6969a`는 원장 문장의 값이다. Grok이 그 PDF와 oracle을 다시 해시하지 않았다.

## 이미 기록된 미결

아래는 새 결함이 아니다. 해시는 원장·과거 보고서가 적은 값이다. Grok이 그 바이트를 다시 해시하지 않았다. 과거 자동 출력의 HTML 압축은 소스 판정에 쓰지 않았다.

| 기록 | 상태 |
| --- | --- |
| 렌더러 `06845c836` 집중 9작업 `0,0,0,49,0,0,0,0,0`. R30 PDF에서 수리 예시가 10pt로 줄어 24.796419mm 대 원본 28.876790mm | 수정 전 측정. 현재 `sourceActivityCss.ts:32`는 `.repair-example .math`와 `[data-textbook-math]`를 17pt, line-height 1.65, inline-block으로 둔다. 원장은 그 뒤 `7660aded5` 집중 9작업이 차이 0이라고 적는다. Grok은 그 재실행을 하지 않았다 |
| 동결 재생 `441fa1f84bdfa0ddcb967e15930820fcfe178435`, 27PDF/1,171쪽, 중3-2 답지 `EXAMPLE_GROUP_OVERFLOW` | 그 QA는 draft 청크였고 `referencePages`/`reservedPages`를 넘기지 않았다. 이후 코드에 두 단계 발행, 목차 라벨, 17pt, 은행 틀이 들어왔다. 그 보고서의 빈 목차·수식 제목·빠진 은행 틀을 현재 HEAD의 결함으로 세지 않는다. 14학기 재출력은 아직 없다 |
| 전체 원본 재출력 학생 36쪽 SHA `a305f6dc4945c290aafc6b887299aa1f73a8a865b84428b894f4a5ad23d1803b`, 답지 48쪽 SHA `045802b2a5a1f3dc26e0472c0f919951b5b0f4a49337e6850e20f431877ce679` | `182625813` 이전 측정. 학생 R23 필기선 14개가 원본보다 0.529167mm 위. R9 연결 카드와 확인란 겹침. 답지 R15/R16 확인 제목 고립. 원본 답지 PDF는 해시가 고정돼 있지 않다 |
| `182625813` CSS | `sourceChapterCss.ts:38-44`의 `.connection-columns` 3열·현재 카드 배경, `:31-36`의 `.chapter-topics` 글꼴, `:3-6`의 머리 선과 홀수 하단 순서. `sourceProblemCss.ts:18`의 `.mini-concepts strong`은 8.2pt, line-height 1.8. 통합 시험 `textbookRecoverySourceQuestionRows.integration.test.ts:224-396`과 `:398-468`은 그 선택자가 시험이 만든 fragment DOM에 맞게 계산되도록 기대한다. Grok은 그 Chromium 시험을 다시 돌리지 않았다. 원장은 이 커밋의 원본 PDF 재검사가 남아 있다고 적는다. 0.529167mm 선 이동이 ±0.5mm 안으로 들어갔는지는 미확인이다 |
| 중3-2 예제 묶음 0.82mm 넘침, 답지 확인 제목 고립 | `EXAMPLE_GROUP_OVERFLOW`는 아직 `src/lib/textbook/layout/paginate.ts:642-649`에 있고, 묶음 높이는 `Math.max(102, ...)`다. 원장은 이 수정을 Claude dispatch `ctx_a860f4b6b9ac`에 두었고, 그 보고서는 끝나지 않았다고 적는다. HEAD에서 다시 실패하는지, 닫혔는지는 미확인이다 |

## 관문

원장 `677b79ee2`의 표를 현재 상태로 읽었다. Grok이 그 통과 수를 다시 세지 않았다.

- G0a: 집중 9/9는 원장이 인용한 수정 후 통과. 전체 36/48쪽 FAIL은 `182625813` 이전 PDF다. 그 커밋의 원본 PDF 재검사가 남아 있다.
- G0b: 27PDF/1,171쪽은 보존된 실패다. 14학기 두 단계 재출력은 없다.
- G1, G4 생성, G5 배포, G6 실물 인쇄는 원장도 미완으로 둔다. 지정 계정 로그인 확인을 생성·발행으로 세지 않는다.
- 사람의 수학 편집 승인과 실물 인쇄는 없다.

## Grok이 잰 SHA-256

HEAD `677b79ee2` 작업 트리, PowerShell `Get-FileHash`. 작업 트리는 `output/`과 `tmp/`만 추적되지 않은 상태였다. 아래 파일은 그 커밋의 내용이다.

| 파일 | SHA-256 |
| --- | --- |
| `docs/planning/textbook-v15-recovery-plan-final-20261005.md` | `0ab8ac18fc033936e52a300752dd73894fbccfa52c740c0acc52c0d03cb04bb7` |
| `docs/planning/textbook-v15-recovery-execution-20261005.md` | `bfd2cb7223f8fa2fb9faeddb6d707c38f90c51eb920fe67f717c973c99890eb8` |
| `src/lib/textbook/render/server.ts` | `874d048eeb0a6c7000ad13af54cc60bdcd697e1f279446006aad4af7e664ad8f` |
| `src/lib/textbook/render/pageReferences.ts` | `7502e2e43ecc13376b85cd1d0a36b58b08730597e5e94b744d0990e2493b2879` |
| `src/lib/textbook/render/blocks/semantic.ts` | `c349651ba72c70376fa306d64a19abda872fc9d51ee8873fc51a876ac170fda8` |
| `src/lib/textbook/render/blocks/bankActivities.ts` | `66500b7c08462a0edfcfaa02a0c12e114b377ddc42272f35c5b365f776e05415` |
| `src/lib/textbook/server/quickCreate/contents.ts` | `bc9741423885ea120dc49e92757005fdfef53c336342b5b57eefc53439cbafd7` |
| `src/lib/textbook/render/sourceChapterCss.ts` | `e6a061ebc0cf268ca104c6199d23fa77ef18d7e3ef06260701ea58469b6c6c27` |
| `src/lib/textbook/render/sourceProblemCss.ts` | `fa03be1ff1b7d75c5db140f1243d0a9a54f999cfb82f466a1ec593b6e6afd91c` |
| `src/lib/textbook/render/sourceActivityCss.ts` | `ac2123e3d3eb9fac384ba50e45050142c3112d26e70bace74eb0703999779cfd` |
| `src/lib/textbook/publish/step.ts` | `108947acd1557f6c48fb713a4e6b44ae2acb80d53762f9fd237456d7497a9f8f` |
| `src/lib/textbook/publish/reserve.ts` | `540edc1fd0c1ea0e5eea470a00d4275f70b8dcf7cf75e70f52c0a8cadeee7dcd` |
| `src/lib/textbook/publish/codexRenderer.ts` | `c3719c21ceb4fe4ecf6a8573e5857dc0075d5707042d835860651b3b69a720a8` |
| `src/lib/textbook/publish/job.ts` | `b5f1cb330b0a22d2b3d574158c1a90aa1fd9c73d883841912feee5d8be52c43d` |
| `src/lib/textbook/render/versions.ts` | `0c443238c34909fef970b4ff0cae738ed11d5fa310e74ba8a248ee58e205f818` |
| `src/contracts/textbookPrimitives.contract.ts` | `dcbc2e86cde6b7049a242c947d9e9ac36373fb00efde426d4cdd25dfe4900313` |
| `src/app/api/textbook/quick-create/route.ts` | `9930db1b6f12e77205ae8241731b21f519def06b7ce65846c42cc40739517149` |
| `scripts/qa/textbook/recovery/local-books.ts` | `09d0ed7c220022a7b94e68b5e294978658091a464ffa03ef9eb2c280c8a587bb` |
| `scripts/qa/textbook/recovery/dom-witness.ts` | `1769790aad25f4e603880cf2fbd9596fce816a51ca490d9349df8ed7a902e0eb` |
| `scripts/qa/textbook/recovery/geometry.py` | `7d3c0d2759c2ba19c2e1f20c9c59da37894b6e081d2776be142a2675e8c364df` |
| `scripts/qa/textbook/recovery/page_references.py` | `f5d499206671f590e09a4dec732a84b8e22165737c0f5e7fbed14e3eaa3580ee` |

## 남은 증거

단일 HTML에 `withTextbookPageReferences`를 태운 뒤, 참조가 있는 교환 문서에서 `.tb-reference-page`가 최종 PDF와 같은지 한 건을 고정할 것. `182625813` 이후 원본 학생 36쪽을 기존 ±0.5mm·437 인구 기준으로 다시 출력할 것. 중3-2 넘침과 답지 제목 고립은 Claude 수정이 끝난 커밋에서 따로 볼 것. 그 다음에야 14학기 두 단계 발행 재생이 G0b를 말한다. G1 실제 발행본 전후, G4 생성, G5 읽기 배포 후 작성기 활성화, G6 실물 인쇄는 그대로 열려 있다.
