import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// A small public, generated fixture: no real exam or student data.
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

test("all pages use two background slots, preserve navigation, stamp empty pages and apply a file grade", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 923 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/dev/unified/pdf-worker?*", (route) =>
    route.fulfill({
      body: readFileSync(
        resolve("node_modules/pdfjs-dist/build/pdf.worker.min.mjs"),
      ),
      contentType: "text/javascript",
    }),
  );
  await page.route("**/api/dev/unified/pdf-assets/**", (route) => {
    const parts = new URL(route.request().url()).pathname.split("/").slice(-2);
    return route.fulfill({
      body: readFileSync(resolve("node_modules/pdfjs-dist", ...parts)),
      contentType: parts[1].endsWith(".wasm")
        ? "application/wasm"
        : "application/octet-stream",
    });
  });
  const requests: { image: string; grade: string; finish: () => void }[] = [];
  const pageImages: string[] = [];
  let inFlight = 0;
  let peak = 0;
  await page.route("**/api/dev/unified/ai", async (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({
        json: {
          enabled: true,
          mode: "subscription-cli",
          defaultProvider: "codex",
          providers: [
            {
              id: "codex",
              label: "Codex",
              status: "ready",
              detail: "테스트 연결",
              image: true,
            },
          ],
        },
      });
    const input = route.request().postDataJSON();
    inFlight++;
    peak = Math.max(peak, inFlight);
    await new Promise<void>((finish) =>
      requests.push({ image: input.imageDataUrl, grade: input.grade, finish }),
    );
    inFlight--;
    const pageNumber = pageImages.indexOf(input.imageDataUrl) + 1;
    await route.fulfill({
      json: {
        provider: "codex",
        action: "page-ocr",
        result: {
          content: "",
          answer: "",
          solution: "",
          warnings: [],
          detectedGrade:
            pageNumber === 1
              ? {
                  grade: "고1",
                  confidence: "high",
                  evidence: "표지 고등학교 1학년",
                }
              : undefined,
          problems:
            pageNumber === 1
              ? []
              : [
                  {
                    content: `${pageNumber}쪽 문제`,
                    answer: "",
                    bbox: { left: 80, top: 100, width: 840, height: 200 },
                  },
                ],
        },
      },
    });
  });
  await page.goto("/");
  await page.getByLabel("PDF 또는 이미지 파일 가져오기").setInputFiles({
    name: "six-page-exam.pdf",
    mimeType: "application/pdf",
    buffer: examPdf(6),
  });
  const pageSelect = page.getByRole("combobox", {
    name: "페이지 선택",
    exact: true,
  });
  // Record each rendered page to identify the independent AI requests without timing assumptions.
  for (let number = 1; number <= 6; number++) {
    if (number > 1) await pageSelect.selectOption(String(number));
    const image = page.getByRole("img", {
      name: `six-page-exam.pdf, ${number}쪽 원본`,
      exact: true,
    });
    await expect(image).toBeVisible();
    pageImages.push((await image.getAttribute("src"))!);
  }
  await pageSelect.selectOption("1");
  await expect(page.getByRole("combobox", { name: "시험지 학년" })).toHaveValue(
    "auto",
  );
  await page
    .getByRole("button", { name: "전체 페이지 자동 인식", exact: true })
    .click();
  await expect.poll(() => requests.length).toBe(2);
  await page.getByRole("button", { name: /작업 진행 상세/ }).click();
  await expect(page.getByLabel("페이지 인식 현황")).toContainText(
    "0/6쪽 처리 중 · 대기 중 4쪽",
  );
  await expect(
    page.getByRole("progressbar", { name: "페이지 자동 인식" }),
  ).toHaveAttribute("aria-valuenow", "0");
  await page.keyboard.press("Escape");
  await pageSelect.selectOption("6");
  await expect(
    page.getByRole("img", { name: "six-page-exam.pdf, 6쪽 원본", exact: true }),
  ).toBeVisible();
  // Finish page two before page one; another queued page starts immediately.
  requests.find((request) => request.image === pageImages[1])!.finish();
  await expect.poll(() => requests.length).toBe(3);
  await expect(pageSelect).toHaveValue("6");
  await page.screenshot({ path: testInfo.outputPath("queue-running.png") });
  requests.find((request) => request.image === pageImages[0])!.finish();
  await expect.poll(() => requests.length).toBe(4);
  await pageSelect.selectOption("1");
  await expect(
    page.getByLabel("자동 인식 완료: 문제가 없는 빈 페이지"),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "원본 확대 비율" })
    .selectOption("0");
  await page.screenshot({ path: testInfo.outputPath("empty-page-stamp.png") });
  for (let i = 2; i < 6; i++) {
    await expect.poll(() => requests.length).toBeGreaterThan(i);
    requests[i].finish();
  }
  await page.getByRole("button", { name: /작업 진행 상세/ }).click();
  await expect(page.getByLabel("페이지 인식 현황")).toContainText(
    "인식 6 / 6쪽 완료",
  );
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("option", { name: "고1 (자동 인식)", exact: true }),
  ).toHaveCount(1);
  expect(peak).toBe(2);
  expect(requests).toHaveLength(6);
  expect(requests.every((request) => request.grade === "미지정")).toBe(true);
  await page
    .getByRole("button", { name: "전체 페이지 자동 인식", exact: true })
    .click();
  await page.getByRole("button", { name: /작업 진행 상세/ }).click();
  await expect(page.getByLabel("페이지 인식 현황")).toContainText(
    "인식 6 / 6쪽 완료",
  );
  await page.keyboard.press("Escape");
  expect(requests).toHaveLength(6);
  await page.getByRole("combobox", { name: "시험지 학년" }).selectOption("중2");
  await pageSelect.selectOption("3");
  await expect(
    page.getByRole("img", { name: "검수할 자른 원본 문제" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^OCR · 디지털화 \d/ }).click();
  await page.getByRole("button", { name: "5문항 담기", exact: true }).click();
  const problems = JSON.parse(
    (await page.getByLabel("시험지 담은 문제").textContent())!,
  );
  expect(problems).toHaveLength(5);
  expect(
    problems.every((problem: { grade: string }) => problem.grade === "중2"),
  ).toBe(true);
  await page
    .getByRole("button", { name: "문제&도형 잘라내기", exact: true })
    .click();
  expect(
    await page
      .getByRole("button", { name: "문제 추가", exact: true })
      .evaluate((button) => button.getBoundingClientRect().height),
  ).toBe(34);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("compact-inspector.png") });
});
