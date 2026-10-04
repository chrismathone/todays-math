"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  adminBranchLearningResponseSchema,
  type AdminBranchLearningResponse,
} from "@/contracts/adminBranchLearning.contract";
import { StudentAccountPanel } from "@/components/class/StudentAccountPanel";
import BulkStudentAccountButton from "@/components/class/BulkStudentAccountButton";
import { useScreenQuery } from "@/hooks/useScreenQuery";
import { accountRequest, requestMessage } from "./accountRequests";
import s from "./admin.module.css";
import r from "./relations.module.css";
import l from "./learning.module.css";

type StudentRow = Extract<
  AdminBranchLearningResponse,
  { kind: "students" }
>["data"][number];
const loginLabels: Record<string, string> = {
  unissued: "미발급",
  enabled: "사용 가능",
  disabled: "사용 중지",
  locked: "일시 잠김",
};
function learningHref(
  branchId: string,
  classId?: string | null,
  studentId?: string,
) {
  const query = new URLSearchParams({ branchId });
  if (classId) query.set("classId", classId);
  if (studentId) query.set("studentId", studentId);
  return `/admin/math-srs?${query}`;
}
export default function AdminBranchLearning({
  branchId,
  kind,
}: {
  branchId: string;
  kind: "students" | "classes";
}) {
  const screenQuery = useScreenQuery();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({
    q: "",
    classId: screenQuery.get("classId") ?? "",
    login: "all",
  });
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<StudentRow | null>(null);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const params = new URLSearchParams({
    kind,
    page: String(page),
    pageSize: "20",
    q: filters.q,
    login: filters.login,
  });
  if (filters.classId) params.set("classId", filters.classId);
  const url = `/api/admin/branches/${encodeURIComponent(branchId)}/learning?${params}`;
  const requestKey = `${url}:${revision}`;
  const [state, setState] = useState<{
    url: string;
    data?: AdminBranchLearningResponse;
    error?: string;
    requestKey: string;
  }>({ url, requestKey: "" });
  const loading = state.requestKey !== requestKey;
  const refresh = () => setRevision((current) => current + 1);
  useEffect(() => {
    const controller = new AbortController();
    accountRequest<unknown>(url, { signal: controller.signal })
      .then((body) => {
        if (controller.signal.aborted) return;
        const parsed = adminBranchLearningResponseSchema.safeParse(body);
        if (!parsed.success || parsed.data.kind !== kind)
          throw new Error("목록을 확인하지 못했습니다. 다시 불러와 주세요.");
        setState({ url, data: parsed.data, requestKey });
        setClasses(parsed.data.filters.classes);
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState((current) => ({
            url,
            data: current.url === url ? current.data : undefined,
            error: requestMessage(error),
            requestKey,
          }));
      });
    return () => controller.abort();
  }, [url, kind, requestKey]);
  // Retain rows during refresh: the issuance result dialog must remain mounted.
  const data = state.url === url ? state.data : undefined;
  const error = state.requestKey === requestKey ? state.error : undefined;
  const changeFilter = (patch: Partial<typeof filters>) => {
    setPage(1);
    setSelected(null);
    setFilters((current) => ({ ...current, ...patch }));
  };
  const chooseClass = (student: StudentRow) =>
    student.classes.find((c) => c.id === filters.classId)?.id ??
    student.classes[0]?.id ??
    student.classId;
  return (
    <div className={selected ? s.workspace : undefined}>
      <section
        className={s.directory}
        aria-label={kind === "students" ? "학생 계정 목록" : "지점 반 목록"}
      >
        <div className={s.directoryHeading}>
          <h2>{kind === "students" ? "학생 계정" : "반 관리"}</h2>
          <button
            type="button"
            className={s.secondary}
            onClick={refresh}
            disabled={loading}
          >
            새로고침
          </button>
        </div>
        <p className={r.panelNote}>
          {kind === "students"
            ? "발급된 로그인 계정과 미발급 학생을 함께 확인합니다. 학생을 선택해 계정과 학습 설정을 관리하세요."
            : "반별 학생 명단, 로그인 계정 발급 현황과 학습 설정을 확인합니다."}
        </p>
        <form
          className={r.filters}
          onSubmit={(event) => {
            event.preventDefault();
            changeFilter({ q: query.trim() });
          }}
        >
          <label className={r.search}>
            {kind === "students" ? "학생 이름·아이디 검색" : "반 이름 검색"}
            <div>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                maxLength={100}
              />
              <button type="submit" className={s.secondary}>
                검색
              </button>
            </div>
          </label>
          {kind === "students" ? (
            <>
              <label>
                반
                <select
                  value={filters.classId}
                  onChange={(event) =>
                    changeFilter({ classId: event.target.value })
                  }
                >
                  <option value="">전체 반</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                발급·사용 상태
                <select
                  value={filters.login}
                  onChange={(event) =>
                    changeFilter({ login: event.target.value })
                  }
                >
                  <option value="all">전체 상태</option>
                  <option value="issued">발급 완료</option>
                  <option value="unissued">미발급</option>
                  <option value="enabled">사용 가능</option>
                  <option value="disabled">사용 중지</option>
                  <option value="locked">일시 잠김</option>
                </select>
              </label>
            </>
          ) : null}
        </form>
        {error ? (
          <div role="alert" className={s.error}>
            <p>{error}</p>
            <button type="button" className={s.secondary} onClick={refresh}>
              다시 시도
            </button>
          </div>
        ) : null}
        {!data && !error ? (
          <p role="status" className={s.empty}>
            목록을 불러오는 중입니다.
          </p>
        ) : null}
        {data ? (
          <>
            {data.data.length === 0 ? (
              <p className={s.empty}>
                {filters.q || filters.classId || filters.login !== "all"
                  ? "조건에 맞는 항목이 없습니다."
                  : kind === "students"
                    ? "이 지점에 등록된 학생이 없습니다."
                    : "이 지점에 등록된 반이 없습니다."}
              </p>
            ) : (
              <div
                className={r.tableScroll}
                tabIndex={0}
                role="region"
                aria-label={kind === "students" ? "학생 계정 표" : "반 관리 표"}
              >
                {data.kind === "students" ? (
                  <table className={r.table}>
                    <thead>
                      <tr>
                        <th scope="col">학생</th>
                        <th scope="col">반</th>
                        <th scope="col">로그인 계정</th>
                        <th scope="col">관리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.data.map((student) => (
                        <tr key={student.id}>
                          <th scope="row">
                            <strong>{student.name}</strong>
                            <span className={r.hint}>
                              {student.grade || "학년 미등록"}
                              {student.withdrawn ? " · 퇴원" : ""}
                            </span>
                          </th>
                          <td>
                            {student.classes.length
                              ? student.classes.map((c) => (
                                  <span key={c.id} className={l.className}>
                                    {c.name}
                                    {c.membership === "on-hold"
                                      ? " · 휴원"
                                      : ""}
                                  </span>
                                ))
                              : "현재 수강 반 없음"}
                          </td>
                          <td>
                            <strong>
                              {student.account?.loginId ?? "미발급"}
                            </strong>
                            <span className={r.hint}>
                              {student.withdrawn
                                ? "퇴원 · 로그인 차단"
                                : loginLabels[student.login]}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className={s.secondary}
                              onClick={() => setSelected(student)}
                              aria-label={`${student.name} 학생 계정 관리`}
                              aria-pressed={selected?.id === student.id}
                            >
                              계정 관리
                            </button>
                            <Link
                              className={l.actionLink}
                              href={learningHref(
                                branchId,
                                chooseClass(student),
                                student.id,
                              )}
                            >
                              학습 설정
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className={r.table}>
                    <thead>
                      <tr>
                        <th scope="col">반</th>
                        <th scope="col">담당</th>
                        <th scope="col">학생 계정</th>
                        <th scope="col">관리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.data.map((c) => (
                        <tr key={c.id}>
                          <th scope="row">
                            <strong>{c.name}</strong>
                            <span className={r.hint}>
                              {c.grade} · {c.active ? "운영 중" : "종료"}
                            </span>
                          </th>
                          <td>{c.teachers.join(", ") || "담당 미등록"}</td>
                          <td>
                            {c.active ? (
                              <BulkStudentAccountButton
                                classId={c.id}
                                className={c.name}
                                issuanceSummary={c.issuanceSummary}
                                onIssued={refresh}
                              />
                            ) : (
                              <span>
                                발급 {c.issuanceSummary.issued}명 · 종료된 반
                              </span>
                            )}
                          </td>
                          <td>
                            <Link
                              className={l.actionLink}
                              href={`/admin/branches/${encodeURIComponent(branchId)}?tab=students&classId=${encodeURIComponent(c.id)}`}
                            >
                              학생 계정 보기
                            </Link>
                            <Link
                              className={l.actionLink}
                              href={`/classes/manage?classId=${encodeURIComponent(c.id)}`}
                            >
                              반·학생 관리
                            </Link>
                            <Link
                              className={l.actionLink}
                              href={learningHref(branchId, c.id)}
                            >
                              학습 설정
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
            <div className={s.pagination}>
              <span>총 {data.meta.total}개</span>
              <div>
                <button
                  type="button"
                  className={s.secondary}
                  disabled={data.meta.page <= 1 || loading}
                  onClick={() => {
                    setSelected(null);
                    setPage(data.meta.page - 1);
                  }}
                >
                  이전
                </button>
                <span>
                  {data.meta.page} /{" "}
                  {Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize))}
                </span>
                <button
                  type="button"
                  className={s.secondary}
                  disabled={
                    data.meta.page * data.meta.pageSize >= data.meta.total ||
                    loading
                  }
                  onClick={() => {
                    setSelected(null);
                    setPage(data.meta.page + 1);
                  }}
                >
                  다음
                </button>
              </div>
            </div>
          </>
        ) : null}
      </section>
      {selected ? (
        <aside className={l.review} aria-label={`${selected.name} 학생 관리`}>
          <h3>{selected.name}</h3>
          <Link
            className={l.actionLink}
            href={learningHref(branchId, chooseClass(selected), selected.id)}
          >
            학생 학습 설정·진도 확인
          </Link>
          <StudentAccountPanel
            key={selected.id}
            student={selected}
            title="학생 로그인 계정"
            onClose={() => setSelected(null)}
            onChanged={refresh}
          />
        </aside>
      ) : null}
    </div>
  );
}
