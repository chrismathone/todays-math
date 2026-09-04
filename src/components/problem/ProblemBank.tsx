"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DIFFICULTY_LADDER } from "@/contracts/difficulty";

import { PROBLEM_CARD_WIDTH } from "@/components/print/tokens";
import { Button } from "@/components/ui/Button";
import { ProblemGridSkeleton } from "@/components/ui/PageSkeletons";
import type {
  Difficulty,
  ProblemSource,
  ReviewStatus,
} from "@/contracts/common.contract";
import type {
  ProblemEntity,
  ProblemFormatFilter,
  ProblemType,
} from "@/contracts/problem.contract";
import { classifyFormat } from "@/lib/problem/provenance";
import {
  addToBasket,
  clearBasket,
  loadBasket,
  makeTestFromBasket,
  removeFromBasket,
  type BasketState,
} from "@/lib/problem/basketApi";

import { BasketBar } from "./BasketBar";
import { BasketPanel } from "./BasketPanel";
import type { UnitEntity } from "@/contracts/unit.contract";
import {
  loadProblems,
  PROBLEM_PAGE_SIZE,
  updateReviewStatus,
  type ProblemListFilters,
} from "@/lib/problem/problemApi";
import {
  compareProblemsForBank,
  problemOrderFields,
} from "@/lib/problem/problemOrder";
import { loadUnits } from "@/lib/units/unitApi";

import { useDebounced } from "@/hooks/useDebounced";

import { UnitRangePicker } from "@/components/progress/UnitRangePicker";
import { describeRange } from "@/components/test/rangeSummary";

import {
  FieldButton,
  FieldSelect,
  FieldText,
  FIELD_SELECT_WIDTH,
} from "./FieldSelect";
import {
  PROBLEM_FILTER_OPTIONS,
  SOURCE_LABEL,
  SOURCE_OPTIONS,
  splitProblemFilterValue,
} from "./labels";
import { ProblemCard } from "./ProblemCardLazy";
import { ProblemGenerateForm, ProblemRegisterForm } from "./ProblemPanelsLazy";

/**
 * 위쪽 액션 패널 — 「변형」은 **여기 없다**(원장님 확정 2026-08-19).
 * 변형은 문제 카드 안에서 고르고 연다(`ProblemCard` → `ProblemTransformPanel`) —
 * 종전 드롭다운은 네이티브 select 라 수식을 못 그려 무엇을 고르는지 알 수 없었다.
 */
type Panel = "register" | "generate" | null;

/**
 * 목록 다단 배치 (2026-08-17 원장님 지시 "기본 2단, 창 크기 따라 3단 혹은 1단").
 *
 * 카드 **본문**은 인쇄 문항 열과 같은 폭으로 고정돼 있어(`PaperProblemView`) 넓은
 * 화면에서도 늘어나지 않는다 — 그래서 한 단으로 깔면 우측이 통째로 빈다. 폭을 늘리면
 * 줄바꿈이 지면과 갈라지므로(2026-08-17 "인쇄시와 동일한 뷰"), 폭은 그대로 두고
 * **카드를 여러 열로** 깐다.
 *
 * ⚠️ **트랙을 늘리지 않는다** (원장님 지시 2026-08-19: 「문제 공간은 고정시켜 …
 * 창 크기에 따라서 그냥 3열 4열 이렇게만 바뀌면 되고」). 종전에는 `minmax(…, 1fr)` 이라
 * 열이 남는 폭만큼 늘어났는데 **본문은 고정**이라 늘어난 만큼이 카드 오른쪽 **빈칸**이
 * 됐다 — 2단일 때 카드 600px 에 본문 364px, 오른쪽 190px 이 그냥 비었다.
 * 이제 트랙 폭이 카드 폭 그대로이고 남는 폭은 **열 수**로만 간다(`auto-fill`).
 *
 * `auto-fit` 이 아니라 `auto-fill` 인 이유: `auto-fit` 은 빈 트랙을 접는데, 폭이 고정이라
 * 접히든 말든 열 수는 같다. 필터 바와 **같은 관용구**를 써서 둘이 갈리지 않게 둔다.
 *
 * 창 크기 브레이크포인트를 박지 않는 이유: 실제로 남는 폭에 반응해야 사이드 여백·확대
 * 배율이 달라져도 맞는다. `min(100%, …)` 가 **너무 좁은 창 가드**다 — 남는 폭이 카드
 * 한 장보다 좁아지면 트랙이 100%로 내려가 1단이 된다(가로 스크롤 대신).
 *
 * `print:block` — 문제은행 화면을 그대로 인쇄할 때의 결과를 종전과 같게 둔다.
 * 시험지 인쇄는 이 화면이 아니라 `TestPrint` 가 그린다.
 */
const PROBLEM_GRID_STYLE = {
  gridTemplateColumns: `repeat(auto-fill, min(100%, ${PROBLEM_CARD_WIDTH}))`,
} as const;

/**
 * 필터 바 (2026-08-17 원장님 "필터 선택할때마다 크기 제각각인데 고정된 크기에서
 * 선택만 바뀌도록").
 *
 * 종전 `flex flex-wrap` 은 각 칸이 **내용만큼** 자랐다 — 네이티브 select 는 가장 긴
 * option 만큼 넓어지므로 소단원만 466px 로 벌어지고(실측), 선택을 바꾸면 자리가 흔들렸다.
 * 그리드로 바꿔 **모든 칸을 같은 고정 폭**으로 두고, 창이 좁아지면 열 수만 줄인다
 * (카드 다단과 같은 원칙 — 브레이크포인트 대신 남는 폭에 반응).
 *
 * `auto-fill` 인 이유: 학기 칸은 초등에서만 나타나 칸 수가 6↔7 로 변한다. `auto-fit`
 * 이면 빈 트랙이 접혀 남은 칸이 늘어나므로, 칸이 하나 생겼다 사라질 때 폭이 흔들린다.
 * `auto-fill` 은 트랙을 유지하므로 **칸 수가 변해도 폭이 그대로**다.
 */
const FILTER_GRID_STYLE = {
  gridTemplateColumns: `repeat(auto-fill, ${FIELD_SELECT_WIDTH})`,
} as const;

function matchesFilters(
  problem: ProblemEntity,
  filters: ProblemListFilters,
  unitById: Map<string, UnitEntity>,
): boolean {
  // 단원 범위(2026-08-19 원장님 지시) — 서버와 **같은 규칙**이어야 한다.
  // 서버는 `Unit.orderIndex` 구간으로 거르고 거꾸로 온 범위를 정렬한다(D-27).
  // 여기가 갈리면 등록·변형·승격 직후 「목록엔 남는데 새로고침하면 사라지는」 카드가 생긴다.
  if (filters.unitFrom || filters.unitTo) {
    const unit = unitById.get(problem.unitId);
    if (!unit) return false;
    const from = filters.unitFrom
      ? unitById.get(filters.unitFrom)?.orderIndex
      : undefined;
    const to = filters.unitTo
      ? unitById.get(filters.unitTo)?.orderIndex
      : undefined;
    const lo =
      from !== undefined && to !== undefined ? Math.min(from, to) : from;
    const hi = from !== undefined && to !== undefined ? Math.max(from, to) : to;
    if (lo !== undefined && unit.orderIndex < lo) return false;
    if (hi !== undefined && unit.orderIndex > hi) return false;
  }
  return (
    (!filters.difficulty || problem.difficulty === filters.difficulty) &&
    (!filters.problemType || problem.problemType === filters.problemType) &&
    // 형식(`[단]`·`[서]`) — 서버가 거른 것과 **같은 함수**를 부른다. 카드의 라벨도
    // 이 함수가 그린다(`provenanceBadges`) — 셋이 갈리면 「등록하자마자 목록에 있는데
    // 새로고침하면 사라지는」 카드가 생긴다.
    (!filters.format || classifyFormat(problem) === filters.format) &&
    (!filters.reviewStatus || problem.reviewStatus === filters.reviewStatus) &&
    (!filters.source || problem.source === filters.source)
  );
}

export function ProblemBank() {
  // 단원 **범위** — 시작·끝을 한 피커에서 두 번 눌러 고른다(원장님 지시 2026-08-19
  // 「문제은행도 다른거처럼 시작 클릭 끝 클릭으로」). 확인테스트와 **같은 부품**이다.
  // 종전 4개 드롭다운(학년·학기·중단원·소단원)은 한 단원만 고를 수 있어 「중2 1~3단원」
  // 같은 범위를 아예 물어볼 수 없었다.
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const [rangeEditing, setRangeEditing] = useState(false);
  const [difficulty, setDifficulty] = useState("");
  // 「유형」 칸 하나가 **두 축**을 고른다 (원장님 지시 2026-08-26) — 계산·개념·활용은
  // `problemType`, 단답형·서술형은 화면 라벨 `[단]`·[서] 와 같은 형식 축이다.
  // 값을 그대로 들고 있다가 보낼 때만 가른다 — `<select>` 는 값이 하나여야 한다.
  const [problemFilter, setProblemFilter] = useState("");
  const [reviewStatus, setReviewStatus] = useState("");
  // 출처 필터(2026-08-19 원장님 지시) — AI 생성물만 골라 검수하려면 이 칸이 필요하다.
  // 그 전에는 대기 271건(기출 144 · 변형 107 · AI 20)이 한 덩어리로 섞여 나왔다.
  const [source, setSource] = useState("");
  // 본문 검색 — 타자 중에는 안 나간다(서버 실측 277~289ms · Seq Scan).
  // `query` 는 화면이 보는 값, `q` 는 서버로 나가는 값이다.
  const [query, setQuery] = useState("");
  const q = useDebounced(query, 400);
  const [hasFigure, setHasFigure] = useState(false);
  const [hasSolution, setHasSolution] = useState(false);
  const [hasAnswer, setHasAnswer] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [problems, setProblems] = useState<ProblemEntity[]>([]);
  const [units, setUnits] = useState<UnitEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unitsError, setUnitsError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);

  // ── 담기 바구니 (원장님 확정 2026-09-04) ──────────────────────────
  //
  // 🔴 **분포를 여기서 세지 않는다.** 서버가 센 것을 그대로 들고 있다 — 화면이
  //    다시 세면 「이 쪽에 안 보이는 담긴 문항」이 분포에서 빠져 바가 거짓말을 한다.
  const router = useRouter();
  const [basket, setBasket] = useState<BasketState | null>(null);
  const [basketBusy, setBasketBusy] = useState(false);
  const [basketOpen, setBasketOpen] = useState(false);

  // 단원은 **범위 하나**로만 좁힌다(시작·끝 소단원 id). 서버가 `orderIndex` 로 푼다.
  const filters: ProblemListFilters = useMemo(
    () => ({
      unitFrom: rangeStart ?? undefined,
      unitTo: rangeEnd ?? undefined,
      difficulty: (difficulty || undefined) as Difficulty | undefined,
      problemType: splitProblemFilterValue(problemFilter).problemType as
        ProblemType | undefined,
      format: splitProblemFilterValue(problemFilter).format as
        ProblemFormatFilter | undefined,
      reviewStatus: (reviewStatus || undefined) as ReviewStatus | undefined,
      source: (source || undefined) as ProblemSource | undefined,
      q: q.trim() || undefined,
      hasFigure: hasFigure || undefined,
      hasSolution: hasSolution || undefined,
      hasAnswer: hasAnswer || undefined,
    }),
    [
      rangeStart,
      rangeEnd,
      difficulty,
      problemFilter,
      reviewStatus,
      source,
      q,
      hasFigure,
      hasSolution,
      hasAnswer,
    ],
  );

  useEffect(() => {
    let cancelled = false;
    loadProblems(filters, page)
      .then((body) => {
        if (cancelled) return;
        setProblems(body.data);
        setTotal(body.meta.total);
        setError(null);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("목록을 불러오지 못했습니다");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters, page]);

  useEffect(() => {
    let cancelled = false;
    loadUnits()
      .then((body) => {
        if (cancelled) return;
        setUnits(body.data);
        setUnitsError(null);
        setUnitsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setUnitsError("단원 목록을 불러오지 못했습니다");
        setUnitsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 바구니는 **계정에 저장**된다 — 다른 기기에서 담은 것이 여기 그대로 있어야 한다.
  useEffect(() => {
    let cancelled = false;
    loadBasket()
      .then((next) => {
        if (!cancelled) setBasket(next);
      })
      // 🔴 바구니를 못 읽어도 문제은행은 써야 한다. 이 실패로 목록을 막지 않는다 —
      //    다만 조용히 넘기지도 않는다(바가 없는 것과 «못 읽은 것»은 다른 말이다).
      .catch((e: unknown) => {
        if (!cancelled)
          setError(
            e instanceof Error ? e.message : "바구니를 불러오지 못했습니다",
          );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** 담기·빼기·비우기·시험지 만들기가 **모두 같은 자물쇠**를 쓴다 — 왕복 중 두 번 눌러
   *  같은 요청이 두 벌 나가는 것을 막는다. */
  const runBasket = useCallback(
    async (op: () => Promise<BasketState>, label: string) => {
      setBasketBusy(true);
      try {
        setBasket(await op());
      } catch (e) {
        setError(e instanceof Error ? e.message : `${label}에 실패했습니다`);
      } finally {
        setBasketBusy(false);
      }
    },
    [],
  );

  // ⚠️ 카드는 `memo` 다 — 인라인 화살표로 넘기면 20장이 매번 다시 그려진다.
  const toggleBasket = useCallback(
    (id: string, picked: boolean) => {
      void runBasket(
        () => (picked ? removeFromBasket(id) : addToBasket(id)),
        picked ? "빼기" : "담기",
      );
    },
    [runBasket],
  );

  /** 담긴 문항 id — 카드마다 `includes` 로 훑으면 20장 × 담긴 수가 된다. */
  const pickedIds = useMemo(
    () => new Set((basket?.items ?? []).map((i) => i.problem.id)),
    [basket],
  );

  const defaultUnitId = rangeStart || units[0]?.id || "";
  const unitActionsDisabled = unitsLoading || units.length === 0;
  const totalPages = Math.max(1, Math.ceil(total / PROBLEM_PAGE_SIZE));

  const unitById = useMemo(
    () => new Map(units.map((unit) => [unit.id, unit])),
    [units],
  );
  /** 지금 범위를 한 줄과 막대로 — 확인테스트와 **같은 순수 함수**를 쓴다. */
  const rangeSummary = useMemo(
    () =>
      rangeStart && rangeEnd
        ? describeRange(units, rangeStart, rangeEnd)
        : null,
    [units, rangeStart, rangeEnd],
  );

  function startProblemReload() {
    setLoading(true);
    setError(null);
  }

  /** 필터가 바뀌면 항상 1페이지부터 다시 본다. */
  function resetToFirstPage() {
    startProblemReload();
    setPage(1);
  }

  function goToPage(next: number) {
    startProblemReload();
    setPage(next);
  }

  /**
   * 피커가 범위를 알려 오면 그대로 조회한다.
   *
   * ⚠️ **여기서 피커를 닫지 않는다.** 첫 클릭도 `onChange(id, id)` 로 온다 —
   *    「한 단원 범위」이자 「이제 끝을 고르세요」라는 뜻이다(피커는 시작==끝으로
   *    그 상태를 읽는다). 닫아 버리면 끝을 고를 자리가 사라져 **한 단원밖에 못 고른다.**
   *    확인테스트도 같은 이유로 열어 둔다 — 접는 것은 「접기」뿐이다.
   */
  function handleRangeChange(start: string, end: string) {
    resetToFirstPage();
    setRangeStart(start);
    setRangeEnd(end);
  }

  function clearRange() {
    resetToFirstPage();
    setRangeStart(null);
    setRangeEnd(null);
  }

  function toggle(next: Exclude<Panel, null>) {
    setPanel((current) => (current === next ? null : next));
  }

  const prepend = useCallback(
    (created: ProblemEntity[], label: string) => {
      const matching = created.filter((problem) =>
        matchesFilters(problem, filters, unitById),
      );
      // 목록 순서는 서버가 정한다(`PROBLEM_BANK_ORDER_BY`). 새로 만든 문항을 **맨 위에**
      // 얹으면 그 순간 화면이 서버와 다른 순서를 갖는다 — 옛 정렬(`createdAt desc`)에서는
      // 맨 위가 곧 제자리였지만, 이제는 코드가 자리를 정한다(원장님 지시 2026-08-26).
      // 그래서 **같은 규칙**으로 제자리에 끼운다.
      setProblems((current) =>
        [...matching, ...current].sort((a, b) =>
          compareProblemsForBank(
            problemOrderFields(a, unitById.get(a.unitId)),
            problemOrderFields(b, unitById.get(b.unitId)),
          ),
        ),
      );
      setTotal((current) => current + matching.length);
      setNotice(
        matching.length === created.length
          ? `${created.length}건 ${label}`
          : `${created.length}건 ${label} — 현재 필터에 ${matching.length}건만 보입니다`,
      );
      setPanel(null);
      setError(null);
    },
    [filters, unitById],
  );

  /**
   * 카드에서 변형 채택분이 저장되면 목록에 얹는다 — 등록·생성과 **같은 `prepend`** 를 쓴다.
   *
   * ⚠️ `useCallback` 이어야 한다 — `ProblemCard` 는 `memo` 라, 인라인 화살표로 넘기면
   * 카드 20장이 렌더마다 전부 다시 그려진다(카드마다 KaTeX 조판이 붙는다).
   *
   * 그래서 `prepend` 도 `useCallback` 이다 — 그것이 렌더마다 새로 만들어지면
   * 이 콜백도 같이 새로 만들어져 memo 가 죽는다.
   */
  const handleTransformAdopted = useCallback(
    (created: ProblemEntity[]) => prepend(created, "변형"),
    [prepend],
  );

  /**
   * 카드에서 승인·반려를 누르면 서버에 알리고 목록을 맞춘다 (D-22 — 사람이 승격한다).
   *
   * ⚠️ **바뀐 문항이 현재 필터를 벗어나면 목록에서 뺀다.** 「상태=대기」로 보는 중에
   *    승인하면 그 카드는 더 이상 그 목록의 것이 아니다. 그냥 두면 화면과 필터가
   *    갈려서, 새로고침하는 순간 조용히 사라진다 — 그건 실패로 읽힌다.
   *    안내에도 **어느 문항인지**(문항 코드) 적는다. 카드가 사라지면 무엇이 사라진
   *    것인지 화면에 아무 흔적이 없기 때문이다.
   *
   * ⚠️ `useCallback` — `ProblemCard` 는 `memo` 다(카드마다 KaTeX 조판이 붙는다).
   */
  const handleReviewStatusChange = useCallback(
    async (id: string, next: ReviewStatus) => {
      const label = next === "approved" ? "승인" : "반려";
      try {
        const { data } = await updateReviewStatus(id, next);
        const stays = matchesFilters(data, filters, unitById);
        setProblems((current) =>
          stays
            ? current.map((p) => (p.id === id ? data : p))
            : current.filter((p) => p.id !== id),
        );
        if (!stays) setTotal((current) => Math.max(0, current - 1));
        setNotice(
          stays
            ? `${data.problemCode} ${label}`
            : `${data.problemCode} ${label} — 현재 필터에서 빠집니다`,
        );
        setError(null);
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "검수 상태를 바꾸지 못했습니다",
        );
      }
    },
    [filters, unitById],
  );

  return (
    <main className="px-[26px] py-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-[15px] font-black">문제은행</h1>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ink"
            disabled={unitActionsDisabled}
            onClick={() => toggle("register")}
          >
            등록
          </Button>
          <Button
            disabled={unitActionsDisabled}
            onClick={() => toggle("generate")}
          >
            생성
          </Button>
        </div>
      </div>

      <div
        className="mt-4 grid gap-3"
        style={FILTER_GRID_STYLE}
        data-filter-bar
      >
        {/*
          본문 검색 — 필터를 **대체하지 않고 겹쳐 쓰는** 물건이다.
          실측(`id-find-review.md`): 한 구절로 유일 특정은 29.5~33.0% 뿐이지만
          소단원 필터와 겹치면 **중앙 2행**(한 페이지 안)이 된다.
          17.4%(8,187행)는 옮겨 적을 한글 구절이 아예 없어 구조적으로 못 찾는다.
        */}
        <FieldText
          aria-label="검색 — 본문·문항번호·정답·해설·학교"
          label="검색"
          onChange={(event) => {
            resetToFirstPage();
            setQuery(event.target.value);
          }}
          placeholder="본문·문항번호·정답·해설"
          style={{ gridColumn: "span 2" }}
          value={query}
        />
        {/*
          단원 **범위** — 원장님 지시 2026-08-19 「난이도 왼쪽에서 누르면 범위 선택」.
          다른 필터와 **같은 규격의 칸**이다(`FieldButton`) — 값은 지금 범위, 누르면 펼친다.
          펼친 표는 이 그리드 칸에 안 들어가므로 **필터 바 아래**에 통째로 나온다.
        */}
        <FieldButton
          label="범위"
          value={rangeSummary ? rangeSummary.text : "전체"}
          aria-expanded={rangeEditing}
          disabled={unitActionsDisabled}
          onClick={() => setRangeEditing((current) => !current)}
        />
        <FieldSelect
          label="난이도"
          value={difficulty}
          onChange={(event) => {
            resetToFirstPage();
            setDifficulty(event.target.value);
          }}
        >
          <option value="">전체</option>
          {DIFFICULTY_LADDER.map((tier) => (
            <option key={tier} value={tier}>
              {tier}
            </option>
          ))}
        </FieldSelect>
        {/*
          유형 — 「어떻게 푸나」(계산·개념·활용)와 「어떻게 답을 내나」(단답형·서술형)가
          한 칸에 있다. 원장님이 화면에서 보는 것이 라벨 `[단]`·`[서]` 라 **그 라벨로**
          거를 수 있어야 한다는 지시(2026-08-26)를 그대로 따른 것이다.
          어느 값이 어느 축인지는 `labels.ts` 가 정한다 — 여기서 문자열을 다시 자르지 않는다.
        */}
        <FieldSelect
          label="유형"
          value={problemFilter}
          onChange={(event) => {
            resetToFirstPage();
            setProblemFilter(event.target.value);
          }}
        >
          <option value="">전체</option>
          {PROBLEM_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </FieldSelect>
        <FieldSelect
          label="상태"
          value={reviewStatus}
          onChange={(event) => {
            resetToFirstPage();
            setReviewStatus(event.target.value);
          }}
        >
          <option value="">전체</option>
          <option value="pending">대기</option>
          <option value="approved">승인</option>
          <option value="rejected">반려</option>
        </FieldSelect>
        {/*
          출처 — 원장님 지시 2026-08-19. AI 생성물만 골라 검수하려면 이 칸이 있어야
          한다. 이름표는 `SOURCE_LABEL` 한 곳에서 온다(카드와 갈리지 않게).
        */}
        <FieldSelect
          label="출처"
          onChange={(event) => {
            resetToFirstPage();
            setSource(event.target.value);
          }}
          value={source}
        >
          <option value="">전체</option>
          {SOURCE_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {SOURCE_LABEL[value]}
            </option>
          ))}
        </FieldSelect>
        {/*
          「자료」 토글 셋 — 그림 · 해설 · 정답 (원장님 지시 2026-08-19).

          만들기 전에 실측으로 셋 다 뜻이 있는지 확인했다 (DB 47,152건):
            그림  9,448 (20.0%) · 해설 13,909 (29.5%) · 정답 45,041 (95.5%)

          ⚠️ `answer` 는 **빈 값이 0건**이라 「비어 있지 않은가」로 만들면 100% 를
             통과시켜 아무것도 안 거른다. 실제 자리표시자는 `(정답 없음)` 2,111건이다.

          ⚠️ 묶음은 `fieldset`/`legend` 로 짠다. 낱개 이름은 「그림」 한 글자뿐이라
             그것만으로는 무엇을 거르는지 모른다 — 묶음 이름이 그 뜻을 진다.
             (예전에는 제목을 `aria-hidden` 으로 숨겼는데, 그러면 화면 낭독기에
              묶음 이름이 아예 없다.)

          ⚠️ D-30 — 손가락 커서는 실제로 누르는 것(체크박스와 그 label)에만 준다.
             묶음 상자 자체에는 주지 않는다.
        */}
        <div
          aria-labelledby="filter-assets-label"
          className="flex min-w-0 flex-col gap-1"
          role="group"
          style={{ gridColumn: "span 2" }}
        >
          <span
            className="text-[10.5px] font-black tracking-[1.5px] text-text-2"
            id="filter-assets-label"
          >
            자료
          </span>
          <div className="flex h-11 items-center gap-4 border border-control bg-white px-3">
            {(
              [
                ["그림", hasFigure, setHasFigure],
                ["해설", hasSolution, setHasSolution],
                ["정답", hasAnswer, setHasAnswer],
              ] as const
            ).map(([label, checked, setChecked]) => (
              <label
                className="flex cursor-pointer items-center gap-1.5"
                key={label}
              >
                <input
                  checked={checked}
                  className="h-4 w-4 cursor-pointer accent-[var(--blue)]"
                  onChange={(event) => {
                    resetToFirstPage();
                    setChecked(event.target.checked);
                  }}
                  type="checkbox"
                />
                <span className="whitespace-nowrap text-[12.5px] text-ink">
                  {label}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/*
        펼친 범위 표 — 필터 바 **아래**에 통째로 놓는다. 3열 표라 그리드 칸
        (12rem 고정)에는 못 들어간다. 접혀 있을 때는 아무것도 안 그린다.
      */}
      {rangeEditing ? (
        <div className="mt-3" data-range-panel>
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-[12.5px] font-black text-ink">
              {rangeSummary ? rangeSummary.text : "시작 소단원을 고르세요"}
            </span>
            {rangeStart ? (
              <button
                type="button"
                onClick={clearRange}
                className="cursor-pointer text-[12.5px] font-bold text-text-3 underline-offset-4 hover:underline"
              >
                전체로
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setRangeEditing(false)}
              className="ml-auto cursor-pointer text-[12.5px] font-bold text-g-blue underline-offset-4 hover:underline"
            >
              접기
            </button>
          </div>
          {rangeSummary ? (
            <>
              {/* 막대는 라벨이 말하는 것을 그림으로 되풀이할 뿐이라 보조기기에서는 숨긴다. */}
              <div aria-hidden className="mt-1 h-[6px] w-full bg-seg-empty">
                <div
                  className="h-full bg-g-blue"
                  style={{
                    marginLeft: `${rangeSummary.offsetPct}%`,
                    width: `${rangeSummary.widthPct}%`,
                  }}
                />
              </div>
              <span className="text-[10.5px] font-bold tracking-normal text-text-3">
                {rangeSummary.label}
              </span>
            </>
          ) : null}
          <div className="mt-2">
            <UnitRangePicker
              units={units}
              startUnitId={rangeStart}
              endUnitId={rangeEnd}
              onChange={handleRangeChange}
            />
          </div>
        </div>
      ) : null}

      {panel === "register" ? (
        <ProblemRegisterForm
          units={units}
          defaultUnitId={defaultUnitId}
          onCreated={(_count, created) => prepend(created, "등록")}
          onError={setError}
        />
      ) : null}
      {panel === "generate" ? (
        <ProblemGenerateForm
          units={units}
          defaultUnitId={defaultUnitId}
          onCreated={(_count, created) => prepend(created, "생성")}
          onError={setError}
        />
      ) : null}

      {notice ? (
        <p className="mt-4 text-[12.5px] font-bold text-ink">{notice}</p>
      ) : null}
      {error ? (
        <p className="mt-4 text-[12.5px] font-bold text-g-red-text">{error}</p>
      ) : null}
      {unitsError ? (
        <p className="mt-4 text-[12.5px] font-bold text-g-red-text">
          {unitsError}
        </p>
      ) : null}
      {!loading && !error ? (
        <PaginationRow
          page={page}
          totalPages={totalPages}
          total={total}
          onMove={goToPage}
        />
      ) : null}

      <section
        className="mt-4 grid gap-6 print:block"
        style={PROBLEM_GRID_STYLE}
        data-problem-grid
      >
        {!loading && !error && problems.length === 0 ? (
          <p className="text-[12.5px] text-text-2">등록된 문제가 없습니다</p>
        ) : !loading && !error ? (
          problems.map((problem) => (
            <ProblemCard
              key={problem.id}
              problem={problem}
              onTransformAdopted={handleTransformAdopted}
              onReviewStatusChange={handleReviewStatusChange}
              basket={{
                picked: pickedIds.has(problem.id),
                busy: basketBusy,
                onToggle: toggleBasket,
              }}
            />
          ))
        ) : null}
      </section>

      {loading ? <ProblemGridSkeleton /> : null}

      {/* 🔴 **담기 전에는 바가 아예 없다** (Wire ①, 원장님 확정). 담는 순간 나타나고
          필터를 바꿔도 쪽을 넘겨도 따라다닌다. 바 높이만큼 아래 여백을 주어야
          마지막 카드가 가리지 않는다 — 그 여백도 담긴 것이 있을 때만 준다. */}
      {basket && basket.total > 0 ? (
        <>
          <div
            aria-hidden
            style={{ height: basketOpen ? "22rem" : "5rem" }}
            className="print:hidden"
          />
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-divider bg-surface shadow-[0_-2px_12px_rgba(0,0,0,0.08)] print:hidden">
            {basketOpen ? (
              <BasketPanel
                items={basket.items}
                busy={basketBusy}
                onRemove={(id) =>
                  void runBasket(() => removeFromBasket(id), "빼기")
                }
                onClear={() => void runBasket(() => clearBasket(), "비우기")}
                onClose={() => setBasketOpen(false)}
                onMakeTest={(classId, testDate) => {
                  setBasketBusy(true);
                  void makeTestFromBasket({ classId, testDate })
                    .then((made) => {
                      // 시험지가 되면 바구니는 서버에서 비워진다 — 화면도 그렇게 만든다.
                      setBasket({
                        items: [],
                        spread: basket.spread,
                        unknown: 0,
                        total: 0,
                      });
                      setBasketOpen(false);
                      setNotice(
                        `${made.problemCount}문항으로 시험지를 만들었습니다`,
                      );
                      router.push(`/tests/${made.testId}`);
                    })
                    .catch((e: unknown) =>
                      setError(
                        e instanceof Error
                          ? e.message
                          : "시험지를 만들지 못했습니다",
                      ),
                    )
                    .finally(() => setBasketBusy(false));
                }}
              />
            ) : null}
            <BasketBar
              total={basket.total}
              spread={basket.spread}
              unknown={basket.unknown}
              busy={basketBusy}
              onOpenList={() => setBasketOpen((v) => !v)}
              onMakeTest={() => setBasketOpen(true)}
            />
          </div>
        </>
      ) : null}

      {!loading && !error && problems.length > 0 ? (
        <PaginationRow
          page={page}
          totalPages={totalPages}
          total={total}
          onMove={goToPage}
        />
      ) : null}
    </main>
  );
}

type PaginationRowProps = {
  page: number;
  totalPages: number;
  total: number;
  onMove: (page: number) => void;
};

function PaginationRow({
  page,
  totalPages,
  total,
  onMove,
}: PaginationRowProps) {
  return (
    <nav
      aria-label="페이지"
      className="mt-4 flex flex-wrap items-center justify-between gap-3"
    >
      <span className="text-[12.5px] text-text-2">
        {`총 ${total.toLocaleString("ko-KR")}문제`}
      </span>
      <span className="flex items-center gap-3">
        <Button
          variant="secondary"
          disabled={page <= 1}
          onClick={() => onMove(page - 1)}
        >
          이전
        </Button>
        <span className="text-[12.5px] font-bold text-ink">
          {`${page} / ${totalPages} 페이지`}
        </span>
        <Button
          variant="secondary"
          disabled={page >= totalPages}
          onClick={() => onMove(page + 1)}
        >
          다음
        </Button>
      </span>
    </nav>
  );
}
