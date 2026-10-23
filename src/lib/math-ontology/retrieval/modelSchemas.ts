import { MATH_ONTOLOGY_RELATIONS } from "@/contracts/mathOntology.contract";
/** Generic provider grammar only. No student, source, packet IDs or per-request
 * values enter provider-cached schema; strict local schemas still own bounds. */
export type OntologyModelJsonSchema = Record<string, unknown>;
const strings = { type: "array", items: { type: "string" } };
export const ontologyIntentJsonSchema: OntologyModelJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["intent", "searchTerms", "context"],
  properties: {
    intent: {
      type: "string",
      enum: [
        "explain",
        "relation-draft",
        "plan-draft",
        "publication-draft",
        "observation-explain",
        "unknown",
      ],
    },
    searchTerms: strings,
    context: { type: "string", enum: ["global", "selected-student"] },
    observationWindow: {
      type: "string",
      enum: ["retained", "after-last-plan"],
    },
  },
};
export const ontologyGroundingJsonSchema: OntologyModelJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["packetId", "intent", "factIds", "relationDrafts"],
  properties: {
    packetId: { type: "string" },
    intent: {
      type: "string",
      enum: ["explain", "relation-draft", "insufficient"],
    },
    factIds: strings,
    relationDrafts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["subject", "predicate", "object", "factIds"],
        properties: {
          subject: { type: "string" },
          predicate: { type: "string", enum: [...MATH_ONTOLOGY_RELATIONS] },
          object: { type: "string" },
          factIds: strings,
        },
      },
    },
    reasoning: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["text", "factIds"],
        properties: { text: { type: "string" }, factIds: strings },
      },
    },
  },
};
export const ontologyPlanJsonSchema: OntologyModelJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["intent", "section", "dailyQuestionCount", "enabled"],
  properties: {
    intent: { type: "string", enum: ["plan-draft", "insufficient"] },
    section: { type: ["string", "null"] },
    dailyQuestionCount: {
      type: ["integer", "null"],
      enum: [5, 10, 15, 20, null],
    },
    enabled: { type: ["boolean", "null"] },
  },
};
