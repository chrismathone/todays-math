import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { SHEET_CODE_ALPHABET } from "../../src/contracts/conceptBlank.contract";
import { SHEET_CODE_LINE_CAPACITY } from "../../src/components/concept-blank/paper/paginate";
import { formatCode } from "./code";
import { openSet } from "./measure";

/**
 * 지면 코드 줄(트랙 cb-code)의 정원 — 장의 글 폭(694px) 한 줄에 코드가 몇 글자(점 뺀 수)까지 서나.
 * 글꼴은 둘 다 잰다 — 이 PC 에서 제품 스택(`Pretendard, …, "Malgun Gothic"`)이 풀린 것과 제품이 싣는 Pretendard 파일.
 * 글자마다 넓이가 달라 «가장 넓은 글자로만 지은 코드»가 서는 수를 정원으로 본다. 쪽 번호는 세 자리(«999/999»)로 본다.
 * 표는 `test-results/concept-blank-paper/code-capacity.json`.
 */
const OUT = path.join(process.cwd(), "test-results", "concept-blank-paper");

test("코드 줄 정원 — 가장 넓은 글자로 지은 코드가 한 줄에 몇 글자까지 서나", async ({
  page,
}) => {
  await openSet(page, "fixture", "both", "[data-cb-code]");
  await page.evaluate(() =>
    document.fonts.load('600 9px "cb-harness-pretendard"'),
  );
  const faces = await page.evaluate(
    ({ alphabet, codes }) => {
      const line = document.querySelector<HTMLElement>("[data-cb-code]")!;
      const room = line.clientWidth;
      const codeClass = line.querySelector("span")!.className;
      const probe = line.cloneNode(false) as HTMLElement;
      probe.style.cssText =
        "position:absolute;visibility:hidden;display:inline-block;width:auto;padding:0;";
      line.parentElement!.append(probe);
      const widthOf = (code: string, family?: string) => {
        if (family) probe.style.fontFamily = family;
        probe.innerHTML = `<span class="${codeClass}">${code}</span> · 999/999 · 학생지`;
        return probe.getBoundingClientRect().width;
      };
      const out = [null, '"cb-harness-pretendard"'].map((family) => {
        probe.style.fontFamily = "";
        const glyphs = Object.fromEntries(
          [...alphabet].map((g) => [
            g,
            widthOf(g.repeat(40), family ?? undefined) -
              widthOf("", family ?? undefined),
          ]),
        );
        const widest = Object.entries(glyphs).sort(
          (a, b) => b[1] - a[1],
        )[0]![0];
        const fits = (n: number) =>
          widthOf(codes[widest]![n]!, family ?? undefined) <= room;
        let n = 6;
        while (n < 200 && fits(n + 1)) n++;
        return {
          family: family ?? getComputedStyle(line).fontFamily,
          resolved: family ?? "제품 스택(이 PC)",
          room,
          widest,
          capacity: n,
          glyphs40: glyphs,
        };
      });
      probe.remove();
      return out;
    },
    {
      alphabet: SHEET_CODE_ALPHABET,
      // 글자마다 n 글자 코드(n = 0 … 200) — 판 번호 `1` 뒤를 그 글자로
      codes: Object.fromEntries(
        [...SHEET_CODE_ALPHABET].map((g) => [
          g,
          Array.from({ length: 201 }, (_, n) =>
            n ? formatCode(`1${g.repeat(n - 1)}`) : "",
          ),
        ]),
      ),
    },
  );
  mkdirSync(OUT, { recursive: true });
  writeFileSync(
    path.join(OUT, "code-capacity.json"),
    JSON.stringify(faces, null, 2),
  );
  for (const face of faces) {
    expect(face.room).toBe(694);
    // 제품의 정원(넘으면 «코드 없음») ≤ 잰 정원 — 하네스가 다는 «가장 긴 코드»도 이 글자 수다
    expect(SHEET_CODE_LINE_CAPACITY, face.resolved).toBeLessThanOrEqual(
      face.capacity,
    );
  }
});

/**
 * 보고서의 «지면 자리» 캡처 — 장 아래 140px(발 · 채점 안내 · 코드 줄)를 2배로. `test-results/concept-blank-paper/code/`.
 * 제품 코드(fixture) · 정원 끝(가장 넓은 글자 60) · 정원 넘음(61 → «코드 없음»).
 */
test("코드 줄 캡처 — 학생지 첫 장 · 이어지는 장 · 채점표 마지막 장의 아래", async ({
  browser,
}) => {
  const page = await browser.newPage({ deviceScaleFactor: 2 });
  mkdirSync(path.join(OUT, "code"), { recursive: true });
  for (const [name, query] of [
    ["fixture", "fixture"],
    ["capacity", `fixture&code=${SHEET_CODE_LINE_CAPACITY}`],
    ["over", `fixture&code=${SHEET_CODE_LINE_CAPACITY + 1}`],
  ] as const) {
    await openSet(page, query, "both", "[data-cb-code]");
    const pages = page.locator("[data-print-page]");
    const n = await pages.count();
    const parts = await page
      .locator("[data-cb-page]")
      .evaluateAll((els) =>
        els.map((el) => (el as HTMLElement).dataset.cbPart),
      );
    const picks = {
      "student-p1": 0,
      "student-p2": 1,
      "key-last": n - 1,
    } as const;
    for (const [label, index] of Object.entries(picks)) {
      // 화면(1000×1400)에 장 하나가 다 들어온다 — 그 장으로 굴린 뒤 화면 좌표로 자른다
      await pages.nth(index).scrollIntoViewIfNeeded();
      const box = (await pages.nth(index).boundingBox())!;
      await page.screenshot({
        path: path.join(OUT, "code", `${name}-${label}.png`),
        clip: {
          x: box.x,
          y: box.y + box.height - 140,
          width: box.width,
          height: 140,
        },
      });
    }
    expect(parts[0]).toBe("student");
    expect(parts[n - 1]).toBe("key");
  }
  await page.close();
});
