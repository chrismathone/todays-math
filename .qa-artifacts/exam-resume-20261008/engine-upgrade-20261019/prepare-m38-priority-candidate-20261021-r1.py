"""Prepare separate engine code copies; never modify source/bank rows here."""
from pathlib import Path
import datetime
import hashlib
import json

ROOT = Path.cwd()
OUT = ROOT / '.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/m38-candidate-code-20261021-r1'
assert not OUT.exists(), 'Preserve existing proposal'
bindings = []


def save(rel, transform):
    source = ROOT / rel
    before = source.read_bytes()
    text = before.decode('utf-8').replace('\r\n', '\n')
    after = transform(text)
    assert after != text
    target = OUT / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(after.encode('utf-8'))
    assert source.read_bytes() == before
    bindings.append(dict(path=rel, originalSha256=hashlib.sha256(before).hexdigest(),
                         candidate=str(target.relative_to(ROOT)).replace('\\', '/'),
                         candidateSha256=hashlib.sha256(after.encode('utf-8')).hexdigest()))


def replace_once(text, before, after):
    assert text.count(before) == 1, before[:100]
    return text.replace(before, after, 1)


def similarity(text):
    text = replace_once(text,
        '      const a = intBetween(rng, 2, 5);\n      const k = intBetween(rng, 2, 4);\n      const per = intBetween(rng, 3, 12);',
        '      const a = intBetween(rng, 2, 5);\n      const k = intBetween(rng, 2, 4);\n'
        '      // A triangle with one side a exists iff its perimeter exceeds 2a.\n'
        '      const per = 2 * a + intBetween(rng, 1, 10);')
    return replace_once(text,
        '      const unit = intBetween(rng, 2, 5);\n      const ab = p * unit;\n      const ac = q * unit;\n'
        '      const bc = (p - q) * intBetween(rng, 2, 5);\n      const x = (q * bc) / (p - q);',
        '      const unit = intBetween(rng, 2, 5);\n      const ab = p * unit;\n      const ac = q * unit;\n'
        '      // |AB-AC| < BC < AB+AC, retaining an integral external segment.\n'
        '      const maxBaseScale = Math.min(unit + 4, Math.floor(((p + q) * unit - 1) / (p - q)));\n'
        '      const baseScale = intBetween(rng, unit + 1, maxBaseScale);\n'
        '      const bc = (p - q) * baseScale;\n      const x = (q * bc) / (p - q);')


def center(text):
    palette = '''
// M19: exact feasible (BC, CA, AB, inradius), all within the original input ranges.
// Internal consistency is checked independently with integer area identities.
// Students still use only the GIVEN inradius as the height of triangle IBC.
const INCENTER_SIDE_RADIUS_INPUTS = [
  [8, 6, 10, 2], [8, 10, 6, 2], [10, 6, 8, 2], [10, 8, 6, 2],
  [10, 10, 12, 3], [10, 12, 10, 3], [12, 5, 13, 2], [12, 9, 15, 3],
  [12, 10, 10, 3], [12, 13, 5, 2], [12, 15, 9, 3], [14, 13, 15, 4],
  [14, 15, 13, 4], [20, 7, 15, 2], [20, 11, 13, 3], [20, 13, 11, 3],
  [20, 15, 7, 2], [24, 15, 15, 4],
] as const;
'''
    text = replace_once(text, 'const MINOR_PYTHA = "피타고라스 정리";\n', 'const MINOR_PYTHA = "피타고라스 정리";\n' + palette)
    return replace_once(text,
        '      const a = 2 * intBetween(rng, 4, 12);\n      const r = intBetween(rng, 2, 7);\n'
        '      const b = intBetween(rng, 5, 15);\n      const c = intBetween(rng, 5, 15);',
        '      const [a, b, c, r] = pick(rng, INCENTER_SIDE_RADIUS_INPUTS);')


def monomial(text):
    start = text.index('      // 지수가 문자로 적힌 등식에서 자연수 세 개를 찾는다.')
    end = text.index('\n    },\n  ),', start)
    old = text[start:end]
    new = r'''      // Exponent unknowns must not collide with either base-variable pair.
      // "항등식" terminology is unnecessary: state the all-values condition directly.
      const kc = pick(rng, [-3, -2, 2, 3] as const);
      const b = intBetween(rng, 2, 3);
      const a = intBetween(rng, 2, 3);
      const ey = intBetween(rng, 1, 2);
      const K = Math.pow(kc, b);
      const X = a * b;
      const c = ey * b;
      const lhs = `\\left(${coefTex(kc)}${v0}^{m}${varTex(v1, ey)}\\right)^{n}`;
      const rhs = `${coefTex(K)}${varTex(v0, X)}${v1}^{k}`;
      return {
        content: `자연수 $m$, $n$, $k$에 대하여 다음 등식이 문자 $${v0}$, $${v1}$의 값에 관계없이 항상 성립한다.\n$${lhs}=${rhs}$\n$m+n+k$의 값을 구하시오.`,
        answer: `$${a + b + c}$`,
        solution: `곱의 거듭제곱으로 좌변을 풀면 $${lhs}=\\left(${kc}\\right)^{n}${v0}^{mn}${v1}^{${coefTex(ey)}n}$이다.\n계수를 비교하면 $\\left(${kc}\\right)^{n}=${K}$에서 $n=${b}$이다. 두 문자의 지수를 각각 비교하면 $mn=${X}$에서 $m=${a}$이고, $k=${coefTex(ey)}n=${c}$이다.\n따라서 $m+n+k=${a}+${b}+${c}=${a + b + c}$이다.`,
        facts: { kind, kc, a, b, c, K, X, ey, m: a, n: b, k: c },
      };'''
    # A raw Python string contains literal JS escapes; preserve the producer's style.
    new = new.replace('\\\\', '\\\\')
    return replace_once(text, old, new)


def adapters(text):
    before = 'const LEGACY_FAMILY_VERSIONS: Readonly<Record<string, string>> = {\n'
    after = before + '''  // Mathematical condition/role changes are future revisions, never DB refreshes.
  "2-2|평행선 사이의 선분의 길이의 비|60": "20261021-strict-triangle-perimeter-r1",
  "2-2|평행선 사이의 선분의 길이의 비|17": "20261021-feasible-external-bisector-r1",
  "2-2|삼각형의 외심과 내심|75": "20261021-consistent-incenter-inputs-r1",
  "2-1|단항식의 계산|04": "20261021-independent-exponent-symbols-r1",
'''
    return replace_once(text, before, after)


def mono_test(text):
    start = text.index('    // 자연수 a·b·c 를 넣으면 등식이 성립해야 한다 (지수가 문자인 갈래).')
    end = text.index('\n  },', start)
    old = text[start:end]
    new = '''    // Unknown exponents are independent of BOTH base-variable pairs.
    const ms = maths(p.content);
    const equation = ms.find((s) => s.includes("="));
    expect(equation).toBeDefined();
    const [lhs, rhs] = splitEq(equation!);
    const sum = Number(toInt(evalTex(answerMath(p), {}), "m+n+k"));
    const mnk = { m: fr(p.facts.m!), n: fr(p.facts.n!), k: fr(p.facts.k!) };
    expect(p.content).toContain("값에 관계없이 항상 성립");
    for (let k = 0; k < POINTS.length; k += 1) {
      const env = { ...pointFor(k, ["a", "b", "x", "y"]), ...mnk };
      expect(eqF(evalTex(lhs, env), evalTex(rhs, env)), `점 ${k}`).toBe(true);
    }
    const sumExpression = ms.find((s) => s.replace(/\\s+/g, "") === "m+n+k");
    expect(sumExpression).toBeDefined();
    expect(Number(toInt(evalTex(sumExpression!, mnk), "m+n+k"))).toBe(sum);
    for (const v of [p.facts.m!, p.facts.n!, p.facts.k!]) {
      expect(Number.isInteger(v) && v > 0).toBe(true);
    }'''
    return replace_once(text, old, new)


save('src/lib/middle/m2GeoSim.ts', similarity)
save('src/lib/middle/m2Center.ts', center)
save('src/lib/middle/m2Mono.ts', monomial)
save('src/lib/examStudy/adapters.ts', adapters)
save('src/__tests__/unit/middleM2Mono.test.ts', mono_test)
(OUT / 'proposal.json').write_text(json.dumps(dict(
    kind='m38-priority-engine-candidate/v1', utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),
    status='prepared-separate-code-not-applied-runtime-validation-pending', findings=['M8','M9','M19','M20'],
    bindings=bindings, rootSourceChanges=0, existingBankOrIssuedQuestionsChanged=0, dbWrites=0,
    gradeOrRightsApproval=False, oldSeedReplayPending=True,
), indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print(json.dumps(dict(candidateFiles=len(bindings), applied=False, runtimeValidated=False, dbWrites=0)))
