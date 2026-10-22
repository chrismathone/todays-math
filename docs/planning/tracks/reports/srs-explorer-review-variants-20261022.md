# L09b 탐험 복습 숫자 변주 — 2026-10-22

5카드의 새 memory 복습 숫자 변주를 로컬에서 구현·검증했다. reader는
`f8086ff79` → `1e3563d80` → `7c3b3c0f2` → **`d0670f75c`(최종 floor)**, writer는 그 뒤의
별도 커밋이다. 공유 환경 writer 활성은 아직 하지 않았으며 리드의 reader 운영 성공
통지 뒤에만 가능하다. 기존 경험 수정 `18c0a280e`와 증거는 보존했다.

## 범위와 identity

최초 눈검수 L09와 초5 계획 §3.5/§8.2의 실제 관찰 5카드만 지원한다:
`g5-decimal-multiply`, `g5-at-least`, `g5-more-than`, `g5-round`, `g5-round-up`.
나머지 225개 본 카드와 보충 카드에는 이 변주를 적용하지 않는다. 개념 정의·조립 조각·
ID·전제 카드·활동 순서와 장기 FSRS/별/수집/최초 답 집계는 바꾸지 않는다.
`18c0a280e`의 g5-round-up 정본 문구 수정은 그대로다.

기존 `session.id = definitions-student-runs`는 선택 순서 씨앗이지만, 이미 저장된 회차와
새 변주 회차를 구별하지 못한다. revision은 요청 충돌용이며 회차가 진행되는 동안 바뀐다.
따라서 optional `reviewVariant: { version: 1, seed, cardIds }`를 session에 더하고,
완료 시 completedDays에 같은 값을 복사한다. 기존 필드나 날짜로 전환점을 추정하지 않는다.
부재는 static을 영구 의미한다. 리드가 이 최소안을 승인했다(`msg_c4c6093d4c17`).

`definitionSessionCard`가 view/선택 개수/서버 채점/follow-up 풀이/마친 회차 해설의 공통
resolver다. completed-day 재열기는 저장된 identity를 복원하며, 옛 day에 없으면 새
session에서도 지운다. identity는 공개 응답에 내보내지 않아 엄격한 옛 탭의 계약을 유지한다.
과거 history 요약 행은 변경하지 않는다. 요청 번호 영수증·CAS·현재 questionId 검사는 그대로다.

version 1의 수학과 문구는 활성 뒤 고정한다. 향후 수정은 새 version과 reader-first가 필요하다.
소수 곱셈은 정수인 1/10 피연산자와 1/100 결과로 계산하고 문자열로 표시한다. 범위는
기준의 포함 여부와 대소 비교로, 반올림/올림은 지정한 십의 자리로 직접 계산한다.
보기 정답·참거짓·해설은 한 함수에서 함께 나온다. 숫자 문자열 치환은 없다.
숫자 범위는 초5에 맞춰 유한하다: 범위/어림 80세트, 소수 곱셈 632세트이며 무한 비중복은 아니다.

## Reader floor

reader 커밋 제목: `feat(srs): read versioned explorer review examples before writing them`.
reader만으로 새 세션에 identity를 붙이지 않는 회귀를 포함한다. 저장 schema·resolver·
완료일 보존/재열기·AGENTS floor를 먼저 배포해야 한다. 이전 strict stored schema는 이
필드를 거절하므로 identity가 쓰인 뒤 reader 이전 코드로 공유 DB를 읽거나 되돌리면 안 된다.
여기서는 공유 DB/API/운영 페이지, 배포, build, push를 실행하지 않았다.

## 현재 검증

- RED: 새 memory 회차의 보기 숫자가 같다는 baseline 회귀 5개 모두 실패.
  외부 `baseline-red.log`에 보존했다.
- 5카드 × 640씨앗: 12,800개 보기와 3,200개 참거짓을 출력 문장에서 독립 계산하여 검산.
  원정의·조립·전제 불변, 중복 보기 없음, 정답 2개, 지원 밖 static 유지.
- 각 카드의 예/참거짓 × 6씨앗: 공개 선택 순서→서버 정답, 오답→재시도 성공,
  두 오답→풀이→reload→알겠어요를 확인. 최초 답 성공으로 바꾸지 않고 shown/passed 구분 유지.
- 옛 day와 새 identity day의 replay를 끝까지 진행하여 history·일정·별·완료일 저장 불변 확인.
- 실제 GET/POST route를 인증·저장소만 메모리 mock으로 실행해 5카드 × 두 활동 × static/variant:
  공개 label 선택, 서버 채점, 두 오답, 풀이 reload, 같은 requestId 재전송의 추가 쓰기 없음.
- `compareStatic.ts`는 `18c0a280e` 원 engine을 로드하여 unmarked 활동/모름 응답/열린 풀이
  view를 JSON byte로 45회 비교한다. old strict schema가 marked 상태를 거절하는 것도 확인한다.
  baseline engine의 단순 상대 의존물은 현 워크트리를 사용하며, unmarked 카드 원천은 변경하지 않았다.

증거 경로: `/Users/pss/Desktop/creative/display-survey/srs-remaining-20261022/variants/`.
실제 shell 시각 검수는 L09b 단일 browser 사용권을 받아 별도 local memory fixture로 수행했다.
이전 experience 200%는 `experience/focused-results.json` 및
`200-percent-viewport-top.png`/`200-percent-viewport-bottom.png`의 완료 증거를 재사용한다.
실제 VoiceOver·물리 터치·공유 운영 기록 검증은 수행하지 않는다.

Reader 검증 결과: 관련 6파일 94시험 + 새 API 1파일 5시험 통과, 파일범위 ESLint 통과.
전체 `tsc --noEmit --incremental false`는 기존 공용 node_modules 중복 타입 오류 3건으로
실패했다: `arithmetic-angle-presentation-verify.ts:36` Playwright 타입,
`paperProbe.tsx:174` PostCSS 타입/비교 깊이. 이번 변경 파일 진단은 없다(`reader-types.log`).


Reader 발행 뒤 local writer RED→GREEN에서 이상/이하의 인접 씨앗 1/2가 기준·정답은
다르지만 네 숫자 집합이 같음을 발견했다. 활성 전 reader 보정에서 한 오답 거리(3→4)를
고쳐, 5카드 × 인접 640쌍의 보기 집합이 모두 달라지는 시험을 추가한다. 새 데이터가
아직 공유 환경에 없을 때의 보정이며, 이 보정 커밋까지 포함한 reader가 운영 성공해야 한다.


리드의 활성 전 검토로 범위 방향과 참거짓이 같은 parity였던 불필요한 정답 단서를 없앴다.
방향은 seed의 첫 bit, 참거짓은 두 번째 bit로 정하며 이상/이하·초과/미만 각각 true/false의
네 조합을 회귀로 고정한다. 최신 floor는 `fix(srs): decouple review truth from range direction`
이며 f8086ff79 또는 1e3563d80만으로 활성하지 않는다. 초기 shell 실행은 fixture의 이미
열린 회차 resume를 expedition-start에 연결하지 못해 0캡처에서 종료했고, finally에서
browser/server 종료를 확인했다. 최종 증거는 이 보정 이후 별도로 생성한다.


## 최종 writer와 회귀

writer의 제품 코드 차이는 `definition-cards.ts`의 새 memory session 생성 한 곳이다.
세션 생성 뒤 이미 공부한 지원 카드만 골라 `{ version: 1, seed: runs, cardIds }`를 붙인다.
열린 세션, unit/repair, 지원 밖 카드, memory의 새 filler 카드에는 쓰지 않는다.
reader-only 단계의 «신규 session에도 identity 없음» 시험은 reader 커밋에 남고, writer
커밋에서는 «신규 memory만 표시·기존 열린 회차 미표시» 시험으로 교체했다.
실제 정답 제출로 15활동을 마치고 저장 만기 날짜에 다음 복습을 시작하는 4회차에서
다른 보기·first=15·완료일 identity 보존·replay history 불변을 확인했다.
GET→새 memory POST→GET에서도 identity를 저장하고, 열린 옛 static session은 표시하지 않는다.

최종 관련 8파일 114시험 통과(`final-tests.log`, maxWorkers=3), 파일 ESLint 통과,
45회 baseline byte 비교 통과. full `tsc`는 이 워크트리의 기존 공용 node_modules
Playwright/PostCSS 중복 타입 3진단만 남고 변경 파일 진단은 없다(`final-types.log`).
리드는 별도 통합 reader에서 독립 26시험/45byte 비교와 full type 0을 확인했다고
통지했다(`msg_0643f5a6d933`); 이 워크트리의 타입 결과를 그 통지로 바꿔 쓰지는 않는다.

## 실제 shell 증거와 재현

`StudentAppShell` + `StudentMathExplorers` + `ExplorerPractice`의 제품 컴포넌트와
`globals.css`, 제품 KaTeX, 실제 Pretendard 파일을 사용했다. UI/CSS 제품 파일은 이번
L09b에서 바꾸지 않았다. Vite의 Next 어댑터와 browser 메모리 fetch 어댑터는 QA 전용이다.
이미 준비한 회차의 expedition-start는 resume 응답만 주고, 그 뒤 학생 답·채점·follow-up은
실제 explorer engine을 호출한다. 실제 route 핸들러의 인증/저장 mock 검증은 별도 Vitest다.
따라서 이 브라우저 검증이 Next proxy·실제 인증·공유 DB를 통과했다고 주장하지 않는다.

단일 Chromium 151.0.7922.34, 390×900/1440×900에서 최종 **65 PNG**를 만들었다:
5카드 × 2폭 × 예1/오답재시도/풀이/예2/참거짓 = 50,
폰에서 5카드 × variant replay/old static/old replay = 15.
모든 장면의 documentWidth=viewport, Pretendard 로드, KaTeX 준비/오류0 확인;
실제 label 클릭으로 예 정답·두 오답·풀이·알겠어요, 참거짓 오답→정답, reload와
새 회차 변경, static/variant replay의 정답을 확인했다. console/page error 0,
외부/API 차단 규칙에 도달한 요청 0이다. 네트워크 공유 요청 자체가 없었다.

원본 PNG **33장**을 직접 열어 문구/수식/선택/해설의 대응과 줄바꿈·단추를 검토했다.
폰에서는 5카드의 풀이·참거짓·옛 replay와 새 예시 표본, 데스크톱에서는 5카드의
새 예시/풀이를 포함한다. 정확한 직접열람 목록과 전체 65장 SHA-256은 외부
`evidence-index.json`에 있다. 나머지 32장은 자동 상태/레이아웃 검사와 캡처만 있으며
직접 눈검수 전수로 세지 않는다. 긴 풀이의 세로 스크롤은 제품 동작 그대로다.

초기 하네스 실패는 세 차례 별도 로그/실패 PNG에 남겼다: 첫 회는 resume 어댑터 누락
(0캡처), 둘째는 lazy MathText 준비 전에 캡처하고 retry의 UI 보기 회전을 index로 클릭한
문제(5캡처), 셋째는 selector 교체가 일부만 적용된 하네스 오류(1캡처). 각 실행은
finally에서 브라우저/서버를 닫았다. 중간 정상명 PNG는 최종 재실행에서 교체했으며,
중간 JSON/로그·실패 PNG를 최종 성공 증거로 재구성하지 않았다. 최종 로그는
`visual-run.log`/`visual-results.json`, 정상 PNG 해시는 `evidence-index.json`이다.

최종 실행 exit 0 뒤 context/browser/server close를 모두 await하고 사용권을 반환했다
(`msg_2d30b1d5fe5f`; 리드 수신 `msg_0643f5a6d933`). 다시 실행하려면 새 사용권이 필요하다.

```sh
# 사전 조건: 리드에게 새 단일 browser/server 사용권을 받은 뒤에만 실행
QA_OUTPUT=/Users/pss/Desktop/creative/display-survey/srs-remaining-20261022/variants \
QA_CHROMIUM_EXECUTABLE='/Users/pss/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' \
node scripts/qa/srs-explorer-review-variants/verify.mjs --browser-granted
```

지원은 명시한 **5/230 본 카드**뿐이며 나머지 **225**와 보충 카드/다른 학년/다른 틀은
static이다. 유한 씨앗 주기 밖의 영구 비중복, 실제 학생 학습 효과, VoiceOver, 물리 터치,
실제 OS 설정 전환, 운영 저장 기록은 검증하지 않았다. 200%는 이전 experience의 확정
47 PNG/집중검수에서 닫힌 범위를 그대로 참조했으며 이 작업에서 재실행하지 않았다.
모델/유료 API/공유 DB/운영 API/운영 탭/build/push/deploy는 실행하지 않았다.
남은 일은 리드의 최종 reader 운영 성공 확인 뒤 writer 통합·배포 판단이다.


## 마지막 reader 정밀도 보정과 캡처 시점

`d0670f75c`(`fix(srs): preserve decimal operand precision in review examples`)가
최종 reader floor다. 소수의 곱셈에서 seed9의 `2.0`을 `2`로 줄이면 «두 수의 소수
자릿수 합은 2» 설명과 표시가 어긋났다(곱/채점은 옳았다). 피연산자마다 소수 한 자리를
그대로 표시해 `2.0 × 0.2 = 0.4`와 정수 `20 × 2 = 40` 설명을 일치시켰다.
640씨앗의 피연산자 자릿수/설명 정수곱 대응 및 seed9 회귀를 추가했다.

65 PNG는 이 마지막 보정 **전** 7c3b3c0f2 template의 씨앗1/2·static을 찍었다.
보정 뒤 `verifyCapturedContent.ts`로 원래 `visual-results.json`의 session/identity를
메모리에서 재구성하여 최신 public activity와 65/65 JSON byte 일치를 확인했다
(`captured-content-final-reader.json`). 화면·로그를 다시 만들거나 캡처 시점을 바꾸지 않았다.
씨앗1/2의 보기·질문·풀이 문구는 보정 전후 실제로 같다. 새 seed9의 `2.0` 표기는
정적 회귀만 확인했고 브라우저에서 별도 찍지 않았다. 리드도 이 분리를 요청했다
(`msg_6f78b962fafc`). 이 보정 이후 공유 writer 활성은 여전히 0이다.
