/**
 * 오늘의 영어 — 읽은 글의 후보정 (D-158 · 25 §13.10). **결정적이다** — 모델을 더 부르지 않는다.
 *
 * 원장님 2026-10-06 «(Opus 는) 너무 비싸. gemini 3.8 flash 로 하고 강력한 후보정으로 추측 보정하는 걸로.
 * 어차피 사용자가 타이핑 추가 보정도 가능하니까». 그래서 «확실할 때만 고친다»가 아니라 **그럴듯한 쪽으로 고친다** —
 * 틀리면 선생님이 읽기 창에서 고친다.
 *
 * ⑴ `reconcileEnglishBlanks` — 같은 사진을 **따로 한 번 더 읽은 글**로 빈칸 자리만 고친다.
 *    Gemini 3.8 Flash 의 읽기는 틀리는 자리가 회차마다 달랐다(§13.9 — 빈칸 앞 글자에 손글씨가 섞이거나, 앞 글자가 빠지거나,
 *    빈칸에 쓴 답을 낱말로 읽거나). 손글씨는 글자를 **보탤** 뿐이고 빠뜨린 쪽은 **비어** 있으므로, 갈린 자리에서
 *      1. 둘 다 빈칸 꼴(h____ · hot____ · ____)이면 → 가장 짧은 «빈 것이 아닌» 앞 글자
 *      2. 밑글은 낱말 · 다른 글은 그 낱말의 앞 글자로 시작하는 빈칸 꼴(water · w____)이면 → 빈칸 꼴
 *    을 고른다. 그 밖의 자리(다른 글에만 있는 낱말 · 서로 다른 낱말)는 **손대지 않는다** — 재 보니 넣고 바꾸는 쪽은 작은 흠을
 *    네 배로 늘렸다. 읽는 차례가 다른 글(표를 줄로 읽었나 칸으로 읽었나)은 짝이 어긋나므로 쓰지 않는다.
 *
 * ⑵ `polishEnglishReadText` — 한 글 안에서 하는 추측 보정.
 *      a. 이름 줄(«1학년 1반 15번 이름:»)의 반 · 번 앞 숫자는 손으로 쓴 것이다 — 뺀다. 학년의 숫자는 인쇄된 것이라 둔다.
 *      b. 빈칸 앞 글자가 그 글에서 거의 다 «첫 소리»(h · sh · pr)뿐인데 몇 개만 길면(hot · act · en) 손글씨가 섞인 것으로 보고
 *         첫 소리로 줄인다. 빈칸이 다섯 미만이거나 긴 앞 글자가 흔한 글(un____ · re____)은 그 종이의 꼴로 보고 두지 않는다.
 *
 * 받아 둔 Gemini 의 읽기 글로 잰 것(§13.10 — 모델 호출 없이 99번): 읽기 + 대조만 → 큰 흠 쪽당 0.24, 여기에 ⑴ · ⑵ 를 걸면 0.08.
 * ⑵ 는 모든 모델 · 지시문 판의 글 867개에 걸어 35개를 고쳤고 **나빠진 글은 없었다.**
 */

/** 빈칸 꼴 낱말 — 앞 글자(없을 수 있다) + 밑줄 셋 이상 + 뒤(문장부호 따위) */
const BLANK = /^([^\s_]*?)(_{3,})(\S*)$/;
/** 채워진 낱말 — 영어 글자와 끝의 문장부호 */
const WORD = /^[A-Za-z'’-]+[.,?!;:]*$/;

/** 이보다 크게 갈린 덩이는 «읽는 차례가 다르다»로 본다 */
const BLOCK = 6;
/** 큰 덩이로 갈린 낱말이 밑글의 이만큼을 넘으면 그 글은 쓰지 않는다 */
const REORDER_SHARE = 0.08;
/** 낱말 맞추기 표(밑글 × 다른 글)의 상한 — 넘으면 맞추지 않는다(30,000자 글도 이 안이다) */
const CELLS = 4_000_000;

const normalize = (token: string) =>
  token
    .normalize("NFC")
    .replace(/[‘’`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/_{3,}/g, "____");

/** 글 → 낱말과 사이 공백(그대로 다시 이어 붙인다) */
function split(text: string) {
  const parts = text.trim().split(/(\s+)/);
  const tokens: string[] = [];
  const gaps: string[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    tokens.push(parts[i]!);
    gaps.push(parts[i + 1] ?? "");
  }
  return { tokens, gaps };
}

type Hunk = { a: number[]; b: number[] };

/** 가장 긴 공통 낱말 줄로 두 글을 맞춘다 → 갈린 덩이(a = 밑글의 자리 · b = 다른 글의 자리) */
function hunksOf(a: string[], b: string[]): Hunk[] {
  const n = a.length;
  const m = b.length;
  const table = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      table[i]![j] =
        a[i] === b[j]
          ? table[i + 1]![j + 1]! + 1
          : Math.max(table[i + 1]![j]!, table[i]![j + 1]!);
  const out: Hunk[] = [];
  let i = 0;
  let j = 0;
  let current: Hunk | null = null;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) {
      if (current) out.push(current);
      current = null;
      i++;
      j++;
    } else if (j < m && (i === n || table[i]![j + 1]! >= table[i + 1]![j]!)) {
      current ??= { a: [], b: [] };
      current.b.push(j++);
    } else {
      current ??= { a: [], b: [] };
      current.a.push(i++);
    }
  }
  if (current) out.push(current);
  return out;
}

export function reconcileEnglishBlanks(base: string, other: string): string {
  const text = base.replace(/\r\n?/g, "\n");
  const second = other.replace(/\r\n?/g, "\n").trim();
  if (!text.trim() || !second) return base;
  const own = split(text);
  const read = split(second);
  if (own.tokens.length * read.tokens.length > CELLS) return base;
  const list = hunksOf(own.tokens.map(normalize), read.tokens.map(normalize));
  const big = list
    .filter((hunk) => hunk.a.length > BLOCK || hunk.b.length > BLOCK)
    .reduce((sum, hunk) => sum + Math.max(hunk.a.length, hunk.b.length), 0);
  if (big > own.tokens.length * REORDER_SHARE) return base;

  let changed = false;
  for (const hunk of list) {
    // 낱말 수가 같은 작은 덩이만 짝지어 본다
    if (!hunk.a.length || hunk.a.length !== hunk.b.length) continue;
    if (hunk.a.length > BLOCK) continue;
    hunk.a.forEach((at, k) => {
      const mine = own.tokens[at]!;
      const theirs = read.tokens[hunk.b[k]!]!;
      const mineBlank = BLANK.exec(mine);
      const theirsBlank = BLANK.exec(theirs);
      let next = mine;
      if (mineBlank && theirsBlank) {
        // 규칙 1 — 가장 짧은, 비지 않은 앞 글자. 빈칸의 길이와 뒤는 밑글 것
        const prefixes = [mineBlank[1]!, theirsBlank[1]!].filter(Boolean);
        const prefix = prefixes.length
          ? prefixes.reduce((best, p) => (p.length < best.length ? p : best))
          : "";
        next = prefix + mineBlank[2]! + mineBlank[3]!;
      } else if (!mineBlank && theirsBlank && WORD.test(mine)) {
        // 규칙 2 — 밑글이 빈칸에 쓴 답을 낱말로 읽었다. 앞 글자가 맞을 때만(앞 글자 없는 빈칸으로는 낱말을 지우지 않는다)
        const prefix = theirsBlank[1]!;
        if (prefix && mine.toLowerCase().startsWith(prefix.toLowerCase()))
          next = theirs;
      }
      if (next !== mine) {
        own.tokens[at] = next;
        changed = true;
      }
    });
  }
  if (!changed) return base;
  return own.tokens.map((token, index) => token + own.gaps[index]!).join("");
}

/** 낱말의 첫 소리 — 첫 모음 앞의 자음 줄(sh · pr · h). 모음으로 시작하면 그 한 글자. 낱말 가운데의 y 는 모음으로 센다(dry → dr) */
function onset(prefix: string) {
  const at = [...prefix].findIndex(
    (letter, index) =>
      /[aeiou]/i.test(letter) || (index > 0 && /y/i.test(letter)),
  );
  if (at < 0) return prefix;
  return at === 0 ? prefix[0]! : prefix.slice(0, at);
}

const BLANK_WITH_PREFIX = /(^|[\s(])([A-Za-z]{1,6})(_{3,})/g;
/** 이만큼은 있어야 «그 글의 꼴»을 말할 수 있다 */
const PREFIX_SAMPLE = 5;
/** 앞 글자가 첫 소리뿐인 빈칸이 이만큼을 넘으면, 나머지는 손글씨가 섞인 것으로 본다 */
const PREFIX_SHARE = 0.7;

export function polishEnglishReadText(text: string): string {
  let out = text.replace(/\r\n?/g, "\n");
  // a. 이름 줄의 반 · 번 앞 숫자
  out = out
    .split("\n")
    .map((line) =>
      line.length < 120 && /학년/.test(line) && /이름/.test(line)
        ? line.replace(/(^|[\s(|])\d{1,2}\s*(반|번)(?=[\s:)]|$)/g, "$1$2")
        : line,
    )
    .join("\n");
  // b. 유독 긴 빈칸 앞 글자
  const found = [...out.matchAll(BLANK_WITH_PREFIX)];
  if (found.length >= PREFIX_SAMPLE) {
    const plain = found.filter((match) => match[2] === onset(match[2]!));
    if (plain.length / found.length >= PREFIX_SHARE)
      out = out.replace(
        BLANK_WITH_PREFIX,
        (_whole, lead: string, prefix: string, blank: string) =>
          lead + onset(prefix) + blank,
      );
  }
  return out;
}
