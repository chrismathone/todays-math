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
// Safety: the browser never reaches a real API. Every request under `/api/` is
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
const { tileTitle } = src("lib/math-srs/elementary/sectionShortTitles.ts");

const base = process.env.BASE ?? "http://localhost:3000";
const output = resolve(process.env.QA_OUTPUT ?? ".qa-artifacts/mobile-explorers");
const engines = (process.env.QA_ENGINES ?? "chromium,webkit").split(",");
const sizes = (process.env.QA_SIZES ?? "320x600,390x844,430x932,1280x800")
  .split(",")
  .map((size) => size.split("x").map(Number));
const scenarioFilter = process.env.QA_SCENARIOS?.split(",");
const feedbackMeasurements = [];
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
// 정의 조립은 갈래와 상관없이 «문장 조립»(원장님 2026-09-28, 05 §8.19 · D-143).
const activityNames = { read: "뜻 만나기", assemble: "문장 조립", examples: "예 모으기", truth: "경계 살피기" };

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
    const path = new URL(request.url()).pathname;
    if (!path.startsWith("/api/")) return;
    sim.requests++;
    (sim.asked ??= []).push(`${request.method()} ${path}`);
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
        } else if (path === "/api/logs/client" && method === "POST") {
          // 브라우저 오류 기록(9d603a9ea) — 이 시뮬레이터가 일부러 낸 503(«잃은 응답»)을 화면이 기록하려 보낸다.
          // 받아만 두고(어디에도 안 씀) 셈은 맞춘다. 기록의 모양만 본다: 503 말고 다른 오류가 오면 목록 밖으로 돌린다.
          const events = Array.isArray(body?.events) ? body.events : [];
          if (!events.every((event) => event?.kind === "client-request-failed" && /503/.test(event?.message ?? "")))
            sim.unknown.push(`${method} ${path} ${JSON.stringify(body).slice(0, 600)}`);
          sim.clientLogs = (sim.clientLogs ?? 0) + events.length;
          json = { data: { received: events.length } };
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
      (sim.answered ??= []).push(`${method} ${path}`);
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
  const dockLocator = page.locator("[data-explorer-dock=true]");
  const dock = await dockLocator.boundingBox();
  // 뜻 만나기 · «오늘 다시 만날 개념» 첫 장은 답 칸이 단추 하나라 높이를 비운다(4안, 05 §8.19 · D-143).
  const slim = (await dockLocator.getAttribute("data-dock-size")) === "slim";
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
  return { dock, frame, nav: navBox, slim };
}
function sameGeometry(actual, original, label = "") {
  for (const axis of ["x", "y", "width", "height"])
    assert.ok(Math.abs(actual.frame[axis] - original.frame[axis]) < 1.1,
      `${label} frame.${axis} 이동: ${original.frame[axis]} → ${actual.frame[axis]}`);
  // 한쪽이 단추 하나뿐인 답 칸(뜻 만나기 · 첫 장)이면 위 끝 · 높이만 다르다 — 좌우와 아래 끝(단추 자리)은 같아야 한다.
  const axes = actual.slim === original.slim ? ["x", "y", "width", "height"] : ["x", "width", "bottom"];
  const at = (box, axis) => (axis === "bottom" ? box.y + box.height : box[axis]);
  for (const axis of axes)
    assert.ok(Math.abs(at(actual.dock, axis) - at(original.dock, axis)) < 1.1,
      `${label} dock.${axis} 이동: ${at(original.dock, axis)} → ${at(actual.dock, axis)}`);
  if (actual.slim !== original.slim)
    assert.ok((actual.slim ? actual : original).dock.height < (actual.slim ? original : actual).dock.height, `${label} 단추 하나 답 칸이 더 낮지 않다`);
}
async function overlay(page, result, baseline, mobile) {
  const effect = page.locator(`[data-answer-feedback=${result}]`);
  await effect.waitFor({ timeout: 5000 });
  await inlineFeedbackGeometry(page, effect);
  if (baseline) sameGeometry(await practiceGeometry(page, mobile), baseline, "결과 줄 표시 중");
  assert.equal(await page.locator("[data-explorer-solution]").count(), 0, "해설이 자동으로 열렸다");
}
async function inlineFeedbackGeometry(page, effect = page.locator("[data-answer-feedback]")) {
  const measured = await effect.evaluate((el) => {
    const box = el.getBoundingClientRect();
    const overlaps = (other) => {
      const rect = other.getBoundingClientRect();
      return Math.min(box.right, rect.right) - Math.max(box.left, rect.left) > 1 &&
        Math.min(box.bottom, rect.bottom) - Math.max(box.top, rect.top) > 1;
    };
    const area = el.closest("dialog") ?? document.querySelector("main");
    const buttons = [...(area?.querySelectorAll('button[aria-pressed]') ?? [])];
    const missed = buttons.filter((button) => {
      const rect = button.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      if (x < 0 || x >= innerWidth || y < 0 || y >= innerHeight) return false;
      // Workshop paint cells live in the scrolling problem pane. Test the
      // visible centres, including clipping by every scroll/overflow ancestor.
      for (let ancestor = button.parentElement; ancestor; ancestor = ancestor.parentElement) {
        const clip = ancestor.getBoundingClientRect();
        const style = getComputedStyle(ancestor);
        if (/(auto|scroll|hidden|clip)/.test(style.overflowY) && (y < clip.top || y > clip.bottom)) return false;
        if (/(auto|scroll|hidden|clip)/.test(style.overflowX) && (x < clip.left || x > clip.right)) return false;
      }
      return !button.contains(document.elementFromPoint(x, y));
    });
    const pane = area?.querySelector('[data-page-turn="true"]');
    const style = getComputedStyle(el);
    return {
      size: `${innerWidth}x${innerHeight}`,
      result: el.getAttribute("data-answer-feedback"),
      position: style.position,
      pointerEvents: style.pointerEvents,
      text: el.textContent,
      box: { x: box.x, y: box.y, width: box.width, height: box.height },
      overlapPane: !!pane && overlaps(pane),
      overlapChoices: buttons.filter(overlaps).length,
      missedChoiceCentres: missed.map((button) => button.textContent),
    };
  });
  feedbackMeasurements.push(measured);
  assert.ok(!["absolute", "fixed"].includes(measured.position), "결과가 덮는 레이어: " + measured.position);
  assert.equal(measured.pointerEvents, "none");
  assert.equal(measured.overlapPane, false, "결과가 문제 본문을 덮는다: " + JSON.stringify(measured));
  assert.equal(measured.overlapChoices, 0, "결과가 보기를 덮는다: " + JSON.stringify(measured));
  assert.deepEqual(measured.missedChoiceCentres, [], "결과 표시 중 보기 중앙 hit test");
  return measured;
}
async function settled(page, sim) {
  await expect(page.locator("[data-answer-feedback]")).toHaveCount(0, { timeout: 8000 });
  const stored = explorerStored(sim);
  const session = stored.profile.definitions?.session;
  if (!session || session.done) return;
  await passSessionIntro(page, session);
  const workshop = attachedWorkshop(sim);
  if (workshop) await expect(page.locator(`[data-workshop-stage="${workshop.stage}"]`)).toBeVisible({ timeout: 8000 });
  else {
    const activity = engine.explorerView(stored, today()).currentActivity;
    const pane = page.locator("[data-page-turn=true]");
    // 카드 이름은 KaTeX 로 그린다(트랙 K) — `textContent` 는 스크린리더용 MathML 글자를 겹쳐 담아
    // «곱이 0인 성질» 이 «곱이 000인 성질» 로 읽힌다. 눈에 보이는 글자로 견준다.
    await expect.poll(() => visibleText(pane), { timeout: 8000 }).toContain(activity.cardName);
    await expect(pane).toContainText(activityNames[activity.kind], { timeout: 8000 });
    await conceptHeadStyle(page, activity.kind);
  }
  await expect(page.locator('progress[aria-label="이번 학습 진행률"]')).toHaveAttribute("value", String(session.index), { timeout: 8000 });
  await expect(page.locator("main")).toContainText(session.round ? `오답 복습 ${session.round}회` : "오늘의 개념 탐험");
  await page.waitForTimeout(560);
  const overflow = await paneOverflow(page);
  assert.equal(overflow, null, "문제 칸 가로 넘침(PC 에서는 가로 막대): " + JSON.stringify(overflow));
}
// 머리의 계산된 모양(05 §8.19) — RTL 은 클래스 이름만 본다(2026-09-16 교훈): 갈래 딱지 색 · 커서(누르는 것이 아님, D-30),
// 정의 조립의 이름 크기(제목과 같은 clamp(20px, 3.5vw, 26px) · 폭 350 이하 19px).
async function conceptHeadStyle(page, kind) {
  const pane = page.locator("[data-page-turn=true]");
  const tag = pane.locator("[data-concept-kind]").first();
  if (!(await tag.count())) return;
  const look = await tag.evaluate((el) => {
    const style = getComputedStyle(el);
    return { background: style.backgroundColor, color: style.color, cursor: style.cursor, border: style.borderTopWidth, shadow: style.boxShadow };
  });
  assert.deepEqual(look, { background: "rgb(223, 231, 244)", color: "rgb(64, 90, 128)", cursor: "default", border: "0px", shadow: "none" }, "갈래 딱지 모양");
  // 세로 자리 — 시안 4안: 이름 줄 2px · 문장 조립 이름 3px · 뜻 만나기 제목 4px(도감 제목 4px 은 도감 해설 단계에서)
  const lift = await tag.evaluate((el) => getComputedStyle(el).verticalAlign);
  assert.equal(lift, kind === "assemble" ? "3px" : kind === "read" ? "4px" : "2px", `갈래 딱지 세로 자리(${kind})`);
  if (kind !== "assemble") return;
  const width = page.viewportSize().width;
  const expected = width <= 350 ? 19 : Math.min(26, Math.max(20, width * 0.035));
  const size = await pane.locator("h2").first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  assert.ok(Math.abs(size - expected) < 0.6, `정의 조립 이름 크기 ${size}px (기대 ${expected}px)`);
}
// 기억 복습 날 · 지난 학습 다시 풀기의 첫 활동 앞 «오늘 다시 만날 개념» 한 장(05 §8.19 · D-143 ③) — 뜻은 가리고
// 이름 · 갈래만 보이는지 보고 넘긴다. 시작은 서버에 요청을 보내지 않는다(화면만의 한 장).
async function passSessionIntro(page, session) {
  const expected = !session.round && !session.continuation && session.index === 0 && (session.reviewOnly || session.route === "memory");
  const title = page.getByRole("heading", { name: "오늘 다시 만날 개념" });
  if (!expected) {
    assert.equal(await title.count(), 0, "첫 장이 기억 복습 · 다시 풀기 첫머리 밖에서 떴다");
    return;
  }
  // 한 번 본 세션은 다시 안 보인다(이어하기) — 보이면 넘긴다.
  if (!(await title.isVisible().catch(() => false))) return;
  const names = await page.locator("[data-concept-name]").count();
  assert.equal(names, session.cardIds?.length ?? 5, "첫 장의 개념 수");
  await page.getByRole("button", { name: /기억 복습 시작하기|다시 풀기 시작하기/ }).click();
  await expect(title).toHaveCount(0, { timeout: 8000 });
}
// 문제 칸(스크롤 칸)이 가로로 넘치는가 — 원장님 제보(2026-09-27, PC «정의 조립»): 칸 아래 쓸데없는 가로 막대, 손잡이가
// 칸 폭의 약 75%. 폰은 막대가 겹쳐 떠서 안 보일 뿐 같은 넘침이다. 넘치면 원인을 짚어 돌려준다 — 칸 밖으로 나간 자식
// 상자, 그리고 책장 넘김 빛 띠(`::after`)를 끄면 넘침이 사라지는가.
async function paneOverflow(page, selector = "[data-page-turn=true]") {
  return page.evaluate((selector) => {
    const pane = document.querySelector(selector);
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
  }, selector);
}
// Performs one explorer action through the real controls and waits for its response.
async function perform(page, sim, action, mobile) {
  const handled = sim.handled;
  const choices = page.getByRole("group", { name: "답 고르기" });
  if (action.type === "read") await tap(page.getByRole("button", { name: /뜻을 가리고 도전하기/ }), mobile);
  else if (action.type === "answer") {
    const activity = engine.explorerView(explorerStored(sim), today()).currentActivity;
    if (!action.choiceIds.length) await tap(page.getByRole("button", { name: "아직 모르겠어요" }), mobile);
    else {
      for (const id of action.choiceIds) await tap(choices.getByRole("button").nth(id), mobile);
      if (activity.kind === "assemble") await tap(page.getByRole("button", { name: "완성한 문장 확인하기" }), mobile);
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
  await page.evaluate(() => document.fonts.ready);
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
    // A zoomed, short home naturally scrolls. Its single CTA must stay reachable.
    if (height < 500) await locator.scrollIntoViewIfNeeded();
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
  assert.deepEqual(await links.allInnerTexts(), ["탐험", "도감", "강의", "영어듣기"]);
  assert.deepEqual(
    await links.evaluateAll((items) => items.map((a) => [a.getAttribute("href"), a.getAttribute("aria-current")])),
    [["/learn", "page"], ["/learn?view=collection", null], ["/learn/lectures", null], ["/learn/english-listening", null]],
  );
  return "탐험·도감·강의·영어듣기, 탐험 강조";
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
    // 칸은 줄임말(D-142 ⑺ `tileTitle`)을 그린다 — 기대값도 같은 함수로
    const expected = tileTitle(planned?.title ?? "다음 여정").replace(/\s+/g, "");
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
      await tap(page.getByRole("button", { name: "완성한 문장 확인하기" }), mobile);
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
          const animation = await effect.locator("svg").evaluate((el) => getComputedStyle(el).animationName);
          assert.equal(animation, "none", "움직임 축소에서 결과 줄 애니메이션");
          await inlineFeedbackGeometry(page, effect);
          checkedOverlay = true;
        }
        await settled(page, sim);
      }
      assert.ok(checkedOverlay, "움직임 축소 중 오버레이를 보지 못했다");
      assert.equal(await page.locator("[data-page-turn=true]").evaluate((el) => getComputedStyle(el).animationName), "none");
      await page.emulateMedia({ reducedMotion: "no-preference" });
      return "문제 전환 none · 결과 줄 즉시 표시";
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
      const titleTag = dialog.locator("#explorer-card-title [data-concept-kind]");
      if (await titleTag.count())
        assert.equal(await titleTag.evaluate((el) => getComputedStyle(el).verticalAlign), "4px", "도감 제목 딱지 세로 자리");
      await tap(dialog.getByRole("button", { name: "뜻과 해설 보기" }), mobile);
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
      // D-144: 완료 줄 = «한 칸 전진했어요.» + 금색 알약(그 칸이 준 별, 화면 읽기는 «별 N개») + 섞일 때만 내역 줄 + «다음 탐험은 내일 열려요.»
      const tile = sim.state.expedition.awards.at(-1).stars;
      assert.ok(tile, "칸 기록에 별(D-144)이 없다");
      const doneLine = page.locator("[data-expedition-mission=true]").getByText(/한 칸 전진했어요/);
      await expect(doneLine).toContainText(`✦+${tile.cards + tile.bonus}`);
      await expect(doneLine).toContainText(`별 ${tile.cards + tile.bonus}개`);
      await expect(doneLine).toContainText("다음 탐험은 내일 열려요.");
      if (tile.cards && tile.bonus) await expect(doneLine).toContainText(`카드 ${tile.cards} · 한 칸 보장 ${tile.bonus}`);
      else await expect(doneLine).not.toContainText("한 칸 보장");
      // 칸 효과는 한 번 떴다 사라진다(pointer-events 없음) — 찍기 전에 걷히게 기다린다
      await page.getByText("오늘의 한 칸", { exact: true }).waitFor({ state: "detached", timeout: 5000 });
      assert.equal(await page.locator("[data-expedition-start]").count(), 0, "완료 뒤에도 시작 버튼");
      await expect(page.locator("[data-pawn-day]")).toHaveAttribute("data-pawn-day", "1", { timeout: 5000 });
      assert.equal(sim.state.expedition.awards.length, 1);
      await expect(page.locator('[data-day-step="1"]')).toContainText(sim.state.expedition.mission.title);
      await shot("home-complete");
      return `완료 칸 1 · 말 1 · 칸 별 카드 ${tile.cards} + 보장 ${tile.bonus}`;
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
    await inlineFeedbackGeometry(page);
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
//    2026-09-29 에 JSDoc 한 줄로 되풀이(10만여 글자) — 13행 표기를 바꾸고, 가드는 줄 머리의 블록 주석만 지우게 굳혔다.
//    그래도 이 파일에는 블록 주석을 쓰지 않는다(`/` 뒤 별도 적지 않는다).
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
        await tap(page.getByRole("button", { name: "완성한 문장 확인하기" }), mobile);
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
      await tap(dialog.getByRole("button", { name: "뜻과 해설 보기" }), mobile);
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
    await tap(page.getByRole("button", { name: "완성한 문장 확인하기" }), mobile);
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

// ───────────────────────── 기억 복습 날 첫 장 ─────────────────────────
// «오늘 다시 만날 개념»(05 §8.19 · D-143 ③) — 다섯 장이 오늘 만기면 통합 탐험이 기억 복습 날을 연다. 첫 활동 앞 한 장에
// 이름 · 갈래 딱지 · 단원만 보이고(뜻은 가림), 시작은 요청 없이 첫 활동으로 넘어간다.
function memoryFixture(collected, grade, goalUnitId) {
  const explorers = explorerRecord(grade, goalUnitId, collected);
  for (const card of collected) explorers.profile.definitions.cards[card.id].due = today();
  return { ...serverState.emptySrsState(), explorers };
}
fixtures["memory-intro"] = () => memoryFixture(cards.definitionCards.filter((card) => card.unit === "g8-simultaneous"), 8, "g8-function");
// 가장 나쁜 표본 — «이름 + 단원» 글자가 가장 긴 다섯 장이 한꺼번에 만기(리드 검토 ⑤). 첫 장 한 줄에 이름 · 딱지 · 단원이 다 선다.
const longestIntroCards = [...cards.definitionCards]
  .sort((a, b) => b.name.length + unitOf(b.unit).title.length - (a.name.length + unitOf(a.unit).title.length))
  .slice(0, 5);
fixtures["memory-intro-long"] = () => memoryFixture(longestIntroCards, 8, "g8-function");
// 뜻을 고친 카드(D-143 ⑦)를 판 전에 모은 학생 — 도감 격자와 카드 대화상자가 같은 복습 날을 말한다(리드 적대적 검토 ⑤ · 모든 화면 일치).
// 격자는 «다시 기억할 때 / MM/DD 복습», 대화상자는 «기억 N단계 · 다음 복습 MM/DD» — 둘 다 뷰의 진도(앞당긴 만기)를 읽는다.
// 날짜는 오늘이 아니라 카드 보정 판 날(cardRevisions) 기준으로 박는다 — 오늘 기준이면 판 날 일주일 뒤부터는 «판 전에 풀었다»가 거짓이 되어
// 앞당긴 만기를 안 거치고도 통과한다(리드 검토 ③). 판 8일 전에 풀고 저장된 다음 복습은 판 60일 뒤.
const cardRevisionsQa = src("lib/math-explorers/conceptSentenceFixes.ts").cardRevisions;
// 판 날짜는 카드마다 다를 수 있다 — 기록은 가장 이른 판보다 앞에 풀고 가장 늦은 판보다 뒤를 만기로 박고, 단정은 카드마다 제 판 날과 견준다(리드 검토 A2 ⑧).
const revisionDates = Object.values(cardRevisionsQa).sort();
const EARLIEST_REVISION = revisionDates[0];
const LATEST_REVISION = revisionDates.at(-1);
fixtures["revised-due"] = () => {
  const explorers = explorerRecord(8, "g8-function", cards.definitionCards.filter((card) => card.unit === "g8-simultaneous"));
  for (const progress of Object.values(explorers.profile.definitions.cards))
    Object.assign(progress, { lastDate: addDays(EARLIEST_REVISION, -8), attemptedAt: addDays(EARLIEST_REVISION, -8), reviewedAt: addDays(EARLIEST_REVISION, -8), due: addDays(LATEST_REVISION, 60) });
  return { ...serverState.emptySrsState(), explorers };
};
scenarios["revised-due"] = async ({ page, sim, mobile, step }) => {
  await step("revised.due", async () => {
    await page.goto(base + "/dev/mobile-explorers-qa");
    await homeReady(page);
    const stored = explorerStored(sim);
    const view = engine.explorerView(stored, today());
    const collection = view.units.filter((item) => item.grade === view.profile.courseGrade).flatMap((item) => item.cards);
    const said = [];
    for (const card of collection.filter((item) => item.unitId === "g8-simultaneous")) {
      let sheet = page.getByRole("dialog", { name: "나의 개념 도감" });
      if (!(await sheet.count())) {
        await tap(page.getByRole("button", { name: /도감/ }).first(), mobile);
        await expect(sheet).toBeVisible();
      }
      const tile = sheet.locator("[data-level]").nth(collection.findIndex((item) => item.id === card.id));
      const grid = (await tile.locator("small").innerText()).trim();
      await tap(tile, mobile);
      const dialog = page.locator("dialog[open]:has(#explorer-card-title)");
      await expect(dialog).toBeVisible();
      const line = (await dialog.getByText(/다음 복습/).first().innerText()).trim();
      const due = cards.definitionEffectiveDue(card.id, stored.profile.definitions.cards[card.id]);
      // 뜻을 고친 카드는 반드시 앞당긴 판 날을, 나머지는 저장된 만기를 말해야 한다 — 읽기 규칙을 실제로 거쳤는지
      assert.equal(due, card.id in cardRevisionsQa ? cardRevisionsQa[card.id] : stored.profile.definitions.cards[card.id].due, `${card.name} 복습 날`);
      const mmdd = due.slice(5).replace("-", "/");
      assert.ok(line.endsWith(`다음 복습 ${mmdd}`), `${card.name} 대화상자 «${line}» ≠ 복습 날 ${mmdd}`);
      assert.equal(grid, due <= today() ? "다시 기억할 때" : `${mmdd} 복습`, `${card.name} 격자`);
      said.push(`${card.id} ${grid} | ${line}`);
      await tap(dialog.getByRole("button", { name: "개념 카드 닫기" }), mobile);
      await expect(dialog).toHaveCount(0);
    }
    const revised = said.filter((row) => /^(g8-two-variable|g8-simultaneous) /.test(row));
    assert.equal(revised.length, 2, "뜻을 고친 카드 둘");
    return said.join(" · ");
  });
};
// 순서 무관 채점(D-143 ⑧) — 실제 화면에서 두 정답 조각을 거꾸로 놓고 제출해도 «맞음»으로 칠해진다(서버 채점 = 엔진).
const orderFreeQa = src("lib/math-explorers/conceptOrderFree.ts").orderFreeCards;
const orderFreeUnit = cards.definitionCard("g3-capacity").unit;
fixtures["order-free"] = () => ({ ...serverState.emptySrsState(), explorers: explorerRecord(3, orderFreeUnit) });
scenarios["order-free"] = async ({ page, sim, mobile, step, shot }) => {
  await step("orderFree.swap", async () => {
    await page.goto(base + "/dev/mobile-explorers-qa");
    await homeReady(page);
    await tap(page.locator("[data-expedition-start]"), mobile);
    await page.locator("[data-explorer-dock=true]").waitFor({ timeout: 10000 });
    await settled(page, sim);
    const current = () => engine.explorerView(explorerStored(sim), today()).currentActivity;
    for (let guard = 0; guard < 40; guard++) {
      await untilActivity(page, sim, mobile, "assemble");
      if (orderFreeQa.has(current().cardId)) break;
      await perform(page, sim, correctExplorerAction(sim), mobile);
      await settled(page, sim);
    }
    const activity = current();
    assert.ok(orderFreeQa.has(activity.cardId), "순서 무관 카드의 조립에 닿지 못했다");
    const ids = [...correctExplorerAction(sim).choiceIds].reverse();
    for (const id of ids) await tap(choiceButtons(page).nth(id), mobile);
    await shot("order-free-swapped");
    const handled = sim.handled;
    await tap(page.getByRole("button", { name: "완성한 문장 확인하기" }), mobile);
    await until(() => sim.handled > handled, "조립 응답");
    await page.locator("[data-answer-feedback=correct]").waitFor({ timeout: 5000 });
    const session = explorerStored(sim).profile.definitions.session;
    assert.ok(session.passed.includes(`${activity.cardId}:0`), "맞바꾼 조립이 통과로 기록되지 않았다");
    const card = cards.definitionCard(activity.cardId);
    await settled(page, sim);
    return `${card.name} — «${card.words[1]}» · «${card.words[0]}» 순서로 제출 → 맞음`;
  });
};
scenarios["memory-intro"] = (context) => memoryIntroScenario(context, "memory");
scenarios["memory-intro-long"] = (context) => memoryIntroScenario(context, "memory-long");
async function memoryIntroScenario({ page, sim, mobile, step, shot }, label) {
  await step("memory.intro", async () => {
    await page.goto(base + "/dev/mobile-explorers-qa");
    await homeReady(page);
    await tap(page.locator("[data-expedition-start]"), mobile);
    const title = page.getByRole("heading", { name: "오늘 다시 만날 개념" });
    await expect(title).toBeVisible({ timeout: 10000 });
    const session = explorerStored(sim).profile.definitions.session;
    assert.equal(session.route, "memory", "기억 복습 날이 아니다");
    const names = await page.locator("[data-concept-name]").evaluateAll((nodes) => nodes.map((node) => node.innerText.trim()));
    assert.deepEqual(names, session.cardIds.map((id) => cards.definitionCard(id).name));
    const kinds = await page.locator("[data-concept-kind]").allInnerTexts();
    assert.equal(kinds.length, 5, "갈래 딱지 다섯");
    assert.equal(await page.locator("[data-reading-definition], [data-assembly-sentence]").count(), 0, "첫 장에 뜻이 보인다");
    await expect(page.getByText(cards.definitionCard(session.cardIds[0]).definition)).toHaveCount(0);
    await practiceGeometry(page, mobile); // 문서 스크롤 없음 · 답 칸이 하단 탭 위
    // 첫 장 문제 칸도 가로로 넘치지 않는다(풀이 화면과 같은 판정 — PC 에서는 가로 막대, 2026-09-27 교훈).
    const overflow = await paneOverflow(page, "[data-session-intro]");
    assert.equal(overflow, null, "첫 장 문제 칸 가로 넘침: " + JSON.stringify(overflow));
    // 칸 안에서 겹침 — 긴 이름이 줄을 못 바꾸면 칸은 안 넘치고 오른쪽 단원 글자 위로 올라간다(변이로 확인).
    const overlaps = await page.locator("[data-session-intro] li").evaluateAll((rows) =>
      rows.flatMap((row) => {
        const [name, unit] = row.children;
        const a = name.getBoundingClientRect(), b = unit.getBoundingClientRect();
        const ink = document.createRange();
        ink.selectNodeContents(name);
        const right = Math.max(...[...ink.getClientRects()].filter((r) => r.width > 0).map((r) => r.right));
        return Math.max(a.right, right) > b.left + 0.5 ? [`${name.innerText.trim()} → ${Math.round(Math.max(a.right, right) - b.left)}px`] : [];
      }),
    );
    assert.deepEqual(overlaps, [], "첫 장 이름이 단원 글자와 겹친다");
    await shot(`${label}-intro`);
    const posts = sim.posts.length;
    await tap(page.getByRole("button", { name: /기억 복습 시작하기/ }), mobile);
    await expect(title).toHaveCount(0, { timeout: 8000 });
    assert.equal(sim.posts.length, posts, "첫 장 시작이 서버에 요청을 보냈다");
    await settled(page, sim);
    await shot(`${label}-first`);
    await page.reload();
    await homeReady(page);
    await tap(page.locator("[data-expedition-start]"), mobile);
    await page.locator("[data-explorer-dock=true]").waitFor({ timeout: 10000 });
    await expect(title).toHaveCount(0);
    return `${names.join(" · ")} — ${kinds.join(" · ")} · 칸 넘침 0 · 이어하기에 다시 안 뜸`;
  });
}

// ───────────────────────── 조립 문장 · 뜻 상자가 스크롤 없이 보이나 ─────────────────────────
// 원장님 제보(2026-09-28) «너무 무작정 문제가 출몰함» — 운영 320×568 에서 조립 문장이 문제 칸 스크롤 아래였고
// 뜻 만나기의 뜻 상자도 위 끝만 보였다. 4안(05 §8.19 · D-143)이 조작 안내 제목을 빼고 뜻 만나기 답 칸을 줄였다.
// 한 단원을 끝까지 풀며, 뜻 만나기 · 조립마다 같은 화면을 네 폭으로 바꿔 잰다(시안 «잘림 실측»과 같은 판정):
//   조립 — 문장 글줄(Range) 끝이 문제 칸 아래 끝 안인가(첫 줄만 보이는가도 센다) · 뜻 — 뜻 상자 끝이 칸 안인가.
// `QA_SCENARIOS=fit` 로 켠다(기본 실행에는 안 낀다) · 단원은 `QA_FIT_UNITS`(기본 46단원 전부) · 결과 fit-findings.json.
const FIT_SIZES = [[320, 568], [360, 640], [390, 700], [800, 900]];
const FIT_UNITS = (process.env.QA_FIT_UNITS ?? cards.definitionUnits.map((unit) => unit.id).join(",")).split(",");
const fitFindings = [];
// 넘칠 때만 글씨 줄이기(원장님 2026-09-29, D-143) 뒤로 더 적는 것 — `full`·`first` 판정은 그대로(바꾸기 전과 견준다):
//   fit    제품이 고른 배율(`data-fit`, 없으면 1)
//   slots  빈칸 단추 상자까지 넣은 끝이 칸 안인가 — 단추(최소 높이 42px · 가운데 맞춤)는 글보다 아래로 내려와 `full` 이 못 본다
//   trial  배율을 1 · 0.9 · 0.8 · 0.7 로 눌러 대 본 `slots` 판정(바닥을 고른 근거 — 제품은 글자 15px 까지만, 좁은 폭은 0.8 에서 멈춤)
//   over   지금 넘친 px(단추 포함, 넘치지 않으면 0) · pane 문제 칸 높이
const FIT_TRIAL_STEPS = [1, 0.9, 0.8, 0.7];
async function fitNow(page) {
  return page.evaluate((trialSteps) => {
    const pane = document.querySelector("[data-page-turn=true]");
    const sentence = pane?.querySelector("[data-assembly-sentence]");
    const definition = pane?.querySelector("[data-reading-definition]");
    if (!pane || (!sentence && !definition)) return null;
    const limit = pane.getBoundingClientRect().bottom + 0.5;
    if (definition) return { full: definition.getBoundingClientRect().bottom <= limit, first: true };
    const textRects = () => {
      const range = document.createRange();
      range.selectNodeContents(sentence);
      return [...range.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0);
    };
    const withSlots = () =>
      Math.max(...textRects().map((rect) => rect.bottom), ...[...sentence.querySelectorAll("button")].map((slot) => slot.getBoundingClientRect().bottom)) + pane.scrollTop;
    const rects = textRects();
    const top = Math.min(...rects.map((rect) => rect.top));
    const first = Math.max(...rects.filter((rect) => rect.top < top + 8).map((rect) => rect.bottom));
    const end = withSlots();
    const drawn = sentence.style.getPropertyValue("--sentence-fit");
    const trial = {};
    for (const step of trialSteps) {
      sentence.style.setProperty("--sentence-fit", String(step));
      trial[step] = withSlots() <= limit;
    }
    if (drawn) sentence.style.setProperty("--sentence-fit", drawn);
    else sentence.style.removeProperty("--sentence-fit");
    return {
      full: Math.max(...rects.map((rect) => rect.bottom)) <= limit,
      first: first <= limit,
      fit: Number(sentence.dataset.fit ?? 1),
      slots: end <= limit,
      over: Math.max(0, Math.round(end - limit)),
      pane: Math.round(pane.clientHeight),
      trial,
    };
  }, FIT_TRIAL_STEPS);
}
// 화면 크기를 바꾼 뒤 제품 맞춤(ResizeObserver → 다음 프레임 → 다시 그림)이 끝날 때까지 — 배율이 세 프레임 내리 같으면.
async function fitSettled(page) {
  await page.evaluate(
    () =>
      new Promise((done) => {
        let last = null;
        let same = 0;
        let frames = 0;
        const tick = () => {
          const now = document.querySelector("[data-assembly-sentence]")?.dataset.fit ?? "1";
          same = now === last ? same + 1 : 0;
          last = now;
          if (same >= 3 || ++frames > 60) done();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
  );
}
// 지금 화면을 네 폭으로 바꿔 가며 잰다(`row` 는 칸 이름표) — 끝나면 처음 크기로 돌린다. 잰 수를 돌려준다.
async function measureFitSizes(page, width, height, row, filled) {
  let measured = 0;
  for (const [w, h] of FIT_SIZES) {
    await page.setViewportSize({ width: w, height: h });
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
    await fitSettled(page);
    const result = await fitNow(page);
    if (result) {
      fitFindings.push({ ...row, size: `${w}x${h}`, filled, ...result });
      measured++;
    }
  }
  await page.setViewportSize({ width, height });
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
  return measured;
}
async function fitScenario({ page, sim, mobile, width, height, step }, unitId) {
  await step("fit.start", async () => {
    await page.goto(base + "/dev/mobile-explorers-qa");
    await homeReady(page);
    await tap(page.locator("[data-expedition-start]"), mobile);
    await page.locator("[data-explorer-dock=true]").waitFor({ timeout: 10000 });
    await settled(page, sim);
    return unitOf(unitId).title;
  });
  await step("fit.activities", async () => {
    let measured = 0;
    for (let guard = 0; guard < 80; guard++) {
      const stored = explorerStored(sim);
      const session = stored.profile.definitions?.session;
      if (!session || session.done) break;
      const action = correctExplorerAction(sim);
      const activity = attachedWorkshop(sim) ? null : engine.explorerView(stored, today()).currentActivity;
      if (activity && !session.round && (activity.kind === "read" || activity.kind === "assemble")) {
        const row = { unit: unitId, card: activity.cardId, name: activity.cardName, kind: activity.kind };
        const measureSizes = async (filled) => (measured += await measureFitSizes(page, width, height, row, filled));
        // 책장 넘김(처음 520ms 칸이 rotateY 로 기울어 있음) 도중에 정한 배율 — 화면 크기를 바꾸기 전에 읽는다.
        // 다시 재는 계기는 크기 변화뿐이라 넘김이 끝난 뒤에도 그대로다. 같은 크기에서 다시 잰 값(아래 `mountFit`)과 같아야 한다.
        const mount =
          activity.kind === "assemble" ? Number((await page.locator("[data-assembly-sentence]").getAttribute("data-fit")) ?? 1) : null;
        const before = fitFindings.length;
        await measureSizes(0);
        if (mount !== null)
          for (const row of fitFindings.slice(before)) if (row.size === `${width}x${height}`) row.mountFit = mount;
        // 빈칸을 채우면 단추 안에 말이 들어가 문장이 길어진다 — 정답 두 말을 채운 채로 네 폭을 한 번 더 잰다(2026-09-29).
        if (activity.kind === "assemble" && action.type === "answer" && action.choiceIds.length === 2) {
          for (const id of action.choiceIds) await tap(choiceButtons(page).nth(id), mobile);
          await measureSizes(2);
          const handled = sim.handled;
          await tap(page.getByRole("button", { name: "완성한 문장 확인하기" }), mobile);
          await until(() => sim.handled > handled, "조립 응답");
          await settled(page, sim);
          continue;
        }
      }
      await perform(page, sim, action, mobile);
      await settled(page, sim);
    }
    await homeReady(page);
    // 끝난 뒤 화면이 상태를 다시 읽는다 — 그 응답까지 받고 닫는다(가로챔 셈이 맞게, `lab.fit` 과 같다).
    await until(() => sim.requests === sim.handled, "남은 응답").catch((error) => {
      const left = [...(sim.asked ?? [])];
      for (const done of sim.answered ?? []) left.splice(left.indexOf(done), 1);
      throw new Error(`${error.message} — 응답 못 받은 요청: ${left.join(", ") || "(없음)"}`);
    });
    return `잰 화면 ${measured}`;
  });
}
for (const unitId of FIT_UNITS) {
  assert.ok(unitOf(unitId), "없는 단원: " + unitId);
  fixtures[`fit:${unitId}`] = () => ({ ...serverState.emptySrsState(), explorers: explorerRecord(unitOf(unitId).grade, unitId) });
  scenarios[`fit:${unitId}`] = (context) => fitScenario(context, unitId);
}

// 보충 카드 한 장(«교재에 한 장 더», D-147)도 같은 풀이 틀(`ExplorerPractice`)이라 같은 맞춤을 탄다 — 21장의 조립 문장을
// 네 폭 × 빈칸 빔 · 채움으로 잰다(«모든 화면 일치», 2026-09-29). 도감 선반 → 카드 창 → «세 활동 해 보기» → 뜻 만나기 → 조립.
// 오늘의 탐험이 안 열린 학생이라 잠기지 않는다. `QA_SCENARIOS=fit-sup` 로 켠다(학년별 묶음 · 결과는 fit-findings.json 에 `supplement: true`).
const { supplementCards } = src("lib/math-explorers/supplement-content.ts");
const supplementGrade = (card) => unitOf(card.unit)?.grade;
async function fitSupplementScenario({ page, sim, mobile, width, height, step }, grade) {
  await step("fitSup.cards", async () => {
    await page.goto(base + "/dev/mobile-explorers-qa");
    await homeReady(page);
    let measured = 0;
    const shelf = supplementCards.filter((card) => supplementGrade(card) === grade);
    for (const card of shelf) {
      const sheet = page.getByRole("dialog", { name: "나의 개념 도감" });
      if (!(await sheet.count())) {
        await tap(page.getByRole("button", { name: /도감/ }).first(), mobile);
        await expect(sheet).toBeVisible();
      }
      await tap(sheet.locator(`[data-supplement-card="${card.id}"]`), mobile);
      let handled = sim.handled;
      await tap(page.getByRole("button", { name: "세 활동 해 보기" }), mobile);
      await until(() => sim.handled > handled, "보충 시작 응답");
      await page.locator("[data-explorer-dock=true]").waitFor({ timeout: 10000 });
      await settled(page, sim);
      const current = () => engine.explorerView(explorerStored(sim), today()).supplements?.activity;
      if (current()?.kind === "read") {
        await perform(page, sim, { type: "read" }, mobile);
        await settled(page, sim);
      }
      const activity = current();
      assert.equal(activity?.kind, "assemble", `${card.name}: 뜻 만나기 다음이 조립이 아니다`);
      await expect(page.locator("[data-assembly-sentence]")).toBeVisible();
      const row = { unit: card.unit, card: card.id, name: card.name, kind: "assemble", supplement: true };
      measured += await measureFitSizes(page, width, height, row, 0);
      for (const word of card.words.slice(0, 2)) {
        const index = activity.choices.findIndex((choice) => choice.label === word);
        // 못 찾으면 nth(-1) 이 마지막 보기를 조용히 눌러 엉뚱한 말을 채운다 — 멈춘다.
        assert.notEqual(index, -1, `${card.name}: 정답 말 «${word}» 가 보기에 없다`);
        await tap(choiceButtons(page).nth(index), mobile);
      }
      measured += await measureFitSizes(page, width, height, row, 2);
      handled = sim.handled;
      await tap(page.getByRole("button", { name: "← 진도판" }), mobile);
      await homeReady(page);
      // 도감에서 시작한 한 장이라 나오면 도감으로 돌아온다 — 그 시트가 뜬 뒤에 다음 카드로(WebKit 에서 시트가 늦게 떠
      // «도감» 단추를 누르려다 시트에 가려 멈췄다).
      await expect(page.getByRole("dialog", { name: "나의 개념 도감" })).toBeVisible({ timeout: 10000 });
      await until(() => sim.requests === sim.handled, "보충 나간 뒤 응답");
    }
    return `보충 ${shelf.length}장 · 잰 화면 ${measured}`;
  });
}
for (const grade of [...new Set(supplementCards.map(supplementGrade))]) {
  assert.ok(grade, "보충 카드 단원이 본 단원 목록에 없다");
  fixtures[`fit-sup:${grade}`] = () => ({ ...serverState.emptySrsState(), explorers: explorerRecord(grade) });
  scenarios[`fit-sup:${grade}`] = (context) => fitSupplementScenario(context, grade);
}

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

// ───────────────────────── 보기 번호 키 · 엔터 (원장님 2026-09-28) ─────────────────────────
// «1,2,3,4 를 눌러도 정답 입력 · 엔터로 제출». jsdom 은 포커스된 단추의 엔터를 click 으로 바꾸지 않아, «마우스로 고른 보기에
// 포커스가 남은 채 엔터»(브라우저 기본 동작과 겹침)와 «보기가 보이는 순간 키가 산다»는 실제 브라우저에서 잰다.
// 키 장면은 PC 크기에서 돌린다(QA_SIZES=1280x800,800x720 · QA_SCENARIOS=keys — 묶음 이름이라 기본 실행에는 안 든다).
const answerPosts = (sim, from) => sim.posts.slice(from).filter((post) => post.action?.type === "answer" || post.body?.submittedAnswer !== undefined);
async function blurAll(page) {
  await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
}
async function keysScenario({ page, sim, mobile, step, shot }) {
  await step("keys.start", async () => {
    await page.goto(base + "/dev/mobile-explorers-qa");
    await homeReady(page);
    await tap(page.locator("[data-expedition-start]"), mobile);
    await page.locator("[data-explorer-dock=true]").waitFor({ timeout: 10000 });
    await settled(page, sim);
    await untilActivity(page, sim, mobile, "examples");
    const shortcuts = await choiceButtons(page).evaluateAll((buttons) => buttons.map((b) => b.getAttribute("aria-keyshortcuts")));
    assert.deepEqual(shortcuts, shortcuts.map((_, i) => String(i + 1)), "보기 번호 키 표지");
    assert.equal(await page.getByRole("button", { name: "선택한 예 확인하기" }).getAttribute("aria-keyshortcuts"), "Enter");
    return engine.explorerView(explorerStored(sim), today()).currentActivity.cardName;
  });
  await step("keys.examples", async () => {
    const answer = correctExplorerAction(sim);
    const buttons = choiceButtons(page);
    const count = await buttons.count();
    const wrong = [...Array(count).keys()].find((id) => !answer.choiceIds.includes(id));
    const from = sim.posts.length;
    await blurAll(page);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(250);
    assert.equal(answerPosts(sim, from).length, 0, "아무것도 안 골랐는데 엔터가 보냈다");
    await page.keyboard.press(String(wrong + 1));
    assert.equal(await buttons.nth(wrong).getAttribute("aria-pressed"), "true", "숫자키로 켜지지 않았다");
    await page.keyboard.press(String(wrong + 1));
    assert.equal(await buttons.nth(wrong).getAttribute("aria-pressed"), "false", "숫자키로 꺼지지 않았다");
    await page.keyboard.press(String(count + 1));
    for (const id of answer.choiceIds.slice(0, -1)) await page.keyboard.press(String(id + 1));
    // 마지막 보기는 마우스로 — 포커스가 그 보기에 남는다(Chromium). 엔터가 그 보기를 끄면 안 된다.
    const last = answer.choiceIds.at(-1);
    await tap(buttons.nth(last), mobile);
    const focused = await buttons.nth(last).evaluate((el) => el === document.activeElement);
    await shot("keys-examples-picked");
    const handled = sim.handled;
    await page.keyboard.press("Enter");
    await until(() => sim.handled > handled, "엔터 확인 응답");
    await page.locator("[data-answer-feedback=correct]").waitFor({ timeout: 5000 });
    assert.equal(await buttons.nth(last).getAttribute("aria-pressed"), "true", "엔터가 포커스된 보기를 껐다");
    await page.keyboard.press("Enter");
    await page.keyboard.press("1");
    await settled(page, sim);
    const sent = answerPosts(sim, from);
    assert.equal(sent.length, 1, `확인이 ${sent.length}번 갔다`);
    assert.deepEqual([...sent[0].action.choiceIds].sort(), [...answer.choiceIds].sort());
    return `숫자키 켜고 끔 · 보기 수 밖 무시 · 마우스 포커스(${focused ? "보기에 남음" : "안 남음"}) 뒤 엔터 = 확인 한 번 · 연출 중 키 무시`;
  });
  await step("keys.assemble", async () => {
    await untilActivity(page, sim, mobile, "assemble");
    const answer = correctExplorerAction(sim);
    const from = sim.posts.length;
    await blurAll(page);
    for (const id of answer.choiceIds) await page.keyboard.press(String(id + 1));
    await page.keyboard.press(String(answer.choiceIds[0] + 1));
    await page.keyboard.press("Enter");
    await page.locator("[data-answer-feedback=correct]").waitFor({ timeout: 5000 });
    await settled(page, sim);
    const sent = answerPosts(sim, from);
    assert.equal(sent.length, 1);
    assert.deepEqual(sent[0].action.choiceIds, answer.choiceIds, "숫자키 순서대로 빈칸이 차지 않았다");
    return "숫자키 순서대로 빈칸 · 쓴 조각 다시 무시 · 엔터 확인";
  });
  await step("keys.truth", async () => {
    await untilActivity(page, sim, mobile, "truth");
    const answer = correctExplorerAction(sim);
    const from = sim.posts.length;
    await blurAll(page);
    const handled = sim.handled;
    await page.keyboard.press(String(answer.choiceIds[0] + 1));
    await page.keyboard.press(String(((answer.choiceIds[0] + 1) % 2) + 1));
    await until(() => sim.handled > handled, "하나 고르기 응답");
    await page.locator("[data-answer-feedback=correct]").waitFor({ timeout: 5000 });
    await settled(page, sim);
    const sent = answerPosts(sim, from);
    assert.equal(sent.length, 1, `하나 고르기가 ${sent.length}번 갔다`);
    assert.deepEqual(sent[0].action.choiceIds, answer.choiceIds);
    return "숫자키 한 번에 즉시 제출 · 이어 누른 키 무시";
  });
}
async function keysBankScenario({ page, sim, mobile, step, shot }, kind) {
  await step(`keys.${kind}`, async () => {
    await page.goto(base + "/dev/mobile-explorers-qa");
    await homeReady(page);
    await tap(page.locator("[data-expedition-start]"), mobile);
    const group = page.getByRole("group", { name: "답 고르기" });
    await group.waitFor({ timeout: 15000 });
    const shortcuts = await group.getByRole("button").evaluateAll((buttons) => buttons.map((b) => b.getAttribute("aria-keyshortcuts")));
    assert.deepEqual(shortcuts, ["1", "2", "3", "4"], "보기 번호 키 표지");
    // 화면에 뜬 보기 글 — 공개 DTO 에서(은행 장면 `publicProblems` 와 같은 길)
    const now = new Date();
    const choices =
      kind === "elementary"
        ? (await courseRequest(sim, "read", undefined, now)).data.session.problems[sim.state.course.learner.session.attempts.length].answerChoices
        : (await middleRequest(sim, "read", undefined, now)).data.mission.problems[serverState.currentSrsMission(sim.state, now).attempts.length].answerChoices;
    const from = sim.posts.length;
    await blurAll(page);
    await shot(`keys-${kind}`);
    await page.keyboard.press("2");
    await page.keyboard.press("3");
    await until(() => answerPosts(sim, from).length > 0, "은행 답 응답");
    await page.locator("[data-answer-feedback]").waitFor({ timeout: 5000 });
    await page.keyboard.press("4");
    await page.waitForTimeout(400);
    const sent = answerPosts(sim, from);
    assert.equal(sent.length, 1, `은행 답이 ${sent.length}번 갔다`);
    assert.equal(sent[0].body.submittedAnswer, choices[1], "둘째 보기가 아니다");
    return `숫자키 2 → «${choices[1]}» 한 번 · 저장 중 · 연출 중 키 무시`;
  });
}
scenarios["keys:explorer"] = keysScenario;
fixtures["keys:explorer"] = () => ({ ...serverState.emptySrsState(), explorers: explorerRecord(7, "g7-equation") });
scenarios["keys:bank-middle"] = (context) => keysBankScenario(context, "middle");
fixtures["keys:bank-middle"] = fixtures["bank-middle"];
scenarios["keys:bank-elementary"] = (context) => keysBankScenario(context, "elementary");
fixtures["keys:bank-elementary"] = fixtures["bank-elementary"];
scenarios["light:frames"] = lightFrames;

// ───────────────────────── 키 모양 — 번호 키 · ⏎ 키 (05 §8.18 · D-145, 2026-09-28) ─────────────────────────
// 모양은 «마우스가 주 포인터인 기기»(`(hover: hover) and (pointer: fine)`)에서만 — 폰(isMobile · hasTouch)은 지금 동그라미 ·
// 화살표 그대로. jsdom 은 이 조건도 계산된 색도 못 재서 여기서 잰다(교훈 2026-09-16 «RTL 은 클래스 이름을 보고 초록인데…»).
// 폰 · PC 모두에서 돈다: QA_SIZES=320x568,390x700,800x720,1280x800 QA_SCENARIOS=keys:look-explorer,keys:look-middle,keys:look-elementary
const KEY_EDGE = "rgb(198, 212, 236)";
const KEY_SELECTED = { color: "rgb(49, 89, 222)", depth: "rgb(36, 69, 176)" };
const KEY_RESULT = {
  explorer: { correct: { color: "rgb(29, 117, 80)", depth: "rgb(20, 105, 78)" } },
  middle: { correct: { color: "rgb(20, 105, 78)", depth: "rgb(22, 131, 96)" }, incorrect: { color: "rgb(161, 59, 50)", depth: "rgb(201, 81, 70)" } },
  elementary: { correct: { color: "rgb(22, 99, 70)", depth: "rgb(32, 132, 95)" }, incorrect: { color: "rgb(169, 66, 71)", depth: "rgb(210, 97, 99)" } },
};
async function keyCaps(scope) {
  return scope.locator("[data-answer-key]").evaluateAll((nodes) =>
    nodes.map((el) => {
      const style = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      const button = el.closest("button").getBoundingClientRect();
      return {
        key: el.dataset.answerKey,
        pressed: el.closest("button").getAttribute("aria-pressed"),
        display: style.display,
        radius: style.borderTopLeftRadius,
        bg: style.backgroundColor,
        color: style.color,
        shadow: style.boxShadow,
        w: Math.round(box.width * 10) / 10,
        h: Math.round(box.height * 10) / 10,
        inside: box.left >= button.left - 0.5 && box.right <= button.right + 0.5 && box.top >= button.top - 0.5 && box.bottom <= button.bottom + 0.5,
      };
    }),
  );
}
// 번호 키 — PC 는 흰 면 · 5px 모서리 · 테두리/두께(상태 색), 폰은 지금 모양(동그라미 · 그림자 없음). 칸 크기는 둘 다 화면 것 그대로.
function assertNumberCaps(caps, { mobile, size, look = null, label }) {
  assert.ok(caps.length > 0, `${label}: 번호 키가 없다`);
  for (const cap of caps) {
    const where = `${label} ${cap.key}번 ${JSON.stringify(cap)}`;
    assert.notEqual(cap.display, "none", `${where}: 번호가 숨었다`);
    if (size) assert.deepEqual([cap.w, cap.h], size, `${where}: 칸 크기가 바뀌었다`);
    assert.ok(cap.inside, `${where}: 단추 밖으로 나갔다`);
    if (mobile) {
      assert.equal(cap.shadow, "none", `${where}: 폰에 키 두께가 붙었다`);
      assert.notEqual(cap.radius, "5px", `${where}: 폰에서 키 모서리`);
      continue;
    }
    assert.equal(cap.radius, "5px", `${where}: 키 모서리`);
    assert.equal(cap.bg, WHITE, `${where}: 키 면`);
    const want = cap.pressed === "true" && look ? look : null;
    if (want) {
      assert.equal(cap.color, want.color, `${where}: 숫자 색`);
      assert.ok(cap.shadow.includes(`${want.depth} 0px 2px 0px`), `${where}: 아래 두께 색`);
    } else {
      assert.ok(cap.shadow.includes(`${KEY_EDGE} 0px 0px 0px 1px inset`) && cap.shadow.includes(`${KEY_EDGE} 0px 2px 0px`), `${where}: 테두리 · 두께`);
    }
  }
}
// ⏎ 키(확인 단추 안) · 바꿔 끼는 화살표 — PC 는 ⏎ 보이고 화살표 숨김, 폰은 ⏎ 숨기고 화살표 그대로.
async function assertEnterCap(button, { mobile, label }) {
  const look = await button.evaluate((el) => {
    const kbd = el.querySelector('[data-answer-key="Enter"]');
    const swap = el.querySelector("[data-answer-key-swap]");
    const box = kbd?.getBoundingClientRect();
    const own = el.getBoundingClientRect();
    const words = [...el.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
    const text = words.map((node) => node.textContent).join("").trim();
    // 글자(단추 바로 아래 글 마디)의 잉크 상자 — ⏎ 는 그 뒤에, 간격을 두고, 같은 줄에 서야 한다.
    const range = document.createRange();
    if (words.length) range.selectNodeContents(words.at(-1));
    const ink = words.length ? range.getBoundingClientRect() : null;
    return {
      name: el.getAttribute("aria-label") ?? text,
      shortcut: el.getAttribute("aria-keyshortcuts"),
      kbd: kbd ? { display: getComputedStyle(kbd).display, hidden: kbd.getAttribute("aria-hidden"), h: box.height, w: box.width, inside: box.left >= own.left && box.right <= own.right && box.top >= own.top && box.bottom <= own.bottom, color: getComputedStyle(kbd).color,
        gap: ink ? Math.round((box.left - ink.right) * 10) / 10 : null,
        line: ink ? Math.round(Math.abs(box.top + box.height / 2 - (ink.top + ink.height / 2)) * 10) / 10 : null } : null,
      swap: swap ? getComputedStyle(swap).display : null,
      opacity: getComputedStyle(el).opacity,
      lines: Math.round(own.height),
    };
  });
  const where = `${label} ${JSON.stringify(look)}`;
  assert.equal(look.shortcut, "Enter", `${where}: 엔터 표지`);
  assert.ok(look.kbd, `${where}: ⏎ 키가 없다`);
  assert.equal(look.kbd.hidden, "true", where);
  if (mobile) {
    assert.equal(look.kbd.display, "none", `${where}: 폰에 ⏎ 키가 보인다`);
    if (look.swap !== null) assert.notEqual(look.swap, "none", `${where}: 폰에서 화살표가 사라졌다`);
  } else {
    // 단추(flex) 안에서는 inline-grid 가 grid 로 계산된다
    assert.ok(["grid", "inline-grid"].includes(look.kbd.display), `${where}: PC 에 ⏎ 키가 안 보인다`);
    assert.equal(look.kbd.h, 18, `${where}: ⏎ 키 높이`);
    assert.ok(look.kbd.inside, `${where}: ⏎ 키가 단추 밖`);
    assert.equal(look.kbd.color, "rgb(230, 237, 255)", `${where}: ⏎ 키 색`);
    // 자리 — 글자 바로 뒤 · 글자에 붙지 않게(간격 > 0) · 같은 줄(가운데 높이 차 4px 안)
    assert.notEqual(look.kbd.gap, null, `${where}: 글자를 못 찾았다`);
    assert.ok(look.kbd.gap >= 4 && look.kbd.gap <= 16, `${where}: ⏎ 가 글자 뒤 4~16px 이 아니다`);
    assert.ok(look.kbd.line <= 4, `${where}: ⏎ 가 글자와 다른 줄`);
    if (look.swap !== null) assert.equal(look.swap, "none", `${where}: PC 에서 화살표와 ⏎ 가 같이 선다`);
  }
  return look;
}
async function keysLookExplorer({ page, sim, mobile, width, step, shot }) {
  // 탐험은 폭 350 이하에서 번호를 원래 숨긴다(`math-explorers.module.css` — 320 폰) — 그때는 «숨김 그대로»만 본다.
  const numbersShown = width > 350;
  const numbers = () => choiceButtons(page);
  const checkNumbers = async (label, size, look) => {
    const caps = await keyCaps(page.getByRole("group", { name: "답 고르기" }));
    if (!numbersShown) {
      assert.ok(caps.every((cap) => cap.display === "none"), `${label}: 320 에서 번호가 보인다`);
      return caps.length;
    }
    assertNumberCaps(caps, { mobile, size, look, label });
    return caps.length;
  };
  await step("keys.look.examples", async () => {
    await page.goto(base + "/dev/mobile-explorers-qa");
    await homeReady(page);
    await tap(page.locator("[data-expedition-start]"), mobile);
    await page.locator("[data-explorer-dock=true]").waitFor({ timeout: 10000 });
    await settled(page, sim);
    await untilActivity(page, sim, mobile, "examples");
    await blurAll(page);
    const confirm = page.getByRole("button", { name: "선택한 예 확인하기" });
    const count = await checkNumbers("예 모으기 안 고름", [18, 18]);
    const off = await assertEnterCap(confirm, { mobile, label: "확인 꺼짐" });
    assert.equal(off.opacity, "0.5", "꺼진 확인 단추");
    await shot("keys-look-examples-off");
    const answer = correctExplorerAction(sim);
    for (const id of answer.choiceIds) await tap(numbers().nth(id), mobile);
    await blurAll(page);
    await checkNumbers("예 모으기 고름", [18, 18], KEY_SELECTED);
    const on = await assertEnterCap(confirm, { mobile, label: "확인 켜짐" });
    assert.equal(on.opacity, "1");
    await page.waitForTimeout(300); // 차오름(0.18초)이 끝난 모습을 찍는다
    await shot("keys-look-examples-picked");
    const handled = sim.handled;
    await tap(confirm, mobile);
    await until(() => sim.handled > handled, "예 모으기 확인 응답");
    await page.locator("[data-answer-feedback=correct]").waitFor({ timeout: 5000 });
    await checkNumbers("예 모으기 맞음", [18, 18], KEY_RESULT.explorer.correct);
    await shot("keys-look-examples-correct");
    await settled(page, sim);
    return `번호 ${count}개 ${numbersShown ? (mobile ? "동그라미 그대로" : "키") : "숨김(350 이하)"} · ⏎ ${mobile ? "숨김" : "보임"} · 꺼진 확인 opacity ${off.opacity}`;
  });
  await step("keys.look.assemble", async () => {
    await untilActivity(page, sim, mobile, "assemble");
    await blurAll(page);
    await checkNumbers("문장 조립", [22, 22]);
    await assertEnterCap(page.getByRole("button", { name: "완성한 문장 확인하기" }), { mobile, label: "문장 조립 확인" });
    await shot("keys-look-assemble");
    return `문장 조립 번호 22 · 확인 단추 ⏎ ${mobile ? "숨김" : "보임"}`;
  });
  await step("keys.look.truth", async () => {
    await untilActivity(page, sim, mobile, "truth");
    await blurAll(page);
    await checkNumbers("경계 살피기", [22, 22]);
    assert.equal(await page.locator('[data-explorer-dock=true] [data-answer-key="Enter"]').count(), 0, "누르면 바로 채점하는 화면에 ⏎");
    await shot("keys-look-truth");
    return "경계 살피기 번호 22 · ⏎ 없음";
  });
}
function bankLookHelpers({ page, sim, mobile }, kind) {
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
    publicProblem.answerChoices.findIndex((choice) => (kind === "elementary" ? gradeCourseAnswer(stored, choice) === true : gradeSrsAnswer(stored, choice)));
  const group = () => page.getByRole("group", { name: "답 고르기" });
  async function answerInBrowser(right) {
    const { problems, stored, index } = await publicProblems();
    const correct = correctIndex(problems[index], stored[index]);
    assert.ok(correct >= 0, "정답 보기를 찾지 못했다");
    const pick = right ? correct : (correct + 1) % problems[index].answerChoices.length;
    const handled = sim.handled;
    await tap(group().getByRole("button").nth(pick), mobile);
    await until(() => sim.handled > handled, "은행 답 응답");
    await page.locator(`[data-answer-feedback=${right ? "correct" : "incorrect"}]`).waitFor({ timeout: 5000 });
  }
  async function answerOnServer() {
    const { problems, stored, index, sessionId } = await publicProblems();
    const choices = problems[index].answerChoices;
    const submittedAnswer = choices ? choices[correctIndex(problems[index], stored[index])] : stored[index].answer;
    if (kind === "elementary") await courseRequest(sim, "attempt", { sessionId, problemId: stored[index].id, submittedAnswer }, new Date());
    else await middleRequest(sim, "attempt", { missionId: sessionId, problemId: stored[index].id, submittedAnswer, elapsedSeconds: 20, rating: "good" }, new Date());
  }
  return { publicProblems, group, answerInBrowser, answerOnServer, answered: () => sim.state.expedition?.mission?.answered ?? 0 };
}
async function keysLookBank(context, kind) {
  const { page, mobile, step, shot } = context;
  const size = kind === "elementary" ? [24, 24] : [23, 23];
  const { group, answerInBrowser } = bankLookHelpers(context, kind);
  await step(`keys.look.${kind}`, async () => {
    await page.goto(base + "/dev/mobile-explorers-qa");
    await homeReady(page);
    await tap(page.locator("[data-expedition-start]"), mobile);
    await group().waitFor({ timeout: 15000 });
    await blurAll(page);
    assertNumberCaps(await keyCaps(group()), { mobile, size, label: `${kind} 안 고름` });
    await shot(`keys-look-${kind}`);
    await answerInBrowser(true);
    assertNumberCaps(await keyCaps(group()), { mobile, size, look: KEY_RESULT[kind].correct, label: `${kind} 맞음` });
    await shot(`keys-look-${kind}-correct`);
    await expect(page.locator("[data-answer-feedback]")).toHaveCount(0, { timeout: 8000 });
    await group().waitFor({ timeout: 8000 });
    await answerInBrowser(false);
    assertNumberCaps(await keyCaps(group()), { mobile, size, look: KEY_RESULT[kind].incorrect, label: `${kind} 틀림` });
    await shot(`keys-look-${kind}-incorrect`);
    return `번호 ${size[0]}px ${mobile ? "동그라미 그대로" : "키"} · 맞음 · 틀림 결과색`;
  });
}
// 오늘 분량을 다 맞혀 끝낸 뒤(틀리면 «모아 둔 오답 다시 풀기»가 끼어 하루가 안 끝난다) 진도판 지난 칸의 다시 풀기 대화상자를 잰다.
// 이 화면이 받는 응답에서만 문항 모양을 바꾼다(기록 · 채점은 그대로) — 시뮬레이터가 못 내는 모양(문제은행 후보의 숫자 입력 칸 ·
// 칠하기 문항)을 띄워 ⏎ 를 재려고. `patch` 가 바꾼 DTO 를 돌려준다.
async function patchedRead(page, sim, path, read, patch) {
  const matches = (url) => new URL(url).pathname === path;
  await page.route(matches, async (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    const dto = patch(await read(new URL(route.request().url())));
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(dto) });
    sim.handled++; // 시뮬레이터 대신 여기서 답했다 — «가로채지 않은 요청 0» 셈에 넣는다
  });
  return () => page.unroute(matches);
}
const FRACTION_PARTS = { kind: "fraction-parts", denominator: 4, shape: "bar" };
async function keysLookReplay(context, kind) {
  const { page, mobile, step, shot } = context;
  const sim = context.sim;
  const goal = kind === "elementary" ? 10 : 12;
  const { publicProblems, group, answerInBrowser, answerOnServer, answered } = bankLookHelpers(context, kind);
  const openCourseAs = async (change, ready) => {
    const restore = await patchedRead(page, sim, "/api/learn/math-srs/course", () => courseRequest(sim, "read", undefined, new Date()), (dto) => {
      const shown = dto.data.session.problems;
      const at = dto.data.session.attempts.length;
      shown[at] = { ...shown[at], ...change };
      return dto;
    });
    await page.reload();
    await homeReady(page);
    await tap(page.locator("[data-expedition-start]"), mobile);
    await ready().waitFor({ timeout: 15000 });
    await blurAll(page);
    return restore;
  };
  await step(`keys.look.${kind}.replay`, async () => {
    await page.goto(base + "/dev/mobile-explorers-qa");
    await homeReady(page);
    // 은행 날은 학생이 «시작»을 눌러야 미션 · 세션이 선다.
    await tap(page.locator("[data-expedition-start]"), mobile);
    await group().or(page.getByRole("textbox")).first().waitFor({ timeout: 15000 });
    let input = "숫자 입력 문항 없음";
    for (let guard = 0; guard < 40 && answered() < goal - 1; guard++) {
      if (kind === "elementary" && sim.state.course.learner.session?.completedAt) await courseRequest(sim, "start", {}, new Date());
      // 초등 «정답 확인 →»(숫자 입력 칸) · «완성했어요 →»(칠하기)를 한 번씩 화면에서 잰다 — ⏎ 가 화살표 자리를 대신하는가(PC) ·
      // 그대로인가(폰). 생성기 문항은 숫자 답을 늘 네 보기로 내고, 숫자 입력 칸은 문제은행 후보(보기 없음)에서만 온다 —
      // 시뮬레이터는 후보를 안 싣는다. 그래서 숫자 답 문항 하나의 보기를 이 화면이 받는 응답에서만 걷는다.
      const { problems, index } = await publicProblems();
      const current = problems[index];
      if (kind === "elementary" && input.startsWith("숫자") && !current.interactive && current.input.mode === "number") {
        let restore = await openCourseAs({ answerChoices: null }, () => page.getByRole("textbox", { name: current.input.label }));
        const look = await assertEnterCap(page.getByRole("button", { name: /정답 확인/ }), { mobile, label: "초등 정답 확인" });
        assert.notEqual(look.swap, null, "«정답 확인»에 바꿔 끼는 화살표가 없다");
        await shot(`keys-look-${kind}-input`);
        await restore();
        restore = await openCourseAs({ answerChoices: null, interactive: FRACTION_PARTS }, () => page.getByRole("button", { name: "2번째 칸" }));
        await tap(page.getByRole("button", { name: "2번째 칸" }), mobile);
        await blurAll(page);
        const done = await assertEnterCap(page.getByRole("button", { name: /완성했어요/ }), { mobile, label: "초등 완성했어요" });
        assert.notEqual(done.swap, null, "«완성했어요»에 바꿔 끼는 화살표가 없다");
        await shot(`keys-look-${kind}-parts`);
        await restore();
        input = `«정답 확인» · «완성했어요» ${mobile ? "화살표 그대로 · ⏎ 숨김" : `⏎ 가 화살표 자리(글자 뒤 ${look.kbd.gap}px)`}`;
      }
      await answerOnServer();
    }
    assert.equal(answered(), goal - 1);
    await page.reload();
    await homeReady(page);
    await tap(page.locator("[data-expedition-start]"), mobile);
    await group().waitFor({ timeout: 15000 });
    await answerInBrowser(true);
    await homeReady(page);
    const openReplay = async () => {
      await tap(page.locator('[data-day-step="1"]').getByRole("button"), mobile);
      const dialog = page.getByRole("dialog", { name: /1번 문제 다시 풀기/ });
      await expect(dialog).toBeVisible({ timeout: 10000 });
      return dialog;
    };
    const dialog = await openReplay();
    const choices = dialog.getByRole("group", { name: "복습 답 고르기" });
    await choices.getByRole("button").first().waitFor();
    // D-145 · 리드 검토 ① — 열 때 브라우저가 «복습 닫기 ×»에 둔 포커스를 문항이 뜨면 문제 머리로 옮긴다.
    // 그래서 숫자키로 푼 뒤(채점 대기 · 채점 뒤) 친 엔터가 ×를 눌러 대화상자를 닫지 않는다.
    const focused = await page.evaluate(() => `${document.activeElement?.tagName}:${document.activeElement?.getAttribute("aria-label") ?? ""}`);
    assert.equal(focused, "H2:", `문항이 뜬 뒤 포커스가 문제 머리가 아니다(${focused})`);
    const caps = await keyCaps(choices);
    assertNumberCaps(caps, { mobile, size: mobile ? null : [18, 18], label: `${kind} 다시 풀기` });
    await shot(`keys-look-${kind}-replay`);
    const handled = sim.handled;
    await page.keyboard.press("1");
    await page.keyboard.press("Enter");
    await until(() => sim.handled > handled, "다시 풀기 채점 응답");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(1500);
    await expect(dialog, "숫자키 → 엔터 뒤 대화상자가 닫혔다").toBeVisible();
    await tap(dialog.getByRole("button", { name: "복습 닫기" }), mobile);
    await expect(dialog).toHaveCount(0);
    // 칠하기 문항의 «완성했어요 ⏎» — 이 화면만 단추가 flex/gap 이 아니었다(⏎ 가 글자에 붙음, 리드 검토 ②).
    const restore = await patchedRead(page, sim, "/api/learn/math-srs/replay", (url) => replayRequest(sim, url, undefined, new Date()), (dto) => ({ ...dto, data: { ...dto.data, interactive: FRACTION_PARTS } }));
    const parts = await openReplay();
    await tap(parts.getByRole("button", { name: "2번째 조각" }), mobile);
    await blurAll(page);
    const done = await assertEnterCap(parts.getByRole("button", { name: "완성했어요" }), { mobile, label: `${kind} 다시 풀기 완성했어요` });
    await shot(`keys-look-${kind}-replay-parts`);
    await tap(parts.getByRole("button", { name: "복습 닫기" }), mobile);
    await restore();
    return `다시 풀기 번호 ${caps.length}개 ${mobile ? "지금 모양" : "키 18px"} · 첫 포커스 문제 머리 · 숫자키 → 엔터 뒤 대화상자 그대로 · 완성했어요 ⏎ ${mobile ? "숨김" : `글자 뒤 ${done.kbd.gap}px`}${kind === "elementary" ? " · " + input : ""}`;
  });
}
// 작업실 — 조각 확인 단추의 ⏎ 자리와, 나누는 수 ＋ 를 마우스로 누른 뒤의 엔터(D-145 ⑸ 넓힘 — 3:0): ＋ 를 한 번 더 누르지 않고 확인.
async function keysLookWorkshop({ page, sim, mobile, step, shot }) {
  const labPosts = (from, type) => sim.posts.slice(from).filter((post) => post.action?.type === type);
  await step("keys.look.workshop", async () => {
    await page.goto(base + "/dev/mobile-explorers-qa");
    await homeReady(page);
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
    await perform(page, sim, correctExplorerAction(sim), mobile);
    for (let guard = 0; guard < 6 && attachedWorkshop(sim)?.stage !== "split"; guard++) {
      await settled(page, sim);
      await perform(page, sim, workshopCorrect(attachedWorkshop(sim)), mobile);
    }
    await settled(page, sim);
    assert.equal(attachedWorkshop(sim)?.stage, "split", "조각 나누기에 닿지 못했다");
    const confirm = page.getByRole("button", { name: "나눈 조각 확인하기" });
    await blurAll(page);
    const split = await assertEnterCap(confirm, { mobile, label: "작업실 나눈 조각 확인" });
    await shot("keys-look-workshop-split");
    const more = page.getByRole("button", { name: "1번째 분수 나누는 수 늘리기" });
    const before = Number(await more.evaluate((el) => el.parentElement.querySelector("strong").firstChild.textContent));
    const from = sim.posts.length;
    const handled = sim.handled;
    await tap(more, mobile);
    const focus = await more.evaluate((el) => el === document.activeElement);
    await page.keyboard.press("Enter");
    await until(() => sim.handled > handled, "조각 확인 응답");
    const sent = labPosts(from, "lab-split");
    assert.equal(sent.length, 1, `엔터가 확인을 ${sent.length}번 보냈다`);
    assert.equal(sent[0].action.factor, before + 1, "엔터가 ＋ 를 한 번 더 눌렀다");
    await page.locator("[data-answer-feedback]").waitFor({ timeout: 5000 });
    await settled(page, sim);
    for (let guard = 0; guard < 8 && attachedWorkshop(sim) && attachedWorkshop(sim).stage !== "check"; guard++) {
      await perform(page, sim, workshopCorrect(attachedWorkshop(sim)), mobile);
      await settled(page, sim);
    }
    assert.equal(attachedWorkshop(sim)?.stage, "check", "칠하기에 닿지 못했다");
    await tap(page.getByRole("button", { name: "1번째 분수 1번째 조각", exact: true }), mobile);
    await blurAll(page);
    const check = await assertEnterCap(page.getByRole("button", { name: "칠한 조각 확인하기" }), { mobile, label: "작업실 칠한 조각 확인" });
    await shot("keys-look-workshop-check");
    return `나눈 · 칠한 조각 확인 ⏎ ${mobile ? "숨김" : `글자 뒤 ${split.kbd.gap} · ${check.kbd.gap}px`} · ＋ 마우스(포커스 ${focus ? "남음" : "안 남음"}) 뒤 엔터 = 확인 한 번(${before + 1}개로)`;
  });
}
scenarios["keys:look-workshop"] = keysLookWorkshop;
fixtures["keys:look-workshop"] = fixtures.workshop;
scenarios["keys:look-explorer"] = keysLookExplorer;
fixtures["keys:look-explorer"] = fixtures["keys:explorer"];
scenarios["keys:look-middle"] = (context) => keysLookBank(context, "middle");
fixtures["keys:look-middle"] = fixtures["bank-middle"];
scenarios["keys:look-elementary"] = (context) => keysLookBank(context, "elementary");
fixtures["keys:look-elementary"] = fixtures["bank-elementary"];
scenarios["keys:look-replay-middle"] = (context) => keysLookReplay(context, "middle");
fixtures["keys:look-replay-middle"] = fixtures["bank-middle"];
scenarios["keys:look-replay-elementary"] = (context) => keysLookReplay(context, "elementary");
fixtures["keys:look-replay-elementary"] = fixtures["bank-elementary"];

// Opt-in checks for the agreed atelier layout and device preference.
scenarios["atelier:home-motion"] = async ({ page, sim, mobile, width, step, shot }) => {
  await step("atelier.home", async () => {
    await page.goto(base + "/dev/mobile-explorers-qa");
    await homeReady(page);
    await noHorizontalScroll(page);
    const mission = await page.locator("[data-expedition-mission]").boundingBox();
    const map = await page.locator("[data-daily-journey]").boundingBox();
    assert.ok(mission && map);
    if (width >= 1100) {
      assert.ok(map.width >= 480, "PC 나란히 배치의 지도 최소 폭: " + map.width);
      assert.ok(map.x > mission.x + mission.width, "PC 미션/지도 나란히");
    } else {
      assert.ok(map.y >= mission.y + mission.height, "모바일 미션 뒤 지도 순서");
      const tools = await page.getByRole("button", { name: "학습 설정", exact: true }).boundingBox();
      assert.ok(tools && tools.y >= map.y + map.height, "모바일 지도 뒤 도구 순서");
    }
    await shot("atelier-home");
    return `미션 ${Math.round(mission.width)}px · 지도 ${Math.round(map.width)}px · ${width >= 1100 ? "나란히" : "한 열"}`;
  });
  const boundary = page.locator("[data-learning-motion]").first();
  const settings = () => page.getByRole("dialog", { name: "학습 설정", exact: true });
  const toggle = () => settings().getByRole("switch", { name: "움직임 줄이기", exact: true });
  const open = async () => {
    await tap(page.getByRole("button", { name: "학습 설정", exact: true }), mobile);
    await expect(settings()).toBeVisible();
  };
  const close = async () => {
    await tap(settings().getByRole("button", { name: "학습 설정 닫기" }), mobile);
    await expect(settings()).toHaveCount(0);
  };
  await step("atelier.app-reduce", async () => {
    await expect(boundary).toHaveAttribute("data-learning-motion", "full");
    await open();
    const posts = sim.posts.length;
    await tap(toggle(), mobile);
    await expect(boundary).toHaveAttribute("data-learning-motion", "reduce");
    assert.equal(await page.evaluate(() => localStorage.getItem("todays-math:learning-motion:v1")), "reduce");
    assert.equal(sim.posts.length, posts, "기기 설정이 학습 기록 저장을 요청했다");
    await close();
    await page.reload();
    await homeReady(page);
    await expect(boundary).toHaveAttribute("data-learning-motion", "reduce");
    await open();
    await expect(toggle()).toHaveAttribute("aria-checked", "true");
    await shot("atelier-motion-settings");
    return "앱 줄이기 · 기기 저장 · reload 유지 · 서버 기록 요청 없음";
  });
  await step("atelier.os-and-app", async () => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(toggle()).toBeDisabled();
    await expect(toggle()).toHaveAttribute("aria-checked", "true");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(toggle()).toBeEnabled();
    await expect(boundary).toHaveAttribute("data-learning-motion", "reduce");
    await tap(toggle(), mobile);
    await expect(boundary).toHaveAttribute("data-learning-motion", "full");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(boundary).toHaveAttribute("data-learning-motion", "reduce");
    await expect(toggle()).toBeDisabled();
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(boundary).toHaveAttribute("data-learning-motion", "full");
    await close();
    return "OS만 · 앱만 · 둘 다 · 둘 다 없음 네 상태";
  });
  await step("atelier.active-settings", async () => {
    await tap(page.locator("[data-expedition-start]"), mobile);
    await page.locator("[data-explorer-dock]").waitFor();
    await tap(page.getByRole("button", { name: "← 진도판", exact: true }), mobile);
    await homeReady(page);
    await open();
    await expect(toggle()).toBeEnabled();
    await tap(toggle(), mobile);
    await expect(boundary).toHaveAttribute("data-learning-motion", "reduce");
    await close();
    return "미션 진행으로 단원 설정이 잠겨도 기기 설정 사용 가능";
  });
};
fixtures["atelier:home-motion"] = fixtures.concept;

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
if (feedbackMeasurements.length)
  await writeFile(resolve(output, "feedback-geometry.json"), JSON.stringify(feedbackMeasurements, null, 2));
if (katexFindings.length || scenarioNames.some((name) => name.startsWith("katex:") || name.startsWith("lab-fraction:"))) {
  await writeFile(resolve(output, "katex-findings.json"), JSON.stringify(katexFindings, null, 2));
  await writeFile(resolve(output, "katex-fitted.json"), JSON.stringify(katexFitted, null, 2));
}
if (labGeometry.length) await writeFile(resolve(output, "lab-fraction.json"), JSON.stringify(labGeometry, null, 2));
if (fitFindings.length) {
  await writeFile(resolve(output, "fit-findings.json"), JSON.stringify(fitFindings, null, 2));
  for (const kind of ["assemble", "read"].filter((kind) => fitFindings.some((row) => row.kind === kind && !row.supplement)))
    console.log(
      `잘림 실측 ${kind}: ` +
        FIT_SIZES.map(([w, h]) => {
          const rows = fitFindings.filter((row) => row.kind === kind && row.size === `${w}x${h}` && !row.filled && !row.supplement);
          return `${w}×${h} 다 보임 ${rows.filter((row) => row.full).length}/${rows.length}` + (kind === "assemble" ? ` · 첫 줄 ${rows.filter((row) => row.first).length}` : "");
        }).join(" · "),
    );
  // 넘칠 때만 글씨 줄이기(2026-09-29) — 빈 빈칸 · 채운 빈칸 각각: 빈칸 상자까지 다 보임 · 줄인 배율별 수 · 배율을 눌러 대 본 판정.
  for (const [supplement, filled] of [[false, 0], [false, 2], [true, 0], [true, 2]]) {
    const rows = fitFindings.filter((row) => row.kind === "assemble" && (row.filled ?? 0) === filled && !!row.supplement === supplement && row.trial);
    if (!rows.length) continue;
    console.log(
      `${supplement ? "보충 " : ""}조립 맞춤 (빈칸 ${filled ? "채움" : "빔"}): ` +
        FIT_SIZES.map(([w, h]) => {
          const at = rows.filter((row) => row.size === `${w}x${h}`);
          const scales = FIT_TRIAL_STEPS.map((step) => `${step}배 ${at.filter((row) => row.fit === step).length}`).join(" ");
          const trial = FIT_TRIAL_STEPS.map((step) => `${step}→${at.filter((row) => row.trial[step]).length}`).join(" ");
          return `${w}×${h} 다 보임 ${at.filter((row) => row.full).length} · 빈칸까지 ${at.filter((row) => row.slots).length}/${at.length} [${scales}] (눌러 대 봄 ${trial})`;
        }).join(" · "),
    );
  }
  const mounted = fitFindings.filter((row) => row.mountFit !== undefined);
  if (mounted.length)
    console.log(
      `넘김 도중 정한 배율 = 넘김 뒤 다시 잰 배율: ${mounted.filter((row) => row.mountFit === row.fit).length}/${mounted.length}` +
        mounted.filter((row) => row.mountFit !== row.fit).map((row) => ` · ${row.name} ${row.mountFit}→${row.fit}`).join(""),
    );
}
const failed = results.filter((r) => r.status === "실패");
console.log(`${results.length} 항목 · 실패 ${failed.length} · 못 봄 ${results.filter((r) => r.status === "못 봄").length}`);
process.exitCode = failed.length ? 1 : 0;
