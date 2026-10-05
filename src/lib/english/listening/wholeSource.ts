/** A dependency-free policy shared by teacher clients and the listening runtime. */
export function usesWholeSourceAssessmentAudio(document: {
  source?: { kind?: string | null } | null;
  groups?: readonly {
    questions?: readonly {
      metadata?: {
        assessmentKind?: string | null;
        sourceRecordId?: string | null;
      } | null;
    }[];
  }[];
}): boolean {
  const national = (kind: string | null | undefined) =>
    kind === "national_listening" || kind === "mock_exam";
  return (
    national(document.source?.kind) ||
    Boolean(
      document.groups?.some((group) =>
        group.questions?.some(
          ({ metadata }) =>
            national(metadata?.assessmentKind) ||
            /^(?:ebs-middle|ebsi-high)-/.test(metadata?.sourceRecordId ?? ""),
        ),
      ),
    )
  );
}
