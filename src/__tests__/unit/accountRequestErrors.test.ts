import { afterEach, describe, expect, it, vi } from "vitest";
import {
  accountRequest,
  AccountRequestError,
} from "@/components/admin/accountRequests";

afterEach(() => vi.unstubAllGlobals());
describe("account management refusals", () => {
  it("preserves the managed identity restriction without treating it as logout", async () => {
    const message =
      "연동 계정의 소속과 관리 권한은 연결 관리에서 확인해 주세요.";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json(
          {
            error: { code: "ACTION_NOT_ALLOWED", message },
          },
          { status: 403 },
        ),
      ),
    );
    const error = await accountRequest("/api/admin/users/target").catch(
      (cause) => cause,
    );
    expect(error).toBeInstanceOf(AccountRequestError);
    if (!(error instanceof AccountRequestError)) throw error;
    expect(error.message).toBe(message);
    expect(error.requiresLogin).toBe(false);
  });
  it.each([401, 403])(
    "keeps actual authorization recovery for status %i",
    async (status) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          Response.json(
            {
              error: {
                code: status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
                message: "관리자만 사용할 수 있습니다.",
              },
            },
            { status },
          ),
        ),
      );
      const error = await accountRequest("/api/admin/users/target").catch(
        (cause) => cause,
      );
      if (!(error instanceof AccountRequestError)) throw error;
      expect(error.requiresLogin).toBe(true);
    },
  );
});
