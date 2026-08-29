import {
  generateMiddleProblem,
  registeredTypes,
} from "../src/lib/middle/generate";

const keys = process.argv.slice(2);
const all = registeredTypes() as unknown as {
  key: string;
  rpmTitle: string;
  unitSection: string;
}[];

for (const key of keys) {
  const meta = all.find((e) => e.key === key);
  if (!meta) {
    console.log(`MISSING ${key}`);
    continue;
  }
  const p = generateMiddleProblem(key, 20260827);
  console.log(
    `=== ${key}  [${meta.unitSection}] ${meta.rpmTitle} (${p.difficulty})`,
  );
  console.log(p.content);
  console.log("ANS: " + p.answer);
  console.log("");
}
