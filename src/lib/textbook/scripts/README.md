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

원본 `[[수식]]`을 먼저 보호한 뒤 `{{핵심어}}`를 강조로 바꾸므로 분수·지수의 TeX 중괄호를 손상시키지 않는다. 칠판 블록은 선생님의 수식 설명 대사로 옮겼다.

원고를 직접 편집한 뒤 다음 검사로 교육과정과 수학 표기를 확인할 수 있다.

```text
node node_modules/vitest/vitest.mjs run --config scripts/qa/textbook/vitest.config.mts src/__tests__/unit/textbookConceptScripts.test.ts
```

검사는 360개 소단원 전수, 1657개 정의의 원본 보존, 모든 개념 참조의 유효성, 모든 원본 ○× 오류의 연속 교정, 원본 개념 예의 보존, v15 298블록 보존, 전체 수식의 KaTeX 렌더, 독립 문제 ID 배제, 신규 수업 예의 숫자 등식 150개 이상을 확인한다. 숫자 등식 검사는 기호식·단위·자료의 순서쌍까지 증명하는 도구는 아니므로 새 예의 조건과 해석은 편집 시 함께 검토한다.

원본 은행과 작성 노트에서 원고를 다시 만들려면 저장소 루트에서 실행한다.

```text
node node_modules/tsx/dist/cli.mjs src/lib/textbook/scripts/materialize.ts
```

이 명령은 일곱 JSON을 덮어쓴다. JSON에 직접 적용한 편집을 유지하려면 다시 생성하기 전에 작성 노트에도 반영한다. 앱에서는 materializer, 원본 은행, AI, 네트워크 또는 데이터베이스를 호출하지 않는다.
