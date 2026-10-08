import {
  conceptBlankBankSchema,
  conceptBlankSelectionSchema,
  type ConceptBlankBank,
  type ConceptBlankPick,
  type ConceptBlankSelection,
  type ConceptBlankSheet,
  type SheetHeader,
} from "@/contracts/conceptBlank.contract";
import { getBlankSection, sectionTitleTex } from "./sections";
import {
  conceptSupportsForm,
  mapQuestionMode,
  MAP_NODES_PER_PAGE,
  QUESTION_MAP_NODES_PER_PAGE,
} from "./questions";

export const EXACT_COMPOSITION_VERSION = "injaewon.concept-blank.exact.v1";
export const EXACT_PARSER_VERSION = "injaewon.concept-blank.entries.v1";
export type ResolvedBlankSection = {
  blankSectionKey: string;
  title: string;
  unitLabel: string;
};

export function resolveBlankSections(
  keys: readonly string[],
): ResolvedBlankSection[] {
  return keys.map((key) => {
    const section = getBlankSection(key);
    if (!section) throw new RangeError(`알 수 없는 소단원: ${key}`);
    return {
      blankSectionKey: key,
      title: sectionTitleTex(section.title),
      unitLabel: `${section.grade} · ${section.chapter}`,
    };
  });
}

/** Exact picks never use stock fallback, curriculum sorting or today's labels when frozen labels exist. */
export function composeExactSheets(
  selectionInput: ConceptBlankSelection,
  bankInput: ConceptBlankBank,
  resolved?: readonly ResolvedBlankSection[],
): ConceptBlankSheet[] {
  const selection = conceptBlankSelectionSchema.parse(selectionInput);
  if (!selection.pick) throw new RangeError("정확한 항목 선택이 필요합니다.");
  const bank = conceptBlankBankSchema.parse(bankInput);
  const sections = new Map<string, ResolvedBlankSection>();
  for (const section of resolved ?? resolveBlankSections(selection.sections)) {
    if (sections.has(section.blankSectionKey))
      throw new RangeError(`중복 소단원 라벨: ${section.blankSectionKey}`);
    sections.set(section.blankSectionKey, section);
  }
  const concepts = new Map(bank.concepts.map((entry) => [entry.id, entry]));
  const ox = new Map(bank.ox.map((entry) => [entry.id, entry]));
  const apply = new Map(bank.apply.map((entry) => [entry.id, entry]));
  const figures = new Map(bank.figures.map((entry) => [entry.id, entry]));
  for (const [list, map] of [
    [bank.concepts, concepts],
    [bank.ox, ox],
    [bank.apply, apply],
    [bank.figures, figures],
  ] as const) {
    if (list.length !== map.size)
      throw new RangeError("은행에 중복 항목 ID가 있습니다.");
  }
  const groups: ConceptBlankPick[][] = [];
  for (const pick of selection.pick) {
    const entry =
      pick.entryKind === "concept"
        ? concepts.get(pick.entryId)
        : pick.entryKind === "ox"
          ? ox.get(pick.entryId)
          : pick.entryKind === "apply"
            ? apply.get(pick.entryId)
            : figures.get(pick.entryId);
    if (!entry)
      throw new RangeError(
        `선택 항목을 찾을 수 없습니다: ${pick.entryKind}/${pick.entryId}`,
      );
    if (entry.section !== pick.blankSectionKey || entry.level !== pick.level)
      throw new RangeError(
        `선택 항목의 소단원·난이도가 다릅니다: ${pick.entryId}`,
      );
    if (
      pick.entryKind === "concept" &&
      (pick.form === "term" || pick.form === "cloze" || pick.form === "map") &&
      !conceptSupportsForm(concepts.get(pick.entryId)!, pick.form)
    )
      throw new RangeError(
        `선택한 형식에서 사용할 수 없는 개념: ${pick.entryId}`,
      );
    if (pick.form === "recall" && "givenCase" in entry && entry.givenCase)
      throw new RangeError(
        `사례 항목은 완전 백지에 사용할 수 없습니다: ${pick.entryId}`,
      );
    const last = groups[groups.length - 1];
    if (
      last?.[0].form === pick.form &&
      last[0].blankSectionKey === pick.blankSectionKey
    )
      last.push(pick);
    else groups.push([pick]);
  }
  return groups.map((group): ConceptBlankSheet => {
    const { form, blankSectionKey } = group[0];
    const section = sections.get(blankSectionKey);
    if (!section)
      throw new RangeError(`고정 소단원 라벨이 없습니다: ${blankSectionKey}`);
    const header: SheetHeader = {
      title: selection.title?.trim() || section.title,
      unitLabel: section.unitLabel,
      date: selection.date ?? null,
      form,
    };
    const chosen = group
      .filter((p) => p.entryKind === "concept")
      .map((p) => concepts.get(p.entryId)!);
    switch (form) {
      case "recall":
        return {
          form,
          header,
          key: chosen,
          omittedCases: 0,
          zones: [
            {
              section: blankSectionKey,
              title: section.title,
              hint: [...new Set(chosen.map((c) => c.kind))].join(" · "),
              side: "예",
            },
          ],
        };
      case "term":
        return {
          form,
          header,
          terms: chosen,
          ox: group
            .filter((p) => p.entryKind === "ox")
            .map((p) => ox.get(p.entryId)!),
          entryOrder: group.map((p) => ({
            entryKind: p.entryKind as "concept" | "ox",
            entryId: p.entryId,
          })),
        };
      case "cloze":
        return {
          form,
          header,
          sentences: chosen,
          apply: group
            .filter((p) => p.entryKind === "apply")
            .map((p) => apply.get(p.entryId)!),
          entryOrder: group.map((p) => ({
            entryKind: p.entryKind as "concept" | "apply",
            entryId: p.entryId,
          })),
        };
      case "map": {
        const maps = [];
        const questionMode = mapQuestionMode(chosen);
        const limit = questionMode
          ? QUESTION_MAP_NODES_PER_PAGE
          : MAP_NODES_PER_PAGE;
        for (let i = 0; i < chosen.length; i += limit)
          maps.push({ hub: section.title, nodes: chosen.slice(i, i + limit) });
        return {
          form,
          header,
          maps,
          ...(questionMode ? { questionMode: true as const } : {}),
        };
      }
      case "figure":
        return {
          form,
          header,
          figures: group.map((p) => figures.get(p.entryId)!),
        };
    }
  });
}

/** Builds counts explicitly from picks for authorized server adapters. It does not encode a URL/code. */
export function selectionFromPicks(
  pick: ConceptBlankPick[],
  title?: string,
): ConceptBlankSelection {
  const forms: ConceptBlankSelection["forms"] = [];
  for (const entry of pick) {
    let group = forms.find((f) => f.form === entry.form);
    if (!group) {
      group = {
        form: entry.form,
        counts: { 하: 0, 중: 0, 상: 0 },
        extras: { 하: 0, 중: 0, 상: 0 },
      };
      forms.push(group);
    }
    const counter =
      entry.entryKind === "ox" || entry.entryKind === "apply"
        ? group.extras
        : group.counts;
    counter[entry.level]++;
  }
  return conceptBlankSelectionSchema.parse({
    sections: [...new Set(pick.map((p) => p.blankSectionKey))],
    forms,
    ...(title === undefined ? {} : { title }),
    pick,
  });
}
