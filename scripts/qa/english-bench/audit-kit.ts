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
 * DB · AI 를 부르지 않는다.
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
import { validateEnglishDraft } from "@/lib/english/validate";

import type { GenRecord } from "./generate";
import { flag } from "./util";

const VARIANT: EnglishQuestionType[] = ["어법", "빈칸 추론", "문장 삽입"];
const READING: EnglishQuestionType[] = ["주제", "내용 일치"];
const PER_TYPE = 10;
const MARKS = ["①", "②", "③", "④", "⑤"];

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

/** 글을 HTML 로 — 꺾쇠는 전부 글자로 두고 `<u>` · `</u>` 표기만 밑줄로 되살린다 */
const proseHtml = (text: string) =>
  escapeHtml(text)
    .replace(/&lt;u&gt;/gi, "<u>")
    .replace(/&lt;\/u&gt;/gi, "</u>");

const bareMarks = (options: string[]) =>
  options.length > 0 &&
  options.every((option, i) => option.trim() === MARKS[i]);

function itemHtml(item: Item, record: string): string {
  const options = bareMarks(item.options)
    ? `<p class="row">${MARKS.join("&emsp;")}</p>`
    : `<ol>${item.options.map((option, i) => `<li><span>${MARKS[i]}</span><span>${proseHtml(option)}</span></li>`).join("")}</ol>`;
  return `<article><h3>${item.id} <small>${item.type}</small></h3><p class="prompt">${proseHtml(item.prompt)}</p>${options}${record}</article>`;
}

const PAGE_CSS = `
@page { size: A4; margin: 15mm; }
body { margin: 0; font-family: "Noto Sans KR", "Malgun Gothic", sans-serif; font-size: 11pt; line-height: 1.6; color: #111; }
main { max-width: 180mm; margin: 0 auto; padding: 8mm 0; }
h1 { margin: 0 0 4px; font-size: 16pt; }
.lead { margin: 0 0 10px; font-size: 10pt; }
.name { margin: 0 0 14px; padding: 8px 0; border-top: 1px solid #111; border-bottom: 1px solid #111; font-size: 10pt; }
h2 { margin: 18px 0 6px; font-size: 12pt; border-bottom: 1px solid #999; }
article { break-inside: avoid; margin: 0 0 16px; }
h3 { margin: 0 0 4px; font-size: 11pt; }
h3 small { font-weight: 400; color: #555; }
.prompt, ol, .row { font-family: "Nanum Myeongjo", "Noto Serif KR", Batang, Georgia, serif; }
.prompt { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
.prompt u { text-decoration-thickness: 1px; text-underline-offset: 0.3em; text-decoration-skip-ink: none; }
ol { list-style: none; margin: 6px 0 0; padding: 0; }
li { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 0 6px; }
.row { margin: 6px 0 0; }
.record { margin: 8px 0 0; padding: 6px 8px; border: 1px solid #999; font-size: 9.5pt; }
table { border-collapse: collapse; font-size: 10pt; }
th, td { border: 1px solid #999; padding: 3px 8px; text-align: left; vertical-align: top; }
`;

const page = (title: string, body: string) =>
  `<!doctype html>\n<html lang="ko"><meta charset="utf-8"><title>${title}</title><style>${PAGE_CSS}</style><main>${body}</main></html>\n`;

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

  const byType = (items: Item[], record: (item: Item) => string) =>
    [...new Set(items.map((item) => item.type))]
      .map(
        (type) =>
          `<h2>${type}</h2>${items
            .filter((item) => item.type === type)
            .map((item) => itemHtml(item, record(item)))
            .join("")}`,
      )
      .join("");

  writeFileSync(
    path.join(dir, "teacher.html"),
    page(
      "오늘의 영어 — 변형형 키 감사(강사용)",
      `<h1>변형형 키 감사 — 강사용</h1>
<p class="lead">정답 · 해설을 보지 않고 풉니다. 문항마다 고른 답을 적고, 문항에 흠이 있으면 해당 칸에 표시합니다. 변형 문항은 발문 안의 글만 보고 풉니다(원 지문은 주지 않습니다).</p>
<p class="name">이름 ________________ · 날짜 ____ . ____ . ____ · 걸린 시간 ______ 분</p>
${byType(teacher, () => `<p class="record">고른 답 (　　) · □ 답이 없다 · □ 답이 둘 이상이다 · □ 판정할 수 없다 · 메모 ______________________________</p>`)}`,
    ),
  );
  writeFileSync(
    path.join(dir, "student.html"),
    page(
      "오늘의 영어 — 가림 풀이(학생용)",
      `<h1>지문 없이 풀기</h1>
<p class="lead">지문은 없습니다. 보기만 보고 가장 알맞다고 생각하는 번호에 표시합니다. 모든 문항에 하나씩 고릅니다.</p>
<p class="name">이름 ________________ · 학년 ______ · 날짜 ____ . ____ . ____</p>
${byType(student, () => "")}`,
    ),
  );
  const all = [...teacher, ...student];
  writeFileSync(
    path.join(dir, "key.html"),
    page(
      "오늘의 영어 — 감사지 정답(따로 보관)",
      `<h1>감사지 정답 — 풀기 전에 보지 않습니다</h1>
<table><thead><tr><th>번호</th><th>유형</th><th>정답</th><th>세트 · 문항</th><th>해설</th></tr></thead><tbody>${all
        .map(
          (item) =>
            `<tr><td>${item.id}</td><td>${item.type}</td><td>${MARKS[Number(item.answer) - 1] ?? escapeHtml(item.answer)}</td><td>${escapeHtml(item.file.replace(/\.json$/, ""))} · ${item.question}번</td><td>${proseHtml(item.explanation)}</td></tr>`,
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
