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
 it("reads source populations directly without delegating counting to AI or replacing the user's request", async () => {
  const port: OntologyWorkspaceSource & { coverage: ReturnType<typeof vi.fn> } = { ...source(), coverage: vi.fn(async () => ({ id: "synthetic-coverage", summary: "합성 원천 모집단입니다.", steps: [], details: [], coverage: [{ label: "합성 개체", value: "100 / 100" }, { label: "공식 기준 대응", value: "미확인" }] })) };
  render(<OntologyWorkspace source={port} />);
  fireEvent.change(screen.getByLabelText("원하는 일"), { target: { value: "내가 작성한 요청" } });
  fireEvent.click(screen.getByText("지식과 원천 범위")); fireEvent.click(screen.getByRole("button", { name: "원천과 포함 범위" }));
  await screen.findByText("합성 원천 모집단입니다."); expect(port.coverage).toHaveBeenCalledTimes(1); expect(port.run).not.toHaveBeenCalled();
  expect((screen.getByLabelText("원하는 일") as HTMLTextAreaElement).value).toBe("내가 작성한 요청"); expect(screen.getByText("100 / 100")).toBeTruthy(); expect(port.confirm).not.toHaveBeenCalled();
 });
 it.each(["원천에서 확인한 같은 연결의 근거를 다시 찾아줘", ""])("explicitly re-prepares an unknown candidate using edited request or stored fallback: %s", async edited => {
  const port = source(), previousReviewId = "00000000-0000-4000-8000-000000000011";
  const blocked = { ...answer, id: previousReviewId, summary: "근거를 더 확인해야 하는 후보입니다.", action: undefined, reprepare: { previousReviewId, expectedPreviousRevision: 3, query: "연결 근거를 다시 찾아줘" } };
  vi.mocked(port.run).mockResolvedValueOnce(blocked);
  let resolve!: (value: WorkspaceAnswer) => void; vi.mocked(port.run).mockReturnValueOnce(new Promise(r => { resolve = r; }));
  render(<OntologyWorkspace source={port} />);
  const input = screen.getByLabelText("원하는 일"); fireEvent.change(input, { target: { value: "연결을 찾아줘" } }); fireEvent.click(screen.getByRole("button", { name: "준비하기" }));
  await screen.findByText(blocked.summary); expect(port.confirm).not.toHaveBeenCalled();
  fireEvent.change(input, { target: { value: edited } });
  const retry = screen.getByRole("button", { name: "새 근거로 다시 준비" }); fireEvent.click(retry); fireEvent.click(retry);
  expect(port.run).toHaveBeenCalledTimes(2);
  expect(port.run).toHaveBeenLastCalledWith({ query: edited || blocked.reprepare.query, student: null, previousReviewId, expectedPreviousRevision: 3 }, expect.any(AbortSignal));
  resolve({ ...answer, summary: "새 후보를 준비했습니다.", action: undefined }); await screen.findByText("새 후보를 준비했습니다.");
  fireEvent.click(screen.getByRole("button", { name: "이전 결과" })); await screen.findByText(blocked.summary);
  expect(screen.getByRole("button", { name: "새 근거로 다시 준비" })).toBeTruthy(); expect(port.confirm).not.toHaveBeenCalled();
 });
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
  expect(screen.queryByRole("region", { name: "준비한 결과" })).toBeNull();
  expect(screen.queryByRole("region", { name: "다음 작업" })).toBeNull();
  expect((input as HTMLTextAreaElement).value).toBe("원천을 찾아줘"); expect(port.run).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "다시 준비" })); await screen.findByText(answer.summary);
  vi.mocked(port.run).mockRejectedValueOnce(new OntologyWorkspaceError("FORBIDDEN", "현재 권한으로 볼 수 없습니다."));
  fireEvent.click(screen.getByRole("button", { name: "준비하기" })); await screen.findByText("현재 권한으로 볼 수 없습니다.");
  expect(screen.queryByText("보존된 첫 풀이")).toBeNull();
 });
 it("keeps previous-result recovery when a later preparation fails without leaving an inert next-action card", async () => {
  const port = source(); vi.mocked(port.run).mockResolvedValueOnce({ ...answer, action: undefined }).mockRejectedValueOnce(new OntologyWorkspaceError("UNAVAILABLE", "새 자료를 준비하지 못했습니다."));
  render(<OntologyWorkspace source={port} />);
  fireEvent.change(screen.getByLabelText("원하는 일"), { target: { value: "찾아줘" } }); fireEvent.click(screen.getByRole("button", { name: "준비하기" })); await screen.findByText(answer.summary);
  fireEvent.click(screen.getByRole("button", { name: "준비하기" })); await screen.findByRole("alert");
  expect(screen.queryByRole("region", { name: "다음 작업" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "이전 결과" })); await screen.findByText(answer.summary); expect(port.confirm).not.toHaveBeenCalled();
 });
 it("locks duplicate submission while preparation is pending", async () => {
  const port = source(); let resolve!: (value: WorkspaceAnswer) => void;
  vi.mocked(port.run).mockReturnValue(new Promise(r => { resolve = r; }));
  render(<OntologyWorkspace source={port} />); fireEvent.change(screen.getByLabelText("원하는 일"), { target: { value: "찾아줘" } });
  const button = screen.getByRole("button", { name: "준비하기" }); fireEvent.click(button); fireEvent.click(button);
  expect(screen.getByRole("status")).toBeTruthy(); expect(screen.queryByRole("region", { name: "준비한 결과" })).toBeNull(); expect(screen.queryByRole("region", { name: "다음 작업" })).toBeNull();
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
  const port = source(); const publication: WorkspaceAnswer = { ...answer, action: { ...answer.action!, kind: "publication" as const, label: "검토한 내용 게시하기" } };
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
 it("renders native math through the shared renderer without invalid block nesting or automatic external images", async () => {
  const port = source(); vi.mocked(port.run).mockResolvedValue({ ...answer, summary: "수식 근거입니다.", action: undefined, steps: [{ id: "math", title: "일의 자리에서 받아올린 $1$의 값", note: "$\\frac{1}{2}$ · $n![k]$ · ![외부](https://example.test/private-probe)", state: "observed" }] });
  const view = render(<OntologyWorkspace source={port} />); fireEvent.change(screen.getByLabelText("원하는 일"), { target: { value: "수식 연결을 보여줘" } }); fireEvent.keyDown(screen.getByLabelText("원하는 일"), { key: "Enter" });
  await screen.findByText("수식 근거입니다.");
  expect(view.container.querySelectorAll(".katex").length).toBeGreaterThanOrEqual(3);
  expect(view.container.querySelector("p div,h2 div,strong div,img")).toBeNull();
  expect([...view.container.querySelectorAll("annotation")].some(node => node.textContent?.includes("n!"))).toBe(true);
 });
 it("loads durable history and prepares publisher operations without confirming writes", async () => {
  const port = source(); port.history = vi.fn(async () => ({ ...answer, summary: "최근 검토·실행 이력입니다.", action: undefined })); port.publication = vi.fn(async () => ({ ...answer, summary: "게시할 변경을 준비했습니다.", action: { ...answer.action!, kind: "publication" as const, label: "검토한 내용 게시하기" } }));
  render(<OntologyWorkspace source={port} canPublish />);
  fireEvent.click(screen.getByRole("button", { name: "검토·실행 이력" })); await screen.findByText("최근 검토·실행 이력입니다.");
  expect(port.history).toHaveBeenCalledTimes(1); expect(port.run).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "게시 준비" })); await screen.findByText("게시할 변경을 준비했습니다."); expect(port.confirm).not.toHaveBeenCalled();
 });
});
