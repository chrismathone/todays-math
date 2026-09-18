import { describe, expect, it } from "vitest";
import { buildHwpxParts, HwpxPayloadSchema } from "@/lib/export/hwpxServer";

// HWPX 를 한글에서 열었을 때 보인 깨짐 넷(mathg-gen 144ac19·b289619 이식)을
// **생성된 XML 안에서** 잰다. 한글이 그 XML 을 실제로 어떻게 그리는지는 이 시험이
// 못 본다 — 한글 COM 을 돌리지 않기 때문이다(CLAUDE.md 절대 규칙 9).
//
// ① 수식 뒤 글자가 수식에 겹침 — 한글은 HWPX 를 열 때 수식 상자를 다시 재지 않고
//    <hp:sz> 를 그대로 쓴다. 그래서 상자 폭은 KaTeX 폭이 아니라 한글이 잴 폭이어야 한다.
// ② 5지선다 ③ 혼자 줄바꿈 — 넓은 간격을 공백 개수로 채우면 한글 공백이 더 넓어 넘친다.
// ③ 보기 박스 배경 어긋남 — 줄이 접히거나 줄 높이가 미리보기와 다르면 본문이 밀린다.
// ④ 2쪽 본문이 중간부터 — 구역 위 여백을 1쪽 머리 아래 본문 시작점으로 잡았다.

/** writer.units 와 같은 환산 — CSS px(96dpi) → HWPUNIT(1/7200 inch). */
const hu = (px: number) => Math.round(px * 75);

const BODY = { x: 50, y: 150, w: 694, h: 900, columns: 1 as const, gap: 0 };
const text = (
  x: number,
  y: number,
  w: number,
  value: string,
  fontSize = 14,
) => ({
  type: "text" as const,
  x,
  y,
  w,
  h: 20,
  text: value,
  fontSize,
});
const equation = (x: number, y: number, w: number, latex: string) => ({
  type: "equation" as const,
  x,
  y,
  w,
  h: 24,
  latex,
  fontSize: 14,
});

async function build(objects: unknown[], body: object = BODY) {
  const parts = await buildHwpxParts(
    HwpxPayloadSchema.parse({ title: "배치 시험", pages: [{ body, objects }] }),
  );
  const parse = (xml: string) =>
    new DOMParser().parseFromString(xml, "application/xml");
  const section = parse(parts["Contents/section0.xml"]);
  const header = parse(parts["Contents/header.xml"]);
  const all = (root: Document | Element, name: string) => [
    ...root.getElementsByTagName(name),
  ];
  // 본문 줄은 구역의 직계 문단이다(첫 문단은 구역 설정 + 떠 있는 머리글 표).
  const bodyParagraphs = [...section.documentElement.children]
    .filter((node) => node.tagName === "hp:p")
    .slice(1);
  const paragraphWith = (needle: string) => {
    const found = bodyParagraphs.find((p) =>
      all(p, "hp:t").some((t) => t.textContent?.includes(needle)),
    );
    if (!found) throw new Error(`본문에 «${needle}» 문단이 없다`);
    return found;
  };
  const paraPr = (p: Element) => {
    const id = p.getAttribute("paraPrIDRef");
    const found = all(header, "hh:paraPr").find(
      (n) => n.getAttribute("id") === id,
    );
    if (!found) throw new Error(`paraPr ${id} 가 header 에 없다`);
    return found;
  };
  return { section, header, all, bodyParagraphs, paragraphWith, paraPr };
}

describe("HWPX 배치 — 한글에서 미리보기와 같게 (mathg-gen 144ac19·b289619)", () => {
  it("① 수식 상자 폭은 KaTeX 폭이 아니라 한글이 잰 폭이다", async () => {
    // 기대값은 **한글(COM)이 직접 잰 폭**이다 — mathg-gen 세션이 한글 2022 로 잰
    // 10.5pt(= 미리보기 14px) 측정 파일(.checks.local/eqfit/sweep_10.5.json)에서 옮겼다.
    // eqsize.py 의 출력을 옮겨 적은 값이 아니다.
    const hancom: Array<[string, number]> = [
      ["\\frac{1}{2}", 1050],
      ["x^2+1", 2682],
      ["a+\\frac{1}{2}", 2694],
    ];
    // KaTeX 가 준 폭(w)은 일부러 한글 폭과 다르게 — 옛 writer 는 이것을 그대로 썼다.
    const { all, section } = await build([
      equation(60, 200, 10, hancom[0][0]),
      equation(60, 240, 38, hancom[1][0]),
      equation(60, 280, 42, hancom[2][0]),
      // 같은 식이 KaTeX 폭만 다르게 와도 한글 상자는 같다.
      equation(60, 320, 25, hancom[0][0]),
    ]);
    const equations = all(section, "hp:equation").map((node) => {
      const [sz] = all(node, "hp:sz");
      const [margin] = all(node, "hp:outMargin");
      return {
        script: all(node, "hp:script")[0]?.textContent,
        width: Number(sz.getAttribute("width")),
        outMargin: [margin.getAttribute("left"), margin.getAttribute("right")],
      };
    });
    expect(equations.map((e) => e.script)).toEqual([
      "{1} over {2}",
      "x^{2}+1",
      "a+{1} over {2}",
      "{1} over {2}",
    ]);
    expect(equations.map((e) => e.width)).toEqual([
      hancom[0][1],
      hancom[1][1],
      hancom[2][1],
      hancom[0][1],
    ]);
    // 줄 안 수식의 좌우 바깥 여백은 한글이 스스로 넣는 인라인 수식 여백(56)과 같다.
    for (const e of equations) expect(e.outMargin).toEqual(["56", "56"]);
  });

  it("② 5지선다의 넓은 간격은 공백이 아니라 미리보기 위치의 탭이다", async () => {
    const { all, header, paragraphWith, paraPr } = await build([
      text(60, 300, 28, "① 3"),
      text(280, 300, 28, "② 5"),
      text(500, 300, 28, "③ 7"),
    ]);
    const row = paragraphWith("③");
    // ③ 이 따로 떨어지지 않고 ①② 와 한 문단이다.
    expect(all(row, "hp:t").map((t) => t.textContent)).toEqual(
      expect.arrayContaining(["① 3", "② 5", "③ 7"]),
    );
    expect(all(row, "hp:tab")).toHaveLength(2);
    expect(
      all(row, "hp:t").filter((t) => /^\s+$/.test(t.textContent ?? "")),
    ).toEqual([]);
    // 탭 위치는 줄 시작에서 ②·③ 의 미리보기 x 까지(1.2 판독기는 반 HWPUNIT 로 읽는다).
    const tabId = paraPr(row).getAttribute("tabPrIDRef");
    const tabPr = all(header, "hh:tabPr").find(
      (n) => n.getAttribute("id") === tabId,
    );
    expect(tabPr).toBeDefined();
    expect(
      all(tabPr!, "hh:tabItem").map((n) => Number(n.getAttribute("pos"))),
    ).toEqual([hu(280 - 60) * 2, hu(500 - 60) * 2]);
  });

  it("③ 본문 한 줄은 한글에서도 한 줄 · 미리보기 줄 높이 그대로다", async () => {
    const { all, bodyParagraphs, paragraphWith, paraPr } = await build([
      { type: "rect", x: 50, y: 290, w: 694, h: 60, color: "#eeeeee" },
      text(60, 300, 28, "① 3"),
      text(280, 300, 28, "② 5"),
      text(500, 300, 28, "③ 7"),
      text(60, 326, 28, "④ 9"),
      text(280, 326, 28, "⑤ 11"),
    ]);
    expect(bodyParagraphs.length).toBeGreaterThanOrEqual(2);
    for (const p of bodyParagraphs) {
      const style = paraPr(p);
      // 한글 글자가 조금 넓어도 다음 줄로 접지 않는다(접히면 뒤 줄이 모두 밀려
      // 절대 위치로 놓인 박스 배경과 어긋난다).
      expect(
        all(style, "hh:breakSetting").map((n) => n.getAttribute("lineWrap")),
      ).toEqual(["SQUEEZE"]);
      const spacing = all(style, "hh:lineSpacing");
      expect(spacing.length).toBeGreaterThan(0);
      for (const n of spacing) expect(n.getAttribute("type")).toBe("FIXED");
    }
    // 줄 높이 = 미리보기 줄 높이(20px, 반 HWPUNIT).
    for (const n of all(paraPr(paragraphWith("③")), "hh:lineSpacing"))
      expect(Number(n.getAttribute("value"))).toBe(hu(20) * 2);
  });

  it("④ 구역 위 여백은 1쪽 머리 아래가 아니라 쪽의 내용 시작점이다", async () => {
    // 1쪽 머리(시험 제목) y=40, 본문 영역 y=150, 첫 본문 줄 y=160.
    const { all, section, paragraphWith, paraPr } = await build(
      [
        text(50, 40, 200, "제1회 확인테스트", 20),
        text(60, 160, 120, "1. 다음을 계산하시오."),
        text(60, 190, 120, "2. 다음을 계산하시오."),
      ],
      { ...BODY, columns: 2, gap: 26 },
    );
    const margin = all(section, "hp:margin")[0];
    // 넘친 2쪽도 이 여백에서 시작한다 — 본문 y(150)로 잡으면 2쪽이 중간부터다.
    expect(Number(margin.getAttribute("top"))).toBe(hu(40));
    // 대신 1쪽의 첫 본문 줄만 문단 위 간격으로 미리보기 y 까지 내려간다.
    // (writer 는 첫 단의 커서를 위 여백 + 1px 에서 시작한다.)
    const prev = all(paraPr(paragraphWith("1. 다음")), "hc:prev")[0];
    expect(Number(prev.getAttribute("value"))).toBe(hu(160 - 40 - 1) * 2);
  });
});
