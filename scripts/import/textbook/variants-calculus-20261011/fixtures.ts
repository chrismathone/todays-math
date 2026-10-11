/** Read-only packet correspondence; does not assign database IDs or approvals. */
import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import type { TextbookVariantSource } from "../../../../src/lib/import/schoolTextbook/variants";

interface PreparedRecord {
  id: string;
  content: string;
  answer: string;
  solution: string;
  path: string;
}
interface PacketEntry extends PreparedRecord {
  directUseAllowed: boolean;
  reviewStatus: string;
  humanReviewLogs: unknown[];
  questionType: string;
  unit: { id: string };
  calculation: { contentSha256: string };
}

export function recoveredSources(
  packetPath: string,
  preparedPath: string,
): TextbookVariantSource[] {
  const packet = JSON.parse(readFileSync(packetPath, "utf8")) as {
    entries: PacketEntry[];
  };
  const prepared = readFileSync(preparedPath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as PreparedRecord);
  if (packet.entries.length !== 20 || prepared.length !== 20)
    throw new Error("Expected the acquired twenty-question packet");
  const seen = new Set<string>();
  return packet.entries.map((entry) => {
    if (seen.has(entry.id)) throw new Error("Duplicate acquired external ID");
    seen.add(entry.id);
    const row = prepared.find((row) => row.id === entry.id);
    if (
      !row ||
      (["content", "answer", "solution"] as const).some(
        (field) => row[field] !== entry[field],
      )
    )
      throw new Error(`Packet/prepared field mismatch: ${entry.id}`);
    if (
      createHash("sha256").update(row.content).digest("hex") !==
      entry.calculation.contentSha256
    )
      throw new Error(`Packet question digest mismatch: ${entry.id}`);
    if (
      entry.directUseAllowed !== false ||
      entry.reviewStatus !== "pending" ||
      entry.humanReviewLogs.length
    )
      throw new Error("Expected actual unpromoted source state");
    // These are OFFLINE fixture IDs. The root uses the actual loaded DB record instead.
    return {
      id: `offline:${entry.id}`,
      external_id: entry.id,
      source: "school_textbook",
      content: row.content,
      answer: row.answer,
      solution: row.solution,
      question_type: entry.questionType,
      direct_use_allowed: entry.directUseAllowed,
      review_status: entry.reviewStatus,
      origin_problem_id: null,
      unit_id: entry.unit.id,
      source_material_id: null,
      source_file: row.path,
      family_key: null,
      figure_svg: null,
      figure_urls: [],
      figure_dims: [],
      figure_source_mm: [],
      choice_figure_index: [],
      fixture_provenance: {
        preparedSha256: createHash("sha256")
          .update(readFileSync(preparedPath))
          .digest("hex"),
        packetContentSha256: entry.calculation.contentSha256,
      },
    };
  });
}
if (process.argv[1]?.replaceAll("\\", "/").endsWith("/fixtures.ts")) {
  const [packetPath, preparedPath, outputDirectory] = process.argv.slice(2);
  if (!packetPath || !preparedPath || !outputDirectory)
    throw new Error("fixtures.ts packet.json prepared.jsonl output-directory");
  mkdirSync(resolve(outputDirectory), { recursive: true });
  writeFileSync(
    join(resolve(outputDirectory), "recovered-sources.json"),
    JSON.stringify(recoveredSources(packetPath, preparedPath), null, 2) + "\n",
  );
}
