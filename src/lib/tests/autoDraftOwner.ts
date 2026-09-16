/**
 * 자동 초안의 **소유자** — 계정 하나다 (D-129 ⑶).
 *
 * cron 에는 세션이 없다. 그런데 `generateDraftTest` 는 소유권 검증·최근 출제 제외(D-20)·
 * 시험지의 `user_id` 에 **원장 계정**을 쓴다. 그 계정을 여기 한 곳에서 정한다 —
 * 라우트마다 이메일을 견주면 두 벌이 된다(`src/lib/eywa/owner.ts` 와 같은 결).
 *
 * 🔴 **못 찾으면 조용히 0건이 아니라 오류다.** 빈 값을 「전부」나 「아무나」로 읽으면
 *    환경변수 하나 빠진 날 배치가 매일 「0건 성공」을 찍고, 원장님은 **시험지가 안 서는
 *    까닭을 어디서도 못 본다**(관례: `syncScope.ts` — 설정했는데 하나도 안 남으면 멈춘다).
 *
 * ⚠️ `EYWA_SYNC_OWNER_EMAIL` 을 **재활용하지 않는다.** eywa 연계는 이번 트랙에서 보류이고
 *    (D-129 ⑸) 그 env 는 연계를 끄면 지워질 값이다 — 자동 출제가 거기 매달리면 eywa 를
 *    끄는 날 자동 출제가 같이 죽는다.
 */
import type { PrismaClient } from "@prisma/client";

import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/session";

export type AutoDraftOwnerResult =
  { ok: true; owner: SessionUser } | { ok: false; message: string };

export async function resolveAutoDraftOwner(
  client: Pick<PrismaClient, "user"> = db,
): Promise<AutoDraftOwnerResult> {
  const email = (process.env.AUTO_DRAFT_OWNER_EMAIL ?? "").trim().toLowerCase();
  if (!email)
    return {
      ok: false,
      message:
        "AUTO_DRAFT_OWNER_EMAIL 이 설정되지 않았습니다. 자동 출제를 돌릴 원장 계정을 지정해야 합니다.",
    };

  const user = await client.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      isAdmin: true,
      deletedAt: true,
    },
  });
  if (!user || user.deletedAt !== null)
    return {
      ok: false,
      message: `AUTO_DRAFT_OWNER_EMAIL 의 계정을 찾을 수 없습니다: ${email}`,
    };

  return {
    ok: true,
    // 관리자면 전 반을 돈다(D-130 ⑸) — 판정은 `ownerScope.ts` 한 곳, 여기서는 표시만 싣는다
    owner: {
      id: user.id,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin === true,
    },
  };
}
