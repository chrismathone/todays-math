import type {
  ApplyItem,
  ConceptBlankBank,
  ConceptEntry,
  OxItem,
} from "@/contracts/conceptBlank.contract";

/**
 * 은행 3차 «난이도별 10문항» 보강(원장님 2026-10-01 «하/중/상 문제를 10문제씩 · 같은 개념이어도 난이도에 따라 구분시켜도
 * 되니까» — 브리프 `docs/planning/tracks/briefs/cb-ten.md`). 보강 문항은 학년마다 따로 둔 파일(`e3-plus.ts` …)에 담고,
 * 원래 은행 파일(`e3.ts` …)은 건드리지 않는다 — 소단원 안에서 원래 문항이 언제나 앞에 오고, 원래 id 와 번호도 그대로다.
 *
 * 보강 파일은 소단원마다 `plusSection(열쇠, id 머리, { concepts, ox, apply })` 하나 — 문항은 짧은 줄(튜플)로 쓰고
 * id 는 차례에서 낸다: `<머리>-xc<n>` 개념 · `-xo<n>` ○× · `-xa<n>` 적용. 머리는 그 소단원 원래 문항 id 의 앞부분
 * (`e3-1-1-1-c1` → `e3-1-1-1`). `x` 가 붙어 원래 번호(뺀 번호 포함)와 겹치지 않는다.
 * 🔴 고정 문항이다 — 한 번 들어간 문항을 빼야 하면 그 자리에 `RETIRED` 를 둔다(뒤 번호가 밀리지 않게).
 */
export const RETIRED = null;

/**
 * 사례 문항 표지 — 굵은 답이 용어에 주어진 값으로 정해지는 개념(계약 `givenCase`). A(완전 백지) 채점표에 안 실린다.
 * 개념 줄의 **끝**에 적는다: `["하", 용어, 갈래, 뜻문장, CASE]` 또는 `[…, 뜻문장, [예 물음, 예 답], CASE]`.
 */
export const CASE = "사례" as const;

export type PlusExample = readonly [prompt: string, answer: string];
export type PlusConcept =
  | readonly [
      level: ConceptEntry["level"],
      term: string,
      kind: ConceptEntry["kind"],
      definition: string,
      example?: PlusExample | typeof CASE,
    ]
  | readonly [
      level: ConceptEntry["level"],
      term: string,
      kind: ConceptEntry["kind"],
      definition: string,
      example: PlusExample,
      mark: typeof CASE,
    ];
export type PlusOx = readonly [
  level: OxItem["level"],
  statement: string,
  answer: boolean,
  why: string,
];
export type PlusApply = readonly [
  level: ApplyItem["level"],
  prompt: string,
  answer: string,
];

export type SectionPlus = {
  concepts?: readonly (PlusConcept | typeof RETIRED)[];
  ox?: readonly (PlusOx | typeof RETIRED)[];
  apply?: readonly (PlusApply | typeof RETIRED)[];
};

/** 소단원 하나의 보강 — 열쇠를 붙이고 id 를 차례에서 낸다(그림은 보강하지 않는다). */
export function plusSection(
  section: string,
  idHead: string,
  items: SectionPlus,
): ConceptBlankBank {
  const concepts: ConceptEntry[] = [];
  const ox: OxItem[] = [];
  const apply: ApplyItem[] = [];
  (items.concepts ?? []).forEach((entry, i) => {
    if (entry === RETIRED) return;
    const [level, term, kind, definition, fifth] = entry;
    const sixth: unknown = (entry as readonly unknown[])[5];
    const example = fifth === CASE ? undefined : fifth;
    concepts.push({
      id: `${idHead}-xc${i + 1}`,
      section,
      term,
      kind,
      level,
      definition,
      ...(example
        ? { example: { prompt: example[0], answer: example[1] } }
        : {}),
      ...(fifth === CASE || sixth === CASE ? { givenCase: true } : {}),
    });
  });
  (items.ox ?? []).forEach((entry, i) => {
    if (entry === RETIRED) return;
    const [level, statement, answer, why] = entry;
    ox.push({
      id: `${idHead}-xo${i + 1}`,
      section,
      level,
      statement,
      answer,
      why,
    });
  });
  (items.apply ?? []).forEach((entry, i) => {
    if (entry === RETIRED) return;
    const [level, prompt, answer] = entry;
    apply.push({ id: `${idHead}-xa${i + 1}`, section, level, prompt, answer });
  });
  return { concepts, ox, apply, figures: [] };
}

/**
 * 원래 은행 파일(`e3.ts` …)의 사례 문항에 표지를 단다 — 파일마다 적는 꼴이 달라, 표지는 파일 끝에서 id 로 단다
 * (`markGivenCases(bank, ["e3-1-3-3-c2"])`). 은행에 없는 id 나 개념이 아닌 id 는 던진다(오타가 조용히 빠지지 않게).
 */
export function markGivenCases(
  bank: ConceptBlankBank,
  ids: readonly string[],
): void {
  const byId = new Map(bank.concepts.map((c) => [c.id, c]));
  for (const id of ids) {
    const concept = byId.get(id);
    if (!concept) throw new Error(`사례 표지: 은행에 없는 개념 ${id}`);
    concept.givenCase = true;
  }
}

/** 소단원 보강을 파일 순서대로 잇는다. */
export function joinBanks(
  parts: readonly ConceptBlankBank[],
): ConceptBlankBank {
  return {
    concepts: parts.flatMap((p) => p.concepts),
    ox: parts.flatMap((p) => p.ox),
    apply: parts.flatMap((p) => p.apply),
    figures: parts.flatMap((p) => p.figures),
  };
}
