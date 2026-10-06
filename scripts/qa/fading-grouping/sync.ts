/**
 * «오늘의 기억» 묶음 표 맞추기 — 은행의 뜻 문장과 묶음 표(`src/lib/fading/groups/`)를 견준다.
 *
 *   npx tsx scripts/qa/fading-grouping/sync.ts            # 어긋난 것만 말한다(고치지 않는다 · 어긋나면 종료 코드 1)
 *   npx tsx scripts/qa/fading-grouping/sync.ts --write    # 표를 고쳐 쓴다
 *
 * 묶음 표의 열쇠는 **학생 기록의 열쇠**다. 그래서 이 도구는 열쇠를 바꾸지 않는다.
 * - 은행에서 사라진 문장은 묶음에서 뺀다. 묶음이 비면 그 열쇠가 사라진다 — 🔴 그 개념을 배운 학생의 기록이 갈 곳을 잃으니 따로 크게 말한다.
 * - 새 문장은 같은 소단원 · 난이도의 묶음 가운데 자리가 남은 마지막 묶음에 넣는다. 자리가 없으면 그 문장의 id 를 열쇠로 새 묶음을 만든다.
 * - 표가 아직 없는 학년은 규칙(`proposeFadingGroups`)으로 처음 만든다.
 * 어색한 묶음을 손으로 고칠 때는 표 파일에서 문장을 묶음 사이로 옮기기만 한다(같은 소단원 · 난이도 안에서 · 다섯 이하).
 */
import type { ConceptEntry } from "../../../src/contracts/conceptBlank.contract";
import { BANK_PARTS, PLUS_OF } from "../../../src/lib/concept-blank/bank";
import {
  FADING_MAX_PROPOSITIONS,
  proposeFadingGroups,
  type FadingGroupTable,
} from "../../../src/lib/fading/concepts";
import { loadGroupTable, writeGroupTable } from "./table-file";

const WRITE = process.argv.includes("--write");

function reconcile(
  part: string,
  entries: readonly ConceptEntry[],
  table: FadingGroupTable,
  notes: string[],
): Record<string, string[]> {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const position = new Map(entries.map((e, i) => [e.id, i]));
  const cellOf = (id: string) => {
    const entry = byId.get(id)!;
    return `${entry.section}||${entry.level}`;
  };
  const next: Record<string, string[]> = {};
  const placed = new Set<string>();
  for (const [id, members] of Object.entries(table)) {
    const kept = members.filter((m) => byId.has(m) && !placed.has(m));
    for (const m of members)
      if (!byId.has(m))
        notes.push(`${part}: 은행에서 사라진 문장 ${m} (묶음 ${id})`);
    kept.forEach((m) => placed.add(m));
    if (!kept.length) {
      notes.push(
        `🔴 ${part}: 열쇠가 사라진다 — ${id} (묶음의 문장이 은행에 하나도 없다)`,
      );
      continue;
    }
    if (new Set(kept.map(cellOf)).size > 1)
      notes.push(
        `🔴 ${part}: 묶음 ${id} 의 문장이 한 소단원 · 난이도가 아니다 — 손으로 고칠 것`,
      );
    next[id] = kept;
  }
  for (const entry of entries) {
    if (placed.has(entry.id)) continue;
    const cell = cellOf(entry.id);
    const room = Object.entries(next)
      .filter(
        ([, members]) =>
          members.length < FADING_MAX_PROPOSITIONS &&
          cellOf(members[0]!) === cell,
      )
      .at(-1);
    if (room) {
      room[1].push(entry.id);
      notes.push(`${part}: 새 문장 ${entry.id} → 묶음 ${room[0]}`);
    } else {
      next[entry.id] = [entry.id];
      notes.push(`${part}: 새 문장 ${entry.id} → 새 묶음`);
    }
    placed.add(entry.id);
  }
  // 은행 차례대로 — 묶음의 첫 문장이 놓인 자리로 줄 세운다.
  return Object.fromEntries(
    Object.entries(next).sort(
      (a, b) => position.get(a[1][0]!)! - position.get(b[1][0]!)!,
    ),
  );
}

async function main() {
  const notes: string[] = [];
  let groups = 0;
  let sentences = 0;
  for (const [part, bank] of Object.entries(BANK_PARTS)) {
    if (PLUS_OF[part]) continue;
    const plus = Object.entries(PLUS_OF).find(([, base]) => base === part)?.[0];
    const entries = [
      ...bank.concepts,
      ...(plus ? BANK_PARTS[plus]!.concepts : []),
    ];
    const existing = await loadGroupTable(part);
    if (!existing) notes.push(`${part}: 표가 없다 — 규칙으로 처음 만든다`);
    const table = reconcile(
      part,
      entries,
      existing ?? proposeFadingGroups(entries),
      notes,
    );
    groups += Object.keys(table).length;
    sentences += Object.values(table).reduce((sum, m) => sum + m.length, 0);
    if (WRITE) await writeGroupTable(part, table);
  }
  for (const note of notes) console.info(note);
  console.info(
    `묶음 ${groups} · 문장 ${sentences} · 어긋난 것 ${notes.length}${WRITE ? " — 표를 썼다" : ""}`,
  );
  process.exitCode = !WRITE && notes.length ? 1 : 0;
}
void main();
