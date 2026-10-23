import { readFileSync } from "node:fs";
import { createOntologyPythonPort } from "../../../src/lib/math-ontology/transport/python";
import { mathOntologyCompileInputSchema } from "../../../src/contracts/mathOntology.contract";
import { canonicalOntologyJson,ontologyDigest } from "../../../src/lib/math-ontology/compiler/canonical";
async function main(){
  const input=mathOntologyCompileInputSchema.parse(JSON.parse(readFileSync(process.argv[3],"utf8")));
  const port=createOntologyPythonPort({endpoint:new URL(`http://127.0.0.1:${Number(process.argv[2])}/api/ontology-engine`),audience:"synthetic-deployment",secret:"synthetic-engine-test-secret"});
  const job={jobId:"synthetic-node-publisher-job",inputHash:ontologyDigest(canonicalOntologyJson(input)),leaseGeneration:1,expiresAt:new Date(Date.now()+120000).toISOString()};
  const result=await port.compile(input,job);
  let expiredRejected=false;
  try{await port.compile(input,{...job,expiresAt:new Date(Date.now()-1000).toISOString()});}catch{expiredRejected=true;}
  if(!expiredRejected)throw new Error("Expired lease accepted");
  process.stdout.write(JSON.stringify({graphVersion:result.identity.graphVersion,dbLeaseSeconds:120,expiredRejected})+"\n");
}
main().catch((error:unknown)=>{process.stderr.write(error instanceof Error&&/^ONTOLOGY_ENGINE_\d+$/.test(error.message)?error.message+"\n":"SYNTHETIC_HTTP_CLIENT_FAILED\n");process.exitCode=1;});
