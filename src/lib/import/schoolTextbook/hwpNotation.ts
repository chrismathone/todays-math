/**
 * 교과서 이관 — 수식 안에 남은 «한글 수식 표기»를 KaTeX 로 바꾸고(값은 그대로), 그래도 남은 것을 센다 (D-161).
 *
 * 왜 있나 — 2026-10-07 에 6,121문항을 실은 직후, 지면에 «boldx» · «x->4» · «_{4}SMALLPROD_{3}» 가 그대로 찍히는
 * 문항을 표본에서 찾았다. 변환 정본(`scripts/qa/convert-hwp-spans.py`)은 한글 수식의 낱말을 **띄어 쓴 것만** 알아보는데,
 * 출판사 파일은 붙여 쓴다(`boldx` · `5timesa` · `10LEN<100` — 한글은 낱말을 글자 사이에서도 읽는다).
 * 🔴 제품 렌더러는 이것을 오류로 보지 않는다 — 모르는 낱말은 기울어진 글자로 그린다. 그래서 «그려지는가»로는 못 잡고
 *    **낱말로 센다**(`hwpLeftovers`). 적재기는 손질한 뒤에도 남은 것이 있으면 그 문항을 출제에서 잠근다.
 *
 * 여기서 하는 손질은 전부 **표기**다 — 문항의 값 · 뜻은 바꾸지 않는다(검토자가 읽은 그 식 그대로다).
 *   굵게 · 기울임 낱말은 걷는다 / 화살표 · 부정 · 작은 곱 · 동그라미 · 온도 · 직선 기호 / 밑줄은 바로 뒤의 항 하나 /
 *   붙은 연산 · 관계 낱말 / 프라임 / 곧은 글자로 쓴 수 · 기울어진 단위 / 검토자의 출력에서 먹힌 `\right`
 * 규칙마다 실제 예가 시험에 있다(`src/__tests__/unit/hwpNotation.test.ts`). 예 없이 규칙을 더하지 않는다.
 */

const MATH = /\$[^$]*\$/g;
/** 낱말 규칙이 건드리지 않는 묶음 — 곧은 글자 · 글 · 환경 이름 */
const PROTECTED =
  /(\\(?:mathrm|text|mathbf|mathit|operatorname|begin|end)\{[^{}]*\})/;
/** 붙여 써도 변수의 곱으로 읽힐 일이 드문 단위. 긴 것이 앞이다 */
const UNIT = String.raw`km\/h|m\/s|kWh|kcal|cm|km|mm|kg|mL|kL|mg|Hz|MB|GB|dB`;

const UNIT_AFTER_DIGIT = new RegExp(
  String.raw`(?<=\d)(?:\\,|~|\s)*(${UNIT})(?![A-Za-z])`,
  "g",
);
const UNIT_AFTER_SPACE = new RegExp(
  String.raw`(?<=\\pi\s?|[a-z0-9})])(?:\\,|~)+(${UNIT})(?![A-Za-z])`,
  "g",
);
/** 원주율 · 괄호 · 분수 뒤에 바로 붙은 단위 — «25\pi cm» · «(x+3)km» · «\frac{5}{4}km» */
const UNIT_GLUED = new RegExp(
  String.raw`(?<=\\pi\s?|[)}])(${UNIT})(?![A-Za-z])`,
  "g",
);
/** 숫자 뒤 괄호 안의 단위 — «205(MB)». 한 글자 단위는 뺀다(«2(m)» 은 곱일 수 있다) */
const UNIT_IN_PARENS_AFTER_DIGIT = new RegExp(
  String.raw`(?<=\d)\((${UNIT})(\^\{\d\})?\)`,
  "g",
);
const UNIT_IN_PARENS = new RegExp(
  String.raw`(?<=\\,|~|\\pi\s?)\((${UNIT}|m|g|L)(\^\{\d\})?\)`,
  "g",
);

/** 묶음 밖(낱말이 살아 있는 자리)의 손질 */
function tidyWords(chunk: string): string {
  return (
    chunk
      // 검토자의 출력에서 `\right` 의 `\r` 이 줄바꿈 글자가 됐다 — «\left( … ight)»
      .replace(/\s*(?<![A-Za-z\\])ight(?=\s*(?:[)\]|.]|\\[}|]))/g, "\\right")
      // 굵게 · 기울임 — 낱말만 걷는다
      .replace(/(?<![\\A-Za-z])(?:bold|BOLD)/g, "")
      .replace(/(?<![\\A-Za-z])(?:it|rm)(?=[A-Z])/g, "")
      // 붙은 연산 낱말 — «5timesa» · «14div7» · «3cdot\sqrt{7}»
      .replace(/(?<![\\A-Za-z])cdots/g, "\\cdots ")
      .replace(/(?<!\\)(times|div|cdot)(?!s)/g, "\\$1 ")
      // 붙은 관계 낱말 — 긴 것은 어디서나, LE · GE 는 숫자에 닿은 것만(«\overline{GE}» 는 선분이다)
      .replace(/(?<!\\)NOTIN/g, "\\notin ")
      .replace(/(?<!\\)NSUBSET/g, "\\not\\subset ")
      .replace(
        /(?<=\d)(LE|GE)(?=[A-Za-z\d\\(])/g,
        (_all, word: string) => `\\${word.toLowerCase()} `,
      )
      .replace(
        /(?<=[A-Za-z)])(LE|GE)(?=\d)/g,
        (_all, word: string) => `\\${word.toLowerCase()} `,
      )
      // 온도
      .replace(
        /(?<!\\)(?:DEGRMC|CENTIGRADE|centigrade)/g,
        "{}^{\\circ}\\mathrm{C}",
      )
      .replace(/(?<!\\)(?:FAHRENHEIT|fahrenheit)/g, "{}^{\\circ}\\mathrm{F}")
      // 작은 곱 · 합 · 동그라미
      .replace(/(?<!\\)SMALLPROD/g, "\\Pi ")
      .replace(/(?<!\\)SMALLSUM/g, "\\sum ")
      .replace(/(?<!\\)(?:BIGCIRC|bigcirc)/g, "\\bigcirc ")
      // 명제의 부정 — «simp» 는 ~p 다(p · q · r · s 한 글자 앞에서만)
      .replace(/(?<![\\A-Za-z])(?:sim|SIM)(?=[pqrs](?![A-Za-z]))/g, "\\sim ")
      // 화살표
      .replace(/<->/g, "\\leftrightarrow ")
      .replace(/->/g, "\\to ")
      // 밑줄 — 바로 뒤의 항 하나(부호 + 숫자 · 글자)
      .replace(
        /(?<!\\)under([+-]?(?:(?!under)[0-9A-Za-z.])+)/g,
        "\\underline{$1}",
      )
      // 프라임 — 위첨자 안의 것은 그대로
      .replace(/(?<![\^{](?:\\,|\s)*)(?:\\,|\s)*\\prime(?![a-zA-Z])\s*/g, "'")
      // 단위 — 곧은 글자로
      .replace(UNIT_AFTER_DIGIT, "\\,\\mathrm{$1}")
      .replace(UNIT_AFTER_SPACE, "\\,\\mathrm{$1}")
      .replace(/(?<=\d)(?:\\,|~)(m|g|L)(?![A-Za-z{_(/])/g, "\\,\\mathrm{$1}")
      .replace(
        /(?<![\\A-Za-z])([a-z])(cm|km)(?![A-Za-z])/g,
        "$1\\,\\mathrm{$2}",
      )
      .replace(UNIT_GLUED, "\\,\\mathrm{$1}")
      .replace(UNIT_IN_PARENS, "(\\mathrm{$1}$2)")
      .replace(UNIT_IN_PARENS_AFTER_DIGIT, "(\\mathrm{$1}$2)")
      // 그 밖의 표기
      .replace(/(?<!\.)\.\.\.(?!\.)/g, "\\cdots ")
      .replace(/\\int\s*_\{\}\^\{\}/g, "\\int ")
      .replace(/\+-(?=\s*[\d\\a-zA-Z(])/g, "\\pm ")
  );
}

const FULL_WIDTH_SIGNS: Record<string, string> = {
  "－": "-",
  "＋": "+",
  "＜": "<",
  "＞": ">",
  "＝": "=",
};

function tidyBody(body: string): string {
  let out = body
    .replace(/\s*\n\s*/g, " ")
    // 전각 기호 — 수식 글꼴로 조판되지 않는다(«$2x^{2}+ax－3+a$» · «$x＜3$»)
    .replace(/[－＋＜＞＝]/g, (sign) => FULL_WIDTH_SIGNS[sign] ?? sign)
    // 근호가 부호만 감쌌다 — «\sqrt{-}3» 은 √(−3) 이다(허수 단원)
    .replace(/\\sqrt\{-\}(\d+)/g, "\\sqrt{-$1}")
    // 곧은 글자 묶음이 걸리는 것은 낱말 규칙보다 먼저 — «\mathrm{bold}60» · «\mathrm{230}\,km» · «dyad\mathrm{AB}»
    .replace(/\\mathrm\{bold\}/g, "")
    // 곧은 글자로 감싼 괄호 — «\mathrm{(}cm^{2})»
    .replace(/\\mathrm\{([()])\}/g, "$1")
    .replace(/\\mathrm\{([\d.,=+\-~\s]*)\}/g, "$1")
    .replace(
      /(?<!\\)dyad\s*(\\mathrm\{[^{}]*\}|\{[^{}]*\}|[A-Z]{2})/g,
      "\\overleftrightarrow{$1}",
    );
  // `\mathrm{A}B` 는 `\mathrm{AB}` — 한글 수식의 곧은 글자는 띄어쓰기까지다
  for (;;) {
    const next = out.replace(
      /\\mathrm\{([A-Za-z]+)\}([A-Za-z]+)/g,
      "\\mathrm{$1$2}",
    );
    if (next === out) break;
    out = next;
  }
  return out
    .split(PROTECTED)
    .map((chunk, index) => (index % 2 === 1 ? chunk : tidyWords(chunk)))
    .join("")
    .replace(/ +$/, "");
}

/** 본문 · 정답 · 해설 한 칸을 손질한다. 수식 밖의 글자는 그대로다(줄 끝 빈칸 · 끊긴 괄호만). */
export function tidyHwpNotation(text: string): string {
  return text
    .replace(MATH, (segment) => {
      const body = tidyBody(segment.slice(1, -1));
      // 빈 수식(`$_{}$` · `$\,$`)은 지면에 아무것도 안 그리면서 줄 사이를 벌린다
      return body.replace(/_\{\}|\^\{\}|\{\}|\\,|~|\s/g, "") === ""
        ? ""
        : `$${body}$`;
    })
    .replace(/\(\s*\n\s*\)/g, "( )")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

/**
 * 본문 머리에 붙은 문항 번호를 걷는다 — «01다음을 합의 기호 …» · «01 수직선 위의 …» · «01$625$의 네제곱근 …».
 * 0 으로 시작하는 두 자리 수, 그리고 «1 다음 …» · «1 두 수 …»(첫 문항의 번호가 본문에 붙은 것)만이다.
 * «1시간 후 …» · «10개의 공 …» · «3 이상의 자연수 …» 는 본문이다. 본문에만 건다.
 */
export function stripItemNumber(content: string): string {
  return content
    .replace(/^0\d\s*(?=[가-힣$])/, "")
    .replace(/^1\s+(?=다음|두\s+수)/, "");
}

/**
 * 본문 앞뒤에 섞인 «문항이 아닌 글»을 걷는다 — 지면 검토(2026-10-07)가 짚은 꼴 넷이다.
 *   · 유형 제목 «|원 위의 한 점을 지나는 접선의 방정식| 다음 접선의 …» — 세로줄로 감싼 머리
 *   · 단원 제목 한 줄 + 번호 «명제와 조건 ⏎ 01 두 조건 …» — 둘째 줄이 «01» 로 시작할 때만(제목만 있는 줄은 가릴 수 없다)
 *   · 난이도 표지 «●○○ ⏎ 다음 중 …»
 *   · 끝의 출처 표지 «… ⑤ $40$ ⏎ [2020년 3월 고2 15번]»
 */
export function stripForeignLines(content: string): string {
  return content
    .replace(/^\|[^|\n]{2,80}\|\s*/, "")
    .replace(/^[^\n$?.!]{2,25}\n(?=0\d\s*[가-힣$])/, "")
    .replace(/^[●○◐]{2,5}\s*\n/, "")
    .replace(/\s*\[\s*20\d\d년[^\]\n]*\]\s*$/, "");
}

/**
 * 본문에 남은 배점 표시를 걷는다 — «… 의 값은? [$4$점]». 시험 대비 자료의 발문 끝에 붙어 있다(101문항).
 * 대괄호 안에 수와 «점»만 있을 때다. 본문에만 건다.
 */
export function stripScoreMarks(content: string): string {
  return content.replace(
    /[ \t]*[[［]\s*\$?\s*\d+(?:\.\d+)?\s*\$?\s*점\s*[\]］]/g,
    "",
  );
}

/** 본문에만 거는 손질 — 문항이 아닌 글(머리 · 번호 · 배점 · 출처)을 걷는다 */
export function cleanContent(content: string): string {
  return stripScoreMarks(stripItemNumber(stripForeignLines(content))).trim();
}

const LEFTOVER_WORDS: Array<[RegExp, string | null]> = [
  [/(?<![\\A-Za-z])(?:bold|BOLD)/, "bold"],
  [/->/, "->"],
  [/(?<!\\)under(?!line|brace|set)/, "under"],
  [
    /(?<!\\)(SMALL[A-Z]+|BIGCIRC|bigcirc|DEGRMC|CENTIGRADE|centigrade|FAHRENHEIT|fahrenheit|NOTIN|NSUBSET|dyad)/,
    null,
  ],
  [/(?<![A-Za-z\\])ight(?![a-z])/, "ight"],
  [/(?<!\\)(times|div|cdot)/, null],
  [/(?<![\\A-Za-z])(?:sim|SIM)[A-Za-z]/, "sim"],
  [/(?<=[A-Z])(LE|GE)(?=\\(?:overline|frac|dfrac|sqrt))|(?<=\d)(LE|GE)/, null],
  [/(?<![\\A-Za-z])(?:it|rm)(?=[A-Z])/, "it"],
  [/(?<![\\A-Za-z])(?:over)?line(?=[A-Z])/, "line"],
];

/**
 * 수식 안에 남은 한글 수식 낱말 · 깨진 꼴 — 없으면 빈 배열.
 * 손질(`tidyHwpNotation`)한 글에 건다. 여기 걸린 것은 규칙으로 못 고친 것이다(세로셈 · 분자 없는 분수 · 모르는 낱말).
 */
export function hwpLeftovers(text: string): string[] {
  const found = new Set<string>();
  for (const segment of text.match(MATH) ?? []) {
    if (/\\begin\{cases\}\s*(?:\\\\\s*)*\\end\{cases\}/.test(segment))
      found.add("빈 cases");
    // 분자 · 분모가 빈 분수 — 묶음을 걷기 전의 글에서 본다(`\frac{\mathrm{AB}}{2}` 는 비지 않았다)
    if (/\\frac\{\s*\}|\\frac\{[^{}]*\}\{\s*\}/.test(segment))
      found.add("\\frac{}");
    const bare = segment
      .split(PROTECTED)
      .filter((_chunk, index) => index % 2 === 0)
      .join(" ");
    for (const [pattern, name] of LEFTOVER_WORDS) {
      const hit = pattern.exec(bare);
      if (hit) found.add(name ?? hit.slice(1).find(Boolean) ?? hit[0]);
    }
  }
  return [...found];
}
