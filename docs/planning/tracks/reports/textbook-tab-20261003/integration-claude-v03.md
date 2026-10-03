# 교재 제작 탭 — 개념 연결 검토 v03 (Claude · 계획 검토 단계)

- 사용자 요청: «실제로 책에 들어가는 개념들도 개념백지와 연관되게», «모든 웹앱 시스템이 철저히 한 팀이 되게 유기적으로».
- 앞선 보고서: `architecture-claude.md`(`d3c44e56e`) · `architecture-claude-v02.md`(`cc303dc97`). 이 문서는 v02 의 모델에 **개념**을 더한다. v02 의 나머지는 §8 에 적은 한 군데를 빼고 그대로다.
- 읽은 것: 리드가 고정한 통합안 v03 전문(`textbook-studio-20261003.md` · SHA-256 `60a508c008ea24abfcb8b361f3c639fbc19a80147ff404c045db9eb9cbb40702` — 직접 다시 계산해 확인), Wire 화면 여덟 장(PC 넷 · 휴대폰 넷).
- **표결: 승인.** 위 해시의 통합안에 대해서다. 막는 사유는 없다. P1 에서 정할 것 여섯은 §12 에 적었다.
- 기준: `main` = `2cb791dce`. 제품 코드 · 마이그레이션 · DB · 운영 API 는 건드리지 않았다. 유료 AI 호출 없음.
- 범위를 넓히지 않았다. 새로 읽은 코드는 개념 백지 계약 · 은행 색인 · 합치기, 탐험 카드 목록 · 시작 동작 · 교사 보기, 선수 그래프의 시범 범위, 학생 관문의 경로 문법뿐이다.

## 0. 요지

지금 제품에는 «개념»을 가리키는 말이 **다섯** 있고 서로 이어져 있지 않다. 공통 개념 id 는 없다(§1). 교재의 개념을 이름이나 id 모양으로 다른 것과 «같다»고 치면 틀린 연결이 조용히 생긴다.

리드 통합안의 방향에 동의한다. 이 문서는 그 절을 구현할 수 있는 **정확한 계약**으로 적는다.

1. **교재의 개념은 행이다.** 블록은 `conceptKey` 로 그 행을 가리킨다(문항 블록이 배치를 가리키는 것과 같은 꼴). 새 표 `textbook_concept`.
2. **연결은 사람이 확인한 것만 연결이다.** 서버는 후보를 올릴 뿐이고 이름을 견주지 않는다(§4).
3. **백지는 정확히 고른 항목으로 만든다.** 개념 백지의 고르기 계약에 선택 칸 하나(`pick`)를 더한다. 기존 저장본은 그대로 읽힌다(§3.3).
4. **발행하면 고른 항목의 내용이 그 판본에 굳는다.** 은행이 바뀌어도 발행본의 백지는 안 바뀐다. 굳은 것은 새 은행이 아니다(§3.4).
5. **학생의 백지 활동은 새 표 하나에 남는다.** `ProblemAnswer` 에 가짜 문항 id 로 넣지 않는다. 새 표 `textbook_concept_attempt`(§5).
6. **근거는 읽기만 한다.** 탐험의 도움 사유 · 시험지 채점 · 백지 확인을 개념 단위로 나란히 보인다. 합쳐서 점수로 만들지 않는다(§6).

새 표는 **둘**이다. v02 의 17개와 합쳐 19개다.

## 1. 확인한 사실

| #   | 사실                                                                                                                                                                            | 근거                                                                                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| G1  | 개념 백지 은행은 코드 데이터이고 네 갈래다: `concepts` · `ox` · `apply` · `figures`. 항목마다 `id` 와 `section`(`학년::대단원::소단원`)을 가진다                                | `src/contracts/conceptBlank.contract.ts:156-250` · `src/lib/concept-blank/bank/index.ts`                           |
| G2  | 그 `section` 열쇠는 교육과정 시드의 학년 · 대단원 · 소단원 글을 그대로 이은 것이다. DB `Unit` 도 같은 시드에서 온다                                                             | `src/lib/concept-blank/sections.ts:1-40` · `prisma/seed-data/units.ts`                                             |
| G3  | 저장한 개념 백지는 **고르기만** 담는다. 고르기는 소단원 · 형식 · 난이도별 수이고 항목을 지목하는 칸이 없다. 지면은 `composeSheets(고르기, 은행)` 이 그때의 은행에서 다시 짓는다 | `conceptBlank.contract.ts:270-300` · `src/lib/concept-blank/compose.ts:87`                                         |
| G4  | 인쇄 지면 컴포넌트는 합쳐진 지면 모델(`sheets`)만 받는다. 은행을 직접 읽지 않는다                                                                                               | `src/app/(main)/concept-blank/print/page.tsx`                                                                      |
| G5  | 지면 코드는 고르기와 20비트 은행 지문을 싣는다. 내용을 싣지 않는다. 한 줄 정원(60자)을 넘는 코드는 찍지 않는다                                                                  | `conceptBlank.contract.ts:303-330` · `src/components/concept-blank/paper/paginate.ts` (`SHEET_CODE_LINE_CAPACITY`) |
| G6  | 탐험 카드는 230장 · 46단원이고 id 는 `g3-place` 꼴이다. 단원(`g5-fractions`)은 코스의 장(`5-1-4`)에 손으로 이어져 있다 — 초등만, «제목 유사도가 아니고 숙달의 근거도 아니다»    | `src/lib/math-explorers/definition-cards.ts:356-376` · `curriculumBridge.ts:3-34`                                  |
| G7  | 개념의 갈래(정의 · 성질 · 공식 · 방법 · 법칙 · 정리 · 단위)는 탐험과 개념 백지가 **같은 표**를 쓴다                                                                             | `src/lib/math-explorers/conceptKinds.ts:14-23` · `conceptBlank.contract.ts:2 · 160`                                |
| G8  | 탐험을 시작하는 동작은 진행 중인 도전이 있으면 **새로 시작하지 않는다**(«진행 중인 도전을 이어가요»). 미해결이 남은 도전도 같다. 카드 하나를 겨냥한 길(`repair`)이 이미 있다    | `src/lib/math-explorers/definition-cards.ts:693-712 · 424-463`                                                     |
| G9  | 학생의 탐험 요청은 `handleExplorerRequest` 가 받고 기록은 `changeSrsState` 가 CAS 로 쓴다                                                                                       | `src/lib/math-explorers/routes.ts:182` · `src/lib/math-srs/serverStore.ts:67`                                      |
| G10 | 학생 첫 화면(`/learn`)이 받는 주소 값은 `view=collection` 하나다                                                                                                                | `src/app/learn/page.tsx:10-21`                                                                                     |
| G11 | 선수 그래프는 편집 단원 100개의 그래프이고, 제품에 이어진 것은 간선 **한 줄**의 시범이다. 환경변수로 켠다. «소단원 선수 그래프가 아니다»                                        | `src/lib/math-prerequisite/mapping.ts:1-30` · `graph.ts:36` · `enabled.ts`                                         |
| G12 | 교사는 탐험 기록을 이미 본다: 반 요약과 학생 상세. 도움 사유 다섯에 관련 **카드 id** 가 실리고 문턱에는 정책 판 번호가 있다. 문항 글 · 보기 · 학생이 고른 답은 싣지 않는다      | `src/contracts/mathExplorersTeacher.contract.ts:1-60` · `src/lib/math-explorers/teacherSummary.ts:35-55`           |
| G13 | 개념 강의와 문항은 DB `Unit` 에 걸린다                                                                                                                                          | `prisma/schema.prisma:486-514 · 725-745`                                                                           |
| G14 | 학생 허용 목록의 경로 문법은 글자 `{id}` 만 한 칸으로 바꾼다. `{slug}` 라고 적으면 글자 그대로 견줘 **아무 주소도 안 열린다**                                                   | `src/lib/routeAccess.ts:114-127`                                                                                   |

«개념»을 가리키는 말 다섯:

| 말                 | 열쇠                       | 어디에 | 지금 이어진 것                                       |
| ------------------ | -------------------------- | ------ | ---------------------------------------------------- |
| 차시               | `Unit.id`(UUID)            | DB     | 강의 · 문항 · 진도가 여기 걸린다                     |
| 개념 백지의 항목   | 갈래 + `id` + `section`    | 코드   | `section` 글이 차시의 세 글과 같은 시드에서 온다(G2) |
| 탐험 카드          | `g5-common-denominator` 꼴 | 코드   | 단원이 코스의 장에 손으로 이어져 있다(초등만)        |
| 코스 소단원        | `5-1-4-3` 꼴               | 코드   | 탐험 단원과 이어져 있다                              |
| 선수 그래프의 단원 | `E56-N04` 꼴               | JSON   | 시범 한 줄                                           |

## 2. 원칙

1. **공통 개념 id 를 새로 만들지 않는다.** 교재의 개념이 다섯을 **가리킨다.** 갈래 이름과 실제 id 를 그대로 적는다.
2. **이름 · id 모양으로 같다고 치지 않는다.** `term` 이 같아도, id 가 닮아도(`e5-1-4-3-c1` 과 `5-1-4-3`) 연결이 아니다.
3. **은행을 복제하지 않는다.** 교재의 긴 설명 · 대화는 교재 원고다. 발행본에 굳힌 항목은 그 판본만 읽는 확정본이지 고를 수 있는 은행이 아니다.
4. **숙달을 지어내지 않는다.** 보이는 것은 사실(수 · 날짜 · 사유 코드 · 교사의 표시)과 «후보»다. 책 열람 · 영상 시청 · 종이 제출은 탐험의 정답이 아니다.
5. **선수 간선을 만들지 않는다.** 교재는 그래프에 간선을 더하지 않고 시범의 정책 · 근거 · 공급 모듈을 부르지 않는다. 교재의 개념끼리도 선수 칸을 두지 않는다 — 선수 개념은 원고의 글(`body.prerequisites`)로만 적는다. 다른 갈래와의 관계는 같음 · 일부 · 관련뿐이다.
6. **기존 기록을 덮어쓰지 않는다.** 탐험의 진행 중인 도전 · 목표 · 보상 · 복습 기한은 기존 동작이 정한다(G8).

## 3. 계약과 표

### 3.1 계약 (v02 의 `textbookExchange.contract.ts` 에 더하는 명시적 타입)

```ts
type ConceptKind = "정의" | "성질" | "공식" | "방법" | "법칙" | "정리" | "단위"; // 기존 CONCEPT_KINDS 를 import 한다
type BlankEntryKind = "concept" | "ox" | "apply" | "figure";

/** 개념 백지 은행의 항목 하나 — 갈래와 id 를 같이 적는다 */
interface BlankItemRef {
  sectionKey: string;
  entryKind: BlankEntryKind;
  entryId: string;
}

/** 다른 갈래를 가리키는 말 — 갈래 이름과 실제 id */
type ConceptRef =
  | { system: "explorer-card"; cardId: string }
  | { system: "course-section"; sectionId: string } // 참조만. 근거를 만들지 않는다
  | { system: "graph-unit"; graphUnitId: string }; // 참조만. 간선을 만들지 않는다

interface Review {
  status: "candidate" | "confirmed" | "rejected";
  candidateRule: "unit-triple" | "bridge" | "manual";
  reviewedBy: Id | null;
  reviewedAt: IsoDateTime | null;
  /** 확정할 때 서버가 계산한 대상 내용의 해시 */
  targetHash: Sha256 | null;
}

interface TextbookConcept {
  conceptKey: string; // 판본 안에서 유일 — conceptLectureRefs · 개념 QR 이 쓰는 열쇠
  unitKey: string;
  sectionKey: string | null; // 개념 블록이 놓인 구획
  title: string;
  kind: ConceptKind;
  unitId: Id | null; // 이 개념의 차시
  body: {
    // 교재 원고 — 전부 Markdown+LaTeX
    goal: string;
    prerequisites: string[];
    definition: string;
    conditions: string | null;
    examples: string[];
    counterexamples: string[];
    misconceptions: string[];
    explainPrompt: string | null;
  };
  blankItems: Array<BlankItemRef & { review: Review }>; // 이 개념의 백지 — 순서가 지면의 순서다
  links: Array<{
    linkId: Id;
    target: ConceptRef;
    relation: "same" | "covers-part" | "related";
    review: Review;
  }>;
  mappingVersion: number;
  derivedFromConceptKey: string | null;
  /** 발행 확정 때 서버가 채운다. 초안에서는 null (§3.4) */
  frozen: ConceptFrozen | null;
}

// 블록 · 배치 · 교환 패키지에 더하는 것
type ConceptBlock = { blockId: Id; kind: "concept"; conceptKey: string }; // ManuscriptBlock 에 갈래 하나를 더한다
type ItemConceptKeys = { conceptKeys?: string[] }; // TextbookItem 에 더하는 칸 — 이 문항이 연습하는 개념
type ExchangeConceptIntegration = {
  conceptIntegration?: { version: 1; concepts: TextbookConcept[] }; // TextbookExchange 에 더하는 선택 칸
};
```

검증 조건:

- 전부 `strictObject`. 모르는 갈래(`system` · `entryKind`)는 거절한다.
- `conceptKeys` · `conceptLectureRefs[].conceptKey` · `concept` 블록의 `conceptKey` 는 그 판본의 개념이어야 한다. 없는 열쇠를 건너뛰지 않는다.
- `confirmed` 는 `reviewedBy` · `reviewedAt` · `targetHash` 가 다 있어야 한다.
- 한 개념 안에서 같은 대상은 한 번만.
- `conceptIntegration` 은 있을 때 `manifestHash` 에 들어간다.

**교환 계약 v1 과의 호환** — `conceptIntegration` 을 선택 칸으로 더하는 것은 세 조건에서 호환된다.

1. **없으면 적지 않는다.** `conceptIntegration` 과 문항의 `conceptKeys` 는 없을 때 빠진 채로 둔다. 읽으면서 빈 값으로 채우지 않는다. 채우면 정규 JSON 이 달라져 옛 패키지의 해시가 바뀐다.
2. **모르면 거절한다.** 이 칸이나 `concept` 블록을 모르는 도구는 버리지 않고 거절해야 한다(지시서 03 §3).
3. **발행은 요구한다.** `concept` 블록이 하나라도 있으면 `conceptIntegration` 이 있어야 하고 블록마다 그 안의 개념을 가리켜야 한다. 옛 패키지(개념 블록 없음)는 그대로 유효하다.

### 3.2 표 (초안 — 적용 금지)

```sql
-- 교재의 개념 — 판본 속 개념 하나
CREATE TABLE "textbook_concept" (
  "edition_id" UUID NOT NULL REFERENCES "textbook_edition"("id") ON DELETE CASCADE,
  "concept_key" VARCHAR(60) NOT NULL,
  "unit_key" VARCHAR(40) NOT NULL,
  "section_id" UUID REFERENCES "textbook_section"("id") ON DELETE SET NULL,   -- 개념 블록이 놓인 구획. NULL = 아직 안 놓았다
  "title" VARCHAR(120) NOT NULL,
  "kind" VARCHAR(8) NOT NULL CHECK ("kind" IN ('정의','성질','공식','방법','법칙','정리','단위')),
  "unit_id" UUID REFERENCES "unit"("id") ON DELETE RESTRICT,
  "body" JSONB NOT NULL CHECK (jsonb_typeof("body") = 'object'),
  "blank_items" JSONB NOT NULL DEFAULT '[]' CHECK (jsonb_typeof("blank_items") = 'array'),
  "links" JSONB NOT NULL DEFAULT '[]' CHECK (jsonb_typeof("links") = 'array'),
  "mapping_version" SMALLINT NOT NULL,
  "derived_from_concept_key" VARCHAR(60),
  "frozen" JSONB,
  "revision" INTEGER NOT NULL DEFAULT 1 CHECK ("revision" > 0),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  PRIMARY KEY ("edition_id", "concept_key")
);
CREATE INDEX ON "textbook_concept"("unit_id");

-- 학생의 백지 활동 — 발행본의 개념 하나에 대한 한 번
CREATE TABLE "textbook_concept_attempt" (
  "id" UUID PRIMARY KEY,
  "edition_id" UUID NOT NULL,
  "concept_key" VARCHAR(60) NOT NULL,
  "student_id" UUID NOT NULL REFERENCES "student"("id") ON DELETE CASCADE,
  "mode" VARCHAR(16) NOT NULL CHECK ("mode" IN ('student-text','teacher-observed')),
  "responses" JSONB CHECK ("responses" IS NULL OR jsonb_typeof("responses") = 'array'),
  "request_id" VARCHAR(64) NOT NULL,
  "recorded_by" UUID REFERENCES "user"("id") ON DELETE SET NULL,
  "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "marks" JSONB CHECK ("marks" IS NULL OR jsonb_typeof("marks") = 'array'),
  "reviewed_by" UUID REFERENCES "user"("id") ON DELETE SET NULL,
  "reviewed_at" TIMESTAMP(3),
  "revision" INTEGER NOT NULL DEFAULT 1 CHECK ("revision" > 0),
  FOREIGN KEY ("edition_id", "concept_key") REFERENCES "textbook_concept"("edition_id", "concept_key") ON DELETE RESTRICT,
  UNIQUE ("student_id", "request_id"),
  CHECK (("mode" = 'student-text') = ("responses" IS NOT NULL)),
  CHECK (("marks" IS NULL) = ("reviewed_at" IS NULL))
);
-- «종이 활동을 본 교사»(recorded_by)가 있어야 한다는 것은 앱이 지킨다 — 계정이 지워지면 이 칸이 비므로 CHECK 로 걸지 않는다
CREATE INDEX ON "textbook_concept_attempt"("edition_id", "concept_key", "student_id", "submitted_at");
CREATE INDEX ON "textbook_concept_attempt"("student_id", "submitted_at");

-- v02 ⑤ 배치에 칸 하나
--   "concept_keys" JSONB NOT NULL DEFAULT '[]' CHECK (jsonb_typeof("concept_keys") = 'array')
-- v02 ⑪ QR 대상(kind = 'concept')에 FK
--   FOREIGN KEY ("edition_id", "concept_key") REFERENCES "textbook_concept"("edition_id", "concept_key") ON DELETE RESTRICT
```

- v02 의 «발행 판본의 자식은 못 고친다» 트리거를 `textbook_concept` 에 건다. 발행본의 개념 행이 곧 **개념 확정본**이다 — 통합안의 `conceptSnapshotId` 는 발행본의 `(edition_id, concept_key)` 다. 확정본 표를 따로 두지 않는다.
- `textbook_concept_attempt` 은 발행본의 개념만 가리킨다(초안이면 앱이 거절). 교사의 표시(`marks`)는 뒤에 붙으므로 이 표는 고칠 수 있다. 개념 행은 RESTRICT 로 지켜진다.
- 갈래 CHECK 의 글자는 `CONCEPT_KINDS` 와 같다. 가드 시험이 둘을 견준다.
- 둘 다 새 표 마이그레이션 (가)에 들어간다. 묶음은 늘지 않는다.
- 🔴 **v02 의 표 초안에서 고칠 것 — 구획의 정체.** `sectionKey` 는 판본 전체가 아니라 (판본, 단원) 안에서만 유일하다(리드 확인). v02 §3.2 ③ 은 `(edition_id, section_key)` 를 PK 로 적었다. 구획에 UUID `id` 를 두고 `UNIQUE (edition_id, unit_key, section_key)` 로 고친다. 배치와 개념은 구획의 `id` 를 가리킨다. 교환 계약은 그대로 `unitKey` + `sectionKey` 를 쓴다.

**왜 개념이 블록의 칸이 아니라 행인가.** 통합안은 연결 칸을 개념 블록에 둔다고 적었다. 행으로 두기를 권한다. 개념 QR 이 가리킬 행이 필요하다. 연결 검토가 원고 자동 저장과 같은 CAS 를 다투지 않는다. 근거를 모을 때 구획 150개의 JSON 을 뒤지지 않는다. 블록은 `conceptKey` 만 갖는다.

**왜 활동 표가 필요한가.** 기존 자리 어디에도 정직하게 들어가지 않는다. `ProblemAnswer` 는 실제 문항 id 가 있어야 한다. 탐험 기록(`student_srs_state`)은 학생이 쓰는 한 덩이 JSON 이고 교사가 쓰는 칸이 없다.

### 3.3 개념 백지 고르기에 더하는 칸

통합안이 정한 것이다: «이 개념으로 백지 만들기»에는 같은 항목만 들어간다. 지금 고르기로는 안 된다(G3). 더하는 것은 선택 칸 하나다.

```ts
// conceptBlankSelectionSchema 에 더한다
pick: z.strictObject({
  concepts: z.array(idSchema).max(60),
  ox: z.array(idSchema).max(60),
  apply: z.array(idSchema).max(60),
  figures: z.array(idSchema).max(20),
}).optional();
```

- `pick` 이 없으면 지금과 한 글자도 다르지 않게 돈다. 기존 저장본 · 기존 주소(`?s=`)는 그대로다.
- `pick` 이 있으면 `composeSheets` 는 **그 id 들을 그 순서로** 쓴다. 난이도별 수는 쓰지 않는다. 은행에 없는 id 는 오류다 — 조용히 빼지 않는다. 지금 길은 모르는 소단원 열쇠를 소리 없이 뺀다(`orderedSections` — 리드 쪽 확인). `pick` 길에서는 그것도 오류다. `sections` 는 고른 항목의 소단원과 같아야 한다.
- `composeSheets` 가 받는 은행은 인자다(G3). 발행본의 백지는 **굳힌 항목으로 지은 작은 은행**을 넘긴다. 같은 합치기 · 같은 지면 컴포넌트를 쓴다(G4).
- 지면 코드: `pick` 이 든 고르기는 한 줄 정원을 넘기 쉽다. 넘으면 기존 규칙대로 코드를 찍지 않는다(G5). 지면 코드 판은 올리지 않는다.
- 저장 계약이 `strictObject` 라 `pick` 을 모르는 옛 화면은 새 저장본을 **거절**한다(조용히 버리지 않는다). 서버와 화면이 같이 나가므로 열어 둔 옛 탭에서만 일어난다.

### 3.4 발행할 때 굳는 것

```ts
interface ConceptFrozen {
  mappingVersion: number;
  /** blankItems 가운데 confirmed 인 것 — 그 순서대로, 은행 항목 전체(본문 · 정답 · 그림 · givenCase) */
  blank: Array<{
    entryKind: BlankEntryKind;
    entry: ConceptEntry | OxItem | ApplyItem | FigureItem;
  }>;
  /** confirmed 연결의 대상 — 이름과 해시 */
  links: Array<{
    target: ConceptRef;
    relation: string;
    label: string;
    targetHash: Sha256;
  }>;
  sha256: Sha256; // 위 둘과 body 의 정규 해시
}
```

- 확정 트랜잭션이 채운다(v02 §6.3 — 상태를 바꾸기 전에). 항목은 기존 strict 스키마(`conceptEntrySchema` 외 셋)를 통과한 것만 넣는다.
- 굳히는 것은 **내용**이다. 고르기만 저장하거나 20비트 지문을 내용 대신 쓰지 않는다(G5).
- 탐험 카드는 굳히지 않는다. 학생 앱에서 도는 것이라 내용이 판본에 묶이지 않는다. 이름과 해시만 적는다. 해시는 보정된 카드 목록(`definitionCards`)의 항목으로 계산한다 — 보정 전 목록(`definitionSourceCards`)이 아니다.
- 새 판본을 만들면 `blank_items` 와 `links` 가 따라오고 `frozen` 은 비운다. 은행이 그사이 바뀐 항목은 §4 의 «바뀜»으로 보인다.

## 4. 후보와 확정

서버가 후보로 올리는 규칙은 **둘**이다. 둘 다 이름을 견주지 않는다.

- **`unit-triple`**: 개념에 차시가 있으면, 그 차시의 `학년::대단원::소단원` 과 `section` 이 **글자 그대로 같은** 개념 백지 항목을 후보로 올린다(G2). 그 소단원의 항목 전부가 후보일 뿐이다. 같은 소단원이라는 이유로 그 항목들을 이 개념으로 확정하지 않는다. 어느 것이 이 개념인지는 사람이 고른다.
- **`bridge`**: 개념에 확정된 코스 소단원 참조가 있으면, 기존 `curriculumBridge` 가 그 소단원에 이어 둔 탐험 단원의 카드 다섯 장을 후보로 올린다(G6). 초등만 된다.

그 밖은 사람이 고른다(`manual`). 중등의 탐험 카드, 다른 소단원의 백지 항목이 그렇다.

- 후보는 연결이 아니다. `confirmed` 로 바꾸는 것은 사람이고, 그때 서버가 대상의 지금 내용을 정규화해 해시를 적는다(v02 의 `c14n`).
- 편집 화면은 고른 백지 항목의 핵심 정의 · 조건 · 핵심어 · 예를 교재 원고 옆에 나란히 보인다. 다르게 쓴 것은 다르다고 보인다.
- 맞는 항목이 없으면 «연결할 개념 없음»으로 둔다. 다른 개념으로 대신하지 않는다.

**대상이 바뀌면.** 은행도 카드도 코드라 배포로 바뀐다. 대상마다 지금 해시를 다시 계산해 셋 가운데 하나로 보인다: 같음 · 바뀜 · 없어짐.

| 판본   | 바뀜                                        | 없어짐                              |
| ------ | ------------------------------------------- | ----------------------------------- |
| 초안   | 다시 확인하라는 표시. 다시 확정하면 새 해시 | 발행 사전 검사가 막는다             |
| 발행본 | 표시만. 백지는 굳힌 내용으로 나온다         | 표시만. 백지는 굳힌 내용으로 나온다 |

## 5. 고리 — 가르침 → 백지 → 같은 문제 → 복습 후보

| 걸음                   | 쓰는 기존 길                                    | 새로 생기는 것                                                      | 남는 근거                                                     |
| ---------------------- | ----------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------- |
| ① 가르친다             | 교재 지면 · 개념 강의(차시에 걸림) · 개념 QR    | 개념 행 · 블록 · QR 이 같은 `conceptKey` 를 쓴다                    | 강의 시청 기록(기존). 책 열람은 기록하지 않는다               |
| ② 백지로 떠올린다      | 개념 백지의 합치기와 지면(G3 · G4)              | `pick`(§3.3) · 발행본은 굳힌 항목으로 · 활동 표                     | `textbook_concept_attempt` — 학생이 쓴 글 또는 교사가 본 종이 |
| ③ 같은 문제로 연습한다 | 교재의 문항(확정본) · 시험지(반 또는 학생 하나) | v02 §6.5 재출제. 문항의 `concept_keys` 로 «이 개념의 문항»을 고른다 | 시험지 채점 기록                                              |
| ④ 기존 복습으로 간다   | 탐험의 시작 동작(G8 · G9)                       | 서버가 확인한 문맥에서 그 동작을 부른다(§5.2)                       | 탐험 기록(기존)                                               |
| ⑤ 교사가 후보를 본다   | 탐험의 교사 보기(G12) · 채점 기록               | §6 의 읽기                                                          | 저장하지 않는다                                               |
| ⑥ 다시 준다            | ② · ③ · v02 의 범위 배정                        | 없다                                                                | —                                                             |

### 5.1 백지 활동

| 누가 | 길                                                                 | 하는 일                                                                                                                                     |
| ---- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 교사 | `GET /api/textbook/editions/{eid}/concepts/{conceptKey}/blank`     | 초안이면 지금 은행으로, 발행본이면 굳힌 항목으로 지은 지면 모델. 인쇄 페이지는 `/textbook/editions/{eid}/concepts/{conceptKey}/blank/print` |
| 학생 | `GET /api/learn/textbook/q/{id}/blank`                             | 발행본 · 배정 범위 안일 때만. **정답을 걷어낸** 모양(아래)                                                                                  |
| 학생 | `POST /api/learn/textbook/q/{id}/attempts`                         | 글 응답. `requestId` 로 한 번만. `mode = student-text`                                                                                      |
| 교사 | `POST /api/textbook/editions/{eid}/concepts/{conceptKey}/attempts` | 종이 활동을 봤다는 기록. `mode = teacher-observed`                                                                                          |
| 교사 | `PATCH /api/textbook/attempts/{attemptId}`                         | 항목마다 ○ · △ · × 표시. `expectedRevision`                                                                                                 |

- 학생에게 가는 백지는 서버가 걷어낸다: 빈칸 문장의 핵심어 · ○× 의 답과 까닭 · 적용의 답 · 그림 이름표의 답 · 예의 답. 걷어내는 함수는 하나(`toStudentBlank`)이고 굳힌 항목에서만 만든다.
- 응답은 `[{ entryKind, entryId, text }]`. 글자 수 상한을 둔다. 그림 · 파일은 받지 않는다.
- 열린 답은 교사가 본다. 자동 채점도 AI 채점도 없다. 표시가 없는 활동은 «확인 전»이다.
- 학생이 쓴 글은 그 학생의 반을 맡은 교사만 읽는다(`requireOwnedStudent`). 탐험 교사 보기의 «학생이 고른 답을 싣지 않는다»는 탐험의 규칙이고 그대로다 — 이 표는 다른 기록이다.

### 5.2 기존 복습으로 가는 문맥

학생이 주소에 카드 id 를 적어 오는 길을 만들지 않는다. 문맥은 서버가 확인한다.

- `POST /api/learn/textbook/q/{id}/review` — 본문은 `requestId` 뿐이다.
- 서버가 확인하는 것: 학생 세션 · QR 이 발행본의 개념 대상 · 배정 범위 안 · 그 개념에 확정된 탐험 카드 연결이 있음.
- 통과하면 서버가 카드 id 를 정하고 **기존** 시작 동작(`repair` 길 · 그 카드)을 `handleExplorerRequest` 와 같은 통로로 부른다. 기록은 `changeSrsState` 의 CAS 를 탄다.
- 진행 중인 도전이 있으면 기존 동작이 새로 시작하지 않는다(G8). 응답은 «하던 탐험을 먼저 끝내요»이고 아무것도 바뀌지 않는다. 목표 · 보상 · 복습 기한을 이 길이 직접 쓰는 일은 없다.
- 응답 뒤 화면은 기존 `/learn/math-explorers` 로 간다. `/learn` 의 주소 값(G10)은 늘리지 않는다.
- 연결된 카드가 그 학생의 기록에 아직 없으면(탐험에서 만나지 않은 개념) 시작하지 않고 «아직 만나지 않은 개념»으로 알린다. 기록을 새로 만들지 않는다. 교재가 탐험의 수집 순서를 바꾸지 않는다(리드 확정).

학생 허용 목록에 더하는 글자(G14): `GET /api/learn/textbook/q/{id}/blank` · `POST /api/learn/textbook/q/{id}/attempts` · `POST /api/learn/textbook/q/{id}/review`.

## 6. 근거를 읽는 길

**하나다.** `GET /api/textbook/editions/{eid}/evidence` — `classId` 와 `unitKey` 로 반 화면을, `studentId` 로 학생 상세를 낸다.

- 문: `textbook` 메뉴 · 판본을 읽을 수 있음 · `requireOwnedClass` 또는 `requireOwnedStudent`. 탐험 부분은 기존 교사 끝점과 **같은 문지기**를 다시 지난다 — 교재 메뉴가 탐험 기록을 보는 새 길이 되지 않게. 못 지나면 그 부분만 `not-permitted` 다.
- 저장이 없다. 값은 순수 함수 하나(`src/lib/textbook/conceptEvidence.ts`)가 만든다. 탐험 부분은 기존 투영(`explorerTeacherSummary` · `explorerTeacherDetail`)의 결과를 연결된 카드로 **거르기만** 한다 — 문턱과 사유를 다시 구현하지 않는다.

```ts
interface ConceptEvidenceResponse {
  policy: { explorerFlagPolicy: number; evidencePolicy: 1 };
  concepts: Array<{
    conceptKey: string;
    title: string;
    links: { blankItems: number; explorerCards: number; changed: number };
    students: Array<{
      studentId: Id;
      name: string;
      blank:
        | { state: "no-record" }
        | {
            state: "record";
            mode: "student-text" | "teacher-observed";
            submittedOn: string;
            review:
              | "pending"
              | { o: number; triangle: number; x: number; reviewedOn: string };
          };
      tests:
        | { state: "no-record" }
        | {
            state: "record";
            attempted: number;
            incorrect: number;
            lastTakenOn: string;
          };
      explorer:
        | { state: "no-link" }
        | { state: "not-permitted" }
        | { state: "no-record" }
        | {
            state: "record";
            collected: number;
            linked: number;
            flags: Array<{
              code: "unresolved" | "review-stuck" | "overdue";
              date: string;
            }>;
          };
      candidate: {
        reasons: Array<"blank-marked" | "test-incorrect" | "explorer-flag">;
      } | null;
    }>;
  }>;
}
```

**후보 규칙(`evidencePolicy: 1`)** — 셋이고 «또는»이다.

- `blank-marked`: 가장 최근 백지 활동에 교사가 × 를 하나 이상 표시했다.
- `test-incorrect`: 이 개념의 문항이 든 시험지 가운데 그 학생의 가장 최근 채점에서 틀린 문항이 하나 이상이다.
- `explorer-flag`: 연결된 카드가 기존 사유 `unresolved` · `review-stuck` · `overdue` 에 들어 있다. `carried-over` · `idle` 은 카드에 걸린 사유가 아니라 쓰지 않는다.

**이 응답에 없는 것**: 문항 글 · 보기 · 탐험에서 학생이 고른 답 · 점수 · 숙달 단계 · 근거끼리 합친 수 · 반 평균. 「기록 없음」과 「0」은 다른 값이다. 운영에 채점 기록이 아직 없다고 문서에 적혀 있으므로(23번 문서) `tests` 는 대부분 `no-record` 로 나올 것이다. 그것이 맞는 답이다.

학생이 쓴 글 자체는 이 응답이 아니라 활동 하나를 여는 길(`GET /api/textbook/attempts/{attemptId}`)에서만 나간다.

후보는 교사에게 보이는 목록이다. 자동으로 배정하지 않는다. 교사가 다음에 누르는 것은 §5 의 ② · ③ · 범위 배정이고, 그 길마다 메뉴와 소유를 다시 확인한다. 넘기는 문맥은 `editionId` · `conceptKey` · `itemId` 다.

**거꾸로 읽는 길.** 개념 백지 화면과 교사 화면에서 «이 항목이 실린 교재»를 보인다. `GET /api/textbook/concept-refs` 에 소단원 열쇠(또는 갈래와 항목 id)를 준다. 보는 사람이 읽을 수 있는 발행본(자기 것과 지금 지점에 공유된 것)의 개념 가운데 그 항목을 **확정** 연결한 것만 낸다: 책 이름 · 판본 · 개념 이름 · 쪽. 문은 `textbook` 메뉴다. 메뉴가 없는 계정에는 개념 백지 화면이 이 줄을 그리지 않고 길도 거절한다. 개념 백지 모듈은 이 응답을 읽을 뿐 교재 모듈을 import 하지 않는다.

## 7. 하지 않는 것

- 공통 개념 id · 개념 통합 표.
- 이름 · `term` · 갈래 · id 모양이 같다는 이유의 연결.
- 굳힌 항목을 고를 수 있는 은행으로 쓰는 것. 굳힌 것은 그 발행본만 읽는다.
- 숙달 · 수준 · 종합 점수. 책 열람 · 영상 시청 · 종이 제출을 탐험의 정답으로 적는 것.
- 교재 개념끼리의 선수 간선 · 선수 그래프의 간선 추가 · 시범 범위 확대 · 시범 모듈(`policy` · `evidence` · `supply` · `courseIntegration`) 호출. 울타리 시험이 막는다.
- 탐험의 저장 기록 꼴 · 임무 · 별 경제의 변경. 교재는 기존 시작 동작 하나만 부른다.
- 백지 응답의 자동 채점. `ProblemAnswer` 에 백지 항목을 넣는 것.
- 후보의 저장 · 자동 배정 · 알림.

## 8. 받아들인 수정과 v02 에서 고칠 한 군데

리드가 받아들였다고 통지한 것을 이 문서가 그대로 따른다.

- **서버가 조판하고 이어 가는 발행**: 개념과 굳히기도 서버가 DB 의 정본에서 읽는다. 연결의 해시는 발행 사전 검사에서 다시 계산한다.
- **DB 트리거와 불변 바이트**: `textbook_concept` 도 자식 불변 트리거 아래에 둔다.
- **시험지 내용의 한 통로**(`contentOf` — 화면 · 인쇄 · 채점표 · 자동 채점 · 내보내기): §6 의 `test-incorrect` 는 `test_problem.snapshot_id` 로 «이 개념의 문항»을 찾는다.
- **보관본 다시 열기 ↔ 독립 사본**: 🔴 v02 §6.6 의 «패키지 안의 QR · 쪽 · 영상 연결은 가져오지 않고 무시한다»를 **철회한다.** 통합안의 규칙이 맞다. 보관본으로 열 때는 원래 id · manifest · 쪽 · QR · 영상 정보를 그대로 두고 읽기 전용으로 보인다. 새 원고로 복사하는 것은 다른 동작이고 새 id 와 id 이동표를 남긴다. 개념도 같다: 다시 열면 `conceptKey` · 연결 · 굳힌 내용이 그대로이고, 사본에서는 연결이 `candidate` 로 내려간다 — 다른 계정이 확인한 것을 내 확인으로 치지 않는다.
- **학생 경로의 `{id}`**: 허용 목록에는 `/q/{id}` · `/api/learn/textbook/q/{id}` · `/api/learn/textbook/q/{id}/assets/{id}` 로 적는다(G14). v02 §7.2 표의 `{slug}` 는 이 글자로 읽는다.

## 9. 풀리지 않은 것

| #   | 내용                                                                                                           | 지금의 처리                                                                                        |
| --- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| U1  | `pick` 이 든 지면의 지면 코드                                                                                  | 정원을 넘으면 찍지 않는다(기존 규칙). 사진 채점이 이 지면을 읽어야 하게 되면 그때 코드 판을 올린다 |
| U2  | 중등 탐험 카드의 후보 규칙이 없다                                                                              | 사람이 고른다                                                                                      |
| U3  | 학생 기록에 없는 카드로 복습을 시작하는 것                                                                     | 정해졌다(리드): 시작하지 않고 «아직 만나지 않은 개념»으로 알린다. 기록을 새로 만들지 않는다        |
| U4  | 학생이 글로 백지를 쓰는 화면                                                                                   | 계약과 표는 이 문서에 있다. 화면은 시안 대상이다. 종이 확인(`teacher-observed`)은 화면 없이도 선다 |
| U5  | 운영에 채점 기록이 없다(문서 기준 — 직접 확인 못 함)                                                           | `no-record` 로 나온다                                                                              |
| U6  | 거꾸로 보기 — 개념 백지 · 탐험 화면에서 «이 개념이 실린 교재 쪽»                                               | 범위에 든다(리드). §6 의 거꾸로 읽는 길로 낸다. 화면의 자리만 시안이 정한다                        |
| U7  | 학생이 쓴 글의 보관 기간                                                                                       | 학생을 지우면 같이 지워진다. 그 밖의 기한은 정해지지 않았다                                        |
| U8  | 교환 계약 v1 에 더한 칸(`conceptIntegration` · `conceptKeys` · `concept` 블록)을 바깥의 v15 스튜디오가 읽을 때 | 계약 파일 한 곳의 명시적 확장이다. 바깥 도구는 모르는 칸을 거절해야 맞다                           |
| U9  | 차시가 없는 개념                                                                                               | `unit_id` 를 비운다. `unit-triple` 이 돌지 않고 전부 사람이 고른다                                 |

## 10. 시험 (이 문서가 더하는 것만)

- 계약: 모르는 갈래 거절 · 개념끼리의 선수 칸이 오면 거절(계약에 없는 칸) · 없는 `conceptKey` 거절 · `confirmed` 인데 검토 칸이 비면 거절 · 같은 대상 두 번 거절.
- 후보: 세 글이 같은 항목만 올라온다 · `term` 이 같고 소단원이 다른 항목은 **안** 올라온다 · 올라온 것은 전부 `candidate` 다 · 중등 개념에는 `bridge` 가 아무것도 올리지 않는다.
- 고르기: `pick` 이 없는 고르기의 지면이 지금과 같다(기존 시험 그대로 초록) · `pick` 의 순서가 지면의 순서다 · 은행에 없는 id 는 오류다.
- 굳히기: 발행 뒤 은행 항목을 고쳐도 발행본의 백지가 같다 · 발행본의 개념 행 UPDATE 는 트리거가 거절한다 · 새 판본은 «바뀜»을 보인다 · 없어진 항목은 초안의 사전 검사가 막는다.
- 활동: 같은 `requestId` 두 번은 한 줄 · 배정 밖 학생은 403 · 초안의 개념에는 거절 · 학생용 백지 응답에 답 칸 0(굳힌 항목의 답을 표지 글자로 심는다) · 다른 반 교사는 글을 못 읽는다.
- 복습 문맥: 진행 중인 도전이 있으면 탐험 기록이 한 글자도 안 바뀐다 · 기록에 없는 카드는 시작하지 않는다 · 주소에 카드 id 를 실어 보내도 무시한다 · 같은 `requestId` 는 한 번.
- 근거: 응답 키 이름을 잠근다 · `no-record` 와 0 이 갈린다 · 남의 반은 403 · 탐험 문지기를 못 지나면 `not-permitted` · 후보 사유 셋이 각각 선다 · `carried-over` 만 있는 학생은 후보가 아니다.
- 거꾸로 읽기: 읽을 수 없는 판본의 개념은 안 나온다 · 후보 · 거절 상태의 연결은 안 나온다 · 메뉴가 없으면 403.
- 울타리: 교재 모듈이 선수 시범 모듈을 import 하지 않는다 · 개념 백지와 탐험이 교재를 import 하지 않는다.
- 가드: 갈래 CHECK 의 값이 `CONCEPT_KINDS` 와 같은 글자다.
- 학생 관문: `{id}` 로 적은 규칙이 실제 주소를 연다 · `{slug}` 로 적은 규칙은 안 연다(변이).

## 11. 화면 구조 표결 (W1~W4 · PC 1280 과 휴대폰 390)

**W3**(왼쪽 원고 · 오른쪽 계산된 펼침)이다. 휴대폰 화면을 본 뒤에도 같다.

- 두 칸이 모델의 두 가지 자료와 같다: 사람이 고치는 원고(구획마다 CAS)와 시스템이 계산하는 지면(직접 못 고친다). W3 는 이 구분을 화면마다 지킨다.
- PC 화면에서 «빈 쪽 없이 충돌로 남긴다»를 보여 주는 것은 W3 뿐이다.
- W2 는 편집 단위가 펼침면이다. 저장 · 충돌의 단위는 구획이고 펼침면 하나에 두 구획이 걸칠 수 있다.
- W2 · W4 의 PC 화면은 양식이 위, 펼침이 아래로 같은 꼴이다. 양식이 펼침을 화면 밖으로 민다.
- W1 은 세 칸을 고정해 쪽 하나가 200px 쯤이다.
- 휴대폰 네 장은 사실상 같은 화면이다. 양식 카드가 잘리고 그 아래 펼침의 왼쪽 쪽만 보인다. W1 은 목차 카드가 그 위에 더 얹힌다. 넷 다 이대로는 못 쓴다.
- W3 에 붙이는 조건:
  - 휴대폰은 두 탭(원고 / 미리보기). 두 칸을 한 화면에 욱여넣지 않는다.
  - 구획 목차는 접히는 레일(휴대폰은 시트). W1 에서 가져온다.
  - 목차의 이름은 수업 단계로. W4 에서 가져온다. 단계 밖 쪽을 감추는 규칙은 가져오지 않는다.
  - 넓게 보는 미리보기. 쪽 하나 230px 로는 행과 기준선 정렬을 못 본다.
  - 오른쪽은 «미리보기»라고 적는다. 발행 때는 서버가 조판한 쪽을 보인다.

이 문서가 더하는 화면 요구는 둘이다. 개념 블록 옆의 «연결» 자리(후보 · 확정 · 바뀜)는 W3 의 왼쪽 원고 칸에 든다 — 연결은 사람이 고치는 쪽이다. 근거 보기(§6)는 편집 화면이 아니라 반 · 학생을 고르는 따로 선 화면이다.

## 12. 리드 통합안 v03 에 대한 표결

**승인.** 대상은 `textbook-studio-20261003.md`, SHA-256 `60a508c008ea24abfcb8b361f3c639fbc19a80147ff404c045db9eb9cbb40702`(123줄 · 27,328바이트)다. 해시를 직접 다시 계산했고 전문을 읽었다. 코디네이터에게 따로 보냈다.

- 막는 사유가 없다. 범위와 동작이 v02 의 수정 요청(C1~C7 · 시험지 내용의 한 통로 · 서버가 이어 가는 조판 · 보관본 보존과 사본의 구분)과 같고, 통합 절은 이 문서가 코드에서 확인한 사실과 맞는다.
- 아래 여섯은 합의한 동작을 바꾸지 않는다. P1 의 계약 검토에서 정하면 된다.

| #    | 통합안의 자리                                                      | P1 에서 정할 것                                                                                                  |
| ---- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| P1-1 | «교재의 각 개념 블록에 … 연결 상태 · 검수 출처 · 매핑 버전을 둔다» | 저장 꼴. 블록은 `conceptKey` 만 갖고 연결은 개념 행에 두기를 권한다(§3.2). 발행본의 개념 행이 곧 개념 확정본이다 |
| P1-2 | 구획의 정체                                                        | `sectionKey` 는 (판본, 단원) 안에서만 유일하다. v02 표 초안의 PK 를 고친다(§3.2 끝)                              |
| P1-3 | 교환 계약 v1 의 `conceptIntegration` 확장                          | 호환된다 — 조건 셋(§3.1 끝). 핵심은 «없으면 적지 않는다»다                                                       |
| P1-4 | «정확한 항목 ID/순서 선택»                                         | `pick` 이 든 지면은 지면 코드를 찍지 않는다고 적는다(§3.3 · U1)                                                  |
| P1-5 | «서버가 배정/연결을 확인한 학습 문맥»                              | 정해졌다(리드): 연결된 카드가 학생 기록에 없으면 시작하지 않고 그렇게 알린다. 기록을 새로 만들지 않는다(§5.2)    |
| P1-6 | 학생이 쓴 글                                                       | 보관 기간(U7)                                                                                                    |
