import fs from "node:fs";

const html = fs.readFileSync(
  "public/lab/archive/elementary-math-lab.html",
  "utf8",
);
const start = html.indexOf('<script type="application/json" id="eml-curriculum">');
const end = html.indexOf("</script>", start);
if (start < 0 || end < 0) {
  console.error("curriculum script not found");
  process.exit(1);
}
const json = html
  .slice(html.indexOf(">", start) + 1, end)
  .trim();
JSON.parse(json);
fs.writeFileSync("src/lib/lab/units.json", json);
console.log("wrote src/lib/lab/units.json", json.length);
