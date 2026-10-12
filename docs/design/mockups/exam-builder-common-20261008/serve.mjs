// Local-only preview; serves these mockups and the existing shared font.
import http from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const font = resolve(root, "../../../../public/fonts/PretendardVariable.woff2");
const port = Number(process.env.EXAM_MOCKUP_PORT || 3178);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".png": "image/png",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".woff2": "font/woff2",
};
http
  .createServer(async (req, res) => {
    try {
      if (req.method !== "GET" && req.method !== "HEAD") {
        res.writeHead(405).end();
        return;
      }
      const path = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      const target =
        path === "/public/fonts/PretendardVariable.woff2"
          ? font
          : resolve(root, path === "/" ? "index.html" : "." + path);
      if (
        (target !== font && !target.startsWith(root + sep)) ||
        !mime[extname(target)]
      ) {
        res.writeHead(404).end("Not found");
        return;
      }
      const data = await readFile(target);
      res.writeHead(200, {
        "Content-Type": mime[extname(target)],
        "Cache-Control": "no-store",
      });
      res.end(req.method === "HEAD" ? undefined : data);
    } catch {
      res.writeHead(404).end("Not found");
    }
  })
  .listen(port, "127.0.0.1", () =>
    console.log(`Exam design comparison: http://127.0.0.1:${port}/`),
  );
