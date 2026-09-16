/**
 * **관리자 소유 범위(D-130) 가드를 하나씩 뒤집어 빨개지는지 본다** —
 * 브리프 `tracks/briefs/admin-sees-all.md` §4 «변이 하네스».
 *
 *   npx tsx scripts/qa/mutate-admin-scope.ts            # 전량
 *   npx tsx scripts/qa/mutate-admin-scope.ts ① ⑦       # 이름 조각으로 고른다(여럿이면 어느 하나라도)
 *   npx tsx scripts/qa/mutate-admin-scope.ts --anchors  # 시험 없이 앵커만 센다(몇 초)
 *
 * ## 🔴 두 방향 — 한쪽만 지키면 새는 쪽을 못 본다
 *
 * 판정 `crossesOwnerFence` 를 «절대 안 넘는다»(①a)로 바꾸면 관리자 짝이 빨개져야 하고,
 * «항상 넘는다»(①b)로 바꾸면 **관리자 아님 짝**이 빨개져야 한다(2026-09-07 재판). 배선 자리도
 * 되도록 두 방향(넓히기 · 좁히기)으로 뒤집는다 — 한 방향이 뜻을 안 바꾸는 자리(예: 반 소유를
 * 이미 확인한 뒤의 시험지 조건)는 뜻이 바뀌는 방향만 둔다.
 *
 * ## 판정 순서 — `mutate-daily-plan.ts` 와 같다 (20번 교훈 2026-08-20·08-21·08-23)
 *
 *   ㉠ 음성 대조 — 변이 **전에** 대상 시험이 초록인가. 아니면 전부 판정하지 않는다.
 *   ⑴ 앵커가 정확히 하나인가 — 아니면 판정 거부.
 *   ⑵ 파일이 바뀌었나.
 *   ⑶ **산출물이 바뀌었나** — 순수 헬퍼(`ownerScope.ts`)는 tsx 탐침을 변이 전후로 돌려 견준다. 라우트·
 *      Prisma 판처럼 모킹 없이 부를 수 없는 자리는 탐침이 없다(`probe: null`) — 그때는 ⑷ 의 시험 **이름**
 *      으로만 빨강을 판정하고, 초록이면 «살아남음»이 아니라 **판정 보류**로 둔다.
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
  `.mutate-admin-scope.probe.${process.pid}.ts`,
);

const T = (name: string) => `src/__tests__/${name}`;
const UNIT = T("unit/ownerScope.test.ts");
const SESSION = T("unit/sessionUserAdmin.test.ts");
const PAIRS = T("api/adminSeesAll.test.ts");
const PRINT_PAGE = T("api/testPrintPageScope.test.ts");
const DEV_OVERVIEW = T("api/teachingOverview.test.ts");
const STUDIO = T("api/studioWorkspace.test.ts");
const CONCEPT = T("api/conceptAdmin.test.ts");
const CLASS = T("api/class.test.ts");
const DAILY = T("api/dailyReview.test.ts");
const CRON = T("api/autoDraftCron.test.ts");

const SCOPE_FILE = "src/lib/ownerScope.ts";
const SESSION_FILE = "src/lib/session.ts";
const OWNERSHIP_FILE = "src/lib/ownership.ts";
const CLASSES_ROUTE = "src/app/api/classes/route.ts";
const TESTS_ROUTE = "src/app/api/tests/route.ts";
const DAILY_ROUTE = "src/app/api/tests/daily-review/route.ts";
const RANGE_ROUTE = "src/app/api/tests/default-range/route.ts";
const METRICS_ROUTE = "src/app/api/metrics/route.ts";
const CONFIRM_ROUTE = "src/app/api/tests/[id]/confirm/route.ts";
const PRINT_ROUTE = "src/app/api/tests/[id]/print/route.ts";
const PRINT_PAGE_FILE = "src/app/(main)/tests/[id]/print/page.tsx";
const GENERATE_FILE = "src/lib/tests/generateDraftTest.ts";
const REPLACE_FILE = "src/lib/tests/replaceTestProblem.ts";
const RUN_FILE = "src/lib/tests/runAutoDraft.ts";
const OWNER_FILE = "src/lib/tests/autoDraftOwner.ts";
const STUDIO_ROUTE = "src/app/api/studio/overview/route.ts";
const DEV_OVERVIEW_ROUTE = "src/app/api/dev/unified/overview/route.ts";
const CONCEPT_FILE = "src/lib/concept/adminService.ts";
const BASKET_TEST_ROUTE = "src/app/api/basket/test/route.ts";
const DOUBLE_FILE = "src/mocks/prismaTestDouble.ts";

/** tsx 탐침 머리 — 순수 헬퍼만 부른다(의존이 없어 모킹이 필요 없다) */
const PRELUDE = `
import * as os from "../../src/lib/ownerScope";
const ADMIN = { id: "me", isAdmin: true };
const PLAIN = { id: "me", isAdmin: false };
void os; void ADMIN; void PLAIN;
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

const MUTATIONS: Mutation[] = [
  // ── ① 판정 한 줄 — 두 방향 ─────────────────────────────────────────────
  {
    name: "①a 판정이 «절대 안 넘는다» (관리자가 아무것도 못 본다)",
    file: SCOPE_FILE,
    from: "  return viewer.isAdmin === true;",
    to: "  return false;",
    probe: "os.crossesOwnerFence(ADMIN)",
    tests: [UNIT, PAIRS],
  },
  {
    name: "①b 판정이 «항상 넘는다» (관리자 아닌 계정에 남의 학원이 샌다 — 2026-09-07 재판)",
    file: SCOPE_FILE,
    from: "  return viewer.isAdmin === true;",
    to: "  return true;",
    probe: "os.crossesOwnerFence(PLAIN)",
    tests: [UNIT, PAIRS, CLASS],
  },
  {
    name: "①c 참 같은 값도 관리자로 읽는다 (세션 모양 하나 틀리면 넘는다)",
    file: SCOPE_FILE,
    from: "  return viewer.isAdmin === true;",
    to: "  return Boolean(viewer.isAdmin);",
    probe: 'os.crossesOwnerFence({ id: "me", isAdmin: "true" as never })',
    tests: [UNIT],
  },

  // ── ② where 조각 ─────────────────────────────────────────────────────────
  {
    name: "②a 반·시험지 where 가 좁힐 때 userId 를 undefined 로 낸다 (Prisma 는 «조건 없음»)",
    file: SCOPE_FILE,
    from: "  return crossesOwnerFence(viewer) ? {} : { userId: viewer.id };",
    to: "  return crossesOwnerFence(viewer) ? {} : ({ userId: undefined } as never);",
    probe: "JSON.stringify(os.ownedRowsWhere(PLAIN))",
    tests: [UNIT, PAIRS],
  },
  {
    name: "②b 반·시험지 where 가 판정을 안 묻는다 (관리자도 좁힌다)",
    file: SCOPE_FILE,
    from: "  return crossesOwnerFence(viewer) ? {} : { userId: viewer.id };",
    to: "  return { userId: viewer.id };",
    probe: "JSON.stringify(os.ownedRowsWhere(ADMIN))",
    tests: [UNIT, PAIRS],
  },
  {
    name: "②c 학생 where 가 늘 넓다 (관리자 아닌 계정의 학생 수에 남의 반이 섞인다)",
    file: SCOPE_FILE,
    from: "  return crossesOwnerFence(viewer) ? {} : { class: { userId: viewer.id } };",
    to: "  return {};",
    probe: "JSON.stringify(os.ownedStudentsWhere(PLAIN))",
    tests: [UNIT, DEV_OVERVIEW, STUDIO],
  },

  // ── ③ 읽어 온 행의 소유자 판정 — 두 방향 ────────────────────────────────
  {
    name: "③a 소유자 판정이 판정을 안 묻는다 (관리자에게 남의 반이 403)",
    file: SCOPE_FILE,
    from: "  return crossesOwnerFence(viewer) || ownerUserId === viewer.id;",
    to: "  return ownerUserId === viewer.id;",
    probe: 'os.withinOwnerScope(ADMIN, "other")',
    tests: [UNIT, PAIRS],
  },
  {
    name: "③b 소유자 판정이 늘 참 (아무나 남의 반을 고친다)",
    file: SCOPE_FILE,
    from: "  return crossesOwnerFence(viewer) || ownerUserId === viewer.id;",
    to: "  return true;",
    probe: 'os.withinOwnerScope(PLAIN, "other")',
    tests: [UNIT, PAIRS, CLASS],
  },

  // ── ④ 개인 작업물 뷰어 ──────────────────────────────────────────────────
  {
    name: "④ 개인 작업물 뷰어가 관리자 표시를 그대로 넘긴다 (장바구니로 남의 반 시험지)",
    file: SCOPE_FILE,
    from: "  return { id: viewer.id, isAdmin: false };",
    to: "  return { ...viewer };",
    probe: "os.crossesOwnerFence(os.personalViewer(ADMIN))",
    tests: [UNIT, PAIRS],
  },
  {
    name: "④b 장바구니 시험지가 개인 작업물 뷰어를 안 쓴다",
    file: BASKET_TEST_ROUTE,
    from: "  const viewer = personalViewer(session);",
    to: "  const viewer = session;",
    probe: null,
    tests: [PAIRS],
  },

  // ── ⑤ 세션이 싣는 관리자 표시 ───────────────────────────────────────────
  {
    name: "⑤a 세션이 늘 관리자라고 싣는다",
    file: SESSION_FILE,
    from: "    isAdmin: session.user.isAdmin === true,",
    to: "    isAdmin: true,",
    probe: null,
    tests: [SESSION],
  },
  {
    name: "⑤b 세션이 참 같은 값도 관리자로 싣는다",
    file: SESSION_FILE,
    from: "    isAdmin: session.user.isAdmin === true,",
    to: "    isAdmin: Boolean(session.user.isAdmin),",
    probe: null,
    tests: [SESSION],
  },

  // ── ⑥ 404/403 헬퍼 — 헬퍼를 우회해 옛 비교로 돌린다 ───────────────────────
  {
    name: "⑥a 반 404/403 이 소유 범위를 안 묻는다",
    file: OWNERSHIP_FILE,
    from: "  if (!withinOwnerScope(viewer, cls.userId)) {",
    to: "  if (cls.userId !== viewer.id) {",
    probe: null,
    tests: [PAIRS],
  },
  {
    name: "⑥b 학생 404/403 이 소유 범위를 안 묻는다",
    file: OWNERSHIP_FILE,
    from: "  if (!withinOwnerScope(viewer, ownerClass.userId)) {",
    to: "  if (ownerClass.userId !== viewer.id) {",
    probe: null,
    tests: [PAIRS],
  },
  {
    name: "⑥c 시험지 404/403 이 소유 범위를 안 묻는다",
    file: OWNERSHIP_FILE,
    from: "  if (!withinOwnerScope(viewer, test.userId)) {",
    to: "  if (test.userId !== viewer.id) {",
    probe: null,
    tests: [PAIRS],
  },

  // ── ⑦ 목록·조회 where 배선 ──────────────────────────────────────────────
  {
    name: "⑦a 반 목록이 늘 넓다",
    file: CLASSES_ROUTE,
    from: "  const where = ownedRowsWhere(session);",
    to: "  const where = {};",
    probe: null,
    tests: [PAIRS, CLASS],
  },
  {
    name: "⑦b 시험지 목록이 늘 넓다",
    file: TESTS_ROUTE,
    from: "    ...ownedRowsWhere(session),\n",
    to: "",
    probe: null,
    tests: [PAIRS],
  },
  {
    name: "⑦c 「오늘의 확인테스트」 계획 갈래가 늘 넓다",
    file: DAILY_ROUTE,
    from: "    where: ownedRowsWhere(session),",
    to: "    where: {},",
    probe: null,
    tests: [PAIRS, DAILY],
  },
  {
    name: "⑦d 「오늘의 확인테스트」 계획 갈래가 관리자도 좁힌다",
    file: DAILY_ROUTE,
    from: "    where: ownedRowsWhere(session),",
    to: "    where: { userId: session.id },",
    probe: null,
    tests: [PAIRS],
  },
  {
    name: "⑦e 기본 범위의 직전 확인테스트가 관리자도 자기 시험지만 센다",
    file: RANGE_ROUTE,
    from: "        ...ownedRowsWhere(session),\n        classId,\n        studentId: null,",
    to: "        userId: session.id,\n        classId,\n        studentId: null,",
    probe: null,
    tests: [PAIRS],
  },
  {
    name: "⑦f 주간 지표가 늘 넓다",
    file: METRICS_ROUTE,
    from: "      ...ownedRowsWhere(session),\n",
    to: "",
    probe: null,
    tests: [PAIRS],
  },
  {
    name: "⑦g 주간 지표가 관리자도 좁힌다",
    file: METRICS_ROUTE,
    from: "      ...ownedRowsWhere(session),\n",
    to: "      userId: session.id,\n",
    probe: null,
    tests: [PAIRS],
  },
  {
    name: "⑦h 확정의 원자 조건이 관리자도 좁힌다 (소유 확인은 통과하고 409)",
    file: CONFIRM_ROUTE,
    from: '    where: { id, ...ownedRowsWhere(session), status: "draft" },',
    to: '    where: { id, userId: session.id, status: "draft" },',
    probe: null,
    tests: [PAIRS],
  },
  {
    name: "⑦i 인쇄 기록의 원자 조건이 관리자도 좁힌다",
    file: PRINT_ROUTE,
    from: '      where: { id, ...ownedRowsWhere(session), status: "confirmed" },',
    to: '      where: { id, userId: session.id, status: "confirmed" },',
    probe: null,
    tests: [PAIRS],
  },
  {
    name: "⑦j 인쇄 지면이 관리자도 좁힌다",
    file: PRINT_PAGE_FILE,
    from: "    where: { id: parsed.data.id, ...ownedRowsWhere(session) },",
    to: "    where: { id: parsed.data.id, userId: session.id },",
    probe: null,
    tests: [PRINT_PAGE],
  },
  {
    name: "⑦k 인쇄 지면이 늘 넓다 (아무나 남의 시험지를 인쇄)",
    file: PRINT_PAGE_FILE,
    from: "    where: { id: parsed.data.id, ...ownedRowsWhere(session) },",
    to: "    where: { id: parsed.data.id },",
    probe: null,
    tests: [PRINT_PAGE],
  },

  // ── ⑧ 출제·교체 — 시험지 소유자와 D-20 열쇠 ─────────────────────────────
  {
    name: "⑧a 남의 반에 낸 시험지가 관리자 것이 된다 (역할 계정 화면에서 사라진다)",
    file: GENERATE_FILE,
    from: "        userId: owned.data.userId,",
    to: "        userId: session.id,",
    probe: null,
    tests: [PAIRS],
  },
  {
    name: "⑧b 출제의 최근 중복 제외(D-20)가 관리자 자신 기준이다",
    file: GENERATE_FILE,
    from: "    loadRecentProblemIds(owned.data.userId, input.testDate),",
    to: "    loadRecentProblemIds(session.id, input.testDate),",
    probe: null,
    tests: [PAIRS],
  },
  {
    name: "⑧c 교체의 최근 중복 제외(D-20)가 관리자 자신 기준이다",
    file: REPLACE_FILE,
    from: "    loadRecentProblemIds(owned.data.userId, today),",
    to: "    loadRecentProblemIds(session.id, today),",
    probe: null,
    tests: [PAIRS],
  },
  {
    name: "⑧d 교체의 원자 조건이 관리자도 좁힌다",
    file: REPLACE_FILE,
    from: '      where: { id: testId, ...ownedRowsWhere(session), status: "draft" },',
    to: '      where: { id: testId, userId: session.id, status: "draft" },',
    probe: null,
    tests: [PAIRS],
  },

  // ── ⑨ 아침 자동 초안 (D-130 ⑸) ─────────────────────────────────────────
  {
    name: "⑨a 자동 초안이 관리자 소유자도 자기 반만 돈다",
    file: RUN_FILE,
    from: "    where: ownedRowsWhere(owner),",
    to: "    where: { userId: owner.id },",
    probe: null,
    tests: [PAIRS],
  },
  {
    name: "⑨b 자동 초안이 늘 전 반을 돈다",
    file: RUN_FILE,
    from: "    where: ownedRowsWhere(owner),",
    to: "    where: {},",
    probe: null,
    tests: [PAIRS, CRON],
  },
  {
    name: "⑨c 자동 초안 소유자에 관리자 표시를 안 싣는다",
    file: OWNER_FILE,
    from: "      isAdmin: user.isAdmin === true,",
    to: "      isAdmin: false,",
    probe: null,
    tests: [PAIRS],
  },
  {
    name: "⑨d 자동 초안 소유자를 늘 관리자로 싣는다",
    file: OWNER_FILE,
    from: "      isAdmin: user.isAdmin === true,",
    to: "      isAdmin: true,",
    probe: null,
    tests: [PAIRS],
  },

  // ── ⑩ 작업실 개요 · 오늘의 개념 판 ─────────────────────────────────────
  {
    name: "⑩a 작업실 개요(스튜디오)가 관리자도 좁힌다",
    file: STUDIO_ROUTE,
    from: "      db.class.count({ where: ownedRowsWhere(user) }),",
    to: "      db.class.count({ where: { userId: user.id } }),",
    probe: null,
    tests: [STUDIO],
  },
  {
    name: "⑩b 작업실 개요(개발)의 학생 수가 늘 넓다",
    file: DEV_OVERVIEW_ROUTE,
    from: "      db.student.count({ where: ownedStudentsWhere(user) }),",
    to: "      db.student.count({ where: {} }),",
    probe: null,
    tests: [DEV_OVERVIEW],
  },
  {
    name: "⑩c 오늘의 개념 판이 관리자도 좁힌다",
    file: CONCEPT_FILE,
    // 반 조회가 `loadBoardClasses` 로 옮겨 갔다(D-132 담당 조인) — 조각은 거기 한 번이다
    from: "  const where = ownedRowsWhere(viewer);",
    to: "  const where = { userId: viewer.id };",
    probe: null,
    tests: [CONCEPT],
  },
  {
    name: "⑩d 오늘의 개념 판이 늘 넓다",
    file: CONCEPT_FILE,
    from: "  const where = ownedRowsWhere(viewer);",
    to: "  const where = {};",
    probe: null,
    tests: [CONCEPT],
  },

  // ── ⑪ 가짜 Prisma — **자가 눈멂** 막기 ──────────────────────────────────
  //    시드가 관리자 표시를 먹으면 자동 초안 짝이 «관리자 아님 vs 관리자 아님»으로 헛돈다
  //    (20번 교훈 2026-09-15 «새 칸을 판정에 넣으면 대역 행이 막힘으로 읽힌다»).
  {
    name: "⑪ 가짜 Prisma 의 계정 시드가 관리자 표시를 버린다 (자동 초안 짝이 헛돈다)",
    file: DOUBLE_FILE,
    from: "  userRows.push(...rows.map((row) => ({ ...row })));",
    to: "  userRows.push(...rows.map((row) => ({ ...row, isAdmin: false })));",
    probe: null,
    tests: [PAIRS],
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
  const out = tempFile("mutate-admin-scope-", ".json");
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

function countAnchor(text: string, from: string): number {
  const eol = text.includes("\r\n") ? "\r\n" : NL;
  return text.split(from.split(NL).join(eol)).length - 1;
}

function main(): number {
  const needles = process.argv.slice(2).filter((a) => a !== "--anchors");

  // `--anchors` — 시험을 돌리지 않고 **앵커만** 센다. 코드가 움직였을 때(prettier 재정렬 포함)
  // 긴 전량 판정을 돌리기 전에 몇 초로 확인하는 자리다.
  if (process.argv.includes("--anchors")) {
    let bad = 0;
    for (const m of MUTATIONS) {
      const count = countAnchor(readFileSync(m.file, "utf8"), m.from);
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
