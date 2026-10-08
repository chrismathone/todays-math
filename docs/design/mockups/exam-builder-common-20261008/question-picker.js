/* Shared candidate editor. Callers own scope, question data and undo history. */
(() => {
  const escape = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  let active = null;
  window.ExamQuestionPicker = {
    open(config) {
      if (active) return;
      const dialog = document.createElement("dialog");
      dialog.className = "eqp-dialog";
      dialog.setAttribute("aria-labelledby", "eqp-title");
      const added = new Map();
      const originalOrder = new Map(
        config.getCandidates().map((q, index) => [q.id, index]),
      );
      const levels = [
        "전체",
        ...new Set(config.levels || config.getCandidates().map((q) => q.level)),
      ];
      let level = "전체",
        unit = String(config.initialUnit ?? ""),
        search = "",
        page = 0;
      const pageSize = 12;
      const isReplace = config.mode === "replace";
      dialog.innerHTML = `<div class="eqp-layout"><header class="eqp-head"><div><h2 id="eqp-title">${isReplace ? "문항 교체" : "난이도별 문항 추가"}</h2><p>${escape(config.scopeLabel || "현재 출제 범위")} · 이미 담은 문항 제외</p></div><button type="button" data-eqp-close aria-label="문항 선택 닫기">닫기</button></header><div class="eqp-filters"><div class="eqp-levels" role="group" aria-label="문항 난이도"></div><div class="eqp-search"><label>범위<select data-eqp-unit><option value="">전체 선택 범위</option>${config.units.map((u) => `<option value="${escape(u.value)}">${escape(u.label)}</option>`).join("")}</select></label><label>문항 검색<input type="search" data-eqp-search placeholder="문제 내용으로 검색" autocomplete="off"></label></div></div><div class="eqp-results"><div class="eqp-result-head"><p data-eqp-count role="status"></p><span>자체 작성 예시</span></div><div class="eqp-grid"></div><nav class="eqp-pagination" aria-label="후보 문항 페이지"></nav></div><footer class="eqp-footer"><p data-eqp-summary role="status"></p><button class="eqp-primary" type="button" data-eqp-close>${isReplace ? "취소" : "완료"}</button></footer></div>`;
      document.body.append(dialog);
      active = dialog;
      const select = dialog.querySelector("[data-eqp-unit]");
      select.value = unit;
      unit = select.value;
      const matches = (q) =>
        (!unit || String(q.unit) === unit) &&
        (!search ||
          [q.prompt, q.unitName, ...(q.choices || [])]
            .join(" ")
            .toLocaleLowerCase()
            .includes(search.toLocaleLowerCase()));
      function render(focusId) {
        const candidates = config.getCandidates();
        const available = candidates.filter(matches);
        const displayed = [...candidates, ...added.values()]
          .filter(matches)
          .filter((q) => level === "전체" || q.level === level)
          .sort((a, b) => originalOrder.get(a.id) - originalOrder.get(b.id));
        const remaining = available.filter(
          (q) => level === "전체" || q.level === level,
        ).length;
        dialog.querySelector(".eqp-levels").innerHTML = levels
          .map(
            (l) =>
              `<button type="button" data-eqp-level="${escape(l)}" aria-pressed="${level === l}">${escape(l)} <span>${l === "전체" ? available.length : available.filter((q) => q.level === l).length}</span></button>`,
          )
          .join("");
        const pages = Math.max(1, Math.ceil(displayed.length / pageSize));
        page = Math.min(page, pages - 1);
        dialog.querySelector("[data-eqp-count]").textContent =
          `${level} · 선택 가능한 ${remaining}문항`;
        dialog.querySelector(".eqp-grid").innerHTML = displayed.length
          ? displayed
              .slice(page * pageSize, (page + 1) * pageSize)
              .map(
                (q) =>
                  `<article class="eqp-card" data-candidate-id="${escape(q.id)}" data-level="${escape(q.level)}"><div class="eqp-meta"><span>${escape(q.unitName)}</span><b>${escape(q.level)}</b></div>${q.passage ? `<details><summary>연결 지문 보기</summary><p class="eqp-passage">${escape(q.passage)}</p></details>` : ""}<p class="eqp-prompt">${escape(q.prompt)}</p>${q.choices?.length ? `<ol class="eqp-choices">${q.choices.map((choice) => `<li>${escape(choice)}</li>`).join("")}</ol>` : ""}<button type="button" class="eqp-pick ${added.has(q.id) ? "eqp-added" : "eqp-primary"}" data-eqp-pick="${escape(q.id)}" ${added.has(q.id) ? 'aria-disabled="true"' : ""}>${added.has(q.id) ? "✓ 추가됨" : isReplace ? "이 문항으로 교체" : "＋ 이 문항 추가"}</button></article>`,
              )
              .join("")
          : `<div class="eqp-empty"><strong>조건에 맞는 남은 문항이 없습니다.</strong><p>난이도·범위·검색 조건을 바꿔 확인하세요.</p><button type="button" data-eqp-reset>필터 초기화</button></div>`;
        dialog.querySelector(".eqp-pagination").innerHTML =
          pages > 1
            ? `<button type="button" data-eqp-page="-1" ${page === 0 ? "disabled" : ""}>이전</button><span>${page + 1} / ${pages}</span><button type="button" data-eqp-page="1" ${page + 1 === pages ? "disabled" : ""}>다음</button>`
            : "";
        dialog.querySelector("[data-eqp-summary]").textContent =
          `${added.size ? `이번에 ${added.size}문항 추가 · ` : ""}현재 시험지 ${config.getCount()}문항${isReplace ? " · 기존 번호에 교체됩니다." : " · 원하는 문제를 연속으로 추가하세요."}`;
        if (focusId)
          dialog
            .querySelector(`[data-eqp-pick="${CSS.escape(focusId)}"]`)
            ?.focus({ preventScroll: true });
      }
      dialog.addEventListener("click", (event) => {
        const button = event.target.closest("button");
        if (!button || button.disabled) return;
        if (button.hasAttribute("data-eqp-close")) {
          dialog.close();
          return;
        }
        if (button.dataset.eqpLevel !== undefined) {
          level = button.dataset.eqpLevel;
          page = 0;
          render();
          [...dialog.querySelectorAll("[data-eqp-level]")]
            .find((el) => el.dataset.eqpLevel === level)
            ?.focus();
        }
        if (button.hasAttribute("data-eqp-reset")) {
          level = "전체";
          unit = "";
          search = "";
          page = 0;
          select.value = "";
          dialog.querySelector("[data-eqp-search]").value = "";
          render();
          dialog.querySelector("[data-eqp-level]").focus();
        }
        if (button.dataset.eqpPage) {
          page += Number(button.dataset.eqpPage);
          render();
          dialog.querySelector(".eqp-results").scrollTop = 0;
          dialog.querySelector(".eqp-pick")?.focus();
        }
        if (button.dataset.eqpPick) {
          const id = button.dataset.eqpPick;
          const q = config
            .getCandidates()
            .find((candidate) => candidate.id === id);
          if (!q || added.has(id)) return;
          if (config.onChoose(id) === false) return;
          if (isReplace) {
            dialog.close();
            return;
          }
          added.set(id, q);
          render(id);
        }
      });
      select.addEventListener("change", () => {
        unit = select.value;
        page = 0;
        render();
      });
      dialog
        .querySelector("[data-eqp-search]")
        .addEventListener("input", (event) => {
          search = event.target.value.trim();
          page = 0;
          render();
        });
      dialog.addEventListener(
        "close",
        () => {
          dialog.remove();
          active = null;
          config.onClose?.();
        },
        { once: true },
      );
      render();
      dialog.showModal();
      dialog.querySelector("[data-eqp-level]").focus();
    },
  };
})();
