"""Summarize measured diagnostics; never calibrate or approve seek starts."""
import argparse
import collections
import json
import statistics
from pathlib import Path

import numpy as np

from ctc_core import checked, immutable_json, reference, require, sha_bytes


def distribution(values):
    return {'n': len(values), 'min': min(values), 'median': statistics.median(values), 'max': max(values)} if values else {'n': 0}


def summarize(run_path):
    ref = reference(run_path)
    run = checked(ref)
    by_id = {r['id']: r for r in run['records']}
    groups, pairs, frames = collections.defaultdict(list), [], []
    for r in run['records']:
        require(r['admissionAuthority'] is False, 'record_has_admission_authority')
        e = r['emissions']
        require(reference(e['path'])['sha256'] == e['sha256'], 'emission_file_mutated')
        logp = np.load(e['path'], allow_pickle=False)
        require(sha_bytes(logp.astype('<f4').tobytes()) == r['logProbabilitiesFloat32Sha256'], 'emission_content_mutated')
        frames.append({'id': r['id'], 'ctcFrames': len(logp),
                       'targetSymbols': len(r['normalization']['tokens']),
                       'minimumCtcFrames': r['alignment']['minimumFrames']})
        groups[r['category']].append(r)
        if r['pairedIntactControlId']:
            intact = by_id[r['pairedIntactControlId']]
            late = r['rawProbe']['startFrame'] - intact['rawProbe']['startFrame']
            rate = r['nativeProof']['sampleRate']
            paired = {'id': r['id'], 'intactId': intact['id'], 'sourceRecordId': r['sourceRecordId'],
                      'category': r['category'], 'rawPurposeLabel': r['rawProbe']['purpose'],
                      'clipStartMinusIntactSeconds': late / rate,
                      'clipStartMinusEnergyOnsetSeconds': (r['rawProbe']['startFrame'] - r['rawProbe']['onsetFrame']) / rate,
                      'rawAdversaryText': ' '.join(s['text'] for s in r['rawProbe']['segments']),
                      'rawAdversaryUncertaintyFlags': [s['uncertain'] for s in r['rawProbe']['segments']],
                      'alignmentStatus': r['alignment']['status'],
                      'greedyCtcText': r['greedyCtcText'],
                      'intactNumberPosterior': intact.get('diagnostics', {}).get('number', {}).get('geometricMeanPosterior')}
            if r.get('diagnostics'):
                paired.update(numberPosterior=r['diagnostics']['number']['geometricMeanPosterior'],
                    targetPosterior=r['diagnostics']['targetTokens']['geometricMeanPosterior'],
                    firstSyllableGridSeconds=r['diagnostics']['firstSyllable']['gridStartSeconds'],
                    firstSyllableAtFirstFrame=r['diagnostics']['firstSyllable']['ctcStartFrame'] == 0)
            if intact.get('diagnostics'):
                start = intact['diagnostics']['firstSyllable']['sourceGridStartFrame']
                end = intact['diagnostics']['firstSyllable']['sourceGridEndFrame']
                paired.update(clipStartMinusIntactFirstSyllableGridSeconds=(r['rawProbe']['startFrame'] - start) / rate,
                    clipStartMinusIntactFirstSyllableGridEndSeconds=(r['rawProbe']['startFrame'] - end) / rate,
                    comparisonIsModelTimingHypothesis=True)
            pairs.append(paired)
    summaries = {}
    for name, rows in sorted(groups.items()):
        valid = [r['diagnostics'] for r in rows if r.get('diagnostics')]
        summaries[name] = {'count': len(rows), 'statuses': dict(collections.Counter(r['alignment']['status'] for r in rows)),
            'numberPosterior': distribution([d['number']['geometricMeanPosterior'] for d in valid]),
            'targetPosterior': distribution([d['targetTokens']['geometricMeanPosterior'] for d in valid]),
            'firstSyllableMinusEnergySeconds': distribution([d['firstSyllableGridMinusEnergyOnsetSeconds'] for d in valid]),
            'inferenceSeconds': sum(r['elapsedSeconds'] for r in rows)}
    rows = []
    for r in run['records']:
        n = r['normalization']
        origin = by_id[r['pairedIntactControlId']] if r['pairedIntactControlId'] else r
        number_jamo = ''.join(t['text'] for t in n['tokens'][:n['numberTokenEnd']])
        rows.append({'id': r['id'], 'category': r['category'], 'sourceRecordId': r['sourceRecordId'],
            'probeId': r['probe']['probeId'], 'text': r['literalInstruction']['text'],
            'literalInstructionOrigin': {'probe': origin['probe'], 'controlId': origin['id'],
                'rawCharacterSpans': origin['literalInstruction']['spans'],
                'negativeUseIsDeliberateCounterfactual': bool(r['pairedIntactControlId'])},
            'rawFirstSegmentStartSeconds': r['rawProbe']['segments'][0]['localStartSeconds'] if r['rawProbe']['segments'] else None,
            'rawFirstWord': r['rawProbe']['segments'][0].get('words', [None])[0] if r['rawProbe']['segments'] else None,
            'rawNumeralNormalization': n['transforms'], 'independentGreedyPrefix': r['greedyCtcText'][:40],
            'greedyStartsWithSuppliedNumberSymbols': r['greedyCtcText'].lstrip(' |').startswith(number_jamo),
            'status': r['alignment']['status'],
            'firstSyllable': r.get('diagnostics', {}).get('firstSyllable'),
            'number': r.get('diagnostics', {}).get('number'),
            'firstSyllableMinusEnergySeconds': r.get('diagnostics', {}).get('firstSyllableGridMinusEnergyOnsetSeconds')})
    return {'results': ref, 'modelId': run['model']['modelId'], 'revision': run['model']['revision'],
            'strata': summaries, 'pairedAdversaries': pairs, 'frameFeasibility': frames, 'rows': rows}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--results', type=Path, action='append', required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    summaries = [summarize(p) for p in args.results]
    comparisons = []
    if len(summaries) == 2:
        a, b = [{r['id']: r for r in s['rows']} for s in summaries]
        for key in a.keys() & b.keys():
            if a[key]['firstSyllable'] and b[key]['firstSyllable']:
                comparisons.append({'id': key, 'category': a[key]['category'],
                    'firstSyllableGridDifferenceSeconds': a[key]['firstSyllable']['gridStartSeconds'] - b[key]['firstSyllable']['gridStartSeconds'],
                    'aNumberPosterior': a[key]['number']['geometricMeanPosterior'],
                    'bNumberPosterior': b[key]['number']['geometricMeanPosterior']})
    immutable_json(args.output, {'diagnosticOnly': True, 'admissionAuthority': False,
        'humanGold': False, 'noDecisionThresholdWasFitted': True,
        'interpretation': 'A forced path is conditional on supplied text; scores are uncalibrated token posteriors. Physical clip controls are independent, but purpose labels do not prove spoken syllables were cut.',
        'models': summaries, 'crossModelComparisons': sorted(comparisons, key=lambda r: r['id']),
        'implementation': [reference(Path(__file__)), reference(Path(__file__).with_name('ctc_core.py'))]})
    for summary in summaries:
        print(json.dumps({'model': summary['modelId'], 'strata': summary['strata']}, ensure_ascii=True))


if __name__ == '__main__':
    main()
