import { fileURLToPath } from "node:url";
import { realpathSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const local = (name: string) => fileURLToPath(new URL(name, import.meta.url));

export default defineConfig({
  root: local("."),
  plugins: [
    react(),
    {
      name: "english-listening-development-fixtures",
      configureServer(server) {
        server.middlewares.use(async (request, response, next) => {
          if (!request.url?.startsWith("/__harness/")) return next();
          try {
            // Domain fixtures import node:crypto. Load exclusively in the Vite server.
            const fixture = await server.ssrLoadModule("/fixture-server.ts");
            await fixture.handleFixtureRequest(request, response);
          } catch (error) {
            server.config.logger.error(String(error));
            response.statusCode = 500;
            response.end("Development fixture failed");
          }
        });
      },
    },
  ],
  resolve: { alias: { "@": local("../../src") } },
  server: {
    host: "127.0.0.1",
    port: 4198,
    strictPort: true,
    fs: { allow: [local("../.."), realpathSync(local("../../node_modules"))] },
  },
});
