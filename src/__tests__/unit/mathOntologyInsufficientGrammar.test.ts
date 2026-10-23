import { it, expect } from "vitest";
import Ajv from "ajv";
import { ontologyGroundingJsonSchema } from "@/lib/math-ontology/retrieval/modelSchemas";
import {
  composeOntologySelection,
  type OntologyModelPacket,
} from "@/lib/math-ontology/retrieval/modelSelection";
const packet: OntologyModelPacket = {
  packetId: "sha256:" + "1".repeat(64),
  graphVersion: "synthetic",
  sourceSnapshotId: "synthetic",
  entities: [],
  facts: [],
  coverage: "unknown",
};
// Structural counterexample from root production-app-e2e-02/provider-002.json:
// insufficient + three uncited explanations, end_turn (not token truncation).
// Real answer text/raw response remains external evidence, not this fixture.
const invalid = {
  packetId: packet.packetId,
  intent: "insufficient",
  factIds: [],
  relationDrafts: [],
  reasoning: [
    { text: "대상을 구분할 근거가 부족합니다.", factIds: [] },
    { text: "학년과 학기를 확인해 주세요.", factIds: [] },
    { text: "관계를 아직 선택할 수 없습니다.", factIds: [] },
  ],
};
it("provider grammar rejects the real failure structure while strict citation validation remains unchanged", () => {
  const validate = new Ajv().compile(ontologyGroundingJsonSchema);
  expect(validate(invalid)).toBe(false);
  expect(() =>
    composeOntologySelection(JSON.stringify(invalid), packet),
  ).toThrow();
});
it("a compact typed insufficient branch becomes an unknown result with no claims or citations", () => {
  const compact = { packetId: packet.packetId, intent: "insufficient" };
  expect(new Ajv().validate(ontologyGroundingJsonSchema, compact)).toBe(true);
  expect(
    composeOntologySelection(JSON.stringify(compact), packet),
  ).toMatchObject({
    intent: "insufficient",
    facts: [],
    relationDrafts: [],
    reasoning: [],
  });
  expect(() =>
    composeOntologySelection(
      JSON.stringify({
        ...compact,
        reasoning: [{ text: "uncited", factIds: [] }],
      }),
      packet,
    ),
  ).toThrow();
  expect(() =>
    composeOntologySelection(
      JSON.stringify({ ...compact, sql: "SELECT" }),
      packet,
    ),
  ).toThrow();
});
it("still accepts the previous explicit-empty insufficient ABI and refuses uncited explain", () => {
  expect(
    composeOntologySelection(
      JSON.stringify({
        packetId: packet.packetId,
        intent: "insufficient",
        factIds: [],
        relationDrafts: [],
        reasoning: [],
      }),
      packet,
    ).intent,
  ).toBe("insufficient");
  expect(
    new Ajv().validate(ontologyGroundingJsonSchema, {
      ...invalid,
      intent: "explain",
      factIds: ["f0"],
    }),
  ).toBe(false);
});

import { ontologyPlanJsonSchema } from "@/lib/math-ontology/retrieval/modelSchemas";
it("avoids the provider006 rejected enum plus union-type shape while preserving nullable plans", () => {
  // Actual Anthropic400: Enum value 5 does not match declared type [integer,null].
  const visit = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const obj = value as Record<string, unknown>;
    if (obj.enum) expect(typeof obj.type).toBe("string");
    Object.values(obj).forEach(visit);
  };
  visit(ontologyPlanJsonSchema);
  const validate = new Ajv().compile(ontologyPlanJsonSchema);
  expect(
    validate({
      intent: "plan-draft",
      section: "c1",
      dailyQuestionCount: 15,
      enabled: true,
    }),
  ).toBe(true);
  expect(
    validate({
      intent: "insufficient",
      section: null,
      dailyQuestionCount: null,
      enabled: null,
    }),
  ).toBe(true);
  expect(
    validate({
      intent: "plan-draft",
      section: "c1",
      dailyQuestionCount: 17,
      enabled: true,
    }),
  ).toBe(false);
});

import release from "../fixtures/ontology-packaged-release.json";
import { mathOntologyGraphIdentitySchema } from "@/contracts/mathOntology.contract";
import { loadOntologyRuntime } from "@/lib/math-ontology/runtime/artifact";
import { runOntologyAssist } from "@/lib/math-ontology/retrieval/assist";
import { ontologyDigest } from "@/lib/math-ontology/compiler/canonical";
it("real assist composition presents compact model uncertainty as unknown rather than503", async () => {
  const runtime = await loadOntologyRuntime(
    release,
    mathOntologyGraphIdentitySchema.parse(release.identity),
  );
  let calls = 0;
  const result = await runOntologyAssist(
    {
      maskedQuestion: "분수의 덧셈과 연결된 소단원을 알려줘.",
      hasSelectedStudent: false,
      signal: new AbortController().signal,
    },
    {
      assertAuthorized: async () => {},
      open: async () => ({
        runtime,
        context: {
          allowedScopes: ["global"],
          contextHash: "synthetic",
          cursorSecret: "synthetic",
          deadlineMs: 10000,
        },
        assertCurrent: async () => {},
      }),
      complete: async (prompt) => {
        calls++;
        const data = JSON.parse(prompt.split("\n").at(-1)!);
        const raw = JSON.stringify(
          data.packet
            ? { packetId: data.packet.packetId, intent: "insufficient" }
            : {
                intent: "explain",
                searchTerms: ["분수의 덧셈"],
                context: "global",
              },
        );
        return {
          raw,
          receipt: {
            vendor: "anthropic" as const,
            requestedModel: "synthetic-only",
            reportedModel: null,
            responseId: null,
            completionReason: "end_turn",
            responseTextHash: ontologyDigest(raw),
            usage: null,
          },
        };
      },
    },
  );
  expect(calls).toBe(2);
  expect(result.selection?.intent).toBe("insufficient");
  expect(result.answer.coverage).toEqual([
    { label: "근거 범위", value: "미확인" },
  ]);
  expect(result.answer.action).toBeUndefined();
  expect(result.answer.steps).toEqual([]);
}, 60000);
