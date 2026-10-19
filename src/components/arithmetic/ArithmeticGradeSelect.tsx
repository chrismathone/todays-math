import { listArithmeticV2Types } from "@/lib/arithmetic-v2";

const availableGrades = new Set(
  listArithmeticV2Types().map((type) => type.grade),
);
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
].filter((grade) =>
  availableGrades.has(
    grade as import("@/lib/arithmetic-v2/types").ArithmeticGrade,
  ),
);
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
}: ArithmeticGradeControl & { includeBasic?: boolean }) {
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
        {grades.map((grade) => (
          <option key={grade}>{grade}</option>
        ))}
      </select>
    </label>
  );
}
