from pathlib import Path
import hashlib,json,difflib,subprocess
P=Path(__file__).resolve().parent;R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');rel='src/components/unified/figure-editor/figureBake.ts';f=R/rel
sha=lambda b:hashlib.sha256(b).hexdigest();raw=f.read_bytes();text=raw.decode('utf8').replace('\r\n','\n');baseline=subprocess.check_output(['git','-C',str(R),'show','406615bf8690d91e1ca86f0deee5c5af8de74b79:'+rel]).decode('utf8')
assert text==baseline
old='''    if (frame) return frame.map((point) => applyPoint(m, point));
  }
  if (node.localName === "circle" || node.localName === "ellipse") {'''
new='''    if (frame) return frame.map((point) => applyPoint(m, point));
    // A forged/edited asset must not bypass its registered-frame guard by
    // falling through to ordinary group geometry.
    if (node.localName === "g") return [];
  }
  if (node.localName === "g")
    return [...node.children].flatMap((child) =>
      extentPoints(child, multiply(m, parseTransform(child.getAttribute("transform") ?? ""))),
    );
  if (node.localName === "circle" || node.localName === "ellipse") {'''
assert text.count(old)==1;candidate=text.replace(old,new)
old2='''function inkPoints(node: Element): Point[] {
  const m = elementMatrix(node);
  if (node.localName === "path") {'''
new2='''function inkPoints(node: Element): Point[] {
  const m = elementMatrix(node);
  // Registered current/legacy pictures keep their conservative container in
  // alignment too; recursive ink must not replace asset identity with a bbox.
  if (node.localName === "g" && node.hasAttribute("data-asset"))
    return extentPoints(node, m);
  if (node.localName === "g")
    return [...node.children].flatMap((child) => inkPoints(child));
  if (node.localName === "path") {'''
assert candidate.count(old2)==1;candidate=candidate.replace(old2,new2)
(P/'own-figureBake.patch').write_text(''.join(difflib.unified_diff(text.splitlines(True),candidate.splitlines(True),fromfile='a/'+rel,tofile='b/'+rel)),encoding='utf8')
# Ensure the intended patch leaves the actual asset transformation policy intact.
for invariant in ['import { figureAssetLocalFrame } from "./figureAssetGeometry";','  node.hasAttribute("data-asset") ||','    if (local && !keepsFrame(node) && bake(node, local)) return;']:
 assert invariant in candidate
assert candidate[candidate.index('function bake(node:'):candidate.index('/**',candidate.index('function bake(node:')+1)]==text[text.index('function bake(node:'):text.index('/**',text.index('function bake(node:')+1)]
# Ordinary nested-rect and quadratic midpoint expectations used by the TS test.
rect=[(100+2*(x+5),80+2*(y+10))for x,y in [(0,0),(20,0),(20,40),(0,40)]]
assert min(x for x,y in rect)==110 and max(x for x,y in rect)==150 and min(y for x,y in rect)==100 and max(y for x,y in rect)==180
quad=(.25*0+.5*100+.25*0);assert quad==50
assert f.read_bytes()==raw
own=Path(rel).read_bytes()
check=subprocess.run(['git','-C',str(R),'apply','--check',str(P/'own-figureBake.patch')],capture_output=True,text=True)
assert check.returncode==0,(check.stdout,check.stderr)
assert f.read_bytes()==raw
report={'scope':'QA-only exact parent delta and bounded TS regression candidate because worker bake baseline differs','parentBaselineCommit':'406615bf8690d91e1ca86f0deee5c5af8de74b79','parentRawSHA256':sha(raw),'parentLFSHA256':sha(text.encode()),'ownRawSHA256':sha(own),'ownLFSHA256':sha(own.replace(b'\r\n',b'\n')),'candidateLFSHA256':sha(candidate.encode()),'patchSHA256':sha((P/'own-figureBake.patch').read_bytes()),'testCandidateSHA256':sha((P/'own-figureBakeGroups.test.ts').read_bytes()),'testCandidateCases':8,'gitApplyCheck':{'exitCode':check.returncode,'stdout':check.stdout,'stderr':check.stderr,'actualApply':False},'productionFilesEdited':0,'parentUnchanged':True,'guardContract':['Existing asset keepsFrame and registry-based extent precede ordinary group recursion.','Invalid/edited g[data-asset] has no measurable registered extent and does not fall through to generic geometry.','inkPoints also preserves the registered current/legacy container; no new sampled asset bounds.','No bake switch or child-coordinate rewriting changed; g still moves through whole frame matrix.','Ordinary nested group extents compose child matrices once; ordinary ink recurses using full element matrices and existing curve sampling.'],'expectedRegression':['Nested ordinary rect rotation/alignment bounds become nonempty and correct.','Nested quadratic ink box uses sampled curve height50, not control point100.','Current and legacy registered airplane bounds use exact matching registry viewBox, not ink.','Unknown slug, changed body, nonfinite/degenerate transform rejected without modifying source.','Whole asset matrix motion preserves every child geometry attr and stable number; no change to strict transform/identity implementation.'],'ownExecuted':'Python candidate construction, invariants, exact arithmetic and readonly git apply --check only; no JS/TS/Node/Vitest/browser execution. Parent must apply exact delta and run tests.','limits':'No broad renderer/grade/rights approval. Do not copy worker old figureBake over parent. Patch generated from current parent LF-equivalent406615bf8; rebind SHA before apply. Original source and unrelated dirty untouched.'}
(P/'own-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8');print(json.dumps({'reportSHA256':sha((P/'own-report.json').read_bytes()),'patchSHA256':report['patchSHA256']}))
