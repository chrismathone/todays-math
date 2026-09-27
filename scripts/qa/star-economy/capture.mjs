// 별 경제(D-144 · 05 §8.20) 실제 크기 캡처 — 떠 있는 dev 서버의 `/dev/mobile-explorers-qa` 에서.
//
// 실행(저장소 뿌리): BASE=http://127.0.0.1:3127 node scripts/qa/star-economy/capture.mjs
//   QA_SIZES 320x600,390x844 (기본) · QA_ENGINES chromium,webkit (기본 chromium) · 결과 .qa-artifacts/star-economy/shots/
//
// 🔴 브라우저는 실제 API 에 닿지 않는다 — `/api/**` 를 전부 여기서 받아, 제품 엔진 · CAS 저장 · 탐험 가드를 도는
// 메모리 표(sim.mjs 의 라우트 거울)로 답한다. DB 는 대역이 막는다(load.mjs).
//
// 장면
//   memory — 중2 기억 복습 날: 카드 5장 중 3장은 첫 바퀴 참거짓에서 틀리고(레벨 안 오름) 2장만 오른다 → 카드 2 + 한 칸 보장 1.
//            마지막 한 문제만 남긴 채 브라우저가 이어서 누르면, 정답 연출 뒤 칸 효과 → 홈 완료 줄 → 우리 기지 시트.
//   bank   — 초4 진도 계획 학생의 은행 날(10문제)을 서버에서 끝낸 뒤 홈 — 보장 3 만(내역 줄 없음).
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { clock, src, worktree } from "./load.mjs";
import * as sim from "./sim.mjs";

const { chromium, webkit } = createRequire(resolve(worktree, "package.json"))("@playwright/test");
const base = process.env.BASE ?? "http://127.0.0.1:3127";
const out = resolve(worktree, ".qa-artifacts/star-economy/shots");
const sizes = (process.env.QA_SIZES ?? "320x600,390x844").split(",").map((s) => s.split("x").map(Number));
const engines = (process.env.QA_ENGINES ?? "chromium").split(",");
await mkdir(out, { recursive: true });
const bridge = src("lib/math-explorers/curriculumBridge.ts");
const catalog = src("lib/math-srs/elementary/catalog.ts");
const DAY = 86_400_000;
const day2 = Date.now() - ((Date.now() + 9 * 3_600_000) % DAY) + 3 * 3_600_000; // 오늘 한국 12시
const day1 = day2 - DAY;

function explorerRecord(grade, goalUnitId) {
  const explorer = sim.engine.createExplorerState(sim.studentId, grade);
  explorer.profile.definitions = { courseGrade: grade, ...(goalUnitId ? { goalUnitId } : {}), runs: 0, history: [], cards: {} };
  return explorer;
}

/** 중2 — 1일째 개념 날을 끝내고, 2일째 기억 복습을 마지막 한 문제 전까지 서버에서 푼다. */
async function memoryFixture() {
  sim.reseed(8);
  clock.set(day1);
  const table = sim.createTable(sim.serverState.parseSrsState({ ...sim.serverState.emptySrsState(), explorers: explorerRecord(8) }));
  await sim.explorerPost(table, { type: "expedition-start" }, new Date(day1));
  while (!sim.currentState(table).explorers.profile.definitions.session.done)
    await sim.explorerPost(table, sim.explorerAnswer(sim.currentState(table).explorers), new Date(day1));
  // 장면용: 기지는 이미 4단계(끝없는 단계), 별 6 — 오늘 받을 3 을 더해도 다음 12 에 모자란다.
  const state = sim.currentState(table);
  state.explorers.profile = { ...state.explorers.profile, level: 4, stars: 6, earned: 32 };
  await sim.changeSrsState(sim.studentId, () => state, table);
  clock.set(day2);
  const now = new Date(day2);
  await sim.explorerPost(table, { type: "expedition-start" }, now);
  const plan = sim.currentState(table).expedition.mission;
  if (plan.route !== "memory") throw new Error("기억 복습 날이 아니다: " + plan.route);
  const session = () => sim.currentState(table).explorers.profile.definitions.session;
  const wrongCards = new Set(session().cardIds.slice(0, 3));
  for (;;) {
    const s = session();
    const task = s.queue[s.index];
    const wrong = s.round === 0 && !s.continuation && task?.kind === 2 && wrongCards.has(task.cardId);
    const action = sim.explorerAnswer(sim.currentState(table).explorers, wrong);
    // 마지막 한 문제(이 답으로 세션이 끝난다)는 브라우저에 남긴다.
    const probe = sim.engine.applyExplorerAction(sim.currentState(table).explorers, action, sim.kstDateOf(now), crypto.randomUUID());
    if (probe.state.profile.definitions.session.done) return { table, last: action };
    await sim.explorerPost(table, action, now);
  }
}

/** 초4 — 진도 계획 소단원의 단원 카드는 이미 모았다(은행 날) · 은행 10문제를 서버에서 끝낸다. */
async function bankFixture() {
  sim.reseed(4);
  clock.set(day2);
  const now = new Date(day2);
  const sectionId = catalog.COURSE_SECTIONS.find((s) => s.grade === 4).id;
  const unitId = bridge.explorerUnitForSection(sectionId);
  const course = sim.automation.setCoursePlan(sim.automation.emptyCourseState(), { startSectionId: sectionId, dailyQuestionCount: 10, enabled: true, expectedRevision: 0 }, now);
  const explorers = explorerRecord(4);
  for (const card of sim.cards.definitionCards.filter((c) => c.unit === unitId))
    explorers.profile.definitions.cards[card.id] = { level: 1, due: sim.kstDateOf(new Date(day2 + 7 * DAY)), lastDate: sim.kstDateOf(new Date(day1)), attemptedAt: sim.kstDateOf(new Date(day1)), missed: 0, reviewStep: 1, reviewedAt: sim.kstDateOf(new Date(day1)), lastRecall: "remembered" };
  explorers.profile = { ...explorers.profile, level: 2, stars: 4, earned: 13 };
  const table = sim.createTable(sim.serverState.parseSrsState({ ...sim.serverState.emptySrsState(), course, explorers }));
  await sim.explorerPost(table, { type: "expedition-start" }, now);
  if (sim.currentState(table).expedition.mission.kind !== "elementary") throw new Error("은행 날이 아니다");
  for (let i = 0; sim.currentState(table).expedition.mission.status !== "complete"; i++) {
    await sim.elementaryAttempt(table, now);
    if (i > 60) throw new Error("은행 날이 끝나지 않는다");
  }
  return { table };
}

async function connect(page, table) {
  await page.route(
    (url) => url.pathname.startsWith("/api/"),
    async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      const now = new Date(day2);
      if (path !== "/api/learn/math-explorers")
        return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: { code: "NOT_FOUND", message: "캡처 밖" } }) });
      if (request.method() === "POST") {
        const input = sim.explorerContract.explorerRequestSchema.parse(request.postDataJSON());
        const saved = await sim.explorerChange(table, input, now);
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sim.explorerResponse(saved, saved.feedback, now)) });
      }
      const saved = await sim.readSrsState(sim.studentId, table);
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sim.explorerResponse(saved, null, now)) });
    },
  );
}

const notes = [];
for (const engineName of engines) {
  const browser = await { chromium, webkit }[engineName].launch({ headless: true });
  for (const [width, height] of sizes) {
    const tag = `${engineName}-${width}x${height}`;
    const mobile = width < 600;
    const newPage = async (table) => {
      const page = await browser.newPage({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.addInitScript(() => {
        const style = document.createElement("style");
        style.textContent = "nextjs-portal{display:none!important}";
        document.addEventListener("DOMContentLoaded", () => document.head.append(style));
      });
      await connect(page, table);
      await page.goto(base + "/dev/mobile-explorers-qa");
      await page.locator("[data-expedition-mission]").waitFor({ timeout: 60000 });
      await page.evaluate(() => document.fonts.ready);
      return { page, errors };
    };

    // ── 기억 복습 날: 마지막 답 → 칸 효과 → 홈 → 기지 시트
    const memory = await memoryFixture();
    const { page, errors } = await newPage(memory.table);
    await page.locator("[data-expedition-start]").click();
    const choices = page.getByRole("group", { name: "답 고르기" });
    await choices.waitFor();
    await choices.getByRole("button").nth(memory.last.choiceIds[0]).click();
    const effect = page.getByText("오늘의 한 칸", { exact: true });
    await effect.waitFor({ timeout: 10000 });
    await page.waitForTimeout(350); // 효과가 다 떠오른 뒤(1.2초 중 18%~80% 가 온전히 보임)
    await page.screenshot({ path: resolve(out, `${tag}-memory-effect.png`) });
    await effect.waitFor({ state: "detached", timeout: 10000 });
    const line = page.getByText(/한 칸 전진했어요/);
    await line.waitFor();
    await page.screenshot({ path: resolve(out, `${tag}-memory-home.png`) });
    const lineText = (await line.innerText()).replace(/\s+/g, " ");
    const baseButton = page.getByRole("button", { name: /^우리 기지/ });
    const badge = await baseButton.getAttribute("aria-label");
    await baseButton.scrollIntoViewIfNeeded();
    await page.screenshot({ path: resolve(out, `${tag}-memory-links.png`) });
    await baseButton.click();
    const sheet = page.getByRole("dialog", { name: "우리 기지" });
    await sheet.waitFor();
    await page.waitForTimeout(200);
    await page.screenshot({ path: resolve(out, `${tag}-base-sheet.png`) });
    const sheetText = (await sheet.innerText()).replace(/\s+/g, " ");
    const stored = sim.currentState(memory.table);
    notes.push({ tag, scene: "memory", line: lineText, badge, sheet: sheetText.slice(0, 160), award: stored.expedition.awards.at(-1).stars, profile: { level: stored.explorers.profile.level, stars: stored.explorers.profile.stars }, errors });
    await page.close();

    // ── 은행 날 끝 홈
    const bank = await bankFixture();
    const b = await newPage(bank.table);
    const bline = b.page.getByText(/한 칸 전진했어요/);
    await bline.waitFor();
    await b.page.screenshot({ path: resolve(out, `${tag}-bank-home.png`) });
    const bstored = sim.currentState(bank.table);
    notes.push({ tag, scene: "bank", line: (await bline.innerText()).replace(/\s+/g, " "), badge: await b.page.getByRole("button", { name: /^우리 기지/ }).getAttribute("aria-label"), award: bstored.expedition.awards.at(-1).stars, profile: { level: bstored.explorers.profile.level, stars: bstored.explorers.profile.stars }, errors: b.errors });
    await b.page.close();
    console.log(`${tag}: 찍음`);
  }
  await browser.close();
}
clock.real();
await writeFile(resolve(out, "notes.json"), JSON.stringify(notes, null, 2));
console.log(JSON.stringify(notes, null, 2));
