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
process.env.CONCEPT_BLANK_SCAN_MARKUP = "on";
const markupSay = "대응하는 각도 살펴보세요.";
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
let writtenName = { status: "read", text: "다른학생" };
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
let handlers,
  issuePaper,
  readPaper,
  paperEdition,
  renderPaper,
  local,
  world,
  selection,
  bank,
  browser;
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
  publicDir: path.join(root, "public"),
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
          if (pathname === "/qa-reprint") {
            try {
              const html = await readPaper(
                world.teacher,
                new URL(req.url, base).searchParams.get("p"),
                "both",
                local.db,
              );
              res.setHeader("Content-Type", "text/html; charset=utf-8");
              return res.end(html);
            } catch (error) {
              evidence.errors.push(String(error));
              res.statusCode = 500;
              return res.end("reprint failed");
            }
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
                publicationEdition: paperEdition(selection, bank, base),
                render: (id, value) =>
                  renderPaper({ id, selection: value, bank, origin: base }),
              });
              response = Response.json({ data: result }, { status: 201 });
            } else if (/^\/issued\/[^/]+$/.test(suffix))
              response = await handlers.issue(request, {
                params: Promise.resolve({ id: suffix.split("/")[2] }),
              });
            else if (suffix === "/name-captures")
              response = await handlers.nameStart(request);
            else if (suffix.startsWith("/name-captures/"))
              response = await handlers[
                req.method === "GET" ? "nameGet" : "nameAction"
              ](request, {
                params: Promise.resolve({ id: suffix.split("/")[2] }),
              });
            else if (suffix === "/submissions")
              response = await handlers.start(request);
            else {
              const [, , id, action, photoId] = suffix.split("/");
              const context = { params: Promise.resolve({ id, photoId }) };
              const name =
                action === "student"
                  ? "assignStudent"
                  : action === "markup"
                    ? req.method === "POST"
                      ? "markupPost"
                      : "markupGet"
                    : action === "photos"
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
  const { scanConfig, scanReservation } = await server.ssrLoadModule(
    `${root}/src/lib/concept-blank/scan/model.ts`,
  );
  ({ issueScanPaper: issuePaper, readIssuedScanPaper: readPaper } =
    await server.ssrLoadModule(
      `${root}/src/lib/concept-blank/scan/issuance.ts`,
    ));
  const paper = await server.ssrLoadModule(
    `${root}/src/lib/concept-blank/scan/paper.server.ts`,
  );
  renderPaper = paper.renderScanPaper;
  paperEdition = paper.scanPublicationEdition;
  local = await openScanTestDb();
  world = await scanWorld(local);
  const { loadWireSamples } = await server.ssrLoadModule(
    `${root}/src/app/dev/concept-blank-scan-wire/samples.ts`,
  );
  const { loadGradeBank } = await server.ssrLoadModule(
    `${root}/src/lib/concept-blank/bank/loadAuthored.ts`,
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
      structured: !!request.jsonSchema,
    });
    const versionCosts =
      request.recover &&
      (await Promise.all(
        [request.recover, request].map((input) =>
          scanReservation(scanConfig({}).gradeModel, input),
        ),
      ));
    if (versionCosts) {
      const [v2, v3] = versionCosts;
      evidence.modelCalls.at(-1).inputTokenDelta =
        v3.inputTokens - v2.inputTokens;
      evidence.modelCalls.at(-1).reservedNanoUsdDelta =
        v3.reservedNanoUsd - v2.reservedNanoUsd;
    }
    const input = JSON.parse(request.prompt.split("\n").at(-1));
    if (request.operation === "read")
      return (
        "```json\n" +
        JSON.stringify({
          written_name: input.page === 1 ? writtenName : null,
          slots: input.slots.map((slot, i) => ({
            id: slot.id,
            status: i < 2 ? "unreadable" : "read",
            text: i < 2 ? "" : "대응하는 변의 길이가 같습니다.",
          })),
        }) +
        "\n```"
      );
    return (
      "채점 결과입니다.\n" +
      JSON.stringify({
        grades: input.map((target, i) => ({
          id: target.id,
          label: i % 2 === 0 ? "partial" : "correct",
          reason:
            i % 2 === 0
              ? "대응하는 각에 대한 설명이 더 필요합니다."
              : "요구한 뜻을 설명했습니다.",
        })),
        notes: input.length
          ? [
              {
                targetId: input[0].id,
                slotId: input[0].studentAnswer[0].slot,
                kind: "missing",
                quote: "변의 길이",
                say: markupSay,
                fix: "대응하는 각의 크기가 같습니다.",
              },
            ]
          : [],
      }) +
      "\n확인을 마쳤습니다."
    );
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
  const firstClicks = await Promise.all(
    [1, 2].map(() =>
      fetch(`${base}/api/concept-blank/scan/issued`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: base,
          cookie: "scan-qa-role=teacher",
        },
        body: JSON.stringify({ requestId: randomUUID(), selection }),
      }),
    ),
  );
  const issuedResponse = firstClicks[0];
  expect(firstClicks[1].status).toBe(201);
  const concurrentIssue = await firstClicks[1].json();
  expect(issuedResponse.status).toBe(201);
  const issueBody = await issuedResponse.text();
  expect(Buffer.byteLength(issueBody)).toBeLessThan(1_000_000);
  const { data: issued } = JSON.parse(issueBody);
  expect(concurrentIssue.data.id).toBe(issued.id);
  const repeats = await Promise.all(
    [1, 2].map(() =>
      fetch(`${base}/api/concept-blank/scan/issued`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: base,
          cookie: "scan-qa-role=teacher",
        },
        body: JSON.stringify({ requestId: randomUUID(), selection }),
      }).then((r) => r.json()),
    ),
  );
  expect(repeats.map((r) => r.data.id)).toEqual([issued.id, issued.id]);
  const cssResponse = await fetch(
    `${base}/api/concept-blank/scan/issued/${issued.id}?format=css&view=both`,
    { headers: { cookie: "scan-qa-role=teacher" } },
  );
  expect(cssResponse.status).toBe(200);
  const css = await cssResponse.text();
  expect(css).not.toContain("base64");
  const htmlResponse = await fetch(`${base}/qa-reprint?p=${issued.id}`);
  const html = await htmlResponse.text();
  expect(Buffer.byteLength(html)).toBeLessThan(1_000_000);
  const [publicationRows] = await local.db.query(
    "SELECT count(*)::text AS count FROM concept_blank_printed_sheet WHERE user_id=$1::uuid AND snapshot->'selection'=$2::jsonb",
    [world.teacher.id, JSON.stringify(selection)],
  );
  expect(publicationRows.count).toBe("1");
  evidence.paperBytes = {
    concurrentFirstClicks: 2,
    publicationRows: Number(publicationRows.count),
    issueResponse: Buffer.byteLength(issueBody),
    reprintHtml: Buffer.byteLength(html),
    stylesheet: Buffer.byteLength(css),
  };

  const [stored] = await local.db.query(
    "SELECT render_artifact,layout,snapshot FROM concept_blank_printed_sheet WHERE id=$1::uuid",
    [issued.id],
  );
  expect(stored.render_artifact.css).not.toMatch(/base64|@font-face/);
  evidence.paperBytes.storedArtifact = Buffer.byteLength(
    JSON.stringify(stored.render_artifact),
  );
  evidence.paperBytes.fontFingerprint = stored.render_artifact.fontFingerprint;
  await writeFile(path.join(out, "reprint.html"), html);
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
  browser = await chromium.launch({
    executablePath: process.env.CB_SCAN_QA_CHROME,
  });
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
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ media: "print" });
  const fontRequests = [];
  page.on("response", (response) => {
    if (response.url().includes("/fonts/"))
      fontRequests.push({ url: response.url(), status: response.status() });
  });
  await page.goto(`${base}/qa-reprint?p=${issued.id}`, {
    waitUntil: "load",
    timeout: 90_000,
  });
  const fontFaces = await page.evaluate(async () => {
    const results = await Promise.all(
      ["Noto Serif KR", "Pretendard", "KaTeX_Main", "KaTeX_Math"].map((f) =>
        document.fonts.load(`400 16px "${f}"`, "수학x1"),
      ),
    );
    await document.fonts.ready;
    return results.map((faces) => faces.map((f) => f.status));
  });
  expect(
    fontFaces.every(
      (faces) =>
        faces.length > 0 && faces.every((status) => status === "loaded"),
    ),
  ).toBe(true);
  expect(fontRequests.every((r) => r.status === 200)).toBe(true);
  const { measureScanPaper } = await server.ssrLoadModule(
    `${root}/src/lib/concept-blank/scan/paperMeasure.ts`,
  );
  const measured = await page.evaluate(measureScanPaper, stored.snapshot);
  expect(measured.overflow.every((px) => px <= 1)).toBe(true);
  expect(measured.layout).toEqual(stored.layout);
  evidence.reprint = {
    fontFaces,
    fontRequests: [...fontRequests],
    overflow: measured.overflow,
    layoutMatches: true,
  };
  await page.screenshot({
    path: path.join(out, "reprint-fonts.png"),
    fullPage: true,
  });
  await page.emulateMedia({ media: "screen" });
  await page.setViewportSize({ width: 390, height: 844 });
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
  await page.goto(qr.data, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.getByRole("button", { name: "답안 촬영 시작" }).click();
  await expect(page.getByRole("button", { name: "답 읽기" })).toBeDisabled();
  for (const [i, file] of photos.entries()) {
    await page.getByLabel("사진 파일", { exact: true }).setInputFiles(file);
    await expect(
      page.getByRole("list").getByText(`${i + 1}쪽 · 촬영됨`, { exact: true }),
    ).toBeVisible({ timeout: 30000 });
  }
  await capture("flow-capture-390");
  await page.getByRole("button", { name: "답 읽기" }).click();
  await expect(
    page.getByRole("heading", { name: "결과", exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await expect(
    page.getByRole("button", { name: "판정 고치기", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: /사진 대조/ })
    .first()
    .click();
  await page
    .getByRole("button", { name: "1쪽 사진 확대", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "지면 확대 보기" }),
  ).toBeVisible();
  await expect(page.locator("[data-markup-badge]")).toHaveCount(0);
  await expect(page.getByText(markupSay, { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await capture("flow-student-result-390");
  await page.getByLabel("확인 필요만 보기").check();
  await capture("flow-review-filter-390");
  const studentUrl = page.url();
  await context.addCookies([
    { name: "scan-qa-role", value: "teacher", url: base },
  ]);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(studentUrl);
  const publish = page
    .getByRole("button", { name: "첨삭 공개", exact: true })
    .first();
  await expect(publish).toBeVisible();
  await expect(
    page.getByText("공개 전", { exact: true }).first(),
  ).toBeVisible();
  const font = await page.evaluate(async () => {
    const faces = await document.fonts.load("700 23px Gaegu", "대응하는 각도");
    return faces.map(({ family, status }) => ({ family, status }));
  });
  expect(font).toEqual([{ family: "Gaegu", status: "loaded" }]);
  await capture("markup-teacher-draft-1440");
  await page.setViewportSize({ width: 390, height: 844 });
  await capture("markup-teacher-draft-390");
  await publish.click();
  await expect(
    page.locator('[data-markup-badge][data-draft="false"]').first(),
  ).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await context.clearCookies({ name: "scan-qa-role" });
  await page.goto(studentUrl);
  await expect(
    page.getByText(markupSay, { exact: false }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("대응하는 각의 크기가 같습니다.", { exact: false }),
  ).toHaveCount(0);
  await capture("markup-student-published-1440");
  await page.setViewportSize({ width: 390, height: 844 });
  await capture("markup-student-published-390");
  const feedback = page.getByRole("region", { name: "사진 첨삭" }).first();
  const gradedRow = feedback.locator("..");
  await gradedRow.getByRole("button", { name: /사진 대조/ }).click();
  const pageNumber = (await gradedRow.getByRole("heading").textContent()).match(
    /(\d+)쪽/,
  )[1];
  await page
    .getByRole("button", { name: `${pageNumber}쪽 사진 확대`, exact: true })
    .click();
  const expanded = page.getByRole("dialog", { name: "지면 확대 보기" });
  const badge = expanded.locator("[data-markup-badge] circle").first();
  await expect(badge).toBeVisible();
  expect(
    await badge.evaluate((circle) => {
      const r = circle.getBoundingClientRect();
      const top = document.elementFromPoint(
        r.x + r.width / 2,
        r.y + r.height / 2,
      );
      return (
        top instanceof HTMLImageElement &&
        top.closest("dialog") !== null &&
        top.naturalWidth > 0
      );
    }),
  ).toBe(true);
  await capture("markup-student-photo-390");
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
  await expect(
    page.getByText(/종이의 이름이 이 학생과 다릅니다/),
  ).toBeVisible();
  await capture("flow-teacher-result-1440");
  await page.goto(qr.data, { waitUntil: "domcontentloaded", timeout: 90_000 });
  const submissionId = new URL(studentUrl).searchParams.get("submission");
  const [submission] = await local.db.query(
    "SELECT state,revision,written_name,name_match_result,name_match_method FROM concept_blank_scan_submission WHERE id=$1::uuid",
    [submissionId],
  );
  const grades = await local.db.query(
    "SELECT origin,count(*)::int AS count FROM concept_blank_scan_grade WHERE submission_id=$1::uuid GROUP BY origin",
    [submissionId],
  );
  const corrections = await local.db.query(
    "SELECT resolution,count(*)::int AS count FROM concept_blank_scan_correction WHERE submission_id=$1::uuid GROUP BY resolution",
    [submissionId],
  );
  const photoRows = await local.db.query(
    "SELECT page_number,registration->>'status' AS registration,used_at IS NOT NULL AS used,(expires_at-created_at) AS lifetime FROM concept_blank_scan_photo WHERE submission_id=$1::uuid",
    [submissionId],
  );
  expect(submission.state).toBe("teacher-corrected");
  expect(photoRows).toHaveLength(3);
  expect(photoRows.every((p) => p.used && p.registration === "matched")).toBe(
    true,
  );
  expect(submission.name_match_result).toBe("mismatch");
  expect(submission.name_match_method).toBe("student-account");
  writtenName = { status: "read", text: "학생" };
  await expect(page.getByRole("region", { name: "1쪽 촬영" })).toBeVisible();
  await page
    .getByLabel("1쪽 사진 파일", { exact: true })
    .setInputFiles(photos[0]);
  await expect(page.getByText(/이름으로 찾음/)).toBeVisible({
    timeout: 30000,
  });
  await capture("flow-name-matched-1440");
  const matchedId = new URL(page.url()).searchParams.get("submission");
  const [matched] = await local.db.query(
    "SELECT student_id,written_name,name_match_result,name_match_method FROM concept_blank_scan_submission WHERE id=$1::uuid",
    [matchedId],
  );
  expect(matched).toMatchObject({
    student_id: world.studentA,
    written_name: "학생",
    name_match_result: "matched",
    name_match_method: "name-exact",
  });
  const duplicate = randomUUID();
  await local.db.query(
    "INSERT INTO student(id,class_id,name,updated_at) VALUES($1::uuid,$2::uuid,'학생',CURRENT_TIMESTAMP)",
    [duplicate, world.classA],
  );
  await page.goto(qr.data, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByLabel("1쪽 사진 파일", { exact: true })
    .setInputFiles(photos[0]);
  await expect(page.getByRole("dialog", { name: "학생 고르기" })).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByText(/이름 같음 ·/)).toHaveCount(2);
  await capture("flow-name-ambiguous-picker-390");
  const pendingId = new URL(page.url()).searchParams.get("nameCapture");
  const [pending] = await local.db.query(
    "SELECT submission_id,name_match_result FROM concept_blank_scan_name_capture WHERE id=$1::uuid",
    [pendingId],
  );
  expect(pending).toMatchObject({
    submission_id: null,
    name_match_result: "ambiguous",
  });
  await page
    .getByRole("dialog", { name: "학생 고르기" })
    .getByRole("button", { name: "학생 고르기", exact: true })
    .first()
    .click();
  await expect(page.getByText(/교사가 고름/)).toBeVisible();
  await page.getByRole("button", { name: "학생 바꾸기" }).click();
  await expect(page.getByRole("dialog", { name: "학생 고르기" })).toBeVisible();
  await page
    .getByRole("dialog", { name: "학생 고르기" })
    .getByRole("button", { name: "학생 고르기", exact: true })
    .last()
    .click();
  await expect(page.getByRole("dialog", { name: "학생 고르기" })).toHaveCount(
    0,
  );
  await capture("flow-name-teacher-changed-390");
  evidence.data = {
    matchedName: matched,
    ambiguousName: pending,
    issuedId: issued.id,
    submissionId,
    submission,
    grades,
    corrections,
    photos: photoRows,
  };
  expect(evidence.modelCalls.every((call) => call.structured)).toBe(true);
  expect(evidence.errors).toEqual([]);
  expect(evidence.external).toEqual([]);
  expect(evidence.requests.filter((r) => r.status >= 400)).toEqual([]);
  expect(
    evidence.modelCalls.filter((c) => c.operation === "read"),
  ).toHaveLength(5);
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
