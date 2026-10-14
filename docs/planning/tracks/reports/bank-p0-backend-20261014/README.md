# 문제은행 P0 백엔드(1A) — 수량 · 출처 · 지정 두 슬롯 읽기 계약과 적재 도구

2026-10-14 · 계획 [goal-bank-arithmetic-brand-20261014 개정안 4](../../../goal-bank-arithmetic-brand-20261014.md) · 담당 Claude(1A) · 가지 `BIGSHOL/bank-arithmetic-p0-data`

화면(ScopePicker · ExamBuilder · BankSourcePicker · BankView)은 root 담당이다. 여기는 계약 · 서버 · 도구 · 시험만 했다. 공유 DB 에 쓰지 않았다(조사는 `SET TRANSACTION READ ONLY`). 마이그레이션 없음.

## 커밋

| 커밋        | 내용                                                                                                                        |
| ----------- | --------------------------------------------------------------------------------------------------------------------------- |
| `56e56c22f` | 가용량 보기 · 구성 filters · 출력 직전 재검증 · 교과서 지정 두 슬롯 읽기 · 공통 `textbookSlotReadiness`                     |
| `5a5a4dfd2` | 원문이 바뀌거나 잠기면 지정 슬롯도 잠근다(`--refresh` · `--hold` · `recover-held`) · `lock-orphan-slots.ts` · 조사 스크립트 |
| `644e44124` | 공유 DB 읽기 전용 조사 결과([census-20261014.md](census-20261014.md)) · 엔진 표지 셈                                        |
| `8c20938de` | 책 → 자료 → 자료 안 번호: `materials` 조건 · `view=materials` · 목록 행 `questionNumber`                                    |

## 계약(화면이 부르는 것)

모든 운영 경로는 이웃 목록과 같은 관문(`authorizeStudio` — 로그인 · 메뉴 bank · 검수 계정 거절 · POST 같은 사이트)이다. dev 짝은 `/api/dev/unified/problems/…` 같은 모양(운영 빌드 404).

### 1. 수량 — `GET|POST /api/studio/problems/sources`

- **보기 없음**: 옛 `BankSourceCounts` 그대로(D-161 전역 재고 — 필터를 붙여도 무시). `count`/`open`/`kinds` 뜻 불변.
- **`?view=available[&version=1]&F`** → `bankSourceAvailabilitySchema`(`src/contracts/bankSource.contract.ts`)
  - `held` = F + 공용 풀(«원문 30») · `available` = F + 출제 자격(«사용 가능 24»)
  - `facets` — 각 갈래는 **자기 축만 빼고** 센다: `units`(차시 고르기 축) · `difficulties`(사다리 여섯 칸) · `sources`(출처 축 — source · sourceGroup · books · materialKinds · materials) · `textbook`(출처 축 제외 + 교과서, 책 × 자료 종류)
  - `format` 조건이면 `facets: null` = **미확인**(0 이 아니다). 두 수는 목록과 같은 `findProblemIdsByFormat` 으로 센다
  - 문항당 축의 값이 하나라 갈래의 합 = 문항 ID 합집합
- **`?view=materials&books=…[&F]`** → `bankSourceMaterialsSchema` — 고른 책의 자료 전부, 메타데이터는 저장값 그대로(빈 칸 null · 추정 없음), 자료마다 F(출처 축 제외)의 `held`/`available`, 수 0 자료도 싣는다
- POST 본문은 `{view, …F}` 문자열 레코드(긴 차시 고르기용). 보기 없는 POST · 모르는 보기 · 다른 판 · 엄격 계약 밖 키는 400

### 2. 조회 조건 F 의 확장

- `materials=<자료 uuid,…>` — 교과서일 때만(아니면 400 — 조용히 0 건을 내지 않는다) · 최대 300. 고르면 목록 차례가 자료 → `questionNumber` → 은행 차례
- 목록 행(`BankProblem`)에 `questionNumber?` — 자료 안 번호. 자료 안에서도 겹친다(실측 86편 1,349행) → 문항 코드와 함께 보인다
- 구성 `POST …/problems/random` 의 `{allocations, excludeIds?, filters?}` — filters 는 목록과 같은 resolve. 범위 축(unitIds · unitFrom · unitTo · ids)은 400, page/pageSize 무시, excludeIds 는 본문 ∪ filters(≤100), format 은 랜덤과 같이

### 3. 출력 직전 재검증 — `POST /api/studio/problems/check {ids: uuid[1..100]}`

`bankCheckResponseSchema`(`src/contracts/bankReadiness.contract.ts`) — 요청 차례대로 `eligible | ineligible | missing` · 열쇠 `notShared | notApproved | locked | noAnswer` · `reason`(서버 422 와 같은 문장) · `reviewStatus` · 지금의 `unitId` · `source`. 필터와 무관(섞인 출처의 저장 학습지도 인쇄된다). 공용 풀 밖 행은 `missing`(존재를 드러내지 않는다). 짧은 문구 `BANK_INELIGIBLE_LABEL.locked = "출제 잠금(사유 미기록)"`.

### 4. 지정 두 슬롯 — `POST /api/studio/problems/textbook-slots {sourceIds: uuid[1..100], excludeIds?: uuid[0..100]}`

원문마다 `ready(2/2) | partial(1/2) | none(0/2) | notTextbook | missing`, 슬롯마다 `ready | missing | ineligible(+열쇠) | unitMismatch | excluded`. 2/2 는 자격 있는 슬롯 수지 새로 볼 문항 수가 아니다. 일반 유사문항으로 채우지 않는다.

## 같은 규칙을 쓴다는 증거

| 짝                                                                 | 시험                                                                                                         |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| 가용량 = 목록 total = 랜덤 난이도 풀 = 구성 차시 풀                | `unifiedBankAvailability.test.ts` — 조건 72조합 × 제외 유무 = 144, 자료 고른 조건 셋                         |
| 원문 30 · 사용 가능 24 · 담김 24 · 검수 보기 2                     | 같은 파일 첫 시험                                                                                            |
| 2/2 ⇔ `planRetry` 부족 0(자리 수 · 고른 id 까지)                   | `textbookSlots.test.ts` 무작위 3,000 · `bankReadiness.test.ts` DB 길(`findRetryCandidates` → `planRetry`) 12 |
| 조회 뒤 잠기면 출력 직전에 «출제 불가»                             | `bankReadiness.test.ts`                                                                                      |
| 관문 — 401 · 검수 계정 403 · 다른 사이트 403, 그동안 DB 를 안 읽음 | `studioBankReadinessRoutes.test.ts`                                                                          |
| 열쇠 목록 계약 = 규칙                                              | `bankReadiness.test.ts`                                                                                      |

`planRetry` · `retryCandidates` · 적재기(`retryPairPlan`)는 `src/lib/generator/textbookSlots.ts` 하나(열쇠 · 신분 조건 · `textbookSlotFit`)를 쓴다. 런타임에 fingerprint 비교는 넣지 않았다.

변이 넷(메모리 아님 — 커밋된 파일을 고쳐 돌리고 `git checkout` 으로 되돌림)이 다 잡혔다: 가용량을 보임 관문으로 셈(5 실패) · 구성이 filters 무시(6) · 슬롯이 차시를 안 봄(3) · 잠금 전이를 슬롯 잠금 까닭에서 뺌(1).

## 적재 · 갱신 도구 감사(원문이 바뀌거나 잠길 때 지정 슬롯)

| 도구                                              | 원문에 하는 일                   | 전                        | 후                                                                                                                            |
| ------------------------------------------------- | -------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `load-school-textbook.ts --refresh`               | 본문 · 정답 · 해설 · 그림 · 잠금 | 슬롯 그대로 열림          | 같은 트랜잭션 배치에서 열린 슬롯 잠금 · 드라이런 «지정_변형을_잠금» · 원장 `slotLocks` · 사람이 고친 원문의 열린 슬롯 수 알림 |
| `hold-school-textbook.ts --hold`                  | 교과서 전부 잠금                 | 슬롯 그대로               | 같은 트랜잭션에서 잠금                                                                                                        |
| `hold-school-textbook.ts --release*`              | 원문 풀기                        | —                         | 슬롯은 안 푼다(재검증 뒤) · 잠긴 채 남는 수를 알림                                                                            |
| `recover-held.ts` 교정                            | 잠긴 원문의 글 교정              | 슬롯 그대로               | 같은 트랜잭션에서 잠금 · 결과 `note`                                                                                          |
| `qualify-reviewed.ts`                             | pending → approved(열기)         | 원문 지문 대조(이미 있음) | 변경 없음                                                                                                                     |
| `bulk-retry.ts` · `repair-owned-retry-display.ts` | 변형 넣기 · 변형 고치기          | 원문은 안 바꿈            | 변경 없음                                                                                                                     |
| `lock-orphan-slots.ts`(새 · 드라이런 기본)        | —                                | —                         | 출제 불가 원문의 열린 슬롯을 한 번 맞춤. 2026-10-14 실측 0 건                                                                 |

잠금은 `directUseAllowed = false` 하나(검수 상태 · 사람 기록 불변). 공통 판정은 `src/lib/import/schoolTextbook/designatedSlotLocks.ts`.

## 실측(읽기 전용 — [census-20261014.md](census-20261014.md))

교과서 12,301 / 11,826 · 책 35 · 자료 1,992(sectionNo 누락 1,374 · round 1,984 · semester 1,987) · 지정 슬롯 2/2 2,179 원문 · 1/2 0 · 0/2 10,122 · 슬롯 4,358 전부 준비 · 열린 고아 슬롯 0. **기출은 시험지 5편 · past_exam 101 / 사용 가능 0 — 기출 제작 입구를 열 근거가 없다.** 엔진 갈래 manual 100,974 전부 `elem:`·`mid:` 표지(표지 없는 행 0 — 계약 주석의 «옛 수작업 행이 섞였다»는 지금 0).

## 시험 · 검사

- 새 시험 6파일(`textbookSlots` · `unifiedBankAvailability` · `bankReadiness` · `studioBankReadinessRoutes` · `designatedSlotLocks` · `slotCensus`) 통과
- 관련 스위트(`bank|unified|retry|ExamBuilder|schoolTextbook|problemEligibility|provenance|studio` 150파일) — 실패 5건은 **기준 커밋 `0acfc51e5` 의 깨끗한 추출본에서도 같은 5건**(ProblemBank 출처 선택지에 «교과서» · TextbookStudio · bankChoiceFigures 지문 · 근호 답 표기 · 활동 비계 1657). 영어 문제은행 스위트는 부하 중 훅 시간 초과였고 혼자 돌리면 통과
- `errorLogRouteCoverage`(english/questions 다섯 경로 `withErrorLog` 없음) · `englishFence`(WorksheetEditor → AnswerPage → EnglishWorksheetQuestion)는 HEAD 그대로의 빨강 — 이 작업과 무관
- `npm run type-check` 0 · 바꾼 파일 eslint 0 · prettier

## 남은 공백(이번에 안 한 것)

1. **사람이 문제은행에서 원문을 고치는 길**(`PATCH /api/problems/{id}` · 검수 판정 `review-status`/`review`)은 지정 슬롯을 잠그지 않는다. 계획은 도구의 책임으로 정했다 — 사람 편집에 같은 잠금을 걸지는 원장님 결정(오타 하나에 변형 둘이 잠긴다). `--refresh` 는 사람이 고친 원문의 열린 슬롯 수를 알린다
2. **잠근 슬롯을 다시 여는 길이 없다** — `qualify-reviewed.ts --kind retry` 는 `pending` 행만 승격한다. 잠긴 `approved` 슬롯은 대응 재검증 도구가 따로 필요하다
3. **오늘 이전의 원문 글 바뀜은 셀 수 없다** — `Problem` 에 «검산 때의 원문 지문»이 없다(저장소 밖 승격 영수증의 `sourceDigest` 에만 있다)
4. `format` 조건의 갈래 수는 `null`(미확인) — 본문을 읽어 가르므로 갈래별로 세지 않았다
5. `problemIneligibleReason` 의 문장(«출제가 잠긴 문항입니다.»)은 그대로 두었다 — 화면 문구 «출제 잠금(사유 미기록)»은 계약 상수(`BANK_INELIGIBLE_LABEL`)로 줬다. 목록 행에 열쇠(`ineligibleCode`)를 싣는 것은 화면이 원하면 한 줄(타입은 root 파일)
6. 시험 대역은 `problem.updateMany` 와 problem `orderBy` 를 모른다 — 잠금 시험은 같은 `where`/`data` 를 `findMany`+`update` 로 적용했고, 자료 차례 시험은 질의에 실린 `orderBy` 를 본다
