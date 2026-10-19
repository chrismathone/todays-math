/** 원점수·만점에서 정수의 100점 환산값을 얻는다. 결측을 0점으로 만들지 않는다. */
export function scoreTo100(
  value: number | null,
  maximum: number | null,
): number | null {
  if (
    value === null ||
    maximum === null ||
    !Number.isFinite(value) ||
    !Number.isFinite(maximum) ||
    maximum <= 0 ||
    value < 0 ||
    value > maximum
  )
    return null;
  return Math.round((value / maximum) * 100);
}

export function originalScoreLabel(score: {
  value: number | null;
  maximum: number | null;
  unit: "points" | "questions";
}): string | null {
  if (score.value === null || score.maximum === null) return null;
  if (score.unit === "questions")
    return `${score.maximum}문항 중 ${score.value}문항`;
  return score.maximum === 100
    ? null
    : `${score.maximum}점 중 ${score.value}점`;
}
