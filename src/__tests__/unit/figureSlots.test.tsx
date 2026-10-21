/**
 * 그림 자리 `[그림:n]` (D-164 ③④ · 2026-10-21 리드 · Codex 합의) — 파서 · 조판 · 넘침 자.
 *
 * 표기: 독립된 줄의 `[그림:1]` 또는 `[그림:1] ⑴ (　　　　)` — 번호는 `figureUrls` 의 1부터, 뒤 글은 그 그림 바로 아래 캡션.
 * 조판(`ProblemContent`)과 자(`estimateProblemPx`)는 `slottedProblem` 한 함수로 읽는다. 잘못 적힌 자리는 글로 남는다.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProblemContent } from "@/components/math/ProblemContent";
import { hideFigureMarker } from "@/lib/problem/figureMarker";
import {
  checkFigureSlots,
  extractFigureSlots,
  renumberFigureSlots,
  slottedProblem,
} from "@/lib/problem/figureSlots";
import { parseProblemContent } from "@/lib/problem/parseProblemContent";
import {
  estimateFigureBlockPx,
  estimateFigureSlotGroupPx,
  estimateProblemPx,
  JASEUP_RULER,
} from "@/lib/printOverflow";

const URLS = [
  "/figures/t/q01-1.png",
  "/figures/t/q01-2.png",
  "/figures/t/q01-3.png",
];
const html = (
  content: string,
  figureUrls = URLS,
  choiceFigureIndex?: number[],
) =>
  renderToStaticMarkup(
    <ProblemContent
      content={content}
      figureUrls={figureUrls}
      choiceFigureIndex={choiceFigureIndex}
      deferFigures={false}
    />,
  );
/** 렌더 결과에서 그림 순서와 자리(제자리 묶음 · 뒤 모음)를 읽는다. */
const placed = (out: string) =>
  [
    ...out.matchAll(/data-figure-slot="(\d+)"|<img src="[^"]*q01-(\d)\.png"/g),
  ].map((m) => (m[1] ? `slot:${m[1]}` : `img:${m[2]}`));

describe("extractFigureSlots — 자리 줄만 뽑는다", () => {
  it("독립된 줄만 자리다 — 캡션은 같은 줄의 뒤 글", () => {
    const { marks } = extractFigureSlots(
      "다음 물음에 답하시오.\n[그림:1] ⑴ (　　　　)\n  [그림:2]  \r\n본문 [그림:3] 가운데",
    );
    expect(marks).toEqual([
      { number: 1, caption: "⑴ (　　　　)", source: "[그림:1] ⑴ (　　　　)" },
      { number: 2, caption: null, source: "[그림:2]" },
    ]);
  });

  it("수식 안의 자리 줄 · 한 줄에 자리 둘은 뽑지 않고 까닭을 남긴다(2026-10-21 Codex 검토)", () => {
    const math = extractFigureSlots("다음을 계산하시오.\n$$\n[그림:1]\n$$\n끝");
    expect(math.marks).toEqual([]);
    expect(math.skipped).toEqual(["[그림:1] — 수식 · 코드 안의 자리 표기"]);
    const twice = extractFigureSlots(
      "다음을 구하시오.\n[그림:1] ⑴ (　　　　) [그림:2] ⑵ (　　　　)",
    );
    expect(twice.marks).toEqual([]);
    expect(twice.skipped).toEqual([
      "[그림:1] ⑴ (　　　　) [그림:2] ⑵ (　　　　) — 한 줄에 자리 표기가 둘 이상",
    ]);
  });

  it("자리 줄이 없으면 본문을 그대로 돌려준다(옛 `[그림]` 표지는 안 본다)", () => {
    const content = "오른쪽 그림에서 $x$의 값을 구하시오.\n[그림]";
    expect(extractFigureSlots(content)).toEqual({
      content,
      marks: [],
      skipped: [],
    });
  });
});

describe("slottedProblem — 자리가 없으면 오늘과 같은 값", () => {
  it("발문 · 보기가 `parseProblemContent` + `hideFigureMarker` 와 한 글자도 같다", () => {
    for (const content of [
      "다음 중 옳은 것은?\n① $1$ ② $2$ ③ $3$ ④ $4$ ⑤ $5$",
      "오른쪽 그림에서 $x$의 값을 구하시오.\n[그림]",
      "다음 물음에 답하시오.\n⑴ $2+3$\n⑵ $4+5$",
    ]) {
      const parsed = parseProblemContent(content);
      const got = slottedProblem(content, 1, undefined, true);
      expect(got.question).toBe(hideFigureMarker(parsed.question, true));
      expect(got.choices).toEqual(parsed.choices);
      expect(got.slots.parts).toEqual([{ kind: "text", text: got.question }]);
      expect(got.problems).toEqual([]);
    }
  });
});

describe("ProblemContent — 그림을 그 자리에, 캡션은 바로 아래", () => {
  it("설명 → 그림 → 물음 — 쓴 그림은 뒤 모음에서 빠지고 남은 그림은 오늘처럼 글 아래", () => {
    const out = html(
      "다음은 상용로그표의 일부이다.\n[그림:2]\n이 표를 이용하여 $\\log 2.13$의 값을 구하시오.",
    );
    expect(placed(out)).toEqual(["slot:2", "img:2", "img:1", "img:3"]);
    const text = out.replace(/<[^>]+>/g, "");
    expect(text.indexOf("일부이다.")).toBeLessThan(text.indexOf("이 표를"));
    // 그림 자리 묶음은 설명과 물음 **사이**에 있다
    const slot = out.indexOf('data-figure-slot="2"');
    expect(out.indexOf("일부이다.")).toBeLessThan(slot);
    expect(slot).toBeLessThan(out.indexOf("이 표를"));
  });

  it("그림마다 바로 아래 캡션 — 이어진 자리 줄은 한 묶음(지면에서 안 갈린다)", () => {
    const out = html(
      "다음 그림에서 색칠한 부분의 넓이를 구하시오.\n[그림:1] ⑴ (　　　　)\n[그림:2] ⑵ (　　　　)",
      URLS.slice(0, 2),
    );
    expect(out.match(/data-figure-slots=""/g)).toHaveLength(1);
    expect(out).toContain("print:break-inside-avoid");
    expect(placed(out)).toEqual(["slot:1", "img:1", "slot:2", "img:2"]);
    // 캡션은 그 그림 칸 안, 그림 다음
    const first = out.slice(
      out.indexOf('data-figure-slot="1"'),
      out.indexOf('data-figure-slot="2"'),
    );
    expect(first.indexOf("q01-1.png")).toBeLessThan(
      first.indexOf("⑴ (　　　　)"),
    );
    expect(first).toContain('data-figure-caption=""');
    // 다 제자리에 그렸으니 뒤 모음은 없다
    expect(out.match(/<img /g)).toHaveLength(2);
  });

  it("잘못 적힌 자리는 그림으로 세우지 않고 원문 그대로 글로 둔다 — 범위 밖 · 같은 그림 두 번 · 상자 안", () => {
    const out = html(
      "그림을 보고 답하시오.\n[그림:4] ⑴ (　　)\n[그림:1]\n[그림:1]\n> <보기>\n>\n> ㄱ. 참\n[그림:2]",
      URLS.slice(0, 2),
    );
    expect(out).toContain("[그림:4] ⑴ (　　)");
    expect(out.match(/data-figure-slot="1"/g)).toHaveLength(1);
    expect(out).toContain("[그림:1]");
    const { problems } = slottedProblem(
      "그림을 보고 답하시오.\n[그림:4] ⑴ (　　)\n[그림:1]\n[그림:1]",
      2,
      undefined,
      true,
    );
    expect(problems).toEqual([
      "[그림:4] ⑴ (　　) — 번호가 범위 밖(그림 2장)",
      "[그림:1] — 같은 그림을 두 번",
    ]);
  });

  it("보기 칸에 들어가는 그림은 발문 자리로 못 쓴다 — 보기 격자는 그대로", () => {
    const content = "다음 중 옳은 그래프는?\n[그림:1]\n① [그림]\n② [그림]";
    const out = html(content, URLS.slice(0, 2), [1, 2]);
    expect(out).toContain('alt="보기 ① 그림"');
    expect(out).toContain('alt="보기 ② 그림"');
    expect(out).not.toContain("data-figure-slot=");
    expect(out).toContain("[그림:1]");
    expect(slottedProblem(content, 2, [1, 2], true).problems).toEqual([
      "[그림:1] — 보기 그림",
    ]);
  });

  it("보기 안에 선 자리는 그 보기에 원문 그대로 — 검사가 짚는다", () => {
    const content = "옳은 것은?\n① 1\n② 2\n③ 3\n④ 4\n⑤ 5\n[그림:1]";
    expect(html(content, URLS.slice(0, 1))).toContain("5 [그림:1]");
    expect(checkFigureSlots(content, 1, [])).toEqual(["5번 보기 안의 자리"]);
  });

  it("줄 가운데의 표기는 자리가 아니다 — 글로 찍히고 검사가 짚는다", () => {
    const content = "다음 [그림:1] 에서 구하시오.";
    expect(html(content, URLS.slice(0, 1))).toContain(
      "다음 [그림:1] 에서 구하시오.",
    );
    expect(checkFigureSlots(content, 1, [])).toEqual([
      "줄 가운데의 자리 표기: 다음 [그림:1] 에서 구하시오.",
    ]);
  });

  it("한 줄에 자리 둘 · 수식 안 자리는 검사가 짚는다 — 둘째 그림이 첫 그림의 캡션으로 들어가 성공으로 돌아오던 것", () => {
    expect(
      checkFigureSlots(
        "다음을 구하시오.\n[그림:1] ⑴ (　　　　) [그림:2] ⑵ (　　　　)",
        2,
        [],
      ),
    ).toEqual([
      "[그림:1] ⑴ (　　　　) [그림:2] ⑵ (　　　　) — 한 줄에 자리 표기가 둘 이상",
    ]);
    expect(
      checkFigureSlots("다음을 계산하시오.\n$$\n[그림:1]\n$$", 1, []),
    ).toEqual(["[그림:1] — 수식 · 코드 안의 자리 표기"]);
    // `\[ … \]`(렌더러가 `$$` 로 읽는다) · 코드 울타리 — 닫는 울타리가 새 여는 울타리가 되어 뒤 본문을 삼키던 것(Codex B3)
    expect(
      checkFigureSlots("다음을 계산하시오.\n\\[\n[그림:1]\n\\]", 1, []),
    ).toEqual(["[그림:1] — 수식 · 코드 안의 자리 표기"]);
    expect(
      checkFigureSlots("다음 코드를 보시오.\n```\n[그림:1]\n```\n끝", 1, []),
    ).toEqual(["[그림:1] — 수식 · 코드 안의 자리 표기"]);
  });

  it("상자 뒤의 자리도 그 자리에 선다 — 끝 항목에 붙은 자리표는 상자 뒤로, 상자는 자리 줄을 뺀 같은 문항과 열 수까지 같다", () => {
    const content =
      "다음 <조건>을 만족하는 도형을 고르시오.\n<조건>\nㄱ. 네 변의 길이가 같다.\nㄴ. 네 각의 크기가 같다.\n[그림:1] ⑴ (　　　　)\n[그림:2] ⑵ (　　　　)";
    expect(checkFigureSlots(content, 2, [])).toEqual([]);
    const out = html(content, URLS.slice(0, 2));
    expect(out.match(/data-figure-slot="/g)).toHaveLength(2);
    // 상자는 그대로 서고(항목 둘), 그림 묶음은 상자 **뒤**에 있다
    expect(out.indexOf("네 각의 크기가 같다")).toBeLessThan(
      out.indexOf('data-figure-slots=""'),
    );
    // 끝 항목에 붙었던 자리표가 항목 폭을 늘려 1열로 바꾸던 것 — 자리 줄을 뺀 문항의 2열 그대로
    const [box] = slottedProblem(content, 2, [], true).slots.parts;
    const plain = parseProblemContent(
      content.split("\n").slice(0, 4).join("\n"),
    ).question;
    expect(plain).toContain("<조건:cols=2>");
    expect(box).toEqual({ kind: "text", text: plain });
  });

  it("상자는 발문 통째로 판정한다 — 자리 앞의 소문항 · «다음 조건을» 발문이 자리 뒤 상자의 문맥이다(Codex 3차 B2)", () => {
    const cases: [string, string][] = [
      // 자리 뒤 〈조건〉 다음의 소문항 `$(2)$` 는 상자 밖이다 — 앞의 `$(1)$` 을 봐야 안다
      [
        "다음 물음에 답하시오.\n$(1)$ 첫째 값을 구하시오.\n[그림:1]\n<조건>\n풀이 과정을 반드시 적을 것.\n$(2)$ 둘째 값을 구하시오.",
        "다음 물음에 답하시오.\n$(1)$ 첫째 값을 구하시오.\n<조건>\n풀이 과정을 반드시 적을 것.\n$(2)$ 둘째 값을 구하시오.",
      ],
      // «다음 조건을 …» 발문과 불릿 조건 사이의 자리 — 자동 조건 상자가 그대로 선다
      [
        "다음 조건을 모두 만족하는 삼각형 ABC 를 그리시오.\n[그림:1]\n• 세 변의 길이가 같다.\n• 한 각의 크기가 60도이다.",
        "다음 조건을 모두 만족하는 삼각형 ABC 를 그리시오.\n• 세 변의 길이가 같다.\n• 한 각의 크기가 60도이다.",
      ],
    ];
    for (const [withSlot, without] of cases) {
      const got = slottedProblem(withSlot, 1, [], true);
      expect(got.problems, withSlot).toEqual([]);
      expect(got.slots.parts.map((part) => part.kind)).toEqual([
        "text",
        "figures",
        "text",
      ]);
      const text = got.slots.parts
        .flatMap((part) => (part.kind === "text" ? [part.text] : []))
        .join("\n\n");
      expect(text, withSlot).toBe(parseProblemContent(without).question);
    }
  });

  it("자리가 상자 판정을 바꾸면 자리를 하나도 안 세운다 — 나열 발문과 나열 사이 · 상자에 이어진 물음(틀린 상자를 조용히 내지 않는다)", () => {
    const BOX_CHANGED =
      "그림 자리가 상자 판정을 바꾼다 — 자리 줄을 뺀 같은 문항과 상자가 다르다";
    for (const content of [
      "다음 수를 작은 것부터 차례대로 나열했을 때, 두 번째 수는?\n[그림:1]\n$-3$, $\\dfrac{1}{2}$, $0$, $2.5$, $-\\dfrac{7}{3}$",
      "다음 <조건>을 보고 답하시오.\n<조건>\nㄱ. 네 변의 길이가 같다.\nㄴ. 네 각의 크기가 같다.\n[그림:1] ⑴ (　　　　)\n위 그림에서 넓이를 구하시오.",
    ]) {
      expect(checkFigureSlots(content, 1, []), content).toContain(BOX_CHANGED);
      const out = html(content, URLS.slice(0, 1));
      expect(out).not.toContain("data-figure-slot=");
      expect(out).toContain("[그림:1]");
    }
  });

  it("지면의 글은 자리 줄을 뺀 같은 문항의 글 그대로다 — 글 조각은 그 글을 차례대로 자른 것(Codex 4차 B2)", () => {
    const cases: [string, number][] = [
      // 식 줄 **뒤**의 자리 — 자리표가 «마지막 홑수식»을 깨 식이 발문에 붙던 것
      ["다음 식을 계산하시오.\n$2\\sqrt{11}\\times3$\n[그림:1]", 1],
      [
        "다음은 상용로그표의 일부이다.\n[그림:1]\n이 표를 이용하여 $\\log 2.13$의 값을 구하시오.",
        1,
      ],
      [
        "다음은 상용로그표의 일부이다\n\n[그림:1]\n\n이 표를 이용하여 값을 구하시오.",
        1,
      ],
      [
        "다음 물음에 답하시오. ⑴ 첫째 값을 구하시오.\n[그림:1]\n이어서 ⑵ 둘째 값을 구하시오. ⑶ 셋째 값을 구하시오.",
        1,
      ],
      [
        "다음은 계산 과정을 나타낸 것이다.\n[그림:1]\n$\\dfrac{9}{250}=\\dfrac{9}{2\\times5^3}=0.036$",
        1,
      ],
      [
        "다음 그림에서 색칠한 부분의 넓이를 구하시오.\n[그림:1] ⑴ (　　　　)\n[그림:2] ⑵ (　　　　)",
        2,
      ],
      ["다음 중 옳은 것은?\n[그림:1]\n① $1$ ② $2$ ③ $3$ ④ $4$ ⑤ $5$", 1],
    ];
    for (const [content, n] of cases) {
      const without = content
        .split("\n")
        .filter((line) => !/^\[그림:\d+\]/.test(line))
        .join("\n");
      const plain = parseProblemContent(without);
      const got = slottedProblem(content, n, [], true);
      expect(got.problems, content).toEqual([]);
      expect(got.slots.placed.size, content).toBeGreaterThan(0);
      expect(got.choices).toEqual(plain.choices);
      let at = 0;
      for (const part of got.slots.parts) {
        if (part.kind !== "text") continue;
        const found = plain.question.indexOf(part.text, at);
        expect(found, `${content} ⟶ ${part.text}`).toBeGreaterThanOrEqual(0);
        // 조각 사이에는 띄어쓰기 · 줄바꿈만 — 글자는 빠지지 않는다
        expect(plain.question.slice(at, found).trim()).toBe("");
        at = found + part.text.length;
      }
      expect(plain.question.slice(at).trim()).toBe("");
    }
    // 식 줄 뒤의 자리: 식은 제 문단 그대로 — 가운데 정렬 · 위 여백 표지가 선다
    const out = html(
      "다음 식을 계산하시오.\n$2\\sqrt{11}\\times3$\n[그림:1]",
      URLS.slice(0, 1),
    );
    expect(out).toContain("data-formula-line");
    expect(out.indexOf("data-formula-line")).toBeLessThan(
      out.indexOf('data-figure-slots=""'),
    );
  });

  it("실제 지면(SSR) — 그림 묶음 밖은 자리 줄을 뺀 같은 문항과 같다(글 · 식 · 식 줄 표지 · 굵게 · 상자)", () => {
    const summary = (out: string) => {
      const doc = new DOMParser().parseFromString(
        `<body>${out}</body>`,
        "text/html",
      );
      doc
        .querySelectorAll("[data-figure-slots], img")
        .forEach((node) => node.remove());
      const count = (selector: string) => doc.querySelectorAll(selector).length;
      return {
        text: (doc.body.textContent ?? "").replace(/\s+/g, ""),
        katex: count(".katex"),
        formulaLine: count("[data-formula-line]"),
        strong: count("strong"),
        box: count("blockquote, [data-box-card]"),
      };
    };
    for (const [content, n] of [
      ["다음 식을 계산하시오.\n$2\\sqrt{11}\\times3$\n[그림:1]", 1],
      [
        "다음은 상용로그표의 일부이다.\n[그림:1]\n이 표를 이용하여 $\\log 2.13$의 값을 구하시오.",
        1,
      ],
      ["다음은 **삼각형**이다.\n[그림:1]\n물음에 **답하시오**.", 1],
      [
        "다음 <조건>을 만족하는 도형을 고르시오.\n<조건>\nㄱ. 네 변의 길이가 같다.\nㄴ. 네 각의 크기가 같다.\n[그림:1] ⑴ (　　　　)\n[그림:2] ⑵ (　　　　)",
        2,
      ],
      [
        "> <조건>\n> ㄱ. 첫째 조건\n> ㄴ. 둘째 조건\n\n[그림:1] ⑴\n\n뒤에 이어진 설명이다.",
        1,
      ],
      [
        "다음은 계산 과정을 나타낸 것이다.\n[그림:1]\n$\\dfrac{9}{250}=\\dfrac{9}{2\\times5^3}=0.036$",
        1,
      ],
    ] as [string, number][]) {
      expect(checkFigureSlots(content, n, []), content).toEqual([]);
      const without = content
        .split("\n")
        .filter((line) => !/^\[그림:\d+\]/.test(line))
        .join("\n");
      const slotted = summary(html(content, URLS.slice(0, n)));
      // 자리 쪽 글에는 캡션(«⑴ (　　　　)» …)이 더 있다 — 캡션 글을 빼고 견준다
      for (const caption of content.matchAll(/^\[그림:\d+\] (.+)$/gm))
        slotted.text = slotted.text.replace(
          caption[1]!.replace(/\s+/g, ""),
          "",
        );
      expect(slotted, content).toEqual(
        summary(html(without, URLS.slice(0, n))),
      );
    }
  });

  it("자리 줄이 원문의 인용 · 목록 · 제목을 가르면 안 세운다 — `>` 없이 이어 쓴 줄은 인용 안이다(Codex 4 · 5차 — 교재가 원문을 자른다)", () => {
    const cut = (what: string) => [
      `그림 자리가 원문 마크다운의 덩어리를 가른다(${what})`,
    ];
    expect(
      checkFigureSlots(
        "> <조건>\n> ㄱ. 첫째 조건\n> ㄴ. 둘째 조건\n[그림:1] ⑴\n뒤에 이어진 설명이다.",
        1,
        [],
      ),
    ).toEqual(cut("인용"));
    expect(
      checkFigureSlots(
        "다음을 보시오.\n- 첫째 항목\n[그림:1]\n이어지는 설명",
        1,
        [],
      ),
    ).toEqual(cut("목록"));
    // Setext 제목 — 자리 줄을 뺀 원문에서는 «다음은 삼각형이다.» 가 제목이다
    expect(
      checkFigureSlots(
        "다음은 삼각형이다.\n[그림:1]\n---\n물음에 답하시오.",
        1,
        [],
      ),
    ).toEqual(cut("제목"));
    // 인용이 빈 줄로 끝난 뒤의 자리는 선다
    expect(
      checkFigureSlots(
        "> <조건>\n> ㄱ. 첫째 조건\n> ㄴ. 둘째 조건\n\n[그림:1] ⑴\n\n뒤에 이어진 설명이다.",
        1,
        [],
      ),
    ).toEqual([]);
  });

  it("자리가 굵게 · 기울임 같은 인라인 서식을 가르면 안 세운다 — 조각마다 그리면 별표가 드러난다(Codex 5차)", () => {
    // 원문에서 이미 서식이 자리를 넘는다(교재가 자르는 원문) — 은행 지면 글도 같다
    const cut = (what: string) => [
      `그림 자리가 원문 마크다운의 덩어리를 가른다(${what})`,
    ];
    expect(
      checkFigureSlots(
        "다음은 **삼각형이다.\n[그림:1]\n물음**에 답하시오.",
        1,
        [],
      ),
    ).toEqual(cut("굵게"));
    expect(
      checkFigureSlots(
        "다음은 *삼각형이다.\n[그림:1]\n물음*에 답하시오.",
        1,
        [],
      ),
    ).toEqual(cut("기울임"));
    // 자리 앞뒤에서 각각 닫힌 서식은 그대로 선다
    const ok = "다음은 **삼각형**이다.\n[그림:1]\n물음에 **답하시오**.";
    expect(checkFigureSlots(ok, 1, [])).toEqual([]);
    expect(html(ok, URLS.slice(0, 1)).match(/<strong>/g)).toHaveLength(2);
  });

  it("조각마다 그린 지면이 통째로 그린 것과 다르면 안 세운다 — 전처리 · 식 줄 표지 · 링크 정의(Codex 6차)", () => {
    // 엔티티로 적은 별표는 전처리가 풀어 굵게가 된다 — 자리를 넘는 굵게(통째로는 굵게 · 조각에서는 별표 글)
    expect(
      checkFigureSlots(
        "다음은 &#42;&#42;삼각형이다.\n[그림:1]\n물음&#42;&#42;에 답하시오.",
        1,
        [],
      ),
    ).toEqual([
      "그림 자리가 지면 글의 마크다운 나무를 바꾼다 — 조각마다 읽은 마디가 자리 줄을 뺀 같은 문항과 다르다",
    ]);
    // 수식 자동 감싸기가 자리 앞뒤를 한 식으로 묶는다 — 조각마다는 안 묶인다
    expect(checkFigureSlots("다음은 x +\n[그림:1]\ny 이다.", 1, [])).toEqual([
      "그림 자리가 지면 글의 전처리를 바꾼다 — 자리 줄을 뺀 같은 문항과 조각마다 전처리한 글이 다르다",
    ]);
    // 식 바로 앞의 자리 — 통째로는 «글 뒤의 식»이라 가운데 줄 · 위 여백이 서는데 조각에서는 앞 글을 못 본다
    const before = "다음 식을 계산하시오.\n[그림:1]\n$2\\sqrt{11}\\times3$";
    expect(checkFigureSlots(before, 1, [])).toEqual([
      "그림 자리가 식 줄 판정을 바꾼다 — 자리 줄을 뺀 같은 문항과 식 문단의 가운데 줄이 다르다",
    ]);
    const out = html(before, URLS.slice(0, 1));
    expect(out).not.toContain("data-figure-slot=");
    expect(out).toContain("[그림:1]");
    // 링크 정의는 문서 어디서나 앞의 참조를 바꾼다 — 조각 밖의 정의는 못 쓴다
    expect(
      checkFigureSlots(
        "다음 [그림 설명]을 보시오.\n[그림:1]\n물음에 답하시오.\n\n[그림 설명]: https://example.com",
        1,
        [],
      ),
    ).toEqual(["그림 자리가 든 원문에 링크 · 각주 정의가 있다"]);
  });

  it("조각 첫머리에서 새 마디가 생기거나 식 줄 · 연습 목록 판정이 갈리면 안 세운다(Codex 7차)", () => {
    const TREE = [
      "그림 자리가 지면 글의 마크다운 나무를 바꾼다 — 조각마다 읽은 마디가 자리 줄을 뺀 같은 문항과 다르다",
    ];
    // 통째로는 «다음 그림에서 # 물음» 한 문단의 글인데 조각에서는 제목 · 목록 · 인용이 된다
    for (const head of ["# 물음", "- 항목", "1. 항목", "> 인용"])
      expect(
        checkFigureSlots(`다음 그림에서\n\n[그림:1]\n\n${head}`, 1, []),
        head,
      ).toEqual(TREE);
    // 식 줄 표지는 지면 플러그인과 같은 갈래로 센다 — «<조건>을 보시오.» 는 글 문단이다
    expect(
      checkFigureSlots("<조건>을 보시오.\n\n[그림:1]\n\n$2+3$", 1, []),
    ).toEqual([
      "그림 자리가 식 줄 판정을 바꾼다 — 자리 줄을 뺀 같은 문항과 식 문단의 가운데 줄이 다르다",
    ]);
    // 연습 화면은 끝의 식 목록을 «도입 + 목록»으로 편다 — 조각에서는 «끝입니다.»를 못 봐 목록이 생긴다
    expect(
      checkFigureSlots("다음은 수이다.\n$1$, $2$\n[그림:1]\n끝입니다.", 1, []),
    ).toEqual(["그림 자리가 연습 화면의 식 목록 판정을 바꾼다"]);
  });

  it("상자 머리 · 상자 가운데의 자리는 «상자 안» — 원문 그대로 상자 안 글이다", () => {
    expect(
      checkFigureSlots(
        "다음 <보기>에서 옳은 것을 고르시오.\n<보기>\n[그림:1]\nㄱ. 참이다.\nㄴ. 거짓이다.",
        1,
        [],
      ),
    ).toEqual(["[그림:1] — 상자 안"]);
    expect(
      checkFigureSlots(
        "다음 <보기>에서 고르시오.\n<보기>\nㄱ. 참이다.\n[그림:1]\nㄴ. 거짓이다.",
        1,
        [],
      ),
    ).toEqual(["[그림:1] — 상자 안"]);
  });

  it("CRLF 본문의 울타리 · 전각 공백이나 NBSP 가 붙은 닫는 울타리 — 렌더러와 같이 읽는다(Codex 4차 B3)", () => {
    const INSIDE = ["[그림:1] — 수식 · 코드 안의 자리 표기"];
    const crlf = [
      "다음 코드를 보시오.",
      "```",
      "[그림:1]",
      "```",
      "정상 본문",
    ].join("\r\n");
    expect(checkFigureSlots(crlf, 1, [])).toEqual(INSIDE);
    // 닫는 울타리 뒤에는 공백 · 탭만 — 전각 공백 · NBSP 가 붙으면 닫지 않는다(CommonMark)
    for (const tail of ["\u3000", "\u00a0"])
      expect(
        checkFigureSlots(
          `다음 코드를 보시오.\n\`\`\`\n[그림:1]\n\`\`\`${tail}\n정상 본문`,
          1,
          [],
        ),
      ).toEqual(INSIDE);
  });

  it("코드 울타리는 CommonMark 대로 닫는다 — 짧은 울타리 · 뒤에 글이 붙은 울타리는 닫지 않는다(Codex 3차 B3)", () => {
    const INSIDE = ["[그림:1] — 수식 · 코드 안의 자리 표기"];
    expect(
      checkFigureSlots(
        "다음 코드를 보시오.\n````\n```\n[그림:1]\n````\n정상 본문",
        1,
        [],
      ),
    ).toEqual(INSIDE);
    expect(
      checkFigureSlots(
        "다음 코드를 보시오.\n```\n```foo\n[그림:1]\n```\n끝",
        1,
        [],
      ),
    ).toEqual(INSIDE);
    // 다른 글자의 울타리(~~~)는 백틱 울타리를 닫지 않는다 — 닫힌 뒤의 자리는 자리다
    expect(
      checkFigureSlots(
        "다음 코드를 보시오.\n```\n~~~\n```\n[그림:1]\n끝",
        1,
        [],
      ),
    ).toEqual([]);
  });

  it("렌더러 전처리 뒤의 줄바꿈 · 겹분수 캡션도 짚는다 — 엔티티로 적은 줄바꿈 · 한 줄보다 높은 식(Codex B4)", () => {
    expect(
      checkFigureSlots("다음 그림을 보시오.\n[그림:1] ⑴ 앞&#10;뒤", 1, []),
    ).toEqual(["[그림:1] ⑴ 앞&#10;뒤 — 캡션 안의 줄바꿈"]);
    expect(
      checkFigureSlots(
        "다음 그림을 보시오.\n[그림:1] ⑴ $\\dfrac{\\dfrac{1}{2}}{3}$",
        1,
        [],
      ),
    ).toEqual(["[그림:1] ⑴ $\\dfrac{\\dfrac{1}{2}}{3}$ — 캡션 안의 높은 식"]);
    // 목록이 아니라 KaTeX 로 그려 잰다 — `\dbinom` · `\genfrac` 처럼 목록에서 새던 것(Codex 3차 B4)
    for (const tall of [
      "$\\dbinom{\\dbinom{1}{2}}{3}$",
      "$\\genfrac{(}{)}{0pt}{0}{n}{k}$",
      "$\\sum_{k=1}^{n} k$",
    ])
      expect(
        checkFigureSlots(`다음 그림을 보시오.\n[그림:1] ⑴ ${tall}`, 1, []),
      ).toEqual([`[그림:1] ⑴ ${tall} — 캡션 안의 높은 식`]);
    for (const flat of ["$x^2+1$", "$\\sqrt{2}$", "$\\overline{AB}$"])
      expect(
        checkFigureSlots(`다음 그림을 보시오.\n[그림:1] ⑴ ${flat}`, 1, []),
      ).toEqual([]);
    // 식의 경계는 렌더러와 같은 파서로 — `\$` 는 글자 «$» 라 뒤의 식을 건너뛰지 않는다(Codex 4차 B4)
    const escaped = "[그림:1] ⑴ \\$1 $\\dbinom{\\dbinom{1}{2}}{3}$";
    expect(checkFigureSlots(`다음 그림을 보시오.\n${escaped}`, 1, [])).toEqual([
      `${escaped} — 캡션 안의 높은 식`,
    ]);
  });

  it("자리표가 있어도 계산 과정 · 소문항 차례 · 홑수식 줄은 발문 통째로 판정한다 — 자리 줄이 없는 같은 글과 같다(Codex B2)", () => {
    const pairs: [string, string][] = [
      [
        "다음은 계산 과정을 나타낸 것이다.\n[그림:1]\n$\\dfrac{9}{250}=\\dfrac{9}{2\\times5^3}=0.036$",
        "다음은 계산 과정을 나타낸 것이다.\n$\\dfrac{9}{250}=\\dfrac{9}{2\\times5^3}=0.036$",
      ],
    ];
    for (const [withSlot, without] of pairs) {
      const { slots } = slottedProblem(withSlot, 1, [], true);
      const text = slots.parts
        .flatMap((part) => (part.kind === "text" ? [part.text] : []))
        .join("\n\n");
      expect(text, withSlot).toBe(parseProblemContent(without).question);
    }
    // 소문항: ⑴ 이 자리 앞, ⑵ ⑶ 이 자리 뒤에 있어도 셋 다 문단 머리다
    const { slots } = slottedProblem(
      "다음 물음에 답하시오. ⑴ 첫째 값을 구하시오.\n[그림:1]\n이어서 ⑵ 둘째 값을 구하시오. ⑶ 셋째 값을 구하시오.",
      1,
      [],
      true,
    );
    const after = slots.parts.at(-1)!;
    expect(
      after.kind === "text" &&
        after.text.split("\n\n").filter((p) => /^⑵|^⑶/.test(p)),
    ).toHaveLength(2);
  });

  it("캡션 안 줄바꿈 · 블록 식은 검사가 짚는다 — 자와 지면이 갈리는 캡션", () => {
    expect(
      checkFigureSlots("다음을 구하시오.\n[그림:1] ⑴ 첫째\\n둘째", 1, []),
    ).toEqual(["[그림:1] ⑴ 첫째\\n둘째 — 캡션 안의 줄바꿈"]);
    expect(
      checkFigureSlots("다음을 구하시오.\n[그림:1] ⑴ $$x$$", 1, []),
    ).toEqual(["[그림:1] ⑴ $$x$$ — 캡션 안의 블록 식"]);
  });

  it("바르게 적힌 문항은 검사가 비어 있다", () => {
    expect(
      checkFigureSlots(
        "다음 물음에 답하시오.\n[그림:1] ⑴ (　　　　)\n[그림:2] ⑵ (　　　　)",
        2,
        [],
      ),
    ).toEqual([]);
  });

  it("빈 줄로 앞 문단에 붙어 버린 자리도 그 자리에서 가른다(문장부호 없는 문단을 파서가 잇는다)", () => {
    const out = html(
      "다음은 상용로그표의 일부이다\n\n[그림:1]\n\n이 표를 이용하여 값을 구하시오.",
      URLS.slice(0, 1),
    );
    const slot = out.indexOf('data-figure-slot="1"');
    expect(out.indexOf("일부이다")).toBeLessThan(slot);
    expect(slot).toBeLessThan(out.indexOf("이 표를"));
  });
});

describe("renumberFigureSlots — 그림 배열이 다른 투영에서만 번호를 고쳐 쓴다", () => {
  it("자리 줄의 번호만 바꾸고 캡션 · 다른 줄은 그대로 — 모르는 번호는 그대로 둔다", () => {
    const content =
      "다음을 구하시오.\n[그림:1] ⑴ (　　)\n[그림:2]\n본문 [그림:1] 가운데\n[그림:3]";
    expect(renumberFigureSlots(content, (n) => (n <= 2 ? n + 1 : null))).toBe(
      "다음을 구하시오.\n[그림:2] ⑴ (　　)\n[그림:3]\n본문 [그림:1] 가운데\n[그림:3]",
    );
  });
  it("수식 안 · 한 줄에 자리 둘인 줄은 안 건드린다", () => {
    const content = "$$\n[그림:1]\n$$\n[그림:1] ⑴ [그림:2] ⑵";
    expect(renumberFigureSlots(content, (n) => n + 1)).toBe(content);
  });
});

describe("넘침 자 — 제자리 그림 · 캡션을 지면과 같은 꼴로 센다", () => {
  const dims = [400, 300, 200, 150, 300, 300];
  // 지면 mm 를 모르는 그림 — 폭은 원본 픽셀(상한 70mm)이다(`figurePrintWidthPx`)
  const figure = (i: number) => ({
    width: dims[i * 2]!,
    height: dims[i * 2 + 1]!,
  });

  it("캡션의 줄은 조판과 같은 정규화 뒤에 센다 — 글자로 적은 «\\n» 은 두 줄", () => {
    const one = estimateFigureSlotGroupPx([
      { figure: figure(0), caption: "⑴ 첫째" },
    ]);
    const two = estimateFigureSlotGroupPx([
      { figure: figure(0), caption: "⑴ 첫째\\n둘째" },
    ]);
    expect(two - one).toBeCloseTo(JASEUP_RULER.line, 6);
  });

  it("캡션 한 줄은 `mt-1` 4px + 본문 한 줄만큼 높다", () => {
    const bare = estimateFigureSlotGroupPx([
      { figure: figure(0), caption: null },
    ]);
    const captioned = estimateFigureSlotGroupPx([
      { figure: figure(0), caption: "⑴ (　　　　)" },
    ]);
    expect(captioned - bare).toBeCloseTo(4 + JASEUP_RULER.line, 6);
    // 캡션 없는 자리는 오늘의 그림 묶음과 같은 높이다
    expect(bare).toBeCloseTo(estimateFigureBlockPx([figure(0)]), 6);
  });

  it("문항 높이 = 자리 줄을 뺀 글 + 자리 묶음 + 남은 그림 — 자리 줄을 글 한 줄로 두 번 세지 않는다", () => {
    const figures = [figure(0), figure(1), figure(2)];
    const slotted =
      "다음은 상용로그표의 일부이다.\n[그림:2] ⑴ (　　　　)\n이 표를 이용하여 값을 구하시오.";
    const plain =
      "다음은 상용로그표의 일부이다.\n이 표를 이용하여 값을 구하시오.";
    const expected =
      estimateProblemPx(plain, [], null) +
      estimateFigureSlotGroupPx([
        { figure: figures[1]!, caption: "⑴ (　　　　)" },
      ]) +
      estimateFigureBlockPx([figures[0]!, figures[2]!]);
    expect(estimateProblemPx(slotted, figures, null)).toBeCloseTo(expected, 6);
  });
});
