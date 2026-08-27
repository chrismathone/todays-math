"""합동 소단원에 유형 하나를 더 붙인다 (일회용).

## 왜 10 이 아니라 11 인가

`2-2|작도와 합동|10`(두 삼각형이 합동이 되기 위한 조건)은 **이미 객관식**이다
(정답이 번호). 판정기는 시험지를 **단답형만으로** 조립하므로 그 유형은 풀에
못 들어가고, 소단원의 «갈래»가 10이 아니라 **9**가 된다.

→ **이미 객관식인 유형이 있는 소단원은 10개가 아니라 11개를 지어야 한다.**
   유형 수만 세면 이 자리가 안 보인다(「10유형인데 갈래가 9개」로만 나온다).
"""

from pathlib import Path

BLOCK = r'''
  def(
    MINOR_CONSTR,
    "76",
    "합동인 두 삼각형에서 나머지 변",
    SEC.합동,
    "응용",
    (rng): Body => {
      const s1 = intBetween(rng, 4, 13);
      const s2 = intBetween(rng, 4, 13);
      const s3 = intBetween(rng, 4, 13);
      const total = s1 + s2 + s3;
      return {
        content: `$\\triangle ABC$와 $\\triangle DEF$가 합동이고 $\\triangle DEF$의 둘레의 길이가 $${total}\\,\\mathrm{cm}$이다. $\\overline{AB}=${s1}\\,\\mathrm{cm}$, $\\overline{BC}=${s2}\\,\\mathrm{cm}$일 때, $\\overline{FD}$의 길이를 구하시오.`,
        answer: `$${s3}\\,\\mathrm{cm}$`,
        solution: `합동이므로 대응변의 길이가 각각 같아 $\\overline{DE}=${s1}$, $\\overline{EF}=${s2}\\,\\mathrm{cm}$이다.\n$\\overline{FD}=${total}-${s1}-${s2}=${s3}\\,\\mathrm{cm}$이다.`,
        facts: { s1, s2, s3, total },
      };
    },
  ),
'''

path = Path('src/lib/middle/m1Geo2.ts')
src = path.read_text('utf-8')
anchor = '''  def2(
    "삼각형의 성질",
    "70",'''
assert src.count(anchor) == 1
src = src.replace(anchor, BLOCK.strip() + '\n\n' + anchor)
path.write_text(src, encoding='utf-8', newline='')
print('ok')
