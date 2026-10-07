"use client";
import { useRef, useState } from "react";
import type { managedStatus } from "@/lib/eywa/managedAdministration";
import { relationReviewLabel } from "@/lib/admin/accountUsability";
import { kstDateTimeLabel } from "@/lib/kstDate";
import styles from "./eywaManagement.module.css";

type Status = Awaited<ReturnType<typeof managedStatus>>;
type Pages = { events: number; accounts: number; reviews: number };
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
  candidate_changed: "확인 대상이 바뀌었습니다",
  activation_requires_enabled: "원본 연동이 꺼져 있어 복구를 시작하지 않습니다",
  activation_requires_healthy_binding:
    "원본 상태 또는 기준 시점이 맞지 않아 복구를 시작하지 않습니다",
  snapshot_not_applied:
    "스냅샷을 적용하지 못했습니다. 계정은 바꾸지 않았습니다",
  archive_owner_conflict:
    "보관 담당자가 이미 바뀌었습니다. 최신 연결을 다시 읽으세요",
  invalid_archive_owner:
    "같은 지점의 승인된 교사만 보관 담당자로 지정할 수 있습니다",
};
const applicationLabel: Record<string, string> = {
  received: "수신 완료",
  processing: "처리 중",
  applied: "반영 완료",
  conflict: "검토 필요",
  superseded: "최신 상태로 대체됨",
};

function clearSecret(form: HTMLFormElement) {
  const password = form.elements.namedItem("password");
  if (password instanceof HTMLInputElement) password.value = "";
}

function Pager({
  window,
  busy,
  onPage,
}: {
  window: Status["pages"]["events"];
  busy: boolean;
  onPage: (page: number) => void;
}) {
  return (
    <p>
      {window.from}–{window.to} / 총 {window.total}건{" "}
      <button
        type="button"
        disabled={busy || window.page <= 1}
        onClick={() => onPage(window.page - 1)}
      >
        이전
      </button>
      <button
        type="button"
        disabled={busy || window.to >= window.total}
        onClick={() => onPage(window.page + 1)}
      >
        다음
      </button>
    </p>
  );
}

export function EywaManagement({
  initial,
  operator,
  platform,
}: {
  initial: Status;
  operator: boolean;
  platform: boolean;
}) {
  const busyRef = useRef(false);
  const [status, setStatus] = useState(initial);
  const [pages, setPages] = useState<Pages>({
    events: 1,
    accounts: 1,
    reviews: 1,
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [stopTarget, setStopTarget] = useState<{
    id: string;
    count: number;
  } | null>(null);
  const endpoint = operator
    ? "/api/admin/eywa-sync"
    : "/api/account/eywa-managed";

  async function load(next: Pages = pages) {
    if (busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    try {
      const params = new URLSearchParams({
        eventsPage: String(next.events),
        accountsPage: String(next.accounts),
        reviewsPage: String(next.reviews),
      });
      const response = await fetch(`${endpoint}?${params}`, {
        cache: "no-store",
      });
      if (!response.ok) return false;
      setStatus((await response.json()) as Status);
      setPages(next);
      return true;
    } catch {
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function mutate(body: unknown) {
    if (busyRef.current)
      return { ok: false as const, code: "busy", result: null };
    busyRef.current = true;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        const code =
          result && typeof result === "object" && "error" in result
            ? String(
                (result as { error?: { code?: string } }).error?.code ?? "",
              )
            : "";
        setMessage(
          labels[code] ??
            "변경할 수 없습니다. 최신 계정 상태와 확인 근거를 다시 확인해 주세요.",
        );
        return { ok: false as const, code, result };
      }
      return { ok: true as const, code: "", result };
    } catch {
      setMessage(
        "요청 결과를 확인하지 못했습니다. 자동으로 다시 보내지 않습니다. 최신 상태를 확인하세요.",
      );
      return { ok: false as const, code: "network", result: null };
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function refresh() {
    const ok = await load();
    setMessage(
      ok
        ? "목록을 다시 읽었습니다."
        : "목록을 다시 읽지 못했습니다. 표시 중인 범위는 그대로입니다.",
    );
  }

  return (
    <div className={styles.panel}>
      <p role="status" aria-live="polite">
        {message}
      </p>
      {operator ? (
        <button type="button" disabled={busy} onClick={() => void refresh()}>
          목록 새로고침
        </button>
      ) : null}
      {platform ? (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const data = new FormData(form);
            const outcome = await mutate({
              action: "register",
              bindingId: data.get("bindingId"),
              ...(data.get("archiveOwnerUserId")
                ? { archiveOwnerUserId: data.get("archiveOwnerUserId") }
                : {}),
            });
            if (outcome.ok) {
              form.reset();
              setMessage("미리보기 연결을 등록했습니다.");
              await load({ events: 1, accounts: 1, reviews: 1 });
            }
          }}
        >
          <h2>새 연결 등록</h2>
          {status.automaticProvisioningEnabled ? (
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
              {status.configuredBindings.map((id) => (
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
      {status.bindings.map((binding) => (
        <section key={binding.id}>
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
            <dd>
              {binding.validatedAt
                ? kstDateTimeLabel(binding.validatedAt)
                : "아직 없음"}
            </dd>
            <dt>처리 상태</dt>
            <dd>
              받은 사건 {binding.inboxCount}개 ·{" "}
              {binding.lastError
                ? (labels[binding.lastError] ?? binding.lastError)
                : "오류 없음"}
            </dd>
            <dt>보관 담당자</dt>
            <dd>{binding.archiveOwnerUserId ?? "미지정"}</dd>
          </dl>
          {platform ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  if (busyRef.current) return;
                  busyRef.current = true;
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
                    busyRef.current = false;
                    setBusy(false);
                  }
                }}
              >
                변경 없이 미리보기
              </button>{" "}
              {binding.mode === "active" ? (
                <button
                  type="button"
                  disabled={busy || !!binding.retiredAt}
                  onClick={async () => {
                    if (busyRef.current) return;
                    busyRef.current = true;
                    setBusy(true);
                    setStopTarget(null);
                    try {
                      const response = await fetch(
                        `/api/admin/eywa-sync?impact=${binding.id}`,
                      );
                      const result = await response.json();
                      if (!response.ok || typeof result.count !== "number")
                        throw new Error();
                      setStopTarget({ id: binding.id, count: result.count });
                      setMessage("");
                    } catch {
                      setMessage(
                        "중지 대상 수를 확인하지 못했습니다. 계정을 바꾸지 않았습니다.",
                      );
                    } finally {
                      busyRef.current = false;
                      setBusy(false);
                    }
                  }}
                >
                  연동 계정 접근·동기화 중지
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy || !!binding.retiredAt}
                  onClick={async () => {
                    const outcome = await mutate({
                      action: "activate",
                      bindingId: binding.id,
                    });
                    if (!outcome.ok) {
                      setMessage(
                        (current) =>
                          `${current} 복구 완료로 처리하지 않았습니다.`,
                      );
                      return;
                    }
                    const restored = Number(
                      (outcome.result as { restored?: number } | null)
                        ?.restored ?? 0,
                    );
                    setMessage(
                      restored > 0
                        ? `원본 확인과 활성 모드 전환을 접수했습니다. 모드 변경은 복구 완료가 아닙니다. 연동 정지로 막힌 계정 ${restored}건의 접근을 다시 열었습니다. 해당 계정은 다시 로그인해야 합니다.`
                        : "원본 확인과 활성 모드 전환을 접수했습니다. 모드 변경은 복구 완료가 아닙니다. 다시 연 계정은 없습니다.",
                    );
                    await load();
                  }}
                >
                  연결 복구 시작
                </button>
              )}{" "}
              {stopTarget?.id === binding.id ? (
                <div role="group" aria-label="연동 중지 확인">
                  <p>
                    연동 계정 {stopTarget.count}개의 접근과 세션을 중지하고
                    동기화도 멈춥니다. 취소하면 바꾸지 않습니다.
                  </p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      const count = stopTarget.count;
                      const outcome = await mutate({
                        action: "shadow",
                        bindingId: binding.id,
                      });
                      if (!outcome.ok) return;
                      const applied =
                        Number(
                          (outcome.result as { count?: number } | null)?.count,
                        ) || count;
                      setStopTarget(null);
                      const read = await load();
                      setMessage(
                        read
                          ? `연동 계정 ${applied}개의 접근과 세션을 중지했습니다. 동기화도 멈췄습니다.`
                          : "중지는 반영되었습니다. 목록을 다시 읽지 못했습니다.",
                      );
                    }}
                  >
                    중지 확정
                  </button>{" "}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setStopTarget(null)}
                  >
                    취소
                  </button>
                </div>
              ) : null}{" "}
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  const outcome = await mutate({
                    action: "retry",
                    bindingId: binding.id,
                  });
                  if (!outcome.ok) {
                    setMessage(
                      (current) =>
                        `${current} 원인을 고치기 전에 다시 처리하면 같은 이유로 실패합니다.`,
                    );
                    return;
                  }
                  setMessage(
                    "재처리를 접수했습니다. 원인을 고치기 전에 다시 요청하면 같은 이유로 실패합니다.",
                  );
                  await load();
                }}
              >
                재처리 요청
              </button>{" "}
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  const outcome = await mutate({
                    action: "retire",
                    bindingId: binding.id,
                  });
                  if (outcome.ok) {
                    event.currentTarget.reset();
                    setMessage(
                      "연결을 종료했습니다. 종료한 계정은 이 복구로 풀지 않습니다.",
                    );
                    await load();
                  }
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
              <form
                onSubmit={async (event) => {
                  event.preventDefault();
                  const form = event.currentTarget;
                  const data = new FormData(form);
                  const outcome = await mutate({
                    action: "assign-archive-owner",
                    bindingId: binding.id,
                    archiveOwnerUserId: data.get("archiveOwnerUserId"),
                    expectedArchiveOwnerUserId: binding.archiveOwnerUserId,
                  });
                  if (!outcome.ok) return;
                  form.reset();
                  setMessage(
                    "보관 담당자를 바꿨습니다. 담당자가 없는 반만 접근 권한이 생기고, 이미 담당자가 있는 반은 그대로입니다.",
                  );
                  await load();
                }}
              >
                <h3>보관 담당자 지정</h3>
                <p>
                  담당자가 없는 반은 이 교사에게 접근 권한이 생깁니다. 이미
                  담당자가 있는 반은 옮기지 않습니다. 승인되지 않았거나
                  정지·삭제된 계정은 지정되지 않으며, 원인을 고치기 전에 다시
                  지정하면 같은 이유로 실패합니다.
                </p>
                <label>
                  같은 지점의 교사 계정 ID
                  <input name="archiveOwnerUserId" required />
                </label>
                <button type="submit" disabled={busy}>
                  보관 담당자 지정
                </button>
              </form>
            </>
          ) : null}
        </section>
      ))}
      {operator ? (
        <section>
          <h2>최근 동기화 처리</h2>
          <p>계정 확인 대기 {status.pendingAccountChecks}건</p>
          <p>관계 충돌 검토 {status.pages.reviews.total}건</p>
          <Pager
            window={status.pages.events}
            busy={busy}
            onPage={(page) => void load({ ...pages, events: page })}
          />
          <table>
            <thead>
              <tr>
                <th>받은 시각</th>
                <th>통신</th>
                <th>반영</th>
              </tr>
            </thead>
            <tbody>
              {status.events.map((event) => (
                <tr key={event.eventId}>
                  <td title={event.receivedAt}>
                    {kstDateTimeLabel(event.receivedAt)}
                  </td>
                  <td title={event.errorCode ?? ""}>
                    {event.errorCode
                      ? (labels[event.errorCode] ?? event.errorCode)
                      : "수신"}
                  </td>
                  <td>{applicationLabel[event.status] ?? event.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pager
            window={status.pages.reviews}
            busy={busy}
            onPage={(page) => void load({ ...pages, reviews: page })}
          />
          {status.relationReviews.map((review) => {
            const details = review.details as {
              conflicts?: { entity: string; sourceId: string; code: string }[];
              deferredStudents?: number;
              unresolvedProgress?: number;
            };
            const linked = relationReviewLabel(review.details);
            return (
              <details key={review.id}>
                <summary>
                  {kstDateTimeLabel(review.createdAt)} 관계 검토 기록
                </summary>
                <p>검토 ID {review.id}</p>
                <p>
                  사건 {linked.eventId ?? "없음"} · 연결{" "}
                  {linked.bindingId ?? "없음"} · 스냅샷{" "}
                  {linked.snapshotId ?? "없음"}
                </p>
                <p>
                  {linked.recorded ? `사유 ${linked.reason}` : "사유 미기록"}
                </p>
                <p>
                  보류 학생 {details.deferredStudents ?? 0}명 · 미확정 진도{" "}
                  {details.unresolvedProgress ?? 0}건
                </p>
                <ul>
                  {details.conflicts?.map((item, index) => (
                    <li key={`${review.id}-${index}`}>
                      {item.entity} · {item.sourceId} ·{" "}
                      {labels[item.code] ?? item.code}
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
      {operator && status.bindings.length === 0 ? (
        <p>
          연결이 없습니다. 계정 승인 전에 지점 연결과 보관 담당자를 먼저
          지정하세요.
        </p>
      ) : null}
      {operator ? (
        <Pager
          window={status.pages.accounts}
          busy={busy}
          onPage={(page) => void load({ ...pages, accounts: page })}
        />
      ) : null}
      {!status.accounts.length ? (
        <p>확인할 연결이 없습니다.</p>
      ) : (
        status.accounts.map((account) => {
          const approvalBlocked = operator && status.bindings.length === 0;
          return (
            <section key={account.id}>
              <h3>
                {account.sourceName} ·{" "}
                {labels[account.status] ?? account.status}
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
                    const outcome = await mutate({
                      id: account.id,
                      version: account.candidateVersion,
                      ...(operator
                        ? { action: "approve", evidence: data.get("evidence") }
                        : { password: data.get("password") }),
                    });
                    clearSecret(form);
                    if (outcome.ok) {
                      form.reset();
                      setMessage(
                        operator
                          ? "연결을 승인했습니다. 다음 동기화에서 최신 상태를 반영합니다."
                          : "연결되었습니다. 에이와 바로가기로 다시 로그인해 주세요.",
                      );
                      await load();
                      return;
                    }
                    if (outcome.code === "candidate_changed") {
                      const box = form.querySelector('input[type="checkbox"]');
                      if (box instanceof HTMLInputElement) box.checked = false;
                      setMessage(
                        "확인 대상이 바뀌었습니다. 근거는 남겨 두었고 확인 체크만 해제했습니다.",
                      );
                      await load();
                    }
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
                  {approvalBlocked ? (
                    <p>
                      연결이 없습니다. 계정 승인 전에 지점 연결과 보관 담당자를
                      먼저 지정하세요.
                    </p>
                  ) : null}
                  <label>
                    <input required type="checkbox" name="confirm" /> 동일인과
                    지점 전환을 확인했습니다.
                  </label>{" "}
                  <button disabled={busy || approvalBlocked}>
                    확인 후 연결 승인
                  </button>
                </form>
              ) : null}
            </section>
          );
        })
      )}
    </div>
  );
}
