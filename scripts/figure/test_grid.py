"""Current graph-grid / sanitizer / label-escape boundaries, without network or DB."""
from pathlib import Path
import copy
import math
import sys
import unittest
import xml.etree.ElementTree as ET
from xml.sax.saxutils import escape as stdlib_escape

sys.path.insert(0, str(Path(__file__).resolve().parent))
from engine_path import engine_root
sys.path.insert(0, engine_root())
from graph_scene import render_graph
from core.figure_quality import sanitize_svg, SvgSecurityError
from core.label_markup import escape

BASE = dict(version='graph-1', xRange=[0,8], yRange=[0,5], axes=False,
            grid=dict(step=1), segments=[dict(**{'from':[1,1], 'to':[4,4]}, arrow=True)])

class GridTests(unittest.TestCase):
    def test_actual_grid_is_square_background_and_keeps_vector(self):
        for dx,dy,cols,rows in [(1,1,8,5),(2,3,4,3),(0.5,2,16,4),(1,1,60,60)]:
            with self.subTest(dx=dx,dy=dy,cols=cols,rows=rows):
                s=copy.deepcopy(BASE);s.update(xRange=[0,dx*cols], yRange=[0,dy*rows]);s['grid']['step']=[dx,dy]
                root=ET.fromstring(sanitize_svg(render_graph(s)));g=root[0]
                self.assertTrue(g.tag.endswith('g'));v=list(map(float,g.attrib['data-grid'].split()))
                self.assertEqual(v[4:],[cols,rows]);self.assertAlmostEqual(v[2],v[3],places=3)
                self.assertEqual(len(g),1);self.assertEqual(g[0].attrib['d'].count('M'),cols+rows+2)
                lines=[e for e in root if e.tag.endswith('line')]
                self.assertEqual(len(lines),1)
                width=float(root.attrib['viewBox'].split()[2]);height=float(root.attrib['viewBox'].split()[3])
                self.assertGreater(width,96);self.assertGreater(height,96)
                self.assertEqual(len([e for e in root if e.tag.endswith('polygon')]),1) # arrowhead

    def test_bad_grid_plans_fail(self):
        for grid in [None,[],{'step':0},{'step':True},{'step':-1},{'step':math.inf},{'step':math.nan},
                     {'step':[1,0]},{'step':[1,1,1]},{'from':[1,0],'to':[0,5]},
                     {'step':3},{'color':'url(http://invalid)'},{'dashed':'yes'},{'unknown':1}]:
            with self.subTest(grid=grid),self.assertRaises((ValueError,TypeError,OverflowError)):
                s=copy.deepcopy(BASE);s['grid']=grid;render_graph(s)
        with self.assertRaises(ValueError):
            render_graph({**BASE,'xRange':[0,61]})

    def test_grid_metadata_rejects_bad_numbers_and_placement(self):
        def svg(value,extra='',outer='',tail=''):
            g=f'<g data-grid="{value}" {extra}><path d="M0 0V10"/></g>'
            return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">{outer}{g}{tail}</svg>'
        for value in ['0 0 0 10 2 2','0 0 10 10 0 2','0 0 10 10 61 2','0 0 10 10 999 2',
                      '0 0 10 11 2 2','0 0 NaN 10 2 2','0 0 10 10 1.5 2','0 0 10 10 -1 2']:
            with self.subTest(value=value),self.assertRaises(SvgSecurityError):sanitize_svg(svg(value))
        for source in [svg('0 0 10 10 2 2',extra='transform="translate(1 1)"'),
                       svg('0 0 10 10 2 2',outer='<line x1="0" y1="0" x2="5" y2="5"/>'),
                       svg('0 0 10 10 2 2',outer='<g>',tail='</g>'),
                       svg('0 0 10 10 2 2',tail='<g data-grid="0 0 10 10 2 2"><path d="M0 0V10"/></g>')]:
            with self.subTest(source=source),self.assertRaises(SvgSecurityError):sanitize_svg(source)

    def test_escape_matches_stdlib_with_custom_entities(self):
        for value in ['', 'A<&B>', '"A"', "A'B", '점 A & 길이 < 3', '&amp;<tag>', 'x\n>y', '①≤②']:
            for entities in [None,{}, {'"':'&quot;'},{"'":'&apos;'}, {'A':'<A>','&':'!'}]:
                with self.subTest(value=value,entities=entities):
                    self.assertEqual(escape(value,entities),stdlib_escape(value,entities))

if __name__=='__main__':unittest.main()
