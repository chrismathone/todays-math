import { useCallback, useEffect, useRef, useState } from "react";

import type { ClassEntity, StudentEntity } from "@/contracts/class.contract";
import type { TeachingClasses } from "@/contracts/teaching.contract";
import { replaceScreenQuery } from "@/hooks/useScreenQuery";
import {
  advanceProgress,
  createClass,
  createStudent,
  fetchClasses,
  fetchProgress,
  fetchStudents,
  recordProgress,
} from "@/lib/class/classApi";
import { mineFirst } from "@/lib/class/classOwner";
import type { PlanDraft } from "@/lib/class/planDraft";
import { ServerError } from "@/lib/class/serverError";

type LoadStatus = "loading" | "ready" | "error";
type Mutation = {
  pending: boolean;
  error: string | null;
  success: string | null;
};
const idleMutation: Mutation = { pending: false, error: null, success: null };

export function useClassManage(
  requestedClassId = "",
  initialClasses?: TeachingClasses,
) {
  const initial = useRef(initialClasses);
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [students, setStudents] = useState<StudentEntity[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [currentUnitId, setCurrentUnitId] = useState<string | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [studentsStatus, setStudentsStatus] = useState<LoadStatus>("loading");
  const [progressStatus, setProgressStatus] = useState<LoadStatus>("loading");
  const [reload, setReload] = useState(0);
  const [classReload, setClassReload] = useState(0);
  const [classMutation, setClassMutation] = useState(idleMutation);
  const [studentMutations, setStudentMutations] = useState<
    Record<string, Mutation>
  >({});
  const [progressMutations, setProgressMutations] = useState<
    Record<string, Mutation>
  >({});
  // Fence a whole visit, including A → B → A, before React runs effect cleanup.
  const selectionVersion = useRef(0);
  const activeClassId = useRef("");
  const classPending = useRef(false);
  const studentRequests = useRef(new Map<string, Promise<boolean>>());
  const progressRequests = useRef(new Map<string, Promise<boolean>>());
  const requested = useRef(requestedClassId);
  useEffect(() => {
    requested.current = requestedClassId;
  }, [requestedClassId]);

  const resetDetails = useCallback(() => {
    selectionVersion.current += 1;
    setStudents([]);
    setCurrentUnitId(null);
    setStudentsStatus("loading");
    setProgressStatus("loading");
    setReload((value) => value + 1);
  }, []);

  const selectClass = useCallback(
    (classId: string) => {
      if (activeClassId.current === classId) return;
      activeClassId.current = classId;
      setSelectedClassId(classId);
      setError(null);
      resetDetails();
    },
    [resetDetails],
  );

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const bootstrap = classReload === 0 ? initial.current : undefined;
    const pending =
      bootstrap?.status === "error"
        ? Promise.reject(new Error("Class list unavailable"))
        : fetchClasses({
            signal: controller.signal,
            ...(bootstrap?.status === "ready"
              ? { firstPage: bootstrap.page }
              : {}),
          });
    pending
      .then((rows) => {
        if (cancelled) return;
        setClasses(rows);
        const wanted = activeClassId.current || requested.current;
        activeClassId.current = wanted
          ? rows.some((row) => row.id === wanted)
            ? wanted
            : ""
          : (rows[0]?.id ?? "");
        setSelectedClassId(activeClassId.current);
        setError(
          wanted && !activeClassId.current
            ? "요청한 반을 찾을 수 없거나 접근 권한이 없습니다. 반 목록에서 선택하세요."
            : null,
        );
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
        setError("반 목록을 불러오지 못했습니다.");
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [classReload]);

  useEffect(() => {
    if (
      status !== "ready" ||
      !requestedClassId ||
      requestedClassId === activeClassId.current
    )
      return;
    if (!classes.some((row) => row.id === requestedClassId)) {
      activeClassId.current = "";
      // Synchronize the explicit URL selection with the loaded authorized roster.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedClassId("");
      resetDetails();
      setError(
        "요청한 반을 찾을 수 없거나 접근 권한이 없습니다. 반 목록에서 선택하세요.",
      );
    } else {
      setError(null);
      selectClass(requestedClassId);
    }
  }, [requestedClassId, status, classes, selectClass, resetDetails]);

  useEffect(() => {
    if (!selectedClassId) return;
    let cancelled = false;
    const version = selectionVersion.current;
    const isCurrent = () => !cancelled && version === selectionVersion.current;

    // Returning to a class with an in-flight write must read after that write.
    // Independent requests keep one failure from hiding the other section.
    void (async () => {
      await studentRequests.current.get(selectedClassId);
      if (!isCurrent()) return;
      try {
        const rows = await fetchStudents(selectedClassId);
        if (!isCurrent()) return;
        setStudents(rows);
        setStudentsStatus("ready");
      } catch {
        if (isCurrent()) setStudentsStatus("error");
      }
    })();
    void (async () => {
      await progressRequests.current.get(selectedClassId);
      if (!isCurrent()) return;
      try {
        const progress = await fetchProgress(selectedClassId);
        if (!isCurrent()) return;
        setCurrentUnitId(progress?.unitId ?? null);
        setProgressStatus("ready");
      } catch {
        if (isCurrent()) setProgressStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedClassId, reload]);

  function retryClasses() {
    setStatus("loading");
    setError(null);
    setClassReload((value) => value + 1);
  }

  function saveProgress(unitId?: string): Promise<boolean> {
    const classId = selectedClassId;
    if (
      !classId ||
      progressStatus !== "ready" ||
      progressRequests.current.has(classId)
    ) {
      return Promise.resolve(false);
    }
    const version = selectionVersion.current;
    setProgressMutations((prev) => ({
      ...prev,
      [classId]: { ...idleMutation, pending: true },
    }));
    const request = (async () => {
      try {
        const next = unitId
          ? await recordProgress(classId, unitId)
          : await advanceProgress(classId);
        if (version === selectionVersion.current) setCurrentUnitId(next.unitId);
        setProgressMutations((prev) => ({
          ...prev,
          [classId]: { ...idleMutation, success: "진도를 저장했습니다." },
        }));
        return true;
      } catch {
        setProgressMutations((prev) => ({
          ...prev,
          [classId]: {
            ...idleMutation,
            error: unitId
              ? "진도를 저장하지 못했습니다. 다시 시도해 주세요."
              : "다음 소단원으로 변경하지 못했습니다. 마지막 진도인지 확인하거나 다시 시도해 주세요.",
          },
        }));
        return false;
      } finally {
        progressRequests.current.delete(classId);
      }
    })();
    progressRequests.current.set(classId, request);
    return request;
  }

  function addStudent(name: string): Promise<boolean> {
    const classId = selectedClassId;
    if (
      !classId ||
      !name.trim() ||
      studentsStatus !== "ready" ||
      studentRequests.current.has(classId)
    ) {
      return Promise.resolve(false);
    }
    const version = selectionVersion.current;
    setStudentMutations((prev) => ({
      ...prev,
      [classId]: { ...idleMutation, pending: true },
    }));
    const request = (async () => {
      try {
        const created = await createStudent(classId, name.trim());
        if (version === selectionVersion.current)
          setStudents((prev) => [...prev, created]);
        setStudentMutations((prev) => ({
          ...prev,
          [classId]: {
            ...idleMutation,
            success: `${created.name} 학생을 등록했습니다.`,
          },
        }));
        return true;
      } catch {
        setStudentMutations((prev) => ({
          ...prev,
          [classId]: {
            ...idleMutation,
            error:
              "학생을 등록하지 못했습니다. 입력 내용을 확인하고 다시 시도해 주세요.",
          },
        }));
        return false;
      } finally {
        studentRequests.current.delete(classId);
      }
    })();
    studentRequests.current.set(classId, request);
    return request;
  }

  async function addClass(
    name: string,
    grade: string,
    progressPlan?: PlanDraft,
  ): Promise<boolean> {
    if (!name.trim() || !grade.trim() || classPending.current) return false;
    classPending.current = true;
    const version = selectionVersion.current;
    setClassMutation({ ...idleMutation, pending: true });
    try {
      const created = await createClass(
        name.trim(),
        grade.trim(),
        progressPlan,
      );
      // 내 반은 맨 위(D-132 ⑷) — 새로 고친 목록과 같은 자리. 담당이 없으면(관리자 아님) 지금처럼 끝에 붙는다.
      setClasses((prev) => mineFirst([...prev, created], (c) => c.owner));
      // A delayed creation must not undo a class the user selected meanwhile.
      if (version === selectionVersion.current) {
        selectClass(created.id);
        replaceScreenQuery({ classId: created.id, studentId: null });
      }
      setClassMutation({
        ...idleMutation,
        success: `${created.name} 반을 추가했습니다.`,
      });
      return true;
    } catch (error) {
      setClassMutation({
        ...idleMutation,
        // 서버가 거절했으면 그 문구를 그대로 잇는다(계획 칸 422 · 반 칸 400 — 가르지 않는다).
        error:
          error instanceof ServerError
            ? `반을 추가하지 못했습니다. ${error.message}`
            : "반을 추가하지 못했습니다. 입력 내용을 확인하고 다시 시도해 주세요.",
      });
      return false;
    } finally {
      classPending.current = false;
    }
  }

  return {
    classes,
    students,
    selectedClassId,
    selectedClass: classes.find((row) => row.id === selectedClassId),
    currentUnitId,
    status,
    error,
    studentsStatus,
    progressStatus,
    classMutation,
    studentMutation: studentMutations[selectedClassId] ?? idleMutation,
    progressMutation: progressMutations[selectedClassId] ?? idleMutation,
    selectClass,
    retryClasses,
    retryDetails: resetDetails,
    advance: () => saveProgress(),
    selectUnit: (unitId: string) => saveProgress(unitId),
    addStudent,
    addClass,
  };
}
