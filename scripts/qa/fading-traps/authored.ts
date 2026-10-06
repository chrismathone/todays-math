/**
 * 은행이 쓴 오개념 → 함정 표 — 읽고 고른 것만 표(`src/lib/fading/trapTable.ts`)로 굳힌다. 규칙 · 결과는 README.md.
 *
 *   npx tsx scripts/qa/fading-traps/authored.ts --list     # 후보를 개념째 찍는다(이것을 읽고 판정을 적는다)
 *   npx tsx scripts/qa/fading-traps/authored.ts            # 판정과 후보를 견준다(안 읽은 후보 · 사라진 판정이 있으면 종료 코드 1)
 *   npx tsx scripts/qa/fading-traps/authored.ts --write    # 받은 것만 표로 쓴다
 *
 * 후보는 ○× 거짓 문항이 뜻 문장과 표적 하나만 다를 때 그 자리에 적힌 낱말이다(`lib.ts` 의 `authoredTraps`) — 그 빈칸에서는 은행이 «틀렸다»고 적었다.
 * 판정(`authored-verdicts.json`)은 **그 개념의 다른 빈칸 전부**에 넣어 읽은 결과다 — 어느 빈칸엔가 넣어 말이 되면 받지 않는다.
 * 🔴 판정에 없는 후보는 표에 들어가지 않는다 — 은행에 ○× 가 늘어도 읽기 전에는 함정이 되지 않는다.
 * 표의 줄마다 그 개념 내용의 지문을 같이 적는다 — 은행의 문장이나 묶음이 바뀌면 그 함정은 **다시 읽기 전까지 내려가지 않는다**(`traps.ts`).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  fadingConceptDigest,
  fadingTargets,
} from "../../../src/lib/fading/concepts";
import { allConcepts, authoredTraps } from "./lib";

const DIR = "scripts/qa/fading-traps";
const OUT = "src/lib/fading/trapTable.ts";
const flag = (name: string) => process.argv.includes(`--${name}`);

type Verdicts = {
  /** `개념의 열쇠|함정의 글` — 그 개념의 어느 빈칸에 넣어도 틀린 것. */
  accepted: string[];
  /** 받지 않은 것 → 까닭(어느 빈칸에서 말이 되는지). */
  rejected: Record<string, string>;
};

const HEAD = `import type { FadingTrap } from "./chips";

/**
 * 함정 표 — 개념의 열쇠 → 그 개념의 함정 칩. **은행이 ○× 거짓 문항으로 직접 쓴 오개념** 가운데, 그 개념의 빈칸 전부에 넣어 읽고 받은 것만 든다
 * (\`scripts/qa/fading-traps/\` — README 에 규칙과 결과 · 판정은 \`authored-verdicts.json\`).
 * 🔴 손으로 고치지 않는다 — \`npx tsx scripts/qa/fading-traps/authored.ts --write\` 가 쓴다.
 * \`ox\` 는 그 오개념이 온 ○× 문항, \`digest\` 는 읽을 때의 개념 내용의 지문이다. 지문이 지금 내용과 다르면 그 함정은 내려가지 않는다
 * (은행의 문장이나 묶음이 바뀌었다 — 다시 읽어야 한다 · \`fadingTraps.test.ts\` 가 배포 전에 운다).
 */
export type FadingTrapEntry = FadingTrap & { ox: string; digest: string };

export const FADING_TRAPS: Readonly<
  Record<string, readonly FadingTrapEntry[]>
> = `;

async function main() {
  const concepts = allConcepts();
  const candidates = concepts.flatMap((concept) =>
    authoredTraps(concept).map((trap) => ({
      key: `${concept.id}|${trap.text}`,
      concept,
      trap,
    })),
  );
  if (flag("list")) {
    candidates.forEach(({ concept, trap }, i) => {
      const own = fadingTargets(concept).find(
        (t) => t.id === trap.authored!.targetId,
      )!;
      console.info(
        `#${i + 1} [${concept.id}] 함정 «${trap.text}» ← 답 «${own.text}» (${trap.from})  까닭: ${trap.authored!.why}`,
      );
      for (const p of concept.propositions)
        console.info(
          `    ${p.pieces.map((x) => (x.kind === "text" ? x.text : `{${x.target.text}}`)).join("")}`,
        );
    });
    console.info(`후보 ${candidates.length}`);
    return;
  }
  const verdicts = JSON.parse(
    readFileSync(join(DIR, "authored-verdicts.json"), "utf8"),
  ) as Verdicts;
  const accepted = new Set(verdicts.accepted);
  const known = new Set([...accepted, ...Object.keys(verdicts.rejected)]);
  const live = new Set(candidates.map((c) => c.key));
  const unread = candidates.filter((c) => !known.has(c.key));
  const gone = [...known].filter((key) => !live.has(key));
  for (const c of unread) console.info(`안 읽은 후보: ${c.key}`);
  for (const key of gone)
    console.info(`사라진 판정(은행 · 묶음이 바뀌었다): ${key}`);
  const table: Record<string, { text: string; ox: string; digest: string }[]> =
    {};
  for (const { key, concept, trap } of candidates) {
    if (!accepted.has(key)) continue;
    (table[concept.id] ??= []).push({
      text: trap.text,
      ox: trap.from,
      digest: fadingConceptDigest(concept),
    });
  }
  const rows = Object.values(table).reduce((n, list) => n + list.length, 0);
  console.info(
    `후보 ${candidates.length} · 받은 것 ${rows}(개념 ${Object.keys(table).length}) · 받지 않은 것 ${Object.keys(verdicts.rejected).length} · 안 읽은 것 ${unread.length} · 사라진 판정 ${gone.length}`,
  );
  if (flag("write")) {
    const prettier = await import("prettier");
    writeFileSync(
      OUT,
      await prettier.format(`${HEAD}${JSON.stringify(table, null, 2)};\n`, {
        ...(await prettier.resolveConfig(OUT)),
        filepath: OUT,
      }),
      "utf8",
    );
    console.info(`표를 썼다 — ${OUT}`);
  }
  process.exitCode = unread.length || gone.length ? 1 : 0;
}
void main();
