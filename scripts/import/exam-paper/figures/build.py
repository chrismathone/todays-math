# -*- coding: utf-8 -*-
"""그림 만들기 **한 줄기** — 차례가 곧 규칙이다.

  ① make_specs   스펙을 쓴다 (쓰는 자는 이것 하나)
  ② fit_print    지면 글자 크기에 맞춰 좌표 배율을 잡고 SVG 를 낸다
  ③ verify_specs 좌표가 지면에 적은 수와 맞는가
  ④ probe_labels 점 이름표가 제 점에서 멀리 밀리지 않았나 (원장님 2026-09-05)
  (원본 대조 시트 `pairsheet.py` 는 **저장소에 없다** — 그 도구는 학원 시험지
   갈무리를 읽는데, 남의 저작물이라 커밋하지 않는다. 대조가 필요하면 작업
   폴더에서 따로 돌린다.)

🔴 ①만 다시 돌리면 ②가 맞춰 놓은 배율이 **도로 풀린다**. 실제로 그렇게 해서
   고쳐 놓은 여섯 장이 조용히 되돌아갔고, 잡아 준 것은 ③뿐이었다.
   그래서 **낱개로 부르지 말고 이 파일을 부른다.**
"""
import pathlib
import subprocess
import sys

HERE = pathlib.Path(__file__).parent
for step in ("make_specs.py", "fit_print.py", "verify_specs.py",
             "probe_labels.py"):
    print(f"\n─── {step} ───")
    r = subprocess.run([sys.executable, str(HERE / step)])
    if r.returncode not in (0,):
        print(f"🔴 {step} 가 막았다 (종료 {r.returncode})")
        raise SystemExit(r.returncode)
print("\n✅ 네 단계 전부 통과")
