"""Bind visual judgments to selected identities and unchanged external pixels."""
from copy import deepcopy
import json
from pathlib import Path
import tempfile
import unittest

import census
import figures


class VisualEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(dir=census.ROOT / '.work')
        self.addCleanup(self.temp.cleanup)
        self.directory = Path(self.temp.name)
        self.paths = {}
        files = []
        for position in (1, 2):
            url = '/figures/tb/abcdef/test-' + str(position) + '.png'
            # Synthetic bytes test identity/signature only, never source images.
            data = b'\x89PNG\r\n\x1a\n' + bytes([position])
            path = self.directory / ('image-' + str(position) + '.png')
            path.write_bytes(data)
            self.paths[url] = path
            files.append(dict(position=position, url=url, sha256=census.sha(data), bytes=len(data)))
        self.rows = [dict(id='row-' + str(i), problem_code='J20501-TEST-' + str(i), grade='중2',
                          section='삼각형의 성질' if i < 7 else '닮은 도형') for i in range(8)]
        self.inventory = [dict(**row, figure_source='source', files=deepcopy(files)) for row in self.rows]
        self.plan = figures.make_plan(self.inventory)
        self.review = dict(reviewer='synthetic test reviewer', method='synthetic evidence fixture', families={}, rows=[])
        for index, cohort in enumerate(self.plan['cohorts']):
            family_id = 'test-family-' + str(index)
            self.review['families'][family_id] = dict(name='독립 시험 유형', grade=cohort['grade'], section=cohort['section'],
                category='B', engine_keys=[], variables='양의 수', answer_method='산술 계산', figure='required',
                difficulty='easy', rationale='검증기를 위한 가상 메타데이터')
            for row_id in cohort['sample_ids']:
                row = next(r for r in self.rows if r['id'] == row_id)
                self.review['rows'].append(dict(id=row_id, problem_code=row['problem_code'], cohort=cohort['id'],
                    category='B', family=family_id, viewed_urls=[f['url'] for f in files], note='가상 구조 판단'))
        self.write('figure-inventory.json', self.inventory)
        self.write('figure-review-plan.json', self.plan)
        self.write('visual-m2-geo.json', self.review)
        original_local_path = figures.local_path
        figures.local_path = lambda url: self.paths[url]
        self.addCleanup(setattr, figures, 'local_path', original_local_path)

    def write(self, filename, value):
        (self.directory / filename).write_text(json.dumps(value, ensure_ascii=False), encoding='utf-8')

    def load(self, **changes):
        values = dict(rows=self.rows, inventory=self.inventory, plan=self.plan, evidence_dir=self.directory)
        values.update(changes)
        return figures.load_reviews(**values)

    def reject_review(self, mutate):
        review = deepcopy(self.review)
        mutate(review)
        self.write('visual-m2-geo.json', review)
        with self.assertRaises(ValueError):
            self.load()

    def test_valid_reviews_cover_only_frozen_samples_in_plan_order(self):
        result = self.load()
        selected = [i for c in self.plan['cohorts'] for i in c['sample_ids']]
        self.assertEqual([r['id'] for r in result['rows']], selected)
        self.assertEqual(len(result['rows']), 7)
        self.assertEqual(result['families'], self.review['families'])
        self.assertEqual(figures.validate_inventory(self.inventory, self.directory),
                         dict(rows=8, file_references=16, unique_files=2))

    def test_missing_duplicate_and_unselected_rows_are_rejected(self):
        unseen = next(r for r in self.rows if r['id'] not in {r['id'] for r in self.review['rows']})
        mutations = [lambda r: r['rows'].pop(),
                     lambda r: r['rows'].append(deepcopy(r['rows'][0])),
                     lambda r: r['rows'][0].update(id=unseen['id'], problem_code=unseen['problem_code'])]
        for mutate in mutations:
            with self.subTest(mutate=mutate):
                self.reject_review(mutate)

    def test_viewed_urls_must_be_complete_unique_and_in_order(self):
        for urls in [[], [self.review['rows'][0]['viewed_urls'][0]],
                     list(reversed(self.review['rows'][0]['viewed_urls'])),
                     self.review['rows'][0]['viewed_urls'] * 2]:
            with self.subTest(urls=urls):
                self.reject_review(lambda r: r['rows'][0].update(viewed_urls=urls))

    def test_identity_cohort_category_and_unknown_family_fail_closed(self):
        for changes in [dict(problem_code='invented'), dict(cohort='invented'), dict(category='A'),
                        dict(family='absent'), dict(category='C'), dict(note=''), dict(image_issue='other')]:
            with self.subTest(changes=changes):
                self.reject_review(lambda r: r['rows'][0].update(changes))

    def test_family_must_be_a_b_candidate_for_the_exact_unit(self):
        for changes in [dict(grade='중1'), dict(section='invented'), dict(category='A'),
                        dict(engine_keys=['existing-engine-key']), dict(figure='sometimes'),
                        dict(difficulty='very-hard'), dict(answer_method='')]:
            with self.subTest(changes=changes):
                self.reject_review(lambda r: next(iter(r['families'].values())).update(changes))

    def test_attaching_existing_family_from_another_section_is_rejected(self):
        self.reject_review(lambda r: r['rows'][0].update(family=r['rows'][-1]['family']))

    def test_unused_candidate_families_are_rejected(self):
        self.reject_review(lambda r: r['families'].update(unused=deepcopy(next(iter(r['families'].values())))))

    def test_hold_can_record_an_image_issue_without_a_family(self):
        review = deepcopy(self.review)
        first_family = review['rows'][0]['family']
        for row in review['rows']:
            if row['family'] == first_family:
                row.update(category='C', family=None, image_issue='unreadable')
        del review['families'][first_family]
        self.write('visual-m2-geo.json', review)
        result = self.load()
        self.assertEqual(result['rows'][0]['category'], 'C')

    def test_blank_or_unreadable_image_cannot_support_b(self):
        for issue in ('blank', 'unreadable'):
            with self.subTest(issue=issue):
                self.reject_review(lambda r: r['rows'][0].update(image_issue=issue))

    def test_source_mismatch_can_keep_an_independently_determined_type(self):
        review = deepcopy(self.review)
        review['rows'][0]['image_issue'] = 'source-mismatch'
        self.write('visual-m2-geo.json', review)
        self.assertEqual(self.load()['rows'][0]['category'], 'B')

    def test_review_files_cannot_be_missing_or_unplanned(self):
        path = self.directory / 'visual-m2-geo.json'
        path.rename(self.directory / 'visual-unknown.json')
        with self.assertRaises(ValueError):
            self.load()
        (self.directory / 'visual-unknown.json').unlink()
        with self.assertRaises(ValueError):
            self.load()

    def test_duplicate_json_keys_and_unexpected_source_columns_are_rejected(self):
        path = self.directory / 'visual-m2-geo.json'
        raw = path.read_text()
        path.write_text(raw.replace('"reviewer":', '"reviewer": "duplicate", "reviewer":', 1))
        with self.assertRaises(ValueError):
            self.load()
        self.reject_review(lambda r: r['rows'][0].update(content='forbidden source field'))

    def test_changed_source_identity_or_duplicate_source_id_is_rejected(self):
        changed = deepcopy(self.rows)
        changed[0]['section'] = 'invented'
        for rows in [changed, self.rows + [self.rows[0]], self.rows[1:]]:
            with self.subTest(rows=len(rows)), self.assertRaises(ValueError):
                self.load(rows=rows)

    def test_changed_plan_is_rejected_even_if_both_copy_and_file_change(self):
        changed = deepcopy(self.plan)
        next(c for c in changed['cohorts'] if len(c['sample_ids']) > 1)['sample_ids'].reverse()
        with self.assertRaises(ValueError):
            self.load(plan=changed)
        self.write('figure-review-plan.json', changed)
        with self.assertRaises(ValueError):
            self.load(plan=changed)

    def test_changed_inventory_argument_is_rejected(self):
        changed = deepcopy(self.inventory)
        changed[0]['files'][0]['sha256'] = '0' * 64
        with self.assertRaises(ValueError):
            figures.validate_inventory(changed, self.directory)

    def test_same_size_image_mutation_is_rejected(self):
        path = next(iter(self.paths.values()))
        raw = path.read_bytes()
        path.write_bytes(raw[:-1] + b'\xff')
        with self.assertRaises(ValueError):
            self.load()

    def test_conflicting_repeated_reference_and_file_order_are_rejected(self):
        mutations = [lambda i: i[1]['files'][0].update(sha256='0' * 64),
                     lambda i: i[0]['files'].reverse(),
                     lambda i: i[0]['files'].append(deepcopy(i[0]['files'][0])),
                     lambda i: i.append(deepcopy(i[0]))]
        for mutate in mutations:
            with self.subTest(mutate=mutate):
                changed = deepcopy(self.inventory)
                mutate(changed)
                self.write('figure-inventory.json', changed)
                with self.assertRaises(ValueError):
                    figures.validate_inventory(changed, self.directory)


if __name__ == '__main__':
    unittest.main()
