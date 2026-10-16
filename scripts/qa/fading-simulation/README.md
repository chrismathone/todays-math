# «오늘의 기억»(학생 SRS) 35일 시뮬레이션

학년(초3 ~ 중3 · 은행의 개념 2,040) × 학생 유형 넷(성실 · 불규칙 · 자주 틀림 · 쉬었다 복귀)마다 35일을 돌려,
하루 학습량 · 밀림 · 1분 / 5분 추가 확인(재학습) 수 · 추정 시간을 숫자로 낸다. 학생 · 학부모 · 원장 · 강사의 눈으로
«견딜 수 있는 양인가»를 판단할 재료다 — 판단은 하지 않는다.

```
npx tsx scripts/qa/fading-simulation/run.ts                      # 카드 풀이(운영 기본) → results.json · summary.md
npx tsx scripts/qa/fading-simulation/run.ts --chips              # 칩 풀이 → results-chips.json · summary-chips.md
npx tsx scripts/qa/fading-simulation/run.ts --rating-good        # 2 · 3단계에서 틀려도 «알맞음» → results-rating-good.*
npx tsx scripts/qa/fading-simulation/run.ts --accuracy-plus=0.1  # 네 유형의 정확도 +10%p → results-accuracy-plus-0.1.*
npx tsx scripts/qa/fading-simulation/run.ts --grade=중2 --persona=성실   # 하나만(파일을 쓰지 않는다)
npx tsx scripts/qa/fading-simulation/run.ts --rule=base,d2,d1,d1d2 --seeds=5   # 규칙 견주기 → results-compare.json · summary-compare.md
npx tsx scripts/qa/fading-simulation/run.ts --rule=base --seeds=5 --path=home  # 홈 대기열을 따라가는 학생 → *-compare-home.*
npx tsx scripts/qa/fading-simulation/run.ts --path=home --home-unit=concepts    # 홈의 옛 단위(개념 20개)를 강제 → *-compare-home-concepts.*
```

### 규칙 견주기(`--rule` · `--seeds` · `--path` · `--home-unit` · `--tag`)

원장님이 승인한 SRS 결정(2026-10-16)을 **같은 씨앗 묶음**으로 견준다. 규칙은 쉼표로 여럿을 준다(`base` · `d1` · `d2` · `d1d2`).
씨앗 0 은 옛 씨앗(«학년|유형|방식») 그대로라 `--rule=base --seeds=1` 은 `summary.md` 와 같은 수를 낸다. 결과는 요약만 남긴다(날마다의 기록 없음).

- 🔴 **제품 코드에 모의용 손잡이를 넣지 않는다.** 결정 2(첫 평가의 `exposed` 는 5분 확인 한 번)는 평가 직후 **방금 든 `exposed` 줄**을 그 규칙이 쓰는 꼴로
  맞춘다(`stage` · `dueAt` 둘만 다르다). 결정 1(4단계 부분 틀림에 «어려움»)은 학생의 고르기다 — 제품이 허용할 때 `d1` 학생은 «어려움», 아니면 «다시»
  (부분 틀림에 «다시»는 옛 규칙과 같은 전이다). 제품이 «어려움»을 허용하지 않는 판에서는 `d1` 이 `base` 와 같다.
- `--path=home` — 탐험의 계획 대신 `/learn/fading` 홈의 목록(복습일 된 것 + 골라 둔 것)을 차례로 연다. 목록이 비면 새 개념을 연다 —
  오늘 닫은 명제에 그 묶음을 더해도 분량(20)을 넘지 않을 때만(모형의 규칙 · 두 길이 같은 새 진도 속도를 갖게).
- `--home-unit=concepts` — 홈의 옛 단위(개념 20개)를 강제한다(`fadingSummary` 를 명제 비용 없이 부른다). 주지 않으면 제품이 내는 그대로.
- `--tag=이름` — 결과 파일 이름 끝에 붙인다(판을 바꿔 가며 남길 때).

28조합에 15초쯤. 씨앗은 «학년|유형|방식»에서 정하므로 같은 입력이면 같은 결과다.

## 무엇이 제품이고 무엇이 모형인가

- **제품 함수 그대로**(규칙을 다시 짓지 않는다): 개념 짓기 `buildFadingConcepts` + 묶음 표(`catalog.ts` 와 같은 재료 — 그 파일은 `server-only` 라 못 부른다),
  서버 없이 도는 원천 `createLocalFadingSource` · `createLocalFadingRelearnSource`(시계 주입), 행동 전이 `applyFadingAction`(`open · read · step · miss · give-up-card · rate`),
  화면 쪽 상태 기계 `session.ts`(`placeAnswer · giveUpStep · giveUpCard · allowedRatings`), 오늘 계획 `buildFadingDailyPlan`(`dailyPlan()` · 분량 20칸),
  추가 확인 `relearn.ts`(증거 → 1분 → 5분 → 종료), FSRS-5 일정.
- **모형**(`run.ts` 맨 위 `MODEL` · `PERSONAS`): 초 단위 시간 상수 · 빈칸마다 독립인 정확도 · 두 번 틀리면 «아직 모르겠어요» · 평가 고르기 규칙 ·
  추가 확인은 풀이 중 경계마다 하나, 홈에서는 한 바퀴, 계획 뒤 6분까지 기다림 · 새 개념은 은행 차례의 «아직 고르지 않은 개념이 남은 첫 소단원»에서.
- **없는 것**: 탐험의 문제 덩이 · 선수 개념 안내(학생 기록 DB 에서 오는 재료) · «오늘 전부» · «쉬움» · 하루 두 번 열기. 홈 대기열 경로는 `--path=home` 으로 돈다.

🔴 공유 DB · `/api/**` 를 부르지 않는다. 학생 기록은 메모리뿐이다.

## 결과 파일

- `results.json` — 모형 상수 · 학년별 개념 수 · 조합마다 날 35개의 기록(`DayRecord`)과 요약(`RunSummary`).
- `summary.md` — 학년(행) × 유형(열) 표 · 중2 네 유형의 날마다 흐름 · 코드에서 읽은 계획 규칙(파일:줄) · 눈에 띄는 것 · 못 쟀다.
- 화면 증거(Playwright · 390×844 · 저장소 밖 작업 폴더 `sim-shots/`): `/dev/fading` 의 홈(첫날 · 평소 · 밀림) · 2단계 · 3단계 · 4단계 카드 · 대조 ·
  `/dev/explorer-srs` 의 4단계 틀림 → 추가 확인 창 → 대조. `/dev/fading` 에는 재학습 제어기가 없어(`FadingDevClient` 가 `relearn` 을 안 넘긴다)
  추가 확인 창은 `/dev/explorer-srs`(`window.__EXPLORER_SRS_PREVIEW__.advance`)에서 찍었다.

## 읽을 때

- 분(minutes)은 **가정한 상수의 합**이다. 상수를 바꾸면 비례해 움직인다 — 비교에는 쓰되 절대값으로 읽지 않는다.
- «빈칸마다 독립 정확도»는 4단계(빈칸 전부)를 한 번도 안 틀릴 확률을 `정확도^빈칸 수`로 만든다. 중등은 묶음당 빈칸이 9 ~ 10개라
  85% 학생도 4단계를 깨끗이 마치는 날이 20%쯤이다 — «다시» 비율과 새 개념 진도의 대부분이 여기서 나온다. `--accuracy-plus` 로 민감도를 본다.
