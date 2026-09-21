import { describe, expect, it } from "vitest";
import { buildHwpxParts, HwpxPayloadSchema } from "@/lib/export/hwpxServer";

/**
 * 🔴 RED → 🟢 — HWPX 의 수식 상자 **높이·기준선**도 한글이 잰 값이다 (원장님 2026-09-21).
 *
 * 원장님: «한글 내보내기할때 줄간격이 왜 이렇게 타이트하지? 보통은 분수가 들어가거나 줄이 수식으로 인해 넘치게되면
 * 알아서 줄간격 조정되던데 … com 이용해서 설치된 hwp로 내보내면 아주 잘되던데 hwpx에서 문제가 되는 부분이 있네.»
 * 화면: 분수 `1/7` 의 분모가 아래 줄 글자를 덮었다.
 *
 * 원인 둘이 겹친다.
 *  ⑴ 한글은 HWPX 를 열 때 수식 상자를 **다시 재지 않는다** — `<hp:sz>` 와 `baseLine` 을 그대로 쓰고, 수식은 상자
 *     위에서부터 제 크기로 그린다. 폭은 한글 값으로 맞춰 놨는데(트랙 HWPX 이식) **높이·기준선은 KaTeX 값**이었다.
 *     한글의 분수는 2.30줄(10.5pt 에서 2415), KaTeX 는 2.0줄쯤이다 — 4px 가 상자 밖 아래로 나간다.
 *  ⑵ writer 는 미리보기 한 줄을 한 문단으로 옮기며 줄 높이를 **고정값**으로 박는다(보기 상자 배경이 안 밀리게).
 *     COM 으로 만든 HWP 는 «글자에 따라» 라 한글이 스스로 줄을 늘리지만, 고정값은 안 늘어난다.
 *  → 줄의 고정 높이를 **한글이 그릴 높이**로 잡으면 된다. 기준선 자리는 미리보기 그대로 둔다.
 *
 * 기대값은 **한글(COM)이 직접 잰 값**이다 — mathg-gen `.checks.local/eqfit/sweep_10.5.json`(10.5pt = 미리보기 14px).
 * `eqheight.py` 의 출력을 옮겨 적은 값이 아니다. 한글이 그 XML 을 실제로 어떻게 그리는지는 이 시험이 못 본다(규칙 9).
 */
const hu = (px: number) => Math.round(px * 75);
const BODY = { x: 50, y: 150, w: 694, h: 900, columns: 1 as const, gap: 0 };

const text = (x: number, y: number, w: number, value: string) => ({
  type: "text" as const,
  x,
  y,
  w,
  h: 20,
  text: value,
  fontSize: 14,
});
/** KaTeX 가 준 상자(y·h·baseline) 그대로 — 한글 값과 **일부러 다르다**. */
const equation = (
  x: number,
  y: number,
  h: number,
  baseline: number,
  latex: string,
) => ({
  type: "equation" as const,
  x,
  y,
  w: 12,
  h,
  baseline,
  latex,
  fontSize: 14,
});

async function build(objects: unknown[]) {
  const parts = await buildHwpxParts(
    HwpxPayloadSchema.parse({
      title: "수식 높이",
      pages: [{ body: BODY, objects }],
    }),
  );
  const parse = (xml: string) =>
    new DOMParser().parseFromString(xml, "application/xml");
  const section = parse(parts["Contents/section0.xml"]);
  const header = parse(parts["Contents/header.xml"]);
  const all = (root: Document | Element, name: string) => [
    ...root.getElementsByTagName(name),
  ];
  const rows = [...section.documentElement.children]
    .filter((node) => node.tagName === "hp:p")
    .slice(1)
    .map((p) => {
      const style = all(header, "hh:paraPr").find(
        (n) => n.getAttribute("id") === p.getAttribute("paraPrIDRef"),
      )!;
      const spacing = all(style, "hh:lineSpacing")[0]!;
      return {
        text: all(p, "hp:t")
          .map((t) => t.textContent)
          .join(""),
        // 1.2 판독기는 문단 여백·고정 줄 높이를 반 HWPUNIT 로 읽는다.
        before: Number(all(style, "hc:prev")[0]!.getAttribute("value")) / 2,
        height: Number(spacing.getAttribute("value")) / 2,
        fixed: spacing.getAttribute("type"),
        equations: all(p, "hp:equation").map((node) => ({
          script: all(node, "hp:script")[0]?.textContent,
          height: Number(all(node, "hp:sz")[0]!.getAttribute("height")),
          baseLine: Number(node.getAttribute("baseLine")),
        })),
      };
    });
  return { rows };
}

describe("HWPX 수식 상자 — 높이·기준선은 한글이 잰 값", () => {
  it("🔴 분수·첨자·루트: KaTeX 상자가 아니라 한글 실측(10.5pt)", async () => {
    // [latex, 한글 스크립트, 한글 높이, 한글 기준선 %] — sweep_10.5.json
    const hancom: Array<[string, string, number, number]> = [
      ["\\frac{1}{2}", "{1} over {2}", 2415, 66],
      ["x^{2}", "x^{2}", 1275, 88],
      ["x_{1}", "x_{1}", 1282, 70],
      ["\\sqrt{2}", "sqrt {2}", 1208, 87],
      ["a", "a", 1050, 85],
    ];
    const { rows } = await build(
      hancom.map(([latex], index) =>
        // KaTeX 상자: 높이 24px · 기준선 85% — 어느 식이든 같게 줘서 «옮겨 적기»를 드러낸다.
        equation(60, 200 + index * 60, 24, 200 + index * 60 + 20, latex),
      ),
    );
    const found = rows.flatMap((row) => row.equations);
    expect(found.map((e) => e.script)).toEqual(hancom.map((h) => h[1]));
    found.forEach((e, index) => {
      const [, script, height, baseLine] = hancom[index]!;
      // 픽셀 반올림 · 정수 % 라 1px(75)·2% 안쪽이면 같은 값이다.
      expect(Math.abs(e.height - height), `${script} 높이`).toBeLessThanOrEqual(
        40,
      );
      expect(
        Math.abs(e.baseLine - baseLine),
        `${script} 기준선`,
      ).toBeLessThanOrEqual(2);
    });
  });

  it("🔴 분수가 든 줄의 고정 높이는 한글이 그릴 높이 이상이다 — 아래 줄을 덮지 않는다", async () => {
    // 원장님 화면 그대로: 글 줄 셋, 가운데 줄에 분수. 미리보기에서 분수 상자는 28px(KaTeX)이고
    // 아래 줄과 2px 떨어져 있다 — 한글의 분수(32.2px)는 그 틈보다 크다.
    const baseline = 246;
    const { rows } = await build([
      text(60, 200, 300, "머니에서 임의로 2개의 공을 동시에 꺼낼 때, 꺼낸"),
      text(60, 230, 200, "2개의 공이 모두 검은공일 확률은"),
      equation(264, 228, 28, baseline, "\\frac{1}{7}"),
      text(280, 230, 100, "이다. 이 주머니"),
      text(60, 258, 300, "에서 임의로 2개의 공을 동시에 꺼낼 때, 꺼낸 2개"),
    ]);
    const [, middle, below] = rows;
    expect(middle!.equations).toHaveLength(1);
    expect(middle!.fixed).toBe("FIXED");
    // ⑴ 줄 높이가 그 줄의 수식 상자보다 작지 않다.
    expect(middle!.height).toBeGreaterThanOrEqual(
      middle!.equations[0]!.height - 1,
    );
    // ⑵ 그 줄은 미리보기(28px 상자 · 위 글 줄과 같은 줄)보다 **높다** — 옛 writer 는 hu(28) 이었다.
    expect(middle!.height).toBeGreaterThan(hu(30));
    // ⑶ 실제로 쌓이는 자리로 잰다(위 간격 + 줄 높이) — 아래 줄의 위 끝이 분수 **상자의 바닥** 아래이고,
    //    밀린 양은 한글 분수가 미리보기보다 큰 만큼(몇 px)을 넘지 않는다.
    //    🔴 처음엔 여기서 `before >= 0` 을 단정했는데 writer 가 `max(0, …)` 로 자르는 값이라 **실패할 수 없는 단정**이었다
    //    (그록 적대적 리뷰 2026-09-21 이 짚었다).
    let cursor = 0;
    const tops = rows.map((row) => {
      const top = cursor + row.before;
      cursor = top + row.height;
      return top;
    });
    expect(tops[2]!).toBeGreaterThanOrEqual(
      tops[1]! + middle!.equations[0]!.height - 1,
    );
    const drift = tops[2]! - tops[0]! - hu(258 - 200);
    expect(drift).toBeGreaterThanOrEqual(0);
    expect(drift).toBeLessThanOrEqual(hu(6));
    expect(below!.text).toContain("에서 임의로");
  });

  it("🔴 밀린 만큼은 다음 빈틈에서 되찾는다 — 그 아래 줄들은 미리보기 y 로 돌아온다", async () => {
    const { rows } = await build([
      text(60, 200, 300, "첫 줄"),
      equation(60, 222, 28, 240, "\\frac{1}{7}"),
      text(80, 226, 100, "둘째 줄"),
      // 셋째 줄은 분수 줄 바로 아래(틈 2px) — 한글 분수가 그 틈보다 커서 밀린다.
      text(60, 252, 300, "셋째 줄"),
      // 넷째 줄은 한참 아래(틈 48px) — 여기서 되찾는다.
      text(60, 320, 300, "넷째 줄"),
    ]);
    // 본문 위에서부터 실제 y 를 쌓는다: 위 간격 + 줄 높이.
    let cursor = 0;
    const tops = rows.map((row) => {
      const top = cursor + row.before;
      cursor = top + row.height;
      return top;
    });
    const first = tops[0]!;
    // 넷째 줄은 첫 줄에서 미리보기 간격(320 − 200 = 120px)만큼 아래다 — 밀림이 쌓여 있지 않다.
    expect(Math.abs(tops[3]! - first - hu(120))).toBeLessThanOrEqual(2);
    // 셋째 줄은 분수 줄의 바닥보다 위에 있지 않다.
    expect(tops[2]!).toBeGreaterThanOrEqual(tops[1]! + rows[1]!.height);
  });

  it("글만 든 줄은 그대로다 — 줄 높이 20px, 미리보기 간격", async () => {
    const { rows } = await build([
      text(60, 200, 300, "첫 줄"),
      text(60, 230, 300, "둘째 줄"),
    ]);
    expect(rows.map((row) => row.height)).toEqual([hu(20), hu(20)]);
    expect(rows[1]!.before).toBe(hu(10));
  });
});

/**
 * 수식 상자를 한글 값으로 바꾸면 위쪽이 올라가고 아래쪽이 내려간다(단순 분수 2.8px · 겹분수 7px 남짓). «본문 안인가»를
 * 그 상자로 재면 본문 첫 줄·마지막 줄의 큰 식이 경계(±3px)를 넘어 **머리글(떠 있는 표)** 로 빠진다 — 분류는 미리보기
 * 상자로 해야 한다. 단순 분수는 0.25px 차이로 간신히 통과해서, 처음 쓴 시험은 초록이었다(겹분수로 바꿔 빨강을 봤다).
 */
describe("본문 경계의 분수 — 머리글로 빠지지 않는다", () => {
  const floating = (parts: Record<string, string>) => {
    const section = new DOMParser().parseFromString(
      parts["Contents/section0.xml"]!,
      "application/xml",
    );
    return [...section.getElementsByTagName("hp:tbl")].flatMap((table) =>
      [...table.getElementsByTagName("hp:script")].map((s) => s.textContent),
    );
  };
  it.each([
    [
      "첫 줄 — 겹분수의 위가 본문 위 끝에 닿아 있다",
      BODY.y,
      BODY.y + 32,
      "\\frac{\\frac{1}{2}}{3}",
      "{{1} over {2}} over {3}",
    ],
    [
      "마지막 줄 — 겹분수의 아래가 본문 아래 끝에 닿아 있다",
      BODY.y + BODY.h - 46,
      BODY.y + BODY.h - 46 + 18,
      "\\frac{3}{\\frac{1}{2}}",
      "{3} over {{1} over {2}}",
    ],
  ])("🔴 %s", async (_name, y, baseline, latex, script) => {
    const parts = await buildHwpxParts(
      HwpxPayloadSchema.parse({
        title: "경계",
        pages: [
          {
            body: BODY,
            objects: [
              text(60, y + 4, 200, "확률은"),
              equation(264, y, 46, baseline, latex),
            ],
          },
        ],
      }),
    );
    expect(floating(parts)).toEqual([]);
    expect(parts["Contents/section0.xml"]).toContain(script);
  });
});
