/* 경험 보관함 — #/vault?kw=<키워드>&q=<검색어> */
(function (App) {
  const esc = (s) => App.ui.esc(s);
  const VIEW_KEY = 'rewrite-vault-view';
  const STATUS_FILTERS = [['', '전체'], ['draft', '작성중'], ['done', '완성']];
  const SORTS = [['updated', '최근 수정순'], ['complete', '완성도순'], ['period', '기간순']];

  function loadView() { try { return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid'; } catch (e) { return 'grid'; } }
  function saveView(v) { try { localStorage.setItem(VIEW_KEY, v); } catch (e) { /* ignore */ } }

  function allKeywordNames() {
    const master = App.keywords.all().map((k) => k.name);
    const counts = App.keywords.counts();
    Object.keys(counts).forEach((k) => { if (!master.includes(k)) master.push(k); });
    return master;
  }

  function haystack(e) {
    const s = e.star || {};
    return [e.title, e.summary, e.role, e.category, e.insights, s.situation, s.task, s.action, s.result, ...(e.keywords || []), ...(e.jobs || [])].join(' ').toLowerCase();
  }

  function filterList(st) {
    const tokens = st.q.trim().split(/\s+/).filter(Boolean);
    let list = App.store.list().filter((e) => {
      if (st.category && e.category !== st.category) return false;
      if (st.status && e.status !== st.status) return false;
      if (st.kws.size && !e.keywords.some((k) => st.kws.has(k))) return false;
      if (tokens.length) {
        const h = haystack(e);
        return tokens.every((t) => {
          if (t.startsWith('#')) { const n = t.slice(1); return !n || e.keywords.some((k) => k.includes(n)); }
          return h.includes(t.toLowerCase());
        });
      }
      return true;
    });
    if (st.sort === 'complete') list.sort((a, b) => b.completeness - a.completeness);
    else if (st.sort === 'period') list.sort((a, b) => ((b.period && b.period.start) || '').localeCompare((a.period && a.period.start) || ''));
    return list;
  }

  function isFiltered(st) { return !!(st.q.trim() || st.kws.size || st.category || st.status); }

  function menuHTML(e) {
    return `<div class="vt-menu-wrap">
      <button type="button" class="vt-menu-btn" data-menu="${esc(e.id)}" aria-label="더보기" title="더보기">⋯</button>
      <div class="vt-menu" data-menu-for="${esc(e.id)}" hidden>
        <button type="button" data-act="view" data-id="${esc(e.id)}">보기</button>
        <button type="button" data-act="edit" data-id="${esc(e.id)}">수정</button>
        <button type="button" class="vt-menu-danger" data-act="delete" data-id="${esc(e.id)}">삭제</button>
      </div></div>`;
  }

  function gridHTML(list) {
    return `<div class="vt-grid">${list.map((e) => `<div class="vt-item">${App.ui.expCard(e)}${menuHTML(e)}</div>`).join('')}</div>`;
  }

  function listHTML(list) {
    return `<div class="card vt-table">
      <div class="vt-row vt-row-head"><div>경험</div><div>유형</div><div>기간</div><div>역량 키워드</div><div>완성도</div><div></div></div>
      ${list.map((e) => `<div class="vt-row" data-href="#/card/${esc(e.id)}">
        <div class="vt-c-title">${App.ui.statusTag(e.status)}<span class="vt-t">${esc(e.title)}</span>${e.projectId && App.store.getProject(e.projectId) ? '<span class="vt-from" title="프로젝트에서 나온 카드">▤</span>' : ''}</div>
        <div class="vt-c-cat">${esc(e.category)}</div>
        <div class="vt-c-period">${App.ui.period(e.period)}</div>
        <div class="vt-c-kws">${e.keywords.map((k) => App.ui.keywordChip(k)).join('') || '<span class="subtle">—</span>'}</div>
        <div class="vt-c-comp"><span>${e.completeness}%</span>${App.ui.progress(e.completeness)}</div>
        <div class="vt-c-act">${menuHTML(e)}</div>
      </div>`).join('')}
    </div>`;
  }

  function emptyHTML(st) {
    if (!App.store.list().length) {
      return `<div class="card vt-empty"><div class="vt-empty-ico">📭</div><h3>아직 보관된 경험이 없어요</h3>
        <p class="muted">평범해 보이는 일도 좋은 경험이 될 수 있어요. AI 질문으로 첫 경험을 꺼내 볼까요?</p>
        <div class="row vt-empty-actions"><a class="btn btn-primary" href="#/discover">✦ AI와 경험 찾기</a><a class="btn" href="#/card/new">직접 추가하기</a></div></div>`;
    }
    if (st.kws.size) {
      const names = Array.from(st.kws);
      return `<div class="card vt-empty"><div class="vt-empty-kws">${names.map((k) => App.ui.keywordChip(k, { size: 'lg' })).join('')}</div>
        <h3>이 키워드의 경험이 아직 없어요</h3>
        <p class="muted">이 역량이 드러났던 순간을 AI와 찾아볼까요? 몇 가지 질문에 답하면 카드가 만들어져요.</p>
        <div class="row vt-empty-actions"><a class="btn btn-primary" href="#/discover?kw=${encodeURIComponent(names[0])}">✦ AI와 찾아보기</a>
        <button type="button" class="btn" data-act="reset">필터 초기화</button></div></div>`;
    }
    return `<div class="card vt-empty"><div class="vt-empty-ico">🔍</div><h3>조건에 맞는 경험이 없어요</h3>
      <p class="muted">검색어를 바꾸거나 필터를 풀어 보세요. 떠오르지 않는다면 AI가 먼저 질문해 드릴게요.</p>
      <div class="row vt-empty-actions"><button type="button" class="btn" data-act="reset">필터 초기화</button><a class="btn btn-primary" href="#/discover">✦ AI와 찾아보기</a></div></div>`;
  }

  function chipRowHTML(st) {
    const counts = App.keywords.counts();
    return allKeywordNames().map((k) => {
      const on = st.kws.has(k), n = counts[k] || 0;
      return `<button type="button" class="vt-kchip ${on ? 'is-on' : ''} ${n ? '' : 'is-zero'}" data-tone="${App.keywords.tone(k)}" data-kw-toggle="${esc(k)}" aria-pressed="${on}" title="${esc(App.keywords.get(k).desc)}">
        #${esc(k)}<span class="vt-kcount">${n}</span></button>`;
    }).join('');
  }

  function toolbarHTML(st) {
    return `
    <div class="vt-toolbar">
      <div class="vt-search">
        <span class="vt-search-ico">⌕</span>
        <input class="input vt-search-input" data-vt-q placeholder="제목, 내용, 키워드로 검색 (예: 성능, #협업)" value="${esc(st.q)}">
        <button type="button" class="vt-search-clear" data-act="clear-q" ${st.q ? '' : 'hidden'} aria-label="검색어 지우기">×</button>
      </div>
      <div class="vt-controls">
        <select class="select vt-sel" data-vt-cat aria-label="유형">
          <option value="">모든 유형</option>
          ${window.SEED.categories.map((c) => `<option value="${esc(c)}" ${st.category === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
        </select>
        <select class="select vt-sel" data-vt-sort aria-label="정렬">${SORTS.map(([v, l]) => `<option value="${v}" ${st.sort === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <div class="vt-viewtoggle" role="group" aria-label="보기 방식">
          <button type="button" data-view="grid" class="${st.view === 'grid' ? 'is-on' : ''}" title="카드로 보기">▦</button>
          <button type="button" data-view="list" class="${st.view === 'list' ? 'is-on' : ''}" title="목록으로 보기">☰</button>
        </div>
      </div>
    </div>
    <div class="vt-statusbar">
      <div class="vt-seg" role="group" aria-label="상태">${STATUS_FILTERS.map(([v, l]) => `<button type="button" data-status="${v}" class="${st.status === v ? 'is-on' : ''}">${l}</button>`).join('')}</div>
    </div>
    <div class="vt-kwbar">
      <div class="vt-kwbar-lb">역량 키워드 <span class="subtle">· 여러 개 고르면 하나라도 포함된 경험을 보여줘요</span></div>
      <div class="vt-kchips" data-vt-chips>${chipRowHTML(st)}</div>
    </div>`;
  }

  function resultsHTML(st) {
    const list = filterList(st);
    const head = `<div class="vt-reshead"><div class="vt-count"><b>${list.length}</b>개의 경험${isFiltered(st) ? ` <span class="subtle">/ 전체 ${App.store.list().length}개</span>` : ''}</div>
      ${isFiltered(st) ? '<button type="button" class="btn btn-sm btn-ghost" data-act="reset">↺ 필터 초기화</button>' : ''}</div>`;
    if (!list.length) return head + emptyHTML(st);
    return head + (st.view === 'list' ? listHTML(list) : gridHTML(list));
  }

  function initState(params) {
    const kws = new Set();
    if (params.kw) params.kw.split(',').map((x) => x.trim()).filter(Boolean).forEach((k) => kws.add(k));
    return { q: params.q || '', kws, category: params.category || '', status: params.status || '', sort: 'updated', view: loadView() };
  }

  App.screens.vault = {
    title: '경험 보관함',
    render(params) {
      const st = initState(params);
      const total = App.store.list().length;
      return `<div class="page vt-page">
        <div class="page-head vt-pagehead">
          <div><h1>경험 보관함</h1><p>지금까지 쌓인 경험 ${total}개 · 키워드로 찾아서 바로 꺼내 쓰세요</p></div>
          <a class="btn btn-primary" href="#/card/new">＋ 새 경험 카드</a>
        </div>
        ${toolbarHTML(st)}
        <div class="vt-results" data-vt-results>${resultsHTML(st)}</div>
      </div>`;
    },
    mount(root, params) {
      const st = initState(params);
      const $ = (s) => root.querySelector(s);
      const resultsEl = $('[data-vt-results]');
      let qTimer = null;

      function syncUrl() {
        const p = new URLSearchParams();
        if (st.kws.size) p.set('kw', Array.from(st.kws).join(','));
        if (st.q.trim()) p.set('q', st.q.trim());
        const qs = p.toString();
        try { history.replaceState(null, '', '#/vault' + (qs ? '?' + qs : '')); } catch (e) { /* ignore */ }
      }

      function highlight() {
        if (!st.kws.size) return;
        resultsEl.querySelectorAll('.exp-card-kws .kw, .vt-c-kws .kw').forEach((el) => {
          el.classList.add(st.kws.has(el.getAttribute('data-kw')) ? 'vt-kw-hit' : 'vt-kw-dim');
        });
      }

      function refresh() {
        resultsEl.innerHTML = resultsHTML(st);
        highlight();
        $('[data-vt-chips]').innerHTML = chipRowHTML(st);
        root.querySelectorAll('[data-status]').forEach((b) => b.classList.toggle('is-on', b.getAttribute('data-status') === st.status));
        root.querySelectorAll('[data-view]').forEach((b) => b.classList.toggle('is-on', b.getAttribute('data-view') === st.view));
        $('[data-act="clear-q"]').hidden = !st.q;
        syncUrl();
      }

      function closeMenus(except) {
        root.querySelectorAll('.vt-menu').forEach((m) => { if (m !== except) { m.hidden = true; m.closest('.vt-item, .vt-row') && m.closest('.vt-item, .vt-row').classList.remove('menu-open'); } });
      }

      function reset() {
        st.q = ''; st.kws.clear(); st.category = ''; st.status = '';
        $('[data-vt-q]').value = ''; $('[data-vt-cat]').value = '';
        refresh();
      }

      function confirmDelete(id) {
        const e = App.store.get(id); if (!e) return;
        App.ui.modal({
          title: '이 경험 카드를 삭제할까요?',
          body: `<p><b>${esc(e.title)}</b></p><p style="margin-top:6px">STAR 정리와 원문 기록이 함께 삭제되고 되돌릴 수 없어요.</p>`,
          confirmText: '삭제하기', danger: true,
          onConfirm() {
            App.store.remove(id); App.ui.toast('경험 카드를 삭제했어요');
            const p = root.querySelector('.vt-pagehead p'); if (p) p.textContent = `지금까지 쌓인 경험 ${App.store.list().length}개 · 키워드로 찾아서 바로 꺼내 쓰세요`;
            refresh();
          },
        });
      }

      function onClick(ev) {
        const t = ev.target;
        const mb = t.closest('[data-menu]');
        if (mb) {
          ev.stopPropagation();
          const m = root.querySelector(`[data-menu-for="${CSS.escape(mb.getAttribute('data-menu'))}"]`);
          const open = m.hidden; closeMenus(m); m.hidden = !open;
          const host = m.closest('.vt-item, .vt-row'); if (host) host.classList.toggle('menu-open', open);
          return;
        }
        if (!t.closest('.vt-menu')) closeMenus();
        const kt = t.closest('[data-kw-toggle]');
        if (kt) { const k = kt.getAttribute('data-kw-toggle'); if (st.kws.has(k)) st.kws.delete(k); else st.kws.add(k); refresh(); return; }
        const sb = t.closest('[data-status]');
        if (sb) { st.status = sb.getAttribute('data-status'); refresh(); return; }
        const vb = t.closest('[data-view]');
        if (vb) { st.view = vb.getAttribute('data-view'); saveView(st.view); refresh(); return; }
        const a = t.closest('[data-act]'); if (!a) return;
        const act = a.getAttribute('data-act'), id = a.getAttribute('data-id');
        if (act === 'reset') reset();
        else if (act === 'clear-q') { st.q = ''; const i = $('[data-vt-q]'); i.value = ''; i.focus(); refresh(); }
        else if (act === 'view') App.navigate('#/card/' + id);
        else if (act === 'edit') App.navigate('#/card/' + id + '?edit=1');
        else if (act === 'delete') { closeMenus(); confirmDelete(id); }
      }

      function onInput(ev) {
        if (!ev.target.matches('[data-vt-q]')) return;
        st.q = ev.target.value;
        clearTimeout(qTimer); qTimer = setTimeout(refresh, 120);
      }
      function onChange(ev) {
        if (ev.target.matches('[data-vt-cat]')) { st.category = ev.target.value; refresh(); }
        else if (ev.target.matches('[data-vt-sort]')) { st.sort = ev.target.value; refresh(); }
      }
      function onKey(ev) {
        if (ev.key === 'Escape') { closeMenus(); if (ev.target.matches('[data-vt-q]') && st.q) { st.q = ''; ev.target.value = ''; refresh(); } }
      }
      function onDocClick(ev) { if (!root.contains(ev.target)) closeMenus(); }

      highlight();
      root.addEventListener('click', onClick);
      root.addEventListener('input', onInput);
      root.addEventListener('change', onChange);
      root.addEventListener('keydown', onKey);
      document.addEventListener('click', onDocClick);
      return () => {
        clearTimeout(qTimer);
        root.removeEventListener('click', onClick); root.removeEventListener('input', onInput);
        root.removeEventListener('change', onChange); root.removeEventListener('keydown', onKey);
        document.removeEventListener('click', onDocClick);
      };
    },
  };
})(window.App);
