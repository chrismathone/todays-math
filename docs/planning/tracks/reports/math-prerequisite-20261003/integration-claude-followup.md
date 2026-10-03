# 연결 검토 후속 — Claude · 막는 것 셋의 확인과 회귀 시험

2026-10-03 · 앞 검토: [integration-claude-review.md](./integration-claude-review.md)(`e72d2e54f`).

## 1. 고친 것의 확인 (읽기 — 루트 작업 트리, 커밋 전)

| # | 앞 검토의 막는 것 | 지금 | 판단 |
|---|---|---|---|
| B1 | `display.ts` 가 없는 `./graph` 를 부름 · 버전을 모듈 적재 때 parse | `graph.ts` 가 Codex 커밋 `5eed42365`(병합 `f374ad360`)로 들어왔다. `display.ts` 는 `displayVersions()` 를 부를 때 만든다 | **풀림** |
| B2 | 켜짐이면 계획이 꺼진 **모든** 열린 초등 미션이 멈춤 | `expedition.ts:593-598` 의 조건에 `pilotTargetForCourse(course) &&` 가 더해졌다. 시범 밖은 기존 대체 가지로 간다 | **풀림** — 시범 학생은 계획이 꺼지면 새 세션을 내지 않는다(계획 §7 ②) |
| B3 | 공급 부족 시작이 «모두 마쳤어요»로 거절됨 | `startExpedition` 이 `prerequisiteContext.kind === "unavailable"` 이면 그 사유로 던진다 | **풀림** |
| S1 | DTO 와 시작의 결정 함수가 다름 | 미션 밖 DTO 가 `expeditionInitialPrerequisiteDecision(state, nextPlan, now)` 를 부른다 — 시작과 같은 함수(`expedition.ts:436-439`, 정의 `:639`) | **풀림** |

남는 관찰(막지 않음):

- `graph.ts:177` 은 모듈을 불러올 때 100단원 그래프를 검증한다. 커밋된 JSON 이 검증을 통과하는 동안은 문제가 없지만, 그래프가 바뀌어 검증이 실패하면 `display.ts` 를 거쳐 탐험 · 코스 경로 전체가 꺼짐 상태에서도 불러오기에 실패한다. 버전처럼 부를 때 검증하면 피해 범위가 그래프 조회로 줄어든다.
- 시범 학생의 열린 미션은 교사가 계획을 끄면 다시 켤 때까지 열린 채 멈춘다. 열린 초등 미션은 개념 활동 · 보충 카드도 막는다(`updateExpedition` 가드). 회귀 시험 2 가 이 동작을 고정한다 — 의도된 것이라면 교사 화면에 «계획이 꺼져 미션이 멈춤»을 보이는 것이 Hi-fi 의 일이다.
- 앞 검토의 S2(요청당 결정 반복 계산) · S3(교사용 회복 안내 문장) · S4(공급 부족 때 상태 `ready`) · S5 · S6 은 그대로다.

## 2. 회귀 시험 — `src/__tests__/unit/mathPrerequisiteRegressions.test.ts`

실제 엔진 문항과 루트 픽스처(`failedTargetCourse` · `finishPrerequisiteFixture` · `fixtureSession`)를 쓴다. 공급 부족만은 실제 엔진으로 만들 수 없어 공급 모듈을 한 겹 감싸고, 그 시험 안에서만 «20후보 모두 실패»를 돌려준다.

| 묶음 | 시험 | 지키는 것 |
|---|---|---|
| B2 | 켜짐 · 시범 밖(`5-2-2-3`) · 첫 세션 뒤 교사가 계획을 끔 | 추천이 꺼짐일 때와 같은 기존 대체 가지(현재 소단원 `review`) · 그 세션이 가드를 지남 · 끝내면 미션 `complete`(10/10) |
| B2 | 켜짐 · 시범 목표(`5-2-2-1`) · 같은 상황 | 탐험 · 코스 추천 모두 `null` · 코스 시작이 상태를 안 바꿈 · 미션은 `active` 5/10 · 오늘 완료 아님 · 꺼짐이면 기존 대체 가지 |
| B3 | 미션 전 공급 부족 | 결정 `unavailable` · DTO `canStart` 거짓 · `completedToday` 거짓 · 문맥 사유 = 공급 부족 · 시작은 `SrsConflict` 로 그 사유(«모두 마쳤어요» 아님) · 코스 요약 상태가 `done`/`complete` 아님 |
| B3 | 미션 중 확인을 끝낸 뒤 목표 공급 부족 | 추천 `null` · DTO 시작 불가와 사유 · 미션 미완료 |
| S1 | 발동 · 복귀 대기 · 공급 부족 · 시범 목표 발동 없음 · 시범 밖 | DTO `canStart` ⇔ 실제 시작 성공 · 거절이면 DTO 사유와 같은 메시지 · 시작했으면 DTO 가 보인 범위 · 모드로 세션이 열림 |

## 3. 실행

루트 커밋 `5a178c108` 을 이 가지에 병합한 뒤(`e1bbdecf1`) 돌렸다.

| 무엇 | 결과 |
|---|---|
| `mathPrerequisiteRegressions.test.ts` | 9 통과 |
| 변이 — B2 고침을 되돌림(`pilotTargetForCourse` 조건 빼기) | 1 실패(시범 밖 미션 시험) |
| 변이 — B3 고침을 되돌림(공급 부족 사유 대신 «모두 마쳤어요») | 2 실패(B3 미션 전 · S1 공급 부족) |
| 집중 회귀 16파일 — 선수 모듈 일곱(그래프 · CLI · 근거 · 매핑 · 정책 · 공급 · 공급 관문) · 루트 연결 · 이 파일 · `mathSrsElementaryCourse` · `mathSrsCourseServer` · `mathExpeditionJourney` · `mathExpeditionRecordCompat` · `mathSrsCourseRoutes` · `mathExplorersRoutes` · `mathSrsTeacherBranchScope` | 276 통과 |

변이 둘은 이 워크트리의 사본에서만 하고 바이트 그대로 되돌렸다(`git status` 깨끗). 커밋하지 않았다.

처음 돌렸을 때 넷이 빨갰고 S1 다섯은 **헛통과**였다. 개념 카드를 안 모은 탐험 기록이면 그날이 개념 날(explorers)이라 초등 은행 경로를 안 지났다. 루트 시험처럼 g5-fractions 카드를 모아 두고, S1 마다 «그날이 초등 은행 날 · 기대한 문맥이 실제로 나옴»을 먼저 단정하게 고쳤다.

병합한 이 워크트리에서 프로젝트 전체 `tsc --noEmit` 오류 0, 새 시험 파일 eslint 깨끗. 전체 시험 · 빌드 · 브라우저 관문은 이 일에서 돌리지 않았다. 루트가 알린 «집중 110 통과»는 루트의 실행이다.
