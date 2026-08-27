import { writeFileSync } from "node:fs";

import {
  elementaryUnits,
  generateElementaryForm,
  listedForms,
  supportedTiers,
} from "@/lib/elementary/generate";

const output = process.argv[2] ?? "scratch/specs.json";
const seed0 = 20260827;
const step = 1009;
const specs = new Map<string, unknown>();
let generated = 0;

for (const unit of elementaryUnits()) {
  const forms = listedForms(unit);
  if (forms.length > 0 && supportedTiers(unit).length === 0) {
    throw new Error(
      `문형은 있는데 난이도 갈래가 없습니다: ${unit.grade} ${unit.section}`,
    );
  }
  for (const form of forms) {
    for (let sample = 0; sample < 2; sample += 1) {
      const problem = generateElementaryForm(
        unit,
        seed0 + sample * step,
        form.id,
      );
      generated += 1;
      if (problem.figureSpec === undefined) continue;
      const key = JSON.stringify(problem.figureSpec);
      specs.set(key, problem.figureSpec);
    }
  }
}

writeFileSync(
  output,
  `${JSON.stringify([...specs.values()], null, 2)}\n`,
  "utf8",
);
console.error(
  `문형 생성 ${generated} · 고유 figureSpec ${specs.size} → ${output}`,
);
