# -*- coding: utf-8 -*-
"""교과서 이관 — 그림과 그 자리를 문항에 단다(그림 문항 · 2026-10-08).

  python -m pytest scripts/import/textbook/test_figures.py -q

원장님 2026-10-08: «그림부터 그럼 싹 마무리할것». 한글 파일 안의 그림은 **이미지 파일 그대로** 들어 있다 —
오려 낼 것이 없다. 남은 일은 그 그림이 «어느 문항의 어디에» 놓였는지를 잃지 않는 것이다.

여기서 지키는 것:
  ① 번호가 있는 **첫 문단**의 그림을 버리지 않는다(전에는 버렸다 — «그림을 가리키는데 그림이 없는» 문항이 그렇게 생겼다)
  ② 그림의 자리 — 보기 번호 뒤의 그림이면 그 보기의 그림이다
  ③ 묶음 개체 안의 그림도 그림이다(따로 표시해 둔다 — 글상자와 함께 묶여 있어 파일만으로는 다 안 그려진다)
  ④ 번호 대신 쓴 작은 그림 · 글의 차례는 전과 한 글자도 다르지 않다
"""
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from xml.sax.saxutils import escape

sys.path.insert(0, str(Path(__file__).parent))

from hwpx_flow import _Walker, _mark_offsets  # noqa: E402
from segment import segment  # noqa: E402

NS = 'xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core"'


def paras_of(body: str):
    walker = _Walker()
    walker.walk(ET.fromstring(f"<hp:sec {NS}>{body}</hp:sec>"), 0)
    return walker.paras


def para(*runs: str) -> str:
    return "<hp:p>" + "".join(f"<hp:run>{run}</hp:run>" for run in runs) + "</hp:p>"


def t(text: str) -> str:
    return f"<hp:t>{escape(text)}</hp:t>"


def pic(name: str, width: int = 20000, height: int = 15000, extra: str = "", attrs: str = "") -> str:
    return (
        f'<hp:pic {attrs}><hp:sz width="{width}" height="{height}"/>{extra}'
        f'<hc:img binaryItemIDRef="{name}"/></hp:pic>'
    )


def test_the_place_of_a_picture_is_kept_without_changing_the_text():
    text, offsets = _mark_offsets("① " + chr(2) + " ② " + chr(2) + " ③" + chr(2))
    assert text == "① ② ③"
    assert offsets == [2, 4, 5]
    # 자리 글자가 없으면 글은 그대로다
    assert _mark_offsets("그림과 같이  삼각형") == ("그림과 같이  삼각형", [])


def test_a_picture_in_the_numbered_first_paragraph_belongs_to_that_problem():
    doc = segment(paras_of(
        para(t("01 오른쪽 그림에서 $x$의 값을 구하시오."), pic("image1"))
        + para(t("02 다음 중 옳은 것은?"))
        + para(t("① $1$"))
    ))
    first, second = doc.problems
    assert [fig.picture.bin_id for fig in first.figs] == ["image1"]
    assert first.marked_text == "오른쪽 그림에서 $x$의 값을 구하시오. [[FIG:0]]"
    assert second.figs == []
    # 글은 그림이 없을 때와 같다
    assert first.text == "오른쪽 그림에서 $x$의 값을 구하시오."


def test_a_picture_after_a_choice_number_is_that_choices_picture():
    doc = segment(paras_of(
        para(t("01 다음 중 정비례 관계의 그래프는?"))
        + para(t("① "), pic("image1"), t(" ② "), pic("image2"), t(" ③ "), pic("image3"))
    ))
    (problem,) = doc.problems
    assert problem.marked_text.split("\n")[1] == "① [[FIG:0]] ② [[FIG:1]] ③ [[FIG:2]]"
    assert problem.text.split("\n")[1] == "① ② ③"


def test_a_picture_alone_in_a_paragraph_stands_after_the_line_before_it():
    doc = segment(paras_of(
        para(t("01 다음 그림에서 $\\angle x$의 크기를 구하시오."))
        + para(pic("image7"))
        + para(t("(단, 점 O 는 원의 중심이다.)"))
    ))
    (problem,) = doc.problems
    assert problem.marked_text.split("\n") == [
        "다음 그림에서 $\\angle x$의 크기를 구하시오.",
        "[[FIG:0]]",
        "(단, 점 O 는 원의 중심이다.)",
    ]


def test_a_picture_inside_a_group_is_kept_and_marked_as_grouped():
    group = (
        "<hp:container>"
        + pic("image9", 30000, 20000)
        + "<hp:rect><hp:drawText><hp:subList>" + para(t("A")) + "</hp:subList></hp:drawText></hp:rect>"
        + "</hp:container>"
    )
    doc = segment(paras_of(para(t("01 그림과 같은 삼각형 ABC 의 넓이를 구하시오."), group)))
    (problem,) = doc.problems
    assert [(fig.picture.bin_id, fig.picture.grouped) for fig in problem.figs] == [("image9", True)]
    # 묶음 안의 그림은 `pictures`(글만으로 된 문항을 가리는 규칙이 보는 목록)에는 넣지 않는다
    assert problem.pictures == []
    assert problem.shapes == 1
    # 그림은 제가 든 묶음의 번호를 안다 — 장식뿐인 묶음(머리 띠)을 가릴 때 쓴다
    (shape,) = problem.shape_list
    assert shape[0] == "container" and shape[3] > 0
    assert problem.figs[0].picture.group == shape[3]


def test_a_small_picture_used_as_a_number_is_not_a_figure():
    doc = segment(paras_of(
        para(pic("num1", 1700, 2000), t("다음을 계산하시오."))
        + para(t("$3+4$"))
        + para(pic("num2", 1700, 2000), t("다음 그림의 넓이를 구하시오."), pic("image5"))
    ))
    assert [p.number for p in doc.problems] == [1, 2]
    assert doc.problems[0].figs == []
    assert [fig.picture.bin_id for fig in doc.problems[1].figs] == ["image5"]


def test_a_background_picture_and_a_clip_are_read():
    behind, clipped = paras_of(
        para(pic("bg", 59528, 79354, attrs='textWrap="BEHIND_TEXT"'), t("가"))
        + para(pic("c", 20000, 10000, extra='<hp:imgClip left="0" top="150" right="1500" bottom="750"/>'), t("나"))
    )
    assert behind.pictures[0].behind is True
    assert clipped.pictures[0].behind is False
    assert clipped.pictures[0].clip == (0, 150, 1500, 750)


def test_a_picture_with_a_shared_instruction_goes_to_every_problem_in_the_range():
    doc = segment(paras_of(
        para(t("[01~02] 다음 그림을 보고 물음에 답하시오."), pic("shared"))
        + para(t("01 $x$의 값을 구하시오."))
        + para(t("02 $y$의 값을 구하시오."))
    ))
    assert [[fig.picture.bin_id for fig in problem.figs] for problem in doc.problems] == [["shared"], ["shared"]]
    assert doc.problems[0].marked_text.split("\n")[0] == "다음 그림을 보고 물음에 답하시오. [[FIG:0]]"


#: 글자처럼 취급하지 않는(떠 있는) 개체의 자리
FLOAT = '<hp:pos treatAsChar="0" vertRelTo="PARA" vertOffset="368"/>'


def number_box(number: str) -> str:
    return "<hp:rect><hp:drawText><hp:subList>" + para(t(number)) + "</hp:subList></hp:drawText></hp:rect>"


def test_a_picture_anchored_ahead_of_the_number_box_in_the_same_paragraph_belongs_to_that_number():
    """번호가 글상자에 든 책(천재 «기초력 TEST») — 그림의 닻이 번호 상자와 **같은 문단**의 앞쪽에 있다.
    문서 차례대로만 읽으면 그림이 번호보다 먼저 나와 앞 문항에 붙는다: 그림이 한 문항씩 밀리고 첫 문항의 그림은 사라진다
    (2026-10-08 그림 검토에서 «이 문항의 그림이 아니다 — 앞 문항에 붙어 있다»가 같은 파일에서 연달아 나와 찾았다)."""
    doc = segment(paras_of(
        para(pic("image2", extra=FLOAT) + number_box("1") + t("오른쪽 그림과 같은 평행사변형에서 다음을 구하시오."))
        + para(t("⑴ 변 AB 와 한 점에서 만나는 변"))
        + para(pic("image3", extra=FLOAT) + number_box("2") + t("오른쪽 그림과 같은 직육면체에서 다음을 구하시오."))
        + para(t("⑴ 모서리 AB 와 평행한 모서리"))
    ))
    first, second = doc.problems
    assert [fig.picture.bin_id for fig in first.figs] == ["image2"]
    assert [fig.picture.bin_id for fig in second.figs] == ["image3"]
    assert [picture.bin_id for picture in first.pictures] == ["image2"]
    assert [picture.bin_id for picture in second.pictures] == ["image3"]
    assert first.text.splitlines() == ["오른쪽 그림과 같은 평행사변형에서 다음을 구하시오.", "⑴ 변 AB 와 한 점에서 만나는 변"]


def test_a_group_anchored_at_the_head_of_the_numbered_paragraph_belongs_to_that_number():
    """번호가 문단의 글에 있어도 같다 — 묶음 개체는 만나는 자리에서 끊어 내므로 번호보다 먼저 나온다."""
    group = "<hp:container>" + pic("image9", 30000, 20000) + "</hp:container>"
    doc = segment(paras_of(
        para(t("01 다음을 계산하시오."))
        + para(t("$3+4$"))
        + para(group + t("02 오른쪽 그림과 같은 삼각형의 넓이를 구하시오."))
    ))
    first, second = doc.problems
    assert first.figs == [] and first.shapes == 0 and first.shape_list == []
    assert [(fig.picture.bin_id, fig.picture.grouped) for fig in second.figs] == [("image9", True)]
    assert second.shapes == 1 and len(second.shape_list) == 1


def test_a_picture_in_a_paragraph_of_its_own_stays_with_the_problem_before_it():
    """제 문단에 홀로 선 그림은 옮기지 않는다 — 닻이 다음 번호의 문단에 있을 때만 옮긴다."""
    doc = segment(paras_of(
        para(t("01 다음 그림에서 $x$의 값을 구하시오."))
        + para(pic("image7", extra=FLOAT))
        + para(number_box("02") + t("다음을 계산하시오."))
    ))
    first, second = doc.problems
    assert [fig.picture.bin_id for fig in first.figs] == ["image7"]
    assert second.figs == [] and second.pictures == []


def test_an_object_is_handed_over_only_once_inside_one_table():
    """표 하나에 문항이 여럿 든 자료 — 표의 문단에 매인 그림은 그 표의 **첫** 문항만 받는다(둘째 문항이 다시 가져가지 않는다)."""
    table = (
        "<hp:tbl><hp:tr>"
        + "<hp:tc><hp:subList>" + para(t("01 오른쪽 그림에서 $x$의 값을 구하시오.")) + "</hp:subList></hp:tc>"
        + "<hp:tc><hp:subList>" + para(t("02 다음을 계산하시오.")) + "</hp:subList></hp:tc>"
        + "</hp:tr></hp:tbl>"
    )
    doc = segment(paras_of(para(pic("image4", extra=FLOAT) + table)))
    first, second = doc.problems
    assert [fig.picture.bin_id for fig in first.figs] == ["image4"]
    assert second.figs == []


# ── 그림의 처분 · 문항의 갈래 · 자리 표지 (`figures.py`) ─────────────────────────

import io  # noqa: E402

from PIL import Image  # noqa: E402

from figures import clip_box, decoration_groups, fate_of, is_flat, place_markers, render, rescue_strips, route_of  # noqa: E402


def fig(width_mm: float, height_mm: float, **over) -> dict:
    return {"w": round(width_mm / 25.4 * 7200), "h": round(height_mm / 25.4 * 7200), "behind": False, "grouped": False, **over}


def test_a_picture_shared_by_many_files_is_decoration_but_two_or_three_is_a_reused_problem():
    assert fate_of(fig(50, 40), files=1, flat=False) == "keep"
    assert fate_of(fig(50, 40), files=3, flat=False) == "keep"
    assert fate_of(fig(50, 40), files=4, flat=False) == "shared"


def test_a_page_backdrop_a_strip_and_a_flat_box_are_decoration():
    assert fate_of(fig(210, 280, behind=True), files=1, flat=False) == "backdrop"
    # 글 뒤에 깔렸어도 작은 그림은 그림이다(글자를 그림 위에 얹은 꼴)
    assert fate_of(fig(60, 40, behind=True), files=1, flat=False) == "keep"
    assert fate_of(fig(160, 7), files=1, flat=False) == "strip"
    assert fate_of(fig(40, 3), files=1, flat=False) == "strip"
    assert fate_of(fig(80, 40), files=1, flat=True) == "flat"


def test_a_number_line_dropped_as_a_strip_comes_back_when_the_text_points_at_a_figure():
    def figs():
        return [{**fig(75, 8.2), "fate": "strip"}, {**fig(210, 2), "fate": "strip"}, {**fig(210, 25), "fate": "shared"}]

    rescued = figs()
    rescue_strips(rescued, points=True)
    # 수직선은 되살리고, 실오라기 · 여러 파일에 겹치는 장식은 그대로 버린다
    assert [f["fate"] for f in rescued] == ["keep", "strip", "shared"]
    untouched = figs()
    rescue_strips(untouched, points=False)
    assert [f["fate"] for f in untouched] == ["strip", "strip", "shared"]
    # 남긴 그림이 이미 있으면 본문이 가리키는 것은 그 그림이다
    has_one = [{**fig(50, 40), "fate": "keep"}, {**fig(75, 8.2), "fate": "strip"}]
    rescue_strips(has_one, points=True)
    assert [f["fate"] for f in has_one] == ["keep", "strip"]


def test_a_group_is_decoration_when_every_picture_in_it_is():
    figs = [
        {"group": 7, "fate": "shared"}, {"group": 7, "fate": "strip"},
        {"group": 8, "fate": "shared"}, {"group": 8, "fate": "keep"},
        {"group": 0, "fate": "shared"},
    ]
    assert decoration_groups(figs) == {7}


def test_markers_stand_where_the_kept_pictures_were():
    marked = "[[FIG:0]]\n다음 중 정비례 관계의 그래프는? [[FIG:1]]\n① [[FIG:2]] ② [[FIG:3]]"
    assert place_markers(marked, {2, 3}) == "다음 중 정비례 관계의 그래프는?\n① [그림] ② [그림]"
    assert place_markers(marked, {1, 2, 3}).count("[그림]") == 3


def test_the_route_of_a_problem():
    kept = [{"grouped": False}]
    base = {"shapeList": [], "tables": 0, "embeddedNumber": None}
    assert route_of(base, kept) == "figure"
    assert route_of(base, []) == "text"
    # 번호 딱지 같은 작은 묶음은 도형으로 치지 않는다
    assert route_of({**base, "shapeList": [["container", 1980, 1020]]}, kept) == "figure"
    assert route_of({**base, "shapeList": [["polygon", 20000, 15000]]}, kept) == "group"
    assert route_of(base, [{"grouped": True}]) == "group"
    assert route_of({**base, "tables": 1}, kept) == "table"
    # 든 그림이 전부 장식인 묶음(여러 파일에 겹치는 머리 띠)은 도형으로 치지 않는다
    banner = {**base, "shapeList": [["container", 47478, 6680, 7]]}
    assert route_of(banner, kept) == "group"
    assert route_of(banner, kept, decor_groups={7}) == "figure"
    assert route_of(banner, [], decor_groups={7}) == "text"
    assert route_of({**banner, "shapeList": [["container", 47478, 6680, 7], ["container", 30000, 20000, 8]]}, kept, decor_groups={7}) == "group"
    # 남긴 그림이 없고 본문이 그림을 가리키지 않으면 도형은 꾸밈(보기 상자 · 구분선 · 머리 상자)이다 — 글 문항으로 보내
    # 검토자가 «글만으로 풀리나»를 가른다. 가리키면 그린 그림이다
    drawn = {**base, "shapeList": [["polygon", 20000, 15000]]}
    assert route_of(drawn, [], points=False) == "text"
    assert route_of(drawn, [], points=True) == "group"
    assert route_of(drawn, kept, points=False) == "group"
    assert route_of({**base, "embeddedNumber": 4}, kept) == "joined"


def png(width: int, height: int, color=(255, 255, 255)) -> bytes:
    image = Image.new("RGB", (width, height), color)
    for x in range(width):
        image.putpixel((x, height // 2), (0, 0, 0))
    out = io.BytesIO()
    image.save(out, format="PNG")
    return out.getvalue()


def test_a_picture_is_rendered_as_it_shows_on_the_page():
    data = png(400, 200)
    assert render(data, fig(50, 25)).size == (400, 200)
    assert render(data, fig(50, 25)).mode == "L"
    # 잘라 보이기 — 해상도가 안 적힌 그림은 96dpi(1픽셀이 75)로 본다
    assert render(data, fig(50, 25, clip=[0, 0, 300 * 75, 200 * 75])).size == (300, 200)
    # 그림 전체와 한 픽셀 차이면 자르지 않는다
    assert render(data, fig(50, 25, clip=[0, 0, 399 * 75, 200 * 75])).size == (400, 200)
    # 돌린 그림
    assert render(data, fig(25, 50, rot=90)).size == (200, 400)
    # 큰 그림은 가로 1,000 픽셀까지
    assert render(png(3000, 600), fig(150, 30)).size == (1000, 200)


def test_a_one_colour_box_is_flat():
    assert is_flat(Image.new("RGB", (300, 200), (190, 200, 210))) is True
    assert is_flat(Image.open(io.BytesIO(png(300, 200)))) is False


def test_the_unit_of_a_clip_follows_the_resolution_of_the_picture():
    """🔴 300dpi 그림(272×111 픽셀)의 «전체»가 [0, 0, 6540, 2640] 으로 적혀 있다 — 1픽셀이 24 다.
    75 로 읽으면 왼쪽 위 87×35 픽셀만 남아 빈 그림이 된다(천재 중2 «수직선 위에 바르게 나타낸 것은?»의 보기 다섯 장)."""
    assert clip_box((272, 111), [0, 0, 6540, 2640], (300, 300)) is None
    # 같은 그림을 정말 반으로 자른 것
    assert clip_box((272, 111), [0, 0, 3264, 2664], (300, 300)) == (0, 0, 136, 111)
    # 96dpi 그림 — 1픽셀이 75
    assert clip_box((1365, 1819), [0, 0, 102360, 136440], (96, 96)) is None
    assert clip_box((400, 200), [75 * 100, 0, 75 * 400, 75 * 200], None) == (100, 0, 400, 200)
    # 해상도를 모르는데 값이 그림 밖으로 나간다 — 단위를 믿지 않고 자르지 않는다
    assert clip_box((272, 111), [0, 0, 60000, 24000], None) is None
    # 해상도를 모르고 가로 세로 비가 그림과 같다 — 전체를 다른 단위로 적은 것
    assert clip_box((272, 111), [0, 0, 6528, 2664], None) is None
    assert clip_box((400, 200), None, (96, 96)) is None
