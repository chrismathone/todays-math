"""Vendored engine-only regression: python -B scripts/figure/test_vendor_tools.py.

No API, database, source corpus, or external checkout is needed. Pixel lint uses
locally installed resvg-py/numpy/Pillow. Output stays in temporary directories.
"""
from __future__ import annotations

import copy
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

from engine_path import engine_root

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, engine_root())

from core import figure_exam as fe  # noqa: E402
from core.figure_quality import assess_svg, sanitize_svg, SvgSecurityError  # noqa: E402
from core.figure_scene import compile_figure_spec  # noqa: E402
from core.figure_spec_repair import (  # noqa: E402
    compile_with_repair, SpecRepairFailed, semantic_inventory_issue, inventory_key,
)
from core.figure_svg import line, lint_svg, svg_to_png_bytes, unverified, verify_figure  # noqa: E402


def triangle(**sections):
    spec = dict(version=2, points=dict(A=[0, 0], B=[160, 0], C=[80, 120]),
                segments=dict(AB=['A', 'B'], BC=['B', 'C'], CA=['C', 'A']),
                labels=dict(A='A', B='B', C='C'))
    spec.update(sections)
    return spec


class RasterAndGateTests(unittest.TestCase):
    def test_actual_lint_works_without_generator_or_configuration(self):
        svg = fe.raw_svg(120, 60, line((10, 30), (110, 30), w=1.9))
        self.assertEqual(lint_svg(svg), [])
        self.assertTrue(svg_to_png_bytes(svg, 180).startswith(b'\x89PNG'))
        self.assertFalse(any(n.startswith(('core.figure_generator', 'utils')) for n in sys.modules))

    def test_missing_rasterizer_is_not_a_clean_lint_result(self):
        svg = fe.raw_svg(120, 60, line((10, 30), (110, 30)))
        with patch.dict(sys.modules, {'resvg_py': None}):
            self.assertIsNone(svg_to_png_bytes(svg, 100))
            with self.assertRaisesRegex(RuntimeError, 'resvg'):
                lint_svg(svg)

    def test_invalid_svg_does_not_produce_png(self):
        self.assertIsNone(svg_to_png_bytes('<broken', 100))

    def test_raster_comment_cleanup(self):
        svg = fe.raw_svg(120, 60, line((10, 30), (110, 30)))
        self.assertEqual(svg_to_png_bytes(svg, 120),
                         svg_to_png_bytes(svg.replace('<svg ', '<!-- a -- b --><svg '), 120))

    def test_full_background_rects_are_allowed(self):
        for fill in ['none', 'transparent', 'white', '#fff', '#ffffff']:
            with self.subTest(fill=fill):
                svg = fe.raw_svg(120, 60, f'<rect width="120" height="60" fill="{fill}"/>',
                                 line((10, 30), (110, 30)))
                self.assertIn('<rect', sanitize_svg(svg))
                self.assertTrue(assess_svg(svg, run_pixel_lint=False).accepted)

    def test_partial_invisible_rects_still_fail(self):
        for fill in ['none', 'transparent']:
            with self.subTest(fill=fill):
                svg = fe.raw_svg(120, 60, f'<rect x="10" y="10" width="30" height="20" fill="{fill}"/>',
                                 line((10, 40), (110, 40)))
                result = assess_svg(svg, run_pixel_lint=False)
                self.assertFalse(result.accepted)
                self.assertTrue(result.issues)

    def test_scripts_and_external_urls_still_fail(self):
        for body in ['<script>alert(1)</script>', '<image href="https://example.org/x.png"/>']:
            with self.subTest(body=body), self.assertRaises(SvgSecurityError):
                fe.raw_svg(120, 60, body)

    def test_modules_import_without_site_packages(self):
        script = (f'import sys; sys.path.insert(0, {str(ROOT / "vendor/figure-engine")!r}); '
                  'import core.figure_svg, core.figure_exam, core.figure_spec_repair')
        result = subprocess.run([sys.executable, '-B', '-I', '-S', '-c', script],
                                capture_output=True, text=True, timeout=20)
        self.assertEqual(result.returncode, 0, result.stderr)


class RepairCandidateTests(unittest.TestCase):
    def test_position_decoration_matches_clean_svg_without_mutation(self):
        spec = triangle(labels=dict(A=dict(text='A', pos='above'), B='B', C='C'))
        before = copy.deepcopy(spec)
        _, svg, repairs = compile_with_repair(spec)
        self.assertEqual(svg, compile_figure_spec(triangle(labels=dict(A=dict(text='A'), B='B', C='C'))).render_svg())
        self.assertTrue(repairs)
        self.assertEqual(spec, before)

    def test_mixed_unknown_semantic_fields_cannot_be_silently_removed(self):
        spec = triangle(labels=dict(A=dict(text='A', pos='above', value='3'), B='B', C='C'))
        with self.assertRaises(SpecRepairFailed):
            compile_with_repair(spec)

    def test_invalid_or_conflicting_angle_ticks_are_not_erased(self):
        for fields in [dict(ticks=0), dict(ticks=3), dict(ticks=4), dict(ticks=True), dict(ticks=2, arcs=1)]:
            spec = triangle(angles=dict(a=dict(vertex='A', points=['B', 'C'], **fields)))
            before = copy.deepcopy(spec)
            with self.subTest(fields=fields), self.assertRaises(SpecRepairFailed):
                compile_with_repair(spec)
            self.assertEqual(spec, before)
        for n in [1, 2]:
            spec = triangle(angles=dict(a=dict(vertex='A', points=['B', 'C'], ticks=n, arcs=n)))
            scene, _, _ = compile_with_repair(spec)
            self.assertEqual(scene.angles['a'].arcs, n)

    def test_dimension_value_and_known_marks_are_preserved(self):
        base = dict(points=['A', 'B'], label='8 cm')
        spec = triangle(dimensions=dict(dAB=dict(**base, dashed=True, style='curve')),
                        segments=dict(AB=dict(points=['A', 'B'], ticks=2), BC=['B', 'C'], CA=['C', 'A']))
        scene, _, _ = compile_with_repair(spec)
        self.assertEqual(scene.dimensions['dAB'].label, '8 cm')
        self.assertEqual(scene.segments['AB'].ticks, 2)

    def test_impossible_dimension_is_not_deleted_to_make_compilation_pass(self):
        spec = triangle(dimensions=dict(missing=dict(points=['A', 'D'], label='8')))
        with self.assertRaises(SpecRepairFailed):
            compile_with_repair(spec)

    def test_zero_repair_budget_preserves_strict_failure(self):
        with self.assertRaises(SpecRepairFailed):
            compile_with_repair(triangle(labels=dict(A=dict(text='A', pos='above'))), limit=0)

    def test_geometry_snapping_is_off_by_default_and_does_not_mutate_input(self):
        spec = triangle(points=dict(A=[0, 0], B=[200, 0], C=[100, 120], D=[100, .5]),
                        segments=dict(AB=['A', 'B'], BC=['B', 'C'], CA=['C', 'A'], CD=['C', 'D']),
                        labels=dict(A='A', B='B', C='C', D='D'),
                        angles=dict(right=dict(vertex='D', points=['B', 'C'], right=True)))
        before = copy.deepcopy(spec)
        with self.assertRaises(SpecRepairFailed):
            compile_with_repair(spec)
        self.assertEqual(spec, before)
        _, _, repairs = compile_with_repair(spec, allow_geometry_snap=True)
        self.assertTrue(any(note.startswith('snap:') for note in repairs))
        self.assertEqual(spec, before)

    def test_large_geometry_changes_cannot_be_forced(self):
        spec = triangle(points=dict(A=[0, 0], B=[200, 0], C=[100, 120], D=[100, 8]),
                        segments=dict(AB=['A', 'B'], BC=['B', 'C'], CA=['C', 'A'], CD=['C', 'D']),
                        angles=dict(right=dict(vertex='D', points=['B', 'C'], right=True)))
        with self.assertRaises(SpecRepairFailed):
            compile_with_repair(spec, allow_geometry_snap=True)

    def test_inventory_is_a_text_check_and_does_not_invent_transcription(self):
        scene = compile_figure_spec(triangle())
        self.assertIsNone(semantic_inventory_issue(scene, '삼각형 A B C'))
        self.assertIn('D', semantic_inventory_issue(scene, '삼각형 A B C 와 점 D'))
        self.assertIsNone(semantic_inventory_issue(scene, ''))  # no evidence, not approval
        self.assertEqual(inventory_key(r'\sqrt{11} 35 degrees'), inventory_key('√11 35°'))

    def test_product_renderer_keeps_strict_protocol(self):
        renderer = ROOT / 'scripts/figure/render_spec.py'
        for spec, success in [(triangle(), True), (triangle(labels=dict(A=dict(text='A', pos='above'))), False)]:
            result = subprocess.run([sys.executable, '-B', str(renderer)], input=json.dumps(spec),
                                    capture_output=True, text=True, encoding='utf-8', timeout=30)
            self.assertEqual(result.returncode, 0)
            payload = json.loads(result.stdout)
            self.assertEqual('svg' in payload, success, payload)
            self.assertEqual('error' in payload, not success, payload)


class AuthoringBuildTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.out = Path(self.temp.name) / 'figures'

    def tearDown(self):
        self.temp.cleanup()

    def figure(self, key):
        verify_figure(key, lengths=[(5, (10, 40), (110, 40))])
        return fe.raw_svg(120, 70, line((10, 40), (110, 40)))

    def test_actual_png_build_has_current_svg_hash(self):
        svg = self.figure('good')
        report = fe.build_figures({'good': svg}, str(self.out), scope=__file__)
        self.assertTrue(Path(report['good']['png']).read_bytes().startswith(b'\x89PNG'))
        self.assertEqual(report['good']['svg_sha256'], hashlib.sha256(svg.encode()).hexdigest())
        self.assertEqual(report['good']['issues'], [])

    def test_bare_numeric_or_non_numeric_labels_cannot_skip_verification(self):
        for label in ['5', '5 cm', 'x', 'A']:
            with self.subTest(label=label), self.assertRaisesRegex(ValueError, '검산 누락'):
                fe.build_figures({'not-verified': fe.raw_svg(120, 70, fe.ltext(60, 20, label))},
                                 str(self.out), scope=__file__)
        self.assertFalse(self.out.exists())

    def test_empty_verification_and_wrong_scope_do_not_pass(self):
        verify_figure('empty')
        svg = self.figure('scoped')
        self.assertEqual(unverified({'empty': svg}, scope=__file__, require_checks=True), ['empty'])
        self.assertEqual(unverified({'scoped': svg}, scope='different-author', require_checks=True), ['scoped'])

    def test_lint_failure_leaves_no_png_even_for_an_earlier_good_figure(self):
        good = self.figure('earlier')
        self.figure('clipped')
        clipped = fe.raw_svg(120, 70, line((10, 40), (150, 40)))
        with self.assertRaisesRegex(ValueError, 'lint'):
            fe.build_figures(dict(earlier=good, clipped=clipped), str(self.out), scope=__file__)
        self.assertFalse(self.out.exists())

    def test_later_raster_failure_leaves_no_earlier_png(self):
        svg = self.figure('raster-a')
        self.figure('raster-b')
        with patch.object(fe, 'lint_svg', return_value=[]), patch.object(fe, 'svg_to_png_bytes', side_effect=[b'png', None]):
            with self.assertRaises(RuntimeError):
                fe.build_figures({'raster-a': svg, 'raster-b': svg}, str(self.out), scope=__file__)
        self.assertFalse(self.out.exists())

    def test_output_keys_cannot_escape_or_alias_windows_paths(self):
        for key in ['../out', '..\\out', 'C:out', '.', '..', 'NUL', 'CON.png', 'file.', 'file ', 'a/b']:
            with self.subTest(key=key), self.assertRaisesRegex(ValueError, 'key'):
                fe.build_figures({key: '<svg/>'}, str(self.out), scope=__file__)
        self.assertFalse(self.out.exists())

    def test_case_aliases_and_missing_selections_are_rejected_before_writing(self):
        for figures, only in [({'Alias': '<svg/>', 'alias': '<svg/>'}, []), ({'ok': '<svg/>'}, ['typo'])]:
            with self.subTest(figures=figures), self.assertRaises(ValueError):
                fe.build_figures(figures, str(self.out), scope=__file__, only=only)
        self.assertFalse(self.out.exists())

    def test_malformed_verification_never_registers_success(self):
        cases = [dict(angles=[(float('nan'), (0, 0), (1, 0), (0, 1))]),
                 dict(on_circle=[((1, 0), 0, 0, float('nan'))]),
                 dict(lengths=[(-1, (0, 0), (1, 0)), (1, (0, 0), (1, 0))]),
                 dict(lengths=[(0, (0, 0), (1, 0))]),
                 dict(lengths=[(float('inf'), (0, 0), (1, 0))]),
                 dict(lengths=[(1, (0, 0), (float('nan'), 0))]),
                 dict(lengths=[(1, (0, 0), (0, 0))]),
                 dict(arcs=[(1, 0, 0, -1, 0, 90)]),
                 dict(arcs=[(1, 0, 0, 1, 0, 0)]),
                 dict(angles=[(90, (0, 0), (0, 0), (0, 1))]),
                 dict(on_line=[((float('nan'), 0), (0, 0), (1, 0))]),
                 dict(tangents=[((0, 0), (1, 0), 0, 1, -1)]),
                 dict(tol=float('nan')), dict(tol_deg=-1), dict(tol_px=float('inf'))]
        for i, kwargs in enumerate(cases):
            key = 'invalid-' + str(i)
            with self.subTest(kwargs=kwargs), self.assertRaises(ValueError):
                verify_figure(key, **kwargs)
            self.assertEqual(unverified({key: '<svg/>'}, scope=__file__, require_checks=True), [key])

    def test_failed_retry_invalidates_an_earlier_verification(self):
        key = 'failed-retry'
        self.figure(key)
        self.assertEqual(unverified({key: '<svg/>'}, scope=__file__, require_checks=True), [])
        with self.assertRaises(ValueError):
            verify_figure(key, angles=[(float('nan'), (0, 0), (1, 0), (0, 1))])
        self.assertEqual(unverified({key: '<svg/>'}, scope=__file__, require_checks=True), [key])

    def test_only_builds_selected_current_verified_figures(self):
        svg = self.figure('selected')
        report = fe.build_figures({'selected': svg, 'other': '<svg/>'}, str(self.out), scope=__file__, only=['selected'])
        self.assertEqual(set(report), {'selected'})

    def test_authoring_width_profile_and_isotropic_geometry(self):
        self.assertEqual(fe.width_mm(fe.raw_svg(300, 100)), 51)
        self.assertEqual(fe.width_mm(fe.raw_svg(600, 100)), 68)
        to = fe.frame(0, 0, 10)
        self.assertEqual(fe.dist(to(0, 0), to(1, 0)), fe.dist(to(0, 0), to(0, 1)))
        a = fe.sss(13, 15, 14)
        self.assertAlmostEqual(fe.dist(a, (0, 0)), 13)
        self.assertAlmostEqual(fe.dist(a, (14, 0)), 15)
        self.assertAlmostEqual(fe.dist(a, fe.foot(a, (0, 0), (14, 0))), 12)


if __name__ == '__main__':
    unittest.main(verbosity=2)
