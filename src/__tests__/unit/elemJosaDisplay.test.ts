/**
 * 초등 지면의 조사 어긋남 — 원장님 2026-10-20 «한 번에 최고 품질로» 의 전수 검사에서 찾은 것.
 * «학생들의 좋아하는 계절» · «배구을» · «역사이 아닌» · «창고과» · «직선 라이» · «꿀으로» · «장소은» …
 *
 * 문형 하나씩 박지 않고 **초등 전 문형 × 씨앗**의 발문(수식 밖 글)을 받침으로 다시 읽는다 —
 * 새 문형이 같은 꼴을 내도 여기서 운다. 참은 글자의 받침에서 센다(생성기의 `josa` 를 되부르지 않는다).
 * 수식 뒤 조사(`$4$를`)는 `rules.ts` `josaFaults` 소관이라 여기서는 수식을 지우고 본다.
 * 전수 집계: `display-survey/scripts/josa-scan.mjs`(저장소 밖).
 */
import { describe, expect, it } from "vitest";

import { josa } from "@/lib/elementary/format";
import {
  elementaryUnits,
  generateElementaryForm,
  generateElementaryProblem,
  listedForms,
  supportedTiers,
} from "@/lib/elementary/generate";

const SEEDS = Array.from({ length: 10 }, (_, s) => 20260825 + s * 1009);

const final = (ch: string) => {
  const c = ch.charCodeAt(0) - 0xac00;
  return c < 0 || c > 11171 ? -1 : c % 28;
};

/** 낱말이 그 글자로 끝나 조사처럼 보이는 것(가을 · 사과 · 그은 …). */
const WORDS = new Set(["등산로", "초과", "가을", "마을", "사과", "결과", "효과", "성과", "교과", "나은", "지은", "이은", "그은", "모은", "부은", "짝지은", "그을", "지을", "다은", "만큼은", "조금은"]);
const PARTICLE = /([가-힣]+?)(을|를|과|와|은|으로|로)(?=[\s.,?!)」』]|$)/g;

export function josaMismatches(content: string): string[] {
  const plain = content.replace(/\$[^$]*\$/g, " ⟨식⟩ ");
  const out: string[] = [];
  for (const m of plain.matchAll(PARTICLE)) {
    const [whole, word, p] = m as unknown as [string, string, string];
    if (WORDS.has(whole) || WORDS.has(whole.slice(-3)) || WORDS.has(whole.slice(-2))) continue;
    const f = final(word.at(-1)!);
    if (f < 0) continue;
    const has = f !== 0;
    const bad =
      (p === "을" && !has) ||
      (p === "를" && has) ||
      (p === "과" && !has) ||
      (p === "와" && has) ||
      (p === "은" && !has) ||
      (p === "으로" && (!has || f === 8)) ||
      (p === "로" && has && f !== 8 && !/(서|새|따|주|대체|실제|차례|스스|반대|그대|제대|마음대|순서대|아래|위|뒤)$/.test(word));
    if (bad) out.push(whole);
  }
  for (const m of plain.matchAll(/([가-힣]+)(이|가) (아닌|수직|직각)/g)) {
    const f = final(m[1]!.at(-1)!);
    if (f >= 0 && (m[2] === "이") === (f === 0)) out.push(`${m[1]}${m[2]} ${m[3]}`);
  }
  // 관형절의 주어에 «의» — «학생들의 좋아하는 계절» → «학생들이 좋아하는 계절»
  for (const m of plain.matchAll(/들의 (좋아하는|즐겨 읽는|학교에 오는)/g)) out.push(m[0]);
  // 조사 앞 띄움 — «가, 나, 다 에서» · «$45$초 에서» · «$36$분 과» · «$38$분 을»
  for (const m of plain.matchAll(/(?:(?<=[\s,])[가나다라마바사아자차카타파하]|⟩ (?:시간|분|초)) (에서|에게|의|과|와|을|를|은|는) /g)) out.push(m[0]);
  return out;
}

describe("초등 전 문형 · 난이도 — 발문 조사", () => {
  it("판정기 자체: 결함 꼴은 잡고 멀쩡한 꼴은 놓는다", () => {
    expect(josaMismatches("학생들의 좋아하는 계절을 조사하여")).toEqual(["들의 좋아하는"]);
    expect(josaMismatches("배구을 고르지 않은 · 창고과 부피가 · 꿀으로 한 사람")).toEqual(["배구을", "창고과", "꿀으로"]);
    expect(josaMismatches("역사이 아닌 나머지 · 직선 라이 수직으로")).toEqual(["역사이 아닌", "라이 수직"]);
    expect(josaMismatches("가, 나, 다 에서 직각인 것")).toEqual(["다 에서 "]);
    expect(josaMismatches("$2$시간 $36$분 과 $2$시간 $14$분 에서 분끼리만")).toEqual(["⟩ 분 과 ", "⟩ 분 에서 "]);
    expect(josaMismatches("$2$시간 $36$분과 $2$시간 $14$분에서 · 등산로 · 마을 사람")).toEqual([]);
    expect(josaMismatches("학생들이 좋아하는 계절을 · 배구를 · 창고와 · 꿀로 · 역사가 아닌 · 직선 라가 수직으로 · 가을과 사과 · 선분을 그은")).toEqual([]);
  });

  it("josa 는 «(으)로» 에서 ㄹ 받침도 «로» 로 고른다", () => {
    expect(josa("꿀", "으로", "로")).toBe("로");
    expect(josa("책", "으로", "로")).toBe("으로");
    expect(josa("꿀", "을", "를")).toBe("을");
  });

  it("문형 전부 × 씨앗 10 — 어긋남 0", () => {
    const bad: string[] = [];
    for (const unit of elementaryUnits())
      for (const form of listedForms(unit))
        for (const seed of SEEDS) {
          const p = generateElementaryForm(unit, seed, form.id);
          const hits = josaMismatches(p.content);
          if (hits.length) bad.push(`${unit.grade} ${unit.section} 문형${form.id} s${seed}: ${hits.join(" · ")}`);
        }
    expect(bad.slice(0, 20), `${bad.length}건`).toEqual([]);
  });

  it("난이도 경로 전부 × 씨앗 10 — 어긋남 0", () => {
    const bad: string[] = [];
    for (const unit of elementaryUnits()) {
      const tiers = supportedTiers(unit);
      if (tiers.length === 0) continue;
      for (const t of [undefined, ...tiers])
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(unit, seed, t as never);
          const hits = josaMismatches(p.content);
          if (hits.length) bad.push(`${unit.grade} ${unit.section} ${t ?? "-"} s${seed}: ${hits.join(" · ")}`);
        }
    }
    expect(bad.slice(0, 20), `${bad.length}건`).toEqual([]);
  });
});

describe("그림그래프 — 범례가 답이면 «□ = ?»", () => {
  it("초3 2-6-1 «□ 한 칸은 몇 …을 나타냅니까?» 는 범례의 수를 숨긴다", () => {
    const unit = elementaryUnits().find((u) => u.grade === "초3" && u.section.startsWith("2-6-1"))!;
    const forms = listedForms(unit);
    let seen = 0;
    for (const form of forms)
      for (const seed of SEEDS) {
        const p = generateElementaryForm(unit, seed, form.id);
        if (!/□ 한 칸은 몇 /.test(p.content)) continue;
        seen += 1;
        expect(p.figureSpec, `문형${form.id}`).toMatchObject({ kind: "pictograph", hideUnit: true });
      }
    expect(seen).toBeGreaterThan(0);
  });
});
