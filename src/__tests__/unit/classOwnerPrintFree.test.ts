/**
 * 🔴 인쇄 지면에는 담당을 넣지 않는다 — **화면만** (D-132 ⑺, 원장님 2026-09-16 «화면만»).
 *
 * 종이는 학생에게 간다. 시험지 머리(«테스트반 · 8문항»)에 «강선생» · «내 반» 이 찍히면 안 된다.
 * 담당은 서버가 관리자에게 싣고(`classOwner` · `owner`), 화면은 `OwnerTag` · `classOptionLabel` 로
 * 그린다 — 그러니 인쇄 경로가 그 이름들을 **부르지 않으면** 종이에 담당이 올라갈 길이 없다.
 *
 * jsdom 시험으로는 «지면에 안 보인다»를 관리자 데이터마다 물어야 하고, 새 인쇄 틀이 생기면 빠진다.
 * 그래서 인쇄 경로 **전체 파일**을 읽어 담당 어휘가 한 번도 안 나오는지 본다(`noRmSync.test.ts` 와 같은 결).
 * `ownerScope`(D-130 소유 범위 — 인쇄 권한)는 담당이 아니라 허용한다.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../..");
const PRINT_ROOTS = [
  path.join("src", "components", "print"),
  path.join("src", "app", "(main)", "tests", "[id]", "print"),
  path.join("src", "lib", "print"),
];
const EXT = new Set([".ts", ".tsx", ".css"]);

/** 담당을 지면에 올리는 어휘 — 딱지 · 글자 규칙 · 계약 칸 · 조인 조각 */
const OWNER_WORDS =
  /\bOwnerTag\b|ownerLabel|classOwner|CLASS_OWNER_NAME|classOptionLabel|classOptionTitle|ownerTagText|MY_CLASS_LABEL|\.owner\b|내 반|담당/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (EXT.has(path.extname(name))) out.push(full);
  }
  return out;
}

describe("인쇄 지면에는 담당이 없다 (D-132 ⑺)", () => {
  const files = PRINT_ROOTS.flatMap((root) => walk(path.join(ROOT, root)));

  it("인쇄 경로 파일을 실제로 읽었다(분모가 0 이면 이 시험은 아무것도 안 본다)", () => {
    expect(files.length).toBeGreaterThanOrEqual(10);
    expect(files.some((f) => f.endsWith(path.join("print", "page.tsx")))).toBe(
      true,
    );
    expect(files.some((f) => f.endsWith("TestPrint.tsx"))).toBe(true);
  });

  it("담당 어휘가 한 번도 안 나온다", () => {
    const hits = files.flatMap((file) =>
      readFileSync(file, "utf8")
        .split(/\r?\n/)
        .map((line, i) => ({ line, i }))
        .filter(({ line }) => OWNER_WORDS.test(line))
        .map(
          ({ line, i }) =>
            `${path.relative(ROOT, file)}:${i + 1} ${line.trim()}`,
        ),
    );
    expect(hits).toEqual([]);
  });
});
