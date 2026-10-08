"""Offline, question-only HWP5/PDF extraction. Writes only inside this folder.

No COM, conversion, database, subprocess, model or network calls. HWP controls
are reconstructed at their paragraph positions, not matched against a global
formula bag. Endnotes, footnotes, headers and footers never enter the packet.
"""
from __future__ import annotations

import argparse
import collections
import hashlib
import importlib.util
import io
import json
import re
import struct
import sys
import zlib
from datetime import datetime, timezone
from pathlib import Path

import fitz
import olefile
from PIL import Image, ImageChops, ImageStat

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
AUDIT = ROOT / '.qa-artifacts/exam-resume-20261008/next-five-audit.json'
SLUGS = ['gyeonggu', 'gyeongsan', 'gyeongsang', 'gyeongsin', 'gyeongam']


def sha(data):
    return hashlib.sha256(data).hexdigest()


def canonical(data):
    return sha(json.dumps(data, ensure_ascii=False, sort_keys=True,
                          separators=(',', ':')).encode())


def load(path):
    return json.loads(Path(path).read_text(encoding='utf-8-sig'))


def write(path, data):
    path = Path(path).resolve()
    if not path.is_relative_to(HERE):
        raise ValueError('Output outside owned evidence folder')
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n',
                    encoding='utf-8', newline='\n')


def module(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    obj = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(obj)
    return obj


def source_ref(path):
    path = Path(path)
    data = path.read_bytes()
    return {'path': str(path), 'sha256': sha(data), 'bytes': len(data)}


def record_tree(data, stream):
    roots, stack, records = [], [], []
    pos = 0
    while pos < len(data):
        start = pos
        value = struct.unpack_from('<I', data, pos)[0]
        pos += 4
        size = value >> 20
        if size == 4095:
            size = struct.unpack_from('<I', data, pos)[0]
            pos += 4
        raw = data[pos:pos + size]
        pos += size
        if len(raw) != size:
            raise ValueError('Truncated HWP record')
        node = {'tag': value & 1023, 'level': (value >> 10) & 1023,
                'index': len(records), 'offset': start, 'payload': raw,
                'stream': stream, 'children': []}
        records.append(node)
        while stack and stack[-1]['level'] >= node['level']:
            stack.pop()
        (stack[-1]['children'] if stack else roots).append(node)
        stack.append(node)
    return roots, records


def walk(node):
    yield node
    for child in node['children']:
        yield from walk(child)


def locator(node):
    return {'stream': node['stream'], 'recordIndex': node['index'],
            'inflatedByteOffset': node['offset'], 'tag': node['tag'],
            'level': node['level'], 'payloadSha256': sha(node['payload'])}


def code(node):
    return node['payload'][:4][::-1].decode('ascii', 'replace')


class HwpReader:
    def __init__(self, path):
        self.path = Path(path)
        self.excluded = []
        self.headers = []
        self.unknown = []
        self.images = {}
        self.sections = []
        self.paragraphs = []
        with olefile.OleFileIO(str(path)) as ole:
            header = ole.openstream('FileHeader').read()
            self.flags = struct.unpack_from('<I', header, 36)[0]
            if self.flags & 2:
                raise ValueError('Encrypted HWP cannot be silently extracted')
            for entry in ole.listdir():
                if entry[0] == 'BinData':
                    raw = ole.openstream(entry).read()
                    try:
                        image_bytes = zlib.decompress(raw, -15)
                    except zlib.error:
                        image_bytes = raw
                    image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
                    match = re.search(r'BIN([0-9A-F]+)', entry[-1], re.I)
                    key = int(match.group(1), 16)
                    self.images[key] = {'stream': '/'.join(entry), 'binId': key,
                                        'oleStreamSha256': sha(raw),
                                        'decodedBytesSha256': sha(image_bytes),
                                        'pixelRgbSha256': sha(image.tobytes()),
                                        'size': list(image.size), '_image': image}
            for entry in sorted(e for e in ole.listdir() if e[0] == 'BodyText'):
                raw = ole.openstream(entry).read()
                data = zlib.decompress(raw, -15) if self.flags & 1 else raw
                roots, records = record_tree(data, '/'.join(entry))
                self.sections.append({'stream': '/'.join(entry),
                                      'compressedSha256': sha(raw),
                                      'inflatedSha256': sha(data),
                                      'recordCount': len(records)})
                for node in roots:
                    if node['tag'] == 66:
                        self.paragraphs.append(self.paragraph(node))

    def control(self, node):
        kind = code(node)
        loc = locator(node)
        if kind in ['en  ', 'fn  ']:
            number = struct.unpack_from('<I', node['payload'], 4)[0]
            self.excluded.append({'kind': kind, 'anchorNumber': number,
                                  'root': loc,
                                  'excludedRecordCount': sum(1 for _ in walk(node)),
                                  'noteContentExported': False})
            return [{'kind': 'question-anchor', 'number': number, 'source': loc}] if kind == 'en  ' else []
        if kind in ['head', 'foot', 'secd', 'cold', 'pgnp', 'nwno']:
            if kind in ['head', 'foot']:
                text = '\n'.join(self.render(self.paragraph(n)) for n in node['children']
                                  if n['tag'] == 66)
                # List headers wrap the actual paragraphs; read descendants too.
                if not text:
                    text = '\n'.join(self.render(self.paragraph(n)) for n in walk(node)
                                      if n['tag'] == 66)
                self.headers.append({'kind': kind, 'text': text, 'source': loc})
            return []
        if kind == 'eqed':
            eqs = [n for n in walk(node) if n['tag'] == 88]
            if len(eqs) != 1:
                self.unknown.append({'kind': 'equation-record-count', 'source': loc,
                                     'count': len(eqs)})
                return [{'kind': 'unknown', 'text': '[unresolved equation]', 'source': loc}]
            n = eqs[0]
            count = struct.unpack_from('<H', n['payload'], 4)[0]
            script = n['payload'][6:6 + count * 2].decode('utf-16le')
            return [{'kind': 'math', 'script': script, 'source': locator(n),
                     'controlSource': loc}]
        if kind in ['tbl ', 'gso ']:
            output = []
            # Paragraphs inside text boxes/tables retain source order and record positions.
            def paragraph_roots(n):
                for child in n['children']:
                    if child['tag'] == 66:
                        yield child
                    else:
                        yield from paragraph_roots(child)
            for para in paragraph_roots(node):
                output.extend(self.paragraph(para))
                output.append({'kind': 'text', 'text': '\n', 'source': locator(para)})
            pictures = [n for n in walk(node) if n['tag'] == 85]
            for n in pictures:
                # SHAPE_COMPONENT_PICTURE: binary data ID is unsigned short at offset 71.
                bin_id = struct.unpack_from('<H', n['payload'], 71)[0]
                output.append({'kind': 'figure', 'binId': bin_id,
                               'source': locator(n), 'controlSource': loc,
                               'binStream': self.images.get(bin_id, {}).get('stream'),
                               'binReferenceExists': bin_id in self.images})
            if not output and kind == 'gso ':
                output.append({'kind': 'drawing', 'source': loc})
            return output
        if kind in ['atno', 'bokm']:
            return []
        self.unknown.append({'kind': kind, 'source': loc})
        return [{'kind': 'unknown', 'text': f'[unmapped {kind}]', 'source': loc}]

    def paragraph(self, node):
        controls = collections.defaultdict(list)
        for child in node['children']:
            if child['tag'] == 71:
                controls[child['payload'][:4]].append(child)
        used, output = collections.Counter(), []
        for text_record in [n for n in node['children'] if n['tag'] == 67]:
            raw = text_record['payload']
            i, buffer, begin = 0, [], 0
            def flush(end):
                if buffer:
                    output.append({'kind': 'text', 'text': ''.join(buffer),
                                   'source': {**locator(text_record),
                                              'utf16Range': [begin, end]}})
                    buffer.clear()
            while i < len(raw) // 2:
                val = struct.unpack_from('<H', raw, i * 2)[0]
                if val < 32:
                    flush(i)
                    if val in [10, 13]:
                        output.append({'kind': 'text', 'text': '\n', 'source': locator(text_record)})
                        i += 1
                    elif val in [0, 24, 25, 30, 31]:
                        i += 1
                    elif val == 9:
                        output.append({'kind': 'text', 'text': ' ', 'source': locator(text_record)})
                        i += 8
                    else:
                        key = raw[(i + 1) * 2:(i + 3) * 2]
                        matching = controls.get(key, [])
                        occurrence = used[key]
                        used[key] += 1
                        if occurrence < len(matching):
                            output.extend(self.control(matching[occurrence]))
                        elif val not in [4, 5, 6, 7, 8, 14, 15, 18, 19, 20, 22, 23]:
                            self.unknown.append({'kind': 'missing-control',
                                                 'controlCode': key.hex(),
                                                 'source': locator(text_record)})
                        i += 8
                    begin = i
                else:
                    buffer.append(chr(val))
                    i += 1
            flush(i)
        return output

    @staticmethod
    def render(items):
        return ''.join('$' + i['script'] + '$' if i['kind'] == 'math' else
                       i.get('text', '') for i in items)

    def questions(self):
        out, current = [], None
        for paragraph in self.paragraphs:
            for item in paragraph:
                if item['kind'] == 'question-anchor':
                    if current:
                        out.append(current)
                    current = {'number': item['number'], 'anchor': item['source'], 'items': []}
                elif current:
                    current['items'].append(item)
        if current:
            out.append(current)
        numbers = [q['number'] for q in out]
        if numbers != list(range(1, len(numbers) + 1)):
            raise ValueError(f'HWP question anchor sequence: {numbers}')
        return out


def organize_shared_sources(questions):
    """Move a printed [5~6] context before anchor 5 away from question 4's last choice."""
    by_number = {q['number']: q for q in questions}
    for q in questions:
        raw = HwpReader.render(q['items'])
        mark = re.search(r'\[\$(\d+)\s*SIM\s*(\d+)\$\]', raw)
        if not mark:
            continue
        start, end = int(mark[1]), int(mark[2])
        before, context, offset = [], [], 0
        for item in q['items']:
            rendered = HwpReader.render([item])
            if offset + len(rendered) <= mark.start():
                before.append(item)
            elif offset >= mark.start():
                context.append(item)
            elif item['kind'] == 'text':
                cut = mark.start()-offset
                before.append({**item,'text':item['text'][:cut]})
                context.append({**item,'text':item['text'][cut:]})
            else:
                raise ValueError('Shared context boundary splits a math object')
            offset += len(rendered)
        q['items'] = before
        passage = {'firstQuestion':start,'lastQuestion':end,
                   'sourceAnchorBeforePassage':q['number'],'items':context}
        for number in range(start,end+1):
            by_number[number]['sharedSourceContext'] = passage
    return questions


def normalize_hwp(question, converter, config):
    items = []
    for item in question['items']:
        if item['kind'] == 'text' and re.fullmatch(r'\s*정답\s*', item.get('text', '')):
            break
        items.append(item)
    question['items'] = items
    raw = HwpReader.render(items)
    # Remove credits without exposing endnote answer/solution contents.
    raw = re.split(r'정답\s*[/：:]|워드\s*[:：]|오검\s*[:：]|완료\s*[:：]', raw)[0]
    raw = re.sub(r'대구광역시\s*내신\s*수학\s*연구회', '', raw)
    topic = re.search(r'\[(?:소단원|중단원)\]\s*([^\n\[]*)', raw)
    difficulty = re.search(r'\[난이도\]\s*([^\n\[]*)', raw)
    clean = re.sub(r'\[(?:소단원|중단원|난이도)\][^\n]*', '', raw).strip()
    clean = re.sub(r'\n{3,}', '\n\n', clean)
    marks = list(re.finditer('[①②③④⑤]', clean))
    run = []
    for index, m in enumerate(marks):
        if m.group() == '①':
            candidate = marks[index:index + 5]
            if ''.join(x.group() for x in candidate) == '①②③④⑤':
                run = candidate
                break
    stem = clean[:run[0].start()].strip() if run else clean
    choices = [clean[m.end():(run[i + 1].start() if i < 4 else len(clean))].strip()
               for i, m in enumerate(run)]
    converted_stem, _ = converter.convert(stem)
    converted_choices = [converter.convert(c)[0] for c in choices]
    notation_repairs = []
    def notation(text):
        before = text
        text = re.sub(r'\\mathrm\{\\overline\{([A-Za-z])\}\}\s*([A-Za-z])',
                      lambda m: r'\overline{' + m[1]+m[2]+'}', text)
        text = re.sub(r'\\mathrm\{\\overline\{([A-Za-z]{2,})\}\}',
                      lambda m: r'\overline{' + m[1]+'}', text)
        text = re.sub(r'\\overline\{([A-Za-z])\}([A-Za-z])',
                      lambda m: r'\overline{' + m[1]+m[2]+'}', text)
        text = re.sub(r'\\overline\{\\mathrm\{([A-Za-z]+)\}\}',
                      lambda m: r'\overline{' + m[1]+'}', text)
        text = text.replace(r'\mathit{}', '')
        if text != before:
            notation_repairs.append({'before':before,'after':text,
                'basis':'Existing fix-exam-solutions.ts segment-bar scope rules; current HWP scripts and rendered PDF still reviewed per question.'})
        return text
    converted_stem = notation(converted_stem)
    converted_choices = [notation(c) for c in converted_choices]
    # Existing explicit hand repairs are reference evidence, applied only on exact match.
    repairs = []
    targets = {'stem': converted_stem, **{f'c{i+1}': c for i, c in enumerate(converted_choices)}}
    for hand in config.get('hand', []):
        if hand['id'].startswith(f"{question['number']}-"):
            target = hand['id'].split('-', 1)[1]
            if target in targets and hand['from'] in targets[target]:
                targets[target] = targets[target].replace(hand['from'], hand['to'])
                repairs.append({'id': hand['id'], 'from': hand['from'], 'to': hand['to'],
                                'reason': hand['why'], 'requiresCurrentPageReview': True})
    scores = [{'printed': m.group(), 'value': float(m.group(2)),
               'parentTotalMarked': bool(m.group(1)), 'textOffset': m.start()}
              for m in re.finditer(r'\[\s*(총\s*)?\$?([\d.]+)\$?\s*점[^\]]*\]', clean)]
    source_stem = targets['stem']
    source_choices = [targets[f'c{i+1}'] for i in range(len(choices))]
    shared = question.get('sharedSourceContext')
    if shared:
        shared = {**shared, 'hwpScript': HwpReader.render(shared['items'])}
        shared['text'] = converter.convert(shared['hwpScript'])[0].replace('$5SIM6$', '5~6')
    return {'number': question['number'], 'questionType': 'multiple-choice' if run else 'written',
            'stem': source_stem, 'choices': source_choices,
            'hwpScriptStem': stem, 'hwpScriptChoices': choices,
            'topicLabelFromSource': topic.group(1).strip() if topic else None,
            'difficultyLabelFromSource': difficulty.group(1).strip() if difficulty else None,
            'printedScoreOccurrences': scores, 'referenceRepairs': repairs,
            'notationNormalizationEvidence': notation_repairs,
            'hwpAnchor': question['anchor'], 'positionedSourceItems': question['items'],
            'mathExpressions': [i for i in question['items'] if i['kind'] == 'math'],
            'hwpFigureRecords': [i for i in question['items'] if i['kind'] in ['figure', 'drawing']],
            'sharedSourceContext': shared,
            'unmappedItems': [i for i in question['items'] if i['kind'] == 'unknown'],
            'sourceContentDigest': canonical({'stem': source_stem, 'choices': source_choices})}


def pdf_question_positions(doc, extractor, count):
    answer_start = extractor.answer_page_start(doc)
    span = extractor.read_order([s for s in extractor.spans(doc) if s['page'] < answer_start],
                                doc[0].rect.width)
    flat = ''.join(s['c'] for s in span)
    starts = []
    for i, s in enumerate(span):
        if s.get('bol'):
            match = re.match(r'(\d{1,2})\.\s', flat[i:i+5])
            if match and int(match.group(1)) == len(starts) + 1:
                starts.append((int(match.group(1)), i))
    if len(starts) != count:
        raise ValueError(f'PDF boundaries {len(starts)} != HWP {count}')
    end = extractor._answer_cut(span, flat, starts[-1][1])
    result = []
    for index, (number, begin) in enumerate(starts):
        stop = starts[index + 1][1] if index + 1 < len(starts) else end
        chars = span[begin:stop]
        # Trim recurring header/footer positions. Their identity is retained separately.
        chars = [s for s in chars if (99 if s['page']==0 else 83) <= s['y0']
                 and s['y1'] <= doc[s['page']].rect.height-88]
        pieces = collections.defaultdict(list)
        for s in chars:
            pieces[(s['page'], 0 if s['x0'] < doc[0].rect.width/2 else 1)].append(s)
        boxes = []
        for (page, column), group in sorted(pieces.items()):
            x0 = 55 if column == 0 else 370
            x1 = 375 if column == 0 else doc[page].rect.width-40
            previous_same = [span[j] for _, j in starts[:index]
                             if span[j]['page'] == page and
                             (0 if span[j]['x0'] < doc[0].rect.width/2 else 1) == column]
            y0 = min(s['y0'] for s in group)-3 if previous_same else (99 if page==0 else 83)
            # The crop ends at the next question in that same page/column or the footer.
            next_same = [span[j] for _, j in starts[index+1:]
                         if span[j]['page'] == page and
                         (0 if span[j]['x0'] < doc[0].rect.width/2 else 1) == column]
            y1 = min([s['y0']-9 for s in next_same] or [doc[page].rect.height-88])
            boxes.append({'page': page+1, 'column': column, 'bbox': [x0, y0, x1, y1]})
        result.append({'number': number, 'regions': boxes,
                       'positionedCharacters': [{k: v for k, v in s.items()
                                                 if k in ['c','eq','page','x0','y0','x1','y1','size','bol']}
                                                for s in chars],
                       'decodedText': extractor.decode(''.join(s['c'] for s in chars))})
    return answer_start, result


def bitmap_correspondence(hwp, doc, regions):
    result = []
    for page in sorted(set(r['page']-1 for r in regions)):
        for image in doc[page].get_images():
            xref = image[0]
            rects = doc[page].get_image_rects(xref)
            relevant = [rect for rect in rects if any(fitz.Rect(r['bbox']).intersects(rect)
                         and rect.y0 >= 99 and rect.width > 20 and rect.height > 20
                         for r in regions if r['page']-1 == page)]
            if not relevant:
                continue
            data = doc.extract_image(xref)['image']
            pixels = Image.open(io.BytesIO(data)).convert('RGB')
            candidates = []
            for key, source in hwp.images.items():
                if source['_image'].size == pixels.size:
                    diff = ImageChops.difference(source['_image'], pixels)
                    mean = sum(ImageStat.Stat(diff).mean)/3
                    # Threshold comparison is supplemental image evidence, not certification.
                    b1 = source['_image'].convert('L').point(lambda v: 255 if v>200 else 0)
                    b2 = pixels.convert('L').point(lambda v: 255 if v>200 else 0)
                    candidates.append({'binId': key, 'stream': source['stream'],
                                       'hwpPixelRgbSha256': source['pixelRgbSha256'],
                                       'meanChannelAbsoluteDifference': mean,
                                       'threshold200PixelEquality': b1.tobytes()==b2.tobytes()})
            result.append({'pdfPage': page+1, 'xref': xref, 'rectangles': [list(r) for r in relevant],
                           'pdfImageBytesSha256': sha(data), 'pdfPixelRgbSha256': sha(pixels.tobytes()),
                           'pixelSize': list(pixels.size), 'sameSizeHwpCandidates': candidates,
                           'certifiedByPixelsAlone': False})
    return result


def extract_paper(slug, audit, extractor, converter):
    e = next(e for e in audit['exams'] if e['legacyExtraction']['examId']==f'2025-{slug}-3-2-mid')
    hp = next(r['path'] for r in e['sourceFiles'] if r['selectedForReference'] and r['extension']=='hwp')
    pp = next(r['path'] for r in e['sourceFiles'] if r['selectedForReference'] and r['extension']=='pdf')
    folder = HERE / slug
    hwp = HwpReader(hp)
    raw = organize_shared_sources(hwp.questions())
    config = load(ROOT / 'scripts/import/exam-paper/exams' / e['legacyExtraction']['examId'] / 'exam.json')
    parsed = [normalize_hwp(q, converter, config) for q in raw]
    pdf = extractor.extract(Path(pp))  # No with_answers; no CLI/save/DB.
    with fitz.open(pp) as doc:
        answer_start, positions = pdf_question_positions(doc, extractor, len(parsed))
        # The same shared context precedes question 5 in PDF read order too.
        for q in parsed:
            shared = q.get('sharedSourceContext')
            if shared:
                origin = positions[shared['sourceAnchorBeforePassage']-1]
                target = positions[shared['firstQuestion']-1]
                target_page = target['regions'][0]['page']
                carried = [r for r in origin['regions'] if r['page']==target_page]
                if carried:
                    shared['pdfContextRegions'] = carried
                    origin['regions'] = [r for r in origin['regions'] if r not in carried]
                    origin['positionedCharacters'] = [c for c in origin['positionedCharacters']
                                                       if c['page']+1 != target_page]
        for q in parsed:
            if q.get('sharedSourceContext'):
                first = parsed[q['sharedSourceContext']['firstQuestion']-1]
                q['sharedSourceContext']['pdfContextRegions'] = first['sharedSourceContext'].get('pdfContextRegions', [])
        headers = [{'page': i+1, 'text': extractor.decode(doc[i].get_text(clip=fitz.Rect(0,0,728,105))),
                    'footer': extractor.decode(doc[i].get_text(clip=fitz.Rect(0,965,728,1031)))}
                   for i in range(answer_start)]
        rendered_pages = []
        for i in range(answer_start):
            name = folder / 'evidence' / f'completed-page-{i+1:02}.png'
            name.parent.mkdir(parents=True, exist_ok=True)
            doc[i].get_pixmap(matrix=fitz.Matrix(1.7,1.7)).save(str(name))
            rendered_pages.append({'page': i+1, 'file': str(name.relative_to(HERE)),
                                   'sha256': sha(name.read_bytes()), 'answersIncluded': False,
                                   'viewedByReviewer': False})
        for q, pos in zip(parsed, positions):
            q['pdfReference'] = {'source': source_ref(pp), **pos,
                                  'freshParserQuestion': next(x for x in pdf['questions'] if x['number']==q['number'])}
            q['figureCorrespondence'] = bitmap_correspondence(hwp, doc, pos['regions'])
            q['questionPageCrops'] = []
            for part, region in enumerate(pos['regions']):
                path = folder / 'packet' / 'images' / f'q{q["number"]:02}-part{part+1}.png'
                path.parent.mkdir(parents=True, exist_ok=True)
                doc[region['page']-1].get_pixmap(matrix=fitz.Matrix(2,2),clip=fitz.Rect(region['bbox'])).save(str(path))
                q['questionPageCrops'].append({'file': str(path.relative_to(HERE)),
                                               'sha256': sha(path.read_bytes()), **region})
            q['contentReview'] = {'status': 'pending_visual_question_comparison',
                                   'wholeExamPairCertified': False}
            q['curriculum'] = {'sourceGrade': '중3', 'expected2015': slug!='gyeongsin',
                               'appliedCurriculum': '2015' if slug!='gyeongsin' else None,
                               'status': 'hold_full_item_review', 'fullApproval': False,
                               'sourceSchoolIsNotPermission': True}
            q['custodyRights'] = {'custody': 'local_readonly_hash_recorded',
                                   'rights': 'pending', 'publicationAllowed': False}
    manifest = {'version': 'source-extraction-r1', 'createdAt': datetime.now(timezone.utc).isoformat(),
                'examId': e['legacyExtraction']['examId'], 'inventoryExamId': e['inventoryExamId'],
                'school': e['school'], 'nominalYear': 2025, 'grade': 3, 'semester': 2, 'round': '중간',
                'sourceFiles': [source_ref(hp), source_ref(pp)],
                'identity': {'status': e['identityStatus'], 'yearConfirmed': False,
                              'hwpHeadersFooters': hwp.headers, 'pdfHeadersFooters': headers,
                              'scanComparisonStatus': 'pending_local_render'},
                'hwpSections': hwp.sections, 'excludedNotes': hwp.excluded,
                'hwpUnknownControls': hwp.unknown, 'answerPageFirstOneBased': answer_start+1,
                'questionOnlyRenderedPages': rendered_pages,
                'questionCountFreshHwp': len(parsed), 'questionCountFreshPdf': len(pdf['questions']),
                'questions': parsed, 'entireExamPairCertification': 'pending',
                'verifiedTwins': 0, 'newTwinsAuthored': 0,
                'originalAnswersSolutionsExported': False,
                'rightsCertification': 'pending'}
    write(folder/'source-manifest.json', manifest)
    write(folder/'packet/questions.json', {'version':'source-only-r1','examId':manifest['examId'],
        'instructions':'Reference questions only. Original answer/solution/endnote areas are withheld. Do not infer a correct choice from source metadata. Holds must be cleared before twin authoring.',
        'questions':[{'number':q['number'],'stem':q['stem'],'choices':q['choices'],
                      'hwpScriptStem':q['hwpScriptStem'],'hwpScriptChoices':q['hwpScriptChoices'],
                      'scoreOccurrences':q['printedScoreOccurrences'],'images':q['questionPageCrops'],
                      'sharedContext':q['sharedSourceContext'],
                      'sourceDigest':q['sourceContentDigest'],'curriculum':q['curriculum'],
                      'status':'reference_content_pending_review'} for q in parsed]})
    print(slug, 'HWP',len(parsed),'PDF',len(pdf['questions']), 'unknown',len(hwp.unknown),
          'notes-withheld',len(hwp.excluded), 'pages',answer_start, flush=True)


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--papers',nargs='+',choices=SLUGS,default=SLUGS)
    args=parser.parse_args()
    audit=load(AUDIT)
    extractor=module(Path('D:/시험지 한글화/db/textlayer.py'),'source_pdf_readonly')
    converter=module(ROOT/'scripts/qa/convert-hwp-spans.py','source_formula_readonly')
    for slug in args.papers:
        extract_paper(slug,audit,extractor,converter)


if __name__=='__main__':
    main()
