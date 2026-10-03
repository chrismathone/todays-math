// @vitest-environment node
import { createHmac, randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { bindingConfig, bindingConfigs } from "@/lib/eywa/managedTransport";
import { assertLegacyTransportAllowed } from "@/lib/eywa/legacyFence";
import { eywaSsoOptionsFromEnv, verifyEywaSsoToken } from "@/lib/eywaSso";
import { parseAutomaticConfigs } from "@/lib/eywa/sync-contract";

const automatic = {
  sourceBaseUrl: "https://eywa.example.test",
  targetBaseUrl: "https://math.example.test",
  keyId: "current",
  controlSecret: "c".repeat(32),
  webhookSecret: "w".repeat(32),
  ssoSecret: "s".repeat(32),
};
afterEach(() => vi.unstubAllEnvs());
describe("automatic target config", () => {
  it("derives stable UUID identities and resolves a rotated key for every consumer", () => {
    const id = randomUUID();
    vi.stubEnv("EYWA_SYNC_BINDINGS_JSON", "");
    vi.stubEnv(
      "EYWA_SYNC_AUTO_JSON",
      JSON.stringify([automatic, { ...automatic, keyId: "previous" }]),
    );
    expect(bindingConfig(id)).toMatchObject({
      bindingId: id,
      tenantId: id,
      targetBranchId: id,
      provision: "automatic",
      keyId: "current",
    });
    expect(bindingConfig(id, "previous").keyId).toBe("previous");
    expect(bindingConfigs(id)).toHaveLength(2);
    expect(bindingConfigs()).toEqual([]);
    expect(() => bindingConfig("untrusted-value")).toThrow(
      "binding_not_configured",
    );
  });
  it("keeps explicit mapping priority and reserves its tenant and branch identities", () => {
    const manual = {
      ...automatic,
      bindingId: randomUUID(),
      tenantId: randomUUID(),
      targetBranchId: randomUUID(),
      keyId: "manual",
    };
    vi.stubEnv("EYWA_SYNC_BINDINGS_JSON", JSON.stringify([manual]));
    vi.stubEnv("EYWA_SYNC_AUTO_JSON", JSON.stringify([automatic]));
    expect(bindingConfig(manual.bindingId)).toEqual(manual);
    expect(() => bindingConfig(manual.bindingId, "current")).toThrow(
      "binding_not_configured",
    );
    expect(() => bindingConfig(manual.tenantId)).toThrow(
      "binding_not_configured",
    );
    expect(() => bindingConfig(manual.targetBranchId)).toThrow(
      "binding_not_configured",
    );
  });
  it("rejects duplicate automatic keys and key rotation across origins", () => {
    expect(() =>
      parseAutomaticConfigs(JSON.stringify([automatic, automatic])),
    ).toThrow("duplicate_automatic_key");
    expect(() =>
      parseAutomaticConfigs(
        JSON.stringify([
          automatic,
          {
            ...automatic,
            keyId: "other",
            sourceBaseUrl: "https://other.example.test",
          },
        ]),
      ),
    ).toThrow("automatic_origin_mismatch");
  });
  it("fences legacy sync and signed legacy SSO even before a dynamic binding exists", () => {
    vi.stubEnv("EYWA_SYNC_BINDINGS_JSON", "");
    vi.stubEnv("EYWA_SYNC_AUTO_JSON", JSON.stringify([automatic]));
    vi.stubEnv("EYWA_SSO_SECRET", "legacy-secret-".repeat(3));
    expect(() => assertLegacyTransportAllowed(randomUUID())).toThrow(
      "legacy_sync_fenced",
    );
    const now = new Date();
    const iat = Math.floor(now.getTime() / 1000);
    const body = Buffer.from(
      JSON.stringify({
        iss: "aywa",
        aud: "todays-math",
        sub: randomUUID(),
        tenantId: randomUUID(),
        email: "teacher@example.test",
        name: "Teacher",
        iat,
        exp: iat + 60,
        jti: randomUUID(),
      }),
    ).toString("base64url");
    const value = `v1.${body}`;
    const token = `${value}.${createHmac("sha256", process.env.EYWA_SSO_SECRET!).update(value).digest("base64url")}`;
    expect(verifyEywaSsoToken(token, eywaSsoOptionsFromEnv(now))).toEqual({
      ok: false,
      reason: "tenant",
    });
    vi.stubEnv("EYWA_SYNC_AUTO_JSON", "");
    expect(verifyEywaSsoToken(token, eywaSsoOptionsFromEnv(now)).ok).toBe(true);
  });
});
