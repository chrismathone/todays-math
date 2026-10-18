# FLOW-F01 · 증명 과정 번호와 선택지 경계 보강

기준 main: `2ae266866`. 담당: `bank-reinforce-parser-20261018`.
범위는 `parseProblemContent.ts`와 직접 관련된 파서·렌더 회귀검사다.
[감사 FLOW-F01](../problem-bank-audit-20261018/flow.md) 및
[root 수량 원장](../problem-bank-audit-20261018/math-counts.json)의 두 확정 사례를 보강했다.
수학 문제 수·문항류·반복출제 용량 판정은 root 담당이다.

## 변경과 보호 조건

앞에 완전한 `1..4` 이상 묶음이 있으면 마지막 묶음을 무조건 거부하던 보호를
좁은 문맥 예외로 정교화했다. 기존 R2(줄 중간 보기 복구), 중복 제거,
수식 마스킹과 마지막 `1..n` 검증 순서는 유지했다.

앞 묶음을 지문으로 남기려면 아래 조건을 **모두** 충족해야 한다.

1. 마지막 묶음은 기존 기준대로 완전한 `1..n`, `n >= 4`다.
2. 앞 묶음 전체도 하나의 완전한 원문자 `①..n` 순서다. 숫자 마커·여러 묶음은 예외에서 제외한다.
3. 앞 발문이 증명/과정을 묻고 그 원문자 범위를 `①~…` 형태로 명시한다. 수식 안 참조는 근거로 쓰지 않는다.
4. 앞 번호 중 하나가 앞줄에서 연 괄호를 이어받고, 다음 번호 전에 닫는 괄호가 있다.
5. 발문 뒤부터 실제 보기 앞까지 별도 물음표나 새 명령형 지시가 없다.

따라서 앞 번호·빈칸·문장 전체를 지문에 남긴 채 실제 보기만 분리한다.
마지막 5개를 강제하지 않으며, 마지막 보기가 4개·6개인 합성 사례도 통과한다.
서로 다른 두 완전 묶음, 새 발문이 붙은 증명, 참조 범위/괄호 문맥이 없는 경우는
기존 라벨을 남겨 QA가 계속 문항 뭉침을 감지할 수 있게 했다.

원래 소스에 있던 NUL/SOH 리터럴 3개는 같은 값의 `\u0000`/`\u0001` 표기로
바꾸어 변경 내용을 텍스트 diff로 검토할 수 있게 했다. 마스크·소문항 표시값은 같다.
UI/CSS·엔진·정답 판정·문항 ID·저장 본문은 변경하지 않았다.

## 실제 두 행의 대응 검증

`2026-10-18 10:02 KST`에 두 ID만 조회했다. 트랜잭션의 첫 애플리케이션 문장은
`SET TRANSACTION READ ONLY`, 다음 `SHOW transaction_read_only` 결과는 `on`이었다.
root main의 `.env`를 프로세스 안에서 읽었고 값은 출력·복사하지 않았다.
조회 이외의 DB 동작과 push·배포는 수행하지 않았다.

| 문항 코드        | 원문 길이 | 지문 길이 전 → 후 | 보기 수 전 → 후 | 전 dropped → 후 |
| ---------------- | --------: | ----------------: | --------------: | --------------- |
| `J20501-A70-001` |       508 |         230 → 425 |           9 → 5 | `[5]` → `[]`    |
| `J20506-A37-001` |       556 |         182 → 494 |          10 → 5 | `[]` → `[]`     |

두 행의 SHA-256은 감사 FLOW-F01과 동일했다. 각각
`b289626af20d82f6206853902f42234007c8b24d2c01640686fb7445e770b275`,
`91372681a21c05c7d289de1c5205b7d116825c4006298bcf8895f97a16947902`다.
변경 전 파서는 main 기준본을 같은 프로세스에서 읽어 비교했다.

파서와 별도로 이미 검토된 원문의 마지막 `①` 경계를 잡고, 앞부분 전체 및 뒤의
다섯 원문 선택지와 결과를 대조했다. 두 건 모두 지문 전체와 선택지 본문이 정확히
일치했고 새 라벨은 `[1,2,3,4,5]`, dropped는 비었다. 그림은 각각 1개,
`choiceFigureIndex=[0]`으로 유지됐다.

실제 행은 메모리 안에서 `UnifiedProblem` 은행 화면, `PaperProblemView` 인쇄,
공통 여섯 양식이 사용하는 `print/templates/ProblemBody`로 렌더했다.
**2행 × 3경로 = 6/6**에서 독립적으로 만든 전체 지문 마크업 일치, 보기 5개·순서,
그림 1개·보기 앞 위치 및 `.katex-error=0`을 확인했다.
본문·수식·HTML·교재 원문은 로그·보고서·커밋 fixture에 남기지 않았다.
근거는 수치·digest·일치 여부만 담은 [실측 메타데이터](parser-live-metadata.json)다.

## 합성 fixture와 회귀검사

`src/__tests__/unit/__fixtures__/proofChoiceBoundary.ts`의 두 본문은 새로 쓴 합성 문장이다.
첫 사례는 괄호 안 ④ 및 빈 ⑤ 때문에 기존 파서에서 9보기·dropped `[5]`,
둘째 사례는 괄호 안 ③ 및 서술이 붙은 ⑤ 때문에 10보기·dropped `[]`가 된다.
실제 두 행의 **변경 전 라벨·보기 수·dropped와 합성 결과의 대응 2/2**를 따로 검증했다.
실제 길이/digest는 출처 대응용 메타데이터이며 합성 본문의 길이/digest라고 주장하지 않는다.
[합성 대응 수치](parser-synthetic-metadata.json)에 두 길이를 구분해 기록했다.

- 새 파서 검사 **21/21**: 두 목표 형태, 앞 ①..④, 마지막 4/6보기, 다른 두 문제의 묶음 보존,
  증명 뒤 새 발문 거부, 문맥 근거 부재, 수식 안 번호·괄호·참조, labeled/plain 일치,
  정상 소문항·조건·연결하기·7항목 목록·기존 3조건 복구를 검사했다.
- 새 렌더 검사 **10/10**: 합성 2건을 은행·지면 화면·지면 인쇄·공통 양식 본문·비구조화
  Native fallback으로 렌더해 증명 번호와 실제 선택지 분리, 수식, 그림 연결 및 기존 로딩 정책을 확인했다.
- 관련 기존 검사 **205/205**: 파서, R2, answerChoiceRules, circledNumber, renderParity,
  problemFigures, choiceLayoutRender, mathSpans, singleNewlineSurvives, boxRender.
- 합계 **12파일 236/236**, 실패·보류 0. [파일별 결과](parser-test-results.json).
  일반 회귀검사에는 연결 불가능한 로컬 `DATABASE_URL`을 지정했고 기존 DB 대역을 유지했다.
- 담당 TS/TSX 4파일 ESLint 통과, Prettier 통과, `git diff --text --check` 통과.
  설치된 Next 문서의 `01-app/02-guides/testing/vitest.md`를 먼저 읽었다.

최초 실행은 목표 합성 형태의 기존 실패를 재현했다. 검사 작성 중 정상 소문항의 문단,
KaTeX의 `\displaystyle`, Native fallback의 `[그림]` 표시 기대를 현재 제품 동작에 맞춰
교정했으며, 이를 위해 렌더러를 변경하지 않았다.

재실행 명령은 다음과 같다. 실제 DB 재검증은 일반 회귀검사에 포함하지 않는다.

```sh
DATABASE_URL=postgresql://invalid:invalid@127.0.0.1:1/no_database \
node_modules/.bin/vitest run \
  src/__tests__/unit/proofChoiceBoundary.test.ts \
  src/__tests__/unit/proofChoiceBoundaryRender.test.tsx \
  src/__tests__/unit/parseProblemContent.test.ts \
  src/__tests__/unit/inlineChoiceRepair.test.ts \
  src/__tests__/unit/answerChoiceRules.test.ts \
  src/__tests__/unit/circledNumber.test.ts \
  src/__tests__/unit/renderParity.test.tsx \
  src/__tests__/unit/problemFigures.test.tsx \
  src/__tests__/unit/choiceLayoutRender.test.tsx \
  src/__tests__/unit/mathSpans.test.ts \
  src/__tests__/unit/singleNewlineSurvives.test.ts \
  src/__tests__/unit/boxRender.test.tsx \
  --maxWorkers=1 --reporter=dot
```

## 완료조건과 한계

FLOW-F01의 두 실제 행에서 증명 전체·번호·실제 마지막 선택지 및 화면/인쇄 연결 대응을
확인했다. 원문 쓰기 없이 파서에서 해결했고, 합쳐진 문항을 숨기지 않는 회귀 보호를 추가했다.

이 예외는 위 명시적 문맥에 한정된다. 모든 증명·OCR 표기·복합문항의 구조를 판별하는
범용 파서라고 주장하지 않는다. 나머지 13개 후보나 은행 전량의 전후 재측정은 root 범위다.
실제 렌더에서 기존 특수문자의 KaTeX 문자폭 경고가 있었고 파싱 오류는 0이었다.
브라우저 픽셀·A4 조판·실물 출력·PDF/HWPX 파일의 육안 검사는 하지 않았다.
본문·정답의 수학적 타당성 또는 수량 충분성은 이 수정의 검증 범위가 아니다.
main 병합과 후속 원장 반영은 root가 수행한다.
