/**
 * **진도 계획 쓰기·읽기 API(D-129 ④의 뒷단) 가드를 하나씩 꺼 빨개지는지 본다** —
 * 브리프 `tracks/briefs/daily-auto-test-plan-api.md` §3 «변이 하네스».
 *
 *   npx tsx scripts/qa/mutate-plan-api.ts            # 전량
 *   npx tsx scripts/qa/mutate-plan-api.ts ① ⑥       # 이름 조각으로 고른다(여럿이면 어느 하나라도)
 *   npx tsx scripts/qa/mutate-plan-api.ts --anchors  # 시험 없이 앵커만 센다(몇 초)
 *
 * ## 판정 순서 — `mutate-daily-plan.ts` 와 같다 (러너는 그 파일에서 옮겨 왔다)
 *
 *   ㉠ 음성 대조 — 변이 **전에** 대상 시험이 초록인가. 아니면 전부 판정하지 않는다.
 *   ⑴ 앵커가 정확히 하나인가 — 아니면 판정 거부.
 *   ⑵ 파일이 바뀌었나.
 *   ⑶ **산출물이 바뀌었나** — 순수 함수·계약 가드는 tsx 탐침을 변이 전후로 돌려 견준다. 라우트처럼
 *      모킹 없이 부를 수 없는 자리는 탐침이 없다(`probe: null`) — 그때는 ⑷ 의 시험 **이름**으로만
 *      빨강을 판정하고, 초록이면 «살아남음»이 아니라 **판정 보류**로 둔다.
 *   ⑷ 그제서야 시험이 빨개지나 — 실패한 시험 **이름**을 json 리포트에서 읽는다(2026-08-23 «도장»).
 *
 * 🔴 소유 판정(①)은 **양쪽**으로 뒤집는다 — «항상 넓힌다»와 «넓히지 않는다» 둘 다 빨개져야 한다
 *    (한쪽만 지키면 새는 쪽을 못 본다 — `admin-sees-all` 브리프 §4 와 같은 축).
 *
 * 러너는 `--maxWorkers=1` — 이 기계는 다른 오르카 세션과 메모리를 나눠 쓴다. 원복은 **바이트**로 `finally` 에서,
 * 끝나고 md5 로 대조한다. **커밋한 상태에서 돌린다** — 배경 셸이 끊기면 `finally` 가 안 돌 수 있다
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
  `.mutate-plan-api.probe.${process.pid}.ts`,
);

const T = (name: string) => `src/__tests__/${name}`;
const API = T("api/progressPlan.test.ts");
const SCHED = T("unit/planSchedule.test.ts");

const OWNER_FILE = "src/lib/daily/planOwnership.ts";
const STORE_FILE = "src/lib/daily/progressPlanStore.ts";
const SCHED_FILE = "src/lib/daily/planSchedule.ts";
const CLASS_PLAN_ROUTE = "src/app/api/classes/[id]/progress-plan/route.ts";
const STUDENT_PLAN_ROUTE = "src/app/api/students/[id]/progress-plan/route.ts";
const CLASSES_ROUTE = "src/app/api/classes/route.ts";
const CONTRACT_FILE = "src/contracts/dailyAutoTest.contract.ts";
const CLASS_CONTRACT_FILE = "src/contracts/class.contract.ts";

/** tsx 탐침 머리 — 모든 tsx 탐침이 이 이름들을 쓴다 */
const PRELUDE = `
import * as ps from "../../src/lib/daily/planSchedule";
import * as c from "../../src/contracts/dailyAutoTest.contract";
import * as cc from "../../src/contracts/class.contract";
const UNITS = Array.from({ length: 10 }, (_, i) => ({ id: "u" + (i + 1), orderIndex: 100 + i }));
/** 월·수·금, 2026-09-07(월) 시작, 한 수업 한 차시 */
const MWF = { weekdays: [1, 3, 5], unitsPerLesson: 1, startUnitId: "u1", startDate: "2026-09-07", active: true };
const ROW = (unitId: string, recordedAt: string, over: object = {}) => ({
  id: unitId + "@" + recordedAt, classId: "c1", studentId: null, unitId, recordedAt,
  createdAt: recordedAt + "T10:00:00.000Z", ...over,
});
/** 2026-09-16(수) 이 든 주 — 9/14(월) ~ 9/27(일) */
const S = (over: object = {}) =>
  ps.buildPlanSchedule({
    rule: MWF, units: UNITS, classProgress: [], studentProgress: [],
    useIndividualProgress: false, from: "2026-09-14", to: "2026-09-27", ...over,
  });
const B = (rows: ReturnType<typeof S>) =>
  rows.map((r) => [r.date, r.plannedUnitIds.join("+"), r.actualUnitIds.join("+"), r.driftDays].join(" "));
/** 계약 본문 — 시작 차시는 uuid 모양이면 된다 */
const W = { weekdays: [1, 3, 5], startUnitId: "20000000-0000-4000-8000-000000000001", startDate: "2026-09-07" };
void ps; void c; void cc; void UNITS; void MWF; void ROW; void S; void B; void W;
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

const CLASS_OWNER_LINE =
  "  if (cls.userId === session.id || (await crossesOwnership(session)))";
const STUDENT_OWNER_LINE =
  "  if (ownerClass.userId === session.id || (await crossesOwnership(session)))";
const MORNING_ANCHOR = L(
  "      actual: anchorOf(",
  "        findLatestProgress(applicable.filter((r) => r.recordedAt < date)),",
  "      ),",
);

const MUTATIONS: Mutation[] = [
  // ── ① 소유 판정(임시 헬퍼) — 양쪽으로 뒤집는다 ─────────────────────────────
  {
    name: "①a 반 — 관리자가 아니어도 남의 반을 넘는다 («항상 넓힌다»)",
    file: OWNER_FILE,
    from: CLASS_OWNER_LINE,
    to: "  if (cls.userId === session.id || true)",
    probe: null,
    tests: [API],
  },
  {
    name: "①b 반 — 관리자도 남의 반을 못 넘는다 («넓히지 않는다»)",
    file: OWNER_FILE,
    from: CLASS_OWNER_LINE,
    to: "  if (cls.userId === session.id)",
    probe: null,
    tests: [API],
  },
  {
    name: "①c 학생 — 관리자가 아니어도 남의 반 학생을 넘는다",
    file: OWNER_FILE,
    from: STUDENT_OWNER_LINE,
    to: "  if (ownerClass.userId === session.id || true)",
    probe: null,
    tests: [API],
  },
  {
    name: "①d 학생 — 관리자도 남의 반 학생을 못 넘는다",
    file: OWNER_FILE,
    from: STUDENT_OWNER_LINE,
    to: "  if (ownerClass.userId === session.id)",
    probe: null,
    tests: [API],
  },
  {
    name: "①e 관리자 세션이 다른 계정의 것이어도 넘는다",
    file: OWNER_FILE,
    from: "  return account?.isAdmin === true && account.id === session.id;",
    to: "  return account?.isAdmin === true;",
    probe: null,
    tests: [API],
  },
  {
    name: "①f 자기 반에서도 관리자 여부를 먼저 묻는다(평소 길에 세션 조회가 붙는다)",
    file: OWNER_FILE,
    from: CLASS_OWNER_LINE,
    to: "  if ((await crossesOwnership(session)) || cls.userId === session.id)",
    probe: null,
    tests: [API],
  },

  // ── ② 저장 — 422 · 한 줄 규칙 · 고치기 ─────────────────────────────────────
  {
    name: "②a 없는 차시를 안 본다 (FK 가 500 으로 터진다)",
    file: STORE_FILE,
    from: '  return unit ? null : planFieldError("startUnitId", MISSING_UNIT_MESSAGE);',
    to: "  return null;",
    probe: null,
    tests: [API],
  },
  {
    name: "②b 계약 어김이 422 가 아니라 400",
    file: STORE_FILE,
    from: L("    INVALID_MESSAGE,", "    422,"),
    to: L("    INVALID_MESSAGE,", "    400,"),
    probe: null,
    tests: [API],
  },
  {
    name: "②c 반 계획을 찾을 때 학생 계획과 가르지 않는다 (학생 계획을 덮어쓴다)",
    file: STORE_FILE,
    from: "        ? { classId: target.classId, studentId: null }",
    to: "        ? { classId: target.classId }",
    probe: null,
    tests: [API],
  },
  {
    name: "②d 경합에서 unique 에 막힌 쪽이 덮어쓰지 않고 터진다",
    file: STORE_FILE,
    from: '    if (!isPrismaErrorCode(error, "P2002")) throw error;',
    to: "    throw error;",
    probe: null,
    tests: [API],
  },
  {
    name: "②e 고치기가 켜짐을 안 바꾼다",
    file: STORE_FILE,
    from: "  if (input.active !== undefined) data.active = input.active;",
    to: "",
    probe: null,
    tests: [API],
  },
  {
    name: "②f 요일을 정리하지 않는다 (같은 규칙이 두 모양)",
    file: STORE_FILE,
    from: "  [...new Set(weekdays)].sort((a, b) => a - b);",
    to: "  [...weekdays];",
    probe: null,
    tests: [API],
  },
  {
    name: "②g 반 계획의 예정이 학생 개별 진도를 섞는다",
    file: STORE_FILE,
    from: "      where: { classId, studentId: null },",
    to: "      where: { classId },",
    probe: null,
    tests: [API],
  },
  {
    name: "②h 덮어쓰기인데 201 이다",
    file: CLASS_PLAN_ROUTE,
    from: "    { status: created ? 201 : 200 },",
    to: "    { status: 201 },",
    probe: null,
    tests: [API],
  },

  // ── ③ 학생 계획 — 개별 진도 학생만 ────────────────────────────────────────
  {
    name: "③a 학생 PUT 이 개별 진도를 안 묻는다",
    file: STUDENT_PLAN_ROUTE,
    from: L(
      "  const body = await parsePlanBody(request, progressPlanWriteRequestSchema);",
      "  if (!body.ok) return body.response;",
      "  if (!g.student.useIndividualProgress)",
      '    return planFieldError("useIndividualProgress", NOT_INDIVIDUAL_MESSAGE);',
    ),
    to: L(
      "  const body = await parsePlanBody(request, progressPlanWriteRequestSchema);",
      "  if (!body.ok) return body.response;",
    ),
    probe: null,
    tests: [API],
  },
  {
    name: "③b 학생 PATCH 가 개별 진도를 안 묻는다",
    file: STUDENT_PLAN_ROUTE,
    from: L(
      "  const body = await parsePlanBody(request, progressPlanPatchRequestSchema);",
      "  if (!body.ok) return body.response;",
      "  if (!g.student.useIndividualProgress)",
      '    return planFieldError("useIndividualProgress", NOT_INDIVIDUAL_MESSAGE);',
    ),
    to: L(
      "  const body = await parsePlanBody(request, progressPlanPatchRequestSchema);",
      "  if (!body.ok) return body.response;",
    ),
    probe: null,
    tests: [API],
  },
  {
    name: "③c 학생 GET 의 «지금 덮나»가 개별 진도를 안 본다",
    file: STUDENT_PLAN_ROUTE,
    from: "  const inEffect = plan !== null && g.student.useIndividualProgress;",
    to: "  const inEffect = plan !== null;",
    probe: null,
    tests: [API],
  },

  // ── ④ 반 계획 라우트 ───────────────────────────────────────────────────────
  {
    name: "④a 반 DELETE 가 그 반의 학생 계획까지 지운다",
    file: CLASS_PLAN_ROUTE,
    from: "  await db.progressPlan.delete({ where: { id: plan.id } });",
    to: "  await db.progressPlan.deleteMany({ where: { classId: g.classId } });",
    probe: null,
    tests: [API],
  },
  {
    name: "④b 반 GET 의 학생 계획들에 반 계획이 섞인다",
    file: CLASS_PLAN_ROUTE,
    from: "      where: { classId: g.classId, studentId: { not: null } },",
    to: "      where: { classId: g.classId },",
    probe: null,
    tests: [API],
  },

  // ── ⑤ 반 만들 때 계획을 같이 ───────────────────────────────────────────────
  {
    name: "⑤a 계획 칸만 틀려도 400",
    file: CLASSES_ROUTE,
    from: L(
      "    return planOnly",
      "      ? planValidationError(parsed.error)",
      "      : validationError(parsed.error);",
    ),
    to: "    return validationError(parsed.error);",
    probe: null,
    tests: [API],
  },
  {
    name: "⑤b 반 칸·계획 칸이 같이 틀려도 422",
    file: CLASSES_ROUTE,
    from: "    const planOnly = parsed.error.issues.every(",
    to: "    const planOnly = parsed.error.issues.some(",
    probe: null,
    tests: [API],
  },
  {
    name: "⑤c 계획을 받아 놓고 안 넣는다",
    file: CLASSES_ROUTE,
    from: L("  const created = progressPlan", "    ? await db.$transaction("),
    to: L("  const created = false", "    ? await db.$transaction("),
    probe: null,
    tests: [API],
  },
  {
    name: "⑤d 반 만들 때 시작 차시를 안 본다",
    file: CLASSES_ROUTE,
    from: L(
      "    const missingUnit = await checkStartUnit(progressPlan.startUnitId);",
      "    if (missingUnit) return missingUnit;",
    ),
    to: "",
    probe: null,
    tests: [API],
  },

  // ── ⑥ 이번 주 예정(순수 함수) ─────────────────────────────────────────────
  {
    name: "⑥a 예정이 그날 기록을 먹는다 (아침 기준이 아니다 — 밀림이 목록에서 사라진다)",
    file: SCHED_FILE,
    from: "        findLatestProgress(applicable.filter((r) => r.recordedAt < date)),",
    to: "        findLatestProgress(applicable.filter((r) => r.recordedAt <= date)),",
    probe: 'B(S({ classProgress: [ROW("u3", "2026-09-16")] }))[1]',
    tests: [SCHED, API],
  },
  {
    name: "⑥b 실제 진도로 다시 펴지 않는다 (계획만 본다)",
    file: SCHED_FILE,
    from: MORNING_ANCHOR,
    to: "      actual: null,",
    probe: 'B(S({ classProgress: [ROW("u3", "2026-09-16")] }))[2]',
    tests: [SCHED, API],
  },
  {
    name: "⑥c 수업 없는 날도 줄을 세운다",
    file: SCHED_FILE,
    from: "    if (!morning.lessonToday && actualUnitIds.length === 0) continue;",
    to: "",
    probe: "S().length",
    tests: [SCHED, API],
  },
  {
    name: "⑥d 보강날(기록만 있는 날)을 뺀다",
    file: SCHED_FILE,
    from: "    if (!morning.lessonToday && actualUnitIds.length === 0) continue;",
    to: "    if (!morning.lessonToday) continue;",
    probe: 'B(S({ classProgress: [ROW("u6", "2026-09-19")] }))',
    tests: [SCHED],
  },
  {
    name: "⑥e 주가 일요일부터",
    file: SCHED_FILE,
    from: "  const sinceMonday = (weekdayOf(day) + 6) % 7;",
    to: "  const sinceMonday = weekdayOf(day);",
    probe: 'ps.planScheduleWindow("2026-09-16")',
    tests: [SCHED, API],
  },
  {
    name: "⑥f 14일이 아니라 7일 치",
    file: SCHED_FILE,
    from: "export const PLAN_SCHEDULE_DAYS = 14;",
    to: "export const PLAN_SCHEDULE_DAYS = 7;",
    probe: 'ps.planScheduleWindow("2026-09-16")',
    tests: [SCHED, API],
  },
  {
    name: "⑥g 밀림을 그날 기록 전 기준으로 잰다 (기록한 날 밀림이 0)",
    file: SCHED_FILE,
    from: "        findLatestProgress(applicable.filter((r) => r.recordedAt <= date)),",
    to: "        findLatestProgress(applicable.filter((r) => r.recordedAt < date)),",
    probe: 'B(S({ classProgress: [ROW("u3", "2026-09-16")] }))[1]',
    tests: [SCHED, API],
  },
  {
    name: "⑥h 개별 진도 학생인데 반 기록을 본다",
    file: SCHED_FILE,
    from: "    useIndividualProgress: args.useIndividualProgress ?? false,",
    to: "    useIndividualProgress: false,",
    probe:
      'B(S({ classProgress: [ROW("u3", "2026-09-16")], studentProgress: [ROW("u6", "2026-09-16", { studentId: "s1" })], useIndividualProgress: true }))[2]',
    tests: [SCHED],
  },
  {
    name: "⑥i 같은 날 같은 차시가 두 번 실린다",
    file: SCHED_FILE,
    from: "    const actualUnitIds = [...new Set(recordedToday.map((r) => r.unitId))];",
    to: "    const actualUnitIds = recordedToday.map((r) => r.unitId);",
    probe:
      'B(S({ classProgress: [ROW("u5", "2026-09-16"), ROW("u5", "2026-09-16", { id: "dup", createdAt: "2026-09-16T12:00:00.000Z" })] }))[1]',
    tests: [SCHED],
  },
  {
    name: "⑥j 같은 날 기록을 기록 순서로 안 싣는다",
    file: SCHED_FILE,
    from: "      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));",
    to: "      ;",
    probe:
      'B(S({ classProgress: [ROW("u6", "2026-09-16", { createdAt: "2026-09-16T11:00:00.000Z" }), ROW("u5", "2026-09-16")] }))[1]',
    tests: [SCHED],
  },

  // ── ⑦ 계약 ────────────────────────────────────────────────────────────────
  {
    name: "⑦a 요일 빈 배열을 받는다",
    file: CONTRACT_FILE,
    from: '    .min(1, { error: "수업 요일을 하나 이상 골라야 합니다." }),',
    to: "    ,",
    probe:
      "c.progressPlanWriteRequestSchema.safeParse({ ...W, weekdays: [] }).success",
    tests: [API],
  },
  {
    name: "⑦b 요일 7 을 받는다",
    file: CONTRACT_FILE,
    from: "export const lessonWeekdaySchema = z.number().int().min(0).max(6);",
    to: "export const lessonWeekdaySchema = z.number().int().min(0).max(7);",
    probe:
      "c.progressPlanWriteRequestSchema.safeParse({ ...W, weekdays: [7] }).success",
    tests: [API],
  },
  {
    name: "⑦c 차시 수 11 을 받는다",
    file: CONTRACT_FILE,
    from: "  unitsPerLesson: z.number().int().min(1).max(MAX_UNITS_PER_LESSON),",
    to: "  unitsPerLesson: z.number().int().min(1),",
    probe:
      "c.progressPlanWriteRequestSchema.safeParse({ ...W, unitsPerLesson: 11 }).success",
    tests: [API],
  },
  {
    name: "⑦d 한 수업당 차시 수 기본값이 1 이 아니다",
    file: CONTRACT_FILE,
    from: "  unitsPerLesson: progressPlanRuleSchema.shape.unitsPerLesson.default(1),",
    to: "  unitsPerLesson: progressPlanRuleSchema.shape.unitsPerLesson.default(2),",
    probe: "c.progressPlanWriteRequestSchema.parse(W).unitsPerLesson",
    tests: [API],
  },
  {
    name: "⑦e 빈 PATCH 를 받는다",
    file: CONTRACT_FILE,
    from: "  .refine((v) => Object.keys(v).length > 0, {",
    to: "  .refine(() => true, {",
    probe: "c.progressPlanPatchRequestSchema.safeParse({}).success",
    tests: [API],
  },
  {
    name: "⑦f 반 만들기 계약에 계획 칸이 없다",
    file: CLASS_CONTRACT_FILE,
    from: "  progressPlan: progressPlanWriteRequestSchema.optional(),",
    to: "",
    probe:
      'cc.classCreateRequestSchema.safeParse({ name: "새 반", grade: "중2", progressPlan: W }).success',
    tests: [API],
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
  const out = tempFile("mutate-plan-api-", ".json");
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
