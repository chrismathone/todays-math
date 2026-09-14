import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
const local = (name: string) => fileURLToPath(new URL(name, import.meta.url));
export const aliases = [
  { find: "@/app/actions/auth", replacement: local("./auth.ts") },
  { find: "@/lib/accountAccess", replacement: local("./accountAccess.ts") },
  { find: "next/link", replacement: local("./link.tsx") },
  { find: "next/navigation", replacement: local("./navigation.ts") },
  { find: "@", replacement: local("../../src") },
];
export default defineConfig({
  root: local("../.."),
  plugins: [react()],
  resolve: { alias: aliases },
  optimizeDeps: { entries: [local("./index.html")] },
  server: { host: "127.0.0.1", port: 4318, strictPort: true },
  envDir: false,
});
