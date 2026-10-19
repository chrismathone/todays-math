# 시험지 만들기 — H2 1단계 «차근차근» 완료

2026-10-19. 지시서: [brief-builder-h2-step1-codex.md](../brief-builder-h2-step1-codex.md).

시안 경로는 `/dev/exam-builder-simple-hifi#H2-step1`이다. 기존 H1~~H4 아래에 S1~~S4를 추가했다. 확정된 H2 2단계를 그대로 이어 보며, 네 안의 선택은 각각 독립적으로 유지된다. 커밋·스테이징·push·배포는 하지 않았다. `node_modules` 심볼릭 링크도 변경하거나 스테이징하지 않았다.

## 네 안과 공통 동작

| 안            | 선택 방식                     | 선택을 진행했을 때                                                                       |
| ------------- | ----------------------------- | ---------------------------------------------------------------------------------------- |
| S1 단계 열    | 파일 탐색기처럼 왼쪽부터 열기 | 학년·과정 → 단원 → 차시 열을 하나씩 추가한다. 좁은 화면에서는 세로로 쌓는다.             |
| S2 한 열 차례 | 선택한 단계 접기              | 고른 학년·단원을 요약 줄로 접고 다음 목록을 아래에 연다. ‘변경’으로 앞 목록을 다시 연다. |
| S3 경로 줄    | 현재 단계 목록 하나           | 위의 경로 줄에서 앞 단계로 돌아가고, 아래에는 현재 단계의 목록만 그린다.                 |
| S4 고르기 창  | 공용 `PickerDialog`           | 단계별 ‘고르기’로 현재 목록만 연다. 다음 단계의 줄은 앞 단계를 고른 뒤 나타난다.         |

네 안 모두 처음에는 학년·과정만 선택한다. 단원·차시는 CSS로 가린 목록이나 닫힌 창에도 미리 그리지 않는다. 학년을 바꾸면 단원·검색·페이지를, 단원을 바꾸면 차시 검색·페이지를 초기화한다. 이미 출제 범위 칸에 담은 항목과 입력한 수는 보존해 다른 학년·단원의 범위를 누적할 수 있다. 같은 차시를 해제·재선택해도 중복 행이 생기지 않는다.

오른쪽 출제 범위 칸에서 문항 수·고정·빼기를 조작한다. 폰에서는 목록 아래로 쌓인다. 제목·출제 조건 줄·‘전체 / 교과서만’ 한 줄·조건 입력·막힌 까닭과 다음 행동의 위치는 H2 구성을 따른다. 새 안에도 16px 판 내부 여백, 직각 구획, 얇은 가로선과 기존 제품 토큰을 사용했다. 별도 색 체계나 장식 배지는 추가하지 않았다.

저장 조건은 출처·범위·수·고정·난이도·최근 출제 설정을 복원하고 마지막 차시의 탐색 경로로 돌아간다. 형식·차례는 기존 저장 계약대로 적용 시점의 값을 유지한다. 구성 조건 계산에는 기존 `conditionsPlan.ts`를 사용한다. S2/S3에서 선택 목록이 사라질 때 새 단계 제목으로 초점을 옮기며, 범위별 고정 체크에는 대상 학년·차시의 이름을 연결했다.

## 데이터와 기존 화면 보존

`prisma/seed-data/units.ts`의 735차시를 원본 순서대로 사용한다. 학년·과정 16개, 학년 안의 대단원 117개이며, 초등 학기 접두와 고등의 실제 7과목 이름을 보존했다. 32차시인 ‘공통수학1 / 2. 방정식과 부등식’은 20개씩 탐색하고, 긴 실제 차시명도 검색·선택할 수 있다.

시드에는 실제 문항류 재고가 없으므로 N갈래를 추정해 붙이지 않았다. 조건 조작용 가능 수 40~48과 책은 시안용 예시임을 화면에 명시한다. DB 조회·저장이나 실제 문항 생성은 하지 않는다. ‘문항 구성’은 독립 픽스처인 기존 `#H2-2`로 이동하는 비교용 링크다.

10월 18일에 남긴 독립 HTML과 이번 HTML을 1440px·390px에서 대조했다. 기존 H1~H4의 8개 화면 DOM은 모두 동일했고, H2 2단계 전체 PNG의 SHA256도 각 폭에서 동일했다. [대조 결과](builder-h2-step1-codex-20261019/hifi-regression.json)에 기록했다. 재개 이후 기존 `SimpleHifi.tsx`·공유 CSS·기존 fixtures·공유 dialog 파일은 수정하지 않았다.

## 검증 결과

| 검사                                                 | 명령                                                                                                                 | 결과                        |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| 기존 회귀·새 단계 선택·페이지 가드·dev 가드 커버리지 | `node_modules/.bin/vitest run --config src/app/dev/exam-builder-simple-hifi/vitest.config.mts --configLoader runner` | 4파일 55시험 통과           |
| 전체 타입                                            | `npm run type-check -- --incremental false`                                                                          | 통과                        |
| 화면·측정 스크립트 lint                              | `node_modules/.bin/eslint src/app/dev/exam-builder-simple-hifi scripts/qa/measure-builder-simple-hifi.mjs`           | 통과                        |
| 전체 마우스 어포던스                                 | `npm run lint:affordance`                                                                                            | 통과                        |
| 소스 서식                                            | `node_modules/.bin/prettier --check src/app/dev/exam-builder-simple-hifi scripts/qa/measure-builder-simple-hifi.mjs` | 통과                        |
| 측정 스크립트 구문                                   | `node --check scripts/qa/measure-builder-simple-hifi.mjs`                                                            | 통과                        |
| 독립 브라우저 측정                                   | `node scripts/qa/measure-builder-simple-hifi.mjs --screenshots`                                                      | Chrome 155, 560조합, 오류 0 |

새 단계 전용 19시험은 초기 상세 DOM 없음, 상위 선택 변경에 따른 하위 초기화, 다른 학년까지 누적, 동일 차시 해제·재선택과 입력 보존, 구성 조건 적용, 실패·재시도, 빼기, 저장 조건 복원, 단계 제목 초점, 공용 창의 닫기, 32차시 페이지·검색을 다룬다. 중단 파일에 남았던 Testing Library 역할 조회의 지원하지 않는 `exact` 옵션을 제거했다. 저장 조건 창의 두 ‘닫기’ 중 머리 단추를 명시적으로 조회하도록 시험도 수정했다.

브라우저는 Next 서버·환경 파일·DB 없이 정적 번들을 실행했다. 외부 요청을 차단하도록 설정했고 외부 요청 시도·페이지 오류는 0이었다. 아래 7개 크기에서 각 80장면을 측정했다.

| 화면 크기   | 장면 수 | 문서·화면 가로 넘침 | 잘라 숨긴 요소·화면 밖 요소 |
| ----------- | ------: | ------------------: | --------------------------: |
| 1440 × 1000 |      80 |                 0px |                         0개 |
| 1050 × 900  |      80 |                 0px |                         0개 |
| 1040 × 900  |      80 |                 0px |                         0개 |
| 768 × 1024  |      80 |                 0px |                         0개 |
| 390 × 844   |      80 |                 0px |                         0개 |
| 320 × 640   |      80 |                 0px |                         0개 |
| 1440 × 600  |      80 |                 0px |                         0개 |

장면에는 초기 화면·긴 제목·단계별 선택·32차시의 첫째/둘째 페이지·학년 변경·최장 차시·누적 범위·열린 선택 창·각 화면의 대기/실패·기존 2단계의 다섯 막힘을 포함한다. 1440px에서 본문 최대 1040px도 확인했다. 열린 창의 가로 넘침과 viewport 이탈은 0이다.

S4의 세 창은 각 화면 크기에서 native modal 여부, 닫기 단추의 초기 초점, Tab·Shift+Tab 뒤 창 안 복귀, Escape 닫기와 연 단추 초점 복귀를 확인했다. Chromium에서 Tab 경계가 브라우저 UI를 방문해 `body`가 초점으로 관측되는 경우에는 다음 Tab으로 창 안에 돌아오는지 검사한다. 이 검사를 모든 브라우저·스크린 리더의 접근성 인증으로 확대하지 않는다. 실제 계정 인증·제품 저장·출력은 이번 독립 시안의 검증 범위 밖이다.

별도 Orca Codex 세션은 메모리 DOM에서 데이터 전량 대응, 네 안의 핵심 흐름과 저장 조건 복원을 독립 재현했고 잔여 확정 결함을 보고하지 않았다. [독립 검토 기록](builder-h2-step1-codex-20261019/independent-review.md)은 독립 실행과 주 에이전트의 실측을 구분한다. 그 기록의 ‘최종 native modal 재실행 미확인’은 검토 기록 작성 시점의 상태이며, 위 표에는 이후 완료된 최종 560조합의 결과를 적었다.

## 산출물과 재개 범위

| 파일                                                              | 역할                                                              |
| ----------------------------------------------------------------- | ----------------------------------------------------------------- |
| `src/app/dev/exam-builder-simple-hifi/StepOneVariants.tsx`        | S1~S4·단계 상태·누적 범위·조건·저장 복원·공용 선택 창             |
| `src/app/dev/exam-builder-simple-hifi/StepOneVariants.module.css` | H2 변형의 밀도·열/경로/요약 줄·폰 배치                            |
| `src/app/dev/exam-builder-simple-hifi/step1Fixtures.ts`           | 실제 735차시와 네 안의 정의                                       |
| `src/app/dev/exam-builder-simple-hifi/step1.test.tsx`             | 전용 19시험                                                       |
| `src/app/dev/exam-builder-simple-hifi/SimpleHifi.tsx`             | 기존 시안 보존, 새 절·바로 가기 연결                              |
| `src/app/dev/exam-builder-simple-hifi/PreviewDialogs.tsx`         | 새 차시 목록·저장 조건 요약을 받는 선택 인수, 기존 기본 동작 유지 |
| `src/app/dev/exam-builder-simple-hifi/hifi.test.tsx`              | 기존 8화면 회귀와 새 4화면을 함께 확인                            |
| `scripts/qa/measure-builder-simple-hifi.mjs`                      | 새 절·1040px·선택 과정·공용 창·키보드·폭 측정                     |

재개 시 미추적 파일을 먼저 읽고 임시 스냅샷을 남겼다. 그 뒤 코드는 범위별 고정 이름, 시험의 타입 오류와 재선택·저장 복원 사례, 실제 모달 키보드 검사와 캡처 정렬만 보강했다. 기존 Wire 파일·지시서·앞선 보고서는 보존했다. 보고서와 대표 캡처·실측 요약을 새로 저장했다.

- [실측 요약 JSON](builder-h2-step1-codex-20261019/measurements-summary.json)
- [S1 처음 화면 · 1440px](builder-h2-step1-codex-20261019/desktop-S1-1.png)
- [S1 세 열과 누적 범위 · 1440px](builder-h2-step1-codex-20261019/desktop-S1-longest-selected.png)
- [S2 폰 배치 · 390px](builder-h2-step1-codex-20261019/phone-S2-longest-selected.png)
- [S3 경로·목록·누적 범위 · 1040px](builder-h2-step1-codex-20261019/width-1040-S3-longest-selected.png)
- [S1 작은 폰 배치 · 320px](builder-h2-step1-codex-20261019/small-phone-S1-lessons-first-page.png)
- [S4 공용 차시 선택 창 · 390px](builder-h2-step1-codex-20261019/phone-S4-picker-lesson.png)

전체 148캡처·정적 HTML·560개 상세 실측은 `/tmp/builder-simple-hifi-QberS1/`에 있다. 위 측정 명령으로 다시 만들 수 있다. 최종 시험·타입 로그는 `/tmp/builder-h2-step1-tests-final.log`, `/tmp/builder-h2-step1-type-check-final.log`에 남겼다.

검토용 Orca 작업트리는 변경 없음·작업 종료·HEAD가 로컬 main에 포함됨을 확인한 뒤 정리했다. `BIGSHOL/builder-h2-step1-qa` 브랜치는 보존했다. 본 작업은 지시대로 현재 작업트리의 미커밋 상태로 남긴다.
