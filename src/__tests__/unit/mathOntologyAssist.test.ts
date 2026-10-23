import { describe, it, expect, vi } from "vitest";
import release from "../fixtures/ontology-packaged-release.json";
import { loadOntologyRuntime } from "@/lib/math-ontology/runtime/artifact";
import { mathOntologyGraphIdentitySchema } from "@/contracts/mathOntology.contract";
import {
  runOntologyAssist,
  type OntologyAssistPorts,
} from "@/lib/math-ontology/retrieval/assist";
import { ontologyDigest } from "@/lib/math-ontology/compiler/canonical";
import type { ModelApiReceipt } from "@/lib/studio-ai/api";
const receipt = (raw: string): ModelApiReceipt => ({
  vendor: "anthropic",
  requestedModel: "synthetic-test",
  reportedModel: null,
  responseId: null,
  completionReason: "end_turn",
  responseTextHash: ontologyDigest(raw),
  usage: null,
});
const runtime = () =>
  loadOntologyRuntime(
    release,
    mathOntologyGraphIdentitySchema.parse(release.identity),
  );
const context = {
  allowedScopes: ["global"],
  contextHash: "synthetic-authorized-context",
  cursorSecret: "synthetic-local-only",
  deadlineMs: 10000,
};
describe("actual assist composition with synthetic model port and actual full-source engine artifact", () => {
  it("authorizes before any model or release work", async () => {
    const open = vi.fn(),
      complete = vi.fn();
    await expect(
      runOntologyAssist(
        {
          maskedQuestion: "분수",
          hasSelectedStudent: false,
          signal: new AbortController().signal,
        },
        {
          open,
          complete,
          assertAuthorized: async () => {
            throw new Error("FORBIDDEN");
          },
        },
      ),
    ).rejects.toThrow("FORBIDDEN");
    expect(open).not.toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();
  });
  it("uses actual closed retrieval, proof packet, cited reasoning and the same provider receipt ABI", async () => {
    const prompts: string[] = [],
      r = await runtime();
    const ports: OntologyAssistPorts = {
      assertAuthorized: async () => {},
      open: async () => ({
        runtime: r,
        context,
        assertCurrent: async () => {},
      }),
      complete: async (prompt) => {
        prompts.push(prompt);
        const data = JSON.parse(prompt.split("\n").at(-1)!);
        const raw = JSON.stringify(
          data.packet
            ? {
                packetId: data.packet.packetId,
                intent: "explain",
                factIds: [data.packet.facts[0].id],
                relationDrafts: [],
                reasoning: [
                  {
                    text: "이 개념의 소속 연결이 확인됩니다.",
                    factIds: [data.packet.facts[0].id],
                  },
                ],
              }
            : {
                intent: "explain",
                searchTerms: ["분수의 덧셈"],
                context: "global",
              },
        );
        return { raw, receipt: receipt(raw) };
      },
    };
    const result = await runOntologyAssist(
      {
        maskedQuestion: "분수의 덧셈은 어느 단원에 속해?",
        hasSelectedStudent: false,
        signal: new AbortController().signal,
      },
      ports,
    );
    expect(result.answer.steps.length).toBeGreaterThan(0);
    expect(result.answer.details[0].text).toContain("소속");
    expect(result.packet?.facts.length).toBeGreaterThan(0);
    expect(
      result.packet?.facts.some((f) => f.predicate === "assessesDefinition"),
    ).toBe(true);
    expect(result.packet?.facts.some((f) => f.predicate === "partOf")).toBe(
      true,
    );
    expect(result.receipts).toHaveLength(2);
    expect(prompts[1]).not.toContain("urn:todaymath:math-source");
  }, 60000);
  it("stale after a model response prevents all draft ports and delivery", async () => {
    let calls = 0;
    const prepareRelation = vi.fn();
    const r = await runtime();
    await expect(
      runOntologyAssist(
        {
          maskedQuestion: "분수의 덧셈 연결을 제안해",
          hasSelectedStudent: false,
          signal: new AbortController().signal,
        },
        {
          assertAuthorized: async () => {},
          open: async () => ({
            runtime: r,
            context,
            assertCurrent: async () => {
              if (calls > 1) throw new Error("STALE");
            },
          }),
          prepareRelation,
          complete: async (prompt) => {
            calls++;
            const d = JSON.parse(prompt.split("\n").at(-1)!);
            const raw = JSON.stringify(
              d.packet
                ? {
                    packetId: d.packet.packetId,
                    intent: "insufficient",
                    factIds: [],
                    relationDrafts: [],
                  }
                : {
                    intent: "relation-draft",
                    searchTerms: ["분수의 덧셈"],
                    context: "global",
                  },
            );
            return { raw, receipt: receipt(raw) };
          },
        },
      ),
    ).rejects.toThrow("STALE");
    expect(prepareRelation).not.toHaveBeenCalled();
  }, 60000);
});
