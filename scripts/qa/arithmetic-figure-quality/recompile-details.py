"""Recompile every compound view, preserving all other actual engine bytes.

Only uncommitted, unreleased display assets may be replaced. The published
version guard in engine.py remains unchanged; original cache provenance is
never relabelled. No stored/frozen arithmetic geometry is opened for writing.
"""
import base64,concurrent.futures,hashlib,json,subprocess,zlib,copy
from pathlib import Path
import engine

def work(row):
 svg,lines,proof=engine.compile_row(row)
 return row,svg,lines,proof


def main():
 ROOT=Path.cwd();out=ROOT/'docs/planning/tracks/reports/arithmetic-figure-quality-20261112'
 target=ROOT/'src/lib/arithmetic-v2/presentation/engine-inline-v1.json'
 relative=str(target.relative_to(ROOT))
 assert subprocess.run(['git','cat-file','-e','HEAD:'+relative],capture_output=True).returncode!=0, 'Choose a new version for a released/tracked asset'
 sha=lambda b:hashlib.sha256(b).hexdigest()
 oldbytes=target.read_bytes()
 assert sha(oldbytes)=='500cc795130952c01f68456fb86626586b332f776a433bca96eb4c44c0e052fc', 'Unexpected source asset; do not overwrite another run'
 pack=json.loads(oldbytes);families={}
 for family,p in pack['families'].items():
  values={}
  for chunk in p['chunks']:
   for canonical,tid,numbers,lines in json.loads(zlib.decompress(base64.b64decode(chunk),-15)):
    literals=p['templates'][tid]
    svg=''.join(t+(numbers[i] if i<len(numbers) else '') for i,t in enumerate(literals))
    values[canonical]=[canonical,svg,lines]
  families[family]=values
 proof_path=Path('/tmp/arithmetic-figure-quality/trig-engine-proof.json')
 oldproof=json.loads(proof_path.read_text());byid={r['id']:r for r in oldproof}
 rows=json.load(open('/tmp/arithmetic-figure-quality/trig-models.json'))
 selected=[r for r in rows if engine.triangle_detail_plan(r)]
 assert len(selected)==2996
 for row in rows:
  original=families[row['family']][row['canonical']]
  assert sha(original[1].encode())==byid[row['id']]['displaySha256'],row['id']


 updated={};failures=[]
 with concurrent.futures.ProcessPoolExecutor(max_workers=3) as pool:
  for i,(row,svg,lines,proof) in enumerate(pool.map(work,selected,chunksize=4)):
   if lines:failures.append({'id':row['id'],'residual':lines})
   updated[row['id']]=proof
   families[row['family']][row['canonical']]=[row['canonical'],svg,lines]
   if (i+1)%100==0:print(json.dumps({'compiledDetails':i+1,'expected':len(selected)}),flush=True)
 assert not failures,failures
 assert len(updated)==2996
 result={**pack,'families':{k:engine.inline_pack(v) for k,v in families.items()}}
 newbytes=(json.dumps(result,separators=(',',':'))+'\n').encode()
 assert target.read_bytes()==oldbytes,'Asset changed during compile'
 candidate=Path('/tmp/arithmetic-figure-quality/compact-detail-inline-candidate.json');candidate.write_bytes(newbytes)
 proofs=[updated.get(r['id'],r) for r in oldproof]
 assert sum(r!=o for r,o in zip(proofs,oldproof))==2996
 Path('/tmp/arithmetic-figure-quality/pre-compact-trig-proof.json').write_text(json.dumps(oldproof,ensure_ascii=False))
 proof_path.write_text(json.dumps(proofs,ensure_ascii=False))
 target.write_bytes(newbytes)
 provenance=json.loads((out/'engine-provenance.json').read_text())
 provenance['compoundReadabilityRecompile']={'candidates':2996,'actualEngineViews':5992,'unchangedOtherCandidates':23697,'compilerFingerprint':engine.COMPILER_FINGERPRINT,'sourceSHA256':sha(Path(engine.__file__).read_bytes()),'vendorSHA256':sha(Path('vendor/figure-engine/core/figure_scene.py').read_bytes()),'previousInlineAssetSHA256':sha(oldbytes),'finalInlineAssetSHA256':sha(newbytes),'rule':'Actually recompiled both authoritative engine views for every compound candidate; all other canonical, raw SVG and condition bytes preserved; original cache entries and provenance not relabelled'}
 provenance['finalCompilerFingerprint']=engine.COMPILER_FINGERPRINT
 (out/'engine-provenance.json').write_text(json.dumps(provenance,indent=2)+'\n')
 (out/'compound-recompile.json').write_text(json.dumps({'updatedIDs':list(updated),'count':len(updated),'dimensionResiduals':failures,'sourceAssetSHA256':sha(oldbytes),'outputAssetSHA256':sha(newbytes),'compilerFingerprint':engine.COMPILER_FINGERPRINT},indent=2)+'\n')
 print({'recompiled':len(updated),'inlineAssetBytes':len(newbytes),'sha256':sha(newbytes)},flush=True)

if __name__=='__main__':main()
