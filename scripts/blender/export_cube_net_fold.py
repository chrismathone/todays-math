"""Merge the five cube-net hinge actions into one Fold clip and export GLB.

blender --background --factory-startup --python-exit-code 1 --python scripts/blender/export_cube_net_fold.py
"""

from __future__ import annotations

from pathlib import Path

import bpy

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "public/lab/blender/cube-net-lesson.blend"
OUT = ROOT / "public/lab/blender/cube-net-fold.glb"

if not SRC.exists():
    raise SystemExit(f"missing {SRC}")

bpy.ops.wm.open_mainfile(filepath=str(SRC))

for obj in bpy.data.objects:
    ad = obj.animation_data
    if ad is None or ad.action is None:
        continue
    while ad.nla_tracks:
        ad.nla_tracks.remove(ad.nla_tracks[0])
    track = ad.nla_tracks.new()
    track.name = "Fold"
    start = int(ad.action.frame_range[0])
    strip = track.strips.new("Fold", start, ad.action)
    strip.action = ad.action
    ad.action = None

OUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=str(OUT),
    export_format="GLB",
    export_animations=True,
    export_animation_mode="NLA_TRACKS",
    export_cameras=False,
    export_lights=False,
    export_apply=False,
)
print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")
