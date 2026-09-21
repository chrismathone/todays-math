import fs from "node:fs";

const html = fs.readFileSync(
  "public/lab/archive/elementary-math-lab.html",
  "utf8",
);
const start = html.indexOf(
  '<script type="application/json" id="eml-blender">',
);
const end = html.indexOf("</script>", start);
if (start < 0 || end < 0) {
  console.error("blender script not found");
  process.exit(1);
}
const json = html.slice(html.indexOf(">", start) + 1, end).trim();
const data = JSON.parse(json);
fs.writeFileSync("src/lib/lab/cubeNetFrames.json", json);
console.log("frames", data.frames.length, "faces", data.faces?.length);
