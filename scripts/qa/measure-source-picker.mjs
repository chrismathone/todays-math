/** 출처 고르기 창 실측 — 출처를 하나씩 눌러 출처 줄 단추 높이 · 줄 높이 · 세 단과 바닥 줄 (원장님 2026-10-21
 * «교과서 이외를 고르면 엄청나게 버튼이 길어진다»).
 * BASE=http://127.0.0.1:3417 OUT=<dir> LABEL=before|after node scripts/qa/measure-source-picker.mjs
 *
 * 두 창이 같은 CSS(`BankSourcePicker.module.css`)를 쓴다:
 *   시험지 만들기 — 새 작업실 `/dev/workspace-alignment#bank`(화면 안 가짜 API)
 *   문제은행     — 옛 작업실 `/dev/unified?design=2`(창이 부르는 API 를 브라우저에서 고정물로 답한다)
 * DB · 계정은 쓰지 않는다. 고정물로 답하지 않은 /api 요청은 막고 센다.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const base = process.env.BASE ?? "http://127.0.0.1:3417";
const out = path.resolve(process.env.OUT ?? ".qa-artifacts/source-picker");
const label = process.env.LABEL ?? "run";
await mkdir(out, { recursive: true });
const SIZES = [
  [1280, 800],
  [1440, 900],
  [390, 844],
];
const GROUPS = ["전체", "엔진", "교과서", "기출", "그 밖"];

// 문제은행(옛 작업실)이 창을 열 때 읽는 수 — 하네스(previewData.ts)와 같은 지어낸 책.
const KINDS = [
  "기초 연산",
  "형성 평가",
  "소단원 평가",
  "중단원 평가",
  "대단원 평가",
  "수준별 문제",
  "쌍둥이 문제",
  "시험 대비",
  "서술형 평가",
  "진단 평가",
  "수행 과제",
  "수업 자료",
  "기타",
];
const BOOKS = [
  [
    "중1",
    "가람출판",
    "김예시",
    40,
    { "기초 연산": 18, "형성 평가": 12, "대단원 평가": 10 },
  ],
  ["중1", "누리출판", "이예시", 25, { "형성 평가": 15, "서술형 평가": 10 }],
  ["중1", "다온출판", null, 9, { "쌍둥이 문제": 9 }],
  ["중2", "가람출판", "박예시", 30, { "기초 연산": 20, "시험 대비": 10 }],
].map(([grade, publisher, author, count, kinds], index) => ({
  id: `50000000-0000-4000-8000-30000000000${index + 1}`,
  grade,
  publisher,
  author,
  title: `${grade} 수학`,
  count,
  open: count,
  materials: Object.keys(kinds).length,
  kinds,
}));
const META = {
  version: 2,
  countUnit: "question",
  queryKey: "source-picker-measure",
};
const COUNTS = {
  ...META,
  sources: {
    total: 112,
    engine: 8,
    school_textbook: 104,
    past_exam: 0,
    other: 0,
  },
  textbook: { total: 104, grades: ["중1", "중2"], kinds: KINDS, books: BOOKS },
};
const EMPTY_BANK = {
  ...META,
  problems: [],
  total: 0,
  page: 1,
  pageSize: 12,
  grades: [{ grade: "중1", count: 0 }],
  chapters: [],
};

/** 열린 창 안을 읽는다 — 출처 줄 · 단추 · 세 단(있으면) · 안내 · 바닥 줄. */
function readPicker() {
  const dialog = document.querySelector("dialog[open]");
  const rect = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
      height: Math.round(r.height),
    };
  };
  const row = dialog.querySelector('[role="group"][aria-label="출처"]');
  const buttons = [...row.querySelectorAll("button")].map((b) => ({
    text: b.textContent.trim(),
    height: Math.round(b.getBoundingClientRect().height),
    pressed: b.getAttribute("aria-pressed"),
  }));
  const kinds = dialog.querySelector('fieldset[aria-label="자료 종류"]');
  const pane = kinds?.parentElement?.parentElement ?? null;
  const columns = pane ? [...pane.children].map((column) => rect(column)) : [];
  const footer = [...dialog.querySelectorAll("div")].find((el) =>
    el.firstElementChild?.textContent?.startsWith("걸리는 문항"),
  );
  const note =
    row.nextElementSibling?.tagName === "P" ? row.nextElementSibling : null;
  const body = dialog.querySelector("header + div");
  return {
    viewport: [innerWidth, innerHeight],
    body: rect(body),
    row: rect(row),
    buttonHeights: [...new Set(buttons.map((b) => b.height))],
    pressed: buttons.find((b) => b.pressed === "true")?.text ?? null,
    note: rect(note),
    pane: rect(pane),
    columns,
    footer: rect(footer),
    bodyScroll: body.scrollHeight - body.clientHeight,
  };
}

async function settled(page, tag) {
  let last = "";
  for (let i = 0; i < 25; i++) {
    await page.waitForTimeout(150);
    const now = JSON.stringify(await page.evaluate(readPicker));
    if (now === last) return JSON.parse(now);
    last = now;
  }
  throw new Error(`${tag}: picker did not settle ${last}`);
}

async function measureGroups(page, tag, results) {
  const dialog = page.getByRole("dialog", { name: "출처 고르기" });
  const row = dialog.getByRole("group", { name: "출처" });
  await row.waitFor();
  for (const group of GROUPS) {
    await row.getByRole("button", { name: new RegExp(`^${group}`) }).click();
    if (group === "교과서")
      await dialog
        .getByRole("checkbox", { name: /^가람출판/ })
        .first()
        .waitFor();
    const m = await settled(page, `${tag} ${group}`);
    results.push({ label, tag, group, ...m });
    await page.screenshot({
      path: path.join(out, `${label}-${tag}-${group}.png`),
    });
  }
}

const browser = await chromium.launch({ headless: true });
const results = [];
const blocked = [];
const errors = [];
try {
  for (const [width, height] of SIZES) {
    const size = `${width}x${height}`;
    // ── 시험지 만들기(새 작업실 · 하네스) ──
    {
      const context = await browser.newContext({ viewport: { width, height } });
      await context.route("**/api/**", (route) => {
        blocked.push(
          `builder ${route.request().method()} ${new URL(route.request().url()).pathname}`,
        );
        return route.abort("blockedbyclient");
      });
      const page = await context.newPage();
      page.setDefaultTimeout(120000);
      page.on("pageerror", (e) => errors.push(`${size} builder: ${e.message}`));
      await page.goto(`${base}/dev/workspace-alignment#bank`, {
        timeout: 600000,
      });
      await page.waitForSelector("[data-scope-layout]");
      // 닫힌 <details> 안 단추는 역할 조회에 안 잡힌다 — 이름 속성으로 그 칸을 품은 «추가 선택»을 찾는다.
      const extra = page
        .locator("details", {
          has: page.locator('button[aria-label^="출처 고르기"]'),
        })
        .first();
      await extra.locator("summary").click();
      await extra.getByRole("button", { name: /^출처 고르기/ }).click();
      await measureGroups(page, `builder-${size}`, results);
      await context.close();
    }
    // ── 문제은행(옛 작업실 · 고정물 API) ──
    {
      const context = await browser.newContext({ viewport: { width, height } });
      await context.route("**/api/**", (route) => {
        const url = new URL(route.request().url());
        if (
          url.pathname === "/api/dev/unified/problems/sources" &&
          !url.searchParams.get("view")
        )
          return route.fulfill({ json: COUNTS });
        if (url.pathname === "/api/dev/unified/problems")
          return route.fulfill({ json: EMPTY_BANK });
        blocked.push(`bank ${route.request().method()} ${url.pathname}`);
        return route.abort("blockedbyclient");
      });
      const page = await context.newPage();
      page.setDefaultTimeout(120000);
      page.on("pageerror", (e) => errors.push(`${size} bank: ${e.message}`));
      await page.goto(`${base}/dev/unified?design=2`, { timeout: 600000 });
      // 옛 작업실의 첫 화면은 작업홈 — 옆 메뉴의 «문제은행»으로 들어간다.
      await page
        .getByRole("button", { name: /^문제은행/ })
        .first()
        .click();
      const field = page.getByRole("button", { name: /^출처 고르기/ });
      if (!(await field.isVisible().catch(() => false)))
        await page.getByRole("button", { name: "상세 필터" }).click();
      await field.click();
      await measureGroups(page, `bank-${size}`, results);
      await context.close();
    }
  }
} finally {
  await browser.close();
}
await writeFile(
  path.join(out, `${label}.json`),
  JSON.stringify({ base, label, results, blocked, errors }, null, 2),
);
for (const r of results)
  console.log(
    `${r.tag} ${r.group}: row ${r.row.height}px · buttons ${r.buttonHeights.join("/")}px · body ${r.body.height}px` +
      (r.pane
        ? ` · pane ${r.pane.top}-${r.pane.bottom} · columns→${r.columns.map((c) => c.bottom).join("/")} · footer ${r.footer?.top}`
        : "") +
      (r.note ? ` · note ${r.note.top}-${r.note.bottom}` : "") +
      ` · bodyScroll ${r.bodyScroll}`,
  );
console.log(`blocked ${blocked.length} · page errors ${errors.length}`);
if (errors.length) console.log(errors.slice(0, 5).join("\n"));
