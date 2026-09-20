/**
 * 🟢 **검수 화면과 HWPX 의 «도형 대 글자» 비례가 같은가** (원장님 2026-09-20).
 *
 * 원장님 말씀: «검수 단계에서의 도형과 텍스트 크기 비례가, hwpx로 내보내기했을때의
 * 도형과 텍스트 크기 비례가 일치하지 않음». 같은 이등변삼각형 ABC(치수 5·3·4)가
 * HWPX 에서 **엄청나게 작아지고** 치수 숫자가 뭉갰다.
 *
 * 고치기 전 실측 (이 하네스로 잰 값):
 *   검수      236.6px / 글자 14px   = 16.90
 *   지면·HWPX 105.8px / 글자 13.5px =  7.84   ← **2.2배 작다** (105.8px = 28mm 바닥값)
 * 뿌리는 자가 두 벌이었던 것이다 — 작업실이 다시 그린 SVG 가 `figureUrls` 의
 * data URL 로 실려 **스캔 자**(253dpi·바닥 28mm)를 탔다. 자세한 것은
 * `src/__tests__/unit/figureSvgDataUrlWidth.test.ts` 머리말.
 *
 * ⚠️ 여기 박는 것은 **고친 뒤 값**이다. 지금 상태를 못 박으면 결함이 계약이 된다.
 */
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  buildHwpxParts,
  HwpxPayloadSchema,
} from "../../src/lib/export/hwpxServer";
import { FIGURE_SVG_PRINT_MM } from "../../src/lib/figure/figureSvgFrame";
import { mmToCssPx } from "../../src/lib/figurePrintSize";

/** `writer.units` 와 같은 환산 — CSS px(96dpi) → HWPUNIT(1/7200 inch). */
const hwpunit = (px: number) => Math.round(px * 75);
const MID_PX = mmToCssPx(FIGURE_SVG_PRINT_MM.mid);
const WIDE_PX = mmToCssPx(FIGURE_SVG_PRINT_MM.wide);
/** 실측 문항 열 폭(`printGeometry.JASEUP_MEASURED_PX.problemColumn`). */
const PROBLEM_COLUMN_PX = 363.5;

interface Measured {
  review: { svgWidth: number; fontSize: number };
  sheet: { kind: string; width: number; fontSize: number }[];
}

const collect = (page: Page) =>
  page.evaluate((): Measured => {
    const round = (value: number) => Math.round(value * 100) / 100;
    const review = document.querySelector<HTMLElement>(
      '[data-probe="review"]',
    )!;
    const reviewSvg = review.querySelector("svg")!;
    const bodies = [
      ...document.querySelectorAll<HTMLElement>(
        "[data-mathgen-document] [data-problem-body]",
      ),
    ];
    return {
      review: {
        svgWidth: round(reviewSvg.getBoundingClientRect().width),
        fontSize: round(parseFloat(getComputedStyle(review).fontSize)),
      },
      sheet: bodies.map((body) => {
        const image = body.querySelector("img");
        const svg = body.querySelector("svg");
        const node = image ?? svg;
        return {
          kind: image ? "img" : svg ? "svg" : "none",
          width: node ? round(node.getBoundingClientRect().width) : 0,
          fontSize: round(parseFloat(getComputedStyle(body).fontSize)),
        };
      }),
    };
  });

test("검수·지면(화면)·지면(인쇄)·HWPX 가 같은 «도형 대 글자» 비례다", async ({
  page,
}, testInfo) => {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(String(error)));
  await page.goto("/");
  await page.waitForSelector("[data-mathgen-document] [data-unified-paper]");
  await page.waitForFunction(
    () =>
      document.querySelectorAll("[data-mathgen-document] [data-problem-body]")
        .length >= 4,
  );
  await page.waitForTimeout(800);

  const screen = await collect(page);
  await page.emulateMedia({ media: "print" });
  await page.waitForTimeout(300);
  const print = await collect(page);
  await page.emulateMedia({ media: "screen" });
  await page.waitForTimeout(300);

  const payload = HwpxPayloadSchema.parse(
    await page.evaluate(async () => {
      const root = document.querySelector<HTMLElement>(
        "[data-mathgen-document]",
      )!;
      const { pages } = await (
        window as unknown as {
          collectHwpxLayout: (element: HTMLElement) => Promise<{
            pages: { objects: unknown[] }[];
          }>;
        }
      ).collectHwpxLayout(root);
      return { title: "도형 비례 측정", pages };
    }),
  );
  const parts = await buildHwpxParts(payload);
  const images = payload.pages
    .flatMap((sheet) => sheet.objects)
    .filter((object) => object.type === "image");
  const xmlSizes = Object.entries(parts)
    .filter(([name]) => name.startsWith("Contents/section"))
    .flatMap(([, xml]) => [
      ...xml.matchAll(/<hp:pic\b[\s\S]*?<hp:sz width="(\d+)" height="(\d+)"/g),
    ])
    .map((match) => Number(match[1]));

  mkdirSync(testInfo.outputDir, { recursive: true });
  writeFileSync(
    path.join(testInfo.outputDir, "measured.json"),
    JSON.stringify({ screen, print, images, xmlSizes }, null, 2),
    "utf8",
  );
  expect(failures, failures.join("\n")).toEqual([]);

  // ① 작업실 경로(data URL SVG)와 ② 엔진 경로(인라인 SVG)가 **같은 폭**이다.
  expect(screen.sheet[0].kind).toBe("img");
  expect(screen.sheet[1].kind).toBe("svg");
  expect(screen.sheet[0].width).toBeCloseTo(MID_PX, 1);
  expect(screen.sheet[1].width).toBeCloseTo(MID_PX, 1);

  // ③ 그림이 없는 문항은 그림이 없다.
  expect(screen.sheet[2].kind).toBe("none");

  // ④ 아주 큰 그림(viewBox 900)은 `wide` 상한(70mm)에 선다 — 문항 열을 안 넘는다.
  expect(screen.sheet[3].width).toBeCloseTo(WIDE_PX, 1);
  expect(screen.sheet[3].width).toBeLessThan(PROBLEM_COLUMN_PX);

  // ⑤ **화면과 인쇄가 같다.** 갈리면 HWPX(화면 매체)와 PDF(인쇄 매체)가 갈린다.
  expect(print.sheet.map((row) => row.width)).toEqual(
    screen.sheet.map((row) => row.width),
  );
  expect(print.sheet.map((row) => row.fontSize)).toEqual(
    screen.sheet.map((row) => row.fontSize),
  );

  // ⑥ **HWPX 가 미리보기와 같은 크기**다 — 잰 값 → XML 까지.
  expect(images).toHaveLength(3);
  expect(images[0].w).toBeCloseTo(MID_PX, 1);
  expect(images[1].w).toBeCloseTo(MID_PX, 1);
  expect(images[2].w).toBeCloseTo(WIDE_PX, 1);
  expect(xmlSizes).toEqual(images.map((image) => hwpunit(image.w)));
  // 64mm = 18,141 HWPUNIT (1/7200 inch). 종이에서 실제로 64mm 로 나간다.
  expect((xmlSizes[0] / 7200) * 25.4).toBeCloseTo(FIGURE_SVG_PRINT_MM.mid, 1);
  expect((xmlSizes[2] / 7200) * 25.4).toBeCloseTo(FIGURE_SVG_PRINT_MM.wide, 1);

  // ⑦ **검수 화면과의 비례**가 맞는가 — 원장님의 기준. 15% 안이면 같은 비례로 본다.
  const reviewRatio = screen.review.svgWidth / screen.review.fontSize;
  const sheetRatio = screen.sheet[0].width / screen.sheet[0].fontSize;
  expect(reviewRatio).toBeGreaterThan(15);
  expect(sheetRatio / reviewRatio).toBeGreaterThan(0.85);
  expect(sheetRatio / reviewRatio).toBeLessThan(1.15);
});

/**
 * 「치수 숫자가 뭉갠다」의 **둘째 갈래를 지운다** — 해상도.
 * `hwpxLayout.png()` 는 캔버스를 배치 크기의 3배로 잡고 SVG 를 그린다. 브라우저가
 * SVG 를 **고유 크기로 래스터한 뒤 확대**한다면 3배 캔버스는 3배 흐린 그림이 된다.
 * 실측으로 Chromium 은 **목적지 크기로 래스터**한다 — 두 방식이 같은 값이 나온다.
 * 이 시험이 그 전제를 잠근다(브라우저가 바뀌어 전제가 깨지면 빨개진다).
 */
test("3배 캔버스가 정말 3배 해상도로 래스터된다", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    // viewBox 240 단위에 3단위 주기로 1단위 줄무늬. 배치 폭은 80px 이므로
    // **1배로 래스터하면 줄 하나가 1/3px** 이라 회색으로 뭉개진다.
    const stripes = Array.from(
      { length: 80 },
      (_, index) =>
        `<rect x="${index * 3}" y="0" width="1" height="60" fill="#000"/>`,
    ).join("");
    const svg = (width: number) =>
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 60" width="${width}" height="${width / 4}">${stripes}</svg>`;
    const draw = async (naturalWidth: number) => {
      const url = URL.createObjectURL(
        new Blob([svg(naturalWidth)], { type: "image/svg+xml" }),
      );
      const image = new Image();
      image.src = url;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = 240;
      canvas.height = 60;
      const context = canvas.getContext("2d")!;
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const row = context.getImageData(0, 30, canvas.width, 1).data;
      const grays: number[] = [];
      for (let index = 0; index < row.length; index += 4)
        grays.push(row[index]);
      const mean = grays.reduce((a, b) => a + b, 0) / grays.length;
      URL.revokeObjectURL(url);
      return Math.round(
        Math.sqrt(
          grays.reduce((a, b) => a + (b - mean) ** 2, 0) / grays.length,
        ),
      );
    };
    // 지금 코드가 하는 것(고유 80 · 캔버스 240) vs 고유 크기도 3배로 키운 것
    return { current: await draw(80), scaled: await draw(240) };
  });
  // 뭉개지면 표준편차가 무너진다 — 흑백이 갈려 있어야 100 을 넘는다.
  expect(result.current).toBeGreaterThan(100);
  expect(result.current).toBe(result.scaled);
});
