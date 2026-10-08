import katex from "katex";
import {
  type ConceptBlankBank,
  blankKeywords,
  splitBlankSentence,
} from "@/contracts/conceptBlank.contract";
import {
  arabicPolygons,
  bareNumbers,
  josaFaults,
} from "@/lib/elementary/rules";

/**
 * 개념 백지 은행의 표기 자(D-150 · 원장님 2026-09-30 «카텍스 사용할 것»).
 * 수식 `$...$` **밖**에 남은 수학 표기를 센다 — 자는 초등 엔진의 것 그대로다(`elementary/rules.ts`: 원장님 2026-08-22
 * 「모든 숫자는 KaTeX」 · 「8각형이 아니라 팔각형」 · 수식 뒤 조사). 여기에 수식 밖 유니코드 수학 글자와 KaTeX 가 던지는 수식을 더한다.
 *
 * 그림 이름표(`tags[].answer`)와 SVG 안 글자는 재지 않는다(KaTeX 를 못 쓴다) — «통과»가 아니라 «안 잼».
 */
export type NotationFault = {
  id: string;
  field: string;
  rule: string;
  what: string;
};

/** 수식 밖에 있으면 안 되는 유니코드 수학 글자 — 제품 표기는 `\sqrt` · `^2` · `\times` · `\angle` · `^\circ` … 다. */
const UNICODE_MATH = /[√∛²³⁴⁵⁶⁷⁸⁹⁰¹⁻⁺ⁿπ±≤≥≠×÷−∠△□°∥⊥≡∽∞]/g;
const stripMath = (s: string) => s.replace(/\$[^$]*\$/g, " ");
/**
 * 수식 안에 역슬래시 없이 남은 명령 이름 — 은행 글을 `r` 없이 보통 따옴표로 쓰면 `\,\mathrm{m}` 이 `,mathrm{m}` 이 된다.
 * KaTeX 는 낱글자의 곱으로 읽어 오류를 내지 않고, 지면에는 `3, mathrmm` 이 찍힌다(2026-10-02 전수 검토 — `e5-1-3-3-xc28`).
 * 글 명령의 인수(`\text{…}` · `\mathrm{…}`) 안은 글이라 보지 않는다 — 거기 든 낱말은 명령이 아니다.
 */
const BARE_COMMAND =
  /(?<![\\A-Za-z])(?:mathrm|[dt]?frac|times|circ|angle|overline|triangle|sqrt|square|cdot|parallel|perp|text|quad)(?![A-Za-z])/g;
const TEXT_ARGUMENT = /\\(?:text|textrm|mathrm|mathit)\{[^{}]*\}/g;

/** 글 한 칸의 표기 결함. 뜻 문장(`sentence`)은 핵심어 괄호를 걷어 읽는 글로 본다 — 핵심어 안의 수식은 그대로 수식이다. */
export function notationFaults(
  raw: string,
  sentence = false,
): { rule: string; what: string }[] {
  const text = sentence
    ? splitBlankSentence(raw)
        .map((p) => p.text)
        .join("")
    : raw;
  const out: { rule: string; what: string }[] = [];
  const add = (rule: string, what: readonly string[]) => {
    for (const w of what) out.push({ rule, what: w });
  };
  if ((text.match(/\$/g) ?? []).length % 2 === 1)
    add("수식 짝", ["$ 가 홀수 개"]);
  for (const m of text.matchAll(/\$([^$]*)\$/g)) {
    try {
      katex.renderToString(m[1]!, { throwOnError: true, strict: "ignore" });
    } catch (e) {
      add("수식 오류", [
        `${m[1]} — ${String((e as Error).message).slice(0, 60)}`,
      ]);
    }
    add(
      "역슬래시 빠진 명령",
      (m[1]!.replace(TEXT_ARGUMENT, " ").match(BARE_COMMAND) ?? []).map(
        (name) => `${name} — $${m[1]}$`,
      ),
    );
  }
  add("수식 밖 숫자", bareNumbers(text));
  add("수식 밖 기호", stripMath(text).match(UNICODE_MATH) ?? []);
  // 초등 자는 글자 그대로의 `8각형` 만 본다 — 숫자를 수식에 넣은 `$8$각형` 도 같은 결함이다(팔각형).
  add("아라비아 도형 이름", [
    ...arabicPolygons(text),
    ...(text.match(/\$\s*\d+\s*\$\s*각형/g) ?? []),
  ]);
  add("수식 뒤 조사", josaFaults(text));
  return out;
}

/** 은행 한 묶음의 모든 글 칸을 잰다. */
export function bankNotationFaults(bank: ConceptBlankBank): NotationFault[] {
  const out: NotationFault[] = [];
  const scan = (
    id: string,
    field: string,
    raw: string,
    sentence = false,
    inputAlias = false,
  ) => {
    for (const f of notationFaults(raw, sentence)) {
      // Student input can name the same polygon with a numeral. Keep that reviewed
      // alternative; the displayed canonical answer and all authored prose still
      // use the standard name. This does not exempt math or KaTeX errors.
      if (inputAlias && f.rule === "아라비아 도형 이름") continue;
      out.push({ id, field, ...f });
    }
  };
  for (const c of bank.concepts) {
    scan(c.id, "term", c.term);
    scan(c.id, "definition", c.definition, true);
    if (c.bQuestion) {
      scan(c.id, "bQuestion.prompt", c.bQuestion.prompt);
      scan(c.id, "bQuestion.answer", c.bQuestion.answer);
      c.bQuestion.requiredIdeas.forEach((idea, i) =>
        idea.anyOf.forEach((text, j) =>
          scan(c.id, `bQuestion.requiredIdeas.${i}.${j}`, text),
        ),
      );
    }
    if (c.clozeQuestion) {
      scan(c.id, "clozeQuestion.sentence", c.clozeQuestion.sentence, true);
      const canonical = blankKeywords(c.clozeQuestion.sentence);
      c.clozeQuestion.acceptedAnswers.forEach((answers, i) =>
        answers.forEach((text, j) =>
          scan(
            c.id,
            `clozeQuestion.acceptedAnswers.${i}.${j}`,
            text,
            false,
            text !== canonical[i],
          ),
        ),
      );
    }
    if (c.example) {
      scan(c.id, "example.prompt", c.example.prompt);
      scan(c.id, "example.answer", c.example.answer);
    }
  }
  for (const o of bank.ox) {
    scan(o.id, "statement", o.statement);
    scan(o.id, "why", o.why);
  }
  for (const a of bank.apply) {
    scan(a.id, "prompt", a.prompt);
    scan(a.id, "answer", a.answer);
  }
  for (const f of bank.figures) {
    scan(f.id, "prompt", f.prompt);
    for (const l of f.lines) {
      scan(f.id, "line.label", l.label);
      scan(f.id, "line.answer", l.answer);
    }
  }
  return out;
}
