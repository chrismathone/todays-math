import type { FadingConcept } from "@/lib/fading/concepts";

// Authored synthetic content: no external/student payloads, no network or database.
export const concept: FadingConcept = {
  id: "policy-memory",
  section: "초5::2-1 수의 범위와 어림하기::2-1-1 수의 범위",
  level: "하",
  ordinal: 1,
  siblings: 1,
  propositions: [
    ["이상", "$5$ 이상인 수에는 5가 ", "포함된다"],
    ["미만", "$5$ 미만인 수에는 5가 ", "포함되지 않는다"],
    ["이하", "$5$ 이하인 수에는 5가 ", "포함된다"],
  ].map(([term, text, answer], i) => ({
    id: `policy-p${i}`,
    term,
    kind: "정의",
    pieces: [
      { kind: "text", text },
      {
        kind: "target",
        target: { id: `policy-p${i}#1`, text: answer, tier: "text" },
      },
    ],
  })),
};
