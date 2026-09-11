"""Build the dev teaching asset with Blender; no application/database access.

blender --background --factory-startup --python-exit-code 1 --python scripts/blender/build_cuboid_demo.py
Geometry is in centimetres, exported at 0.01 m per unit. The SVG references
are produced independently by the existing, sanitized figure-engine adapter.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path
import struct
import subprocess
import time

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "public/dev/blender-assets"
W, D, H = 4.0, 3.0, 2.0
LAST_FRAME = 90
STARTED = time.monotonic()
OUTPUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.name = "Fold"
scene.frame_start, scene.frame_end = 0, LAST_FRAME
scene.render.fps = 30


def material(name, hex_color):
    # Blender material inputs are linear; source colours are sRGB.
    rgb = [int(hex_color[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    linear = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in rgb]
    mat = bpy.data.materials.new(name)
    mat.use_backface_culling = False
    mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*linear, 1)
    mat.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.85
    return mat


blue = material("Opposite 1 and 6", "90bee2")
green = material("Opposite 2 and 4", "a3cdb4")
amber = material("Opposite 3 and 5", "ebca8b")
ink = material("Face numbers and edges", "263b46")


def empty(name, parent=None, location=(0, 0, 0)):
    obj = bpy.data.objects.new(name, None)
    scene.collection.objects.link(obj)
    obj.parent = parent
    obj.location = location
    return obj


root = empty("Cuboid 4 x 3 x 2 cm")
# Local XY is the front face. This rotation gives conventional Z-up in
# Blender and Y-up in GLB, with the closed cuboid resting at height zero.
root.rotation_euler.x = math.pi / 2
root.scale = (0.01,) * 3
root.location = (0, D / 200, H / 200)
faces = []
hinges = []


def mesh_object(name, verts, polygons, parent, mat):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], polygons)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    scene.collection.objects.link(obj)
    obj.parent = parent
    obj.data.materials.append(mat)
    return obj


def face(number, name, parent, xmin, xmax, ymin, ymax, mat):
    verts = [(xmin, ymin, 0), (xmax, ymin, 0), (xmax, ymax, 0), (xmin, ymax, 0)]
    obj = mesh_object(f"Face {number} {name}", verts, [(0, 1, 2, 3)], parent, mat)
    faces.append(obj)
    # Small closed polylines retain readable boundaries during folding.
    curve = bpy.data.curves.new(f"Boundary {number}", "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth, curve.bevel_resolution = 0.009, 1
    spline = curve.splines.new("POLY")
    spline.points.add(3)
    for point, co in zip(spline.points, verts):
        point.co = (*co, 1)
    spline.use_cyclic_u = True
    boundary = bpy.data.objects.new(curve.name, curve)
    scene.collection.objects.link(boundary)
    boundary.parent = parent
    boundary.data.materials.append(ink)
    # Both sides have a readable (not mirrored) numeral. Labels and edges
    # inherit the physical hinge transform, not separate approximations.
    for side in (-1, 1):
        curve = bpy.data.curves.new(f"Number {number} side {side}", "FONT")
        curve.body = str(number)
        curve.align_x = curve.align_y = "CENTER"
        curve.size, curve.resolution_u = 0.58, 3
        label = bpy.data.objects.new(curve.name, curve)
        scene.collection.objects.link(label)
        label.parent = parent
        label.location = ((xmin + xmax) / 2, (ymin + ymax) / 2, side * 0.012)
        if side < 0:
            label.rotation_euler.y = math.pi
        label.data.materials.append(ink)
        if number == 6:
            # The baseline keeps a rotated 6 distinguishable from a 9.
            marker = mesh_object(
                f"Six baseline {side}",
                [(-0.14, -0.32, 0), (0.14, -0.32, 0), (0.14, -0.29, 0), (-0.14, -0.29, 0)],
                [(0, 1, 2, 3)], label, ink,
            )
    return obj


def hinge(name, parent, location, axis, angle, start=0, end=60):
    obj = empty(name, parent, location)
    obj.rotation_mode = "XYZ"
    for frame, value in ((0, 0), (start, 0), (end, angle), (LAST_FRAME, angle)):
        obj.rotation_euler[axis] = value
        obj.keyframe_insert(data_path="rotation_euler", frame=frame)
    hinges.append(obj)
    return obj


face(2, "front", root, -W / 2, W / 2, -H / 2, H / 2, green)
top = hinge("Hinge top", root, (0, H / 2, 0), 0, math.pi / 2)
face(1, "top", top, -W / 2, W / 2, 0, D, blue)
bottom = hinge("Hinge bottom", root, (0, -H / 2, 0), 0, -math.pi / 2)
face(6, "bottom", bottom, -W / 2, W / 2, -D, 0, blue)
left = hinge("Hinge left", root, (-W / 2, 0, 0), 1, math.pi / 2)
face(3, "left", left, -D, 0, -H / 2, H / 2, amber)
right = hinge("Hinge right", root, (W / 2, 0, 0), 1, -math.pi / 2)
face(5, "right", right, 0, D, -H / 2, H / 2, amber)
back = hinge("Hinge back", bottom, (0, -D, 0), 0, -math.pi / 2, start=45, end=90)
face(4, "back", back, -W / 2, W / 2, -H, 0, green)


def corners(obj):
    return [obj.matrix_world @ v.co for v in obj.data.vertices]


def verify_geometry():
    # Endpoint topology: a planar six-face net must close to eight corners,
    # each shared by three faces, and twelve edges, each shared by two faces.
    scene.frame_set(0)
    bpy.context.view_layer.update()
    flat = [p for obj in faces for p in corners(obj)]
    assert max(p.y for p in flat) - min(p.y for p in flat) < 1e-7
    scene.frame_set(LAST_FRAME)
    bpy.context.view_layer.update()
    points, edges = {}, {}
    for obj in faces:
        vv = [tuple(round(v, 7) for v in p) for p in corners(obj)]
        for p in vv:
            points[p] = points.get(p, 0) + 1
        for i in range(4):
            edge = tuple(sorted((vv[i], vv[(i + 1) % 4])))
            edges[edge] = edges.get(edge, 0) + 1
    assert len(points) == 8 and set(points.values()) == {3}, points
    assert len(edges) == 12 and set(edges.values()) == {2}, edges
    bounds = [max(p[i] for p in points) - min(p[i] for p in points) for i in range(3)]
    assert all(abs(a - b) < 1e-6 for a, b in zip(bounds, (W / 100, D / 100, H / 100))), bounds
    # Every frame preserves each rectangle's dimensions and all five hinge
    # origins. This catches scale/parent/export modelling mistakes.
    for frame in range(LAST_FRAME + 1):
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        for obj in faces:
            vv = corners(obj)
            area = (vv[1] - vv[0]).cross(vv[3] - vv[0]).length * 10000
            expected = {1: 12, 2: 8, 3: 6, 4: 8, 5: 6, 6: 12}[int(obj.name.split()[1])]
            assert abs(area - expected) < 1e-4, (frame, obj.name, area)
        for obj in hinges:
            expected = obj.parent.matrix_world @ obj.location
            assert (obj.matrix_world.translation - expected).length < 1e-7
    return {"framesChecked": LAST_FRAME + 1, "closedCorners": len(points), "closedEdges": len(edges), "boundsMetres": bounds}


geometry_checks = verify_geometry()
# A vector fallback uses the very same unfolded mesh vertices. Keep the
# existing engine's dimensioned references as separate comparison assets.
scene.frame_set(0)
bpy.context.view_layer.update()
net_parts = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 280" width="280" height="280" role="img" aria-label="Numbered cuboid net: opposite faces 1 and 6, 2 and 4, 3 and 5">']
net_edges, net_numbers = {}, []
for obj in faces:
    number = int(obj.name.split()[1])
    points = [(round(p.x * 2400 + 140, 4), round(140 - p.z * 2400, 4)) for p in corners(obj)]
    fill = {1: "#c9e1f3", 6: "#c9e1f3", 2: "#d3e8da", 4: "#d3e8da", 3: "#f5e4c2", 5: "#f5e4c2"}[number]
    coords = " ".join(f"{x},{y}" for x, y in points)
    net_parts.append(f'<polygon points="{coords}" fill="{fill}"/>')
    for i in range(4):
        edge = tuple(sorted((points[i], points[(i + 1) % 4])))
        net_edges[edge] = net_edges.get(edge, 0) + 1
    x, y = (sum(p[i] for p in points) / 4 for i in (0, 1))
    net_numbers.append(f'<text x="{x}" y="{y + 5}" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" fill="#263b46">{number}</text>')
for (a, b), count in net_edges.items():
    dash = ' stroke-dasharray="4 3"' if count == 2 else ""
    net_parts.append(f'<path d="M{a[0]} {a[1]}L{b[0]} {b[1]}" fill="none" stroke="#263b46" stroke-width="1.2"{dash}/>')
net_parts.extend(net_numbers)
net_parts.append("</svg>")
assert sum(count == 2 for count in net_edges.values()) == 5
(OUTPUT / "cuboid-numbered-net.svg").write_text("\n".join(net_parts), encoding="utf-8")

# Convert typography/curves so the exported asset has no external font or
# texture dependencies. Keep hierarchy and animated hinge empties intact.
for obj in list(scene.objects):
    if obj.type in {"CURVE", "FONT"}:
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.convert(target="MESH")
scene.frame_set(0)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.preferences.addon_enable(module="io_scene_gltf2")
glb_path = OUTPUT / "cuboid-fold.glb"
bpy.ops.export_scene.gltf(
    filepath=str(glb_path), export_format="GLB", use_selection=True,
    export_animations=True, export_frame_range=True, export_force_sampling=True,
    export_animation_mode="SCENE", export_anim_scene_split_object=False,
    export_nla_strips_merged_animation_name="Fold", export_cameras=False,
    export_lights=False, export_extras=False,
)
raw = glb_path.read_bytes()
magic, version, length = struct.unpack_from("<4sII", raw)
json_length, json_type = struct.unpack_from("<II", raw, 12)
gltf = json.loads(raw[20:20 + json_length])
assert magic == b"glTF" and version == 2 and length == len(raw)
assert json_type == 0x4E4F534A
assert len(gltf["animations"]) == 1
assert gltf["animations"][0]["name"] == "Fold", gltf["animations"][0]["name"]
assert not gltf.get("images"), "The demo must remain self-contained"
times = [gltf["accessors"][s["input"]] for s in gltf["animations"][0]["samplers"]]
duration = max(a["max"][0] for a in times) - min(a["min"][0] for a in times)
assert abs(duration - 3) < 1e-6, duration

# Render a real Blender still for the comparison, with an orthographic
# camera (no perspective distortion). Dimension labels stay in the SVG.
scene.frame_set(LAST_FRAME)
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 32
scene.cycles.use_denoising = True
scene.render.resolution_x, scene.render.resolution_y = 960, 720
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = True
scene.world.node_tree.nodes["Background"].inputs["Color"].default_value = (1, 1, 1, 1)
scene.world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.8
scene.view_settings.view_transform = "Standard"
camera_data = bpy.data.cameras.new("Comparison camera")
camera = bpy.data.objects.new("Comparison camera", camera_data)
scene.collection.objects.link(camera)
scene.camera = camera
camera.location = (0.09, -0.12, 0.09)
camera.rotation_euler = (Vector((0, 0, 0.01)) - camera.location).to_track_quat("-Z", "Y").to_euler()
camera_data.type = "ORTHO"
camera_data.ortho_scale = 0.085
camera_data.clip_start = 0.001
light_data = bpy.data.lights.new("Soft key", "AREA")
light = bpy.data.objects.new("Soft key", light_data)
scene.collection.objects.link(light)
light.location = (-0.04, -0.08, 0.13)
light.rotation_euler = (-light.location).to_track_quat("-Z", "Y").to_euler()
light_data.energy, light_data.shape, light_data.size = 0.3, "DISK", 0.1
scene.render.filepath = str(OUTPUT / "cuboid-blender.png")
bpy.ops.render.render(write_still=True)

for kind, filename in (("cuboid", "cuboid.svg"), ("netCuboid", "cuboid-net.svg")):
    spec = {"version": "elem-1", "kind": kind, "w": W, "d": D, "h": H}
    result = subprocess.run(
        ["python", str(ROOT / "scripts/figure/render_spec.py")],
        input=json.dumps(spec).encode("utf-8"), stdout=subprocess.PIPE,
        stderr=subprocess.PIPE, check=True, cwd=ROOT,
    )
    payload = json.loads(result.stdout)
    if "svg" not in payload:
        raise RuntimeError(f"Existing engine failed: {payload}")
    (OUTPUT / filename).write_text(payload["svg"], encoding="utf-8")

manifest = {
    "generator": "scripts/blender/build_cuboid_demo.py",
    "blenderVersion": bpy.app.version_string,
    "dimensionsCm": {"width": W, "depth": D, "height": H},
    "oppositePairs": [[1, 6], [2, 4], [3, 5]],
    "animation": {"name": "Fold", "durationSeconds": duration},
    "geometryChecks": geometry_checks,
    "assets": {p.name: {"bytes": p.stat().st_size, "sha256": hashlib.sha256(p.read_bytes()).hexdigest()}
               for p in sorted(OUTPUT.iterdir()) if p.suffix in {".glb", ".png", ".svg"}},
}
(OUTPUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"output": str(OUTPUT), "elapsedSeconds": round(time.monotonic() - STARTED, 2), **manifest}))
