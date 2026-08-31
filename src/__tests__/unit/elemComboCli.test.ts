import { spawnSync } from "node:child_process";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const TSX = path.join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");
const CLI = path.join(ROOT, "scripts", "elem", "gen-cli.ts");
const COMBO = "초5|2-2-3::초5|1-6-2";

/**
 * ⚠️ **예산은 `spawnSync` 쪽이 병목이다** (2026-08-31). 아래 주석이 경고한 「부하 때만
 *    빨간」 실패가 실제로 났는데, 늘린 것은 **vitest** 예산(`90_000`)이고 자식
 *    프로세스 예산은 `20_000` 그대로였다. 부하가 걸리면 `tsx` 기동만 20초를 넘어
 *    `spawnSync` 가 자식을 죽이고 `status` 가 **`null`** 로 온다 —
 *    「시간 초과」가 아니라 **「$0$ 이어야 하는데 `null`」** 이라 사유가 안 보인다.
 *    (실측: 아무도 안 쓸 때 CLI 한 번이 7.6초, 관문 부하에서는 20초 초과.)
 *
 *    2026-08-31 관문 네 회차에서 **네 번 다** 이것만 빨갰다. 늘 우는 가드는 꺼진다 —
 *    그래서 자식 예산을 `40_000` 으로 올린다(두 번 띄우는 시험도 $80$초로 아래
 *    `90_000` 안에 든다). 재는 것은 하나도 안 줄었다.
 */
function run(args: string[]) {
  return spawnSync(process.execPath, [TSX, CLI, ...args], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 40_000,
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
