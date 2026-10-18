import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EywaManagement } from "@/components/account/EywaManagement";
import type { managedStatus } from "@/lib/eywa/managedAdministration";

afterEach(() => vi.unstubAllGlobals());
type Status = Awaited<ReturnType<typeof managedStatus>>;
const page = { page: 1, pageSize: 30, total: 1, from: 1, to: 1 };
function status(overrides: Partial<Status> = {}): Status {
  return {
    automaticProvisioningEnabled: false,
    events: [
      {
        eventId: "event-1",
        bindingId: "60000000-0000-4000-8000-000000000001",
        status: "applied",
        errorCode: "source_unhealthy",
        receivedAt: "2026-10-03T15:30:00.000Z",
        appliedAt: null,
      },
    ],
    relationReviews: [
      {
        id: "review-1",
        createdAt: "2026-10-03T15:00:00.000Z",
        details: { bindingId: "b", snapshotId: "s" },
      },
    ],
    bindings: [
      {
        id: "60000000-0000-4000-8000-000000000001",
        tenantId: "70000000-0000-4000-8000-000000000001",
        targetBranchId: "50000000-0000-4000-8000-000000000001",
        targetBranchName: "테스트 지점",
        sourceTenantName: "테스트 지점",
        branchNameMismatch: false,
        configured: true,
        mode: "active",
        archiveOwnerUserId: null,
        enabled: true,
        healthy: true,
        retiredAt: null,
        sourceEpoch: "epoch",
        securityRevision: "1",
        contentGeneration: "1",
        lastError: null,
        validatedAt: "2026-10-03T15:30:00.000Z",
        leaseExpiresAt: null,
        inboxCount: 1,
      },
    ],
    pendingAccountChecks: 2,
    pages: {
      events: page,
      accounts: { ...page, pageSize: 200 },
      reviews: { ...page, pageSize: 10 },
    },
    accounts: [
      {
        id: "account-1",
        bindingId: "60000000-0000-4000-8000-000000000001",
        sourceUserId: "source-1",
        userId: "20000000-0000-4000-8000-000000000001",
        sourceEmail: "teacher@example.com",
        sourceName: "김강사",
        localName: "김강사",
        localEmail: "teacher@example.com",
        localBranchId: null,
        status: "candidate",
        blockReasons: [],
        conflictReason: null,
        candidateVersion: "a".repeat(64),
        confirmedAt: null,
        confirmationMethod: null,
        confirmedBy: null,
        leaseExpiresAt: null,
      },
    ],
    configuredBindings: [],
    ...overrides,
  };
}

describe("eywa management usability", () => {
  it("separates communication from application and marks an unrecorded reason", () => {
    render(<EywaManagement initial={status()} operator platform={false} />);
    expect(screen.getByRole("columnheader", { name: "통신" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "반영" })).toBeInTheDocument();
    expect(screen.getByText("원본 상태 확인 필요")).toBeInTheDocument();
    expect(screen.getByText("반영 완료")).toBeInTheDocument();
    expect(screen.getAllByText("2026-10-04 00:30 KST").length).toBeGreaterThan(0);
    expect(screen.getByText("계정 확인 대기 2건")).toBeInTheDocument();
    expect(screen.getByText("관계 충돌 검토 1건")).toBeInTheDocument();
    fireEvent.click(screen.getByText(/관계 검토 기록/));
    expect(screen.getByText("사유 미기록")).toBeInTheDocument();
    expect(screen.getByText("검토 ID review-1")).toBeInTheDocument();
  });

  it("cancels a stop without posting and keeps approval evidence after failure", async () => {
    const fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("impact=")) return Response.json({ count: 3 });
      if (init?.method === "POST")
        return Response.json(
          { error: { code: "candidate_changed" } },
          { status: 409 },
        );
      return Response.json(status());
    });
    vi.stubGlobal("fetch", fetch);
    render(<EywaManagement initial={status()} operator platform />);
    fireEvent.click(
      screen.getByRole("button", { name: "연동 계정 접근·동기화 중지" }),
    );
    expect(await screen.findByText(/연동 계정 3개/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(screen.queryByText(/연동 계정 3개/)).not.toBeInTheDocument();
    expect(fetch.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(0);
    const evidence = "독립적인 과거 승인 기록과 기존 인증 수단 소유를 확인했습니다.";
    fireEvent.change(screen.getByRole("textbox", { name: /소유권 확인 근거/ }), {
      target: { value: evidence },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: /동일인/ }));
    fireEvent.click(screen.getByRole("button", { name: "확인 후 연결 승인" }));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("확인 체크만 해제"),
    );
    expect(screen.getByRole("textbox", { name: /소유권 확인 근거/ })).toHaveValue(
      evidence,
    );
    expect(screen.getByRole("checkbox", { name: /동일인/ })).not.toBeChecked();
    expect(fetch.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
  });

  it("disables approval when no binding exists", () => {
    render(
      <EywaManagement
        initial={status({ bindings: [], pendingAccountChecks: 0, relationReviews: [], events: [] })}
        operator
        platform={false}
      />,
    );
    expect(screen.getByRole("button", { name: "확인 후 연결 승인" })).toBeDisabled();
    expect(screen.queryByText(/보관 담당자/)).toBeNull();
  });
});
