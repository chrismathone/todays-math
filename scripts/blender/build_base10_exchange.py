"""Build and verify the base-ten exchange lab (Blender 5.2).

blender --background --factory-startup --python-exit-code 1 --python scripts/blender/build_base10_exchange.py
Add -- --render-dir <directory> for assembled/exploded PNG previews.
The single Base10Exchange clip groups 10 ones into a ten and 10 tens into a
hundred. Scrub backwards to ungroup; no blocks are added, hidden or scaled.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import struct
import sys

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public/lab/models/base10-exchange.glb"
CLIP = "Base10Exchange"
UNIT = 0.02
END = 60


def material(name, color):
    srgb = [int(color[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    linear = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb]
    mat = bpy.data.materials.new(name)
    mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*linear, 1)
    mat.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.7
    return mat


def box_mesh(name, face, edge):
    bpy.ops.mesh.primitive_cube_add(size=1)
    obj = bpy.context.object
    obj.data.materials.append(face)
    obj.data.materials.append(edge)
    bevel = obj.modifiers.new("Visible unit boundaries", "BEVEL")
    bevel.width, bevel.segments, bevel.material = 0.035, 1, 1
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    mesh = obj.data
    mesh.name = name
    # Keep mesh users while removing the template object.
    mesh.use_fake_user = True
    bpy.data.objects.remove(obj, do_unlink=True)
    return mesh


def node(name, parent, mesh=None, location=(0, 0, 0)):
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.parent, obj.location = parent, location
    return obj


def animate(obj, loose, grouped):
    for frame, location in [(0, loose), (END, grouped)]:
        obj.location = location
        obj.keyframe_insert(data_path="location", frame=frame)


def verify_glb():
    raw = OUT.read_bytes()
    magic, version, size, json_size, chunk_type = struct.unpack_from("<4sIIII", raw)
    assert magic == b"glTF" and version == 2 and size == len(raw)
    assert chunk_type == 0x4E4F534A and size < 1_000_000
    gltf = json.loads(raw[20:20 + json_size])
    assert len(gltf["animations"]) == 1
    clip = gltf["animations"][0]
    assert clip["name"] == CLIP
    inputs = [gltf["accessors"][s["input"]] for s in clip["samplers"]]
    duration = max(a["max"][0] for a in inputs) - min(a["min"][0] for a in inputs)
    assert duration == 2
    assert not gltf.get("images") and not gltf.get("cameras")
    mesh_nodes = [n for n in gltf["nodes"] if "mesh" in n]
    assert len(mesh_nodes) == 110, len(mesh_nodes)
    assert len([n for n in mesh_nodes if n["name"].startswith("One_")]) == 10
    assert len([n for n in mesh_nodes if n["name"].startswith("HundredUnit_")]) == 100
    assert len([n for n in gltf["nodes"] if n["name"].startswith("TenRod_")]) == 10
    assert all(c["target"]["path"] == "translation" for c in clip["channels"])
    return {"bytes": size, "animation": CLIP, "durationSeconds": duration,
            "unitCubes": 110, "hundredRods": 10, "animatedGroups": len(clip["channels"])}


def render_previews(directory):
    directory.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 32
    scene.render.resolution_x, scene.render.resolution_y = 1200, 760
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.world.color = (0.4, 0.4, 0.4)
    scene.view_settings.view_transform = "Standard"
    bpy.ops.object.camera_add(location=(0.20, -0.57, 0.72))
    camera = bpy.context.object
    camera.rotation_euler = (Vector((-0.005, 0, 0.005)) - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.type, camera.data.ortho_scale = "ORTHO", 0.64
    scene.camera = camera
    for position, power, size in [((0, -0.3, 0.65), 30, 0.5), ((-0.4, 0.2, 0.3), 12, 0.4)]:
        bpy.ops.object.light_add(type="AREA", location=position)
        lamp = bpy.context.object
        lamp.data.energy, lamp.data.shape, lamp.data.size = power, "DISK", size
        lamp.rotation_euler = (-lamp.location).to_track_quat("-Z", "Y").to_euler()
    for frame, name in [(0, "exploded"), (END // 2, "exchange"), (END, "assembled")]:
        scene.frame_set(frame)
        scene.render.filepath = str(directory / f"base10-{name}.png")
        bpy.ops.render.render(write_still=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--render-dir", type=Path)
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    scene = bpy.context.scene
    scene.name = CLIP
    scene.frame_start, scene.frame_end, scene.render.fps = 0, END, 30
    root = node("BaseTenExchange", None)
    root.scale = (UNIT,) * 3
    ones_mesh = box_mesh("One unit teal", material("Ones teal", "42ad9f"), material("Ones edges", "20756e"))
    tens_mesh = box_mesh("One unit amber", material("Tens amber", "efbd69"), material("Tens edges", "aa732e"))

    ones = []
    for i in range(10):
        obj = node(f"One_{i + 1:02d}", root, ones_mesh)
        # Ten separate units close into one straight rod, keeping their size.
        animate(obj, (-9, (i - 4.5) * 1.65, 0.5), (-9, i - 4.5, 0.5))
        ones.append(obj)
    rods, hundred = [], []
    for x in range(10):
        rod = node(f"TenRod_{x + 1:02d}", root)
        animate(rod, (3 + (x - 4.5) * 1.65, 0, 0), (3 + x - 4.5, 0, 0))
        rods.append(rod)
        for y in range(10):
            hundred.append(node(f"HundredUnit_{x + 1:02d}_{y + 1:02d}", rod, tens_mesh, (0, y - 4.5, 0.5)))

    # Validate both geometry and value conservation at every sampled frame.
    assert len(ones) == 10 and len(rods) == 10 and len(hundred) == 100
    for frame in range(END + 1):
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        for obj in ones + hundred:
            corners = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
            dimensions = [max(c[i] for c in corners) - min(c[i] for c in corners) for i in range(3)]
            assert all(abs(d - UNIT) < 1e-7 for d in dimensions)
        # No intermediate overlap may make two counted units look like one.
        for first, second in zip(ones, ones[1:]):
            assert second.location.y - first.location.y >= 1 - 1e-6
        for first, second in zip(rods, rods[1:]):
            assert second.location.x - first.location.x >= 1 - 1e-6
    for i, obj in enumerate(ones):
        assert (obj.location - Vector((-9, i - 4.5, 0.5))).length < 1e-6
    for i, rod in enumerate(rods):
        assert len(rod.children) == 10
        assert abs(rod.location.x - (3 + i - 4.5)) < 1e-6
    scene.frame_set(0)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(OUT), export_format="GLB", export_animations=True,
        export_animation_mode="SCENE", export_anim_scene_split_object=False,
        export_nla_strips_merged_animation_name=CLIP, export_frame_range=True,
        export_force_sampling=True, export_cameras=False, export_lights=False,
    )
    checks = verify_glb()
    # Import the deliverable, so previews check exported geometry and animation.
    if args.render_dir:
        bpy.ops.object.select_all(action="SELECT")
        bpy.ops.object.delete(use_global=False)
        bpy.ops.import_scene.gltf(filepath=str(OUT))
        render_previews(args.render_dir)
    print(json.dumps({"blender": bpy.app.version_string, "framesChecked": END + 1, **checks}))


if __name__ == "__main__":
    main()
