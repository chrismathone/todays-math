import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { realpath } from "node:fs/promises";
import path from "node:path";

// Start only after the lead grants the Chromium turn. No env file or API adapter.
export async function startServer() {
  const root = process.cwd();
  const server = await createServer({
    configFile: false,
    root: path.join(root, "scripts/qa/srs-m05-m06-memory"),
    publicDir: path.join(root, "public"),
    cacheDir:
      "/Users/pss/Desktop/creative/display-survey/srs-m05-m06-20261021/vite-cache",
    plugins: [
      {
        name: "memory-next-adapter",
        enforce: "pre",
        resolveId(id) {
          if (id === "next/dynamic") return "\0qa:dynamic";
        },
        load(id) {
          if (id === "\0qa:dynamic")
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
if (process.argv.includes("--serve-only")) {
  const server = await startServer();
  console.log(server.resolvedUrls.local[0]);
}
