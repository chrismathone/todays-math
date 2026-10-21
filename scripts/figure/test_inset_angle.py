"""Opt-in generated angle mark serialization; no grade/rights/ink approval."""
import copy
import json
import math
import re
import unittest

from engine_path import ensure_on_path
ensure_on_path()
from core.figure_scene import compile_figure_spec, GeometryValidationError
from core.figure_svg import inset_angle_arc, inset_angle_interval
from render_spec import render_json

SCENE=dict(version=2,points=dict(A=[0,0],B=[100,0],C=[40,100]),
           segments=dict(AB=['A','B'],AC=['A','C']),
           angles=dict(mark=dict(vertex='A',points=['B','C'],radius=18,serialized_inset=True)))

class InsetAngleTests(unittest.TestCase):
    def test_boolean_opt_in_rejects_incompatible_right_and_projection(self):
        for value in [None,0,1,'true',[],{}]:
            spec=copy.deepcopy(SCENE);spec['angles']['mark']['serialized_inset']=value
            with self.subTest(value=value):self.assertIn('error',render_json(json.dumps(spec)))
        for flags in [dict(right=True),dict(right=True,perspective=True),dict(perspective=True)]:
            spec=copy.deepcopy(SCENE);spec['angles']['mark'].update(flags)
            with self.subTest(flags=flags):self.assertIn('error',render_json(json.dumps(spec)))

    def test_nonfinite_degenerate_and_trim_consumed_intervals_refuse(self):
        for p1,p2 in [([0,0],[0,1]),([1,0],[1,0]),([1,0],[-1,0]),([1,0],[1,1e-4]),([float('inf'),0],[0,1])]:
            with self.subTest(p1=p1,p2=p2),self.assertRaises(ValueError):inset_angle_interval(0,0,p1,p2)

    def test_tiny_or_nonfinite_serialized_radius_is_not_a_successful_empty_mark(self):
        for radius in [0,-1,float('inf'),float('nan'),1e-8]:
            with self.subTest(radius=radius),self.assertRaises(ValueError):inset_angle_arc(0,0,(100,0),(0,100),radius)
        spec=copy.deepcopy(SCENE);spec['angles']['mark']['radius']=1e-8
        self.assertIn('error',render_json(json.dumps(spec)))

    def test_sampling_is_on_the_same_unrounded_circle_and_shortened_wedge(self):
        scene=compile_figure_spec(SCENE)
        samples=scene._angle_mark_polylines(scene.angles['mark'])[0]
        self.assertEqual(len(samples),17)
        for point in samples:
            self.assertAlmostEqual(math.hypot(point.x,point.y),18,places=10)
            self.assertGreater(point.y,0)
            self.assertGreater(100*point.x-40*point.y,0)
        first,last=samples[0],samples[-1]
        self.assertAlmostEqual(math.atan2(first.y,first.x),1e-3,places=12)
        self.assertAlmostEqual(math.atan2(100,40)-math.atan2(last.y,last.x),1e-3,places=12)

    def test_translation_does_not_change_the_shared_angular_interval(self):
        path=inset_angle_arc(0,0,(100,0),(40,100),18,offset=(13.125,-22.75))
        values=list(map(float,re.findall(r'[-+]?(?:\d*\.\d+|\d+)(?:e[-+]?\d+)?',path,re.I)))
        self.assertAlmostEqual(values[0]-13.125,18*math.cos(1e-3),places=5)
        self.assertAlmostEqual(values[1]+22.75,18*math.sin(1e-3),places=5)
        self.assertRegex(path,r'^M -?\d+\.\d{6} -?\d+\.\d{6} A ')

    def test_direct_scene_contract_is_strict_too(self):
        scene=compile_figure_spec(dict(version=2,points=dict(A=[0,0],B=[100,0],C=[0,100])))
        with self.assertRaises(GeometryValidationError):scene.add_angle('bad','A','B','C',serialized_inset='true')

if __name__=='__main__':unittest.main()
