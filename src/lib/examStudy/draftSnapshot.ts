/** Include ownership semantics in recipe freshness, without rewriting saved items. */
export const STUDY_DRAFT_SNAPSHOT_POLICY_VERSION =
  "20261020-detached-immutable-drafts-r2";

function copyGraph(value: unknown, ancestors: Set<object>): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return value;
  if (typeof value === "number" && Number.isFinite(value))
    return Object.is(value, -0) ? 0 : value;
  if (
    typeof value !== "object" ||
    (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype) ||
    ancestors.has(value)
  )
    throw new Error("Unsupported or cyclic study snapshot value");
  ancestors.add(value);
  // Identity serialization sorts keys; copying must preserve insertion order for
  // existing verifiers that compare parameter/rubric JSON. Do not invoke toJSON.
  const copy = Array.isArray(value)
    ? Array.from(value, child => copyGraph(child, ancestors))
    : Object.fromEntries(
        Object.entries(value)
          .filter(([, child]) => child !== undefined)
          .map(([key, child]) => [key, copyGraph(child, ancestors)]),
      );
  ancestors.delete(value);
  return copy;
}

/** Use the same supported finite/plain value graph as mathematical identities. */
export function copyStudyValue<T>(value: T): T {
  return copyGraph(value, new Set()) as T;
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
