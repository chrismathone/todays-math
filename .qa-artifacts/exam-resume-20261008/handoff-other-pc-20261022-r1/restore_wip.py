"""Restore explicitly selected unverified files after checking every preimage."""
from pathlib import Path
import argparse,hashlib,json,subprocess
p=argparse.ArgumentParser();p.add_argument('--owner',choices=['parent','worker'],required=True);p.add_argument('--target',type=Path,required=True);p.add_argument('--restore',action='store_true');a=p.parse_args()
out=Path(__file__).resolve().parent;manifest=json.loads((out/'wip-manifest-r1.json').read_text(encoding='utf-8'));target=a.target.resolve()
repo=Path(subprocess.check_output(['git','-C',str(target),'rev-parse','--show-toplevel'],text=True).strip()).resolve();assert repo==target
digest=lambda raw:hashlib.sha256(raw).hexdigest()
pending=[]
for row in manifest['files']:
    if row['owner']!=a.owner:continue
    source=out/'wip'/a.owner/row['path'];raw=source.read_bytes();assert digest(raw)==row['sha256']
    destination=(target/row['path']).resolve();assert destination.is_relative_to(target)
    if destination.exists()and digest(destination.read_bytes())==row['sha256']:continue
    if row['baseLF_SHA256']is None:assert not destination.exists(),f'Existing new path must be reviewed: {destination}'
    else:
        assert destination.is_file(),f'Missing preimage: {destination}'
        assert digest(destination.read_bytes().replace(b'\r\n',b'\n'))==row['baseLF_SHA256'],f'Changed preimage; preserve coauthor work: {destination}'
    pending.append((row,destination,raw))
if a.restore:
    for row,destination,raw in pending:
        destination.parent.mkdir(parents=True,exist_ok=True);destination.write_bytes(raw);assert digest(destination.read_bytes())==row['sha256']
print(json.dumps({'owner':a.owner,'restoreRequested':a.restore,'files':len(pending),'status':'UNVERIFIED_WIP_RESTORED'if a.restore else'PREIMAGE_CHECK_PASSED_NO_FILES_CHANGED','dbWrites':0,'questionApprovals':0}))
