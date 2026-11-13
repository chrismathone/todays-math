"""Regression and adversarial tests for measured chords split at midpoints.
Run directly; --mutate removes only the new rule and must produce failing tests.
"""
import sys,types,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(ROOT/'vendor/figure-engine'))
if '--mutate' in sys.argv:
 sys.argv.remove('--mutate')
 import core.figure_scene as original
 source=Path(original.__file__).read_text()
 needle='''                            ) or (
                                # Conversely, a complete measured chord'''
 assert source.count(needle)==1
 source=source.replace(needle,'''                            ) or (False and
                                # Conversely, a complete measured chord''')
 module=types.ModuleType('core.figure_scene_mutant');sys.modules[module.__name__]=module
 exec(compile(source,'<chord-rule-mutant>','exec'),module.__dict__)
else:
 import core.figure_scene as module
compile_spec=module.compile_figure_spec
class DimensionTests(unittest.TestCase):
 def chord(self):
  return {'version':2,'points':{'A':[0,0],'B':[200,0],'M':[100,0]},'segments':{'AM':{'points':['A','M'],'ticks':1},'MB':{'points':['M','B'],'ticks':1}},'dimensions':{'dimAB':{'points':['A','B'],'label':'10 cm'}},'labels':{}}
 def test_whole_dimension_on_ticked_subsegments(self):
  scene=compile_spec(self.chord());self.assertIn('dimAB',scene.resolve().dimension_layouts)
 def test_reversed_parts_and_whole_stroke_are_same_chord(self):
  spec=self.chord();spec['segments']['AM']['points'].reverse();spec['segments']['AB']={'points':['A','B']}
  self.assertIn('dimAB',compile_spec(spec).resolve().dimension_layouts)
 def test_oblique_subdivision(self):
  spec=self.chord();spec['points'].update(B=[160,120],M=[80,60])
  self.assertIn('dimAB',compile_spec(spec).resolve().dimension_layouts)
 def test_off_chord_barriers_still_reject_real_intersections(self):
  spec=self.chord();spec['points'].update(C=[-20,1],D=[220,1],E=[-20,-1],F=[220,-1]);spec['segments'].update(CD={'points':['C','D']},EF={'points':['E','F']})
  with self.assertRaisesRegex(module.GeometryValidationError,'no collision-free layout'):
   compile_spec(spec).resolve()
 def test_label_ink_clearance_remains_strict(self):
  scene=compile_spec(self.chord());scene.validate()
  with self.assertRaisesRegex(module.GeometryValidationError,'no collision-free layout'):
   scene._dimension_layout(scene.dimensions['dimAB'],[(-10000,-10000,10000,10000)],[])
 def test_short_chord_dimension_does_not_cut_equality_ticks(self):
  spec=self.chord();spec['points'].update(B=[40,0],M=[20,0]);spec['dimensions']['dimAB'].update(offset=1,inset=0)
  scene=compile_spec(spec);layout=scene.resolve().dimension_layouts['dimAB']
  def cross(a,b,c):return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
  path=[(p.x,p.y) for p in layout.path_samples]
  for segment in scene.segments.values():
   for c,d in scene._segment_mark_lines(segment):
    for a,b in zip(path,path[1:]):
     self.assertFalse(cross(a,b,c)*cross(a,b,d)<0 and cross(c,d,a)*cross(c,d,b)<0)
 def test_bad_right_angle_is_not_accepted(self):
  spec=self.chord();spec['points']['C']=[100,100];spec['segments']['AC']={'points':['A','C']};spec['angles']={'angA':{'vertex':'A','points':['M','C'],'right':True}}
  with self.assertRaises(module.FigureSpecError):compile_spec(spec).resolve()
if __name__=='__main__':unittest.main()
