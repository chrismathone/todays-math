/**
 * **문항 출처 라벨** — 「이건 무엇이 만들었고 어디서 가져온 것인가」의 유일한 판정 자리.
 *
 * 원장님 지시 2026-08-25: 「문제은행에 보여지는 데이터에 추가로 붙여야겠어. 초등 엔진으로
 * 생성 = [초], 중등 엔진으로 생성 = [중], 도형 엔진으로 생성 = [도], SVG 엔진으로 생성
 * [SVG], 기출 문제 추출 [기] 같은 라벨 붙여줘. 라벨 색상 전부 다르게. 이게 어떤걸로 인해
 * 생성되었고 가져왔고 이런걸 다 분류해야겠어」 + 「문제집 추출 = [문]」.
 *
 * 추가 지시 2026-08-25: 「**객관식 = [객] · 서술형 = [서]**. 이건 출처 축과 다른 축이다」.
 *
 * ## 축이 셋이고, 셋은 직교한다
 *
 * ```
 *   문항 출처 — 문항 «본문»을 무엇이 만들었나    [기] [문] [초] [중] [AI] [?]
 *   형식      — 「보기를 고르는가 써서 내는가」   [객] [서] [?형식]
 *   그림 출처 — 문항에 붙은 «그림»은 어디서 왔나  [도] [SVG] [스캔] (없으면 라벨 없음)
 * ```
 *
 * 겹친다. 초등 엔진이 낸 문항에 도형 엔진이 그림을 그리고 그것이 객관식이면
 * `[초] [도] [객]` 이다(실측 [초]+[도] 365건). 그래서 하나의 열거형으로 뭉치지
 * 않는다 — 뭉치면 셋 중 둘이 반드시 사라진다.
 *
 * ## 판정의 «참»은 **기록된 컬럼**에서 온다 — 코드 모양에서 뽑지 않는다
 *
 * 🔴 물려받은 브리프는 엔진 판정을 **문항 코드 모양**으로 하라고 했다
 *    (`source='manual'` + 코드가 `-A숫자-숫자` 로 끝남 + 첫 글자 `E`/`J`).
 *    오늘 데이터에서는 그 규칙이 맞다(실측 2,410건 전량 일치). **그런데 구조적으로 샌다.**
 *
 *    ㉠ **새 형식 코드는 엔진의 표지가 아니다.** `problem_code_assign` 트리거는 **어느
 *       경로로 들어오든** 새 형식(`E30104-A01-001`)을 붙인다(D-105). 그래서 원장님이
 *       화면(S-08)에서 **손으로 등록한** 초등 문항도 그 모양을 받고, 코드로 판정하면
 *       **[초] 초등 엔진**으로 나온다. 에러도 경고도 없이 그냥 틀린다.
 *    ㉡ **문항류 글자는 `A` 만이 아니다.** 자동 부여는 `A01…A99` 를 채운 뒤 `B01` 로
 *       넘어간다(D-105 `familyCodeFromIndex`). 한 소단원에 100번째 무리가 서는 날
 *       `-A숫자-` 규칙은 그것을 **미분류로 떨군다** — 이것도 조용하다.
 *
 *    가르는 값은 코드가 아니라 **`familyKey`** 다. 엔진이 «자기 유형 정체»를 직접 적는
 *    자리이고(D-105), 사람이 넣은 것·AI 변형은 트리거가 `solo:<uuid>` 로 채운다.
 *    즉 **엔진만 `elem:` / `mid:` 를 쓴다.** 파생이 아니라 기록이다.
 *
 *    (CLAUDE.md 2026-08-18 「판정 근거를 한 컬럼에서만 찾으면 다른 컬럼에 있는 답이
 *     「없는 것」이 된다」 · 2026-08-19 「글꼴이 가르는 것을 글자로 물으면 답이 없다」)
 *
 * ## 미분류를 반드시 낸다
 *
 * `unknown` 은 실수가 아니라 **갈래**다. 0으로 단정하면 「깨끗」과 「못 셈」이 안 갈린다.
 * 실측 2026-08-25(공유 DB 전량 47,784건): 미분류 **764건** — 전부 `manual` 인데
 * `familyKey` 가 없는 옛 행이고, 전량 `pool=private`·`rejected`·출제불가(격리)다.
 * 그 수는 `problemProvenance.test.ts` 와 `scripts/qa/probe-provenance.ts` 가 잰다.
 *
 * ## 전수 실측 (2026-08-25, 공유 DB 47,784건)
 *
 * | 문항 출처 | 건수 | | 그림 출처 | 건수 |
 * |---|---|---|---|---|
 * | `[기]` past_exam   | 41,084 | | `[도]` figureSvg        |    521 |
 * | `[문]` transformed |  3,526 | | `[SVG]` `/figures-svg/` |  1,118 |
 * | `[초]` `elem:`     |  1,751 | | `[스캔]` `/figures/`    |  8,224 |
 * | `[중]` `mid:`      |    659 | | 그림 미분류             |      0 |
 * | `[AI]` ai·변형     |      0 | | (그림 없음)             | 37,921 |
 * | `[?]` 미분류       |    764 | |                         |        |
 *
 * | 형식 | 건수 |
 * |---|---|
 * | `[객]` 객관식   | 33,860 |
 * | `[단]` 단답형   |  3,113 |
 * | `[서]` 서술형   |  7,743 |
 * | `[?형식]` 미분류 |  3,071 |
 *
 * 한 문항이 `figureSvg` 와 `figureUrls` 를 **같이** 갖는 일은 없고(실측 0건), 한 문항의
 * `figureUrls` 가 `/figures-svg/` 와 `/figures/` 를 섞는 일도 없다(실측 0건).
 */

import { ANSWER_CIRCLED_CLASS } from "@/lib/math/circledNumber";

import { parseProblemContent } from "./parseProblemContent";

/**
 * 정답 칸에 «보기 번호»가 있나. 계열 목록을 손으로 쓰지 않고 정본에서 가져온다 —
 * `➀`(U+2780) 계열이 든 행이 **「원문자가 없다」로 읽히던** 전례가 있다(circledNumber.ts).
 */
const ANSWER_CHOICE_NUMBER = new RegExp(`[${ANSWER_CIRCLED_CLASS}]`);

/** 문항 «본문»을 무엇이 만들었나 / 어디서 가져왔나. 문항마다 **정확히 하나**다. */
export type ProblemOrigin =
  "past_exam" | "workbook" | "elem_engine" | "middle_engine" | "ai" | "unknown";

/** 문항에 붙은 «그림»이 어디서 왔나. 그림이 없으면 `null`. */
export type FigureOrigin = "figure_engine" | "svg_engine" | "scan" | "unknown";

/**
 * 「보기를 고르는가, 써서 내는가 (단답형인가 서술형인가)」. 문항마다 **정확히 하나**다.
 *
 * 원장님 지시 2026-08-26: 「[서]가 단답형과 서술형 전부 같이 있을 것 같은데, [단]과 [서]를 분리하라」
 */
export type ProblemFormat =
  "multiple_choice" | "short_answer" | "descriptive" | "unknown";

/**
 * 판정에 필요한 최소 모양 — `ProblemEntity` 가 그대로 들어맞고, 스크립트가 DB 행을
 * 그대로 넘겨도 된다. **여기 없는 컬럼은 판정에 쓰지 않는다**(쓰려면 이 모양을 넓혀서
 * 화면·스크립트가 같이 넓어지게 한다).
 */
export type ProvenanceInput = {
  source: string;
  /**
   * 엔진이 적는 자기 유형 정체 (D-105). `elem:…` · `mid:…` · `solo:<uuid>` · 없음.
   *
   * ⚠️ **널로 두면 「엔진이 아니다」가 된다.** 그래서 계약(`problem.contract.ts`)이 이
   *    값을 **반드시 실어 보내게** 했다 — 어느 경로가 빠뜨리면 엔진 문항 2,410건이
   *    통째로 미분류로 떨어지는데 **에러가 안 난다**(`consoleRow.ts` 가 겪은 그 자리).
   */
  familyKey: string | null;
  /** 변형본의 원본. `transformed` 안에서 **AI 변형과 교재 이관본을 가르는 유일한 값**이다. */
  originProblemId: string | null;
  figureUrls: readonly string[];
  figureSvg: string | null;
  /** 형식 판정이 **보기**를 세는 자리. 지면 파서와 같은 함수를 쓴다. */
  content: string;
  /** 형식 판정이 **정답 모양**을 보는 자리. */
  answer: string;
  /** DB에 기록된 출제 형식 ('객관식' | '단답형' | '서술형' | null) */
  questionType?: string | null;
  /** DB에 기록된 문제 유형 ('계산' | '개념' | '활용' | '서술형' | null) */
  problemType?: string | null;
};

/** 엔진이 `familyKey` 앞에 붙이는 표지. 엔진 말고는 아무도 이 접두사를 안 쓴다(D-105). */
const ENGINE_PREFIX: ReadonlyArray<readonly [string, ProblemOrigin]> = [
  ["elem:", "elem_engine"],
  ["mid:", "middle_engine"],
];

/** 저장소가 그림 파일을 두는 뿌리. 실측(2026-08-25) 이 둘 말고는 없다. */
const SVG_ENGINE_PREFIX = "/figures-svg/";
const SCAN_PREFIX = "/figures/";

/**
 * 문항 출처 판정.
 *
 * ⚠️ `transformed` 는 **두 가지**다 — RPM 교재 이관본과 AI 변형본이 같은 값을 쓴다
 *    (`src/lib/ai/transformer.ts` 가 변형본에도 `transformed` 를 적는다).
 *    **가르는 유일한 값이 `originProblemId` 의 NULL 이다**: 교재 문항은 우리 DB 에 원본이
 *    없어 NULL 이고, AI 변형본은 우리 문항을 가리킨다
 *    (CLAUDE.md 2026-08-18 「빈 컬럼이 결함이 아니라 판별자였다」).
 *    이 컬럼을 입력에서 빼면 그 순간 **AI 변형본이 [문] 문제집으로 조용히 잘못 붙는다.**
 */
export function classifyOrigin(problem: ProvenanceInput): ProblemOrigin {
  if (problem.source === "ai_generated") return "ai";
  if (problem.source === "transformed") {
    // 원본이 우리 DB 에 있으면 **우리 문항을 변형한 것** = AI 변형(D-22 경로).
    // 없으면 교재 이관본이다 — 교재 원본은 애초에 우리 DB 에 없다.
    return problem.originProblemId ? "ai" : "workbook";
  }
  if (problem.source === "past_exam") return "past_exam";

  const family = problem.familyKey ?? "";
  for (const [prefix, origin] of ENGINE_PREFIX) {
    if (family.startsWith(prefix)) return origin;
  }
  // `manual` 인데 엔진 표지가 없다 = 사람이 넣었거나, 표지가 생기기 전의 옛 행이다.
  // 둘을 갈라 줄 근거가 **행 안에 없다** — 지어내지 않고 미분류로 낸다.
  return "unknown";
}

/** 그림 출처 판정. 그림이 아예 없으면 `null` — 「모른다(`unknown`)」와 다른 말이다. */
export function classifyFigure(problem: ProvenanceInput): FigureOrigin | null {
  if (problem.figureSvg !== null && problem.figureSvg !== "") {
    // 인라인 SVG 의 생산자는 `renderFigureSpec.ts` 하나뿐이다(problem.contract.ts).
    return "figure_engine";
  }
  const urls = problem.figureUrls;
  if (urls.length === 0) return null;
  if (urls.some((u) => u.startsWith(SVG_ENGINE_PREFIX))) return "svg_engine";
  if (urls.some((u) => u.startsWith(SCAN_PREFIX))) return "scan";
  // 그림은 있는데 아는 뿌리가 아니다. **조용히 «스캔»으로 뭉개지 않는다** —
  // 새 뿌리가 생기면 여기가 0이 아니게 되고, 그때 사람이 봐야 한다.
  return "unknown";
}

/**
 * 형식 판정 — `[객] [단] [서]` 로 가른다 (원장님 지시 2026-08-26).
 *
 * 1. 객관식(`multiple_choice`): 지면 파서 기준 보기가 2개 이상이고 정답이 보기 번호인 경우
 * 2. 단답형(`short_answer`): 주관식(보기 없음 & 정답이 번호 아님)이면서
 *    - `questionType === '단답형'` 이거나,
 *    - `familyKey` 가 `elem:` / `mid:` 인 엔진 생성 문항(전량 단답형)
 * 3. 서술형(`descriptive`): 주관식이면서
 *    - `questionType === '서술형'` 이거나,
 *    - `questionType` 이 null 이고 `problemType === '서술형'` 인 경우
 * 4. 미분류(`unknown`):
 *    - 보기/정답이 어긋나거나, `questionType` 이 누락되어 단답/서술을 확정할 수 없는 주관식(RPM 등)
 *    - 조용히 한쪽으로 몰아넣지 않고 `[?형식]` 으로 드러낸다.
 */
export function classifyFormat(problem: ProvenanceInput): ProblemFormat {
  const choices = parseProblemContent(problem.content).choices.length;
  const answerHasChoiceNumber = ANSWER_CHOICE_NUMBER.test(problem.answer);

  if (choices >= 2 && answerHasChoiceNumber) return "multiple_choice";

  if (choices === 0 && !answerHasChoiceNumber) {
    if (problem.questionType === "단답형") return "short_answer";
    if (problem.questionType === "서술형") return "descriptive";
    const family = problem.familyKey ?? "";
    if (family.startsWith("elem:") || family.startsWith("mid:")) {
      return "short_answer";
    }
    if (!problem.questionType && problem.problemType === "서술형") {
      return "descriptive";
    }
    return "unknown";
  }

  // 보기가 있는데 정답이 번호가 아닌 경우 — 「다음 중 ~은 몇 개인지 구하시오」 유형.
  // questionType 이 명시적이면 그것을 믿는다.
  if (problem.questionType === "단답형") return "short_answer";
  if (problem.questionType === "서술형") return "descriptive";

  return "unknown";
}

/** 화면이 그리는 라벨 한 장. */
export type ProvenanceBadge = {
  /**
   * 어느 축의 말인가. **한 문항에 축마다 최대 한 장**이므로 이 값이 곧 화면의 키다.
   *
   * ⚠️ `kind` 를 키로 쓰지 마라 — 세 축이 «모른다»에 **같은 이름(`unknown`)**을 쓴다.
   *    출처도 형식도 모르는 문항이면 `kind` 가 둘 다 `unknown` 이라 React 키가 겹친다.
   */
  axis: "origin" | "figure" | "format";
  /** 갈래 키 — 시험·조사가 지목하는 값. 축이 다르면 같은 이름이 있을 수 있다. */
  kind: ProblemOrigin | FigureOrigin | ProblemFormat;
  /** 원장님이 지시한 대괄호 표기. */
  text: string;
  /** 라벨만으로 안 읽히는 사람에게 주는 말 (05 §5 — 색 단독으로 뜻을 전달하지 않는다). */
  name: string;
  /** 글자색 유틸리티. 면색이 아니다 — 아래 「색을 어떻게 정했나」 참조. */
  className: string;
};

/** 라벨의 «얼굴» — 축·갈래를 뺀 나머지. 표 셋이 같은 모양을 쓴다. */
type BadgeFace = Omit<ProvenanceBadge, "kind" | "axis">;

/**
 * ## 색을 어떻게 정했나 — 원장님 지시와 기존 결정의 화해
 *
 * 원장님은 **「라벨 색상 전부 다르게」**라고 하셨다. 그런데 이 카드 머리에는 이미
 * 반대 방향의 결정이 있다:
 *
 *  - `ProblemCard.tsx` 주석: 「알약 칩은 **면색**을 세 개 더 만들어 팔레트를 흐린다.
 *    위계는 글자 명도로 낸다」 (05 §8.6, 원장님 재확인 2026-08-18)
 *  - 05 §2.2: 「기능색(G2 넷)은 위 의미로만 — 장식 사용 금지」
 *
 * 다섯으로 화해했다.
 *
 * **⑴ 면색을 안 쓴다 — 글자색이다.** 기존 결정이 금지한 것은 «면색»이다(검수 상태도
 *    같은 이유로 글자색이다). 글자색이면 팔레트에 칠해지는 면이 하나도 늘지 않는다.
 *
 * **⑵ G2 기능색을 안 쓴다.** 여덟 색 전부 이 화면의 기존 색 여섯(`ink`·`text-2`·
 *    `green`·`yellow-text`·`red-text`·`blue`)과 **CIE ΔE2000 ≥ 16.5** 떨어져 있다.
 *    같은 줄에 검수 상태(승인 초록·대기 노랑·반려 빨강 **글자**)가 있어서, 색이 가까우면
 *    「승인」과 「기출」이 같은 색으로 읽힌다.
 *
 * **⑶ 명도를 평평하게 둔다.** G2 는 **명도 계단**이 뜻을 나른다(끝난 단계 10.49 →
 *    빈 칸 1.31, 05 §2.2 「잉크가 차오르는 관」). 출처는 위계가 없는 **분류**축이라
 *    여덟 색의 대비를 **4.81~7.49** 한 띠에 몰아넣었다. 계단이 아니므로 곁눈질로도
 *    「어느 쪽이 더 나아간 상태」로 안 읽힌다 — 구조가 다르면 뜻이 안 섞인다.
 *
 * **⑷ 색만으로 뜻을 전달하지 않는다** (05 §5). 라벨은 언제나 **글자**(`[초]`)를 달고,
 *    `title` 에 갈래 이름이 그대로 들어간다. 흑백 복사·색각 이상에서도 글자가 남는다.
 *    여덟 색은 **보조 신호**다.
 *
 * **⑸ 자리를 갈랐다.** 출처는 **문항 코드 바로 오른쪽**(왼쪽 무리), 검수 상태는
 *    `ml-auto` 오른쪽 무리다. 이 자리는 새로 만든 것이 아니다 — D-53 이 이미
 *    「화면은 코드 옆에 현재 단원·**출처**를 항상 같이 보여야 한다」고 적어 두었고,
 *    이제서야 그 요구를 채운 것이다.
 *
 * ⚠️ **여덟 색은 눈으로 고른 것이 아니라 찾은 것이다.** 처음엔 색상환을 눈대중으로
 *    나눠 골랐는데 실측 최소 ΔE 가 **8.4** 였다(초↔중이 사실상 같은 색). 그래서 LCh
 *    격자에서 「후보 여덟 + 이 화면의 기존 색 여섯」의 **최소 ΔE 를 최대화**하도록
 *    탐색해 뽑았다. 결과: 후보끼리 최소 **16.1**, 기존 색과 최소 **16.5**.
 *    값은 `globals.css` 의 `:root` 가 유일한 출처이고(05 §2.2.1 — 리터럴을 두 벌
 *    두지 마라), `provenancePalette.test.ts` 가 그 파일을 읽어 대비·ΔE 를 **다시 잰다.**
 *    색을 바꾸면 그 시험이 빨개진다.
 */
const ORIGIN_BADGE: Readonly<Record<ProblemOrigin, BadgeFace>> = {
  past_exam: {
    text: "[기]",
    name: "기출 추출",
    className: "text-src-past-exam",
  },
  workbook: {
    text: "[문]",
    name: "문제집 추출",
    className: "text-src-workbook",
  },
  elem_engine: {
    text: "[초]",
    name: "초등 엔진 생성",
    className: "text-src-elem",
  },
  middle_engine: {
    text: "[중]",
    name: "중등 엔진 생성",
    className: "text-src-middle",
  },
  ai: { text: "[AI]", name: "AI 생성·변형", className: "text-src-ai" },
  unknown: { text: "[?]", name: "출처 미분류", className: "text-src-unknown" },
};

const FORMAT_BADGE: Readonly<Record<ProblemFormat, BadgeFace>> = {
  multiple_choice: { text: "[객]", name: "객관식", className: "text-src-mcq" },
  short_answer: { text: "[단]", name: "단답형", className: "text-src-short" },
  descriptive: { text: "[서]", name: "서술형", className: "text-src-written" },
  unknown: {
    text: "[?형식]",
    name: "형식 미분류",
    className: "text-src-unknown",
  },
};

const FIGURE_BADGE: Readonly<Record<FigureOrigin, BadgeFace>> = {
  figure_engine: {
    text: "[도]",
    name: "도형 엔진 생성",
    className: "text-src-figure",
  },
  svg_engine: {
    text: "[SVG]",
    name: "SVG 엔진 생성",
    className: "text-src-svg",
  },
  scan: {
    text: "[스캔]",
    name: "원본 시험지 오려냄",
    className: "text-src-scan",
  },
  unknown: {
    text: "[?그림]",
    name: "그림 출처 미분류",
    className: "text-src-unknown",
  },
};

/**
 * 카드가 그리는 라벨 목록 — **문항 출처와 형식은 언제나 하나씩**, 그림 출처는 그림이
 * 있을 때만. 차례는 원장님이 부른 차례다(`[초] [도] [객]` → 출처 · 그림 · 형식).
 *
 * 「모른다」는 세 축에서 뜻이 같으므로 **색도 하나**(회색)를 쓴다. 「전부 다르게」는
 * 원장님이 이름 붙인 **갈래**들 사이의 규칙이지, «모른다»까지 색을 하나 더 만들라는
 * 말이 아니다 — 모른다에 고유색을 주면 그것이 하나의 «분류»처럼 읽힌다.
 */
export function provenanceBadges(problem: ProvenanceInput): ProvenanceBadge[] {
  const origin = classifyOrigin(problem);
  const badges: ProvenanceBadge[] = [
    { axis: "origin", kind: origin, ...ORIGIN_BADGE[origin] },
  ];
  const figure = classifyFigure(problem);
  if (figure !== null) {
    badges.push({ axis: "figure", kind: figure, ...FIGURE_BADGE[figure] });
  }
  const format = classifyFormat(problem);
  badges.push({ axis: "format", kind: format, ...FORMAT_BADGE[format] });
  return badges;
}

/** 갈래 전량 — 조사·시험이 손으로 다시 나열하지 않게 여기서 뽑아 쓴다(D-106 교훈). */
export const PROBLEM_ORIGINS = Object.keys(ORIGIN_BADGE) as ProblemOrigin[];
export const FIGURE_ORIGINS = Object.keys(FIGURE_BADGE) as FigureOrigin[];
export const PROBLEM_FORMATS = Object.keys(FORMAT_BADGE) as ProblemFormat[];

/**
 * 갈래 → 색 토큰 이름. 팔레트 시험이 `globals.css` 를 대조할 때 쓴다.
 *
 * ⚠️ 세 축이 «모른다»에 같은 이름을 쓰므로 축을 같이 받아야 한다 — 안 그러면 어느
 *    표를 볼지 순서가 정하고, 표를 하나 더하는 날 조용히 다른 색을 가리킨다.
 */
export function provenanceColorToken(
  axis: ProvenanceBadge["axis"],
  kind: string,
): string {
  const table = (
    axis === "origin"
      ? ORIGIN_BADGE
      : axis === "figure"
        ? FIGURE_BADGE
        : FORMAT_BADGE
  ) as Record<string, Omit<ProvenanceBadge, "kind" | "axis">>;
  return table[kind]!.className.replace(/^text-/, "--color-");
}
