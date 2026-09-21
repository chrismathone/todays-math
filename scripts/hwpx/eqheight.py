"""Height and baseline of an HWP equation box as Hancom lays it out (HYhwpEQ), without Hancom.

``eqsize`` gives the box **width**; this gives its **height** and **baseline**. Hancom never
re-measures an equation when it opens an HWPX file — it keeps ``<hp:sz>`` and ``baseLine`` and
draws the equation at its natural size from the top of that box. The writer used to copy the
KaTeX box: Hancom's fraction is 2.30 lines tall against KaTeX's ~2.0, so with the writer's FIXED
line height the fraction ran over the next line (원장님 2026-09-21 «줄간격이 왜 이렇게 타이트하지»).

Every rule below was read off Hancom's own measurements (COM, ``eq_measure.py`` of mathg-gen:
22 font sizes × probe equations + 3,000 exam equations, each with ``h`` and ``baseLine``).

* A glyph row is one line ``L = round(pt * 4/3) px`` tall (whole pixels), baseline at 86%.
  Gaps and the math axis do not snap to pixels: they are fractions of 1 em (``pt * 100``).
* Fraction: numerator box + denominator box + 0.30 em; the bar sits on the axis, 0.368 em up.
  (``{1} over {2}`` = ``2 L + 0.3 em`` — 2415 at 10.5pt and 2768 at 12.25pt, both exact.)
* Root: content + 0.14 em above, 0.01 em below.
* Scripts are set at ``pt * 0.682`` (their line is ``round(pt * 0.682 * 4/3) px``). What is fixed
  is the **near edge** of the script box — a superscript's bottom, a subscript's top — so a
  fraction in an exponent grows upward (``x^{{1} over {2}}``). Under ``lim``/``SUM`` the scripts
  stack below / above the operator instead.
* Matrix / CASES / PILE: row boxes stacked with 0.15 em between them, centred on the axis.
* Accents add 0.2 em above (``underline`` below); LEFT … RIGHT fences add nothing.
* ``root {n} of {x}``: ``eqsize`` reads the index and throws it away (the width does too). There is no
  Hancom measurement of an indexed root, so the index is set like a superscript on a one-line base —
  an estimate on the tall side: a box that is too tall only opens the line a little, one that is too
  short lets the equation cover the next line.
"""
import math

from eqsize import _Parser, _SCRIPT_RATIO

_ASCENT = .86          # baseline of a glyph row, from its top
_AXIS = .368           # math axis above the baseline (em)
_FRACTION_PAD = .15    # bar to numerator / denominator box (em)
_ROW_GAP = .15         # between matrix rows (em)
_ROOT_OVER, _ROOT_UNDER = .14, .01
_BOX_OVER, _BOX_UNDER = .076, .124
_SUP_RISE = .455       # superscript baseline above the base baseline (em)
_SUB_DROP = .254       # subscript baseline below the base baseline (em)
_ACCENT = .2           # an accent above, or an underline below, the line box (em)
_UNDER_ACCENTS = {"under", "underline", "UNDERLINE"}
_ARCH_UNDER = .061
# Operators drawn larger than a line: (above, below) the line box in em.
_BIG = {name: (.183, .169) for name in ("SUM", "PROD", "COPROD", "BIGCAP", "BIGCUP", "INTER", "UNION")}
_BIG.update({name: (.416, .511) for name in ("INT", "DINT", "TINT", "OINT", "ODINT", "OTINT")})
_BIG.update({name: (.125, .120) for name in ("lim", "Lim")})
# Their scripts are limits: stacked under / over the operator, not set beside it.
_LIMITS = {"SUM", "PROD", "COPROD", "BIGCAP", "BIGCUP", "INTER", "UNION", "lim", "Lim"}


class _HeightParser(_Parser):
    """``_Parser`` that keeps the index of ``root {n} of {x}`` — ``eqsize`` drops it."""

    def keyword(self, word, style):
        if word != "root":
            return super().keyword(word, style)
        index = self.atom(style)
        if self.peek() == "of":
            self.take()
        return [("root", index, self.atom(style))]


def _line_px(pt):
    return max(1, math.floor(pt * 4 / 3 + .5))


def _line(pt):
    """(ascent, descent) of one glyph row in HWPUNIT."""
    height = _line_px(pt) * 75
    ascent = _ASCENT * height
    return ascent, height - ascent


def _stack(rows, pt):
    """Row boxes stacked and centred on the math axis (matrix, CASES, a multi-row group)."""
    em = 100 * pt
    total = sum(sum(_extent(row, pt)) for row in rows) + _ROW_GAP * em * max(0, len(rows) - 1)
    ascent = total / 2 + _AXIS * em
    return ascent, total - ascent


def _rows(rows, pt):
    rows = [row for row in rows if row] or [[]]
    return _extent(rows[0], pt) if len(rows) == 1 else _stack(rows, pt)


def _name(item):
    return item[1] if item[0] in ("glyph", "func") else None


def _script(item, pt):
    em = 100 * pt
    line = _line(pt)
    base = line if item[1][0] == "bare" else _item(item[1], pt)
    ascent, descent = base
    small = pt * _SCRIPT_RATIO
    small_line = _line(small)
    if _name(item[1]) in _LIMITS:
        if item[2]:
            ascent += sum(_extent(item[2], small))
        if item[3]:
            descent += sum(_extent(item[3], small))
        return ascent, descent
    if item[2]:
        # bottom of the superscript box above the baseline, then the whole box on top of it
        bottom = base[0] - line[0] + _SUP_RISE * em - small_line[1]
        ascent = max(ascent, bottom + sum(_extent(item[2], small)))
    if item[3]:
        top = base[1] - line[1] + _SUB_DROP * em - small_line[0]
        descent = max(descent, top + sum(_extent(item[3], small)))
    return ascent, descent


def _item(item, pt):
    em = 100 * pt
    kind = item[0]
    if kind == "group":
        return _rows(item[1], pt)
    if kind == "frac":
        numerator, denominator = _extent(item[1], pt), _extent(item[2], pt)
        ascent = (_AXIS + _FRACTION_PAD) * em + sum(numerator)
        descent = sum(denominator) + (_FRACTION_PAD - _AXIS) * em
        return ascent, descent
    if kind == "sqrt":
        ascent, descent = _extent(item[1], pt)
        return ascent + _ROOT_OVER * em, descent + _ROOT_UNDER * em
    if kind == "root":
        ascent, descent = _item(("sqrt", item[2]), pt)
        index, _ = _script(("script", ("bare",), item[1], []), pt)
        return max(ascent, index), descent
    if kind == "script":
        return _script(item, pt)
    if kind == "fence":
        return _rows(item[2], pt)
    if kind == "accent":
        ascent, descent = _extent(item[2], pt)
        if item[1] in _UNDER_ACCENTS:
            return ascent, descent + _ACCENT * em
        return ascent + _ACCENT * em, descent + (_ARCH_UNDER * em if item[1] == "arch" else 0)
    if kind == "box":
        ascent, descent = _extent(item[1], pt)
        return ascent + _BOX_OVER * em, descent + _BOX_UNDER * em
    if kind == "matrix":
        return _stack([[cell for cell in row if cell[0] != "cell"] for row in item[2]], pt)
    ascent, descent = _line(pt)
    over, under = _BIG.get(_name(item), (0, 0))
    return ascent + over * em, descent + under * em


def _extent(items, pt):
    """(ascent, descent) in HWPUNIT of a run of items; an empty run is one line."""
    ascent, descent = _line(pt)
    for item in items:
        if item[0] in ("restart", "cell"):
            continue
        a, d = _item(item, pt)
        ascent, descent = max(ascent, a), max(descent, d)
    return ascent, descent


def hwpeq_extent(script: str, base_unit: int):
    """``(height, baseline)`` Hancom gives ``script`` at ``base_unit`` (1000 = 10pt).

    ``height`` is in HWPUNIT, ``baseline`` the percentage of it above the text baseline — the two
    values of ``<hp:sz height>`` and ``<hp:equation baseLine>``.
    """
    pt = max(base_unit, 1) / 100
    ascent, descent = _rows(_HeightParser(script).sequence(), pt)
    height = max(1, round(ascent + descent))
    return height, max(0, min(100, round(100 * ascent / (ascent + descent))))
