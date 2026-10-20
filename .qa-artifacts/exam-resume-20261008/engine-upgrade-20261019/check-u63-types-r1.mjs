/** Real project resolution; report semantics of changed roots, not whole-project health. */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const files=['src/lib/examStudy/curriculumEligibility.ts',
  'src/lib/examStudy/families/middle/inverseCoefficient.ts',
  'src/__tests__/unit/examStudyM3MethodGradeGates.test.ts'];
const config=ts.readConfigFile('tsconfig.json',ts.sys.readFile);
if(config.error)throw Error(ts.flattenDiagnosticMessageText(config.error.messageText,'\n'));
const parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,path.resolve('.'));
const options={...parsed.options,noEmit:true,incremental:false};
delete options.tsBuildInfoFile;
const program=ts.createProgram(files.map(p=>path.resolve(p)),options);
const format=d=>({code:d.code,category:ts.DiagnosticCategory[d.category],
  file:d.file?.fileName,line:d.file&&d.start!==undefined?d.file.getLineAndCharacterOfPosition(d.start).line+1:null,
  message:ts.flattenDiagnosticMessageText(d.messageText,'\n')});
const roots=files.map(p=>{
  const source=program.getSourceFile(path.resolve(p));if(!source)throw Error('Missing root '+p);
  return {path:p,diagnostics:[...program.getSyntacticDiagnostics(source),...program.getSemanticDiagnostics(source)].map(format)};
});
const result={utc:new Date().toISOString(),typescript:ts.version,rootFiles:roots,
  rootErrors:roots.flatMap(r=>r.diagnostics).filter(d=>d.category==='Error').length,
  globalDiagnostics:program.getGlobalDiagnostics().map(format),
  projectConfigurationDiagnostics:parsed.errors.map(format),
  actualProjectCompilerOptionsAndImports:true,otherImportedBodiesNotCertified:true,
  wholeProjectTypecheckClaim:false,compilerOrTsBuildInfoWrites:0,dbWrites:0};
fs.writeFileSync('.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/u63-types-r1.json',JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({rootFiles:roots.length,rootErrors:result.rootErrors,globalDiagnostics:result.globalDiagnostics.length,wholeProjectClaim:false}));
process.exitCode=result.rootErrors||result.globalDiagnostics.some(d=>d.category==='Error')?1:0;
