import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import crypto from 'node:crypto';
const files=JSON.parse(fs.readFileSync(new URL('./root-files.json',import.meta.url),'utf8'));
const config=ts.readConfigFile('tsconfig.json',ts.sys.readFile);
if(config.error)throw Error(ts.flattenDiagnosticMessageText(config.error.messageText,'\n'));
const parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,path.resolve('.'));
const options={...parsed.options,noEmit:true,incremental:false};delete options.tsBuildInfoFile;
const program=ts.createProgram([...files.map(p=>path.resolve(p)), ...parsed.fileNames.filter(p=>p.endsWith('.d.ts')), path.resolve('vitest.setup.ts'), path.resolve('node_modules/next/types/global.d.ts')],options);
const format=d=>({code:d.code,category:ts.DiagnosticCategory[d.category],file:d.file?.fileName,
 line:d.file&&d.start!==undefined?d.file.getLineAndCharacterOfPosition(d.start).line+1:null,
 message:ts.flattenDiagnosticMessageText(d.messageText,'\n')});
const roots=files.map(p=>{const s=program.getSourceFile(path.resolve(p));if(!s)throw Error(p);
 return {path:p,sha256:crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'),
 diagnostics:[...program.getSyntacticDiagnostics(s),...program.getSemanticDiagnostics(s)].map(format)};});
const result={utc:new Date().toISOString(),typescript:ts.version,rootFiles:roots,
 rootErrors:roots.flatMap(r=>r.diagnostics).filter(d=>d.category==='Error').length,
 globalDiagnostics:program.getGlobalDiagnostics().map(format),projectConfigurationDiagnostics:parsed.errors.map(format),
 actualProjectCompilerOptionsAndImports:true,projectAmbientDeclarations:parsed.fileNames.filter(p=>p.endsWith('.d.ts')),testMatcherSetup:'vitest.setup.ts',installedNextGlobalAmbient:'node_modules/next/types/global.d.ts',otherImportedBodiesNotCertified:true,
 wholeProjectTypecheckClaim:false,compilerOrTsBuildInfoWrites:0,dbWrites:0};
fs.writeFileSync(new URL('./types-m14-r2.json',import.meta.url),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({roots:roots.length,rootErrors:result.rootErrors,globalDiagnostics:result.globalDiagnostics.length}));
process.exitCode=result.rootErrors||result.globalDiagnostics.some(d=>d.category==='Error')?1:0;
