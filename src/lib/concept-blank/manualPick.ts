import {
  CONCEPT_BLANK_LEVELS,
  type ConceptBlankBank,
  type ConceptBlankForm,
  type ConceptBlankPick,
  type ConceptBlankSelection,
  type LevelCounts,
} from "@/contracts/conceptBlank.contract";
import { orderedSections, takeByLevel } from "./compose";
import { selectionFromPicks } from "./exactPick";
import { conceptSupportsForm } from "./questions";

export type PickRow = "main" | "extra";
export type FormPicking = { mode: "auto" | "pick"; picks: ConceptBlankPick[] };
export type FormPickings = Partial<Record<ConceptBlankForm, FormPicking>>;
export const PICK_COUNT_CAP = 40;
export const STALE_PICK_MESSAGE =
  "고른 문항이 없어졌거나 소단원·난이도가 바뀌었습니다. 문항 고르기에서 다시 확인해 주세요.";
export const pickKey = (pick: ConceptBlankPick) =>
  `${pick.form}:${pick.entryKind}:${pick.entryId}`;
export const pickRow = (pick: ConceptBlankPick): PickRow =>
  pick.entryKind === "ox" || pick.entryKind === "apply" ? "extra" : "main";
export const samePick = (a: ConceptBlankPick, b: ConceptBlankPick) =>
  pickKey(a) === pickKey(b) &&
  a.blankSectionKey === b.blankSectionKey &&
  a.level === b.level;

/** 범위를 사용자가 뺀 것과 은행에서 문항이 달라진 것은 다르다. 후자는 조용히 고쳐 저장하지 않는다. */
export function assertCurrentPicks(
  bank: ConceptBlankBank,
  sections: readonly string[],
  form: ConceptBlankForm,
  picks: readonly ConceptBlankPick[],
) {
  const valid = new Map(
    [
      ...pickPool(bank, sections, form, "main"),
      ...pickPool(bank, sections, form, "extra"),
    ].map((pick) => [pickKey(pick), pick]),
  );
  for (const pick of picks) {
    if (!sections.includes(pick.blankSectionKey)) continue;
    const current = valid.get(pickKey(pick));
    if (!current || !samePick(pick, current))
      throw new RangeError(STALE_PICK_MESSAGE);
  }
}

/** 자동으로 되돌려도 선택을 보존한다. 화면의 수와 저장할 pick은 이 상태에서 만든다. */
export function setPickMode<T extends FormPicking>(
  state: T,
  mode: FormPicking["mode"],
): T {
  return { ...state, mode };
}

/** 출제 가능한 항목만 composeSheets와 같은 소단원 → 은행 순서로 돌려준다. */
export function pickPool(
  bank: ConceptBlankBank,
  sections: readonly string[],
  form: ConceptBlankForm,
  row: PickRow,
): ConceptBlankPick[] {
  const kind =
    row === "extra"
      ? form === "term"
        ? "ox"
        : form === "cloze"
          ? "apply"
          : null
      : form === "figure"
        ? "figure"
        : "concept";
  if (!kind) return [];
  const entries =
    kind === "concept"
      ? bank.concepts.filter((entry) => conceptSupportsForm(entry, form))
      : kind === "ox"
        ? bank.ox
        : kind === "apply"
          ? bank.apply
          : bank.figures;
  return orderedSections(sections).flatMap((section) =>
    entries
      .filter((entry) => entry.section === section)
      .map((entry) => ({
        form,
        entryKind: kind,
        entryId: entry.id,
        blankSectionKey: section,
        level: entry.level,
      })),
  );
}

export function pickCounts(
  picks: readonly ConceptBlankPick[],
  row: PickRow,
): LevelCounts {
  const counts: LevelCounts = { 하: 0, 중: 0, 상: 0 };
  for (const pick of picks) if (pickRow(pick) === row) counts[pick.level]++;
  return counts;
}

function take(
  pool: readonly ConceptBlankPick[],
  counts: LevelCounts,
): ConceptBlankPick[] {
  return takeByLevel(
    pool.map((pick) => ({
      pick,
      section: pick.blankSectionKey,
      level: pick.level,
    })),
    counts,
  ).map(({ pick }) => pick);
}

/** 현재 종류의 목표 수만 채운다. 필터는 탐색용이며 자동 채우기의 범위를 줄이지 않는다. */
export function fillPicks(
  pool: readonly ConceptBlankPick[],
  current: readonly ConceptBlankPick[],
  targets: LevelCounts,
  mode: "missing" | "replace",
): ConceptBlankPick[] {
  const keys = new Set(pool.map(pickKey));
  const kept =
    mode === "replace"
      ? current.filter((pick) => !keys.has(pickKey(pick)))
      : [...current];
  const inPool = kept.filter((pick) => keys.has(pickKey(pick)));
  const have = new Set(kept.map(pickKey));
  const counts = { 하: 0, 중: 0, 상: 0 };
  for (const level of CONCEPT_BLANK_LEVELS) {
    const requested = Number.isFinite(targets[level])
      ? Math.floor(targets[level])
      : 0;
    counts[level] = Math.max(
      0,
      Math.min(PICK_COUNT_CAP, requested) -
        inPool.filter((pick) => pick.level === level).length,
    );
  }
  return [
    ...kept,
    ...take(
      pool.filter((pick) => !have.has(pickKey(pick))),
      counts,
    ),
  ];
}

/** H2 (가): 직접 형식이 하나라도 있으면 자동 형식도 정확한 pick 으로 펼친다. 계약은 그대로다. */
export function materializePicks(
  selection: ConceptBlankSelection,
  picking: FormPickings,
  bank: ConceptBlankBank,
): ConceptBlankSelection | null {
  if (!selection.forms.some(({ form }) => picking[form]?.mode === "pick"))
    return selection;
  const picks = selection.forms.flatMap(({ form, counts, extras }) => {
    const main = pickPool(bank, selection.sections, form, "main");
    const extra = pickPool(bank, selection.sections, form, "extra");
    const state = picking[form];
    if (state?.mode === "pick")
      assertCurrentPicks(bank, selection.sections, form, state.picks);
    const chosen =
      state?.mode === "pick"
        ? state.picks.filter((pick) =>
            selection.sections.includes(pick.blankSectionKey),
          )
        : [...take(main, counts), ...take(extra, extras)];
    // Exact contract requires every form/section group to be contiguous.
    const groupOrder =
      state?.mode === "pick"
        ? [...new Set(chosen.map((pick) => pick.blankSectionKey))]
        : orderedSections(selection.sections);
    return groupOrder.flatMap((section) =>
      chosen.filter((pick) => pick.blankSectionKey === section),
    );
  });
  if (!picks.length) return null;
  return {
    ...selectionFromPicks(picks, selection.title),
    ...(selection.date ? { date: selection.date } : {}),
  };
}
