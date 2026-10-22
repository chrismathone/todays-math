import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { chromium, expect } from "@playwright/test";
import { startServer } from "./server.mjs";
import generated from "./generated-v2.json" with { type: "json" };

if (!process.argv.includes("--browser-granted"))
  throw Error("Coordinator browser/server lease is required.");
const output = process.env.QA_OUTPUT;
const material = process.argv.includes("--material-only");
const view = generated.scenarios.ready[0];
const snapshot = view.pilot;
const currentRecordLabel = `기록 ${view.observations.length + snapshot.evidence.findIndex((item) => item.purposes.includes("section-current")) + 1}`;
assert.ok(output, "QA_OUTPUT must name the external evidence directory.");
assert.ok(
  process.env.QA_CHROMIUM_EXECUTABLE,
  "An installed executable is required; browser downloads are forbidden.",
);
const productFiles = [
  "src/components/math-srs/LearningInsightPanel.tsx",
  "src/components/math-srs/LearningInsightPanel.module.css",
  "src/components/math-srs/courseApi.ts",
  "src/components/ui/AutoGrowTextarea.tsx",
  "scripts/qa/math-insight-ui/generated-v2.json",
];
const productBytes = async () =>
  Object.fromEntries(
    await Promise.all(
      productFiles.map(async (file) => [
        file,
        createHash("sha256")
          .update(await readFile(file))
          .digest("hex"),
      ]),
    ),
  );
const productRef = "83901c9ab6b3698548574dd914a0af324f7e70d6";
for (const file of productFiles.filter((file) => file.startsWith("src/")))
  assert.ok(
    execFileSync("git", ["show", `${productRef}:${file}`]).equals(
      await readFile(file),
    ),
    `${file}: unchanged tested product source`,
  );
const sourceBefore = await productBytes();
const featureOffText = "현재 선수 확인 기능이 꺼져 있습니다.";
assert.equal(generated.stateSchema.validator, "storedCourseSchema");
assert.equal(generated.stateSchema.allScenariosValid, true);
assert.equal(
  generated.stateSchema.scenarioCount,
  Object.keys(generated.scenarios).length,
);
assert.ok(generated.stateSchema.scenarioCount >= 14);
for (const [scene, snapshots] of Object.entries(generated.scenarios)) {
  assert.deepEqual(generated.scenarioValidation[scene], {
    schemaValid: true,
    projections: snapshots.length,
  });
  const feature = generated.scenarioFlags[scene]?.MATH_PREREQ_CHECK;
  assert.ok(
    ["on", "off"].includes(feature),
    `${scene}: declared feature setting`,
  );
  for (const snapshot of snapshots) {
    const facts = snapshot.facts.filter((fact) =>
      fact.id.startsWith("fact:candidate:"),
    );
    assert.ok(
      facts.length &&
        facts.every(
          (fact) => fact.text.includes(featureOffText) === (feature === "off"),
        ),
      `${scene}: feature text consistent`,
    );
    if (feature === "off")
      assert.ok(
        snapshot.pilot.nextChecks.every((candidate) => !candidate.eligible),
      );
    if (scene === "ready")
      assert.ok(
        snapshot.pilot.nextChecks.some((candidate) => candidate.eligible),
      );
  }
}
await mkdir(output, { recursive: true });
let server, browser, currentPage;
const captures = [],
  errors = [],
  rejected = [],
  checks = [];
let failure;
async function capture(page, name, hasMath = false) {
  await page.evaluate(() => document.fonts.ready);
  const metrics = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - innerWidth,
    font: getComputedStyle(document.querySelector("h1")).fontFamily,
    pretendard: [...document.fonts].some(
      (font) => font.family === "InsightPretendard" && font.status === "loaded",
    ),
    katex: [...document.fonts]
      .filter((font) => font.family.startsWith("KaTeX"))
      .map((font) => ({ family: font.family, status: font.status })),
    katexErrors: document.querySelectorAll(".katex-error").length,
    brokenImages: [...document.images]
      .filter((image) => !image.complete || !image.naturalWidth)
      .map((image) => image.src),
  }));
  assert.equal(metrics.overflow, 0, `${name}: document overflow`);
  assert.ok(
    metrics.pretendard && metrics.font.includes("InsightPretendard"),
    `${name}: product font`,
  );
  assert.equal(metrics.katexErrors, 0);
  assert.deepEqual(metrics.brokenImages, []);
  if (hasMath)
    assert.ok(
      metrics.katex.some(
        (font) => font.family === "KaTeX_Main" && font.status === "loaded",
      ),
      "actual KaTeX font loaded",
    );
  assert.ok(
    metrics.katex.every((font) => font.status !== "error"),
    "no failed KaTeX font",
  );
  await page.screenshot({
    path: path.join(output, `${name}.png`),
    fullPage: true,
  });
  captures.push({ name, ...metrics });
}
try {
  server = await startServer();
  const origin = new URL(server.resolvedUrls.local[0]).origin;
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.QA_CHROMIUM_EXECUTABLE,
  });
  for (const width of [390, 1440]) {
    const page = await browser.newPage({
      viewport: { width, height: 900 },
      reducedMotion: "reduce",
    });
    currentPage = page;
    await page.exposeFunction("recordQaWindowError", (message) =>
      errors.push(`window: ${message}`),
    );
    await page.addInitScript(() =>
      window.addEventListener("error", (event) => {
        void window.recordQaWindowError(event.message);
      }),
    );
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== origin || url.pathname.startsWith("/api/")) {
        rejected.push(url.href);
        return route.abort();
      }
      return route.continue();
    });
    const open = async (scene) => {
      await page.goto(`${origin}/?scene=${scene}`);
      await page.getByRole("button", { name: /^예시 가람 상세 보기$/ }).click();
      await page
        .getByRole("heading", { name: "다시 살펴볼 학습 근거" })
        .waitFor();
    };
    for (const scene of material
      ? ["ready", "outside"]
      : [
          "ready",
          "feature-off",
          "loading",
          "empty",
          "outside",
          "error",
          "inconsistent",
          "paused",
          "future",
          "stale",
          "missing-source",
          "unfinished",
          "multiple-grades",
          "grade-3",
          "grade-4",
          "grade-5",
          "grade-6",
        ]) {
      await open(scene);
      if (scene === "loading")
        await expect(page.getByText("학습 근거를 불러오는 중…")).toBeVisible();
      else if (["error", "inconsistent"].includes(scene))
        await expect(page.getByRole("alert")).toBeVisible();
      else
        await expect(
          page.getByRole("textbox", { name: "학습 근거에 관해 질문하기" }),
        ).toBeVisible();
      assert.equal(
        await page.evaluate(
          () =>
            window.insightQa.calls.filter((call) => call.method === "POST")
              .length,
        ),
        0,
        `${scene}: no automatic POST`,
      );
      if (["ready", "feature-off"].includes(scene)) {
        const feature = generated.scenarioFlags[scene].MATH_PREREQ_CHECK;
        await expect(
          page.getByText(featureOffText, { exact: false }),
        ).toHaveCount(feature === "off" ? 2 : 0);
        await expect(page.getByText(/ · 현재 확인 후보$/)).toHaveCount(
          feature === "on" ? 2 : 0,
        );
        await expect(
          page.getByText(/ · 현재 학생의 확인 후보로 고르지 않음$/),
        ).toHaveCount(feature === "off" ? 2 : 0);
        await expect(
          page.getByRole("heading", { name: "보존된 코스 관찰" }),
        ).toBeVisible();
        checks.push({
          width,
          scene,
          MATH_PREREQ_CHECK: feature,
          candidateTextConsistent: true,
          automaticPosts: 0,
        });
      }
      await capture(
        page,
        `${width}-${scene}`,
        ["ready", "outside"].includes(scene),
      );
      if (scene === "ready") {
        await page
          .getByRole("heading", { name: "다시 살펴볼 학습 근거" })
          .evaluate((element) =>
            window.scrollTo(
              0,
              element.getBoundingClientRect().top + scrollY - 88,
            ),
          );
        await page.screenshot({
          path: path.join(output, `${width}-ready-detail.png`),
        });
      }
    }
    for (const scene of material
      ? ["ready"]
      : [
          "ready",
          "feature-off",
          "unavailable",
          "ai-error",
          "unknown-error",
          "ai-inconsistent",
          "insufficient",
        ]) {
      await open(scene);
      const question = page.getByRole("textbox", {
        name: "학습 근거에 관해 질문하기",
      });
      await question.fill("어떤 기록과 다음 확인 후보를 볼까요?");
      await question.focus();
      await page.keyboard.press("Tab");
      const submit = page.getByRole("button", { name: "AI에 근거 질문하기" });
      await expect(submit).toBeFocused();
      const control = await submit.evaluate((element) => ({
        height: element.getBoundingClientRect().height,
        outline: getComputedStyle(element).outlineColor,
        width: getComputedStyle(element).outlineWidth,
      }));
      assert.ok(
        control.height >= 44 && control.width === "3px",
        "44px button with visible keyboard focus",
      );
      await page.keyboard.press("Enter");
      if (
        [
          "unavailable",
          "ai-error",
          "unknown-error",
          "ai-inconsistent",
        ].includes(scene)
      ) {
        await expect(page.getByRole("alert")).toContainText(
          "위 학습 근거는 계속 확인",
        );
        await expect(question).toHaveValue(
          "어떤 기록과 다음 확인 후보를 볼까요?",
        );
      } else
        await expect(
          page.getByText(
            scene === "insufficient"
              ? "질문에 답할 근거가 부족합니다"
              : "질문에 연결된 근거",
            { exact: true },
          ),
        ).toBeVisible();
      await expect(
        page.getByText(snapshot.nextChecks[0].title, { exact: true }).first(),
      ).toBeVisible();
      assert.equal(
        await page.evaluate(
          () =>
            window.insightQa.calls.filter((call) => call.method === "POST")
              .length,
        ),
        1,
      );
      if (scene === "ready") {
        const link = page
          .getByRole("link", { name: currentRecordLabel, exact: true })
          .first();
        await link.focus();
        await page.keyboard.press("Enter");
        const target = page.locator(
          `[id="${await link.getAttribute("href").then((value) => value.slice(1))}"]`,
        );
        await expect(target).toBeFocused();
        await expect(target.locator("..").locator("..")).toHaveAttribute(
          "open",
          "",
        );
        await expect(
          page
            .locator("details[open]")
            .getByText("관찰에서 제외", { exact: false }),
        ).toBeVisible();
        await expect(
          page.getByText("최근 상태와 확인 후보 판단에 사용", { exact: true }),
        ).toBeVisible();
        await expect(
          page.getByText(
            "확인 후보 판단에만 사용 · 최근 상태 수치에 더하지 않음",
            { exact: true },
          ),
        ).toBeVisible();
      }
      if (scene === "feature-off") {
        const inquiry = generated.featureOffInquiries[0];
        assert.ok(inquiry.facts.some((fact) => fact.kind === "observation"));
        for (const fact of inquiry.facts)
          await expect(
            page.getByText(fact.text, { exact: true }).last(),
          ).toBeVisible();
        await expect(page.getByText(/ · 현재 확인 후보$/)).toHaveCount(0);
        await expect(
          page.getByText(featureOffText, { exact: false }),
        ).toHaveCount(2);
        checks.push({
          width,
          scene,
          MATH_PREREQ_CHECK: "off",
          factualInquiryUsable: true,
        });
      }
      await capture(page, `${width}-${scene}-question`, true);
      checks.push({ width, scene, ...control });
    }
    if (!material) {
      await open("ready");
      const growField = page.getByRole("textbox");
      const settleResize = () =>
        page.evaluate(
          () =>
            new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve)),
            ),
        );
      const longQuestion =
        "합성 질문을 여러 줄로 길게 적어 읽기와 폭 변경을 확인합니다. ".repeat(
          12,
        );
      await growField.fill(longQuestion);
      await growField.focus();
      await page.setViewportSize({ width: 1440, height: 900 });
      await settleResize();
      await expect
        .poll(() =>
          growField.evaluate(
            (field) => field.scrollHeight <= field.clientHeight + 1,
          ),
        )
        .toBe(true);
      const wideHeight = await growField.evaluate(
        (field) => field.clientHeight,
      );
      await page.setViewportSize({ width: 390, height: 900 });
      await settleResize();
      await expect
        .poll(() => growField.evaluate((field) => field.clientHeight))
        .toBeGreaterThan(wideHeight);
      await expect(growField).toBeFocused();
      await expect(growField).toHaveValue(longQuestion);
      await expect
        .poll(() =>
          growField.evaluate(
            (field) => field.scrollHeight <= field.clientHeight + 1,
          ),
        )
        .toBe(true);
      await capture(page, `${width}-resize-narrow`, true);
      const narrowHeight = await growField.evaluate(
        (field) => field.clientHeight,
      );
      await page.setViewportSize({ width: 1440, height: 900 });
      await settleResize();
      await expect
        .poll(() => growField.evaluate((field) => field.clientHeight))
        .toBeLessThan(narrowHeight);
      await growField.fill("짧게");
      await expect
        .poll(() => growField.evaluate((field) => field.clientHeight))
        .toBeLessThan(wideHeight);
      await expect(growField).toBeFocused();
      await expect(growField).toHaveValue("짧게");
      assert.equal(
        await page.evaluate(
          () =>
            window.insightQa.calls.filter((call) => call.method === "POST")
              .length,
        ),
        0,
      );
      checks.push({
        width,
        textareaGrowShrinkResize: true,
        wideHeight,
        narrowHeight,
      });
      await page.setViewportSize({ width, height: 900 });
      await open("ready");
      const genericLink = page
        .getByRole("link", { name: "기록 1", exact: true })
        .first();
      await genericLink.focus();
      await page.keyboard.press("Enter");
      const genericTarget = page.locator(
        `[id="${(await genericLink.getAttribute("href")).slice(1)}"]`,
      );
      await expect(genericTarget).toBeFocused();
      await expect(genericTarget).toContainText("보존 세션");
      await capture(page, `${width}-generic-citation`, true);
      checks.push({ width, genericCitationRevealedAndFocused: true });
      for (const scene of ["conflict", "stale-auth", "auth-denied"]) {
        await open(scene);
        const field = page.getByRole("textbox");
        await field.fill("바뀐 기록에도 남아 있는 질문");
        await field.press("Enter");
        if (scene === "conflict") {
          await expect(
            page.getByText(/이전 답변과 근거를 닫았습니다/),
          ).toBeVisible();
          await expect(field).toBeEnabled();
          await expect(
            page.getByRole("heading", { name: "보존된 코스 관찰" }),
          ).toBeVisible();
          const oldFact = view.facts.find(
            (fact) =>
              fact.kind === "observation" &&
              fact.evidenceIds.some((key) =>
                view.observations.some(
                  (record) => record.id === key && record.included,
                ),
              ),
          );
          await expect(
            page.getByText(oldFact.text, { exact: true }),
          ).toHaveCount(0);
        } else {
          await expect(page.getByRole("alert")).toBeVisible();
          await expect(
            page.getByRole("heading", { name: "보존된 코스 관찰" }),
          ).toHaveCount(0);
          await expect(field).toBeDisabled();
        }
        await expect(field).toHaveValue("바뀐 기록에도 남아 있는 질문");
        await expect(
          page.getByText("질문에 연결된 근거", { exact: true }),
        ).toHaveCount(0);
        const calls = await page.evaluate(() =>
          window.insightQa.calls.filter((call) =>
            call.url.includes("/insight"),
          ),
        );
        assert.equal(calls.filter((call) => call.method === "POST").length, 1);
        assert.equal(
          calls.filter((call) => call.method === "GET").length,
          scene === "auth-denied" ? 1 : 2,
        );
        assert.ok(calls.every((call) => call.version === "2"));
        await capture(page, `${width}-${scene}`, true);
        checks.push({
          width,
          scene,
          posts: 1,
          readsAfterConflict: scene === "auth-denied" ? 0 : 1,
          automaticReposts: 0,
        });
      }
      await open("late-post");
      const field = page.getByRole("textbox");
      await field.fill("취소할 질문");
      await field.press("Enter");
      await field.locator("..").evaluate((form) => form.requestSubmit());
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              window.insightQa.calls.filter((call) => call.method === "POST")
                .length,
          ),
        )
        .toBe(1);
      await page.getByRole("button", { name: "질문 취소" }).click();
      await page.evaluate(() => window.insightQa.release());
      await expect(field).toBeEnabled();
      await expect(field).toHaveValue("취소할 질문");
      await expect(
        page.getByText("질문에 연결된 근거", { exact: true }),
      ).toHaveCount(0);
      assert.ok(
        await page.evaluate(() =>
          window.insightQa.calls.some(
            (call) => call.method === "POST" && call.aborted,
          ),
        ),
      );
      await capture(page, `${width}-cancel-duplicate`, true);
      checks.push({
        width,
        canceledLateAnswerIgnored: true,
        enterDuplicateSinglePost: true,
      });
    }
    for (const scene of material ? [] : ["late-get", "late-post"]) {
      await open(scene);
      if (scene === "late-post") {
        await page.getByRole("textbox").fill("늦게 도착하는 질문");
        await page.getByRole("button", { name: "AI에 근거 질문하기" }).click();
        await expect(
          page.getByText("질문에 맞는 근거를 확인하는 중…"),
        ).toBeVisible();
      }
      await page.getByRole("button", { name: /^예시 나래 상세 보기$/ }).click();
      await expect(
        page.getByRole("heading", { name: "예시 나래 · 학습 상세" }),
      ).toBeVisible();
      await expect(page.getByRole("textbox")).toHaveValue("");
      await page.evaluate(() => window.insightQa.release());
      await expect(
        page.getByText("질문에 연결된 근거", { exact: true }),
      ).toHaveCount(0);
      assert.ok(
        await page.evaluate(() =>
          window.insightQa.calls.some(
            (call) =>
              call.aborted &&
              call.url.includes("11111111-1111-4111-8111-111111111111") &&
              call.method ===
                (new URLSearchParams(location.search).get("scene") ===
                "late-get"
                  ? "GET"
                  : "POST"),
          ),
        ),
        "old context aborted",
      );
      await capture(page, `${width}-${scene}-switched`, true);
    }
    if (!material) {
      await open("late-post");
      await page.getByRole("textbox").fill("새로고침 전 질문");
      await page.getByRole("button", { name: "AI에 근거 질문하기" }).click();
      await page
        .getByRole("button", { name: "학습 근거 새로고침", exact: true })
        .click();
      await expect(page.getByRole("textbox")).toBeVisible();
      await page.evaluate(() => window.insightQa.release());
      await expect(
        page.getByText("질문에 연결된 근거", { exact: true }),
      ).toHaveCount(0);
      assert.deepEqual(await page.evaluate(() => window.insightQa.blocked), []);
      checks.push({ width, reloadRejectsLatePost: true });
    }
    await page.close();
  }
  assert.deepEqual(
    await productBytes(),
    sourceBefore,
    "QA product bytes changed during verification",
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(rejected, []);
} catch (error) {
  failure = error instanceof Error ? error.stack : String(error);
  if (currentPage && !currentPage.isClosed()) {
    await currentPage.screenshot({
      path: path.join(output, "failure.png"),
      fullPage: true,
    });
    await writeFile(
      path.join(output, "failure-page.txt"),
      await currentPage.locator("body").innerText(),
    );
    await writeFile(
      path.join(output, "failure-calls.json"),
      JSON.stringify(
        await currentPage.evaluate(() => window.insightQa),
        null,
        2,
      ),
    );
  }
} finally {
  await browser?.close();
  await server?.close();
  await writeFile(
    path.join(output, "results.json"),
    JSON.stringify(
      {
        backendFreeze: generated.backendFreeze,
        productRef,
        scenarioFlags: generated.scenarioFlags,
        stateSchema: generated.stateSchema,
        scenarioValidation: generated.scenarioValidation,
        projectionSourceHashes: generated.sourceHashes,
        candidateWrapper: generated.candidateWrapper,
        productBytes: sourceBefore,
        captures,
        checks,
        errors,
        rejected,
        failure: failure ?? null,
        resourcesClosed: true,
      },
      null,
      2,
    ),
  );
}
if (failure) throw Error(failure);
console.log(
  JSON.stringify({
    captures: captures.length,
    checks: checks.length,
    errors: errors.length,
    rejected: rejected.length,
    resourcesClosed: true,
  }),
);
