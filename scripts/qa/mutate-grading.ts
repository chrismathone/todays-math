/**
 * **채점 입력(D-134 트랙 1) 가드를 하나씩 꺼 빨개지는지 본다** —
 * 브리프 `tracks/briefs/grading-input.md` §3 «변이 하네스».
 *
 *   npx tsx scripts/qa/mutate-grading.ts            # 전량
 *   npx tsx scripts/qa/mutate-grading.ts ③ ⑥        # 이름 조각으로 고른다(여럿이면 어느 하나라도)
 *   npx tsx scripts/qa/mutate-grading.ts --anchors  # 시험 없이 앵커만 센다(몇 초)
 *
 * ## 판정 순서 — `mutate-plan-screen.ts` 와 같다 (러너를 그 파일에서 옮겨 왔다)
 *
 *   ㉠ 음성 대조 — 변이 **전에** 대상 시험이 초록인가. 아니면 전부 판정하지 않는다.
 *   ⑴ 앵커가 정확히 하나인가 — 아니면 판정 거부.
 *   ⑵ 파일이 바뀌었나.
 *   ⑶ **산출물이 바뀌었나** — 순수 함수(`gradeMarks` · `rollupScores`)는 tsx 탐침을 변이 전후로
 *      돌려 견준다. 화면·라우트처럼 모킹 없이 부를 수 없는 자리는 탐침이 없다(`probe: null`) —
 *      그때는 ⑷ 의 시험 **이름**으로만 빨강을 판정하고, 초록이면 «살아남음»이 아니라 **판정 보류**다.
 *   ⑷ 그제서야 시험이 빨개지나 — 실패한 시험 **이름**을 json 리포트에서 읽는다(2026-08-23 «도장»).
 *
 * ## 무리 — 브리프가 요구한 여섯에 넷을 더했다
 *
 *   ① 세 상태 구별(화면)   ② 빠진 학생 거절 + **이름**   ③ 결시 0점 금지   ④ `gradingMode` 배선
 *   ⑤ 일괄 단추 부재       ⑥ 소유 범위(D-130)            ⑦ 저장 잠금       ⑧ 전 문항 행
 *   ⑨ 배점 규칙 공유       ⑩ 결시 줄 잠금 · 초안 차단
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
  `.mutate-grading.probe.${process.pid}.ts`,
);

const T = (name: string) => `src/__tests__/${name}`;
const CONTRACT = T("unit/gradingContract.test.ts");
const API = T("api/gradingInput.test.ts");
const SCREEN = T("components/GradeSheet.test.tsx");
const SCOPE = T("api/adminSeesAll.test.ts");
const SUBMIT = T("api/testresult.test.ts");
const REVIEW = T("components/TestReview.test.tsx");

const SHEET_FILE = "src/lib/testResults/gradeSheet.ts";
const MARKS_FILE = "src/lib/testResults/gradeMarks.ts";
const ROLLUP_FILE = "src/lib/testResults/scoreRollup.ts";
const SCREEN_FILE = "src/components/test/GradeSheet.tsx";
const CONTRACT_FILE = "src/contracts/testresult.contract.ts";
const REVIEW_FILE = "src/components/test/TestReview.tsx";

/** tsx 탐침 머리 — 모든 tsx 탐침이 이 이름들을 쓴다 */
const PRELUDE = `
import * as gm from "../../src/lib/testResults/gradeMarks";
import * as sr from "../../src/lib/testResults/scoreRollup";
/** 배점 10 · 10 · 80 — 채점 픽스처(testResults.ts)와 같은 모양. 조정 배점 하나를 섞는다. */
const P = (id: string, score: number | null, adjusted: number | null, seq: number) => ({
  id, unitId: "u" + seq, difficulty: "기본" as const, answer: "1",
  score, adjustedScore: adjusted, sequence: seq,
});
const PROBLEMS = [P("p1", 10, null, 1), P("p2", 10, null, 2), P("p3", 80, 20, 3)];
/** 하나도 안 틀림 · 가운데만 틀림 · 조정 배점 문항을 틀림 — 셋을 한 줄로 낸다. */
const MARKS = () => [[], ["p2"], ["p3"]].map((w) => {
  const r = gm.gradeMarks(PROBLEMS, w);
  return [r.score, r.graded.map((g) => [g.problemId, g.isCorrect ? 1 : 0, g.maxPoints, g.selectedChoice, g.essayScore].join(":")).join("|")].join(" / ");
});
/** 만점 · 20점 · 결시 · 결시 아닌데 점수 없음 — 평균이 무엇을 빼는지 드러낸다. */
const ROLLUP = () => [
  sr.rollupScores([
    { score: 100, absent: false },
    { score: 20, absent: false },
    { score: null, absent: true },
    { score: null, absent: false },
  ]),
  /** 전원 결시 — 평균이 null 인가 0 인가. */
  sr.rollupScores([{ score: null, absent: true }]),
];
void gm; void sr; void MARKS; void ROLLUP;
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
  // ── ① 세 상태 구별 — 화면이 만드는 «세 번째 상태» ───────────────────────
  {
    name: "①a 아직 안 본 칸이 «맞음»으로 보인다 (○ 를 늘 그린다)",
    file: SCREEN_FILE,
    from: L(
      `                                {m.absent`,
      `                                  ? ""`,
      `                                  : wrong`,
      `                                    ? "✕"`,
      `                                    : m.done`,
      `                                      ? "○"`,
      `                                      : ""}`,
    ),
    to: L(
      `                                {m.absent ? "" : wrong ? "✕" : "○"}`,
    ),
    probe: null,
    tests: [SCREEN],
  },
  {
    name: "①b 접근성 이름이 «아직 안 봄»과 «맞음»을 안 가른다",
    file: SCREEN_FILE,
    from: L(
      `                          const label = m.absent`,
      `                            ? "결시"`,
      `                            : wrong`,
      `                              ? "틀림"`,
      `                              : m.done`,
      `                                ? "맞음"`,
      `                                : "아직 안 봄";`,
    ),
    to: L(
      `                          const label = m.absent`,
      `                            ? "결시"`,
      `                            : wrong`,
      `                              ? "틀림"`,
      `                              : "맞음";`,
    ),
    probe: null,
    tests: [SCREEN],
  },

  // ── ② 빠진 학생 거절 — 그리고 «이름» ───────────────────────────────────
  {
    name: "②a 빠진 학생이 있어도 저장한다 (거절을 건너뛴다)",
    file: SHEET_FILE,
    from: "  if (missing.length > 0) {",
    to: "  if (false && missing.length > 0) {",
    probe: null,
    tests: [API],
  },
  {
    name: "②b 서버가 이름 대신 «N명»을 돌려준다",
    file: SHEET_FILE,
    from: L(
      "      `아직 채점하지 않은 학생이 있습니다: ${missing",
      "        .map((s) => s.name)",
      "        .join(NAME_JOIN)}`,",
    ),
    to: "      `아직 채점하지 않은 학생이 ${missing.length}명 남았습니다.`,",
    probe: null,
    tests: [API],
  },
  {
    name: "②c 화면이 «몇 명 남음»만 적는다",
    file: SCREEN_FILE,
    from: "              : `아직 안 본 학생: ${pending.map((s) => s.name).join(NAME_JOIN)}`}",
    to: "              : `${pending.length}명 남았습니다.`}",
    probe: null,
    tests: [SCREEN],
  },

  // ── ③ 결시 0점 금지 ────────────────────────────────────────────────
  {
    name: "③a 서버가 결시를 0점으로 적는다",
    file: SHEET_FILE,
    from: L(
      "            absent: true,",
      "            score: null,",
      "            predictedScore: null,",
    ),
    to: L(
      "            absent: true,",
      "            score: 0,",
      "            predictedScore: 0,",
    ),
    probe: null,
    tests: [API],
  },
  {
    name: "③b 합산이 결시를 0점으로 센다 (`?? 0`)",
    file: ROLLUP_FILE,
    from: L(
      "  const scored = rows",
      "    .filter((r) => !r.absent && r.score !== null)",
      "    .map((r) => r.score as number);",
    ),
    to: "  const scored = rows.map((r) => r.score ?? 0);",
    probe: "ROLLUP()",
    tests: [API],
  },
  {
    name: "③c 잴 것이 없으면 평균을 0 으로 낸다",
    file: ROLLUP_FILE,
    from: "      scored.length === 0\n        ? null",
    to: "      scored.length === 0\n        ? 0",
    probe: "ROLLUP()",
    tests: [API],
  },
  {
    name: "③d 계약이 결시의 null 을 0 으로 뭉갠다",
    file: CONTRACT_FILE,
    from: L(
      "  score: z.number().nullable(),",
      "  /** 잠정 placeholder — src/lib/predictor/predictStudentScore.ts 참조. 결시면 null. */",
      "  predictedScore: z.number().nullable(),",
    ),
    to: L(
      "  score: z",
      "    .number()",
      "    .nullable()",
      "    .transform((v) => v ?? 0),",
      "  /** 잠정 placeholder — src/lib/predictor/predictStudentScore.ts 참조. 결시면 null. */",
      "  predictedScore: z",
      "    .number()",
      "    .nullable()",
      "    .transform((v) => v ?? 0),",
    ),
    probe: null,
    tests: [CONTRACT],
  },
  {
    name: "③e 결시에도 분석 리포트·응답 행을 만든다 (continue 를 걷는다)",
    file: SHEET_FILE,
    from: "        continue;",
    to: "        // continue 를 걷는다 — 결시가 아래 채점 갈래로 흘러간다",
    probe: null,
    tests: [API],
  },

  // ── ④ gradingMode 배선 ────────────────────────────────────────────
  {
    name: "④a 채점 방식을 answers 로 적는다 (전사와 구별이 사라진다)",
    file: SHEET_FILE,
    from: L(
      '          gradingMode: "marks",',
      "          absent: false,",
      "          score: row.score,",
    ),
    to: L(
      '          gradingMode: "answers",',
      "          absent: false,",
      "          score: row.score,",
    ),
    probe: null,
    tests: [API],
  },
  {
    name: "④b 옛 본문의 기본값이 marks 가 된다 (기존 /submit 의 뜻이 뒤집힌다)",
    file: CONTRACT_FILE,
    from: '  gradingMode: gradingModeSchema.default("answers"),',
    to: '  gradingMode: gradingModeSchema.default("marks"),',
    probe: null,
    tests: [CONTRACT, SUBMIT],
  },

  // ── ⑤ 일괄 단추 부재 ───────────────────────────────────────────────
  {
    name: "⑤ 「전원 응시」 일괄 단추를 만든다",
    file: SCREEN_FILE,
    from: "            <p className={`px-8 pb-3 ${NOTE}`}>",
    to: L(
      "            <button",
      '              type="button"',
      '              className="mx-8 mb-2 cursor-pointer border border-control px-2 py-1 text-[12px]"',
      "              onClick={() =>",
      "                setMarks((prev) => {",
      "                  const next = { ...prev };",
      "                  for (const s of students)",
      "                    next[s.studentId] = {",
      "                      done: true,",
      "                      absent: false,",
      "                      wrong: new Set<string>(),",
      "                    };",
      "                  return next;",
      "                })",
      "              }",
      "            >",
      "              전원 응시",
      "            </button>",
      "            <p className={`px-8 pb-3 ${NOTE}`}>",
    ),
    probe: null,
    tests: [SCREEN],
  },

  // ── ⑥ 소유 범위 (D-130) ────────────────────────────────────────────
  {
    name: "⑥a 저장이 소유 울타리를 늘 넘는다 (누구나 관리자)",
    file: SHEET_FILE,
    from: L(
      "  input: GradeSubmitRequest,",
      ") {",
      "  const owned = await requireOwnedTest(testId, session);",
    ),
    to: L(
      "  input: GradeSubmitRequest,",
      ") {",
      "  const owned = await requireOwnedTest(testId, {",
      "    ...session,",
      "    isAdmin: true,",
      "  });",
    ),
    probe: null,
    tests: [SCOPE, API],
  },
  {
    name: "⑥b 채점표 조회가 소유 울타리를 늘 넘는다",
    file: SHEET_FILE,
    from: L(
      "export async function loadGradeSheet(session: SessionUser, testId: string) {",
      "  const owned = await requireOwnedTest(testId, session);",
    ),
    to: L(
      "export async function loadGradeSheet(session: SessionUser, testId: string) {",
      "  const owned = await requireOwnedTest(testId, {",
      "    ...session,",
      "    isAdmin: true,",
      "  });",
    ),
    probe: null,
    tests: [SCOPE],
  },

  // ── ⑦ 저장 잠금 ────────────────────────────────────────────────────
  {
    name: "⑦ 미채점이 남아도 저장 단추가 열린다",
    file: SCREEN_FILE,
    from: "            disabled={students.length === 0 || pending.length > 0 || saving}",
    to: "            disabled={students.length === 0 || saving}",
    probe: null,
    tests: [SCREEN],
  },

  // ── ⑧ 전 문항 행 ───────────────────────────────────────────────────
  {
    name: "⑧ 틀린 문항만 응답 행을 만든다 (맞은 것은 행이 없다)",
    file: MARKS_FILE,
    from: "  const graded = problems.map((problem): GradedAnswer => {",
    to: "  const graded = problems\n    .filter((p) => wrong.has(p.id))\n    .map((problem): GradedAnswer => {",
    probe: "MARKS()",
    tests: [API],
  },

  // ── ⑨ 배점 규칙 공유 ───────────────────────────────────────────────
  {
    name: "⑨ 「틀린 번호만」 채점이 배점을 무시하고 균등 배분한다",
    file: MARKS_FILE,
    from: "    const maxPoints = maxPointsOf(problem, equalShare);",
    to: "    const maxPoints = equalShare;",
    probe: "MARKS()",
    tests: [API],
  },

  // ── ⑩ 결시 줄 잠금 · 초안 차단 ──────────────────────────────────────
  {
    name: "⑩a 결시 줄에서도 칸을 찍을 수 있다",
    file: SCREEN_FILE,
    from: L(
      '                                type="button"',
      "                                disabled={m.absent}",
      "                                onClick={() =>",
    ),
    to: L(
      '                                type="button"',
      "                                disabled={false}",
      "                                onClick={() =>",
    ),
    probe: null,
    tests: [SCREEN],
  },
  {
    name: "⑩b 초안 시험지에도 «채점» 단추가 보인다",
    file: REVIEW_FILE,
    from: "          {draft ? null : (",
    to: "          {false ? null : (",
    probe: null,
    tests: [REVIEW],
  },
  {
    name: "⑩c 서버가 초안 시험지의 채점을 받는다",
    file: SHEET_FILE,
    from: L(
      "  const owned = await requireOwnedTest(testId, session);",
      "  if (!owned.ok) return owned.response;",
      '  if (owned.data.status === "draft") {',
      '    return jsonError("VALIDATION_ERROR", DRAFT_MESSAGE, 422);',
      "  }",
      "",
      "  const [roster, testProblems] = await Promise.all([",
    ),
    to: L(
      "  const owned = await requireOwnedTest(testId, session);",
      "  if (!owned.ok) return owned.response;",
      "",
      "  const [roster, testProblems] = await Promise.all([",
    ),
    probe: null,
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
  const out = tempFile("mutate-grading-", ".json");
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
