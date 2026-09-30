import type {
  ConceptBlankSheet,
  ConceptEntry,
  SheetHeader,
} from "../../src/contracts/conceptBlank.contract";

/**
 * 수식 줄 높이 눈금 맞추기(`?set=cal`) — 수식 갈래를 하나씩 **한 줄짜리 글**에 넣어 줄이 얼마나 높아지는지 잰다.
 * `paginate.ts` 의 `MATH_LINE_EM`(글자 · 분수 · 겹친 것의 줄 높이)은 여기서 잰 값으로 정했다 — 중학 은행이 쓰는
 * 명령어(`\frac` · `\sqrt` · `\left` · `\overline` · `\sin` · `^\circ` …)를 다 넣었다. 글은 뜻 없는 채움이다.
 */
export const CAL_MATH = [
  String.raw`$x$`,
  String.raw`$x^2$`,
  String.raw`$a_1$`,
  String.raw`$2^{3^2}$`,
  String.raw`$\pi r^2$`,
  String.raw`$\sqrt{2}$`,
  String.raw`$\sqrt{b^2-4ac}$`,
  String.raw`$\overline{\mathrm{AB}}$`,
  String.raw`$\overset{\frown}{AB}$`,
  String.raw`$\overleftrightarrow{AB}$`,
  String.raw`$\sin 30^\circ$`,
  String.raw`$\left(x+1\right)^2$`,
  String.raw`$\frac{1}{2}$`,
  String.raw`$-\frac{b}{a}$`,
  String.raw`$\frac{a^2}{b}$`,
  String.raw`$\frac{1}{\sqrt 2}$`,
  String.raw`$\sqrt{\frac{1}{2}}$`,
  String.raw`$\left(-\frac{2}{3}\right)$`,
  String.raw`$\left(-\frac{2}{3}\right)^2$`,
  String.raw`$\frac{\overline{\mathrm{BC}}}{\overline{\mathrm{AB}}}$`,
  String.raw`$x=\frac{-b\pm\sqrt{b^2-4ac}}{2a}$`,
  String.raw`$\frac{\frac{1}{2}}{3}$`,
  String.raw`$\frac{1}{1+\frac{1}{2}}$`,
  // 근호가 괄호 · 첨자와 만나는 꼴 — 중3 은행에서 어림이 모자랐던 것
  String.raw`$\sqrt a$`,
  String.raw`$-\sqrt a$`,
  String.raw`$(-\sqrt 5)^2$`,
  String.raw`$\sqrt 2(\sqrt 3+1)=\sqrt 6+\sqrt 2$`,
  String.raw`$\left(\sqrt 2+1\right)-3=\sqrt 2-2<0$`,
  String.raw`$\sqrt{a^2}$`,
  String.raw`$3\sqrt 2$`,
  String.raw`$(a+b)^2$`,
  String.raw`$x^2-2x+3$`,
  // 초등 은행 2차(모든 숫자 · 단위 · 분수 · 각이 KaTeX) — 대분수 · 단위 · 순환소수 · 네모 · 백분율 · 비
  String.raw`$2\frac{1}{3}$`,
  String.raw`$1\frac{3}{4}+2\frac{1}{4}=4$`,
  String.raw`$3\times\frac{1}{4}$`,
  String.raw`$\frac{3}{4}\div\frac{1}{2}$`,
  String.raw`$\frac{7}{7}$`,
  String.raw`$1\,\mathrm{cm}^2$`,
  String.raw`$1000000\,\mathrm{cm}^3$`,
  String.raw`$\frac{1}{2}\,\mathrm{m}$`,
  String.raw`$2\,\mathrm{km}\ 350\,\mathrm{m}$`,
  String.raw`$0.\dot{3}$`,
  String.raw`$\square$`,
  String.raw`$25\,\%$`,
  String.raw`$3:4$`,
  String.raw`$90^\circ$`,
  String.raw`$\angle \mathrm{ABC}$`,
  String.raw`$\triangle \mathrm{ABC}\equiv\triangle \mathrm{DEF}$`,
  String.raw`$\overline{\mathrm{AB}}\parallel\overline{\mathrm{CD}}$`,
  String.raw`$100000000$`,
  // 중학 은행에는 아직 없는 것 — 고등 은행이 차기 전에 미리 잰다
  String.raw`$\sum_{i=1}^{n} i$`,
  String.raw`$\int_0^1 x\,dx$`,
  String.raw`$\lim_{x\to 0} x$`,
  String.raw`$\begin{cases} x+y=1 \\ x-y=3 \end{cases}$`,
  String.raw`$\begin{cases} a \\ b \\ c \end{cases}$`,
] as const;

const SECTION = "중3::1. 실수와 그 계산::제곱근과 실수";

const header = (form: SheetHeader["form"]): SheetHeader => ({
  title: "수식 줄 높이",
  unitLabel: "중3 · 1. 실수와 그 계산",
  date: "2026-10-01",
  form,
});

const entry = (math: string, i: number): ConceptEntry => ({
  id: `cal-${i}`,
  section: SECTION,
  term: `값 ${math}`,
  kind: "정의",
  level: "중",
  definition: `값 ${math} 을 {핵심어}로 본다.`,
  example: { prompt: `값 ${math}`, answer: math },
});

/** 글줄 갈래마다 한 벌 — C 문장 · 채점표 줄(뜻 · 예) · B 용어 · ○× 문장/까닭 · 적용 물음/답. */
export function calSheets(): ConceptBlankSheet[] {
  const entries = CAL_MATH.map(entry);
  return [
    {
      form: "cloze",
      header: header("cloze"),
      sentences: entries,
      apply: CAL_MATH.map((math, i) => ({
        id: `cal-a-${i}`,
        section: SECTION,
        level: "중" as const,
        prompt: `물음 ${math}`,
        answer: `답 ${math}`,
      })),
    },
    {
      form: "term",
      header: header("term"),
      terms: entries,
      ox: CAL_MATH.map((math, i) => ({
        id: `cal-o-${i}`,
        section: SECTION,
        level: "중" as const,
        statement: `문장 ${math}`,
        answer: true,
        why: `까닭 ${math}`,
      })),
    },
  ];
}
