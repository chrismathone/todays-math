"""Assemble only explicit local T1 review decisions; never apply/lock/load rows.
Input and row hashes pin the source snapshot. Unimplemented groups remain in a
separate deferred ledger rather than becoming replacements by inference.
"""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
EVIDENCE = ROOT / 'docs/planning/tracks/reports/textbook-engine-t1'
CENSUS = ROOT / 'docs/planning/tracks/reports/textbook-engine-census'
INPUT = Path('/Volumes/새 볼륨/today-backups/textbook-mid-rows.jsonl')
SOURCE_SHA = 'eb798a7e18b844b1fe4a2147ac0c3dc10cd8c1b00eb5f72a68432e7107496258'
SECTIONS = {'소수와 거듭제곱', '소인수분해', '공약수와 최대공약수', '공배수와 최소공배수', '최대공약수와 최소공배수의 활용', '정수와 유리수', '수의 대소관계', '유리수의 덧셈과 뺄셈', '유리수의 곱셈', '유리수의 나눗셈'}
REVIEWS = ['calc-review.json', 'calc-image-review.json', 'number-review.json', 'factor-review.json', 'order-review.json', 'reuse-image-review.json']
# Mathematical decision for the remaining small groups; implementation/review is
# explicitly outstanding. An anchor is a code-inspection lead, not replacement.
EXTENSIONS = {
 'numberline-read': '수직선의 좌표 읽기(정수와 유리수|05)를 등분·여러 점·식 계산으로 확장. 그림 좌표와 요구 답의 독립 검산은 미완료.',
 'numberline-attributes': '수 분류·절댓값을 수직선 표시점에 적용하는 확장. 표시점과 진술을 함께 검증하지 않아 원장 제외.',
 'common-divisor-denominator': '공약수 나열을 공통 분모의 자연수 조건으로 바꾸는 확장. 분수 빈칸과 요구 답의 견본 대응은 미완료.',
 'coprime-numerators': '서로소 개수를 진분수 분자의 범위로 확장. 원본 그림의 분모·조건을 이번에 직접 재독하지 않아 제외.',
 'lcm-exponents': '최대·최소 소인수 지수 역산(F05)의 표 표현 확장. 수치 식만으로 표의 빈칸 요구를 덮었다고 보지 않는다.',
 'gcd-lcm-ladder': 'N03의 두 결과 계산을 나눗셈 사다리의 중간 빈칸까지 확장. 사다리 입력 지면은 시안 필요.',
 'factor-ladder': 'F01 소인수분해에 중간 몫·빈칸을 추가하는 확장. 사다리 지면은 시안 필요.',
 'rational-sum-order': '계산(C01)과 결과 순서(O03)를 연결하는 확장. 결과가 서로 다른 식과 이름표의 대응은 미구현.',
 'numberline-span-quotient': '수직선 좌표 복원과 나눗셈(C05)의 결합 확장. 유향 거리·좌표·0이 아닌 제수를 함께 검증하지 않아 제외.',
 'power-attributes': 'F02 거듭제곱의 표현을 밑·지수 읽기로 확장. 암묵적 지수 1을 포함한 요구 답 생성은 미구현.',
 'operation-law-label': '곱셈 식의 교환·결합 변환을 판정하는 확장. 계산값만 구하는 C02와 법칙명 답을 구별한다.',
 'sum-law-label': '덧셈 식의 교환·결합 변환과 계산값을 함께 판정하는 확장. C01 결과 계산만으로 대체하지 않는다.',
 'first-wrong-arithmetic-step': '사칙 계산 AST에 오류 변환을 넣고 최초 실패 단계를 묻는 확장. 정답값만 구하는 계산형으로 대체하지 않는다.',
 'gcd-truth': '공약수 계산 결과를 수치 명제 참거짓으로 확장. 생성 명제와 OX 요구의 독립 검산은 미구현.',
 'lcm-truth': '공배수 계산 결과를 수치 명제 참거짓으로 확장. 생성 명제와 OX 요구의 독립 검산은 미구현.',
 'factorization-choice': '소인수분해 결과에 오류 후보를 넣는 확장. 소수 밑 조건·곱의 일치·보기 조합 검증은 미완료.',
 'branching-power': '거듭제곱 표현을 분기·단계 문맥으로 확장. 반복 분기 그림과 단계 수 검증은 미완료.',
}
DESIGN = {'divisor-product-table', 'factor-tree-prime-constraint', 'height-difference-network', 'lcm-pyramid', 'ordered-label-puzzle', 'prime-stencil', 'prime-venn-pairs', 'product-pyramid', 'table-range-max', 'operation-machine'}

def sha(data): return hashlib.sha256(data).hexdigest()
def load(file): return json.loads(file.read_text())
def encode(value): return json.dumps(value, ensure_ascii=False, indent=2) + '\n'
def jsonl(rows): return ''.join(json.dumps(row, ensure_ascii=False, separators=(',', ':')) + '\n' for row in rows)

def build():
    raw = INPUT.read_bytes()
    if sha(raw) != SOURCE_SHA: raise ValueError('원문 지문이 동결 입력과 다릅니다')
    original = {json.loads(line)['id']: sha(line) for line in raw.splitlines()}
    groups = [g for g in load(CENSUS / 'groups.json') if g['grade'] == '중1' and g['category'] == 'B' and g['section'] in SECTIONS]
    population = [json.loads(line) for line in (CENSUS / 'rows.jsonl').read_text().splitlines() if line]
    by_id = {r['id']: r for r in population if r['group'] in {g['id'] for g in groups}}
    if len(groups) != 64 or len(by_id) != 544: raise ValueError('T1 모집단 변경')
    accepted, deferred, reviewed_groups = {}, {}, {}
    for file in REVIEWS:
        review = load(EVIDENCE / file)
        for group in review['groups']:
            if group['groupId'] in reviewed_groups: raise ValueError('중복 묶음 검토')
            reviewed_groups[group['groupId']] = (group, file)
        for target, field in [(accepted, 'rows'), (deferred, 'deferred')]:
            for row in review[field]:
                source = by_id.get(row['id'])
                if not source or source['problem_code'] != row['problemCode'] or source['group'] != row['groupId']:
                    raise ValueError('원문과 검토 신분 불일치')
                if row['id'] in accepted or row['id'] in deferred: raise ValueError('중복 판정')
                if original[row['id']] != source['record_sha256']: raise ValueError('원문 행 지문 불일치')
                group = reviewed_groups[row['groupId']][0]
                if row['problemCode'] not in group['reviewedCodes']: raise ValueError('직접 검토 목록에 없는 행')
                if field == 'rows' and row['typeKey'] not in group['typeKeys']: raise ValueError('묶음에 없는 유형 키')
                target[row['id']] = {**row, 'recordSha256': source['record_sha256'], 'reviewFile': file}
    decisions = []
    for group in sorted(groups, key=lambda g: (-g['count'], g['id'])):
        members = [r for r in by_id.values() if r['group'] == group['id']]
        if group['id'] in reviewed_groups:
            review, file = reviewed_groups[group['id']]
            if set(review['reviewedCodes']) != {r['problem_code'] for r in members}: raise ValueError('묶음 재독 행 수 불일치')
            decision, reason, keys = review['decision'], review['reason'], review['typeKeys']
        else:
            slug = group['id'][len('v-m1-core-'):].rsplit('-', 1)[0]
            if slug in EXTENSIONS:
                decision, reason = '확장 결정·후속 구현', EXTENSIONS[slug]
            else:
                decision = '새 유형 결정·후속 구현'
                reason = '독립적인 ' + group['name'] + ' 골격이 필요하다. 큰 묶음부터 구현한 이번 범위 밖이며 생성·독립 검산·견본 대응을 완료하지 않았다.'
                if slug in DESIGN: reason += ' 기존 계산 지면에 없는 도식·표 배치는 시안 필요.'
            keys, file = [], 'decisions.json'
            for source in members:
                deferred[source['id']] = {'id': source['id'], 'problemCode': source['problem_code'], 'groupId': group['id'], 'recordSha256': source['record_sha256'], 'reviewFile': file, 'reason': reason, 'sourceFigureReadThisStage': False}
        n = sum(r['id'] in accepted for r in members)
        d = sum(r['id'] in deferred for r in members)
        if n + d != len(members): raise ValueError('검토한 묶음 안의 누락 행')
        decisions.append({'groupId': group['id'], 'name': group['name'], 'section': group['section'], 'sourceRows': len(members), 'acceptedRows': n, 'deferredRows': d, 'decision': decision, 'reason': reason, 'typeKeys': keys, 'reviewFile': file, 'censusDifficulty': group['difficulty']})
    order = {r['id']: r['source_line'] for r in by_id.values()}
    accepted = sorted(accepted.values(), key=lambda r: order[r['id']])
    deferred = sorted(deferred.values(), key=lambda r: order[r['id']])
    summary = {'sourceSha256': SOURCE_SHA, 'groups': len(decisions), 'candidateRows': len(by_id), 'replacementRows': len(accepted), 'deferredRows': len(deferred), 'reviewedGroups': len(reviewed_groups), 'implementedOrReusedGroups': sum(g['acceptedRows'] > 0 for g in decisions), 'typeKeys': sorted({r['typeKey'] for r in accepted}), 'dbWrites': 0, 'paidApiCalls': 0, 'deploymentOrPush': False}
    return {'replacement-ledger.jsonl': jsonl(accepted), 'deferred.jsonl': jsonl(deferred), 'decisions.json': encode(decisions), 'summary.json': encode(summary)}

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    for name, text in build().items():
        if args.check:
            if (EVIDENCE / name).read_text() != text: raise ValueError('산출물 재현 불일치: ' + name)
        else: (EVIDENCE / name).write_text(text)
    print((EVIDENCE / 'summary.json').read_text())
