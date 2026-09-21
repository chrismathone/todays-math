import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * 담은 문항 — **현행**을 재는 시험(트랙 41, 원장님 2026-09-21 «담은걸 확인하거나 빼거나
 * 어떤걸 담았는지 체크할 수 있는기능이 없는듯»). D-07 이라 고치지 않는다 — 지금 무엇이
 * 되고 무엇이 어긋나는지를 진짜 작업실에서 재서 보고서 표의 근거로 쓴다.
 *
 * 🔴 이 시험은 **어긋남을 단정한다**(현행 그대로여야 초록). 어느 안이든 지으면 이 단정은
 *    뒤집혀야 한다 — 그때 이 시험을 «고친 뒤의 모습»으로 바꿔 쓸 것. 초록인 채로 두면
 *    어긋남을 지키는 시험이 된다.
 *
 * 유료 AI 는 부르지 않는다 — POST 는 막는다.
 */

/** step-header.spec.ts 와 같은 다섯 쪽 PDF. 거기 것을 내보내지 않아 여기 다시 둔다. */
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

/** 원본을 올리고 세 문제를 잘라 ③ OCR · 디지털화로 간다(AI 없이 — 단계 탭은 단계만 바꾼다). */
async function toReview(page: Page) {
  await stubNetwork(page);
  await page.setViewportSize({ width: 1516, height: 940 });
  await page.goto("/");
  await page.getByLabel("PDF 또는 이미지 파일 가져오기").setInputFiles({
    name: FILE_NAME,
    mimeType: "application/pdf",
    buffer: examPdf(5),
  });
  const area = page.getByRole("group", { name: "문제 자르기 영역" });
  await expect(area).toBeVisible();
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
  await stepTab(page, /OCR · 디지털화/).click();
  await expect(page.getByLabel("문항 검수 이동")).toBeVisible();
  // 끌기 셋이 늘 셋을 자르지는 않는다(자른 뒤 도구가 바뀐다) — 몇 개인지는 탭 배지로 읽는다.
  const count = Number(
    (await stepTab(page, /OCR · 디지털화/)
      .locator("b")
      .textContent()) ?? 0,
  );
  expect(count).toBeGreaterThanOrEqual(2);
  return count;
}

const stepTab = (page: Page, name: RegExp) =>
  page
    .getByRole("navigation", { name: "제작 단계 이동" })
    .getByRole("button", { name });
const footer = (page: Page) =>
  page.locator('footer[aria-label="문제 제작 주요 작업"]');
const addButton = (page: Page) =>
  footer(page).getByRole("button", {
    name: /문항 담기|모두 담았습니다|시험지에 담기/,
  });
const picked = async (page: Page) =>
  JSON.parse(
    (await page.getByLabel("시험지 담은 문제").textContent()) ?? "[]",
  ) as { id: string; reviewed: boolean; revision: number }[];

/**
 * 한 줄 칸의 «남는 폭» — 자식 상자의 폭과 사이 간격을 빼고 남는 가로. 줄 수는 자식 세로 중심의
 * 가짓수다(한 줄이면 1). 새 단추가 이 칸에 설 수 있는지를 이 값으로 가른다.
 */
const room = (page: Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((element) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const children = [...element.children]
        .map((child) => child.getBoundingClientRect())
        .filter((rect) => rect.width && rect.height);
      const lines = new Set(
        children.map((rect) => Math.round(rect.top + rect.height / 2)),
      ).size;
      const inner =
        box.width -
        parseFloat(style.paddingLeft) -
        parseFloat(style.paddingRight);
      const used =
        children.reduce((sum, rect) => sum + rect.width, 0) +
        Math.max(children.length - 1, 0) * (parseFloat(style.columnGap) || 0);
      return {
        폭: Math.round(box.width),
        줄수: lines,
        남는폭: lines === 1 ? Math.round(inner - used) : null,
        자식폭: children.map((rect) => Math.round(rect.width)),
      };
    });

test("③ 에서 담은 뒤 — 담은 것을 보거나 뺄 자리가 없고, ④ 에서 빼도 작업실은 모른다", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const n = await toReview(page);

  // 담기 전: 바닥 단추는 «N문항 담기», 탭 배지는 0.
  await expect(addButton(page)).toHaveText(`${n}문항 담기`);
  await expect(stepTab(page, /시험지 구성/)).toHaveText(/시험지 구성\s*0/);

  const 자리: Record<string, unknown> = {};
  for (const width of [1516, 1280]) {
    await page.setViewportSize({ width, height: 940 });
    자리[`폭_${width}`] = {
      바닥막대: await room(page, 'footer[aria-label="문제 제작 주요 작업"]'),
      바닥단추묶음: await room(
        page,
        'footer[aria-label="문제 제작 주요 작업"] > div:last-child',
      ),
      검수카드_머리: await room(
        page,
        'article[aria-label="문제 1 인식 결과"] [class*="cardHeading"]',
      ),
      검수카드_바닥: await room(
        page,
        'article[aria-label="문제 1 인식 결과"] [class*="cardFooter"]',
      ),
      비교칸: await page
        .getByLabel("원본과 인식 결과 비교")
        .evaluate((element) =>
          [...element.children].map((child) =>
            Math.round(child.getBoundingClientRect().width),
          ),
        ),
    };
  }

  // 담는다 — 원장님이 보신 그 화면.
  await page.setViewportSize({ width: 1516, height: 940 });
  await addButton(page).click();
  await expect(addButton(page)).toHaveText(/모두 담았습니다/);
  await expect(addButton(page)).toBeDisabled();
  expect(await picked(page)).toHaveLength(n);
  await expect(stepTab(page, /시험지 구성/)).toHaveText(
    new RegExp(`시험지 구성\\s*${n}$`),
  );
  await expect(footer(page)).toContainText(`${n}문항 담음`);
  // ③ 에는 문항별 «담음» 표시가 없다 — 담는 단계에서 무엇을 담았는지 안 보인다.
  const 검수단계_담음표시 = await page
    .getByLabel("원본과 인식 결과 비교")
    .getByText("담음", { exact: true })
    .count();
  expect(검수단계_담음표시).toBe(0);
  for (const width of [1516, 1280]) {
    await page.setViewportSize({ width, height: 940 });
    await page.screenshot({
      path: testInfo.outputPath(`현행-3단계-담은뒤-${width}.png`),
    });
  }

  // ② 로 가면 자른 문제 목록에 «담음»이 N 개 — 이 표시의 원천은 작업실 안의 `crop.added` 다.
  await page.setViewportSize({ width: 1516, height: 940 });
  await stepTab(page, /잘라내기/).click();
  const cropList = page.getByLabel("자른 문제 목록");
  await expect(cropList.getByText("담음", { exact: true })).toHaveCount(n);

  // ④ 에서 하나를 뺀다 — 담은 목록은 N-1 인데 작업실은 여전히 N 개 다 «담음».
  await page.getByRole("button", { name: "1번 문제 빼기" }).click();
  expect(await picked(page)).toHaveLength(n - 1);
  await expect(stepTab(page, /시험지 구성/)).toHaveText(
    new RegExp(`시험지 구성\\s*${n - 1}$`),
  );
  await expect(cropList.getByText("담음", { exact: true })).toHaveCount(n);
  await page.screenshot({
    path: testInfo.outputPath(`어긋남1-4단계에서-뺀뒤-2단계.png`),
  });
  await stepTab(page, /OCR · 디지털화/).click();
  // 뺀 문제를 작업실에서 다시 담을 길이 없다 — 단추가 «모두 담았습니다»로 잠겨 있다.
  await expect(addButton(page)).toHaveText(/모두 담았습니다/);
  await expect(addButton(page)).toBeDisabled();
  await expect(footer(page)).toContainText(`${n}문항 담음`);
  await page.screenshot({
    path: testInfo.outputPath(`어긋남1-4단계에서-뺀뒤-3단계.png`),
  });

  // 새 시험지 — 담은 목록은 0 인데 작업실은 N 개 다 «담음», 담기 단추는 여전히 잠김.
  await page.getByRole("button", { name: "새 시험지 (대역)" }).click();
  expect(await picked(page)).toHaveLength(0);
  await expect(footer(page)).toContainText(`${n}문항 담음`);
  await expect(addButton(page)).toBeDisabled();
  await page.screenshot({
    path: testInfo.outputPath(`어긋남2-새시험지-3단계.png`),
  });

  const 잰값 = { 자른문항: n, 자리, 검수단계_담음표시 };
  console.log(`[잰 값] ${JSON.stringify(잰값)}`);
  await testInfo.attach("잰 값", {
    body: JSON.stringify(잰값, null, 2),
    contentType: "application/json",
  });
  expect(errors).toEqual([]);
});

test("담은 뒤 «이 문제 검수 완료»만 눌러도 «담음»이 풀리고 «1문항 담기»가 다시 선다", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const n = await toReview(page);
  await addButton(page).click();
  await expect(addButton(page)).toHaveText(/모두 담았습니다/);
  const before = await picked(page);
  expect(before).toHaveLength(n);

  await page
    .getByLabel("문제 1 인식 결과")
    .getByRole("button", { name: "이 문제 검수 완료" })
    .click();
  // 내용은 그대로인데 «담음»이 풀렸다 — 시험지에는 아직 그 문제가 있다.
  await expect(addButton(page)).toHaveText(/1문항 담기/);
  await expect(footer(page)).toContainText(`${n - 1}문항 담음`);
  expect(await picked(page)).toHaveLength(n);
  await page.screenshot({
    path: testInfo.outputPath(`어긋남3-검수완료뒤-3단계.png`),
  });

  // 다시 담으면 같은 자리에서 갈린다(겹치지 않는다) — «담기»가 실은 «갱신»이다.
  await addButton(page).click();
  const after = await picked(page);
  expect(after.map((row) => row.id)).toEqual(before.map((row) => row.id));
  expect(after[0].reviewed).toBe(true);
  console.log(
    `[잰 값] ${JSON.stringify({ 담기전: before, 다시담은뒤: after })}`,
  );
  expect(errors).toEqual([]);
});
