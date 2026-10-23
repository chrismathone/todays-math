export type OntologyOperationCode =
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "STALE"
  | "EXPIRED"
  | "BINDING_MISMATCH"
  | "EVIDENCE_INSUFFICIENT"
  | "UNAVAILABLE"
  | "CONFLICT";
export class OntologyOperationError extends Error {
  constructor(public readonly code: OntologyOperationCode) {
    super(code);
    this.name = "OntologyOperationError";
  }
}
export function requireOperation(
  value: unknown,
  code: OntologyOperationCode,
): asserts value {
  if (!value) throw new OntologyOperationError(code);
}
