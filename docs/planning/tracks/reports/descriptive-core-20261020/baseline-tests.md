서술형 부모 전체 회귀 — 실제 HEAD 독립 재현 (2026-10-20)

지정한 네 파일과 추가 21파일의 실패를 **깨끗한 부모 HEAD b553ad38f84e0b5fdec98359b2309ee855d2a657에서 재현**했다. 누적 **25파일·376시험 중 120실패·256통과**이며, 선택한 모든 파일에서 부모 전체 로그와 실패 개수 및 실패 시험 제목의 다중집합이 일치한다. 부모 전체 회귀의 26실패 파일·121실패 중 부모 작업이 수정 후 별도 검사한 decisionLogNumbers 1개를 뺀 나머지 전부에 해당한다.

최초 필수 4파일은 80시험 중 6실패, 다음 15파일은 232시험 중 108실패, 마지막 6파일은 64시험 중 6실패다. mixedFractionScreens의 1실패는 양쪽 모두 20초 시간 초과다. 이를 일반 단언 실패와 구분해 기록하며 부하 또는 코드 중 어느 원인인지는 이번 재현만으로 단정하지 않는다.

이는 해당 실패들이 서술형 미커밋 patch 없이도 존재함을 입증한다. 전체 저장소가 초록이라는 뜻이나, 이후 부모 변경까지 검증했다는 뜻은 아니다.

실행 근거

- 작업 위치: /Users/pss/orca/workspaces/today_/desc-gates-review
- 시험 중 실제 HEAD: b553ad38f84e0b5fdec98359b2309ee855d2a657, detached (`git branch --show-current` 빈 문자열).
- 시작 상태: BIGSHOL/desc-gates-review / ed17a8acbfa15712888e681f5cb561ab5560bfe5 / git status 빈 문자열 / node_modules 없음.
- node_modules는 임시로 부모 /Users/pss/Desktop/creative/today-desc-core/node_modules를 링크. 실제 대상은 /Users/pss/Desktop/creative/today_/node_modules.
- Node v24.22.0, npm 11.19.1, Vitest 4.1.11. 저장소의 기존 npm test 래퍼·vitest.config.mts·vitest.setup.ts를 그대로 사용했다.
- 코드·테스트·설정 변경 없음. 첫 4파일 및 추가 11파일 실행: 15:56:53~15:57:11 KST. 추가 렌더 4파일: 2026-10-20T15:58:10.331769+09:00~2026-10-20T15:58:14.323612+09:00.
- 네 실행 모두 정상적으로 시험 결과를 출력하고 종료 코드 1을 반환. 워커 결과 누락으로 간주하거나 종료 코드를 숨기지 않았다.
- 실제 DB를 쓰지 않았다. 기존 전역 setup의 @/lib/db 인메모리 Prisma 대역 및 MSW가 사용되며, examStudyIntegration/Completion은 DB 접근 시 예외를 던지는 자체 mock도 갖는다. Unsupported raw SQL 메시지는 **실제 DB 오류가 아니라 인메모리 대역의 거부**다.

파일별 비교 (실패/전체)

| 파일 | 부모 로그 | clean HEAD | 실패 시험 제목 |
|---|---:|---:|---|
| `unit/examWiringAudit.test.ts` | 1/13 | 1/13 | 일치 |
| `unit/noRmSync.test.ts` | 1/1 | 1/1 | 일치 |
| `unit/exportPerMenu.test.ts` | 3/59 | 3/59 | 일치 |
| `unit/examStudyIntegration.test.ts` | 1/7 | 1/7 | 일치 |
| `unit/proxyStudentGate.test.ts` | 2/14 | 2/14 | 일치 |
| `unit/examStudyCompletion.test.ts` | 26/29 | 26/29 | 일치 |
| `api/basket.test.ts` | 26/33 | 26/33 | 일치 |
| `api/adminSeesAll.test.ts` | 5/46 | 5/46 | 일치 |
| `api/autoDraftCron.test.ts` | 10/21 | 10/21 | 일치 |
| `api/autoDraftRunLink.test.ts` | 6/7 | 6/7 | 일치 |
| `api/test.test.ts` | 6/22 | 6/22 | 일치 |
| `api/defaultReviewRange.test.ts` | 1/6 | 1/6 | 일치 |
| `api/questionBasket.test.ts` | 4/5 | 4/5 | 일치 |
| `unit/examStudyRoutes.test.ts` | 9/22 | 9/22 | 일치 |
| `api/questionDaily.test.ts` | 1/3 | 1/3 | 일치 |
| `components/JeongtongHeader.test.tsx` | 1/1 | 1/1 | 일치 |
| `components/ProblemSourceReference.test.tsx` | 3/6 | 3/6 | 일치 |
| `components/mathgenTemplates.test.tsx` | 3/12 | 3/12 | 일치 |
| `components/perProblemFractionView.test.tsx` | 5/5 | 5/5 | 일치 |
| `components/mixedFractionScreens.test.tsx` | 1/9 | 1/9 | 일치 |
| `unit/arithmeticV2Geometry.test.ts` | 1/12 | 1/12 | 일치 |
| `unit/bankDecideMiddleLoader.test.ts` | 1/2 | 1/2 | 일치 |
| `unit/mathSrsQuickFence.test.ts` | 1/8 | 1/8 | 일치 |
| `unit/planDailyReview.test.ts` | 1/22 | 1/22 | 일치 |
| `unit/problemOrder.test.ts` | 1/11 | 1/11 | 일치 |

필수 4파일에서 확인한 구체적 실패

1. examWiringAudit: 13개 중 1개. 다음 4곳이 「판단불가」로 검출되어 빈 목록 기대값과 불일치했다: questionBankProjection.test.ts:39, unifiedBankPickerDemand.test.ts:70, helpers/builderSpeedFixture.ts:26, scripts/import/verified-engine-batch.ts:808.
2. noRmSync: 1개 중 1개. clean HEAD에서도 rmSync 호출 7곳이 존재한다. nativeDescriptive20261018.test.ts:381, questionIdentityDdl.test.ts:901, verifiedEngineBatch.test.ts:63, scripts/qa/bank/maintenance-approval.test.ts:53·150, math-question-reinforcement.test.ts:79, question-backfill-scale.ts:238. 이번 검토가 만든 호출이 아니다.
3. exportPerMenu: 59개 중 3개. `/api/exam/practice/resolve` POST 및 `/api/exam/practice` GET/POST에서 textbook 메뉴에 대한 허용 기대 true가 실제 false와 다르다.
4. examStudyIntegration: 7개 중 1개. 인증 API → 실제 수학 → Python SVG 시험이 첫 응답의 200 기대에서 실제 403으로 실패한다. 이 회차의 실패 지점은 SVG 실행 이후가 아니다.

추가 실패의 대표 근거

- examStudyCompletion 및 examStudyRoutes: 승인/출력 메뉴 fixture에서 기대한 200·400 대신 403, 뒤 응답 데이터 접근도 실패.
- basket·questionBasket·test·autoDraftRunLink 등: `SELECT id FROM public.problem WHERE id IN (...) ORDER BY id FOR SHARE`를 prismaTestDouble이 지원하지 않아 예외. 관련 생성 경로의 500/생성 수 0 등은 로그에 함께 나타난다. 모든 파생 실패의 원인을 별도로 수정·증명한 것은 아니다.
- proxyStudentGate: 통과 경로 목록이 144→150, 89→95로 달라진다. 차이에 `/api/integrations/eywa/v2/branch-menus`의 메서드들이 포함된다.
- JeongtongHeader: null.textContent 접근. mathgenTemplates: workbook/jaseup/yuhyung 출력에서 「검증 학교」 누락. ProblemSourceReference 및 perProblemFractionView: 기대한 출처 문구 또는 「문제 상세」 버튼을 찾지 못함.

로그와 재현 자료

- 통합 로그: /tmp/desc-baseline-test-review.log
- 필수 4파일 원본 로그: /tmp/desc-baseline-test-review/required-four.log
- 추가 11파일 원본 로그: /tmp/desc-baseline-test-review/additional-failures.log
- 추가 렌더 4파일 원본 로그: /tmp/desc-baseline-test-review/additional-render.log
- 마지막 6파일 로그: /tmp/desc-baseline-test-review/final-six.log
- 최종 부모 비교 스냅샷: /tmp/desc-baseline-test-review/parent-log-final-six.txt
- 초기 비교 스냅샷도 parent-log-render-cutoff.txt에 보존
- 파일별 개수·실패 제목 비교: /tmp/desc-baseline-test-review/comparison.json
- HEAD/브랜치/명령/시간/종료 코드/복구 증거: /tmp/desc-baseline-test-review/initial-state.json, detached-state.json, runs.json

실행 명령은 다음과 같다. 실행 시 cwd는 위 Orca 작업트리이고 HEAD는 지정한 detached commit이었다.

```sh
npm test -- --maxWorkers=4 src/__tests__/unit/examWiringAudit.test.ts src/__tests__/unit/noRmSync.test.ts src/__tests__/unit/exportPerMenu.test.ts src/__tests__/unit/examStudyIntegration.test.ts
```

```sh
npm test -- --maxWorkers=4 src/__tests__/unit/proxyStudentGate.test.ts src/__tests__/unit/examStudyCompletion.test.ts src/__tests__/api/basket.test.ts src/__tests__/api/adminSeesAll.test.ts src/__tests__/api/autoDraftCron.test.ts src/__tests__/api/autoDraftRunLink.test.ts src/__tests__/api/test.test.ts src/__tests__/api/defaultReviewRange.test.ts src/__tests__/api/questionBasket.test.ts src/__tests__/unit/examStudyRoutes.test.ts src/__tests__/api/questionDaily.test.ts
```

```sh
npm test -- --maxWorkers=4 src/__tests__/components/JeongtongHeader.test.tsx src/__tests__/components/ProblemSourceReference.test.tsx src/__tests__/components/mathgenTemplates.test.tsx src/__tests__/components/perProblemFractionView.test.tsx
```

범위의 한계

완료된 부모 전체 로그에서 실패한 26파일 중 부모 작업이 수정 후 별도 검사한 decisionLogNumbers.test.ts만 baseline 실행에서 제외했다. D-163 머리글 수정은 부모 소관이며 이 작업에서 문서를 수정하거나 그 수정 결과를 검증하지 않았다. 나머지 25파일은 실제 clean HEAD에서 모두 실행했고, 실패 개수·제목이 일치한다. 전체 1,643파일을 baseline에서 다시 실행한 것은 아니다.

복구 완료

- 브랜치: BIGSHOL/desc-gates-review
- HEAD: ed17a8acbfa15712888e681f5cb561ab5560bfe5 (원래 값과 동일)
- git status --porcelain=v1: 빈 문자열. 시험 직후와 최종 복구 후 모두 clean.
- node_modules: 원래 없었으므로 이번에 만든 링크만 제거. 최종 존재하지 않음.
- 부모 작업트리·DB·코드 수정·git add·커밋·push 없음. 추가 에이전트 없음. 모든 산출물은 /tmp에만 남겼다.


마지막 6파일 추가 확인 (2026-10-20T16:03:03.278873+09:00~2026-10-20T16:03:27.437100+09:00)

기존과 동일하게 원브랜치 clean 확인 → b553ad38 detached checkout → 부모 node_modules 임시 링크 → 원본 npm test 실행 → 원브랜치 복귀 및 새 링크만 제거했다. fixture 캡처/덮어쓰기 갈래를 막기 위해 BANK_DECIDE_CAPTURE_LOADER=0만 명시했으며 코드·시험·설정 파일은 바꾸지 않았다. 실행 직전·직후 및 복구 후 git status는 모두 비어 있다. node_modules는 staging하지 않았다.

| 추가 파일 | 재현된 구체적 실패 |
|---|---|
| mixedFractionScreens.test.tsx | 문제은행(/problems) 시험이 Test timed out in 20000ms. 부모도 동일한 시험·20초 시간 초과 |
| arithmeticV2Geometry.test.ts | problemAt 호출 1회 기대, 실제 0회 |
| bankDecideMiddleLoader.test.ts | mid:2-2\|경우의 수\|11 단답형의 seed 0·15·299 산출이 동결 fixture와 다름 |
| mathSrsQuickFence.test.ts | scripts/qa/measure-sweep-20261020.ts → courseServer.ts → serverState.ts → quickMission.ts → quick/types.ts 경로 검출 |
| planDailyReview.test.ts | examOrUnread 결과에 problemCount: 8이 추가되어 기대 객체와 다름 |
| problemOrder.test.ts | ProblemBank에서 .sort( 호출을 1개 이상 기대하나 실제 0개 |

위 다섯 단언/정적 검사 결과와 한 시간 초과 모두 부모 로그의 오류 내용과도 대조했다. mathSrsQuickFence에 나타난 measure-sweep-20261020.ts는 지정 HEAD에 추적된 파일이다. 재현 때문에 파일을 생성하지 않았다. 마지막 회차 결과는 6파일·64시험, 6실패·58통과, 종료 코드 1이다.

```sh
npm test -- --maxWorkers=4 src/__tests__/components/mixedFractionScreens.test.tsx src/__tests__/unit/arithmeticV2Geometry.test.ts src/__tests__/unit/bankDecideMiddleLoader.test.ts src/__tests__/unit/mathSrsQuickFence.test.ts src/__tests__/unit/planDailyReview.test.ts src/__tests__/unit/problemOrder.test.ts
```

최종 복구 확인: 2026-10-20T16:04:46.839854+09:00, 브랜치 BIGSHOL/desc-gates-review, HEAD ed17a8acbfa15712888e681f5cb561ab5560bfe5, git status 빈 문자열, node_modules 없음. 부모 파일·DB·코드·커밋 수정 및 추가 에이전트 실행은 없었다.
