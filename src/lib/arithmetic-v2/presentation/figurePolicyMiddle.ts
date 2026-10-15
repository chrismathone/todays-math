/** Display-only decisions audited against main 9356d1cb6 (2026-10-15).
 * Explicit census: every middle-school family that owns a canonical figure.
 * Do not mutate candidates, canonical SVGs, saved packs, answers or verification.
 * A true decision records an exact condition absent from the existing prose;
 * a false decision relies on the prose, including the instruction's target.
 * Unknown families must retain their original rendering in the consuming facade.
 */
type MiddleFigurePolicy = Readonly<{
  typeId: string;
  figureIdPrefix: string;
  showFigure: boolean;
  reason: string;
  instruction?: string;
}>;

export const MIDDLE_FIGURE_POLICY: readonly MiddleFigurePolicy[] = [
  {
    typeId: "m2-obtuse-circum-central-angle",
    figureIdPrefix: "gt1-m2-obtuse-circum-central-angle-",
    showFigure: false,
    reason:
      "문장에 외심, 필요한 예각·둔각·직각 구분, 주어진 각 또는 길이와 목표가 명시되어 외심의 성질만으로 계산된다.",
  },
  {
    typeId: "m2-obtuse-circum-vertex-angle",
    figureIdPrefix: "gt1-m2-obtuse-circum-vertex-angle-",
    showFigure: false,
    reason:
      "문장에 외심, 필요한 예각·둔각·직각 구분, 주어진 각 또는 길이와 목표가 명시되어 외심의 성질만으로 계산된다.",
  },
  {
    typeId: "m2-obtuse-circum-base-angle",
    figureIdPrefix: "gt1-m2-obtuse-circum-base-angle-",
    showFigure: false,
    reason:
      "문장에 외심, 필요한 예각·둔각·직각 구분, 주어진 각 또는 길이와 목표가 명시되어 외심의 성질만으로 계산된다.",
  },
  {
    typeId: "m2-circum-central-angle",
    figureIdPrefix: "gt1-m2-circum-central-angle-",
    showFigure: false,
    reason:
      "문장에 외심, 필요한 예각·둔각·직각 구분, 주어진 각 또는 길이와 목표가 명시되어 외심의 성질만으로 계산된다.",
  },
  {
    typeId: "m2-circum-vertex-angle",
    figureIdPrefix: "gt1-m2-circum-vertex-angle-",
    showFigure: false,
    reason:
      "문장에 외심, 필요한 예각·둔각·직각 구분, 주어진 각 또는 길이와 목표가 명시되어 외심의 성질만으로 계산된다.",
  },
  {
    typeId: "m2-circum-radius-base-angle",
    figureIdPrefix: "gt1-m2-circum-radius-base-angle-",
    showFigure: false,
    reason:
      "문장에 외심, 필요한 예각·둔각·직각 구분, 주어진 각 또는 길이와 목표가 명시되어 외심의 성질만으로 계산된다.",
  },
  {
    typeId: "m2-circum-base-central-angle",
    figureIdPrefix: "gt1-m2-circum-base-central-angle-",
    showFigure: false,
    reason:
      "문장에 외심, 필요한 예각·둔각·직각 구분, 주어진 각 또는 길이와 목표가 명시되어 외심의 성질만으로 계산된다.",
  },
  {
    typeId: "m2-circum-three-base-angles",
    figureIdPrefix: "gt1-m2-circum-three-base-angles-",
    showFigure: false,
    reason:
      "문장에 외심, 필요한 예각·둔각·직각 구분, 주어진 각 또는 길이와 목표가 명시되어 외심의 성질만으로 계산된다.",
  },
  {
    typeId: "m2-circum-equal-radii",
    figureIdPrefix: "gt1-m2-circum-equal-radii-",
    showFigure: false,
    reason:
      "문장에 외심, 필요한 예각·둔각·직각 구분, 주어진 각 또는 길이와 목표가 명시되어 외심의 성질만으로 계산된다.",
  },
  {
    typeId: "m2-right-circumradius",
    figureIdPrefix: "gt1-m2-right-circumradius-",
    showFigure: false,
    reason:
      "문장에 외심, 필요한 예각·둔각·직각 구분, 주어진 각 또는 길이와 목표가 명시되어 외심의 성질만으로 계산된다.",
  },
  {
    typeId: "m2-right-circum-diameter",
    figureIdPrefix: "gt1-m2-right-circum-diameter-",
    showFigure: false,
    reason:
      "문장에 외심, 필요한 예각·둔각·직각 구분, 주어진 각 또는 길이와 목표가 명시되어 외심의 성질만으로 계산된다.",
  },
  {
    typeId: "m2-incenter-half-angle",
    figureIdPrefix: "gt1-m2-incenter-half-angle-",
    showFigure: false,
    reason:
      "문장에 내심 및 필요한 각·반지름·넓이·둘레 또는 변의 길이와 목표가 모두 명시되어 내심의 성질로 계산된다.",
  },
  {
    typeId: "m2-incenter-whole-angle",
    figureIdPrefix: "gt1-m2-incenter-whole-angle-",
    showFigure: false,
    reason:
      "문장에 내심 및 필요한 각·반지름·넓이·둘레 또는 변의 길이와 목표가 모두 명시되어 내심의 성질로 계산된다.",
  },
  {
    typeId: "m2-incenter-central-angle",
    figureIdPrefix: "gt1-m2-incenter-central-angle-",
    showFigure: false,
    reason:
      "문장에 내심 및 필요한 각·반지름·넓이·둘레 또는 변의 길이와 목표가 모두 명시되어 내심의 성질로 계산된다.",
  },
  {
    typeId: "m2-incenter-inverse-angle",
    figureIdPrefix: "gt1-m2-incenter-inverse-angle-",
    showFigure: false,
    reason:
      "문장에 내심 및 필요한 각·반지름·넓이·둘레 또는 변의 길이와 목표가 모두 명시되어 내심의 성질로 계산된다.",
  },
  {
    typeId: "m2-incenter-three-half-angles",
    figureIdPrefix: "gt1-m2-incenter-three-half-angles-",
    showFigure: false,
    reason:
      "문장에 내심 및 필요한 각·반지름·넓이·둘레 또는 변의 길이와 목표가 모두 명시되어 내심의 성질로 계산된다.",
  },
  {
    typeId: "m2-iso-incenter-base-half",
    figureIdPrefix: "gt1-m2-iso-incenter-base-half-",
    showFigure: false,
    reason:
      "문장에 내심 및 필요한 각·반지름·넓이·둘레 또는 변의 길이와 목표가 모두 명시되어 내심의 성질로 계산된다.",
  },
  {
    typeId: "m2-incenter-area",
    figureIdPrefix: "gt1-m2-incenter-area-",
    showFigure: false,
    reason:
      "문장에 내심 및 필요한 각·반지름·넓이·둘레 또는 변의 길이와 목표가 모두 명시되어 내심의 성질로 계산된다.",
  },
  {
    typeId: "m2-incenter-radius",
    figureIdPrefix: "gt1-m2-incenter-radius-",
    showFigure: false,
    reason:
      "문장에 내심 및 필요한 각·반지름·넓이·둘레 또는 변의 길이와 목표가 모두 명시되어 내심의 성질로 계산된다.",
  },
  {
    typeId: "m2-incenter-perimeter",
    figureIdPrefix: "gt1-m2-incenter-perimeter-",
    showFigure: false,
    reason:
      "문장에 내심 및 필요한 각·반지름·넓이·둘레 또는 변의 길이와 목표가 모두 명시되어 내심의 성질로 계산된다.",
  },
  {
    typeId: "m2-incenter-part-area",
    figureIdPrefix: "gt1-m2-incenter-part-area-",
    showFigure: true,
    reason:
      "ID⊥BC만 있고 D가 BC 위라는 조건은 없다. 그림이 D를 수선의 발로 지정해야 ID가 삼각형 IBC의 높이가 된다.",
  },
  {
    typeId: "m2-incenter-right-radius",
    figureIdPrefix: "gt1-m2-incenter-right-radius-",
    showFigure: false,
    reason:
      "문장에 내심 및 필요한 각·반지름·넓이·둘레 또는 변의 길이와 목표가 모두 명시되어 내심의 성질로 계산된다.",
  },
  {
    typeId: "m2-centroid-vertex-from-short",
    figureIdPrefix: "gt1-m2-centroid-vertex-from-short-",
    showFigure: false,
    reason:
      "문장에 무게중심, 사용하는 중점·중선 또는 전체 넓이, 주어진 수와 목표가 명시되어 2:1 분할과 넓이 관계로 계산된다.",
  },
  {
    typeId: "m2-centroid-short-from-vertex",
    figureIdPrefix: "gt1-m2-centroid-short-from-vertex-",
    showFigure: false,
    reason:
      "문장에 무게중심, 사용하는 중점·중선 또는 전체 넓이, 주어진 수와 목표가 명시되어 2:1 분할과 넓이 관계로 계산된다.",
  },
  {
    typeId: "m2-centroid-vertex-from-median",
    figureIdPrefix: "gt1-m2-centroid-vertex-from-median-",
    showFigure: false,
    reason:
      "문장에 무게중심, 사용하는 중점·중선 또는 전체 넓이, 주어진 수와 목표가 명시되어 2:1 분할과 넓이 관계로 계산된다.",
  },
  {
    typeId: "m2-centroid-short-from-median",
    figureIdPrefix: "gt1-m2-centroid-short-from-median-",
    showFigure: false,
    reason:
      "문장에 무게중심, 사용하는 중점·중선 또는 전체 넓이, 주어진 수와 목표가 명시되어 2:1 분할과 넓이 관계로 계산된다.",
  },
  {
    typeId: "m2-centroid-median-from-vertex",
    figureIdPrefix: "gt1-m2-centroid-median-from-vertex-",
    showFigure: false,
    reason:
      "문장에 무게중심, 사용하는 중점·중선 또는 전체 넓이, 주어진 수와 목표가 명시되어 2:1 분할과 넓이 관계로 계산된다.",
  },
  {
    typeId: "m2-centroid-median-from-short",
    figureIdPrefix: "gt1-m2-centroid-median-from-short-",
    showFigure: false,
    reason:
      "문장에 무게중심, 사용하는 중점·중선 또는 전체 넓이, 주어진 수와 목표가 명시되어 2:1 분할과 넓이 관계로 계산된다.",
  },
  {
    typeId: "m2-centroid-area-3",
    figureIdPrefix: "gt1-m2-centroid-area-3-",
    showFigure: false,
    reason:
      "문장에 무게중심, 사용하는 중점·중선 또는 전체 넓이, 주어진 수와 목표가 명시되어 2:1 분할과 넓이 관계로 계산된다.",
  },
  {
    typeId: "m2-centroid-area-6",
    figureIdPrefix: "gt1-m2-centroid-area-6-",
    showFigure: false,
    reason:
      "문장에 무게중심, 사용하는 중점·중선 또는 전체 넓이, 주어진 수와 목표가 명시되어 2:1 분할과 넓이 관계로 계산된다.",
  },
  {
    typeId: "m2-iso-bisector-angle",
    figureIdPrefix: "gt1-m2-iso-bisector-angle-",
    showFigure: true,
    reason:
      "AD가 꼭지각 이등분선이라는 조건만으로 D의 위치는 정해지지 않는다. 그림이 D가 BC 위임을 지정해야 ∠ABD가 밑각이 된다.",
  },
  {
    typeId: "m2-iso-bisector-base",
    figureIdPrefix: "gt1-m2-iso-bisector-base-",
    showFigure: true,
    reason:
      "AD가 꼭지각 이등분선이라는 조건만으로 D가 BC의 중점은 아니다. 그림의 D∈BC가 있어야 BD의 두 배가 BC이다.",
  },
  {
    typeId: "m2-iso-bisector-half-base",
    figureIdPrefix: "gt1-m2-iso-bisector-half-base-",
    showFigure: true,
    reason:
      "AD가 꼭지각 이등분선이라는 조건만으로 D가 BC의 중점은 아니다. 그림의 D∈BC가 있어야 BD가 BC의 절반이다.",
  },
  {
    typeId: "m2-triangle-midsegment",
    figureIdPrefix: "gt1-m2-triangle-midsegment-",
    showFigure: false,
    reason:
      "문장이 각 중점이 놓인 변과 주어진 길이·넓이·둘레 및 목표를 지정하므로 중점·중선 관계만으로 계산된다.",
  },
  {
    typeId: "m2-midsegment-to-base",
    figureIdPrefix: "gt1-m2-midsegment-to-base-",
    showFigure: false,
    reason:
      "문장이 각 중점이 놓인 변과 주어진 길이·넓이·둘레 및 목표를 지정하므로 중점·중선 관계만으로 계산된다.",
  },
  {
    typeId: "m2-midsegment-area-small",
    figureIdPrefix: "gt1-m2-midsegment-area-small-",
    showFigure: false,
    reason:
      "문장이 각 중점이 놓인 변과 주어진 길이·넓이·둘레 및 목표를 지정하므로 중점·중선 관계만으로 계산된다.",
  },
  {
    typeId: "m2-midsegment-area-remainder",
    figureIdPrefix: "gt1-m2-midsegment-area-remainder-",
    showFigure: false,
    reason:
      "문장이 각 중점이 놓인 변과 주어진 길이·넓이·둘레 및 목표를 지정하므로 중점·중선 관계만으로 계산된다.",
  },
  {
    typeId: "m2-trapezoid-midline",
    figureIdPrefix: "gt1-m2-trapezoid-midline-",
    showFigure: false,
    reason:
      "문장에 사다리꼴의 평행한 변, 필요한 중점·분할비·같은 변 조건, 주어진 수와 목표가 명시되어 있다.",
  },
  {
    typeId: "m2-trapezoid-base",
    figureIdPrefix: "gt1-m2-trapezoid-base-",
    showFigure: false,
    reason:
      "문장에 사다리꼴의 평행한 변, 필요한 중점·분할비·같은 변 조건, 주어진 수와 목표가 명시되어 있다.",
  },
  {
    typeId: "m2-trapezoid-diagonal-midpoints",
    figureIdPrefix: "gt1-m2-trapezoid-diagonal-midpoints-",
    showFigure: false,
    reason:
      "문장에 사다리꼴의 평행한 변, 필요한 중점·분할비·같은 변 조건, 주어진 수와 목표가 명시되어 있다.",
  },
  {
    typeId: "m2-similarity-ratio-power-1",
    figureIdPrefix: "gt1-m2-similarity-ratio-power-1-",
    showFigure: false,
    reason:
      "문장이 닮음의 대응 순서, 비의 방향, 주어진 길이·넓이·부피·둘레와 목표를 모두 지정한다.",
  },
  {
    typeId: "m2-similarity-length-enlarge",
    figureIdPrefix: "gt1-m2-similarity-length-enlarge-",
    showFigure: false,
    reason:
      "문장이 닮음의 대응 순서, 비의 방향, 주어진 길이·넓이·부피·둘레와 목표를 모두 지정한다.",
  },
  {
    typeId: "m2-similarity-length-reduce",
    figureIdPrefix: "gt1-m2-similarity-length-reduce-",
    showFigure: false,
    reason:
      "문장이 닮음의 대응 순서, 비의 방향, 주어진 길이·넓이·부피·둘레와 목표를 모두 지정한다.",
  },
  {
    typeId: "m2-similarity-ratio-power-2",
    figureIdPrefix: "gt1-m2-similarity-ratio-power-2-",
    showFigure: false,
    reason:
      "문장이 닮음의 대응 순서, 비의 방향, 주어진 길이·넓이·부피·둘레와 목표를 모두 지정한다.",
  },
  {
    typeId: "m2-similarity-length-from-power-2",
    figureIdPrefix: "gt1-m2-similarity-length-from-power-2-",
    showFigure: false,
    reason:
      "문장이 닮음의 대응 순서, 비의 방향, 주어진 길이·넓이·부피·둘레와 목표를 모두 지정한다.",
  },
  {
    typeId: "m2-similarity-area-enlarge",
    figureIdPrefix: "gt1-m2-similarity-area-enlarge-",
    showFigure: false,
    reason:
      "문장이 닮음의 대응 순서, 비의 방향, 주어진 길이·넓이·부피·둘레와 목표를 모두 지정한다.",
  },
  {
    typeId: "m2-similarity-area-reduce",
    figureIdPrefix: "gt1-m2-similarity-area-reduce-",
    showFigure: false,
    reason:
      "문장이 닮음의 대응 순서, 비의 방향, 주어진 길이·넓이·부피·둘레와 목표를 모두 지정한다.",
  },
  {
    typeId: "m2-similarity-ratio-power-3",
    figureIdPrefix: "gt1-m2-similarity-ratio-power-3-",
    showFigure: false,
    reason:
      "문장이 닮음의 대응 순서, 비의 방향, 주어진 길이·넓이·부피·둘레와 목표를 모두 지정한다.",
  },
  {
    typeId: "m2-similarity-length-from-power-3",
    figureIdPrefix: "gt1-m2-similarity-length-from-power-3-",
    showFigure: false,
    reason:
      "문장이 닮음의 대응 순서, 비의 방향, 주어진 길이·넓이·부피·둘레와 목표를 모두 지정한다.",
  },
  {
    typeId: "m2-similarity-volume-enlarge",
    figureIdPrefix: "gt1-m2-similarity-volume-enlarge-",
    showFigure: false,
    reason:
      "문장이 닮음의 대응 순서, 비의 방향, 주어진 길이·넓이·부피·둘레와 목표를 모두 지정한다.",
  },
  {
    typeId: "m2-similarity-volume-reduce",
    figureIdPrefix: "gt1-m2-similarity-volume-reduce-",
    showFigure: false,
    reason:
      "문장이 닮음의 대응 순서, 비의 방향, 주어진 길이·넓이·부피·둘레와 목표를 모두 지정한다.",
  },
  {
    typeId: "m2-similarity-perimeter",
    figureIdPrefix: "gt1-m2-similarity-perimeter-",
    showFigure: false,
    reason:
      "문장이 닮음의 대응 순서, 비의 방향, 주어진 길이·넓이·부피·둘레와 목표를 모두 지정한다.",
  },
  {
    typeId: "m2-parallel-triangle-side-part",
    figureIdPrefix: "gt1-m2-parallel-triangle-side-part-",
    showFigure: false,
    reason:
      "문장에 평행선, 각 점이 놓인 직선·변과 순서, 주어진 선분 및 목표가 모두 명시되어 비례 관계를 정할 수 있다.",
  },
  {
    typeId: "m2-parallel-triangle-base",
    figureIdPrefix: "gt1-m2-parallel-triangle-base-",
    showFigure: false,
    reason:
      "문장에 평행선, 각 점이 놓인 직선·변과 순서, 주어진 선분 및 목표가 모두 명시되어 비례 관계를 정할 수 있다.",
  },
  {
    typeId: "m2-parallel-triangle-whole-side",
    figureIdPrefix: "gt1-m2-parallel-triangle-whole-side-",
    showFigure: false,
    reason:
      "문장에 평행선, 각 점이 놓인 직선·변과 순서, 주어진 선분 및 목표가 모두 명시되어 비례 관계를 정할 수 있다.",
  },
  {
    typeId: "m2-triangle-bisector-segment",
    figureIdPrefix: "gt1-m2-triangle-bisector-segment-",
    showFigure: false,
    reason:
      "문장이 이등분하는 각, 점이 놓인 변 또는 연장 방향, 주어진 길이와 목표를 모두 지정한다.",
  },
  {
    typeId: "m2-parallelogram-adjacent",
    figureIdPrefix: "gt1-m2-parallelogram-adjacent-",
    showFigure: false,
    reason:
      "문장에 사각형의 종류, 필요한 대각선의 교점, 주어진 각·길이·넓이 및 목표가 명시되어 있다.",
  },
  {
    typeId: "m2-parallelogram-diagonal-half",
    figureIdPrefix: "gt1-m2-parallelogram-diagonal-half-",
    showFigure: false,
    reason:
      "문장에 사각형의 종류, 필요한 대각선의 교점, 주어진 각·길이·넓이 및 목표가 명시되어 있다.",
  },
  {
    typeId: "m2-parallelogram-diagonal-whole",
    figureIdPrefix: "gt1-m2-parallelogram-diagonal-whole-",
    showFigure: false,
    reason:
      "문장에 사각형의 종류, 필요한 대각선의 교점, 주어진 각·길이·넓이 및 목표가 명시되어 있다.",
  },
  {
    typeId: "m2-parallelogram-area-quarter",
    figureIdPrefix: "gt1-m2-parallelogram-area-quarter-",
    showFigure: false,
    reason:
      "문장에 사각형의 종류, 필요한 대각선의 교점, 주어진 각·길이·넓이 및 목표가 명시되어 있다.",
  },
  {
    typeId: "m2-rectangle-diagonal-half",
    figureIdPrefix: "gt1-m2-rectangle-diagonal-half-",
    showFigure: false,
    reason:
      "문장에 사각형의 종류, 필요한 대각선의 교점, 주어진 각·길이·넓이 및 목표가 명시되어 있다.",
  },
  {
    typeId: "m2-rhombus-diagonal-angle",
    figureIdPrefix: "gt1-m2-rhombus-diagonal-angle-",
    showFigure: false,
    reason:
      "문장에 사각형의 종류, 필요한 대각선의 교점, 주어진 각·길이·넓이 및 목표가 명시되어 있다.",
  },
  {
    typeId: "m2-isosceles-trapezoid-angle",
    figureIdPrefix: "gt1-m2-isosceles-trapezoid-angle-",
    showFigure: false,
    reason:
      "문장에 사다리꼴의 평행한 변, 필요한 중점·분할비·같은 변 조건, 주어진 수와 목표가 명시되어 있다.",
  },
  {
    typeId: "m2-pythagoras-hypotenuse-integer",
    figureIdPrefix: "gt1-m2-pythagoras-hypotenuse-integer-",
    showFigure: false,
    reason:
      "문장에 직각·직사각형·이등변삼각형·마름모의 종류와 필요한 변, 대각선 또는 높이인 목표가 명시되어 피타고라스 관계를 정할 수 있다.",
  },
  {
    typeId: "m2-pythagoras-leg-integer",
    figureIdPrefix: "gt1-m2-pythagoras-leg-integer-",
    showFigure: false,
    reason:
      "문장에 직각·직사각형·이등변삼각형·마름모의 종류와 필요한 변, 대각선 또는 높이인 목표가 명시되어 피타고라스 관계를 정할 수 있다.",
  },
  {
    typeId: "m2-pythagoras-rectangle-diagonal-integer",
    figureIdPrefix: "gt1-m2-pythagoras-rectangle-diagonal-integer-",
    showFigure: false,
    reason:
      "문장에 직각·직사각형·이등변삼각형·마름모의 종류와 필요한 변, 대각선 또는 높이인 목표가 명시되어 피타고라스 관계를 정할 수 있다.",
  },
  {
    typeId: "m2-pythagoras-rectangle-side-integer",
    figureIdPrefix: "gt1-m2-pythagoras-rectangle-side-integer-",
    showFigure: false,
    reason:
      "문장에 직각·직사각형·이등변삼각형·마름모의 종류와 필요한 변, 대각선 또는 높이인 목표가 명시되어 피타고라스 관계를 정할 수 있다.",
  },
  {
    typeId: "m2-pythagoras-isosceles-height-integer",
    figureIdPrefix: "gt1-m2-pythagoras-isosceles-height-integer-",
    showFigure: false,
    reason:
      "문장에 직각·직사각형·이등변삼각형·마름모의 종류와 필요한 변, 대각선 또는 높이인 목표가 명시되어 피타고라스 관계를 정할 수 있다.",
  },
  {
    typeId: "m2-pythagoras-rhombus-side-integer",
    figureIdPrefix: "gt1-m2-pythagoras-rhombus-side-integer-",
    showFigure: false,
    reason:
      "문장에 직각·직사각형·이등변삼각형·마름모의 종류와 필요한 변, 대각선 또는 높이인 목표가 명시되어 피타고라스 관계를 정할 수 있다.",
  },
  {
    typeId: "m3-pythagoras-hypotenuse-surd",
    figureIdPrefix: "gt1-m3-pythagoras-hypotenuse-surd-",
    showFigure: false,
    reason:
      "문장에 직각·직사각형·이등변삼각형·마름모의 종류와 필요한 변, 대각선 또는 높이인 목표가 명시되어 피타고라스 관계를 정할 수 있다.",
  },
  {
    typeId: "m3-pythagoras-leg-surd",
    figureIdPrefix: "gt1-m3-pythagoras-leg-surd-",
    showFigure: false,
    reason:
      "문장에 직각·직사각형·이등변삼각형·마름모의 종류와 필요한 변, 대각선 또는 높이인 목표가 명시되어 피타고라스 관계를 정할 수 있다.",
  },
  {
    typeId: "m3-pythagoras-rectangle-diagonal-surd",
    figureIdPrefix: "gt1-m3-pythagoras-rectangle-diagonal-surd-",
    showFigure: false,
    reason:
      "문장에 직각·직사각형·이등변삼각형·마름모의 종류와 필요한 변, 대각선 또는 높이인 목표가 명시되어 피타고라스 관계를 정할 수 있다.",
  },
  {
    typeId: "m3-pythagoras-rectangle-side-surd",
    figureIdPrefix: "gt1-m3-pythagoras-rectangle-side-surd-",
    showFigure: false,
    reason:
      "문장에 직각·직사각형·이등변삼각형·마름모의 종류와 필요한 변, 대각선 또는 높이인 목표가 명시되어 피타고라스 관계를 정할 수 있다.",
  },
  {
    typeId: "m3-pythagoras-isosceles-height-surd",
    figureIdPrefix: "gt1-m3-pythagoras-isosceles-height-surd-",
    showFigure: false,
    reason:
      "문장에 직각·직사각형·이등변삼각형·마름모의 종류와 필요한 변, 대각선 또는 높이인 목표가 명시되어 피타고라스 관계를 정할 수 있다.",
  },
  {
    typeId: "m3-pythagoras-rhombus-side-surd",
    figureIdPrefix: "gt1-m3-pythagoras-rhombus-side-surd-",
    showFigure: false,
    reason:
      "문장에 직각·직사각형·이등변삼각형·마름모의 종류와 필요한 변, 대각선 또는 높이인 목표가 명시되어 피타고라스 관계를 정할 수 있다.",
  },
  {
    typeId: "m2-right-radius-from-legs",
    figureIdPrefix: "gt1-m2-right-radius-from-legs-",
    showFigure: false,
    reason:
      "문장에 직각의 꼭짓점, 외심, 두 직각변과 외접원 반지름이라는 목표가 명시되어 있다.",
  },
  {
    typeId: "m2-right-triangle-height",
    figureIdPrefix: "gt1-m2-right-triangle-height-",
    showFigure: true,
    reason:
      "BD⊥AC만 있고 D∈AC는 명시되지 않는다. 그림이 D를 빗변 위 수선의 발로 지정한다.",
  },
  {
    typeId: "m2-right-triangle-projection",
    figureIdPrefix: "gt1-m2-right-triangle-projection-",
    showFigure: true,
    reason:
      "BD⊥AC만 있고 D∈AC는 명시되지 않는다. 그림이 D를 빗변 위 수선의 발로 지정해야 AD가 정사영 길이가 된다.",
  },
  {
    typeId: "m2-right-triangle-area",
    figureIdPrefix: "gt1-m2-right-triangle-area-",
    showFigure: false,
    reason:
      "문장에 직각의 꼭짓점, 한 직각변과 빗변, 전체 삼각형 넓이라는 목표가 있다. D의 위치는 이 계산에 필요하지 않다.",
  },
  {
    typeId: "m2-right-altitude-product",
    figureIdPrefix: "gt1-m2-right-altitude-product-",
    showFigure: true,
    reason:
      "BD⊥AC만 있고 D∈AC는 명시되지 않는다. 그림이 AD와 DC가 빗변을 나누는 두 부분임을 지정한다.",
  },
  {
    typeId: "m3-right-leg-product",
    figureIdPrefix: "gt1-m3-right-leg-product-",
    showFigure: true,
    reason:
      "BD⊥AC만 있고 D∈AC는 명시되지 않는다. 그림이 D를 빗변 위 수선의 발로 지정해야 AD가 정사영 길이가 된다.",
  },
  {
    typeId: "m2-centroid-median-sum",
    figureIdPrefix: "gt1-m2-centroid-median-sum-",
    showFigure: false,
    reason:
      "문장에 무게중심, 사용하는 중점·중선 또는 전체 넓이, 주어진 수와 목표가 명시되어 2:1 분할과 넓이 관계로 계산된다.",
  },
  {
    typeId: "m2-triangle-median-area",
    figureIdPrefix: "gt1-m2-triangle-median-area-",
    showFigure: false,
    reason:
      "문장이 각 중점이 놓인 변과 주어진 길이·넓이·둘레 및 목표를 지정하므로 중점·중선 관계만으로 계산된다.",
  },
  {
    typeId: "m2-same-height-area-ratio",
    figureIdPrefix: "gt1-m2-same-height-area-ratio-",
    showFigure: false,
    reason:
      "문장이 D∈BC, BD와 DC의 길이, 삼각형 ABD의 넓이와 목표 ADC를 지정하여 같은 높이를 보장한다.",
  },
  {
    typeId: "m2-three-parallel-segments",
    figureIdPrefix: "gt1-m2-three-parallel-segments-",
    showFigure: false,
    reason:
      "문장에 평행선, 각 점이 놓인 직선·변과 순서, 주어진 선분 및 목표가 모두 명시되어 비례 관계를 정할 수 있다.",
  },
  {
    typeId: "m2-trapezoid-parallel-section",
    figureIdPrefix: "gt1-m2-trapezoid-parallel-section-",
    showFigure: false,
    reason:
      "문장에 사다리꼴의 평행한 변, 필요한 중점·분할비·같은 변 조건, 주어진 수와 목표가 명시되어 있다.",
  },
  {
    typeId: "m2-external-bisector-part",
    figureIdPrefix: "gt1-m2-external-bisector-part-",
    showFigure: false,
    reason:
      "문장이 이등분하는 각, 점이 놓인 변 또는 연장 방향, 주어진 길이와 목표를 모두 지정한다.",
  },
  {
    typeId: "m2-external-bisector-base",
    figureIdPrefix: "gt1-m2-external-bisector-base-",
    showFigure: false,
    reason:
      "문장이 이등분하는 각, 점이 놓인 변 또는 연장 방향, 주어진 길이와 목표를 모두 지정한다.",
  },
  {
    typeId: "m2-midpoint-triangle-perimeter-part",
    figureIdPrefix: "gt1-m2-midpoint-triangle-perimeter-part-",
    showFigure: false,
    reason:
      "문장이 각 중점이 놓인 변과 주어진 길이·넓이·둘레 및 목표를 지정하므로 중점·중선 관계만으로 계산된다.",
  },
  {
    typeId: "m2-midpoint-triangle-perimeter-whole",
    figureIdPrefix: "gt1-m2-midpoint-triangle-perimeter-whole-",
    showFigure: false,
    reason:
      "문장이 각 중점이 놓인 변과 주어진 길이·넓이·둘레 및 목표를 지정하므로 중점·중선 관계만으로 계산된다.",
  },
  {
    typeId: "m1-parallel-angle",
    figureIdPrefix: "gm-m1-parallel-angle-",
    showFigure: true,
    reason:
      "평행 관계와 각도만으로는 두 표시각이 동위각인지 보각인지 정해지지 않는다. 그림이 횡단선의 두 반직선과 목표 각의 위치를 지정한다.",
  },
  {
    typeId: "m1-triangle-exterior",
    figureIdPrefix: "gm-m1-triangle-exterior-",
    showFigure: false,
    reason:
      "문장에 외각에서 떨어진 두 내각과 외각이라는 목표가 있어 외각의 크기가 유일하게 정해진다.",
    instruction: "외각의 크기를 구하세요.",
  },
  {
    typeId: "m1-triangle-interior-exterior",
    figureIdPrefix: "gm-m1-triangle-interior-exterior-",
    showFigure: true,
    reason:
      "문장은 외각과 떨어진 한 내각만 주며 C가 나머지 떨어진 내각이라는 위치를 명시하지 않는다. 그림이 C의 위치를 지정한다.",
  },
  {
    typeId: "m1-polygon-sum",
    figureIdPrefix: "gm-m1-polygon-sum-",
    showFigure: false,
    reason:
      "문장에 다각형의 변 수와 정다각형 여부 또는 한 꼭짓점에서 대각선을 모두 긋는 조건, 구할 개수·각이 명시되어 있다.",
  },
  {
    typeId: "m1-polygon-interior",
    figureIdPrefix: "gm-m1-polygon-interior-",
    showFigure: false,
    reason:
      "문장에 다각형의 변 수와 정다각형 여부 또는 한 꼭짓점에서 대각선을 모두 긋는 조건, 구할 개수·각이 명시되어 있다.",
    instruction: "한 내각의 크기를 구하세요.",
  },
  {
    typeId: "m1-polygon-exterior",
    figureIdPrefix: "gm-m1-polygon-exterior-",
    showFigure: false,
    reason:
      "문장에 다각형의 변 수와 정다각형 여부 또는 한 꼭짓점에서 대각선을 모두 긋는 조건, 구할 개수·각이 명시되어 있다.",
    instruction: "한 외각의 크기를 구하세요.",
  },
  {
    typeId: "m1-polygon-diagonals",
    figureIdPrefix: "gm-m1-polygon-diagonals-",
    showFigure: false,
    reason:
      "문장에 다각형의 변 수와 정다각형 여부 또는 한 꼭짓점에서 대각선을 모두 긋는 조건, 구할 개수·각이 명시되어 있다.",
  },
  {
    typeId: "m1-circle-circumference",
    figureIdPrefix: "gm-m1-circle-circumference-",
    showFigure: false,
    reason: "문장에 원의 반지름 또는 원주와 구할 양이 모두 명시되어 있다.",
  },
  {
    typeId: "m1-circle-area",
    figureIdPrefix: "gm-m1-circle-area-",
    showFigure: false,
    reason:
      "문장에 원·부채꼴의 종류, 반지름·중심각·호·넓이 중 필요한 수와 구할 양이 모두 명시되어 있다.",
  },
  {
    typeId: "m1-circle-radius-circumference",
    figureIdPrefix: "gm-m1-circle-radius-circumference-",
    showFigure: false,
    reason: "문장에 원의 반지름 또는 원주와 구할 양이 모두 명시되어 있다.",
  },
  {
    typeId: "m1-circle-radius-area",
    figureIdPrefix: "gm-m1-circle-radius-area-",
    showFigure: false,
    reason:
      "문장에 원·부채꼴의 종류, 반지름·중심각·호·넓이 중 필요한 수와 구할 양이 모두 명시되어 있다.",
  },
  {
    typeId: "m1-sector-arc",
    figureIdPrefix: "gm-m1-sector-arc-",
    showFigure: false,
    reason:
      "문장에 원·부채꼴의 종류, 반지름·중심각·호·넓이 중 필요한 수와 구할 양이 모두 명시되어 있다.",
  },
  {
    typeId: "m1-sector-area",
    figureIdPrefix: "gm-m1-sector-area-",
    showFigure: false,
    reason:
      "문장에 원·부채꼴의 종류, 반지름·중심각·호·넓이 중 필요한 수와 구할 양이 모두 명시되어 있다.",
  },
  {
    typeId: "m1-sector-perimeter",
    figureIdPrefix: "gm-m1-sector-perimeter-",
    showFigure: false,
    reason:
      "문장에 원·부채꼴의 종류, 반지름·중심각·호·넓이 중 필요한 수와 구할 양이 모두 명시되어 있다.",
  },
  {
    typeId: "m1-sector-angle-arc",
    figureIdPrefix: "gm-m1-sector-angle-arc-",
    showFigure: false,
    reason:
      "문장에 원·부채꼴의 종류, 반지름·중심각·호·넓이 중 필요한 수와 구할 양이 모두 명시되어 있다.",
  },
  {
    typeId: "m1-sector-angle-area",
    figureIdPrefix: "gm-m1-sector-angle-area-",
    showFigure: false,
    reason:
      "문장에 원·부채꼴의 종류, 반지름·중심각·호·넓이 중 필요한 수와 구할 양이 모두 명시되어 있다.",
  },
  {
    typeId: "m1-sector-radius-arc",
    figureIdPrefix: "gm-m1-sector-radius-arc-",
    showFigure: false,
    reason:
      "문장에 원·부채꼴의 종류, 반지름·중심각·호·넓이 중 필요한 수와 구할 양이 모두 명시되어 있다.",
  },
  {
    typeId: "m1-sector-radius-area",
    figureIdPrefix: "gm-m1-sector-radius-area-",
    showFigure: false,
    reason:
      "문장에 원·부채꼴의 종류, 반지름·중심각·호·넓이 중 필요한 수와 구할 양이 모두 명시되어 있다.",
  },
  {
    typeId: "m1-sector-area-arc",
    figureIdPrefix: "gm-m1-sector-area-arc-",
    showFigure: false,
    reason:
      "문장에 원·부채꼴의 종류, 반지름·중심각·호·넓이 중 필요한 수와 구할 양이 모두 명시되어 있다.",
  },
  {
    typeId: "m1-prism-volume",
    figureIdPrefix: "gm-m1-prism-volume-",
    showFigure: false,
    reason:
      "문장에 입체의 종류, 필요한 밑넓이·밑둘레·반지름·수직 높이·옆면 높이·모선·겉넓이·부피와 목표가 명시되어 있다. 겨냥도는 추가 조건을 주지 않는다.",
    instruction: "각기둥의 부피를 구하세요.",
  },
  {
    typeId: "m1-prism-surface",
    figureIdPrefix: "gm-m1-prism-surface-",
    showFigure: false,
    reason:
      "문장에 입체의 종류, 필요한 밑넓이·밑둘레·반지름·수직 높이·옆면 높이·모선·겉넓이·부피와 목표가 명시되어 있다. 겨냥도는 추가 조건을 주지 않는다.",
    instruction: "모든 옆면이 직사각형인 기둥의 겉넓이를 구하세요.",
  },
  {
    typeId: "m1-cylinder-volume",
    figureIdPrefix: "gm-m1-cylinder-volume-",
    showFigure: false,
    reason:
      "문장에 입체의 종류, 필요한 밑넓이·밑둘레·반지름·수직 높이·옆면 높이·모선·겉넓이·부피와 목표가 명시되어 있다. 겨냥도는 추가 조건을 주지 않는다.",
    instruction: "부피를 구하세요. π는 그대로 쓰세요.",
  },
  {
    typeId: "m1-cylinder-surface",
    figureIdPrefix: "gm-m1-cylinder-surface-",
    showFigure: false,
    reason:
      "문장에 입체의 종류, 필요한 밑넓이·밑둘레·반지름·수직 높이·옆면 높이·모선·겉넓이·부피와 목표가 명시되어 있다. 겨냥도는 추가 조건을 주지 않는다.",
    instruction: "겉넓이를 구하세요. π는 그대로 쓰세요.",
  },
  {
    typeId: "m1-cylinder-lateral",
    figureIdPrefix: "gm-m1-cylinder-lateral-",
    showFigure: false,
    reason:
      "문장에 입체의 종류, 필요한 밑넓이·밑둘레·반지름·수직 높이·옆면 높이·모선·겉넓이·부피와 목표가 명시되어 있다. 겨냥도는 추가 조건을 주지 않는다.",
    instruction: "옆넓이를 구하세요. π는 그대로 쓰세요.",
  },
  {
    typeId: "m1-pyramid-volume",
    figureIdPrefix: "gm-m1-pyramid-volume-",
    showFigure: false,
    reason:
      "문장에 입체의 종류, 필요한 밑넓이·밑둘레·반지름·수직 높이·옆면 높이·모선·겉넓이·부피와 목표가 명시되어 있다. 겨냥도는 추가 조건을 주지 않는다.",
    instruction: "각뿔의 부피를 구하세요.",
  },
  {
    typeId: "m1-pyramid-surface",
    figureIdPrefix: "gm-m1-pyramid-surface-",
    showFigure: false,
    reason:
      "문장에 입체의 종류, 필요한 밑넓이·밑둘레·반지름·수직 높이·옆면 높이·모선·겉넓이·부피와 목표가 명시되어 있다. 겨냥도는 추가 조건을 주지 않는다.",
    instruction: "겉넓이를 구하세요.",
  },
  {
    typeId: "m1-cone-volume",
    figureIdPrefix: "gm-m1-cone-volume-",
    showFigure: false,
    reason:
      "문장에 입체의 종류, 필요한 밑넓이·밑둘레·반지름·수직 높이·옆면 높이·모선·겉넓이·부피와 목표가 명시되어 있다. 겨냥도는 추가 조건을 주지 않는다.",
    instruction: "부피를 구하세요. π는 그대로 쓰세요.",
  },
  {
    typeId: "m1-cone-surface",
    figureIdPrefix: "gm-m1-cone-surface-",
    showFigure: false,
    reason:
      "문장에 입체의 종류, 필요한 밑넓이·밑둘레·반지름·수직 높이·옆면 높이·모선·겉넓이·부피와 목표가 명시되어 있다. 겨냥도는 추가 조건을 주지 않는다.",
    instruction: "겉넓이를 구하세요. π는 그대로 쓰세요.",
  },
  {
    typeId: "m1-cone-lateral",
    figureIdPrefix: "gm-m1-cone-lateral-",
    showFigure: false,
    reason:
      "문장에 입체의 종류, 필요한 밑넓이·밑둘레·반지름·수직 높이·옆면 높이·모선·겉넓이·부피와 목표가 명시되어 있다. 겨냥도는 추가 조건을 주지 않는다.",
    instruction: "옆넓이를 구하세요. π는 그대로 쓰세요.",
  },
  {
    typeId: "m1-sphere-surface",
    figureIdPrefix: "gm-m1-sphere-surface-",
    showFigure: false,
    reason:
      "문장에 입체의 종류, 필요한 밑넓이·밑둘레·반지름·수직 높이·옆면 높이·모선·겉넓이·부피와 목표가 명시되어 있다. 겨냥도는 추가 조건을 주지 않는다.",
    instruction: "겉넓이를 구하세요. π는 그대로 쓰세요.",
  },
  {
    typeId: "m1-sphere-volume",
    figureIdPrefix: "gm-m1-sphere-volume-",
    showFigure: false,
    reason:
      "문장에 입체의 종류, 필요한 밑넓이·밑둘레·반지름·수직 높이·옆면 높이·모선·겉넓이·부피와 목표가 명시되어 있다. 겨냥도는 추가 조건을 주지 않는다.",
    instruction: "부피를 구하세요. π는 그대로 쓰세요.",
  },
  {
    typeId: "m3-circle-inscribed",
    figureIdPrefix: "gm-m3-circle-inscribed-",
    showFigure: false,
    reason:
      "문장에 같은 호·대응 중심각·마주 보는 각 또는 접점·접선·반지름의 관계, 주어진 각·길이와 목표가 명시되어 있다.",
    instruction: "∠C의 크기를 구하세요.",
  },
  {
    typeId: "m3-circle-central",
    figureIdPrefix: "gm-m3-circle-central-",
    showFigure: false,
    reason:
      "문장에 같은 호·대응 중심각·마주 보는 각 또는 접점·접선·반지름의 관계, 주어진 각·길이와 목표가 명시되어 있다.",
    instruction: "중심각의 크기를 구하세요.",
  },
  {
    typeId: "m3-circle-same-arc",
    figureIdPrefix: "gm-m3-circle-same-arc-",
    showFigure: false,
    reason:
      "문장에 같은 호·대응 중심각·마주 보는 각 또는 접점·접선·반지름의 관계, 주어진 각·길이와 목표가 명시되어 있다.",
    instruction: "∠D의 크기를 구하세요.",
  },
  {
    typeId: "m3-circle-cyclic-opposite",
    figureIdPrefix: "gm-m3-circle-cyclic-opposite-",
    showFigure: false,
    reason:
      "문장에 같은 호·대응 중심각·마주 보는 각 또는 접점·접선·반지름의 관계, 주어진 각·길이와 목표가 명시되어 있다.",
    instruction: "∠D의 크기를 구하세요.",
  },
  {
    typeId: "m3-circle-chord-length",
    figureIdPrefix: "gm-m3-circle-chord-length-",
    showFigure: true,
    reason:
      "OM⊥AB만 있고 M∈AB는 명시되지 않는다. 그림이 M을 현 위 수선의 발로 지정해야 OM이 중심과 현 사이 거리가 된다.",
  },
  {
    typeId: "m3-circle-chord-distance",
    figureIdPrefix: "gm-m3-circle-chord-distance-",
    showFigure: false,
    reason:
      "문장에 원의 반지름과 현의 길이가 있고 목표를 중심에서 현까지의 거리 OM으로 명명하여 수선의 발을 그림 없이 정한다.",
  },
  {
    typeId: "m3-circle-tangent-angle",
    figureIdPrefix: "gm-m3-circle-tangent-angle-",
    showFigure: false,
    reason:
      "문장에 같은 호·대응 중심각·마주 보는 각 또는 접점·접선·반지름의 관계, 주어진 각·길이와 목표가 명시되어 있다.",
    instruction: "∠POT의 크기를 구하세요.",
  },
  {
    typeId: "m3-trig-ratio",
    figureIdPrefix: "gm-m3-trig-ratio-",
    showFigure: false,
    reason:
      "문장에 각, 맞은편·이웃한 변·빗변의 대응 또는 두 변의 끼인각과 목표가 명시되어 삼각비를 정할 수 있다.",
  },
  {
    typeId: "m3-trig-special-value",
    figureIdPrefix: "gm-m3-trig-special-value-",
    showFigure: false,
    reason:
      "문장에 각, 맞은편·이웃한 변·빗변의 대응 또는 두 변의 끼인각과 목표가 명시되어 삼각비를 정할 수 있다.",
  },
  {
    typeId: "m3-trig-special-length",
    figureIdPrefix: "gm-m3-trig-special-length-",
    showFigure: false,
    reason:
      "문장에 각, 맞은편·이웃한 변·빗변의 대응 또는 두 변의 끼인각과 목표가 명시되어 삼각비를 정할 수 있다.",
  },
  {
    typeId: "m3-trig-triangle-area",
    figureIdPrefix: "gm-m3-trig-triangle-area-",
    showFigure: false,
    reason:
      "문장에 각, 맞은편·이웃한 변·빗변의 대응 또는 두 변의 끼인각과 목표가 명시되어 삼각비를 정할 수 있다.",
  },
  {
    typeId: "m1-prism-base-area-volume",
    figureIdPrefix: "gm-m1-prism-base-area-volume-",
    showFigure: false,
    reason:
      "문장에 입체의 종류, 필요한 밑넓이·밑둘레·반지름·수직 높이·옆면 높이·모선·겉넓이·부피와 목표가 명시되어 있다. 겨냥도는 추가 조건을 주지 않는다.",
    instruction: "밑넓이를 구하세요.",
  },
  {
    typeId: "m1-prism-height-volume",
    figureIdPrefix: "gm-m1-prism-height-volume-",
    showFigure: false,
    reason:
      "문장에 입체의 종류, 필요한 밑넓이·밑둘레·반지름·수직 높이·옆면 높이·모선·겉넓이·부피와 목표가 명시되어 있다. 겨냥도는 추가 조건을 주지 않는다.",
    instruction: "수직 높이 h를 구하세요.",
  },
  {
    typeId: "m1-pyramid-base-area-volume",
    figureIdPrefix: "gm-m1-pyramid-base-area-volume-",
    showFigure: false,
    reason:
      "문장에 입체의 종류, 필요한 밑넓이·밑둘레·반지름·수직 높이·옆면 높이·모선·겉넓이·부피와 목표가 명시되어 있다. 겨냥도는 추가 조건을 주지 않는다.",
    instruction: "밑넓이를 구하세요.",
  },
  {
    typeId: "m1-pyramid-height-volume",
    figureIdPrefix: "gm-m1-pyramid-height-volume-",
    showFigure: false,
    reason:
      "문장에 입체의 종류, 필요한 밑넓이·밑둘레·반지름·수직 높이·옆면 높이·모선·겉넓이·부피와 목표가 명시되어 있다. 겨냥도는 추가 조건을 주지 않는다.",
    instruction: "수직 높이 h를 구하세요.",
  },
  {
    typeId: "m1-prism-base-area-surface",
    figureIdPrefix: "gm-m1-prism-base-area-surface-",
    showFigure: false,
    reason:
      "문장에 입체의 종류, 필요한 밑넓이·밑둘레·반지름·수직 높이·옆면 높이·모선·겉넓이·부피와 목표가 명시되어 있다. 겨냥도는 추가 조건을 주지 않는다.",
    instruction: "밑넓이를 구하세요. 옆면은 모두 직사각형입니다.",
  },
  {
    typeId: "m1-prism-height-surface",
    figureIdPrefix: "gm-m1-prism-height-surface-",
    showFigure: false,
    reason:
      "문장에 입체의 종류, 필요한 밑넓이·밑둘레·반지름·수직 높이·옆면 높이·모선·겉넓이·부피와 목표가 명시되어 있다. 겨냥도는 추가 조건을 주지 않는다.",
    instruction: "수직 높이 h를 구하세요. 옆면은 모두 직사각형입니다.",
  },
  {
    typeId: "m1-pyramid-slant-surface",
    figureIdPrefix: "gm-m1-pyramid-slant-surface-",
    showFigure: false,
    reason:
      "문장에 입체의 종류, 필요한 밑넓이·밑둘레·반지름·수직 높이·옆면 높이·모선·겉넓이·부피와 목표가 명시되어 있다. 겨냥도는 추가 조건을 주지 않는다.",
    instruction: "옆면 삼각형의 높이 s를 구하세요.",
  },
  {
    typeId: "m1-cylinder-height-volume",
    figureIdPrefix: "gm-m1-cylinder-height-volume-",
    showFigure: false,
    reason:
      "문장에 입체의 종류, 필요한 밑넓이·밑둘레·반지름·수직 높이·옆면 높이·모선·겉넓이·부피와 목표가 명시되어 있다. 겨냥도는 추가 조건을 주지 않는다.",
    instruction: "수직 높이 h를 구하세요.",
  },
  {
    typeId: "m1-cylinder-radius-volume",
    figureIdPrefix: "gm-m1-cylinder-radius-volume-",
    showFigure: false,
    reason:
      "문장에 입체의 종류, 필요한 밑넓이·밑둘레·반지름·수직 높이·옆면 높이·모선·겉넓이·부피와 목표가 명시되어 있다. 겨냥도는 추가 조건을 주지 않는다.",
    instruction: "반지름 r를 구하세요.",
  },
  {
    typeId: "m1-cone-height-volume",
    figureIdPrefix: "gm-m1-cone-height-volume-",
    showFigure: false,
    reason:
      "문장에 입체의 종류, 필요한 밑넓이·밑둘레·반지름·수직 높이·옆면 높이·모선·겉넓이·부피와 목표가 명시되어 있다. 겨냥도는 추가 조건을 주지 않는다.",
    instruction: "수직 높이 h를 구하세요.",
  },
  {
    typeId: "m1-cone-radius-volume",
    figureIdPrefix: "gm-m1-cone-radius-volume-",
    showFigure: false,
    reason:
      "문장에 입체의 종류, 필요한 밑넓이·밑둘레·반지름·수직 높이·옆면 높이·모선·겉넓이·부피와 목표가 명시되어 있다. 겨냥도는 추가 조건을 주지 않는다.",
    instruction: "반지름 r를 구하세요.",
  },
  {
    typeId: "m1-cylinder-height-lateral",
    figureIdPrefix: "gm-m1-cylinder-height-lateral-",
    showFigure: false,
    reason:
      "문장에 입체의 종류, 필요한 밑넓이·밑둘레·반지름·수직 높이·옆면 높이·모선·겉넓이·부피와 목표가 명시되어 있다. 겨냥도는 추가 조건을 주지 않는다.",
    instruction: "수직 높이 h를 구하세요.",
  },
  {
    typeId: "m1-cylinder-radius-lateral",
    figureIdPrefix: "gm-m1-cylinder-radius-lateral-",
    showFigure: false,
    reason:
      "문장에 입체의 종류, 필요한 밑넓이·밑둘레·반지름·수직 높이·옆면 높이·모선·겉넓이·부피와 목표가 명시되어 있다. 겨냥도는 추가 조건을 주지 않는다.",
    instruction: "반지름 r를 구하세요.",
  },
  {
    typeId: "m1-cylinder-height-surface",
    figureIdPrefix: "gm-m1-cylinder-height-surface-",
    showFigure: false,
    reason:
      "문장에 입체의 종류, 필요한 밑넓이·밑둘레·반지름·수직 높이·옆면 높이·모선·겉넓이·부피와 목표가 명시되어 있다. 겨냥도는 추가 조건을 주지 않는다.",
    instruction: "수직 높이 h를 구하세요.",
  },
  {
    typeId: "m1-cone-radius-lateral",
    figureIdPrefix: "gm-m1-cone-radius-lateral-",
    showFigure: false,
    reason:
      "문장에 입체의 종류, 필요한 밑넓이·밑둘레·반지름·수직 높이·옆면 높이·모선·겉넓이·부피와 목표가 명시되어 있다. 겨냥도는 추가 조건을 주지 않는다.",
    instruction: "반지름 r의 길이를 구하세요.",
  },
  {
    typeId: "m1-cone-generator-lateral",
    figureIdPrefix: "gm-m1-cone-generator-lateral-",
    showFigure: false,
    reason:
      "문장에 입체의 종류, 필요한 밑넓이·밑둘레·반지름·수직 높이·옆면 높이·모선·겉넓이·부피와 목표가 명시되어 있다. 겨냥도는 추가 조건을 주지 않는다.",
    instruction: "모선 l의 길이를 구하세요.",
  },
  {
    typeId: "m1-cone-generator-surface",
    figureIdPrefix: "gm-m1-cone-generator-surface-",
    showFigure: false,
    reason:
      "문장에 입체의 종류, 필요한 밑넓이·밑둘레·반지름·수직 높이·옆면 높이·모선·겉넓이·부피와 목표가 명시되어 있다. 겨냥도는 추가 조건을 주지 않는다.",
    instruction: "모선 l의 길이를 구하세요.",
  },
  {
    typeId: "m1-sphere-radius-surface",
    figureIdPrefix: "gm-m1-sphere-radius-surface-",
    showFigure: false,
    reason:
      "문장에 입체의 종류, 필요한 밑넓이·밑둘레·반지름·수직 높이·옆면 높이·모선·겉넓이·부피와 목표가 명시되어 있다. 겨냥도는 추가 조건을 주지 않는다.",
    instruction: "반지름 r의 길이를 구하세요.",
  },
  {
    typeId: "m1-sphere-radius-volume",
    figureIdPrefix: "gm-m1-sphere-radius-volume-",
    showFigure: false,
    reason:
      "문장에 입체의 종류, 필요한 밑넓이·밑둘레·반지름·수직 높이·옆면 높이·모선·겉넓이·부피와 목표가 명시되어 있다. 겨냥도는 추가 조건을 주지 않는다.",
    instruction: "반지름 r의 길이를 구하세요.",
  },
  {
    typeId: "m3-circle-tangent-chord",
    figureIdPrefix: "gm-m3-circle-tangent-chord-",
    showFigure: false,
    reason:
      "문장에 같은 호·대응 중심각·마주 보는 각 또는 접점·접선·반지름의 관계, 주어진 각·길이와 목표가 명시되어 있다.",
    instruction: "접선과 현 TP가 이루는 예각을 구하세요.",
  },
  {
    typeId: "m3-circle-equal-tangents",
    figureIdPrefix: "gm-m3-circle-equal-tangents-",
    showFigure: false,
    reason:
      "문장에 같은 호·대응 중심각·마주 보는 각 또는 접점·접선·반지름의 관계, 주어진 각·길이와 목표가 명시되어 있다.",
  },
  {
    typeId: "m1-polygon-vertex-diagonals",
    figureIdPrefix: "gc1-m1-polygon-vertex-diagonals-",
    showFigure: false,
    reason:
      "문장에 다각형의 변 수와 정다각형 여부 또는 한 꼭짓점에서 대각선을 모두 긋는 조건, 구할 개수·각이 명시되어 있다.",
  },
  {
    typeId: "m1-polygon-fan-triangles",
    figureIdPrefix: "gc1-m1-polygon-fan-triangles-",
    showFigure: false,
    reason:
      "문장에 다각형의 변 수와 정다각형 여부 또는 한 꼭짓점에서 대각선을 모두 긋는 조건, 구할 개수·각이 명시되어 있다.",
  },
  {
    typeId: "m1-prism-faces-count",
    figureIdPrefix: "gc1-m1-prism-faces-count-",
    showFigure: false,
    reason:
      "문장에 밑면의 변 수와 각기둥·각뿔·각뿔대의 종류, 구할 면·모서리·꼭짓점 수가 명시되어 있어 그림 없이 개수 관계가 정해진다.",
  },
  {
    typeId: "m1-prism-edges-count",
    figureIdPrefix: "gc1-m1-prism-edges-count-",
    showFigure: false,
    reason:
      "문장에 밑면의 변 수와 각기둥·각뿔·각뿔대의 종류, 구할 면·모서리·꼭짓점 수가 명시되어 있어 그림 없이 개수 관계가 정해진다.",
  },
  {
    typeId: "m1-prism-vertices-count",
    figureIdPrefix: "gc1-m1-prism-vertices-count-",
    showFigure: false,
    reason:
      "문장에 밑면의 변 수와 각기둥·각뿔·각뿔대의 종류, 구할 면·모서리·꼭짓점 수가 명시되어 있어 그림 없이 개수 관계가 정해진다.",
  },
  {
    typeId: "m1-pyramid-faces-count",
    figureIdPrefix: "gc1-m1-pyramid-faces-count-",
    showFigure: false,
    reason:
      "문장에 밑면의 변 수와 각기둥·각뿔·각뿔대의 종류, 구할 면·모서리·꼭짓점 수가 명시되어 있어 그림 없이 개수 관계가 정해진다.",
  },
  {
    typeId: "m1-pyramid-edges-count",
    figureIdPrefix: "gc1-m1-pyramid-edges-count-",
    showFigure: false,
    reason:
      "문장에 밑면의 변 수와 각기둥·각뿔·각뿔대의 종류, 구할 면·모서리·꼭짓점 수가 명시되어 있어 그림 없이 개수 관계가 정해진다.",
  },
  {
    typeId: "m1-pyramid-vertices-count",
    figureIdPrefix: "gc1-m1-pyramid-vertices-count-",
    showFigure: false,
    reason:
      "문장에 밑면의 변 수와 각기둥·각뿔·각뿔대의 종류, 구할 면·모서리·꼭짓점 수가 명시되어 있어 그림 없이 개수 관계가 정해진다.",
  },
  {
    typeId: "m1-frustum-faces-count",
    figureIdPrefix: "gc1-m1-frustum-faces-count-",
    showFigure: false,
    reason:
      "문장에 밑면의 변 수와 각기둥·각뿔·각뿔대의 종류, 구할 면·모서리·꼭짓점 수가 명시되어 있어 그림 없이 개수 관계가 정해진다.",
  },
  {
    typeId: "m1-frustum-edges-count",
    figureIdPrefix: "gc1-m1-frustum-edges-count-",
    showFigure: false,
    reason:
      "문장에 밑면의 변 수와 각기둥·각뿔·각뿔대의 종류, 구할 면·모서리·꼭짓점 수가 명시되어 있어 그림 없이 개수 관계가 정해진다.",
  },
  {
    typeId: "m1-frustum-vertices-count",
    figureIdPrefix: "gc1-m1-frustum-vertices-count-",
    showFigure: false,
    reason:
      "문장에 밑면의 변 수와 각기둥·각뿔·각뿔대의 종류, 구할 면·모서리·꼭짓점 수가 명시되어 있어 그림 없이 개수 관계가 정해진다.",
  },
] as const;
