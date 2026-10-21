"""Fail-closed solid verification: python -B scripts/figure/test_solid_verification.py.

These are internal geometry checks, not new student methods or grade approval.
No rasterizer, API, database, or external checkout is required.
"""
from __future__ import annotations

import sys
import unittest

from engine_path import engine_root

sys.path.insert(0, engine_root())
from core.figure_solid import Plane, verify_solid  # noqa: E402
from core.figure_svg import _VERIFIED  # noqa: E402

O, X, Y, Z = (0, 0, 0), (1, 0, 0), (0, 1, 0), (0, 0, 1)
XY, YZ = Plane(O, Z), Plane(O, X)
RECT = [O, (3, 0, 0), (3, 2, 0), (0, 2, 0)]


def valid_conditions():
    return dict(feet=[((1, 2, 0), (1, 2, 3), XY)],
                angles=[(90, 'dihedral', XY, YZ), (0, 'line', O, X, XY)],
                areas=[(6, RECT, XY)], lengths=[(3, O, (3, 0, 0)), (4, O, (0, 4, 0))],
                equations=[((0, 0, 2, 0), XY)], perpendicular=[((O, X), (O, Y))], on_plane=[(O, XY)])


class SolidVerificationTests(unittest.TestCase):
    def test_all_seven_positive_condition_groups_and_scaled_equation(self):
        for mode in ['list', 'generator']:
            values = valid_conditions()
            if mode == 'generator':
                values = {key: iter(rows) for key, rows in values.items()}
            key = 'positive-' + mode
            verify_solid(key, **values)
            self.assertEqual(_VERIFIED.get((__file__, key)), 9)

    def test_zero_projected_area_is_a_valid_boundary(self):
        verify_solid('edge-on-area', areas=[(0, RECT, YZ)])
        self.assertEqual(_VERIFIED.get((__file__, 'edge-on-area')), 1)

    def test_nan_infinity_negative_and_degenerate_inputs_do_not_register(self):
        invalid = [dict(angles=[(float('nan'), 'dihedral', XY, YZ)]),
                   dict(angles=[(-1, 'dihedral', XY, XY)]),
                   dict(areas=[(float('inf'), RECT, XY)]),
                   dict(areas=[(-1, RECT, XY)]),
                   dict(lengths=[(-1, O, X), (1, O, X)]),
                   dict(lengths=[(0, O, X), (1, O, X)]),
                   dict(lengths=[(float('nan'), O, X), (1, O, X)]),
                   dict(lengths=[(1, O, O)]),
                   dict(equations=[((0, 0, 0, 1), XY)]),
                   dict(on_plane=[(O, Plane(O, O))]),
                   dict(tol=float('nan')), dict(tol_abs=float('inf')), dict(tol_deg=-1)]
        for i, kwargs in enumerate(invalid):
            key = 'invalid-solid-' + str(i)
            with self.subTest(kwargs=kwargs), self.assertRaises(ValueError):
                verify_solid(key, **kwargs)
            self.assertNotIn((__file__, key), _VERIFIED)

    def test_nonunit_plane_is_rejected_without_silent_normalization(self):
        for normal in [(0, 0, 2), (0, 0, 0), (0, 0, float('nan'))]:
            with self.subTest(normal=normal), self.assertRaises(ValueError):
                verify_solid('invalid-normal', on_plane=[(O, Plane(O, normal))])
        self.assertNotIn((__file__, 'invalid-normal'), _VERIFIED)

    def test_list_and_generator_preserve_all_negative_conditions(self):
        invalid = dict(feet=[(Z, (0, 0, 2), XY)], angles=[(45, 'dihedral', XY, YZ)],
                       areas=[(7, RECT, XY)], lengths=[(1, O, X), (1, O, (2, 0, 0))],
                       equations=[((0, 0, 1, -1), XY)], perpendicular=[((O, X), (O, X))],
                       on_plane=[(Z, XY)])
        for group, rows in invalid.items():
            for mode in ['list', 'generator']:
                key = group + '-' + mode
                other = dict(lengths=[(1, O, X)]) if group == 'on_plane' else dict(on_plane=[(O, XY)])
                values = list(rows) if mode == 'list' else iter(rows)
                with self.subTest(group=group, mode=mode), self.assertRaises(ValueError):
                    verify_solid(key, **{**other, group: values})
                self.assertNotIn((__file__, key), _VERIFIED)

    def test_failing_retry_or_failing_iterable_clears_previous_success(self):
        key = 'solid-retry'
        verify_solid(key, on_plane=[(O, XY)])
        with self.assertRaises(ValueError):
            verify_solid(key, angles=[(float('nan'), 'dihedral', XY, YZ)])
        self.assertNotIn((__file__, key), _VERIFIED)

        def broken():
            yield (1, O, X)
            raise RuntimeError('broken condition producer')

        verify_solid(key, on_plane=[(O, XY)])
        with self.assertRaisesRegex(RuntimeError, 'broken condition producer'):
            verify_solid(key, lengths=broken())
        self.assertNotIn((__file__, key), _VERIFIED)


if __name__ == '__main__':
    unittest.main(verbosity=2)
