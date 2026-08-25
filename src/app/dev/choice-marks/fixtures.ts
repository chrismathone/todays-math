import type { ProblemEntity } from "@/contracts/problem.contract";

/**
 * 「㉠ 목록을 ①~⑤ 로 바꿀까」를 **실물로** 보이려는 표본 (D-80 남은 결정).
 *
 * 🔴 본문은 **엔진이 실제로 낸 것 그대로**다 — 손으로 예쁘게 고치지 않았다.
 *    (`npx tsx` 로 `generateMiddleProblem(key, 20260825)` 를 돌려 그대로 옮겼다.
 *     2026-08-25 실측. 시안을 예쁜 픽스처로 세우면 깨지는 조건이 지워진다 —
 *     CLAUDE.md 2026-08-19 「시안이 작은 픽스처로 서면 원장님이 화면에서 찾아 준다」.)
 *
 * 「지금」과 「바꾸면」은 **표식 글자만** 다르다. 다른 것은 한 글자도 안 건드렸다 —
 * 그래야 화면 차이가 오로지 표식 때문임이 분명해진다.
 */

const base = {
  problemCode: "J20401-A01-001",
  userId: null,
  unitId: "00000000-0000-4000-8000-000000000002",
  source: "manual" as const,
  originProblemId: null,
  problemType: "계산",
  reviewStatus: "approved" as const,
  directUseAllowed: true,
  pool: "shared" as const,
  figureUrls: [] as string[],
  figureSvg: null,
  solution: null,
  createdAt: "2026-08-25T10:00:00Z",
  updatedAt: "2026-08-25T10:00:00Z",
};

/** ㉠~㉤ → ①~⑤. **표식만** 바꾼다. */
export function toCircledDigits(content: string): string {
  const FROM = ["㉠", "㉡", "㉢", "㉣", "㉤"];
  const TO = ["①", "②", "③", "④", "⑤"];
  return content
    .split("\n")
    .map((line) => {
      const i = FROM.findIndex((m) => line.trimStart().startsWith(m));
      return i < 0 ? line : line.replace(FROM[i]!, TO[i]!);
    })
    .join("\n");
}

export type Sample = {
  key: string;
  title: string;
  /** 엔진이 실제로 낸 본문 (표식 ㉠~㉤). */
  content: string;
  answer: string;
  difficulty: ProblemEntity["difficulty"];
  problemCode: string;
};

/** 중등 엔진 실측 산출물 (씨앗 20260825). */
export const SAMPLES: Sample[] = [
  {
    key: "2-1|일차함수와 그 그래프 ⑴|01",
    title: "함수",
    problemCode: "J20401-A01-001",
    difficulty: "기본",
    answer: "$3$개",
    content: [
      "다음 중 $y$가 $x$의 함수인 것은 모두 몇 개인지 구하시오.",
      "㉠ 절댓값이 $x$인 정수 $y$",
      "㉡ $x$보다 $2$만큼 큰 수 $y$",
      "㉢ 자연수 $x$의 약수의 개수 $y$",
      "㉣ 한 개에 $500$원인 물건 $x$개의 값 $y$원",
      "㉤ 자연수 $x$의 약수 $y$",
    ].join("\n"),
  },
  {
    key: "2-1|일차함수와 그 그래프 ⑴|03",
    title: "일차함수",
    problemCode: "J20401-A03-001",
    difficulty: "기본",
    answer: "$3$개",
    content: [
      "다음 중 $y$가 $x$에 대한 일차함수인 것은 모두 몇 개인지 구하시오.",
      "㉠ $y=5-2x$",
      "㉡ $y=\\dfrac{5}{x}$",
      "㉢ $y=x(x-1)$",
      "㉣ $y=x^2-x(x+2)$",
      "㉤ $y=\\dfrac{x}{3}$",
    ].join("\n"),
  },
  {
    key: "2-1|일차함수와 그 그래프 ⑵|01",
    title: "일차함수의 그래프의 성질",
    problemCode: "J20402-A01-001",
    difficulty: "응용",
    answer: "$2$개",
    content: [
      "일차함수 $y=-x-1$의 그래프에 대한 다음 설명 중 옳은 것은 모두 몇 개인지 구하시오.",
      "㉠ 오른쪽 아래로 향하는 직선이다.",
      "㉡ $y$절편은 $-3$이다.",
      "㉢ $x$의 값이 $1$만큼 증가할 때 $y$의 값은 $1$만큼 증가한다.",
      "㉣ 점 $(-4, 1)$을 지난다.",
      "㉤ 제$2$사분면을 지난다.",
    ].join("\n"),
  },
];

/**
 * **대조군** — 이미 ①~⑤ 를 쓰는 유형. 「바꾸면 이렇게 된다」의 실물 근거다.
 * (`3-1|이차함수의 그래프 ⑴|06` 실측, 씨앗 20260825.)
 */
export const CONTROL: Sample = {
  key: "3-1|이차함수의 그래프 ⑴|06",
  title: "이차함수의 그래프의 성질 (이미 ①~⑤ 를 쓴다)",
  problemCode: "J30401-A06-003",
  difficulty: "응용",
  answer: "①, ②",
  content: [
    "이차함수 $y=\\dfrac{2}{3}x^2$의 그래프에 대한 다음 보기의 설명 중 옳은 것을 모두 고르시오.",
    "① $x>0$일 때, $x$의 값이 증가하면 $y$의 값도 증가한다.",
    "② 축의 방정식은 $x=0$이다.",
    "③ 이차함수 $y=x^2$의 그래프보다 폭이 좁다.",
    "④ 그래프는 점 $(1, 0)$을 지난다.",
    "⑤ 위로 볼록한 포물선이다.",
  ].join("\n"),
};

export function toEntity(
  s: Sample,
  content: string,
  id: string,
): ProblemEntity {
  return {
    ...base,
    id,
    problemCode: s.problemCode,
    difficulty: s.difficulty,
    content,
    answer: s.answer,
  } as ProblemEntity;
}
