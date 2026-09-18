/**
 * **운영에서 저절로 도는 것** — `vercel.json` 의 cron 목록.
 *
 * ## 왜 있나
 *
 * 원장님 2026-09-16 *「eywa 진도 동기화는 당장에는 하지 말자. 완전 구축 되고 나면 시도해보자」*(22번 문서 · D-129 ⑸).
 * 그런데 그 뒤에도 `vercel.json` 에 eywa 동기화 cron(매일 07:30 KST)이 **그대로 남아** 운영에서 매일 돌았고,
 * 공유 DB 에 `eywa_sync_run` 34행 · eywa 진도 행이 계속 쌓였다(2026-09-18 D-134 세션이 발견).
 * 문서에 «보류»라고 적어도 **설정 한 줄이 이긴다.** 원장님 2026-09-18 *「ewya 동기화 꺼」*.
 *
 * 🔴 다시 켤 때는 이 시험을 **원장님 지시와 함께** 고친다 — 조용히 cron 한 줄을 되살리지 않게.
 *    사람용 「지금 가져오기」(POST /api/eywa-sync)는 원장님이 누를 때만 도는 것이라 여기서 다루지 않는다.
 */
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

interface VercelConfig {
  crons?: { path: string; schedule: string }[];
}

const config = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "vercel.json"), "utf8"),
) as VercelConfig;
const cronPaths = (config.crons ?? []).map((c) => c.path);

describe("vercel.json cron", () => {
  it("eywa 진도 동기화는 운영에서 저절로 돌지 않는다 (D-129 ⑸ 보류 · 원장님 2026-09-18 «꺼»)", () => {
    expect(cronPaths.filter((p) => p.startsWith("/api/eywa-sync"))).toEqual([]);
  });

  it("아침 자동 초안(D-129)은 그대로 돈다 — eywa 를 끄다 같이 지우지 않았다", () => {
    expect(cronPaths).toContain("/api/tests/auto-draft/cron");
  });

  it("cron 이 부르는 경로는 전부 실제 라우트가 있다", () => {
    for (const p of cronPaths)
      expect(
        fs.existsSync(path.join(process.cwd(), "src/app", p, "route.ts")),
        p,
      ).toBe(true);
  });
});
