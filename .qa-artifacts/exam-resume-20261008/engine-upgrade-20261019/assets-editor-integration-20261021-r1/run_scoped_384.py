"""Same explicit scoped checks, one Node 384 MiB heap at >=1.75 GiB free RAM."""
from pathlib import Path
source=Path(__file__).with_name('run_scoped_check.py').read_text(encoding='utf-8')
source=source.replace('minimumGiB=3','minimumGiB=1.75').replace('m.availPhys<3*1024**3','m.availPhys<1.75*1024**3')
source=source.replace('--max-old-space-size=768','--max-old-space-size=384')
exec(compile(source,str(Path(__file__).with_name('run_scoped_check.py')),'exec'))
