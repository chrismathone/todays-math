// @vitest-environment node
/**
 * 운영 빌드 산출물 예산 (P3a — `docs/planning/build-memory-plan-20261128.md`).
 *
 * 2026-11-28 의 OOM 은 데이터가 코드로 묶여 서버 청크가 11MB 씩 두 벌, 그 위에 서버 소스맵
 * 336MB 가 얹힌 것이었다. 그 모양이 다시 생기면 빌드가 끝난 자리에서 바로 운다.
 */
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  judgeBuild,
  measureBuild,
} from "../../../scripts/deploy/build-budget.mjs";
import budget from "../../../scripts/deploy/build-budget.json";

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true });
});

/** 파일 이름 → 바이트 수(같은 숫자는 같은 내용이 아니도록 이름을 섞는다). */
function output(files: Record<string, number>) {
  const root = mkdtempSync(join(tmpdir(), "budget-"));
  dirs.push(root);
  for (const [name, size] of Object.entries(files)) {
    const path = join(root, name);
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, name.padEnd(size, "x"));
  }
  return root;
}

const healthy = {
  "server/chunks/a.js": 1_000,
  "server/app/page.js": 2_000,
  "static/chunks/b.js": 1_500,
};
const limits = {
  ...budget,
  limits: {
    ...budget.limits,
    serverJsBytes: 10_000,
    serverMaxChunkBytes: 4_000,
    staticJsBytes: 10_000,
    staticMaxChunkBytes: 4_000,
    largeChunkBytes: 2_500,
    largeServerChunks: 1,
  },
  baseline: {
    ...budget.baseline,
    serverJsBytes: 3_000,
    staticJsBytes: 1_500,
  },
};

describe("build artifact budget", () => {
  it("passes a healthy build and reports what it measured", () => {
    const measured = measureBuild(output(healthy), limits.limits);
    expect(measured).toMatchObject({
      serverJsBytes: 3_000,
      serverMaxChunk: { bytes: 2_000 },
      serverMaps: 0,
      staticJsBytes: 1_500,
      staticMaxChunk: { bytes: 1_500 },
    });
    expect(judgeBuild(measured, limits)).toEqual({
      failures: [],
      warnings: [],
    });
  });

  it.each([
    ["server source maps", { "server/chunks/a.js.map": 10 }, /소스맵/],
    [
      "an oversized server chunk",
      { "server/chunks/data.js": 5_000 },
      /서버 청크/,
    ],
    [
      "an oversized browser chunk",
      { "static/chunks/data.js": 5_000 },
      /브라우저 청크/,
    ],
    [
      "a new large data chunk",
      { "server/chunks/one.js": 3_000, "server/chunks/two.js": 3_100 },
      /큰 서버 청크/,
    ],
    [
      "server JS past the total",
      { "server/chunks/c.js": 3_900, "server/chunks/d.js": 3_900 },
      /서버 JS/,
    ],
  ])("fails on %s", (_, extra, message) => {
    const { failures } = judgeBuild(
      measureBuild(output({ ...healthy, ...extra }), limits.limits),
      limits,
    );
    expect(failures.join("\n")).toMatch(message);
  });

  it("counts one large chunk once even when routes ship identical copies", () => {
    // 같은 내용의 청크가 경로마다 한 벌씩 나오는 것은 새 데이터가 아니다.
    const root = output(healthy);
    for (const name of ["x", "y", "z"]) {
      const path = join(root, `server/chunks/${name}.js`);
      writeFileSync(path, "same".padEnd(3_000, "x"));
    }
    const measured = measureBuild(root, limits.limits);
    expect(measured.largeServerChunks).toHaveLength(1);
    const roomy = {
      ...limits,
      limits: { ...limits.limits, serverJsBytes: 20_000 },
    };
    expect(judgeBuild(measured, roomy).failures).toEqual([]);
  });

  it("fails when there is nothing to measure", () => {
    const empty = output({ "server/app/page.html": 10 });
    expect(() => measureBuild(empty)).toThrow(/JS/);
    expect(() => measureBuild(join(empty, "missing"))).toThrow();
  });

  it("warns on growth past the recorded baseline without failing", () => {
    const { failures, warnings } = judgeBuild(
      measureBuild(
        output({ ...healthy, "server/chunks/e.js": 1_000 }),
        limits.limits,
      ),
      limits,
    );
    expect(failures).toEqual([]);
    expect(warnings.join("\n")).toMatch(/기준선/);
  });

  it("keeps today's real build inside its own budget", () => {
    // 기준선이 한도 밖이면 첫 빌드부터 막힌다 — 기록한 숫자끼리 앞뒤가 맞아야 한다.
    const { baseline, limits: real } = budget;
    expect(baseline.serverJsBytes).toBeLessThan(real.serverJsBytes);
    expect(baseline.serverMaxChunkBytes).toBeLessThan(real.serverMaxChunkBytes);
    expect(baseline.staticJsBytes).toBeLessThan(real.staticJsBytes);
    expect(baseline.staticMaxChunkBytes).toBeLessThan(real.staticMaxChunkBytes);
    expect(baseline.largeServerChunks).toBeLessThanOrEqual(
      real.largeServerChunks,
    );
    expect(real.serverMaps).toBe(0);
  });
});
