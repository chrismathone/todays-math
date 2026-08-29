import { registeredTypes } from "../src/lib/middle/generate";
const byM = new Map<string, string[]>();
for (const t of registeredTypes()) {
  const m = `${t.rpmBook}|${t.rpmMinor}`;
  const arr = byM.get(m) ?? [];
  arr.push(t.rpmType);
  byM.set(m, arr);
}
for (const [m, arr] of [...byM].sort()) {
  console.log(m.padEnd(46), arr.sort().join(","));
}
