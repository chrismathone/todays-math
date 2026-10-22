# SRS M11 fresh-day 문제 진도 원천 교정 — 2026-10-22

개념 우선일에 개념 묶음을 «문제 진도»로도 보여 주던 표시를 고쳤다. 실제 응답에서 문제 진도를 확인할 수 없는 날은 그 줄을 생략하고, 오늘 개념 묶음·시작·완료 활동의 표시는 유지한다. 제품 변경은 홈 연결의 세 파일뿐이다.

## 기준과 작업 경계

- 시작 SHA: **`6013cfcdb55dcbf0b64782afce127e13dd75b510`**, 가지 `fix/srs-m11-fresh-day-20261022`, 착수 시 clean.
- 브리프 전문: `/Users/pss/Desktop/creative/display-survey/consensus/brief-srs-m11-fresh-day-20261022.md`.
- AGENTS, CLAUDE 절대 규칙, 초5 30일 계획 §2·§8, 디자인 §8.25, SRS 개편·탐험 통합 지침, experience `18c0a280e` 보고의 M11, M02/M10 완료 원천 규칙을 대조했다. 코드 작성 전 설치 Next 16.3.8의 `use-client` 가이드를 읽었다. 여러 TSX를 바꾼 뒤 React 검토 스킬의 상태·effect·접근성·타입 기준을 적용했다.
- 리드가 메시지 `msg_71a115e1337d`로 courseSectionId/문제 형식 근거가 있을 때만 표시하고, 개념 fallback은 생략하는 최소안을 승인했다. 새 문구·배치·계약·GET 확장 없음.
- 브라우저·서버·DB·API 호출·main checkout/병합·build·push·배포 없음. 계약·저장 필드·일정·분량·FSRS·채점·권한·콘텐츠·version 1 template·문제 공급·CSS 무변경. 공유 node_modules·lock·env 무변경.
- 외부 `independent/recovery.backup.json`은 외부에서 필드 이름과 교사 계획의 `5-2-1-1 / dailyQuestionCount:10 / enabled:true`만 확인했다. 원본 학생 기록을 저장소·시험·보고서로 옮기지 않았다. `plan-restored`/`plan-confirmed` 파일을 성공 근거로 사용하지 않았다.

## 실제 producer가 말하는 것

`expeditionLearning` → `fadingDailyLearning`/`fadingDailyWorkload` → `serverFadingDailyPlan` → strict `fadingDailyPlanSchema` → 로컬 source → `ExplorerConceptMemory` → `ExplorerHome` → `ExplorerStudyBook`/`DailyStudy`를 연결했다. 학생 정보가 없는 로컬 순수 입력에 기존 `emptySrsState`, `setCoursePlan`, `initialOwnedExplorer`, 실제 개념 catalog를 사용했다. 서버 라우트나 HTTP는 부르지 않았다.

교사 시작 소단원이 `5-2-1-1`이고 아직 카드를 공부하지 않은 날의 실제 public 결과는 다음과 같다.

| 원천                         | 결과와 의미                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| 저장 코스 계획               | `5-2-1-1`, 문제 회차 분량 10, enabled                                                 |
| `prerequisite.target`        | `title: 소수 곱셈과 어림`, `explorerUnitId: g5-estimate`, **`courseSectionId: null`** |
| `plan.next` 활동             | practice, **`source.kind: explorers`**, title 소수 곱셈과 어림                        |
| 문제 날의 같은 소단원 target | 카드를 공부한 뒤에는 `courseSectionId: 5-2-1-1`, title 이상과 이하 알아보기           |

`dailyQuestionCount:10`은 코스 문제 회차 분량이다. 이를 별도의 fading 하루 quota로 복제하지 않았다. 재현은 실제 기본 quota를 사용하는 기존 producer 그대로다. 분량 우선순위나 개념 첫날의 활동 수를 바꾸지 않았다.

따라서 `prerequisite.target` **존재 자체**는 문제 진도의 근거가 아니다. 개념 날에는 선수 안내도 탐험 묶음을 가리킨다. 기존 Memory는 이 title을 무조건 `dailyUnit`으로, 없으면 모든 practice의 title을 대신 보냈다. Home도 `dailyUnit`이 없으면 `currentUnit.title`로 다시 채웠다. 그 결과 개념 묶음 이름이 문제 진도에도 표시됐다.

현재 개념 우선일 응답에는 교사 코스 소단원 표시명이 별도로 실리지 않는다. 화면이 ID/제목으로 추정하거나 개념 묶음을 대입하지 않고 문제 진도 줄을 생략하는 것이 이번 최소 수정이다. 문제 mission의 `source.title`은 그 mission의 표시명이며 개별 문제 소단원의 전수라는 뜻은 아니다.

## 수정

- `ExplorerConceptMemory.tsx`: `target.courseSectionId`가 있는 target의 title을 우선한다. 없으면 **elementary/middle 문제 mission**의 source title만 사용한다. explorers practice는 문제 진도 원천에서 제외한다.
- `ExplorerHome.tsx`: 책의 문제 진도에 `currentUnit`/mission 제목을 보충하던 fallback을 제거한다.
- `ExplorerStudyBook.tsx`: unit을 선택 인수로 받고 없을 때 context에 null을 전달한다. 기존 `DailyStudy`의 생략 규칙을 사용한다. 완료/short의 활동 source 처리, 개념 묶음 줄, 시작 단추, 길잡이, 책·지도 구조는 변경하지 않았다.
- 신규 `SrsFreshDayHome.test.tsx`: 실제 producer/contract와 실제 홈 소비자를 연결한다. renderHome 연결은 기존 학생 부모와 같은 props를 전달하며, StudentMathExplorers 부모 자체의 통합은 기존 회귀에서 별도로 확인한다.

## RED → GREEN

증거 디렉터리: `/Users/pss/Desktop/creative/display-survey/srs-remaining-20261022/m11-fresh-day/`.

최종 동일 시험을 **정확 6013의 제품 세 파일**과 실행한 `red-verified.log`는 **4실패/5통과**다. 임시 실행은 원본 제품을 `git show 6013:경로`로 읽었고, finally에서 수정본 세 파일을 복원했다. 실패는 fresh 개념 우선일, target 없는 개념 날, 기억만 있는 날, target/활동 없는 빈 계획의 거짓 문제 진도다. 문제 날·선수 회상·문제 mission fallback·완료·short는 수정 전에도 통과한다.

| 검증                                                             | 최종 결과                                                                                                                   |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 신규 회귀                                                        | **9/9 통과**, `green.log` 및 `related-final.log`                                                                            |
| 관련 홈·개념 source·일일 계획·선수·길잡이·preview·수식·복구 회귀 | **13파일 163시험 통과**, `related-final.log`, `--maxWorkers=3`                                                              |
| H01 수직선, H02 코스/후속/예습/초등/탐험 문제 회귀               | **6파일 109시험 통과**, `h01-h02.log`, `--maxWorkers=3`                                                                     |
| 변경 TS/TSX 파일 명시 ESLint                                     | 오류·경고 0, `eslint-final.log`                                                                                             |
| affordance                                                       | exit 0, `affordance.log`                                                                                                    |
| 범위 TypeScript                                                  | **exit 0**, `type-scope-final.log`; 외부 `tsconfig.scope.json`에 제품 3파일·새 시험·Vitest setup 및 import 의존 경로를 포함 |
| diff / formatting                                                | `git diff --check`, Prettier 통과; 로컬 커밋 훅의 파일별 검사도 수행                                                        |

처음 시험 작성 때 실제 explorer ID를 `g5-decimals`로 잘못 적었고, card에 없는 grade 필드로 공부한 날의 입력을 만들었다. 실제 `g5-estimate`와 unit ID로 바로잡은 뒤 제품 RED를 다시 확보했다. 선수 코스 제목의 ×는 KaTeX의 시각·MathML 복사본 때문에 단순 textContent 비교가 중복됐다. 최종 시험은 수식이 실제 렌더됐는지 확인하고 복제한 DOM에서 semantic 사본만 제외하여 **보이는 전체 제목을 그대로 비교**한다. 초기 진단 로그도 남겼으며 기대 제목을 완화하지 않았다.

초기 범위 type 검사에서 새 find 조건의 타입 좁히기 한 건이 발견돼 명시적 practice 타입 조건으로 보완했다. 최종 범위 검사에는 진단이 없다. 전체 type/build는 실행하지 않았다. 기존 공유 의존성의 두 QA 파일 세 진단 한계와 리드의 독립 전체 검증을 범위 검사 성공으로 대체하지 않는다.

## 남는 확인과 인계

브라우저 사용 금지에 따라 **시각 확인은 수행하지 않았다**. 이번 결과는 로컬 순수 producer·strict public 계약·jsdom 소비자와 관련 회귀의 증거이며, 운영 화면·실제 학생 저장·DB 동시성의 검증이 아니다. 운영 Chromium은 별도 검수자 소유다.

리드에게 정확한 로컬 커밋 SHA, 제품 세 파일, RED/GREEN 및 범위 검사 결과와 clean 여부를 별도 전송한다. 리드의 독립 review/main 통합/build/push/운영 확인이 남으며, 이 작업자는 완료한 가지와 worktree를 보존한다.
