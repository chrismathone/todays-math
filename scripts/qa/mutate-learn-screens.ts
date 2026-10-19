/**
 * **학생 화면 · 발급 칸 · 퇴원 막기 · 실패 행 정리(learn-screens) 가드를 하나씩 꺼 빨개지는지 본다** —
 * 브리프 `tracks/briefs/todays-concept-learn-screens.md` §3 «변이 시험: ①~⑦ 가드를 하나씩 끄면 빨개지는가»
 * + §6(D-127) ⑧ 첫 로그인 «나가기» · ⑨ 발급 칸 «잠김 — N분 뒤 풀림» · ⑩ 퇴원 학생 발급 API 409
 * + D-128 ⑧b~d 첫 로그인 윗줄 이름 · 큰 로고 · ⑨f~g 잠김 줄을 N 이 바뀌는 순간 다시 셈 · ③c · ③f KST 셈은 `kstDate.ts` 한 곳.
 *
 *   npx tsx scripts/qa/mutate-learn-screens.ts          # 전량
 *   npx tsx scripts/qa/mutate-learn-screens.ts ① ⑥     # 이름 조각으로 고른다(여럿이면 어느 하나라도)
 *
 * ## 판정 순서 — `mutate-student-auth.ts` · `mutate-concept-admin.ts` 와 같다 (20번 교훈 2026-08-20·08-21·08-23)
 *
 *   ㉠ 음성 대조 — 변이 **전에** 대상 시험이 초록인가. 아니면 전부 판정하지 않는다.
 *   ⑴ 앵커가 정확히 하나인가 — 아니면 판정 거부.
 *   ⑵ 파일이 바뀌었나.
 *   ⑶ **산출물이 바뀌었나** — 순수 함수 가드는 tsx 탐침을 변이 전후로 돌려 견준다. 화면·Prisma 판처럼 모킹 없이
 *      부를 수 없는 자리는 탐침이 없다(`probe: null`) — 그때는 ⑷ 의 시험 **이름**으로만 빨강을 판정하고,
 *      초록이면 «살아남음»이 아니라 **판정 보류**로 둔다(뜻이 안 바뀐 변이인지 가드가 없는지 못 가른다).
 *   ⑷ 그제서야 시험이 빨개지나 — 실패한 시험 **이름**을 json 리포트에서 읽는다(2026-08-23 «도장»).
 *
 * 러너는 `--maxWorkers=1` — 이 기계는 다른 오르카 세션과 메모리를 나눠 쓴다. 원복은 **바이트**로 `finally` 에서,
 * 끝나고 md5 로 대조한다. **커밋한 상태에서 돌린다** — 배경 셸이 «메모리 부족»으로 끊기면 `finally` 가 안 돌 수 있다
 * (메모리 `background-kill-node-survives`) — 그러면 `git status` 로 원본을 대조한다.
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
  `.mutate-learn-screens.probe.${process.pid}.ts`,
);

const T = (name: string) => `src/__tests__/${name}`;
const SEEK = T("unit/learnSeekGuard.test.ts");
const GROUPS = T("unit/learnLectureGroups.test.ts");
const ACCESS = T("unit/learnLectureAccess.test.ts");
const LOGIN = T("unit/studentLogin.test.ts");
const CLEANUP = T("unit/studentLoginMissCleanup.test.ts");
const ROUTES = T("api/learnRoutes.test.ts");
const PIPELINE = T("api/studentSessionPipeline.test.ts");
const ISSUE = T("api/studentAccountIssue.test.ts");
const SCREENS = T("components/LearnScreens.test.tsx");
const PANEL = T("components/StudentAccountPanel.test.tsx");
const LOCK_T = T("unit/accountLockLine.test.ts");
const KST_T = T("unit/kstDate.test.ts");
const PW_PAGE = T("components/LearnPasswordPage.test.tsx");

/** tsx 탐침 머리 — 모든 tsx 탐침이 이 이름들을 쓴다 */
const PRELUDE = `
import * as sg from "../../src/lib/learn/seekGuard";
import * as lg from "../../src/lib/learn/lectureGroups";
import * as access from "../../src/lib/learn/lectureAccess";
import * as ab from "../../src/lib/learn/accountBlock";
import * as ss from "../../src/lib/learn/studentSession";
import * as pls from "../../src/lib/learn/prismaLoginStore";
import * as login from "../../src/lib/learn/studentLogin";
import * as mem from "../../src/mocks/memoryLoginStore";
import * as pinh from "../../src/lib/learn/pinHash";
import * as issue from "../../src/lib/learn/issueStudentAccount";
import * as sl from "../../src/lib/concept/studentLecture";
import * as lock from "../../src/lib/class/accountLock";
import * as kst from "../../src/lib/kstDate";
const W = { maxWatched: 60, completed: false, duration: 139 };
const DONE = { maxWatched: 30, completed: true, duration: 139 };
const ROW = { id: "acc-1", studentId: "stu-1", disabledAt: null as Date | null,
  mustChangePassword: false, student: { name: "이서준", eywaWithdrawnAt: null as Date | null } };
const UNIT = (id: string, taughtOn: string, orderIndex = 1) =>
  ({ id, grade: "중1", chapter: "c", section: "s-" + id, orderIndex, taughtOn });
const LECT = (id: string, unitId: string) =>
  ({ id, unitId, title: "t-" + id, videoUrl: "v", seconds: 100, sortOrder: 0, watch: null });
const DAY = 86_400_000;
function missDeps(store: ReturnType<typeof mem.createMemoryLoginStore>, now: Date) {
  return { store, now: () => now, comparePin: async () => false,
    missKey: (id: string) => pinh.studentLoginMissKey(id, "probe-secret"), audit: async () => {} };
}
/** 발급 규칙에 넣는 가짜 부품 — 이 원장(d1)의 반 학생, 퇴원 여부 · 계정 유무만 고른다 */
function fakeIssueDeps(withdrawn: boolean, hasAccount: boolean) {
  const acc = { id: "a1", studentId: "s1", loginId: "seo01", passwordHash: "h", mustChangePassword: false,
    issuedById: "d1", issuedAt: new Date(0), passwordChangedAt: null, lastLoginAt: null,
    disabledAt: new Date(0) as Date | null, failedCount: 0, lockedUntil: null as Date | null };
  return {
    findStudentOwner: async () => ({ ownerId: "d1", withdrawn }),
    findAccountByStudent: async () => (hasAccount ? acc : null),
    findAccountByLoginId: async () => null,
    createAccount: async (d: object) => ({ ...acc, ...d }),
    updateAccount: async (_id: string, d: object) => ({ ...acc, ...d }),
    generatePin: () => "5809",
    hashPin: async () => "hash",
    now: () => new Date(0),
    audit: async () => {},
    isUniqueViolation: () => false,
  } as never;
}
const LOCK_NOW = new Date("2026-09-15T05:00:00.000Z");
void sg; void lg; void access; void ab; void ss; void pls; void login; void mem; void pinh; void issue; void sl; void lock; void kst;
void W; void DONE; void ROW; void UNIT; void LECT; void DAY; void missDeps; void fakeIssueDeps; void LOCK_NOW;
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

const SEEK_FILE = "src/lib/learn/seekGuard.ts";
const PLAYER = "src/components/learn/LecturePlayer.tsx";
const GROUPS_FILE = "src/lib/learn/lectureGroups.ts";
const LIST_UI = "src/components/learn/LectureList.tsx";
const WATCH_UI = "src/components/learn/WatchScreen.tsx";
const ACCESS_FILE = "src/lib/learn/lectureAccess.ts";
const STUDENT_LECTURE = "src/lib/concept/studentLecture.ts";
const PANEL_UI = "src/components/class/StudentAccountPanel.tsx";
const STUDENT_LIST = "src/components/class/StudentList.tsx";
const PANEL_API = "src/lib/class/studentAccountApi.ts";
const ISSUE_FILE = "src/lib/learn/issueStudentAccount.ts";
const BLOCK_FILE = "src/lib/learn/accountBlock.ts";
const SESSION_FILE = "src/lib/learn/studentSession.ts";
const STORE_FILE = "src/lib/learn/prismaLoginStore.ts";
const LOGIN_FILE = "src/lib/learn/studentLogin.ts";
const PASSWORD_UI = "src/components/learn/StudentPasswordForm.tsx";
const LOCK_FILE = "src/lib/class/accountLock.ts";
const ISSUE_DEPS_FILE = "src/lib/learn/issueDeps.ts";
const KST_FILE = "src/lib/kstDate.ts";
const PW_PAGE_FILE = "src/app/learn/password/page.tsx";
const DAILY_ROUTE = "src/app/api/tests/daily-review/route.ts";

const ISSUED_PIN = L(
  "      setPin(result.data.initialPassword);",
  "      // 방금 이 원장님이 만든 계정이다 — 응답에 실린 칸만으로 상태를 세운다(마지막 로그인 없음)",
);
const withPin = (extra: string) =>
  L(
    "      setPin(result.data.initialPassword);",
    extra,
    "      // 방금 이 원장님이 만든 계정이다 — 응답에 실린 칸만으로 상태를 세운다(마지막 로그인 없음)",
  );

const MUTATIONS: Mutation[] = [
  // ── ① 앞으로 감기는 본 곳까지만 — 뒤로 · 배속은 된다 · 끝까지 본 영상은 어디든 ─────────
  {
    name: "①a 막대로 옮길 때 본 곳을 안 본다 (안 본 곳으로 감긴다)",
    file: SEEK_FILE,
    from: "  return clampSeek(safe, s.maxWatched);",
    to: "  return Math.max(0, safe);",
    probe: "sg.clampSeekTarget(120, W)",
    tests: [SEEK, SCREENS],
  },
  {
    name: "①b 끝까지 본 영상도 본 곳에서 막는다",
    file: SEEK_FILE,
    from: L(
      "  if (s.completed)",
      "    return Math.max(0, s.duration > 0 ? Math.min(safe, s.duration) : safe);",
      "",
    ),
    to: "",
    probe: "sg.clampSeekTarget(120, DONE)",
    tests: [SEEK, SCREENS],
  },
  {
    name: "①c 뒤로 감기를 막는다 (본 곳 밑은 본 곳으로 붙인다)",
    file: SEEK_FILE,
    from: "  return clampSeek(safe, s.maxWatched);",
    to: "  return safe < s.maxWatched ? s.maxWatched : clampSeek(safe, s.maxWatched);",
    probe: "sg.clampSeekTarget(5, W)",
    tests: [SEEK, SCREENS],
  },
  {
    name: "①d 감시 틱이 배속을 모른다 (2배속의 저절로 흐름을 감음으로 읽는다)",
    file: SEEK_FILE,
    from: "    Math.max(0, input.elapsedSeconds) * Math.max(0, input.rate) +",
    to: "    Math.max(0, input.elapsedSeconds) * 1 +",
    probe:
      "sg.playbackTick({ previous: 60, current: 63, elapsedSeconds: 1, rate: 2 }, W)",
    tests: [SEEK, SCREENS],
  },
  {
    name: "①e 감시 틱이 끝까지 본 영상도 되돌린다",
    file: SEEK_FILE,
    from: '  if (s.completed) return { kind: "advance", maxWatched: current };\n',
    to: "",
    probe:
      "sg.playbackTick({ previous: 10, current: 120, elapsedSeconds: 0.25, rate: 1 }, DONE)",
    tests: [SEEK],
  },
  {
    name: "①f 재생기 배선 — 막대가 가드를 안 부른다",
    file: PLAYER,
    from: "    const to = clampSeekTarget(target, seekRef.current);",
    to: "    const to = Math.max(0, target);",
    probe: null,
    tests: [SCREENS],
  },
  {
    name: "①g 재생기 배선 — 감시 틱에 배속을 안 넘긴다",
    file: PLAYER,
    from: "        rate: rateRef.current,",
    to: "        rate: 1,",
    probe: null,
    tests: [SCREENS],
  },
  // ── ② 초기 비밀번호는 그 화면에만 ─────────────────────────────────────────
  {
    name: "②a 발급 칸이 초기 비밀번호를 sessionStorage 에 적는다",
    file: PANEL_UI,
    from: ISSUED_PIN,
    to: withPin(
      '      sessionStorage.setItem("studentPin", result.data.initialPassword);',
    ),
    probe: null,
    tests: [PANEL],
  },
  {
    name: "②b 발급 칸이 초기 비밀번호를 콘솔에 남긴다",
    file: PANEL_UI,
    from: ISSUED_PIN,
    to: withPin(
      '      console.info("초기 비밀번호", result.data.initialPassword);',
    ),
    probe: null,
    tests: [PANEL],
  },
  {
    name: "②c 발급 칸이 초기 비밀번호를 주소에 싣는다",
    file: PANEL_UI,
    from: ISSUED_PIN,
    to: withPin(
      '      window.history.replaceState(null, "", `?pin=${result.data.initialPassword}`);',
    ),
    probe: null,
    tests: [PANEL],
  },
  {
    name: "②d 다른 학생을 골라도 칸이 새로 서지 않는다 (초기 비밀번호가 남는다)",
    file: STUDENT_LIST,
    from: "        <StudentAccountPanel key={pickedStudent.id} student={pickedStudent} />",
    to: "        <StudentAccountPanel student={pickedStudent} />",
    probe: null,
    tests: [PANEL],
  },
  // ── ③ 목록의 날짜 묶음 · «오늘» 표시 ──────────────────────────────────────
  {
    name: "③a 서버가 차시의 수업한 날을 가장 이른 날로 센다",
    file: ACCESS_FILE,
    from: "    if (seen === undefined || day > seen) dates.set(row.unitId, day);",
    to: "    if (seen === undefined || day < seen) dates.set(row.unitId, day);",
    probe:
      'Object.fromEntries(access.progressDatesOf([{ classId: "c", studentId: null, unitId: "u", recordedAt: new Date("2026-09-01") }, { classId: "c", studentId: null, unitId: "u", recordedAt: new Date("2026-09-12") }], { id: "me", classId: "c" }))',
    tests: [ACCESS, ROUTES],
  },
  {
    name: "③b «오늘» 표시가 날짜를 안 본다 (가장 최근 수업이면 오늘)",
    file: GROUPS_FILE,
    from: "    .map(([day, group]) => ({ day, isToday: day === today, units: group }));",
    to: "    .map(([day, group], i) => ({ day, isToday: i === 0, units: group }));",
    probe:
      'lg.groupLecturesByDay([UNIT("u1", "2026-09-15")], [LECT("l1", "u1")], "2026-09-16").map((g) => g.isToday)',
    tests: [GROUPS, SCREENS],
  },
  {
    name: "③c 학원 날짜에서 KST(+9시)를 뺀다",
    file: KST_FILE,
    from: "export const KST_OFFSET_MS = 9 * 3_600_000;",
    to: "export const KST_OFFSET_MS = 0;",
    probe: 'kst.kstDateOf(new Date("2026-09-15T15:00:00.000Z"))',
    tests: [KST_T],
  },
  {
    name: "③d 묶음을 오래된 날부터 세운다 (남색 판이 가장 옛 수업)",
    file: GROUPS_FILE,
    from: "    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))",
    to: "    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))",
    probe:
      'lg.groupLecturesByDay([UNIT("u1", "2026-09-10"), UNIT("u2", "2026-09-15", 2)], [LECT("l1", "u1"), LECT("l2", "u2")], "2026-09-15")[0].day',
    tests: [GROUPS, SCREENS],
  },
  {
    name: "③e 목록 화면이 오늘을 UTC 로 센다 (KST 새벽에 어제 수업이 «오늘»)",
    file: LIST_UI,
    from: "  const today = kstDateOf(now ?? new Date());",
    to: "  const today = (now ?? new Date()).toISOString().slice(0, 10);",
    probe: null,
    tests: [SCREENS],
  },
  {
    name: "③f 확인테스트가 «+9시간»을 다시 적는다 (셈이 두 곳 — 한쪽만 고치면 «오늘»이 갈린다, D-128 ⑷)",
    file: DAILY_ROUTE,
    from: "      : kstDateOf(new Date());",
    to: "      : new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10);",
    probe: null,
    tests: [KST_T],
  },
  // ── ④ 학생 화면에 AI 고지가 없다 ──────────────────────────────────────────
  {
    name: "④a 재생 화면에 «AI 보충 강의» 고지 줄을 싣는다 (수맥 재생기를 옮기다 딸려 온다)",
    file: WATCH_UI,
    from: "            <p className={s.note}>{seekNote(progress)}</p>",
    to: L(
      "            <p className={s.note}>{seekNote(progress)}</p>",
      "            <p className={s.note}>선생님이 검수한 AI 보충 강의입니다.</p>",
    ),
    probe: null,
    tests: [SCREENS],
  },
  {
    name: "④b 학생에게 가는 강의 모양에 고지를 싣는다",
    file: STUDENT_LECTURE,
    from: "    sortOrder: row.sortOrder,",
    to: L(
      "    sortOrder: row.sortOrder,",
      '    ...({ disclosure: "선생님이 검수한 AI 보충 강의입니다." } as object),',
    ),
    probe:
      'Object.keys(sl.toStudentLecture({ id: "a", unitId: "u", title: "t", videoUrl: "v", seconds: 1, sortOrder: 0, status: "published" }, null) ?? {})',
    tests: [ROUTES, SCREENS],
  },
  // ── ⑤ 발급 칸 — 두 상태 · 끈 계정 · 퇴원 · 남의 반 ─────────────────────────
  {
    name: "⑤a 퇴원 학생에게도 발급 칸을 그린다",
    file: PANEL_UI,
    from: "  if (withdrawn)",
    to: "  if (false as boolean)",
    probe: null,
    tests: [PANEL],
  },
  {
    name: "⑤b 끈 계정에도 «계정 끄기»를 그린다 (켜는 길이 없다)",
    file: PANEL_UI,
    from: L(
      "      <div className={s.acts}>",
      "        {account.disabledAt ? (",
    ),
    to: L("      <div className={s.acts}>", "        {false ? ("),
    probe: null,
    tests: [PANEL],
  },
  {
    name: "⑤c 남의 반 학생(403)에게도 칸을 그린다",
    file: PANEL_API,
    from: "    if ([401, 403, 404].includes(res.status))",
    to: "    if ([401, 404].includes(res.status))",
    probe: null,
    tests: [PANEL],
  },
  {
    name: "⑤d 서버가 발급 칸에 퇴원 여부를 안 싣는다",
    file: ISSUE_FILE,
    from: "  return { failure: null, withdrawn: owner.withdrawn };",
    to: "  return { failure: null, withdrawn: false };",
    probe:
      '(async () => { const r = await issue.readStudentAccount({ findStudentOwner: async () => ({ ownerId: "d1", withdrawn: true }), findAccountByStudent: async () => null } as never, { director: { id: "d1" }, studentId: "s1" }); return r.ok ? r.value.withdrawn : r.reason; })()',
    tests: [ISSUE],
  },
  {
    name: "⑤e 아이디를 자동으로 제안한다 (D-125 ⑵ — 원장님이 직접 적는다)",
    file: PANEL_UI,
    from: '  const [loginId, setLoginId] = useState("");',
    to: '  const [loginId, setLoginId] = useState("m1a-01");',
    probe: null,
    tests: [PANEL],
  },
  // ── ⑥ 퇴원 학생 — 꺼진 계정과 똑같이 ─────────────────────────────────────
  {
    name: "⑥a 막힘 판정이 퇴원을 안 본다",
    file: BLOCK_FILE,
    // D-127: 퇴원 쪽이 `studentWithdrawn` 으로 나뉘었다(발급 API 도 부른다) — 막힘 판정에서 그 부름을 뺀다
    from: "  return account.disabledAt !== null || studentWithdrawn(account);",
    to: "  return account.disabledAt !== null;",
    probe:
      "ab.studentAccountBlocked({ disabledAt: null, withdrawnAt: new Date(0) })",
    tests: [LOGIN, ROUTES, PIPELINE],
  },
  {
    name: "⑥b 학생 토큰이 퇴원을 안 넘긴다 (이미 든 세션이 계속 산다)",
    file: SESSION_FILE,
    from: "    withdrawnAt: row.student.eywaWithdrawnAt,",
    to: "    withdrawnAt: null,",
    probe:
      'ss.studentTokenFor("acc-1", async () => ({ ...ROW, student: { name: "이서준", eywaWithdrawnAt: new Date(0) } }))',
    tests: [PIPELINE, ROUTES],
  },
  {
    name: "⑥c 로그인 저장소가 퇴원을 안 넘긴다 (맞는 번호면 들어온다)",
    file: STORE_FILE,
    from: "    withdrawnAt: row.student.eywaWithdrawnAt,",
    to: "    withdrawnAt: null,",
    probe:
      'pls.toLoginAccount({ id: "a", studentId: "s", passwordHash: "h", mustChangePassword: false, disabledAt: null, failedCount: 0, lockedUntil: null, student: { eywaWithdrawnAt: new Date(0) } }).withdrawnAt',
    tests: [ROUTES],
  },
  // ── ⑦ 없는 아이디 실패 행 정리 ────────────────────────────────────────────
  {
    name: "⑦a 하루가 아니라 23시간 넘은 행을 지운다",
    file: LOGIN_FILE,
    from: "  staleAfterMs: 24 * 60 * 60 * 1000,",
    to: "  staleAfterMs: 23 * 60 * 60 * 1000,",
    probe: "login.STUDENT_LOGIN_MISS_CLEANUP.staleAfterMs",
    tests: [LOGIN, CLEANUP],
  },
  {
    name: "⑦b 하루가 아니라 25시간 넘은 행을 지운다",
    file: LOGIN_FILE,
    from: "  staleAfterMs: 24 * 60 * 60 * 1000,",
    to: "  staleAfterMs: 25 * 60 * 60 * 1000,",
    probe: "login.STUDENT_LOGIN_MISS_CLEANUP.staleAfterMs",
    tests: [LOGIN, CLEANUP],
  },
  {
    name: "⑦c 한 번에 100행이 아니라 1000행",
    file: LOGIN_FILE,
    from: "  maxRows: 100,",
    to: "  maxRows: 1000,",
    probe: "login.STUDENT_LOGIN_MISS_CLEANUP.maxRows",
    tests: [LOGIN, CLEANUP],
  },
  {
    name: "⑦d 없는 아이디 실패를 적을 때 정리를 안 부른다",
    file: LOGIN_FILE,
    from: "    await pruneStaleMisses(deps);\n",
    to: "",
    probe:
      '(async () => { const now = new Date(3 * DAY); const store = mem.createMemoryLoginStore({ now: () => now }); store.seedMiss("a".repeat(64), { failedCount: 1, lockedUntil: null, updatedAt: new Date(0) }); await login.attemptStudentLogin({ loginId: "ghost-id", pin: "0001" }, missDeps(store, now)); return store.missKeys().includes("a".repeat(64)); })()',
    tests: [LOGIN, CLEANUP],
  },
  {
    name: "⑦e Prisma 판이 가장 새 행부터 지운다",
    file: STORE_FILE,
    from: '        orderBy: { updatedAt: "asc" },',
    to: '        orderBy: { updatedAt: "desc" },',
    probe: null,
    tests: [CLEANUP],
  },
  // ── ⑧ 첫 로그인 «나가기» (D-127 Q1) ─────────────────────────────────────
  {
    name: "⑧a 첫 로그인 화면에서 나가기를 뺀다 (잘못 들어온 학생이 갇힌다)",
    file: PASSWORD_UI,
    from: "      <LearnTopBar student={studentName ? { name: studentName } : null} />\n",
    to: "",
    probe: null,
    tests: [SCREENS],
  },
  // ── ⑧b~d 첫 로그인 윗줄 이름 · 큰 로고 (D-128 — 원장님 답 17 ① · 18 ①) ──────────────
  {
    name: "⑧b 첫 로그인 윗줄에서 이름을 뺀다 (잘못 들어온 학생이 못 알아본다)",
    file: PASSWORD_UI,
    from: "student={studentName ? { name: studentName } : null}",
    to: "student={null}",
    probe: null,
    tests: [SCREENS, PW_PAGE],
  },
  {
    name: "⑧c 페이지가 세션 이름을 폼에 안 넘긴다",
    file: PW_PAGE_FILE,
    from: "studentName={student?.name ?? null}",
    to: "studentName={null}",
    probe: null,
    tests: [PW_PAGE],
  },
  {
    name: "⑧d 첫 로그인 화면에 큰 로고를 되살린다 («오늘 수학»이 두 번)",
    file: PASSWORD_UI,
    from: L(
      "      <main className={s.login}>",
      "        <p className={s.kick}>처음 들어왔습니다</p>",
    ),
    to: L(
      "      <main className={s.login}>",
      "        <div className={s.brand}>",
      "          <b>오늘 수학</b>",
      "          <span>오늘의 개념 · 학생</span>",
      "        </div>",
      "        <p className={s.kick}>처음 들어왔습니다</p>",
    ),
    probe: null,
    tests: [SCREENS],
  },
  // ── ⑨ 발급 칸 «잠김 — N분 뒤 풀림» (D-127 Q5) ────────────────────────────
  {
    name: "⑨a 끝난 잠금에도 줄이 선다 (지금보다 뒤인가를 안 본다)",
    file: LOCK_FILE,
    from: "  if (Number.isNaN(left) || left <= 0) return null;",
    to: "  if (Number.isNaN(left)) return null;",
    probe: 'lock.lockMinutesLeft("2026-09-15T04:59:59.000Z", LOCK_NOW)',
    tests: [LOCK_T, PANEL],
  },
  {
    name: "⑨b 남은 분을 내림한다 (끝 1초 전이 «0분 뒤 풀림»)",
    file: LOCK_FILE,
    from: "  return Math.ceil(left / MINUTE_MS);",
    to: "  return Math.floor(left / MINUTE_MS);",
    probe: 'lock.lockMinutesLeft("2026-09-15T05:00:01.000Z", LOCK_NOW)',
    tests: [LOCK_T, PANEL],
  },
  {
    name: "⑨c 다시 발급한 뒤에도 잠김 줄이 남는다",
    file: PANEL_UI,
    from: L(
      "        ...account,",
      "        mustChangePassword: true,",
      "        locked: false,",
      "        lockedUntil: null,",
    ),
    to: L(
      "        ...account,",
      "        mustChangePassword: true,",
      "        locked: false,",
    ),
    probe: null,
    tests: [PANEL],
  },
  {
    name: "⑨d 끈 계정에도 잠김 줄이 선다 (꺼짐 줄이 먼저가 아니다)",
    file: PANEL_UI,
    from: L(
      "        <p className={s.blocked}>계정 꺼짐 — 로그인 막힘</p>",
      "      ) : (",
      "        <LockLine lockedUntil={account.lockedUntil} />",
      "      )}",
    ),
    to: L(
      "        <p className={s.blocked}>계정 꺼짐 — 로그인 막힘</p>",
      "      ) : null}",
      "      <LockLine lockedUntil={account.lockedUntil} />",
    ),
    probe: null,
    tests: [PANEL],
  },
  // ── ⑨f~g 칸을 열어 둔 채 다시 센다 (D-128 ⑶ — 리드) ──────────────────────────
  {
    name: "⑨f 잠김 줄이 다시 세지 않는다 (칸을 열어 둔 채 N 이 안 줄고 끝난 잠금의 줄이 남는다)",
    file: PANEL_UI,
    from: "    const id = setTimeout(() => setNow(new Date()), wait);",
    to: "    const id = setTimeout(() => {}, wait);",
    probe: null,
    tests: [PANEL],
  },
  {
    name: "⑨g 다시 셀 때를 늘 1분 뒤로 잡는다 (분 가운데에 연 칸은 최대 1분 늦다)",
    file: LOCK_FILE,
    from: "  return left % MINUTE_MS || MINUTE_MS;",
    to: "  return MINUTE_MS;",
    probe: 'lock.lockLineNextChangeMs("2026-09-15T05:05:30.000Z", LOCK_NOW)',
    tests: [LOCK_T, PANEL],
  },
  {
    name: "⑨e 서버가 상태에 잠금 끝 시각을 안 싣는다",
    file: ISSUE_FILE,
    from: "    lockedUntil: iso(account.lockedUntil),",
    to: "    lockedUntil: null,",
    probe:
      'issue.toAccountStatus({ id: "a", studentId: "s", loginId: "l", passwordHash: "h", mustChangePassword: false, issuedById: null, issuedAt: new Date(0), passwordChangedAt: null, lastLoginAt: null, disabledAt: null, failedCount: 5, lockedUntil: new Date(600_000) }, new Date(0), "d").lockedUntil',
    tests: [ISSUE],
  },
  // ── ⑩ 퇴원 학생 발급 API 409 (D-127 · 리드 결정) ─────────────────────────
  {
    name: "⑩a 퇴원 학생에게도 발급한다",
    file: ISSUE_FILE,
    from: '  if (owned.withdrawn) return fail("withdrawn_issue");\n',
    to: "",
    probe:
      '(async () => { const r = await issue.issueStudentAccount(fakeIssueDeps(true, false), { director: { id: "d1" }, studentId: "s1", loginId: "seo01" }); return r.ok ? "issued" : r.reason; })()',
    tests: [ISSUE],
  },
  {
    name: "⑩b 퇴원 학생의 비밀번호를 다시 발급한다",
    file: ISSUE_FILE,
    from: '  if (owned.withdrawn) return fail("withdrawn_reissue");\n',
    to: "",
    probe:
      '(async () => { const r = await issue.reissueStudentPassword(fakeIssueDeps(true, true), { director: { id: "d1" }, studentId: "s1" }); return r.ok ? "reissued" : r.reason; })()',
    tests: [ISSUE],
  },
  {
    name: "⑩c 퇴원 학생의 계정을 켠다",
    file: ISSUE_FILE,
    from: '  if (owned.withdrawn && !input.disabled) return fail("withdrawn_enable");\n',
    to: "",
    probe:
      '(async () => { const r = await issue.setStudentAccountDisabled(fakeIssueDeps(true, true), { director: { id: "d1" }, studentId: "s1", disabled: false }); return r.ok ? "enabled" : r.reason; })()',
    tests: [ISSUE],
  },
  {
    name: "⑩d 퇴원 학생의 계정 끄기도 막는다 (막는 쪽까지 막는다)",
    file: ISSUE_FILE,
    from: '  if (owned.withdrawn && !input.disabled) return fail("withdrawn_enable");',
    to: '  if (owned.withdrawn) return fail("withdrawn_enable");',
    probe:
      '(async () => { const r = await issue.setStudentAccountDisabled(fakeIssueDeps(true, true), { director: { id: "d1" }, studentId: "s1", disabled: true }); return r.ok ? "disabled" : r.reason; })()',
    tests: [ISSUE],
  },
  {
    name: "⑩e 진짜 부품이 발급 규칙에 퇴원을 안 넘긴다",
    file: ISSUE_DEPS_FILE,
    from: L(
      "            withdrawn: studentWithdrawn({",
      "              withdrawnAt: student.eywaWithdrawnAt,",
      "            }),",
    ),
    to: "            withdrawn: false,",
    probe: null,
    tests: [ISSUE],
  },
  {
    name: "⑩f 퇴원 판정 함수가 퇴원을 모른다 (로그인 · 발급이 같이 샌다 — 판정은 한 곳)",
    file: BLOCK_FILE,
    from: "  return student.withdrawnAt !== null;",
    to: "  return false;",
    probe: "ab.studentWithdrawn({ withdrawnAt: new Date(0) })",
    tests: [LOGIN, ISSUE],
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
 * (`noRmSync.test.ts`) — 지우기가 `unlinkSync` 하나로 끝나게 파일로만 둔다. 옛 회차가 같은 이름을 남겼으면
 * 먼저 지운다 — 남은 리포트를 이번 결과로 읽지 않게(새 디렉터리가 하던 일).
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
  const out = tempFile("mutate-learn-", ".json");
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
  const needles = process.argv.slice(2);
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
