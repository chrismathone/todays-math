/**
 * **오늘의 개념 원장님 메뉴(concept-admin-ui) 가드를 하나씩 꺼 빨개지는지 본다** (브리프 §3 변이 시험).
 *
 *   npx tsx scripts/qa/mutate-concept-admin.ts           # 전량
 *   npx tsx scripts/qa/mutate-concept-admin.ts ① ③      # 이름 조각으로 고른다
 *
 * 브리프 §3 의 ① 관리자가 아니면 쓰기 단추·API 가 막힌다 ② 남의 반은 안 보인다 ③ n/m 과 안 본
 * 이름 수가 같다 — 셋의 가드를 하나씩 끈다. 덤으로 리드 결정 §5(전이 규칙)의 가드 셋.
 *
 * ## 판정 순서 — `mutate-concept-port.ts` 와 같다(20번 교훈 2026-08-20·08-21·08-23)
 *
 *   ㉠ 음성 대조 — 변이 **전에** 대상 시험이 초록인가. 아니면 전부 판정하지 않는다.
 *   ⑴ 앵커가 정확히 하나인가 — 아니면 판정 거부.
 *   ⑵ 파일이 바뀌었나.
 *   ⑶ **산출물이 바뀌었나** — 순수 함수 가드는 탐침으로 변이 전후를 견준다. 라우트·화면 가드는
 *      탐침이 없다(모킹 없이 부를 수 없다) — 그 경우 ⑶ 을 건너뛰고 ⑷ 의 **시험 이름**으로만
 *      빨강을 판정한다. 탐침 없이 초록이면 «살아남음»이라 부르지 않고 **판정 보류**로 둔다
 *      (변이가 뜻을 안 바꿨는지 가드가 없는지 가를 수 없다 — 2026-08-21 교훈).
 *   ⑷ 시험이 빨개지나 — 실패한 시험 **이름**을 json 리포트에서 읽는다.
 *
 * 원복은 바이트로, `finally` 에서 무조건. 끝나고 md5 로 대조한다.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.cwd();
const VITEST = path.join(ROOT, "node_modules", "vitest", "vitest.mjs");
const TSX = path.join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");
const PROBE = path.join(
  ROOT,
  "scripts",
  "qa",
  `.mutate-concept-admin.probe.${process.pid}.ts`,
);

const API = "src/__tests__/api/conceptAdmin.test.ts";
const UI = "src/__tests__/components/ConceptView.test.tsx";
const BOARD_T = "src/__tests__/unit/conceptAdminBoard.test.ts";
const TRANS_T = "src/__tests__/unit/conceptLectureTransition.test.ts";

const PRELUDE = `
import * as board from "../../src/lib/concept/adminBoard";
import * as tr from "../../src/lib/concept/lectureTransition";
import * as contract from "../../src/contracts/conceptAdmin.contract";
void board; void tr; void contract;
const BOARD = {
  classes: [{ id: "c", name: "A반", grade: "중1" }],
  students: [
    { id: "a", name: "가", classId: "c", eywaWithdrawnAt: null },
    { id: "b", name: "나", classId: "c", eywaWithdrawnAt: null },
    { id: "w", name: "퇴", classId: "c", eywaWithdrawnAt: "2026-09-01T00:00:00.000Z" },
  ],
  latestProgress: [{ classId: "c", unitId: "u1", recordedAt: "2026-09-15" }],
  units: [{ id: "u1", grade: "중1", chapter: "1", section: "s1", code: "J10101", orderIndex: 1 }],
  lectures: [{ id: "L", unitId: "u1", status: "published" as const, sortOrder: 0 }],
  views: [{ studentId: "a", lectureId: "L", completedAt: "2026-09-15T00:00:00.000Z" }],
};
const SUBJ = { status: "draft" as const, title: "t", seconds: 10,
  videoUrl: "https://www.youtube.com/watch?v=aQkPcPqTq4M", disclosure: "d", sourceJobId: "j", reviewedAt: null };
void BOARD; void SUBJ;
`;

interface Mutation {
  name: string;
  file: string;
  from: string;
  to: string;
  /** 순수 함수 가드만 — 라우트·화면 가드는 null(⑶ 을 건너뛴다) */
  probe: string | null;
  tests: string[];
}

const NL = "\n";

const MUTATIONS: Mutation[] = [
  // ── ① 관리자가 아니면 쓰기 단추·API 가 막힌다 ────────────────────────────
  {
    name: "①-등록 등록 라우트(POST)가 관리자를 묻지 않는다",
    file: "src/app/api/concept/lectures/route.ts",
    from: "  const access = await authorizeAccount(request, true);",
    to: "  const access = await authorizeAccount(request);",
    probe: null,
    tests: [API],
  },
  {
    name: "①-전이 게시·내리기·주소 라우트(PATCH)가 관리자를 묻지 않는다",
    file: "src/app/api/concept/lectures/[id]/route.ts",
    from: "  const access = await authorizeAccount(request, true);",
    to: "  const access = await authorizeAccount(request);",
    probe: null,
    tests: [API],
  },
  {
    name: "①-표시 첫 화면 응답이 누구에게나 canEdit 을 준다",
    file: "src/app/api/concept/route.ts",
    from: "loadConceptBoard(account, account.isAdmin, new Date())",
    to: "loadConceptBoard(account, true, new Date())",
    probe: null,
    tests: [API],
  },
  {
    name: "①-머리 관리자가 아니어도 «meta.json 으로 등록» 단추를 그린다",
    file: "src/components/unified/ConceptView.tsx",
    from: "        {data.canEdit ? (" + NL + "          <button",
    to: "        {true ? (" + NL + "          <button",
    probe: null,
    tests: [UI],
  },
  {
    name: "①-판 관리자가 아니어도 게시·끝까지 봤다·주소 넣기 단추를 그린다",
    file: "src/components/unified/ConceptUnitPanel.tsx",
    from: "          {canEdit ? (" + NL + "            <LectureActions",
    to: "          {true ? (" + NL + "            <LectureActions",
    probe: null,
    tests: [UI],
  },
  // ── ② 남의 반은 안 보인다 ─────────────────────────────────────────────
  {
    name: "② 반 조회가 소유자(Class.userId)를 묻지 않는다",
    file: "src/lib/concept/adminService.ts",
    // 판정(관리자면 넘는다)은 `mutate-admin-scope.ts` ⑩c·d 가 뒤집는다 — 여기는 «조각을 안 쓴다»
    // 반 조회가 `loadBoardClasses` 로 옮겨 갔다(D-132 담당 조인) — 조각은 거기 한 번이다
    from: "  const where = ownedRowsWhere(viewer);" + NL,
    to: "  const where = {};" + NL,
    probe: null,
    tests: [API],
  },
  // ── ③ n/m 과 안 본 이름 수 ─────────────────────────────────────────────
  {
    name: "③-이름 안 본 학생을 반 목록에서 따로 센다(퇴원 학생이 섞인다)",
    file: "src/lib/concept/adminBoard.ts",
    // prettier 가 쪼갠 모양 그대로(커밋 훅이 서식을 확정한다 — 한 줄 앵커는 서식 뒤에 0개가 됐다)
    from:
      "        pending: counted.pending.map((id) => ({" +
      NL +
      "          id," +
      NL +
      '          name: nameById.get(id) ?? "",' +
      NL +
      "        })),",
    to:
      "        pending: roster.filter((s) => !input.views.some((v) => v.studentId === s.id && " +
      "v.lectureId === lecture.id && v.completedAt != null)).map((s) => ({ id: s.id, name: s.name })),",
    probe:
      "board.buildConceptBoard(BOARD).rows[0]!.watch[0]!.pending.map((p) => p.id)",
    tests: [BOARD_T, API, UI],
  },
  {
    name: "③-인원 반 인원을 반 목록 길이로 센다(퇴원 포함)",
    file: "src/lib/concept/adminBoard.ts",
    from: '    const enrolled = countWatchedToEnd(roster, [], "").total;',
    to: "    const enrolled = roster.length;",
    probe: "board.buildConceptBoard(BOARD).rows[0]!.enrolled",
    tests: [BOARD_T, API],
  },
  {
    name: "③-계약 n/m 과 이름 수의 어긋남을 계약이 거절하지 않는다",
    file: "src/contracts/conceptAdmin.contract.ts",
    from: "  .refine((w) => w.watched + w.pending.length === w.total, {",
    to: "  .refine(() => true, {",
    probe:
      "contract.conceptWatchSchema.safeParse({ lectureId: '0a8c2e1b-7a9d-4b5e-8f10-2b3c4d5e6f70', watched: 1, total: 3, pending: [] }).success",
    tests: [BOARD_T],
  },
  {
    name: "③-화면 펼친 이름에서 한 명을 빠뜨린다",
    file: "src/components/unified/ConceptView.tsx",
    from: "                {open.pending.map((p) => (",
    to: "                {open.pending.slice(1).map((p) => (",
    probe: null,
    tests: [UI],
  },
  // ── 리드 결정 §5 — 전이 규칙 ─────────────────────────────────────────
  {
    name: "§5-확인 영상 주소가 바뀌어도 시청 확인(reviewedAt)을 남긴다",
    file: "src/lib/concept/lectureTransition.ts",
    from: "      return { ok: true, patch: { videoUrl: next, reviewedAt: null } };",
    to: "      return { ok: true, patch: { videoUrl: next } };",
    probe:
      "tr.planLectureChange({ ...SUBJ, reviewedAt: '2026-09-12T00:00:00Z' }, { action: 'video', videoUrl: 'https://youtu.be/dQw4w9WgXcQ' }, new Date(0))",
    tests: [TRANS_T, API],
  },
  {
    name: "§5-초안 게시 내리기가 초안으로 보낸다(게시 → 초안 길이 열린다)",
    file: "src/lib/concept/lectureTransition.ts",
    from: '  archive: { from: ["published"], to: "archived" },',
    to: '  archive: { from: ["published"], to: "draft" },',
    probe:
      "tr.planLectureChange({ ...SUBJ, status: 'published' }, { action: 'archive' }, new Date(0))",
    tests: [TRANS_T, API],
  },
  {
    name: "§5-관문 다시 게시가 관문을 건너뛴다",
    file: "src/lib/concept/lectureTransition.ts",
    from: "      if (!verdict.canPublish) {",
    to: '      if (!verdict.canPublish && subject.status === "draft") {',
    probe:
      "tr.planLectureChange({ ...SUBJ, status: 'archived', disclosure: null }, { action: 'publish' }, new Date(0)).ok",
    tests: [TRANS_T],
  },
];

function md5(b: Buffer): string {
  return createHash("md5").update(b).digest("hex");
}

/**
 * 🔴 **측정 실패는 다시 잰다** — 2026-09-15 두 번의 실행에서 탐침(tsx)과 러너(vitest)가 메모리
 * 부족으로 못 떠(여유 232~397MB, 다른 프로젝트의 개발 서버가 2GB 가까이 쓰는 중) 판정 거부가 났다.
 * 같은 탐침을 손으로 돌리면 3초에 멀쩡했다. 그래서 «출력이 없다 / 빨간데 시험 이름이 없다»일 때만
 * 몇 번 더 잰다. 판정 규칙은 그대로다 — 빨강은 여전히 **이름 댄 실패**뿐이다.
 */
const ATTEMPTS = 3;

function probe(expr: string): string | null {
  for (let i = 0; i < ATTEMPTS; i += 1) {
    const out = probeOnce(expr);
    if (out !== null) return out;
    console.log(`        (탐침이 못 떴다 — 다시 잰다 ${i + 1}/${ATTEMPTS})`);
  }
  return null;
}

function runTests(files: string[]): {
  code: number;
  failed: string[];
  readable: boolean;
} {
  let last = runTestsOnce(files);
  for (let i = 1; i < ATTEMPTS; i += 1) {
    const measured =
      last.readable && (last.code === 0 || last.failed.length > 0);
    if (measured) break;
    console.log(
      `        (러너가 이름 없이 끝났다 — 다시 잰다 ${i}/${ATTEMPTS - 1})`,
    );
    last = runTestsOnce(files);
  }
  return last;
}

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

function probeOnce(expr: string): string | null {
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
    removeFile(PROBE);
  }
}

function runTestsOnce(files: string[]): {
  code: number;
  failed: string[];
  readable: boolean;
} {
  const out = tempFile("mutate-concept-admin-", ".json");
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
    } | null;
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

type Verdict = "RED" | "GREEN" | "REFUSE" | "HOLD";

function main(): number {
  const needles = process.argv.slice(2);
  const picked = needles.length
    ? MUTATIONS.filter((m) => needles.some((n) => m.name.includes(n)))
    : MUTATIONS;
  if (picked.length === 0) {
    console.log(`«${needles.join(" · ")}» 과 맞는 변이가 없다`);
    return 2;
  }

  const allTests = [...new Set(picked.flatMap((m) => m.tests))];
  const base = runTests(allTests);
  if (base.code !== 0 || !base.readable) {
    console.log(
      `⛔ 기준 시험이 초록이 아니다(종료 ${base.code}) — 판정하지 않는다`,
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
        const before = m.probe ? probe(m.probe) : null;
        writeFileSync(m.file, text.replace(from, to), "utf8");
        try {
          if (md5(readFileSync(m.file)) === md5(orig)) {
            why = "⑵ 파일이 안 바뀌었다";
          } else {
            const after = m.probe ? probe(m.probe) : null;
            if (m.probe && (before === null || after === null)) {
              why = `⑶ 탐침 산출물을 못 얻었다(전 ${before === null ? "실패" : "성공"} · 후 ${after === null ? "실패" : "성공"})`;
            } else if (m.probe && before === after) {
              why = "⑶ 산출물이 그대로다 — 뜻이 안 바뀌었다";
            } else {
              const r = runTests(m.tests);
              failed = r.failed;
              const change = m.probe
                ? `산출물 ${before} → ${after}`
                : "탐침 없음(라우트·화면) — 시험 이름으로 판정";
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
        REFUSE: "⛔ 판정 거부",
        HOLD: "🟨 판정 보류",
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
