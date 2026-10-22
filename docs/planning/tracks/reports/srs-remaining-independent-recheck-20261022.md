# SRS 잔여 수정 독립 검토 — 2026-10-22

최초 28건과 지정된 누락 범위를 source·회귀·원본 PNG·허용된 test_s 운영 표본으로 독립 대조했다. 운영 `6013cfcdb`에서 **M11의 잔여 잘못된 진도 표기**를 찾아 리드에게 전달했고 `7f68007dd`의 실제 producer 회귀와 수정 연결을 검토했다. 새 memory의 범위 풀이에서 조사 오타도 찾아 별도 version 2 reader-first 수정으로 연결했다. 확인한 수정 범위의 추가 차단 결함은 없으나 **모든 운영 분기·실기기 접근성·아동 학습 효과의 전수 합격은 아니다**.

브라우저 사용권은 **2026-10-22 00:09:00Z에 반환**했다. 최종 test_s는 offset 0, 원 기기/계획/분량/guide 값, 로그인된 `/learn` 홈이며 rev 83의 새 정상 학습 기록은 보존했다. 이 문서는 제품 편집 없이 작성한 독립 보고다.

최종 코드 검토 대상은 **`2fee084301e67f94ec7bbd4d4a67667efb6175f6`**다. 실제 운영 표본은 그 이전 `6013cfcdb`·`7f68007dd`이며, 이후 grammar reader/writer는 source·회귀 로그 관문만 확인했다. 실제 v2 운영 회차를 검수했다고 주장하지 않는다.

리드는 최종 W의 [Vercel 배포](https://vercel.com/bigshols-projects/todays-math/BE56fwopVa6fnamZqmifdcS2zdQw) success를 fresh GitHub 조회로 확인했다(updated **2026-10-22T00:40:10Z**, 통지 `msg_4846aa98bd36`). 그 통지 후 origin/main을 새 fetch해 exact W와 일치를 확인하고 ff-only했다. 이 보고서 커밋의 제품 부모는 그 W다. 리드의 관련3파일26 PASS·단일 production build/full type exit0·정상 push 필수 hook exit0는 리드 통지 근거이며 이 작업자의 추가 실행으로 세지 않는다.

## 검토 대상과 소유

- 최초 reader 통합 후보 `b69e9997f26c92899921dc3402a15952abe07110` = 기본 experience `18c0a280e`, policy `b80e00102`, course `f7f5c6bc0`와 reader `f8086ff79`/`1e3563d80`/`7c3b3c0f2`. origin/main을 fetch하여 기준 `6c26a17c9`와 reader 보완의 ancestry를 확인했다.
- 독립 검토 중 리드가 두 오래된 시험 locator만 별도 편집하도록 명시 배정했다(`msg_54ec3deda0ae`). 로컬 test-only commit `aab8058d3b05edd6df6046d237747333536ca149`은 `StudentCourseSrs.test.tsx`의 «하루 학습량» 두 곳을 승인된 «코스 하루 목표»로 바꾼다. 선택값·저장·필수값·소단원 보존 assertion과 timeout은 그대로다. pre-commit이 한 호출만 줄바꿈했고 ESLint·Prettier·affordance가 통과했다.
- 이후 reader 소수 피연산자 표기 `d0670f75c`와 writer `70b95fd03`의 좁은 신규 관문은 리드가 별도 Task로 이관했다(`msg_59b702b89912`). 이 문서의 첫 reader 판정에 그 커밋을 소급 포함하지 않는다.
- 최종 후보 `6013cfcdb55dcbf0b64782afce127e13dd75b510`의 ancestry와 `aab8058d3` 이후 전체 diff 목록 및 두 제품 파일 diff를 대조했다. `094c1fddbb29cdb337df73a2277c47b4ecf1a393`에 decimal reader가 먼저 합쳐지고, 그 reader의 Vercel success(2026-10-21 19:19:42Z, deployment `7E21e25yuuMvLyVP9Kjecd3nynCQ`)를 리드가 새 확인한 뒤 writer를 합친 순서다. 별도 `ctx_b3bc8251d3ce` 관문 보고서를 읽었으며 reader/writer의 좁은 순수 검산 차단0을 인용하되 본인이 재실행한 시험으로 세지 않는다. `6013`의 fresh GitHub Vercel success(`4MwCZGV4ZzLsmV7ZePSE6LfMq4z8`, 리드 status updated 2026-10-21 21:01:10Z)와 명시 grant 후에만 운영을 열었다. 이후 `7f68007dd2970ad8189c3674a7f79b957dd361e4`의 fresh connected GitHub Vercel success(`7zoCSzGpwH5FjDhtWFHXy8K8oHGB`; 리드 updated 22:37:33Z)와 갱신 grant를 받고 해당 SHA로 ff-only했다. 운영 증거는 두 배포를 구분한다.
- 제품·계약·저장 payload를 직접 편집하지 않았다. 학생 상태는 아래에 기록한 승인된 정상 UI/test-console 작업으로만 변경했다. report/evidence와 위 명시 배정 test-only 수정만 소유한다. build/push/deploy/새 모델 호출은 하지 않았다.

## 읽은 근거와 독립 검사

지시 brief 전문, 세 track brief·최종 구현 보고, 최초 `srs-e5-eye-review-20261021.md` 전문, urgent/medium/rate 운영 재검수 전문, AGENTS reader floor, CLAUDE 절대규칙, 초5 계획 결정 1~11·§8, 디자인 §8.25, 탐험 통합 계획, source 함수 경계, 두 QA README와 experience QA 설명을 대조했다. test-only 변경 전에 설치된 Next Vitest 가이드를 읽었다. 초기 reset 제안의 README/DRY-RUN과 현재 test-console route·action·store·UI를 읽었다.

세 구현 보고는 [policy](srs-remaining-policy-20261022.md), [course](srs-remaining-course-20261022.md), [experience](srs-remaining-experience-20261022.md)다. 각 보고의 작성 당시 범위와 이후 reader/writer·운영 후속 수정은 아래에서 분리한다.

아래 독립 **회귀 시험**은 메모리/합성 입력이며 `--maxWorkers=3`을 지켰다. 뒤의 승인된 운영 표본과 구분하며, 회귀 시험을 실제 HTTP·DB 통과로 쓰지 않는다.

| 독립 실행                                        | 결과                                                   | 외부 증거                                                         |
| ------------------------------------------------ | ------------------------------------------------------ | ----------------------------------------------------------------- |
| reader unit + 실제 route의 인증/저장소 mock      | 2파일 26 PASS                                          | `reader-tests.log`                                                |
| unmarked engine/static compatibility             | 45 JSON byte 비교 PASS, 옛 strict reader가 marked 거절 | `reader-static-compare.json`                                      |
| 승인된 locator 통합 수정                         | 1파일 54 PASS                                          | `integration-locator-green.log`; RED는 리드 32파일 실패 원문 사본 |
| 잔여 policy/course/experience 및 기존 H01/M07 등 | 16파일 228 PASS                                        | `remaining-regressions.log`                                       |
| 기존 auto advance/cards/rate route guards        | 3파일 98 PASS                                          | `prior-fix-guards.log`                                            |
| 합계                                             | **22파일 406 PASS**                                    | 중복 무작정 재실행 없음                                           |

전체 type/build는 이 작업자가 다시 돌리지 않았다. 리드의 내부 SSD full type 성공과 공유 ExFAT 의존성 오류 3건은 서로 다른 환경의 결과로 구분한다. 첫 reader unit은 5카드×640 seed의 12,800 보기·3,200 참거짓, 인접 seed 보기 집합, 범위 방향×truth 네 조합을 검산한다. API 회귀는 표시→채점→두 번 오답→풀이/reload/영수증을 실제 route에 메모리 저장소로 연결한다. `compareStatic.ts`는 이전 engine을 로드하되 단순 상대 의존물은 현 checkout을 쓰는 한계가 있다.

## 최초 28건 현재 상태표

«로컬»은 source·회귀·명시 PNG 범위, «운영»은 아래 기록한 실제 표본이다. 구현자의 200%/합성 날짜·오류 주입은 이 작업자의 실제 운영 결과로 옮기지 않았다.

| ID   | 확인 결과                                                                                                                                                                                                                                        | 한계·미도달                                                                                                                    |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| H-01 | 수직선 회귀 유지. **운영 두 원 target의 2·3단계**에서 이하=닫힌3/왼쪽, 3미만=빈3/왼쪽을 각각390 PNG·DOM으로 직접 확인. 초과·미만 혼합문장에는 그림을 생략. 두 묶음 정상 비교·평가 완료                                                           | 모든 은행 문장 전수는 아님                                                                                                     |
| H-02 | 긴 문제·그림·풀이 tail·알겠어요·다음 heading의 구현자 원본 및 Range/hit 대조. 운영 일반 목록형 문항390, 가로844×390에서 다음 문제 전체 내용과 heading 가시성 확인                                                                                | 운영 공급은 짧은 일반 문항; 긴 문항·실기기 키보드 미도달                                                                       |
| M-01 | «코스 하루 목표» 설명·독립5/통합문제날10/전체기본15 회귀. 운영 교사계획10·외부quota15 보존, 실제 코스 첫 묶음5/미션10·recall3 공급 대조                                                                                                          | 10문제 전체 미션을 끝내지는 않음                                                                                               |
| M-02 | **운영 day0 완료홈** 소수 곱셈과 어림/활동15, day1 기억복습+개념2/활동15 완료 확인. 완료 제목은 실제 활동과 일치                                                                                                                                 | short 홈 미도달. Oct24의 미배정2칸은 아직todo이며 short 완료로 세지 않음                                                       |
| M-03 | 약2초 정답 진행·reduce 수동·오답 수동 회귀. 운영 memory 참거짓 정답은 다음 활동으로, 코스 첫 오답은 같은 문제 재시도로 감                                                                                                                        | 물리 OS reduce·초 단위 실측 미실행                                                                                             |
| M-04 | 공식 explorers teacher read 연결·학생교체/늦은응답/실패/빈기록 회귀. 운영 교사 test_s 일별 탭에서 Oct22 소수 곱셈과 어림 **첫15/15·남음0** 확인, 코스0 별도                                                                                      | 교사 화면의 최종 Oct23~24 전체 기록은 추가 조회하지 않음                                                                       |
| M-05 | 빈칸0 문장에 입력 없는 회귀. 운영 H01 step2의 빈칸 없는 문장들에서 입력 없이 다음 문장 이동 확인                                                                                                                                                 | 모든 조합 전수 아님                                                                                                            |
| M-06 | 운영 H01 및 필수 xc6의 단계완료·직접쓰기 **4/4 또는3/3** 대조와 최종 rate 영수증 확인                                                                                                                                                            | 매 stage/모든 concept 전수 아님                                                                                                |
| M-07 | 학생 계획 UI 제거·writer 차단 회귀 유지. 운영 teacherplan 값 정상 재설정 후 보존                                                                                                                                                                 | 권한 공격 POST는 불필요하여 미실행                                                                                             |
| M-08 | 동일 check identity 자동 재개 억제·수동 resume 회귀. 운영 실제 textbox/답확인 버튼 있는 **ready** modal을 닫은 뒤 현재 학습 진행; 같은 방문에서 닫은 xc3 대신 다른 c1/c2/xc4가 차례로 표시됨. 짧은 확인 채점0                                    | 새 방문/reload에서는 다시 열릴 수 있음. 수동 이어하기는 실검수하지 못했으며 모든 token 분기 합격 아님                          |
| M-09 | **운영 첫답400와 후속답400 각각1회**: abc 유지·inline 안내·정답확인 활성, 첫 오류 INPUT 초점. rev80/81 및 payload가 각 요청 전후 동일. 수정한 정상 답 제출 성공                                                                                  | response body 원문은 미수집; HTTP400·DOM·백업·source 분기를 근거로 판정. 모든 입력모드 전수 아님                               |
| M-10 | **운영 완료홈 guide5종** 축하/보상 확인; peer→paper→spirit→wood→marten 정상 선택4회, 최종 원 id 복귀                                                                                                                                             | 저장 실패는 구현자 fixture만, 운영 실패 강제하지 않음. short guide 미도달                                                      |
| M-11 | 운영6013의 fresh 개념날에 문제진도=개념묶음으로 중복된 잔여 결함을 보고. **7f 실제 producer 9회귀 RED4→GREEN9**와 부모 연결/source 독립 검토. 운영7f의 실제 courseSectionId 존재 분기에서 정상 코스줄·개념줄·시작·지도 보존                      | 상태가 진행되어 null-course 생략분기를 같은 계정에서 재현하지 않음. source/회귀 근거를 운영 동일조건 전후 비교로 과장하지 않음 |
| M-12 | 일반 문제의 종이/16px 테마 띠·새문제 heading 이동 회귀와 원본. 운영390 목록형 입력·inline 오류, 가로844×390 다음 문제 heading/본문 가시성·테마 확인                                                                                              | 긴 풀이·모든 크기·물리 터치 인증 아님                                                                                          |
| L-01 | 올림 설명을30·십의자리·일의자리0으로 한정한 source/digest 회귀, 운영 day0 읽기 문구 확인                                                                                                                                                         | 캡처는 fade 전환 중이므로 대비 판정 제외; 교재 승인 stale 링크 미조회                                                          |
| L-02 | 통합 빈칸 비교/독립홈 용어 source·로컬 확인                                                                                                                                                                                                      | 별도 fading 화면의 «내 답» 문자열을 통합 문구의 검증으로 대체하지 않음                                                         |
| L-03 | 같은 방문 미입력·rating 복귀의 원문부재 안내 source·회귀                                                                                                                                                                                         | 운영 reload 원문부재 전용 표본 미도달                                                                                          |
| L-04 | 맞는지 살펴보기·기억 복습·먼저 알아둘 개념 source·운영 일부 표기 확인                                                                                                                                                                            | 아동의 실제 용어 이해 관찰 없음                                                                                                |
| L-05 | 서버 today/due 상대날짜·간격사다리 제거 회귀. 운영 rating 모레/3일뒤 표시와 저장 due 대응                                                                                                                                                        | 운영 도감 상대날짜 전체는 미검수                                                                                               |
| L-06 | **운영 통합 xc6 완료** 학습 홈으로+다음활동, 다음활동→정상 예습→코스 연결 확인. standalone H01은 오늘의 복습으로 유지                                                                                                                            | 모든 완료/불가 상태 조합 전수 아님                                                                                             |
| L-07 | launcher 흐름·120px 여유 source/원본. 실제 test_s 390 학습 화면에서 입력/확인과 겹치지 않는 표본 확인                                                                                                                                            | 일반학생 새 로그인·실기기 터치 미실행                                                                                          |
| L-08 | 5개 숫자 범위 문제의 후보 검산 source/회귀. 운영 두 번째 문항의 후보34/22/33/37이 본문 수에 속하고 정답37 포함                                                                                                                                   | 두 번째 문항은 미제출; 옛 저장 보기/전체 은행 품질 인증 아님                                                                   |
| L-09 | a 같은날 내용/답/mode/figure identity 제외·고갈 fallback 회귀. b **실제 새 memory v1 seed2/5카드**, 전날 unmarked 보존, 예·truth·풀이 수치 및 completed replay identity 저장 확인. q2 두 오답→풀이→알겠어요, q3 정답, 나머지 정상 모름/이해 처리 | 코스 중복의 운영 여러 세션·무한 비중복 보장 아님. v1 조사 오타는 아래 후속 reader 관문으로 분리                                |
| L-10 | 404 재원/교재담당 범위 안내·200빈자료 구분 source/원본                                                                                                                                                                                           | 이번 운영에서 교재 QR 404 원인 재검수 안 함                                                                                    |
| L-11 | 교사 미리보기 이름·독립/통합 차이·저장없음 source/원본                                                                                                                                                                                           | 운영 전체 미리보기 재현 안 함                                                                                                  |
| L-12 | 진도/다시풀기14px·구현자 실제200% 두 PNG 대조, 운영 지도 가독성 표본                                                                                                                                                                             | 실제 아동 가독성·운영 브라우저200% 미검수                                                                                      |
| L-13 | 기억/코스 disabled 중립면 source·회귀·원본, 운영 저장 중 disabled 표본 확인                                                                                                                                                                      | 모든 대비조합/forced colors 실기기 미검수                                                                                      |
| L-14 | course 이름=번호+실제값·MathML 유지 회귀. 운영 q2 AX 버튼 «1번34/2번22/3번33/4번37» 확인                                                                                                                                                         | 실제 VoiceOver 발화 미실행                                                                                                     |

추가 chips390 overflow는 `.chipInput > div`의 flex-wrap과 원본 `390-chips-input.png`에서 한 줄 충돌 해소를 확인했다. 날짜 역행 guard는 `fading/state.ts`의 평가·세션 검증 뒤/장기쓰기 전 비교가 그대로이며 unit+실제 route mock의 409·저장0/정상200/영수증 보존 회귀를 실행했다. 라이브 재전송으로 검증하지 않았다.

## PNG·예습·미검수 범위

외부 루트 `/Users/pss/Desktop/creative/display-survey/srs-remaining-20261022/`의 **원본 PNG61장**을 직접 열었다. `independent/visual-review.json`에 경로·SHA256·관찰 범위를 기록했다. 구현자 JSON만으로 화면 합격을 내리지 않았다.

- 예습 실제 source는 `PREVIEW_CARDS`의6장 + fraction4장 + geometry4장 = **14장**. `5-2-1-1~6`, `5-2-2-1~4`, `5-2-3-1~4` 모두390 뜻/그림·예/연습 두 면을 직접 열었다. sticky header가 worked example을 가린10장은 별도 worked viewport를 열었다. 수직선 방향·경계, 올림/버림/반올림 자릿수, 분수의 전체1/조각수·단위, 합동의 회전/같은넓이 반례, 대응변/각, 선·점대칭 수치와 그림을 대조했다.
- 추가23장은 최초/완료/short홈, chips, 실제200% 상하 viewport, teacher계획/혼합기록, 도감, relearn, 교재404, inline validation, 긴문제 그림·가로풀이tail/알겠어요/다음heading이다.
- 구현자의 44 course scenarios·47 experience captures·policy 추가 상태는 전체 메타데이터와 source를 읽되 **독립검수자가 그 모든 PNG를 열었다고 주장하지 않는다**. long 결과의 정확19px tail Range/hit는 이전 큰 컨테이너 측정보다 적절하다. 잘린 fullPage200% 사진은 최종 증거가 아니며 tabs.setZoom(2)/getZoom==2와 실제 viewport 캡처 두 장을 사용한다. viewport 반감이나 CSS zoom을200%로 인증하지 않는다.
- equivalent fractions/decimal/mixed·unhinted self-check·legacy list·단위·중복·relearn 표시·14일 FSRS는 순수 함수/합성 fixture 경계를 지킨다. 14일 주입이 운영14일/아동1주 관찰이 아니며, relearn flag를 fixture가 준 것을 서버 자연 도달로 세지 않는다.
- 학부모 경로: 시험성적표/achievement/개발 ParentSheet는 존재하나 조사한 SRS탭/achievement 입력에는 explorer/fading 원천 연결이 없다. 발행/인쇄/전송을 수행하지 않았고 서비스 전체 출력부재로 확대하지 않는다.

최종 후보 통지 뒤 L09b 원본 **15장**을 추가로 직접 열었다(`variant-visual-review.json`): 다섯 카드 각각390 풀이·390 참거짓·1440 두 번째 보기다. 표시된 수와 기준/계산/해설이 일치하고 글·보기·알겠어요 단추가 가려지지 않았다. 총 직접 열람은 앞선61장+신규15장=76장이며, writer의 전체65장 전수 열람이 아니다. 이15장도7c3 template의 seed1/2 캡처이고 d067 이후 재렌더가 아니며, 최신 source와65개 public activity byte 대응은 별도 `ctx_b3` 관문의 검산 결과다. seed9의2.0 표기는 정적 검사만 있고 해당 운영/브라우저 캡처는 없다.

## 운영 경로·발견과 수정 관문

운영 전에 기존 로그인·학생 id·today/offset·기기·계획·분량·rev를 새로 확인했다. 사용권은 리드 `msg_0f69d0dab556`과 후속 갱신/조건부 grant에 근거한다. 계정은 test_s 하나이며 원 teacherplan은 `5-2-1-1 / dailyQuestionCount 10 / enabled true`, 외부분량은 default15, guide는 marten이었다. 초기 논리 백업 rev167과 정상 UI 스냅샷 `independent6013-before-reset`의 payload 대응을 확인한 뒤 **SRS 전체 초기화1회**를 수행했다. **restore는0회**다. 원 계획 값은 정상 test-console UI로 다시 저장했으며 정상 guide 선택·학습만 진행했다.

- Oct22: 개념 day15활동 첫15정답,5카드 수집·별5·완료일/원정1개. 완료홈 제목·guide5종·교사 공식 첫시도15/15·남음0을 대조했다.
- Oct23(offset+1): 새 memory에 `{version:1, seed:2, cardIds:5개}`가 기록되었다. 전날 session은 unmarked다. 첫 활동 모름→풀이, 둘째 예 문제 두 번 오답→같은 숫자의 풀이, 셋째 참거짓 정답, 나머지12활동 모름→풀이→알겠어요로15/15를 마쳤다. **첫정답1, shown14, hinted/next/unresolved 빈 배열**, 카드별 일정과 v1 identity가 보존되고 원정 bonus3만 더해 별8이다. 5개 카드의 seed2 예풀이를 DOM과 원본 PNG로 검산했다.
- H01 대상은 기존 catalog에서 실제 `e5-2-1-1-c1`, `e5-2-1-2-xc5`를 열어 read/step2/3/4/비교/rate를 정상 UI로 마쳤다. 첫 묶음 step4의 세 번째 빈칸에 방향을 쓴 오답은 비교 화면에서 **다름→어려움**, 둘째는 **알맞음**이다. 짧은 확인은 실제 ready 창을 닫기만 했고 채점하지 않았다. read marks/장기 review/별도 relearn을 섞지 않는다.
- Oct24(offset+2): fresh rev73 **원본 payload를 변경하지 않고** exact7f의 순수 `serverFadingDailyPlan`/`expeditionDto`에 후보 날짜만 넣어 course10 공급을 예측했다. 리드 조건부 grant 후 정상 하루뒤1회로 실제 GET도 course10+recall3, default15/over0/미배정2를 확인했다. 정상 홈이 recall을 먼저 제시하므로 리드 `msg_3ed07eec0d63`의 명시 허용으로 필수 `e5-2-1-1-xc6` 3문장과 정상 예습 읽기/연습을 거쳐 course에 도달했다. 그 외 새 주제나 날짜를 추가하지 않았다.
- course 첫 문항은 «27,25,41,21,42 중25이상 모두쓰기»였다. 첫답 `abc` HTTP400(`91958.1398`) 전후 rev80/payload 동일, 그 뒤 `25`는 정상 오답200(`91958.1400`, rev81). 후속 `abc` HTTP400(`91958.1403`) 전후 rev81/payload 동일, `42,41,25,27`은 순서 무관 정답200(`91958.1405`, rev82), 다음 버튼의 done200(`91958.1406`, rev83)으로 q2/5에 도달했다. 첫 attempt는 오답 그대로이고 별도 followUp만 정답/done이다. 추가 문제는 제출하지 않았다.

M11 잔여 결함은 `recovery-home.png`/rev5와 source에서 확인해 구현자에게 전달했다. `7f68007dd` 전체5파일 diff, **실제 producer→strict contract→local source→Memory→Home** 9시험, 원 RED/GREEN/관련 로그, 실제 prerequisite resolver와 부모 props를 교차검토했다. null-course일 때 개념제목을 문제진도로 쓰는 두 fallback을 제거하고 실제 courseSectionId 또는 non-explorers practice만 남기는 변경이다. 제품 계약·권한·일정·기록·채점 변경은 없다. 운영7f에서는 이미 학습이 진행되어 실제 courseSectionId가 있으므로 **보존 분기**만 검수했다. 생략분기를 증명하려고 추가 reset/restore하지 않았다.

새 v1 memory의 `g5-more-than` 풀이에 **«초과은»·«큰 수만가»**가 있었다. 수학/채점 오류는 아니나 리드에게 비차단 문구 결함으로 전달했다. 리드는 기존 v1 불변을 유지하는 별도 reader-first version2 작업을 배정했다.

**후속 reader R 코드 관문:** `497dc74f3a6be66e0875ec0e018000b647a143ab`(parent7f)의 전체7파일 diff/보고/원본 로그를 읽기 전용 대조해 추가차단0을 전달했다. strict identity만1|2로 확장하고 범위 카드의 explanation/note에서 v2 조사만 고치며, v1 branch와 공통 수학·seed·cardIds·정본 원천은 그대로다. R의 engine 신규 memory writer는 **여전히1**이다. exact7f loader로 v1 3,200 JSON byte비교, 네 범위용어 각각640씨앗의 독립수학/조사, oldstrict reader의2거절, v1/v2 완료·replay·일정/별 불변, 실제 route 인증/저장소 mock 및 idempotency를 시험 구조와 로그로 확인했다. 구현자 RED2/9·GREEN11/11·관련10파일143 PASS를 **내가 재실행한 수치로 세지 않는다**. 이 관문은 운영7f 증거와 다르다. 리드는 `msg_56b88896efa3`에서 R exact SHA의 fresh GitHub Vercel success(updated **2026-10-22T00:20:20Z**, target `Gd39jmBSCbZrSxDb7hThbMwJ5BVs`)를 확인한 뒤에만 writer 편집을 허용했다고 통지했다.

**후속 writer W 코드 관문:** `2fee084301e67f94ec7bbd4d4a67667efb6175f6`의 직접 부모가 R임을 확인하고 전체4파일 diff·[완결 보고](srs-review-grammar-v2-20261022.md)·원본 로그를 읽어 추가차단0을 전달했다(`msg_68445c3e0f82`). 제품 변경은 `definition-cards.ts`의 `applyDefinitionAction`에서 **새 memory**의 `reviewVariant.version`을1→2로 바꾼 한 줄이다. 열린 회차는 앞의 조기반환을 따르며 v1/static identity를 바꾸지 않는다. 기존 route=memory·5개 allowlist·이미 공부한 카드 필터, 첫학습 filler·unit/repair, seed/cardIds·수학·정본 원천·계약은 무변경이다. unit/실제 route mock에 신규v2·열린v1 보존, 지원 밖 카드만 있는 memory의 static 보존, 네 번의 due 복습/완료일 replay 대조가 있다. R에서 RED3실패/12통과, W 관련10파일144 PASS와 type/lint/affordance/commit 원로그를 읽었으며 **신규 독립 시험·운영 호출0**이다. R success00:20:20Z 뒤 writer 회귀00:29:12Z/commit00:30:39Z 순서와 기존 세 자료의 보존 해시도 대조했다. v1의 옛 조사 오타는 역사 기록과 함께 유지되고, 새 v2의 범위 풀이 문구만 고친다.

## 브라우저·입력 도구의 한계

Orca의 기존 Chromium/profile/login만 사용했다. 최초 학생 page에서 숨은 탭의 `requestAnimationFrame` 대기를 써서 runtime timeout이 발생했고 snapshot/비초점·초점 switch도 실패했다. 이 callback은 로컬 choice 선택뿐으로 answer POST를 보내지 않았다. 리드의 별도 허용으로 **같은 기존 profile에 recovery page1개**를 만들었고 fresh rev5에서 q1 한 번 저장/q2 미제출을 확인했다. 원 stalled page는 건드리거나 삭제하지 않았다.

일부 `orca click`/key는 성공 응답에도 UI가 진행하지 않아 리드가 허용한 **실제 enabled DOM button의 scrollIntoView+hit 검사 후 click**을 사용했다. React 내부 handler/상태 호출·임의 API POST/SQL/payload 쓰기는0이다. snapshot 이름에 없는 장식/공백 때문에 helper가 동작 전에 멈춘 경우는 실제 DOM 문자열을 읽어 수정했다. 저장 중에는 새 snapshot/backup/network로 완료를 확인했고 같은 평가를 재전송하지 않았다. 자동화 입력은 물리 마우스·키보드·스크린리더 통과와 다르다.

390/844 viewport는 Orca `viewport --scale 1`이며 `mobile:false`다. 실제 휴대전화/키보드/브라우저200%/OS reduced motion으로 부르지 않는다. 새 이동 직후 빈 `alert` DOM은 뒤 snapshot에서 회복되었고, Oct24 도구판 reload 뒤 빈 DOM은 같은 page의 일반 `/learn` 탐색1회로 회복했다. console error0/GET200였으므로 서버 장애로 판정하지 않았다. 잘못 추정한 `/api/learn/math-srs/daily` 읽기1회403 뒤 관찰된 올바른 `/api/learn/fading/daily`200을 사용했다. 쓰기는 없었다.

## 최종 원장·사용권 반환

사용권 반환 전에 아래 값을 새 read로 확인하고 `/learn` 홈의 최종 PNG를 직접 열었다. 자체 teacher page는 닫았고 원 teacher/원 stalled student tab은 보존했다. **반환 후 browser/student API 호출0**이다. 화면에 정상 추가한 미래 Oct23~24 기록과 미완료 course는 유지했다. 검수 편의를 위한 원본 복원·추가 reset·옛 코드 실행·공유 DB 편집은 하지 않았다.

| 항목                                | 최초 백업                     | 최종 백업                              |
| ----------------------------------- | ----------------------------- | -------------------------------------- |
| revision / 논리 SRS 행              | 167 /1                        | 83 /1 (전체reset 뒤 새 기록)           |
| offset / today                      | 0 /2026-10-22                 | 0 /2026-10-22                          |
| clock 작업                          | —                             | 0→1→2→0, 정상 UI3회                    |
| reset / restore                     | —                             | 1 /0                                   |
| teacherplan / 외부quota             | 5-2-1-1,10,true /default15    | 값 동일 /default15; final over0        |
| guide                               | marten                        | marten; 정상선택 후 chosenAt은 새 시각 |
| course sessions/완료/first attempts | 6 /6 /30(정답26)              | 1 /0 /1(오답1)                         |
| course followUps/done               | 4 /4                          | 1 /1 (두 번째 답 정답)                 |
| fading concepts/reviews/receipts    | 4 /7 /7                       | 3 /3 /3 (hard/good/good)               |
| relearn items/graded                | 8 /13                         | 10 /0; 별도 채점 없음                  |
| explorer 완료일/history/수집        | 2 /2 /5                       | 2 /2 /5                                |
| 별 / 누적별 / profile level         | 11 /14 /1                     | 8 /8 /0                                |
| expedition awards                   | 4                             | 2; Oct24 active mission1/10            |
| 강의 열람                           | 0                             | 0                                      |
| 기기                                | 1685×875,dpr1,full,off,online | 동일; prefers-reduced-motion=false     |

plan `configuredAt`은 재설정한 `2026-10-21T21:10:14.214Z`, guide `chosenAt`은 마지막 marten 선택 `2026-10-21T22:09:55.194Z`다. reset 전 시각/revision/옛 학습 기록을 복원했다고 주장하지 않는다. H01 두 묶음의 정상 추가로 Oct23 완료 plan은 quota15를 유지하며 **over7**이었고, 이는 외부quota를 바꾼 것이 아니다. 최종 active course의5문제 첫 묶음과 미션 목표10도 구분한다. 초기 기존 미래 기록은 Oct25까지였고, 최종 새 미래 기록은 Oct24까지다.

- 최초 payload SHA256: `3f4f052eafee1a7b83190d14749ef0e2dc9f5123b703f792f4506e94ac6f2d46`.
- 최종 payload SHA256: `e142c478956df880814b93803cedf0a5a69d0b06d3ba895a8f18640e74f345d4`.
- 최종 정규화 백업 파일 SHA256: `249ba5c41b7a1e70285ce3a62658aec3efdb34c5afcd56c797efbeda0ae2a26c`.
- 원 학생 page: `60725ad7-07ed-45e3-a1cc-474362992ab4` 보존. recovery: `873fdaf4-9321-4f5c-8e6e-be715ae52ed6`, 동일 기존 test_s profile. 실제 tab metadata의 owning worktree는 **`603a76a7-884d-48ad-a370-c4eedfd79084::/Users/pss/GP/noname`**다. 독립 repo 소유로 추정하지 않는다. 이 보고 작업의 worktree 정리가 살아 있는 학생 탭을 닫는 근거가 아니다.

## 증거 위치와 남은 경계

비공개 학생 원본·network·UI 스냅샷은 저장소 밖 `/Users/pss/Desktop/creative/display-survey/srs-remaining-20261022/independent/`에만 보관했다. 보고서/회귀 fixture에 payload·학생 식별 행을 복사하지 않았다.

- `initial.backup.counts.json`, `final.backup.counts.json`, `runtime-actions.json`: 최초/최종 수치·날짜·설정·승인 작업 원장.
- `normal-ui-post-ledger.json`: 중복 network ID를 제거한 관찰된 POST85개. 초기 page의 계획 재설정/첫 guide/첫 읽기/첫 답 네 이벤트는 해당 before/after 백업 근거이고 이 network 목록이 모든 전송 원문을 완전히 수집했다고 주장하지 않는다.
- `runtime-visual-review.json`: **직접 연 29개 운영 PNG** 경로/해시/캡처 한계. 앞의 구현자 원본76개와 합해105개 파일을 직접 열었지만 모든 구현자 캡처·모든 운영 상태의 전수는 아니다.
- `final-evidence-integrity.json`: 최종 정리 시 세 visual manifest의 **105개 파일 SHA256이 모두 일치**함을 확인했다. 새 캡처·브라우저 호출 없이 기존 증거 파일의 무결성만 검사했다.
- `h01-*-stage2/3*.snapshot.json`, 해당390 PNG: 원 두 대상의 빈칸 단계와 혼합문장 그림생략.
- `day1-q*-before/solution.snapshot.json`, `day1-complete-backup.raw.json`: 새 memory seed2, 표시/풀이/보존 기록. q8의 v1 조사 오타도 원문 보존.
- `day2-course-*-backup.raw.json`, `day2-course-network.json`, `day2-course-invalid-focus.json`:400 두 번 저장0, 정상 first/followUp/done, 초점·입력 보존.
- `day2-course-q2-geometry.json`와 가로 PNG:844×390에서 다음 문제 rect y216.8..304.8, heading y183.3..206.3. 앞 `day2-course-landscape.png`는 오류 입력 영역이고 `solution-landscape.png`는 재시도 정답 feedback이지 긴 풀이 캡처가 아니다.
- `next-day-prediction.json`/`predict-next-day.ts`: 원본 불변의 로컬 날짜 예측; 별도 실제 GET과 구분.
- `grammar-reader-gate.json`: R exact diff/보고/원본 로그 hash 대조; 신규 시험/운영0.
- `grammar-writer-gate.json`: W exact4파일 diff·신규 writer/기존 회차 보존 경로·회귀/원본 로그 hash 대조; 신규 시험/운영0.

short 완료홈·short guide, 운영 긴 문제/풀이, 실제200%/VoiceOver/OS reduce/물리 터치, 모든14 예습카드의 운영 재현, 아동1주 관찰은 미검수다. 도달시키려고 외부quota/상한/메뉴/교사계획을 바꾸거나 추가날짜/새계정을 만들지 않았다. 날짜 역행 guard는 기존 unit/실제 route mock409 저장0 회귀만으로 검증했으며 최종 offset0에서 미래 학습 기록에 다시 답을 보내지 않았다.

추가 원본 판독에서 `self-unhinted.png`/`legacy-unhinted.png`는 다음 문제2/5이고 `390-memory-complete.png`는4단계 대조 화면이었다. 파일명만으로 self-check 입력 화면이나 장기평가 저장완료를 증명하지 않으며 순수 저장회귀·별도완료근거와 구분했다.
