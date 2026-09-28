/**
 * 상자 저장 줄은 학생마다 따로다(05 §8.21 · 2026-09-28 리드 3차 검토) — 로그아웃 · 로그인이
 * 소프트 이동이라 모듈이 살아, 앞 학생의 줄 · 재시도 번호가 새 학생에게 새면 새 학생의 상자를 연다.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  forgetChestSaves,
  keepSaving,
  rememberRetryId,
  retryIdFor,
  saveGeneration,
  savingFor,
} from "@/components/math-explorers/chestSaveLine";
import { postLogin, postLogout } from "@/components/learn/learnApi";

afterEach(() => {
  forgetChestSaves();
  vi.unstubAllGlobals();
});

describe("chest save line", () => {
  it("keeps retry ids and the saving line per student", async () => {
    rememberRetryId("student-a", "u1:2", "req-a");
    expect(retryIdFor("student-a", "u1:2")).toBe("req-a");
    expect(retryIdFor("student-b", "u1:2")).toBeUndefined();

    let finish!: () => void;
    const done = new Promise<void>((resolve) => (finish = resolve));
    keepSaving("student-a", done);
    expect(savingFor("student-a")).toBe(done);
    expect(savingFor("student-b")).toBeNull();
    finish();
    await done;
    await Promise.resolve();
    expect(savingFor("student-a")).toBeNull();
  });

  it.each([
    ["sign-out", () => postLogout()],
    ["sign-in", () => postLogin("id", "pw")],
  ])("forgets the line and the retry ids on %s", async (_, move) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ data: {} }))),
    );
    rememberRetryId("student-a", "u1:2", "req-a");
    keepSaving("student-a", new Promise<void>(() => {}));
    const before = saveGeneration();

    await move().catch(() => undefined);
    expect(retryIdFor("student-a", "u1:2")).toBeUndefined();
    expect(savingFor("student-a")).toBeNull();
    expect(saveGeneration()).toBeGreaterThan(before);
  });
});
