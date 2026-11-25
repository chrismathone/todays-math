"""Rebuild the manually reviewed T1 calculation decisions, without copying source text.
Reads the frozen census + external dump; never connects to a database or edits inputs.
The code lists below are decisions after reading all 261 candidate rows, not a
classifier to generalize to any future textbook population.
"""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'docs/planning/tracks/reports/textbook-engine-t1'
SOURCE = Path('/Volumes/새 볼륨/today-backups/textbook-mid-rows.jsonl')
SHA = 'eb798a7e18b844b1fe4a2147ac0c3dc10cd8c1b00eb5f72a68432e7107496258'
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == SHA
source = {r['id']: r for r in map(json.loads, SOURCE.read_text().splitlines())}
census = [r for r in map(json.loads, (ROOT / 'docs/planning/tracks/reports/textbook-engine-census/rows.jsonl').read_text().splitlines()) if r['group'].startswith('m1-b-calc-')]
assert len(census) == 261

def codes(section, values):
    return {f'J1020{section}-{s}-001' for s in values.split()}

product_distribute = codes(4, 'A43 A69 A70 A71 A88 A89 A90 B27 B28 B29 B46 B47 B48 B69 B70 B72 B73')
product_power = codes(4, 'A42 A65 A66 A67 A68 A83 A84 A85 A86 A87 B23 B24 B25 B26 B41 B42 B43 B44 B45')
mixed = codes(5, 'A47 A84 A85 A86 A87 B04 B05 B06 B07 B39 B40 B41 B42 B58 B59 B60 B61 B86 B87 B89 B90')
power_divide = codes(5, 'A83 A99 B03 B38 B54 B57')
batch_overrides = {
    **dict.fromkeys(codes(4, 'A17 B50'), 'C08'),
    **dict.fromkeys(codes(4, 'A47 B76'), 'C03'),
    **dict.fromkeys(codes(4, 'B66'), 'C04'),
    **dict.fromkeys(codes(5, 'A65'), 'C06'),
}
deferred_codes = {
    **dict.fromkeys(codes(4, 'B54 B64 B80'), '한 문항에 순수 곱·거듭제곱 또는 음의 일의 항 합을 섞은 소문항. 현재 키 하나가 그 복합 묶음을 보장하지 않아 제외.'),
    **dict.fromkeys(codes(5, 'B94'), '덧셈·나눗셈과 분배법칙 소문항을 함께 요구. 현재 단일 계산 가족으로 대응을 확정하지 않음.'),
}
reasons = {
 'C01': '부호 있는 2~5개 유리수의 덧셈·뺄셈. 정수·소수·분수 표현, 1~6개 소문항을 같은 계산 골격으로 확장.',
 'C02': '2~4개 유리수의 곱과 0을 포함하는 곱. 소수·분수 표현 및 단일/복수 소문항을 지원.',
 'C03': '괄호와 음의 부호의 범위를 구별하여 거듭제곱 뒤 곱을 계산. 단일 거듭제곱과 복수 식 지원.',
 'C04': '공통인 유리수로 묶거나 괄호를 펼치는 분배법칙 계산. 소수/분수 계수와 거듭제곱 계수 지원.',
 'C05': '유리수 2~3개의 나눗셈·곱셈을 왼쪽부터 계산. 소수/분수, 0인 피제수와 소문항 지원; 제수 0은 금지.',
 'C06': '거듭제곱을 먼저 구한 뒤 곱셈·나눗셈을 수행하는 계산.',
 'C07': '괄호·거듭제곱과 사칙연산의 우선순위를 따르는 수치 계산. 원래 요구인 값 계산과 같은 연산 단계.',
 'C08': '음의 일의 거듭제곱 항의 합·차. 항별 부호 또는 등차 계수의 교대합을 계산.',
}
# Public generator samples were read beside one source per family/group. These
# are evidence seeds, not rules for automatically selecting/locking replacements.
samples = {
 ('m1-b-calc-0-batch', 'C01'): (0, '정수·분수·소수를 더하고 빼는 네 소문항이며 답도 네 개를 같은 순서로 쓴다. 각 식의 항 수는 원문과 다를 수 있다.'),
 ('m1-b-calc-0-single', 'C01'): (5, '부호 있는 수의 덧셈·뺄셈을 한 값으로 계산한다. 견본은 다섯 항이며 원문은 네 항이다.'),
 ('m1-b-calc-1-batch', 'C02'): (0, '부호·소수·분수가 섞인 곱과 0인 곱을 여러 식으로 묻는다. 견본 세 소문항과 원문 네 소문항의 개수 차이는 남긴다.'),
 ('m1-b-calc-1-batch', 'C03'): (173, '거듭제곱 뒤 곱을 계산하고 괄호 밖 음의 부호를 구별한다. 견본 여섯 식과 원문 네 식의 소문항 수는 다르다.'),
 ('m1-b-calc-1-batch', 'C04'): (0, '같은 계수로 묶거나 괄호를 펼쳐 값을 계산하는 여러 식이다. 견본 여섯 식과 원문 세 식의 수는 다르다.'),
 ('m1-b-calc-1-batch', 'C08'): (173, '0단계는 줄바꿈 때문에 batch로 묶었지만 대표 원문은 하나의 교대합이다. 견본도 음의 일의 연속 거듭제곱에 등차 계수를 곱한 단일 합이며 항 수·계수는 다르다.'),
 ('m1-b-calc-1-single', 'C02'): (4, '부호 있는 네 수의 곱을 한 값으로 구한다. 원문의 보기 선택을 값 직접 답하기로 바꿨다.'),
 ('m1-b-calc-1-single', 'C03'): (3, '거듭제곱을 먼저 계산한 뒤 곱한다. 곱하는 수의 개수와 정수·분수 표현은 변하며 보기 선택을 값 답으로 바꿨다.'),
 ('m1-b-calc-1-single', 'C04'): (2, '공통 계수가 있는 두 곱을 분배법칙으로 묶어 한 값을 구한다. 덧셈·뺄셈과 계수는 바뀌며 보기 선택을 값 답으로 바꿨다.'),
 ('m1-b-calc-1-single', 'C08'): (1, '음의 일의 큰 지수에서 홀짝을 판단해 합·차를 계산한다. 견본 두 항과 원문 네 항은 다르고 보기 선택을 값 답으로 바꿨다.'),
 ('m1-b-calc-2-batch', 'C05'): (173, '곱셈·나눗셈을 왼쪽부터 계산하여 소문항마다 값을 쓴다. 견본 세 식과 원문 두 식은 다르다.'),
 ('m1-b-calc-2-batch', 'C06'): (1, '거듭제곱 뒤 곱셈·나눗셈을 계산하며 괄호 밖 음의 부호를 포함한다. 견본 여섯 식과 원문 네 식의 수는 다르다.'),
 ('m1-b-calc-2-single', 'C05'): (1, '나눗셈을 역수의 곱으로 계산한다. 견본은 곱셈을 포함한 세 수, 원문은 두 수의 나눗셈이다.'),
 ('m1-b-calc-2-single', 'C06'): (0, '거듭제곱을 먼저 구한 뒤 곱하고 나누어 한 값을 구한다. 밑·지수·거듭제곱인 피연산자 수는 바뀐다.'),
 ('m1-b-calc-2-single', 'C07'): (20261125, '견본의 (3)·(4)가 거듭제곱 뒤 나눗셈·곱셈·뺄셈 순서를 따르는 원문 구조와 대응한다. 원문은 단일 식이며 견본은 네 소문항이므로 소문항 수 동일성은 주장하지 않는다.'),
}
rows, deferred = [], []
for r in census:
    code = r['problem_code']
    if code in deferred_codes:
        deferred.append({'id': r['id'], 'problemCode': code, 'groupId': r['group'], 'reason': deferred_codes[code]})
        continue
    idx = int(r['group'].split('-')[3])
    key = ['C01', 'C02', 'C05'][idx]
    if code in product_distribute: key = 'C04'
    if code in product_power: key = 'C03'
    if code in codes(4, 'A49'): key = 'C08'
    if code in mixed: key = 'C07'
    if code in power_divide: key = 'C06'
    key = batch_overrides.get(code, key)
    rows.append({'id': r['id'], 'problemCode': code, 'groupId': r['group'], 'typeKey': f'1-1|교과서 수와 연산|{key}', 'reason': reasons[key]})

groups = []
for group in sorted({r['group'] for r in census}):
    keys = sorted({r['typeKey'] for r in rows if r['groupId'] == group})
    groups.append({'groupId': group, 'decision': '기존 계산 골격의 확장·새 키', 'reason': '기존 정수와 유리수의 계산 키는 항 수·숫자 표현·소문항을 늘리면 같은 씨앗 출력이 달라진다. 기존 파일은 그대로 두고 공용 정확 유리수 식과 여덟 계산 가족으로 확장한다. 여러 구조가 혼재한 묶음은 행별로 나눈다.', 'typeKeys': keys, 'reviewedCodes': [r['problem_code'] for r in census if r['group'] == group]})
    evidence = []
    for key in keys:
        row = next(r for r in rows if r['groupId'] == group and r['typeKey'] == key)
        seed, comparison = samples[(group, key.rsplit('|', 1)[1])]
        evidence.append({'sourceCode': row['problemCode'], 'typeKey': key, 'seed': seed, 'variant': 0, 'comparison': comparison})
    groups[-1]['sampleEvidence'] = evidence
OUT.mkdir(parents=True, exist_ok=True)
(OUT / 'calc-review.json').write_text(json.dumps({'sourceSha256': SHA, 'groups': groups, 'rows': rows, 'deferred': deferred}, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'reviewed': len(census), 'accepted': len(rows), 'deferred': len(deferred)}))
