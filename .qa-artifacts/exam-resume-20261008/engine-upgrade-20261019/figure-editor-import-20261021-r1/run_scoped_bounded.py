"""Same scoped checks and bindings; single Node capped at 512 MiB for low RAM."""
from pathlib import Path
source=Path(__file__).with_name('run_scoped_check.py').read_text(encoding='utf-8')
source=source.replace('minimumGiB=3','minimumGiB=2.5').replace('m.availPhys<3*1024**3','m.availPhys<2.5*1024**3')
source=source.replace('--max-old-space-size=768','--max-old-space-size=512')
exec(compile(source,str(Path(__file__).with_name('run_scoped_check.py')),'exec'))
