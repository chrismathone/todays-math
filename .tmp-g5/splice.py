"""옛 «열거 축» 블록을 새 «되짚기 축» 블록으로 통째로 바꾼다."""
import io

TARGET = "src/lib/elementary/g5.ts"
HEAD = " * 2-4 확대 갈래 «심화중»·«심화상» — D-113 파일럿"
TAIL = "/** 문형 05 — 소수점을 잠시 무시하고 곱한 수. 1보다 작은 소수×자연수. */"

src = io.open(TARGET, encoding="utf-8").read()
lines = src.split("\n")

start = next(i for i, l in enumerate(lines) if HEAD in l)
# 블록은 그 줄 바로 위의 `/* ───` 에서 시작한다
while not lines[start].lstrip().startswith("/*"):
    start -= 1
end = next(i for i, l in enumerate(lines) if l.startswith(TAIL))

block = io.open(".tmp-g5/newblock.ts", encoding="utf-8").read().rstrip("\n")
handlers = io.open(".tmp-g5/handlers.ts", encoding="utf-8").read().rstrip("\n")

new = lines[:start] + (block + "\n\n" + handlers + "\n").split("\n") + lines[end:]
io.open(TARGET, "w", encoding="utf-8", newline="").write("\n".join(new))
print(f"바꾼 줄 {start + 1}..{end} → 새 블록 {len((block + handlers).splitlines())}줄")
