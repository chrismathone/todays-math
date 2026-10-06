/** 읽은 글 견주기 — 낱말 단위. 표기만 다른 것(굽은 따옴표 · 빈칸 길이 · 굵게 표시)은 같게 본다. */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";

/** 제품 `cleanEnglishReadText` 와 같은 결(코드펜스 · 줄끝 · 빈 줄) — clean.ts 가 제품 함수로 만든 `.clean.txt` 가 있으면 그것을 쓴다 */
export function load(outDir, arm, run, stem) {
  const dir = path.join(outDir, arm, `run${run}`);
  const clean = path.join(dir, `${stem}.clean.txt`);
  const raw = path.join(dir, `${stem}.txt`);
  if (existsSync(clean)) return readFileSync(clean, "utf8");
  if (existsSync(raw)) return readFileSync(raw, "utf8");
  return null;
}

export function stems(outDir, arm, run) {
  const dir = path.join(outDir, arm, `run${run}`);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(
      (name) => name.endsWith(".txt") && !/\.(clean|error)\.txt$/.test(name),
    )
    .map((name) => name.slice(0, -4))
    .sort();
}

export function tokens(text) {
  return text
    .normalize("NFC")
    .replace(/[‘’`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\*\*/g, "")
    .replace(/_{3,}/g, " ____ ")
    .replace(/([①-⑳])/g, " $1 ")
    .replace(/[（]/g, "(")
    .replace(/[）]/g, ")")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .split(/\s+/)
    .filter(Boolean);
}

/** LCS 로 두 낱말 줄을 맞춘다 → 다른 덩이 목록 [{ at, a:[…], b:[…] }] (at = a 쪽 자리) */
export function hunks(a, b) {
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] =
        a[i] === b[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = [];
  let i = 0;
  let j = 0;
  let cur = null;
  const flush = () => {
    if (cur) out.push(cur);
    cur = null;
  };
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) {
      flush();
      i++;
      j++;
    } else if (j < m && (i === n || dp[i][j + 1] >= dp[i + 1][j])) {
      cur ??= { at: i, bAt: j, a: [], b: [] };
      cur.b.push(b[j++]);
    } else {
      cur ??= { at: i, bAt: j, a: [], b: [] };
      cur.a.push(a[i++]);
    }
  }
  flush();
  return out;
}

/** 덩이를 앞뒤 낱말과 함께 한 줄로 */
export function show(a, hunk, pad = 5) {
  const before = a.slice(Math.max(0, hunk.at - pad), hunk.at).join(" ");
  const after = a
    .slice(hunk.at + hunk.a.length, hunk.at + hunk.a.length + pad)
    .join(" ");
  return `… ${before} [A: ${hunk.a.join(" ") || "∅"}] [B: ${hunk.b.join(" ") || "∅"}] ${after} …`;
}
