import { renderMathHtml } from "../src/lib/math/renderMathHtml";
const s = process.argv[2]!;
const html = renderMathHtml(s);
console.log("red?", html.includes("katex-error") || html.includes("#cc0000"));
console.log(html.slice(0, 600));
