import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const out = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../docs/planning/tracks/reports/math-prerequisite-20261003/browser-shots",
);
const baseURL = "http://127.0.0.1:4336";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const contexts = [];
const errors = [];
const inspected = [];
async function open(key) {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 1280, height: 900 },
  });
  contexts.push(context);
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(`${key}: ${error.message}`));
  await page.goto(`/?student=${key}`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  assert.equal(
    await page.locator("vite-error-overlay, [data-nextjs-dialog]").count(),
    0,
  );
  return page;
}
try {
  if (process.argv[2] === "B") {
    const b = await open("B");
    await b
      .getByRole("heading", { name: "(분수)×(자연수)의 계산", exact: true })
      .waitFor();
    await b.waitForFunction(
      () =>
        !!document
          .querySelector('[aria-label="문제 내용"]')
          ?.textContent?.trim(),
    );
    await b.setViewportSize({ width: 390, height: 844 });
    await b.screenshot({
      path: path.join(out, "student-b-isolated.png"),
      fullPage: true,
    });
    inspected.push("B actual ordinary player");
  } else {
    const c = await open("C");
    await c
      .getByRole("heading", {
        name: "지금은 새 문제를 열 수 없어요.",
        exact: true,
      })
      .waitFor();
    assert.equal(
      await c
        .getByRole("button", { name: "오늘의 추천 학습 시작", exact: true })
        .isDisabled(),
      true,
    );
    assert.ok(
      (await c.locator("body").innerText()).includes("선생님께 알려 주세요"),
    );
    await c.waitForTimeout(1300);
    const value = await (await c.request.get("/__fixture/state")).json();
    assert.equal(
      value.requests.filter(
        (entry) => entry.student === "C" && entry.method === "POST",
      ).length,
      0,
    );
    assert.equal(value.payload.course.learner.session.sectionId, "5-2-2-1");
    assert.ok(value.payload.course.learner.session.completedAt);
    await c.setViewportSize({ width: 320, height: 844 });
    assert.equal(
      await c.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    await c.screenshot({
      path: path.join(out, "student-c-unavailable-320.png"),
      fullPage: true,
    });
    inspected.push(
      "C supply fault injected: no auto POST, no false completion, disabled start",
    );
    const teacher = await open("teacher");
    await teacher
      .getByRole("heading", { name: "SRS 현황", exact: true })
      .waitFor();
    await teacher
      .getByRole("button", { name: "교육과정 연결도", exact: true })
      .click();
    const graph = teacher.getByRole("region", {
      name: "교육과정 연결도",
      exact: true,
    });
    assert.equal(
      await graph
        .getByRole("region", { name: "선택한 학생의 기록", exact: true })
        .count(),
      0,
    );
    await graph.getByRole("searchbox", { name: /검색/ }).fill("M3-R02");
    await graph.getByRole("button", { name: /M3-R02.*이차방정식/ }).click();
    assert.ok((await graph.innerText()).includes("M3-N01"));
    assert.ok((await graph.innerText()).includes("성취기준"));
    await teacher.screenshot({
      path: path.join(out, "teacher-graph-pc.png"),
      fullPage: true,
    });
    for (const width of [390, 320]) {
      await teacher.setViewportSize({ width, height: 844 });
      assert.equal(
        await graph.evaluate(
          (element) => element.scrollWidth > element.clientWidth + 1,
        ),
        false,
      );
      await teacher.screenshot({
        path: path.join(out, `teacher-graph-${width}.png`),
        fullPage: true,
      });
    }
    inspected.push(
      "teacher graph before student selection; M3-R02 topics/direct relations, PC/390/320",
    );
    await teacher.setViewportSize({ width: 1280, height: 900 });
    await teacher
      .getByRole("button", { name: "검증 학생 C 학습 현황 열기", exact: true })
      .click();
    await graph.getByText("검증 학생 C", { exact: false }).first().waitFor();
    await graph.getByRole("searchbox", { name: /검색/ }).fill("E56-N04");
    await graph.getByRole("button", { name: /E56-N04.*분수/ }).click();
    await graph
      .getByText(/새 문제|선생님|공급/)
      .first()
      .waitFor();
    await teacher.screenshot({
      path: path.join(out, "teacher-c-evidence.png"),
      fullPage: true,
    });
    inspected.push("selected C authorized partial evidence");
    // Recover through the real existing teacher plan form, within the same unit.
    const records = graph.getByRole("region", {
      name: "선택한 학생의 기록",
      exact: true,
    });
    await records.getByText(/선생님께 알려 주세요/).waitFor();
    const oldRevision = value.revision;
    await teacher
      .getByRole("group", { name: "학생 상세 보기 선택", exact: true })
      .getByRole("button", { name: "학습 설정", exact: true })
      .click();
    const form = teacher.getByRole("region", {
      name: "학생 학습 계획",
      exact: true,
    });
    await form
      .getByRole("combobox", { name: "소단원", exact: true })
      .selectOption("5-2-2-2");
    await form
      .getByRole("button", { name: "학습 계획 저장", exact: true })
      .click();
    await teacher
      .getByText("학습 계획을 저장했습니다.", { exact: true })
      .waitFor();
    await records.getByText(/최근 통과하지 못함/).waitFor({ state: "hidden" });
    await records
      .getByText(/새 문제를 준비하지 못했어요/)
      .waitFor({ state: "hidden" });
    const recovered = await (await c.request.get("/__fixture/state")).json();
    assert.ok(recovered.revision > oldRevision);
    assert.equal(recovered.payload.course.plan.startSectionId, "5-2-2-2");
    const currentResponse = await c.request.get("/api/learn/math-srs/course");
    const current = (await currentResponse.json()).data;
    assert.notEqual(current.prerequisiteContext?.canStart, false);
    assert.ok(
      ["5-2-2-1", "5-2-2-2"].includes(current.summary.recommendation.sectionId),
    );
    await teacher.screenshot({
      path: path.join(out, "teacher-c-recovered.png"),
      fullPage: true,
    });
    inspected.push(
      "C real teacher plan save → latest revision evidence clears; existing due/learn recommendation available in the same target unit",
    );
    await c.reload({ waitUntil: "domcontentloaded" });
    await c.locator('[aria-label="문제 내용"]').waitFor();
    const started = await (await c.request.get("/__fixture/state")).json();
    assert.notEqual(
      started.payload.course.learner.session.id,
      value.payload.course.learner.session.id,
    );
    assert.equal(started.payload.course.learner.session.completedAt, null);
    assert.ok(
      ["5-2-2-1", "5-2-2-2"].includes(
        started.payload.course.learner.session.sectionId,
      ),
    );
    await c.screenshot({
      path: path.join(out, "student-c-recovered.png"),
      fullPage: true,
    });
    inspected.push(
      "C real player starts a new ordinary session after plan recovery",
    );
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    path.join(
      out,
      process.argv[2] === "B" ? "b-inspection.json" : "teacher-inspection.json",
    ),
    JSON.stringify({ isolatedMockDb: true, inspected, errors }, null, 2) + "\n",
  );
  console.log("INSPECTION PASS:", inspected.join("; "));
} finally {
  for (const context of contexts) await context.close();
  await browser.close();
}
