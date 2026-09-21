# 24 — 지점(테넌트) 분리 설계 (D-136)

> **상태: A단계 뒷단이 워크트리에 섰다 · 미커밋 · 마이그레이션 미적용(§11).** 2026-09-21 리드 작성. 원장님 지시 *「eywa 처럼 테넌트 분리를 시스템화 해야겠는데」* → *「꼼꼼히 시작해」*.
> main 의 코드는 한 줄도 안 바꿨다(워크트리 `phase/8-tenant` 에만 — §11). 공유 DB 도 안 건드렸다. 이 문서의 수치는 전부 **2026-09-21 main(`838201d1`) 실측**이다.
> 같은 날 main 이 351커밋 앞으로 갔고(`3fd43dee`) 워크트리도 그 위로 올렸다 — 달라진 것은 **§11.5**.
>
> ⚠️ **번호를 옮겼다 — 이 결정은 처음에 D-135 였다.** 미커밋인 채로 main 을 받으니 D-135 는 이미 «작업실·도형 편집기 확정 묶음»이 쓰고 있었다.
> 공유 이력에 없는 내 쪽을 **D-136** 으로 옮겼다(07 의 규칙 그대로 — «번호를 붙이기 전에 마지막 ID 를 확인»은 **붙인 뒤 커밋할 때까지** 유효하다).
> `D:/tmp/phase8-tenant-backup/` 의 **첫 백업**(`tracked.patch` · `untracked.tar`)에는 옛 번호 D-135 가 그대로 있다.
>
> 🔴 **읽는 순서** — 바쁘면 §1(결정) · §6(단계) · §9(원장님이 정하실 것)만.
> 구현하는 사람은 §4(설계) · §5(전수 표) · §7(시험) · §8(함정)을 **전부**.

---

## 1. 결정

| # | 내용 | 누가 · 언제 |
|---|---|---|
| D-136 ⑴ | **지점(테넌트) 단위 격리를 시스템으로 만든다.** 02-trd §3.4 · 04 ERD 의 «판매 확장 시 ACADEMY» 가 이 일이다 | 원장님 지시 2026-09-21 |
| D-136 ⑵ | **주소를 따로 두지 않는다 — 로그인 계정이 지점을 정한다.** 지점마다 서브도메인·경로·«학원 코드» 칸을 만들지 않는다 | 원장님 제안 2026-09-21 *「주소를 따로 두지말고 로그인 계정에 따라서 지점 분리되게 하면 어떨까 … 매쓰플랫 매쓰홀릭 그런식으로 된거같아」* · 리드 검토 **채택**(§4.6) |
| D-136 ⑶ | **운영 데이터의 주인은 계정이 아니라 지점이다.** 선생님이 지점을 옮기면 반은 옛 지점에 남는다 | 리드 제안 — §4.1 |
| D-136 ⑷ | **지점 벽은 절대다 · 관리자(`isAdmin`)는 «소유 울타리»만 넘는다.** D-130 의 «전부 본다»는 «**자기 지점** 전부»로 읽는다 | 리드 제안 — §4.7 (원장님 확정 필요 §9-②) |
| D-136 ⑸ | **빈 값은 닫힌다.** 지점이 없는 계정은 운영 데이터를 하나도 못 본다 | 리드 — D-130 «빈 값은 넘지 않는다»와 같은 결 |
| D-136 ⑹ | **DB 층 방어는 복합 FK 부터, RLS 는 뒤로.** | 리드 제안 — §4.9 (원장님 확정 필요 §9-③) |
| D-136 ⑺ | **지점의 원장이 그 지점의 관리자·강사·학생 계정을 전부 만든다.** 계정은 만들어지는 순간 만든 원장의 지점에 선다 — «승인하면서 지점을 고르는» 화면은 없다 | 원장님 확정 2026-09-21 *「원장이 소속 지점 관리자 강사 학생 계정 모두 생성하는걸로.」* — §4.7 |

> ⚠️ ⑵의 근거 중 «매쓰플랫·매쓰홀릭이 그렇게 한다»는 **우리가 확인한 사실이 아니다.**
> 19번 조사는 홍보 페이지만 봤고 *「로그인이 필요한 영역은 애초에 못 본다」*(19 §끝). 채택 이유는 경쟁사가 아니라
> **우리 구조와 eywa 가 이미 그 모양**이라는 것이다(§2 · §4.6).

---

## 2. eywa 는 어떻게 하나 (실측 — `D:\eywa_refactoring`)

| 층 | 무엇 |
|---|---|
| 표 | `tenants`(id · slug · name · plan) · `users.tenant_id` · 운영 표 전부에 `tenant_id` FK(cascade). 마이그레이션 338개 중 **259개**가 `tenant_id` 를 만진다 |
| DB | 표마다 RLS 정책 `tenant_id = public.auth_tenant_id()`. 그 함수는 `select tenant_id from users where id = auth.uid()`(security definer) — **로그인한 계정의 행이 지점을 정한다** |
| 앱 | `getCurrentUser()` 가 `users` 에서 `tenant_id` 를 읽어 `user.tenantId` 로 싣는다. 질의에 `.eq("tenant_id", …)` 를 직접 적는 자리 **748곳**(RLS 와 이중) |
| 관리 | 서비스 관리자는 별도 표 `super_admins` · 지점 안의 최고 권한은 `system_role='master'` · «다른 강사 뷰»는 **권한이 아니라 스코프만** 바꾸고 열람 전용 |

**그대로 못 옮기는 까닭** — eywa 의 DB 층은 Supabase Auth 의 `auth.uid()` 에 매달려 있다. 오늘의수학은 Auth.js(JWT) + Prisma 직결이고,
Prisma 는 **표 소유자로 접속**해 RLS 를 통과한다(RLS 가 켜진 표 9개 · 정책 **0개** — «Supabase 공개 API 차단»용 관례).
그래서 «계정이 지점을 정한다»(⑵)는 그대로 가져오고, «DB 가 막는다»는 다른 연장으로 갈음한다(§4.9).

---

## 3. 지금 구조 (전수 실측)

### 3.1 수

| 항목 | 값 | 어떻게 셌나 |
|---|---|---|
| Prisma 모델 | **34** | `schema.prisma` |
| `src` 의 모델 접근 | **365곳 · 101파일** | 받는이 무관(`db.` 306 · `tx.` 50 · `prisma.` 6 · `client.` 3) — 시험·목 제외 |
| 그중 운영·개인·계정 표를 만지는 파일 | **71** | §5.2 |
| `src` 의 raw SQL | **5곳** — 전부 `src/lib/eywa/`(eywa DB 쪽) | 우리 표에 raw 로 닿는 앱 코드는 없다 |
| `scripts/` + `prisma/` 의 모델 접근 | 679곳 · 227파일 · raw 302 | 대부분 문항(505) · 운영 표를 **쓰는** 스크립트는 3개(§5.4) |
| API 라우트 | 86 | `src/app/api/**/route.ts` |

> ⚠️ 가능성 점검 때 말한 «436곳»은 **시험 파일이 섞인 수**였다(`grep -h` 뒤에 경로로 거르려 했다 — 걸러지지 않는다). 365 가 맞다.

### 3.2 소유의 뼈대 — 운영 표는 전부 «반»에 매달려 있다

```
User ─┬─ Class ─┬─ Student ─┬─ StudentAccount
      │         │           ├─ ConceptLectureView
      │         │           ├─ ActualExamScore ─(runId)─ PredictionRun ─ User
      │         │           └─ ProgressPlan(학생 계획)
      │         ├─ Progress
      │         ├─ ProgressPlan(반 계획)
      │         └─ Test ─┬─ TestProblem
      │                  └─ TestResult ─┬─ ProblemAnswer
      └─ Test(userId = 반 소유자, D-130 판단 1)        └─ AnalysisReport
```

`userId` 칸을 가진 운영 표는 **`Class` · `Test` 둘뿐**이고, `Test.classId` 는 NOT NULL 이다. 나머지는 부모를 거쳐 닿는다.

### 3.3 판정은 이미 한 곳이다 (D-130)

| 조각 | 지금 | 쓰는 곳 |
|---|---|---|
| `crossesOwnerFence(viewer)` | `viewer.isAdmin === true` | 아래 넷 |
| `ownedRowsWhere(viewer)` | 관리자 `{}` · 아니면 `{ userId }` | `Class` · `Test` 의 목록·원자 갱신 |
| `ownedStudentsWhere(viewer)` | 관리자 `{}` · 아니면 `{ class: { userId } }` | 학생 수 |
| `withinOwnerScope(viewer, ownerUserId)` | 관리자 ∨ 소유자 일치 | `ownership.ts` 의 404/403 헬퍼 넷 |
| `personalViewer(viewer)` | `isAdmin:false` 로 고정 | 개인 작업물 라우트 |

**지점이 새는 뿌리는 관리자의 `{}` 다.** 관리자 아닌 계정은 `{ userId }` 라 구조적으로 자기 행만 본다.
지점이 둘이 되는 순간 `{}` 는 «전 지점 전부»가 된다. 그래서 이 일의 핵심은 **`{}` 를 `{ tenantId }` 로 바꾸는 것**이고,
나머지는 그 한 줄이 옳게 서도록 받치는 일이다.

> 🔴 **«정확히 하나»라고 처음에 적었는데 틀렸다 — 둘이었다**(2026-09-21 구현 중 정정). `api/classes` 의 관리자 목록(`listWithOwners`, D-132 «내 반 맨 위»)이
> 두 묶음의 where 를 `{ userId: 나 }` · `{ userId: { not: 나 } }` 로 **손으로 짓고** 있었다 — «관리자는 범위가 전부라 합이 곧 전체»라는 전제로.
> 전수 조사(§5.2)는 이 파일을 «조각을 쓴다»로 분류했다: import 표지는 있었고 **쓰지 않는 질의가 같은 파일에 같이 있었다.**
> 짝 시험(`tenantWall.test.ts`)이 첫 실행에서 잡았다 — 관리자의 반 목록에 남의 지점 반이 양방향으로 나왔다.
> **표지로 분류한 전수는 «그 파일이 조각을 안다»까지만 말한다. «그 파일의 모든 질의가 조각을 지난다»는 시험이 말한다.**

### 3.4 `isAdmin` 은 지금 두 가지 뜻을 한 몸에 지고 있다 🔴

| 자리 | `isAdmin` 의 뜻 |
|---|---|
| `ownerScope.ts` | **학원 관리자** — 반·학생·시험지의 소유 울타리를 넘는다 |
| `accountRouteAccess.ts:28` | **서비스 관리자** — `/admin` · `/api/admin` · `/dev` · `/api/dev` 가 전부 열린다 |
| `api/admin/users` | **서비스 관리자** — 전 계정 목록·승인·메뉴 끄기 |
| `auth.ts` jwt | 메뉴 전부 켜짐 |

지점 원장에게 `isAdmin` 을 주면 **전 지점의 계정 목록과 `/dev` 화면**(소유 필터가 없는 시안 페이지 넷 — §5.3)이 같이 열린다.
그래서 새 지점의 원장에게는 `isAdmin` 을 **주면 안 되고**, 지점 안의 관리 권한은 따로 세워야 한다(§4.7).

---

## 4. 설계

### 4.1 원칙 넷

1. **운영 데이터의 주인은 지점이다.** 반·시험지에 `tenantId` 를 박는다. 계정이 지점을 옮겨도 행은 안 따라간다.
   (`{ userId }` 만으로 거르면 옮긴 선생님이 옛 지점의 반을 새 지점으로 들고 온다.)
2. **지점 벽은 절대, 소유 울타리는 그 안에서.** 판정 순서는 늘 «같은 지점인가 → 그 안에서 내 것인가/관리자인가».
3. **빈 값은 닫힌다.** `tenantId` 가 없거나 빈 문자열이면 아무것도 안 보인다. `undefined` 를 where 에 내보내지 않는다
   (Prisma 는 undefined 를 «조건 없음»으로 읽는다 — D-130 과 같은 함정).
4. **판정은 한 곳.** 라우트는 `tenantId` 를 직접 견주지 않는다. `ownerScope.ts` 의 조각만 쓴다.

### 4.2 표 분류 — 34개 전부

| 갈래 | 표 | 지점 칸 | 까닭 |
|---|---|---|---|
| **지점 뿌리** | `Class` · `Test` | **`tenantId` NOT NULL** | `userId` 를 가진 운영 표 둘. 판정 조각 하나(`{ userId, tenantId }`)를 같이 쓴다 |
| **지점 — 부모를 거친다** | `Student` · `Progress` · `ProgressPlan` · `TestProblem` · `TestResult` · `ProblemAnswer` · `AnalysisReport` · `StudentAccount` · `ConceptLectureView` · `ActualExamScore` | 없음(1차) | 전부 `Class`/`Test`/`Student` 에 NOT NULL 로 매달려 있다. RLS 를 할 때(§4.9) 그때 박는다 |
| **지점 — 주인 없는 시스템 표** | `AutoDraftRun` · `EywaSyncRun` · `EywaSyncLedger` | `tenantId` (D단계) | 지금은 전역 한 줄기. 지점마다 cron·동기화가 돌면 갈라야 한다 |
| **계정** | `User` | **`tenantId` nullable** | 가입(pending)·검수자(reviewer)는 지점이 없다. 없으면 닫힌다(⑸) |
| **개인 작업물** | `BasketItem` · `PredictionRun` · `WorkspaceDocument` · `WorkspaceAsset` | 없음 | `userId` 로 거른다 — 지금 그대로(D-130 ⑶) |
| **계정 기록** | `AccountAuditLog` · `Account` · `Session` · `VerificationToken` · `StudentLoginMiss` | 없음 | 계정 자신의 것 · Auth.js 표준 · 아이디 해시 |
| **서비스 공용** | `Problem` · `ProblemFamily` · `Unit` · `Exam` · `ExamQuestion` · `ConceptLecture` · `ProblemReport` · `ProblemReviewLog` | 없음 | D-101 «전체 공유» · D-124 ⑼ «강의 목록은 서비스 공용» · 교육과정 · 기출. **원장님 확정 필요(§9-①)** |
| **공용? 지점?** | `ExamScope` | 미정 | «원장이 확정한 시험범위» — 학교의 사실인데 확정은 한 지점이 한다(§9-①) |

> `Problem.pool = private` + `userId` (D-31 «타 사용자 private 만 격리»)는 개인 작업물 결이다. 지금 전량 `shared` 라 실효 없음 — 안 건드린다.

### 4.3 스키마 (1차 — A단계)

```prisma
model Tenant {
  id        String   @id @default(uuid()) @db.Uuid
  /// 표시명 — 화면 문구는 D-07/D-08 확정 뒤(§9-④). 주소가 없으므로 slug 도 없다(D-136 ⑵)
  name      String   @db.VarChar(100)
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  users   User[]
  classes Class[]
  tests   Test[]
  @@map("tenant")
}
// User  : tenantId String? — FK Restrict
// Class : tenantId String  — FK Restrict · @@unique([id, tenantId]) · @@index([tenantId, userId])
// Test  : tenantId String  — FK Restrict · (classId, tenantId) → Class(id, tenantId) 복합 FK · @@index([tenantId, testDate])
```

- 🔴 **FK 는 전부 `Restrict`.** 지점 행 하나를 지웠다고 반·시험지·계정이 조용히 같이 지워지면 안 된다
  (D-101 — *「계정 행 하나를 지우면 Postgres 가 문항 47,006개를 같이 지웠다」*). 지점은 `isActive=false` 로 끈다.
- **복합 FK** `Test(class_id, tenant_id) → Class(id, tenant_id)` — «시험지의 지점 = 그 반의 지점»을 **DB 가** 지킨다.
  앱이 한 곳에서 `tenantId` 를 잘못 실어도 INSERT 가 죽는다. RLS 없이 얻는 DB 층 방어다.
- `CHECK (id <> '00000000-0000-0000-0000-000000000000')` — 닫힌 지점 값(§4.4)이 진짜 지점이 될 수 없게.

### 4.4 판정 (`ownerScope.ts`) — 전 · 후

```ts
export interface ScopeViewer { readonly id: string; readonly isAdmin?: boolean; readonly tenantId?: string | null }

/** 어떤 지점과도 같을 수 없는 값 — 지점 없는 뷰어의 where 가 «조건 없음»이 아니라 «0행»이 되게 한다. */
export const CLOSED_TENANT = "00000000-0000-0000-0000-000000000000";
```

| 조각 | 전 | 후 |
|---|---|---|
| `ownedRowsWhere` 관리자 아님 | `{ userId }` | `{ userId, tenantId: T }` |
| `ownedRowsWhere` 관리자 | `{}` | `{ tenantId: T }` |
| `ownedStudentsWhere` 관리자 아님 | `{ class: { userId } }` | `{ class: { userId, tenantId: T } }` |
| `ownedStudentsWhere` 관리자 | `{}` | `{ class: { tenantId: T } }` |
| `withinOwnerScope(viewer, ownerUserId)` | 관리자 ∨ 소유자 | `(viewer, row: { userId, tenantId })` — **같은 지점** ∧ (관리자 ∨ 소유자) |

`T` = 뷰어의 `tenantId` 가 비어 있지 않은 문자열이면 그 값, 아니면 `CLOSED_TENANT`.

- 🔴 **남의 지점 행은 403 이 아니라 404 다.** 403 은 «그 id 가 있다»를 알려 준다. 지점 밖은 **없는 것과 같아야** 한다
  (`devPageAccess.ts` 의 «바깥에서 보기에는 그 경로가 없는 것과 똑같다»와 같은 결). 같은 지점 안의 남의 반은 지금처럼 403.
- `withinOwnerScope` 의 둘째 인자가 **문자열 → 행**으로 바뀐다. D-130 때와 같은 선택이다 — 조용히 안 좁혀지는 것보다 `tsc` 가 크게 깨지는 편.
- 관리자 아님의 where 가 «글자 그대로 같다»는 D-130 의 성질은 **일부러 버린다**. 모양 시험(`teachingOverview` · `studioWorkspace`)은 고친다.

### 4.5 세션

`auth.ts` jwt 콜백이 **요청마다** `user` 행을 다시 읽는다(`isAdmin` · `approvalStatus` · `disabledMenus`). 그 select 에 `tenantId` 한 칸을 더한다.
→ 계정의 지점을 바꾸면 **다음 요청부터** 바뀐다. 로그인 때 굳지 않는다. `SessionUser.tenantId: string | null` 은 **필수 칸**으로 둔다 —
세션 사용자를 손으로 만드는 자리(`autoDraftOwner.ts`)가 빠뜨리면 형이 막는다(D-130 의 `isAdmin` 과 같은 수법).

### 4.6 학생 — 아이디는 서비스 전체에서 하나 (D-136 ⑵의 귀결)

- 학생은 `/learn/login` 에서 **아이디 + 비밀번호**만 넣는다(D-124). 지점을 묻는 칸이 없으므로 아이디로 계정이 **하나로** 정해져야 한다 →
  `StudentAccount.loginId @unique`(전역)는 **지금 그대로 둔다.** 가능성 점검 때 말한 «`(tenantId, loginId)` 로 바꿔야 한다»는 **철회한다.**
- 학생의 지점은 `StudentAccount → Student → Class.tenantId` 로 닿는다. 학생 토큰에 지점을 싣지 않는다(학생 API 는 전부 `studentId` 로 거른다 —
  `requireStudent` → `loadStudentLectureScope(studentId)`. 강의는 공용이라 지점을 볼 일이 없다).
- `StudentLoginMiss`(없는 아이디의 실패 수 · HMAC 열쇠)도 그대로다.
- **비용 하나**: 아이디 이름칸이 전 지점 공용이다. 지점 B 원장이 «minsu01» 을 적었는데 지점 A 가 쓰고 있으면 `login_id_taken`(지금도 있는 갈래)이
  난다. 어느 지점인지는 안 알려 준다. 지점이 늘면 잦아진다 → 그때 «지점 머리글자 자동 제안»을 검토(D-125 ⑵ «자동 제안 없음»을 바꾸는 일이라 원장님 결정).
- **한 계정 = 한 지점.** 두 지점을 운영하는 사람은 1차에는 계정이 둘이다. «지점 전환»은 §4.7 의 서비스 관리자 쪽에서 나중에 연다.

### 4.7 역할 — 서비스 관리자 · 원장 · 관리자 · 강사 · 학생 (D-136 ⑺)

원장님 확정: **지점의 원장이 그 지점의 관리자·강사·학생 계정을 전부 만든다.** 그래서 역할이 이렇게 선다.

| 역할 | 누가 만드나 | 지점 | 운영 데이터 | `/admin`·`/dev` |
|---|---|---|---|---|
| **서비스 관리자**(`isAdmin`) | — (원장님 계정) | 자기 지점 하나 | 자기 지점 안에서 소유 울타리를 넘는다 | 열린다 |
| **원장** | 서비스 관리자(§9-ⓐ) | 자기 지점 | **지점 전부** — 소유 울타리를 넘는다 | 닫힌다 |
| **관리자** | 원장 | 원장의 지점 | 지점 전부(리드 해석 — §9-ⓑ) | 닫힌다 |
| **강사** | 원장 | 원장의 지점 | **자기 반만** | 닫힌다 |
| **학생** | 원장(지금도 — D-124 «발급») | 반을 거쳐 닿는다(§4.6) | «오늘의 개념» 시청만 | — |

- **계정이 만들어지는 순간 지점이 정해진다** — 만든 원장의 `tenantId` 를 그대로 싣는다. 요청 본문으로 지점을 받지 않는다(받으면 남의 지점에 계정을 심을 수 있다).
  → 가능성 점검 때 말한 «계정 승인에 지점 고르기» 화면은 **필요 없다.**
- 지금 역할 칸은 `UserRole { director · reviewer }` 둘이고 판정은 `routeAccess.ts` 한 곳(`role === "director"` 이면 통과)이다. 쓰는 파일 14개.
  지점 안 역할은 **이 칸을 넓힌다**(`manager` · `teacher` 를 더한다 — 칸을 하나 더 세우지 않는다). 검수자(`reviewer`)는 지점이 없는 서비스 쪽 역할로 남는다.
- `crossesOwnerFence` 는 지금 `isAdmin === true` 다. C단계에서 «`isAdmin` ∨ 원장 ∨ 관리자»로 넓힌다 — **지점 벽 안에서만.**
  🔴 기존 계정은 전부 `director` 다(역할 계정 `test_t` «선생님»도). 넓히는 순간 그 계정들이 지점 전부를 본다 →
  C단계 백필에서 **누가 원장이고 누가 강사인지 원장님이 정해 주셔야** 한다(§9-ⓒ). 그전에는 안 넓힌다.
- 강사·관리자 계정의 로그인은 **이메일 + 비밀번호**(절대 규칙 7 그대로). 원장이 만들 때의 첫 비밀번호는 학생 발급(D-124 ⑷)과 같은 결 —
  **한 번만 보여 주고 저장하지 않으며 첫 로그인에 바꾸게 한다**(리드 제안 · 화면은 Wire 부터).
- **A단계는 안 바뀐다.** 역할은 C단계다. A 에서 `crossesOwnerFence` 는 그대로고 바뀌는 것은 넘은 뒤에 보이는 범위다(`{}` → `{ tenantId }`).
  지점이 하나인 동안 원장님 화면은 **한 글자도 안 달라진다.**

### 4.8 cron · eywa · env — 지금은 «단일 소유자»가 env 셋에 박혀 있다

| env | 지금 | 지점이 둘이면 |
|---|---|---|
| `AUTO_DRAFT_OWNER_EMAIL` | 그 계정(관리자)이 전 반을 돈다 | A단계: 그대로 — 그 계정의 지점만 돈다(= 지금의 전부). D단계: **활성 지점을 순회**, `AutoDraftRun.tenantId` |
| `EYWA_SYNC_OWNER_EMAIL` | eywa 연계의 소유자 | 보류(D-129 ⑸) — 풀릴 때 `Tenant` 에 eywa 짝 칸 |
| `EYWA_TENANT_ID` | eywa 쪽 tenant 필터 | 〃 |

`Class.eywaClassId` · `Student.eywaStudentId` 의 전역 unique 는 uuid 라 지점끼리 충돌하지 않는다 — 안 바꾼다.

### 4.9 DB 층 방어

| 안 | 무엇 | 판단 |
|---|---|---|
| **복합 FK** (§4.3) | 시험지의 지점 = 반의 지점을 DB 가 강제 | **A단계에 같이** — 값싸고 되돌리기 쉽다 |
| 앱 층 Prisma 확장으로 자동 주입 | `db.ts` 의 «problem-bank-outer-wall» 처럼 모든 읽기에 `tenantId` 를 씌운다 | **안 한다(1차)** — 요청별 뷰어를 전역 클라이언트가 모른다(AsyncLocalStorage 가 필요). 그리고 시험 33개가 `@/lib/db` 를 통째로 모킹해 **확장은 시험 축 밖**이다(`problemVisibility.ts` 머리말의 그 함정) |
| **RLS** (eywa 식) | `SET LOCAL app.tenant_id` + 정책 | **E단계 · 선택** — Prisma 에서는 모든 질의를 트랜잭션에 넣어야 하고, 접속 역할도 표 소유자에서 내려야 한다. 지점이 남의 학원으로 넓어질 때 다시 본다(§9-③) |

---

## 5. 전수 표

### 5.1 `tenantId` 를 **써 넣어야** 하는 자리 (A단계)

| 표 | create 자리 | 값의 출처 |
|---|---|---|
| `Class` | `api/classes/route.ts` POST(create ×2 — 계획을 같이 세우는 갈래 · 아닌 갈래) · `lib/eywa/runSync.ts`(upsert ×1) | 만드는 계정의 지점 · eywa 소유자 계정의 지점 |
| `Test` | `lib/tests/generateDraftTest.ts` · `api/basket/test/route.ts` · `lib/predictor/persistPredictedPaper.ts` | **그 반의 `tenantId`**(뷰어의 것이 아니다 — 복합 FK 가 어긋남을 막는다) |
| `User` | `api/auth/signup`(지점 없음 · pending) · **`api/admin/users/[id]` PATCH(승인)** · `scripts/admin/reorganize-accounts.ts` · `scripts/qa/create-reviewer.ts` · 이관 로더의 upsert | 가입은 `null`. **승인하면 승인한 관리자의 지점에 선다**(지점 없던 원장 역할 계정만 · 이미 지점이 있으면 안 옮긴다 · 검수자·반려는 그대로) — 안 그러면 «승인됐는데 아무것도 안 보이는» 계정이 된다. C단계에서 «원장이 계정을 만든다»(⑺)로 바뀐다 |

### 5.2 운영·개인·계정 표를 만지는 71파일 — 범위가 어디서 오는가

규칙으로 셌다(눈대중 아님 — 파일 경로와 import 표지로 가른다). 합 **71**.

| 갈래 | 파일 수 | 무엇 | 할 일 |
|---|---|---|---|
| **조각을 쓴다**(`ownedRowsWhere` · `ownedStudentsWhere`) | **14** | `api/classes` · `tests` · `tests/[id]/confirm` · `tests/[id]/print` · `metrics` · `tests/daily-review` · `tests/default-range` · `studio/overview` · `dev/unified/overview` · `(main)/tests/[id]/print/page.tsx` · `lib/class/recentClasses` · `lib/concept/adminService` · `lib/tests/replaceTestProblem` · `lib/tests/runAutoDraft` | **손 안 댄다** — 조각이 바뀌면 같이 바뀐다 |
| **404/403 헬퍼를 지난다**(`requireOwned*`) | **17** + 정의 1(`ownership.ts`) | `classes/[id]` · `classes/[id]/progress-plan` · `students` · `students/[id]` · `students/[id]/progress-plan` · `progress` · `progress/advance` · `progress/suggest` · `tests/[id]` · `results` · `results/[studentId]` · `problems/[id]` · `lib/testResults/gradeSheet` · `submitTestResult` · `lib/achievement/load` · `lib/learn/issueDeps` · `lib/tests/generateDraftTest` | 헬퍼 넷만 고친다(`ownership.ts`). `generateDraftTest` 는 §5.1 쓰기 자리이기도 하다 |
| **id 를 받아 읽는다**(부르는 쪽이 이미 검증) | **5** | `lib/daily/progressPlanStore` · `lib/tests/loadTestProblems` · `lib/tests/recentProblemIds` · `lib/progress/noProgressReason` · `lib/learn/studentLectures` | 부르는 쪽 전수 확인(§7-④ 전수 시험이 잡는다) |
| **`userId` 로 거르는 개인 작업물** | **13** | `api/basket` · `basket/test` · `predictions/[id]/actual` · `tests/[id]/scores` · `lib/basket/readBasket` · `lib/exam/loadRounds` · `lib/predictor/` 넷 · `lib/private*` 셋 | 그대로. `basket/test` 는 `personalViewer` 를 지나 지점 조각이 같이 걸린다. 🔴 **예측 계열 셋**(`loadRounds.loadOwnedStudents` · `generatePredictedPaper` · `persistPredictedPaper`)은 뷰어가 아니라 **`userId` 문자열**로 반을 읽는다 — 지점 조건이 없다. 다른 계정의 반에는 안 닿지만, **지점을 옮긴 계정이 옛 지점의 자기 반**에는 닿는다(D-136 ⑶ 위반). 계정을 옮기는 길이 생기는 C단계 **전에** 뷰어를 받게 고친다(§11.4) |
| **학생 세션** | **6** | `api/learn/` 다섯 · `lib/learn/prismaLoginStore` | 그대로(§4.6) |
| **계정 관리** | **9** | `api/admin/users` 셋 · `auth/signup` · `account/activity` · `lib/audit` · `lib/auth` · `lib/privateWorkspace` · `lib/tests/autoDraftOwner` | `auth`(jwt select) · `autoDraftOwner` 에 `tenantId` 싣기. 나머지는 서비스 관리자 전용으로 남는다 |
| **eywa** | **2** | `api/eywa-sync` · `lib/eywa/runSync` (+ `daily-review` 안의 eywa 갈래) | `runSync` 의 반 upsert 에 소유자 지점. 그 밖은 보류(D-129 ⑸) |
| **소유 필터가 없는 시안 페이지** | **4** | `app/dev/report-hifi` · `report-wire` · `retry-wire` · `ui-wire` | §5.3 |

### 5.3 🔴 `/dev` 시안 페이지 넷은 소유 필터가 없다

`Student` · `Progress` · `Test` · `Class` 를 **거르지 않고** 읽는다(D-130 보고서도 «원래 소유 필터가 없는 개발 전용»으로 적었다).
production 에서는 `accountRouteAccess` 가 `/dev` 를 `isAdmin` 에게만 연다 → **서비스 관리자 전용으로 남기면** 새지 않는다.
지점 원장에게 `isAdmin` 을 주지 않는 한(§3.4). 이 조건을 시험으로 잠근다(§7-⑤).

### 5.4 운영 표를 쓰는 스크립트

`scripts/admin/prune-classes.ts`(반 삭제) · `reorganize-accounts.ts`(계정 재편) · `scripts/qa/create-reviewer.ts`(검수자 생성).
셋 다 사람이 손으로 돌리는 가드 스크립트다. A단계에서 `tenantId` 를 요구하도록 고치고, **지점을 안 주면 멈추게** 한다(기본 지점으로 조용히 떨어지지 않게).

---

## 6. 단계

> **A단계는 결정과 무관하다** — §9 의 어느 답이 와도 A 는 같다. 지점이 하나인 동안 **화면·동작이 한 글자도 안 바뀐다.**

| 단계 | 무엇 | 화면 | DB | 나눌 수 있나 |
|---|---|---|---|---|
| **A. 벽의 뼈대** | `Tenant` · `User/Class/Test.tenantId` · 세션 · `ownerScope`/`ownership` · 쓰기 자리 6곳 · 대역·목 · 짝 시험 · 변이 하네스 | 없음 | 마이그레이션 1(펼치기) | **한 줄기** — 판정 조각의 서명이 바뀌어 전부 물린다(D-130 과 같다) |
| **B. 둘째 지점으로 걸어 보기** | 시험 지점 하나를 세워 원장·선생님·학생 계정으로 끝에서 끝까지. 통과하면 **접기**(DEFAULT 제거) | 없음 | 마이그레이션 2(접기) | A 뒤 |
| **C. 지점 안 역할 · 원장의 계정 만들기**(D-136 ⑺) | `UserRole` 에 `manager`·`teacher` · 원장이 관리자·강사 계정을 만든다/끈다/비밀번호 다시 발급 · 서비스 관리자가 지점과 원장을 만든다 | **있다 — 원장의 «계정» 화면 · 서비스 관리자의 «지점» 화면. Wire 4~5안 → Hi-fi(절대 규칙 1)** | enum 값 2 · 백필 | 뒷단/화면 둘로 |
| **D. cron 지점 순회 · 시스템 표** | `AutoDraftRun.tenantId` · 활성 지점 순회 · (eywa 보류가 풀리면) 지점 ↔ eywa 짝 | 없음 | 칸 1~3 | C 와 병행 가능 |
| **E. RLS** (선택) | §4.9 | 없음 | 정책 다수 | 따로 |

### 6.1 🔴 배포 순서 — **DB 가 먼저, 코드가 나중**

jwt 콜백이 `tenantId` 를 select 한다 → **칸이 없는 DB 에 새 코드가 먼저 나가면 로그인 전원이 500** 이다(main 푸시 = 배포).
반대로 칸을 NOT NULL 로 먼저 세우면 **옛 코드의 반 만들기가 죽는다**. 그래서 둘로 나눈다:

1. **펼치기**(A) — 표 `tenant` · 기본 지점 한 줄 · `user.tenant_id`(nullable, 전 계정을 기본 지점으로) · `class/test.tenant_id` 를
   **`NOT NULL DEFAULT '<기본 지점>'`** 으로. 옛 코드는 칸을 모르고도 계속 돈다(새 반은 DB 기본값으로 기본 지점에 선다 — 지점이 하나인 동안은 옳다).
   `schema.prisma` 에는 **기본값을 적지 않는다** → 새 코드는 형이 `tenantId` 를 **요구**한다(쓰기 자리를 하나라도 빠뜨리면 `tsc` 가 빨갛다).
2. **코드 배포** — 1이 적용된 것을 확인한 뒤에만 main 에 병합·푸시.
3. **접기**(B 끝) — `ALTER … DROP DEFAULT`. 둘째 지점을 **세우기 전에** 반드시. 기본값이 남아 있으면 빠뜨린 쓰기 자리가 **조용히 기본 지점에 선다**
   (20번 2026-09-13 *「없는 값을 기본값으로 채우지 마라 — 채우는 순간 진짜 값과 구별되지 않는다」*).

적용은 저장소 관례대로 **가드 스크립트**(`scripts/qa/apply-tenant-migration.ts` — 드라이런은 전부 해 보고 ROLLBACK · `--apply` 는
`ALLOW_SHARED_IMPORT=1` · `--revert` 포함 · `_prisma_migrations` 에 같은 체크섬으로 기록). `prisma migrate deploy` 는 안 쓴다 —
다른 트랙의 미적용 마이그레이션까지 같이 적용한다. **드라이런·적용은 리드가 원장님께 여쭌 뒤 main 에서.**

---

## 7. 시험 (TDD — RED → GREEN)

① **단위** `ownerScope.test.ts` — 조각 넷 × (관리자/아님) × (지점 있음/`null`/`""`/`undefined`). `undefined` 가 where 에 **한 번도 안 나온다**.

② **짝 시험** `tenantWall.test.ts` — 픽스처: 지점 A(원장 a1 · 관리자 aAdmin · 반·학생·진도·계획·시험지) · 지점 B(같은 모양).
   같은 요청을 **네 뷰어**로 나란히: a1 / aAdmin / b1 / bAdmin. D-130 짝 시험(`adminSeesAll.test.ts`)의 라우트 목록을 그대로 돈다.
   - aAdmin 은 A 전부 · B **0건**. B 의 행 id 를 직접 찌르면 **404**(403 아님).
   - 쓰기도 같은 짝 — aAdmin 이 B 의 반에 진도를 넣으면 404.
   - 개인 작업물은 지점과 무관하게 지금 답 그대로(D-130 ⑶).

③ 🔴 **전제 시험을 앞에 둔다** — «B 의 데이터가 정말 서 있다»(bAdmin 으로는 보인다)를 **먼저** 잠근다.
   안 그러면 «B 가 안 보인다»는 픽스처가 비어 있어도 초록이다(20번 2026-09-15 *「전수가 ‹로그인 안 함 vs 로그인 안 함›을 비교하고 있었다」*).

④ **전수** — 운영 라우트 전부를 «남의 지점 뷰어»로 한 번씩. 응답이 404/403/빈 목록이 아니면 빨강(`studentSessionSweep` 의 틀).
   §5.2 «id 를 받아 읽는다» 6파일의 부르는 쪽 누락을 이 그물이 잡는다.

⑤ `/dev` · `/admin` 은 `isAdmin` 아닌 계정에 닫혀 있다 — 지점 역할이 생겨도(C) 안 열린다.

⑥ 🔴 **대역·목에 칸을 넣는다** — `prismaTestDouble.ts` 의 `UserRow` · 반 · 시험지 행, `learnTestDouble`, MSW 핸들러.
   칸이 빠진 행은 «닫는 쪽»으로 읽혀 **시험이 헛돈다**(같은 2026-09-15 교훈). 기존 픽스처는 전부 한 지점에 세운다.

⑦ **변이 하네스** `scripts/qa/mutate-tenant-wall.ts` — 두 방향: «벽을 끈다»(항상 같은 지점) → ② 가 빨개진다 ·
   «항상 닫는다» → ③ 전제 시험이 빨개진다 · «빈 값이면 연다» → ① · 쓰기 자리 6곳 각각 «뷰어의 지점을 싣는다 ↔ 반의 지점을 싣는다».
   판정 순서는 `mutate-admin-scope.ts` 그대로(음성 대조 → 앵커 하나 → 파일 바뀜 → 산출물 바뀜 → 시험 **이름**으로 빨강).

⑧ **진짜 DB** — 이 기계엔 Docker 가 없다. 복합 FK 가 어긋난 INSERT 를 정말 거부하는지는 **가드 스크립트의 드라이런**(트랜잭션 → ROLLBACK)에서 본다.

관문: `npx tsc --noEmit` 0 · 관련 시험 · `npm run lint` · `npm run build` · 기존 변이 하네스(`mutate-admin-scope` · `mutate-class-owner` · `mutate-daily-plan` · `mutate-student-auth`) **전부 다시**.

---

## 8. 함정 — 이 저장소가 이미 빠져 본 것

| 교훈(20번) | 이 일에서는 |
|---|---|
| 2026-09-15 새 칸을 판정에 넣으면 대역 행이 «막힘»으로 읽힌다 | §7-③⑥ — 전제 시험 · 대역에 `tenantId` |
| 2026-09-13 «칸이 없다»를 기본값으로 채우면 | §6.1-3 — DEFAULT 는 둘째 지점 **전에** 걷는다 · 스크립트는 지점을 안 주면 멈춘다 |
| 2026-08-20 DB 는 즉시 최신인데 파일은 밀어야 간다 | §6.1 — 이번엔 **거꾸로**다: 코드가 DB 보다 먼저 나가면 로그인이 죽는다 |
| 2026-09-06 배선을 한쪽만 걸면 | 읽기(where)만 걸고 쓰기(`tenantId` 싣기)를 빠뜨리면 DEFAULT 가 가려 준다 → §6.1-1 «schema 에는 기본값을 안 적는다» |
| 2026-08-25 타입은 배열 길이를 안 센다 | 라우트 목록을 손으로 적지 않는다 — ④ 전수는 `src/app/api` 를 **훑어** 만든다 |
| 2026-09-05 주석이 있다고 단언한 가드가 없었다 | «지점 벽은 절대다»는 주석이 아니라 ② ④ ⑦ 이다 |
| 2026-09-18 재현은 원장님 계정 권한으로 | 걸어 보기(B)는 **관리자 아닌** 지점 원장 계정으로 |
| D-101 Cascade 가 47,006 문항을 지웠다 | §4.3 — FK 전부 Restrict |

---

## 9. 원장님이 정하실 것

**정해진 것** — ⑵ 주소 없이 계정이 지점을 정한다 · ⑺ 원장이 자기 지점의 관리자·강사·학생 계정을 전부 만든다(둘 다 2026-09-21).
⑺ 로 «계정 승인에 지점 고르기»는 사라졌다.

| # | 물음 | 리드 제안 | 언제까지 |
|---|---|---|---|
| ① | **공용 자산의 범위** — 문항·단원·기출·오늘의 개념 강의·신고/검수 기록은 **전 지점 공용**, 시험범위(`ExamScope`)는? | 전부 공용으로 시작. 시험범위는 남의 학원이 들어올 때 지점별로 가른다 | A 와 무관 — C 전 |
| ⓐ | **지점과 그 원장 계정은 누가 만드나** | 서비스 관리자(원장님)가 `/admin` 에서. 공개 가입(`/signup`)은 지금처럼 «승인 대기»로 두되 지점이 없어 아무것도 안 보인다 → 닫을지는 따로 | C 시작 전 |
| ⓑ | **«관리자»는 무엇을 하나** — 지점의 모든 반을 보고 고치나 · 계정도 만드나 | 모든 반은 본다 · 계정 만들기는 원장만 | C 시작 전 |
| ⓒ | **기존 계정의 역할** — 지금은 전부 `director` 다. 누가 원장이고 누가 강사인가(`test_o` · `test_t` · 걸어 보기 계정들) | 원장님이 표로 정해 주시면 백필 | C 의 백필 전 |
| ③ | **DB 층 RLS** 를 지금 할 것인가 | 복합 FK 만 지금. RLS 는 지점이 **남의 학원**으로 넓어질 때 | E |
| ④ | **부르는 말** — «지점» · «학원» · «캠퍼스»? «관리자» · «강사»는 그대로? (07 §2.3 용어 SSOT · D-08 문구) | «지점» · «원장» · «관리자» · «강사»(원장님이 쓰신 말) · 코드는 `tenant` / `director` · `manager` · `teacher` | C 의 Wire 전 |
| ⑤ | **원장의 «계정» 화면 · 서비스 관리자의 «지점» 화면** — 모양 | Wire 4~5안 → Hi-fi (절대 규칙 1) | C |
| ⑥ | **한 사람이 두 지점** — 계정 둘로 갈 것인가, 지점 전환을 둘 것인가 | 1차는 계정 둘. 전환은 서비스 관리자에게만 나중에 | C 뒤 |

## 10. 확인 못 한 것

- **매쓰플랫·매쓰홀릭의 로그인 구조** — 로그인 영역은 조사 범위 밖이었다(19 §끝). ⑵의 채택은 이 근거 없이 선다.
- **공유 DB 의 실제 행** — 계정·반·시험지 수, `class.user_id` 가 지워진 계정을 가리키는 행이 있는지. 백필 전에 드라이런이 센다.
- `prisma/seed.ts` 는 반·계정·학생을 만들지 않는다(확인함). `e2e/global-setup.ts` 는 **로컬 DB 에 `prisma migrate deploy` + seed** 를 돌린다 —
  새 마이그레이션이 거기서도 서야 한다(빈 DB 에서 기본 지점 한 줄 + DEFAULT 가 성립하는지). 이 기계엔 Docker 가 없어 못 돌려 봤다.

## 11. 진행 (2026-09-21)

워크트리 **`D:\testautocreator-phase8-tenant`** · 가지 **`phase/8-tenant`**(main `838201d1` 에서 갈라 · 같은 날 `3fd43dee` 위로 올렸다 — §11.5). 커밋·푸시 없음.

### 11.1 확인한 것 — 복합 FK 는 Prisma 6.19 가 받는다 (§10 의 물음 하나가 닫혔다)

§4.3 의 스키마를 임시 사본으로 만들어 `prisma validate` → **유효**. `prisma migrate diff`(오프라인)가 내는 SQL 에
`FOREIGN KEY ("class_id","tenant_id") REFERENCES "class"("id","tenant_id") ON DELETE CASCADE ON UPDATE CASCADE` 와
`UNIQUE ("id","tenant_id")` 가 그대로 나온다. `ON UPDATE CASCADE` 라 **반의 지점을 옮기면 그 반의 시험지가 같이 옮겨진다.**

🔴 **diff 가 내는 SQL 은 그대로 못 쓴다** — 순서가 «`class.tenant_id NOT NULL` 을 세운다 → 그 뒤에 `tenant` 표를 만든다»이고
백필도 기본 지점도 없다(행이 있는 표에서 첫 줄부터 죽는다). 마이그레이션은 **손으로** 쓴다:
`tenant` 표 → 기본 지점 한 줄 → 칸(`DEFAULT` 달아서 · §6.1-1) → `class(id, tenant_id)` unique → FK 넷 → 옛 `test_class_id_fkey` 를 **새 FK 가 선 뒤에** 내린다.

### 11.2 A단계 — 뒷단이 섰다 (2026-09-21 · 미커밋 · **마이그레이션 미적용**)

| 무엇 | 어디 |
|---|---|
| 마이그레이션(손으로 쓴 펼치기) · 가드 적용 스크립트(드라이런 · `--apply` · `--revert` · 복합 FK 탐침) | `prisma/migrations/20260921120000_tenant_wall_expand/` · `scripts/qa/apply-tenant-migration.ts` |
| 스키마 — `Tenant` · `User/Class/Test.tenantId` · 복합 FK | `prisma/schema.prisma`(+48 −1 — `prisma format` 은 안 돌렸다: 기존 파일이 format 기준으로 정렬돼 있지 않아 53줄이 소음으로 바뀐다) |
| 판정 — 쐐기돌 넷 · 조각 넷 · `tenantForNewRow` · `personalViewerOf` · `ScopeViewer.tenantId` **필수 칸** | `src/lib/ownerScope.ts` |
| 404/403 헬퍼 — 남의 지점은 404 | `src/lib/ownership.ts` · `src/lib/learn/issueStudentAccount.ts` |
| 세션 — jwt 콜백이 요청마다 `tenantId` 를 다시 읽는다 | `src/lib/auth.ts` · `session.ts` · `accountAccess.ts` · `proxy.ts` · `contracts/accountAccess.contract.ts` |
| 쓰기 자리 6 + 승인 1 | `api/classes` · `generateDraftTest` · `api/basket/test` · `persistPredictedPaper` · `eywa/runSync` · `autoDraftOwner` · `api/admin/users/[id]` |
| 예측 계열(개인 작업물)이 뷰어·지점을 지난다 | `predictor/generatePredictedPaper` · `persistPredictedPaper` · `exam/loadRounds` · 라우트 셋 |
| 대역 — 계정·반·시험지 행에 `tenantId` · NOT NULL 흉내 · **복합 FK 흉내**(P2003) | `src/mocks/prismaTestDouble.ts` · `src/mocks/tenantFixture.ts` |

🔴 **`tsc` 가 빨개진 자리가 §5.1 의 쓰기 자리 6곳과 정확히 일치했다** — 스키마에 기본값을 안 적은 값을 했다(§6.1-1).
그리고 `ScopeViewer.tenantId` 를 필수 칸으로 세우자 전수 조사가 못 본 길 넷이 드러났다: `AccountAccess` 를 뷰어로 쓰는 자리 셋
(`(main)/page.tsx` · `studio/page.tsx` · `api/concept`)과 학생 계정 발급의 옛 서명 하나.

#### 시험이 잡은 것 — 단정 둘이 틀렸다

1. **«지점이 새는 자리는 정확히 하나»가 틀렸다**(§3.3 정정) — `api/classes` 의 관리자 목록이 where 를 손으로 짓고 있었다. 짝 시험이 **첫 실행에서** 잡았다.
2. **«개인 작업물은 `personalViewer` 를 지나 지점이 걸린다»가 틀렸다**(§5.2 정정) — 예측 계열 셋은 `userId` 문자열로 반을 읽었다.
   RED 시험 둘이 실제로 빨갛고(지점을 옮긴 계정이 옛 지점의 자기 반에 예측 문제지를 저장했다), 뷰어를 받게 고쳤다.

#### 관문

| 관문 | 결과 |
|---|---|
| `npx tsc --noEmit` | **0** |
| eslint(바뀐 82파일) · `lint:affordance` | 오류 0 (경고 3건은 `test.test.ts` 에 원래 있던 것) |
| 지점 벽 짝 시험 `src/__tests__/api/tenantWall.test.ts` | **147건** — 뷰어 여섯 × 라우트 20 · 목록 넷 · 쓰기 뒤 행 대조 · 쓰기 자리. 전제 시험(B 지점 뷰어에게는 열린다) 포함 |
| `src/__tests__/api` 전체 | **53파일 · 1,114건 · 실패 0** (⚠️ 처음에 «238파일»이라 적었는데 틀린 숫자였다 — 그 폴더는 `838201d1` 에서 52파일 + 새 시험 하나다. 새 main 위 재실행은 §11.5) |
| 바뀐 모듈을 import 하는 단위·컴포넌트 시험 | 34파일 · 401건 · 실패 0 |
| 변이 `scripts/qa/mutate-tenant-wall.mjs` | **31/31 빨강.** 처음엔 28개 중 하나(세션 콜백이 문자열 아닌 지점을 거른다), 예측 계열 넷 중 하나(관리자여도 안 넘는다)가 살아남았다 — 둘 다 **시험의 표본 구멍**(`null` 만 대고 «칸이 없다»를 안 댔다 · 남의 반에 학생이 없었다)이었고 표본을 더해 물렸다. 나머지 하나는 읽어 보니 변이가 아니어서(윗줄이 이미 지점을 걸렀다) 까닭을 적고 뺐다 |
| 기존 하네스 앵커 | `mutate-admin-scope` 39 — 9개가 어긋나 **새 코드에 다시 걸었다**(뜻 그대로) · `class-owner` 43 · `daily-plan` 46 · `plan-api` 37 · `plan-screen` 72 · `grading` 21 · `achievement` 48 전부 정확히 하나 |

#### 🔴 못 본 것 — 이어서 할 사람이 먼저 할 일

- **`mutate-admin-scope` 전량 실행이 8/39 에서 끊겼다.** 8개는 빨강. 나머지 31개는 **«판정 거부 — 러너가 안 떴다»**: 배경 셸이 «메모리 부족»으로
  죽은 뒤 시험 러너가 못 떴고, 하네스는 도장을 찍지 않고 거부했다(설계대로). 파일은 전부 원복됐다(하네스의 md5 대조 + 두 하네스 앵커 70개).
  **가드가 없다는 뜻이 아니라 못 쟀다는 뜻이다.** 메모리에 여유가 있을 때 앞에서(foreground) 다시 돌릴 것.
- **전체 시험 · `npm run build` 를 고친 뒤에는 안 돌렸다**(같은 까닭 — 여유 3GB). `src/__tests__` 의 시험 파일은 `838201d1` 에서 596개 · 새 main 에서 718개다
  (⚠️ 처음에 «3,898파일»이라 적었는데 어디서 온 숫자인지 되짚지 못했다 — 센 값으로 바꿨다). 고치기 **전** 전체 실행은 298건 빨강이었고, 그중 지점과 닿는 파일은 전부 다시 돌려 초록이다.
- **공유 DB 드라이런** — 안 했다. 원장님께 여쭌 뒤 main 에서(§6.1). 복합 FK 가 어긋난 INSERT 를 **진짜 Postgres 가** 거부하는지는 거기서 처음 본다.
- `e2e/` — 이 기계엔 Docker 가 없다. 빈 DB 에서 새 마이그레이션이 서는지(기본 지점 한 줄 + DEFAULT) 못 봤다.

> ⚠️ **이 작업과 무관한 빨강 8건이 main 에 원래 있다**(2026-09-21 `838201d1` 에서 같은 파일을 돌려 확인): `StudioView.ai.test.tsx` 3 · `TeachingOverview.test.tsx` 1 ·
> `examWiringAudit` 1 · `kstDate` 1 · `serverExternalPackages` 1 · `solutionWiring` 1. 워크트리에서도 같은 8건이다.

### 11.3 다음 — 이 순서

1. 메모리 여유가 있을 때 **앞에서**: `npx tsx scripts/qa/mutate-admin-scope.ts` 전량 · `npm run build`(Git Bash 에서 `0xc0000142` 가 나면 PowerShell → `cmd /c`).
2. **원장님께 여쭌 뒤** main 에서 드라이런: `npx tsx scripts/qa/apply-tenant-migration.ts` → 결과를 보고 `--apply`.
3. 🔴 적용을 **확인한 뒤에만** `phase/8-tenant` 를 main 에 병합·푸시한다(main 푸시 = 배포 · §6.1). 순서가 바뀌면 로그인 전원이 500 이다.
4. B단계 — 시험 지점 하나를 세워 관리자 아닌 계정으로 끝에서 끝까지 걷는다 → 통과하면 접기 마이그레이션(`DROP DEFAULT`).
5. C단계 — §9 의 ⓐⓑⓒ 가 정해지면 역할(`manager` · `teacher`)과 원장의 «계정» 화면(Wire 부터).

### 11.4 백업

워크트리는 **미커밋**이다(커밋 지시가 없었다). 2026-09-21 에 `D:/tmp/phase8-tenant-backup/` 에 떠 두었다 —
`tracked.patch`(추적 파일 75개의 diff · `838201d1` 위에 깨끗이 붙는다) · `untracked.tar`(새 파일 9개).
main 을 받기 직전 것은 그 아래 두 폴더에 있다 — `v2-before-sync/`(워크트리: `tracked.patch` · 바뀐 75파일을 통째로 담은 `modified-files.tar` ·
`untracked.tar` · 겹친 세 파일의 `overlap3.patch`) · `main-docs-before-pull/`(main 의 미커밋 문서 넷). **둘 다 옛 번호 D-135 다.**

### 11.5 main 을 받았다 — 351커밋 (2026-09-21 · `838201d1` → `3fd43dee`)

원장님 지시 *「최신 커밋 pull」*. main 은 빨리 감기(내 커밋이 없었다). 미커밋 문서 셋(`CLAUDE.md` · 07 · 20)이 받아 오는 쪽과 **같은 자리**(표 끝 · 파일 끝)를
고치고 있어서, 백업을 뜨고 되돌린 뒤 받고 **다시 얹었다**(`git stash` 는 안 썼다 — 보관함은 워크트리 전부가 같이 쓰는 한 줄이라 다른 세션의 `pop` 이 집어 갈 수 있다).

| 본 것 | 결과 |
|---|---|
| 받아 온 것의 성격 | 494파일 — 거의 전부 화면(작업실 편집기 · 도형 편집기 · 수학 랩실 `/lab`). **`prisma/schema.prisma` · `prisma/migrations` 변화 없음** → 내 마이그레이션이 여전히 맨 끝이다 |
| 운영 표를 만지는 새 자리 | **없다.** 받아 온 파일 중 제품 코드로 `db.class`·`db.test`·`db.user`·`student` … 를 부르는 것은 `tests/[id]/print/page.tsx` 하나이고, 그 질의는 여전히 `ownedRowsWhere(session)` 을 지난다. §5 의 전수 표(365곳/101파일)는 **다시 세지 않았다** — 위 한 줄이 근거다 |
| 내 워크트리와 겹친 파일 | **셋** — `src/proxy.ts`(랩실 관문 `isLabPath`) · `studioAiRoute.test.ts` · `UnifiedWorkspace.access.test.tsx`. 내 쪽은 일곱 줄(`tenantId` 한 줄씩)이라 세 파일만 되돌리고 받은 뒤 그 일곱 줄을 다시 붙였다(깨끗이 붙음). 나머지 72파일은 백업과 바이트 대조 — 다른 것 0 |
| 🔵 `tsc` 가 잡은 것 | **하나** — 받아 온 새 시험 `studioAiFigureEdit.test.ts` 가 `tenantId` 없는 `SessionUser` 를 세웠다. «칸을 필수로 두면 쓰는 자리가 전부 빨개진다»(§4.4)가 **남이 쓴 코드에도** 그대로 섰다. 픽스처 지점을 넣었다 |
| 새 의존물 | `ai` · `@ai-sdk/gateway` — main 과 워크트리 둘 다 `npm install`. npm 이 `package-lock.json` 을 자기 판으로 다시 썼는데(peer 표시 · 순서) 뜻 없는 소음이라 **둘 다 되돌렸다** |
| 번호 | D-135 → **D-136**. main 문서 넷 · 워크트리의 **내 줄** 79곳/37파일. 🔴 `src/proxy.ts` 의 `D-135 ⑻⑼` 는 받아 온 쪽의 것(랩실)이라 **두었다** — 파일이 아니라 «내가 더한 줄인가»로 갈랐다 |

**새 main 위에서 다시 돌린 관문**: `tsc` 0 · `src/__tests__/api` **55파일 · 1,136건 · 실패 0** · 받아 온 시험 중 세션·관문·DB 대역을 쓰는 8파일 + 지점 시험 5파일 + 번호 검사 = **14파일 · 355건 · 실패 0**
(`proxyLabGate` · `proxyStudentGate` · `studentSessionSweep` 포함) · 변이 하네스 앵커 `mutate-tenant-wall` 31 · `mutate-admin-scope` 39 전부 정확히 하나 · main 의 번호 검사 5건 초록.

**안 돌린 것은 §11.2 그대로다** — 두 변이 하네스 전량 · 전체 시험 · `npm run build` · 공유 DB 드라이런. 새 main 위에서 eslint 도 다시 안 돌렸다(바뀐 것은 시험 픽스처 두 줄 + 번호 글자).
