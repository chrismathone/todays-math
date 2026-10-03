import { describe, expect, it } from "vitest";
import {
  currentClassGrantAllows,
  enrollmentActive,
  kstRelationshipDay,
  membershipAllows,
} from "@/lib/eywa/relationPolicy";
import { autoDraftClassAllowed } from "@/lib/tests/autoDraftScope";
import { EYWA_SYNC_CLASSES } from "@/lib/eywa/syncScope";

const noon = new Date("2026-10-03T03:00:00Z");
describe("managed relationship time and capability policy", () => {
  it("uses Korea midnight, includes delegation endpoints and honors immediate revocation", () => {
    const membership = {
      startsOn: "2026-10-03",
      endsOn: "2026-10-03",
      revokedAt: null,
      role: "delegate",
      capabilities: [
        "class:read",
        "student:account",
        "test:write",
        "progress:write",
      ],
    };
    expect(kstRelationshipDay(new Date("2026-10-02T15:00:00Z"))).toBe(
      "2026-10-03",
    );
    expect(
      membershipAllows(
        membership,
        "class:read",
        new Date("2026-10-02T14:59:59Z"),
      ),
    ).toBe(false);
    expect(membershipAllows(membership, "class:read", noon)).toBe(true);
    expect(
      membershipAllows(
        membership,
        "class:read",
        new Date("2026-10-03T15:00:00Z"),
      ),
    ).toBe(false);
    expect(
      membershipAllows({ ...membership, revokedAt: noon }, "class:read", noon),
    ).toBe(false);
    expect(membershipAllows(membership, "student:account", noon)).toBe(false);
    expect(membershipAllows(membership, "test:write", noon)).toBe(false);
  });
  it("distinguishes ordinary inclusive withdrawal from exclusive transfer, hold, future and cancellation", () => {
    const enrollment = {
      startsOn: "2026-10-01",
      endsOn: "2026-10-03",
      onHold: false,
      isTransferred: false,
    };
    expect(enrollmentActive(enrollment, "2026-10-03")).toBe(true);
    expect(
      enrollmentActive({ ...enrollment, isTransferred: true }, "2026-10-03"),
    ).toBe(false);
    expect(
      enrollmentActive({ ...enrollment, startsOn: "2026-10-04" }, "2026-10-03"),
    ).toBe(false);
    expect(
      enrollmentActive({ ...enrollment, onHold: true }, "2026-10-03"),
    ).toBe(false);
    expect(
      enrollmentActive({ ...enrollment, onHold: true }, "2026-10-03", true),
    ).toBe(true);
    expect(
      enrollmentActive({ ...enrollment, endedAt: noon }, "2026-10-03"),
    ).toBe(false);
    expect(
      enrollmentActive({ ...enrollment, endsOn: null }, "2026-10-04"),
    ).toBe(true);
  });
  it("requires exact large permission revisions and a nonexpired class grant independently of account lease", () => {
    const grant = {
      id: "c",
      permissionRevision: "9007199254740999",
      capabilities: ["test:read"],
      validUntil: null,
    };
    expect(
      currentClassGrantAllows(
        grant,
        "c",
        BigInt("9007199254740999"),
        "test:read",
        noon,
      ),
    ).toBe(true);
    expect(
      currentClassGrantAllows(
        grant,
        "c",
        BigInt("9007199254740998"),
        "test:read",
        noon,
      ),
    ).toBe(false);
    expect(
      currentClassGrantAllows(
        grant,
        "c",
        BigInt("9007199254741000"),
        "test:read",
        noon,
      ),
    ).toBe(false);
    expect(
      currentClassGrantAllows(
        grant,
        "other",
        BigInt("9007199254740999"),
        "test:read",
        noon,
      ),
    ).toBe(false);
    expect(
      currentClassGrantAllows(
        { ...grant, validUntil: noon.toISOString() },
        "c",
        BigInt("9007199254740999"),
        "test:read",
        noon,
      ),
    ).toBe(false);
  });
  it("keeps manual automation and the explicit two classes without allowing import override expansion", () => {
    expect(autoDraftClassAllowed({ eywaClassId: null })).toBe(true);
    for (const row of EYWA_SYNC_CLASSES)
      expect(autoDraftClassAllowed(row)).toBe(true);
    expect(autoDraftClassAllowed({ eywaClassId: "new-imported-class" })).toBe(
      false,
    );
  });
});
