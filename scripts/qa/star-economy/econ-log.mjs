// 30일 경제 기록기 — gen-states.mjs 와 같은 세 학생 · 같은 하루 흐름(제품 엔진 · CAS 저장 · 탐험 가드)을 돌리고,
// 날마다 «별이 나올 재료»를 적는다: 계획 종류 · 카드 레벨 오름 · 상자 · 설계도 · 은행 날 첫 풀이 정답/문항 · 칸 지급.
// 별은 계획을 바꾸지 않는다(planExpedition 은 카드·코스·미션만 읽는다) → 안마다 이 기록에 규칙을 입혀 계산한다(econ-options.mjs).
// 차이: 마지막 날에도 상자를 받는다(지연 계측용으로 남겨 두지 않는다). 기지는 여기서 키우지 않는다(안마다 다르다).
// 실행(저장소 뿌리): node scripts/qa/star-economy/econ-log.mjs            → .qa-artifacts/star-economy/econ-log.json (30일)
//                  DAYS=90 node scripts/qa/star-economy/econ-log.mjs    → econ-log-90.json
//                  node scripts/qa/star-economy/fixture.mjs             → src/__tests__/fixtures/starEconomyDays.json
// 고정 씨앗 SEED(기본 20260928) — 같은 씨앗이면 바이트까지 같은 기록(두 번 돌려 cmp 로 확인함). 30일 약 1분 · 90일 약 10분.
import { writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { clock } from "./load.mjs";
import * as sim from "./sim.mjs";

const { worktree } = await import("./load.mjs");
const out = resolve(worktree, ".qa-artifacts/star-economy");
await mkdir(out, { recursive: true });
const DAY = 86_400_000;
const DAYS = Number(process.env.DAYS ?? 30);
const base = Date.parse("2026-08-30T03:00:00.000Z");
const { src } = await import("./load.mjs");
const catalog = src("lib/math-srs/elementary/catalog.ts");

function explorerRecord(grade) {
  const explorer = sim.engine.createExplorerState(sim.studentId, grade);
  explorer.profile.definitions = { courseGrade: grade, runs: 0, history: [], cards: {} };
  return explorer;
}
const personas = {
  g8: () => ({ ...sim.serverState.emptySrsState(), explorers: explorerRecord(8) }),
  g4: () => {
    const now = new Date(base);
    const start = catalog.COURSE_SECTIONS.find((s) => s.grade === 4).id;
    const course = sim.automation.setCoursePlan(sim.automation.emptyCourseState(), { startSectionId: start, dailyQuestionCount: 10, enabled: true, expectedRevision: 0 }, now);
    return { ...sim.serverState.emptySrsState(), course, explorers: explorerRecord(4) };
  },
  g7: () => ({ ...sim.serverState.emptySrsState(), explorers: explorerRecord(7) }),
};

/** 그날 은행 미션의 첫 풀이(재도전 제외) 정답 수 · 문항 수 */
function bankFirstTry(state, mission) {
  let answered = 0, correct = 0;
  for (const ref of mission.references) {
    if (mission.kind === "middle") {
      const m = state.missions.find((x) => x.id === ref.id);
      for (const a of m?.attempts ?? []) { answered++; if (a.correct) correct++; }
    } else {
      const s = sim.automation.findStoredCourseSession?.(state.course, ref.id);
      for (const a of s?.attempts ?? []) { answered++; if (a.correct) correct++; }
    }
  }
  return { answered, correct };
}

async function runDay(table, now, day, rec) {
  const state0 = sim.currentState(table);
  const plan = sim.expedition.planExpedition(state0, sim.studentId, now);
  const canStart = sim.expedition.expeditionDto(state0, sim.studentId, now).canStart;
  const p0 = state0.explorers.profile;
  const row = { day: day + 1, date: sim.kstDateOf(now), kind: plan.kind, route: plan.route, title: plan.title, levelUps: 0, chests: 0, blueprint: 0, bank: null, conceptFirst: null, tile: false };
  if (!canStart) { row.kind = "none"; rec.push(row); return; }
  await sim.explorerPost(table, { type: "expedition-start" }, now);
  const mission = () => sim.currentState(table).expedition?.mission;
  let steps = 0;
  if (plan.kind === "explorers") {
    let wrongOnce = day % 3 === 1;
    for (;;) {
      const st = sim.currentState(table);
      const session = st.explorers.profile.definitions.session;
      if (session.done) {
        if (session.unresolved.length) { await sim.explorerPost(table, { type: "retry-unresolved" }, now); continue; }
        row.conceptFirst = session.first;
        break;
      }
      const wrong = wrongOnce && session.index >= 3 && session.round === 0 && !session.continuation;
      const action = sim.explorerAnswer(st.explorers, wrong);
      if (wrong && action.type === "answer") wrongOnce = false;
      await sim.explorerPost(table, action, now);
      if (++steps > 400) throw new Error("개념 날이 끝나지 않는다");
    }
  } else if (plan.kind === "elementary") {
    while (mission() && mission().status !== "complete") { await sim.elementaryAttempt(table, now); if (++steps > 60) throw new Error("초등 은행 날"); }
  } else {
    while (mission() && mission().status !== "complete") { await sim.middleAttempt(table, now); if (++steps > 60) throw new Error("중등 은행 날"); }
  }
  const stMid = sim.currentState(table);
  const pMid = stMid.explorers.profile;
  const workshopStars = (pMid.workshop?.blueprintAt === row.date) ? 1 : 0;
  row.blueprint = workshopStars;
  // D-144 뒤의 코드에서는 칸을 얻을 때 «한 칸 보장»이 붙는다 — 기록은 규칙과 무관한 «지금 규칙 수입»(레벨 + 상자)으로 적고,
  // 보장은 따로 적어 제품이 준 값이 tileStarBonus(그 미션의 카드 별)와 같은지 여기서 검산한다.
  const award = stMid.expedition.awards.find((a) => a.day.date === row.date);
  row.bonus = award?.stars?.bonus ?? 0;
  row.levelUps = pMid.earned - p0.earned - workshopStars - row.bonus;
  if (award?.stars && award.stars.cards !== (plan.kind === "explorers" ? row.levelUps : 0))
    throw new Error(`${row.date}: 칸 기록의 카드 별 ${award.stars.cards} ≠ 센 레벨 별 ${row.levelUps}`);
  if (award?.stars && row.bonus !== Math.max(0, 3 - award.stars.cards))
    throw new Error(`${row.date}: 칸 보장 ${row.bonus} ≠ 3 − ${award.stars.cards}`);
  if (plan.kind !== "explorers") {
    row.bank = { ...bankFirstTry(stMid, stMid.expedition.mission), goal: stMid.expedition.mission.goal };
  }
  for (;;) {
    const st = sim.currentState(table);
    const ready = sim.cards.definitionChests(st.explorers.profile).find((c) => c.ready && !c.claimed);
    if (!ready) break;
    await sim.explorerPost(table, { type: "chest", chestId: ready.id }, now);
    row.chests++;
  }
  const st = sim.currentState(table);
  row.tile = st.expedition.awards.some((a) => a.day.date === row.date);
  row.productStars = st.explorers.profile.earned - p0.earned - row.bonus;
  const levels = Object.values(st.explorers.profile.definitions?.cards ?? {}).map((c) => c.level);
  row.collected = levels.filter((l) => l > 0).length;
  row.solid = levels.filter((l) => l >= 3).length;
  rec.push(row);
}

const result = {};
for (const [name, make] of Object.entries(personas).filter(([n]) => !process.env.PERSONAS || process.env.PERSONAS.split(",").includes(n))) {
  sim.reseed(Number(process.env.SEED ?? 20260928) + name.charCodeAt(1));
  clock.set(base);
  const table = sim.createTable(sim.serverState.parseSrsState(make()));
  const rec = [];
  for (let day = 0; day < DAYS; day++) {
    const now = new Date(base + day * DAY);
    clock.set(now.getTime());
    await runDay(table, now, day, rec);
  }
  result[name] = rec;
  console.log(`== ${name} ==`);
  for (const r of rec) console.log(`${r.day}\t${r.date}\t${r.kind}/${r.route}\t${r.title}\tlv+${r.levelUps}\t상자${r.chests}\t설계도${r.blueprint}\t${r.bank ? `은행 ${r.bank.correct}/${r.bank.answered}(목표 ${r.bank.goal})` : r.conceptFirst !== null ? `첫풀이 ${r.conceptFirst}/15` : ""}\t칸${r.tile ? "○" : "×"}\t별+${r.productStars}`);
}
clock.real();
await writeFile(resolve(out, process.env.OUT ?? (DAYS === 30 ? "econ-log.json" : `econ-log-${DAYS}.json`)), JSON.stringify(result, null, 1));
