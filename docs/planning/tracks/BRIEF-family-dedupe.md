# [오늘의수학] 한 시험지에 **같은 문항류는 1개만** — 출제 선택 규칙

> 🔴 **이것은 재개 브리프다.** 2026-08-26 10:33 에 시작한 codex 세션이 10:4x 경
> 죽었다(컴퓨터/CLI 종료). **커밋도 미추적 파일도 하나도 안 남았다** — 스크롤백에만
> 있던 것은 통째로 사라졌다. 아래 「이미 끝난 것」만 건져 뒀다.
>
> ⚠️ **한 단위를 끝낼 때마다 파일 하나를 써라.** 채팅에만 적으면 창이 닫힐 때
> 같이 사라진다(CLAUDE.md 2026-08-21 항목). 조사 중간 산출물도 파일로 남기고,
> **새로 만든 파일은 만들자마자 커밋해라**(미커밋 새 파일은 되돌릴 자리가 없다).

## 먼저 읽을 것
- `CLAUDE.md` (절대 규칙 + Lessons Learned) — **반드시 먼저**
- `docs/planning/07-coding-convention.md` 의 **D-105**(문항 코드 2세대·`family_key`) · **D-22** · **D-20** · **D-101**

## 원장님 지시 (2026-08-26)
「같은 문제류는 1개만 출제되도록 해」 → 뒤이어 「**다른 문항류를 더 생성하면 됨. 걱정마 일단.**」

**무엇을 보고 하신 말인가**: 초6 「2-6-4 구 알아보기」 일일테스트 8문항에서
문1 「반지름이 16cm 인 구를 중심을 지나게 잘랐습니다 …」
문2 「반지름이  6cm 인 구를 중심을 지나게 잘랐습니다 …」
가 **숫자만 다른 같은 문항**으로 나란히 나왔다.

## 열쇠는 이미 있다 — 새로 만들지 마라
D-105 가 **`problem.family_key`** 를 만들어 뒀다. 엔진이 자기 유형 정체를 적는다:
  중등 `mid:3-1|근호를 포함한 식의 계산|06` · 초등 `elem:초6|2-5-1 원주와 원주율 알아보기|연산`
키가 없으면(사람이 넣은 것·AI 변형) `solo:<uuid>` 라 **혼자 한 무리**다.
그래서 기출·자작은 이 규칙에 과하게 걸리지 않는다 — **그 사실을 건수로 확인하라.**

---

## 이미 끝난 것 (다시 하지 마라)

### ⑴ 선택·배치 코드 조사 — **완료, 회수됨**
`docs/planning/tracks/family-dedupe-code-audit-recovered.md`

죽은 자식 세션(`family-dedupe-code-audit`)이 읽기 전용 조사를 끝냈는데 터미널에만
답했다. codex 세션 로그에서 되살려 파일로 박아 뒀다. 요지:

- `composePaper` 라는 함수는 **없다**. 일반 출제는 `selectProblems` 계열,
  예측 출제는 `composePredictedPaper` 계열이다.
- `family_key` 중복 금지는 **조회 자격**(`findEligibleProblems` 의 `WHERE`)이 아니라
  **시험지 한 장을 구성하는 경계** — `selectProblems`/`balanceDifficulty` 와
  `composePredictedPaper` — 에서 걸어야 한다.
- 호출 흐름: `POST /api/tests/generate` → `generateDraftTest` → `resolveRange` →
  `findEligibleProblems` + `loadRecentProblemIds` → `selectProblems`
  (최근 제외 → `seededShuffle` → `balanceDifficulty` → `arrangeByType`(같은 유형 3연속 회피)
  → `avoidTightFirstSeats`) → 정원 미달이면 `INSUFFICIENT_PROBLEMS`.
- 교체 경로: `PUT /api/tests/{id}/problems/{seq}` → `replaceTestProblemAtSeq`.

⚠️ **이 문서는 검증되지 않았다.** 인용된 파일·함수·줄을 **직접 열어 확인**하고 나서 써라.
   (이 저장소가 여러 번 적은 자리다 — 물려받은 근거는 검산한다.)

### 이미 확인된 출제 자격 (db-audit 이 코드에서 읽어 낸 것)
`pool='shared' AND review_status='approved' AND direct_use_allowed=true AND answer <> '(정답 없음)'`
소유자 조건은 **D-101 로 완전히 제거**되어 `user_id` 를 보지 않는다.
D-20 은 상태와 무관하게 해당 원장 계정의 `test_date` 가 **기준일 포함 14일 전 ~ 기준일**인
모든 시험지의 `test_problem.problem_id` 를 제외한다.

---

## 할 일

### ⑵ 분모부터 세라 — **아직 안 됨. 여기서 시작해라.**
(자식 세션 `family-dedupe-db-audit` 이 SQL 을 시작하자마자 죽었다. 산출물 없다.)

공유 DB 에 **SELECT 만** 하고:
- 소단원별 **distinct `family_key` 갈래 수** — 분모는 위 출제 자격으로 좁힌다.
  🔴 격리된 것·그림 유실로 잠긴 것을 같이 세면 **있지도 않은 갈래**를 세게 된다.
- `family_key` NULL/빈 값 처리와 `solo:<uuid>` 비율, `source` 별 건수
  (기출·자작이 과하게 묶이지 않는지)
- 반별 `defaultProblemCount` 분포
- **부족분 = 정원 − 갈래 수**, 부족분 큰 순으로 정렬
- D-20(최근 14일)까지 걸었을 때의 remaining distinct `family_key` 도 같이

### ⑶ 이 표의 용도 — **규칙을 약하게 할 근거가 아니다**
원장님이 갈래 셋(㉠적게 낸다 ㉡중복 허용 ㉢범위 확대) 시안을 **취소**하셨다.
이 표는 **「어느 소단원에 문항류를 더 만들어야 하나」의 엔진 확충 우선순위 목록**이다.

### ⑷ 규칙은 절대다
한 시험지에 같은 `family_key` 는 **1개**. 예외 없다.

### ⑸ 모자라면 «조용히 채우지 말고 드러내라»
정원 8인데 갈래가 5뿐이면 **5문항만 내고**, 화면이
「이 소단원은 문항류가 5갈래뿐이라 5문항만 냈다」고 **말한다.**
말 없이 8개를 채우면 원장님은 규칙이 도는 줄 아시게 되고, 그러면
**어느 소단원에 문항류를 더 만들어야 하는지 영영 모른다.** 이게 이번 작업의 진짜 값어치다.

### ⑹ 구현 + 시험
선택 로직을 **순수 함수**로 빼고, 「같은 `family_key` 가 둘 이상이면 빨개지는」 시험을 써라.
⚠️ 변이 판정 순서: ㉠ 파일이 바뀌었나(md5) ㉡ **산출물/동작이 바뀌었나**
   ㉢ 그제서야 시험이 빨개지나. ㉡ 를 건너뛰면 멀쩡한 가드를 의심하게 된다.

---

## 하지 말 것
- **DB 쓰기 금지** (D-22·D-31). `ALLOW_SHARED_IMPORT` 금지. `SELECT` 만.
- **main 병합·푸시 금지.** 이 브랜치에 커밋까지만.
- **훅 우회 금지**(`--no-verify`). 커밋 전 `npm run lint` 를 직접 돌려라.
- **자식 워크트리를 새로 파지 마라.** 지난번에 둘을 팠는데 **셋 다 같이 죽었고**
  그중 하나는 답을 터미널에만 남겨 사라질 뻔했다. 이번엔 혼자 하고, 단계마다 파일로 남겨라.
- **다른 워크트리와 겹치지 마라**:
  · `BIGSHOL/problem-type-criteria` (codex) — **완료**(`0d7f0b9c`). `problemType` 판정 기준 조사.
    → `problemType` 관련 로직은 건드리지 마라.
  · `BIGSHOL/_probe_agent_id` (Gemini) — 화면·지면의 **라벨과 문항 번호 표기**. 진행 중.
    → 너는 **표기를 건드리지 마라.**
  · `main` — 원장님 확정으로 **반 클릭 선택 UI** 작업 중. `src/components/main/*` 건드리지 마라.

## 산출물
1. `docs/planning/tracks/family-dedupe-20260826.md`
   - 한 줄 결론 → **분모(갈래 수 분포)** → 부족분 큰 순 목록(= 엔진 확충 우선순위)
   - **이 조사가 못 보는 것**을 한 절로
   - 끝에 **원장님께 여쭐 것**
2. 구현 + 시험 (⑵ 가 끝나고 나서)
