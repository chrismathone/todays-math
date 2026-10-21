# SRS M-03·M-05·M-06 독립 운영 재검수 — 2026-10-21

운영 SHA **`eeabac9bbc4b1d52bb473fbbde11d6bb3af84cef`**에서 M-03 진행 방식,
M-05 입력 요구, M-06 완료 수의 아래 도달 범위를 확인했다. **저장 모드의 최종
평가 POST가 503으로 실패하여 저장 완료 화면은 미도달**이다. 표시 확인과 저장
성공을 구분하며 전체 SRS 합격으로 확대하지 않는다.

| 항목           | 실제 확인                                                                                                                         | 남은 범위                                                                      |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| M-03           | 코스·탐험 reduce 대기와 Enter 1회 진행, full 약 2초 자동 진행, 오답·풀이 대기. 코스 대기 중 reduce 전환, 탐험 즉시 다음 중복 없음 | OS reduce, 탐험 대기 중 reduce 전환, 코스 즉시 다음 성공 표본                  |
| M-05           | 실제 cards 2·3단계의 빈칸 없는 문장에 입력창 없음. 문장 이동·Enter·Tab·3단계 실제 오답 재입력                                     | 다른 전체 콘텐츠·legacy chips 입력 경로                                        |
| M-06           | 저장 단계 2/3/4의 0→1→n, 대조·평가에서 n/n. 기록 없는 4빈칸 정답·3빈칸 전부 포기 연습의 완료 n/n                                  | 저장 평가 503 때문에 저장 완료 n/n, 저장 모드 3/4빈칸 최종 평가 조합           |
| H-01/H-02 연결 | 새 xc9 묶음 2·3단계의 3~7 수직선, 기존 이하 4단계 연습의 왼쪽 범위. 실제 짧은 코스 문항·답·풀이·다음 노출                         | urgent 두 대상 문장의 2~3단계는 여전히 미도달. 긴 다문단·도형·긴 풀이도 미도달 |

## 1. 대상·게이트·운영 경계

- 리드가 실제 main SHA와 Chromium 단독 사용권을 명시한 뒤 담당이 **gh api**로
  새 조회했다. `2026-10-21T09:27:51.568773Z` 조회에서 해당 SHA의 Vercel context는
  `success`, updated `2026-10-21T09:25:26Z`였다.
  [고정 배포](https://vercel.com/bigshols-projects/todays-math/48vbUUJ2GN6X8e1HgbDUwi2ktuLL).
  리드는 사용권 반환 전 새 SRS 배포를 보류했다.
- 깨끗한 작업트리에서 origin/main을 fetch하고 위 SHA로 FF했다. M-03
  `14e90c15dc7b80578726b1dff9d60cc9ead6229c`, M-05/M-06
  `1df25b50666990a6423c7ffbcc2b033ded7c8a59`, urgent 보고
  `9ea998aa19075e901842cd7c9ed05a627c2505b8` 포함을 확인했다.
- AGENTS/CLAUDE, medium·urgent brief, urgent 최종 보고, 두 구현 보고와 fixture
  증거, 초5 계획 결정 11·디자인 §8.25, 기존 테스트 도구 절차를 읽었다.
  Orca CLI 및 Vercel 배포 확인 skill을 적용했다. 구현자의 로컬 fixture는
  준비 자료이며 이 보고서의 운영 성공 증거로 대체하지 않았다.
- 기존 고립 프로필의 **test_s 학생 page
  `60725ad7-07ed-45e3-a1cc-474362992ab4`만** 사용했다. 새 브라우저·서버를
  띄우지 않았고 기본 프로필/Vercel 로그인 탭·다른 계정은 조작하지 않았다.
- 최초 최신 GET은 `2026-10-21T09:28:20.106Z`, rev144, offset0이었다.
  계정·학생 식별 일치와 원본 논리 백업을 확인했다. 교사 계획은
  `startSectionId=5-2-1-1`, `dailyQuestionCount=10`, enabled이며 보존했다.
  원래 viewport 1685×875, motion full, sound off, online true, OS reduce false.
- 기존 미응답 코스·완료일 다시 풀기·오늘의 다음 기억 회차·기록 없는 연습을
  사용했다. **이번 medium에서 reset 0회, restore 0회, 시계 이동 0회**다.
  제품 코드·시험·의존성 수정, build, push, 배포, 원시 SQL, 임의 학습 payload
  구성은 하지 않았다. 다른 계정·분량 정책·상한 기록을 바꾸는 요청도 없었다.

증거 루트는 `/Users/pss/Desktop/creative/display-survey/srs-medium-recheck-20261021/`.
아래 파일명은 모두 이 루트 기준이다. 전체 백업은 외부 파일에만 보존하며 메시지나
이 보고서에 전체 학생 payload·인증 비밀값을 싣지 않는다.

## 2. M-03 — DOM 피드백 이후의 진행

실제 `/learn`의 코스 기존 5문제 회차와, 진도판 2일차 **지난 학습 다시 풀기**의
탐험 활동을 사용했다. 탐험은 `reviewOnly`이며 일반 신규 탐험 전체 경로를 검수한
것으로 간주하지 않는다. `timeline.js`의 MutationObserver는 화면의 정답 피드백과
문제 내용 변경 시각을 기록했다. 네트워크 저장 대기와 DOM 이후 시간을 섞지 않았다.

| 경로·조건                      | 관찰                                                                                                | 증거                                                                                                                  |
| ------------------------------ | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 코스 app reduce / 실제 OS full | 정답이 2초 뒤에도 유지. 피드백 후 약 9.754초에 누른 Enter로 다음 문제 1회. 이후 3초 추가 이동 없음  | `m03-course-reduce*.timeline.json`, `006-course-reduce-stays-390.png`                                                 |
| 탐험 app reduce / 실제 OS full | 정답 유지. 피드백 후 약 9.824초의 Enter로 다음 활동 1회. 이후 3초 추가 이동 없음                    | `m03-explorer-reduce-actual.timeline.json`, `m03-explorer-enter-once.timeline.json`, `010-explorer-reduce-actual.png` |
| 코스 full / OS full            | DOM 정답 피드백→다음 문항 **2221.3ms**                                                              | `m03-course-full-auto.timeline.json`                                                                                  |
| 탐험 full / OS full            | DOM 정답 피드백→다음 활동 **2012.5ms**                                                              | `m03-explorer-full-auto.timeline.json`                                                                                |
| 코스 대기 중 reduce            | 정답 피드백 +501.6ms에 실제 기기 preference를 reduce로 변경, 자동 이동 취소. 수동 다음 뒤 중복 없음 | `m03-course-switch-reduce.timeline.json`, `m03-course-switch-manual-once.timeline.json`, `007`                        |
| 탐험 즉시 다음                 | 피드백 +100.7ms에 실제 다음 버튼 클릭, +105.6ms에 다음 활동. 관찰 종료까지 추가 이동 없음           | `m03-explorer-immediate.timeline.json`                                                                                |
| 코스·탐험 오답/풀이            | 오답 재도전과 풀이에서 대기. 풀이 표시 뒤 3초의 전후 문구 동일, 알겠어요로 진행                     | `004`, `005`, `011`, `012`, `course-solution-wait.json`, `m03-explorer-{wrong,solution}-wait.json`                    |

앱 reduce 최초 설정과 full 복귀는 홈의 **이 기기 설정** UI로 확인했다.
정답 대기 중 설정 UI는 학습 화면에 없으므로 코스 전환 표본은 기존 localStorage
기기 설정과 실제 구독 대상 `storage` 이벤트로 수행했다. React 학습 상태나 OS
`matchMedia`를 위조하지 않았다. 이는 **설정 저장소 전환 검증**이며 대기 중 설정
UI 클릭 검증이 아니다. 탐험의 즉시 다음은 실제 DOM 버튼에 예약한 클릭이다.

코스 마지막 문제에서 즉시 마치기를 예약했으나 해당 버튼을 찾지 못했다
(`m03-course-immediate-finish.timeline.json`: `found=false`). 실제 코스 회차는
정상 완료됐지만, 이것을 **코스 즉시 다음 성공**으로 세지 않는다. 탐험 대기 중
reduce 전환과 실제 OS reduce는 실행하지 않았다. `009` 및
`m03-explorer-reduce.timeline.json`은 선택이 실행되지 않은 초기 시도이므로
정답 유지 근거에서 제외하고 `010`과 `-actual`을 사용한다.

## 3. M-05·M-06 — 실제 cards 콘텐츠

코스 뒤 오늘 공부 시작이 공급한 **`e5-2-1-1-xc9`**, 문장 5개인 새 기억 회차를
저장 모드로 진행했다. 단계별 분모는 실제로 2단계 **2**, 3단계 **3**, 4단계 **5**다.
단계 1 읽기의 문장 수와 단계 2~4의 처리한 빈칸 수, 그날 분량을 혼동하지 않는다.

### M-05

- 2단계 첫 문장 “3 이상 7 이하…”에 빈칸이 없을 때 input 0개. Enter로 문장
  이동, 빈칸이 있는 4번째 문장에서는 입력 폼이 나타났다 (`015`, `016`,
  `m05-step2-no-blank.json`, `step2-after-enter.json`).
- 3단계 두 번째 문장 “이상과 이하의 방향”에도 input 0개. 1440/390 PNG에서
  문장 이동 버튼과 입력창 부재를 확인했다 (`021`, `022`, `m05-step3-no-blank.json`).
- 3단계 첫 빈칸 입력에서 Tab을 누르면 4번째 문장의 빈칸 2로 이동하고 입력
  초점이 유지됐다 (`m05-step3-tab.json`, `023`).
- 2단계의 `있다`는 칩 후보와 맞지 않아 입력 확인 안내가 나왔고 재입력이 가능했다.
  이것은 저장된 오답이 아니다. 3단계에는 다른 유효 후보 `기준이 되는 수`를
  `없다` 자리에 넣어 **실제 틀림 1개**를 기록한 뒤 `없다`+Enter로 재입력했다.
  `024`, `025`, `026`에 입력·결과를 분리해 남겼다.

### M-06

| 모드·실제 사례             | 관찰한 빈칸 수                   | 도달한 끝점·근거                                                                         |
| -------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------- |
| 저장 xc9 단계 2            | 0/2 → 1/2 → 2/2                  | 단계 대조까지. `014~019` 및 snapshot                                                     |
| 저장 xc9 단계 3            | 0/3 → 1/3 → 3/3                  | 단계 대조까지. 문장 5개·틀림 1개와 처리 완료 3개를 구분. `020`, `025`, `026` 및 snapshot |
| 저장 xc9 단계 4            | 0/5 → 1/5 → 대조·평가 5/5        | `027~030`, `step4-rating.json`. **평가 POST 503, 저장 완료 화면 미도달**                 |
| 연습 c1 단계 4, 정답 4개   | 0/4 → 1/4 → 대조·마치기·완료 4/4 | `032~037`와 각 snapshot. `연습 · 기록되지 않음`, 실제 완료 제목 확인                     |
| 연습 xc6 단계 4, 전부 포기 | 0/3 → 1/3 → 대조·마치기·완료 3/3 | `038~042`와 각 snapshot. 3/3은 처리 완료이며 정답·숙달을 뜻하지 않음                     |

완료 수는 접근성 스냅샷의 실제 상단 표시에서도 확인했다. 스크롤된 일부 PNG에서는
상단이 화면 밖이다. 특히 `025`, `028`, `030`, `033`, `037`, `042` PNG만으로
상단 숫자가 눈에 보였다고 주장하지 않는다. 각 동명 `.snapshot.json`이 수치 근거이며,
PNG는 당시 입력·대조·완료 제목의 시각 근거다. `026`은 상단 3/3과 본문 틀림 1개가
함께 보인다. `036`은 스크롤 캡처 위치가 어긋나 빈 상단·헤더 반복이 있어 전체 배치
합격 근거에서 제외한다. 새 캡처를 위해 반환 후 브라우저를 다시 조작하지 않았다.

공개 상태의 모드는 cards였고 legacy chips를 강제로 열지 않았다. 따라서 구현자
로컬 fixture에서 관찰한 **390px 입력 버튼 152px 넘침**은 이 운영 검수에서는
미도달이다. 미해결 관찰을 닫거나 운영에서 없다고 주장하지 않는다.

## 4. 평가 저장 503 — 실패 상태 보존

- 시각: **2026-10-21T09:45:34.076Z**.
- endpoint: **POST `/api/learn/fading`**, **HTTP 503**.
- network requestId: **`8458.956`**. 앱의 평가 requestId와는 다른 네트워크 식별자다.
- 실제 조작: xc9 4단계 대조를 끝내고 **알맞음 3일 뒤**를 1회 누름.
  의미상 action `rate`, rating `good`; 원본 wire body를 확보했다는 뜻은 아니다.
- 화면 오류: “저장된 학습 기록을 확인해야 합니다. 선생님께 알려 주세요.”
  `rating-after-request.json`, `031-saved-rating-error-390.snapshot.json`에 alert가
  남아 있다. **031 PNG는 아래로 스크롤돼 오류 문구가 화면 밖**이며 비활성 평가
  버튼만 보인다. 오류 문구의 단독 시각 증거로 사용하지 않는다.
- `w29-before-rating.backup.json`은 직전 rev166. 오류 뒤 GET test-console과
  GET fading은 200이었고, 최종도 **rev166**, payload가 직전과 완전히 같다.
  저장 세션은 xc9, `phase=rating`, startStep1, mode cards. 식별 정보는 외부
  `FAILURE-PACKET.json`과 `fading-state-after-error.json`에 보존했다.
- Orca의 네트워크 기록에는 요청/응답 원문 body가 없어 **원본 HTTP body와 앱
  requestId는 미확보**다. 이를 복원하려고 재전송하지 않았다. 실패 1건과 화면
  문구, GET 재조회·백업은 구분해서 기록했다.

**원인 후보만:** 시작부터 fading 집계·streak의 마지막 날은 10월 25일이지만
실제 offset0의 오늘은 10월 21일이었다. `state.ts`의 평가 처리와
`fading.contract.ts`의 마지막 날짜 일치 검사가 관련될 수 있다. 리드가 별도
Codex에 백업 복사 로컬 재현을 맡겼으므로 이 보고서는 원인을 확정하지 않는다.
M-05/M-06 표시 변경이 503을 만들었다고 단정하지도 않는다.

실패 후 평가 재전송·reset·restore·학습 저장 요청을 하지 않았다. 그 뒤 수행한
c1/xc6 연습은 기록 없는 모드였으며 시작/종료/최종의 rev166 payload 동일을
검증했다. 리드 긴급 지시 이후에는 읽기 전용 실패 메타데이터만 수집했다.
`FAILURE-PACKET.json`은 당시 사용권 유지 상태를 기록한 문서이고, 이후 반환은
`browser-return.json`과 receipt가 최종 근거다.

## 5. H-01/H-02 연결 확인의 범위

새 xc9 묶음의 “3 이상 7 이하” 그림은 2·3단계에서도 3과 7의 닫힌 점과 그 사이
선분으로 문장과 일치했다 (`015`, `020`). c1의 이하 4단계 연습에서도 3의 닫힌
점과 왼쪽 범위를 확인했다 (`033`; `036`은 그림 부분 참고만 가능).
**이 xc9의 2·3단계 도달을 urgent의 두 대상 문장 2·3단계 도달로 대체하지 않는다.**
urgent 대상 두 문장은 기존 저장 단계가 4인 상태를 유지했고, 이번에도 그 조합은
미도달이다.

H-02는 실제 코스 목록형 입력·선택지·오답·재시도·풀이·알겠어요·다음 문제를
390×844에서, 첫 목록 문제를 1440×844에서 확인했다 (`003~007`). 보이는 짧은
문항과 답안 조작의 연결 확인이며, 긴 다문단·도형 문제·긴 풀이 내부 스크롤,
실기기 키보드·전체 화면 크기/문항의 합격으로 넓히지 않는다.

## 6. 실제 쓰기·보존·원복

각 저장 구간 전에 계정·1개 SRS 행·최신 revision·논리 백업과 영향 수치를
`w01~w29`의 backup/counts/impact 파일로 기록했다. 이 목록은 **실행 전 점검
목록**이며 실패하거나 저장하지 않는 UI 동작도 포함하므로 파일 수를 쓰기 수로
세지 않는다. 실제 성공 저장은 revision **144→166, 22회 증가**다.

| 구간                                  | revision | 실제 영향                                                                                 |
| ------------------------------------- | -------- | ----------------------------------------------------------------------------------------- |
| 기존 코스 회차 재개·답·follow-up·완료 | 144→153  | 재개 연결 2회, 첫 답 5개(정답4/오답1), 두 번째 오답과 알겠어요. 기존 미응답 회차 1개 완료 |
| 완료일 탐험 다시 풀기                 | 153→160  | replay 재개, 정답 3개·오답 1개, 포기 풀이·알겠어요. reviewOnly index 0→4                  |
| 새 xc9 기억 회차                      | 160→166  | 정상 pick/open·읽기·2/3/4단계 저장, 3단계 오답의 짧은 재학습 대기 1개 추가                |
| 마지막 평가                           | 166→166  | 503, payload 변화 없음. 장기 복습·평가 영수증 추가 0                                      |
| 이후 두 연습·홈 복귀                  | 166→166  | payload 전체 동일                                                                         |

전체 코스 첫 답 25→30, 정답22→26, 완료 회차5→6, follow-up3→4다.
기억 개념3→4이나 장기 복습6·평가 영수증6은 그대로다. 새 xc9는 평가 대기이며,
재학습 대기3→4(새 xc12 오답 retry1개), graded13은 그대로다.

`audit-summary.json`의 비교 검사 결과:

- 교사 계획, 기존 코스 history 5개, 기존 fading 개념 3개와 days/streak/receipts 보존.
- 기존 재학습 pending3개·graded13개·day 집계 보존. 세션 중복 방지용 `seen`은
  정상 단계 행동으로 갱신됐으므로 relearn 객체 전체가 불변이라고 표현하지 않는다.
- 탐험 completedDays2·카드/학습 history·별11·earned14·level1,
  expedition awards4, guide·기존 memories/missions 보존.
- course learner/memories/activity와 dailyJourney·expedition mission/receipts,
  탐험 reviewOnly session/receipts, 새 fading concept/session/relearn은 실제 추가
  학습으로 변경됐고 보존했다. 정상 추가분을 초기 백업으로 덮어쓰지 않았다.
- 초기/최종 offset0. viewport **1685×875**, motion **full**, sound **off**,
  online **true**, OS reduced **false**, `/learn` 홈·test_s 로그인 원복/유지.

**이전 urgent의 restore 1회(rev128→129)와 이번 medium의 restore 0회를 구분한다.**
이전 urgent 보고·증거를 수정하지 않았고 기존 SHA256SUMS의 **262개 파일 전부
일치**를 다시 확인했다. 이번 최종 백업은 `final.backup.json`, 시각
`2026-10-21T09:51:03.869Z`, rev166이다.

## 7. 검사·반환·인계

- 브라우저 종료 구간 network 288개 중 503은 위 평가 1건이다. 별도 403 1건은
  담당이 잘못 확인한 `/api/learn/math-srs/today` 읽기 URL이며 제품 화면의 호출이
  아니다. 올바른 일일 경로는 `/api/learn/fading/daily`다. 이를 제품 결함으로
  세지 않았다. console 수집은 messages 0개였다.
- 초기 로딩/선택 미실행·좌표 갱신·대기 명령 실패는 재스냅샷으로 구분했다.
  `001` 로딩 화면·`009` 미실행 시도·일부 스크롤 PNG를 성공 증거로 확대하지
  않았다. snapshot·필요한 실제 DOM 버튼 클릭·키보드·읽기 전용 observer를
  사용했으며 순수 물리 터치 전수 시험은 아니다.
- 외부 `audit.py`는 저장된 증거만 읽어 보존·수치·타이밍과 기존 urgent 해시를
  검사했다. JSON 파싱·증거 인덱스/파일 존재·해시·Markdown 형식·git diff 검사를
  수행했다. 제품 test/type/build/push는 실행하지 않았다.
- 리드에 실패 packet/직전 백업/반환 가능 상태를 먼저 전달했다. 리드의 반환
  지시 후 **2026-10-21T09:53:39.917480Z에 Chromium 사용권 반환 통지**가
  accepted 됐다. **보고서/커밋 정리 전 반환**이며 이후 브라우저/API 조작은 없다.
- 변경 파일은 이 새 보고서 하나다. 경로 지정 stage·로컬 문서 커밋만 리드에
  전달한다. main 반영은 리드가 검토하며, 작업트리/가지는 그 확인 전 보존한다.

[증거 인덱스](/Users/pss/Desktop/creative/display-survey/srs-medium-recheck-20261021/INDEX.md),
[실패 packet](/Users/pss/Desktop/creative/display-survey/srs-medium-recheck-20261021/FAILURE-PACKET.json),
[보존·쓰기 검사](/Users/pss/Desktop/creative/display-survey/srs-medium-recheck-20261021/audit-summary.json),
[사용권 반환](/Users/pss/Desktop/creative/display-survey/srs-medium-recheck-20261021/browser-return.json).
