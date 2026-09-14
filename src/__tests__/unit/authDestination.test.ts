import { describe, expect, it } from "vitest";
import { normalizeCallbackUrl } from "@/lib/callbackUrl";

describe("auth return destinations", () => {
  it.each([
    "/login",
    "/login?callbackUrl=%2Fsignup",
    "/signup/",
    "/%6cogin",
    "/api/auth/signout",
    "/api/studio/problems",
    "//evil.example",
    "https://evil.example",
    "/%invalid",
  ])("rejects auth loops and non-page destinations: %s", (destination) => {
    expect(normalizeCallbackUrl(destination)).toBe("/");
  });

  it.each([
    "/",
    "/#bank",
    "/studio#library",
    "/tests/new?classId=c1",
    "/review",
  ])("retains the internal destination %s", (destination) => {
    expect(normalizeCallbackUrl(destination)).toBe(destination);
  });
});
