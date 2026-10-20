import { configDefaults, defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// 참조: docs/planning/02-trd.md §7 (테스트 전략), §7.2 (테스트 피라미드)
export default defineConfig(({ mode }) => ({
  resolve: {
    // tsconfig.json의 "@/*" 별칭을 그대로 해석 (Vite 8 네이티브 지원)
    tsconfigPaths: true,
  },
  plugins: [react()],
  test: {
    environment: "jsdom",
    // mode는 vitest 실행 시 기본값 "test" → .env, .env.test, .env.test.local을
    // 로드해 process.env로 주입한다 (테스트 전용 DATABASE_URL 오버라이드 등).
    env: loadEnv(mode, process.cwd(), ""),
    globals: false,
    // mathgen 렌더 스택(react-markdown + remark-math + rehype-katex) 이식 후 문제 목록
    // 렌더가 무거워져 기본 5초로는 전체 실행에서만 타임아웃이 났다(격리 실행은 통과).
    // 렌더 자체는 정상이므로 상한만 현실화한다.
    testTimeout: 20000,
    setupFiles: ["./vitest.setup.ts"],
    // next-auth 는 `next/server` 를 확장자 없이 import 한다(`next-auth/lib/env.js`). Node 가 직접
    // 읽으면 「Cannot find module …/next/server」로 적재 단계에서 죽는다 — 그래서 지금까지 어떤
    // 시험도 진짜 next-auth 를 못 태우고 `@/lib/auth` 를 통째로 모킹했다. Vite 가 이 패키지를
    // 직접 해석하게 두면 `next/server` → `next/server.js` 로 풀린다. 이 설정이 바꾸는 것은
    // **진짜 next-auth 를 불러오는 시험**뿐이다(모킹한 시험은 그 모듈을 아예 안 읽는다).
    // 학생 세션의 모양은 next-auth 의 `getSession` 겹이 정한다 — 모킹하면 그 겹이 안 보인다
    // (`src/__tests__/helpers/authRequestContext.ts` 머리말, 2026-09-15 student-auth).
    server: { deps: { inline: ["next-auth"] } },
    include: ["src/__tests__/**/*.{test,spec}.{ts,tsx}"],
    // 외장 SSD(ExFAT) 워크트리는 쓰는 파일마다 `._이름` AppleDouble 파일을 만든다 — 시험으로 집지 않는다.
    exclude: [...configDefaults.exclude, "**/._*"],
    css: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/__tests__/**",
        "src/mocks/**",
        "src/app/**/layout.tsx",
        "src/**/*.d.ts",
      ],
      // 목표 80% (02-trd.md §7.2) — thresholds는 T0.4에서 미적용, 리포트만 생성.
      // 실제 기능 코드가 쌓이는 Phase 이후 thresholds 설정 예정.
    },
  },
}));
