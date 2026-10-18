#!/usr/bin/env python3
"""Independent solver: consumes actual regenerated SVG, never imports the renderer.
Prints coordinate/answer evidence without copying bank prose into the report.
"""
import json
import math
import re
import sys
import xml.etree.ElementTree as ET

MIN_SCALENE_SIDE_GAP = 0.15
MIN_SCALENE_ANGLE_GAP_DEGREES = 10.0
MIN_NONPARALLEL_DEGREES = 10.0


def points(node):
    return [tuple(map(float, pair.split(","))) for pair in node.attrib["points"].split()]


def vectors(pts):
    return [(pts[(i + 1) % len(pts)][0] - p[0], pts[(i + 1) % len(pts)][1] - p[1]) for i, p in enumerate(pts)]


def cross(a, b):
    return a[0] * b[1] - a[1] * b[0]


def interior_angles(pts):
    result = []
    for i, point in enumerate(pts):
        a = tuple(pts[i - 1][j] - point[j] for j in (0, 1))
        b = tuple(pts[(i + 1) % len(pts)][j] - point[j] for j in (0, 1))
        result.append(math.degrees(math.atan2(abs(cross(a, b)), sum(a[j] * b[j] for j in (0, 1)))))
    return result


def side_gaps(lengths):
    # The denominator is the SHORTER side, not the larger side or their mean.
    return [{"sides": [j + 1, i + 1], "absoluteDifference": abs(a - b),
             "relativeDifferenceToShorter": abs(a - b) / min(a, b)}
            for i, a in enumerate(lengths) for j, b in enumerate(lengths[:i])]


def angle_gaps(angles):
    return [{"vertices": [j + 1, i + 1], "differenceDegrees": abs(a - b)}
            for i, a in enumerate(angles) for j, b in enumerate(angles[:i])]


def opposite_pair_proofs(edges):
    result = []
    for i in range(2):
        a, b = edges[i], edges[i + 2]
        product = cross(a, b)
        norm = math.hypot(*a) * math.hypot(*b)
        assert norm > 0, "Zero-length quadrilateral edge"
        dot = sum(a[j] * b[j] for j in (0, 1))
        # Acute angle between undirected lines; reversing an edge changes nothing.
        deviation = math.degrees(math.atan2(abs(product), abs(dot)))
        result.append({"sides": [i + 1, i + 3], "crossProduct": product,
                       "normalizedCrossProduct": product / norm,
                       "deviationDegrees": deviation, "exactlyParallel": abs(product) < 0.01})
    return result


def assert_svg_labels(nodes, items):
    actual = [node.text for node in nodes if node.tag.endswith("}text") or node.tag == "text"]
    assert actual == [item["label"] for item in items], "Seed labels do not correspond to actual SVG"


def resolved_answer(row):
    answer = row["payload"]["answer"].strip()
    if row["questionType"] == "객관식":
        index = "①②③④⑤".index(answer)
        choices = re.findall(r"(?:^|\n)[①②③④⑤] ([^\n]*)", row["payload"]["content"])
        assert len(choices) == 5 and len(set(choices)) == 5, "Exact unique five-option contract"
        return choices[index].strip()
    return answer


def verify(row):
    spec = row["figureSpec"]
    answer = resolved_answer(row)
    kind = row["repair"]
    if kind == "poly263Name":
        assert "모든 변의 길이가 같고 모든 각의 크기가 같은" in row["payload"]["content"]
        assert "모든 변의 길이가 같고 모든 각의 크기가 같은" in row["payload"]["solution"]
        n = int(re.search(r"변이 \$(\d+)\$개", row["payload"]["content"])[1])
        expected = {5: "정오각형", 6: "정육각형", 7: "정칠각형", 8: "정팔각형"}[n]
        assert answer == expected and row["payload"]["figureSvg"] is None
        return {"id": row["id"], "repair": kind, "sides": n, "bothRegularityConditions": True, "uniqueAnswer": True}
    root = ET.fromstring(row["payload"]["figureSvg"])
    nodes = list(root.iter())
    polygons = [points(node) for node in nodes if node.tag.endswith("}polygon") or node.tag == "polygon"]
    if kind in ("tri221PickIso", "tri222Pick"):
        assert len(polygons) == len(spec["items"]) == 3
        evidence = []
        valid = []
        for item, polygon in zip(spec["items"], polygons):
            assert len(polygon) == 3
            squared = [x*x + y*y for x, y in vectors(polygon)]
            lengths = [math.sqrt(v) for v in squared]
            assert min(lengths) > 0 and abs(sum(interior_angles(polygon)) - 180) < 0.001
            angles = interior_angles(polygon)
            side_pairs = side_gaps(lengths)
            angle_pairs = angle_gaps(angles)
            iso = any(abs(squared[i] - squared[j]) < 0.01 for i in range(3) for j in range(i))
            if iso:
                valid.append(item["label"])
            else:
                assert min(pair["relativeDifferenceToShorter"] for pair in side_pairs) >= MIN_SCALENE_SIDE_GAP, f"Triangle side margin <15%: {row['id']}/{item['label']}"
                assert min(pair["differenceDegrees"] for pair in angle_pairs) >= MIN_SCALENE_ANGLE_GAP_DEGREES, f"Triangle angle margin <10 degrees: {row['id']}/{item['label']}"
            if item["shape"] == "choiceRightScaleneTri":
                a, b, c = sorted(squared)
                assert abs(a + b - c) < 0.01
            evidence.append({"label": item["label"], "shape": item["shape"], "points": polygon,
                             "squaredLengths": squared, "lengths": lengths, "interiorAnglesDegrees": angles,
                             "sidePairs": side_pairs, "anglePairs": angle_pairs, "isosceles": iso,
                             "minimumRelativeSideGap": min(pair["relativeDifferenceToShorter"] for pair in side_pairs),
                             "minimumAngleGapDegrees": min(pair["differenceDegrees"] for pair in angle_pairs),
                             "perceptualMarginsPassed": True})
        assert valid == [answer], f"Triangle answer is not unique: {row['id']}"
        assert_svg_labels(nodes, spec["items"])
        return {"id": row["id"], "repair": kind, "shapes": evidence, "uniqueAnswer": True, "labelsPreserved": True}
    if kind == "quad244Pick":
        assert len(polygons) == len(spec["items"]) == 3
        valid = []
        evidence = []
        for item, polygon in zip(spec["items"], polygons):
            assert len(polygon) == 4
            edges = vectors(polygon)
            turns = [cross(edges[i], edges[(i + 1) % 4]) for i in range(4)]
            assert all(v > 0 for v in turns) or all(v < 0 for v in turns), "Must be simple convex quadrilateral"
            pairs = opposite_pair_proofs(edges)
            count = sum(pair["exactlyParallel"] for pair in pairs)
            for pair in pairs:
                assert pair["exactlyParallel"] or pair["deviationDegrees"] >= MIN_NONPARALLEL_DEGREES, f"Quadrilateral parallel margin <10 degrees: {row['id']}/{item['label']}"
            if count >= 1:  # Inclusive definition: rectangles would be valid, too.
                valid.append(item["label"])
            evidence.append({"label": item["label"], "shape": item["shape"], "points": polygon,
                             "lengths": [math.hypot(*edge) for edge in edges], "interiorAnglesDegrees": interior_angles(polygon),
                             "oppositeCrossProducts": [pair["crossProduct"] for pair in pairs],
                             "oppositeSidePairs": pairs, "parallelPairs": count, "turnCrossProducts": turns,
                             "minimumNonparallelDeviationDegrees": min((pair["deviationDegrees"] for pair in pairs if not pair["exactlyParallel"]), default=None),
                             "perceptualMarginsPassed": True})
        assert valid == [answer], "Inclusive trapezoid answer is not unique"
        assert_svg_labels(nodes, spec["items"])
        return {"id": row["id"], "repair": kind, "shapes": evidence, "uniqueAnswer": True, "labelsPreserved": True}
    assert kind == "quad242PerpCount"
    assert row["payload"]["content"].split("\n① ")[0].strip() == "그림에서 평행한 두 직선 사이에 그은 수선은 모두 몇 개인가?"
    lines = [node.attrib for node in nodes if node.tag.endswith("}line") or node.tag == "line"]
    lines = [{key: float(value) for key, value in attrs.items() if key in ("x1", "x2", "y1", "y2")} for attrs in lines]
    bases = [line for line in lines if line["y1"] == line["y2"]]
    perpendiculars = [line for line in lines if line["x1"] == line["x2"] and line["y1"] != line["y2"]]
    k = len(perpendiculars)
    assert int(re.sub(r"[^0-9]", "", answer)) == k
    assert len(bases) == 2 and len(perpendiculars) == k and len(lines) == k + 2
    ys = sorted(base["y1"] for base in bases)
    for line in perpendiculars:
        assert sorted([line["y1"], line["y2"]]) == ys
        for base in bases:
            assert (base["x2"]-base["x1"])*(line["x2"]-line["x1"]) + (base["y2"]-base["y1"])*(line["y2"]-line["y1"]) == 0
    assert len({line["x1"] for line in perpendiculars}) == k
    return {"id": row["id"], "repair": kind, "perpendiculars": perpendiculars, "parallelBases": bases, "count": k, "allDotProductsZero": True, "uniqueAnswer": True}


if __name__ == "__main__":
    rows = json.load(sys.stdin)
    result = [verify(row) for row in rows]
    print(json.dumps({"rows": len(result), "tolerances": {
        "minimumScaleneRelativeSideGap": MIN_SCALENE_SIDE_GAP,
        "relativeSideGapFormula": "abs(a-b)/min(a,b)",
        "minimumScaleneAngleGapDegrees": MIN_SCALENE_ANGLE_GAP_DEGREES,
        "minimumNonparallelDeviationDegrees": MIN_NONPARALLEL_DEGREES,
        "parallelDeviationFormula": "degrees(atan2(abs(cross(a,b)),abs(dot(a,b))))"},
        "independentActualSvgProofs": result}, ensure_ascii=False))
