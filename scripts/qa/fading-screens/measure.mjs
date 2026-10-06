import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

// 새 서버나 실제 학생 API를 열지 않는다. 이미 떠 있는 로컬 dev 화면만 읽는다.
const base = process.env.FADING_QA_URL ?? "http://localhost:3443";
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(base))
  throw new Error("로컬 dev 주소만 허용합니다.");
const output = resolve(".qa-artifacts/fading-screens");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
});
const errors = [];
const external = new Set();
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (
    message.type() === "error" ||
    (message.type() === "warning" && /hydration|In HTML/i.test(message.text()))
  )
    errors.push(message.text());
});
page.on("request", (request) => {
  if (!request.url().startsWith(base) && !/^(data:|blob:)/.test(request.url()))
    external.add(request.url());
});

async function ready() {
  await page.waitForSelector('[data-qa-ready="true"]', { timeout: 120000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(100);
}

async function metrics() {
  return page.evaluate(() => {
    const root = document.querySelector("[data-fading-root]");
    if (!root) throw new Error("학생 앱 없음");
    const visible = (el) => {
      const style = getComputedStyle(el);
      return (
        el.getClientRects().length > 0 &&
        style.visibility !== "hidden" &&
        style.display !== "none" &&
        !el.closest(".katex-mathml")
      );
    };
    const controls = [
      ...root.querySelectorAll("button,a,input,select,summary"),
    ].filter(visible);
    const smallControls = controls
      .filter((el) => {
        const b = el.getBoundingClientRect();
        return b.width < 43.5 || b.height < 43.5;
      })
      .map((el) => ({
        text: el.getAttribute("aria-label") || el.textContent,
        width: el.getBoundingClientRect().width,
        height: el.getBoundingClientRect().height,
      }));
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const smallText = [];
    let minFont = Infinity;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent.trim() || !visible(node.parentElement)) continue;
      const size = parseFloat(getComputedStyle(node.parentElement).fontSize);
      minFont = Math.min(minFont, size);
      if (size < 11.99) smallText.push({ text: node.textContent, size });
    }
    return {
      overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
      smallControls,
      smallText,
      minFont,
      controls: controls.length,
      math: root.querySelectorAll(".katex").length,
    };
  });
}

// KaTeX의 받침 상자·근호 SVG 크기 대신 잘림 경계 밖에 새로 나타나는 잉크를 센다.
async function outsideInk(locator, boundary = locator) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) return 0;
  const edge = await boundary.boundingBox();
  if (!edge) return 0;
  const viewport = page.viewportSize();
  const clip = {
    x: Math.max(0, Math.floor(box.x) - 20),
    y: Math.max(0, Math.floor(box.y) - 20),
  };
  clip.width = Math.min(viewport.width - clip.x, Math.ceil(box.width) + 40);
  clip.height = Math.min(viewport.height - clip.y, Math.ceil(box.height) + 40);
  if (clip.width <= 0 || clip.height <= 0) return 0;
  const before = await page.screenshot({ clip, animations: "disabled" });
  const previous = await boundary.evaluate((el) => {
    const value = el.getAttribute("style");
    el.style.setProperty("overflow", "visible", "important");
    return value;
  });
  const after = await page.screenshot({ clip, animations: "disabled" });
  await boundary.evaluate((el, value) => {
    if (value === null) el.removeAttribute("style");
    else el.setAttribute("style", value);
  }, previous);
  return page.evaluate(
    async ({ a, b, inner }) => {
      const load = (src) =>
        new Promise((ok, fail) => {
          const image = new Image();
          image.onload = () => ok(image);
          image.onerror = fail;
          image.src = src;
        });
      const [first, second] = await Promise.all([load(a), load(b)]);
      const canvas = document.createElement("canvas");
      canvas.width = first.width;
      canvas.height = first.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(first, 0, 0);
      const x = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(second, 0, 0);
      const y = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let count = 0;
      for (let row = 0; row < canvas.height; row++)
        for (let col = 0; col < canvas.width; col++) {
          if (
            col >= inner.left &&
            col <= inner.right &&
            row >= inner.top &&
            row <= inner.bottom
          )
            continue;
          const i = (row * canvas.width + col) * 4;
          if (
            Math.max(
              Math.abs(x[i] - y[i]),
              Math.abs(x[i + 1] - y[i + 1]),
              Math.abs(x[i + 2] - y[i + 2]),
            ) > 48
          )
            count++;
        }
      return count;
    },
    {
      a: `data:image/png;base64,${before.toString("base64")}`,
      b: `data:image/png;base64,${after.toString("base64")}`,
      inner: {
        left: Math.floor(edge.x - clip.x) - 1,
        right: Math.ceil(edge.x + edge.width - clip.x) + 1,
        top: Math.floor(edge.y - clip.y) - 1,
        bottom: Math.ceil(edge.y + edge.height - clip.y) + 1,
      },
    },
  );
}
async function clipping() {
  const clips = await page.evaluate(() => {
    const root = document.querySelector("[data-fading-root]");
    const set = new Set();
    for (const math of root.querySelectorAll(".katex"))
      for (
        let node = math.parentElement;
        node && node !== document.body;
        node = node.parentElement
      ) {
        const style = getComputedStyle(node);
        if (
          /hidden|clip|auto|scroll/.test(
            `${style.overflowX} ${style.overflowY}`,
          )
        )
          set.add(node);
      }
    return [...set].map((node, i) => {
      node.setAttribute("data-qa-ink", String(i));
      return i;
    });
  });
  const failures = [];
  for (const index of clips) {
    const edge = page.locator(`[data-qa-ink="${index}"]`);
    const scrollable = await edge.evaluate(
      (el) =>
        /auto|scroll/.test(getComputedStyle(el).overflowY) &&
        el.scrollHeight > el.clientHeight,
    );
    if (scrollable) {
      const maths = edge.locator(".katex");
      for (let i = 0; i < (await maths.count()); i++) {
        const math = maths.nth(i);
        await math.evaluate((el) =>
          el.scrollIntoView({ block: "center", inline: "nearest" }),
        );
        const exposed = await math.evaluate((el) => {
          const r = el.getBoundingClientRect();
          let node = el.parentElement;
          while (node && !node.hasAttribute("data-qa-ink"))
            node = node.parentElement;
          const b = node.getBoundingClientRect();
          return r.top >= b.top - 1 && r.bottom <= b.bottom + 1;
        });
        if (!exposed)
          failures.push({
            index,
            math: i,
            reason: "수식을 세로로 전부 펼칠 수 없음",
          });
        const ink = await outsideInk(math, edge);
        if (ink > 2) failures.push({ index, math: i, ink });
      }
    } else {
      const ink = await outsideInk(edge);
      if (ink > 2) failures.push({ index, ink });
    }
  }
  await page.evaluate(() =>
    document
      .querySelectorAll("[data-qa-ink]")
      .forEach((el) => el.removeAttribute("data-qa-ink")),
  );
  return { clips: clips.length, failures };
}
async function actionable() {
  const failures = [];
  const modal = page.locator("dialog[open]");
  const actions = (await modal.count())
    ? modal.locator("button")
    : page.locator("[data-fading-action]");
  for (let i = 0; i < (await actions.count()); i++) {
    const action = actions.nth(i);
    if (!(await action.isVisible())) continue;
    await action.evaluate((el) =>
      el.scrollIntoView({
        block: "center",
        inline: "nearest",
        behavior: "instant",
      }),
    );
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    const exposed = await action.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(
        r.left + r.width / 2,
        r.top + r.height / 2,
      );
      return !!top && el.contains(top);
    });
    if (!exposed) failures.push(await action.textContent());
  }
  return failures;
}

const results = [];
async function measure(name, capture = false) {
  await page.waitForFunction(
    () => !document.querySelector('[data-fading-math-ready="false"]'),
    { timeout: 120000 },
  );
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  const row = {
    name,
    width: page.viewportSize().width,
    ...(await metrics()),
    ink: await clipping(),
    coveredActions: await actionable(),
  };
  results.push(row);
  if (
    capture ||
    row.overflow ||
    row.smallControls.length ||
    row.smallText.length ||
    row.ink.failures.length ||
    row.coveredActions.length
  ) {
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: resolve(output, `${row.width}-${name}.png`),
      fullPage: true,
    });
  }
  process.stdout.write(
    `${row.width} ${name}: overflow=${row.overflow} controls=${row.smallControls.length} text=${row.smallText.length} ink=${row.ink.failures.length} covered=${row.coveredActions.length}\n`,
  );
}

try {
  await page.goto(`${base}/dev/fading`, {
    waitUntil: "networkidle",
    timeout: 120000,
  });
  await ready();
  const samples = await page
    .locator("[data-qa-samples]")
    .evaluate((el) => JSON.parse(el.getAttribute("data-qa-samples")));
  await writeFile(
    resolve(output, "samples.json"),
    JSON.stringify(samples, null, 2),
  );
  await page.goto(`${base}/dev/fading?scene=step1&concept=${samples[0].id}`, {
    waitUntil: "networkidle",
  });
  await ready();
  while (!(await page.locator(".katex").count())) {
    const next = page.getByRole("button", { name: "다음 문장", exact: true });
    if (!(await next.isEnabled()))
      throw new Error("은행 표본에 KaTeX 양성 대조가 없습니다.");
    await next.click();
  }
  // 判정자 양성 표본: 실제 KaTeX를 좁은 자 안에 일부러 가둬 잉크를 놓치지 않는지 본다.
  await page.evaluate(() => {
    const math = document.querySelector(".katex");
    const probe = document.createElement("div");
    probe.id = "ink-probe";
    Object.assign(probe.style, {
      position: "fixed",
      top: "100px",
      left: "100px",
      width: "5px",
      height: "8px",
      overflow: "hidden",
      background: "white",
      zIndex: "9999",
      fontSize: "32px",
    });
    probe.appendChild(math.cloneNode(true));
    document.body.appendChild(probe);
  });
  const calibration = await outsideInk(page.locator("#ink-probe"));
  await page.locator("#ink-probe").evaluate((el) => el.remove());
  if (calibration <= 2)
    throw new Error(`잉크 판정자 양성 표본을 놓쳤습니다: ${calibration}`);
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    for (const sample of samples)
      for (const step of [1, 2, 3, 4]) {
        await page.goto(
          `${base}/dev/fading?scene=step${step}&concept=${sample.id}`,
          { waitUntil: "networkidle" },
        );
        await ready();
        const actual = await page
          .locator("[data-qa-sample]")
          .getAttribute("data-qa-sample");
        if (actual !== sample.id)
          throw new Error(
            `은행 표본이 측정 중 바뀌었습니다: ${sample.id} → ${actual}`,
          );
        const previous = page.getByRole("button", {
          name: "이전 문장",
          exact: true,
        });
        while (await previous.isEnabled()) await previous.click();
        let sentence = 1;
        const next = page.getByRole("button", {
          name: "다음 문장",
          exact: true,
        });
        do {
          await measure(
            `step${step}-${sample.id}-sentence${sentence}`,
            sample === samples[0],
          );
          if (!(await next.isEnabled())) break;
          await next.click();
          sentence++;
        } while (true);
      }
    for (const scene of [
      "first",
      "daily",
      "done",
      "backlog",
      "return",
      "step1",
      "rating",
      "stats",
      "catalog",
      "offline",
      "loading",
    ]) {
      await page.goto(`${base}/dev/fading?scene=${scene}`, {
        waitUntil: "networkidle",
      });
      await ready();
      await measure(scene, true);
      if (scene === "first") {
        await page
          .getByRole("button", { name: "개념 소거", exact: true })
          .click();
        await measure("erase-tab", true);
      }
      if (scene === "catalog") {
        await page
          .getByRole("button", { name: /단원 보기/ })
          .first()
          .click();
        await measure("unit", true);
        await page
          .getByRole("button", { name: /개념 읽기/ })
          .first()
          .click();
        await measure("concept", true);
      }
    }
    await page.goto(`${base}/dev/fading?scene=step4`, {
      waitUntil: "networkidle",
    });
    await ready();
    await page.getByRole("button", { name: "아직 모르겠어요" }).click();
    await page.getByRole("button", { name: "기준안 보기" }).click();
    await measure("compare", true);
    await page.getByRole("button", { name: "대조 마치기 · 계속" }).click();
    await measure("again-only", true);
    await page.getByRole("button", { name: /다시.*일 뒤/ }).click();
    await page.getByRole("heading", { name: "풀이를 마쳤어요" }).waitFor();
    await measure("summary", true);
    await page.goto(`${base}/dev/fading?scene=step3`, {
      waitUntil: "networkidle",
    });
    await ready();
    await page.getByRole("button", { name: "풀이 나가기" }).click();
    await measure("exit", true);
    await page.getByRole("button", { name: "계속 풀기" }).click();
    for (const scene of ["save-error", "conflict"]) {
      await page.goto(`${base}/dev/fading?scene=${scene}`, {
        waitUntil: "networkidle",
      });
      await ready();
      await page.getByRole("button", { name: "아직 모르겠어요" }).click();
      await page.locator('[data-fading-root] [role="alert"]').waitFor();
      await measure(scene, true);
      if (scene === "save-error") {
        await page.getByRole("button", { name: "저장 다시 시도" }).click();
        await page.getByRole("button", { name: "자가 평가하기" }).click();
        await page.getByRole("button", { name: /다시.*일 뒤/ }).waitFor();
      }
    }
  }
  await page.goto(`${base}/dev/fading?preview=1`, { waitUntil: "networkidle" });
  await page.getByText("미리 보기 · 저장되지 않음").waitFor();
  await measure("workspace-preview", true);
  const summary = {
    samples: samples.length,
    scenes: results.length,
    calibrationInk: calibration,
    external: [...external],
    errors,
    overflow: results.filter((r) => r.overflow),
    smallControls: results.filter((r) => r.smallControls.length),
    smallText: results.filter((r) => r.smallText.length),
    clipping: results.filter((r) => r.ink.failures.length),
    coveredActions: results.filter((r) => r.coveredActions.length),
  };
  await writeFile(
    resolve(output, "measurements.json"),
    JSON.stringify({ summary, results }, null, 2),
  );
  process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
  if (
    summary.overflow.length ||
    summary.smallControls.length ||
    summary.smallText.length ||
    summary.clipping.length ||
    summary.coveredActions.length ||
    errors.length ||
    external.size
  )
    process.exitCode = 1;
} catch (error) {
  await writeFile(
    resolve(output, "interrupted.json"),
    JSON.stringify(
      {
        url: page.url(),
        errors,
        external: [...external],
        results,
        error: String(error),
        body: (await page.locator("body").innerText()).slice(0, 4000),
      },
      null,
      2,
    ),
  );
  await page.screenshot({
    path: resolve(output, "interrupted.png"),
    fullPage: true,
  });
  throw error;
} finally {
  await browser.close();
}
