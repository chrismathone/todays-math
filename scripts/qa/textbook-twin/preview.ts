/**
 * 교과서 쌍둥이 시범 — 원장님 검토용 미리보기 (2026-10-21).
 *
 *   npx tsx scripts/qa/textbook-twin/preview.ts <sources.jsonl> <묶음 폴더> <저장소 밖 출력 폴더>
 *
 *   review.html   문항마다 원본(교과서) ↔ 쌍둥이 나란히 · 상태 · 두 풀이 · 검수 · 너무 닮음 수치
 *   student.html  통과한 쌍둥이의 학생 면 — 정답 없음
 *   answers.html  학생 면과 같은 순서의 정답 · 풀이
 *
 * 🔴 검수용 미리보기다 — 시험지 지면이 아니다(D-07 · `scripts/middle/gen-cli.ts` 의 HTML 과 같은 자리).
 * 🔴 review.html 에는 교과서 글 · 그림이 든다 — 저장소 밖에만 쓴다.
 * 수식은 제품 렌더러 `renderMathHtml`. 쌍둥이 그림은 동결된 SVG 바이트 그대로.
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { join, relative, resolve, sep } from "node:path";

import { renderMathHtml } from "../../../src/lib/math/renderMathHtml";

type Source = {
  problemCode: string;
  semester: number;
  chapter: string;
  section: string;
  questionType: string;
  difficulty: string;
  materialKind: string;
  trustedDbText: boolean;
  dbContent: string;
  dbAnswer: string;
  origContent: string;
  origAnswer: string | null;
  figures: { file: string }[];
};
type Candidate = {
  content: string;
  choices: string[];
  answer: string;
  solution: string;
  figureArtifacts: { svgPath: string }[];
  metadata: {
    similarity: {
      verdict: string;
      overlap4: number;
      longestRun: number;
      numberRetention: number;
    };
    engine: { typeKey: string } | null;
  };
};
type CollectRow = {
  round?: string;
  problemCode: string;
  twinExternalId: string;
  status: string;
  reasons: string[];
  solves: Record<string, { verdict: string; answer: string }>;
  review?: { verdict?: string | null };
};
type Collect = { tally: Record<string, number>; rows: CollectRow[] };

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const stageLabel: Record<string, string> = {
  author: "저작",
  figure: "그림",
  engine: "엔진",
  shape: "형식",
  "source-copy": "원문 복제 의심",
};
const matchLabel: Record<string, string> = {
  match: "일치",
  different: "불일치",
  hold: "확인 필요",
};
const similarityLabel: Record<string, string> = {
  pass: "문턱 미만",
  warn: "경고",
  manual: "짧은 글 별도 검토",
  hold: "보류",
};

/** 제품과 같은 순환점 규칙(`gen-cli.ts` 와 같은 이유 — 손으로 베끼면 검수 화면만 갈린다) */
function repeatDotCss(): string {
  const css = readFileSync(
    resolve(process.cwd(), "src/app/globals.css"),
    "utf8",
  );
  const start = css.indexOf(".repeat-dot {");
  const end = css.indexOf("}", css.indexOf(".repeat-dot::before {"));
  if (start < 0 || end < 0)
    throw new Error("globals.css 에서 .repeat-dot 규칙을 못 찾았습니다");
  return css.slice(start, end + 1);
}

const lines = (text: string): string =>
  (text ?? "")
    .split("\n")
    .map((line) => renderMathHtml(line))
    .join("<br/>");

function twinBlock(c: Candidate, bundle: string, showAnswers = true): string {
  const choices = (c.choices as string[])
    .map((t, i) => `<div>${"①②③④⑤"[i]} ${renderMathHtml(t)}</div>`)
    .join("");
  const fig = (c.figureArtifacts as { svgPath: string }[])
    .map(
      (a) =>
        `<div class="fig">${readFileSync(join(bundle, a.svgPath), "utf8")}</div>`,
    )
    .join("");
  const body = c.content.includes("[그림]")
    ? c.content.split("[그림]").map(lines).join(fig)
    : lines(c.content) + fig;
  return `<div class="content">${body}</div><div class="choices">${choices}</div>
${showAnswers ? `<div class="ans">정답: ${renderMathHtml(c.answer)}</div><div class="sol">${lines(c.solution)}</div>` : ""}`;
}

function originalBlock(s: Source, outDir: string): string {
  const figs = (s.figures as { file: string }[])
    .map(
      (f) =>
        `<div class="fig"><img src="${esc(relative(outDir, f.file).split(sep).join("/"))}"/></div>`,
    )
    .join("");
  const body = s.trustedDbText
    ? `<div class="content">${lines(s.dbContent)}</div>`
    : `<pre class="content">${esc(s.origContent)}</pre><div class="meta">(SSD 원본 한글 수식 — DB 글은 대조가 «다른 문항»)</div>`;
  const answer = s.trustedDbText
    ? renderMathHtml(s.dbAnswer)
    : esc(s.origAnswer ?? "");
  return `${body}${figs}<div class="ans">정답: ${answer}</div>`;
}

function externalReviewIssues(bundle: string, id: string): string[] {
  const file = join(bundle, "reviews", `${id}.json`);
  if (!existsSync(file)) return [];
  const pointer = JSON.parse(readFileSync(file, "utf8")) as {
    externalReview: string;
    sha256: string;
  };
  const bytes = readFileSync(pointer.externalReview);
  if (createHash("sha256").update(bytes).digest("hex") !== pointer.sha256)
    throw new Error(`검수 원장 해시 불일치: ${id}`);
  return (
    (JSON.parse(bytes.toString("utf8")) as { parsed?: { issues?: string[] } })
      .parsed?.issues ?? []
  );
}

const CSS = `
body{font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;margin:24px auto;padding:0 16px;color:#1a1a1a;max-width:1180px}
h1{font-size:18px} h2{font-size:15px;margin:28px 0 6px}
.item{border:1px solid #ddd;border-radius:8px;padding:12px 14px;margin:12px 0;break-inside:avoid}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.pair>div{min-width:0}
.label{font-size:12px;color:#666;margin-bottom:4px}
.meta{font-size:12px;color:#888;margin:4px 0}
.status{font-size:13px;font-weight:600}
.status.pass{color:#0a6b2e}.status.hold{color:#b00020}
.content{font-size:14.5px;line-height:1.7;white-space:normal}
pre.content{white-space:pre-wrap;font-family:inherit}
.choices{font-size:14px;line-height:1.7;margin-top:4px}
.fig{margin:6px 0}.fig svg,.fig img{max-width:300px;height:auto}
.ans{margin-top:6px;font-size:13.5px;color:#1a56db;font-weight:600}
.sol{margin-top:4px;font-size:12.5px;color:#555;line-height:1.6;border-top:1px dashed #eee;padding-top:4px}
.notes{font-size:12px;color:#444;margin-top:6px}
.tools{position:sticky;top:0;background:#fff;padding:10px 0;border-bottom:1px solid #ddd;display:flex;flex-wrap:wrap;gap:12px;align-items:center;z-index:1}
.tools a{white-space:nowrap}
.tools input,.tools select{font:inherit;padding:6px;border:1px solid #aaa;border-radius:4px}
.item[hidden]{display:none}
@media (max-width:760px){.pair{grid-template-columns:1fr}}
@media print{body{max-width:none}.item{page-break-inside:avoid}.tools{display:none}}
`;

function page(title: string, body: string): string {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(title)}</title>
<link rel="stylesheet" href="assets/katex/katex.min.css"/>
<style>${CSS}${repeatDotCss()}</style></head><body>${body}</body></html>`;
}

function main(): void {
  const [sourcesFile, bundle, outDir] = process.argv.slice(2);
  if (!sourcesFile || !bundle || !outDir)
    throw new Error("preview.ts <sources.jsonl> <묶음> <출력 폴더>");
  mkdirSync(outDir, { recursive: true });
  const outputRoot = realpathSync(outDir);
  const repoRoot = realpathSync(process.cwd());
  if (outputRoot === repoRoot || outputRoot.startsWith(repoRoot + sep))
    throw new Error("교과서 글이 든다 — 저장소 밖에 쓰시오");
  cpSync(resolve("node_modules/katex/dist"), join(outDir, "assets/katex"), {
    recursive: true,
  });
  const sources = new Map<string, Source>(
    readFileSync(sourcesFile, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l) as Source)
      .map((s) => [s.problemCode, s]),
  );
  const collect = JSON.parse(
    readFileSync(join(bundle, "collect.json"), "utf8"),
  ) as Collect;
  const holds = JSON.parse(
    readFileSync(join(bundle, "holds.json"), "utf8"),
  ) as { problemCode: string; stage: string; reason: string }[];
  const rowsByCode = new Map<string, CollectRow>(
    collect.rows.map((r) => [r.problemCode, r]),
  );
  const holdByCode = new Map(holds.map((h) => [h.problemCode, h]));
  const review: string[] = [];
  const student: string[] = [];
  const answers: string[] = [];
  let section = "";
  let n = 0;
  for (const s of [...sources.values()].sort((a, b) =>
    `${a.semester}${a.chapter}${a.section}${a.problemCode}`.localeCompare(
      `${b.semester}${b.chapter}${b.section}${b.problemCode}`,
    ),
  )) {
    if (s.section !== section) {
      section = s.section;
      review.push(`<h2>${esc(s.chapter)} › ${esc(s.section)}</h2>`);
    }
    const row = rowsByCode.get(s.problemCode);
    const hold = holdByCode.get(s.problemCode);
    const meta = `${s.problemCode} · ${s.chapter} › ${s.section} · ${s.questionType} · ${s.difficulty} · ${s.materialKind}`;
    if (!row) {
      review.push(`<section class="item" data-status="hold"><div class="meta">${esc(meta)}</div><div class="pair"><div><div class="label">교과서 대조 자료</div>${originalBlock(s, outDir)}</div>
<div><div class="label">쌍둥이</div><div class="status hold">보류 — ${esc(stageLabel[hold?.stage ?? ""] ?? hold?.stage ?? "")}: ${esc(hold?.reason ?? "")}</div></div></div></section>`);
      continue;
    }
    const rowBundle = row.round ? join(bundle, row.round) : bundle;
    const c = JSON.parse(
      readFileSync(
        join(rowBundle, "candidates", `${row.twinExternalId}.json`),
        "utf8",
      ),
    ) as Candidate;
    const solves = Object.entries(row.solves)
      .map(
        ([k, v]) =>
          `${k} ${matchLabel[v.verdict] ?? v.verdict}(${esc(String(v.answer))})`,
      )
      .join(" · ");
    const sim = c.metadata.similarity;
    const reviewIssues = externalReviewIssues(rowBundle, row.twinExternalId);
    const engine = c.metadata.engine
      ? ` · 엔진 ${esc(c.metadata.engine.typeKey)}`
      : " · AI 저자";
    const notes = `<div class="notes">풀이: ${solves || "없음"} · 유사도 ${similarityLabel[sim.verdict] ?? sim.verdict}(겹침 ${sim.overlap4} · 이어진 글 ${sim.longestRun}자 · 수 보존 ${sim.numberRetention}) · 검수 ${row.review?.verdict === "pass" ? "통과" : row.review?.verdict === "hold" ? "보류" : "대기"}${row.reasons.length ? ` · ${esc(row.reasons.join(" / "))}` : ""}${reviewIssues.length ? ` · 검수 지적: ${esc(reviewIssues.join(" / "))}` : ""}</div>`;
    review.push(`<section class="item" data-status="${row.status === "통과" ? "pass" : "hold"}"><div class="meta">${esc(meta)}${engine}</div>
<div class="status ${row.status === "통과" ? "pass" : "hold"}">${esc(row.status)}</div>
<div class="pair"><div><div class="label">교과서 대조 자료</div>${originalBlock(s, outDir)}</div><div><div class="label">쌍둥이 ${esc(row.round ?? "")}</div>${twinBlock(c, rowBundle)}</div></div>${notes}</section>`);
    if (row.status === "통과") {
      n += 1;
      student.push(
        `<section class="item"><div class="meta">${n}. ${esc(s.section)} · ${esc(s.problemCode)}</div>${twinBlock(c, rowBundle, false)}</section>`,
      );
      answers.push(
        `<section class="item"><div class="meta">${n}. ${esc(s.section)} · ${esc(s.problemCode)}</div><div class="ans">${renderMathHtml(c.answer)}</div><div class="sol">${lines(c.solution)}</div></section>`,
      );
    }
  }
  const tally = Object.entries(collect.tally)
    .map(([k, v]) => `${esc(k)} ${v}`)
    .join(" · ");
  const tools = `<div class="tools"><label>상태 <select id="status"><option value="all">전체</option><option value="pass">통과</option><option value="hold">보류</option></select></label><label>찾기 <input id="query" placeholder="문항 코드 또는 단원"/></label><a href="student.html">학생용</a><a href="answers.html">정답·풀이</a></div>`;
  const filter = `<script>function filter(){const q=document.querySelector('#query').value.toLowerCase();const s=document.querySelector('#status').value;document.querySelectorAll('.item').forEach(x=>x.hidden=(s!=='all'&&x.dataset.status!==s)||!x.textContent.toLowerCase().includes(q));}document.querySelector('#query').addEventListener('input',filter);document.querySelector('#status').addEventListener('change',filter);</script>`;
  writeFileSync(
    join(outDir, "review.html"),
    page(
      "쌍둥이 검토",
      `<h1>교과서 쌍둥이 시범 — 미래엔 중2(황선욱) ${sources.size}문항</h1><p>미등록 검토본 · 원본과 비교하여 유형·난이도·표현을 검토합니다. 통과는 이번 시범의 검산·검수 결과이며 출제 승인이 아닙니다.</p><p class="meta">대조 자료는 원장에 따라 DB 글 또는 SSD 추출문을 보여 줍니다. 비교 그림의 SSD 문항 대응과 2022 성취기준 코드 대조는 미확인입니다.</p><div class="meta">${tally} · 적재 0</div>${tools}${review.join("\n")}${filter}`,
    ),
  );
  writeFileSync(
    join(outDir, "student.html"),
    page(
      "쌍둥이 문항",
      `<h1>교과서 쌍둥이 — 통과 ${n}문항 · 학생용 검토본</h1><div class="tools"><a href="review.html">원본 비교</a><a href="answers.html">정답·풀이</a></div>${student.join("\n")}`,
    ),
  );
  writeFileSync(
    join(outDir, "answers.html"),
    page(
      "쌍둥이 정답·풀이",
      `<h1>교과서 쌍둥이 — 정답·풀이 ${n}문항</h1><div class="tools"><a href="student.html">학생용</a><a href="review.html">원본 비교</a></div>${answers.join("\n")}`,
    ),
  );
  console.log(`review.html · student.html(통과 ${n}) → ${outDir}`);
}

main();
