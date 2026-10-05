/**
 * Frozen inventory access for the whole-audio seek ledger (claude share).
 *
 * Everything under the inventory root is READ ONLY here. This module only reads
 * bytes and compares hashes; it never opens a file for writing.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export const PROVIDER = "claude";
export const EXPECTED_SOURCES = 121;
export const EXPECTED_QUESTIONS = 2417;

export const sha256 = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");

export class InventoryError extends Error {}

const fail = (message) => {
  throw new InventoryError(message);
};

/** Reads the inventory bytes once so the hash and the parsed value cannot diverge. */
export function loadInventory(inventoryPath) {
  const bytes = readFileSync(inventoryPath);
  const inventory = JSON.parse(bytes.toString("utf8"));
  if (inventory.schemaVersion !== 1) fail("Unsupported inventory schema");
  if (!Array.isArray(inventory.records)) fail("Inventory has no records");
  return { inventory, inventorySha256: sha256(bytes), inventoryPath };
}

/** The assigned share, in inventory order, with the fixed totals of this task. */
export function assignedRecords(inventory, provider = PROVIDER) {
  const records = inventory.records.filter(
    (record) => record.assignedAgent === provider,
  );
  const seen = new Set();
  for (const record of records) {
    if (seen.has(record.sourceRecordId))
      fail("Duplicate source " + record.sourceRecordId);
    seen.add(record.sourceRecordId);
    if (record.reconstructed)
      fail("Reconstructed source assigned: " + record.sourceRecordId);
    const numbers = new Set();
    const ids = new Set();
    for (const question of record.questions) {
      if (!Number.isInteger(question.sourceNumber) || question.sourceNumber < 1)
        fail("Bad source number in " + record.sourceRecordId);
      if (numbers.has(question.sourceNumber) || ids.has(question.id))
        fail("Duplicate question in " + record.sourceRecordId);
      numbers.add(question.sourceNumber);
      ids.add(question.id);
      if (question.metadata?.sourceRecordId !== record.sourceRecordId)
        fail("Question belongs to another source: " + question.id);
      if (question.metadata?.sourceAudioSha256 !== record.sourceAudioSha256)
        fail("Question audio identity differs: " + question.id);
    }
  }
  return records;
}

export function assertAssignedTotals(records) {
  const questions = records.reduce((n, r) => n + r.questions.length, 0);
  if (records.length !== EXPECTED_SOURCES || questions !== EXPECTED_QUESTIONS)
    fail(
      `Unexpected assigned inventory: ${records.length} sources, ${questions} questions`,
    );
}

/** Hashes one bound input file and refuses a changed one. */
export function readBound(path, expectedSha256, label) {
  const bytes = readFileSync(path);
  const actual = sha256(bytes);
  if (actual !== expectedSha256)
    fail(`${label} changed: ${path} expected ${expectedSha256} got ${actual}`);
  return bytes;
}

/** The live snapshot holds the current official transcript of every set. */
export function loadLiveSnapshot(inventory) {
  const bytes = readBound(
    inventory.liveSnapshotPath,
    inventory.liveSnapshotSha256,
    "Live snapshot",
  );
  const snapshot = JSON.parse(bytes.toString("utf8"));
  const bySet = new Map();
  for (const row of snapshot.snapshots) bySet.set(row.id, row);
  return bySet;
}

/** Official transcript of one inventory record, checked against its question identities. */
export function officialTranscript(record, liveBySet) {
  const row = liveBySet.get(record.setId);
  if (!row) fail("Set missing from live snapshot: " + record.sourceRecordId);
  if (row.revision !== record.revision)
    fail("Live revision differs: " + record.sourceRecordId);
  if (sha256(JSON.stringify(row.document)) !== record.documentSha256)
    fail("Live document differs: " + record.sourceRecordId);
  if (row.document.groups.length !== 1)
    fail("Source is not whole-original: " + record.sourceRecordId);
  const group = row.document.groups[0];
  if (group.id !== record.groupId)
    fail("Group differs: " + record.sourceRecordId);
  const ids = group.questions.map((q) => q.id).join("\n");
  if (ids !== record.questions.map((q) => q.id).join("\n"))
    fail("Question order differs: " + record.sourceRecordId);
  const text = group.transcript?.text;
  if (typeof text !== "string") fail("No transcript: " + record.sourceRecordId);
  return { text, sha256: sha256(Buffer.from(text, "utf8")) };
}
