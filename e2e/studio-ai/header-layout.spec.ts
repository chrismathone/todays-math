import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * 원장님 2026-09-21 상단 칸 재배치(트랙 35) — 실제 브라우저에서 재는 것들.
 * jsdom 은 CSS 를 안 돌아 «클래스가 붙었다»와 «그렇게 그려진다»를 못 가른다.
 *
 * ⑴ 쪽 이동과 문제 이동이 한 줄에 선다 — 세로 중심이 같은 값
 * ⑵ 진행 띠가 전보다 좁다
 * ⑶ 전체 작업 셋이 한 줄에 선다
 * 파일 이름이 몇 글자까지 보이는가 — 잰 값을 보고서에 적는다
 *
 * 유료 AI 는 부르지 않는다 — /api/dev/unified/ai 는 «연결됨»만 흉내 내고 POST 는 막는다.
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

/** 원장님 화면에서 잘리던 그 이름이다. */
const FILE_NAME = "[경신중][2][25-2-중간][미래엔][1학기 전범위].pdf";

test("검수 단계 상단 두 줄 — 쪽·문제가 한 줄, 전체 작업 셋이 한 줄, 파일 이름이 길게 보인다", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
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

  await page.setViewportSize({ width: 1516, height: 940 });
  await page.goto("/");
  await page.getByLabel("PDF 또는 이미지 파일 가져오기").setInputFiles({
    name: FILE_NAME,
    mimeType: "application/pdf",
    buffer: examPdf(5),
  });
  const area = page.getByRole("group", { name: "문제 자르기 영역" });
  await expect(area).toBeVisible();
  // 문항 셋을 잘라 검수 단계를 채운다.
  for (const top of [0.08, 0.38, 0.68]) {
    const box = (await area.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.1, box.y + box.height * top);
    await page.mouse.down();
    await page.mouse.move(
      box.x + box.width * 0.85,
      box.y + box.height * (top + 0.22),
      { steps: 6 },
    );
    await page.mouse.up();
  }
  await page
    .getByRole("navigation", { name: "제작 단계 이동" })
    .getByRole("button", { name: /OCR · 디지털화/ })
    .click();

  const row = page.getByLabel("문항 검수 이동");
  const band = page.locator("[data-studio-band]");
  await expect(row).toBeVisible();
  /* 한 줄인가 — flex 항목의 세로 중심이 한 값이면 한 줄이다(studio-ai.spec 의 자와 같다). */
  const lines = (target: typeof row) =>
    target.evaluate(
      (element) =>
        new Set(
          [...element.children].flatMap((child) => {
            const box = child.getBoundingClientRect();
            return box.height ? [Math.round(box.top + box.height / 2)] : [];
          }),
        ).size,
    );
  // ⑴ 쪽 이동과 문제 이동의 세로 중심이 같다 — 한 줄이라는 뜻이다.
  const center = async (name: string) => {
    const box = (await row
      .getByRole("button", { name, exact: true })
      .boundingBox())!;
    return Math.round(box.y + box.height / 2);
  };
  const [prevPage, nextPage, prevCrop, nextCrop] = await Promise.all([
    center("이전 페이지"),
    center("다음 페이지"),
    center("이전 문제 검수"),
    center("다음 문제 검수"),
  ]);
  expect(new Set([prevPage, nextPage, prevCrop, nextCrop]).size).toBe(1);

  // ⑶ 전체 작업 셋도 한 줄 — 제목 줄에서 세로 중심이 같다.
  const bulk = page.locator("[data-studio-bulk]");
  const bulkCenters = await Promise.all(
    ["전체 페이지 자동 인식", "전체 디지털화", "전체 해설 생성"].map(
      async (name) => {
        const box = (await bulk
          .getByRole("button", { name, exact: true })
          .boundingBox())!;
        return Math.round(box.y + box.height / 2);
      },
    ),
  );
  expect(new Set(bulkCenters).size).toBe(1);
  // 제목 줄은 전(前)과 같이 1516px 에서 한 줄로 남는다.
  expect(await lines(band)).toBe(1);

  // 파일 이름 — 고른 칸의 실제 폭을 잰다(잘린 글자 수는 보고서에 적는다).
  const nameBox = (await page
    .getByRole("combobox", { name: "원본 파일" })
    .boundingBox())!;
  const strip = (await page
    .locator("[data-studio-progress]")
    .first()
    .boundingBox())!;
  const measured = {
    폭_1516: {
      파일이름칸: Math.round(nameBox.width),
      진행띠: Math.round(strip.width),
      제목줄높이: Math.round((await band.boundingBox())!.height),
      제목줄_줄수: await lines(band),
      검수줄높이: Math.round((await row.boundingBox())!.height),
      검수줄_줄수: await lines(row),
    },
  };
  await page.screenshot({
    path: testInfo.outputPath("after-1516.png"),
    fullPage: false,
  });
  await testInfo.attach("after-1516.png", {
    path: testInfo.outputPath("after-1516.png"),
    contentType: "image/png",
  });

  // 좁은 폭에서도 두 줄이 유지되는지 — 꺾이는 지점을 본다.
  await page.setViewportSize({ width: 1280, height: 940 });
  await expect(row).toBeVisible();
  const narrowCenters = await Promise.all(
    ["이전 페이지", "다음 문제 검수"].map(center),
  );
  Object.assign(measured, {
    폭_1280: {
      파일이름칸: Math.round(
        (await page.getByRole("combobox", { name: "원본 파일" }).boundingBox())!
          .width,
      ),
      진행띠: Math.round(
        (await page.locator("[data-studio-progress]").first().boundingBox())!
          .width,
      ),
      제목줄높이: Math.round((await band.boundingBox())!.height),
      제목줄_줄수: await lines(band),
      검수줄_줄수: await lines(row),
      쪽문제_같은줄: new Set(narrowCenters).size === 1,
    },
  });
  await page.screenshot({ path: testInfo.outputPath("after-1280.png") });
  await testInfo.attach("after-1280.png", {
    path: testInfo.outputPath("after-1280.png"),
    contentType: "image/png",
  });
  await testInfo.attach("잰 값.json", {
    body: JSON.stringify(measured, null, 2),
    contentType: "application/json",
  });

  console.log("[잰 값]", JSON.stringify(measured));
  expect(errors).toEqual([]);
});
