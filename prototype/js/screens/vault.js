/* 경험 위키 — #/vault?kw=<키워드>&q=<검색어>
   경험(끝낸 대화 하나) → 경험을 모은 경험 카드 목록 + 최근 변경.
   프로젝트도 위키 안의 묶음이다: 프로젝트 줄(카드) + 프로젝트별 묶음, 각 프로젝트 페이지는 #/vault/p/:id */
(function (App) {
  const esc = (s) => App.ui.esc(s);
  const VIEW_KEY = 'rewrite-vault-view';
  const GROUP_KEY = 'rewrite-vault-group';
  const SORTS = [['updated', '최근 수정순'], ['exps', '경험 많은순'], ['period', '기간순']];
  const GROUPS = [['project', '프로젝트별'], ['keyword', '역량별'], ['recent', '최근 순']];

  function loadView() { try { return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid'; } catch (e) { return 'grid'; } }
  function saveView(v) { try { localStorage.setItem(VIEW_KEY, v); } catch (e) { /* ignore */ } }
  function loadGroup() { try { const g = localStorage.getItem(GROUP_KEY); return GROUPS.some(([v]) => v === g) ? g : 'project'; } catch (e) { return 'project'; } }
  function saveGroup(v) { try { localStorage.setItem(GROUP_KEY, v); } catch (e) { /* ignore */ } }
  const expCounts = () => App.ai.expCounts();
  const projShort = (p) => (p.title.match(/「[^」]+」/) || [p.title.split(' — ')[0]])[0];

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
    if (st.sort === 'exps') list = App.ai.rankCards(list);
    else if (st.sort === 'period') list.sort((a, b) => ((b.period && b.period.start) || '').localeCompare((a.period && a.period.start) || ''));
    return list;
  }

  function isFiltered(st) { return !!(st.q.trim() || st.kws.size || st.category); }

  // key: 같은 경험이 여러 묶음(역량별)에 나올 수 있어 메뉴마다 고유 키를 쓴다
  function menuHTML(e, key) {
    key = key || e.id;
    return `<div class="vt-menu-wrap">
      <button type="button" class="vt-menu-btn" data-menu="${esc(key)}" aria-label="더보기" title="더보기">⋯</button>
      <div class="vt-menu" data-menu-for="${esc(key)}" hidden>
        <button type="button" data-act="view" data-id="${esc(e.id)}">보기</button>
        <button type="button" data-act="edit" data-id="${esc(e.id)}">수정</button>
        <button type="button" class="vt-menu-danger" data-act="delete" data-id="${esc(e.id)}">삭제</button>
      </div></div>`;
  }

  function gridHTML(list, pre = '') {
    return `<div class="vt-grid">${list.map((e) => `<div class="vt-item">${App.ui.expCard(e)}${menuHTML(e, pre + e.id)}</div>`).join('')}</div>`;
  }

  function listHTML(list, pre = '') {
    const n = expCounts();
    return `<div class="card vt-table">
      <div class="vt-row vt-row-head"><div>경험 카드</div><div>유형</div><div>기간</div><div>역량 키워드</div><div>경험</div><div></div></div>
      ${list.map((e) => `<div class="vt-row" data-href="#/card/${esc(e.id)}">
        <div class="vt-c-title"><span class="vt-t">${esc(e.title)}</span>${e.projectId && App.store.getProject(e.projectId) ? '<span class="vt-from" title="프로젝트의 경험">▤</span>' : ''}</div>
        <div class="vt-c-cat">${esc(e.category)}</div>
        <div class="vt-c-period">${App.ui.period(e.period)}</div>
        <div class="vt-c-kws">${e.keywords.map((k) => App.ui.keywordChip(k)).join('') || '<span class="subtle">—</span>'}</div>
        <div class="vt-c-n">경험 ${n[e.id] || 0}</div>
        <div class="vt-c-act">${menuHTML(e, pre + e.id)}</div>
      </div>`).join('')}
    </div>`;
  }

  function emptyHTML(st) {
    if (!App.store.list().length) {
      return `<div class="card vt-empty"><div class="vt-empty-ico">📭</div><h3>아직 위키에 경험 카드가 없어요</h3>
        <p class="muted">평범해 보이는 일도 좋은 경험이 될 수 있어요. AI와 한 줄만 이야기해도 경험이 되고, 경험을 모으면 경험 카드가 돼요.</p>
        <div class="row vt-empty-actions"><button type="button" class="btn btn-primary" data-capture>＋ 기록하기</button></div></div>`;
    }
    if (st.kws.size) {
      const names = Array.from(st.kws);
      return `<div class="card vt-empty"><div class="vt-empty-kws">${names.map((k) => App.ui.keywordChip(k, { size: 'lg' })).join('')}</div>
        <h3>이 역량의 경험 카드가 아직 없어요</h3>
        <p class="muted">이 역량이 드러났던 순간을 AI와 대화하며 정리해 볼까요? 길게 대화하면 경험 카드가 바로 만들어져요.</p>
        <div class="row vt-empty-actions"><a class="btn btn-primary" href="#/ask/new?mode=deep&kw=${encodeURIComponent(names[0])}">✦ 경험 정리하기</a>
        <button type="button" class="btn" data-act="reset">필터 초기화</button></div></div>`;
    }
    return `<div class="card vt-empty"><div class="vt-empty-ico">🔍</div><h3>조건에 맞는 경험 카드가 없어요</h3>
      <p class="muted">검색어를 바꾸거나 필터를 풀어 보세요.</p>
      <div class="row vt-empty-actions"><button type="button" class="btn" data-act="reset">필터 초기화</button><button type="button" class="btn btn-primary" data-capture>＋ 기록하기</button></div></div>`;
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
          <button type="button" data-view="grid" class="${st.view === 'grid' ? 'is-on' : ''}" title="격자로 보기">▦</button>
          <button type="button" data-view="list" class="${st.view === 'list' ? 'is-on' : ''}" title="목록으로 보기">☰</button>
        </div>
      </div>
    </div>
    <div class="vt-statusbar">
      <div class="vt-seg" role="group" aria-label="묶어 보기">${GROUPS.map(([v, l]) => `<button type="button" data-group="${v}" class="${st.group === v ? 'is-on' : ''}">${l}</button>`).join('')}</div>
    </div>
    <div class="vt-kwbar">
      <div class="vt-kwbar-lb">역량 키워드 <span class="subtle">· 여러 개 고르면 하나라도 포함된 경험을 보여줘요</span></div>
      <div class="vt-kchips" data-vt-chips>${chipRowHTML(st)}</div>
    </div>`;
  }

  function itemsHTML(st, list, pre) { return st.view === 'list' ? listHTML(list, pre) : gridHTML(list, pre); }
  const srcCount = (list) => list.reduce((n, e) => n + App.wiki.sourcesOf(e).filter((x) => x.type !== 'code').length, 0);
  const codeCount = (list) => list.reduce((n, e) => n + (e.codeRefs || []).length, 0);

  const projHref = (id, tab) => '#/vault/p/' + encodeURIComponent(id) + (tab ? '?tab=' + tab : '');
  // 진행 중 먼저, 그다음 최근 시작한 순
  const sortedProjects = () => App.store.projects().slice().sort((a, b) => (a.status === 'done') - (b.status === 'done')
    || ((b.period && b.period.start) || '').localeCompare((a.period && a.period.start) || ''));

  // 프로젝트 줄: 위키 안의 프로젝트 페이지들 (경험이 아직 없어도 여기서 들어갈 수 있다)
  function projectsHTML() {
    const ps = sortedProjects();
    const ongoing = ps.filter((p) => p.status !== 'done').length;
    return `<div class="vt-list-head vt-proj-head"><h2>프로젝트 <span class="subtle">${ps.length}</span></h2>
        <span class="vt-proj-note subtle">${ongoing ? `진행 중 ${ongoing}개 · 프로젝트마다 그 프로젝트 이야기를 나눈 경험이 모여요` : '진행 중인 일을 프로젝트로 만들면 그 이야기를 나눈 경험이 한곳에 모여요'}</span>
        <button type="button" class="btn btn-sm vt-proj-new" data-act="new-project">＋ 새 프로젝트</button></div>
      ${ps.length ? `<div class="vt-proj-strip">${ps.map((p) => App.ui.projectCard(p)).join('')}</div>`
        : `<button type="button" class="pj-card-new vt-proj-empty" data-act="new-project"><span>＋</span>팀 프로젝트·사이드 프로젝트·과제 무엇이든, 첫 프로젝트를 만들어 보세요</button>`}`;
  }

  // 프로젝트별: 프로젝트 페이지마다 그 경험들 + 프로젝트 밖 경험
  function byProjectHTML(st, list) {
    const out = [];
    const filtered = isFiltered(st);
    sortedProjects().forEach((p) => {
      const items = list.filter((e) => e.projectId === p.id);
      if (!items.length && filtered) return;
      const code = codeCount(items);
      out.push(`<section class="vt-group">
        <div class="vt-group-head"><a class="vt-group-t" href="${projHref(p.id)}">▤ ${esc(projShort(p))}</a>
          ${App.ui.projectStatusTag ? App.ui.projectStatusTag(p.status) : App.ui.statusTag(p.status)}<span class="vt-group-meta">${App.ui.period(p.period)} · 카드 ${items.length}${code ? ` · <a class="vt-group-code" href="${projHref(p.id, 'code')}">코드 근거 ${code}</a>` : ''}</span>
          <a class="vt-group-more" href="${projHref(p.id)}">프로젝트 페이지 →</a></div>
        ${items.length ? itemsHTML(st, items, 'p' + p.id + '-')
          : `<div class="vt-group-empty">아직 이 프로젝트의 경험 카드가 없어요. 프로젝트 이야기를 남기거나 코드를 분석하면 생겨요.
            <button type="button" class="btn btn-sm btn-ghost" data-capture data-capture-project="${esc(p.id)}">＋ 이 프로젝트 기록하기</button></div>`}</section>`);
    });
    const loose = list.filter((e) => !e.projectId || !App.store.getProject(e.projectId));
    if (loose.length) {
      out.push(`<section class="vt-group">
        <div class="vt-group-head"><span class="vt-group-t">프로젝트 밖 경험 카드</span><span class="vt-group-meta">카드 ${loose.length}</span></div>
        ${itemsHTML(st, loose, 'loose-')}</section>`);
    }
    return out.join('');
  }

  // 역량별: 키워드마다 그 역량을 보여 주는 경험 + 근거 수
  function byKeywordHTML(st, list) {
    const map = new Map();
    list.forEach((e) => e.keywords.forEach((k) => { if (st.kws.size && !st.kws.has(k)) return; if (!map.has(k)) map.set(k, []); map.get(k).push(e); }));
    const keys = Array.from(map.keys()).sort((a, b) => map.get(b).length - map.get(a).length || srcCount(map.get(b)) - srcCount(map.get(a)));
    const out = keys.map((k) => {
      const items = map.get(k);
      return `<section class="vt-group">
        <div class="vt-group-head">${App.ui.keywordChip(k, { size: 'lg' })}<span class="vt-group-meta">카드 ${items.length} · 경험 ${srcCount(items)}</span>
          <span class="vt-group-desc subtle">${esc(App.keywords.get(k).desc || '')}</span></div>
        ${itemsHTML(st, items, 'k' + k + '-')}</section>`;
    });
    const none = st.kws.size ? [] : list.filter((e) => !e.keywords.length);
    if (none.length) {
      out.push(`<section class="vt-group">
        <div class="vt-group-head"><span class="vt-group-t">역량이 아직 없는 카드</span><span class="vt-group-meta">카드 ${none.length}</span></div>
        ${itemsHTML(st, none, 'none-')}</section>`);
    }
    return out.join('');
  }

  function resultsHTML(st) {
    const list = filterList(st);
    const head = `<div class="vt-reshead"><div class="vt-count"><b>${list.length}</b>개의 경험${isFiltered(st) ? ` <span class="subtle">/ 전체 ${App.store.list().length}개</span>` : ''}</div>
      ${isFiltered(st) ? '<button type="button" class="btn btn-sm btn-ghost" data-act="reset">↺ 필터 초기화</button>' : ''}</div>`;
    if (!list.length && !(st.group === 'project' && !isFiltered(st) && App.store.projects().length)) return head + emptyHTML(st);
    if (st.group === 'project') return head + byProjectHTML(st, list);
    if (st.group === 'keyword') return head + byKeywordHTML(st, list);
    return head + itemsHTML(st, list, '');
  }

  function initState(params) {
    const kws = new Set();
    if (params.kw) params.kw.split(',').map((x) => x.trim()).filter(Boolean).forEach((k) => kws.add(k));
    return { q: params.q || '', kws, category: params.category || '', sort: 'updated', view: loadView(), group: loadGroup() };
  }

  function feedHTML() {
    const list = App.wiki.entries().slice(0, 8);
    return `<div class="vt-panel-head"><h2>최근 변경</h2><span class="subtle">기록이 어느 카드를 바꿨는지</span></div>
      ${list.length ? `<div class="wk-feed">${list.map((e) => App.wiki.reportHTML(e, { compact: true })).join('')}</div>`
        : '<div class="vt-soft">아직 변경 기록이 없어요. 질문함에서 질문에 답하거나 ＋ 기록하기로 시작해 보세요.</div>'}`;
  }
  function statsText() {
    const s = App.wiki.stats();
    const ongoing = App.store.projects().filter((p) => p.status !== 'done').length;
    const exps = App.wiki.experienceItems ? App.wiki.experienceItems().length : 0;
    return `경험 카드 ${s.pages} · 경험 ${exps} · 프로젝트 ${s.projects}${ongoing ? ` (진행 중 ${ongoing})` : ''}`;
  }

  App.screens.vault = {
    title: '경험 위키',
    render(params) {
      const st = initState(params);
      return `<div class="page vt-page">
        <div class="page-head vt-pagehead">
          <div><h1>경험 위키</h1>
            <p>AI와 나눈 대화 하나하나가 경험이 되고, 경험을 모은 <b>경험 카드</b>는 면접·이력서·자소서에 바로 꺼내 써요. 프로젝트별로 묶어 둬요.</p>
            <div class="vt-stats" data-vt-stats>${statsText()}</div></div>
          <div class="row vt-head-acts"><button type="button" class="btn btn-primary" data-capture>＋ 기록하기</button></div>
        </div>
        <div class="vt-wk">
          <section class="card card-pad vt-panel" data-vt-feed>${feedHTML()}</section>
        </div>
        <section class="vt-projects" data-vt-projects>${projectsHTML()}</section>
        <div class="vt-list-head"><h2>경험 카드 <span class="subtle" data-vt-total>${App.store.list().length}</span></h2></div>
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
        root.querySelectorAll('[data-group]').forEach((b) => b.classList.toggle('is-on', b.getAttribute('data-group') === st.group));
        root.querySelectorAll('[data-view]').forEach((b) => b.classList.toggle('is-on', b.getAttribute('data-view') === st.view));
        $('[data-act="clear-q"]').hidden = !st.q;
        syncUrl();
      }

      // 위키가 바뀐 뒤: 변경 기록·통계·목록 모두 다시
      function refreshWiki() {
        $('[data-vt-feed]').innerHTML = feedHTML();
        $('[data-vt-stats]').textContent = statsText();
        $('[data-vt-projects]').innerHTML = projectsHTML();
        $('[data-vt-total]').textContent = App.store.list().length;
        refresh();
      }

      function closeMenus(except) {
        root.querySelectorAll('.vt-menu').forEach((m) => { if (m !== except) { m.hidden = true; m.closest('.vt-item, .vt-row') && m.closest('.vt-item, .vt-row').classList.remove('menu-open'); } });
      }

      function reset() {
        st.q = ''; st.kws.clear(); st.category = '';
        $('[data-vt-q]').value = ''; $('[data-vt-cat]').value = '';
        refresh();
      }

      function confirmDelete(id) {
        const e = App.store.get(id); if (!e) return;
        App.ui.modal({
          title: '이 경험 카드를 삭제할까요?',
          body: `<p><b>${esc(e.title)}</b></p><p style="margin-top:6px">STAR 정리와 카드가 삭제되고 되돌릴 수 없어요. 담긴 경험(대화 원문)과 프로젝트 기록은 그대로 남아요.</p>`,
          confirmText: '삭제하기', danger: true,
          onConfirm() { App.store.remove(id); App.ui.toast('경험 카드를 삭제했어요'); refreshWiki(); },
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
        const gb = t.closest('[data-group]');
        if (gb) { st.group = gb.getAttribute('data-group'); saveGroup(st.group); refresh(); return; }
        const vb = t.closest('[data-view]');
        if (vb) { st.view = vb.getAttribute('data-view'); saveView(st.view); refresh(); return; }
        const a = t.closest('[data-act]'); if (!a) return;
        const act = a.getAttribute('data-act'), id = a.getAttribute('data-id');
        if (act === 'new-project') { if (App.ui.openNewProject) App.ui.openNewProject(); }
        else if (act === 'reset') reset();
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
