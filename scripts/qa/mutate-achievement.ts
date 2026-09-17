/**
 * **성취 팩터(D-134 트랙 2) 가드를 하나씩 꺼 빨개지는지 본다** — 브리프 §3 «변이 하네스».
 *
 *   npx tsx scripts/qa/mutate-achievement.ts            # 전량
 *   npx tsx scripts/qa/mutate-achievement.ts ① ③       # 이름 조각으로 고른다
 *   npx tsx scripts/qa/mutate-achievement.ts --anchors  # 시험 없이 앵커만 센다(몇 초)
 *
 * ## 판정 순서 — `mutate-plan-screen.ts` 와 같다 (러너를 그 파일에서 옮겨 왔다)
 *
 *   ㉠ 음성 대조 — 변이 **전에** 대상 시험이 초록인가. 아니면 전부 판정하지 않는다.
 *   ⑴ 앵커가 정확히 하나인가 — 아니면 판정 거부.
 *   ⑵ 파일이 바뀌었나.
 *   ⑶ **산출물이 바뀌었나** — 순수 함수는 tsx 탐침을 변이 전후로 돌려 견준다. 라우트처럼
 *      모킹 없이 못 부르는 자리는 탐침이 없고(`probe: null`), 그때 초록이면 «살아남음»이
 *      아니라 **판정 보류**다(2026-08-23 «도장»).
 *   ⑷ 그제서야 시험이 빨개지나 — 실패한 시험 **이름**을 json 리포트에서 읽는다.
 *
 * 무리: ① null↔0 · ② 표본 문턱 · ③ 결시 제외 · ④ 주 경계 · ⑤ 합산 방식 ·
 *       ⑥ 재채점 중복 · ⑦ 난이도 밴드 · ⑧ 비교군 표본 · ⑨ 문장(지어냄) · ⑩ 만점 · ⑪ 관문
 *
 * 러너는 `--maxWorkers=1`. 원복은 **바이트**로 `finally` 에서, 끝나고 md5 로 대조한다.
 * **커밋한 상태에서 돌린다** — 배경 셸이 끊기면 `finally` 가 안 돌 수 있다(메모리
 * `background-kill-node-survives`) — 그러면 `git status` 로 원본을 대조한다.
 *
 * ⚠️ `rmSync` 금지(`noRmSync.test.ts`) — 임시 파일 + `unlinkSync` 만 쓴다.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.cwd();
const VITEST = path.join(ROOT, "node_modules", "vitest", "vitest.mjs");
const TSX = path.join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");
// ⚠️ 경로에 PID — 두 세션이 같이 돌면 한쪽이 지운 탐침을 다른 쪽이 못 연다.
//    이름이 `_` 로 시작해 `.gitignore` 의 `scripts/qa/_*` 에 걸린다(커밋으로 새지 않는다).
const PROBE = path.join(
  ROOT,
  "scripts",
  "qa",
  `_mutate-achievement.probe.${process.pid}.ts`,
);

const T = (name: string) => `src/__tests__/${name}`;
const FACTORS = T("unit/achievementFactors.test.ts");
const PERIOD = T("unit/achievementPeriod.test.ts");
const SENTENCES = T("unit/achievementSentences.test.ts");
const MAXSCORE = T("unit/achievementMaxScore.test.ts");
const API = T("api/achievement.test.ts");

const COLLECT_FILE = "src/lib/achievement/collect.ts";
const TYPES_FILE = "src/lib/achievement/types.ts";
const PERIOD_FILE = "src/lib/achievement/period.ts";
const SENTENCE_FILE = "src/lib/achievement/sentences.ts";
const MAXSCORE_FILE = "src/lib/achievement/maxScore.ts";
const ROUTE_FILE = "src/app/api/students/[id]/achievement/route.ts";
const CONTRACT_FILE = "src/contracts/achievement.contract.ts";

/** tsx 탐침 머리 — 시험 픽스처와 **같은 값**을 쓴다(둘이 갈리면 탐침이 딴것을 잰다). */
const PRELUDE = `
import * as c from "../../src/lib/achievement/collect";
import * as p from "../../src/lib/achievement/period";
import * as s from "../../src/lib/achievement/sentences";
import * as m from "../../src/lib/achievement/maxScore";
const U = (n: number) => ({ unitId: "u" + n, grade: "중1", chapter: n + ". 단원", section: "소단원 " + n, orderIndex: 100 + n });
const UNITS = [U(1), U(2), U(3), U(4)];
const RULE = { weekdays: [1, 3, 5], unitsPerLesson: 1, startUnitId: "u1", startDate: "2026-09-07", active: true };
const ITEMS = (unitId: string, difficulty: string, total: number, correct: number) =>
  Array.from({ length: total }, (_, i) => ({ unitId, difficulty, isCorrect: i < correct }));
const ROUND = (over: object = {}) => ({
  testId: "t1", testDate: "2026-09-10", takenAt: "2026-09-10T01:00:00.000Z",
  score: 80, maxScore: 100, absent: false, items: [], recommendedUnitIds: null, ...over,
});
const BASE = (over: object = {}) => ({
  student: { id: "s1", name: "학생", className: "반", classGrade: "중1" },
  period: { from: "2026-09-01", to: "2026-09-30" },
  progress: [], units: UNITS, plan: null, results: [],
  lectures: { targets: [], views: [] }, ...over,
});
/** 팩터 한 벌 — 인자는 BASE 의 덮개. */
const F = (over: object = {}) => c.collectAchievement(BASE(over) as never);
/** 결시 한 번 + 만점 한 번. */
const ABSENT = [
  ROUND({ testId: "t1", testDate: "2026-09-03", score: 100, maxScore: 100 }),
  ROUND({ testId: "t2", testDate: "2026-09-10", score: null, maxScore: 100, absent: true, items: ITEMS("u1", "기본", 12, 0) }),
];
/** 회차 셋 — 문항 합산 6/12(50%) vs 회차 평균 75%. */
const SUMMED = [
  ROUND({ testId: "t1", items: ITEMS("u1", "기본", 2, 2) }),
  ROUND({ testId: "t2", items: ITEMS("u1", "기본", 2, 2) }),
  ROUND({ testId: "t3", items: ITEMS("u1", "기본", 8, 2) }),
];
/** 같은 시험지에 채점 두 번(재채점). */
const REGRADED = [
  ROUND({ testId: "t1", takenAt: "2026-09-10T01:00:00.000Z", score: 20, maxScore: 100, items: ITEMS("u1", "기본", 12, 2) }),
  ROUND({ testId: "t1", takenAt: "2026-09-11T05:00:00.000Z", score: 90, maxScore: 100, items: ITEMS("u1", "기본", 12, 11) }),
];
const BANDS = (over: object = {}) => ({ 연산: null, 기본: null, 응용: null, 심화: null, ...over }) as never;
const B = (accuracy: number, total = 10) => ({ correct: Math.round((accuracy / 100) * total), total, accuracy });
void c; void p; void s; void m; void RULE; void F; void ABSENT; void SUMMED; void REGRADED; void BANDS; void B; void ITEMS; void ROUND;
`;

interface Mutation {
  name: string;
  file: string;
  from: string;
  to: string;
  /** 그 가드가 지키는 입력 하나 — 변이 전후 산출물을 견준다(⑶). 없으면 시험 이름으로만 판정. */
  probe: string | null;
  tests: string[];
}

const NL = "\n";

const MUTATIONS: Mutation[] = [
  // ── ① null ↔ 0 — 이 트랙의 축 ──────────────────────────────────────────
  {
    name: "①a 진도 0행이 «0차시»로 나온다",
    file: COLLECT_FILE,
    from: "    lessons: rows.length === 0 ? null : rows.length,",
    to: "    lessons: rows.length,",
    probe: "F().learned.lessons",
    tests: [FACTORS, API],
  },
  {
    name: "①b 진도 0행이 빈 배열로 나온다",
    file: COLLECT_FILE,
    from: "  const covered: CoveredUnit[] | null =\n    rows.length === 0\n      ? null",
    to: "  const covered: CoveredUnit[] | null =\n    rows.length === 0\n      ? []",
    probe: "F().learned.units",
    tests: [FACTORS, API],
  },
  {
    name: "①c 채점 0건이 0점·빈 표로 나온다",
    file: COLLECT_FILE,
    from: "      rounds: null,\n      absentRounds: null,\n      averagePercent: null,\n      unitAccuracy: null,\n      bandAccuracy: null,\n      reviewUnits: null,",
    to: "      rounds: [],\n      absentRounds: [],\n      averagePercent: 0,\n      unitAccuracy: { reported: [], underSampled: [] },\n      bandAccuracy: null,\n      reviewUnits: [],",
    probe: "F().scored",
    tests: [FACTORS, API],
  },
  {
    name: "①d 대상 강의 0편이 «0편 완료»로 나온다",
    file: COLLECT_FILE,
    from: "  if (targets.size === 0) return { lectures: null, homework: null };",
    to: "  if (targets.size === 0)\n    return {\n      lectures: { assigned: 0, completed: 0, averagePercent: 0 },\n      homework: null,\n    };",
    probe: "F().selfStudy",
    tests: [FACTORS, API],
  },
  {
    name: "①e 계획 없음이 «0일 밀림»으로 나온다",
    file: COLLECT_FILE,
    from: '  if (plan === null) return { days: null, gap: "계획없음" };',
    to: "  if (plan === null) return { days: 0, gap: null };",
    probe:
      'F({ progress: [{ unitId: "u1", recordedAt: "2026-09-07" }] }).learned',
    tests: [FACTORS, API],
  },
  {
    name: "①f 계획을 못 펴도 resolveDailyPlan 의 0을 그대로 낸다",
    file: COLLECT_FILE,
    from:
      '  if (plannedRun.anchoredOn !== "progress")\n' +
      '    return { days: null, gap: "차시밖" };',
    to: "  void plannedRun;",
    probe:
      'F({ plan: RULE, progress: [{ unitId: "없는차시", recordedAt: "2026-09-07" }] }).learned',
    tests: [FACTORS],
  },
  {
    name: "①g 분석 리포트 0건이 빈 배열로 나온다",
    file: COLLECT_FILE,
    from: "  if (withReport.length === 0) return null;",
    to: "  if (withReport.length === 0) return [];",
    probe: "F({ results: [ROUND()] }).scored.reviewUnits",
    tests: [FACTORS],
  },

  // ── ② 표본 문턱 — 12문항 ───────────────────────────────────────────────
  {
    name: "②a 문턱이 1로 내려간다",
    file: TYPES_FILE,
    from: "export const MIN_UNIT_PROBLEMS = 12;",
    to: "export const MIN_UNIT_PROBLEMS = 1;",
    probe:
      'F({ results: [ROUND({ items: ITEMS("u1", "기본", 11, 3) })] }).scored.unitAccuracy',
    tests: [FACTORS],
  },
  {
    name: "②b 경계가 한 칸 밀린다 (12문항이 안 열린다)",
    file: COLLECT_FILE,
    from: "    if (tally.total >= MIN_UNIT_PROBLEMS) {",
    to: "    if (tally.total > MIN_UNIT_PROBLEMS) {",
    probe:
      'F({ results: [ROUND({ items: ITEMS("u1", "기본", 12, 3) })] }).scored.unitAccuracy',
    tests: [FACTORS],
  },
  {
    name: "②c 표본 부족 단원을 **숨긴다** («표본 부족»으로 안 낸다)",
    file: COLLECT_FILE,
    from: "      underSampled.push({\n        ...ref,\n        total: tally.total,\n        needed: MIN_UNIT_PROBLEMS,\n      });",
    to: "      void ref;",
    probe:
      'F({ results: [ROUND({ items: ITEMS("u1", "기본", 11, 3) })] }).scored.unitAccuracy',
    tests: [FACTORS],
  },

  // ── ③ 결시 제외 ────────────────────────────────────────────────────────
  {
    name: "③a 결시가 응시 회차에 섞인다",
    file: COLLECT_FILE,
    from: "  const taken = rows.filter((r) => !r.absent).sort(byDate);",
    to: "  const taken = [...rows].sort(byDate);",
    probe: "F({ results: ABSENT }).scored",
    tests: [FACTORS],
  },
  {
    /**
     * 🔴 **탐침을 비교군에 건다.** 본인 회차 쪽은 `scorePercentOf(taken)` 로 들어가는데
     * `taken` 이 이미 결시를 뺀 뒤라, 이 함수 안의 `r.absent` 갈래는 그 길에서 **죽은 줄**이다
     * (첫 회차에 탐침을 본인 쪽에 걸었더니 «산출물이 그대로»가 나왔다 — 가드가 없는 게 아니라
     * **재는 자리가 틀렸던 것**이다). 살아 있는 자리는 비교군이다 — 거기는 결시가 섞인
     * 원본 회차를 그대로 넘긴다.
     */
    name: "③b 결시가 0점으로 평균에 실린다 (비교군)",
    file: COLLECT_FILE,
    from: "    if (r.absent || r.score === null || r.maxScore === null || r.maxScore <= 0)\n      continue;",
    to: "    if (r.maxScore === null || r.maxScore <= 0) continue;\n    if (r.score === null) {\n      full += r.maxScore;\n      continue;\n    }",
    probe:
      'F({ comparison: { kind: "반평균", students: [{ id: "a", progress: [], results: ABSENT }] } }).comparison',
    tests: [FACTORS],
  },

  // ── ④ 주 경계 — 월요일 00:00 (KST) ─────────────────────────────────────
  {
    name: "④a 주가 일요일에 시작한다",
    file: PERIOD_FILE,
    from: "export const WEEK_START_WEEKDAY = 1;",
    to: "export const WEEK_START_WEEKDAY = 0;",
    probe: 'p.startOfWeek("2026-09-20")',
    tests: [PERIOD],
  },
  {
    name: "④b 주 경계를 KST 가 아니라 UTC 로 읽는다",
    file: PERIOD_FILE,
    from: "export function kstWeekOf(at: Date): string {\n  return startOfWeek(kstDateOf(at));\n}",
    to: "export function kstWeekOf(at: Date): string {\n  return startOfWeek(at.toISOString().slice(0, 10));\n}",
    probe: 'p.kstWeekOf(new Date("2026-09-20T15:00:00.000Z"))',
    tests: [PERIOD],
  },
  {
    name: "④c 직전 기간이 같은 길이가 아니다",
    file: PERIOD_FILE,
    from: "  const len = periodDays(period);\n  const to = addDays(period.from, -1);\n  return { from: addDays(to, -(len - 1)), to };",
    to: "  const to = addDays(period.from, -1);\n  return { from: addDays(to, -6), to };",
    probe: 'p.previousPeriod({ from: "2026-09-14", to: "2026-09-27" })',
    tests: [PERIOD, FACTORS],
  },

  // ── ⑤ 합산 방식 — 문항 합산이지 회차 평균이 아니다 ────────────────────
  {
    name: "⑤a 평균 점수가 회차 평균이 된다",
    file: COLLECT_FILE,
    from: "    earned += r.score;\n    full += r.maxScore;",
    to: "    earned += (r.score / r.maxScore) * 100;\n    full += 100;",
    probe:
      'F({ results: [ROUND({ testId: "t1", score: 10, maxScore: 10 }), ROUND({ testId: "t2", score: 50, maxScore: 100 })] }).scored.averagePercent',
    tests: [FACTORS],
  },
  {
    name: "⑤b 단원 합산이 첫 회차만 센다",
    file: COLLECT_FILE,
    from: "  for (const r of taken) {\n    for (const it of r.items) {",
    to: "  for (const r of taken.slice(0, 1)) {\n    for (const it of r.items) {",
    probe: "F({ results: SUMMED }).scored.unitAccuracy",
    tests: [FACTORS],
  },

  // ── ⑥ 재채점 — 한 회차는 마지막 하나만 ─────────────────────────────────
  {
    name: "⑥a 재채점이 두 번 실린다",
    file: COLLECT_FILE,
    from: "  const rows = latestPerTest(\n    results.filter((r) => withinPeriod(period, r.testDate)),\n  );",
    to: "  const rows = results.filter((r) => withinPeriod(period, r.testDate));",
    probe: "F({ results: REGRADED }).scored",
    tests: [FACTORS],
  },

  // ── ⑦ 난이도 4단 ───────────────────────────────────────────────────────
  {
    name: "⑦a 심화 세 갈래가 «심화» 밴드에서 사라진다",
    file: TYPES_FILE,
    from:
      '  return difficulty.startsWith("심화")\n' +
      '    ? "심화"\n' +
      "    : (difficulty as AchievementBand);",
    to: "  return difficulty as AchievementBand;",
    probe:
      'F({ results: [ROUND({ items: ITEMS("u1", "심화중", 4, 2) })] }).scored.bandAccuracy',
    tests: [FACTORS],
  },
  {
    name: "⑦b 문항 0인 밴드가 0% 로 나온다",
    file: COLLECT_FILE,
    from: "      const value: BandAccuracy | null =\n        tally && tally.total > 0",
    to: "      const value: BandAccuracy | null =\n        tally || true",
    probe:
      'F({ results: [ROUND({ items: ITEMS("u1", "기본", 12, 6) })] }).scored.bandAccuracy',
    tests: [FACTORS],
  },

  // ── ⑧ 비교군 — 표본 수를 같이 낸다 ─────────────────────────────────────
  {
    name: "⑧a 평균의 분모가 «값이 있는 사람»이 아니라 전원이 된다",
    file: COLLECT_FILE,
    from: "  return { value: round1(sum / known.length), sample: known.length };",
    to: "  return { value: round1(sum / known.length), sample: values.length };",
    probe:
      'F({ comparison: { kind: "반평균", students: [{ id: "a", progress: [{ unitId: "u1", recordedAt: "2026-09-07" }], results: [] }, { id: "b", progress: [], results: [] }] } }).comparison',
    tests: [FACTORS],
  },
  {
    name: "⑧b 반 표본 수가 1로 굳는다",
    file: COLLECT_FILE,
    from: "    sampleSize: request.students.length,",
    to: "    sampleSize: 1,",
    probe:
      'F({ comparison: { kind: "반평균", students: [{ id: "a", progress: [], results: [] }, { id: "b", progress: [], results: [] }] } }).comparison',
    tests: [FACTORS, API],
  },
  {
    name: "⑧c 비교군 기본값이 «미사용»이 아니게 된다",
    file: COLLECT_FILE,
    from: '  if (request === undefined || request.kind === "미사용") return null;',
    to: '  if (request === undefined) return { kind: "지난기간", sampleSize: 1, lessons: { value: null, sample: 0 }, averagePercent: { value: null, sample: 0 } };\n  if (request.kind === "미사용") return null;',
    probe: "F().comparison",
    tests: [FACTORS],
  },

  // ── ⑨ 문장 — 말할 수 없으면 말하지 않는다 ──────────────────────────────
  {
    name: "⑨a 근거가 어중간한데 문장을 지어낸다",
    file: SENTENCE_FILE,
    from: "  if (weak !== null) return `${weak}부터 많이 어려워합니다.`;\n  return null;",
    to: '  if (weak !== null) return `${weak}부터 많이 어려워합니다.`;\n  return "전체적으로 잘하고 있습니다.";',
    probe: "s.bandSentence(BANDS({ 연산: B(60), 기본: B(55) }))",
    tests: [SENTENCES],
  },
  {
    name: "⑨b 못 잰 밀림을 «계획대로»라고 말한다",
    file: SENTENCE_FILE,
    from: "  if (days === null) return null;",
    to: '  if (days === null) return "계획한 진도대로 나가고 있습니다.";',
    probe: "s.driftSentence(null)",
    tests: [SENTENCES],
  },
  {
    name: "⑨c 사다리를 거꾸로 읽는다",
    file: SENTENCE_FILE,
    from: "  let solid: AchievementBand | null = null;\n  for (const band of measured) {",
    to: "  let solid: AchievementBand | null = null;\n  for (const band of [...measured].reverse()) {",
    probe:
      "s.bandSentence(BANDS({ 연산: B(95), 기본: B(88), 응용: B(40), 심화: B(20) }))",
    tests: [SENTENCES],
  },

  // ── ⑩ 만점 — 채점기와 같은 규칙 ────────────────────────────────────────
  {
    name: "⑩a 문항이 없는 시험지의 만점이 0점이 된다",
    file: MAXSCORE_FILE,
    from: "  if (problems.length === 0) return null;",
    to: "  if (problems.length === 0) return 0;",
    probe: "m.testMaxScore([])",
    tests: [MAXSCORE],
  },
  {
    name: "⑩b 조정 배점을 무시한다 (채점기와 갈린다)",
    file: MAXSCORE_FILE,
    from: "    (acc, p) => acc + round2(p.adjustedScore ?? p.score ?? equalShare),",
    to: "    (acc, p) => acc + round2(p.score ?? equalShare),",
    probe:
      "m.testMaxScore([{ adjustedScore: 25, score: 3.5 }, { adjustedScore: 25, score: 3.5 }, { adjustedScore: 25, score: null }, { adjustedScore: 25, score: null }])",
    tests: [MAXSCORE],
  },

  // ── ⑪ 관문 — 소유 범위 · 기간 · strict ────────────────────────────────
  {
    name: "⑪a 소유 범위를 안 묻는다 (남의 반 학생이 열린다)",
    file: ROUTE_FILE,
    from: "  const owned = await requireOwnedStudent(id, session);\n  if (!owned.ok) return owned.response;",
    to: "  await requireOwnedStudent(id, session);",
    probe: null,
    tests: [API],
  },
  {
    name: "⑪b 뒤집힌 기간을 받아 준다",
    file: CONTRACT_FILE,
    from: "  .refine((q) => q.from <= q.to, {",
    to: "  .refine(() => true, {",
    probe: null,
    tests: [API],
  },
  {
    name: "⑪c 질의 계약이 strict 가 아니게 된다",
    file: CONTRACT_FILE,
    from: "export const achievementQuerySchema = z\n  .strictObject({",
    to: "export const achievementQuerySchema = z\n  .object({",
    probe: null,
    tests: [API],
  },
];

const md5 = (buffer: Buffer) =>
  createHash("md5").update(buffer).digest("hex").slice(0, 12);

/** ⚠️ `rmSync` 금지 — 파일 하나씩 `unlinkSync`. */
function removeFile(file: string) {
  if (existsSync(file)) unlinkSync(file);
}

let tempSeq = 0;
function tempFile(prefix: string, ext: string): string {
  const file = path.join(
    os.tmpdir(),
    `${prefix}${process.pid}-${++tempSeq}${ext}`,
  );
  removeFile(file);
  return file;
}

function tsxProbe(expr: string): string | null {
  writeFileSync(
    PROBE,
    `${PRELUDE}\n(async () => { console.log(JSON.stringify(await (${expr}))); })()` +
      `.catch((e) => { console.log(JSON.stringify({ error: String(e && e.message) })); });\n`,
    "utf8",
  );
  try {
    const r = spawnSync(process.execPath, [TSX, PROBE], {
      cwd: ROOT,
      encoding: "utf8",
    });
    return r.status === 0 ? r.stdout.trim() : null;
  } finally {
    removeFile(PROBE);
  }
}

/** 시험을 돌려 (종료 코드, 실패한 시험 이름들) — 이름은 json 리포트에서 읽는다. */
function runTests(files: string[]): {
  code: number;
  failed: string[];
  readable: boolean;
} {
  const out = tempFile("mutate-achievement-", ".json");
  try {
    const r = spawnSync(
      process.execPath,
      [
        VITEST,
        "run",
        ...files,
        "--maxWorkers=1",
        "--reporter=json",
        `--outputFile.json=${out}`,
      ],
      { cwd: ROOT, encoding: "utf8" },
    );
    let report: {
      testResults?: {
        assertionResults?: { status: string; fullName: string }[];
      }[];
    } | null = null;
    try {
      report = JSON.parse(readFileSync(out, "utf8"));
    } catch {
      report = null;
    }
    const failed = (report?.testResults ?? []).flatMap((t) =>
      (t.assertionResults ?? [])
        .filter((a) => a.status === "failed")
        .map((a) => a.fullName),
    );
    return { code: r.status ?? 1, failed, readable: report !== null };
  } finally {
    removeFile(out);
  }
}

type Verdict = "RED" | "GREEN" | "HOLD" | "REFUSE";

function main(): number {
  const needles = process.argv.slice(2).filter((a) => a !== "--anchors");

  // `--anchors` — 시험 없이 앵커만. 코드가 움직였을 때 전량 판정 전에 몇 초로 확인한다.
  if (process.argv.includes("--anchors")) {
    let bad = 0;
    for (const m of MUTATIONS) {
      const text = readFileSync(m.file, "utf8");
      const eol = text.includes("\r\n") ? "\r\n" : NL;
      const count = text.split(m.from.split(NL).join(eol)).length - 1;
      if (count !== 1) {
        bad += 1;
        console.log(`  ⛔ 앵커 ${count}개 — ${m.name}  (${m.file})`);
      }
    }
    console.log(
      bad === 0
        ? `  앵커 ${MUTATIONS.length}개 전부 정확히 하나 ✓`
        : `  🔴 앵커가 어긋난 변이 ${bad}개`,
    );
    return bad === 0 ? 0 : 1;
  }

  const picked =
    needles.length > 0
      ? MUTATIONS.filter((m) => needles.some((n) => m.name.includes(n)))
      : MUTATIONS;
  if (picked.length === 0) {
    console.log(`«${needles.join(" · ")}» 과 맞는 변이가 없다`);
    return 2;
  }

  // ㉠ 음성 대조 — 대상 시험 전부가 변이 전에 초록이어야 한다.
  const allTests = [...new Set(picked.flatMap((m) => m.tests))];
  const base = runTests(allTests);
  if (base.code !== 0 || !base.readable) {
    console.log(
      `⛔ 기준 시험이 초록이 아니다(종료 ${base.code}, 리포트 ${base.readable ? "읽음" : "못 읽음"}) — 판정하지 않는다`,
    );
    for (const f of base.failed.slice(0, 8)) console.log(`   ↳ ${f}`);
    return 3;
  }
  console.log(`기준 시험: 초록 (음성 대조 — ${allTests.length}파일)`);

  const originals = new Map<string, Buffer>();
  for (const f of new Set(picked.map((m) => m.file)))
    originals.set(f, readFileSync(f));

  const results: {
    name: string;
    verdict: Verdict;
    why: string;
    failed: string[];
  }[] = [];
  try {
    for (const [i, m] of picked.entries()) {
      const orig = originals.get(m.file)!;
      const text = orig.toString("utf8");
      const eol = text.includes("\r\n") ? "\r\n" : NL;
      const from = m.from.split(NL).join(eol);
      const to = m.to.split(NL).join(eol);
      const tag = `${String(i + 1).padStart(2)}/${picked.length}`;
      let verdict: Verdict = "REFUSE";
      let why = "";
      let failed: string[] = [];

      const count = text.split(from).length - 1;
      if (count !== 1) {
        why = `⑴ 앵커가 ${count}개다 — 코드가 움직였다`;
      } else {
        const before = m.probe ? tsxProbe(m.probe) : null;
        writeFileSync(m.file, text.replace(from, to), "utf8");
        try {
          if (md5(readFileSync(m.file)) === md5(orig)) {
            why = "⑵ 파일이 안 바뀌었다";
          } else {
            const after = m.probe ? tsxProbe(m.probe) : null;
            const short = (s: string) =>
              s.length > 90 ? `${s.slice(0, 87)}...` : s;
            if (m.probe && (before === null || after === null)) {
              why = `⑶ 탐침 산출물을 못 얻었다(전 ${before === null ? "실패" : "성공"} · 후 ${after === null ? "실패" : "성공"})`;
            } else if (m.probe && before === after) {
              why = `⑶ 산출물이 그대로다 — 뜻이 안 바뀌었다 (${before})`;
            } else {
              const change = m.probe
                ? `산출물 ${short(before!)} → ${short(after!)}`
                : "(탐침 없음 — 시험 이름으로 판정)";
              const r = runTests(m.tests);
              failed = r.failed;
              if (r.code !== 0 && r.failed.length > 0) {
                verdict = "RED";
                why = change;
              } else if (r.code !== 0) {
                why = "⑷ 빨간데 실패한 시험을 못 댄다 — 러너가 안 떴을 수 있다";
              } else if (m.probe) {
                verdict = "GREEN";
                why = `${change} 인데 시험이 초록`;
              } else {
                verdict = "HOLD";
                why =
                  "탐침 없이 초록 — 변이가 뜻을 안 바꿨는지 가드가 없는지 못 가른다";
              }
            }
          }
        } finally {
          writeFileSync(m.file, orig);
        }
      }
      results.push({ name: m.name, verdict, why, failed });
      const mark = {
        RED: "🟥 빨개짐",
        GREEN: "🟩 살아남음(가드 아님)",
        HOLD: "🟨 판정 보류",
        REFUSE: "⛔ 판정 거부",
      }[verdict];
      console.log(`  ${tag} ${mark}  ${m.name}`);
      console.log(`        ${why}`);
      for (const f of failed.slice(0, 3)) console.log(`        ↳ ${f}`);
    }
  } finally {
    for (const [f, b] of originals) writeFileSync(f, b);
  }

  let restored = true;
  for (const [f, b] of originals) {
    if (md5(readFileSync(f)) !== md5(b)) {
      restored = false;
      console.log(`🔴 복구 실패 — ${f}`);
    }
  }

  const count = (v: Verdict) => results.filter((r) => r.verdict === v).length;
  console.log("");
  console.log(
    `  빨개짐 ${count("RED")}/${results.length} · 살아남음 ${count("GREEN")} · 보류 ${count("HOLD")} · 판정 거부 ${count("REFUSE")}`,
  );
  for (const r of results.filter((x) => x.verdict !== "RED"))
    console.log(`    ${r.verdict} ${r.name} — ${r.why}`);
  console.log(
    restored
      ? "  변이한 파일 전부 원본과 일치 ✓"
      : "  🔴 원본과 다른 파일이 있다 — 손으로 확인하라",
  );
  return restored && count("RED") === results.length ? 0 : 1;
}

process.exitCode = main();
