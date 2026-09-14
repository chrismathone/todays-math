/**
 * 문제은행 상세 화면 Wire 시안용 픽스처 (D-07 시안 제시용, 실데이터 없음).
 *
 * 🔴 **가장 어려운 문항으로 세운다.** 옆 시안(`dev/range-hifi/fixtures.ts`)이 남긴
 *    교훈이 그것이다 — 처음 시안이 작은 표본으로 서서, 「학년 열 16행이면 750px」을
 *    원장님이 실제 화면에서야 발견하셨다. 상세 시안이 걸리는 자리는 **그림과 보기가
 *    함께 있는 긴 문항**이라(2026-09-14 화면), 그런 문항을 맨 앞에 둔다.
 *
 * 그림은 손으로 그리지 않았다. `scripts/figure/render_spec.py` 에 아래 스펙을 넣어
 * **실제 엔진이 뽑은 산출물**이다 — 시안의 그림 크기가 지면과 달라지면 그 시안으로 한
 * 판단이 통째로 틀어진다.
 *
 *   {"version":2,"points":{"A":[40,150],"B":[240,50],"C":[240,150]},
 *    "segments":{"AB":["A","B"],"BC":["B","C"],"CA":["C","A"]},
 *    "angles":{"rightC":{"vertex":"C","points":["A","B"],"right":true}},
 *    "dimensions":{"dBC":{"points":["B","C"],"label":"1","side":"auto"},
 *                  "dAC":{"points":["A","C"],"label":"2","side":"auto"}},
 *    "labels":{"A":"A","B":"B","C":"C"}}
 */
import type { BankProblem } from "@/components/unified/types";

/** 엔진 산출물 그대로 (viewBox 263.739 × 164.898, 치수 점선 활 2개 + 직각기호). */
const TRIG_SVG = `<svg viewBox="0 0 263.739 164.898" xmlns="http://www.w3.org/2000/svg">
  <rect width="263.739" height="164.898" fill="#ffffff" />
  <g>
    <line x1="28.789" y1="129.948" x2="228.789" y2="29.948" stroke="#111111" stroke-width="1.9" />
    <line x1="228.789" y1="29.948" x2="228.789" y2="129.948" stroke="#111111" stroke-width="1.9" />
    <line x1="228.789" y1="129.948" x2="28.789" y2="129.948" stroke="#111111" stroke-width="1.9" />
  </g>
  <g>
    <path d="M 216.689 129.948 L 216.689 117.848 L 228.789 117.848" fill="none" stroke="#111111" stroke-width="0.72" />
    <path d="M 117.371 143.754 Q 74.58 142.3 31.789 129.948 M 140.207 143.754 Q 182.998 142.3 225.789 129.948" fill="none" stroke="#111111" stroke-width="0.72" stroke-dasharray="5 3" stroke-linecap="round" />
    <path d="M 242.021 68.938 Q 239.509 50.943 228.789 32.948 M 242.021 90.958 Q 239.509 108.953 228.789 126.948" fill="none" stroke="#111111" stroke-width="0.72" stroke-dasharray="5 3" stroke-linecap="round" />
  </g>
  <g>
    <text x="128.789" y="149.324" font-family="Cambria Math, HancomEQN, Times New Roman, serif" font-size="16.8" text-anchor="middle" fill="#111111" paint-order="stroke fill" stroke="#ffffff" stroke-width="5.6" stroke-linejoin="round" data-mj="2"><tspan font-style="normal">2</tspan></text>
    <text x="242.789" y="85.324" font-family="Cambria Math, HancomEQN, Times New Roman, serif" font-size="16.8" text-anchor="middle" fill="#111111" paint-order="stroke fill" stroke="#ffffff" stroke-width="5.6" stroke-linejoin="round" data-mj="1"><tspan font-style="normal">1</tspan></text>
    <text x="18.065" y="135.324" font-family="Cambria Math, HancomEQN, Times New Roman, serif" font-size="16.8" text-anchor="middle" fill="#111111" data-px="28.789" data-py="129.948" data-mj="A"><tspan font-style="normal">A</tspan></text>
    <text x="228.789" y="24.6" font-family="Cambria Math, HancomEQN, Times New Roman, serif" font-size="16.8" text-anchor="middle" fill="#111111" data-px="228.789" data-py="29.948" data-mj="B"><tspan font-style="normal">B</tspan></text>
    <text x="239.513" y="135.324" font-family="Cambria Math, HancomEQN, Times New Roman, serif" font-size="16.8" text-anchor="middle" fill="#111111" data-px="228.789" data-py="129.948" data-mj="C"><tspan font-style="normal">C</tspan></text>
  </g>
</svg>`;

/** 보기 마커는 줄머리의 `①`~`⑮` 다 (`parseProblemContent.ts` 의 CHOICE_AT_LINE_START). */
const TRIG_CONTENT = String.raw`그림과 같이 $\angle C = 90^\circ$인 직각삼각형 $\mathrm{ABC}$에서 $\overline{\mathrm{BC}} = 1$, $\overline{\mathrm{AC}} = 2$일 때, $\cos A$의 값은?
① $\dfrac{\sqrt{5}}{5}$
② $\dfrac{1}{2}$
③ $\dfrac{\sqrt{3}}{2}$
④ $\dfrac{2\sqrt{5}}{5}$
⑤ $2$`;

const ADD_CONTENT = String.raw`$390 + 271 = \square$
① $651$
② $661$
③ $659$
④ $671$
⑤ $761$`;

/**
 * ⚠️ `as const` 를 붙이지 않는다 — 붙이면 `figureUrls` 가 `readonly []` 로 굳어
 *    `BankProblem.figureUrls: string[]` 에 못 들어간다(실측 TS2322 ×3).
 */
const BASE = {
  figureUrls: [],
  figureSvg: null,
  figureDims: [],
  figureSourceMm: [],
  eligible: true,
  ineligibleReason: null,
  /** 출처 배지의 판정 근거 — 갈래마다 아래에서 덮어쓴다(`[기]`·`[초]`·`[AI]`). */
  familyKey: null as string | null,
  originProblemId: null as string | null,
  /** 서버가 덮어쓰기 **전**의 원본 형식 — 형식 배지는 이 값으로 판정한다. */
  questionTypeRaw: "객관식" as string | null,
};

/**
 * 세 문항을 일부러 **성격이 다르게** 둔다 — 시안이 한 모양에만 맞으면 안 된다.
 *  ① 그림 + 보기 5개 + 긴 발문 (상세가 가장 무거운 경우)
 *  ② 그림 없는 짧은 계산 (카드 높이가 제각각인 것을 드러낸다)
 *  ③ 검수 대기 + 정답·풀이 없음 (승인/반려 단추와 «없음» 문구가 서는 자리)
 */
export const WIRE_PROBLEMS: BankProblem[] = [
  {
    ...BASE,
    id: "wire-1",
    content: TRIG_CONTENT,
    answer: String.raw`④ $\dfrac{2\sqrt{5}}{5}$`,
    solution: String.raw`$\overline{\mathrm{AB}} = \sqrt{1^2 + 2^2} = \sqrt{5}$ 이므로 $\cos A = \dfrac{\overline{\mathrm{AC}}}{\overline{\mathrm{AB}}} = \dfrac{2}{\sqrt{5}} = \dfrac{2\sqrt{5}}{5}$`,
    grade: "중3",
    chapter: "5. 삼각비",
    section: "삼각비의 뜻",
    difficulty: "기본",
    problemCode: "J30501-A01-025",
    figureSvg: TRIG_SVG,
    sourceLabel: "기출",
    source: "past_exam",
    reviewStatus: "approved",
    questionType: "multiple-choice",
  },
  {
    ...BASE,
    id: "wire-2",
    // 엔진 표지 — 이것이 있어야 `[초]` 배지가 선다(`classifyOrigin` 의 ENGINE_PREFIX).
    familyKey: "elem:초3|1-1-1 받아올림이 없는 (세 자리 수)+(세 자리 수)|연산",
    content: ADD_CONTENT,
    answer: "③ 659",
    solution: String.raw`$390 + 271 = 661$ 이 아니라 $661$ 이므로 자리올림을 확인한다.`,
    grade: "초3",
    chapter: "1-1 덧셈과 뺄셈",
    section: "받아올림이 없는 (세 자리 수)+(세 자리 수)",
    difficulty: "기본",
    problemCode: "E30101-A01-002",
    sourceLabel: "자체",
    source: "internal",
    reviewStatus: "approved",
    questionType: "multiple-choice",
  },
  {
    ...BASE,
    id: "wire-3",
    content: "두 수의 합을 구하시오.\n\n485, 342",
    answer: "",
    solution: "",
    grade: "초3",
    chapter: "1-1 덧셈과 뺄셈",
    section: "받아올림이 두 번 있는 (세 자리 수)+(세 자리 수)",
    difficulty: "기본",
    problemCode: "E30101-A01-003",
    sourceLabel: "AI 생성",
    source: "ai_generated",
    reviewStatus: "pending",
    questionType: "short-answer",
  },
];
