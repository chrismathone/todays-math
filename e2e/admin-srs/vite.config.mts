import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
const local = (name: string) => fileURLToPath(new URL(name, import.meta.url));
export default defineConfig({
  root: local("../.."),
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: "@/app/actions/auth",
        replacement: local("../admin-accounts/auth.ts"),
      },
      { find: "next/link", replacement: local("../admin-accounts/link.tsx") },
      {
        find: "next/navigation",
        replacement: local("../admin-accounts/navigation.ts"),
      },
      { find: "next/dynamic", replacement: local("./dynamic.tsx") },
      ...[
        "./BankView",
        "./StudioView",
        "./WorksheetEditor",
        "./ConceptView",
        "@/components/concept-blank/ConceptBlankView",
        "@/components/textbook/TextbookStudioView",
        "@/components/english/EnglishStudio",
        "@/components/english/listening/ListeningStudio",
        "@/components/english/bank/EnglishResourceBank",
      ].map((find) => ({ find, replacement: local("./unusedView.tsx") })),
      { find: "@", replacement: local("../../src") },
    ],
  },
  optimizeDeps: { entries: [local("./index.html")] },
  server: { host: "127.0.0.1", port: 4326, strictPort: true },
  envDir: false,
});
