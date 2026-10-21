// @vitest-environment node
/**
 * 그림 자리 `[그림:n]` 이 **실제 Chrome 지면**에서 자와 같게 서는가 (D-164 ③④ · 2026-10-21 합의).
 *
 * 인쇄 매체 · 자습 지면 문항 열(363.5px)에 제품 렌더(`ProblemContent`)를 그대로 띄운다(`helpers/paperChrome.ts`).
 *   · 묶음 높이(`mt-3` 포함)가 넘침 자(`estimateFigureSlotGroupPx`)와 같다 — 자가 짧으면 놓침이 겹친 시험지로 간다
 *   · 캡션은 제 그림 **바로 아래** 가운데에 선다
 *   · 묶음과 칸이 인쇄에서 `break-inside: avoid` — 그림과 캡션이 쪽 사이에서 갈리지 않는다
 * 그림은 크기를 아는 회색 PNG 다(원본 픽셀 치수 · 지면 mm 를 같이 넘긴다 — 제품 인쇄 경로가 넘기는 값).
 */
import { crc32, deflateSync } from "node:zlib";

import { chromium, type Browser } from "@playwright/test";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ProblemContent } from "@/components/math/ProblemContent";
import { parseFigureDimensions } from "@/lib/figurePrintSize";
import { slottedProblem } from "@/lib/problem/figureSlots";
import {
  estimateFigureSlotGroupPx,
  estimateProblemPx,
  JASEUP_RULER,
} from "@/lib/printOverflow";

import { writeProbe } from "../../../scripts/qa/paperProbe";
import { assertPaperFonts, paperDocument } from "../helpers/paperChrome";

/** 단색 회색 PNG — 크기만 정확하면 된다. */
function grayPng(width: number, height: number): string {
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const out = Buffer.alloc(body.length + 8);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(crc32(body), body.length + 4);
    return out;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // 8비트
  header[9] = 0; // 회색조
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width, 0xcc)]);
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk(
      "IDAT",
      deflateSync(Buffer.concat(Array.from({ length: height }, () => row))),
    ),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return `data:image/png;base64,${png.toString("base64")}`;
}

interface SlotCase {
  id: string;
  content: string;
  /** 그림마다 [원본 px 폭, 원본 px 높이, 지면 mm] */
  figures: [number, number, number][];
}

const CASES: SlotCase[] = [
  {
    id: "two-captions",
    content:
      "다음 그림에서 색칠한 부분의 넓이를 구하시오.\n[그림:1] ⑴ (　　　　)\n[그림:2] ⑵ (　　　　)",
    figures: [
      [400, 300, 40],
      [400, 260, 40],
    ],
  },
  {
    id: "wide-caption",
    content:
      "다음 그래프를 보고 물음에 답하시오.\n[그림:1] ⑴ 이 그래프의 기울기를 구하시오. (　　　　)",
    figures: [[600, 300, 65]],
  },
  {
    id: "wrap-three",
    content:
      "다음 도형의 둘레를 각각 구하시오.\n[그림:1] ⑴ (　　　)\n[그림:2] ⑵ (　　　)\n[그림:3] ⑶ (　　　)",
    figures: [
      [500, 400, 50],
      [500, 300, 50],
      [500, 500, 50],
    ],
  },
  {
    id: "between-text",
    content:
      "다음은 상용로그표의 일부이다.\n[그림:1]\n이 표를 이용하여 $\\log 2.13$의 값을 구하시오.",
    figures: [[700, 220, 60]],
  },
];

function caseHtml(c: SlotCase): string {
  const body = renderToStaticMarkup(
    <ProblemContent
      content={c.content}
      figureUrls={c.figures.map(([w, h]) => grayPng(w, h))}
      figureDims={c.figures.flatMap(([w, h]) => [w, h])}
      figureSourceMm={c.figures.map(([, , mm]) => mm)}
      className="problemText"
      deferFigures={false}
    />,
  );
  // 자습 지면 문항 열 폭 그대로(`JASEUP_MEASURED_PX.problemColumn`)
  return `<div data-case="${c.id}" style="width:${JASEUP_RULER.problemColumn}px;margin:0 0 40px 8px">${body}</div>`;
}

/** 자가 세는 묶음 높이 — 제품과 같은 차례로 읽은 자리에, 제품과 같은 치수를 넘긴다. */
function expectedGroupsPx(c: SlotCase): number[] {
  const dims = parseFigureDimensions(
    c.figures.length,
    c.figures.flatMap(([w, h]) => [w, h]),
    c.figures.map(([, , mm]) => mm),
  );
  const { slots } = slottedProblem(
    c.content,
    c.figures.length,
    undefined,
    true,
  );
  return slots.parts.flatMap((part) =>
    part.kind === "figures"
      ? [
          estimateFigureSlotGroupPx(
            part.items.map((item) => ({
              figure: dims[item.index] ?? null,
              caption: item.caption,
            })),
          ),
        ]
      : [],
  );
}

const MEASURE = `(() => [...document.querySelectorAll("[data-case]")].map((box) => ({
  id: box.dataset.case,
  groups: [...box.querySelectorAll("[data-figure-slots]")].map((g) => {
    const s = getComputedStyle(g);
    return {
      height: g.getBoundingClientRect().height + parseFloat(s.marginTop),
      marginTop: s.marginTop,
      breakInside: s.breakInside,
      items: [...g.querySelectorAll("[data-figure-slot]")].map((item) => {
        const img = item.querySelector("img").getBoundingClientRect();
        const cap = item.querySelector("[data-figure-caption]");
        const c = cap ? cap.getBoundingClientRect() : null;
        return {
          breakInside: getComputedStyle(item).breakInside,
          imgBottom: img.bottom, imgCenter: (img.left + img.right) / 2, imgLoaded: item.querySelector("img").complete && item.querySelector("img").naturalWidth > 0,
          capTop: c ? c.top : null, capCenter: c ? (c.left + c.right) / 2 : null,
        };
      }),
    };
  }),
})))()`;

type Measured = {
  id: string;
  groups: {
    height: number;
    marginTop: string;
    breakInside: string;
    items: {
      breakInside: string;
      imgBottom: number;
      imgCenter: number;
      imgLoaded: boolean;
      capTop: number | null;
      capCenter: number | null;
    }[];
  }[];
};

let browser: Browser;
beforeAll(async () => {
  browser = await chromium.launch({ headless: true });
}, 180_000);
afterAll(async () => {
  await browser?.close();
}, 60_000);

describe("그림 자리는 Chrome 인쇄 지면에서 자와 같게 선다 (D-164 ③④)", () => {
  it("묶음 높이 = 자 · 캡션은 제 그림 바로 아래 가운데 · 묶음과 칸은 쪽 사이에서 안 갈린다", async () => {
    const page = await browser.newPage({
      viewport: { width: 900, height: 1200 },
    });
    await page.emulateMedia({ media: "print" });
    await page.goto(
      writeProbe(
        "figure-slots.html",
        await paperDocument(CASES.map(caseHtml).join("\n")),
      ),
    );
    await assertPaperFonts(page, "[data-case] .problemText p");
    const measured = (await page.evaluate(MEASURE)) as Measured[];
    await page.close();

    for (const c of CASES) {
      const got = measured.find((m) => m.id === c.id)!;
      const want = expectedGroupsPx(c);
      expect(got.groups.length, `${c.id} 묶음 수`).toBe(want.length);
      got.groups.forEach((group, g) => {
        expect(group.marginTop, `${c.id} 묶음 위 여백`).toBe("12px");
        expect(group.breakInside, `${c.id} 묶음이 쪽 사이에서 안 갈린다`).toBe(
          "avoid",
        );
        // 자와 지면이 1px 안쪽 — 넘으면 자의 모형(줄 채우기 · 캡션 줄)이 지면과 다르다
        expect(
          Math.abs(group.height - want[g]!),
          `${c.id} 묶음 ${g + 1} 지면 ${group.height} · 자 ${want[g]}`,
        ).toBeLessThan(1);
        for (const item of group.items) {
          expect(item.imgLoaded, `${c.id} 그림이 실렸다`).toBe(true);
          expect(item.breakInside, `${c.id} 칸이 쪽 사이에서 안 갈린다`).toBe(
            "avoid",
          );
          if (item.capTop === null) continue;
          expect(
            item.capTop,
            `${c.id} 캡션이 그림 아래`,
          ).toBeGreaterThanOrEqual(item.imgBottom - 0.5);
          expect(
            item.capTop - item.imgBottom,
            `${c.id} 캡션이 그림 바로 아래(mt-1)`,
          ).toBeLessThan(6);
          expect(
            Math.abs(item.capCenter! - item.imgCenter),
            `${c.id} 캡션이 그림 가운데`,
          ).toBeLessThan(1);
        }
      });
    }
  }, 300_000);

  /**
   * 실제 조각 나눔 — 묶음이 «쪽» 끝에 걸리면 통째로 다음으로 넘어가는가(2026-10-21 Codex 검토: 계산된 `break-inside` 만으로는
   * 안 갈린다는 증명이 아니다). Chrome 은 다단(column) 나눔에 인쇄와 같은 조각 나눔을 쓴다 — 묶음이 첫 단 끝에 걸리게 놓고,
   * 그림과 캡션이 같은 단에 있는지 본다. 대조군(`print:break-inside-avoid` 를 걷은 것)은 **실제로 갈려야** 시험이 유효하다.
   * (제품의 쪽 나눔은 문항 단위다 — 자습 지면은 문항 칸 · 통합 인쇄는 문항째 실측 배치(`useMeasuredPages`). 이것은 그 안의 덤이다.)
   */
  it("묶음이 쪽 끝에 걸리면 통째로 다음으로 — 그림과 캡션이 같은 쪽에 남는다(대조군은 갈린다)", async () => {
    const column = JASEUP_RULER.problemColumn;
    const c = CASES.find((one) => one.id === "two-captions")!;
    const html = `<div data-flow style="columns:2;column-gap:0;column-fill:auto;width:${column * 2}px;height:400px;margin:8px">
      <div data-filler style="height:200px"></div>${caseHtml(c).replace(/margin:0 0 40px 8px/, "margin:0")}</div>`;
    const page = await browser.newPage({
      viewport: { width: 900, height: 1200 },
    });
    await page.emulateMedia({ media: "print" });
    await page.goto(
      writeProbe("figure-slots-flow.html", await paperDocument(html)),
    );
    await assertPaperFonts(page, "[data-case] .problemText p");
    // 앞 채움을 2px 씩 늘려 묶음을 첫 단 끝으로 민다 — 그림만 들어가고 캡션은 안 들어가는 높이가 어딘가 있다
    const SWEEP = (strip: boolean) => `(() => {
      document.querySelectorAll("[data-figure-slots], [data-figure-slot]").forEach((el) => el.classList.toggle("print:break-inside-avoid", ${!strip}));
      const flow = document.querySelector("[data-flow]");
      const filler = document.querySelector("[data-filler]");
      const out = [];
      for (let h = 120; h <= 360; h += 2) {
        filler.style.height = h + "px";
        const left = flow.getBoundingClientRect().left;
        const col = (rect) => Math.floor((rect.left - left) / ${column});
        const items = [...document.querySelectorAll("[data-figure-slot]")].map((item) => [
          col(item.querySelector("img").getBoundingClientRect()),
          col(item.querySelector("[data-figure-caption]").getBoundingClientRect()),
        ]);
        out.push({ h, split: items.some(([image, caption]) => image !== caption), columns: [...new Set(items.flat())].length });
      }
      return out;
    })()`;
    type Row = { h: number; split: boolean; columns: number };
    const control = (await page.evaluate(SWEEP(true))) as Row[];
    const product = (await page.evaluate(SWEEP(false))) as Row[];
    await page.close();
    // 대조군: 걷으면 어떤 높이에서는 캡션이 그림과 다른 단으로 간다(쪽 끝에서 갈린다) — 안 그러면 이 시험은 아무것도 못 문다
    expect(
      control.filter((row) => row.split).length,
      "대조군이 갈린 높이 수",
    ).toBeGreaterThan(0);
    // 제품: 어느 높이에서도 그림과 캡션이 한 단 · 묶음 전체가 한 단
    expect(
      product.filter((row) => row.split || row.columns > 1).map((row) => row.h),
      "제품이 갈린 높이",
    ).toEqual([]);
  }, 300_000);

  it("문항 전체 높이 — 자(`estimateProblemPx`)와 지면이 한 줄 안쪽(자리 줄을 글로 두 번 세지 않는다)", async () => {
    const page = await browser.newPage({
      viewport: { width: 900, height: 1200 },
    });
    await page.emulateMedia({ media: "print" });
    await page.goto(
      writeProbe(
        "figure-slots-whole.html",
        await paperDocument(CASES.map(caseHtml).join("\n")),
      ),
    );
    await assertPaperFonts(page, "[data-case] .problemText p");
    const heights = (await page.evaluate(
      `Object.fromEntries([...document.querySelectorAll("[data-case]")].map((box) => [box.dataset.case, box.firstElementChild.getBoundingClientRect().height]))`,
    )) as Record<string, number>;
    await page.close();
    for (const c of CASES) {
      const dims = parseFigureDimensions(
        c.figures.length,
        c.figures.flatMap(([w, h]) => [w, h]),
        c.figures.map(([, , mm]) => mm),
      );
      // 자는 문항번호 · 정답란(`fixedChrome`)까지 센다 — 이 상자에는 본문만 있다
      const ruler =
        estimateProblemPx(c.content, dims, null, JASEUP_RULER) -
        JASEUP_RULER.fixedChrome;
      expect(
        Math.abs(ruler - heights[c.id]!),
        `${c.id} 지면 ${heights[c.id]} · 자 ${ruler}`,
      ).toBeLessThanOrEqual(JASEUP_RULER.line);
    }
  }, 300_000);
});
