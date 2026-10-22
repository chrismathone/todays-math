import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import crypto from 'node:crypto';
const roots=['src/components/unified/figure-editor/figureArrow.ts','src/components/unified/figure-editor/figureSvgEditing.ts'];
const config=ts.readConfigFile('tsconfig.json',ts.sys.readFile);
if(config.error)throw Error(ts.flattenDiagnosticMessageText(config.error.messageText,'\n'));
const parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,path.resolve('.'));
// These production modules use DOM APIs and local imports only. Avoid unrelated
// auto-discovered app/test ambient packages; no Next or React component is changed.
const options={...parsed.options,types:[],incremental:false,noEmit:true};delete options.tsBuildInfoFile;
const program=ts.createProgram(roots,options);
const diagnostics=ts.getPreEmitDiagnostics(program).map(d=>({code:d.code,file:d.file?.fileName,line:d.file&&d.start!==undefined?d.file.getLineAndCharacterOfPosition(d.start).line+1:null,message:ts.flattenDiagnosticMessageText(d.messageText,'\n')}));
const result={utc:new Date().toISOString(),typescript:ts.version,roots:roots.map(p=>({path:p,sha256:crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')})),diagnostics,projectStrictDOMOptions:true,autoAmbientPackagesExcluded:true,productionSourceDependenciesChecked:true,wholeProjectOrTestTypesCertified:false,compilerWrites:0,dbWrites:0};
fs.writeFileSync(new URL('./dom-types-r1.json',import.meta.url),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({roots:roots.length,diagnostics:diagnostics.length}));process.exitCode=diagnostics.length?1:0;
