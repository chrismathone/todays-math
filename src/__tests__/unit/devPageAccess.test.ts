/**
 * `/dev` 화면을 production 에서 누구에게 여는가.
 *
 * 원장님이 **인쇄하시는 컴퓨터가 개발 서버를 띄우는 컴퓨터와 다르다**(2026-08-28).
 * 그래서 `/dev/print-check` 계열은 production 에서도 보여야 하는데, 그렇다고
 * `ENABLE_RENDER_QA=1` 을 켜면 `/dev` 12화면이 **인증 없이** 통째로 열린다
 * (`src/proxy.ts` 가 `/dev/` 를 공개로 둔다). 그래서 로그인한 원장에게만 연다.
 *
 * 🔴 여기서 가장 중요한 시험은 **「안 열리는가」** 쪽이다 —
 *    로그인 안 한 사람 · 검수 계정 · `directorOnly` 를 안 준 화면.
 *    여는 쪽만 시험하면 「누구에게나 열렸다」를 구조적으로 못 본다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let session: unknown = null;

vi.mock("@/lib/auth", () => ({
  auth: () => Promise.resolve(session),
}));

const { devPageVisible } = await import("@/lib/devPageAccess");

/** vitest 가 되돌려 주는 방식으로 바꾼다 — 직접 defineProperty 하면 process.env 가 막는다. */
function setEnv(value: string): void {
  vi.stubEnv("NODE_ENV", value);
}

beforeEach(() => {
  session = null;
  vi.stubEnv("ENABLE_RENDER_QA", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("[/dev 접근] devPageVisible", () => {
  it("개발에서는 로그인 없이도 연다 — 이 화면들의 본래 자리다", async () => {
    setEnv("development");
    expect(await devPageVisible()).toBe(true);
    expect(await devPageVisible({ directorOnly: true })).toBe(true);
  });

  describe("production", () => {
    beforeEach(() => setEnv("production"));

    it("🔴 **로그인 안 했으면 안 연다** — 바깥에서는 그 경로가 없는 것과 같아야 한다", async () => {
      session = null;
      expect(await devPageVisible({ directorOnly: true })).toBe(false);
    });

    it("🔴 **검수 계정에게 안 연다**", async () => {
      session = { user: { role: "reviewer" } };
      expect(await devPageVisible({ directorOnly: true })).toBe(false);
    });

    it("🔴 **`directorOnly` 를 안 준 화면은 원장에게도 안 연다** — 새로 여는 것은 그 인자를 붙인 화면뿐이다", async () => {
      session = { user: { role: "director" } };
      expect(await devPageVisible()).toBe(false);
      expect(await devPageVisible({})).toBe(false);
    });

    it("로그인한 원장에게는 연다", async () => {
      session = { user: { role: "director" } };
      expect(await devPageVisible({ directorOnly: true })).toBe(true);
    });

    it("**`role` 이 없는 세션은 원장으로 본다** — `proxy.ts` 와 같은 규약", async () => {
      // 역할 기능이 나가기 전에 발급된 토큰에는 `role` 이 없다. `=== \"director\"` 로
      // 읽으면 그 토큰을 가진 원장이 자기 서비스에서 잠긴다(프록시 주석과 같은 자리).
      session = { user: {} };
      expect(await devPageVisible({ directorOnly: true })).toBe(true);
      session = { user: { name: "원장" } };
      expect(await devPageVisible({ directorOnly: true })).toBe(true);
    });

    it("`user` 가 없는 세션은 로그인으로 치지 않는다", async () => {
      session = {};
      expect(await devPageVisible({ directorOnly: true })).toBe(false);
    });

    it("`ENABLE_RENDER_QA=1` 은 종전대로 통째로 연다 — 켜는 것은 의도된 선택이다", async () => {
      vi.stubEnv("ENABLE_RENDER_QA", "1");
      session = null;
      expect(await devPageVisible()).toBe(true);
      expect(await devPageVisible({ directorOnly: true })).toBe(true);
    });

    it("`ENABLE_RENDER_QA` 가 `1` 이 아니면 안 켜진다", async () => {
      vi.stubEnv("ENABLE_RENDER_QA", "true");
      session = null;
      expect(await devPageVisible()).toBe(false);
    });
  });
});
