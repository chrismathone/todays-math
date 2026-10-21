// 개념 탐험 문항을 «맞게» 푸는 간단한 판정기 — 화면의 글에서 답을 셈해 고른다(흐름 관찰용, 초5 범위만).
import { chromium } from "@playwright/test";
import { resolve } from "node:path";

const max = Number(process.argv[2] ?? 20);
const prefix = process.argv[3] ?? "solve";
const browser = await chromium.connectOverCDP("http://127.0.0.1:9333");
const page = browser.contexts()[0].pages().find((p) => p.url().includes("localhost:4321"));
page.setDefaultTimeout(8000);
const log = [];

// 화면 글에서 «식 → 값» 쌍을 셈한다
const roundTo = (n, place, mode) => {
  const f = mode === "up" ? Math.ceil : mode === "down" ? Math.floor : Math.round;
  return f(n / place) * place;
};
function truth(stmt) {
  const s = stmt.replace(/\s+/g, "");
  let m = s.match(/^(\d+(?:\.\d+)?)×(\d+(?:\.\d+)?)=(\d+(?:\.\d+)?)/);
  if (m) return Math.abs(Number(m[1]) * Number(m[2]) - Number(m[3])) < 1e-9;
  return null;
}
for (let i = 0; i < max; i++) {
  await page.waitForTimeout(900);
  const main = (await page.locator("main").first().innerText().catch(() => "")).replace(/\s+/g, " ");
  log.push(`#${i} ${main.slice(0, 200)}`);
  await page.screenshot({ path: resolve(".qa-artifacts/srs-e5/shots", `${prefix}-${String(i).padStart(2, "0")}.png`) });
  const btns = page.locator("main button:visible");
  const texts = (await btns.allInnerTexts()).map((t) => t.replace(/\s+/g, " ").trim());
  const go = texts.findIndex((t) => /뜻을 가리고 도전하기|다음 활동|이어서|계속|돌아가기|진도판으로/.test(t) && !/^진도판$/.test(t));
  if (go >= 0) {
    await btns.nth(go).click();
    continue;
  }
  const opts = texts.map((t, k) => ({ t, k })).filter((o) => /^\d /.test(o.t));
  if (!opts.length) {
    log.push(`   멈춤 — ${texts.join(" | ")}`);
    break;
  }
  // 경계 살피기(맞다/아니다): 식이 있으면 셈, 없으면 «맞다»
  if (opts.some((o) => /맞다|아니다/.test(o.t))) {
    const stmt = main.match(/경계 살피기 (.*?) 하나를 고르면/)?.[1] ?? "";
    let ok = truth(stmt.replace(/은|는/g, "=").replace(/이다\.?$/, ""));
    if (ok === null) ok = !/미만에는.*포함된다|초과에는.*포함된다|30을 십의 자리까지 올림하면 40/.test(stmt);
    const want = ok ? "맞다" : "아니다";
    await btns.nth(opts.find((o) => o.t.includes(want)).k).click();
    continue;
  }
  // 예 모으기: 식이면 셈해서 참인 것 모두
  const evals = opts.map((o) => ({ ...o, v: truth(o.t.replace(/^\d /, "").split(" ").slice(0, 5).join("")) }));
  if (evals.some((e) => e.v !== null)) {
    for (const e of evals) if (e.v) await btns.nth(e.k).click();
  } else {
    await btns.nth(opts[0].k).click();
    if (texts.some((t) => /두 개를 순서대로/.test(main))) await btns.nth(opts[1].k).click();
  }
  const confirm = texts.findIndex((t) => /확인하기/.test(t));
  if (confirm >= 0) await btns.nth(confirm).click().catch(() => {});
}
console.log(log.join("\n"));
await browser.close().catch(() => {});
