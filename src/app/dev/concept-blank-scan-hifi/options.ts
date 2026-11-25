export const HIFI_OPTIONS = [
  {
    id: "H1",
    name: "기록의 여백",
    difference:
      "흰 작업 면과 가는 구분선, 남색 제목, 코발트 행동. 답과 근거를 같은 폭으로 읽습니다.",
    weakness: "촬영·수정 상태는 큰 색 면 대신 문구를 읽어 구별해야 합니다.",
  },
  {
    id: "H2",
    name: "또렷한 차례",
    difference: "짧은 코발트 단계 머리와 번호 열로 현재 행동을 강조합니다.",
    weakness: "머리의 강한 색이 답안보다 먼저 눈에 들어올 수 있습니다.",
  },
  {
    id: "H3",
    name: "칸마다 확인",
    difference: "입력과 판정을 옅은 중립 면의 독립 칸으로 구별합니다.",
    weakness:
      "많은 답을 확인할 때 같은 경계와 여백이 반복돼 화면이 길어집니다.",
  },
  {
    id: "H4",
    name: "주석이 있는 기록",
    difference:
      "남색 머리와 왼쪽 주석선, 촘촘한 정보 위계로 교사 대조에 힘을 줍니다.",
    weakness:
      "폰에서는 설명의 밀도가 높아 학생의 첫 확인에 부담이 될 수 있습니다.",
  },
] as const;
export type HifiId = (typeof HIFI_OPTIONS)[number]["id"];
export const HIFI_SCREENS = [
  ["paper", "지면"],
  ["capture", "촬영"],
  ["check", "읽은 답 확인"],
  ["student", "학생 결과"],
  ["teacher", "교사 결과"],
] as const;
export type HifiScreen = (typeof HIFI_SCREENS)[number][0];
