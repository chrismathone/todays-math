from pathlib import Path
import hashlib,json,shutil
P=Path(__file__).resolve().parent;R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');E=R/'vendor/figure-engine/core';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();assert sha(E/'figure_solid.py')=='2e6c3c44f496e38453250c7f1aa3c6d886fa5cbba3a54dc2398ca42184357293'
source=E/'figure_solid.py';s=source.read_text(encoding='utf-8-sig');pre='''    # Invalidate earlier success before any validation/calculation can fail.
    registry_key = (_fs._caller_scope(2), str(name))
    _fs._VERIFIED.pop(registry_key, None)

    def finite(*values):
        try:
            ok = all(not isinstance(v, bool) and math.isfinite(float(v)) for v in values)
        except (TypeError, ValueError, OverflowError):
            ok = False
        if not ok:
            raise SolidGeometryError("검산 값은 유한한 수여야 함")

    def point(p):
        q = _v(p)
        finite(*q)
        return q

    def segment(p, q):
        point(p); point(q)
        length = dist(p, q)
        finite(length)
        if length <= _EPS:
            raise SolidGeometryError("검산 선분은 비퇴화여야 함")

    def plane_ok(pl):
        if not isinstance(pl, Plane):
            raise SolidGeometryError("검산 평면은 Plane 이어야 함")
        point(pl.point); point(pl.normal)
        n = norm(pl.normal)
        finite(n)
        if not math.isclose(n, 1.0, rel_tol=1e-9, abs_tol=1e-9):
            raise SolidGeometryError("검산 평면 법선은 단위벡터여야 함")

    finite(tol, tol_deg, tol_abs)
    if min(tol, tol_deg, tol_abs) < 0:
        raise SolidGeometryError("검산 허용오차는 음수가 될 수 없음")
    for f2, p, pl in feet:
        point(f2); point(p); plane_ok(pl)
    for item in angles:
        finite(item[0])
        if not 0 <= float(item[0]) <= 90:
            raise SolidGeometryError("공간 각 라벨은 0~90도여야 함")
        if item[1] == "dihedral":
            plane_ok(item[2]); plane_ok(item[3])
        elif item[1] == "line":
            segment(item[2], item[3]); plane_ok(item[4])
        else:
            raise SolidGeometryError("angles kind 는 dihedral|line")
    for label, poly, pl in areas:
        plane_ok(pl)
        for p in poly: point(p)
        if label is not None:
            finite(label)
            if float(label) < 0:
                raise SolidGeometryError("정사영 넓이 라벨은 음수가 될 수 없음")
        measured = area(poly)
        finite(measured)
        if measured <= _EPS:
            raise SolidGeometryError("원래 다각형은 비퇴화여야 함")
    for value, p, q in lengths:
        finite(value)
        if float(value) <= 0:
            raise SolidGeometryError("길이 라벨은 양수여야 함")
        segment(p, q)
    for coeffs, pl in equations:
        finite(*coeffs); plane_ok(pl)
        if len(coeffs) != 4:
            raise SolidGeometryError("평면 방정식은 계수 4개여야 함")
        normal_length = norm(coeffs[:3])
        finite(normal_length)
        if normal_length <= _EPS:
            raise SolidGeometryError("평면 방정식 법선은 비퇴화여야 함")
    for (p, q), (r, t) in perpendicular:
        segment(p, q); segment(r, t)
    for p, pl in on_plane:
        point(p); plane_ok(pl)
    if view is not None:
        finite(view.scale, *view.origin)
        if view.scale <= 0:
            raise SolidGeometryError("View.scale 은 양수여야 함")
        for field in ("depth_ratio", "depth_deg", "elev", "azim"):
            if hasattr(view, field): finite(getattr(view, field))
        if hasattr(view, "depth_ratio") and view.depth_ratio < 0:
            raise SolidGeometryError("View.depth_ratio 는 음수가 될 수 없음")

'''
start=s.index('def verify_solid(');head=s[:start];body=s[start:];body=body.replace('    problems: list[str] = []\n',pre+'    problems: list[str] = []\n',1)
body=body.replace('        want = s * math.cos(math.radians(theta))','        want = s * math.cos(math.radians(theta))\n        finite(s, s2, theta, want)')
body=body.replace('if v > _EPS)', 'if v > 0)')
body=body.replace('        for desc, value, measured in items:', '        finite(k)\n        if k <= 0:\n            raise SolidGeometryError("길이 척도는 양수여야 함")\n        for desc, value, measured in items:')
body=body.replace('            if want <= _EPS:\n                continue','            finite(want)\n            if want <= 0:\n                raise SolidGeometryError("예상 길이는 양수여야 함")')
body=body.replace('_fs._VERIFIED[(_fs._caller_scope(2), str(name))] = checks','_fs._VERIFIED[registry_key] = checks')
# Catch nonfinite derived comparisons rather than permitting NaN/Infinity fallthrough.
for line in ['        d = dist(_v(f2), want)','        d = abs(plane.signed_distance(p))','        off = abs(want.signed_distance(plane.point))','        aligned = abs(dot(want.normal, plane.normal))','            drawn = dihedral_angle(item[2], item[3])','            drawn = line_plane_angle(item[2], item[3], item[4])','        c = abs(dot(unit(u), unit(w)))']:
 indent=len(line)-len(line.lstrip());var=line.strip().split(' = ')[0];body=body.replace(line,line+'\n'+' '*indent+'finite('+var+')')
candidate=head+body;(P/'own-figure_solid.py').write_text(candidate,encoding='utf-8');shadow=P/'own-shadow/core';shadow.mkdir(parents=True,exist_ok=True)
for n in ['__init__.py','figure_svg.py']:
 (shadow/n).write_bytes((E/n).read_bytes())
(shadow/'figure_solid.py').write_text(candidate,encoding='utf-8')
old=P.parent/'solid-verification-prechange-20261021-r1/own-controls.py';h=old.read_text(encoding='utf-8-sig').replace("E=R/'vendor/figure-engine'","E=P/'own-shadow'");(P/'own-original47.py').write_text(h,encoding='utf-8')
test=R/'.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/hangul-engine-import-20261021-r1/source-tests/test_figure_solid.py';(P/'own-existing-tests.py').write_bytes(test.read_bytes())
(P/'own-bindings.json').write_text(json.dumps({'baseline':{str(E/n):sha(E/n) for n in ['figure_solid.py','figure_svg.py','__init__.py']},'existingTest':{str(test):sha(test)},'candidateSHA256':sha(P/'own-figure_solid.py'),'original47SourceSHA256':sha(old),'publicHelpersBytePrefixUnchanged':candidate[:candidate.index('def verify_solid(')]==head},indent=2),encoding='utf-8');print('candidate prepared; public helpers unchanged')
