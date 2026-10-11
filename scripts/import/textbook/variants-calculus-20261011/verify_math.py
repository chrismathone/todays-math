"""Independent SymPy recomputation from source/candidate question fields, never validation answers.

No database, model, network, source review promotion, or human-review verdict.
Usage: python -X utf8 verify_math.py candidates.json report.json
"""
from __future__ import annotations
import hashlib
import json
import re
import sys
from pathlib import Path
import sympy as s
from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application, rationalize

x, t, a, b, c, h, k = s.symbols("x t a b c h k", real=True)
symbols = {str(v): v for v in [x, t, a, b, c, h, k]}
LABEL = r"⑴|⑵|⑶|⑷|⑸|⑹|\([1-6]\)"


def norm(text):
    text = re.sub(r"\\(?:left|right|bigl|bigr)\b", "", text)
    text = re.sub(r"\\(?:[,;:! ]|quad\b|qquad\b)", "", text)
    return re.sub(r"[\s~]", "", text).replace(r"\dfrac", r"\frac")


def parts(text):
    return [norm(m) for m in re.findall(r"\$([^$]+)\$", text)]


def group_at(text, pos):
    assert text[pos] == "{"
    depth, end = 1, pos + 1
    while depth:
        depth += (text[end] == "{") - (text[end] == "}")
        end += 1
    return text[pos + 1:end - 1], end


def convert(text):
    while r"\frac" in text:
        start = text.index(r"\frac")
        numerator, end = group_at(text, start + 5)
        denominator, end = group_at(text, end)
        text = text[:start] + f"(({convert(numerator)})/({convert(denominator)}))" + text[end:]
    while r"\sqrt" in text:
        start = text.index(r"\sqrt")
        body, end = group_at(text, start + 5)
        text = text[:start] + f"sqrt({convert(body)})" + text[end:]
    return text


def expr(text):
    text = convert(norm(text)).replace(r"\times", "*").replace(r"\cdot", "*").replace("^", "**")
    text = text.replace("{", "(").replace("}", ")")
    assert re.fullmatch(r"[0-9.xtabchk+*/()sqrt-]+", text), f"Unsupported independent notation: {text}"
    return parse_expr(text, local_dict={**symbols, "sqrt": s.sqrt}, global_dict={"Integer": s.Integer, "Rational": s.Rational, "Float": s.Float}, transformations=standard_transformations + (implicit_multiplication_application, rationalize))


def same(left, right):
    return s.simplify(left - right) == 0


def unique_real_roots(polynomial, variable=x):
    return sorted(set(s.Poly(polynomial, variable).real_roots()))


def coord(text):
    return tuple(expr(v) for v in text[1:-1].split(","))


def fn_value(text):
    m = re.fullmatch(r"f\((.+)\)=(.+)", text)
    assert m
    return expr(m[1]), expr(m[2])


def fn_arg(text):
    m = re.fullmatch(r"f\((.+)\)", text)
    assert m
    return expr(m[1])


def tangent(f, point):
    return s.expand(s.diff(f, x).subs(x, point) * (x - point) + f.subs(x, point))


def compute(content, recipe):
    """Return recomputed answer groups and domain/contact facts, based only on question text."""
    pp = parts(content)
    facts = {}
    if recipe == "calculus-tangent-at-point":
        result, points = [], []
        for i in range(0, len(pp), 2):
            f = expr(pp[i].removeprefix("y="))
            u, v = coord(pp[i+1])
            assert same(f.subs(x,u),v), "Stated point is off curve"
            result.append([s.diff(f,x).subs(x,u) if "기울기를 구하시오" in content else tangent(f,u)])
            points.append(str(u))
        return result, {"onCurveContacts":points}
    if recipe in ["calculus-tangent-given-slope", "calculus-tangent-parallel"]:
        result, contact_groups = [], []
        shared = "다음 곡선에 접하고 기울기가" in content
        groups = [(i,0) for i in range(1,len(pp))] if shared else [(i,i+1) for i in range(0,len(pp),2)]
        for pi, mi in groups:
            f = expr(pp[pi].removeprefix("y="))
            slope = s.diff(expr(pp[mi].removeprefix("y=")),x) if recipe.endswith("parallel") else expr(pp[mi])
            contacts = unique_real_roots(s.diff(f,x)-slope)
            assert contacts
            lines = [tangent(f,u) for u in contacts]
            assert all(same(s.diff(line,x),slope) for line in lines)
            result.append(lines); contact_groups.append([str(u) for u in contacts])
        return result, {"allRealContactGroups":contact_groups}
    if recipe == "calculus-cubic-no-extrema":
        result, discriminants = [], []
        for text in pp[1:]:
            f = expr(text.removeprefix("f(x)="))
            assert s.Poly(f,x).degree()==3 and s.Poly(f,x).LC()!=0
            disc = s.discriminant(s.diff(f,x),x)
            roots = s.solve(disc,a)
            assert len(roots)==2 and s.Poly(disc,a).LC()>0
            lo, hi = sorted(roots)
            result.append([("range",lo,hi,r"\leq","a")]); discriminants.append(str(disc))
        return result,{"derivativeDiscriminants":discriminants,"boundaryIncluded":True}
    if recipe == "calculus-interval-root-parameter":
        equation = expr(pp[0].removesuffix("=0")); lo,hi=coord(pp[1]); assert lo<hi
        image = s.solve(equation,k)[0]; derivative = s.diff(image,x)
        critical = unique_real_roots(derivative)
        assert not any(lo<z<hi for z in critical)
        assert not same(derivative,0)
        endpoints = sorted([image.subs(x,lo),image.subs(x,hi)])
        return [[("range",*endpoints,"<","k")]], {"openDomain":[str(lo),str(hi)],"monotoneCriticalRoots":[str(z) for z in critical]}
    if recipe == "calculus-functional-identity":
        point,value=fn_value(pp[3]); target=fn_arg(pp[4]); f=a*x*x+b*x+c
        identity=s.Poly(s.expand(f.subs(x,s.diff(f,x))-s.diff(f,x).subs(x,f)),x)
        branches=s.solve([*identity.all_coeffs(),f.subs(x,point)-value],(a,b,c),dict=True)
        branches=[z for z in branches if z[a]!=0]
        assert len(branches)==1
        f=f.subs(branches[0]); assert same(f.subs(x,s.diff(f,x)),s.diff(f,x).subs(x,f))
        return [[f.subs(x,target)]],{"uniqueQuadratic":str(f)}
    if recipe == "calculus-tangent-through-point":
        u,v=coord(pp[0]); f=expr(pp[1].removeprefix("y="))
        contacts=unique_real_roots(f+s.diff(f,x)*(u-x)-v); assert len(contacts)==1
        line=tangent(f,contacts[0]); assert same(line.subs(x,u),v) and s.diff(line,x)!=0
        intercept=s.solve(line,x); assert len(intercept)==1
        return [[intercept[0]]],{"allRealContacts":[str(z) for z in contacts],"tangent":str(line)}
    if recipe == "calculus-quadratic-mvt":
        f=expr(pp[0].removeprefix("f(x)=")); assert s.Poly(f,x).degree()==2
        expression=s.expand(f.subs(x,a)-f.subs(x,a-h)-h*s.diff(f,x).subs(x,a-k*h))
        result=s.solve(expression,k); assert result==[s.Rational(1,2)]
        return [result],{"equalityResidual":str(s.factor(expression)),"hPositive":True,"kInOpenUnitInterval":True}
    if recipe == "calculus-monic-cubic-limit-extremum":
        maximum=expr(pp[2].removeprefix("x=")); target=fn_arg(pp[4])
        match=re.fullmatch(r"\\lim_\{x\\to(.+)\}\\frac\{f\(x\)([+-].+)\}\{(.+)\}=(.+)",pp[3]); assert match
        point,value,slope=expr(match[1]),-expr(match[2]),expr(match[4])
        assert same(expr(match[3]),x-point)
        f=x**3+a*x*x+b*x+c
        coefficients=s.solve([s.diff(f,x).subs(x,maximum),f.subs(x,point)-value,s.diff(f,x).subs(x,point)-slope],(a,b,c),dict=True)
        assert len(coefficients)==1
        f=f.subs(coefficients[0]); second=s.diff(f,x,2).subs(x,maximum); assert second<0
        assert same(s.limit((f-value)/(x-point),x,point),slope)
        return [[f.subs(x,target)]],{"uniqueMonicCubic":str(f),"secondDerivativeAtMaximum":str(second)}
    if recipe == "calculus-closed-interval-extrema":
        lo,hi=coord(pp[0]); assert lo<hi
        f=expr(pp[1].removeprefix("f(x)=")); all_roots=unique_real_roots(s.diff(f,x))
        contacts=[z for z in all_roots if lo<=z<=hi]; points=sorted(set([lo,hi,*contacts]))
        values=[f.subs(x,z) for z in points]; maxv,minv=max(values),min(values)
        return [[maxv,minv] if len(pp)==2 else [maxv-minv]],{"allRealCriticalPoints":[str(z) for z in all_roots],"domainPoints":[str(z) for z in points],"domainValues":[str(z) for z in values]}
    if recipe == "calculus-velocity-parameter":
        f=expr(pp[3].removeprefix("x=")); time=expr(pp[4].removeprefix("t=")); assert time>=0
        velocity=s.diff(f,t); result=s.solve(velocity.subs(t,time)-expr(pp[6]),k); assert len(result)==1
        assert same(velocity.subs({t:time,k:result[0]}),expr(pp[6]))
        return [result],{"velocity":str(velocity),"nonnegativeTime":str(time)}
    if recipe == "calculus-antiderivative":
        f=s.diff(expr(pp[1]),x); return [[f.subs(x,fn_arg(pp[2]))]],{"differentiatedPrimitive":str(f)}
    if recipe == "calculus-ftc-parameter":
        match=re.fullmatch(r"f\(x\)=\\frac\{d\}\{dx\}\\int_\{(.+)\}\^\{x\}\((.+)\)dt",pp[0]); assert match
        integrand=expr(match[2]); lower=expr(match[1]); point,value=fn_value(pp[1]); target=fn_arg(pp[2])
        f=s.diff(s.integrate(integrand,(t,lower,x)),x)
        result=s.solve(f.subs(x,point)-value,a); assert len(result)==1
        f=f.subs(a,result[0]); assert same(f.subs(x,point),value)
        return [[f.subs(x,target)]],{"ftcFromActualIntegral":str(f),"parameter":str(result[0])}
    if recipe == "calculus-integral-identity":
        match=re.fullmatch(r"\\int_\{(.+)\}\^\{x\}f\(t\)dt=(.+)",pp[2]); assert match
        lower,p=expr(match[1]),expr(match[2]); assert p.subs(x,lower)==0
        f=s.diff(p,x); assert same(s.integrate(f.subs(x,t),(t,lower,x)),p)
        return [[f.subs(x,fn_arg(pp[3]))]],{"basepointZero":str(lower),"f":str(f)}
    if recipe == "calculus-continuity-cancel-limit":
        match=re.fullmatch(r"\\lim_\{x\\to(.+)\}\\frac\{\((.+)\)f\(x\)\}\{(.+)\}=(.+)",pp[2]); assert match
        point,numerator,denominator,value=map(expr,match.groups()); assert same(fn_arg(pp[3]),point)
        assert numerator.subs(x,point)==0 and denominator.subs(x,point)==0 and s.Poly(denominator,x).degree()==1
        factor=s.limit(numerator/denominator,x,point); assert factor!=0
        return [[value/factor]],{"cancelledPolynomial":str(s.cancel(numerator/denominator)),"nonzeroLimitFactor":str(factor)}
    if recipe == "calculus-symmetric-difference":
        f=expr(pp[0].removeprefix("f(x)="))
        match=re.fullmatch(r"\\lim_\{h\\to0\}\\frac\{f\(a\+h\)-f\(a-h\)\}\{h\}=(.+)",pp[1]); assert match
        quotient=s.limit((f.subs(x,a+h)-f.subs(x,a-h))/h,h,0)
        result=s.solve(quotient-expr(match[1]),a); assert len(result)==1
        assert same(quotient,2*s.diff(f,x).subs(x,a))
        return [result],{"actualSymmetricLimit":str(quotient)}
    if recipe == "calculus-product-identity-derivative":
        identity=re.fullmatch(r"\((.+)\)f\(x\)=\((.+)\)g\(x\)",pp[3]); assert identity
        given=re.fullmatch(r"f\((.+)\)=f'\((.+)\)=(.+)",pp[4]); assert given
        target=re.fullmatch(r"(.+)g\((.+)\)\+(.+)g'\((.+)\)",pp[5]); assert target
        point,value=expr(given[1]),expr(given[3]); assert all(same(expr(z),point) for z in [given[2],target[2],target[4]])
        numerator,denominator=expr(identity[1]),expr(identity[2]); assert denominator.subs(x,point)!=0
        # Independently differentiate the rational factor g=(P/Q)f instead of the TS product-equation arithmetic.
        ratio=numerator/denominator
        gv=ratio.subs(x,point)*value; gp=(s.diff(ratio,x)+ratio).subs(x,point)*value
        return [[expr(target[1])*gv+expr(target[3])*gp]],{"gAtPoint":str(gv),"gPrimeAtPoint":str(gp),"rationalFactorDerivative":str(s.factor(s.diff(ratio,x)))}
    if recipe == "calculus-braking-distance":
        f=expr(pp[2].removeprefix("x=")); assert f.subs(t,0)==0 and s.Poly(f,t).degree()==2
        velocity=s.diff(f,t); acceleration=s.diff(velocity,t)
        assert velocity.subs(t,0)>0 and acceleration<0
        stops=[z for z in unique_real_roots(velocity,t) if z>0]; assert len(stops)==1
        stop=stops[0]; assert s.integrate(velocity,(t,0,stop))==f.subs(t,stop)
        return [[acceleration+f.subs(t,stop)]],{"firstPositiveStop":str(stop),"acceleration":str(acceleration),"distance":str(f.subs(t,stop))}
    if recipe == "calculus-reverse-bound-integral":
        match=re.fullmatch(r"\\int_\{(.+)\}\^\{(.+)\}\((.+)\)dx-\\int_\{(.+)\}\^\{(.+)\}\((.+)\)dx=(.+)",pp[0]); assert match
        lo,hi,f,secondlo,secondhi,secondf,rhs=map(expr,match.groups())
        assert lo!=hi and lo==secondhi and hi==secondlo and same(f,secondf)
        actual=s.integrate(f,(x,lo,hi))-s.integrate(secondf,(x,secondlo,secondhi))
        result=s.solve(actual-rhs,k); assert len(result)==1 and same(actual.subs(k,result[0]),rhs)
        return [result],{"orientedTwoIntegralDifference":str(actual)}
    if recipe == "calculus-primitive-root-sum":
        u,v=coord(pp[2]); slope=expr(pp[4]); sumv=expr(pp[6]); f=s.integrate(slope,x)+c
        A=s.Poly(f,x).coeff_monomial(x*x); B=s.Poly(f,x).coeff_monomial(x)
        coefficients=s.solve([f.subs(x,u)-v,-B/A-sumv],(k,c),dict=True); assert len(coefficients)==1
        f=f.subs(coefficients[0]); assert s.discriminant(f,x)>=0 and same(s.diff(f,x),slope.subs(coefficients[0]))
        assert same(sum(unique_real_roots(f)),sumv)  # Here all roots are distinct, checked below.
        assert s.discriminant(f,x)>0
        return [[f]],{"primitive":str(f),"allRealRoots":[str(z) for z in unique_real_roots(f)],"vietaRootSum":str(sumv)}
    raise AssertionError(f"Unsupported calculus recipe: {recipe}")


def answer_groups(text):
    prose=re.sub(r"\$[^$]+\$",lambda m:" "*len(m[0]),text)
    labels=list(re.finditer(LABEL,prose))
    return [text[z.end():labels[i+1].start() if i+1<len(labels) else len(text)] for i,z in enumerate(labels)] if labels else [text]


def check_answer(answer, expected):
    groups=answer_groups(answer); assert len(groups)==len(expected), "Answer group count differs"
    count=0
    for text, values in zip(groups,expected):
        actual=parts(text); assert len(actual)==len(values), "Answer expression count differs"
        for value in values:
            def equal(text):
                if isinstance(value,tuple):
                    _,lo,hi,op,variable=value
                    endpoints=text.split(op)
                    return len(endpoints)==3 and endpoints[1]==variable and same(expr(endpoints[0]),lo) and same(expr(endpoints[2]),hi)
                return same(expr(re.sub(r"^(?:y=|f\(x\)=|k=|a=)","",text)),value)
            matches=[i for i,z in enumerate(actual) if equal(z)]; assert matches, f"Answer mismatch: {actual} vs {value}"
            actual.pop(matches[0]); count+=1
    return count


def main():
    input_path,output_path=map(Path,sys.argv[1:3]); raw=input_path.read_bytes(); packet=json.loads(raw)
    sources={z["id"]:z for z in packet["sources"]}; entries=[]; failures=[]; source_checks=[]
    for source in sources.values():
        candidate=next(z for z in packet["candidates"] if z["sourceId"]==source["id"])
        try:
            expected,facts=compute(source["content"],candidate["recipe"])
            count=check_answer(source["answer"],expected)
            source_checks.append({"sourceId":source["id"],"sourceExternalId":source.get("external_id"),"checkedAnswers":count,"facts":facts})
        except Exception as error: failures.append({"sourceId":source["id"],"stage":"source","error":str(error)})
    for candidate in packet["candidates"]:
        try:
            source=sources[candidate["sourceId"]]
            source_frame=re.sub(r"\s+","",re.sub(r"\$[^$]+\$","§",source["content"]))
            candidate_frame=re.sub(r"\s+","",re.sub(r"\$[^$]+\$","§",candidate["content"]))
            assert source_frame==candidate_frame and source["content"]!=candidate["content"]
            assert candidate["questionType"]==source["question_type"]
            expected,facts=compute(candidate["content"],candidate["recipe"])
            count=check_answer(candidate["answer"],expected)
            # Digest the full authored DTO (including solution) as evidence, without trusting proof metadata.
            entries.append({"externalId":candidate["externalId"],"sourceId":candidate["sourceId"],"sourceDigest":candidate["sourceDigest"],"questionSha256":hashlib.sha256(candidate["content"].encode()).hexdigest(),"answerSha256":hashlib.sha256(candidate["answer"].encode()).hexdigest(),"solutionSha256":hashlib.sha256(candidate["solution"].encode()).hexdigest(),"recipe":candidate["recipe"],"checkedAnswers":count,"facts":facts,"matched":True})
        except Exception as error: failures.append({"externalId":candidate["externalId"],"stage":"candidate","error":str(error)})
    report={"engine":"SymPy "+s.__version__,"kind":"independent recomputation from complete question conditions; no human verdict","inputSha256":hashlib.sha256(raw).hexdigest(),"candidateFileSha256":hashlib.sha256(raw).hexdigest(),"candidates":len(packet["candidates"]),"failedCandidates":sum(z["stage"]=="candidate" for z in failures),"sourcesChecked":len(source_checks),"candidatesChecked":len(entries),"answersChecked":sum(z["checkedAnswers"] for z in entries),"failures":failures,"sourceChecks":source_checks,"entries":entries}
    output_path.parent.mkdir(parents=True,exist_ok=True); output_path.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({key:report[key] for key in ["sourcesChecked","candidatesChecked","answersChecked","failures"]},ensure_ascii=False))
    if failures: raise SystemExit(1)


if __name__=="__main__": main()
