from __future__ import annotations

import importlib.util
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "vendor" / "figure-engine"))
sys.path.insert(0, str(ROOT / "scripts" / "figure"))

probe_spec = importlib.util.spec_from_file_location(
    "probe_dim_outside", ROOT / "scripts" / "qa" / "probe-dim-outside.py"
)
assert probe_spec and probe_spec.loader
probe = importlib.util.module_from_spec(probe_spec)
probe_spec.loader.exec_module(probe)

from elementary import _text_bboxes, render_elementary  # noqa: E402

specs = json.loads((ROOT / "scratch" / "specs.json").read_text("utf8"))
tested = Counter()
bad = Counter()
widths: dict[str, list[float]] = defaultdict(list)
dimension_labels = 0
label_overlaps = 0
clipped_labels = 0
clipped_by_kind = Counter()
clipped_examples: list[str] = []

for item in specs:
    try:
        svg = render_elementary(item)
    except Exception:
        continue
    got = probe.judge(svg)
    if got is None:
        continue
    name = f"{item.get('kind')}/{item.get('shape', '')}"
    tested[name] += 1
    view_box = re.search(r'viewBox="0 0 ([\d.]+)', svg)
    if view_box:
        widths[name].append(float(view_box.group(1)))
    view_size = re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)', svg)
    dim_boxes = [box for box in _text_bboxes(svg) if re.search(r"\d\s*cm", box[4])]
    dimension_labels += len(dim_boxes)
    if view_size:
        w, h = float(view_size.group(1)), float(view_size.group(2))
        for x0, y0, x1, y1, text in dim_boxes:
            if x0 < 0 or y0 < 0 or x1 > w or y1 > h:
                clipped_labels += 1
                clipped_by_kind[name] += 1
                if len(clipped_examples) < 12:
                    clipped_examples.append(
                        f"{name} {text}: ({x0:.1f},{y0:.1f})~({x1:.1f},{y1:.1f}) / {w:g}x{h:g}"
                    )
    for i, a in enumerate(dim_boxes):
        for b in dim_boxes[i + 1 :]:
            if min(a[2], b[2]) > max(a[0], b[0]) and min(a[3], b[3]) > max(a[1], b[1]):
                label_overlaps += 1
    if got[0] > 0:
        bad[name] += 1

for name in sorted(tested):
    values = widths[name]
    print(
        f"{name:28} 안쪽 {bad[name]:3}/{tested[name]:3}"
        f" · 폭 {min(values):g}~{max(values):g}"
    )

print(
    f"치수 라벨 {dimension_labels} · 라벨끼리 겹침 {label_overlaps}"
    f" · viewBox 밖 라벨 {clipped_labels}"
)
for name, count in clipped_by_kind.items():
    print(f"  잘림 {name}: {count}")
for example in clipped_examples:
    print(f"    {example}")
