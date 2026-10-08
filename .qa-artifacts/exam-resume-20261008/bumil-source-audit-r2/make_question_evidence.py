"""Retain full question-only observations and compute complete-record comparisons.

The normalized text below is a human transcription of printed question content,
checked against main HWP records, clean PDFs and the original question paper.
It is not OCR, an answer key, a solution, or an authored twin.
"""
import sys
sys.dont_write_bytecode = True
import hashlib
import json
import re

import fitz

from audit_sources import OUT, PRIOR, SELECTED, save, sha

OBSERVED = {
    1: {
        "score": 4,
        "stem": "이차함수의 그래프에 대한 설명 중 옳은 것은?",
        "givens": ["㉠ y=4x²", "㉡ y=-(1/2)x²", "㉢ y=-(1/4)x²", "㉣ y=-4x²", "㉤ y=(1/3)x²"],
        "choices": ["위로 볼록인 것은 ㉠, ㉤이다.", "㉠과 y축에 서로 대칭인 것은 ㉣이다.", "그래프의 폭이 가장 넓은 것은 ㉡이다.", "y=x의 그래프와 만나는 것은 ㉠, ㉣이다.", "x>0일 때, x의 값이 증가하면 y의 값이 감소하는 것은 ㉡, ㉢, ㉣이다."],
        "figure_labels": [], "diagram_observation": "별도 문제 그림 없음. 주어진 식 다섯 개는 3개/2개 두 행의 상자에 제시된다.",
    },
    4: {
        "score": 4,
        "stem": "이차함수 y=ax²-8x-b의 그래프가 그림과 같을 때, 일차함수 y=-ax+b의 그래프가 지나지 않는 사분면은? (단, a, b는 수)",
        "givens": ["y=ax²-8x-b", "y=-ax+b", "a,b는 수", "이차함수의 주어진 그래프"],
        "choices": ["제1사분면", "제2사분면", "제3사분면", "제4사분면", "제1,3사분면"],
        "figure_labels": ["x", "y", "O"],
        "diagram_observation": "위쪽으로 열린 포물선과 좌표축. 꼭짓점은 x축 아래, y축 오른쪽이며 두 x절편은 원점 오른쪽, y절편은 원점 위에 그려져 있다. 수치 눈금 없음.",
    },
    5: {
        "score": 5,
        "stem": "그림과 같이 이차함수 y=-x²+2x+8의 그래프의 꼭짓점을 A, x축과의 교점을 각각 B, C라 할 때, △ABC의 넓이는?",
        "givens": ["y=-x²+2x+8", "A는 꼭짓점", "B,C는 x축과의 교점"],
        "choices": ["21", "27", "28", "32", "36"],
        "figure_labels": ["x", "y", "O", "A", "B", "C"],
        "diagram_observation": "아래로 열린 포물선, 꼭짓점 A와 x절편 B,C를 잇는 삼각형. B는 원점 왼쪽, C와 A는 오른쪽에 그려짐. 보기에는 길이/넓이 단위가 별도로 인쇄되지 않음.",
    },
    6: {
        "score": 4,
        "stem": "그림과 같이 ∠A의 크기가 같은 직각삼각형 ABC, ADE, AFG에서 옳은 것은?",
        "givens": ["ABC, ADE, AFG는 직각삼각형", "공통 ∠A"],
        "choices": ["ED/AE=AF/AG", "AB/CA=AE/AD", "sin A=AB/AC", "cos A=AG/AF", "tan A=DE/AD"],
        "figure_labels": ["A", "B", "C", "D", "E", "F", "G"],
        "diagram_observation": "A-B-D-F가 수평으로, A-C-E-G가 비스듬한 한 직선으로 배치된다. BC, DE, FG에 직각 표시가 각각 B,D,F에 있다. 보기의 분자는 ED/DE 등 인쇄 순서대로 보존함.",
    },
    7: {
        "score": 4,
        "stem": "이차방정식 9x²-12x+4=0의 한 근이 sin A의 값과 같을 때, cos A÷tan A의 값은? (단, 0°<A<90°)",
        "givens": ["9x²-12x+4=0", "한 근=sin A", "0°<A<90°"],
        "choices": ["1/6", "2/3", "5/6", "6/5", "15/2"],
        "figure_labels": [], "diagram_observation": "원본 종이에 손으로 그린 삼각형은 인쇄 문제 그림이 아니므로 입력에서 제외함.",
    },
    8: {
        "score": 4, "stem": "계산한 값이 가장 큰 것은?", "givens": [],
        "choices": ["2cos60°÷sin45°", "2cos30°×tan30°", "(1+sin60°)(1-sin60°)", "2cos45°×tan60°÷cos0°", "sin90°÷tan30°-tan45°×cos30°"],
        "figure_labels": [], "diagram_observation": "인쇄 그림 없음. 원본 선택지 위의 손계산을 제외하고 모든 각도, 부호, 괄호, 곱셈/나눗셈 순서를 그대로 비교함.",
    },
    9: {
        "score": 4,
        "stem": "그림과 같이 반지름의 길이가 1인 사분원을 이용하여 (tan55°-cos55°)×sin55°의 값은? (단, 소수점 아래 셋째 자리에서 반올림한다.)",
        "givens": ["반지름 1인 사분원", "(tan55°-cos55°)×sin55°", "소수점 아래 셋째 자리에서 반올림"],
        "choices": ["0.71", "0.61", "0.36", "0.35", "0.25"],
        "figure_labels": ["x", "y", "O", "1", "1.43", "0.82", "0.57", "55°"],
        "diagram_observation": "제1사분면 사분원, 55°의 원점에서 뻗는 직선, x=1의 수직선과 보조 점선. 축상의 1.43,0.82,0.57와 직각 표시는 그대로 보존하며 실제 삼각비 정확값으로 대체하지 않음.",
    },
    10: {
        "score": 4,
        "stem": "그림과 같이 범일이가 석탑의 중심축과 5.5 m 떨어진 지점 A에서 석탑의 끝 지점 C를 올려본 각의 크기가 58°이다. 범일이의 눈높이가 1.7 m일 때, 삼각비의 표를 이용하여 석탑의 높이 CE를 구하면? (단, 소수점 아래 둘째 자리에서 반올림한다.)",
        "givens": ["석탑 중심축과 지점 A의 거리 5.5 m", "올려본 각 58°", "눈높이 1.7 m", "구하는 높이 CE", "소수점 아래 둘째 자리에서 반올림"],
        "table": {"columns": ["각도", "사인(sin)", "코사인(cos)", "탄젠트(tan)"], "rows": [["58°", "0.8480", "0.5299", "1.6003"]]},
        "choices": ["6.4 m", "7.2 m", "8.8 m", "10.5 m", "11.5 m"],
        "figure_labels": ["A", "B", "C", "D", "E", "1.7 m", "5.5 m", "58°"],
        "diagram_observation": "사진형 석탑/사람 그림. A는 사람 발밑, B는 눈높이, C는 탑 위, D는 같은 눈높이의 중심축 위, E는 탑 밑. AE의 5.5 m, AB의 1.7 m, B의 58°와 BD 수평선, CE 수직선이 대응한다.",
    },
    11: {
        "score": 4,
        "stem": "∠C=90°인 직각삼각형 ABC에서 ∠ABD=15°, ∠ADC=30°, BD=4이다. 이때, tan15°의 값은?",
        "givens": ["∠C=90°", "∠ABD=15°", "∠ADC=30°", "BD=4"],
        "choices": ["√3/3", "2-√3", "√3", "1+√3", "2+√3"],
        "figure_labels": ["A", "B", "C", "D", "4", "15°", "30°"],
        "diagram_observation": "B-D-C가 그 순서로 공선, A는 C의 위쪽. C에 직각, B와 D에 15°/30°, BD에 4가 표시됨. 인쇄 길이에 cm를 새로 붙이지 않음.",
    },
    12: {
        "score": 4,
        "stem": "□ABCD에서 ∠CAB=45°, ∠ACD=60°, BC=10 cm, DC=4 cm일 때, □ABCD의 넓이는?",
        "givens": ["∠CAB=45°", "∠ACD=60°", "BC=10 cm", "DC=4 cm"],
        "choices": ["10√3 cm²", "(40+10√3) cm²", "(40+10√6) cm²", "(50+10√3) cm²", "(50+10√6) cm²"],
        "figure_labels": ["A", "B", "C", "D", "45°", "60°", "10 cm", "4 cm"],
        "diagram_observation": "대각선 AC로 나뉜 사각형. A는 왼쪽 아래, B는 오른쪽 아래, C는 오른쪽 위, D는 왼쪽 위. B의 직각, CAB의45°, ACD의60°, BC의10 cm, DC의4 cm와 사각형 음영이 대응한다.",
    },
    13: {
        "score": 4,
        "stem": "그림은 모선의 길이가 6 cm인 원뿔이다. 모선과 밑면이 이루는 각의 크기가 30°일 때, 이 원뿔의 부피는?",
        "givens": ["모선의 길이 6 cm", "모선과 밑면의 각 30°"],
        "choices": ["9√3π cm³", "27π cm³", "27√3π cm³", "64π cm³", "81π cm³"],
        "figure_labels": ["A", "B", "H", "6 cm", "30°"],
        "diagram_observation": "원뿔 꼭짓점 A, 밑면 가장자리 B, 밑면 중심 H. AB의6 cm, AB와 BH의30°, AH와 BH의 직각 및 밑면의 점선/타원이 대응한다.",
    },
    14: {
        "score": 5,
        "stem": "그림은 직사각형의 종이띠 ABCD를 선분 PQ를 접는 선으로 하여 접어서 점 A, C를 일치하도록 하였다. AB=2, AP=6, ∠CPQ=x일 때, tan x의 값은?",
        "givens": ["직사각형 종이띠 ABCD", "PQ를 따라 접어 A,C 일치", "AB=2", "AP=6", "∠CPQ=x"],
        "choices": ["1/3", "3", "4√2", "3+2√2", "4+3√2"],
        "figure_labels": ["A", "B", "C(A)", "D", "P", "Q", "(B)", "2", "6", "x"],
        "diagram_observation": "하나의 접힌 종이띠 그림. A/B의 원래 왼쪽 모서리와 원래 밑변은 점선, C(A)는 A가 옮겨진 점, (B)는 접힌 B의 위치. AP의6, AB의2, PC/PQ 사이 x와 직각 표시가 대응함. 원본 표시 (B)를 새 B′ 표기로 바꾸지 않음.",
    },
    16: {
        "score": 4,
        "stem": "원 O에서 OM⊥AB, ON⊥AC, OM=ON이다. ∠ABC=70°일 때, ∠BAC의 크기는?",
        "givens": ["OM⊥AB", "ON⊥AC", "OM=ON", "∠ABC=70°"],
        "choices": ["40°", "45°", "50°", "55°", "60°"],
        "figure_labels": ["A", "B", "C", "O", "M", "N", "70°"],
        "diagram_observation": "원에 내접한 ABC. M은 AB 위, N은 AC 위이고 OM/ON의 직각 표시와 같은 길이 표시가 있다. 70°는 ABC에, 구할 각은 BAC에 표시됨.",
    },
    17: {
        "score": 5,
        "stem": "그림과 같이 직사각형 ABCD의 세 변에 접하는 원 O가 있다. 네 점 E, F, G, H는 원 O의 접점이고, AB=6 cm, BC=8 cm일 때, △ABM의 넓이는?",
        "givens": ["직사각형 ABCD", "원 O가 직사각형의 세 변에 접함", "E,F,G,H는 원 O의 접점", "AB=6 cm", "BC=8 cm"],
        "choices": ["16/5 cm²", "9 cm²", "48/5 cm²", "10 cm²", "12 cm²"],
        "figure_labels": ["A", "B", "C", "D", "E", "F", "G", "H", "M", "O", "6 cm", "8 cm"],
        "diagram_observation": "A/B는 왼쪽 위/아래, D/C는 오른쪽 위/아래. E는 AD, G는 BC, H는 CD의 접점. A에서 BC 위 M으로 그린 선분에 접점 F가 표시된다. M과 G를 서로 바꾸지 않고 AB와 BC 치수를 그대로 비교함.",
    },
    18: {
        "score": 7,
        "stem": "[서술형 1] 이차함수 y=ax²-2ax+b (단, a, b는 수, a≠0)의 그래프가 점 (-1,13)을 지나고, 이 그래프의 꼭짓점이 일차함수 y=-2x+7의 그래프 위의 점일 때, a+b의 값을 구하시오. [총7점, 부분 점수 있음]",
        "givens": ["y=ax²-2ax+b", "a,b는 수", "a≠0", "(-1,13)을 지남", "꼭짓점이 y=-2x+7의 그래프 위", "구할 값 a+b"],
        "choices": [], "figure_labels": [], "diagram_observation": "인쇄 문제 그림이나 보기 없음. 원본 종이의 손풀이를 입력에서 제외함.",
    },
    19: {
        "score": 7,
        "stem": "[서술형 2] 그림과 같은 어느 캠핑장에서 두 텐트 A, B 사이의 거리는 70 m이다. ∠A=45°, ∠B=75°일 때, 텐트 B에서 공동 식수대 C까지의 거리를 구하시오. [총7점, 부분 점수 있음]",
        "givens": ["두 텐트 A,B 사이 70 m", "∠A=45°", "∠B=75°", "구할 거리 B에서 식수대 C까지"],
        "choices": [], "figure_labels": ["A", "B", "C", "70 m", "45°", "75°"],
        "diagram_observation": "캠핑장 삽화에서 A는 왼쪽 위 텐트, B는 아래 텐트, C는 오른쪽 위 식수대. 70 m 치수는 AB,45°는 A,75°는 B에 표시됨. 배경 장식은 수학 조건으로 새로 추론하지 않음.",
    },
    20: {
        "score": 7,
        "stem": "[서술형 3] 그림과 같이 반지름의 길이가 8 cm인 반원 O에서 ∠ABC=30°일 때, 색칠한 부분의 넓이를 구하시오. [총7점, 부분 점수 있음]",
        "givens": ["반원 O의 반지름 8 cm", "∠ABC=30°", "구할 값은 색칠한 부분의 넓이"],
        "choices": [], "figure_labels": ["A", "B", "C", "O", "8 cm", "30°"],
        "diagram_observation": "A-O-B는 수평 지름 위, C는 위쪽 원호 위. OB에8 cm, ABC에30°, CB 현과 CB 원호 사이의 활꼴이 색칠됨. 삼각형 전체나 반원 전체를 색칠한 것으로 바꾸지 않음.",
    },
}

PDF_PAGE = {n: 1 if n <= 5 else 2 if n <= 10 else 3 if n <= 15 else 4 for n in SELECTED}
SCAN_PAGE = {n: 1 if n <= 5 else 2 if n <= 11 else 3 if n <= 17 else 4 for n in SELECTED}
FIGURES = {4: (1, 13, 22), 5: (1, 14, 23), 6: (2, 17, 33), 9: (2, 18, 34), 10: (2, 19, 35),
           11: (3, 21, 43), 12: (3, 22, 44), 13: (3, 23, 45), 14: (3, 24, 46),
           16: (4, 27, 57), 17: (4, 28, 58), 19: (4, 29, 59), 20: (4, 30, 60)}
COLS = {1: [[1, 2, 3], [4, 5]], 2: [[6, 7, 8], [9, 10]],
        3: [[11, 12, 13], [14, 15]], 4: [[16, 17, 18], [19, 20, 21]]}


def render_clip(doc, pn, clip, file, sid, sources, rotation=None):
    p = doc[pn - 1]
    original_rotation = p.rotation
    if rotation is not None:
        p.set_rotation(rotation)
    path = OUT / file
    path.parent.mkdir(parents=True, exist_ok=True)
    p.get_pixmap(matrix=fitz.Matrix(3, 3), clip=fitz.Rect(clip), alpha=False).save(path)
    return {"file": file, "source_id": sid, "source_path": sources[sid]["current_path"],
            "source_sha256": sources[sid]["sha256"], "pdf_page_1based": pn,
            "clip_points": list(clip), "original_rotation": original_rotation,
            "render_rotation": p.rotation, "scale": 3, "sha256": sha(path)}


def main():
    sources = {s["id"]: s for s in json.loads((OUT / "source-files.json").read_text(encoding="utf-8"))}
    hwps = json.loads((OUT / "hwp-question-only-records.json").read_text(encoding="utf-8"))
    hw = {q["question_number"]: q for q in hwps["sources"][1]["questions"]}
    page_renders = json.loads((OUT / "page-render-records.json").read_text(encoding="utf-8"))
    pdf_records = {n: {} for n in SELECTED}
    clips = []
    for sid in ("s4", "s6"):
        with fitz.open(sources[sid]["current_path"]) as doc:
            for pn in (1, 2, 3, 4):
                p = doc[pn - 1]
                words = p.get_text("words")
                starts = {int(w[4][:-1]): w[1] for w in words if re.fullmatch(r"([1-9]|1[0-9]|2[01])\.", w[4])}
                colbounds = [(51, 359), (367, 680)] if sid == "s4" else [(40, 292), (302, 554)]
                ceiling = 935 if sid == "s4" else 765
                for ci, nums in enumerate(COLS[pn]):
                    left, right = colbounds[ci]
                    for ni, n in enumerate(nums):
                        if n not in SELECTED:
                            continue
                        top = starts[n] - 4
                        end = starts[nums[ni + 1]] - 6 if ni + 1 < len(nums) else ceiling
                        kept = [w for w in words if left <= (w[0] + w[2]) / 2 <= right and top <= w[1] < end]
                        bottom = max(w[3] for w in kept) + 5
                        if n in FIGURES:
                            xref = FIGURES[n][1 if sid == "s4" else 2]
                            assert xref in {im[0] for im in p.get_images()}
                            rect = p.get_image_rects(xref)[0]
                            bottom = max(bottom, rect.y1 + 5)
                        clip = [left, top, right, min(end, bottom)]
                        rec = render_clip(doc, pn, clip, f"question-only/q{n:02}/{sid}-printed-question.png", sid, sources)
                        rec["author_input_allowed"] = True
                        rec["literal_pdf_text"] = p.get_text(clip=fitz.Rect(clip), sort=True)
                        rec["normalized_complete_extracted_text"] = re.sub(r"\s+", "", rec["literal_pdf_text"])
                        pdf_records[n][sid] = rec
                        clips.append(rec)
    image_linkage = {}
    for n, (pn, cx, wx) in FIGURES.items():
        hp = hw[n]["pictures"][0]
        pix = fitz.Pixmap(OUT / hp["file"])
        if pix.colorspace.n != 3:
            pix = fitz.Pixmap(fitz.csRGB, pix)
        if pix.alpha:
            pix = fitz.Pixmap(pix, 0)
        row = {"hwp": hp, "pdf_figures": []}
        for sid, xref in (("s4", cx), ("s6", wx)):
            with fitz.open(sources[sid]["current_path"]) as doc:
                assert xref in {im[0] for im in doc[pn - 1].get_images()}
                pp = fitz.Pixmap(doc, xref)
                if pp.colorspace.n != 3:
                    pp = fitz.Pixmap(fitz.csRGB, pp)
                if pp.alpha:
                    pp = fitz.Pixmap(pp, 0)
                assert (pix.width, pix.height, pix.n) == (pp.width, pp.height, pp.n)
                file = f"question-only/q{n:02}/{sid}-embedded-figure.png"
                pp.save(OUT / file)
                differences = [abs(a - b) for a, b in zip(pix.samples, pp.samples)]
                row["pdf_figures"].append({"source_id": sid, "source_sha256": sources[sid]["sha256"],
                    "pdf_page_1based": pn, "xref": xref, "image_rect_points": list(doc[pn - 1].get_image_rects(xref)[0]),
                    "file": file, "sha256": sha(OUT / file), "width": pp.width, "height": pp.height,
                    "hwp_dimensions_equal": True, "hwp_rgb_pixels_equal": pix.samples == pp.samples,
                    "hwp_mean_absolute_rgb_channel_difference": round(sum(differences) / len(differences), 6),
                    "hwp_maximum_rgb_channel_difference": max(differences)})
        image_linkage[n] = row
    summaries = []
    for n in SELECTED:
        observation = {"schema": "bumil-normalized-question-only.v2", "question_number": n,
                       "original_label": str(n) if n <= 17 else f"서술형 {n-17}",
                       "question_type": "객관식" if n <= 17 else "서술형",
                       "partial_credit_printed": n >= 18, **OBSERVED[n],
                       "transcription_method": "Human normalization of the complete printed question, not a solution or automatic scan OCR.",
                       "author_input_policy": "Only normalized printed content and clean HWP/completed-PDF question figures/crops; no scan handwriting, answers or solutions."}
        save(f"question-only/q{n:02}/normalized-question.json", observation)
        a, b = pdf_records[n]["s4"], pdf_records[n]["s6"]
        complete_text_equal = a["normalized_complete_extracted_text"] == b["normalized_complete_extracted_text"]
        record = {"question_number": n, "original_label": observation["original_label"],
                  "score": observation["score"], "normalized_question_file": f"question-only/q{n:02}/normalized-question.json",
                  "normalized_question_sha256": sha(OUT / f"question-only/q{n:02}/normalized-question.json"),
                  "hwp_sources": [{"source_id": h["source_id"], "source_sha256": h["source_sha256"],
                                    "stream": h["stream"], "question_record": next(q for q in h["questions"] if q["question_number"] == n)} for h in hwps["sources"]],
                  "completed_pdf_sources": [a, b],
                  "original_scan": {"source_id": "s3", "source_sha256": sources["s3"]["sha256"],
                                    "pdf_page_1based": SCAN_PAGE[n], "printed_physical_question_page": SCAN_PAGE[n],
                                    "render": next(x for x in page_renders if x["source_id"] == "s3" and x["physical_pdf_page_1based"] == SCAN_PAGE[n]),
                                    "original_printed_label": observation["original_label"], "author_input_allowed": False},
                  "complete_pdf_extracted_text_comparison": {"equal": complete_text_equal,
                                    "comparison": "complete whitespace-normalized per-question text, not substring or token membership",
                                    "decision_limit": "Extraction equality is auxiliary. Full rendered content, HWP equations and original scan must also be reviewed."},
                  "figure_linkage": image_linkage.get(n), "visual_comparison_status": "awaiting-final-record"}
        save(f"reviewer-only/q{n:02}-source-evidence.json", record)
        summaries.append({"n": n, "score": observation["score"], "original_scan_page": SCAN_PAGE[n],
                          "completed_page": PDF_PAGE[n], "complete_pdf_text_equal": complete_text_equal,
                          "hwp_equation_slots_complete": hw[n]["all_inline_equation_slots_resolved"],
                          "hwp_figures": len(hw[n]["pictures"]), "evidence_file": f"reviewer-only/q{n:02}-source-evidence.json"})
    identity = []
    with fitz.open(sources["s3"]["current_path"]) as doc:
        identity.append(render_clip(doc, 1, [50, 65, 423, 145], "question-only/identity/original-exam-header.png", "s3", sources, 90))
        identity.append(render_clip(doc, 1, [598, 975, 691, 993], "question-only/identity/original-school-footer.png", "s3", sources, 90))
        identity.append(render_clip(doc, 4, [389, 950, 702, 999], "question-only/identity/original-copyright-school.png", "s3", sources, 270))
    for sid, head, foot in (("s6", [42, 30, 552, 84], [373, 775, 551, 793]),
                            ("s4", [48, 36, 677, 107], [443, 949, 677, 972])):
        with fitz.open(sources[sid]["current_path"]) as doc:
            identity.append(render_clip(doc, 1, head, f"question-only/identity/{sid}-header.png", sid, sources))
            identity.append(render_clip(doc, 1, foot, f"question-only/identity/{sid}-footer.png", sid, sources))
    save("identity-render-records.json", identity)
    save("question-crop-records.json", clips)
    save("figure-linkage.json", image_linkage)
    save("comparison-index.json", summaries)
    print(json.dumps({"question_count": len(summaries), "score_sum": sum(x["score"] for x in summaries),
                      "complete_pdf_text_equal_count": sum(x["complete_pdf_text_equal"] for x in summaries),
                      "equation_slots_complete_count": sum(x["hwp_equation_slots_complete"] for x in summaries),
                      "question_figure_count": len(image_linkage), "identity_snippets": len(identity)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
