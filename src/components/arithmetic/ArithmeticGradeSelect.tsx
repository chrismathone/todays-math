import type { ArithmeticGrade } from "@/lib/arithmetic-v2/types";
const grades = [
  "초1",
  "초2",
  "초3",
  "초4",
  "초5",
  "초6",
  "중1",
  "중2",
  "중3",
] satisfies ArithmeticGrade[];
export type ArithmeticGradeControl = {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

export function ArithmeticGradeSelect({
  value,
  disabled,
  onChange,
  includeBasic = true,
  availableGrades,
}: ArithmeticGradeControl & {
  includeBasic?: boolean;
  availableGrades?: ReadonlySet<ArithmeticGrade>;
}) {
  return (
    <label>
      학년
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        <option>전체</option>
        {includeBasic && <option>기초 연산</option>}
        {grades
          .filter((grade) => !availableGrades || availableGrades.has(grade))
          .map((grade) => (
            <option key={grade}>{grade}</option>
          ))}
      </select>
    </label>
  );
}
