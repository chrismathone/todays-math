"""Original procedural 'Physical proof' sculpture. Run with Blender --background.

No external textures, fonts, add-ons, network access, or random simulation.
See README.md for benchmark, render, encode, and verification commands.
"""

import argparse
import json
import math
from pathlib import Path
import sys
import time

import bpy
from mathutils import Vector


def arguments():
    parser = argparse.ArgumentParser()
    parser.add_argument('--mode', choices=('benchmark', 'render', 'scene'), default='benchmark')
    parser.add_argument('--output-dir', type=Path, default=Path(__file__).parent / 'build')
    parser.add_argument('--size', type=int, default=720)
    parser.add_argument('--samples', type=int, default=48)
    parser.add_argument('--frames', type=int, default=120)
    parser.add_argument('--fps', type=int, default=24)
    parser.add_argument('--render-budget', type=int, default=540)
    parser.add_argument('--benchmark-frames', type=int, default=1)
    return parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])


def linear_color(hex_color):
    rgb = [int(hex_color[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in rgb) + (1,)


def material(name, color, roughness=0.6, paper=False):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = linear_color(color)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    shader = nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = mat.diffuse_color
    shader.inputs['Roughness'].default_value = roughness
    if paper:
        grain = nodes.new('ShaderNodeTexNoise')
        grain.inputs['Scale'].default_value = 185
        grain.inputs['Detail'].default_value = 2
        bump = nodes.new('ShaderNodeBump')
        bump.inputs['Strength'].default_value = 0.14
        bump.inputs['Distance'].default_value = 0.012
        mat.node_tree.links.new(grain.outputs['Fac'], bump.inputs['Height'])
        mat.node_tree.links.new(bump.outputs['Normal'], shader.inputs['Normal'])
    return mat


def finish(obj, name, mat, bevel=0):
    obj.name = name
    obj.data.materials.append(mat)
    if bevel:
        modifier = obj.modifiers.new('Soft machined edge', 'BEVEL')
        modifier.width = bevel
        modifier.segments = 3
        obj.modifiers.new('Weighted normals', 'WEIGHTED_NORMAL')
    return obj


def block(name, dimensions, location, mat, bevel=0.025, parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1)
    obj = bpy.context.object
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.parent = parent
    obj.location = location
    return finish(obj, name, mat, bevel)


def group(name, location=(0, 0, 0)):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    return obj


def stroke(name, points, mat, radius=0.007, parent=None, cyclic=False):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.resolution_u = 1
    curve.bevel_depth = radius
    curve.bevel_resolution = 2
    spline = curve.splines.new('POLY')
    spline.points.add(len(points) - 1)
    for point, xyz in zip(spline.points, points):
        point.co = (*xyz, 1)
    spline.use_cyclic_u = cyclic
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    obj.data.materials.append(mat)
    return obj


def disc(name, radius, depth, location, mat, parent=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=radius, depth=depth)
    obj = bpy.context.object
    obj.parent = parent
    obj.location = location
    for face in obj.data.polygons:
        face.use_smooth = len(face.vertices) == 4
    return finish(obj, name, mat, min(depth / 4, 0.018))


def arch(mat, parent):
    # Exact concentric semicircles, extruded in Y; the base lies on Z=0.
    vertices, faces = [], []
    steps, outer, inner, depth = 80, 1.17, 0.93, 0.19
    for y in (-depth / 2, depth / 2):
        for radius in (outer, inner):
            vertices.extend((radius * math.cos(math.pi * i / steps), y,
                             radius * math.sin(math.pi * i / steps)) for i in range(steps + 1))
    row = steps + 1
    for i in range(steps):
        faces.extend(((i, i + 1, row + i + 1, row + i),
                      (2 * row + i, 3 * row + i, 3 * row + i + 1, 2 * row + i + 1),
                      (i, 2 * row + i, 2 * row + i + 1, i + 1),
                      (row + i, row + i + 1, 3 * row + i + 1, 3 * row + i)))
    faces.extend(((0, row, 3 * row, 2 * row), (steps, 2 * row + steps, 3 * row + steps, row + steps)))
    mesh = bpy.data.meshes.new('Concentric semicircular arch')
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new('Cobalt / semicircle', mesh)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    finish(obj, obj.name, mat, 0.018)
    return obj


def animate(obj, path, index, expression):
    obj.driver_add(path, index).driver.expression = expression


def aim(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()


def build_scene(args):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE'
    scene.eevee.taa_render_samples = args.samples
    scene.eevee.use_raytracing = False
    scene.eevee.use_fast_gi = True
    scene.eevee.fast_gi_ray_count = 2
    scene.eevee.fast_gi_step_count = 8
    scene.eevee.shadow_ray_count = 2
    scene.render.resolution_x = args.size
    scene.render.resolution_y = args.size
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGB'
    scene.render.image_settings.compression = 20
    scene.render.fps = args.fps
    scene.render.use_file_extension = True
    scene.render.use_motion_blur = False
    scene.render.dither_intensity = 0
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.look = 'None'
    scene.view_settings.exposure = 0
    scene.view_settings.gamma = 1
    scene.frame_start = 1
    scene.frame_end = args.frames

    ivory = material('Ivory / cotton paper', 'f7f5ef', 0.82, paper=True)
    mint = material('Mint / paperboard', 'd7ebe1', 0.8, paper=True)
    cobalt = material('Cobalt / satin ceramic', '3159df', 0.36)
    navy = material('Navy / fine ink', '172b4d', 0.8)
    butter = material('Butter / satin disc', 'efd57a', 0.4)
    grid_ink = material('Grid / sage grey ink', 'd3d9d2', 0.9)
    floor_mat = material('Backdrop / warm paper', 'f7f5ef', 0.9)
    block('Infinite warm paper', (200, 200, 0.1), (0, 0, -0.075), floor_mat, 0)

    root = group('Proof / gently aligning assembly')
    phase = f'(2*pi*(frame-1)/{args.frames})'
    animate(root, 'rotation_euler', 2, f'0.035*sin({phase})')
    mint_group = group('Mint / underlay')
    mint_group.parent = root
    mint_group.rotation_euler.z = math.radians(-12)
    block('Mint rectangular sheet', (3.85, 3.15, 0.055), (-0.14, 0.12, 0.035), mint, 0.026, mint_group)

    worksheet = group('Ivory / worksheet', (0.12, -0.18, 0.14))
    worksheet.parent = root
    worksheet.rotation_euler.z = math.radians(5)
    block('Thin square worksheet tile', (3.22, 3.22, 0.065), (0, 0, 0), ivory, 0.03, worksheet)
    # A faint square grid, inset inside the worksheet, made from geometry.
    for i in range(-7, 8):
        p = i * 0.2
        stroke(f'Grid vertical {i}', [(p, -1.4, 0.034), (p, 1.4, 0.034)], grid_ink, 0.0026, worksheet)
        stroke(f'Grid horizontal {i}', [(-1.4, p, 0.034), (1.4, p, 0.034)], grid_ink, 0.0026, worksheet)

    # The circle, its perpendicular diameters, and the right-angle marker are exact.
    cx, cy, radius, z = 0.25, -0.38, 0.83, 0.041
    stroke('Circle / exact radius', [(cx + radius * math.cos(i * 2 * math.pi / 160),
                                     cy + radius * math.sin(i * 2 * math.pi / 160), z)
                                    for i in range(160)], cobalt, 0.009, worksheet, True)
    stroke('Horizontal diameter', [(cx - 1.11, cy, z), (cx + 1.11, cy, z)], navy, 0.005, worksheet)
    stroke('Vertical diameter', [(cx, cy - 0.99, z), (cx, cy + 1.13, z)], navy, 0.005, worksheet)
    stroke('Right angle / 90 degrees', [(cx + 0.15, cy, z + 0.003),
                                       (cx + 0.15, cy + 0.15, z + 0.003),
                                       (cx, cy + 0.15, z + 0.003)], cobalt, 0.006, worksheet)
    disc('Circle / centre point', 0.035, 0.008, (cx, cy, z), cobalt, worksheet)
    for i in range(4):
        angle = i * math.pi / 2
        disc(f'Circle / cardinal point {i}', 0.02, 0.006,
             (cx + radius * math.cos(angle), cy + radius * math.sin(angle), z), cobalt, worksheet)

    arch_group = group('Arch / assembly', (-0.34, 0.53, 0.18))
    arch_group.parent = root
    arch_group.rotation_euler.z = math.radians(-8)
    arch(cobalt, arch_group)
    animate(arch_group, 'rotation_euler', 2, f'-0.139626 + 0.035*(1-cos({phase}))')

    disc_group = group('Butter / moving disc', (1.18, 0.55, 0.68))
    disc_group.parent = root
    coin = disc('Butter circular tile', 0.43, 0.135, (0, 0, 0), butter, disc_group)
    coin.rotation_euler.x = math.radians(74)
    disc_group.rotation_euler.z = math.radians(-16)
    animate(disc_group, 'location', 0, f'1.18 + 0.10*(1-cos({phase}))')
    animate(disc_group, 'location', 2, f'0.68 + 0.06*(1-cos({phase}))')
    animate(disc_group, 'rotation_euler', 2, f'-0.279253 + 0.07*sin({phase})')

    # A small parallel pair of navy strips suggests a precise measuring tool.
    for i in range(2):
        block(f'Navy alignment strip {i}', (0.48, 0.027, 0.022),
              (-1.12, -0.95 + i * 0.11, 0.055), navy, 0.007, worksheet)

    world = bpy.data.worlds.new('Warm studio')
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (1, 0.98, 0.94, 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.65
    for name, location, energy, size in (
        ('Large softbox / left', (-6, -8, 14), 1200, 9),
        ('Fill / right', (8, 2, 10), 400, 7),
    ):
        bpy.ops.object.light_add(type='AREA', location=location)
        light = bpy.context.object
        light.name = name
        light.data.energy = energy
        light.data.shape = 'DISK'
        light.data.size = size
        aim(light, (0, 0, 0))

    bpy.ops.object.camera_add(location=(5.7, -8.5, 7.6))
    camera = bpy.context.object
    camera.name = 'Orthographic / stationery portrait'
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = 5.7
    camera.data.lens = 50
    aim(camera, (0, 0, 0.30))
    scene.camera = camera
    scene['artwork'] = 'Physical proof / original procedural brand sculpture'
    scene['loop'] = f'{args.frames} frames at {args.fps} fps; frame {args.frames + 1} equals frame 1'
    scene.frame_set(1)
    return scene


def main():
    args = arguments()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    scene = build_scene(args)
    bpy.ops.wm.save_as_mainfile(filepath=str((args.output_dir / 'math-motion.blend').resolve()))
    if args.mode == 'scene':
        return
    started = time.perf_counter()
    frames = list(range(1, args.benchmark_frames + 1)) if args.mode == 'benchmark' else list(range(1, args.frames + 2))
    for index, frame in enumerate(frames):
        elapsed = time.perf_counter() - started
        if elapsed > args.render_budget:
            raise RuntimeError(f'Render budget exceeded at frame {frame}: {elapsed:.1f}s; lower size/samples.')
        scene.frame_set(frame)
        scene.render.filepath = str((args.output_dir / f'frame-{frame:04d}.png').resolve())
        frame_start = time.perf_counter()
        bpy.ops.render.render(write_still=True)
        print(f'BRAND_FRAME {frame}/{frames[-1]} {time.perf_counter() - frame_start:.3f}s', flush=True)
    report = {'mode': args.mode, 'blender': bpy.app.version_string, 'size': args.size,
              'samples': args.samples, 'frames_rendered': len(frames), 'fps': args.fps,
              'render_seconds': round(time.perf_counter() - started, 3)}
    (args.output_dir / f'{args.mode}.json').write_text(json.dumps(report, indent=2) + '\n')
    print('BRAND_RENDER ' + json.dumps(report), flush=True)


if __name__ == '__main__':
    main()
