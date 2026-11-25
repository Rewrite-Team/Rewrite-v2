/* 경험 위키 — #/vault            프로젝트 목록
              #/vault?view=cards 전체 카드 (?q=<검색어>&project=<프로젝트 id>&kw=<역량>) */
(function (App) {
  const esc = (s) => App.ui.esc(s); const S = App.store;
  const ym = (v) => String(v || '').replace('-', '.');

  function readState(params) {
    const kw = App.keywords.has(params.kw) ? params.kw : ''; const q = params.q || '';
    const project = S.getProject(params.project) ? params.project : '';
    return { view: params.view === 'cards' || kw || q || project ? 'cards' : 'projects', kw, q, project };
  }

  /* ---------- 프로젝트 ---------- */
  // 진행중 태그가 따로 있으므로 기간에 "~ 진행중"을 되풀이하지 않는다. 프로젝트 화면에서도 쓴다
  App.ui.projectPeriod = (p) => {
    const { start = '', end = '' } = p.period || {}; if (!start) return '';
    if (end) return start === end ? ym(start) : `${ym(start)} ~ ${ym(end)}`;
    return p.status === 'ongoing' ? `${ym(start)}부터` : ym(start);
  };
  function projectRow(p) {
    const n = S.cardsOf(p.id).length; const repos = p.repos || []; const period = App.ui.projectPeriod(p);
    const meta = [period, p.role].filter(Boolean).map((t) => `<span>${esc(t)}</span>`)
      .concat(repos.length ? `<span class="vt-repo">${App.icon('github', 15)}<span>${esc(repos[0].name)}</span>${repos.length > 1 ? `<span>외 ${repos.length - 1}개</span>` : ''}</span>` : '');
    return `<a class="list-row vt-proj" href="#/vault/p/${encodeURIComponent(p.id)}">${App.icon('folder')}
      <span class="list-row-main"><span class="list-row-title"><span class="vt-proj-name">${esc(p.title)}</span>${App.ui.statusTag(p.status)}</span>
        ${meta.length ? `<span class="meta vt-proj-meta">${meta.join('')}</span>` : ''}</span>
      <span class="list-row-actions">카드 ${n}장</span></a>`;
  }
  function projectsView() {
    // 진행중 먼저(최근에 고친 순), 끝난 것은 최근에 끝난 순
    const list = S.projects(); const last = (p) => (p.period && p.period.end) || String(p.updatedAt || '').slice(0, 7);
    const sorted = list.filter((p) => p.status === 'ongoing').concat(list.filter((p) => p.status !== 'ongoing').sort((a, b) => last(b).localeCompare(last(a))));
    return `<div class="list">${sorted.map(projectRow).join('')}</div>`;
  }
  const noProjects = () => `<div class="empty"><div class="empty-title">아직 프로젝트가 없어요</div><p>팀 과제, 동아리, 아르바이트도 프로젝트가 돼요.</p>
    <button type="button" class="btn btn-primary" data-act="new">${App.icon('plus', 16)}새 프로젝트</button></div>`;

  /* ---------- 전체 카드 ---------- */
  function findCards(st) {
    const tokens = st.q.toLowerCase().split(/\s+/).filter(Boolean);
    return S.list().filter((e) => {
      if (st.kw && !e.keywords.includes(st.kw)) return false;
      if (st.project && e.projectId !== st.project) return false;
      if (!tokens.length) return true;
      const p = S.getProject(e.projectId); const s = e.star || {};
      const hay = [e.title, e.resumeLine, e.summary, e.role, e.retrospect, s.situation, s.task, s.action, s.result, p && p.title, ...e.keywords].join(' ').toLowerCase();
      return tokens.every((t) => hay.includes(t));
    });
  }
  function cardsHTML(st) {
    const list = findCards(st);
    if (list.length) return `<div class="grid">${list.map((e) => App.ui.expCard(e, { matched: st.kw ? [st.kw] : [] })).join('')}</div>`;
    const on = st.q || st.kw || st.project; const p = S.getProject(st.project);
    const title = !on ? '아직 경험 카드가 없어요' : '조건에 맞는 경험 카드가 없어요';
    const chat = `<button type="button" class="btn" data-chat data-chat-project="${esc(st.project)}" data-chat-kw="${esc(st.kw)}">${App.icon('chat', 16)}AI 채팅으로 만들기</button>`;
    return `<div class="empty"><div class="empty-title">${title}</div>
      <div class="vt-empty-acts">${on ? '<button type="button" class="btn" data-act="clear">조건 지우기</button>' : ''}${!on || st.kw || p ? chat : ''}</div></div>`;
  }
  function cardsView(st) {
    const opt = (v, label, cur) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(label)}</option>`;
    return `<div class="vt-filter">
        <div class="input-icon">${App.icon('search', 16)}<input class="input" type="search" id="vt-q" value="${esc(st.q)}" placeholder="카드 검색" aria-label="경험 카드 검색" /></div>
        <select class="select" id="vt-project" aria-label="프로젝트">${opt('', '모든 프로젝트', st.project)}${S.projects().map((p) => opt(p.id, p.title, st.project)).join('')}</select>
        <select class="select" id="vt-kw" aria-label="역량">${opt('', '모든 역량', st.kw)}${App.keywords.names().map((k) => opt(k, k, st.kw)).join('')}</select>
      </div>
      <p class="sr-only" id="vt-count" role="status"></p>
      <div id="vt-list">${cardsHTML(st)}</div>`;
  }

  App.screens.vault = {
    title: '경험 위키',
    render(params) {
      const st = readState(params || {}); const any = S.projects().length;
      const seg = (view, href, label) => `<a class="seg-btn${st.view === view ? ' is-on' : ''}" href="${href}"${st.view === view ? ' aria-current="page"' : ''}>${label}</a>`;
      return `<div class="page">
        <header class="page-head vt-head"><div><h1>경험 위키</h1></div>${any ? `<div class="page-head-actions"><button type="button" class="btn btn-primary" data-act="new">${App.icon('plus', 16)}새 프로젝트</button></div>` : ''}</header>
        ${any ? `<nav class="seg vt-seg" aria-label="보기">${seg('projects', '#/vault', '프로젝트')}${seg('cards', '#/vault?view=cards', '전체 카드')}</nav>
        ${st.view === 'projects' ? projectsView() : cardsView(st)}` : noProjects()}
      </div>`;
    },
    mount(root, params) {
      const st = readState(params || {}); const q = (sel) => root.querySelector(sel);
      // 카드를 보고 돌아와도 조건이 남도록 주소에 적어 둔다 (다시 그리지 않으므로 포커스가 유지된다)
      const refresh = () => {
        q('#vt-list').innerHTML = cardsHTML(st); q('#vt-count').textContent = `경험 카드 ${findCards(st).length}장`;
        const qs = new URLSearchParams({ view: 'cards' }); ['q', 'project', 'kw'].forEach((k) => { if (st[k]) qs.set(k, st[k]); });
        history.replaceState(null, '', '#/vault?' + qs);
      };
      root.onclick = (ev) => {
        const b = ev.target.closest('[data-act]'); if (!b) return;
        if (b.dataset.act === 'new') App.repoFlow.openNewProject((p) => App.navigate('#/vault/p/' + encodeURIComponent(p.id)));
        if (b.dataset.act === 'clear') { Object.assign(st, { q: '', kw: '', project: '' }); q('#vt-q').value = ''; q('#vt-kw').value = ''; q('#vt-project').value = ''; refresh(); q('#vt-q').focus(); }
      };
      if (q('#vt-list')) {
        q('#vt-q').oninput = (ev) => { st.q = ev.target.value; refresh(); };
        q('#vt-project').onchange = (ev) => { st.project = ev.target.value; refresh(); };
        q('#vt-kw').onchange = (ev) => { st.kw = ev.target.value; refresh(); };
      }
      return () => { root.onclick = null; };
    },
  };
})(window.App);
