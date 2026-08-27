/**
 * 중등 소단원 전량 판정기 — **「130곳이 시험지를 낼 수 있나」를 세는 자.**
 *
 * 초등에는 `probe-elem-forms.ts` 가 있었고, 그 자 하나가 네 갈래의 「다 했다」를
 * 실제로 검증했다(보고 56/56 이 조인 자로 재니 37/56 이던 회차가 있다).
 * 중등에는 그 자리가 **비어 있었다** — 판정기 여섯 중 「소단원마다 유형 10개 +
 * 시험지가 실제로 조립되나」를 보는 것이 없다.
 *
 * ## 무엇을 보나 (소단원마다)
 *
 *   ⑴ 유형이 10개 이상인가
 *   ⑵ 유형마다 변형 3개가 나오는가 (`expandFamily`)
 *   ⑶ 형식이 `unknown` 으로 안 떨어지는가 (화면의 `[?형식]`)
 *   ⑷ 제품 `selectProblems` 로 **10문항·10갈래 시험지가 실제로 조립되는가**
 *   ⑸ 객관식이 붙는 유형이 몇인가 (중등은 정답이 «식»이라 초등보다 낮다)
 *
 * ## 초등과 다른 축
 *
 * 초등은 「소재 이름만 바꾼 문형」이 문제였다. 중등은 유형 키가 RPM 유형 그
 * 자체라 그 축이 없다. 대신 중등 고유의 자리가 있다 — **이미 보기가 붙은 유형**
 * (873 중 20개). 그것을 단답·서술로 파생하면 지면이 망가지므로, 펼친 결과에
 * 보기 두 겹이 없는지 본다.
 *
 * 쓰기:
 *   npx tsx scripts/qa/probe-middle-forms.ts [--json] [--grade 중1]
 *   npx tsx scripts/qa/probe-middle-forms.ts --selftest   # 이 판정기가 눈이 멀었나
 */
import { defaultRatioFor } from "../../src/contracts/difficulty";
import { expandFamily } from "../../src/lib/engine/expandEngine";
import { familyIdOf } from "../../src/lib/generator/familyKey";
import {
  selectProblems,
  type SelectableProblem,
} from "../../src/lib/generator/selectProblems";
import {
  generateMiddleProblem,
  registeredTypes,
} from "../../src/lib/middle/generate";
import { classifyFormat } from "../../src/lib/problem/provenance";

const SEED = 20260827;
const VARIANTS = 3;
const TARGET_TYPES = 10;

/**
 * 한 발문에 보기가 **두 겹**인가. 이미 보기가 붙은 유형을 파생하면 나는 모양이다.
 * 겹치면 지면에 ①이 두 번 나온다.
 */
export function hasDoubledChoices(content: string): boolean {
  return content.split("①").length - 1 > 1;
}

/**
 * 서술 지시가 **보기 줄에** 붙었나 — 물음이 아니라 목록을 헤집은 모양.
 *
 * ⚠️ 「지시와 보기가 같이 있다」로 재면 **거짓 경보**다. 「다음 보기 중 …인 것은
 *    모두 몇 개인지 **풀이 과정과 답을 쓰시오.**」 + 보기 목록은 **옳은** 지면이다
 *    — 보기가 세는 대상이라 그대로 있어야 한다. 틀린 것은 지시가 마지막 보기
 *    뒤에 붙는 것(「⑤ $y=(x+2)^2$ 풀이 과정과 답을 쓰시오.」)이므로, **보기 줄에
 *    지시가 있는가**로 좁힌다. 거짓 경보는 가드를 끈다(2026-08-20).
 */
export function isDescriptiveWithChoices(content: string): boolean {
  return content
    .split("\n")
    .some(
      (line) =>
        /^\s*[①②③④⑤]/.test(line) && line.includes("풀이 과정과 답을 쓰시오"),
    );
}

/* ───────────────── 눈금 — 이 판정기가 «아니오»를 낼 수 있나 ───────────────── */

const GAUGE: [why: string, want: boolean, run: () => boolean][] = [
  [
    "보기가 두 겹이면 잡는다",
    true,
    () => hasDoubledChoices("고르시오 ① $1$ ② $2$ 를 다시 ① $3$"),
  ],
  [
    "보기가 한 겹이면 안 잡는다",
    false,
    () => hasDoubledChoices("고르시오 ① $1$ ② $2$ ③ $3$ ④ $4$ ⑤ $5$"),
  ],
  [
    "🔴 보기가 없으면 안 잡는다",
    false,
    () => hasDoubledChoices("값을 구하시오"),
  ],
  [
    "서술 지시 + 보기는 잡는다",
    true,
    () => isDescriptiveWithChoices("① $1$ 인지 풀이 과정과 답을 쓰시오."),
  ],
  [
    "🔴 서술 지시만 있으면 안 잡는다",
    false,
    () =>
      isDescriptiveWithChoices("길이는 몇 cm 인지 풀이 과정과 답을 쓰시오."),
  ],
  [
    "🔴 보기만 있으면 안 잡는다",
    false,
    () => isDescriptiveWithChoices("다음 중 옳은 것은? ① $1$"),
  ],
  [
    "🔴 물음 줄이 서술이고 보기는 세는 대상이면 안 잡는다",
    false,
    () =>
      isDescriptiveWithChoices(
        [
          "보기 중 몇 개인지 풀이 과정과 답을 쓰시오.",
          "① $y=x$",
          "② $y=x^2$",
        ].join(String.fromCharCode(10)),
      ),
  ],
];

if (process.argv.includes("--selftest")) {
  let bad = 0;
  for (const [why, want, run] of GAUGE) {
    const got = run();
    if (got !== want) bad += 1;
    console.log(
      `  ${got === want ? "✅" : "❌"} ${why} — 기대 ${want ? "잡는다" : "안 잡는다"} / 실제 ${got ? "잡는다" : "안 잡는다"}`,
    );
  }
  const pos = GAUGE.filter((g) => g[1]).length;
  console.log(
    bad === 0
      ? `\n✅ 눈금 ${GAUGE.length}건 전부 맞다 (양성 ${pos} · 음성 ${GAUGE.length - pos})`
      : `\n❌ 눈금 ${bad}건 어긋남 — **가드를 믿을 수 없다**`,
  );
  process.exit(bad === 0 ? 0 : 1);
}

/* ─────────────────────────── 전량 ─────────────────────────── */

const wantJson = process.argv.includes("--json");
const gradeAt = process.argv.indexOf("--grade");
const onlyGrade = gradeAt >= 0 ? process.argv[gradeAt + 1] : null;

type Entry = { key: string; grade: string; unitSection: string };
type Report = {
  grade: string;
  section: string;
  types: number;
  mcqTypes: number;
  problems: string[];
  done: boolean;
};

const bySection = new Map<string, Entry[]>();
for (const e of registeredTypes() as unknown as Entry[]) {
  if (onlyGrade && e.grade !== onlyGrade) continue;
  const k = `${e.grade}|${e.unitSection}`;
  if (!bySection.has(k)) bySection.set(k, []);
  bySection.get(k)!.push(e);
}

const reports: Report[] = [];

for (const [k, entries] of bySection) {
  const [grade, section] = k.split("|") as [string, string];
  const problems: string[] = [];
  const pool: SelectableProblem[] = [];
  let mcqTypes = 0;

  if (entries.length < TARGET_TYPES)
    problems.push(
      `유형이 ${entries.length}개 — ${TARGET_TYPES}개가 필요하다 (${TARGET_TYPES - entries.length} 부족)`,
    );

  for (const e of entries) {
    const familyKey = `mid:${e.key}`;
    let got;
    try {
      got = expandFamily((v) => {
        const p = generateMiddleProblem(e.key, SEED, v);
        return {
          content: p.content,
          answer: p.answer,
          solution: p.solution,
          familyKey,
          problemType: p.difficulty === "연산" ? "계산" : "활용",
          difficulty: p.difficulty,
        };
      }, VARIANTS);
    } catch (err) {
      problems.push(
        `유형 ${e.key} 변형 ${VARIANTS}개 실패: ${err instanceof Error ? err.message : String(err)}`,
      );
      continue;
    }
    if (got.skippedMcq === 0) mcqTypes += 1;

    for (const item of got.items) {
      const it = item as typeof item & { difficulty: string };
      // ⑶ 형식이 화면에서 `[?형식]` 으로 안 떨어지는가
      const fmt = classifyFormat({
        content: it.content,
        answer: it.answer,
        familyKey: it.familyKey,
        questionType: it.questionType,
        problemType: it.problemType,
      });
      if (fmt === "unknown")
        problems.push(`유형 ${e.key} 의 한 행이 형식 unknown 이다`);
      // 중등 고유 — 이미 보기가 붙은 유형을 파생했나
      if (hasDoubledChoices(it.content))
        problems.push(`유형 ${e.key} 의 발문에 보기가 **두 겹**이다`);
      if (isDescriptiveWithChoices(it.content))
        problems.push(`유형 ${e.key} 이 보기를 단 채 서술 지시를 붙였다`);

      if (it.questionType !== "단답형") continue;
      pool.push({
        id: `${e.key}-${pool.length}`,
        unitId: k,
        difficulty: it.difficulty as never,
        problemType: it.problemType,
        directUseAllowed: true,
        familyKey,
        content: it.content,
        figureUrls: [],
        figureDims: [],
      });
    }
  }

  // ⑷ 시험지 10문항·10갈래
  if (entries.length >= TARGET_TYPES) {
    try {
      const { problems: picked, shortfall } = selectProblems({
        pool,
        difficultyRatio: defaultRatioFor(TARGET_TYPES),
        count: TARGET_TYPES,
        recentProblemIds: [],
        seed: `probe-mid-${k}`,
      });
      if (shortfall.length > 0)
        problems.push(`시험지가 모자란다: ${JSON.stringify(shortfall)}`);
      const fams = new Set(picked.map((p) => familyIdOf(p))).size;
      if (fams !== TARGET_TYPES)
        problems.push(`한 시험지에 갈래가 ${fams}개 — 같은 유형이 겹쳤다`);
    } catch (err) {
      problems.push(
        `조립이 던진다: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  reports.push({
    grade,
    section,
    types: entries.length,
    mcqTypes,
    problems,
    done: problems.length === 0,
  });
}

const done = reports.filter((r) => r.done);

if (wantJson) {
  console.log(JSON.stringify({ asOf: "probe-middle-forms", reports }, null, 2));
} else {
  const byGrade = new Map<string, { n: number; done: number }>();
  for (const r of reports) {
    const g = byGrade.get(r.grade) ?? { n: 0, done: 0 };
    g.n += 1;
    if (r.done) g.done += 1;
    byGrade.set(r.grade, g);
  }
  console.log(`대상 소단원        ${reports.length}`);
  console.log(`✅ 전부 통과       ${done.length}`);
  console.log(
    `객관식이 붙는 유형 ${reports.reduce((s, r) => s + r.mcqTypes, 0)} / ${reports.reduce((s, r) => s + r.types, 0)}`,
  );
  console.log("");
  for (const [g, v] of [...byGrade].sort())
    console.log(`  ${g}  ${v.done} / ${v.n}`);
  console.log("");
  // 「유형이 모자라다」와 그 밖의 사유를 **갈라서** 찍는다 — 섞으면 무엇이
  // 새 유형을 지어야 풀리는 것이고 무엇이 배선 결함인지 안 갈린다.
  const shortOnly = reports.filter(
    (r) => !r.done && r.problems.every((p) => p.startsWith("유형이 ")),
  );
  const wiring = reports.filter(
    (r) => !r.done && r.problems.some((p) => !p.startsWith("유형이 ")),
  );
  console.log(
    `유형 수만 모자란 곳 ${shortOnly.length} — 새 유형을 지어야 푼다`,
  );
  console.log(`배선이 어긋난 곳    ${wiring.length} — 지금 고칠 수 있다`);
  for (const r of wiring.slice(0, 10))
    console.log(`   ${r.grade} ${r.section} — ${r.problems[0]}`);
}

if (process.argv.includes("--strict") && done.length !== reports.length) {
  console.error(`\n🔴 ${reports.length - done.length}곳이 남았다`);
  process.exit(1);
}
