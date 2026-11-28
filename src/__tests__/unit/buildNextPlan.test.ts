// @vitest-environment node
/**
 * 운영 빌드의 메모리 순서 (2026-11-28 — Vercel 2코어 · 8GB 에서 OOM 6회).
 *
 * 캐시 없는 배포에서 컴파일은 114s 에 통과했고, 그 뒤 Next 의 타입 검사(tsc ≈ 5GB)가
 * Turbopack 이 메모리에 그대로 떠 있는 동안 돌면서 «filesystem cache» 쓰기와 겹쳐 죽었다.
 * 그래서 타입 검사는 Next 밖에서 **먼저, 따로** 돌리고, 그것이 통과한 빌드에서만
 * Next 가 같은 검사를 건너뛴다. 타입 오류가 운영 빌드를 막는 것은 그대로다.
 */
import { describe, expect, it } from "vitest";
import { planBuild } from "../../../scripts/deploy/build-next-plan.mjs";
import nextConfig from "../../../next.config";

type Step = { args: string[]; env: Record<string, string | undefined> };

describe("production build plan", () => {
  const steps: Step[] = planBuild({
    env: { NODE_OPTIONS: "--foo" },
    argv: ["--debug"],
    execPath: "/usr/bin/node",
    cwd: "/repo",
  });

  it("type-checks the shipped code before next build, in its own process", () => {
    expect(steps).toHaveLength(3);
    expect(steps[0]!.args.join(" ")).toContain("typescript/bin/tsc");
    expect(steps[0]!.args).toEqual(
      expect.arrayContaining(["--noEmit", "--project", "tsconfig.build.json"]),
    );
    expect(steps[1]!.args.join(" ")).toContain(
      "next/dist/bin/next build --debug",
    );
  });

  it("checks the artifact budget after next build", () => {
    expect(steps[2]!.args.join(" ")).toContain(
      "scripts/deploy/check-build-budget.mjs",
    );
  });

  it("tells next build to skip its own check only after tsc passed", () => {
    expect(steps[0]!.env.NEXT_BUILD_TYPECHECKED).toBeUndefined();
    expect(steps[1]!.env.NEXT_BUILD_TYPECHECKED).toBe("1");
    for (const step of steps)
      expect(step.env.NODE_OPTIONS).toBe("--foo --max-old-space-size=8192");
  });

  it("keeps Next's type check when next build runs on its own", () => {
    // 이 시험 프로세스에는 신호가 없다 — 설정은 검사를 켠 채다.
    expect(process.env.NEXT_BUILD_TYPECHECKED).toBeUndefined();
    expect(nextConfig.typescript?.ignoreBuildErrors).toBe(false);
    expect(nextConfig.typescript?.tsconfigPath).toBe("tsconfig.build.json");
  });

  it("does not restore or write the Turbopack build cache", () => {
    // 받아 온 2.3GB 캐시로 시작한 빌드는 컴파일에서 12 ~ 20분을 끌다 죽었다.
    expect(nextConfig.experimental?.turbopackFileSystemCacheForBuild).toBe(
      false,
    );
    expect(nextConfig.experimental?.turbopackSourceMaps).toBe(false);
  });
});
