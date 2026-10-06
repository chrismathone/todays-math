/**
 * «오늘의 기억» 묶음 고르게 하기 — 한 칸(소단원 × 난이도)의 두 묶음 사이 **경계를 한 문장 옮겨**, 기운 묶음을 편다.
 *
 *   npx tsx scripts/qa/fading-grouping/rebalance.ts            # 옮길 것만 찍는다(고치지 않는다 — 이것을 읽고 나서 쓴다)
 *   npx tsx scripts/qa/fading-grouping/rebalance.ts --write    # 표를 고쳐 쓴다
 *
 * 묶음 표의 처음 값은 «문장 수를 고르게»였다. 문장마다 표적(빈칸이 될 자리) 수가 달라, 문장 수는 같아도 한 묶음이 표적 10개 ·
 * 옆 묶음이 4개인 칸이 생긴다 — 4단계에서 한 개념은 칩 열 개, 옆 개념은 네 개다. 여기서는 **표적 수**로 고르게 한다.
 *
 * 지키는 것
 * - 열쇠를 바꾸지 않는다. 묶음을 만들거나 없애지 않는다. 문장은 **같은 칸의 두 묶음 사이로만** 옮긴다.
 * - 🔴 **은행 차례를 깨지 않는다** — 앞 묶음은 칸의 앞쪽 문장, 뒤 묶음은 뒤쪽 문장 그대로이고 그 경계만 옮긴다.
 *   문장을 맞바꾸면 더 고르게 되지만(기운 칸 22 → 0) 은행이 차례로 엮어 둔 주제가 섞인다
 *   (초4 «각의 크기를 어림하고 각도의 합과 차»: 앞 묶음은 어림 · 뒤 묶음은 합과 차의 계산 — 맞바꾸면 둘 다 반반이 된다). 그래서 맞바꾸지 않는다.
 * - 묶음마다 문장 셋 이상 다섯 이하. 열쇠와 이름이 같은 문장은 제 묶음에 남는다 — 그래서 넘어가는 것은 늘 **앞 묶음의 끝 문장**이다.
 * - 손대는 칸은 점검(`audit.ts`)이 짚은 칸뿐이다 — 기운 칸(표적 수 차 4 이상) · 표적 11개 이상인 묶음이 있는 칸. 표적 수의 차가 2 이상 줄 때만 옮긴다.
 * - 「글 표적이 없는 묶음」은 고치지 않는다 — 옆 묶음의 글 문장을 데려와야 하는데, 그것이 위의 주제 섞기다.
 */
import type { ConceptEntry } from "../../../src/contracts/conceptBlank.contract";
import { BANK_PARTS, PLUS_OF } from "../../../src/lib/concept-blank/bank";
import {
  FADING_MAX_PROPOSITIONS,
  buildFadingConcepts,
  fadingTargets,
} from "../../../src/lib/fading/concepts";
import { loadGroupTable, writeGroupTable } from "./table-file";

const WRITE = process.argv.includes("--write");
const MIN_PROPOSITIONS = 3;
/** 점검과 같은 문턱(`audit.ts`). */
const HEAVY_TARGETS = 11;
const LOPSIDED_GAP = 4;
/** 표적 수의 차가 이만큼은 줄어야 옮긴다. */
const MIN_GAIN = 2;
/**
 * 읽어 보고 **그대로 두기로 한 칸**(앞 묶음의 열쇠 → 까닭, 2026-10-06) — 넘어갈 끝 문장이 앞 묶음의 다른 문장과 짝이라, 넘기면 짝이 갈린다.
 * 도구가 고르게 하자고 낸 15칸을 묶음째 읽고 셋을 뺐다. 나머지 열둘은 넘어간 문장이 뒤 묶음의 주제와 이어지거나 홀로 서는 문장이다.
 */
const KEEP: Readonly<Record<string, string>> = {
  "m2-02-02-c3": "«괄호가 있는 일차부등식»과 «괄호 앞이 음수일 때»가 짝이다",
  "m2-04-09-c7":
    "«두 직선과 x축이 만드는 삼각형»과 «두 직선과 y축이 만드는 삼각형»이 짝이다",
  "m3-05-02-c3":
    "«사분원에서 사인과 코사인»에서 «0°, 90°의 삼각비의 값»이 나온다 · 넘기면 뒤 묶음이 표적 11개가 된다",
};

async function main() {
  let touched = 0;
  const before = { lopsided: 0, heavy: 0 };
  const after = { lopsided: 0, heavy: 0 };
  for (const [part, bank] of Object.entries(BANK_PARTS)) {
    if (PLUS_OF[part]) continue;
    const plus = Object.entries(PLUS_OF).find(([, base]) => base === part)?.[0];
    const entries: ConceptEntry[] = [
      ...bank.concepts,
      ...(plus ? BANK_PARTS[plus]!.concepts : []),
    ];
    const table = await loadGroupTable(part);
    if (!table) throw new Error(`묶음 표가 없다: ${part}`);
    const byId = new Map(entries.map((e) => [e.id, e]));
    const position = new Map(entries.map((e, i) => [e.id, i]));
    // 문장 하나의 표적 수 — 제품 함수로 센다(문장 하나짜리 개념을 지어 센다).
    const weight = new Map<string, number>();
    for (const concept of buildFadingConcepts(
      entries,
      Object.fromEntries(entries.map((e) => [e.id, [e.id]])),
    ))
      weight.set(concept.id, fadingTargets(concept).length);
    const sum = (ids: readonly string[]) =>
      ids.reduce((n, id) => n + weight.get(id)!, 0);
    const tally = (into: typeof before, targets: number[]) => {
      if (Math.max(...targets) - Math.min(...targets) >= LOPSIDED_GAP)
        into.lopsided += 1;
      into.heavy += targets.filter((t) => t >= HEAVY_TARGETS).length;
    };

    const cells = new Map<string, string[]>();
    for (const [key, members] of Object.entries(table)) {
      const first = byId.get(members[0]!)!;
      const cell = `${first.section} (${first.level})`;
      cells.set(cell, [...(cells.get(cell) ?? []), key]);
    }
    const next: Record<string, string[]> = Object.fromEntries(
      Object.entries(table).map(([key, members]) => [key, [...members]]),
    );
    for (const [cell, keys] of cells) {
      const now = keys.map((key) => sum(table[key]!));
      tally(before, now);
      const gap = Math.max(...now) - Math.min(...now);
      const [a, b] = keys;
      // 묶음이 둘인 칸에서, 앞 묶음이 무거울 때만 — 넘길 수 있는 것은 앞 묶음의 끝 문장뿐이다.
      const front = a && b && keys.length === 2 ? table[a]! : null;
      const back = front ? table[b!]! : null;
      const inOrder =
        front &&
        back &&
        position.get(front.at(-1)!)! < position.get(back[0]!)! &&
        front[0] === a &&
        back[0] === b;
      const flagged =
        !(a && KEEP[a]) &&
        (gap >= LOPSIDED_GAP || Math.max(...now) >= HEAVY_TARGETS);
      const shifted =
        inOrder &&
        flagged &&
        front.length > MIN_PROPOSITIONS &&
        back.length < FADING_MAX_PROPOSITIONS
          ? [front.slice(0, -1), [front.at(-1)!, ...back]]
          : null;
      const then = shifted?.map(sum);
      if (!shifted || !then || Math.abs(then[0]! - then[1]!) > gap - MIN_GAIN) {
        tally(after, now);
        continue;
      }
      next[a!] = shifted[0]!;
      next[b!] = shifted[1]!;
      tally(after, then);
      touched += 1;
      const moved = byId.get(front!.at(-1)!)!;
      console.info(
        `${cell}: ${a} ${now[0]} → ${then[0]} · ${b} ${now[1]} → ${then[1]}`,
      );
      console.info(
        `    넘긴 문장 ${moved.id} «${moved.term}» ${moved.definition}`,
      );
      console.info(
        `    뒤 묶음의 첫 문장 ${b} «${byId.get(b!)!.term}» ${byId.get(b!)!.definition}`,
      );
    }
    if (WRITE) await writeGroupTable(part, next);
  }
  console.info(
    `\n고친 칸 ${touched}(칸마다 한 문장)${WRITE ? " — 표를 썼다" : ""} · 기운 칸 ${before.lopsided} → ${after.lopsided} · 표적 ${HEAVY_TARGETS}개 이상인 묶음 ${before.heavy} → ${after.heavy}`,
  );
}
void main();
