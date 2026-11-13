"""Measured MathJax boxes must also govern angle-leader selection and emission."""
import sys,json,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
import engine
import core.figure_scene as core
ROWS={r['id']:r for r in json.load(open('/tmp/arithmetic-figure-quality/models.json'))}
if '--mutate' in sys.argv:
 sys.argv.remove('--mutate');original=core._leader_stop_radius
 core._leader_stop_radius=lambda label,fs,halo,ux=0,uy=0,metrics=None:original(label,fs,halo,ux,uy,None)
class LeaderTests(unittest.TestCase):
 def check_row(self,id):
  svg,_,proof=engine.compile_row(ROWS[id]);self.assertNotIn('<tspan',svg)
  self.assertTrue(proof['spec']['label_metrics']);self.assertIn('data-mj="x"',svg)
 def test_circumcenter_uses_measured_leader_box(self):self.check_row('gt1-m2-circum-central-angle-40')
 def test_incenter_uses_measured_leader_box(self):self.check_row('gt1-m2-incenter-half-angle-40')
 def test_three_half_angles_share_measured_leader_box(self):self.check_row('gt1-m2-incenter-three-half-angles-25-35')
if __name__=='__main__':unittest.main()
