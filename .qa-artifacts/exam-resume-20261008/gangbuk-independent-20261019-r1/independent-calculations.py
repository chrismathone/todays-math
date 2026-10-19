import json, math
from pathlib import Path
root = Path(__file__).parent
student = json.loads((root / "blind/student-problems.json").read_text(encoding="utf-8"))[0]
# Exact integer arithmetic: principal square root is nonnegative.
sqrt81 = math.isqrt(81)
assert sqrt81 * sqrt81 == 81
abs_a = math.isqrt(sqrt81)
assert abs_a * abs_a == sqrt81
a = -abs_a
b = 7 - a
N = b * b
assert a < 0 and b > 0 and N > 0 and a*a == sqrt81 and a+b == 7
options = [int(text.strip("$")) for text in student["choices"]]
checks = []
for index, option in enumerate(options, 1):
    option_b = math.isqrt(option)
    assert option_b * option_b == option
    checks.append({"choice": index, "N": option, "positive_b": option_b,
                   "a_plus_b": a + option_b, "satisfies_all": a + option_b == 7})
assert sum(row["satisfies_all"] for row in checks) == 1
assert checks[3]["satisfies_all"]
print(json.dumps({"sqrt81": sqrt81, "a": a, "b": b, "N": N,
                  "choiceChecks": checks, "uniqueChoice": 4}, ensure_ascii=False, indent=2))
