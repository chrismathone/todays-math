"""Deterministic, strict text provenance and exact CTC Viterbi diagnostics."""
import hashlib
import json
import math
import re
from pathlib import Path

import numpy as np

L = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'
V = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'
T = ' ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ'
DIGITS = ' 영일이삼사오육칠팔구'
END = re.compile(r'(?:고르시오|고르세요|답하시오|선택하시오)(?=[\s.!?。]|$)')


def sha_bytes(data):
    return hashlib.sha256(data).hexdigest()


def reference(path):
    p = Path(path).resolve()
    digest = hashlib.sha256()
    with p.open('rb') as stream:
        while block := stream.read(1024 * 1024):
            digest.update(block)
    return {'path': str(p), 'sha256': digest.hexdigest()}


def require(condition, reason):
    if not condition:
        raise ValueError(reason)


def checked(ref):
    require(reference(ref['path'])['sha256'] == ref['sha256'], 'artifact_hash_changed')
    return json.loads(Path(ref['path']).read_text(encoding='utf-8'))


def immutable_json(path, value):
    with Path(path).open('x', encoding='utf-8') as out:
        out.write(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + '\n')


def number(n):
    require(type(n) is int and 1 <= n <= 50, 'unsupported_question_numeral')
    ones = '일이삼사오육칠팔구'
    if n < 10:
        return ones[n - 1]
    tens, unit = divmod(n, 10)
    return ('' if tens == 1 else ones[tens - 1]) + '십' + (ones[unit - 1] if unit else '')


def literal_instruction(probe, uncertain, literal_cue):
    """Copy exact raw segment substrings through the first complete instruction."""
    require(probe.get('overflow') is False, 'overflow')
    segments = probe.get('segments') or []
    require(segments, 'missing_segments')
    numbers, _ = literal_cue(segments[0]['text'])
    require(numbers, 'not_numbered_instruction')
    spans, parts = [], []
    for segment in segments:
        require(not uncertain(segment), 'uncertain_raw_instruction')
        text = segment['text']
        require(not re.search('[A-Za-z]', text[:END.search(text).end()] if END.search(text) else text),
                'foreign_text_before_complete_instruction')
        if parts:
            require(not literal_cue(text)[0], 'crossed_next_heading')
        end = END.search(text)
        stop = end.end() if end else len(text)
        while stop < len(text) and text[stop] in '.!?。':
            stop += 1
        spans.append({'segmentId': segment['id'], 'rawStartCharacter': 0,
                      'rawEndCharacter': stop, 'text': text[:stop],
                      'rawTextSha256Utf8': sha_bytes(text.encode('utf-8')),
                      'localStartSeconds': segment['localStartSeconds'],
                      'localEndSeconds': segment['localEndSeconds']})
        parts.append(text[:stop])
        if end:
            return {'text': ' '.join(parts), 'spans': spans, 'spokenNumberHypothesis': numbers,
                    'textIsExistingMachineEvidence': True, 'humanGold': False}
    raise ValueError('incomplete_instruction')


def normalize(text, vocab, granularity='jamo'):
    """Numerals before 번 -> Sino-Korean; syllables -> compatibility jamo.

    Each token retains its exact input character span; no unknown/wildcard tokens.
    Punctuation removal and collapsed spaces are explicitly recorded.
    """
    pieces, transforms, i = [], [], 0
    while i < len(text):
        match = re.match(r'\d{1,2}(?=\s*번)', text[i:])
        if match:
            raw, stop = match[0], i + len(match[0])
            replacement = number(int(raw))
            transforms.append({'kind': 'arabic_question_numeral_to_sino_korean',
                               'rawStart': i, 'rawEnd': stop, 'input': raw, 'output': replacement})
            pieces.extend((c, i, stop) for c in replacement)
            i = stop
            continue
        c = text[i]
        if c.isspace():
            if pieces and pieces[-1][0] != ' ':
                pieces.append((' ', i, i + 1))
        elif '가' <= c <= '힣':
            pieces.append((c, i, i + 1))
        elif c in '.,!?;:。“”‘’\"\'()[]-–—~～·':
            transforms.append({'kind': 'punctuation_removed', 'rawStart': i, 'rawEnd': i + 1, 'input': c})
        else:
            raise ValueError('unsupported_literal_character:' + repr(c))
        i += 1
    while pieces and pieces[-1][0] == ' ':
        pieces.pop()
    require(pieces, 'empty_target')
    tokens, chars, word = [], [], 0
    for char_index, (c, start, stop) in enumerate(pieces):
        begin = len(tokens)
        if c == ' ':
            jamo = ' ' if ' ' in vocab else '|'
            word += 1
        elif granularity == 'syllable':
            jamo = c
        else:
            n = ord(c) - 0xac00
            jamo = L[n // 588] + V[n // 28 % 21] + (T[n % 28] if n % 28 else '')
        for j in jamo:
            require(j in vocab, 'out_of_vocabulary_jamo')
            tokens.append({'text': j, 'id': vocab[j], 'normalizedCharacter': char_index,
                           'rawStart': start, 'rawEnd': stop, 'wordIndex': None if c == ' ' else word})
        chars.append({'text': c, 'rawStart': start, 'rawEnd': stop,
                      'tokenStart': begin, 'tokenEnd': len(tokens), 'wordIndex': None if c == ' ' else word})
    normalized = ''.join(p[0] for p in pieces)
    number_end = normalized.find('번')
    require(number_end > 0, 'target_missing_number_before_beon')
    return {'rawText': text, 'normalizedText': normalized, 'transforms': transforms,
            'tokens': tokens, 'characters': chars,
            'numberTokenEnd': chars[number_end]['tokenStart'],
            'firstSyllableTokenEnd': chars[0]['tokenEnd'],
            'granularity': granularity,
            'normalizationRule': 'Sino-Korean 1..50; Unicode Hangul arithmetic to compatibility jamo for jamo model; no phonological rewrite'}


def viterbi(logp, target, blank):
    """Standard full CTC path: repeated identical tokens require a blank.

    Entire clip is consumed; no wildcard, fallback timestamps, interpolation or
    free skipped tokens. A forced path can fit absent text and is never approval.
    """
    frames, vocab_size = logp.shape
    require(frames > 0 and target and blank not in target, 'invalid_ctc_input')
    require(all(0 <= i < vocab_size for i in target), 'invalid_ctc_target')
    minimum = len(target) + sum(a == b for a, b in zip(target, target[1:]))
    if frames < minimum:
        return {'status': 'no_ctc_path', 'minimumFrames': minimum, 'frames': frames}
    states = np.full(2 * len(target) + 1, blank, dtype=np.int64)
    states[1::2] = target
    count = len(states)
    prev = np.full(count, -np.inf)
    prev[0] = logp[0, blank]
    prev[1] = logp[0, target[0]]
    back = np.zeros((frames, count), dtype=np.int8)
    skip = np.zeros(count, dtype=bool)
    skip[2:] = (states[2:] != blank) & (states[2:] != states[:-2])
    for t in range(1, frames):
        one = np.concatenate(([-np.inf], prev[:-1]))
        two = np.concatenate(([-np.inf, -np.inf], prev[:-2]))
        two[~skip] = -np.inf
        choices = np.stack((prev, one, two))
        delta = choices.argmax(axis=0)
        back[t] = delta
        prev = choices[delta, np.arange(count)] + logp[t, states]
    last = count - 2 + int(prev[-1] > prev[-2])
    score = float(prev[last])
    if not math.isfinite(score):
        return {'status': 'no_ctc_path', 'minimumFrames': minimum, 'frames': frames}
    path = np.zeros(frames, dtype=np.int32)
    for t in range(frames - 1, -1, -1):
        path[t] = last
        last -= int(back[t, last])
    token_spans = []
    for i, token in enumerate(target):
        ts = np.flatnonzero(path == 2 * i + 1)
        require(len(ts) > 0, 'ctc_backtrack_missing_token')
        selected = logp[ts, token]
        token_spans.append({'tokenIndex': i, 'tokenId': token, 'startFrame': int(ts[0]),
                            'endFrameExclusive': int(ts[-1]) + 1,
                            'geometricMeanPosterior': float(np.exp(selected.mean())),
                            'minimumPosterior': float(np.exp(selected.min())),
                            'framePosteriors': np.exp(selected).tolist()})
    return {'status': 'forced_path_found', 'pathLogProbability': score,
            'meanPathLogProbability': score / frames, 'tokenSpans': token_spans,
            'statePath': path.tolist(), 'minimumFrames': minimum, 'frames': frames}


def confidence(spans):
    ps = [p for span in spans for p in span['framePosteriors']]
    return {'geometricMeanPosterior': math.exp(sum(math.log(max(p, 1e-300)) for p in ps) / len(ps)),
            'minimumPosterior': min(ps), 'meanPosterior': sum(ps) / len(ps)}
