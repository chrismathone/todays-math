import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier/flat";

import affordance from "./src/lint/affordance-plugin.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettierConfig,
  {
    files: ["src/**/*.{tsx,jsx}"],
    plugins: { affordance },
    rules: {
      "affordance/no-false-affordance": "error",
    },
  },
  {
    // `.cjs` 는 CommonJS 다 — `require()` 가 유일한 불러오기다. lint-staged 가 `*.{ts,tsx}` 만 봐서
    // 추적되는 시안 렌더 스크립트(`docs/planning/mockups/*.cjs`)의 6건이 커밋에서는 안 걸리고
    // `npm run lint` 에서만 빨갰다(2026-10-07 검수).
    files: ["**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 테스트 산출물 (T0.4 — .gitignore "testing" 섹션과 동일 범위)
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    // 오르카가 만드는 중첩 워크트리 — 저장소 안에 있지만 git 추적 대상이 아니다
    // (.git/info/exclude). 이걸 안 빼면 `npm run lint`가 남의 사본 오류로 항상 빨갛다.
    ".claude/worktrees/**",
    // 임시 조사용 스크래치 (.gitignore "임시 조사용"). 커밋되지 않는 남의 조사
    // 파일 때문에 `npm run lint` 가 빨개지면 **게이트가 병합을 못 가른다** —
    // 실제로 병합 검수에서 `.probe/peek.ts` 의 any 3건으로 빨갛게 떴다.
    ".probe/**",
    // 같은 이유로 `.measure/**` 도 뺀다 — 재는 데 쓰고 버리는 스크래치라
    // 커밋되지 않는데(.gitignore), 남아 있으면 게이트가 남의 조사 파일 때문에
    // 빨개진다(2026-08-20: `find-poly.ts` 의 any 1건).
    ".measure/**",
    // 🔴 **이름을 하나씩 적으면 샌다.** 위 둘(`.probe`·`.measure`)이 그렇게 붙었고,
    //    2026-08-31 에 세션 스크래치 `.tmp-orca/`·`.tmp-adv/` 가 또 빨개졌다
    //    (`preset-probe` 의 any 6건). `.gitignore` 는 이미 `.tmp-*/` 로 고쳤는데
    //    **ESLint 는 `.gitignore` 를 안 본다** — 여기 따로 적어야 한다.
    //    늘 우는 가드는 꺼진다(2026-08-20). 세션 임시 작업터는 통째로 뺀다.
    ".tmp-*/**",
    // 같은 뿌리로 `.qa-artifacts/` 도 뺀다 — 브라우저 실측 산출물(.gitignore 49줄, 추적 0)인데
    // 그 안의 `.cjs` 탐침 `require()` 152건이 이 폴더가 있는 컴퓨터에서만 lint 를 빨갛게 했다
    // (2026-09-19 main 병합 검수 — 추적 파일의 오류는 0).
    ".qa-artifacts/**",
    // 또 같은 뿌리 — `output/` 은 내려받은 원본 · 산출물을 두는 로컬 폴더다(추적 0 · `.git/info/exclude`).
    // 2026-10-07 검수에서 `npm run lint` 오류 355건 가운데 347건이 `output/listening-assessments/` 의
    // 남의 스크립트였고, 추적 파일의 진짜 오류 8건이 그 뒤에 묻혀 있었다.
    "output/**",
  ]),
]);

export default eslintConfig;
