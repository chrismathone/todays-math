/**
 * 헤더 계정 구역(D-76)을 **실물로** 확인한다 — 진짜 브라우저, 진짜 서버 액션.
 *
 * 🔴 왜 있나: 로그아웃은 **서버 액션**이고, `vitest.setup.ts` 가 그 모듈을 전역
 *    모킹한다(안 그러면 `next/server` 해석이 깨져 AppChrome 을 쓰는 모든 테스트가
 *    적재 단계에서 죽는다). 그래서 **「이 액션이 실제로 로그아웃시키는가」는 단위
 *    테스트가 구조적으로 못 본다.** 이 저장소가 이미 두 번 겪은 자리다
 *    (2026-08-19 모킹한 AI 가 실물에서 죽음 · 2026-08-20 테스트 148파일 초록인데
 *    앱이 안 켜짐). 없는 축은 변이시킬 수도 없으므로, 축을 여기서 만든다.
 *
 * 그리고 계정 이메일은 **클라이언트에서 `/api/auth/session` 을 받아** 그린다.
 * 그래서 curl 로는 구조적으로 안 보인다 — 반드시 실제 브라우저여야 한다.
 *
 *   node scripts/qa/smoke-logout.mjs [포트] [이메일]
 *
 * 비밀번호 없이 확인할 수 있게 세션 쿠키를 `AUTH_SECRET` 으로 **직접 발급**한다
 * (로그인 흐름 자체는 `smoke-role-gate.sh` 가 이미 실물로 지킨다 — 여기서 겹쳐
 * 확인할 필요가 없고, 겹치면 비밀번호가 없을 때 이 검사를 못 돌린다).
 */
import { chromium } from "playwright";
import { encode } from "next-auth/jwt";
import { config } from "dotenv";

config();

const PORT = process.argv[2] ?? "3000";
const EMAIL = process.argv[3] ?? "test_t@osu.com";
const BASE = `http://localhost:${PORT}`;
const COOKIE = "authjs.session-token"; // http(dev) 는 __Secure- 접두사가 없다

let fail = 0;
const ok = (msg) => console.log(`  ✓ ${msg}`);
const bad = (msg) => {
  console.log(`  🔴 ${msg}`);
  fail = 1;
};

const secret = process.env.AUTH_SECRET;
if (!secret) {
  console.error("🔴 AUTH_SECRET 이 없다 (.env)");
  process.exit(1);
}

// 이메일로 실제 사용자 id·역할을 찾는다 — 세션 모양이 로그인 결과와 같아야 한다.
const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();
const user = await prisma.user.findUnique({
  where: { email: EMAIL },
  select: { id: true, email: true, name: true, role: true },
});
await prisma.$disconnect();
if (!user) {
  console.error(`🔴 그런 계정이 없다: ${EMAIL}`);
  process.exit(1);
}

const token = await encode({
  token: { id: user.id, role: user.role, email: user.email, name: user.name },
  secret,
  salt: COOKIE,
});

const browser = await chromium.launch();
const ctx = await browser.newContext();
await ctx.addCookies([
  { name: COOKIE, value: token, domain: "localhost", path: "/", httpOnly: true },
]);
const page = await ctx.newPage();

console.log(`계정 구역 실물 확인 — ${EMAIL} @ ${BASE}`);

// ⚠️ **예열 먼저.** dev 서버의 첫 요청은 그 라우트를 컴파일하느라 15초를 넘길 수 있다.
// 예열 없이 재면 «계정이 안 뜬다» 는 **거짓 경보**가 나온다(실제로 첫 실행에서 났다).
// 이 저장소가 적어 둔 그 자리다 — 거짓 경보는 가드를 끈다(2026-08-20).
await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 120000 });

// ① 메인이 열리는가 (세션이 먹었는가)
const res = await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 60000 });
if (res && res.status() < 400 && !page.url().includes("/login")) {
  ok(`메인이 열린다 (${res.status()})`);
} else {
  bad(`메인이 안 열린다 — status=${res?.status()} url=${page.url()}`);
}

// ② 계정 이메일이 **화면에 보이는가** — 이게 이 기능의 존재 이유다.
try {
  await page.waitForSelector(`[data-testid="account-email"]`, { timeout: 15000 });
  const shown = (await page.textContent(`[data-testid="account-email"]`))?.trim();
  if (shown === EMAIL) ok(`계정이 헤더에 보인다: ${shown}`);
  else bad(`헤더 계정이 다르다 — 보인 값 "${shown}", 기대 "${EMAIL}"`);
} catch {
  bad("계정 이메일이 헤더에 안 뜬다");
}

// ③ 로그아웃 버튼이 있는가
const logout = page.getByRole("button", { name: "로그아웃" });
if (await logout.count()) ok("「로그아웃」 버튼이 있다");
else bad("「로그아웃」 버튼이 없다");

// ④ **실제로 로그아웃되는가** — 서버 액션이 진짜 도는지 보는 유일한 자리다.
await logout.first().click();
await page.waitForURL(/\/login/, { timeout: 20000 }).catch(() => {});
if (page.url().includes("/login")) ok("로그아웃 → 로그인 화면으로 간다");
else bad(`로그아웃 후에도 ${page.url()} 에 남아 있다`);

// ⑤ 세션이 진짜 지워졌는가 (화면 이동만으로는 «쿠키가 남았는지» 를 못 본다)
const after = await ctx.request.get(`${BASE}/api/auth/session`);
const body = await after.text();
if (!body.includes(EMAIL)) ok("세션이 지워졌다");
else bad(`세션이 아직 살아 있다 — ${body}`);

await browser.close();
console.log(fail ? "\n🔴 실패" : "\n🟢 통과");
process.exit(fail);
