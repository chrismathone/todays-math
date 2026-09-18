/**
 * `/dev/report-hifi` — 학부모 A4 를 **인쇄 PDF 로 떠서 1쪽인지 잰다** (Hi-fi 브리프 §2 규칙 1·2 · §4-2).
 *
 *   npx next dev --port 3117                 # 먼저 띄운다(워크트리의 .env)
 *   node scratch/shot-report-hifi.mjs        # PDF · 원장 화면 캡처 · 계측 json
 *   python scratch/report-hifi-bw.py         # PDF → 쪽수 표 · 흑백 PNG
 *
 * 조건은 **크롬 인쇄 기본값** — «배경 그래픽» 꺼짐(`printBackground: false`) · A4 · 여백 0(@page).
 * 5안 × ⓐ실데이터/ⓑ예시 = PDF 10장. 덤으로 `?month=2026-07`(소단원 21 — 이 DB 에서 가장 두꺼운 달)
 * ⓐ 5장을 더 뜬다(넘칠 때 접히는지 보려고).
 *
 * 지면마다 재는 것(실물 브라우저의 계산된 스타일 — jsdom 은 못 잰다):
 *   · 접힘 상태(`data-fold`) · 내용 높이(px) vs A4 1122.5px
 *   · 🔴 **지면 안 글자의 최소 크기** — 9pt(12px) 미만이면 규칙 위반
 *   · 🔴 **배경색으로 그린 요소** — 배경 인쇄 꺼짐에서 종이에서 사라지는 것
 *   · 말줄임(`text-overflow: ellipsis`)이 걸린 요소
 */
import { mkdirSync, writeFileSync } from "node:fs";

import { chromium } from "@playwright/test";

const OUT = "scratch/report-hifi";
const BASE = process.env.HIFI_URL ?? "http://localhost:3117/dev/report-hifi";
const VARIANTS = ["H1", "H2", "H3", "H4", "H5"];
const LABEL = {
  H1: "H1 기준",
  H2: "H2 두 열",
  H3: "H3 난이도 먼저",
  H4: "H4 같은 눈금 막대",
  H5: "H5 화면 얼굴",
};

mkdirSync(`${OUT}/pdf`, { recursive: true });
mkdirSync(`${OUT}/screen`, { recursive: true });

const browser = await chromium.launch();
const errors = [];
const results = [];

async function open(page, url) {
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(url, { waitUntil: "networkidle", timeout: 240_000 });
  await page.evaluate(() => document.fonts.ready);
}

/** 지면이 다 재어질 때까지(`data-fold` 가 measuring 이 아닐 때까지) 기다린다. */
async function settled(page) {
  await page.waitForFunction(
    () =>
      document.querySelector('[data-testid="parent-sheet"]')?.dataset.fold !==
      "measuring",
    null,
    { timeout: 30_000 },
  );
  await page.evaluate(() => document.fonts.ready);
}

async function measureSheet(page) {
  return page.evaluate(() => {
    const sheet = document.querySelector('[data-testid="parent-sheet"]');
    const inner = sheet.firstElementChild;
    const cs = getComputedStyle(sheet);
    // ParentSheet 의 naturalHeight 와 같은 식 — 늘어난 틀이 아니라 내용의 제 키
    const footer = inner.lastElementChild;
    const last = footer.previousElementSibling;
    const gap = parseFloat(getComputedStyle(inner).rowGap) || 0;
    const height =
      last.getBoundingClientRect().bottom -
      inner.getBoundingClientRect().top +
      gap +
      footer.getBoundingClientRect().height +
      parseFloat(cs.paddingTop) +
      parseFloat(cs.paddingBottom);
    let minFont = Infinity;
    let minFontText = "";
    const backgrounds = [];
    const ellipsis = [];
    for (const el of [sheet, ...sheet.querySelectorAll("*")]) {
      const s = getComputedStyle(el);
      if (s.display === "none" || s.visibility === "hidden") continue;
      const ownText = [...el.childNodes]
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent.trim())
        .join("");
      if (ownText && el.closest('[aria-hidden="true"]') === null) {
        const size = parseFloat(s.fontSize);
        if (size < minFont) {
          minFont = size;
          minFontText = ownText.slice(0, 30);
        }
      }
      const bg = s.backgroundColor;
      if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent")
        backgrounds.push(
          `${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]} ${bg}`,
        );
      if (s.textOverflow === "ellipsis") ellipsis.push(el.tagName);
    }
    return {
      fold: sheet.dataset.fold,
      heightPx: Math.round(height * 10) / 10,
      a4Px: Math.round(((297 * 96) / 25.4) * 10) / 10,
      minFontPx: minFont,
      minFontText,
      backgrounds,
      ellipsis,
    };
  });
}

async function run(tag, url, modes) {
  const page = await browser.newPage({
    viewport: { width: 1400, height: 1000 },
  });
  await open(page, url);
  for (const [modeName, modeLabel] of modes) {
    await page.getByRole("button", { name: modeLabel }).click();
    for (const v of VARIANTS) {
      await page.getByRole("button", { name: LABEL[v] }).click();
      await settled(page);
      const m = await measureSheet(page);
      const file = `${OUT}/pdf/${tag}-${modeName}-${v}.pdf`;
      await page.pdf({ path: file, format: "A4", printBackground: false });
      results.push({ tag, mode: modeName, variant: v, file, ...m });
      console.log(
        `  ${tag} ${modeName} ${v} · 접힘 ${m.fold} · 높이 ${m.heightPx}/${m.a4Px}px · 최소 글자 ${m.minFontPx}px («${m.minFontText}») · 배경 ${m.backgrounds.length} · 말줄임 ${m.ellipsis.length}`,
      );
      // 화면의 A4 (색 · 배경 켜짐) — 흑백 PDF 와 나란히 보려고
      await page
        .getByTestId("parent-sheet")
        .screenshot({ path: `${OUT}/screen/${tag}-${modeName}-${v}.png` });
    }
  }
  return page;
}

const MODES = [
  ["a-real", "ⓐ 실데이터"],
  ["b-example", "ⓑ 다 찬 달(예시)"],
];

// ① 기본(지난달) — 5안 × ⓐⓑ
const page = await run("aug", BASE, MODES);
const head = await page.evaluate(() =>
  document.body.innerText.split("\n").slice(0, 4).join(" | "),
);
console.log("머리:", head.replace(/\s+/g, " ").slice(0, 400));

// ② 원장 화면 — 넓은 폭(ⓐ·ⓑ) · 휴대폰 폭 390(ⓐ·ⓑ)
for (const [modeName, modeLabel] of MODES) {
  await page.getByRole("button", { name: modeLabel }).click();
  await page.getByRole("button", { name: LABEL.H1 }).click();
  await settled(page);
  await page
    .getByTestId("director-screen")
    .screenshot({ path: `${OUT}/director-wide-${modeName}.png` });
}
await page.close();

const phone = await browser.newPage({ viewport: { width: 390, height: 900 } });
await open(phone, BASE);
for (const [modeName, modeLabel] of MODES) {
  await phone.getByRole("button", { name: modeLabel }).click();
  await settled(phone);
  const box = await phone.evaluate(() => ({
    overflowX:
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
    doc: document.documentElement.scrollHeight,
  }));
  console.log(
    `  phone ${modeName} · 문서 ${box.doc}px${box.overflowX ? " · 🔴 가로 스크롤" : " · 가로 스크롤 0"}`,
  );
  results.push({ tag: "phone", mode: modeName, ...box });
  await phone
    .getByTestId("director-screen")
    .screenshot({ path: `${OUT}/director-phone-${modeName}.png` });
}
await phone.close();

// ③ 덤 — 이 DB 에서 가장 두꺼운 달(2026-07, 소단원 21)
const july = await run("jul", `${BASE}?month=2026-07`, [MODES[0], MODES[1]]);
await july.close();

writeFileSync(`${OUT}/measure.json`, JSON.stringify(results, null, 2));
console.log("오류:", errors.length ? errors.join(" | ") : "없음");
await browser.close();
