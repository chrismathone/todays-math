# -*- coding: utf-8 -*-
"""elem56 검산기 변이 시험 — 판정 파일 사본을 하나씩 망가뜨려 build 가 **빨개지는지** 본다.

«가드가 0을 내면 없다가 아니라 못 센다일 수 있다»(20번 교훈) — 검산이 통과만 해서는 무는지 모른다.
변이 다섯, 모두 build --dry 가 실패하고 기대한 까닭 줄이 나와야 한다. 원본 판정 파일은 건드리지 않는다.
교재 문장은 이 파일에 적지 않는다 — 저장소 밖 원문 파일에서 읽어 바꾼다.

실행(저장소 뿌리): python scripts/qa/concept-terms/mutate-check-elem56.py --cards <카드.json> --scratch <작업 폴더>
"""
from __future__ import annotations

import argparse
import copy
import importlib.util
import json
import os
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).parent
CUR = HERE / "terms-elem56.json"

spec = importlib.util.spec_from_file_location("ex", HERE / "extract-terms-elem56.py")
ex = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ex)


def raw_segment(key: str, sentence: str) -> str:
    """자리표시가 든 문장이 글자층에서 실제로 걸리는 조각(깨진 분수 숫자 그대로)."""
    grade, page, _ = key.split("/", 2)
    book = ex.load_book(grade)
    stream, _ = ex.page_stream(book["pages"][int(page[1:])])
    m = ex.sentence_regex(sentence).search(stream)
    assert m, key
    return stream[m.start() : m.end()]


def mutations(cur: dict, text: dict) -> list[tuple[str, dict, dict, str]]:
    out = []
    t = copy.deepcopy(text)
    k = "5-1/p030/약수"
    assert t["sentences"][k].endswith("합니다.")
    t["sentences"][k] = t["sentences"][k][: -len("합니다.")] + "부릅니다."
    out.append(("지어낸 문장(약수 끝말 바꿈)", cur, t, "문장이 글자층에 없음"))
    c = copy.deepcopy(cur)
    c["terms"] = [x for x in c["terms"] if x["key"] != "5-1/p070/기약분수"]
    t = copy.deepcopy(text)
    del t["sentences"]["5-1/p070/기약분수"]
    out.append(("용어 빼기(기약분수)", c, t, "미판정"))
    c = copy.deepcopy(cur)
    del c["zeroSections"]["5-1"]["2-4"]
    out.append(("0개 판정 빼기(5-1 2-4)", c, text, "용어 0개 소단원 판정 없음"))
    t = copy.deepcopy(text)
    k = "5-1/p076/분수와 소수의 관계"
    t["sentences"][k] = raw_segment(k, t["sentences"][k])
    out.append(("분수 줄을 자리표시 없이(5-1 p76)", cur, t, "자리표시가 없음"))
    c = copy.deepcopy(cur)
    c["terms"][0]["sentence"] = "원문 한 줄"
    out.append(("저장소 판정 파일에 원문 칸이 생김", c, text, "저장소 판정 파일에 원문 문장이 있다"))
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--cards", required=True)
    ap.add_argument("--scratch", required=True)
    ap.add_argument("--data", default=str(ex.DATA_DIR))
    a = ap.parse_args()
    ex.CACHE_DIR = Path(a.scratch) / "elem56-cache"
    cur = json.loads(CUR.read_text(encoding="utf-8"))
    text = json.loads((Path(a.data) / ex.TEXT_NAME).read_text(encoding="utf-8"))
    scratch = Path(a.scratch)
    muts = mutations(cur, text)
    bad = 0
    for i, (name, c, t, expect) in enumerate(muts, 1):
        cp, tp = scratch / f"elem56-mutant-{i}-cur.json", scratch / f"elem56-mutant-{i}-text.json"
        cp.write_text(json.dumps(c, ensure_ascii=False), encoding="utf-8")
        tp.write_text(json.dumps(t, ensure_ascii=False), encoding="utf-8")
        r = subprocess.run(
            [sys.executable, str(HERE / "extract-terms-elem56.py"), "build", "--dry", "--cards", a.cards,
             "--scratch", a.scratch, "--curation", str(cp), "--text", str(tp)],
            capture_output=True, text=True, encoding="utf-8", env={**os.environ, "PYTHONIOENCODING": "utf-8"},
        )
        bit = r.returncode != 0 and expect in r.stdout
        bad += not bit
        print(f"{'RED(문다)' if bit else '🔴 초록(안 문다)'} · {name} · 종료 {r.returncode} · 기대 «{expect}» {'있음' if expect in r.stdout else '없음'}")
        tp.unlink()  # 원문 사본은 남기지 않는다
    print("변이", len(muts), "· 안 문 것", bad)
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
