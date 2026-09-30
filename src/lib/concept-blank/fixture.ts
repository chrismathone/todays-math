import type { ConceptBlankBank } from "@/contracts/conceptBlank.contract";

/**
 * 개념 백지 시험 · 미리보기용 작은 은행 — 초5 두 단원(그림 단원 합동과 대칭 · 그림 아닌 단원 수의 범위).
 * 실제 은행(`bank/*.ts`)이 비어 있는 동안 화면 · 지면 트랙이 이것으로 만든다. 문장은 우리 말.
 */
const S = {
  cong: "초5::2-3 합동과 대칭::2-3-1 도형의 합동 알아보기",
  congProp: "초5::2-3 합동과 대칭::2-3-2 합동인 도형의 성질 알아보기",
  line: "초5::2-3 합동과 대칭::2-3-3 선대칭도형과 그 성질 알아보기",
  point: "초5::2-3 합동과 대칭::2-3-4 점대칭도형과 그 성질 알아보기",
  atLeast: "초5::2-1 수의 범위와 어림하기::2-1-1 이상과 이하 알아보기",
  over: "초5::2-1 수의 범위와 어림하기::2-1-2 초과와 미만 알아보기",
  round: "초5::2-1 수의 범위와 어림하기::2-1-6 반올림 알아보기와 어림의 활용",
} as const;

const house = `<polygon points="100,12 148,46 138,98 62,98 52,46" fill="#F7F3E6" stroke="#1F1F23" stroke-width="1.6"/><line x1="100" y1="2" x2="100" y2="104" stroke="#6B6B72" stroke-width="1.3" stroke-dasharray="5 3"/>`;
const para = `<polygon points="60,20 170,20 140,95 30,95" fill="#F7F3E6" stroke="#1F1F23" stroke-width="1.6"/><circle cx="100" cy="57.5" r="3.4" fill="#A57F00"/>`;

export const FIXTURE_BANK: ConceptBlankBank = {
  concepts: [
    {
      id: "fx-cong",
      section: S.cong,
      term: "합동",
      kind: "정의",
      level: "하",
      definition:
        "두 도형을 겹쳐 놓았을 때 남는 곳 없이 {꼭 맞게 겹치면} 두 도형은 서로 {합동}이다.",
      example: {
        prompt: "크기만 다른 두 정사각형은 합동인가?",
        answer: "아니다",
      },
    },
    {
      id: "fx-corr",
      section: S.congProp,
      term: "대응점 · 대응변 · 대응각",
      kind: "정의",
      level: "중",
      definition:
        "합동인 두 도형을 겹쳤을 때 서로 맞닿는 점 · 변 · 각을 각각 {대응점}, {대응변}, {대응각}이라 부른다.",
    },
    {
      id: "fx-cong-prop",
      section: S.congProp,
      term: "합동인 도형의 성질",
      kind: "성질",
      level: "중",
      definition:
        "합동인 두 도형에서 대응변끼리는 {길이}가, 대응각끼리는 {크기}가 서로 같다.",
      example: {
        prompt: "대응변 하나가 5 cm이면 짝이 되는 변은?",
        answer: "5 cm",
      },
    },
    {
      id: "fx-line",
      section: S.line,
      term: "선대칭도형",
      kind: "정의",
      level: "하",
      definition:
        "직선 하나를 따라 {반으로 접으면} 두 쪽이 꼭 맞게 포개지는 모양이 선대칭도형이고, 접는 선이 {대칭축}이다.",
    },
    {
      id: "fx-line-prop",
      section: S.line,
      term: "선대칭도형의 성질",
      kind: "성질",
      level: "상",
      definition:
        "짝이 되는 두 점을 잇는 선분과 대칭축은 {직각}을 이루고, 대칭축은 그 선분의 {한가운데}를 지난다.",
    },
    {
      id: "fx-point",
      section: S.point,
      term: "점대칭도형",
      kind: "정의",
      level: "중",
      definition:
        "어느 한 점을 축으로 삼아 {반 바퀴} 돌려도 처음 모양과 꼭 맞게 포개지면 점대칭도형이고, 그 점이 {대칭의 중심}이다.",
    },
    {
      id: "fx-at-least",
      section: S.atLeast,
      term: "이상 · 이하",
      kind: "정의",
      level: "하",
      definition:
        "기준 수를 {포함하여} 그보다 큰 쪽이 이상, 기준 수를 포함하여 그보다 {작은} 쪽이 이하이다.",
      example: { prompt: "12, 15, 18 중 15 이하인 수", answer: "12, 15" },
    },
    {
      id: "fx-over",
      section: S.over,
      term: "초과 · 미만",
      kind: "정의",
      level: "중",
      definition:
        "기준 수는 {빼고} 그보다 큰 쪽이 초과, 기준 수는 빼고 그보다 {작은} 쪽이 미만이다.",
    },
    {
      id: "fx-round",
      section: S.round,
      term: "반올림",
      kind: "방법",
      level: "상",
      definition:
        "남기려는 자리의 {한 자리 아래} 숫자를 보고 {5, 6, 7, 8, 9}면 올리고 0부터 4까지면 버린다.",
      example: { prompt: "3462를 백의 자리까지 반올림", answer: "3500" },
    },
  ],
  ox: [
    {
      id: "fx-ox-line",
      section: S.line,
      level: "중",
      statement: "선대칭도형에서 대응점을 이은 선분은 대칭축과 평행하다.",
      answer: false,
      why: "평행이 아니라 수직으로 만난다.",
    },
    {
      id: "fx-ox-at-least",
      section: S.atLeast,
      level: "하",
      statement: "30 이상인 수에는 30이 들어간다.",
      answer: true,
      why: "이상은 기준 수를 포함한다.",
    },
  ],
  apply: [
    {
      id: "fx-ap-range",
      section: S.over,
      level: "중",
      prompt: "25 이상 30 미만인 자연수를 모두 쓰시오.",
      answer: "25, 26, 27, 28, 29",
    },
    {
      id: "fx-ap-round",
      section: S.round,
      level: "상",
      prompt: "4.35를 반올림하여 소수 첫째 자리까지 나타내시오.",
      answer: "4.4",
    },
  ],
  figures: [
    {
      id: "fx-fig-line",
      section: S.line,
      level: "하",
      prompt: "이 도형과 점선",
      viewBox: "0 0 200 125",
      svg: house,
      tags: [{ x: 106, y: 104, w: 46, answer: "대칭축" }],
      lines: [
        {
          label: "도형 이름 · 뜻",
          answer: "선대칭도형 — 한 직선으로 접으면 꼭 맞게 겹친다",
        },
      ],
    },
    {
      id: "fx-fig-point",
      section: S.point,
      level: "중",
      prompt: "이 도형과 점",
      viewBox: "0 0 200 125",
      svg: para,
      tags: [{ x: 146, y: 104, w: 52, answer: "대칭의 중심" }],
      lines: [
        {
          label: "도형 이름 · 뜻",
          answer: "점대칭도형 — 180° 돌리면 처음과 꼭 맞게 겹친다",
        },
      ],
    },
  ],
};
