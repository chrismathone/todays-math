/** Input provenance and accounting helpers. No inference and no network. */
import {
  existsSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  realpathSync,
  unlinkSync,
} from "node:fs";
import path from "node:path";
import { hash } from "./scan-cli.mjs";

export function acquireModelRun(root) {
  const file = path.join(root, "model-run.lock.json");
  if (existsSync(file)) {
    const previous = JSON.parse(readFileSync(file));
    try {
      process.kill(previous.pid, 0);
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
      unlinkSync(file);
    }
    if (existsSync(file))
      throw new Error(
        "Another benchmark model run is active; maximum 3 calls total",
      );
  }
  const owner = { pid: process.pid, startedAt: new Date().toISOString() };
  writeFileSync(file, JSON.stringify(owner), { flag: "wx", mode: 0o600 });
  const release = () => {
    if (
      existsSync(file) &&
      readFileSync(file, "utf8") === JSON.stringify(owner)
    )
      unlinkSync(file);
  };
  process.once("exit", release);
  return release;
}

export function freezeInputFiles(root, pages, crops) {
  const all = pages
    .flatMap((p) => Object.values(p.variants))
    .concat(crops.flatMap((p) => Object.values(p.variants).flat()));
  const files = all
    .map((v) => {
      const file = realpathSync(v.file);
      if (!file.startsWith(realpathSync(root) + path.sep))
        throw new Error("Image outside private run directory");
      const sha256 = hash(readFileSync(file));
      if (v.sha256 && sha256 !== v.sha256)
        throw new Error("Image bytes changed: " + path.basename(file));
      return { file, sha256 };
    })
    .sort((a, b) => a.file.localeCompare(b.file));
  const snapshot = { files, fingerprint: hash(files) };
  const target = path.join(root, "input-bytes.json");
  if (
    existsSync(target) &&
    JSON.parse(readFileSync(target)).fingerprint !== snapshot.fingerprint
  )
    throw new Error("Image bytes changed since previous run");
  if (!existsSync(target))
    writeFileSync(target, JSON.stringify(snapshot, null, 2));
  return snapshot;
}

export function assertResultMatches(record, task, plan, screenPlan) {
  for (const k of ["model", "effort", "arm", "variant", "round"])
    if (record[k] !== task[k])
      throw new Error("Result belongs to a different trial");
  if (record.pageId !== task.page.id)
    throw new Error("Result belongs to a different page");
  if (record.planFingerprint === plan.fingerprint) return;
  if (!screenPlan || record.planFingerprint !== screenPlan.fingerprint)
    throw new Error("Unrecognized result plan fingerprint");
  for (const k of [
    "protocolHash",
    "pagesHash",
    "truthHash",
    "cropsHash",
    "prompt",
  ])
    if (screenPlan[k] !== plan[k])
      throw new Error("Screening result inputs differ from finalists");
}

export function recoverCalls(dir, pageId) {
  return readdirSync(dir)
    .filter((f) => new RegExp(`^${pageId}-call\\d+\\.call\\.json$`).test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((f) => {
      const c = JSON.parse(readFileSync(path.join(dir, f)));
      return {
        ms: c.ms,
        apiMs: c.apiMs,
        actualModels: c.actualModels,
        usage: c.usage,
        modelUsage: c.modelUsage,
        cliReportedCostUsd: c.cliReportedCostUsd,
        inputHash: c.inputHash,
        requestHash: c.requestHash,
        log: f,
      };
    });
}

export function inventoryIds(p) {
  return [
    ...p.blanksPerQuestion.flatMap((n, i) =>
      Array.from({ length: n }, (_, j) => `q${i + 1}.b${j + 1}`),
    ),
    ...Array.from(
      { length: p.apply },
      (_, i) => `q${p.blanksPerQuestion.length + i + 1}.answer`,
    ),
  ];
}

export function validateSemanticRuns(records, plan) {
  const expected = new Set(
    plan.models.flatMap((model) =>
      plan.efforts.flatMap((effort) =>
        Array.from(
          { length: plan.rounds },
          (_, i) => `${model}/${effort}/${i + 1}`,
        ),
      ),
    ),
  );
  const cases = new Map(plan.cases.map((c) => [c.id, c]));
  for (const r of records) {
    const key = `${r.model}/${r.effort}/${r.round}`;
    if (!expected.delete(key) || r.planFingerprint !== plan.fingerprint)
      throw new Error("Duplicate/unexpected semantic trial or changed plan");
    const ids = r.data.grades.map((g) => g.id);
    if (new Set(ids).size !== ids.length || ids.some((id) => !cases.has(id)))
      throw new Error("Duplicate/unexpected semantic grade id");
    const actualErrors = plan.cases
      .filter(
        (c) => r.data.grades.find((g) => g.id === c.id)?.label !== c.expected,
      )
      .map((c) => c.id)
      .sort();
    if (
      JSON.stringify(r.errors.map((e) => e.id).sort()) !==
      JSON.stringify(actualErrors)
    )
      throw new Error("Missing semantic grades must remain errors");
  }
  if (expected.size) throw new Error("Semantic matrix incomplete");
}
