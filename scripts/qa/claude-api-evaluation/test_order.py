"""Raw serialized property order is part of the experiment, not a canonical hash."""
import copy
import json
import unittest
from unittest.mock import patch

from cohort import EvidenceError, api_send, check_request, digest
from final_audit import observed_envelope
from order_experiment import build_arms, ordered_bytes, interleave


class OrderTests(unittest.TestCase):
    def test_only_order_instruction_schema_order_and_effort_change(self):
        prompt = '출력은 다른 문구 없이 다음 세 필드의 JSON 하나입니다: status, answer, reasoning.\n문제:\n{"content":"2+3"}'
        arms = build_arms(prompt)
        for req in arms.values(): check_request(req)
        self.assertEqual(list(arms['A']['output_config']['format']['schema']['properties']), ['answer','reasoning','status'])
        for arm in ('B','C'):
            req=json.loads(ordered_bytes(arms[arm]))
            self.assertEqual(list(req['output_config']['format']['schema']['properties']), ['reasoning','answer','status'])
            self.assertIn('reasoning, answer, status', req['messages'][0]['content'])
            self.assertTrue(req['messages'][0]['content'].endswith('{"content":"2+3"}'))
        b,c=copy.deepcopy(arms['B']),copy.deepcopy(arms['C'])
        self.assertEqual(c['output_config'].pop('effort'),'high')
        self.assertEqual(b['output_config'].pop('effort'),'medium')
        self.assertEqual(b,c)
        self.assertNotEqual(ordered_bytes(arms['A']), ordered_bytes(arms['B']))

    def test_actual_request_data_is_frozen_bytes(self):
        raw=b'{"z":1,"a":2}'
        seen=[]
        class Reply:
            status=200
            headers={'request-id':'req_fake'}
            def __enter__(self):return self
            def __exit__(self,*_):pass
            def read(self):return b'{}'
        class Opener:
            def open(self,req,timeout):
                seen.append(req.data)
                return Reply()
        _,headers,_=api_send(raw,'offline-canary-not-a-key',opener=Opener())
        self.assertEqual(seen,[raw])
        self.assertEqual(headers['evaluation-transmitted-body-sha256'],digest(raw))

    def test_interleaving_is_fixed_and_every_arm_runs_once(self):
        cases=[str(i) for i in range(14)]
        a=interleave(cases)
        self.assertEqual(a,interleave(cases))
        self.assertEqual(len(a),42)
        self.assertEqual(len(set(a)),42)
        for case in cases:self.assertEqual({arm for c,arm in a if c==case},{'A','B','C'})

    def test_refusal_is_auditable_but_never_an_answer(self):
        req=build_arms('status, answer, reasoning.')['A']
        raw={'type':'message','role':'assistant','id':'msg_synthetic',
             'model':req['model'],'stop_reason':'refusal','content':[],
             'usage':{'input_tokens':1,'output_tokens':0}}
        result={'requestId':'req_synthetic','actualModel':req['model'],
                'usage':raw['usage'],'stopReason':'refusal','status':'rejected',
                'reason':'incomplete or refused turn'}
        obj,parsed=observed_envelope(json.dumps(raw).encode(),req,result,True)
        self.assertEqual(obj['stop_reason'],'refusal')
        self.assertIsNone(parsed)
        result['status']='accepted'
        with self.assertRaises(EvidenceError):observed_envelope(json.dumps(raw).encode(),req,result,True)

    def test_rejected_response_still_requires_actual_model_identity(self):
        req=build_arms('status, answer, reasoning.')['A']
        raw={'type':'message','role':'assistant','id':'msg_synthetic',
             'model':'claude-opus-5','stop_reason':'refusal','content':[],
             'usage':{'input_tokens':1,'output_tokens':0}}
        result={'requestId':'req_synthetic','actualModel':'claude-opus-5'}
        with self.assertRaises(EvidenceError):observed_envelope(json.dumps(raw).encode(),req,result,True)


if __name__=='__main__': unittest.main()
