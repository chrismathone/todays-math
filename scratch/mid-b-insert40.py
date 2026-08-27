# -*- coding: utf-8 -*-
"""m2Rational.ts 의 `def("39"` 앞에 40~45 여섯 유형을 끼워 넣는다. (내 파일)

⚠️ 백슬래시가 많은 코드는 파이썬 인라인 문자열로 만들지 말 것 — 이 저장소가
   여러 번 데인 자리다. 여기서는 **읽어 들인 파일**을 잘라 붙이기만 한다.
"""
import io

SRC = "src/lib/middle/m2Rational.ts"
NEW = "scratch/mid-b-block40.ts.txt"

s = io.open(SRC, encoding="utf-8", newline="").read()
block = io.open(NEW, encoding="utf-8", newline="").read()
anchor = '  def(\n    "39",\n'
i = s.index(anchor)
s = s[:i] + block + s[i:]
io.open(SRC, "w", encoding="utf-8", newline="").write(s)
print("끼워 넣었다:", len(block), "자")
