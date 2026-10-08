/* Shared prototype reorder controller. The caller owns rendering and ordered IDs. */
(() => {
  const instances = new WeakMap();
  const handleSelector = "button.reorder-handle[data-reorder-handle]";
  const same = (a, b) =>
    a.length === b.length && a.every((id, i) => id === b[i]);

  function create({ container, itemSelector, getIds, onReorder, announce }) {
    instances.get(container)?.destroy();
    const doc = container.ownerDocument;
    const win = doc.defaultView;
    const marker = doc.createElement("div");
    marker.className = "exam-reorder-marker";
    marker.textContent = "여기로 문제 이동";
    marker.setAttribute("aria-hidden", "true");
    marker.hidden = true;
    doc.body.append(marker);
    const live = announce ? null : doc.createElement("div");
    if (live) {
      live.className = "exam-reorder-live";
      live.setAttribute("role", "status");
      live.setAttribute("aria-live", "polite");
      live.setAttribute("aria-atomic", "true");
      doc.body.append(live);
    }
    const say = (message) => {
      if (announce) announce(message);
      else live.textContent = message;
    };
    let drag = null;
    let frame = 0;
    let decorated = null;
    let destroyed = false;
    const listeners = [];
    const listen = (node, type, callback, options) => {
      node.addEventListener(type, callback, options);
      listeners.push(() => node.removeEventListener(type, callback, options));
    };
    const items = () =>
      [...container.querySelectorAll(itemSelector)].filter((card) =>
        card.hasAttribute("data-reorder-id"),
      );
    const idOf = (card) => card?.dataset.reorderId;
    const focus = (id) =>
      items()
        .find((card) => idOf(card) === id)
        ?.querySelector(handleSelector)
        ?.focus({ preventScroll: true });

    function clearDecoration() {
      if (!decorated) return;
      const { card, handle, pressed } = decorated;
      card.classList.remove("exam-reorder-source");
      if (handle) {
        if (pressed === null) handle.removeAttribute("aria-pressed");
        else handle.setAttribute("aria-pressed", pressed);
      }
      decorated = null;
    }

    function finish(commit, restoreFocus = true) {
      if (!drag) return;
      const current = drag;
      const valid = same(current.ids, getIds());
      const next = current.ids.filter((id) => id !== current.id);
      next.splice(current.target, 0, current.id);
      const changed =
        commit && current.active && valid && !same(next, current.ids);
      drag = null;
      win.cancelAnimationFrame(frame);
      frame = 0;
      marker.hidden = true;
      clearDecoration();
      if (
        current.pointerId !== undefined &&
        container.hasPointerCapture(current.pointerId)
      ) {
        container.releasePointerCapture(current.pointerId);
      }
      if (changed) onReorder(next);
      if (restoreFocus && !destroyed) focus(current.id);
      if (current.active) {
        say(
          changed
            ? `문항을 ${current.target + 1}번째로 이동했습니다.`
            : valid
              ? "문항 순서를 변경하지 않았습니다."
              : "목록이 바뀌어 이동을 취소했습니다.",
        );
      }
    }

    function start(handle, mode, event) {
      const card = handle.closest(itemSelector);
      if (
        !card ||
        !container.contains(card) ||
        handle.disabled ||
        handle.getAttribute("aria-disabled") === "true"
      )
        return;
      const ids = [...getIds()];
      const id = idOf(card);
      // Reject stale/duplicate lists instead of dropping or duplicating caller data.
      if (
        ids.length < 2 ||
        !ids.includes(id) ||
        new Set(ids).size !== ids.length ||
        !same(items().map(idOf), ids)
      )
        return;
      drag = {
        id,
        ids,
        target: ids.indexOf(id),
        mode,
        active: mode === "keyboard",
      };
      if (mode === "pointer") {
        Object.assign(drag, {
          pointerId: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          startX: event.clientX,
          startY: event.clientY,
        });
        // Capturing the stable root survives the caller replacing card markup.
        container.setPointerCapture(event.pointerId);
      }
      handle.focus({ preventScroll: true });
      if (drag.active) activate();
    }

    function activate() {
      drag.active = true;
      say(
        drag.mode === "keyboard"
          ? `${drag.target + 1}번째 문항을 선택했습니다. 위아래 방향키로 위치를 정하고 Space 또는 Enter로 확정, Escape로 취소합니다.`
          : `${drag.target + 1}번째 문항을 이동합니다. 원하는 위치에 놓으세요. Escape로 취소할 수 있습니다.`,
      );
      refresh();
      frame = win.requestAnimationFrame(tick);
    }

    function refresh() {
      if (!drag?.active) return;
      const cards = items();
      if (
        !container.isConnected ||
        !same(drag.ids, getIds()) ||
        !same(cards.map(idOf), drag.ids)
      ) {
        finish(false);
        return;
      }
      const source = cards.find((card) => idOf(card) === drag.id);
      if (source !== decorated?.card) {
        clearDecoration();
        const handle = source.querySelector(handleSelector);
        decorated = {
          card: source,
          handle,
          pressed: handle?.getAttribute("aria-pressed") ?? null,
        };
        source.classList.add("exam-reorder-source");
        handle?.setAttribute("aria-pressed", "true");
      }
      const remaining = cards.filter((card) => card !== source);
      const measured = cards.map((card) => ({
        card,
        rect: card.getBoundingClientRect(),
      }));
      if (drag.mode === "pointer") {
        let nearest = null;
        let distance = Infinity;
        for (const entry of measured) {
          const r = entry.rect;
          if (!r.width || !r.height) continue;
          const dx = Math.max(r.left - drag.x, 0, drag.x - r.right);
          const dy = Math.max(r.top - drag.y, 0, drag.y - r.bottom);
          const score = dx * dx + dy * dy;
          if (score < distance) {
            nearest = entry;
            distance = score;
          }
        }
        if (!nearest) {
          finish(false);
          return;
        }
        drag.target =
          nearest.card === source
            ? drag.ids.indexOf(drag.id)
            : remaining.indexOf(nearest.card) +
              Number(drag.y >= nearest.rect.top + nearest.rect.height / 2);
      }
      const reference =
        remaining[drag.target] || remaining[remaining.length - 1];
      const rect = reference.getBoundingClientRect();
      const after = drag.target === remaining.length;
      const y = after ? rect.bottom : rect.top;
      let left = Math.max(4, rect.left);
      let right = Math.min(win.innerWidth - 4, rect.right);
      let top = 0;
      let bottom = win.innerHeight;
      // The overlay is outside document flow, but must respect scroll clipping.
      for (
        let node = reference.parentElement;
        node && node !== doc.body;
        node = node.parentElement
      ) {
        const style = win.getComputedStyle(node);
        const bounds = node.getBoundingClientRect();
        if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) {
          top = Math.max(top, bounds.top);
          bottom = Math.min(bottom, bounds.bottom);
        }
        if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) {
          left = Math.max(left, bounds.left);
          right = Math.min(right, bounds.right);
        }
      }
      const markerHeight = Number.parseFloat(
        win.getComputedStyle(marker).height,
      );
      // Scrolling to a card can leave its edge a fraction of a pixel outside.
      marker.hidden =
        y < top - 1 ||
        y > bottom + 1 ||
        right <= left ||
        bottom - top < markerHeight;
      marker.style.left = `${left}px`;
      // Keep the whole row visible without moving cards or changing the drop target.
      marker.style.top = `${Math.max(top + markerHeight / 2, Math.min(y, bottom - markerHeight / 2))}px`;
      marker.style.width = `${Math.max(0, right - left)}px`;
    }

    function autoScroll(elapsed) {
      const source = decorated?.card;
      if (!source || drag.mode !== "pointer") return;
      const roots = [];
      for (
        let node = source.parentElement;
        node && node !== doc.body;
        node = node.parentElement
      ) {
        if (
          /(auto|scroll)/.test(win.getComputedStyle(node).overflowY) &&
          node.scrollHeight > node.clientHeight
        )
          roots.push(node);
      }
      if (doc.scrollingElement) roots.push(doc.scrollingElement);
      for (const node of roots) {
        const page = node === doc.scrollingElement;
        const rect = page
          ? container.getBoundingClientRect()
          : node.getBoundingClientRect();
        const top = page ? 0 : Math.max(0, rect.top);
        const bottom = page
          ? win.innerHeight
          : Math.min(win.innerHeight, rect.bottom);
        if (
          drag.x < rect.left ||
          drag.x > rect.right ||
          drag.y < top - 24 ||
          drag.y > bottom + 24
        )
          continue;
        const edge = Math.min(56, (bottom - top) / 3);
        if (edge <= 0) continue;
        const speed =
          drag.y < top + edge
            ? -Math.min(1, (top + edge - drag.y) / edge)
            : drag.y > bottom - edge
              ? Math.min(1, (drag.y - bottom + edge) / edge)
              : 0;
        if (
          !speed ||
          (speed < 0 && node.scrollTop <= 0) ||
          (speed > 0 &&
            node.scrollTop + node.clientHeight >= node.scrollHeight - 1)
        )
          continue;
        node.scrollTop += speed * 0.65 * elapsed;
        break;
      }
    }

    function tick(time) {
      if (!drag?.active) return;
      autoScroll(Math.min(32, drag.lastTime ? time - drag.lastTime : 16));
      drag.lastTime = time;
      refresh();
      if (drag?.active) frame = win.requestAnimationFrame(tick);
    }

    listen(container, "pointerdown", (event) => {
      if (drag || !event.isPrimary || event.button !== 0) return;
      const handle = event.target.closest?.(handleSelector);
      if (!handle || !container.contains(handle)) return;
      event.preventDefault();
      start(handle, "pointer", event);
    });
    listen(container, "pointermove", (event) => {
      if (drag?.mode !== "pointer" || drag.pointerId !== event.pointerId)
        return;
      drag.x = event.clientX;
      drag.y = event.clientY;
      if (
        !drag.active &&
        Math.hypot(drag.x - drag.startX, drag.y - drag.startY) >= 6
      )
        activate();
      else refresh();
    });
    listen(container, "pointerup", (event) => {
      if (drag?.mode !== "pointer" || drag.pointerId !== event.pointerId)
        return;
      drag.x = event.clientX;
      drag.y = event.clientY;
      refresh();
      finish(true);
    });
    const cancelPointer = (event) => {
      if (drag?.mode === "pointer" && drag.pointerId === event.pointerId)
        finish(false);
    };
    listen(container, "pointercancel", cancelPointer);
    listen(container, "lostpointercapture", cancelPointer);
    // Handles are reorder controls only; suppress native click/drag after a gesture.
    listen(
      container,
      "click",
      (event) => {
        if (event.target.closest?.(handleSelector)) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
      true,
    );
    listen(container, "dragstart", (event) => {
      if (event.target.closest?.(handleSelector)) event.preventDefault();
    });
    listen(container, "keydown", (event) => {
      if (event.isComposing || event.altKey || event.ctrlKey || event.metaKey)
        return;
      const handle = event.target.closest?.(handleSelector);
      if (!handle) return;
      const toggle = event.key === " " || event.key === "Enter";
      if (!drag && toggle) {
        event.preventDefault();
        if (!event.repeat) start(handle, "keyboard");
      } else if (
        drag?.mode === "keyboard" &&
        idOf(handle.closest(itemSelector)) === drag.id
      ) {
        if (toggle) {
          event.preventDefault();
          if (!event.repeat) {
            refresh();
            finish(true);
          }
        } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
          event.preventDefault();
          drag.target = Math.max(
            0,
            Math.min(
              drag.ids.length - 1,
              drag.target + (event.key === "ArrowUp" ? -1 : 1),
            ),
          );
          refresh();
          if (drag) {
            const destination = items().filter(
              (card) => idOf(card) !== drag.id,
            );
            (
              destination[drag.target] || destination[destination.length - 1]
            )?.scrollIntoView({ block: "nearest", behavior: "instant" });
            refresh();
            say(
              `${drag.target + 1}번째 위치입니다. Space 또는 Enter로 확정합니다.`,
            );
          }
        }
      }
    });
    listen(
      doc,
      "keydown",
      (event) => {
        if (drag && event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          finish(false);
        }
      },
      true,
    );
    listen(container, "focusout", (event) => {
      if (
        drag?.mode === "keyboard" &&
        event.relatedTarget &&
        event.relatedTarget !== event.target
      )
        finish(false, false);
    });
    listen(win, "blur", () => finish(false, false));
    const api = {
      destroy() {
        if (destroyed) return;
        destroyed = true;
        finish(false, false);
        listeners.forEach((remove) => remove());
        marker.remove();
        live?.remove();
        instances.delete(container);
      },
    };
    instances.set(container, api);
    return api;
  }
  window.ExamReorder = { create };
})();
