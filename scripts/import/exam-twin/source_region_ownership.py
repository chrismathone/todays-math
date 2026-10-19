"""PDF layout evidence, never geometric/math measurements or content certification.

Overlapping question regions can be legitimate shared material. They require
explicit ownership review; this audit neither repairs nor approves any crop.
"""
import math


def audit_region_ownership(positions):
    if not isinstance(positions, list) or not 1 <= len(positions) <= 256:
        raise ValueError('Bounded question positions required')
    seen, regions = set(), []
    for question in positions:
        number = question.get('number')
        if type(number) is not int or number <= 0 or number in seen:
            raise ValueError('Unique positive question numbers required')
        seen.add(number)
        boxes = question.get('regions')
        if not isinstance(boxes, list) or not 1 <= len(boxes) <= 32:
            raise ValueError('Bounded nonempty regions required')
        for index, region in enumerate(boxes):
            page, column, box = region.get('page'), region.get('column'), region.get('bbox')
            if type(page) is not int or page < 1 or type(column) is not int or column not in (0, 1):
                raise ValueError('One-based page and supported column required')
            if (not isinstance(box, list) or len(box) != 4
                    or any(type(x) not in (int, float) or not math.isfinite(x) for x in box)
                    or box[0] < 0 or box[1] < 0 or box[2] <= box[0] or box[3] <= box[1]):
                raise ValueError('Finite positive-area layout box required')
            regions.append({'question': number, 'regionIndex': index, 'page': page,
                            'column': column, 'bbox': box})
    overlaps = []
    for i, left in enumerate(regions):
        for right in regions[i + 1:]:
            if (left['question'] == right['question'] or left['page'] != right['page']
                    or left['column'] != right['column']):
                continue
            a, b = left['bbox'], right['bbox']
            box = [max(a[0], b[0]), max(a[1], b[1]), min(a[2], b[2]), min(a[3], b[3])]
            if box[2] > box[0] and box[3] > box[1]:
                overlaps.append({'questions': [left['question'], right['question']],
                                 'regionIndexes': [left['regionIndex'], right['regionIndex']],
                                 'page': left['page'], 'column': left['column'],
                                 'intersectionBbox': box,
                                 'status': 'shared-material-or-misrouting-review-required'})
    flagged = sorted({q for row in overlaps for q in row['questions']})
    return {'kind': 'source-region-ownership-audit/v1', 'questions': len(positions),
            'overlaps': overlaps, 'flaggedQuestionNumbers': flagged,
            'status': 'review-required' if overlaps else 'no-overlap-observed',
            'mathPixelsUsed': False, 'questionContentCertified': False,
            'authorDistributionAllowed': False, 'regionsModified': False,
            'limitation': 'Disjoint boxes do not prove correct ownership, complete figures or text equivalence'}
