from pathlib import Path
import hashlib,json
P=Path(__file__).resolve().parent;R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');probe=P/'own-utf8-probe.txt';probe.write_text('렌더 경계 독립 감사 UTF-8 확인\n',encoding='utf-8');assert probe.read_text(encoding='utf-8')=='렌더 경계 독립 감사 UTF-8 확인\n'
files=['src/lib/examStudy/'+n+'.ts' for n in ['generate','identity','evidence','registry','curriculumEligibility','releaseEligibility','planner','adapters','profiles','requirements']]+['src/contracts/examStudy.contract.ts'];before={str(R/n):hashlib.sha256((R/n).read_bytes()).hexdigest() for n in files};(P/'own-source-before.json').write_text(json.dumps(before,indent=2),encoding='utf-8')
