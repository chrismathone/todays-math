// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
  prepareCodexRetryQualification,
  type CodexRetryQualificationInput,
} from "@/lib/import/schoolTextbook/codexRetryQualification";
import { reviewDigest } from "@/lib/import/schoolTextbook/qualification";
vi.mock("openai", () => {
  throw new Error("paid-provider-imported");
});
vi.mock("@/lib/import/schoolTextbook/dbRetryReview", () => {
  throw new Error("paid-reviewer-imported");
});
import { codexQualificationFixture as fixture } from "../fixtures/codexQualification";

describe("Codex subscription qualification policy", () => {
  it("returns only two owned pending rows after complete independent proof", () => {
    expect(prepareCodexRetryQualification(fixture())).toMatchObject({
      pairs: 1,
      ids: ["owned-1", "owned-2"],
      proofKind: "machine-codex-blind-review",
    });
  });
  const mutations: Array<
    [string, (input: CodexRetryQualificationInput) => void]
  > = [
    [
      "replayed session",
      (x) => {
        x.reviews[0]!.communications[2]!.threadId =
          x.reviews[0]!.communications[0]!.threadId;
      },
    ],
    [
      "false semantic judgment",
      (x) => {
        x.reviews[0]!.semanticReviews[0]!.actualChange.passed = false;
      },
    ],
    [
      "missing semantic evidence",
      (x) => {
        x.reviews[0]!.semanticReviews[0]!.sameLearningGoal.evidence.reason = "";
      },
    ],
    [
      "false solution step",
      (x) => {
        x.reviews[0]!.solutionReviews[0]!.allStepsValid = false;
      },
    ],
    [
      "missing explanation evidence",
      (x) => {
        x.reviews[0]!.solutionReviews[0]!.evidence = [];
      },
    ],
    [
      "ambiguous question",
      (x) => {
        x.reviews[0]!.blindSolutions[0]!.ambiguous = true;
      },
    ],
    [
      "altered frozen answer",
      (x) => {
        x.reviews[0]!.blindSolutions[0]!.answer = "6";
      },
    ],
    [
      "new wrong answer with rehashed proof",
      (x) => {
        x.reviews[0]!.blindSolutions[0]!.answer = "6";
        x.reviews[0]!.blindSolutionsDigest = reviewDigest(
          x.reviews[0]!.blindSolutions,
        );
      },
    ],
    [
      "missing source conditions",
      (x) => {
        x.reviews[0]!.blindSolutions[0]!.missingEvidence = ["条件不足"];
      },
    ],
    [
      "edited source",
      (x) => {
        x.origins[0]!.problem.content += "条件追加";
      },
    ],
    [
      "old candidate image",
      (x) => {
        x.bindings[0]!.candidateFigureDigests[0] = "old";
      },
    ],
    [
      "wrong output proof",
      (x) => {
        x.reviews[0]!.communications[0]!.outputDigest = reviewDigest("other");
      },
    ],
    [
      "failed auth receipt",
      (x) => {
        x.reviews[0]!.communications[0]!.auth = null;
      },
    ],
    [
      "missing CLI receipt",
      (x) => {
        x.reviews[0]!.communications[0]!.receipt = null;
      },
    ],
    [
      "nonmatching actual CLI thread",
      (x) => {
        x.reviews[0]!.communications[0]!.receipt!.threadId = "other";
      },
    ],
    [
      "stale schema digest",
      (x) => {
        x.reviews[0]!.communications[0]!.schemaDigest = "";
      },
    ],
    [
      "invented model",
      (x) => {
        x.reviews[0]!.communications[0]!.model = "invented";
      },
    ],
    [
      "missing solution review",
      (x) => {
        x.reviews[0]!.solutionReviews.pop();
      },
    ],
    [
      "failed phone-print render",
      (x) => {
        x.render.checks[3]!.brokenImages = 1;
      },
    ],
    [
      "existing human approved row",
      (x) => {
        x.stored[0]!.review_status = "approved";
      },
    ],
    [
      "unowned row",
      (x) => {
        x.ownedIds = new Set(["owned-1"]);
      },
    ],
    [
      "missing receipt digest",
      (x) => {
        x.reviews[0]!.communications[0]!.receiptDigest = null;
      },
    ],
  ];
  it.each(mutations)("rejects %s", (_, mutate) => {
    const x = fixture();
    mutate(x);
    expect(() => prepareCodexRetryQualification(x)).toThrow();
  });
});
