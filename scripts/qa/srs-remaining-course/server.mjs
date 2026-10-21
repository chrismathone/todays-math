import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { realpath } from "node:fs/promises";
import path from "node:path";

export async function startServer() {
  const root = process.cwd();
  const server = await createServer({
    configFile: false,
    // Server-only rollout flag has its normal unset behavior in this local memory harness.
    define: { "process.env.MATH_PREREQ_CHECK": "undefined" },
    root: path.join(root, "scripts/qa/srs-remaining-course"),
    publicDir: path.join(root, "public"),
    cacheDir: path.join(root, ".qa-artifacts/srs-remaining-course-cache"),
    plugins: [
      {
        name: "local-next-adapters",
        enforce: "pre",
        resolveId(id, importer) {
          if (
            id === "./courseApi" &&
            importer?.endsWith("/StudentCourseSrs.tsx")
          )
            return path.join(root, "scripts/qa/srs-remaining-course/memory.ts");
          if (["next/dynamic", "next/link", "next/navigation"].includes(id))
            return `\0qa:${id}`;
        },
        load(id) {
          if (id === "\0qa:next/dynamic")
            return 'import React from "react"; export default function dynamic(loader) { const C=React.lazy(() => loader().then(mod => ({default: mod.default ?? mod}))); return function Dynamic(props) { return React.createElement(React.Suspense,{fallback:null},React.createElement(C,props)); }; }';
          if (id === "\0qa:next/link")
            return 'import React from "react"; export default function Link({prefetch,...props}) { return React.createElement("a",props); }';
          if (id === "\0qa:next/navigation")
            return 'const router={refresh(){},replace(){},push(){}}; export const useRouter=()=>router; export const usePathname=()=>"/learn"; export const useSearchParams=()=>new URLSearchParams();';
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
if (process.argv.includes("--serve-only")) {
  const server = await startServer();
  console.log(server.resolvedUrls.local[0]);
}
