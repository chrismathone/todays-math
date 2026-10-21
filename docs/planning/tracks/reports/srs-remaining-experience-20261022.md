# SRS remaining experience — 2026-10-22

담당: experience · `task_44342a6b16e5` / `ctx_e9a97dd1037b`.
시작점 `6c26a17c925196e82ef4c760fc10d3fe75ab3101`. 기존 책·지도·가이드·세션 디자인과 저장 계약을 유지하는 문구/레이아웃/연결 수정이다. build, push, 배포, DB, 운영 로그인/계정, OS 전역 설정은 실행하지 않았다.

## 변경과 범위

| 항목                         | 이 커밋의 변경 / 통합 시 확인할 경계                                                                                                                                                                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| M11                          | `DailyStudy`가 문제 진도와 오늘 개념 묶음을 별도로 명명한다. 실제 `next` 활동의 source title/section을 읽으며 선행 학습을 했다는 문장을 만들지 않는다. 완료 제목은 기존 완료 활동 기준을 유지한다.                                                                                   |
| L01                          | `g5-round-up`의 설명 한 필드만 “30을 십의 자리까지 올림할 때는 일의 자리가 0이므로 30 그대로야.”로 정확히 한정했다. 아래 source/digest 점검 참조.                                                                                                                                    |
| L02                          | “내가 넣은 칩” → “내가 채운 답”; 별도 홈도 “단서를 지우며 빈칸 채우기” 등 입력 방식에 중립적인 문구를 쓴다.                                                                                                                                                                          |
| L03                          | 이번 방문에서 넘긴 빈칸은 “쓴 답이 없어요”. 평가 화면에 복귀하여 저장 원문이 없는 경우는 “이전 답은 표시되지 않아요”. 저장된 원문이 있는 답은 그대로 사용한다.                                                                                                                       |
| L04                          | 탐험 화면의 “경계 살피기” → “맞는지 살펴보기”, 표시 제목 “기억 퀘스트” → “기억 복습”. 내부 제목/종류/집계는 유지. 도감의 “먼저 알아둘 개념” 두 곳은 coordinator가 policy 담당에 넘겼다.                                                                                              |
| L06                          | 통합 기억 화면의 복귀는 “학습 홈으로”. 실제 다음 활동이 존재할 때만 복귀 버튼을 보조색으로 두고 다음 활동을 주 행동으로 유지한다. 별도 fading의 기본 복귀 문구는 유지한다.                                                                                                           |
| L07                          | 테스트 도구를 고정 떠 있는 버튼에서 본문 뒤 일반 흐름으로 옮겼다. 기존 서버 test_s gate/서랍은 유지. 직접 PNG 검수에서 발견한 desktop fixed action bar 간섭은 기존 세션과 같은 120px 여유 및 scroll-margin으로 보완했다. 아래 focused 검수에서 전체 rect/키보드/실제 hit를 확인했다. |
| L11                          | 별도 `FadingPreview` 설명을 “기억 학습만 미리 봅니다 · 저장되지 않음”으로 한정. 교사 메뉴의 이름/범위 설명은 policy 담당에 전달되어 이 커밋에는 없다.                                                                                                                                |
| L12                          | 진도판 `progressNote`와 완료 날짜 다시풀기 안내 `reviewNote`를 기존 보조 글자 크기 14px로 맞췄다. 미사용 full variant `planNote`는 변경하지 않았다.                                                                                                                                  |
| L13                          | 기억 입력/주 버튼의 disabled 상태를 기존 연한 면·회색 글자로 구분하고 그림자를 없앴다. 오늘 공부 시작 disabled도 기존 보조 토큰을 쓴다. 코스 화면 상태는 course 담당 영역이다.                                                                                                       |
| L14                          | 기억 cards/chips의 입력과 빈칸 이름을 실제 접근성 트리로 점검했다. 코스 정답 선택 이름은 coordinator가 course 담당에 전달했다. 실제 VoiceOver 검수는 수행하지 않았다.                                                                                                                |
| legacy chips overflow        | `.chipInput > div`에 flex-wrap을 허용했다. 모바일 전체 폭 버튼과 최소 폭 입력이 한 줄에서 충돌하던 원인이다. 최종 390/1440 입력/완료 캡처에서 문서 가로 넘침 0.                                                                                                                      |
| 추가 발견: 회차 중 인증 실패 | `ExplorerConceptMemory`가 열린 `FadingSessionView`에 기존 `onAccessFailure`를 전달하지 않던 연결을 보완했다. 초기 읽기와 동일한 소유자 정책으로 401/403/학생 변경을 보낸다. 내용 409는 재조회하며 원래 쓰기를 재전송하지 않는다. coordinator가 별도로 범위를 승인했다.               |

## L01 source / digest 대응

`definition-content.ts`의 해당 행을 수정 전후 비교했다. ID `g5-round-up`, 순서, definition/pieces/words, `31 → 40 / 39 → 40` 예제, 거짓 문장 “30을 십의 자리까지 올림하면 40이다.”와 `truth:false`, prerequisite `g5-round`는 동일하다. `conceptSentenceFixes.ts`의 해당 덮어쓰기는 단어 선택지에만 적용되므로 설명을 덮지 않는다.

`src/lib/math-srs/preview/cards.ts`의 연결은 같은 definition을 참조한다. Fading catalog는 별도 `CONCEPT_BLANK_BANK`와 trap table로 만들어지며 이 설명을 입력으로 쓰지 않는다. 따라서 bank/정의/함정 표를 재생성하지 않았다.

`src/lib/textbook/concepts.ts`의 explorer-card target은 전체 definition card를 반환하고 `canonicalHash(resolveConceptTarget(...))`로 검토 당시 digest를 확인한다. 이번 설명 변경은 **이전 설명으로 승인된 target digest와 달라져야 한다**. 회귀가 실제 `definitionCard`와 canonicalHash로 이를 확인한다. 기존 교재 링크가 있다면 정상적으로 stale 검토 대상이 되며, 이를 최신으로 위장하는 재생성/검토표시 변경은 하지 않았다. 저장소에서 이 ID의 별도 승인 링크를 찾지 못했지만 운영 DB 존재 여부는 읽지 않았으므로 단정하지 않는다.

## 회귀와 검사

- `red.log`: M11, L02, L03의 신규 회귀 3개가 수정 전에 실패했다.
- `access-red.log`: 열린 통합 기억 화면에서 401 콜백이 소유자에 전달되지 않는 회귀가 실패했다(다른 4개는 통과).
- `regression-final.log`: 관련 11개 파일 **167개 테스트 통과**, `--maxWorkers=3`. 초기 읽기/회차 중 401·403·STUDENT_CHANGED, 내용 충돌 재조회, 같은 요청 재시도/중복 평가 억제, 직렬화 복귀, 이전 탭의 닫힌 회차 쓰기 거절, guide 성공·실패·복귀, test_s gate를 포함한다.
- 변경 TS/TSX와 fixture ESLint 통과. Prettier와 `git diff --check` 확인.
- 전체 `tsc --noEmit --incremental false`: 관련 변경 오류는 없지만 전체 성공은 아님. 기존 QA `arithmetic-angle-presentation-verify.ts:36`의 중복 Playwright Page 타입, `paperProbe.tsx:174`의 중복 PostCSS 타입/과도한 비교 깊이, 총 3진단. `tsc.log` 보존; 패키지/tsconfig 우회 수정 없음.
- Next 설치본의 CSS 및 Server/Client Components 가이드와 React review skill을 읽고 검토했다. 의미 없는 새 effect나 저장 필드를 추가하지 않았다.

## 실제 쉘 검수

증거 디렉터리: `/Users/pss/Desktop/creative/display-survey/srs-remaining-20261022/experience/`.
QA 원천: `scripts/qa/srs-remaining-experience/`.

StudentAppShell + StudentMathExplorers + 실제 globals/KaTeX/Pretendard를 사용했다. 메모리 자료/일일 계획은 실제 local source와 plan engine을 사용하며, 14일 여정/guide 저장 결과/완료 workload는 표시 fixture다. 로그인/서버/DB 검증으로 확대하지 않는다. source snapshot은 fixture의 sessionStorage에만 저장하여 reload를 검증한다.

Coordinator의 단일 엔진 허가 후 Chromium **151.0.7922.34**(설치 executable의 Info.plist도 확인), 임시 격리 profile, 127.0.0.1 Vite 서버 한 개로 실행했다. 일반 외부/API 요청은 차단했다. replay와 세션 401만 Playwright route에서 합성 응답하므로 실제 API로 나가지 않았다. 최종 결과는 41 PNG, 예상하지 않은 pageerror/console.error 0, 차단된 외부/API 요청 0이다. 401 대역의 예상 console error 한 건은 `expectedErrors`로 분리했다. `browser-results.json` 및 `browser.log` 참조.

각 PNG를 직접 열어 글줄/버튼/수식/가이드/지도 상태를 확인했다. 비확대 캡처의 수식 렌더 준비 및 font ready를 기다렸다. 일부 fullPage 사진의 sticky header/하단 bar 위치는 촬영 시 스크롤 위치를 반영한다. 실제 클릭/초점 검증과 구분한다.

| 증거 이름 (각 `.png`, 아래 두 폭 공통)        | 관찰                                                                                                                                                                             |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `390-first`, `1440-first`                     | 두 title의 출처를 별도 명명, 새 학습 이력 주장 없음                                                                                                                              |
| `{390,1440}-{done,mixed,recall,short}`        | 완료된 활동의 단원명, 개념/문제 수, 선택 가능한 guide                                                                                                                            |
| `{390,1440}-guide-{success,failure}`          | 성공은 재방문 유지, 실패는 방문 중 선택만 유지하고 새 provider 방문 때 저장된 담비로 복귀                                                                                        |
| `{390,1440}-progress-14days`, `*-replay`      | 13–24일차 → 이전 → 완료 1일차 Enter → replay → Escape → 원래 버튼 초점 → 다음 판; 390 touch 양방향 책 전환도 CDP 검증                                                            |
| `{390,1440}-step{2,3}-zero-blanks`            | 빈칸 없는 문장에는 입력창이 없다                                                                                                                                                 |
| `{390,1440}-step{2,3}-keyboard-retry`         | Enter로 입력 문장까지 이동, 오답 안내, Esc 다음 Tab이 입력을 벗어남, focus ring                                                                                                  |
| `{390,1440}-memory-{input,restored,complete}` | reload 동일 회차, 넘긴 답 표시, 완료 4/4, 비교 수식                                                                                                                              |
| `{390,1440}-completion-actions`               | 학습 홈 보조 행동과 다음 활동 주 행동                                                                                                                                            |
| `{390,1440}-chips-{input,complete}`           | legacy 입력 폭, 입력/단계 마치기 disabled 구분, 완료 4/4                                                                                                                         |
| `1440-session-expired`                        | 열린 회차 give-up의 합성 401 → 기존 owner의 `/learn/login` 요청을 local router가 기록; 실제 로그인/이동 없음                                                                     |
| `1440-platform-reduced-motion`                | OS 설정을 바꾸지 않고 browser media를 reduce로 에뮬레이션; matchMedia true, board buttons animation none / transition 0s                                                         |
| `1440-browser-200-percent`                    | 실제 확장 tabs.setZoom(2), getZoom()==2, 1440 viewport에서 innerWidth 720과 DPR 2, 문서 overflow 0. **PNG는 fullPage 계산에서 오른쪽이 잘려 전체 시각 검수 증거로 쓰지 않는다.** |

메모리 접근성 트리 4개: `{390,1440}-{memory,chips}-accessibility.yml`. 입력 label과 빈칸/단계/버튼 이름을 읽을 수 있다. 실제 스크린리더 발화/운영 접근성 전체 점검의 대체물은 아니다.

첫 검수의 브라우저/서버는 `finally`에서 모두 await 종료, 임시 profile도 삭제했다. 사용권을 반환한 뒤 아래 집중 검수의 새 허가까지 서버/브라우저를 실행하지 않았다.

## 집중 재검수와 실제 한계

41장 직접 열람 중 desktop launcher와 200% fullPage 촬영의 잔여를 발견해 coordinator에 보고했다. 별도 짧은 단일 엔진 허가를 받아 `verifyFocused.mjs`로 **그 두 항목만** 다시 검증했다. 기존 41개 행렬은 반복하지 않았다. 최종 소스의 120px 하단 여유와 scroll-margin은 TestConsole 버튼에만 적용하며 일반 학생/StudentAppShell 높이를 바꾸지 않는다.

- `{390,1440}-{memory,chips}-launcher-focused.png` 4장: 실제 Tab 순서로 launcher까지 이동, launcher 전체 rect와 고정 학습 바가 겹치지 않음, 중심과 pill 안쪽 네 모서리(가로16px/세로8px inset) hit, 도구 열기/닫기, 하단 학습 버튼 초점/Enter 행동을 확인했다. desktop memory의 launcher 하단780.23px < bar 상단831px, chips 하단745.38px < bar 상단823px이다.
- `200-percent-viewport-{top,bottom}.png` 2장: **실제 탭 zoom2, CSS zoom 미사용, innerWidth720/DPR2, document overflow0**. `Page.captureScreenshot`의 viewport surface를 clip/fullPage 없이 촬영하여 bitmap이 전체1440px을 담는다. 위/아래 스크롤 두 장을 직접 열어 양쪽 책 면, 글줄, 가이드, “오늘 공부 시작” 및 하단 탐험/도감이 읽히는 것을 확인했다. 첫 fullPage 잘린 PNG는 진단 기록으로 남기고 이 두 장이 최종 확대 시각 증거다.
- `focused-results.json`: 4개 입력 상태의 rect/Tab/hit, zoom 측정, 예상 밖 console/pageerror0, 외부/API 요청0, `closed:true`. 시험 도구 GET도 local route가 합성한 화면용 응답이다. 실제 API는 호출하지 않았다.
- 집중 검수도 browser/server await 종료와 임시 profile 삭제 후 즉시 사용권을 반환했다. `captureZoomViewport.mjs`는 준비만 한 코드가 아니라 이 집중 검수에서 실제 실행한 공용 촬영 함수다.

총 **47개 캡처**(첫41 + 집중6)를 직접 확인했다. `evidence-index.json`은 파일 hash와 관찰을 보존하며, 처음 발견한 두 결함은 최종 집중 증거로 연결한다.

남은 한계는 실제 VoiceOver, 물리 터치 단말, OS 전역 reduced-motion 전환, 운영 auth/DB concurrency다. 각각 접근성 tree, CDP touch, media emulation, local source/network 대역 회귀만 수행했다. 실제 200%는 첫 홈과 스크롤/중요 버튼까지 확인한 것이며 모든 화면/모든 OS 확대 조합의 인증은 아니다. 교사 preview 명칭/도감 문구는 policy, 코스 answer label/disabled는 course의 최종 보고/통합 확인을 연결해야 한다.

## 운영 완료-home 재현 절차 (준비만, 미실행)

1. 통합 커밋의 배포 Ready와 최신 reader floor 충족을 먼저 확인한다. 기존 로그인된 승인 시험 학생 화면에서 시작한다. 새 로그인/실제 학생 초기화/직접 DB/OS 시계 변경을 하지 않는다.
2. 학습 전 현재 문제 진도와 오늘 활동 목록의 단원 이름, 계획 done/total, 현재 guide를 기록한다. 로컬 fixture의 예시를 운영 상태로 주입하지 않는다.
3. 정상 “오늘 공부 시작”으로 배정 활동을 마친다. 틀린 코스 문제는 기존 한 번 더/풀이/알겠어요 흐름을 따르고, 기억 회차는 비교와 느낌 선택까지 끝낸다. 아직 열려 있는 회차/다음 활동이 있으면 완료-home 도달로 기록하지 않는다.
4. **done 또는 short**로 실제 홈에 도달한 직후 “오늘 공부를 마쳤어요”, 오늘 한 개념/문제/활동 수, 완료 단원명을 읽는다. 다음 선수 target로 넘어간 이름이 아니라 완료 활동의 source title/subtitle(기억은 section)과 대응해야 한다. 390과1440에서 전체/viewport 캡처를 각각 보존한다.
5. 완료-home의 길잡이 그림을 키보드로 열고 현재 선택/5종 선택지/확인 후 홈 복귀를 확인한다. 저장 성공 검증은 승인 시험 계정에서만 수행하고, 실패를 만들기 위해 운영 서버/계정/네트워크 설정을 바꾸지 않는다. 저장 실패·동시쓰기·401은 이 보고서의 안전한 local fixture 회귀로 분리한다.
6. 정상 새로고침과 홈 복귀 후 완료 내용/guide가 유지되는지 확인한다. 기억만/문제만/혼합/short가 해당 계정의 자연 상태로 준비되지 않으면 “미도달”로 남긴다. 이 네 가지 로컬 캡처를 운영 증거로 대체 표기하지 않는다.
7. 12일 이상 기록이 있는 승인 시험 계정이면 이전/다음 진도판과 완료 날짜 다시풀기를 확인하고 원래 초점으로 돌아온다. 그런 계정이 없으면 local 14일 fixture 증거만 명시한다.
8. 일반 학생의 이미 승인된 별도 읽기 세션이 있다면 TestConsole 부재를 확인한다. 그 계정으로 새 로그인하거나 시험 도구 사용을 유도하지 않는다. 여기서는 normal fixture의 버튼 부재 및 서버 test_s gate 회귀만 확인했다.

## 로컬 재실행

명시적인 단일 브라우저/서버 순번을 받은 뒤에만:

```sh
QA_CHROMIUM_EXECUTABLE='/Users/pss/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' \
QA_OUTPUT='/Users/pss/Desktop/creative/display-survey/srs-remaining-20261022/experience' \
node scripts/qa/srs-remaining-experience/verify.mjs --browser-granted
```

현재 두 차례 허가 모두 반환했으므로 이 dispatch에서 재실행하지 않는다. focused 재현은 같은 환경변수로 `verifyFocused.mjs --browser-granted`를 사용하며 역시 새 허가가 필요하다. 결과 인덱스는 `browser-results.json`; 예전 실패 진단 `failure.png`/`failure-tree.yml`은 최종 41 캡처 목록에 포함되지 않는다.
