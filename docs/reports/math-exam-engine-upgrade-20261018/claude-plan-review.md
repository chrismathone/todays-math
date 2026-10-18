# 기출 대비 엔진 업그레이드 실행안 — Claude 독립 계획 검토

2026-10-18 · 검토 대상: `docs/planning/math-exam-engine-upgrade-20261018.md` (parent `BIGSHOL/problem_make` `b7ece42a4`) · 코드 기준: `1954e63d1`(parent 와 `src/` 차이 0) · 검토자: Claude (구현 없음)

## 판정: **APPROVE_WITH_REQUIRED_CHANGES**

방향은 맞다. 원문을 복원·저장하지 않는다, 학교명이 아니라 프로필 데이터로 조립한다, 형식이 같은 논리 문항을 둘로 세지 않는다, `complete / partial / unavailable` 로 정직하게 나눈다, 인증된 웹 화면에서 만들고·검토하고·공통 출력까지 간다 — 사용자가 원한 결과와 일치한다. 실제 코드에 기댈 자리도 있다. `WorksheetEditor` 는 저장 없이 생성 문항을 출력하는 선례가 있다(`SavedRetryPanel.tsx:213-240` — `fixedComposition`, `draftActions={false}`, 출력 직전 `beforeOutput` 재확인). PDF/HWPX 내보내기는 문항 ID 를 DB 에서 찾지 않고 렌더된 HTML 을 받는다(`pdfServer.ts:21-30`). 생성기는 시드로 결정적이다(`middle/generate.ts:167-209`, `high/generate.ts:129-161`).

그런데 계획대로 작업자 셋을 지금 바로 보내면 세 군데에서 깨진다. (1) 공유하는 요구 어휘와 출력 계약이 정해지지 않아, 병렬 작업자들이 각자 다른 기준으로 «완결 대응»을 선언한다. (2) 그림은 TS 가 아니라 Python 엔진이 그리고, 기본으로 치수를 조용히 빼 버린다. (3) 새 가족을 기존 등록부에 넣으면 은행 적재기·예측기·개수 잠금이 바뀐다. 아래 **B1~B5 는 작업자를 보내기 전에 root 가 정한다.** 사용자 확인이 필요한 항목은 아니다. **R1~R5 는 통합 단계에서 root 가 지킬 조건이다.**

---

## 1. 차단 변경 — 작업자 보내기 전

### B1. 요구 어휘와 가족 계약을 core 가 먼저 고정한다

계획은 «요구별 대응»과 «manifest/출력 계약»을 말하지만, 학교와 무관한 **요구 ID 어휘**를 누가 언제 정하는지가 빠져 있다. 이것이 없으면 작업자 2(중1·중2)와 작업자 3(고등·기하)이 각자 다른 문자열로 대응을 선언한다. 프로필은 학교별 자유 문장이 되고, 계획기는 «학교 if 문»으로 되돌아간다.

- `src/contracts/examStudy.contract.ts` 에 다음을 **작업자 2·3 을 보내기 전에** 커밋한다(root 가 직접 쓰거나 core 작업자의 첫 커밋을 먼저 받는다).
  - `StudyRequirementId` — 닫힌 열거(Zod enum). 학교 이름이 들어가지 않는 일반 수학 요구다(예: `graph.piecewise-multi-claim`, `coord.two-graph-shared-side-square`, `system.shifted-solution-coupling`, `logic.truth-set-inclusion-param`, `written.dependent-formula-residual-min-time` …). 출처는 `source-profiles.json` 의 추상 요구 33개와 이미 검증된 기존 대응(부호→사분면, 함수 판단, 해 개수→매개변수)이다.
  - 요구 하나의 차원: `concept[]`, `conditionTopology`(결합 조건 수·의존 순서), `representation`(`text | figure-required | figure-optional`), `caseAnalysis`(`none | enumerate | exclude`), `response`(`mc | short | written`), `structuralDifficultyBasis[]`.
  - `ExamStudyFamily` — `id`, `version`, `grade[]`, `unitIds[]`, `fulfills: { requirement: StudyRequirementId; level: "full" | "component" }[]`, `formats`, `figureKinds[]`, `paramDomain`(유한 열거기 또는 표본기), `generate(seed, variant) → ExamStudyItem`, `canonicalParams(item)`.
  - `ExamStudyItem` — `logicalKey`, `contentDigest`, `stem`, `choices?`, `answer`, `solution`, `rubric?`(기준·배점·허용 다른 풀이·흔한 오류), `figureSpec?`, `difficultyBasis`.
- 학교 프로필(`src/lib/examStudy/profiles/*`)은 `StudyRequirementId` 와 비중·검토 범위·미확인 수만 담는다. 자유 문장은 우리가 쓴 짧은 설명 하나로 제한하고, 원문 수치를 옮기지 않았는지 시험으로 지킨다(§4 A9).

### B2. 새 가족은 기존 등록부에 넣지 않는다

`registeredTypes()`, `registeredHighTypes()`, `nativeDescriptiveDefinitions()` 는 은행 적재기(`load-engine-problems.ts`), tier QA, 개수·커버리지 잠금 시험, 학생 SRS 의 생성기 경로가 함께 읽는다. 여기에 새 가족을 넣으면 «예측기·SRS·은행 보존»이 깨진다. 동시에 계획이 막겠다고 한 «등록 수 부풀리기»가 기존 지표에도 섞인다.

- 새 가족 위치를 이렇게 정한다. `src/lib/examStudy/families/middle/**`(작업자 2 전용), `src/lib/examStudy/families/advanced/**`(작업자 3 전용). 디렉터리마다 `index.ts` 에서 목록 하나를 내보낸다. 계획 문서의 `middleFamilies.ts` · `advancedFamilies.ts` 는 이 두 `index.ts` 로 읽는다.
- `src/lib/examStudy/registry.ts`(core 소유)는 두 목록과 **기존 엔진 adapter** 를 합친다. adapter 는 `generateMiddleProblem` 같은 기존 함수를 **읽기 전용 import** 로만 감싼다.
- 중1·중2 서술형은 `NativeDescriptive` 와 **같은 모양**을 쓰되, `nativeDescriptiveDefinitions()` 에 등록하지 않는다. 은행 적재는 계획 문서대로 별도 승인 단계다.
- 기존 생성기 파일 수정은 실제 결함 수정에만 허용한다. 그때도 해당 엔진의 기존 시험을 같이 돌린다.

### B3. 그림 경로를 명시한다 — Python 엔진, 엄격 모드, 실패하면 부분 결과

계획은 «필요한 자체 그림·그래프»를 말하지만 그림을 무엇이 그리는지 정하지 않았다. 실제로 중등·고등의 `figureSpec`(`linearGraph`, `curveGraph`, `graph-1` …)은 **Python 엔진**이 SVG 로 만든다. 로컬에서는 `spawn`, Vercel 에서는 같은 배포의 `api/mathgen-engine.py` 를 transport 로 부른다(`renderFigureSpec.ts:131-140,167`). 그리고 기본 동작이 **들어갈 자리가 없는 치수 라벨을 하나씩 빼고 성공으로 돌려준다**(`renderFigureSpec.ts:99-117`, `strict` 가 아닐 때). 그림을 읽어야 풀리는 문항에서 치수가 빠지면 풀 수 없는 문항이 «성공»으로 인쇄된다.

- POST 가 서버에서 `renderFigureSpec(spec, { strict: true, signal })` 를 부른다. 결과는 `StudioProblem.figureSvg` 로 실어 보낸다.
- `representation = figure-required` 인 문항에서 렌더가 실패하거나 `droppedDimensions` 가 비어 있지 않으면, **그 문항은 버리고 다른 시드로 정해진 횟수만 다시 시도한다.** 그래도 실패하면 그 요구를 `unavailable` 로 내리고 세트는 `partial` 이 된다. 그림 없는 문항으로 대신 채우지 않는다.
- 가족마다 쓰는 그림 종류를 `figureKinds[]` 에 적고, 지금 엔진 카탈로그(`scripts/figure/build_catalog.py`)에 있는 종류만 쓴다. Python 엔진에 새 종류가 꼭 필요하면 **한 작업자만**(권장: 작업자 2) `scripts/figure/**` 를 만지고, 실제 엔진을 태우는 시험(`figureLinearGraph.test.ts` 와 같은 방식)을 더한다. 작업자 2·3 이 같은 `.py` 를 동시에 고치지 않는다.
- 단위·API 시험은 transport 를 모킹한다. 새 그림 종류·조합마다 실제 엔진 렌더 시험 하나와 눈검수 증거를 둔다.
- 생성 요청 하나의 렌더 수와 동시 실행에 상한을 둔다(15초 타임아웃 × 문항 수가 함수 시간을 넘지 않게 한다).

### B4. `full` 은 사람이 적는 값이 아니라 증거에서 계산하는 값이다

계획에는 «단순한 과제로 줄여 완결로 올리지 않는다»가 원칙으로만 있다. 작업자 셋이 병렬로 짓는 만큼, 이것을 코드가 막아야 한다.

- 가족마다 `src/lib/examStudy/evidence/<familyId>.ts` 같은 증거 기록을 두고, 시험이 그 존재와 통과를 잠근다.
  1. **독립 검산** — 정답 필드를 쓰지 않고 발문의 수치에서 다시 푼다. 유한 영역은 전수, 무한 영역은 경계·퇴화·부호 갈래를 포함한 표본.
  2. **조건 필수성** — 선언한 필수 조건을 하나씩 빼면 해가 유일하지 않거나 답이 달라진다.
  3. **그림 필수성**(`figure-required` 일 때) — 그림이 주는 핵심 값이 발문 글에 없다. 그리고 렌더된 SVG 라벨(`svgLabels`)에 그 값이 있다.
  4. **서술형** — 기준 배점의 합이 맞고, 모범답이 각 기준을 채우고, 계산형 가족에 끝말만 «설명하시오»로 붙인 것이 아니다(같은 `logicalKey` 의 단답 쌍이 있으면 실패).
- 대응 수준은 다음과 같이 계산한다: 증거가 다 있으면 `full`, 일부만 있으면 `component`, 없으면 `unverified`. manifest 에 손으로 `full` 을 적고 증거가 없으면 시험이 빨개진다.
- 기존 엔진 adapter 도 같은 규칙을 따른다. 감사에서 확인된 대응(부호→사분면 `1-1|좌표와 그래프|06`, 여러 구간 교차 `|84X`, 해 개수→매개변수 `2-1|일차부등식|118X`, 직선 다중 성질 `m2Line.ts:404-450`)만 증거를 붙여 올린다.

### B5. 문항의 정체와 «개수»를 정의한다

- `logicalKey = familyId@version + canonicalParams` 다. 시드가 달라도 같은 매개변수 튜플이면 같은 문항이다. 형식(객관식/단답/서술)은 `logicalKey` 에 넣지 않는다. 형식 파생은 기존 `deriveThreeFormats`/`expandFamily` 와 `QuestionRepresentation` 을 쓰고, 새로 짓지 않는다.
- 세트 조립 규칙: `logicalKey` 가 겹치지 않는다. `contentDigest` 도 겹치지 않는다(서로 다른 튜플이 같은 발문을 내는 경우). 한 세트에서 가족마다 상한을 둔다(기본 1, 요구 비중이 클 때만 늘린다).
- 화면과 보고서의 «연습할 수 있는 양»은 **서로 다른 `canonicalParams` 수**(유한이면 열거값, 아니면 «표본 n 중 서로 다름 m»)로 보고한다. 시드 수·형식 수·가족 수를 곱한 값은 쓰지 않는다.

---

## 2. 통합 단계의 필수 조건 (root)

### R1. 권한 — proxy 와 handler 양쪽에서

- `/exam/**` 와 `/api/exam/**` 는 이미 prefix 로 **`export`(출력) 메뉴**에 묶여 있다(`accountRouteAccess.ts:248-262`). 새 경로는 따로 적지 않아도 이 문을 지난다. «출력 메뉴가 있는 계정만 연습을 만든다»를 의도로 확정해 문서에 적는다.
- 그런데 기존 `/api/exam/rounds` handler 는 세션만 확인한다(`route.ts:21-23`). 새 handler 는 `teacherGate` 처럼 `authorizeAccount` → `accountRouteAllowed(account, method, path)` 를 **handler 안에서도** 부른다(`courseTeacherRoutes.ts:49-69`). 검수 계정은 `routeAccess.ts` 의 허용 목록에 없으므로 막힌다(그대로 둔다). 학생 세션은 계정 세션이 아니므로 401/403 이다.
- 시험: 익명 401, 학생 403, 검수 계정 403, `export` 가 꺼진 계정 403, 지점 메뉴 상한으로 꺼진 계정 403, 정상 계정 200. proxy 와 handler 각각.

### R2. 화면 — 기존 작업과 겹치지 않게

- `src/app/(main)/exam/practice/page.tsx` 와 `src/components/exam-practice/**` 만 새로 만든다. `src/components/exam-builder/**`(Hi-fi 진행 중 세션)는 import·수정하지 않는다. 정적 세그먼트 `practice` 가 `[id]` 보다 우선한다. `/exam/[id]` 의 id 검증이 `practice` 를 회차로 읽지 않는지 확인한다.
- 배치는 `DESIGN.md` §5.4 «제작·편집: 조건과 결과»(조건 0.85fr / 결과 1.15fr)를 따르고 마지막 단계는 `WorksheetEditor` 다. DESIGN §9.1 에 «새 시안 승인 회의를 요구하지 않는다»고 적혀 있으므로 D-07 시안 절차는 차단 사항이 아니다. 대신 DESIGN §9.2 체크리스트(폭 1920~320, 상태, 키보드)를 완료 증거로 남긴다.
- `ExamDashboard.tsx:90-104` 는 빈 상태 문구(«기출 적재가 먼저…»)와 진입 링크만 바꾼다. `/api/exam/rounds`, `/api/predictions`, `/api/tests/predicted` 와 predictor 코드는 바꾸지 않는다.

### R3. 출력 — 공통 경로 재사용 + 출력 직전 재확인 + 인쇄 검수 항목

- `WorksheetEditor` 에 `draftActions={false}` 를 넘긴다. 구성 변경을 허용하지 않을 거면 `fixedComposition` 도 넘긴다. `beforeOutput` 에서는 같은 레시피로 서버 POST 를 다시 불러 `contentDigest` 목록이 같은지 확인한다(`SavedRetryPanel` 의 방식). 다르면 출력하지 않는다.
- 문항 `id` 는 레시피에서 나온 불투명 토큰으로 하고, `questionId` 는 비워 둔다(DB UUID 를 가장하지 않는다). 서술형 루브릭은 교사용 해설 쪽에만 나온다.
- CLAUDE.md 절대 규칙 6 에 따라 새 그림 종류와 서술형 루브릭 지면을 `src/app/dev/print-check/items.ts` 에 `대기` 상태로 추가한다. 완료 보고에서 «실물 인쇄 검수 끝»이라고 쓰지 않는다. 이것은 구현을 막지 않지만 완료 문구는 제한한다.

### R4. 요청 경계와 결정성

- 요청은 엄격한 Zod(`.strict()`)로 받는다. 문항 수 상한(예: 30), 본문 크기 상한, 재시도 상한을 둔다. 요청에 문항 본문·원문 필드를 받는 칸을 두지 않는다.
- 시드는 `profileId@version + manifestVersion + 정규화된 수학 요청 + 사용자 시드` 에서만 만든다. 학교 **표시 이름**, 계정, 시각은 넣지 않는다. «다른 조건으로 다시 만들기»는 사용자 시드만 바꾼다.
- 기존 생성기는 단정이 깨지면 예외를 던진다(`assertChoiceCount` 등). 문항 단위로 잡아 그 시도만 버린다. 500 으로 끝내지 않는다.
- 응답에 `profileVersion`, `manifestVersion`, `requirements[]: { id, status, reason }`, `formatRequested/formatDelivered` 를 싣는다. 화면에는 사람이 읽는 말로만 보여 준다(시드·manifest 용어는 안 보인다).

### R5. 작업자 범위의 정직성

작업자 3 에 고등 공통2 넷 + 중3 + 교과서 기하가 걸려 있다. 가족마다 B4 증거가 필요하므로, 얕은 가족 여덟보다 **증거를 다 갖춘 가족 셋~넷**이 낫다. 범위를 다 못 채우면 그 요구는 `unverified/unsupported` 로 남기고 보고한다. 작업자 2 도 같다.

---

## 3. 제안 (차단 아님)

- S1. 병합 순서: 계약(B1) → core(계획기·adapter·프로필) → 작업자 2·3 의 `families/*` → root 의 API·UI. 등록 충돌은 `registry.ts` 의 import 두 줄로 줄어든다.
- S2. 일반 범위 연습(프로필 없음)은 «학년·단원 → 그 단원에서 `full` 인 요구 목록»으로 고르게 한다. 그러면 학교 프로필과 같은 계획기를 탄다. 초등·고등 대부분은 `unsupported` 로 보이는 것이 정상이다.
- S3. 화면 머리에 학교명을 «대비 완료»처럼 크게 내걸지 않는다. «검토 범위 n개 요구 중 m개 완결 연습 · 미확인 k» 같은 사실 줄로 쓴다(D-08 사무적 문구).
- S4. 프로필의 «관찰 범위»(보인 문항 수/숨긴 수, 관찰 시점)를 데이터로 두고 화면에 그대로 보인다. 고쳐 쓰면 `profileVersion` 이 오른다.
- S5. 증거 기록(B4)을 그대로 읽어 `docs/reports/...` 의 대응표를 만드는 스크립트를 둔다. 보고서 숫자와 코드가 어긋나지 않게 된다.

---

## 4. 시험할 수 있는 합격 기준

| # | 기준 | 실패 조건 |
| --- | --- | --- |
| A1 | 같은 범위·문항 수에서 요구만 다른 두 프로필 → 계획(가족 목록)이 다르거나, 한쪽이 `partial` 이 된다 | 같은 세트가 둘 다 `complete` |
| A2 | 같은 프로필의 표시 이름만 바꿈 → 같은 레시피에서 바이트가 같은 결과 | 하나라도 다름 |
| A3 | 모든 `full` 대응에 B4 증거 넷(해당되는 것)이 있고 통과한다 | 증거 없이 `full` |
| A4 | 유한 가족은 전수 열거로 유일성·정의역·퇴화 검사. 무한 가족은 경계 갈래를 포함한 표본으로 검사 | 실패 1건 이상 |
| A5 | 한 세트 안에서 `logicalKey`·`contentDigest` 가 겹치지 않는다. 객관식/단답 쌍은 하나로 센다 | 중복 |
| A6 | `figure-required` 요구에서 렌더 실패나 치수 누락이 생기면 그 요구가 `unavailable`, 세트는 `partial`. 그림 없는 대체 문항이 없다 | 그림 없는 문항으로 채움 |
| A7 | 서술형을 요구했는데 서술형 가족이 없으면 `partial` 이고 빠진 요구가 표시된다. 단답에 «설명하시오»를 붙여 대신하지 않는다 | 조용한 대체 |
| A8 | 새 가족을 더해도 `registeredTypes().length`, `registeredHighTypes().length`, `nativeDescriptiveDefinitions().length`, 은행 적재기·predictor·SRS 시험이 바뀌지 않는다 | 변화 |
| A9 | 프로필 데이터에는 열거된 요구 ID 와 메타데이터만 있다. 설명 칸에 학년·학기 말고 숫자가 없다(시험). 원문 필드가 계약에 없다 | 위반 |
| A10 | 인증: R1 의 6가지 경우를 proxy 와 handler 각각에서 확인 | 하나라도 열림 |
| A11 | 통합 e2e: 로그인 → `/exam` 진입 링크 → `/exam/practice` 범위 선택 → 생성 → 답/풀이 숨김 기본 → 펼침 → 다시 만들기 → `WorksheetEditor` 미리보기 → PDF 요청 본문 생성(내보내기 서버는 모킹 가능) | 단계 누락 |
| A12 | 이 경로에서 DB 쓰기 0, 유료 API·AI 호출 0, Prisma generate 0. 그림 transport 는 시험에서 모킹하고, 새 그림 종류마다 실제 엔진 렌더 시험이 하나씩 있다 | 위반 |
| A13 | `type-check`·`lint`·`lint:affordance`·영향 받는 기존 시험이 모두 초록. 폭 1920/1280/768/390/320 확인 범위를 기록 | 빨강 |
| A14 | 보고서는 «학교 적중률·학습 효과·실측 난도·교육과정 전수»를 미측정으로 적고, «전체 기출 완성»이라고 쓰지 않는다 | 과장 |

---

## 5. 지켜야 할 제약 (계획에 이미 있음 — 확인)

원문 DB 복원·적재 금지, 원문 문장·수치·그림을 생성 입력으로 쓰지 않음, 학교 예측기(`/api/exam/rounds`·`/api/predictions`·`/api/tests/predicted`) 보존, 학생 SRS 무변경, 객관식/단답의 논리 문항 정체 보존, 지점·메뉴·출력 관문 보존, provider·DB 호출과 Prisma 생성 없음, `MathExamBuilder` Hi-fi 영역 비접촉, 구현하지 않은 저장 버튼 숨김.

## 6. 이 검토가 한 일과 안 한 일

계획 문서, AGENTS.md, 감사 보고서(README·OWNER-CRITERIA·upgrade-plan·source-comparison·school-study-flow)를 읽었다. 코드는 `accountRouteAccess.ts`, `routeAccess.ts`, `proxy.ts`, `courseTeacherRoutes.ts`, `api/exam/rounds/route.ts`, `ExamDashboard.tsx`, `WorksheetEditor.tsx`, `SavedRetryPanel.tsx`, `unified/types.ts`, `export/pdfServer.ts`, `figure/renderFigureSpec.ts`, `middle/generate.ts`, `high/generate.ts`, `engine/*`, `DESIGN.md` §5·§9 를 읽었다. DB 조회, 자격 증명 사용, 유료 API 호출, 시험 실행, Prisma generate, 푸시는 하지 않았다. 따로 남길 무시 파일 증거는 없다(모든 근거는 위 파일:줄로 적었다).
