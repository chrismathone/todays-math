// 수식 안 맨 % 가 지면에서 사라지나 — 제품 렌더러로 직접 그려 본다. 읽기만 한다.
import { renderMathHtml } from "@/lib/math/renderMathHtml";
import { db } from "@/lib/db";
const B = String.fromCharCode(92);
const ANNO = new RegExp(
  "<annotation[^>]*>[" + B + "s" + B + "S]*?</annotation>",
  "g",
);
const TAG = new RegExp("<[^>]+>", "g");
function seen(src: string) {
  const h = renderMathHtml(src);
  const vis = h.replace(ANNO, "").replace(TAG, "");
  const flags = [
    h.includes("math-raw") ? "math-raw" : "",
    h.includes("katex-error") ? "katex-error" : "",
  ].filter(Boolean);
  return `${vis.includes("%") ? "% 보임" : "🔴 % 사라짐"}${flags.length ? " · " + flags.join(",") : ""}`;
}
async function main() {
  for (const s of [
    "$35%$ 이다",
    "$35" + B + "%$ 이다",
    "$" +
      B +
      "frac{7}{20}" +
      B +
      "times 100=35" +
      B +
      "left( %" +
      B +
      "right)$",
  ]) {
    console.log(JSON.stringify(s).padEnd(60), "→", seen(s));
  }
  const rows = await db.problem.findMany({
    where: { examId: "2025-gangdong-3-2-mid", questionNumber: 17 },
    select: { content: true },
  });
  for (const r of rows) {
    const i = r.content.indexOf("%");
    console.log(
      "DB 강동중 문17 % 앞뒤:",
      JSON.stringify(r.content.slice(Math.max(0, i - 40), i + 20)),
    );
    const line = r.content.split("\n").find((l) => l.includes("%")) ?? "";
    console.log("  그 줄을 제품 렌더러로:", seen(line));
  }
  await db.$disconnect();
}
main().catch((e) => {
  console.error(String(e).slice(0, 300));
  process.exit(1);
});
