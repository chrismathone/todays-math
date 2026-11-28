import path from "node:path";

/**
 * 운영 빌드의 차례: 타입 검사(tsc) → next build → 산출물 예산(`check-build-budget.mjs`).
 *
 * Next 안의 타입 검사는 Turbopack 이 메모리에 떠 있는 동안 돈다. Vercel(2코어 · 8GB)에서
 * 그 둘이 겹쳐 OOM 이 났다(2026-11-28). 그래서 tsc 를 먼저 따로 돌리고, 통과하면
 * `NEXT_BUILD_TYPECHECKED=1` 로 Next 가 같은 검사를 건너뛰게 한다(`next.config.ts`).
 * 시험: `src/__tests__/unit/buildNextPlan.test.ts`.
 */
export function planBuild({ env, argv, execPath, cwd }) {
  // Next forwards NODE_OPTIONS to its workers; a parent-only flag can be overridden
  // by inherited options. Keep other options and scope the budget to the build.
  const nodeOptions = `${env.NODE_OPTIONS ?? ""} --max-old-space-size=8192`.trim();
  const base = { ...env, NODE_OPTIONS: nodeOptions };
  return [
    {
      args: [
        path.resolve(cwd, "node_modules/typescript/bin/tsc"),
        "--noEmit",
        "--project",
        "tsconfig.build.json",
      ],
      env: base,
    },
    {
      args: [path.resolve(cwd, "node_modules/next/dist/bin/next"), "build", ...argv],
      env: { ...base, NEXT_BUILD_TYPECHECKED: "1" },
    },
    {
      // 큰 서버 청크 · 서버 소스맵 · 새 큰 청크가 다시 생기면 여기서 운다(P3a).
      args: [path.resolve(cwd, "scripts/deploy/check-build-budget.mjs")],
      env: base,
    },
  ].map((step) => ({ ...step, command: execPath }));
}
