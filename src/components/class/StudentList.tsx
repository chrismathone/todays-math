"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { OwnerTag } from "@/components/ui/OwnerTag";
import { nameSelectionClass } from "@/components/ui/rowSelection";
import type { ClassEntity, StudentEntity } from "@/contracts/class.contract";

/**
 * 오늘의 개념 로그인 칸 — 학생 이름을 눌렀을 때만 불러온다(계약·zod 를 반 관리 첫 화면에 싣지 않게).
 * 한 명씩이다(D-124 ⑷ · learn-screens 브리프 §1.3).
 */
const StudentAccountPanel = dynamic(
  () =>
    import("@/components/class/StudentAccountPanel").then(
      (module) => module.StudentAccountPanel,
    ),
  {
    loading: () => (
      <p role="status" className="mt-3 text-[12.5px] text-text-2">
        계정 정보를 불러오는 중…
      </p>
    ),
  },
);

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
  // 고른 학생은 **그 반 안에서만** 산다 — 반을 바꾸면 칸이 닫힌다(초기 비밀번호도 같이 사라진다)
  const [picked, setPicked] = useState<{
    classId: string;
    studentId: string;
  } | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const pickedId =
    picked && picked.classId === selectedClass?.id ? picked.studentId : null;
  const pickedStudent =
    status === "ready"
      ? (students.find((row) => row.id === pickedId) ?? null)
      : null;

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
          {/* 담당 — 서버가 실어 보낼 때만(관리자, D-132) */}
          {selectedClass.owner ? (
            <OwnerTag owner={selectedClass.owner} className="ml-2" />
          ) : null}
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
        {(status === "ready" ? students : []).map((student) => {
          const selected = student.id === pickedId;
          return (
            <li key={student.id} className="border-b border-divider">
              {/*
               * 이름 단추 — 누르면 그 학생의 오늘의 개념 로그인 칸이 선다(한 번 더 누르면 닫힌다).
               * 고른 표시는 반 목록과 같은 어법(`rowSelection.ts`). ⚠️ D-30 — 행에는 손가락·hover 가 없다.
               */}
              <button
                type="button"
                aria-pressed={selected}
                aria-expanded={selected}
                aria-controls={`student-account-${student.id}-panel`}
                onClick={(event) => {
                  opener.current = event.currentTarget;
                  setPicked(
                    selected || !selectedClass
                      ? null
                      : { classId: selectedClass.id, studentId: student.id },
                  );
                }}
                className={`min-h-11 w-full py-2.5 text-left text-[12.5px] font-bold ${nameSelectionClass(selected)}`}
              >
                {student.name}
              </button>
            </li>
          );
        })}
      </ul>
      {pickedStudent ? (
        <StudentAccountPanel
          key={pickedStudent.id}
          student={pickedStudent}
          onClose={() => {
            setPicked(null);
            opener.current?.focus();
          }}
        />
      ) : null}
    </div>
  );
}
