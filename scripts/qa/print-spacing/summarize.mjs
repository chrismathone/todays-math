import { readFileSync, writeFileSync } from "node:fs";
const dir = "docs/planning/tracks/reports/print-spacing-20261020/";
const result = {};
for (const phase of ["before", "after"]) {
  const data = JSON.parse(
    readFileSync(`${dir}${phase}-measurements.json`, "utf8"),
  );
  result[phase] = data.results.map((r) => ({
    case: r.id,
    pages: r.pages.length,
    firstPageColumns: Object.values(
      Object.groupBy(r.pages[0].items, (i) => i.x),
    ).map((items) => ({
      count: items.length,
      blanks: items.map((i) => Number(i.blank.toFixed(2))),
      allocated: items.map((i) =>
        i.allocated == null ? null : Number(i.allocated.toFixed(2)),
      ),
    })),
    allPages: r.pages.map((p) =>
      Object.values(Object.groupBy(p.items, (i) => i.x)).map((items) => ({
        count: items.length,
        minAllocated: Math.min(...items.map((i) => i.allocated ?? i.blank)),
        maxAllocated: Math.max(...items.map((i) => i.allocated ?? i.blank)),
      })),
    ),
  }));
}
writeFileSync(`${dir}summary.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
