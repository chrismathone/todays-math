// 「문제 순서」 칸을 **진짜 브라우저**에서 잰다 — jsdom 은 CSS 를 안 돌려 단추가
// 찌그러졌는지 알 수 없다(2026-09-16 교훈). 서버·DB·AI 는 안 쓴다.
// 실행: node scripts/qa/prove-order-panel-tidy.mjs [--label 이름] [--no-assert]
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { chromium } from "@playwright/test";

const argv = process.argv.slice(2);
const label = argv.includes("--label")
  ? argv[argv.indexOf("--label") + 1]
  : "after";
const checking = !argv.includes("--no-assert");
const root = process.cwd();
const output =
  process.env.ORDER_PANEL_OUT ||
  path.join(root, ".qa-artifacts/order-panel-tidy");
await mkdir(output, { recursive: true });

// 원장님 화면과 같은 서체를 실어야 글자 폭이 같다 — 「원본 편집」이 칸에 드는지가
// 서체 자간에 달려 있다(next/font 는 여기서 안 도니 같은 woff2 를 직접 건다).
const HTML = `<!doctype html><html lang="ko"><head><style>
@font-face {
  font-family: "Pretendard Variable";
  src: url("/public/fonts/PretendardVariable.woff2") format("woff2");
  font-weight: 45 920;
  font-display: block;
}
html { --font-pretendard: "Pretendard Variable"; }
body {
  margin: 0;
  font-family: var(--font-pretendard), "Malgun Gothic", system-ui, sans-serif;
}
</style></head><body><div id="root"></div><script type="module" src="/scripts/qa/order-panel-fixture.tsx"></script></body></html>`;

const server = await createServer({
  configFile: false,
  envDir: false,
  root,
  mode: "test",
  cacheDir: path.join(output, "vite-cache"),
  optimizeDeps: { entries: ["scripts/qa/order-panel-fixture.tsx"] },
  plugins: [
    react(),
    {
      name: "order-panel-fixture",
      configureServer(vite) {
        vite.middlewares.use((request, response, next) => {
          if (request.url !== "/") return next();
          response.setHeader("Content-Type", "text/html; charset=utf-8");
          void vite
            .transformIndexHtml("/", HTML)
            .then((html) => response.end(html));
        });
      },
    },
  ],
  resolve: { alias: { "@": path.join(root, "src") } },
  server: { host: "127.0.0.1", port: 0 },
});

let browser;
try {
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch({ headless: true, channel: "chrome" });
  // 원장님 화면과 같은 폭 — 1050px 을 넘어야 「문제 순서」 칸이 340px 기둥으로 선다.
  const page = await browser.newPage({
    viewport: { width: 1500, height: 1050 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*", (route) =>
    route.request().url().startsWith(origin) ||
    route.request().url().startsWith("data:")
      ? route.continue()
      : route.abort(),
  );
  page.setDefaultTimeout(120000);
  page.setDefaultNavigationTimeout(120000);
  await page.goto(origin);
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole("tab", { name: /문제 순서/ }).click();
  await page.waitForSelector("ol li strong");

  const inspect = () =>
    page.evaluate(() => {
      const panel = document.getElementById("worksheet-order-panel");
      const heading = panel.querySelector("h3").parentElement;
      const reset = [...heading.querySelectorAll("button")].find(
        (button) => button.textContent.trim() === "순서 초기화",
      );
      const round = (value) => Math.round(value * 10) / 10;
      const measure = (element) => {
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        // 글자가 실제로 몇 줄인가 — 클래스가 아니라 **그려진 줄 상자**를 센다.
        // 글자를 담은 가장 안쪽 상자를 재야 한다: 바깥 flex 상자를 재면 줄 상자
        // 하나가 더 잡혀 한 줄짜리도 둘로 세어진다.
        const host = element.querySelector("span") || element;
        const range = document.createRange();
        range.selectNodeContents(host);
        const rects = [...range.getClientRects()].filter(
          (rect) => rect.width > 0.5 && rect.height > 0.5,
        );
        const lines = new Set(rects.map((rect) => Math.round(rect.top))).size;
        return {
          label:
            element.getAttribute("aria-label") || element.textContent.trim(),
          top: round(box.top),
          left: round(box.left),
          right: round(box.right),
          height: round(box.height),
          width: round(box.width),
          centerY: round(box.top + box.height / 2),
          fontSize: style.fontSize,
          lines,
          rects: rects.map((rect) => [
            Math.round(rect.top),
            Math.round(rect.width),
            Math.round(rect.height),
          ]),
          scrollWidth: element.scrollWidth,
          clientWidth: element.clientWidth,
        };
      };
      const row = (li) => {
        const actions = li.querySelector("div:last-of-type");
        const strong = li.querySelector("strong");
        return {
          name: strong.textContent.trim(),
          title: strong.getAttribute("title"),
          second: li.querySelector("small").textContent.trim(),
          rowWidth: Math.round(li.getBoundingClientRect().width),
          actionsWidth: Math.round(actions.getBoundingClientRect().width),
          buttons: [...actions.querySelectorAll("button")].map(measure),
        };
      };
      return {
        panelWidth: Math.round(
          panel.closest("aside").getBoundingClientRect().width,
        ),
        headingChildren: [...heading.children].map((child) =>
          child.tagName.toLowerCase(),
        ),
        headingRight: Math.round(heading.getBoundingClientRect().right),
        reset: reset
          ? {
              text: reset.textContent.trim(),
              disabled: reset.disabled,
              ...measure(reset),
              right: Math.round(reset.getBoundingClientRect().right),
            }
          : null,
        rows: [...panel.querySelectorAll("ol > li")].map(row),
      };
    });

  const before = await inspect();
  await page
    .locator("#worksheet-order-panel")
    .screenshot({ path: path.join(output, `${label}-panel.png`) });
  await page.screenshot({ path: path.join(output, `${label}-full.png`) });

  // 칸을 강제로 좁혀 **무엇이 먼저 줄어드는지** 본다(합성 스트레스 — 실제 칸은 340px).
  await page.addStyleTag({
    content:
      '[class*="exportGrid"] { grid-template-columns: 240px minmax(0, 1fr) !important; }',
  });
  const narrow = await inspect();
  await page
    .locator("#worksheet-order-panel")
    .screenshot({ path: path.join(output, `${label}-panel-narrow.png`) });
  await page.evaluate(() => {
    const tag = [...document.querySelectorAll("style")].pop();
    tag.remove();
  });
  await page.waitForFunction(
    () => document.querySelector("aside").getBoundingClientRect().width === 340,
  );

  let afterReset = null;
  if (before.reset && !before.reset.disabled) {
    await page.getByRole("button", { name: "순서 초기화" }).click();
    afterReset = await inspect();
    await page
      .locator("#worksheet-order-panel")
      .screenshot({ path: path.join(output, `${label}-panel-reset.png`) });
  }

  const report = {
    label,
    viewport: "1500x1050",
    before,
    narrow,
    afterReset,
    errors,
  };
  await writeFile(
    path.join(output, `${label}.json`),
    JSON.stringify(report, null, 2),
    "utf8",
  );
  console.log(JSON.stringify(report, null, 2));

  if (checking) {
    assert.equal(errors.length, 0, `페이지 오류: ${errors.join(" / ")}`);
    assert.equal(before.panelWidth, 340, "칸 폭이 원장님 화면과 같아야 한다");
    for (const row of before.rows) {
      assert.equal(row.buttons.length, 4, `단추가 넷이어야 한다: ${row.name}`);
      const edit = row.buttons[0];
      assert.ok(
        edit.label.endsWith("원본 편집"),
        `첫 단추는 원본 편집이다: ${edit.label}`,
      );
      assert.equal(edit.lines, 1, `「원본 편집」이 ${edit.lines}줄이다`);
      assert.ok(
        edit.scrollWidth <= edit.clientWidth,
        `「원본 편집」 글자가 넘친다: ${edit.scrollWidth} > ${edit.clientWidth}`,
      );
      const heights = new Set(row.buttons.map((button) => button.height));
      assert.equal(heights.size, 1, `높이가 갈린다: ${[...heights].join(",")}`);
      const centers = new Set(row.buttons.map((button) => button.centerY));
      assert.equal(
        centers.size,
        1,
        `세로 가운데가 갈린다: ${[...centers].join(",")}`,
      );
      const tops = new Set(row.buttons.map((button) => button.top));
      assert.equal(tops.size, 1, `한 줄이 아니다: ${[...tops].join(",")}`);
      const squares = row.buttons.slice(1);
      const sizes = new Set(
        squares.map((button) => `${button.width}x${button.height}`),
      );
      assert.equal(
        sizes.size,
        1,
        `↑↓× 가 서로 다르다: ${[...sizes].join(" / ")}`,
      );
      assert.equal(
        squares[0].width,
        squares[0].height,
        "↑↓× 는 정사각형이어야 한다",
      );
      assert.ok(
        row.actionsWidth <= row.rowWidth,
        "단추 줄이 카드를 넘으면 안 된다",
      );
      assert.ok(
        /^[0-9]+쪽( [0-9]+번)?$/.test(row.name),
        `이름이 «N쪽 M번» 이 아니다: ${row.name}`,
      );
      assert.ok(!row.name.includes(".pdf"), "파일 이름은 글자로 두지 않는다");
      assert.ok(row.title.includes(".pdf"), "파일 이름은 title 에 남는다");
    }
    assert.ok(before.reset, "「순서 초기화」가 제목 줄에 있어야 한다");
    assert.equal(before.reset.text, "순서 초기화");
    assert.equal(before.reset.lines, 1, "「순서 초기화」는 한 줄이다");
    assert.ok(
      before.headingRight - before.reset.right < 2,
      "「순서 초기화」는 제목 줄 오른쪽 끝에 붙는다",
    );
    // 좁혀도 ↑·↓·× 는 그대로이고 「원본 편집」만 줄어든다.
    assert.equal(narrow.panelWidth, 240, "좁힘 시험이 걸리지 않았다");
    for (const [index, row] of narrow.rows.entries()) {
      const wide = before.rows[index];
      const squares = row.buttons.slice(1);
      for (const [order, square] of squares.entries())
        assert.equal(
          square.width,
          wide.buttons[order + 1].width,
          "↑·↓·× 는 칸이 좁아져도 안 줄어든다",
        );
      assert.ok(
        row.buttons[0].width < wide.buttons[0].width,
        "좁아지면 「원본 편집」이 먼저 줄어든다",
      );
      assert.equal(row.buttons[0].lines, 1, "줄어들어도 한 줄로 남는다");
      const tops = new Set(row.buttons.map((button) => button.top));
      assert.equal(tops.size, 1, "좁아져도 한 줄에 남는다");
      for (let i = 1; i < row.buttons.length; i++)
        assert.ok(
          row.buttons[i - 1].right <= row.buttons[i].left,
          "단추끼리 겹치면 안 된다",
        );
    }
    assert.ok(afterReset, "검증 상태는 원본 차례가 아니어야 한다");
    assert.equal(afterReset.reset.disabled, true, "되돌린 뒤에는 흐려진다");
    assert.deepEqual(
      afterReset.rows.map((row) => row.name),
      ["1쪽 2번", "1쪽 5번", "2쪽 1번", "2쪽 4번", "3쪽 1번", "12쪽"],
      "원본의 쪽·번호 차례로 서야 한다",
    );
    console.log("통과 — 단추 넷 한 줄 · 이름 «N쪽 M번» · 순서 초기화");
  }
} finally {
  await browser?.close();
  await server.close();
}
