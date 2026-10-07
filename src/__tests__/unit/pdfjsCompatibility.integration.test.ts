// @vitest-environment node
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import QRCode from "qrcode";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";
import type * as ListeningPdf from "@/components/english/bank/listeningPdfImport";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/studio-ai/guard", () => ({
  authorizeStudio: async () => ({ response: null }),
  STUDIO_HEADERS: { "Cache-Control": "private, no-store" },
}));
import { GET as studioWorker } from "@/app/api/studio/pdf-worker/route";
import { GET as studioAsset } from "@/app/api/studio/pdf-assets/[kind]/[filename]/route";
import { GET as devWorker } from "@/app/api/dev/unified/pdf-worker/route";
import { GET as devAsset } from "@/app/api/dev/unified/pdf-assets/[kind]/[filename]/route";
import { launchExportBrowser } from "@/lib/export/pdfServer";
import { verifyPdfQrPixels } from "@/lib/textbook/render/qrVerify.server";

// Opt-in: launches its own headless browser and loopback server. No app, DB or provider.
describe.skipIf(process.env.PDFJS_COMPAT_TEST !== "1")(
  "real PDF.js browser adapter compatibility",
  () => {
    it("renders with both routed workers, extracts/crops listening questions and verifies QR pixels", async () => {
      vi.stubEnv("NODE_ENV", "development");
      const root = dirname(
        createRequire(import.meta.url).resolve("pdfjs-dist/package.json"),
      );
      const adapter = ts.transpileModule(
        await readFile(
          "src/components/english/bank/listeningPdfImport.ts",
          "utf8",
        ),
        {
          compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ESNext,
          },
        },
      ).outputText;
      const errors: string[] = [];
      const requests: string[] = [];
      const server = createServer((request, response) => {
        void (async () => {
          const pathname = new URL(request.url!, "http://localhost").pathname;
          requests.push(pathname);
          let result: Response;
          if (pathname === "/") {
            result = new Response(
              '<!doctype html><script type="importmap">{"imports":{"pdfjs-dist":"/pdf.mjs"}}</script>',
              { headers: { "Content-Type": "text/html" } },
            );
          } else if (pathname === "/pdf.mjs") {
            result = new Response(
              await readFile(join(root, "build/pdf.mjs"), "utf8"),
              { headers: { "Content-Type": "text/javascript" } },
            );
          } else if (pathname === "/listening.mjs") {
            result = new Response(adapter, {
              headers: { "Content-Type": "text/javascript" },
            });
          } else if (pathname === "/api/studio/pdf-worker") {
            result = await studioWorker(
              new Request(`http://localhost${pathname}`),
            );
          } else if (pathname === "/api/dev/unified/pdf-worker") {
            result = await devWorker();
          } else {
            const match = pathname.match(
              /^\/api\/(studio|dev\/unified)\/pdf-assets\/([^/]+)\/([^/]+)$/,
            );
            result = match
              ? await (match[1] === "studio" ? studioAsset : devAsset)(
                  new Request(`http://localhost${pathname}`),
                  {
                    params: Promise.resolve({
                      kind: match[2],
                      filename: match[3],
                    }),
                  },
                )
              : new Response(null, { status: 404 });
          }
          response.writeHead(result.status, Object.fromEntries(result.headers));
          response.end(Buffer.from(await result.arrayBuffer()));
        })().catch((error: unknown) => {
          errors.push(String(error));
          response.writeHead(500).end();
        });
      });
      let browser: Awaited<ReturnType<typeof launchExportBrowser>> | undefined;
      try {
        await new Promise<void>((resolve) =>
          server.listen(0, "127.0.0.1", resolve),
        );
        const address = server.address();
        if (!address || typeof address === "string")
          throw new Error("Loopback server unavailable");
        const origin = `http://127.0.0.1:${address.port}`;
        browser = await launchExportBrowser();
        const page = await browser.newPage();
        await page.setRequestInterception(true);
        page.on("request", (request) => {
          if (
            request.url().startsWith(`${origin}/`) ||
            request.url().startsWith("data:")
          )
            void request.continue();
          else {
            errors.push(`Unexpected browser request: ${request.url()}`);
            void request.abort();
          }
        });
        page.on("pageerror", (error) => errors.push(String(error)));
        const qrUrl = "https://example.invalid/textbook/synthetic-pdfjs-compat";
        const qr = await QRCode.toDataURL(qrUrl, {
          margin: 4,
          errorCorrectionLevel: "M",
        });
        await page.setContent(`<!doctype html><style>
          @page {size:210mm 297mm;margin:0} body {margin:0;font:16px Arial}
          .q {position:absolute;left:15mm} p {margin:4mm 0}
          </style><div class="q" style="top:30mm"><p>1. Choose the correct response.</p>
          <p>① Hello. ② Goodbye. ③ Thanks. ④ Yes. ⑤ No.</p></div>
          <div class="q" style="top:100mm"><p>2. Choose the next response.</p>
          <p>① One. ② Two. ③ Three. ④ Four. ⑤ Five.</p></div>
          <img src="${qr}" style="position:absolute;left:15mm;top:240mm;width:24mm;height:24mm">`);
        await page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all(
            Array.from(document.images).map((image) => image.decode()),
          );
        });
        const pdf = await page.pdf({
          preferCSSPageSize: true,
          printBackground: true,
        });
        await page.goto(origin);
        // Fixed browser imports stay outside Vite's server dynamic-import transform.
        await page.addScriptTag({
          content:
            'globalThis.pdfCompatModules = Promise.all([import("/pdf.mjs"), import("/listening.mjs")]);',
        });
        const result = await page.evaluate(async (encoded) => {
          const [pdfjs, listening] = await (
            globalThis as unknown as {
              pdfCompatModules: Promise<
                [typeof import("pdfjs-dist"), typeof ListeningPdf]
              >;
            }
          ).pdfCompatModules;
          const data = () =>
            Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
          const rendered: number[] = [];
          for (const scope of ["studio", "dev/unified"]) {
            pdfjs.GlobalWorkerOptions.workerSrc = `/api/${scope}/pdf-worker?v=${pdfjs.version}`;
            const document = await pdfjs.getDocument({
              data: data(),
              useSystemFonts: true,
              cMapUrl: `/api/${scope}/pdf-assets/cmaps/`,
              cMapPacked: true,
              standardFontDataUrl: `/api/${scope}/pdf-assets/standard_fonts/`,
              wasmUrl: `/api/${scope}/pdf-assets/wasm/`,
            }).promise;
            try {
              const canvas = globalThis.document.createElement("canvas");
              const page = await document.getPage(1);
              const viewport = page.getViewport({ scale: 1 });
              canvas.width = Math.ceil(viewport.width);
              canvas.height = Math.ceil(viewport.height);
              const context = canvas.getContext("2d", {
                willReadFrequently: true,
              })!;
              // Re-render the same canvas after cleanup, as the Studio page switch does.
              for (let repeat = 0; repeat < 2; repeat++) {
                await page.render({ canvas, canvasContext: context, viewport })
                  .promise;
                rendered.push(
                  context
                    .getImageData(50, 80, 450, 400)
                    .data.filter(
                      (value, index) => index % 4 !== 3 && value < 100,
                    ).length,
                );
                page.cleanup();
              }
            } finally {
              await document.loadingTask.destroy();
            }
          }
          const file = () =>
            new File([data()], "synthetic.pdf", { type: "application/pdf" });
          const text = await listening.readListeningPdfText(file());
          const questions = await listening.readListeningQuestionPdf(
            file(),
            2,
            new AbortController().signal,
          );
          const controller = new AbortController();
          controller.abort(new Error("Compatibility cancellation"));
          let cancellation = "";
          try {
            await listening.readListeningQuestionPdf(
              file(),
              2,
              controller.signal,
            );
          } catch (error) {
            cancellation = String(error);
          }
          return {
            version: pdfjs.version,
            rendered,
            text,
            cancellation,
            questions: questions.map((question) => ({
              number: question.sourceNumber,
              prompt: question.prompt,
              image: question.image?.dataUrl.startsWith(
                "data:image/png;base64,",
              ),
            })),
          };
        }, Buffer.from(pdf).toString("base64"));
        expect(result.version).toBe(
          JSON.parse(await readFile(join(root, "package.json"), "utf8"))
            .version,
        );
        expect(result.rendered).toHaveLength(4);
        expect(result.rendered.every((pixels) => pixels > 100)).toBe(true);
        expect(result.text).toContain("Choose the correct response.");
        expect(result.questions).toEqual([
          { number: 1, prompt: "Choose the correct response.", image: true },
          { number: 2, prompt: "Choose the next response.", image: true },
        ]);
        expect(result.cancellation).toContain("Compatibility cancellation");
        expect(requests).toContain("/api/studio/pdf-worker");
        expect(requests).toContain("/api/dev/unified/pdf-worker");
        await page.close();
        const rasterPath = process.env.PDFJS_COMPAT_RASTER;
        const checks = await verifyPdfQrPixels(
          browser,
          pdf,
          [
            {
              qrTargetId: "synthetic",
              url: qrUrl,
              pdfPageNumber: 1,
              physicalPageIndex: 1,
              xMm: 15,
              yMm: 240,
              widthMm: 24,
              heightMm: 24,
            },
          ],
          1,
          rasterPath
            ? {
                rasterPages: [1],
                onRaster: async (_page, png) => {
                  await writeFile(rasterPath, png);
                },
              }
            : {},
        );
        expect(checks[0]).toMatchObject({ decodedUrl: qrUrl, passed: true });
        expect(errors).toEqual([]);
        console.info(
          `PDFJS_COMPAT ${result.version}: ${await browser.version()}, 4 rasters, 2 listening crops, 1 decoded QR`,
        );
      } finally {
        await browser?.close();
        server.closeAllConnections();
        await new Promise<void>((resolve) => server.close(() => resolve()));
        vi.unstubAllEnvs();
      }
    }, 60_000);
  },
);
