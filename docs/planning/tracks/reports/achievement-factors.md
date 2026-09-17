# 보고 — 성취 팩터 집계 + 리포트 시안 (D-134 트랙 2)

브리프: `docs/planning/tracks/briefs/achievement-factors.md` · SSOT: `docs/planning/23-achievement-report.md`
워크트리 `chrismathone/achievement-factors` · 2026-09-18 · 커밋 계정 `SUN <chrismathone@gmail.com>`

> 🔴 **공유 DB 는 읽기만 했다.** 마이그레이션 없음 · `prisma/schema.prisma` 안 건드림 ·
> `src/mocks/prismaTestDouble.ts` 안 건드림 · `src/lib/testResults/gradeAnswers.ts` 안 건드림
> (트랙 1 `grading-input` 이 같은 자리를 만지는 중이라 일부러 비켜 갔다 — §5).

---

## ① 만든 것

| 무엇 | 어디 | 줄 |
|---|---|---|
| 기간 경계 (주 시작 = **월요일 00:00 KST**) | `src/lib/achievement/period.ts` | 72 |
| 팩터 타입 — **`null` 규칙을 타입에 박는다** | `src/lib/achievement/types.ts` | 246 |
| 팩터 수집 **순수 함수** | `src/lib/achievement/collect.ts` | 543 |
| 시험지 만점 세기 (채점기와 대조) | `src/lib/achievement/maxScore.ts` | 45 |
| 학부모에게 하는 **문장** | `src/lib/achievement/sentences.ts` | 92 |
| DB 조회 한 묶음 (서버 전용) | `src/lib/achievement/load.ts` | 355 |
| 계약 (strict · 전부 `.nullable()`) | `src/contracts/achievement.contract.ts` | 226 |
| API `GET /api/students/{id}/achievement` | `src/app/api/students/[id]/achievement/route.ts` | 62 |
| **Wire 4안** `/dev/report-wire` | `src/app/dev/report-wire/{page,ReportWireClient}.tsx` | 145 + 785 |
| 변이 하네스 (**변이 31개**) | `scripts/qa/mutate-achievement.ts` | 638 |
| 시험 4파일 | `src/__tests__/unit/achievement{Period,Factors,Sentences,MaxScore}.test.ts` | 1,013 |
| API 시험 | `src/__tests__/api/achievement.test.ts` | 187 |

### 1.1 팩터 표 — **무엇을 정직하게 말할 수 있나**

| 영역 | 팩터 | 출처 | 🔴 결측 규칙 (구현된 대로) | 지금 실데이터 |
|---|---|---|---|---|
| ① 무엇을 배웠나 | 소단원 목록 · 차시 수 | `Progress` | 기간 안 진도 **0행 → `null`** (빈 배열도 «0차시»도 아니다) | 🟢 **있다** |
| | 계획 대비 밀림(일) | `ProgressPlan` + `resolveDailyPlan` | **못 재면 `null` + 까닭**(`계획없음`·`계획꺼짐`·`진도없음`·`차시밖`) | 🔴 `계획없음` (계획 0행) |
| ② 얼마나 맞았나 | 회차별 점수·만점 | `TestResult` + `TestProblem` | 채점 **0건 → `null`** · 있는데 전부 결시 → **빈 배열** · **결시는 점수 `null`** | 🔴 0건 |
| | 평균 정답 비율 | 〃 | **배점 합산**(회차 평균이 아니다) · 잴 회차 없으면 `null` | 🔴 |
| | 누적 단원별 정답률 | `ProblemAnswer` × `Problem.unitId` | **문항 합산** · **12문항 미만은 `reported` 에 안 넣고 `underSampled` 로 낸다** | 🔴 |
| | 난이도 4단별 정답률 | 〃 `Problem.difficulty` | 네 밴드가 전부 있고 **문항 0인 밴드만 `null`**(0% 가 아니다) | 🔴 |
| | 복습이 필요한 단원 | `AnalysisReport.recommendedUnits` | **리포트 0건 → `null`** · 리포트는 있는데 꼽힌 게 없으면 **빈 배열** | 🔴 |
| ③ 스스로 한 것 | 예습 영상 (완료/대상 · 평균 시청률) | `ConceptLecture`(게시) + `ConceptLectureView` | **대상 강의 0편 → `null`** · 대상이 있는데 안 봤으면 **0** | 🔴 강의 0편 |
| | 숙제 | **표가 없다** | 🔴 **언제나 `null`** — 타입이 `z.null()` 이다 | 🔴 |
| ④ 선생님 의견 | 자유 서술 | **칸이 없다** | 🔴 **언제나 `null`** — 태도는 숫자가 아니라 문장(23 §2.4 ②) | 🔴 |

**그리고 없는 것**: 🔴 **단일 «성취 지수» 칸이 없다.** 타입·계약·시안 어디에도 팩터를 합친 한 숫자가
없고, 「그런 칸이 없다」를 **시험이 잠근다**(`achievementFactors.test.ts` «단일 «성취 지수»를 만들지 않는다»).

### 1.2 브리프와 **달라진 것 둘** — 근거

1. 🔴 **`AnalysisReport.unitScores` 를 안 읽는다.** 브리프는 «`unitScores` 합산»이라 적었는데
   그 칸은 **정답률(0~100)만** 담는다 — 문항 수가 없다. 비율만으로는 «문항 합산»도
   «12문항 문턱»도 **구조적으로 불가능**하다(회차 평균밖에 못 낸다). 그래서 같은 채점에서 나온
   **문항 단위 기록**(`ProblemAnswer` × `Problem`)을 입력으로 받는다. `AnalysisReport` 에서 읽는
   것은 비율로 환원되지 않는 `recommendedUnits` 하나뿐이다.
2. **복습 단원의 «없으면 빈 배열»을 두 갈래로 갈랐다.** 브리프는 «없으면 빈 배열(≠ null)»이라
   적었다. 구현은 **«꼽힌 단원이 없다» = 빈 배열**로 그대로 지키되, **«분석 리포트가 아예 0건»
   = `null`** 로 따로 둔다. 둘을 같은 값으로 내면 「아직 안 재 봤다」가 「재 봤는데 없다」로 읽힌다 —
   이 트랙의 유일한 축과 정면으로 어긋난다. 리드가 뒤집을 거리면 §5.

### 1.3 «만점»은 어디에도 저장돼 있지 않았다

「몇 점 만점 중 몇 점」을 적으려면 만점이 필요한데(23 §2.3), `TestResult.score` 는 **받은 점수의
합**이고 `ProblemAnswer` 는 배점을 안 담는다. 그래서 만점은 시험지의 문항 배점에서 **다시 세는
수밖에 없다**(`maxScore.ts`). 규칙이 `gradeAnswers` 와 갈리면 「100점 만점에 120점」이 나오는데
두 파일은 서로를 안 본다 — 그래서 **채점기에 전부 정답을 먹여** 나온 합과 견주는 시험을 붙였다
(`achievementMaxScore.test.ts`). 실측으로 11 §10.1 의 자리도 그대로 재현된다(5문항 중 2개만
배점이 있으면 만점이 **67**이다 — 지어내지 않고 67을 그대로 낸다).

### 1.4 판정을 다시 적지 않았다

`applicableProgress`(반/개별 진도) · `pickProgressPlan`(어느 계획) · `resolveDailyPlan`(밀림) ·
`kstDateOf`(학원 날짜) · `addDays`·`diffDays`·`weekdayOf`(달력 셈)는 **전부 기존 한 곳을 빌려 쓴다.**
`period.ts` 는 달력 셈을 다시 적었다가 지우고 `daily/progressPlan.ts` 에서 가져와 **그대로 다시
내보내도록** 고쳤다 — 두 벌이 되면 한쪽만 고쳐도 아무도 안 운다.

> 🔴 **`resolveDailyPlan` 의 `driftDays` 는 «못 재는 경우»에도 0 을 낸다**(꺼진 계획 · 요일 없음 ·
> 시작 차시 목록 밖). 그 0을 그대로 내보내면 **계획이 없는 반이 「계획대로 가고 있다」로 읽힌다** —
> 지금 `progress_plan` 이 0행이라 **전원이** 그렇게 읽힌다. `collect.ts` 가 그 자리를 먼저 걸러
> `null` + 까닭으로 바꾼다. 변이 ①e·①f 가 양쪽을 다 문다.

### 1.5 API

```
GET /api/students/{id}/achievement?from=YYYY-MM-DD&to=YYYY-MM-DD&compare=none|previous|class
```

- 계약을 **먼저** 썼다(`achievement.contract.ts`, strict · 모든 팩터 `.nullable()`).
- 순서: 세션 401 → 경로 id 400 → **학생 404/403**(`requireOwnedStudent` 하나만 묻는다 — 라우트에서
  `isAdmin` 을 새로 읽지 않는다, D-130) → 질의 400(**기간 뒤집힘 포함**).
- 조회는 학생 한 명당 한 묶음. 단원 이름은 `in` 으로 한 번에 읽고, **계획이 있을 때만** 교육과정
  전량(735행)을 읽는다 — 밀림을 재려면 차례를 끝까지 걸어야 하기 때문이다. 계획이 0행인 지금은
  735행을 안 읽는다.
- 비교군 기본값은 **«미사용»**(`null`). 열어 둔 것은 ① 본인의 지난 같은 길이 기간 ② 같은 반 평균
  둘뿐이고, **표본 수를 반드시 같이 낸다**. 🔴 평균마다 **그 평균의 분모**(`sample`)를 따로 낸다 —
  「반 평균 60%」가 열 명 중 둘의 평균일 수 있다(20번 «평균 뒤에 최저가 있다»).
- **전국·석차는 없다** — 계약의 enum 에 자리 자체가 없어 `compare=nationwide` 는 400 이다.

---

## ② 시안 네 안 — **차이를 한 줄씩**

세 물음에 안마다 **다르게** 답한다. 화면 위쪽에 그 답이 한 줄로 적혀 있다.

| 안 | ㉠ 비어 있는 영역 | ㉡ 장수 | ㉢ 난이도 4단 | 한 줄 요약 |
|---|---|---|---|---|
| **A. 있는 것만** | **아예 안 그린다.** 맨 아래에 「담지 못한 것: …」 한 줄만 | **한 장** | **문장으로만** (그림 없음) | 지금 실데이터로 인쇄하면 **진도 한 덩어리**로 끝난다 — 가장 짧고 가장 거짓말이 적다 |
| **B. 네 칸을 늘 그린다** | 칸은 두고 **«아직 기록 없음» + 왜**를 점선 상자에 적는다 | **한 장** | **가로 막대 넷** + 「12문제 중 11문제」 | 원장님이 **무엇이 비었는지**를 매달 본다. 지금은 화면의 절반이 점선이다 |
| **C. 두 장** | 원장 화면엔 **적고**(«기록 없음 — `test_result` 0행»), 학부모 지면엔 **안 그린다** | **두 장** | **사다리 그림**(계단 넷) + 문장 | 「담는 깊이가 다르다」를 그대로 구현한 안. 좌우로 나란히 놓아 비교하게 했다 |
| **D. 문장 먼저** | 문장이 안 나오고, 맨 아래 **«아직 못 드리는 말씀»**에 사유와 함께 모은다 | **한 장** | **문장 + 작은 4칸 점수판** | 연구가 말한 «상세를 점수 밑에 둔다»(23 §2.3)를 그대로. 학부모가 첫 줄만 읽어도 뜻이 선다 |

**공통** — ⓐ 지금 실데이터 / ⓑ 채점·영상이 찬 뒤를 **단추 하나로 갈아 끼운다.** ⓑ 일 때는 화면
맨 위에 붉은 줄로 **«예시 데이터입니다 — 실제 기록이 아닙니다. ① 진도만 실제 기록이고 ②③④는
지어낸 값입니다»** 가 뜬다. ⓑ 만 보시면 「이미 되는 것」으로 읽히기 때문이다.

**실데이터**: 최근 4주(2026-08-24~2026-09-18) 진도가 **가장 두꺼운 학생을 세어서** 골랐다 —
**김하나**(초등M 초5 MS1A) **17행 · 15개 소단원 · 17차시**, 진도가 있는 학생 20/23명 중 1위
(2위 장현승 15행). id 를 손으로 박지 않았으므로 그 행이 사라져도 시안이 조용히 비지 않는다.
소단원 이름이 실제로 길어서(「2-4-1 (1보다 작은 소수)×(자연수)의 계산」) **줄바꿈이 두 줄씩 난다** —
지어낸 픽스처였으면 안 보였을 자리다(2026-08-19 교훈).

---

## ③ 캡처 — `scratch/report-wire/` (16장)

`wide`(1280) · `phone`(390) × `a-real`(ⓐ) · `b-example`(ⓑ) × `A`~`D`.

| 폭 | 상태 | A | B | C | D |
|---|---|---|---|---|---|
| wide | ⓐ 실데이터 | 1000px | 1297px | 1000px | 1000px |
| wide | ⓑ 예시 | 1107px | 1331px | 1139px | 1141px |
| phone | ⓐ 실데이터 | 1038px | 1647px | 1513px | 1149px |
| phone | ⓑ 예시 | 1521px | 1744px | 2149px | 1561px |

- **가로 스크롤 0** (네 안 × 두 폭 × 두 상태 전부) · **페이지 오류 0**.
- 찍는 스크립트: `scratch/shot-report-wire.mjs` (`npx next dev --port 3117` 뒤 `node scratch/shot-report-wire.mjs`).
- 실물 브라우저(Chromium)로 찍었고, `document.fonts.ready` 를 기다린 뒤 `fullPage` 로 받았다.

---

## ④ 시험 · 변이

### 4.1 관문

| 관문 | 결과 |
|---|---|
| `npx prisma generate` | ✅ (v6.19.3) |
| `tsc --noEmit` | ✅ **0** |
| 이 트랙 시험 5파일 | ✅ **88 passed** |
| `npm run lint` | ✅ 내 파일 **0건** (저장소 전체는 3 error · 55 warning — 전부 기존, `scripts/admin/bootstrap-admin.cjs` 의 `require()` 셋. 내가 고친 파일 **0개**) |
| `npm run lint:affordance` | ✅ (D-30) |
| `npm run build` | ✅ `Compiled successfully in 60s` — `ƒ /api/students/[id]/achievement` · `ƒ /dev/report-wire` 둘 다 잡혔다 |
| 실물 브라우저 캡처 | ✅ 16장 · 가로 스크롤 0 · 페이지 오류 0 |

### 4.2 시험 — **짝으로 건다**

| 시험 | 개수 | 무엇을 잠그나 |
|---|---|---|
| `achievementPeriod.test.ts` | 9 | 주 시작 = 월요일 · 🔴 **일요일 23:59(KST)와 월요일 00:00(KST)가 다른 주** · 직전 기간이 같은 길이 |
| `achievementFactors.test.ts` | 44 | **null↔0 네 쌍** · 표본 문턱 12(두 방향) · 결시 제외(회차·평균·문항 합산 셋 다) · **문항 합산 ≠ 회차 평균** · 재채점 중복 · 심화 세 갈래 접기 · 밴드 0 문항 · 복습 `null`↔`[]` · 비교군 분모 · **단일 지수 칸 부재** |
| `achievementSentences.test.ts` | 13 | 근거가 어중간하면 **말하지 않는다** · 사다리 순서 · 느낌표·이모지 없음(D-08) |
| `achievementMaxScore.test.ts` | 5 | **채점기(`gradeAnswers`)와 같은 값** — 전부 정답을 먹여 합을 견준다 |
| `achievement.test.ts` (API) | 17 | 계약 strict · 기간 뒤집힘 400 · **D-130 짝 시험**(403 ↔ 관리자 200) · 🔴 **②③④가 전부 `null`** |
| **합계** | **88** | |

### 4.3 변이 — **31/31 빨개짐** (원장: `docs/planning/tracks/reports/mutate-achievement.txt`)

| 무리 | 변이 | 결과 |
|---|---|---|
| ① null↔0 | 7 (진도 0행→0차시/빈배열 · 채점 0건→0점 · 강의 0편→0편완료 · 계획없음→0일 · 계획 못 폄→0일 · 리포트 0건→빈배열) | 🟥 7 |
| ② 표본 문턱 | 3 (문턱 1로 · 경계 한 칸 밀림 · 표본 부족 단원 숨기기) | 🟥 3 |
| ③ 결시 제외 | 2 (응시 회차에 섞기 · 평균에 0점으로 싣기) | 🟥 2 |
| ④ 주 경계 | 3 (일요일 시작 · UTC 로 읽기 · 직전 기간 길이 고정) | 🟥 3 |
| ⑤ 합산 방식 | 2 (평균이 회차 평균으로 · 단원이 첫 회차만) | 🟥 2 |
| ⑥ 재채점 중복 | 1 | 🟥 1 |
| ⑦ 난이도 밴드 | 2 (심화 갈래 증발 · 0 문항이 0%) | 🟥 2 |
| ⑧ 비교군 표본 | 3 (분모가 전원 · 표본 1로 굳음 · 기본값이 «미사용» 아님) | 🟥 3 |
| ⑨ 문장 | 3 (어중간한데 지어냄 · 못 잰 밀림을 «계획대로» · 사다리 거꾸로) | 🟥 3 |
| ⑩ 만점 | 2 (문항 0을 0점 만점으로 · 조정 배점 무시) | 🟥 2 |
| ⑪ 관문 | 3 (소유 범위 안 물음 · 뒤집힌 기간 통과 · strict 해제) | 🟥 3 |

**앵커 31개 전부 정확히 하나** · **변이한 파일 전부 원본과 바이트 일치** ✓

#### 🔴 1회차에서 둘이 안 물었다 — 그리고 까닭이 서로 달랐다

1. **⑧a 는 진짜 가드 구멍이었다.** 「값이 없는 학생이 **평균의 분모**에 들어가나」를 재는 시험이
   없었다. 두 학생 다 값이 있는 픽스처만 있어서 분모를 바꿔도 초록이었다 — **분모가 같은 표본만
   대면 분모 결함이 구조적으로 안 보인다**(20번 «「현행」이라는 분모가 정말 현행인지 검산하라»).
   시험을 더했고(값 없는 학생 하나를 섞는다) 이제 빨개진다.
2. **③b 는 «가드가 없다»가 아니라 «재는 자리가 틀렸다»였다.** 탐침을 본인 회차 쪽에 걸었는데
   그 길은 `scorePercentOf(taken)` 이라 **결시가 이미 빠진 뒤**다 — 그 함수 안의 `r.absent`
   갈래는 그 길에서 **죽은 줄**이다. 살아 있는 자리는 **비교군**(원본 회차를 그대로 넘긴다)이라
   탐침을 옮기고 시험을 더했다. 하네스가 «초록»이 아니라 **«산출물이 그대로»**라고 적어 준 덕에
   가드 부재와 안 갈렸다(2026-08-23 «도장은 초록을 못 낸다»의 그 자리).

### 4.4 🔴 전체 시험 — **실패가 있다. 전부 기존이다**

`npm run test`(562파일)는 빨간 채로 끝난다. **내 것은 하나도 없다.** 근거 셋:

1. **기존 파일 수정 0.** `git status` 가 처음부터 끝까지 `A`(새 파일)만 냈다 —
   `prisma/schema.prisma` · `src/mocks/prismaTestDouble.ts` · `src/lib/testResults/gradeAnswers.ts`
   를 포함해 **고친 기존 파일이 없다.**
2. **기존 코드 중 내 코드를 부르는 곳이 0.** `grep -rn "lib/achievement\|achievement.contract\|report-wire" src/ scripts/` 에서
   내 파일을 빼면 **결과가 비어 있다.** 새 파일은 아직 아무도 안 부른다.
3. **저장소 전수 감사 둘을 따로 돌려 이름을 확인했다** — 그 둘이 내 파일을 지목할 수 있는
   유일한 경로다:
   - `examWiringAudit` → `src/__tests__/api/unifiedBankFilters.test.ts:63 판단불가` (기존)
   - `solutionWiring` → `dev/bank-detail-hifi` · `dev/bank-detail-wire` · `components/unified/BankView.tsx` (기존)
   - `serverExternalPackages` 는 **따로 돌리면 통과한다**(전량 실행에서만 빨갛다)

실패한 시험 파일 목록은 §4.5. 그리고 러너가 «판정기 일부를 **못 쟀다**(울타리)»를 같이 찍었다 —
결함이 아니라 **이 회차가 «전부 깨끗»이 아니라는 표시**다(`scripts/qa/run-tests.mjs`).

### 4.5 실패한 시험 파일 — **목록은 완전하지 않다**

전량을 두 번 돌렸다. **둘 다 내 파일은 0건**이다. 그런데 **두 회차의 실패 집합이 서로 다르다** —
아래 목록을 «이 저장소의 확정 잔고»로 읽으면 안 된다.

| 회차 | 무엇 | 왜 목록이 반쪽인가 |
|---|---|---|
| 1회차 | 끝까지 돌았다(종료 코드 1) | 출력을 **마지막 40줄만** 잡아 둬서 그 앞이 잘렸다 — 보인 것은 14파일 |
| 2회차 | **전체 로그를 잡으려고 다시 돌렸는데, 시스템이 메모리 부족으로 그 배경 셸을 껐다** | 중간까지의 로그(2,097줄)만 남았다 |

**2회차가 중간까지 찍은 것**(17파일):

```
components/LoginForm.test.tsx          (31 tests | 2 failed)
components/Main.test.tsx               (0 test)      ← 🔴 «안 돈 파일»
components/MainRedirect.test.tsx       (0 test)      ← 🔴 «안 돈 파일»
components/PrintCheck.test.tsx         (10 tests | 1 failed)
components/StudioView.ai.test.tsx      ( 9 tests | 3 failed)
components/TeachingOverview.test.tsx   (10 tests | 1 failed)
unit/answerKeyOverflow.test.ts         (14 tests | 1 failed)
unit/elemTierBacksolveEligibility.test.ts (6 tests | 1 failed)
unit/elemTiersG4Line.test.ts           (26 tests | 1 failed)
unit/examWiringAudit.test.ts           (13 tests | 1 failed)
unit/figureComparison.test.ts          ( 2 tests | 1 failed)
unit/katexRender.test.ts               (23 tests | 1 failed)
unit/middleM1Geo3.test.ts             (106 tests | 1 failed)
unit/middleM2Quad.test.ts             (103 tests | 1 failed)
unit/middleM3Stat2.test.ts            ( 83 tests | 1 failed)
unit/renderParity.test.tsx             ( 7 tests | 1 failed)
unit/solutionWiring.test.ts            ( 6 tests | 1 failed)
```

1회차에만 있던 것: `elementaryEngine` · `elementaryFigure` · `elemStemSelfContained` · `elemTiersG5` ·
`middleM3Func` · `serverExternalPackages`.
2회차에만 있던 것: `LoginForm` · `Main`(0 test) · `MainRedirect`(0 test) · `PrintCheck` ·
`StudioView.ai` · `elemTierBacksolveEligibility` · `figureComparison` · `middleM2Quad` · `middleM1Geo3`.

🔴 **«0 test» 둘은 워커가 죽은 자국**이다(`run-tests.mjs` 머리말이 겨누는 바로 그 증상 —
2026-08-19). 이 기계는 오르카 다중 세션과 메모리를 나눠 쓰고, 실제로 2회차가 **메모리 부족으로
꺼졌다.** 그래서 이 목록에는 **진짜 잔고와 메모리 압박이 섞여 있다.**

> **리드에게** — 「기존 실패가 몇 개인가」는 **이 보고서로 답할 수 없다.** D-133 회차는 11 이라
> 적었고 여기서는 두 회차가 서로 다른 집합을 냈다. 한가한 기계에서 한 번 깨끗하게 재어
> 기준선을 다시 박는 것이 맞다. 🔴 **다만 「내 탓인가」는 §4.4 의 근거 셋으로 답이 난다 — 아니다.**

---

## ⑤ 리드가 정할 것

1. **«복습 단원»의 `null` 대 빈 배열** (§1.2 ②) — 브리프 글자대로 «늘 빈 배열»로 돌릴지, 지금처럼
   «리포트 0건이면 `null`»로 둘지. 나는 후자를 권한다(이 트랙의 축과 같은 결).
2. **만점 규칙을 어디에 둘지** — 지금 `maxScore.ts` 와 `gradeAnswers.ts` 에 **같은 규칙이 두 벌**이고,
   시험이 둘을 묶어 두었다(한쪽만 바뀌면 빨개진다). 트랙 1 이 병합된 **뒤** `gradeAnswers` 가
   `testMaxScore` 를 부르도록 합치는 게 맞다 — 지금 고치면 트랙 1 과 같은 파일에서 충돌한다.
3. **`TestResult.absent` 읽는 자리** — `load.ts` 의 `readAbsent`/`readScore` 는 칸이 **있으면 읽고
   없으면 «결시 아님»**으로 본다(짐작하지 않는다 — 0점은 진짜 0점일 수 있다). 트랙 1 이 병합되면
   **이 파일을 안 고쳐도** 진짜 값이 들어온다. 병합 뒤 그 두 줄을 스키마 타입으로 좁힐지는 리드 판단.
4. **API 를 화면에 언제 거나** — 지금 `/api/students/{id}/achievement` 를 부르는 화면은 **없다**
   (시안은 서버에서 순수 함수를 직접 부른다). 리포트 화면은 원장님이 Wire 를 고르신 뒤다(트랙 3).
5. **기간 기본값** — 시안은 «최근 4주»를 썼다(매쓰플랫 월 1회 + 주간 집계, 23 §2.1). 제품의 기본
   주기는 원장님 Q3 확정 뒤에 정한다.
6. **`/dev/report-wire` 는 원장 전용으로 열려 있다**(`devPageVisible({ directorOnly: true })`) —
   `/dev/retry-wire` 와 같은 규약이라 production 에서도 로그인한 원장님께 보인다.

---

## ⑥ 🔴 원장님께 여쭐 것 — **시안 위에서 다시**

> 먼저 봐 주실 것: **`/dev/report-wire`** 에서 ⓐ/ⓑ 를 갈아 끼우며 A~D 를 눌러 보시는 것입니다.
> (또는 `scratch/report-wire/` 의 그림 16장.)

| Q | 물음 | 시안 위에서는 이렇게 보입니다 |
|---|---|---|
| **Q0 (D-07)** | **A·B·C·D 중 어느 구조로 갈까요?** 네 안이 다른 것은 셋입니다 — 빈 영역을 어떻게 다루나 · 한 장인가 두 장인가 · 난이도 4단을 그림으로 말하나 문장으로 말하나 | 고르신 구조 위에 **Hi-fi 4~5안**(색·글꼴·형태)을 올려 다시 보여 드립니다 (05 §0-3) |
| **Q1** | **숙제·태도를 어떻게 기록하시겠습니까?** 지금은 **표가 없어** 새로 입력해야 합니다. 제품 목표가 «매일 30분 수작업 제거»인데 여기서 수작업을 **더하는** 자리입니다 | B안에서 «숙제 — 아직 기록이 없습니다» 점선 칸이 그 자리입니다. 안 만들면 그 칸은 영영 점선입니다 |
| **Q2** | **학부모에게 어떻게 갑니까?** 학부모 계정도 문자 발송 계약도 없습니다 | C안의 오른쪽(학부모 지면)이 «종이로 드린다»를 전제한 모양입니다. 앱/문자면 모양이 달라집니다 |
| **Q3** | **주기는?** (시험마다 / 주간 / 월간) | 시안은 **최근 4주**로 세웠습니다. 주간이면 한 회차 표본이 얇아 ② 영역이 대부분 «표본 부족»으로 나옵니다 |
| **Q4** | **«종합 점수» 하나를 원하십니까?** | 조사·연구 근거로는 **만들지 말자**는 쪽이고(23 §2.4), 코드에도 그 칸을 **일부러 안 뒀습니다**. 원하시면 가중치를 원장님이 정해 주셔야 합니다 |
| **Q5 (새로 생긴 것)** | **«아직 기록 없음»을 학부모에게 보여 드릴까요?** B안은 보여 주고(«무엇이 비었는지»가 보인다), A·C·D 는 학부모 쪽에서 감춥니다 | 지금 실데이터로는 **화면의 절반이 점선**입니다. 이것이 정직함인지 부실함인지는 원장님 판단입니다 |

> **그리고 사실 하나** — 지금 이 리포트가 담을 수 있는 숫자는 **진도 하나**입니다.
> 나머지 셋은 트랙 1(채점 입력)이 끝나고 원장님이 채점을 넣기 시작하셔야, 그리고 «오늘의 개념»
> 강의가 올라가야 찹니다. **먼저 고르시고 나중에 차는** 순서입니다.
