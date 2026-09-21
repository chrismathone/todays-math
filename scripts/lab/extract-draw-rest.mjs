import fs from "node:fs";

const html = fs.readFileSync(
  "docs/lab/elementary-math-lab.html",
  "utf8",
);
for (const name of ["function drawRuler()", "function drawArea()"]) {
  const start = html.indexOf(name);
  const next = html.indexOf("function ", start + 10);
  console.log("\n====", name, "====\n");
  console.log(html.slice(start, next));
}
