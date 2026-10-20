import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { planSheet } from "@/components/concept-blank/paper/paginate";
import { encodeSheetCode } from "@/lib/concept-blank/sheetCode";
import {
  writingAreaBanks,
  writingAreaSelection,
  writingAreaSheets,
} from "../fixtures/conceptBlankWritingArea";

describe("답란 공용화 전의 쪽 나눔 · 지면 코드", () => {
  it.each(["legacy", "questions"] as const)("%s", (mode) => {
    const plans = writingAreaSheets(mode).map(planSheet);
    expect({
      pages: plans.map((plan) => ({
        form: plan.student[0].form,
        student: plan.student.length,
        key: plan.key.length,
      })),
      planSha256: createHash("sha256")
        .update(JSON.stringify(plans))
        .digest("hex"),
      code: encodeSheetCode(writingAreaSelection, writingAreaBanks[mode]),
    }).toMatchSnapshot();
  });
});
