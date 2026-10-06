# 개념 수업 대본

실행 중 생성하지 않는 편집 가능한 수업 원고다. `e3.json`부터 `m3.json`까지 일곱 학년 파일에 실제 교사·학생 대사와 수식을 저장한다. `conceptScripts.ts`는 이 파일을 읽어 소단원별 원고의 복사본을 돌려준다.

```ts
import {
  conceptScriptFor,
  conceptScriptCoverage,
} from "@/lib/textbook/conceptScripts";

const script = conceptScriptFor("중2::1. 수와 식::지수법칙");
// script?.dialogue: { role, expression, markdown, purpose, conceptIds, source }[]
const coverage = conceptScriptCoverage(); // coveragePercent: 100
```

역할은 `teacher`, `student1`, `student2`, 표정은 `neutral`, `question`, `thinking`, `aha`다. 화면의 인물 이름·초상화 선택과 대본 역할은 따로 연결할 수 있다. 수식은 `$TeX$`로 저장한다.

| 학년 | 교육과정 소단원 | 원본 개념 | 대사 |
| ---- | --------------: | --------: | ---: |
| 초3  |              56 |       194 |  890 |
| 초4  |              62 |       145 |  872 |
| 초5  |              56 |       197 |  896 |
| 초6  |              56 |       196 |  900 |
| 중1  |              52 |       362 | 1533 |
| 중2  |              56 |       386 | 2086 |
| 중3  |              22 |       177 |  615 |
| 합계 |             360 |      1657 | 7792 |

교육과정 분모는 `BLANK_SECTIONS` 중 `CONCEPT_BLANK_GRADES`에 속한 초3~~중3 전체다. 초1~~2와 고등은 현재 지원 범위가 아니며 조회하면 `undefined`를 돌려준다.

각 원고는 생각을 여는 구체적인 질문, 모든 원본 핵심 개념의 설명, 풀이 또는 판단 예, 원본에 있는 틀린 ○× 문장과 바로 이어지는 정확한 교정, 마지막 확인 질문과 학생 답변을 담는다. 원본 개념의 `givenCase`도 빠뜨리지 않고 설명하되 확인 질문에서는 가능한 한 사례에 종속되지 않는 개념을 고른다.

`conceptIds`는 해당 소단원의 원본 은행 개념 ID다. 개별 대사의 `source`는 개념, 개념의 예, 오류 교정용 ○×, 새로 쓴 수업 예 또는 v15 대화의 정확한 위치를 기록한다. 초4~초6 원본에는 예 필드가 없으므로 `authoredExamples.ts`에 풀이 단계가 있는 별도 수업 예를 썼다. 적용 문제와 그림 문제의 독립 문제 ID·정답은 대본 원천으로 사용하지 않는다. 마지막 `check-answer`는 수업 대화이며 독립 연습 문제의 정답 영역에 합쳐 쓰지 않는다.

사용자가 제공한 `인재원_KaTeX_교재조판기_v15`의 `README.md`, `content/scripts.py`, `content/lessons.py`, `manuscript.json`을 확인했다. 최종 `manuscript.json`의 실제 대화 24편, 원본 블록 298개를 `reference-v15.json`에 보존했고 네 파일의 SHA-256도 기록했다. 유리수·유한소수 대화는 `유리수와 소수`, 순환마디·자리 찾기와 반복의 이유는 `순환소수`, 분수 변환은 `순환소수의 분수 표현`, 지수·단항식은 각각 해당 소단원으로 연결했다. 다항식 대화는 덧셈·뺄셈과 곱셈·나눗셈으로 나눠 연결했다. v15에는 순환소수 식의 계산을 직접 가르치는 같은 구획이 없어 이 소단원에는 별도 계산 예를 썼다.

원본 `[[수식]]`을 먼저 보호한 뒤 `{{핵심어}}`를 강조로 바꾸므로 분수·지수의 TeX 중괄호를 손상시키지 않는다. 칠판 블록의 글은 `**제목**`, 빈 줄, 수식, 주석 순서 그대로이고, 그 대사의 `presentation.kind`가 `board`여서 선생님 말이 아니라 판서임이 남는다.

## 수업·판서·학기·호칭 (2026-10-05)

모든 대사에 `presentation: { kind, lessonKey, lessonTitle }`이 있다. 이 칸들을 더할 때 이전 대사의 글·출처·ID는 한 글자도 바뀌지 않았다. 새 칸을 빼고 아래 「교정」의 45대사를 되돌리면 학년 파일 일곱이 처음 커밋과 바이트로 같고, 그 해시를 검사가 지킨다.

| 수업 | `lessonKey` | `lessonTitle` | 개수 |
| --- | --- | --- | ---: |
| v15 원본 대화 한 쪽 | `v15:U01:1` | 원본 쪽 제목 | 24 |
| 개념 하나의 묶음 | `concept:m2-01-01-c1` | 은행 개념명. 수식 `$…$`이 들어갈 수 있다 | 1,657 |
| 소단원의 도입 두 대사 · 정리(수업 예, 오개념, 마지막 확인) | `section:m2-01-01:open` · `…:wrap` | 소단원명. 초등은 앞의 `1-1-1` 번호를 뺀다 | 720 |

한 소단원의 수업은 도입 → v15 쪽들 → 개념들 → 정리 순서로 이어지고, 같은 수업이 끊겼다 다시 나오지 않는다.

판서는 187대사다. v15 원본 판서 24개는 일곱 소단원에 있다. 나머지 353개 소단원에는 쓴 판서가 없어서, 은행이 스스로 `공식`·`법칙`·`정리`·`단위`로 분류한 개념의 기존 정의 대사만 판서로 표시했다(80개 소단원, 163대사). 새 대사나 새 수식은 없다. 그런 개념이 없는 273개 소단원은 `provenance.boards`에 `absent`와 이유가 적혀 있고 판서가 없다.

`semester`는 초등 대단원의 앞 숫자(`1-3 …`), 중등 대단원 번호(1~4는 1학기)에서 온다. 제품의 `quickCreateSemester`와 같은 결과임을 검사가 확인한다. `conceptScriptSemesterCoverage()`는 14개 학년·학기의 소단원·개념 수를 돌려준다.

대본이 학생을 이름으로 부르는 곳은 한 대사뿐이다(중2 유리수와 소수의 “민서는 …, 지호는 …”). 그 대사에는 `roleMentions`로 이름과 조사의 자리가 적혀 있다. 새 교재를 만들 때 `conceptScriptForCast(sectionKey, { student1, student2 })`가 그 자리에만 고른 이름과 받침에 맞는 조사를 쓴다. 이름 글자를 찾아 바꾸지 않으므로 “짝지은”의 “지은”은 그대로이고, 수식과 “선생님”도 그대로다. 이미 저장된 교재의 대사에는 쓰지 않는다. 새 호칭을 원고에 넣으려면 `roleMentions.ts`의 표에 그 블록을 적는다.

## 교정 (2026-10-05)

확인된 결함 45대사를 고쳤고, 고친 대사는 `static-corrections.json`에 ID · 이전 글 · 새 글 · 까닭과 함께 한 줄씩 있다. AI 편집 검수이고 사람이 읽은 검수가 아니다.

| 종류 | 대사 | 내용 |
| --- | ---: | --- |
| `sentence-answer-copula` | 32 | 은행의 답이 「유리수이다」 「된다 (…)」처럼 이미 문장인데 「입니다」가 덧붙던 대사. 답은 그대로 두고 「입니다」만 뺐다 |
| `particle` | 1 | 초5 2-4-6의 「$1.56$예요」 → 「이에요」 |
| `missing-condition` | 8 | 초4 2-4-3 · 초6 2-3-1 · 초6 1-2-3 · 초6 2-3-2의 질문에, 풀이가 쓰던 조건을 밝혔다(질문은 도입과 수업 예에 두 번 나온다) |
| `ambiguous-wording` | 4 | 중3 원의 접선 「접점을 이었고」 → 「접선을 그었고」, 이차함수와 그래프 「나란할까」 → 「높이가 같을까」 |

수와 수식 토큰은 하나도 바뀌지 않았고, v15 원본 298블록도 그대로다. 대사를 새로 고치려면 작성 노트(`authoredExamples.ts` 또는 `materialize.ts`의 틀)와 학년 JSON을 함께 고친 뒤 `static-corrections.json`에 그 대사를 한 줄 더한다. 이 목록에 없는 대사가 바뀌면 이전 대사 해시 검사가 실패하고, 목록의 글이 원고와 다르면 `corrections.ts`가 그 ID를 대며 멈춘다.

`aiReadings.ts`에는 다시 계산할 수가 없는 수업 예 46건과 쉬어가기 연령대 판정 18칸을 AI가 하나씩 읽은 근거와, 읽고도 확인하지 못한 조건이 있다.

## 검사와 원장

2026-10-06에는 개념백지 실물에서 지적된 초6 「2-1 분수의 나눗셈」을 Codex·Claude가 교차 검토했다. 기본 은행 정의의 교정에 맞춰 설명·확인 답 19대사를 동기화했다(`bank-definition`, SC-046~064). 대사 수·출처·개념 ID·수업 표지와 최초 원고의 기준 해시는 유지한다. 이 유형은 새 은행 정의와 정확히 일치하는지 검사하고, 기존 45개 문장 교정에는 기존 수식 토큰 보존 규칙을 계속 적용한다. 이미 발행된 교재를 덮어쓰는 작업은 아니다. 상세 범위와 검토 한계는 `docs/planning/tracks/reports/concept-cloze-clarity-20261006.md`에 기록했다.

이어 초3~중3 전체 검토에서 C형 문장 395개를 교정했고, 기본 은행을 인용하는 교재 대사 83곳을 함께 동기화했다(`bank-definition`, SC-065~147). 설명·확인 답뿐 아니라 원본 정의를 사용하는 적용 예도 새 정의와 일치한다. 교정 원장은 총 147곳이며 그중 은행 정의 동기화는 102곳이다. 수정 전후의 문장, 독립 검토와 연결 검사는 [전체 학년 적용 기록](../../../../docs/planning/tracks/reports/concept-cloze-fix-all-20261006/README.md)에 있다. 새 교재의 원고에 적용하며 저장된 교재의 스냅샷과 학생 기록은 유지한다.

```text
node node_modules/vitest/vitest.mjs run --config scripts/qa/textbook/vitest.config.mts src/__tests__/unit/textbookConceptScripts.test.ts src/__tests__/unit/textbookSourceLedger.test.ts src/__tests__/unit/textbookRestStories.test.ts
```

`source-ledger.json`은 360개 소단원의 원천별 대사 수, 은행·v15와의 일치, 판서 상태, 새 수업 예 210건의 검산, 되풀이되는 문장 틀 19종, 쉬어가기 6편의 연령대 판정, 소단원별 교정 ID를 담는다. 상태는 `자동 확인`(코드의 계산·일치), `AI 검수`(모델이 하나씩 읽고 근거를 적음), `미검수`, `수정 필요` 넷이다. 사람이 읽은 기록이 없으므로 사람의 승인은 한 건도 없다. 원고를 고치면 원장을 다시 만든다.

```text
node node_modules/tsx/dist/cli.mjs src/lib/textbook/scripts/sourceLedger.ts          # 견주기만
node node_modules/tsx/dist/cli.mjs src/lib/textbook/scripts/sourceLedger.ts --write
```

새 수업 예의 검산은 `mathCheck.ts`(수식 안의 등식·부등식·단위 환산)와 `authoredExampleReview.ts`(말로 쓴 답을 원고 문장과 묶어 다시 계산)가 한다. 기호식처럼 계산할 수 없는 문장은 건너뛴 것으로 세고 검산한 것으로 세지 않는다.

검사는 360개 소단원 전수, 1657개 정의의 원본 보존, 모든 개념 참조의 유효성, 모든 원본 ○× 오류의 연속 교정, 원본 개념 예의 보존, v15 298블록 보존, 전체 수식의 KaTeX 렌더, 독립 문제 ID 배제, 신규 수업 예의 숫자 등식 150개 이상을 확인한다. 숫자 등식 검사는 기호식·단위·자료의 순서쌍까지 증명하는 도구는 아니므로 새 예의 조건과 해석은 편집 시 함께 검토한다.

## 원고와 작성 노트 견주기

정본은 커밋된 학년 JSON이다. 아래 명령은 원본 은행과 작성 노트에서 원고를 메모리에 만들어 커밋된 JSON과 견주기만 하고, 다르면 종료 코드 1로 끝난다. 아무것도 쓰지 않는다.

```text
node node_modules/tsx/dist/cli.mjs src/lib/textbook/scripts/materialize.ts
```

`--write`를 붙이면 수업·판서 같은 메타데이터만 다를 때 쓴다. 이전 대사가 한 글자라도 달라지는 학년은 거절하고 쓰지 않는다. 대사를 바꾸는 교정은 작성 노트를 고친 뒤 `--write --replace-dialogue`로만 쓰고, 바뀐 대사를 `static-corrections.json`에 한 줄씩 적는다. 검사의 이전 대사 해시는 바꾸지 않는다. 앱에서는 materializer, 원본 은행, AI, 네트워크 또는 데이터베이스를 호출하지 않는다.
