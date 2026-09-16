/**
 * 진도 계획 화면(22번 ④ · D-131 Hi-fi 2 «계기판 관») — **실물 브라우저 계측 + 캡처** (브리프 §3).
 *
 * jsdom 은 레이아웃이 없어 «휴대폰 폭에서 계기판 칸이 넘치는가 · 요일 토글이 한 줄에 드나 · 가장 긴 차시 이름이
 * 잘리는가 · 칩이 줄을 바꾸는가»를 못 잰다(ProgressPlanScreen.test.tsx 머리말). 여기서 잰다.
 * 20번 교훈 «시안은 가장 큰 실데이터로» — 차시는 시드 교육과정 전량, `set=stress` 는 매일 수업 · 한 수업 2차시 ·
 * 교육과정에서 가장 긴 차시 이름 구간(14칸), 메인 `main=stress` 는 밀림 날 여섯 · 긴 반 이름 일곱.
 *
 *   BASE=http://localhost:3218 node scripts/qa/plan-screen-layout.mjs
 *   # D-133 후속 — 메인·반 만들기만 · 두 폭 · 다른 폴더
 *   BASE=… OUT_DIR=scratch/plan-screen-followup ONLY=main,main-stress,main-empty,create-open WIDTHS=400,1366 node scripts/qa/plan-screen-layout.mjs
 *
 * D-133(검수 반영): 메인 칩은 «밀림 N명 · 최대 D일» 하나 · 수업 없는 반은 «오늘 수업 계획이 없는 반 N개» ·
 * 검수 줄 «자동 출제» 표지(모양·자리·D-30 을 계산된 스타일로 잰다) · 반 만들기에서 열면 «수업 계획 접기».
 *
 * 대상: `/dev/plan-screen-hifi` — 제품 컴포넌트 + 픽스처(반·학생·진도·계획·확인테스트 요청만 가로챈다). **DB 에 닿지 않는다.**
 * 결과: `scratch/plan-screen/*.png` · `layout.json`. 판정이 하나라도 빨가면 종료 코드 1.
 * 시안(`docs/design/mockups/hifi-d129-daily-auto-test.html` 2 탭)의 세 틀도 찍어 구현과 나란히 붙인다(`side-by-side-*.png`).
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { chromium } from "@playwright/test";

const BASE = process.env.BASE ?? "http://localhost:3218";
const OUT = path.resolve(
  process.env.OUT_DIR ?? path.join("scratch", "plan-screen"),
);
/** 고른 실행만(쉼표) — 없으면 전량 */
const ONLY = process.env.ONLY ? process.env.ONLY.split(",") : null;
const MOCKUP = path.resolve(
  "docs",
  "design",
  "mockups",
  "hifi-d129-daily-auto-test.html",
);

/** 폭 — 작은 휴대폰(360) · 흔한 휴대폰(400) · 태블릿(768) · 흔한 노트북(1366) */
const WIDTHS = process.env.WIDTHS
  ? process.env.WIDTHS.split(",").map(Number)
  : [360, 400, 768, 1366];
const HEIGHT = { 360: 780, 400: 860, 768: 1024, 1366: 768 };

const RUNS = [
  {
    key: "classes",
    query: "screen=classes&set=hifi",
    gauge: {
      cells: 6,
      states: ["late", "now", "empty", "empty", "empty", "empty"],
      delay: "3일 밀림",
    },
  },
  {
    key: "classes-stress",
    query: "screen=classes&set=stress",
    gauge: { cells: 14, delay: "2일 밀림" },
    stress: true,
  },
  {
    key: "classes-none",
    query: "screen=classes&set=none",
    empty: "수업 계획이 없습니다.",
    widths: [400, 1366],
  },
  {
    key: "classes-preview",
    query: "screen=classes&set=hifi",
    preview: true,
    widths: [400, 1366],
  },
  {
    key: "create-open",
    query: "screen=classes&set=hifi",
    create: true,
    // D-133 ⑿ — 열면 «수업 계획 접기»
    toggle: "수업 계획 접기",
  },
  {
    key: "main",
    query: "screen=main&main=hifi",
    main: {
      first: "오늘 초안 5장",
      // D-133 ⑺ — 밀림 칩은 하나
      chips: ["밀림 1명 · 최대 3일", "문항 부족 2명", "시험기간 1명"],
      // D-133 ⑻ — 수만
      classCount: "오늘 수업 계획이 없는 반 1개",
      // D-133 ⑵ — 픽스처 앞 셋이 아침 회차 초안
      tags: 3,
    },
  },
  {
    key: "main-stress",
    query: "screen=main&main=stress",
    main: {
      first: "오늘 초안 5장",
      chips: [
        "밀림 9명 · 최대 12일",
        "문항 부족 2명",
        "시험기간 1명",
        "범위 없음 2명",
      ],
      classCount: "오늘 수업 계획이 없는 반 7개",
      tags: 3,
    },
    stress: true,
  },
  {
    key: "main-empty",
    query: "screen=main&main=empty",
    main: { empty: "오늘 수업 계획이 없습니다." },
    widths: [400, 1366],
  },
];

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const results = [];
const failures = [];
const fail = (run, width, message) =>
  failures.push(`${run} @${width}: ${message}`);

/** 공통 판정 — 본문 가로 넘침 · 화면 밖으로 나간 글자 · 가로로 잘린 잎 글자 */
function measure(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const leaves = [...document.querySelectorAll("body *")].filter(
      (el) =>
        el.children.length === 0 &&
        (el.textContent ?? "").trim().length > 0 &&
        getComputedStyle(el).visibility !== "hidden" &&
        el.getClientRects().length > 0 &&
        !el.closest(".sr-only") &&
        !el.classList.contains("sr-only") &&
        !["OPTION", "SCRIPT", "STYLE"].includes(el.tagName),
    );
    const clipped = leaves
      .filter(
        (el) =>
          el.scrollWidth - el.clientWidth > 1 &&
          getComputedStyle(el).overflowX !== "visible",
      )
      .map((el) => (el.textContent ?? "").trim().slice(0, 40));
    const offscreen = leaves
      .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
      .map((el) => (el.textContent ?? "").trim().slice(0, 40));

    const cells = [...document.querySelectorAll("li[data-state]")];
    const tops = [
      ...new Set(cells.map((c) => Math.round(c.getBoundingClientRect().top))),
    ];
    const gauge = cells.length
      ? {
          cells: cells.length,
          states: cells.map((c) => c.getAttribute("data-state")),
          rows: tops.length,
          minWidth: Math.min(
            ...cells.map((c) => c.getBoundingClientRect().width),
          ),
          cursor: cells.some((c) => getComputedStyle(c).cursor === "pointer"),
          longestLabelChars: Math.max(
            ...cells.map(
              (c) =>
                (c.querySelector("span:nth-of-type(2)")?.textContent ?? "")
                  .length,
            ),
          ),
          longestLabelLines: Math.max(
            ...cells.map((c) => {
              const leg = c.querySelector("span:nth-of-type(2)");
              if (!leg) return 0;
              const lh = parseFloat(getComputedStyle(leg).lineHeight) || 15;
              return Math.round(leg.getBoundingClientRect().height / lh);
            }),
          ),
        }
      : null;

    const days = [
      ...document.querySelectorAll('[role="group"] button[aria-pressed]'),
    ].filter((b) =>
      ["월", "화", "수", "목", "금", "토", "일"].includes(
        (b.textContent ?? "").trim(),
      ),
    );
    const dayRows = [
      ...new Set(days.map((b) => Math.round(b.getBoundingClientRect().top))),
    ].length;
    const chips = [
      ...document.querySelectorAll('ul[aria-label="손 갈 곳"] li'),
    ];
    const chipRows = [
      ...new Set(chips.map((c) => Math.round(c.getBoundingClientRect().top))),
    ].length;
    // «자동 출제» 표지(D-133 ⑵) — 이름 바로 뒤 · 같은 줄 · 가운데 · 모양 · 누르는 것이 아니다
    const tags = [...document.querySelectorAll("[data-auto-draft-tag]")].map(
      (tag) => {
        const s = getComputedStyle(tag);
        const r = tag.getBoundingClientRect();
        const link = tag.previousElementSibling;
        const lr = link?.getBoundingClientRect();
        return {
          text: (tag.textContent ?? "").trim(),
          afterLink: link?.tagName === "A",
          name: (link?.textContent ?? "").trim(),
          centerDiff: lr
            ? Math.abs(r.top + r.height / 2 - (lr.top + lr.height / 2))
            : null,
          gap: lr ? Math.round(r.left - lr.right) : null,
          height: Math.round(r.height),
          look: [
            s.backgroundColor,
            s.borderTopWidth + " " + s.borderTopStyle + " " + s.borderTopColor,
            s.color,
            s.fontSize,
            s.fontWeight,
            s.paddingTop + " " + s.paddingRight,
            s.borderTopLeftRadius,
          ].join(" | "),
          cursor: s.cursor,
          insideControl: Boolean(tag.closest("a, button")),
        };
      },
    );
    return {
      tags,
      overflow: doc.scrollWidth - doc.clientWidth,
      clipped,
      offscreen,
      gauge,
      dayButtons: days.length,
      dayRows,
      dayMinHeight: days.length
        ? Math.min(...days.map((b) => b.getBoundingClientRect().height))
        : null,
      chips: chips.map((c) => (c.textContent ?? "").trim()),
      chipRows,
      text: document.body.innerText,
    };
  });
}

async function open(width, query) {
  const page = await browser.newPage({
    viewport: { width, height: HEIGHT[width] },
  });
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning")
      errors.push(msg.text().slice(0, 200));
  });
  page.on("pageerror", (err) => errors.push(String(err).slice(0, 200)));
  await page.goto(`${BASE}/dev/plan-screen-hifi?${query}`, {
    waitUntil: "networkidle",
  });
  return { page, errors };
}

for (const run of RUNS) {
  if (ONLY && !ONLY.includes(run.key)) continue;
  for (const width of run.widths
    ? run.widths.filter((w) => WIDTHS.includes(w))
    : WIDTHS) {
    const { page, errors } = await open(width, run.query);
    try {
      if (run.main) {
        await page.getByRole("region", { name: "오늘의 확인테스트" }).waitFor();
      } else {
        await page.getByRole("form", { name: "수업 계획" }).waitFor();
      }

      if (run.preview) {
        const plan = page.getByRole("region", { name: "수업 계획" });
        await plan
          .getByRole("group", { name: "수업 요일" })
          .getByRole("button", { name: "화" })
          .click();
        await page.getByText("저장 전 미리보기").waitFor({ timeout: 5000 });
        await page.waitForTimeout(200);
      }
      if (run.create) {
        const form = page.getByRole("form", { name: "반 추가" });
        await form.getByRole("button", { name: "수업 계획 넣기" }).click();
        if (run.toggle)
          await form
            .getByRole("button", { name: run.toggle })
            .waitFor({ timeout: 3000 })
            .catch(() =>
              fail(run.key, width, `열어도 「${run.toggle}」 단추가 없다`),
            );
        const days = form.getByRole("group", { name: "수업 요일" });
        await days.getByRole("button", { name: "월" }).click();
        await days.getByRole("button", { name: "목" }).click();
        await form.getByRole("button", { name: /^시작 차시/ }).click();
        await form.getByRole("group", { name: "시작 차시 선택" }).waitFor();
      }

      const m = await measure(page);
      const row = {
        run: run.key,
        width,
        ...m,
        text: undefined,
        console: errors,
      };
      if (m.overflow > 1)
        fail(run.key, width, `본문 가로 넘침 ${m.overflow}px`);
      if (m.clipped.length)
        fail(
          run.key,
          width,
          `잘린 글자 ${m.clipped.length} — ${m.clipped.slice(0, 3).join(" | ")}`,
        );
      if (m.offscreen.length)
        fail(
          run.key,
          width,
          `화면 밖 글자 ${m.offscreen.length} — ${m.offscreen.slice(0, 3).join(" | ")}`,
        );
      if (errors.length)
        fail(run.key, width, `콘솔 오류·경고 ${errors.length} — ${errors[0]}`);

      if (!run.main && !run.create) {
        if (m.dayButtons !== 7)
          fail(run.key, width, `요일 토글 ${m.dayButtons}개`);
        if ((m.dayMinHeight ?? 0) < 43.5)
          fail(run.key, width, `요일 토글 높이 ${m.dayMinHeight}px(44 미만)`);
      }
      if (run.gauge) {
        if (!m.gauge) fail(run.key, width, "계기판 칸이 없다");
        else {
          if (m.gauge.cells !== run.gauge.cells)
            fail(
              run.key,
              width,
              `칸 ${m.gauge.cells}개(기대 ${run.gauge.cells})`,
            );
          if (
            run.gauge.states &&
            m.gauge.states.join() !== run.gauge.states.join()
          )
            fail(run.key, width, `칸 색 ${m.gauge.states.join()}`);
          if (m.gauge.minWidth < 63.5)
            fail(
              run.key,
              width,
              `가장 좁은 칸 ${m.gauge.minWidth.toFixed(1)}px(64 미만)`,
            );
          if (m.gauge.cursor)
            fail(run.key, width, "계기판 칸에 손가락 커서(D-30)");
          // 🔴 가장 큰 데이터가 정말 창 안에 섰나 — 교육과정에서 가장 긴 차시 이름 둘(40자 안팎)이 한 칸에
          //    (픽스처가 긴 이름을 창 앞날에 두어 헛돈 적이 있다 — 2026-09-16)
          if (run.stress && m.gauge.longestLabelChars < 80)
            fail(
              run.key,
              width,
              `가장 긴 칸 이름 ${m.gauge.longestLabelChars}자 — 긴 이름이 창 안에 없다`,
            );
        }
        if (!m.text?.includes(run.gauge.delay))
          fail(run.key, width, `「${run.gauge.delay}」 줄이 없다`);
      }
      if (run.empty && !m.text?.includes(run.empty))
        fail(run.key, width, `「${run.empty}」 문구가 없다`);
      if (run.preview && !(m.gauge && m.gauge.cells === 8))
        fail(
          run.key,
          width,
          `미리보기 칸 ${m.gauge?.cells}개(기대 8 — 월화수금 두 주)`,
        );
      if (run.main?.first && !m.text?.includes(run.main.first))
        fail(run.key, width, `첫 줄 「${run.main.first}」이 없다`);
      if (run.main?.chips && m.chips.join() !== run.main.chips.join())
        fail(run.key, width, `칩 ${m.chips.join(" / ")}`);
      if (run.main?.empty && !m.text?.includes(run.main.empty))
        fail(run.key, width, `「${run.main.empty}」 문구가 없다`);
      if (run.main?.classCount && !m.text?.includes(run.main.classCount))
        fail(run.key, width, `「${run.main.classCount}」 줄이 없다`);
      if (run.main && /— 오늘 수업 계획이 없습니다./.test(m.text ?? ""))
        fail(run.key, width, "반 이름을 늘어놓은 옛 줄이 남았다");
      if (run.main?.tags !== undefined) {
        if (m.tags.length !== run.main.tags)
          fail(
            run.key,
            width,
            `표지 ${m.tags.length}개(기대 ${run.main.tags})`,
          );
        // 11px 은 작업실(.lessonContent)이 캡션 바닥 12px 로 올린다 — 작업실 크기를 따른다(보고서 ⑥).
        // 파랑은 --blue 가 아니라 리터럴 #2064B3(rgb 32,100,179) — 작업실 --blue(#3159DF)가 아니다.
        const LOOK =
          "rgb(255, 255, 255) | 1px solid rgb(32, 100, 179) | rgb(32, 100, 179) | 12px | 700 | 2px 8px | 4px";
        for (const tag of m.tags) {
          if (tag.text !== "자동 출제")
            fail(run.key, width, `표지 글자 «${tag.text}»`);
          if (!tag.afterLink)
            fail(run.key, width, "표지가 이름 링크 바로 뒤가 아니다");
          if (tag.insideControl)
            fail(run.key, width, "표지가 링크·단추 안에 있다(D-30)");
          if (tag.cursor === "pointer")
            fail(run.key, width, "표지에 손가락 커서(D-30)");
          if (tag.look !== LOOK) fail(run.key, width, `표지 모양 ${tag.look}`);
          if ((tag.centerDiff ?? 99) > 1.5)
            fail(
              run.key,
              width,
              `표지가 이름과 세로 가운데가 어긋난다(${tag.centerDiff}px)`,
            );
        }
      }

      delete row.text;
      results.push(row);
      const shot = path.join(OUT, `${run.key}-${width}.png`);
      await page.screenshot({ path: shot, fullPage: true });
      // 메인은 섹션만 한 장 더 — 표지·칩·반 수 줄을 가까이서 본다
      if (run.main)
        await page
          .getByRole("region", { name: "오늘의 확인테스트" })
          .screenshot({
            path: path.join(OUT, `${run.key}-section-${width}.png`),
          });
      console.log(
        `${run.key.padEnd(16)} ${String(width).padStart(4)}  넘침 ${m.overflow} · 잘림 ${m.clipped.length} · 밖 ${m.offscreen.length}` +
          (m.gauge
            ? ` · 칸 ${m.gauge.cells}(${m.gauge.rows}줄, 최소 ${m.gauge.minWidth.toFixed(0)}px, 가장 긴 이름 ${m.gauge.longestLabelChars}자·${m.gauge.longestLabelLines}줄)`
            : "") +
          (m.dayButtons ? ` · 요일 ${m.dayRows}줄` : "") +
          (m.chips.length ? ` · 칩 ${m.chips.length}(${m.chipRows}줄)` : "") +
          (m.tags.length
            ? ` · 표지 ${m.tags.length}(높이 ${m.tags[0].height}px · 이름과 ${m.tags[0].gap}px)`
            : "") +
          (errors.length ? ` · 콘솔 ${errors.length}` : ""),
      );
    } catch (error) {
      fail(run.key, width, `실행 실패 — ${String(error).slice(0, 160)}`);
    } finally {
      await page.close();
    }
  }
}

// ── 시안 Hi-fi 2 의 세 틀을 찍고 구현과 나란히 ─────────────────────
const mockShots = {};
for (const width of [400, 1366].filter((w) => WIDTHS.includes(w))) {
  const page = await browser.newPage({
    viewport: { width, height: HEIGHT[width] },
  });
  await page.goto(pathToFileURL(MOCKUP).href);
  await page.getByRole("tab", { name: /계기판 관/ }).click();
  const frames = page.locator("section.panel.v2 .frames > div");
  for (const [i, name] of ["classes", "main", "list"].entries()) {
    const file = path.join(OUT, `mockup-${name}-${width}.png`);
    await frames.nth(i).screenshot({ path: file });
    mockShots[`${name}-${width}`] = file;
  }
  await page.close();
}

const dataUrl = (file) =>
  `data:image/png;base64,${fs.readFileSync(file).toString("base64")}`;
async function sideBySide(name, pairs) {
  // 고른 실행만 돌렸으면 짝이 없는 판은 건너뛴다
  if (pairs.some(([, file]) => !file || !fs.existsSync(file))) return;
  const page = await browser.newPage({
    viewport: { width: 1600, height: 900 },
  });
  const figures = pairs
    .map(
      ([caption, file]) =>
        `<figure style="margin:0;display:grid;gap:6px;align-content:start"><figcaption style="font:600 13px system-ui">${caption}</figcaption><img src="${dataUrl(file)}" style="max-width:${pairs.length > 2 ? 760 : 1400}px;border:1px solid #ccc"></figure>`,
    )
    .join("");
  await page.setContent(
    `<body style="margin:16px;background:#fff"><div style="display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap">${figures}</div></body>`,
  );
  await page.screenshot({
    path: path.join(OUT, `side-by-side-${name}.png`),
    fullPage: true,
  });
  await page.close();
}
await sideBySide("classes-400", [
  ["시안 Hi-fi 2 — 반 관리(400)", mockShots["classes-400"]],
  ["구현 — 반 관리(400)", path.join(OUT, "classes-400.png")],
]);
await sideBySide("classes-1366", [
  ["시안 Hi-fi 2 — 반 관리(1366)", mockShots["classes-1366"]],
  ["구현 — 반 관리(1366)", path.join(OUT, "classes-1366.png")],
]);
await sideBySide("main", [
  ["시안 Hi-fi 2 — 메인(400)", mockShots["main-400"]],
  ["구현 — 메인(400)", path.join(OUT, "main-400.png")],
  ["시안 Hi-fi 2 — 메인(1366)", mockShots["main-1366"]],
  ["구현 — 메인(1366)", path.join(OUT, "main-1366.png")],
]);

fs.writeFileSync(
  path.join(OUT, "layout.json"),
  JSON.stringify({ results, failures }, null, 2),
);
await browser.close();
console.log("");
console.log(
  failures.length
    ? `🔴 판정 빨강 ${failures.length}`
    : `전부 통과 — ${results.length}회`,
);
for (const f of failures) console.log(`  ${f}`);
process.exitCode = failures.length ? 1 : 0;
