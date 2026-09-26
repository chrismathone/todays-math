/**
 * 수식 구간의 **자리**(`findMathSpans`)와 **맞추기**(`canonicalizeMathSpans`) — `segments.ts`.
 *
 * 렌더 후보정(`preprocessMathText`)과 본문 파서(`parseProblemContent`)가 둘 다 이 함수로 시작한다.
 * 규칙 하나하나가 «안 바꿀 것»을 같이 적는다 — 이미 멀쩡한 글을 건드리면 그게 회귀다.
 */
import { describe, expect, it } from "vitest";

import {
  canonicalizeMathSpans,
  findMathSpans,
  tokenizeMath,
} from "@/lib/math/segments";

const R = String.raw;
const NL = "\n";

describe("findMathSpans — tokenizeMath 와 같은 자리", () => {
  it.each([
    R`이동 거리는 $8$ 이고 $$s=8$$ 이다.`,
    R`값은 $a=1$$b=2$ 이다.`,
    R`값은 $$a=1$$$b=2$ 이다.`,
    R`가격은 \$5 이고 $x=2$ 이다.`,
    R`짝 없는 $x=2 이다.`,
  ])("%s", (text) => {
    const spans = findMathSpans(text);
    const math = tokenizeMath(text).filter((s) => s.type !== "text");
    expect(spans.map((s) => s.value)).toEqual(math.map((s) => s.value));
    for (const s of spans) {
      const fence = s.type === "display" ? "$$" : "$";
      expect(text.slice(s.start, s.end)).toBe(fence + s.value + fence);
    }
  });

  it("🔴 붙은 두 수식의 두 번째는 **닫는 `$` 다음**에서 시작한다(닫는 `$` 부터 짝을 짓지 않는다)", () => {
    const text = R`거리는 $8$$s=8$ 이다.`;
    const [a, b] = findMathSpans(text);
    expect(a!.value).toBe("8");
    expect(b!.value).toBe("s=8");
    expect(b!.start).toBe(a!.end);
  });
});

describe("canonicalizeMathSpans — 붙은 수식", () => {
  it.each([
    [R`값은 $a=1$$b=2$ 이다.`, R`값은 $a=1$ $b=2$ 이다.`],
    [R`값은 $$a=1$$$b=2$ 이다.`, R`값은 $$a=1$$ $b=2$ 이다.`],
    [R`값은 $a$$$b$$ 이다.`, R`값은 $a$ $$b$$ 이다.`],
    // 떨어져 있으면 그대로 — 예전 정규식은 여기서 앞 수식의 닫는 `$` 부터 읽어 망가뜨렸다.
    [
      R`이동 거리는 $8$ 이고 $$s=8$$ 이다.`,
      R`이동 거리는 $8$ 이고 $$s=8$$ 이다.`,
    ],
  ])("%s", (input, expected) => {
    expect(canonicalizeMathSpans(input)).toBe(expected);
  });
});

describe("canonicalizeMathSpans — 수식 안 줄바꿈", () => {
  it("여러 줄 `$$` 는 한 줄로 접는다(TeX 에서 수식 안 줄바꿈은 공백)", () => {
    expect(
      canonicalizeMathSpans(
        "따라서" + NL + "$$x(b)-x(a)" + NL + "= 8$$" + NL + "이다.",
      ),
    ).toBe("따라서" + NL + "$$x(b)-x(a) = 8$$" + NL + "이다.");
  });

  it("인라인 `$…$` 안 줄바꿈도 접는다", () => {
    expect(canonicalizeMathSpans("따라서 $x" + NL + "= 8$ 이다.")).toBe(
      "따라서 $x = 8$ 이다.",
    );
  });

  it("울타리 표시식(여는·닫는 `$$` 가 제 줄에)은 그대로 — 마크다운이 가운데 표시식으로 읽는다", () => {
    const fenced =
      "따라서" + NL + "$$" + NL + "x = 1" + NL + "$$" + NL + "이다.";
    expect(canonicalizeMathSpans(fenced)).toBe(fenced);
    // 전처리가 스스로 넣는 `\displaystyle` 이 여는 줄에 붙어도 울타리다.
    const injected = "$$" + R`\displaystyle ` + NL + "x = 1" + NL + "$$";
    expect(canonicalizeMathSpans(injected)).toBe(injected);
  });

  it("빈 줄을 품은 구간은 그대로 — 짝이 어긋나 문단을 건너 묶였을 수 있다", () => {
    const text = "a $$x" + NL + NL + "y$$ b";
    expect(canonicalizeMathSpans(text)).toBe(text);
  });

  it("인라인인데 중괄호 밖에 한글 — 떠돌이 `$` 가 산문을 묶었을 수 있어 그대로", () => {
    const text = "가격은 5$ 이다." + NL + "다음 $x$";
    expect(canonicalizeMathSpans(text)).toBe(text);
  });

  it("TeX 주석 `%` 가 있으면 그대로 — 접으면 뒷줄까지 주석이 된다", () => {
    const text = "$$x % 설명" + NL + "= 8$$";
    expect(canonicalizeMathSpans(text)).toBe(text);
    // 이스케이프한 `\%` 는 글자다 — 접는다.
    expect(canonicalizeMathSpans("$$30\\%" + NL + "= 0.3$$")).toBe(
      "$$30\\% = 0.3$$",
    );
  });
});

describe("canonicalizeMathSpans — 수식 안 `\\$` · 글 속 수식", () => {
  it("수식 안 `\\$` → `{\\char36}` (remark-math 가 거기서 수식을 끊지 않게)", () => {
    // (기대값의 `$` + `{` 는 템플릿 치환으로 읽히니 이어 붙인다)
    expect(canonicalizeMathSpans(R`$\$5 + \$3 = \$8$`)).toBe(
      "$" + R`{\char36}5 + {\char36}3 = {\char36}8` + "$",
    );
  });

  it("글 속 `\\$`(화폐)는 건드리지 않는다", () => {
    const text = R`가격은 \$5 이고 $x=2$ 이다.`;
    expect(canonicalizeMathSpans(text)).toBe(text);
  });

  it("`\\text{… $x$ …}` 속 `$` → `\\(…\\)` — 바깥 수식이 한 덩어리로 남는다", () => {
    const out = canonicalizeMathSpans(R`$\text{값이 $x$ 일 때}=3$`);
    expect(out).toBe(R`$\text{값이 \(x\) 일 때}=3$`);
    expect(findMathSpans(out)).toHaveLength(1);
  });

  it("글 속 수식이 없는 `\\text{}` 는 그대로", () => {
    const text = R`$\text{이동 거리}=8$ 이고 $y$`;
    expect(canonicalizeMathSpans(text)).toBe(text);
  });
});

describe("멱등 — 두 번 돌려도 같다", () => {
  it.each([
    R`값은 $a=1$$b=2$$c=3$ 이다.`,
    R`값은 $$a=1$$$b=2$ 이다.`,
    "따라서" + NL + "$$x(b)" + NL + "- x(a)" + NL + "= 8$$",
    R`$\text{값이 $x$ 일 때}=3$`,
    R`$\$5 + \$3$ 와 \$2`,
    "따라서" + NL + "$$" + NL + "x = 1" + NL + "$$",
    "",
    "수식 없는 글",
  ])("%s", (text) => {
    const once = canonicalizeMathSpans(text);
    expect(canonicalizeMathSpans(once)).toBe(once);
  });
});
