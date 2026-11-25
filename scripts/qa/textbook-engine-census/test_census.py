"""Integrity checks: reject partial or stale evidence; never promote unseen figures."""
import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

import census
import rules_m1
import rules_m2
import verify


def row(**changes):
    base = dict(id='one', problem_code='TEST-001', grade='중1', chapter='test', section='소수와 거듭제곱',
                difficulty='기본', problem_type='계산', question_type='단답형', content='소수의 개수를 구하시오.',
                answer='2', solution='자체 시험 자료', has_figure=False, direct_use_allowed=True, source_title='test')
    return {**base, **changes}


class IntegrityTests(unittest.TestCase):
    def test_unviewed_mapped_image_blocks_an_otherwise_matching_rule(self):
        r = row(content='정수 $11$을 판정하시오.')
        family = dict(name='가상 규칙',grade=r['grade'],section=r['section'],category='B',engine_keys=[],
                      variables='정수',answer_method='정수 계산',figure='none',difficulty='easy',rationale='가상 검사')
        module = SimpleNamespace(FAMILIES={'test':family}, classify=lambda _: 'test')
        empty = SimpleNamespace(FAMILIES={}, classify=lambda _: None)
        original_import = census.importlib.import_module
        census.importlib.import_module = lambda name: module if name=='rules_m1' else empty
        try:
            assigned, _, _ = census.classify_all([r], ['0'*64],
                {'entries':[dict(grade=r['grade'],section=r['section'],key='test',samples=[])]},
                inventory=[dict(id=r['id'],files=[dict(url='/figures/tb/ab/test.png')])])
        finally:
            census.importlib.import_module = original_import
        self.assertEqual(assigned[0]['category'], 'C')
        self.assertEqual(assigned[0]['reason'], 'figure-not-reviewed')
        self.assertFalse(assigned[0]['figure_reviewed'])

    def test_duplicate_ids_and_codes_are_errors(self):
        for rows in [[row(), row(problem_code='TEST-002')], [row(), row(id='two')]]:
            with self.assertRaises(ValueError):
                census.validate_rows(rows)

    def test_missing_column_and_string_boolean_are_errors(self):
        missing = row()
        del missing['has_figure']
        for rows in [[missing], [row(has_figure='false')], [row(content='')]]:
            with self.assertRaises(ValueError):
                census.validate_rows(rows)

    def test_false_flag_does_not_hide_numbered_picture_marker(self):
        r = row(content='다음 조건을 이용하시오. [그림 2]')
        self.assertEqual(census.global_hold(r), 'missing-figure')
        self.assertTrue(census.figure_evidence(r)['figure_reference'])
        self.assertFalse(census.figure_evidence(r)['figure_flag'])

    def test_reasoning_and_missing_operands_are_held(self):
        self.assertEqual(census.global_hold(row(content='이 성질이 성립하는 이유를 설명하시오.')), 'open-response')
        self.assertEqual(census.global_hold(row(content='다음 식을 계산하시오.')), 'missing-math')
        self.assertIsNone(census.global_hold(row(content='$12+7$을 계산하시오.')))

    def test_statement_selection_is_not_an_open_explanation_request(self):
        r = row(content='식 $5z+9$에 대한 설명으로 옳은 것을 고르시오.')
        self.assertIsNone(census.global_hold(r))

    def test_missing_solution_is_preserved_without_inventing_it(self):
        census.validate_rows([row(solution=None)])

    def test_locked_is_not_a_type(self):
        r = row(content='$12+7$을 계산하시오.', direct_use_allowed=False)
        self.assertIsNone(census.global_hold(r))

    def test_input_digest_detects_same_size_changes(self):
        with tempfile.TemporaryDirectory(dir=Path(__file__).resolve().parents[3] / '.work') as d:
            p = Path(d) / 'rows.jsonl'
            p.write_text(json.dumps(row()), encoding='utf-8')
            with self.assertRaises(ValueError):
                census.read_input(p, {'sha256':'0'*64, 'bytes':p.stat().st_size, 'rows':1, 'grades':{'중1':1}})

    def test_sampling_is_order_independent_and_without_replacement(self):
        rows = [dict(id=str(i), category='A', problem_code=str(i)) for i in range(12)]
        a = census.draw_sample(rows, quotas={'A':5})
        self.assertEqual(a, census.draw_sample(list(reversed(rows)), quotas={'A':5}))
        self.assertEqual(len(a), len({x['id'] for x in a}))

    def test_a_type_must_exist_in_same_grade_and_section(self):
        families = {'x':dict(name='test', grade='중1', section='소수와 거듭제곱',category='A', engine_keys=['absent'],
                            variables='수',answer_method='계산',figure='none',difficulty='easy',rationale='test')}
        with self.assertRaises(ValueError):
            census.validate_families(families, {'entries':[]})
        engine = {'entries':[dict(key='absent',grade='중2',section='소수와 거듭제곱',samples=[{'seed':1}])]}
        with self.assertRaises(ValueError):
            census.validate_families(families, engine)

    def test_conservation_rejects_lost_or_repeated_rows(self):
        source = [row(), row(id='two',problem_code='TEST-002')]
        for output in [[{'id':'one'}], [{'id':'one'}, {'id':'one'}]]:
            with self.assertRaises(ValueError):
                census.validate_conservation(source, output)

    def test_escaped_json_does_not_hide_source_prose(self):
        text = ('독립 시험용 가상 문장과 수식 \\dfrac{37}{19}\n' * 6)
        source = [row(content=text)]
        with tempfile.TemporaryDirectory(dir=census.ROOT/'.work') as d:
            path = Path(d)/'artifact.json'
            path.write_text(json.dumps({'note':text}, ensure_ascii=True))
            self.assertTrue(verify.has_source_fragment(source, [path]))
            path.write_text(json.dumps({'note':'다른 요약과 문항 식별자만 있다.'}))
            self.assertFalse(verify.has_source_fragment(source, [path]))


class TypeBoundaryTests(unittest.TestCase):
    def test_choices_supply_data_but_a_missing_list_does_not(self):
        prompt = '다음 중 소수인 것은?'
        populated = row(content=prompt + '\n① $8$\n② $11$\n③ $15$\n④ $21$\n⑤ $25$')
        family = rules_m1.classify(populated)
        self.assertEqual(rules_m1.FAMILIES[family]['category'], 'B')
        self.assertIsNone(rules_m1.classify(row(content=prompt)))

    def test_single_arithmetic_and_a_batch_are_not_one_engine_type(self):
        common = dict(section='유리수의 덧셈과 뺄셈')
        single = row(content='다음을 계산하시오. $(+8)+(-5)$', **common)
        batch = row(content='다음을 계산하시오.\n⑴ $(+8)+(-5)$\n⑵ $(+9)+(-4)$', **common)
        self.assertEqual(rules_m1.FAMILIES[rules_m1.classify(single)]['category'], 'A')
        self.assertEqual(rules_m1.FAMILIES[rules_m1.classify(batch)]['category'], 'B')

    def test_three_fraction_product_is_not_the_three_integer_handler(self):
        r = row(section='유리수의 곱셈', content=r'다음을 계산하시오. $\frac{2}{3}\times\frac{5}{7}\times\frac{4}{9}$')
        self.assertEqual(rules_m1.FAMILIES[rules_m1.classify(r)]['category'], 'B')

    def test_integer_count_constraint_is_not_a_plain_inequality_solution(self):
        r = row(grade='중2',section='일차부등식의 풀이',content='일차부등식 $5x+2>2x+8$의 해를 구하시오.')
        self.assertEqual(rules_m2.FAMILIES[rules_m2.classify(r)]['category'], 'A')
        r['content']='일차부등식 $5x+2>2x+8$의 해 중 자연수를 구하시오.'
        self.assertEqual(rules_m2.FAMILIES[rules_m2.classify(r)]['category'], 'B')


if __name__ == '__main__':
    unittest.main()
