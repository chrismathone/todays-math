"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { ClassEntity, StudentEntity } from "@/contracts/class.contract";
import type { TestType } from "@/contracts/common.contract";
// 값이지만 **zod 를 안 물고 오는 최소 모듈**이라 정적으로 가져와도 된다 (아래 C-1 주석 참조).
import {
  DEFAULT_DIFFICULTY_RATIO,
  DIFFICULTY_LADDER,
  fitDifficultyRatio,
  type DifficultyRatio,
} from "@/contracts/difficulty";
import type { UnitEntity } from "@/contracts/unit.contract";

/**
 * 계약 스키마는 **런타임 값으로 정적 import 하지 않는다** (성능 수리 C-1).
 *
 * 이 훅은 5개 계약 모듈에서 6개 스키마를 정적으로 끌어와 출제 설정 화면 초기
 * 번들에 zod + 계약 모듈(279KB)을 얹고 있었다. 여기 검증은 전부 `fetch` 응답
 * (또는 사용자 제출) 이후라 그 시점에 불러도 늦지 않다. 검증은 그대로 남는다.
 */
const classContract = () => import("@/contracts/class.contract");
const commonContract = () => import("@/contracts/common.contract");
const problemContract = () => import("@/contracts/problem.contract");
const testContract = () => import("@/contracts/test.contract");
const unitContract = () => import("@/contracts/unit.contract");

export type InsufficientState = {
  unitId: string;
  available: number;
  required: number;
  message: string;
};

type Props = {
  initialClassId?: string;
  initialStudentId?: string;
};

function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function applyClass(
  cls: ClassEntity | undefined,
  setProblemCount: (n: number) => void,
  setRatio: (r: DifficultyRatio) => void,
) {
  if (!cls) return;
  setProblemCount(cls.defaultProblemCount);
  setRatio(cls.difficultyRatio);
}

export function useGenerateSetup({ initialClassId, initialStudentId }: Props) {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [units, setUnits] = useState<UnitEntity[]>([]);
  const [students, setStudents] = useState<StudentEntity[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [testType, setTestType] = useState<TestType>("daily");
  const [testDate, setTestDate] = useState(todayIso);
  const [problemCount, setProblemCount] = useState(8);
  const [difficultyRatio, setDifficultyRatio] = useState<DifficultyRatio>(
    DEFAULT_DIFFICULTY_RATIO,
  );
  const [rangeStartUnitId, setRangeStartUnitId] = useState("");
  const [rangeEndUnitId, setRangeEndUnitId] = useState("");
  /** 「고치기」를 눌러 3열 피커를 펼쳤는가 (S-04 C안 — 평소에는 한 줄이다). */
  const [rangeEditing, setRangeEditing] = useState(false);
  /**
   * 기본 범위 조회의 **결과와 그것이 어느 반/학생의 것인지**를 같이 들고 있는다.
   *
   * 🔴 적대적 리뷰(2026-08-19): 예전에는 `rangeUnknown` 불리언 하나였다. 그래서
   *    ⑴ **아직 안 온 것**과 ⑵ **진도가 없는 것**과 ⑶ **조회가 실패한 것**이
   *    같은 문장(「진도 기록이 없어 범위를 정하지 못했습니다」)으로 나갔다.
   *    느린 회선에서는 진도가 멀쩡한데 원장이 진도를 기록하러 가고, 500 이 나도
   *    진도 탓을 한다. **손상은 「모른다」로 말해야 한다.**
   *
   * 키를 같이 두는 이유: 로딩 여부를 **파생**시키려는 것이다(`키가 다르면 아직
   * 안 온 것`). 효과 안에서 `setLoading(true)` 를 동기로 부르면 연쇄 렌더가 되고
   * ESLint 가 막는다 — 실제로 한 번 막혔다.
   */
  const [rangeState, setRangeState] = useState<{
    key: string;
    status: "ok" | "none" | "error";
  } | null>(null);
  const [insufficient, setInsufficient] = useState<InsufficientState | null>(
    null,
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /**
   * **AI 생성**이 돌고 있는가 — `busy`(무엇이든 돌고 있다)와 다른 물음이다.
   *
   * 진행 표시는 「무엇이 돌고 있나」를 가리켜야 한다. `busy` 로 그리면 「출제」를
   * 눌러도 «AI 문제 생성 중» 이 뜬다 — 원장님이 안 시킨 일을 하고 있다고 읽는다.
   * 시험의 «음성 대조»(출제에는 안 뜬다)가 이 구분을 지킨다.
   */
  const [aiBusy, setAiBusy] = useState(false);
  const [generatedPendingCount, setGeneratedPendingCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/classes?page=1&pageSize=100"),
      fetch("/api/units"),
    ])
      .then(async ([classRes, unitRes]) => {
        if (!classRes.ok || !unitRes.ok) {
          throw new Error("목록을 불러오지 못했습니다");
        }
        const [{ classListResponseSchema }, { unitListResponseSchema }] =
          await Promise.all([classContract(), unitContract()]);
        const classBody = classListResponseSchema.parse(await classRes.json());
        const unitBody = unitListResponseSchema.parse(await unitRes.json());
        if (cancelled) return;
        setClasses(classBody.data);
        setUnits(unitBody.data);
        const nextClass =
          classBody.data.find((item) => item.id === initialClassId) ??
          classBody.data[0];
        if (nextClass) {
          setClassId(nextClass.id);
          applyClass(nextClass, setProblemCount, setDifficultyRatio);
        }
        // ⚠️ 여기서 범위 기본값을 **정하지 않는다.** 예전에는 `units[0]`(초1 첫
        //    소단원) ~ `units[마지막]`(미적분2 마지막)을 넣었다 — 그게 전 교육과정
        //    735단원짜리 확인테스트를 오류 없이 만들던 자리다. 범위는 진도가 정하고,
        //    그 판정은 서버(`/api/tests/default-range`)에 한 벌만 둔다.
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setLoadError("반 목록을 불러오지 못했습니다");
      });
    return () => {
      cancelled = true;
    };
  }, [initialClassId]);

  useEffect(() => {
    if (!classId) return;
    let cancelled = false;
    fetch(`/api/students?classId=${classId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("fail");
        const { studentListResponseSchema } = await classContract();
        return studentListResponseSchema.parse(await res.json());
      })
      .then((body) => {
        if (cancelled) return;
        setStudents(body.data);
        const keep =
          initialStudentId &&
          body.data.some((item) => item.id === initialStudentId)
            ? initialStudentId
            : "";
        setStudentId(keep);
      })
      .catch(() => {
        if (!cancelled) setStudents([]);
      });
    return () => {
      cancelled = true;
    };
  }, [classId, initialStudentId]);

  /**
   * 확인테스트 기본 범위 — **진도가 정한다**(원장님 확정 2026-08-19).
   * 반·학생이 바뀌면 다시 묻는다. 원장이 「고치기」로 고른 값은 그때 함께 버려진다 —
   * 다른 반의 범위를 물려받는 것이 더 위험하다.
   */
  useEffect(() => {
    if (!classId) return;
    let cancelled = false;
    const key = `${classId}:${studentId}`;
    const query = new URLSearchParams({ classId });
    if (studentId) query.set("studentId", studentId);
    fetch(`/api/tests/default-range?${query.toString()}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("fail");
        const { defaultReviewRangeResponseSchema } = await testContract();
        return defaultReviewRangeResponseSchema.parse(await res.json());
      })
      .then((body) => {
        if (cancelled) return;
        if (!body.data) {
          setRangeState({ key, status: "none" });
          setRangeStartUnitId("");
          setRangeEndUnitId("");
          return;
        }
        setRangeState({ key, status: "ok" });
        setRangeStartUnitId(body.data.rangeStartUnitId);
        setRangeEndUnitId(body.data.rangeEndUnitId);
      })
      .catch(() => {
        if (cancelled) return;
        setRangeState({ key, status: "error" });
        setRangeStartUnitId("");
        setRangeEndUnitId("");
      });
    return () => {
      cancelled = true;
    };
  }, [classId, studentId]);

  /** 지금 화면이 보고 있는 반/학생의 답이 아직 안 왔는가. */
  const rangeLoading = rangeState?.key !== `${classId}:${studentId}`;
  const rangeUnknown = !rangeLoading && rangeState?.status === "none";
  const rangeError = !rangeLoading && rangeState?.status === "error";

  const selectClass = useCallback(
    (nextId: string) => {
      setClassId(nextId);
      applyClass(
        classes.find((item) => item.id === nextId),
        setProblemCount,
        setDifficultyRatio,
      );
      setInsufficient(null);
      setSubmitError(null);
      // 반이 바뀌면 펼쳐 둔 범위 피커를 접는다. **효과가 아니라 여기서** 한다 —
      // 효과 안의 동기 setState 는 연쇄 렌더가 되고 ESLint 가 막는다.
      setRangeEditing(false);
    },
    [classes],
  );

  /**
   * 범위를 **한 번에** 바꾼다. 시작·끝을 따로 setState 하면 그 사이 한 렌더 동안
   * 거꾸로 된 범위(시작 > 끝)가 실재해, 그때 요약 줄이 엉뚱한 것을 그린다.
   */
  const setRange = useCallback((start: string, end: string) => {
    setRangeStartUnitId(start);
    setRangeEndUnitId(end);
  }, []);

  /** 학생을 바꿔도 범위를 다시 묻는다 — 펼침은 같은 이유로 여기서 접는다. */
  const selectStudent = useCallback((nextId: string) => {
    setStudentId(nextId);
    setRangeEditing(false);
  }, []);

  const generate = useCallback(
    async (countOverride?: number) => {
      if (!classId) return;
      const count = countOverride ?? problemCount;
      const nextRatio =
        countOverride === undefined
          ? difficultyRatio
          : fitDifficultyRatio(difficultyRatio, count);
      if (countOverride !== undefined) {
        setProblemCount(countOverride);
        setDifficultyRatio(nextRatio);
      }
      // 범위가 아직 안 왔으면(반을 막 바꿨다) **이전 반의 값이 남아 있다** — 그대로
      // 보내면 다른 반의 범위로 출제된다. 단원 id 는 반과 무관하게 유효해서 서버도
      // 막지 않는다(적대적 리뷰 2026-08-19).
      if (
        testType === "review" &&
        (rangeLoading || !rangeStartUnitId || !rangeEndUnitId)
      ) {
        setInsufficient(null);
        setSubmitError(
          rangeLoading
            ? "범위를 불러오는 중입니다"
            : "진도 기록이 없어 범위를 정하지 못했습니다",
        );
        return;
      }
      if (
        DIFFICULTY_LADDER.reduce((sum, tier) => sum + nextRatio[tier], 0) !==
        count
      ) {
        setInsufficient(null);
        setSubmitError("난이도 배분의 합이 문항 수와 같아야 합니다");
        return;
      }
      setBusy(true);
      setSubmitError(null);
      // 새 출제 시도는 지난 AI 생성 집계도 지운다 — 안 지우면 다른 반·다른 단원으로
      // 옮겨 간 뒤에도 옛 「N문항을 생성했습니다」가 남는다(누적의 짝이다).
      setGeneratedPendingCount(0);
      // 새 시도를 시작하면 지난 부족 안내는 즉시 지운다. 안 지우면 다른 사유로
      // 재실패했을 때 옛 가용/필요 숫자와 「AI 생성」이 새 오류와 나란히 남아
      // 원장이 엉뚱한 버튼을 누른다.
      setInsufficient(null);
      try {
        const res = await fetch("/api/tests/generate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            classId,
            ...(studentId ? { studentId } : {}),
            testType,
            testDate,
            problemCount: count,
            difficultyRatio,
            ...(testType === "review"
              ? { rangeStartUnitId, rangeEndUnitId }
              : {}),
          }),
        });
        const json: unknown = await res.json();
        const [
          {
            insufficientProblemsErrorResponseSchema,
            testGenerateResponseSchema,
          },
          { errorResponseSchema },
        ] = await Promise.all([testContract(), commonContract()]);
        if (res.status === 422) {
          const parsed =
            insufficientProblemsErrorResponseSchema.safeParse(json);
          if (parsed.success) {
            setInsufficient({
              ...parsed.data.error.details,
              message: parsed.data.error.message,
            });
            return;
          }
        }
        if (!res.ok) {
          const parsed = errorResponseSchema.safeParse(json);
          setSubmitError(
            parsed.success ? parsed.data.error.message : "출제하지 못했습니다",
          );
          return;
        }
        const ok = testGenerateResponseSchema.parse(json);
        setInsufficient(null);
        router.push(`/tests/${ok.data.test.id}`);
      } catch {
        setSubmitError("출제하지 못했습니다");
      } finally {
        setBusy(false);
      }
    },
    [
      classId,
      studentId,
      testType,
      testDate,
      problemCount,
      difficultyRatio,
      rangeStartUnitId,
      rangeEndUnitId,
      rangeLoading,
      router,
    ],
  );

  const generateAiDrafts = useCallback(async () => {
    if (!insufficient) return;
    setBusy(true);
    setAiBusy(true);
    setSubmitError(null);
    try {
      const count = Math.min(
        10,
        Math.max(1, insufficient.required - insufficient.available),
      );
      const res = await fetch("/api/problems/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // ⚠️ 난이도가 「응용」으로 **박혀 있다.** 어느 갈래가 모자란지는 422 가 안 알려
        //    주기 때문이다 — `insufficientProblemsDetailSchema` 는 `{unitId, available,
        //    required}` 뿐이라 난이도 칸이 없다. 계약을 넓히는 일은 이 트랙 밖이라
        //    보고에 남겼다. 넓히기 전에는 여기서 지어내면 안 된다.
        body: JSON.stringify({
          unitId: insufficient.unitId,
          difficulty: "응용",
          count,
        }),
      });
      const json: unknown = await res.json();
      if (!res.ok) {
        // 🔴 예전에는 여기서 **서버가 보낸 사유를 통째로 버렸다.** 라우트는 일부러
        //    행동 가능한 말을 보낸다 — 「AI 설정이 없습니다 — DEEPSEEK_API_KEY 를…」·
        //    「길이 한도에 걸렸습니다 — 개수를 줄이거나…」. 그걸 「AI 문제 생성에
        //    실패했습니다」로 뭉개면 원장님은 무엇을 고쳐야 하는지 알 길이 없다.
        const { errorResponseSchema } = await commonContract();
        const parsed = errorResponseSchema.safeParse(json);
        setSubmitError(
          parsed.success
            ? parsed.data.error.message
            : "AI 문제 생성에 실패했습니다",
        );
        return;
      }
      const { problemGenerateResponseSchema } = await problemContract();
      const created = problemGenerateResponseSchema.parse(json);
      // 두 번 눌렀으면 **합쳐서** 센다. 마지막 회차만 적으면 원장님이 만든 것보다
      // 적게 보이고, 「이만큼밖에 안 됐나」로 읽는다. 초기화는 새 출제 시도가 한다.
      setGeneratedPendingCount((before) => before + created.data.length);
    } catch {
      setSubmitError("AI 문제 생성에 실패했습니다");
    } finally {
      setAiBusy(false);
      setBusy(false);
    }
  }, [insufficient]);

  const reduceCount = useCallback(() => {
    if (!insufficient || insufficient.available < 1) return;
    void generate(insufficient.available);
  }, [generate, insufficient]);

  return {
    classes,
    units,
    students,
    ready,
    loadError,
    classId,
    studentId,
    testType,
    testDate,
    problemCount,
    difficultyRatio,
    rangeStartUnitId,
    rangeEndUnitId,
    rangeEditing,
    rangeLoading,
    rangeUnknown,
    rangeError,
    insufficient,
    generatedPendingCount,
    submitError,
    busy,
    aiBusy,
    setStudentId: selectStudent,
    setTestType,
    setTestDate,
    setProblemCount,
    setDifficultyRatio,
    setRange,
    setRangeEditing,
    selectClass,
    generate,
    generateAiDrafts,
    reduceCount,
  };
}
