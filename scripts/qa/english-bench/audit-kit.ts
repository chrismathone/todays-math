/**
 * 오늘의 영어 — 사람 감사지 만들기 · 채점 (D-151 · 25 §12.8 「5」).
 *
 * 기계로는 모르는 둘을 사람이 잰다:
 *   A. **변형형 키 감사** — 강사가 어법 · 빈칸 추론 · 문장 삽입 30문항(유형별 10)을 정답 · 해설을 가리고 푼다.
 *      «틀린 키가 저장되는 비율»을 아는 길은 이것뿐이다(결정적 검사의 «정답 오류» 판정은 정밀도 0~41%).
 *   B. **가림 풀이** — 학생이 주제 · 내용 일치 20문항(유형별 10)을 **지문 없이** 푼다. 우연(20%)을 뚜렷이 넘으면
 *      보기만으로 답이 가려진다는 뜻이다(AI 탐침은 천장에 붙어 못 쟀다 — 25 §12.9).
 *
 *   만들기  npx tsx scripts/qa/english-bench/audit-kit.ts --out <폴더> [--seed 20261001]
 *           (먼저 `generate.ts --taskset audit` 로 <폴더>/gen 을 채운다)
 *   채점    npx tsx scripts/qa/english-bench/audit-kit.ts --out <폴더> --score
 *
 * 결과(<폴더>/audit/): teacher.html · student.html(인쇄용 — 키 없음) · key.html · key.json(따로 보관) ·
 *   teacher-record.csv · student-record.csv(적어 넣는 표). 🔴 표본은 고정 씨앗으로 뽑는다 — 다시 돌려도 같은 문항이다.
 * DB · AI 를 부르지 않는다. 저장소 뿌리에서 돌린다(지면 글꼴을 `public/fonts` 에서 읽어 파일 안에 싣는다).
 *
 * 지면(원장님 2026-10-01 «인쇄하기 좋도록») — 발문 · 보기는 제품 지면과 같은 규칙(`splitEnglishUnderline` ·
 *   `englishOptionLayout`)과 같은 글꼴(명조 본문 · 고딕 이름표)로 그린다. 문항은 쪽에 걸쳐 쪼개지 않고, 문항 머리 오른쪽에
 *   답 칸 · 강사용은 문항 아래 흠 표시 칸 · 쪽 아래 «시트 이름 · 쪽 / 전체». 정답지 맨 위는 빠른 정답표(채점용).
 *   화면에서도 A4 한 장씩 나뉜다(«A4 사이즈 크기로 분할») — 열 때 실제 높이로 재서 장에 담는다(`PAGINATE`). 화면의 한 장 = 인쇄 한 쪽.
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import {
  englishDraftSchema,
  type EnglishQuestion,
  type EnglishQuestionType,
} from "@/contracts/english.contract";
import { coerceEnglishDraftShape } from "@/lib/english/chatgpt";
import {
  ENGLISH_CHOICE_MARKS as MARKS,
  englishOptionLayout,
} from "@/lib/english/options";
import { splitEnglishUnderline } from "@/lib/english/underline";
import { validateEnglishDraft } from "@/lib/english/validate";

import type { GenRecord } from "./generate";
import { flag } from "./util";

const VARIANT: EnglishQuestionType[] = ["어법", "빈칸 추론", "문장 삽입"];
const READING: EnglishQuestionType[] = ["주제", "내용 일치"];
const PER_TYPE = 10;

interface Item {
  id: string;
  part: "A" | "B";
  file: string;
  question: number;
  type: EnglishQuestionType;
  prompt: string;
  options: string[];
  answer: string;
  explanation: string;
}

/** 고정 씨앗 난수(mulberry32) — 표본이 실행마다 바뀌면 감사 결과를 문항에 되짚을 수 없다 */
function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(list: readonly T[], next: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** 발문 — 제품 지면과 같은 규칙: 어법의 `<u>…</u>` 만 밑줄(번호는 선 밖), 그 밖은 글자 그대로 */
function promptHtml(item: Item): string {
  // 삽입 자리 «( ④ )» 가 줄 끝에서 «(» 와 «④ )» 로 갈리지 않게 한 덩이로 묶는다
  const text = (value: string) =>
    escapeHtml(value).replace(
      /\(\s*[①-⑤]\s*\)/g,
      (slot) => `<span class="slot">${slot}</span>`,
    );
  const parts =
    item.type === "어법" ? splitEnglishUnderline(item.prompt) : null;
  if (!parts) return text(item.prompt);
  return parts
    .map((part) =>
      part.underline ? `<u>${text(part.text)}</u>` : text(part.text),
    )
    .join("");
}

/** 보기를 한 줄에 모으는 · 두 칸으로 놓는 글자 상한 — 어법의 밑줄 구간처럼 짧은 보기를 다섯 줄로 세우면 쪽만 는다 */
const INLINE_CHOICE_CHARS = 24;
const PAIRED_CHOICE_CHARS = 32;

/** 보기 줄 — 제품 지면과 같은 규칙(`englishOptionLayout`): 발문에 ( ① ) 자리가 다 있으면 보기 줄을 찍지 않는다 */
function choicesHtml(item: Item): string {
  const layout = englishOptionLayout(item);
  if (layout.omitted || !layout.lines.length) return "";
  const longest = Math.max(
    ...layout.lines.map((line) => line.text.trim().length),
  );
  const shape =
    longest <= INLINE_CHOICE_CHARS
      ? " inline"
      : longest <= PAIRED_CHOICE_CHARS
        ? " paired"
        : "";
  return `<ol class="choices${shape}">${layout.lines
    .map(
      (line) =>
        `<li><span>${line.mark}</span><span>${escapeHtml(line.text)}</span></li>`,
    )
    .join("")}</ol>`;
}

const box = (label: string) => `<span><i class="box"></i>${label}</span>`;

/** 문항 — 번호(발문과 같은 명조) · 발문 · 보기 · 오른쪽 답 칸. 유형은 묶음 머리에 있어 문항마다 다시 적지 않는다 */
function itemHtml(item: Item, teacher: boolean): string {
  const flags = teacher
    ? `<p class="flags">${box("답이 없다")}${box("답이 둘 이상이다")}${box("판정할 수 없다")}<span class="memo">메모<i class="line"></i></span></p>`
    : "";
  return `<article class="item"><span class="id">${item.id}</span><div class="itemBody"><span class="answer">답<i class="answerBox"></i></span><p class="prompt">${promptHtml(item)}</p>${choicesHtml(item)}${flags}</div></article>`;
}

/**
 * 지면 글꼴을 파일 안에 싣는다 — 제품 지면의 명조(`NotoSerifKR-subset`)와 이름표의 Pretendard.
 * 원장님 PC 에는 둘 다 깔려 있지 않아 이름만 적으면 바탕 · 맑은 고딕으로 떨어진다(`src/app/fonts.ts` · 05 §8.23.2).
 * 옆에 둔 글꼴 파일은 file:// 로 연 쪽에서 막힐 수 있어 data: 로 넣는다(감사지 한 장 약 5MB).
 */
function fontFaces(): string {
  const face = (family: string, file: string, weight: string) =>
    `@font-face{font-family:"${family}";src:url(data:font/woff2;base64,${readFileSync(
      path.join(process.cwd(), "public", "fonts", file),
    ).toString(
      "base64",
    )}) format("woff2");font-weight:${weight};font-style:normal;font-display:block}`;
  return (
    face("Audit Serif", "NotoSerifKR-subset.woff2", "100 900") +
    face("Audit Sans", "PretendardVariable.woff2", "45 920")
  );
}

const SERIF = `"Audit Serif", "Noto Serif KR", "Nanum Myeongjo", Batang, serif`;
const SANS = `"Audit Sans", Pretendard, "Malgun Gothic", sans-serif`;

/** 색 · 굵기 · 크기는 제품 지면(`EnglishPrint.module.css` · `tokens.ts`)을 따른다 — 금색 선 · 명조 본문 · 고딕 이름표 */
const pageCss = `
:root { --ink: #0E0E10; --ink70: #3A3A40; --ink50: #6B6B72; --ink30: #A0A0A8; --ink15: #D4D4D8; --ink08: #E8E8EB; --gold: #A57F00; }
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; background: #fff; }
body { color: var(--ink); font-family: ${SANS}; font-size: 10pt; line-height: 1.5; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

/* A4 한 장 = 화면의 한 장 = 인쇄의 한 쪽. 여백 위 14 · 좌우 16 · 아래 18mm(쪽 번호 자리) */
.sheet { position: relative; width: 210mm; height: 297mm; padding: 14mm 16mm 0; overflow: hidden; background: #fff; }
.sheetBody { height: 265mm; overflow: hidden; }
.sheetBody > :first-child { margin-top: 0; }
.sheetFoot { position: absolute; right: 16mm; bottom: 8mm; left: 16mm; color: var(--ink50); font-size: 8pt; text-align: center; }
.flow { width: 210mm; padding: 14mm 16mm 16mm; background: #fff; }
@media screen {
  body { background: var(--ink08); padding: 16px 0 48px; }
  .sheet, .flow { margin: 0 auto 16px; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12); }
  .howto { width: 210mm; margin: 0 auto 12px; padding: 10px 14px; border: 1px solid var(--ink30); background: #fff; font-size: 13px; line-height: 1.6; color: var(--ink70); }
  .howto b { color: var(--ink); }
}
@media print {
  body { padding: 0; }
  .howto { display: none; }
  .sheet { margin: 0; box-shadow: none; break-after: page; page-break-after: always; }
  .sheet:last-child { break-after: auto; page-break-after: auto; }
}

.head { margin-bottom: 2mm; }
.headRow { display: flex; justify-content: space-between; gap: 6mm; font-size: 7.5pt; font-weight: 700; letter-spacing: 0.14em; }
.brand { color: var(--gold); }
.tag { color: var(--ink70); }
h1 { margin: 2mm 0 0; font-family: ${SERIF}; font-size: 18pt; font-weight: 800; letter-spacing: -0.01em; line-height: 1.35; }
.rules { margin: 2.5mm 0 0; padding-left: 4.5mm; color: var(--ink70); font-size: 9pt; line-height: 1.6; word-break: keep-all; }
.rules b { color: var(--ink); }
.nameLine { display: flex; flex-wrap: wrap; gap: 2mm 9mm; margin-top: 3.5mm; padding-top: 3mm; border-top: 1px solid var(--gold); color: var(--ink70); font-size: 9.5pt; }
.field { display: inline-flex; align-items: flex-end; gap: 2mm; }
.field i { display: inline-block; height: 1.1em; border-bottom: 1px solid var(--ink50); }

h2 { display: flex; align-items: baseline; gap: 3mm; margin: 6mm 0 0; padding-bottom: 1.5mm; border-bottom: 1.5px solid var(--ink); font-size: 11pt; font-weight: 800; break-after: avoid; page-break-after: avoid; }
h2 small { color: var(--ink50); font-size: 8.5pt; font-weight: 400; }

.item { display: grid; grid-template-columns: 9mm minmax(0, 1fr); column-gap: 2.5mm; align-items: start; padding: 3mm 0 3.5mm; border-bottom: 1px solid var(--ink15); break-inside: avoid; page-break-inside: avoid; }
.id { font-family: ${SERIF}; font-size: 10.5pt; font-weight: 800; line-height: 1.65; }
.itemBody { min-width: 0; }
.itemBody::after { content: ""; display: block; clear: both; }
.answer { float: right; display: inline-flex; align-items: center; gap: 1.5mm; margin: 0 0 1mm 4mm; color: var(--ink70); font-size: 8.5pt; font-weight: 700; }
.answerBox { display: inline-block; width: 11mm; height: 7mm; border: 1px solid var(--ink); }
.prompt { margin: 0; font-family: ${SERIF}; font-size: 10.5pt; line-height: 1.65; white-space: pre-wrap; word-break: keep-all; overflow-wrap: anywhere; }
.slot { white-space: nowrap; }
.prompt u { text-decoration-thickness: 1px; text-underline-offset: 0.3em; text-decoration-skip-ink: none; }
.choices { list-style: none; margin: 1.2mm 0 0 3mm; padding: 0; font-family: ${SERIF}; font-size: 10.5pt; line-height: 1.6; word-break: keep-all; }
.choices li { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 0 1.5mm; }
.choices li span:last-child { overflow-wrap: anywhere; }
.choices.inline { display: flex; flex-wrap: wrap; gap: 0.5mm 7mm; }
.choices.inline li { display: inline-grid; }
.choices.paired { display: grid; grid-template-columns: 1fr 1fr; gap: 0 6mm; }
.flags { display: flex; flex-wrap: wrap; align-items: center; gap: 1.5mm 5mm; margin: 2.5mm 0 0; color: var(--ink70); font-size: 8.5pt; }
.flags span { display: inline-flex; align-items: center; gap: 1.2mm; }
.box { display: inline-block; width: 3.2mm; height: 3.2mm; border: 1px solid var(--ink70); }
.flags .memo { flex: 1; min-width: 50mm; }
.memo .line { flex: 1; height: 1.1em; border-bottom: 1px solid var(--ink30); }

table { width: 100%; border-collapse: collapse; table-layout: fixed; }
th, td { border: 1px solid var(--ink30); padding: 1.5mm 2mm; text-align: left; vertical-align: top; }
thead th { background: var(--ink08); font-size: 8.5pt; white-space: nowrap; }
tr { break-inside: avoid; page-break-inside: avoid; }
.quick { margin-top: 2.5mm; }
.quick th { background: var(--ink08); font-size: 8.5pt; text-align: center; }
.quick td { padding: 1mm; font-family: ${SERIF}; font-size: 12.5pt; text-align: center; }
.explain { margin-top: 2.5mm; font-size: 9pt; line-height: 1.55; }
.explain .mark { font-family: ${SERIF}; font-size: 12pt; text-align: center; }
.explain .text { font-family: ${SERIF}; word-break: keep-all; overflow-wrap: anywhere; }
.explain .src { color: var(--ink50); font-size: 7.5pt; overflow-wrap: anywhere; }
`;

const HOWTO = `<p class="howto"><b>인쇄</b> — Ctrl+P · 용지 <b>A4</b> · 배율 <b>기본(100%)</b> · 여백 <b>기본</b> · <b>«머리글과 바닥글» 끄기</b>. 화면의 한 장이 종이 한 쪽입니다. 이 안내는 인쇄되지 않습니다.</p>`;

/**
 * A4 장 나누기(원장님 2026-10-01 «A4 사이즈 크기로 분할해서») — 글꼴을 다 읽은 뒤 블록(머리 · 묶음 머리 · 문항 · 표)을
 * 차례로 장에 담고, 넘치면 다음 장으로 넘긴다. 문항은 쪼개지 않는다 · 묶음 머리는 첫 문항과 같이 간다 ·
 * 정답 · 해설 표(`split`)는 줄 단위로 나누고 장마다 머리 줄을 다시 단다. 장보다 큰 블록은 그 장에 둔다(지금 표본엔 없다).
 * 크기는 실제 그린 높이로 잰다 — 글자 수로 어림하면 글꼴 · 줄바꿈이 다른 자리에서 어긋난다.
 * 다 나누면 `<html data-paged="장 수">` — PDF 로 뽑는 쪽이 이것을 기다린다.
 */
const PAGINATE = `(function () {
  var flow = document.getElementById("flow");
  function paginate() {
    var label = flow.getAttribute("data-footer");
    var holder = document.createElement("div");
    holder.className = "sheets";
    flow.parentNode.insertBefore(holder, flow);
    var body = null;
    function newSheet() {
      var sheet = document.createElement("section");
      sheet.className = "sheet";
      body = document.createElement("div");
      body.className = "sheetBody";
      var foot = document.createElement("div");
      foot.className = "sheetFoot";
      sheet.appendChild(body);
      sheet.appendChild(foot);
      holder.appendChild(sheet);
    }
    function over() {
      return body.scrollHeight > body.clientHeight + 1;
    }
    function moveOn(node) {
      body.removeChild(node);
      var last = body.lastElementChild;
      var carry = last && last.tagName === "H2" && body.children.length > 1 ? last : null;
      newSheet();
      if (carry) body.appendChild(carry);
      body.appendChild(node);
    }
    function place(node) {
      body.appendChild(node);
      if (over() && body.children.length > 1) moveOn(node);
    }
    function placeTable(table) {
      var rows = Array.prototype.slice.call(table.tBodies[0].rows);
      var shell = table.cloneNode(true);
      shell.tBodies[0].innerHTML = "";
      var current = shell.cloneNode(true);
      body.appendChild(current);
      rows.forEach(function (row) {
        current.tBodies[0].appendChild(row);
        if (!over()) return;
        if (current.tBodies[0].rows.length > 1) {
          current.tBodies[0].removeChild(row);
          newSheet();
          current = shell.cloneNode(true);
          body.appendChild(current);
          current.tBodies[0].appendChild(row);
        } else if (body.children.length > 1) moveOn(current);
      });
    }
    newSheet();
    Array.prototype.slice.call(flow.children).forEach(function (node) {
      if (node.tagName === "TABLE" && node.classList.contains("split")) placeTable(node);
      else place(node);
    });
    flow.parentNode.removeChild(flow);
    var sheets = holder.children;
    for (var i = 0; i < sheets.length; i += 1)
      sheets[i].lastChild.textContent = label + "  ·  " + (i + 1) + " / " + sheets.length;
    document.documentElement.setAttribute("data-paged", String(sheets.length));
  }
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(paginate);
})();`;

function page(
  title: string,
  footer: string,
  fonts: string,
  body: string,
): string {
  return `<!doctype html>\n<html lang="ko"><head><meta charset="utf-8"><title>${title}</title><style>${fonts}${pageCss}</style></head><body>${HOWTO}<main id="flow" class="flow" data-footer="${escapeHtml(footer)}">${body}</main><script>${PAGINATE}</script></body></html>\n`;
}

const field = (label: string, width: number) =>
  `<span class="field">${label}<i style="width:${width}mm"></i></span>`;

function head(
  tag: string,
  title: string,
  rules: string[],
  fields: string[],
): string {
  return `<header class="head"><div class="headRow"><span class="brand">오늘의 영어 · 사람 감사</span><span class="tag">${tag}</span></div><h1>${title}</h1><ul class="rules">${rules.map((rule) => `<li>${rule}</li>`).join("")}</ul>${fields.length ? `<div class="nameLine">${fields.join("")}</div>` : ""}</header>`;
}

/** 출처 줄 — «openai_gpt-6-luna_medium__H03-night-flowers.json» → «H03-night-flowers» (전체 이름은 key.json 에) */
const sourceOf = (file: string) =>
  file
    .replace(/\.json$/, "")
    .split("__")
    .pop() ?? file;

function collect(
  out: string,
): { file: string; questions: EnglishQuestion[] }[] {
  const sets: { file: string; questions: EnglishQuestion[] }[] = [];
  for (const name of readdirSync(path.join(out, "gen")).sort()) {
    if (!name.endsWith(".json")) continue;
    const record = JSON.parse(
      readFileSync(path.join(out, "gen", name), "utf8"),
    ) as GenRecord;
    if (!record.parsed) continue;
    const verdict = validateEnglishDraft(
      coerceEnglishDraftShape(record.draft, "deepseek"),
    );
    // 저장 검증을 못 지난 세트는 제품에서도 저장되지 않는다 — 감사 대상이 아니다
    if (!verdict.ok) continue;
    sets.push({
      file: name,
      questions: englishDraftSchema.parse(verdict.draft).questions,
    });
  }
  return sets;
}

function sample(
  sets: { file: string; questions: EnglishQuestion[] }[],
  types: EnglishQuestionType[],
  part: "A" | "B",
  next: () => number,
): Item[] {
  const items: Item[] = [];
  for (const type of types) {
    const pool = sets.flatMap((set) =>
      set.questions.flatMap((question, index) =>
        question.type === type ? [{ set, question, index }] : [],
      ),
    );
    for (const { set, question, index } of shuffled(pool, next).slice(
      0,
      PER_TYPE,
    ))
      items.push({
        id: "",
        part,
        file: set.file,
        question: index + 1,
        type,
        prompt: question.prompt,
        options: question.options,
        answer: question.answer,
        explanation: question.explanation,
      });
  }
  return items.map((item, i) => ({
    ...item,
    id: `${part}${String(i + 1).padStart(2, "0")}`,
  }));
}

function build(out: string, seed: number) {
  const sets = collect(out);
  if (!sets.length) throw new Error(`저장 검증을 지난 세트가 없다: ${out}/gen`);
  const next = random(seed);
  const teacher = sample(sets, VARIANT, "A", next);
  const student = sample(sets, READING, "B", next);
  const dir = path.join(out, "audit");
  mkdirSync(dir, { recursive: true });

  const fonts = fontFaces();
  const byType = (items: Item[], teacherSheet: boolean) =>
    [...new Set(items.map((item) => item.type))]
      .map((type) => {
        const mine = items.filter((item) => item.type === type);
        return `<h2>${type}<small>${mine[0]!.id} – ${mine.at(-1)!.id} · ${mine.length}문항</small></h2>${mine
          .map((item) => itemHtml(item, teacherSheet))
          .join("")}`;
      })
      .join("");

  writeFileSync(
    path.join(dir, "teacher.html"),
    page(
      "오늘의 영어 — 변형형 키 감사(강사용)",
      "변형형 키 감사 · 강사용",
      fonts,
      head(
        `강사용 · ${teacher.length}문항`,
        "변형형 키 감사",
        [
          "정답 · 해설을 보지 않고 풉니다. 고른 보기 번호를 <b>답 칸</b>에 적습니다.",
          "문항에 흠이 있으면 그 문항 아래 칸에 표시합니다 — 답이 없다 · 답이 둘 이상이다 · 판정할 수 없다. 이유는 메모에 짧게.",
          "변형 문항은 발문 안의 글만 보고 풉니다(원 지문은 주지 않습니다).",
        ],
        [field("이름", 38), field("날짜", 28), field("걸린 시간", 14) + "분"],
      ) + byType(teacher, true),
    ),
  );
  writeFileSync(
    path.join(dir, "student.html"),
    page(
      "오늘의 영어 — 가림 풀이(학생용)",
      "지문 없이 풀기 · 학생용",
      fonts,
      head(
        `학생용 · ${student.length}문항`,
        "지문 없이 풀기",
        [
          "지문은 없습니다. 보기만 보고 가장 알맞다고 생각하는 보기 번호를 <b>답 칸</b>에 적습니다.",
          "모르는 문항도 비우지 말고 하나를 고릅니다.",
        ],
        [field("이름", 38), field("학년", 16), field("날짜", 28)],
      ) + byType(student, false),
    ),
  );
  const all = [...teacher, ...student];
  const markOf = (item: Item) =>
    MARKS[Number(item.answer) - 1] ?? escapeHtml(item.answer);
  const quick = [teacher, student]
    .flatMap((items) =>
      Array.from({ length: Math.ceil(items.length / 10) }, (_, row) =>
        items.slice(row * 10, row * 10 + 10),
      ),
    )
    .map(
      (row) =>
        `<tr>${row.map((item) => `<th>${item.id}</th>`).join("")}</tr><tr>${row.map((item) => `<td>${markOf(item)}</td>`).join("")}</tr>`,
    )
    .join("");
  writeFileSync(
    path.join(dir, "key.html"),
    page(
      "오늘의 영어 — 감사지 정답(따로 보관)",
      "감사지 정답 · 따로 보관",
      fonts,
      head(
        "정답지 · 따로 보관",
        "감사지 정답",
        [
          "<b>풀기 전에 보지 않습니다</b> — 강사용 · 학생용과 따로 보관합니다.",
          "적힌 답은 teacher-record.csv · student-record.csv 에 옮긴 뒤 audit-kit.ts --score 로 채점합니다(답은 숫자 1~5).",
        ],
        [],
      ) +
        `<h2>빠른 정답표<small>강사용 A · 학생용 B</small></h2><table class="quick">${quick}</table><h2>정답 · 해설<small>${all.length}문항</small></h2><table class="explain split"><colgroup><col style="width:13mm"><col style="width:18mm"><col style="width:11mm"><col style="width:30mm"><col></colgroup><thead><tr><th>번호</th><th>유형</th><th>정답</th><th>세트 · 문항</th><th>해설</th></tr></thead><tbody>${all
          .map(
            (item) =>
              `<tr><td>${item.id}</td><td>${item.type}</td><td class="mark">${markOf(item)}</td><td class="src">${escapeHtml(sourceOf(item.file))}<br>${item.question}번</td><td class="text">${escapeHtml(item.explanation)}</td></tr>`,
          )
          .join("")}</tbody></table>`,
    ),
  );
  writeFileSync(
    path.join(dir, "key.json"),
    JSON.stringify(
      {
        seed,
        items: all.map(({ id, part, file, question, type, answer }) => ({
          id,
          part,
          file,
          question,
          type,
          answer,
        })),
      },
      null,
      2,
    ),
  );
  // 적어 넣는 표 — 이미 있으면 덮어쓰지 않는다(적어 둔 결과를 지우지 않게)
  const teacherCsv = path.join(dir, "teacher-record.csv");
  if (!existsSync(teacherCsv))
    writeFileSync(
      teacherCsv,
      `id,answer,flag,memo\n${teacher.map((item) => `${item.id},,,`).join("\n")}\n`,
    );
  const studentCsv = path.join(dir, "student-record.csv");
  if (!existsSync(studentCsv))
    writeFileSync(
      studentCsv,
      `student,${student.map((item) => item.id).join(",")}\n`,
    );
  console.log(
    `세트 ${sets.length} · 강사용 ${teacher.length}문항(${VARIANT.map((t) => `${t} ${teacher.filter((i) => i.type === t).length}`).join(" · ")}) · 학생용 ${student.length}문항(${READING.map((t) => `${t} ${student.filter((i) => i.type === t).length}`).join(" · ")})`,
  );
  console.log(`→ ${dir}`);
}

/** 우연(20%)과 견주는 한쪽 이항 검정의 p 값 — 표본이 작아 정확 계산을 쓴다 */
export function binomialTail(n: number, k: number, p: number): number {
  let sum = 0;
  for (let i = k; i <= n; i += 1) {
    let c = 1;
    for (let j = 0; j < i; j += 1) c = (c * (n - j)) / (j + 1);
    sum += c * p ** i * (1 - p) ** (n - i);
  }
  return Math.min(1, sum);
}

function rows(file: string): string[][] {
  return readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => line.split(",").map((cell) => cell.trim()));
}

function score(out: string) {
  const dir = path.join(out, "audit");
  const key = (
    JSON.parse(readFileSync(path.join(dir, "key.json"), "utf8")) as {
      items: { id: string; type: string; answer: string }[];
    }
  ).items;
  const byId = new Map(key.map((item) => [item.id, item]));

  // A. 강사 — 키와 다른 답 · 흠 표시. flag: none(답이 없다) · multi(둘 이상) · unsure(판정 불가)
  const teacher = rows(path.join(dir, "teacher-record.csv")).slice(1);
  const solved = teacher.filter((row) => row[1] || row[2]);
  console.log(
    `A. 변형형 키 감사 — 적힌 문항 ${solved.length} / ${teacher.length}`,
  );
  for (const type of VARIANT) {
    const mine = solved.filter((row) => byId.get(row[0]!)?.type === type);
    const differ = mine.filter(
      (row) => row[1] && row[1] !== byId.get(row[0]!)!.answer,
    );
    const flagged = mine.filter((row) => row[2]);
    console.log(
      `   ${type}: ${mine.length}문항 · 키와 다른 답 ${differ.length}(${differ.map((r) => r[0]).join(" ")}) · 흠 표시 ${flagged.length}(${flagged.map((r) => `${r[0]}:${r[2]}`).join(" ")})`,
    );
  }

  // B. 학생 — 유형별 정답률과 우연(20%) 대비
  const table = rows(path.join(dir, "student-record.csv"));
  const head = table[0]!.slice(1);
  const students = table.slice(1);
  console.log(`B. 가림 풀이 — 학생 ${students.length}명`);
  for (const type of READING) {
    let n = 0;
    let k = 0;
    for (const row of students)
      head.forEach((id, i) => {
        const item = byId.get(id);
        const answer = row[i + 1];
        if (!item || item.type !== type || !answer) return;
        n += 1;
        if (answer === item.answer) k += 1;
      });
    if (!n) {
      console.log(`   ${type}: 적힌 답 없음`);
      continue;
    }
    const p = binomialTail(n, k, 0.2);
    console.log(
      `   ${type}: ${k} / ${n} = ${((k / n) * 100).toFixed(0)}% · 우연 20% 대비 p=${p.toFixed(3)} — ${p < 0.05 ? "우연을 넘는다(보기만으로 답이 가려진다)" : "미판정(표본을 늘린다)"}`,
    );
  }
  console.log(
    "⚠️ 같은 학생의 답은 서로 독립이 아니다 — p 값은 탐색용이다. 학생 수를 늘려 다시 본다.",
  );
}

function main() {
  const out = flag("--out");
  if (!out) throw new Error("--out <폴더> 가 필요하다");
  if (process.argv.includes("--score")) score(out);
  else build(out, Number(flag("--seed") ?? 20261001));
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("audit-kit.ts")) main();
