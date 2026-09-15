/**
 * **오늘의 개념 이전(D-123 ⑥′ · D-124) 가드를 하나씩 꺼 빨개지는지 본다.**
 *
 *   npx tsx scripts/qa/mutate-concept-port.ts           # 전량
 *   npx tsx scripts/qa/mutate-concept-port.ts ⑤ ⑫     # 이름 조각으로 고른다(여럿이면 어느 하나라도)
 *
 * 브리프 §4 의 ①~⑥ + D-124 의 «권장 조건은 게시를 막지 않는다» + 이 이전에서 새로 생긴
 * 가드(학생 DTO · n/m 집계 · 차시를 지어내지 않는다) + D-125 의 «쉬운 번호 제외»(⑫)를 겨눈다.
 *
 * ## 판정 순서 — 20번 교훈 2026-08-20·08-21·08-23 그대로
 *
 *   ㉠ 음성 대조 — 변이 **전에** 대상 시험이 초록인가. 아니면 전부 판정하지 않는다.
 *   ⑴ 앵커가 정확히 하나인가 — 아니면 판정 거부(조용히 0건 치환하고 초록을 내지 않는다).
 *   ⑵ 파일이 바뀌었나.
 *   ⑶ **산출물이 바뀌었나** — 탐침(그 가드가 지키는 입력 하나)을 변이 전후로 돌려 같으면
 *      판정 거부. 파일이 바뀌어도 뜻이 안 바뀌면 «가드가 아니다»가 거짓말이 된다
 *      (2026-08-21 — 멀쩡한 가드를 의심하고 고치러 가는 것은 가드가 없는 것보다 나쁘다).
 *   ⑷ 그제서야 시험이 빨개지나 — 실패한 시험 **이름**을 json 리포트에서 읽는다. 빨간데
 *      이름을 못 대면 판정 거부(2026-08-23 — 러너가 안 뜬 것을 «빨강»으로 찍은 도장).
 *
 * 러너는 `node vitest.mjs` 로 부르고 `--maxWorkers=1` 을 준다 — 이 기계에서 오르카 다른 세션과
 * CPU 를 같이 쓰면 forks 워커가 못 뜬다(2026-09-15 실측 «Failed to start forks worker»).
 * 원복은 **바이트**로, `finally` 에서 무조건. 끝나고 md5 로 대조한다(다중 세션에서 남은 수정은
 * 남의 커밋에 실린다 — 2026-08-18).
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.cwd();
const VITEST = path.join(ROOT, "node_modules", "vitest", "vitest.mjs");
const TSX = path.join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");
// ⚠️ 경로에 PID 를 넣는다 — 두 세션이 같이 돌면 한쪽이 지운 탐침을 다른 쪽이 못 연다(mutate-one.py).
const PROBE = path.join(
  ROOT,
  "scripts",
  "qa",
  `.mutate-concept.probe.${process.pid}.ts`,
);

const LIB = "src/lib/concept";
const T = (name: string) => `src/__tests__/unit/${name}.test.ts`;

/** 탐침 머리 — 모든 탐침이 이 이름들을 쓴다. */
const PRELUDE = `
import * as yt from "../../${LIB}/youtube";
import * as meta from "../../${LIB}/lectureMeta";
import * as gate from "../../${LIB}/publishGate";
import * as watch from "../../${LIB}/watchRules";
import * as plan from "../../${LIB}/registerPlan";
import * as student from "../../${LIB}/studentLecture";
import * as summary from "../../${LIB}/watchSummary";
import * as pw from "../../${LIB}/initialPassword";
void yt; void meta; void gate; void watch; void plan; void student; void summary; void pw;
const READY = { title: "t", seconds: 10, videoUrl: "https://www.youtube.com/watch?v=aQkPcPqTq4M",
  disclosure: "d", sourceJobId: "j", reviewedAt: "2026-09-15T00:00:00Z" };
const M = (x: Record<string, unknown> = {}) => JSON.stringify({ jobId: "j", lessonTitle: "t",
  fps: 30, totalFrames: 900, unitCode: "J10101", ...x });
const UNITS = new Map([["J10101", "x"]]);
const ROW = { id: "0a8c2e1b-7a9d-4b5e-8f10-2b3c4d5e6f70", unitId: "3f0c8a8e-2f35-4e0b-9a55-1d7c0a4c2b11",
  title: "t", videoUrl: "https://www.youtube.com/watch?v=aQkPcPqTq4M", seconds: 10, sortOrder: 0,
  status: "published" as const, disclosure: "d", sourceJobId: "j", reviewedAt: new Date(0) };
const ROSTER = [{ id: "a", eywaWithdrawnAt: null }, { id: "b", eywaWithdrawnAt: null },
  { id: "c", eywaWithdrawnAt: null }, { id: "g", eywaWithdrawnAt: "2026-09-01" }];
const VIEWS = [{ studentId: "a", lectureId: "L", completedAt: "x" }, { studentId: "b", lectureId: "L", completedAt: null },
  { studentId: "c", lectureId: "M", completedAt: "x" }, { studentId: "g", lectureId: "L", completedAt: "x" },
  { studentId: "z", lectureId: "L", completedAt: "x" }];
void READY; void M; void UNITS; void ROW; void ROSTER; void VIEWS;
`;

interface Mutation {
  name: string;
  file: string;
  from: string;
  to: string;
  /** 그 가드가 지키는 입력 하나 — 변이 전후 산출물을 견준다(⑶) */
  probe: string;
  tests: string[];
}

const NL = "\n";

const MUTATIONS: Mutation[] = [
  // ── ① 유튜브 주소 — «경로 먼저» ────────────────────────────────────────
  {
    name: "① v 쿼리를 경로와 무관하게 먼저 읽는다 (수맥 실측 결함)",
    file: `${LIB}/youtube.ts`,
    from: "  if (!HOSTS.has(host)) return null;",
    to:
      "  if (!HOSTS.has(host)) return null;" +
      NL +
      '  const early = url.searchParams.get("v");' +
      NL +
      "  if (early && VIDEO_ID.test(early)) return early;",
    probe:
      'yt.parseYouTubeId("https://www.youtube.com/@someone?v=aQkPcPqTq4M")',
    tests: [T("conceptYoutube")],
  },
  // ── ② 시청 기록 — 뒤로 안 간다 ────────────────────────────────────────
  {
    name: "② 진도(%)가 뒤로 간다 — 되감아 보낸 낮은 값이 최고 기록을 덮는다",
    file: `${LIB}/watchRules.ts`,
    from: "  const nextPercent = prev ? Math.max(prev.percent, percent) : percent;",
    to: "  const nextPercent = percent;",
    probe:
      "watch.mergeWatchRecord({ maxSeconds: 100, percent: 80, completedAt: null }, { seconds: 10, percent: 8 }, new Date(0))",
    tests: [T("conceptWatchRules")],
  },
  {
    name: "②′ 본 최대 지점(초)이 뒤로 간다",
    file: `${LIB}/watchRules.ts`,
    from: "  const nextMax = prev ? Math.max(prev.maxSeconds, seconds) : seconds;",
    to: "  const nextMax = seconds;",
    probe:
      "watch.mergeWatchRecord({ maxSeconds: 100, percent: 80, completedAt: null }, { seconds: 10, percent: 8 }, new Date(0))",
    tests: [T("conceptWatchRules")],
  },
  // ── ③ 한 번 완료면 완료 ───────────────────────────────────────────────
  {
    name: "③ 완료 시각을 이어 쓰지 않는다 (coalesce 를 지운다)",
    file: `${LIB}/watchRules.ts`,
    from:
      "  const completedAt =" +
      NL +
      "    prev?.completedAt ?? (isWatchComplete(nextPercent) ? now : null);",
    to:
      "  const completedAt =" +
      NL +
      "    isWatchComplete(nextPercent) ? now : null;",
    probe:
      "watch.mergeWatchRecord({ maxSeconds: 125, percent: 97, completedAt: new Date(0) }, { seconds: 3, percent: 2 }, new Date(1000))",
    tests: [T("conceptWatchRules")],
  },
  // ── ④ 등록 계획 — 같은 잡 ID 는 건너뛴다 ──────────────────────────────
  {
    name: "④ 이미 있는 같은 잡 ID 를 건너뛰지 않는다",
    file: `${LIB}/registerPlan.ts`,
    from:
      "    const sameJob = meta.jobId" +
      NL +
      "      ? existing.find((e) => e.sourceJobId === meta.jobId)" +
      NL +
      "      : undefined;",
    to: "    const sameJob = undefined as ExistingLecture | undefined;",
    probe:
      'plan.planRegistration({ sources: [{ source: "a", raw: M({ video_url: "https://youtu.be/aQkPcPqTq4M" }) }], units: UNITS, existing: [{ id: "e", title: "t", status: "draft", sourceJobId: "j", videoUrl: null }] })',
    tests: [T("conceptRegisterPlan")],
  },
  {
    name: "④′ 한 회차 안의 같은 잡 ID 를 건너뛰지 않는다",
    file: `${LIB}/registerPlan.ts`,
    from: "    const jobInBatch = meta.jobId ? plannedJobs.get(meta.jobId) : undefined;",
    to: "    const jobInBatch = undefined as string | undefined;",
    probe:
      'plan.planRegistration({ sources: [{ source: "a", raw: M() }, { source: "b", raw: M() }], units: UNITS, existing: [] })',
    tests: [T("conceptRegisterPlan")],
  },
  // ── ⑤ 게시 관문 — 막는 조건 각각 + 권장 ────────────────────────────────
  {
    name: "⑤-제목 제목이 비어도 막지 않는다",
    file: `${LIB}/publishGate.ts`,
    from: '  if (isBlank(c.title)) blockers.push("title");',
    to: '  if (false as boolean) blockers.push("title");',
    probe: 'gate.checkPublish({ ...READY, title: " " })',
    tests: [T("conceptPublishGate")],
  },
  {
    name: "⑤-길이 길이가 0 이어도 막지 않는다",
    file: `${LIB}/publishGate.ts`,
    from: '  if (!(Number.isFinite(c.seconds) && c.seconds > 0)) blockers.push("seconds");',
    to: '  if (false as boolean) blockers.push("seconds");',
    probe: "gate.checkPublish({ ...READY, seconds: 0 })",
    tests: [T("conceptPublishGate")],
  },
  {
    name: "⑤-주소 주소 조건을 통째로 끈다 (없어도·유튜브가 아니어도 게시)",
    file: `${LIB}/publishGate.ts`,
    from:
      '  if (!url) blockers.push("video_missing");' +
      NL +
      '  else if (parseYouTubeId(url) === null) blockers.push("video_invalid");',
    to: "  void url;",
    probe: "gate.checkPublish({ ...READY, videoUrl: null })",
    tests: [T("conceptPublishGate")],
  },
  {
    name: "⑤-주소′ 유튜브 판정만 끈다 (vimeo 주소로 게시)",
    file: `${LIB}/publishGate.ts`,
    from: '  else if (parseYouTubeId(url) === null) blockers.push("video_invalid");',
    to: '  else if (false as boolean) blockers.push("video_invalid");',
    probe: 'gate.checkPublish({ ...READY, videoUrl: "https://vimeo.com/1" })',
    tests: [T("conceptPublishGate")],
  },
  {
    name: "⑤-고지 도구가 만든 강의에 고지가 없어도 막지 않는다",
    file: `${LIB}/publishGate.ts`,
    from:
      "  if (!isBlank(c.sourceJobId) && isBlank(c.disclosure))" +
      NL +
      '    blockers.push("disclosure");',
    to: "  if (false as boolean)" + NL + '    blockers.push("disclosure");',
    probe: "gate.checkPublish({ ...READY, disclosure: null })",
    tests: [T("conceptPublishGate")],
  },
  {
    name: "⑤-권장 끝까지 시청(권장)을 막는 쪽으로 옮긴다 — D-124 ⑻ 을 뒤집는 변이",
    file: `${LIB}/publishGate.ts`,
    from: '  if (c.reviewedAt == null) warnings.push("review");',
    to: '  if (c.reviewedAt == null) blockers.push("review" as PublishBlockerCode);',
    probe: "gate.checkPublish({ ...READY, reviewedAt: null })",
    tests: [T("conceptPublishGate")],
  },
  {
    name: "⑤-권장′ 끝까지 시청 알림을 지운다 (막지도 알리지도 않는다)",
    file: `${LIB}/publishGate.ts`,
    from: '  if (c.reviewedAt == null) warnings.push("review");',
    to: "  void warnings;",
    probe: "gate.checkPublish({ ...READY, reviewedAt: null })",
    tests: [T("conceptPublishGate")],
  },
  // ── ⑥ meta.json — 유튜브가 아닌 video_url 은 실패 ──────────────────────
  {
    name: "⑥ 유튜브가 아닌 video_url 을 조용히 비운다",
    file: `${LIB}/lectureMeta.ts`,
    from: "    if (videoUrl === null) {",
    to: "    if (false as boolean) {",
    probe:
      'meta.parseLectureMeta(JSON.stringify({ lessonTitle: "t", fps: 30, totalFrames: 900, video_url: "https://vimeo.com/1" }))',
    tests: [T("conceptLectureMeta"), T("conceptRegisterPlan")],
  },
  // ── 이 이전에서 새로 생긴 가드 (브리프 밖) ─────────────────────────────
  {
    name: "⑦ 차시 코드 형식이 틀린 unitCode 를 받아 준다",
    file: `${LIB}/lectureMeta.ts`,
    from: '    if (code === null || (code !== "" && !UNIT_CODE.test(code))) {',
    to: "    if (code === null) {",
    probe:
      'meta.parseLectureMeta(JSON.stringify({ lessonTitle: "t", fps: 30, totalFrames: 900, unitCode: "m1-prime" }))',
    tests: [T("conceptLectureMeta")],
  },
  {
    name: "⑧ unitCode 가 없으면 차시를 지어낸다 (첫 차시로)",
    file: `${LIB}/registerPlan.ts`,
    from: "    const unitCode = unitOverride ?? meta.unitCode;",
    to: "    const unitCode = unitOverride ?? meta.unitCode ?? [...units.keys()][0];",
    probe:
      'plan.planRegistration({ sources: [{ source: "a", raw: M({ unitCode: undefined }) }], units: UNITS, existing: [] })',
    tests: [T("conceptRegisterPlan")],
  },
  {
    name: "⑨ 학생 DTO 에 저장 행을 통째로 펼친다 (고지·잡 ID·시청 확인이 샌다)",
    file: `${LIB}/studentLecture.ts`,
    from: "    sortOrder: row.sortOrder,",
    to: "    sortOrder: row.sortOrder," + NL + "    ...row,",
    probe: "student.toStudentLecture(ROW, null)",
    tests: [T("conceptStudentLecture")],
  },
  {
    name: "⑨′ 초안·보관 강의도 학생에게 보낸다",
    file: `${LIB}/studentLecture.ts`,
    from: '  if (row.status !== "published" || row.videoUrl === null) return null;',
    to: "  if (row.videoUrl === null) return null;",
    probe:
      'student.toStudentLecture({ ...ROW, status: "draft" as const }, null)',
    tests: [T("conceptStudentLecture")],
  },
  {
    name: "⑩ n/m — 퇴원 학생을 분모에 넣는다",
    file: `${LIB}/watchSummary.ts`,
    from: "    roster.filter((s) => s.eywaWithdrawnAt == null).map((s) => s.id),",
    to: "    roster.map((s) => s.id),",
    probe: 'summary.countWatchedToEnd(ROSTER, VIEWS, "L")',
    tests: [T("conceptWatchSummary")],
  },
  {
    name: "⑩′ n/m — 다른 강의의 기록도 센다",
    file: `${LIB}/watchSummary.ts`,
    from: "      .filter((v) => v.lectureId === lectureId)" + NL,
    to: "",
    probe: 'summary.countWatchedToEnd(ROSTER, VIEWS, "L")',
    tests: [T("conceptWatchSummary")],
  },
  {
    name: "⑩″ n/m — 보다 만 학생도 센다",
    file: `${LIB}/watchSummary.ts`,
    from: "      .filter((v) => v.completedAt != null)" + NL,
    to: "",
    probe: 'summary.countWatchedToEnd(ROSTER, VIEWS, "L")',
    tests: [T("conceptWatchSummary")],
  },
  {
    name: "⑩‴ n/m — 반 밖 학생의 기록도 센다 (n 이 m 을 넘는다)",
    file: `${LIB}/watchSummary.ts`,
    from: "      .filter((v) => enrolled.has(v.studentId))" + NL,
    to: "",
    probe: 'summary.countWatchedToEnd(ROSTER, VIEWS, "L")',
    tests: [T("conceptWatchSummary")],
  },
  {
    name: "⑩⁗ n/m — 안 본 학생 목록에 끝까지 본 학생도 넣는다 (D-125 ⑹)",
    file: `${LIB}/watchSummary.ts`,
    from: "  const pending = [...enrolled].filter((id) => !watched.has(id));",
    to: "  const pending = [...enrolled];",
    probe: 'summary.countWatchedToEnd(ROSTER, VIEWS, "L")',
    tests: [T("conceptWatchSummary")],
  },
  {
    name: "⑪ 앞으로 감기를 막지 않는다 (틱이 되돌리지 않는다)",
    file: `${LIB}/watchRules.ts`,
    from: "  if (currentSeconds > maxWatchedSeconds + SEEK_JUMP_TOLERANCE_SECONDS) {",
    to: "  if (false as boolean) {",
    probe: "watch.watchTick(10, 5)",
    tests: [T("conceptWatchRules")],
  },
  {
    name: "⑪′ 옮기기가 본 최대 지점을 넘는다",
    file: `${LIB}/watchRules.ts`,
    from: "  return Math.max(0, Math.min(targetSeconds, maxWatchedSeconds));",
    to: "  return Math.max(0, targetSeconds);",
    probe: "watch.clampSeek(100, 50)",
    tests: [T("conceptWatchRules")],
  },
  {
    name: "⑪″ 끝까지 본 영상을 끝 지점에서 이어 보게 한다",
    file: `${LIB}/watchRules.ts`,
    from: "  if (watchedToEnd) return 0;",
    to: "  void watchedToEnd;",
    probe: "watch.resumePosition(129, 129)",
    tests: [T("conceptWatchRules")],
  },
  // ── ⑫ D-125 ⑶ 초기 비밀번호 — 숫자 4자리에서 쉬운 번호를 뺀다 ───────────
  {
    name: "⑫ 한 숫자 반복(0000·1111…)을 쉬운 번호로 안 본다",
    file: `${LIB}/initialPassword.ts`,
    from: "  const repeated = steps.every((s) => s === 0);",
    to: "  const repeated = false;",
    probe: 'pw.isEasyPin("1111")',
    tests: [T("conceptInitialPassword")],
  },
  {
    name: "⑫′ 오름 연속(0123·1234…)을 쉬운 번호로 안 본다",
    file: `${LIB}/initialPassword.ts`,
    from: "  const ascending = steps.every((s) => s === 1);",
    to: "  const ascending = false;",
    probe: 'pw.isEasyPin("0123")',
    tests: [T("conceptInitialPassword")],
  },
  {
    name: "⑫″ 내림 연속(9876·4321…)을 쉬운 번호로 안 본다",
    file: `${LIB}/initialPassword.ts`,
    from: "  const descending = steps.every((s) => s === -1);",
    to: "  const descending = false;",
    probe: 'pw.isEasyPin("9876")',
    tests: [T("conceptInitialPassword")],
  },
  {
    name: "⑫‴ 제외 규칙을 끈다 — 생성기가 쉬운 번호를 버리지 않는다",
    file: `${LIB}/initialPassword.ts`,
    from: "    if (!isEasyPin(pin)) return pin;",
    to: "    return pin;",
    probe:
      "pw.generateInitialPassword({ randomInt: ((q: number[]) => () => q.shift()!)([1111, 5809]) })",
    tests: [T("conceptInitialPassword")],
  },
  {
    name: "⑫⁗ 앞자리 0 을 버린다 (42 → 42, 네 자리가 아니다)",
    file: `${LIB}/initialPassword.ts`,
    from: '    const pin = String(draw(PIN_SPACE)).padStart(INITIAL_PASSWORD_LENGTH, "0");',
    to: "    const pin = String(draw(PIN_SPACE));",
    probe: "pw.generateInitialPassword({ randomInt: () => 42 })",
    tests: [T("conceptInitialPassword")],
  },
];

const md5 = (b: Buffer) => createHash("md5").update(b).digest("hex");

/** 탐침 산출물 — 실패하면 null(판정 거부로 이어진다) */
function probe(expr: string): string | null {
  writeFileSync(
    PROBE,
    `${PRELUDE}\nconsole.log(JSON.stringify((() => ${expr})()));\n`,
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

/** 시험을 돌려 (종료 코드, 실패한 시험 이름들) — 이름은 json 리포트에서 읽는다 */
function runTests(files: string[]): {
  code: number;
  failed: string[];
  readable: boolean;
} {
  const dir = mkdtempSync(path.join(os.tmpdir(), "mutate-concept-"));
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
        const before = probe(m.probe);
        writeFileSync(m.file, text.replace(from, to), "utf8");
        try {
          if (md5(readFileSync(m.file)) === md5(orig)) {
            why = "⑵ 파일이 안 바뀌었다";
          } else {
            const after = probe(m.probe);
            if (before === null || after === null) {
              why = `⑶ 탐침 산출물을 못 얻었다(전 ${before === null ? "실패" : "성공"} · 후 ${after === null ? "실패" : "성공"})`;
            } else if (before === after) {
              why = "⑶ 산출물이 그대로다 — 뜻이 안 바뀌었다";
            } else {
              const r = runTests(m.tests);
              failed = r.failed;
              if (r.code !== 0 && r.failed.length > 0) {
                verdict = "RED";
                why = `산출물 ${before} → ${after}`;
              } else if (r.code !== 0) {
                why = "⑷ 빨간데 실패한 시험을 못 댄다 — 러너가 안 떴을 수 있다";
              } else {
                verdict = "GREEN";
                why = `산출물 ${before} → ${after} 인데 시험이 초록`;
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

  // 되돌렸는지 **내가 변이한 파일만** 대조한다
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
