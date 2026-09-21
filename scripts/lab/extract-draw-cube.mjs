import fs from "node:fs";

const html = fs.readFileSync(
  "public/lab/archive/elementary-math-lab.html",
  "utf8",
);
const start = html.indexOf("function drawCube()");
const end = html.indexOf("function drawDynamic()");
console.log(html.slice(start, end));
