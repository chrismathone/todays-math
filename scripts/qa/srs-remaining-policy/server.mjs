import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { realpath } from "node:fs/promises";
import path from "node:path";

// Start only after the lead grants the Chromium turn. No env file or API adapter.
export async function startServer() {
  const root = process.cwd();
  const server = await createServer({
    configFile: false,
    // Pure in-memory course rules need the server-only prerequisite flag.
    // This fixture does not load environment files or change the real gate.
    envDir: false,
    define: { "process.env.MATH_PREREQ_CHECK": JSON.stringify("off") },
    root: path.join(root, "scripts/qa/srs-remaining-policy"),
    publicDir: path.join(root, "public"),
    cacheDir:
      "/Users/pss/Desktop/creative/display-survey/srs-remaining-20261022/policy/vite-cache",
    plugins: [
      {
        name: "plan-next-adapter",
        enforce: "pre",
        resolveId(id) {
          if (id === "server-only") return "\0qa:server-only";
          if (
            id === "@/app/actions/auth" ||
            /\/src\/app\/actions\/auth(?:\.ts)?$/.test(id)
          )
            return "\0qa:auth";
          if (["next/dynamic", "next/link", "next/navigation"].includes(id))
            return `\0qa:${id}`;
        },
        load(id) {
          if (id === "\0qa:server-only") return "export {};";
          if (id === "\0qa:auth") return "export const signOutAction=()=>{};";
          if (id === "\0qa:next/link")
            return 'import React from "react"; export const useLinkStatus=()=>({pending:false}); export default function Link({prefetch,...props}) { return React.createElement("a",props); }';
          if (id === "\0qa:next/navigation")
            return 'const router={refresh(){},replace(){},push(){}}; export const useRouter=()=>router; export const usePathname=()=>"/learn"; export const useSearchParams=()=>new URLSearchParams();';
          if (id === "\0qa:next/dynamic")
            return 'import React from "react"; export default function dynamic(loader) { const C=React.lazy(() => loader().then(mod => ({default: mod.default ?? mod}))); return function Dynamic(props) { return React.createElement(React.Suspense,{fallback:null},React.createElement(C,props)); }; }';
        },
        transform(code, id) {
          if (id.endsWith("/src/app/globals.css"))
            return code.replace(
              '@import "tailwindcss";',
              '@import "tailwindcss" source(none);',
            );
        },
      },
      react(),
    ],
    resolve: { alias: { "@": path.join(root, "src") } },
    optimizeDeps: { entries: ["index.html"] },
    server: {
      host: "127.0.0.1",
      port: 0,
      fs: { allow: [root, await realpath(path.join(root, "node_modules"))] },
    },
  });
  await server.listen();
  return server;
}
