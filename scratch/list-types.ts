import { registeredTypes } from "../src/lib/middle/generate";

const want = process.argv.slice(2);
const byS = new Map<string, { key: string; title: string }[]>();
for (const t of registeredTypes()) {
  const arr = byS.get(t.unitSection) ?? [];
  arr.push({ key: t.key, title: t.rpmTitle });
  byS.set(t.unitSection, arr);
}
for (const s of want) {
  const arr = byS.get(s) ?? [];
  console.log(`\n== ${s}  (${arr.length})`);
  for (const a of arr) console.log(`   ${a.key}   ${a.title}`);
}
