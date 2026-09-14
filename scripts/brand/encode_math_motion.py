"""Encode and fully decode the Blender sequence; validate dimensions and loop seam."""

import argparse
import hashlib
import json
from pathlib import Path
import subprocess

import numpy as np
from PIL import Image


def run(command):
    return subprocess.run([str(arg) for arg in command], check=True, capture_output=True)


def difference(a, b):
    return float(np.abs(a.astype(np.int16) - b.astype(np.int16)).mean())


def verify_video(path, ffmpeg, ffprobe, expected_frames, fps, size):
    probe = json.loads(run([ffprobe, '-v', 'error', '-show_streams', '-show_format',
                            '-of', 'json', path]).stdout)
    streams = probe['streams']
    assert len(streams) == 1 and streams[0]['codec_type'] == 'video', 'Video must have no audio track'
    stream = streams[0]
    assert (stream['width'], stream['height']) == (size, size)
    assert stream['pix_fmt'] == 'yuv420p'
    duration = float(probe['format']['duration'])
    assert abs(duration - expected_frames / fps) < 0.05
    assert path.stat().st_size < 1_500_000
    decoder = subprocess.Popen([str(ffmpeg), '-v', 'error', '-i', str(path),
                                '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                               stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    first = previous = None
    deltas, count = [], 0
    while True:
        data = decoder.stdout.read(size * size * 3)
        if not data:
            break
        assert len(data) == size * size * 3, 'Partial decoded frame'
        frame = np.frombuffer(data, dtype=np.uint8)
        if first is None:
            first = frame
        if previous is not None:
            deltas.append(difference(frame, previous))
        previous = frame
        count += 1
    error = decoder.stderr.read().decode()
    assert decoder.wait() == 0 and not error, error
    assert count == expected_frames, (count, expected_frames)
    seam = difference(first, previous)
    assert seam <= max(deltas) * 1.35 + 0.1, f'Loop seam {seam:.6f} exceeds adjacent maximum {max(deltas):.6f}'
    return {'path': path.as_posix(), 'bytes': path.stat().st_size,
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            'codec': stream['codec_name'], 'pixel_format': stream['pix_fmt'],
            'dimensions': [size, size], 'duration_seconds': duration,
            'decoded_frames': count, 'audio_tracks': 0,
            'mean_adjacent_rgb_delta': round(float(np.mean(deltas)), 6),
            'max_adjacent_rgb_delta': round(max(deltas), 6),
            'last_to_first_rgb_delta': round(seam, 6)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--ffmpeg', required=True, type=Path)
    parser.add_argument('--ffprobe', required=True, type=Path)
    parser.add_argument('--build-dir', type=Path, default=Path(__file__).parent / 'build')
    parser.add_argument('--output-dir', type=Path, default=Path(__file__).resolve().parents[2] / 'public' / 'brand')
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    render = json.loads((args.build_dir / 'render.json').read_text())
    frame_count, fps, size = render['frames_rendered'] - 1, render['fps'], render['size']
    start = Image.open(args.build_dir / 'frame-0001.png').convert('RGB')
    endpoint = Image.open(args.build_dir / f'frame-{frame_count + 1:04d}.png').convert('RGB')
    endpoint_error = difference(np.asarray(start), np.asarray(endpoint))
    assert endpoint_error < 0.02, 'Analytical endpoint should match the opening frame'
    poster = args.output_dir / 'math-motion-poster.webp'
    start.save(poster, 'WEBP', quality=92, method=6)
    assert Image.open(poster).size == (size, size)

    common = [args.ffmpeg, '-y', '-v', 'error', '-framerate', fps, '-start_number', 1,
              '-i', args.build_dir / 'frame-%04d.png', '-frames:v', frame_count, '-an',
              '-vf', 'scale=in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p',
              '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709']
    webm = args.output_dir / 'math-motion.webm'
    mp4 = args.output_dir / 'math-motion.mp4'
    run(common + ['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '18', '-deadline', 'good',
                  '-cpu-used', '2', '-row-mt', '1', '-g', frame_count, webm])
    run(common + ['-c:v', 'libx264', '-crf', '16', '-preset', 'slow', '-tune', 'animation',
                  '-movflags', '+faststart', '-g', frame_count, mp4])
    data = mp4.read_bytes()
    assert 0 < data.index(b'moov') < data.index(b'mdat'), 'MP4 must support fast start'
    report = {'render': render, 'source_endpoint_rgb_delta': round(endpoint_error, 6),
              'poster': {'path': poster.as_posix(), 'bytes': poster.stat().st_size,
                         'sha256': hashlib.sha256(poster.read_bytes()).hexdigest()},
              'videos': [verify_video(path, args.ffmpeg, args.ffprobe, frame_count, fps, size)
                         for path in (webm, mp4)]}
    contact = Image.new('RGB', (720, 720))
    for i, frame in enumerate((1, 1 + frame_count // 4, 1 + frame_count // 2, 1 + 3 * frame_count // 4)):
        still = Image.open(args.build_dir / f'frame-{frame:04d}.png')
        contact.paste(still.resize((360, 360), Image.Resampling.LANCZOS), ((i % 2) * 360, (i // 2) * 360))
    contact.save(args.build_dir / 'contact-sheet.png')
    (args.build_dir / 'verification.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
