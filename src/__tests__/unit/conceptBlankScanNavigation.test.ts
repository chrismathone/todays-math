import { describe, it, expect } from "vitest";
import {
  scanDestination,
  parseScanDestination,
} from "@/lib/concept-blank/scan/navigation";
import {
  normalizeStudentReturnTo,
  studentLoginDestination,
} from "@/lib/learn/studentReturnTo";
const id = "00000000-0000-4000-8000-000000000001";
describe("issued QR survives login without opening arbitrary callbacks", () => {
  it("preserves issue, page, part and submission through first password change", () => {
    const destination = scanDestination({
      p: id,
      page: 3,
      part: "student",
      submission: id,
    });
    expect(normalizeStudentReturnTo(destination)).toBe(destination);
    const password = new URL(
      studentLoginDestination(destination, true),
      "https://example.test",
    );
    expect(password.pathname).toBe("/learn/password");
    expect(
      normalizeStudentReturnTo(password.searchParams.get("returnTo")),
    ).toBe(destination);
    expect(
      parseScanDestination(new URLSearchParams(destination.split("?")[1]))
        ?.page,
    ).toBe(3);
  });
  it.each([
    `https://evil.test/concept-blank/scan?p=${id}`,
    `//evil.test/concept-blank/scan?p=${id}`,
    `/concept-blank/scan?p=${id}&page=0`,
    `/concept-blank/scan?p=${id}&part=other`,
    `/concept-blank/scan?p=${id}&p=${id}`,
    `/concept-blank/scan?p=${id}&next=https://evil.test`,
    `/concept-blank/scan?p=${id}#anything`,
    `/concept-blank/print?p=${id}`,
  ])("rejects %s", (value) =>
    expect(normalizeStudentReturnTo(value)).toBe("/learn"),
  );
});
