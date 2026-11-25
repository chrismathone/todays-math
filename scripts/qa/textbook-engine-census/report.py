#!/usr/bin/env python3
"""Render the requested planning report from the census and actual review ledgers."""
from collections import Counter
import json
from pathlib import Path
import census

TRACKS = {
    'T1':('중1 수·유리수 계산','식 나무·유리수 계산과 소문항 묶음을 먼저 공용화한다.'),
    'T2':('중1 문자·일차식·방정식','계수 벡터·대입·지정 해 역산을 공용화한다.'),
    'T3':('중2 소수·지수·다항식','순환소수의 정확한 분수화·지수 벡터·계수 추출을 공용화한다.'),
    'T4':('중2 부등식·연립방정식','해의 범위·특수해·정수 조건을 생성 제약으로 분리한다.'),
    'T5':('좌표·비례·일차함수','수직선도 포함한 일반형 직선과 좌표 검산을 공유한다.'),
    'T6':('경우의 수·확률','유한 표본공간·중복 제거·복원 여부·사건의 합집합을 공용화한다.'),
    'T7':('중1 기하','직접 확인한 각·평행선·넓이·입체 수치형을 고정 배치와 독립 계산으로 묶는다.'),
    'T8':('중2 기하','직접 확인한 삼각형·사각형·닮음의 수치 조건과 도형 배치를 함께 생성한다.'),
    'T9':('통계','원자료 배열·계급별 도수에서 표와 그래프 및 정답을 함께 만든다.'),
}


def track(group):
    s = group['section']
    if any(w in s for w in ['대푯값','줄기와 잎','도수','히스토그램']):
        return 'T9'
    if '확률' in s or '경우의 수' in s:
        return 'T6'
    if any(w in s for w in ['함수','정비례','반비례','좌표','그래프의 이해']):
        return 'T5'
    if group['grade']=='중1':
        if any(w in s for w in ['유리수','정수','수의 대소','소수','소인수','공약수','공배수','최대공약수']):
            return 'T1'
        if any(w in s for w in ['일차식','문자','방정식','등식']):
            return 'T2'
    if group['grade']=='중2':
        if any(w in s for w in ['부등식','연립','미지수가 2개인']):
            return 'T4'
        if any(w in s for w in ['순환','유리수','지수법칙','단항','다항']):
            return 'T3'
    return 'T7' if group['grade']=='중1' else 'T8'


def cell(value):
    return str(value).replace('|','&#124;').replace('\n',' ')


def table(headers, rows):
    return '\n'.join(['| '+' | '.join(headers)+' |', '| '+' | '.join(['---']*len(headers))+' |'] +
                      ['| '+' | '.join(cell(c) for c in row)+' |' for row in rows])


def visual_method(method):
    return {'census':'선정 묶음 전수','sample':'묶음 내 표본'}.get(method, method)


def group_method(group):
    if group.get('classification_basis') != 'visual':
        return '본문 규칙'
    methods = ' · '.join(visual_method(m) for m in group.get('visual_methods', []))
    return '그림 직접 재독: '+methods


def render_report():
    p = census.DEFAULT_OUT
    read = lambda name: json.loads((p/name).read_text())
    s, groups, units = read('summary.json'),read('groups.json'),read('units.json')
    sample, baseline = read('audit-sample.json'),read('audit-baseline-summary.json')
    reviews = read('audit-a.json')['rows'] + read('audit-bc.json')['rows']
    a = [g for g in groups if g['category']=='A']
    b = [g for g in groups if g['category']=='B']
    rows = [json.loads(l) for l in (p/'rows.jsonl').read_text().splitlines()]
    final = {r['id']:r for r in rows}
    counts = s['categories']
    old = baseline['categories']
    fig = s['figure_reconciliation']
    visual = s['visual']
    before_visual = visual['baseline_categories']
    gap_names = {
        'svg-present-but-bytes-not-exported':'SVG 존재 플래그는 있으나 바이트 미추출',
        'text-reference-without-mapped-file':'본문 그림 참조에 대응하는 파일 없음',
        'term-only-reference':'단원 용어의 그림 표현; 실제 자산 요구 아님',
    }
    gap_table = table(['코드','학년 · 단원','미대응 구분'], [
        [g['problem_code'],g['grade']+' · '+g['section'],gap_names.get(g['reason'],g['reason'])]
        for g in fig['gaps']
    ])
    output = [f'''# 교과서 엔진 0단계 — 중1·중2 전수 대조

2026-11-25 · 가지 `phase/textbook-engine-census` · 기준 엔진 `{s['input']['engineBaseCommit'][:12]}`.
[지시서](../briefs/textbook-engine-census.md) · [SSOT](../../28-textbook-engine.md).

**8,502행을 빠짐없이 판정했다. ⓐ {counts['A']:,}행, ⓑ {counts['B']:,}행({len(b)}개 후보 묶음), ⓒ {counts['C']:,}행이다.**
여기서 전수란 모든 행에 명시적 규칙을 적용해 ID→묶음→판정을 남겼다는 뜻이다.
8,502행을 모두 수작업으로 읽거나 풀었다는 뜻은 아니다. 규칙 설계 중 읽은 문항과
동결 무작위 표본 재독과 이번 그림 직접 재독 {visual['reviewed_rows']:,}행·{visual['viewed_files']:,}파일은 구분했다.
**DB·운영 쓰기 0, 유료 API 호출 0, 배포·main 병합·push 없음.**

## 1. 결과의 범위

''' + table(['학년','교과서 행','ⓐ 덮임','ⓑ 새 유형·확장 후보','ⓒ AI·추가 판단','그림 단서','잠김'], [
        [grade, sum(s['grades'][grade].values()), s['grades'][grade].get('A',0),s['grades'][grade].get('B',0),s['grades'][grade].get('C',0),
         sum(u['figure_evidence'] for u in units if u['grade']==grade),sum(u['locked'] for u in units if u['grade']==grade)] for grade in ['중1','중2']
    ] + [['합계',s['rows'],counts['A'],counts['B'],counts['C'],s['figure_evidence'],s['locked']]]) + f'''

- ⓐ: 실제 등록된 생성기의 조건·연산 구조·요구 답이 같은 좁은 유형만 인정했다. 등록 제목이 비슷하다는 이유로 올리지 않았다.
- ⓑ: 씨앗으로 바꿀 값과 정답 계산법을 특정했다. 현재 생성기가 그 묶음의 조건·표현·복수 소문항까지 낸다고 확정하지 못한 경우도 포함한다.
  **기존 엔진에 없는 유형 수를 증명한 목록은 아니다.** 1단계 첫 작업은 해당 후보를 기존 유형의 확장으로 처리할지 새 키로 등록할지 정하는 것이다.
- ⓒ: AI 저작·개념 검토가 필요한 후보뿐 아니라, 입력 부족과 구조 미확정으로 보수적으로 둔 문항도 포함한다.
  **영구적인 엔진 불가 판정이나 확정 AI 저작 물량이 아니다.** 특히 그림 자료 미확보 {s['reasons'].get('missing-figure',0):,}행과
  파일은 있지만 아직 읽지 않은 {visual['unreviewed_rows']:,}행을
  AI로 바로 보내지 않는다. 표본에서 ⓒ→ⓑ 회수도 확인했으므로 ⓐ·ⓑ는 보수적인 확인 범위로 읽는다.
- 잠금 {s['locked']}행도 모집단에 포함했다. 잠금 여부로 수학 유형을 바꾸지 않았으며 이 보고서로 잠금을 해제하거나 새로 걸지 않는다.
- 같은 문항이 여러 자료에서 다른 ID로 실린 경우도 각각 센다. 문항 수는 서로 다른 수학 내용의 수가 아니다.

### 그림 추출 정정과 남은 미대응

리드는 앞선 추출의 `has_figure`가 `figure_svg`만 확인했으며 교과서 자산은 `figure_urls`에 있다고 정정했다.
JSONL의 `has_figure=true`는 **{s['figure_flag']}행**뿐이다. 그러나 본문 `[그림…]` 표지는 **{s['figure_marker']:,}행**,
그림이라는 참조 또는 true 플래그의 합집합은 **{s['figure_evidence']:,}행**이다. 아래 표의 «그림 단서»는 이 합집합이고
«flag»는 원본 불리언이다. 최초 보고서의 «그림 파일을 확인하지 못했다»는 한계를 이번 후속 검토에서 정정한다.
읽기 전용 대응표를 현재 워크트리의 기존 자산과 대조하여 **{fig['mapped_rows']:,}행·{fig['files']:,}개 순서별 파일**의
위치·바이트·해시를 확인했다. 그림 참조 {fig['reference_rows']:,}행 중 **{fig['unmapped_reference_rows']}행은 대응 파일이 없다.**
대응표에 있는 경로의 파일 누락은 {fig['missing_files']}개이며, 서로 다른 파일은 {fig['unique_files']:,}개다.
`has_figure`만으로 그림 유무를 판정하면 누락되며, 플래그·본문 참조·파일 대응·실제 열람은 서로 다른 증거다.
파일 존재·해시 확인이 가독성이나 수학 내용 확인을 뜻하지 않는다. 실제로 눈으로 읽은 범위는
{visual['reviewed_rows']:,}행·{visual['viewed_files']:,}파일이다. 그중 {visual['promoted_rows']:,}행만 ⓑ로 승격하고
{visual['held_rows']:,}행은 ⓒ로 유지했다. 대응 파일이 있지만 이번 직접 열람 범위 밖인 행은
{visual['unreviewed_rows']:,}행이며, 표본의 결과를 이 행들에 확대 적용하지 않았다.
그림으로 새 ⓐ를 만들지 않았고 풀이에서 보이지 않는 그림을 거꾸로 추정하지 않았다.
반대로 본문만으로 완결된 좌표·부채꼴 등의 계산 후보에서 새 엔진 그림이 필요할 수 있으므로
아래 후보 표의 «그림»은 개발 시 요구사항이며 원본의 flag와 별개다. 수식·보기만 래스터로 저장된 경우는
새 엔진이 정상 본문으로 표시할 수 있지만, 도형·그래프·표의 배치가 핵심인 후보는 자체 그림이 필요하다.

파일 대응이 없는 다섯 행을 모두 손상 이미지로 단정하지 않는다. SVG 플래그의 바이트 미추출,
실제 그림 참조의 파일 미대응, 단원 용어에만 들어간 그림 표현을 다음과 같이 구분했다.

{gap_table}

추가 입력은 `/Volumes/새 볼륨/today-backups/textbook-mid-figures.jsonl`이다.
{fig['manifest']['bytes']:,}바이트, SHA256 `{fig['manifest']['sha256']}`.
`/figures/...`는 이 워크트리의 기존 `public/figures/...`에서 읽었으며 그림 파일을 새로 저장소에 추가하지 않았다.

### 입력·엔진 증거

입력은 사용자가 지정한 `/Volumes/새 볼륨/today-backups/textbook-mid-rows.jsonl`이다.
{s['input']['bytes']:,}바이트, SHA256 `{s['input']['sha256']}`.
중1 4,943·중2 3,559, 고유 ID·코드 각각 8,502, 단원 {s['source_sections']}개를 확인했다.
모든 단원명은 실제 중등 엔진 단원명과 정확히 일치한다. 엔진은 중1 578·중2 628,
합계 {s['engine_types']:,}유형·{s['engine_sections']}단원이다(교과서에 없는 중2 농도 부등식 단원 포함).
`gen-cli --sections/--list`와 `type-census.ts`를 실행했으며 오래된 스킬의 유형 수를 사용하지 않았다.

`generateMiddleProblem`을 각 유형에 씨앗 `20261125`, `173`, `9049`로 호출한
{s['engine_sample_count']:,}건의 생성 오류는 {s['engine_generation_errors']}건이다. 이는 **생성 호출 검사**이며 모든 생성 답의
독립 검산이나 그림 렌더 검사는 아니다. 생성물 지문은 `engine-inventory.json`, 실행한 분류 코드와
중등 엔진 소스의 SHA256은 `summary.json.provenance`에 있다. 입력 SHA가 다르면 재실행은 실패한다.
JSONL에는 `source` 열·책 ID·그림 경로가 없어 `school_textbook` 범위는 리드의 읽기 전용 추출에 의존한다.
그림 경로는 후속 대응 원장으로 보완했으며 원본 본문·풀이·이미지를 이 보고서에 복사하지 않았다.
DB에 직접 연결해 재검증하지 않았다. 풀이가 null인 {s['missing_solution']}행도 삭제하지 않았다.

## 2. 단원별 전수 집계

단원 이름은 엔진 `unitSection` 그대로다. ⓐ+ⓑ+ⓒ가 각 행의 문항 수와 같고 전체 합은 8,502다.

''' + table(['학년','단원','문항','ⓐ','ⓑ','ⓒ','그림 단서','flag','대응 그림 행','연결 파일','직접 본 행'], [
        [u['grade'],u['section'],u['total'],u['A'],u['B'],u['C'],u['figure_evidence'],u['figure_flag'],
         u['mapped_figure_rows'],u['figure_files'],u['visual_reviewed_rows']] for u in units
    ])]
    output.append('''

## 3. ⓑ 새 유형·기존 확장 후보 — 묶음 크기순

아래는 개발 후보군이다. 각 후보에 속한 전체 ID는 `rows.jsonl`, 변량·계산법·근거·잠금 수는 `groups.json`에 있다.
어떤 범위를 새 키 하나로 구현할지, 기존 생성기에 선택지를 더할지는 1단계에서 좁힌다.
`easy/mid/hard`는 이 후보의 예상 구현 대상 난이도이며 원본의 6단계 난이도를 그대로 옮긴 값은 아니다.
견본은 코드만 적었다. 1~2행짜리 묶음은 존재하는 코드만 적으며 세 코드를 지어내지 않는다.
그림 재독 후보의 문항 수는 실제로 본 행만 센다. «본 행/파일»은 후보에 속한 직접 검토 범위이며,
그룹의 전체 모집단이나 아직 안 본 같은 단원 문항으로 확장한 수가 아니다. «판정 방법»으로 본문 규칙과
그림 직접 재독을 구별한다. 원본 그림의 수치 답이나 출제 지면을 승인했다는 의미는 아니다.

'''+table(['후보 키 · 이름','학년 · 단원','문항','씨앗으로 바꾸는 값','정답 계산법','그림','난이도','본 행/파일','판정 방법','견본 코드'],[
        [g['id']+' · '+g['name'],g['grade']+' · '+g['section'],g['count'],g['variables'],g['answer_method'],
         '필요' if g['figure']=='required' else '불필요',g['difficulty'],
         f"{g.get('visual_reviewed_rows',0)}/{g.get('visual_viewed_files',0)}",group_method(g),
         ' · '.join(g['example_codes'])] for g in b
    ]))
    output.append('''

## 4. ⓐ 판정 근거와 표본 재독

발문의 조건 수·연산·요구 답을 실제 엔진 생성물과 맞췄다. 두 수의 연산과 여러 식의 묶음,
직접 계산과 값 역산, 단일 답과 명제 선택을 같은 것으로 뭉개지 않았다. 수·부호를 바꾸는 것은
허용하지만 형식이나 조건이 애매한 것은 ⓑ로 남겼다. 객관식은 계산 목표의 동등성을 판단한 것이며
실제 보기 생성·대체 지면·배포 승인이 아니다.

'''+table(['학년 · 단원','묶음','문항','실제 유형 키','같은 유형이라 본 근거'],[
        [g['grade']+' · '+g['section'],g['name'],g['count'],' · '.join(g['engine_keys']),g['rationale']] for g in a
    ]))
    random_a = [r for r in reviews if r['category']=='A' and r['sample_kind']=='random']
    supp_a = [r for r in reviews if r['category']=='A' and r['sample_kind']=='supplementary']
    random_b = [r for r in reviews if r['category']=='B']
    random_c = [r for r in reviews if r['category']=='C']
    rates = lambda rr: f"{sum(r['verdict']=='pass' for r in rr)}/{len(rr)}"
    output.append(f'''

표본은 규칙 설계 후 한 번 동결했다. 씨앗 문자열 `{sample['seed']}`, 각 ID의
`SHA256(seed + ':' + id)` 순서로 ⓐ80·ⓑ40·ⓒ20을 선택했다. 원본 행을 다시 읽었으며
표본에 없는 ⓐ 유형은 3행을 별도 보충했다. 같은 Codex 계열의 별도 검토 세션을 사용했으며
다른 모델 CLI·유료 API를 쓰지 않았다. 결과를 독립 모델 간 합의로 주장하지 않는다.

''' + table(['검토 모집단','재독 결과','해석'],[
        ['ⓐ 무작위 80행',rates(random_a)+' (100%)','조건·연산·요구 답의 기존 유형 대응 일치'],
        ['ⓐ 보충 3행',rates(supp_a),'무작위에 없던 3유형; 무작위 비율에 합산하지 않음'],
        ['ⓑ 무작위 40행',rates(random_b),'결정적 생성 가능성 유지; 후보 계산법 6곳 보완'],
        ['ⓒ 무작위 20행',rates(random_c),'당시 9행 그림 미확인 유지, 11행은 보수 규칙의 과소분류여서 ⓑ로 회수'],
    ]) + f'''

ⓐ 무작위 80행은 중1 75·중2 5, 유형 14개·서로 다른 발문 63개다. 보충을 포함하면
17개 ⓐ 묶음을 모두 한 번 이상 읽었다. **이 100%를 8,502행 전체 정확도, 기존 엔진의 전체 커버리지,
원본 답 검산률로 확대하지 않는다.** 최대공약수의 지정 풀이법과 엔진 설명 방식, 교환·결합법칙을
명시하는 방식의 차이는 원장 note에 남겼다. 같은 유형이라는 판단과 풀이·지면이 같다는 판단을 분리했다.

집계 이력은 아래와 같다. 먼저 동결 표본에서 찾은 과소분류를 본문 규칙에 반영했고,
이번에는 확보한 그림 중 실제 직접 본 행만 재판정했다. 처음 표본을 새로 뽑아 바꾸지 않았다.

''' + table(['시점','ⓐ','ⓑ','ⓒ','변경 근거'],[
        ['최초 동결 전수',old['A'],old['B'],old['C'],'원래 본문 규칙의 집계'],
        [visual['baseline_commit'],before_visual['A'],before_visual['B'],before_visual['C'],'동결 표본 발견 사항을 반영한 그림 재독 전 기준'],
        ['금번 그림 직접 재독 후',counts['A'],counts['B'],counts['C'],'실제로 본 행만 승격·유지; 미열람 행에 비율 적용 없음'],
    ]) + f'''

동결 모집단은 `audit-population.jsonl`, 선택은 `audit-sample.json`, 최초 수치는
`audit-baseline-summary.json`, 실제 재독 판정은 `audit-a.json`·`audit-bc.json`이다.
ⓒ 표본의 낮은 일치율은 미확정 영역에 엔진화 가능한 것이 더 남았다는 신호다. 이번에 확인하지 않은
행까지 비율로 곱해 회수했다고 세지 않았다.

보완 사항은 보기 속 숫자를 빠뜨리지 않기, 설명을 고르는 문항과 설명을 쓰는 문항 구별,
좌표·중앙값·수치 상황의 좁은 유형 추가다. ⓑ 설명에는 역수 후 순환소수 재변환,
수직선의 일반형, 확률의 분모, 목표 계수 추출, 공배수 후보 판정을 보탰다.
`J10301-D27-001`은 본문보다 답·풀이의 소문항 수가 많다. 유형은 대입형 후보로 유지하되
원본 품질 확인 대상으로 기록했다(이미 잠긴 행, 변경 없음).

### ⓒ의 이유 — AI로 바로 보내지 않을 것

''' + table(['사유','문항','다음 확인'],[
        [census.HOLD_NAMES[key],s['reasons'].get(key,0),
         '미대응 자산 보완·대응 그림 직접 재독' if key=='missing-figure' else
         '기존 연결 파일을 직접 열고 해당 행만 재판정' if key=='figure-not-reviewed' else
         '그림의 조건 완전성·개념 목표·판독 결함을 개별 검토' if key=='visual-review-hold' else
         '설명 목표·정답 허용 범위 검토' if key=='open-response' else
         '누락 식·보기·풀이의 읽기 전용 자료 보완' if key in ('missing-math','missing-answer') else
         '명제·상황·요구 답을 좁혀 엔진 후보 회수 또는 AI 저작 결정']
        for key in census.HOLD_NAMES if s['reasons'].get(key,0)
    ]) + '''

ⓒ 묶음의 `intent`는 재검토를 배분하기 위한 검색 단서이며 `provisional=true`로 남겼다.
실제 그림 열람 여부는 행별 원장의 `figure_reviewed`로 구분한다. 검색 라벨만으로 수학 유형을 확정하거나
ⓒ를 모두 AI에 의존하는 확정 유형으로 계산하지 않는다.
''')
    output.append(f'''

### 그림 직접 재독 — {len(visual['cohorts'])}개 단원 묶음별 범위

그림 대응이 있는 행을 학년·엔진 단원으로 묶었다. 선정 방법은 `figure-review-plan.json`에 동결했으며,
그림 표본 씨앗은 `{visual['seed']}`이다. 묶음별 `sample_ids`를 유지하고 표본에서 발견한 후보에 맞춰 다시 뽑지 않았다.
각 단원의 `SHA256(seed + ':' + id)` 오름차순에서 최대 6행을 골랐고, 모집단이 6행 이하일 때만 전수로 읽었다.
각 행의 본문과 연결된 파일 전부를 원래 순서대로 직접 열었다. 파일 존재 확인만 한 행을 재독 수에 넣지 않았다.
총 {visual['reviewed_rows']:,}행·{visual['viewed_files']:,}파일을 읽었고, ⓑ {visual['promoted_rows']:,}행·ⓒ {visual['held_rows']:,}행이다.
선정 묶음 전수는 {visual['cohort_methods'].get('census',0)}묶음, 묶음 내 표본은
{visual['cohort_methods'].get('sample',0)}묶음이다. «전수»는 그 단원의 대응 그림 모집단을 모두 보았다는 뜻이며
8,502행 또는 모든 원본 자산을 완독했다는 뜻이 아니다. 표본 묶음의 ⓑ는 **본 행만** 회수했다.
같은 Codex 계열 작업 세션의 직접 시각 검토이며 외부 모델·유료 API나 독립 모델 간 합의를 사용하지 않았다.
새 그림은 만들지 않았고 원본 이미지·본문·풀이를 산출물에 복사하지 않았다.

''' + table(['학년','단원','그림 모집단 행','모집단 파일','실제 본 행','실제 본 파일','선정 방법','ⓑ','ⓒ'],[
        [c['grade'],c['section'],c['population'],c['file_population'],c['viewed_rows'],c['viewed_files'],
         visual_method(c['method']),c['B'],c['C']] for c in visual['cohorts']
    ]) + '''

#### 존재하는 파일의 판독 문제

다음 항목은 파일 미대응과 별개다. 빈 이미지·판독 불가·본문과 자산 불일치를 실제 열람 중 확인한 경우만 적었다.
'''+ (table(['코드','관찰 문제','판정 메모'],[
        [x['problem_code'],{'blank':'빈 이미지','unreadable':'판독 불가','source-mismatch':'본문·자산 불일치'}.get(x['issue'],x['issue']),x['note']]
        for x in visual['image_issues']
    ]) if visual['image_issues'] else '이번 직접 열람 범위에서 별도로 기록된 판독 문제는 없다.') + '\n')
    priority = ['T1','T2','T3','T6','T4','T5','T7','T8','T9']
    tr=[]
    for order,t in enumerate(priority,1):
        gg=[g for g in b if track(g)==t]
        dif=Counter()
        for g in gg: dif[g['difficulty']]+=g['count']
        tr.append([order,t+' '+TRACKS[t][0],sum(g['count'] for g in gg),len(gg),
                   f"{dif['easy']}/{dif['mid']}/{dif['hard']}",sum(g['count'] for g in gg if g['figure']=='required'),TRACKS[t][1]])
    output.append('''

## 5. 1단계 트랙 제안

**9개 단원 묶음**을 제안한다. 수치·계수 계산은 큰 묶음이 많고 그림 부담이 작아 먼저 한다.
기존 T7의 도형·통계 묶음은 중1 기하·중2 기하·통계로 나눴다. 직접 확인한 그림의 수치형부터
고정 배치와 계산법을 구현하고, 미열람 원본은 별도 검토한 뒤 개발 범위에 추가한다.
아래 수는 현재 ⓑ만 합한 개발 후보 행 수이며 신규 적재량이나 고유 새 유형 수가 아니다.

'''+table(['순위','트랙','후보 행','후보 묶음','easy/mid/hard 행','그림 필요 행','착수점'],tr)+'''

T1·T2·T3의 공용 계산 표현을 정한 뒤 서로 다른 모듈에서 진행하고, T6는 유한 표본공간 기반으로
분리할 수 있다. T4·T5는 공통 일차식 계산기를 재사용한다. T7·T8은 각도·길이·넓이·부피 계산과
FigureSpec 배치를 함께 검증한다. T9는 원자료 또는 도수 배열 하나에서 표·그래프·정답을 함께 생성한다.
그림이 필요한 확장은 확보한 대응 자료의 수학 구조를 확인한 뒤 자체 문장과 FigureSpec으로 새로 짓는다.
이번 작업은 트랙 분할 제안까지만이며
다른 워크트리를 만들거나 1단계 구현을 시작하지 않았다.

각 트랙의 완료 기준은 새/확장 키 결정 → 씨앗 결정성·독립 정답 계산 시험 → 그림 필요 시 FigureSpec
검증 → 자체 문장·견본 지면 확인이다. 그 뒤에야 원본 ID→대체 키 원장을 확정한다.
적재·잠금은 별도 2단계이며, 갱신이 있었다면 **갱신 후 실제 DB를 읽은 드라이런**으로 중복을 다시 센다.
현재 이 보고서의 ⓐ를 곧바로 잠금 목록으로 쓰지 않는다.

## 6. 필요한 자료와 남은 확인

1. 파일 미대응 목록 중 실제 그림이 필요한 행의 SVG 바이트 또는 원본 자산. 단원 용어에만 그림이 들어간 행과
   구별해서 보완한다. 대응 파일이 있는 미열람 행도 직접 재독 전에는 이번 표본의 수치형 후보를 적용하지 않는다.
2. 식·자료 누락 의심과 풀이 null 행의 원본 대조 자료. 해당 ID는 `rows.jsonl`의 사유와 입력으로 찾는다.
3. 미확정 개념·상황·수치형의 세부 유형 검토. ⓒ 표본의 과소분류 때문에 그림 자료만 보완하면 완전해진다고 말할 수 없다.
4. 실제 출제 지면·보기 품질·공식 성취기준 대응·학생 학습 효과·권리 승인은 이번 전수 대조의 검증 범위 밖이다.

자료가 없거나 실제 열람하지 않은 부분을 구분해 남기고, 전수 규칙 분류와 선정 그림의 직접 재독을 완료했다.

## 7. 산출물과 재현

- [행별 원장](textbook-engine-census/rows.jsonl): 입력 순서, ID, 코드, 입력 행 해시, 묶음, 판정, 유형 키, 그림 단서, 잠금.
- [유형 묶음](textbook-engine-census/groups.json) · [단원 집계](textbook-engine-census/units.json) · [요약·코드 지문](textbook-engine-census/summary.json).
- [실제 엔진 목록·생성 지문](textbook-engine-census/engine-inventory.json).
- [동결 표본](textbook-engine-census/audit-sample.json) · [ⓐ 재독](textbook-engine-census/audit-a.json) · [ⓑ/ⓒ 재독](textbook-engine-census/audit-bc.json).
- [그림 대응·파일 지문](textbook-engine-census/figure-inventory.json) · [추출 정정·미대응](textbook-engine-census/figure-reconciliation.json) · [그림 재독 선정 계획](textbook-engine-census/figure-review-plan.json).
- 그림 직접 재독 원장: [중1 수·식·좌표](textbook-engine-census/visual-m1-core.json) · [중1 기하·통계](textbook-engine-census/visual-m1-geo.json) · [중2 수·식·좌표·확률](textbook-engine-census/visual-m2-core.json) · [중2 기하](textbook-engine-census/visual-m2-geo.json).
- [도구 설명](../../../../scripts/qa/textbook-engine-census/README.md).

```sh
python3 scripts/qa/textbook-engine-census/census.py --input '/Volumes/새 볼륨/today-backups/textbook-mid-rows.jsonl'
python3 scripts/qa/textbook-engine-census/report.py
python3 scripts/qa/textbook-engine-census/census.py --input '/Volumes/새 볼륨/today-backups/textbook-mid-rows.jsonl' --check
python3 scripts/qa/textbook-engine-census/verify.py --input '/Volumes/새 볼륨/today-backups/textbook-mid-rows.jsonl'
python3 -m unittest discover -s scripts/qa/textbook-engine-census -p 'test_*.py'
```

스크립트는 원본 덤프를 수정하지 않고 현재 워크트리 안에서만 산출물을 쓴다.
현재 규칙을 다시 실행하면 행·묶음·단원·요약·엔진 지문이 바이트 단위로 같아야 한다.
검토 원장은 재실행이 만든 판정인 척 생성하지 않고 보존한다. `verify.py`는 표본 선택을 다시 계산하고
검토의 ID·묶음·입력 지문 연결, 빠진 검토, 발견 사항의 최종 범주 반영, 보고서 표의 일치까지 검사한다.
원문은 출력 객체에 넣지 않으며 긴 원문 조각의 반출도 별도로 검사한다.
운영 빌드·브라우저·전체 앱 시험은 실행하지 않았다. 관련 검사 결과는 `validation.json`에 남긴다.
''')
    return '\n'.join(output).rstrip()+'\n'


if __name__ == '__main__':
    target=census.ROOT/'docs/planning/tracks/reports/textbook-engine-census.md'
    target.write_text(render_report())
    print(target)
