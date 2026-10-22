"""Private caches and MathLive0.111.1, one bounded Node check at a time."""
from pathlib import Path
import ctypes,datetime,hashlib,json,os,subprocess,sys
OUT=Path(__file__).resolve().parent
stage,label=sys.argv[1:3]
class M(ctypes.Structure):
    _fields_=[('length',ctypes.c_ulong),('load',ctypes.c_ulong)]+[(n,ctypes.c_ulonglong)for n in ['totalPhys','availPhys','totalPageFile','availPageFile','totalVirtual','availVirtual','availExtendedVirtual']]
m=M();m.length=ctypes.sizeof(m);assert ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m))
memory={'availableGiB':m.availPhys/1024**3,'floorGiB':1.75 if stage=='types'else 1.25 if stage=='browser'else 0.9 if stage in ['quick','label','lint']else 1.5}
print(json.dumps(memory),flush=True)
if memory['availableGiB']<memory['floorGiB']:
    (OUT/(label+'-resource-hold.json')).write_bytes((json.dumps(memory)+'\n').encode());raise SystemExit(75)
heap=512 if stage in ['types','lint']else 256 if stage in ['quick','label','browser']else 384
pkg=(OUT/'independent-deps/node_modules/mathlive').as_posix()
files=json.loads((OUT/'root-files.json').read_text(encoding='utf-8'))
source={p:hashlib.sha256(Path(p).read_bytes()).hexdigest()for p in files}
if stage in ['unit','editor','related','quick','label']:
    unit=['figureBakeGroups','figureFrameExpansion','figureMathTemplates','figureAssetTransforms','exportImage','figureArrowBoundaries','figureEngineArrows','figureRotate','figureMirror','figureAlign','figureAssetEditor','figureEditorAssetsAndGroups','figureGridBoundaries','figureObjectNumbers','figureObjectGroups']
    component=['FigureLabelInput','StudioFigureEditor','StudioFigureEditor.fitFrame','StudioFigureEditor.panelFolds','FigureMathEditor']
    include=(['src/__tests__/unit/'+n+'.test.ts'for n in unit]if stage!='editor'else[])+(['src/__tests__/components/'+n+'.test.tsx'for n in component]if stage!='unit'else[])
    if stage=='quick':include=['src/__tests__/unit/'+n+'.test.ts'for n in ['figureMathTemplates','exportImage','figureFrameExpansion']]
    if stage=='label':include=['src/__tests__/components/FigureLabelInput.test.tsx']
    config="import{defineConfig}from'vitest/config';import path from'node:path';export default defineConfig({envDir:false,cacheDir:"+json.dumps((OUT/'.vite-private').as_posix())+",esbuild:{jsx:'automatic'},resolve:{alias:[{find:'@',replacement:path.resolve('src')},{find:'mathlive/ssr',replacement:"+json.dumps(pkg+'/mathlive-ssr.min.mjs')+"},{find:'mathlive/fonts.css',replacement:"+json.dumps(pkg+'/mathlive-fonts.css')+"},{find:'mathlive',replacement:"+json.dumps(pkg+'/mathlive.mjs')+"}]},test:{include:"+json.dumps(include)+",environment:'jsdom',globals:false,css:false,setupFiles:['./vitest.setup.ts'],testTimeout:60000,env:{DATABASE_URL:'postgresql://test:test@127.0.0.1:1/test',DIRECT_URL:'postgresql://test:test@127.0.0.1:1/test',AUTH_URL:'http://localhost',NEXTAUTH_URL:'',STUDIO_ENGINE_URL:'',VERCEL:'',VERCEL_ENV:'development'}}});"
    (OUT/(label+'.mts')).write_bytes(config.encode())
    cmd=['node',f'--max-old-space-size={heap}','--max-semi-space-size=8','node_modules/vitest/vitest.mjs','run','--config',str(OUT/(label+'.mts')),'--maxWorkers=1','--no-file-parallelism','--reporter=json','--outputFile='+str(OUT/(label+'-results.json'))]
elif stage=='lint':cmd=['node','--max-old-space-size=512','node_modules/eslint/bin/eslint.js',*files,'--format','json','--output-file',str(OUT/(label+'-results.json'))]
elif stage=='types':cmd=['node','--max-old-space-size=512','--max-semi-space-size=8',str(OUT/'check_types.mjs'),label]
elif stage=='browser':cmd=['node','--max-old-space-size=256','--max-semi-space-size=8',str(OUT/'browser/verify.mjs'),label]
else:raise ValueError(stage)
r=subprocess.run(cmd,env={**os.environ,'NODE_OPTIONS':f'--max-old-space-size={heap} --max-semi-space-size=8','PYTHONIOENCODING':'utf-8','PYTHONDONTWRITEBYTECODE':'1'},capture_output=True,text=True,encoding='utf-8',timeout=300)
(OUT/(label+'.log')).write_bytes((r.stdout+r.stderr).encode())
same=all(hashlib.sha256(Path(p).read_bytes()).hexdigest()==h for p,h in source.items())
(OUT/(label+'-execution.json')).write_bytes((json.dumps({'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'command':cmd,'sourceSHA256':source,'sourcesUnchanged':same,'memory':memory,'MathLive':'0.111.1 private official integrity-checked package','sharedDepsWrites':0,'dbWrites':0,'exitcode':r.returncode},indent=2)+'\n').encode())
p=OUT/(label+'-results.json')
if stage in ['unit','editor','related','quick','label']and p.exists():
    d=json.loads(p.read_text(encoding='utf-8'));print(json.dumps({k:d.get(k)for k in ['success','numPassedTests','numFailedTests']}))
else:print((r.stdout+r.stderr)[-2000:])
assert same
raise SystemExit(r.returncode)
