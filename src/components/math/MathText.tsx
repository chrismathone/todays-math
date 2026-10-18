/**
 * 정답·해설 등 단문 수식 렌더러 — mathgen MarkdownRenderer 경로를 그대로 탄다.
 * 검수(S-05)·문제은행(S-08)·인쇄(S-06)가 이 경로만 쓴다 — 렌더 경로 분기 금지.
 *
 * 문제 본문(지문 + 보기)은 `ProblemContent`를 쓴다 (mathgen ProblemDisplay 구조).
 * 해설은 `SolutionText` 를 쓴다 — 아래 주석.
 */
import { MarkdownRenderer } from "@/components/math/MarkdownRenderer";
import { normalizeOcrText } from "@/lib/problem/parseProblemContent";
import { solutionForDisplay } from "@/lib/solutionSteps";

export interface MathTextProps {
  text: string;
  className?: string;
  as?: "span" | "div" | "p";
  staticLayout?: boolean;
}

export function MathText({
  text,
  className,
  as = "span",
  staticLayout = false,
}: MathTextProps) {
  return (
    <MarkdownRenderer
      content={normalizeOcrText(text)}
      className={className}
      inline={as === "span"}
      staticLayout={staticLayout}
    />
  );
}

export interface SolutionTextProps {
  /** 해설 원문(분수 표시 등 문항 단위 보기는 부르는 쪽이 먼저 한다). 없으면 `fallback`. */
  text: string | null | undefined;
  className?: string;
  /** 해설이 비었을 때 보일 글(예: 「해설이 등록되지 않았습니다.」). 없으면 빈 칸. */
  fallback?: string;
  staticLayout?: boolean;
}

/**
 * 해설 한 벌을 그리는 **유일한 조합** — `solutionForDisplay`(줄 나눔) → `MathText as="div"`.
 *
 * 🔴 **해설 출구가 저마다 달랐다**(2026-09-26 후보정 조사 D·L). 인쇄 정답지·문제은행은 이
 *    조합이었는데 시험지 해설지(`AnswerPage`)·관리자 미리보기·옛 작업 화면은 줄 나눔을 빠뜨렸고,
 *    작업실·검수 콘솔은 **본문 렌더러**(`ProblemContent`)로 그려 해설 속 `1.`·`①` 줄을 **보기 격자**로
 *    잘랐다(`1.` 이 `①` 로 바뀌어 보였다). 같은 해설이 화면마다 줄도, 새는 것도 달랐다.
 *    원장님 원칙 «같은 데이터는 모든 화면에서 같은 모양» — 해설은 이 함수 하나만 지난다.
 *    배선 검사: `solutionWiring.test.ts`.
 */
export function SolutionText({
  text,
  className,
  fallback,
  staticLayout = false,
}: SolutionTextProps) {
  const shown = solutionForDisplay(text);
  return (
    <MathText
      as="div"
      className={className}
      text={shown || fallback || ""}
      staticLayout={staticLayout}
    />
  );
}
