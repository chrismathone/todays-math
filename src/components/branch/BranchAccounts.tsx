"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { StudentEntity } from "@/contracts/class.contract";
import BulkStudentAccountButton from "@/components/class/BulkStudentAccountButton";
import s from "./BranchAccounts.module.css";

const StudentAccountPanel = dynamic(() =>
  import("@/components/class/StudentAccountPanel").then(
    (module) => module.StudentAccountPanel,
  ),
);

type Staff = {
  id: string;
  name: string;
  email: string;
  branchRole: "owner" | "manager" | "teacher";
};
type BranchClass = {
  id: string;
  name: string;
  grade: string;
  userId: string;
  user: { name: string };
  _count: { students: number };
};
const labels = { owner: "원장", manager: "관리자", teacher: "강사" } as const;

async function dataFrom<T>(response: Response): Promise<T> {
  const result = await response.json();
  if (!response.ok)
    throw new Error(result?.error?.message ?? "요청을 처리하지 못했습니다.");
  return result.data as T;
}

export default function BranchAccounts({
  canCreateManagers,
  section = "accounts",
}: {
  canCreateManagers: boolean;
  section?: "accounts" | "classes" | "students";
}) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [classes, setClasses] = useState<BranchClass[]>([]);
  const [students, setStudents] = useState<StudentEntity[]>([]);
  const [studentPage, setStudentPage] = useState(1);
  const [studentTotal, setStudentTotal] = useState(0);
  const studentRequest = useRef(0);
  const [sourceClassId, setSourceClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [targetClassId, setTargetClassId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [studentIssued, setStudentIssued] = useState<{
    name: string;
  } | null>(null);
  const [openStudentId, setOpenStudentId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Staff["branchRole"]>("teacher");
  const [issued, setIssued] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function reload() {
    try {
      const [people, groups] = await Promise.all([
        fetch("/api/branch/accounts", { cache: "no-store" }).then((r) =>
          dataFrom<Staff[]>(r),
        ),
        fetch("/api/branch/classes", { cache: "no-store" }).then((r) =>
          dataFrom<BranchClass[]>(r),
        ),
      ]);
      setStaff(people);
      setClasses(groups);
      await chooseSource(
        groups.some((group) => group.id === sourceClassId)
          ? sourceClassId
          : (groups[0]?.id ?? ""),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "지점 정보를 불러오지 못했습니다.",
      );
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      fetch("/api/branch/accounts", {
        cache: "no-store",
        signal: controller.signal,
      }).then((r) => dataFrom<Staff[]>(r)),
      fetch("/api/branch/classes", {
        cache: "no-store",
        signal: controller.signal,
      }).then((r) => dataFrom<BranchClass[]>(r)),
    ])
      .then(async ([people, groups]) => {
        if (controller.signal.aborted) return;
        setStaff(people);
        setClasses(groups);
        if (!groups[0]) return;
        const classId = groups[0].id;
        const requestId = ++studentRequest.current;
        const response = await fetch(
          `/api/branch/students?classId=${encodeURIComponent(classId)}&page=1&pageSize=100`,
          { cache: "no-store", signal: controller.signal },
        );
        const result = await response.json();
        if (!response.ok)
          throw new Error(
            result?.error?.message ?? "학생 목록을 불러오지 못했습니다.",
          );
        if (controller.signal.aborted || requestId !== studentRequest.current)
          return;
        setSourceClassId(classId);
        setStudents(result.data ?? []);
        setStudentPage(1);
        setStudentTotal(result.meta?.total ?? 0);
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "지점 정보를 불러오지 못했습니다.",
          );
      });
    return () => controller.abort();
  }, []);

  async function createStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !sourceClassId) return;
    setBusy(true);
    setError("");
    setNotice("");
    setStudentIssued(null);
    try {
      const issued = await dataFrom<{
        name: string;
      }>(
        await fetch("/api/branch/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            classId: sourceClassId,
            name: studentName,
            phone: studentPhone,
          }),
        }),
      );
      setStudentIssued(issued);
      setStudentName("");
      setStudentPhone("");
      await chooseSource(sourceClassId);
      setClasses((previous) =>
        previous.map((group) =>
          group.id === sourceClassId
            ? { ...group, _count: { students: group._count.students + 1 } }
            : group,
        ),
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "학생을 등록하지 못했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function createStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    setIssued(null);
    try {
      const result = await dataFrom<Staff & { initialPassword: string }>(
        await fetch("/api/branch/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, role }),
        }),
      );
      setIssued({ email: result.email, password: result.initialPassword });
      setName("");
      setEmail("");
      setRole("teacher");
      await reload();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "계정을 만들지 못했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function assign(classId: string, teacherId: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await dataFrom(
        await fetch(`/api/branch/classes/${encodeURIComponent(classId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teacherId }),
        }),
      );
      setNotice("담당 강사를 변경했습니다.");
      await reload();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "반 배정을 저장하지 못했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function chooseSource(classId: string, page = 1) {
    const requestId = ++studentRequest.current;
    setSourceClassId(classId);
    setStudentId("");
    setStudents([]);
    setStudentTotal(0);
    setStudentPage(page);
    setTargetClassId("");
    setOpenStudentId(null);
    if (!classId) return;
    try {
      const response = await fetch(
        `/api/branch/students?classId=${encodeURIComponent(classId)}&page=${page}&pageSize=100`,
        { cache: "no-store" },
      );
      const body = await response.json();
      if (!response.ok)
        throw new Error(
          body?.error?.message ?? "학생 목록을 불러오지 못했습니다.",
        );
      if (requestId !== studentRequest.current) return;
      setStudents(body.data ?? []);
      setStudentTotal(body.meta?.total ?? 0);
    } catch (cause) {
      if (requestId !== studentRequest.current) return;
      setError(
        cause instanceof Error
          ? cause.message
          : "학생 목록을 불러오지 못했습니다.",
      );
    }
  }

  async function moveStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!studentId || !targetClassId || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await dataFrom(
        await fetch(`/api/branch/students/${encodeURIComponent(studentId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ classId: targetClassId }),
        }),
      );
      setNotice("학생을 선택한 반에 배정했습니다.");
      await reload();
      await chooseSource(sourceClassId);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "학생 배정을 저장하지 못했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className={`${s.section} mb-8 rounded-xl border border-slate-200 bg-white p-5`}
      aria-label={section === "accounts" ? "지점 계정 관리" : "반 배정 관리"}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">
            {section === "accounts" ? "지점 계정 관리" : "반 배정 관리"}
          </h2>
          <p className="text-sm text-slate-600">
            {section === "accounts"
              ? "학생 로그인 계정과 직원 계정을 발급·관리하세요."
              : "담당 강사와 학생의 소속 반을 관리하세요."}
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          onClick={() => void reload()}
        >
          새로고침
        </button>
      </div>
      {error && (
        <p role="alert" className="mb-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mb-3 text-sm text-green-700">
          {notice}
        </p>
      )}
      {section === "accounts" ? (
        <>
          <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
            <h3 className="mb-1 font-bold">학생 등록</h3>
            <p className="mb-4 text-sm text-slate-600">
              학생을 명단에 등록한 뒤, 반별 학생 계정 전체 생성으로 로그인
              계정을 발급하세요.
            </p>
            {classes.length === 0 ? (
              <p className="text-sm">
                먼저{" "}
                <Link
                  href="/branch?tab=classes"
                  className="font-semibold text-blue-700 underline"
                >
                  반 관리에서 반을 만들어 주세요.
                </Link>
              </p>
            ) : (
              <form
                onSubmit={createStudent}
                className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(150px,1fr)_minmax(140px,1fr)_minmax(180px,1fr)_auto] lg:items-end"
              >
                <label className="grid gap-1 text-sm">
                  소속 반
                  <select
                    className="min-h-11 rounded-lg border border-slate-300 bg-white px-3"
                    value={sourceClassId}
                    onChange={(e) => void chooseSource(e.target.value)}
                    required
                  >
                    {classes.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name} · {group.grade}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  학생 이름
                  <input
                    className="min-h-11 rounded-lg border border-slate-300 bg-white px-3"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    required
                    maxLength={50}
                    autoComplete="off"
                    placeholder="이름"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  전화번호 (선택)
                  <input
                    className="min-h-11 rounded-lg border border-slate-300 bg-white px-3"
                    value={studentPhone}
                    onChange={(e) => setStudentPhone(e.target.value)}
                    type="tel"
                    maxLength={40}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="계정 초기 비밀번호에 사용할 연락처"
                  />
                </label>
                <button
                  type="submit"
                  disabled={busy || !sourceClassId}
                  className="min-h-11 rounded-lg bg-blue-700 px-4 font-semibold text-white disabled:opacity-50"
                >
                  학생 등록
                </button>
              </form>
            )}
            <p className="mt-2 text-xs text-slate-500">
              로그인 아이디는 학생 이름, 초기 비밀번호는 등록된 전화번호 끝
              4자리입니다.
            </p>
            {studentIssued && (
              <div
                role="status"
                className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm"
              >
                <strong>{studentIssued.name} 학생 등록 완료</strong>
                <p className="text-slate-600">
                  반별 학생 계정 전체 생성으로 로그인 계정을 발급하세요.
                </p>
              </div>
            )}
            {sourceClassId && (
              <div className="mt-4 border-t border-blue-100 pt-3">
                <h4 className="mb-2 text-sm font-semibold">
                  선택한 반 학생 {studentTotal}명
                </h4>
                <BulkStudentAccountButton
                  key={sourceClassId}
                  classId={sourceClassId}
                  className={
                    classes.find((group) => group.id === sourceClassId)?.name ??
                    "선택한 반"
                  }
                />
                {studentTotal > 100 && (
                  <div className="mb-3 flex items-center gap-2 text-sm">
                    <button
                      type="button"
                      disabled={studentPage === 1}
                      onClick={() =>
                        void chooseSource(sourceClassId, studentPage - 1)
                      }
                      className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
                    >
                      이전
                    </button>
                    <span>
                      {studentPage} / {Math.ceil(studentTotal / 100)} 페이지
                    </span>
                    <button
                      type="button"
                      disabled={studentPage * 100 >= studentTotal}
                      onClick={() =>
                        void chooseSource(sourceClassId, studentPage + 1)
                      }
                      className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
                    >
                      다음
                    </button>
                  </div>
                )}
                {students.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    아직 등록된 학생이 없습니다.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {students.map((student) => (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() =>
                          setOpenStudentId((current) =>
                            current === student.id ? null : student.id,
                          )
                        }
                        className={`rounded-lg border px-3 py-2 text-sm ${openStudentId === student.id ? "border-blue-600 bg-white text-blue-800" : "border-slate-300 bg-white"}`}
                      >
                        {student.name} · 계정 관리
                      </button>
                    ))}
                  </div>
                )}
                {students.find((student) => student.id === openStudentId) && (
                  <div className="mt-3">
                    <StudentAccountPanel
                      key={openStudentId}
                      student={students.find(
                        (student) => student.id === openStudentId,
                      )!}
                      onClose={() => setOpenStudentId(null)}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
          <h3 className="mb-2 font-semibold">직원 계정 발급</h3>
          <p className="mb-3 text-sm text-slate-600">
            원장은 원장·관리자·강사를, 관리자는 강사 계정을 발급합니다.
          </p>
          <form onSubmit={createStaff} className={`${s.fields} mb-5`}>
            <label className="grid gap-1 text-sm">
              이름
              <input
                className="min-h-11 rounded-lg border border-slate-300 px-3"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={50}
              />
            </label>
            <label className="grid gap-1 text-sm">
              이메일
              <input
                className="min-h-11 rounded-lg border border-slate-300 px-3"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={255}
              />
            </label>
            <label className="grid gap-1 text-sm">
              계정 유형
              <select
                className="min-h-11 rounded-lg border border-slate-300 px-3"
                value={role}
                onChange={(e) => setRole(e.target.value as Staff["branchRole"])}
              >
                <option value="teacher">강사</option>
                {canCreateManagers && (
                  <>
                    <option value="manager">관리자</option>
                    <option value="owner">원장</option>
                  </>
                )}
              </select>
            </label>
            <button
              type="submit"
              disabled={busy}
              className="min-h-11 rounded-lg bg-blue-700 px-4 font-semibold text-white disabled:opacity-50"
            >
              계정 만들기
            </button>
          </form>
          {issued && (
            <p
              role="status"
              className="mb-4 rounded-lg bg-amber-50 p-3 text-sm"
            >
              {issued.email} 임시 비밀번호:{" "}
              <strong className="select-all font-mono">
                {issued.password}
              </strong>
              <br />
              지금 한 번만 표시됩니다. 안전하게 전달하고 로그인 후 변경해
              주세요.
            </p>
          )}
          <div className={`${s.tableFrame} mb-5`}>
            <table
              className={`${s.table} ${s.staffTable}`}
              aria-label="지점 직원 목록"
            >
              <thead>
                <tr>
                  <th scope="col">이름</th>
                  <th scope="col">계정 유형</th>
                  <th scope="col">이메일</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((person) => (
                  <tr key={person.id}>
                    <td>
                      <span className={s.cellLabel} aria-hidden="true">
                        이름
                      </span>
                      <strong>{person.name}</strong>
                    </td>
                    <td>
                      <span className={s.cellLabel} aria-hidden="true">
                        계정 유형
                      </span>
                      {labels[person.branchRole]}
                    </td>
                    <td>
                      <span className={s.cellLabel} aria-hidden="true">
                        이메일
                      </span>
                      <span className="text-slate-500">{person.email}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : section === "classes" ? (
        <>
          <h3 className="mb-2 font-semibold">반 담당 강사 배정</h3>
          <div className={s.tableFrame}>
            <table
              className={`${s.table} ${s.classTable}`}
              aria-label="반 담당 강사 배정"
            >
              <thead>
                <tr>
                  <th scope="col">반 이름</th>
                  <th scope="col">학년</th>
                  <th scope="col">학생 수</th>
                  <th scope="col">담당 강사</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((group) => (
                  <tr key={group.id}>
                    <td>
                      <span className={s.cellLabel} aria-hidden="true">
                        반 이름
                      </span>
                      <strong>{group.name}</strong>
                    </td>
                    <td>
                      <span className={s.cellLabel} aria-hidden="true">
                        학년
                      </span>
                      {group.grade}
                    </td>
                    <td className={s.studentCount}>
                      <span className={s.cellLabel} aria-hidden="true">
                        학생 수
                      </span>
                      학생 {group._count.students}명
                    </td>
                    <td>
                      <span className={s.cellLabel} aria-hidden="true">
                        담당 강사
                      </span>
                      <select
                        className="min-h-11 rounded-lg border border-slate-300 px-3"
                        aria-label={`${group.name} 담당 강사`}
                        value={group.userId}
                        disabled={busy}
                        onChange={(e) => void assign(group.id, e.target.value)}
                      >
                        {staff.map((person) => (
                          <option key={person.id} value={person.id}>
                            {person.name} ({labels[person.branchRole]})
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <h3 className="mb-2 font-semibold">학생 반 배정</h3>
          <form onSubmit={moveStudent} className={s.fields}>
            <label className="grid gap-1 text-sm">
              현재 반
              <select
                className="min-h-11 rounded-lg border border-slate-300 px-3"
                value={sourceClassId}
                onChange={(e) => void chooseSource(e.target.value)}
                required
              >
                <option value="">반 선택</option>
                {classes.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              학생
              <select
                className="min-h-11 rounded-lg border border-slate-300 px-3"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
              >
                <option value="">학생 선택</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              옮길 반
              <select
                className="min-h-11 rounded-lg border border-slate-300 px-3"
                value={targetClassId}
                onChange={(e) => setTargetClassId(e.target.value)}
                required
              >
                <option value="">반 선택</option>
                {classes
                  .filter((group) => group.id !== sourceClassId)
                  .map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={busy || !studentId || !targetClassId}
              className="min-h-11 rounded-lg bg-blue-700 px-4 font-semibold text-white disabled:opacity-50"
            >
              학생 배정
            </button>
          </form>
        </>
      )}
    </section>
  );
}
