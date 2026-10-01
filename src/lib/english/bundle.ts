/**
 * 오늘의 영어 — 학생용 지면의 묶음 (D-151 · 25 §12.11 3자 합의 «가 · 나 · 다»).
 *
 * 학생용을 한 장에 다 찍으면 원 지문 상자가 변형 문항(어법 · 빈칸 · 삽입)의 답을 보여 주고, 변형 문항끼리도 서로의 답을 보여 준다
 * (`leak.ts` — 실제 세트의 60%). 그래서 학생용을 **순서가 있는 묶음**으로 가른다.
 *
 * 묶음을 짓는 규칙(합의 «가»):
 *   - 독해 묶음(원 지문 + 독해형)은 맨 뒤다.
 *   - 변형 문항은, 아직 묶이지 않은 것 가운데 **남은 변형 문항의 답을 담지 않은 것**을 다음 묶음으로 삼는 일을 되풀이한다.
 *     (답을 보여 주는 지문이 늘 그 답의 문항보다 뒤에 온다. 서로 무관한 문항은 한 묶음 — 필요 없이 쪼개지 않는다.)
 *   - 🔴 서로의 답을 보여 주는 쌍 · 순환은 순서로 없앨 수 없다 — 하나씩 떼어 두고, 남는 짝을 `open` 에 적어 화면이 말하게 한다.
 *
 * 🔴 가른 것은 «누출 해결»이 아니다 — 걷지 않으면 소용없고, 바꿔 쓴 단서와 먼저 읽은 글의 기억은 못 막는다(합의 «라»).
 *    그래서 누출이 없을 때의 문구도 «검사에서 찾은 누출 없음»이다(안전하다고 말하지 않는다).
 *
 * 순수 함수다(서버 · 클라이언트 같이). 화면 · 교사용 머리의 문장도 여기서 짓는다 — 두 곳의 말이 갈리지 않게.
 */
import type {
  EnglishQuestionType,
  EnglishSet,
} from "@/contracts/english.contract";

import { findVariantLeaks, type EnglishLeak } from "./leak";

export type EnglishBundleKind = "변형" | "독해";

export interface EnglishBundle {
  /** 1부터 — 화면과 종이의 번호가 같다 */
  no: number;
  kind: EnglishBundleKind;
  /** 세트의 문항 번호(0부터 · 오름차순) — 종이의 문항 번호는 세트 번호 그대로다 */
  questions: number[];
  /** 원 지문 상자를 싣는가 — 독해 묶음만 */
  passage: boolean;
}

export interface EnglishBundlePlan {
  bundles: EnglishBundle[];
  /** 검사가 찾은 짝 전부 */
  leaks: EnglishLeak[];
  /** 지금 묶음으로도 남는 짝 — 같은 묶음 안에 있거나(합침), 답을 보여 주는 지문이 앞 묶음에 있다(순환) */
  open: EnglishLeak[];
  /** 순서로 풀 수 없는 쌍 · 순환이 있었다 */
  cyclic: boolean;
  /** 변형 문항을 한 묶음으로 합친 상태인가 — 합칠 것이 없으면(변형 묶음 하나) 늘 거짓 */
  merged: boolean;
  /** 합치기 전의 변형 묶음(문항 번호) — 합친 뒤에도 «무엇을 합쳤는지» 말하려고 둔다 */
  variantGroups: number[][];
}

export interface PlanEnglishBundlesOptions {
  /** 누출 짝 — 안 주면 `findVariantLeaks` 로 찾는다 */
  leaks?: readonly EnglishLeak[];
  /** 변형 문항을 한 묶음으로 합친다(선생님이 영향을 읽고 누른 뒤) */
  merge?: boolean;
}

/** 발문 안에 문제용 지문이 따로 드는 유형 — `leak.ts` 의 대상과 같다 */
const VARIANT_TYPES: readonly EnglishQuestionType[] = [
  "어법",
  "빈칸 추론",
  "문장 삽입",
  "원문 복원",
];

/** `from` 에서 누출 화살표(답 → 그 답을 보여 주는 지문)를 따라 `to` 에 닿는가 — `within` 안에서만 */
function reaches(
  from: number,
  to: number,
  within: ReadonlySet<number>,
  leaks: readonly EnglishLeak[],
): boolean {
  const seen = new Set<number>();
  const stack = [from];
  while (stack.length) {
    const at = stack.pop()!;
    for (const leak of leaks) {
      if (leak.source !== at || !within.has(leak.target)) continue;
      if (leak.target === to) return true;
      if (!seen.has(leak.target)) {
        seen.add(leak.target);
        stack.push(leak.target);
      }
    }
  }
  return false;
}

/** 변형 문항을 규칙대로 묶는다 — 돌려주는 것은 묶음마다의 문항 번호와 «순환을 끊었는가» */
function groupVariants(
  variants: readonly number[],
  leaks: readonly EnglishLeak[],
): { groups: number[][]; cyclic: boolean } {
  const remaining = new Set(variants);
  const groups: number[][] = [];
  let cyclic = false;
  /** 남은 문항의 답을 지문에 담고 있는 수 */
  const holds = (index: number) =>
    leaks.filter(
      (leak) =>
        leak.target === index &&
        leak.source !== index &&
        remaining.has(leak.source),
    ).length;
  while (remaining.size) {
    let take = [...remaining].filter((index) => holds(index) === 0);
    if (!take.length) {
      // 순환만 남았다 — 순환 위의 문항 하나를 떼어 낸다(담은 답이 가장 적은 것 · 같으면 앞 번호).
      // 순환에 매달리기만 한 문항을 떼면 없앨 수 있던 짝까지 남는다.
      cyclic = true;
      const onCycle = [...remaining].filter((index) =>
        reaches(index, index, remaining, leaks),
      );
      const pool = onCycle.length ? onCycle : [...remaining];
      take = [
        pool.reduce((best, index) =>
          holds(index) < holds(best) ||
          (holds(index) === holds(best) && index < best)
            ? index
            : best,
        ),
      ];
    }
    take.sort((a, b) => a - b);
    groups.push(take);
    take.forEach((index) => remaining.delete(index));
  }
  return { groups, cyclic };
}

export function planEnglishBundles(
  set: Pick<EnglishSet, "passage" | "questions">,
  options: PlanEnglishBundlesOptions = {},
): EnglishBundlePlan {
  const all = set.questions.map((_, index) => index);
  const variants = all.filter((index) =>
    VARIANT_TYPES.includes(set.questions[index]!.type),
  );
  const reading = all.filter((index) => !variants.includes(index));
  const leaks = [...(options.leaks ?? findVariantLeaks(set))].filter(
    (leak) =>
      leak.source !== leak.target &&
      variants.includes(leak.source) &&
      variants.includes(leak.target),
  );
  const { groups: variantGroups, cyclic } = groupVariants(variants, leaks);
  const merged = Boolean(options.merge) && variantGroups.length > 1;
  const groups = merged ? [variants] : variantGroups;

  const bundles: EnglishBundle[] = groups.map((questions, order) => ({
    no: order + 1,
    kind: "변형",
    questions,
    passage: false,
  }));
  if (reading.length)
    bundles.push({
      no: bundles.length + 1,
      kind: "독해",
      questions: reading,
      passage: true,
    });

  const bundleOf = new Map<number, number>();
  for (const bundle of bundles)
    for (const index of bundle.questions) bundleOf.set(index, bundle.no);
  const open = leaks.filter(
    (leak) => bundleOf.get(leak.target)! <= bundleOf.get(leak.source)!,
  );
  return { bundles, leaks, open, cyclic, merged, variantGroups };
}

/** 수록 문항 — 이어진 번호는 «3~4번», 떨어진 번호는 «1~2, 6번» */
export function englishQuestionRange(questions: readonly number[]): string {
  const numbers = questions.map((index) => index + 1).sort((a, b) => a - b);
  const parts: string[] = [];
  for (let i = 0; i < numbers.length; i += 1) {
    let j = i;
    while (j + 1 < numbers.length && numbers[j + 1] === numbers[j]! + 1) j += 1;
    parts.push(j > i ? `${numbers[i]}~${numbers[j]}` : `${numbers[i]}`);
    i = j;
  }
  return `${parts.join(", ")}번`;
}

/** 학생 종이의 머리 딱지 — 화면의 묶음 번호와 같다 */
export function englishBundleLabel(bundle: {
  no: number;
  questions: readonly number[];
}): string {
  return `문제 묶음 ${bundle.no} · ${englishQuestionRange(bundle.questions)}`;
}

// 숫자 뒤의 조사 — 끝자리의 읽기로 정한다(일 · 삼 · 육 · 칠 · 팔 · 영/십 은 받침이 있다)
const FINAL_CONSONANT = [
  true,
  true,
  false,
  true,
  false,
  false,
  true,
  true,
  true,
  false,
];
/** 끝자리가 ㄹ 받침 — «으로»가 아니라 «로» (일 · 칠 · 팔) */
const RIEUL = [
  false,
  true,
  false,
  false,
  false,
  false,
  false,
  true,
  true,
  false,
];
const object = (no: number) => `${no}${FINAL_CONSONANT[no % 10] ? "을" : "를"}`;
const toward = (no: number) =>
  `${no}${FINAL_CONSONANT[no % 10] && !RIEUL[no % 10] ? "으로" : "로"}`;

const numbers = (indices: readonly number[]) =>
  [...new Set(indices)]
    .sort((a, b) => a - b)
    .map((index) => `${index + 1}번`)
    .join(" · ");

/** 짝을 «답을 보여 주는 문항»별로 모은다 — 문항 번호 순 */
function byTarget(
  leaks: readonly EnglishLeak[],
): { target: number; sources: number[] }[] {
  const map = new Map<number, number[]>();
  for (const leak of leaks)
    map.set(leak.target, [...(map.get(leak.target) ?? []), leak.source]);
  return [...map.entries()]
    .sort(([a], [b]) => a - b)
    .map(([target, sources]) => ({ target, sources }));
}

/** «5번의 지문에 3번 · 4번의 답» */
const held = (group: { target: number; sources: number[] }) =>
  `${group.target + 1}번의 지문에 ${numbers(group.sources)}의 답`;
/** «3번 · 4번의 답이 5번의 지문에» */
const seen = (group: { target: number; sources: number[] }) =>
  `${numbers(group.sources)}의 답이 ${group.target + 1}번의 지문에`;

export interface EnglishBundleNotices {
  /** 인쇄 화면의 배부 순서 줄 — 묶음이 하나면 없다 */
  handout: string | null;
  /** 교사용 머리의 배부 순서 — «묶음 1(3~4번) → 걷은 뒤 묶음 2(5번) → …» */
  order: string | null;
  /** 누출 줄 — 없음 / 갈라 둔 까닭 / 합친 뒤 */
  leak: { tone: "none" | "split" | "merged"; text: string };
  /** 합치기 · 되돌리기 단추 — 영향(`effect`)은 단추보다 먼저 읽히는 자리에 둔다 */
  merge: {
    action: "merge" | "split";
    label: string;
    effect: string | null;
  } | null;
  /** 교사용 머리의 «답이 보이는 문항» 값 */
  shown: string;
  /** «근거 보기»의 줄 — 짝마다 하나 */
  evidence: string[];
}

export const ENGLISH_NO_LEAK_FOUND = "검사에서 찾은 누출 없음";
export const ENGLISH_HANDOUT_WARNING = "한꺼번에 주면 가른 효과가 없습니다.";

export function englishBundleNotices(
  plan: EnglishBundlePlan,
): EnglishBundleNotices {
  const { bundles, leaks, open, merged, variantGroups } = plan;
  const many = bundles.length > 1;
  const handout = many
    ? [
        ...bundles
          .slice(0, -1)
          .map((bundle, order) =>
            order === 0
              ? `묶음 ${object(bundle.no)} 풀고 걷은 뒤 묶음 ${object(bundles[order + 1]!.no)} 나눠 줍니다.`
              : `묶음 ${object(bundle.no)} 걷은 뒤 묶음 ${object(bundles[order + 1]!.no)} 나눠 줍니다.`,
          ),
        ENGLISH_HANDOUT_WARNING,
      ].join(" ")
    : null;
  const order = many
    ? bundles
        .map(
          (bundle) =>
            `묶음 ${bundle.no}(${englishQuestionRange(bundle.questions)})`,
        )
        .join(" → 걷은 뒤 ")
    : null;
  const shown = leaks.length
    ? byTarget(leaks).map(held).join(" · ")
    : ENGLISH_NO_LEAK_FOUND;
  const evidence = leaks.map(
    (leak) =>
      `${leak.source + 1}번의 답 «${leak.snippet}» — ${leak.target + 1}번의 지문에 그대로 있습니다.`,
  );
  if (!leaks.length)
    return {
      handout,
      order,
      leak: { tone: "none", text: ENGLISH_NO_LEAK_FOUND },
      merge: null,
      shown,
      evidence,
    };

  const later = variantGroups.slice(1);
  /** 합치는 대상의 이름 — 뒤 묶음이 하나면 그 문항, 여럿이면 «변형 문항» */
  const what =
    later.length === 1 ? `${englishQuestionRange(later[0]!)}을` : "변형 문항을";
  const visible = `${byTarget(leaks).map(seen).join(", ")} 보입니다.`;

  if (merged)
    return {
      handout,
      order,
      leak: {
        tone: "merged",
        text: `${what} 묶음 1에 합쳤습니다. ${visible}`,
      },
      merge: { action: "split", label: "합치기 되돌리기", effect: null },
      shown,
      evidence,
    };

  // 갈라 둔 까닭 — 뒤 변형 묶음마다, 앞 묶음 문항의 답을 담고 있어서
  const bundleOf = new Map<number, number>();
  variantGroups.forEach((group, at) =>
    group.forEach((index) => bundleOf.set(index, at + 1)),
  );
  const reasons = later.flatMap((group, at) => {
    const into = leaks.filter(
      (leak) =>
        group.includes(leak.target) &&
        bundleOf.get(leak.source)! < bundleOf.get(leak.target)!,
    );
    return into.length
      ? [
          `${byTarget(into).map(held).join(" · ")}이 있어 ${englishQuestionRange(group)}을 묶음 ${toward(at + 2)}`,
        ]
      : [];
  });
  const sentences = reasons.length ? [`${reasons.join(", ")} 두었습니다.`] : [];
  // 순서로 못 없앤 쌍 — 어느 쪽을 먼저 줘도 남는다
  const pairs = new Map<string, [number, number]>();
  for (const leak of open) {
    const pair: [number, number] =
      leak.source < leak.target
        ? [leak.source, leak.target]
        : [leak.target, leak.source];
    pairs.set(pair.join("-"), pair);
  }
  for (const [a, b] of pairs.values())
    sentences.push(
      `${a + 1}번과 ${b + 1}번은 어느 쪽을 먼저 줘도 앞 지문에 뒤 문항의 답이 있습니다.`,
    );

  return {
    handout,
    order,
    leak: { tone: "split", text: sentences.join(" ") },
    merge:
      variantGroups.length > 1
        ? {
            action: "merge",
            label: `${what} 묶음 1에 합치기`,
            effect: `합치면 ${visible}`,
          }
        : null,
    shown,
    evidence,
  };
}
