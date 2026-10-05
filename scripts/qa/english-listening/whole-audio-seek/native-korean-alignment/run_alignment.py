"""Actual CPU-only inference on frozen native inputs; diagnostic CTC paths only."""
import argparse
import collections
import importlib.metadata
import json
import math
import os
import platform
import subprocess
import sys
import time
from pathlib import Path

os.environ['CUDA_VISIBLE_DEVICES'] = ''
os.environ['HF_HUB_OFFLINE'] = '1'
os.environ['TRANSFORMERS_OFFLINE'] = '1'
os.environ['OMP_NUM_THREADS'] = '2'
os.environ['MKL_NUM_THREADS'] = '2'

import numpy as np
import torch
from transformers import Wav2Vec2FeatureExtractor, Wav2Vec2ForCTC

from ctc_core import checked, confidence, immutable_json, normalize, reference, require, sha_bytes, viterbi

MODEL_PROFILES = {
    'base': ('Kkonjeong/wav2vec2-base-korean', 'fa03d1a7138f1900131393cc7cb74f77926f177a', 'jamo'),
    'kresnik': ('kresnik/wav2vec2-large-xlsr-korean', '629c9a3501c10ba128bf3fa1eebb12af3be03f61', 'syllable'),
}


def environment_snapshot():
    packages = sorted(f'{d.metadata["Name"]}=={d.version}' for d in importlib.metadata.distributions())
    root = Path(sys.prefix) / 'Lib/site-packages'
    # Freeze all installed Python/config/native runtime code, exclude generated
    # bytecode and build/link libraries removed by the explicit coordinator rule.
    files = [reference(p) for p in sorted(root.rglob('*'))
             if p.is_file() and p.suffix.lower() in ('.py', '.dll', '.pyd', '.json')]
    serialized = json.dumps(files, sort_keys=True).encode()
    return {'pythonVersion': sys.version, 'pythonExecutable': reference(sys.executable),
            'venv': str(Path(sys.prefix).resolve()), 'platform': platform.platform(),
            'packages': packages, 'packageListSha256': sha_bytes(('\n'.join(packages) + '\n').encode()),
            'runtimeCodeFiles': files, 'runtimeManifestSha256': sha_bytes(serialized),
            'torchVersion': torch.__version__, 'threads': torch.get_num_threads(),
            'interopThreads': torch.get_num_interop_threads(), 'device': 'cpu',
            'cudaBuild': torch.version.cuda, 'gpuUsed': False,
            'excludedKinds': ['generated .pyc', 'build/link .lib', 'headers and training-only resources']}


def metrics(alignment, normalization, row, hop, receptive):
    spans = alignment['tokenSpans']
    first = spans[0]['startFrame']
    # Wav2vec convolution hop and receptive field, no ratio stretching to input
    # duration. Grid offset and RF center are both reported as diagnostics.
    def timing(start, end):
        rate = row['nativeProof']['sampleRate']
        clip_start = row['rawProbe']['startFrame']
        return {'ctcStartFrame': start, 'ctcEndFrameExclusive': end,
                'gridStartSeconds': start * hop / 16000,
                'gridEndSeconds': end * hop / 16000,
                'receptiveFieldCenterStartSeconds': (start * hop + (receptive - 1) / 2) / 16000,
                'sourceGridStartFrame': clip_start + math.floor(start * hop * rate / 16000),
                'sourceGridEndFrame': clip_start + math.ceil(end * hop * rate / 16000),
                'timingAuthority': False}
    chars, words = [], []
    for c in normalization['characters']:
        ss = spans[c['tokenStart']:c['tokenEnd']]
        chars.append({**c, **timing(ss[0]['startFrame'], ss[-1]['endFrameExclusive']), **confidence(ss)})
    for w in sorted(set(t['wordIndex'] for t in normalization['tokens'] if t['wordIndex'] is not None)):
        token_indexes = [i for i, t in enumerate(normalization['tokens']) if t['wordIndex'] == w]
        ss = [spans[i] for i in token_indexes]
        text = ''.join(c['text'] for c in normalization['characters'] if c['wordIndex'] == w)
        words.append({'wordIndex': w, 'text': text, **timing(ss[0]['startFrame'], ss[-1]['endFrameExclusive']),
                      **confidence(ss)})
    number_spans = spans[:normalization['numberTokenEnd']]
    syllable_spans = spans[:normalization['firstSyllableTokenEnd']]
    onset_seconds = (row['rawProbe']['onsetFrame'] - row['rawProbe']['startFrame']) / row['nativeProof']['sampleRate']
    return {'characters': chars, 'words': words,
            'firstSyllable': {**timing(syllable_spans[0]['startFrame'], syllable_spans[-1]['endFrameExclusive']),
                              **confidence(syllable_spans)},
            'number': {**timing(number_spans[0]['startFrame'], number_spans[-1]['endFrameExclusive']),
                       **confidence(number_spans)},
            'targetTokens': confidence(spans),
            'measuredEnergyOnsetLocalSeconds': onset_seconds,
            'firstSyllableGridMinusEnergyOnsetSeconds': first * hop / 16000 - onset_seconds,
            'greedyIndependentEvidenceIsNotHumanGold': True}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--prepared', type=Path, required=True)
    parser.add_argument('--model', type=Path, required=True)
    parser.add_argument('--profile', choices=MODEL_PROFILES, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=False)
    torch.set_num_threads(2)
    torch.set_num_interop_threads(2)
    torch.manual_seed(0)
    torch.use_deterministic_algorithms(True)
    prepared_ref = reference(args.prepared)
    prepared = checked(prepared_ref)
    require(prepared['diagnosticOnly'] and prepared['admissionAuthority'] is False, 'not_diagnostic_prepared')
    model_id, revision, granularity = MODEL_PROFILES[args.profile]
    model_files = [reference(args.model / name) for name in
                   ('config.json', 'vocab.json', 'preprocessor_config.json', 'tokenizer_config.json', 'model.safetensors')]
    if args.profile == 'base':
        manifest = checked(reference(args.model / 'model-manifest.json'))
        require(manifest['modelId'] == model_id and manifest['revision'] == revision, 'model_revision_mismatch')
        for ref in manifest['files']:
            require(reference(ref['path'])['sha256'] == ref['sha256'], 'downloaded_model_changed')
    else:
        require(args.model.name == revision, 'cached_revision_path_mismatch')
        require(model_files[-1]['sha256'] == '29be111b9247cfc2c72f125c1b1f50021ecfded8f0d947bbfb7e31dc7f0ddd07',
                'cached_weights_differ_from_pinned_public_lfs_sha')
    model_ref = {'modelId': model_id, 'revision': revision, 'files': model_files,
                 'fromLocalFilesOnly': True, 'granularity': granularity}
    immutable_json(args.output / 'model.json', model_ref)
    env = environment_snapshot()
    immutable_json(args.output / 'environment.json', env)
    archive = args.output / 'executed-code'
    archive.mkdir()
    implementation = []
    for p in sorted(Path(__file__).parent.glob('*.py')):
        dest = archive / p.name
        with dest.open('xb') as out:
            out.write(p.read_bytes())
        implementation.append({**reference(dest), 'originalPath': str(p.resolve())})
    immutable_json(args.output / 'execution.json', {'commandArgv': sys.argv, 'implementation': implementation,
        'prepared': prepared_ref, 'environment': reference(args.output / 'environment.json'),
        'model': reference(args.output / 'model.json'), 'startingGitCommit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()})
    vocab = json.loads((args.model / 'vocab.json').read_text(encoding='utf-8'))
    extractor = Wav2Vec2FeatureExtractor.from_pretrained(str(args.model), local_files_only=True)
    model = Wav2Vec2ForCTC.from_pretrained(str(args.model), local_files_only=True, dtype=torch.float32)
    model.to('cpu').eval()
    require(all(p.device.type == 'cpu' for p in model.parameters()), 'non_cpu_model')
    blank = model.config.pad_token_id
    require(vocab['[PAD]'] == blank, 'ctc_blank_mismatch')
    hop, receptive = 1, 1
    for kernel, stride in zip(model.config.conv_kernel, model.config.conv_stride):
        receptive += (kernel - 1) * hop
        hop *= stride
    records = []
    for row in prepared['records']:
        started = time.monotonic()
        ref = row['nativeProof']['inputArrayFile']
        require(reference(ref['path'])['sha256'] == ref['sha256'], 'input_array_mutated')
        audio = np.load(ref['path'], allow_pickle=False)
        require(sha_bytes(audio.astype('<f4').tobytes()) == row['nativeProof']['inputMonoFloat32Sha256'], 'model_input_pcm_mutated')
        normalization = normalize(row['literalInstruction']['text'], vocab, granularity)
        input_values = extractor(audio, sampling_rate=16000, return_tensors='pt')
        with torch.inference_mode():
            logits = model(**input_values).logits[0].float()
            logp = torch.log_softmax(logits, dim=-1).numpy()
        require(len(logp) == (len(audio) - receptive) // hop + 1, 'ctc_frame_geometry_mismatch')
        # Reuse the same bounded inference for the unconstrained CTC best path.
        # It is independent of supplied text, but remains model evidence only.
        ids = logp.argmax(axis=-1)
        collapsed = [int(i) for i, _ in __import__('itertools').groupby(ids) if i != blank]
        inverse = {i: c for c, i in vocab.items()}
        greedy = ''.join(inverse.get(i, f'<id:{i}>') for i in collapsed)
        alignment = viterbi(logp, [t['id'] for t in normalization['tokens']], blank)
        result = {**row, 'diagnosticOnly': True, 'admissionAuthority': False,
                  'normalization': normalization, 'alignment': alignment,
                  'greedyCtcText': greedy, 'greedyCtcIds': collapsed,
                  'processorInputFloat32Sha256': sha_bytes(input_values['input_values'].numpy().astype('<f4').tobytes()),
                  'logProbabilitiesFloat32Sha256': sha_bytes(logp.astype('<f4').tobytes()),
                  'modelGeometry': {'inputRate': 16000, 'hopSamples': hop, 'receptiveFieldSamples': receptive},
                  'elapsedSeconds': time.monotonic() - started}
        emission_path = args.output / (row['id'] + '-logp.npy')
        with emission_path.open('xb') as stream:
            np.save(stream, logp, allow_pickle=False)
        result['emissions'] = reference(emission_path)
        if alignment['status'] == 'forced_path_found':
            result['diagnostics'] = metrics(alignment, normalization, row, hop, receptive)
        immutable_json(args.output / (row['id'] + '.json'), result)
        records.append(result)
        progress = {'id': row['id'], 'category': row['category'], 'status': alignment['status'],
                    'seconds': round(result['elapsedSeconds'], 3)}
        if result.get('diagnostics'):
            d = result['diagnostics']
            progress.update(firstSyllableSeconds=d['firstSyllable']['gridStartSeconds'],
                            numberPosterior=round(d['number']['geometricMeanPosterior'], 4),
                            targetPosterior=round(d['targetTokens']['geometricMeanPosterior'], 4))
        print(json.dumps(progress), flush=True)
    for ref in prepared['inputs'] + prepared['implementation'] + model_files + implementation:
        require(reference(ref['path'])['sha256'] == ref['sha256'], 'frozen_input_changed_during_inference')
    immutable_json(args.output / 'results.json', {'diagnosticOnly': True, 'admissionAuthority': False,
        'writesDatabase': False, 'writesStorage': False, 'writesMedia': False, 'humanReviewed': False,
        'model': model_ref, 'execution': reference(args.output / 'execution.json'),
        'prepared': prepared_ref, 'counts': dict(collections.Counter(r['category'] for r in records)),
        'records': records, 'limitations': [
            'Forced alignment supplies text, so a valid path does not prove the text was spoken.',
            'Jamo/syllable CTC symbols are orthographic units, not a validated phoneme-onset detector.',
            'Existing ASR estimates, measured energy onsets and historical controls are machine evidence, not untouched human gold.',
            'Adversarial purpose labels refer to measured energy onset; true spoken-number truncation must be checked separately.',
            'All scores, source frame positions and independent greedy CTC output remain diagnostic; no seek admission.']})


if __name__ == '__main__':
    main()
