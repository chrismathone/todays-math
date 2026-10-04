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

/** Preview never creates credentials. Only the explicit create button posts the selected ids. */
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
  const [preview, setPreview] = useState<BulkStudentAccountSummary | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<BulkStudentAccountSummary | null>(null);

  async function readSummary(method: "GET" | "POST", studentIds?: string[]) {
    const response = await fetch(
      `/api/classes/${encodeURIComponent(classId)}/student-accounts`,
      method === "POST"
        ? {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ studentIds }),
          }
        : { method },
    );
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const message = (body as { error?: { message?: unknown } } | null)?.error
        ?.message;
      throw new Error(
        typeof message === "string"
          ? message
          : method === "GET"
            ? "발급 대상을 확인하지 못했습니다. 계정을 만들지 않았습니다."
            : "계정을 생성하지 못했습니다. 선택한 대상은 그대로입니다.",
      );
    }
    const { bulkStudentAccountResponseSchema } =
      await import("@/contracts/bulkStudentAccount.contract");
    return bulkStudentAccountResponseSchema.parse(body).data;
  }

  async function confirmTargets() {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setError("");
    try {
      const data = await readSummary("GET");
      setPreview(data);
      setSelected(
        data.students
          .filter((student) => student.status === "ready")
          .map((student) => student.studentId),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "발급 대상을 확인하지 못했습니다. 계정을 만들지 않았습니다.",
      );
    } finally {
      lock.current = false;
      setPending(false);
    }
  }

  async function createSelected() {
    if (lock.current || !preview) return;
    lock.current = true;
    setPending(true);
    setError("");
    const requested = [...selected];
    try {
      const data = await readSummary("POST", requested);
      setResult(data);
      setPreview(null);
      if (requested.length === 0)
        setError("선택한 학생이 없습니다. 계정을 만들지 않았습니다.");
      if (data.issued > 0) onIssued?.();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "계정 생성 결과를 확인하지 못했습니다. 다시 시도하면 기존 계정은 유지됩니다.",
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
        onClick={() => void confirmTargets()}
        disabled={pending}
        aria-label={`${className} 발급 대상 확인`}
        aria-busy={pending}
      >
        {pending ? "발급 대상 확인 중…" : "발급 대상 확인"}
      </Button>
      <p className="text-text-2">
        아이디는 학생 이름입니다. 초기 비밀번호와 연락처는 이 화면과 기록에
        표시하지 않습니다.
      </p>
      {error ? (
        <p role="alert" className="text-g-red-text">
          {error}
        </p>
      ) : null}
      {preview ? (
        <dialog open aria-labelledby="student-issue-preview-title">
          <h3 id="student-issue-preview-title" className="font-semibold text-ink">
            {preview.className} 발급 대상
          </h3>
          <p className="text-text-2">
            생성 가능 {preview.ready}명 · 기존 {preview.existing}명 · 확인 필요{" "}
            {preview.skipped}명. 확인 뒤에 추가된 학생은 이번 생성에 포함되지
            않습니다.
          </p>
          {preview.students.length ? (
            <ul className="space-y-2" aria-label={`${preview.className} 발급 대상`}>
              {preview.students.map((student) => (
                <li key={student.studentId} className="break-words text-text-2">
                  <label>
                    <input
                      type="checkbox"
                      checked={selected.includes(student.studentId)}
                      disabled={student.status !== "ready" || pending}
                      onChange={(event) =>
                        setSelected((current) =>
                          event.target.checked
                            ? [...current, student.studentId]
                            : current.filter((id) => id !== student.studentId),
                        )
                      }
                    />{" "}
                    <strong className="text-ink">{student.name}</strong>
                    {student.loginId && student.status !== "ready"
                      ? ` · 아이디 ${student.loginId}`
                      : ""}{" "}
                    · {LABELS[student.status]}
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-text-2">현재 수강 중인 학생이 없습니다.</p>
          )}
          <div className="mt-3 flex gap-2">
            <Button
              variant="secondary"
              onClick={() => void createSelected()}
              disabled={pending}
            >
              선택한 학생 계정 생성
            </Button>
            <Button
              variant="secondary"
              onClick={() => setPreview(null)}
              disabled={pending}
            >
              취소
            </Button>
          </div>
        </dialog>
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
              <summary className="min-h-8 text-ink">학생별 생성 결과</summary>
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
                    {student.loginId ? ` · 아이디 ${student.loginId}` : ""} ·{" "}
                    {LABELS[student.status]}
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
