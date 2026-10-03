# 교재 제작 탭 — 구조 검토 (Claude · 계획 검토 단계)

- 대상: `D:/tmp/textbook-tab-20261003/brief-v01.md` (검토용 계획 v01)
- 기준: `main` = `origin/main` = `2cb791dce` (2026-10-03 fetch 로 확인)
- 맡은 범위: 앱 통합 · 저장 · 보안 · 권한 회수 · 성능 · 재사용 · 파일/시험 목록
- 한 일: 코드 · 마이그레이션 · 설치된 Next 16.3 문서 · Supabase 스킬을 읽고, 가드 시험 둘을 돌리고, 견본 PDF 와 KaTeX 비용을 쟀다. **제품 코드 · DB · 운영 API 는 건드리지 않았다.**
- 임시 조사 파일: `D:/tmp/textbook-tab-20261003/claude-inspect/` (`peek*.py` · `katex-cost.cjs` — 읽기 전용, 대화 속 명령은 실행하지 않았다)

## 0. 결론과 표결

**표결: 수정 후 승인(revise).** 방향(수학 메뉴 안의 독립 탭 · 구조화된 데이터 · 저장 · 학생용/교사용 인쇄)은 맞다. 다만 v01 그대로 구현에 들어가면 아래 다섯이 실제로 깨진다. 이 다섯을 계획에 반영하면 승인한다.

1. **메뉴 CHECK 가 이미 어긋나 있다.** 지금 `main` 에서 가드 시험이 빨갛다(2건 실패 — §1 E2). `textbook` 메뉴를 코드에만 더하면 2026-10-01 «선생님 승인이 안 됨» 사고가 그대로 되풀이된다.
2. **`WorkspaceDocument` 의 새 종류로는 책 한 권을 못 담는다.** 저장할 때마다 참조된 그림의 바이트를 전부 읽는 반복문이 트랜잭션 안에 있다(§1 E4). 견본 PDF 기준 그림 152종 · 36MB 다. **전용 표**로 간다(§3).
3. **병합이 곧 배포다.** 새 표를 읽는 코드를 `main` 에 밀면 Vercel 이 배포하고, 표가 없으면 그 경로가 500 이다. DB 먼저 · 코드 나중이고, 공유 DB 적용은 승인이 따로 필요하다(§4).
4. **원본(v14)은 손에 없다.** 견본 PDF 는 260쪽이고 대화 기록 속 v14 는 259쪽이다(코디네이터 통지: Codex 가 v13 으로 확인). 편집기 기능과 «원본 이관»을 갈라야 한다(§10).
5. **학생용 지면이 정답을 실어 보내면 안 된다.** 인쇄 페이지가 클라이언트에서 쪽을 나누면 내용이 브라우저로 간다. 학생용은 서버에서 정답 · 해설을 걷어낸 뒤 보내야 한다(§6.4).

## 1. 확인한 사실

«확인»은 이 워크트리에서 파일을 읽거나 명령을 돌려 본 것이다. «기록»은 공유 대화에 적힌 말이고 실물로 검증하지 않았다.

| #   | 사실                                                                                                                                                                                                                                                                                         | 근거                                                                                                                                                                                       | 구분                                                            |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| E1  | 메뉴는 `WORKSPACE_MENUS` 배열과 `workspaceMenuSchema` enum **두 곳**에 따로 적는다                                                                                                                                                                                                           | `src/contracts/accountAccess.contract.ts:13-44`                                                                                                                                            | 확인                                                            |
| E2  | `user_disabled_menus_valid` 의 마지막 정의는 `english` 하나만 안다. 코드는 `english-school` · `english-maker` · `english-library` 셋을 쓴다(`6b39454a9`). `workspaceMenuConstraint.test.ts` **2건 실패**                                                                                     | `prisma/migrations/20261001180000_user_menus_check_all/migration.sql` · `npx vitest run` 2026-10-03 13:49                                                                                  | 확인                                                            |
| E3  | 꺼 둔 메뉴는 `ALL_WORKSPACE_MENUS` 에서 켠 것을 뺀 값으로 저장한다 — 영어 메뉴 하나를 끄면 CHECK 밖 값이 들어간다                                                                                                                                                                            | `src/app/api/admin/users/[id]/route.ts:227`                                                                                                                                                | 확인(운영 DB 의 실제 제약은 못 봄)                              |
| E4  | 자료 저장은 ① 본문 3.5MB 상한 ② `updateMany where revision` 으로 CAS ③ **참조 자산마다 `findUnique`(select 없음 → `bytes` 포함)** ④ 자산 연결을 전부 지우고 다시 만든다 ⑤ 저장마다 감사 한 줄                                                                                                | `src/lib/privateDocumentActions.ts:115 · 187-193 · 203 · 210 · 229`                                                                                                                        | 확인                                                            |
| E5  | Prisma 트랜잭션 시간 설정이 없다(기본값을 쓴다)                                                                                                                                                                                                                                              | `src/lib/db.ts` — `transactionOptions` 없음                                                                                                                                                | 확인(기본 5초는 Prisma 문서 지식)                               |
| E6  | 관문은 `/api/library` 를 `library · studio · export` 로만 연다. 안쪽 `authorizePrivate` 는 `conceptBlank` 도 받는다 — **두 목록이 어긋나 있다**                                                                                                                                              | `src/lib/accountRouteAccess.ts:74` · `src/lib/privateWorkspace.ts:94`                                                                                                                      | 확인                                                            |
| E7  | `/api` 밖 경로는 기본 통과다. 인쇄 페이지를 관문 목록에 안 적으면 메뉴를 끈 계정도 연다                                                                                                                                                                                                      | `src/lib/accountRouteAccess.ts:135-139`                                                                                                                                                    | 확인                                                            |
| E8  | 자산 올리기는 `studio` 또는 `export` 메뉴가 있어야 한다. 상한 64MB · 1MB 조각 · 응답에 `Content-Security-Policy: sandbox`                                                                                                                                                                    | `src/lib/privateAssets.ts:15 · 75 · 87 · 104`                                                                                                                                              | 확인                                                            |
| E9  | 세션을 읽을 때마다 DB 에서 메뉴 · 지점 · 정지 여부를 새로 읽는다. 화면은 30초마다 · 창에 돌아올 때 다시 확인한다                                                                                                                                                                             | `src/lib/auth.ts:224-260` · `src/components/unified/useWorkspaceAccess.ts:14`                                                                                                              | 확인                                                            |
| E10 | 관문이 API 요청마다 감사 기록을 한 줄 **기다려서** 쓴다                                                                                                                                                                                                                                      | `src/proxy.ts:181-193` · `src/lib/audit.ts`                                                                                                                                                | 확인                                                            |
| E11 | 지점을 옮기면 그 계정의 자료가 전부 비공개로 돌아간다(다시 들어와도 옛 공유가 되살아나지 않게)                                                                                                                                                                                               | `src/app/api/admin/users/[id]/route.ts:241-`                                                                                                                                               | 확인                                                            |
| E12 | 인쇄 페이지 선례 둘 — 개념 백지(서버 컴포넌트 · 크롬 없음) · 영어(페이지에서 메뉴와 소유를 다시 확인). 두 지면 모두 `@page` 를 다시 선언하지 않고 `A4Page`(`TestPrint.module.css`)의 것을 쓴다. 작업실 CSS 에도 `@page` 가 있어 같은 창에 실리면 여백이 뒤바뀐다 — 그래서 크롬 없는 페이지다 | `src/app/(main)/concept-blank/print/page.tsx` · `src/app/(main)/english/sets/[id]/print/page.tsx` · `src/components/print/A4Page.tsx` · `src/components/unified/Workspace.module.css:1692` | 확인                                                            |
| E13 | 서버 PDF 는 HTML 800만 자 · 60초 상한이고 페이지의 JS 를 끈다                                                                                                                                                                                                                                | `src/lib/export/pdfServer.ts:20` · `src/app/api/exports/pdf/route.ts:10`                                                                                                                   | 확인                                                            |
| E14 | KaTeX 는 한 경로(`renderKatexSafe` · `UI_KATEX_OPTIONS`)이고 `\htmlClass` 만 신뢰한다. `MarkdownRenderer` 는 날 HTML 을 안 받는다. `SourceEditorRenderer` 는 `rehype-raw` 를 쓰고, `ProblemContent` 는 `figureSvg` 를 HTML 로 넣는다                                                         | `src/lib/math/katexRender.ts` · `src/components/math/MarkdownRenderer.tsx` · `src/components/math/editor/SourceEditorRenderer.tsx:851` · `src/components/math/ProblemContent.tsx:174`      | 확인                                                            |
| E15 | 강의 표(`ConceptLecture`)는 주소가 비어도 되는 초안을 허용한다. 학생 시청 경로는 `/learn/watch/[id]`. `package.json` 에 QR 라이브러리가 없다                                                                                                                                                 | `prisma/schema.prisma:486-514` · `src/app/learn/watch/[id]` · grep 0건                                                                                                                     | 확인(강의 행 수는 못 봄)                                        |
| E16 | 중등 엔진에 중2 유리수 · 단항식 모듈이 있다(`m2Rational.ts` · `m2Mono.ts` 외). 화면에서 직접 부르는 곳은 dev 페이지 둘뿐이고, 제품에서는 기억 학습이 부르며, 문제은행에는 적재 스크립트로 들어간다                                                                                           | `src/lib/middle/` 88파일 · `src/app/dev/mid-engine` · `src/app/dev/tier-bench/m2` · `src/lib/math-srs/generator.ts` · `scripts/import/load-engine-problems.ts`                             | 확인                                                            |
| E17 | 견본 PDF: **260쪽** · A4 · Chromium 출력(2026-09-29) · 글자 155,426자 · 그림 배치 407곳 / 서로 다른 그림 152종 / 그림 바이트 36.4MB / 가장 큰 그림 4.2MB / 그림 있는 쪽 37쪽                                                                                                                 | PyMuPDF 로 `C:/Users/user/Downloads/인재원_수학_2-1-1_수와식_학생용.pdf` 를 읽음                                                                                                           | 확인                                                            |
| E18 | 대화 기록의 마지막 포장 스크립트는 `manuscript.json` 을 `questions`(문항 → `prompt` · `answer` · `solution`)와 `pages`(`page` · `unit` · `section_name` · `section_start`)로 읽는다. README 를 259쪽 · 해설 87쪽 · 1,039문항 · 71구획으로 고친다                                             | 공유 대화 항목 1791                                                                                                                                                                        | **기록**(실물 없음)                                             |
| E19 | KaTeX 8,000식 = **3.9초 · HTML 15.5MB**(식 하나 평균 1,942바이트, 원문 평균 27자)                                                                                                                                                                                                            | `claude-inspect/katex-cost.cjs` · katex 0.16.47 · 이 기계의 Node                                                                                                                           | 확인(8,000식은 가정 — 1,039문항 × 지문 · 답 · 해설 + 개념 지면) |
| E20 | Next 16.3: 관문(proxy)의 본문 버퍼는 기본 10MB 이고 넘으면 **오류 없이 잘린다**. 서버 함수는 관문 경로가 따로 없으니 함수 안에서 권한을 확인하라고 적혀 있다. 라우트의 `params` 는 Promise 다                                                                                                | `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/proxyClientMaxBodySize.md` · `03-file-conventions/proxy.md` · `route.md`                                  | 확인                                                            |
| E21 | 이 워크트리에는 `.env` 가 없다 — DB 를 읽지 않았다                                                                                                                                                                                                                                           | `ls -a`                                                                                                                                                                                    | 확인                                                            |

못 본 것은 §12 에 모았다.

## 2. v01 항목별 수정안

| v01            | 판정 | 고칠 것                                                                                                                                                                                                                                                                                                                                                                             |
| -------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 메뉴 · 권한  | 수정 | 메뉴 id `textbook` 을 **두 곳**(E1)에 더하고, 메뉴 CHECK 를 넓히는 마이그레이션을 같이 낸다 — 그 목록에 `english-school` · `english-maker` · `english-library` 도 넣어 지금의 어긋남(E2)을 같이 닫는다(가드 시험의 기준도 고쳐야 초록이 된다 — §4). 관문에 `/api/textbook` 과 `/textbook`(인쇄) **두 줄**을 적는다(E7). 새 메뉴가 전 계정에 바로 켜지는지는 결정이 필요하다(§11 D1) |
| 2 데이터 모델  | 수정 | 책(목차 · 설정)과 구획(본문)을 **따로 저장**한다. 쪽 번호는 저장하지 않고 계산한다(E18 의 `pages` 는 결과물이지 원본이 아니다). 형식 판(`schemaVersion`)은 NOT NULL + CHECK. 문항에는 책 안에서 바뀌지 않는 id 를 준다(해설지 · 쪽 참조의 열쇠)                                                                                                                                     |
| 3 화면 흐름    | 수정 | «빈 책에서 시작해 인쇄까지»를 원본 없이도 되는 1차 범위로 못 박는다. 원본 가져오기는 그 위의 별도 트랙이다(§10). PDF 를 띄우는 화면을 편집기라고 부르지 않는다                                                                                                                                                                                                                      |
| 4 HTML/JS 금지 | 보강 | 금지를 계약으로 적는다(§5). 본문은 블록 타입 + 글 + `$…$` 뿐. 그림은 해시로만 가리킨다. `SourceEditorRenderer` 와 `figureSvg` 경로는 쓰지 않는다(E14)                                                                                                                                                                                                                               |
| 5 저장         | 수정 | `WorkspaceDocument` 새 종류가 아니라 전용 표(§3). CAS 는 구획 단위. 브라우저 임시본은 상태 이름을 따로 둔다                                                                                                                                                                                                                                                                         |
| 6 화면 시안    | 조건 | D-07 은 원장님 확정이 원칙이다. 이번은 «3자 합의에 위임»이라는 말을 결정 기록에 그대로 적고, 05 번 문서에 `[확정]` 을 남긴 뒤 구현한다. 메뉴 자리 · 저장 상태 문구 · 충돌 화면 · 지면 서체가 여기 걸린다                                                                                                                                                                            |
| 7 조판         | 수정 | 쪽 나누기를 구획 단위로 가둔다(§7). 빈 장 · 채움 글을 자동으로 넣지 않고, 홀짝이 어긋나면 **경고**만 낸다                                                                                                                                                                                                                                                                           |
| 8 검증         | 보강 | 학생용 정답 누출을 화면 DOM 이 아니라 **서버가 보낸 내용**에서 잰다. 가드 변이 · `npm run build` · 260쪽 견본 측정 · 글꼴 가드를 더한다(§9)                                                                                                                                                                                                                                         |
| 9 병합         | 수정 | 마이그레이션 병합 → 공유 DB 적용(승인) → 코드 병합의 **세 걸음**으로 나눈다(§4)                                                                                                                                                                                                                                                                                                     |

## 3. 저장 — 계정/지점 범위

### 3.1 왜 `WorkspaceDocument` 의 새 종류가 아닌가

| 문제                                         | 근거                                                                                          | 책 한 권에서 일어나는 일                                                                                                                                   |
| -------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 저장마다 그림 바이트를 다 읽는다             | E4 ③                                                                                          | 152종 · 36MB 를 트랜잭션 안에서 읽는다. 시간 설정이 없어(E5) 기본 한도에 걸릴 가능성이 높다                                                                |
| 본문 3.5MB 상한 · 통째 저장                  | E4 ①                                                                                          | 글자만 15만 자(E17)에 수식 원문 · 해설을 더하면 1~2.5MB 로 **추정**된다. 들어가더라도 글자 하나 고칠 때마다 그만큼을 올리고 JSONB 한 칸을 통째로 다시 쓴다 |
| CAS 가 책 단위                               | E4 ②                                                                                          | 한 사람이 두 기기에서 다른 단원을 고쳐도 409. 409 한 번이 책 전체의 미저장분을 건다                                                                        |
| 종류마다 갈래가 흩어져 있다                  | `EDITOR_MENU` · `problemCountOf` · 이름 바꾸기 · 사본 · `PrivateLibrary` · `ADMIN_KIND_LABEL` | 여섯 자리를 다 고쳐야 하고, 교재가 «내 시험지» 목록에 시험지와 섞여 나온다                                                                                 |
| 관문 · 자산 권한 목록이 메뉴를 손으로 적는다 | E6 · E8                                                                                       | 교재만 켠 계정은 저장도 그림 올리기도 403                                                                                                                  |

종류 CHECK 를 넓히는 마이그레이션은 어차피 필요하다. 마이그레이션을 피할 수 없다면 맞는 모양으로 한 번 한다.

### 3.2 권고 — 전용 표 셋 (초안 · 적용 금지)

```
textbook                     책 한 권 — 목차와 설정
  id uuid PK · user_id uuid FK(user, CASCADE)
  title varchar(120) · course jsonb(학년 · 학기 · 권 표기)
  outline jsonb              단원 → 구획 id 의 순서 · 구획 이름 · 종류 · 시작 면 규칙 · 쪽 수 캐시
  settings jsonb             판형 · 여백 · 머리/꼬리 — 지면 확정 뒤 채운다
  schema_version int NOT NULL CHECK (= 1)
  status varchar(12) NOT NULL CHECK (in 'importing','ready')
  revision int NOT NULL DEFAULT 1 CHECK (> 0)
  visibility varchar(20) NOT NULL DEFAULT 'private' · shared_branch_id uuid FK(branch, RESTRICT)
      CHECK (private ↔ NULL, branch ↔ NOT NULL)   ← workspace_document 와 같은 짝 제약
  created_at · updated_at
  INDEX (user_id, updated_at) · INDEX (shared_branch_id, visibility, updated_at)

textbook_section             구획 하나 — 본문
  textbook_id uuid FK(textbook, CASCADE) · id varchar(40)     PK (textbook_id, id)
  kind varchar(16) NOT NULL CHECK (계약의 구획 종류와 같은 글자)
  content jsonb NOT NULL CHECK (jsonb_typeof = 'object')
  revision int NOT NULL DEFAULT 1 CHECK (> 0)
  created_at · updated_at

textbook_section_asset       구획이 가리키는 그림 — 읽기 범위의 색인
  textbook_id · section_id · user_id · asset_id               PK (textbook_id, section_id, asset_id)
  FK (textbook_id, section_id) → textbook_section CASCADE
  FK (user_id, asset_id) → workspace_asset CASCADE            INDEX (user_id, asset_id)
```

- **그림 바이트는 기존 `workspace_asset` 을 그대로 쓴다.** 내용 해시가 id 라 같은 그림은 한 번만 저장되고(견본: 배치 407 → 152종), 조각 올리기 · 해시 검증 · sandbox 응답이 이미 있다(E8). 새로 만드는 것은 연결 표와 교재용 읽기 경로뿐이다.
- 연결 표를 **구획 단위**로 둔다. 구획 하나를 저장할 때 그 구획의 연결만 바꾼다. 자산 확인은 `select: { id, size }` 까지만 하고 바이트는 읽지 않는다. 올리다 만 자산은 `octet_length(bytes) = size` 한 질의로 가른다 — 이 질의가 바이트를 풀지 않는지는 pglite 로 재서 확인한다(§12).
- 새 표 셋 모두 RLS 를 켜고 정책은 두지 않으며 `anon` · `authenticated` 의 권한을 걷는다(`20261002053000` 과 같은 꼴 — Supabase 스킬 5번). 앱은 Prisma 로 표 주인 권한으로 붙으므로 **RLS 는 공개 API 를 막을 뿐 앱의 실수는 못 막는다.** 그래서 범위 조건을 한 파일에 모으고 시험으로 잠근다.
- CHECK 는 NULL 을 통과시킨다. 그래서 판 · 상태 · 종류는 전부 NOT NULL 이다(20번 교훈 2026-10-02).
- 본문 안을 질의하지 않으므로 JSONB 색인은 두지 않는다. 목록 질의는 요약 칸만 고른다(`content` 를 안 읽는다).

### 3.3 범위 규칙

- **주인은 계정**(`user_id`)이다. 지점 관리자도 남의 교재를 넘겨다보지 않는다 — `ownerScope.ts` 머리말이 «작업실 문서 · 자료는 안 넘는다»고 적어 둔 것과 같은 편이다.
- **지점 공유는 주인이 켠다.** 읽기 조건은 `sharedDocumentWhere`(`src/lib/privateWorkspace.ts:147`)와 같은 세 겹이다: 공개 범위가 지점 · 보는 사람이 지금 그 지점의 승인된 계정 · 주인도 지금 그 지점의 승인된 계정. 세션에 실린 지점 값은 믿지 않고 DB 에서 다시 읽는다(같은 파일 124행).
- 동료는 **읽기와 사본**만 한다. 사본은 비공개 독립본이다.
- 지점을 옮길 때 교재도 비공개로 되돌린다 — E11 의 자리에 교재 표를 더한다. 빠뜨리면 옛 지점에 다시 들어갔을 때 예전 공유가 살아난다.
- 최고관리자 열람(`/api/admin/users/[id]/documents`)에는 1차에 교재를 넣지 않는다. 넣는다면 감사 기록이 같이 가야 한다(§11 D5).

### 3.4 충돌 안전 (CAS)

| 동작             | 요청                                                                   | 규칙                                                                                           |
| ---------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 책 만들기        | `POST /api/textbook/books`                                             | id 는 브라우저가 짓는다(uuid). 같은 id 가 있으면 409                                           |
| 목차 · 설정 저장 | `PUT /api/textbook/books/{id}` + `expectedRevision`                    | `updateMany where { id, user_id, revision }` 한 문장. 0행이면 409                              |
| 구획 저장        | `PUT …/sections/{sid}` + `expectedRevision`(새 구획은 `null`)          | 같은 한 문장. 종류를 바꾸는 저장은 거절. 책의 `revision` 은 올리지 않고 `updated_at` 만 찍는다 |
| 구획 지우기      | 목차에서 빼는 저장이 먼저, `DELETE …/sections/{sid}?revision=` 이 나중 | 목차에 없는 구획 행은 «보관된 구획»으로 30일 남긴다 — 실수로 지운 구획을 되살리는 길이다       |
| 구획 더하기      | 구획 저장이 먼저, 목차 저장이 나중                                     | 둘째가 409 여도 구획 행은 남아 있어 잃는 것이 없다                                             |

- **409 에서 자동으로 덮어쓰지 않는다.** 최신 판을 받아 다시 보내는 길을 만들지 않는다 — `PrivateCloudClient.save` 의 주석(«never adopt a newer base and resend…»)이 지키는 규칙이다. 개념 백지의 409 처리(다시 읽고 다시 저장)는 «고르기뿐이라 잃을 것이 없다»는 전제라 **교재에 베끼면 안 된다.**
- **응답을 잃은 저장**은 다시 읽어 «보낸 내용 그대로 · 기대한 다음 판»일 때만 성공으로 본다(`privateCloudClient.ts` 의 `save` 뒷부분을 그대로 쓴다).
- **브라우저 임시본**은 IndexedDB 에 `계정 id : 책 id : 구획 id` 로 두고 기준 판을 같이 적는다. 상태는 다섯으로 가른다: 이 기기에만 있음 / 저장 안 됨 / 저장 중 / 계정에 저장됨 / 다른 기기에서 바뀜. 화면 문구는 D-07 · D-08 대상이다.
- 탭을 닫을 때의 마지막 저장은 믿지 않는다. `keepalive` 요청은 본문 64KiB 한도가 있어(웹 표준 지식) 임시본이 먼저 쓰이고 네트워크는 그다음이다.
- 저장 빈도: 입력이 멈춘 뒤 3초 · 길어도 30초에 한 번. 요청마다 관문이 감사 한 줄을 쓰므로(E10) 글자마다 보내지 않는다. 구획 저장에는 감사 줄을 따로 남기지 않고, 만들기 · 지우기 · 공유 · 가져오기 · 사본에만 남긴다.

## 4. 마이그레이션과 배포 순서

1. **마이그레이션 둘, 둘 다 넓히기만 한다.**
   - (가) 새 표 셋 — 옛 코드는 이 표를 모른다. 가장 안전한 부류다(영어 표 셋 `20260930120000` 과 같다).
   - (나) `user_disabled_menus_valid` 를 다시 건다: 지금 목록 + `textbook` + 영어 세 id. 옛 값 `english` 는 남긴다 — 그 값이 든 행이 운영에 있는지 확인하지 못했다. 같은 파일에서 DROP 뒤 ADD(`ADD CONSTRAINT IF NOT EXISTS` 는 없는 문법이다 — Supabase 스킬 `schema-constraints`).
   - 가드 시험도 같이 고친다. 지금 시험은 CHECK 목록을 `ALL_WORKSPACE_MENUS`(옛 `english` 없음)와 견주고, 둘째 단정은 enum(`english` 있음)과 배열을 견준다 — 영어 메뉴를 셋으로 가른 뒤로는 어떤 마이그레이션을 내도 초록이 될 수 없는 기준이다. CHECK 목록을 enum 과 견주고, 배열과 enum 의 차이는 «옛 통합 키 하나»로 못 박는다.
2. **적용은 한 파일씩 · 드라이런 먼저.** `scripts/qa/apply-english-studio-migration.ts` 꼴의 적용기를 쓴다. `migrate dev` · `migrate deploy` · `db push` 는 쓰지 않는다 — 다른 트랙의 미적용 마이그레이션까지 같이 들어간다. 적용 전에 pglite 로 SQL 을 돌려 본다.
3. **공유 DB 가 곧 운영 DB 다.** 로컬 개발도 같은 Supabase 를 쓴다. 적용은 승인을 받아야 하고, 브리프가 위임한 것은 병합 · 푸시 · 워크트리 정리까지로 읽힌다(§11 D4).
4. **병합 세 걸음.** ① 마이그레이션 파일 + 계약 + 가드 시험을 병합(새 표를 읽는 코드 없음) → ② 승인 뒤 공유 DB 에 적용하고 확인 → ③ 라우트 · 화면을 병합. ①과 ③을 한 번에 밀면 배포된 코드가 없는 표를 읽는다.
5. **되돌리기.** 새 표는 비어 있는 동안 지우면 된다. 넓힌 CHECK 는 그대로 둬도 해가 없다.
6. **메뉴 기본값.** 꺼 둔 메뉴만 저장하는 구조라(E3) 새 메뉴는 승인된 모든 계정에 **바로 켜진다.** 일부 계정에만 먼저 열려면 (나)를 적용한 뒤 · 코드를 내기 전에 기존 계정의 `disabled_menus` 에 `textbook` 을 넣는 데이터 걸음이 따로 있어야 한다(§11 D1). 옛 코드는 모르는 메뉴 값을 걸러 읽으므로 그 사이에 깨지지 않는다(`normalizeWorkspaceMenus`).

## 5. 가져오기 계약 · 상한

- **계약은 원본과 따로 정한다.** `src/contracts/textbook.contract.ts` 가 우리 형식의 정본이다. v14 `manuscript.json` 이 돌아오면 «v14 → 우리 형식» 변환기를 따로 쓴다. 계약이 v14 의 모양을 닮을 필요는 없다.
- **모르는 칸은 버리지 않고 거절한다**(`strictObject`). 모르는 판도 사유와 함께 거절한다. «모르는 칸은 버린다»가 내용을 소리 없이 지운 전례가 있다(20번 교훈 2026-10-02).
- **본문에 넣을 수 있는 것**
  - 블록 타입: 제목 · 문단 · 대화(화자 · 표정 · 글) · 개념 상자 · 통문장(반복 1~4) · 문항(지문 · 답 · 해설 · 풀이 공간) · 그림 · 강의 연결 · 쪽 나눔(사람이 넣은 것만)
  - 글: 평문과 `$…$` 수식. HTML 태그 · `javascript:` · `data:` · 외부 주소가 보이면 거절
  - 수식: 길이 상한. `\href` · `\url` · `\includegraphics` · `\htmlId` · `\htmlStyle` · `\htmlData` · `\htmlClass` · `\def` · `\newcommand` · `\gdef` 는 원문에서 거절(`\htmlClass` 는 전처리가 만드는 것만 통과 — E14)
  - 그림: 64자 해시만. 주소는 화면이 책 id 와 해시로 짓는다. 파일 이름은 표시용이고 경로 구분자 · `..` · 주소 꼴이면 거절
  - 강의: `ConceptLecture` 의 id 만. 주소를 본문에 적지 않는다
- **상한(잠정 — 합의에서 고친다)**

  | 대상         | 상한                                         | 근거                                                                                 |
  | ------------ | -------------------------------------------- | ------------------------------------------------------------------------------------ |
  | 구획 JSON    | 256KB(보내는 쪽 `TextEncoder` 로 잰 바이트)  | 견본 기준 구획당 15~20KB **추정**. `keepalive` 64KiB 는 넘을 수 있어 임시본이 먼저다 |
  | 목차 JSON    | 256KB                                        | 구획 150개                                                                           |
  | 책           | 단원 12 · 구획 150 · 문항 2,000 · 그림 300종 | 기록상 v14 는 단원 6 · 구획 71 · 문항 1,039(E18), 견본 그림 152종(E17)               |
  | 그림 하나    | 8MB, 올리기 전에 인쇄 해상도로 줄인다        | 견본 최대 4.2MB. 기존 상한 64MB 는 책에 과하다                                       |
  | 책의 그림 합 | 128MB                                        | 견본 36MB 의 세 배 남짓                                                              |

- **가져오기는 구획 단위로 올린다.** 파일은 브라우저가 읽어 같은 계약으로 먼저 검사하고, 책을 `importing` 상태로 만든 뒤 구획을 하나씩 올리고, 마지막에 서버가 개수 상한을 다시 세어 `ready` 로 바꾼다. 한 요청에 책 전체를 싣지 않는다(관문 버퍼는 넘치면 조용히 잘린다 — E20). 끊기면 책은 `importing` 으로 남아 이어 올리거나 지울 수 있다.
- **ZIP · PDF · HWP 는 받지 않는다.** JSON 과 그림 파일 여럿을 고르는 것까지다. PDF 는 구조로 되돌릴 수 없다.

## 6. 그림 · 주소 · 영상 · 회수

### 6.1 그림 주소

- 읽기: `GET /api/textbook/books/{bookId}/assets/{sha256}`. 조건은 «이 책을 읽을 수 있는가 + 이 책의 구획이 이 그림을 가리키는가» 한 질의다. 기존 방식처럼 본문 문자열 속 주소를 정규식으로 찾아 `?ownerId=` 를 붙이는 일(`sharedAssetUrls`)을 하지 않는다.
- 올리기: 조각 올리기 규약은 그대로 쓰되 권한을 인자로 받게 `writePrivateAsset` 을 고치고 `/api/textbook/assets/{sha256}` 에서 부른다(E8 — 지금은 `studio` · `export` 만 된다). 형식은 PNG · JPEG · WebP · SVG 로 좁힌다.
- SVG 는 `<img>` 로만 쓴다. HTML 로 넣지 않는다. 응답의 sandbox 머리는 그대로 받는다.
- 외부 그림 주소는 없다. 인쇄가 남의 서버에 기대지 않고, 열람 사실이 밖으로 나가지 않는다.
- 사본은 그림 행을 새 주인 앞으로 복제한다(자산 PK 가 `(user_id, id)` 다). 책 하나에 36MB 가 그대로 늘어난다 — §11 D9.

### 6.2 영상 · QR

- 본문은 강의 id 만 갖는다. QR 이 가리키는 곳은 `/learn/watch/{id}` 로 고정한다(학생 로그인 뒤 시청 — D-124 의 범위 안).
- **게시된 강의에만 QR 을 찍는다.** 초안 · 주소 없는 강의 · 없는 id 는 편집 화면에 «영상 없음»으로 보이고 지면에는 아무것도 안 찍는다. 인쇄 시점에 서버가 다시 확인한다.
- 지금은 QR 을 만드는 코드도 강의 데이터도 확인되지 않았다(E15 · CLAUDE.md 는 강의 표가 비었다고 적는다 — 직접 못 봄). **1차에는 칸만 두고 QR 은 안 찍는다.** QR 라이브러리 추가와 외부 QR 서비스 금지는 그때 정한다.
- 찍힌 QR 은 회수할 수 없다. 강의를 내리면 그 경로가 «준비 중»을 보여야 한다 — `/learn/watch` 의 지금 동작은 확인하지 않았다.

### 6.3 권한 회수 (인쇄 포함)

| 회수 사건                                | 막는 자리                                                                             | 반영 시점                |
| ---------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------ |
| 메뉴 끔                                  | 관문 두 줄(`/api/textbook` · `/textbook`) + 라우트의 메뉴 확인 + 인쇄 페이지의 재확인 | 다음 요청(E9)            |
| 계정 정지 · 삭제 · 승인 취소             | 세션이 다음 요청에서 끊긴다                                                           | 다음 요청                |
| 지점 공유 끔 · 지점 이동                 | 읽기 조건 세 겹 + 지점 이동 때 비공개로 되돌림                                        | 다음 요청                |
| 열어 둔 편집 화면                        | `can("textbook")` 이 거짓이 되면 화면을 내린다                                        | 30초 안 · 창에 돌아올 때 |
| 열어 둔 인쇄 창 · 찍은 종이 · 저장한 PDF | **회수 못 한다**                                                                      | — 문서에 적어 둔다       |

- 인쇄 페이지 주소에는 책 id 만 넣는다. 내용을 주소에 싣지 않는다.
- 인쇄 페이지는 요청마다 서버가 그리며 응답은 `no-store` 여야 한다 — 뒤로 가기로 예전 지면이 되살아나지 않는지 시험으로 확인한다(§9).
- 동료가 연 공유본은 브라우저에 임시본을 만들지 않는다(읽기뿐이다).
- 주인의 임시본은 메뉴가 꺼져도 기기에 남는다. 화면이 안 열리니 읽히지는 않지만 공용 PC 에서는 남은 자료다 — 지우면 권한이 돌아왔을 때 미저장분을 잃는다. **남기되 저장된 구획의 임시본은 저장 직후 지운다**를 권한다(남는 것은 미저장분뿐).

### 6.4 학생용 · 교사용

- 출력은 셋이다: 학생용 / 교사용(본문에 답 표시) / 정답과 해설. 주소의 `view` 로 가른다.
- **학생용은 서버가 답 · 해설 · 교사 메모를 걷어낸 구획만 브라우저로 보낸다**(`toStudentSection`). 쪽 나누기가 브라우저에서 돌므로, 걷어내지 않으면 화면에 안 보여도 페이지 원문에 답이 있다. 영어 지면이 정답을 다른 상자로 흘린 전례가 있다(25 §12).
- 교사용도 같은 메뉴 · 같은 범위 확인을 탄다. 더 약한 문이 없다.

## 7. 200쪽 성능

재 본 것: 8,000식 3.9초 · 15.5MB(E19), 서버 PDF 상한 800만 자 · 60초(E13). 여기서 나오는 규칙이다.

1. **편집 화면은 책 전체를 그리지 않는다.** 지금 펼침면과 앞뒤 하나씩만 올린다. 목차의 쪽 번호는 구획별 쪽 수 캐시의 누적합으로 낸다.
2. **쪽 나누기는 구획 안에서 끝난다.** 구획은 새 쪽에서 시작하므로 구획 하나를 고치면 그 구획만 다시 나누고, 뒤 구획은 쪽 번호만 민다. 여백을 좌우 대칭으로 뒤집으면 본문 폭이 같아 홀짝이 바뀌어도 다시 조판할 필요가 없다 — 쪽 번호 자리만 CSS 로 바뀐다.
3. **쪽 나누기는 순수 함수다.** `paginateSection(구획, 재는 함수) → 쪽 계획`. 재는 함수를 인자로 받는다 — 브라우저에서는 고정 치수(96dpi A4 794×1123)의 숨은 틀에서 실제 높이를 재고, 단위 시험에서는 고정 값을 준다. 미리보기와 인쇄 페이지가 같은 함수 · 같은 컴포넌트 · 같은 치수를 쓴다(«같은 문제는 같은 뷰»).
   - 대안은 개념 백지의 `planSheet` 처럼 DOM 을 안 재는 어림이다(`src/components/concept-blank/paper/paginate.ts`). 서버에서도 같은 답이 나오는 것이 장점이고, 대화 · 분수 · 그림이 섞인 자유 본문에서는 어림을 크게 잡아야 해 빈 자리가 늘어난다. 문항 지면은 행 높이가 고정된 틀이라 어림으로 충분할 수 있다 — 지면 시안과 같이 정한다.
4. **펼침면 정렬은 펼침면 단위 계산이다.** 좌우 문항 행의 시작 · 풀이선 · 하단을 맞추려면 두 쪽의 행 높이를 같이 정해야 한다. 그래도 구획 밖으로는 안 나간다.
5. **홀짝 규칙은 경고다.** 구획이 홀수 쪽으로 끝나고 다음 구획이 왼쪽 시작이면 «한 쪽이 남습니다»를 알린다. 빈 장 · 읽을거리 · 문항을 자동으로 넣지 않는다. 빈 쪽은 사람이 넣는 블록으로만 생긴다.
6. **인쇄는 브라우저 인쇄가 기본이다.** 책 전체 HTML 은 서버 PDF 상한을 넘는다(15.5MB > 800만 자). 단원 단위 인쇄를 기본으로 두고 «전체»는 견본으로 잰 뒤 연다.
7. **네트워크.** 책 열기 = 목차 한 번 + 지금 구획 한 번. 나머지 구획은 볼 때 받는다. 목록 질의는 본문을 읽지 않는다.
8. **묶음.** 다른 뷰처럼 `dynamic(…, { ssr: false })` 로 올려 메뉴가 없는 계정은 받지 않는다.

잠정 기준은 §9 «규모»에 적었다. 재기 전에 적는 규칙이다 — 재고 나서 고치지 않는다(20번 교훈 2026-09-30).

## 8. 문제은행 · 엔진 재사용

| 쓸 것                   | 자리                                                                       | 주의                                                                                                                                                                                    |
| ----------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 수식 · 글 렌더          | `MathText` → `MarkdownRenderer` → `renderKatexSafe`                        | 새 KaTeX 경로를 만들지 않는다. `MathText` 는 `normalizeOcrText` 를 거친다 — OCR 본문용 정리(개행 합치기 · 보기 표식 줄바꿈)가 **직접 쓴 글**을 바꾸지 않는지 짝 시험으로 확인한 뒤 쓴다 |
| A4 틀 · 지면 변수       | `src/components/print/A4Page.tsx` · `PAPER_CSS_VARIABLES`                  | `@page` 를 다시 선언하지 않는다(E12)                                                                                                                                                    |
| 조각 올리기 · 해시 자산 | `writePrivateAsset` · `PrivateCloudClient.uploadChunks`                    | 권한 인자를 더한다                                                                                                                                                                      |
| CAS · 응답 유실 복구    | `privateDocumentActions.ts` 의 `updateMany` 꼴 · `PrivateCloudClient.save` | 409 자동 재전송은 가져오지 않는다                                                                                                                                                       |
| 지점 공유 조건          | `sharedDocumentWhere` 의 세 겹                                             | 교재 표용으로 같은 꼴을 한 파일에                                                                                                                                                       |
| 오류 기록 틀            | `withErrorLog`                                                             | 새 라우트 전부. 경로는 글자 그대로 적는다(`errorLogRouteCoverage.test.ts`)                                                                                                              |
| 인쇄 창 띄우기          | `src/components/concept-blank/paper/PrintNow.tsx`                          |                                                                                                                                                                                         |
| 지면 하네스             | `e2e/concept-blank-paper`                                                  | 워크트리에서 KaTeX 글꼴 대신 HTML 이 200 으로 오는 일이 있었다 — 글꼴 첫 바이트를 확인하는 가드를 같이 가져온다                                                                         |
| 중2 엔진                | `src/lib/middle/generate.ts` · `m2Rational.ts` · `m2Mono.ts`               | 길이 둘이다(E16): 은행에 이미 적재된 엔진 문항을 고르거나, 기억 학습처럼 엔진을 직접 부른다. 직접 부르는 길은 새 라우트가 필요하다 — 2차                                                |
| 문제은행 문항           | `db`(외벽 조건이 걸린 확장 클라이언트)로만 읽는다                          | 아래                                                                                                                                                                                    |

쓰지 않을 것: `SourceEditorRenderer`(날 HTML 통과) · `/api/exports/pdf` 로 책 전체 · `WorkspaceDocument` 행 · 문항의 `figureSvg` 문자열.

**은행 문항은 사본으로 들인다.** 교재 문항은 책 안의 자기 값이고, 은행 문항 id · 문항번호 · 유형 열쇠는 출처로만 적는다. 은행 행이 고쳐지거나 격리돼도 책이 바뀌지 않는다.

**무엇을 들일 수 있는지는 결정이 필요하다**(§11 D2). 교재는 학생에게 나눠 주는 책이고, 브리프도 «참조 교재를 그대로 베끼지 않는다»고 적는다. 엔진이 만든 문항과 자작 문항만 여는 것을 권한다. 기출은 외벽이 이미 막고, 문제집에서 온 변형본은 출처가 남의 책이다.

**울타리 시험을 둔다.** 문제은행 · 엔진 · 시험지 쪽이 교재 모듈을 import 하지 않고, 교재 표를 읽는 파일이 허용 목록 안에만 있다(`englishFence.test.ts` 와 같은 두 겹).

**답 검증을 지어내지 않는다.** 기록상 v14 는 계산 902건을 따로 검산했다(E18). 그 검산기가 없으면 가져온 답은 «검증 안 됨»으로 표시한다. 엔진 문항만 «엔진 검증»이다.

## 9. 수락 기준

### 9.1 고칠 파일 (정확한 자리)

| 파일                                                                                                                                                                                                                                | 무엇을                                                                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/contracts/accountAccess.contract.ts`                                                                                                                                                                                           | `WORKSPACE_MENUS` 와 `workspaceMenuSchema` **둘 다**에 `textbook`                                                                                 |
| `src/contracts/textbook.contract.ts` (새)                                                                                                                                                                                           | 책 · 구획 · 블록 · 가져오기 · 상한 · 구획 종류                                                                                                    |
| `prisma/schema.prisma` · `prisma/migrations/<둘>` · `scripts/qa/apply-textbook-migration.ts` (새)                                                                                                                                   | §3.2 · §4                                                                                                                                         |
| `src/lib/accountRouteAccess.ts`                                                                                                                                                                                                     | `/api/textbook` · `/textbook` 두 줄                                                                                                               |
| `src/lib/textbook/` (새)                                                                                                                                                                                                            | `access.ts`(권한 + 범위 조건 — 한 곳) · `books.ts` · `sections.ts` · `assets.ts` · `project.ts`(학생/교사 걸러내기) · `paginate.ts` · `import.ts` |
| `src/app/api/textbook/books/route.ts` · `books/[bookId]/route.ts` · `books/[bookId]/sections/[sectionId]/route.ts` · `books/[bookId]/assets/[assetId]/route.ts` · `books/[bookId]/copy/route.ts` · `assets/[assetId]/route.ts` (새) | 전부 `withErrorLog`                                                                                                                               |
| `src/app/(main)/textbook/[bookId]/print/page.tsx` · `loading.tsx` (새)                                                                                                                                                              | 크롬 없는 인쇄 페이지                                                                                                                             |
| `src/components/textbook/` (새)                                                                                                                                                                                                     | 탭 뷰 · 목록 · 목차 · 편집 · 펼침면 미리보기 · 지면 · 임시본 저장소                                                                               |
| `src/components/unified/UnifiedWorkspace.tsx`                                                                                                                                                                                       | `dynamic` import · `mathNav` 한 줄 · 마운트 블록 · `?book=` 딥링크                                                                                |
| `src/components/unified/WorkspaceIcon.tsx`                                                                                                                                                                                          | 아이콘 하나                                                                                                                                       |
| `src/lib/privateAssets.ts`                                                                                                                                                                                                          | 올리기 권한을 인자로                                                                                                                              |
| `src/app/api/admin/users/[id]/route.ts`                                                                                                                                                                                             | 지점 이동 때 교재도 비공개로(241행 근처)                                                                                                          |
| `src/app/dev/print-check/items.ts`                                                                                                                                                                                                  | 실물 검수 항목 추가(상태 «대기»)                                                                                                                  |
| `docs/planning/05-design-system.md` · `07-coding-convention.md` · `CLAUDE.md`                                                                                                                                                       | `[확정]` · 결정 기록 · 문서 표 한 줄                                                                                                              |

### 9.2 시험

**단위 · 계약**

- `workspaceMenuConstraint.test.ts` 가 초록이다(지금 2건 빨강 — 기준을 §4 처럼 고친 뒤). 고친 시험이 CHECK 에서 메뉴 하나를 빼면 빨개지는지 변이로 확인한다.
- `textbookSchemaConstraint.test.ts`(새): 마이그레이션의 마지막 CHECK 목록(구획 종류 · 상태 · 공개 범위 · 판)이 계약과 같은 글자다. 판 · 상태 · 종류가 NOT NULL 인지도 본다.
- `textbookContract.test.ts`(새): 모르는 칸 거절(버리지 않음) · 모르는 판 거절 · HTML/주소/금지 TeX 거절 · 상한 · 그림 해시 꼴.
- `textbookProjection.test.ts`(새): 학생용 결과에 답 · 해설 · 교사 메모 칸이 하나도 없다 — 블록 타입 전부에 대해.
- `textbookPaginate.test.ts`(새): 구획 시작 면 · 누적 쪽 번호 · 홀수로 끝난 구획 뒤는 **경고이고 빈 쪽이 아니다** · 사람이 넣은 쪽 나눔만 쪽을 만든다.
- `textbookFence.test.ts`(새): §8 울타리 두 겹 + 스캐너가 눈멀지 않았는지 음성 대조.
- `accountRouteAccess.test.ts`: 메뉴 없으면 `/api/textbook/**` · `/textbook/**` 거절, 있으면 통과, 검수 계정 거절.

**API**(메모리 DB 대역 — `branchLibrary.test.ts` 와 같은 방식. 원격 DB 에 붙지 않는다)

- `textbookBooks.test.ts`: 남의 책은 404 · 공유 읽기는 세 겹이 다 맞을 때만 · 동료의 저장 · 지우기 · 이름 바꾸기는 403 · 사본은 비공개 독립본.
- `textbookSectionCas.test.ts`: 낡은 판은 409 이고 한 글자도 안 바뀐다 · 같은 판으로 둘이 동시에 보내면 **정확히 하나**만 성공 · 응답 유실 뒤 재확인 · 종류 바꾸기 거절 · 지워진 구획 저장은 404 · 저장 중 그림 바이트를 읽지 않는다(`select` 를 단정).
- `textbookImport.test.ts`: 상한을 보내는 쪽 인코더의 바이트로 잰다 · 개수 초과 400 · `importing` 에서 끊겨도 이어 올린다 · 끝맺을 때 서버가 다시 센다.
- `textbookAssets.test.ts`: 책이 가리키지 않는 그림은 404 · 공유를 끄면 동료에게 404 · sandbox 머리.
- `adminBranchAssignment.test.ts`: 지점 이동 뒤 교재가 비공개다.
- 변이: 관문의 교재 두 줄 · 범위 조건 · 학생용 걸러내기를 각각 지우면 짝 시험이 빨개진다. 지워도 초록이면 그 시험은 가드가 아니다.

**컴포넌트**

- `UnifiedWorkspace.access.test.tsx`: 메뉴가 있을 때만 줄이 보인다 · 꺼지면 화면이 내려가고 해시가 기본 뷰로 돌아간다.
- 교재 뷰: «이 기기에만 있음»과 «계정에 저장됨»이 다른 글자다 · 409 뒤 내 수정본이 남아 있고 다시 보내지 않는다.

**지면**(실제 Chromium · 인쇄 매체)

- 넘침 0: 분수 · 긴 대화 · 긴 문항 · 그림 · 마지막 쪽이 든 견본으로. 글꼴 가드 먼저.
- 미리보기와 인쇄 페이지의 쪽별 블록 id 가 같다.
- 짝수 왼쪽 · 홀수 오른쪽 · 여백 대칭 · 같은 펼침면의 문항 행 시작이 0.5px 안.
- 학생용 인쇄 페이지의 **응답 본문**에 답이 0건(견본 답을 유일한 표지 글자로 심는다).
- 메뉴를 끈 뒤 인쇄 주소를 다시 열면 막힌다 · 뒤로 가기로 예전 지면이 안 나온다.

**규모**(견본은 «견본 — 실제 교재 아님»이라 적힌 합성 책: 260쪽 · 1,039문항 · 71구획 · 그림 152종)

- 책 열기에서 첫 펼침면까지 2초 안(PC).
- CPU 4배 감속에서 입력 지연 p95 100ms 안.
- 올라가 있는 쪽 6장 이하.
- 8쪽 구획 다시 나누기 300ms 안.
- 구획 저장 왕복이 그림 수에 따라 늘지 않는다(그림 0종과 150종의 차가 오차 안).
- 전체 인쇄 페이지가 30초 안에 준비되고 쪽 수가 계획과 같다. 넘으면 단원 단위 인쇄만 연다.
- 390px 폭에서 목록 · 목차 · 읽기가 된다(편집 범위는 §11 D7).

**관문**: `npm run type-check` · `npm run lint` · `npm run lint:affordance` · `npm run build`(tsc · vitest 가 못 보는 것을 본다) · `errorLogRouteCoverage.test.ts`.

**실물**: 지면이 바뀌므로 `/dev/print-check` 에 항목을 «대기»로 올린다. 종이 확인은 원장님 몫이고 에이전트가 «통과»로 바꿀 수 없다.

## 10. 작업 분할

| 트랙        | 내용                                                                                        | 원본 필요 | 앞선 것                      |
| ----------- | ------------------------------------------------------------------------------------------- | --------- | ---------------------------- |
| `tb-base`   | 계약 · 메뉴 두 곳 · 스키마 · 마이그레이션 둘(미적용) · 적용기 · pglite 드라이런 · 가드 시험 | 아니오    | — (리드가 먼저, 혼자)        |
| `tb-api`    | 권한 · 범위 · 책/구획/자산 라우트 · API 시험 · 변이                                         | 아니오    | base                         |
| `tb-paper`  | 지면 컴포넌트 · 쪽 나누기 · 지면 하네스 · 합성 견본                                         | 아니오    | base · 지면 시안             |
| `tb-editor` | 탭 통합 · 목록 · 목차 · 편집 · 미리보기 · 임시본 · 충돌 화면                                | 아니오    | base · api · Wire/Hi-fi 확정 |
| `tb-print`  | 인쇄 페이지 · 학생/교사 걸러내기 · 검수 항목                                                | 아니오    | paper · api                  |
| `tb-import` | 우리 형식 가져오기(구획 단위 올리기)                                                        | 아니오    | api                          |
| `tb-v14`    | v14 → 우리 형식 변환기 · 2-1-1 이관 · 검산                                                  | **예**    | import · 원본 회수           |
| `tb-reuse`  | 은행 고르기 · 엔진으로 채우기                                                               | 아니오    | 결정 D2                      |
| `tb-qr`     | 강의 연결 · QR                                                                              | 아니오    | 게시된 강의가 있을 때        |

- `tb-base` 다음은 `tb-api` · `tb-paper` 가 나란히 간다. `tb-editor` 는 시안 확정을 기다린다.
- **원본 없이 끝낼 수 있는 것**: `tb-v14` 를 뺀 전부. 빈 책에서 시작해 쓰고 · 저장하고 · 학생용/교사용으로 뽑는 길이 원본과 무관하게 선다.
- **원본이 있어야 하는 것**: 2-1-1 의 실제 내용. 견본 PDF(260쪽)는 v14 가 아니고, PDF 에서 구조를 되살릴 수 없다. 원본이 안 돌아오면 «2-1-1 은 아직 옮기지 않았다»가 상태다. 합성 견본이나 일부 단원을 실물처럼 보여 주지 않는다.
- 병합은 §4 의 세 걸음. 밀 수 있는 단위마다 `origin` 병합 → type-check → 묶음 리뷰 → 푸시.

## 11. 정해야 할 것

| #   | 물음                                           | 권고                                                                                                                                                                                              | 정하는 사람                           |
| --- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| D1  | 새 메뉴가 전 계정에 바로 켜져도 되나           | 처음엔 원장님 계정만. 나머지는 꺼 둔 채로 낸다                                                                                                                                                    | 원장님                                |
| D2  | 은행에서 교재로 들일 수 있는 문항              | 엔진 문항 + 자작만                                                                                                                                                                                | 원장님                                |
| D3  | 지점 공유를 1차 화면에 넣나                    | 표의 칸과 읽기 조건 · 시험은 처음부터, 화면의 공유 단추는 시안에 포함해 같이 확정                                                                                                                 | 3자 합의                              |
| D4  | 공유 DB 에 마이그레이션을 적용해도 되나 · 언제 | 드라이런 결과를 보이고 승인받은 뒤                                                                                                                                                                | 원장님(코디네이터가 위임 범위를 확인) |
| D5  | 최고관리자 열람에 교재를 넣나                  | 1차 제외                                                                                                                                                                                          | 3자 합의                              |
| D6  | QR                                             | 1차는 칸만 · 인쇄에 안 찍는다                                                                                                                                                                     | 3자 합의                              |
| D7  | 휴대폰에서 어디까지                            | 목록 · 목차 · 읽기. 본문 편집은 PC                                                                                                                                                                | 시안과 같이                           |
| D8  | 문서 번호 · 결정 번호                          | `main` 은 27번 · D-153 까지다. 28번 · D-154 는 병합 안 된 다른 트랙이 쓰고 있다고 메모에 있다(직접 확인 못 함). 날짜 붙은 번호 없는 문서로 두고, 결정 번호는 리드가 병합 직전에 fetch 해서 잡는다 | 리드 → 원장님께 먼저 알림             |
| D9  | 사본이 그림을 복제하는 용량                    | 1차는 복제 + 책당 128MB 상한. 늘면 해시 공용 저장을 따로 설계                                                                                                                                     | 3자 합의                              |
| D10 | 지면 서체                                      | 견본 PDF 는 Noto Sans KR · KaTeX · DejaVu 다. 제품 지면 변수와 다르다                                                                                                                             | 시안(D-07)                            |

## 12. 확인하지 못한 것

- **운영 DB 의 실제 상태**: 메뉴 CHECK 의 지금 정의 · 강의 표의 행 수 · DB 용량 여유. 워크트리에 `.env` 가 없어 붙지 않았다. E2 · E3 는 저장소의 마이그레이션 기준이다.
- **v14 원본**: `manuscript.json` 의 실제 모양과 크기. E18 은 대화 속 스크립트가 읽는 칸 이름일 뿐이다. 구획당 15~~20KB · 책 1~~2.5MB 는 견본 PDF 의 글자 수에서 낸 추정이다.
- **Prisma 트랜잭션 기본 5초 · Vercel 본문 4.5MB · `keepalive` 64KiB**: 설정 파일에 값이 없다는 것까지 확인했고 숫자는 지식이다.
- **`octet_length(bytes) = size` 가 바이트를 풀지 않는지**: 재지 않았다. `tb-base` 에서 pglite 로 잰다.
- **브라우저에서 260쪽을 한 번에 인쇄할 수 있는지**: 재지 않았다. E19 는 Node 의 문자열 렌더 시간이지 DOM · 인쇄 시간이 아니다.
- **`normalizeOcrText` 가 직접 쓴 글을 바꾸는지** · **`/learn/watch` 가 내려간 강의에 무엇을 보이는지**: 읽지 않았다.
- **Supabase 변경 기록**: 스킬은 구현 전에 changelog 를 보라고 한다. 이 설계는 Supabase 고유 기능(Auth · Storage · Data API 클라이언트)을 쓰지 않고 Prisma 로 붙는 Postgres 만 쓰므로 받아 보지 않았다. 마이그레이션 파일도 스킬의 `supabase migration new` 가 아니라 이 저장소의 Prisma 마이그레이션 + 단일 적용기 관례를 따른다.
- **설치 부산물**: 이 워크트리의 `package-lock.json` 은 setup 의 `npm install` 이 바꾼 것이다. 커밋에 넣지 않았다.
