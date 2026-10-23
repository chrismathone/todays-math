import { describe, expect, it } from "vitest";
import { spawn, execFileSync } from "node:child_process";
import { once } from "node:events";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { db, fixture } from "./harness";
import { createOntologyPublisher } from "@/lib/math-ontology/publish/service";
import { createOntologyPythonPort } from "@/lib/math-ontology/transport/python";
import { mathOntologyCompileInputSchema } from "@/contracts/mathOntology.contract";
import { verifyOntologyCompiledArtifactForInput } from "@/lib/math-ontology/runtime/compiled";
import { ontologyDigest } from "@/lib/math-ontology/compiler/canonical";
const evidence = "/Users/pss/Desktop/creative/display-survey/consensus/ontology-full-20261023/operations";
const python = "/Users/pss/Desktop/creative/display-survey/consensus/ontology-full-20261023/formal/.venv312/bin/python";
describe("actual durable publisher -> Node signed port -> Python engine", () => {
 it("survives a 65-second controlled post-compile delay beyond request authentication TTL with the actual 300s database lease", async () => {
  const secret = "synthetic-loopback-only-ontology-engine-secret", audience = "synthetic-isolated-operations";
  const child = spawn(python, ["-B", "scripts/qa/ontology-full-operations/delayed-engine.py"], { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"], env: { PATH: process.env.PATH ?? "/usr/bin:/bin", ONTOLOGY_ENGINE_SECRET: secret, ONTOLOGY_ENGINE_AUDIENCE: audience } });
  const started = Date.now(), receipt: Record<string, unknown> = { pid: child.pid, host: "127.0.0.1", controlledDelaySeconds: 65, startedAt: new Date().toISOString(), stopped: false };
  try {
    let output = "";
    const port = await new Promise<number>((resolve, reject) => { child.once("error", reject); child.once("exit", () => reject(new Error("Python fixture stopped before ready"))); child.stdout.on("data", chunk => { output += String(chunk); if (output.includes("\n")) { try { resolve(JSON.parse(output.split("\n")[0]).port); } catch { reject(new Error("Invalid fixture port")); } } }); });
    receipt.port = port;
    const raw = execFileSync(python, ["-B", "-c", "import sys,json;sys.path.insert(0,'scripts/ontology/compiler');from test_compiler import fixture;print(json.dumps(fixture()))"], { cwd: process.cwd(), encoding: "utf8" });
    const input = mathOntologyCompileInputSchema.parse(JSON.parse(raw)), f = await fixture();
    await db.user.update({ where: { id: f.actor.id }, data: { isSuperAdmin: true } });
    const portClient = createOntologyPythonPort({ endpoint: new URL(`http://127.0.0.1:${port}/api/ontology-engine`), audience, secret });
    let suppliedLease = 0;
    const publisher = createOntologyPublisher({ db, engineLockHash: ontologyDigest("isolated-real-http-fixture"), buildInput: async () => input, verifyArtifact: verifyOntologyCompiledArtifactForInput,
      compiler: { async compile(value, job) { suppliedLease = Date.parse(job.expiresAt) - Date.now(); return portClient.compile(value, job); } },
    });
    const queued = await publisher.enqueue(f.actor, "global"), result = await publisher.run(f.actor, queued.jobId);
    receipt.elapsedMilliseconds = Date.now() - started; receipt.suppliedLeaseMilliseconds = suppliedLease; receipt.state = result.state;
    expect(suppliedLease).toBeGreaterThan(290000); expect(Date.now() - started).toBeGreaterThan(65000); expect(result.state).toBe("published");
    expect((await db.ontologyCompileJob.findUniqueOrThrow({ where: { id: queued.jobId } })).state).toBe("published");
  } finally {
    child.kill("SIGTERM"); if (child.exitCode === null && child.signalCode === null) await once(child, "exit");
    try { process.kill(child.pid!, 0); } catch { receipt.stopped = true; }
    receipt.finishedAt = new Date().toISOString(); await writeFile(path.join(evidence, `publisher-python-http-${Date.now()}.json`), JSON.stringify(receipt, null, 2) + "\n");
    expect(receipt.stopped).toBe(true);
  }
 }, 120000);
});
