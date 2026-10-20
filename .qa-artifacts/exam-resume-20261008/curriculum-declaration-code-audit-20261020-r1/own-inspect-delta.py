from pathlib import Path
import json
B=Path('.qa-artifacts/exam-resume-20261008');rd=lambda p:json.loads(p.read_text(encoding='utf-8-sig'))
def delta(x,y,p=''):
 if isinstance(x,dict)and isinstance(y,dict):
  return sum((delta(x.get(k),y.get(k),p+'/'+k)for k in sorted(set(x)|set(y))),[])
 if x==y:return[]
 return[{'path':p,'before':x,'after':y}]
for n in [1,2]:
 old=rd(B/f'gachang-first2-review-20261020-r1/package/private/q{n:02}/candidate.json');new=rd(B/f'gachang-first2-review-20261020-r2/package/private/q{n:02}/candidate.json');print(json.dumps({'n':n,'delta':delta(old,new)},ensure_ascii=False,indent=2))
