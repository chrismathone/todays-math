"""Read serialized SVG coordinates; never use image pixels as a math oracle."""
import copy
import json
import re
from pathlib import Path
import unittest
import xml.etree.ElementTree as ET

from elementary import render_elementary

NS = {'s': 'http://www.w3.org/2000/svg'}
ROOT = Path(__file__).resolve().parents[2]


def spec(**changes):
    value = dict(version='elem-1', kind='scatterPlot', gridStep=5,
                 xMin=20, xMax=100, xStep=10, yMin=20, yMax=100, yStep=10,
                 xLabel='수학(점)', yLabel='과학(점)',
                 points=[[40, 45], [55, 70], [90, 95]])
    return {**value, **changes}


class ScatterGridTests(unittest.TestCase):
    def test_all_nine_native_defaults_preserve_exact_bytes(self):
        fixture = json.loads((ROOT/'src/__tests__/fixtures/m3Scatter-native-default-20261022.json').read_text(encoding='utf-8'))
        self.assertEqual(len(fixture['rows']), 9)
        for row in fixture['rows']:
            with self.subTest(key=row['key']):
                self.assertEqual(render_elementary(row['spec']), row['svg'])

    def test_grid_is_one_background_group_before_points_and_axes(self):
        xml = ET.fromstring(render_elementary(spec()))
        groups = [g for g in xml.findall('s:g', NS) if 'data-grid' in g.attrib]
        self.assertEqual(len(groups), 1)
        self.assertEqual(list(xml)[0], groups[0])
        paths = groups[0].findall('s:path', NS)
        self.assertEqual(len(paths), 1)
        self.assertEqual(len(re.findall(r'M',paths[0].attrib['d'])),34)
        self.assertEqual(len(xml.findall('s:circle', NS)), 3)

    def test_serialized_cells_are_square_and_values_read_back_exactly(self):
        for xmin, xmax, ymin, ymax in [(20,100,20,100), (30,100,20,100), (-20,60,-30,50)]:
            points = [[xmin+5,ymin+10],[xmax-5,ymax-5]]
            # 음수 세 자리 눈금은 20 간격으로 주어 글자가 겹치지 않게 한다.
            major = 20 if xmin < 0 or ymin < 0 else 10
            value = spec(xMin=xmin,xMax=xmax,yMin=ymin,yMax=ymax,xStep=major,yStep=major,points=points)
            xml = ET.fromstring(render_elementary(value))
            group = next(g for g in xml.findall('s:g',NS) if 'data-grid' in g.attrib)
            path = group.find('s:path',NS).attrib['d']
            segments = re.findall(r'M([-\d.]+) ([-\d.]+)([VH])([-\d.]+)',path)
            self.assertEqual(len(segments),int((xmax-xmin)/5+1+(ymax-ymin)/5+1))
            xs = sorted({float(x)for x,y,kind,end in segments if kind=='V'})
            ys = sorted({float(y)for x,y,kind,end in segments if kind=='H'})
            dx,dy=xs[1]-xs[0],ys[1]-ys[0]
            self.assertAlmostEqual(dx,dy,places=9)
            for a,b in zip(xs,xs[1:]):self.assertAlmostEqual(b-a,dx,places=9)
            for a,b in zip(ys,ys[1:]):self.assertAlmostEqual(b-a,dy,places=9)
            for circle,(x,y) in zip(xml.findall('s:circle',NS),points):
                self.assertAlmostEqual(xmin+5*(float(circle.attrib['cx'])-xs[0])/dx,x,places=8)
                self.assertAlmostEqual(ymin+5*(ys[-1]-float(circle.attrib['cy']))/dy,y,places=8)

    def test_only_major_ticks_get_numbers_and_subject_labels_survive(self):
        xml=ET.fromstring(render_elementary(spec()))
        texts=[t.text for t in xml.findall('s:text',NS)]
        for n in range(20,101,10):self.assertEqual(texts.count(str(n)),2)
        for n in range(25,100,10):self.assertNotIn(str(n),texts)
        self.assertIn('수학(점)',texts);self.assertIn('과학(점)',texts)

    def test_positive_integer_grid_and_axis_contract_rejects_coercion(self):
        for field in ['gridStep','xMin','xMax','xStep','yMin','yMax','yStep']:
            for bad in [True,False,None,'5',float('nan'),float('inf'),-float('inf'),2.5,10**500]:
                with self.subTest(field=field,bad=bad),self.assertRaises(ValueError):render_elementary(spec(**{field:bad}))
        for bad in [0,-5]:
            with self.assertRaises(ValueError):render_elementary(spec(gridStep=bad))

    def test_no_silent_rounding_of_major_or_minor_intervals(self):
        for change in [dict(gridStep=3),dict(xStep=15),dict(xMax=105),dict(yMax=105),dict(xStep=4),dict(yStep=4)]:
            with self.subTest(change=change),self.assertRaises(ValueError):render_elementary(spec(**change))

    def test_off_grid_nonfinite_duplicate_and_outside_points_are_rejected(self):
        for points in [[[41,45],[55,70]],[[40.5,45],[55,70]],[[40,45],[40,45]],
                       [[True,45],[55,70]],[[float('nan'),45],[55,70]],[[105,45],[55,70]]]:
            with self.subTest(points=points),self.assertRaises(ValueError):render_elementary(spec(points=points))

    def test_dense_grid_and_tall_aspect_do_not_shrink_or_change_data(self):
        for change in [dict(gridStep=1),dict(yMax=420),dict(xMax=40,points=[[25,40],[30,60]])]:
            with self.subTest(change=change),self.assertRaises(ValueError):render_elementary(spec(**change))

    def test_tick_or_subject_label_collision_is_not_silently_accepted(self):
        with self.assertRaises(ValueError):render_elementary(spec(xMin=99920,xMax=100000,points=[[99940,45],[99955,70]]))
        with self.assertRaises(ValueError):render_elementary(spec(xLabel='너무 긴 축 이름'*20))
        with self.assertRaises(ValueError):render_elementary(spec(xMin=-20,xMax=60,yMin=-30,yMax=50,points=[[-15,-20],[55,45]]))

    def test_points_on_axis_limits_remain_visible(self):
        xml=ET.fromstring(render_elementary(spec(points=[[20,20],[100,100]])))
        x0,y0,w,h=map(float,xml.attrib['viewBox'].split())
        for circle in xml.findall('s:circle',NS):
            x,y,r=(float(circle.attrib[k])for k in ['cx','cy','r'])
            self.assertGreaterEqual(x-r,x0);self.assertLessEqual(x+r,x0+w)
            self.assertGreaterEqual(y-r,y0);self.assertLessEqual(y+r,y0+h)

    def test_title_and_inputs_are_preserved_without_mutation(self):
        value=spec(title='두 과목의 점수');before=copy.deepcopy(value)
        xml=ET.fromstring(render_elementary(value))
        self.assertIn('두 과목의 점수',[t.text for t in xml.findall('s:text',NS)])
        self.assertEqual(value,before)


if __name__=='__main__':unittest.main()
