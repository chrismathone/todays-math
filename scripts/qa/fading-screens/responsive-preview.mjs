import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

// Uses only the dev page's in-memory source. No student API or database writes.
const base = process.env.FADING_QA_URL ?? "http://127.0.0.1:4310";
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(base))
  throw new Error("A local dev URL is required.");
const output = resolve(".qa-artifacts/fading-responsive-preview");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.setDefaultTimeout(120_000);
const rows = [];
const errors = [];
const writes = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error" || /hydration|In HTML/i.test(message.text()))
    errors.push(message.text());
});
page.on("request", (request) => {
  if (
    request.method() !== "GET" &&
    /\/api\/(learn|math-srs|students)\//.test(request.url())
  )
    writes.push({ method: request.method(), url: request.url() });
});
function check(condition, message) {
  if (!condition) throw new Error(message);
}
async function sessionSnapshot() {
  return page.locator("[data-fading-session]").evaluate((session) =>
    JSON.stringify({
      step: session.dataset.step,
      slots: [...session.querySelectorAll("[data-fading-slot]")].map(
        (slot) => ({
          id: slot.dataset.fadingSlot,
          text: slot.textContent,
        }),
      ),
      chips: [...session.querySelectorAll("[data-fading-chip]")].map(
        (chip) => ({
          text: chip.textContent,
          selected: chip.getAttribute("aria-pressed"),
        }),
      ),
    }),
  );
}
async function capture(name) {
  await page.evaluate(() => document.fonts.ready);
  const row = await page.locator("[data-fading-root]").evaluate((root) => {
    const width = (node) => node?.getBoundingClientRect().width ?? null;
    const grid = root.querySelector('[class*="cardGrid"]');
    const heading = root.querySelector('[class*="featured"] h2');
    const tabs = root.querySelector('nav[aria-label="오늘의 기억 메뉴"]');
    const smallControls = [...root.querySelectorAll("button,a,input,select")]
      .filter((control) => {
        const style = getComputedStyle(control);
        if (
          !control.getClientRects().length ||
          style.visibility === "hidden" ||
          style.display === "none"
        )
          return false;
        const rect = control.getBoundingClientRect();
        return rect.width < 43.5 || rect.height < 43.5;
      })
      .map(
        (control) => control.getAttribute("aria-label") || control.textContent,
      );
    return {
      viewport: innerWidth,
      rootWidth: width(root),
      documentOverflow: Math.max(
        0,
        document.documentElement.scrollWidth - innerWidth,
      ),
      catalogColumns: grid
        ? getComputedStyle(grid).gridTemplateColumns.split(" ").length
        : null,
      featuredHeadingWidth: width(heading),
      featuredHeadingHeight: heading?.getBoundingClientRect().height ?? null,
      navigationPosition: tabs ? getComputedStyle(tabs).position : null,
      smallControls,
    };
  });
  rows.push({ name, ...row });
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: resolve(output, `${name}.png`),
    fullPage: true,
  });
  check(
    row.documentOverflow === 0,
    `${name}: document overflow ${row.documentOverflow}`,
  );
  check(
    row.smallControls.length === 0,
    `${name}: undersized controls ${row.smallControls.join(", ")}`,
  );
  if (row.featuredHeadingWidth !== null)
    check(
      row.featuredHeadingWidth >= 160,
      `${name}: squeezed featured heading ${row.featuredHeadingWidth}`,
    );
  console.log(
    `${name}: root=${row.rootWidth}, columns=${row.catalogColumns}, overflow=${row.documentOverflow}`,
  );
  return row;
}
async function previewCatalog(device, prefix) {
  await page
    .getByRole("button", { name: `${device} 미리 보기`, exact: true })
    .click();
  await page.getByRole("button", { name: "개념 목록", exact: true }).click();
  await page.getByRole("heading", { name: "개념 목록", exact: true }).waitFor();
  const primaryGrade = page.getByRole("button", { name: "초3", exact: true });
  if (await primaryGrade.count()) await primaryGrade.click();
  const row = await capture(
    `${prefix}-${device === "PC" ? "desktop" : "mobile"}-catalog`,
  );
  check(
    row.catalogColumns === (device === "PC" ? 3 : 1),
    `${prefix}: wrong ${device} catalog columns`,
  );
  check(
    device === "PC" ? row.rootWidth >= 1000 : row.rootWidth <= 450,
    `${prefix}: wrong ${device} frame width`,
  );
  await page
    .getByRole("button", { name: /단원 보기/ })
    .first()
    .click();
  const unit = await page
    .locator('[data-fading-catalog][data-unit="true"] h1')
    .innerText();
  await capture(`${prefix}-${device === "PC" ? "desktop" : "mobile"}-unit`);
  const other = device === "PC" ? "모바일" : "PC";
  await page
    .getByRole("button", { name: `${other} 미리 보기`, exact: true })
    .click();
  check(
    (await page
      .locator('[data-fading-catalog][data-unit="true"] h1')
      .innerText()) === unit,
    "Changing preview device lost the selected unit",
  );
  await page
    .getByRole("button", { name: `${device} 미리 보기`, exact: true })
    .click();
  await page
    .getByRole("button", { name: /개념 읽기/ })
    .first()
    .click();
  await page.getByRole("heading", { name: "개념 읽기", exact: true }).waitFor();
  await capture(`${prefix}-${device === "PC" ? "desktop" : "mobile"}-read`);
  await page
    .getByRole("button", { name: "복습에 추가하고 시작", exact: true })
    .click();
  await page.locator("[data-fading-session]").waitFor();
  const nextSentence = page.getByRole("button", {
    name: "다음 문장",
    exact: true,
  });
  while (await nextSentence.isEnabled()) await nextSentence.click();
  await page
    .getByRole("button", { name: "읽었어요 · 다음 단계", exact: true })
    .click();
  await page.locator('[data-fading-session][data-step="2"]').waitFor();
  await capture(`${prefix}-${device === "PC" ? "desktop" : "mobile"}-step2`);
}

async function teacherStates() {
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    for (const state of [
      "ready",
      "empty",
      "loading",
      "failure",
      "closed",
      "forbidden",
    ]) {
      await page.goto(
        `${base}/dev/fading-teacher-hifi?variant=H2&state=${state}`,
        { waitUntil: "networkidle" },
      );
      const region = page.getByRole("region", {
        name: "오늘의 기억 학생 현황",
        exact: true,
      });
      await region.waitFor();
      await page.evaluate(() => document.fonts.ready);
      const overflow = await page.evaluate(() =>
        Math.max(0, document.documentElement.scrollWidth - innerWidth),
      );
      rows.push({
        name: `teacher-${width}-${state}`,
        viewport: width,
        documentOverflow: overflow,
      });
      check(
        (await region.innerText()).trim().length > 0,
        `Teacher ${state} is blank`,
      );
      check(
        overflow === 0,
        `Teacher ${width} ${state}: document overflow ${overflow}`,
      );
      await page.screenshot({
        path: resolve(output, `teacher-${width}-${state}.png`),
        fullPage: true,
      });
    }
  }
}
async function navigatePreview(tab, scene) {
  await page.getByRole("button", { name: tab, exact: true }).click();
  if (scene === "catalog")
    await page.locator('[data-fading-catalog="true"]').waitFor();
  if (scene === "stats")
    await page.locator('[data-fading-stats="true"]').waitFor();
}

try {
  await teacherStates();
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    await page.goto(`${base}/dev/fading?scene=catalog`, {
      waitUntil: "networkidle",
    });
    await page.locator('[data-qa-ready="true"]').waitFor();
    const row = await capture(`student-${width}-catalog`);
    check(
      row.catalogColumns === (width >= 1024 ? 3 : width >= 680 ? 2 : 1),
      `Student catalog did not adapt at width ${width}`,
    );
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const device of ["모바일", "PC"]) {
    await page.goto(`${base}/dev/fading?preview=1`, {
      waitUntil: "networkidle",
    });
    await page
      .getByText("미리 보기 · 저장되지 않음", { exact: true })
      .waitFor();
    await previewCatalog(device, "preview");
    const sessionBefore = await sessionSnapshot();
    const other = device === "PC" ? "모바일" : "PC";
    await page
      .getByRole("button", { name: `${other} 미리 보기`, exact: true })
      .click();
    check(
      (await sessionSnapshot()) === sessionBefore,
      "Changing device reset the active session",
    );
  }
  // Exercise all four preview tabs, including empty statistics and erase entry.
  await page.goto(`${base}/dev/fading?preview=1`, { waitUntil: "networkidle" });
  for (const device of ["모바일", "PC"]) {
    await page
      .getByRole("button", { name: `${device} 미리 보기`, exact: true })
      .click();
    for (const [tab, scene] of [
      ["오늘의 복습", "home"],
      ["개념 소거", "erase"],
      ["학습 통계", "stats"],
    ]) {
      await navigatePreview(tab, scene);
      await capture(
        `preview-${device === "PC" ? "desktop" : "mobile"}-${scene}`,
      );
    }
  }
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`${base}/dev/fading?preview=1`, {
      waitUntil: "networkidle",
    });
    await page
      .getByRole("button", { name: "모바일 미리 보기", exact: true })
      .click();
    for (const [tab, scene] of [
      ["오늘의 복습", "home"],
      ["개념 소거", "erase"],
      ["개념 목록", "catalog"],
      ["학습 통계", "stats"],
    ]) {
      await navigatePreview(tab, scene);
      const row = await capture(`preview-${width}-${scene}`);
      if (scene === "catalog")
        check(row.catalogColumns === 1, `Preview catalog missing at ${width}`);
    }
  }
  // The actual teacher preview host adds another layout boundary.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${base}/dev/fading-teacher-hifi?variant=H2`, {
    waitUntil: "networkidle",
  });
  await page.getByRole("button", { name: "미리 보기", exact: true }).click();
  await page.locator("[data-fading-root]").waitFor();
  for (const device of ["모바일", "PC"]) {
    await page
      .getByRole("button", { name: `${device} 미리 보기`, exact: true })
      .click();
    await page.getByRole("button", { name: "개념 목록", exact: true }).click();
    await capture(`teacher-${device === "PC" ? "desktop" : "mobile"}-catalog`);
  }
  check(errors.length === 0, `Browser errors: ${errors.join("; ")}`);
  check(writes.length === 0, "Preview sent a student API write");
} catch (error) {
  errors.push(String(error));
  await page.screenshot({
    path: resolve(output, "failure.png"),
    fullPage: true,
  });
  console.error(String(error));
  process.exitCode = 1;
} finally {
  await writeFile(
    resolve(output, "results.json"),
    JSON.stringify({ rows, errors, writes }, null, 2),
  );
  await browser.close();
}
