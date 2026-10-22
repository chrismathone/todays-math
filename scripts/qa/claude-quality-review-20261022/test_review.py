import copy, json, tempfile, unittest
from pathlib import Path
import review

class ReviewGuards(unittest.TestCase):
 def setUp(self):
  self.request={'model':'claude-opus-5-5','max_tokens':8192,'output_config':{'effort':'high'},'messages':[{'role':'user','content':'review data'}]}
  self.parsed={'sourceStatus':'sufficient','sourceEvidence':'2+2=4.','candidates':[{'label':x,'answerCorrectness':'correct','answerExplanationConsistency':'consistent','checkingEvidence':'2+2=4.','correctionForReview':None} for x in ('A','B')]}
  self.raw={'type':'message','role':'assistant','model':'claude-opus-5-5','id':'msg1','stop_reason':'end_turn','usage':{'input_tokens':1,'output_tokens':1},'content':[{'type':'text','text':json.dumps(self.parsed)}]}
 def parse(self):return review.parse_response(json.dumps(self.raw).encode(),self.request,'req1','text-review')
 def test_valid(self):self.assertEqual(self.parse()['parsed'],self.parsed)
 def test_refusal_never_extracts_json(self):
  self.raw['stop_reason']='refusal'
  with self.assertRaises(review.EvidenceError):self.parse()
 def test_truncation(self):
  self.raw['stop_reason']='max_tokens'
  with self.assertRaises(review.EvidenceError):self.parse()
 def test_mixed_tool_blocks(self):
  self.raw['content'].append({'type':'tool_use','id':'tool','name':'x','input':{}})
  with self.assertRaises(review.EvidenceError):self.parse()
 def test_actual_model(self):
  self.raw['model']='claude-sonnet-5-5'
  with self.assertRaises(review.EvidenceError):self.parse()
 def test_schema_failure_no_extraction(self):
  self.raw['content'][0]['text']='Here is JSON: '+json.dumps(self.parsed)
  with self.assertRaises(review.EvidenceError):self.parse()
 def test_duplicate_key(self):
  with self.assertRaises(review.EvidenceError):review.decode_json('{"a":1,"a":2}')
 def test_duplicate_label(self):
  self.parsed['candidates'][1]['label']='A'
  with self.assertRaises(review.EvidenceError):review.validate_review(self.parsed)
 def test_unknown_verdict(self):
  self.parsed['candidates'][0]['answerCorrectness']='probably'
  with self.assertRaises(review.EvidenceError):review.validate_review(self.parsed)
 def test_other_provider_tools_low_effort_rejected(self):
  for k,v in [('model','fable'),('tools',[]),('output_config',{'effort':'low'})]:
   req=copy.deepcopy(self.request);req[k]=v
   with self.assertRaises(review.EvidenceError):review.check_request(req)
 def test_fresh_single_turn(self):
  self.request['messages'].append({'role':'assistant','content':'prior'})
  with self.assertRaises(review.EvidenceError):review.check_request(self.request)
 def test_fixed_format_keeps_wire_and_normalized_binding(self):
  wire={'sourceStatus':'sufficient','sourceEvidence':'2+2=4.','candidateA':self.parsed['candidates'][0],'candidateB':self.parsed['candidates'][1]}
  self.raw['content'][0]['text']=json.dumps(wire)
  out=review.parse_response(json.dumps(self.raw).encode(),self.request,'req1','text-review-format')
  self.assertEqual(out['wireParsed'],wire);self.assertEqual(out['parsed'],self.parsed)
 def test_fixed_format_still_rejects_empty_evidence(self):
  wire={'sourceStatus':'sufficient','sourceEvidence':'','candidateA':self.parsed['candidates'][0],'candidateB':self.parsed['candidates'][1]}
  self.raw['content'][0]['text']=json.dumps(wire)
  with self.assertRaises(review.EvidenceError):review.parse_response(json.dumps(self.raw).encode(),self.request,'req1','text-review-format')
 def test_malformed_envelope_rejected(self):
  for raw in (b'[]',b'null'):
   with self.assertRaises(review.EvidenceError):review.parse_response(raw,self.request,'req1','text-review')
 def test_malformed_candidate_rejected(self):
  self.parsed['candidates']=[None,{}]
  with self.assertRaises(review.EvidenceError):review.validate_review(self.parsed)
 def test_code_review_schema(self):
  self.raw['content'][0]['text']=json.dumps({'summary':'Scoped review.','findings':[],'limits':'No execution.'})
  self.assertEqual(review.parse_response(json.dumps(self.raw).encode(),self.request,'req1','code-review')['parsed']['findings'],[])
 def test_superseded_never_executes(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);review.save(root/'superseded-series.json',{'shadow':{'executed':0}})
   with self.assertRaisesRegex(review.EvidenceError,'superseded'):review.run(root,'shadow')
 def test_missing_auth_gate(self):
  with tempfile.TemporaryDirectory() as tmp:
   with self.assertRaisesRegex(review.EvidenceError,'authentication gate'):review.run(Path(tmp),'text')
 def test_invalid_token_caps_rejected(self):
  for value in (0,-1,8192.5,20000,True):
   req=copy.deepcopy(self.request);req['max_tokens']=value
   with self.assertRaises(review.EvidenceError):review.check_request(req)

if __name__=='__main__':unittest.main()
