/** Optional progress metadata. Missing legacy progress is deliberately unknown. */
export type WorkspaceWorkflowStep = "scope" | "review" | "output";
export type WorkspaceWorkflow = {
  source: "bank" | "extraction";
  step: WorkspaceWorkflowStep;
  sourceDocumentId?: string;
};
export type DocumentWorkflow = {
  source: WorkspaceWorkflow["source"] | "arithmetic";
  step: WorkspaceWorkflowStep | "import" | "crop";
  sourceDocumentId?: string;
};

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function parseWorkspaceWorkflow(
  value: unknown,
): WorkspaceWorkflow | undefined {
  if (
    !record(value) ||
    (value.source !== "bank" && value.source !== "extraction") ||
    (value.step !== "scope" &&
      value.step !== "review" &&
      value.step !== "output")
  )
    return undefined;
  const sourceDocumentId =
    value.source === "extraction" &&
    typeof value.sourceDocumentId === "string" &&
    /^[A-Za-z0-9_-]{1,100}$/.test(value.sourceDocumentId)
      ? value.sourceDocumentId
      : undefined;
  return {
    source: value.source,
    step: value.step,
    ...(sourceDocumentId ? { sourceDocumentId } : {}),
  };
}

/** Works with either a full document or the server's bounded scalar projection. */
export function documentWorkflow(
  kind: string,
  payload: unknown,
): DocumentWorkflow | undefined {
  if (!record(payload)) return undefined;
  if (kind === "draft") return parseWorkspaceWorkflow(payload.workflow);
  if (
    kind === "arithmeticSheet" &&
    record(payload.presentation) &&
    payload.presentation.version === 1
  ) {
    const step = payload.presentation.step;
    if (step === "scope" || step === "review" || step === "output")
      return { source: "arithmetic", step };
  }
  if (kind !== "extraction" || !record(payload.data)) return undefined;
  const step = payload.data.step;
  if (step === "upload") return { source: "extraction", step: "import" };
  if (step === "import" || step === "crop" || step === "review")
    return { source: "extraction", step };
  if (step === "export") return { source: "extraction", step: "output" };
  return undefined;
}
