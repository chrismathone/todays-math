/** Actual Next/Auth.js HTTP cookie smoke, with a local signed source fixture only.
 * Requires a built receiver and migrated localhost eywa_target_test database.
 * node --conditions=react-server --import tsx scripts/qa/eywa-managed-http-smoke.ts
 */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import path from "node:path";
import { once } from "node:events";
import {
  s256,
  signAssertion,
  signedHeaders,
  verifySignedRequest,
  type BindingConfig,
  type Control,
} from "../../src/lib/eywa/sync-contract";

async function main() {
  const databaseUrl = process.env.EYWA_TEST_DATABASE_URL;
  assert.ok(databaseUrl);
  const database = new URL(databaseUrl);
  assert.ok(
    ["localhost", "127.0.0.1"].includes(database.hostname) &&
      database.pathname === "/eywa_target_test",
  );
  process.env.DATABASE_URL = databaseUrl;
  process.env.DIRECT_URL = databaseUrl;
  const { db } = await import("../../src/lib/db");
  const { applyManagedControl, lockBinding, reconcileManagedAccounts } =
    await import("../../src/lib/eywa/managedAccounts");
  const { hash } = await import("bcryptjs");
  const bindingId = randomUUID(),
    tenantId = randomUUID(),
    branchId = randomUUID(),
    sourceEpoch = randomUUID();
  const firstId = randomUUID(),
    secondId = randomUUID();
  const teacher = (id: string, name: string) => ({
    id,
    email: `${id}@example.test`,
    name,
    status: "active",
    role: "teacher",
    subjects: ["math"],
    eligible: true,
    blockReasons: [],
    accountRevocationGeneration: "0",
    classListRevision: "0",
    classes: [],
  });
  const first = teacher(firstId, "HTTP Managed Teacher"),
    second = teacher(secondId, "HTTP Existing Teacher");
  let control: Control = {
    schemaVersion: 2,
    bindingId,
    tenantId,
    targetBranchId: branchId,
    sourceEpoch,
    securityRevision: "1",
    tenantRevocationGeneration: "0",
    enabled: true,
    mode: "active",
    validatedAt: new Date().toISOString(),
    nextEffectiveAt: null,
    healthy: true,
    users: [first],
  };
  let selected = firstId;
  const codes = new Map<
    string,
    { state: string; challenge: string; subject: string }
  >();
  const source = createServer(async (req, res) => {
    try {
      const url = new URL(req.url!, config.sourceBaseUrl);
      if (url.pathname.endsWith("/authorize")) {
        const code = randomBytes(32).toString("base64url");
        codes.set(code, {
          state: url.searchParams.get("state")!,
          challenge: url.searchParams.get("code_challenge")!,
          subject: selected,
        });
        const callback = new URL(
          "/api/sso/eywa/v2/callback",
          config.targetBaseUrl,
        );
        callback.searchParams.set("code", code);
        callback.searchParams.set("state", url.searchParams.get("state")!);
        callback.searchParams.set("bindingId", bindingId);
        res.writeHead(303, { location: callback.toString() });
        res.end();
        return;
      }
      let raw = "";
      for await (const chunk of req) raw += chunk;
      const request = new Request(url, {
        method: req.method,
        headers: req.headers as Record<string, string>,
      });
      verifySignedRequest(
        request,
        raw,
        [config],
        url.pathname.endsWith("/token") ? "sso" : "control",
      );
      const input = JSON.parse(raw);
      if (url.pathname.endsWith("/control")) {
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            ...control,
            validatedAt: new Date().toISOString(),
            users: input.userId
              ? control.users.filter((u) => u.id === input.userId)
              : control.users,
          }),
        );
        return;
      }
      if (url.pathname.endsWith("/token")) {
        const code = codes.get(input.code);
        assert.ok(code);
        codes.delete(input.code);
        assert.equal(code.state, input.state);
        assert.equal(code.challenge, s256(input.codeVerifier));
        const user = control.users.find((u) => u.id === code.subject);
        assert.ok(control.enabled && user?.eligible);
        const now = Math.floor(Date.now() / 1000);
        const assertion = signAssertion(
          {
            iss: "aywa",
            aud: "todays-math",
            bindingId,
            tenantId,
            sourceEpoch,
            sub: user.id,
            email: user.email,
            name: user.name,
            securityRevision: control.securityRevision,
            tenantRevocationGeneration: control.tenantRevocationGeneration,
            accountRevocationGeneration: user.accountRevocationGeneration,
            iat: now,
            exp: now + 60,
            jti: randomUUID(),
          },
          config,
        );
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ assertion }));
        return;
      }
      res.writeHead(404);
      res.end();
    } catch {
      res.writeHead(403);
      res.end("fixture_denied");
    }
  });
  source.listen(0, "127.0.0.1");
  await once(source, "listening");
  const portProbe = createServer();
  portProbe.listen(0, "127.0.0.1");
  await once(portProbe, "listening");
  const port = (portProbe.address() as { port: number }).port;
  await new Promise<void>((resolve) => portProbe.close(() => resolve()));
  // NextURL canonicalizes all loopback hostnames to localhost.
  const origin = `http://localhost:${port}`;
  const config: BindingConfig = {
    bindingId,
    tenantId,
    targetBranchId: branchId,
    sourceBaseUrl: `http://127.0.0.1:${(source.address() as { port: number }).port}`,
    targetBaseUrl: origin,
    keyId: "http-fixture",
    controlSecret: randomBytes(32).toString("hex"),
    webhookSecret: randomBytes(32).toString("hex"),
    ssoSecret: randomBytes(32).toString("hex"),
  };
  process.env.EYWA_SYNC_BINDINGS_JSON = JSON.stringify([config]);
  await db.branch.create({
    data: { id: branchId, name: "HTTP smoke fixture" },
  });
  await db.eywaBinding.create({
    data: { id: bindingId, tenantId, targetBranchId: branchId, mode: "active" },
  });
  await db.$transaction(async (tx) => {
    const binding = await lockBinding(tx, bindingId);
    await applyManagedControl(tx, binding, control, Date.now());
    await reconcileManagedAccounts(tx, binding, control, Date.now());
  });
  const managed = await db.user.findUniqueOrThrow({
    where: { eywaUserId: firstId },
  });
  const existing = await db.user.create({
    data: {
      email: second.email,
      name: second.name,
      passwordHash: await hash("http-fixture-password", 4),
      approvalStatus: "approved",
    },
  });
  let output = "";
  const target = spawn(
    process.execPath,
    [
      path.join(process.cwd(), "node_modules/next/dist/bin/next"),
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        AUTH_URL: origin,
        NEXTAUTH_URL: origin,
        AUTH_SECRET: randomBytes(32).toString("hex"),
        AUTH_TRUST_HOST: "true",
        NODE_ENV: "production",
        DATABASE_URL: databaseUrl,
        DIRECT_URL: databaseUrl,
        SHARED_FIGURE_ASSETS_EXTERNALIZED: "0",
      },
    },
  );
  target.stdout.on("data", (chunk) => {
    output = (output + chunk).slice(-12000);
  });
  target.stderr.on("data", (chunk) => {
    output = (output + chunk).slice(-12000);
  });
  type Jar = Map<string, string>;
  async function request(url: string, jar: Jar, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    headers.set(
      "cookie",
      [...jar].map(([key, value]) => `${key}=${value}`).join("; "),
    );
    const response = await fetch(url, { ...init, headers, redirect: "manual" });
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(";", 1)[0];
      const cut = pair.indexOf("=");
      if (cut > 0) {
        const key = pair.slice(0, cut),
          value = pair.slice(cut + 1);
        if (value) jar.set(key, value);
        else jar.delete(key);
      }
    }
    return response;
  }
  async function sso(jar: Jar) {
    const start = await request(
      `${origin}/api/sso/eywa/v2/start?bindingId=${bindingId}`,
      jar,
    );
    assert.equal(start.status, 303);
    assert.equal(
      new URL(start.headers.get("location")!).origin,
      config.sourceBaseUrl,
      `SSO start destination: ${new URL(start.headers.get("location")!).pathname}`,
    );
    const authorized = await fetch(start.headers.get("location")!, {
      redirect: "manual",
    });
    assert.equal(authorized.status, 303);
    return request(authorized.headers.get("location")!, jar);
  }
  const session = async (jar: Jar) =>
    (await request(`${origin}/api/auth/session`, jar)).json() as Promise<{
      user?: { id: string };
    } | null>;
  try {
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      if (target.exitCode !== null)
        throw new Error("Next server exited before startup");
      try {
        await fetch(`${origin}/api/auth/csrf`);
        ready = true;
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    assert.ok(ready, "Next startup timed out");
    const jar: Jar = new Map();
    let response = await sso(jar);
    assert.equal(response.status, 303);
    assert.ok(jar.has("authjs.session-token"));
    assert.equal((await session(jar))?.user?.id, managed.id);
    console.log(
      "PASS real callback emits Auth.js session cookie and managed session identity",
    );
    control = {
      ...control,
      users: [first, second],
      securityRevision: "2",
      validatedAt: new Date().toISOString(),
    };
    selected = secondId;
    const candidateJar: Jar = new Map();
    response = await sso(candidateJar);
    assert.ok(
      response.headers
        .get("location")
        ?.includes("/account/eywa-managed?candidate="),
    );
    assert.equal((await session(candidateJar))?.user, undefined);
    const csrfResponse = await request(`${origin}/api/auth/csrf`, candidateJar);
    const csrf = await csrfResponse.json();
    response = await request(
      `${origin}/api/auth/callback/credentials`,
      candidateJar,
      {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          origin,
        },
        body: new URLSearchParams({
          csrfToken: csrf.csrfToken,
          email: existing.email,
          password: "http-fixture-password",
          callbackUrl: `${origin}/account/eywa-managed`,
        }),
      },
    );
    assert.equal(response.status, 302);
    assert.equal((await session(candidateJar))?.user?.id, existing.id);
    const page = await request(`${origin}/account/eywa-managed`, candidateJar);
    assert.equal(page.status, 200);
    assert.ok((await page.text()).includes("HTTP Existing Teacher"));
    const mapping = await db.eywaManagedAccount.findFirstOrThrow({
      where: { bindingId, sourceUserId: secondId },
    });
    response = await request(
      `${origin}/api/account/eywa-managed`,
      candidateJar,
      {
        method: "POST",
        headers: { "content-type": "application/json", origin },
        body: JSON.stringify({
          id: mapping.id,
          version: mapping.candidateVersion,
          password: "http-fixture-password",
        }),
      },
    );
    assert.equal(response.status, 200);
    await sso(candidateJar);
    assert.equal((await session(candidateJar))?.user?.id, existing.id);
    console.log(
      "PASS existing-account candidate routes through real password confirmation then v2 SSO",
    );
    selected = firstId;
    response = await sso(candidateJar);
    assert.ok(
      response.headers.get("location")?.endsWith("/account/eywa-switch"),
    );
    assert.equal((await session(candidateJar))?.user?.id, existing.id);
    response = await request(
      `${origin}/api/sso/eywa/v2/complete`,
      candidateJar,
      {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          origin,
        },
        body: new URLSearchParams({ confirm: "yes" }),
      },
    );
    assert.equal(response.status, 303);
    assert.equal((await session(candidateJar))?.user?.id, managed.id);
    console.log(
      "PASS existing different account requires explicit switch confirmation",
    );
    control = {
      ...control,
      enabled: false,
      securityRevision: "3",
      tenantRevocationGeneration: "1",
      validatedAt: new Date().toISOString(),
    };
    const event = {
      schemaVersion: 2,
      eventId: randomUUID(),
      bindingId,
      tenantId,
      sourceEpoch,
      securityRevision: "3",
      tenantRevocationGeneration: "1",
      occurredAt: new Date().toISOString(),
      kind: "security",
      entityType: "binding",
      entityId: null,
    };
    for (const [route, body] of [
      ["/api/integrations/eywa/v2/events", event],
      ["/api/integrations/eywa/v2/process", { bindingId, limit: 20 }],
    ] as const) {
      const raw = JSON.stringify(body);
      const result = await fetch(origin + route, {
        method: "POST",
        headers: signedHeaders(config, "webhook", "POST", route, raw),
        body: raw,
      });
      assert.equal(result.status, 200);
    }
    assert.equal((await session(jar))?.user, undefined);
    assert.equal((await session(candidateJar))?.user, undefined);
    console.log(
      "PASS signed OFF event/process invalidates existing real session cookies",
    );
  } catch (error) {
    console.error(
      output
        .replaceAll(config.controlSecret, "[redacted]")
        .replaceAll(config.webhookSecret, "[redacted]")
        .replaceAll(config.ssoSecret, "[redacted]"),
    );
    throw error;
  } finally {
    target.kill();
    await new Promise<void>((resolve) => source.close(() => resolve()));
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.stack : "HTTP smoke failed");
  process.exitCode = 1;
});
