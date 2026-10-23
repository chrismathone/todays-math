import { expect, it } from "vitest";
import release from "../fixtures/ontology-packaged-release.json";
import { loadOntologyRuntime } from "@/lib/math-ontology/runtime/artifact";
import { mathOntologyGraphIdentitySchema } from "@/contracts/mathOntology.contract";
import { runOntologyAssist } from "@/lib/math-ontology/retrieval/assist";
import { ontologyDigest } from "@/lib/math-ontology/compiler/canonical";
it("retains the exact requested definition and its actual question-to-definition witness despite broader term collisions", async () => {
  const requested = "받아내림이 없는 진분수의 뺄셈";
  const runtime = await loadOntologyRuntime(release, mathOntologyGraphIdentitySchema.parse(release.identity));
  let calls = 0;
  const result = await runOntologyAssist({ maskedQuestion: `초5 1학기 ${requested} 정의와 소단원 연결을 보여줘.`, hasSelectedStudent: false, signal: new AbortController().signal }, {
    assertAuthorized: async () => {},
    open: async () => ({ runtime, context: { allowedScopes: ["global"], contextHash: "synthetic-retrieval-check", cursorSecret: "synthetic-retrieval-only", deadlineMs: 10000 }, assertCurrent: async () => {} }),
    complete: async prompt => {
      calls++;
      const data = JSON.parse(prompt.split("\n").at(-1)!);
      const raw = JSON.stringify(data.packet ? { packetId: data.packet.packetId, intent: "insufficient", factIds: [], relationDrafts: [] } : { intent: "explain", searchTerms: [requested, "진분수", "뺄셈"], context: "global" });
      return { raw, receipt: { vendor: "anthropic", requestedModel: "synthetic-no-provider-call", reportedModel: null, responseId: null, completionReason: "synthetic-stop", responseTextHash: ontologyDigest(raw), usage: null } };
    },
  });
  expect(calls).toBe(2);
  const target = result.packet!.entities.find(entity => entity.label === requested);
  expect(target).toBeDefined();
  expect(result.packet!.facts.some(fact => fact.object === target!.id && fact.predicate === "assessesDefinition")).toBe(true);
  expect(result.packet!.facts.some(fact => fact.subject === target!.id && fact.predicate === "partOf")).toBe(true);
  expect(result.packet!.facts.length).toBeLessThanOrEqual(30);
  expect(result.packet!.retrieval!.visitedEntities).toBeLessThanOrEqual(24);
}, 60000);
