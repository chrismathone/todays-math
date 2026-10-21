from pathlib import Path
import subprocess,json
P=Path(__file__).resolve().parent;S=P/'own-shadow-root';D=Path('D:/math-figure-editor/docs/export/todays-math/patches')
for f in S.rglob('*'):
 if f.is_file():f.write_bytes(f.read_bytes().replace(b'\r\n',b'\n'))
out=[]
for f in sorted(D.glob('0*.patch')):
 r=subprocess.run(['git','apply','--ignore-space-change','--unsafe-paths','--directory',S.relative_to(Path.cwd()).as_posix(),str(f)],capture_output=True,text=True);out.append({'patch':f.name,'exit':r.returncode,'stderr':r.stderr})
(P/'own-shadow-retry.json').write_text(json.dumps(out,indent=2),encoding='utf-8');print(out)
