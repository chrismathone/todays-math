/** Local full story: production issuance/HTTP/services/screens, synthetic auth/model/storage, real local Postgres migrations. */
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile, readdir } from "node:fs/promises";
import { realpathSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import jsQR from "jsqr";

delete process.env.ANTHROPIC_API_KEY;
delete process.env.DATABASE_URL;
delete process.env.DIRECT_URL;
const root = fileURLToPath(new URL("../../..", import.meta.url));
const dir = fileURLToPath(new URL(".", import.meta.url));
const out = process.env.CB_SCAN_QA_OUTPUT ?? "/tmp/cb-scan-ship-20261125";
const base = "http://127.0.0.1:4250";
const originalFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = new URL(
    typeof input === "string" || input instanceof URL ? input : input.url,
  );
  if (url.origin !== base)
    throw new Error("External fetch forbidden in scan QA");
  return originalFetch(input, init);
};
const evidence = {
  requests: [],
  screens: [],
  errors: [],
  external: [],
  modelCalls: [],
  data: null,
};
const objects = new Map(),
  signed = new Map(),
  tasks = new Set();
let handlers, issuePaper, renderPaper, local, world, selection, bank, browser;
const actor = async (request, teacherOnly = false) => {
  const teacher = request.headers
    .get("cookie")
    ?.includes("scan-qa-role=teacher");
  if (teacherOnly && !teacher) throw new Error("Synthetic teacher required");
  return teacher ? world.teacher : world.student;
};
const server = await createServer({
  configFile: false,
  root: dir,
  appType: "spa",
  resolve: {
    alias: [
      { find: "@/lib/auth", replacement: path.join(dir, "e2e-auth.mjs") },
      { find: "@", replacement: path.join(root, "src") },
      { find: "server-only", replacement: path.join(dir, "server-only.mjs") },
    ],
    preserveSymlinks: true,
  },
  plugins: [
    react(),
    {
      name: "scan-local-http",
      configureServer(vite) {
        vite.middlewares.use(async (req, res, next) => {
          const pathname = new URL(req.url, base).pathname;
          if (pathname === "/concept-blank/scan") {
            req.url = `/e2e.html${req.url.slice(req.url.indexOf("?"))}`;
            return next();
          }
          if (pathname.startsWith("/qa-photo/")) {
            const token = signed.get(pathname),
              bytes =
                token && token.expires > Date.now()
                  ? objects.get(token.key)
                  : null;
            res.statusCode = bytes ? 200 : 404;
            res.setHeader("Cache-Control", "no-store");
            if (bytes) res.setHeader("Content-Type", token.mime);
            return res.end(bytes);
          }
          if (!pathname.startsWith("/api/concept-blank/scan/")) return next();
          try {
            const chunks = [];
            let length = 0;
            for await (const chunk of req) {
              length += chunk.length;
              if (length > 4_499_999) throw new Error("QA request budget");
              chunks.push(chunk);
            }
            const request = new Request(new URL(req.url, base), {
              method: req.method,
              headers: req.headers,
              ...(chunks.length ? { body: Buffer.concat(chunks) } : {}),
            });
            const suffix = pathname.slice("/api/concept-blank/scan".length);
            let response;
            if (suffix === "/issued" && req.method === "POST") {
              const who = await actor(request, true);
              const result = await issuePaper(who, await request.json(), {
                db: local.db,
                render: (id, value) =>
                  renderPaper({ id, selection: value, bank, origin: base }),
              });
              response = Response.json({ data: result }, { status: 201 });
            } else if (/^\/issued\/[^/]+$/.test(suffix))
              response = await handlers.issue(request, {
                params: Promise.resolve({ id: suffix.split("/")[2] }),
              });
            else if (suffix === "/submissions")
              response = await handlers.start(request);
            else {
              const [, , id, action, photoId] = suffix.split("/");
              const context = { params: Promise.resolve({ id, photoId }) };
              const name =
                action === "photos"
                  ? photoId
                    ? req.method === "DELETE"
                      ? "remove"
                      : "sign"
                    : "photo"
                  : action === "answers"
                    ? "answer"
                    : action === "jobs"
                      ? "job"
                      : action === "override"
                        ? "override"
                        : "get";
              response = await handlers[name](request, context);
            }
            evidence.requests.push({
              method: req.method,
              path: pathname,
              status: response.status,
              requestBytes: length,
            });
            res.statusCode = response.status;
            for (const [name, value] of response.headers)
              res.setHeader(name, value);
            res.end(Buffer.from(await response.arrayBuffer()));
          } catch (error) {
            evidence.errors.push(String(error));
            res.statusCode = 500;
            res.end(JSON.stringify({ error: { message: "Local QA failed" } }));
          }
        });
      },
    },
  ],
  server: {
    host: "127.0.0.1",
    port: 4250,
    strictPort: true,
    fs: { allow: [root, realpathSync(path.join(root, "node_modules"))] },
  },
});
try {
  await mkdir(out, { recursive: true });
  await server.listen();
  const { openScanTestDb } = await server.ssrLoadModule(
    "/src/__tests__/helpers/conceptBlankScanDb.ts".replace(
      "/src/",
      `${root}/src/`,
    ),
  );
  const { scanWorld } = await server.ssrLoadModule(
    `${root}/src/__tests__/helpers/conceptBlankScanFixture.ts`,
  );
  const { createScanHttpHandlers } = await server.ssrLoadModule(
    `${root}/src/lib/concept-blank/scan/httpHandlers.ts`,
  );
  const { scanConfig } = await server.ssrLoadModule(
    `${root}/src/lib/concept-blank/scan/model.ts`,
  );
  ({ issueScanPaper: issuePaper } = await server.ssrLoadModule(
    `${root}/src/lib/concept-blank/scan/issuance.ts`,
  ));
  const paper = await server.ssrLoadModule(
    `${root}/src/lib/concept-blank/scan/paper.server.ts`,
  );
  renderPaper = paper.renderScanPaper;
  local = await openScanTestDb();
  world = await scanWorld(local);
  const { loadWireSamples } = await server.ssrLoadModule(
    `${root}/src/app/dev/concept-blank-scan-wire/samples.ts`,
  );
  const { loadGradeBank } = await server.ssrLoadModule(
    `${root}/src/lib/concept-blank/bank/load.ts`,
  );
  selection = (await loadWireSamples()).find((s) => s.id === "multi").selection;
  bank = await loadGradeBank("초5");
  const storage = {
    bucket: "qa-private",
    upload: async (key, bytes) => objects.set(key, Buffer.from(bytes)),
    read: async (key) => objects.get(key),
    remove: async (key) => objects.delete(key),
    signedUrl: async (key, seconds) => {
      const token = `/qa-photo/${randomUUID()}`;
      const meta = await sharp(objects.get(key)).metadata();
      signed.set(token, {
        key,
        expires: Date.now() + seconds * 1000,
        mime: `image/${meta.format === "jpg" ? "jpeg" : meta.format}`,
      });
      return `${base}${token}`;
    },
  };
  const model = async (request) => {
    evidence.modelCalls.push({
      operation: request.operation,
      promptVersion: request.promptVersion,
    });
    const input = JSON.parse(request.prompt.split("\n").at(-1));
    if (request.operation === "read")
      return JSON.stringify({
        slots: input.slots.map((slot, i) => ({
          id: slot.id,
          status: i < 2 ? "unreadable" : "read",
          text: i < 2 ? "" : "대응하는 변의 길이가 같습니다.",
        })),
      });
    return JSON.stringify({
      grades: input.map((target, i) => ({
        id: target.id,
        label: i % 2 ? "partial" : "correct",
        reason:
          i % 2
            ? "대응하는 각에 대한 설명이 더 필요합니다."
            : "요구한 뜻을 설명했습니다.",
      })),
    });
  };
  handlers = createScanHttpHandlers({
    actor,
    runtime: () => ({
      db: local.db,
      origin: base,
      storage: () => storage,
      config: () => scanConfig({}),
      model: () => model,
    }),
    schedule: (run) => {
      const task = Promise.resolve().then(run);
      tasks.add(task);
      void task.finally(() => tasks.delete(task));
    },
  });
  // Issuance and PDF rendering finish before the only interactive Chromium starts.
  const issuedResponse = await fetch(`${base}/api/concept-blank/scan/issued`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      origin: base,
      cookie: "scan-qa-role=teacher",
    },
    body: JSON.stringify({ requestId: randomUUID(), selection }),
  });
  expect(issuedResponse.status).toBe(201);
  const { data: issued } = await issuedResponse.json();
  const [stored] = await local.db.query(
    "SELECT render_artifact,layout FROM concept_blank_printed_sheet WHERE id=$1",
    [issued.id],
  );
  await writeFile(
    path.join(out, "flow-issued.pdf"),
    await paper.scanPaperPdf(stored.render_artifact),
  );
  const raster = path.join(out, `flow-raster-${Date.now()}`);
  await mkdir(raster);
  execFileSync("pdftoppm", [
    "-r",
    "300",
    "-png",
    path.join(out, "flow-issued.pdf"),
    path.join(raster, "page"),
  ]);
  const files = (await readdir(raster))
    .filter((f) => f.endsWith(".png"))
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  const photos = files.slice(0, 3).map((f) => path.join(raster, f));
  const raw = await sharp(photos[0])
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const qr = jsQR(
    new Uint8ClampedArray(raw.data),
    raw.info.width,
    raw.info.height,
  );
  expect(qr?.data).toBe(
    `${base}/concept-blank/scan?p=${issued.id}&page=1&part=student`,
  );
  browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  await context.route("**/*", (route) => {
    const url = route.request().url();
    if (!url.startsWith(base) && !url.startsWith("data:")) {
      evidence.external.push(url);
      return route.abort();
    }
    return route.continue();
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => evidence.errors.push(error.message));
  const capture = async (name) => {
    await page.evaluate(() => document.fonts.ready);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    );
    evidence.screens.push({ name, width: page.viewportSize().width, overflow });
    await page.screenshot({
      path: path.join(out, `${name}.png`),
      fullPage: true,
    });
    expect(overflow).toBeLessThanOrEqual(1);
  };
  await page.goto(qr.data);
  await page.getByRole("button", { name: "새 답안 촬영" }).click();
  await expect(
    page.getByRole("button", { name: "모든 쪽 촬영 완료 · 답 읽기" }),
  ).toBeDisabled();
  for (const [i, file] of photos.entries()) {
    await page.getByLabel("사진 파일", { exact: true }).setInputFiles(file);
    await expect(
      page.getByRole("list").getByText(`${i + 1}쪽 · 촬영됨`, { exact: true }),
    ).toBeVisible({ timeout: 30000 });
  }
  await capture("flow-capture-390");
  await page
    .getByRole("button", { name: "모든 쪽 촬영 완료 · 답 읽기" })
    .click();
  await expect(
    page.getByRole("heading", { name: "읽은 답 확인", exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await page.getByLabel("현재 쪽").selectOption("1");
  await page
    .getByRole("button", { name: "확인 번호 3 답 칸 확대", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "확인 번호 3 · 1쪽 답 칸" }),
  ).toBeVisible();
  await capture("flow-answer-zoom-390");
  await page.getByRole("button", { name: "같은 번호 입력 칸으로" }).click();
  await expect(
    page
      .getByRole("region", { name: "확인 번호 3", exact: true })
      .getByLabel("내가 쓴 답"),
  ).toBeFocused();
  await page.getByLabel("전체 판독문 보기").uncheck();
  await page
    .getByRole("button", { name: "종이에도 비워 뒀어요", exact: true })
    .first()
    .click();
  await expect(
    page.getByText("종이에도 비워 둔 답으로 확인했습니다."),
  ).toBeVisible();
  await page
    .getByLabel("내가 쓴 답")
    .nth(1)
    .fill("대응하는 변의 길이가 같습니다.");
  await expect(
    page.getByRole("button", { name: "답 확인 완료 · 채점하기" }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "쓴 답 저장", exact: true })
    .nth(1)
    .click();
  await expect(
    page.getByRole("button", { name: "답 확인 완료 · 채점하기" }),
  ).toBeEnabled();
  await capture("flow-check-390");
  await page.getByRole("button", { name: "답 확인 완료 · 채점하기" }).click();
  await expect(
    page.getByRole("heading", { name: "결과", exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await expect(
    page.getByRole("button", { name: "판정 고치기", exact: true }),
  ).toHaveCount(0);
  await capture("flow-student-result-390");
  await page.getByLabel("확인 필요만 보기").check();
  await capture("flow-review-filter-390");
  const studentUrl = page.url();
  await context.addCookies([
    { name: "scan-qa-role", value: "teacher", url: base },
  ]);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(studentUrl);
  await page
    .getByRole("button", { name: "판정 고치기", exact: true })
    .first()
    .click();
  await page.getByLabel("수정 판정").selectOption("partial");
  await page
    .getByLabel("수정 이유")
    .fill("원본과 직접 입력을 대조했습니다. 각에 대한 설명이 더 필요합니다.");
  await page.getByRole("button", { name: "판정 저장", exact: true }).click();
  await expect(page.getByText(/교사 수정 ·/).first()).toBeVisible();
  await capture("flow-teacher-result-1440");
  await page.goto(qr.data);
  await page.getByRole("button", { name: "학생 고르기" }).click();
  await expect(
    page.getByRole("dialog", { name: "답안 주인 고르기" }),
  ).toBeVisible();
  await capture("flow-teacher-picker-1440");
  const submissionId = new URL(studentUrl).searchParams.get("submission");
  const [submission] = await local.db.query(
    "SELECT state,revision FROM concept_blank_scan_submission WHERE id=$1",
    [submissionId],
  );
  const grades = await local.db.query(
    "SELECT origin,count(*)::int AS count FROM concept_blank_scan_grade WHERE submission_id=$1 GROUP BY origin",
    [submissionId],
  );
  const corrections = await local.db.query(
    "SELECT resolution,count(*)::int AS count FROM concept_blank_scan_correction WHERE submission_id=$1 GROUP BY resolution",
    [submissionId],
  );
  const photoRows = await local.db.query(
    "SELECT page_number,registration->>'status' AS registration,used_at IS NOT NULL AS used,(expires_at-created_at) AS lifetime FROM concept_blank_scan_photo WHERE submission_id=$1",
    [submissionId],
  );
  expect(submission.state).toBe("teacher-corrected");
  expect(photoRows).toHaveLength(3);
  expect(photoRows.every((p) => p.used && p.registration === "matched")).toBe(
    true,
  );
  evidence.data = {
    issuedId: issued.id,
    submissionId,
    submission,
    grades,
    corrections,
    photos: photoRows,
  };
  expect(evidence.errors).toEqual([]);
  expect(evidence.external).toEqual([]);
  expect(evidence.requests.filter((r) => r.status >= 400)).toEqual([]);
  expect(
    evidence.modelCalls.filter((c) => c.operation === "read"),
  ).toHaveLength(3);
  console.log(
    JSON.stringify({
      screens: evidence.screens,
      data: evidence.data,
      requests: evidence.requests.length,
      modelCalls: evidence.modelCalls.length,
    }),
  );
} finally {
  if (browser) await browser.close();
  await Promise.allSettled(tasks);
  await server.close();
  if (local) await local.pg.close();
  await writeFile(
    path.join(out, "flow-evidence.json"),
    JSON.stringify(evidence, null, 2),
  );
  globalThis.fetch = originalFetch;
}
