# 영어 자료은행 독립 검토 — Claude · 2026-10-03

검토 대상: `english-bank-review-brief-20261003.md` 의 결정 여섯 · main 작업공간의 계획서
`english-resource-bank-plan-20261003.md`(미커밋 판 — «문항에 맞는 그림 보기» 절 포함) · 지문은행 조사 보고서.
기준 커밋 `1fc3425ed`. 줄 번호는 이 커밋의 실제 줄이다.

**방법과 한계.** 코드 정적 추적만 했다. 앱 실행 · DB · 운영 · 유료 API · 하위 에이전트는 쓰지 않았다.
이 워크트리에는 `node_modules` 가 없어 **시험을 한 건도 돌리지 못했다** — 아래의 «확인»은 전부 코드를 읽은 것이다.
코디네이터가 보낸 EBSi 2026 2회 고1 문제지 근거(1번 그림 보기 · 10번 표 · 15번 상황 그림 + 음성 선택지)는
직접 열어 보지 않고 전달받은 대로 설계에 반영했다. 제품 코드 · 다른 보고서는 건드리지 않았고 커밋하지 않았다.

**2차 회신은 §9 에 있다.** 1차 권고 넷(상한 24,000 · 연결 표 없이 `meta` 만 · 새 권한 키 없음 · 불일치 참조는 연결 없이 저장)은
§9 에서 합의안 쪽으로 철회했다. §0~§8 은 1차 당시의 글 그대로다.

## 0. 결론

| 결정              | 권고                                                                                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1 지문 저장       | 새 표 둘(`english_passage` 머리 + `english_passage_revision` 불변 개정). 세트 연결은 새 표 없이 `meta.bank`. 삭제는 소프트 삭제                                    |
| 2 넣기 · 가져오기 | 은행 상한은 **24,000자**(세트 지문 · 2판 지문과 같은 값). 가져오기는 서버가 복사하고 원문/제작 지문을 서버가 판정. 넘으면 글자 수와 함께 거절                      |
| 3 메뉴 · 권한     | **새 저장 권한 키를 만들지 않는다.** 은행 화면은 기존 권한에서 파생. 🔴 `disabled_menus` CHECK 가 지금 코드의 영어 키와 어긋나 있다(§3.2)                          |
| 4 듣기 목록       | 기존 `GET …/listening/sets` 에 필터 · 키셋 쪽수 · `meta.nextCursor`. EBS 는 DB 없이 읽기 전용 목록, 서비스 안 재생 없음                                            |
| 5 그림            | **지금 스키마는 그림을 한 군데도 지원하지 않는다.** 보기 그림 · 문항 자극(그림/표) · 번호만 있는 보기를 한 계약으로. 발행은 전달 · 투영 · 검수 사슬이 다 선 뒤에만 |
| 6 범위            | 지금: 지문은행 + 듣기 목록 + EBS 참조 + 그림 **표본과 검사 스크립트**. 다음: 그림 저작(S1) → 그림 발행 · 학생 전달(S2)                                             |

## 1. 지문 — 독립 저장 · 개정 · 사본 · 연결

### 1.1 근거

- 자료 · 세트는 `examId` 필수, 시험 삭제에 연쇄 삭제된다(`prisma/schema.prisma:1525,1535` · `1544,1561`).
- 세트는 이미 자기 지문 사본을 가진다(`passage` — `schema.prisma:1550`). 세트 고치기(PUT)는 `meta` 를 건드리지 않는다(`src/app/api/english/sets/[id]/route.ts:94-103`) — «만든 때의 기록»이 유지된다.
- 2판 지문은 `{passageId, sourceRevision, text ≤ 24,000}`(`src/contracts/englishV2.contract.ts:218-222`).
- 🔴 1판 저장 관문은 **본문 맨 위 칸**과 **`questions[]` 안 칸**만 본다(`src/lib/english/v2/versionGate.ts:55-65`). `passageId` · `sourceRevision` 을 문항에, `provenance` · `rights` · `passages` 를 맨 위에 넣으면 2판으로 읽혀 400 이다(`englishV2.contract.ts:332-349`). 은행 참조는 `meta` 안에만 둘 수 있다.

### 1.2 최소 DB

```prisma
model EnglishPassage {
  id           String    @id @default(uuid()) @db.Uuid
  userId       String    @map("user_id") @db.Uuid          // 소유 — ownedRowsWhere(EnglishExam 과 같은 결)
  title        String    @db.VarChar(160)
  grade        String?   @db.VarChar(4)                     // ENGLISH_GRADES · 교사 지정
  sourceLabel  String?   @map("source_label") @db.VarChar(200)
  textKind     String    @map("text_kind") @db.VarChar(12)  // original | variant | unconfirmed
  rightsStatus String    @default("unknown") @map("rights_status") @db.VarChar(16)
  originKind   String    @map("origin_kind") @db.VarChar(16) // direct | txt | material | set_passage | set_source
  originId     String?   @map("origin_id") @db.Uuid          // FK 아님 — 원본이 지워져도 남는다
  clientKey    String    @map("client_key") @db.Uuid
  textRevision Int       @default(1) @map("text_revision")   // = 2판 sourceRevision. 본문이 바뀔 때만 +1
  textHash     String    @map("text_hash") @db.Char(64)      // 지금 개정의 정규화 해시
  charCount    Int       @map("char_count")
  wordCount    Int       @map("word_count")
  revision     Int       @default(1)                         // 행 CAS. 제목만 고쳐도 +1
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")
  deletedAt    DateTime? @map("deleted_at")
  user      User @relation(fields: [userId], references: [id], onDelete: Cascade)
  revisions EnglishPassageRevision[]
  @@unique([userId, clientKey])
  @@index([userId, updatedAt])
  @@index([userId, textHash])
  @@map("english_passage")
}
model EnglishPassageRevision {
  passageId String   @map("passage_id") @db.Uuid
  revision  Int
  text      String   @db.Text
  textHash  String   @map("text_hash") @db.Char(64)
  createdBy String   @map("created_by") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")
  passage EnglishPassage @relation(fields: [passageId], references: [id], onDelete: Cascade)
  @@id([passageId, revision])
  @@map("english_passage_revision")
}
```

SQL 에만 두는 것: `grade` · `text_kind` · `rights_status` · `origin_kind` 값 CHECK, `revision >= 1`, `text_revision >= 1`,
`char_length(text) BETWEEN 1 AND 24000`, 그리고 부분 유일 색인
`(user_id, origin_kind, origin_id, text_hash) WHERE origin_id IS NOT NULL AND deleted_at IS NULL`.
CHECK 마다 «어기는 삽입이 실제로 거절되는가»를 시험한다(교훈 2026-10-02 — NULL 은 CHECK 를 지난다).

**카운터를 둘로 나눈 까닭.** 하나로 합치면 제목만 고쳐도 세트의 `(passageId, 개정)` 이 «옛 원문»으로 보인다.
듣기 세트도 같은 구분을 쓴다(`schema.prisma:1582` 주석).

### 1.3 세트 연결 — 새 표 없이 `meta.bank`

```ts
// englishSetMetaSchema 에 더한다 (strictObject — 계약을 먼저 넓히지 않으면 저장이 400)
bank: z.strictObject({
  passageId: uuidSchema,
  textRevision: z.number().int().min(1),
  relation: z.enum(["verbatim", "excerpt", "variation"]).optional(), // 서버가 쓴다
  textSha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),        // 서버가 쓴다
}).optional(),
```

- 클라이언트는 `{passageId, textRevision}` 만 보낸다. `relation` · `textSha256` 은 **서버가 계산해 덮어쓴다**(요청 값은 믿지 않는다).
- 판정(정규화한 글로 비교): 세트 지문 = 그 개정 → `verbatim` · 그 개정이 세트 지문을 포함 → `excerpt` · `mode: "variation"` 이고 `meta.sourcePassage` 가 그 개정과 같거나 포함됨 → `variation`.
- 셋 다 아니면 **연결을 기록하지 않고 저장은 성공**한다. 돌아온 세트의 `meta.bank` 가 없으면 화면이 «원문 연결을 기록하지 않았습니다» 한 줄을 띄운다. 틀린 연결을 남기는 것도, 방금 만든 초안을 거절하는 것도 하지 않는다.
- 그 개정이 요청자의 소유 범위 밖이거나 없으면 400(같은 문구 — 존재를 드러내지 않는다).
- 「이 지문으로 만든 세트」: `meta->'bank'->>'passageId'` 로 찾되 **세트의 부모 시험을 `ownedRowsWhere` 로 거른다**. 지문이 범위 안이어도 범위 밖 시험의 세트는 안 나온다.
- 편집 화면은 `sha(지금 세트 지문) ≠ meta.bank.textSha256` 이면 «제작 뒤 고침»을 읽기 때 계산한다. `meta` 는 고치지 않는다.

연결 표를 따로 두지 않는 근거: 세트는 사본을 이미 가지고, `meta` 는 만든 때의 사실이며, 같은 시험의 세트를 `meta` 로 훑는 코드가 이미 있다(`src/app/api/english/exams/[id]/sets/route.ts:152-155`). 같은 `clientKey` 재시도는 본문만 견주므로(`sets/route.ts:65-93`) 은행 참조가 멱등성을 깨지 않는다.

### 1.4 API

| 경로                                                             | 동작                                                                                                                                                                                                                                   |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/english/passages?q&grade&textKind&origin&cursor&limit` | 요약 목록(본문 없음 — 앞 200자 · 글자 수 · 단어 수 · 개정 · 권리 표기). 키셋 `(updatedAt,id)`, `limit ≤ 50`, `meta.nextCursor`                                                                                                         |
| `POST /api/english/passages`                                     | JSON `{clientKey, title, grade?, sourceLabel?, origin}` — `origin` 은 `{kind:"direct", text, textKind}` · `{kind:"material", materialId}` · `{kind:"set_passage"\|"set_source", setId}`. TXT 는 multipart `file`. 201, 멱등 적중은 200 |
| `GET /api/english/passages/{id}`                                 | 상세 + 지금 개정 본문 + 개정 목록(번호 · 글자 수 · 시각)                                                                                                                                                                               |
| `GET /api/english/passages/{id}/revisions/{n}`                   | 그 개정 본문                                                                                                                                                                                                                           |
| `PATCH /api/english/passages/{id}`                               | `{expectedRevision, title?, grade?, sourceLabel?, textKind?, rightsStatus?, text?}` — 행 CAS, 어긋나면 409 `REVISION_MISMATCH`. 정규화 해시가 바뀐 때만 새 개정 행                                                                     |
| `DELETE /api/english/passages/{id}`                              | `{expectedRevision}` — 소프트 삭제. 세트 · 시험은 그대로                                                                                                                                                                               |
| `GET /api/english/passages/{id}/sets`                            | 이 지문으로 만든 세트 요약 + 시험 이름 + `relation` + `textRevision`                                                                                                                                                                   |

- **소유:** 목록은 `ownedRowsWhere(session)`, 단건은 `withinOwnerScope`. 새 행의 소유자는 **행위자**다(듣기 `createSet` 과 같다 — `src/lib/english/listening/runtime/sets.ts:108`). 관리자가 강사 자료를 가져오면 관리자 은행에 사본이 생긴다.
- **응답 코드:** 기존 영어 라우트는 없으면 404 · 범위 밖이면 403 이다(`src/lib/ownership.ts:138-148`). 은행은 듣기처럼 **둘 다 404**(`runtime/database.ts:27-28`)로 한다.
- **가져오기 접근:** 원본 자료/세트의 부모 시험에 `requireOwnedEnglishExam` 을 통과해야 한다. 본문은 서버가 원본 행에서 복사한다.
- **삭제:** 소프트 삭제라 개정 행과 `meta.bank` 가 남는다. 완전 삭제는 후속.

## 2. 넣기 · 가져오기 · 멱등 · 중복 · 길이

### 2.1 길이 — 한 표로

| 경계                | 값     | 근거                                                        | 은행 동작                                                                           |
| ------------------- | ------ | ----------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 은행 원문           | 24,000 | `ENGLISH_PASSAGE_MAX`(`english.contract.ts:104`) · 2판 지문 | 넘으면 422 + `{length, max}`. 자르지 않는다                                         |
| 시험 자료 `content` | 30,000 | `english.contract.ts:103`                                   | 24,001자 이상 자료는 통째 가져오기 거절 → «나눠서 직접 입력» 안내                   |
| AI 생성 · 변형 입력 | 18,000 | `english.contract.ts:314` · `meta.sourcePassage`(`:232`)    | 상세에 «AI 생성 불가 — 원문 복원만» 표시, 만들기로 넘길 때 해당 탭을 막고 사유 표시 |

- 🔴 **지금 코드에 조용한 자름이 하나 있다.** TXT 자료 업로드는 30,000자를 넘는 뒷부분을 말없이 버린다(`src/app/api/english/exams/[id]/materials/route.ts:104-113`). 은행 TXT 경로는 이 `clampUtf16` 을 쓰지 않는다.
- 상한을 24,000 으로 두면 이 잘린 사본(항상 약 30,000자)은 가져오기에서 거절돼 «원문»으로 들어올 수 없다. **상한을 30,000 으로 정한다면** 가져올 때 `bytes` 를 다시 풀어 `content` 보다 길면 «잘린 사본»으로 막는 검사가 필수가 된다.
- 만들기 화면은 지금도 18,000 초과를 자르지 않고 계약으로 거절한다(`EnglishMakerView.tsx:348-360` · 원문 복원은 `:521-526`). 은행은 그 거절을 **넘기기 전에** 보여 주기만 하면 된다.

### 2.2 원문과 제작 지문 — 서버가 저장된 `meta` 로 판정

| 원본                                                           | `textKind`                                          |
| -------------------------------------------------------------- | --------------------------------------------------- |
| 세트의 `meta.sourcePassage`(`set_source`)                      | `original`                                          |
| 세트 지문, `meta.mode = "original"` 또는 `meta.path = "cloze"` | `original`                                          |
| 세트 지문, `meta.mode = "variation" \| "new"`                  | `variant`                                           |
| 세트 지문, `meta` 없음(옛 세트 · 손으로 만든 세트)             | `unconfirmed` — 교사가 상세에서 확정해야 `original` |
| 시험 자료 `content`                                            | `original`, 권리 표기는 `unknown`                   |

`materialName` 은 식별자가 아니다 — 글이 같을 때만 실리는 이름일 뿐이다(`EnglishMakerView.tsx:276-279`). 이름으로 원본을 동일시하지 않는다.

### 2.3 멱등 · 중복

- **재시도:** `(userId, clientKey)` 유일. 같은 키 · 같은 본문 → 그 행(200), 같은 키 · 다른 본문 → 409(세트 저장과 같은 뜻).
- **같은 원본 다시 가져오기:** 부분 유일 색인으로 그 행을 돌려준다(200, `created: false`).
- **완전 중복 후보:** 같은 소유자 안의 같은 `textHash` 를 응답 `duplicates[]` 로 알린다. 막지 않고 병합하지 않는다. 🔴 유일 제약 · 후보 조회 모두 **소유자 단위**다 — 전역 유일 제약은 위반 오류로 남의 원문 존재를 드러낸다.
- **정규화(해시 · 비교 전용):** NFC + 공백 묶음 → 한 칸 + 앞뒤 자름. 저장 본문은 줄끝만 `\n` 으로 맞춘다(2판 자리가 밀리지 않게).

### 2.4 권리 표기

MVP 는 `rightsStatus` **표기만** 한다(가져온 것은 `unknown`). 지금 만들기 화면은 붙여 넣은 글을 권리 확인 없이 외부 모델로 보낸다 — 은행이 그 동작을 바꾸지 않으며, 표기가 «확인됨»으로 읽히지 않게 문구를 «미확인»으로 둔다. `reference_only` 지문의 AI 입력 차단은 생성 요청 계약을 바꿔야 해서 후속이다.

## 3. 메뉴 · 권한

### 3.1 근거와 권고

- 영어 경로는 **허용 목록**이다. 모르는 영어 경로는 거절된다(`src/lib/accountRouteAccess.ts:11-68`, 끝 줄 `return false`).
- 🔴 관리자는 그 목록을 건너뛴다(`accountRouteAccess.ts:97` · `src/lib/english/routeSupport.ts:38`). 새 경로를 목록에 안 적으면 **관리자에게는 되고 강사에게만 403** 이다 — 관리자 세션으로 한 시험은 이 결함을 못 본다.
- 메뉴 저장은 «꺼 둔 메뉴» 목록이다(`src/app/api/admin/users/[id]/route.ts:227`). 새 키는 **기본이 켜짐**이라, 영어 세 메뉴를 다 꺼 둔 계정에도 열린다. 듣기 메뉴는 이 문제를 `workspaceMenusFromDisabled` 의 특례로 막았다(`src/contracts/accountAccess.contract.ts:71-83`).
- 듣기는 메뉴와 별개로 시범 명단을 런타임에서 다시 본다(`runtime/database.ts:88-102` → `src/lib/listeningPilot.ts:9-19`). 관리자도 예외가 아니다.

**권고: 새 저장 권한 키 없이 간다.** 셸의 새 뷰 `english-bank` 는 `english-school ∨ english-maker ∨ english-listening` 이면 보인다.

| 대상                                        | 필요한 기존 권한                                   |
| ------------------------------------------- | -------------------------------------------------- |
| 지문 탭 읽기 · `GET /api/english/passages…` | `english-school ∨ english-maker`                   |
| 지문 등록 · 가져오기 · 고치기 · 삭제        | `english-school ∨ english-maker`                   |
| 「이 지문으로 문제 만들기」                 | `english-maker`(없으면 단추 없음)                  |
| `GET /api/english/passages/{id}/sets`       | `english-school ∨ english-maker ∨ english-library` |
| 듣기 탭 전체(자체 목록 + EBS 참조)          | `english-listening` + 기존 시범 관문 그대로        |

은행 뷰는 시험이 없어도 열려야 한다. 지금 영어 화면은 시험이 없으면 전부 빈 화면이다(`src/components/english/EnglishStudio.tsx:370`) — 은행은 그 분기 밖(듣기 스튜디오처럼 셸의 형제 뷰)에 두고, 문제 만들기로 넘길 때 대상 시험을 고른다. 만들기 화면에는 밖에서 원문을 넣는 입구가 없다(상태가 컴포넌트 안 `useState`) — prefill 입구 하나가 필요하다.

### 3.2 🔴 지금 있는 불일치 — 은행과 무관하게 먼저 확인할 것

- 마이그레이션의 마지막 `user_disabled_menus_valid` 는 `'english'` 까지 열 개만 허용한다(`prisma/migrations/20261001180000_user_menus_check_all/migration.sql`).
- 코드가 저장하는 값은 `english-school` · `english-maker` · `english-library` · `english-listening` 이다(`accountAccess.contract.ts:25-28` · 저장은 `admin/users/[id]/route.ts:227`).
- 저장소 안에서 이 제약을 다시 정의하는 곳은 없다(마이그레이션 둘 + 시험 하나뿐). 정적으로 견주면 **코드에 있고 CHECK 에 없는 것 넷, CHECK 에만 있는 것 `english` 하나**다.
- 운영 DB 의 실제 정의가 마이그레이션과 같다면 영어 하위 메뉴를 하나라도 끄고 저장할 때 23514 로 500 이다(2026-10-01 사고와 같은 꼴). 가드 시험 `workspaceMenuConstraint.test.ts` 도 이 커밋에서 빨강이어야 맞다.
- **확인하지 못한 것:** 운영 DB 의 실제 제약(접근하지 않았다) · 그 시험의 실제 결과(돌리지 못했다). 리드가 main 에서 그 시험 한 파일과 운영 제약 정의를 확인해야 한다.

새 권한 키를 만들기로 정한다면 필요한 것: 메뉴 배열과 enum 두 곳(`accountAccess.contract.ts:30` 경고) · `workspaceMenusFromDisabled` 특례에 새 키 추가 · CHECK 마이그레이션(DB 먼저 · 코드 나중) · 허용 목록 · 관리자 화면.

## 4. 듣기 목록 · 공식 링크

### 4.1 자체 듣기 목록

- 지금 목록은 문서 JSON 전체(`s.*` — 묶음마다 대본 최대 40,000자)를 읽어 **말없이 200개에서 끊는다**(`runtime/sets.ts:60-65`). 201번째 자료는 표시도 경고도 없이 사라진다.
- 권고: 같은 경로에 `?q&level&state&cursor&limit` 를 더한다. 응답은 `{data: 요약[], meta: {nextCursor, levels}}` — `data` 가 배열 그대로라 옛 화면이 깨지지 않는다.
- SQL: `document->>'title' ILIKE`(`%` · `_` 이스케이프) · `document->>'level' =` · `state` 는 발행 행 유무. 키셋 `(updated_at, id)`, `limit ≤ 50`. 읽는 칸은 제목 · 수준 · 묶음 수 · 문항 수 · 길이 합만(`document` 통째로 읽지 않는다).
- 🔴 소유 조건 세 갈래(`sets.ts:65`)는 그대로 둔다. 필터를 더하다 조건이 느슨해지는 것이 이 변경의 주된 회귀 위험이다.
- `level` 은 자유 글이다(`englishListening.contract.ts:76`) — «학년» 필터는 정확히 일치하는 값 목록(`meta.levels`)으로만 한다. 학년 enum 은 문서 스키마 변경이라 후속.
- 검수 · 발행 · 삭제 관문은 손대지 않는다(`sets.ts:233-349`). 은행은 기존 자료 열기로 이어 줄 뿐이다.
- **범위 밖임을 분명히:** Kokoro 샘플은 최고관리자 소유라 다른 강사 목록에 안 나온다. «서비스 공용 자료 → 내 자료로 복사»는 권리 · 음원 복사 설계가 필요한 후속이며, 은행이라는 이름으로 열지 않는다.

### 4.2 EBS 공식 링크

- 목록은 192회, 전부 `reuseStatus: "permission-required"` · `hosted: false`. 권리 판단은 «원본 재업로드 · 가공 · **서비스 내 스트리밍** 허용 미확인»이다.
- 🔴 문제지 · 정답 · 대본 · 묶음 링크는 **72회가 null** 이다(요약 수치 120 과 일치). 빈 링크를 죽은 단추로 그리지 않는다.
- 권고: DB 없이 읽기 전용. 목록 JSON 을 듣기 탭이 늦게 불러오고(149KB), 듣기 권한이 있는 계정에만 탭이 보인다. 새 API · 허용 목록 줄이 필요 없다.
- 화면 규칙: 첫 동작은 공식 페이지(`sourceUrl`) 새 창 열기(`rel="noopener noreferrer"`). 우리 페이지 안의 `<audio>` · `<iframe>` · 서버 대리 내려받기 · AI 입력 · 듣기 세트로 저장은 없다(`provenance.kind` 가 `teacher_authored` 하나뿐이다 — `englishListening.contract.ts:78-83`). `checkedAt` 과 «접근 · 내용 검수 전»을 같이 보인다.

## 5. 그림 — 보기 그림 · 문항 자극 · 표

### 5.1 지금은 지원하지 않는다

| 자리                   | 지금 상태                                                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 문서 계약의 보기       | `{id, text}` 뿐, strict(`englishListening.contract.ts:27`)                                                                                 |
| 초안(HTTP) 계약의 보기 | 같은 모양을 **따로 한 번 더** 적었다(`englishListeningHttp.contract.ts:22-24`)                                                             |
| 학생 계약의 보기       | `{id, text}` strict(`englishListeningStudent.contract.ts:6`)                                                                               |
| 학생 투영              | 허용 목록이 `id` · `text` 만 옮긴다(`src/lib/english/listening/projection.ts:38-41`)                                                       |
| 인쇄                   | 보기를 글 배열로만 만든다(`src/lib/english/listening/print.ts:39`)                                                                         |
| 파일 저장 · 전달       | 음원 전용 — MIME 이 `audio/wav` · `audio/mpeg`(`englishListeningMedia.contract.ts:7`), 서빙이 `audio/wav` 고정(`media/service.ts:727-731`) |
| 학생 파일 접근         | `student_device` 이고 음원 목록에 든 자산만(`access.ts:169-176` · `runtime/students.ts:120`)                                               |

문항 수준의 그림 · 표 칸은 어디에도 없다. 그림이 든 초안을 지금 저장하면 400 이다.

### 5.2 계약 — 없는 칸은 싣지 않는다

```ts
export const listeningImageRefSchema = z.strictObject({
  assetId: id, sha256: hash,
  width: z.number().int().min(64).max(4096),
  height: z.number().int().min(64).max(4096),
});
export const listeningChoiceSchema = z.strictObject({
  id,
  text: text(2000),                      // 그림 · 번호 보기에서는 «중립 대체 설명» — 화면에는 alt/aria 로만
  image: listeningImageRefSchema.optional(),
});
export const listeningStimulusSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("image"), image: listeningImageRefSchema, alt: text(1000) }),
  z.strictObject({
    kind: z.literal("table"),
    caption: text(200).optional(),
    header: z.array(text(120)).min(1).max(8),
    rows: z.array(z.array(text(120)).min(1).max(8)).min(1).max(10),
  }),
]);
// listeningQuestionSchema 에 더한다
stimulus: listeningStimulusSchema.optional(),
choiceDisplay: z.enum(["image", "number"]).optional(), // 없으면 글 보기
```

코디네이터 근거의 세 꼴이 이 한 계약에 들어간다: 1번(보기 다섯이 그림) = `choiceDisplay: "image"` · 10번(표를 보며 듣기) = `stimulus.kind: "table"` + `"number"` · 15번(상황 그림 + 음성 선택지) = `stimulus.kind: "image"` + `"number"`.

**정확한 수치 · 배치가 핵심인 자료**는 둘로 가른다. 표는 구조 데이터로 저장해 화면 · 인쇄가 그린다(자산 없음 · 글자가 그대로 해시에 든다). 지도 · 시계 · 가격표는 저장소의 생성 스크립트가 PNG 로 만들어 그림 자산으로 넣고, `origin` 에 생성기 이름과 입력 해시를 남긴다 — 종류마다 런타임 렌더러를 두지 않는다.

문서 검증(발행 가능한 문서에만 — 초안은 느슨하게):

- 한 문항의 보기 그림은 **전부 있거나 전부 없다.** `choiceDisplay: "image"` ⇔ 전부 있음, `"number"` ⇒ 보기 그림 없음.
- 한 문항 안에서 보기 그림의 `sha256` 은 서로 다르고(같은 그림 둘 = 정답 둘), `width × height` 가 같다.
- 보기의 `text` 는 문항 안에서 서로 다르다(그림을 못 보는 학생이 구별할 수 있어야 한다).
- 표는 모든 행의 칸 수가 머리와 같다.

🔴 **해시 안정성.** 검수와 발행은 문항 전체를 넣은 내용 해시에 서명한다(`publication.ts:34-46`). 발행본은 **읽을 때마다** 다시 파싱해 해시를 견준다(`publication.ts:148-160`). 새 칸에 기본값이나 `null` 을 주면 옛 발행본의 파싱 결과가 달라져 «content hash mismatch» 로 **기존 배정 전부가 학생에게 안 열린다.** 새 칸은 «없으면 키 자체가 없다»여야 한다. 스키마 판은 1 로 두는 것을 권고한다(판을 올리려면 두 판을 같이 읽는 파서가 든다) — 어느 쪽이든 «옛 발행본의 해시가 그대로»가 불변식이다.

### 5.3 저장 — 불변 자산, 세트에 귀속

```prisma
model EnglishListeningImage {
  id         String   @id @db.Uuid
  setId      String   @map("set_id") @db.Uuid
  ownerId    String   @map("owner_id") @db.Uuid
  branchId   String?  @map("branch_id") @db.Uuid
  sha256     String   @db.Char(64)        // 저장한(메타데이터를 걷어낸) 바이트의 해시
  mimeType   String   @map("mime_type") @db.VarChar(20)  // image/png 만
  width      Int
  height     Int
  byteLength Int      @map("byte_length")
  bytes      Bytes
  origin     Json     @db.JsonB           // 교사 전용 — {kind: upload|motif|code_diagram, motifId?, generator?, specSha256?}
  createdBy  String   @map("created_by") @db.Uuid
  createdAt  DateTime @default(now()) @map("created_at")
  set EnglishListeningSet @relation(fields: [setId], references: [id], onDelete: Restrict)
  @@unique([setId, sha256])
  @@index([ownerId])
  @@map("english_listening_image")
}
```

- 음원 서비스(836줄, 청크 · 디코드 · CAS)에 그림을 얹지 않는다. 그림은 한 요청에 끝나는 작은 파일이고 검증이 다르다.
- 행은 **고치지 않는다.** 그림을 바꾼다 = 새 행 + 문서의 참조 교체 = 문서 변경. 발행본이 가리키는 행은 지우지 않는다.
- **소재와 보기 묶음의 구분.** 소재는 서비스가 준비한 그림 원본과 목록(`motifId · sha256 · 크기 · 꼬리표 · 생성 도구 · 날짜`)이다. 보기 묶음은 문항 안의 참조 다섯이다. 소재를 쓰면 바이트를 **그 세트의 자산으로 복사**하고 `origin` 에 `motifId` 와 소재 해시를 남긴다 — 소재를 고치거나 지워도 발행본이 바뀌지 않는다. 소재의 «개정»은 새 `motifId` + `supersedes` 다.

### 5.4 API

| 경로                                                                     | 동작                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/english/listening/sets/{id}/images`                           | multipart `file` + `origin`. 세트 소유 · 권리 확인(음원 업로드와 같은 관문 — `runtime/mediaAccess.ts:45-59`) → PNG 서명 확인 → IHDR 에서 크기 → 보조 청크 제거 → 해시 → `(setId, sha256)` upsert. 응답 `{assetId, sha256, width, height}` |
| `GET\|HEAD /api/english/listening/sets/{id}/images/{assetId}`            | 교사용. `private, no-store` · `nosniff` · `image/png` · 파일 이름은 `image-{assetId}.png`                                                                                                                                                 |
| `GET\|HEAD /api/english/learn/listening/{assignmentId}/images/{assetId}` | 학생용. **읽기 관문**(`studentState`) + 그 발행본의 그림 참조에 든 자산 + 세트 일치 + 해시 일치                                                                                                                                           |

- 🔴 학생 그림은 음원 관문으로 판정하면 안 된다. 음원 관문은 `student_device` 를 요구한다(`access.ts:169-176`) — 교사 기기 재생 수업에서 그림이 전부 404 가 된다. 그림은 발문 · 보기 글과 같은 «읽기» 조건으로 연다(잠긴 상태에서도 보여야 풀 수 있다).
- 허용 목록 두 곳에 적는다: 학생 `src/lib/studentRouteAccess.ts`(듣기 줄 `:88-123` 옆) · 교사 `accountRouteAccess.ts`. 안 적으면 닫힌다.
- 저장(PATCH) · 내용 검수 · 발행 때 문서의 모든 그림 참조를 저장된 행과 대조한다(세트 · 소유 · 해시 · 크기) — 음원의 `verifiedMedia`(`sets.ts:204-232`)와 같은 자리.
- 학생 응답 계약은 바뀌지 않는다(`choiceId` 하나).

### 5.5 학생에게 가는 것 · 가지 않는 것

- 간다: 보기 `{id, text, image: {assetId, width, height}}` · 자극(그림 참조 + `alt`, 또는 표) · `choiceDisplay` · 그림 주소 표.
- 가지 않는다: `origin`(생성 도구 · 소재 · 입력), 원래 파일 이름, 올린 순서. 투영은 허용 목록이라 **한 줄이라도 빠뜨리면 그림이 말없이 사라지고, 통째로 펼치면 `origin` 이 샌다** — 양쪽 다 시험한다.
- 🔴 PNG 안의 글 청크(`tEXt` · `iTXt` · `zTXt` · `eXIf`)를 걷어낸다. 그림 생성 도구는 프롬프트를 파일 안에 넣는 일이 있다 — 학생이 그림을 내려받아 «정답은 빨간 우산»을 읽을 수 있다. MVP 는 **PNG 만** 받는다. SVG 는 같은 출처에서 스크립트가 도는 문서라 받지 않는다.
- 학생 화면은 응답을 strict 로 파싱한다(`src/components/learn/english-listening/runtime.ts:39-44`). 그림 없는 발행본의 응답에는 새 키가 없어야 열려 있던 옛 탭이 깨지지 않는다.

### 5.6 수정 시 검수 무효화 — 이미 있는 장치로 된다, 조건 둘

- 세트를 저장하면 모든 묶음의 검수가 지워진다(`sets.ts:156`). 발행은 세 검수가 지금 문서 개정 · 지금 내용 해시와 맞아야 한다(`publication.ts:66-79`).
- 조건 1: 그림 참조(`sha256` 포함)가 **문항 안**에 있어야 해시에 든다. 조건 2: 자산 행이 불변이어야 한다. 같은 id 로 바이트를 갈아 끼울 수 있으면 검수가 무효화되지 않는다.
- 사람 검수는 «내용 검수»에 묶는 것을 최소 경로로 권고한다. 단 검수 화면이 그림을 **학생 화면 크기로** 그려야 한다 — 글만 보고 누르는 검수는 그림을 검수한 것이 아니다. 별도 «그림 검수» 도장은 `reviews` 가 해시 밖이라(`publication.ts:39-44`) 나중에 더해도 옛 해시가 안 바뀐다.

### 5.7 인쇄

인쇄 문서는 보기를 글로만 만든다(`print.ts:39`). 그림 문항을 그대로 인쇄하면 **대체 설명이 보기로 찍힌다** — 그림 문제가 읽기 문제로 바뀐다. 그림을 그리거나, 그림 세트의 인쇄를 사유와 함께 막거나 둘 중 하나여야 한다. 그리는 쪽이면 그림이 다 실린 뒤 인쇄하고, `/dev/print-check` 에 항목을 더하고, 흑백 실물 출력까지가 완료 조건이다(절대 규칙 6).

### 5.8 단계

| 단계                    | 내용                                                                                                                                                                                                                                               | 발행                                                                                                         |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| S0 지금 · 스키마 무변경 | 소량 표본(보기 묶음 · 상황 그림 · 표 · 코드 도식 각 몇 건) + 목록 + **오프라인 검사 스크립트**(PNG · 묶음 안 크기 일치 · 글 청크 0 · 해시 중복 0 · 파일 이름이 정답을 말하지 않음) + 사람 점검표(대본 일치 · 정답 유일 · 보기 구별 · 폰 폭 · 흑백) | 해당 없음                                                                                                    |
| S1 저작                 | **초안 계약에만** 칸 추가 · 그림 표 · 교사 업로드/서빙 · 편집기 · 검수 화면 표시                                                                                                                                                                   | 불가 — 문서 계약이 칸을 몰라 거절. 일반 400 대신 «그림 문항은 아직 발행할 수 없습니다»를 내는 명시 분기 필요 |
| S2 발행 · 학생          | 문서 · 발행 · 학생 계약 + 투영 + 학생 그림 경로 + 발행 때 대조 + 인쇄(또는 인쇄 차단)                                                                                                                                                              | 가능                                                                                                         |

초안/문서 두 층은 이미 있다(`englishListeningHttp.contract.ts:31-46`) — S1 에서 발행이 구조적으로 막힌다. 그림 대량 생성은 S0 의 검사 스크립트와 점검표가 표본에서 통과한 뒤에 한다.

## 6. 막아야 할 결함과 취향

**반드시 막는다**

| #   | 결함                                                                                              | 근거                                                         |
| --- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| B1  | 은행 참조를 문항이나 본문 맨 위에 넣어 1판 저장이 400                                             | `versionGate.ts:55-65`                                       |
| B2  | 범위 밖 지문 · 세트의 존재가 드러남(403/404 구분 · 전역 유일 제약 · 범위 없는 「만든 세트」 목록) | `ownership.ts:138-148`                                       |
| B3  | 본문을 말없이 자름                                                                                | `materials/route.ts:113`                                     |
| B4  | 은행 본문을 세트가 실시간으로 참조해 옛 시험지가 바뀜                                             | 세트는 자기 사본만 읽어야 한다                               |
| B5  | 개정 행을 제자리에서 고침                                                                         | 세트의 `(passageId, textRevision)` 이 가리키는 글이 달라진다 |
| B6  | 새 영어 경로가 허용 목록에 없어 강사만 403                                                        | `accountRouteAccess.ts:67,97`                                |
| B7  | 새 권한 키가 영어를 꺼 둔 계정에 기본으로 열림 · CHECK 밖 값 저장                                 | `accountAccess.contract.ts:71-83` · §3.2                     |
| B8  | 듣기 목록이 200에서 말없이 끊김 · 필터를 더하며 소유 조건이 느슨해짐                              | `sets.ts:60-65`                                              |
| B9  | EBS 자료가 서비스 안에서 재생되거나 세트로 저장됨                                                 | 목록의 권리 판단                                             |
| B10 | 새 칸의 기본값이 옛 발행본의 해시를 바꿈                                                          | `publication.ts:148-160`                                     |
| B11 | 학생 그림이 음원 관문을 타서 교사 기기 수업에서 안 열림                                           | `access.ts:169-176`                                          |
| B12 | 그림 바이트 · `origin` · 파일 이름으로 정답이 샘                                                  | `projection.ts:38-41`                                        |
| B13 | 자산을 갈아 끼울 수 있어 검수가 무효화되지 않음                                                   | `sets.ts:156` · `publication.ts:66-79`                       |
| B14 | 그림 문항이 대체 설명으로 인쇄됨                                                                  | `print.ts:39`                                                |
| B15 | 보기 그림이 일부만 있거나 크기 · 그림이 겹침                                                      | 문서 검증(§5.2)                                              |

**취향 · 후속:** 주제 · 문법 태그, 즐겨찾기 · 폴더, 구간을 골라 가져오기, 듣기 학년 enum, 별도 «그림 검수» 도장, 그림 응답 캐시, 소재 고르기 화면, 서비스 공용 자료 복사, `reference_only` 의 AI 입력 차단, 은행 전용 권한 키.

## 7. 수용 테스트

모두 **관리자가 아닌 강사 세션**을 기본으로 한다(관리자는 허용 목록을 건너뛴다). 계약 모양만 보는 시험은 근거가 아니다.

**지문은행**

1. 강사 A · 같은 지점 강사 B · 다른 지점 강사 C · 지점 관리자 · 최고관리자로 목록 · 상세 · 개정 · 고치기 · 삭제 · 「만든 세트」 · 가져오기를 각각 — 범위 밖은 전부 404, 본문 · 제목이 응답에 없다.
2. 시험을 삭제해도 그 자료에서 가져온 지문과 개정이 남는다. 지문을 삭제해도 세트의 지문 · 문항 · `meta.bank` 가 그대로다.
3. 본문을 고치면 개정 행이 하나 늘고 **옛 개정 행의 글과 해시가 바이트 그대로**다. 제목만 고치면 `textRevision` 이 그대로다.
4. 옛 `expectedRevision` 으로 PATCH · DELETE → 409, 행 불변. 같은 값으로 동시에 둘 → 하나만 성공.
5. 같은 `clientKey` · 같은 본문 재전송 → 200 같은 행. 다른 본문 → 409. 같은 자료를 두 번 가져오기 → 행 하나.
6. 24,000자 → 저장. 24,001자(직접 · TXT · 자료 가져오기 각각) → 422 에 글자 수, 행 없음. 경계에 서로게이트 쌍을 걸친 글도 같은 결과.
7. 18,001자 지문으로 문제 만들기 → AI 생성 · 변형이 막히고 사유가 보인다. 저장된 글은 한 글자도 줄지 않는다.
8. `meta` 없는 세트 → `unconfirmed`. `mode: "variation"` 세트의 지문 → `variant`, 그 `sourcePassage` → `original`. 요청이 `textKind` 를 우겨도 서버 판정이 이긴다.
9. 세트 저장: 지문이 개정과 같으면 `verbatim`, 일부면 `excerpt`, 변형이면 `variation`, 무관한 글이면 `meta.bank` 없이 201. 요청이 보낸 `relation` 은 무시된다. 문항 안에 `passageId` 를 넣은 본문은 여전히 400.
10. 다른 소유자의 같은 글이 있어도 `duplicates` 는 비고 저장은 성공한다.
11. `english-maker` 만 있는 강사 · `english-school` 만 · 영어 셋 다 꺼진 강사로 은행 경로를 호출 — 표(§3.1)대로 200/403. 영어를 다 꺼 둔 계정에 은행 뷰가 안 보인다.

**듣기 목록 · EBS** 12. 자료 201개에서 첫 쪽이 `nextCursor` 를 주고, 끝까지 넘기면 201개가 중복 · 누락 없이 나온다. 넘기는 도중 한 건이 고쳐져도 누락이 없다. 13. 제목 `%` · `_` 검색이 와일드카드로 동작하지 않는다. 필터를 줘도 강사 · 지점 관리자 · 최고관리자의 범위가 필터 없을 때와 같다 — 소유 조건을 «항상 참»으로 뒤집으면 이 시험이 빨개지는지도 본다. 14. 링크가 null 인 EBS 회차에 죽은 링크가 없다. 듣기 탭 DOM 에 EBS 주소를 가진 `audio` · `iframe` 이 없다. 듣기 권한이 없으면 탭이 없다.

**그림 (S1 · S2)** 15. **현재 운영 꼴의 발행본 고정물**(변경 전 문서에서 뜬 JSON)이 변경 후에도 같은 `contentHash` 로 검증을 지난다. 새 칸에 기본값을 넣는 변이를 가하면 빨개진다. 16. 그림 없는 발행본의 학생 응답에 `image` · `stimulus` · `choiceDisplay` · `images` 키가 없다(옛 탭 호환). 17. `teacher_device` 배정의 대상 학생이 그림을 200 으로 받는다. 같은 학생이 그 배정의 음원을 요청하면 여전히 404. 18. 대상 아닌 학생 · 취소된 배정 · 철회된 발행 · 다른 세트의 자산 id · 발행본에 없는 자산 id → 전부 404. 19. `tEXt` 에 문장을 넣은 PNG 를 올린 뒤 학생 경로로 받은 바이트에 그 문장이 없다. PNG 가 아닌 파일(확장자만 png 인 SVG · JPEG)은 거절된다. 20. 그림 문항의 학생 응답 · 학생용 인쇄 HTML · 하이드레이션 값에 `origin` · 생성기 이름 · 소재 id · 정답 id 가 없다. 21. 보기 다섯 중 넷만 그림 · 같은 그림 둘 · 크기가 다른 그림 · 같은 대체 설명 → 발행 거절. 초안 저장은 된다. 22. 발행 뒤 그림 하나를 바꿔 저장 → 모든 검수가 비고 발행이 거절된다. 옛 발행본과 그 배정은 옛 그림으로 계속 열린다. 23. 저장 요청이 다른 세트의 자산 id 나 틀린 해시 · 크기를 담으면 거절된다(클라이언트가 보낸 값은 믿지 않는다). 24. S1 상태에서 그림이 든 초안의 검수 · 발행 요청이 명시 문구로 거절된다. 25. 그림 세트 인쇄: 그림이 실린 뒤 인쇄되거나 사유와 함께 막힌다. 대체 설명이 보기로 찍히지 않는다. 실물 흑백 출력 검수. 26. S0 검사 스크립트가 글 청크가 남은 표본 · 크기가 다른 묶음을 실제로 떨어뜨린다(일부러 결함을 넣은 표본으로 확인).

## 8. 합의가 필요한 것

1. 은행 상한 24,000(권고) 대 30,000 — 30,000 이면 «잘린 사본» 검사가 필수가 된다(§2.1).
2. 가져온 지문의 소유자: 행위자(권고) 대 원 시험의 소유자.
3. 권한: 기존 권한에서 파생(권고) 대 새 키 `english-bank`(§3.2 의 비용).
4. 그림 스키마: 판 1 유지 + 없는 칸 생략(권고) 대 판 2.
5. 그림 문항의 학생 화면 · 인쇄 배치는 **새 형태**다. 승인된 것은 은행 목록+상세(Wire A)와 기존 디자인 재사용이고, 그림 격자 · 자극 자리 · 폰 폭 배치는 그 안에 없다 — 절대 규칙 1 에 따라 시안이 먼저인지 원장님 확인이 필요하다. 계약 · 저장 작업은 이 결정과 무관하게 진행할 수 있다.
6. 운영 DB 의 `user_disabled_menus_valid` 실제 정의와 가드 시험 결과(§3.2) — 리드 확인.
7. 마이그레이션은 DB 먼저 · 코드 나중, 운영 적용은 원장님 승인 뒤.

## 9. 합의안 회신 (2차)

읽은 것: main 작업공간의 `english-bank-consensus-20261003.md`(«쟁점의 조정 근거» · «메뉴 결함 실측» 포함) · Grok 보고서.
새로 본 코드는 `validate.ts` · `common.contract.ts` · 표본 PNG 의 청크뿐이다. 시험은 이번에도 돌리지 않았다.

**요약: 열 가지 모두 동의한다. 합의문에 반영돼야 하는 정확한 변경은 넷(C1~C4)이다.** 넷 다 범위를 넓히지 않는다.

| 결정                                                   | 회신                                 |
| ------------------------------------------------------ | ------------------------------------ |
| 1 은행 30,000 + 바이트 대조                            | 동의(24,000 권고 철회) — **C2**      |
| 2 가져온 지문은 행위자 소유                            | 동의                                 |
| 3 `EnglishPassageUse` 에 원문 · 출처 사본을 원자적으로 | 동의(«표 없이 `meta`» 철회) — **C1** |
| 4 새 키 `english-bank` + 전체 차단 호환 + CHECK 먼저   | 동의(«키 없이 파생» 철회) — **C3**   |
| 5 같은 키 · 다른 은행 참조는 409                       | 동의                                 |
| 6 틀린 · 무관한 참조는 조치 가능한 409                 | 동의(«연결 없이 저장» 철회) — **C4** |
| 7 재사용 전 권리 확인은 은행 경로만                    | 동의 — 아래 조건 둘                  |
| 8 그림은 S0 표본만, 그림 칸 · 학생 전달 없음           | 동의 — 1차 규칙 하나 정정            |
| 9 메뉴 제약 실측                                       | 실측으로 닫혔다 — C3 로 이어짐       |
| 10 은행은 A안 승인으로 충분, 그림 배치는 나중          | 동의                                 |

### 반영돼야 하는 변경

**C1 — 대조의 자와 사본의 출처를 고정한다 (결정 3 · 6).**
지금 검증기는 «원문 유지»에서 지문이 입력과 같은지를 **공백을 접어서** 본다(`src/lib/english/validate.ts:21-23` · `149-156`). 모델이 줄바꿈만 바꿔 돌려준 세트는 지금 통과한다. 은행 대조를 정확 해시로 하면 검증기를 지난 그 세트가 409 가 된다. Grok 보고서의 «사본 해시가 그 개정과 같을 때만 201» 은 이렇게 읽어야 한다:

- 관련성 대조는 `normalizeEnglishText` 와 같은 자(공백 접기)에 NFC 를 더한 것으로 한다.
- 사용 행의 원문 사본은 **서버가 개정 행에서 읽어** 쓴다. 요청 본문의 글을 사본으로 쓰지 않는다.
- `snapshotHash` 는 «그 개정 글의 정확 해시» 하나로 정의한다. 요청이 보낸 해시는 대조만 한다.

**C2 — 24,001자 이상 지문의 제작 연결을 한 줄로 정한다 (결정 1).**
합의문 4항은 어떤 제작 경로도 24,000자를 넘는 글을 통째로 받지 않고, 3항은 입력문을 바꾸면 참조를 해제한다. 둘을 합치면 그런 지문은 사용 이력이 영영 0 이다. 완료 근거의 «등록 → 제작 → 저장 → 사용 이력 왕복»도 이 지문에서는 성립하지 않는다. 둘 중 하나를 적어야 한다:

- (권고) 이번에는 «보관 · 열람 전용 — 제작 연결 없음»을 상세에 표시하고 왕복 검증 대상에서 뺀다. 코드가 늘지 않는다.
- 또는 그 개정의 연속 부분 글을 «발췌 사용»으로 인정하고 사용 행에 실제 입력문을 저장한다.

**C3 — 완료 근거의 한 문장을 고친다 (결정 4 · 9).**
«메뉴 결함 실측»의 해법(지금 키 전부 + 옛 `english` 허용 · 넓히기만 · DB 먼저 · 가드 시험 분리)에 동의한다. 그런데 완료 근거에는 아직 «운영 스키마는 새 표 추가만 적용»이라고 적혀 있다. 운영 변경은 **새 표 추가 + `user_disabled_menus_valid` 넓히기** 둘이고, 원장님 승인 요청에도 둘 다 적어야 한다. 실측된 CHECK 불일치는 은행과 무관하게 지금 운영에서 영어 하위 메뉴 끄기 저장을 막는 결함이므로, 그 사실도 승인 요청에 같이 적는다.

덧붙여 확인할 것 하나: 저장은 «꺼 둔 목록»이라, 배포 순간 영어를 통째로 끄지 않은 모든 승인 계정에 은행이 열린다. 실측대로라면 부분 차단 값은 지금 저장될 수 없어 해당 계정은 0 이어야 하지만, 이것은 추론이다 — 제약을 넓히기 전에 행 수로 확인하고, 의도한 동작임을 합의문에 적는다.

**C4 — 409 의 사유는 기계가 읽는 칸으로 준다 (결정 6).**
오류 코드는 닫힌 enum 이다(`src/contracts/common.contract.ts:120-138`). «조치 가능»하려면 화면이 문구가 아니라 칸으로 갈라야 한다. 새 코드를 enum 에 더하거나 `CONFLICT` + `details.reason` 으로 준다. Grok 보고서의 새 코드 여섯(`MATERIAL_TEXT_TRUNCATED` 등)도 같다. 사유는 최소 셋으로 가른다:

- 모양이 틀린 참조 → 기존 관례대로 400.
- 없거나 범위 밖 → **한 사유**(존재를 드러내지 않는다).
- 글이 다름 → 범위 안일 때만 이 사유.

409 뒤에는 세트 행도 사용 행도 없어야 한다. 화면은 초안을 쥔 채 «연결 없이 저장» · «취소»를 준다. 참조를 떼고 다시 보내면 `meta` 가 달라 새 `clientKey` 가 지어지므로(`EnglishMakerView.tsx:367-382`) 결정 5 와 부딪히지 않는다.

### 동의하되 합의문에 한 줄씩 있어야 하는 것

- **결정 3:** 사용 행은 `setId` 유일 + 세트 삭제에 연쇄. 삽입은 세트 생성과 같은 트랜잭션(`sets/route.ts:146-175`)이고, `clientKey` 적중 경로에서는 다시 넣지 않는다. 「만든 세트」 목록과 사본 읽기는 세트의 부모 시험 범위로 거른다.
- **결정 5:** 지금 재시도 비교는 `meta` 를 안 본다(`sets/route.ts:65-93`). 참조 동등(둘 다 없음, 또는 `passageId` · `textRevision` 이 같음)을 비교에 더한다.
- **결정 7 ①:** 보관 · 열람은 «미확인»에서도 된다. 권리 계약의 `unknown` 은 허용 용도가 0 이고 듣기는 업로드에 `store_original` 을 요구한다(`runtime/mediaAccess.ts:47-58`) — 그 관문을 은행 등록에 옮겨 오면 아무것도 저장할 수 없다.
- **결정 7 ②:** 이 확인은 은행을 거친 제작에만 거는 절차다. 붙여넣기 경로는 그대로이므로 «외부 모델 전송 통제»라고 부르지 않는다. 확인자는 세션에서 정하고, 출처 · 권리 값이 바뀌면 확인을 비운다(듣기 `sets.ts:159-169` 와 같은 결).

### 결정 8 — 1차 규칙 정정

`docs/listening-samples/visuals/school-places-v1.png`(main)의 청크를 세어 봤다: 2170×725, `IHDR` · `caBX`(21,881바이트 — C2PA 출처 정보) · `IDAT` 25개 · `IEND`. 글 청크는 없다. 내가 1차에 적은 «글 청크 넷을 찾는 검사»는 이 `caBX` 를 보지 못한다. S0 검사는 **허용 목록**으로 세고 그 밖 청크는 이름과 크기를 보고해야 한다.

`caBX` 를 학생 전달 때 지울지는 나중 그림 변경에서 정한다. 지우면 생성 표지가 사라지고, 두면 생성 도구 정보가 학생에게 간다. 지금은 결정하지 않아도 된다 — 이 파일은 `docs` 에만 있고 `src` · `public` 에서 참조되지 않는다. 같은 폴더의 JSON 에는 `answerIndex` · `generationPrompt` 가 있다.

### 구현 함정 — 합의를 막지 않는다

- 듣기 검색 경로를 `/sets/search` 로 두면 `{id}` 자리와 겹친다. 허용 목록 정규식이 그 경로의 PATCH · DELETE 까지 통과시키고(`accountRouteAccess.ts:26-27`), 런타임은 둘째 칸을 uuid 로 읽어 400 을 낸다(`runtime/http.ts:123`). 분기를 그 앞에 두거나 겹치지 않는 경로를 쓴다.
- EBS 는 Grok 의 «파일 주소를 응답에 싣지 않는다»에 동의한다. 카탈로그를 화면 묶음으로 불러오면 주소가 같이 실리므로, 내 1차의 «화면이 늦게 불러온다» 안은 철회한다 — 서버가 걸러서 준다.
- 잘린 TXT 판정은 길이 비교보다 `decode(bytes).trim() === content` 동일성이 같은 값에 더 좁다.
- 나중 그림 변경에 남기는 조건: 새 칸은 없으면 키가 없어야 하고, 지금 운영 꼴의 발행본 고정물이 같은 해시로 검증을 지나는 시험이 있어야 한다(§6 B10).
