import { SAMPLE_NETS } from "../cubeNets";
import { qtyPicks } from "../picks";
import { DEMO_STACK } from "../stackMath";
import type { CourseDef } from "../types";

export const SPACE_COURSE: CourseDef = {
  id: "space",
  title: "전개도와 쌓기나무",
  gradeLabel: "5·6학년",
  unitIds: ["5-2-5", "6-2-2"],
  summary:
    "접히기 전에 맞은편을 예측하고, 쌓기나무를 여러 방향에서 세고 가려진 칸을 찾습니다.",
  flow: "면 예측 → 접기 → 다른 전개도 → 쌓기 · 위·앞·옆 → 가려진 칸",
  activities: [
    {
      id: "face-count",
      kind: "recall",
      title: "정육면체의 면",
      intro: "정육면체의 면은 몇 개일까요.",
      engine: {
        type: "choice",
        options: qtyPicks(6, [4, 8, 12]),
        correct: "6",
        diagram: "cube-net",
      },
      hints: [
        { id: "h1", text: "위, 아래, 앞, 뒤, 왼쪽, 오른쪽을 세어 보세요." },
      ],
      success: "면은 6개입니다.",
      wrong: "마주 보는 면이 세 쌍입니다.",
    },
    {
      id: "predict-A",
      kind: "predict",
      title: "접히기 전에 맞은편",
      intro:
        "아래 전개도에서 A면과 마주 보게 될 면을 고르세요. 아직 접지 않아도 됩니다.",
      engine: {
        type: "cube-fold",
        model: "cube",
        fromFace: "A",
        correct: "F",
        choices: ["B", "C", "D", "E", "F"],
        foldable: false,
      },
      hints: [
        {
          id: "h1",
          text: "A에 붙어 있는 면은 옆면이 됩니다. 붙어 있지 않은 먼 면이 맞은편입니다.",
        },
      ],
      success: "A의 맞은편은 F입니다.",
      wrong: "A와 한 변을 공유하는 면은 옆이 됩니다.",
    },
    {
      id: "fold-A",
      kind: "manipulate",
      title: "접어서 확인하기",
      intro:
        "전개도를 끝까지 접고 돌려 보세요. A와 마주 보는 면을 다시 고르세요.",
      engine: {
        type: "cube-fold",
        model: "cube",
        fromFace: "A",
        correct: "F",
        choices: ["B", "C", "D", "E", "F"],
      },
      hints: [
        {
          id: "h1",
          text: "접기 손잡이를 100%까지 민 뒤, A의 반대쪽 벽을 보세요.",
          backTo: "predict-A",
        },
      ],
      success: "접으면 A의 맞은편이 F입니다.",
      wrong: "끝까지 접고 위를 돌려 A의 반대쪽을 확인하세요.",
    },
    {
      id: "transfer-B",
      kind: "apply",
      title: "펼친 상태에서 B의 맞은편",
      intro: "같은 전개도에서, 접지 않고 B면의 맞은편을 고르세요.",
      engine: {
        type: "cube-fold",
        model: "cube",
        fromFace: "B",
        correct: "C",
        choices: ["A", "C", "D", "E", "F"],
        foldable: false,
      },
      hints: [
        {
          id: "h1",
          text: "B는 A의 한쪽 벽입니다. 반대쪽 벽이 C입니다.",
          backTo: "fold-A",
        },
      ],
      success: "B의 맞은편은 C입니다.",
      wrong: "A를 바닥에 두면 B와 C가 서로 마주 보는 벽입니다.",
    },
    {
      id: "net-valid",
      kind: "apply",
      title: "접히는 전개도",
      intro: "정육면체로 접히는 전개도를 모두 고르세요.",
      engine: {
        type: "net-pick",
        nets: SAMPLE_NETS.map((n) => ({
          id: n.id,
          cells: n.cells,
          label: n.id,
        })),
        correct: SAMPLE_NETS.filter((n) => n.valid).map((n) => n.id),
      },
      hints: [
        {
          id: "h1",
          text: "한 줄로 여섯 칸이거나 2×3 직사각형은 접으면 면이 겹칩니다.",
          backTo: "fold-A",
        },
      ],
      success: "십자, T, Z처럼 접혀도 면이 겹치지 않는 모양이 전개도입니다.",
      wrong: "접었을 때 두 면이 같은 자리를 쓰는지 떠올려 보세요.",
    },
    {
      id: "net-invalid",
      kind: "reason",
      title: "왜 이 모양은 안 접힐까요",
      intro: "가로 6칸짜리 띠는 정육면체 전개도가 아닙니다. 까닭을 고르세요.",
      engine: {
        type: "choice",
        options: [
          { id: "overlap", label: "접으면 면이 겹치거나 닫히지 않습니다" },
          { id: "color", label: "칸의 색이 여섯 가지가 아닙니다" },
        ],
        correct: "overlap",
      },
      hints: [
        {
          id: "h1",
          text: "긴 띠를 접으면 먼저 접힌 면 위에 다음 면이 올라갑니다.",
          backTo: "net-valid",
        },
      ],
      success: "한 줄 여섯 칸은 접히면서 면이 겹칩니다.",
      wrong: "색이 아니라 면이 겹치는지가 기준입니다.",
    },
    {
      id: "cuboid-fold",
      kind: "manipulate",
      title: "직육면체 전개도",
      intro:
        "가로 4cm, 세로 3cm, 높이 2cm인 상자를 접어 보세요. 1면의 맞은편은 몇 번일까요.",
      engine: {
        type: "cube-fold",
        model: "cuboid",
        fromFace: "1",
        correct: "6",
        choices: ["2", "3", "4", "5", "6"],
      },
      hints: [
        {
          id: "h1",
          text: "같은 색으로 표시된 두 면이 마주 봅니다. 1과 6이 한 쌍입니다.",
          backTo: "fold-A",
        },
      ],
      success: "1면의 맞은편은 6면입니다.",
      wrong: "끝까지 접고 상자 위아래를 확인해 보세요.",
    },
    {
      id: "stack-count",
      kind: "observe",
      title: "쌓기나무 몇 개",
      intro:
        "모형을 돌리거나 층을 벌려 가려진 칸까지 세세요. 쌓기나무는 몇 개일까요.",
      engine: {
        type: "stack-view",
        heights: DEMO_STACK,
        question: "count",
        correct: 12,
        picks: qtyPicks(12, [8, 9, 15]),
      },
      hints: [{ id: "h1", text: "층을 벌리면 아래에 가려진 칸이 보입니다." }],
      success: "모두 12개입니다.",
      wrong: "위에서 보이는 칸만 세면 가려진 칸이 빠집니다.",
    },
    {
      id: "stack-front",
      kind: "apply",
      title: "앞에서 본 높이",
      intro: "앞에서 볼 때 왼쪽부터 높이를 고르세요.",
      engine: {
        type: "stack-view",
        heights: DEMO_STACK,
        question: "front",
        correct: "2,3,1",
        picks: [
          { id: "2,3,1", label: "2, 3, 1" },
          { id: "1,3,2", label: "1, 3, 2" },
          { id: "2,2,1", label: "2, 2, 1" },
          { id: "3,2,1", label: "3, 2, 1" },
        ],
      },
      hints: [
        {
          id: "h1",
          text: "앞에서 보면 각 열에서 가장 높은 칸만 보입니다.",
          backTo: "stack-count",
        },
      ],
      success: "앞에서 본 높이는 2, 3, 1입니다.",
      wrong: "왼쪽 열부터 앞에서 보이는 최고 높이를 적으세요.",
    },
    {
      id: "stack-hidden",
      kind: "apply",
      title: "앞에서 가려진 칸",
      intro: "앞에서 볼 때 가려져 보이지 않는 쌓기나무는 몇 개일까요.",
      engine: {
        type: "stack-view",
        heights: DEMO_STACK,
        question: "hidden-front",
        correct: 6,
        picks: qtyPicks(6, [0, 3, 12]),
      },
      hints: [
        {
          id: "h1",
          text: "전체 12개에서 앞에서 보이는 6개를 빼 보세요.",
          backTo: "stack-front",
        },
      ],
      success: "앞에서 보이는 칸은 6개, 가려진 칸은 6개입니다.",
      wrong: "앞 실루엣에 가려 뒤에 있는 칸을 빼지 말고 세세요.",
    },
    {
      id: "stack-ambiguous",
      kind: "reason",
      title: "앞모습만으로 개수를 알 수 있을까요",
      intro:
        "앞에서 본 높이가 2, 3, 1로만 주어졌습니다. 쌓기나무 개수는 하나로 정해질까요.",
      engine: {
        type: "choice",
        options: [
          {
            id: "no",
            label: "뒤에 숨은 칸을 다르게 쌓을 수 있어 정해지지 않습니다",
          },
          { id: "yes", label: "앞모습만 있으면 개수는 항상 하나입니다" },
        ],
        correct: "no",
      },
      hints: [
        {
          id: "h1",
          text: "같은 앞모습이어도 뒤쪽에 칸을 더 넣을 수 있습니다.",
          backTo: "stack-hidden",
        },
      ],
      success: "앞모습만으로는 가려진 칸의 수가 하나로 정해지지 않습니다.",
      wrong: "뒤에 칸을 더하거나 빼도 앞모습은 같을 수 있습니다.",
    },
    {
      id: "stack-build",
      kind: "manipulate",
      title: "위와 같이 쌓기",
      intro:
        "칸을 눌러 높이를 바꾸어, 위 모양이 왼쪽 1·오른쪽 2 / 왼쪽 1·오른쪽 0 이 되게 하세요.",
      engine: {
        type: "stack-build",
        target: [
          [1, 2],
          [1, 0],
        ],
      },
      hints: [
        {
          id: "h1",
          text: "왼쪽 클릭은 1 올리고, 오른쪽 클릭은 1 내립니다.",
        },
      ],
      success: "위에서 본 높이가 목표와 같습니다.",
      wrong: "각 칸의 숫자를 목표와 비교해 보세요.",
    },
    {
      id: "layer-separate",
      kind: "observe",
      title: "층별로 벌려 보기",
      intro: "층을 벌린 뒤 1층, 2층, 3층의 개수를 더한 값을 고르세요.",
      engine: {
        type: "stack-view",
        heights: DEMO_STACK,
        question: "count",
        correct: 12,
        picks: qtyPicks(12, [8, 11, 3]),
      },
      hints: [
        {
          id: "h1",
          text: "1층 8개, 2층 3개, 3층 1개입니다.",
          backTo: "stack-count",
        },
      ],
      success: "8+3+1=12입니다.",
      wrong: "각 층의 칸을 따로 센 뒤 더하세요.",
    },
    {
      id: "rhythm-net",
      kind: "rhythm",
      title: "전개도 빠르게",
      intro: "2×3 직사각형 여섯 칸은 정육면체 전개도일까요.",
      engine: {
        type: "choice",
        options: [
          { id: "no", label: "아닙니다" },
          { id: "yes", label: "맞습니다" },
        ],
        correct: "no",
      },
      hints: [
        { id: "h1", text: "접으면 면이 겹칩니다.", backTo: "net-invalid" },
      ],
      success: "2×3 직사각형은 전개도가 아닙니다.",
      wrong: "접혀서 상자가 되는지, 면이 겹치는지 떠올리세요.",
    },
    {
      id: "transfer-stack",
      kind: "apply",
      title: "새 쌓기나무",
      intro: "높이가 앞줄부터 2·0 / 1·1 일 때 쌓기나무는 몇 개일까요.",
      engine: {
        type: "stack-view",
        heights: [
          [2, 0],
          [1, 1],
        ],
        question: "count",
        correct: 4,
        picks: qtyPicks(4, [3, 5, 2]),
      },
      hints: [{ id: "h1", text: "칸의 숫자를 모두 더하세요." }],
      success: "2+0+1+1=4개입니다.",
      wrong: "빈 칸 0은 더하지 않습니다.",
    },
  ],
};
