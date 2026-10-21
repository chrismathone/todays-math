"""Run one memory-bounded check at a time without touching shared caches."""
from pathlib import Path
import ctypes,datetime,hashlib,json,os,subprocess,sys
OUT=Path(__file__).resolve().parent
stage,label=sys.argv[1:3]
assert not (OUT/(label+'-execution.json')).exists()
class Memory(ctypes.Structure):
    _fields_=[('length',ctypes.c_ulong),('load',ctypes.c_ulong)]+[(n,ctypes.c_ulonglong) for n in ['totalPhys','availPhys','totalPageFile','availPageFile','totalVirtual','availVirtual','availExtendedVirtual']]
m=Memory();m.length=ctypes.sizeof(m)
assert ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m))
floor=3.5 if stage=='types' else 1.5
memory={'availableGiB':m.availPhys/1024**3,'minimumGiB':floor}
print(json.dumps(memory),flush=True)
if memory['availableGiB']<floor:raise SystemExit(75)
heap=768 if stage=='types' else 512 if stage=='lint' else 384
if stage in ('baseline','capture','tests','related'):
    includes=([(OUT/('capture_current.test.ts' if stage=='capture' else 'capture_baseline.test.ts')).relative_to(Path.cwd()).as_posix()] if stage in ('baseline','capture') else
        ['src/__tests__/unit/'+p+'.test.ts' for p in (['figureScatterGrid'] if stage=='tests' else ['figureScatterGrid','middleStudentInputIdentity','middleM3Stat2','figureStatKinds','figureEngineCatalog','vendoredFigureEngine','textbookTwinHelpers'])])
    config=OUT/(label+'.mts')
    config.write_text("import {defineConfig} from 'vitest/config';import path from 'node:path';\nexport default defineConfig({envDir:false,cacheDir:path.resolve("+json.dumps(str(OUT/'.vite-private'))+"),resolve:{alias:{'@':path.resolve('src')}},test:{include:"+json.dumps(includes)+",environment:'node',globals:false,css:false,setupFiles:['./vitest.setup.ts'],testTimeout:60000,env:{DATABASE_URL:'postgresql://test:test@127.0.0.1:1/test',DIRECT_URL:'postgresql://test:test@127.0.0.1:1/test',AUTH_URL:'http://localhost',NEXTAUTH_URL:'',STUDIO_ENGINE_URL:'',VERCEL:'',VERCEL_ENV:'development'}}});\n",encoding='utf-8')
    cmd=['node',f'--max-old-space-size={heap}','--max-semi-space-size=8','node_modules/vitest/vitest.mjs','run','--config',str(config),'--maxWorkers=1','--no-file-parallelism','--reporter=json','--outputFile='+str(OUT/(label+'-results.json'))]
elif stage=='types':cmd=['node','--max-old-space-size=768','--max-semi-space-size=8',str(OUT/'check_types.mjs'),label]
elif stage=='lint':cmd=['node','--max-old-space-size=512','node_modules/eslint/bin/eslint.js',*json.loads((OUT/'root-files.json').read_text()),'--format','json','--output-file',str(OUT/(label+'-results.json'))]
else:raise ValueError(stage)
files=['src/lib/middle/generate.ts','src/lib/middle/m3Stat2.ts','src/lib/middle/studentInputIdentity.ts','src/__tests__/unit/middleStudentInputIdentity.test.ts','scripts/figure/elem_advanced.py','src/__tests__/fixtures/m3Scatter-before-input-identity-20261022.json']
before={p:hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in files if Path(p).exists()}
r=subprocess.run(cmd,env={**os.environ,'NODE_OPTIONS':f'--max-old-space-size={heap} --max-semi-space-size=8','PYTHONDONTWRITEBYTECODE':'1','PYTHONIOENCODING':'utf-8'},capture_output=True,text=True,encoding='utf-8',timeout=300)
(OUT/(label+'.log')).write_text(r.stdout+r.stderr,encoding='utf-8')
same=all(hashlib.sha256(Path(p).read_bytes()).hexdigest()==h for p,h in before.items())
(OUT/(label+'-execution.json')).write_text(json.dumps(dict(utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),command=cmd,memory=memory,sourceSHA256=before,sourcesUnchanged=same,exitcode=r.returncode,dbWrites=0),indent=2)+'\n',encoding='utf-8')
if stage in ('baseline','capture','tests','related') and (OUT/(label+'-results.json')).exists():
    d=json.loads((OUT/(label+'-results.json')).read_text(encoding='utf-8'));print(json.dumps({k:d.get(k) for k in ['numPassedTestSuites','numFailedTestSuites','numPassedTests','numFailedTests']}))
else:print(r.stdout+r.stderr)
assert same
raise SystemExit(r.returncode)
