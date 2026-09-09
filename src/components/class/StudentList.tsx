import { Button } from "@/components/ui/Button";
import type { ClassEntity, StudentEntity } from "@/contracts/class.contract";

type StudentListProps = {
  students: StudentEntity[];
  selectedClass?: ClassEntity;
  status: "loading" | "ready" | "error";
  onRetry: () => void;
};

export function StudentList({
  students,
  selectedClass,
  status,
  onRetry,
}: StudentListProps) {
  return (
    <div>
      <h2
        id="class-students-heading"
        className="mb-2 border-t-[3px] border-ink pt-1.5 text-[10.5px] font-black tracking-[2.5px]"
      >
        학생
      </h2>
      {selectedClass ? (
        <p className="mb-3 break-words text-[12.5px] font-bold text-ink">
          {selectedClass.name} · {selectedClass.grade}
        </p>
      ) : null}
      {!selectedClass ? (
        <p className="text-[12.5px] text-text-2">
          반을 추가하면 학생을 등록할 수 있습니다.
        </p>
      ) : status === "loading" ? (
        <p role="status" className="text-[12.5px] text-text-2">
          학생 목록을 불러오는 중…
        </p>
      ) : status === "error" ? (
        <div>
          <p role="alert" className="mb-2 text-[12.5px] text-g-red-text">
            학생 목록을 불러오지 못했습니다.
          </p>
          <Button variant="secondary" onClick={onRetry}>
            학생 목록 다시 불러오기
          </Button>
        </div>
      ) : students.length === 0 ? (
        <p className="text-[12.5px] text-text-2">
          등록된 학생이 없습니다. 아래에서 첫 학생을 등록해 주세요.
        </p>
      ) : null}
      <ul aria-label="학생" className="flex flex-col">
        {students.map((student) => (
          <li
            key={student.id}
            className="border-b border-divider py-2.5 text-[12.5px] font-bold"
          >
            {student.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
