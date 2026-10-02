export type ListeningMediaErrorCode =
  | "invalid_request"
  | "not_found"
  | "too_large"
  | "body_size"
  | "conflict"
  | "incomplete"
  | "expired"
  | "hash_mismatch"
  | "storage_integrity";

export class ListeningMediaError extends Error {
  constructor(public readonly code: ListeningMediaErrorCode) {
    super(code);
    this.name = "ListeningMediaError";
  }
}
