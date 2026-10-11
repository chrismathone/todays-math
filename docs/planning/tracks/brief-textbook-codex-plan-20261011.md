# Codex 구독 계정으로 교과서 변형 생성·검산

사용자는 2026-10-11 “코덱스 내부요금제로 돌려”라고 지정했다. 이 시점부터
이 작업의 새 생성·검산·의미 검토에는 DeepSeek/TypeSafe 유료 호출을 하지 않는다.
기존 웹앱의 AI 기본값은 바꾸지 않는다. 로그인한 Codex CLI의 저장된 ChatGPT 인증을
쓰는 로컬 처리다. 토큰 파일을 읽거나 복사해 API 호출을 구성하지 않는다.

현재 DB 원문 12,301개, 사용 가능 11,826개, 보류 475개다. 완료 904쌍(1,808개)을
유지하고 미완료 사용 가능 원문 10,922개를 이어서 처리한다. 기존 `.qa-artifacts/
textbook-db-variants-20261011/`의 미적재 초안부터 재사용한다. root가 공유 DB 저장과
지면 검사 및 승격을 담당한다. 작업자는 공유 DB에 쓰거나 원문/기존 변형을 수정하지 않는다.

## A · 구독 CLI 실행과 생성

소유: 새 `scripts/import/textbook/codex-retry-20261011/**`, 필요하면 기존
`DbRetryGenerationOptions`의 주입용 모델 선택 옵션만 추가한다. 기본 앱 동작은 유지한다.

`codex login status`가 ChatGPT 인증인지 먼저 확인한다. API key auth 환경변수를 자식
프로세스에서 제외하고 CLI의 문서화된 저장 인증을 사용한다. 실제 작은 구조화 실행을
검증한다. `codex exec --json --output-schema ... --output-last-message ...`로 stdin의
프롬프트와 실제 이미지 파일을 전달하고 최종 JSON·정상 종료·스키마를 모두 확인한다.
기본 Codex 모델을 유지한다. 새 고정 모델명이나 외부 API를 끼워 넣지 않는다.

공유 실행 함수 `runCodexJson({phase, prompt, schema, images?, outDir, cwd?, timeoutMs?})`
→ `{value, auth:"chatgpt", threadId, model:string|null, usage, elapsedMs, receipt}`.
이미지는 실제 DB/생성 SVG에서 읽은 PNG 파일 또는 검증한 data URL을 허용한다.
stdout 전체/키/토큰/DB URL은 콘솔에 내지 않는다. usage, CLI 버전, 정상 종료, 실제
모델을 확인할 수 있었는지, 입력/출력/그림 지문과 스레드 식별자를 영수증으로 남긴다.
프롬프트를 shell 문자열에 끼워 넣지 않고 stdin/파일/인수 배열을 쓴다.

기본 드라이런, 실제 `--generate`는 범위와 동시 실행 수를 제한하고 원문별로 재개한다.
원문마다 두 슬롯을 함께 생성한다. 출처·단원·문항류·원문 지문을 유지하고 새 SVG만
사용한다. 생성기의 자기 재현 답은 승격 근거로 쓰지 않는다. 테스트에서는 실제 CLI
추론을 금지하고 주입한 실행기로 성공/실패/중단/깨진 JSON/다른 인증을 검증한다.

## B · 독립 검산과 구독 검토 계약

소유: 새 `src/lib/import/schoolTextbook/codexRetry.types.ts`, 새
`codexRetryReview.ts`, 해당 테스트와 보고서.

`reviewCodexDbRetryPair(origin,candidates,sourceFigures,candidateFigures,options?)`
→ 새 명시적 `machine-codex-blind-review` 근거. 기존 TypeSafe Noul 결과를 만든 것처럼
boolean을 확률 1로 바꾸지 않는다. CLI A를 주입할 수 있는 세 단계로 분리한다.

1. 독립 세션에는 원문과 두 후보의 문제·문항 형식·실제 그림만 준다. 저장 답/제안
   답/해설을 숨기고 각각 모든 해와 소문항을 푼다. 누락 조건과 모호함은 실패다.
2. 그 답을 고정한 뒤 별도 세션에서 후보 풀이의 모든 단계와 결론을 점검한다.
3. 또 다른 세션에서 같은 구체적인 학습 목표, 같은 풀이 수준, 문제의 완결성과 실제
   숫자/방법 변경을 boolean과 구체적인 근거로 검토한다. 수학 검산을 대신하지 않는다.

원문/전체 후보/실제 이미지의 입력·출력 지문을 `dbRetryReviewBinding`처럼 묶는다.
기존 `dbRetryAnswersAgree`를 재사용하되 다항식·선택형 복수 답·소문항 표기 차이만
정규화하고 단위·누락 해·다른 답을 지우지 않는다. 코드·실제 구독 CLI 검증과 실제
문항 검토를 구분한다. root가 새 근거를 받는 별도 승격 경계를 작성한다.

## C · 이미 만든 초안의 실제 독립 풀이

소유: root가 제공한 `blind-existing-input.json`의 문제를 풀고
`blind-existing-output.json`에 구조화 결과와 실제 검산 근거를 쓴다. 지정된 입력과
그림 이외의 스냅샷·초안·DB·정답/해설을 읽지 않는다. DeepSeek/TypeSafe를 호출하지
않고 이 Orca Codex 구독 세션에서 직접 풀며 필요한 결정적 계산은 로컬 코드로 한다.
문항별 결과는 `sourceId`, `solutions:[{id:"original"|"slot-1"|"slot-2",answer,
solution,missingEvidence:string[],ambiguous:boolean}]`다. 원문을 추측하거나 한 문제의
답을 다른 문제로 복사하지 않는다. 완료 보고에 실제 읽은 파일, 계산 검증, Codex
dispatch와 확인 가능한 모델/사용 근거를 남긴다. root가 답과 후보의 지문을 대조한다.

모든 작업자는 관련 로컬 Next 문서/AGENTS를 따른다. node_modules junction은 재귀로
삭제하지 않는다. 작업 트리는 병합·깨끗함·작업 종료를 모두 확인한 뒤 root가 제거한다.

## 실제 검토에서 확정한 처리 기준

사용자는 “숫자나 방법”을 바꾸는 두 변형을 요청했다. 두 슬롯 모두 서로 다른 실질적인
숫자 변경으로 만들 수 있다. 슬롯 2에 새로운 방법을 강제하지 않는다. 기존 checkpoint의
recipe 키는 호환성을 위해 유지하되, 실제 변경은 독립 검토의 구체적인 근거로 판단한다.

Codex 구독 근거는 `prepareCodexRetryQualification`과 별도 QA 실행기로 승격한다.
CLI 영수증의 SHA는 실제 파일 바이트, 검토의 digest는 정렬된 JSON의 지문이므로 각각
검증한다. `--receipt-root`의 실제 영수증·출력·스키마 파일을 다시 읽고, 공유 DB의 현재
원문·저장 문안·그림·소유 UUID와 실제 네 지면 검사를 대조한 뒤 소유한 대기 행만
원자적으로 승인한다. 사람 검토 로그는 만들지 않는다.

정답의 표기 비교는 소문항 순서, 단위, 변수와 모든 근을 보존한다. 실수의 근 또는
명시적으로 한 변수의 실숫값을 모두 묻는 문항에서만 수치 해의 순서를 무시하고 ±와
해의 나열을 비교한다. 개수·좌표·순서쌍은 이 처리에서 제외한다. 객관식의 번호와 값을
함께 적은 답은 실제 해당 보기 값까지 일치해야 한다. 이는 수학 풀이 검산을 대신하지 않는다.
