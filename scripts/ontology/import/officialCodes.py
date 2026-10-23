"""Local read-only official-code extraction. No full official text enters the repository artifact."""
import argparse,sys,re,json,hashlib,collections
from pathlib import Path
sys.dont_write_bytecode=True
parser=argparse.ArgumentParser();parser.add_argument('--repo',required=True);parser.add_argument('--source',required=True);parser.add_argument('--expected-source-hash',required=True);parser.add_argument('--output',required=True);args=parser.parse_args()
repo,source,output=Path(args.repo),Path(args.source),Path(args.output)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
if sha(source)!=args.expected_source_hash.removeprefix('sha256:'):raise ValueError('Official original byte digest mismatch')
sys.path.insert(0,str(repo/'scripts/qa/textbook-verify'))
import hwp5_flow,olefile
pattern=re.compile(r'\[(\d{1,2}[가-힣][가-힣0-9ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]*(?:-\d{2}){1,2})\]')
paragraphs=hwp5_flow.read_paras(source);occurrences=collections.defaultdict(list);candidates=set()
for i,p in enumerate(paragraphs):
 candidates.update(m[1] for m in re.finditer(r'\[([^]\r\n]+)\]',p.text) if re.match(r'\d',m[1]))
 for m in pattern.finditer(p.text):occurrences[m[1]].append({'paragraph':i,'offset':m.start(),'paragraphTextHash':'sha256:'+hashlib.sha256(p.text.encode('utf8')).hexdigest()})
raw=[]
with olefile.OleFileIO(str(source)) as ole:
 for data in hwp5_flow.section_streams(ole):
  for record in hwp5_flow.records(data):
   if record.tag==67:raw.extend(m[1] for m in pattern.finditer(record.payload.decode('utf-16le',errors='replace')))
if set(raw)!=set(occurrences) or len(raw)!=sum(map(len,occurrences.values())) or candidates!=set(occurrences):raise ValueError('Official extraction coverage mismatch')
data={'schemaVersion':1,'edition':'2022','source':{'byteHash':'sha256:'+sha(source),'bytes':source.stat().st_size,'publicSourceIri':'https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=141&boardSeq=93458','nativeId':'MOE-2022-33-annex8'},'extractor':{'version':'moe-hwp-code-1','scriptByteHash':'sha256:'+sha(Path(__file__)),'parserByteHash':'sha256:'+sha(repo/'scripts/qa/textbook-verify/hwp5_flow.py')},'validation':{'uniqueCodes':len(occurrences),'occurrences':len(raw),'flowRawAgreement':True,'alignmentAudited':False},'codes':[{'nativeId':code,'occurrences':occurrences[code]} for code in sorted(occurrences)]}
output.parent.mkdir(parents=True,exist_ok=True);output.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n')
print(json.dumps(data['validation']))
