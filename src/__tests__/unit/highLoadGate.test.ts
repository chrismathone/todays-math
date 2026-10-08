/**
 * 🚧 **고등 공용 판정기 — 적재 전 관문** (`scripts/qa/highLoadGate.ts` · 2026-10-08 엔진 보강 ③-0).
 *
 * 둘로 나뉜다.
 *
 * ```
 * ㉠ 눈금 — 지어낸 행으로 축마다 **양성과 음성을 같은 자리에** 댄다(걸려야 할 것만 걸리는가)
 * ㉡ 값 읽개 — 보기 둘이 «같은 값»인가(`highChoiceValue.ts`). 같은 것 · 다른 것 · 못 읽는 것
 * ㉢ 관문 — 살아 있는 등록부를 적재 계획 그대로 + 씨앗 셋 더 돌려 막힌 것 0 · 못 읽은 보기 0
 * ```
 *
 * ㉠㉡ 이 없으면 ㉢ 의 «0»이 깨끗인지 못 셈인지 안 갈린다(20번 문서 2026-08-21 «가드가 0을 내면»).
 * 관문이 처음 돌았을 때(씨앗 여덟 · 32,208행) 실제로 걸린 것은 셋이었다 — 해설의 `\pmi`(없는 명령) ·
 * 답이 발문에 그대로(`항등식과 나머지정리|07`) · 값이 같은 보기(`인수분해|04`). 그 셋은 ㉠ 의 양성 예로 박았다.
 */
import { describe, expect, it } from "vitest";

import { highPreloadVerdict } from "../../../scripts/import/load-engine-problems";
import {
  readChoiceValue,
  sameChoice,
} from "../../../scripts/qa/highChoiceValue";
import {
  describeGate,
  highLoadGate,
  renderFaults,
  shownExpression,
  type GateRow,
} from "../../../scripts/qa/highLoadGate";
import {
  gateTable,
  planRows,
  registryRowsAt,
} from "../../../scripts/qa/probe-high-gate";

const SECTION = "다항식의 덧셈과 뺄셈";

/** 멀쩡한 단답 · 객관 한 쌍 — 축마다 여기서 한 군데만 망가뜨린다. */
function pair(over: {
  key?: string;
  stem?: string;
  answer?: string;
  solution?: string;
  choices?: string[];
  mark?: string;
  difficulty?: string;
  section?: string;
  grade?: string;
}): GateRow[] {
  const key = over.key ?? "공통수학1|가짜 중단원|03";
  const stem =
    over.stem ?? "두 다항식 $A=2x+3$, $B=5x-12$에 대하여 $A+B$를 구하시오.";
  const answer = over.answer ?? "$7x-9$";
  const choices = over.choices ?? [
    "$7x+15$",
    "$7x-9$",
    "$-3x-9$",
    "$7x+9$",
    "$17x-9$",
  ];
  const base = {
    variantKey: `high:${key}|s1|v0`,
    familyKey: `high:${key}`,
    grade: over.grade ?? "공통수학1",
    section: over.section ?? SECTION,
    solution:
      over.solution ??
      "동류항끼리 모으면 $A+B=(2+5)x+(3-12)$이다.\n따라서 $A+B$는 $7x-9$이다.",
    difficulty: over.difficulty ?? "기본",
  };
  return [
    {
      ...base,
      externalId: `engine-high:${key}|s1|v0|단답형`,
      content: stem,
      answer,
      questionType: "단답형",
    },
    {
      ...base,
      externalId: `engine-high:${key}|s1|v0|객관식`,
      content: `${stem}\n${choices.map((c, i) => `${"①②③④⑤"[i]} ${c}`).join("\n")}`,
      answer: over.mark ?? "②",
      questionType: "객관식",
    },
  ];
}

const rulesOf = (rows: GateRow[]) =>
  highLoadGate(rows).hits.map((h) => `${h.axis}/${h.rule}`);

describe("㉠ 눈금 — 축마다 양성과 음성", () => {
  it("멀쩡한 쌍은 아무 축에도 안 걸린다 — 그리고 보기 열 쌍을 전부 값으로 견줬다", () => {
    const report = highLoadGate(pair({}));
    expect(report.hits).toEqual([]);
    expect(report.unread).toEqual([]);
    expect(report.comparedPairs).toBe(10);
    expect(report.rows).toBe(2);
    expect(report.families).toBe(1);
    expect(report.difficulty).toEqual({ 기본: 2 });
    expect(report.bySection).toEqual({
      [`공통수학1 / ${SECTION}`]: { 기본: 2 },
    });
    expect(describeGate(report)).toEqual([]);
  });

  describe("렌더", () => {
    it("🔴 없는 명령 — 해설의 `\\pmi`(관문이 처음 찾은 것 그대로)", () => {
      const rules = rulesOf(
        pair({
          solution:
            String.raw`즉 $x^{2}=16$ 또는 $x^{2}=-1$이므로 $x=\pm 4$ 또는 $x=\pmi$` +
            "\n따라서 $A+B$는 $7x-9$이다.",
        }),
      );
      expect(rules).toEqual(["렌더/KaTeX", "렌더/KaTeX"]);
    });

    it("제대로 쓴 `\\pm i` 는 안 걸린다 — 음성", () => {
      expect(
        renderFaults(String.raw`$x=\pm i$ 또는 $x=1\pm \sqrt{2}i$`),
      ).toEqual([]);
      expect(renderFaults(String.raw`$x=\pmi$`)).toHaveLength(1);
    });

    it("`$` 의 짝 · 빈 수식 · 깨진 중괄호를 잡고, 글만 있는 줄은 안 건드린다", () => {
      expect(renderFaults("값은 $3이다.")).toEqual(["`$` 의 짝이 안 맞는다"]);
      expect(renderFaults("값은 $$이다.")).toEqual(["빈 수식 `$$`"]);
      expect(renderFaults(String.raw`$\dfrac{1}{2$`)).toHaveLength(1);
      expect(renderFaults("수식이 없는 문장이다.")).toEqual([]);
      // 글꼴 치수를 모르는 글자는 경고일 뿐 실패가 아니다
      expect(renderFaults(String.raw`$\text{㈎}=3$`)).toEqual([]);
    });

    it("🔴 죽은 역슬래시 — KaTeX 는 `angle` 을 글자로 성공시킨다. 그래서 축이 따로다", () => {
      const rules = rulesOf(
        pair({ stem: "$angle C=90^circ$인 삼각형에서 $A+B$를 구하시오." }),
      );
      expect(rules).toContain("렌더/죽은 역슬래시");
      expect(rules).not.toContain("렌더/KaTeX");
    });
  });

  describe("보기", () => {
    it("🔴 값이 같은 보기 — 인수의 차례만 다른 같은 식(관문이 처음 찾은 것 그대로)", () => {
      const rows = pair({
        stem: "다항식 $x^{2}-y^{2}+x+5y-6$을 인수분해하시오.",
        answer: "$(x-y+3)(x+y-2)$",
        solution: "$=(x-y+3)(x+y-2)$\n따라서 $(x-y+3)(x+y-2)$이다.",
        choices: [
          "$(x-y-3)(x+y+2)$",
          "$(x-y+3)(x+y-2)$",
          "$(x-y-2)(x+y+3)$",
          "$(x+y-3)(x-y+2)$",
          "$(x+y+3)(x-y-2)$",
        ],
      });
      const hits = highLoadGate(rows).hits;
      expect(hits.map((h) => `${h.axis}/${h.rule}`)).toEqual([
        "보기/값이 같은 보기",
      ]);
      expect(hits[0]!.detail).toContain("③");
      expect(hits[0]!.detail).toContain("⑤");
    });

    it("🔴 정답과 같은 값의 오답 — 약분 전 분수 · 뒤집은 부등식", () => {
      expect(
        rulesOf(
          pair({
            answer: String.raw`$\dfrac{1}{2}$`,
            solution: String.raw`따라서 $\dfrac{1}{2}$이다.` + "\n끝.",
            choices: [
              String.raw`$\dfrac{2}{4}$`,
              String.raw`$\dfrac{1}{2}$`,
              "$2$",
              String.raw`$-\dfrac{1}{2}$`,
              String.raw`$\dfrac{3}{2}$`,
            ],
          }),
        ),
      ).toEqual(["보기/값이 같은 보기"]);
      expect(
        rulesOf(
          pair({
            answer: "$x<3$",
            solution: "따라서 $x<3$이다.\n끝.",
            choices: [
              "$3>x$",
              "$x<3$",
              String.raw`$x\le 3$`,
              "$x>3$",
              "$x<-3$",
            ],
          }),
        ),
      ).toEqual(["보기/값이 같은 보기"]);
    });

    it("값이 다른 보기 다섯은 안 걸린다 — 등호 포함 여부 · 부호 · 계수가 다르면 다른 보기다", () => {
      expect(
        rulesOf(
          pair({
            answer: String.raw`$-2\le x<3$`,
            solution: String.raw`따라서 $-2\le x<3$이다.` + "\n끝.",
            choices: [
              String.raw`$-2<x<3$`,
              String.raw`$-2\le x<3$`,
              String.raw`$-2\le x\le 3$`,
              String.raw`$-2<x\le 3$`,
              String.raw`$-3\le x<2$`,
            ],
          }),
        ),
      ).toEqual([]);
    });

    it("보기가 다섯이 아니면 · 정답이 번호 하나가 아니면 · 번호가 단답 정답을 안 가리키면 막는다", () => {
      expect(
        rulesOf(pair({ choices: ["$7x+15$", "$7x-9$", "$-3x-9$", "$7x+9$"] })),
      ).toEqual(["보기/보기가 다섯이 아니다"]);
      expect(rulesOf(pair({ mark: "②, ③" }))).toEqual([
        "보기/정답이 보기 번호 하나가 아니다",
      ]);
      // ③ 은 $-3x-9$ 다 — 단답 정답 $7x-9$ 를 안 가리킨다(보기 순열과 정답 번호가 어긋난 판)
      expect(rulesOf(pair({ mark: "③" }))).toEqual([
        "보기/정답 번호가 단답 정답을 안 가리킨다",
      ]);
    });

    it("값으로 못 읽는 보기는 막지 않고 «못 읽음»으로 센다 — 0 이 깨끗인지 못 셈인지 갈리게", () => {
      const report = highLoadGate(
        pair({
          choices: [
            "$7x+15$",
            "$7x-9$",
            "서로 다른 두 실근",
            "$7x+9$",
            "$17x-9$",
          ],
        }),
      );
      expect(report.hits).toEqual([]);
      expect(report.unread).toHaveLength(1);
      expect(report.unread[0]!.choice).toBe("서로 다른 두 실근");
      // 읽은 넷끼리는 견줬다(여섯 쌍)
      expect(report.comparedPairs).toBe(6);
    });

    it("못 읽는 보기라도 글자가 같으면 같은 보기다", () => {
      expect(
        rulesOf(
          pair({
            choices: [
              "서로 다른 두 실근",
              "$7x-9$",
              "서로 다른 두 실근",
              "$7x+9$",
              "$17x-9$",
            ],
          }),
        ),
      ).toEqual(["보기/값이 같은 보기"]);
    });
  });

  describe("답이 발문에", () => {
    it("🔴 식으로 된 답이 발문에 그대로 — 주어진 나머지가 곧 답(관문이 처음 찾은 것 그대로)", () => {
      const rows = pair({
        stem: "다항식 $f(x)$를 $x^{2}-3x+2$로 나누었을 때의 나머지는 $-3x+5$이고, $x^{2}+5x+6$으로 나누었을 때의 나머지는 $x-3$이다. 이때 $f(x)$를 $x^{2}-4$로 나누었을 때의 나머지를 구하시오.",
        answer: "$x-3$",
        solution: "따라서 구하는 나머지는 $x-3$이다.\n끝.",
        choices: ["$x+3$", "$x-3$", "$-3x+1$", "$x-4$", "$-3$"],
      });
      const hits = highLoadGate(rows).hits;
      // 단답형 행에서 한 번만 센다 — 객관식은 같은 발문에 보기가 붙은 것이다
      expect(hits.map((h) => `${h.axis}/${h.rule}`)).toEqual([
        "답이 발문에/식",
      ]);
      expect(hits[0]!.externalId.endsWith("단답형")).toBe(true);
    });

    it("등식의 한 변이 답과 같아도 잡고, 답이 관계식이면 통째로 같을 때만 본다", () => {
      expect(
        shownExpression("$A+B=7x-9$일 때 $A+B$를 구하시오.", "$7x-9$"),
      ).toBe("$A+B=7x-9$");
      expect(shownExpression("$x<3$일 때 해를 구하시오.", "$x<3$")).toBe(
        "$x<3$",
      );
      // 답 `x=3` 의 한 토막 `3` 이 발문에 있는 것은 답을 말한 것이 아니다
      expect(
        shownExpression("$f(3)=0$일 때 해를 구하시오.", "$x=3$"),
      ).toBeNull();
    });

    it("맨 수 · 한두 글자 답 · 발문에 없는 식은 안 걸린다 — 음성", () => {
      expect(
        shownExpression("$f(2)=-1$일 때 $R(2)$의 값을 구하시오.", "$-1$"),
      ).toBeNull();
      expect(shownExpression("$n$개에서 $r$개를 택한다.", "$r$")).toBeNull();
      expect(shownExpression("$A=2x+3$, $B=5x-12$", "$7x-9$")).toBeNull();
      expect(rulesOf(pair({}))).toEqual([]);
    });

    it("🔴 단위 붙은 수량 — 중등 자(`census-middle-degenerate`)를 그대로 부른다", () => {
      const rules = rulesOf(
        pair({
          stem: "A가 $80$바퀴 도는 동안 B가 도는 횟수를 구하시오.",
          answer: "$80$바퀴",
          solution: "따라서 $80$바퀴이다.\n끝.",
          choices: [
            "$40$바퀴",
            "$80$바퀴",
            "$120$바퀴",
            "$160$바퀴",
            "$20$바퀴",
          ],
        }),
      );
      expect(rules).toContain("답이 발문에/단위 붙은 수량");
    });

    it("맨 수 답이 발문에 수식 한 덩어리로 있으면 막지 않고 유형마다 센다", () => {
      const report = highLoadGate([
        ...pair({
          stem: "$f(x)$를 $x-2$로 나누었을 때의 나머지가 $-1$일 때, $R(2)$의 값을 구하시오.",
          answer: "$-1$",
          solution: "따라서 $R(2)=-1$\n답은 $-1$이다.",
          choices: ["$1$", "$-1$", "$2$", "$-2$", "$0$"],
        }),
        // 같은 유형의 다른 변형 — 답이 발문에 없다
        ...pair({
          stem: "$f(x)$를 $x-2$로 나누었을 때의 나머지가 $-1$일 때, $R(5)$의 값을 구하시오.",
          answer: "$8$",
          solution: "따라서 $R(5)=8$\n답은 $8$이다.",
          choices: ["$1$", "$8$", "$2$", "$-2$", "$0$"],
          mark: "②",
        }).map((r) => ({
          ...r,
          externalId: r.externalId.replace("|v0|", "|v1|"),
          variantKey: r.variantKey.replace("|v0", "|v1"),
        })),
      ]);
      expect(report.hits).toEqual([]);
      expect(report.bareAnswer).toEqual([
        { familyKey: "high:공통수학1|가짜 중단원|03", variants: 2, shown: 1 },
      ]);
    });
  });

  describe("차시 대응 · 난이도", () => {
    it("🔴 단원 시드에 글자 그대로 없는 차시 — 띄어쓰기 하나도 다른 이름이다", () => {
      const rules = rulesOf(pair({ section: "다항식의 덧셈과뺄셈" }));
      // 문항류마다 한 번 — 행마다 세면 같은 결함이 행 수만큼 부푼다
      expect(rules).toEqual(["차시 대응/단원 시드에 없는 차시"]);
      expect(rulesOf(pair({ grade: "공통수학9" }))).toEqual([
        "차시 대응/단원 시드에 없는 차시",
      ]);
    });

    it("🔴 차시 이름이 단원 둘에 걸리면 막는다 — 적재기의 표가 뒤엣것으로 덮인다", () => {
      const units = [
        { grade: "공통수학1", section: SECTION },
        { grade: "공통수학1", section: SECTION },
      ];
      expect(highLoadGate(pair({}), { units }).hits.map((h) => h.rule)).toEqual(
        ["차시 이름이 단원 둘 이상에 걸린다"],
      );
      expect(highLoadGate(pair({}), { units: units.slice(0, 1) }).hits).toEqual(
        [],
      );
    });

    it("🔴 여섯 칸 밖의 난이도는 막고, 분포는 행 수로 센다", () => {
      const report = highLoadGate([
        ...pair({ difficulty: "심화하" }),
        ...pair({ key: "공통수학1|가짜 중단원|04", difficulty: "최상" }),
      ]);
      expect(report.hits.map((h) => `${h.axis}/${h.rule}`)).toEqual([
        "난이도/모르는 칸",
        "난이도/모르는 칸",
      ]);
      expect(report.difficulty).toEqual({ 심화하: 2, 최상: 2 });
    });
  });
});

describe("㉡ 값 읽개 — 보기 둘이 같은 값인가", () => {
  const SAME: [string, string][] = [
    [String.raw`$\dfrac{2}{4}$`, String.raw`$\dfrac{1}{2}$`],
    ["$(x+1)(x-2)$", "$(x-2)(x+1)$"],
    ["$(x+1)(x-2)$", "$x^{2}-x-2$"],
    ["$-(a-b)$", "$b-a$"],
    [String.raw`$2\sqrt{3}$`, String.raw`$\sqrt{12}$`],
    [String.raw`$\dfrac{1}{\sqrt{2}}$`, String.raw`$\dfrac{\sqrt{2}}{2}$`],
    ["$3+2i$", "$2i+3$"],
    [String.raw`$1\pm\sqrt{2}i$`, String.raw`$1\mp\sqrt{2}i$`],
    ["$x<3$", "$3>x$"],
    ["$2x<6$", "$x<3$"],
    ["$2x-6=0$", "$x=3$"],
    [String.raw`$-2\le x<3$`, String.raw`$3>x\ge -2$`],
    [
      String.raw`$\begin{pmatrix}1&2\\3&4\end{pmatrix}$`,
      String.raw`$\begin{pmatrix}1&\dfrac{4}{2}\\3&4\end{pmatrix}$`,
    ],
    ["$(n-r)!$", "$(n-r)(n-r-1)!$"],
    ["$|x-1|$", "$|1-x|$"],
  ];
  const DIFFERENT: [string, string][] = [
    ["$7x-9$", "$7x+9$"],
    ["$7x-9$", "$-7x-9$"],
    ["$x^{2}-x-2$", "$x^{2}+x-2$"],
    ["$(x+1)(x-2)$", "$(x-1)(x+2)$"],
    ["$3+2i$", "$3-2i$"],
    [String.raw`$1\pm\sqrt{2}i$`, String.raw`$1\pm\sqrt{2}$`],
    [String.raw`$1\pm\sqrt{2}$`, String.raw`$1+\sqrt{2}$`],
    ["$x<3$", String.raw`$x\le 3$`],
    ["$x<3$", "$x>3$"],
    ["$x<3$", "$x<5$"],
    ["$x=3$", "$x=5$"],
    ["$x=3$", "$x<3$"],
    [String.raw`$-2\le x<3$`, String.raw`$-2<x\le 3$`],
    [
      String.raw`$\begin{pmatrix}1&2\\3&4\end{pmatrix}$`,
      String.raw`$\begin{pmatrix}1&3\\2&4\end{pmatrix}$`,
    ],
    [
      String.raw`$\begin{pmatrix}1\\2\end{pmatrix}$`,
      String.raw`$\begin{pmatrix}1&2\end{pmatrix}$`,
    ],
    // 열 수는 같고 행 수만 다른 행렬 — 앞의 칸이 같아도 다른 행렬이다. 칸 수가 같은 위의 쌍은 열 수만 봐도
    // 갈려서, 행 수 대조를 빼는 변이가 «산출물이 그대로»로 판정 거부였다(2026-10-08 변이 [33]).
    [
      String.raw`$\begin{pmatrix}1&2\end{pmatrix}$`,
      String.raw`$\begin{pmatrix}1&2\\3&4\end{pmatrix}$`,
    ],
    ["$n!$", "$(n-1)!$"],
    ["$Q(x)$", "$2Q(x)$"],
    // 식과 조건은 다른 갈래다
    ["$x-3$", "$x=3$"],
  ];

  it.each(SAME)("같다: %s · %s", (a, b) => {
    expect(sameChoice(a, b)).toBe(true);
    expect(sameChoice(b, a)).toBe(true);
  });

  it.each(DIFFERENT)("다르다: %s · %s", (a, b) => {
    expect(sameChoice(a, b)).toBe(false);
    expect(sameChoice(b, a)).toBe(false);
  });

  it("못 읽는 것은 null — 글이 섞인 보기 · 모르는 명령 · 덜 닫힌 괄호", () => {
    expect(sameChoice("서로 다른 두 실근", "$3$")).toBeNull();
    expect(sameChoice("$x=1$ 또는 $x=2$", "$x=1$")).toBeNull();
    expect(sameChoice(String.raw`$\sin x$`, "$x$")).toBeNull();
    expect(sameChoice("$(x+1$", "$x+1$")).toBeNull();
    expect(() => readChoiceValue(String.raw`\alpha+1`)).toThrow(/못 읽는다/);
    expect(() => readChoiceValue("1/0+x~")).toThrow(/못 읽는다/);
  });

  it("허수 단위 `i` 는 문자가 아니라 수다 — `i^{2}` 는 `-1` 이다", () => {
    expect(sameChoice("$i^{2}$", "$-1$")).toBe(true);
    expect(sameChoice("$(1+i)(1-i)$", "$2$")).toBe(true);
    expect(sameChoice("$x^{2}$", "$-1$")).toBe(false);
  });
});

describe("적재기 연결 — 고등 행이 있으면 관문을 돌리고, 걸리면 막는다", () => {
  /** 관문의 행 → 적재기의 행(관문이 안 보는 칸은 채워만 둔다). */
  const asLoaderRows = (rows: GateRow[]) =>
    rows.map((r) => ({
      ...r,
      unitKey: `${r.grade} / ${r.section}`,
      difficulty: r.difficulty as never,
      problemType: "계산",
      figureSpec: null,
      origin: "시험",
    }));

  it("고등 행이 없으면 관문을 안 돈다 — 초등 · 중등 · 판정형 계획의 출력은 그대로다", () => {
    expect(highPreloadVerdict([])).toBeNull();
    expect(
      highPreloadVerdict(
        asLoaderRows(pair({})).map((r) => ({
          ...r,
          externalId: r.externalId.replace("engine-high:", "engine-mid:"),
        })),
      ),
    ).toBeNull();
  });

  it("멀쩡한 고등 행은 안 막고 요약(행 · 문항류 · 견준 쌍 · 난이도)을 찍는다", () => {
    const verdict = highPreloadVerdict(asLoaderRows(pair({})))!;
    expect(verdict.blocked).toBe(false);
    expect(verdict.lines[0]).toContain("행 2 · 문항류 1 · 견준 보기 쌍 10");
    expect(verdict.lines[0]).toContain("막힌 것 0");
    expect(verdict.lines[1]).toContain("기본 2");
  });

  it("🔴 걸린 행이 하나라도 있으면 막고, 무엇이 왜 걸렸는지 찍는다", () => {
    const verdict = highPreloadVerdict(
      asLoaderRows([
        ...pair({}),
        ...pair({
          key: "공통수학1|가짜 중단원|04",
          solution: String.raw`$x=\pmi$` + "\n따라서 $A+B$는 $7x-9$이다.",
        }),
      ]),
    )!;
    expect(verdict.blocked).toBe(true);
    const text = verdict.lines.join("\n");
    expect(text).toContain("막힌 것 2");
    expect(text).toContain("렌더 — KaTeX");
    expect(text).toContain("공통수학1|가짜 중단원|04");
  });

  it("못 읽은 보기 · 맨 수 겹침은 막지 않되 줄로 찍는다 — 조용히 넘기지 않는다", () => {
    const verdict = highPreloadVerdict(
      asLoaderRows([
        ...pair({
          choices: ["$7x+15$", "$7x-9$", "두 실근", "$7x+9$", "$17x-9$"],
        }),
        ...pair({
          key: "공통수학1|가짜 중단원|04",
          stem: "$f(x)$를 $x-2$로 나누었을 때의 나머지가 $-1$일 때, $R(2)$의 값을 구하시오.",
          answer: "$-1$",
          solution: "따라서 $R(2)=-1$\n답은 $-1$이다.",
          choices: ["$1$", "$-1$", "$2$", "$-2$", "$0$"],
        }),
      ]),
    )!;
    expect(verdict.blocked).toBe(false);
    const text = verdict.lines.join("\n");
    expect(text).toContain("값으로 못 읽은 보기 1행");
    expect(text).toContain("두 실근");
    expect(text).toContain("공통수학1|가짜 중단원|04 1/1");
  });
});

describe("탐침 표 — `probe-high-gate.ts` 가 찍는 줄", () => {
  it("요약 · 막힌 것 · 차시별 난이도를 내고, 합 줄이 행 수와 같다", () => {
    const report = highLoadGate([
      ...pair({}),
      ...pair({
        key: "공통수학1|가짜 중단원|04",
        difficulty: "응용",
        solution: String.raw`$x=\pmi$` + "\n따라서 $A+B$는 $7x-9$이다.",
      }),
    ]);
    const text = gateTable(report, "시험").join("\n");
    expect(text).toContain(
      "시험 — 행 4 · 문항류 2 · 견준 보기 쌍 20 · 못 읽은 보기 0행 · 막힌 것 2",
    );
    expect(text).toContain("렌더 — KaTeX");
    expect(text).toMatch(
      new RegExp(`4 \\|\\s+2\\s+2 \\| 공통수학1 / ${SECTION}`),
    );
    expect(text).toMatch(/4 \|\s+2\s+2 \| 합/);
  });
});

describe("㉢ 관문 — 살아 있는 고등 등록부", () => {
  const PLAN = "scripts/import/plans/2026-10-08-공통수학1-전량.json";

  it("적재 계획 그대로의 행 — 막힌 것 0 · 못 읽은 보기 0 · 보기 쌍을 전부 견줬다", () => {
    // 행은 탐침(`probe-high-gate.ts`)과 같은 함수로 만든다 — 시험과 탐침이 다른 행을 보면 한쪽만 초록이 된다.
    const rows = planRows(PLAN);
    const report = highLoadGate(rows);
    expect(describeGate(report), "적재 전 관문에 걸린 것이 있다").toEqual([]);
    expect(report.hits).toEqual([]);
    expect(report.unread).toEqual([]);
    expect(report.families).toBe(168);
    const mcq = rows.filter((r) => r.questionType === "객관식").length;
    expect(mcq).toBe(rows.length / 2);
    // 객관식마다 보기 다섯 = 열 쌍 — 한 쌍이라도 덜 견줬으면 «0»을 못 믿는다
    expect(report.comparedPairs).toBe(mcq * 10);
    // 난이도 — 여섯 칸 가운데 쓰는 칸이 셋 이상이고(한쪽으로 쏠리지 않았다), 차시마다 «기본 이하» 칸이 있다
    expect(
      Object.keys(report.difficulty).length,
      JSON.stringify(report.difficulty),
    ).toBeGreaterThanOrEqual(3);
    const noBase = Object.entries(report.bySection)
      .filter(([, d]) => (d["연산"] ?? 0) + (d["기본"] ?? 0) === 0)
      .map(([s]) => s);
    expect(noBase, "하위 칸(연산 · 기본)이 한 행도 없는 차시").toEqual([]);
  }, 180_000);

  it("씨앗 셋 더 — 다른 씨앗으로 다시 실어도 막힌 것 0 · 맨 수 답이 발문에 그대로인 비율이 유형마다 20% 아래", () => {
    const bare = new Map<string, { variants: number; shown: number }>();
    const lowered = new Set<string>();
    for (const seed of [1, 7, 7777]) {
      const got = registryRowsAt(seed);
      for (const l of got.lowered) lowered.add(l.split(":")[0]!);
      const report = highLoadGate(got.rows);
      expect(
        describeGate(report),
        `씨앗 ${seed}: 적재 전 관문에 걸린 것이 있다`,
      ).toEqual([]);
      expect(report.unread, `씨앗 ${seed}`).toEqual([]);
      for (const b of report.bareAnswer) {
        const cur = bare.get(b.familyKey) ?? { variants: 0, shown: 0 };
        cur.variants += b.variants;
        cur.shown += b.shown;
        bare.set(b.familyKey, cur);
      }
    }
    // 변형 공간이 좁아 12벌을 못 채우는 유형 — 계획이 9벌로 낮춘 그 하나뿐이다(늘면 계획을 다시 본다)
    expect([...lowered]).toEqual(["공통수학1|조합|02"]);
    // 분모부터 — 맨 수 답을 내는 유형이 거의 전부다(이 수가 줄면 아래 비율이 «못 셈»이 된다)
    expect(bare.size).toBeGreaterThanOrEqual(150);
    // 🔴 맨 수 답이 발문에 그대로인 비율 — 우연히 겹치는 것은 흔하지만(한 자리 수 답 · 계수) 유형의 꼴이
    //    그런 것은 비율로 드러난다. 수리 전 `항등식과 나머지정리|07` 이 그랬다(나누는 일차식의 근에서의 값을
    //    물어 답이 주어진 나머지 그대로 — 씨앗 여덟에서 24%). 지금 가장 높은 것은 `조합|05` 14% 로, 읽어 보면
    //    카드 수 · 사람 수와 답이 우연히 겹친 판이다. 넘는 유형이 생기면 그 변형을 읽고 생성기를 고친다.
    const over = [...bare.entries()]
      .filter(([, v]) => v.variants >= 12 && v.shown / v.variants >= 0.2)
      .map(([familyKey, v]) => `${familyKey} ${v.shown}/${v.variants}`);
    expect(over, "맨 수 답이 발문에 그대로인 변형이 20% 이상인 유형").toEqual(
      [],
    );
  }, 300_000);
});
