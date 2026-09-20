/**
 * 「보기 번호 배치」 시안 픽스처 — 원장님이 값 넷을 **같은 시험지**로 견주시려고(D-07).
 *
 * 🔴 **걸리는 자리를 일부러 넣는다.** 짧은 보기만 넣으면 값 넷이 다 예뻐 보이고,
 *    정작 원장님이 실제 시험지에서 만나실 「긴 보기가 3열 칸에서 접히는」 자리가
 *    시안에 한 번도 안 나온다(2026-08-19 교훈 「시안이 작은 픽스처로 서면,
 *    원장님이 실제 화면에서 찾아 준다」). 그래서 여섯 문항이 서로 다른 것을 문다:
 *      ① 짧은 보기 다섯 — 3열이 제일 잘 드러난다
 *      ② 3열 칸(표시폭 13)은 넘고 2열 칸(24)에는 들어가는 보기 — 한 단계 내림
 *      ③ 문장형 긴 보기 — 2열 칸도 넘어 1열까지 내려간다
 *      ④ 보기 **넷** — 「3열 2행」이 ①②③ / ④ 가 되는 자리
 *      ⑤ OCR 문항(원본 힌트 `1x5`) — 렌더러가 `NativeProblem` 으로 갈린다
 *      ⑥ 보기 **둘** — 보기 수보다 많은 열은 안 만든다
 */
import type { StudioProblem } from "@/components/unified/types";
import type { ContentBlock } from "@/lib/mathgen/contracts";

const base = {
  answer: "1",
  solution: "",
  grade: "중3",
  chapter: "이차방정식",
  section: "근의 공식",
  difficulty: "중",
  problemCode: "",
  figureUrls: [],
  figureSvg: null,
  figureDims: [],
  figureSourceMm: [],
} satisfies Omit<StudioProblem, "id" | "content">;

const text = (value: string): ContentBlock => ({
  type: "text",
  value,
  rows: [],
});

export const CHOICE_LAYOUT_PROBLEMS: StudioProblem[] = [
  {
    ...base,
    id: "short",
    content: String.raw`이차방정식 $x^2-5x+6=0$의 두 근의 합은?
① $2$
② $3$
③ $5$
④ $6$
⑤ $-5$`,
  },
  {
    ...base,
    id: "medium",
    content: String.raw`다음 중 $x=2y+3z-1$과 같은 식은?
① $x=2y+3z-1$
② $x-2y=3z-1$
③ $x+1=2y+3z$
④ $3z=x-2y+1$
⑤ $2y=x-3z+1$`,
  },
  {
    ...base,
    id: "long",
    content: `다음 중 옳은 것은?
① 서로 다른 두 소수는 항상 서로소이다.
② 두 자연수의 최대공약수는 항상 1보다 크다.
③ 1은 모든 자연수의 약수이면서 소수이다.
④ 합성수는 약수를 반드시 네 개 이상 가진다.
⑤ 서로소인 두 수의 최소공배수는 두 수의 곱이다.`,
  },
  {
    ...base,
    id: "four",
    content: String.raw`$\sqrt{48}$을 간단히 하면?
① $2\sqrt{3}$
② $3\sqrt{2}$
③ $4\sqrt{3}$
④ $6\sqrt{2}$`,
  },
  {
    ...base,
    id: "native",
    content: "다음 식의 값은?",
    ocr: {
      number: 5,
      blocks: [text(String.raw`다음 식의 값은? $2^3 \times 2^4 \div 2^5$`)],
      choiceGroups: [
        ["2", "2^1"],
        ["3", "2^2"],
        ["4", "2^3"],
        ["5", "2^4"],
        ["6", "2^5"],
      ].map(([, value], index) => ({
        number: index + 1,
        contents: [{ type: "equation" as const, value, rows: [] }],
      })),
      subQuestions: [],
      confidence: "high",
      // 원본 시험지는 한 줄(1x5)이었다 — 「자동」에서는 이 힌트가 그대로 이긴다.
      choicesLayout: "1x5",
      bodyMissing: false,
      choicesMissing: false,
    },
  },
  {
    ...base,
    id: "two",
    content: String.raw`$a<0$일 때 $|a|$와 같은 것은?
① $a$
② $-a$`,
  },
];
