/**
 * 작업실 작업 이름 — 한 곳에서만 짓는다.
 *
 * 원장님 2026-09-21 «'문제 인식 중' 글자가 안잘리면 좋겠는데. 그냥 라벨을 만들어 버리면 어때?
 * 페이지 자동 인식 → 페이지 / 문제인식중 → 문제». 검수 줄의 진행 띠는 150~300px 이라 긴 이름이
 * 한 글자씩 세로로 쪼개졌다.
 *
 * · `short` — 좁은 칸(진행 띠·펼친 칸)에 보이는 이름표. 넉 자 이하.
 * · `long` — 읽는 이름·마우스 올림. 예전 화면 글자 그대로.
 * · `running` — 진행형(«문제 인식 중»). 검수 카드·선택 상태·읽는 이름이 쓴다.
 *
 * 상태(대기·진행·완료·실패)는 짧은 이름표에 붙이지 않는다. 진행 칸은 도는 동안에만 뜨고
 * 돌림표·경과 시간·진행 막대가 «진행 중» 을 말한다. 끝난 뒤에는 요약 줄(«인식 3 / 5쪽 완료»)과
 * 쪽 단추의 상태 글자(«3쪽 인식 중»)가 따로 말한다. 이름과 상태를 한 덩어리로 두면 이름이 길어져
 * 좁은 칸에서 다시 쪼개진다.
 *
 * 이름을 짓는 자리가 여럿이다(진행 띠 요약 · 펼친 칸 · 쪽 대기열 · 검수 카드 · 자르기 선택 상태).
 * 한 곳만 고치면 화면마다 이름이 갈린다 — 새 자리도 이 함수를 쓴다(«모든 화면 일치»).
 */
export type StudioWorkKind =
  "pages" | "ocr" | "solution" | "figures" | "svg" | "digital";

const NAMES: Record<StudioWorkKind, { short: string; long: string }> = {
  pages: { short: "페이지", long: "페이지 자동 인식" },
  ocr: { short: "문제", long: "문제 인식" },
  solution: { short: "해설", long: "해설 생성" },
  // 문항 안의 도형 영역 찾기 — SVG 를 그리는 «도형» 과 나란히 뜰 수 있어 이름표를 가른다.
  figures: { short: "도형 인식", long: "도형 인식" },
  svg: { short: "도형", long: "SVG 도형 생성" },
  digital: { short: "디지털화", long: "디지털화" },
};

export function studioWorkName(kind: StudioWorkKind) {
  const { short, long } = NAMES[kind];
  return { short, long, running: `${long} 중` };
}

/** 문항 단위 AI 작업의 동작 → 이름 종류. 쪽 인식이 문항을 읽는 물결(`page-ocr`)도 «문제» 다. */
export function studioCropWorkKind(
  action: "ocr" | "page-ocr" | "figures" | "solution",
): StudioWorkKind {
  return action === "solution" || action === "figures" ? action : "ocr";
}
