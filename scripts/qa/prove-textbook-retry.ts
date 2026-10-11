// Isolated client browser QA: no application server, DB, auth bypass, paid API, or physical printer.
import assert from "node:assert/strict";
import path from "node:path";
import { mkdir, writeFile, realpath } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { chromium, expect, type Browser } from "@playwright/test";
import {
  textbookRetrySheet,
  textbookRetryPlan,
  missingTextbookRetryPlan,
  RETRY_QA_TEST_ID,
} from "../../src/mocks/textbookRetryFixture";
import {
  buildHwpxParts,
  HwpxPayloadSchema,
} from "../../src/lib/export/hwpxServer";
import { pdfDocument, PdfPayloadSchema } from "../../src/lib/export/pdfServer";

async function main() {
  delete process.env.STUDIO_ENGINE_URL;
  delete process.env.VERCEL;
  const root = process.cwd();
  const output = path.join(root, ".qa-artifacts/textbook-retry");
  await mkdir(output, { recursive: true });
  const results: unknown[] = [];
  const errors: string[] = [];
  const requests: unknown[] = [];
  const server = await createServer({
    configFile: false,
    envDir: false,
    root,
    mode: "test",
    define: { "process.env": "{}" },
    cacheDir: path.join(output, "vite-cache"),
    optimizeDeps: { entries: ["scripts/qa/textbook-retry-fixture.tsx"] },
    plugins: [
      react(),
      {
        name: "retry-client-fixture",
        configureServer(vite) {
          vite.middlewares.use((request, response, next) => {
            if (request.url !== "/") return next();
            response.setHeader("Content-Type", "text/html; charset=utf-8");
            void vite
              .transformIndexHtml(
                "/",
                '<!doctype html><html lang="ko"><head><title>교과서 오답 복습 검증</title></head><body><div id="root"></div><script type="module" src="/scripts/qa/textbook-retry-fixture.tsx"></script></body></html>',
              )
              .then((html) => response.end(html));
          });
        },
      },
    ],
    resolve: { alias: { "@": path.join(root, "src") } },
    server: {
      host: "127.0.0.1",
      port: 0,
      fs: { allow: [root, await realpath(path.join(root, "node_modules"))] },
    },
  });
  let browser: Browser | undefined;
  try {
    await server.listen();
    const origin = `http://127.0.0.1:${(server.httpServer!.address() as { port: number }).port}`;
    browser = await chromium.launch({ headless: true, channel: "chrome" });
    process.stdout.write(`Browser fixture listening at ${origin}\n`);
    for (const width of [1440, 390, 320]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const capture = async (name: string) => {
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({
          path: path.join(output, name),
          fullPage: true,
        });
      };
      page.on("pageerror", (error) => {
        errors.push(error.message);
        process.stderr.write(`${error.message}\n`);
      });
      let sheet = textbookRetrySheet();
      let scenario: "pair" | "missing" | "failure" | "changed" = "pair";
      let printed = 0;
      let exportCalls = 0;
      await page.addInitScript(() => {
        window.print = () => {
          (window as unknown as { retryPrintCalls: number }).retryPrintCalls =
            ((window as unknown as { retryPrintCalls: number })
              .retryPrintCalls ?? 0) + 1;
        };
      });
      await page.route("**/*", async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        if (
          !request.url().startsWith(origin) &&
          !request.url().startsWith("data:")
        )
          return route.abort();
        if (!url.pathname.startsWith("/api/")) return route.continue();
        requests.push({
          width,
          method: request.method(),
          path: url.pathname,
          body: request.postDataJSON(),
        });
        if (url.pathname === `/api/tests/${RETRY_QA_TEST_ID}/grade`) {
          if (request.method() === "POST") {
            const entries = request.postDataJSON().entries as {
              studentId: string;
              absent: boolean;
              wrongProblemIds: string[];
            }[];
            sheet = {
              data: {
                ...sheet.data,
                students: sheet.data.students.map((student, index) => {
                  const entry = entries.find(
                    (value) => value.studentId === student.studentId,
                  )!;
                  return {
                    ...student,
                    latest: {
                      testResultId: `91000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
                      takenAt: "2026-10-11T02:00:00.000Z",
                      gradingMode: "marks",
                      absent: entry.absent,
                      score: entry.absent
                        ? null
                        : 100 - entry.wrongProblemIds.length * 12.5,
                      wrongProblemIds: entry.wrongProblemIds,
                      correctCount: entry.absent
                        ? 0
                        : 8 - entry.wrongProblemIds.length,
                    },
                  };
                }),
              },
            };
            const scores = sheet.data.students.map((student) => ({
              studentId: student.studentId,
              name: student.name,
              absent: student.latest!.absent,
              correctCount: student.latest!.correctCount,
              problemCount: 8,
              score: student.latest!.score,
            }));
            return route.fulfill({
              status: 201,
              json: {
                data: {
                  testId: RETRY_QA_TEST_ID,
                  scores,
                  gradedCount: scores.filter((row) => !row.absent).length,
                  absentCount: scores.filter((row) => row.absent).length,
                },
              },
            });
          }
          return route.fulfill({ json: sheet });
        }
        if (url.pathname === `/api/tests/${RETRY_QA_TEST_ID}/retry`) {
          const body = request.postDataJSON();
          assert.equal(
            body.testResultId,
            sheet.data.students.find((row) => row.studentId === body.studentId)!
              .latest!.testResultId,
          );
          assert.deepEqual(Object.keys(body).sort(), [
            "studentId",
            "testResultId",
          ]);
          if (scenario === "failure")
            return route.fulfill({
              status: 403,
              json: {
                error: { message: "이 학생의 복습 문항을 볼 권한이 없습니다." },
              },
            });
          let plan = textbookRetryPlan(sheet.data, body.studentId);
          if (scenario === "missing") plan = missingTextbookRetryPlan(plan);
          if (scenario === "changed")
            plan.picked[0].problem.content += " 변경됨";
          return route.fulfill({ json: { data: plan } });
        }
        if (url.pathname === "/api/exports/hwpx") {
          exportCalls++;
          const input = HwpxPayloadSchema.parse(request.postDataJSON());
          const parts = await buildHwpxParts(input);
          await writeFile(
            path.join(output, `${width}-hwpx-payload.json`),
            JSON.stringify(input, null, 2),
          );
          return route.fulfill({
            json: {
              partsGzip: gzipSync(JSON.stringify(parts)).toString("base64"),
            },
          });
        }
        if (url.pathname === "/api/exports/pdf") {
          exportCalls++;
          const input = PdfPayloadSchema.parse(request.postDataJSON());
          const exportPage = await browser!.newPage({
            javaScriptEnabled: false,
          });
          try {
            await exportPage.route("**/*", (resource) =>
              resource.request().url().startsWith(origin) ||
              resource.request().url().startsWith("data:")
                ? resource.continue()
                : resource.abort(),
            );
            await exportPage.emulateMedia({ media: "print" });
            await exportPage.setContent(pdfDocument(input, origin));
            await exportPage.evaluate(async () => {
              await document.fonts.ready;
              await Promise.all(
                [...document.images].map((image) => image.decode()),
              );
            });
            return route.fulfill({
              contentType: "application/pdf",
              body: await exportPage.pdf({
                preferCSSPageSize: true,
                printBackground: true,
              }),
            });
          } finally {
            await exportPage.close();
          }
        }
        throw new Error(`Unmocked API ${url.pathname}`);
      });
      await page.goto(origin, {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      });
      await expect(
        page.getByRole("rowheader", { name: "김하윤" }),
      ).toBeVisible();
      await capture(`${width}-grading.png`);
      for (const [index, text] of [
        [1, "아직 안 본 학생"],
        [2, "결시 기록"],
        [3, "오답이 없습니다"],
        [6, "완료된 채점 기록"],
      ] as const) {
        await page
          .getByLabel("복습할 학생")
          .selectOption(sheet.data.students[index].studentId);
        await expect(
          page
            .getByRole("region", { name: "저장된 오답 복습" })
            .getByText(new RegExp(text)),
        ).toBeVisible();
        await expect(
          page.getByRole("button", { name: "저장된 오답으로 복습 문항 보기" }),
        ).toBeDisabled();
      }
      await page
        .getByLabel("복습할 학생")
        .selectOption(sheet.data.students[0].studentId);
      await page
        .getByRole("button", { name: "저장된 오답으로 복습 문항 보기" })
        .click();
      await expect(
        page.getByRole("article", { name: "원문 2번 변형 2" }),
      ).toBeVisible();
      await expect(page.getByText("검토 완료 변형 2 / 2문항")).toHaveCount(2);
      await page
        .getByRole("article", { name: "원문 1번 변형 1" })
        .getByText("정답 · 해설 보기")
        .click();
      await capture(`${width}-pair.png`);
      await page
        .getByRole("button", { name: "양식 구성 · 출력", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "인쇄 / PDF 저장" }),
      ).toBeEnabled({ timeout: 30000 });
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(
        page.getByRole("button", { name: "채점 결과 저장" }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "작업 저장", exact: true }),
      ).toHaveCount(0);
      await page.getByRole("tab", { name: "문제 순서 · 4" }).click();
      await expect(
        page.getByTitle("원문 1번 · 변형 1", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /문제 빼기|문제 위로|문제 아래로/ }),
      ).toHaveCount(0);
      await capture(`${width}-output.png`);
      await page.getByRole("button", { name: "인쇄 / PDF 저장" }).click();
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              (window as unknown as { retryPrintCalls: number })
                .retryPrintCalls,
          ),
        )
        .toBe(1);
      printed++;
      // Exercise the actual worksheet export clients and the existing local, windowless output builders.
      if (width === 1440) {
        const hwpx = page.waitForEvent("download");
        await page.getByRole("button", { name: "HWPX 내보내기" }).click();
        await (await hwpx).saveAs(path.join(output, "retry.hwpx"));
        const pdf = page.waitForEvent("download");
        await page.getByRole("button", { name: "PDF 내려받기" }).click();
        await (await pdf).saveAs(path.join(output, "retry.pdf"));
        await page.emulateMedia({ media: "print" });
        await capture("1440-print-student.png");
        await expect(
          page.getByRole("heading", { name: "오답 복습", exact: true }),
        ).toHaveCount(0);
        await page.emulateMedia({ media: "screen" });
        await page.getByRole("tab", { name: "서식 설정" }).click();
        await page
          .getByRole("checkbox", { name: "정답 · 해설지 포함" })
          .check();
        await expect(
          page.getByRole("button", { name: "인쇄 / PDF 저장" }),
        ).toBeEnabled();
        await page.emulateMedia({ media: "print" });
        await capture("1440-print-teacher.png");
        await page.emulateMedia({ media: "screen" });
      }
      scenario = "changed";
      await page.getByRole("button", { name: "인쇄 / PDF 저장" }).click();
      await expect(page.getByRole("alert")).toContainText("복습 문항이 변경");
      assert.equal(
        await page.evaluate(
          () =>
            (window as unknown as { retryPrintCalls: number }).retryPrintCalls,
        ),
        1,
      );
      await page.getByRole("button", { name: "변형 검토로 돌아가기" }).click();
      scenario = "missing";
      await page
        .getByRole("button", { name: "복습 문항 다시 불러오기" })
        .click();
      await expect(page.getByText("검토 완료 변형 0 / 2문항")).toBeVisible();
      await expect(
        page
          .getByRole("article", { name: "원문 1번 변형 1" })
          .getByText("이 슬롯의 검토 완료 변형이 없습니다."),
      ).toBeVisible();
      await expect(
        page
          .getByRole("article", { name: "원문 1번 변형 2" })
          .getByText(/J22026-A01-002/),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "양식 구성 · 출력", exact: true }),
      ).toBeDisabled();
      await capture(`${width}-missing.png`);
      scenario = "failure";
      await page
        .getByRole("button", { name: "복습 문항 다시 불러오기" })
        .click();
      await expect(page.getByRole("alert")).toHaveText(
        "이 학생의 복습 문항을 볼 권한이 없습니다.",
      );
      await capture(`${width}-failure.png`);
      scenario = "pair";
      await page
        .getByRole("button", { name: "복습 문항 다시 불러오기" })
        .click();
      await expect(
        page.getByRole("button", { name: "양식 구성 · 출력", exact: true }),
      ).toBeEnabled();
      await page.getByRole("button", { name: "김하윤 3번 맞음" }).click();
      await expect(page.getByText(/수정한 채점을 먼저 저장/)).toBeVisible();
      await expect(
        page.getByRole("button", { name: "저장된 오답으로 복습 문항 보기" }),
      ).toBeDisabled();
      await page
        .getByRole("row", { name: /이서준/ })
        .getByRole("button", { name: "0개 끝" })
        .click();
      await page
        .getByRole("row", { name: /채점미완료/ })
        .getByRole("button", { name: "1개 끝" })
        .click();
      await page.getByRole("button", { name: "채점 결과 저장" }).click();
      await expect(
        page.getByRole("region", { name: "채점 결과", exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "저장된 오답으로 복습 문항 보기" })
        .click();
      await expect(
        page.getByRole("article", { name: "원문 3번 변형 2" }),
      ).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      );
      assert.ok(overflow <= 1, `Document overflow ${width}: ${overflow}`);
      results.push({
        width,
        printed,
        exportCalls,
        overflow,
        scenarios: [
          "explicit-student",
          "unreviewed",
          "absent",
          "no-wrong",
          "incomplete",
          "pair",
          "fixed-output",
          "preflight-content-change",
          "missing-slot-1",
          "missing-entire-pair",
          "403-and-recovery",
          "dirty-block",
          "save-and-read-new-result",
        ],
      });
      await page.close();
    }
    assert.deepEqual(errors, []);
  } finally {
    await writeFile(
      path.join(output, "results.json"),
      JSON.stringify(
        {
          source: "synthetic isolated browser; no shared DB or paid APIs",
          results,
          requests,
          errors,
        },
        null,
        2,
      ),
    );
    await browser?.close();
    await server.close();
  }
  process.stdout.write(`Browser QA passed: ${output}\n`);
}
main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
});
