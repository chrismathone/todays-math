# Physical proof — brand motion

Original Blender geometry for today's-math: a thin ivory square worksheet with
an inset grid, a circle with perpendicular diameters and a right-angle marker,
a cobalt semicircular arch, a butter-yellow disc, and a mint paper underlay.
The orthographic studio view uses the brand palette and soft warm lighting.
No bitmap references, fonts, external textures, or generated text are embedded.

## Delivered assets

| Public URL | Format | Dimensions | Duration |
| --- | --- | --- | --- |
| `/brand/math-motion.webm` | VP9, YUV 4:2:0, no audio | 720 × 720 | 5 seconds / 24 fps |
| `/brand/math-motion.mp4` | H.264, YUV 4:2:0, fast start, no audio | 720 × 720 | 5 seconds / 24 fps |
| `/brand/math-motion-poster.webp` | Opaque WebP | 720 × 720 | Still |

The background is a lit paper surface using `#f7f5ef`; it contains a subtle
studio gradient rather than a flat or transparent border. Other materials use
navy `#172b4d`, cobalt `#3159df`, butter `#efd57a`, and mint `#d7ebe1`.

## Reproduce

Validated with Blender **5.2.1 LTS**, Python **3.12**, Pillow **12.3.0**, NumPy
**2.5.3**, and an existing FFmpeg build providing `libvpx-vp9` and `libx264`.
Rendering uses Eevee with 48 samples and no ray tracing, external add-ons, or
simulation. Run from the repository root; all Blender commands stay in the
background. No package installation or project dependency change is required
on the originating workstation.

Benchmark one frame before committing to a render:

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python scripts/brand/math_motion.py -- --mode benchmark
```

Render the sequence and an editable `.blend` into the ignored `build` folder:

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python scripts/brand/math_motion.py -- --mode render
```

Use `--size 640 --samples 24` for a slower machine. The render loop enforces a
540-second budget between frames. `--mode scene` writes only the editable
scene. The complete scene is reproducible from `math_motion.py`; the generated
`.blend` and PNG sequence are intentionally excluded from Git.

Encode with FFmpeg and ffprobe on PATH, or replace their argument values with
the paths to existing binaries:

```powershell
python scripts/brand/encode_math_motion.py --ffmpeg ffmpeg --ffprobe ffprobe
```

The encoder needs Pillow and NumPy in the Python environment. It writes both
videos and the WebP poster, decodes every video frame, checks dimensions,
duration, absent audio, file size, MP4 atom order, and the loop seam, then writes
`build/verification.json` and a four-frame `build/contact-sheet.png`.

All motion uses periodic trigonometric drivers. Frames 1–120 form the video;
frame 121 is rendered only to verify that the analytical endpoint matches frame
1. Omitting that duplicate endpoint keeps playback at a constant cadence.
Blender 5.2 warns that `use_nodes` will be removed in Blender 6; this script is
validated against the installed 5.2 API.

## Integration

Use WebM first with MP4 as a fallback and the WebP as the native video poster.
Reserve a 1:1 aspect ratio. The intended default is `preload="none"`, native
controls, muted audio state, looping, and **no autoplay**. Show the poster for
reduced-motion preferences; any optional autoplay implementation must also
provide pause control and stop when out of view. The asset contains no audio
track. Decorative presentation can use empty image alternative text; the
hosting figure can supply a concise caption if it helps explain the feature.

Source and media are original to this repository. No remote uploads, paid
model calls, student records, or external artwork are part of this pipeline.
