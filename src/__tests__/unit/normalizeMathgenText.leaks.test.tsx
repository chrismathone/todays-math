/**
 * 입구 후보정(`normalizeMathgenText`)이 **지면에 날 글자를 남기지 않는다** — 2026-09-26
 * 후보정 감사(원장님 신고: 작업실 해설에 `\displaystyle $$이동 거리= …` 가 날 글자로 샘).
 *
 * 감사 부류표의 행을 그대로 옮겼다(ocr-audit/report-code.md §5 · report-paths.md E·K).
 * 값(문자열)만 보면 «KaTeX 가 초록이라고 지면이 멀쩡한 게 아니다»(교훈 2026-08-16)에
 * 또 빠진다 — 그래서 네 출구의 **실제 렌더**에서 보이는 글자를 센다.
 *
 *   ③ ProblemContent(작업실 해설 읽기) ④ renderMathHtml ⑤ MathText(정답지 인쇄)
 *   ⑥ SourceEditorDisplay(편집기 렌더러 — 입구 뒤 값)
 *
 * 판정: `.katex` 를 걷은 보이는 글자에 `\명령`·`\(` `\[`·외톨이 `\`·`$` 가 없다,
 *       붉은 KaTeX·math-raw 폴백이 없다, 원문의 한글이 지면에서 줄지 않았다.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MathText } from "@/components/math/MathText";
import { ProblemContent } from "@/components/math/ProblemContent";
import { SourceEditorDisplay } from "@/components/math/editor/SourceEditorDisplay";
import { KATEX_COMMAND_NAMES } from "@/lib/math/katexCommands.generated";
import { normalizeMathgenText } from "@/lib/math/normalizeMathgenText";
import { renderMathHtml } from "@/lib/math/renderMathHtml";
import { tokenizeMath } from "@/lib/math/segments";

const R = String.raw;
const HANGUL = /[가-힣]/g;
const LEAK = /\\[A-Za-z]+|\\[()[\]{}]|\\(?![A-Za-z()[\]{}])|\$+/g;

type Exit = "③" | "④" | "⑤" | "⑥";
const EXITS: Record<Exit, (text: string) => string> = {
  "③": (text) => renderToStaticMarkup(<ProblemContent content={text} />),
  "④": (text) => renderMathHtml(text),
  "⑤": (text) => renderToStaticMarkup(<MathText as="div" text={text} />),
  "⑥": (text) => renderToStaticMarkup(<SourceEditorDisplay value={text} />),
};

function inspect(html: string, raw: string) {
  const root = document.createElement("div");
  root.innerHTML = html;
  root.querySelectorAll(".katex-mathml").forEach((node) => node.remove());
  const red = root.querySelectorAll(
    '.katex-error, [style*="#cc0000"], [style*="rgb(204, 0, 0)"]',
  ).length;
  const mathRaw = root.querySelectorAll(".math-raw").length;
  const shownHangul = (root.textContent ?? "").match(HANGUL)?.length ?? 0;
  root.querySelectorAll(".katex, .math-raw").forEach((node) => node.remove());
  return {
    leaks: (root.textContent ?? "").match(LEAK) ?? [],
    red,
    mathRaw,
    lostHangul: (raw.match(HANGUL)?.length ?? 0) - shownHangul,
  };
}

function expectCleanOnPaper(raw: string, exits: Exit[]) {
  const intake = normalizeMathgenText(raw);
  for (const exit of exits) {
    const seen = inspect(EXITS[exit](intake), raw);
    expect({ exit, ...seen }).toEqual({
      exit,
      leaks: [],
      red: 0,
      mathRaw: 0,
      lostHangul: expect.any(Number),
    });
    expect(seen.lostHangul, `${exit} 한글이 사라졌다`).toBeLessThanOrEqual(0);
  }
}

const ALL: Exit[] = ["③", "④", "⑤", "⑥"];

/** [원문, 입구 뒤 값, 깨끗해야 할 출구] */
type Row = [string, string, Exit[]];

describe("캡처형 — 산문 앞에 붙은 가짜 바깥 디스플레이(같은 줄·번호 뒤·인용)", () => {
  it.each<Row>([
    [
      R`구간 $[a,b]$에서 속도가 0 이상이므로, \displaystyle $$이동 거리= $x(b)-x(a) = -4-(-12) = 8.$`,
      R`구간 $[a,b]$에서 속도가 0 이상이므로, 이동 거리= $x(b)-x(a) = -4-(-12) = 8.$`,
      ALL,
    ],
    [
      R`1. \displaystyle $$이동 거리= $x(b)-x(a) = 8.$`,
      R`1. 이동 거리= $x(b)-x(a) = 8.$`,
      ALL,
    ],
    [
      R`> \displaystyle $$이동 거리= $x(b)-x(a) = 8.$`,
      R`> 이동 거리= $x(b)-x(a) = 8.$`,
      ALL,
    ],
    [
      R`따라서 \displaystyle $$이동 거리= $x(b)-x(a) = 8.$$$`,
      R`따라서 이동 거리= $x(b)-x(a) = 8.$`,
      ALL,
    ],
    [
      R`따라서 \[이동 거리는 $x(b)-x(a)$ 이므로 8이다.\] 끝.`,
      R`따라서 이동 거리는 $x(b)-x(a)$ 이므로 8이다. 끝.`,
      ALL,
    ],
    // 홑 수식이 없어도 한 줄을 통째로 감싼 `\[…\]` 는 괄호 표기가 아니라 가짜 디스플레이다.
    [
      R`\[이동 거리는 x(b)-x(a) 이므로 8이다.\]`,
      R`이동 거리는 x(b)-x(a) 이므로 8이다.`,
      ALL,
    ],
    [R`\displaystyle 3. \[이동 거리는 8이다.\]`, R`3. 이동 거리는 8이다.`, ALL],
  ])("%s", (raw, intake, exits) => {
    expect(normalizeMathgenText(raw)).toBe(intake);
    expect(normalizeMathgenText(intake)).toBe(intake);
    expectCleanOnPaper(raw, exits);
  });

  it("앞 줄 디스플레이의 닫는 $$ 는 가짜 여는 것으로 읽지 않는다", () => {
    const input = "$$\nx = 1\n" + R`$$이동 거리는 $x$ 이다.`;
    expect(normalizeMathgenText(input)).toBe(input);
  });
});

describe("닫히지 않은 $$ · 떠돌이 $ — 뒤가 수식이면 닫고, 아니면 구분자를 지운다", () => {
  it.each<Row>([
    [
      "구간에서 속도가 양수이므로,\n" + R`$$이동 거리 = x(b)-x(a) = 8.`,
      "구간에서 속도가 양수이므로,\n" + R`이동 거리 = x(b)-x(a) = 8.`,
      ALL,
    ],
    [
      "속도가 양수이므로,\n" + R`\displaystyle $$이동 거리= x(b)-x(a) = 8.`,
      "속도가 양수이므로,\n" + R`이동 거리= x(b)-x(a) = 8.`,
      ALL,
    ],
    [
      "따라서\n" + R`$$\int_0^2 v(t)\,dt = 8`,
      "따라서\n" + R`$$\int_0^2 v(t)\,dt = 8$$`,
      ALL,
    ],
    [
      R`따라서 $$\int_0^2 v(t)\,dt = 8 이다.`,
      R`따라서 $$\int_0^2 v(t)\,dt = 8$$ 이다.`,
      ALL,
    ],
    [R`따라서 $x=2$ 이다.$$`, R`따라서 $x=2$ 이다.`, ALL],
    [R`따라서 $$x=2$ 이다.`, R`따라서 $x=2$ 이다.`, ALL],
    [R`따라서 $x=2$$ 이다.`, R`따라서 $x=2$ 이다.`, ALL],
    [R`따라서 $$$x=2$$$ 이다.`, R`따라서 $$x=2$$ 이다.`, ALL],
    [
      R`속도가 $v(t)=3t^2 이므로 거리는 12이다.`,
      R`속도가 $v(t)=3t^2$ 이므로 거리는 12이다.`,
      ALL,
    ],
    [
      R`속도가 v(t)=3t^2$ 이므로 거리는 12이다.`,
      R`속도가 v(t)=3t^2 이므로 거리는 12이다.`,
      ALL,
    ],
    [
      "따라서\n$$\n" + R`x(b)-x(a) = 8` + "\n이다.",
      "따라서\n$$\n" + R`x(b)-x(a) = 8` + "\n$$\n이다.",
      ALL,
    ],
    ["따라서\n$$\n이다.", "따라서\n이다.", ALL],
    [R`값은 $$ $$ 이고 $ $ 이다.`, R`값은  이고  이다.`, ALL],
    [R`값은 $$\angle CAM=15° 이다.`, R`값은 $$\angle CAM=15°$$ 이다.`, ALL],
    // JSON 제어문자 손상(탭+heta, 폼피드+rac)이 닫히지 않은 식 안에 끼어도 식 끝을 안 놓친다.
    [
      "따라서 $$\theta + \frac{1}{2} = 1",
      R`따라서 $$\theta + \frac{1}{2} = 1$$`,
      ALL,
    ],
  ])("%s", (raw, intake, exits) => {
    expect(normalizeMathgenText(raw)).toBe(intake);
    expect(normalizeMathgenText(intake)).toBe(intake);
    expectCleanOnPaper(raw, exits);
  });
});

describe("후보정이 스스로 만들던 결함", () => {
  it.each<Row>([
    [
      R`적분은 \int_0^2 v(t)\,dt = 8 이다.`,
      R`적분은 $\int_0^2 v(t)\,dt = 8$ 이다.`,
      ALL,
    ],
    [
      R`따라서 \int_0^2 |v(t)|\,dt이다.`,
      R`따라서 $\int_0^2 |v(t)|\,dt$이다.`,
      ALL,
    ],
    [R`\\displaystyle 이동 거리는 8이다.`, R`이동 거리는 8이다.`, ALL],
    [R`값은 8\,\mathrm{m} 이다.`, R`값은 $8\,\mathrm{m}$ 이다.`, ALL],
    // 한글을 감싼 크기 괄호를 반쪽씩 수식으로 갈라 `$\left($넓이$\right)$` 를 만들었다.
    [R`값은 \left(넓이\right) 이다.`, R`값은 (넓이) 이다.`, ALL],
    [R`값은 \left[넓이\right] 이다.`, R`값은 [넓이] 이다.`, ALL],
  ])("%s", (raw, intake, exits) => {
    expect(normalizeMathgenText(raw)).toBe(intake);
    expect(normalizeMathgenText(intake)).toBe(intake);
    expectCleanOnPaper(raw, exits);
  });

  it("`\\,` 의 쉼표를 끝 구두점으로 깎아 `\\$` 를 만들지 않는다", () => {
    for (const raw of [
      R`넓이는 \int_0^1 x\, 이다.`,
      R`값은 \sqrt{2}\, 이다.`,
      R`값은 \frac{1}{2}\; 이다.`,
    ]) {
      const out = normalizeMathgenText(raw);
      expect(out).not.toContain(R`\$`);
      expect(normalizeMathgenText(out)).toBe(out);
    }
  });
});

describe("구분자 밖 명령 — 손 목록이 아니라 KaTeX 가 아는 명령 집합으로", () => {
  it.each<Row>([
    [R`둘레는 2\pi r 이다.`, R`둘레는 2$\pi r$ 이다.`, ALL],
    [
      R`따라서 0 \le t \le 2 이고 a \ne 0 이다.`,
      R`따라서 $0 \le t \le 2$ 이고 $a \ne 0$ 이다.`,
      ALL,
    ],
    [R`x=1 \quad y=2 이다.`, R`x=1 $\quad y=2$ 이다.`, ALL],
    [R`값은 \lvert x \rvert 이다.`, R`값은 $\lvert x \rvert$ 이다.`, ALL],
    [
      R`순서쌍 \langle a, b \rangle 이다.`,
      R`순서쌍 $\langle a, b \rangle$ 이다.`,
      ALL,
    ],
    [R`집합은 \emptyset 이다.`, R`집합은 $\emptyset$ 이다.`, ALL],
    [R`따라서 p \implies q 이다.`, R`따라서 $p \implies q$ 이다.`, ALL],
    [R`각은 \varphi 이다.`, R`각은 $\varphi$ 이다.`, ALL],
  ])("%s", (raw, intake, exits) => {
    expect(normalizeMathgenText(raw)).toBe(intake);
    expect(normalizeMathgenText(intake)).toBe(intake);
    expectCleanOnPaper(raw, exits);
  });

  it("KaTeX 가 아는 명령은 전부 구분자 밖에 홀로 와도 산문에 남지 않는다", () => {
    const names = KATEX_COMMAND_NAMES.trim().split(/\s+/);
    expect(names.length).toBeGreaterThan(800);
    const leaked = names.filter((name) => {
      const out = normalizeMathgenText(`값은 x \\${name} y 이다.`);
      return tokenizeMath(out).some(
        (part) =>
          part.type === "text" &&
          new RegExp(R`\\${name}(?![A-Za-z])`).test(part.value),
      );
    });
    expect(leaked).toEqual([]);
  });

  it.each([
    R`파일은 C:\Users\user\Desktop\note.txt 에 있다.`,
    R`이스케이프 \u00e9 와 \x41 은 그대로다.`,
    R`정규식 \d+ 와 \s* 는 그대로다.`,
    R`법령 \S 3 과 \P 2 는 절 표시다.`,
    R`\relax 와 \small 과 \newline 은 조판 명령이다.`,
    R`\hello 세계는 명령이 아니다.`,
    R`값은 $\pi r^2$ 이다.`,
  ])("한글 문장 속 명령 아닌 역슬래시는 그대로 둔다: %s", (raw) => {
    expect(normalizeMathgenText(raw)).toBe(raw);
  });
});

describe("\\( \\[ 짝 없음·섞임과 구간 표기", () => {
  it.each<Row>([
    [R`따라서 \(x=2$ 이다.`, R`따라서 $x=2$ 이다.`, ALL],
    [R`따라서 \[x=2$$ 이다.`, R`따라서 $$x=2$$ 이다.`, ALL],
    [R`따라서 $$x=2\] 이다.`, R`따라서 $$x=2$$ 이다.`, ALL],
    [
      R`속도가 \(v(t)=3t^2 이므로 거리는 12이다.`,
      R`속도가 $v(t)=3t^2$ 이므로 거리는 12이다.`,
      ALL,
    ],
    [
      R`속도가 양수이므로 \[\int_0^2 v(t)\,dt = 8 이다.`,
      R`속도가 양수이므로 $$\int_0^2 v(t)\,dt = 8$$ 이다.`,
      ALL,
    ],
    [
      R`속도가 v(t)=3t^2\) 이므로 12이다.`,
      R`속도가 v(t)=3t^2 이므로 12이다.`,
      ALL,
    ],
    [R`따라서 x=2\] 이다.`, R`따라서 x=2 이다.`, ALL],
    [R`값은 $f\(x\)=1$ 이다.`, R`값은 $f(x)=1$ 이다.`, ALL],
    [
      R`구간 \[a,b\]에서 속도가 0 이상이다.`,
      R`구간 $[a,b]$에서 속도가 0 이상이다.`,
      ALL,
    ],
    [R`구간 \[0, 2\pi\] 에서`, R`구간 $[0, 2\pi]$ 에서`, ALL],
    [R`구간 (0,1\] 에서`, R`구간 $(0,1]$ 에서`, ALL],
    [R`구간 \[-1, 3) 에서`, R`구간 $[-1, 3)$ 에서`, ALL],
  ])("%s", (raw, intake, exits) => {
    expect(normalizeMathgenText(raw)).toBe(intake);
    expect(normalizeMathgenText(intake)).toBe(intake);
    expectCleanOnPaper(raw, exits);
  });

  it("구간 표기의 대괄호가 지면에 남는다", () => {
    for (const exit of ALL) {
      const root = document.createElement("div");
      root.innerHTML = EXITS[exit](
        normalizeMathgenText(R`구간 \[a,b\]에서 속도가 0 이상이다.`),
      );
      root.querySelectorAll(".katex-mathml").forEach((node) => node.remove());
      expect(root.textContent, exit).toMatch(/\[\s*a\s*,\s*b\s*\]/);
    }
  });

  it("식이 둘 든 디스플레이는 구간으로 읽지 않는다", () => {
    expect(normalizeMathgenText(R`\[x=1, y=2\]`)).toBe(R`$$x=1, y=2$$`);
  });

  // 지면 파서(`escapePlainLeaders`)는 줄머리 `1)` 을 목록으로 안 읽히게 `1\)` 로 적고,
  // 그 글이 렌더 때 이 후보정을 한 번 더 지난다. 그 `\)` 는 떠돌이 닫개가 아니다.
  it.each([
    "1\\) 첫째 조건\n2\\) 둘째 조건",
    "> 12\\) 상자 안 항목",
    R`구간 [0, 1\) 에서 증가한다.`,
    R`괄호 (가\) 를 채운다.`,
  ])("글자 괄호의 이스케이프는 떠돌이 닫개가 아니다: %s", (raw) => {
    expect(normalizeMathgenText(raw)).toBe(raw);
  });

  it("파서가 이스케이프한 줄머리 번호 `3)` 이 해설 읽기에서 괄호째 남는다", () => {
    // 보기로 안 읽히는 한 줄 번호 — ProblemContent 가 `3\)` 로 적어 렌더로 넘긴다.
    for (const [raw, shown] of [
      ["조건은 다음과 같다.\n3) 셋째 조건만 있다.", /3\)\s*셋째/],
      ["풀이\n1) 먼저 x를 구한다.\n따라서 끝.", /1\)\s*먼저/],
    ] as const) {
      const root = document.createElement("div");
      root.innerHTML = EXITS["③"](normalizeMathgenText(raw));
      expect(root.textContent).toMatch(shown);
    }
  });
});

describe("\\$ 화폐는 입구에서 망가지지 않는다", () => {
  it.each([
    R`가격은 \$5 이다.`,
    R`가격은 \$5 이고 $x=2$ 이다.`,
    R`$\$5 + \$3 = \$8$`,
    R`$\text{cost \$5}$ 이다.`,
    R`가격은 $5 이다.`,
  ])("%s", (raw) => {
    expect(normalizeMathgenText(raw)).toBe(raw);
  });
});

describe("대조군 — 이미 멀쩡하던 글은 그대로 (report-code.md §5 끝)", () => {
  it.each([
    R`$이동 거리 = 8$`,
    R`$$이동 거리 = x(b)-x(a) = 8$$`,
    R`$$\text{이동 거리} = x(b)-x(a) = 8$$`,
    R`$$\begin{aligned}\text{이동 거리} &= x(b)-x(a) \\ &= -4-(-12) = 8\end{aligned}$$`,
    R`$\displaystyle \text{이동 거리}=8$`,
    R`값은 $a=1$$b=2$ 이다.`,
    R`값은 $$a=1$$$b=2$ 이다.`,
    R`이므로$x=2$이다.`,
    R`이므로$$x=2$$이다.`,
    R`값은 $ x $ 이다.`,
    "따라서\n$$x(b)-x(a)\n\n= 8$$\n이다.",
    "따라서\n\n    $x(b)-x(a) = 8$\n\n이다.",
    "1. $$x=2$$\n2. $$y=3$$",
    "- $x=2$ 이다.\n- $y=3$ 이다.",
    R`값은 $a_1 * b_1 * c$ 이고 $x_2$ 이다.`,
    R`이동 거리는 $8$ 이고 $$s=8$$ 이다.`,
    R`집합 \{1, 2, 3\} 의 원소는 셋이다.`,
    R`확률은 30\% 이다.`,
    R`\[참고\]는 표기이며 \(선택\)도 보존한다.`,
    R`$\left\[\frac{1}{2}\right\]$`,
    R`\[참고\]`,
    "\\[문제 1\\]\n다음을 구하시오.",
  ])("%s", (raw) => {
    expect(normalizeMathgenText(raw)).toBe(raw);
  });

  it.each([
    [R`이므로\(x=2\)이다.`, R`이므로$x=2$이다.`],
    [
      R`\(a=1\) 이고 $b=2$ 이며 \[c=3\] 이고 $$d=4$$ 이다.`,
      R`$a=1$ 이고 $b=2$ 이며 $$c=3$$ 이고 $$d=4$$ 이다.`,
    ],
    [
      "따라서\n" + R`\[` + "\n" + R`x(b)-x(a) = 8` + "\n" + R`\]` + "\n이다.",
      "따라서\n$$\nx(b)-x(a) = 8\n$$\n이다.",
    ],
    ["따라서 \text{이동 거리}=8 이다.", R`따라서 $\text{이동 거리}=8$ 이다.`],
    ["$\frac{1}{2}$", R`$\frac{1}{2}$`],
    [
      R`따라서 $x=2$ 이다.\n다음으로 $y=3$ 이다.`,
      "따라서 $x=2$ 이다.\n다음으로 $y=3$ 이다.",
    ],
    // 크기 괄호 안에 명령이 있으면 수식이다 — 한글 괄호 풀기는 여기 손대지 않는다.
    [
      R`값은 \left(\frac{넓이}{2}\right) 이다.`,
      R`값은 $\left(\frac{넓이}{2}\right)$ 이다.`,
    ],
  ])("짝 맞은 구분자·제어문자 복구는 전과 같다: %s", (raw, intake) => {
    expect(normalizeMathgenText(raw)).toBe(intake);
    expect(normalizeMathgenText(intake)).toBe(intake);
  });
});

describe("🔴 글 모드 묶음 안의 `\(…\)` 는 수식이다 — 괄호로 풀지 않는다 (트랙 합치기 2026-09-26)", () => {
  // 렌더 후보정(T3)은 중첩 `$\text{값이 $x$ 일 때}=3$` 의 속 수식을 `\(x\)` 로 옮긴다(KaTeX 가 글 속 수식으로
  // 그린다). 입구 후보정이 수식 안 `\(` 를 전부 괄호로 풀면 두 번째 회차에 속 수식이 글자 `(x)` 가 된다.
  const R = String.raw;
  it.each([
    R`$\text{값이 \(x\) 일 때}=3$`,
    R`$\mbox{단, \(a \ne 0\)}$`,
    R`$\textrm{넓이 \(S\)}+1$`,
    R`$\text{중괄호 {안} \(y\)}$`,
  ])("%s 그대로 · 멱등", (text) => {
    expect(normalizeMathgenText(text)).toBe(text);
  });
  it("글 모드 묶음 밖의 `\(` 는 전처럼 괄호로 푼다", () => {
    expect(normalizeMathgenText(R`값은 $f\(x\)=1$ 이다.`)).toBe(
      R`값은 $f(x)=1$ 이다.`,
    );
    expect(normalizeMathgenText(R`$\text{값} f\(x\)$`)).toBe(
      R`$\text{값} f(x)$`,
    );
  });
});
