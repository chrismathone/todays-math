import type { MidProblem } from "./types";

// 그림이 자료인 이 아홉 유형만 확장한다. 그 밖의 유형은 기존 발문 비교를 유지한다.
const SCATTER_KEYS = new Set(
  ["06", "07", "08", "09", "10", "11", "12", "14", "15"].map(
    (type) => `3-2|상자그림과 산점도|${type}`,
  ),
);

/**
 * 한 세트에서 학생에게 같은 자료를 되풀이하지 않기 위한 비교 값.
 * 정답·해설·facts·장식·점 배열 순서는 변형 근거가 아니다.
 * 저장 ID, 수학/학년/권리 승인이나 도형 렌더 검증을 대신하지 않는다.
 */
export function middleStudentInputIdentity(key: string, p: MidProblem): string {
  if (!SCATTER_KEYS.has(key)) return p.content;
  const invalid = () => new Error(`유형 ${key} 의 산점도 입력 자료를 확인해야 합니다`);
  const spec = p.figureSpec;
  if (!spec || spec.version !== "elem-1" || spec.kind !== "scatterPlot") throw invalid();
  const labels = [spec.xLabel, spec.yLabel];
  if (labels.some((v) => typeof v !== "string" || !v.trim() || v.length > 200)) throw invalid();
  if (!Array.isArray(spec.points) || spec.points.length < 2 || spec.points.length > 40) throw invalid();
  // 빈 칸이 있는 배열도 undefined로 검사해 빠뜨리지 않는다.
  const points: [number, number][] = Array.from(spec.points, (point: unknown) => {
    if (!Array.isArray(point) || point.length !== 2 || Array.from(point).some(
      (v: unknown) => typeof v !== "number" || !Number.isFinite(v) || Math.abs(v) > 100000,
    )) throw invalid();
    return [point[0] === 0 ? 0 : point[0], point[1] === 0 ? 0 : point[1]];
  });
  points.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (points.some((v, i) => i > 0 && v[0] === points[i - 1]![0] && v[1] === points[i - 1]![1])) throw invalid();
  return JSON.stringify([p.content, ...(labels as string[]).map((label) => label.trim()), points]);
}
