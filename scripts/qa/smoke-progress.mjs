/**
 * 진도 배선이 **화면 경로에서 실제로 되는가** (2026-08-25).
 *
 * 단위 시험은 순수 함수만 본다. 「반 진도가 없어 출제가 404/400 이 난다」는
 * 라우트·세션·권한을 다 지나야 드러나는 결함이라, 이 저장소가 여러 번 겪은
 * 「함수는 도는데 화면은 그대로」의 자리다. 그래서 **진짜 로그인해서 진짜 API 를 친다.**
 *
 * 쓰는 법 (개발 서버가 떠 있어야 한다):
 *   BASE=http://localhost:3188 AS=test_t@osu.com node scripts/qa/smoke-progress.mjs
 *
 * `AS` 는 **그 반의 주인**이어야 한다 — 아니면 전부 403 이 나고, 403 은
 * 「진도가 없다」와 구분되지 않는다(그래서 반 주인 id 를 먼저 찍는다).
 *
 * 기대(2026-08-25 실측):
 *   · 단체진도반(MS1A)  → default-range 200 · generate 201
 *   · 개별진도반(MS2A)  → default-range 200(data:null) · generate 400 «학생마다 진도가 다릅니다»
 *   · 문항이 없는 단원  → generate 422 INSUFFICIENT_PROBLEMS
 */
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";
import { config } from "dotenv";
config();
const BASE = process.env.BASE ?? "http://localhost:3188";
const COOKIE = "authjs.session-token";
const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
if (!secret) { console.error("🔴 AUTH_SECRET 이 없다"); process.exit(1); }
const prisma = new PrismaClient();
const user = await prisma.user.findUnique({ where: { email: process.env.AS ?? "test_o@osu.com" }, select: { id: true, email: true, name: true, role: true } });
const classes = await prisma.class.findMany({ select: { id: true, name: true, userId: true } });
await prisma.$disconnect();
const token = await encode({ token: { id: user.id, role: user.role, email: user.email, name: user.name }, secret, salt: COOKIE });
const headers = { cookie: `${COOKIE}=${token}`, "content-type": "application/json" };
console.log("반 주인:", [...new Set(classes.map((c) => c.userId))].join(", "), "· 내 id:", user.id);
for (const c of classes) {
  const r = await fetch(`${BASE}/api/tests/default-range?classId=${c.id}`, { headers });
  const body = await r.text();
  console.log(`\n=== ${c.name}`);
  console.log(`  default-range → ${r.status}  ${body.slice(0, 180)}`);
  const g = await fetch(`${BASE}/api/tests/generate`, {
    method: "POST", headers,
    body: JSON.stringify({ classId: c.id, testType: "daily", testDate: "2026-08-25", problemCount: 8,
      difficultyRatio: { 연산: 2, 기본: 2, 응용: 2, 심화: 2 } }),
  });
  const gb = await g.text();
  console.log(`  generate     → ${g.status}  ${gb.slice(0, 260)}`);
}
