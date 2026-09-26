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
const { checkAnswer } = src("lib/math-srs/sharedAnswers.ts");
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
async function explorerChange(sim, input, now) {
  const date = kstDateOf(now);
  const previous = await readSrsState(studentId, sim.table);
  ownedExplorer(previous.state, now);
  const expeditionStart = input.action.type === "expedition-start";
  const duplicateStart = (state) => {
    if (expeditionStart) return expedition.expeditionStartDuplicate(state, input.requestId);
    if (state.expedition?.receipts.some((r) => r.requestId === input.requestId))
      throw new serverState.SrsConflict("같은 요청 번호로 다른 학습을 요청할 수 없어요.");
    return false;
  };
  const startFeedback = { message: "오늘의 탐험을 이어가요." };
  if (duplicateStart(previous.state)) return { ...previous, feedback: startFeedback };
  const receipt = engine.explorerReceipt(ownedExplorer(previous.state, now), input.action, input.requestId);
  if (receipt) return { ...previous, feedback: receipt };
  const plan = expeditionStart ? expedition.planExpedition(previous.state, studentId, now) : null;
  const recommendation =
    plan?.kind === "elementary" ? expeditionInitialCourseRecommendation(previous.state, plan, now) : null;
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
    journey: expeditionJourney(saved.state, now),
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
    await expect(pane).toContainText(activity.cardName, { timeout: 8000 });
    await expect(pane).toContainText(activityNames[activity.kind], { timeout: 8000 });
  }
  await expect(page.locator('progress[aria-label="이번 학습 진행률"]')).toHaveAttribute("value", String(session.index), { timeout: 8000 });
  await expect(page.locator("main")).toContainText(session.round ? `오답 복습 ${session.round}회` : "오늘의 개념 탐험");
  await page.waitForTimeout(560);
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
async function futureTiles(page) {
  const upcoming = await page.locator('[data-daily-journey] li[data-state="upcoming"]').allInnerTexts();
  const unitTitles = cards.definitionUnits.map((unit) => unit.title);
  for (const text of upcoming) {
    assert.ok(text.includes("다음 여정"), "미래 칸 표기: " + text);
    assert.ok(!unitTitles.some((title) => text.includes(title)), "미래 칸에 단원명: " + text);
  }
  return upcoming.length;
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
    await step("home.future", async () => `예정 칸 ${await futureTiles(page)}개 모두 «다음 여정»`);

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
      await futureTiles(page);
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
      kind === "elementary" ? gradeCourseAnswer(stored, choice) === true : checkAnswer(choice, stored.answer));
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
    await futureTiles(page);
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
    return `${goal}문제 완료 → 홈 · 말 1`;
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

// ───────────────────────── runner ─────────────────────────
const results = [];
const scenarioNames = Object.keys(scenarios).filter((name) => !scenarioFilter || scenarioFilter.includes(name));
for (const engineName of engines) {
  const browser = await { chromium, webkit }[engineName].launch({ headless: true });
  try {
    for (const [width, height] of sizes) {
      const mobile = width < 600;
      for (const scenario of scenarioNames) {
        const tag = `${engineName}-${width}x${height}-${scenario}`;
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
const failed = results.filter((r) => r.status === "실패");
console.log(`${results.length} 항목 · 실패 ${failed.length} · 못 봄 ${results.filter((r) => r.status === "못 봄").length}`);
process.exitCode = failed.length ? 1 : 0;
