"""Bind external figure mappings to existing files and explicit visual judgments.

No textbook pixels or prose are copied. File existence/hash is a census; viewing
is recorded separately. Only individually viewed rows may move from C to B.
"""
from collections import Counter, defaultdict
import json
from pathlib import Path
import re
import census

DEFAULT_INPUT = Path('/Volumes/새 볼륨/today-backups/textbook-mid-figures.jsonl')
VISUAL_SEED = 'textbook-census-figures-v1-20261125'
OWNERS = ['m1-core','m1-geo','m2-core','m2-geo']


def local_path(url):
    if not isinstance(url,str) or not re.fullmatch(r'/figures/tb/[0-9a-f]+/[A-Za-z0-9._-]+\.(?:png|jpg)',url):
        raise ValueError('Unsafe or unsupported textbook figure URL')
    p = census.ROOT/'public'/url.lstrip('/')
    # Shared figure directories may be symlinks: inspect existing files, never write there.
    if not p.is_file():
        raise ValueError('Missing mapped figure: '+url)
    return p


def read_mapping(path, rows):
    manifest = json.loads((census.HERE/'figure-manifest.json').read_text())
    raw = path.read_bytes()
    if census.sha(raw)!=manifest['sha256'] or len(raw)!=manifest['bytes']:
        raise ValueError('Figure input does not match reviewed snapshot')
    mapping=[json.loads(line) for line in raw.splitlines()]
    if len(mapping)!=manifest['rows']:
        raise ValueError('Wrong figure mapping population')
    by_id={r['id']:r for r in rows}
    seen=set();inventory=[]
    for m in mapping:
        if set(m)!={'id','figure_urls','figure_source'} or m['id'] in seen or m['id'] not in by_id:
            raise ValueError('Duplicate, unknown, or malformed figure row')
        seen.add(m['id'])
        if m['figure_source']!='source' or not isinstance(m['figure_urls'],list) or not m['figure_urls']:
            raise ValueError('Unexpected figure source or empty URL list')
        if len(set(m['figure_urls']))!=len(m['figure_urls']):
            raise ValueError('Repeated URL in one figure row')
        files=[]
        for position,url in enumerate(m['figure_urls'],1):
            data=local_path(url).read_bytes()
            if not (data.startswith(b'\x89PNG\r\n\x1a\n') or data.startswith(b'\xff\xd8\xff')):
                raise ValueError('File extension/image signature mismatch')
            files.append(dict(position=position,url=url,sha256=census.sha(data),bytes=len(data)))
        r=by_id[m['id']]
        inventory.append(dict(id=r['id'],problem_code=r['problem_code'],grade=r['grade'],section=r['section'],
                              figure_source=m['figure_source'],files=files))
    if sum(len(i['files']) for i in inventory)!=manifest['file_references']:
        raise ValueError('Wrong file-reference population')
    return inventory


def owner(row):
    geo = (row['grade']=='중1' and row['problem_code'][:4] in ('J105','J106','J107','J108')) or (row['grade']=='중2' and row['problem_code'][:4] in ('J205','J206','J207','J208'))
    return 'm'+row['grade'][-1]+('-geo' if geo else '-core')


def make_plan(inventory):
    units=defaultdict(list)
    for r in inventory: units[(r['grade'],r['section'])].append(r)
    cohorts=[]
    for (grade,section),members in sorted(units.items()):
        members=sorted(members,key=lambda r:census.sha((VISUAL_SEED+':'+r['id']).encode()))
        cohorts.append(dict(id='visual-m'+grade[-1]+'-'+census.sha(section.encode())[:8],grade=grade,section=section,
                            owner=owner(members[0]),population=len(members),
                            file_population=sum(len(m['files']) for m in members),
                            member_ids=[m['id'] for m in members],sample_ids=[m['id'] for m in members[:6]],
                            method='census' if len(members)<=6 else 'sample',sampling='SHA256(seed:id), first min(6,n) per grade/engine unit'))
    return dict(seed=VISUAL_SEED,cohorts=cohorts)


def reconcile(rows, inventory):
    mapped={r['id'] for r in inventory};references={r['id'] for r in rows if '그림' in r['content'] or r['has_figure']}
    gaps=[dict(id=r['id'],problem_code=r['problem_code'],grade=r['grade'],section=r['section'],
               legacy_svg_flag=r['has_figure'],reason='svg-present-but-bytes-not-exported' if r['has_figure'] else
               'term-only-reference' if r['problem_code']=='J10802-A21-001' else 'text-reference-without-mapped-file')
          for r in rows if r['id'] in references-mapped]
    return dict(manifest=json.loads((census.HERE/'figure-manifest.json').read_text()),reference_rows=len(references),
                mapped_rows=len(inventory),mapped_without_reference=len(mapped-references),unmapped_reference_rows=len(gaps),
                files=sum(len(r['files']) for r in inventory),unique_files=len({f['url'] for r in inventory for f in r['files']}),
                missing_files=0,legacy_svg_unmapped=sum(r['legacy_svg_flag'] for r in gaps),gaps=gaps,
                term_only_references=sum(r['reason']=='term-only-reference' for r in gaps),
                grades=dict(Counter(r['grade'] for r in inventory)))


def _read_evidence(path):
    """Reject duplicate JSON keys instead of silently replacing a judgment."""
    def unique_object(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise ValueError('Duplicate evidence JSON key: ' + key)
            result[key] = value
        return result

    try:
        return json.loads(path.read_text(encoding='utf-8'), object_pairs_hook=unique_object)
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise ValueError('Missing or unreadable evidence: ' + path.name) from exc


def _keys(value, required, optional=()):
    if not isinstance(value, dict) or set(value) - set(required) - set(optional) or set(required) - set(value):
        raise ValueError('Unexpected evidence fields')


def _text(value):
    return isinstance(value, str) and bool(value.strip())


def validate_inventory(inventory, evidence_dir=census.DEFAULT_OUT):
    """Bind metadata to the frozen inventory and rehash every unique local file.

    This verifies existing bytes, not readability or mathematical correctness.
    No pixels are copied and repeated references still retain their own order.
    """
    frozen = _read_evidence(Path(evidence_dir) / 'figure-inventory.json')
    if inventory != frozen or not isinstance(inventory, list):
        raise ValueError('Figure inventory differs from the frozen evidence')
    seen = set()
    checked = {}
    references = 0
    for entry in inventory:
        _keys(entry, ('id', 'problem_code', 'grade', 'section', 'figure_source', 'files'))
        if (not all(_text(entry[k]) for k in ('id', 'problem_code', 'section')) or
                entry['id'] in seen or entry['grade'] not in ('중1', '중2') or
                entry['figure_source'] != 'source' or not isinstance(entry['files'], list) or not entry['files']):
            raise ValueError('Invalid or duplicate figure inventory row')
        seen.add(entry['id'])
        urls = set()
        for position, file in enumerate(entry['files'], 1):
            _keys(file, ('position', 'url', 'sha256', 'bytes'))
            if (type(file['position']) is not int or file['position'] != position or
                    not _text(file['url']) or file['url'] in urls or
                    not isinstance(file['sha256'], str) or not re.fullmatch(r'[0-9a-f]{64}', file['sha256']) or
                    type(file['bytes']) is not int or file['bytes'] <= 0):
                raise ValueError('Invalid, repeated, or out-of-order inventory file')
            urls.add(file['url'])
            expected = (file['sha256'], file['bytes'])
            if file['url'] not in checked:
                data = local_path(file['url']).read_bytes()
                if not (data.startswith(b'\x89PNG\r\n\x1a\n') or data.startswith(b'\xff\xd8\xff')):
                    raise ValueError('Mapped file no longer has an image signature')
                checked[file['url']] = (census.sha(data), len(data))
            if checked[file['url']] != expected:
                raise ValueError('Figure bytes/hash differ from frozen inventory: ' + file['url'])
            references += 1
    return dict(rows=len(inventory), file_references=references, unique_files=len(checked))


def load_reviews(rows, inventory, plan, evidence_dir=census.DEFAULT_OUT):
    """Load only individually viewed judgments from the exact frozen sample.

    A declared view is evidence supplied by the reviewer, not proof that a
    program saw an image. Unselected population members are never promoted.
    """
    evidence_dir = Path(evidence_dir)
    validate_inventory(inventory, evidence_dir)
    if plan != _read_evidence(evidence_dir / 'figure-review-plan.json') or plan != make_plan(inventory):
        raise ValueError('Visual review plan differs from the frozen deterministic sample')
    by_id = {}
    for row in rows:
        if not isinstance(row, dict) or not _text(row.get('id')) or row['id'] in by_id:
            raise ValueError('Invalid or duplicate source row identity')
        by_id[row['id']] = row
    mapped = {entry['id']: entry for entry in inventory}
    for entry in inventory:
        source = by_id.get(entry['id'])
        if source is None or any(source.get(k) != entry[k] for k in ('problem_code', 'grade', 'section')):
            raise ValueError('Inventory identity does not match source rows')

    selected = {}
    expected_by_owner = defaultdict(set)
    for cohort in plan['cohorts']:
        if cohort['owner'] not in OWNERS:
            raise ValueError('Unknown visual review owner')
        for row_id in cohort['sample_ids']:
            if row_id in selected:
                raise ValueError('Duplicate selected visual row')
            selected[row_id] = cohort
            expected_by_owner[cohort['owner']].add(row_id)
    expected_paths = {evidence_dir / ('visual-' + owner_name + '.json') for owner_name in expected_by_owner}
    if set(evidence_dir.glob('visual-*.json')) != expected_paths:
        raise ValueError('Missing or unexpected visual review file')

    families = {}
    reviewed = {}
    family_fields = ('name', 'grade', 'section', 'category', 'engine_keys', 'variables',
                     'answer_method', 'figure', 'difficulty', 'rationale')
    row_fields = ('id', 'problem_code', 'cohort', 'category', 'family', 'viewed_urls', 'note')
    for owner_name in OWNERS:
        if owner_name not in expected_by_owner:
            continue
        review = _read_evidence(evidence_dir / ('visual-' + owner_name + '.json'))
        _keys(review, ('reviewer', 'method', 'families', 'rows'))
        if (not _text(review['reviewer']) or not _text(review['method']) or
                not isinstance(review['families'], dict) or not isinstance(review['rows'], list)):
            raise ValueError('Malformed visual reviewer record')
        allowed_units = {(c['grade'], c['section']) for c in plan['cohorts'] if c['owner'] == owner_name}
        for family_id, family in review['families'].items():
            _keys(family, family_fields)
            if (not _text(family_id) or family_id in families or
                    (family['grade'], family['section']) not in allowed_units or
                    family['category'] != 'B' or family['engine_keys'] != [] or
                    family['figure'] not in ('none', 'required') or
                    family['difficulty'] not in ('easy', 'mid', 'hard') or
                    any(not _text(family[k]) for k in ('name', 'variables', 'answer_method', 'rationale'))):
                raise ValueError('Invalid or duplicate visual candidate family')
            families[family_id] = family
        owner_seen = set()
        used_families = set()
        for judgment in review['rows']:
            _keys(judgment, row_fields, ('image_issue',))
            row_id = judgment['id']
            if (not _text(row_id) or row_id not in expected_by_owner[owner_name] or
                    row_id in owner_seen or row_id in reviewed):
                raise ValueError('Duplicate, unselected, or wrongly owned visual judgment')
            owner_seen.add(row_id)
            source = by_id[row_id]
            cohort = selected[row_id]
            if (judgment['problem_code'] != source['problem_code'] or judgment['cohort'] != cohort['id'] or
                    judgment['viewed_urls'] != [f['url'] for f in mapped[row_id]['files']] or
                    not _text(judgment['note']) or judgment['category'] not in ('B', 'C')):
                raise ValueError('Visual judgment identity, ordered views, or category mismatch')
            if 'image_issue' in judgment and judgment['image_issue'] not in ('blank', 'unreadable', 'source-mismatch'):
                raise ValueError('Unknown visual image issue')
            if judgment['category'] == 'C':
                if judgment['family'] is not None:
                    raise ValueError('Held visual row must not assert a candidate family')
            else:
                if judgment.get('image_issue') in ('blank', 'unreadable'):
                    raise ValueError('Blank or unreadable evidence cannot support a visual B row')
                family_id = judgment['family']
                if not _text(family_id) or family_id not in review['families']:
                    raise ValueError('Visual B row needs its own declared candidate family')
                family = review['families'][family_id]
                if (family['grade'], family['section']) != (source['grade'], source['section']):
                    raise ValueError('Visual candidate is attached to the wrong grade/section')
                used_families.add(family_id)
            reviewed[row_id] = judgment
        if owner_seen != expected_by_owner[owner_name]:
            raise ValueError('Visual owner did not review every selected row')
        if used_families != set(review['families']):
            raise ValueError('Visual candidate has no individually reviewed supporting row')
    if set(reviewed) != set(selected):
        raise ValueError('Visual judgments do not exactly cover the frozen sample')
    return dict(families=families, rows=[reviewed[row_id] for row_id in selected])
