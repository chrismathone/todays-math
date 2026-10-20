from pathlib import Path
import json,collections,sys
P=Path(sys.argv[1])if len(sys.argv)>1 else Path(__file__).resolve().parent;d=json.loads((P/'own-cold-cpu.cpuprofile').read_text(encoding='utf-8'));nodes={n['id']:n for n in d['nodes']};counter=collections.Counter();files=collections.Counter()
for node,delta in zip(d['samples'],d['timeDeltas']):
 frame=nodes[node]['callFrame'];counter[(frame['url'],frame['functionName'])]+=delta;files[frame['url']]+=delta
out={'sampledMs':sum(files.values())/1000,'selfByFile':[{'url':url,'ms':v/1000}for url,v in files.most_common(16)],'selfByFunction':[{'url':url,'function':name,'ms':v/1000}for (url,name),v in counter.most_common(20)],'limit':'Self samples aggregated, not call counts; tsx transformed line2 attribution cannot identify original TS statement reliably. CPU sampling adds overhead.'};(P/'own-cpu-summary.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
