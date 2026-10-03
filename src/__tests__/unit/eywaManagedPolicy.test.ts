import { describe, expect, it } from "vitest";
import {
  candidateProblem,
  controlOrderError,
  leaseExpiry,
  managedBlockReasons,
} from "@/lib/eywa/managedPolicy";
import {
  controlSchema,
  controlUserSchema,
  signAssertion,
  verifyAssertion,
  signedHeaders,
  verifySignedRequest,
  validateCompleteSnapshot,
  sha256,
  type BindingConfig,
  type Manifest,
} from "@/lib/eywa/sync-contract";
import type { User } from "@prisma/client";
const id = (n: number) =>
  `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const config: BindingConfig = {
  bindingId: id(1),
  tenantId: id(2),
  targetBranchId: id(3),
  sourceBaseUrl: "http://localhost:3000",
  targetBaseUrl: "http://localhost:3001",
  keyId: "fixture",
  controlSecret: "c".repeat(32),
  webhookSecret: "w".repeat(32),
  ssoSecret: "s".repeat(32),
};
const now = Date.parse("2026-10-03T12:00:00Z");
const source = controlUserSchema.parse({
  id: id(4),
  email: "teacher@example.test",
  name: "Teacher",
  status: "active",
  role: "teacher",
  subjects: ["math"],
  eligible: true,
  blockReasons: [],
  accountRevocationGeneration: "9",
  classListRevision: "11",
  classes: [],
});
const control = controlSchema.parse({
  schemaVersion: 2,
  bindingId: id(1),
  tenantId: id(2),
  targetBranchId: id(3),
  sourceEpoch: id(5),
  securityRevision: "12",
  tenantRevocationGeneration: "7",
  enabled: true,
  mode: "active",
  validatedAt: new Date(now).toISOString(),
  nextEffectiveAt: null,
  healthy: true,
  users: [source],
});
const user = {
  id: id(6),
  email: source.email,
  name: source.name,
  passwordHash: "hash",
  authSource: "local",
  isAdmin: false,
  isSuperAdmin: false,
  branchRole: "teacher",
  approvalStatus: "approved",
  deletedAt: null,
  suspendedAt: null,
  manualSuspendedAt: null,
  eywaUserId: null,
  updatedAt: new Date(now),
  branchId: id(3),
} as User;
describe("managed receiver trust decisions", () => {
  it("never grants the source clock or a delayed response extra lease time", () => {
    expect(leaseExpiry(control, now - 15_000).getTime()).toBe(now + 45_000);
    expect(
      leaseExpiry(
        { ...control, validatedAt: new Date(now - 30_000).toISOString() },
        now,
      ).getTime(),
    ).toBe(now + 30_000);
    expect(
      leaseExpiry(
        { ...control, nextEffectiveAt: new Date(now + 1).toISOString() },
        now,
      ).getTime(),
    ).toBe(now + 1);
  });
  it("OFF and removal block even if stale profile fields would fail matching", () => {
    expect(
      managedBlockReasons({ ...control, enabled: false }, undefined),
    ).toEqual(["tenant_disabled", "source_removed"]);
    expect(
      managedBlockReasons(control, {
        ...source,
        eligible: false,
        blockReasons: ["staff_inactive"],
      }),
    ).toEqual(["staff_inactive"]);
  });
  it("matches only normal approved owners and does not approve pending/protected accounts", () => {
    expect(candidateProblem(source, user)).toBeNull();
    for (const changed of [
      { approvalStatus: "pending" },
      { deletedAt: new Date() },
      { manualSuspendedAt: new Date() },
      { suspendedAt: new Date() },
    ])
      expect(candidateProblem(source, { ...user, ...changed } as User)).toBe(
        "local_account_blocked",
      );
    expect(candidateProblem(source, { ...user, isSuperAdmin: true })).toBe(
      "protected_account",
    );
    expect(candidateProblem(source, { ...user, isAdmin: true })).toBe(
      "protected_account",
    );
    expect(candidateProblem(source, { ...user, name: "Someone else" })).toBe(
      "name_mismatch",
    );
    expect(candidateProblem(source, { ...user, eywaUserId: id(99) })).toBe(
      "identity_conflict",
    );
  });
  it("treats fresh revision regression and epoch change as rebaseline failures", () => {
    const binding = {
      sourceEpoch: control.sourceEpoch,
      securityRevision: BigInt(13),
      tenantRevocationGeneration: BigInt(7),
    };
    expect(controlOrderError(binding, control)).toBe(
      "source_rebaseline_required",
    );
    expect(
      controlOrderError({ ...binding, sourceEpoch: id(80) }, control),
    ).toBe("source_epoch_changed");
  });
  it("signs the original query string and rejects cross binding, replay windows and bodies", () => {
    const path = "/api/integrations/eywa/v2/events?bindingId=" + id(1);
    const body = '{"safe":true}';
    const headers = signedHeaders(
      config,
      "webhook",
      "POST",
      path,
      body,
      now,
      id(9),
    );
    const request = new Request(config.targetBaseUrl + path, {
      method: "POST",
      headers,
    });
    expect(
      verifySignedRequest(request, body, [config], "webhook", now).config
        .bindingId,
    ).toBe(id(1));
    expect(() =>
      verifySignedRequest(request, body + " ", [config], "webhook", now),
    ).toThrow();
    expect(() =>
      verifySignedRequest(request, body, [config], "webhook", now + 60_001),
    ).toThrow();
    expect(() =>
      verifySignedRequest(
        request,
        body,
        [{ ...config, bindingId: id(8) }],
        "webhook",
        now,
      ),
    ).toThrow();
  });
  it("assertions are binding-scoped and have no access-expiry clock grace", () => {
    const token = signAssertion(
      {
        iss: "aywa",
        aud: "todays-math",
        bindingId: id(1),
        tenantId: id(2),
        sourceEpoch: id(5),
        sub: id(4),
        email: source.email,
        name: source.name,
        securityRevision: "12",
        tenantRevocationGeneration: "7",
        accountRevocationGeneration: "9",
        iat: now / 1000,
        exp: now / 1000 + 60,
        jti: id(10),
      },
      config,
    );
    expect(verifyAssertion(token, config, now).sub).toBe(id(4));
    expect(() => verifyAssertion(token, config, now + 60_000)).toThrow();
    expect(() =>
      verifyAssertion(token, { ...config, tenantId: id(9) }, now),
    ).toThrow();
  });
  it("only complete, hash-verified snapshots can imply missing rows", () => {
    const json = JSON.stringify([source]);
    const page = {
      snapshotId: id(11),
      bindingId: id(1),
      kind: "staff" as const,
      page: 0,
      json,
      sha256: sha256(json),
    };
    const empty = { total: 0, pages: [] };
    const manifest: Manifest = {
      schemaVersion: 2,
      snapshotId: id(11),
      bindingId: id(1),
      tenantId: id(2),
      targetBranchId: id(3),
      sourceEpoch: id(5),
      securityRevision: "12",
      contentGeneration: "30",
      generatedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + 900000).toISOString(),
      complete: true,
      control,
      collections: {
        staff: {
          total: 1,
          pages: [{ page: 0, count: 1, sha256: page.sha256 }],
        },
        classes: empty,
        memberships: empty,
        students: empty,
        enrollments: empty,
        progress: empty,
      },
    };
    expect(validateCompleteSnapshot(manifest, [page], now).staff).toHaveLength(
      1,
    );
    expect(() => validateCompleteSnapshot(manifest, [], now)).toThrow(
      "snapshot_incomplete",
    );
    expect(() =>
      validateCompleteSnapshot(manifest, [{ ...page, json: "[]" }], now),
    ).toThrow("snapshot_page_mismatch");
    expect(() => validateCompleteSnapshot(manifest, [page, page], now)).toThrow(
      "duplicate_page",
    );
  });
});
