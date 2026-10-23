// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { PrismaClient } from "@prisma/client";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/math-ontology/review/authorization", () => ({ authorizeOntologyDraftScope: async () => {}, authorizeOntologyPublisher: async () => {} }));
vi.mock("@/lib/math-ontology/actions/actor", () => ({ readOntologyActorInTransaction: async () => ({ row: { isSuperAdmin: true } }) }));
vi.mock("@/lib/math-ontology/sources/server", () => ({ authorizeMathOntologySourceRead: async () => {}, MathOntologySourceAccessDenied: class extends Error {} }));
import { createOntologyHistoryReader } from "@/lib/math-ontology/actions/history";
import { createOntologyWorkspaceSource } from "@/components/math-ontology/api";
import OntologyWorkspace from "@/components/math-ontology/OntologyWorkspace";
const jobId = "00000000-0000-4000-8000-000000000002", actor = { id: "00000000-0000-4000-8000-000000000001", sessionVersion: 1 }, sealHash = `sha256:${"a".repeat(64)}`;
function history(state: string) {
  const tx = { ontologyProposal: { findMany: async () => [] }, ontologyRelationReview: { findMany: async () => [] }, ontologyCompileJob: { findMany: async () => [{ id: jobId, state, attempt: 1, createdAt: new Date("2026-10-23T12:00:00Z") }] }, ontologyReviewEvent: { findMany: async () => [], findFirst: async () => ({ detailHash: sealHash }) } };
  const db = { $transaction: async (fn: (tx: object) => unknown) => fn(tx) } as unknown as Pick<PrismaClient, "$transaction">;
  return createOntologyHistoryReader({ db })(actor);
}
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it("shows a known failed publication as unpublished and explicitly revalidates once through the unchanged confirmation contract", async () => {
  const answer = await history("failed");
  expect(answer.steps[0].title).toBe("게시 검증 실패 기록"); expect(answer.steps[0].note).toContain("검증 실패 · 이 작업은 미게시");
  expect(answer.action).toMatchObject({ kind: "publication", id: jobId, sealHash, label: "게시 다시 검증", changes: [{ label: "이미 확인한 게시 작업", before: "검증 실패", after: "현재 근거 재확인·재검증" }] });
  expect(answer.action?.effects.join(" ")).toContain("다시 실행"); expect(answer.action?.effects.join(" ")).toContain("성공");
  const fetch = vi.fn<typeof globalThis.fetch>(async () => Response.json({ data: { id: jobId, state: "preparing", message: "게시 결과를 준비하고 있습니다.", details: [] } })); vi.stubGlobal("fetch", fetch);
  const port = { ...createOntologyWorkspaceSource(), history: async () => answer };
  render(<OntologyWorkspace source={port} canPublish />); fireEvent.click(screen.getByRole("button", { name: "검토·실행 이력" })); await screen.findByText("게시 검증 실패 기록");
  expect(fetch).not.toHaveBeenCalled(); const retry = screen.getByRole("button", { name: "게시 다시 검증" }); fireEvent.click(retry); fireEvent.click(retry); await screen.findByText("게시 결과를 준비하고 있습니다.");
  expect(fetch).toHaveBeenCalledTimes(1); expect(fetch.mock.calls[0][0]).toBe("/api/math-ontology/publish/jobs"); expect(fetch.mock.calls[0][1]?.method).toBe("POST"); expect(JSON.parse(fetch.mock.calls[0][1]?.body as string)).toEqual({ confirmationId: jobId, sealHash });
  expect(screen.getByRole("button", { name: "결과 확인" })).toBeTruthy();
});
it.each(["queued", "leased"])("preserves the existing %s continuation labels and sealed action", async state => {
  const answer = await history(state);
  expect(answer.steps[0].title).toBe("게시 작업 기록"); expect(answer.steps[0].note).toContain("게시 결과 확인 필요");
  expect(answer.action).toMatchObject({ id: jobId, sealHash, label: "게시 결과 확인", changes: [{ before: "결과 대기", after: "현재 결과 확인" }], effects: ["기존 작업을 이어서 확인합니다."] });
});
