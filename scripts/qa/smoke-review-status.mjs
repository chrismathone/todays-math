/**
 * 「승인」이 **진짜로** 되는가 — 실제 로그인 + 실제 라우트.
 *
 * 🔴 단위 시험은 `@/lib/db` 를 통째로 모킹하므로 「격리 벽 확장이 만든 `where` 를
 *    Prisma 가 받아 주는가」라는 축이 아예 없다. 그래서 `findUnique` 에 `AND` 를
 *    씌우던 결함이 관문 전량 초록인 채 production 까지 나갔다
 *    (원장님 2026-08-26 「검수 상태를 바꾸지 못했습니다」).
 *
 * 이 검사는 화면이 하는 그대로 한다: 쿠키를 들고 PATCH 를 친다. 끝나면 **되돌린다.**
 *
 * 쓰기: `node scripts/qa/smoke-review-status.mjs [http://localhost:3188]`
 */
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";

const BASE = process.argv[2] ?? "http://localhost:3188";
const COOKIE = "authjs.session-token";

const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
if (!secret) {
  console.error("🔴 AUTH_SECRET 이 없다 — .env 를 읽고 실행하라");
  process.exit(1);
}

const db = new PrismaClient();
let failures = 0;
const fail = (m) => {
  console.error("🔴", m);
  failures += 1;
};

// 대상: 앱이 볼 수 있고(pool=shared) 지금 «대기» 인 문항 하나.
const target = await db.problem.findFirst({
  where: { pool: "shared", reviewStatus: "pending" },
  select: { id: true, problemCode: true, reviewStatus: true },
});
if (!target) {
  console.error("🔴 «대기» 인 문항이 0건 — 이 검사는 아무것도 증명하지 않는다.");
  await db.$disconnect();
  process.exit(1);
}

const user = await db.user.findFirst({ select: { id: true, role: true, email: true, name: true } });
if (!user) {
  console.error("🔴 사용자가 없다");
  await db.$disconnect();
  process.exit(1);
}

const token = await encode({
  token: { id: user.id, role: user.role, email: user.email, name: user.name },
  secret,
  salt: COOKIE,
});

async function patch(status) {
  const res = await fetch(`${BASE}/api/problems/${target.id}/review-status`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie: `${COOKIE}=${token}` },
    body: JSON.stringify({ reviewStatus: status }),
  });
  const text = await res.text();
  return { status: res.status, text };
}

console.log(`대상: ${target.problemCode} (지금 ${target.reviewStatus}) · ${user.email}`);

// ⑴ 승인
const up = await patch("approved");
if (up.status !== 200) {
  fail(`승인이 ${up.status} — ${up.text.slice(0, 200)}`);
} else {
  console.log("  ✓ 승인 200");
  const row = await db.problem.findUnique({
    where: { id: target.id },
    select: { reviewStatus: true },
  });
  if (row?.reviewStatus !== "approved")
    fail(`200 인데 DB 는 «${row?.reviewStatus}» — 응답과 저장이 갈렸다`);
  else console.log("  ✓ DB 가 실제로 approved");
}

// ⑵ 되돌린다 — 공유 DB 를 어지럽히지 않는다.
const back = await patch(target.reviewStatus);
if (back.status !== 200) fail(`되돌리기가 ${back.status} — ${back.text.slice(0, 200)}`);
else {
  const row = await db.problem.findUnique({
    where: { id: target.id },
    select: { reviewStatus: true },
  });
  if (row?.reviewStatus !== target.reviewStatus)
    fail(`되돌렸는데 «${row?.reviewStatus}» 다`);
  else console.log(`  ✓ ${target.reviewStatus} 로 되돌림`);
}

await db.$disconnect();
if (failures > 0) {
  console.error(`\n🔴 ${failures}건 실패`);
  process.exit(1);
}
console.log("\n✅ 승인이 실제 라우트에서 동작한다");
