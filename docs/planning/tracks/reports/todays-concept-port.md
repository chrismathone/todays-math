# REPORT-01 — 오늘의 개념 ⑥′ 수맥 강의 자료·순수 코드 이전 (워크트리 `concept-port`, 2026-09-15)

브리프: `docs/planning/tracks/briefs/todays-concept-port.md` (§1~§5 + **§6 D-124 추가**)
브랜치: `chrismathone/concept-port` · 커밋 계정 `SUN <chrismathone@gmail.com>` · **푸시 안 함**

## 0. 한눈에

| 항목 | 결과 |
|---|---|
| 옮긴 것 | 브리프 §2 의 8개 전부 + §6(D-124) 셋 + §7(D-125) 하나 |
| 시험 | **9파일 118건 초록** (`--maxWorkers=1` — §5.2) |
| 수맥 시험 두 파일 | youtube **12/12 그대로** · lecture-meta **18 중 16 그대로 + 2 바꿔 닮**(§1.1) |
| 변이 시험 | **31/31 빨개짐** · 살아남음 0 · 판정 거부 0 — 브리프 ①~⑥ + D-124 «권장은 막지 않는다» + D-125 «제외 규칙» + 새 가드(§1.2) |
| `npx tsc --noEmit` | **0** |
| `npm run lint` | **이 작업의 파일 20개: 0건**(`--max-warnings=0`). 저장소 전체는 **error 3 · warning 55 로 빨갛다** — error 3 은 전부 `scripts/admin/bootstrap-admin.cjs` 의 `require()`(`df1eb904` 계정 기능 커밋에서 들어온 파일 — HEAD 와 같고 안 건드림), warning 55 도 전부 기존 파일. 병합 게이트가 막는다면 이 작업 탓이 아니다 |
| 훅 | 죽어 있던 것을 살렸다(§5.1) — 빈 커밋으로 lint-staged 출력 확인 뒤 되돌림 |
| 하지 않은 것 | 화면 0 · DB 쓰기 0 · 마이그레이션 명령 0 · 등록 CLI `--apply` 실행 0 · `src/lib/auth.ts`·로그인 0 · 수맥·`hyper motion video` 쓰기 0 · 푸시 0 |
| 커밋 | `8528d30f` 코드·시험·CLI·변이 하네스(20파일) · `4c24642f` 스키마 초안 + 미적용 마이그레이션 · 그 다음 커밋이 이 보고. 셋 다 pre-commit 훅(lint-staged)을 지났다. **푸시 안 함** |

---

## 1. 옮긴 것

| # | 무엇 | 수맥 원본 | 우리 자리 | 시험 | 변이 |
|---|---|---|---|---|---|
| 1 | 유튜브 주소 → 11자 ID · 정규 watch · nocookie 임베드 | `packages/core/src/media/youtube.ts` | `src/lib/concept/youtube.ts` (+ `normalizeYouTubeUrl`) | `conceptYoutube.test.ts` **13** (수맥 12 + 1) | ① |
| 2 | 제작 도구 `meta.json` 해석 | `packages/core/src/media/lecture-meta.ts` | `src/lib/concept/lectureMeta.ts` | `conceptLectureMeta.test.ts` **21** (수맥 16 + 바꿔 닮 2 + 새로 3) | ⑥ ⑦ |
| 3 | 강의 자료 계약 (상태·고지·잡 ID) | `learning-material.ts` · `0009a` · `0012a` | `src/contracts/conceptLecture.contract.ts` | `conceptLectureContract.test.ts` **10** · `conceptStudentLecture.test.ts` **5** | ⑨ ⑨′ |
| 4 | 게시 관문 (막는 것 / 알리는 것) | `0009a kind_payload_ck` · `0012a disclosure_not_blank_ck` · 21번 §4 | `src/lib/concept/publishGate.ts` — `checkPublish()` | `conceptPublishGate.test.ts` **15** | ⑤ ×7 |
| 5 | 시청 규칙 | `LecturePlayer.tsx` 머리말·감시 틱 · `recordVideoWatch` | `src/lib/concept/watchRules.ts` (컴포넌트는 안 옮김) | `conceptWatchRules.test.ts` **18** | ② ②′ ③ ⑪ ⑪′ ⑪″ |
| 6 | 등록 CLI (초안까지만 · 같은 잡 두 번 안 만듦) | `packages/ingest/src/cli/register-lectures.mts` | 순수 계획기 `src/lib/concept/registerPlan.ts` + 얇은 CLI `scripts/concept/register-lectures.ts` | `conceptRegisterPlan.test.ts` **20** + CLI 오프라인 연기 시험(§5.3) | ④ ④′ ⑧ |
| 7 | 초기 비밀번호 — **숫자 4자리 · 쉬운 번호 제외**(D-125 ⑶ 로 바꿈 — §4.1) | `learner-account.ts` `generateInitialPassword` | `src/lib/concept/initialPassword.ts` (+ `isEasyPin` · `isPinFormat`) | `conceptInitialPassword.test.ts` **8** | ⑫ ×5 |
| 8 | 스키마 초안 | `0009a` · `0012a` | `prisma/schema.prisma` + `prisma/migrations/20260915150000_concept_lecture/migration.sql` (**미적용**) | `tsc` · `prisma migrate diff`(스키마↔스키마) | — |
| D-124 ⑺ · D-125 ⑹ | «끝까지 본 학생 n/m» 집계 + 아직 안 본 학생 목록 | (수맥에 없음 — 새로) | `src/lib/concept/watchSummary.ts` — `countWatchedToEnd()` → `{ watched, total, pending }` | `conceptWatchSummary.test.ts` **8** | ⑩ ×5 |

변이 하네스: `scripts/qa/mutate-concept-port.ts` (§1.2).

### 1.1 수맥 시험에서 줄어든·바꾼 사례

- **youtube.test.ts — 12건 전부 그대로.** 판정 규칙이 우리 데이터(차시)와 무관하게 «유튜브 주소가 무엇인가»만 묻기 때문이다. 더한 1건은 `normalizeYouTubeUrl`(판정+정규화를 한 길로).
- **lecture-meta.test.ts — 18건 중 2건을 바꿔 달았다.** 「conceptSlug 를 읽는다」·「conceptSlug 가 없거나 비면 null — 지어내지 않는다」 → 같은 두 사례를 **`unitCode`** 로. 붙는 자리가 개념에서 차시로 바뀌었기 때문이다(브리프 §2.1). 규칙(«지어내지 않는다»)은 그대로다. 나머지 16건은 입력·기대값 그대로다(중복을 줄이려고 `base()` 도우미로 모양만 묶었다).
- 새로 더한 우리 전제 사례: unitCode 형식이 틀리면 **조용히 비우지 않고 실패** · conceptSlug·pageId 는 **받아들이되 무시**(결과에 칸이 없다) · 공백 jobId 는 null · 주소 없는 초안 · 영상 하나(계약에 `kind` 칸이 없다).

### 1.2 변이 시험 (①~⑥ + D-124 + 이 이전에서 새로 생긴 가드)

판정 순서는 20번 교훈 그대로다 — ㉠ 변이 전 대상 시험 초록(음성 대조) → ⑴ 앵커가 정확히 하나 → ⑵ 파일이 바뀌었나 → ⑶ **탐침 산출물이 바뀌었나**(그 가드가 지키는 입력 하나를 변이 전후로 돌려 견준다 — 2026-08-21 「변이가 동작을 안 바꾸면」) → ⑷ 실패한 시험 **이름**을 json 에서 읽어 빨강 판정(이름을 못 대면 거부 — 2026-08-23 「도장」). 원복은 바이트, 끝나고 md5 대조.

**두 번 돌렸다** — 1회 25개(D-124 까지) · 2회 10개(⑩ 넷을 `pending` 을 더한 시험으로 다시 + ⑩⁗ · ⑫ 다섯 새로). 아래는 변이마다 **마지막 판정**이다. 로그 원문: 1회 `npx tsx scripts/qa/mutate-concept-port.ts` · 2회 `… ⑫ ⑩`.

| 브리프 | 변이 (하네스 이름) | 탐침 산출물 — 변이 전 → 후 | 판정 | 빨개진 시험 (일부) |
|---|---|---|---|---|
| ① | ① v 쿼리를 경로와 무관하게 먼저 읽는다 (수맥 실측 결함) | `parseYouTubeId("…/@someone?v=…")`: `null` → `"aQkPcPqTq4M"` | 🟥 | 🔴 watch가 아닌 경로에 붙은 v 쿼리를 읽지 않는다 · normalizeYouTubeUrl |
| ② | ② 진도(%)가 뒤로 간다 | percent `80` → `8` | 🟥 | 🔴 진도는 뒤로 안 간다 · 🔴 한 번 완료면 완료 |
| ② | ②′ 본 최대 지점(초)이 뒤로 간다 | maxSeconds `100` → `10` | 🟥 | 🔴 진도는 뒤로 안 간다 |
| ③ | ③ 완료 시각을 이어 쓰지 않는다 (coalesce 삭제) | completedAt `…:00.000Z` → `…:01.000Z` | 🟥 | 🔴 한 번 완료면 완료 — 처음 완료 시각 그대로 |
| ④ | ④ 이미 있는 같은 잡 ID 를 건너뛰지 않는다 | `skip` → `create` | 🟥 | 🔴 같은 잡 ID 가 이미 있으면 건너뛴다 |
| ④ | ④′ 한 회차 안의 같은 잡 ID 를 건너뛰지 않는다 | 둘째 `skip` → `create` | 🟥 | 🔴 한 회차 안에서 같은 잡 ID 가 둘이면 · 합계를 센다 |
| ⑤ | ⑤-제목 제목이 비어도 막지 않는다 | canPublish `false` → `true` | 🟥 | 🔴 조건 하나만 빠지면 … — 제목이 공백 · 여럿이 빠지면 · 문구 |
| ⑤ | ⑤-길이 길이가 0 이어도 막지 않는다 | `false` → `true` | 🟥 | … 길이 0초 · … NaN · 여럿이 빠지면 |
| ⑤ | ⑤-주소 주소 조건을 통째로 끈다 | `false` → `true` | 🟥 | … 주소 없음 · … 빈 글자 · … 유튜브가 아닌 주소 |
| ⑤ | ⑤-주소′ 유튜브 판정만 끈다 (vimeo 로 게시) | `false` → `true` | 🟥 | … 유튜브가 아닌 주소 · … 채널 주소에 붙은 v · 문구 |
| ⑤ | ⑤-고지 도구가 만든 강의에 고지가 없어도 막지 않는다 | `false` → `true` | 🟥 | … 고지 없음 · … 고지가 공백 · 여럿이 빠지면 |
| ⑤ · D-124 ⑻ | **⑤-권장 끝까지 시청(권장)을 막는 쪽으로 옮긴다** | canPublish `true` → `false` | 🟥 | 🔴 권장 조건은 게시를 막지 않는다 · 🔴 막지는 않지만 알린다 · 여럿이 빠지면 |
| ⑤ · D-124 ⑻ | ⑤-권장′ 끝까지 시청 알림을 지운다 | warnings `[review]` → `[]` | 🟥 | 🔴 막지는 않지만 알린다 · 여럿이 빠지면 · 문구 |
| ⑥ | ⑥ 유튜브가 아닌 video_url 을 조용히 비운다 | `ok:false` → `ok:true · videoUrl:null` | 🟥 | 🔴 유튜브가 아닌 video_url은 … 실패로 말한다 · (계획기) 해석 실패는 해석기의 이유를 그대로 |
| 새 가드 | ⑦ 차시 코드 형식이 틀린 unitCode 를 받아 준다 | 실패 → `unitCode:"m1-prime"` | 🟥 | 차시 코드 형식이 아닌 unitCode는 … 실패로 말한다 |
| 새 가드 | ⑧ unitCode 가 없으면 차시를 지어낸다 (첫 차시로) | `fail` → `create(J10101)` | 🟥 | 🔴 unitCode 가 없으면 실패하고 --unit 을 달라고 한다 |
| D-124 ⑹ | ⑨ 학생 DTO 에 저장 행을 통째로 펼친다 | 7칸 → 고지·잡 ID·시청 확인·상태까지 11칸 | 🟥 | 🔴 고지·잡 ID·시청 확인을 떼어 내고, 계약을 통과한다 |
| D-124 ⑵ | ⑨′ 초안·보관 강의도 학생에게 보낸다 | `null` → DTO | 🟥 | 초안·보관 강의는 학생에게 가지 않는다 |
| D-124 ⑺ | ⑩ 퇴원 학생을 분모에 넣는다 | `1/3` → `2/4` | 🟥 | 🔴 퇴원 학생은 분모에서 뺀다 · 🔴 안 본 학생은 반 목록 순서대로 |
| D-124 ⑺ | ⑩′ 다른 강의의 기록도 센다 | `1/3` → `2/3` | 🟥 | 🔴 다른 강의의 기록은 세지 않는다 |
| D-124 ⑺ | ⑩″ 보다 만 학생도 센다 | `1/3` → `2/3` | 🟥 | 🔴 끝까지 본 것만 센다 · 🔴 안 본 학생은 … |
| D-124 ⑺ | ⑩‴ 반 밖 학생의 기록도 센다 | `1/3` → `3/3` | 🟥 | 🔴 반 밖 학생의 기록은 세지 않는다 · 🔴 퇴원 … · 0/0 |
| D-125 ⑹ | ⑩⁗ 안 본 학생 목록에 끝까지 본 학생도 넣는다 | pending `[b,c]` → `[a,b,c]` | 🟥 | 반 학생 셋 중 둘 · 🔴 퇴원 … · 🔴 끝까지 본 것만 … |
| 새 가드 | ⑪ 앞으로 감기를 막지 않는다 (틱이 되돌리지 않는다) | `rewind` → `advance` | 🟥 | 감시 틱 — 허용 폭(1.5초)을 넘게 튀면 되돌린다 |
| 새 가드 | ⑪′ 옮기기가 본 최대 지점을 넘는다 | `50` → `100` | 🟥 | 본 곳 너머로 옮기려 하면 … 멈춘다 |
| 새 가드 | ⑪″ 끝까지 본 영상을 끝 지점에서 이어 보게 한다 | `0` → `129` | 🟥 | 🔴 끝까지 본 영상은 끝 지점에 두지 않는다 |
| D-125 ⑶ | ⑫ 한 숫자 반복(0000·1111…)을 쉬운 번호로 안 본다 | `isEasyPin("1111")`: `true` → `false` | 🟥 | 🔴 쉬운 번호는 정확히 24개 · 🔴 쉬운 번호가 나오면 버리고 다시 뽑는다 · 끝없이 돌지 않고 멈춘다 |
| D-125 ⑶ | ⑫′ 오름 연속(0123·1234…)을 쉬운 번호로 안 본다 | `isEasyPin("0123")`: `true` → `false` | 🟥 | 🔴 쉬운 번호는 정확히 24개 · 경계(0123·9876·1112) · 🔴 버리고 다시 뽑는다 |
| D-125 ⑶ | ⑫″ 내림 연속(9876·4321…)을 쉬운 번호로 안 본다 | `isEasyPin("9876")`: `true` → `false` | 🟥 | 🔴 쉬운 번호는 정확히 24개 · 경계 · 🔴 버리고 다시 뽑는다 |
| D-125 ⑶ | **⑫‴ 제외 규칙을 끈다 — 생성기가 쉬운 번호를 버리지 않는다** | 난수 `[1111, 5809]`: `"5809"` → `"1111"` | 🟥 | 🔴 1만 번 뽑아 쉬운 번호 0건 · 🔴 버리고 다시 뽑는다 · 끝없이 돌지 않고 멈춘다 |
| D-125 ⑶ | ⑫⁗ 앞자리 0 을 버린다 | 난수 `42`: `"0042"` → `"42"` | 🟥 | 🔴 1만 번 뽑아 … 전부 네 자리 숫자 · 앞자리 0 을 지킨다 |

살아남은 변이(가드 아님) **0** · 판정 거부 **0** · 두 번 다 «변이한 파일 전부 원본과 일치 ✓»(md5), 떠돌이 탐침 파일 없음.

---

## 2. 전제가 달라진 곳 (2026-08-24 교훈 「이식해 온 규칙이 전제를 적어 두고 있었는데」의 자리)

| # | 수맥 규칙 | 수맥이 가정한 것 | 우리 데이터에선 | 한 일 |
|---|---|---|---|---|
| 1 | 강의는 `conceptSlug` 로 개념에 붙는다 · 개념 상태가 `reviewed·active` 여야 붙인다 | 개념(canonical_concepts)이 있고, 상태가 있다 | 우리 축은 **차시**(`Unit`)이고 상태 칸이 없다. 차시 코드 = `Unit.problemCodePrefix`(unique, 사람이 읽는다) | `unitCode` 선택 필드. 없으면 `--unit` 요구(지어내지 않음). 개념 상태 게이트는 **뺐다**(대응할 상태가 없다). 대신 **형식 검사**(`UNIT_CODE_PATTERN` 한 곳)를 더했다 — 수맥 slug 에는 형식이 없어 오타가 «없는 개념»으로만 드러났다 |
| 2 | 주소가 없으면 **건너뛴다** | DB CHECK(`kind_payload_ck`)가 영상 자료에 주소를 요구한다 | 호스팅 미정이라 **주소 없는 초안을 허용**한다(브리프 §2.1). CHECK 는 «게시면 주소 있음» 으로 좁혔다 | 주소 없는 초안을 **만든다**. 그러자 수맥에서는 생길 수 없던 경우가 생겼다 → 아래 3 |
| 3 | 멱등 열쇠 = 잡 ID 또는 영상 주소 | 주소 없는 것은 애초에 건너뛰므로 둘 중 하나는 늘 있다 | 주소 없는 초안이 되면 **잡 ID 도 주소도 없는** meta.json 은 두 번 돌리면 두 벌이 된다 | 그 경우 **거절**(실패 + 이유) |
| 4 | 멱등 판정 = 한 건씩 insert 하고 다음 건에서 DB 를 다시 조회 | 판단과 쓰기가 한 파일에서 번갈아 돈다 | 계획기는 **쓰기 전에 전부 정한다** — 한 회차 안의 같은 잡 ID 두 편을 못 본다(보면 `--apply` 에서 둘째가 unique 에 부딪쳐 트랜잭션째 실패) | **회차 안 중복**을 따로 본다(변이 ④′) |
| 5 | `video_url` 이 유튜브가 아니면 실패(조용히 비우지 않음) | 비워도 등록 단계에서 CHECK 가 막는다 — 이 가드는 «더 이른 자리»일 뿐이었다 | 주소 없는 초안이 허용되므로 **비우면 그대로 초안이 된다** — 이 가드가 유일한 그물이 됐다 | 그대로 옮기고 변이 ⑥ 으로 잠갔다 |
| 6 | `jobId` 는 `typeof === "string"` 이면 그대로 | 잡 ID 는 추적용 기록일 뿐 | 우리에게 잡 ID 는 **멱등 열쇠**(unique)이자 게시 관문의 «도구가 만든 강의 → 고지 필요» 판정이다. 공백이면 공백끼리 부딪치고 고지를 잘못 요구한다 | trim · 공백은 null + DB CHECK `source_job_id_not_blank` |
| 7 | 부분 인덱스로 «null 제외» 조회 | — | Postgres unique 는 NULL 을 서로 다르게 본다(NULLS DISTINCT 기본) | 브리프의 «부분 unique» 대신 schema `@unique` — 같은 뜻이고 Prisma 가 안다. 이 저장소 관례(`student.eywa_student_id`·`account_audit_log.event_id`). **리드 확인 요망**(§6-2) |
| 8 | 조직(`organization_id`)·RLS 테넌트 정책·`contentOrganizationIds`·`hideOverriddenMaterials`(학원 덮어쓰기) | 여러 학원이 한 DB 를 나눠 쓴다 | 조직이 없다. 강의는 **서비스 공용 목록**(D-31 결, D-124 ⑼) | 소유 칸 없음(계약 시험이 `userId` 를 거절로 못 박음). 덮어쓰기 규칙은 옮기지 않음. RLS 는 켜되 정책 없음(저장소 관례 — Supabase 공개 API 차단) |
| 9 | 권한 = `canWrite(DEFAULT_MATRIX, role, "materials")` | 역할 행렬이 있다 | 우리 쓰기 권한은 `User.isAdmin` | CLI `--apply` 는 `--actor` 가 `isAdmin` 이고 탈퇴 전인지 본다 |
| 10 | 진도 = `learner_material_progress.status`(enum) + `result` jsonb(`watchedPercent`·`watchedSeconds`) | 읽기·연습 자료와 한 표를 나눠 쓴다(연습의 result 는 채점 결과) | 종류가 영상 하나라 jsonb 가 필요 없다 | `ConceptLectureView` 에 칸으로: `maxSeconds`·`percent`·`completedAt`. **완료 = `completedAt` 이 찍혔나** — status enum 없음. 「한 번 완료면 완료」가 시각 하나로 표현된다 |
| 11 | 완료 판정 = **보낸** percent ≥ 95 | 행은 이 함수로만 쓰인다 | 같다. 다만 합친 최댓값 ≥ 95 로 보면 행이 어긋나 있을 때(손 SQL 등)도 다음 보고에서 바로잡힌다 | `mergeWatchRecord` 는 **합친 최댓값**으로 판정. 완료 시각은 처음 것을 유지(변이 ③ 이 시각까지 본다 — 「완료인가」만 보면 최댓값이 완료를 다시 찍어 줘서 coalesce 를 지워도 초록이다) |
| 12 | 초기 비밀번호 = 16자 영문·숫자 · 헷갈리는 글자(0/O · 1/l/I) 뺌 · 끝에 고정 `7!` | 받아 적어 전달하는 긴 임시 비밀번호 · Supabase 기본 정책(숫자·기호) | **D-125 ⑶ 숫자 4자리**(원장님 확정). 숫자만 쓰면 헷갈릴 글자가 없고 우리 정책은 Supabase 것이 아니다 — 수맥 전제 셋이 다 사라졌다. 그리고 이 번호는 원장 계정 규칙(`auth.contract.ts` 8~72자)을 **통과하지 않는다** | 처음엔 16자로 옮기며 `7!` 을 빼고 `byte % 56` 치우침을 없앴다가, D-125 로 통째로 바꿨다: 0000~9999 에서 `crypto.randomInt` 로 뽑고 쉬운 번호 24개는 버리고 다시 뽑는다. 판정 `isEasyPin`·형식 `isPinFormat` 을 따로 내보냈다. 남은 수맥 규칙: 암호학적 난수 · 한 번만 보이고 해시만 저장. 학생 로그인 계약은 학생 계정 트랙 몫 — `auth.contract.ts` 안 건드림 |
| 13 | 등록 때 `audit_events` 에 `material.create` · `source_ref` jsonb | 감사 표가 있다 | 우리 `AccountAuditLog` 는 계정용이고, 브리프 스키마에 `source_ref` 가 없다 | `createdById` 만 남긴다. **리드 결정 요망**(§6-8) |
| 14 | `video_seconds` nullable, CLI 는 `seconds > 0 ? seconds : null` | — | 브리프 스키마의 `seconds` 는 NOT NULL | `DEFAULT 0` — 0 = 아직 모름, 게시 관문이 막는다 |
| 15 | dry-run 은 액터가 없으면 DB 를 아예 안 본다(중복 검사 없음) | — | 공유 DB 에 `concept_lecture` 표가 **아직 없다** | 온라인 dry-run 은 **읽기만** 하고, 표가 없으면(P2021) 그 사실을 찍고 «기존 강의 없음»으로 계획한다. DB 없이 보려면 `--offline`(시드 차시표 — `buildUnitCodePrefixes`, 규칙을 다시 적지 않음) |
| 16 | 학생 화면에 고지를 **싣지 않는다**(수맥 2026-08-04 결정 — `MaterialRow.disclosure` 주석) | — | D-124 ⑹ 과 같다 | 이번에는 **계약으로** 못 박았다(§4) — 수맥은 주석뿐이었다 |

⚠️ **검산하지 못한 것**: 기존 8편의 실제 `output/meta.json`(브리프 §3 — `D:/hyper motion video` 금지)에 `unitCode`·`jobId` 가 있는지 보지 못했다. 시험의 실데이터는 수맥이 옮겨 둔 `pipeline/work/20260722-0953-d093ce3f/out/meta.json` 한 편이다. 8편은 옮기지 않기로 했으므로(D-123 ⑹) 급하지 않지만, **새 생성기(`lecture-gen`)가 쓰는 meta.json 은 이 해석기의 입력 계약이다** — §6-6.

---

## 3. 스키마 초안 — 🔴 미적용

### 3.1 무엇이 들어 있나

- `prisma/schema.prisma`: `enum ConceptLectureStatus`(draft·published·archived) · `model ConceptLecture` · `model ConceptLectureView` + 역관계 셋(`Unit.conceptLectures` · `Student.conceptLectureViews` · `User.conceptLecturesCreated`). 브리프 §2.2 의 칸 그대로.
- 브리프와 다른 점: ⑴ `sourceJobId` 부분 unique → `@unique`(§2-7) ⑵ **브리프 밖 CHECK 5개**(공백 잡 ID · 길이 ≥ 0 · 순서 0~999 · 시청 % 0~100 · 본 지점 ≥ 0 — 빼도 앱 동작은 같다) ⑶ RLS 켬(저장소 관례) ⑷ 시청 기록 `@@index([lectureId])`(강의별 n/m 집계·cascade 용).
- 마이그레이션 SQL 은 `prisma migrate diff --from-schema-datamodel <이전 schema> --to-schema-datamodel prisma/schema.prisma --script` 산출을 **그대로** 싣고, 손으로 쓴 것은 맨 아래 «손으로 더한 것» 절에만 있다. diff 를 돌릴 때 `DATABASE_URL` 은 닿지 않는 `127.0.0.1:1` 로 두었다(스키마끼리라 접속하지 않지만, 혹시라도 공유 DB 에 닿지 않게).

### 3.2 SQL 전문

```sql
-- ⚠️ 미적용 초안 (D-123 ⑥′) — 원장님 확인 전 적용 금지
--
-- 오늘의 개념 — 차시별 개념 강의(concept_lecture) · 학생 × 강의 시청 기록(concept_lecture_view).
-- 수맥 0009a_learning_materials · 0012a_material_disclosure_job 을 우리 구성(차시 축 · 조직 없음 ·
-- 영상 하나)으로 옮긴 것. 계약 SSOT: src/contracts/conceptLecture.contract.ts
-- 계획: docs/planning/21-todays-concept.md · 결정: D-123 · D-124
--
-- 윗부분은 `prisma migrate diff --from-schema-datamodel <이전 schema> --to-schema-datamodel
-- prisma/schema.prisma --script`(DB 없이 스키마끼리)의 산출을 **그대로** 실었다.
-- Prisma 가 표현 못 하는 것은 맨 아래 «손으로 더한 것» 절에 붙였다.
--
-- 🔴 `prisma migrate dev` · `migrate deploy` · `db push` 는 이 파일을 공유 DB 에 적용한다.
--    원장님 확인 전에는 어느 세션도 돌리지 말 것(브리프 §2.2).

-- CreateEnum
CREATE TYPE "concept_lecture_status" AS ENUM ('draft', 'published', 'archived');

-- CreateTable
CREATE TABLE "concept_lecture" (
    "id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "video_url" VARCHAR(200),
    "seconds" INTEGER NOT NULL DEFAULT 0,
    "disclosure" VARCHAR(300),
    "source_job_id" VARCHAR(120),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" "concept_lecture_status" NOT NULL DEFAULT 'draft',
    "reviewed_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "concept_lecture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concept_lecture_view" (
    "student_id" UUID NOT NULL,
    "lecture_id" UUID NOT NULL,
    "max_seconds" INTEGER NOT NULL DEFAULT 0,
    "percent" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "concept_lecture_view_pkey" PRIMARY KEY ("student_id","lecture_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "concept_lecture_source_job_id_key" ON "concept_lecture"("source_job_id");

-- CreateIndex
CREATE INDEX "concept_lecture_unit_id_status_sort_order_idx" ON "concept_lecture"("unit_id", "status", "sort_order");

-- CreateIndex
CREATE INDEX "concept_lecture_view_lecture_id_idx" ON "concept_lecture_view"("lecture_id");

-- AddForeignKey
ALTER TABLE "concept_lecture" ADD CONSTRAINT "concept_lecture_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concept_lecture" ADD CONSTRAINT "concept_lecture_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concept_lecture_view" ADD CONSTRAINT "concept_lecture_view_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concept_lecture_view" ADD CONSTRAINT "concept_lecture_view_lecture_id_fkey" FOREIGN KEY ("lecture_id") REFERENCES "concept_lecture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 손으로 더한 것 (Prisma 가 표현 못 함) ────────────────────────────────

-- source_job_id 의 «null 제외 unique»(수맥 부분 인덱스 자리)는 위 CREATE UNIQUE INDEX 가 이미 한다.
-- Postgres 의 unique 는 NULL 을 서로 다르게 본다(NULLS DISTINCT 가 기본) — 사람이 만든 강의(잡 ID
-- 없음)는 몇 편이든 들어간다. 그래서 브리프가 말한 부분 unique 를 따로 쓰지 않고 schema 의 `@unique`
-- 로 두었다(이 저장소 관례: `student.eywa_student_id` · `account_audit_log.event_id`).

-- 수맥 0009a `learning_materials_kind_payload_ck` 의 우리 판 — 종류가 영상 하나뿐이라
-- «게시면 주소 있음». 초안은 주소가 비어도 된다(호스팅 미정 — 21번 §5-3).
-- 주소 **형식**은 DB 가 아니라 계약(canonicalVideoUrlSchema)과 게시 관문이 본다(브리프 §2.2).
ALTER TABLE "concept_lecture"
  ADD CONSTRAINT "concept_lecture_published_has_video"
  CHECK ("status" <> 'published' OR "video_url" IS NOT NULL);

-- 수맥 0012a `learning_materials_disclosure_not_blank_ck` — 빈 고지는 고지가 아니다.
-- 없으면 NULL 이어야 화면이 «고지 없음»을 정직하게 말할 수 있다.
ALTER TABLE "concept_lecture"
  ADD CONSTRAINT "concept_lecture_disclosure_not_blank"
  CHECK ("disclosure" IS NULL OR btrim("disclosure") <> '');

-- ↓ 브리프 밖에 더한 것 (보고서 §3 — 빼도 앱 동작은 같다. 계약과 같은 한계를 DB 가 받친다:
--   쓰는 길이 셋(화면·CLI·SQL)이고, 수맥은 한계가 CLI 에만 있어 SQL 로는 무엇이든 들어갔다.)
-- 공백 잡 ID 는 unique 를 공백끼리 부딪치게 하고 게시 관문의 «도구가 만든 강의» 판정을 속인다.
ALTER TABLE "concept_lecture"
  ADD CONSTRAINT "concept_lecture_source_job_id_not_blank"
  CHECK ("source_job_id" IS NULL OR btrim("source_job_id") <> '');
ALTER TABLE "concept_lecture"
  ADD CONSTRAINT "concept_lecture_seconds_nonnegative"
  CHECK ("seconds" >= 0);
ALTER TABLE "concept_lecture"
  ADD CONSTRAINT "concept_lecture_sort_order_range"
  CHECK ("sort_order" BETWEEN 0 AND 999);
ALTER TABLE "concept_lecture_view"
  ADD CONSTRAINT "concept_lecture_view_percent_range"
  CHECK ("percent" BETWEEN 0 AND 100);
ALTER TABLE "concept_lecture_view"
  ADD CONSTRAINT "concept_lecture_view_max_seconds_nonnegative"
  CHECK ("max_seconds" >= 0);

-- 새 표는 RLS 를 켠다 — 이 저장소의 관례(account_audit_log · workspace_document · workspace_asset).
-- 정책이 없으므로 Supabase 공개 API(anon)로는 못 읽는다. 앱은 Prisma(DB 직결)로 읽고 쓴다.
ALTER TABLE "concept_lecture" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "concept_lecture_view" ENABLE ROW LEVEL SECURITY;
```

### 3.3 적용하면 무엇이 생기나

새 enum 하나(`concept_lecture_status`)와 **빈 표 둘**(`concept_lecture` · `concept_lecture_view`), 인덱스 셋(잡 ID unique · 차시·상태·순서 · 강의별), 외래 키 넷, CHECK 일곱, RLS 둘이 생긴다. **기존 표는 한 행도, 한 칸도 바뀌지 않는다** — `ALTER TABLE` 은 새 표에만 걸린다. 외래 키가 기존 표에 거는 효과는 셋이다: 강의가 붙은 차시(`unit`)는 지울 수 없게 되고(`RESTRICT` — 지금은 강의가 0편이라 영향 없음), 학생을 지우면(반 삭제 cascade 포함) 그 학생의 시청 기록이 같이 지워지며, 계정을 지우면 강의의 `created_by_id` 가 비워진다. 적용 뒤 `_prisma_migrations` 에 기록하는 방식은 이 저장소 관례(`db execute` + `migrate resolve --applied`, 체크섬 = CR 제거 후 sha256 — `tracks/reports/problem-code.md` §5.3)를 따르면 된다. 앱 코드 중 이 표를 부르는 것은 등록 CLI 하나뿐이라, 적용 전에 누가 부르면 P2021(표 없음)이 난다 — CLI 는 그것을 잡아 dry-run 은 계속하고 `--apply` 는 멈춘다.

⚠️ **이 파일이 main 에 병합된 뒤 어느 세션이든 `npm run db:migrate`(= `prisma migrate dev`)나 `migrate deploy` 를 돌리면 공유 DB 에 적용된다.** 파일 첫 줄의 경고가 유일한 막이다. 같은 모양의 전례가 있다(`20260817120000_problem_created_at_indexes` — problem-code.md §5.3). §6-1.

---

## 4. D-124 반영 (브리프 §6)

| D-124 | 한 일 | 잠금 |
|---|---|---|
| ⑻ 게시 전 원장님 끝까지 시청은 **권장** | 관문 결과를 `{ canPublish, blockers, warnings }` 로 나눴다. `reviewedAt` 이 없으면 `warnings` 에만 들어가고 `canPublish` 는 참. 스키마·계약 주석의 «엄한 쪽» 문구도 고쳤다 | 시험 2(「권장 조건은 게시를 막지 않는다」·「막지는 않지만 알린다」) + 변이 **⑤-권장**(권장을 막는 쪽으로 옮김) · **⑤-권장′**(알림을 지움) |
| ⑹ AI 고지는 **원장님 화면에만** | 저장은 그대로(도구가 만든 강의는 고지가 **막는** 조건 — 유지). 학생에게 가는 모양 `conceptLectureForStudentSchema`(칸 **정확히 7개**: id·unitId·title·videoUrl·seconds·sortOrder·watch)와, 저장 행 → 그 모양으로 옮기는 `toStudentLecture()`(칸을 하나씩 적는다, 게시본만) | 시험 5 — 칸 목록을 **정확히** 견준다(더해도 빨개진다) · strict 거절 · 옮기는 함수가 떼어 냄 · 초안·보관은 null. 변이 **⑨**(`...row` 로 펼침) · **⑨′**(초안도 보냄) |
| ⑺ 시청 기록을 모은다 | `countWatchedToEnd(반 학생, 시청 기록, 강의)` → `{ watched, total, pending }`. 퇴원(`eywaWithdrawnAt`)은 분모에서 빼고, 분자는 분모 안에서만 · 그 강의만 · 완료만 센다. `pending` 은 §4.1 끝(D-125 ⑹). 비율(0/0 표시)은 화면 몫으로 남겼다 | 시험 8 + 변이 **⑩ ×5** |
| ⑼ 강의 목록은 서비스 공용 | 소유 칸 없음 · 쓰기 `isAdmin` (§2.1 그대로) | 계약 시험(`userId` 거절) |
| ⑶ 학생 로그인 · 발급 | **하지 않았다** — 병합 뒤 새 워크트리(`todays-concept-student-auth.md`). 초기 비밀번호만 옮김 | — |

### 4.1 D-125 반영 (브리프 §7) — 학생 초기 비밀번호는 숫자 4자리

| 브리프 §7 | 한 일 | 잠금 |
|---|---|---|
| 암호학적 난수로 `0000`~`9999` | `crypto.randomInt(10000)`, 앞자리 0 은 채운다(`42` → `0042`). 쉬운 번호면 버리고 다시 뽑는다 — 버리는 표본 추출이라 남은 9,976개가 고르게 나온다. 난수원이 쉬운 번호만 주면 64번 뒤 멈춘다(끝없이 돌지 않게) | 시험 3 · 변이 ⑫‴(제외 규칙을 끈다) · ⑫⁗(앞자리 0) |
| 한 숫자 반복·오름/내림 연속 제외 | `isEasyPin` — 이웃 자리 차이가 전부 0 이거나 전부 +1 이거나 전부 −1. **1만 개 전수에서 정확히 24개**(반복 10 · 오름 7 · 내림 7)임을 목록째 견준다 | 시험 · 변이 ⑫ ⑫′ ⑫″(규칙 하나씩) |
| 판정을 따로 내보낸다 | `isEasyPin`(쉬운가) · `isPinFormat`(네 자리 ASCII 숫자인가) — 첫 로그인 변경도 둘을 부른다 | 시험(형식 — 세 자리·다섯 자리·글자·공백·아랍 숫자 거절) |
| 1만 번 뽑아 제외 0건 · 네 자리 숫자만 · 경계(0123·9876·1112) | 그대로 시험했다 | 시험 |

⚠️ **넘어가는 연속(7890·8901·9012·2109·1098)은 쉬운 번호로 보지 않는다** — «오름/내림 연속»의 뜻 그대로 두고, 그 선택을 시험에 적었다(바꾸면 그 사례가 빨개진다). 키보드 윗줄(…7890)은 흔한 번호라 넣을지는 §6-9.

**D-125 의 나머지 중 이 워크트리에 걸린 것 하나 — ⑹ 시청 표시(n/m 을 누르면 안 본 학생 이름까지).** 브리프 §7 에는 없지만 같은 집계 함수가 받칠 자리라 `pending`(아직 끝까지 안 본 학생 id, **반 목록 순서**, 늘 `watched + pending.length === total`)을 더했다. 칸 하나를 더했을 뿐 n/m 계산은 그대로이고, 기존 시험 7건은 기대값에 `pending` 을 더해 오히려 엄해졌다. 필요 없으면 뺀다(§6-12). ⑴ 화면 · ⑵ 아이디 · ⑷ 학생 전용 주소 · ⑸ 목록 필터는 화면·로그인 트랙 몫이라 손대지 않았다(⑸ 는 §6-13).

---

## 5. 검증 기록

### 5.1 훅이 죽어 있었다 (2026-08-19 교훈 그대로)

`core.hooksPath = .husky/_` 인데 이 워크트리에 **`.husky/_` 가 없었다** — git 은 경고 없이 훅을 건너뛴다. 오르카 셋업의 `npm install` 에서 `prepare: husky` 가 안 돈 것으로 보인다. 메인 체크아웃의 `.husky/_`(18파일, gitignore 대상 — 커밋 안 됨)를 복사하고, `git commit --allow-empty` 로 `→ lint-staged could not find any staged files.` 가 찍히는 것을 본 뒤 `git reset --soft HEAD~1` 로 되돌렸다. **다른 오르카 워크트리도 같을 수 있다.**

### 5.2 RED → GREEN

- RED: 시험을 먼저 쓰고 돌려 `Failed to resolve import "@/lib/concept/youtube"` 를 확인했다(D-124 분도 따로: 모듈 없음 둘 + `checkPublish is not a function`).
- ⚠️ 처음 일곱 파일을 한 번에 돌렸을 때는 **`Failed to start forks worker`**(60초)로 러너가 아예 못 떴다 — 다른 오르카 세션이 CPU 를 쓰는 중이었다(부하 약 50%, 1GB 넘는 node 둘). 그것은 RED 가 아니라 «못 잼»이라 치지 않았고, 이후 모든 실행은 `--maxWorkers=1` 로 했다.
- GREEN: 9파일 118건(처음 7파일 102건 → D-124 뒤 115건 → D-125 뒤 118건). D-124·D-125 로 바뀐 시험도 매번 RED(모듈 없음 · `checkPublish is not a function` · `isEasyPin is not a function` · `pending` 없음)를 먼저 보고 구현했다.

### 5.3 등록 CLI 연기 시험 (오프라인 — DB 안 닿음)

scratchpad 에 meta.json 넷을 두고 `--dir --offline`:

```
✗ 실패    no-unit          차시를 알 수 없습니다 — meta.json에 unitCode를 넣거나 --unit=<차시 코드>를 주세요.
✓ 만들기  prime            «소수와 합성수» → J10101 중1 · 1. 소인수분해 · 소수와 거듭제곱
                            길이 2:19 · 주소 https://www.youtube.com/watch?v=aQkPcPqTq4M(youtu.be 를 정규화) · 고지 있음
- 건너뜀  prime-rerender   이 회차에 이미 있음 (같은 잡 ID) — prime
✗ 실패    vimeo            video_url이 유튜브 주소가 아닙니다. …
  만들기 1건 · 건너뜀 1건 · 실패 2건 (dry-run — DB 에 쓰지 않음)      → 종료 1
```

막는 길 다섯도 확인했다(전부 종료 2): DB 도 `--offline` 도 없음 · `--apply` 에 `ALLOW_CONCEPT_REGISTER=1` 없음 · `--apply --offline` · 여러 편에 `--unit` · 오타 플래그(`--aply`). 한 편에 `--unit=J10102` 를 주면 주소 없는 초안 하나를 계획한다.

### 5.4 돌리지 않은 것

- `npm run test`(전체 관문 — 전량 vitest + 초등 판정기 쓸기): 돌리지 않았다. 새 파일은 기존 코드를 한 줄도 바꾸지 않고(스키마에 역관계 셋을 더한 것 말고는) 부르는 곳도 새 파일뿐이라 영향 범위가 좁고, 이 기계가 다른 세션과 CPU 를 나눠 쓰는 중이라 워커 기동 실패로 «못 잼»이 날 가능성이 컸다. **병합 검수 때 한 번 돌려 주길 바란다.**
- `prisma migrate dev`·`deploy`·`db push`·`reset`, CLI `--apply`: 브리프 금지.

---

## 6. 리드가 정할 것

1. **마이그레이션 적용·병합 시점.** 병합되면 누군가의 `npm run db:migrate` 한 번으로 공유 DB 에 적용된다(§3.3 ⚠️). 원장님 확인 전 병합이면 세션들에 알리거나, 마이그레이션 폴더만 적용 결정 때까지 따로 두는 방법이 있다.
2. **`sourceJobId` 를 부분 unique 대신 `@unique` 로 둔 것** — 뜻은 같다(NULL 은 여럿). 부분 인덱스를 꼭 원하면 SQL 한 줄로 바꿀 수 있다(다만 schema 에 없는 인덱스라 Prisma 도구가 차이로 볼 수 있다 — 확인 안 함).
3. **브리프 밖 CHECK 5개** 유지 여부(§3.1).
4. **상태 전이 규칙** — 보관본을 다시 게시할 수 있나, 게시본을 초안으로 되돌리나, `publishedAt` 은 누가 언제 찍나. 관문은 «내용»만 본다.
5. **영상 주소가 바뀌면 `reviewedAt` 을 비울지** — 시청 확인이 다른 영상에 대한 것이 된다. D-124 로 권장이 되어 게시를 막지는 않지만, 원장님 화면의 «시청함» 표시가 거짓이 된다.
6. **`lecture-gen`(생성기 복원) 워크트리와의 입력 계약** — 이 해석기가 읽는 이름은 `lessonTitle`·`fps`·`totalFrames`·`jobId`·`disclosure`·`video_url`·`sortOrder`·**`unitCode`** 다. 새 생성기가 `unitCode` 를 쓰지 않으면 CLI 는 한 편씩 `--unit` 을 줘야 한다(여러 편에 한 번에 줄 수 없다 — 수맥 규칙). `conceptSlug`·`pageId` 는 받아들이되 무시한다.
7. **시청 보고의 %** — 수맥 그대로 재생기가 계산해 보낸 값을 받는다(우회 방지는 목표가 아니다 — D-124 ⑸). 서버가 `seconds / lecture.seconds` 로 다시 셀지.
8. **등록 감사 기록** — 수맥은 `audit_events` 에 남겼다. 우리는 `createdById` 만. `AccountAuditLog` 에 넣을지.
9. **쉬운 번호의 범위** — 지금은 D-125 ⑶ 그대로 반복·오름·내림 24개만 뺀다. 넘어가는 연속(7890·9012)·짝 반복(1212·1122)·생일꼴(0101~1231)은 나온다. 넓힐지(넓히면 `isEasyPin` 한 곳과 전수 시험의 목록만 바꾸면 된다). 그리고 **학생 로그인 계약**(숫자 4자리)은 원장 계정 규칙(`auth.contract.ts` 8~72자)과 따로 둬야 한다 — 학생 계정 트랙 몫.
10. **학생 DTO 에 `unitId` 를 넣었다**(목록을 차시로 묶으려고) — 학생 화면 시안(C)에서 필요 없으면 뺀다. 칸 목록 시험이 같이 바뀐다.
11. 문서(`21-todays-concept.md` §4 ⑥′ 상태 · `CLAUDE.md`)는 **건드리지 않았다** — 병합 때 리드가 갱신.
12. **`pending`(안 본 학생 목록)을 더한 것** — D-125 ⑹ 을 받치려고 브리프 §7 밖에서 더했다(§4.1 끝). 유지할지.
13. **D-125 ⑸ «학생 목록은 진도에 있던 차시만»** — 학생 DTO 로 옮기는 `toStudentLecture` 는 게시 여부만 거르고 진도는 모른다. 진도(`Progress`)와 잇는 거름은 학생 화면·라우트 트랙에서 순수 함수로 하나 더 두는 것이 맞다 — 이번에는 하지 않았다.

---

## 7. 파일

```
src/lib/concept/youtube.ts           src/lib/concept/lectureMeta.ts
src/lib/concept/publishGate.ts       src/lib/concept/watchRules.ts
src/lib/concept/registerPlan.ts      src/lib/concept/initialPassword.ts
src/lib/concept/studentLecture.ts    src/lib/concept/watchSummary.ts
src/contracts/conceptLecture.contract.ts
src/__tests__/unit/concept{Youtube,LectureMeta,LectureContract,PublishGate,WatchRules,
                            RegisterPlan,InitialPassword,StudentLecture,WatchSummary}.test.ts
scripts/concept/register-lectures.ts
scripts/qa/mutate-concept-port.ts
prisma/schema.prisma  (모델 둘 · enum 하나 · 역관계 셋)
prisma/migrations/20260915150000_concept_lecture/migration.sql   ⚠️ 미적용
```
