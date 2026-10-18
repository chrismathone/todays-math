#!/usr/bin/env python3
"""Independent solver: consumes actual regenerated SVG, never imports the renderer.
Prints coordinate/answer evidence without copying bank prose into the report.
"""
import json
import math
import re
import sys
import xml.etree.ElementTree as ET


def points(node):
    return [tuple(map(float, pair.split(","))) for pair in node.attrib["points"].split()]


def vectors(pts):
    return [(pts[(i + 1) % len(pts)][0] - p[0], pts[(i + 1) % len(pts)][1] - p[1]) for i, p in enumerate(pts)]


def cross(a, b):
    return a[0] * b[1] - a[1] * b[0]


def parallel_pairs(pts):
    edges = vectors(pts)
    return [cross(edges[i], edges[i + 2]) for i in range(2)]


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
        assert len(polygons) == 3
        labels = [item["label"] for item in spec["items"]]
        evidence = []
        valid = []
        for item, polygon in zip(spec["items"], polygons):
            assert len(polygon) == 3
            squared = [x*x + y*y for x, y in vectors(polygon)]
            iso = any(abs(squared[i] - squared[j]) < 0.01 for i in range(3) for j in range(i))
            if iso:
                valid.append(item["label"])
            if item["shape"] == "choiceRightScaleneTri":
                a, b, c = sorted(squared)
                assert abs(a + b - c) < 0.01
            evidence.append({"label": item["label"], "shape": item["shape"], "points": polygon, "squaredLengths": squared, "lengths": [math.sqrt(v) for v in squared], "isosceles": iso})
        assert valid == [answer], f"Triangle answer is not unique: {row['id']}"
        actual_labels = [node.text for node in nodes if node.tag.endswith("}text") or node.tag == "text"]
        assert actual_labels == labels, "Seed labels do not correspond to actual SVG"
        return {"id": row["id"], "repair": kind, "shapes": evidence, "uniqueAnswer": True, "labelsPreserved": True}
    if kind == "quad244Pick":
        assert len(polygons) == 3
        valid = []
        evidence = []
        for item, polygon in zip(spec["items"], polygons):
            assert len(polygon) == 4
            edges = vectors(polygon)
            turns = [cross(edges[i], edges[(i + 1) % 4]) for i in range(4)]
            assert all(v > 0 for v in turns) or all(v < 0 for v in turns), "Must be simple convex quadrilateral"
            products = parallel_pairs(polygon)
            count = sum(abs(v) < 0.01 for v in products)
            if count >= 1:  # Inclusive definition: rectangles would be valid, too.
                valid.append(item["label"])
            evidence.append({"label": item["label"], "shape": item["shape"], "points": polygon, "oppositeCrossProducts": products, "parallelPairs": count, "turnCrossProducts": turns})
        assert valid == [answer], "Inclusive trapezoid answer is not unique"
        return {"id": row["id"], "repair": kind, "shapes": evidence, "uniqueAnswer": True}
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
    print(json.dumps({"rows": len(result), "independentActualSvgProofs": result}, ensure_ascii=False))
