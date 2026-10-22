import json,tempfile,unittest
from pathlib import Path
from unittest import mock
import review

class RunnerBoundaries(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name);review.git(self.root,'init','--quiet')
  self.req={'model':'claude-opus-5-5','max_tokens':8192,'output_config':{'effort':'high'},'messages':[{'role':'user','content':'Authored synthetic check.'}]}
  self.body=review.encoded(self.req);review.private_write(self.root/'requests/case.json',self.body);review.save(self.root/'authentication.json',{'accepted':True})
  self.call={'id':'case','kind':'text-review','requestPath':'requests/case.json','requestSha256':review.digest(self.body)}
  review.save(self.root/'bounded-manifest.json',{'calls':[self.call]});commit=review.seal(self.root,'freeze');review.save(self.root/'bounded-freeze.json',{'commit':commit,'manifest':'bounded-manifest.json'})
 def tearDown(self):self.tmp.cleanup()
 def test_cap_stops_before_transport(self):
  review.save(self.root/'attempts/earlier/start.json',{})
  with mock.patch.object(review,'credential',return_value='synthetic-credential-only'),mock.patch.object(review,'LIMIT',1),mock.patch.object(review,'api_send') as send,mock.patch.object(review,'audit'):
   review.run(self.root,'bounded');send.assert_not_called()
  self.assertFalse((self.root/'attempts/case').exists())
 def test_unknown_existing_attempt_is_never_retried(self):
  review.save(self.root/'attempts/case/start.json',{'unknown':True})
  with mock.patch.object(review,'credential',return_value='synthetic-credential-only'),mock.patch.object(review,'api_send') as send,mock.patch.object(review,'audit'):
   review.run(self.root,'bounded');send.assert_not_called()
  self.assertFalse((self.root/'attempts/case/result.json').exists())
 def test_refusal_is_one_rejected_attempt_even_on_resume(self):
  raw=review.encoded({'type':'message','role':'assistant','model':self.req['model'],'id':'msg-unit','stop_reason':'refusal','usage':{'input_tokens':1,'output_tokens':1},'content':[{'type':'text','text':'Declined synthetic control.'}]})
  headers={'request-id':'req-unit','evaluation-transmitted-body-sha256':review.digest(self.body),'evaluation-transmitted-body-bytes':str(len(self.body))}
  with mock.patch.object(review,'credential',return_value='synthetic-credential-only'),mock.patch.object(review,'api_send',return_value=(200,headers,raw)) as send:
   review.run(self.root,'bounded');review.run(self.root,'bounded');send.assert_called_once()
  folder=self.root/'attempts/case';self.assertEqual(review.decode_json((folder/'result.json').read_bytes())['status'],'rejected');self.assertFalse((folder/'parsed.json').exists());self.assertEqual((folder/'response.json').read_bytes(),raw)
if __name__=='__main__':unittest.main()
