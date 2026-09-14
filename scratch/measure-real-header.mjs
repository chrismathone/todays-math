import { chromium } from "@playwright/test";
const EMAIL = "chrismathone@gmail.com"; // 실제 계정과 같은 길이(22자)로 잰다
const browser = await chromium.launch();
for (const w of [1440, 1280, 1024, 900]) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 } });
  // 세션만 가로채 이메일을 넣는다 — 컴포넌트는 진짜 그대로다.
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: { email: EMAIL } }) }),
  );
  await page.goto("http://localhost:3007/dev/chrome-check", { waitUntil: "networkidle" });
  await page.waitForFunction(() => !!document.querySelector('[data-testid="account-email"]'));
  const r = await page.evaluate(() => {
    const h = document.querySelector("header");
    const tops = new Set();
    for (const c of h.children) tops.add(Math.round(c.getBoundingClientRect().top));
    // 글자를 직접 담은 «잎» 요소가 두 줄 이상 차지하면 그 낱말이 쪼개진 것이다.
    const broken = [];
    for (const el of h.querySelectorAll("a, span, button")) {
      if (el.children.length > 0) continue;              // 잎만 본다
      const t = (el.textContent ?? "").trim();
      if (!t) continue;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      const hgt = el.getBoundingClientRect().height;
      if (el.getClientRects().length > 1 || hgt > fs * 1.6)
        broken.push(`${t.slice(0, 8)}(${Math.round(hgt)}/${Math.round(fs)})`);
    }
    return {
      height: Math.round(h.getBoundingClientRect().height),
      rows: tops.size,
      overflow: h.scrollWidth > h.clientWidth,
      email: !!document.querySelector('[data-testid="account-email"]'),
      broken,
    };
  });
  console.log(`${w}px → 높이 ${String(r.height).padStart(3)}px · 묶음 줄 ${r.rows} · 가로넘침 ${r.overflow} · 이메일 ${r.email} · 단어 쪼개짐 ${r.broken.length ? r.broken.join(",") : "없음"}`);
  await page.close();
}
await browser.close();
