import { expect, type Locator, type Page } from "@playwright/test";
import {
  buildHwpxParts,
  HwpxPayloadSchema,
} from "../../src/lib/export/hwpxServer";

/** 하네스 세 자리 — 편집기(내용 수정) · 검수 카드 · 지면. */
export const panel = (page: Page, name: "editor" | "card" | "paper") =>
  name === "editor"
    ? page.locator('[data-panel="editor"] .visual-document')
    : page.locator(`[data-panel="${name}"]`);

/** 두 프레임 — 글꼴·그림이 들어온 뒤 지면이 열 수를 다시 고르는 것까지 기다린다. */
export const settle = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );

export async function open(page: Page, name: string, query = "") {
  await page.goto(`/?case=${name}${query}`);
  await expect(
    panel(page, "paper").locator(".katex, img").first(),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await settle(page);
}

/** 지면 → HWPX(서버와 같은 스키마 → 파이썬 writer) → 본문 문단마다 한 줄(탭은 ⇥, 그림은 [id]). */
export async function hwpxLines(page: Page) {
  const pages = await page.evaluate(
    async () => (await window.collectPaperHwpx()).pages,
  );
  const parts = await buildHwpxParts(
    HwpxPayloadSchema.parse({ title: "보기 배치", pages }),
  );
  return page.evaluate((xml) => {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    return [...doc.documentElement.children]
      .filter((node) => node.tagName === "hp:p")
      .slice(1)
      .map((p) =>
        [...p.getElementsByTagName("*")]
          .map((node) =>
            node.tagName === "hp:t" && node.parentElement?.tagName === "hp:run"
              ? (node.textContent ?? "").trim()
              : node.tagName === "hp:tab"
                ? "⇥"
                : node.tagName === "hp:shapeComment"
                  ? `$${(node.textContent ?? "").replace("\\displaystyle ", "")}$`
                  : node.tagName === "hc:img"
                    ? `[${node.getAttribute("binaryItemIDRef")}]`
                    : "",
          )
          .filter(Boolean)
          .join(" "),
      );
  }, parts["Contents/section0.xml"]!);
}

/**
 * 기준선 자리 — 0×0 인라인 블록을 그 자리에 잠깐 넣고 위쪽 끝을 잰다(빈 인라인 블록의 기준선은 아래 끝).
 * 글 조각을 쪼개지 않고 **요소 곁에만** 넣었다 뺀다(React 가 쥔 글 노드를 안 건드린다).
 *
 * - `before-math`: 칸의 첫 수식 바로 앞 — 앞말(«(가)») 줄의 기준선
 * - `after-math`: 칸의 첫 수식 바로 뒤 — 수식 줄의 기준선
 * - `in-first`: 칸의 첫 자식(보기 번호 «①») 안 끝
 */
export async function baselines(
  root: Locator,
  cells: string,
  mode: "before-math" | "after-math" | "in-first",
): Promise<number[]> {
  return root.evaluate(
    (element, { cells, mode }) =>
      [...element.querySelectorAll<HTMLElement>(cells)].map((cell) => {
        const probe = document.createElement("span");
        probe.style.cssText =
          "display:inline-block;width:0;height:0;vertical-align:baseline";
        const math = cell.querySelector(".katex");
        if (mode === "in-first") cell.firstElementChild?.append(probe);
        else if (math && mode === "before-math") math.before(probe);
        else if (math) math.after(probe);
        if (!probe.isConnected) return NaN;
        const top = probe.getBoundingClientRect().top;
        probe.remove();
        return top;
      }),
    { cells, mode },
  );
}
