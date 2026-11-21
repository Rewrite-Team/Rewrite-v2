/* 경험 위키 — #/vault?kw=<키워드>&q=<검색어>
   기록(답변·체크인·대화·코드) → AI가 정리한 경험 페이지 목록 + 위키 점검 + 최근 변경.
   프로젝트도 위키 안의 묶음이다: 프로젝트 줄(카드) + 프로젝트별 묶음, 각 프로젝트 페이지는 #/vault/p/:id */
(function (App) {
  const esc = (s) => App.ui.esc(s);
  const VIEW_KEY = 'rewrite-vault-view';
  const GROUP_KEY = 'rewrite-vault-group';
  const STATUS_FILTERS = [['', '전체'], ['draft', '작성중'], ['done', '완성']];
  const SORTS = [['updated', '최근 수정순'], ['complete', '완성도순'], ['period', '기간순']];
  const GROUPS = [['project', '프로젝트별'], ['keyword', '역량별'], ['recent', '최근 순']];
  const ISSUE_LIMIT = 5;

  function loadView() { try { return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid'; } catch (e) { return 'grid'; } }
  function saveView(v) { try { localStorage.setItem(VIEW_KEY, v); } catch (e) { /* ignore */ } }
  function loadGroup() { try { const g = localStorage.getItem(GROUP_KEY); return GROUPS.some(([v]) => v === g) ? g : 'project'; } catch (e) { return 'project'; } }
  function saveGroup(v) { try { localStorage.setItem(GROUP_KEY, v); } catch (e) { /* ignore */ } }
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
    return `<div class="card vt-table">
      <div class="vt-row vt-row-head"><div>경험</div><div>유형</div><div>기간</div><div>역량 키워드</div><div>완성도</div><div></div></div>
      ${list.map((e) => `<div class="vt-row" data-href="#/card/${esc(e.id)}">
        <div class="vt-c-title">${App.ui.statusTag(e.status)}<span class="vt-t">${esc(e.title)}</span>${e.projectId && App.store.getProject(e.projectId) ? '<span class="vt-from" title="프로젝트의 경험">▤</span>' : ''}</div>
        <div class="vt-c-cat">${esc(e.category)}</div>
        <div class="vt-c-period">${App.ui.period(e.period)}</div>
        <div class="vt-c-kws">${e.keywords.map((k) => App.ui.keywordChip(k)).join('') || '<span class="subtle">—</span>'}</div>
        <div class="vt-c-comp"><span>${e.completeness}%</span>${App.ui.progress(e.completeness)}</div>
        <div class="vt-c-act">${menuHTML(e, pre + e.id)}</div>
      </div>`).join('')}
    </div>`;
  }

  function emptyHTML(st) {
    if (!App.store.list().length) {
      return `<div class="card vt-empty"><div class="vt-empty-ico">📭</div><h3>아직 위키에 경험이 없어요</h3>
        <p class="muted">평범해 보이는 일도 좋은 경험이 될 수 있어요. 한 줄만 기록해도 AI가 경험 페이지로 정리해요.</p>
        <div class="row vt-empty-actions"><button type="button" class="btn btn-primary" data-capture>＋ 기록하기</button><a class="btn" href="#/discover">✦ AI와 대화하며 기록</a></div></div>`;
    }
    if (st.kws.size) {
      const names = Array.from(st.kws);
      return `<div class="card vt-empty"><div class="vt-empty-kws">${names.map((k) => App.ui.keywordChip(k, { size: 'lg' })).join('')}</div>
        <h3>이 역량의 경험이 아직 없어요</h3>
        <p class="muted">이 역량이 드러났던 순간을 AI와 대화하며 기록해 볼까요? 답하면 경험 페이지가 만들어져요.</p>
        <div class="row vt-empty-actions"><a class="btn btn-primary" href="#/discover?kw=${encodeURIComponent(names[0])}">✦ AI와 대화하며 기록</a>
        <button type="button" class="btn" data-act="reset">필터 초기화</button></div></div>`;
    }
    return `<div class="card vt-empty"><div class="vt-empty-ico">🔍</div><h3>조건에 맞는 경험이 없어요</h3>
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
      <div class="vt-seg" role="group" aria-label="상태">${STATUS_FILTERS.map(([v, l]) => `<button type="button" data-status="${v}" class="${st.status === v ? 'is-on' : ''}">${l}</button>`).join('')}</div>
    </div>
    <div class="vt-kwbar">
      <div class="vt-kwbar-lb">역량 키워드 <span class="subtle">· 여러 개 고르면 하나라도 포함된 경험을 보여줘요</span></div>
      <div class="vt-kchips" data-vt-chips>${chipRowHTML(st)}</div>
    </div>`;
  }

  function itemsHTML(st, list, pre) { return st.view === 'list' ? listHTML(list, pre) : gridHTML(list, pre); }
  const srcCount = (list) => list.reduce((n, e) => n + App.wiki.sourcesOf(e).length, 0);
  const codeCount = (list) => list.reduce((n, e) => n + (e.codeRefs || []).length, 0);

  const projHref = (id, tab) => '#/vault/p/' + encodeURIComponent(id) + (tab ? '?tab=' + tab : '');
  // 진행 중 먼저, 그다음 최근 시작한 순
  const sortedProjects = () => App.store.projects().slice().sort((a, b) => (a.status === 'done') - (b.status === 'done')
    || ((b.period && b.period.start) || '').localeCompare((a.period && a.period.start) || ''));
  function checkinPill(p) {
    const q = p.status !== 'done' && App.store.openCheckin(p.id);
    return q ? `<a class="vt-ck-pill" href="#/ask/q_${encodeURIComponent(q.id)}" title="${esc(q.text || '')}">● 오늘 체크인</a>` : '';
  }

  // 프로젝트 줄: 위키 안의 프로젝트 페이지들 (경험이 아직 없어도 여기서 들어갈 수 있다)
  function projectsHTML() {
    const ps = sortedProjects();
    const ongoing = ps.filter((p) => p.status !== 'done').length;
    const due = ps.filter((p) => p.status !== 'done' && App.store.openCheckin(p.id)).length;
    const cad = App.ui.checkinCadence ? App.ui.checkinCadence() : '';
    return `<div class="vt-list-head vt-proj-head"><h2>프로젝트 <span class="subtle">${ps.length}</span></h2>
        <span class="vt-proj-note subtle">${ongoing ? `진행 중 ${ongoing}개 · ${esc(cad)} 체크인 질문을 드려요 <a class="vt-proj-cad" href="#/settings">주기 바꾸기</a>` : '진행 중인 일을 프로젝트로 만들면 체크인 질문을 드려요'}</span>
        ${due ? `<span class="vt-proj-due">오늘 체크인 ${due}개</span>` : ''}
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
          ${App.ui.projectStatusTag ? App.ui.projectStatusTag(p.status) : App.ui.statusTag(p.status)}<span class="vt-group-meta">${App.ui.period(p.period)} · 경험 ${items.length}${code ? ` · <a class="vt-group-code" href="${projHref(p.id, 'code')}">코드 근거 ${code}</a>` : ''}</span>
          ${checkinPill(p)}
          <a class="vt-group-more" href="${projHref(p.id)}">프로젝트 페이지 →</a></div>
        ${items.length ? itemsHTML(st, items, 'p' + p.id + '-')
          : `<div class="vt-group-empty">아직 이 프로젝트의 경험 문서가 없어요. 체크인을 남기거나 코드를 분석하면 생겨요.
            <button type="button" class="btn btn-sm btn-ghost" data-capture data-capture-project="${esc(p.id)}">＋ 이 프로젝트 기록하기</button></div>`}</section>`);
    });
    const loose = list.filter((e) => !e.projectId || !App.store.getProject(e.projectId));
    if (loose.length) {
      out.push(`<section class="vt-group">
        <div class="vt-group-head"><span class="vt-group-t">프로젝트 밖 경험</span><span class="vt-group-meta">경험 ${loose.length}</span></div>
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
        <div class="vt-group-head">${App.ui.keywordChip(k, { size: 'lg' })}<span class="vt-group-meta">경험 ${items.length} · 근거 ${srcCount(items)}</span>
          <span class="vt-group-desc subtle">${esc(App.keywords.get(k).desc || '')}</span></div>
        ${itemsHTML(st, items, 'k' + k + '-')}</section>`;
    });
    const none = st.kws.size ? [] : list.filter((e) => !e.keywords.length);
    if (none.length) {
      out.push(`<section class="vt-group">
        <div class="vt-group-head"><span class="vt-group-t">역량이 아직 없는 경험</span><span class="vt-group-meta">경험 ${none.length}</span></div>
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
    return { q: params.q || '', kws, category: params.category || '', status: params.status || '', sort: 'updated', view: loadView(), group: loadGroup(), allIssues: false, fixed: null, talkFor: null };
  }

  /* ---------- 위키 점검 ---------- */
  function askedFor(issue) {
    return App.store.state.inbox.some((q) => q.lintId === issue.id && (q.status === 'pending' || q.status === 'later'));
  }
  function issueHTML(i, st) {
    const acts = [];
    const open = st && st.talkFor === i.id;
    if (i.action === 'link') acts.push(`<button type="button" class="btn btn-sm btn-primary" data-issue-fix="${esc(i.id)}">바로 연결</button>`);
    if (i.question) {
      if (!open) acts.push(`<button type="button" class="btn btn-sm btn-primary" data-issue-talk="${esc(i.id)}">바로 답하기</button>`);
      acts.push(askedFor(i)
        ? '<span class="vt-asked">✓ 오늘의 질문에 있어요</span>'
        : `<button type="button" class="btn btn-sm btn-ghost vt-later" data-issue-ask="${esc(i.id)}">나중에 질문으로</button>`);
    }
    if (i.expId) acts.push(`<a class="btn btn-sm btn-ghost" href="#/card/${encodeURIComponent(i.expId)}">페이지 →</a>`);
    else if (i.projectId) acts.push(`<a class="btn btn-sm btn-ghost" href="${projHref(i.projectId, i.findingId ? 'code' : '')}">프로젝트 →</a>`);
    return `<li class="wk-issue ${open ? 'is-talking' : ''}" data-sev="${i.severity}"><span class="wk-issue-dot"></span><span class="wk-issue-text">${esc(i.text)}</span><span class="wk-issue-actions">${acts.join('')}</span>
      ${open ? `<div class="vt-talk-wrap"><button type="button" class="btn btn-ghost btn-sm vt-talk-close" data-act="close-talk" aria-label="닫기">✕</button><div data-vt-talk-slot></div></div>` : ''}</li>`;
  }
  // 점검 항목 → 그 자리에서 여는 기록 대화 설정
  function talkCfg(issue) {
    const q = issue.question; if (!q) return null;
    const src = q.targetExpId && q.stage ? { type: 'answer', expId: q.targetExpId, stage: q.stage, question: q.text }
      : q.findingId ? { type: 'answer', projectId: q.targetProjectId, findingId: q.findingId, question: q.text }
      : { type: 'answer', question: q.text };
    return {
      ask: { text: q.text, hint: q.hint || '', label: '위키 점검' }, src,
      thread: { source: 'check' },
      commit: (text, d, tid) => { const qq = App.wiki.askIssue(issue); return App.store.answer(qq.id, text, { decision: d, threadId: tid }); },
    };
  }
  function lintHTML(st) {
    const issues = App.wiki.lint();
    const shown = st.allIssues ? issues : issues.slice(0, ISSUE_LIMIT);
    const fixed = st.fixed && App.wiki.get(st.fixed);
    const kept = App.wiki.threadsFor ? App.wiki.threadsFor({ kind: 'kept' }).length : 0;
    return `<div class="vt-panel-head"><h2>위키 점검</h2><span class="subtle">${issues.length ? `채우면 좋은 곳 ${issues.length}개` : ''}</span>${kept ? `<a class="vt-kept-link" href="#/ask">💬 보관 중인 대화 ${kept}개 → 질문함</a>` : ''}</div>
      ${fixed ? `<div class="vt-fixed">${App.wiki.reportHTML(fixed)}<button type="button" class="btn btn-sm btn-ghost vt-fixed-close" data-act="close-fixed">닫기</button></div>` : ''}
      ${issues.length ? `<ul class="wk-issues">${shown.map((i) => issueHTML(i, st)).join('')}</ul>
        ${issues.length > ISSUE_LIMIT ? `<button type="button" class="btn btn-sm btn-ghost vt-more" data-act="more-issues">${st.allIssues ? '접기' : `더 보기 (${issues.length - ISSUE_LIMIT}개)`}</button>` : ''}`
        : '<div class="vt-soft">빈 곳이 없어요. 위키가 잘 정리돼 있어요.</div>'}`;
  }
  function feedHTML() {
    const list = App.wiki.entries().slice(0, 8);
    return `<div class="vt-panel-head"><h2>최근 변경</h2><span class="subtle">기록이 어느 페이지를 바꿨는지</span></div>
      ${list.length ? `<div class="wk-feed">${list.map((e) => App.wiki.reportHTML(e, { compact: true })).join('')}</div>`
        : '<div class="vt-soft">아직 변경 기록이 없어요. 질문함에서 질문에 답하거나 ＋ 기록하기로 시작해 보세요.</div>'}`;
  }
  function statsText() {
    const s = App.wiki.stats();
    const ongoing = App.store.projects().filter((p) => p.status !== 'done').length;
    return `경험 문서 ${s.pages} · 프로젝트 ${s.projects}${ongoing ? ` (진행 중 ${ongoing})` : ''} · 근거 기록 ${s.sources}`;
  }

  App.screens.vault = {
    title: '경험 위키',
    render(params) {
      const st = initState(params);
      return `<div class="page vt-page">
        <div class="page-head vt-pagehead">
          <div><h1>경험 위키</h1>
            <p>답변·체크인·AI 대화·코드 분석을 기록하면 AI가 경험 페이지로 정리하고, 프로젝트별로 묶어 둬요. 이력서와 자소서는 여기서 꺼내 써요.</p>
            <div class="vt-stats" data-vt-stats>${statsText()}</div></div>
          <div class="row vt-head-acts"><a class="btn" href="#/discover">✦ AI와 대화하며 기록</a><button type="button" class="btn btn-primary" data-capture>＋ 기록하기</button></div>
        </div>
        <div class="vt-wk">
          <section class="card card-pad vt-panel" data-vt-lint>${lintHTML(st)}</section>
          <section class="card card-pad vt-panel" data-vt-feed>${feedHTML()}</section>
        </div>
        <section class="vt-projects" data-vt-projects>${projectsHTML()}</section>
        <div class="vt-list-head"><h2>경험 페이지 <span class="subtle" data-vt-total>${App.store.list().length}</span></h2></div>
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
        root.querySelectorAll('[data-group]').forEach((b) => b.classList.toggle('is-on', b.getAttribute('data-group') === st.group));
        root.querySelectorAll('[data-view]').forEach((b) => b.classList.toggle('is-on', b.getAttribute('data-view') === st.view));
        $('[data-act="clear-q"]').hidden = !st.q;
        syncUrl();
      }

      // 위키가 바뀐 뒤: 점검·변경 기록·통계·목록 모두 다시
      // 위키 점검 항목 아래에 펼치는 기록 대화 (한 번에 하나)
      let talk = null; let talkHost = null;
      function closeTalk() { if (talk) talk.destroy(); talk = null; talkHost = null; st.talkFor = null; }
      function openTalk(issue) {
        closeTalk();
        const cfg = talkCfg(issue);
        if (!cfg) { App.ui.toast('이 기록을 찾지 못했어요'); refreshWiki(); return; }
        st.talkFor = issue.id;
        talkHost = document.createElement('div'); talkHost.className = 'vt-talk';
        talk = App.talk.mount(talkHost, Object.assign(cfg, {
          onDone: (entry) => {
            setTimeout(() => {
              closeTalk(); st.fixed = entry ? entry.id : null;
              App.ui.toast(entry ? '위키에 반영했어요' : '답변을 남겼어요');
              refreshWiki();
            }, 900);
          },
        }));
        refreshWiki();
      }
      function placeTalk() {
        if (!st.talkFor) return;
        const slot = $('[data-vt-talk-slot]');
        if (!slot || !talkHost) { closeTalk(); return; }
        slot.appendChild(talkHost);
        if (talk && talk.phase !== 'propose') { const inp = talkHost.querySelector('[data-tk-in]'); if (inp) try { inp.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
      }

      function refreshWiki() {
        const lintEl = $('[data-vt-lint]');
        if (talkHost && talkHost.parentNode) talkHost.parentNode.removeChild(talkHost); // 다시 그려도 대화는 유지
        if (st.talkFor && !App.wiki.lint().some((i) => i.id === st.talkFor)) closeTalk();
        lintEl.innerHTML = lintHTML(st);
        placeTalk();
        App.wiki.bindReport(lintEl.querySelector('.vt-fixed'), (n) => { st.fixed = n ? n.id : null; refreshWiki(); });
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
        st.q = ''; st.kws.clear(); st.category = ''; st.status = '';
        $('[data-vt-q]').value = ''; $('[data-vt-cat]').value = '';
        refresh();
      }

      function confirmDelete(id) {
        const e = App.store.get(id); if (!e) return;
        App.ui.modal({
          title: '이 경험을 삭제할까요?',
          body: `<p><b>${esc(e.title)}</b></p><p style="margin-top:6px">STAR 정리와 이 페이지에 모인 답변이 함께 삭제되고 되돌릴 수 없어요. 프로젝트 체크인 기록은 그대로 남아요.</p>`,
          confirmText: '삭제하기', danger: true,
          onConfirm() { App.store.remove(id); App.ui.toast('경험을 삭제했어요'); refreshWiki(); },
        });
      }

      function findIssue(id) { return App.wiki.lint().find((i) => i.id === id); }

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
        const ask = t.closest('[data-issue-ask]');
        if (ask) {
          const issue = findIssue(ask.getAttribute('data-issue-ask'));
          if (issue && App.wiki.askIssue(issue)) App.ui.toast('오늘의 질문으로 보냈어요. 답하면 이 페이지에 반영돼요.');
          refreshWiki(); return;
        }
        const tb = t.closest('[data-issue-talk]');
        if (tb) {
          const issue = findIssue(tb.getAttribute('data-issue-talk'));
          if (issue) openTalk(issue); else refreshWiki();
          return;
        }
        if (t.closest('.vt-talk')) return; // 대화 안의 클릭은 대화가 처리
        const fix = t.closest('[data-issue-fix]');
        if (fix) {
          const issue = findIssue(fix.getAttribute('data-issue-fix'));
          const entry = issue && App.wiki.fixIssue(issue);
          st.fixed = entry ? entry.id : null;
          App.ui.toast(entry ? '위키에 반영했어요' : '반영할 내용이 없었어요');
          refreshWiki(); return;
        }
        const kt = t.closest('[data-kw-toggle]');
        if (kt) { const k = kt.getAttribute('data-kw-toggle'); if (st.kws.has(k)) st.kws.delete(k); else st.kws.add(k); refresh(); return; }
        const gb = t.closest('[data-group]');
        if (gb) { st.group = gb.getAttribute('data-group'); saveGroup(st.group); refresh(); return; }
        const sb = t.closest('[data-status]');
        if (sb) { st.status = sb.getAttribute('data-status'); refresh(); return; }
        const vb = t.closest('[data-view]');
        if (vb) { st.view = vb.getAttribute('data-view'); saveView(st.view); refresh(); return; }
        const a = t.closest('[data-act]'); if (!a) return;
        const act = a.getAttribute('data-act'), id = a.getAttribute('data-id');
        if (act === 'new-project') { if (App.ui.openNewProject) App.ui.openNewProject(); }
        else if (act === 'reset') reset();
        else if (act === 'clear-q') { st.q = ''; const i = $('[data-vt-q]'); i.value = ''; i.focus(); refresh(); }
        else if (act === 'more-issues') { st.allIssues = !st.allIssues; refreshWiki(); }
        else if (act === 'close-fixed') { st.fixed = null; refreshWiki(); }
        else if (act === 'close-talk') { closeTalk(); refreshWiki(); }
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
        clearTimeout(qTimer); closeTalk();
        root.removeEventListener('click', onClick); root.removeEventListener('input', onInput);
        root.removeEventListener('change', onChange); root.removeEventListener('keydown', onKey);
        document.removeEventListener('click', onDocClick);
      };
    },
  };
})(window.App);
