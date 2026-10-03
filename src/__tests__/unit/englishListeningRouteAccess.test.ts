import { describe, expect, it } from "vitest";
import { englishRouteAllowed } from "@/lib/accountRouteAccess";
import { studentGateFor } from "@/lib/studentRouteAccess";

describe("listening route separation", () => {
  it("opens only named teacher methods to the listening grant", () => {
    for (const [method, path] of [
      ["GET", "/api/english/listening/sets"],
      ["POST", "/api/english/listening/sets"],
      ["PATCH", "/api/english/listening/sets/a"],
      ["POST", "/api/english/listening/sets/a/review"],
      ["HEAD", "/api/english/listening/sets/a/media/b"],
      ["POST", "/api/english/listening/sets/a/media/b/chunks"],
      ["POST", "/api/english/listening/assignments/a/release"],
    ]) {
      expect(
        englishRouteAllowed(["english-listening"], method, path),
        path,
      ).toBe(true);
      expect(
        englishRouteAllowed(
          ["english-school", "english-maker", "english-library"],
          method,
          path,
        ),
        path,
      ).toBe(false);
      expect(studentGateFor(false, method, path).kind, path).toBe("forbidden");
    }
    for (const [method, path] of [
      ["DELETE", "/api/english/listening/assignments/a"],
      ["POST", "/api/english/listening/admin"],
      ["GET", "/api/english/learn/listening/a"],
      ["GET", "/api/english/listening/sets/a/raw"],
    ])
      expect(
        englishRouteAllowed(["english-listening"], method, path),
        path,
      ).toBe(false);
  });
  it("opens learner media only after password change and never accepts media writes", () => {
    const media = "/api/english/learn/listening/a/media/b";
    expect(studentGateFor(false, "HEAD", media).kind).toBe("allow");
    expect(studentGateFor(true, "HEAD", media).kind).toBe("forbidden");
    expect(studentGateFor(false, "POST", media).kind).toBe("forbidden");
    expect(studentGateFor(false, "GET", `${media}/original`).kind).toBe(
      "forbidden",
    );
  });
});
