import { act, render, screen } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useLabSave } from "@/components/lab/useLabSave";
import { emptySave, LAB_SAVE_KEY } from "@/lib/lab/progress";

/**
 * 실험실 진도는 브라우저(localStorage)에만 있다. 서버 그림은 «빈 기록»이고, 수화가 끝난 뒤에
 * 저장본으로 바뀐다 — 예전에는 `useEffect` 안에서 `setSave(loadSave())` 로 했는데
 * ESLint `react-hooks/set-state-in-effect` 가 막아 훅 하나로 옮겼다(2026-09-21 병합 검사).
 * 옮긴 뒤에도 «서버 = 빈 기록 · 브라우저 = 저장본 · 수화 어긋남 없음» 이 그대로인지 잰다.
 */
function Probe() {
  const { save, ready } = useLabSave();
  return <p data-testid="probe">{`${ready}:${save.xp}`}</p>;
}

function storeXp(xp: number) {
  localStorage.setItem(LAB_SAVE_KEY, JSON.stringify({ ...emptySave(), xp }));
}

describe("useLabSave — 실험실 진도 읽기", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("서버 그림은 빈 기록이고 저장소를 읽지 않는다", () => {
    storeXp(42);
    const getItem = vi.spyOn(Storage.prototype, "getItem");
    const html = renderToString(<Probe />);
    expect(html).toContain("false:0");
    expect(getItem).not.toHaveBeenCalled();
  });

  it("브라우저에서 새로 그리면 저장본을 읽고 준비된다", () => {
    storeXp(42);
    render(<Probe />);
    expect(screen.getByTestId("probe")).toHaveTextContent("true:42");
  });

  it("저장본이 없으면 빈 기록으로 준비된다", () => {
    render(<Probe />);
    expect(screen.getByTestId("probe")).toHaveTextContent("true:0");
  });

  it("서버 그림을 수화하면 어긋남 없이 저장본으로 바뀐다", async () => {
    storeXp(42);
    const container = document.createElement("div");
    document.body.appendChild(container);
    container.innerHTML = renderToString(<Probe />);
    expect(container.textContent).toBe("false:0");

    const errors = vi.spyOn(console, "error");
    const recoverable: unknown[] = [];
    let root: ReturnType<typeof hydrateRoot> | undefined;
    await act(async () => {
      root = hydrateRoot(container, <Probe />, {
        onRecoverableError: (e) => recoverable.push(e),
      });
    });
    expect(container.textContent).toBe("true:42");
    expect(recoverable).toEqual([]);
    expect(errors).not.toHaveBeenCalled();
    act(() => root?.unmount());
    container.remove();
  });
});
