"""Prove ordinary-byte fix cannot change any compiled strict arithmetic view.
The actual compile fingerprint is preserved; no cache provenance is relabelled.
"""
import ast,json,hashlib,sys,difflib
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent));import engine
out=Path('docs/planning/tracks/reports/arithmetic-figure-quality-20261112')
oldpath=Path('/tmp/arithmetic-figure-quality/compiled-figure-scene-b501.py');newpath=Path('vendor/figure-engine/core/figure_scene.py');old=oldpath.read_text();new=newpath.read_text();provenance=json.loads((out/'engine-provenance.json').read_text())
assert hashlib.sha256(oldpath.read_bytes()).hexdigest()==provenance['compiledSourceHashes'][str(newpath)]
pattern=lambda s:ast.dump(ast.parse(s,mode='eval').body,include_attributes=False)
class StrictBranch(ast.NodeTransformer):
 count=0
 def visit_IfExp(self,node):
  if pattern('self.style.clear_angle_labels')==ast.dump(node.test,include_attributes=False) and pattern('self.label_metrics')==ast.dump(node.body,include_attributes=False) and isinstance(node.orelse,ast.Constant) and node.orelse.value is None:
   self.count+=1;return node.body
  return self.generic_visit(node)
tree=ast.parse(new);normalizer=StrictBranch();tree=normalizer.visit(tree)
assert normalizer.count==5
assert ast.dump(tree,include_attributes=False)==ast.dump(ast.parse(old),include_attributes=False),'additional behavior delta requires actual re-evaluation'
count=0;details=0
for name in ['engine-proof.json','trig-engine-proof.json']:
 rows=json.load(open('/tmp/arithmetic-figure-quality/'+name))
 for r in rows:
  assert r['spec']['style']['clear_angle_labels'] is True,r['id'];count+=1
  if r.get('detail'):assert r['detail']['spec']['style']['clear_angle_labels'] is True,r['id'];details+=bool(r.get('detail'))
assert count==26693 and details==2996
provenance.update(finalVendorSha256=hashlib.sha256(newpath.read_bytes()).hexdigest(),finalCompilerFingerprint=engine.COMPILER_FINGERPRINT,compiledViews=count+details,ordinaryCompatibilityCorrection={'conditionalCallSites':5,'strictMainViews':count,'strictDetailViews':details,'strictASTAfterSelectingTrueBranchEqualsActualCompiledSource':True,'rule':'Each new expression returns the exact same self.label_metrics object for every compiled view; ordinary mode gets the historical None fallback; no other AST delta'},cacheProvenanceRelabelled=False)
(out/'engine-provenance.json').write_text(json.dumps(provenance,indent=2)+'\n')
(out/'ordinary-compatibility.patch').write_text(''.join(difflib.unified_diff(old.splitlines(True),new.splitlines(True),fromfile='compiled-b501-figure_scene.py',tofile='final-ordinary-compatible-figure_scene.py',n=0)))
print({'strictViews':count+details,'conditionalSites':normalizer.count,'ASTEquivalent':True,'compiledFingerprint':provenance['compiledRendererFingerprint'],'finalFingerprint':engine.COMPILER_FINGERPRINT})
