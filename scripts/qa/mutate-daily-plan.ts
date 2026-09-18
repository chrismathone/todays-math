/**
 * **매일 자동 출제(D-129) 가드를 하나씩 꺼 빨개지는지 본다** —
 * 브리프 `tracks/briefs/daily-auto-test-backend.md` §3 «변이 하네스».
 *
 *   npx tsx scripts/qa/mutate-daily-plan.ts          # 전량
 *   npx tsx scripts/qa/mutate-daily-plan.ts ① ⑥     # 이름 조각으로 고른다(여럿이면 어느 하나라도)
 *
 * ## 판정 순서 — `mutate-learn-screens.ts` 와 같다 (20번 교훈 2026-08-20·08-21·08-23)
 *
 *   ㉠ 음성 대조 — 변이 **전에** 대상 시험이 초록인가. 아니면 전부 판정하지 않는다.
 *   ⑴ 앵커가 정확히 하나인가 — 아니면 판정 거부.
 *   ⑵ 파일이 바뀌었나.
 *   ⑶ **산출물이 바뀌었나** — 순수 함수 가드는 tsx 탐침을 변이 전후로 돌려 견준다. 라우트·Prisma 판처럼
 *      모킹 없이 부를 수 없는 자리는 탐침이 없다(`probe: null`) — 그때는 ⑷ 의 시험 **이름**으로만
 *      빨강을 판정하고, 초록이면 «살아남음»이 아니라 **판정 보류**로 둔다.
 *   ⑷ 그제서야 시험이 빨개지나 — 실패한 시험 **이름**을 json 리포트에서 읽는다(2026-08-23 «도장»).
 *
 * 러너는 `--maxWorkers=1` — 이 기계는 다른 오르카 세션과 메모리를 나눠 쓴다. 원복은 **바이트**로 `finally` 에서,
 * 끝나고 md5 로 대조한다. **커밋한 상태에서 돌린다** — 배경 셸이 «메모리 부족»으로 끊기면 `finally` 가 안 돌 수 있다
 * (메모리 `background-kill-node-survives`) — 그러면 `git status` 로 원본을 대조한다.
 *
 * ⚠️ `rmSync` 금지(`noRmSync.test.ts`) — 임시 파일 + `unlinkSync` 만 쓴다.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.cwd();
const VITEST = path.join(ROOT, "node_modules", "vitest", "vitest.mjs");
const TSX = path.join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");
// ⚠️ 경로에 PID — 두 세션이 같이 돌면 한쪽이 지운 탐침을 다른 쪽이 못 연다
const PROBE = path.join(
  ROOT,
  "scripts",
  "qa",
  `.mutate-daily-plan.probe.${process.pid}.ts`,
);

const T = (name: string) => `src/__tests__/${name}`;
const PLAN = T("unit/progressPlan.test.ts");
const REVIEW = T("unit/planDailyReview.test.ts");
const RESOLVER = T("unit/progressResolver.test.ts");
const CRON = T("api/autoDraftCron.test.ts");
const DAILY = T("api/dailyReview.test.ts");
const CAP = T("unit/draftCapacity.test.ts");
const BOUND = T("unit/teachableBoundary.test.ts");
const SCHED = T("unit/planSchedule.test.ts");
const PLAN_API = T("api/progressPlan.test.ts");

const PLAN_FILE = "src/lib/daily/progressPlan.ts";
const REVIEW_FILE = "src/lib/daily/planDailyReview.ts";
const RESOLVER_FILE = "src/lib/progressResolver.ts";
const RUN_FILE = "src/lib/tests/runAutoDraft.ts";
const OWNER_FILE = "src/lib/tests/autoDraftOwner.ts";
const CRON_ROUTE = "src/app/api/tests/auto-draft/cron/route.ts";
const DAILY_ROUTE = "src/app/api/tests/daily-review/route.ts";
const DOUBLE_FILE = "src/mocks/prismaTestDouble.ts";
const CAP_FILE = "src/lib/tests/draftCapacity.ts";
const BOUND_FILE = "src/lib/daily/teachableBoundary.ts";
const SCHED_FILE = "src/lib/daily/planSchedule.ts";
const STORE_FILE = "src/lib/daily/progressPlanStore.ts";

/** tsx 탐침 머리 — 모든 tsx 탐침이 이 이름들을 쓴다 */
const PRELUDE = `
import * as pp from "../../src/lib/daily/progressPlan";
import * as pdr from "../../src/lib/daily/planDailyReview";
import * as pr from "../../src/lib/progressResolver";
/** 교육과정 열 차시 — 대단원이 둘이라 D-63 제한도 같이 겨눌 수 있다 */
const UNITS = Array.from({ length: 10 }, (_, i) => ({
  id: "u" + (i + 1),
  orderIndex: 100 + i,
  grade: "중2",
  chapter: i < 2 ? "2. 부등식" : "3. 방정식",
  section: "s" + (i + 1),
}));
/** 월·수·금, 2026-09-07(월) 시작, 한 수업 한 차시 */
const MWF = { weekdays: [1, 3, 5], unitsPerLesson: 1, startUnitId: "u1", startDate: "2026-09-07", active: true };
const R = (day: string, over: object = {}, actual: { unitId: string; recordedAt: string } | null = null) =>
  pp.resolveDailyPlan({ rule: { ...MWF, ...over }, units: UNITS, day, actual });
/** 2026-08-21 은 금요일 — 아래 계획은 그 날을 겨눈다 */
const PLAN_ROW = (over: object = {}) => ({
  classId: "c1", studentId: null, weekdays: [5], unitsPerLesson: 1,
  startUnitId: "u1", startDate: "2026-08-14", active: true, ...over,
});
const STU = (over: object = {}) => ({
  id: "s1", name: "학생가", classId: "c1", className: "c", classGrade: "중2",
  defaultProblemCount: 8, schoolLevel: "중", schoolGrade: 2,
  useIndividualProgress: true, lastReportDate: null, lastReportText: null, ...over,
});
const ROW = (studentId: string | null, unitId: string, recordedAt: string) => ({
  classId: "c1", studentId, unitId, recordedAt, createdAt: recordedAt + "T10:00:00Z",
});
const DR = (over: object = {}) =>
  pdr.planDailyReview({
    day: "2026-08-21", students: [STU()], progressRows: [], lastReviews: [],
    units: UNITS, plans: [PLAN_ROW()], ...over,
  });
void pp; void pdr; void pr; void UNITS; void MWF; void R; void PLAN_ROW; void STU; void ROW; void DR;
`;

interface Mutation {
  name: string;
  file: string;
  from: string;
  to: string;
  /** 그 가드가 지키는 입력 하나 — 변이 전후 산출물을 견준다(⑶). 없으면 시험 이름으로만 판정 */
  probe: string | null;
  tests: string[];
}

const NL = "\n";
const L = (...lines: string[]) => lines.join(NL);

const MUTATIONS: Mutation[] = [
  // ── ① 날짜 펴기 — 요일·차시 수·시작일·교육과정 끝 ─────────────────────────
  {
    name: "①a 수업 요일을 안 본다 (요일이 아닌 날도 수업일이 된다)",
    file: PLAN_FILE,
    from: "    day === anchorDate || (day > anchorDate && weekdays.has(weekdayOf(day)));",
    to: "    day === anchorDate || day > anchorDate;",
    probe: 'R("2026-09-17").lessonToday',
    tests: [PLAN, REVIEW],
  },
  {
    name: "①b 한 수업당 차시 수를 무시한다 (두 차시 반이 한 차시씩 간다)",
    file: PLAN_FILE,
    from: "  const wanted = anchorIdx + lessonsAfter * per;",
    to: "  const wanted = anchorIdx + lessonsAfter;",
    probe: 'R("2026-09-09", { unitsPerLesson: 2 }).endUnitId',
    tests: [PLAN],
  },
  {
    name: "①c 시작일 **이후 첫 수업일**이 아니라 시작일부터 센다",
    file: PLAN_FILE,
    from: "  const firstLesson = nthLessonDay(weekdays, rule.startDate, 1);",
    to: "  const firstLesson: string | null = rule.startDate;",
    probe: 'R("2026-09-08", { startDate: "2026-09-08" }).lessonToday',
    tests: [PLAN],
  },
  {
    name: "①d 계획 시작 전인데 첫 차시를 낸다",
    file: PLAN_FILE,
    from: L(
      "  if (day < anchorDate)",
      "    return {",
      "      ...NO_LESSON,",
      "      anchoredOn,",
      '      endUnitId: anchoredOn === "progress" ? actual!.unitId : null,',
      "      driftDays,",
      "    };",
      "",
    ),
    to: "",
    probe: 'R("2026-09-04").endUnitId',
    tests: [PLAN],
  },
  {
    name: "①e 교육과정 끝에 닿은 것을 말하지 않는다",
    file: PLAN_FILE,
    from: "    atCurriculumEnd: wanted > lastIdx,",
    to: "    atCurriculumEnd: false,",
    probe: 'R("2026-11-30").atCurriculumEnd',
    tests: [PLAN],
  },
  {
    name: "①f 꺼 둔 계획도 돈다",
    file: PLAN_FILE,
    from: "  if (!rule.active || weekdays.size === 0) return NO_LESSON;",
    to: "  if (weekdays.size === 0) return NO_LESSON;",
    probe: 'R("2026-09-16", { active: false }).lessonToday',
    tests: [PLAN, REVIEW],
  },
  {
    name: "①g 주 단위 셈이 나머지 날을 안 센다 (온 주만 세고 끝을 버린다)",
    file: PLAN_FILE,
    from: "  for (let i = 0; i < total % 7; i += 1)",
    to: "  for (let i = 0; i < 0; i += 1)",
    probe: 'R("2026-09-16").endUnitId',
    tests: [PLAN],
  },

  // ── ② 실제가 이긴다 (D-129 ⑵) ───────────────────────────────────────────
  {
    name: "②a 진도 기록을 무시하고 계획만 편다 (실제가 안 이긴다)",
    file: PLAN_FILE,
    from: '    actual && actualIdx !== undefined ? "progress" : "plan";',
    to: '    "plan";',
    probe:
      'R("2026-09-16", {}, { unitId: "u8", recordedAt: "2026-09-14" }).endUnitId',
    tests: [PLAN, REVIEW],
  },
  {
    name: "②b 단원 목록 밖 차시를 0번째로 읽는다",
    file: PLAN_FILE,
    from: "  const actualIdx = actual ? indexById.get(actual.unitId) : undefined;",
    to: "  const actualIdx = actual ? (indexById.get(actual.unitId) ?? 0) : undefined;",
    probe:
      'R("2026-09-16", {}, { unitId: "없는차시", recordedAt: "2026-09-14" }).endUnitId',
    tests: [PLAN],
  },
  {
    name: "②c 진도를 적은 날은 수업이 없었다고 본다 (보강이 사라진다)",
    file: PLAN_FILE,
    from: "    day === anchorDate || (day > anchorDate && weekdays.has(weekdayOf(day)));",
    to: "    day > anchorDate && weekdays.has(weekdayOf(day));",
    probe:
      'R("2026-09-17", {}, { unitId: "u6", recordedAt: "2026-09-17" }).lessonToday',
    tests: [PLAN],
  },

  // ── ③ 밀림·앞섬(일 수) ─────────────────────────────────────────────────
  {
    name: "③a 밀림을 아예 안 잰다 (늘 0일)",
    file: PLAN_FILE,
    from: "      driftDays = diffDays(actual.recordedAt, plannedDate);",
    to: "      driftDays = 0;",
    probe:
      'R("2026-09-16", {}, { unitId: "u2", recordedAt: "2026-09-14" }).driftDays',
    tests: [PLAN],
  },
  {
    name: "③b 밀림과 앞섬의 부호가 뒤집힌다",
    file: PLAN_FILE,
    from: "      driftDays = diffDays(actual.recordedAt, plannedDate);",
    to: "      driftDays = diffDays(plannedDate, actual.recordedAt);",
    probe:
      'R("2026-09-16", {}, { unitId: "u8", recordedAt: "2026-09-14" }).driftDays',
    tests: [PLAN],
  },
  {
    name: "③c 계획을 거꾸로 못 편다 (시작 차시보다 앞이면 «못 잰다»)",
    file: PLAN_FILE,
    from: "  let day = addDays(startDate, -1);\n  let seen = 1;",
    to: "  return null;\n  let day = addDays(startDate, -1);\n  let seen = 1;",
    probe:
      'R("2026-09-16", { startUnitId: "u5" }, { unitId: "u3", recordedAt: "2026-09-14" }).driftDays',
    tests: [PLAN],
  },

  // ── ④ 학생 계획이 반 계획을 덮는 조건 ───────────────────────────────────
  {
    name: "④a 개별 진도가 아닌 학생도 학생 계획을 쓴다",
    file: PLAN_FILE,
    from: "  if (useIndividualProgress && studentPlan !== null) return studentPlan;",
    to: "  if (studentPlan !== null) return studentPlan;",
    probe:
      'pp.pickProgressPlan({ classPlan: "반", studentPlan: "학생", useIndividualProgress: false })',
    tests: [PLAN, REVIEW],
  },
  {
    name: "④b 적용 이력 판정이 개별 진도 여부를 안 본다",
    file: RESOLVER_FILE,
    from: L(
      "  if (useIndividualProgress && studentProgress.length > 0)",
      "    return studentProgress;",
    ),
    to: "  if (studentProgress.length > 0) return studentProgress;",
    probe:
      'pr.applicableProgress({ classProgress: [ROW(null, "u5", "2026-08-21")], studentProgress: [ROW("s1", "u2", "2026-08-20")], useIndividualProgress: false }).map((r) => r.unitId)',
    tests: [RESOLVER, REVIEW],
  },

  // ── ⑤ 대상 넓히기 배선 (planDailyReview) ────────────────────────────────
  {
    name: "⑤a 계획을 대상 판정에서 뺀다 (보고서 있는 학생만 남는다)",
    file: REVIEW_FILE,
    from: "    if (!reportToday && !lessonToday) continue;",
    to: "    if (!reportToday) continue;",
    probe: "DR().attended",
    tests: [REVIEW, DAILY, CRON],
  },
  {
    name: "⑤b D-64 가 계획에 밀린다 (시험기간 학생에게도 시험이 나간다)",
    file: REVIEW_FILE,
    from: "    if (reportToday && !applicable.some((r) => r.recordedAt === day)) {",
    to: "    if (!lessonToday && !applicable.some((r) => r.recordedAt === day)) {",
    probe:
      'DR({ students: [STU({ lastReportDate: "2026-08-21", lastReportText: "수학 내신대비" })] }).examOrUnread.length',
    tests: [REVIEW],
  },
  {
    name: "⑤c 계획의 시작 차시를 이력에 안 넣는다 (새 학생이 한 차시 범위로 떨어진다)",
    file: REVIEW_FILE,
    from: "        ...(rule ? [rule.startUnitId] : []),",
    to: "        ...[],",
    probe:
      "DR().groups.map((g) => g.rangeStartUnitId + '~' + g.rangeEndUnitId)",
    tests: [REVIEW],
  },
  {
    name: "⑤d 계획이 낸 차시 대신 늘 현재 진도를 범위 끝으로 쓴다",
    file: REVIEW_FILE,
    from: L(
      "    const endUnitId = lessonToday",
      "      ? planned!.endUnitId",
      "      : (current?.unitId ?? null);",
    ),
    to: "    const endUnitId = current?.unitId ?? null;",
    probe: "DR().groups.map((g) => g.rangeEndUnitId)",
    tests: [REVIEW, CRON],
  },

  // ── ⑥ 자동 초안 회차 (runAutoDraft · cron) ─────────────────────────────
  {
    name: "⑥a 중복 금지를 끈다 (같은 날 두 번 돌면 두 장)",
    file: RUN_FILE,
    from: "      if (alreadyToday.has(st.id)) {",
    to: "      if (false) {",
    probe: null,
    tests: [CRON],
  },
  {
    name: "⑥b 문항이 모자라도 만든다",
    file: RUN_FILE,
    // 2026-09-18 — 문지기가 행 수(`poolTotal >= neededCount`)에서 갈래 − 최근 출제로 바뀌었다
    from: "      if (draftCapacityOf(capacityRows, recent) < cls.defaultProblemCount) {",
    to: "      if (false) {",
    probe: null,
    tests: [CRON],
  },
  {
    name: "⑥c 소유자의 반만 도는 것을 끈다 (남의 반까지 출제한다)",
    file: RUN_FILE,
    // D-130 이후 소유 범위 헬퍼를 부른다 — 관리자 쪽 두 방향은 `mutate-admin-scope.ts` ⑨ 가 본다
    from: "    where: ownedRowsWhere(owner),",
    to: "    where: {},",
    probe: null,
    tests: [CRON],
  },
  {
    // D-133 뒤 — 회차 행은 **먼저** 선다(합계 0 → 끝에서 고쳐 쓴다). 행을 안 만들고 가짜 id 로 달리게 한다.
    name: "⑥d 회차 기록을 안 남긴다",
    file: RUN_FILE,
    from: L(
      "  const run = await db.autoDraftRun.create({",
      "    data: { day: dayDate(day), targets: 0, created: 0, skipped: 0, skips: [] },",
      "  });",
    ),
    to: '  const run = { id: "00000000-0000-4000-8000-000000000000" };',
    probe: null,
    tests: [CRON],
  },
  {
    name: "⑥e 건너뛴 까닭을 안 남긴다 (합계만 남는다)",
    file: RUN_FILE,
    // D-133 뒤 — 합계는 `totalsOf` 한 곳에서 회차 행·응답에 같이 실린다
    from: "  skips: tally.skips,",
    to: "  skips: [] as AutoDraftSkip[],",
    probe: null,
    tests: [CRON],
  },
  {
    name: "⑥f 소유자를 못 찾아도 그냥 돈다 (조용한 0건)",
    file: CRON_ROUTE,
    from: '  if (!resolved.ok) return jsonError("INTERNAL_ERROR", resolved.message, 503);\n',
    to: "",
    probe: null,
    tests: [CRON],
  },
  {
    name: "⑥g 소유자 환경변수가 비어도 아무 계정이나 찾는다",
    file: OWNER_FILE,
    from: L(
      "  if (!email)",
      "    return {",
      "      ok: false,",
      "      message:",
      '        "AUTO_DRAFT_OWNER_EMAIL 이 설정되지 않았습니다. 자동 출제를 돌릴 원장 계정을 지정해야 합니다.",',
      "    };",
      "",
    ),
    to: "",
    probe: null,
    tests: [CRON],
  },
  {
    name: "⑥h cron 시크릿 문지기를 끈다",
    file: CRON_ROUTE,
    from: '  if (request.headers.get("authorization") !== `Bearer ${secret}`)',
    to: "  if (false)",
    probe: null,
    tests: [CRON],
  },
  {
    name: "⑥i CRON_SECRET 이 없어도 돈다 (잠기지 않은 채 배포)",
    file: CRON_ROUTE,
    from: "  if (!secret)",
    to: "  if (false)",
    probe: null,
    tests: [CRON],
  },

  // ── ⑦ daily-review 라우트 배선 ─────────────────────────────────────────
  {
    name: "⑦a 계획 갈래를 계정 소유로 안 좁힌다 (남의 반 학생이 섞인다)",
    file: DAILY_ROUTE,
    // D-130 이후 소유 범위 헬퍼를 부른다 — 관리자 쪽은 `mutate-admin-scope.ts` ⑦c·⑦d 가 본다
    from: "    where: ownedRowsWhere(session),",
    to: "    where: {},",
    probe: null,
    tests: [DAILY],
  },
  {
    name: "⑦b 계획을 아예 안 읽는다 (넓힌 대상이 사라진다)",
    file: DAILY_ROUTE,
    from: "        where: { classId: { in: ownClassIds } },",
    to: "        where: { classId: { in: [] } },",
    probe: null,
    tests: [DAILY],
  },
  {
    name: "⑦c 반 전체 진도를 안 읽는다",
    file: DAILY_ROUTE,
    from: "        where: { classId: { in: classIds }, studentId: null },",
    to: "        where: { classId: { in: [] }, studentId: null },",
    probe: null,
    tests: [DAILY],
  },
  {
    name: "⑦d 개별 진도 여부를 안 넘긴다",
    file: DAILY_ROUTE,
    from: "      useIndividualProgress: s.useIndividualProgress,",
    to: "      useIndividualProgress: false,",
    probe: null,
    tests: [DAILY],
  },
  {
    name: "⑦e eywa 소유자 문지기를 끈다 (남이 원장님 연계 학생을 본다)",
    file: DAILY_ROUTE,
    from: "  const eywaOwner = isEywaOwner(session.email);",
    to: "  const eywaOwner = true;",
    probe: null,
    tests: [DAILY],
  },

  // ── ⑨ 갈래 상한 · 문항 있는 마지막 차시 경계 (2026-09-18 시뮬레이션) ────────
  //    보고서 docs/planning/tracks/reports/daily-auto-test-simulation.md §4 ⑴ · §3 ⑵
  {
    name: "⑨a 상한을 행 수로 센다 (「문항 228/15 · 자동」 → 422)",
    file: CAP_FILE,
    from: "  if (recentProblemIds.length === 0) return countFamilies(rows);",
    to: "  if (recentProblemIds.length === 0) return rows.length;",
    probe: null,
    tests: [CAP, DAILY],
  },
  {
    name: "⑨b 상한에서 최근 출제(D-20)를 안 뺀다",
    file: CAP_FILE,
    from: "  return countFamilies(rows.filter((row) => !recent.has(row.id)));",
    to: "  return countFamilies(rows);",
    probe: null,
    tests: [CAP, CRON],
  },
  {
    name: "⑨c 경계 탐색이 끝을 못 찾는다 (늘 마지막 차시)",
    file: BOUND_FILE,
    from: "    if (await hasProblems(suffix(mid))) lo = mid;",
    to: "    if (true) lo = mid;",
    probe: null,
    tests: [BOUND, CRON],
  },
  {
    name: "⑨d 계획이 경계를 무시한다 (중3 이 고등으로 걸어 들어간다)",
    file: PLAN_FILE,
    from: "      : Math.max(boundaryIdx, reachedIdx);",
    to: "      : sorted.length - 1;",
    probe: null,
    tests: [PLAN, REVIEW],
  },
  {
    name: "⑨e 경계 밖에 이미 있는 반을 뒤로 끈다 (실제가 진다)",
    file: PLAN_FILE,
    from: "      : Math.max(boundaryIdx, reachedIdx);",
    to: "      : boundaryIdx;",
    probe: null,
    tests: [PLAN],
  },
  {
    name: "⑨f planDailyReview 가 경계를 계획에 안 넘긴다",
    file: REVIEW_FILE,
    from: "          lastTeachableUnitId,\n        })\n      : null;",
    to: "        })\n      : null;",
    probe: null,
    tests: [REVIEW],
  },
  {
    name: "⑨g 예정 목록이 경계를 안 쓴다",
    file: SCHED_FILE,
    from: "  const lastTeachableUnitId = args.lastTeachableUnitId ?? null;",
    to: "  const lastTeachableUnitId = null;",
    probe: null,
    tests: [SCHED],
  },
  {
    name: "⑨h 아침 회차가 경계를 안 넘긴다 (영구 「문항 부족」)",
    file: RUN_FILE,
    from: "    lastTeachableUnitId,\n  });\n\n  tally.targets = plan.attended;",
    to: "  });\n\n  tally.targets = plan.attended;",
    probe: null,
    tests: [CRON],
  },
  {
    name: "⑨i 아침 회차가 최근 출제를 안 뺀다 (뒤 학생이 조용히 «failed»)",
    file: RUN_FILE,
    from: "      const recent = await loadRecentProblemIds(cls.userId, day);",
    to: "      const recent: string[] = [];",
    probe: null,
    tests: [CRON],
  },
  {
    name: "⑨j 화면이 행 수로 센다",
    file: DAILY_ROUTE,
    from: "      capacity: draftCapacityOf(await loadCapacityRows(g.unitIds)),",
    to: "      capacity: (await loadCapacityRows(g.unitIds)).length,",
    probe: null,
    tests: [DAILY],
  },
  {
    name: "⑨k 화면이 경계를 안 넘긴다",
    file: DAILY_ROUTE,
    from: "    lastTeachableUnitId: planRows.length\n      ? await loadLastTeachableUnitId(units)\n      : null,",
    to: "    lastTeachableUnitId: null,",
    probe: null,
    tests: [DAILY],
  },
  {
    name: "⑨l 계기판·미리보기 예정이 경계를 안 넘긴다",
    file: STORE_FILE,
    from: "    lastTeachableUnitId: await loadLastTeachableUnitId(units),",
    to: "    lastTeachableUnitId: null,",
    probe: null,
    tests: [PLAN_API],
  },

  // ── ⑧ 가짜 Prisma 의 날짜 비교 — **자가 눈멂** 막기 ─────────────────────
  //    이것만은 제품이 아니라 하네스를 변이한다. 여기가 돌아가면 「오늘 이미 만든 시험」
  //    조회가 가짜에서 **언제나 빈 배열**이 되어, 중복 금지 시험이 가드 없이도 초록이 된다.
  {
    name: "⑧a 가짜 Prisma 가 날짜를 === 로 견준다 (중복 금지 시험이 눈이 먼다)",
    file: DOUBLE_FILE,
    from: L(
      "    if (cond instanceof Date || value instanceof Date) {",
      "      const left = comparable(value);",
      "      const right = comparable(cond);",
      "      return left !== null && right !== null && left === right;",
      "    }",
      "",
    ),
    to: "",
    probe: null,
    tests: [CRON, DAILY],
  },
];

const md5 = (b: Buffer) => createHash("md5").update(b).digest("hex");

/** 지운다 — 없으면 그만 */
function removeFile(file: string) {
  try {
    unlinkSync(file);
  } catch {
    /* 없으면 그만 */
  }
}

/**
 * 임시 파일 하나 — 디렉터리를 만들지 않는다. 🔴 `rmSync` 는 경로에 한글이 있으면 노드를 메시지 없이 죽인다
 * (`noRmSync.test.ts`) — 지우기가 `unlinkSync` 하나로 끝나게 파일로만 둔다.
 */
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

/** 시험을 돌려 (종료 코드, 실패한 시험 이름들) — 이름은 json 리포트에서 읽는다 */
function runTests(files: string[]): {
  code: number;
  failed: string[];
  readable: boolean;
} {
  const out = tempFile("mutate-daily-plan-", ".json");
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

  // `--anchors` — 시험을 돌리지 않고 **앵커만** 센다. 코드가 움직였을 때(prettier 재정렬 포함)
  // 30분짜리 전량 판정을 돌리기 전에 몇 초로 확인하는 자리다.
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

  // ㉠ 음성 대조 — 대상 시험 전부가 변이 전에 초록이어야 한다
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
