# L09b 탐험 복습 숫자 변주 — 2026-10-22

현재 단계: reader와 결정적 template 준비. 새 복습 writer는 별도 커밋으로 준비하며,
공유 환경 활성은 리드의 reader 운영 성공 통지 뒤에만 가능하다.

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
실제 shell 시각 검수는 L09b browser 사용권을 받은 뒤 별도 local memory fixture로 수행한다.
이전 experience 200%는 `experience/focused-results.json` 및
`200-percent-viewport-top.png`/`200-percent-viewport-bottom.png`의 완료 증거를 재사용한다.
실제 VoiceOver·물리 터치·공유 운영 기록 검증은 수행하지 않는다.

Reader 검증 결과: 관련 6파일 94시험 + 새 API 1파일 5시험 통과, 파일범위 ESLint 통과.
전체 `tsc --noEmit --incremental false`는 기존 공용 node_modules 중복 타입 오류 3건으로
실패했다: `arithmetic-angle-presentation-verify.ts:36` Playwright 타입,
`paperProbe.tsx:174` PostCSS 타입/비교 깊이. 이번 변경 파일 진단은 없다(`reader-types.log`).
