/* Shared prototype scope UI. No account data or persistence. */
(() => {
  const subject =
    new URLSearchParams(location.search).get("subject") === "english"
      ? "영어"
      : "수학";
  const esc = (value) =>
    String(value).replace(
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
  let serial = 0;
  function create({ sampleUnits, onApply }) {
    const prefix = `scope-${++serial}`;
    const examples = sampleUnits.map((u, i) => ({
      id: `sample-${i}`,
      grade: "중1",
      source: "시안 문항",
      chapter: "문항 편집 체험",
      section: u.name,
      sampleIndex: i,
      count: u.count,
    }));
    const catalog = [...examples, ...window.ExamScopeData[subject]];
    const byId = new Map(catalog.map((r) => [r.id, r]));
    const known = (ids) => [...new Set(ids)].filter((id) => byId.has(id));
    const rowsOf = (ids) => known(ids).map((id) => byId.get(id));
    const sampleIndices = (ids) =>
      rowsOf(ids)
        .filter((r) => Number.isInteger(r.sampleIndex))
        .map((r) => r.sampleIndex);
    const path = (r) =>
      `${r.grade} · ${r.source} · ${r.chapter} › ${r.section}`;
    function describe(ids) {
      const rows = rowsOf(ids);
      return rows.length
        ? rows
            .slice(0, 2)
            .map((r) => `${r.grade} ${r.section}`)
            .join(" · ") + (rows.length > 2 ? ` 외 ${rows.length - 2}개` : "")
        : "출제할 범위를 선택하세요";
    }
    function summaryHTML(ids) {
      const rows = rowsOf(ids),
        covered = rows.filter((r) => Number.isInteger(r.sampleIndex));
      return `<div class="scope-summary"><div><strong>출제 범위 <span>${rows.length}개 선택</span></strong><p>${esc(describe(ids))}</p></div><button type="button" data-scope-open>범위 ${rows.length ? "변경" : "선택"}</button></div><p class="scope-help">학년·자료로 좁히거나 단원·차시를 검색해 선택합니다.</p>${rows.length !== covered.length ? `<p class="scope-coverage" role="status">선택한 ${rows.length}개 범위 중 ${rows.length - covered.length}개는 범위 탐색용입니다. 이 시안에는 해당 문항이 연결되어 있지 않습니다.</p>` : ""}`;
    }
    const dialog = document.createElement("dialog");
    dialog.className = "scope-dialog";
    dialog.setAttribute("aria-labelledby", prefix + "-title");
    dialog.innerHTML = `<div class="scope-dialog-shell"><header class="scope-dialog-head"><div><h2 id="${prefix}-title">출제 범위 선택</h2><p>${esc("오늘의 " + subject)} · 학년과 자료 안에서 필요한 범위를 고르세요.</p></div><button type="button" data-scope-cancel aria-label="범위 선택 닫기">닫기</button></header><div class="scope-dialog-body"><section class="scope-browser" aria-label="범위 탐색"><div class="scope-filters"><label>학년·과정<select data-scope-grade><option value="">전체 학년·과정</option>${[...new Set(catalog.map((r) => r.grade))].map((g) => `<option value="${esc(g)}">${esc(g)}</option>`).join("")}</select></label><label>${subject === "영어" ? "교재·자료" : "자료"}<select data-scope-source><option value="">전체 자료</option>${[...new Set(catalog.map((r) => r.source))].map((s) => `<option>${esc(s)}</option>`).join("")}</select></label></div><label class="scope-search-label">단원·차시 검색<input type="search" data-scope-search placeholder="현재 학년·자료에서 검색" autocomplete="off"></label><div class="scope-result-tools"><span data-scope-result-count role="status"></span><button type="button" data-scope-select-results>현재 결과 모두 선택</button></div><div class="scope-results" tabindex="0" aria-label="범위 검색 결과" data-scope-results></div><div class="scope-pager" data-scope-pager></div></section><aside class="scope-selection" aria-label="선택한 범위"><div class="scope-selection-head"><h3>선택한 범위 <span data-scope-total></span></h3><button type="button" data-scope-clear>전체 해제</button></div><p>학년·검색 조건을 바꿔도 선택은 유지됩니다.</p><div class="scope-selected-list" tabindex="0" aria-label="선택한 범위 목록" data-scope-selected></div><div class="scope-pager" data-scope-selected-pager></div></aside></div><div class="scope-evidence">${subject === "수학" ? "범위 탐색: 저장소의 수학 교육과정 735개 차시." : "범위 탐색: 교과서형·수업 자료 216개 예시 항목."} 문항 편집 체험은 ‘시안 문항’ 범위에만 연결됩니다.</div><footer class="scope-dialog-foot"><span data-scope-foot-count role="status"></span><div><button type="button" data-scope-cancel>취소</button><button type="button" class="scope-primary" data-scope-apply>선택 적용</button></div></footer></div>`;
    document.body.append(dialog);
    const $ = (name) => dialog.querySelector(`[data-scope-${name}]`);
    let draft = new Set(),
      page = 0,
      selectedPage = 0,
      returnFocus = null;
    let expanded = new Set();
    const keyOf = (r) => `${r.grade}|${r.source}|${r.chapter}`;
    function filtered() {
      const query = $("search").value.trim().toLocaleLowerCase();
      return catalog.filter(
        (r) =>
          (!$("grade").value || r.grade === $("grade").value) &&
          (!$("source").value || r.source === $("source").value) &&
          (!query || path(r).toLocaleLowerCase().includes(query)),
      );
    }
    function leaf(r) {
      return `<label class="scope-leaf"><input type="checkbox" data-scope-leaf="${r.id}" ${draft.has(r.id) ? "checked" : ""}><span><b>${esc(r.section)}</b><small>${esc(r.grade + " · " + r.source + " · " + r.chapter)}</small></span>${r.sampleIndex !== undefined ? `<em>예시 ${r.count}문항</em>` : ""}</label>`;
    }
    function pagerHTML(current, total, type) {
      if (total <= 1) return "";
      return `<button type="button" data-scope-${type}="-1" ${current === 0 ? "disabled" : ""} aria-label="${type === "page" ? "범위 결과" : "선택 목록"} 이전 페이지">이전</button><span>${current + 1} / ${total}</span><button type="button" data-scope-${type}="1" ${current === total - 1 ? "disabled" : ""} aria-label="${type === "page" ? "범위 결과" : "선택 목록"} 다음 페이지">다음</button>`;
    }
    function renderSelected() {
      const rows = rowsOf([...draft]);
      const total = Math.ceil(rows.length / 10);
      selectedPage = Math.max(0, Math.min(selectedPage, total - 1));
      $("total").textContent = rows.length;
      $("foot-count").textContent = `${rows.length}개 범위 선택`;
      $("clear").disabled = !rows.length;
      $("selected").innerHTML = rows.length
        ? rows
            .slice(selectedPage * 10, selectedPage * 10 + 10)
            .map(
              (r) =>
                `<div class="scope-selected-row"><div><b>${esc(r.section)}</b><small>${esc(r.grade + " · " + r.source + " · " + r.chapter)}</small></div><button type="button" data-scope-remove="${r.id}" aria-label="${esc(r.section)} 선택 해제">해제</button></div>`,
            )
            .join("")
        : '<div class="scope-empty">아직 선택한 범위가 없습니다.<br>왼쪽 목록에서 범위를 선택하세요.</div>';
      $("selected-pager").innerHTML = pagerHTML(
        selectedPage,
        total,
        "selected-page",
      );
    }
    function renderResults() {
      const rows = filtered(),
        searching = Boolean($("search").value.trim());
      $("result-count").textContent = `${rows.length}개 범위`;
      $("select-results").disabled = !rows.length;
      const groups = new Map();
      rows.forEach((r) => {
        const key = keyOf(r);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(r);
      });
      const entries = [...groups.entries()],
        total = Math.ceil(
          (searching ? rows.length : entries.length) / (searching ? 30 : 10),
        );
      page = Math.max(0, Math.min(page, total - 1));
      $("results").innerHTML = !rows.length
        ? '<div class="scope-empty"><strong>검색 결과가 없습니다</strong><p>검색어나 학년·자료 조건을 바꿔보세요.</p><button type="button" data-scope-reset-filters>검색 조건 초기화</button></div>'
        : searching
          ? rows
              .slice(page * 30, page * 30 + 30)
              .map(leaf)
              .join("")
          : entries
              .slice(page * 10, page * 10 + 10)
              .map(
                ([key, items], i) =>
                  `<details class="scope-group" data-scope-group="${esc(key)}" ${expanded.has(key) ? "open" : ""}><summary><strong>${esc(items[0].chapter)}</strong><span>${esc(items[0].grade + " · " + items[0].source)} · ${items.length}개</span></summary><label class="scope-group-check"><input type="checkbox" data-scope-group-check="${esc(key)}" aria-label="${esc(items[0].chapter)} 전체 선택">이 단원 전체 선택</label>${items.map(leaf).join("")}</details>`,
              )
              .join("");
      $("pager").innerHTML = pagerHTML(page, total, "page");
      dialog.querySelectorAll("[data-scope-group-check]").forEach((el) => {
        const items = groups.get(el.dataset.scopeGroupCheck),
          count = items.filter((r) => draft.has(r.id)).length;
        el.checked = count === items.length;
        el.indeterminate = count > 0 && count < items.length;
      });
      dialog.querySelectorAll("details[data-scope-group]").forEach((el) =>
        el.addEventListener("toggle", () => {
          if (el.open) expanded.add(el.dataset.scopeGroup);
          else expanded.delete(el.dataset.scopeGroup);
        }),
      );
    }
    function syncChecks() {
      dialog
        .querySelectorAll("[data-scope-leaf]")
        .forEach((el) => (el.checked = draft.has(el.dataset.scopeLeaf)));
      dialog.querySelectorAll("[data-scope-group-check]").forEach((el) => {
        const rows = catalog.filter(
            (r) => keyOf(r) === el.dataset.scopeGroupCheck,
          ),
          count = rows.filter((r) => draft.has(r.id)).length;
        el.checked = count === rows.length;
        el.indeterminate = count > 0 && count < rows.length;
      });
      renderSelected();
    }
    function close() {
      dialog.close();
    }
    dialog.addEventListener("close", () => {
      if (returnFocus?.isConnected) returnFocus.focus();
      else document.querySelector("[data-scope-open]")?.focus();
    });
    dialog.addEventListener("change", (e) => {
      if (e.target.matches("[data-scope-grade],[data-scope-source]")) {
        page = 0;
        renderResults();
      }
      if (e.target.dataset.scopeLeaf) {
        if (e.target.checked) draft.add(e.target.dataset.scopeLeaf);
        else draft.delete(e.target.dataset.scopeLeaf);
        syncChecks();
      }
      if (e.target.dataset.scopeGroupCheck) {
        catalog
          .filter((r) => keyOf(r) === e.target.dataset.scopeGroupCheck)
          .forEach((r) =>
            e.target.checked ? draft.add(r.id) : draft.delete(r.id),
          );
        syncChecks();
      }
    });
    $("search").addEventListener("input", () => {
      page = 0;
      renderResults();
    });
    dialog.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.hasAttribute("data-scope-cancel")) close();
      if (b.hasAttribute("data-scope-clear")) {
        draft.clear();
        syncChecks();
        $("search").focus();
      }
      if (b.hasAttribute("data-scope-select-results")) {
        filtered().forEach((r) => draft.add(r.id));
        syncChecks();
      }
      if (b.dataset.scopeRemove) {
        draft.delete(b.dataset.scopeRemove);
        syncChecks();
        $("selected").focus();
      }
      if (b.hasAttribute("data-scope-reset-filters")) {
        $("grade").value = "";
        $("source").value = "";
        $("search").value = "";
        page = 0;
        renderResults();
        $("search").focus();
      }
      if (b.dataset.scopePage) {
        page += Number(b.dataset.scopePage);
        renderResults();
        $("results").scrollTop = 0;
        $("results").focus();
      }
      if (b.dataset.scopeSelectedPage) {
        selectedPage += Number(b.dataset.scopeSelectedPage);
        renderSelected();
        $("selected").scrollTop = 0;
        $("selected").focus();
      }
      if (b.hasAttribute("data-scope-apply")) {
        const ids = known([...draft]);
        close();
        onApply({ ids, sampleIndices: sampleIndices(ids) });
      }
    });
    function open(ids) {
      returnFocus = document.activeElement;
      draft = new Set(known(ids));
      page = 0;
      selectedPage = 0;
      $("grade").value = "중1";
      $("source").value = "";
      $("search").value = "";
      expanded = new Set();
      renderResults();
      renderSelected();
      dialog.showModal();
      $("search").focus();
    }
    return {
      catalog,
      defaultIds: examples.slice(0, 2).map((r) => r.id),
      sampleIndices,
      summaryHTML,
      describe,
      open,
    };
  }
  window.ExamScope = { subject, productName: "오늘의 " + subject, create };
})();
