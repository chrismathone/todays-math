import { existsSync } from "node:fs";
import { resolve } from "node:path";

/** The middle worker publishes audit.json when all original IDs have proposals. */
export function canonicalProposalFile(
  directory: string,
  partialMiddle = false,
): string {
  const complete = resolve(directory, "audit.json");
  if (existsSync(complete)) return complete;
  if (partialMiddle) return resolve(directory, "proposal-cohorts.json");
  throw new Error(`현재 문항 제안 파일이 없습니다: ${complete}`);
}
