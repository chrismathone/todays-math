/**
 * 초등 실험실 단원 문지기.
 *
 * 71개 주요 단원을 퀴즈 코스 71개로 복제하지 않는다.
 * 화면에서 물건을 만지는 일이 그 개념인 단원만 수업으로 연다.
 *
 * 배제 근거(제품 조사·학습 연구와 단원 limit 를 맞춘 것):
 * - 문제은행·인강(수학대왕, 매쓰플랫, 아이스크림 홈런)이 이미 숙달·강의를 한다.
 * - Polypad·GeoGebra·ST Math 는 단원 퀴즈가 아니라 조작 종류로 간다.
 * - CRA·가상조작은 효과가 있으나, 저학년 실물 세기·작도·무게는 화면이 대체하지 못한다.
 * - 단원 전수는 깊이를 죽인다. 코스는 영역(길이·넓이·공간)으로 묶는다.
 */

export type LabGate = "play" | "hold" | "exclude";

export type ExcludeKind = "physical" | "drill" | "field-data";

export type LabScopeRow = {
  unitId: string;
  gate: LabGate;
  excludeKind?: ExcludeKind;
  reason: string;
};

export const WAITING_DOMAINS: {
  id: string;
  title: string;
  gradeLabel: string;
  summary: string;
}[] = [];

export const LAB_SCOPE: LabScopeRow[] = [
  {
    unitId: "1-1-1",
    gate: "exclude",
    excludeKind: "physical",
    reason: "한 칸에 하나씩 옮기며 세는 일은 화면이 대체하지 못합니다.",
  },
  {
    unitId: "1-1-2",
    gate: "exclude",
    excludeKind: "physical",
    reason: "굴러가는지·쌓이는지는 실물을 만져야 합니다.",
  },
  {
    unitId: "1-1-3",
    gate: "exclude",
    excludeKind: "physical",
    reason: "모으기와 가르기는 구체물을 옮기는 활동입니다.",
  },
  {
    unitId: "1-1-4",
    gate: "play",
    reason: "시작점을 맞추는 비교는 화면 막대로 할 수 있습니다.",
  },
  {
    unitId: "1-1-5",
    gate: "play",
    reason: "낱개를 십 묶음으로 바꾸는 일은 묶음 코스에서 합니다.",
  },
  {
    unitId: "1-2-1",
    gate: "play",
    reason: "십과 일의 자리를 바꾸는 비교는 묶음 코스에서 합니다.",
  },
  {
    unitId: "1-2-2",
    gate: "exclude",
    excludeKind: "physical",
    reason: "장면 세 개를 합치는 일은 구체물·이야기 조작입니다.",
  },
  {
    unitId: "1-2-3",
    gate: "play",
    reason: "평면 모양은 도형 코스, 시계는 시각 코스에서 합니다.",
  },
  {
    unitId: "1-2-4",
    gate: "play",
    reason: "10을 만들어 더하는 일은 묶음 코스에서 합니다.",
  },
  {
    unitId: "1-2-5",
    gate: "play",
    reason: "반복 단위를 찾는 일은 규칙 코스에서 합니다.",
  },
  {
    unitId: "1-2-6",
    gate: "play",
    reason: "10을 넘나들게 가르기는 묶음 코스에서 합니다.",
  },
  {
    unitId: "2-1-1",
    gate: "play",
    reason: "백 묶음은 묶음 코스에서 합니다.",
  },
  {
    unitId: "2-1-2",
    gate: "play",
    reason: "꼭짓점을 세는 일은 대칭 코스에서 합니다.",
  },
  {
    unitId: "2-1-3",
    gate: "exclude",
    excludeKind: "drill",
    reason:
      "받아올림 숙달은 문제은행. 묶음 교환 원리는 자릿값 코스에서만 다룹니다.",
  },
  {
    unitId: "2-1-4",
    gate: "play",
    reason: "자의 0을 맞추고 눈금을 읽는 일은 화면 자로 합니다.",
  },
  {
    unitId: "2-1-5",
    gate: "exclude",
    excludeKind: "field-data",
    reason: "분류 기준은 교실에서 물건을 나누는 일로 확인합니다.",
  },
  {
    unitId: "2-1-6",
    gate: "play",
    reason: "같은 수 묶음을 접시에 나누는 일은 배열 코스에서 합니다.",
  },
  {
    unitId: "2-2-1",
    gate: "play",
    reason: "십 묶음 열 개가 백인 관계는 묶음 코스에서 합니다.",
  },
  {
    unitId: "2-2-2",
    gate: "exclude",
    excludeKind: "drill",
    reason: "곱셈구구 암기는 문제은행. 배열의 뜻은 묶음 화면에서만 다룹니다.",
  },
  {
    unitId: "2-2-3",
    gate: "play",
    reason: "m와 cm를 같은 자로 잇는 일은 길이 코스에 있습니다.",
  },
  {
    unitId: "2-2-4",
    gate: "play",
    reason:
      "시계 바늘을 맞추는 일은 시각 코스에서 합니다. 실물 시계는 보완입니다.",
  },
  {
    unitId: "2-2-5",
    gate: "exclude",
    excludeKind: "field-data",
    reason: "표를 만드는 자료 수집은 교실에서 합니다.",
  },
  {
    unitId: "2-2-6",
    gate: "play",
    reason: "뛰어 세기는 규칙 코스에서 합니다.",
  },
  {
    unitId: "3-1-1",
    gate: "play",
    reason:
      "덧셈과 뺄셈 실험실에서 수 모형을 묶고 풀며 세로셈, 이유 설명, 새로운 수로의 적용을 연결합니다.",
  },
  {
    unitId: "3-1-2",
    gate: "play",
    reason: "선분과 직각은 도형 코스에서 합니다.",
  },
  {
    unitId: "3-1-3",
    gate: "play",
    reason: "똑같이 나누는 일은 배열 코스에서 합니다.",
  },
  {
    unitId: "3-1-4",
    gate: "play",
    reason: "배열로 나누는 일은 배열 코스에서 합니다.",
  },
  {
    unitId: "3-1-5",
    gate: "play",
    reason: "mm와 cm를 잇는 일은 시각·각 코스에서 합니다.",
  },
  {
    unitId: "3-1-6",
    gate: "play",
    reason: "똑같이 나눈 칸을 칠하는 일은 분수 코스에서 합니다.",
  },
  {
    unitId: "3-2-1",
    gate: "exclude",
    excludeKind: "drill",
    reason: "곱셈 숙달은 문제은행. 부분 곱의 뜻은 배열 화면에서만 다룹니다.",
  },
  {
    unitId: "3-2-2",
    gate: "play",
    reason: "몫과 나머지는 배열 코스에서 합니다.",
  },
  {
    unitId: "3-2-3",
    gate: "play",
    reason:
      "반지름과 지름 관계는 대칭 코스에서 합니다. 컴퍼스 작도는 넣지 않습니다.",
  },
  {
    unitId: "3-2-4",
    gate: "play",
    reason: "같은 양을 다른 분수로 보는 일은 분수 코스에서 합니다.",
  },
  {
    unitId: "3-2-5",
    gate: "exclude",
    excludeKind: "physical",
    reason: "들이와 무게는 용기와 저울을 써야 합니다.",
  },
  {
    unitId: "3-2-6",
    gate: "exclude",
    excludeKind: "field-data",
    reason: "그림그래프 자료 수집은 교실에서 합니다.",
  },
  {
    unitId: "4-1-1",
    gate: "play",
    reason: "만의 자릿값은 묶음 코스에서 합니다.",
  },
  {
    unitId: "4-1-2",
    gate: "play",
    reason: "각도기 0을 맞추고 각을 읽는 일은 시각·각 코스에서 합니다.",
  },
  {
    unitId: "4-1-3",
    gate: "exclude",
    excludeKind: "drill",
    reason: "곱셈·나눗셈 숙달과 검산은 문제은행입니다.",
  },
  {
    unitId: "4-1-4",
    gate: "play",
    reason: "직각삼각형을 가리는 일은 대칭 코스에서 합니다.",
  },
  {
    unitId: "4-1-5",
    gate: "play",
    reason: "잘린 축을 가리는 일은 그래프 코스에서 합니다.",
  },
  {
    unitId: "4-1-6",
    gate: "play",
    reason: "양쪽이 같은 양은 규칙 코스에서 합니다.",
  },
  {
    unitId: "4-2-1",
    gate: "play",
    reason: "같은 분모 조각을 합치는 일은 분수 코스에서 합니다.",
  },
  {
    unitId: "4-2-2",
    gate: "play",
    reason: "평행인 변은 도형 코스에서 합니다.",
  },
  {
    unitId: "4-2-3",
    gate: "play",
    reason: "소수 첫째 자리 칸은 분수 코스에서 합니다.",
  },
  {
    unitId: "4-2-4",
    gate: "play",
    reason: "정다각형은 도형 코스에서 합니다.",
  },
  {
    unitId: "4-2-5",
    gate: "play",
    reason: "가장 큰 값과 증가량을 가리는 일은 그래프 코스에서 합니다.",
  },
  {
    unitId: "4-2-6",
    gate: "play",
    reason: "밀기·뒤집기·돌리기를 가리는 일은 대칭 코스에서 합니다.",
  },
  {
    unitId: "5-1-1",
    gate: "exclude",
    excludeKind: "drill",
    reason: "괄호와 계산 순서 숙달은 문제은행입니다.",
  },
  {
    unitId: "5-1-2",
    gate: "play",
    reason: "같은 묶음으로 나누는 일은 배열 코스에서 합니다.",
  },
  {
    unitId: "5-1-3",
    gate: "play",
    reason: "수를 넣어 규칙을 보는 일은 규칙 코스에서 합니다.",
  },
  {
    unitId: "5-1-4",
    gate: "play",
    reason: "같은 양을 다른 분수로 보는 일은 분수 코스에서 합니다.",
  },
  {
    unitId: "5-1-5",
    gate: "play",
    reason: "같은 분모로 합치는 일은 분수 코스에서 합니다.",
  },
  {
    unitId: "5-1-6",
    gate: "play",
    reason: "잘라 옮겨도 넓이가 같은지는 넓이 코스에서 합니다.",
  },
  {
    unitId: "5-2-1",
    gate: "play",
    reason: "수직선에 점을 놓는 일은 묶음 코스에서 합니다.",
  },
  {
    unitId: "5-2-2",
    gate: "play",
    reason: "반의 반은 분수 코스에서 합니다.",
  },
  {
    unitId: "5-2-3",
    gate: "play",
    reason: "대칭축 반대 칸을 채우는 일은 대칭 코스에서 합니다.",
  },
  {
    unitId: "5-2-4",
    gate: "play",
    reason: "소수 칸을 칠하는 일은 분수 코스에서 합니다.",
  },
  {
    unitId: "5-2-5",
    gate: "play",
    reason: "전개도를 접기 전에 맞은편을 고르는 일은 공간 코스에서 합니다.",
  },
  {
    unitId: "5-2-6",
    gate: "play",
    reason: "평균을 고르게 나누는 일은 그래프 코스에서 합니다.",
  },
  {
    unitId: "6-1-1",
    gate: "play",
    reason: "1 안에 단위 분수가 몇 번인지 세는 일은 분수 코스에서 합니다.",
  },
  {
    unitId: "6-1-2",
    gate: "play",
    reason: "각기둥의 밑면은 겉넓이 코스에서 합니다.",
  },
  {
    unitId: "6-1-3",
    gate: "play",
    reason: "소수끼리 몇 번 들어가는지는 분수 코스에서 합니다.",
  },
  {
    unitId: "6-1-4",
    gate: "play",
    reason: "두 양을 같은 묶음으로 늘리는 일은 비 코스에서 합니다.",
  },
  {
    unitId: "6-1-5",
    gate: "play",
    reason: "질문에 맞는 그래프를 고르는 일은 그래프 코스에서 합니다.",
  },
  {
    unitId: "6-1-6",
    gate: "play",
    reason: "여섯 면을 펼쳐 덮는 일은 겉넓이 코스에서 합니다.",
  },
  {
    unitId: "6-2-1",
    gate: "play",
    reason: "분수 단위가 몇 번인지는 분수 코스에서 합니다.",
  },
  {
    unitId: "6-2-2",
    gate: "play",
    reason: "쌓기나무를 여러 방향에서 보는 일은 공간 코스에서 합니다.",
  },
  {
    unitId: "6-2-3",
    gate: "play",
    reason: "같이 배로 바꿔도 몫이 같은지는 분수 코스에서 합니다.",
  },
  {
    unitId: "6-2-4",
    gate: "play",
    reason: "총량을 비에 맞게 나누는 일은 비 코스에서 합니다.",
  },
  {
    unitId: "6-2-5",
    gate: "play",
    reason: "원 조각을 늘어놓는 일은 넓이 코스에서 합니다.",
  },
  {
    unitId: "6-2-6",
    gate: "play",
    reason: "회전체 옆면은 겉넓이 코스에서 합니다. 실물 절단은 보완입니다.",
  },
];

export function labScopeById(): Record<string, LabScopeRow> {
  return Object.fromEntries(LAB_SCOPE.map((row) => [row.unitId, row]));
}

export function scopeSummary() {
  return {
    play: LAB_SCOPE.filter((r) => r.gate === "play").length,
    hold: LAB_SCOPE.filter((r) => r.gate === "hold").length,
    excluded: LAB_SCOPE.filter((r) => r.gate === "exclude").length,
    physical: LAB_SCOPE.filter((r) => r.excludeKind === "physical").length,
    drill: LAB_SCOPE.filter((r) => r.excludeKind === "drill").length,
    fieldData: LAB_SCOPE.filter((r) => r.excludeKind === "field-data").length,
  };
}
