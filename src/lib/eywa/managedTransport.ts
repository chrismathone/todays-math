import "server-only";
import { db } from "@/lib/db";
import { EywaAccessError } from "./managedPolicy";
import { provisionAutomaticBinding } from "./managedProvisioning";
import {
  assertControlBinding,
  controlSchema,
  manifestSchema,
  pageSchema,
  parseBindingConfigs,
  parseAutomaticConfigs,
  resolveBindingConfigs,
  readBoundedBody,
  signedHeaders,
  verifySignedRequest,
  type BindingConfig,
  type SecretPurpose,
} from "./sync-contract";

export function bindingConfigs(id?: string) {
  const manual = parseBindingConfigs(process.env.EYWA_SYNC_BINDINGS_JSON);
  return id === undefined
    ? manual
    : resolveBindingConfigs(
        manual,
        parseAutomaticConfigs(process.env.EYWA_SYNC_AUTO_JSON),
        id,
      );
}
export function bindingConfig(id: string, keyId?: string) {
  const config = bindingConfigs(id).find(
    (c) => c.bindingId === id && (!keyId || c.keyId === keyId),
  );
  if (!config) throw new EywaAccessError("binding_not_configured");
  return config;
}
export async function checkedBinding(config: BindingConfig) {
  const row = await db.eywaBinding.findUnique({
    where: { id: config.bindingId },
  });
  if (
    !row ||
    row.tenantId !== config.tenantId ||
    row.targetBranchId !== config.targetBranchId
  )
    throw new EywaAccessError("binding_mismatch");
  return row;
}
export async function sourceRequest(
  config: BindingConfig,
  purpose: SecretPurpose,
  path: string,
  body?: unknown,
) {
  const raw = body === undefined ? "" : JSON.stringify(body);
  const method = body === undefined ? "GET" : "POST";
  const response = await fetch(new URL(path, config.sourceBaseUrl), {
    method,
    headers: signedHeaders(config, purpose, method, path, raw),
    body: raw || undefined,
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new EywaAccessError("source_unavailable");
  const text = await readBoundedBody(response);
  return JSON.parse(text) as unknown;
}
export async function fetchControl(config: BindingConfig, userId?: string) {
  const started = Date.now();
  const control = controlSchema.parse(
    await sourceRequest(
      config,
      "control",
      "/api/integrations/todays-math/v2/control",
      { bindingId: config.bindingId, ...(userId ? { userId } : {}) },
    ),
  );
  assertControlBinding(control, config);
  if (
    Date.parse(control.validatedAt) > Date.now() + 5000 ||
    (userId && control.users.some((u) => u.id !== userId))
  )
    throw new EywaAccessError("invalid_control");
  return { control, started };
}
export async function fetchSnapshot(config: BindingConfig) {
  const started = Date.now();
  const manifest = manifestSchema.parse(
    await sourceRequest(
      config,
      "control",
      "/api/integrations/todays-math/v2/snapshots",
      { bindingId: config.bindingId },
    ),
  );
  assertControlBinding(manifest.control, config);
  const pages = [];
  for (const [kind, collection] of Object.entries(manifest.collections)) {
    for (const page of collection.pages) {
      pages.push(
        pageSchema.parse(
          await sourceRequest(
            config,
            "control",
            `/api/integrations/todays-math/v2/snapshots/${manifest.snapshotId}?bindingId=${config.bindingId}&kind=${kind}&page=${page.page}`,
          ),
        ),
      );
    }
  }
  return { manifest, pages, started };
}
export async function verifyReceiverRequest(
  request: Request,
  consumeNonce = false,
) {
  const raw = await readBoundedBody(request);
  const verified = verifySignedRequest(
    request,
    raw,
    bindingConfigs(request.headers.get("x-eywa-binding") ?? ""),
    "webhook",
  );
  if (new URL(request.url).origin !== verified.config.targetBaseUrl)
    throw new EywaAccessError("target_origin_mismatch");
  // Only a signed request to the configured receiver may trigger first-time provisioning.
  // Source I/O happens before the short transaction; browser SSO and config lookup stay read-only.
  if (
    verified.config.provision === "automatic" &&
    !(await db.eywaBinding.findUnique({
      where: { id: verified.config.bindingId },
    }))
  ) {
    const fresh = await fetchControl(verified.config);
    await provisionAutomaticBinding(
      verified.config,
      fresh.control,
      fresh.started,
    );
  }
  const binding = await checkedBinding(verified.config);
  if (consumeNonce)
    await db.eywaNonce.create({
      data: {
        bindingId: binding.id,
        nonce: verified.nonce,
        expiresAt: new Date(Date.now() + 120_000),
      },
    });
  return { ...verified, binding, raw };
}
export function receiverFailure(error: unknown) {
  const code =
    error instanceof EywaAccessError
      ? error.code
      : "invalid_or_conflicting_request";
  return Response.json(
    { error: { code } },
    {
      status: code === "source_unavailable" ? 503 : 409,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
