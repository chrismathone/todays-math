import { stableStringify } from "./identity";

/** Include ownership semantics in recipe freshness, without rewriting saved items. */
export const STUDY_DRAFT_SNAPSHOT_POLICY_VERSION =
  "20261020-detached-immutable-drafts-r1";

/** Use the same supported finite/plain value graph as mathematical identities. */
export function copyStudyValue<T>(value: T): T {
  return JSON.parse(stableStringify(value)) as T;
}

function freezeGraph(value: unknown): void {
  if (value === null || typeof value !== "object") return;
  Object.freeze(value);
  for (const child of Object.values(value)) freezeGraph(child);
}

/** Detach first: never freeze a factory's reusable objects or a caller's data. */
export function immutableStudySnapshot<T>(value: T): T {
  const snapshot = copyStudyValue(value);
  freezeGraph(snapshot);
  return snapshot;
}
