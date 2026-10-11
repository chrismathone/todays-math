/** Exact positive numeric monomials only; no variables or branch assumptions. */
type Fraction = { n: bigint; d: bigint };
function fraction(n: bigint, d: bigint): Fraction | null {
  if (d <= BigInt(0)) return null;
  let a = n < BigInt(0) ? -n : n,
    b = d;
  while (b !== BigInt(0)) [a, b] = [b, a % b];
  return { n: n / a, d: d / a };
}
export function positiveRadicalAnswerKey(input: string): string | null {
  if (input.length > 300) return null;
  const text = input
    .replace(/\$([^$]*)\$/g, "$1")
    .replace(/\s+/g, "")
    .replace(/\\(?:dfrac|tfrac)\b/g, "\\frac")
    .replace(/\\[,;:!]/g, "");
  const root = /^(\d{1,7})?\\sqrt(?:\[(\d{1,2})\])?\{(\d{1,7})\}$/.exec(text);
  const power =
    /^(\d{1,7})\^\{(?:\\frac\{([+-]?\d{1,4})\}\{(\d{1,2})\}|([+-]?\d{1,4})\/(\d{1,2}))\}$/.exec(
      text,
    );
  if (!root && !power) return null;
  const factors = new Map<number, Fraction>();
  const add = (prime: number, exponent: Fraction) => {
    const old = factors.get(prime) ?? { n: BigInt(0), d: BigInt(1) };
    const sum = fraction(
      old.n * exponent.d + exponent.n * old.d,
      old.d * exponent.d,
    )!;
    factors.set(prime, sum);
  };
  const factor = (value: number, exponent: Fraction): boolean => {
    if (!Number.isSafeInteger(value) || value < 1 || value > 1000000)
      return false;
    let remainder = value;
    for (let prime = 2; prime * prime <= remainder; prime++) {
      let multiplicity = 0;
      while (remainder % prime === 0) {
        remainder /= prime;
        multiplicity++;
      }
      if (multiplicity)
        add(prime, { n: exponent.n * BigInt(multiplicity), d: exponent.d });
    }
    if (remainder > 1) add(remainder, exponent);
    return true;
  };
  if (root) {
    const degree = Number(root[2] ?? 2);
    if (
      degree < 2 ||
      degree > 64 ||
      !factor(Number(root[1] ?? 1), { n: BigInt(1), d: BigInt(1) }) ||
      !factor(Number(root[3]), { n: BigInt(1), d: BigInt(degree) })
    )
      return null;
  } else {
    const exponent = fraction(
      BigInt(power![2] ?? power![4]),
      BigInt(power![3] ?? power![5]),
    );
    if (
      !exponent ||
      exponent.d > BigInt(64) ||
      !factor(Number(power![1]), exponent)
    )
      return null;
  }
  return `positive-radical:${[...factors]
    .filter(([, e]) => e.n !== BigInt(0))
    .sort(([a], [b]) => a - b)
    .map(([p, e]) => `${p}^${e.n}/${e.d}`)
    .join("*")}`;
}
