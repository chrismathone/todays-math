"""Freeze 10/10/10 controls and independently replay exact native PCM/input hashes."""
import argparse
import base64
import collections
import gc
import io
import json
import subprocess
import sys
import wave
from pathlib import Path

import av
import numpy as np

from ctc_core import checked, immutable_json, literal_instruction, reference, require, sha_bytes

CODEX = Path(__file__).resolve().parent.parent / 'codex'
sys.path.insert(0, str(CODEX))
import claude_adapter as adapter
import localized_adapter as localized
import verifier

INVENTORY_SHA = '58a53b05cced7b7f9f2b99cc641d8e84e6cf4ee7771bea3f7efa745449fda913'
CLOCK_SHA = 'bb8b37ddcd038f2f4bd2bafd346873705275aa88b2d78d605815665589f16591'


def mono_input(pcm, rate, channels):
    """Same s16 mono PyAV/FIFO preparation as existing faster-whisper audio.py.

    No recognition/VAD/ASR model is loaded. Hash equality against every existing
    raw input is mandatory rather than assuming two resamplers are equivalent.
    """
    wav = io.BytesIO()
    with wave.open(wav, 'wb') as w:
        w.setnchannels(channels)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm)
    wav.seek(0)
    resampler = av.audio.resampler.AudioResampler(format='s16', layout='mono', rate=16000)
    fifo = av.audio.fifo.AudioFifo()
    output = []
    with av.open(wav, mode='r', metadata_errors='ignore') as container:
        for frame in container.decode(audio=0):
            frame.pts = None
            fifo.write(frame)
            if fifo.samples >= 500000:
                output.extend(f.to_ndarray().tobytes() for f in resampler.resample(fifo.read()))
        if fifo.samples:
            output.extend(f.to_ndarray().tobytes() for f in resampler.resample(fifo.read()))
        output.extend(f.to_ndarray().tobytes() for f in resampler.resample(None))
    del resampler
    gc.collect()
    return np.frombuffer(b''.join(output), dtype='<i2').astype(np.float32) / 32768.0


def balanced(rows, count):
    groups = collections.defaultdict(list)
    for row in rows:
        groups[row['sourceRecordId']].append(row)
    for group in groups.values():
        group.sort(key=lambda r: (r['rawProbe']['onsetFrame'], r['probe']['path'], r['probe']['probeId']))
    selected, seen = [], set()
    while len(selected) < count and any(groups.values()):
        for source in sorted(groups):
            if not groups[source]:
                continue
            row = groups[source].pop(0)
            key = (source, row['rawProbe']['onsetFrame'])
            if key not in seen:
                selected.append(row)
                seen.add(key)
            if len(selected) == count:
                break
    return selected


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=False)
    (args.output / 'inputs').mkdir()
    inv_ref = {'path': str(args.base / 'rebase-baseline-001/inventory.json'), 'sha256': INVENTORY_SHA}
    clock_ref = {'path': str(args.base / 'rebase-baseline-001/clock.json'), 'sha256': CLOCK_SHA}
    inventory, clocks = checked(inv_ref), checked(clock_ref)
    require(clocks['inventorySha256'] == INVENTORY_SHA, 'clock_inventory_binding')
    replay_ref = reference(args.base / 'codex/pilot-heading-replay-002.json')
    physical_ref = reference(args.base / 'codex/physical-controls-001.json')
    replay, physical = checked(replay_ref), checked(physical_ref)
    sources = {s['sourceRecordId']: s for s in inventory['records']}
    clock_index = {s['sourceRecordId']: s for s in clocks['records']}
    physical_index = {s['sourceRecordId']: s for s in physical['sourceChecks']}
    inputs = [inv_ref, clock_ref, replay_ref, physical_ref]
    # Freeze producer pilot, which remains read-only and is not sampling gold.
    for name in ('summary.json', 'tables.json', 'candidates.json', 'ledger.json'):
        inputs.append(reference(args.base / 'claude/runs/pilot-003' / name))
    eligible, excluded = [], []
    for r in replay['records']:
        try:
            quote = literal_instruction(r['rawProbe'], verifier.uncertain, localized.literal_cue)
            eligible.append({**r, 'literalInstruction': quote})
        except ValueError as error:
            excluded.append({'sourceRecordId': r['sourceRecordId'], 'probe': r['probe'], 'reason': str(error)})
    positives = balanced([r for r in eligible if r['status'] == 'native_heading_replayed'], 10)
    mismatch = balanced([r for r in eligible if r['reasons'] == ['pilot_onset_cue_correspondence_missing']], 10)
    require(len(positives) == len(mismatch) == 10, 'bounded_cohort_unavailable')
    selected = []
    def add(row, category, control=None):
        selected.append({'id': f'c{len(selected)+1:02}', 'category': category,
                         'sourceRecordId': row['sourceRecordId'], 'probe': row['probe'],
                         'rawProbe': row['rawProbe'], 'literalInstruction': row['literalInstruction'],
                         'historicalReplayStatus': row['status'], 'historicalReplayReasons': row['reasons'],
                         'pairedIntactControlId': control})
        return selected[-1]['id']
    positive_ids = [add(r, 'positive') for r in positives]
    for r in mismatch:
        add(r, 'precursor_mismatch')
    # Five actual pairs, one short cut and one late start per intact control.
    # A physical late start relative to energy onset does NOT prove speech was cut.
    paired_count = 0
    for intact, control_id in zip(positives, positive_ids):
        source = intact['sourceRecordId']
        ref = reference(args.base / 'claude/adversarial/probes/round-001' / (source + '.json'))
        container = checked(ref)
        if not all(any(p['onsetFrame'] == intact['rawProbe']['onsetFrame'] and p['purpose'] == purpose
                       for p in container['probes']) for purpose in
                   ('adversarial_cut_after_400ms', 'adversarial_begun_300ms_into_number')):
            continue  # Never substitute a nearby same-number onset.
        for purpose, category in [('adversarial_cut_after_400ms', 'short_cut'),
                                  ('adversarial_begun_300ms_into_number', 'late_start')]:
            matches = [p for p in container['probes'] if p['onsetFrame'] == intact['rawProbe']['onsetFrame'] and p['purpose'] == purpose]
            require(len(matches) == 1, 'paired_actual_adversary_missing')
            p = matches[0]
            add({**intact, 'probe': {**ref, 'probeId': p['id']}, 'rawProbe': p,
                 'status': 'existing_actual_adversary', 'reasons': []}, category, control_id)
        paired_count += 1
        if paired_count == 5:
            break
    require(paired_count == 5, 'not_enough_exact_adversarial_pairs')
    implementation = [reference(p) for p in (CODEX / 'native-windows.mts', CODEX / 'claude_adapter.py',
                                              CODEX / 'localized_adapter.py', CODEX / 'verifier.py',
                                              Path(__file__), Path(__file__).with_name('ctc_core.py'))]
    immutable_json(args.output / 'selection.json', {'diagnosticOnly': True, 'admissionAuthority': False,
        'method': 'sorted round-robin source; unique measured onset; first 10 in each replay stratum; first 5 positives with exact existing adversarial-onset pairs',
        'inputs': inputs, 'implementation': implementation, 'eligibleInstructionCount': len(eligible),
        'excluded': excluded, 'counts': dict(collections.Counter(r['category'] for r in selected)), 'records': selected})
    grouped = collections.defaultdict(list)
    for row in selected:
        grouped[row['sourceRecordId']].append(row)
    checks = []
    for source_id, rows in sorted(grouped.items()):
        source, clock = sources[source_id], clock_index[source_id]
        wanted = {f"{r['rawProbe']['startFrame']}:{r['rawProbe']['frameCount']}": r['rawProbe'] for r in rows}
        probes = [{'id': k, 'startFrame': p['startFrame'], 'frameCount': p['frameCount']} for k, p in wanted.items()]
        spec = {'root': inventory['root'], 'source': source, 'clock': clock, 'probes': probes}
        print(json.dumps({'phase': 'native_replay', 'source': source_id, 'clipCount': len(probes)}), flush=True)
        run = subprocess.run(['node', str(Path(inventory['root']) / 'node_modules/tsx/dist/cli.mjs'),
                              str(CODEX / 'native-windows.mts')], input=json.dumps(spec).encode(),
                             capture_output=True, timeout=180)
        require(run.returncode == 0, 'native_replay_failed:' + run.stderr.decode(errors='replace')[-1000:])
        actual = json.loads(run.stdout)
        clips = {p['id']: p for p in actual.pop('probes')}
        actual.pop('energyBase64')
        for key in ('pcmSha256', 'frameCount', 'sampleRate', 'channels', 'energySha256'):
            require(actual[key] == physical_index[source_id][key], 'physical_control_changed:' + key)
        checks.append(actual)
        for row in rows:
            ref, p = row['probe'], row['rawProbe']
            container, checked_probe = adapter.checked_probe({'probeEvidence': ref}, source)
            require(checked_probe == p, 'raw_probe_changed')
            adapter.checked_full_pcm(container, actual, 'full_pcm_binding_failed')
            require(container['avVersion'] == av.__version__, 'pyav_version_mismatch')
            key = f"{p['startFrame']}:{p['frameCount']}"
            clip = clips[key]
            require(clip['clipPcmSha256'] == p['clipPcmSha256'], 'clip_pcm_hash_failed')
            mono = mono_input(base64.b64decode(clip['pcmBase64']), actual['sampleRate'], actual['channels'])
            require(len(mono) == p['inputSampleCount'], 'mono_input_count_failed')
            require(sha_bytes(mono.astype('<f4').tobytes()) == p['inputMonoFloat32Sha256'], 'mono_input_hash_failed')
            dest = args.output / 'inputs' / (row['id'] + '.npy')
            with dest.open('xb') as f:
                np.save(f, mono, allow_pickle=False)
            row['nativeProof'] = {'sourceFile': reference(source['sourceAudioPath']),
                                  'fullPcmSha256': actual['pcmSha256'], 'sourceFrameCount': actual['frameCount'],
                                  'sampleRate': actual['sampleRate'], 'channels': actual['channels'],
                                  'clipStartFrame': p['startFrame'], 'clipFrameCount': p['frameCount'],
                                  'clipPcmSha256': clip['clipPcmSha256'],
                                  'inputMonoFloat32Sha256': p['inputMonoFloat32Sha256'],
                                  'inputSampleCount': len(mono), 'inputSampleRate': 16000,
                                  'inputArrayFile': reference(dest),
                                  'rawContainer': ref, 'frozenRequest': {'path': container['requestPath'], 'sha256': container['requestSha256']}}
            inputs.extend([ref, row['nativeProof']['frozenRequest'], row['nativeProof']['sourceFile']])
        del clips, run
        gc.collect()
    for ref in inputs + implementation:
        require(reference(ref['path'])['sha256'] == ref['sha256'], 'input_changed_during_preparation')
    immutable_json(args.output / 'prepared.json', {'diagnosticOnly': True, 'admissionAuthority': False,
        'writesDatabase': False, 'writesStorage': False, 'writesMedia': False, 'humanReviewed': False,
        'inputs': inputs, 'implementation': implementation, 'sourceChecks': checks, 'records': selected})
    print(json.dumps({'prepared': len(selected), 'sources': len(checks)}), flush=True)


if __name__ == '__main__':
    main()
