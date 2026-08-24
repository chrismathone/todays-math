/**
 * **네 갈래를 나란히 찍는다** — 사람이 사다리를 눈으로 보라고 있는 연장.
 *
 *   npx tsx scripts/qa/dump-elem-tiers.ts 초3 2-3        # 대단원 전부
 *   npx tsx scripts/qa/dump-elem-tiers.ts 초3 2-3-3      # 한 소단원
 *   npx tsx scripts/qa/dump-elem-tiers.ts 초5            # 학년 전부(길다)
 *   npx tsx scripts/qa/dump-elem-tiers.ts 초3 2-6 --seeds=3   # 씨앗 여러 개
 *
 * ⚠️ **이것은 판정기가 아니라 연장이다.** 아무것도 판정하지 않으므로 `exit 0` 이
 *    「깨끗」을 뜻하지 않는다. 이름이 `probe-` 가 아닌 것도 그래서다 — 관문 쓸기는
 *    `probe-elem-*` 만 훑으므로 여기 걸리지 않는다.
 *
 * ## 왜 판정기가 아니라 연장인가
 *
 * **난이도는 지면에 없다.** 값·조사·그림·렌더는 지면에 있는 것이라 잰다. 그런데
 * 「이 문항이 저 문항보다 쉬운가」는 **학생이 무엇을 해야 하는가**이고 그건 지면에
 * 없다 — 같은 「계산 걸음 0」이 한쪽에서는 결함(답을 그대로 옮겨 적음)이고 다른
 * 쪽에서는 개념(「밀어도 크기는 변하지 않는다」)이다.
 *
 * 실제로 재 봤다(2026-08-24, 전 학년 10,944문항). 열쇠 셋 다 못 썼다 —
 * 자세한 수치와 까닭은 `probe-elem-tier-ladder.ts` 머리말 ㉡-b 에 있다.
 * **열쇠가 아니라 축이 없는 자리**라 문턱을 옮겨도 안 갈린다.
 *
 * 그래서 그물을 사람에게 남긴다. 이 연장이 하는 일은 **사람이 보기 쉽게 늘어놓는 것**
 * 하나뿐이다. 초3 2-3-3 의 사다리 뒤집힘이 이렇게 나왔다.
 *
 * ## 볼 때 무엇을 묻나
 *
 *   ㉠ 1 → 2 → 3 → 4 로 **할 일이 늘어나는가** (걸음 수가 아니라 «할 일»이다)
 *   ㉡ 2단이 **식을 스스로 세우는가** (D-72) — 식을 그냥 주면 1단이다
 *   ㉢ 4단에 **역산·조건 겹침**이 있는가
 *   ㉣ 어느 갈래가 **답을 발문에 그대로 두고** 있지 않은가
 *   ㉤ 그림이 **답이나 풀이 첫 단계**를 말하지 않는가 (09 §2.2)
 */
import { ELEM_TIERS } from "../../src/lib/elementary/difficulty";
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "../../src/lib/elementary/generate";

const args = process.argv.slice(2);
const grade = args.find((a) => a.startsWith("초"));
const code = args.find((a) => /^\d/.test(a));
const seedArg = args.find((a) => a.startsWith("--seeds="));
const seedCount = seedArg ? Number(seedArg.slice("--seeds=".length)) : 1;

if (!grade) {
  console.log(
    "학년을 주십시오 — 예: npx tsx scripts/qa/dump-elem-tiers.ts 초3 2-3",
  );
  process.exit(2);
}

const SEEDS = Array.from({ length: seedCount }, (_, i) => 20260824 + i * 6131);

const units = elementaryUnits().filter(
  (u) =>
    u.grade === grade &&
    (!code || u.section.startsWith(code) || u.chapter.startsWith(code)),
);

if (units.length === 0) {
  console.log(`맞는 소단원이 없습니다: ${grade} ${code ?? ""}`);
  process.exit(2);
}

/** 그림을 한 줄로. 스펙 전체를 찍는다 — 「무엇이 적혔나」가 ㉤ 의 핵심이다. */
function figLine(spec: unknown): string {
  if (!spec) return "(그림 없음)";
  const s = spec as Record<string, unknown>;
  const rest = Object.entries(s)
    .filter(([k]) => k !== "version" && k !== "kind")
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join(" ");
  return `${String(s.kind)}${rest ? "  " + rest : ""}`;
}

let shown = 0;
let noTier = 0;
for (const u of units) {
  if (supportedTiers(u).length === 0) {
    noTier += 1;
    console.log(
      `\n${"─".repeat(72)}\n${u.grade} ${u.section}  — 갈래 없음(표준만)`,
    );
    for (const seed of SEEDS) {
      const p = generateElementaryProblem(u, seed);
      console.log(`\n  [표준] ${p.content.replace(/\n/g, "\n         ")}`);
      console.log(`     그림: ${figLine(p.figureSpec)}`);
      console.log(`     답:   ${p.answer}`);
      console.log(`     해설: ${p.solution.replace(/\n/g, " ")}`);
    }
    continue;
  }
  console.log(`\n${"═".repeat(72)}\n${u.grade} ${u.section}`);
  for (const seed of SEEDS) {
    if (SEEDS.length > 1) console.log(`\n  ── 씨앗 ${seed} ──`);
    for (const tier of ELEM_TIERS) {
      const p = generateElementaryProblem(u, seed, tier);
      shown += 1;
      console.log(`\n  [${tier}] ${p.content.replace(/\n/g, "\n         ")}`);
      console.log(`     그림: ${figLine(p.figureSpec)}`);
      console.log(`     답:   ${p.answer}`);
      console.log(`     해설: ${p.solution.replace(/\n/g, " ")}`);
    }
  }
}

console.log(
  `\n${"═".repeat(72)}\n찍은 것 — 소단원 ${units.length}(갈래 없음 ${noTier}) · 문항 ${shown + noTier * SEEDS.length}`,
);
console.log(
  "⚠️ 이 연장은 **판정하지 않는다.** 위 머리말 ㉠~㉤ 를 사람이 물으라고 늘어놓은 것뿐이다.",
);
