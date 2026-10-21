# ── O9: \mathrm{} 단위가 이탤릭/쪼개짐 (운암중 25-2 렌더 발각, 2026-08-11) ──
# ① 단일 소문자 ``\mathrm{m}`` → bare ``rm m`` 이면 `_stop_roman_bleed`(rm 뒤 단일
# 소문자를 번짐 피해 변수로 보고 ``it {}`` 로 감쌈, 2026-07-27)가 **rm 자기 피연산자**를
# 뒤집어 미터 단위가 이탤릭이 됐다. 중괄호로 감싸 스캐너가 건너뛰게 한다.
chk(latex_to_hwpeq(r"20\mathrm{m}") == "20 rm {m}", "O9 미터 단위 정자")
chk(latex_to_hwpeq(r"5\mathrm{m}") == "5 rm {m}", "O9 미터 단위 정자(짧은 수)")
chk("it" not in latex_to_hwpeq(r"x\mathrm{m}"), "O9 변수+미터 이탤릭 아님")
# g(그램)은 _UNITS 라 백틱 얇은 간격까지(= bare ``20g`` 와 동일 형태).
chk(latex_to_hwpeq(r"20\mathrm{g}") == "20 rm`g", "O9 그램 단위 백틱 통일")
# ② ``\mathrm{mL}`` 이 ``rm m rm`L``("m 리터")로 쪼개지던 것 — 이미 로만화된 런 안에서
# `_VAR_UNIT_RE` 가 앞글자 m 을 변수로, 끝 L 을 리터로 재해석했다.
chk(latex_to_hwpeq(r"100\mathrm{mL}") == "100 rm`mL", "O9 mL 쪼개짐 없음")
chk(latex_to_hwpeq("100mL") == "100 rm`mL", "O9 bare mL 쪼개짐 없음")
chk(latex_to_hwpeq(r"50\mathrm{dL}") == "50 rm`dL", "O9 dL 쪼개짐 없음")
# 무회귀: rm 번짐 차단(O2/ksy)·다문자 단위·모평균 m·대문자 라벨은 그대로.
chk("it {p}" in latex_to_hwpeq(r"\triangle ABC = p", italicize_stat=False),
    "O9 무회귀: rm 뒤 진짜 변수는 여전히 it 로 차단")
chk(latex_to_hwpeq(r"12\mathrm{cm}") == "12 rm`cm", "O9 무회귀: cm 백틱")
chk(latex_to_hwpeq("2m") == "2m", "O9 무회귀: 모평균 2m 이탤릭")
chk(latex_to_hwpeq(r"\overline{AL}", italicize_stat=False) == "bar {rm {AL}}",
    "O9 무회귀: 선분 AL(O8)")
# 복합 단위 km/h 의 분모 h 를 번짐 피해 변수로 오인해 it {h} 로 기울이던 것
# (경북사대부고 미적분 #19, 2026-09-18). 대문자 라벨 뒤 나눗셈 변수는 계속 차단.
chk(latex_to_hwpeq(r"x\mathrm{km/h}") == "x rm`km/h", "O9 km/h 분모 h 정자")
chk("it" not in latex_to_hwpeq(r"3\mathrm{m/s}"), "O9 m/s 분모 s 정자")
chk(" it " in latex_to_hwpeq(r"\mathrm{A}/x", italicize_stat=False),
    "O9 무회귀: rm 라벨 뒤 /x 는 이탤릭 복원")

