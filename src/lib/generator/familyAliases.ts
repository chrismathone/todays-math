/** Whole-family aliases approved in the 2026-10-18 taxonomy audit (T01–03, T05–06, T29–32).
 * These describe a solving type, never a particular numerical question or an answer format.
 * Raw family keys, codes, import keys and records stay intact.
 */
const GROUPS = [
  {
    unitId: "82399e51-340d-4165-b016-3e941e65f810",
    keys: [
      "mid:3-1|이차방정식의 풀이|06",
      "mid:중3|이차방정식의 풀이::중3|인수분해",
    ],
  },
  {
    unitId: "761fad1c-913a-45e4-9639-93b4291390fd",
    keys: [
      "mid:2-1|연립일차방정식|20",
      "mid:중2|여러 가지 연립방정식의 풀이::중2|지수법칙",
    ],
  },
  {
    unitId: "761fad1c-913a-45e4-9639-93b4291390fd",
    keys: [
      "mid:2-1|연립일차방정식|19",
      "mid:중2|여러 가지 연립방정식의 풀이::중2|순환소수의 분수 표현",
    ],
  },
  {
    unitId: "b107b8ef-1798-4878-aaaf-7bdf4eac5489",
    keys: [19, 21, 23, 25].map((n) => `mid:2-1|연립일차방정식|${n}A`),
  },
  {
    unitId: "b107b8ef-1798-4878-aaaf-7bdf4eac5489",
    keys: [20, 22, 24, 26].map((n) => `mid:2-1|연립일차방정식|${n}A`),
  },
] as const;

/** Unit scope is part of the proof. An identical raw key in another unit stays independent. */
export function canonicalFamilyKey(unitId: string, familyKey: string): string {
  const key = familyKey.trim();
  return (
    GROUPS.find(
      (g) =>
        g.unitId === unitId && g.keys.some((candidate) => candidate === key),
    )?.keys[0] ?? key
  );
}

/** Expand a canonical/alias family for database predicates without rewriting stored keys. */
export function familyKeyVariants(unitId: string, familyKey: string): string[] {
  const key = familyKey.trim();
  const group = GROUPS.find(
    (g) => g.unitId === unitId && g.keys.some((candidate) => candidate === key),
  );
  return group ? [...group.keys] : [key];
}
