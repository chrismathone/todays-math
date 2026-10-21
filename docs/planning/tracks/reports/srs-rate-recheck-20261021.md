# SRS 날짜 역행 409 · 정상 평가 — 독립 운영 재검수 (2026-10-21)

고정 운영 SHA `c514267aa3abe87254e45a8e0f8db4ccb5675187`에서
날짜 역행 평가의 **409·무쓰기**와 정상 날짜 평가의 **200·저장 1회·완료 5/5**를
각각 확인했다. 최종 rev167과 정상 추가분을 보존하고 offset0 등 원복을 마쳤다.
Chromium은 문서 정리 전에 **10:49:52Z 반환**했으며 리드가 수신했다.

M02/M10의 완료·short 홈은 미도달이다. 일반 홈 길잡이 부분 확인을 완료 홈의
합격으로 넓히지 않는다. M07 A는 실제 도달한 화면과 계획 읽기를 확인했고,
B의 운영 공격 POST는 브리프 범위대로 실행하지 않았다.

## 기준과 실행 관문

- 지시서: `/Users/pss/Desktop/creative/display-survey/consensus/brief-srs-rate-recheck-20261021.md` 전체.
- 리드: `term_ac71210e-74fb-461d-bba8-8793c5889a8d`. 시작·배포 결과·사용권 반환·최종 납품을 이 주소로 전달한다.
- 시작 로컬 `9a8f13beb77dd87e78ccc87bccae7199fb898cad`에서 지정 origin/main을 fetch하고 c514로 ff-only했다. clean 확인 후 진행했다.
- GitHub `gh api repos/chrismathone/todays-math/commits/{SHA}/status`를 약 35초 간격으로 조회했다. 앞 5회 pending, 6회째 **10:33:42.108Z success**, status updated **10:33:40Z**. 즉시 리드에게 알렸다.
- 배포: <https://vercel.com/bigshols-projects/todays-math/GgQLLc5QuJ2Re6n6DVzbfrYoedcA>.
- 리드가 success를 새 조회하고 Chromium 사용권을 명시한 뒤에만 운영 탭/API를 읽었다. 재검수 동안 같은 SHA 유지 지시를 받았다.
- 기존 page `60725ad7-07ed-45e3-a1cc-474362992ab4`, test_s 고립 profile `2235f78e-01e7-47ad-81b9-2e60bac6ad44`만 사용했다. 기존 로그인·탭을 보존했다.
- 제품 수정, 테스트/의존성 변경, build, push, SQL, 임의 학습 payload, 새 엔진·서버, reset/restore는 하지 않았다. 학생 쓰기는 실제 화면의 평가·시험 시계·기존 길잡이 확인으로만 했다.

최종 diff는 eeabac 대비 52파일(제품 11, 시험 22, QA 15, 보고 4)이다.
M02/M10 `9e795f741`, M07 A `feda5978b`, B `55fcfe7b3`, rate `05ba04c5f`,
medium 보고 `9a8f13beb`의 ancestry와 실제 제품 diff를 대조했다.
범위 밖 제품·계약·콘텐츠·엔진 변경은 없고 기존 reader floor를 유지한다.
최종 rate 보고 전체, 새 회귀 3파일, 로컬 `guard-green.log` 188 PASS와
`fixed-backup.log` 1 PASS를 읽었다. 이번 검수자가 시험을 다시 실행한 결과는 아니다.
A 먼저 success(10:24:33Z), B 별도 배포, 통합 431/232검사·독립 type/build/push훅
통과는 리드 전달 사실로 구분한다.

## 최신 identity·백업과 초기 조건

10:38:19.832Z 최신 test-console GET200과 auth session GET200에서 test_s와
기존 학생 식별을 확인했다. 최신 rev166 payload는 medium의 w29 직전 및 최종
백업과 완전히 같았다. 반 이름도 기존 파일과 같았다. 과거 백업을 현재 상태로 가정하지 않았다.
기존 탭을 새로고침해 이번 배포 화면을 불러왔다.

| 항목                             | 실행 전 관찰                                                                  |
| -------------------------------- | ----------------------------------------------------------------------------- |
| 실제 오늘 / 도구판 오늘 / offset | 2026-10-21 / 2026-10-21 / 0                                                   |
| 최신 fading 집계·streak.lastOn   | 2026-10-25                                                                    |
| 열린 개념                        | `e5-2-1-1-xc9`, cards, rating, 5문장                                          |
| 교사 계획                        | enabled, 하루 10문제, 시작 `5-2-1-1`, configuredAt `2026-10-21T06:48:13.671Z` |
| 기기                             | 1685×875, motion full, sound off, online, OS reduced-motion false             |
| 길잡이                           | 기존 담비(marten)                                                             |

원본 전체 payload·세션 토큰·학생 백업은 저장소 밖에만 있다. 메시지나 이 문서에
쿠키·인증값·전체 학생 payload를 넣지 않았다.

## 경우 1 — 현재 날짜 역행 409, 저장 0

오늘 계획의 xc9 `continue`를 정상 UI로 재개하고 기존 답 대조를 넘긴 뒤
«알맞음 3일 뒤»를 한 번 제출했다.

- **10:40:59.211Z** `POST /api/learn/fading` → **409**, network requestId `8458.1394`.
- **10:40:59.397Z** 자동 `GET /api/learn/fading` → **200**, `8458.1395`.
- 화면에 다음 문구가 실제 보였다: «마지막 학습 날짜보다 이전 날짜에는 평가를 저장할 수 없습니다. 선생님께 확인해 주세요.»
- 같은 rating 세션이 대조 첫 문장으로 복원됐다. 자동 POST 재반복이나 «저장 다시 시도» 단추는 없었다.
- 직전/직후 **revision 166 동일, 전체 payload 동일**. 정상 평가 때까지의 백업들도 같은 payload였다. 이 경우의 논리 저장은 **0회**다.

HTTP status와 날짜 문구, 자동 GET은 실측했다. 원본 HTTP 요청/응답 body는 Orca
네트워크 기록에서 확보하지 못했다. `CONFLICT` 분류는 배포된 client 처리와
실제 재동기화 경로가 일치한다는 근거이며, raw body의 code 값을 직접 읽었다고
주장하지 않는다. network requestId는 앱의 멱등성 UUID와 다르다.

`007-rate409-visible-390.png`, `008-rate409-visible-1440.png`를 직접 열어
날짜 문구와 5/5를 확인했다. 이때 5/5는 단계 대조 표시이며 **평가 저장 성공의 증거가 아니다**.
수치 근거는 `w01-before-rate409.backup.json`, `after-rate409.backup.json`,
`rate409-preservation-check.json`, `network-final.json`이다.

## 경우 2 — 정상 날짜 200, 평가 1회와 완료 표시

별도 최신 백업 후 `max(실제 오늘, 최신 평가일)`을 계산했다. 실제 값은 10/25였고
기존 테스트 도구판의 «옮길 날 수»와 «날 수로 옮기기»로 **0→+4**를 적용했다.
시계 POST200 전후 rev166·payload 동일을 확인하고 학생 화면을 새로고침했다.
백업에서 읽은 과거 +4를 검증 없이 재사용하지 않았다.

같은 xc9의 대조를 다시 살펴보고 알맞음을 정상 UI에서 제출했다.

- 정상 날짜의 첫 focus+Enter 활성화에서는 **POST가 발생하지 않았다**. 화면·rev166도 그대로였다. `rate200-keyboard-no-request.json`에 이를 보존했다. 원인을 제품/도구 중 하나로 단정하지 않는다.
- 새 직전 백업을 확보한 뒤 실제 버튼의 click을 한 번 실행했다. **10:43:29.711Z** `POST /api/learn/fading` → **200**, network requestId `8458.1554`.
- **rev166→167**, xc9 rating 세션 종료, «풀이를 마쳤어요», «알맞음 · 다음 복습 3일 뒤», **5/5 완료**를 확인했다.
- 저장 직후 기존 재학습 확인 창이 열렸다. 답이나 «아직 모르겠어요»를 제출하지 않고 닫아 완료 화면을 확인했다. 재학습 답 제출은 0회다.
- 정상 요청을 재전송하지 않았다. 같은 requestId의 멱등성은 읽어 둔 로컬 회귀의 범위다.

| 수치·보존 항목                      | 직전 → 저장 후·최종                                                                                  |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------- |
| xc9 장기 평가 수                    | 0 → 1                                                                                                |
| 전체 fading reviews / receipts      | 6 → 7 / 6 → 7, 기존 영수증 보존                                                                      |
| xc9 다음 복습일                     | 2026-10-28                                                                                           |
| 10/25 집계 fresh / passed / reviews | 0/1/1 → 1/2/2                                                                                        |
| 10/23·10/24 집계                    | 그대로                                                                                               |
| streak current / best / lastOn      | 3 / 3 / 2026-10-25 그대로                                                                            |
| 기존 다른 개념                      | 모두 값 동일                                                                                         |
| 재학습 items / graded               | 4 → 8 / 13 그대로                                                                                    |
| 기존 재학습 4항목                   | 각각 전체 값 동일                                                                                    |
| 추가 재학습                         | xc9의 xc9·xc10·xc11·xc13 4항목, confirm, checks/fails 0, exposed                                     |
| 재학습 day / seen                   | day가 10/24→10/25로 전환, checks/cleared 0·entered 4; seen 갱신. 전체 relearn 불변으로 보고하지 않음 |
| fading 밖 모든 기록                 | 깊은 값 비교 동일. 교사 계획·course·explorers·guide·여정·보상 등 보존                                |

전체 payload 중 바뀐 영역은 fading 하나다. 그 안에서는 concepts/days/receipts/session/relearn이
정상 평가로 바뀌었다. 이후 시계 원복·길잡이 같은 선택·읽기 검수 동안에는
**정상 저장 직후 payload와 최종 payload가 완전히 동일**했다.

완료 PNG `017-rate200-completed-clear-390.png`와
`018-completion-verified-1440.png`를 직접 열어 완료 문구와 5/5를 확인했다.
후자는 실제 DOM 1440×844·PNG 1440×844도 대조했다.
`w04-before-actual-rate200.backup.json`, `after-actual-rate200.backup.json`,
`rate200-preservation-check.json`, `rate200-relearn-delta.json`이 저장 전후 근거다.

## M02/M10 및 M07 연결 범위

| 대상                     | 실제 관찰과 판정 범위                                                                                                                                                                                                                                                               |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M02 완료/short 단원 줄   | **미도달**. 정상 날짜 10/25는 in-progress 8/15·7남음, offset0 원복 후 10/21은 in-progress 10/14·4남음. 완료 홈을 만들기 위한 추가 학습·초기화·기록 가공을 하지 않았다. 현재 홈의 «초과와 미만 알아보기»를 완료 이력 표시로 세지 않는다.                                             |
| M10 완료 홈 길잡이       | **미도달**. 완료 홈 축하 버튼 진입을 검증했다고 하지 않는다.                                                                                                                                                                                                                        |
| 일반 홈 길잡이 부분 확인 | 기존 버튼에서 실제 5종을 열고 담비 선택 상태를 확인. 같은 선택의 «이 친구와 시작» POST200 1회 후 rev167·전체 payload·chosenAt 동일. 다른 길잡이 선택/실패 주입 없음. 완료 홈의 대체 증거가 아니다.                                                                                  |
| M07 A 실제 화면          | 기기 설정에는 움직임/효과음만 있고 학년·목표 저장 컨트롤이 없었다. 도감 목록과 «이상과 이하» 카드 상세를 열고 닫았으며 목표 설정 단추가 없고 앞개념 표시가 남았다. 390 화면과 넓은 화면을 캡처했다. 해설은 기존 진행 중 학습 조건으로 잠겨 있어 해설 열기까지 합격으로 세지 않는다. |
| M07 계획 보존            | 홈의 읽기용 학년·진도 표시, 기존 교사 계획 payload 동일, `GET /api/learn/math-srs/course` 200·동일 10문제 계획 확인. 독립 코스 설정 폼의 모든 렌더 분기를 운영에서 방문한 것은 아니다.                                                                                              |
| M07 B                    | c514에 학생 plan POST 관문 제거와 course/goal HTTP 403 거절 코드가 포함된 것을 확인. 보고·로컬 회귀의 무쓰기/교사 writer 보존 근거와 구분한다. **운영 임의 POST 공격은 실행하지 않았으므로 운영 403 실측을 주장하지 않는다.**                                                       |

기존 urgent의 두 대상 2~3단계와 긴 다문단/도형 미도달 한계는 이번 보고로
덮지 않는다. 이번 xc9 그림·완료 확인을 그 모집단 전체의 합격으로 확대하지 않는다.

## 실제 요청·쓰기·원복 원장

| 시각 UTC     | 요청/조작           | HTTP | 논리 저장 / revision        |
| ------------ | ------------------- | ---- | --------------------------- |
| 10:40:59.211 | xc9 rate, offset0   | 409  | 0 / 166 유지                |
| 10:41:56.911 | 기존 시험 시계 0→+4 | 200  | 학습 0 / 166 유지           |
| 10:43:29.711 | xc9 rate, 10/25     | 200  | **1 / 166→167**             |
| 10:45:35.411 | 기존 시험 시계 +4→0 | 200  | 학습 0 / 167 유지           |
| 10:48:32.210 | 같은 담비 확인      | 200  | 0 / 167 유지, chosenAt 불변 |

이번 구간 네트워크 194건 중 POST는 위 5건뿐이다. 자동 평가 재제출·재학습 답 제출·
목표/계획 공격 요청·reset·restore는 없다. HTTP 400 이상은 의도한 409 하나이며
포착한 console 메시지는 0이다. 물리 DB를 직접 조사한 수치가 아니라
실제 요청·revision·전체 payload 비교로 확인한 논리 저장 원장이다.

10:49:22.040Z 최종 백업은 rev167, offset0이며 정상 평가 직후와 payload 동일이다.
최종 `/learn` 홈·test_s 로그인, 1685×875, motion full/sound off/online,
열린 dialog 없음까지 확인했다. 정상 추가분과 미래 학습일은 보존했다.
따라서 실제 날짜가 10/25보다 이른 offset0에서는 새 과거 날짜 평가가 다시 거절될 수 있다.
이 시험계정 한계를 숨기려고 기록을 지우거나 복구하지 않는다.

브라우저 마지막 조작·읽기는 10:49:24Z 전에 끝났고 **10:49:52.859Z 사용권 반환**을
리드가 수신했다. 이후 브라우저/API를 다시 조작하지 않고 로컬 파일만 검토했다.
현재 재검수 reset/restore는 **각 0회**다. urgent의 과거 restore 1회는 그 원본 보고에
남아 있는 별도 이력이고, medium과 이번 작업의 restore 0회와 섞지 않는다.

## 증거·검사·납품

외부 원본: `/Users/pss/Desktop/creative/display-survey/srs-rate-recheck-20261021/`.
`INDEX.md`, `SHA256SUMS.txt`, `audit.py`/`audit-summary.json`, `CHECKS.json`,
`LOCAL-COMMIT.json`이 인덱스·해시·수치 감사·문서 검사·최종 로컬 SHA를 기록한다.

- `deployment-poll-006.json`, `final-sha-ff.json`, `final-sha-review.json`: SHA·배포 관문·실제 diff.
- `initial.backup.json`, 각 w01~w06 직전 백업·impact, 최종 백업: 정확한 대상 1계정과 영향 확인.
- `network-final.json`: 비밀 헤더를 제외한 endpoint/status/시각/network ID/Vercel trace. raw HTTP body 미확보 한계를 유지한다.
- `browser-finished.json`, `browser-return.json`, 반환 영수증: 문서 정리 전 반환.
- `visual-review.json`: 직접 연 PNG와 실제 픽셀 크기·증거 한계.

파일명만으로 증거를 판정하지 않았다. `014-...completed...`는 POST가 없던 평가 화면,
`015-...complete...`는 재학습 창, `025-...card-detail...`는 아직 도감 목록이다.
이 파일들은 보존하되 완료·카드 상세 근거에서 제외했다. 일부 `...1440` 파일의 실제 크기는
1685×939였으므로 1440 폭 증거로 세지 않는다. 028은 다섯 길잡이가 보이지만
마지막 카드 하단/확인 단추는 화면 밖이며 snapshot과 DOM 선택 정보로 보완했다.

오프라인 수치 감사는 409 전후 전체 동일, 정상 평가 정확히 1회, 기존 기록 보존,
최종 원복 및 POST 5건을 검증했다. 기존 **urgent 262개·medium 310개 해시 모두 일치**하며
두 보고서도 원본과 diff 0이다. 새 보고서 하나만 로컬 커밋하며 제품 검사/build/push는
재실행하지 않는다. 문서 포맷·diff와 커밋 훅 결과 및 실제 로컬 SHA는 외부 납품 기록에 남긴다.
