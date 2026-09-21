import { qtyPicks } from "../picks";
import type { CourseDef } from "../types";

export const VOLUME_COURSE: CourseDef = {
  id: "volume",
  title: "겉넓이와 회전체",
  gradeLabel: "6학년",
  unitIds: ["6-1-2", "6-1-6", "6-2-6"],
  summary:
    "직육면체의 여섯 면을 펼쳐 덮고, 겉넓이와 부피를 가리며 회전체의 면을 봅니다.",
  flow: "면 덮기 → 겉넓이 → 부피 → 회전체 옆면",
  activities: [
    {
      id: "prism-faces",
      kind: "recall",
      title: "각기둥의 밑면",
      intro: "삼각기둥의 밑면은 어떤 모양일까요.",
      engine: {
        type: "choice",
        options: [
          { id: "tri", label: "삼각형" },
          { id: "sq", label: "정사각형만" },
          { id: "circ", label: "원" },
        ],
        correct: "tri",
      },
      hints: [{ id: "h1", text: "이름에 밑면의 모양이 들어 있습니다." }],
      success: "삼각기둥의 밑면은 삼각형입니다.",
      wrong: "각기둥 이름 앞이 밑면입니다.",
    },
    {
      id: "cover-faces",
      kind: "manipulate",
      title: "여섯 면 덮기",
      intro: "가로 3, 세로 2, 높이 4인 직육면체의 여섯 면을 모두 누르세요.",
      engine: { type: "surface", l: 3, w: 2, h: 4 },
      hints: [{ id: "h1", text: "위·아래, 앞·뒤, 왼쪽·오른쪽입니다." }],
      success: "여섯 면을 모두 덮었습니다.",
      wrong: "아직 안 누른 면이 있습니다.",
    },
    {
      id: "surface-num",
      kind: "apply",
      title: "겉넓이",
      intro: "가로 3, 세로 2, 높이 4인 직육면체의 겉넓이는 몇 칸일까요.",
      engine: {
        type: "choice",
        options: qtyPicks(52, [24, 36, 48]),
        correct: "52",
      },
      hints: [
        {
          id: "h1",
          text: "2×(3×2 + 3×4 + 2×4)=2×(6+12+8)=52.",
          backTo: "cover-faces",
        },
      ],
      success: "겉넓이는 52칸입니다.",
      wrong: "세 쌍의 면을 더해 두 배로 하세요.",
    },
    {
      id: "volume-num",
      kind: "apply",
      title: "부피",
      intro:
        "가로 3, 세로 2, 높이 4인 직육면체를 단위 정육면체로 채우면 몇 개일까요.",
      engine: {
        type: "choice",
        options: qtyPicks(24, [52, 12, 9]),
        correct: "24",
      },
      hints: [
        {
          id: "h1",
          text: "3×2×4입니다. 겉넓이와 다릅니다.",
          backTo: "surface-num",
        },
      ],
      success: "부피는 24입니다.",
      wrong: "속을 채우는 개수는 가로×세로×높이입니다.",
    },
    {
      id: "error-skin",
      kind: "error-hunt",
      title: "누가 겉과 속을 섞었을까요",
      intro:
        "가로 3, 세로 2, 높이 4에 대한 설명입니다. 겉넓이를 부피로 읽은 설명을 고르세요.",
      engine: {
        type: "error-hunt",
        scenes: [
          { id: "ok-haeun", title: "하은", detail: "속은 3×2×4=24" },
          {
            id: "bad-minsu",
            title: "민수",
            detail: "겉넓이 52가 속에 들어가는 개수",
          },
          { id: "ok-doyun", title: "도윤", detail: "겉은 여섯 면을 덮은 칸" },
        ],
        wrong: "bad-minsu",
      },
      hints: [
        {
          id: "h1",
          text: "덮는 양과 채우는 양을 가르세요.",
          backTo: "volume-num",
        },
      ],
      success: "민수는 겉넓이를 부피로 읽었습니다.",
      wrong: "겉은 면, 속은 칸의 개수입니다.",
    },
    {
      id: "cylinder-side",
      kind: "observe",
      title: "원기둥 옆면",
      intro: "원기둥의 옆면을 펼치면 무슨 모양이 될까요.",
      engine: {
        type: "solid",
        shape: "cylinder",
        options: [
          { id: "rect", label: "직사각형" },
          { id: "circ", label: "원 두 개만" },
          { id: "tri", label: "삼각형" },
        ],
        correct: "rect",
      },
      hints: [{ id: "h1", text: "옆을 한 바퀴 풀어 보세요." }],
      success: "옆면은 직사각형입니다.",
      wrong: "밑면은 원, 옆면은 직사각형입니다.",
    },
    {
      id: "cone-side",
      kind: "observe",
      title: "원뿔 옆면",
      intro: "원뿔의 옆면을 펼치면 무슨 모양이 될까요.",
      engine: {
        type: "solid",
        shape: "cone",
        options: [
          { id: "sector", label: "부채꼴" },
          { id: "rect", label: "직사각형" },
          { id: "circ", label: "원만" },
        ],
        correct: "sector",
      },
      hints: [
        { id: "h1", text: "꼭짓점에서 밑둘레까지가 부채꼴의 반지름입니다." },
      ],
      success: "옆면은 부채꼴입니다.",
      wrong: "원기둥처럼 직사각형이 되지 않습니다.",
    },
    {
      id: "sphere-net",
      kind: "reason",
      title: "구의 전개",
      intro: "구를 종이 한 장으로 빈틈없이 펼칠 수 있을까요.",
      engine: {
        type: "solid",
        shape: "sphere",
        options: [
          { id: "no", label: "한 장으로 빈틈없이 펼치지 못합니다" },
          { id: "yes", label: "원 한 장으로 펼칩니다" },
        ],
        correct: "no",
      },
      hints: [
        { id: "h1", text: "지구본을 종이에 펴 보면 찢어지거나 겹칩니다." },
      ],
      success: "구는 전개도로 펼치지 못합니다.",
      wrong: "곡면 전체가 평면에 겹치지 않고 앉지 않습니다.",
    },
    {
      id: "rhythm-vol",
      kind: "rhythm",
      title: "2, 3, 1의 부피",
      intro: "가로 2, 세로 3, 높이 1인 직육면체의 부피는 얼마일까요.",
      engine: {
        type: "choice",
        options: qtyPicks(6, [12, 5, 7]),
        correct: "6",
      },
      hints: [{ id: "h1", text: "2×3×1." }],
      success: "6입니다.",
      wrong: "세 수를 곱하세요.",
    },
    {
      id: "cover-small",
      kind: "manipulate",
      title: "작은 상자 덮기",
      intro: "가로 2, 세로 1, 높이 1인 직육면체의 여섯 면을 모두 누르세요.",
      engine: { type: "surface", l: 2, w: 1, h: 1 },
      hints: [
        {
          id: "h1",
          text: "여섯 버튼을 모두 선택하세요.",
          backTo: "cover-faces",
        },
      ],
      success: "여섯 면을 덮었습니다. 겉넓이는 10칸입니다.",
      wrong: "남은 면을 누르세요.",
    },
    {
      id: "explain-skin",
      kind: "explain",
      title: "겉과 속의 차이",
      intro: "겉넓이와 부피가 다른 이유는 무엇일까요.",
      engine: {
        type: "choice",
        options: [
          {
            id: "skin",
            label: "겉넓이는 면을 덮는 칸, 부피는 속을 채우는 칸입니다",
          },
          { id: "same", label: "둘 다 같은 칸을 셉니다" },
        ],
        correct: "skin",
      },
      hints: [
        {
          id: "h1",
          text: "포장지와 속에 들어가는 블록을 떠올리세요.",
          backTo: "error-skin",
        },
      ],
      success: "덮는 양과 채우는 양은 다릅니다.",
      wrong: "면의 합과 가로×세로×높이를 가르세요.",
    },
    {
      id: "transfer-cyl",
      kind: "apply",
      title: "원기둥의 밑면",
      intro: "원기둥을 세워 두면 밑면은 무슨 모양일까요.",
      engine: {
        type: "choice",
        options: [
          { id: "circ", label: "원" },
          { id: "rect", label: "직사각형" },
          { id: "tri", label: "삼각형" },
        ],
        correct: "circ",
      },
      hints: [
        {
          id: "h1",
          text: "옆면을 펼치면 직사각형, 밑면은 원입니다.",
          backTo: "cylinder-side",
        },
      ],
      success: "밑면은 원입니다.",
      wrong: "위와 아래가 원입니다.",
    },
  ],
};
