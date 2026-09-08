/**
 * 상단 크롬 헤더 실측 — **좁은 창에서 낱말이 쪼개지는가** (UI-01, 읽기 전용).
 *
 *   npm run dev            # 다른 포트면 아래 BASE 를 환경변수로 준다
 *   node scripts/qa/measure-chrome-header.mjs
 *   CHROME_CHECK_BASE=http://localhost:3007 node scripts/qa/measure-chrome-header.mjs
 *
 * ## 🔴 왜 «표본»이 따로 필요한가 — 2026-09-08 에 세 번 틀렸다
 *
 * 헤더의 무게를 만드는 것 셋이 **로그인 뒤에만** 나타난다: `remaining`(남은 작업) ·
 * `extraNav`(전체 표 ⇄) · `AccountBadge` 의 **이메일**. 그래서 시안도 계측도 번번이
 * «가벼운 헤더»를 재고 **틀린 답**을 냈다 — 한 번은 「1024px 에서 80px」이라 보고했는데
 * 실제로는 **123px** 이었다. `/dev/chrome-check` 가 그 셋을 갖춘 헤더를 로그인 없이
 * 그리고, 여기서는 세션만 가로채 이메일을 넣는다(컴포넌트는 진짜 그대로다).
 *
 * ## 🔴 «쪼개짐»을 어떻게 세는가
 *
 * 「가로로 넘쳤는가」로는 못 센다 — 넘치지 않고 **낱말이 세로로 쌓인다**. 그래서
 * **글자를 직접 담은 잎 요소**의 높이를 글꼴 크기와 견준다. 실측 예(고치기 전 1024px):
 * 「오늘의수학」 86px / 글꼴 29px = **세 줄**, 「문제은행」 52/17 = 두 줄.
 *
 * ⚠️ 패딩이 있는 버튼은 1.6배 어림에 걸린다(`전체 표 ⇄` 28/16). **모든 폭에서 같은 값**
 *    이면 줄바꿈이 아니라 패딩이다 — 폭에 따라 커지는 것만 진짜다.
 */
import { chromium } from "@playwright/test";
/** 길이만 맞춘 표본 — 개인 주소를 저장소에 심지 않는다(이메일 길이가 폭을 정한다). */
const EMAIL = "wonjang@todaysmath.kr";
const BASE = process.env.CHROME_CHECK_BASE ?? "http://localhost:3000";
const browser = await chromium.launch();
for (const w of [1440, 1280, 1024, 900]) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 } });
  // 세션만 가로채 이메일을 넣는다 — 컴포넌트는 진짜 그대로다.
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: { email: EMAIL } }) }),
  );
  await page.goto(`${BASE}/dev/chrome-check`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => !!document.querySelector('[data-testid="account-email"]'));
  const r = await page.evaluate(() => {
    const h = document.querySelector("header");
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
      overflow: h.scrollWidth > h.clientWidth,
      email: !!document.querySelector('[data-testid="account-email"]'),
      broken,
    };
  });
  // ⚠️ 「몇 줄인가」는 자식의 top 으로 못 센다 — baseline 정렬이라 한 줄이어도 전부 다르다.
  //    높이가 그 답을 대신한다(80 = 한 줄 · 115 = 두 줄).
  console.log(
    `${w}px → 높이 ${String(r.height).padStart(3)}px · 가로넘침 ${r.overflow} · 이메일 ${r.email} · 쪼개짐 ${r.broken.length ? r.broken.join(",") : "없음"}`,
  );
  await page.close();
}
await browser.close();
