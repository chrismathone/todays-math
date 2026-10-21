"""Imported asset/projection contracts; python -B scripts/figure/test_scene_assets.py.

Rendering a projected right-angle symbol is NOT a mathematical perpendicularity proof.
These tests never approve a question, a grade, a source licence or an operational load.
"""
import copy
import json
import sys
import unittest
from unittest.mock import patch
import xml.etree.ElementTree as ET

from engine_path import ensure_on_path
ensure_on_path()
from render_spec import render_json
from core.figure_quality import sanitize_svg, SvgSecurityError
from core.figure_scene import render_figure_spec
from core.label_markup import parse_label
import scene_assets

SCENE=dict(version=2,points=dict(A=[0,0],B=[200,80],C=[340,-120]),
           segments=dict(AB=['A','B'],BC=['B','C'],AC=['A','C']),labels=dict(A='A',B='B',C='C'),background='transparent')

def render(spec):
    return render_json(json.dumps(spec))

class SceneAssetsTests(unittest.TestCase):
    def test_no_assets_retains_the_original_rendering_path(self):
        self.assertEqual(render(SCENE),dict(svg=sanitize_svg(render_figure_spec(SCENE))))

    def test_actual_asset_layer_precedes_mathematical_drawing(self):
        spec=dict(SCENE,assets=[dict(asset='house',at='A',anchor='base',width=44)])
        result=render(spec);self.assertIn('svg',result,result)
        root=ET.fromstring(result['svg'])
        self.assertEqual(root[0].attrib.get('data-asset'),'house')
        self.assertTrue(any(el.tag.endswith('line') for el in root.iter()))

    def test_null_assets_is_not_silently_removed(self):
        self.assertIn('error',render(dict(SCENE,assets=None)))

    def test_asset_only_scene_has_no_fixed_extent_to_shrink(self):
        result=render(dict(version=2,points={},assets=[dict(asset='house',at=[0,0],width=30)]))
        self.assertIn('svg',result,result)
        self.assertEqual([e.attrib['data-asset'] for e in ET.fromstring(result['svg']).iter() if 'data-asset' in e.attrib],['house'])

    def test_front_building_edge_not_its_centre_is_the_measured_segment(self):
        item=dict(asset='building-3d',**{'from':[80,200],'to':[80,30]})
        placed=scene_assets.plan_assets([item],lambda p:tuple(p),lambda n:n)[0]
        w,h,_=scene_assets.figure_assets._asset_body('building-3d')
        base=scene_assets.edge_anchor('building-3d','base',w,h)
        top=scene_assets.edge_anchor('building-3d','top',w,h)
        self.assertNotEqual(base,scene_assets.asset_anchor('building-3d','base',w,h))
        self.assertEqual(placed.anchor,base)
        self.assertAlmostEqual(placed.at[0]+(top[0]-base[0])*placed.scale,80)
        self.assertAlmostEqual(placed.at[1]+(top[1]-base[1])*placed.scale,30)

    def test_oversize_fixed_geometry_does_not_shrink_an_unrelated_at_picture(self):
        spec=dict(version=2,points=dict(A=[0,0],B=[700,0]),segments=dict(AB=['A','B']))
        with patch.object(scene_assets,'plan_assets',wraps=scene_assets.plan_assets) as plan:
            # The unchanged whole scene may be refused by the final frame gate.
            render(dict(spec,assets=[dict(asset='house',at='A',width=44)]))
        self.assertEqual(plan.call_count,1)

    def test_free_picture_can_shrink_while_fixed_geometry_stays_unchanged(self):
        spec=dict(version=2,points=dict(A=[0,0],B=[100,0]),segments=dict(AB=['A','B']))
        with patch.object(scene_assets,'plan_assets',wraps=scene_assets.plan_assets) as plan:
            result=render(dict(spec,assets=[dict(asset='house',at='A',width=900)]))
        self.assertIn('svg',result,result)
        self.assertGreater(plan.call_count,1)
        self.assertEqual(spec['points'],dict(A=[0,0],B=[100,0]))

    def test_invalid_asset_parameters_do_not_render_a_partial_figure(self):
        items=[[],False,'house',{},[dict(asset='house',at='A',width=0)],
               [dict(asset='house',at='A',width=True)],
               [dict(asset='house',at='A',width=float('nan'))],
               [dict(asset='house',at='A',width=44,unknown=True)],
               [dict(asset='house',at='A',width=44,flip='false')],
               [dict(asset='house',at='A',width=44,anchor='unknown')],
               [dict(asset='house',**{'from':'A','to':'B','at':'C'})],
               [dict(asset='../house',at='A',width=44)]]
        for value in items:
            with self.subTest(value=value):self.assertIn('error',render(dict(SCENE,assets=value)))

    def test_geometric_solids_cannot_be_used_as_picture_assets(self):
        for slug in ['can','dice','cup-cylinder','bowl','ferris-wheel','pizza']:
            with self.subTest(slug=slug):
                result=render(dict(SCENE,assets=[dict(asset=slug,at='A',width=44)]))
                self.assertIn('error',result,result)

    def test_oblique_right_mark_requires_explicit_boolean_projection(self):
        base=dict(vertex='B',points=['A','C'],right=True)
        for value in [None,False,0,1,'true']:
            with self.subTest(value=value):
                angle=dict(base)
                if value is not None:angle['perspective']=value
                self.assertIn('error',render(dict(SCENE,angles=dict(rightB=angle))))
        result=render(dict(SCENE,angles=dict(rightB=dict(base,perspective=True))))
        self.assertIn('svg',result,result)
        lone=dict(base,perspective=True);lone.pop('right')
        self.assertIn('error',render(dict(SCENE,angles=dict(rightB=lone))))

    def test_projection_does_not_make_collinear_rays_valid(self):
        spec=copy.deepcopy(SCENE);spec['points']['C']=[400,160]
        spec['angles']=dict(rightB=dict(vertex='B',points=['A','C'],right=True,perspective=True))
        self.assertIn('error',render(spec))

    def test_units_and_adjacent_algebra_letters_are_distinct(self):
        for label,unit in [('30 m','m'),('5 g','g'),('2 mL','m')]:
            with self.subTest(label=label):
                self.assertTrue(any(unit in p.text and not p.italic for p in parse_label(label)))
        self.assertTrue(any('m' in p.text and p.italic for p in parse_label('2m')))
        self.assertTrue(any('x' in p.text and p.italic for p in parse_label('5 x')))

    def test_asset_marker_does_not_bypass_svg_security(self):
        for body in ['<path d="M1 1L10 10" onload="alert(1)"/>',
                     '<image href="https://example.invalid/image"/>',
                     '<script>alert(1)</script>']:
            with self.subTest(body=body),self.assertRaises(SvgSecurityError):
                sanitize_svg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g data-asset="house">'+body+'</g></svg>')

if __name__=='__main__':unittest.main()
