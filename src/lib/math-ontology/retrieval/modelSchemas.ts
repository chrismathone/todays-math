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
const groundedSelection = {
  type: "object",
  additionalProperties: false,
  required: ["packetId", "intent", "factIds", "relationDrafts"],
  properties: {
    packetId: { type: "string" },
    intent: {
      type: "string",
      enum: ["explain", "relation-draft"],
    },
    factIds: {
      ...strings,
      minItems: 1,
      description: "Select 1 to 6 existing fact IDs, no duplicates.",
    },
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
          factIds: {
            ...strings,
            minItems: 1,
            description: "Select 1 to 4 IDs included in the top-level factIds.",
          },
        },
      },
    },
    reasoning: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["text", "factIds"],
        properties: {
          text: {
            type: "string",
            description: "Short cited explanation, 1 to 300 characters.",
          },
          factIds: {
            ...strings,
            minItems: 1,
            description: "Select 1 to 6 IDs included in the top-level factIds.",
          },
        },
      },
    },
  },
};
/** No unsupported maxItems/complex enum constraints: an insufficient response
 * is its own compact object branch, with no evidentiary fields at all. */
export const ontologyGroundingJsonSchema: OntologyModelJsonSchema = {
  anyOf: [
    {
      type: "object",
      additionalProperties: false,
      required: ["packetId", "intent"],
      properties: {
        packetId: { type: "string" },
        intent: { type: "string", enum: ["insufficient"] },
      },
    },
    groundedSelection,
  ],
};
export const ontologyPlanJsonSchema: OntologyModelJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["intent", "section", "dailyQuestionCount", "enabled"],
  properties: {
    intent: { type: "string", enum: ["plan-draft", "insufficient"] },
    section: { anyOf: [{ type: "string" }, { type: "null" }] },
    dailyQuestionCount: {
      // Actual provider006 rejects enum with a union-valued type, despite
      // accepting these primitives individually. Keep each enum type singular.
      anyOf: [{ type: "integer", enum: [5, 10, 15, 20] }, { type: "null" }],
    },
    enabled: { anyOf: [{ type: "boolean" }, { type: "null" }] },
  },
};
