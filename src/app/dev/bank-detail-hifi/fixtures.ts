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

export const LENGTH_SAMPLES = [
  { key: "short" as const, label: "짧은 풀이", chars: 103, problem: SHORT },
  { key: "mid" as const, label: "중간 풀이", chars: 292, problem: MID },
  { key: "long" as const, label: "긴 풀이", chars: 1028, problem: LONG },
];

export type LengthKey = (typeof LENGTH_SAMPLES)[number]["key"];
