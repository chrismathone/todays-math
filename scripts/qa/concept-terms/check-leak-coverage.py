# -*- coding: utf-8 -*-
"""교재 원문이 저장소로 새는지 잰다 — 트랙 coverage(14권 전부를 원천으로).

트랙 넷의 검사기(`check-no-source-text-elem34.py` · `check-leak-elem56.py` · `check-leak-gaenyeom-mida.py` ·
`audit-gaenyeom-leak-midb.py`)는 각자 자기 권만 원천으로 읽는다. 이 트랙 산출물(포함률 · 갈래 · 보정 문장)은
14권 전부에 걸치므로 원천을 모두 모아 같은 방식(12글자 창 · 한글 4자 이상)으로 잰다. 커밋 뒤에는 넷도 따로 돌린다.

원천(= 교재 글로 아는 것): 저장소 밖 `I-개념용어/*.json` 의 sentence · cite, 트랙 곁 파일(elem34 · elem56 · mida · midb)의
모든 글. 허용(= 저장소에 있어도 되는 말): 용어 이름 · 다른 표기 · 대단원/중단원/소단원 이름 · 목차 · 탐험 카드의 모든 글(우리 제품 글).
원천에서 허용 말을 걷어낸 나머지를 빈칸 없이 12글자 창으로 잘라, 대상(허용 말을 걷어낸 뒤)에서 찾는다.

🔴 카드 덤프는 **보정 전 원본 카드**여야 한다(`dump-explorer-cards-coverage.ts` 가 `definitionSourceCards` 를 내보낸다).
카드 글을 허용하므로, 보정(`card-sentence-fixes.json`)을 입은 카드를 덤프하면 보정 문장이 «카드 글»로 허용되어 검사가 눈먼다
(2026-09-28 리드 검토 ④ — 실제로 23장 전부가 그렇게 빠졌다). 그래서 보정 표의 새 글(원본 카드의 같은 칸과 다른 긴 칸)이 허용 말에
들어 있으면 멈춘다. 자기 시험은 ① 원문 한 문장을 심은 줄 ② 보정 표에 원문을 심은 판 ③ 보정을 입힌 덤프 — 셋 다 걸려야 통과.

사용:
  python check-leak-coverage.py --cards <카드.json> --files <파일...>
  python check-leak-coverage.py --cards <카드.json> --git main..HEAD      # 그 범위 커밋의 더한 줄 + 커밋 메시지
  python check-leak-coverage.py --cards <카드.json> --selftest           # 원문 한 문장을 심으면 잡히는지
종료 코드 0 = 원문 창 0.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

REPO = Path(__file__).resolve().parents[3]
DATA = Path(r"C:\Creative\testautocreator-data\I-개념용어")
FIXES = REPO / "docs" / "reference" / "concept-terms" / "card-sentence-fixes.json"
FIX_TEXT_FIELDS = ("definition", "exampleTitle", "trap", "explanation", "note")  # 허용 말로 들어가는 카드 칸
WIN = 12
MIN_HANGUL = 4
SEP = chr(0)


def norm(t: str) -> str:
    # 빈칸 표시 {..} 도 걷는다 — 카드 문장을 «{90} {도}»처럼 적어도 허용 문장(카드 글)과 같게 읽히게.
    return re.sub(r"[\s$«»‘’“”'\"`{}]", "", t)


def strings(x):
    """JSON 값 안의 글을 모두 꺼낸다."""
    if isinstance(x, str):
        yield x
    elif isinstance(x, dict):
        for v in x.values():
            yield from strings(v)
    elif isinstance(x, list):
        for v in x:
            yield from strings(v)


def load_sources_and_allowed(cards_path: Path):
    return load_sources_and_allowed_units(json.loads(cards_path.read_text(encoding="utf-8")))


def load_sources_and_allowed_units(units: list):
    src: list[str] = []
    allowed: set[str] = set()
    for f in sorted(DATA.glob("*.json")):
        d = json.loads(f.read_text(encoding="utf-8"))
        for t in d.get("terms", []):
            src += [t.get("sentence", ""), t.get("cite", "")]
            allowed.update([t["term"], *t.get("aliases", [])])
            for k in ("part", "chapter", "section"):
                if t.get(k):
                    allowed.add(t[k])
        for c in d.get("toc", []):
            for k in ("part", "chapter"):
                if c.get(k):
                    allowed.add(c[k])
                    allowed.add(re.sub(r"^\S+\.\s*", "", c[k]))
            allowed.update(c.get("sections", []))
            allowed.update(c.get("tocSections", []))
    # 트랙 곁 파일 — 판정용 교재 글(앵커 · 후보 · 버림 규칙)
    for f in [DATA / "elem34" / "terms-elem34-text.json", DATA / "elem34" / "census-elem34.json",
              DATA / "elem56" / "terms-elem56-text.json", DATA / "mida" / "gaenyeom-anchors-mida.json",
              DATA / "mida" / "census-highlight-mida.json"]:
        if f.exists():
            src += list(strings(json.loads(f.read_text(encoding="utf-8"))))
    for f in [DATA / "midb" / "terms-midb.tsv", DATA / "midb" / "rejects-midb.tsv"]:
        if f.exists():
            for line in f.read_text(encoding="utf-8").splitlines():
                src += line.split("\t")
    # 저장소 용어 JSON 의 이름들도 허용(저장소에 이미 있는 이름)
    for f in sorted((REPO / "docs" / "reference" / "concept-terms").glob("*-[0-9]-[0-9].json")):
        d = json.loads(f.read_text(encoding="utf-8"))
        for t in d["terms"]:
            allowed.update([t["term"], *t["aliases"], t.get("chapter", ""), t.get("section", ""), t.get("part", "") or ""])
    # 탐험 카드 글(우리 제품 글) — 온전한 글만. 말 조각 · 보기처럼 짧은 말(«같은» · «두 개»)은 넣지 않는다:
    # 원천에서 걷어내면 교재 문장이 잘게 부서져 창이 사라진다(자기 시험이 이것을 잡았다).
    for u in units:
        allowed.add(u["title"])
        for c in u["cards"]:
            allowed.update([c["name"], c["definition"], c["exampleTitle"], c["trap"], c["explanation"], c["note"]])
    allowed = {norm(a) for a in allowed if len(norm(a)) >= 2}
    return [s for s in src if s], allowed


def fix_new_texts(fixes: list, units: list) -> list[tuple[str, str, str]]:
    """보정 표의 새 글 — (카드 id, 칸, 글). 원본 카드(보정 전 덤프 `units`)의 같은 칸과 같으면 새 글이 아니다.
    보정 표는 원래 카드 글을 옮겨 적지 않는다(`current` 칸 없음 — 원래 글의 이어진 사본이 교재 표준 문구와 겹친다, 리드 검토 A2 ⑨)."""
    source = {c["id"]: c for u in units for c in u["cards"]}
    out = []
    for f in fixes:
        for k in FIX_TEXT_FIELDS:
            v = f["change"].get(k)
            if v and v != source.get(f["id"], {}).get(k) and len(norm(v)) >= WIN:
                out.append((f["id"], k, v))
    return out


def fixes_in_allowed(fixes: list, units: list, allowed_sorted: list[str]) -> list[tuple[str, str]]:
    """보정 표의 새 글이 허용 말에 들어 있으면 그 (카드 id, 칸) — 카드 덤프가 보정을 입었다는 뜻이다."""
    allowed = set(allowed_sorted)
    return [(i, k) for i, k, v in fix_new_texts(fixes, units) if norm(v) in allowed]


def dump_stop_reasons(fixes: list, units: list, allowed_sorted: list[str]) -> list[str]:
    """카드 덤프가 보정을 입었으면 멈출 까닭들 — main 과 자기 시험 ③ 이 같은 함수 · 같은 덤프 짝으로 쓴다(리드 검토 A2 M1).
    ⑴ 보정의 모든 change 칸이 덤프 카드와 같다 = 덤프가 이미 보정을 입었다(생성기 `build-card-fixes.py` 의 멈춤과 같은 기준).
       새 글의 기준도 덤프라, 보정 입은 덤프면 «새 글 0칸»이 되어 ⑵만으로는 눈먼다 — 그래서 ⑴이 먼저다.
    ⑵ 보정 새 글이 허용 말(카드 글)에 들어 있다."""
    source = {c["id"]: c for u in units for c in u["cards"]}
    reasons = [f"{f['id']}.change — 덤프 카드가 이 보정을 이미 입었다(보정 칸이 모두 같다)"
               for f in fixes if f["id"] in source and all(source[f["id"]].get(k) == v for k, v in f["change"].items())]
    reasons += [f"{i}.{k} — 보정 새 글이 허용 말에 있다" for i, k in fixes_in_allowed(fixes, units, allowed_sorted)]
    return reasons


def with_fixes(units: list, fixes: list) -> list:
    """카드 덤프에 보정을 입힌 판(자기 시험 ③ — 옛 덤프가 하던 일)."""
    by_id = {f["id"]: f["change"] for f in fixes}
    return [{**u, "cards": [{**c, **by_id.get(c["id"], {})} for c in u["cards"]]} for u in units]


def strip_allowed(t: str, allowed_sorted: list[str]) -> str:
    for a in allowed_sorted:
        if a in t:
            t = t.replace(a, SEP)
    return t


def windows_of(t: str) -> set[str]:
    out = set()
    for i in range(0, max(0, len(t) - WIN + 1)):
        w = t[i:i + WIN]
        if SEP in w:
            continue
        if len(re.findall(r"[가-힣]", w)) >= MIN_HANGUL:
            out.add(w)
    return out


def build(cards_path: Path):
    return build_units(json.loads(cards_path.read_text(encoding="utf-8")))


def build_units(units: list):
    src, allowed = load_sources_and_allowed_units(units)
    allowed_sorted = sorted(allowed, key=len, reverse=True)
    wins: set[str] = set()
    for s in src:
        wins |= windows_of(strip_allowed(norm(s), allowed_sorted))
    return wins, allowed_sorted, src


def scan(text: str, wins: set[str], allowed_sorted: list[str]) -> list[str]:
    hits = []
    for line in text.splitlines():
        t = strip_allowed(norm(line), allowed_sorted)
        found = [w for w in windows_of(t) if w in wins]
        if found:
            hits.append(f"{line.strip()[:120]}  ← {found[0]}")
    return hits


def git_added(rng: str) -> str:
    diff = subprocess.run(["git", "-C", str(REPO), "log", "-p", "--format=%B", rng],
                          capture_output=True, text=True, encoding="utf-8").stdout
    return "\n".join(l[1:] if l.startswith("+") and not l.startswith("+++") else l
                     for l in diff.splitlines() if (l.startswith("+") and not l.startswith("+++")) or not l.startswith(("-", " ", "@", "diff", "index", "---")))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cards", required=True)
    ap.add_argument("--files", nargs="*")
    ap.add_argument("--git")
    ap.add_argument("--selftest", action="store_true")
    a = ap.parse_args()
    units = json.loads(Path(a.cards).read_text(encoding="utf-8"))
    wins, allowed_sorted, src = build_units(units)
    fixes = json.loads(FIXES.read_text(encoding="utf-8"))["fixes"]
    print(f"원천 글 {len(src)} · 창 {len(wins)} · 허용 말 {len(allowed_sorted)} · 보정 새 글 {len(fix_new_texts(fixes, units))}칸")
    bad = 0
    # 카드 덤프가 보정을 입었으면 보정 문장이 허용 말이 되어 아래 검사가 눈먼다 — 먼저 멈춘다(리드 검토 ④).
    carried = dump_stop_reasons(fixes, units, allowed_sorted)
    # coverage.md 가 적은 «새 글 N칸»과 셈이 다르면 멈춘다 — 보정 입은 덤프면 셈이 0 으로 떨어진다(⑴과 겹치는 그물)
    doc = (REPO / "docs" / "reference" / "concept-terms" / "coverage.md").read_text(encoding="utf-8")
    said = {int(n) for n in re.findall(r"새 글 (\d+)칸", doc)}
    count = len(fix_new_texts(fixes, units))
    if said and said != {count}:
        carried.append(f"보정 새 글 {count}칸 — coverage.md 는 {sorted(said)}칸")
    print(f"덤프 멈춤 까닭: {len(carried)}" + (" — 🔴 카드 덤프가 보정을 입었거나 셈이 문서와 다르다. 원본 카드(definitionSourceCards)로 다시 뽑을 것" if carried else ""))
    for why in carried[:10]:
        print("   ", why)
    bad += len(carried)
    if a.selftest:
        planted = next(s for s in src if len(norm(s)) > 30 and len(re.findall(r"[가-힣]", s)) > 20)
        h1 = scan("우리 말 설명 " + planted, wins, allowed_sorted)
        h0 = scan("카드 문장은 우리 말로 새로 쓴다. 교재 문장은 저장소 밖에 둔다.", wins, allowed_sorted)
        print(f"자기 시험 ①: 원문을 심은 줄 → {len(h1)}줄 걸림 · 우리 말만 → {len(h0)}줄")
        if not h1 or h0:
            print("자기 시험 ① 실패")
            bad += 1
        # ② 보정 표(파일에 적히는 모양 그대로)의 한 칸에 원문을 심으면 걸리고, 지금 보정 표는 0 이어야 한다.
        planted_fixes = json.loads(json.dumps(fixes))
        planted_fixes[0]["change"]["definition"] = planted
        h2 = scan(json.dumps({"fixes": planted_fixes}, ensure_ascii=False, indent=1), wins, allowed_sorted)
        h2_clean = scan(json.dumps({"fixes": fixes}, ensure_ascii=False, indent=1), wins, allowed_sorted)
        print(f"자기 시험 ②: 보정 표에 원문을 심은 판 → {len(h2)}줄 걸림 · 지금 보정 표 → {len(h2_clean)}줄")
        if not h2 or h2_clean:
            print("자기 시험 ② 실패")
            bad += 1
        # ③ 보정을 입힌 덤프(옛 덤프가 하던 일)를 main 과 똑같이 넣으면(기준 · 허용 말 둘 다 그 덤프) 멈춤이 보정 전부를 잡아야 한다.
        fixed_units = with_fixes(units, planted_fixes)
        _, allowed_fixed, _ = build_units(fixed_units)
        c3 = dump_stop_reasons(planted_fixes, fixed_units, allowed_fixed)
        caught = {why.split(" ")[0].split(".")[0] for why in c3}
        print(f"자기 시험 ③: 보정을 입힌 덤프를 main 처럼 넣음 → 멈춘 보정 {len(caught)}장 / {len(planted_fixes)}장")
        if len(caught) != len(planted_fixes):
            print("자기 시험 ③ 실패")
            bad += 1
    for f in a.files or []:
        hits = scan(Path(f).read_text(encoding="utf-8"), wins, allowed_sorted)
        print(f"{f}: 원문 창 {len(hits)}줄")
        for h in hits[:20]:
            print("   ", h)
        bad += len(hits)
    if a.git:
        hits = scan(git_added(a.git), wins, allowed_sorted)
        print(f"git {a.git}: 원문 창 {len(hits)}줄")
        for h in hits[:20]:
            print("   ", h)
        bad += len(hits)
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
