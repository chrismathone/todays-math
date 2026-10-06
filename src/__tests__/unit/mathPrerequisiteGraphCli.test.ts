// @vitest-environment node
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import graph from "../../../math_graph_2022.json";

const source = fileURLToPath(
  new URL("../../../math-graph.cjs", import.meta.url),
);
const prefix = "math-graph-cli-";
const sandboxes: string[] = [];
function sandbox() {
  const directory = mkdtempSync(join(tmpdir(), prefix));
  sandboxes.push(directory);
  copyFileSync(source, join(directory, "math-graph.cjs"));
  return directory;
}
function run(directory: string, args: string[]) {
  return spawnSync(process.execPath, args, {
    cwd: directory,
    encoding: "utf8",
    timeout: 10000,
  });
}
afterEach(async () => {
  for (const directory of sandboxes.splice(0)) {
    // Check the absolute target before recursive removal, including on Windows.
    const target = resolve(directory);
    if (
      dirname(target) !== resolve(tmpdir()) ||
      !basename(target).startsWith(prefix)
    )
      throw new Error(
        "Refusing cleanup outside this test's named temporary directories",
      );
    await rm(target, { recursive: true, force: true });
  }
});

describe("standalone math graph CLI in an otherwise empty folder", () => {
  it("requires without builds, output, option parsing or file writes", () => {
    const directory = sandbox();
    const result = run(directory, [
      "-e",
      "const api = require('./math-graph.cjs'); if (typeof api.buildGraph !== 'function' || typeof api.reviewCandidates !== 'function') process.exit(2);",
      "--",
      "--not-a-cli-option",
    ]);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
    expect(readdirSync(directory)).toEqual(["math-graph.cjs"]);
  });

  it("writes reproducible canonical JSON and readable actual counts by default with Node core only", () => {
    const directory = sandbox();
    const result = run(directory, ["math-graph.cjs"]);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('"unitCount": 100');
    expect(result.stdout).toContain('"topicCount": 356');
    expect(readdirSync(directory).sort()).toEqual([
      "math-graph.cjs",
      "math_graph_2022.json",
      "math_graph_2022.md",
    ]);
    expect(
      JSON.parse(readFileSync(join(directory, "math_graph_2022.json"), "utf8")),
    ).toEqual(graph);
    const markdown = readFileSync(
      join(directory, "math_graph_2022.md"),
      "utf8",
    );
    expect(markdown).toContain(`- graphContentHash: ${graph.graphContentHash}`);
    expect(markdown).toContain("- prerequisiteEdgeCount: 186");
    expect(markdown).toContain("- containmentEdgeCount: 356");
    expect(markdown).toContain("M1-D01 | 수학 | 자료 정리와 대푯값");
    expect(markdown).toContain("영역 (편집 분류)");
    expect(markdown).toContain("성취기준 번호별 전수 대조는 포함하지 않는다");
    const original = readFileSync(
      join(directory, "math_graph_2022.json"),
      "utf8",
    );
    expect(run(directory, ["math-graph.cjs"]).status).toBe(0);
    expect(readFileSync(join(directory, "math_graph_2022.json"), "utf8")).toBe(
      original,
    );
  });

  it.each([false, true])(
    "supports --out plus M3-R02 target (mastered=%s)",
    (mastered) => {
      const directory = sandbox();
      const args = [
        "math-graph.cjs",
        "--out",
        "output with spaces",
        "--target",
        "M3-R02",
      ];
      if (mastered) args.push("--mastered", " M1-N02 ");
      const result = run(directory, args);
      expect(result.status, result.stderr).toBe(0);
      expect(readdirSync(directory).sort()).toEqual([
        "math-graph.cjs",
        "output with spaces",
      ]);
      const output = join(directory, "output with spaces");
      expect(
        JSON.parse(readFileSync(join(output, "math_graph_2022.json"), "utf8")),
      ).toEqual(graph);
      expect(
        readFileSync(join(output, "math_graph_2022.md"), "utf8"),
      ).toContain("M3-R02 | 수학 | 이차방정식");
      const marker = "[선수 확인 후보] M3-R02";
      expect(result.stdout).toContain(marker);
      const candidates = JSON.parse(
        result.stdout
          .slice(result.stdout.indexOf(marker) + marker.length)
          .trim(),
      ) as { id: string; title: string; course: string; topics: string[] }[];
      const ids = candidates.map((candidate) => candidate.id);
      expect(ids).toEqual(
        expect.arrayContaining(["M3-R01", "M3-N01", "M1-R02"]),
      );
      expect(ids).not.toContain("M3-R02");
      if (mastered) {
        expect(ids).not.toContain("M1-N02");
        expect(ids).not.toContain("E56-N03");
      } else {
        expect(ids).toContain("M1-N02");
        expect(ids).toContain("E56-N03");
      }
      expect(
        candidates.every(
          (candidate) =>
            candidate.title && candidate.course && candidate.topics.length,
        ),
      ).toBe(true);
    },
  );

  it.each([
    ["missing out", ["--out"], "옵션 값 누락"],
    ["missing target", ["--target"], "옵션 값 누락"],
    ["missing mastered", ["--mastered"], "옵션 값 누락"],
    ["unknown option", ["--unknown", "x"], "알 수 없는 옵션"],
    ["duplicate option", ["--out", "a", "--out", "b"], "중복 옵션"],
    [
      "unknown target",
      ["--out", "unsafe-output", "--target", "M3-R99"],
      "알 수 없는 목표",
    ],
    [
      "unknown mastered",
      ["--out", "unsafe-output", "--target", "M3-R02", "--mastered", "M1-N99"],
      "알 수 없는 숙달",
    ],
    ["mastered without target", ["--mastered", "M1-N02"], "--target이 필요"],
  ])("rejects %s before any output write", (_label, args, error) => {
    const directory = sandbox();
    const result = run(directory, ["math-graph.cjs", ...(args as string[])]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(error as string);
    expect(readdirSync(directory)).toEqual(["math-graph.cjs"]);
  });
});
