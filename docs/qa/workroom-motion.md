# Brand motion QA — 2026-09-14

Completed the original **Physical proof** Blender sculpture and its web assets.
The scope is limited to `scripts/brand/**`, `public/brand/math-motion*`, and this
report. The pre-existing `package-lock.json` change was left untouched.

| Asset | Bytes | Dimensions | Verified media |
| --- | ---: | --- | --- |
| `public/brand/math-motion.webm` | 266,655 | 720 × 720 | VP9, YUV 4:2:0, 120 frames, 5.000 s, no audio |
| `public/brand/math-motion.mp4` | 205,649 | 720 × 720 | H.264, YUV 4:2:0, 120 frames, 5.000 s, no audio, fast start |
| `public/brand/math-motion-poster.webp` | 20,730 | 720 × 720 | Opaque WebP, opening composition |

Every asset is well below the requested 1.5 MB per-video budget. Blender ran
only with `--background --factory-startup`; no visible application was opened.
The first cold single-frame benchmark took 17.338 seconds. After lighting
refinement, the final 48-sample benchmark took 1.540 seconds; the complete 121
frame render took **93.108 seconds**, below the ten-minute rendering limit.
The final render used Blender 5.2.1 LTS, Eevee, 720 px, and 48 samples.

Visual review used `view_image` on the render, the final WebP poster, and a
four-quarter contact sheet. The circle, diameters, grid, right-angle marker,
semicircle, and disc have deliberate mathematical geometry. The worksheet
stays legible as a geometric illustration at small sizes; motion is a gentle
assembly rotation, arch alignment, and small disc lift. No lettering is baked
into the artwork. The backdrop is warm opaque paper with a studio gradient.

Both complete videos decoded without FFmpeg errors, with exactly 120 frames
and no audio stream. The MP4 `moov` atom precedes `mdat`. Rendered frames 1 and
121 are **pixel-identical**. Encoded last-to-first mean absolute RGB differences
are **0.476811/255** for WebM and **0.411808/255** for MP4, including the normal
one-frame motion step and compression error. Largest adjacent-frame values
are 0.374707 and 0.250200 respectively; both pass the documented comparison
threshold of `1.35 × max_adjacent + 0.1`. No duplicate terminal frame is encoded.

SHA-256:

```text
math-motion-poster.webp c8fed92d9b7e44efcb239b24590ea07c3c142ea3bdc5ad4d7c57bc652d6eefb0
math-motion.webm        1d17918dcea38e1a9cb0f0e64b944706a04f056118aed443d3034b3b63514a6a
math-motion.mp4         954830ce10f895d91b76ef9099fdedcd669697ee6e6fb033cc482d9f3f970671
```

Reproduction and usage instructions: `scripts/brand/README.md`. Procedural
scene: `scripts/brand/math_motion.py`. Encoding and executable verification:
`scripts/brand/encode_math_motion.py`. The ignored `scripts/brand/build/` folder
retains the editable `.blend`, the source PNG sequence, contact sheet, render
timing, and verification JSON on this workstation.

FFmpeg and ffprobe were reused from the already installed Overwolf OBS tooling
under `C:/Users/user/AppData/Local/Overwolf/Extensions/ncfplpkmiejjaklknfnkgcpapnhkggmlcppckhcb/248.0.1/obs/bin/64bit/`.
Python's existing Pillow and NumPy installations were reused. There were no
downloads, package edits, remote uploads, paid model calls, or private data.

The root/auth/landing workers own integration and browser accessibility checks.
The delivered names match the coordinator's native video figure: WebM then
MP4, the WebP poster, a 1:1 frame, controls, `preload="none"`, muted, loop, and no
autoplay. Nothing remains within the motion-asset scope.
