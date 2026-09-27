# -*- coding: utf-8 -*-
"""트랙 mida 추출기의 울타리를 **일부러 망가뜨려** 정말 멈추는지 본다(18 §2-7).

    python scripts/qa/concept-terms/probe-gaenyeom-guards-mida.py

① 무엇을 하나: 판정 파일을 **메모리에서만** 바꿔(파일은 안 건드린다) build_all 을 돌리고, 멈춰야 할 때 멈추는지 센다.
   - M1 뺀 목록에서 한 줄을 지운다 → «미판정 후보»로 멈춰야 한다.
   - M2 넣은 용어의 find 를 그 쪽에 없는 글로 바꾼다 → «find 를 못 찾음»으로 멈춰야 한다.
   - M3 quote 한 글자를 바꾼다(지어낸 문장) → «quote 가 그 쪽 글에 없다»로 멈춰야 한다.
   - M4 용어를 개념 쪽이 아닌 쪽에 둔다 → «개념 쪽이 아니다»로 멈춰야 한다.
   - M5 수식 해독: 반직선 표시 `³`·중괄호 `{`·분수 속 `{` 를 넣으면 «AB³»(세제곱)·«(»·«9/5» 로 **읽히지 않아야** 한다.
   - M0 아무것도 안 바꾸면 멈추지 않아야 한다(울타리가 늘 닫혀 있는 «도장»이 아닌지).
② 왜: 울타리가 초록이기만 하면 장식일 수 있다(20 «변이 판정기가 도장이었다»).
③ 무엇을 안 바꾸나: 파일·N 드라이브·DB 모두 안 바꾼다.
"""
from __future__ import annotations

import copy
import importlib.util
import io
import sys
from contextlib import redirect_stdout
from dataclasses import replace
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import gaenyeom_curation_mida as C  # noqa: E402
import gaenyeom_pages_mida as P  # noqa: E402

spec = importlib.util.spec_from_file_location("ex", HERE / "extract-gaenyeom-terms-mida.py")
EX = importlib.util.module_from_spec(spec)
spec.loader.exec_module(EX)

C.load_anchors()  # 바깥 앵커를 먼저 채워야 원본 사본이 완전하다
ORIG_TERMS, ORIG_REJECT = copy.deepcopy(C.TERMS), dict(C.REJECT)


def run(label: str, expect_stop: str | None) -> bool:
    buf = io.StringIO()
    stopped = ""
    try:
        with redirect_stdout(buf):
            EX.build_all()
    except SystemExit as e:
        stopped = f"{e} {buf.getvalue()}"
    finally:
        C.TERMS.clear()
        C.TERMS.update(copy.deepcopy(ORIG_TERMS))
        C.REJECT.clear()
        C.REJECT.update(ORIG_REJECT)
    ok = (expect_stop is None and not stopped) or (expect_stop is not None and expect_stop in stopped)
    print(f"{'통과' if ok else '실패'} {label}: {'멈춤 — ' + stopped.strip()[:90] if stopped else '안 멈춤'}")
    return ok


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    results = [run("M0 그대로", None)]
    del C.REJECT["소인수분해하는방법"]
    results.append(run("M1 뺀 목록 한 줄 삭제", "미판정 후보"))
    t0 = C.TERMS["1-1"][0]
    C.TERMS["1-1"][0] = replace(t0, find="이런 글은 없다")
    results.append(run("M2 find 를 없는 글로", "find 를 못 찾음"))
    i = next(k for k, t in enumerate(C.TERMS["1-2"]) if t.quote)
    t = C.TERMS["1-2"][i]
    C.TERMS["1-2"][i] = replace(t, quote=t.quote.replace("하면", "하여"))
    results.append(run("M3 quote 한 낱말 바꿈", "quote 가 그 쪽 글에 없다"))
    C.TERMS["2-1"][0] = replace(C.TERMS["2-1"][0], page=14)  # p14 는 «개념원리 확인하기»
    results.append(run("M4 개념 쪽 밖", "개념 쪽이 아니다"))
    # M5 해독 — 그럴듯한 글자로 읽히면 안 되는 것
    def dec(parts):
        return P.decode_math("".join(P.premap(t, f) for t, f in parts))
    ray = dec([("AB", "EHsang-Bold"), ("³", "EHsang-Bold")])
    brace = dec([("{+", "EHsang-Italic"), (";2!;", "EHboNB-Italic"), ("}", "EHsang-Italic")])
    frac_x = dec([(";5{;", "EHboNB-Italic")])
    m5 = ray == ("→AB", False) and brace[1] and frac_x[1] and "9/5" not in frac_x[0]
    print(f"{'통과' if m5 else '실패'} M5 해독: 반직선 {ray} · 중괄호 {brace} · 분수 속 문자 {frac_x}")
    results.append(m5)
    print(f"{sum(results)}/{len(results)} 통과")
    return 0 if all(results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
