/** Verify immutable preimages; optionally reproduce tests in a NEW D:/tmp folder only. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const artifact = path.dirname(fileURLToPath(import.meta.url));
const delivery = JSON.parse(fs.readFileSync(path.join(artifact, "delivery-map.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(artifact, "root-source-manifest.json"), "utf8"));
const args = process.argv.slice(2);
const rootOption = args.indexOf("--root");
const root = rootOption < 0 ? delivery.root : args[rootOption + 1];
if (!root) throw Error("--root requires a directory");
const sha = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
function verifyRoot() {
  const changed = manifest.files.filter(row => !fs.existsSync(path.join(root, row.file)) ||
    sha(fs.readFileSync(path.join(root, row.file))) !== row.sha256);
  if (changed.length) throw Error("Root preimages drifted; merge the proposal manually: " + changed.map(row => row.file).join(", "));
}
verifyRoot();
for (const row of delivery.proposedFiles) {
  if (sha(fs.readFileSync(path.join(artifact, row.artifact))) !== row.sha256)
    throw Error("Proposed bytes differ: " + row.file);
  if (row.originalSha256 === null && fs.existsSync(path.join(root, row.file)))
    throw Error("New proposed file already exists in Root: " + row.file);
}
if (args.includes("--verify-only")) {
  console.log(JSON.stringify({root, verifiedRootFiles:manifest.files.length, verifiedProposedFiles:delivery.proposedFiles.length, rootUnchanged:true},null,2));
  process.exit(0);
}
const helperOption = args.indexOf("--helper");
const helper = path.resolve(helperOption < 0 ? "D:/tmp/example-source-verify-" + Date.now() : args[helperOption+1]);
if (!helper.toLowerCase().startsWith(path.resolve("D:/tmp").toLowerCase()+path.sep) || fs.existsSync(helper))
  throw Error("--helper must name a NEW folder inside D:/tmp");
fs.mkdirSync(helper, {recursive:true});
function copy(target, bytes) {
  const destination = path.join(helper,target);
  fs.mkdirSync(path.dirname(destination), {recursive:true});
  fs.writeFileSync(destination, bytes);
}
for (const row of manifest.files.filter(row => row.file.startsWith("scripts/") || row.file.startsWith("src/__tests__/")))
  copy(row.file, fs.readFileSync(path.join(root,row.file)));
for (const row of delivery.proposedFiles) copy(row.file, fs.readFileSync(path.join(artifact,row.artifact)));
const definitionTest="src/__tests__/unit/conceptDefinitionSource.test.ts";
copy(definitionTest,fs.readFileSync(path.join(helper,definitionTest),"utf8").replace('resolve("src/lib/concept-blank/bank",',`resolve(${JSON.stringify(root)}, "src/lib/concept-blank/bank",`));
const attachmentTest="src/__tests__/unit/conceptStudentClearBankSource.test.ts";
copy(attachmentTest,fs.readFileSync(path.join(helper,attachmentTest),"utf8").replace('`src/lib/concept-blank/bank/', '`'+root.replaceAll("\\","/")+'/src/lib/concept-blank/bank/'));
const options=JSON.parse(fs.readFileSync(path.join(root,"tsconfig.json"),"utf8")).compilerOptions;
const overrides={incremental:false,plugins:[],baseUrl:helper,paths:{"@/*":[root+"/src/*"],typescript:[root+"/node_modules/typescript"],vitest:[root+"/node_modules/vitest"]},typeRoots:[root+"/node_modules/@types"]};
const include=["scripts/qa/concept-blank/student-clear/*.ts","src/__tests__/unit/*.test.ts"];
copy("tsconfig.json",JSON.stringify({compilerOptions:{...options,...overrides},include,exclude:[]},null,2));
copy("tsconfig.typecheck.json",JSON.stringify({extends:root+"/tsconfig.json",compilerOptions:overrides,include,exclude:[]},null,2));
copy("vitest.config.mts",`export default ${JSON.stringify({root:helper,resolve:{alias:{"@":root+"/src",vitest:root+"/node_modules/vitest/dist/index.js",typescript:root+"/node_modules/typescript/lib/typescript.js"}},test:{env:{CONCEPT_EXAMPLE_SOURCE_ROOT:root},environment:"node",include:["src/__tests__/unit/*.test.ts"],globals:false,fileParallelism:false,maxWorkers:1,testTimeout:20000}},null,2)};\n`);
function run(name,args) {
  const result=spawnSync(process.execPath,args,{cwd:helper,encoding:"utf8"});
  copy(name+".log",(result.stdout??"")+(result.stderr??""));
  if(result.error)throw result.error;
  return {name,exitCode:result.status,command:[process.execPath,...args]};
}
const tests=run("vitest",[path.join(root,"node_modules/vitest/vitest.mjs"),"run","--config",path.join(helper,"vitest.config.mts"),"--reporter=json","--outputFile",path.join(helper,"focused-results.json")]);
const types=run("typecheck",[path.join(root,"node_modules/typescript/bin/tsc"),"--project",path.join(helper,"tsconfig.typecheck.json"),"--pretty","false"]);
verifyRoot();
const evidence={root,helper,rootUnchanged:true,tests,types};
copy("verification.json",JSON.stringify(evidence,null,2));
console.log(JSON.stringify(evidence,null,2));
process.exit(tests.exitCode || types.exitCode || 0);
