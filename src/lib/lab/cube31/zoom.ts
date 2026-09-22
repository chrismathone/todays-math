/** 랩실을 짠 크기 — 이보다 큰 화면에서는 페이지 전체(글자·사이드바·블록)를 키운다. */
export const LAB_DESIGN_WIDTH = 1500;
export const LAB_DESIGN_HEIGHT = 860;
export const LAB_MAX_ZOOM = 1.6;

/**
 * 큰 화면에서 랩실 페이지 전체를 키우는 배율(원장님 2026-09-22 «공간이 많으므로 글자를 적당히 크게 키우고
 * 전체적으로 크기를 키워도»). 좁은 쪽을 따라 설계 크기보다 큰 만큼, 최대 1.6배. 작은 화면은 1 — 줄여 넣는 것은
 * 활동 칸(ActivityViewport)이 맡는다. 소수 둘째 자리에서 **내린다** — 올리면 키운 뒤 쓸 수 있는 크기가 설계 크기보다
 * 조금 모자라 활동이 줄어든다.
 */
export function labZoom(width: number, height: number) {
  const fit = Math.min(width / LAB_DESIGN_WIDTH, height / LAB_DESIGN_HEIGHT);
  return Math.min(LAB_MAX_ZOOM, Math.max(1, Math.floor(fit * 100) / 100));
}
