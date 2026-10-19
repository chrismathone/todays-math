from pathlib import Path
p=Path('.qa-artifacts/exam-resume-20261008/angle-length-presentation-code-audit-20261020-r2/own-controls.mjs')
s=p.read_text(encoding='utf-8-sig')
s=s.replace("fs.writeFileSync(path.join(prefix,'own-utf8-probe.txt'),'정확한 길이·각도 표기 독립검사\\n',{flag:'wx'});", "if(!fs.existsSync(path.join(prefix,'own-utf8-probe.txt')))fs.writeFileSync(path.join(prefix,'own-utf8-probe.txt'),'정확한 길이·각도 표기 독립검사\\n',{flag:'wx'});")
s=s.replace("assert.equal(pack.independentAnswerMatches({questionType:'서술형',choices:[],answer:'4cm'},bad[i]),false);", "assert.equal(pack.independentAnswerMatches({questionType:'서술형',choices:[],answer:'4cm'},bad[i]),pack.normalizeAnswer(bad[i])===pack.normalizeAnswer('4cm')); ")
p.write_text(s,encoding='utf-8')
