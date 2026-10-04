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

function useRelations(
  userId: string,
  branchId: string,
  kind: "classes" | "students",
) {
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const url = `/api/admin/users/${encodeURIComponent(userId)}/relations?branchId=${encodeURIComponent(branchId)}&kind=${kind}&page=${page}&pageSize=20`;
  const key = `${url}:${retry}`;
  const [state, setState] = useState<{
    key: string;
    data?: AdminRelationsResponse;
    error?: string;
  }>({ key });
  useEffect(() => {
    const controller = new AbortController();
    accountRequest<unknown>(url, { signal: controller.signal })
      .then((body) => {
        if (controller.signal.aborted) return;
        const result = adminRelationsResponseSchema.safeParse(body);
        if (!result.success || result.data.kind !== kind) {
          setState({
            key,
            error: "조회 결과를 확인하지 못했습니다. 다시 불러와 주세요.",
          });
          return;
        }
        setState({ key, data: result.data });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({ key, error: requestMessage(error) });
      });
    return () => controller.abort();
  }, [key, url, kind]);
  return {
    data: state.key === key ? state.data : undefined,
    error: state.key === key ? state.error : undefined,
    onPage: setPage,
    reload: () => setRetry((value) => value + 1),
  };
}

function ClassRows({ items }: { items: ConnectedClass[] }) {
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
  const resource = useRelations(userId, branchId, kind);
  const heading = kind === "classes" ? "연결된 반" : "연결된 학생";
  const { data, error } = resource;
  const totalPages = data
    ? Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize))
    : 1;
  return (
    <section
      className={r.panel}
      aria-label={heading}
      aria-busy={!data && !error}
    >
      <div className={d.panelHeading}>
        <h2>{heading}</h2>
        <button
          type="button"
          className={s.quiet}
          onClick={resource.reload}
          disabled={!data && !error}
        >
          새로고침
        </button>
      </div>
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
      ) : !data ? (
        <div role="status" className={s.empty}>
          {heading}을 불러오는 중입니다.
        </div>
      ) : !data.data.length ? (
        <div role="status" className={s.empty}>
          <strong>{heading}이 없습니다.</strong>
          <p>
            {kind === "classes"
              ? "현재 지점에서 소유하거나 담당하는 반이 표시됩니다."
              : "연결된 운영 중인 반의 재원·휴원 학생이 표시됩니다."}
          </p>
        </div>
      ) : data.kind === "classes" ? (
        <ClassRows items={data.data} />
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
}: {
  userId: string;
  branchId: string;
}) {
  return (
    <div className={r.relations}>
      <p className={r.description}>
        소유하거나 현재 담당하는 반과 재원·휴원 학생을 읽기 전용으로 확인합니다.
        소유 관계는 현재 업무 접근 권한과 다를 수 있습니다.
      </p>
      <RelationPanel
        key={`classes:${userId}:${branchId}`}
        userId={userId}
        branchId={branchId}
        kind="classes"
      />
      <RelationPanel
        key={`students:${userId}:${branchId}`}
        userId={userId}
        branchId={branchId}
        kind="students"
      />
      <p className={r.description}>
        로그인 설정의 ‘사용 설정’은 학생 계정이 켜져 있다는 뜻입니다. 실제
        접속에는 연동 상태와 수강 조건도 적용됩니다. 동기화 상태는 최근 확인된
        정보를 기준으로 표시합니다.
      </p>
    </div>
  );
}
