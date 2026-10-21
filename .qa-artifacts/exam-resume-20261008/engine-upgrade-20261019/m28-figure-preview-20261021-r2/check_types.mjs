import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import crypto from 'node:crypto';
const files=['src/lib/middle/m2Quad.ts','src/lib/examStudy/adapters.ts','src/__tests__/unit/middleM2QuadAngleFigure.test.ts'];
const config=ts.readConfigFile('tsconfig.json',ts.sys.readFile);
if(config.error)throw Error(ts.flattenDiagnosticMessageText(config.error.messageText,'\n'));
const parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,path.resolve('.'));
const options={...parsed.options,noEmit:true,incremental:false};delete options.tsBuildInfoFile;
const program=ts.createProgram(files.map(p=>path.resolve(p)),options);
const format=d=>({code:d.code,category:ts.DiagnosticCategory[d.category],file:d.file?.fileName,
 line:d.file&&d.start!==undefined?d.file.getLineAndCharacterOfPosition(d.start).line+1:null,
 message:ts.flattenDiagnosticMessageText(d.messageText,'\n')});
const roots=files.map(p=>{const s=program.getSourceFile(path.resolve(p));if(!s)throw Error(p);
 return {path:p,sha256:crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'),
 diagnostics:[...program.getSyntacticDiagnostics(s),...program.getSemanticDiagnostics(s)].map(format)};});
const result={utc:new Date().toISOString(),typescript:ts.version,rootFiles:roots,
 rootErrors:roots.flatMap(r=>r.diagnostics).filter(d=>d.category==='Error').length,
 globalDiagnostics:program.getGlobalDiagnostics().map(format),projectConfigurationDiagnostics:parsed.errors.map(format),
 actualProjectCompilerOptionsAndImports:true,otherImportedBodiesNotCertified:true,
 wholeProjectTypecheckClaim:false,compilerOrTsBuildInfoWrites:0,dbWrites:0};
fs.writeFileSync(new URL('./types.json',import.meta.url),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({roots:roots.length,rootErrors:result.rootErrors,globalDiagnostics:result.globalDiagnostics.length}));
process.exitCode=result.rootErrors||result.globalDiagnostics.some(d=>d.category==='Error')?1:0;
