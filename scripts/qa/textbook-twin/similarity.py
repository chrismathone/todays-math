# -*- coding: utf-8 -*-
"""쌍둥이가 원본과 «너무 닮았나» — 결정적 검사 (Codex 1회차 D · 2회차 A6 의 잠정 눈금).

문턱(잠정 — 사람 판정 100쌍 조정 · 100쌍 검증 전):
  글 겹침     상투 발문을 걷은 뼈대의 4글자 조각 가운데 원본에도 있는 몫 ≥0.50 보류 · 0.35~0.50 경고
  이어진 같은 글  최장 공통 문자열 ≥20자 보류
  짧은 글      상투 발문을 걷고 남은 글이 40자 미만이면 겹침 몫 대신 «손 판정»(몫이 뜻이 없다 — 이어진 같은 글 규칙은 그대로)
  같은 수      원본의 수(겹침 없이 · 0 · 1 포함) 가운데 쌍둥이에 있는 몫 ≥0.60 — 수가 셋 이상이면 보류 · 하나 둘이면 경고
  같은 정답    경고
문턱 아래라도 자동 통과가 아니다 — 검수자의 «distinctPresentation» 판정을 따로 받는다.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "textbook-verify"))

from skeleton import FIGURE, skeleton  # noqa: E402

GRAM = 4
OVERLAP_HOLD, OVERLAP_WARN = 0.50, 0.35
RUN_HOLD = 20
SHORT = 40
RETENTION = 0.60

#: 상투 발문 — 어느 문항에나 오는 말이라 겹쳐도 베낀 것이 아니다(뼈대 꼴 · 띄어쓰기 없음)
STOCK = [
    "다음중옳은것은", "다음중옳지않은것은", "옳은것을모두고르면", "옳은것을모두고르시오", "옳지않은것을모두고르면",
    "다음물음에답하시오", "다음을구하시오", "다음을계산하시오", "다음식을간단히하시오", "다음그림에서", "다음그림과같이",
    "의값을구하시오", "의값은", "의크기를구하시오", "의크기는", "의길이를구하시오", "의길이는", "의넓이를구하시오", "의넓이는",
    "을구하시오", "를구하시오", "구하시오", "고르시오", "이때", "단", "일때", "이다", "이고", "에대하여", "를만족시키는",
    "의해를구하시오", "의해는", "풀이과정과답을쓰시오", "풀이과정을쓰고답을구하시오", "나타내시오", "의확률을구하시오", "의확률은",
    "의개수를구하시오", "의개수는", "경우의수를구하시오", "경우의수는", "몇가지", "인가", "는가",
]
_STOCK = re.compile("|".join(sorted(map(re.escape, STOCK), key=len, reverse=True)))


def residual(text: str, source: str) -> str:
    strict = skeleton(text, source=source).strict.replace(FIGURE, "")
    return _STOCK.sub("", strict)


def grams(text: str) -> set[str]:
    return {text[i:i + GRAM] for i in range(len(text) - GRAM + 1)}


def longest_common_run(a: str, b: str) -> int:
    best = 0
    previous = [0] * (len(b) + 1)
    for i in range(1, len(a) + 1):
        current = [0] * (len(b) + 1)
        for j in range(1, len(b) + 1):
            if a[i - 1] == b[j - 1]:
                current[j] = previous[j - 1] + 1
                best = max(best, current[j])
        previous = current
    return best


def numbers(text: str, source: str) -> list[str]:
    return list(skeleton(text, source=source).numbers)


def judge(original: str, original_source: str, twin: str, *, original_answer: str = "", twin_answer: str = "") -> dict:
    """원본(source = latex | hwp)과 쌍둥이(LaTeX)를 견준다 — 수치와 판정(pass · warn · hold · manual)과 까닭."""
    a, b = residual(original, original_source), residual(twin, "latex")
    twin_grams = grams(b)
    overlap = len(twin_grams & grams(a)) / len(twin_grams) if twin_grams else 0.0
    run = longest_common_run(a, b)
    params = sorted(set(numbers(original, original_source)))
    have = set(numbers(twin, "latex"))
    retention = sum(1 for n in params if n in have) / len(params) if params else 0.0
    same_answer = bool(original_answer) and skeleton(original_answer, source=original_source).strict == skeleton(
        twin_answer, source="latex").strict
    reasons, verdict = [], "pass"

    def mark(level: str, why: str) -> None:
        nonlocal verdict
        reasons.append(why)
        rank = {"pass": 0, "warn": 1, "manual": 2, "hold": 3}
        if rank[level] > rank[verdict]:
            verdict = level

    if len(b) < SHORT:
        # 짧은 글은 조각 «몫»이 뜻이 없다(Codex 1회차 D) — 몫은 남기고 판정은 사람(검수자)에게
        mark("manual", f"상투 말을 걷은 글이 {len(b)}자")
    elif overlap >= OVERLAP_HOLD:
        mark("hold", f"글 겹침 {overlap:.2f}")
    elif overlap >= OVERLAP_WARN:
        mark("warn", f"글 겹침 {overlap:.2f}")
    # 이어진 같은 글은 길이와 상관없이 베낀 표시다
    if run >= RUN_HOLD:
        mark("hold", f"이어진 같은 글 {run}자")
    if retention >= RETENTION:
        mark("hold" if len(params) >= 3 else "warn", f"원본 수 {len(params)}개 가운데 {retention:.0%} 그대로")
    if same_answer:
        mark("warn", "정답이 원본과 같다")
    return {
        "verdict": verdict, "reasons": reasons, "overlap4": round(overlap, 3), "longestRun": run,
        "residualChars": len(b), "params": len(params), "numberRetention": round(retention, 3), "sameAnswer": same_answer,
    }
