"""Local audition assets only; no API keys, cloud inference, or publication."""
import argparse
import hashlib
import html
import json
import re
import subprocess
import sys
import wave
from pathlib import Path

import imageio_ffmpeg
import numpy as np
import onnxruntime as ort
import soundfile as sf
from kokoro_onnx import Kokoro

sys.stdout.reconfigure(encoding='utf-8')

parser = argparse.ArgumentParser()
parser.add_argument('--samples', required=True)
parser.add_argument('--models', required=True)
parser.add_argument('--out', required=True)
args = parser.parse_args()
data = json.loads(Path(args.samples).read_text(encoding='utf-8-sig'))
assert data['version'] == 1 and len(data['samples']) == 3
out = Path(args.out).resolve()
out.mkdir(parents=True, exist_ok=True)
options = ort.SessionOptions()
options.intra_op_num_threads = 3
options.inter_op_num_threads = 1
models = Path(args.models)
session = ort.InferenceSession(str(models / 'kokoro-v1.0.onnx'), sess_options=options, providers=['CPUExecutionProvider'])
engine = Kokoro.from_session(session, str(models / 'voices-v1.0.bin'))
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
speeds = {'sample-01': 0.78, 'sample-02': 0.86, 'sample-03': 0.94}
receipts = []
cards = []
for sample in data['samples']:
    sid = sample['id']
    assert sid in speeds
    assert len(sample['questions']) == 3
    speakers = {s['id']: s for s in sample['speakers']}
    for question in sample['questions']:
        assert len(question['choices']) == 5
        assert 0 <= question['answerIndex'] < 5
        assert len(set(question['choices'])) == 5
        assert question['evidenceTurnIndices']
        assert all(0 <= i < len(sample['turns']) for i in question['evidenceTurnIndices'])
    segments = []
    timing = []
    sample_rate = 24000
    position = int(0.35 * sample_rate)
    segments.append(np.zeros(position, dtype=np.float32))
    for index, turn in enumerate(sample['turns']):
        voice = speakers[turn['speaker']]['voice']
        print(f'{sid} turn {index + 1}/{len(sample["turns"])} ({voice})', flush=True)
        samples, rate = engine.create(turn['text'], voice=voice, speed=speeds[sid], lang='en-gb' if voice.startswith('b') else 'en-us')
        assert rate == sample_rate and len(samples) > 1000 and np.isfinite(samples).all()
        timing.append({'turnIndex': index, 'startMs': round(position * 1000 / rate), 'endMs': round((position + len(samples)) * 1000 / rate)})
        segments.append(samples)
        pause = np.zeros(int(rate * 0.40), dtype=np.float32)
        segments.append(pause)
        position += len(samples) + len(pause)
    audio = np.concatenate(segments)
    # Apply only attenuation if necessary, keeping speech dynamics and avoiding clipping.
    peak = float(np.max(np.abs(audio)))
    if peak > 0.95:
        audio *= 0.95 / peak
    wav_path, mp3_path = out / f'{sid}.wav', out / f'{sid}.mp3'
    sf.write(wav_path, audio, sample_rate, subtype='PCM_16')
    subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-i', str(wav_path), '-map_metadata', '-1', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '96k', str(mp3_path)], check=True, creationflags=0x08000000)
    with wave.open(str(wav_path)) as check:
        assert check.getnchannels() == 1 and check.getsampwidth() == 2 and check.getframerate() == 24000
        duration_ms = round(check.getnframes() * 1000 / check.getframerate())
    assert 10000 < duration_ms < 120000
    words = len(re.findall(r"\b[A-Za-z]+(?:'[A-Za-z]+)?\b", ' '.join(t['text'] for t in sample['turns'])))
    row = {'id': sid, 'title': sample['title'], 'level': sample['level'], 'durationMs': duration_ms, 'words': words, 'overallWordsPerMinute': round(words * 60000 / duration_ms, 1), 'speed': speeds[sid], 'sha256': hashlib.sha256(wav_path.read_bytes()).hexdigest(), 'wavBytes': wav_path.stat().st_size, 'mp3Bytes': mp3_path.stat().st_size, 'peak': float(np.max(np.abs(audio))), 'rms': float(np.sqrt(np.mean(audio ** 2))), 'timing': timing, 'humanAudioReview': False}
    receipts.append(row)
    (out / f'{sid}-manifest.json').write_text(json.dumps(row, ensure_ascii=False, indent=2), encoding='utf-8')
    escape = html.escape
    transcript = ''.join(f'<p><strong>{escape(t["speaker"])}</strong> {escape(t["text"])}</p><p class="translation">{escape(t["translation"])}</p>' for t in sample['turns'])
    questions = ''
    for index, q in enumerate(sample['questions']):
        choices = ''.join(f'<li>{escape(choice)}</li>' for choice in q['choices'])
        questions += f'<section class="question"><h3>{index+1}. {escape(q["prompt"])}</h3><ol>{choices}</ol><details><summary>정답과 해설</summary><p>정답 {q["answerIndex"]+1}번 · {escape(q["explanation"])}</p></details></section>'
    cards.append(f'<article><p class="level">{escape(sample["level"])} · {duration_ms/1000:.0f}초 · 3문항</p><h2>{escape(sample["title"])}</h2><p>{escape(sample["scenario"])}</p><audio controls preload="metadata" src="{sid}.mp3"></audio><p><a href="{sid}.mp3" download>MP3 저장</a> · <a href="{sid}.wav" download>WAV 저장</a></p>{questions}<details><summary>대본과 해석 보기</summary>{transcript}</details></article>')
    print(json.dumps({key: value for key,value in row.items() if key != 'timing'}, ensure_ascii=False), flush=True)

receipt = {'engine':'Kokoro v1.0 / kokoro-onnx 0.6.1, local CPU', 'cloudApiCalls':0, 'newApiCharge':0, 'samples': receipts}
(out / 'manifest.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=2), encoding='utf-8')
(out / 'samples.json').write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
page = '''<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>영어듣기 청취 샘플 3종</title><style>body{margin:0;background:#f3f5fa;color:#172842;font:16px/1.7 system-ui,sans-serif}main{max-width:860px;padding:30px 18px 70px;margin:auto}h1{font-size:28px}h2{margin:0 0 12px}h3{font-size:17px}article{background:white;border:1px solid #d8e0ee;border-radius:12px;margin:24px 0;padding:24px}.level{color:#345be3;font-weight:700;margin-top:0}audio{width:100%;margin:12px 0}a{color:#2b50d3}summary{cursor:pointer;color:#2b50d3;padding:8px 0}summary:hover{background:#f1f4ff}.question{border-top:1px solid #e3e8f1;margin:20px 0;padding-top:8px}.translation{color:#66758a;margin-top:-8px}small{color:#66758a}footer{font-size:13px}details{margin:10px 0}audio:focus-visible,summary:focus-visible,a:focus-visible{outline:3px solid #4a6cfa;outline-offset:3px}@media(max-width:500px){article{padding:18px}h1{font-size:24px}}</style><main><h1>영어듣기 청취 샘플</h1><p>난이도와 화자를 달리한 3개 자료입니다. 먼저 듣고 문제를 푼 뒤 대본을 열어보세요.</p><p><small>자체 제작 대본 · AI 합성 음성 · 청취 검수 전 초안</small></p>''' + ''.join(cards) + '''<footer><p>대본·문항: 연결된 Codex 구독 모델. 음원: 로컬 Kokoro 모델. 별도 유료 API 호출 없음.</p><p><a href="https://huggingface.co/hexgrad/Kokoro-82M">Kokoro 모델 · Apache 2.0</a> · <a href="https://github.com/thewh1teagle/kokoro-onnx">음성 실행 도구</a></p></footer></main><script>document.querySelectorAll('audio').forEach(audio=>audio.addEventListener('play',()=>document.querySelectorAll('audio').forEach(other=>{if(other!==audio)other.pause()})));</script></html>'''
(out / 'index.html').write_text(page, encoding='utf-8')
print('Created preview: ' + str(out / 'index.html'), flush=True)
