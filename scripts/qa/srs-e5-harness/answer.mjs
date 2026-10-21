// 이 단원(소수 곱셈과 어림)의 개념 카드 정답표로 끝까지 푼다 — 흐름 관찰용.
import { chromium } from "@playwright/test";

const KEY = [
  // [문항을 가르는 글, 고를 보기 글(순서대로)]
  [/소수 자릿수|두 수의 1만큼/, ["소수 자릿수의 합", "소수점"]],
  [/계산이 맞는 것/, ["= 0.48 ", "= 0.06 "]],
  [/0\.2×0\.3은|0\.2 × 0\.3은|0.06이다/, ["맞다"]],
  [/이상은 기준 수를 1/, ["포함하여 큰", "포함하여 작은"]],
  [/5 5 이상인 수/, ["5 5", "7 7"]],
  [/5 5 이상에는/, ["맞다"]],
  [/초과는 기준 수보다 1/, ["큰", "작은"]],
  [/5 5 초과인 수/, ["6 6", "8 8"]],
  [/5 5 미만에는/, ["아니다"]],
  [/아래 숫자가 1이면/, ["5 5 이상", "5 5 미만"]],
  [/일의 자리에서 반올림해/, ["34 → 30", "35 → 40"]],
  [/35 35를 십의 자리까지 반올림/, ["맞다"]],
  [/올림은 1, 버림은/, ["1 1을 올리고", "없앤다"]],
  [/십의 자리까지 올림한 값/, ["31 → 40", "39 → 40"]],
  [/30 30을 십의 자리까지 올림/, ["아니다"]],
];
const max = Number(process.argv[2] ?? 40);
const browser = await chromium.connectOverCDP("http://127.0.0.1:9333");
const page = browser.contexts()[0].pages().find((p) => p.url().includes("localhost:4321"));
page.setDefaultTimeout(8000);
for (let i = 0; i < max; i++) {
  await page.waitForTimeout(2300);
  const main = (await page.locator("main").first().innerText()).replace(/\s+/g, " ");
  const btns = page.locator("main button:visible");
  const texts = (await btns.allInnerTexts()).map((t) => t.replace(/\s+/g, " ").trim());
  const go = texts.findIndex((t) => /뜻을 가리고 도전하기|시작하기|다음 활동/.test(t));
  if (go >= 0) {
    await btns.nth(go).click();
    continue;
  }
  const entry = KEY.find(([re]) => re.test(main));
  if (!entry) {
    console.log("멈춤:", main.slice(0, 300));
    break;
  }
  for (const want of entry[1]) {
    let k = texts.findIndex((t) => /^\d /.test(t) && t.replace(/^\d /, "").startsWith(want));
    if (k < 0) k = texts.findIndex((t) => /^\d /.test(t) && t.includes(want));
    if (k < 0) {
      console.log("보기 없음", want, texts.join(" | "));
      break;
    }
    await btns.nth(k).click();
    await page.waitForTimeout(120);
  }
  const confirm = texts.findIndex((t) => /확인하기/.test(t));
  if (confirm >= 0) await btns.nth(confirm).click().catch(() => {});
  console.log(`#${i}`, main.match(/(\d+ \/ \d+)/)?.[1] ?? "", entry[1].join("·"));
}
await browser.close().catch(() => {});
