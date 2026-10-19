// @vitest-environment node
/**
 * 문제은행 P0 의 새 운영 라우트 셋은 이웃 목록 라우트(`/api/studio/problems`)와 **같은 관문**을 지난다 —
 * 로그인 · 역할(검수 계정은 문제은행 작업실 API 를 못 쓴다) · POST 는 같은 사이트에서만.
 * 관문이 막으면 DB 를 한 번도 읽지 않는다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/session", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { getSessionUser } from "@/lib/session";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { POST as check } from "@/app/api/studio/problems/check/route";
import { POST as slots } from "@/app/api/studio/problems/textbook-slots/route";
import {
  GET as sourcesGET,
  POST as sourcesPOST,
} from "@/app/api/studio/problems/sources/route";
import { bankSourceAvailabilitySchema } from "@/contracts/bankSource.contract";

const ORIGIN = "https://math.example";
const post = (path: string, body: unknown, origin = ORIGIN) =>
  new Request(`${ORIGIN}/api/studio/${path}`, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
const id = crypto.randomUUID();
const routes = [
  ["problems/check", check, { ids: [id] }],
  ["problems/textbook-slots", slots, { sourceIds: [id] }],
  ["problems/sources", sourcesPOST, { view: "available" }],
] as const;

beforeEach(() => {
  vi.stubEnv("AUTH_URL", ORIGIN);
  vi.mocked(getSessionUser).mockResolvedValue({
    id: "owner-17",
    name: "Teacher",
    email: "teacher@example.test",
    isAdmin: false,
  } as never);
  vi.mocked(auth as () => Promise<unknown>).mockResolvedValue({
    user: { id: "owner-17", role: "director" },
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("새 문제은행 라우트의 관문", () => {
  it.each(routes)(
    "%s — 로그인 없으면 401 · 검수 계정 403 · 다른 사이트 403, 그동안 DB 를 안 읽는다",
    async (path, handler, body) => {
      const read = vi.spyOn(db.problem, "findMany");
      const count = vi.spyOn(db.problem, "count");
      vi.mocked(getSessionUser).mockResolvedValueOnce(null);
      expect((await handler(post(path, body))).status).toBe(401);
      vi.mocked(auth as () => Promise<unknown>).mockResolvedValueOnce({
        user: { id: "owner-17", role: "reviewer" },
      });
      expect((await handler(post(path, body))).status).toBe(403);
      expect(
        (await handler(post(path, body, "https://elsewhere.example"))).status,
      ).toBe(403);
      expect(read).not.toHaveBeenCalled();
      expect(count).not.toHaveBeenCalled();
      const allowed = await handler(post(path, body));
      expect(allowed.status).toBe(200);
      expect(allowed.headers.get("Cache-Control")).toContain("no-store");
    },
  );

  it("GET 의 가용량 보기도 같은 관문 뒤에서 계약 꼴로 답한다", async () => {
    const url = `${ORIGIN}/api/studio/problems/sources?view=available&version=1`;
    vi.mocked(getSessionUser).mockResolvedValueOnce(null);
    expect((await sourcesGET(new Request(url))).status).toBe(401);
    const response = await sourcesGET(new Request(url));
    expect(response.status).toBe(200);
    expect(
      bankSourceAvailabilitySchema.safeParse(await response.json()).success,
    ).toBe(true);
  });
});
