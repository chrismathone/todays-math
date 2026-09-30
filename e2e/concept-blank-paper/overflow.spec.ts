import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

/**
 * 개념 백지 지면 — 인쇄 매체로 장마다 넘침(px)을 잰다(브리프 cb-paper «받아들임» · 시안처럼 쪽마다 넘침 px).
 *
 * 넘침 = 장(또는 칸 · 카드 · 가지 · 몸)의 내용이 제 상자를 넘는 높이 · 폭의 최댓값. 셋을 본다 —
 *  ① 칸마다 `scrollHeight − clientHeight`(늘고 줄어드는 칸 안에서 넘친 것 — 겉 장은 멀쩡해 보여도 잡는다)
 *  ② 장 안 모든 요소의 아래 끝이 장의 안쪽 아래(아래 여백 위)를 넘는가
 *  ③ 가로 — 장 안 요소의 오른쪽 끝이 안쪽 오른쪽을 넘는가(KaTeX · 긴 낱말)
 * 캡처는 장마다 `test-results/concept-blank-paper/<set>/…png`, 표는 `overflow-<set>.json`.
 */
const OUT = path.join(process.cwd(), "test-results", "concept-blank-paper");

type PageReport = {
  part: string;
  form: string;
  page: number;
  overflowPx: number;
  where: string;
  heightPx: number;
};

const SETS = [
  "fixture",
  "stress",
  "math",
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((seed) => `fuzz&seed=${seed}`),
] as const;

for (const set of SETS) {
  const name = set.replace("&seed=", "-");
  test(`${name} — 인쇄 매체에서 장마다 넘침 0`, async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 1400 });
    await page.emulateMedia({ media: "print" });
    // 첫 적재에서 Vite 가 의존을 묶고 새로 고치면 goto 가 끊긴다 — 몇 번 다시 연다
    for (let tries = 0; ; tries++) {
      try {
        await page.goto(`/?set=${set}&view=both`, { timeout: 60_000 });
        await page.waitForSelector("[data-cb-page]", { timeout: 30_000 });
        break;
      } catch (e) {
        if (tries >= 3) throw e;
      }
    }
    await page.waitForSelector("[data-cb-page]");
    await page.evaluate(() => document.fonts.ready);
    // 지면 명조가 제품과 같은 파일로 실렸나(아니면 폭이 달라 잰 값이 헛돈다 — UI-09)
    expect(
      await page.evaluate(() =>
        document.fonts.check('16px "cb-harness-noto-serif-kr"', "가"),
      ),
    ).toBe(true);

    const reports: PageReport[] = await page.evaluate(() => {
      const describe = (el: Element) =>
        `${el.tagName.toLowerCase()}${[...el.attributes]
          .filter((a) => a.name.startsWith("data-cb"))
          .map((a) => `[${a.name}=${a.value}]`)
          .join("")}.${String(el.className).split(" ")[0] ?? ""}`;
      return [...document.querySelectorAll<HTMLElement>("[data-cb-page]")].map(
        (sheet) => {
          const a4 = sheet.closest<HTMLElement>("[data-print-page]")!;
          const box = a4.getBoundingClientRect();
          const cs = getComputedStyle(sheet);
          const innerBottom = box.bottom - parseFloat(cs.paddingBottom);
          const innerRight = box.right - parseFloat(cs.paddingRight);
          let over = 0;
          let where = "";
          const bump = (d: number, el: Element, kind: string) => {
            if (d > over) {
              over = d;
              where = `${kind} ${describe(el)}`;
            }
          };
          const regions = [
            sheet,
            ...sheet.querySelectorAll(
              "[data-cb-fit],[data-cb-card],[data-cb-node],[data-cb-zone]",
            ),
          ];
          for (const el of regions) {
            bump(el.scrollHeight - el.clientHeight, el, "칸 세로");
            bump(el.scrollWidth - el.clientWidth, el, "칸 가로");
          }
          for (const el of sheet.querySelectorAll("*")) {
            const r = el.getBoundingClientRect();
            if (r.width === 0 && r.height === 0) continue;
            // KaTeX 가 숨겨 둔 긴 근호 SVG 등 잘린 조각은 잉크가 아니다
            if (el.closest(".katex-html svg, .katex-mathml")) continue;
            bump(r.bottom - innerBottom, el, "아래");
            bump(r.right - innerRight, el, "오른쪽");
          }
          return {
            part: sheet.dataset.cbPart ?? "",
            form: sheet.dataset.cbSheet ?? "",
            page: Number(sheet.dataset.cbPage),
            overflowPx: Math.round(over * 10) / 10,
            where,
            heightPx: Math.round(box.height),
          };
        },
      );
    });

    mkdirSync(path.join(OUT, name), { recursive: true });
    writeFileSync(
      path.join(OUT, `overflow-${name}.json`),
      JSON.stringify(reports, null, 2),
    );
    const pages = page.locator("[data-print-page]");
    const count = await pages.count();
    for (let i = 0; i < count; i++) {
      const r = reports[i]!;
      await pages.nth(i).screenshot({
        path: path.join(
          OUT,
          name,
          `${String(i + 1).padStart(2, "0")}-${r.part}-${r.form}-p${r.page}.png`,
        ),
      });
    }

    // A4 한 장 = 297mm(1123px) — 인쇄 매체에서 축소 없이
    for (const r of reports)
      expect(r.heightPx, `${r.form} ${r.part}`).toBe(1123);
    const bad = reports.filter((r) => r.overflowPx > 0.5);
    expect(bad, JSON.stringify(bad, null, 2)).toEqual([]);
  });
}
