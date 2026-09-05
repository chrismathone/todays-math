/**
 * 기출 1편(정화중 25-2-중간)을 **저장소의 기존 이관 파이프라인**으로 초안까지 만든다.
 *
 *   npx tsx scripts/import/exam-paper/build-exam-drafts.ts <작업폴더>
 *
 * 변환기를 새로 만들지 않는다 — `convertPastExamPaper` 가 이미 있다(18 §연장 색인).
 *
 * ## 🔴 본문의 정본은 **HWP** 다 — PDF 텍스트층이 아니다
 *
 * 처음엔 완료 PDF 의 텍스트층에서 뽑은 `body.json` 을 본문으로 썼다. 그런데 그쪽은
 * **조판을 잃는다** — 실측으로
 *
 *   문5  보기가 `tan 35° + tan 50° 8`   ← 분수가 풀려 8 이 뒤로 떨어졌다
 *   문10 `$_{6}$ CT $=5$ BC`            ← 호 표시와 계수가 통째로 깨졌다
 *   문12 발문이 **통째로 없다**
 *   문3  상자 ㉠~㉣ 구조가 `•` 로 뭉갰다
 *   문1·4·6…  `\overline` 가 전부 사라졌다 (선분이 그냥 두 글자가 된다)
 *
 * 같은 `(완료)` 짝의 HWP 에는 그 전부가 **수식 스크립트로** 살아 있다
 * (`$rmbarAF$` → `\overline{AF}`). 그래서 본문·보기는 HWP 에서 가져오고,
 * PDF 쪽은 **대조용**으로만 쓴다(한글+숫자 열쇠로 19문항 전량 0.89 이상 — 같은 시험지다).
 *
 * ## 🔴 그런데 HWP 쪽에도 **다른** 오염이 있다 — 그리고 그중 하나는 개인정보다
 *
 * 문19 발문 끝에 `정답 / 워드:○○○t / 오검:○○○t / 완료:○○○t` 가 붙어 있다.
 * 검수자 실명이다 — **DB 에 들어가면 안 된다.** 문3 에는 연구회 꼬리말이 붙었다.
 * 걷어 낸 뒤 **남았는지 다시 세고**, 그 검사가 살아 있는지 일부러 걸리는 글로 확인한다.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { blocksToLatex } from "../../../src/lib/import/blocksToLatex";
import {
  convertPastExamPaper,
  normalizePastExamPaper,
  type PastExamAnswer,
  type PastExamPaper,
} from "../../../src/lib/import/convertPastExam";

const DIR = process.argv[2];
if (!DIR) throw new Error("사용: <작업폴더>");

const read = (f: string): unknown =>
  JSON.parse(readFileSync(join(DIR, f), "utf-8"));

interface HwpQuestion {
  number: number;
  type: string;
  score: number;
  topic: string;
  difficulty: string;
  answer: string | null;
  solution: string | null;
}

const hwp = read("answers.json") as { questions: HwpQuestion[] };
const pdf = read("body.json") as PastExamPaper;
const piece = new Map(
  (read("hwp_fixed.json") as { id: string; text: string }[]).map((r) => [
    r.id,
    r.text,
  ]),
);
const solFixed = new Map(
  (read("sol_fixed.json") as { id: string; text: string }[]).map((r) => [
    r.id,
    r.text,
  ]),
);

// ── ㉠ 발문에 붙은 지면 오염을 걷는다 ───────────────────────────────────────
interface Scrub {
  name: string;
  re: RegExp;
  probe: string;
}
const SCRUBS: Scrub[] = [
  {
    // 🔴 검수자 실명 — 개인정보다. 문서 끝의 「정답 / 워드: / 오검: / 완료:」 블록.
    name: "검수자 실명 블록",
    re: /\s*정답\s*(?:(?:워드|오검|검토|검수|완료|출제)\s*[::][^\n]*\s*)+$/u,
    probe:
      "…개수를 구하시오.\n \n정답\n워드:홍길동t\n오검:김철수t \n완료:홍길동t",
  },
  {
    name: "연구회 꼬리말",
    re: /\s*(?:[가-힣]+(?:광역시|특별시|도)\s*)?내신\s*수학\s*연구회\s*/gu,
    probe: "…이다.\n대구광역시 내신 수학 연구회\n",
  },
  {
    // 배점은 `score` 컬럼이 정본이다. 지면에 두면 우리 시험지의 배점과 어긋난다
    // (2026-08-29 「가짜 번호가 지면에 거짓말을 찍는다」와 같은 자리).
    name: "총 배점 표시",
    re: /\s*\[총\s*\$?\d+\$?\s*점\]\s*/gu,
    probe: "다음 물음에 답하시오. [총 $10$점]\n⑴ …",
  },
];

/**
 * 이 편의 학교. **메타에만 남고 지면에는 안 나간다.**
 *
 * 🔴 원장님 지시(2026-09-06): *「문제에 〈정화〉 같은 학교 추측 가능한 문제들은
 * 다른 이름으로 교체할 것, 적절한 네임으로」*. 실제로 문14 발문이
 * 「**정화**는 매직아일랜드가 있는 C지점으로부터…」로 학교 이름을 **사람 이름처럼**
 * 쓰고 있었다. 지면 머리띠는 `JH중` 으로 가려 두었는데 **본문이 그 가림을 무의미하게**
 * 만든다.
 *
 * 바꾸는 것과 남았는지 세는 것이 **같은 값 하나**(`SCHOOL_STEM`)를 본다 — 두 벌이면
 * 한쪽만 고쳐도 아무도 모른다.
 */
const SCHOOL = "정화중";
/** 학교를 가리키는 알맹이 (`정화중` → `정화`). */
const SCHOOL_STEM = SCHOOL.replace(/(?:여자)?(?:중학교|고등학교|중|고)$/u, "");

/**
 * 걷는 것이 아니라 **바꾸는 것.** 지우면 문장이 무너진다(「는 매직아일랜드가…」).
 *
 * ⚠️ **장소 이름은 그대로 둔다.** 롯데월드·잠실역·석촌호수는 학교를 안 가리키고,
 *    원본 그림(지도)에 그대로 있으므로 본문만 바꾸면 오히려 어긋난다
 *    (원장님 확정 「기출문제는 그림 완전 이전이 생명」).
 */
const RENAMES: (Scrub & { to: string })[] = [
  {
    name: "🔴 학교를 추측할 수 있는 사람 이름",
    re: new RegExp(SCHOOL_STEM, "gu"),
    to: "수아",
    probe: `${SCHOOL_STEM}는 매직아일랜드가 있는 지점으로부터`,
  },
];

/** 걷어 낸 **뒤에** 남으면 안 되는 것. 각 항목도 probe 로 눈금을 맞춘다. */
const FORBIDDEN: Scrub[] = [
  {
    // 참을 `SCHOOL` 하나에서 가져온다. 바꾸기가 새면 여기서 멈춘다.
    name: "🔴 학교를 추측할 수 있는 이름",
    re: new RegExp(SCHOOL_STEM, "u"),
    probe: `${SCHOOL_STEM}는 매직아일랜드로 갔다`,
  },
  {
    name: "🔴 개인정보(검수자 실명)",
    re: /(?:워드|오검|검토|검수|완료|출제)\s*[::]\s*[가-힣]/u,
    probe: "완료:홍길동t",
  },
  {
    name: "🔴 이름 + t 꼬리",
    re: /[가-힣]{2,4}\s*t(?![a-z])/u,
    probe: "황수영t",
  },
  {
    name: "연구회 꼬리말",
    re: /내신\s*수학\s*연구회/u,
    probe: "내신 수학 연구회",
  },
  {
    // 제어문자는 리터럴로 적으면 파일이 깨진다 — 문자열에서 짓는다.
    name: "NUL 등 제어문자",
    re: new RegExp("[\u0000-\u0008\u000B\u000C\u000E-\u001F]", "u"),
    probe: "a" + String.fromCharCode(0) + "b",
  },
];

for (const s of [...SCRUBS, ...RENAMES, ...FORBIDDEN]) {
  const changed = s.re.test(s.probe);
  s.re.lastIndex = 0;
  if (!changed) {
    throw new Error(`[중단] 눈금이 안 걸린다: ${s.name} — 판정을 거부한다`);
  }
}
// 바꾸기는 「걸리나」로 부족하다 — **바뀐 글에 그 이름이 없어야** 한다.
for (const r of RENAMES) {
  r.re.lastIndex = 0;
  const after = r.probe.replace(r.re, r.to);
  r.re.lastIndex = 0;
  if (r.re.test(after))
    throw new Error(`[중단] 바꾸기가 제 눈금도 못 지운다: ${r.name}`);
  r.re.lastIndex = 0;
}
console.log(
  `눈금 통과 — 걷기 ${SCRUBS.length}개 · 바꾸기 ${RENAMES.length}개 · ` +
    `금지 ${FORBIDDEN.length}개 전부 살아 있다`,
);

function scrub(text: string): { out: string; hits: string[] } {
  let out = text;
  const hits: string[] = [];
  for (const s of SCRUBS) {
    s.re.lastIndex = 0;
    const before = out;
    out = out.replace(s.re, s.re.flags.includes("g") ? " " : "");
    if (out !== before) hits.push(s.name);
  }
  return { out: out.replace(/[ \t]{2,}/g, " ").trim(), hits };
}

// ── ㉡ 해설에서 정답 앞머리를 뗀다 ──────────────────────────────────────────
/**
 * `정답 …해설…` 한 덩어리에서 앞머리를 뗀다. 경계 표시가 없으므로 **모양으로** 자른다 —
 * 앞머리는 `$…$` 조각 · ⑴~⑽ 표시 · 공백 · `해설참조` 로만 이루어진다.
 * ⚠️ 마지막 표시 뒤에 수식이 하나도 없으면 그 표시는 **해설의 것**이라 되돌려 준다
 *    (문19 `⑴ $4$ ⑵ $40$` 다음에 곧바로 `⑴ 원 위의 점이 …`).
 */
function splitAnswer(text: string): { answer: string; solution: string } {
  const m = /^\s*정답\s*/.exec(text);
  if (!m) return { answer: "", solution: text.trim() };
  const rest = text.slice(m[0].length);
  const TOKEN = /^(\$[^$]*\$|[⑴-⑽]|해설참조|[\s,·]+)/;
  let i = 0;
  let lastMark = -1;
  for (;;) {
    const t = TOKEN.exec(rest.slice(i));
    if (!t) break;
    if (/^[⑴-⑽]$/.test(t[1])) lastMark = i;
    i += t[1].length;
  }
  if (lastMark >= 0 && !/\$/.test(rest.slice(lastMark, i))) i = lastMark;
  return {
    answer: rest.slice(0, i).replace(/\s+/g, " ").trim(),
    solution: rest.slice(i).trim(),
  };
}

// ── ㉢ 상자 마커 — HWP 는 **틀 구조를 잃는다**. 그것을 아는 것은 PDF 쪽이다 ────
//
// 원본 지면에서 문3 의 ㉠~㉣ 은 **테두리 상자** 안에 있다(p1.png). HWP 추출은 그 틀을
// 잃고 네 줄만 준다. 반대로 PDF 텍스트층 추출은 `<상자>` 마커를 남긴다.
// 그러니 마커의 출처는 **내가 아니라 다른 추출본**이다 — 없는 것을 지어내지 않는다.
//
// 규칙: PDF 발문에 상자 마커가 있고 HWP 발문에 없으면, HWP 발문의 **첫 항목 앞**에 붙인다.
// 첫 항목을 못 찾으면 **멈춘다**(조용히 안 붙이면 그 문항만 지면에서 상자를 잃는다).
// 상자를 그리는 규칙은 `src/lib/math/boxBlock.ts` 가 갖고 있다 — 여기서 옮겨 적지 않는다.
//
// 🔴 **PDF 가 찾은 이름을 그대로 쓴다 — 없는 이름을 지어내지 않는다.** (원장님 지적)
//
// 앞 회차는 어느 경우든 `<상자>` 를 넣었고, 지면이 그 낱말을 **라벨로 그렸다**.
// 원본 지면을 렌더해 보니 문3 은 **테두리만 있고 머리 라벨이 없다** — 지면에
// 〈상자〉라는 없던 이름이 찍혀 나간 것이다.
// 원장님 확정: *「원문에 〈보기〉〈조건〉 없으면 붙이지 말 것」* (D-119 ⑹ 을 뒤집는다).
// 그래서 `보기`·`조건` 은 그대로 두고, 추출기의 **총칭** 마커 `상자` 만
// 머리 없는 상자 `<나열>` 로 옮긴다.
const BOX_MARKER_RE =
  /[<〈［[＜《≪〔【]\s*(보\s*기|조\s*건|상\s*자)\s*[>〉］\]＞》≫〕】]/;
/** 추출기의 총칭 마커 → 머리 없는 상자. 라벨이 있는 것은 이름을 지킨다. */
const GENERIC_BOX_LABEL = "상자";
const HEADERLESS_BOX_LABEL = "나열";
/** 상자 첫 항목의 표지. `boxBlock.ts` 의 계열 첫 원소들에서 왔다. */
const FIRST_ITEM_RE = new RegExp(
  "(㉠|㈀|㉮|㈎|Ⓐ" +
    "|\\(\\s*ㄱ\\s*\\)" +
    "|(?<![(（])ㄱ\\s*[.)]" +
    "|(?:^|[\\n\\s])가\\s*[.)])",
);

function restoreBoxMarker(stem: string, fromPdf: string, n: number): string {
  const found = BOX_MARKER_RE.exec(fromPdf);
  if (!found || BOX_MARKER_RE.test(stem)) return stem;
  // PDF 가 부른 이름. 총칭(`상자`)이면 머리 없는 상자로 바꾸고, 진짜 라벨은 지킨다.
  const raw = found[1]!.replace(/\s+/g, "");
  const label = raw === GENERIC_BOX_LABEL ? HEADERLESS_BOX_LABEL : raw;
  const m = FIRST_ITEM_RE.exec(stem);
  if (!m) {
    throw new Error(
      `[중단] 문${n}: PDF 는 상자가 있다는데 HWP 발문에서 **첫 항목을 못 찾았다** — ` +
        "손으로 보고 규칙을 고칠 것",
    );
  }
  console.log(
    `  문${n} 상자 복원: 첫 항목 «${m[1].trim()}» 앞에 <${label}> 를 넣는다` +
      (label === raw ? "" : ` (PDF 총칭 «${raw}» → 머리 없는 상자)`),
  );
  return `${stem.slice(0, m.index)}<${label}> ${stem.slice(m.index)}`;
}

// ── ㉢ 배점 — **정본은 PDF 쪽이다.** 근거는 본문 밖에 있다: 합이 100점이어야 한다 ──
//
// HWP 추출은 문17·문19 에서 3점·4점을 내놓는다. 그 둘은 소문항이 있는 문항이고,
// 지면에는 `[총 10점]` 이라 적혀 있다 — 추출기가 **마지막 소문항 배점**을 집은 것으로
// 보인다. 어느 쪽이 옳은지는 문항 안에서 못 가른다. 가르는 것은 **합계**다:
//   HWP 87점 · PDF 100점.  시험지 총점은 100 이다.
const pdfScore = new Map(
  (pdf.questions ?? []).map((q) => [q.number, q.score ?? 0]),
);
const scoreOf = new Map<number, number>();
let scoreSwap = 0;
for (const q of hwp.questions) {
  const fromPdf = pdfScore.get(q.number);
  if (fromPdf !== undefined && Math.abs(fromPdf - q.score) > 1e-6) {
    scoreSwap += 1;
    console.log(
      `  문${q.number} 배점: PDF ${fromPdf}점 ← HWP ${q.score}점 (PDF 를 쓴다)`,
    );
  }
  scoreOf.set(q.number, fromPdf ?? q.score);
}
const total = [...scoreOf.values()].reduce((a, b) => a + b, 0);
if (Math.abs(total - 100) > 0.05) {
  throw new Error(`[중단] 배점 합이 ${total} 점이다 — 100 이어야 한다`);
}
console.log(`배점 합 ${total}점 · PDF 로 바꾼 자리 ${scoreSwap}개`);

// ── ㉣ 초안 ────────────────────────────────────────────────────────────────
let scrubbed = 0;
const questions = hwp.questions.map((q) => {
  const pdfStem = (
    (pdf.questions ?? []).find((x) => x.number === q.number)?.contents ?? []
  )
    .map((c) => c.value ?? "")
    .join(" ");
  const scrubbed0 = scrub(piece.get(`${q.number}-stem`) ?? "");
  const hits = scrubbed0.hits;
  const stem = restoreBoxMarker(scrubbed0.out, pdfStem, q.number);
  if (hits.length > 0) {
    scrubbed += 1;
    console.log(`  문${q.number} 걷음: ${hits.join(" · ")}`);
  }
  // 이미 LaTeX 인 글이 blocksToLatex 를 지나며 **바뀌면** 멈춘다 — 그 함수는 OCR
  // 텍스트를 위한 것이라, 우리 입력에서 무슨 짓을 하는지 말없이 넘기지 않는다.
  const through = blocksToLatex([{ type: "text", value: stem }]).content;
  if (through !== stem) {
    throw new Error(
      `[중단] 문${q.number} 발문이 blocksToLatex 를 지나며 바뀌었다:\n  전: ${stem}\n  후: ${through}`,
    );
  }
  const choices = [] as {
    number: number;
    contents: { type: string; value: string }[];
  }[];
  for (let i = 1; ; i += 1) {
    const c = piece.get(`${q.number}-c${i}`);
    if (c === undefined) break;
    choices.push({ number: i, contents: [{ type: "text", value: c }] });
  }
  return {
    number: q.number,
    score: scoreOf.get(q.number)!,
    type: q.type,
    topic: q.topic,
    difficulty: q.difficulty,
    contents: [{ type: "text", value: stem }],
    choices,
  };
});

const answers: PastExamAnswer[] = hwp.questions.map((q) => {
  const text = solFixed.get(String(q.number));
  if (!text)
    return {
      number: q.number,
      answer: q.answer ?? "",
      topic: q.topic,
      difficulty: q.difficulty,
    };
  const { answer, solution } = splitAnswer(text);
  return {
    number: q.number,
    answer: answer || q.answer || "",
    solution,
    topic: q.topic,
    difficulty: q.difficulty,
  };
});

const paper = normalizePastExamPaper({
  questions: questions as PastExamPaper["questions"],
  meta: {
    exam_id: "2025-jeonghwa-3-2-mid",
    school: SCHOOL, // 지면에는 JH중 으로 가려져 있다(원장님 요청). 메타에만 남긴다.
    grade: "중3",
    subject: "수학",
  },
  _sourceFile: readFileSync(join(DIR, "source_path.txt"), "utf-8").trim(),
});

/** 학교를 추측할 수 있는 이름을 바꾼다. 아래 `FORBIDDEN` 이 남았는지 다시 센다. */
function rename(text: string | null | undefined): string | null {
  if (text === null || text === undefined) return null;
  let out = text;
  for (const r of RENAMES) {
    r.re.lastIndex = 0;
    out = out.replace(r.re, r.to);
  }
  return out;
}

const renamed: string[] = [];
const drafts = convertPastExamPaper(paper, answers).map((d, i) => {
  const content = rename(d.content)!;
  const answer = rename(d.answer)!;
  const solution = rename(d.solution);
  if (content !== d.content || answer !== d.answer || solution !== d.solution)
    renamed.push(`문${d.questionNumber}`);
  return {
    ...d,
    content,
    answer,
    solution,
    // HWP 가 아는 출제 형식(객관식/단답형/서술형). `problemType`(계산/개념/활용/서술형)과 다른 축.
    questionType: hwp.questions[i].type,
  };
});
console.log(
  renamed.length > 0
    ? `학교를 추측할 수 있는 이름을 바꿨다: ${renamed.join(", ")}`
    : "학교를 추측할 수 있는 이름 없음",
);

// ── ㉤ 금지 검사 — 걷은 **뒤** 전량에 대고 본다 ─────────────────────────────
let bad = 0;
for (const d of drafts) {
  const blob = [d.content, d.answer, d.solution ?? ""].join("\n");
  const hits = FORBIDDEN.filter((f) => {
    f.re.lastIndex = 0;
    return f.re.test(blob);
  });
  if (hits.length > 0) {
    bad += 1;
    console.log(
      `🔴 문${d.questionNumber}: ${hits.map((h) => h.name).join(" · ")}`,
    );
    for (const h of hits) {
      const m = blob.match(new RegExp(h.re.source, "gu"));
      if (m) console.log(`     ↳ ${[...new Set(m)].join(", ")}`);
    }
  }
}

writeFileSync(
  join(DIR, "drafts.json"),
  JSON.stringify(drafts, null, 1),
  "utf-8",
);
console.log(
  `\n오염 걷은 발문 ${scrubbed}개 · 초안 ${drafts.length}문항 · 금지 검사 걸림 ${bad}건`,
);
for (const d of drafts) {
  console.log(
    `${String(d.questionNumber).padStart(2)} ${d.difficulty} · ${d.problemType}/${d.questionType} · ` +
      `${d.unitHint} · 정답 ${JSON.stringify(d.answer)} · 해설 ${d.solution ? `${d.solution.length}자` : "없음"}`,
  );
}
if (bad > 0) process.exit(1);
// PDF 쪽은 **대조용**이다 — 본문으로 쓰지 않는다. 여기서 한 번 세어 남긴다.
console.log(
  `\n(PDF 텍스트층은 대조용으로만 읽었다 — 문항 ${pdf.questions?.length ?? 0}개)`,
);
