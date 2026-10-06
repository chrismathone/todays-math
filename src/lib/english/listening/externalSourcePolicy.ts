/** Retired assessment provenance only; filenames, uploads and authored text are not evidence. */
export const RETIRED_LISTENING_ASSESSMENT_KINDS = [
  "national_listening",
  "mock_exam",
] as const;
export const RETIRED_LISTENING_PROVIDERS = [
  "ebs",
  "ebs 중학",
  "ebsi",
  "시·도교육청",
] as const;
/** Catalog assessment IDs and the separately imported September mock assessment. */
export const RETIRED_LISTENING_SOURCE_ID_PATTERN =
  "^(ebs-middle|ebsi-high)-[123]-[0-9]{4}-([12]|09-mock)$";
const sourceId = new RegExp(RETIRED_LISTENING_SOURCE_ID_PATTERN);
const record = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
const retiredKind = (value: unknown) =>
  RETIRED_LISTENING_ASSESSMENT_KINDS.some((kind) => kind === value);
const retiredProvider = (value: unknown) =>
  typeof value === "string" &&
  RETIRED_LISTENING_PROVIDERS.some(
    (provider) => provider === value.trim().toLowerCase(),
  );

function retiredMetadata(value: unknown): boolean {
  const metadata = record(value);
  return Boolean(
    metadata &&
    (retiredKind(metadata.kind) ||
      retiredKind(metadata.assessmentKind) ||
      retiredProvider(metadata.provider) ||
      (typeof metadata.sourceRecordId === "string" &&
        sourceId.test(metadata.sourceRecordId))),
  );
}

/** A single externally sourced question retires its assembled set, including shared audio. */
export function isKnownExternalListeningDocument(value: unknown): boolean {
  const document = record(value);
  if (!document) return false;
  if (retiredMetadata(document.source)) return true;
  return Boolean(
    Array.isArray(document.groups) &&
    document.groups.some((value) => {
      const group = record(value);
      return (
        Array.isArray(group?.questions) &&
        group.questions.some((question) =>
          retiredMetadata(record(question)?.metadata),
        )
      );
    }),
  );
}
