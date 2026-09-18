// 도형 편집기 끌기 측정 — 요소 38개 그래프를 90걸음 끌며 50ms 넘는 프레임 · 걸음당 SVG 파싱 수 · 번호 재배치 수 · isMac 호출 수를 센다.
// mathg-gen 의 scripts/figureDragHarness.mjs 를 우리 편집기(src/components/unified/figure-editor)에 맞춰 옮긴 것(2026-09-18).
//   node scripts/perf/figure-drag/run.mjs            배포 React(vite build) · CPU 1배
//   node scripts/perf/figure-drag/run.mjs --cpu=4    CPU 4배 감속(느린 학원 PC)
//   node scripts/perf/figure-drag/run.mjs --dev      dev React(vite dev 서버) 로
//   --no-build 는 앞서 빌드한 결과를 다시 쓴다. Edge 헤드리스, AI·로그인 없음.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { build, createServer, preview } from "vite";

const here = path.dirname(fileURLToPath(import.meta.url));
const configFile = path.join(here, "vite.config.mts");
const args = process.argv.slice(2);
const cpu = Number(args.find((a) => a.startsWith("--cpu="))?.slice(6) || 1);
const dev = args.includes("--dev");
const STEPS = 90;
const EDGE =
  process.env.EDGE_PATH ||
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";

let server;
if (dev) {
  server = await createServer({ configFile });
  await server.listen();
} else {
  if (!args.includes("--no-build")) await build({ configFile });
  server = await preview({ configFile });
}
const url = server.resolvedUrls.local[0];
console.log(
  `${dev ? "dev" : "production"} React · CPU ${cpu}배 · ${STEPS}걸음 · ${url}`,
);

const browser = await chromium.launch({ executablePath: EDGE, headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1500, height: 1000 },
  });
  const cdp = await page.context().newCDPSession(page);
  if (cpu > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu });
  // 감속이 정말 걸렸는지 — 같은 계산의 소요 시간이 배수만큼 늘어야 한다.
  const spin = await page.evaluate(() => {
    const t = performance.now();
    let x = 0;
    for (let i = 0; i < 3e7; i++) x += i % 7;
    return Math.round(performance.now() - t) + (x < 0 ? 1 : 0);
  });
  console.log(`감속 검증: 고정 계산 ${spin}ms`);
  const errors = [];
  page.on("pageerror", (e) => {
    errors.push(e.message);
    console.error("PAGEERROR", e.stack);
  });
  page.on("console", (m) => {
    if (m.type() === "error") console.error("CONSOLE", m.text());
  });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    window.__frames = [];
    const loop = (t) => {
      window.__frames.push(t);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    // 50ms 넘는 프레임이 무엇 때문인지 — 스크립트(부른 곳·강제 레이아웃) 와 스타일·레이아웃 시간을 붙인다.
    window.__loaf = [];
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries())
          window.__loaf.push({
            start: e.startTime,
            duration: e.duration,
            blocking: e.blockingDuration,
            styleLayout: e.styleAndLayoutStart
              ? e.startTime + e.duration - e.styleAndLayoutStart
              : 0,
            scripts: (e.scripts ?? []).map((s) => ({
              invoker: s.invoker,
              type: s.invokerType,
              duration: Math.round(s.duration),
              forced: Math.round(s.forcedStyleAndLayoutDuration),
              fn: s.sourceFunctionName,
              at: `${(s.sourceURL ?? "").split("/").pop()}:${s.sourceCharPosition}`,
            })),
          });
      }).observe({ type: "long-animation-frame", buffered: false });
    } catch {
      /* LoAF 없는 브라우저 */
    }
    // 걸음마다 무엇을 몇 번 하는지 — SVG 파싱 · 번호 재배치(요소마다 getTotalLength) · isMac(navigator.platform 읽기).
    window.__count = { parse: 0, length: 0, platform: 0 };
    const parse = DOMParser.prototype.parseFromString;
    DOMParser.prototype.parseFromString = function (...a) {
      window.__count.parse++;
      return parse.apply(this, a);
    };
    const length = SVGGeometryElement.prototype.getTotalLength;
    SVGGeometryElement.prototype.getTotalLength = function () {
      window.__count.length++;
      return length.call(this);
    };
    const platform = Object.getOwnPropertyDescriptor(
      Navigator.prototype,
      "platform",
    );
    Object.defineProperty(Navigator.prototype, "platform", {
      configurable: true,
      get() {
        window.__count.platform++;
        return platform.get.call(this);
      },
    });
    window.__harness.mount();
  });
  const canvasSel = "#figure-editor-canvas";
  await page.waitForFunction(
    (s) =>
      document.querySelector(s)?.querySelectorAll("g[data-object-id]")
        .length === 16,
    canvasSel,
    { timeout: 30000 },
  );
  await page.waitForTimeout(400);
  const objectCount = await page.$$eval(
    "[data-figure-list-number]",
    (els) => els.length,
  );
  console.log(`요소 ${objectCount}개`);

  const center = (sel) =>
    page.$eval(sel, (e) => {
      const r = e.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
  const curvePoint = () =>
    page.$eval(canvasSel, (c) => {
      const p = c.querySelector("path[data-object-id]");
      const q = p
        .getPointAtLength(p.getTotalLength() * 0.3)
        .matrixTransform(p.getScreenCTM());
      return { x: q.x, y: q.y };
    });
  const frames = (start, end) =>
    page.evaluate(
      ([s, e]) => {
        const ts = window.__frames.filter((t) => t >= s && t <= e);
        const gaps = ts.slice(1).map((t, i) => t - ts[i]);
        const long = gaps.filter((g) => g > 50);
        const loaf = window.__loaf
          .filter((l) => l.start >= s - 5 && l.start <= e && l.duration > 50)
          .map((l) => ({
            at: Math.round(l.start - s),
            d: Math.round(l.duration),
            b: Math.round(l.blocking),
            styleLayout: Math.round(l.styleLayout),
            scripts: l.scripts.filter((x) => x.duration >= 5),
          }));
        return {
          frames: ts.length,
          long: long.length,
          longMs: Math.round(long.reduce((a, b) => a + b, 0)),
          worst: Math.round(Math.max(0, ...gaps)),
          ms: Math.round(e - s),
          ...(loaf.length ? { loaf } : {}),
        };
      },
      [start, end],
    );
  const now = () => page.evaluate(() => performance.now());
  const counts = () => page.evaluate(() => ({ ...window.__count }));
  const inspect = () =>
    page.$eval(canvasSel, (c) => ({
      raw: c.querySelectorAll("text[data-object-id]").length,
      keep: !!window.__keep?.isConnected,
    }));
  const keepAnchor = () =>
    page.$eval(canvasSel, (c) => {
      window.__keep = c.querySelectorAll("line[data-object-id]")[1];
    });
  const results = {};
  const per = (a, b, n) =>
    Object.fromEntries(
      Object.keys(a).map((k) => [k, Math.round(((b[k] - a[k]) / n) * 10) / 10]),
    );

  async function drag(name, from, dx, dy) {
    await keepAnchor();
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    const before = await counts();
    const start = await now();
    let maxRaw = 0,
      kept = true;
    for (let i = 1; i <= STEPS; i++) {
      await page.mouse.move(
        from.x + (dx * i) / STEPS,
        from.y + (dy * i) / STEPS,
      );
      if (i % 10 === 0) {
        const s = await inspect();
        maxRaw = Math.max(maxRaw, s.raw);
        kept &&= s.keep;
      }
    }
    const mid = await now();
    const after = await counts();
    await page.mouse.up();
    const afterUp = await inspect();
    await page.waitForTimeout(1200);
    const end = await now();
    results[name] = {
      drag: await frames(start, mid),
      settle: await frames(mid, end),
      perStep: per(before, after, STEPS),
      maxRaw,
      rawAfterUp: afterUp.raw,
      kept,
    };
    console.log(name, JSON.stringify(results[name]));
  }

  await drag("선 끌기", await curvePoint(), 60, 40);
  const moved = await page.$eval(
    canvasSel,
    (c) =>
      c.querySelector("path[data-object-id]").getAttribute("transform") ?? "",
  );
  console.log(`끈 곡선 transform: ${moved || "(없음)"}`);
  await drag(
    "라벨 끌기",
    await center(`${canvasSel} g[data-object-id]`),
    40,
    30,
  );
  const cp = await curvePoint();
  await page.mouse.click(cp.x, cp.y);
  await page.waitForSelector("[data-figure-handle]");
  const handleKey = await page.$$eval("[data-figure-handle]", (hs) =>
    hs
      .map((h) => h.getAttribute("data-figure-handle"))
      .find((k) => k !== "center"),
  );
  await drag(
    "조절점 끌기",
    await center(`[data-figure-handle="${handleKey}"]`),
    50,
    -30,
  );

  const clickTool = async (label) => {
    const ok = await page.$$eval(
      '[role="toolbar"] button',
      (bs, label) => {
        const b = bs.find((b) =>
          `${b.textContent} ${b.getAttribute("aria-label") ?? ""} ${b.title}`.includes(
            label,
          ),
        );
        if (!b) return false;
        b.click();
        return true;
      },
      label,
    );
    if (!ok) throw new Error(`도구 «${label}» 단추를 못 찾았다`);
  };
  await clickTool("화면 이동");
  {
    const from = await center(canvasSel);
    await keepAnchor();
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    const before = await counts();
    const start = await now();
    for (let i = 1; i <= STEPS; i++)
      await page.mouse.move(from.x + i, from.y + i / 2);
    const mid = await now();
    const after = await counts();
    await page.mouse.up();
    results["화면 이동"] = {
      drag: await frames(start, mid),
      perStep: per(before, after, STEPS),
      kept: (await inspect()).keep,
    };
    console.log("화면 이동", JSON.stringify(results["화면 이동"]));
  }
  await clickTool("선택·이동");

  await keepAnchor();
  const request = "눈금 숫자를 조금 더 크게 해 주세요";
  const textarea = '[aria-label="도형 AI 수정 요청"]';
  if (await page.$(textarea)) {
    // 처음 그리는 한글은 글꼴 준비로 스크립트 없이 한 번 멈춘다 — 같은 문장을 한 번 치고 지운 뒤 잰다.
    await page.type(textarea, request, { delay: 15 });
    await page.$eval(textarea, (t) => t.select());
    await page.keyboard.press("Backspace");
    await page.waitForTimeout(300);
    const start = await now();
    await page.type(textarea, request, { delay: 15 });
    const end = await now();
    results["AI 요청 입력"] = {
      frames: await frames(start, end),
      kept: (await inspect()).keep,
    };
    console.log("AI 요청 입력", JSON.stringify(results["AI 요청 입력"]));
  }
  {
    const before = await counts();
    const start = await now();
    for (let n = 2; n <= 12; n++)
      await page.click(`[data-figure-list-number="${n}"]`);
    const end = await now();
    const after = await counts();
    results["요소 고르기"] = {
      frames: await frames(start, end),
      perPick: per(before, after, 11),
      kept: (await inspect()).keep,
    };
    console.log("요소 고르기", JSON.stringify(results["요소 고르기"]));
  }
  const drags = ["선 끌기", "라벨 끌기", "조절점 끌기"];
  console.log(
    "\n50ms 넘는 프레임(끄는 동안):",
    [...drags, "화면 이동"]
      .map((k) => `${k} ${results[k].drag.long}`)
      .join(" · "),
  );
  console.log(
    "걸음당 파싱 / getTotalLength / platform 읽기:",
    drags
      .map(
        (k) =>
          `${k} ${results[k].perStep.parse}/${results[k].perStep.length}/${results[k].perStep.platform}`,
      )
      .join(" · "),
  );
  console.log(`브라우저 오류 ${errors.length}건`);
  console.log(
    "RESULT",
    JSON.stringify({
      mode: dev ? "dev" : "production",
      cpu,
      steps: STEPS,
      objectCount,
      results,
      errors,
    }),
  );
} finally {
  await browser.close();
  await server.close();
}
