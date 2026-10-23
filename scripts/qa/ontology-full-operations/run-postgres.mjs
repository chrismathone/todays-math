/** Local-only QA. Requires externally installed embedded-postgres; never reads env. */
import EmbeddedPostgres from "embedded-postgres";
import { randomBytes, createHash } from "node:crypto";
import { createServer } from "node:net";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
const evidence = process.argv[2];
if (!evidence || !path.isAbsolute(evidence))
  throw new Error("Absolute external evidence directory required");
const pointer = path.join(
  tmpdir(),
  `ontology-operations-${createHash("sha256").update(process.cwd()).digest("hex").slice(0, 12)}.json`,
);
const port = await new Promise((resolve, reject) => {
  const s = createServer();
  s.once("error", reject);
  s.listen(0, "127.0.0.1", () => {
    const p = s.address().port;
    s.close(() => resolve(p));
  });
});
const directory = await mkdtemp(path.join(tmpdir(), "ontology-operations-pg-"));
const password = randomBytes(30).toString("hex");
const pg = new EmbeddedPostgres({
  databaseDir: path.join(directory, "data"),
  user: "ontology_qa",
  password,
  port,
  authMethod: "scram-sha-256",
  persistent: true,
  createPostgresUser: false,
  postgresFlags: [
    "-h",
    "127.0.0.1",
    "-c",
    `unix_socket_directories=${directory}`,
  ],
  onLog: () => {},
  onError: () => {},
});
let client,
  started = false,
  exitCode = 1;
const receipt = {
  package: "embedded-postgres@18.1.0-beta.15",
  binaries: "@embedded-postgres/darwin-arm64@18.1.0-beta.16",
  host: "127.0.0.1",
  port,
  temporaryCluster: directory,
  startedAt: new Date().toISOString(),
  testsExitCode: null,
  stopped: false,
};
try {
  await pg.initialise();
  await pg.start();
  started = true;
  client = pg.getPgClient("postgres", "127.0.0.1");
  await client.connect();
  receipt.version = (await client.query("select version() as v")).rows[0].v;
  receipt.pid = Number(
    (await readFile(path.join(directory, "data/postmaster.pid"), "utf8")).split(
      "\n",
    )[0],
  );
  await client.query("CREATE DATABASE ontology_operations_qa");
  await client.end();
  client = pg.getPgClient("ontology_operations_qa", "127.0.0.1");
  await client.connect();
  const baseSchema = path.join(directory, "baseline.prisma");
  await writeFile(
    baseSchema,
    execFileSync("git", [
      "show",
      "34742b2f02456930d911e60a69ee020ccee56d64:prisma/schema.prisma",
    ]),
  );
  const baseDdl = execFileSync(
    process.execPath,
    [
      "node_modules/prisma/build/index.js",
      "migrate",
      "diff",
      "--from-empty",
      "--to-schema-datamodel",
      baseSchema,
      "--script",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  ).toString();
  await client.query(baseDdl);
  const migration = await readFile(
    "prisma/drafts/ontology-full-operations-20261023/draft.sql",
    "utf8",
  );
  await client.query("CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN");
  await client.query(migration);
  receipt.baselineSchemaSha = "34742b2f02456930d911e60a69ee020ccee56d64";
  receipt.draftHash = createHash("sha256").update(migration).digest("hex");
  await client.end();
  client = undefined;
  await writeFile(
    pointer,
    JSON.stringify({
      url: `postgresql://ontology_qa:${password}@127.0.0.1:${port}/ontology_operations_qa`,
      port,
      directory,
    }),
    { mode: 0o600 },
  );
  const args = process.argv.slice(3);
  exitCode = await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        "node_modules/vitest/vitest.mjs",
        "run",
        "--config",
        "scripts/qa/ontology-full-operations/vitest.config.mts",
        ...args,
      ],
      { stdio: "inherit" },
    );
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
  receipt.testsExitCode = exitCode;
} finally {
  if (client) await client.end().catch(() => {});
  if (started) await pg.stop();
  await rm(pointer, { force: true });
  try {
    process.kill(receipt.pid, 0);
    receipt.stopped = false;
  } catch {
    receipt.stopped = true;
  }
  receipt.finishedAt = new Date().toISOString();
  await writeFile(
    path.join(evidence, `postgres-run-${Date.now()}.json`),
    JSON.stringify(receipt, null, 2) + "\n",
  );
  // Local fixture data contains only synthetic rows and may be removed after stop.
  await rm(directory, { recursive: true, force: true });
}
if (!receipt.stopped)
  throw new Error("Local PostgreSQL process exit unverified");
process.exitCode = exitCode;
