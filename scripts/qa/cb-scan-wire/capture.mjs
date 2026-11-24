import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const out = process.env.CB_WIRE_OUTPUT ?? "/tmp/cb-scan-wire-20261124";
const base = "http://127.0.0.1:4247";
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const printOnly = process.env.CB_WIRE_PHASE === "print";
const uiOnly = process.env.CB_WIRE_PHASE === "ui";
const prior =
  printOnly || uiOnly
    ? JSON.parse(await readFile(path.join(out, "evidence.json"), "utf8"))
    : null;
const errors = [],
  measurements = uiOnly ? prior.measurements : [],
  screens = printOnly ? prior.screens : [],
  requests = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (!url.startsWith(base) && !url.startsWith("data:")) {
      requests.push(url);
      return route.abort();
    }
    return route.continue();
  });
  const ready = async () => {
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator("[data-print-page]").first()).toBeVisible();
  };
  const capture = async (name) => {
    await page.screenshot({
      path: path.join(out, `${name}.png`),
      fullPage: true,
    });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    );
    screens.push({ name, width: page.viewportSize().width, overflow });
    expect(overflow, name).toBeLessThanOrEqual(1);
  };
  if (!printOnly) {
    await page.goto(base);
    await ready();
    for (const id of ["P1", "P2", "P3", "P4"]) {
      await page
        .getByRole("group", { name: "지면 QR 안", exact: true })
        .getByRole("button", { name: new RegExp(`^${id}`) })
        .click();
      await capture(`wide-paper-${id}`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await capture("phone-paper-P4");
    const face = async (name) =>
      page
        .getByRole("group", { name: "비교할 면" })
        .getByRole("button", { name: new RegExp(name) })
        .click();
    await face("나 · 촬영");
    for (const id of ["C1", "C2", "C3", "C4"]) {
      await page
        .getByRole("group", { name: "촬영 안", exact: true })
        .getByRole("button", { name: new RegExp(`^${id}`) })
        .click();
      await capture(`phone-capture-${id}`);
    }
    await page.getByLabel("보는 계정").selectOption("teacher");
    await page
      .getByRole("button", { name: "학생 고르기", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: "답안 주인 고르기" }),
    ).toBeVisible();
    await capture("phone-student-picker");
    await page
      .getByRole("button", { name: "학생 나 · 초5 B반", exact: true })
      .click();
    await expect(
      page.getByText("학생 나 · 초5 B반", { exact: true }),
    ).toBeVisible();
    for (const state of [
      "guest",
      "missing",
      "otherSheet",
      "otherPage",
      "legacy",
    ]) {
      await page.getByLabel("상태 표본").selectOption(state);
      await capture(`phone-capture-${state}`);
    }
    await page.getByLabel("상태 표본").selectOption("normal");
    await expect(
      page.getByRole("button", { name: "읽은 답 확인 상태 보기" }),
    ).toBeDisabled();
    await page.getByRole("button", { name: "2쪽 촬영 상태로 보기" }).click();
    await page.getByRole("button", { name: "3쪽 촬영 상태로 보기" }).click();
    await page.getByRole("button", { name: "읽은 답 확인 상태 보기" }).click();
    for (const id of ["V1", "V2", "V3", "V4"]) {
      await page
        .getByRole("group", { name: "읽은 답 확인 안" })
        .getByRole("button", { name: new RegExp(`^${id}`) })
        .click();
      await expect(page.locator("[data-answer-mark]")).toHaveCount(2);
      await capture(`phone-read-${id}`);
    }
    await page.getByLabel("확인할 쪽").selectOption("1");
    await page
      .getByRole("button", { name: "2쪽 ① 답 칸 입력으로 이동" })
      .click();
    await expect(
      page.getByLabel("내가 쓴 답", { exact: true }).first(),
    ).toBeFocused();
    await page.getByLabel("확인할 쪽").selectOption("0");
    await page
      .getByRole("group", { name: "읽은 답 확인 안" })
      .getByRole("button", { name: /^V3/ })
      .click();
    await page.getByRole("button", { name: "1쪽 ① 답 칸 확대" }).click();
    await expect(
      page.getByRole("dialog", { name: "1쪽 ① · 답 칸 확대" }),
    ).toBeVisible();
    await capture("phone-read-crop");
    await page.getByRole("button", { name: "닫기", exact: true }).click();
    const methods = page.getByLabel("입력 방법");
    await methods.first().selectOption("fraction");
    await page.getByLabel("분자", { exact: true }).fill("1");
    await page.getByLabel("분모", { exact: true }).fill("2");
    await page.getByRole("button", { name: "답에 넣기", exact: true }).click();
    await methods.first().selectOption("degree");
    await page.getByLabel("각도", { exact: true }).fill("60");
    await page.getByRole("button", { name: "답에 넣기", exact: true }).click();
    await methods.first().selectOption("coordinate");
    await page.getByLabel("x", { exact: true }).fill("2");
    await page.getByLabel("y", { exact: true }).fill("3");
    await page.getByRole("button", { name: "답에 넣기", exact: true }).click();
    await expect(
      page.getByLabel("내가 쓴 답", { exact: true }).first(),
    ).toHaveValue("1/2 60° (2, 3)");
    await capture("phone-read-math-input");

    await page.getByLabel("못 읽은 칸", { exact: true }).selectOption("zero");
    await expect(page.locator("[data-answer-mark]")).toHaveCount(0);
    await capture("phone-read-zero");
    await page.getByLabel("못 읽은 칸", { exact: true }).selectOption("some");
    for (let i = 0; i < 3; i++) {
      await page.getByLabel("확인할 쪽").selectOption(String(i));
      const inputs = page.getByLabel("내가 쓴 답", { exact: true });
      await expect(inputs).toHaveCount(2);
      await inputs.nth(0).fill("직접 입력 동작 확인용 글");
      await inputs.nth(1).fill("1/2 · 60° · (2, 3)");
    }
    await expect(page.getByText("직접 입력", { exact: true })).toHaveCount(2);
    await capture("phone-read-direct");
    await page
      .getByRole("button", { name: "수정 답의 결과 상태 보기" })
      .click();
    for (const id of ["R1", "R2", "R3", "R4"]) {
      await page
        .getByRole("group", { name: "결과 안", exact: true })
        .getByRole("button", { name: new RegExp(`^${id}`) })
        .click();
      await capture(`phone-result-${id}`);
    }
    for (const form of ["recall", "term", "cloze", "map", "figure"]) {
      await page.getByLabel("결과 형식").selectOption(form);
      await capture(`phone-result-form-${form}`);
    }
    await page.getByLabel("결과 형식").selectOption("term");
    await page.getByLabel("보는 계정").selectOption("teacher");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page
      .getByRole("button", { name: /판정 고치기/ })
      .first()
      .click();
    await page.getByLabel("수정 판정").selectOption("△");
    await page.getByLabel("수정 이유").fill("시안의 교사 수정 동작 확인");
    await page
      .getByRole("button", { name: "화면에 반영", exact: true })
      .click();
    await expect(
      page.getByText("교사 수정 · 시안의 교사 수정 동작 확인"),
    ).toBeVisible();
    await capture("wide-teacher-result-direct");
    for (const state of ["grading", "failed"]) {
      await page.getByLabel("채점 상태").selectOption(state);
      await capture(`wide-result-${state}`);
    }
  }
  if (!uiOnly)
    for (const option of ["P1", "P2", "P3", "P4"]) {
      for (const sample of ["single", "multi", "all"]) {
        await page.goto(`${base}/?proof=${option}&sample=${sample}`);
        await ready();
        await page.emulateMedia({ media: "print" });
        await page.addScriptTag({ path: require.resolve("jsqr/dist/jsQR.js") });
        const geometry = await page
          .locator("[data-print-page]")
          .evaluateAll((nodes) =>
            nodes.map((page) => {
              const r = page.getBoundingClientRect();
              const code = page
                .querySelector("[data-cb-code]")
                .getBoundingClientRect();
              const head = page
                .querySelector("[data-cb-head]")
                .getBoundingClientRect();
              const qr = page.querySelector("[data-wire-qr]");
              const q = qr?.getBoundingClientRect();
              const fit = page.querySelector("[data-cb-fit]");
              const fitRect = fit?.getBoundingClientRect();
              const bottoms = fit
                ? [...fit.querySelectorAll("*")]
                    .filter((e) => e.getClientRects().length)
                    .map((e) => e.getBoundingClientRect().bottom)
                : [];
              return {
                part: page.querySelector("[data-cb-part]").dataset.cbPart,
                form: page.querySelector("[data-cb-sheet]").dataset.cbSheet,
                page: Number(
                  page.querySelector("[data-cb-code-page]").dataset.cbCodePage,
                ),
                width: r.width,
                height: r.height,
                headHeight: head.height,
                footerBottomGap: r.bottom - code.bottom,
                bodyOverflow:
                  fitRect && bottoms.length
                    ? Math.max(0, Math.max(...bottoms) - fitRect.bottom)
                    : 0,
                qrMm: q ? (q.width * 25.4) / 96 : null,
                qrRightGapMm: q ? ((r.right - q.right) * 25.4) / 96 : null,
                modules: qr ? Number(qr.dataset.modules) : null,
              };
            }),
          );
        const qrChecks = await page
          .locator("[data-wire-qr]")
          .evaluateAll(async (imgs) => {
            return Promise.all(
              imgs.map(async (img) => {
                await img.decode();
                const mm = (img.getBoundingClientRect().width * 25.4) / 96;
                const checks = [96, 300].map((dpi) => {
                  const canvas = document.createElement("canvas");
                  canvas.width = canvas.height = Math.round((mm * dpi) / 25.4);
                  const ctx = canvas.getContext("2d");
                  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                  const data = ctx.getImageData(
                    0,
                    0,
                    canvas.width,
                    canvas.height,
                  );
                  return {
                    dpi,
                    pixels: canvas.width,
                    decoded:
                      window.jsQR(data.data, data.width, data.height)?.data ===
                      img.dataset.url,
                  };
                });
                return { url: img.dataset.url, checks };
              }),
            );
          });
        measurements.push({ option, sample, geometry, qrChecks });
        await page
          .locator("[data-print-page]")
          .first()
          .screenshot({
            path: path.join(out, `print-100-${option}-${sample}.png`),
          });
        await page.pdf({
          path: path.join(out, `print-${option}-${sample}.pdf`),
          format: "A4",
          printBackground: true,
          preferCSSPageSize: true,
        });
        for (const qr of qrChecks)
          for (const check of qr.checks.filter((c) => c.dpi === 300))
            expect(check.decoded, `${option} ${sample} ${check.dpi}dpi`).toBe(
              true,
            );
        await page.emulateMedia({ media: "screen" });
      }
    }
  expect(errors).toEqual([]);
  expect(requests).toEqual([]);
} finally {
  await writeFile(
    path.join(out, "evidence.json"),
    JSON.stringify({ screens, measurements, errors, requests }, null, 2),
  );
  await browser.close();
}
console.log(
  JSON.stringify({
    out,
    screens: screens.length,
    printCases: measurements.length,
    errors,
    externalRequests: requests.length,
  }),
);
