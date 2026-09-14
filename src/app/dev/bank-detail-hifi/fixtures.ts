/**
 * Hi-fi 시안용 **풀이 길이 사다리** — 원장님 2026-09-14
 * 「풀이를 짧은거 중간거 긴거 세개 다 보여줘봐」.
 *
 * 🔴 **지어낸 풀이가 아니라 실제 문제은행에서 떠 온 것**이다. 시안의 풀이가 실물보다
 *    짧으면 ③(2열)·⑤(바닥 고정)의 값이 **작아 보여** 잘못 고르시게 된다.
 *
 * ## 길이를 잰 이야기 (같은 실수를 되풀이하지 않으려고 남긴다)
 *
 * ⑴ 처음에는 기본 정렬로 앞 몇 쪽만 떠서 쟀다. 상위 8개가 **전부 정확히 105자**였다 —
 *    길이 분포가 아니라 **한 생성 무리**를 본 것이다. 질의를 넷으로 갈라
 *    (`problemType=서술형`·`q=그러므로`·`q=따라서`·기본) 접두사 3~4종을 모아 다시 쟀다.
 * ⑵ PowerShell 5.1 의 `Invoke-WebRequest` 는 charset 이 없는 응답을 ISO-8859-1 로
 *    디코딩한다. 한글 한 글자가 **3글자로 세어져** 길이가 부풀고 저장한 본문도 깨졌다
 *    (1,429자로 쟀던 것이 실제 1,028자). Node 의 fetch 로 다시 재서 아래 값을 얻었다.
 *
 * ## 렌더 성질
 *
 * 홑 줄바꿈은 `applyHardBreaks` 가 Markdown 표준 하드 브레이크로 바꿔 **줄로 끊긴다**
 * (`remark-breaks` 는 안 쓴다 — 새 의존성 금지). `$$…$$` 안은 건드리지 않는다.
 *
 * ⚠️ 긴 문항은 원본에 **스캔 그림**이 있는데 탐침이 그 경로를 안 떠 와 여기서는 빠졌다.
 *    길이 축을 보는 데는 지장이 없지만 그림까지 함께 볼 때는 다시 떠야 한다.
 */
import type { BankProblem } from "@/components/unified/types";

const BASE = {
  figureUrls: [],
  figureSvg: null,
  figureDims: [],
  figureSourceMm: [],
  eligible: true,
  ineligibleReason: null,
  originProblemId: null as string | null,
};

/** 초4 · 103자 — 두세 문장으로 끝나는 풀이. */
const SHORT: BankProblem = {
  ...BASE,
  id: "hifi-short",
  problemCode: "E40403-A03-005",
  grade: "초4",
  chapter: "1-4 평면도형의 이동",
  section: "1-4-3 평면도형 뒤집기",
  difficulty: "응용",
  content: String.raw`도형을 좌우로 $2$번, 위아래로 $2$번 뒤집었습니다. 그 결과는 처음 도형을 어떻게 움직인 도형과 같은지 쓰시오.`,
  answer: "처음 도형과 같다",
  solution: String.raw`같은 방향으로 $2$번 뒤집으면 처음 도형과 같습니다. 좌우 $2$는 짝수라 뒤집지 않은 것과 같고, 위아래 $2$는 짝수라 뒤집지 않은 것과 같습니다. 그러므로 처음 도형과 같습니다.`,
  source: "manual",
  familyKey: "elem:초4|1-4-3 평면도형 뒤집기|03",
  questionTypeRaw: "단답형",
  questionType: "short-answer",
  reviewStatus: "approved",
};

/** 초3 · 292자 — 경우를 둘 따져 보는 중간 길이. */
const MID: BankProblem = {
  ...BASE,
  id: "hifi-mid",
  problemCode: "E30405-A11-001",
  grade: "초3",
  chapter: "1-4 곱셈",
  section: "1-4-5 십의 자리와 일의 자리에서 올림이 있는 (몇십몇)×(몇)",
  difficulty: "심화중",
  content: String.raw`$92$ 에 한 자리 수를 곱하려고 합니다. 곱의 일의 자리 숫자는 $8$ 이며, 이 곱셈은 일의 자리와 십의 자리에서 모두 올림이 있습니다. 곱하는 수를 쓰시오.`,
  answer: String.raw`$9$`,
  solution: String.raw`곱의 일의 자리 숫자는 $92$ 의 일의 자리인 $2$ 에 곱하는 수를 곱한 값에서 정해집니다. 그 일의 자리가 $8$ 인 수는 $4,\ 9$ 입니다. 곱하는 수가 $4$ 일 때는 일의 자리끼리의 곱이 $8$ 입니다. 그래서 일의 자리에서 올림이 생기지 않습니다. 곱하는 수가 $9$ 일 때는 일의 자리끼리의 곱이 $2\times9=18$, 십의 자리끼리의 곱에 올림까지 더하면 $82$ 입니다. 그래서 일의 자리와 십의 자리에서 모두 올림이 있습니다. 따라서 곱하는 수는 $9$ 이고 $92\times9=828$ 입니다.`,
  source: "manual",
  familyKey:
    "elem:초3|1-4-5 십의 자리와 일의 자리에서 올림이 있는 (몇십몇)×(몇)|11",
  questionTypeRaw: "단답형",
  questionType: "short-answer",
  reviewStatus: "approved",
};

/** 중3 · 1,028자 — 소문항 넷짜리 서술형. 모달이 가장 무거워지는 경우다. */
const LONG: BankProblem = {
  ...BASE,
  id: "hifi-long",
  problemCode: "J30503-A17-001",
  grade: "중3",
  chapter: "5. 삼각비",
  section: "삼각비의 활용",
  difficulty: "응용",
  content: String.raw`삼각형 $\mathrm{ABC}$에 대하여 $\overline{AB}=2,$ $\angle C=30°$이고 $\overline{BC}$위의 점 $\mathrm{M}$에 대하여 $\angle MAB=60°,$ $\angle AMB=45°$를 만족하고, $\overline{AC}$위의 점 $\mathrm{N}$에 대하여 $\angle CNM=30°$를 만족한다. 다음 물음에 답하시오. ⑴ $\overline{BM}$의 길이를 구하시오.
⑵ $\overline{CM}=\,x$라 할 때, $\overline{CN}$을 $x$에 대한 식으로 나타내시오.

⑶ $\overline{CM}$와 같은 길이를 갖는 선분 $2$개를 쓰고, $x$를 구하시오.
⑷ $\cos 75°$의 값을 구하시오.`,
  answer: "해설참조",
  solution: String.raw`⑴ 삼각형 $\mathrm{AMB}$에 대하여 점 $\mathrm{B}$에서 선분 $\mathrm{A}M$으로의 수선의 발을 $\mathrm{H}$라 하자. 이 때, 삼각형 $\mathrm{ABH}$는 특수각을 갖는 특수삼각형이 되므로 $\overline{AH}=1,~\overline{HM}=\sqrt{3}$한편 삼각형 $\mathrm{MHB}$가 직각이등변삼각형이므로 $\overline{BM}=\sqrt{6}$⑵ 삼각형 $\mathrm{CNM}$은 이등변삼각형이므로 점 $\mathrm{M}$에서 선분 $\mathrm{C}N$으로의 수선의 발을 $\mathrm{I}$라 하면 $\overline{CI}=\overline{NI}$가 성립한다. 즉 $\overline{CN}=2\overline{CI}$가 성립. $\overline{CM}=x$라 하면 $\overline{CI}=\frac{\sqrt{3}}{2}x$이므로 $\overline{CN}=2\overline{CI}=\sqrt{3}x$⑶ 삼각형 $\mathrm{CNM}$은 이등변삼각형이므로 $\overline{CM}=\overline{NM}$$\angle CAM=15°$이므로 삼각형 $\mathrm{NAM}$도 이등변삼각형. 즉 $\overline{NM}=\overline{AN}$ 따라서 $\overline{CM}=\overline{NM}=\overline{AN}$한편, $\angle CAB=\angle CBA=75°$이므로 $\mathrm{CAB}$은 이등변삼각형이다.따라서 $\overline{CA}=\overline{CB}$가 성립.$\overline{CA}=x+\sqrt{3}x,~$$\overline{CB}=x+\sqrt{6}~$이므로 $x=\sqrt{2}$⑷ 삼각형 $\mathrm{CAB}$은 이등변삼각형이므로 $\mathrm{C}$에서 선분 $\mathrm{A}B$으로의 수선을 내리면 선분 $\mathrm{A}B$를 수직이등분한다.즉 $\cos 75°=\frac{1}{\sqrt{6}+\sqrt{2}}=\frac{\sqrt{6}-\sqrt{2}}{4}$`,
  source: "past_exam",
  familyKey: "mid:3-2|삼각비의 활용|E02",
  questionTypeRaw: "서술형",
  questionType: "descriptive",
  reviewStatus: "approved",
};

/* ────────────────────────────────────────────────────────────────────────────
 * 「그림 있을 때」 — 원장님 2026-09-14 「그림있을때 없을때 모두 해봐」.
 *
 * 🔴 **그림 파일이 `public/` 에 실제로 있는 것만 골랐다.** 경로만 베껴 오면 시안에
 *    깨진 그림이 뜨는데, 그러면 「그림이 있을 때」를 판단하는 데 최악이다.
 *    (탐침에서 디스크 존재를 확인했다 — 후보 184행 전량 실재.)
 *
 * ⚠️ 짧은·중간의 그림 판은 **다른 문항**이다(103↔79자, 292↔242자). 그 길이대에서
 *    그림이 붙은 실물이 따로 있어서다 — 길이를 맞추려고 지어내지 않았다. 화면에
 *    두 숫자를 함께 적어 둔다. **긴 것만 같은 문항에 원본 그림을 붙인 것**이라
 *    그림 유무만 놓고 견주는 순수 비교가 된다.
 * ──────────────────────────────────────────────────────────────────────────── */

/** 초5 · 79자 · **도형 엔진 SVG**. 배지가 `[초] [도] [단]` 으로 선다. */
const FIG_SHORT: BankProblem = {
  ...BASE,
  id: "hifi-fig-short",
  problemCode: "E50903-A07-016",
  grade: "초5",
  chapter: "2-3 합동과 대칭",
  section: "2-3-3 선대칭도형과 그 성질 알아보기",
  difficulty: "응용",
  content: String.raw`점선을 대칭축으로 하는 선대칭도형을 완성하려고 합니다. 완성한 도형의 색칠된 칸 수를 구하시오.`,
  answer: String.raw`$10$`,
  solution: String.raw`지금 색칠된 칸은 $5$칸이고, 그중 대칭축에서 떨어진 $5$칸은 반대쪽에도 하나씩 필요합니다. 따라서 $5+5=10$이므로 $10$칸입니다.`,
  figureSvg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="16" height="16" rx="0" fill="#e2b48a" stroke="#111111" stroke-width="0.9" /><rect x="26" y="10" width="16" height="16" rx="0" fill="#ffffff" stroke="#111111" stroke-width="0.9" /><rect x="42" y="10" width="16" height="16" rx="0" fill="#ffffff" stroke="#111111" stroke-width="0.9" /><rect x="58" y="10" width="16" height="16" rx="0" fill="#ffffff" stroke="#111111" stroke-width="0.9" /><rect x="74" y="10" width="16" height="16" rx="0" fill="#ffffff" stroke="#111111" stroke-width="0.9" /><rect x="10" y="26" width="16" height="16" rx="0" fill="#e2b48a" stroke="#111111" stroke-width="0.9" /><rect x="26" y="26" width="16" height="16" rx="0" fill="#ffffff" stroke="#111111" stroke-width="0.9" /><rect x="42" y="26" width="16" height="16" rx="0" fill="#ffffff" stroke="#111111" stroke-width="0.9" /><rect x="58" y="26" width="16" height="16" rx="0" fill="#ffffff" stroke="#111111" stroke-width="0.9" /><rect x="74" y="26" width="16" height="16" rx="0" fill="#ffffff" stroke="#111111" stroke-width="0.9" /><rect x="10" y="42" width="16" height="16" rx="0" fill="#e2b48a" stroke="#111111" stroke-width="0.9" /><rect x="26" y="42" width="16" height="16" rx="0" fill="#ffffff" stroke="#111111" stroke-width="0.9" /><rect x="42" y="42" width="16" height="16" rx="0" fill="#ffffff" stroke="#111111" stroke-width="0.9" /><rect x="58" y="42" width="16" height="16" rx="0" fill="#ffffff" stroke="#111111" stroke-width="0.9" /><rect x="74" y="42" width="16" height="16" rx="0" fill="#ffffff" stroke="#111111" stroke-width="0.9" /><rect x="10" y="58" width="16" height="16" rx="0" fill="#e2b48a" stroke="#111111" stroke-width="0.9" /><rect x="26" y="58" width="16" height="16" rx="0" fill="#ffffff" stroke="#111111" stroke-width="0.9" /><rect x="42" y="58" width="16" height="16" rx="0" fill="#ffffff" stroke="#111111" stroke-width="0.9" /><rect x="58" y="58" width="16" height="16" rx="0" fill="#ffffff" stroke="#111111" stroke-width="0.9" /><rect x="74" y="58" width="16" height="16" rx="0" fill="#ffffff" stroke="#111111" stroke-width="0.9" /><rect x="10" y="74" width="16" height="16" rx="0" fill="#ffffff" stroke="#111111" stroke-width="0.9" /><rect x="26" y="74" width="16" height="16" rx="0" fill="#e2b48a" stroke="#111111" stroke-width="0.9" /><rect x="42" y="74" width="16" height="16" rx="0" fill="#ffffff" stroke="#111111" stroke-width="0.9" /><rect x="58" y="74" width="16" height="16" rx="0" fill="#ffffff" stroke="#111111" stroke-width="0.9" /><rect x="74" y="74" width="16" height="16" rx="0" fill="#ffffff" stroke="#111111" stroke-width="0.9" /><line x1="50" y1="8" x2="50" y2="92" stroke="#111111" stroke-width="1.2" stroke-dasharray="5 4" /></svg>`,
  source: "manual",
  familyKey: "elem:초5|2-3-3 선대칭도형과 그 성질 알아보기|03",
  problemType: "활용",
  questionTypeRaw: "단답형",
  questionType: "short-answer",
  reviewStatus: "approved",
};

/** 중3 · 242자 · **스캔 2장**. 그림이 여럿일 때 줄이 어떻게 접히는지 드러난다. */
const FIG_MID: BankProblem = {
  ...BASE,
  id: "hifi-fig-mid",
  problemCode: "J30603-A14-001",
  grade: "중3",
  chapter: "6. 원의 성질",
  section: "원주각",
  difficulty: "응용",
  content: String.raw`원 위에 같은 간격으로 점을 나타내려고 한다. 다음 물음에 답하시오. ⑴ 그림과 같이 원 위에 같은 간격으로 $4$개의 점을 나타냈을 때, 세 개의 점을 선택하여 만들 수 있는 직각삼각형의 개수를 구하시오.
⑵ 그림과 같이 원 위에 같은 간격으로 $10$개의 점을 나타냈을 때, 세 개의 점을 선택하여 만들 수 있는 직각삼각형의 개수를 구하시오.`,
  answer: String.raw`⑴ $4$ ⑵ $40$`,
  solution: String.raw`⑴ 원 위의 점이 $4$개이므로 지름은 $2$개를 만들 수 있다.지름을 빗변으로 하고 나머지 $2$개의 점 중 $1$개의 점을 선택하여 삼각형을 만들면 직각삼각형이다.따라서 직각삼각형의 개수는$2\times 2=4$⑵ 원 위의 점이 $10$개이므로 지름은 $5$개를 만들 수 있다.지름을 빗변으로 하고 나머지 $8$개의 점 중 $1$개의 점을 선택하여 삼각형을 만들면 직각삼각형이다.따라서 직각삼각형의 개수는$5\times 8=40$`,
  figureUrls: [
    "/figures/exam/20479007a0/q19-2.png",
    "/figures/exam/20479007a0/q19.png",
  ],
  figureDims: [1024, 943, 1024, 1003],
  figureSourceMm: [73.4, 67.64],
  source: "past_exam",
  familyKey: "mid:3-2|원주각|E02",
  problemType: "서술형",
  questionTypeRaw: "서술형",
  questionType: "descriptive",
  reviewStatus: "approved",
};

/** 긴 것은 **같은 문항**에 원본 스캔을 붙인 것이다 — 그림 유무만 갈리는 순수 비교. */
const FIG_LONG: BankProblem = {
  ...LONG,
  id: "hifi-fig-long",
  figureUrls: ["/figures/exam/20479007a0/q17.png"],
  figureDims: [598, 1024],
  figureSourceMm: [70.39],
};

export const LENGTH_SAMPLES = [
  {
    key: "short" as const,
    label: "짧은 풀이",
    chars: 103,
    figChars: 79,
    problem: SHORT,
    withFigure: FIG_SHORT,
    figNote: "초5 선대칭 · 도형 엔진 SVG",
  },
  {
    key: "mid" as const,
    label: "중간 풀이",
    chars: 292,
    figChars: 242,
    problem: MID,
    withFigure: FIG_MID,
    figNote: "중3 원주각 · 스캔 2장",
  },
  {
    key: "long" as const,
    label: "긴 풀이",
    chars: 1028,
    figChars: 1028,
    problem: LONG,
    withFigure: FIG_LONG,
    figNote: "같은 문항에 원본 스캔 1장",
  },
];

export type LengthKey = (typeof LENGTH_SAMPLES)[number]["key"];
