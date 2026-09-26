// Run with node. BASE, QA_ENGINES and QA_WIDTHS optionally narrow the browser matrix.
import { chromium, webkit, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { register } from "tsx/cjs/api";

register();
const require = createRequire(import.meta.url);
const { createExplorerState, applyExplorerAction, explorerView, explorerReceipt } = require("../../src/lib/math-explorers/engine.ts");
const { definitionCard, definitionOptions, definitionQuestionId, definitionNeedsRead } = require("../../src/lib/math-explorers/definition-cards.ts");
const { explorerRequestSchema, explorerStateSchema } = require("../../src/contracts/mathExplorers.contract.ts");
const { kstDateOf } = require("../../src/lib/kstDate.ts");
const base = process.env.BASE ?? "http://localhost:3000";
const output = resolve(process.env.QA_OUTPUT ?? ".qa-artifacts/mobile-explorers");
const widths = (process.env.QA_WIDTHS ?? "320,390,430,1280").split(",").map(Number);
const engines = (process.env.QA_ENGINES ?? "chromium,webkit").split(",");
const date = kstDateOf(new Date());
const student = { id: "11111111-1111-4111-8111-111111111111", name: "test_s", className: "테스트반" };
await mkdir(output, { recursive: true });

function correctAction(stored) {
  const session = stored.profile.definitions.session;
  const questionId = definitionQuestionId(session);
  if (definitionNeedsRead(stored.profile, session)) return { type: "read", questionId };
  const task = session.queue[session.index];
  const card = definitionCard(task.cardId);
  const sourceIds = task.kind === 0 ? [0, 1] : task.kind === 1 ? card.examples.flatMap((example, index) => example.yes ? [index] : []) : [Number(card.truth)];
  const order = definitionOptions(session, task);
  return { type: "answer", questionId, choiceIds: sourceIds.map((id) => order.indexOf(id)) };
}

// Real engine and strict schemas provide every response; the fixture never invents grades.
function fixture() {
  const server = {
    stored: createExplorerState(student.id), revision: 0, posts: [], loseNext: false, longExamples: true,
    view(feedback = null) {
      const result = { ...explorerView(server.stored, date), student, revision: server.revision, feedback, today: date };
      if (server.longExamples && result.currentActivity?.kind === "examples") result.currentActivity.prompt += "\n\n" + Array(24).fill("문제의 조건을 읽고 각 예가 이 정의에 해당하는지 차례로 확인해 보세요.").join("\n\n");
      return explorerStateSchema.parse(result);
    },
    beforeLast() {
      for (let count = 0; count < 80; count++) {
        const next = applyExplorerAction(server.stored, correctAction(server.stored), date, randomUUID());
        if (next.state.profile.definitions.session.done) return;
        server.stored = next.state; server.revision++;
      }
      throw new Error("Fixture did not reach final activity");
    },
  };
  return server;
}

async function connect(page, server) {
  await page.route("**/api/learn/math-explorers", async (route) => {
    const request = route.request();
    if (request.method() !== "POST") return route.fulfill({ json: { data: server.view() } });
    const input = explorerRequestSchema.parse(request.postDataJSON());
    server.posts.push(input);
    const receipt = explorerReceipt(server.stored, input.action, input.requestId);
    if (!receipt && input.expectedRevision !== server.revision) return route.fulfill({ status: 409, json: { error: { code: "CONFLICT", message: "기록이 바뀌었어요." } } });
    const result = applyExplorerAction(server.stored, input.action, date, input.requestId);
    if (!result.duplicate) { server.stored = result.state; server.revision++; }
    await new Promise((done) => setTimeout(done, 100));
    if (server.loseNext) {
      server.loseNext = false;
      return route.fulfill({ status: 503, json: { error: { code: "INTERNAL_ERROR", message: "연결을 확인하고 다시 시도해 주세요." } } });
    }
    return route.fulfill({ json: { data: server.view(result.feedback) } });
  });
}
async function tap(locator, mobile) { if (mobile) await locator.tap(); else await locator.click(); }
async function geometry(page, mobile) {
  const dock = await page.locator("[data-explorer-dock=true]").boundingBox();
  const frame = await page.getByRole("region", { name: "개념 문제와 답 고르기" }).boundingBox();
  assert.ok(dock && frame, "frame and dock exist");
  const doc = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, innerWidth, innerHeight, scrollY }));
  assert.ok(doc.width <= doc.innerWidth + 1 && doc.height <= doc.innerHeight + 1, "fixed practice scrolls: " + JSON.stringify(doc));
  assert.equal(doc.scrollY, 0);
  if (mobile) {
    const nav = await page.getByRole("navigation", { name: "학생 학습 메뉴" }).boundingBox();
    assert.ok(nav && dock.y + dock.height <= nav.y + 1, "dock overlaps navigation");
    assert.ok(nav.y - dock.y - dock.height < 22, "dock too far above navigation");
  }
  assert.equal(await page.locator("input:not([type=hidden]),textarea").count(), 0);
  return { dock, frame };
}
function sameGeometry(actual, original) {
  for (const region of ["dock", "frame"]) for (const axis of ["x", "y", "width", "height"]) assert.ok(Math.abs(actual[region][axis] - original[region][axis]) < 1.1, region + "." + axis + " moved: " + JSON.stringify({ original, actual }));
}
async function settled(page, server) {
  await expect(page.locator("[data-answer-feedback]")).toHaveCount(0, { timeout: 5000 });
  const activity = server.view().currentActivity;
  if (activity) await expect(page.locator("[data-page-turn=true]")).toContainText(activity.prompt.slice(0, 40));
  await page.waitForTimeout(560);
}
async function overlay(page, result, baseline, mobile) {
  const effect = page.locator("[data-answer-feedback=" + result + "]");
  await effect.waitFor();
  assert.deepEqual(await effect.evaluate((element) => ({ position: getComputedStyle(element).position, pointerEvents: getComputedStyle(element).pointerEvents })), { position: "absolute", pointerEvents: "none" });
  sameGeometry(await geometry(page, mobile), baseline);
  assert.equal(await page.locator("[data-explorer-solution]").count(), 0);
}
async function choose(page, ids, mobile) {
  const choices = page.getByRole("group", { name: "답 고르기" });
  for (const id of ids) await tap(choices.getByRole("button").nth(id), mobile);
}
async function answerCorrect(page, server, mobile) {
  const activity = server.view().currentActivity;
  const action = correctAction(server.stored);
  if (action.type === "read") return tap(page.getByRole("button", { name: /정의를 가리고 도전하기/ }), mobile);
  await choose(page, action.choiceIds, mobile);
  if (activity.kind === "assemble") await tap(page.getByRole("button", { name: "완성한 정의 확인하기" }), mobile);
  if (activity.kind === "examples") await tap(page.getByRole("button", { name: "선택한 예 확인하기" }), mobile);
}
const reports = [];
for (const name of engines) {
  const browser = await ({ chromium, webkit })[name].launch({ headless: true });
  try {
    for (const width of widths) {
      const mobile = width < 600;
      const page = await browser.newPage({ viewport: { width, height: mobile ? 700 : 900 }, isMobile: mobile, hasTouch: mobile });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const server = fixture();
      const tag = name + "-" + width;
      try {
        await connect(page, server);
        await page.goto(base + "/dev/mobile-explorers-qa");
        const nav = page.getByRole("navigation", { name: "학생 학습 메뉴" });
        assert.equal(await nav.getByRole("link").count(), 4);
        if (mobile) await expect(nav.getByRole("link", { name: "개념 탐험" })).toHaveAttribute("aria-current", "page");
        await page.getByRole("button", { name: "오늘의 탐험 시작", exact: true }).click();
        await page.getByRole("button", { name: /정의를 가리고 도전하기/ }).waitFor();
        await page.waitForTimeout(560);
        const baseline = await geometry(page, mobile);
        await tap(page.getByRole("button", { name: /정의를 가리고 도전하기/ }), mobile);
        await settled(page, server);
        sameGeometry(await geometry(page, mobile), baseline);
        const choices = page.getByRole("group", { name: "답 고르기" });
        assert.equal(await choices.getByRole("button").count(), 4);
        const assembly = correctAction(server.stored);
        let answerCount = server.posts.filter((post) => post.action.type === "answer").length;
        await choose(page, assembly.choiceIds, mobile);
        assert.equal(server.posts.filter((post) => post.action.type === "answer").length, answerCount, "assembly permits editing before confirmation");
        await tap(page.getByRole("button", { name: /^빈칸 2,/ }), mobile);
        await choose(page, [assembly.choiceIds[1]], mobile);
        await page.screenshot({ path: resolve(output, tag + "-assemble.png") });
        await tap(page.getByRole("button", { name: "완성한 정의 확인하기" }), mobile);
        await overlay(page, "correct", baseline, mobile);
        assert.equal(server.posts.filter((post) => post.action.type === "answer").length, ++answerCount);
        await settled(page, server);
        sameGeometry(await geometry(page, mobile), baseline);
        assert.equal(server.view().currentActivity.kind, "examples");
        const pane = page.locator("[data-page-turn=true]");
        assert.ok(await pane.evaluate((element) => element.scrollHeight > element.clientHeight), "long content scrolls internally");
        await pane.evaluate((element) => { element.scrollTop = element.scrollHeight; });
        sameGeometry(await geometry(page, mobile), baseline);
        const exampleAnswer = correctAction(server.stored);
        const incorrectId = [0, 1, 2, 3].find((id) => !exampleAnswer.choiceIds.includes(id));
        await choose(page, [incorrectId], mobile);
        assert.equal(server.posts.filter((post) => post.action.type === "answer").length, answerCount, "multiple examples require confirmation");
        await tap(page.getByRole("button", { name: "선택한 예 확인하기" }), mobile);
        await overlay(page, "incorrect", baseline, mobile);
        assert.equal(await page.locator("[data-answer-state=correct]").count(), 0, "wrong feedback cannot reveal correct options");
        await page.screenshot({ path: resolve(output, tag + "-incorrect.png") });
        await settled(page, server);
        sameGeometry(await geometry(page, mobile), baseline);
        assert.equal(server.view().currentActivity.kind, "truth");
        assert.equal(await choices.getByRole("button").count(), 2);
        server.loseNext = true;
        const truthAnswer = correctAction(server.stored);
        const postsBefore = server.posts.length;
        await choices.getByRole("button").nth(truthAnswer.choiceIds[0]).evaluate((element) => { element.click(); element.click(); });
        await page.getByRole("button", { name: "같은 요청 다시 시도" }).waitFor();
        assert.equal(server.posts.length, postsBefore + 1, "rapid truth taps submit once");
        sameGeometry(await geometry(page, mobile), baseline);
        const lost = server.posts.at(-1);
        const committedRevision = server.revision;
        await tap(page.getByRole("button", { name: "같은 요청 다시 시도" }), mobile);
        await overlay(page, "correct", baseline, mobile);
        assert.deepEqual(server.posts.at(-1), lost, "retry preserves request ID, revision and answer");
        assert.equal(server.revision, committedRevision, "retry uses existing receipt");
        await settled(page, server);
        sameGeometry(await geometry(page, mobile), baseline);
        await page.emulateMedia({ reducedMotion: "reduce" });
        assert.equal(await pane.evaluate((element) => getComputedStyle(element).animationName), "none");
        await tap(page.getByRole("button", { name: "← 진도판", exact: true }), mobile);
        await expect(page.locator("[data-pawn-day]")).toHaveAttribute("data-pawn-day", "0");
        assert.equal(server.stored.completedDays.length, 0, "three activities do not advance a daily tile");

        // Fast-forward only the engine; exercise the final retry in the browser.
        server.beforeLast(); server.longExamples = false;
        await page.reload();
        await page.getByRole("button", { name: /^(이어서 탐험하기|진행 중인 탐험 이어하기)/ }).first().click();
        await page.locator("[data-explorer-dock=true]").waitFor();
        await answerCorrect(page, server, mobile);
        await page.locator("[data-answer-feedback=correct]").waitFor();
        await expect(page.locator("[data-pawn-day]")).toHaveAttribute("data-pawn-day", "1", { timeout: 5000 });
        assert.equal(server.stored.completedDays.length, 1);
        await page.screenshot({ path: resolve(output, tag + "-completed-day.png"), fullPage: true });

        const earned = structuredClone({ days: server.stored.completedDays, stars: server.stored.profile.stars, cards: server.stored.profile.definitions.cards });
        await page.locator('[data-day-step="1"]').getByRole("button").click();
        await page.locator("[data-explorer-dock=true]").waitFor();
        assert.equal(server.stored.profile.definitions.session.reviewOnly, true);
        await expect(page.getByText("지난 학습 다시 풀기", { exact: true })).toBeVisible();
        server.beforeLast();
        await page.reload();
        await page.getByRole("button", { name: /^(이어서 탐험하기|진행 중인 탐험 이어하기)/ }).first().click();
        await page.locator("[data-explorer-dock=true]").waitFor();
        await answerCorrect(page, server, mobile);
        await expect(page.locator("[data-pawn-day]")).toHaveAttribute("data-pawn-day", "1", { timeout: 5000 });
        assert.deepEqual({ days: server.stored.completedDays, stars: server.stored.profile.stars, cards: server.stored.profile.definitions.cards }, earned, "past-day completion preserves rewards and progress");
        assert.equal(errors.length, 0, errors.join("\n"));
        reports.push({ engine: name, width, passed: true, requests: server.posts.length });
        console.log(tag + ": frame, feedback, request retry, daily milestone and past-day replay passed");
      } catch (error) {
        await page.screenshot({ path: resolve(output, tag + "-failure.png"), fullPage: true }).catch(() => {});
        await writeFile(resolve(output, tag + "-failure.txt"), String(error.stack ?? error) + "\n" + errors.join("\n"));
        throw error;
      } finally { await page.close(); }
    }
  } finally { await browser.close(); }
}
await writeFile(resolve(output, "report.json"), JSON.stringify(reports, null, 2));
console.log(reports.length + " real-engine student explorer browser cases passed.");
