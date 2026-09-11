"""Generate the stacking-cubes dev asset with Blender and existing SVG engine.

Run from the repository root:
blender --background --factory-startup --python-exit-code 1 --python scripts/blender/build_stack_cubes.py
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
import struct
import subprocess
import time

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "public/dev/blender-assets/stack-cubes"
STARTED = time.monotonic()
# Rows run from FRONT to BACK. Columns run from LEFT to RIGHT.
HEIGHTS = [[1, 1, 0], [2, 3, 1], [1, 2, 1]]
VOXELS = [(x, y, z) for y, row in enumerate(HEIGHTS) for x, h in enumerate(row) for z in range(h)]
GAP = 0.65
UNIT = 0.01  # one cube edge is one centimetre
OUTPUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.name = "Separate"
scene.frame_start, scene.frame_end, scene.render.fps = 0, 30, 30


def material(name, color):
    channels = [int(color[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    linear = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in channels]
    mat = bpy.data.materials.new(name)
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*linear, 1)
    bsdf.inputs["Roughness"].default_value = 0.8
    return mat


wood = [material(f"Wood layer {i + 1}", color) for i, color in enumerate(("e6bd86", "dfb37b", "d9a769"))]
base_mat = material("Neutral counting board", "edf0f2")
grid_mat = material("Board cell boundaries", "c5cdd1")
arrow_mat = material("Front direction", "2766a3")

root = bpy.data.objects.new("Stacking cubes centimetres", None)
scene.collection.objects.link(root)
root.scale = (UNIT,) * 3
layers = []
for z in range(3):
    layer = bpy.data.objects.new(f"Layer_{z + 1}", None)
    scene.collection.objects.link(layer)
    layer.parent = root
    layer.location.z = 0
    layer.keyframe_insert(data_path="location", frame=0)
    layer.location.z = z * GAP
    layer.keyframe_insert(data_path="location", frame=30)
    layers.append(layer)

# A small bevel reveals the boundary between touching blocks without moving
# their centres or inventing a gap in the mathematical model.
bpy.ops.mesh.primitive_cube_add(size=1)
template = bpy.context.object
bevel = template.modifiers.new("Soft wooden edges", "BEVEL")
bevel.width, bevel.segments = 0.018, 2
bpy.ops.object.modifier_apply(modifier=bevel.name)
meshes = []
for z in range(3):
    mesh = template.data.copy()
    mesh.name = f"Unit wood cube layer {z + 1}"
    mesh.materials.append(wood[z])
    meshes.append(mesh)
bpy.data.objects.remove(template, do_unlink=True)

cubes = []
for x, y, z in VOXELS:
    obj = bpy.data.objects.new(f"Cube_{x}_{y}_{z}", meshes[z])
    scene.collection.objects.link(obj)
    obj.parent = layers[z]
    obj.location = (x - 1, y - 1, z + 0.5)
    cubes.append(obj)


def box(name, location, scale, mat):
    bpy.ops.mesh.primitive_cube_add(size=1)
    obj = bpy.context.object
    obj.name = name
    obj.parent = root
    obj.location, obj.scale = location, scale
    obj.data.materials.append(mat)
    return obj


box("Counting board", (0, 0, -0.045), (3.4, 3.4, 0.08), base_mat)
for step in (-1.5, -0.5, 0.5, 1.5):
    box(f"Board grid x {step}", (step, 0, -0.003), (0.012, 3.0, 0.004), grid_mat)
    box(f"Board grid y {step}", (0, step, -0.003), (3.0, 0.012, 0.004), grid_mat)
# Blender -Y becomes glTF +Z: the arrow points toward the viewer in front view.
arrow_mesh = bpy.data.meshes.new("Front arrow")
arrow_mesh.from_pydata(
    [(-0.22, -1.84, 0), (0.22, -1.84, 0), (0, -2.18, 0)], [], [(0, 2, 1)],
)
arrow_mesh.materials.append(arrow_mat)
arrow = bpy.data.objects.new("Front arrow", arrow_mesh)
scene.collection.objects.link(arrow)
arrow.parent = root


def validate():
    assert len(VOXELS) == len(set(VOXELS)) == 12
    occupied = set(VOXELS)
    assert all(z == 0 or (x, y, z - 1) in occupied for x, y, z in VOXELS), "Floating block"
    counts = [sum(z == level for _, _, z in VOXELS) for level in range(3)]
    assert counts == [8, 3, 1]
    front = [max(h[x] for h in HEIGHTS) for x in range(3)]
    right = [max(row) for row in HEIGHTS]
    assert front == [2, 3, 1] and right == [1, 3, 2]
    for frame in range(31):
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        for obj, (x, y, z) in zip(cubes, VOXELS):
            point = obj.matrix_world.translation
            assert abs(point.x - (x - 1) * UNIT) < 1e-8
            assert abs(point.y - (y - 1) * UNIT) < 1e-8
            if frame in (0, 30):
                expected_z = (z + 0.5 + (z * GAP if frame == 30 else 0)) * UNIT
                assert abs(point.z - expected_z) < 1e-8
            corners = [obj.matrix_world @ Vector(v) for v in obj.bound_box]
            dims = [max(p[i] for p in corners) - min(p[i] for p in corners) for i in range(3)]
            assert all(abs(d - UNIT) < 1e-7 for d in dims), dims
    return {"cubeCount": 12, "layerCounts": counts, "frontHeights": front, "rightHeights": right, "framesChecked": 31}


checks = validate()
scene.frame_set(0)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.preferences.addon_enable(module="io_scene_gltf2")
glb_path = OUTPUT / "stack-cubes.glb"
bpy.ops.export_scene.gltf(
    filepath=str(glb_path), export_format="GLB", use_selection=True,
    export_animations=True, export_frame_range=True, export_force_sampling=True,
    export_animation_mode="SCENE", export_anim_scene_split_object=False,
    export_nla_strips_merged_animation_name="Separate", export_cameras=False, export_lights=False,
)
raw = glb_path.read_bytes()
magic, version, size, json_size, chunk_type = struct.unpack_from("<4sIIII", raw)
assert magic == b"glTF" and version == 2 and size == len(raw) and chunk_type == 0x4E4F534A
gltf = json.loads(raw[20:20 + json_size])
assert len(gltf["animations"]) == 1 and gltf["animations"][0]["name"] == "Separate"
accessors = [gltf["accessors"][s["input"]] for s in gltf["animations"][0]["samplers"]]
assert min(a["min"][0] for a in accessors) == 0
assert max(a["max"][0] for a in accessors) == 1
assert not gltf.get("images"), "No external textures in this demo"

# These are the existing engine's mathematical projections of exactly the
# same 12 grid coordinates, not screenshots of the perspective camera.
for view in ("iso", "top", "front", "side"):
    spec = {"version": "elem-1", "kind": "stackCubes", "voxels": VOXELS, "views": [view]}
    result = subprocess.run(
        ["python", str(ROOT / "scripts/figure/render_spec.py")],
        input=json.dumps(spec).encode("utf-8"), stdout=subprocess.PIPE,
        stderr=subprocess.PIPE, check=True, cwd=ROOT,
    )
    payload = json.loads(result.stdout)
    if "svg" not in payload:
        raise RuntimeError(payload)
    (OUTPUT / f"{view}.svg").write_text(payload["svg"], encoding="utf-8")

manifest = {
    "generator": "scripts/blender/build_stack_cubes.py", "blenderVersion": bpy.app.version_string,
    "heightRowsFrontToBack": HEIGHTS, "voxels": VOXELS, "unitMetres": UNIT,
    "animation": {"name": "Separate", "durationSeconds": 1, "extraGapPerLayerMetres": GAP * UNIT},
    "checks": checks,
    "assets": {p.name: {"bytes": p.stat().st_size, "sha256": hashlib.sha256(p.read_bytes()).hexdigest()}
               for p in sorted(OUTPUT.iterdir()) if p.suffix in {".glb", ".svg"}},
}
(OUTPUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"elapsedSeconds": round(time.monotonic() - STARTED, 2), **manifest}))
