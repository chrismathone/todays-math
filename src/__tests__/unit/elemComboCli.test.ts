import { spawnSync } from "node:child_process";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const TSX = path.join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");
const CLI = path.join(ROOT, "scripts", "elem", "gen-cli.ts");
const COMBO = "초5|2-2-3::초5|1-6-2";

function run(args: string[]) {
  return spawnSync(process.execPath, [TSX, CLI, ...args], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 20_000,
  });
}

describe("[초등 결합형 CLI] 명시적인 별도 경로", () => {
  it("--list-combos는 승인 등록부의 id와 두 문형을 보여 준다", () => {
    const result = run(["--list-combos"]);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain(COMBO);
    expect(result.stdout).toContain("nested-part");
    expect(result.stdout).toContain("remainder-part");
  });

  // ⚠️ **예산을 넉넉히 준다.** 이 시험은 `tsx` 로 CLI 를 **두 번** 띄운다 —
  //    아무도 안 쓸 때도 15.5초가 걸린다(실측). vitest 기본 예산이 20초라 여유가
  //    22% 뿐이고, 다른 세션이 같이 돌면 그대로 **시간 초과로 빨개진다**(2026-08-28
  //    관문에서 실제로 그랬다. 따로 돌리면 통과). 「부하 때만 빨간」 시험은 아무것도
  //    안 재면서 관문을 막고, 그러면 다음 사람이 관문을 우회한다.
  it("--combo는 같은 씨앗으로 같은 JSON 세트를 낸다", () => {
    const args = ["--combo", COMBO, "--count", "3", "--seed", "20260824"];
    const first = run(args);
    const second = run(args);
    expect(first.status, first.stderr).toBe(0);
    expect(second.status, second.stderr).toBe(0);
    const a = JSON.parse(first.stdout);
    const b = JSON.parse(second.stdout);
    // 실행 시각만 재현 대상이 아니다.
    delete a.meta.generatedAt;
    delete b.meta.generatedAt;
    expect(a).toEqual(b);
    expect(a.meta.comboId).toBe(COMBO);
    expect(a.items).toHaveLength(3);
    expect(
      a.items.every(
        (item: { problem: { kind: string } }) => item.problem.kind === "combo",
      ),
    ).toBe(true);
  }, 90_000);

  it("결합형과 기존 grade/section/tier 옵션은 섞지 못한다", () => {
    const result = run([
      "--combo",
      COMBO,
      "--grade",
      "초5",
      "--section",
      "2-2-3",
    ]);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/결합형|같이/);
  });
});
