"use client";

import { useEffect, useState } from "react";
import {
  adminRelationsResponseSchema,
  type AdminRelationsResponse,
  type ConnectedClass,
  type ConnectedStudent,
} from "@/contracts/adminRelations.contract";
import { accountRequest, requestMessage } from "./accountRequests";
import s from "./admin.module.css";
import d from "./detail.module.css";
import r from "./relations.module.css";
import BulkStudentAccountButton, {
  type StudentAccountIssuanceSummary,
} from "@/components/class/BulkStudentAccountButton";

const SYNC_LABEL = {
  local: "직접 등록",
  legacy: "에이와 연동",
  active: "관리 동기화 · 정상",
  paused: "관리 동기화 · 중지",
  unverified: "관리 동기화 · 확인 필요",
};
const MEMBERSHIP_LABEL = {
  homeroom: "담임",
  slot: "수업 담당",
  delegate: "열람 위임",
};
const LOGIN_LABEL = {
  unissued: "미발급",
  disabled: "사용 중지",
  locked: "일시 잠김",
  enabled: "사용 설정",
};
const STUDENT_FILTER_DEFAULTS = {
  q: "",
  classId: "",
  grade: "all",
  enrollment: "all",
  login: "all",
  sync: "all",
  sort: "class",
  direction: "asc",
};

function useRelations(
  userId: string,
  branchId: string,
  kind: "classes" | "students",
  filters: Record<string, string>,
) {
  const filterKey = new URLSearchParams(filters).toString();
  const [pagination, setPagination] = useState({ filterKey, page: 1 });
  const page = pagination.filterKey === filterKey ? pagination.page : 1;
  const [retry, setRetry] = useState(0);
  const [filterOptions, setFilterOptions] =
    useState<
      Extract<AdminRelationsResponse, { kind: "students" }>["filters"]
    >();
  const url = `/api/admin/users/${encodeURIComponent(userId)}/relations?branchId=${encodeURIComponent(branchId)}&kind=${kind}&page=${page}&pageSize=20&${filterKey}`;
  const key = `${url}:${retry}`;
  const [state, setState] = useState<{
    key: string;
    url: string;
    data?: AdminRelationsResponse;
    error?: string;
  }>({ key, url });
  useEffect(() => {
    const controller = new AbortController();
    accountRequest<unknown>(url, { signal: controller.signal })
      .then((body) => {
        if (controller.signal.aborted) return;
        const result = adminRelationsResponseSchema.safeParse(body);
        if (!result.success || result.data.kind !== kind) {
          setState((current) => ({
            key,
            url,
            data:
              kind === "classes" && current.url === url
                ? current.data
                : undefined,
            error: "조회 결과를 확인하지 못했습니다. 다시 불러와 주세요.",
          }));
          return;
        }
        setState({ key, url, data: result.data });
        if (result.data.kind === "students")
          setFilterOptions(result.data.filters);
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState((current) => ({
            key,
            url,
            data:
              kind === "classes" && current.url === url
                ? current.data
                : undefined,
            error: requestMessage(error),
          }));
      });
    return () => controller.abort();
  }, [key, url, kind]);
  return {
    // A summary refresh must retain row components and their open native dialogs.
    data:
      state.key === key || (kind === "classes" && state.url === url)
        ? state.data
        : undefined,
    error: state.key === key ? state.error : undefined,
    refreshing: state.key !== key,
    filters: filterOptions,
    onPage: (page: number) => setPagination({ filterKey, page }),
    reload: () => setRetry((value) => value + 1),
  };
}

function ClassRows({
  items,
  onIssued,
}: {
  items: (ConnectedClass & {
    issuanceSummary?: StudentAccountIssuanceSummary;
  })[];
  onIssued: () => void;
}) {
  return (
    <div
      className={r.tableScroll}
      tabIndex={0}
      role="region"
      aria-label="연결된 반 표"
    >
      <table className={r.table}>
        <thead>
          <tr>
            <th scope="col">반</th>
            <th scope="col">학년</th>
            <th scope="col">계정과의 관계</th>
            <th scope="col">운영 상태</th>
            <th scope="col">학생 계정</th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.id}>
              <th scope="row">
                <strong>{c.name}</strong>
                <span className={r.hint}>{SYNC_LABEL[c.sync]}</span>
              </th>
              <td>{c.grade || "미등록"}</td>
              <td>
                {[
                  ...(c.owner ? ["소유 계정"] : []),
                  ...c.memberships.map((role) => MEMBERSHIP_LABEL[role]),
                ].join(" · ")}
              </td>
              <td>{c.active ? "운영 중" : "종료"}</td>
              <td>
                {c.active ? (
                  <BulkStudentAccountButton
                    classId={c.id}
                    className={c.name}
                    issuanceSummary={c.issuanceSummary}
                    onIssued={onIssued}
                  />
                ) : (
                  "발급 대상 제외"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StudentRows({ items }: { items: ConnectedStudent[] }) {
  return (
    <div
      className={r.tableScroll}
      tabIndex={0}
      role="region"
      aria-label="연결된 학생 표"
    >
      <table className={r.table}>
        <thead>
          <tr>
            <th scope="col">학생</th>
            <th scope="col">학년</th>
            <th scope="col">연결된 반 · 수강 상태</th>
            <th scope="col">로그인 설정</th>
          </tr>
        </thead>
        <tbody>
          {items.map((student) => (
            <tr key={student.id}>
              <th scope="row">
                <strong>{student.name}</strong>
                <span className={r.hint}>{SYNC_LABEL[student.sync]}</span>
              </th>
              <td>{student.grade || "미등록"}</td>
              <td>
                <ul className={r.enrollments}>
                  {student.classes.map((c) => (
                    <li key={c.id}>
                      <span>{c.name}</span>
                      <span className={r.hint}>
                        {c.membership === "on-hold" ? "휴원" : "재원"}
                      </span>
                    </li>
                  ))}
                </ul>
              </td>
              <td>{LOGIN_LABEL[student.login]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RelationPanel({
  userId,
  branchId,
  kind,
}: {
  userId: string;
  branchId: string;
  kind: "classes" | "students";
}) {
  const defaults = STUDENT_FILTER_DEFAULTS;
  const [filters, setFilters] = useState(defaults);
  const [search, setSearch] = useState("");
  const appliedFilters =
    kind === "students"
      ? Object.fromEntries(
          Object.entries(filters).filter(([, value]) => value !== ""),
        )
      : {};
  const resource = useRelations(userId, branchId, kind, appliedFilters);
  const changeFilter = (key: keyof typeof defaults, value: string) =>
    setFilters((current) => ({ ...current, [key]: value }));
  const heading = kind === "classes" ? "연결된 반" : "연결된 학생";
  const { data, error } = resource;
  const totalPages = data
    ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize))
    : 1;
  return (
    <section
      className={r.panel}
      aria-label={heading}
      aria-busy={resource.refreshing || (!data && !error)}
    >
      <div className={d.panelHeading}>
        <h2>{heading}</h2>
        <button
          type="button"
          className={s.quiet}
          onClick={resource.reload}
          disabled={resource.refreshing || (!data && !error)}
        >
          새로고침
        </button>
      </div>
      {kind === "students" ? (
        <div className={r.filters}>
          <form
            className={r.search}
            onSubmit={(event) => {
              event.preventDefault();
              changeFilter("q", search.trim());
            }}
          >
            <label htmlFor={`student-search-${userId}`}>학생·반 검색</label>
            <div>
              <input
                id={`student-search-${userId}`}
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="학생 이름 또는 반 이름"
                maxLength={100}
              />
              <button type="submit" className={s.secondary}>
                검색
              </button>
            </div>
          </form>
          <label>
            반
            <select
              value={filters.classId}
              onChange={(event) => changeFilter("classId", event.target.value)}
            >
              <option value="">전체 반</option>
              {resource.filters?.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            학년
            <select
              value={filters.grade}
              onChange={(event) => changeFilter("grade", event.target.value)}
            >
              <option value="all">전체 학년</option>
              {resource.filters?.grades.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
              <option value="unregistered">미등록</option>
            </select>
          </label>
          <label>
            수강 상태
            <select
              value={filters.enrollment}
              onChange={(event) =>
                changeFilter("enrollment", event.target.value)
              }
            >
              <option value="all">전체 수강 상태</option>
              <option value="enrolled">재원</option>
              <option value="on-hold">휴원</option>
            </select>
          </label>
          <label>
            로그인 상태
            <select
              value={filters.login}
              onChange={(event) => changeFilter("login", event.target.value)}
            >
              <option value="all">전체 로그인 상태</option>
              {Object.entries(LOGIN_LABEL).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            동기화 상태
            <select
              value={filters.sync}
              onChange={(event) => changeFilter("sync", event.target.value)}
            >
              <option value="all">전체 동기화 상태</option>
              {Object.entries(SYNC_LABEL).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            정렬
            <select
              value={filters.sort}
              onChange={(event) => changeFilter("sort", event.target.value)}
            >
              <option value="class">반별 정렬</option>
              <option value="name">학생 이름순</option>
              <option value="grade">학년순</option>
              <option value="login">로그인 상태순</option>
            </select>
          </label>
          <label>
            정렬 방향
            <select
              value={filters.direction}
              onChange={(event) =>
                changeFilter("direction", event.target.value)
              }
            >
              <option value="asc">오름차순</option>
              <option value="desc">내림차순</option>
            </select>
          </label>
          <button
            type="button"
            className={s.quiet}
            onClick={() => {
              setSearch("");
              setFilters(defaults);
            }}
          >
            필터 초기화
          </button>
        </div>
      ) : (
        <p className={r.panelNote}>
          현재 운영 중인 반만 표시합니다. 전체 생성은 미발급 재원 학생에게만
          적용됩니다.
        </p>
      )}
      {error ? (
        <div role="alert" className={s.empty}>
          <strong>{heading}을 불러오지 못했습니다.</strong>
          <p>{error}</p>
          <button
            type="button"
            className={s.secondary}
            onClick={resource.reload}
          >
            다시 시도
          </button>
        </div>
      ) : null}
      {!data && !error ? (
        <div role="status" className={s.empty}>
          {heading}을 불러오는 중입니다.
        </div>
      ) : !data ? null : !data.data.length ? (
        <div role="status" className={s.empty}>
          <strong>
            {kind === "students" &&
            Object.entries(filters).some(
              ([key, value]) =>
                value !== defaults[key as keyof typeof defaults],
            )
              ? "조건에 맞는 학생이 없습니다."
              : `${heading}이 없습니다.`}
          </strong>
          <p>
            {kind === "classes"
              ? "현재 지점에서 소유하거나 담당하는 운영 중인 반이 표시됩니다."
              : "연결된 운영 중인 반의 재원·휴원 학생이 표시됩니다."}
          </p>
        </div>
      ) : data.kind === "classes" ? (
        <ClassRows items={data.data} onIssued={resource.reload} />
      ) : (
        <StudentRows items={data.data} />
      )}
      {data ? (
        <nav className={s.pagination} aria-label={`${heading} 페이지`}>
          <span>
            총 {data.meta.total.toLocaleString("ko-KR")}
            {kind === "classes" ? "개" : "명"}
          </span>
          <div>
            <button
              type="button"
              className={s.secondary}
              disabled={data.meta.page <= 1}
              onClick={() => resource.onPage(data.meta.page - 1)}
            >
              이전
            </button>
            <span aria-live="polite">
              {data.meta.page} / {totalPages}
            </span>
            <button
              type="button"
              className={s.secondary}
              disabled={data.meta.page >= totalPages}
              onClick={() => resource.onPage(data.meta.page + 1)}
            >
              다음
            </button>
          </div>
        </nav>
      ) : null}
    </section>
  );
}

export default function AdminAccountRelations({
  userId,
  branchId,
  kind,
}: {
  userId: string;
  branchId: string;
  kind: "classes" | "students";
}) {
  return (
    <div className={r.relations}>
      <RelationPanel
        key={`${kind}:${userId}:${branchId}`}
        userId={userId}
        branchId={branchId}
        kind={kind}
      />
      {kind === "students" ? (
        <p className={r.description}>
          로그인 설정의 ‘사용 설정’은 학생 계정이 켜져 있다는 뜻입니다. 실제
          접속에는 연동 상태와 수강 조건도 적용됩니다. 동기화 상태는 최근 확인된
          정보를 기준으로 표시합니다.
        </p>
      ) : null}
    </div>
  );
}
