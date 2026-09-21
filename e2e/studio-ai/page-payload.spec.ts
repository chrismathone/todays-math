import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * 트랙 39 (2026-09-21) — 원장님 화면 «5쪽 · Unexpected token 'R', "Request En"... is not valid JSON».
 * 작업실이 쪽 그림을 긴 변 2200px PNG 로 보내 운영(Vercel, 본문 상한 4.5MB)이 평문 413 을 냈다.
 * 원장님 PDF 다섯 쪽은 크롬에서 data URL 4,767,858~5,094,934자였다.
 *
 * 🔴 빈 쪽으로 재면 «안 넘는다»는 거짓 결론이 나온다 — 여기 표본은 **스캔처럼 잡티가 깔린 그림**을
 * PDF 에 넣은 것이다(실제 기출·학생 자료 없음). 시험 머리에서 그 PNG 가 4.5MB 를 넘는지부터 단정한다.
 * 길이는 **브라우저의 실제 인코더**가 만든 것을 잰다(jsdom 은 그림을 못 만든다).
 */
const VERCEL_BODY_LIMIT = 4_500_000;
const BUDGET = 3_000_000;

/** 가로 A4 스캔 한 장(880×621pt — pdf.js 가 2.5배로 그려 2200×1553)을 JPEG 로 넣은 PDF. */
function scannedPdf(jpeg: Buffer, width: number, height: number) {
  const parts: Buffer[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (chunk: string | Buffer) => {
    const buffer = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
    parts.push(buffer);
    length += buffer.length;
  };
  const content = "q 880 0 0 621 0 0 cm /Im1 Do Q";
  const objects: (string | Buffer[])[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Count 1 /Kids [3 0 R] >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 880 621] /Resources << /XObject << /Im1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    [
      Buffer.from(
        `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
      ),
      jpeg,
      Buffer.from("\nendstream"),
    ],
  ];
  push("%PDF-1.4\n");
  objects.forEach((object, index) => {
    offsets.push(length);
    push(`${index + 1} 0 obj\n`);
    if (typeof object === "string") push(object);
    else object.forEach(push);
    push("\nendobj\n");
  });
  const start = length;
  push(
    `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets
      .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
      .join(
        "",
      )}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`,
  );
  return Buffer.concat(parts);
}

/** 브라우저에서 스캔 같은 쪽을 그린다 — 회색 종이 잡티 + 빽빽한 글줄. 씨앗을 박아 매번 같다. */
async function scanJpeg(page: Page) {
  const base64 = await page.evaluate(() => {
    const width = 2200;
    const height = 1553;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#d8d8d8";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "#111";
    context.font = "26px serif";
    for (let y = 60; y < height - 40; y += 38)
      for (let x = 60; x < width - 300; x += 540)
        context.fillText("19. 다음 그림에서 ∠x+∠y 의 크기는? [5점]", x, y);
    const pixels = context.getImageData(0, 0, width, height);
    let seed = 20260921;
    for (let i = 0; i < pixels.data.length; i += 4) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const grain = (seed % 25) - 12;
      for (let c = 0; c < 3; c++)
        pixels.data[i + c] = Math.max(
          0,
          Math.min(255, pixels.data[i + c] + grain),
        );
    }
    context.putImageData(pixels, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.9).split(",")[1];
  });
  return scannedPdf(Buffer.from(base64, "base64"), 2200, 1553);
}

type Post = { body: string; image: string };
type Reply = {
  status?: number;
  contentType?: string;
  body?: string;
  json?: unknown;
};
async function openStudio(page: Page, reply: (post: Post) => Reply) {
  const posts: Post[] = [];
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
    const body = route.request().postData() ?? "";
    const post = { body, image: JSON.parse(body).imageDataUrl as string };
    posts.push(post);
    await route.fulfill(reply(post));
  });
  await page.goto("/");
  await page.getByLabel("PDF 또는 이미지 파일 가져오기").setInputFiles({
    name: "scanned-exam.pdf",
    mimeType: "application/pdf",
    buffer: await scanJpeg(page),
  });
  const image = page.getByRole("img", {
    name: "scanned-exam.pdf, 1쪽 원본",
    exact: true,
  });
  await expect(image).toBeVisible();
  return { posts, image };
}

const emptyPage = {
  json: {
    provider: "codex",
    action: "page-ocr",
    result: {
      content: "",
      answer: "",
      solution: "",
      warnings: [],
      problems: [],
    },
  },
};
const size = (page: Page, dataUrl: string) =>
  page.evaluate(async (src) => {
    const image = new Image();
    image.src = src;
    await image.decode();
    return [image.naturalWidth, image.naturalHeight];
  }, dataUrl);

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 923 });
});

test("빽빽한 스캔 쪽은 해상도를 지킨 채 본문 상한 아래로 나간다 — 실제 인코더의 길이", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const { posts, image } = await openStudio(page, () => emptyPage);
  // 표본이 정말 무거운가 — 지금까지처럼 PNG 로 보냈으면 413 이었을 쪽이어야 한다
  const png = (await image.getAttribute("src"))!;
  expect(png.startsWith("data:image/png;base64,")).toBe(true);
  expect(png.length).toBeGreaterThan(VERCEL_BODY_LIMIT);
  await page
    .getByRole("button", { name: "페이지 자동 인식", exact: true })
    .click();
  await expect.poll(() => posts.length).toBe(1);
  const [post] = posts;
  expect(post.body.length).toBeLessThan(VERCEL_BODY_LIMIT);
  expect(post.image.length).toBeLessThanOrEqual(BUDGET);
  expect(post.image.startsWith("data:image/webp;base64,")).toBe(true);
  expect(await size(page, post.image)).toEqual(await size(page, png));
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("413 평문이 와도 파서 오류가 아니라 사람 문구가 나온다 — 한 번 더 줄여 보내고 멈춘다", async ({
  page,
}) => {
  const { posts } = await openStudio(page, () => ({
    status: 413,
    contentType: "text/plain; charset=utf-8",
    body: "Request Entity Too Large",
  }));
  await page
    .getByRole("button", { name: "페이지 자동 인식", exact: true })
    .click();
  // 원장님이 보신 «5쪽 · …» 줄은 진행 상세 패널 안에 있다
  await expect(
    page.getByRole("button", { name: /작업 진행 상세 .*확인 필요 1건/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /작업 진행 상세/ }).click();
  const alert = page.getByRole("alert").filter({ hasText: "1쪽 ·" });
  await expect(alert).toContainText(
    "1쪽 · 그림이 너무 커서 보내지 못했습니다. 원본을 더 작은 해상도로 다시 가져와 주세요.",
  );
  await expect(alert).not.toContainText(/Unexpected token|JSON/);
  expect(posts).toHaveLength(2);
  expect(posts[1].image.length).toBeLessThanOrEqual(posts[0].image.length / 2);
});

test("90° 돌린 가로 쪽은 세로로 보낸다 — 폭과 높이가 바뀐다", async ({
  page,
}) => {
  const { posts, image } = await openStudio(page, () => emptyPage);
  const [width, height] = await size(page, (await image.getAttribute("src"))!);
  expect(width).toBeGreaterThan(height);
  await page.getByRole("button", { name: "현재 페이지 90도 회전" }).click();
  await expect
    .poll(async () => (await size(page, (await image.getAttribute("src"))!))[0])
    .toBe(height);
  await page
    .getByRole("button", { name: "페이지 자동 인식", exact: true })
    .click();
  await expect.poll(() => posts.length).toBe(1);
  expect(await size(page, posts[0].image)).toEqual([height, width]);
});
