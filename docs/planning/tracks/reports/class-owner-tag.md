# 보고 — 관리자 화면의 «누구의 반» 담당 딱지 (D-132 · Hi-fi 3 «꼬리표»)

브리프: `docs/planning/tracks/briefs/class-owner-tag.md` · 결정 **D-132**(07) · 모양 SSOT **05 §8.11** · 범위 **D-130**
워크트리: `chrismathone/class-owner-tag`(829f5aed 에서 갈라짐) · 2026-09-16 · **푸시하지 않았다.**
공유 DB 쓰기 없음 · 마이그레이션 없음 · 인쇄 경로 diff 0 · `DailyReviewSection` · `api/tests/daily-review` 안 건드림.

---

## ① 만든 것

### 계약 — `classOwnerSchema` (`src/contracts/class.contract.ts`)

```ts
classOwnerSchema = z.strictObject({ name: z.string(), mine: z.boolean() })   // name = User.name · mine = 보는 사람의 반
```

| 응답 | 칸 | 관리자 | 관리자 아님 |
|---|---|---|---|
| `GET /api/classes` · `data[]` | `owner` | 모든 행 · **내 반이 맨 위** | **키 없음** · 조회 · 순서 · JSON 글자 그대로 |
| `POST /api/classes` · `data` | `owner` | `{ name: User.name, mine: true }` | 키 없음 |
| `GET /api/tests/{id}` · `data` | `classOwner` | 그 반의 담당 | 키 없음 |
| `GET /api/concept` · `data.rows[]` | `owner` | 모든 행 · 내 반이 맨 위 | 키 없음 |
| `GET /api/studio/overview` · `GET /api/dev/unified/overview` · `data.classes[]` | `owner` | 최근 등록 셋 안에서 내 반이 맨 위 | 키 없음(이 응답은 zod 계약이 없다 — 화면의 손 검사 `isClassOwner` 에 더했다) |

안 실은 곳: `GET/PATCH /api/classes/{id}`(화면이 안 쓴다) · `api/tests/daily-review`(🔴 다른 트랙 — ⑤).

### 판정 · 조회 — 한 곳

| 파일 | 하는 일 |
|---|---|
| `src/lib/class/classOwner.ts` (새) | `showsClassOwner(viewer)` = **`crossesOwnerFence` 만 묻는 유일한 판정** · `CLASS_OWNER_NAME`(조인 조각 `{ user: { select: { name } } }`) · `toClassOwner` · `mineRank` · `mineFirst`(안정 정렬) |
| `src/lib/class/ownerLabel.ts` (새) | 글자 규칙 한 벌 — `MY_CLASS_LABEL`=«내 반» · `OWNER_PICKER_MAX`=6 · `clipOwnerName`(코드 포인트, «…» 없음) · `classOptionLabel` · `classOptionTitle` · `hasOwners` |
| `src/lib/class/recentClasses.ts` (새) | 작업실 개요 «최근 등록한 반» 조회 — 스튜디오 · dev 쌍둥이 라우트가 같이 부른다(따로 적으면 한쪽만 담당이 실린다) |
| `src/components/ui/OwnerTag.tsx` (새) | **딱지 하나** — `tone="ledger"`(기본) / `"workroom"`. 05 §8.11 값 그대로. `data-owner-tag="mine|other"` |

- **관리자 아님 = 넓히기 전과 같다.** 라우트는 `showsClassOwner` 가 거짓이면 **예전 조회 그대로**를 탄다(담당 조인도 안 한다).
  화면은 `isAdmin` 을 읽지 않고 «칸이 있으면 그린다» 하나로 가른다.
- **반 목록의 «내 반 맨 위»** — Prisma 는 «userId = 나» 로 정렬을 못 해서 **[내 반 (createdAt desc)] 뒤에 [나머지 (createdAt desc)]**
  두 묶음을 따로 읽어 이은 줄을 페이지로 자른다. 세기 둘 · 읽기 ≤ 둘, 담당 이름은 읽기마다 `include` 조인 한 번 — **반 수와 무관.**
  페이지 넘김은 pageSize 1·2·3 으로 끝까지 넘겨 «빠짐 · 겹침 없음»을 시험으로 잠갔다.
- **메인 · 개념 판**은 원래 정렬(단계 순 · 학년·이름 순)의 **첫 열쇠로 `mineRank`** 를 끼웠다 — 내 반 묶음 · 나머지 묶음 안의 순서는 그대로다.
- **`POST /api/classes`** 도 관리자면 `owner` 를 싣는다 — `useClassManage` 가 만든 반을 목록 끝에 붙이는데, 안 실으면 «담당» 열에 빈 칸이 선다.
  이름은 세션이 아니라 계정 행(`User.name`)에서 읽는다(조회 1 — 관리자일 때만).

### 화면 — 자리마다 (05 §8.11 표 그대로)

| 자리 | 파일 | 모양 |
|---|---|---|
| 반 · 학생 관리 반 표 | `class/ClassTable.tsx` | 반 · 학년 · **담당** 열(관리자만 머리·칸) |
| 메인 반별 표 | `main/LedgerTable.tsx` · `lib/main/pipeline.ts`(`ClassRow.owner`) | 반 · **담당** · 현재 진도 … |
| 메인 카드 | `main/ClassCard.tsx` | 반 이름 바로 뒤 딱지 |
| 출제 반 고르기 | `test/GenerateSetup.tsx` | `<option>` «반 이름 · 담당 6자» · `option title` 전체 · 닫힌 `select title` = 고른 반 전체 |
| 장바구니 반 고르기 | `problem/BasketPanel.tsx` | 〃 («선택»일 때는 상자 title 없음) |
| 오늘의 개념 판 | `unified/ConceptView.tsx`(+`.module.css` `.ownerCell`) · `lib/concept/adminService.ts` · `adminBoard.ts` | 반 · **담당** · 최근 진도 … — **작업실 결** 딱지 |
| 작업실 개요 «최근 등록한 반» | `unified/TeachingOverview.tsx`(+`.module.css`) · `lib/class/recentClasses.ts` | 반 이름 바로 뒤 딱지(작업실 결) |
| 시험지 검토 머리 | `test/TestReview.tsx` · `useTestReview.ts` | «반 · 학생» 뒤 딱지(`h1` 안) |
| ★ 메인 끝난 반 한 줄 | `main/DoneSummaryRow.tsx` | «반 이름 [딱지] — 메타» |
| ★ 메인 진도 입력 패널 «선택한 반» | `main/ProgressPanel.tsx` | 반 이름 뒤 딱지 |
| ★ 반 · 학생 관리 학생 칸 머리 «반 · 학년» | `class/StudentList.tsx` | «반 · 학년» 뒤 딱지 |

★ = 브리프 표에 없던 자리(찾아서 붙였다). 못 붙인 자리는 ⑤.

### 가짜 Prisma · 픽스처

- `src/mocks/prismaTestDouble.ts` — 반 `findMany`·`findUnique`·`create` 가 `select`/`include` 의 `user` 조인을 푼다(계정 행이 없으면 **던진다**).
  반 `findMany` 는 이제 `select` 를 실제로 자른다(지금까지 무시했다 — 부르는 곳은 `id`·`name`·`grade` 만 골라 영향 없음).
- `src/app/dev/class-owner-hifi/` — 시안의 반 8개 픽스처(시험과 캡처가 같이 쓴다) · 확인 페이지(`?admin=0` = 관리자 아님).
- `src/app/dev/concept-hifi/fixture.ts` — `HifiOptions.owners` 하나 더(개념 판 12반에 담당을 얹는다).
- `src/__tests__/api/teachingOverview.test.ts` — 관리자 개요 모킹 행에 `userId`·`user` 를 더했다(실제 DB 는 고른 조인을 늘 준다 — 없으면 503 이 났다).

### 다른 하네스 앵커 옮김

`adminService` 의 반 조회를 `loadBoardClasses` 로 뺐더니(관리자 조인 갈래) `where: ownedRowsWhere(viewer)` 가 두 줄이 되어
**`mutate-admin-scope.ts` ⑩c·⑩d · `mutate-concept-admin.ts` ② 가 «앵커 2개 — 판정 거부»**였다. 조각을 `const where = ownedRowsWhere(viewer);`
한 줄로 모으고 세 변이의 앵커를 그 줄로 옮겼다(뜻 그대로). `mutate-admin-scope --anchors` 39/39 ✓.

---

## ② 시안과 다른 점

| # | 자리 | 시안 (Hi-fi 3) | 구현 | 까닭 |
|---|---|---|---|---|
| 1 | 메인 반별 표 순서 | 내 반 → 나머지(시안 순서) | 내 반 맨 위 → 나머지는 **지금의 단계 순서**(검수 → 인쇄 → 출제 → 진도 → 끝) | 메인 표의 «할 일 먼저» 정렬을 지킨 채 첫 열쇠로만 내 반을 올렸다 |
| 2 | 메인 반별 표 · 휴대폰 폭 400 | 칸이 눌려 반 이름이 세로로 쌓인다 | 같다. 담당 딱지는 줄바꿈을 안 해 다른 칸이 조금 더 눌린다 · **페이지 가로 넘침 없음**(scrollWidth 400 = 400) | 메인 표는 원래 휴대폰 설계가 없다 — 시안도 같은 모양 |
| 3 | 반 고르는 상자 · 펼친 목록 | 목록을 그림으로 그림 | 브라우저 기본 목록 — 글자만 «반 이름 · 담당 6자»(«이어반 · 이어하기선생»). `option title` · 닫힌 `select title` 은 **속성 값**을 Chromium(Playwright)에서 확인(고른 뒤 «이어반 · 이어하기선생님»). 🔴 **말풍선이 실제로 뜨는지는 못 봤다** — 말풍선은 브라우저/운영체제가 그려 캡처에 안 찍히고, 실물 크롬에서 마우스를 올려 보려면 원장님 화면 포커스를 가져와야 한다(절대 규칙 9). 브리프 경고대로 크롬이 **펼친 목록**의 option title 은 안 띄울 수 있다 → ⑥ Q3 | 확인 방법의 한계 |
| 4 | 오늘의 확인테스트 한 줄 | 딱지 있음 | **안 붙였다** | 다른 트랙이 고치는 중 — ⑤-1 |
| 5 | 오늘의 개념 판 열 | 반 · 담당 · 이번 주 진도 | 반 · **담당** · 최근 진도 · 강의 · 다음 차시 · 강의 · 끝까지 본 학생 | 실제 판의 열이 시안보다 많다 — 담당은 시안대로 반 바로 뒤 |
| 6 | 메인 카드 · 끝난 반 한 줄(★) | (시안에 없음) | 딱지가 **반을 고르는 단추 안**에 선다 — 커서는 그 단추의 손가락(누르면 실제로 반이 골라진다, D-30 거짓말 아님). 마우스를 올리면 줄 바탕 `hover:bg-side` 와 딱지 바탕이 같은 회색이라 딱지 테두리가 묻힌다 | 카드 줄 전체가 단추인 기존 구조 → ⑥ Q2 |
| 7 | 작업실 개요 «최근 등록한 반»(시안에 없음) | — | **작업실 결** 딱지(`#EEF1F5`/`#172B4D`) | 05 §8.11 은 작업실 결을 «오늘의 개념 판»에만 적었지만 이 카드도 글자색 `#172b4d` 작업실 결이다 |
| 8 | 시험지 검토 머리(시안에 없음) | — | `h1` 안 «반 · 학생» 뒤 — 관리자면 제목의 접근 이름에 담당이 붙는다 | 머리 한 줄 모양을 안 바꾸는 가장 작은 자리 |
| 9 | 원장님 계정의 «내 반» | 맨 위 «목요 심화반»은 보기용 예시 | 지금 공유 DB(원장님 계정 반 0개)로는 **«내 반» 딱지가 어디에도 안 선다** — 전부 계정 이름 딱지 | 사실(시험 «반이 0개인 관리자»로 잠금) |

---

## ③ 캡처

`scratch/class-owner-tag/` — `node scripts/qa/class-owner-layout.mjs`(BASE=dev 서버 3241, 임시 `AUTH_SECRET` · `DATABASE_URL=…127.0.0.1:1`).
대상 `/dev/class-owner-hifi` — **실제 컴포넌트** + 시안의 반 8개 픽스처(요청만 가로챈다, DB 안 닿음). 시안은 `hifi-d132-class-owner.html` 3 탭을 같은 폭에서.

| 파일 | 무엇 |
|---|---|
| `side-by-side-1536.png` | 왼쪽 시안 3 탭 · 오른쪽 구현(관리자) — 넓은 폭 |
| `side-by-side-400.png` | 〃 휴대폰 폭 |
| `impl-admin-1536.png` · `impl-admin-400.png` | 구현 전체(반 표 · 장바구니 상자 · 반별 표 · 개념 판 · 카드/끝난 반/진도 입력 · 학생 칸 머리 · 작업실 개요 · 출제 설정 · 검토 머리) |
| `impl-plain-1536.png` | **관리자 아님** — 같은 반 · 담당 키만 뺀 응답. 딱지 0 · «담당» 머리 0 · 상자 title 0 |
| `zoom-class-table.png` · `zoom-ledger.png` · `zoom-cards.png` · `zoom-overview.png` · `zoom-review.png` | 자리별 가까이 |
| `mockup3-1536.png` · `mockup3-400.png` | 시안 3 탭 |
| `layout.json` | 계측 원자료 |

**계측(판정 전부 통과 · 실패 0)**

| 무엇 | 관리자 1536 | 관리자 400 | 관리자 아님 1536 |
|---|---|---|---|
| 딱지 수 | 35 | 35 | **0** |
| «담당» 표 머리 | 3(반 표 · 반별 표 · 개념 판) | 3 | **0** |
| 딱지 계산 스타일(05 §8.11) | 장부: `rgb(233,233,230)`/`rgb(22,22,22)`/500 · 내 반 `rgb(22,22,22)`/흰/700 · 작업실: `rgb(238,241,245)`/`rgb(23,43,77)`/500 · 내 반 `rgb(23,43,77)`/흰/700 · 공통 11.5px · 줄높이 18px · 안쪽 1px 7px · 모서리 3px · 자간 0 · `nowrap` — **35개 전부 일치** | 〃 | — |
| 손가락 커서 | 단추 밖 딱지 31개 전부 `auto` · 단추 안(카드 3 · 내 반 카드 1) `pointer` — ② 6 | 〃 | — |
| 장바구니 상자 | 글자 «이어반 · 이어하기선생» · option title «이어반 · 이어하기선생님» · 고른 뒤 상자 title «이어반 · 이어하기선생님» | 〃 | 글자 반 이름뿐 · title 없음 |
| 출제 상자 | 첫 반 «목요 심화반 · 내 반» · 상자 title «목요 심화반 · 내 반» | 〃 | 〃 |
| 페이지 가로 넘침 | 1536 = 1536 | **400 = 400** | 1536 = 1536 |

눈으로 본 것: 반 표 · 반별 표 · 개념 판 · 작업실 개요 딱지가 시안 3 탭과 같은 결이다. 개념 판은 원장님 반(초6 A반 — 학년 순서로는 둘째)이 맨 위. 검토 머리 캡처는 문항 0개 픽스처라 아래가 비어 있다(머리만 보려는 것).

---

## ④ 시험 · 변이

### 새 시험 — 짝(같은 픽스처 · 같은 계정 · 관리자 표시만 다르게)

| 파일 | 수 | 무엇을 잠그나 |
|---|---|---|
| `api/classOwner.test.ts` | 17 | `GET /api/classes` 관리자 = 모든 행 담당 · 계정 이름(세션 이름 아님) · **내 반 맨 위**(대역에 내 반이 **맨 뒤**로 깔린 계정으로 — 정렬을 지우면 빨개지게) · 관리자 아님 = `owner` 키 없음 + 넓히기 전 직렬화와 **같은 객체** · 조인 한 번(`findMany` ≤ 2 · 계정 따로 안 읽음 · `orderBy createdAt desc` 그대로) · 페이지 넘김 pageSize 1·2·3 끝까지 빠짐/겹침 없음 · 반 0개 관리자 · POST(반만 / 계획 트랜잭션) · `GET /api/tests/{id}` 내 반/남의 반 · `GET /api/concept` 내 반 맨 위 + 나머지 순서 = 반 0개 관리자가 보는 순서 |
| `api/classOwnerOverview.test.ts` | 4 | 스튜디오 · dev 개요 × 짝 — 관리자 아님은 **조회 인자도** 그대로(`userId`/`user` 안 고름) · 최근 셋 그대로 · 셋 안에서 내 반 맨 위 |
| `components/classOwnerTag.test.tsx` | 28 | 딱지 결(장부/작업실 · 내 반) · D-30(span · 커서/hover 없음) · 자르지 않음 · 반 표 머리/칸 · 빈 표 colSpan 2 · 학생 칸 머리★ · 반별 표 머리 · 카드(이름 **바로 뒤**) · 끝난 반★ · 진도 입력★ · 메인 순서(단계가 앞선 남의 반보다 내 반이 위, 나머지 순서 = 관리자 아님 순서) · 장바구니/출제 상자 글자 · option title · 닫힌 상자 title(고르기 전 없음) · 개념 판 · 작업실 개요 · 검토 머리 |
| `unit/classOwnerLabel.test.ts` | 19 | 6자 «이어하기선생님»→«이어하기선생» · 6자 이하 그대로 · **코드 포인트**(확장 한자 7자 = UTF-16 14단위 · 이모지 · 외톨이 서로게이트 0) · «…» 없음 · title 전체 · «내 반» · 판정 빈 값 · `mineFirst` 안정 · 입력 불변 · 개념 판 조립(키째로 없음 / 내 반 맨 위 / 담당 말고는 행 그대로) |
| `unit/classOwnerPrintFree.test.ts` | 2 | 인쇄 경로(`components/print` · `tests/[id]/print` · `lib/print`) 파일 ≥10 을 실제로 읽었나(분모) · 담당 어휘 0 |

TDD 순서: API 짝과 화면 짝은 **먼저 써서 빨강을 봤다**(API 11 실패/6 통과 — 통과 6 은 관리자 아님 짝 · 화면 12 실패/16 통과). 순수 헬퍼(`ownerLabel` · `classOwner`)는 계약 직후 시험보다 먼저 적었다 — 그 시험이 무는지는 아래 변이 ④·⑤ 가 대신 보였다.

### 변이 — `scripts/qa/mutate-class-owner.ts` · **37/37 빨개짐 · 살아남음 0 · 보류 0 · 판정 거부 0 · 원본 md5 일치** (커밋한 상태에서)

| 묶음 | 변이 | 결과 |
|---|---|---|
| ① 싣는 판정 두 방향 | ①a «안 싣는다» · ①b «늘 싣는다» · ①c 빈 값도 관리자 | 🟥🟥🟥 (①b 는 **관리자 아님 짝**이 빨개졌다) |
| ② 그리는 판정 · 자리 | ②a 담당 열 늘 세움 · ②b 안 세움 · ②c 카드 · ②d 검토 머리 · ②e 작업실 개요 · ②f 개념 판 칸 · ②g 장바구니 상자 title · ②h 출제 상자 글자 | 🟥×8 |
| ③ 내 반 맨 위 | ③a 순위 없음 · ③b 묶음 순서 뒤집음 · ③c 페이지 skip · ③d 메인 · ③e 개념 판 · ③f 작업실 개요 · ③g 안정 정렬 아님 | 🟥×7 |
| ④ 6자 | ④a 7자 · ④b UTF-16 · ④c «…» · ④d title 도 잘림 · ④e 상자 안 잘림 | 🟥×5 |
| ⑤ 이름 · 내 반 · 결 | ⑤a 내 반 늘 거짓 · ⑤b 이름 = id · ⑤c «내 반» 없음 · ⑤d 내 반 먹색 아님 · ⑤e POST 이름을 세션에서 | 🟥×5 |
| ⑥ 자리마다 판정 배선 | ⑥a/⑥b 반 목록 늘/안 · ⑥c 반 만들기 · ⑥d 시험지 단건 · ⑥e 개념 판 · ⑥f 작업실 개요 | 🟥×6 |
| ⑦ 조회 한 번 | 반 목록 내 반 묶음 조인 뺌 | 🟥 |
| ⑧ 인쇄 무변화 | 인쇄 경로 diff(829f5aed..작업 트리) **0 파일** ✓ · ⑧a 인쇄 틀이 딱지 import · ⑧b 인쇄 머리에 «담당» | 🟥🟥 |

옮긴 D-130 앵커: `mutate-admin-scope.ts ⑩c ⑩d` **2/2** · `mutate-concept-admin.ts ②` **1/1** 빨개짐(원본 일치). `mutate-admin-scope --anchors` 39/39.

### 관문

| 관문 | 결과 |
|---|---|
| `npx prisma generate` → `tsc --noEmit` | **0** |
| 관련 시험 34파일(새 5 + D-130 짝 · 반/시험지/개념 판/개요 API · 메인 · 반 관리 · 출제 · 장바구니 · 개념 판 · 검토 · 인쇄 · 소유 범위 · noRmSync · 어포던스 가드 · 진도 계획 · 자동 초안 · 오늘의 확인테스트) | **509 통과 · 1 실패 + 1 파일 적재 실패** — 둘 다 **829f5aed 원본에서도 똑같이 실패**(임시 워크트리에서 확인 후 지움): `Main.test.tsx` 적재 «server-only … Client Component» · `TeachingOverview.test.tsx` «세션 로딩» 1건(`/api/dev/unified/overview` 기대 · jsdom 주소 `/` 라 `/api/studio/overview`) |
| `npm run lint` | 내 파일 지적 **0**. 전체는 오류 3 — `scripts/admin/bootstrap-admin.cjs` `require()`(원본 그대로의 파일) |
| `npm run lint:affordance` | 통과 |
| `npm run build` | 통과(컴파일 · TypeScript · `/dev/class-owner-hifi` 는 dev 가드 dynamic) |

사고 둘(해는 없음): ⑴ 다른 하네스 앵커를 세다가 `--anchors` 를 모르는 `mutate-exam-guards.ts` 가 **전량으로 돌았다** — 32/32 빨개짐 · 원본 일치로 끝났고 작업 트리는 깨끗했다. ⑵ 변이 하네스가 도는 중에 `npm run lint` 를 띄워 하네스의 임시 탐침 파일(`.mutate-class-owner.probe.*.ts`)이 사라지는 틈에 ESLint 가 ENOENT 로 멈췄다 — 하네스가 끝난 뒤 다시 돌린 결과가 위 표다.

---

## ⑤ 리드가 정할 것

### ⑤-1 🔴 «오늘의 확인테스트» 한 줄에 딱지 붙이기 — 두 트랙 병합 뒤 리드가

`plan-screen` 트랙이 고치는 중이라 **안 건드렸다**. 붙일 자리와 넘길 칸만 적는다(829f5aed 기준 줄 — 병합 뒤 다시 찾을 것).

| 무엇 | 어디 | 어떻게 |
|---|---|---|
| 계약 | `test.contract.ts` `dailyGroupStudentSchema`(학생 한 줄 — `classId`·`grade`·`className` 옆) | `classOwner: classOwnerSchema.optional()` — 관리자에게만(키째로) |
| 조회 | `api/tests/daily-review/route.ts` `STUDENT_SELECT.class.select` | 관리자면 `userId: true, ...CLASS_OWNER_NAME` 을 더한다 — 🔴 이 상수는 «두 갈래가 같은 칸을 읽어야 한다» 주석이 달린 공용이라 **상수를 둘로 쪼개지 말고** `showsClassOwner(session)` 로 고른 select 하나를 두 갈래에 똑같이 넘긴다 |
| 싣기 | 같은 파일 `planDailyReview({ students: students.map(…) })` 입력 → 응답 학생 줄 | `planDailyReview` 입력에 `classOwner` 를 더해 그대로 흘리거나, 응답을 짓는 자리에서 `classId → toClassOwner(session, s.class)` 표로 붙인다 |
| 그리기 | `main/DailyReviewSection.tsx` «`{s.grade} · {s.className}`» 흐린 글자 `<span>` **바로 뒤**(05 §8.11 «한 줄 목록») — 부족 목록 · 시험기간·진도 못 읽음 목록 둘 다 | `{s.classOwner ? <OwnerTag owner={s.classOwner} /> : null}` — 장부 결 |
| 시험 | `classOwner.test.ts` 의 짝 관례 + `classOwnerTag.test.tsx` 에 한 줄 목록 짝 · `mutate-class-owner.ts` 에 «한 줄 목록이 딱지를 안 그린다» 한 줄 |

### ⑤-2 못 붙인 자리 (반 이름이 나오는데 딱지가 없다)

| 자리 | 까닭 | 제안 |
|---|---|---|
| 반 · 학생 관리 **진도 칸 머리 «반 · 학년»** (`ClassManage.tsx`) | `plan-screen` 트랙이 이 파일을 크게 고치는 중 — 계획 부분만 피하라 했지만 같은 파일이라 병합 충돌 위험 | 병합 뒤 `StudentList` 머리와 같은 한 줄(`{selectedClass.owner ? <OwnerTag … className="ml-2" /> : null}`) |
| 오늘의 개념 **오른쪽 차시 판 문맥 줄** «반 · 9월 15일 진도» (`ConceptView.tsx` `panelContext` → `ConceptUnitPanel`) | 문자열로 넘어가는 한 줄이라 딱지를 넣으려면 판의 props 모양을 바꿔야 한다 — 시안에 없는 모양 | 필요하면 원장님께(⑥ Q4) |
| D-132 ⑶ «시험지 목록» | 앱에 시험지 **목록 화면이 없다**(`/tests/[id]` 검토 · `/tests/new` 출제뿐) | 없음 |
| 학생 화면 윗줄 «이름 · 반» (`learn/LearnTopBar.tsx`) | 학생이 보는 화면 — 관리자 화면이 아니다 | 안 붙인다 |

### ⑤-3 판단 셋

1. **작업실 개요 «최근 등록한 반»은 고르는 세 반을 안 바꿨다** — 담당은 그 셋 **안에서만** 내 반을 위로 올린다.
   내 반이 최근 셋 밖이면 안 보인다. 셋 안으로 끌어오려면 «최근 등록한 반»이라는 이름부터 틀려진다 → ⑥ Q1.
2. **새로 만든 반은 목록 끝에 붙는다**(새로 고치면 맨 위). `useClassManage.addClass` 가 끝에 붙이는데, 이 훅은
   반 만들기에 계획 칸을 넣는 `plan-screen` 트랙 자리라 안 건드렸다. 담당 칸은 안 빈다(POST 가 `owner` 를 싣는다).
   병합 뒤 `setClasses((prev) => mineFirst([...prev, created], (c) => c.owner))` 한 줄이면 맞는다.
3. **가짜 Prisma 의 반 `findMany` 가 이제 `select` 를 자른다.** 지금 부르는 곳(`id`·`name`·`grade`)은 영향이 없었지만,
   다른 트랙이 반 조회에 모르는 관계를 `select` 하면 대역이 **던진다**(조용히 통과시키지 않는 기존 원칙과 같다).

---

## ⑥ 원장님께 여쭐 것 (D-07)

| # | 여쭐 것 | 지금 한 것 |
|---|---|---|
| Q1 | 작업실 개요 «최근 등록한 반» 세 줄 — 원장님 반이 최근 셋 밖이면 안 보입니다. **셋 안에 끌어올릴까요**(이름이 «최근 등록한 반»과 어긋남), **지금처럼 셋 안에서만 위로** 둘까요? | 셋 안에서만 위로 |
| Q2 | 메인 카드 · 끝난 반 한 줄은 줄 전체가 반을 고르는 단추라, 마우스를 올리면 줄 바탕이 옅은 회색이 되어 **회색 딱지의 테두리가 묻힙니다**(글자는 보입니다). 그대로 둘까요? | 그대로(딱지 모양은 05 §8.11 값) |
| Q3 | 반 고르는 상자를 **펼친 목록**에서 반에 마우스를 올려 전체 이름 말풍선이 뜨는지 한 번 봐 주세요. 닫힌 상자에 올렸을 때는 고른 반의 «반 이름 · 담당 전체»가 떠야 합니다. (말풍선은 운영체제가 그려 캡처에 안 찍히고, 제가 직접 올려 보려면 화면 포커스를 가져와야 해 하지 않았습니다 — 절대 규칙 9) | 속성만 확인(②) |
| Q4 | 시안에 없던 자리 셋에도 같은 딱지를 붙였습니다 — **끝난 반 한 줄 · 진도 입력 패널의 «선택한 반» · 학생 칸 머리 «반 · 학년»**. 괜찮을까요? 오늘의 개념 오른쪽 판의 문맥 줄(«반 · 9월 15일 진도»)에도 붙일까요? | 셋은 붙임 · 문맥 줄은 안 붙임 |

