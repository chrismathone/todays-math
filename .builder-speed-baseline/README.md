# Builder speed의 변경 전 읽기 코드

기준 HEAD: `27b66e0ad5ce03e71bd5909fb161bd6d2057eb2a`.

중단된 작업에 이미 있던 다섯 파일을 보존했다. 대응하는 `src/lib/` 파일과
import 경로를 정규화한 본문이 모두 같다. 이 폴더 안의 다섯 읽기끼리 참조하도록
import만 바꿨고, Mac의 절대 경로는 상대 경로로 바꿨다. 제품 코드에서는 import하지 않는다.

- `bankSourceAvailability.ts`
- `bankSourceCounts.ts`
- `bankSourceQuestions.ts`
- `unifiedPreview.ts`
- `questionProjection.ts` (`src/lib/problem/`에 대응)

고정 스냅샷의 변경 전 재현:

```sh
BUILDER_SPEED_BASELINE=.builder-speed-baseline npx vitest run --configLoader runner src/__tests__/api/builderSpeedParity.test.ts -t preserves --maxWorkers=1
```

`builderSpeedPgliteParity.test.ts`는 이 코드와 변경 후 코드를 같은 로컬 PostgreSQL
픽스처에 직접 대조한다. `builderSpeedMeasure.test.ts`의 `BUILDER_SPEED_BASELINE`
설정으로 변경 전 측정도 재현한다. 어떤 시험도 공유 DB에 접속하지 않는다.
