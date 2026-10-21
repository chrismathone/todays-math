"""Resource-bounded related checks; private caches and immutable per-attempt receipts."""
from pathlib import Path
import ctypes,datetime,hashlib,json,os,subprocess,sys
OUT=Path(__file__).resolve().parent
class M(ctypes.Structure):
    _fields_=[('length',ctypes.c_ulong),('load',ctypes.c_ulong)]+[(n,ctypes.c_ulonglong) for n in
        ['totalPhys','availPhys','totalPageFile','availPageFile','totalVirtual','availVirtual','availExtendedVirtual']]
stage,label=sys.argv[1:3]
assert not (OUT/(label+'-execution.json')).exists(), 'retain earlier attempts'
m=M();m.length=ctypes.sizeof(m);assert ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m))
minimum=3.5 if stage=='types' else 1.5
memory=dict(availableGiB=m.availPhys/1024**3,minimumGiB=minimum)
print(json.dumps(memory),flush=True)
if memory['availableGiB']<minimum:raise SystemExit(75)
heap=768 if stage=='types' else 512 if stage=='lint' else 384
if stage=='tests':
    files=['middleM2ParallelIntersection','middleM2Geo','examStudyDraftSnapshots','examStudyCoreLegacy','figureEngineCatalog','vendoredFigureEngine','textbookTwinHelpers']
    config=OUT/(label+'.mts')
    config.write_text("import {defineConfig} from 'vitest/config'; import path from 'node:path';\nexport default defineConfig({envDir:false,cacheDir:path.resolve("+json.dumps(str(OUT/'.vite-private'))+"),resolve:{alias:{'@':path.resolve('src')}},test:{include:"+json.dumps(['src/__tests__/unit/'+p+'.test.ts' for p in files])+",environment:'node',globals:false,css:false,setupFiles:['./vitest.setup.ts'],testTimeout:60000,env:{DATABASE_URL:'postgresql://test:test@127.0.0.1:1/test',DIRECT_URL:'postgresql://test:test@127.0.0.1:1/test',AUTH_URL:'http://localhost',NEXTAUTH_URL:'',STUDIO_ENGINE_URL:'',VERCEL:'',VERCEL_ENV:'development'}}});\n",encoding='utf-8')
    cmd=['node',f'--max-old-space-size={heap}','--max-semi-space-size=8','node_modules/vitest/vitest.mjs','run','--config',str(config),
         '--maxWorkers=1','--no-file-parallelism','--reporter=json','--outputFile='+str(OUT/(label+'-results.json'))]
elif stage=='types':cmd=['node','--max-old-space-size=768','--max-semi-space-size=8',str(OUT/'check_types.mjs'),label]
elif stage=='lint':cmd=['node','--max-old-space-size=512','--max-semi-space-size=8','node_modules/eslint/bin/eslint.js',
    *[p for p in json.loads((OUT/'root-files.json').read_text(encoding='utf-8')) if p.endswith(('.ts','.tsx'))],'--format','json','--output-file',str(OUT/(label+'-results.json'))]
else:raise ValueError(stage)
files=subprocess.check_output(['git','diff','--name-only'],text=True,stderr=subprocess.DEVNULL).splitlines()
files += json.loads((OUT/'root-files.json').read_text(encoding='utf-8'))
files += [str(p) for p in Path('public/figure-assets').glob('*.svg')]
files += ['src/__tests__/fixtures/m2Parallel-before-intersection-20261021.json','src/lib/middle/m2GeoSim.ts']
files += ['scripts/figure/render_spec.py','src/lib/figure/asset-editor-geometry-legacy-20261021.json','src/__tests__/fixtures/figure-assets-legacy-20261021.json']
before={p:hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in files if Path(p).is_file()}
r=subprocess.run(cmd,env={**os.environ,'NODE_OPTIONS':f'--max-old-space-size={heap} --max-semi-space-size=8','PYTHONDONTWRITEBYTECODE':'1','PYTHONIOENCODING':'utf-8'},capture_output=True,text=True,encoding='utf-8',timeout=300)
(OUT/(label+'.log')).write_bytes((r.stdout+r.stderr).encode('utf-8'))
same=before=={p:hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in before}
(OUT/(label+'-execution.json')).write_bytes((json.dumps(dict(utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),stage=stage,command=cmd,memory=memory,sourceSHA256=before,sourcesUnchanged=same,exitcode=r.returncode,dbWrites=0),indent=2)+'\n').encode('utf-8'))
if stage=='tests' and (OUT/(label+'-results.json')).exists():
    data=json.loads((OUT/(label+'-results.json')).read_text(encoding='utf-8'));print(json.dumps({k:data.get(k) for k in ['numPassedTestSuites','numFailedTestSuites','numPassedTests','numFailedTests']}))
else:print(r.stdout+r.stderr)
assert same
raise SystemExit(r.returncode)
