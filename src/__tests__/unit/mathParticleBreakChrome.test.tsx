// @vitest-environment node
/**
 * 식 뒤 조사가 **실제 Chrome 에서** 식과 한 줄에 서는가 (D-164 ⑴ · 2026-10-21 리드 · Codex 합의 A).
 *
 * jsdom 은 줄을 안 나눈다 — 그래서 제품 CSS(KaTeX · Tailwind · `TestPrint.module.css`)와 지면 글꼴
 * (`public/fonts` 의 명조, KaTeX 글꼴)을 그대로 실은 Chromium 에서 폭을 1px 씩 바꿔 가며 잰다.
 *
 * 판정 — 식의 **마지막 조각**(`.katex-base` 의 끝 상자)과 조사 첫 글자(`Range`)를 견준다:
 *   · 한 줄: 조사 첫 글자가 식 끝 바로 오른쪽에 선다
 *   · 갈림: 조사 첫 글자가 식 끝보다 왼쪽(다음 줄 머리)에 선다 — 높이를 견주지 않는다(분수는 줄보다 높다)
 *
 * 팔 셋 — 같은 제품 마크업에서:
 *   · 대조군: U+2060 을 지운 것(2026-10-20 의 지면). **실제로 갈려야 시험이 유효하다** — 어떤 폭에서도 안 갈리면
 *     «제품이 안 갈린다»는 아무것도 증명하지 못한다(2026-08-20 «양성만 대면 지어냄이 구조적으로 0»).
 *   · 제품: 한 번도 안 갈려야 한다.
 *   · 변이: 긴 식의 «마지막 조각 nowrap 상자»만 걷은 것. Chrome 은 원자 인라인 뒤 줄바꿈을 U+2060 하나로 막지 않는다
 *     (2026-10-21 실측 — 최소 HTML 에서도 같다). 그래서 긴 식은 **다시 갈려야** 한다 — 누가 «WJ 면 된다»고
 *     상자를 걷으면 이 팔이 운다.
 *
 * 🔴 글꼴이 안 실리면 줄바꿈 자리가 통째로 딴 지면 것이 된다 — 적재를 확인한 뒤에만 잰다(`helpers/paperChrome.ts`).
 */
import { chromium, type Browser, type Page } from "@playwright/test";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ProblemContent } from "@/components/math/ProblemContent";
import { MATH_PARTICLE_JOINER } from "@/lib/math/mathParticles";

import { writeProbe } from "../../../scripts/qa/paperProbe";
import { assertPaperFonts, paperDocument } from "../helpers/paperChrome";

/** 식 꼴 다섯 — 짧은 식 · 분수 · 긴 식(안에서 갈리는 식) · 서술격 · 겹조사. 앞 글은 빈칸이 있어 식 앞에서 바꿀 자리가 있다. */
const CASES = [
  {
    id: "short",
    content: "한 변의 길이가 같은 두 정사각형에서 $x$의 값을 구하시오.",
  },
  {
    id: "frac",
    content: "넓이가 같은 두 도형에서 $\\frac{3}{4}$의 값을 구하시오.",
  },
  {
    id: "long",
    content:
      "다음 식에서 $y=-2(x^{2}+2x+2)^{2}+8(x^{2}+2x+2)+k$이므로 상수 $k$의 값을 구하시오.",
  },
  { id: "copula", content: "따라서 구하는 넓이는 모두 $125$입니다." },
  {
    id: "compound",
    content: "두 점 사이의 거리는 $\\overline{AB}$에서는 같다.",
  },
] as const;

/** 지면 셋 — 자습 지면 · 통합 인쇄(`ProblemBody` 의 인라인 스타일) · 3단계(`keep-all`)에서도 깨지지 않는지. */
const SURFACES = [
  { id: "paper", className: "problemText", style: "" },
  {
    id: "unified",
    className: "",
    style:
      "font-family:var(--paper-font-serif);font-size:13px;line-height:1.85;overflow-wrap:anywhere",
  },
  {
    id: "paper-keepall",
    className: "problemText",
    style: "word-break:keep-all",
  },
] as const;

const MEDIA = ["screen", "print"] as const;
type Arm = "control" | "product" | "unpinned";

function caseHtml(arm: Arm): string {
  const blocks: string[] = [];
  for (const surface of SURFACES)
    for (const c of CASES) {
      let body = renderToStaticMarkup(
        <ProblemContent
          content={c.content}
          className={surface.className}
          deferFigures={false}
        />,
      );
      expect(body, `${c.id} 의 제품 렌더에 WJ 가 있다`).toContain(
        MATH_PARTICLE_JOINER,
      );
      if (arm === "control") body = body.replaceAll(MATH_PARTICLE_JOINER, "");
      blocks.push(
        `<div data-case="${surface.id}:${c.id}" style="${surface.style}">${body}</div>`,
      );
    }
  return blocks.join("\n");
}

/** 변이 — 긴 식의 마지막 조각을 감싼 nowrap 상자만 걷는다(조각과 U+2060 은 그대로). */
const UNPIN = `document.querySelectorAll(".katex-html > span[style*=nowrap]").forEach((pin) => pin.replaceWith(...pin.childNodes))`;

const MIN_WIDTH = 140;
const MAX_WIDTH = 460;

/**
 * 재는 글 — 폭 훑기를 페이지 **안에서** 한 번에 돈다(폭마다 왕복하면 바쁜 기계에서 몇 분이 걸린다).
 * 이름 붙은 함수를 만들지 않는다(esbuild 가 `__name` 을 끼워 page 안에서 죽는다 · `paperProbe` 함정 3).
 * 표적 식은 각 상자에서 **조사가 바로 뒤에 붙은** 첫 식이다. 조각은 `.katex-html` 아래 어디에 있든 센다(고정 상자 안도).
 */
const MEASURE = `(() => {
  const boxes = [...document.querySelectorAll("[data-case]")];
  const targets = boxes.map((box) => {
    for (const k of box.querySelectorAll(".katex")) {
      const n = k.nextSibling;
      if (n && n.nodeType === 3 && /^\\u2060?[가-힣]/.test(n.data)) return { box, k, n };
    }
    return { box, k: null, n: null };
  });
  const out = [];
  for (let width = ${MIN_WIDTH}; width <= ${MAX_WIDTH}; width += 1) {
    for (const b of boxes) b.style.width = width + "px";
    for (const t of targets) {
      if (!t.k) { out.push({ id: t.box.dataset.case, width, missing: true }); continue; }
      const off = t.n.data.startsWith("\\u2060") ? 1 : 0;
      const r = document.createRange();
      r.setStart(t.n, off); r.setEnd(t.n, off + 1);
      const j = r.getBoundingClientRect();
      const pieces = t.k.querySelectorAll(".katex-html .katex-base");
      const m = pieces[pieces.length - 1].getBoundingClientRect();
      const b = t.box.getBoundingClientRect();
      out.push({ id: t.box.dataset.case, width, jLeft: j.left, jTop: j.top, mLeft: m.left, mRight: m.right, mBottom: m.bottom, boxLeft: b.left });
    }
  }
  return out;
})()`;

type Probe = {
  id: string;
  width: number;
  missing?: boolean;
  jLeft: number;
  jTop: number;
  mLeft: number;
  mRight: number;
  mBottom: number;
  boxLeft: number;
};
type Tally = Record<
  string,
  { same: number; split: number; tooNarrow: number; widths: number[] }
>;

let browser: Browser;
beforeAll(async () => {
  browser = await chromium.launch({ headless: true });
}, 180_000);
afterAll(async () => {
  await browser?.close();
}, 60_000);

async function openProbe(
  arm: Arm,
  media: (typeof MEDIA)[number],
): Promise<Page> {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 900 },
  });
  await page.emulateMedia({ media });
  const html = await paperDocument(
    caseHtml(arm),
    "[data-case]{margin:0 0 24px 8px}",
  );
  await page.goto(writeProbe(`math-particle-${arm}-${media}.html`, html));
  if (arm === "unpinned") await page.evaluate(UNPIN);
  await assertPaperFonts(page, '[data-case^="paper:"] p');
  return page;
}

/** 폭을 1px 씩 바꿔 가며 상자마다 «한 줄 · 갈림 · 못 견줌»을 센다. */
async function sweep(arm: Arm, media: (typeof MEDIA)[number]): Promise<Tally> {
  const page = await openProbe(arm, media);
  const tally: Tally = {};
  for (const p of (await page.evaluate(MEASURE)) as Probe[]) {
    expect(p.missing, `${p.id} 표적 식을 못 찾았다`).toBeFalsy();
    const t = (tally[p.id] ??= { same: 0, split: 0, tooNarrow: 0, widths: [] });
    if (p.jLeft >= p.mRight - 1.5 && p.jTop < p.mBottom) t.same += 1;
    // 식 끝 조각이 줄 머리에 섰는데도 조사가 다음 줄로 갔다 — 식 + 조사가 한 줄보다 넓다(붙여 둘 수 없는 폭)
    else if (p.mLeft <= p.boxLeft + 0.5) t.tooNarrow += 1;
    else {
      t.split += 1;
      if (t.widths.length < 5) t.widths.push(p.width);
    }
  }
  await page.close();
  return tally;
}

describe("식 뒤 조사 · 서술격은 Chrome 에서 식과 한 줄에 선다 (D-164 ⑴)", () => {
  for (const media of MEDIA)
    it(`${media} 매체 — 대조군은 실제로 갈리고, 제품은 한 번도 안 갈리고, 고정 상자를 걷으면 긴 식이 다시 갈린다`, async () => {
      const control = await sweep("control", media);
      const product = await sweep("product", media);
      const unpinned = await sweep("unpinned", media);
      for (const surface of SURFACES)
        for (const c of CASES) {
          const id = `${surface.id}:${c.id}`;
          expect(
            control[id]!.split,
            `${id} 대조군이 한 번은 갈려야 시험이 유효하다`,
          ).toBeGreaterThan(0);
          expect(
            product[id]!.split,
            `${id} 제품이 갈린 폭 ${product[id]!.widths.join(",")}`,
          ).toBe(0);
          expect(
            product[id]!.tooNarrow,
            `${id} 식 + 조사가 한 줄보다 넓은 폭`,
          ).toBe(0);
          if (c.id === "long")
            expect(
              unpinned[id]!.split,
              `${id} 고정 상자 없이 WJ 만으로는 갈린다`,
            ).toBeGreaterThan(0);
        }
    }, 300_000);

  /**
   * 식의 마지막 조각 + 조사 첫 글자가 한 줄보다 넓은 칸(24~139px) — 잇기가 **새 넘침**을 만들지 않는가(2026-10-21 Codex 검토).
   * 이은 덩어리는 쪼갤 자리가 없으니 칸을 넘을 수 있다. 대조군도 넘치는 폭(식 조각 하나가 칸보다 넓다)은 잇기 탓이 아니다 —
   * 대조군은 안 넘치는데 제품만 넘치는 폭을 센다.
   */
  it("좁은 칸에서도 잇기가 새 가로 넘침을 만들지 않는다 — 대조군이 안 넘치는 폭에서는 제품도 안 넘친다", async () => {
    const OVERFLOW = `(() => {
      const boxes = [...document.querySelectorAll("[data-case]")];
      const out = {};
      for (let width = 24; width < ${MIN_WIDTH}; width += 1) {
        for (const b of boxes) b.style.width = width + "px";
        for (const b of boxes) {
          const p = b.querySelector("p");
          if (p.scrollWidth > p.clientWidth + 0.5) (out[b.dataset.case] ??= []).push(width);
        }
      }
      return out;
    })()`;
    const over = async (arm: Arm) => {
      const page = await openProbe(arm, "print");
      const got = (await page.evaluate(OVERFLOW)) as Record<string, number[]>;
      await page.close();
      return got;
    };
    const control = await over("control");
    const product = await over("product");
    for (const surface of SURFACES)
      for (const c of CASES) {
        const id = `${surface.id}:${c.id}`;
        const fresh = (product[id] ?? []).filter(
          (w) => !(control[id] ?? []).includes(w),
        );
        expect(fresh, `${id} 제품만 넘치는 폭`).toEqual([]);
      }
  }, 300_000);
});
