/** 전부 지어낸 예시. 실제 학생·은행 문항·DB를 참조하지 않는다. */
export const QUESTIONS = Array.from({ length: 20 }, (_, i) => ({
  no: i + 1,
  unit: i < 10 ? "일차방정식의 풀이" : "일차방정식의 활용",
  type: i % 2 ? "등식의 성질" : "해 구하기",
  content: `방정식 x + ${i + 3} = ${i + 10}의 해를 구하시오.`,
  answer: "x = 7",
  solution: `양변에서 ${i + 3}을 빼면 x = ${i + 10} − ${i + 3} = 7입니다.`,
  points: 5,
}));

export const SCENARIOS = {
  normal: "기본",
  many: "많은 오답",
  zero: "0점",
  perfect: "만점",
  absent: "결시",
  ungraded: "미채점",
  long: "긴 이름·문장",
} as const;
export type Scenario = keyof typeof SCENARIOS;
export type Pupil = { name: string; marks: boolean[] | "absent" | "ungraded" };
export const isMarks = (marks: Pupil["marks"]): marks is boolean[] =>
  Array.isArray(marks);
export const score = (marks: boolean[]) =>
  marks.reduce((sum, right, i) => sum + (right ? QUESTIONS[i].points : 0), 0);

export function fixture(scenario: Scenario) {
  const normal = QUESTIONS.map((q) => ![8, 12, 17, 20].includes(q.no));
  const marks =
    scenario === "absent" || scenario === "ungraded"
      ? scenario
      : scenario === "zero"
        ? normal.map(() => false)
        : scenario === "perfect"
          ? normal.map(() => true)
          : scenario === "many"
            ? normal.map((_, i) => i % 4 === 0)
            : normal;
  const pupils: Pupil[] = [
    { name: scenario === "long" ? "남궁하늘봄아리아" : "서하린", marks },
    ...["윤해온", "강이솔", "도라윤", "문가람", "백여울"].map((name, k) => ({
      name,
      marks: QUESTIONS.map((_, i) => (i + k * 3) % (k + 3) !== 0),
    })),
    { name: "차시온", marks: "absent" },
    { name: "한새봄", marks: "ungraded" },
  ];
  const me = pupils[0];
  const taken = pupils.filter((p): p is Pupil & { marks: boolean[] } =>
    isMarks(p.marks),
  );
  const wrong = isMarks(me.marks)
    ? QUESTIONS.filter((_, i) => !me.marks[i])
    : [];
  const note =
    "등식의 양변에 같은 수를 더하거나 빼는 과정을 한 줄씩 적어 보세요. 문장으로 주어진 조건은 먼저 식으로 옮기고, 구한 값을 원래 조건에 넣어 확인합니다.";
  return {
    me,
    pupils,
    taken,
    wrong,
    average: taken.length
      ? (
          taken.reduce((sum, p) => sum + score(p.marks), 0) / taken.length
        ).toFixed(1)
      : null,
    note: scenario === "long" ? `${note}\n${note}\n${note}` : note,
  };
}
