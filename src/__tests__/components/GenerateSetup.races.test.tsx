import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { server } from "@/mocks/server";
import {
  CLASS_A_ID,
  CLASS_B_ID,
  MOCK_STUDENT_1,
  MOCK_UNITS,
} from "@/mocks/data";
import { useGenerateSetup } from "@/components/test/useGenerateSetup";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
const barrier = () => {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
};

describe("generation selection races", () => {
  it("clears a previous student immediately and distinguishes a failed new roster from an empty one", async () => {
    const roster = barrier();
    server.use(
      http.get("/api/students", async ({ request }) => {
        const classId = new URL(request.url).searchParams.get("classId");
        if (classId === CLASS_B_ID) {
          await roster.promise;
          return HttpResponse.json({}, { status: 503 });
        }
        return HttpResponse.json({
          data: [MOCK_STUDENT_1],
          meta: { page: 1, pageSize: 100, total: 1 },
        });
      }),
    );
    const { result } = renderHook(() =>
      useGenerateSetup({
        initialClassId: CLASS_A_ID,
        initialStudentId: MOCK_STUDENT_1.id,
      }),
    );
    await waitFor(() =>
      expect(result.current.studentId).toBe(MOCK_STUDENT_1.id),
    );
    act(() => result.current.selectClass(CLASS_B_ID));
    expect(result.current.studentId).toBe("");
    expect(result.current.students).toEqual([]);
    expect(result.current.studentsLoading).toBe(true);
    act(() => roster.release());
    await waitFor(() => expect(result.current.studentsError).toBe(true));
    expect(result.current.studentsLoading).toBe(false);
  });

  it("late default range and initial roster cannot overwrite manual range in the same class", async () => {
    const pending = barrier();
    server.use(
      http.get("/api/students", async () => {
        await pending.promise;
        return HttpResponse.json({
          data: [MOCK_STUDENT_1],
          meta: { page: 1, pageSize: 100, total: 1 },
        });
      }),
      http.get("/api/tests/default-range", async () => {
        await pending.promise;
        return HttpResponse.json({ data: null });
      }),
    );
    const { result } = renderHook(() =>
      useGenerateSetup({
        initialClassId: CLASS_A_ID,
        initialStudentId: MOCK_STUDENT_1.id,
      }),
    );
    await waitFor(() => expect(result.current.ready).toBe(true));
    act(() => result.current.setRange(MOCK_UNITS[1].id, MOCK_UNITS[7].id));
    act(() => pending.release());
    await waitFor(() => expect(result.current.studentsLoading).toBe(false));
    expect(result.current.studentId).toBe("");
    expect(result.current.rangeStartUnitId).toBe(MOCK_UNITS[1].id);
    expect(result.current.rangeEndUnitId).toBe(MOCK_UNITS[7].id);
    expect(result.current.rangeLoading).toBe(false);
    expect(result.current.rangeUnknown).toBe(false);
    act(() => result.current.selectClass(CLASS_B_ID));
    expect(result.current.rangeStartUnitId).toBe("");
    expect(result.current.rangeEndUnitId).toBe("");
  });

  it("does not replace a missing requested class with the first class", async () => {
    const { result } = renderHook(() =>
      useGenerateSetup({
        initialClassId: "00000000-0000-4000-8000-999999999999",
      }),
    );
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.classId).toBe("");
    expect(result.current.selectionWarning).toContain("요청한 반");
  });
});
