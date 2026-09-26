/**
 * KaTeX 명령 이름 상수 생성기 — `src/lib/math/katexCommands.generated.ts` 를 다시 쓴다.
 * KaTeX 를 올린 뒤 동기화 시험(`katexCommands.sync.test.ts`)이 울면 이것을 돌린다.
 *
 *   npx tsx scripts/qa/gen-katex-commands.ts
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import {
  censusKatexCommands,
  renderKatexCommandsModule,
} from "./katexCommandCensus";

const root = process.cwd();
const census = censusKatexCommands(root);
const target = path.join(root, "src/lib/math/katexCommands.generated.ts");
writeFileSync(target, renderKatexCommandsModule(census));
console.log(
  `KaTeX ${census.version}: 명령 ${census.names.length} · 관계/이항 ${census.infix.length} → ${path.relative(root, target)}`,
);
