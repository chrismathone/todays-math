/**
 * **학생 계정·세션(student-auth) 가드를 하나씩 꺼 빨개지는지 본다** — 브리프
 * `tracks/briefs/todays-concept-student-auth.md` §4 «변이 시험: ①~⑥ 의 가드를 하나씩 끄면 빨개지는가».
 *
 *   npx tsx scripts/qa/mutate-student-auth.ts           # 전량
 *   npx tsx scripts/qa/mutate-student-auth.ts ③ ⑥      # 이름 조각으로 고른다(여럿이면 어느 하나라도)
 *
 * ## 판정 순서 — `mutate-concept-port.ts` 와 같다 (20번 교훈 2026-08-20·08-21·08-23)
 *
 *   ㉠ 음성 대조 — 변이 **전에** 대상 시험이 초록인가. 아니면 전부 판정하지 않는다.
 *   ⑴ 앵커가 정확히 하나인가 — 아니면 판정 거부.
 *   ⑵ 파일이 바뀌었나.
 *   ⑶ **산출물이 바뀌었나** — 탐침을 변이 전후로 돌려 같으면 판정 거부(2026-08-21).
 *   ⑷ 그제서야 시험이 빨개지나 — 실패한 시험 **이름**을 json 리포트에서 읽는다(2026-08-23 «도장»).
 *
 * ## 탐침 두 가지
 *
 *   - **tsx 식** — 순수 모듈(관문 규칙 · 로그인 핵심 · 발급 규칙 · 강의 판정 · 세션 모양)을 바로 부른다.
 *   - **vitest 탐침** — `src/lib/auth.ts` · `src/proxy.ts` 처럼 진짜 next-auth 를 타는 자리. tsx 로는
 *     next-auth 가 못 뜬다(`next/server` 를 확장자 없이 import — vitest.config.mts `server.deps.inline`).
 *     `src/__tests__/probes/*.probe.test.ts` 를 `STUDENT_AUTH_PROBE=1` 로 돌려, 탐침이 `STUDENT_AUTH_PROBE_OUT`
 *     파일에 적은 한 줄을 읽는다(vitest 가 통과한 시험의 콘솔을 보고서에 안 옮기는 때가 있어 파일로 받는다).
 *
 * 러너는 `--maxWorkers=1` — 이 기계는 오르카 다른 세션과 CPU 를 나눠 쓴다. 원복은 **바이트**로 `finally` 에서,
 * 끝나고 md5 로 대조한다(다중 세션에서 남은 수정은 남의 커밋에 실린다 — 2026-08-18).
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
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
  `.mutate-student-auth.probe.${process.pid}.ts`,
);

const T = (name: string) => `src/__tests__/${name}.test.ts`;
const PIPELINE = T("api/studentSessionPipeline");
const DIRECTOR = T("api/authDirectorUnchanged");
const SWEEP = T("api/studentSessionSweep");
const ISSUE = T("api/studentAccountIssue");
const ROUTES = T("api/learnRoutes");
const CONTRACT = T("unit/studentAccountContract");
const GATE = T("unit/studentRouteAccess");
const PROXY = T("unit/proxyStudentGate");
const LOGIN = T("unit/studentLogin");
const ACCESS = T("unit/learnLectureAccess");
const AUTH_PROBE = "src/__tests__/probes/studentAuthPipeline.probe.test.ts";
const PROXY_PROBE = "src/__tests__/probes/proxyStudent.probe.test.ts";

/** tsx 탐침 머리 — 모든 tsx 탐침이 이 이름들을 쓴다 */
const PRELUDE = `
import * as ss from "../../src/lib/learn/studentSession";
import * as gate from "../../src/lib/studentRouteAccess";
import * as login from "../../src/lib/learn/studentLogin";
import * as mem from "../../src/mocks/memoryLoginStore";
import * as pinh from "../../src/lib/learn/pinHash";
import * as sa from "../../src/contracts/studentAccount.contract";
import * as issue from "../../src/lib/learn/issueStudentAccount";
import * as access from "../../src/lib/learn/lectureAccess";
import * as wr from "../../src/lib/learn/watchReport";
const ROW = { id: "acc-1", studentId: "stu-1", disabledAt: null as Date | null,
  mustChangePassword: false, student: { name: "이서준" } };
function loginSetup() {
  const store = mem.createMemoryLoginStore();
  store.addAccount({ id: "acc", studentId: "stu", loginId: "seo01", passwordHash: "hash:5809",
    mustChangePassword: false, disabledAt: null });
  store.addAccount({ id: "off", studentId: "stu2", loginId: "off01", passwordHash: "hash:5809",
    mustChangePassword: false, disabledAt: new Date(0) });
  let now = new Date(0);
  const real: string[] = [];
  const deps: login.LoginDeps = { store, now: () => now,
    comparePin: async (p: string, h: string | null) => { if (h !== null) real.push(p);
      await Promise.resolve(); return h === "hash:" + p; },
    missKey: (id: string) => pinh.studentLoginMissKey(id, "probe-secret"), audit: async () => {} };
  const login1 = (id: string, p: string) => login.attemptStudentLogin({ loginId: id, pin: p }, deps);
  return { store, deps, real, login: login1, advance: (ms: number) => { now = new Date(now.getTime() + ms); } };
}
async function reasons(run: () => Promise<{ ok: boolean; reason?: string }>, n: number) {
  const out: string[] = [];
  for (let i = 0; i < n; i += 1) { const r = await run(); out.push(r.ok ? "ok" : String(r.reason)); }
  return out;
}
function issueHarness(owner = "d1") {
  const audits: unknown[] = []; const created: { passwordHash: string }[] = [];
  const deps: issue.IssueDeps = {
    findStudentOwner: async () => ({ ownerId: owner }),
    findAccountByStudent: async () => null, findAccountByLoginId: async () => null,
    createAccount: async (d) => { created.push(d); return { id: "acc", ...d, mustChangePassword: true,
      issuedAt: new Date(0), passwordChangedAt: null, lastLoginAt: null, disabledAt: null,
      failedCount: 0, lockedUntil: null }; },
    updateAccount: async () => { throw new Error("쓰지 않는다"); },
    generatePin: () => "7392", hashPin: async (p: string) => "h(" + p + ")", now: () => new Date(0),
    audit: async (e) => { audits.push(e); }, isUniqueViolation: () => false };
  return { deps, audits, created };
}
const ISSUE_INPUT = { directorId: "d1", studentId: "s1", loginId: "seo01" };
void ss; void gate; void login; void mem; void pinh; void sa; void issue; void access; void wr;
void ROW; void loginSetup; void reasons; void issueHarness; void ISSUE_INPUT;
`;

type Probe = { tsx: string } | { vitest: { file: string; name: string } };

interface Mutation {
  name: string;
  file: string;
  from: string;
  to: string;
  /** 그 가드가 지키는 입력 하나 — 변이 전후 산출물을 견준다(⑶) */
  probe: Probe;
  tests: string[];
}

const NL = "\n";
const L = (...lines: string[]) => lines.join(NL);

const SESSION = "src/lib/learn/studentSession.ts";
const AUTH = "src/lib/auth.ts";
const PROXY_FILE = "src/proxy.ts";
const GATE_FILE = "src/lib/studentRouteAccess.ts";
const LOGIN_FILE = "src/lib/learn/studentLogin.ts";
const CONTRACT_FILE = "src/contracts/studentAccount.contract.ts";
const ISSUE_FILE = "src/lib/learn/issueStudentAccount.ts";
const PIN_FILE = "src/lib/learn/pinHash.ts";
const ACCESS_FILE = "src/lib/learn/lectureAccess.ts";
const WATCH_FILE = "src/lib/learn/watchReport.ts";

const SESSION_RETURN =
  "  return { user: undefined, expires: session.expires, student: token.student };";
const JWT_REFRESH = L(
  "      if (isStudentToken(token))",
  "        return studentTokenFor(",
  "          token.student?.accountId,",
  "          loadStudentAccountForToken,",
  "        );",
  "",
);

const MUTATIONS: Mutation[] = [
  // ── ① 원장 로그인·세션이 그대로 ──────────────────────────────────────
  {
    name: "① 학생 판정을 «id 가 없으면 학생»으로 — role·id 없는 옛 원장 토큰이 학생 갈래로 샌다",
    file: SESSION,
    from: '  return typeof token.student === "object" && token.student !== null;',
    to: '  return typeof token.id !== "string";',
    probe: {
      tsx: 'ss.isStudentToken({ sub: "u1", name: "선생님", email: "t@example.test" })',
    },
    tests: [DIRECTOR],
  },
  // ── ② 학생 세션은 «로그인 안 한 사람» ─────────────────────────────────
  {
    name: "②a 학생 세션에서 user: undefined 를 뺀다 — next-auth 의 겹이 토큰을 user 로 씌운다",
    file: SESSION,
    from: SESSION_RETURN,
    to: "  return { expires: session.expires, student: token.student } as Session;",
    probe: {
      tsx: 'Object.keys(ss.studentSessionFrom({ expires: "x", user: { name: "n" } } as never, { student: { accountId: "a" } } as never))',
    },
    tests: [PIPELINE],
  },
  {
    name: "②b 학생 토큰에 id 를 싣는다",
    file: SESSION,
    from: L("  return {", "    student: {", "      accountId: row.id,"),
    to: L(
      "  return {",
      "    id: row.id,",
      "    student: {",
      "      accountId: row.id,",
    ),
    probe: { tsx: 'ss.studentTokenFor("acc-1", async () => ROW)' },
    tests: [PIPELINE],
  },
  {
    name: "②c jwt 콜백에서 학생 토큰 갈래를 지운다 — 학생 토큰이 원장 갈래를 탄다",
    file: AUTH,
    from: JWT_REFRESH,
    to: "",
    probe: { vitest: { file: AUTH_PROBE, name: "auth-student-session" } },
    tests: [PIPELINE],
  },
  {
    name: "②d session 콜백에서 학생 갈래를 지운다 — Auth.js 기본 user 가 남는다",
    file: AUTH,
    from: "      if (isStudentToken(token)) return studentSessionFrom(session, token);\n",
    to: "",
    probe: { vitest: { file: AUTH_PROBE, name: "auth-student-session" } },
    tests: [PIPELINE],
  },
  {
    name: "②f 학생 세션에 user.id(승인된 원장 모양)를 싣는다 — 기존 API 가 학생에게 열린다",
    file: SESSION,
    from: SESSION_RETURN,
    to: '  return { user: { id: token.student?.accountId ?? "", role: "director", isAdmin: false, approvalStatus: "approved", menus: [] }, expires: session.expires, student: token.student } as Session;',
    probe: {
      tsx: 'ss.studentSessionFrom({ expires: "x" } as never, { student: { accountId: "a" } } as never)',
    },
    tests: [SWEEP],
  },
  // ── ③ 관문 — 허용 목록 밖은 막힌다 ────────────────────────────────────
  {
    name: "③a 관문에서 학생 갈래를 지운다 — 학생이 «로그인 안 한 사람» 갈래로 흘러간다",
    file: PROXY_FILE,
    from: L(
      "  if (student)",
      "    return learnGateResponse(",
      "      studentGateFor(student.mustChangePassword, req.method, pathname),",
      "      req.nextUrl,",
      "    );",
    ),
    to: "  void student;",
    probe: { vitest: { file: PROXY_PROBE, name: "proxy-student" } },
    tests: [PROXY],
  },
  {
    name: "③b 첫 로그인 표시를 무시한다 — 비밀번호를 안 바꾼 학생에게 강의가 열린다",
    file: GATE_FILE,
    from: "allowedBy(mustChangePassword ? MUST_CHANGE : ACTIVE, m, path)",
    to: "allowedBy(ACTIVE, m, path)",
    probe: { tsx: 'gate.studentGateFor(true, "GET", "/api/learn/lectures")' },
    tests: [GATE, PROXY],
  },
  {
    name: "③c 막힌 API 에 403 대신 화면 되돌림을 준다",
    file: GATE_FILE,
    from: "  if (isApi(path)) {",
    to: "  if (false as boolean) {",
    probe: { tsx: 'gate.studentGateFor(false, "GET", "/api/problems")' },
    tests: [GATE, PROXY],
  },
  {
    name: "③d 재생 화면 규칙을 /learn/** 로 넓힌다",
    file: GATE_FILE,
    from: '"/learn/watch/{id}"',
    to: '"/learn/**"',
    probe: { tsx: 'gate.studentGateFor(false, "GET", "/learn/watch/a/b")' },
    tests: [GATE, PROXY],
  },
  {
    name: "③e 로그인 안 한 사람의 /learn/login 을 막는다 (되돌림이 돈다)",
    file: GATE_FILE,
    from: '  if (path === STUDENT_LOGIN_PAGE) return { kind: "allow" };\n',
    to: "",
    probe: { tsx: 'gate.anonymousLearnGate("GET", "/learn/login")' },
    tests: [GATE, PROXY],
  },
  // ── ④ 꺼진 계정·지워진 학생은 다음 요청에서 끊긴다 ─────────────────────
  {
    name: "④a 토큰을 지을 때 꺼짐(disabledAt)을 안 본다",
    file: SESSION,
    from: "  if (!row || row.disabledAt !== null || !row.student) return null;",
    to: "  if (!row || !row.student) return null;",
    probe: {
      tsx: 'ss.studentTokenFor("acc-1", async () => ({ ...ROW, disabledAt: new Date(0) }))',
    },
    tests: [PIPELINE],
  },
  {
    name: "④b 요청마다 계정을 다시 읽지 않고 토큰을 그대로 돌려준다",
    file: AUTH,
    from: JWT_REFRESH,
    to: "      if (isStudentToken(token)) return token;\n",
    probe: { vitest: { file: AUTH_PROBE, name: "auth-student-after-disable" } },
    tests: [PIPELINE],
  },
  // ── ⑤ 남의 반 학생 발급 거부 ─────────────────────────────────────────
  {
    name: "⑤ 반 소유자를 안 본다 — 남의 반 학생에게도 발급한다",
    file: ISSUE_FILE,
    from: '  if (owner.ownerId !== directorId) return "not_owner";\n',
    to: "",
    probe: {
      tsx: '(async () => { const h = issueHarness("someone-else"); const r = await issue.issueStudentAccount(h.deps, ISSUE_INPUT); return r.ok ? "issued" : r.reason; })()',
    },
    tests: [ISSUE],
  },
  // ── ⑥ 초기 비밀번호는 평문으로 안 남는다 ─────────────────────────────
  {
    name: "⑥a 발급 감사 기록에 초기 비밀번호를 싣는다",
    file: ISSUE_FILE,
    from: L(
      "  await deps.audit(",
      '    auditFor("student_account.issue", input.directorId, account),',
      "  );",
    ),
    to: L(
      "  await deps.audit({",
      '    ...auditFor("student_account.issue", input.directorId, account),',
      "    details: {",
      '      ...auditFor("student_account.issue", input.directorId, account).details,',
      "      initial: initialPassword,",
      "    },",
      "  } as AccountAuditEntry);",
    ),
    probe: {
      tsx: "(async () => { const h = issueHarness(); await issue.issueStudentAccount(h.deps, ISSUE_INPUT); return h.audits; })()",
    },
    tests: [ISSUE],
  },
  {
    name: "⑥b 초기 비밀번호를 해시 없이 저장한다",
    file: ISSUE_FILE,
    from: "  const passwordHash = await deps.hashPin(initialPassword);",
    to: "  const passwordHash = initialPassword;",
    probe: {
      tsx: "(async () => { const h = issueHarness(); await issue.issueStudentAccount(h.deps, ISSUE_INPUT); return h.created.map((c) => c.passwordHash); })()",
    },
    tests: [ISSUE],
  },
  {
    name: "⑥c 없는 아이디를 열쇠 없이 글자 그대로 적는다",
    file: PIN_FILE,
    from: L(
      '  return createHmac("sha256", secret)',
      "    .update(`student-login-miss:${normalizedLoginId}`)",
      '    .digest("hex");',
    ),
    to: L("  void createHmac;", "  return normalizedLoginId;"),
    probe: { tsx: 'pinh.studentLoginMissKey("ghost-id", "probe-secret")' },
    tests: [LOGIN, PIPELINE],
  },
  // ── 잠금 (D-125 ⑶) ────────────────────────────────────────────────
  {
    name: "잠금-1 연속 실패 문턱을 6으로",
    file: CONTRACT_FILE,
    from: "  maxFailures: 5,",
    to: "  maxFailures: 6,",
    probe: { tsx: "sa.STUDENT_LOGIN_LOCK.maxFailures" },
    tests: [CONTRACT, LOGIN],
  },
  {
    name: "잠금-2 잠금 시간을 5분으로",
    file: CONTRACT_FILE,
    from: "  lockMs: 10 * 60 * 1000,",
    to: "  lockMs: 5 * 60 * 1000,",
    probe: { tsx: "sa.STUDENT_LOGIN_LOCK.lockMs" },
    tests: [CONTRACT, LOGIN],
  },
  {
    name: "잠금-3 성공해도 실패 수를 0 으로 안 한다",
    file: LOGIN_FILE,
    from: L(
      "  if (ok && hash !== null) {",
      "    await store.clearFailures(slot);",
      '    return "ok";',
    ),
    to: L("  if (ok && hash !== null) {", '    return "ok";'),
    probe: {
      tsx: '(async () => { const t = loginSetup(); await reasons(() => t.login("seo01", "0001"), 4); await t.login("seo01", "5809"); return t.store.accountLock("acc").failedCount; })()',
    },
    tests: [LOGIN],
  },
  {
    name: "잠금-4 없는 아이디는 세지도 잠그지도 않는다 (잠금 문구가 아이디 존재를 흘린다)",
    file: LOGIN_FILE,
    from: L(
      "    const result = await guardedCheck(",
      '      { kind: "miss", key },',
      "      state,",
      "      null,",
      "      input.pin,",
      "      deps,",
      "    );",
    ),
    to: L('    const result = "invalid" as PinCheck;', "    void state;"),
    probe: {
      tsx: '(async () => { const t = loginSetup(); return reasons(() => t.login("ghost-id", "0001"), 7); })()',
    },
    tests: [LOGIN],
  },
  {
    name: "잠금-5 다섯을 넘긴 시도도 번호를 대 본다 (동시 요청이 문턱을 넘는다)",
    file: LOGIN_FILE,
    from: L(
      "  if (attempt > STUDENT_LOGIN_LOCK.maxFailures) {",
      "    await store.lock(slot, until);",
      "    await deps.comparePin(pin, null);",
      '    return "locked";',
      "  }",
      "",
    ),
    to: "",
    probe: {
      tsx: '(async () => { const t = loginSetup(); await Promise.all(Array.from({ length: 20 }, (_, i) => t.login("seo01", String(1000 + i)))); return t.real.length; })()',
    },
    tests: [LOGIN],
  },
  {
    name: "잠금-6 꺼진 계정도 맞는 번호면 들인다",
    file: LOGIN_FILE,
    from: "  const hash = account.disabledAt === null ? account.passwordHash : null;",
    to: "  const hash = account.passwordHash;",
    probe: {
      tsx: '(async () => { const t = loginSetup(); return (await t.login("off01", "5809")).ok; })()',
    },
    tests: [LOGIN],
  },
  {
    name: "잠금-7 새 번호에 쉬운 번호를 받는다 (발급과 변경이 갈린다)",
    file: CONTRACT_FILE,
    from: "  (pin) => !isEasyPin(pin),",
    to: "  (pin) => pin.length > 0 || isEasyPin(pin),",
    probe: { tsx: 'sa.studentNewPinSchema.safeParse("1234").success' },
    tests: [CONTRACT, ROUTES],
  },
  // ── 강의 판정 (D-125 ⑸ · 목록과 기록이 같은 판정) ───────────────────────
  {
    name: "강의-1 진도에 있던 차시인지 안 본다 (앞선 차시·남의 학년 강의가 열린다)",
    file: ACCESS_FILE,
    from: "    progressUnitIds.has(lecture.unitId)",
    to: "    progressUnitIds.size >= 0",
    probe: {
      tsx: 'access.lectureOpenToStudent({ status: "published", unitId: "u9", videoUrl: "v" }, new Set(["u1"]))',
    },
    tests: [ACCESS, ROUTES],
  },
  {
    name: "강의-2 게시 여부를 안 본다 (초안·보관이 열린다)",
    file: ACCESS_FILE,
    from: '    lecture.status === "published" &&',
    to: '    lecture.status !== ("?" as string) &&',
    probe: {
      tsx: 'access.lectureOpenToStudent({ status: "draft", unitId: "u1", videoUrl: "v" }, new Set(["u1"]))',
    },
    tests: [ACCESS, ROUTES],
  },
  {
    name: "강의-3 남의 개인 진도도 센다",
    file: ACCESS_FILE,
    from: "    const ownProgress = row.studentId === student.id;",
    to: "    const ownProgress = row.studentId !== null;",
    probe: {
      tsx: '[...access.progressUnitIdsOf([{ classId: "c", studentId: "other", unitId: "u7" }], { id: "me", classId: "c" })]',
    },
    tests: [ACCESS, ROUTES],
  },
  // ── 시청 % 는 서버가 센다 (브리프 §7) ──────────────────────────────────
  {
    name: "시청-1 영상 길이를 넘는 지점을 접지 않는다",
    file: WATCH_FILE,
    from: "  const within = lectureSeconds > 0 ? Math.min(seen, lectureSeconds) : seen;",
    to: "  const within = seen;",
    probe: { tsx: "wr.recordWatchReport(null, 139, 9999, new Date(0))" },
    tests: [ROUTES],
  },
  {
    name: "시청-2 %를 본 지점에서 세지 않는다",
    file: WATCH_FILE,
    from: "    { seconds: within, percent: watchPercent(maxSeconds, lectureSeconds) },",
    to: "    { seconds: within, percent: 100 },",
    probe: { tsx: "wr.recordWatchReport(null, 139, 100, new Date(0))" },
    tests: [ROUTES],
  },
];

const md5 = (b: Buffer) => createHash("md5").update(b).digest("hex");

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
    rmSync(PROBE, { force: true });
  }
}

function vitestProbe(file: string, name: string): string | null {
  const dir = mkdtempSync(path.join(os.tmpdir(), "mutate-student-probe-"));
  const out = path.join(dir, "probe.jsonl");
  try {
    spawnSync(
      process.execPath,
      [VITEST, "run", file, "--maxWorkers=1", "-t", name],
      {
        cwd: ROOT,
        encoding: "utf8",
        env: {
          ...process.env,
          STUDENT_AUTH_PROBE: "1",
          STUDENT_AUTH_PROBE_OUT: out,
        },
      },
    );
    if (!existsSync(out)) return null;
    const hit = readFileSync(out, "utf8")
      .trim()
      .split(NL)
      .filter(Boolean)
      .map((l) => JSON.parse(l) as { name: string; value: unknown })
      .find((l) => l.name === name);
    return hit ? JSON.stringify(hit.value) : null;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const runProbe = (p: Probe) =>
  "tsx" in p ? tsxProbe(p.tsx) : vitestProbe(p.vitest.file, p.vitest.name);

/** 시험을 돌려 (종료 코드, 실패한 시험 이름들) — 이름은 json 리포트에서 읽는다 */
function runTests(files: string[]): {
  code: number;
  failed: string[];
  readable: boolean;
} {
  const dir = mkdtempSync(path.join(os.tmpdir(), "mutate-student-"));
  const out = path.join(dir, "r.json");
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
    rmSync(dir, { recursive: true, force: true });
  }
}

type Verdict = "RED" | "GREEN" | "REFUSE";

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
        const before = runProbe(m.probe);
        writeFileSync(m.file, text.replace(from, to), "utf8");
        try {
          if (md5(readFileSync(m.file)) === md5(orig)) {
            why = "⑵ 파일이 안 바뀌었다";
          } else {
            const after = runProbe(m.probe);
            if (before === null || after === null) {
              why = `⑶ 탐침 산출물을 못 얻었다(전 ${before === null ? "실패" : "성공"} · 후 ${after === null ? "실패" : "성공"})`;
            } else if (before === after) {
              why = `⑶ 산출물이 그대로다 — 뜻이 안 바뀌었다 (${before})`;
            } else {
              const r = runTests(m.tests);
              failed = r.failed;
              const short = (s: string) =>
                s.length > 90 ? `${s.slice(0, 87)}...` : s;
              if (r.code !== 0 && r.failed.length > 0) {
                verdict = "RED";
                why = `산출물 ${short(before)} → ${short(after)}`;
              } else if (r.code !== 0) {
                why = "⑷ 빨간데 실패한 시험을 못 댄다 — 러너가 안 떴을 수 있다";
              } else {
                verdict = "GREEN";
                why = `산출물 ${short(before)} → ${short(after)} 인데 시험이 초록`;
              }
            }
          }
        } finally {
          writeFileSync(m.file, orig);
        }
      }
      results.push({ name: m.name, verdict, why, failed });
      const mark =
        verdict === "RED"
          ? "🟥 빨개짐"
          : verdict === "GREEN"
            ? "🟩 살아남음(가드 아님)"
            : "⛔ 판정 거부";
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

  const red = results.filter((r) => r.verdict === "RED").length;
  const green = results.filter((r) => r.verdict === "GREEN");
  const refused = results.filter((r) => r.verdict === "REFUSE");
  console.log("");
  console.log(
    `  빨개짐 ${red}/${results.length} · 살아남음 ${green.length} · 판정 거부 ${refused.length}`,
  );
  for (const g of green) console.log(`    🟩 ${g.name}`);
  for (const r of refused) console.log(`    ⛔ ${r.name} — ${r.why}`);
  console.log(
    restored
      ? "  변이한 파일 전부 원본과 일치 ✓"
      : "  🔴 원본과 다른 파일이 있다 — 손으로 확인하라",
  );
  return restored && green.length === 0 && refused.length === 0 ? 0 : 1;
}

process.exitCode = main();
