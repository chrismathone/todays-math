"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { managedStatus } from "@/lib/eywa/managedAdministration";
import styles from "./eywaManagement.module.css";

type Status = Awaited<ReturnType<typeof managedStatus>>;
const labels: Record<string, string> = {
  candidate: "본인 확인 대기",
  conflict: "검토 필요",
  confirmed: "연결 확정",
  ended: "연결 종료",
  tenant_disabled: "에이와 연동 OFF",
  source_removed: "원본 직원 없음",
  source_unhealthy: "원본 상태 확인 필요",
  staff_inactive: "재직 대상 아님",
  binding_retired: "연결 종료",
  binding_inactive: "연결 비활성",
  protected_account: "관리 권한 분리 필요",
  name_mismatch: "이름 불일치",
  email_mismatch: "이메일 불일치",
  local_account_blocked: "기존 계정 상태 확인 필요",
  managed_elsewhere: "다른 지점 관리 연결 확인 필요",
};
export function EywaManagement({
  initial,
  operator,
  platform,
}: {
  initial: Status;
  operator: boolean;
  platform: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function mutate(body: unknown) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        operator ? "/api/admin/eywa-sync" : "/api/account/eywa-managed",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          labels[result.error?.code] ??
            "변경할 수 없습니다. 최신 계정 상태와 확인 근거를 다시 확인해 주세요.",
        );
      setMessage(
        operator
          ? "처리되었습니다. 다음 동기화에서 최신 상태를 반영합니다."
          : "연결되었습니다. 에이와 바로가기로 다시 로그인해 주세요.",
      );
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "요청을 처리하지 못했습니다.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={styles.panel}>
      <p role="status" aria-live="polite">
        {message}
      </p>
      {platform ? (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            await mutate({
              action: "register",
              bindingId: data.get("bindingId"),
              ...(data.get("archiveOwnerUserId")
                ? { archiveOwnerUserId: data.get("archiveOwnerUserId") }
                : {}),
            });
          }}
        >
          <h2>새 연결 등록</h2>
          {initial.automaticProvisioningEnabled ? (
            <p>
              에이와에서 오늘의수학을 켜면 지점과 직원·반·학생 연결이 자동으로
              생성됩니다.
            </p>
          ) : null}
          <p>서버에 설정된 지점 연결을 미리보기 상태로 등록합니다.</p>
          <label>
            연결{" "}
            <select required name="bindingId">
              <option value="">선택</option>
              {initial.configuredBindings.map((id) => (
                <option key={id}>{id}</option>
              ))}
            </select>
          </label>{" "}
          <label>
            기록 보관 담당 계정 ID <input name="archiveOwnerUserId" />
          </label>{" "}
          <button disabled={busy}>미리보기 연결 등록</button>
        </form>
      ) : null}
      {initial.bindings.map((binding) => (
        <section
          key={binding.id}
          style={{ border: "1px solid #ccc", borderRadius: 12, padding: 20 }}
        >
          <h2>
            지점 연결 {binding.targetBranchName ?? binding.targetBranchId}
          </h2>
          {binding.branchNameMismatch ? (
            <p>
              지점 이름 확인 필요: 에이와는 “{binding.sourceTenantName}”,
              오늘의수학은 “{binding.targetBranchName}”입니다. 기존 이름을
              유지했습니다.
            </p>
          ) : null}
          {!binding.configured ? <p>서버 연결 설정을 확인해 주세요.</p> : null}
          <dl>
            <dt>모드</dt>
            <dd>
              {binding.retiredAt
                ? "종료"
                : binding.mode === "active"
                  ? "활성"
                  : "미리보기"}
            </dd>
            <dt>에이와 상태</dt>
            <dd>
              {binding.enabled ? "ON" : "OFF"} ·{" "}
              {binding.healthy ? "정상" : "확인 필요"}
            </dd>
            <dt>마지막 확인</dt>
            <dd>{binding.validatedAt ?? "아직 없음"}</dd>
            <dt>처리 상태</dt>
            <dd>
              받은 사건 {binding.inboxCount}개 ·{" "}
              {binding.lastError ?? "오류 없음"}
            </dd>
          </dl>
          {platform ? (
            <>
              <button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const response = await fetch(
                      `/api/admin/eywa-sync?preview=${binding.id}`,
                    );
                    const result = await response.json();
                    if (!response.ok) throw new Error();
                    setMessage(
                      `대상 ${result.counts.eligible}명 · 신규 ${result.counts.newAccounts}명 · 확인 후보 ${result.counts.matchingCandidates}명 · 충돌 ${result.counts.conflicts}명`,
                    );
                  } catch {
                    setMessage("미리보기를 불러오지 못했습니다.");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                변경 없이 미리보기
              </button>{" "}
              <button
                disabled={busy || !!binding.retiredAt}
                onClick={() =>
                  mutate({
                    action: binding.mode === "active" ? "shadow" : "activate",
                    bindingId: binding.id,
                  })
                }
              >
                {binding.mode === "active"
                  ? "새 연결·쓰기 중지"
                  : "연결 활성화"}
              </button>{" "}
              <button
                disabled={busy}
                onClick={() =>
                  mutate({ action: "retry", bindingId: binding.id })
                }
              >
                재처리 요청
              </button>{" "}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await mutate({ action: "retire", bindingId: binding.id });
                }}
              >
                <label>
                  <input type="checkbox" required /> 이 연결의 모든 관리 선생님
                  접근을 중지합니다.
                </label>{" "}
                <button disabled={busy || !!binding.retiredAt}>
                  연결 종료
                </button>
              </form>
            </>
          ) : null}
        </section>
      ))}
      {operator ? (
        <section>
          <h2>최근 동기화 처리</h2>
          <table>
            <thead>
              <tr>
                <th>받은 시각</th>
                <th>상태</th>
                <th>확인 사항</th>
              </tr>
            </thead>
            <tbody>
              {initial.events.map((event) => (
                <tr key={event.eventId}>
                  <td>{event.receivedAt}</td>
                  <td>
                    {{
                      received: "수신 완료",
                      processing: "처리 중",
                      applied: "반영 완료",
                      conflict: "검토 필요",
                      superseded: "최신 상태로 대체됨",
                    }[event.status] ?? event.status}
                  </td>
                  <td>{event.errorCode ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {initial.relationReviews.map((review) => {
            const details = review.details as {
              conflicts?: { entity: string; sourceId: string; code: string }[];
              deferredStudents?: number;
              unresolvedProgress?: number;
            };
            return (
              <details key={review.id}>
                <summary>{review.createdAt} 관계 검토 기록</summary>
                <p>
                  보류 학생 {details.deferredStudents ?? 0}명 · 미확정 진도{" "}
                  {details.unresolvedProgress ?? 0}건
                </p>
                <ul>
                  {details.conflicts?.map((item, index) => (
                    <li key={index}>
                      {item.entity} · {item.sourceId} · {item.code}
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
        </section>
      ) : null}
      <h2>{operator ? "계정 연결 및 검토" : "내 에이와 연결"}</h2>
      <p>
        이메일과 이름 일치는 연결 후보입니다. 기존 계정의 소유권 확인 후 지점
        전환이 확정되며, 기존 자료는 이전 지점에 보존됩니다.
      </p>
      {!initial.accounts.length ? (
        <p>확인할 연결이 없습니다.</p>
      ) : (
        initial.accounts.map((account) => (
          <section
            key={account.id}
            style={{ border: "1px solid #ccc", borderRadius: 12, padding: 20 }}
          >
            <h3>
              {account.sourceName} · {labels[account.status] ?? account.status}
            </h3>
            <p>
              에이와: {account.sourceEmail}
              <br />
              오늘의수학: {account.localName ?? "연결 계정 없음"} ·{" "}
              {account.localEmail ?? "—"}
            </p>
            {account.localEmail &&
            account.localEmail !== account.sourceEmail ? (
              <p>
                로그인 이메일이 원본 이메일과 다릅니다. 기존 로그인 이메일은
                유지됩니다.
              </p>
            ) : null}
            <p>
              {[account.conflictReason, ...account.blockReasons]
                .filter(Boolean)
                .map((reason) => labels[reason!] ?? reason)
                .join(" · ")}
            </p>
            <small>
              원본 ID {account.sourceUserId} · 계정 ID{" "}
              {account.userId ?? "없음"}
            </small>
            {["candidate", "conflict"].includes(account.status) &&
            account.userId &&
            account.candidateVersion ? (
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  const form = event.currentTarget;
                  const data = new FormData(form);
                  await mutate({
                    id: account.id,
                    version: account.candidateVersion,
                    ...(operator
                      ? { action: "approve", evidence: data.get("evidence") }
                      : { password: data.get("password") }),
                  });
                  form.reset();
                }}
              >
                {operator ? (
                  <label>
                    독립적인 소유권 확인 근거 (기존 인증 수단 소유 증명·과거
                    승인/사용 기록 등)
                    <textarea
                      required
                      minLength={30}
                      maxLength={1000}
                      name="evidence"
                      rows={3}
                    />
                  </label>
                ) : (
                  <label>
                    현재 오늘의수학 비밀번호{" "}
                    <input
                      required
                      type="password"
                      name="password"
                      autoComplete="current-password"
                      maxLength={72}
                    />
                  </label>
                )}
                <p>
                  이름·이메일 비교나 구두 확인만으로는 운영자 승인이 허용되지
                  않습니다.
                </p>
                <label>
                  <input required type="checkbox" /> 동일인과 지점 전환을
                  확인했습니다.
                </label>{" "}
                <button disabled={busy}>확인 후 연결 승인</button>
              </form>
            ) : null}
          </section>
        ))
      )}
    </div>
  );
}
