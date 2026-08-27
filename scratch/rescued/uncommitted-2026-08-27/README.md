# 2026-08-27 밤, 이 컴퓨터에만 있던 미커밋 작업

원장님이 컴퓨터를 끄고 **다른 컴퓨터에서 이어**하시기로 해서, 그대로 두면
사라지는 것들을 여기 복사해 두었다. **원본은 안 건드렸다** — 그 작업을 하던
세션(claude PID 8824)이 그때까지 살아 있었기 때문이다. 이건 **사본**이다.

## 무엇인가

`toLoadRows` 적재 경로에 **초등 본문 가드**를 넣던 한 덩어리로 보인다.
넷이 한 변경이다:

| 파일 | 상태 | 비고 |
|---|---|---|
| `elementaryContentGuard.ts` | **새 파일**(39줄) | `src/lib/import/` 에 놓였던 것. git 에 사본이 없어 **되살릴 데가 없었다** |
| `apply-confirmed-grade-remediation.ts` | **새 파일**(172줄) | `scripts/classify/` |
| `tracked-changes.patch` | 패치 | `src/__tests__/unit/import.test.ts` · `src/lib/import/toLoadRows.ts` 의 미커밋 diff |
| `BRIEF-dim-outside.md` | 브리프 | `scratch/` 에 미추적으로 남아 있던 것 |

## ⚠️ 이 작업은 **미완이다**

패치 안의 `import.test.ts` 픽스처 두 자리가 **D-106 개명 잔재**를 달고 있다:

```
src/__tests__/unit/import.test.ts(384,11): Type '"mid"'  is not assignable to '"연산"|"기본"|"응용"|"심화"'
src/__tests__/unit/import.test.ts(413,11): Type '"easy"' is not assignable to '"연산"|"기본"|"응용"|"심화"'
```

그래서 이 상태로는 `npx tsc --noEmit` 과 `npx next build` 가 **막힌다.**
(2026-08-27 하루 종일 이 컴퓨터의 빌드를 막고 있던 것이 이 두 줄이다.
main 에는 커밋되지 않아 다른 컴퓨터에는 안 따라간다.)

## 되살리는 법

```bash
cp scratch/rescued/uncommitted-2026-08-27/elementaryContentGuard.ts src/lib/import/
cp scratch/rescued/uncommitted-2026-08-27/apply-confirmed-grade-remediation.ts scripts/classify/
git apply scratch/rescued/uncommitted-2026-08-27/tracked-changes.patch
# 그런 다음 위 두 줄을 유효한 난이도 값으로 고쳐야 tsc 가 0 이 된다
```

원장님이 「이 작업은 버린다」고 하시면 이 폴더째 지우면 된다.
