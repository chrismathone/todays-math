# 선수학습 진단 계획 v0.1 — Grok 독립 검토

작성: 2026-10-03
대상: `D:\todays-math\docs\planning\tracks\reports\math-prerequisite-20261003\plan-v01.md`
그래프 초안: `D:\todays-math\math-graph.cjs` (미실행. 이 검토는 파일을 읽기만 했다.)
판정: **request_changes**

v0.1의 불변 조건(직접 풀이만 반영, 조상 전체에 오답을 복사하지 않음, 11개 제외 과목 유지, 성취기준 전수 대조 미완료, 단원 간선을 소단원 간선으로 확대하지 않음)은 유지할 만하다. 구현 착수에는 부족하다. 저장 위치, 첫 폐회로, 수치 정책, 과거 기록의 편입 범위가 최종안에서 갈려 있다. 아래 결정은 v0.2가 그대로 박아야 하는 규격이다. 이 검토는 구현 승인이 아니다.

이 워크트리에는 `node_modules`가 없다. 이미 설치된 실행기로 생성기 표본을 돌릴 수 없어, 슬롯의 그림·자기채점 여부는 실행 결과가 아니다. 공급 판단은 `G3_TIERS`·`G5_TIERS`와 `gradeCourseAnswer` 소스까지이고, 씨앗 0..7 게이트는 구현 테스트가 처음 실행한다.

## 1. 그래프 초안에서 확인한 것

`UNIT_DATA`는 100줄이다. 초등 36, 중학교 26, 고등 38. `COURSE` 키는 `C1` `C2` `BAS1` `BAS2` `ALG` `CAL1` `PS` `CAL2` `GEO`뿐이다.

제외 11과목(경제 수학, 인공지능 수학, 직무 수학, 수학과 문화, 실용 통계, 수학과제 탐구, 전문 수학, 이산 수학, 고급 대수, 고급 미적분, 고급 기하)은 `UNIT_DATA`와 `COURSE`에 없다. `scope.excluded`에는 그 11개에 더해 직업계고 전문교과와 학교별 인정 과목이 들어 있다. 11개는 그대로 제외다.

`graph.schemaVersion`은 문자열 `"1.1.0"`이다. 숫자 `1`이나 문자열 `"1"`만 허용하는 계약은 이 그래프를 거절한다. 계약은 `z.literal("1.1.0")`로 적재 형식을 고정한다. 이 문자열은 단원 내용의 교육과정 대조 버전이 아니고, 매핑 버전이나 진단 정책 버전과도 다른 축이다. 단원마다 `achievementStandardIds: []`, `needsCurriculumAudit: true`. 간선마다 `isOfficialEnrollmentRequirement: false`. 학습 요소 ID는 `단원ID.tNN`이고, 포함(`contains`) 간선만 있다. 주제 사이 선수 간선은 없다. 지원 간선은 `H-CAL1-02` ← `H-ALG-02`, `H-ALG-03` 하나뿐이다. Kahn 검사는 선수 간선만 본다.

`M3-R02`의 직접 선수는 두 줄에 나뉘어 있다. 185행 `M3-R01`, `M1-R02`. 230행 `M3-N01`. 셋 다 직접 선수다. 한 줄만 읽으면 제곱근이 빠진다.

`reviewCandidates`는 숙달로 표시한 단원에서 조상 탐색을 끊고, 위상 순으로 조상 전체를 돌려준다. 주석은 이 목록이 결손 진단이 아니라고 적는다. 스크립트는 `--target`만 줘도 JSON과 Markdown을 먼저 쓴다.

중학교 ID의 `suggestedGrade`는 ID 숫자의 화면 배치 제안이다. 고등 영역은 과목 코드와 번호 구간으로 나눈다. `H-C1-06`(행렬)은 번호가 4보다 커서 `자료와 가능성`이 된다. 공식 영역 대조가 아니다.

실행 집계(순환 0, 간선 수)는 이 검토가 확인하지 않았다. v0.2는 조정자가 스크립트를 한 번 실행한 결과의 `schemaVersion`, `unitCount` 100, 제외 11개 문자열을 적재 검사로 박는다. 런타임 요청 경로는 그 스크립트를 호출하지 않는다.

## 2. v0.2가 박을 결정

이번 라운드는 100개 단원의 성취기준 전수 감사가 아니다. `needsCurriculumAudit: true`와 빈 `achievementStandardIds`는 유지한다. 여기서 확정하는 것은 계약, 저장, 진단, 출제 규칙, 그리고 실제로 공급되는 첫 폐회로다.

버전은 네 축으로 나눈다. 한 숫자를 공유하지 않는다.

| 축 | v1 값 | 의미 |
|---|---|---|
| `graphSchemaVersion` | 문자열 `"1.1.0"` | `math-graph.cjs`가 쓰는 적재 형식. `"1"`이나 `1`이 아니다 |
| `mappingVersion` | 정수 `1` | 아래 갈래 키 화이트리스트. 교육과정 대조가 끝났다는 뜻이 아니다 |
| `policyVersion` | 정수 `1` | §2.5의 문항 수·깊이·예산 |
| 교육과정 대조 | 미완료 | `needsCurriculumAudit`를 끄지 않는다. 매핑 버전을 올려도 그대로다 |

payload와 API는 이 셋(`graphSchemaVersion`, `mappingVersion`, `policyVersion`)을 함께 저장한다. 그래프 파일의 형식 버전이 바뀌면 학생 상태를 자동 이관하지 않고 읽기를 거절한다. 매핑만 올린 경우에는 옛 관찰을 유지하고, 새 갈래는 미측정으로 둔다. 정책만 올린 경우에는 이미 끝난 세션의 판정을 다시 계산하지 않는다.

### 2.1 식별자

한 레코드에 한 종류의 ID만 넣는다.

| 종류 | 예 | 쓰는 곳 |
|---|---|---|
| 그래프 단원 | `E56-N01` | 진단·추천의 단원 키 |
| 그래프 학습 요소 | `E56-N01.t01` | 사람이 확인한 태그가 있을 때만 |
| 초등 갈래 키 | `초5\|1-2-1` | `tierKey()` (`src/lib/elementary/difficulty.ts`) |
| 코스 섹션 ID | `5-1-2-1` | `src/lib/math-srs/elementary/catalog.ts`의 `` `${grade}-${sectionCode}` `` |
| 중등 유형 키 | `3-1\|이차방정식의 풀이\|02` | `generateMiddleProblem` |
| SRS 개념 | `balance` 등 6개 | 기존 중1 일차방정식 미션 전용. 그래프 주제가 아니다 |
| DB `Unit.id` | UUID | 시드 소단원 코드와 학년이 정확히 한 행일 때만 관찰에 덧붙인다 |

제목 유사도, `Unit.orderIndex`, `curriculumBridge.ts`의 탐험 단원 ID(`g5-divisors`, `g7-equation`)로 그래프 ID를 정하지 않는다. `g5-divisors`는 챕터 `5-1-1`(자연수의 혼합 계산, 그래프 `E56-N02`)과 `5-1-2`(약수와 배수, 그래프 `E56-N01`)를 한 덩어리로 묶는다. 그 맵을 그래프 매핑으로 재사용하면 안 된다.

UUID가 없어도 초등 생성은 `CURRICULUM_UNITS`로 된다. UUID가 두 행이거나 없으면 관찰의 `dbUnitId`는 null이고, 생성은 막지 않는다. UUID가 없다는 이유로 다른 단원을 집어넣지 않는다.

매핑 한 칸의 상태는 `verified | ambiguous | unmapped`이고, 공급은 `available | unavailable`이다. 둘은 따로다. 그래프에 단원이 있다는 문장과 공급 가능은 다른 문장이다.

매핑 버전 1에서 `available`인 그래프 단원은 `E56-N01`과 `E34-N03`뿐이다. 나머지 98개 단원(고등 전체, `E12-*`, `M3-R02` 포함)은 조회는 되고 공급은 `unavailable`다. 고등 단원을 지원한다고 표시하는 검사는 이 표다. `H-`로 시작하는 ID의 공급은 `unavailable`, 상태는 `unmapped`다.

### 2.2 첫 폐회로 — `elem-divisor-loop`

목표 단원 `E56-N01`(약수와 배수). 직접 선수 간선은 `E56-N01` ← `E34-N03` 하나다 (`math-graph.cjs` 149행). 세션은 이 한 간선만 탄다. `E34-N03`의 선수인 `E12-N03`, `E34-N02`로는 내려가지 않는다.

`M3-R02`는 이 폐회로가 아니다. 생성 모듈은 있다. `M3_QUAD`·`M3_POLY`·`M3_ROOT`는 `src/lib/middle/m3.ts`의 `M3_TYPES`를 거쳐 `src/lib/middle/generate.ts`의 `ALL`에 들어간다. `M1-R02`의 일부는 `src/lib/math-srs/engineCatalog.ts`의 `ENGINE_CATALOG`와 `gradeSrsAnswer`로 학생 채점까지 연결된다. 그러나 `m3Quad.ts`의 정답은 `$k\\neq …$`, `$x=…$`처럼 수 하나가 아닌 문자열이 섞여 있고, `readEngineAnswer`는 수 하나가 아니면 던진다. `engineCatalog.ts` 80–81행은 일차방정식 밖의 유형을 SRS 채점에서 뺀다. 유형 키 화이트리스트를 씨앗별로 재기 전에는 `M3-R02` 공급을 `unavailable`로 둔다. 다른 단원으로 바꾸어 내지 않는다. 교사 그래프 조회에서는 단원과 간선 이유가 보인다.

초등 쪽 근거:

- 목표 소단원 `초5|1-2-1`부터 `초5|1-2-6`은 `src/lib/elementary/g5.ts`의 `G5_TIERS`에 `연산`·`기본`·`응용`이 있다. 시드 단원명은 `prisma/seed-data/units.ts`의 `1-2 약수와 배수`(orderIndex 252–257).
- 선수 소단원으로 소스에서 세 갈래를 확인한 것: `초3|1-3-1`·`1-3-2`·`1-3-3`·`1-3-4`, `초3|1-4-1`, `초3|2-1-1`·`2-1-2`·`2-1-3`, `초3|2-2-1` (`g3.ts`). 이 목록 밖 초3 곱셈·나눗셈 소단원은 매핑 버전 1에 넣지 않는다.
- 학생 채점은 `gradeCourseAnswer` (`src/lib/math-srs/elementary/answers.ts`). `getCourseProblemInput`이 `self-check`를 주면 `gradeCourseAnswer`는 `null`이다. 그림이 있는 문항은 기존 그림 경로가 코스 세션 ID에 묶여 있다 (`publicCourseSession`의 `/api/learn/math-srs/course/figure`).
- `E12-*`는 `COURSE_SECTIONS`가 초3–초6만 담으므로 이 생성기에 없다.

슬롯은 고정한다. 씨앗은 `studentId + sessionId + slot`에서 나온 정수다.

| 단계 | 슬롯 | 단원 | 갈래 키 | 난이도 |
|---|---|---|---|---|
| 목표 PROBE 3문항 | T1 T2 T3 | `E56-N01` | `초5\|1-2-2` `초5\|1-2-4` `초5\|1-2-6` | 연산, 기본, 응용 |
| 선수 확인 3문항 | P1 P2 P3 | `E34-N03` | `초3\|1-4-1` `초3\|1-3-1` `초3\|2-1-1` | 연산, 기본, 응용 |
| 선수 연습 3문항 (확인이 실패할 때만) | R1 R2 R3 | `E34-N03` | `초3\|1-3-2` `초3\|1-3-3` `초3\|2-2-1` | 연산, 기본, 응용 |
| 목표 복귀 3문항 | B1 B2 B3 | `E56-N01` | `초5\|1-2-1` `초5\|1-2-3` `초5\|1-2-5` | 기본, 연산, 기본 |

한 슬롯은 씨앗 0부터 7까지 `generateElementaryProblem(unit, seed, tier)`를 부른다. `figureSpec === null`이고 `getCourseProblemInput(...).mode === "number"`인 첫 문항을 낸다. 여덟 개 모두 탈락하면 그 슬롯은 공급 불가이고, 세션은 그 자리에서 멈추며 이유를 돌려준다. 다른 그래프 단원이나 다른 소단원으로 메우지 않는다. 이 게이트를 구현 테스트가 실제로 돌리기 전에는 화면에서 이 경로를 열지 않는다. 이 검토는 그 테스트를 실행하지 못했다.

호출은 `generateElementaryProblem`만 한다. `selectProblems`는 시험지 자리·최근 문항·DB 풀용이라 이 경로에 쓰지 않는다. `generateCourseSession`은 다섯 문항과 코스 진도를 움직이므로 쓰지 않는다.

`BankCourseCandidate` (`src/lib/math-srs/courseBank.ts`)는 `content`, `answer`, `solution`, `tier`만 남긴다. 조회는 `id`를 `select`하지 않고, family 키도 없다. 은행 문항을 진단 관찰로 쓰면 원본 문항 ID와 family로 중복·재채점을 가를 수 없다. `generateCourseSession`도 은행 후보를 고른 뒤 ID를 `` `${sectionId}:${problemSeed}:${tier}` ``로 새로 붙인다. v1 관찰의 문항 키는 그 은행 ID가 아니라 `tierKey + tier + seed`다.

`expeditionToday` (`src/lib/math-explorers/expedition.ts`)는 열린 미션이 있으면 새 계획보다 그 미션을 먼저 돌려준다. `updateExpedition`은 미션이 열린 동안 코스 세션·미션·기억을 바꾸면 `SrsConflict`를 던지고, 초등 다음 세션도 추천된 소단원과 모드가 같을 때만 이어 붙인다. 선수 보충을 오늘의 탐험 미션이나 코스 세션 안에 끼우면 그 가드와 충돌하거나, 고정된 미션 단원이 바뀐다. 진단 세션은 `updateExpedition`과 `course.learner.session`을 쓰지 않는다. 학생에게 열린 탐험 미션이 있어도 진단 API는 그 미션을 닫거나 이어 받지 않는다. 화면이 생기기 전에는 두 흐름이 한 화면에 동시에 나오지 않는다.

흐름:

1. PROBE에서 서버 채점 오답이 2개 미만이면 세션은 목표에서 끝난다. 선수 문항을 열지 않는다. 오답 1개는 약점이 아니다.
2. 오답이 2개 이상이면 `E34-N03` 확인 3문항을 연다. 이 확인이 그 학생의 그날(KST) 보충 1회다.
3. 확인에서 독립 정답이 2개 이상이면 목표 복귀 3문항으로 간다.
4. 확인에서 오답이 2개 이상이면 같은 단원의 연습 3문항을 푼 뒤, 결과와 상관없이 목표 복귀 3문항으로 간다.
5. 복귀 문항의 정답은 목표 단원 관찰로만 남는다. 선수 단원을 숙달로 올리지 않고, 목표 단원 전체를 숙달로 올리지 않는다.

이유 문장(API가 돌려주는 그대로):

- 확인을 열 때: `약수와 배수에서 틀린 문제가 있어 곱셈·나눗셈 세 문제를 확인합니다. 확인 범위는 지정한 소단원뿐이고 단원 전체가 아닙니다.`
- 복귀할 때: `확인을 마쳤습니다. 약수와 배수 문제로 돌아갑니다.`
- 연습 뒤 복귀할 때: `곱셈·나눗셈에서 틀린 문제가 있습니다. 같은 범위 세 문제를 더 푼 뒤 약수와 배수로 돌아갑니다. 더 아래 단원으로는 내려가지 않습니다.`
- 슬롯이 비었을 때: `이 소단원에서 채점 가능한 문제를 내지 못했습니다.` 뒤에 갈래 키를 붙인다.
- 하루 한도를 썼을 때: `오늘은 선수 확인을 이미 했습니다. 약수와 배수 문제를 계속합니다.`

학생에게 그래프 ID나 UUID를 보내지 않는다. 교사 조회 DTO에는 그래프 ID, 간선 이유, 매핑 버전, 공급 상태를 넣는다.

### 2.3 단원 상태와 소단원 상태

durable 상태는 학생 × 그래프 단원, 그리고 학생 × 갈래 키에 따로 둔다. 단원 상태는 소단원 상태의 OR이 아니다.

갈래 키 하나:

- 서버 채점 독립 정답이 1개 이상이면 그 갈래는 통과다.
- 오답만 있으면 그 갈래는 미통과다.
- 관찰이 없으면 미측정이다.

그래프 단원 (`E56-N01`의 매핑된 갈래는 6개, `E34-N03`의 매핑된 갈래는 위 9개):

- `unassessed`: 서버 채점 관찰이 없다.
- `partial`: 통과 갈래가 1개 이상이고, 매핑된 갈래가 모두 통과한 것은 아니며, PROBE 실패 조건도 아니다.
- `needs_practice`: 이 단원 자신의 PROBE가 실패했거나, 이 단원을 선수로 확인했을 때 오답이 2개 이상이다.
- `demonstrated`: 매핑 버전 1에 적힌 그 단원의 갈래가 전부 통과이고, 가장 최근 서버 채점 묶음이 PROBE 실패가 아니다.

`needs_check`는 저장 상태가 아니다. 추천이 “직접 선수를 아직 확인하지 않았다”고 말할 때의 세션 단계 이름이다.

`demonstrated`인 직접 선수만 확인에서 건너뛴다. `partial`은 건너뛰지 않는다. 건너뛰려면 그 선수의 최신 독립 정답이 30일 안이어야 한다. 그 선수의 조상은 보지 않는다. 숙달 상속은 없다.

이 폐회로의 복귀 3문항을 다 맞아도 `E56-N01`은 최대 `partial`이다. 6개 갈래가 모두 통과하기 전에는 `demonstrated`가 아니다.

점수는 확률로 말하지 않는다. `mastery` 0–100을 만들지 않는다. `StudentSrsState`의 `ConceptMemory.mastery`와 `estimatedRecall`은 읽지 않는다. `applyAttempt`는 틀린 문항의 `conceptWeights`로 선수 개념 숙련도를 0 쪽으로 당긴다 (`memory.ts`의 weight 상한 0.2, 오답 target 0). 그 값은 진단 근거가 아니다.

`AnalysisReport.recommendedUnits`의 `RECOMMEND_THRESHOLD = 0.6` (`buildAnalysisReport.ts`)과 서술형 `ESSAY_PASS_THRESHOLD = 60` (`gradeAnswers.ts`)은 이 상태 기계에 넣지 않는다.

### 2.4 관찰

v1이 읽는 과거 범위는 비어 있다. `TestResult`, `ProblemAnswer`, `AnalysisReport`, SRS 미션, 코스 `recentAttempts`로 관찰을 만들지 않는다. 결시·미채점·서술형 부분점수·60% 추천이 약점으로 들어오는 길을 첫 버전에서 닫는다. 나중에 가져오려면 별도 매핑 버전과 별도 테스트가 필요하다.

v1 관찰은 이 세션의 서버 채점만 만든다.

```
outcome = "correct_independent" | "incorrect"
```

- 힌트 API는 없다. 요청 본문의 `correct`, `usedHint`, `selfCorrect`, `mastery`는 스키마가 거절한다.
- `self-check` 문항은 슬롯 게이트에서 버린다. 학생의 자기 채점은 관찰이 아니다.
- 같은 `problemId`의 두 번째 제출은 상태를 바꾸지 않는다.
- 미제출·세션 포기·결시는 관찰을 만들지 않는다. 0점 약점이 아니다.
- 경과 시간은 저장하지 않는다. 느린 정답도 `correct_independent`다.
- 재채점은 순수 함수로만 먼저 둔다. 같은 `responseId`의 더 큰 `responseRevision`이 이전 기여를 교체한다. 작은 revision은 무시한다. 교사 재채점 API는 v1에 없다. 감산 누적은 없다.

멱등 키 `clientKey`(UUID)를 제출 본문에 둔다. 같은 키와 같은 본문은 200으로 처음 결과를 다시 준다. 같은 키와 다른 본문은 409이고 저장하지 않는다. 키가 달라도 같은 `problemId`의 재제출은 409다.

### 2.5 루프를 끊는 수

코드 상수 `PREREQUISITE_POLICY`. 테스트가 이 숫자를 읽는다.

- `maxDepth: 1`. 직접 선수 간선만. 출제 코드는 `reviewCandidates`를 호출하지 않는다.
- `maxCheckUnits: 1` on this path. `E56-N01`의 직접 선수는 하나다. 다른 목표를 나중에 열 때도 한 세션의 확인 단원은 1개다. 직접 선수가 여러 개면 위상 순으로 첫 미측정·미숙달 직접 선수 하나만 고르고, 나머지 직접 선수는 “이번에 확인하지 않음”으로 적는다. 조상은 고르지 않는다.
- `probeSize: 3`, `checkSize: 3`, `practiceSize: 3`, `returnSize: 3`.
- 확인 통과: 독립 정답 2. 확인 실패: 오답 2. 연습 결과는 통과 여부를 바꾸지 않는다. 연습 뒤에도 목표로 돌아간다.
- `dailyDetourCap: 1` (KST). 보충을 연 날에 같은 학생의 두 번째 선수 확인은 열리지 않는다. PROBE가 통과해 선수를 열지 않은 세션은 이 횟수에 넣지 않는다.
- `recheckCooldownHours: 24`. 같은 학생·같은 목표·같은 선수 쌍은 확인이 끝난 뒤 24시간 동안 다시 열지 않는다.
- `support` 간선은 자동 출제하지 않는다.
- `courseRelations`는 화면용이다. 추천 입력이 아니다.
- 열린 세션은 학생당 하나다. 두 번째 시작은 409다.

### 2.6 저장 — 새 표가 필요하다

`StudentSrsState.payload`에 넣지 않는다. `serverState.ts`의 `payloadSchema`는 `version: literal(1)`인 `strictObject`이고, 실패하면 `parseSrsState`가 `SrsUnavailable`을 던져 미션·코스·탐험이 함께 읽히지 않는다. `changeSrsState`는 그 행 전체를 CAS로 갈아끼우고 `updateDailyJourney`와 `updateExpedition`을 거친다. 진단 관찰의 스키마 오류나 용량이 기존 학습 기록을 읽을 수 없게 만든다. 두 탭의 미션 저장과 진단 저장이 같은 revision에서 충돌한다.

새 표:

```
student_prerequisite_state
  student_id  uuid  PK, FK student(id) ON DELETE CASCADE
  revision    int   default 1
  payload     jsonb
  created_at  timestamptz
  updated_at  timestamptz
```

payload 버전 1:

```
{
  version: 1,
  graphSchemaVersion: "1.1.0",
  mappingVersion: 1,
  policyVersion: 1,
  observations: [ ... ],  // 최대 200
  sessions: [ ... ]       // 완료 30개 + 열린 세션 1개
}
```

200개를 넘으면 `answeredAt`이 오래된 관찰부터 버린다. 단, 각 `(graphUnitId, tierKey)`의 최신 관찰은 남긴다. 세션 문제를 무한 ledger로 학생 payload에 쌓지 않는다. SRS 행은 이 쓰기에서 갱신하지 않는다.

마이그레이션은 가산 SQL 초안과, SRS 표에 썼던 것과 같은 격리 적용 스크립트로 둔다. `prisma migrate dev`, `prisma db push`, 공유 DB 적용은 이 계획의 구현 착수에 포함하지 않는다. 적용은 원장님 확인이 있는 뒤의 별도 단계다. 순수 로직과 계약 테스트는 표 없이 먼저 녹색이 될 수 있다. 라우트가 표를 쓰기 전에 초안 SQL이 저장소에 있어야 한다.

기존 `StudentSrsState` 행은 읽기·쓰기 규칙이 바뀌지 않아야 한다. 없는 표(`P2021`/`P2022`)는 SRS의 `SrsUnavailable`과 같은 방식으로 “저장소를 준비 중”이라고 알리고, SRS 코스 요청을 실패시키지 않는다.

CAS는 `changeSrsState`와 같다. `updateMany`의 `where: { studentId, revision }`과 `revision` 증가. 기대 revision이 다르면 409. 다섯 번 재시도 뒤에 409. 생성 경합(`P2002`)만 다시 읽는다.

### 2.7 권한과 응답

학생 라우트는 `requireStudent({ active: true })` (`courseRoutes.ts`)를 쓴다. 학생 ID는 세션에서만 취한다. 본문의 학생 ID는 무시하거나 거절한다. 탈퇴(`eywaWithdrawnAt`) 학생은 `loadCourseStudent`와 같이 없다.

교사 조회는 `ownedStudentsWhere` (`ownerScope.ts`)로 거른다. 범위 밖은 404다. 다른 학생의 관찰을 목록에 섞지 않는다.

문항 DTO는 `publicCourseSession`처럼 제출 전에 `answer`와 `solution`을 넣지 않는다. 제출 뒤에는 `{ correct }`만 준다. 힌트로 정답을 열어 주지 않는다. 교사 목록에도 정답 문자열을 넣지 않는다.

`askJev`는 이 폐회로에서 호출하지 않는다. 산술, 채점, 간선 선택, 예산, 공급 판단은 코드가 한다. 진단 모듈은 `@/lib/jev/client`를 import하지 않는다.

### 2.8 화면

D-07 때문에 새 화면은 이 구현의 첫 단계가 아니다. v0.1의 완료 조건 5(실제 화면 검증)와 P4는 Wire 선택 뒤로 민다. 첫 구현의 완료는 같은 학생 세션으로 PROBE → 확인 또는 종료 → 필요하면 연습 → 복귀를 걷는 API 테스트다. 새 메뉴, 코스 진도 가로채기, `/api/learn/math-srs/course/attempts` 변경은 하지 않는다.

라우트는 `/api/learn/math-prerequisite/session` 아래로 새로 둔다. 시작, 제출, 현재 세션 조회. 교사 그래프 조회 라우트는 Wire 이후다. 그 전까지 그래프 순수 함수 테스트만 둔다.

### 2.9 파일 소유 (첫 수직 조각)

한 작업 줄기가 계약과 순수 로직을 함께 둔 뒤에 라우트를 연다. v0.1의 “P1과 P2를 계약 이후 병렬”은 계약 파일이 생기기 전에는 시작하지 않는다.

- `src/contracts/mathPrerequisite.contract.ts` — 요청·응답·상태·정책 상수
- `src/lib/math-prerequisite/graph.ts` — 적재된 JSON 조회. 스크립트 실행 없음
- `src/lib/math-prerequisite/mapping.ts` — 매핑 버전 1
- `src/lib/math-prerequisite/policy.ts` — 위의 상수와 세션 전이
- `src/lib/math-prerequisite/evidence.ts` — 관찰 축약, dedupe, revision 교체
- `src/lib/math-prerequisite/session.ts` — 슬롯 선택과 `generateElementaryProblem` 호출
- 라우트와 표 접근은 그 다음 한 조각

`src/lib/math-srs/**`, `selectProblems.ts`, `curriculumBridge.ts`, `memory.ts`, `serverState.ts`는 수정하지 않는다. 새 코드가 그것들을 진단 근거로 읽지 않는지만 테스트한다.

## 3. 결함

### P0

1. 저장이 “SRS optional 필드 또는 별도 캐시 중 나중에 합의”로 남아 있다. SRS payload에 넣으면 기존 학습 기록 전체가 파싱 실패한다. v0.2는 §2.6의 새 표를 채택한다.
2. 첫 공급 경로가 “검증 후 `M3-R02` 또는 미지원 표시”로 열려 있다. 중3 이차방정식은 생성기는 있으나 학생 채점 폐회로가 아니다. v0.2는 §2.2의 `elem-divisor-loop`만 학생 출제로 연다. `M3-R02` 공급은 `unavailable`이다.
3. 깊이, 문항 수, 하루 예산, 재확인 유예, 통과 문턱이 “정책에 둔다”로만 있다. v0.2는 §2.5의 숫자를 상수로 박는다. `reviewCandidates`의 조상 전체 목록을 문제 세트로 쓰지 않는다.
4. “기존 기록에서 관찰을 만들 수 있는 범위를 먼저 정한다”가 비어 있다. v1의 범위는 빈 집합이다 (§2.4).
5. 단원 `demonstrated`와 갈래 통과의 데이터 모양이 예시 상태 이름뿐이다. v0.2는 §2.3을 계약 스키마로 둔다. 매핑된 갈래 전부가 통과하기 전에는 단원 숙달을 주지 않는다.
6. 버전 축이 하나처럼 읽힌다. v0.2는 문자열 `graphSchemaVersion: "1.1.0"`, 정수 `mappingVersion`, 정수 `policyVersion`, 그리고 계속 미완료인 교육과정 대조를 서로 다른 필드로 적는다. `"1"`이나 숫자 `1`은 그래프 형식 버전으로 받지 않는다.

### P1

1. v0.1 완료 조건 5와 P4는 화면을 요구한다. D-07은 Wire 선택 전에 화면 구현을 막는다. 첫 완료 조건은 §2.8의 API 시퀀스다.
2. 공유 DB 마이그레이션 적용은 이 계획의 착수 조건이 아니다. 초안 SQL과 격리 적용 스크립트만 구현 범위에 넣고, 적용은 별도 승인으로 남긴다.
3. `curriculumBridge.ts`를 “명시적 매핑 관례”로 따르면 `g5-divisors`가 `E56-N01`과 `E56-N02`를 섞는다. 그래프 매핑은 새로 작성한다.
4. `math-graph.cjs`는 조회만 해도 파일을 쓴다. 서버는 합의 후 한 번 생성해 커밋한 JSON만 읽는다. 요청마다 스크립트를 실행하지 않는다.
5. 기존 코스 힌트는 `publicCourseSession`에서 해설(정답 포함)을 열 수 있다. 새 API는 힌트 필드가 없다. 코스 라우트의 힌트 동작은 바꾸지 않는다.
6. 고등 38개 단원과 `E12-*`는 학생 생성기가 없다. 공급 `unavailable` 테스트 없이 “나머지 100개도 그래프 조회가 되니 순차 확장”이라고만 적으면, 조회 가능이 출제 가능으로 읽힌다. 확장 단위는 매핑 버전을 올리는 별도의 화이트리스트다.
7. 구현 병렬화는 계약 파일이 생긴 다음이다. 첫 조각의 파일 목록은 §2.9다.

### P2

1. `H-C1-06` 행렬의 영역이 번호 휴리스틱상 `자료와 가능성`이다. `needsCurriculumAudit`를 유지하고, 영역 필터를 공식 성취기준으로 표시하지 않는다.
2. 중학교 `suggestedGrade`는 공식 학년군이 아니다. 교사 화면 문구에 “배치 제안”이 있어야 한다. 화면 구현 때 반영한다.
3. `M3-R02` 직접 선수가 185행과 230행으로 나뉘어 있다. 그래프 테스트는 `M3-N01`, `M3-R01`, `M1-R02` 셋이 모두 직접 선수인지 본다.
4. 지원 간선이 미적분Ⅰ 미분에만 있다. 추천 테스트는 그 간선이 확인 후보에 들어가지 않는지 본다.
5. 성취기준 ID는 빈 배열로 남긴다. 대조가 끝났다는 표시를 만들지 않는다.

## 4. 재사용할 연결과 회귀

| 재사용 | 파일 | 회귀를 막는 방법 |
|---|---|---|
| 초등 생성·채점 | `generateElementaryProblem`, `gradeCourseAnswer`, `getCourseProblemInput` | 코스 세션·진도·`storedCourseSchema`를 쓰지 않는다 |
| 학생 인증 | `requireStudent` | 새 라우트만 추가한다. 기존 learn 코스 라우트 핸들러는 그대로다 |
| 교사 범위 | `ownedStudentsWhere` | 학생 표에 `userId`를 새로 달지 않는다 |
| CAS 모양 | `changeSrsState`의 revision 비교 | 다른 표에 복사한다. `student_srs_state`는 갱신하지 않는다 |
| 없는 표 오류 | `isMissingSrsStorage`의 `P2021`/`P2022` | 진단 표가 없을 때 코스 API가 500이 되면 안 된다 |
| 정답 비노출 | `publicCourseSession` | 제출 전 정답 필드를 만들지 않는다. 힌트 공개는 복사하지 않는다 |
| 그래프 불변 | `math-graph.cjs`의 제외 목록, `needsCurriculumAudit`, 주제 간선 금지 | 런타임은 생성 결과를 읽고, 스크립트 정책을 느슨하게 하지 않는다. 형식 버전은 문자열 `"1.1.0"`만 받는다 |
| 은행 후보를 진단에 쓰지 않음 | `courseBank.ts`의 `BankCourseCandidate` | 문항 ID·family가 사라진 본문으로 관찰을 만들지 않는다 |
| 열린 탐험을 유지 | `expeditionToday`, `updateExpedition` | 진단 쓰기가 코스 세션·탐험 미션·SRS 기억을 바꾸지 않는다 |

기대 회귀는 “새 기능이 기존 기록을 깨는 것”이다. 코스 다섯 문항 세션, SRS 미션 12문항, `payloadSchema` 버전 1, 시험 분석의 60% 추천, 문제 은행 선택기는 입출력이 같아야 한다.

쓰지 않을 것: `conceptWeights`와 `PREREQUISITES` (`generator.ts`의 balance ← two-step 사슬), `selectProblems`, `buildAnalysisReport`의 추천 단원, `reviewCandidates`의 조상 목록, Jev, DB 문항 재고를 가정한 공급 표시.

## 5. 테스트

순수 함수가 먼저다. 라우트 테스트는 표 포트를 가짜로 둔다. 유료 API와 `math-graph.cjs` 실행은 테스트에 넣지 않는다.

1. 그래프 JSON: `schemaVersion`이 문자열 `"1.1.0"`일 때만 적재. `"1"`과 `1`은 거절. 단원 100, 제외 11개 문자열이 단원 과목·`COURSE`에 없음, 주제 ID로 드나드는 선수 간선 0, `needsCurriculumAudit === true`가 전 단원, `isOfficialEnrollmentRequirement === false`가 전 간선, `M3-R02`의 직접 선수가 정확히 `M3-R01` `M1-R02` `M3-N01`, 지원 간선은 출제 후보에 없음. 매핑 버전을 올려도 `needsCurriculumAudit`는 true.
2. 매핑: `H-`와 `E12-`와 `M3-R02`는 `unavailable`. `E56-N01`과 `E34-N03`만 `available`. 제목으로 고른 단원이 없음. `g5-divisors`와 `orderIndex`를 읽지 않음. 갈래 키에 해당하는 `CURRICULUM_UNITS`가 1개가 아니면 그 슬롯은 공급 불가.
3. 공급 게이트: 각 고정 슬롯에 대해 씨앗 0..7 중 그림이 없고 `mode === "number"`인 문항이 하나 이상. 실패하면 그 슬롯 때문에 빌드가 빨갛고, 다른 단원으로 대체하는 분기는 없다.
4. 학생 격리: A의 제출이 B의 상태를 바꾸지 않음. 본문에 다른 학생 ID를 넣어도 세션 학생만 기록됨.
5. PROBE 오답 1개: 선수 문항이 없음. 상태 `partial` 또는 `unassessed`. `needs_practice` 아님.
6. PROBE 오답 2개: 다음 문항의 갈래 키가 P1. 이유 문장에 단원 전체가 아니라는 말이 있음. `E12-N03`과 `E34-N02` 문항이 없음.
7. 확인 독립 정답 2개: 다음이 B1. 선수 단원은 `demonstrated`가 아님. 목표 단원도 `demonstrated`가 아님.
8. 확인 오답 2개: R1이 나온 뒤 B1이 나옴. 깊이 2 없음.
9. 복귀 3문항을 모두 맞아도 `E56-N01`은 `demonstrated`가 아님. 6개 갈래가 각각 독립 정답을 가져야 `demonstrated`.
10. 같은 `clientKey`·같은 본문 재전송: 관찰 1개, revision 유지, 200. 같은 키·다른 본문: 409, 무변경. 같은 `problemId` 재제출: 409.
11. 재채점 순수 함수: revision 2가 revision 1을 교체. 독립 정답 수가 2가 되지 않음. 더 작은 revision은 무시.
12. 미제출로 세션을 닫아도 오답 관찰이 생기지 않음. 힌트·자기채점·`correct: true` 필드는 파싱 실패.
13. 하루 두 번째 보충과 24시간 안 재확인은 목표 문항만 허용하거나 거절. 정책 상수를 우회하는 분기가 없음.
14. 그림·자기채점만 나오는 슬롯은 세션이 멈추고 공급 불가 이유를 돌려줌. 승인하지 않은 문항을 넣지 않음.
15. SRS 픽스처 payload가 진단 모듈을 import한 뒤에도 `parseSrsState`를 통과. 진단 쓰기가 `studentSrsState.updateMany`를 호출하지 않음. 열린 탐험 미션이 있는 SRS 상태에서 진단 세션을 시작해도 `course.learner.session`과 `expedition.mission`이 그대로다. `updateExpedition`을 호출하지 않음. 진단 표가 없으면 코스 대시보드 핸들러는 실패하지 않음(포트 테스트).
15a. 진단 관찰에 `BankCourseCandidate`를 넣지 않음. 문항 키는 `tierKey + tier + seed`이고 DB `Problem.id`가 아니다.
16. 교사 범위 밖 학생은 404. 제출 전 GET에 `answer`·`solution` 문자열이 없음.
17. 진단 모듈 소스에 `@/lib/jev/client` import가 없음.
18. 기존 코스 시도 스키마와 SRS 미션 길이 12 테스트가 수정 없이 통과.

## 6. 이 검토가 승인하지 않는 것

- 제품 코드 수정, 공유 체크아웃의 `math-graph.cjs` 수정, DB 적용, 화면 구현.
- 100개 단원 전체의 문제 공급.
- `M3-R02`를 첫 학생 경로로 여는 것.
- SRS 기억이나 시험 60% 추천을 약점으로 읽는 것.
- 성취기준 대조가 끝났다는 표시.
- 제외 11과목을 그래프에 넣는 것.

판정은 **request_changes**다. v0.2가 §2의 결정과 §3의 P0 다섯 가지를 본문에 고정하고, 같은 해시의 개정안을 다시 보내면 그때 동의 여부를 따로 판단한다. 이 파일만으로 구현을 시작하지 않는다.
