"""Run: python -m unittest discover -s scripts/figure -p test_graph_native.py -v"""
import copy
import json
import math
import os
from pathlib import Path
import subprocess
import sys
import unittest
import xml.etree.ElementTree as ET

from engine_path import ensure_on_path, VENDOR_ENGINE_PATH
from graph_native import NativeCurve, band_boundaries, sample_interval, sample_screen

ensure_on_path()
from graph_scene import render_graph
from core.figure_quality import sanitize_svg


def exponential(**changes):
    return dict(type='exponential', base=2, domain=[-2, 3], **changes)


def scene(curves, **changes):
    return dict(version='graph-1', xRange=[-10, 10], yRange=[-10, 100], curves=curves, **changes)


def band_scene(decreasing=False):
    if decreasing:
        curves = [dict(type='exponential', base=0.25, amplitude=1/16, domain=[-4, 0]),
                  dict(type='exponential', base=0.25, domain=[-2, 1])]
        return dict(version='graph-1', xRange=[-4.5, 1.5], yRange=[-1, 17], curves=curves,
                    horizontalBands=[dict(leftCurve=0, rightCurve=1, yRange=[1, 4])])
    curves = [dict(type='exponential', base=2, xShift=-3, domain=[-4, 0.3]),
              dict(type='exponential', base=2, domain=[-1, 3.3])]
    return dict(version='graph-1', xRange=[-4.5, 4], yRange=[-1, 11], curves=curves,
                horizontalBands=[dict(leftCurve=0, rightCurve=1, yRange=[1, 8])])


class NativeSemantics(unittest.TestCase):
    def parse(self, spec):
        return NativeCurve.parse(spec, (-10, 10), (-10000, 10000))

    def test_known_values_and_transforms(self):
        cases = [
            (dict(type='exponential', base=2, amplitude=-3, xScale=-2, xShift=1, yShift=5, domain=[0, 2]), 0, -7),
            (dict(type='exponential', base=0.25, domain=[-2, 3]), -1, 4),
            (dict(type='logarithm', base=2, xScale=8, xShift=-2, domain=[-1.9, 4]), -1.5, 2),
            (dict(type='logarithm', base=0.5, amplitude=-2, xScale=-3, xShift=2, yShift=4, domain=[-2, 1.9]), 2-4/3, 8),
        ]
        for spec, x, expected in cases:
            with self.subTest(spec=spec):
                self.assertAlmostEqual(self.parse(spec).value(x), expected)

    def test_bad_base_and_numbers(self):
        for value in [True, False, None, '2', 0, -2, 1, math.inf, math.nan, 10001, 10**1000]:
            with self.subTest(base=repr(value)[:30]), self.assertRaises(ValueError):
                self.parse({**exponential(), 'base': value})
        for key in ['amplitude', 'xScale', 'xShift', 'yShift']:
            for value in [True, '1', None, math.inf, math.nan, 10001]:
                with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                    self.parse({**exponential(), key: value})
        for key in ['amplitude', 'xScale']:
            with self.assertRaises(ValueError):
                self.parse({**exponential(), key: 0})

    def test_bad_domains_no_clipping_or_bridging(self):
        for domain in [None, [0], [0, 1, 2], [1, 1], [2, -2], [-11, 0], [True, 1]]:
            with self.subTest(domain=domain), self.assertRaises(ValueError):
                self.parse({**exponential(), 'domain': domain})
        for domain in [[-1, 1], [0, 2], [-2, -1]]:
            with self.assertRaises(ValueError):
                self.parse(dict(type='logarithm', base=2, domain=domain))
        with self.assertRaises(ValueError):
            render_graph(scene([dict(type='exponential', base=2, domain=[-2, 8])]))
        # Reflected log has its valid domain on the LEFT of the asymptote.
        self.parse(dict(type='logarithm', base=2, xScale=-1, xShift=2, domain=[-2, 1.99]))

    def test_overflow_underflow_and_tiny_base(self):
        for changes in [dict(base=10000, xScale=10000), dict(base=1e-300, xScale=10000),
                        dict(amplitude=1e-320, xScale=500), dict(xScale=1e-320, base=1e-300)]:
            spec = {**exponential(), **changes}
            if changes.get('xScale') == 1e-320:
                # Tiny but finite slope is legal; no invented lower bound on base.
                self.assertTrue(math.isfinite(self.parse(spec).value(0)))
            else:
                with self.assertRaises(ValueError):
                    self.parse(spec)

    def test_strict_keys_and_types(self):
        for changes in [dict(expression='2**x'), dict(coefficients=[1]), dict(k=2),
                        dict(dashed=1), dict(type='exp'), dict(type='log')]:
            with self.assertRaises(ValueError):
                render_graph(scene([{**exponential(), **changes}]))
        for curve in [dict(coefficients=[1, 0], base=2), dict(type='inverse', k=2, xShift=1)]:
            with self.assertRaises(ValueError):
                render_graph(scene([curve]))
        with self.assertRaises(ValueError):
            render_graph({**scene([exponential()]), 'dimensions': {'a': 3}})

    def test_sampling_is_bounded_with_exact_endpoints(self):
        values = sample_interval(0.1, 2.3)
        self.assertEqual(len(values), 401)
        self.assertEqual((values[0], values[-1]), (0.1, 2.3))
        self.assertTrue(all(a < b for a, b in zip(values, values[1:])))

    def test_adaptive_sampling_budget_and_curvature(self):
        fn = lambda x: ((x * 100, math.log(x) * 50),)
        points = sample_screen(fn, 0.001, 10)
        self.assertLessEqual(len(points), 401)
        self.assertEqual(points[0], fn(0.001))
        self.assertEqual(points[-1], fn(10))
        with self.assertRaisesRegex(ValueError, 'budget'):
            sample_screen(fn, 0.001, 10, max_segments=2)
        with self.assertRaisesRegex(ValueError, 'resolution'):
            sample_screen(fn, 1, math.nextafter(1, 2))


class HorizontalBands(unittest.TestCase):
    def boundaries(self, spec):
        curves = [NativeCurve.parse(c, spec['xRange'], spec['yRange']) for c in spec['curves']]
        return band_boundaries(spec['horizontalBands'][0], curves, spec['yRange'])

    def test_two_audited_bands_semantics(self):
        for decreasing, width, area in [(False, 3, 21), (True, 2, 6)]:
            with self.subTest(decreasing=decreasing):
                left, right, heights, _ = self.boundaries(band_scene(decreasing))
                for y in sample_interval(*heights):
                    self.assertAlmostEqual(right.inverse(y) - left.inverse(y), width)
                    self.assertAlmostEqual(left.value(left.inverse(y)), y)
                    self.assertAlmostEqual(right.value(right.inverse(y)), y)
                self.assertEqual(width * (heights[1] - heights[0]), area)

    def test_bad_boundaries_and_height_ranges(self):
        for changes in [dict(leftCurve=-1), dict(rightCurve=2), dict(leftCurve=True), dict(leftCurve=0.0),
                        dict(leftCurve=1), dict(leftCurve=1, rightCurve=0), dict(yRange=[0, 8]),
                        dict(yRange=[1, 11]), dict(yRange=[8, 1]), dict(yRange=[1, 1]),
                        dict(fill='red'), dict(fill='none'), dict(unknown=1), dict(dashed=True)]:
            spec = band_scene()
            spec['horizontalBands'][0].update(changes)
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                render_graph(spec)
        spec = band_scene()
        spec['curves'][1]['domain'] = [0, 2]
        with self.assertRaises(ValueError):
            render_graph(spec)
        for replacement in [dict(coefficients=[1, 0]), dict(type='logarithm', base=2, domain=[1, 4])]:
            spec = band_scene()
            spec['curves'][1] = replacement
            with self.assertRaises(ValueError):
                render_graph(spec)

    def test_interior_crossing_even_when_endpoints_ordered(self):
        curves = [dict(type='exponential', base=math.e, yShift=1, domain=[-10, 5]),
                  dict(type='exponential', base=math.e, xScale=0.5, xShift=-1.5, domain=[-10, 5])]
        spec = dict(version='graph-1', xRange=[-10, 5], yRange=[0, 200], curves=curves,
                    horizontalBands=[dict(leftCurve=0, rightCurve=1, yRange=[1.1, 5])])
        parsed = [NativeCurve.parse(c, spec['xRange'], spec['yRange']) for c in curves]
        for y in [1.1, 5]:
            self.assertGreater(parsed[1].inverse(y), parsed[0].inverse(y))
        self.assertLess(parsed[1].inverse(2), parsed[0].inverse(2))
        with self.assertRaisesRegex(ValueError, 'cross'):
            render_graph(spec)


class ActualRender(unittest.TestCase):
    def test_sanitized_paths_preserve_every_sample_and_band(self):
        for spec in [band_scene(), band_scene(True), scene([dict(type='logarithm', base=2, domain=[0.125, 8])]),
                     scene([exponential(dashed=True)])]:
            with self.subTest(spec=spec):
                original = copy.deepcopy(spec)
                svg = render_graph(spec)
                self.assertEqual(svg, render_graph(spec))
                self.assertEqual(spec, original)
                safe = sanitize_svg(svg)
                root = ET.fromstring(safe)
                paths = root.findall('{http://www.w3.org/2000/svg}path')
                self.assertTrue(paths)
                self.assertTrue(all(len(p.attrib['d']) < 2048 for p in paths))
                strokes = [p for p in paths if p.attrib.get('fill') == 'none']
                segments = sum(p.attrib['d'].count(' L ') for p in strokes)
                self.assertGreater(segments, len(spec['curves']))
                self.assertLessEqual(segments, 400 * len(spec['curves']))
                if 'horizontalBands' in spec:
                    fills = [p for p in paths if p.attrib.get('fill') == '#eeeeee']
                    self.assertEqual(len(fills), 1)
                    self.assertTrue(all(p.attrib['d'].endswith(' Z') for p in fills))

    def test_real_render_cli_accepts_native_rejects_invalid(self):
        root = Path(__file__).resolve().parents[2]
        env = {**os.environ, 'FIGURE_ENGINE_PATH': VENDOR_ENGINE_PATH, 'PYTHONIOENCODING': 'utf-8'}
        for spec, succeeds in [(band_scene(), True), (band_scene(True), True),
                               (scene([dict(type='logarithm', base=2, domain=[0.125, 8])]), True),
                               (scene([dict(type='logarithm', base=2, domain=[-1, 1])]), False),
                               ({**scene([exponential()]), 'dimensions': {'a': 1}}, False)]:
            with self.subTest(succeeds=succeeds):
                process = subprocess.run([sys.executable, str(root/'scripts/figure/render_spec.py')],
                                         input=json.dumps(spec), capture_output=True, text=True,
                                         encoding='utf-8', env=env, timeout=15, check=True)
                result = json.loads(process.stdout)
                self.assertEqual('svg' in result, succeeds, result)
                if succeeds:
                    ET.fromstring(result['svg'])
                else:
                    self.assertIn('error', result)

    def test_polynomial_and_inverse_compatibility(self):
        svg = sanitize_svg(render_graph(scene([dict(coefficients=[1, 0, 0], domain=[-5, 5]),
                                               dict(type='inverse', k=2, domain=[-5, 5])], axes=False)))
        self.assertEqual(len(ET.fromstring(svg).findall('{http://www.w3.org/2000/svg}path')), 3)


if __name__ == '__main__':
    unittest.main()
