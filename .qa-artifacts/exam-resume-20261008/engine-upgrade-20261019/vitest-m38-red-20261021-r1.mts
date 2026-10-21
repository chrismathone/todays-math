import { defineConfig } from 'vitest/config';

// Read-only generation. Existing bank/database and layout batches are excluded.
export default defineConfig({ envDir: false, resolve: { tsconfigPaths: true }, test: {
  include: ['.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/m38-priority-test-proposal-20261021-r1.ts'],
  environment: 'node', globals: false, setupFiles: [], testTimeout: 40000, css: false,
  env: { DATABASE_URL:'postgresql://test:test@127.0.0.1:1/test', DIRECT_URL:'postgresql://test:test@127.0.0.1:1/test', AUTH_URL:'http://localhost', NEXTAUTH_URL:'' },
} });
