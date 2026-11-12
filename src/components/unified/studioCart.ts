import { questionIdentity } from "@/lib/problem/questionSelectionClient";
import { useEffect, useEffectEvent, useState } from "react";
import { studioPageKey, type StudioOrderedPage } from "./studioPageOrder";
import type { StudioCrop } from "./studioHelpers";
import type { StudioProblem } from "./types";

/**
 * 담은 문항 장부 — 원장님 2026-09-21 «담은걸 확인하거나 빼거나 어떤걸 담았는지 체크할 수 있는기능이
 * 없는듯» → 트랙 41 안 D 확정(«추천대로»), 트랙 44 구현.
 *
 * 🔴 **원천은 시험지의 담은 목록(`UnifiedWorkspace` 의 `selected`) 하나다.** 전에는 작업실이
 *    제 안의 `crop.added` 로 «담음»을 셌다. 작업실이 시험지에 대해 받는 것이 개수와 `onAdd` 뿐이라
 *    ④·문제은행에서 빼도, 새 시험지를 열어도, 검수 완료만 눌러도 «담음»이 시험지와 갈렸다
 *    (트랙 41 어긋남 1~4). 작업실의 «담음»·«N문항 담기»·«M문항 담음»·«담은 문항» 목록은
 *    전부 이 파일의 함수로 `selected` 에서 센다. 작업실 안에 두 번째 장부를 다시 만들지 말 것.
 *
 * «고친 뒤 반영 전»은 **판 번호**(`StudioCrop.revision`)로 가른다. 담을 때 시험지에 작업실 판의
 * 스냅숏이 통째로 들어가므로(`studioProblem` 의 `studioCrop`) 두 판 번호를 견주면 된다.
 * 판 번호는 내용을 바꾸는 고침만 올린다 — 검수 완료는 상태라 올리지 않는다(`studioCropEdit.ts`).
 */

/** 이 시험지에서 뺀 문항과 뺀 자리 — «다시 담기»가 그 자리로 되돌린다. */
export interface StudioCartRemoval {
  problem: StudioProblem;
  index: number;
  /** A reversible page exclusion, distinct from a teacher removing a question. */
  pageExcluded?: boolean;
}

/** Move excluded-page picks into saved removal memory; restore only those picks. */
export function reconcileStudioPageCart(
  picked: StudioProblem[],
  removed: StudioCartRemoval[],
  order: readonly StudioOrderedPage[],
) {
  const pages = new Map(order.map((page) => [studioPageKey(page), page.out]));
  const pageOut = (problem: StudioProblem) =>
    problem.studioCrop
      ? pages.get(studioPageKey(problem.studioCrop))
      : undefined;
  const hidden = removed.filter((item) => item.pageExcluded);
  const original = [...picked];
  for (const item of [...hidden].sort((a, b) => a.index - b.index)) {
    if (!original.some((problem) => problem.id === item.problem.id))
      original.splice(Math.min(item.index, original.length), 0, item.problem);
  }
  const nextPicked: StudioProblem[] = [];
  const nextRemoved = removed.filter((item) => !item.pageExcluded);
  original.forEach((problem, index) => {
    const excluded = pageOut(problem);
    if (
      excluded === true ||
      (excluded === undefined &&
        hidden.some((item) => item.problem.id === problem.id))
    )
      nextRemoved.push({ problem, index, pageExcluded: true });
    else nextPicked.push(problem);
  });
  return {
    picked:
      nextPicked.length === picked.length &&
      nextPicked.every((p, i) => p === picked[i])
        ? picked
        : nextPicked,
    removed:
      nextRemoved.length === removed.length &&
      nextRemoved.every(
        (item, i) =>
          item.problem === removed[i].problem &&
          item.index === removed[i].index &&
          item.pageExcluded === removed[i].pageExcluded,
      )
        ? removed
        : nextRemoved,
  };
}

/**
 * - `picked` 시험지에 이 판 그대로 있다 — «담음»
 * - `stale` 시험지에 있는데 그 뒤에 고쳤다 — «반영 전»(긴 뜻 «담음 · 고친 내용 반영 전»)
 * - `removed` 이 시험지에서 뺐다 — «뺌». 한꺼번에 담기가 건너뛴다(원장님 확정 «안 넣는다»)
 * - `pending` 아직 안 담았다
 */
export type StudioCartState = "picked" | "stale" | "removed" | "pending";

export function studioCartState(
  crop: StudioCrop,
  picked: StudioProblem[],
  removed: StudioCartRemoval[],
): StudioCartState {
  const entry = picked.find((problem) => problem.id === crop.id);
  if (entry)
    return (entry.studioCrop?.revision ?? 0) === (crop.revision ?? 0)
      ? "picked"
      : "stale";
  return removed.some((item) => item.problem.id === crop.id)
    ? "removed"
    : "pending";
}

/**
 * 카드 표시·② 목록 배지가 같은 글자를 쓴다(모든 화면 일치).
 * «반영 전»은 줄인 글자다 — «담음 · 고친 내용 반영 전»이 길어 카드 바닥의 «반영» 단추를 둘째 줄로
 * 밀었다(원장님 2026-09-21 확정, 트랙 47). 긴 뜻은 `studioCartMeaning` 이 읽는 이름·마우스 올림에 싣는다.
 */
export function studioCartLabel(state: StudioCartState) {
  return state === "picked"
    ? "담음"
    : state === "stale"
      ? "반영 전"
      : state === "removed"
        ? "뺌"
        : null;
}

/** 표시의 긴 뜻 — 읽는 이름·마우스 올림. 목록 줄의 작은 글자도 이 뜻을 풀어 쓴다. */
export function studioCartMeaning(state: StudioCartState) {
  return state === "stale"
    ? "담음 · 고친 내용 반영 전"
    : studioCartLabel(state);
}

/**
 * 바닥 «담기» 단추 글자. 담을 것이 없을 때 두 경우를 가른다(원장님 2026-09-21 확정, 트랙 47).
 * - 이 원본 문항이 다 시험지에 있다(고친 뒤 반영 전 포함) — «모두 담았습니다»
 * - 이 원본에 뺀 것이 남았다 — «담을 문항 없음». 뺀 것은 한꺼번에 담기가 일부러 건너뛰니 «모두»가 틀린 말이다.
 *   뺀 것은 «담은 문항» 목록의 «다시 담기»로만 돌아온다.
 */
export function studioCartAddLabel(
  crops: StudioCrop[],
  picked: StudioProblem[],
  removed: StudioCartRemoval[],
) {
  const pending = studioCartPending(crops, picked, removed).length;
  if (pending) return `${pending}문항 담기`;
  if (!crops.length) return "시험지에 담기";
  return crops.some(
    (crop) => studioCartState(crop, picked, removed) === "removed",
  )
    ? "담을 문항 없음"
    : "모두 담았습니다";
}

/**
 * «N문항 담기»·«담고 내보내기»가 담을 것 — 안 담았고, 이 시험지에서 빼지도 않은 것.
 * 뺀 것을 여기 넣으면 파란 «담고 내보내기»가 조용히 되넣는다(트랙 41 공통 ②). 뺀 것은 목록 줄의
 * «다시 담기»로만 돌아온다. 고친 뒤 반영 전인 것도 여기 없다 — 그것은 «반영» 단추의 일이다.
 */
export function studioCartPending(
  crops: StudioCrop[],
  picked: StudioProblem[],
  removed: StudioCartRemoval[],
) {
  return crops.filter(
    (crop) => studioCartState(crop, picked, removed) === "pending",
  );
}

/** 담기·반영 — 같은 id 는 제자리에서 갈고 새것은 뒤에 붙인다. 출제 불가 문항은 거른다. */
export function addToCart(current: StudioProblem[], problems: StudioProblem[]) {
  const seen = new Set(current.map(questionIdentity));
  const eligible = problems.filter((problem) => {
    if (problem.eligible === false) return false;
    const key = questionIdentity(problem);
    if (current.some((row) => row.id === problem.id)) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const updates = new Map(eligible.map((problem) => [problem.id, problem]));
  return [
    ...current.map((problem) => updates.get(problem.id) ?? problem),
    ...eligible.filter(
      (problem) => !current.some((old) => old.id === problem.id),
    ),
  ];
}

/** 뺀 자리로 되돌린다. 목록이 그새 줄었으면 끝에. 이미 있으면 그대로. */
export function restoreToCart(
  current: StudioProblem[],
  problem: StudioProblem,
  index: number,
) {
  if (
    current.some((item) => questionIdentity(item) === questionIdentity(problem))
  )
    return current;
  const next = [...current];
  next.splice(Math.min(index, next.length), 0, problem);
  return next;
}

export function rememberRemoval(
  removed: StudioCartRemoval[],
  problem: StudioProblem,
  index: number,
) {
  return [
    ...removed.filter((item) => item.problem.id !== problem.id),
    { problem, index },
  ];
}

/**
 * 담은 판과 지금 판이 **해설·답**(과 그 부속 — AI 경고·검수 표시·판 번호)만 다른가.
 * 해설 생성이 끝난 문항을 시험지에 저절로 반영할지 가른다(원장님 2026-11-11 «해설은 자동 반영»).
 * 본문·보기·그림·형식이 바뀌었으면 거짓 — 그때는 지금처럼 «반영»을 눌러야 들어간다.
 */
export function onlySolutionChanged(cartCrop: StudioCrop, crop: StudioCrop) {
  const ignored = new Set([
    "answer",
    "solution",
    "aiWarnings",
    "difficulty",
    "reviewed",
    "revision",
    "added",
  ]);
  // 맨 위 칸만 뺀다 — 안쪽(예: 인식 결과 `ocr`)의 같은 이름 칸은 견준다.
  const strip = (value: StudioCrop) =>
    JSON.stringify(
      Object.fromEntries(
        Object.entries(value).filter(([key]) => !ignored.has(key)),
      ),
    );
  return strip(cartCrop) === strip(crop);
}

/**
 * «모두 빼기» — 담긴 것을 전부 빼고, 하나하나를 뺀 자리와 함께 기억한다. 목록에는 흐린 줄로 남아
 * «다시 담기»로 제자리에 돌릴 수 있다.
 */
export function removeAllFromCart(
  picked: StudioProblem[],
  removed: StudioCartRemoval[],
) {
  return {
    picked: [] as StudioProblem[],
    removed: picked.reduce(
      (memory, problem, index) => rememberRemoval(memory, problem, index),
      removed,
    ),
  };
}

/** 다시 담긴 것은 기억에서 지운다. 지울 것이 없으면 같은 배열을 돌려준다(상태를 흔들지 않게). */
export function forgetRemovals(removed: StudioCartRemoval[], ids: string[]) {
  return removed.some((item) => ids.includes(item.problem.id))
    ? removed.filter((item) => !ids.includes(item.problem.id))
    : removed;
}

/**
 * «담은 문항» 목록 줄 — 담긴 것은 시험지 차례대로(`order` 는 1부터), 뺀 것은 뺀 자리에 흐리게.
 * 차례 번호는 담긴 것만 센다 — 시험지의 차례 그대로.
 */
export function studioCartRows(
  picked: StudioProblem[],
  removed: StudioCartRemoval[],
) {
  const rows: { problem: StudioProblem; removed: boolean; order?: number }[] =
    picked.map((problem, index) => ({
      problem,
      removed: false,
      order: index + 1,
    }));
  [...removed]
    .filter((item) => !picked.some((problem) => problem.id === item.problem.id))
    .sort((a, b) => a.index - b.index)
    .forEach((item) =>
      rows.splice(Math.min(item.index, rows.length), 0, {
        problem: item.problem,
        removed: true,
      }),
    );
  return rows;
}

/**
 * 작업실이 쓰는 장부 손잡이. `picked` 를 넘기면(제품 — `UnifiedWorkspace`) 그 장부를 그대로 쓰고
 * 고치는 일은 부모에게 맡긴다. 안 넘기면(작업실만 띄우는 시험 하네스) 같은 규칙으로 제 안에 한 벌 둔다 —
 * 하네스가 담은 뒤의 작업실을 제품과 같게 보게 하려는 것이지 제품의 두 번째 장부가 아니다.
 */
const NO_PAGE_ORDER: readonly StudioOrderedPage[] = [];

export function useStudioCart({
  picked,
  removed,
  onAdd,
  onRemove,
  onRemoveAll,
  onRestore,
  pageOrder = NO_PAGE_ORDER,
  onPageOrderChange,
}: {
  picked?: StudioProblem[];
  removed?: StudioCartRemoval[];
  onAdd: (problems: StudioProblem[]) => void;
  onRemove?: (problem: StudioProblem) => void;
  /** «모두 빼기» — 시험지에 담긴 것을 전부 뺀다(원장님 2026-11-11 «시험지 전체»). */
  onRemoveAll?: () => void;
  onRestore?: (problem: StudioProblem) => void;
  pageOrder?: readonly StudioOrderedPage[];
  onPageOrderChange?: (order: readonly StudioOrderedPage[]) => void;
}) {
  const [local, setLocal] = useState<{
    picked: StudioProblem[];
    removed: StudioCartRemoval[];
  }>({ picked: [], removed: [] });
  const controlled = picked !== undefined;
  const projected = reconcileStudioPageCart(
    picked ?? local.picked,
    controlled ? (removed ?? []) : local.removed,
    pageOrder,
  );
  if (
    !controlled &&
    (projected.picked !== local.picked || projected.removed !== local.removed)
  )
    setLocal(projected);
  // The controlled ledger is an external draft store. Reconcile it after page/ledger changes.
  const syncPageOrder = useEffectEvent(() => {
    if (controlled) onPageOrderChange?.(pageOrder);
  });
  useEffect(() => {
    syncPageOrder();
  }, [pageOrder, picked, removed]);
  const excluded = new Set(
    pageOrder.filter((page) => page.out).map(studioPageKey),
  );
  return {
    controlled,
    picked: projected.picked,
    removed: projected.removed.filter(
      (item) =>
        !item.pageExcluded &&
        !(
          item.problem.studioCrop &&
          excluded.has(studioPageKey(item.problem.studioCrop))
        ),
    ),
    syncPageOrder() {
      if (controlled) onPageOrderChange?.(pageOrder);
    },
    add(problems: StudioProblem[]) {
      onAdd(problems);
      if (!controlled)
        setLocal((current) => ({
          picked: addToCart(current.picked, problems),
          removed: forgetRemovals(
            current.removed,
            problems.map((problem) => problem.id),
          ),
        }));
    },
    remove(problem: StudioProblem) {
      if (controlled) {
        onRemove?.(problem);
        return;
      }
      setLocal((current) => {
        const index = current.picked.findIndex(
          (item) => item.id === problem.id,
        );
        if (index < 0) return current;
        return {
          picked: current.picked.filter((item) => item.id !== problem.id),
          removed: rememberRemoval(
            current.removed,
            current.picked[index],
            index,
          ),
        };
      });
    },
    removeAll() {
      if (controlled) {
        onRemoveAll?.();
        return;
      }
      setLocal((current) => removeAllFromCart(current.picked, current.removed));
    },
    restore(problem: StudioProblem) {
      if (controlled) {
        onRestore?.(problem);
        return;
      }
      setLocal((current) => {
        const memory = current.removed.find(
          (item) => item.problem.id === problem.id,
        );
        return {
          picked: restoreToCart(
            current.picked,
            problem,
            memory?.index ?? current.picked.length,
          ),
          removed: forgetRemovals(current.removed, [problem.id]),
        };
      });
    },
  };
}
