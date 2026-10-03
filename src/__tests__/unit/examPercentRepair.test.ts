import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { renderMathHtml } from "@/lib/math/renderMathHtml";
import { tokenizeMath } from "@/lib/math/segments";
import { repairExamText } from "../../../scripts/import/exam-paper/repairExamText";
import {
  readDraftCorpus,
  type ExamDraft,
} from "../../../scripts/import/exam-paper/audit-bank-fix";
import { readDecideBaseline } from "../../../scripts/import/exam-paper/audit-bank-decide";

function visible(text: string): string {
  const root = document.createElement("div");
  root.innerHTML = renderMathHtml(text);
  expect(root.querySelector(".math-raw,.katex-error")).toBeNull();
  // 접근성 MathML의 TeX 원문이 아니라 실제 보이는 HTML에서 센다.
  root.querySelectorAll(".katex-mathml").forEach((node) => node.remove());
  return root.textContent ?? "";
}
function barePercents(text: string): number {
  return tokenizeMath(text)
    .filter((seg) => seg.type !== "text")
    .reduce((sum, seg) => sum + (seg.value.match(/(?<!\\)%/g)?.length ?? 0), 0);
}
const fields = ["content", "answer", "solution"] as const;
const baseline = readDecideBaseline();
const originals = [
  ...new Set(Object.keys(baseline.hashes).map((id) => id.replace(/-\d+$/, ""))),
].flatMap(
  (exam) =>
    JSON.parse(
      execFileSync(
        "git",
        [
          "show",
          `${baseline.baseRevision}:scripts/import/exam-paper/exams/${exam}/drafts.json`,
        ],
        { encoding: "utf8" },
      ),
    ) as ExamDraft[],
);

describe("수식의 퍼센트는 주석으로 사라지지 않는다", () => {
  it.each([
    ["전체의 $20%$이다.", "20%"],
    ["$$30%$$", "30%"],
    ["$20%+30%$", "20%+30%"],
    ["$20%$$30%$", "20%30%"],
  ])(
    "제품 렌더러의 보이는 글자에 퍼센트와 뒤의 식이 남는다: %s",
    (text, wanted) => {
      expect(visible(repairExamText(text)).replace(/\s+/g, "")).toContain(
        wanted,
      );
    },
  );
  it("이미 이스케이프한 퍼센트·글 속 퍼센트·짝 없는 달러는 한 글자도 바꾸지 않는다", () => {
    for (const text of [
      String.raw`$20\%$`,
      "전체의 20%이다.",
      String.raw`\$20에 10% 할인`,
      "$20%",
      String.raw`$20\%+30\%$`,
    ]) {
      expect(repairExamText(text)).toBe(text);
    }
    const text = String.raw`밖 10%와 $20%$ 및 $$30\%$$`;
    const once = repairExamText(text);
    expect(once).toBe(String.raw`밖 10%와 $20\%$ 및 $$30\%$$`);
    expect(repairExamText(once)).toBe(once);
  });
  it("두 역슬래시는 줄바꿈이므로 뒤의 맨 퍼센트만 이스케이프한다", () => {
    expect(repairExamText(String.raw`$$20\\%$$`)).toBe(String.raw`$$20\\\%$$`);
    expect(repairExamText(String.raw`$$20\\\%$$`)).toBe(String.raw`$$20\\\%$$`);
  });
  it("기준선 17곳 모두 제품 지면에서 퍼센트가 보이고 숫자는 보존된다", () => {
    expect(originals).toHaveLength(533);
    let found = 0;
    for (const row of originals)
      for (const field of fields) {
        const text = row[field] ?? "";
        const count = barePercents(text);
        if (!count) continue;
        found += count;
        const fixed = repairExamText(text);
        expect(fixed.match(/\d+/g), row.externalId).toEqual(text.match(/\d+/g));
        expect(
          visible(fixed).match(/%/g)?.length ?? 0,
          `${row.externalId}:${field}`,
        ).toBe(text.match(/%/g)?.length ?? 0);
        expect(barePercents(fixed)).toBe(0);
      }
    expect(found).toBe(17);
  });
  it("재생성한 25편 533행의 수식 안 맨 퍼센트는 0이다", () => {
    const rows = readDraftCorpus();
    expect(rows).toHaveLength(533);
    const remaining = rows.flatMap((row) =>
      fields.flatMap((field) =>
        barePercents(row[field] ?? "") ? [`${row.externalId}:${field}`] : [],
      ),
    );
    expect(remaining).toEqual([]);
  });
});
