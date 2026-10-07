// @vitest-environment node
/**
 * cron 문지기의 비교 (`src/lib/cronSecret.ts`) — 같은 것만 통과시키고, 길이가 달라도 던지지 않는다.
 * 세 cron 라우트가 이 함수 하나를 쓴다 — 라우트의 401 · 503 은 `autoDraftCron.test.ts` · `errorLogPurge.test.ts` 가 본다.
 */
import { describe, expect, it } from "vitest";

import { cronSecretMatches } from "@/lib/cronSecret";

const SECRET = "s3cret-value-0123456789";
const request = (authorization?: string) =>
  new Request("http://localhost/api/tests/auto-draft/cron", {
    headers: authorization === undefined ? {} : { authorization },
  });

describe("cronSecretMatches", () => {
  it("`Bearer <시크릿>` 과 글자 그대로 같으면 통과", () => {
    expect(cronSecretMatches(request(`Bearer ${SECRET}`), SECRET)).toBe(true);
  });

  it.each([
    ["머리가 없다", undefined],
    ["빈 값", ""],
    ["Bearer 없이 시크릿만", SECRET],
    ["앞부분만 같다", `Bearer ${SECRET.slice(0, -1)}`],
    ["뒤에 한 글자 더", `Bearer ${SECRET}x`],
    ["대소문자가 다르다", `bearer ${SECRET}`],
    ["다른 시크릿", "Bearer something-else-entirely"],
  ])("🔴 %s → 거절 (던지지 않는다)", (_name, authorization) => {
    expect(cronSecretMatches(request(authorization), SECRET)).toBe(false);
  });
});
