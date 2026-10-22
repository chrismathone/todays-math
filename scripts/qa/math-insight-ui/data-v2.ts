import {
  mathInsightV2SnapshotSchema,
  mathInsightV2InquiryResultSchema,
} from "../../../src/contracts/mathInsightV2.contract";
import generated from "./generated-v2.json";

// Exact core-owned prose/DTOs frozen by generate-v2.ts, using pure transitions.
export const scopeA = generated.scopes[0];
export const scopeB = generated.scopes[1];
const index = (context = scopeA) =>
  context.studentId === scopeB.studentId ? 1 : 0;
export function insightFixture(context = scopeA, scene = "ready") {
  const scenes = generated.scenarios as Record<string, unknown[]>;
  return mathInsightV2SnapshotSchema.parse(
    structuredClone(scenes[scene][index(context)]),
  );
}
export const outsideFixture = (context = scopeA) =>
  insightFixture(context, "outside");
export function inquiryFixture(context = scopeA, scene = "ready") {
  return mathInsightV2InquiryResultSchema.parse(
    structuredClone(
      (scene === "feature-off"
        ? generated.featureOffInquiries
        : generated.inquiries)[index(context)],
    ),
  );
}
export const CURRENT_EVIDENCE_ID = insightFixture().pilot.evidence.find(
  (item) => item.purposes.includes("section-current"),
)!.id;
export const TRIGGER_EVIDENCE_ID = insightFixture().pilot.evidence.find(
  (item) =>
    item.purposes.includes("candidate-trigger") &&
    !item.purposes.includes("section-current"),
)!.id;
export const EXCLUDED_EVIDENCE_ID = insightFixture().pilot.evidence.find(
  (item) => !item.included,
)!.id;
export const CURRENT_RECORD_LABEL = `기록 ${insightFixture().observations.length + insightFixture().pilot.evidence.findIndex((item) => item.id === CURRENT_EVIDENCE_ID) + 1}`;
export const NEXT_CHECK_TITLE = insightFixture().pilot.nextChecks[0].title;
