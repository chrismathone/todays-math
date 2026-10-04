// Opt-in, loopback-only UI fixture. It imports no database or server handlers.
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { realpathSync } from "node:fs";

const root = fileURLToPath(new URL(".", import.meta.url));
const repo = resolve(root, "../../..");
const adapters = resolve(root, "../math-prerequisite");
const server = await createServer({
  configFile: false,
  root,
  publicDir: resolve(repo, "public"),
  cacheDir: resolve(repo, ".tmp-student-math-atelier-vite"),
  plugins: [
    react(),
    {
      name: "deny-unmocked-api",
      configureServer(vite) {
        vite.middlewares.use("/api", (_request, response) => {
          response.statusCode = 404;
          response.setHeader("content-type", "application/json");
          response.end(
            JSON.stringify({ error: "This fixture requires mocked APIs." }),
          );
        });
      },
    },
  ],
  resolve: {
    alias: {
      "@": resolve(repo, "src"),
      "next/dynamic": resolve(adapters, "nextDynamic.tsx"),
      "next/navigation": resolve(adapters, "nextNavigation.ts"),
      "next/link": resolve(root, "nextLink.tsx"),
      "next/image": resolve(adapters, "nextImage.tsx"),
    },
  },
  server: {
    host: "127.0.0.1",
    port: 4338,
    strictPort: true,
    open: false,
    fs: { allow: [repo, realpathSync(resolve(repo, "node_modules"))] },
  },
});
await server.listen();
server.printUrls();

for (const signal of ["SIGINT", "SIGTERM"])
  process.once(signal, async () => {
    await server.close();
    process.exit(0);
  });
