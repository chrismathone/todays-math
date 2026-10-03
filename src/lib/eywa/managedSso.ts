import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import {
  applyManagedControl,
  enqueueManagedReconcile,
  lockBinding,
  managedLoginAllowed,
  reconcileManagedAccounts,
} from "./managedAccounts";
import {
  bindingConfig,
  checkedBinding,
  fetchControl,
  sourceRequest,
} from "./managedTransport";
import { EywaAccessError } from "./managedPolicy";
import { provisionAutomaticBinding } from "./managedProvisioning";
import { equalSecret, s256, sha256, verifyAssertion } from "./sync-contract";

export const EYWA_V2_PROVIDER = "eywa-managed";
export const EYWA_V2_COOKIE = "eywa-v2-handshake";
export const EYWA_V2_TICKET = "eywa-v2-ticket";
export const opaque = () => randomBytes(32).toString("base64url");
/** Request-scoped server lookup; expiry evaluation stays outside React render. */
export async function getPendingSsoSwitch(ticket: string | undefined) {
  if (!ticket || !/^[A-Za-z0-9_-]{43}$/.test(ticket)) return null;
  return db.eywaSsoHandoff.findFirst({
    where: {
      id: sha256(ticket),
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { sourceName: true },
  });
}
export function ssoCookie(
  name: string,
  value: string,
  secure: boolean,
  maxAge = 60,
) {
  return {
    name,
    value,
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
export async function beginSso(bindingId: string, origin: string) {
  const config = bindingConfig(bindingId);
  if (origin !== config.targetBaseUrl)
    throw new EywaAccessError("binding_inactive");
  const binding =
    config.provision === "automatic"
      ? await db.eywaBinding.findUnique({ where: { id: bindingId } })
      : await checkedBinding(config);
  if (
    binding &&
    (binding.mode !== "active" ||
      binding.retiredAt ||
      binding.tenantId !== config.tenantId ||
      binding.targetBranchId !== config.targetBranchId)
  )
    throw new EywaAccessError("binding_inactive");
  const state = opaque();
  const verifier = opaque();
  const handle = opaque();
  await db.eywaSsoHandoff.create({
    data: {
      id: sha256(handle),
      bindingId,
      stateHash: sha256(state),
      verifierHash: sha256(verifier),
      expiresAt: new Date(Date.now() + 60_000),
    },
  });
  const url = new URL(
    "/api/connected-apps/todays-math/authorize",
    config.sourceBaseUrl,
  );
  url.searchParams.set("bindingId", bindingId);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", s256(verifier));
  return {
    url,
    cookie: Buffer.from(JSON.stringify({ handle, state, verifier })).toString(
      "base64url",
    ),
  };
}
export async function exchangeSso(input: {
  cookie?: string;
  code: string;
  state: string;
  bindingId: string;
  origin: string;
}) {
  const config = bindingConfig(input.bindingId);
  if (
    config.targetBaseUrl !== input.origin ||
    !input.cookie ||
    !/^[A-Za-z0-9_-]{20,200}$/.test(input.code)
  )
    throw new EywaAccessError("invalid_handshake");
  const values = JSON.parse(
    Buffer.from(input.cookie, "base64url").toString("utf8"),
  ) as Record<string, unknown>;
  if (
    ![values.handle, values.state, values.verifier].every(
      (v) => typeof v === "string" && /^[A-Za-z0-9_-]{43}$/.test(v),
    )
  )
    throw new EywaAccessError("invalid_handshake");
  const handle = values.handle as string;
  const state = values.state as string;
  const verifier = values.verifier as string;
  if (!equalSecret(input.state, state))
    throw new EywaAccessError("state_mismatch");
  const handoff = await db.eywaSsoHandoff.updateMany({
    where: {
      id: sha256(handle),
      bindingId: input.bindingId,
      stateHash: sha256(state),
      verifierHash: sha256(verifier),
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { consumedAt: new Date() },
  });
  if (handoff.count !== 1) throw new EywaAccessError("handshake_replayed");
  const result = (await sourceRequest(
    config,
    "sso",
    "/api/integrations/todays-math/v2/token",
    {
      bindingId: input.bindingId,
      code: input.code,
      state,
      codeVerifier: verifier,
    },
  )) as { assertion?: unknown };
  if (typeof result.assertion !== "string")
    throw new EywaAccessError("invalid_assertion");
  const claims = verifyAssertion(result.assertion, config);
  const missing =
    config.provision === "automatic" &&
    !(await db.eywaBinding.findUnique({ where: { id: config.bindingId } }));
  const { control, started } = await fetchControl(
    config,
    missing ? undefined : claims.sub,
  );
  if (missing) {
    if (
      claims.sourceEpoch !== control.sourceEpoch ||
      claims.tenantRevocationGeneration !== control.tenantRevocationGeneration
    )
      throw new EywaAccessError("assertion_revoked");
    await provisionAutomaticBinding(config, control, started);
  }
  await checkedBinding(config);
  const issue = await db.$transaction(async (tx) => {
    const binding = await lockBinding(tx, config.bindingId);
    const error = await applyManagedControl(
      tx,
      binding,
      control,
      started,
      claims.sub,
    );
    if (!error) await reconcileManagedAccounts(tx, binding, control, started);
    if (!error && missing) await enqueueManagedReconcile(tx, control);
    return error;
  });
  if (issue) throw new EywaAccessError(issue);
  const mapping = await db.eywaManagedAccount.findFirst({
    where: {
      bindingId: config.bindingId,
      sourceUserId: claims.sub,
      status: { not: "ended" },
    },
  });
  if (!mapping) throw new EywaAccessError("mapping_required");
  if (mapping.status !== "confirmed")
    return { candidateId: mapping.id, userId: mapping.userId, ticket: null };
  const ticket = opaque();
  await db.eywaSsoHandoff.create({
    data: {
      id: sha256(ticket),
      bindingId: config.bindingId,
      stateHash: "",
      verifierHash: "",
      assertion: result.assertion,
      keyId: config.keyId,
      sourceUserId: claims.sub,
      sourceName: claims.name.slice(0, 200),
      expiresAt: new Date(claims.exp * 1000),
    },
  });
  return { candidateId: null, userId: mapping.userId, ticket };
}

export async function authorizeManagedSso(ticket: unknown) {
  if (typeof ticket !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(ticket))
    return null;
  try {
    const handoff = await db.eywaSsoHandoff.findUnique({
      where: { id: sha256(ticket) },
    });
    if (
      !handoff?.assertion ||
      !handoff.keyId ||
      handoff.consumedAt ||
      handoff.expiresAt.getTime() <= Date.now()
    )
      return null;
    const config = bindingConfig(handoff.bindingId, handoff.keyId);
    const claims = verifyAssertion(handoff.assertion, config);
    const mapping = await db.eywaManagedAccount.findUnique({
      where: { currentSourceUserId: claims.sub },
    });
    if (
      !mapping?.currentUserId ||
      mapping.bindingId !== claims.bindingId ||
      !(await managedLoginAllowed(mapping.currentUserId, true))
    )
      return null;
    return await db.$transaction(async (tx) => {
      const binding = await lockBinding(tx, claims.bindingId);
      const current = await tx.eywaManagedAccount.findUniqueOrThrow({
        where: { currentSourceUserId: claims.sub },
      });
      if (
        binding.sourceEpoch !== claims.sourceEpoch ||
        current.sourceEpoch !== claims.sourceEpoch ||
        current.blockReasons.length ||
        current.bindingId !== binding.id ||
        current.tenantRevocationGeneration !==
          BigInt(claims.tenantRevocationGeneration) ||
        current.accountRevocationGeneration !==
          BigInt(claims.accountRevocationGeneration) ||
        BigInt(claims.securityRevision) > binding.securityRevision ||
        !binding.enabled ||
        binding.mode !== "active" ||
        !binding.healthy ||
        binding.retiredAt ||
        !current.leaseExpiresAt ||
        current.leaseExpiresAt.getTime() <= Date.now()
      )
        throw new EywaAccessError("assertion_revoked");
      const consumed = await tx.eywaSsoHandoff.updateMany({
        where: {
          id: sha256(ticket),
          consumedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { consumedAt: new Date(), assertion: null },
      });
      if (consumed.count !== 1) throw new EywaAccessError("assertion_replayed");
      await tx.eywaSsoUse.create({
        data: {
          jti: claims.jti,
          bindingId: claims.bindingId,
          sourceUserId: claims.sub,
          expiresAt: new Date(claims.exp * 1000),
        },
      });
      const user = await tx.user.findUniqueOrThrow({
        where: { id: current.currentUserId! },
      });
      if (
        user.deletedAt ||
        user.manualSuspendedAt ||
        user.suspendedAt ||
        user.approvalStatus !== "approved" ||
        user.isSuperAdmin ||
        user.isAdmin
      )
        throw new EywaAccessError("local_account_blocked");
      if (user.authSource !== "eywa" && !user.passwordHash)
        throw new EywaAccessError("local_auth_missing");
      await tx.accountAuditLog.create({
        data: {
          userId: user.id,
          actorId: user.id,
          action: "auth.eywa_managed_login",
          outcome: "success",
          details: { bindingId: binding.id },
        },
      });
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        sessionVersion: user.sessionVersion,
      };
    });
  } catch {
    return null;
  }
}
