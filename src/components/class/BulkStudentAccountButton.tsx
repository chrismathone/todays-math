"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import type {
  BulkStudentAccountSummary,
  BulkStudentAccountStatus,
} from "@/contracts/bulkStudentAccount.contract";

const LABELS: Record<BulkStudentAccountStatus, string> = {
  ready: "생성 가능",
  issued: "생성 완료",
  existing: "기존 계정 유지",
  missing_phone: "연동된 연락처 없음 · 원본 학생 연락처 등록 후 동기화",
  duplicate_name: "동명이인 또는 사용 중인 아이디 · 개별 발급 필요",
  invalid_name: "이름 확인 필요 · 개별 발급 필요",
};

/** Rendering and preview never create credentials. Only the explicit POST button does. */
export function BulkStudentAccountButton({
  classId,
  className,
  onIssued,
}: {
  classId: string;
  className: string;
  onIssued?: () => void;
}) {
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<BulkStudentAccountSummary | null>(null);
  async function issue() {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setError("");
    try {
      const response = await fetch(
        `/api/classes/${encodeURIComponent(classId)}/student-accounts`,
        { method: "POST" },
      );
      const body: unknown = await response.json();
      if (!response.ok) {
        const message = (body as { error?: { message?: unknown } })?.error
          ?.message;
        setError(
          typeof message === "string"
            ? message
            : "계정을 생성하지 못했습니다. 다시 시도해 주세요.",
        );
        return;
      }
      const { bulkStudentAccountResponseSchema } =
        await import("@/contracts/bulkStudentAccount.contract");
      const data = bulkStudentAccountResponseSchema.parse(body).data;
      setResult(data);
      onIssued?.();
    } catch {
      setError(
        "계정 생성 결과를 확인하지 못했습니다. 다시 시도하면 기존 계정은 유지됩니다.",
      );
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  return (
    <div className="flex flex-col items-start gap-2 text-[12.5px]">
      <Button
        variant="secondary"
        onClick={() => void issue()}
        disabled={pending}
        aria-label={`${className} 학생 계정 전체 생성`}
        aria-busy={pending}
      >
        {pending ? "학생 계정 생성 중…" : "학생 계정 전체 생성"}
      </Button>
      <p className="text-text-2">
        아이디: 학생 이름 · 초기 비밀번호: 등록된 전화번호 끝 4자리
      </p>
      {error ? (
        <p role="alert" className="text-g-red-text">
          {error}
        </p>
      ) : null}
      {result ? (
        <div className="w-full space-y-2">
          <p role="status" className="font-semibold text-ink">
            {result.className} · 생성 {result.issued}명 · 기존 {result.existing}
            명 · 확인 필요 {result.skipped}명
          </p>
          {result.total === 0 ? (
            <p className="text-text-2">현재 수강 중인 학생이 없습니다.</p>
          ) : null}
          {result.students.length ? (
            <details className="rounded-lg border border-divider p-2">
              <summary className="min-h-8 cursor-pointer text-ink">
                학생별 생성 결과
              </summary>
              <ul
                className="mt-2 space-y-2"
                aria-label={`${result.className} 학생 계정 생성 결과`}
              >
                {result.students.map((student) => (
                  <li
                    key={student.studentId}
                    className="break-words text-text-2"
                  >
                    <strong className="text-ink">{student.name}</strong>
                    {student.loginId
                      ? ` · 아이디 ${student.loginId}`
                      : ""} · {LABELS[student.status]}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default BulkStudentAccountButton;
