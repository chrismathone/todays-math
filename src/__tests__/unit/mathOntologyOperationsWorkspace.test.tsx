// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach, beforeAll } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import OntologyWorkspace from "@/components/math-ontology/OntologyWorkspace";
import { OntologyWorkspaceError, type OntologyWorkspaceSource, type WorkspaceAnswer } from "@/components/math-ontology/source";
beforeAll(() => { HTMLDialogElement.prototype.showModal = function () { this.open = true; }; HTMLDialogElement.prototype.close = function () { this.open = false; }; });
afterEach(cleanup);
const answer: WorkspaceAnswer = { id: "answer-1", summary: "계획 변경을 준비했습니다.", steps: [{ id: "e1", title: "보존된 첫 풀이", note: "힌트와 재시도 제외", state: "observed" }], details: [], coverage: [], action: { kind: "plan", id: "proposal-1", label: "이 계획으로 바꾸기", changes: [{ label: "하루 목표", before: "10문제", after: "15문제" }], effects: ["시작한 학습은 유지됩니다."] } };
function source(): OntologyWorkspaceSource { return { students: vi.fn(async () => []), run: vi.fn(async () => answer), confirm: vi.fn(async () => ({ id: "receipt-1", state: "applied" as const, message: "계획을 변경했습니다.", details: ["같은 요청은 다시 쓰지 않습니다."] })), feedback: vi.fn(async () => ({ summary: "아직 후속 관찰이 없습니다.", details: [] })) }; }
describe("B/H3 concise AI-first workspace", () => {
 it("starts with no student, delegates preparation once, shows the concrete diff and requires one explicit confirmation", async () => {
  const port = source(); const selected = { id: "00000000-0000-4000-8000-000000000001", classId: "00000000-0000-4000-8000-000000000002", branchId: null, label: "예시 학생", classLabel: "예시 반" }; vi.mocked(port.students).mockResolvedValue([selected]); render(<OntologyWorkspace source={port} />);
  fireEvent.click(screen.getByRole("button", { name: "학생 연결" }));
  fireEvent.click(await screen.findByRole("button", { name: "예시 학생 · 예시 반" }));
  fireEvent.change(screen.getByLabelText("원하는 일"), { target: { value: "확인할 내용을 준비해 줘" } });
  fireEvent.click(screen.getByRole("button", { name: "준비하기" }));
  await screen.findByText("계획 변경을 준비했습니다.");
  expect(port.run).toHaveBeenCalledWith({ query: "확인할 내용을 준비해 줘", student: selected }, expect.any(AbortSignal));
  expect(port.confirm).not.toHaveBeenCalled();
  expect(screen.getByText("10문제")).toBeTruthy(); expect(screen.getByText("15문제")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "이 계획으로 바꾸기" }));
  await screen.findByText("계획을 변경했습니다."); expect(port.confirm).toHaveBeenCalledTimes(1);
 });
 it("preserves input on failure and requires an explicit retry; permission change removes old evidence", async () => {
  const port = source(); vi.mocked(port.run).mockRejectedValueOnce(new OntologyWorkspaceError("UNAVAILABLE", "자료를 불러오지 못했습니다."));
  render(<OntologyWorkspace source={port} />);
  const input = screen.getByLabelText("원하는 일"); fireEvent.change(input, { target: { value: "원천을 찾아줘" } });
  fireEvent.click(screen.getByRole("button", { name: "준비하기" })); await screen.findByRole("alert");
  expect((input as HTMLTextAreaElement).value).toBe("원천을 찾아줘"); expect(port.run).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "다시 준비" })); await screen.findByText(answer.summary);
  vi.mocked(port.run).mockRejectedValueOnce(new OntologyWorkspaceError("FORBIDDEN", "현재 권한으로 볼 수 없습니다."));
  fireEvent.click(screen.getByRole("button", { name: "준비하기" })); await screen.findByText("현재 권한으로 볼 수 없습니다.");
  expect(screen.queryByText("보존된 첫 풀이")).toBeNull();
 });
 it("locks duplicate submission while preparation is pending", async () => {
  const port = source(); let resolve!: (value: WorkspaceAnswer) => void;
  vi.mocked(port.run).mockReturnValue(new Promise(r => { resolve = r; }));
  render(<OntologyWorkspace source={port} />); fireEvent.change(screen.getByLabelText("원하는 일"), { target: { value: "찾아줘" } });
  const button = screen.getByRole("button", { name: "준비하기" }); fireEvent.click(button); fireEvent.click(button);
  expect(port.run).toHaveBeenCalledTimes(1); resolve(answer);
  await waitFor(() => expect(screen.queryByText("준비 중…")).toBeNull());
 });
 it("Enter prepares only after composition ends; Shift+Enter never submits or confirms", async () => {
  const port = source(); render(<OntologyWorkspace source={port} />);
  const input = screen.getByLabelText("원하는 일"); fireEvent.change(input, { target: { value: "연결을 찾아줘" } });
  fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
  fireEvent.keyDown(input, { key: "Enter", isComposing: true, keyCode: 229 });
  expect(port.run).not.toHaveBeenCalled();
  fireEvent.keyDown(input, { key: "Enter", isComposing: false, keyCode: 13 });
  await screen.findByText(answer.summary);
  expect(port.run).toHaveBeenCalledTimes(1); expect(port.confirm).not.toHaveBeenCalled();
 });
 it("publication recovery reuses the prepared action and never sends a job id to plan feedback", async () => {
  const port = source(); const publication: WorkspaceAnswer = { ...answer, action: { ...answer.action!, kind: "publication", label: "검토한 내용 게시하기" } };
  vi.mocked(port.run).mockResolvedValue(publication);
  vi.mocked(port.confirm).mockResolvedValueOnce({ id: "job-1", state: "preparing", message: "게시 결과를 준비하고 있습니다.", details: [] }).mockResolvedValueOnce({ id: "job-1", state: "published", message: "검토한 내용을 게시했습니다.", details: [] });
  render(<OntologyWorkspace source={port} />); fireEvent.change(screen.getByLabelText("원하는 일"), { target: { value: "게시를 준비해줘" } });
  fireEvent.keyDown(screen.getByLabelText("원하는 일"), { key: "Enter" });
  fireEvent.click(await screen.findByRole("button", { name: "검토한 내용 게시하기" }));
  fireEvent.click(await screen.findByRole("button", { name: "결과 확인" }));
  await screen.findByText("검토한 내용을 게시했습니다.");
  expect(port.confirm).toHaveBeenNthCalledWith(1, publication.action, expect.any(AbortSignal));
  expect(port.confirm).toHaveBeenNthCalledWith(2, publication.action, expect.any(AbortSignal));
  expect(screen.queryByRole("button", { name: "이후 관찰" })).toBeNull(); expect(port.feedback).not.toHaveBeenCalled();
 });
});
