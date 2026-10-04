import { describe, expect, it } from "vitest";
import { accountRouteAllowed, englishRouteAllowed } from "@/lib/accountRouteAccess";
import type { AccountAccess } from "@/contracts/accountAccess.contract";
import { studentGateFor } from "@/lib/studentRouteAccess";

describe("listening route separation", () => {
  const materialRoutes = [
    ["GET", "/api/english/listening/sets"],
    ["POST", "/api/english/listening/sets"],
    ["GET", "/api/english/listening/sets/a"],
    ["PATCH", "/api/english/listening/sets/a"],
    ["DELETE", "/api/english/listening/sets/a"],
    ["POST", "/api/english/listening/sets/a/review"],
    ["POST", "/api/english/listening/sets/a/media"],
    ["GET", "/api/english/listening/sets/a/media/b"],
    ["HEAD", "/api/english/listening/sets/a/media/b"],
    ["POST", "/api/english/listening/sets/a/media/b/chunks"],
    ["POST", "/api/english/listening/sets/a/media/b/complete"],
    ["GET", "/english/listening/sets/a/draft-print"],
  ];
  it("declares bank selection, assembly and draft printing at the actual proxy gate", () => {
    const account: AccountAccess = {
      id: "teacher", name: "교사", email: "teacher@example.test",
      role: "director", approvalStatus: "approved", isAdmin: false,
      menus: ["english-bank", "english-listening"],
    };
    const bankRoutes = [
      ["GET", "/api/english/listening/bank"],
      ["GET", "/api/english/listening/references"],
      ["GET", "/api/english/listening/sets/eb4a3b82-1de6-4e2c-96a1-3d8830226ef9/compose-source"],
      ["POST", "/api/english/listening/compose"],
    ];
    for (const [method, path] of [...bankRoutes, ...materialRoutes]) {
      expect(accountRouteAllowed(account, method, path), path).toBe(true);
      expect(accountRouteAllowed({ ...account, approvalStatus: "pending" }, method, path), path).toBe(false);
      expect(accountRouteAllowed({ ...account, menus: [] }, method, path), path).toBe(false);
      expect(studentGateFor(false, method, path).kind, path).toBe(path.startsWith("/api/") ? "forbidden" : "redirect");
    }
    for (const [method, path] of bankRoutes)
      expect(englishRouteAllowed(["english-listening"], method, path), path).toBe(false);
    for (const [method, path] of [...bankRoutes, ...materialRoutes])
      expect(englishRouteAllowed(["english-bank"], method, path), path).toBe(false);
  });
  it("keeps bank material access separate from publication and assignment management", () => {
    for (const [method, path] of materialRoutes)
      expect(englishRouteAllowed(["english-listening"], method, path), path).toBe(true);
    for (const [method, path] of [
      ["GET", "/api/english/listening/classes"],
      ["GET", "/api/english/listening/assignments"],
      ["POST", "/api/english/listening/assignments"],
      ["GET", "/api/english/listening/assignments/a"],
      ["POST", "/api/english/listening/sets/a/publish"],
      ...["targets", "cancel", "release", "broadcast", "retry"].map(action => ["POST", `/api/english/listening/assignments/a/${action}`]),
    ]) {
      expect(englishRouteAllowed(["english-bank"], method, path), path).toBe(false);
      expect(englishRouteAllowed(["english-listening"], method, path), path).toBe(true);
    }
    for (const [method, path] of [
      ["GET", "/api/english/listening/compose"],
      ["POST", "/api/english/listening/sets/a/compose-source"],
      ["PATCH", "/api/english/listening/sets/a/media/b"],
      ["GET", "/api/english/listening/sets/a/media/b/original"],
      ["GET", "/api/english/listening/sets/a/compose-source/raw"],
      ["GET", "/api/english/listening/admin"],
    ]) expect(englishRouteAllowed(["english-bank", "english-listening"], method, path), path).toBe(false);
  });
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
