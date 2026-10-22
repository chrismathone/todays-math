import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { realpath } from "node:fs/promises";
import path from "node:path";

// The caller must hold the coordinator's single browser/server lease.
export async function startServer() {
  const root = process.cwd();
  const server = await createServer({
    configFile: false,
    envDir: false,
    root: path.join(root, "scripts/qa/math-insight-ui"),
    publicDir: path.join(root, "public"),
    cacheDir: path.join(root, ".qa-artifacts/math-insight-ui-cache"),
    plugins: [
      {
        name: "insight-memory-next-adapters",
        enforce: "pre",
        resolveId(id) {
          if (["next/link", "next/navigation", "next/dynamic"].includes(id))
            return `\0qa:${id}`;
        },
        load(id) {
          if (id === "\0qa:next/link")
            return 'import React from "react"; export default function Link({prefetch,...props}) { return React.createElement("a",props); }';
          if (id === "\0qa:next/navigation")
            return 'export const useRouter=()=>({push(){},replace(){},refresh(){}}); export const usePathname=()=>"/"; export const useSearchParams=()=>new URLSearchParams();';
          if (id === "\0qa:next/dynamic")
            return 'import React from "react"; export default function dynamic(loader) { const C=React.lazy(()=>loader().then(m=>({default:m.default??m}))); return p=>React.createElement(React.Suspense,{fallback:null},React.createElement(C,p)); }';
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
