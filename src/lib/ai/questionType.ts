/**
 * AI 생성물의 **형식**(`Problem.questionType`) — 객관식 · 단답형 · 서술형.
 *
 * ## 왜 이 모듈이 있나 (원장님 지적 2026-08-26 「AI 문항이 `[?형식]` 으로 나온다」)
 *
 * AI 생성 경로가 `questionType` 을 **한 번도 안 적었다.** 그러면 화면의 형식 판정
 * (`classifyFormat`, `src/lib/problem/provenance.ts`)이 주관식 AI 문항을 가를 근거를
 * 못 찾아 `unknown` 을 낸다 — 초등·중등 엔진은 `familyKey` 가 `elem:`/`mid:` 라
 * 그 표지로 구제되지만, AI 문항의 `familyKey` 는 트리거가 넣는 `solo:<uuid>` 다.
 *
 * ## 왜 AI 에게 묻지 않고 **읽어 내나**
 *
 * `generator.ts` 의 계약 경계와 같은 이유다 — AI 응답에서 받는 것은
 * `problemType/content/answer/solution` 뿐이고 나머지는 서버가 부여한다. 형식은
 * **생성물이 실제로 쓴 글에 이미 다 적혀 있다**: 보기를 몇 칸 썼는가, 정답이 보기
 * 번호인가. 여기에 AI 필드를 하나 더 두면 「선언과 지면이 어긋나는」 새 결함 자리가
 * 생기고, 그 어긋남은 **에러 없이 그럴듯한 값**으로 나간다.
 *
 * 하나만 글로 안 갈린다 — 주관식에서 «단답»과 «서술». 그건 `problemType` 이 이미
 * 나르고 있고(`서술형` 은 4갈래 중 하나다), `classifyFormat` 도 그 컬럼을 같은 뜻으로
 * 읽는다. 그래서 프롬프트(v2)가 「풀이 과정·이유 서술을 요구하면 problemType 을
 * 서술형으로」라고 못 박아 그 축이 실제로 채워지게 했다.
 *
 * ⚠️ **`classifyFormat` 과 규칙이 갈리면 안 된다.** 이 트랙은 `provenance.ts` 를
 *    **읽기만** 하므로 텍스트로 한 벌을 만들 수 없다. 대신
 *    `src/__tests__/unit/aiQuestionType.test.ts` 의 «왕복» 시험이 둘을 묶는다 —
 *    여기서 적은 값을 넣고 `classifyFormat` 을 돌려 짝이 맞는지 본다. 한쪽만
 *    고치면 그 시험이 빨개진다.
 */
import { ANSWER_CIRCLED_CLASS } from "@/lib/math/circledNumber";
import { parseProblemContent } from "@/lib/problem/parseProblemContent";

/**
 * DB `question_type` 이 담는 세 값 (`predictor.contract.ts` 의 `questionTypeSchema`).
 * 계약 모듈을 물고 오지 않으려고 여기서는 문자열 유니온으로만 쓴다 —
 * 어긋나면 `generator.ts` 가 `ProblemEntity` 로 좁혀질 때 tsc 가 문다.
 */
export type AiQuestionType = "객관식" | "단답형" | "서술형";

/**
 * 정답 칸에 «보기 번호»가 있나. 계열 목록을 손으로 쓰지 않고 정본에서 가져온다 —
 * `provenance.ts` 의 같은 이름 상수와 **같은 정본**(`ANSWER_CIRCLED_CLASS`)을 읽는다.
 * 어휘가 한 곳이라 「①만 알고 ➀는 모르는」 부류가 양쪽에 동시에 생기지 않는다.
 */
const ANSWER_CHOICE_NUMBER = new RegExp(`[${ANSWER_CIRCLED_CLASS}]`);

/**
 * 생성물의 형식을 **그 문항이 실제로 쓴 글**에서 읽어 낸다.
 *
 * ⚠️ **DB 에 넣을 그 문자열을 넘겨라.** `normalizeLatex` 를 거친 뒤의 본문이어야
 *    화면·지면이 세는 보기와 여기서 세는 보기가 같아진다(자에 넣는 입력이 조판과
 *    다르면 놓침이 된다 — CLAUDE.md 2026-08-18).
 */
export function deriveQuestionType(item: {
  content: string;
  answer: string;
  problemType: string;
}): AiQuestionType {
  const choices = parseProblemContent(item.content).choices.length;

  // 지면에 보기가 서 있고 정답이 그 번호다 — 다른 무엇보다 이 근거가 세다.
  // (`problemType` 이 서술형이라 적혀 있어도 지면이 객관식이면 객관식이다.)
  if (choices >= 2 && ANSWER_CHOICE_NUMBER.test(item.answer)) return "객관식";

  if (item.problemType === "서술형") return "서술형";

  // 남는 것은 전부 단답이다. 보기가 서 있는데 정답이 번호가 아닌 경우
  // (「다음 중 ~은 몇 개인가」)도 학생이 쓰는 것은 **값 하나**라 단답형이다 —
  // `classifyFormat` 의 마지막 갈래가 이 값을 그대로 믿게 되어 있다.
  return "단답형";
}
