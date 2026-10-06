/** 채점 공용 — 견주기 전 고르기 · 기준 글의 «있어도 없어도 되는 글» · 덩이 가르기. score.mjs 와 matrix.mjs 가 같이 쓴다. */
import { existsSync, readFileSync } from "node:fs";

import { tokens } from "./lib.mjs";

/** 견주기 전에 한 번 더 고르게 — 빈칸 뒤 문장부호 · 번호 뒤 문장부호 · 물결과 쌍점 둘레의 띄어쓰기 */
export function norm(text) {
  return (
    text
      .replace(/[～〜∼]/g, "~")
      .replace(
        /[㉠-㉭]/g,
        (ch) =>
          ` (${"ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ"[ch.charCodeAt(0) - 0x3260]}) `,
      )
      // 괄호 낱자(㈀ …)도 같은 번호다
      .replace(
        /[㈀-㈍]/g,
        (ch) =>
          ` (${"ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ"[ch.charCodeAt(0) - 0x3200]}) `,
      )
      .replace(/\(\s*([ㄱ-ㅎ])\s*\)/g, " ($1) ")
      .replace(/[•∙‧・ㆍ]/g, "·")
      .replace(/●/g, " ")
      // «읽을 수 없음» 표시는 글이 아니다 — 걷고 잰다(그 자리에 있어야 할 인쇄 글자가 빠졌으면 «빠짐»으로 그대로 잡힌다)
      .replace(/\[\?\][.,]?/g, " ")
      .replace(/ \| /g, " ")
      .replace(/(\d)\s+(학년|반|번|호)/g, "$1$2")
      .replace(/(\d)\s*[-~]\s*(\d)/g, "$1~$2")
      .replace(/(\(\d+\))\s*([.,?!])/g, "$1 $2")
      .replace(/_{3,}\s*([.,?!])/g, "____ $1")
      .replace(/~\s+/g, "~")
      .replace(/\s*[:：]\s*/g, " : ")
      .replace(/\s*\/\s*/g, " / ")
      .replace(/\s*⇒\s*/g, " ⇒ ")
      .replace(/\s*→\s*/g, " ⇒ ")
      .replace(/\s*=>\s*/g, " ⇒ ")
  );
}

export function refTokens(text) {
  const out = [];
  const optional = [];
  let inside = false;
  for (const part of norm(text).split(/(⟦|⟧)/)) {
    if (part === "⟦") inside = true;
    else if (part === "⟧") inside = false;
    else
      for (const token of tokens(part)) {
        out.push(token);
        optional.push(inside);
      }
  }
  return { out, optional };
}

export function classify(list, optional) {
  const kept = [];
  for (const hunk of list) {
    // hunk.a = 모델 글, hunk.b = 기준 글. 기준 쪽의 «없어도 되는 글»은 걷는다
    const need = hunk.b.filter((_, k) => !optional[hunk.bAt + k]);
    if (!hunk.a.length && !need.length) continue;
    if (hunk.a.join("") === need.join("")) continue;
    kept.push({ ...hunk, b: need });
  }
  // 옮김 — 더한 덩이와 빠진 덩이의 글이 같다(셋 이상)
  const added = kept.filter((h) => h.a.length >= 3 && !h.b.length);
  const missing = kept.filter((h) => h.b.length >= 3 && !h.a.length);
  const moved = new Set();
  const overlap = (x, y) => {
    const set = new Set(y);
    return x.filter((t) => set.has(t)).length / Math.max(x.length, y.length);
  };
  for (const plus of added) {
    const match = missing.find(
      (minus) => !moved.has(minus) && overlap(plus.a, minus.b) >= 0.8,
    );
    if (match) {
      moved.add(match);
      moved.add(plus);
      plus.kind = "옮김";
      match.kind = "옮김(짝)";
    }
  }
  for (const hunk of kept)
    hunk.kind ??= !hunk.b.length ? "더함" : !hunk.a.length ? "빠짐" : "바뀜";
  return kept;
}

/** 쪽마다 세지 않는 낱말 — ref/<사진>.ignore 의 정규식. 모델 글과 기준 글 양쪽에서 걷는다 */
export function ignoreOf(refDir, stem) {
  const file = `${refDir}/${stem}.ignore`;
  return existsSync(file)
    ? new RegExp(readFileSync(file, "utf8").trim())
    : null;
}
export function dropIgnored(ref, re) {
  if (!re) return ref;
  const out = [];
  const optional = [];
  ref.out.forEach((token, i) => {
    if (re.test(token)) return;
    out.push(token);
    optional.push(ref.optional[i]);
  });
  return { out, optional };
}
