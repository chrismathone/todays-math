import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * ② 영역 지정 — 오른쪽 칸과 창 전체가 **스크롤 없이** 서는가 (원장님 2026-09-21).
 *
 * 원장님: «우측 전체 창에는 스크롤 안생겨도 되지 않나? 상하폭 적절히 조절해서 스크롤 왠만하면 안생기게.»
 * 화면(2000×1008): 문제 목록은 185px 에 갇혀 두 개 남짓만 보이며 제 스크롤을 돌리는데, 그 아래 칸은 비어 있었다.
 *
 * 진짜 둘레(`UnifiedWorkspace` — 왼쪽 메뉴·위 띠·알림 줄)에서 잰다: 작업 칸의 높이는 둘레 높이를 **빼서** 정하므로
 * 작업실만 띄운 하네스에서는 창 스크롤이 안 드러난다. jsdom 은 CSS 를 안 돈다.
 */
function examPdf(pages: number) {
  const fontId = 3 + pages * 2;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Count ${pages} /Kids [${Array.from({ length: pages }, (_, i) => `${3 + i * 2} 0 R`).join(" ")}] >>`,
  ];
  for (let i = 0; i < pages; i++) {
    const stream = `BT /F1 24 Tf 40 500 Td (EXAM PAGE ${i + 1}) Tj ET`;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 600] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${4 + i * 2} 0 R >>`,
    );
    objects.push(
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    );
  }
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${object}\nendobj\n`;
  });
  const start = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join(
      "",
    )}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
  return Buffer.from(pdf);
}

async function stubNetwork(page: Page) {
  await page.route("**/api/studio/pdf-worker?*", (route) =>
    route.fulfill({
      body: readFileSync(
        resolve("node_modules/pdfjs-dist/build/pdf.worker.min.mjs"),
      ),
      contentType: "text/javascript",
    }),
  );
  await page.route("**/api/studio/pdf-assets/**", (route) => {
    const parts = new URL(route.request().url()).pathname.split("/").slice(-2);
    return route.fulfill({
      body: readFileSync(resolve("node_modules/pdfjs-dist", ...parts)),
      contentType: parts[1]!.endsWith(".wasm")
        ? "application/wasm"
        : "application/octet-stream",
    });
  });
  await page.route("**/api/dev/unified/ai", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({
          status: 500,
          json: { error: "시험은 AI 를 안 부른다" },
        })
      : route.fulfill({
          json: {
            enabled: true,
            mode: "subscription-cli",
            defaultProvider: "codex",
            providers: [
              {
                id: "codex",
                label: "Codex",
                status: "ready",
                detail: "사용 가능",
                image: true,
              },
            ],
          },
        }),
  );
}

async function dragBox(page: Page, top: number) {
  const area = page.getByRole("group", { name: "문제 자르기 영역" });
  await expect(area).toBeVisible();
  const rect = (await area.boundingBox())!;
  await page.mouse.move(rect.x + rect.width * 0.1, rect.y + rect.height * top);
  await page.mouse.down();
  await page.mouse.move(
    rect.x + rect.width * 0.85,
    rect.y + rect.height * (top + 0.12),
    { steps: 6 },
  );
  await page.mouse.up();
}

/** 원본을 올리고 ② 영역 지정에서 문제 여럿을 자른다 — 목록이 185px 를 넘게. */
async function cropStep(page: Page, width: number, height: number) {
  await stubNetwork(page);
  await page.setViewportSize({ width, height });
  await page.goto("/#studio");
  await page.getByLabel("PDF 또는 이미지 파일 가져오기").setInputFiles({
    name: "20260921181741.pdf",
    mimeType: "application/pdf",
    buffer: examPdf(4),
  });
  await expect(
    page.getByRole("button", { name: "키보드로 영역 지정" }),
  ).toBeEnabled();
  for (const top of [0.03, 0.18, 0.33, 0.48, 0.63, 0.78]) {
    await page.getByRole("button", { name: "문제 추가", exact: true }).click();
    await dragBox(page, top);
  }
  const list = page.getByLabel("자른 문제 목록");
  await expect(list).toBeVisible();
  // 끌기 여섯이 늘 여섯을 자르지는 않는다(화면 크기에 따라 겹친 칸은 버려진다) — 목록이 넘칠 만큼이면 된다.
  expect(await list.getByRole("button").count()).toBeGreaterThanOrEqual(3);
  await list.getByRole("button").first().click();
}

async function measure(page: Page) {
  return page.evaluate(() => {
    const root = document.scrollingElement!;
    const inspector = document.querySelector<HTMLElement>(
      'aside[aria-label="자른 문제 검수"]',
    )!;
    const scroll = inspector.firstElementChild!
      .nextElementSibling as HTMLElement;
    const list = document.querySelector<HTMLElement>(
      '[aria-label="자른 문제 목록"]',
    )!;
    const items = [...list.querySelectorAll<HTMLElement>("button")];
    const listBox = list.getBoundingClientRect();
    const scrollBox = scroll.getBoundingClientRect();
    const last = scroll.lastElementChild!.getBoundingClientRect();
    return {
      windowOverflow: root.scrollHeight - root.clientHeight,
      inspectorOverflow: scroll.scrollHeight - scroll.clientHeight,
      listHeight: Math.round(listBox.height),
      listOverflow: list.scrollHeight - list.clientHeight,
      items: items.length,
      itemsFullyVisible: items.filter((item) => {
        const box = item.getBoundingClientRect();
        return box.top >= listBox.top - 1 && box.bottom <= listBox.bottom + 1;
      }).length,
      // 칸 바닥에 남은 빈 높이 — 목록이 갇혀 있는데 여기가 비어 있으면 상하폭이 잘못 나뉜 것이다.
      spareBelow: Math.round(scrollBox.bottom - last.bottom),
    };
  });
}

for (const [name, width, height] of [
  ["원장님 화면 2000×1008", 2000, 1008],
  ["노트북 1516×940", 1516, 940],
] as const) {
  test(`${name}: 창 전체는 스크롤되지 않고, 목록은 남는 높이를 쓴다`, async ({
    page,
  }) => {
    await cropStep(page, width, height);
    const fit = await measure(page);
    console.log(name, JSON.stringify(fit));
    // 눈으로 볼 때: CROP_FIT_SHOTS=폴더 를 주면 오른쪽 칸을 찍어 둔다.
    if (process.env.CROP_FIT_SHOTS)
      await page.locator('aside[aria-label="자른 문제 검수"]').screenshot({
        path: `${process.env.CROP_FIT_SHOTS}/inspector-${width}x${height}.png`,
      });
    expect(fit.windowOverflow, "창 전체 스크롤").toBeLessThanOrEqual(0);
    expect(fit.inspectorOverflow, "오른쪽 칸 전체 스크롤").toBeLessThanOrEqual(
      0,
    );
    // 목록이 제 스크롤을 돌리는 동안 칸 바닥이 한 항목(76px) 넘게 비어 있으면 안 된다.
    if (fit.listOverflow > 0)
      expect(fit.spareBelow, "목록이 갇혔는데 아래가 빈다").toBeLessThan(76);
  });
}
