/**
 * 변이 하네스의 **넓은 목록**에 «지문 잠금» 시험이 들어가면 하네스가 도장이 된다 (2026-09-28 리드 검토).
 *
 * `elemG6LazyTables.test.ts` 는 초6 후보 표 55개의 **내용**을 지문으로 잠근다. 표 안을 건드리는 변이는
 * 가드가 물든 안 물든 **전부** 그 지문에 걸린다. 그 파일이 `engine_test_files()`(엔진을 부르는 시험 전부)에
 * 들면, 좁은 목록이 초록인 변이 — 곧 «가드가 못 무는» 변이 — 가 GREEN 대신 RED_WIDE 로 찍혀
 * 「시험이 못 잡는다」가 구조적으로 안 보인다. 그래서 지문 잠금 파일은 표지로 넓은 목록에서 뺀다.
 */
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

function wideList(): string[] {
  const run = spawnSync(
    "python",
    [
      "-c",
      [
        "import importlib.util, json, sys",
        "sys.argv = ['x']",
        "spec = importlib.util.spec_from_file_location('m', 'scripts/qa/mutate-elem-tiers.py')",
        "m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)",
        "print(json.dumps(m.engine_test_files()))",
      ].join("\n"),
    ],
    { encoding: "utf8", env: { ...process.env, PYTHONIOENCODING: "utf-8" } },
  );
  expect(run.status, run.stderr).toBe(0);
  return JSON.parse(run.stdout.trim().split("\n").pop()!);
}

describe("mutate-elem-tiers — wide list", () => {
  it("leaves out a test that locks table contents, keeps the guard tests", () => {
    const wide = wideList();
    expect(wide).not.toContain("src/__tests__/unit/elemG6LazyTables.test.ts");
    expect(wide).toContain("src/__tests__/unit/elemTiersG6.test.ts");
    expect(wide).toContain("src/__tests__/unit/elemFigureReference.test.ts");
  }, 60_000);
});
