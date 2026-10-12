/** Local, self-contained before/after review packet; never connects to the DB. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { renderMathHtml } from "../../../src/lib/math/renderMathHtml";
import {
  recoveryCandidateSchema,
  type RecoveryCandidate,
  type RecoverySnapshot,
} from "../../../src/lib/import/schoolTextbook/recovery";

const root = process.cwd();
const args = process.argv.slice(2);
const arg = (key: string, fallback: string) =>
  args.includes(key) ? args[args.indexOf(key) + 1]! : fallback;
const draftDir = path.resolve(
  arg("--drafts", "scripts/import/textbook/recovery-20261009"),
);
const destination = path.resolve(
  arg(
    "--out",
    "docs/planning/tracks/reports/textbook-recovery-review-20261009/recovery.html",
  ),
);
const snapshot = JSON.parse(
  readFileSync(
    arg("--snapshot", ".qa-artifacts/textbook-recovery-live-20261009.json"),
    "utf8",
  ),
) as { rows: RecoverySnapshot[] };
const before = new Map(snapshot.rows.map((row) => [row.problemCode, row]));
const candidates = [
  "corrections-a.json",
  "corrections-b.json",
  "rewrites.json",
].flatMap((file) => {
  const batch = JSON.parse(readFileSync(path.join(draftDir, file), "utf8"));
  return (batch.entries as unknown[]).map((entry) =>
    recoveryCandidateSchema.parse(entry),
  );
});
const escape = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const labels = {
  correction: "교정",
  rewrite: "변형",
  unchanged: "원문 유지",
  blocked: "미해결",
};
const assets = new Map<string, string>();
function figure(url: string) {
  if (!/^\/figures\/[\w./-]+\.(png|jpe?g|svg)$/.test(url) || url.includes(".."))
    throw new Error("Unexpected asset path");
  if (!assets.has(url)) {
    const mime = url.endsWith(".svg")
      ? "image/svg+xml"
      : /\.jpe?g$/.test(url)
        ? "image/jpeg"
        : "image/png";
    assets.set(
      url,
      `data:${mime};base64,${readFileSync(path.join(root, "public", url)).toString("base64")}`,
    );
  }
  return `<figure><img src="${assets.get(url)}" alt="문항 그림"><figcaption>${escape(url)}</figcaption></figure>`;
}
function body(
  row: Pick<
    RecoveryCandidate,
    "content" | "answer" | "solution" | "figureUrls" | "figureSvg"
  >,
) {
  const segments = row.content.split("[그림]");
  const content = segments
    .map(
      (segment, i) =>
        `${i ? (row.figureSvg && i === 1 ? `<figure><img src="data:image/svg+xml;base64,${Buffer.from(row.figureSvg).toString("base64")}" alt="문항 도형"></figure>` : row.figureUrls[i - 1] ? figure(row.figureUrls[i - 1]!) : '<b class="error">그림 누락</b>') : ""}${renderMathHtml(segment)}`,
    )
    .join("");
  return `<div class="problem">${content}</div><p class="answer"><strong>정답</strong> ${renderMathHtml(row.answer)}</p><div class="solution"><strong>해설</strong> ${renderMathHtml(row.solution ?? "해설 없음")}</div>`;
}
const cards = candidates
  .map((candidate) => {
    const original = before.get(candidate.problemCode);
    if (!original) throw new Error(`Unknown code: ${candidate.problemCode}`);
    return `<article id="${escape(candidate.problemCode)}" data-kind="${candidate.kind}"><header><h2>${escape(candidate.problemCode)}</h2><span>${labels[candidate.kind]}</span></header><div class="comparison"><section><h3>원본</h3>${body(original)}</section><section><h3>${candidate.kind === "rewrite" ? "독립 변형본" : "교정 후보"}</h3>${body(candidate)}</section></div><details><summary>수정 이유와 검증 근거</summary><p>${escape(candidate.notes)}</p><p><strong>수학</strong> ${escape(candidate.validation.math)}</p><p><strong>그림</strong> ${escape(candidate.validation.visual)}</p>${candidate.remainingIssues.map((issue) => `<p class="error">${escape(issue)}</p>`).join("")}</details></article>`;
  })
  .join("\n");
const katexDir = path.join(root, "node_modules/katex/dist");
const katexCss = readFileSync(
  path.join(katexDir, "katex.min.css"),
  "utf8",
).replace(
  /src:url\(([^)]+\.woff2)\) format\("woff2"\)[^;}]*/g,
  (_match, font: string) =>
    `src:url(data:font/woff2;base64,${readFileSync(path.join(katexDir, font)).toString("base64")}) format("woff2")`,
);
const counts = Object.entries(labels)
  .map(
    ([kind, label]) =>
      `${label} ${candidates.filter((candidate) => candidate.kind === kind).length}`,
  )
  .join(" · ");
const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>교과서 475문항 복구 검토</title><style>${katexCss}
*{box-sizing:border-box}body{margin:0;background:#f4f6fa;color:#14253e;font:15px/1.7 system-ui,sans-serif}main{max-width:1600px;margin:auto;padding:20px}h1{font-size:25px;margin:0}h2{font-size:17px;margin:0}h3{font-size:13px;color:#49607d;margin:0 0 16px}p{margin:12px 0}.intro{margin-bottom:20px}.filters{display:flex;gap:10px;position:sticky;top:0;background:#f4f6fa;padding:12px 0;z-index:2}input,select{font:inherit;padding:9px;border:1px solid #bdcadc;border-radius:6px}input{flex:1;min-width:0}article{background:white;border:1px solid #d5deeb;border-radius:10px;margin-bottom:18px;overflow:hidden}article[hidden]{display:none}header{display:flex;justify-content:space-between;padding:12px 18px;background:#edf2fa;border-bottom:1px solid #d5deeb}.comparison{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}section{padding:20px;min-width:0;overflow-wrap:anywhere}section+section{border-left:1px solid #d5deeb}.problem{min-height:80px}.answer,.solution{background:#f7f9fc;padding:12px}.solution{font-size:14px}figure{margin:14px 0}img{display:block;max-width:100%;max-height:440px;object-fit:contain;height:auto}figcaption{font-size:10px;color:#637691;overflow-wrap:anywhere}details{padding:12px 18px;border-top:1px solid #e0e5ee}summary{cursor:pointer}.error{color:#b42318}.katex-display{overflow-x:auto;overflow-y:hidden}.katex{font-size:1.05em}small{color:#516680}@media(max-width:760px){main{padding:10px}.comparison{grid-template-columns:1fr}section+section{border-left:0;border-top:1px solid #d5deeb}section{padding:14px}.filters{flex-wrap:wrap}h1{font-size:21px}}@media print{.filters{display:none}main{padding:0}article{break-inside:avoid}details{display:none}}
</style><main><div class="intro"><h1>교과서 475문항 복구 검토</h1><p>${escape(counts)}</p><small>원본과 교정·변형 후보를 비교하는 자료입니다. 자동 검사는 사람의 출제 검수를 대신하지 않으며, 이 화면에서 승인이나 데이터 저장은 발생하지 않습니다.</small></div><div class="filters"><input id="query" type="search" aria-label="문항 번호나 내용 검색" placeholder="문항 번호·내용 검색"><select id="kind" aria-label="처리 유형"><option value="">전체</option>${Object.entries(
  labels,
)
  .map(([key, value]) => `<option value="${key}">${value}</option>`)
  .join(
    "",
  )}</select><span id="count">${candidates.length}문항</span></div>${cards}</main><script>
const query=document.getElementById('query'),kind=document.getElementById('kind'),cards=[...document.querySelectorAll('article')];function filter(){let count=0;const text=query.value.trim().toLowerCase();for(const card of cards){const show=(!kind.value||card.dataset.kind===kind.value)&&(!text||card.textContent.toLowerCase().includes(text));card.hidden=!show;if(show)count++}document.getElementById('count').textContent=count+'문항'}query.addEventListener('input',filter);kind.addEventListener('change',filter);
</script></html>`;
mkdirSync(path.dirname(destination), { recursive: true });
writeFileSync(destination, html);
console.log(
  JSON.stringify({
    file: destination,
    count: candidates.length,
    uniqueFigures: assets.size,
    bytes: Buffer.byteLength(html),
  }),
);
