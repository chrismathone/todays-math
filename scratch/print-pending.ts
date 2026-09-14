import { ITEMS, SAMPLING_PLAN } from "../src/app/dev/print-check/items";
const by = new Map<string, number>();
for (const it of ITEMS) by.set(it.status, (by.get(it.status) ?? 0) + 1);
console.log(
  "항목 " +
    ITEMS.length +
    " · " +
    [...by].map(([k, v]) => `${k} ${v}`).join(" · "),
);
console.log("\n=== 종이로 봐야 하는 것 ===");
for (const it of ITEMS) {
  if (it.status === "통과") continue;
  const title = it.title.replace(/\*\*/g, "");
  console.log(`\n[${it.status}] ${it.id} — ${title}`);
  if (it.changedOn) console.log(`  바뀐 날: ${it.changedOn}`);
  if (it.look)
    console.log(`  볼 것: ${it.look.replace(/\*\*/g, "").slice(0, 160)}`);
  const needs = (it as { needs?: string }).needs;
  if (needs)
    console.log(`  필요:  ${needs.replace(/\*\*/g, "").slice(0, 160)}`);
}
console.log("\n=== 한 번에 다 보려면 ===");
for (const s of SAMPLING_PLAN) console.log("  · " + s);
