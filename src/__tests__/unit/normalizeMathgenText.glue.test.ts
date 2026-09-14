import { describe, expect, it } from "vitest";
import {
  normalizeMathgenAnswer,
  normalizeMathgenText,
} from "@/lib/math/normalizeMathgenText";
import { tokenizeMath } from "@/lib/math/segments";
import { parseDevAiResult } from "@/lib/dev-ai/tasks";
import { NativeOcrItemSchema, normalizeNativeOcr } from "@/lib/mathgen/ocr";

const handoff = [
  String.raw`따라서 $\frac{N}{M}$$\angle CAM=15°$ 이다.`,
  String.raw`따라서 $\frac{N}{M}$$\angle CAM=15$ 이다.`,
  String.raw`$a=1$$b=2$$c=3$ 이다.`,
  String.raw`값은 $$\angle CAM=15° 이다.`,
  String.raw`따라서 $\frac{N}{M}$ $\angle CAM=15°$ 이다.`,
  String.raw`$$\frac{N}{M}$$ 이다.`,
];

describe("adjacent inline math intake regression", () => {
  it.each(handoff)(
    "preserves handoff input and repeated passes: %s",
    (input) => {
      for (const normalize of [normalizeMathgenText, normalizeMathgenAnswer]) {
        let output = input;
        for (let pass = 0; pass < 10; pass++) {
          output = normalize(output);
          expect(output).toBe(input);
        }
      }
    },
  );

  it.each([
    [String.raw`$A$$\sqrt{2}$`, ["A", String.raw`\sqrt{2}`]],
    [
      String.raw`$\frac{N}{M}$$\angle CAM=15°$$\sqrt{2}$`,
      [
        String.raw`\frac{N}{M}`,
        String.raw`\angle CAM=15°`,
        String.raw`\sqrt{2}`,
      ],
    ],
    [
      String.raw`$\text{cost \$5}$$\frac{1}{2}$`,
      [String.raw`\text{cost \$5}`, String.raw`\frac{1}{2}`],
    ],
  ])("keeps adjacent inline boundaries: %s", (input, formulas) => {
    const output = normalizeMathgenText(input);
    expect(output).toBe(input);
    expect(tokenizeMath(output).filter((part) => part.type !== "text")).toEqual(
      formulas.map((value) => ({ type: "inline", value })),
    );
  });

  it.each([
    String.raw`$$\frac{N}{M}$$$\angle CAM=15°$`,
    String.raw`$\angle CAM=15°$$$\frac{N}{M}$$`,
    String.raw`\$5 と $A$$\sqrt{2}$`,
    String.raw`<svg><text>$A$$\sqrt{2}$</text></svg>`,
    String.raw`<table><tr><td>$A$$\sqrt{2}$</td></tr></table>`,
    "`$A$$\\sqrt{2}$` and ```tex\n$A$$\\sqrt{2}$\n```",
  ])("preserves display, escaping, and protected content: %s", (input) => {
    expect(normalizeMathgenText(input)).toBe(input);
    expect(normalizeMathgenText(normalizeMathgenText(input))).toBe(input);
  });

  it("still wraps loose formulas on either side of adjacent inline math", () => {
    const input = String.raw`\sqrt{3} 다음 $A$$\angle CAM=15°$ 뒤 \frac{1}{2}`;
    const expected = String.raw`$\sqrt{3}$ 다음 $A$$\angle CAM=15°$ 뒤 $\frac{1}{2}$`;
    expect(normalizeMathgenText(input)).toBe(expected);
    expect(normalizeMathgenText(expected)).toBe(expected);
  });

  it("preserves glued math through native OCR conversion", () => {
    const item = NativeOcrItemSchema.parse({
      number: 1,
      contents: [{ type: "text", value: handoff[0] }],
    });
    const result = normalizeNativeOcr(item);
    expect(result.content).toBe(handoff[0]);
    expect(result.ocr.blocks).toEqual(item.contents);
    expect(normalizeMathgenText(result.content)).toBe(result.content);
  });

  it.each(["ocr", "page-ocr", "solution"] as const)(
    "preserves glued math through %s responses",
    (task) => {
      const payload = {
        content: handoff[0],
        answer: handoff[1],
        solution: handoff[0],
      };
      const result = parseDevAiResult(
        JSON.stringify({
          ...payload,
          problems: [
            { ...payload, bbox: { left: 0, top: 0, width: 300, height: 300 } },
          ],
        }),
        task,
      );
      if (task === "page-ocr")
        expect(result.problems?.[0]).toMatchObject({
          content: payload.content,
          answer: payload.answer,
        });
      else if (task === "ocr")
        expect(result).toMatchObject({
          content: payload.content,
          answer: payload.answer,
        });
      else
        expect(result).toMatchObject({
          solution: payload.solution,
          answer: payload.answer,
        });
    },
  );
});
