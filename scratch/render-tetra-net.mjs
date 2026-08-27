// 삼각뿔 전개도를 **실제로 렌더**해 접는 선이 점선으로 나오는지 본다.
// 「키를 넣었다」와 「점선이 나온다」는 다른 말이다 — 조용히 무시되는 키를 넣으면
// 시험도 초록이고 지면만 틀린다.
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const spec = JSON.parse(process.argv[2]);
const child = spawn("python", ["scripts/figure/render_spec.py"], { shell: true });
let out = "";
child.stdout.on("data", (d) => (out += d));
child.stdin.end(JSON.stringify(spec));
child.on("close", () => {
  const j = JSON.parse(out);
  if (j.error) { console.log("ERROR:", j.error); process.exit(1); }
  writeFileSync("scratch/tetra-net.svg", j.svg, "utf8");
  const dashed = [...j.svg.matchAll(/<(?:line|path)[^>]*stroke-dasharray[^>]*>/g)].length;
  const lines = [...j.svg.matchAll(/<line\b[^>]*>/g)].length;
  console.log(`line 태그 ${lines}개 · stroke-dasharray 붙은 것 ${dashed}개`);
  for (const m of j.svg.matchAll(/<line\b[^>]*>/g)) console.log("  ", m[0]);
});
