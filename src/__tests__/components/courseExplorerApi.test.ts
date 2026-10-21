import { afterEach, expect, it, vi } from "vitest";
import { getExplorerTeacherDetail } from "@/components/math-srs/courseApi";
import { explorerTeacherDetail } from "@/lib/math-explorers/teacherSummary";
const studentId = "11111111-1111-4111-8111-111111111111";
const classId = "22222222-2222-4222-8222-222222222222";
const reply = () => ({
  data: {
    student: {
      id: studentId,
      name: "로컬 검증",
      classId,
      className: "초5",
      hasAccount: true,
    },
    today: "2026-10-22",
    policy: 2,
    detail: explorerTeacherDetail(null, "2026-10-22"),
  },
});
afterEach(() => vi.unstubAllGlobals());
it("reads the official strict projection with the selected enrollment context and no write", async () => {
  const fetchMock = vi.fn<typeof fetch>(async () => Response.json(reply()));
  vi.stubGlobal("fetch", fetchMock);
  const result = await getExplorerTeacherDetail(studentId, classId, "branch");
  expect(result.ok).toBe(true);
  expect(fetchMock).toHaveBeenCalledWith(
    `/api/students/${studentId}/math-srs/explorers?classId=${classId}&branchId=branch`,
    expect.objectContaining({ cache: "no-store" }),
  );
  expect(fetchMock.mock.calls[0][1]).not.toHaveProperty("method");
});
it("rejects extra answer content instead of showing it in the teacher explorer report", async () => {
  const body = reply();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        data: {
          ...body.data,
          detail: { ...body.data.detail, answer: "private answer" },
        },
      }),
    ),
  );
  const result = await getExplorerTeacherDetail(studentId);
  expect(result).toMatchObject({
    ok: false,
    message: "학습 기록의 형식을 확인하지 못했습니다. 다시 불러와 주세요.",
  });
});
