import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { aliases } from "./vite.config.mts";
export default defineConfig({
  plugins: [react()],
  resolve: { alias: aliases },
  test: {
    environment: "jsdom",
    setupFiles: ["./e2e/admin-accounts/setup.ts"],
    include: [
      "src/__tests__/components/AdminAccounts.test.tsx",
      "src/__tests__/components/ApprovalPending.test.tsx",
      "src/__tests__/components/AdminUserDetail.test.tsx",
      "src/__tests__/components/AdminPages.test.tsx",
    ],
    testTimeout: 20000,
  },
  envDir: false,
});
