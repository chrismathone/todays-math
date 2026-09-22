// @vitest-environment node
/**
 * 보관 정리 cron — `GET /api/logs/purge/cron` (원장님 2026-09-22 «90일 — 지난 것은 매일 지운다»).
 * 문지기는 자동 초안 cron(`/api/tests/auto-draft/cron`)과 같다: CRON_SECRET 이 없으면 503, 다르면 401.
 * vercel.json 에 등록돼 있어야 매일 돈다 — 등록을 빠뜨리면 표가 끝없이 자란다(아무도 모른다).
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { GET } from "@/app/api/logs/purge/cron/route";
import { ERROR_LOG_RETENTION_DAYS } from "@/contracts/errorLogValues";
import { db } from "@/lib/db";
import { recordErrorLog } from "@/lib/errorLog/record";
import { prismaTestDouble } from "@/mocks/prismaTestDouble";

const DAY = 24 * 60 * 60 * 1000;
const call = (auth?: string) =>
  GET(
    new Request("https://math.example/api/logs/purge/cron", {
      headers: auth ? { authorization: auth } : {},
    }),
  );

beforeEach(() => vi.stubEnv("CRON_SECRET", "cron-secret-for-test"));
afterEach(() => vi.unstubAllEnvs());

describe("문지기", () => {
  it("시크릿이 env 에 없으면 503 — 잠긴 채로 배포됨", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await call("Bearer anything")).status).toBe(503);
  });
  it("다르면 401 · 아무것도 안 지운다", async () => {
    await recordErrorLog({ source: "server", kind: "api-error" });
    prismaTestDouble.__errorLogRows()[0].createdAt = new Date(0);
    expect((await call("Bearer wrong")).status).toBe(401);
    expect(await db.errorLog.count()).toBe(1);
  });
});

describe(`${ERROR_LOG_RETENTION_DAYS}일 지난 줄만 지운다`, () => {
  it("지운 수와 기준 시각을 돌려준다", async () => {
    await recordErrorLog({ source: "server", kind: "api-error" });
    await recordErrorLog({ source: "server", kind: "api-rejected" });
    const [old] = prismaTestDouble.__errorLogRows();
    old.createdAt = new Date(Date.now() - (ERROR_LOG_RETENTION_DAYS + 1) * DAY);
    const res = await call("Bearer cron-secret-for-test");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted).toBe(1);
    expect(new Date(body.data.cutoff).getTime()).toBeLessThan(
      Date.now() - (ERROR_LOG_RETENTION_DAYS - 1) * DAY,
    );
    expect(await db.errorLog.count()).toBe(1);
  });
});

describe("vercel.json 에 매일 등록돼 있다", () => {
  it("경로가 이 라우트이고 하루 한 번", () => {
    const config = JSON.parse(
      readFileSync(path.join(process.cwd(), "vercel.json"), "utf8"),
    ) as { crons?: { path: string; schedule: string }[] };
    const cron = config.crons?.find((c) => c.path === "/api/logs/purge/cron");
    expect(
      cron,
      "vercel.json crons 에 /api/logs/purge/cron 이 없다",
    ).toBeTruthy();
    // 분 시 * * * — 매일 한 번
    expect(cron!.schedule).toMatch(/^\d{1,2} \d{1,2} \* \* \*$/);
  });
});
