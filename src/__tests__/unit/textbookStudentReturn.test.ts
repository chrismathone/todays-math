import { describe, expect, it } from "vitest";
import {
  normalizeStudentReturnTo,
  studentLoginDestination,
  studentLoginHref,
} from "@/lib/learn/studentReturnTo";
import { studentGateFor, anonymousLearnGate } from "@/lib/studentRouteAccess";

const qr = "/q/abcdefghijklmnopqrst";
describe("student textbook login return", () => {
  it("carries the exact QR through login and compulsory password change", () => {
    expect(normalizeStudentReturnTo(qr)).toBe(qr);
    expect(anonymousLearnGate("GET", qr)).toEqual({
      kind: "redirect",
      to: "/learn/login",
    });
    expect(studentLoginDestination(qr, false)).toBe(qr);
    const password = new URL(
      studentLoginDestination(qr, true),
      "https://school.test",
    );
    expect(password.pathname).toBe("/learn/password");
    expect(
      normalizeStudentReturnTo(password.searchParams.get("returnTo")),
    ).toBe(qr);
    const login = new URL(studentLoginHref(qr), "https://school.test");
    expect(login.searchParams.get("returnTo")).toBe(qr);
  });
  it.each([
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/q/%2f%2fevil.test",
    "/q/abcdefghijklmnopqrst?redirect=https://evil.test",
    "/api/textbook/books",
    "/tests/secret/print",
    "/q/abcdefghijklmnopqrst/../admin",
    [qr],
    null,
  ])("rejects unsafe or teacher destinations %j", (value) => {
    expect(normalizeStudentReturnTo(value)).toBe("/learn");
  });
  it("allows only precise student reads/writes and keeps the password gate", () => {
    expect(studentGateFor(false, "GET", qr)).toEqual({ kind: "allow" });
    expect(studentGateFor(true, "GET", qr)).toEqual({
      kind: "redirect",
      to: "/learn/password",
    });
    expect(studentGateFor(false, "GET", "/api/textbook/books").kind).toBe(
      "forbidden",
    );
    expect(
      studentGateFor(false, "POST", "/api/learn/textbook/q/abc").kind,
    ).toBe("forbidden");
    expect(
      studentGateFor(
        false,
        "GET",
        "/api/learn/textbook/editions/e/concepts/c/attempts",
      ).kind,
    ).toBe("allow");
    expect(
      studentGateFor(
        false,
        "POST",
        "/api/learn/textbook/editions/e/concepts/c/attempts",
      ),
    ).toEqual({ kind: "allow" });
    expect(
      studentGateFor(false, "GET", "/api/learn/textbook/q/abc/assets/a"),
    ).toEqual({ kind: "allow" });
    expect(studentGateFor(false, "GET", "/figures/secret.png").kind).not.toBe(
      "allow",
    );
  });
});
