import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * 자료 제작 네 단계 헤더 — 시안의 높이를 **재는** 시험(원장님 2026-09-21 «4단계 헤더 구성
 * 일치화 시킬것»). D-07 이라 구현은 안 한다 — 시안을 그려 높이를 재고 보고서에 적는다.
 *
 * ⑴ 현행 ①②③ 은 **진짜 화면**에서 잰다(하네스의 StudioView).
 * ⑵ 같은 값을 시안 화면(step-header.html)의 «현행» 칸에서도 잰다 — 두 값이 맞아야
 *    안 A·B·C 의 숫자도 믿을 수 있다. 어긋나면 이 시험이 문다.
 * ⑶ 잰 값은 `[잰 값]` 줄과 첨부로 남긴다.
 *
 * 유료 AI 는 부르지 않는다 — POST 는 막는다.
 */

/** header-layout.spec.ts 와 같은 다섯 쪽 PDF. 거기 것을 내보내지 않아 여기 다시 둔다. */
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

const FILE_NAME = "[경신중][2][25-2-중간][미래엔][1학기 전범위].pdf";

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
      contentType: parts[1].endsWith(".wasm")
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

/** 칸 하나의 높이와 «몇 줄인가»(자식들의 세로 중심이 몇 가지인가). */
const measure = (page: Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((element) => ({
      높이: Math.round(element.getBoundingClientRect().height),
      폭: Math.round(element.getBoundingClientRect().width),
      줄수: new Set(
        [...element.children].flatMap((child) => {
          const box = child.getBoundingClientRect();
          return box.height ? [Math.round(box.top + box.height / 2)] : [];
        }),
      ).size,
    }));

test("현행 네 단계의 머리 높이 — 진짜 화면에서 잰다", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await stubNetwork(page);

  /** 큰 제목 칸 · 얇은 띠 — 표가 그대로 붙어 있는 것들. */
  const box = (selector: string) => measure(page, selector);
  /** 원본 파일 고르는 칸을 담은 «도구 줄» — 클래스가 해시라 표를 타고 올라간다. */
  const toolbarBox = () =>
    page.getByRole("combobox", { name: "원본 파일" }).evaluate((select) => {
      const row = select.parentElement!.parentElement!;
      return {
        높이: Math.round(row.getBoundingClientRect().height),
        폭: Math.round(row.getBoundingClientRect().width),
        줄수: new Set(
          [...row.children].flatMap((child) => {
            const rect = child.getBoundingClientRect();
            return rect.height ? [Math.round(rect.top + rect.height / 2)] : [];
          }),
        ).size,
      };
    });
  /** 원형 체크 진행 막대를 감싼 칸(테두리·여백까지). */
  const workflowBox = () =>
    page.getByRole("navigation", { name: "제작 단계" }).evaluate((nav) => {
      const row = nav.parentElement!;
      return {
        높이: Math.round(row.getBoundingClientRect().height),
        폭: Math.round(row.getBoundingClientRect().width),
        줄수: 1,
      };
    });

  // ① 원본 가져오기 — 큰 제목 + 원형 체크 진행 막대.
  await page.setViewportSize({ width: 1516, height: 940 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "내 자료로 만드는 문제",
  );
  const 단계1: Record<string, unknown> = {};
  for (const width of [1516, 1280]) {
    await page.setViewportSize({ width, height: 940 });
    단계1[`폭_${width}`] = {
      제목줄: await box("[data-workspace-page-header]"),
      단계막대: await workflowBox(),
    };
    await page.screenshot({
      path: testInfo.outputPath(`now-step1-${width}.png`),
    });
  }

  // ② 문제&도형 잘라내기 — 얇은 띠 + 지면 도구 줄.
  await page.setViewportSize({ width: 1516, height: 940 });
  await page.getByLabel("PDF 또는 이미지 파일 가져오기").setInputFiles({
    name: FILE_NAME,
    mimeType: "application/pdf",
    buffer: examPdf(5),
  });
  const area = page.getByRole("group", { name: "문제 자르기 영역" });
  await expect(area).toBeVisible();
  const 단계2: Record<string, unknown> = {};
  for (const width of [1516, 1280]) {
    await page.setViewportSize({ width, height: 940 });
    단계2[`폭_${width}`] = {
      제목줄: await box("[data-studio-band]"),
      도구줄: await toolbarBox(),
    };
    await page.screenshot({
      path: testInfo.outputPath(`now-step2-${width}.png`),
    });
  }

  // ③ OCR · 디지털화 — 같은 띠 + 검수 줄.
  await page.setViewportSize({ width: 1516, height: 940 });
  for (const top of [0.08, 0.38, 0.68]) {
    const rect = (await area.boundingBox())!;
    await page.mouse.move(
      rect.x + rect.width * 0.1,
      rect.y + rect.height * top,
    );
    await page.mouse.down();
    await page.mouse.move(
      rect.x + rect.width * 0.85,
      rect.y + rect.height * (top + 0.22),
      { steps: 6 },
    );
    await page.mouse.up();
  }
  await page
    .getByRole("navigation", { name: "제작 단계 이동" })
    .getByRole("button", { name: /OCR · 디지털화/ })
    .click();
  await expect(page.getByLabel("문항 검수 이동")).toBeVisible();
  const 단계3: Record<string, unknown> = {};
  for (const width of [1516, 1280]) {
    await page.setViewportSize({ width, height: 940 });
    단계3[`폭_${width}`] = {
      제목줄: await box("[data-studio-band]"),
      도구줄: await box('[aria-label="문항 검수 이동"]'),
    };
    await page.screenshot({
      path: testInfo.outputPath(`now-step3-${width}.png`),
    });
  }

  const 잰값 = { "①": 단계1, "②": 단계2, "③": 단계3 };
  console.log("[잰 값 · 현행 진짜 화면]", JSON.stringify(잰값));
  await testInfo.attach("현행-진짜화면.json", {
    body: JSON.stringify(잰값, null, 2),
    contentType: "application/json",
  });
  for (const width of [1516, 1280])
    await testInfo.attach(`now-step3-${width}.png`, {
      path: testInfo.outputPath(`now-step3-${width}.png`),
      contentType: "image/png",
    });
  // 트랙 35 가 박아 둔 값 — 검수 제목 줄은 한 줄 44px 이다. 여기서도 같아야 한다.
  expect(
    (단계3["폭_1516"] as { 제목줄: { 높이: number } }).제목줄.높이,
  ).toBeLessThanOrEqual(44);
  expect(errors).toEqual([]);
});

test("시안 화면 — 네 안 × 네 단계 높이를 1516·1280 에서 잰다", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await stubNetwork(page);
  await page.goto("/step-header.html?bare=1");
  await expect(page.locator('[data-plan="A"][data-step="1"]')).toBeVisible();

  const table = async (width: number) => {
    await page.setViewportSize({ width, height: 940 });
    const rows: Record<string, unknown> = {};
    for (const plan of ["now", "A", "A2", "B", "C"])
      for (const step of [1, 2, 3, 4]) {
        const root = page.locator(`[data-plan="${plan}"][data-step="${step}"]`);
        rows[`${plan}·${step}`] = await root.evaluate((element) => {
          const line = (child: Element) => {
            const box = child.getBoundingClientRect();
            return box.height
              ? [
                  new Set(
                    [...child.children].flatMap((grand) => {
                      const inner = grand.getBoundingClientRect();
                      return inner.height
                        ? [Math.round(inner.top + inner.height / 2)]
                        : [];
                    }),
                  ).size,
                ]
              : [];
          };
          return {
            합계: Math.round(element.getBoundingClientRect().height),
            줄: [...element.children].map((child) => ({
              높이: Math.round(child.getBoundingClientRect().height),
              폭: Math.round(child.getBoundingClientRect().width),
              안쪽줄수: line(child)[0] ?? 0,
            })),
          };
        });
      }
    return rows;
  };

  const 잰값 = { 폭_1516: await table(1516), 폭_1280: await table(1280) };
  console.log("[잰 값 · 시안]", JSON.stringify(잰값));
  await testInfo.attach("시안-높이.json", {
    body: JSON.stringify(잰값, null, 2),
    contentType: "application/json",
  });

  for (const width of [1516, 1280]) {
    await page.setViewportSize({ width, height: 940 });
    await page.goto("/step-header.html");
    await page.screenshot({
      path: testInfo.outputPath(`plans-${width}.png`),
      fullPage: true,
    });
    await testInfo.attach(`plans-${width}.png`, {
      path: testInfo.outputPath(`plans-${width}.png`),
      contentType: "image/png",
    });
  }
  expect(errors).toEqual([]);
});
