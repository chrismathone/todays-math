from pathlib import Path
import json,hashlib
P=Path(__file__).resolve().parent;b=json.loads((P/'own-before-execution.json').read_text(encoding='utf-8'));assert all(hashlib.sha256(Path(p).read_bytes()).hexdigest()==v for p,v in b['hashes'].items()),'sourcechanged since frozen setup';print('Frozen source hashes unchanged')
