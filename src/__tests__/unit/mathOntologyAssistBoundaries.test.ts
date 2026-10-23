import { it, expect, vi } from "vitest";
import type { EywaManagedAccount, EywaBinding } from "@prisma/client";
import { ontologyAuthorizationClockFields } from "@/lib/math-ontology/access/stamp";
import {
  canonicalOntologyJson,
  ontologyDigest,
} from "@/lib/math-ontology/compiler/canonical";
import { exactOntologyRelationSupport } from "@/lib/math-ontology/retrieval/relationSupport";
import { runOntologyAssist } from "@/lib/math-ontology/retrieval/assist";
import type { MathOntologyRuntime } from "@/lib/math-ontology/runtime/artifact";
import type { MathOntologyProof } from "@/contracts/mathOntology.contract";
it("binds managed BigInt generations and real lease timestamps without identity text", () => {
  const m = {
    bindingId: "binding",
    status: "confirmed",
    blockReasons: [],
    sourceEpoch: "epoch",
    securityRevision: BigInt(4),
    accountRevocationGeneration: BigInt(3),
    tenantRevocationGeneration: BigInt(2),
    classListRevision: BigInt(1),
    leaseExpiresAt: new Date("2026-10-23T00:00:00Z"),
    endedAt: null,
    sourceName: "PRIVATE_NAME",
  } as unknown as EywaManagedAccount;
  const b = {
    id: "binding",
    enabled: true,
    mode: "active",
    sourceEpoch: "epoch",
    leaseExpiresAt: new Date("2026-10-23T01:00:00Z"),
    updatedAt: new Date("2026-10-22T00:00:00Z"),
  } as EywaBinding;
  const bytes = canonicalOntologyJson(
    ontologyAuthorizationClockFields(null, m, b),
  );
  expect(bytes).toContain("2026-10-23T00:00:00.000Z");
  expect(bytes).toContain('"securityRevision":"4"');
  expect(bytes).not.toContain("PRIVATE_NAME");
  expect(
    canonicalOntologyJson(
      ontologyAuthorizationClockFields(null, { ...m, securityRevision: BigInt(5) }, b),
    ),
  ).not.toBe(bytes);
  expect(
    canonicalOntologyJson(
      ontologyAuthorizationClockFields(null, m, {
        ...b,
        leaseExpiresAt: new Date("2026-10-24T00:00:00Z"),
      }),
    ),
  ).not.toBe(bytes);
});
it("supports exactly the checked selected conclusion, never shared endpoints or transitive prerequisites", () => {
  const proof = {
    id: "proof",
    scope: "global",
    assertionIds: ["assertion"],
    conclusion: ["A", "partOf", "C"],
    rule: "prp-trp",
  } as MathOntologyProof;
  expect(
    exactOntologyRelationSupport([proof], ["proof"], ["A", "partOf", "C"])
      .support,
  ).toBe("indirect");
  expect(
    exactOntologyRelationSupport([proof], [], ["A", "partOf", "C"]).support,
  ).toBe("unknown");
  expect(
    exactOntologyRelationSupport(
      [proof],
      ["proof"],
      ["A", "directPedagogicalPrerequisite", "C"],
    ).support,
  ).toBe("unknown");
});
it("answers independent retained and post-plan counts without sending records or doing model arithmetic", async () => {
  const complete = vi.fn(async () => {
    const raw = JSON.stringify({
      intent: "observation-explain",
      searchTerms: [],
      context: "selected-student",
      observationWindow: "after-last-plan",
    });
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
  });
  const result = await runOntologyAssist(
    {
      maskedQuestion: "계획 변경 때문에 좋아졌나?",
      hasSelectedStudent: true,
      signal: new AbortController().signal,
    },
    {
      assertAuthorized: async () => {},
      complete,
      open: async () => ({
        runtime: {} as MathOntologyRuntime,
        context: {
          allowedScopes: ["global"],
          contextHash: "private",
          cursorSecret: "synthetic",
        },
        assertCurrent: async () => {},
        readObservations: async () => ({
          available: true,
          window: "after-last-plan",
          counts: {
            retainedFirstAttempts: 5,
            independentCorrect: 1,
            independentIncorrect: 1,
            excluded: 3,
          },
        }),
      }),
    },
  );
  expect(result.answer.summary).toContain("2건 중 정답 1건");
  expect(result.answer.details[0].text).toContain(
    "인과 효과를 판정하지 않습니다",
  );
  expect(complete).toHaveBeenCalledTimes(1);
});
