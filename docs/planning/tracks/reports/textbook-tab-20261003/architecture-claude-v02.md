# 교재 제작 탭 — 구조 검토 v02 (Claude · 계획 검토 단계)

- 읽은 것: `D:/tmp/textbook-tab-20261003/user-packet/` 의 네 문서(00 · 01 · 02 · 03, 지시서 1.0) 전부. 리드 통합안 `textbook-studio-20261003.md`(루트 워크트리, 14:17 판과 그 뒤 통지 셋).
- 앞선 보고서: `architecture-claude.md`(`d3c44e56e`). 그 보고서의 코드 사실(E1~E21)은 그대로 쓴다. 이 문서는 **지시서가 바꾸는 것**을 다시 설계하고, 리드 통합안에 붙일 «계약 · 발행기 모델» 부록 노릇을 한다.
- 기준: `main` = `2cb791dce`. 제품 코드 · 마이그레이션 · DB · 운영 API 는 건드리지 않았다. 유료 AI 호출 없음.
- 새로 읽은 코드: 문항 · 시험지 모델과 출제 자격, 외벽 트리거, 그림 저장, 채점이 정답을 읽는 자리, 서버 PDF 생성기, 학생 관문 · 로그인 · 재생기, 반 · 학생 소유 판정.

## 0. 요지와 표결

v01 은 «원고를 쓰고 인쇄하는 편집기»를 저장하는 모델이었다. 지시서는 다른 것을 요구한다. 책에 실린 문항이 **문제은행의 그 문항**이어야 하고, 발행한 판본은 **한 글자도 안 바뀌어야** 하고, 문항마다 **영구 QR** 이 그 판본의 그 문항과 **검수된 영상**으로 가야 한다. 그래서 v01 의 결론이 넷 바뀐다.

1. **모델의 단위가 «책 + 구획»에서 «책 → 판본 → 구획 · 배치 · 문항 확정본»으로 바뀐다.** 전용 표라는 방향은 유지하고, 새 표가 17개가 된다(§3).
2. **QR 과 문제은행 연동은 미루지 않는다.** v01 의 D6(«1차는 칸만»)과 D2(«엔진 · 자작만»)를 철회한다. 자격은 기존 출제 자격 규칙을 그대로 쓴다(§6.1).
3. **발행은 서버가 조판한다.** QR 예약 → 서버 조판 → 서버 검증 → 확정. 브라우저가 보낸 «통과» 표시는 어디에도 쓰지 않는다(§6.3).
4. **«교재와 같은 문제로 출제»는 살아 있는 문항이 아니라 확정본을 읽는다.** 기존 표에 생기는 유일한 변경이 여기 있다 — `test_problem` 의 nullable 칸 하나(§6.5).

새 AI 연동은 없다. 확정본 · 해시 · 연결 후보 찾기 · 발행 검사는 전부 결정적인 코드다.

원본 v15 소스 · 실제 영상 · 실물 인쇄 스캔은 손에 없다. 이 셋은 **바깥 검증 한계**로 따로 적었고(§12.2), 그 밖의 기능은 지금 저장소 위에서 구현할 수 있다.

**리드 통합안에 대한 표결: 조건부 승인.** 방향 · 범위 · 순서에 동의한다. §13 의 수정 요청 C1~C7 을 계획에 반영하는 것이 조건이다. 반영되지 않으면 «수정»이다.

## 1. 지시서가 v01 을 바꾸는 자리

| v01                                    | 지시서                                                                                                        | v02                                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 책 · 구획 · 구획 그림 연결의 표 셋     | 교재 → 판본(초안/발행) → 배치 → 문항 확정본, 발행본 불변 (01 §4 · 03 §1~2)                                    | 새 표 17개. 구획 CAS 는 유지, 판본에 집계 revision 을 더한다                                 |
| 은행 문항은 «사본 + 출처 메모»         | `Problem.id` · `problemCode` 그대로, 내용 · 정답 · 해설 · 도형의 확정본과 해시 (01 §3 · 03 §5)                | `textbook_problem_snapshot` — 만들 때부터 불변                                               |
| 들일 문항은 엔진 · 자작만 (D2)         | 기존 `reviewStatus` · `directUseAllowed` · 출제 풀 판단을 재사용, 제외는 사유를 보이고 임의 해제 금지 (01 §8) | `problemIneligibleReason` 그대로. 출처로 따로 거르지 않는다                                  |
| QR 은 1차에 칸만 (D6)                  | 문항별 영구 QR, 서버가 발급한 절대 HTTPS 주소, 가짜 QR 금지 (01 §6 · 02 §11)                                  | `textbook_qr_target` + `/q/{slug}`. 발행 프로토콜이 예약부터 한다                            |
| 영상은 `ConceptLecture` id 를 가리킨다 | 문제 해설영상은 확정본에 연결, 검수 · 게시 · 중지 상태, 개념 예습과 구분 (01 §5C · 03 §4)                     | `textbook_video` · `textbook_video_binding`. 개념 예습은 기존 강의를 가리키는 다른 종류의 QR |
| 학생 접근은 다루지 않음                | 교재 · 범위 배정, 진도와 별개, 로그인 뒤 복귀 (01 §6)                                                         | `textbook_assignment` + 학생 관문 + 복귀 주소 허용 목록                                      |
| 가져오기는 우리 형식 JSON              | `injaewon.textbook.exchange.v1` 공통 계약, ZIP · 오프라인 HTML · PDF · 매핑표 (03 §3~7)                       | 계약 파일 셋 + 정규 해시 모듈 + 조각 내보내기                                                |
| 그림은 `workspace_asset` 재사용        | 발행 시 승인된 저장 경로로 고정, 바이트 해시 검증, id 재발급 금지 (01 §8 · 03 §5)                             | 내용 해시가 열쇠인 불변 저장 `textbook_blob`                                                 |
| 인쇄는 브라우저 인쇄                   | 발행 PDF 의 해시와 manifest 를 서버가 확정, 클라이언트 성공 표시 불신 (03 §6)                                 | 서버 Chromium 이 구획 묶음 단위로 조판한다                                                   |
| 재출제는 다루지 않음                   | 발행본의 문항 내용으로 출제, 최신 문항으로 자동 치환 금지 (01 §5B)                                            | `test_problem.snapshot_id` + 내용 읽기의 한 통로                                             |
| 기준 원본 v14                          | **v15** — 학생용 259쪽 · 해설 87쪽 · 1,039문항 · 구획 71 · 개념영상 칸 23(실제 영상 없음)                     | 회귀 기준으로만 쓴다. 소스 회수는 Codex 몫                                                   |

v01 에서 그대로 유효한 것: 메뉴 CHECK 가 이미 어긋나 있다(E2) · 관문 두 줄(E7) · HTML/JS 금지와 한 KaTeX 경로(E14) · 구획 단위 쪽 나누기(§7) · 병합 세 걸음(§4) · KaTeX 비용 실측(E19).

## 2. 이번에 확인한 코드

| #   | 사실                                                                                                                                                                                                                         | 근거                                                                                                                    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| F1  | 문항에는 소유자가 없고(`userId` 는 전부 NULL 로 남긴 칸) 앱이 보는 풀은 `shared` 하나다. 벽은 `db` 확장이 `problem` 읽기에 씌운다                                                                                            | `prisma/schema.prisma:725-745` · `src/lib/problemVisibility.ts` · `src/lib/db.ts`                                       |
| F2  | 출제 자격은 한 파일이다: 공용 풀 · `approved` · `directUseAllowed` · 정답 있음. 사유 문구도 여기서 나온다                                                                                                                    | `src/lib/problemEligibility.ts`                                                                                         |
| F3  | 격리된 문항에 대한 **관계**는 DB 트리거가 막는다. `block_problem_relation_behind_outer_wall()` 이 `NEW."problem_id"` 를 격리 명부와 대조해 23514 를 낸다. 지금 `test_problem` · `problem_answer` 에 걸려 있다                | `prisma/migrations/20260824223000_register_quarantined_problem_corpus/migration.sql`                                    |
| F4  | 문항 코드는 저장값이고 `problem_code_freeze` 트리거가 UPDATE 를 막는다 — **트리거로 불변을 지키는 선례**다                                                                                                                   | `prisma/migrations/20260818210000_problem_code/migration.sql:905-920`                                                   |
| F5  | 시험지 문항은 `TestProblem(problemId, orderIndex)` 이고, 읽을 때 **지금의** `Problem` 을 같이 읽는다. 인쇄 당시 내용은 어디에도 남지 않는다                                                                                  | `prisma/schema.prisma:1027-1046` · `src/lib/tests/loadTestProblems.ts`                                                  |
| F6  | 채점도 지금의 정답을 읽는다                                                                                                                                                                                                  | `src/lib/testResults/gradeSheet.ts:236` · `src/lib/testResults/submitTestResult.ts:78`                                  |
| F7  | 시험지 문항 행을 다루는 제품 파일은 11개이고, 그 가운데 문항 **내용**을 읽는 것은 다섯이다(화면 · 인쇄 · 채점표 · 자동 채점 · 출제 응답)                                                                                     | grep 과 줄 확인 — §6.5 에 목록                                                                                          |
| F8  | `serializeProblem` 은 `figureUrls` · `figureSvg` 만 내보낸다. `figureDims` · `figureSourceMm` · `choiceFigureIndex` · `figureSource` 는 안 나간다                                                                            | `src/lib/serializers.ts:71-108`                                                                                         |
| F9  | 인쇄 지면은 DB 행에서 그림 칸 넷을 직접 받는다(`PRINT_FIGURE_FIELDS`). 초등 가분수는 **보일 때** 대분수로 바뀌고 DB 원문은 그대로다                                                                                          | `src/lib/print/toPrintProblem.ts`                                                                                       |
| F10 | 원본 그림 경로(`/figures/…`)는 **가변**이다. 배포 뒤 같은 경로가 다른 해시를 가리킬 수 있고, 실제 바이트는 `v1/<sha256>/…` 객체로 받아 해시를 검증한다                                                                       | `src/lib/sharedFigureAssets.ts` (`Cache-Control` 주석 · `manifestIndex` · `verifiedBytes`)                              |
| F11 | PNG · JPEG 머리에서 치수만 읽는 함수가 이미 있다                                                                                                                                                                             | `src/lib/printImageDimensions.ts`                                                                                       |
| F12 | 서버 PDF 생성기는 Chromium 을 띄우는 부분(`launchExportBrowser` — 로컬은 Chrome/Edge, 리눅스는 `chromium-min`)과 그 위의 `buildPdf`(받은 HTML · JS 끔 · 60초 · `/api/` 자원 차단)로 나뉘어 있다. 앞부분은 따로 내보내져 있다 | `src/lib/export/pdfServer.ts:35-64 · 74 · 115-158 · 161-188`                                                            |
| F13 | 함수 실행 한도를 300초로 올린 라우트가 이미 있다                                                                                                                                                                             | `src/app/api/tests/auto-draft/cron/route.ts:26`                                                                         |
| F14 | 시험지 · 반 · 학생의 소유는 `ownerIsInScope` 가 판정한다(본인 · 같은 지점의 관리자 · 최고관리자). 학생은 `userId` 가 없어 **반을 거쳐** 주인에 닿는다                                                                        | `src/lib/ownership.ts:28-136` · `src/lib/ownerScope.ts`                                                                 |
| F15 | 학생 세션에는 `user` 가 없다. 학생이 갈 수 있는 곳은 허용 목록이고, 목록 자체를 시험이 잠근다(`STUDENT_CAPABILITIES`)                                                                                                        | `src/lib/studentRouteAccess.ts` · `src/lib/learn/studentSession.ts`                                                     |
| F16 | 로그인 안 한 요청은 `/login?callbackUrl=…` 로 간다. 그런데 **학생 로그인은 그 주소를 버리고** 늘 `/learn`(첫 로그인은 `/learn/password`)으로 간다. 비밀번호를 바꾼 뒤에도 `/learn` 이다                                      | `src/proxy.ts:139-146` · `src/components/auth/AuthForm.tsx:115-118` · `src/components/learn/StudentPasswordForm.tsx:78` |
| F17 | 개념 강의는 «게시 · 주소 있음 · **진도에 있던 차시**»일 때만 열린다. 목록 · 하나 · 시청 기록 셋이 같은 판정 하나를 쓴다                                                                                                      | `src/lib/learn/lectureAccess.ts` · `src/app/api/learn/lectures/[id]/route.ts` · `src/app/api/learn/watch/route.ts`      |
| F18 | 재생기는 두 층이다. 아래층(`playerAdapter` · `youtubePlayer`)은 시작 초(`start`)를 받는 유튜브 nocookie 재생기이고, 위층(`LecturePlayer`)은 앞으로 감기 가드와 개념 강의 시청 기록에 묶여 있다. 끝 초는 없다                 | `src/components/learn/playerAdapter.ts` · `youtubePlayer.ts:107-119` · `LecturePlayer.tsx`                              |
| F19 | `/q` 로 시작하는 경로는 `src/app` 에도 `public` 에도 없다. 서비스의 정식 주소를 담는 환경변수는 `AUTH_URL` 뿐이다                                                                                                            | `ls src/app` · `ls public` · `.env.example:15`                                                                          |
| F20 | `pdfjs-dist` 는 의존성에 있다. ZIP · QR 만들기 · QR 읽기 · PDF 합치기 라이브러리는 없다                                                                                                                                      | `package.json:53` · grep 0건                                                                                            |

## 3. 데이터 모델

### 3.1 원칙

1. **발행본의 불변은 DB 가 지킨다.** 앱 코드의 약속만으로는 스크립트 · 다른 라우트 · 다음 사람의 실수를 못 막는다. 문항 코드가 그렇게 지켜지고 있다(F4).
2. **확정본은 만들 때부터 불변이다.** 초안 안에서도 고치지 않는다. 원문이 바뀌면 새 확정본을 만들고 배치가 가리키는 곳을 바꾼다.
3. **바이트는 내용 해시로만 부른다.** 경로 · 주소는 열쇠가 아니다(F10).
4. **기존 표의 변경은 nullable 칸 하나다.** 새 표와 새 트리거, 메뉴 CHECK 넓히기, 그리고 `test_problem.snapshot_id`(§6.5 — 따로 떼어 낸 마이그레이션).
5. **주인은 계정이다.** 지점 공유는 책 단위로 주인이 켠다(v01 §3.3 그대로).

### 3.2 표 (초안 — 적용 금지. 최종 SQL 은 구현 단계에서 따로 검토한다)

시각 칸은 저장소 관례대로 `TIMESTAMP(3)`, id 는 앱이 짓는 UUID 다. 모든 표에 RLS 를 켜고 정책 없이 `anon` · `authenticated` 권한을 걷는다(`20261002053000` 과 같은 꼴).

```sql
-- ① 책 — 정체성. 1판과 2판이 공유한다
CREATE TABLE "textbook" (
  "id" UUID PRIMARY KEY,
  "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
  "school_level" VARCHAR(12) NOT NULL CHECK ("school_level" IN ('elementary','middle','high')),
  "grade" SMALLINT NOT NULL CHECK ("grade" BETWEEN 1 AND 6 AND ("school_level" = 'elementary' OR "grade" <= 3)),
  "semester" SMALLINT NOT NULL CHECK ("semester" IN (1, 2)),
  "volume" SMALLINT NOT NULL CHECK ("volume" >= 1),
  "volume_count" SMALLINT NOT NULL CHECK ("volume_count" >= "volume"),
  "display_code" VARCHAR(16) NOT NULL,                 -- '2-1-1'
  "title" VARCHAR(120) NOT NULL,                       -- 목록용. 지면의 제목은 판본 config 에 고정된다
  "visibility" VARCHAR(20) NOT NULL DEFAULT 'private',
  "shared_branch_id" UUID REFERENCES "branch"("id") ON DELETE RESTRICT,
  "archived_at" TIMESTAMP(3),                          -- 목록에서 감추기. 지우는 대신 쓴다(§3.3)
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CHECK (("visibility" = 'private' AND "shared_branch_id" IS NULL)
      OR ("visibility" = 'branch' AND "shared_branch_id" IS NOT NULL))
);
CREATE INDEX ON "textbook"("user_id", "updated_at");
CREATE INDEX ON "textbook"("shared_branch_id", "visibility");

-- ② 판본 — 초안이거나 발행본이다. 발행본은 status 를 retired 로 바꾸는 것 말고는 못 고친다
CREATE TABLE "textbook_edition" (
  "id" UUID PRIMARY KEY,
  "textbook_id" UUID NOT NULL REFERENCES "textbook"("id") ON DELETE RESTRICT,
  "ordinal" INTEGER NOT NULL CHECK ("ordinal" >= 1),
  "label" VARCHAR(40) NOT NULL,
  "status" VARCHAR(12) NOT NULL DEFAULT 'draft' CHECK ("status" IN ('draft','published','retired')),
  "schema_version" VARCHAR(40) NOT NULL CHECK ("schema_version" = 'injaewon.textbook.exchange.v1'),
  "c14n_version" VARCHAR(40) NOT NULL CHECK ("c14n_version" = 'injaewon.textbook.c14n.v1'),
  "revision" INTEGER NOT NULL DEFAULT 1 CHECK ("revision" > 0),                    -- 집계: 판본 안의 모든 변경이 올린다
  "structure_revision" INTEGER NOT NULL DEFAULT 1 CHECK ("structure_revision" > 0), -- 설정 · 목차의 CAS
  "config" JSONB NOT NULL CHECK (jsonb_typeof("config") = 'object'),               -- TextbookConfig (제목 · 인쇄 · 영상 정책 …)
  "outline" JSONB NOT NULL CHECK (jsonb_typeof("outline") = 'object'),             -- 단원 → 구획 차례 · 목표 · 선수 · 개념 강의 참조
  "renderer_version" VARCHAR(40) NOT NULL,
  "template_version" VARCHAR(40) NOT NULL,
  "derived_from_edition_id" UUID REFERENCES "textbook_edition"("id") ON DELETE RESTRICT,
  "manifest_hash" CHAR(64),
  "manifest" JSONB,
  "published_at" TIMESTAMP(3),
  "retired_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  UNIQUE ("textbook_id", "ordinal"),
  CHECK (("status" = 'draft') = ("published_at" IS NULL)),
  CHECK (("status" = 'draft') = ("manifest_hash" IS NULL)),
  CHECK (("status" = 'draft') = ("manifest" IS NULL))
);
CREATE UNIQUE INDEX "textbook_edition_one_draft" ON "textbook_edition"("textbook_id") WHERE "status" = 'draft';

-- ③ 구획 — 원고 블록. 구획마다 CAS
CREATE TABLE "textbook_section" (
  "edition_id" UUID NOT NULL REFERENCES "textbook_edition"("id") ON DELETE CASCADE,
  "section_key" VARCHAR(40) NOT NULL,
  "unit_key" VARCHAR(40) NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "template_key" VARCHAR(40) NOT NULL,
  "start_policy" VARCHAR(12) NOT NULL CHECK ("start_policy" IN ('even-left','continue')),
  "content" JSONB NOT NULL CHECK (jsonb_typeof("content") = 'object'),             -- { blocks: ManuscriptBlock[] }
  "revision" INTEGER NOT NULL DEFAULT 1 CHECK ("revision" > 0),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  PRIMARY KEY ("edition_id", "section_key")
);

-- ④ 문항 확정본 — INSERT 뒤로 불변
CREATE TABLE "textbook_problem_snapshot" (
  "id" UUID PRIMARY KEY,
  "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
  "source_system" VARCHAR(16) NOT NULL CHECK ("source_system" IN ('todays-math','legacy-studio','studio-authored')),
  "source_key" VARCHAR(80) NOT NULL,                   -- 'tm:<problemId>' · 'legacy:<legacyId>' · 'studio:<localId>'
  "source_ref" JSONB NOT NULL,                         -- ProblemSourceRef 그대로 (문항 id · 코드가 여기 고정된다)
  "problem_id" UUID REFERENCES "problem"("id") ON DELETE SET NULL,   -- 지금 은행 문항과 견줄 때만 쓴다
  "source_updated_at" TIMESTAMP(3),
  "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "unit_id" UUID,
  "family_key" TEXT,
  "difficulty" VARCHAR(20),
  "problem_type" VARCHAR(20),
  "payload" JSONB NOT NULL CHECK (jsonb_typeof("payload") = 'object'),             -- ProblemPayload — 해시의 대상
  "raw_source" JSONB NOT NULL CHECK (jsonb_typeof("raw_source") = 'object'),       -- 원본 행의 그림 칸 그대로 — 해시 밖의 증거
  "content_hash" CHAR(64) NOT NULL,
  "c14n_version" VARCHAR(40) NOT NULL CHECK ("c14n_version" = 'injaewon.textbook.c14n.v1'),
  UNIQUE ("user_id", "source_key", "content_hash"),
  CHECK (("source_system" = 'todays-math') = ("source_key" LIKE 'tm:%'))
);
CREATE INDEX ON "textbook_problem_snapshot"("problem_id");

-- ⑤ 배치 — 판본 속 문항 한 자리. 같은 문항을 두 번 실으면 두 줄이다
CREATE TABLE "textbook_item" (
  "id" UUID PRIMARY KEY,
  "edition_id" UUID NOT NULL REFERENCES "textbook_edition"("id") ON DELETE CASCADE,
  "snapshot_id" UUID NOT NULL REFERENCES "textbook_problem_snapshot"("id") ON DELETE RESTRICT,
  "link_status" VARCHAR(12) NOT NULL CHECK ("link_status" IN ('unlinked','candidate','linked','needs-review')),
  "link_candidates" JSONB NOT NULL DEFAULT '[]' CHECK (jsonb_typeof("link_candidates") = 'array'),
  "source_test_id" UUID,                               -- 출처 기록. FK 를 걸지 않는다(시험지는 지워질 수 있다)
  "source_test_problem_id" UUID,
  "unit_key" VARCHAR(40) NOT NULL,
  "section_key" VARCHAR(40),                           -- NULL = 담아 두기만 했다
  "learning_stage" VARCHAR(20) NOT NULL CHECK ("learning_stage" IN ('preparation','worked-example','concept-check',
      'basic','type-practice','application','error-check','written','cumulative-review','unit-assessment')),
  "order_index" INTEGER NOT NULL DEFAULT 0,
  "layout" JSONB NOT NULL CHECK (jsonb_typeof("layout") = 'object'),
  "video_required" BOOLEAN,                            -- 문항별 정책 덮어쓰기. NULL = 판본 정책을 따른다
  "derived_from_item_id" UUID,
  "display_number" VARCHAR(12),                        -- 아래 넷은 발행 확정 때 서버가 채운다
  "physical_page_index" INTEGER,
  "printed_page_label" VARCHAR(12),
  "page_column" SMALLINT CHECK ("page_column" IN (1, 2)),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ON "textbook_item"("edition_id", "section_key", "order_index");
CREATE INDEX ON "textbook_item"("edition_id", "physical_page_index");
CREATE INDEX ON "textbook_item"("snapshot_id");

-- ⑥ 바이트 — 내용 해시가 열쇠. INSERT 뒤로 불변
CREATE TABLE "textbook_blob" (
  "sha256" CHAR(64) PRIMARY KEY CHECK ("sha256" ~ '^[a-f0-9]{64}$'),
  "size" INTEGER NOT NULL CHECK ("size" > 0 AND "size" <= 67108864),
  "mime_type" VARCHAR(100) NOT NULL,
  "bytes" BYTEA NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (octet_length("bytes") = "size")
);
ALTER TABLE "textbook_blob" ALTER COLUMN "bytes" SET STORAGE EXTERNAL;   -- 구간 읽기가 필요한 조각만 가져오게

-- ⑦⑧ 올리는 중인 파일 — 조각 단위. 끝나면 ⑥으로 옮기고 지운다
CREATE TABLE "textbook_upload" (
  "id" UUID PRIMARY KEY,
  "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "sha256" CHAR(64) NOT NULL,
  "size" INTEGER NOT NULL CHECK ("size" > 0 AND "size" <= 67108864),
  "mime_type" VARCHAR(100) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("user_id", "sha256")
);
CREATE TABLE "textbook_upload_chunk" (
  "upload_id" UUID NOT NULL REFERENCES "textbook_upload"("id") ON DELETE CASCADE,
  "idx" INTEGER NOT NULL CHECK ("idx" >= 0),
  "bytes" BYTEA NOT NULL CHECK (octet_length("bytes") BETWEEN 1 AND 1048576),
  PRIMARY KEY ("upload_id", "idx")
);

-- ⑨ 자산 — 주인이 가진 손잡이. assetId 는 내용 해시다(§3.4)
CREATE TABLE "textbook_asset" (
  "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
  "id" CHAR(64) NOT NULL REFERENCES "textbook_blob"("sha256") ON DELETE RESTRICT,
  "kind" VARCHAR(12) NOT NULL CHECK ("kind" IN ('figure','image','portrait')),
  "name" VARCHAR(255) NOT NULL,
  "width_px" INTEGER, "height_px" INTEGER,             -- 바이트에서 잰 값. 원본 행의 figureDims 는 ④ raw_source 에 따로 있다
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("user_id", "id")
);
-- ⑩ 판본이 가리키는 자산 — 읽기 범위의 색인(공유본을 여는 동료는 여기 있는 것만 읽는다)
CREATE TABLE "textbook_edition_asset" (
  "edition_id" UUID NOT NULL REFERENCES "textbook_edition"("id") ON DELETE CASCADE,
  "asset_id" CHAR(64) NOT NULL REFERENCES "textbook_blob"("sha256") ON DELETE RESTRICT,
  PRIMARY KEY ("edition_id", "asset_id")
);

-- ⑪ QR 대상 — slug · 대상은 영구. 지우지 못한다
CREATE TABLE "textbook_qr_target" (
  "id" UUID PRIMARY KEY,
  "slug" VARCHAR(16) NOT NULL UNIQUE CHECK ("slug" ~ '^[0-9a-hjkmnp-tv-z]{10,16}$'),
  "url" VARCHAR(120) NOT NULL CHECK ("url" LIKE 'https://%'),
  "kind" VARCHAR(8) NOT NULL CHECK ("kind" IN ('item','concept')),
  "edition_id" UUID NOT NULL REFERENCES "textbook_edition"("id") ON DELETE RESTRICT,
  "item_id" UUID REFERENCES "textbook_item"("id") ON DELETE RESTRICT,
  "concept_key" VARCHAR(60),
  "lecture_id" UUID REFERENCES "concept_lecture"("id") ON DELETE RESTRICT,
  "state" VARCHAR(10) NOT NULL DEFAULT 'reserved' CHECK ("state" IN ('reserved','active','void')),
  "suspended_at" TIMESTAMP(3),                         -- 발행 뒤 바꿀 수 있는 유일한 칸
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "activated_at" TIMESTAMP(3),
  CHECK (("kind" = 'item') = ("item_id" IS NOT NULL)),
  CHECK (("kind" = 'concept') = ("concept_key" IS NOT NULL AND "lecture_id" IS NOT NULL))
);
CREATE UNIQUE INDEX ON "textbook_qr_target"("edition_id", "item_id") WHERE "kind" = 'item';
CREATE UNIQUE INDEX ON "textbook_qr_target"("edition_id", "concept_key") WHERE "kind" = 'concept';

-- ⑫⑬ 문제 해설영상과 확정본 연결
CREATE TABLE "textbook_video" (
  "id" UUID PRIMARY KEY,
  "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
  "video_url" VARCHAR(200) NOT NULL,                   -- 정규 watch 주소만 (canonicalVideoUrlSchema)
  "title" VARCHAR(200) NOT NULL,
  "seconds" INTEGER NOT NULL CHECK ("seconds" >= 0),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "textbook_video_binding" (
  "id" UUID PRIMARY KEY,
  "snapshot_id" UUID NOT NULL REFERENCES "textbook_problem_snapshot"("id") ON DELETE RESTRICT,
  "video_id" UUID NOT NULL REFERENCES "textbook_video"("id") ON DELETE RESTRICT,
  "status" VARCHAR(10) NOT NULL DEFAULT 'draft' CHECK ("status" IN ('draft','review','published','withdrawn')),
  "start_seconds" INTEGER NOT NULL DEFAULT 0 CHECK ("start_seconds" >= 0),
  "end_seconds" INTEGER CHECK ("end_seconds" IS NULL OR "end_seconds" > "start_seconds"),
  "reviewed_against_hash" CHAR(64),
  "reviewed_by" UUID REFERENCES "user"("id") ON DELETE SET NULL,
  "reviewed_at" TIMESTAMP(3), "published_at" TIMESTAMP(3), "withdrawn_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ("status" <> 'published' OR "reviewed_against_hash" IS NOT NULL)
);
CREATE UNIQUE INDEX "textbook_video_binding_one_published"
  ON "textbook_video_binding"("snapshot_id") WHERE "status" = 'published';

-- ⑭ 배정 — 반 또는 학생 하나에, 책 전체 또는 범위를
CREATE TABLE "textbook_assignment" (
  "id" UUID PRIMARY KEY,
  "edition_id" UUID NOT NULL REFERENCES "textbook_edition"("id") ON DELETE RESTRICT,
  "class_id" UUID REFERENCES "class"("id") ON DELETE CASCADE,
  "student_id" UUID REFERENCES "student"("id") ON DELETE CASCADE,
  "whole" BOOLEAN NOT NULL,
  "scope" JSONB NOT NULL DEFAULT '[]' CHECK (jsonb_typeof("scope") = 'array'),     -- [{ unitKey, sectionKeys? }]
  "purpose" VARCHAR(10) NOT NULL CHECK ("purpose" IN ('study','preview')),
  "opens_at" TIMESTAMP(3), "expires_at" TIMESTAMP(3), "revoked_at" TIMESTAMP(3),
  "assigned_by" UUID REFERENCES "user"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (num_nonnulls("class_id", "student_id") = 1),
  CHECK ("whole" = (jsonb_array_length("scope") = 0))
);
CREATE INDEX ON "textbook_assignment"("class_id");
CREATE INDEX ON "textbook_assignment"("student_id");
CREATE INDEX ON "textbook_assignment"("edition_id");

-- ⑮ 요청 기록 — 같은 요청을 두 번 받아도 한 번만 만든다(담기 · 문항 등록 · 발행 · 가져오기)
CREATE TABLE "textbook_request" (
  "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "request_id" VARCHAR(64) NOT NULL,
  "operation" VARCHAR(20) NOT NULL CHECK ("operation" IN ('capture','register','publish','import','reissue')),
  "edition_id" UUID REFERENCES "textbook_edition"("id") ON DELETE CASCADE,
  "state" VARCHAR(10) NOT NULL CHECK ("state" IN ('open','done','abandoned')),
  "base_revision" INTEGER,
  "body_hash" CHAR(64) NOT NULL,                       -- 같은 id 에 다른 내용이 오면 409
  "result" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("user_id", "request_id")
);

-- ⑯ 발행 조판 걸음 — 서버가 한 걸음씩 조판하고 결과를 적는다(§6.3)
CREATE TABLE "textbook_publish_step" (
  "user_id" UUID NOT NULL,
  "request_id" VARCHAR(64) NOT NULL,
  "idx" INTEGER NOT NULL CHECK ("idx" >= 0),
  "view" VARCHAR(8) NOT NULL CHECK ("view" IN ('student','answers')),
  "section_keys" JSONB NOT NULL CHECK (jsonb_typeof("section_keys") = 'array'),
  "state" VARCHAR(8) NOT NULL DEFAULT 'queued' CHECK ("state" IN ('queued','running','done','failed')),
  "attempts" SMALLINT NOT NULL DEFAULT 0 CHECK ("attempts" BETWEEN 0 AND 3),
  "lease_until" TIMESTAMP(3),
  "first_page_index" INTEGER,
  "page_count" INTEGER,
  "sha256" CHAR(64) REFERENCES "textbook_blob"("sha256") ON DELETE RESTRICT,
  "result" JSONB,                                      -- 쪽 계획 · 배치 자리 · 진단(넘침 · 수식 오류 · 빠진 그림 · 읽힌 QR)
  PRIMARY KEY ("user_id", "request_id", "idx"),
  FOREIGN KEY ("user_id", "request_id") REFERENCES "textbook_request"("user_id", "request_id") ON DELETE CASCADE
);

-- ⑰ 발행 산출물 — 합친 PDF · 검수 보고 · 매핑표의 해시와 바이트
CREATE TABLE "textbook_artifact" (
  "edition_id" UUID NOT NULL REFERENCES "textbook_edition"("id") ON DELETE RESTRICT,
  "kind" VARCHAR(16) NOT NULL CHECK ("kind" IN ('student-pdf','answers-pdf','spread-pdf','validation-json','mapping-csv')),
  "sha256" CHAR(64) NOT NULL REFERENCES "textbook_blob"("sha256") ON DELETE RESTRICT,
  "page_count" INTEGER,
  "parts" JSONB NOT NULL DEFAULT '[]' CHECK (jsonb_typeof("parts") = 'array'),     -- 조판 걸음의 조각 해시 · 쪽 범위
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("edition_id", "kind")
);

-- 따로 떼어 낸 마이그레이션 — 기존 표의 유일한 변경(§6.5). 재출제를 낼 때만 적용한다
ALTER TABLE "test_problem" ADD COLUMN "snapshot_id" UUID
  REFERENCES "textbook_problem_snapshot"("id") ON DELETE RESTRICT;
CREATE INDEX "test_problem_snapshot_id_idx" ON "test_problem"("snapshot_id") WHERE "snapshot_id" IS NOT NULL;
```

열람 기록(`textbook_qr_open` — 학생 × QR 한 줄, 처음 · 마지막 시각 · 횟수)은 지시서가 요구하는 «검증용 계정의 열람 증거»에 쓸 수 있다. 개인정보가 늘어나는 표라 기본 설계에는 넣지 않고 합의에서 정한다(§14).

### 3.3 무엇이 불변을 지키나

| 불변식                                                   | DB(트리거 · 제약)                                                                                                            | 앱                                                                                                                                                                          |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 발행 · 종료 판본의 행은 못 고친다                        | ② BEFORE UPDATE/DELETE — 초안이 아니면 `published → retired`(+`retired_at`)만 통과, DELETE 는 거절                           | 쓰기 라우트가 초안이 아니면 409 와 «새 판본 만들기» 안내                                                                                                                    |
| 발행 판본의 구획 · 배치 · 자산 색인 · 산출물은 못 고친다 | ③⑤⑩⑰ BEFORE INSERT/UPDATE/DELETE — 부모 판본이 초안이 아니면 거절                                                            | 확정 트랜잭션이 자식을 먼저 쓰고 상태를 **마지막에** 바꾼다                                                                                                                 |
| 확정본은 만들어진 뒤 안 바뀐다                           | ④ BEFORE UPDATE — `problem_id` 가 NULL 로 바뀌는 것만 통과                                                                   | 원문이 바뀌면 새 행                                                                                                                                                         |
| 격리된 문항은 확정본으로도 못 나간다                     | ④ BEFORE INSERT OR UPDATE OF `problem_id` → `block_problem_relation_behind_outer_wall()` (F3 의 함수 그대로)                 | 담기 전에 자격을 묻는다(F2)                                                                                                                                                 |
| 바이트는 안 바뀐다                                       | ⑥ BEFORE UPDATE 거절. DELETE 는 FK 가 막는다                                                                                 | 해시는 DB 가 계산한다(§6.1)                                                                                                                                                 |
| QR 의 slug · 주소 · 대상은 영구다                        | ⑪ BEFORE UPDATE — `state`(`reserved → active\|void`) · `activated_at` · `suspended_at` 말고는 거절, BEFORE DELETE 는 늘 거절 | slug 는 서버만 짓는다                                                                                                                                                       |
| QR 을 한 번이라도 예약한 배치 · 판본은 지워지지 않는다   | ⑪ 의 FK(RESTRICT)와 DELETE 거절                                                                                              | 초안에서 «빼기»는 배치를 구획 밖으로 내보낸다(`section_key = NULL`). 놓이지 않은 배치의 예약은 확정 때 `void`. 판본을 버리려면 내용을 비우거나 책을 보관한다(`archived_at`) |
| 게시 영상은 확정본당 하나                                | ⑬ 부분 유일 색인                                                                                                             | 교체는 한 트랜잭션에서 새 연결 게시 + 옛 연결 중지                                                                                                                          |
| 게시하려면 그 해시로 검수했어야 한다                     | ⑬ CHECK(값이 있는가)                                                                                                         | `reviewed_against_hash = snapshot.content_hash` 인가는 앱 + 시험                                                                                                            |
| `linked` 는 실제 문항 id · 코드를 가진다                 | — (표를 넘는 조건)                                                                                                           | 담기 · 등록 · 발행 검사 + 시험                                                                                                                                              |
| 계정을 지워도 인쇄된 QR 이 안 끊긴다                     | ①④⑨⑫ 의 `user_id` 는 RESTRICT — 책 · 확정본 · 자산 · 영상을 가진 계정은 지워지지 않는다                                      | 계정 삭제 흐름이 «교재가 있는 계정»을 사유와 함께 거절                                                                                                                      |

트리거 함수는 새 표에만 건다. 기존 표의 동작은 바뀌지 않는다.

### 3.4 지시서 타입과 다르게 잡은 것 (합의 대상)

- **`assetId` = 내용 해시(64자).** 지시서는 `assetId` 와 `sha256` 을 따로 둔다. 같은 값으로 두면 «id 를 재발급하지 않는다 · 경로가 바뀌어도 id 와 바이트를 유지한다»가 구조적으로 참이 되고, 패키지를 다른 계정이 가져와도 id 가 겹치지 않는다. `contentHash` 가 `assetId` 를 품으므로 id 가 계정마다 달라지면 같은 문항의 해시가 계정마다 달라진다 — 그것도 막는다. 기존 `workspace_asset` 도 해시를 id 로 쓴다.
- **원본 행의 그림 칸은 두 벌로 둔다.** `payload.figures`(해시의 대상 — 지시서의 `FigureRef`)와 `raw_source`(원본 행의 `figureUrls` · `figureDims` · `figureSourceMm` · `choiceFigureIndex` · `figureSource` · `figureSvg` 의 해시를 **배열 그대로**). 리드 통합안의 «source figureDims 와 실제 자산에서 측정한 픽셀 치수는 다른 필드»가 이것이다: 잰 값은 ⑨ `width_px` · `height_px`, 원본 값은 `raw_source.figureDims`.
- **쪽 정보는 배치 행의 칸이다.** `PagePlacement` 를 따로 표로 두지 않았다. 내보낼 때 `pageMap` 배열로 만든다.
- **후보는 배치 행의 JSON 이다.** 확정 `source` 와 섞이지 않게 `link_candidates` 에만 둔다.
- **`revision` 을 둘로 갈랐다.** 지시서의 `revision`(편집 충돌 감지)은 집계값으로 내보내고, 설정 · 목차의 CAS 는 `structure_revision` 으로 따로 본다(§6.2).
- **초안은 책마다 하나.** 발행본을 고치려면 새 초안을 하나 만든다. 초안 둘이 필요해지면 부분 유일 색인을 풀면 된다.

## 4. 공유 계약과 해시

| 파일(새)                                     | 내용                                                                                                                                                                                                                                                                                  |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/contracts/textbookExchange.contract.ts` | 지시서 03 §4 의 타입을 Zod 로 그대로. `schemaVersion` 은 리터럴, 전부 `strictObject` — 모르는 칸은 버리지 않고 **경로와 함께 거절**한다. 03 §4 의 검증 조건(풀이선 대소 · 종료 > 시작 · `keywords`/`sentences` 의 `showRepetitionChecks` 는 false · `choiceIndex` 뜻)을 `refine` 으로 |
| `src/contracts/textbook.contract.ts`         | 교사 API 의 요청 · 응답                                                                                                                                                                                                                                                               |
| `src/contracts/textbookStudent.contract.ts`  | 학생에게 가는 모양 둘 — 학생용 지면(정답 없음)과 QR 열람(§7.3). 교환 계약을 import 하지 않는다 — 시험이 잠근다                                                                                                                                                                        |
| `src/lib/textbook/canonical.ts`              | 정규 JSON + SHA-256(`injaewon.textbook.c14n.v1`). 서버(`node:crypto`) · 브라우저(`crypto.subtle`) · 조판 번들이 같은 파일을 쓴다                                                                                                                                                      |
| `src/lib/textbook/hashVectors.json`          | 검증 벡터 — 포함 · 제외 · 변이(한 글자 · 키 순서 · 배열 순서). 구현을 바꾸면 판을 올린다                                                                                                                                                                                              |
| `src/lib/textbook/snapshotFromProblem.ts`    | 원본 행 → `payload` + `raw_source`. **유일한 어댑터**다. `serializeProblem` · `toPrintProblem` · `problemFingerprint` 를 입력으로 쓰지 않는다(F8)                                                                                                                                     |
| `src/lib/textbook/snapshotToPrintable.ts`    | 확정본 → 지면이 받는 행(`PrintableProblemRow`). 은행 · 시험지와 같은 컴포넌트로 그리기 위한 투영이다                                                                                                                                                                                  |

해시 규칙은 03 §5 그대로다: 검증을 통과한 JSON 값만 · 객체 키는 재귀 정렬 · 배열 순서 보존 · 문자열은 한 글자도 정규화하지 않음(유니코드 정규화 포함) · UTF-8 바이트 · 수는 유한한 값만(직렬화는 ECMAScript 의 수 → 글자 규칙).

- `contentHash` = `ProblemPayload` 전체. id · 시각 · 쪽 · QR · 주소 · `raw_source` 는 들어가지 않는다. `payload` 안의 `assetId` 는 들어간다.
- `manifestHash` = 판본 설정 · 판본 정체와 이름 · 목차 · 구획 내용 · 확정본 id 와 해시 · 배치 · 쪽 · QR 대상 · 자산 해시 · 템플릿/렌더러/정규화 판. 자기 자신 · 내보낸 시각 · 영상 상태와 주소는 뺀다.

화면에 보일 때만 바뀌는 것(초등 가분수 → 대분수, F9)은 확정본에 넣지 않는다. 확정본은 DB 원문이고, 보이는 모양은 `renderer_version` 이 정한다.

## 5. API

교사 쪽은 `/api/textbook/**`(메뉴 `textbook`), 학생 쪽은 `/api/learn/textbook/**`(학생 허용 목록)이다. 전부 `withErrorLog`. 지시서의 경로 예시(`/api/textbooks`)는 저장소 관례에 맞춰 단수로 모았다.

| 기능                      | 메서드 · 경로                                                                                              | 핵심                                                                      |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 책 목록 · 만들기          | `GET/POST /api/textbook/books`                                                                             | 주인 범위 + 지점 공유 읽기                                                |
| 책 고치기 · 공유 · 보관   | `PATCH /api/textbook/books/{bookId}`                                                                       | 목록용 제목 · 공개 범위 · `archived_at`                                   |
| 판본 만들기               | `POST /api/textbook/books/{bookId}/editions`                                                               | 빈 초안 또는 `fromEditionId` 로 새 개정 초안                              |
| 판본 읽기                 | `GET /api/textbook/editions/{eid}`                                                                         | 설정 · 목차 · 두 revision · 상태                                          |
| 설정 · 목차 저장          | `PATCH /api/textbook/editions/{eid}`                                                                       | `expectedStructureRevision`, 충돌 409                                     |
| 구획 읽기 · 저장 · 지우기 | `GET/PUT/DELETE …/sections/{sectionKey}`                                                                   | `expectedRevision`(구획), 응답에 새 집계 revision                         |
| 문항 담기                 | `POST …/items`                                                                                             | `requestId` · 시험지 id 또는 문항 id 목록 · 단원 · 단계. 결과에 제외 사유 |
| 배치 고치기               | `PATCH …/items/{itemId}`                                                                                   | 단계 · 풀이선 · 영상 필수 여부. 자리는 구획 저장이 정한다                 |
| 원문과 견주기             | `GET …/items/{itemId}/diff` · `POST …/items/{itemId}/recapture`                                            | 확정본 ↔ 지금 은행 문항. 바꾸면 새 확정본                                 |
| 연결 후보 · 확정          | `POST …/items/{itemId}/candidates` · `POST …/items/{itemId}/link`                                          | 후보는 결정적 비교. 확정은 사람이                                         |
| 새 문항으로 등록          | `POST …/items/{itemId}/register`                                                                           | `requestId`. 실제 id · 코드를 받은 뒤에만 `linked`                        |
| 발행 사전 검사            | `POST …/publish/preflight`                                                                                 | 읽기 전용. 막는 사유 목록                                                 |
| 발행 예약                 | `POST …/publish/reserve`                                                                                   | `expectedRevision` · `requestId` → QR 대상 · 조판 걸음 목록               |
| 조판 한 걸음              | `POST …/publish/steps/next`                                                                                | `requestId` 만 받는다. 서버가 다음 걸음을 조판하고 결과를 적는다          |
| 발행 상태 · 미리 받기     | `GET …/publish/{requestId}` · `GET …/publish/{requestId}/parts/{idx}?part=n`                               | 주인만. 확정 전에 서버가 만든 PDF 를 본다                                 |
| 발행 확정                 | `POST …/publish/finalize`                                                                                  | `requestId` 만 받는다                                                     |
| 내보내기                  | `GET …/export?part=…`                                                                                      | 조각별. 조립은 브라우저(§6.6)                                             |
| 가져오기                  | `POST /api/textbook/imports` 외                                                                            | 늘 **새 초안**을 만든다                                                   |
| 파일 올리기               | `PUT /api/textbook/uploads/{sha256}` · `POST …/complete`                                                   | 1MB 조각                                                                  |
| 자산 · 산출물 읽기        | `GET …/editions/{eid}/assets/{assetId}` · `GET …/artifacts/{kind}?part=n`                                  | 구간 읽기                                                                 |
| 영상 · 연결               | `GET/POST /api/textbook/videos` · `POST /api/textbook/snapshots/{sid}/bindings` · `PATCH …/bindings/{bid}` | 상태 전이 · 검수 해시                                                     |
| 배정                      | `GET/POST …/editions/{eid}/assignments` · `DELETE …/assignments/{aid}`                                     | 지우기는 `revoked_at` 을 찍는다                                           |
| 교재에서 찾기             | `GET /api/textbook/lookup?…`                                                                               | 판본 · 쪽 · 번호 · 문항 코드 → 배치                                       |
| 같은 문제로 출제          | `POST /api/textbook/editions/{eid}/reissue`                                                                | `requestId` · 배치 id 목록 · 반. 시험지를 만든다(§6.5)                    |
| QR 미리보기(교사)         | `GET /api/textbook/qr/{slug}`                                                                              | 예약 상태도 주인에게는 보인다                                             |
| QR 화면                   | `GET /q/{slug}`                                                                                            | 페이지. 세션 종류에 따라 학생 화면 · 교사 미리보기                        |
| QR 내용(학생)             | `GET /api/learn/textbook/q/{slug}`                                                                         | §7.3 의 모양만                                                            |
| QR 그림(학생)             | `GET /api/learn/textbook/q/{slug}/assets/{assetId}`                                                        | 그 문항의 확정본이 가리키는 것만                                          |

서버 액션은 쓰지 않는다. 관문 밖에서 권한을 다시 확인해야 하고(v01 E20), 학생 허용 목록에 페이지 POST 를 열어야 하기 때문이다(F15).

## 6. 프로토콜

### 6.1 담기 — 확정본과 자산 동결

입력은 시험지 하나 또는 문항 id 최대 50개다. 한 요청이 가져오는 그림은 32MB 까지.

1. **권한.** `textbook` 메뉴 · 판본의 주인 · 판본이 초안. 시험지면 `requireOwnedTest`(F14). 문항에는 소유자가 없으므로 `Problem.userId` 로 아무것도 거르지 않는다(F1). 시험지 표는 **읽기만** 한다 — 내용 · 배점 · 순서를 안 건드린다.
2. **자격.** 문항마다 `problemIneligibleReason`(F2)을 묻는다. 걸린 문항은 사유와 함께 결과에 싣고 담지 않는다. 시험지를 통해 읽는 문항은 `include` 로 딸려 오므로 `db` 확장의 벽을 탔다고 가정하지 않고 여기서 직접 묻는다.
3. **행을 직접 읽는다.** `snapshotFromProblem` 이 원본 행 전체를 받는다(§4).
4. **그림을 얼린다(트랜잭션 밖).**
   - `figureSvg` → 허용 목록 검사(스크립트 · `on*` · 바깥 참조 · `foreignObject` 가 있으면 **고치지 않고 담기를 거절**) → UTF-8 바이트 → 해시.
   - `figureUrls[i]` → 지금의 명부에서 해시 객체를 받아 바이트를 검증(F10)하거나 배포본 파일을 읽는다 → 해시. 치수는 바이트 머리에서 잰다(F11).
   - `payload.figures` 의 차례는 «`figureSvg` 가 있으면 먼저, 그다음 `figureUrls` 의 차례 그대로»다.
   - `choiceIndex` = `choiceFigureIndex[i]`, `sourceWidthMm` = `figureSourceMm[i]`. 배열 길이가 안 맞으면 기존 규약대로 **통째로 모름(null)** 이다. 아무 그림이나 ①에 붙이지 않는다.
   - 원본 배열 넷(`figureUrls` · `figureDims` · `figureSourceMm` · `choiceFigureIndex`)과 `figureSource` 는 **글자 그대로** `raw_source` 에 남긴다. 길이가 안 맞는 배열도 고치지 않는다.
5. **확정본을 만든다(짧은 트랜잭션).** 바이트는 ⑥에 `ON CONFLICT DO NOTHING`, 자산 손잡이 ⑨, 판본 색인 ⑩, 확정본 ④(`(주인, 출처, 해시)` 가 같으면 있던 것을 쓴다), 배치 ⑤(시험지 순서대로 · `source_test_id` · `source_test_problem_id`), 집계 revision +1, 요청 기록 ⑮.
6. **같은 요청이 다시 오면** ⑮의 결과를 그대로 돌려준다. 같은 id 에 다른 내용이면 409.

파일 올리기(원고 그림 · 캐릭터)는 조각을 ⑧에 쌓고, 끝맺을 때 DB 가 `sha256(string_agg(bytes, ''::bytea ORDER BY idx))` 로 해시를 계산해 주장한 값과 같을 때만 ⑥으로 옮긴다. 바이트가 Node 를 한 번에 지나지 않고, 기존 방식처럼 조각마다 전체를 다시 쓰지도 않는다. 읽을 때는 `substring(bytes FROM … FOR …)` 로 1MB 씩 낸다.

상한(잠정): 담기 한 번에 문항 50 · 그림 32MB / 조각 1MB / 바이트 하나 64MB(견본 PDF 42.5MB 가 들어간다) / 원고 그림 하나 8MB / 판본 하나에 구획 150 · 배치 2,000 · 자산 300종 / 구획 JSON 256KB. 뒤의 넷은 v01 §5 그대로다.

### 6.2 초안 저장 — 구획 CAS + 판본 집계 revision

- **구획 저장**은 한 트랜잭션의 두 문장이다.
  `UPDATE textbook_section … WHERE edition_id = $e AND section_key = $k AND revision = $expected` (0행이면 409)
  `UPDATE textbook_edition SET revision = revision + 1, updated_at = now() WHERE id = $e AND status = 'draft'` (0행이면 409 «발행된 판본»)
  집계 revision 은 견주지 않고 올리기만 한다. 그래서 서로 다른 구획을 두 기기에서 고쳐도 부딪히지 않는다.
- 구획 저장이 그 구획의 `problem` 블록 순서대로 배치의 `section_key` · `order_index` 를 맞춘다. **자리의 원천은 블록 순서 하나**다. 블록이 가리키는 배치가 이 판본에 없으면 400.
- **설정 · 목차 저장**은 `structure_revision` 을 견준다. 집계 revision 도 같이 올린다.
- **발행**은 집계 revision 을 견준다. 예약 뒤에 무엇이든 바뀌면 확정이 409 로 멈추고 다시 조판한다.
- 409 에서 자동으로 덮어쓰지 않는다 · 응답 유실은 «보낸 내용 그대로 · 다음 판»일 때만 성공 · 브라우저 임시본의 다섯 상태 — v01 §3.4 그대로다.
- 표시 번호와 쪽은 초안에서 계산값이다. 발행 확정 때만 서버가 배치 행에 적는다.

### 6.3 발행 — 예약 → 서버 조판 → 서버 검증 → 확정

**브라우저는 조판하지 않는다.** 걸음을 재촉할 뿐이다. 조판 · 쪽 계획 · QR 읽기 · 해시는 전부 서버가 DB 의 정본에서 직접 만든다. 판본을 잠그지 않고, 같은 집계 revision 으로 끝까지 가는지를 본다. 중간에 죽어도 판본은 초안 그대로다.

| 걸음                             | 하는 일                                                                                                                                                                                                           | 실패하면                                               |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| ① 사전 검사                      | 아래 «막는 조건» 가운데 조판 없이 알 수 있는 것 전부. 정식 주소 설정(§7.1)도                                                                                                                                      | 사유 목록                                              |
| ② 예약 (한 트랜잭션)             | 집계 revision 확인 → 요청 기록(`open`) → QR 이 필요한 배치마다 대상을 `reserved` 로(같은 배치에 이미 예약이 있으면 그것을 쓴다) → 조판 걸음 ⑯을 만든다(학생용 · 해설 각각, `even-left` 구획에서 끊은 묶음 차례로) | 409                                                    |
| ③ 조판 걸음 (걸음마다 요청 하나) | 서버가 다음 `queued` 걸음을 잡아(임대 시각을 CAS 로 찍는다) 조판하고 결과를 ⑯에 적는다                                                                                                                            | 걸음 `failed` — 세 번까지 다시, 그 뒤 요청 `abandoned` |
| ④ 미리 보기                      | 주인이 서버가 만든 PDF 를 받아 본다(선택)                                                                                                                                                                         | —                                                      |
| ⑤ 확정 (한 트랜잭션)             | 걸음이 전부 `done` 이고 진단이 깨끗할 때만                                                                                                                                                                        | 409 · 422, 판본은 초안 그대로                          |

**조판 걸음 하나가 하는 일** (`src/lib/textbook/publish/renderStep.ts` — 서버 전용)

1. DB 에서 그 묶음의 구획 · 배치 · 확정본 · 자산을 읽는다. 학생용이면 **이 자리에서** 정답 · 해설 · 교사 메모를 걷어낸다.
2. 서버가 문서를 짓는다: 조판 번들(지면 컴포넌트 + 쪽 나누기 + KaTeX — 편집 화면 미리보기 · 오프라인 HTML 과 같은 소스에서 빌드한 한 파일) + 자료 JSON + QR 모듈 행렬(서버가 예약 주소로 만든다) + 시작 쪽 번호(앞 걸음의 결과).
3. 기존 `launchExportBrowser()`(F12)로 Chromium 을 띄운다. 페이지 준비는 새로 쓴다: JS 는 켜고, **모든 요청을 가로채 서버 메모리에서 답한다**(문서 · 번들 · 글꼴 · 자산 바이트). 그 밖의 요청은 전부 끊는다. 쿠키가 없고 네트워크가 없으므로 그 페이지는 우리 API 에도 바깥에도 닿지 못한다. 기존 `buildPdf` 는 고치지 않는다 — 그것은 받은 HTML 을 찍는 다른 용도다.
4. 글꼴이 실렸는지 확인한다(응답 바이트의 머리와 `document.fonts.check` — 글꼴 자리에 HTML 이 200 으로 온 전례가 있다).
5. 페이지가 쪽을 나누고 결과를 낸다: 쪽 계획 · 배치마다의 쪽과 단 · 구획 시작 쪽 · 진단(넘침 · KaTeX 오류 · 빠진 그림 · 시작 면 위반). 서버가 `page.evaluate` 로 읽는다.
6. `page.pdf()` 로 PDF 를 만든다.
7. **만든 PDF 를 다시 읽는다.** 같은 페이지에서 `pdfjs-dist` 로 PDF 를 열어 쪽 수를 세고, QR 이 있는 쪽을 그려 QR 을 읽는다. 읽힌 주소가 그 쪽에 놓인 배치의 예약 주소와 **하나씩** 맞아야 한다.
8. PDF 바이트를 ⑥에 넣고(해시는 DB 가 계산) 걸음 결과를 적는다.

한 걸음의 크기는 쪽 48장 안쪽으로 잡는다(잠정). 걸음 요청의 실행 한도는 300초로 둔다(F13). 걸음은 차례대로 돈다 — 쪽 번호가 앞 걸음의 쪽 수에 달려 있다. 브라우저를 닫아도 상태는 ⑯에 남아 다시 이어 간다.

**확정이 확인하는 것** — 입력은 `requestId` 하나다. 전부 서버가 가진 값이다.

- 집계 revision 이 예약 때와 같다(아래 UPDATE 의 조건).
- 걸음이 전부 `done` 이고 진단이 비어 있다: 넘침 0 · 수식 오류 0 · 빠진 그림 0 · 시작 면 위반 0.
- 모든 배치가 `linked` 이고 실제 문항 id · 코드를 가진다. 확정본의 해시를 저장된 payload 로 다시 계산해 같다. 가리키는 자산이 전부 ⑥에 있다.
- 영상 필수 범위의 배치마다 `published` 연결이 있고 그 `reviewed_against_hash` 가 확정본 해시와 같다.
- 걸음들의 쪽 계획을 이으면 놓인 배치 전부가 정확히 한 번씩 나온다. 읽힌 QR 의 집합이 예약한 집합과 **개수와 주소까지 같다.**
- 조각 PDF 를 차례로 합친 파일의 쪽 수가 계획과 같다.

**확정 트랜잭션**(문장 여섯 안쪽 · 시간 한도를 명시한다)

1. 배치의 표시 번호 · 쪽 칸을 한 문장으로 채운다(`UPDATE … FROM unnest(…)`).
2. QR 대상을 `active` 로, 이 판본의 남은 예약은 `void` 로.
3. 산출물 행 ⑰ — 합친 PDF 의 해시와 조각 목록, 검수 보고, 매핑표.
4. `UPDATE textbook_edition SET status = 'published', published_at, manifest, manifest_hash WHERE id = $e AND status = 'draft' AND revision = $base` — 1행이 아니면 전체 되돌림.
5. 요청 기록을 `done` 과 결과로. 감사 한 줄.

상태를 마지막에 바꾸므로 트리거(§3.3)가 앞 문장을 막지 않는다. 같은 `requestId` 로 다시 오면 결과를 그대로 돌려준다. 합치기는 트랜잭션 **앞**에서 한다(서버가 `pdf-lib` 같은 순수 JS 라이브러리로 — 새 의존성). 합친 파일이 64MB 를 넘으면 조각 목록이 정본이고 합친 파일은 두지 않는다.

**막는 조건**(03 §6): 필수 원고 · 수식 · 도형 없음 / `linked` 인데 문항 · 확정본을 못 찾음 / 알려진 정답 · 보기 · 도형 대응 오류 / 넘침 · 잘림 · QR 겹침 · 해독 실패 / 주요 구획 시작 면 불일치 / 영상 필수 범위의 누락 / 개발 · 임시 주소 / 참조 · 해시 불일치 · revision 충돌.

**연결 안 된 원고**는 발행하지 못한다. 초안 검토용 PDF 는 브라우저 인쇄로 뽑는다. 그 PDF 에는 QR 이 없고 «초안»이 지면에 찍힌다. 초안 검토용은 산출물로 저장하지 않는다.

**정리 작업을 자동으로 두지 않는다.** 실패한 예약의 QR 은 `reserved` 로 남아 학생에게 안 보이고, 다음 예약이 같은 배치에 다시 쓴다. 버려진 요청의 조각 PDF 는 ⑥에 남는다 — 지우는 것은 사람이 정한다.

**재야 하는 가정.** 서버리스 Chromium 이 48쪽 묶음을 300초 · 주어진 메모리 안에 조판하고 다시 읽는지는 재지 않았다. `tb-publish` 의 첫 일이 이 측정이다: 로컬 Chrome(`launchExportBrowser` 가 이미 찾는다)으로 합성 260쪽을 걸음마다 재고, 그다음 미리보기 배포에서 잰다. 한도를 넘으면 묶음을 줄인다. 구획 하나가 한도를 넘으면 그 구획이 발행을 막는 사유가 된다. 서버리스에서 끝내 안 되면 같은 코드를 운영자 명령(`scripts/textbook/publish-render.ts`)으로 돌린다 — 그래도 조판과 검증은 서버 코드가 한다.

### 6.4 발행 뒤

| 바뀔 수 있는 것                   | 자리                                 |
| --------------------------------- | ------------------------------------ |
| 영상 연결(교체 · 중지)            | ⑬ — 판본 밖의 표. QR 은 그대로다     |
| QR 한 장의 중지                   | ⑪ `suspended_at`. 안내 화면은 남는다 |
| 배정 · 회수                       | ⑭                                    |
| 판본 종료                         | ② `published → retired`              |
| 책의 공유 범위 · 목록 제목 · 보관 | ①                                    |

그 밖은 전부 불변이다. 발행본을 고치려면 `POST …/editions` 에 `fromEditionId` 를 준다. 구획과 배치를 복사하고(배치 id 는 새로 짓고 `derived_from_item_id` 에 옛 id 를 적는다) 확정본은 **같은 행을 가리킨다.** QR 은 복사하지 않는다 — 새 판본은 발행할 때 새 QR 을 받는다. 옛 판본의 PDF · QR · 영상 연결은 영향이 없다.

### 6.5 같은 문제로 다시 출제 — 확정본을 읽는 시험지

지금은 시험지가 살아 있는 문항을 읽는다. 인쇄도(F5) 채점도(F6) 그렇다. 은행의 문항이 고쳐지면 이미 낸 시험지의 지면과 정답이 같이 바뀐다. 그대로 두면 «교재와 같은 문제로 출제»는 거짓말이 된다.

**고치는 법**

1. `test_problem` 에 nullable `snapshot_id` 를 더한다(§3.2 끝 — 따로 떼어 낸 마이그레이션). 값이 있으면 그 문항의 내용 · 정답 · 해설 · 그림은 **확정본에서 읽는다.** `problem_id` 는 그대로 채운다 — 단원 · 통계 · 외벽 트리거가 그 칸을 쓴다.
2. 내용을 읽는 통로를 하나로 만든다: `src/lib/tests/testProblemContent.ts` 의 `contentOf(testProblem)`. `snapshot_id` 가 있으면 `snapshotToPrintable` 로, 없으면 지금처럼 살아 있는 행으로.
3. 그 통로를 지나야 하는 파일(F7 에서 **내용을 읽는** 것):

   | 파일                                       | 읽는 것                                                                                         |
   | ------------------------------------------ | ----------------------------------------------------------------------------------------------- |
   | `src/lib/tests/loadTestProblems.ts`        | 시험지 화면의 문항 전부                                                                         |
   | `src/app/(main)/tests/[id]/print/page.tsx` | 인쇄 지면 · 정답지                                                                              |
   | `src/lib/testResults/gradeSheet.ts`        | 채점표의 정답(236행)                                                                            |
   | `src/lib/testResults/submitTestResult.ts`  | 자동 채점의 정답(78행)                                                                          |
   | `src/lib/tests/generateDraftTest.ts`       | 출제 응답에 싣는 문항 전부(247행) — 확정본이 붙을 일은 없지만 가드가 한 통로만 보게 같이 지난다 |
   | `src/lib/tests/replaceTestProblem.ts`      | 내용을 읽지는 않는다. 문항을 바꾸면 `snapshot_id` 를 비운다                                     |

   나머지(`recentProblemIds` · `achievement/load` · `persistPredictedPaper` · 점수 라우트)는 id 와 배점만 읽어 바꿀 것이 없다. `findEligibleProblems` 는 주석에만 나온다.

4. **전수 가드**를 둔다. 시험지 문항 행에서 `problem` 의 내용 칸을 직접 읽는 파일이 허용 목록(위 통로 하나) 밖에 생기면 빨개지는 시험이다(`errorLogRouteCoverage.test.ts` 와 같은 방식). 통로를 한쪽만 지나면 지면과 채점이 서로 다른 정답을 본다.
5. 재출제 요청은 발행본의 배치 id 를 받는다. 문항마다:
   - 지금의 은행 문항이 출제 자격을 잃었으면(F2) 사유를 보이고 뺀다. 임의로 풀지 않는다.
   - 원본 문항이 지워졌으면(`problem_id` 가 NULL) 시험지에 담을 수 없다 — 사유를 보인다.
   - 그 밖에는 **늘 `snapshot_id` 를 채워** 담는다. 지금 내용이 같아도 채운다. 그래야 뒤에 은행이 고쳐져도 이 시험지는 안 바뀐다.
   - 지금 내용이 확정본과 다르면 차이를 보인다. «최신 문항으로»는 사람이 고른 문항만 `snapshot_id` 없이 담고, 그 선택을 감사에 남긴다.
6. 원래 시험지는 건드리지 않는다. 재출제는 새 시험지를 만든다. 같은 `requestId` 는 한 번만 만든다.

**적용 순서.** 이 칸의 마이그레이션은 새 표 마이그레이션과 **따로** 낸다. 칸이 생긴 뒤에야 통로 코드가 배포될 수 있고, 옛 코드는 모르는 칸을 읽지 않으므로 그 사이에 깨지지 않는다.

**확인할 것.** 시험지의 서버 PDF 내보내기는 같은 출처의 `/api/` 자원을 막는다(F12). 확정본의 그림 주소가 `/api/…` 면 그 경로에서 그림이 빠진다 — 재출제 시험지가 그 내보내기를 타는지 구현 때 확인하고, 탄다면 그림을 data URI 로 싣는다.

### 6.6 내보내기 · 가져오기 · ZIP · 오프라인 HTML

- **내보내기**는 조각으로 낸다: 목록(조각 이름과 해시) · 설정 · 단원별 원고 · 확정본(200개씩) · 배치 · 쪽 · QR · 영상 연결 · 자산. 브라우저가 `textbook.json`(`TextbookExchange`)으로 조립하고 `manifest.json` · `assets/` · `mapping.csv` · `validation.json` 과 함께 ZIP 으로 묶는다. 한 응답에 책 전체를 싣지 않는다.
- 발행본을 내보내면 조립한 내용의 `manifestHash` 가 저장된 값과 같아야 한다 — 다르면 내보내기를 실패로 표시한다. 발행본의 PDF 는 서버가 만든 산출물을 그대로 받는다. 초안은 `qrTargets` 가 비어 있고 `manifestHash` 가 null 이다.
- `mapping.csv` 는 03 §7 의 열 그대로. `=` `+` `-` `@` 로 시작하는 칸은 수식으로 읽히지 않게 처리한다. 학생 정보는 없다.
- **가져오기**는 늘 새 초안을 만든다. 있는 판본을 덮어쓰지 않는다. 브라우저가 ZIP 을 풀어 경로 이탈 · 압축 비율 · 허용 형식을 먼저 보고, 서버가 조각마다 같은 계약으로 **다시** 검사한다. `linked` 라는 주장은 믿지 않는다: 문항 id · 코드로 은행을 읽어 `snapshotFromProblem` 으로 다시 지은 해시가 같을 때만 `linked`, 아니면 `needs-review` 다. 패키지 안의 QR · 쪽 · 영상 연결은 가져오지 않고 보고서에 «서버 발급 대상이라 무시함»으로 적는다.
- **오프라인 HTML**은 조판 번들 + 교환 JSON + 자산(data URI)으로 만든다. 토큰 · 키 · API 주소가 없고 네트워크를 부르지 않는다(메타 CSP `default-src 'none'`). 영상이 들어 있다고 표시하지 않는다.
- 새 의존성이 넷 필요하다: QR 만들기 · QR 읽기 · ZIP · PDF 합치기(F20). 판을 고정하고 잠금 파일에 올린다.

## 7. QR · 학생 열람

### 7.1 주소와 slug

- 경로는 `/q/{slug}`. 충돌이 없다(F19).
- slug 는 서버가 `crypto` 로 짓는 소문자 10자(헷갈리는 글자를 뺀 32자 집합 · 약 50비트). 학생 · 로그인 · 만료 정보가 없다.
- 주소는 **예약할 때 저장한다.** 출처는 요청의 호스트가 아니라 새 서버 설정값(`TEXTBOOK_PUBLIC_ORIGIN`)이다. 값이 없거나 `https` 가 아니거나 `localhost` · 미리보기 배포 주소면 예약이 거절된다.
- 주소가 42바이트 안이면 QR 3판(29×29) · 오류정정 M 에 들어간다(메모에 적힌 주소라면 37자다 — §14). 20~24mm 인쇄에서 모듈이 넉넉한 크기다. 실제 읽힘은 실물로 잰다(§12.2).
- slug 자체는 권한이 아니다. 열 때마다 서버가 권한을 본다.

### 7.2 관문과 로그인 복귀

리드가 맡은 자리다. 확인한 사실(F15 · F16)과 고칠 곳만 적는다.

| 파일                                           | 고칠 것                                                                                                                                                                          |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/studentRouteAccess.ts`                | 학생 허용 목록에 `GET /q/{slug}` · `GET /api/learn/textbook/q/{slug}` · `GET …/assets/{assetId}`. 첫 로그인 학생이 `/q/…` 를 열면 `/learn/password` 로 보내되 목적지를 들고 간다 |
| 복귀 주소 검증기 (새 · 한 곳)                  | `^/q/[slug 꼴]$` 만 통과. 관문 · 로그인 화면 · 비밀번호 화면이 같은 함수를 쓴다                                                                                                  |
| `src/components/auth/AuthForm.tsx`             | 학생 갈래의 목적지를 «검증기를 통과한 주소, 아니면 `/learn`»으로. 교사용 주소를 학생에게 쓰지 않는다는 지금 규칙은 허용 목록 밖에서 그대로다                                     |
| `src/components/learn/StudentPasswordForm.tsx` | 바꾼 뒤 검증기를 통과한 목적지로                                                                                                                                                 |

로그인 안 한 요청은 지금 관문이 이미 `/login?callbackUrl=/q/…` 로 보낸다. 로그인 전에는 slug 가 있는지 없는지 알려 주지 않는다. `STUDENT_CAPABILITIES` 시험은 목록이 늘면 빨개지게 되어 있다 — 일부러 고친다.

교사 세션으로 열면 교사 미리보기다. 판본을 읽을 수 있을 때만 보이고, 예약 상태의 QR 도 주인에게는 보인다.

### 7.3 학생에게 가는 모양

학생에게 가는 모양은 **둘**이고 서로 다르다.

- **학생용 지면**(인쇄 PDF · 오프라인 HTML): 연습 문항의 정답 · 해설 · 교사 메모가 없다. 서버가 조판 전에 걷어낸다(§6.3 걸음 1). 대표 예제의 공개 풀이는 원고의 일부라 남는다.
- **QR 열람**: 권한을 확인한 한 문항. 아래 모양이다.

```ts
type StudentQrView =
  | { state: "not-found" } // 404 — 없는 slug · 예약 · 무효
  | { state: "forbidden" } // 403 — 배정 밖
  | { state: "unavailable"; reason: "retired" | "suspended" }
  | {
      state: "ok";
      book: { title: string; editionLabel: string };
      item: { displayNumber: string; printedPageLabel: string };
      problem: {
        content: string;
        questionType: string | null;
        figures: {
          url: string;
          choiceIndex: number | null;
          widthMm: number | null;
        }[];
      };
      video:
        | {
            state: "ready";
            embedId: string;
            startSeconds: number;
            endSeconds: number | null;
          }
        | { state: "preparing" }
        | { state: "withdrawn" };
      solution: { answer: string; solution: string | null } | null;
    };
```

- 만드는 곳은 `toStudentQrView` 하나다. 교환 계약의 객체를 그대로 내보내지 않는다.
- **가지 않는 것**: 문항 id · 문항 코드 · 확정본 id · 해시 · 유형 열쇠 · 난이도 · 다른 배치 · 초안 · 검수 보고 · 교사 메모 · 다른 학생.
- **정답과 글 해설은 기본으로 가지 않는다.** 판본 설정에 `studentSolutionPolicy`(`never` · `when-no-video` · `always`)를 명시 칸으로 더하고 기본은 `never` 다. 지시서의 «허용된 경우 글 해설을 제공»이 이 칸이다.
- 영상이 없으면 `preparing`, 연결을 내렸으면 `withdrawn` 이다. 다른 문항의 영상이나 개념 강의로 대신하지 않는다.
- 영상 주소는 권한을 확인한 응답에만 실린다. 다만 유튜브의 일부 공개 영상은 주소를 아는 사람이 볼 수 있다 — 서버 권한은 «주소를 내주는 문»까지다(§12.2).
- 그림 주소는 그 QR 에 묶인 경로이고, 그 문항의 확정본이 가리키는 자산만 낸다.

### 7.4 재생기

아래층(`PlayerFactoryContext` · `LectureFrame` · `youtubePlayer`)을 그대로 쓰고 시작 초를 넘긴다(F18). 위층은 새로 얇게 쓴다(`SolutionPlayer`): 앞으로 감기 가드가 없고, 끝 초에 닿으면 멈추고, «이 문제의 풀이는 3:10 ~ 5:42»를 보인다. `LecturePlayer` 는 고치지 않는다 — 개념 강의의 감기 가드와 시청 기록 규칙이 거기 묶여 있다. 자동 재생을 성공 조건으로 삼지 않는다.

**개념 예습 QR** 은 종류가 다른 대상(`kind = 'concept'`)이고 기존 강의 행을 가리킨다. 여는 조건은 «기존 진도 규칙 **또는** 그 구획을 담은 교재 배정»이다. 기존 판정(`lectureOpenToStudent`)과 강의 목록 · 시청 기록 라우트는 한 글자도 안 바꾸고(F17), 합치는 자리는 QR 라우트의 새 함수 하나다. 배정으로만 열린 강의의 시청 기록을 남길지는 합의에서 정한다(§14).

## 8. 영상 등록 · 검수

- 영상 행(`textbook_video`)은 주소 · 제목 · 길이다. 주소는 기존 `canonicalVideoUrlSchema` 를 그대로 쓴다(유튜브 정규 주소만).
- 연결(`textbook_video_binding`)은 **확정본**에 건다. 같은 문항을 두 책에 실어도 확정본이 같으면 같은 연결을 쓴다. 숫자가 다른 변형은 확정본이 달라 연결도 따로다.
- 상태는 `draft → review → published → withdrawn`. `published` 로 가려면 검수자가 문제 · 정답 · 해설과 영상을 같이 본 화면에서 누르고, 그때의 확정본 해시가 `reviewed_against_hash` 에 적힌다.
- 원문이 바뀌어 새 확정본이 생기면 연결은 따라오지 않는다. 발문이 같아 보여도 다시 검수한다.
- 한 영상이 여러 문항을 다루면 연결마다 시작 · 끝 초를 둔다.
- 교체는 한 트랜잭션: 새 연결을 `published` 로, 옛 연결을 `withdrawn` 으로. 줄은 남는다 — 그것이 변경 기록이다.
- 지금 실제 문제 해설영상은 없다(지시서 02 §2). 그러므로 `videoPolicy: required` 인 판본은 지금 발행할 수 없다. 이것은 결함이 아니라 규칙이 맞게 동작하는 것이다.

## 9. 범위 배정 · 회수

판정은 순수 함수 하나(`src/lib/textbook/studentAccess.ts`)다. QR 내용 · QR 그림 · 개념 QR 이 같이 쓴다.

학생 S 가 배치 I 를 열 수 있는 조건(전부 참):

1. I 의 판본이 `published` 이고 QR 이 `active` 이며 중지되지 않았다.
2. 배정 A 가 있다: 같은 판본 · `revoked_at` 없음 · 지금이 `opens_at` ~ `expires_at` 안.
3. A 가 S 를 가리킨다: `student_id = S` 이거나 `class_id = S 의 지금 반`.
4. A 가 I 를 덮는다: 책 전체이거나 `scope` 에 I 의 단원(· 구획)이 있다.
5. 판본의 주인과 그 반의 주인이 **지금도** 같은 범위다: 같은 계정이거나, 책이 지점 공유이고 둘 다 지금 그 지점의 승인된 계정이다.
6. 판본의 주인 계정이 정지 · 삭제 상태가 아니다.

- **진도 표를 읽지도 쓰지도 않는다.** 예습 배정은 진도 기록 없이 열린다.
- 반을 옮기면 반 배정은 **지금 반**을 따른다. 개별 배정은 학생을 따른다.
- 배정하는 사람은 그 반 · 학생의 소유 범위 안이어야 하고(`requireOwnedClass` · `requireOwnedStudent`, F14) 그 판본을 읽을 수 있어야 한다.
- 회수는 줄을 지우지 않고 `revoked_at` 을 찍는다.

| 사건                      | 학생에게 일어나는 일                                  | 반영      |
| ------------------------- | ----------------------------------------------------- | --------- |
| 배정 회수 · 만료          | 403                                                   | 다음 요청 |
| 반 이동                   | 옛 반의 배정은 닫히고 새 반의 배정이 열린다           | 다음 요청 |
| 학생 계정 끔 · 퇴원       | 세션이 끊긴다(기존 동작)                              | 다음 요청 |
| 영상 연결 중지            | «게시 중지»                                           | 다음 요청 |
| QR 중지 · 판본 종료       | 안내 화면                                             | 다음 요청 |
| 주인이 지점을 떠남        | 그 책의 지점 공유가 풀리고, 동료 반의 배정이 닫힌다   | 다음 요청 |
| 교사의 `textbook` 메뉴 끔 | **학생 열람은 그대로다.** 편집 · 발행 · 배정만 막힌다 | —         |
| 찍은 종이 · 저장한 PDF    | 회수 못 한다                                          | —         |

## 10. 격리

- 책 · 판본 · 구획 · 배치 · 확정본 · 자산 · 영상 · 연결은 전부 주인 계정의 것이다. 지점 관리자도 남의 초안을 넘겨다보지 않는다.
- 지점 공유는 책 단위로 주인이 켠다. 동료는 발행본을 **읽고 · 자기 반에 배정하고 · 재출제**한다. 초안은 공유되지 않는다. 동료가 고치려면 사본이다.
- 읽기 조건의 세 겹(공유 상태 · 보는 사람이 지금 그 지점 · 주인도 지금 그 지점)과 지점 이동 때의 되돌림은 v01 §3.3 그대로다.
- 확정본을 계정마다 따로 두는 까닭: 영상 연결이 확정본에 붙는다. 확정본을 서비스 전체가 공유하면 한 지점이 건 영상이 다른 지점의 책에서 열린다.
- 바이트 저장(⑥)만 서비스 전체가 공유한다. 읽는 길은 늘 주인 또는 판본 범위를 지나고, 해시만으로 읽는 경로는 없다.
- 학생 쪽은 §9 의 5번 · 6번이 지점 경계다.
- RLS 는 공개 API 를 막을 뿐이다. 앱은 표 주인 권한으로 붙으므로 범위 조건을 `src/lib/textbook/access.ts` 한 곳에 모으고 변이로 잠근다.

## 11. 마이그레이션 · 격리 시험 · 배포

**마이그레이션은 전부 더하기이고 셋으로 나눈다.**

| 묶음 | 내용                                                                      | 기존 표                           |
| ---- | ------------------------------------------------------------------------- | --------------------------------- |
| (가) | 새 표 17개와 그 트리거 · 함수                                             | 안 건드린다                       |
| (나) | 메뉴 CHECK 넓히기(v01 §4 — `textbook` 과 영어 세 id, 가드 시험 기준 수정) | `user` 의 제약 하나를 다시 건다   |
| (다) | `test_problem.snapshot_id`                                                | nullable 칸 하나 + FK + 부분 색인 |

`schema.prisma` 에서 기존 모델에 느는 것은 관계 필드와 (다)의 칸 하나다.

**격리 시험**(공유 DB 에 붙지 않는다)

| 층          | 무엇을                                                                                                                                                      | 어떻게                                                                           |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| SQL         | 마이그레이션이 깨끗이 올라간다 · CHECK 가 NULL 로 뚫리지 않는다 · 부분 유일 색인                                                                            | pglite(메모리 Postgres)에 기존 표의 최소 꼴을 세우고 초안 SQL 을 돌린다          |
| 트리거      | 발행 판본의 구획 · 배치 UPDATE/DELETE 거절 · QR 의 slug/대상 UPDATE 와 DELETE 거절 · 확정본 UPDATE 거절 · 격리 문항 확정본 INSERT 거절 · 바이트 UPDATE 거절 | pglite. 통과해야 할 길(확정 트랜잭션의 문장 순서 · `published → retired`)도 같이 |
| 바이트      | 조각을 모은 해시가 Node 의 해시와 같다 · 구간 읽기 · 크기 CHECK                                                                                             | pglite                                                                           |
| CAS         | 같은 구획 revision 으로 두 번 → 둘째는 0행 · 구획 저장은 집계를 올린다 · 확정은 낡은 집계에 0행 · 조판 걸음의 임대는 한 요청만 잡는다                       | pglite + API 대역                                                                |
| 계약 · 해시 | 검증 벡터 · 모르는 칸 거절 · 키 순서와 무관 · 문자열을 한 글자 바꾸면 달라짐 · `raw_source` 는 해시에 안 든다                                               | vitest                                                                           |
| 확정본      | 원본 행의 그림 배열 넷이 `raw_source` 에 글자 그대로 · 길이가 안 맞는 배열은 `payload` 에서 null · 확정본 → 지면 행 투영이 은행 지면과 같은 값을 준다       | vitest                                                                           |
| API         | 주인 격리 · 공유 세 겹 · 자격 제외 사유 · 같은 요청 두 번 · 시험지 표에 쓰기 0 · 확정 검사 각각 · 확정이 본문의 쪽 · 해시를 받지 않는다                     | 메모리 DB 대역(`branchLibrary.test.ts` 방식)                                     |
| 발행 조판   | 합성 판본을 로컬 Chromium 으로 걸음 조판 → 쪽 계획 · 진단 · QR 전수 읽기 · 학생용 PDF 의 글자에 정답 표지 0건 · 페이지가 바깥 요청을 0건 낸다               | Playwright 또는 `launchExportBrowser`                                            |
| 재출제      | 은행 문항의 정답을 고친 뒤에도 재출제 시험지의 인쇄 · 채점표 · 자동 채점이 확정본의 정답을 쓴다 · 통로 밖에서 내용을 읽는 파일이 생기면 빨강                | vitest + 전수 가드                                                               |
| 학생        | 허용 목록(`STUDENT_CAPABILITIES`) · 복귀 주소 허용 목록 · QR 모양에 정답 칸 0(정책 `never`) · 배정 판정의 여섯 조건 각각                                    | vitest · RTL                                                                     |
| 변이        | 트리거 한 줄 · 범위 조건 · 자격 검사 · 학생용 걷어내기 · 복귀 주소 검사 · 내용 통로를 지우면 짝 시험이 빨개진다                                             | 기존 변이 하네스 방식                                                            |

pglite 는 지금 `package.json` 에 없다. 개발 의존성으로 더하거나 스크립트 전용으로 둔다 — 실제 Postgres 와 트리거 · `sha256` · `string_agg(bytea)` · `num_nonnulls` 가 같게 도는지는 그 시험이 스스로 보인다. 공유 DB 의 드라이런을 대신하지는 않는다.

**배포 순서**(24번 문서 §6.1 «DB 먼저 · 코드 나중»과 기존 적용기 관례)

1. 마이그레이션 파일 · 계약 · 가드 시험을 병합한다. 새 표를 읽는 코드는 아직 없다.
2. 적용기(`scripts/qa/apply-*-migration.ts` 꼴 — 그 마이그레이션 **하나만**)를 드라이런으로 돌려 실행될 문장을 확인한다. `migrate dev` · `migrate deploy` · `db push` 는 쓰지 않는다.
3. (가) · (나)를 적용한다. 그 뒤 확인: 표 17개 · 트리거 목록 · 제약 목록이 기대와 같은가, 기존 표의 행 수와 제약이 그대로인가.
4. `TEXTBOOK_PUBLIC_ORIGIN` 을 운영 환경에 넣는다.
5. 코드를 병합한다. 메뉴가 있는 계정에서 책 만들기 → 담기 → 구획 저장 → 사전 검사까지 연기를 본다.
6. 재출제를 낼 때 (다)를 같은 순서로 적용하고, 그 뒤에 내용 통로 코드를 병합한다.

- **되돌리기**: 새 표가 비어 있는 동안은 표와 함수를 지우면 끝이다. 발행본이 하나라도 생긴 뒤에는 지우지 않는다 — 인쇄된 QR 이 그 행에 달려 있다. 넓힌 CHECK 와 빈 `snapshot_id` 칸은 둬도 해가 없다.
- 적용을 멈춰야 하는 경우: 드라이런이 계획에 없는 기존 표 문장을 보인다 · 다른 트랙의 미적용 마이그레이션이 같이 잡힌다 · pglite 시험이 빨갛다.
- 사용자가 검증된 병합 · 푸시를 위임했다는 것이 리드의 전제다. 그 위에 내가 새 승인 절차를 보태지 않는다. 적용 대상과 영향의 판단은 구현 단계의 몫이다.
- **메뉴 기본값**: 꺼 둔 메뉴만 저장하는 구조라 새 메뉴는 승인된 모든 계정에 켜진다(v01 §4 6번). 지금까지의 메뉴가 전부 그렇게 나갔고, 리드 통합안도 그 관례를 따른다.

## 12. 작업 분할과 바깥 검증 한계

### 12.1 트랙

리드 통합안의 단계(P1 · P2-A~D · P3)에 맞춰 내 몫(P2-A — 서버)을 가른 것이다.

| 트랙                       | 내용                                                                                                           | 앞선 것                            |
| -------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `tb-base` (P1)             | 계약 셋 · 정규 해시와 벡터 · 스키마 · 마이그레이션 (가)(나)(미적용) · 적용기 · pglite 시험 · 메뉴 두 곳 · 가드 | —                                  |
| `tb-store` (P2-A)          | 조각 올리기 · 바이트 저장 · 자산 · 구간 읽기                                                                   | base                               |
| `tb-capture` (P2-A)        | 담기(시험지 · 문항) · 자격 · 그림 동결 · 확정본 어댑터 · 견주기                                                | store                              |
| `tb-edit-api` (P2-A)       | 책 · 판본 · 구획 · 배치의 API 와 CAS · 새 개정 초안                                                            | base                               |
| `tb-video` (P2-A)          | 영상 등록 · 연결 · 검수 상태                                                                                   | capture                            |
| `tb-assign` (P2-A)         | 배정 · 회수 · 판정 함수                                                                                        | base                               |
| `tb-publish` (P2-A + P2-B) | **조판 측정 먼저** · 사전 검사 · 예약 · 조판 걸음 · 확정 · 산출물                                              | store · edit-api · 조판 번들(P2-B) |
| `tb-qr-api` (P2-A)         | 학생 QR 내용 · 그림 라우트 · 학생 모양                                                                         | publish · video · assign           |
| `tb-export-api` (P2-A)     | 조각 내보내기 · 가져오기의 서버 쪽                                                                             | edit-api                           |
| `tb-reissue` (P2-D)        | 마이그레이션 (다) · 내용 통로 · 전수 가드 · 재출제 API                                                         | capture · 발행본 하나              |

`tb-base` 뒤로 `tb-store` · `tb-edit-api` · `tb-assign` 이 나란히 간다. 원본 v15 가 있어야 하는 것은 P3 뿐이다.

### 12.2 바깥 검증 한계 — 구현은 하고, 검증은 «미실행»으로 보고한다

| 한계                         | 구현할 수 있는 것                          | 못 하는 것                                                                                                |
| ---------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| v15 원본 소스가 없다         | 계약 · 어댑터의 틀 · 합성 견본으로 전 경로 | 실제 2-1-1 이관과 259쪽 회귀(I-20). 견본을 실물처럼 보이지 않는다                                         |
| 실제 문제 해설영상이 없다    | 등록 · 검수 · 연결 · 재생 · «준비 중»      | 실제 영상의 재생 확인. `required` 판본의 발행                                                             |
| 실물 인쇄                    | 서버가 만든 PDF 의 QR 전수 읽기(I-18)      | 종이를 폰으로 찍기(I-19) · 20~24mm 크기 확정. `/dev/print-check` 에 «대기»로 올린다                       |
| 운영 로그인 · 실제 학생 계정 | 대역과 시험용 계정                         | 운영에서의 QR → 로그인 → 복귀(I-07)                                                                       |
| 서버리스 Chromium 의 한도    | 로컬 Chromium 으로 같은 코드의 측정        | 운영 환경에서의 시간 · 메모리 · Chromium 내려받기. 미리보기 배포에서 재야 한다                            |
| 정식 주소의 영속             | 설정값 검사                                | 주소가 바뀌면 찍힌 QR 이 전부 죽는다. 인쇄 전에 주소를 못 박는 것은 사람의 결정이다                       |
| DB 용량                      | 상한과 구간 읽기                           | 발행본 하나에 PDF 조각과 합친 파일이 100MB 안팎 쌓인다(견본 42.5MB 기준 추정). 요금제 여유는 확인 못 했다 |
| 유튜브의 접근 통제           | 주소를 권한 뒤에 둔다                      | 주소를 아는 사람의 시청을 막는 것                                                                         |

## 13. 리드 통합안에 대한 수정 요청

`textbook-studio-20261003.md` 를 줄 단위로 대 봤다. 방향 · 범위 · 순서에 이견이 없다. 아래 일곱은 통합안이 «무엇을»까지 적고 «어떻게»가 비어 있는 자리다. 계획에 적혀야 구현이 갈라지지 않는다.

| #   | 통합안의 자리                                       | 요청                                                                                                                                                                                                    |
| --- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | «발행본은 … 고정한다»                               | 불변을 **DB 트리거**로 지킨다고 적는다(§3.3). 앱의 약속만으로는 스크립트와 다음 라우트를 못 막는다                                                                                                      |
| C2  | «기존 자산 저장을 재사용할 경우 …»                  | 재사용하지 않는다. `workspace_asset` 은 올리는 중에 바이트가 바뀌고 계정을 지우면 같이 지워진다. 내용 해시가 열쇠인 불변 저장(`textbook_blob`)을 둔다. `user_id` FK 는 RESTRICT                         |
| C3  | 문항 가져오기                                       | 확정본 표에 **외벽 트리거**를 건다(F3). 안 걸면 교재가 격리된 문항이 나가는 새 길이 된다. 자격은 문항마다 직접 묻는다(§6.1)                                                                             |
| C4  | «서버가 정본에서 실제 layout/pageMap … 을 확인한다» | 그 방법을 §6.3 으로 적는다: 걸음 단위 서버 조판 · 요청 전부 가로채기 · 만든 PDF 다시 읽기 · 확정은 `requestId` 만 받는다. **조판 한도 측정이 `tb-publish` 의 첫 일**이고 결과에 따라 묶음 크기를 정한다 |
| C5  | «snapshot 기반 시험지 경로나 불변 시험지 payload»   | §6.5 로 정한다: `test_problem.snapshot_id` + 내용 통로 하나 + 전수 가드. 기존 표의 유일한 변경이라는 것과 마이그레이션을 따로 낸다는 것을 적는다                                                        |
| C6  | QR 예약                                             | 예약한 QR 은 지워지지 않는다. 그래서 초안의 «빼기»와 «판본 버리기»의 뜻이 달라진다(§3.3). 화면 설계가 알아야 한다                                                                                       |
| C7  | 학생 접근                                           | 교사의 메뉴가 꺼져도 학생 열람은 그대로라는 것, 주인이 지점을 떠나면 동료 반의 배정이 닫힌다는 것을 정책으로 적는다(§9)                                                                                 |

통합안의 다음 자리는 내 설계와 같아 그대로 받는다: 메뉴 기본값 · 소유와 공유 · `Problem.userId` 를 쓰지 않음 · `c14n` 판과 벡터 · 손실 있는 직렬화기를 해시 입력으로 쓰지 않음 · 인쇄 모양과 QR 해설 공개의 분리 · 개념 강의 진도 규칙 보존 · 자동 정리 작업 없음 · 마이그레이션 문단.

**표결: 조건부 승인.** C1~C7 이 계획에 반영되면 승인이다.

## 14. 합의에서 정할 것 · 확인 못 한 것

**정할 것**

| #   | 물음                                              | 내 권고                                                                        |
| --- | ------------------------------------------------- | ------------------------------------------------------------------------------ |
| Q1  | `assetId` 를 내용 해시로 둘까(§3.4)               | 그렇게 한다                                                                    |
| Q2  | 발행 PDF 의 정본 — 합친 한 파일 / 조각 목록       | 둘 다 적고, 합친 파일이 64MB 를 넘으면 조각 목록만                             |
| Q3  | 발행 PDF 의 바이트를 DB 에 둘까                   | 둔다(구간 읽기). `textbook_blob` 은 뒤에 객체 저장으로 옮겨도 해시가 안 바뀐다 |
| Q4  | 학생 글 해설 정책의 기본값                        | `never`                                                                        |
| Q5  | 열람 기록 표(`textbook_qr_open`)를 넣을까         | 넣는다면 학생 × QR 한 줄, 횟수와 두 시각만                                     |
| Q6  | 배정으로만 열린 개념 강의의 시청 기록             | 1차는 남기지 않는다(기존 판정을 안 건드린다)                                   |
| Q7  | 주인이 지점을 떠나거나 정지될 때 인쇄된 책        | 닫는다(§9). 떠나기 전에 «닫히는 배정» 목록을 관리자에게 보인다                 |
| Q8  | 초안은 책마다 하나                                | 그렇게 시작한다                                                                |
| Q9  | 원본 문항이 지워진 확정본의 재출제                | 시험지로는 못 낸다. 교재 탭의 발췌 인쇄(확정본만 읽는 지면)를 따로 둘지 정한다 |
| Q10 | 새 의존성 넷(QR 만들기 · 읽기 · ZIP · PDF 합치기) | `tb-base` 에서 후보를 재고 판을 고정                                           |

**확인 못 한 것**

- v15 소스와 `manuscript.json` 의 실제 모양. `[[…]]` · `{{…}}` 표기의 실제 문법.
- 운영 DB: 메뉴 CHECK 의 지금 정의 · 강의와 영상의 행 수 · 용량 · 격리 명부의 크기.
- 운영의 정식 주소. 메모에는 `today.aywa.co.kr` 로 적혀 있으나 이번에 확인하지 않았다.
- `db` 확장의 벽이 `include` 로 딸려 오는 문항에도 걸리는지. 설계는 걸리지 않는다고 보고 자격을 직접 묻는다.
- 서버리스 Chromium 으로 48쪽 묶음을 조판하고 다시 읽는 시간과 메모리. Chromium 페이지 안에서 `pdfjs-dist` 와 QR 읽기가 도는지. 함수 응답 · 요청 크기 한도의 실제 값 — 설계는 1MB 조각이라 한도에 기대지 않는다.
- 편집 화면 미리보기(교사의 브라우저)와 서버 조판의 줄바꿈이 같은지. 같은 번들 · 같은 글꼴 · 같은 치수를 쓰지만 플랫폼이 다르다. 쪽 계획의 정본은 서버 것이고, 차이가 나면 미리보기가 틀린 쪽이다.
- 시험지 문항을 다루는 파일은 `src` 안에서 grep 으로 셌다. `scripts/` · 내보내기(HWPX · PDF) 쪽이 문항 내용을 따로 읽는지는 보지 않았다 — 전수 가드를 쓸 때 다시 센다.
- pglite 가 이 SQL(트리거 · `sha256` · `SET STORAGE EXTERNAL`)을 실제 Postgres 와 같게 다루는지.
- 엔진 SVG 를 지면에 넣는 방식. 은행 · 시험지는 HTML 로 넣고(v01 E14) 그래야 글꼴이 같다. 교재도 같은 길을 쓰되 담을 때 허용 목록 검사를 통과한 것만 — 이 검사가 지금 엔진 산출물 전부를 통과시키는지는 재지 않았다.
- 20~24mm QR 의 실제 읽힘.
