/**
 * 은행 3차(브리프 cb-ten) 진행표 — 소단원마다 개념 · ○× · 적용의 하 · 중 · 상이 원래 + 보강으로 몇 개이고 10 까지 몇 개 남았나.
 * 실행(저장소 뿌리): npx tsx scripts/qa/concept-blank/ten-progress.ts --part e3plus [--all]
 *   기본은 모자란 소단원만 찍는다. `--all` 은 다 찍는다. 넘친 칸(10 초과)도 따로 센다.
 */
import {
  BANK_PARTS,
  PLUS_OF,
  sectionStock,
} from "../../../src/lib/concept-blank/bank";
import { BLANK_SECTIONS } from "../../../src/lib/concept-blank/sections";

const PER_LEVEL = 10;
const LEVELS = ["하", "중", "상"] as const;
const KINDS = ["concepts", "ox", "apply"] as const;
const LABEL = { concepts: "개념", ox: "○×", apply: "적용" } as const;
const GRADE: Record<string, string> = {
  e3: "초3",
  e4: "초4",
  e5: "초5",
  e6: "초6",
  m1: "중1",
  m2: "중2",
  m3: "중3",
};

const args = process.argv.slice(2);
const arg = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const part = arg("part");
const showAll = args.includes("--all");
if (!part || !(part in PLUS_OF)) {
  console.error(`--part 는 ${Object.keys(PLUS_OF).join(" · ")} 중 하나`);
  process.exit(1);
}
const basePart = PLUS_OF[part]!;
const base = BANK_PARTS[basePart]!;
const plus = BANK_PARTS[part]!;
const both = {
  concepts: [...base.concepts, ...plus.concepts],
  ox: [...base.ox, ...plus.ox],
  apply: [...base.apply, ...plus.apply],
  figures: [...base.figures, ...plus.figures],
};

let missing = 0;
let over = 0;
let doneSections = 0;
const sections = BLANK_SECTIONS.filter((s) => s.grade === GRADE[basePart]).sort(
  (a, b) => a.order - b.order,
);
for (const s of sections) {
  const stock = sectionStock(s.key, both);
  const cells = KINDS.map((kind) => {
    const n = LEVELS.map(
      (l) => stock[kind].filter((x) => x.level === l).length,
    );
    for (const v of n) {
      missing += Math.max(0, PER_LEVEL - v);
      over += Math.max(0, v - PER_LEVEL);
    }
    return { kind, n };
  });
  const short = cells.some((c) => c.n.some((v) => v < PER_LEVEL));
  if (!short) doneSections += 1;
  if (short || showAll)
    console.log(
      `${s.key}\n    ` +
        cells.map((c) => `${LABEL[c.kind]} ${c.n.join("/")}`).join(" · "),
    );
}
console.log(
  `\n${part}: 소단원 ${doneSections}/${sections.length} 끝 · 남은 칸 ${missing}개 · 10 넘은 칸 ${over}개 · 보강 문항 ${plus.concepts.length + plus.ox.length + plus.apply.length}개`,
);
