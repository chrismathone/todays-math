/**
 * 교재 지면 · 스냅샷 투영의 그림 자리 `[그림:n]` (D-164 ③④ · 2026-10-21 Codex 검토).
 *
 * ⑴ 저장된 본문의 번호는 은행 `figureUrls` 차례다 — 스냅샷은 엔진 SVG 를 그림 배열 맨 앞에 두므로, 배열을 그대로 넘기는
 *    투영(교재 · 학생 QR · SVG 원문 없는 인쇄본)은 번호를 옮긴다(`renumberSnapshotSlots`).
 * ⑵ 교재 렌더는 원문 마크다운을 제 렌더러로 그리고 자리 줄만 그림 묶음으로 바꾼다 — 판정은 은행 지면과 같은 함수.
 *    자리가 없는 문항은 바이트 그대로다(분수 보기 줄 표시 `fractionChoiceRows` 도 그대로 남는다).
 */
import { describe, expect, it } from "vitest";

import type { ProblemSnapshot } from "@/contracts/textbookExchange.contract";
import { CHOICE_ROW_CLASS } from "@/lib/textbook/render/blocks/fractionChoiceRows";
import { renderProblemHtml } from "@/lib/textbook/render/blocks/problem";
import type { RenderBlock } from "@/lib/textbook/render/model";
import { renumberSnapshotSlots } from "@/lib/textbook/snapshotSlots";
import { checkFigureSlotsForWrite } from "@/lib/textbook/render/slotCut";
import { checkFigureSlots } from "@/lib/problem/figureSlots";
import { snapshotToPrintable } from "@/lib/textbook/snapshotToPrintable";

type Problem = Extract<RenderBlock, { kind: "problem" }>;
const resources = {
  assetUrl: (id: string) => `/assets/${id}.png`,
  qrDataUrl: () => "data:image/png;base64,AA==",
};
const parse = (html: string) =>
  new DOMParser().parseFromString(html, "text/html");
const figure = (assetId: string, choiceIndex: number | null = 0) => ({
  assetId,
  sha256: assetId,
  choiceIndex,
  sourceWidthMm: null,
  altText: null,
});

function problem(
  content: string,
  figures: ReturnType<typeof figure>[],
  extra: Partial<Problem> = {},
): Problem {
  return {
    id: "p1",
    sourceBlockId: "p1",
    unitKey: "U02",
    sectionKey: "s1",
    kind: "problem",
    itemId: "item-1",
    displayNumber: "7",
    content,
    figures,
    questionType: "단답형",
    sourcePageLabel: null,
    qr: null,
    layout: {
      columnSpan: 1,
      minWorkLines: 2,
      preferredWorkLines: 3,
      maxWorkLines: 10,
      keepTogether: true,
    },
    semantic: { activity: "basicCheck" },
    ...extra,
  } as unknown as Problem;
}

describe("renumberSnapshotSlots — 은행 번호 → 이 투영의 그림 차례", () => {
  const figures = [
    { assetId: "svg1" },
    { assetId: "png1" },
    { assetId: "png2" },
  ];
  it("엔진 SVG 가 맨 앞이면 한 칸씩 민다 — 배열을 그대로 넘기는 교재 · 학생 QR", () => {
    expect(
      renumberSnapshotSlots(
        "물음\n[그림:1] ⑴ (　　)\n[그림:2]",
        figures,
        "svg1",
        [0, 1, 2],
      ),
    ).toBe("물음\n[그림:2] ⑴ (　　)\n[그림:3]");
  });
  it("SVG 를 빼고 넘기면 그대로 — SVG 원문을 받은 인쇄본", () => {
    expect(
      renumberSnapshotSlots(
        "물음\n[그림:1]\n[그림:2]",
        figures,
        "svg1",
        [1, 2],
      ),
    ).toBe("물음\n[그림:1]\n[그림:2]");
  });
  it("대응이 없는 번호는 0 — 밀린 배열에서 다른 그림을 가리키지 않게(그 자리는 글로 남는다)", () => {
    expect(
      renumberSnapshotSlots("물음\n[그림:3]", figures, "svg1", [0, 1, 2]),
    ).toBe("물음\n[그림:0]");
  });
  it("엔진 SVG 와 같은 자산이 은행 그림에도 있으면 엔진 자리 한 곳만 뺀다 — 캡처가 [A, A, B] 를 낸다(Codex B5)", () => {
    const repeated = [{ assetId: "A" }, { assetId: "A" }, { assetId: "B" }];
    // 교재 · 학생 QR(그림 전부): 은행 1 · 2 → 2 · 3
    expect(
      renumberSnapshotSlots(
        "물음\n[그림:1] ⑴\n[그림:2] ⑵",
        repeated,
        "A",
        [0, 1, 2],
      ),
    ).toBe("물음\n[그림:2] ⑴\n[그림:3] ⑵");
    // SVG 원문을 받은 인쇄본(엔진 자리 0 을 뺀 [1, 2]): 1 · 2 그대로
    expect(
      renumberSnapshotSlots(
        "물음\n[그림:1] ⑴\n[그림:2] ⑵",
        repeated,
        "A",
        [1, 2],
      ),
    ).toBe("물음\n[그림:1] ⑴\n[그림:2] ⑵");
  });

  it("자리 줄이 없으면 본문을 한 글자도 안 바꾼다", () => {
    const content = "오른쪽 그림에서 $x$의 값을 구하시오.\n[그림]";
    expect(renumberSnapshotSlots(content, figures, "svg1", [0, 1, 2])).toBe(
      content,
    );
  });
});

describe("교재 렌더 — 자리 줄만 그림 묶음으로", () => {
  it("설명 → 그림 → 물음 · 캡션은 그림 바로 아래 · 쓴 그림은 뒤 모음에서 빠진다", () => {
    const html = renderProblemHtml(
      problem(
        "다음은 상용로그표의 일부이다.\n[그림:1] ⑴ (　　　　)\n이 표를 이용하여 값을 구하시오.",
        [figure("a"), figure("b")],
      ),
      resources,
    );
    const dom = parse(html);
    const slots = [
      ...dom.querySelectorAll("[data-figure-slots] [data-figure-slot]"),
    ];
    expect(slots.map((slot) => slot.getAttribute("data-figure-slot"))).toEqual([
      "1",
    ]);
    expect(slots[0]!.querySelector("img")!.getAttribute("src")).toBe(
      "/assets/a.png",
    );
    expect(slots[0]!.querySelector("figcaption")!.textContent).toContain(
      "⑴ (　　　　)",
    );
    // 뒤 모음에는 둘째 그림만
    const trailing = [
      ...dom.querySelectorAll(".tb-problem-question > .tb-problem-figure img"),
    ].map((img) => img.getAttribute("src"));
    expect(trailing).toEqual(["/assets/b.png"]);
    // 차례: 설명 · 그림 묶음 · 물음
    const prose = dom.querySelector(".tb-prose")!.innerHTML;
    expect(prose.indexOf("일부이다")).toBeLessThan(
      prose.indexOf("data-figure-slots"),
    );
    expect(prose.indexOf("data-figure-slots")).toBeLessThan(
      prose.indexOf("이 표를"),
    );
  });

  it("잘못 적힌 자리는 원문 그대로 글 · 그림은 오늘처럼 뒤에(번호가 범위 밖)", () => {
    const html = renderProblemHtml(
      problem("다음을 구하시오.\n[그림:3] ⑴ (　　)", [figure("a")]),
      resources,
    );
    expect(html).not.toContain("data-figure-slots");
    expect(parse(html).querySelector(".tb-prose")!.textContent).toContain(
      "[그림:3] ⑴ (　　)",
    );
    expect(
      parse(html).querySelectorAll(".tb-problem-question > .tb-problem-figure"),
    ).toHaveLength(1);
  });

  it("보기의 분수 줄 표시는 마지막 글 조각에 그대로 — 캡션 «⑴» 은 보기로 안 센다", () => {
    const content = [
      "다음 그림을 보고 값을 고르시오.",
      "[그림:1] ⑴",
      "① $\\dfrac{1}{3}$",
      "② $\\dfrac{2}{5}$",
      "③ $\\dfrac{3}{7}$",
      "④ $-\\dfrac{4}{9}$",
      "⑤ $\\dfrac{5}{11}$",
    ].join("\n");
    const dom = parse(
      renderProblemHtml(problem(content, [figure("a")]), resources),
    );
    expect(dom.querySelectorAll(`.${CHOICE_ROW_CLASS}`)).toHaveLength(5);
    expect(dom.querySelectorAll("[data-figure-slot]")).toHaveLength(1);
  });

  it("코드 울타리 안의 자리 줄은 자리가 아니다 — 원문을 가르지 않아 울타리 뒤 본문이 코드로 안 들어간다(Codex 3차 B3)", () => {
    const dom = parse(
      renderProblemHtml(
        problem("다음 코드를 보시오.\n````\n```\n[그림:1]\n````\n정상 본문", [
          figure("a"),
        ]),
        resources,
      ),
    );
    expect(dom.querySelectorAll("[data-figure-slot]")).toHaveLength(0);
    expect(dom.querySelector("pre code")!.textContent).toContain("[그림:1]");
    expect(dom.querySelector("pre code")!.textContent).not.toContain(
      "정상 본문",
    );
    expect(dom.querySelector(".tb-prose")!.textContent).toContain("정상 본문");
  });

  it("CRLF 본문의 코드 울타리 안 자리 · 인용을 가르는 자리는 안 세운다 — 원문 그대로 그린다(Codex 4차)", () => {
    const crlf = [
      "다음 코드를 보시오.",
      "```",
      "[그림:1]",
      "```",
      "정상 본문",
    ].join("\r\n");
    const code = parse(
      renderProblemHtml(problem(crlf, [figure("a")]), resources),
    );
    expect(code.querySelectorAll("[data-figure-slot]")).toHaveLength(0);
    expect(code.querySelector("pre code")!.textContent).not.toContain(
      "정상 본문",
    );
    // `>` 없이 이어 쓴 줄은 인용 안이다 — 자리 줄에서 자르면 그 줄이 인용 밖으로 나갔다
    const lazy =
      "> <조건>\n> ㄱ. 첫째 조건\n> ㄴ. 둘째 조건\n[그림:1] ⑴\n뒤에 이어진 설명이다.";
    const quote = parse(
      renderProblemHtml(problem(lazy, [figure("a")]), resources),
    );
    expect(quote.querySelectorAll("[data-figure-slot]")).toHaveLength(0);
    expect(quote.querySelector("blockquote")!.textContent).toContain(
      "뒤에 이어진 설명이다.",
    );
  });

  it("GFM 에만 있는 마디(양끝 `|` 없는 표 · 지운 줄)를 자리가 가르면 교재는 원문 그대로 — 쓰기 검사도 거절한다(Codex 5차)", () => {
    const table =
      "다음 표를 보시오.\n\n값 | 개수\n--- | ---\n[그림:1]\n1 | 2\n\n물음에 답하시오.";
    const dom = parse(
      renderProblemHtml(problem(table, [figure("a")]), resources),
    );
    expect(dom.querySelectorAll("[data-figure-slot]")).toHaveLength(0);
    // 자리 줄을 뺀 원문처럼 제목행과 자료행이 한 표 안이다(자리 줄은 원문 그대로 그 안의 글)
    expect(dom.querySelectorAll("table")).toHaveLength(1);
    expect(dom.querySelector("table")!.textContent).toContain("1");
    // 은행 지면은 GFM 을 안 읽어 자리를 세운다 — 쓰기 전에는 두 지면을 다 본다
    expect(checkFigureSlots(table, 1, [])).toEqual([]);
    expect(checkFigureSlotsForWrite(table, 1, [])).toEqual([
      "교재 지면: 그림 자리가 원문 마크다운의 덩어리를 가른다(표)",
    ]);
    const strike = "다음은 ~~삼각형이다.\n[그림:1]\n물음~~에 답하시오.";
    expect(checkFigureSlotsForWrite(strike, 1, [])).toEqual([
      "교재 지면: 그림 자리가 원문 마크다운의 덩어리를 가른다(지운 줄)",
    ]);
    // 바르게 적힌 문항은 두 지면 다 선다
    expect(
      checkFigureSlotsForWrite(
        "다음 그림을 보시오.\n[그림:1] ⑴ (　　　　)\n[그림:2] ⑵ (　　　　)",
        2,
        [],
      ),
    ).toEqual([]);
  });

  it("자리 줄이 없는 문항에는 그림 자리 표시가 하나도 없다", () => {
    const html = renderProblemHtml(
      problem("오른쪽 그림에서 $x$의 값을 구하시오.", [figure("a")]),
      resources,
    );
    expect(html).not.toContain("data-figure-slot");
    expect(html).not.toContain("tb-figure-slots");
  });
});

describe("인쇄 투영(snapshotToPrintable) — SVG 원문이 있으면 그대로, 없으면 한 칸 민다", () => {
  const snapshot = {
    snapshotId: "s1",
    source: {
      system: "todays-math",
      problemId: "00000000-0000-4000-8000-000000000001",
      problemCode: "J00000-A01-001",
    },
    payload: {
      format: "markdown-latex",
      content: "물음\n[그림:1] ⑴ (　　)",
      answer: "1",
      solution: null,
      questionType: "단답형",
      figures: [figure("svg1"), figure("png1")],
    },
    rawSource: { figureSvgAssetId: "svg1" },
    sourceMetadata: { grade: "중1" },
  } as unknown as ProblemSnapshot;

  it("SVG 원문을 받으면 그림 배열에서 빠지니 번호는 그대로", () => {
    const printable = snapshotToPrintable(snapshot, 0, (id) => ({
      url: `/assets/${id}`,
      widthPx: 10,
      heightPx: 10,
      ...(id === "svg1"
        ? {
            svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"></svg>',
          }
        : {}),
    }));
    expect(printable.figureUrls).toEqual(["/assets/png1"]);
    expect(printable.content).toContain("[그림:1] ⑴");
  });

  it("SVG 원문이 없으면 SVG 가 배열에 남는다 — 번호를 한 칸 민다", () => {
    const printable = snapshotToPrintable(snapshot, 0, (id) => ({
      url: `/assets/${id}`,
      widthPx: 10,
      heightPx: 10,
    }));
    expect(printable.figureUrls).toEqual(["/assets/svg1", "/assets/png1"]);
    expect(printable.content).toContain("[그림:2] ⑴");
  });
});
