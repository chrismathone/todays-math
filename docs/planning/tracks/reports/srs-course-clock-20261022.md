# Course 답 저장 503 — 세션 시각 하한 보완

2026-10-22 · 기준 `d717c0ee2306325f00d686dc40fc12cf33125122` · 가지 `fix/srs-course-clock-20261022`.

## 원인과 수정

첫 오답 → follow-up 정답 → 알겠어요 뒤 시계가 과거로 돌아간 경우,
`submitCourseAttempt`는 `max(now, lastFirstAt)`만 사용했다.
새 첫 답이 이미 저장된 follow-up 답보다 앞서 `progress.ts`의 `before` 검증에 실패하고,
`parseSrsState`가 `SrsUnavailable`을 내어 route가 503을 반환했다.
마지막 문제의 follow-up 뒤 앞선 오답을 복습하는 retry 경계도 같은 결함을 재현했다.
화면의 저장소 준비 중 문구는 503을 표시한 결과다.

`courseAutomation.ts`에 저장된 `followUps`의 `answeredAt` / `doneAt` 최댓값을 구하는
함수와 첫 답·retry 답의 기존 `Math.max` 인자 두 개만 추가했다(제품 코드 +15줄).
같은 시각은 허용하고 1ms를 더하지 않는다. 현재 시각이 모든 기존 이벤트 이후면 그대로 쓴다.
기존 영수증 반환이 시각 계산보다 먼저다. 저장 계약·검증, FSRS 계산, 분량·권한,
기존 record / template / version 필드와 화면은 바꾸지 않았다.

## RED → GREEN

학생 자료를 사용하지 않는 `1 + 1` 합성 세션으로 검증했다.

| 검사 | 수정 전 | 최종 |
| --- | --- | --- |
| 새 `courseSessionClock.test.ts` | 13 실패 / 3 통과 | 16/16 통과 |
| actual route의 새 next-first / retry 두 경우 | 새 답에서 각각 503 | 각각 200, 저장 성공 |
| 관련 4파일 최종 묶음 | — | 51/51 통과 |

순수 회귀는 정답·오답·모름, 마지막 문제 완료, 확인 전 follow-up,
reveal 완료, 같은 날·KST 다음 날, 정상 시각·동일 시각, 기존 follow-up 없는 하한,
원래 답·follow-up·문제 내용 보존과 재전송의 동일 상태 반환을 포함한다.
actual route 시험은 기존 auth / DB 메모리 모킹을 사용하고 실제 ATTEMPT / FOLLOW_UP
처리기와 journey → expedition → 전체 stored parse를 지난다.
첫 답 영수증과 새 답 재전송은 저장 호출 0회, 새 답은 1회다.
실서버·브라우저·공유 DB를 사용하지 않았다.

최종 명령:

```sh
npm run test -- src/__tests__/unit/courseSessionClock.test.ts src/__tests__/api/mathSrsCourseRoutes.test.ts src/__tests__/unit/courseFollowUpReader.test.ts src/__tests__/unit/courseFollowUpWriter.test.ts --maxWorkers=1
npm run type-check
npm run lint -- src/lib/math-srs/courseAutomation.ts src/__tests__/unit/courseSessionClock.test.ts src/__tests__/api/mathSrsCourseRoutes.test.ts
npm run lint:affordance
git diff --check
```

타입·범위 lint·affordance·diff 검사 통과. 첫 타입 검사에서 새 시험의 plan 숫자 타입 오류를
고쳐 전체 타입 검사를 다시 통과했다. 검사 동시 워커 상한은 3이었다.

## 외부 frozen83 근거와 정상 시각 차분

학생 payload는 저장소에 복사하지 않았다. 아래는 모두 저장소 밖에 보존한다.

- 입력: `/Users/pss/Desktop/creative/display-survey/srs-remaining-20261022/independent/final.backup.json` — 읽기만 사용.
- 기존 RED: `/Users/pss/Desktop/creative/display-survey/consensus/test-s-auth-storage-20261022/course-offline-results.json`, `reproduce-course.ts` — 보존.
- 새 GREEN: 같은 외부 폴더의 `reproduce-course-clock-green.ts`, `course-clock-green-results.json`.
- 이전 코드 차분: 같은 외부 폴더의 `courseAutomation-before-clock.ts`, `course-clock-differential.ts`, `course-clock-differential.json`.

Oct22 정답·모름 두 경우는 이전 코드의 course parse 실패 → 수정 후 전체 parse 성공이다.
Oct24/25 정답·모름 네 경우는 이전·수정 코드의 course와 journey/expedition 합성 저장 결과가
`JSON.stringify` 바이트 단위로 같다. 최종 frozen83 재현은 6/6 통과했고 입력 파일 SHA256도 불변이다.
학생 상태·시계·설정은 수정하지 않았다.

## 범위 밖 실패와 한계

처음 넓힌 5파일 묶음에서 기존 writer 시험 1건 시간 초과와
`srsStoredContractWalk.test.ts`의 3건 실패가 있었다.
writer는 단독 7/7 및 최종 묶음 7/7 통과했다.
걷기 시험은 외부 `course-clock-baseline.vitest.mts`의 Vite loader로
제품 `courseAutomation.ts` 대신 exact d717 소스를 주입해 단독 실행해도 같은 3건이 실패했다:
은행 도달 기대(258행), follow-up 세션 존재 기대(338행), 넘어간 탐험 활동 충돌(489행).
이 기존 실패는 고치지 않았으며 전체 저장소 시험 통과를 주장하지 않는다.
실제 로그인/proxy·브라우저·배포 검증은 이 메모리 route 시험이 보증하지 않는다.

## 보존과 인계

기존 미추적 엔진 자료 3개는 내용·바이트·미추적 상태를 유지하고 stage하지 않는다.

| 파일 (`scripts/qa/reports/refresh-engine-content/`) | bytes | SHA256 |
| --- | ---: | --- |
| `d164-elem-20261021.json.gz` | 11689146 | `ed213d1c04c02f9c15a5174af24151e313be1ec9378c123e6972a86a6537512a` |
| `d164-elem-20261021.report.json` | 3215270 | `b0026d1a38b8c2550a487e1fc31aea69ac09bb1c189f6be24124c84a06260be0` |
| `dry-run.report.json` | 3215259 | `d0325423580865c53c4f74675911978ef43365d61b32adb4c3ed96a48343fe69` |

제품 파일 1개·관련 시험 2개·이 보고서만 단일 명시 stage하여 로컬 커밋한다.
이 worker의 남은 실행은 0이며 공유 DB/API/운영 UI, reset/restore, 실제 시계, 모델,
환경변수·의존성 변경, 서버·capture·build·push는 모두 0이다.
main 통합·독립 검토·단일 build·fresh fetch/push·Vercel 성공 확인은 리드 소유다.
