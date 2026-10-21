import {
  definitionUnits,
  definitionCards,
} from "@/lib/math-explorers/definition-cards";
for (const u of definitionUnits.filter((u) => u.grade === 5))
  console.log(u.id, "|", u.title, "|", u.subtitle);
const unit = process.argv[2];
if (unit)
  for (const c of definitionCards.filter((c) => c.unit === unit)) {
    console.log("\n#", c.id, c.name);
    console.log("뜻:", c.definition);
    console.log("설명:", c.explanation);
    console.log(
      "예:",
      c.examples.map((e) => `${e.yes ? "O" : "X"} ${e.text}`).join(" / "),
    );
  }
