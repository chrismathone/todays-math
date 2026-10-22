import copy,json,tempfile,unittest
from pathlib import Path
import review,final_audit
import test_review

class FullAuditGuards(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name);review.git(self.root,'init','--quiet')
  self.req={'model':'claude-opus-5-5','max_tokens':8192,'output_config':{'effort':'high'},'messages':[{'role':'user','content':'review data'}]}
  self.body=review.encoded(self.req);review.private_write(self.root/'requests/case.json',self.body)
  self.call={'id':'case','kind':'text-review','requestPath':'requests/case.json','requestSha256':review.digest(self.body)}
  review.save(self.root/'test-manifest.json',{'calls':[self.call]});self.commit=review.seal(self.root,'freeze')
  review.save(self.root/'test-freeze.json',{'commit':self.commit,'manifest':'test-manifest.json'})
  f=test_review.ReviewGuards();f.setUp();self.raw=f.raw;self.parsed=f.parsed
 def tearDown(self):self.tmp.cleanup()
 def evidence(self,rejected=False):
  folder=self.root/'attempts/case';review.save(folder/'start.json',{'ordinal':1,'startedAt':review.now(),'requestPath':self.call['requestPath'],'requestSha256':self.call['requestSha256'],'freezeCommit':self.commit})
  if rejected:self.raw['content'][0]['text']='not JSON'
  raw=review.encoded(self.raw);review.private_write(folder/'response.json',raw)
  result={'httpStatus':200,'status':'rejected' if rejected else 'accepted','requestId':'req1','responseSha256':review.digest(raw),'transmittedBodySha256':self.call['requestSha256'],'transmittedBodyBytes':str(len(self.body)),'actualModel':self.raw['model'],'messageId':self.raw['id'],'stopReason':self.raw['stop_reason'],'usage':self.raw['usage'],'toolBlocks':0}
  if rejected:result['validationError']='invalid JSON'
  else:review.save(folder/'parsed.json',review.parse_response(raw,self.req,'req1','text-review'))
  review.save(folder/'result.json',result);return folder
 def test_missing_expected_attempt(self):self.assertIn('pending expected calls',final_audit.audit(self.root,True)['errors'])
 def test_accepted_binding(self):self.evidence();self.assertFalse(final_audit.audit(self.root,True)['errors'])
 def test_request_tamper(self):
  self.evidence();(self.root/'requests/case.json').write_bytes(self.body+b' ')
  self.assertTrue(final_audit.audit(self.root,True)['errors'])
 def test_rejected_raw_reparsed(self):
  self.evidence(True);r=final_audit.audit(self.root,True);self.assertFalse(r['errors']);self.assertEqual(r['preciseFailureCounts'],{'invalid_json_no_extraction':1})
 def test_false_rejection_reason(self):
  folder=self.evidence(True);p=folder/'result.json';r=review.decode_json(p.read_bytes());r['validationError']='source schema';p.write_bytes(review.encoded(r))
  self.assertIn('case:rejected reason reparse',final_audit.audit(self.root,True)['errors'])
 def test_precise_reasons(self):
  o={'sourceStatus':'wrong','sourceEvidence':'','candidates':[{'label':'A','checkingEvidence':''}]}
  self.assertEqual(set(final_audit.violations(o)),{'source_status_enum','source_evidence_empty_or_type','candidate_count_1','candidate_labels_not_distinct_A_B','candidate_evidence_empty_or_type','correctness_enum','consistency_enum'})
if __name__=='__main__':unittest.main()
