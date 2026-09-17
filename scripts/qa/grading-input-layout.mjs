/**
 * 채점 입력 화면(D-134 트랙 1, A안) — **실물 브라우저 계측 + 캡처** (브리프 §3).
 *
 * jsdom 은 레이아웃도 계산된 스타일도 없어 «세 상태가 **눈으로** 갈리나 · 56칸이 휴대폰 폭에서
 * 넘치나 · 점선이 실선과 다르게 보이나»를 못 잰다(`GradeSheet.test.tsx` 머리말).
 * 2026-09-16 교훈 — 「RTL 은 클래스 이름을 보고 초록인데 작업실이 토큰·작은 글자를 덮었다」.
 * 그래서 여기서는 **계산된 스타일**로 잰다.
 *
 *   BASE=http://localhost:3221 node scripts/qa/grading-input-layout.mjs
 *   BASE=… OUT_DIR=scratch/grading-input WIDTHS=390,1366 node scripts/qa/grading-input-layout.mjs
 *
 * 대상: `/dev/grading-hifi` — 제품 컴포넌트(`GradeSheet`) + 제품 크롬(`AppChrome`) + 픽스처
 *       (**공유 DB 의 실제 최대 시험지 크기** 학생 7 × 문항 8 = 56칸). **DB 에 닿지 않는다.**
 * 결과: `scratch/grading-input/*.png` · `layout.json`. 판정이 하나라도 빨가면 종료 코드 1.
 */
import fs from "node:fs";
import path from "node:path";

import { chromium } from "@playwright/test";

const BASE = process.env.BASE ?? "http://localhost:3221";
const OUT = path.resolve(
  process.env.OUT_DIR ?? path.join("scratch", "grading-input"),
);
/** 폭 — 흔한 휴대폰(390, 브리프가 콕 집었다) · 흔한 노트북(1366) */
const WIDTHS = process.env.WIDTHS
  ? process.env.WIDTHS.split(",").map(Number)
  : [390, 1366];
const HEIGHT = { 360: 780, 390: 844, 400: 860, 768: 1024, 1366: 768 };

const RUNS = [
  { key: "fresh", query: "set=fresh", locked: 7 },
  { key: "partial", query: "set=partial", locked: 3 },
  { key: "marked", query: "set=marked", locked: 0 },
];

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const report = {};
let bad = 0;

function verdict(label, ok, detail) {
  if (!ok) bad += 1;
  console.log(`  ${ok ? "✓" : "🔴"} ${label}${detail ? ` — ${detail}` : ""}`);
  return ok;
}

/**
 * 한 화면을 잰다.
 *
 * 🔴 칸의 상태는 **접근성 이름**으로 고르고, 갈리는지는 **계산된 스타일**로 잰다 —
 *    클래스 이름으로 재면 바깥 틀이 토큰을 덮었을 때 그대로 초록이 된다.
 */
async function measure(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const main = document.querySelector("main");
    /**
     * 🔴 **재는 자리를 이 트랙이 만든 것으로 좁힌다.**
     *
     * 문서 전체(`documentElement`)는 390px 에서 이미 가로로 넘친다 — 그런데 그 범인은
     * `AppChrome` 의 머리말 nav 이고 **이 트랙이 만든 것이 아니다**. 실측(2026-09-18):
     * 손 안 댄 `/dev/chrome-check` 가 계정 없이도 **78px** 넘친다(nav 442px).
     * 그 숫자를 이 트랙의 판정으로 삼으면 «채점 화면이 휴대폰에서 깨졌다»는 거짓 경보가 되고,
     * 거짓 경보는 가드를 끈다(2026-08-20). 그래서 **판정은 `main`**, 문서 쪽은 **기록만** 한다.
     */
    const scrollBox = document.querySelector("table")?.parentElement ?? null;
    /**
     * 🔴 **표 안은 빼고 센다.** 표는 제 상자 안에서 가로로 스크롤하라고 만든 것이라,
     *    문항 5~8번 칸이 화면 밖에 있는 것은 «결함»이 아니라 «스크롤»이다.
     *    표 밖의 것이 삐져나오면 그건 진짜 결함이다.
     */
    const leaves = [...(main ?? document.body).querySelectorAll("*")].filter(
      (el) => el.children.length === 0 && !scrollBox?.contains(el),
    );
    const offscreen = leaves
      .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
      .map((el) => (el.textContent ?? "").trim().slice(0, 40));

    /**
     * 🔴 **끝까지 밀어도 «학생»과 «상태»는 보인다** — 둘 다 고정 칸이다.
     *    상태 칸(끝·결시)은 이 화면에서 제일 중요한 단추라, 줄마다 가로로 밀어야 닿으면
     *    56칸을 한 화면에 담은 뜻이 없다(2026-09-18 실측으로 드러났다).
     */
    let pinned = null;
    if (scrollBox) {
      const before = scrollBox.scrollLeft;
      scrollBox.scrollLeft = scrollBox.scrollWidth;
      const row = document.querySelector("tbody tr");
      const nameCell = row?.querySelector('th[scope="row"]');
      const statusCell = row?.lastElementChild;
      const inside = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return r.left >= -1 && r.right <= window.innerWidth + 1 && r.width > 0;
      };
      pinned = {
        scrolled: Math.round(scrollBox.scrollLeft),
        scrollable: scrollBox.scrollWidth - scrollBox.clientWidth,
        nameVisible: inside(nameCell),
        statusVisible: inside(statusCell),
        statusText: (statusCell?.textContent ?? "").trim(),
      };
      scrollBox.scrollLeft = before;
    }

    const table = document.querySelector("table");
    const cells = [...document.querySelectorAll("tbody td button[aria-label]")];
    const look = (el) => {
      const s = getComputedStyle(el);
      return [
        s.borderTopStyle,
        s.borderTopColor,
        s.backgroundColor,
        s.color,
      ].join(" | ");
    };
    /** 상태별로 **한 표본씩** — 모양이 정말 갈리는지는 이 문자열이 서로 다른가로 잰다. */
    const byState = {};
    for (const c of cells) {
      const name = c.getAttribute("aria-label") ?? "";
      const state = ["아직 안 봄", "맞음", "틀림", "결시"].find((k) =>
        name.endsWith(k),
      );
      if (!state) continue;
      byState[state] ??= {
        count: 0,
        look: look(c),
        text: (c.textContent ?? "").trim(),
        cursor: getComputedStyle(c).cursor,
        disabled: c.disabled,
        size: [
          Math.round(c.getBoundingClientRect().width),
          Math.round(c.getBoundingClientRect().height),
        ].join("×"),
      };
      byState[state].count += 1;
    }

    const rows = [...document.querySelectorAll("tbody tr")];
    const save = [...document.querySelectorAll("button")].find(
      (b) => (b.textContent ?? "").trim() === "채점 결과 저장",
    );
    const status = document.querySelector('[role="status"]');
    const summary = document.querySelector('section[aria-label="채점 결과"]');
    const buttons = [...document.querySelectorAll("button")].map((b) =>
      (b.textContent ?? "").trim(),
    );

    return {
      // 🔴 이 트랙의 지면 — 채점 화면이 가로로 넘치면 원장님은 표를 보려고 페이지를 민다
      mainOverflow: main ? main.scrollWidth - main.clientWidth : null,
      // 기록만 — 범인은 머리말 nav 다(위 주석). 판정에 안 쓴다.
      pageOverflow: doc.scrollWidth - doc.clientWidth,
      navWidth: document.querySelector("header nav")
        ? Math.round(
            document.querySelector("header nav").getBoundingClientRect().width,
          )
        : null,
      offscreen,
      // 표는 제 안에서 가로 스크롤을 낸다(문항이 많아지면) — 그건 정상이고, 문서가 넘치는 것과 다르다
      tableScroll: table
        ? table.parentElement.scrollWidth - table.parentElement.clientWidth
        : null,
      pinned,
      cellCount: cells.length,
      rowCount: rows.length,
      byState,
      // 표 행 자체는 누르는 것이 아니다(D-30)
      rowCursor: rows.map((r) => getComputedStyle(r).cursor),
      rowHasClick: rows.some((r) => r.getAttribute("onclick") !== null),
      saveDisabled: save ? save.disabled : null,
      status: (status?.textContent ?? "").trim(),
      summary: summary ? (summary.innerText ?? "").trim() : null,
      buttons,
      text: document.body.innerText,
    };
  });
}

async function open(width, query) {
  const page = await browser.newPage({
    viewport: { width, height: HEIGHT[width] ?? 800 },
  });
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning")
      errors.push(msg.text().slice(0, 200));
  });
  page.on("pageerror", (err) => errors.push(String(err).slice(0, 200)));
  await page.goto(`${BASE}/dev/grading-hifi?${query}`, {
    waitUntil: "networkidle",
  });
  await page.waitForSelector("tbody tr");
  // 🔴 **계정 구역이 자리를 잡은 뒤에 잰다.** `AccountBadge` 는 세션을 받아 오기 전까지 뼈대만
  //    그리고, 이메일이 들어오면 머리말이 90px 쯤 넓어진다. 기다리지 않으면 같은 화면이 회차마다
  //    다른 폭으로 읽힌다 — 실제로 첫 계측에서 `partial` 만 0px 로 나왔다(2026-09-18).
  await page
    .waitForFunction(() => document.body.innerText.includes("로그아웃"), {
      timeout: 15000,
    })
    .catch(() => {});
  return { page, errors };
}

for (const run of RUNS) {
  for (const width of WIDTHS) {
    const tag = `${run.key}-${width}`;
    console.log(`\n${tag}`);
    const { page, errors } = await open(width, run.query);
    const m = await measure(page);
    await page.screenshot({
      path: path.join(OUT, `${tag}.png`),
      fullPage: true,
    });
    const table = page.locator("table");
    if (await table.count())
      await table
        .first()
        .screenshot({ path: path.join(OUT, `${tag}-table.png`) })
        .catch(() => {});

    verdict(
      `${tag} 채점 지면이 가로로 안 넘친다`,
      m.mainOverflow !== null && m.mainOverflow <= 1,
      `main ${m.mainOverflow}px (참고 — 문서 ${m.pageOverflow}px · 머리말 nav ${m.navWidth}px: 손 안 댄 /dev/chrome-check 도 390 에서 78px 넘친다)`,
    );
    verdict(
      `${tag} 채점 지면 밖으로 삐져나온 것 0`,
      m.offscreen.length === 0,
      m.offscreen.join(" / "),
    );
    verdict(
      `${tag} 56칸`,
      m.cellCount === 56 && m.rowCount === 7,
      `칸 ${m.cellCount} · 줄 ${m.rowCount}`,
    );
    // 🔴 끝까지 민 상태에서도 학생 이름과 «끝·결시»가 보인다
    verdict(
      `${tag} 끝까지 밀어도 «학생»·«상태» 칸이 보인다`,
      m.pinned !== null &&
        m.pinned.nameVisible === true &&
        m.pinned.statusVisible === true,
      m.pinned
        ? `민 거리 ${m.pinned.scrolled}/${m.pinned.scrollable}px · 학생 ${m.pinned.nameVisible} · 상태 ${m.pinned.statusVisible} «${m.pinned.statusText}»`
        : "표가 없다",
    );

    // 🔴 세 상태가 **모양으로** 갈리나 — 같은 문자열이 둘이면 눈으로 못 가른다
    const looks = Object.entries(m.byState).map(([k, v]) => [k, v.look]);
    const uniq = new Set(looks.map(([, l]) => l));
    verdict(
      `${tag} 상태별 모양이 서로 다르다`,
      uniq.size === looks.length,
      looks.map(([k, l]) => `${k}=${l}`).join("  //  "),
    );
    const dashed = m.byState["아직 안 봄"];
    if (dashed)
      verdict(
        `${tag} «아직 안 봄»은 점선이고 글자가 없다`,
        dashed.look.startsWith("dashed") && dashed.text === "",
        `${dashed.look} · 글자 «${dashed.text}»`,
      );
    const right = m.byState["맞음"];
    if (right) verdict(`${tag} «맞음»은 ○`, right.text === "○", right.text);
    const wrong = m.byState["틀림"];
    if (wrong) verdict(`${tag} «틀림»은 ✕`, wrong.text === "✕", wrong.text);
    const absent = m.byState["결시"];
    if (absent)
      verdict(
        `${tag} 결시 줄의 칸은 못 누른다`,
        absent.disabled === true && absent.cursor !== "pointer",
        `disabled=${absent.disabled} cursor=${absent.cursor}`,
      );

    // 🔴 일괄 단추가 없다
    const bulk = m.buttons.filter((b) => /전원|전부|모두|일괄/.test(b));
    verdict(`${tag} 일괄 단추 없음`, bulk.length === 0, bulk.join(" / "));

    // 🔴 저장 잠금 + 이름 나열
    verdict(
      `${tag} 미채점 ${run.locked}명이면 저장 ${run.locked > 0 ? "잠김" : "열림"}`,
      m.saveDisabled === run.locked > 0,
      `disabled=${m.saveDisabled} · 「${m.status}」`,
    );
    if (run.locked > 0)
      verdict(
        `${tag} 몇 명이 아니라 **이름**을 댄다`,
        m.status.includes("아직 안 본 학생:") && !/\d+명 남/.test(m.status),
        m.status,
      );

    // 🔴 D-30 — 표 행은 누르는 것이 아니다
    verdict(
      `${tag} 표 행에 손가락 커서 없음`,
      m.rowCursor.every((c) => c !== "pointer") && !m.rowHasClick,
      [...new Set(m.rowCursor)].join(","),
    );

    // D-08 — 느낌표·이모지 없음
    verdict(
      `${tag} 느낌표·이모지 없음`,
      !/[!！]/.test(m.text) && !/\p{Extended_Pictographic}/u.test(m.text),
      "",
    );
    verdict(`${tag} 콘솔 오류·경고 0`, errors.length === 0, errors.join(" / "));

    report[tag] = { ...m, errors };
    await page.close();
  }
}

// ── 저장까지 눌러 본다 — 「저장 뒤에 무엇이 뜨나」는 누르지 않으면 못 잰다 ────────────
for (const width of WIDTHS) {
  const tag = `saved-${width}`;
  console.log(`\n${tag}`);
  const { page, errors } = await open(width, "set=marked");
  await page.getByRole("button", { name: "채점 결과 저장" }).click();
  await page.waitForSelector('section[aria-label="채점 결과"]');
  const m = await measure(page);
  await page.screenshot({ path: path.join(OUT, `${tag}.png`), fullPage: true });
  const section = page.locator('section[aria-label="채점 결과"]');
  await section
    .screenshot({ path: path.join(OUT, `${tag}-summary.png`) })
    .catch(() => {});

  const summary = m.summary ?? "";
  verdict(`${tag} 학생별 점수 목록이 뜬다`, summary.includes("김도윤"), "");
  verdict(
    `${tag} 결시는 «결시»로 적힌다 — 0 / 8 이 아니다`,
    summary.includes("결시") && !summary.includes("0 / 8"),
    summary.replace(/\n/g, " | "),
  );
  // 🔴 23 §4 ① — 8문항 한 회차의 단원·난이도 통계는 여기서 안 그린다
  verdict(
    `${tag} 단원·정답률·난이도 축이 **없다**`,
    !/단원|정답률|난이도/.test(summary),
    summary.replace(/\n/g, " | "),
  );
  verdict(
    `${tag} 채점 지면이 가로로 안 넘친다`,
    m.mainOverflow !== null && m.mainOverflow <= 1,
    `main ${m.mainOverflow}px (참고 — 문서 ${m.pageOverflow}px)`,
  );
  verdict(`${tag} 콘솔 오류·경고 0`, errors.length === 0, errors.join(" / "));
  report[tag] = { ...m, errors };
  await page.close();
}

fs.writeFileSync(
  path.join(OUT, "layout.json"),
  JSON.stringify(report, null, 2),
  "utf8",
);
await browser.close();
console.log(`\n${bad === 0 ? "전부 통과" : `🔴 빨강 ${bad}`} · 캡처 ${OUT}`);
process.exitCode = bad === 0 ? 0 : 1;
