export type WireOption = {
  id: string;
  title: string;
  difference: string;
  weakness: string;
};
export const PAPER_OPTIONS = [
  {
    id: "P1",
    title: "머리 옆 독립 열",
    mm: 20,
    layout: "side",
    keyQr: true,
    difference: "제목·날짜·이름 줄 옆에 20mm QR 열을 둡니다.",
    weakness: "기존 머리의 가로 폭이 줄어 긴 제목의 줄바꿈을 확인해야 합니다.",
  },
  {
    id: "P2",
    title: "날짜 위 QR",
    mm: 24,
    layout: "aboveDate",
    keyQr: true,
    difference: "오른쪽 날짜·이름 줄 위에 24mm QR을 쌓습니다.",
    weakness: "머리가 높아져 첫 쪽의 쓰기 공간이 줄어듭니다.",
  },
  {
    id: "P3",
    title: "머리 위 전용 띠",
    mm: 28,
    layout: "band",
    keyQr: true,
    difference: "기존 머리를 온전히 두고 위쪽 띠의 우측에 28mm QR을 둡니다.",
    weakness:
      "현재 쪽 나눔에서 긴 제목 표본의 채점표 첫 쪽이 본문 영역을 약 26px 넘습니다. 적용 전 쪽 나눔 재검토가 필요합니다.",
  },
  {
    id: "P4",
    title: "이름 아래 · 학생지만",
    mm: 22,
    layout: "belowDate",
    keyQr: false,
    difference:
      "오른쪽 이름 줄 아래에 22mm QR을 두고 채점표에는 글자 코드만 둡니다.",
    weakness: "QR이 상단 모서리에서 내려오며 채점표는 QR로 구별할 수 없습니다.",
  },
] as const;
export type PaperOption = (typeof PAPER_OPTIONS)[number];
export const CAPTURE_OPTIONS: WireOption[] = [
  {
    id: "C1",
    title: "한 쪽씩 촬영",
    difference: "현재 쪽과 전체 지면 틀을 먼저 보고 한 쪽씩 채웁니다.",
    weakness: "이미 찍은 쪽은 아래 지면 띠에서 확인해야 합니다.",
  },
  {
    id: "C2",
    title: "쪽 목록 먼저",
    difference: "쪽별 완료·미촬영 목록에서 찍을 쪽을 고릅니다.",
    weakness: "목록과 촬영 틀을 함께 보여 첫 화면이 길어집니다.",
  },
  {
    id: "C3",
    title: "촬영과 제출 분리",
    difference: "촬영 뒤 별도 확인 단계에서 전체 쪽을 검토합니다.",
    weakness: "재촬영할 때 촬영 단계로 돌아가야 합니다.",
  },
  {
    id: "C4",
    title: "답안 주인 먼저",
    difference: "답안 주인과 찍은 쪽을 위에 두고 아래에서 다음 쪽을 찍습니다.",
    weakness: "교사에게는 식별이 쉽지만 학생의 촬영 틀이 아래로 밀립니다.",
  },
];
export const RESULT_OPTIONS: WireOption[] = [
  {
    id: "R1",
    title: "종합 점수 우선",
    difference: "종합 점수를 가장 크게 두고 그 아래 문항별 판정을 놓습니다.",
    weakness:
      "A~E 합산 단위와 확인 필요의 처리 방식이 미정이므로 점수 숫자는 비워 둡니다.",
  },
  {
    id: "R2",
    title: "문항별만",
    difference:
      "총점을 두지 않고 지면 순서대로 ○ · △ · × · 확인 필요를 보여 줍니다.",
    weakness: "전체 상황을 한 숫자로 비교할 수 없습니다.",
  },
  {
    id: "R3",
    title: "확인 필요 먼저",
    difference:
      "판독이 불확실한 문항을 앞에 분리하고 나머지 결과를 이어 보여 줍니다.",
    weakness: "시험지의 문항 순서와 화면의 읽는 순서가 달라집니다.",
  },
  {
    id: "R4",
    title: "지면과 나란히",
    difference:
      "교사는 원본 지면과 문항 판정을 좌우로, 학생은 위아래로 봅니다.",
    weakness: "폰에서는 사진과 판정을 대조할 때 스크롤이 길어집니다.",
  },
];
export const READ_OPTIONS = [
  {
    id: "V1",
    title: "밑줄 · 왼쪽 번호",
    mark: "underline",
    badge: "left",
    zoom: true,
    continuous: false,
    after: false,
    difference:
      "답 칸 밑줄과 왼쪽 번호. 쪽마다 ①부터, 번호를 누르면 확대, ○△× 공개 전에 수정합니다.",
    weakness: "줄이 있는 지면에서는 밑줄과 원래 쓰기 줄을 구별하기 어렵습니다.",
  },
  {
    id: "V2",
    title: "형광 띠 · 위쪽 번호",
    mark: "highlight",
    badge: "top",
    zoom: true,
    continuous: true,
    after: false,
    difference:
      "답 칸 전체에 형광 띠. 번호는 쪽을 넘어 이어지고 번호를 누르면 확대, 공개 전에 수정합니다.",
    weakness: "색 면이 필기와 겹치므로 원본 대조가 필요합니다.",
  },
  {
    id: "V3",
    title: "테두리 · 오른쪽 번호",
    mark: "outline",
    badge: "right",
    zoom: true,
    continuous: true,
    after: true,
    difference:
      "답 칸 테두리와 오른쪽 번호. 번호는 이어지고 확대하며, 공개 뒤에도 직접 입력할 수 있습니다.",
    weakness: "직접 입력 뒤 바뀐 판정과 기존 판정의 이력 표시가 더 필요합니다.",
  },
  {
    id: "V4",
    title: "모서리 선 · 안쪽 번호",
    mark: "corners",
    badge: "inside",
    zoom: false,
    continuous: false,
    after: true,
    difference:
      "답 칸 모서리와 안쪽 번호. 쪽마다 ①부터, 번호는 입력 칸으로 이동하며 공개 뒤에도 고칩니다.",
    weakness: "번호가 필기를 가릴 수 있고 확대 없이 작은 글을 읽기 어렵습니다.",
  },
] as const;
export type ReadOption = (typeof READ_OPTIONS)[number];
