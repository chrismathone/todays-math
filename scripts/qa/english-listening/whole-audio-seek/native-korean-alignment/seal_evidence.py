"""Validate and archive successful-run code/text proofs without copying originals."""
import argparse
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

from ctc_core import checked, immutable_json, reference, require, sha_bytes, viterbi


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--prepared', type=Path, required=True)
    parser.add_argument('--results', type=Path, action='append', required=True)
    parser.add_argument('--analysis', type=Path, required=True)
    parser.add_argument('--project-root', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=False)
    prepared_ref = reference(args.prepared)
    prepared = checked(prepared_ref)
    runs = [checked(reference(p)) for p in args.results]
    archive, validations, inputs = [], [], [prepared_ref, reference(args.analysis)]
    def snapshot(ref, role):
        # Hash-addressed names avoid collisions and preserve executed originals
        # even if a later worktree has different code at the same path.
        original = Path(ref['path'])
        dest = args.output / (ref['sha256'][:16] + '-' + original.name)
        require(reference(original)['sha256'] == ref['sha256'], 'snapshot_source_changed')
        if not dest.exists():
            with dest.open('xb') as out:
                out.write(original.read_bytes())
        copied = reference(dest)
        require(copied['sha256'] == ref['sha256'], 'snapshot_hash_mismatch')
        archive.append({'actualOriginalPath': str(original.resolve()), 'archivedPath': copied['path'],
                        'sha256': copied['sha256'], 'role': role})
    for ref in prepared['implementation']:
        snapshot(ref, 'executed during source/input preparation')
    for run_path, run in zip(args.results, runs):
        inputs.append(reference(run_path))
        execution = checked(run['execution'])
        for ref in execution['implementation']:
            snapshot(ref, 'run implementation snapshot; run_alignment.py and ctc_core.py executed, neighboring tools retained as context')
        for ref in run['model']['files']:
            if Path(ref['path']).name != 'model.safetensors':
                snapshot(ref, 'executed model configuration/vocabulary')
        require(run['prepared'] == prepared_ref, 'run_wrong_prepared_controls')
        require(run['counts'] == {'positive': 10, 'precursor_mismatch': 10, 'short_cut': 5, 'late_start': 5}, 'cohort_count_mismatch')
        index = {r['id']: r for r in run['records']}
        checked_count = 0
        for r in run['records']:
            origin = index[r['pairedIntactControlId']] if r['pairedIntactControlId'] else r
            raw = checked(origin['probe'])
            matches = [p for p in raw['probes'] if p['id'] == origin['probe']['probeId']]
            require(len(matches) == 1, 'quote_origin_missing')
            segments = {s['id']: s for s in matches[0]['segments']}
            parts = []
            for span in r['literalInstruction']['spans']:
                text = segments[span['segmentId']]['text']
                require(sha_bytes(text.encode()) == span['rawTextSha256Utf8'], 'literal_source_text_changed')
                part = text[span['rawStartCharacter']:span['rawEndCharacter']]
                require(part == span['text'], 'literal_character_span_mismatch')
                parts.append(part)
            require(' '.join(parts) == r['literalInstruction']['text'] == r['normalization']['rawText'], 'literal_normalization_source_mismatch')
            inp = r['nativeProof']['inputArrayFile']
            require(reference(inp['path'])['sha256'] == inp['sha256'], 'input_array_changed')
            audio = np.load(inp['path'], allow_pickle=False)
            require(sha_bytes(audio.astype('<f4').tobytes()) == r['nativeProof']['inputMonoFloat32Sha256'], 'frozen_input_changed')
            require(reference(r['nativeProof']['sourceFile']['path']) == r['nativeProof']['sourceFile'], 'original_source_mutated')
            emission = r['emissions']
            require(reference(emission['path'])['sha256'] == emission['sha256'], 'emission_changed')
            lp = np.load(emission['path'], allow_pickle=False)
            blank = json.loads(Path(run['model']['files'][0]['path']).read_text(encoding='utf-8'))['pad_token_id']
            reconstructed = viterbi(lp, [t['id'] for t in r['normalization']['tokens']], blank)
            require(reconstructed == r['alignment'], 'saved_ctc_path_not_reproducible')
            require(r['diagnosticOnly'] and r['admissionAuthority'] is False, 'unsafe_result_authority')
            checked_count += 1
        validations.append({'modelId': run['model']['modelId'], 'recordsRechecked': checked_count,
            'literalCharacterProvenanceChecked': True, 'sourceBytesUnchanged': True,
            'inputHashesChecked': True, 'ctcPathsRecomputedFromFrozenEmissions': True})
    # Native product decode runtime was read only; archive exact installed code.
    for rel in ('src/lib/english/listening/media/mp3.ts', 'src/contracts/englishListeningSource.contract.ts',
                'src/contracts/englishListeningMedia.contract.ts'):
        snapshot(reference(args.project_root / rel), 'product decoder source read during native replay; archived after execution')
    package_dirs = [args.project_root / 'node_modules' / p for p in
                    ('mpg123-decoder', '@wasm-audio-decoders/common', '@eshaz/web-worker', 'simple-yenc', 'tsx')]
    for folder in package_dirs:
        require(folder.is_dir(), 'decoder_runtime_package_missing:' + str(folder))
        for p in sorted(folder.rglob('*')):
            if p.is_file() and 'node_modules' not in p.relative_to(folder).parts:
                snapshot(reference(p), 'installed native replay dependency; archived after execution')
    for p in sorted(Path(__file__).parent.glob('*.py')):
        snapshot(reference(p), 'final tool/test source; execution receipts identify actual use')
    # A separate test receipt records exactly which tests ran and their code hashes.
    test = subprocess.run([sys.executable, str(Path(__file__).with_name('test_ctc_core.py'))], capture_output=True)
    immutable_json(args.output / 'tests.json', {'argv': [sys.executable, 'test_ctc_core.py'],
        'script': reference(Path(__file__).with_name('test_ctc_core.py')), 'exitCode': test.returncode,
        'stdout': test.stdout.decode(errors='replace'), 'stderr': test.stderr.decode(errors='replace')})
    require(test.returncode == 0, 'regression_tests_failed')
    immutable_json(args.output / 'manifest.json', {'diagnosticOnly': True, 'admissionAuthority': False,
        'inputs': inputs, 'archives': archive, 'validation': validations,
        'testReceipt': reference(args.output / 'tests.json'),
        'sealingCommandArgv': sys.argv, 'sealingImplementation': reference(Path(__file__)),
        'weightsCopied': False, 'fullSourcePcmRetained': False,
        'sourceGoldStatus': 'Existing ASR/replay controls are machine references, not untouched human gold.'})
    print(json.dumps({'validatedRuns': len(validations), 'records': sum(v['recordsRechecked'] for v in validations),
                      'archivedFiles': len(archive), 'testsExitCode': test.returncode}), flush=True)


if __name__ == '__main__':
    main()
