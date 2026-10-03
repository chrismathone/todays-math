import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const baseURL = "http://127.0.0.1:4336";
const out = path.resolve(
  scriptDirectory,
  "../../../docs/planning/tracks/reports/math-prerequisite-20261003/browser-shots",
);

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const contexts = [];
  const errors = [];
  async function open(key, width = 1280) {
    const context = await browser.newContext({
      baseURL,
      viewport: { width, height: 900 },
    });
    contexts.push(context);
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(`${key}: ${error.message}`));
    await page.goto(`/?student=${key}`, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    try {
      await page.waitForFunction(
        () =>
          !document.body.textContent.includes("불러오는 중") &&
          !!document.querySelector("button"),
        undefined,
        { timeout: 45000 },
      );
    } catch (error) {
      await page.screenshot({
        path: path.join(out, `error-${key}.png`),
        fullPage: true,
      });
      console.error(
        "Fixture page:",
        await page.locator("body").innerText(),
        "Page errors:",
        errors,
      );
      throw error;
    }
    assert.equal(
      await page.locator("vite-error-overlay, [data-nextjs-dialog]").count(),
      0,
    );
    assert.ok((await page.locator("body").innerText()).length > 40);
    return page;
  }
  try {
    const a = await open("A");
    await a
      .getByRole("heading", { name: "대분수의 뺄셈", exact: true })
      .waitFor();
    await a.waitForFunction(
      () =>
        !!document
          .querySelector('[aria-label="문제 내용"]')
          ?.textContent?.trim(),
    );
    await a.waitForFunction(() =>
      Array.from(
        document.querySelectorAll("button[data-answer-control]"),
      ).every((button) => button.querySelector(".katex")),
    );
    await a.screenshot({
      path: path.join(out, "student-a-check-pc.png"),
      fullPage: true,
    });
    if (process.argv[2] === "smoke") {
      const teacher = await open("teacher");
      await teacher
        .getByRole("heading", { name: "SRS 현황", exact: true })
        .waitFor();
      await teacher.screenshot({
        path: path.join(out, "teacher-smoke.png"),
        fullPage: true,
      });
      assert.deepEqual(errors, []);
      console.log(
        "SMOKE PASS: actual player and teacher dashboard load; no blank page, framework overlay or page error. Mock DB only.",
      );
      return;
    }
    const read = async (page) =>
      (await page.request.get("/__fixture/state")).json();
    const before = await read(a);
    const check = before.payload.course.learner.session;
    assert.equal(check.sectionId, "5-1-5-4");
    assert.ok(
      (await a.locator("body").innerText()).includes("분수의 뺄셈을 먼저 확인"),
    );
    for (const problem of check.problems) {
      // Match exact rendered choice text through the original choices, never a guessed answer.
      const choiceIndex = problem.answerChoices.indexOf(problem.answer);
      assert.ok(choiceIndex >= 0);
      await a
        .locator("button[data-answer-control]")
        .nth(choiceIndex)
        .waitFor({ state: "visible" });
      await a.locator("button[data-answer-control]").nth(choiceIndex).click();
      await a.waitForFunction(
        async ({ origin, sessionId, problemId }) => {
          const value = await (await fetch(`${origin}/__fixture/state`)).json();
          const course = value.payload.course;
          const sessions = [
            course.learner.session,
            ...course.history.map((entry) => entry.session),
          ];
          return sessions.some(
            (session) =>
              session?.id === sessionId &&
              session.attempts.some((entry) => entry.problemId === problemId),
          );
        },
        { origin: baseURL, sessionId: check.id, problemId: problem.id },
      );
      await a.waitForTimeout(1500);
    }
    await a
      .getByRole("heading", { name: "(분수)×(자연수)의 계산", exact: true })
      .waitFor();
    await a.waitForFunction(
      () =>
        document.querySelectorAll("button[data-answer-control]").length === 4 &&
        Array.from(
          document.querySelectorAll("button[data-answer-control]"),
        ).every((button) => button.querySelector(".katex")),
    );
    const after = await read(a);
    assert.equal(after.payload.course.learner.session.sectionId, "5-2-2-1");
    assert.equal(after.payload.course.learner.session.mode, "learn");
    assert.equal(after.payload.course.activity.at(-1).answered, 5);
    await a.screenshot({
      path: path.join(out, "student-a-return-pc.png"),
      fullPage: true,
    });
    for (const width of [390, 320]) {
      await a.setViewportSize({ width, height: 844 });
      assert.equal(
        await a.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await a.screenshot({
        path: path.join(out, `student-a-return-${width}.png`),
        fullPage: true,
      });
    }
    const b = await open("B", 390);
    await b
      .getByRole("heading", { name: "(분수)×(자연수)의 계산", exact: true })
      .waitFor();
    await b.waitForFunction(
      () =>
        !!document
          .querySelector('[aria-label="문제 내용"]')
          ?.textContent?.trim(),
    );
    const bState = await read(b);
    assert.equal(bState.payload.course.learner.session.sectionId, "5-2-2-1");
    assert.equal(bState.payload.course.learner.session.mode, "review");
    assert.equal(
      bState.payload.course.history.some(
        (entry) => entry.session.id === check.id,
      ),
      false,
    );
    assert.equal(bState.payload.course.learner.session.attempts.length, 0);
    await b.screenshot({
      path: path.join(out, "student-b-isolated.png"),
      fullPage: true,
    });
    if (process.argv[2] !== "students") {
      const teacher = await open("teacher");
      await teacher
        .getByRole("button", { name: "교육과정 연결도", exact: true })
        .click();
      await teacher
        .getByRole("region", { name: "교육과정 연결도", exact: true })
        .getByRole("searchbox", { name: /검색/ })
        .fill("M3-R02");
      await teacher.getByRole("button", { name: /M3-R02.*이차방정식/ }).click();
      assert.ok((await teacher.locator("body").innerText()).includes("M3-N01"));
      await teacher.screenshot({
        path: path.join(out, "teacher-graph-pc.png"),
        fullPage: true,
      });
      for (const width of [390, 320]) {
        await teacher.setViewportSize({ width, height: 844 });
        assert.equal(
          await teacher.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
        await teacher.screenshot({
          path: path.join(out, `teacher-graph-${width}.png`),
          fullPage: true,
        });
      }
    }
    assert.deepEqual(errors, []);
    const report = {
      fixture: "isolated mock DB; actual API handlers and React player",
      teacherGraphChecked: process.argv[2] !== "students",
      students: ["A", "B"],
      checkSession: check.id,
      returnedSession: after.payload.course.learner.session.id,
      aAnswered: 5,
      bAnswered: 0,
      pageErrors: errors,
      requests: after.requests,
    };
    fs.writeFileSync(
      path.join(out, "result.json"),
      `${JSON.stringify(report, null, 2)}\n`,
    );
    console.log(
      process.argv[2] === "students"
        ? "STUDENTS PASS: A check→target learn, B API/session isolation, PC/390/320; mock DB only. Teacher graph verified separately."
        : "FLOW PASS: A check→target learn, B isolated ordinary review, teacher graph, PC/390/320; mock DB only.",
    );
  } finally {
    for (const context of contexts) await context.close();
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
