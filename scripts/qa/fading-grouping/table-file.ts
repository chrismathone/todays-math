/** 묶음 표 파일(`src/lib/fading/groups/<학년>.ts`)을 읽고 쓰는 길 — 맞추기(`sync.ts`)와 고르게 하기(`rebalance.ts`)가 같이 쓴다. */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { FadingGroupTable } from "../../../src/lib/fading/concepts";

export const GROUPS_DIR = "src/lib/fading/groups";

const HEAD = (
  part: string,
) => `import type { FadingGroupTable } from "../concepts";

/**
 * 묶음 표 — \`${part}\`. 개념의 열쇠 → 그 개념의 명제(개념 백지 은행의 뜻 문장)의 id.
 * 🔴 열쇠는 학생 기록의 열쇠다 — 바꾸거나 지우지 않는다. 손으로 고칠 때는 문장을 묶음 사이로 옮기기만 한다
 * (같은 소단원 · 난이도 안에서 · 다섯 이하). 은행과 맞추는 일은 \`scripts/qa/fading-grouping/sync.ts --write\` 가 한다.
 */
export const groups: FadingGroupTable = `;

export async function loadGroupTable(
  part: string,
): Promise<FadingGroupTable | null> {
  const file = join(process.cwd(), GROUPS_DIR, `${part}.ts`);
  if (!existsSync(file)) return null;
  const loaded = (await import(pathToFileURL(file).href)) as {
    groups: FadingGroupTable;
  };
  return loaded.groups;
}

export async function writeGroupTable(
  part: string,
  table: FadingGroupTable,
): Promise<void> {
  const prettier = await import("prettier");
  const file = join(GROUPS_DIR, `${part}.ts`);
  mkdirSync(GROUPS_DIR, { recursive: true });
  const code = `${HEAD(part)}${JSON.stringify(table, null, 2)};\n`;
  writeFileSync(
    file,
    await prettier.format(code, {
      ...(await prettier.resolveConfig(file)),
      filepath: file,
    }),
    "utf8",
  );
}
