// Unified expedition home — mobile browser QA (tap flows, not screenshots only).
//
// Run from the repository root against a running dev server:
//   node scripts/qa/mobile-explorers-qa.mjs
// Environment (all optional):
//   BASE          dev server origin (default http://localhost:3000)
//   QA_OUTPUT     screenshot/report directory (default .qa-artifacts/mobile-explorers)
//   QA_ENGINES    chromium,webkit
//   QA_SIZES      320x600,390x844,430x932,1280x800
//   QA_SCENARIOS  concept,workshop,bank-elementary,bank-middle,tabs
//   QA_THROTTLE   CPU slowdown rate for Chromium (e.g. 4) — races hide on fast machines
//
// Safety: the browser never reaches a real API. Every `/api/**` request is
// fulfilled here by an in-memory server that runs the product's own engines,
// CAS store (`changeSrsState` with an in-memory table) and expedition guard
// (`updateExpedition`). `server-only` and `@/lib/db` are replaced before any
// server module loads; a DB access throws. Nothing logs in, nothing is written
// to a database. Question-bank candidates are not loaded (the course generator
// fallback supplies elementary problems) — that part of production is not
// exercised here.
import { chromium, webkit, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { randomInt, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { register } from "tsx/cjs/api";

register();
const require = createRequire(import.meta.url);
const root = resolve(import.meta.dirname, "../..");
const dbBlocked = new Proxy(
  {},
  {
    get(_, key) {
      throw new Error(`QA 시뮬레이터는 DB 를 쓰지 않는다 (${String(key)})`);
    },
  },
);
for (const [path, exports] of [
  [require.resolve("server-only"), {}],
  [resolve(root, "src/lib/db.ts"), { db: dbBlocked }],
])
  require.cache[path] = { id: path, filename: path, loaded: true, exports, children: [], paths: [] };
const src = (path) => require(resolve(root, "src", path));

const engine = src("lib/math-explorers/engine.ts");
const cards = src("lib/math-explorers/definition-cards.ts");
const workshopLib = src("lib/math-explorers/workshop.ts");
const expedition = src("lib/math-explorers/expedition.ts");
const { expeditionInitialCourseRecommendation, startExpedition } = src("lib/math-explorers/expeditionStart.ts");
const { expeditionJourney } = src("lib/math-explorers/expeditionJourney.ts");
const { bankSectionsForExplorerUnit } = src("lib/math-explorers/curriculumBridge.ts");
const explorerContract = src("contracts/mathExplorers.contract.ts");
const { changeSrsState, readSrsState } = src("lib/math-srs/serverStore.ts");
const { courseStudentDto } = src("lib/math-srs/courseServer.ts");
const serverState = src("lib/math-srs/serverState.ts");
const automation = src("lib/math-srs/courseAutomation.ts");
const { srsStateDto } = src("lib/math-srs/serverDto.ts");
const { replayProblem } = src("lib/math-srs/replay.ts");
const { dailyJourneyDto } = src("lib/math-srs/dailyJourney.ts");
const { gradeCourseAnswer } = src("lib/math-srs/elementary/answers.ts");
const { gradeSrsAnswer } = src("lib/math-srs/sharedAnswers.ts");
const courseContract = src("contracts/mathSrsCourse.contract.ts");
const srsContract = src("contracts/mathSrs.contract.ts");
const replayContract = src("contracts/mathSrsReplay.contract.ts");
const { kstDateOf } = src("lib/kstDate.ts");

const base = process.env.BASE ?? "http://localhost:3000";
const output = resolve(process.env.QA_OUTPUT ?? ".qa-artifacts/mobile-explorers");
const engines = (process.env.QA_ENGINES ?? "chromium,webkit").split(",");
const sizes = (process.env.QA_SIZES ?? "320x600,390x844,430x932,1280x800")
  .split(",")
  .map((size) => size.split("x").map(Number));
const scenarioFilter = process.env.QA_SCENARIOS?.split(",");
const throttle = Number(process.env.QA_THROTTLE ?? 0);
await mkdir(output, { recursive: true });

const studentId = "11111111-1111-4111-8111-111111111111";
const classId = "22222222-2222-4222-8222-222222222222";
const studentRow = {
  id: studentId,
  name: "test_s",
  classId,
  class: { id: classId, name: "테스트반" },
  studentAccount: { id: "33333333-3333-4333-8333-333333333333", disabledAt: null },
};
const today = () => kstDateOf(new Date());
const addDays = (date, days) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
const activityNames = { read: "뜻 만나기", assemble: "정의 조립", examples: "예 모으기", truth: "경계 살피기" };

// ───────────────────────── in-memory server ─────────────────────────
function createSim(initial) {
  let row = initial
    ? { studentId, revision: 1, payload: serverState.parseSrsState(initial) }
    : null;
  const sim = {
    table: {
      async findUnique() {
        return row ? structuredClone(row) : null;
      },
      async findMany() {
        return row ? [structuredClone(row)] : [];
      },
      async create({ data }) {
        if (row) throw Object.assign(new Error("duplicate"), { code: "P2002" });
        row = structuredClone(data);
      },
      async updateMany({ where, data }) {
        if (!row || row.revision !== where.revision) return { count: 0 };
        row = { studentId, revision: row.revision + data.revision.increment, payload: structuredClone(data.payload) };
        return { count: 1 };
      },
    },
    posts: [],
    requests: 0,
    handled: 0,
    unhandled: [],
    unknown: [],
    gate: null,
    loseNext: false,
    longExamples: false,
    get revision() {
      return row?.revision ?? 0;
    },
    get state() {
      return row ? serverState.parseSrsState(structuredClone(row.payload)) : serverState.emptySrsState();
    },
  };
  return sim;
}

function ownedExplorer(state, now) {
  const explorer = expedition.initialOwnedExplorer(state, studentId, now);
  if (explorer.profile.id !== studentId) throw new serverState.SrsUnavailable("owner");
  return explorer;
}

// Mirrors src/lib/math-explorers/routes.ts changeExplorer (DB candidates → []).
// Only expedition-start reads before the save; other actions go straight to it (reward-speed ①).
async function explorerChange(sim, input, now) {
  const date = kstDateOf(now);
  const expeditionStart = input.action.type === "expedition-start";
  const duplicateStart = (state) => {
    if (expeditionStart) return expedition.expeditionStartDuplicate(state, input.requestId);
    if (state.expedition?.receipts.some((r) => r.requestId === input.requestId))
      throw new serverState.SrsConflict("같은 요청 번호로 다른 학습을 요청할 수 없어요.");
    return false;
  };
  const startFeedback = { message: "오늘의 탐험을 이어가요." };
  let recommendation = null;
  if (expeditionStart) {
    const previous = await readSrsState(studentId, sim.table);
    ownedExplorer(previous.state, now);
    if (duplicateStart(previous.state)) return { ...previous, feedback: startFeedback };
    const receipt = engine.explorerReceipt(ownedExplorer(previous.state, now), input.action, input.requestId);
    if (receipt) return { ...previous, feedback: receipt };
    const plan = expedition.planExpedition(previous.state, studentId, now);
    recommendation =
      plan.kind === "elementary" ? expeditionInitialCourseRecommendation(previous.state, plan, now) : null;
  }
  const seed = randomInt(0, 0x1_0000_0000);
  let feedback = null;
  try {
    const saved = await changeSrsState(
      studentId,
      (state) => {
        if (expeditionStart) {
          feedback = startFeedback;
          return startExpedition(state, studentId, now, input.requestId, seed, randomUUID,
            recommendation ? { sectionId: recommendation.sectionId, candidates: [] } : null);
        }
        duplicateStart(state);
        const result = engine.applyExplorerAction(ownedExplorer(state, now), input.action, date, input.requestId);
        feedback = result.feedback;
        return result.duplicate ? state : { ...state, explorers: result.state };
      },
      sim.table,
      input.expectedRevision,
    );
    return { ...saved, feedback };
  } catch (error) {
    if (!(error instanceof serverState.SrsConflict)) throw error;
    const latest = await readSrsState(studentId, sim.table);
    if (duplicateStart(latest.state)) return { ...latest, feedback: startFeedback };
    const duplicate = engine.explorerReceipt(ownedExplorer(latest.state, now), input.action, input.requestId);
    if (duplicate) return { ...latest, feedback: duplicate };
    throw error;
  }
}
function explorerData(sim, saved, feedback, now) {
  const date = kstDateOf(now);
  const data = explorerContract.explorerStateSchema.parse({
    ...engine.explorerView(ownedExplorer(saved.state, now), date),
    today: date,
    journey: expeditionJourney(saved.state, now, studentId),
    expedition: expedition.expeditionDto(saved.state, studentId, now),
    student: { id: studentId, name: studentRow.name, className: studentRow.class.name },
    revision: saved.revision,
    feedback,
  });
  // Injected on purpose: the real prompts are short; this proves a long one scrolls inside the pane.
  if (sim.longExamples && data.currentActivity?.kind === "examples")
    data.currentActivity.prompt += "\n\n" + Array(24).fill("문제의 조건을 읽고 각 예가 이 정의에 해당하는지 차례로 확인해 보세요.").join("\n\n");
  return data;
}
async function explorerPost(sim, action) {
  const input = { requestId: randomUUID(), expectedRevision: sim.revision, action };
  return explorerChange(sim, input, new Date());
}

// Mirrors src/lib/math-srs/courseRoutes.ts handleCourseStudentRequest (bank candidates → []).
async function courseRequest(sim, op, body, now) {
  let saved;
  let requestedSessionId;
  if (op === "read") saved = await readSrsState(studentId, sim.table);
  else {
    let change;
    if (op === "start") {
      assert.deepEqual(body, {});
      const seed = randomInt(0, 0x1_0000_0000);
      change = (c, state) =>
        automation.startRecommendedCourse(c, expedition.expeditionCourseRecommendation(state, now), now, seed, randomUUID, []);
    } else if (op === "hint") {
      const parsed = courseContract.courseHintInputSchema.parse(body);
      requestedSessionId = parsed.sessionId;
      change = (c) => automation.revealCourseHint(c, parsed);
    } else {
      const parsed = courseContract.courseAttemptInputSchema.parse(body);
      requestedSessionId = parsed.sessionId;
      change = (c) => automation.submitCourseAttempt(c, parsed, now);
    }
    saved = await changeSrsState(
      studentId,
      (state) => {
        const previous = state.course ?? automation.emptyCourseState();
        const course = change(previous, state);
        return course === previous ? state : { ...state, course };
      },
      sim.table,
    );
  }
  return courseContract.courseStudentResponseSchema.parse({
    data: courseStudentDto(studentRow, saved, now, requestedSessionId),
  });
}

// Mirrors src/lib/math-srs/serverRoutes.ts handleSrsStudentRequest.
async function middleRequest(sim, op, body, now) {
  let saved;
  let requestedMissionId;
  if (op === "read") saved = await readSrsState(studentId, sim.table);
  else if (op === "start") {
    srsContract.mathSrsStartSchema.parse(body);
    const seed = randomInt(0, 0x1_0000_0000);
    saved = await changeSrsState(studentId, (s) => serverState.startSrsMission(s, studentId, now, seed, randomUUID), sim.table);
  } else if (op === "hint") {
    const parsed = srsContract.mathSrsHintInputSchema.parse(body);
    requestedMissionId = parsed.missionId;
    saved = await changeSrsState(studentId, (s) => serverState.revealSrsHint(s, parsed), sim.table);
  } else {
    const parsed = srsContract.mathSrsAttemptInputSchema.parse(body);
    requestedMissionId = parsed.missionId;
    saved = await changeSrsState(studentId, (s) => serverState.submitSrsAttempt(s, studentId, parsed, now), sim.table);
  }
  const context = {
    student: { id: studentId, name: studentRow.name, classId, className: studentRow.class.name },
    currentProgress: null,
    lectures: [],
  };
  return srsContract.mathSrsStateResponseSchema.parse({ data: srsStateDto(context, saved, now, requestedMissionId) });
}

// Mirrors src/lib/math-srs/replayRoutes.ts (figure → placeholder SVG).
async function replayRequest(sim, url, body, now) {
  let input;
  let target;
  if (!body) target = replayContract.mathSrsReplayQuerySchema.parse(Object.fromEntries(url.searchParams));
  else target = input = replayContract.mathSrsReplaySubmitInputSchema.parse(body);
  let saved = await readSrsState(studentId, sim.table);
  const { kind, step } = target;
  if (input?.recordRetry) {
    if (kind !== "middle" || !input.missionId || input.dayId || input.revealSolution)
      throw new automation.CourseInvalidInput("오답 재풀이 요청을 확인해 주세요.");
    saved = await changeSrsState(studentId, (state) => {
      replayProblem(state, kind, step, now, input);
      return serverState.recordSrsRetry(state, input.missionId, input.problemId, input.submittedAnswer, now);
    }, sim.table);
  }
  if ("figure" in target && target.figure === "true") return { svg: true };
  return replayContract.mathSrsReplayResponseSchema.parse({
    data: {
      ...replayProblem(saved.state, kind, step, now, input, target.dayId),
      ...(input?.recordRetry ? { journey: dailyJourneyDto(saved.state, "middle", now) } : {}),
    },
  });
}

function failure(error) {
  if (error instanceof engine.ExplorerActionConflict || error instanceof serverState.SrsConflict || error instanceof automation.CourseConflict)
    return [409, "CONFLICT"];
  if (error instanceof engine.ExplorerActionInvalid || error instanceof automation.CourseInvalidInput || error?.name === "ZodError")
    return [400, "VALIDATION_ERROR"];
  if (error instanceof serverState.SrsUnavailable) return [503, "INTERNAL_ERROR"];
  return null;
}
const placeholderSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60" width="120" height="60"><rect x="2" y="2" width="116" height="56" fill="none" stroke="#888"/></svg>';

async function connect(page, sim) {
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/")) sim.requests++;
  });
  await page.route(
    (url) => url.pathname.startsWith("/api/"),
    async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const method = request.method();
      const path = url.pathname;
      const body = method === "POST" ? request.postDataJSON() : undefined;
      const now = new Date();
      if (sim.gate && sim.gate.path === path && sim.gate.method === method) await sim.gate.promise;
      let status = 200;
      let json;
      let svg = false;
      try {
        if (path === "/api/learn/math-explorers") {
          if (method === "POST") {
            const input = explorerContract.explorerRequestSchema.parse(body);
            sim.posts.push(input);
            const changed = await explorerChange(sim, input, now);
            await new Promise((done) => setTimeout(done, 100));
            if (sim.loseNext) {
              sim.loseNext = false;
              status = 503;
              json = { error: { code: "INTERNAL_ERROR", message: "연결을 확인하고 다시 시도해 주세요." } };
            } else json = { data: explorerData(sim, changed, changed.feedback, now) };
          } else json = { data: explorerData(sim, await readSrsState(studentId, sim.table), null, now) };
        } else if (path === "/api/learn/math-srs/course") json = await courseRequest(sim, method === "POST" ? "start" : "read", body, now);
        else if (path === "/api/learn/math-srs/course/attempts") json = await courseRequest(sim, "attempt", body, now);
        else if (path === "/api/learn/math-srs/course/hint") json = await courseRequest(sim, "hint", body, now);
        else if (path === "/api/learn/math-srs/course/figure") svg = true;
        else if (path === "/api/learn/math-srs") json = await middleRequest(sim, method === "POST" ? "start" : "read", body, now);
        else if (path === "/api/learn/math-srs/attempts") json = await middleRequest(sim, "attempt", body, now);
        else if (path === "/api/learn/math-srs/hint") json = await middleRequest(sim, "hint", body, now);
        else if (path === "/api/learn/math-srs/replay") {
          const result = await replayRequest(sim, url, body, now);
          if (result.svg) svg = true;
          else json = result;
        } else {
          sim.unknown.push(`${method} ${path}${url.search}${body ? " " + JSON.stringify(body).slice(0, 600) : ""}`);
          status = 404;
          json = { error: { code: "NOT_FOUND", message: "QA 가로채기에 없는 API" } };
        }
        if (method === "POST" && path !== "/api/learn/math-explorers") sim.posts.push({ path, body });
      } catch (error) {
        const mapped = failure(error);
        if (!mapped) {
          sim.unhandled.push(`${method} ${path}: ${error.stack ?? error}`);
          status = 500;
          json = { error: { code: "INTERNAL_ERROR", message: "시뮬레이터 오류" } };
        } else {
          [status] = mapped;
          json = { error: { code: mapped[1], message: error.message } };
        }
      }
      sim.handled++;
      if (svg) return route.fulfill({ status: 200, contentType: "image/svg+xml; charset=utf-8", body: placeholderSvg });
      return route.fulfill({ status, json });
    },
  );
}

// ───────────────────────── fixtures ─────────────────────────
const unitOf = (id) => cards.definitionUnits.find((unit) => unit.id === id);
const cardsOf = (unitId) => cards.definitionCards.filter((card) => card.unit === unitId);
function explorerRecord(grade, goalUnitId, collected = []) {
  const explorer = engine.createExplorerState(studentId, grade);
  const date = today();
  explorer.profile.definitions = {
    courseGrade: grade,
    ...(goalUnitId ? { goalUnitId } : {}),
    runs: 0,
    history: [],
    cards: Object.fromEntries(
      collected.map((card) => [
        card.id,
        { level: 1, due: addDays(date, 7), lastDate: addDays(date, -7), attemptedAt: addDays(date, -7), missed: 0, reviewStep: 1, reviewedAt: addDays(date, -7), lastRecall: "remembered" },
      ]),
    ),
  };
  return explorer;
}
// The largest real unit title (outside the workshop unit) — the home must hold it at 320px.
const longestUnit = [...cards.definitionUnits]
  .filter((unit) => unit.id !== "g5-fractions")
  .sort((a, b) => b.title.length - a.title.length)[0];
const fixtures = {
  concept: () => ({ ...serverState.emptySrsState(), explorers: explorerRecord(longestUnit.grade, longestUnit.id) }),
  workshop: () => ({ ...serverState.emptySrsState(), explorers: explorerRecord(5, "g5-fractions") }),
  "bank-elementary": () => {
    const now = new Date();
    const sectionId = bankSectionsForExplorerUnit("g5-divisors")[0];
    const course = automation.setCoursePlan(automation.emptyCourseState(), { startSectionId: sectionId, dailyQuestionCount: 10, enabled: true, expectedRevision: 0 }, now);
    return { ...serverState.emptySrsState(), course, explorers: explorerRecord(5, undefined, cardsOf("g5-divisors")) };
  },
  "bank-middle": () => ({ ...serverState.emptySrsState(), explorers: explorerRecord(7, "g7-equation", cardsOf("g7-equation")) }),
  tabs: () => ({ ...serverState.emptySrsState(), explorers: explorerRecord(longestUnit.grade, longestUnit.id) }),
};

// ───────────────────────── explorer answers ─────────────────────────
function explorerStored(sim) {
  return sim.state.explorers;
}
function currentTask(sim) {
  const session = explorerStored(sim).profile.definitions?.session;
  return session && !session.done ? session.queue[session.index] : null;
}
function attachedWorkshop(sim) {
  const stored = explorerStored(sim);
  const session = stored.profile.definitions?.session;
  const workshop = stored.profile.workshop?.session;
  return session && workshop && workshop.stage !== "complete" && workshop.attachedTo.sessionId === session.id ? workshop : null;
}
function workshopCorrect(workshop) {
  const questionId = workshopLib.workshopQuestionId(workshop);
  if (workshop.stage === "predict") return { type: "lab-predict", questionId, choiceId: 0 };
  if (workshop.stage === "split") return { type: "lab-split", questionId, factor: 3 };
  if (workshop.stage === "match") return { type: "lab-match", questionId, factors: [3, 2] };
  if (workshop.stage === "rule") return { type: "lab-rule", questionId, choiceId: workshopLib.workshopOptions(workshop).indexOf(1) };
  const question = workshop.questions[workshop.checkIndex];
  return { type: "lab-check", questionId, parts: question.fractions.map((f) => (f.numerator * question.denominator) / f.denominator) };
}
function correctExplorerAction(sim) {
  const stored = explorerStored(sim);
  const workshop = attachedWorkshop(sim);
  if (workshop) return workshopCorrect(workshop);
  const session = stored.profile.definitions.session;
  const questionId = cards.definitionQuestionId(session);
  if (cards.definitionNeedsRead(stored.profile, session)) return { type: "read", questionId };
  const task = session.queue[session.index];
  const card = cards.definitionCard(task.cardId);
  const sourceIds = task.kind === 0 ? [0, 1] : task.kind === 1 ? card.examples.flatMap((e, i) => (e.yes ? [i] : [])) : [Number(card.truth)];
  const order = cards.definitionOptions(session, task);
  return { type: "answer", questionId, choiceIds: sourceIds.map((id) => order.indexOf(id)) };
}
function wrongExplorerAction(sim) {
  const session = explorerStored(sim).profile.definitions.session;
  return { type: "answer", questionId: cards.definitionQuestionId(session), choiceIds: [] };
}
async function fastForward(sim, stop, choose = correctExplorerAction, limit = 200) {
  for (let count = 0; count < limit; count++) {
    if (stop(sim)) return count;
    await explorerPost(sim, choose(sim));
  }
  throw new Error("fast-forward did not reach its stop condition");
}

// ───────────────────────── browser helpers ─────────────────────────
const wait = (ms) => new Promise((done) => setTimeout(done, ms));
async function until(predicate, label, timeout = 8000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await predicate()) return;
    await wait(40);
  }
  throw new Error(`시간 초과: ${label}`);
}
async function tap(locator, mobile) {
  if (mobile) await locator.tap();
  else await locator.click();
}
const nav = (page) => page.locator('nav[aria-label="학생 학습 메뉴"]:visible');
// 눈에 보이는 글자 — KaTeX 의 스크린리더용 MathML 을 뺀다.
async function visibleText(locator) {
  return locator.evaluate((el) => {
    const clone = el.cloneNode(true);
    clone.querySelectorAll(".katex-mathml").forEach((node) => node.remove());
    return (clone.textContent ?? "").replace(/\s+/g, " ");
  });
}
async function noHorizontalScroll(page) {
  const doc = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: innerWidth }));
  assert.ok(doc.scroll <= doc.inner + 1, "가로 스크롤: " + JSON.stringify(doc));
}
async function practiceGeometry(page, mobile) {
  const dock = await page.locator("[data-explorer-dock=true]").boundingBox();
  const frame = await page.getByRole("region", { name: "개념 문제와 답 고르기" }).boundingBox();
  assert.ok(dock && frame, "풀이 틀과 답안 영역이 있다");
  const doc = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, innerWidth, innerHeight, scrollY }));
  assert.ok(doc.width <= doc.innerWidth + 1 && doc.height <= doc.innerHeight + 1, "고정 풀이 화면이 스크롤된다: " + JSON.stringify(doc));
  assert.equal(doc.scrollY, 0);
  let navBox = null;
  if (mobile) {
    navBox = await nav(page).boundingBox();
    assert.ok(navBox, "풀이 중에도 하단 탭이 보인다");
    assert.ok(dock.y + dock.height <= navBox.y + 1, "답안 영역이 하단 탭을 덮는다");
    assert.ok(navBox.y - dock.y - dock.height < 22, "답안 영역이 하단 탭에서 떨어져 있다: " + (navBox.y - dock.y - dock.height));
  }
  assert.equal(await page.locator("input:not([type=hidden]),textarea").count(), 0, "타이핑 입력이 없다");
  return { dock, frame, nav: navBox };
}
function sameGeometry(actual, original, label = "") {
  for (const region of ["dock", "frame"])
    for (const axis of ["x", "y", "width", "height"])
      assert.ok(Math.abs(actual[region][axis] - original[region][axis]) < 1.1,
        `${label} ${region}.${axis} 이동: ${original[region][axis]} → ${actual[region][axis]}`);
}
async function overlay(page, result, baseline, mobile) {
  const effect = page.locator(`[data-answer-feedback=${result}]`);
  await effect.waitFor({ timeout: 5000 });
  assert.deepEqual(
    await effect.evaluate((el) => ({ position: getComputedStyle(el).position, pointerEvents: getComputedStyle(el).pointerEvents })),
    { position: "absolute", pointerEvents: "none" },
  );
  if (baseline) sameGeometry(await practiceGeometry(page, mobile), baseline, "오버레이 중");
  assert.equal(await page.locator("[data-explorer-solution]").count(), 0, "해설이 자동으로 열렸다");
}
async function settled(page, sim) {
  await expect(page.locator("[data-answer-feedback]")).toHaveCount(0, { timeout: 8000 });
  const stored = explorerStored(sim);
  const session = stored.profile.definitions?.session;
  if (!session || session.done) return;
  const workshop = attachedWorkshop(sim);
  if (workshop) await expect(page.locator(`[data-workshop-stage="${workshop.stage}"]`)).toBeVisible({ timeout: 8000 });
  else {
    const activity = engine.explorerView(stored, today()).currentActivity;
    const pane = page.locator("[data-page-turn=true]");
    // 카드 이름은 KaTeX 로 그린다(트랙 K) — `textContent` 는 스크린리더용 MathML 글자를 겹쳐 담아
    // «곱이 0인 성질» 이 «곱이 000인 성질» 로 읽힌다. 눈에 보이는 글자로 견준다.
    await expect.poll(() => visibleText(pane), { timeout: 8000 }).toContain(activity.cardName);
    await expect(pane).toContainText(activityNames[activity.kind], { timeout: 8000 });
  }
  await expect(page.locator('progress[aria-label="이번 학습 진행률"]')).toHaveAttribute("value", String(session.index), { timeout: 8000 });
  await expect(page.locator("main")).toContainText(session.round ? `오답 복습 ${session.round}회` : "오늘의 개념 탐험");
  await page.waitForTimeout(560);
  const overflow = await paneOverflow(page);
  assert.equal(overflow, null, "문제 칸 가로 넘침(PC 에서는 가로 막대): " + JSON.stringify(overflow));
}
// 문제 칸(스크롤 칸)이 가로로 넘치는가 — 원장님 제보(2026-09-27, PC «정의 조립»): 칸 아래 쓸데없는 가로 막대, 손잡이가
// 칸 폭의 약 75%. 폰은 막대가 겹쳐 떠서 안 보일 뿐 같은 넘침이다. 넘치면 원인을 짚어 돌려준다 — 칸 밖으로 나간 자식
// 상자, 그리고 책장 넘김 빛 띠(`::after`)를 끄면 넘침이 사라지는가.
async function paneOverflow(page) {
  return page.evaluate(() => {
    const pane = document.querySelector("[data-page-turn=true]");
    if (!pane) return null;
    const over = pane.scrollWidth - pane.clientWidth;
    if (over <= 1) return null;
    const edge = pane.getBoundingClientRect().left + pane.clientLeft + pane.clientWidth;
    const children = [...pane.querySelectorAll("*")]
      .filter((el) => !el.parentElement.closest(".katex") && el.getBoundingClientRect().right > edge + 1)
      .slice(0, 3)
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]} +${Math.round(el.getBoundingClientRect().right - edge)}px`);
    const after = getComputedStyle(pane, "::after");
    const style = document.createElement("style");
    style.textContent = "[data-page-turn]::after{display:none!important}";
    document.head.append(style);
    const withoutLight = pane.scrollWidth - pane.clientWidth;
    style.remove();
    return { over, width: pane.clientWidth, children, afterTransform: after.transform, withoutLight };
  });
}
// Performs one explorer action through the real controls and waits for its response.
async function perform(page, sim, action, mobile) {
  const handled = sim.handled;
  const choices = page.getByRole("group", { name: "답 고르기" });
  if (action.type === "read") await tap(page.getByRole("button", { name: /정의를 가리고 도전하기/ }), mobile);
  else if (action.type === "answer") {
    const activity = engine.explorerView(explorerStored(sim), today()).currentActivity;
    if (!action.choiceIds.length) await tap(page.getByRole("button", { name: "아직 모르겠어요" }), mobile);
    else {
      for (const id of action.choiceIds) await tap(choices.getByRole("button").nth(id), mobile);
      if (activity.kind === "assemble") await tap(page.getByRole("button", { name: "완성한 정의 확인하기" }), mobile);
      if (activity.kind === "examples") await tap(page.getByRole("button", { name: "선택한 예 확인하기" }), mobile);
    }
  } else if (action.type === "lab-predict" || action.type === "lab-rule") {
    const view = workshopLib.workshopView(explorerStored(sim).profile.workshop, today()).session;
    const index = view.choices.findIndex((choice) => choice.id === action.choiceId);
    await tap(choices.getByRole("button").nth(index), mobile);
  } else if (action.type === "lab-split" || action.type === "lab-match") {
    // The control keeps its value after a wrong try (same question ID), so read the screen.
    const targets = action.type === "lab-split" ? [action.factor] : action.factors;
    for (const [index, target] of targets.entries()) {
      const more = page.getByRole("button", { name: `${index + 1}번째 분수 나누는 수 늘리기` });
      const less = page.getByRole("button", { name: `${index + 1}번째 분수 나누는 수 줄이기` });
      for (let guard = 0; guard < 10; guard++) {
        const value = Number(await more.evaluate((el) => el.parentElement.querySelector("strong").firstChild.textContent));
        if (value === target) break;
        await tap(value < target ? more : less, mobile);
      }
    }
    await tap(page.getByRole("button", { name: "나눈 조각 확인하기" }), mobile);
  } else if (action.type === "lab-check") {
    for (const [index, count] of action.parts.entries())
      for (let part = 0; part < count; part++)
        await tap(page.getByRole("button", { name: `${index + 1}번째 분수 ${part + 1}번째 조각`, exact: true }), mobile);
    await tap(page.getByRole("button", { name: "칠한 조각 확인하기" }), mobile);
  } else throw new Error("unknown action " + action.type);
  await until(() => sim.handled > handled, `${action.type} 응답`);
}
async function homeReady(page) {
  await page.locator("[data-expedition-mission=true]").waitFor({ timeout: 20000 });
  await expect(page.locator("[data-daily-journey]")).toBeVisible();
}
async function homeFold(page, mobile, height, expected) {
  await homeReady(page);
  const mission = page.locator("[data-expedition-mission=true]");
  const title = (await page.locator("#today-mission-title").innerText()).trim();
  if (expected.title) assert.equal(title, expected.title, "첫 화면 단원명");
  await expect(mission).toContainText(expected.amount);
  assert.equal(await page.locator("[data-expedition-start]").count(), 1, "주 버튼은 하나");
  const limit = mobile ? (await nav(page).boundingBox()).y : height;
  const boxes = {};
  for (const [key, locator] of [
    ["title", page.locator("#today-mission-title")],
    ["progress", mission.getByRole("progressbar")],
    ["cta", page.locator("[data-expedition-start]")],
  ]) {
    const box = await locator.boundingBox();
    assert.ok(box && box.y >= 0 && box.y + box.height <= limit + 0.5, `${key} 가 접힘 아래: ${JSON.stringify(box)} / ${limit}`);
    boxes[key] = { top: Math.round(box.y), bottom: Math.round(box.y + box.height) };
  }
  boxes.limit = Math.round(limit);
  await noHorizontalScroll(page);
  return boxes;
}
async function navTabs(page, mobile) {
  if (!mobile) return "데스크톱: 하단 탭 없음(본문 링크)";
  const links = nav(page).getByRole("link");
  assert.deepEqual(await links.allInnerTexts(), ["탐험", "도감", "강의"]);
  assert.deepEqual(
    await links.evaluateAll((items) => items.map((a) => [a.getAttribute("href"), a.getAttribute("aria-current")])),
    [["/learn", "page"], ["/learn?view=collection", null], ["/learn/lectures", null]],
  );
  return "탐험·도감·강의, 탐험 강조";
}
// D-142: 예정 칸마다 서버가 낸 단원(초등은 소단원) — 그 뒤는 «다음 여정». 가운데는 «나의 진행». 이름이 잘리거나
// 낱말이 두 줄에 걸치지 않는다(칸 안에서만 · `scripts/qa/daily-journey-board.mjs` 가 이름 전부를 따로 잰다).
async function futureTiles(page, sim) {
  const journey = expeditionJourney(sim.state, new Date(), studentId);
  const tiles = await page.locator('[data-daily-journey] li[data-state="upcoming"]').evaluateAll((items) =>
    items.map((li) => ({ step: Number(li.getAttribute("data-day-step")), text: li.innerText.replace(/\s+/g, "") })),
  );
  for (const tile of tiles) {
    const planned = journey.upcoming[tile.step - journey.completedDays - 1];
    const expected = (planned?.title ?? "다음 여정").replace(/\s+/g, "");
    assert.ok(tile.text.includes(expected), `${tile.step}일차 칸 «${tile.text}» ≠ 예정 «${expected}»`);
  }
  const centre = await visibleText(page.locator("[data-journey-progress]"));
  assert.ok(journey.position && centre.includes(journey.position.title) && centre.includes(`${journey.position.ordinal}번째`), "가운데 나의 진행: " + centre);
  const defects = await page.evaluate(() => {
    const bad = [];
    for (const el of document.querySelectorAll("[data-daily-journey] [data-tile-title]")) {
      if (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1) bad.push("잘림 " + el.textContent);
      for (const word of el.querySelectorAll("span")) {
        const lines = new Set([...word.getClientRects()].filter((r) => r.width > 0.5).map((r) => Math.round(r.top)));
        if (lines.size > 1) bad.push("쪼개짐 " + word.textContent);
      }
    }
    return bad;
  });
  assert.deepEqual(defects, [], "진도판 칸 이름");
  const named = tiles.filter((tile) => journey.upcoming[tile.step - journey.completedDays - 1]).length;
  return `예정 ${tiles.length}칸 중 이름 ${named} · 가운데 «${journey.position.caption} ${journey.position.ordinal}번째»`;
}
async function pawn(page) {
  return Number(await page.locator("[data-pawn-day]").getAttribute("data-pawn-day"));
}
function explorerSnapshot(sim) {
  const state = sim.state;
  return structuredClone({
    stars: state.explorers.profile.stars,
    earned: state.explorers.profile.earned,
    cards: state.explorers.profile.definitions.cards,
    days: state.explorers.completedDays,
    awards: state.expedition?.awards ?? [],
    mission: state.expedition?.mission ?? null,
  });
}

// ───────────────────────── scenarios ─────────────────────────
// Each `step(key, fn)` records 통과/실패; the first failure stops the scenario
// (later keys become «못 봄 — 앞 단계 실패»).
const scenarios = {
  async concept({ page, sim, mobile, height, step, shot }) {
    sim.longExamples = true;
    await step("home.fold", async () => {
      await page.goto(base + "/dev/mobile-explorers-qa");
      const boxes = await homeFold(page, mobile, height, { title: longestUnit.title, amount: "0 / 15 활동" });
      await shot("home");
      return `단원 «${longestUnit.title}» · 버튼 ${boxes.cta.top}–${boxes.cta.bottom} / 경계 ${boxes.limit}`;
    });
    await step("home.nav", () => navTabs(page, mobile));
    await step("home.hscroll", () => noHorizontalScroll(page));
    await step("home.sheet", async () => {
      await tap(page.getByRole("button", { name: /도감/ }).first(), mobile);
      const sheet = page.getByRole("dialog", { name: "나의 개념 도감" });
      await expect(sheet).toBeVisible();
      await tap(sheet.getByRole("button", { name: "나의 개념 도감 닫기" }), mobile);
      await expect(sheet).toHaveCount(0);
    });
    await step("home.future", () => futureTiles(page, sim));

    let baseline;
    await step("concept.start", async () => {
      const cta = page.locator("[data-expedition-start]");
      await expect(cta).toHaveText(/오늘의 탐험 시작/);
      await cta.evaluate((el) => { el.click(); el.click(); });
      await page.locator("[data-explorer-dock=true]").waitFor({ timeout: 10000 });
      assert.equal(sim.posts.filter((p) => p.action?.type === "expedition-start").length, 1, "시작 버튼 연타가 요청 하나");
      assert.equal(sim.state.expedition.mission.kind, "explorers");
      await settled(page, sim);
      assert.equal(engine.explorerView(explorerStored(sim), today()).currentActivity.kind, "read");
      baseline = await practiceGeometry(page, mobile);
      await shot("practice-read");
      return `개념 미션(${sim.state.expedition.mission.title}) · 같은 틀`;
    });
    await step("concept.frame", async () => {
      const g = baseline;
      return mobile ? `답안 하단 ${Math.round(g.dock.y + g.dock.height)} · 탭 위 ${Math.round(g.nav.y)}` : "데스크톱: 문서 스크롤 없음";
    });
    await step("concept.pageturn", async () => {
      await perform(page, sim, correctExplorerAction(sim), mobile);
      await settled(page, sim);
      const pane = page.locator("[data-page-turn=true]");
      const name = await pane.evaluate((el) => getComputedStyle(el).animationName);
      assert.ok(name && name !== "none", "책장 넘김 애니메이션: " + name);
      sameGeometry(await practiceGeometry(page, mobile), baseline, "읽기→조립");
      return `animation ${name}`;
    });
    await step("concept.assemble", async () => {
      const activity = engine.explorerView(explorerStored(sim), today()).currentActivity;
      assert.equal(activity.kind, "assemble");
      const assembly = correctExplorerAction(sim);
      const answers = () => sim.posts.filter((p) => p.action?.type === "answer").length;
      const before = answers();
      const choices = page.getByRole("group", { name: "답 고르기" });
      for (const id of assembly.choiceIds) await tap(choices.getByRole("button").nth(id), mobile);
      assert.equal(answers(), before, "조립은 확인 전에 제출하지 않는다");
      await tap(page.getByRole("button", { name: /^빈칸 2,/ }), mobile);
      await tap(choices.getByRole("button").nth(assembly.choiceIds[1]), mobile);
      await shot("assemble");
      const handled = sim.handled;
      await tap(page.getByRole("button", { name: "완성한 정의 확인하기" }), mobile);
      await until(() => sim.handled > handled, "조립 응답");
      await overlay(page, "correct", baseline, mobile);
      assert.equal(answers(), before + 1);
    });
    await step("concept.duplicate", async () => {
      const count = sim.posts.length;
      const buttons = page.getByRole("group", { name: "답 고르기" }).getByRole("button");
      if (await page.locator("[data-answer-feedback]").count()) await buttons.first().evaluate((el) => el.click()).catch(() => {});
      await page.waitForTimeout(150);
      assert.equal(sim.posts.length, count, "이펙트 중 탭이 요청을 보냈다");
      await settled(page, sim);
      sameGeometry(await practiceGeometry(page, mobile), baseline, "조립→예");
    });
    let target;
    await step("concept.scroll", async () => {
      assert.equal(engine.explorerView(explorerStored(sim), today()).currentActivity.kind, "examples");
      const pane = page.locator("[data-page-turn=true]");
      const sizes = await pane.evaluate((el) => ({ sh: el.scrollHeight, ch: el.clientHeight }));
      assert.ok(sizes.sh > sizes.ch, "긴 문제가 틀 안에서 스크롤되지 않는다");
      await pane.evaluate((el) => { el.scrollTop = el.scrollHeight; });
      sameGeometry(await practiceGeometry(page, mobile), baseline, "내부 스크롤 뒤");
      return `문제 영역 ${sizes.sh}px / 보이는 ${sizes.ch}px (긴 발문은 시험용으로 덧붙임)`;
    });
    await step("concept.multi", async () => {
      const answer = correctExplorerAction(sim);
      const wrongId = [0, 1, 2, 3].find((id) => !answer.choiceIds.includes(id));
      const before = sim.posts.length;
      await tap(page.getByRole("group", { name: "답 고르기" }).getByRole("button").nth(wrongId), mobile);
      assert.equal(sim.posts.length, before, "복수 선택은 확인 전 제출하지 않는다");
      target = explorerStored(sim).profile.definitions.session.queue[explorerStored(sim).profile.definitions.session.index];
      const handled = sim.handled;
      await tap(page.getByRole("button", { name: "선택한 예 확인하기" }), mobile);
      await until(() => sim.handled > handled, "예 응답");
    });
    await step("concept.overlay", async () => {
      await overlay(page, "incorrect", baseline, mobile);
      assert.equal(await page.locator("[data-answer-state=correct]").count(), 0, "오답 뒤 정답 보기가 드러났다");
      await shot("incorrect");
      await settled(page, sim);
      return "정답·해설 비공개, 틀·답안 위치 불변";
    });
    await step("concept.single", async () => {
      const activity = engine.explorerView(explorerStored(sim), today()).currentActivity;
      assert.equal(activity.kind, "truth");
      const choices = page.getByRole("group", { name: "답 고르기" });
      assert.equal(await choices.getByRole("button").count(), 2);
      assert.equal(await page.getByRole("button", { name: /확인하기$/ }).count(), 0, "단일 선택에 확인 버튼");
      sim.loseNext = true;
      const truth = correctExplorerAction(sim);
      const postsBefore = sim.posts.length;
      await choices.getByRole("button").nth(truth.choiceIds[0]).evaluate((el) => { el.click(); el.click(); });
      await page.getByRole("button", { name: "같은 요청 다시 시도" }).waitFor();
      assert.equal(sim.posts.length, postsBefore + 1, "연타가 요청 하나");
      sameGeometry(await practiceGeometry(page, mobile), baseline, "응답 유실 뒤");
      return "탭 즉시 제출, 연타 1회";
    });
    await step("concept.retryRequest", async () => {
      const lost = sim.posts.at(-1);
      const revision = sim.revision;
      await tap(page.getByRole("button", { name: "같은 요청 다시 시도" }), mobile);
      await overlay(page, "correct", baseline, mobile);
      assert.deepEqual(sim.posts.at(-1), lost, "같은 요청번호·판·답으로 다시 보냄");
      assert.equal(sim.revision, revision, "영수증으로 응답(두 번 저장 안 함)");
      await settled(page, sim);
    });
    await step("motion.reduced", async () => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      const pane = page.locator("[data-page-turn=true]");
      assert.equal(await pane.evaluate((el) => getComputedStyle(el).animationName), "none");
      let checkedOverlay = false;
      for (let guard = 0; guard < 3 && !checkedOverlay; guard++) {
        const next = correctExplorerAction(sim);
        await perform(page, sim, next, mobile);
        if (next.type === "answer") {
          const effect = page.locator("[data-answer-feedback]");
          await effect.waitFor();
          const hidden = await effect.evaluate((el) => [...el.querySelectorAll("span")].filter((s) => getComputedStyle(s).display === "none").length);
          assert.ok(hidden >= 1, "움직임 축소에서도 고리 이펙트가 보인다");
          checkedOverlay = true;
        }
        await settled(page, sim);
      }
      assert.ok(checkedOverlay, "움직임 축소 중 오버레이를 보지 못했다");
      assert.equal(await page.locator("[data-page-turn=true]").evaluate((el) => getComputedStyle(el).animationName), "none");
      await page.emulateMedia({ reducedMotion: "no-preference" });
      return "책장 넘김 none · 오버레이 고리 숨김";
    });
    await step("concept.exitResume", async () => {
      const index = explorerStored(sim).profile.definitions.session.index;
      await tap(page.getByRole("button", { name: "← 진도판", exact: true }), mobile);
      await homeReady(page);
      await expect(page.locator("[data-expedition-mission=true]")).toContainText(`${index} / 15 활동`);
      await expect(page.locator("[data-expedition-start]")).toHaveText(/이어서 탐험하기/);
      assert.equal(await pawn(page), 0, "진행 중에 말이 움직였다");
      await futureTiles(page, sim);
      const current = await page.locator('[data-daily-journey] li[data-state="current"]').innerText();
      assert.ok(current.includes(sim.state.expedition.mission.title), "현재 칸 = 오늘 미션 단원: " + current);
      await shot("home-active");
      await tap(page.locator("[data-expedition-start]"), mobile);
      await page.locator("[data-explorer-dock=true]").waitFor();
      await settled(page, sim);
      assert.equal(explorerStored(sim).profile.definitions.session.index, index, "이어하기가 새로 시작했다");
      return `진행 ${index}/15 유지 · 현재 칸 «${sim.state.expedition.mission.title}»`;
    });
    await step("retry.notComplete", async () => {
      const isTarget = (s) => {
        const task = currentTask(s);
        return task && task.cardId === target.cardId && task.kind === target.kind;
      };
      await fastForward(sim, (s) => explorerStored(s).profile.definitions.session.round === 3 && isTarget(s),
        (s) => (isTarget(s) && !cards.definitionNeedsRead(explorerStored(s).profile, explorerStored(s).profile.definitions.session) ? wrongExplorerAction(s) : correctExplorerAction(s)));
      await page.reload();
      await homeReady(page);
      await tap(page.locator("[data-expedition-start]"), mobile);
      await page.locator("[data-explorer-dock=true]").waitFor();
      await settled(page, sim);
      await expect(page.locator("main")).toContainText("오답 복습 3회");
      await perform(page, sim, wrongExplorerAction(sim), mobile);
      await page.locator("[data-answer-feedback=incorrect]").waitFor();
      await homeReady(page);
      const mission = page.locator("[data-expedition-mission=true]");
      await expect(mission).toContainText("다시 풀 문제 1개를 마치면 한 칸 전진해요.");
      await expect(mission).not.toContainText("오늘의 한 칸 완료");
      await expect(page.locator("[data-expedition-start]")).toHaveText(/남은 문제 다시 풀기/);
      assert.equal(await pawn(page), 0, "남은 문제가 있는데 말이 움직였다");
      assert.equal(sim.state.expedition.mission.status, "retry");
      assert.equal(await page.locator("dialog[open]").count(), 0, "해설 모달이 자동으로 열렸다");
      assert.equal(await page.locator("[data-explorer-solution]").count(), 0);
      await shot("home-retry");
      return "«다시 풀 문제 1개» · 버튼 «남은 문제 다시 풀기» · 말 0";
    });
    await step("retry.solutionModal", async () => {
      const card = cards.definitionCard(target.cardId);
      const escaped = card.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const opener = page.getByRole("button", { name: new RegExp(`^${escaped}\\s*해설 보기`) });
      await opener.scrollIntoViewIfNeeded();
      // Document coordinates: the tap may scroll, the modal must not move the page.
      const docBox = async () => {
        const box = await page.locator("[data-expedition-mission=true]").boundingBox();
        const scrollY = await page.evaluate(() => scrollY);
        return { x: box.x, y: box.y + scrollY, width: box.width, height: box.height, scrollY };
      };
      const before = await docBox();
      await tap(opener, mobile);
      const dialog = page.getByRole("dialog", { name: card.name });
      await expect(dialog).toBeVisible();
      assert.equal(await dialog.locator("[data-explorer-solution]").count(), 0, "누르기 전 해설 본문이 보인다");
      await tap(dialog.getByRole("button", { name: "정의와 해설 보기" }), mobile);
      await expect(dialog.locator("[data-explorer-solution]")).toBeVisible();
      const after = await docBox();
      for (const axis of ["x", "y", "width", "height"])
        assert.ok(Math.abs(after[axis] - before[axis]) < 1.1, `모달이 배경 배치를 바꿨다: ${JSON.stringify({ before, after })}`);
      await shot("solution-modal");
      await tap(dialog.getByRole("button", { name: "개념 카드 닫기" }), mobile);
      await expect(page.locator("dialog[open]")).toHaveCount(0);
      return `«${card.name}» 해설 — 누를 때만`;
    });
    await step("retry.resume", async () => {
      await tap(page.locator("[data-expedition-start]"), mobile);
      await page.locator("[data-explorer-dock=true]").waitFor();
      assert.equal(sim.posts.at(-1).action.type, "retry-unresolved");
      const retryBase = await practiceGeometry(page, mobile);
      sameGeometry(retryBase, baseline, "재도전 틀");
      await settled(page, sim);
      for (let guard = 0; guard < 20 && !explorerStored(sim).profile.definitions.session.done; guard++) {
        await perform(page, sim, correctExplorerAction(sim), mobile);
        await settled(page, sim);
      }
      await homeReady(page);
      await expect(page.locator("[data-expedition-mission=true]")).toContainText("오늘의 한 칸 완료");
      await expect(page.locator("[data-expedition-mission=true]")).toContainText("한 칸 전진했어요. 다음 탐험은 내일 열려요.");
      assert.equal(await page.locator("[data-expedition-start]").count(), 0, "완료 뒤에도 시작 버튼");
      await expect(page.locator("[data-pawn-day]")).toHaveAttribute("data-pawn-day", "1", { timeout: 5000 });
      assert.equal(sim.state.expedition.awards.length, 1);
      await expect(page.locator('[data-day-step="1"]')).toContainText(sim.state.expedition.mission.title);
      await shot("home-complete");
      return "완료 칸 1 · 말 1";
    });
    await step("past.readonly", async () => {
      const earned = explorerSnapshot(sim);
      await tap(page.locator('[data-day-step="1"]').getByRole("button"), mobile);
      await page.locator("[data-explorer-dock=true]").waitFor();
      assert.equal(explorerStored(sim).profile.definitions.session.reviewOnly, true);
      await expect(page.getByText("지난 학습 다시 풀기", { exact: true })).toBeVisible();
      sameGeometry(await practiceGeometry(page, mobile), baseline, "지난 칸 재풀이 틀");
      await settled(page, sim);
      await perform(page, sim, correctExplorerAction(sim), mobile);
      await settled(page, sim);
      await fastForward(sim, (s) => {
        const session = explorerStored(s).profile.definitions.session;
        return session.index === session.queue.length - 1 && !cards.definitionNeedsRead(explorerStored(s).profile, session);
      });
      await page.reload();
      await homeReady(page);
      await expect(page.locator("[data-expedition-start]")).toHaveText(/지난 학습 이어하기/);
      await tap(page.locator("[data-expedition-start]"), mobile);
      await page.locator("[data-explorer-dock=true]").waitFor();
      await settled(page, sim);
      await perform(page, sim, correctExplorerAction(sim), mobile);
      await homeReady(page);
      assert.equal(await pawn(page), 1, "지난 칸 재풀이가 말을 움직였다");
      const now = explorerSnapshot(sim);
      assert.deepEqual({ ...now, mission: null }, { ...earned, mission: null }, "지난 칸 재풀이가 별·카드·기록을 바꿨다");
      return "별·카드·칸·수상 불변";
    });
  },

  async workshop({ page, sim, mobile, height, step, shot }) {
    let baseline;
    await step("workshop.frame", async () => {
      await page.goto(base + "/dev/mobile-explorers-qa");
      await homeFold(page, mobile, height, { title: "약분·통분과 분수 계산", amount: "0 / 15 활동" });
      await tap(page.locator("[data-expedition-start]"), mobile);
      await page.locator("[data-explorer-dock=true]").waitFor();
      await fastForward(sim, (s) => {
        const task = currentTask(s);
        return task?.cardId === "g5-common-denominator" && task.kind === 0 && cards.definitionNeedsRead(explorerStored(s).profile, explorerStored(s).profile.definitions.session);
      });
      await page.reload();
      await homeReady(page);
      await tap(page.locator("[data-expedition-start]"), mobile);
      await page.locator("[data-explorer-dock=true]").waitFor();
      await settled(page, sim);
      baseline = await practiceGeometry(page, mobile);
      await perform(page, sim, correctExplorerAction(sim), mobile);
      assert.ok(attachedWorkshop(sim), "통분 읽기 뒤 조작 활동이 붙지 않았다");
      await settled(page, sim);
      await expect(page.getByRole("region", { name: "개념 문제와 답 고르기" }).locator("[data-workshop-stage]")).toBeVisible();
      sameGeometry(await practiceGeometry(page, mobile), baseline, "개념→조작");
      await shot("workshop-predict");
      return "읽기→조작: 같은 region·답안 위치";
    });
    await step("workshop.flow", async () => {
      const seen = [];
      // One deliberate mistake: the split stays open and shows the incorrect overlay.
      let wrongSplit = true;
      for (let guard = 0; guard < 12 && attachedWorkshop(sim); guard++) {
        const workshop = attachedWorkshop(sim);
        seen.push(workshop.stage);
        let action = workshopCorrect(workshop);
        if (workshop.stage === "split" && wrongSplit) {
          wrongSplit = false;
          action = { ...action, factor: 2 };
          await perform(page, sim, action, mobile);
          await overlay(page, "incorrect", baseline, mobile);
          await settled(page, sim);
          assert.equal(attachedWorkshop(sim).stage, "split");
          continue;
        }
        await perform(page, sim, action, mobile);
        if (action.type !== "lab-predict") await overlay(page, "correct", baseline, mobile);
        if (workshop.stage === "check") await shot(`workshop-check-${workshop.checkIndex}`);
        await settled(page, sim);
        sameGeometry(await practiceGeometry(page, mobile), baseline, `조작 ${workshop.stage}`);
      }
      assert.equal(attachedWorkshop(sim), null);
      const activity = engine.explorerView(explorerStored(sim), today()).currentActivity;
      assert.equal(activity.cardId, "g5-common-denominator");
      assert.equal(activity.kind, "assemble");
      sameGeometry(await practiceGeometry(page, mobile), baseline, "조작→조립");
      await shot("workshop-after");
      return seen.join("→") + " → 같은 틀에서 정의 조립";
    });
  },

  async "bank-elementary"(context) {
    return bankScenario(context, "elementary");
  },
  async "bank-middle"(context) {
    return bankScenario(context, "middle");
  },

  async tabs({ page, mobile, step }) {
    if (!mobile) return;
    await step("tabs.links", async () => {
      await page.goto(base + "/dev/mobile-explorers-qa");
      await homeReady(page);
      const results = [];
      for (const name of ["도감", "강의"]) {
        await page.goto(base + "/dev/mobile-explorers-qa");
        await homeReady(page);
        await tap(nav(page).getByRole("link", { name }), mobile);
        await page.waitForURL((url) => url.pathname !== "/dev/mobile-explorers-qa", { timeout: 20000 });
        await page.waitForLoadState("domcontentloaded");
        results.push(`${name} → ${new URL(page.url()).pathname}${new URL(page.url()).search}`);
      }
      return results.join(" · ") + " (로그인 없이는 인증 관문으로 간다)";
    });
  },
};

async function bankScenario({ page, sim, mobile, height, step, shot }, kind) {
  const prefix = kind === "elementary" ? "bank.el" : "bank.mid";
  const goal = kind === "elementary" ? 10 : 12;
  const plan = expedition.planExpedition(sim.state, studentId, new Date());
  assert.equal(plan.kind, kind, "픽스처 계획: " + JSON.stringify(plan));
  const sourcePath = kind === "elementary" ? "/api/learn/math-srs/course" : "/api/learn/math-srs";
  // D-142: 은행 화면 안의 옛 full 판(초등 은행 끝 화면 · 중1 결과 칸)이 탐험 안에서 실제로 뜨는가 — 한 번이라도 붙으면 적는다.
  // 새로 고침을 건너 모으려고 sessionStorage 에 적는다.
  await page.addInitScript(() => {
    const seen = () => JSON.parse(sessionStorage.getItem("qaFullBoards") ?? "[]");
    new MutationObserver(() => {
      const board = document.querySelector('[data-journey-variant="full"]');
      if (board && !board.dataset.seen) {
        board.dataset.seen = "true";
        sessionStorage.setItem("qaFullBoards", JSON.stringify([...seen(), [...board.querySelectorAll('li[data-state="upcoming"]')].slice(0, 3).map((li) => li.innerText.replace(/\s+/g, " ")).join(" | ")]));
      }
    }).observe(document, { childList: true, subtree: true });
  });
  const publicProblems = async () => {
    if (kind === "elementary") {
      const dto = await courseRequest(sim, "read", undefined, new Date());
      const session = sim.state.course.learner.session;
      return { problems: dto.data.session.problems, stored: session.problems, index: session.attempts.length, sessionId: session.id };
    }
    const mission = serverState.currentSrsMission(sim.state, new Date());
    const dto = await middleRequest(sim, "read", undefined, new Date());
    return { problems: dto.data.mission.problems, stored: mission.problems, index: mission.attempts.length, sessionId: mission.id };
  };
  const correctIndex = (publicProblem, stored) =>
    publicProblem.answerChoices.findIndex((choice) =>
      // 중등 복습은 숫자형·보기형(폰 «한 걸음», 2026-09-27) 모두 제품 채점 함수 하나로
      kind === "elementary" ? gradeCourseAnswer(stored, choice) === true : gradeSrsAnswer(stored, choice));
  async function answerInBrowser() {
    const { problems, stored, index } = await publicProblems();
    const choice = correctIndex(problems[index], stored[index]);
    assert.ok(choice >= 0, "정답 보기를 찾지 못했다");
    const handled = sim.handled;
    await tap(page.getByRole("group", { name: "답 고르기" }).getByRole("button").nth(choice), mobile);
    await until(() => sim.handled > handled, "은행 답 응답");
  }
  async function answerOnServer() {
    const { problems, stored, index, sessionId } = await publicProblems();
    const submittedAnswer = problems[index].answerChoices[correctIndex(problems[index], stored[index])];
    if (kind === "elementary")
      await courseRequest(sim, "attempt", { sessionId, problemId: stored[index].id, submittedAnswer }, new Date());
    else
      await middleRequest(sim, "attempt", { missionId: sessionId, problemId: stored[index].id, submittedAnswer, elapsedSeconds: 20, rating: "good" }, new Date());
  }
  const answered = () => sim.state.expedition?.mission?.answered ?? 0;

  await step(`${prefix}.home`, async () => {
    await page.goto(base + "/dev/mobile-explorers-qa");
    const boxes = await homeFold(page, mobile, height, { title: plan.title, amount: `0 / ${goal} 문제` });
    await shot("home");
    return `«${plan.title}» · 버튼 ${boxes.cta.top}–${boxes.cta.bottom} / 경계 ${boxes.limit}`;
  });
  await step(`${prefix}.loading`, async () => {
    let release;
    sim.gate = { path: sourcePath, method: "GET", promise: new Promise((done) => { release = done; }) };
    await page.evaluate(() => {
      window.__qaFrames = [];
      window.__qaStop = false;
      const tick = () => {
        const main = document.querySelector("main");
        const text = main ? main.innerText.trim().length : 0;
        window.__qaFrames.push({ main: !!main, text, status: !!document.querySelector('main [role="status"]') });
        if (!window.__qaStop && window.__qaFrames.length < 5000) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await tap(page.locator("[data-expedition-start]"), mobile);
    await page.getByRole("main").getByRole("status").waitFor({ timeout: 10000 });
    await shot("bank-loading");
    const loadingNav = mobile ? await nav(page).count() : 1;
    await page.waitForTimeout(400);
    release();
    sim.gate = null;
    await page.getByRole("group", { name: "답 고르기" }).waitFor({ timeout: 15000 });
    const frames = await page.evaluate(() => { window.__qaStop = true; return window.__qaFrames; });
    const blank = frames.filter((frame) => !frame.main || frame.text === 0);
    assert.equal(blank.length, 0, `빈 화면 프레임 ${blank.length}/${frames.length}`);
    assert.ok(frames.some((frame) => frame.status), "로딩 상태가 한 번도 안 보였다");
    assert.equal(loadingNav, 1, "로딩 중 하단 탭이 사라졌다");
    return `프레임 ${frames.length}개 중 빈 화면 0 · 로딩 문구 표시`;
  });
  await step(`${prefix}.frame`, async () => {
    assert.equal(sim.state.expedition.mission.kind, kind);
    await expect(page.locator("[data-expedition-mission]")).toHaveCount(0);
    const group = await page.getByRole("group", { name: "답 고르기" }).boundingBox();
    if (mobile) {
      const navBox = await nav(page).boundingBox();
      assert.ok(navBox, "은행 풀이 중 하단 탭");
      assert.ok(group.y + group.height <= navBox.y + 1, "보기가 하단 탭을 덮는다");
      await navTabs(page, mobile);
    }
    await noHorizontalScroll(page);
    assert.equal(await page.getByRole("heading", { name: "매일 쌓이는 수학" }).count(), 0, "은행 앱의 독립 홈이 보인다");
    await shot("bank-practice");
    await answerInBrowser();
    await page.locator("[data-answer-feedback=correct]").waitFor();
    await expect(page.locator("[data-answer-feedback]")).toHaveCount(0, { timeout: 8000 });
    assert.equal(answered(), 1);
    return "탐험 틀(StudentReviewPage) 안 보기 4개 · 탭 위 고정 · 정답 오버레이";
  });
  await step(`${prefix}.exit`, async () => {
    const reads = sim.handled;
    await tap(page.getByRole("button", { name: /학습 홈/ }), mobile);
    await homeReady(page);
    assert.ok(sim.handled > reads, "나간 뒤 탐험 기록을 다시 불러오지 않았다");
    await expect(page.locator("[data-expedition-mission=true]")).toContainText(`1 / ${goal} 문제`);
    await expect(page.locator("[data-expedition-start]")).toHaveText(/이어서 탐험하기/);
    assert.equal(await pawn(page), 0);
    await futureTiles(page, sim);
    return `홈 복귀 · 1/${goal} 유지`;
  });
  await step(`${prefix}.complete`, async () => {
    // Server-side: everything but the last problem (elementary spans two 5-problem sessions).
    for (let guard = 0; guard < 40 && answered() < goal - 1; guard++) {
      if (kind === "elementary") {
        const session = sim.state.course.learner.session;
        if (session.completedAt) await courseRequest(sim, "start", {}, new Date());
      }
      await answerOnServer();
    }
    assert.equal(answered(), goal - 1);
    await page.reload();
    await homeReady(page);
    await tap(page.locator("[data-expedition-start]"), mobile);
    await page.getByRole("group", { name: "답 고르기" }).waitFor({ timeout: 15000 });
    await answerInBrowser();
    await page.locator("[data-answer-feedback=correct]").waitFor();
    await homeReady(page);
    await expect(page.locator("[data-expedition-mission=true]")).toContainText("오늘의 한 칸 완료", { timeout: 8000 });
    await expect(page.locator("[data-pawn-day]")).toHaveAttribute("data-pawn-day", "1", { timeout: 5000 });
    assert.equal(sim.state.expedition.mission.status, "complete");
    await shot("bank-complete");
    const fullBoards = await page.evaluate(() => JSON.parse(sessionStorage.getItem("qaFullBoards") ?? "[]"));
    return `${goal}문제 완료 → 홈 · 말 1 · 은행 안 full 판 ${fullBoards.length ? "보임: " + fullBoards.join(" / ") : "안 보임"}`;
  });
  await step(`${prefix}.past`, async () => {
    const revision = sim.revision;
    await tap(page.locator('[data-day-step="1"]').getByRole("button"), mobile);
    const dialog = page.getByRole("dialog", { name: /1번 문제 다시 풀기/ });
    await expect(dialog).toBeVisible({ timeout: 10000 });
    const choices = dialog.getByRole("group", { name: "복습 답 고르기" }).getByRole("button");
    await choices.first().waitFor();
    await shot("bank-replay");
    await choices.nth(0).click();
    await page.waitForTimeout(1500);
    await tap(dialog.getByRole("button", { name: "복습 닫기" }), mobile);
    await expect(dialog).toHaveCount(0);
    assert.equal(sim.revision, revision, "지난 칸 재풀이가 기록을 바꿨다");
    assert.equal(await pawn(page), 1);
    return "재풀이 대화상자 · 저장 판 불변";
  });
}

// ───────────────────────── KaTeX fit (track K, 2026-09-27) ─────────────────────────
// 카드 글을 KaTeX 로 그리면(`ExplorerMath`) 글보다 넓거나 높아질 수 있다. 단원 하나의 활동 전부
// (뜻 만나기·정의 조립·예 모으기·경계 살피기, 통분 단원은 조각 활동까지)와 도감 카드 해설에서
// 보기·조각·빈칸·뜻이 **넘치거나 잘리지 않는가**를 잰다. `QA_SCENARIOS=katex` 로 켠다(기본 실행에는 안 낀다).
// 표본은 학년별로 가장 긴 보기·조각·발문·뜻, 근의 공식·분수 계산·단위식·대분수가 든 단원이다.
const KATEX_UNITS = (
  process.env.QA_KATEX_UNITS ??
  "g3-shapes,g3-measure,g4-fractions,g4-polygons,g5-divisors,g5-fractions,g5-area,g6-division,g6-proportion,g6-circle,numbers,g7-coordinate,g8-probability,g8-shapes,g9-equation,g9-function,g9-real"
).split(",");
const katexFindings = [];
const katexFitted = [];

// 한 화면의 넘침·잘림. 판정:
//  ① 숨은 스크롤 칸(보기 글 — `scrollbar-width: none` 이거나 단추 안)이 넘치면 **잉크가 잘리는지 픽셀로** 본다:
//     칸과 단추의 `overflow` 를 풀었을 때 그 둘레 그림이 달라지면 잘린 것이다.
//     ⚠️ 상자로 재지 않는다 — KaTeX 는 글자 없는 받침 상자(`.strut`)로 줄 높이를 잡고, 글자 줄 상자(em)도 실제
//     잉크보다 위아래로 약 0.2em 크다. 그래서 분수 하나(«3/4»)도 «세로 4px 잘림»으로 잡혔는데 화면은 멀쩡했다(거짓 경보).
//  ② 요소 상자가 가장 가까운 «잘리는 조상»(overflow ≠ visible)의 가로 범위 밖으로 나가면 안 된다.
//     조상의 `scrollWidth` 로 재지 않은 까닭 — 책장 넘김 빛 띠(`::after`, 투명·`translateX(35%)`)가 문제 칸의
//     scrollWidth 를 104px 늘려, 한글만 있는 활동에서도 늘 «넘침»이 났다. 🔴 그것을 «거짓 경보»로 걷어냈는데 **진짜 결함**
//     이었다 — 폰은 막대가 겹쳐 떠서 안 보였을 뿐, PC 에서는 칸 아래 가로 막대였다(원장님 제보 2026-09-27). 빛 띠는 고쳤고
//     (`question-page-turn.module.css`), 칸 넘침은 이제 `settled()` 의 `paneOverflow` 가 활동마다 잰다.
//     KaTeX 내부(`.katex` 안)와 화면 읽기용 1px 글은 뺀다.
//  ③ 수식(`.katex`)은 가장 가까운 잘리는 조상의 가로 범위와 화면 폭 안에 있어야 한다.
//  ④ 단추(보기·빈칸) 안 글 상자가 단추 밖으로 나가면 안 된다.
//  ⑤ 문서 가로 스크롤 0.
//  ⑥ 보기 글의 수식이 가로로 글자 칸 밖(단추 안쪽 여백)을 먹지 않는다 — 잘리지는 않아도 테두리에 닿는다.
// ⚠️ 이 파일에는 블록 주석을 쓰지 않는다 — 13행 줄 주석의 «/api/ 뒤 별 두 개»에서 격리 시험(`mathSrsRecordIsolation`)의
//    블록 주석 제거가 시작해, 다음 블록 주석 끝까지(2만여 글자, 기록 모듈을 부르는 줄 포함)를 지웠다(2026-09-27).
async function katexFit(page, rootSelector) {
  const problems = await katexBoxes(page, rootSelector);
  const candidates = page.locator("[data-qa-clip]");
  for (let index = 0; index < (await candidates.count()); index++) {
    const candidate = candidates.nth(index);
    if (await inkClipped(page, candidate)) problems.push(`잘림 «${await visibleText(candidate)}»`);
  }
  await page.evaluate(() => document.querySelectorAll("[data-qa-clip]").forEach((node) => node.removeAttribute("data-qa-clip")));
  return problems;
}
// 칸(과 그 단추)의 `overflow` 를 풀기 전후 둘레 그림을 견준다. 칸 밖에 새 잉크가 나타나면 잘린 것이다.
async function inkClipped(page, locator) {
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  if (!box) return false;
  const x = Math.max(0, Math.floor(box.x - 24));
  const y = Math.max(0, Math.floor(box.y - 24));
  const clip = {
    x,
    y,
    width: Math.min(viewport.width, Math.ceil(box.x + box.width + 24)) - x,
    height: Math.min(viewport.height, Math.ceil(box.y + box.height + 24)) - y,
  };
  const before = await page.screenshot({ clip, animations: "disabled" });
  await locator.evaluate((el) => {
    for (const node of new Set([el, el.closest("button")].filter(Boolean))) {
      node.dataset.qaOverflow = node.style.overflow;
      node.style.setProperty("overflow", "visible", "important");
    }
  });
  const after = await page.screenshot({ clip, animations: "disabled" });
  await locator.evaluate((el) => {
    for (const node of new Set([el, el.closest("button")].filter(Boolean))) {
      node.style.overflow = node.dataset.qaOverflow ?? "";
      delete node.dataset.qaOverflow;
    }
  });
  // 칸 **밖**에 새로 나타난 잉크만 센다. 칸 안쪽은 겹 합성이 바뀌며 글자 가장자리 몇 픽셀이 달라진다
  // (g5 «1/4» 실측: 칸 안 3~42 픽셀 차이 · 잘린 것 없음 — 전후 그림을 눈으로 확인).
  const outside = await page.evaluate(
    async ({ a, b, inner }) => {
      const load = (src) =>
        new Promise((done, fail) => {
          const image = new Image();
          image.onload = () => done(image);
          image.onerror = fail;
          image.src = src;
        });
      const [first, second] = await Promise.all([load(a), load(b)]);
      const canvas = document.createElement("canvas");
      canvas.width = first.width;
      canvas.height = first.height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(first, 0, 0);
      const x = context.getImageData(0, 0, canvas.width, canvas.height).data;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(second, 0, 0);
      const y = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let count = 0;
      for (let row = 0; row < canvas.height; row++)
        for (let column = 0; column < canvas.width; column++) {
          if (column >= inner.left && column < inner.right && row >= inner.top && row < inner.bottom) continue;
          const i = (row * canvas.width + column) * 4;
          if (Math.max(Math.abs(x[i] - y[i]), Math.abs(x[i + 1] - y[i + 1]), Math.abs(x[i + 2] - y[i + 2])) > 48) count++;
        }
      return count;
    },
    {
      a: `data:image/png;base64,${before.toString("base64")}`,
      b: `data:image/png;base64,${after.toString("base64")}`,
      inner: {
        left: Math.floor(box.x - clip.x) - 1,
        right: Math.ceil(box.x + box.width - clip.x) + 1,
        top: Math.floor(box.y - clip.y) - 1,
        bottom: Math.ceil(box.y + box.height - clip.y) + 1,
      },
    },
  );
  if (process.env.QA_CLIP_DEBUG && outside > 2) {
    const name = `clip-${Date.now()}`;
    await writeFile(resolve(output, `${name}-a-clipped.png`), before);
    await writeFile(resolve(output, `${name}-b-unclipped.png`), after);
  }
  return outside > 2;
}
async function katexBoxes(page, rootSelector) {
  return page.evaluate((selector) => {
    const scope = selector ? document.querySelector(selector) : document.body;
    if (!scope) return ["범위 없음: " + selector];
    const problems = [];
    const tol = 1;
    const text = (el) => {
      const clone = el.cloneNode(true);
      clone.querySelectorAll?.(".katex-mathml").forEach((node) => node.remove());
      return (clone.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 36);
    };
    const insideKatex = (el) => !!el.parentElement?.closest(".katex");
    const clipOf = (el) => {
      let clip = el.parentElement;
      while (clip && clip !== document.body && getComputedStyle(clip).overflowX === "visible") clip = clip.parentElement;
      return clip && clip !== document.body ? clip.getBoundingClientRect() : { left: 0, right: innerWidth };
    };
    for (const el of scope.querySelectorAll("*")) {
      if (insideKatex(el)) continue;
      const style = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      if (box.width <= 1 || box.height <= 1 || style.visibility === "hidden") continue;
      const hidden = style.scrollbarWidth === "none" || !!el.closest("button");
      // 넘치는 숨은 칸은 표시만 해 두고, 잘렸는지는 밖에서 픽셀로 본다(`inkClipped`).
      if (
        hidden &&
        (style.overflowX !== "visible" || style.overflowY !== "visible") &&
        (el.scrollWidth > el.clientWidth + tol || el.scrollHeight > el.clientHeight + tol)
      )
        el.setAttribute("data-qa-clip", "");
      const limit = clipOf(el);
      if (box.left < limit.left - tol || box.right > limit.right + tol)
        problems.push(`틀 밖 ${Math.round(Math.max(limit.left - box.left, box.right - limit.right))}px «${text(el)}»`);
    }
    for (const math of scope.querySelectorAll(".katex")) {
      if (math.parentElement?.closest(".katex")) continue;
      const box = math.getBoundingClientRect();
      if (box.width === 0) continue;
      let clip = math.parentElement;
      while (clip && clip !== document.body && getComputedStyle(clip).overflowX === "visible") clip = clip.parentElement;
      const limit = clip && clip !== document.body ? clip.getBoundingClientRect() : { left: 0, right: innerWidth };
      if (box.left < limit.left - tol || box.right > limit.right + tol)
        problems.push(`수식이 틀 밖 ${Math.round(Math.max(limit.left - box.left, box.right - limit.right))}px «${text(math)}»`);
      if (box.right > innerWidth + tol) problems.push(`수식이 화면 밖 «${text(math)}»`);
    }
    for (const button of scope.querySelectorAll("button")) {
      const outer = button.getBoundingClientRect();
      for (const child of button.children) {
        if (child.getAttribute("aria-hidden") === "true") continue;
        const inner = child.getBoundingClientRect();
        if (inner.width === 0) continue;
        if (inner.left < outer.left - tol || inner.right > outer.right + tol || inner.top < outer.top - tol || inner.bottom > outer.bottom + tol)
          problems.push(`단추 밖으로 «${text(button)}»`);
      }
    }
    // ⑥ 보기 글(`data-choice-text`)의 수식은 가로로 글자 칸 안에 — 단추 안쪽 여백을 먹어 테두리에 닿지 않는다.
    for (const label of scope.querySelectorAll("[data-choice-text]")) {
      const inner = label.getBoundingClientRect();
      for (const math of label.querySelectorAll(".katex")) {
        if (math.parentElement?.closest(".katex")) continue;
        const box = math.getBoundingClientRect();
        if (box.left < inner.left - tol || box.right > inner.right + tol)
          problems.push(`보기 여백 침범 ${Math.round(Math.max(inner.left - box.left, box.right - inner.right))}px «${text(label)}»`);
      }
    }
    if (document.documentElement.scrollWidth > innerWidth + tol)
      problems.push(`문서 가로 스크롤 ${document.documentElement.scrollWidth - innerWidth}px`);
    return problems;
  }, rootSelector);
}

async function katexScenario({ page, sim, mobile, width, height, step, shot }, unitId) {
  const unit = unitOf(unitId);
  const seen = { read: 0, assemble: 0, examples: 0, truth: 0, workshop: 0, card: 0, math: 0 };
  const record = (where, problems) => {
    for (const problem of problems) katexFindings.push({ engine: page.context().browser().browserType().name(), size: `${width}x${height}`, unit: unitId, where, problem });
    return problems.length;
  };
  const fitShots = new Set();
  const check = async (where, kind, selector) => {
    seen.math += await page.locator(`${selector ?? "body"} .katex`).count();
    // 보기 맞춤(`ExplorerChoiceText`)이 글자를 줄인 보기 — 잘림은 아니지만 몇 개가 줄어드는지 원장님께 알린다.
    // 그리고 1배로 되돌려도 단추 테두리 안 · 글자 칸 안에 들면 **쓸데없이 줄인 것**이다(근호 SVG 가 scrollWidth 를
    // 부풀려 «√9» 까지 0.7배로 줄였던 결함, 2026-09-27).
    const needless = [];
    for (const fitted of await page.locator(`${selector ?? "body"} [data-choice-text][data-fit]`).all()) {
      const label = await visibleText(fitted);
      katexFitted.push({
        engine: page.context().browser().browserType().name(),
        size: `${width}x${height}`,
        unit: unitId,
        where,
        scale: await fitted.getAttribute("data-fit"),
        label,
      });
      const fitsAtOne = await fitted.evaluate((el) => {
        const drawn = el.style.fontSize;
        el.style.fontSize = "";
        const inner = el.getBoundingClientRect();
        const fits =
          el.offsetHeight <= el.parentElement.clientHeight &&
          [...el.querySelectorAll(".katex")].every((math) => {
            const box = math.getBoundingClientRect();
            return box.left >= inner.left - 1 && box.right <= inner.right + 1;
          });
        el.style.fontSize = drawn;
        return fits;
      });
      if (fitsAtOne) needless.push(`쓸데없는 맞춤 «${label}»`);
    }
    const found = record(where, needless) + record(where, await katexFit(page, selector));
    if (process.env.QA_KATEX_SHOT_ALL) {
      await shot(`katex-${unitId}-${kind}-${seen[kind]}${found ? "-problem" : ""}`);
    } else if (found || !fitShots.has(kind)) {
      fitShots.add(kind);
      await shot(`katex-${unitId}-${kind}${found ? "-problem-" + seen[kind] : ""}`);
    }
    return found;
  };
  await step("katex.start", async () => {
    await page.goto(base + "/dev/mobile-explorers-qa");
    await homeReady(page);
    await tap(page.locator("[data-expedition-start]"), mobile);
    await page.locator("[data-explorer-dock=true]").waitFor({ timeout: 10000 });
    await settled(page, sim);
    return unit.title;
  });
  let problems = 0;
  await step("katex.activities", async () => {
    for (let guard = 0; guard < 80; guard++) {
      const stored = explorerStored(sim);
      const session = stored.profile.definitions?.session;
      if (!session || session.done) break;
      const action = correctExplorerAction(sim);
      if (attachedWorkshop(sim)) {
        seen.workshop++;
        problems += await check(`작업실 ${attachedWorkshop(sim).stage}`, "workshop", "main");
        await perform(page, sim, action, mobile);
        await settled(page, sim);
        continue;
      }
      const activity = engine.explorerView(stored, today()).currentActivity;
      const where = `${activity.cardName} · ${activityNames[activity.kind]}`;
      seen[activity.kind]++;
      if (activity.kind === "assemble") {
        // 빈칸에 고른 조각까지 채워서 잰다 — 근의 공식처럼 긴 조각이 빈칸 단추에 들어간다.
        const choices = page.getByRole("group", { name: "답 고르기" });
        for (const id of action.choiceIds) await tap(choices.getByRole("button").nth(id), mobile);
        problems += await check(where, activity.kind, "main");
        const handled = sim.handled;
        await tap(page.getByRole("button", { name: "완성한 정의 확인하기" }), mobile);
        await until(() => sim.handled > handled, "조립 응답");
      } else {
        problems += await check(where, activity.kind, "main");
        await perform(page, sim, action, mobile);
      }
      await settled(page, sim);
    }
    await homeReady(page);
    return `뜻 ${seen.read} · 조립 ${seen.assemble} · 예 ${seen.examples} · 경계 ${seen.truth} · 작업실 ${seen.workshop} · 넘침 ${problems}`;
  });
  await step("katex.cards", async () => {
    const view = engine.explorerView(explorerStored(sim), today());
    const collection = view.units.filter((item) => item.grade === view.profile.courseGrade).flatMap((item) => item.cards);
    for (const card of collection.filter((item) => item.unitId === unitId)) {
      let sheet = page.getByRole("dialog", { name: "나의 개념 도감" });
      if (!(await sheet.count())) {
        await tap(page.getByRole("button", { name: /도감/ }).first(), mobile);
        await expect(sheet).toBeVisible();
      }
      await tap(sheet.locator("[data-level]").nth(collection.findIndex((item) => item.id === card.id)), mobile);
      const dialog = page.locator("dialog[open]:has(#explorer-card-title)");
      await expect(dialog).toBeVisible();
      await tap(dialog.getByRole("button", { name: "정의와 해설 보기" }), mobile);
      await expect(dialog.locator("[data-explorer-solution]")).toBeVisible();
      await expect(dialog.locator("[data-explorer-solution] .katex").first()).toBeVisible({ timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(150);
      seen.card++;
      problems += await check(`${card.name} · 도감 해설`, "card", "dialog[open]:has(#explorer-card-title)");
      await tap(dialog.getByRole("button", { name: "개념 카드 닫기" }), mobile);
      await expect(dialog).toHaveCount(0);
    }
    return `도감 카드 ${seen.card} · 잰 수식 ${seen.math}`;
  });
  await step("katex.fit", async () => {
    assert.equal(problems, 0, `넘침·잘림 ${problems}건 — katex-findings.json`);
    return `넘침·잘림 0 (수식 ${seen.math}곳)`;
  });
}
// ───────────────────────── «선택됨» 효과 (05 §8.16, 2026-09-27) ─────────────────────────
// 1안 코발트 차오름을 **계산된 스타일**로 잰다(RTL 은 CSS 를 계산하지 않는다 — 교훈 2026-09-16).
// 고르면 `::before` 면이 코발트로 scaleY(1)·흰 글자 · 누를 때만 0.18초 차오름 / 풀 때 0.14초 빠짐 ·
// 처음 그릴 때 움직임 없음 · 틀림이면 고른 모양 그대로 · 맞음이면 초록 면 · ✓ 칸 없음 ·
// 움직임 줄이기면 움직임 없이 색만 · PC 에서 마우스 올림이 고른 보기를 덮지 않음.
const COBALT = "rgb(49, 89, 222)";
const DONE = "rgb(29, 117, 80)";
const WHITE = "rgb(255, 255, 255)";
const INK = "rgb(32, 61, 100)";
const FILLED = "matrix(1, 0, 0, 1, 0, 0)";
const EMPTY = "matrix(1, 0, 0, 0, 0, 0)";
const choiceButtons = (page) => page.getByRole("group", { name: "답 고르기" }).getByRole("button");
async function pressedLook(locator) {
  return locator.evaluate((el) => {
    const self = getComputedStyle(el);
    const fill = getComputedStyle(el, "::before");
    return {
      pressed: el.getAttribute("aria-pressed"),
      anim: el.getAttribute("data-anim"),
      state: el.getAttribute("data-answer-state"),
      color: self.color,
      border: self.borderTopColor,
      opacity: self.opacity,
      paddingRight: self.paddingRight,
      children: el.children.length,
      // KaTeX 의 그림 쪽(`.katex-html`)은 원래 aria-hidden 이다 — ✓ 칸만 센다.
      hiddenParts: [...el.querySelectorAll('[aria-hidden="true"]')].filter((node) => !node.closest(".katex")).length,
      fill: fill.backgroundColor,
      transform: fill.transform,
      fillAnimation: fill.animationName,
      fillDuration: fill.animationDuration,
      textAnimation: self.animationName,
    };
  });
}
async function untilActivity(page, sim, mobile, kind) {
  for (let guard = 0; guard < 30; guard++) {
    if (!attachedWorkshop(sim) && engine.explorerView(explorerStored(sim), today()).currentActivity?.kind === kind) return;
    await perform(page, sim, correctExplorerAction(sim), mobile);
    await settled(page, sim);
  }
  throw new Error(`${kind} 활동에 닿지 못했다`);
}
async function selectScenario({ page, sim, mobile, step, shot }) {
  await step("select.start", async () => {
    await page.goto(base + "/dev/mobile-explorers-qa");
    await homeReady(page);
    await tap(page.locator("[data-expedition-start]"), mobile);
    await page.locator("[data-explorer-dock=true]").waitFor({ timeout: 10000 });
    await settled(page, sim);
    await untilActivity(page, sim, mobile, "examples");
    return engine.explorerView(explorerStored(sim), today()).currentActivity.cardName;
  });
  await step("select.firstPaint", async () => {
    const buttons = choiceButtons(page);
    for (let index = 0; index < (await buttons.count()); index++) {
      const look = await pressedLook(buttons.nth(index));
      assert.equal(look.anim, null, "처음 그릴 때 움직임 표지");
      assert.equal(look.fillAnimation, "none", "처음 그릴 때 움직인다");
      assert.equal(look.transform, EMPTY, "안 고른 보기에 면");
      assert.equal(look.hiddenParts, 0, "✓ 칸이 남았다");
      assert.equal(look.paddingRight, "8px", "✓ 여백 20px 이 남았다");
    }
    await shot("select-none");
    return "표지 없음 · 면 없음 · ✓ 칸 없음 · 오른쪽 여백 8px";
  });
  await step("select.press", async () => {
    const button = choiceButtons(page).nth(0);
    await tap(button, mobile);
    const moving = await pressedLook(button);
    assert.equal(moving.anim, "in");
    assert.match(moving.fillAnimation, /Fill/, "차오름 움직임 이름: " + moving.fillAnimation);
    assert.equal(moving.fillDuration, "0.18s");
    await page.waitForTimeout(260);
    const look = await pressedLook(button);
    assert.deepEqual(
      { pressed: look.pressed, fill: look.fill, transform: look.transform, color: look.color, border: look.border },
      { pressed: "true", fill: COBALT, transform: FILLED, color: WHITE, border: COBALT },
    );
    await shot("select-one");
    return `차오름 ${moving.fillDuration} → 코발트 면 · 흰 글자`;
  });
  await step("select.release", async () => {
    const button = choiceButtons(page).nth(0);
    await tap(button, mobile);
    const moving = await pressedLook(button);
    assert.equal(moving.anim, "out");
    assert.match(moving.fillAnimation, /Drain/, "빠짐 움직임 이름: " + moving.fillAnimation);
    assert.equal(moving.fillDuration, "0.14s");
    await page.waitForTimeout(220);
    const look = await pressedLook(button);
    assert.deepEqual({ pressed: look.pressed, transform: look.transform, color: look.color }, { pressed: "false", transform: EMPTY, color: INK });
    return `빠짐 ${moving.fillDuration} → 면 없음`;
  });
  await step("select.wrongKeepsPick", async () => {
    const answer = correctExplorerAction(sim);
    const wrong = [0, 1, 2, 3].find((id) => !answer.choiceIds.includes(id));
    const picks = [answer.choiceIds[0], wrong];
    for (const id of picks) await tap(choiceButtons(page).nth(id), mobile);
    const handled = sim.handled;
    await tap(page.getByRole("button", { name: "선택한 예 확인하기" }), mobile);
    await until(() => sim.handled > handled, "예 응답");
    await page.locator("[data-answer-feedback=incorrect]").waitFor({ timeout: 5000 });
    await page.waitForTimeout(250);
    for (const id of picks) {
      const look = await pressedLook(choiceButtons(page).nth(id));
      assert.equal(look.state, "incorrect");
      assert.deepEqual({ fill: look.fill, transform: look.transform, color: look.color, border: look.border }, { fill: COBALT, transform: FILLED, color: WHITE, border: COBALT }, "틀림 뒤 고른 모양이 바뀌었다");
    }
    assert.equal(await page.locator("[data-answer-state=correct]").count(), 0, "오답 뒤 정답 보기가 드러났다");
    await shot("select-incorrect");
    await settled(page, sim);
    return "틀림 — 고른 두 보기 코발트 그대로 · 정답 비공개";
  });
  await step("select.truthCorrect", async () => {
    await untilActivity(page, sim, mobile, "truth");
    const id = correctExplorerAction(sim).choiceIds[0];
    const handled = sim.handled;
    await tap(choiceButtons(page).nth(id), mobile);
    assert.equal(await choiceButtons(page).nth(id).getAttribute("data-anim"), "in");
    await until(() => sim.handled > handled, "경계 응답");
    await page.locator("[data-answer-feedback=correct]").waitFor({ timeout: 5000 });
    await page.waitForTimeout(250);
    const look = await pressedLook(choiceButtons(page).nth(id));
    assert.deepEqual({ state: look.state, fill: look.fill, color: look.color, border: look.border }, { state: "correct", fill: DONE, color: WHITE, border: DONE });
    await shot("select-correct");
    await settled(page, sim);
    return "맞음 — 초록 면 · 흰 글자";
  });
  await step("select.assemble", async () => {
    await untilActivity(page, sim, mobile, "assemble");
    const ids = correctExplorerAction(sim).choiceIds;
    for (const id of ids) await tap(choiceButtons(page).nth(id), mobile);
    await page.waitForTimeout(260);
    for (const id of ids) {
      const look = await pressedLook(choiceButtons(page).nth(id));
      assert.deepEqual({ opacity: look.opacity, fill: look.fill, transform: look.transform, color: look.color }, { opacity: "1", fill: COBALT, transform: FILLED, color: WHITE }, "고른 조각 모양");
    }
    await shot("select-assemble");
    await tap(page.getByRole("button", { name: /^빈칸 2,/ }), mobile);
    await page.waitForTimeout(220);
    const released = await pressedLook(choiceButtons(page).nth(ids[1]));
    assert.deepEqual({ pressed: released.pressed, anim: released.anim, transform: released.transform }, { pressed: "false", anim: "out", transform: EMPTY });
    await tap(choiceButtons(page).nth(ids[1]), mobile);
    const handled = sim.handled;
    await tap(page.getByRole("button", { name: "완성한 정의 확인하기" }), mobile);
    await until(() => sim.handled > handled, "조립 응답");
    await settled(page, sim);
    return "고른 조각 코발트(흐려지지 않음) · 빈칸에서 빼면 빠짐";
  });
  await step("select.reducedMotion", async () => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await untilActivity(page, sim, mobile, "examples");
    const button = choiceButtons(page).nth(0);
    await tap(button, mobile);
    const look = await pressedLook(button);
    assert.deepEqual(
      { anim: look.anim, fillAnimation: look.fillAnimation, textAnimation: look.textAnimation, transform: look.transform, fill: look.fill, color: look.color },
      { anim: "in", fillAnimation: "none", textAnimation: "none", transform: FILLED, fill: COBALT, color: WHITE },
    );
    await tap(button, mobile);
    assert.equal((await pressedLook(button)).transform, EMPTY);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    return "움직임 없이 색만 바로";
  });
  await step("select.hover", async () => {
    if (mobile) return "폰: 마우스 올림 없음";
    const buttons = choiceButtons(page);
    await buttons.nth(0).click();
    await page.waitForTimeout(260);
    await buttons.nth(0).hover();
    const pressed = await pressedLook(buttons.nth(0));
    assert.deepEqual({ fill: pressed.fill, border: pressed.border, color: pressed.color }, { fill: COBALT, border: COBALT, color: WHITE }, "마우스 올림이 고른 보기를 덮는다");
    await buttons.nth(1).hover();
    const idle = await pressedLook(buttons.nth(1));
    assert.equal(idle.border, "rgb(155, 177, 223)", "고르지 않은 보기의 마우스 올림 모양");
    await buttons.nth(0).click();
    return "고른 보기 그대로 · 안 고른 보기만 올림 모양";
  });
}
async function selectWorkshopScenario({ page, sim, mobile, step, shot }) {
  await step("selectLab.predict", async () => {
    await page.goto(base + "/dev/mobile-explorers-qa");
    await homeReady(page);
    await tap(page.locator("[data-expedition-start]"), mobile);
    await page.locator("[data-explorer-dock=true]").waitFor({ timeout: 10000 });
    // `workshop` 시나리오와 같은 길 — 통분 카드 읽기 직전까지 서버에서 감고 다시 연다.
    await fastForward(sim, (s) => {
      const task = currentTask(s);
      return task?.cardId === "g5-common-denominator" && task.kind === 0 && cards.definitionNeedsRead(explorerStored(s).profile, explorerStored(s).profile.definitions.session);
    });
    await page.reload();
    await homeReady(page);
    await tap(page.locator("[data-expedition-start]"), mobile);
    await page.locator("[data-explorer-dock=true]").waitFor();
    await settled(page, sim);
    await perform(page, sim, correctExplorerAction(sim), mobile);
    await settled(page, sim);
    assert.equal(attachedWorkshop(sim)?.stage, "predict", "작업실 예상하기에 닿지 못했다");
    const buttons = choiceButtons(page);
    assert.equal(await buttons.nth(0).getAttribute("data-anim"), null);
    // 예상하기는 답을 받자마자 다음 단계로 넘어간다 — 응답을 잠시 붙잡고 고른 모양을 잰다.
    let release;
    sim.gate = { path: "/api/learn/math-explorers", method: "POST", promise: new Promise((done) => { release = done; }) };
    const handled = sim.handled;
    await tap(buttons.nth(0), mobile);
    const moving = await pressedLook(buttons.nth(0));
    assert.equal(moving.anim, "in");
    assert.equal(moving.fillDuration, "0.18s");
    await page.waitForTimeout(260);
    const look = await pressedLook(buttons.nth(0));
    assert.deepEqual({ transform: look.transform, fill: look.fill, color: look.color }, { transform: FILLED, fill: COBALT, color: WHITE }, "작업실 고른 보기");
    await shot("select-lab-predict");
    sim.gate = null;
    release();
    await until(() => sim.handled > handled, "예상 응답");
    await settled(page, sim);
    return "작업실 하나 고르기 — 코발트 면 · 흰 글자";
  });
  await step("selectLab.paint", async () => {
    for (let guard = 0; guard < 30 && attachedWorkshop(sim)?.stage !== "check"; guard++) {
      await perform(page, sim, correctExplorerAction(sim), mobile);
      await settled(page, sim);
    }
    assert.equal(attachedWorkshop(sim)?.stage, "check", "작업실 칠하기에 닿지 못했다");
    const cell = page.getByRole("button", { name: "1번째 분수 1번째 조각", exact: true });
    await tap(cell, mobile);
    assert.equal(await cell.getAttribute("aria-pressed"), "true");
    assert.equal((await cell.textContent()).trim(), "", "칠한 칸에 ✓ 글자");
    await shot("select-lab-paint");
    return "칠한 칸 ✓ 없음";
  });
}
fixtures.select = () => ({ ...serverState.emptySrsState(), explorers: explorerRecord(7, "g7-equation") });
scenarios.select = selectScenario;
fixtures["select-lab"] = () => ({ ...serverState.emptySrsState(), explorers: explorerRecord(5, "g5-fractions") });
scenarios["select-lab"] = selectWorkshopScenario;

for (const unitId of KATEX_UNITS) {
  assert.ok(unitOf(unitId), "없는 단원: " + unitId);
  fixtures[`katex:${unitId}`] = () => ({ ...serverState.emptySrsState(), explorers: explorerRecord(unitOf(unitId).grade, unitId) });
  scenarios[`katex:${unitId}`] = (context) => katexScenario(context, unitId);
}

// ───────────────────────── 작업실 세로 분수 (트랙 K 이어서, 2026-09-27) ─────────────────────────
// 원장님 확정(보고서 §11 ②): 작업실 세로 분수를 CSS 로 그린 판에서 KaTeX(`\frac`)로. 작업실은 통분 카드 하나에만
// 붙는다(`engine.ts`) — 문항 다섯 벌(`workshop.ts` 의 `questions(run)`)마다 조각 활동의 모든 단계를 지나며 분수가
// 나오는 화면을 잰다. 나누는 수를 끝까지 올린 분수(맞추기 ×6 → 6/18)와 전부 칠한 칸 수(21/21)가 가장 길다.
//  · 넘침·잘림은 `katexFit` 과 같은 판정 — 0 이어야 한다.
//  · 분수마다 상자와 **잉크**(분자·가로선·분모의 픽셀 범위)를 `lab-fraction.json` 에 적는다 — 옛 CSS 판과 같은
//    자리·같은 크기인지 견주는 자료(보고서). 분수 칸은 읽기용 이름표 «d분의 n» 으로 찾는다(두 판 공통).
const labGeometry = [];
const rounded = (box) => Object.fromEntries(Object.entries(box).map(([key, value]) => [key, Math.round(value * 100) / 100]));
// 상자 안 그림에서 잉크 범위를 읽는다. 가로선은 «가장 길게 이어진 잉크 줄»과 그 위아래로 붙은 같은 길이의 줄이다.
async function fractionInk(page, locator) {
  const box = await locator.boundingBox();
  if (!box) return null;
  const clip = { x: Math.floor(box.x) - 2, y: Math.floor(box.y) - 2, width: Math.ceil(box.width) + 5, height: Math.ceil(box.height) + 5 };
  const png = await page.screenshot({ clip, animations: "disabled" });
  const ink = await page.evaluate(async (src) => {
    const image = await new Promise((done, fail) => {
      const item = new Image();
      item.onload = () => done(item);
      item.onerror = fail;
      item.src = src;
    });
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(image, 0, 0);
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const dark = (x, y) => {
      const i = (y * canvas.width + x) * 4;
      return Math.max(Math.abs(data[i] - data[0]), Math.abs(data[i + 1] - data[1]), Math.abs(data[i + 2] - data[2])) > 40;
    };
    const rows = [];
    for (let y = 0; y < canvas.height; y++) {
      let left = -1;
      let right = -1;
      let run = 0;
      let longest = 0;
      for (let x = 0; x < canvas.width; x++) {
        if (dark(x, y)) {
          if (left < 0) left = x;
          right = x;
          run++;
          longest = Math.max(longest, run);
        } else run = 0;
      }
      rows.push({ left, right, longest });
    }
    const inked = rows.flatMap((row, y) => (row.left >= 0 ? [y] : []));
    if (!inked.length) return null;
    const longest = Math.max(...rows.map((row) => row.longest));
    // KaTeX 가로선은 숫자 폭만큼이라 «4» 의 가로획과 길이가 같을 수 있다 — 같은 길이면 잉크 가운데에 가장 가까운 줄.
    const middle = (inked[0] + inked[inked.length - 1]) / 2;
    const peak = rows
      .map((row, y) => (row.longest >= longest - 1 ? y : -1))
      .filter((y) => y >= 0)
      .sort((a, b) => Math.abs(a - middle) - Math.abs(b - middle))[0];
    let barTop = peak;
    let barBottom = peak;
    while (barTop > 0 && rows[barTop - 1].longest >= longest - 1) barTop--;
    while (barBottom < rows.length - 1 && rows[barBottom + 1].longest >= longest - 1) barBottom++;
    const above = inked.filter((y) => y < barTop);
    const below = inked.filter((y) => y > barBottom);
    return {
      top: inked[0],
      bottom: inked[inked.length - 1] + 1,
      left: Math.min(...rows.filter((row) => row.left >= 0).map((row) => row.left)),
      right: Math.max(...rows.map((row) => row.right)) + 1,
      barTop,
      barBottom: barBottom + 1,
      barWidth: longest,
      numTop: above[0] ?? null,
      numBottom: above.length ? above[above.length - 1] + 1 : null,
      denTop: below[0] ?? null,
      denBottom: below.length ? below[below.length - 1] + 1 : null,
    };
  }, `data:image/png;base64,${png.toString("base64")}`);
  if (!ink) return null;
  // 분수 칸 상자의 왼쪽 위를 0 으로 — 두 판을 칸 안 자리로 견준다.
  const shift = (key, by) => (ink[key] === null ? null : Math.round((ink[key] + by) * 100) / 100);
  return {
    ...Object.fromEntries(["top", "bottom", "barTop", "barBottom", "numTop", "numBottom", "denTop", "denBottom"].map((key) => [key, shift(key, clip.y - box.y)])),
    left: shift("left", clip.x - box.x),
    right: shift("right", clip.x - box.x),
    barWidth: ink.barWidth,
  };
}
async function setFactor(page, index, target, mobile) {
  const more = page.getByRole("button", { name: `${index + 1}번째 분수 나누는 수 늘리기` });
  const less = page.getByRole("button", { name: `${index + 1}번째 분수 나누는 수 줄이기` });
  for (let guard = 0; guard < 12; guard++) {
    const value = Number(await more.evaluate((el) => el.parentElement.querySelector("strong").firstChild.textContent));
    if (value === target) return;
    await tap(value < target ? more : less, mobile);
  }
  throw new Error(`나누는 수 ${target} 에 닿지 못했다`);
}
async function labFractionScenario({ page, sim, mobile, width, height, step, shot }, run) {
  const engineName = page.context().browser().browserType().name();
  let problems = 0;
  let measured = 0;
  const measure = async (where, keep = false) => {
    await page.waitForTimeout(200);
    await page.evaluate(() => document.fonts.ready);
    // 칠하기 칸을 누르다 보면 문제 칸이 내려가 있다 — 두 판을 같은 자리에서 재도록 맨 위로 올린다.
    await page.evaluate(() => document.querySelectorAll("main *").forEach((el) => { if (el.scrollTop) el.scrollTop = 0; }));
    const found = await katexFit(page, "main");
    for (const problem of found)
      katexFindings.push({ engine: engineName, size: `${width}x${height}`, unit: "g5-fractions", where: `작업실 ${run}벌 ${where}`, problem });
    problems += found.length;
    const fractions = [];
    for (const wrapper of await page.locator('main span[aria-label*="분의 "]').all()) {
      await wrapper.scrollIntoViewIfNeeded();
      fractions.push({
        label: await wrapper.getAttribute("aria-label"),
        shown: await visibleText(wrapper),
        katex: (await wrapper.locator(".katex").count()) > 0,
        box: rounded(await wrapper.boundingBox()),
        row: rounded(await wrapper.evaluate((el) => el.parentElement.getBoundingClientRect().toJSON())),
        ink: await fractionInk(page, wrapper),
      });
    }
    const layout = await page.evaluate(() => {
      const box = (el) => {
        const { x, y, width, height } = el.getBoundingClientRect();
        return { x, y, width, height };
      };
      return {
        strips: [...document.querySelectorAll('main [aria-label^="전체 "][aria-label$="색칠"]')].map(box),
        grids: [...document.querySelectorAll('main [role="group"][aria-label$="개 조각"]')].map(box),
        dock: box(document.querySelector("[data-explorer-dock=true]")),
      };
    });
    labGeometry.push({ engine: engineName, size: `${width}x${height}`, run, where, found, fractions, layout });
    measured += fractions.length;
    if (keep || found.length) await shot(`lab-${run}-${where.replace(/[^0-9a-z가-힣]+/gi, "-")}${found.length ? "-problem" : ""}`);
  };
  await step("lab.start", async () => {
    await page.goto(base + "/dev/mobile-explorers-qa");
    await homeReady(page);
    await tap(page.locator("[data-expedition-start]"), mobile);
    await page.locator("[data-explorer-dock=true]").waitFor({ timeout: 10000 });
    // `workshop` 시나리오와 같은 길 — 통분 카드 읽기 직전까지 서버에서 감고 다시 연다.
    await fastForward(sim, (s) => {
      const task = currentTask(s);
      return task?.cardId === "g5-common-denominator" && task.kind === 0 && cards.definitionNeedsRead(explorerStored(s).profile, explorerStored(s).profile.definitions.session);
    });
    await page.reload();
    await homeReady(page);
    await tap(page.locator("[data-expedition-start]"), mobile);
    await page.locator("[data-explorer-dock=true]").waitFor();
    await settled(page, sim);
    await perform(page, sim, correctExplorerAction(sim), mobile);
    await settled(page, sim);
    const workshop = attachedWorkshop(sim);
    assert.equal(workshop?.stage, "predict", "작업실 예상하기에 닿지 못했다");
    return workshop.questions.map((question) => question.fractions.map((f) => `${f.numerator}/${f.denominator}`).join("·") + `→${question.denominator}`).join(" | ");
  });
  await step("lab.predict", async () => {
    await measure("예상", true);
    await perform(page, sim, correctExplorerAction(sim), mobile);
    await settled(page, sim);
    return "1/2";
  });
  // 맞힌 뒤에는 정답 효과가 뜨고 새 단계(새 문항)가 다시 그려진다 — 효과를 본 뒤에 다음을 잰다(분수 칸이 떨어져 나가는 경주).
  const answered = async () => {
    await perform(page, sim, correctExplorerAction(sim), mobile);
    await overlay(page, "correct", null, mobile);
    await settled(page, sim);
  };
  await step("lab.split", async () => {
    for (let factor = 1; factor <= 4; factor++) {
      await setFactor(page, 0, factor, mobile);
      await measure(`나누기 ×${factor}`, factor === 4);
    }
    await answered();
    return "×1~×4 (가장 긴 4/8)";
  });
  await step("lab.match", async () => {
    for (let factor = 1; factor <= 6; factor++) {
      await setFactor(page, 0, factor, mobile);
      await setFactor(page, 1, factor, mobile);
      await measure(`맞추기 ×${factor}`, factor === 6);
    }
    await answered();
    return "×1~×6 (가장 긴 6/12·6/18)";
  });
  await step("lab.rule", async () => {
    await measure("규칙", true);
    await answered();
    return "3/6·2/6";
  });
  await step("lab.check", async () => {
    const seen = [];
    for (let index = 0; index < 2; index++) {
      const workshop = attachedWorkshop(sim);
      assert.equal(workshop?.stage, "check", "칠하기에 닿지 못했다");
      const question = workshop.questions[workshop.checkIndex];
      await measure(`칠하기 ${index + 1} 빈칸`);
      const cells = (fraction) => Array.from({ length: question.denominator }, (_, part) => page.getByRole("button", { name: `${fraction + 1}번째 분수 ${part + 1}번째 조각`, exact: true }));
      for (let fraction = 0; fraction < question.fractions.length; fraction++) for (const cell of cells(fraction)) await tap(cell, mobile);
      await measure(`칠하기 ${index + 1} 전부`, true);
      for (let fraction = 0; fraction < question.fractions.length; fraction++) for (const cell of cells(fraction)) await tap(cell, mobile);
      seen.push(`${question.denominator}/${question.denominator}`);
      await answered();
    }
    assert.equal(attachedWorkshop(sim), null, "칠하기 뒤 작업실이 끝나지 않았다");
    return "전부 칠한 칸 수 " + seen.join(" · ");
  });
  await step("lab.fit", async () => {
    // 마지막 칠하기 뒤 화면이 상태를 다시 읽는다 — 그 응답까지 받고 닫는다(가로챔 셈이 맞게).
    await until(() => sim.requests === sim.handled, "남은 응답");
    assert.equal(problems, 0, `넘침·잘림 ${problems}건 — katex-findings.json`);
    return `분수 ${measured}개 · 넘침·잘림 0`;
  });
}
for (let run = 1; run <= 5; run++) {
  fixtures[`lab-fraction:${run}`] = () => {
    const explorers = explorerRecord(5, "g5-fractions");
    // 다음 작업실이 `questions(run)` 을 쓰도록 지난 횟수를 박는다(청사진 없음 → 예상하기부터).
    explorers.profile.workshop = { runs: run - 1 };
    return { ...serverState.emptySrsState(), explorers };
  };
  scenarios[`lab-fraction:${run}`] = (context) => labFractionScenario(context, run);
}

// ───────────────────────── 책장 넘김 빛 띠 프레임 (2026-09-27) ─────────────────────────
// 빛 띠를 상자 이동에서 그라데이션 이동으로 바꾼 뒤(가로 막대 제보) 움직임이 같은지 — 넘김 움직임 둘을 같은 시각에
// 멈춰 문제 칸을 찍는다. 옛 판과 새 판을 각각 찍어 밖에서 픽셀로 견준다(`QA_SCENARIOS=light`).
const LIGHT_TIMES = [0, 60, 130, 200, 260, 330, 390, 460, 520];
async function lightFrames({ page, mobile, step, shot }) {
  await step("light.frames", async () => {
    await page.goto(base + "/dev/mobile-explorers-qa");
    await homeReady(page);
    await tap(page.locator("[data-expedition-start]"), mobile);
    await page.locator("[data-explorer-dock=true]").waitFor({ timeout: 10000 });
    await page.waitForTimeout(1500);
    await page.evaluate(() => document.fonts.ready);
    const pane = page.locator("[data-page-turn=true]");
    const names = [];
    for (const time of LIGHT_TIMES) {
      names.push(
        await page.evaluate((at) => {
          const turning = document.getAnimations().filter((item) => /turnPaper|paperLight/.test(item.animationName ?? ""));
          for (const item of turning) {
            item.pause();
            item.currentTime = at;
          }
          return turning.map((item) => item.animationName.replace(/^.*__/, "")).sort().join("+");
        }, time),
      );
      const where = `${page.context().browser().browserType().name()}-${page.viewportSize().width}`;
      await pane.screenshot({ path: resolve(output, `light-${where}-${String(time).padStart(3, "0")}.png`) });
    }
    assert.ok(names.every((name) => name === "paperLight+turnPaper"), "넘김 움직임 둘을 못 찾았다: " + names.join(" | "));
    await shot("light-end");
    return `${LIGHT_TIMES.length}장`;
  });
}
fixtures["light:frames"] = fixtures.concept;
scenarios["light:frames"] = lightFrames;

// ───────────────────────── runner ─────────────────────────
const results = [];
// 이름에 `:` 가 든 묶음(`katex:*`·`lab-fraction:*`)은 `QA_SCENARIOS` 에 묶음 이름(전부) 또는 제 이름을 적을 때만 돈다
// — 기본 실행 시간을 늘리지 않는다.
const grouped = (name) => name.includes(":");
const scenarioNames = Object.keys(scenarios).filter((name) =>
  scenarioFilter
    ? scenarioFilter.includes(name) || (grouped(name) && scenarioFilter.includes(name.split(":")[0]))
    : !grouped(name),
);
for (const engineName of engines) {
  const browser = await { chromium, webkit }[engineName].launch({ headless: true });
  try {
    for (const [width, height] of sizes) {
      const mobile = width < 600;
      for (const scenario of scenarioNames) {
        // `katex:단원` 의 `:` 는 Windows 파일 이름에서 대체 데이터 스트림이 되어 캡처가 숨는다.
        const tag = `${engineName}-${width}x${height}-${scenario.replace(/:/g, "-")}`;
        const page = await browser.newPage({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 });
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        page.on("console", (message) => {
          // Deliberate 503 (lost response) and the 404 wall produce "Failed to load resource".
          if (message.type() === "error" && !message.text().startsWith("Failed to load resource"))
            errors.push("console: " + message.text().slice(0, 300));
        });
        if (throttle && engineName === "chromium") {
          const cdp = await page.context().newCDPSession(page);
          await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttle });
        }
        const sim = createSim(fixtures[scenario]());
        await connect(page, sim);
        await page.addInitScript(() => {
          const style = document.createElement("style");
          style.textContent = "nextjs-portal{display:none!important}";
          document.addEventListener("DOMContentLoaded", () => document.head.append(style));
        });
        const shot = (name) => page.screenshot({ path: resolve(output, `${tag}-${name}.png`) });
        let stopped = null;
        const step = async (key, fn) => {
          if (stopped) {
            results.push({ engine: engineName, size: `${width}x${height}`, scenario, key, status: "못 봄", note: `앞 단계 실패(${stopped})` });
            return;
          }
          try {
            const note = await fn();
            results.push({ engine: engineName, size: `${width}x${height}`, scenario, key, status: "통과", note: note ?? "" });
          } catch (error) {
            stopped = key;
            const shotPath = resolve(output, `${tag}-${key}-failure.png`);
            await page.screenshot({ path: shotPath, fullPage: true }).catch(() => {});
            results.push({ engine: engineName, size: `${width}x${height}`, scenario, key, status: "실패", note: String(error.message ?? error).split("\n").slice(0, 6).join(" | "), shot: shotPath });
            console.log(`${tag} ${key}: 실패 — ${String(error.message ?? error).split("\n")[0]}`);
          }
        };
        try {
          await scenarios[scenario]({ page, sim, mobile, width, height, step, shot });
        } catch (error) {
          results.push({ engine: engineName, size: `${width}x${height}`, scenario, key: "scenario", status: "실패", note: String(error.stack ?? error).slice(0, 400) });
        }
        results.push({
          engine: engineName, size: `${width}x${height}`, scenario, key: "api.intercepted",
          status: sim.unhandled.length || sim.requests !== sim.handled ? "실패" : "통과",
          note: `API 요청 ${sim.requests} · 가로챔 ${sim.handled} · 시뮬레이터 오류 ${sim.unhandled.length} · 목록 밖(404로 막음) ${sim.unknown.length}` +
            (sim.unhandled.length ? " — " + sim.unhandled.join(" ; ").slice(0, 400) : "") +
            (sim.unknown.length ? " — " + [...new Set(sim.unknown)].join(" ; ").slice(0, 200) : ""),
        });
        if (errors.length)
          results.push({ engine: engineName, size: `${width}x${height}`, scenario, key: "pageerror", status: "실패", note: errors.join(" | ").slice(0, 400) });
        console.log(`${tag}: ${results.filter((r) => r.engine === engineName && r.size === `${width}x${height}` && r.scenario === scenario && r.status === "통과").length} 통과`);
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
}
await writeFile(resolve(output, "report.json"), JSON.stringify(results, null, 2));
if (katexFindings.length || scenarioNames.some((name) => name.startsWith("katex:") || name.startsWith("lab-fraction:"))) {
  await writeFile(resolve(output, "katex-findings.json"), JSON.stringify(katexFindings, null, 2));
  await writeFile(resolve(output, "katex-fitted.json"), JSON.stringify(katexFitted, null, 2));
}
if (labGeometry.length) await writeFile(resolve(output, "lab-fraction.json"), JSON.stringify(labGeometry, null, 2));
const failed = results.filter((r) => r.status === "실패");
console.log(`${results.length} 항목 · 실패 ${failed.length} · 못 봄 ${results.filter((r) => r.status === "못 봄").length}`);
process.exitCode = failed.length ? 1 : 0;
