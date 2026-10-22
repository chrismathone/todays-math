/** Independent synthetic sentinel audit of route + proxy metadata-only envelopes. */
import {test,expect,vi} from "vitest";
vi.mock("next/server",()=>({after:()=>{throw new Error("offline request scope");}}));
vi.mock("@/lib/errorLog/record",()=>({recordErrorLog:vi.fn(async()=>undefined)}));
vi.mock("@/lib/errorLog/serverQuota",()=>({admitServerLog:()=>({record:true,suppressedBefore:0})}));
import {recordErrorLog} from "@/lib/errorLog/record";
import {noteErrorLog} from "@/lib/errorLog/scope";
import {withErrorLog,logRejectedResponse,settleErrorLogWrites} from "@/lib/errorLog/withErrorLog";
type WithParams=(request:Request,context:{params:Promise<{id:string;[key:string]:string}>})=>Promise<Response>;
type Handler=(request:Request)=>Promise<Response>;
test("arbitrary query keys, nested notes, headers, params, response and thrown cause stay out of private envelopes",async()=>{
 vi.clearAllMocks();
 const sentinel="SYNTHETIC-PRIVATE-IDENTITY@example.test",template="/api/students/[id]/math-srs/insight";
 const request=new Request(`https://example.test/api/students/${encodeURIComponent(sentinel)}/math-srs/insight?${encodeURIComponent(sentinel)}=${encodeURIComponent(sentinel)}`,{
  method:"POST",headers:{"content-type":sentinel,"user-agent":sentinel,"referer":`https://example.test/${encodeURIComponent(sentinel)}`,"x-vercel-id":sentinel},body:sentinel,
 });
 const handler=withErrorLog<WithParams>(template,async()=>{
  noteErrorLog({userId:sentinel,detail:sentinel,image:sentinel,context:{[sentinel]:{nested:[sentinel]}},action:"selection",kind:"ai-rejected"});
  return Response.json({error:{message:sentinel,details:{[sentinel]:sentinel}}},{status:502});
 },{metadataOnly:true});
 await handler(request,{params:Promise.resolve({id:sentinel,[sentinel]:sentinel})});
 const thrown=new Error(sentinel,{cause:new Error(sentinel)});
 const failing=withErrorLog<Handler>(template,async()=>{throw thrown;},{metadataOnly:true});
 await expect(failing(request)).rejects.toBe(thrown);
 logRejectedResponse({route:template,request,response:Response.json({error:sentinel},{status:403}),userId:sentinel,
  context:{[sentinel]:{nested:sentinel}},metadataOnly:true});
 await settleErrorLogWrites();
 expect(recordErrorLog).toHaveBeenCalledTimes(3);
 const entries=vi.mocked(recordErrorLog).mock.calls.map(call=>call[0]);
 expect(JSON.stringify(entries)).not.toContain(sentinel);
 for(const entry of entries){expect(entry.route).toBe(template);expect(entry.userId).toBeNull();expect(entry.requestId).toBeNull();}
});
