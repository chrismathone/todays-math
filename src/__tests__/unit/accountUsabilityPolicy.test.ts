import { describe, expect, it } from "vitest";
import {
  activationGate,
  pageWindow,
  parseStudentIssueRequest,
  passwordReissueDecision,
  relationReviewLabel,
  restorableIntegrationUser,
  withoutBindingStop,
} from "@/lib/admin/accountUsability";

const binding = { retiredAt: null, sourceEpoch: "epoch-1" };
const control = { enabled: true, healthy: true, sourceEpoch: "epoch-1" };

describe("account usability policy", () => {
  it("rejects disabled source control before any other activation reason", () => {
    expect(activationGate(binding, { ...control, enabled: false }).code).toBe(
      "activation_requires_enabled",
    );
    expect(
      activationGate(
        { ...binding, retiredAt: "2026-10-04T00:00:00.000Z" },
        { ...control, enabled: false },
      ).code,
    ).toBe("activation_requires_healthy_binding");
    expect(activationGate(binding, { ...control, healthy: false }).code).toBe(
      "activation_requires_healthy_binding",
    );
    expect(
      activationGate(binding, { ...control, sourceEpoch: "epoch-2" }).code,
    ).toBe("activation_requires_healthy_binding");
    expect(activationGate(binding, control)).toEqual({ ok: true, code: null });
  });

  it("restores only an integration stop that is still in force", () => {
    const stopped = new Set(["kept"]);
    expect(
      restorableIntegrationUser(
        {
          id: "kept",
          deletedAt: null,
          manualSuspendedAt: null,
          suspendedAt: "2026-10-04T00:00:00.000Z",
        },
        stopped,
      ),
    ).toBe(true);
    expect(
      restorableIntegrationUser(
        {
          id: "kept",
          deletedAt: null,
          manualSuspendedAt: "2026-10-04T00:00:00.000Z",
          suspendedAt: "2026-10-04T00:00:00.000Z",
        },
        stopped,
      ),
    ).toBe(false);
    expect(
      restorableIntegrationUser(
        {
          id: "other",
          deletedAt: null,
          manualSuspendedAt: null,
          suspendedAt: "2026-10-04T00:00:00.000Z",
        },
        stopped,
      ),
    ).toBe(false);
    expect(withoutBindingStop(["binding_inactive", "name_mismatch"])).toEqual([
      "name_mismatch",
    ]);
  });


  it("shares one password decision for source, mapped, deleted and super-admin accounts", () => {
    expect(
      passwordReissueDecision({ authSource: "eywa" }, "x".repeat(40)).code,
    ).toBe("source_auth");
    expect(
      passwordReissueDecision({ mapped: true }, "짧은 근거").code,
    ).toBe("evidence_required");
    const evidence = "x".repeat(30);
    expect(passwordReissueDecision({ mapped: true }, evidence)).toEqual({
      allowed: true,
      evidence,
    });
    expect(passwordReissueDecision({ isSuperAdmin: true }).code).toBe(
      "super_admin",
    );
    expect(
      passwordReissueDecision({ deletedAt: "2026-10-04T00:00:00.000Z" }).code,
    ).toBe("deleted");
    expect(passwordReissueDecision({})).toEqual({
      allowed: true,
      evidence: null,
    });
  });

  it("describes a page window and an unrecorded historical reason", () => {
    expect(pageWindow(2, 30, 45, 15)).toEqual({
      page: 2,
      pageSize: 30,
      total: 45,
      from: 31,
      to: 45,
    });
    expect(pageWindow(1, 30, 0, 0)).toMatchObject({ from: 0, to: 0, total: 0 });
    expect(relationReviewLabel({ bindingId: "b", snapshotId: "s" })).toMatchObject(
      { reason: "사유 미기록", recorded: false, reviewId: null },
    );
    expect(
      relationReviewLabel({
        eventId: "e",
        reason: "관계 충돌",
        reviewId: "r",
        bindingId: "b",
        snapshotId: "s",
      }).recorded,
    ).toBe(true);
  });

  it("treats only a zero-length body as legacy issuance", () => {
    expect(parseStudentIssueRequest("")).toEqual({ kind: "legacy" });
    expect(parseStudentIssueRequest("   ").kind).toBe("malformed");
    expect(parseStudentIssueRequest("{").kind).toBe("malformed");
    expect(parseStudentIssueRequest("[]").kind).toBe("malformed");
    expect(parseStudentIssueRequest('{"studentIds":[]}').kind).toBe("subset");
    expect(parseStudentIssueRequest('{"studentIds":[]}')).toMatchObject({
      studentIds: [],
    });
    const id = "30000000-0000-4000-8000-000000000001";
    expect(parseStudentIssueRequest(JSON.stringify({ studentIds: [id, id] }))).toEqual({
      kind: "subset",
      studentIds: [id],
    });
  });
});
