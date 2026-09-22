import type {
  ManipulativeAction,
  ManipulativeState,
} from "@/lib/lab/cube31/manipulative";

type Zone = "workspace" | "tray" | "removed";
type Picture = { rect: DOMRect; svg: SVGSVGElement };
type Flight = { source: Picture; target: string; morph: boolean; kind: string };

function selector(zone: Zone, place: number, index: number) {
  return `[data-block-zone="${zone}"][data-place="${place}"] [data-block-index="${index}"] svg`;
}

function picture(element: Element | null): Picture | null {
  if (!(element instanceof SVGSVGElement)) return null;
  const rect = element.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const svg = element.cloneNode(true) as SVGSVGElement;
  const computed = getComputedStyle(element);
  svg.removeAttribute("class");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.style.cssText = "width:100%;height:100%;display:block;overflow:visible";
  svg.style.color = computed.color;
  svg.style.setProperty(
    "--block-line",
    computed.getPropertyValue("--block-line"),
  );
  return { rect, svg };
}

/** Decorative, screen-coordinate copies never own mathematical state or input. */
export function createBlockMotion() {
  let pending: Flight[] = [];
  let layer: HTMLDivElement | null = null;
  const active = new Set<() => void>();
  const arrivals = new Map<Element, () => void>();
  const reduced = () =>
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  function clear() {
    pending = [];
    for (const restore of arrivals.values()) restore();
    for (const cancel of active) cancel();
    layer?.remove();
    layer = null;
  }

  function track(
    node: HTMLElement,
    frames: Keyframe[],
    options: KeyframeAnimationOptions,
    cleanup?: () => void,
  ) {
    layer!.append(node);
    const animation = node.animate(frames, options);
    const finish = () => {
      animation.onfinish = null;
      animation.oncancel = null;
      animation.cancel();
      cleanup?.();
      node.remove();
      active.delete(finish);
      if (!active.size) {
        layer?.remove();
        layer = null;
      }
    };
    active.add(finish);
    animation.onfinish = finish;
    animation.oncancel = finish;
  }

  return {
    clear,
    capture(
      root: HTMLElement,
      action: ManipulativeAction,
      before: ManipulativeState,
      after: ManipulativeState,
      clicked?: HTMLElement,
    ) {
      if (
        action.type === "confirm-zero" ||
        reduced() ||
        !Element.prototype.animate
      )
        return;
      // React may reuse an index-keyed destination for a different block on the
      // next action. Restore it before reconciliation so hiding cannot leak.
      for (const restore of arrivals.values()) restore();
      const p = action.place;
      const zone =
        action.type === "move"
          ? "tray"
          : action.type === "restore"
            ? "removed"
            : "workspace";
      const destination = action.type === "remove" ? "removed" : "workspace";
      const targetPlace =
        p + (action.type === "bundle" ? 1 : action.type === "split" ? -1 : 0);
      const count =
        action.type === "bundle" || action.type === "split" ? 10 : 1;
      for (let i = 0; i < count; i++) {
        const index = before[zone][p] - 1 - (action.type === "bundle" ? i : 0);
        const source = picture(
          clicked?.querySelector("svg") ??
            root.querySelector(selector(zone, p, index)),
        );
        if (!source) continue;
        const targetIndex =
          after[destination][targetPlace] -
          1 -
          (action.type === "split" ? i : 0);
        pending.push({
          source,
          target: selector(destination, targetPlace, targetIndex),
          morph: count === 10,
          kind: action.type,
        });
      }
    },
    play(root: HTMLElement) {
      if (reduced()) {
        clear();
        return;
      }
      // Read all destination geometry before writing the overlay. A later action
      // in the same React batch may have already consumed a destination block.
      const flights = pending.map((flight) => {
        const target = root.querySelector(flight.target);
        return { ...flight, target, end: picture(target) };
      });
      pending = [];
      const landed = new Set<Element>();
      for (const flight of flights) {
        if (!flight.end) continue;
        if (flight.target && !arrivals.has(flight.target)) {
          const target = flight.target;
          const arrival = target.animate([{ opacity: 0 }, { opacity: 0 }], {
            duration: 420,
          });
          const restore = () => {
            arrival.onfinish = null;
            arrival.oncancel = null;
            arrival.cancel();
            arrivals.delete(target);
          };
          arrivals.set(target, restore);
          arrival.onfinish = restore;
          arrival.oncancel = restore;
        }
        // Bound decoration during held keys or very rapid programmatic input.
        while (active.size >= 80) active.values().next().value?.();
        if (!layer) {
          layer = document.createElement("div");
          layer.dataset.blockMotionLayer = "";
          layer.setAttribute("aria-hidden", "true");
          layer.style.cssText =
            "position:fixed;inset:0;pointer-events:none;z-index:2147483000;contain:layout style;";
          document.body.append(layer);
        }
        const { rect: from, svg } = flight.source;
        const { rect: to } = flight.end;
        const dx = to.x + to.width / 2 - from.x - from.width / 2;
        const dy = to.y + to.height / 2 - from.y - from.height / 2;
        const arc = Math.min(32, Math.max(10, Math.hypot(dx, dy) * 0.1));
        const scaleX = to.width / from.width;
        const scaleY = to.height / from.height;
        const ghost = document.createElement("div");
        ghost.dataset.blockFlight = flight.kind;
        ghost.style.cssText = `position:fixed;left:${from.x}px;top:${from.y}px;width:${from.width}px;height:${from.height}px;pointer-events:none;transform-origin:center;filter:drop-shadow(0 3px 3px #07598544);`;
        ghost.append(svg);
        let cleanupMorph: (() => void) | undefined;
        // Trades visibly change form midway while converging or fanning out.
        if (flight.morph) {
          svg.style.position = "absolute";
          const replacement = flight.end.svg;
          replacement.style.position = "absolute";
          const oldForm = document.createElement("div");
          oldForm.style.cssText = "position:absolute;inset:0";
          oldForm.append(svg);
          ghost.append(oldForm);
          const newForm = document.createElement("div");
          newForm.style.cssText = "position:absolute;inset:0";
          newForm.append(replacement);
          ghost.append(newForm);
          // Child animations are canceled with their owning flight, too.
          const fadeOut = oldForm.animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: 130,
            delay: 100,
            fill: "both",
          });
          const fadeIn = newForm.animate([{ opacity: 0 }, { opacity: 1 }], {
            duration: 130,
            delay: 100,
            fill: "both",
          });
          cleanupMorph = () => {
            fadeOut.cancel();
            fadeIn.cancel();
          };
        }
        track(
          ghost,
          [
            {
              transform: "translate(0,0) scale(1)",
              opacity: 0.95,
              easing: "cubic-bezier(.16,.8,.3,1)",
            },
            {
              transform: `translate(${dx * 0.48}px,${dy * 0.48 - arc}px) scale(${1 + (scaleX - 1) * 0.48},${1 + (scaleY - 1) * 0.48})`,
              opacity: 1,
              offset: 0.34,
              easing: "cubic-bezier(.4,0,.7,1)",
            },
            {
              transform: `translate(${dx}px,${dy}px) scale(${scaleX * 1.06},${scaleY * 0.94})`,
              opacity: 1,
              offset: 0.72,
              easing: "cubic-bezier(.2,.8,.3,1)",
            },
            {
              transform: `translate(${dx}px,${dy}px) scale(${scaleX * 0.98},${scaleY * 1.02})`,
              opacity: 1,
              offset: 0.86,
              easing: "ease-out",
            },
            {
              transform: `translate(${dx}px,${dy}px) scale(${scaleX},${scaleY})`,
              opacity: 1,
            },
          ],
          // Travel takes 300ms; the remaining time settles the decorative copy
          // at exactly the measured size before revealing the real block.
          { duration: 420, easing: "linear", fill: "both" },
          cleanupMorph,
        );
        // A bundle has ten flights but only one destination and landing pulse.
        if (!flight.target || landed.has(flight.target)) continue;
        landed.add(flight.target);
        const ring = document.createElement("div");
        ring.dataset.blockLanding = "";
        ring.style.cssText = `position:fixed;left:${to.x - 4}px;top:${to.y - 4}px;width:${to.width + 8}px;height:${to.height + 8}px;border:2px solid ${flight.morph ? "#0d9488" : "#0284c7"};border-radius:7px;box-sizing:border-box;pointer-events:none;`;
        track(
          ring,
          [
            { transform: "scale(.88)", opacity: 0 },
            { transform: "scale(1)", opacity: 0.65, offset: 0.15 },
            { transform: "scale(1.3)", opacity: 0 },
          ],
          { duration: 200, delay: 290, fill: "both", easing: "ease-out" },
        );
      }
    },
    watchPreference() {
      const preference = window.matchMedia?.(
        "(prefers-reduced-motion: reduce)",
      );
      const change = () => {
        if (preference?.matches) clear();
      };
      preference?.addEventListener?.("change", change);
      return () => {
        preference?.removeEventListener?.("change", change);
        clear();
      };
    },
  };
}
