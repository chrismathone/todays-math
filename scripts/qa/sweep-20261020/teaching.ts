/**
 * Real TeachingView/ClassManage in a Vite browser fixture; no auth or DB connection.
 * npx tsx --conditions=react-server scripts/qa/sweep-20261020/teaching.ts --out /tmp/teaching-before.json
 * Run again after the change with --compare /tmp/teaching-before.json --out /tmp/teaching-after.json.
 * Reproduce the old client via --baseline 560c6a0fa (git show only; checkout is unchanged).
 * All API bodies are authored fixtures; writes and unrecognised API reads fail closed.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, type Page } from "@playwright/test";
import { MOCK_CLASS_A, MOCK_CLASS_B } from "../../../src/mocks/data/classes";
import { MOCK_STUDENTS } from "../../../src/mocks/data/students";
import { MOCK_CURRENT_PROGRESS } from "../../../src/mocks/data/progress";
import { MOCK_UNITS } from "../../../src/mocks/data/units";

const root = process.cwd();
const args = process.argv.slice(2);
const option = (name: string) => args[args.indexOf(name) + 1];
const output = args.includes("--out") ? option("--out") : undefined;
const compare = args.includes("--compare") ? option("--compare") : undefined;
const baseline = args.includes("--baseline") ? option("--baseline") : undefined;
const port = Number(process.env.TEACHING_FIXTURE_PORT ?? 3185);
const origin = `http://127.0.0.1:${port}`;
const account = {
  id: MOCK_CLASS_A.userId,
  name: "예시 선생님",
  email: "fixture@example.invalid",
  isAdmin: false,
};
const classes = [MOCK_CLASS_A, MOCK_CLASS_B];
const units = MOCK_UNITS.map(({ id, grade, chapter, section, orderIndex }) => ({
  id,
  grade,
  chapter,
  section,
  orderIndex,
}));
const delayMs = {
  teaching: 810,
  classes: 1000,
  students: 350,
  progress: 300,
  plan: 400,
};

async function main() {
  const baselineSources = new Map<string, string>();
  if (baseline) {
    assert.match(baseline, /^[a-f0-9]{7,40}$/);
    for (const file of [
      "src/components/unified/TeachingView.tsx",
      "src/components/class/ClassManage.tsx",
      "src/hooks/useClassManage.ts",
      "src/lib/class/classApi.ts",
    ])
      baselineSources.set(
        path.join(root, file),
        execFileSync("git", ["show", `${baseline}:${file}`], {
          encoding: "utf8",
        }),
      );
  }
  const { createServer } = await import("vite");
  const virtual = "\0teaching-fixture:";
  const server = await createServer({
    configFile: false,
    root,
    cacheDir: path.join("/tmp", "sweep-teaching-vite-cache"),
    optimizeDeps: {
      noDiscovery: true,
      include: [
        "react",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "zod",
      ],
    },
    server: { host: "127.0.0.1", port, strictPort: true },
    resolve: { alias: { "@": path.join(root, "src") } },
    define: { "process.env.NODE_ENV": JSON.stringify("development") },
    plugins: [
      {
        name: "teaching-waterfall-fixture",
        enforce: "pre",
        resolveId(id) {
          if (
            [
              "next/dynamic",
              "next/link",
              "next/navigation",
              "next-auth/react",
            ].includes(id)
          )
            return virtual + id;
          if (/\/components\/main\/MainScreen(?:\.tsx)?$/.test(id))
            return virtual + "lessons";
          if (/\/app\/actions\/auth(?:\.ts)?$/.test(id))
            return virtual + "actions";
          if (id === "/__teaching_fixture.tsx") return virtual + "entry.tsx";
        },
        load(id) {
          if (baselineSources.has(id)) return baselineSources.get(id);
          if (id === virtual + "next/dynamic")
            return `
        import React from 'react';
        export default function dynamic(load, options) {
          const Component = React.lazy(() => load().then(value => ({ default: value.default ?? value })));
          return props => React.createElement(React.Suspense, { fallback: React.createElement(options.loading) }, React.createElement(Component, props));
        }`;
          if (id === virtual + "next/link")
            return `
        import React from 'react';
        export const useLinkStatus = () => ({ pending: false });
        export default function Link({href, children, ...props}) { return React.createElement('a', {...props, href}, children); }`;
          if (id === virtual + "next/navigation")
            return `
        export const useRouter = () => ({ push() {}, replace() {}, refresh() {}, back() {} });
        export const usePathname = () => window.location.pathname;`;
          if (id === virtual + "next-auth/react")
            return `export async function signIn() { return {ok:true}; } export async function signOut() { return {url:'/'}; }`;
          if (id === virtual + "lessons")
            return `export function MainScreen() { return null; }`;
          if (id === virtual + "actions")
            return `export async function signOutAction() { throw new Error('Server action is outside the fixture'); }`;
          if (id === virtual + "entry.tsx")
            return `
        import React from 'react';
        import { createRoot } from 'react-dom/client';
        import TeachingView from '/src/components/unified/TeachingView.tsx';
        createRoot(document.getElementById('root')).render(React.createElement(TeachingView));`;
        },
        configureServer(vite) {
          vite.middlewares.use((req, res, next) => {
            if (new URL(req.url ?? "/", origin).pathname !== "/") return next();
            res.setHeader("Content-Type", "text/html");
            res.end(
              '<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>body{font-family:sans-serif}button,input,select{font:inherit}</style></head><body><div id="root"></div><script type="module" src="/__teaching_fixture.tsx"></script></body></html>',
            );
          });
        },
      },
    ],
  });

  type Waterfall = {
    name: string;
    start: number;
    end: number;
    duration: number;
  };
  type Result = {
    run: number;
    readyMs: number;
    waterfall: Waterfall[];
    snapshot: string;
    pixels: string;
  };
  const results: Result[] = [];
  const unexpected: string[] = [];
  const pageErrors: string[] = [];

  async function fixture(page: Page) {
    await page.addInitScript(() => {
      const observed = window as unknown as { teachingReadyAt?: number };
      const observer = new MutationObserver(() => {
        const progress = document.querySelector<HTMLFieldSetElement>(
          'fieldset[aria-label="반 진도 설정"]',
        );
        const students = document.querySelector('ul[aria-label="학생"]');
        if (
          progress &&
          !progress.disabled &&
          students?.children.length &&
          document
            .getElementById("root")
            ?.textContent?.includes("수업 계획이 없습니다.")
        ) {
          observed.teachingReadyAt = performance.now();
          observer.disconnect();
        }
      });
      observer.observe(document, {
        childList: true,
        subtree: true,
        attributes: true,
      });
    });
    await page.route("**/api/**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (request.method() !== "GET") {
        unexpected.push(`write:${url.pathname}`);
        await route.abort();
        return;
      }
      let body: unknown;
      let latency = 0;
      if (url.pathname === "/api/studio/teaching") {
        const includeClasses = url.searchParams.get("classes") === "1";
        // Model independent fixture work inside the combined response, not live DB latency.
        latency = includeClasses
          ? Math.max(delayMs.teaching, delayMs.classes)
          : delayMs.teaching;
        body = {
          data: {
            user: account,
            units,
            ...(includeClasses
              ? {
                  classes: {
                    status: "ready",
                    page: {
                      data: classes,
                      meta: { page: 1, pageSize: 100, total: classes.length },
                    },
                  },
                }
              : {}),
          },
        };
      } else if (url.pathname === "/api/classes") {
        latency = delayMs.classes;
        body = {
          data: classes,
          meta: { page: 1, pageSize: 100, total: classes.length },
        };
      } else if (url.pathname === "/api/students") {
        latency = delayMs.students;
        const rows = MOCK_STUDENTS.filter(
          (row) => row.classId === url.searchParams.get("classId"),
        );
        body = {
          data: rows,
          meta: { page: 1, pageSize: 100, total: rows.length },
        };
      } else if (url.pathname === "/api/progress") {
        latency = delayMs.progress;
        body = {
          data:
            url.searchParams.get("classId") === MOCK_CLASS_A.id
              ? MOCK_CURRENT_PROGRESS.classA
              : MOCK_CURRENT_PROGRESS.classB,
        };
      } else if (/^\/api\/classes\/[^/]+\/progress-plan$/.test(url.pathname)) {
        latency = delayMs.plan;
        body = { data: { plan: null, schedule: null, studentPlans: [] } };
      } else {
        unexpected.push(url.pathname);
        await route.abort();
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, latency));
      await route.fulfill({
        json: body,
        headers: { "Cache-Control": "private, no-store" },
      });
    });
    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
      console.error("fixture page error:", error.message);
    });
    page.on("console", (message) => {
      if (message.type() === "error")
        console.error("fixture console:", message.text());
    });
  }

  async function ready(page: Page) {
    await page
      .getByText("수업 계획이 없습니다.", { exact: true })
      .waitFor()
      .catch(async (error) => {
        console.error("fixture DOM:", await page.locator("body").innerText());
        throw error;
      });
    await page
      .getByText(
        MOCK_STUDENTS.find((row) => row.classId === MOCK_CLASS_A.id)!.name,
        { exact: true },
      )
      .waitFor();
    await page
      .getByRole("button", { name: "다음 소단원", exact: true })
      .waitFor();
    await page.waitForFunction(
      () =>
        !document.querySelector<HTMLButtonElement>(
          'fieldset[aria-label="반 진도 설정"]',
        )?.disabled,
    );
    await page.evaluate(() => document.fonts.ready);
  }

  try {
    await server.listen();
    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext({
        viewport: { width: 1685, height: 1000 },
        reducedMotion: "reduce",
      });
      // Warm modules once; every timed navigation has fresh React state and real fixture API reads.
      const page = await context.newPage();
      await fixture(page);
      await page.goto(origin);
      await ready(page);
      for (let run = 1; run <= 3; run += 1) {
        await page.goto(origin);
        await ready(page);
        const data = await page.evaluate(() => ({
          readyMs: (window as unknown as { teachingReadyAt: number })
            .teachingReadyAt,
          waterfall: performance
            .getEntriesByType("resource")
            .filter((entry) => new URL(entry.name).pathname.startsWith("/api/"))
            .map((entry) => ({
              name: new URL(entry.name).pathname,
              start: entry.startTime,
              end: entry.startTime + entry.duration,
              duration: entry.duration,
            })),
          snapshot: JSON.stringify({
            text: document.getElementById("root")!.innerText,
            controls: [
              ...document.querySelectorAll(
                "input, select, button, a, fieldset",
              ),
            ].map((element) => ({
              tag: element.tagName,
              text: element.textContent,
              value: "value" in element ? element.value : null,
              disabled: "disabled" in element ? element.disabled : null,
              current: element.getAttribute("aria-current"),
              selected: element.getAttribute("aria-selected"),
              href: element.getAttribute("href"),
            })),
          }),
        }));
        const screenshot = await page.screenshot({
          fullPage: true,
          animations: "disabled",
        });
        results.push({
          run,
          ...data,
          pixels: createHash("sha256").update(screenshot).digest("hex"),
        });
      }
      assert.deepEqual(unexpected, []);
      assert.deepEqual(pageErrors, []);
      for (const result of results) {
        assert.ok(Number.isFinite(result.readyMs));
        assert.equal(result.snapshot, results[0].snapshot);
        assert.equal(result.pixels, results[0].pixels);
      }
      if (compare) {
        const previous = JSON.parse(await readFile(compare, "utf8")) as {
          results: Result[];
        };
        for (const result of results) {
          assert.equal(
            result.snapshot,
            previous.results[0].snapshot,
            "visible wording, class selection and controls must match before",
          );
          assert.equal(
            result.pixels,
            previous.results[0].pixels,
            "settled pixels must match before",
          );
        }
      }
      const report = {
        kind: "fixture-browser-only",
        baseline: baseline ?? null,
        delayMs,
        results,
        equality: {
          allThreeSnapshots: true,
          beforeCompared: Boolean(compare),
          writes: 0,
          pageErrors: 0,
        },
      };
      if (output)
        await writeFile(output, JSON.stringify(report, null, 2) + "\n");
      console.log(
        JSON.stringify(
          {
            ...report,
            results: results.map((result) => ({
              run: result.run,
              readyMs: result.readyMs,
              waterfall: result.waterfall,
              pixels: result.pixels,
            })),
          },
          null,
          2,
        ),
      );
    } finally {
      await browser.close();
    }
  } finally {
    await server.close();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
