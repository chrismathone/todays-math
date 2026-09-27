// 별 경제 시뮬레이터(D-144) — 병목 조사(reward-latency)의 라우트 거울을 그대로 옮기고 난수만 고정했다.
// 라우트 거울 — src/lib/math-explorers/routes.ts changeExplorer · handleExplorerRequest 를 줄마다 따라 한다
// (scripts/qa/mobile-explorers-qa.mjs explorerChange · explorerData 와 같다). 표는 메모리 — 행 payload 를
// JSON 글로 들고 있어 읽을 때 JSON.parse · 쓸 때 JSON.stringify (Prisma 의 Json 칸 왕복 비용 대역).
// 고정 씨앗(SEED) — 실행마다 같은 문항·같은 진도가 나오게 한다(원본 계측기는 crypto 난수).
let rngState = Number(process.env.SEED ?? 20260928) >>> 0;
function next() {
  rngState = (rngState + 0x6d2b79f5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export function reseed(seed) { rngState = seed >>> 0; }
const randomInt = (min, max) => min + Math.floor(next() * (max - min));
const hex = (n) => Array.from({ length: n }, () => Math.floor(next() * 16).toString(16)).join("");
const randomUUID = () => `${hex(8)}-${hex(4)}-4${hex(3)}-${"89ab"[Math.floor(next() * 4)]}${hex(3)}-${hex(12)}`;
Math.random = next;
import { src } from "./load.mjs";

export const engine = src("lib/math-explorers/engine.ts");
export const cards = src("lib/math-explorers/definition-cards.ts");
export const workshopLib = src("lib/math-explorers/workshop.ts");
export const expedition = src("lib/math-explorers/expedition.ts");
const { expeditionInitialCourseRecommendation, startExpedition } = src("lib/math-explorers/expeditionStart.ts");
export const { expeditionJourney } = src("lib/math-explorers/expeditionJourney.ts");
export const explorerContract = src("contracts/mathExplorers.contract.ts");
export const commonContract = src("contracts/common.contract.ts");
export const { changeSrsState, readSrsState } = src("lib/math-srs/serverStore.ts");
export const serverState = src("lib/math-srs/serverState.ts");
export const automation = src("lib/math-srs/courseAutomation.ts");
export const { kstDateOf } = src("lib/kstDate.ts");
export const sharedAnswers = src("lib/math-srs/sharedAnswers.ts");

export const studentId = "11111111-1111-4111-8111-111111111111";
export const studentRow = { id: studentId, name: "test_s", className: "테스트반" };
const responseSchema = commonContract.dataResponseSchema(explorerContract.explorerStateSchema);

export function createTable(initialPayload, revision = 1) {
  let row = initialPayload ? { studentId, revision, text: JSON.stringify(initialPayload) } : null;
  const table = {
    calls: { findUnique: 0, create: 0, updateMany: 0 },
    bytesRead: 0,
    bytesWritten: 0,
    async findUnique() {
      table.calls.findUnique++;
      if (!row) return null;
      table.bytesRead += row.text.length;
      return { studentId, revision: row.revision, payload: JSON.parse(row.text) };
    },
    async findMany() {
      return row ? [await table.findUnique()] : [];
    },
    async create({ data }) {
      table.calls.create++;
      if (row) throw Object.assign(new Error("duplicate"), { code: "P2002" });
      const text = JSON.stringify(data.payload);
      table.bytesWritten += text.length;
      row = { studentId, revision: data.revision, text };
    },
    async updateMany({ where, data }) {
      table.calls.updateMany++;
      if (!row || row.revision !== where.revision) return { count: 0 };
      const text = JSON.stringify(data.payload);
      table.bytesWritten += text.length;
      row = { studentId, revision: row.revision + data.revision.increment, text };
      return { count: 1 };
    },
    get revision() {
      return row?.revision ?? 0;
    },
    get payload() {
      return row ? JSON.parse(row.text) : null;
    },
    get text() {
      return row?.text ?? "";
    },
  };
  return table;
}

function ownedExplorer(state, now) {
  const explorer = expedition.initialOwnedExplorer(state, studentId, now);
  if (explorer.profile.id !== studentId) throw new serverState.SrsUnavailable("owner");
  return explorer;
}

/** routes.ts changeExplorer 거울 (은행 후보 DB 읽기 → []) */
export async function explorerChange(table, input, now) {
  const date = kstDateOf(now);
  const previous = await readSrsState(studentId, table);
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
    table,
    input.expectedRevision,
  );
  return { ...saved, feedback };
}

/** handleExplorerRequest 의 응답 조립 거울 — jsonOk 가 responseSchema.parse 를 한 번 더 한다 */
export function explorerResponse(saved, feedback, now) {
  const date = kstDateOf(now);
  return responseSchema.parse({
    data: {
      ...engine.explorerView(ownedExplorer(saved.state, now), date),
      today: date,
      journey: expeditionJourney(saved.state, now, studentId),
      expedition: expedition.expeditionDto(saved.state, studentId, now),
      student: studentRow,
      revision: saved.revision,
      feedback,
    },
  });
}

export async function explorerPost(table, action, now) {
  const input = { requestId: randomUUID(), expectedRevision: table.revision, action };
  return explorerChange(table, input, now);
}

// ── 정답 고르기 (QA 스크립트와 같다) ──
export function currentState(table) {
  return serverState.parseSrsState(table.payload);
}
function attachedWorkshop(stored) {
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
export function explorerAnswer(stored, wrong = false) {
  const workshop = attachedWorkshop(stored);
  if (workshop) return workshopCorrect(workshop);
  const session = stored.profile.definitions.session;
  const questionId = cards.definitionQuestionId(session);
  if (cards.definitionNeedsRead(stored.profile, session)) return { type: "read", questionId };
  const task = session.queue[session.index];
  const card = cards.definitionCard(task.cardId);
  const sourceIds = wrong
    ? task.kind === 0 ? [1, 0] : task.kind === 1 ? [] : [1 - Number(card.truth)]
    : task.kind === 0 ? [0, 1] : task.kind === 1 ? card.examples.flatMap((e, i) => (e.yes ? [i] : [])) : [Number(card.truth)];
  const order = cards.definitionOptions(session, task);
  return { type: "answer", questionId, choiceIds: sourceIds.map((id) => order.indexOf(id)) };
}

// ── 은행 날 (courseRoutes · serverRoutes 의 쓰기 거울) ──
export async function elementaryAttempt(table, now) {
  return changeSrsState(studentId, (state) => {
    const course = state.course;
    const session = course.learner.session;
    const retry = session.retry && !session.retry.completedAt ? session.retry : null;
    const answerOf = (problem) =>
      problem.input.mode === "self-check"
        ? { submittedAnswer: "", selfCorrect: true }
        : { submittedAnswer: String(problem.answer) };
    if (retry) {
      const problemId = retry.pendingProblemIds[retry.attempts.length] ?? retry.pendingProblemIds[0];
      const problem = session.problems.find((p) => p.id === problemId);
      const next = automation.submitCourseAttempt(course, { sessionId: session.id, problemId, ...answerOf(problem), retryIndex: retry.attempts.length }, now);
      return { ...state, course: next };
    }
    if (session.completedAt) {
      // courseRoutes 의 POST start 거울 — 오늘 목표(10)를 채우려 다음 소단원 세션을 연다
      const seed = randomInt(0, 0x1_0000_0000);
      const next = automation.startRecommendedCourse(course, expedition.expeditionCourseRecommendation(state, now), now, seed, randomUUID, []);
      return next === course ? state : { ...state, course: next };
    }
    const problem = session.problems[session.attempts.length];
    // 스스로 확인 문항은 풀이(힌트)를 먼저 연다 — courseRoutes 의 hint 쓰기 거울
    if (problem.input.mode === "self-check" && !(session.hintedProblemIds ?? []).includes(problem.id))
      return { ...state, course: automation.revealCourseHint(course, { sessionId: session.id, problemId: problem.id }) };
    const next = automation.submitCourseAttempt(course, { sessionId: session.id, problemId: problem.id, ...answerOf(problem) }, now);
    return { ...state, course: next };
  }, table);
}
export async function middleAttempt(table, now) {
  return changeSrsState(studentId, (state) => {
    const mission = serverState.currentSrsMission(state, now);
    const problem = mission.problems[mission.attempts.length];
    const submittedAnswer = sharedAnswers.correctSrsChoice(problem) ?? String(problem.answer);
    return serverState.submitSrsAttempt(state, studentId, { missionId: mission.id, problemId: problem.id, submittedAnswer, elapsedSeconds: 20, rating: "good" }, now);
  }, table);
}
