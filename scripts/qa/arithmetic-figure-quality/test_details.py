"""Exact local similarity, cropped-ray honesty, labels and metadata ownership."""
import sys,json,math,unittest,xml.etree.ElementTree as ET
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
import engine
ROWS=json.load(open('/tmp/arithmetic-figure-quality/trig-models.json'))
BYID={r['id']:r for r in ROWS}
class DetailTests(unittest.TestCase):
 def test_every_adaptive_detail_preserves_public_geometry(self):
  checked=0
  for row in ROWS:
   plan=engine.triangle_detail_plan(row)
   if not plan:continue
   _,d,pair,zoom=plan;p=row['plan']['model']['points'];q=d['plan']['model']['points'];far=next(k for k in p if k not in pair)
   for j in (0,1):self.assertAlmostEqual(q[pair[1]][j]-q[pair[0]][j],(p[pair[1]][j]-p[pair[0]][j])*zoom,9)
   for k,inner,outer in zip(pair,'UV','XY'):
    v=[p[far][j]-p[k][j] for j in (0,1)];u=[q[inner][j]-q[k][j] for j in (0,1)]
    self.assertAlmostEqual(v[0]*u[1]-v[1]*u[0],0,8)
    self.assertGreater(sum(v[j]*u[j] for j in (0,1)),0)
    self.assertLess(math.dist(q[k],q[outer]),math.dist(p[k],p[far])*zoom)
   self.assertEqual(set(d['plan']['model']['labels']),set(pair));checked+=1
  self.assertEqual(checked,2996)
 def test_two_reported_extremes_have_explicit_details_without_numeric_answers(self):
  for id in ['inline:m3-trig-side-from-area-sine:960','inline:m3-trig-sine-from-area:1515']:
   svg,lines,proof=engine.compile_row(BYID[id]);root=ET.fromstring(svg)
   self.assertIn('부근 확대',svg);self.assertIn('긴 변은 일부만 표시',svg)
   self.assertEqual(sum('data-px' in n.attrib for n in root.iter()),3)
   self.assertNotIn('<tspan',svg)
   self.assertTrue(all(len(n)==0 for n in root.iter() if 'data-mj' in n.attrib))
   self.assertTrue(proof['spec']['label_metrics'])
   if id.endswith(':960'):self.assertNotIn('BAC',proof['spec']['angles']);self.assertIn('UAC',proof['detail']['spec']['angles'])
   if id.endswith(':960'):
    self.assertIn('data-mj="x cm"',svg);self.assertNotIn('0.25 cm',svg);self.assertNotIn('1/4 cm',svg)
 def test_normal_triangle_keeps_single_existing_scene(self):
  row=BYID['inline:m3-trig-length-given-ratio:0'];self.assertIsNone(engine.triangle_detail_plan(row));svg,_,proof=engine.compile_row(row)
  self.assertNotIn('부근 확대',svg);self.assertNotIn('detail',proof)
if __name__=='__main__':unittest.main()
