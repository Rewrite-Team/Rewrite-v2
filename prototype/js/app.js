/* App shell: 로그인 확인 → 사이드바 + 상단바 + 화면. */
(function (App) {
  const esc = (s) => App.ui.esc(s);
  const NAV = [
    { href: '#/home', name: 'home', icon: 'home', label: '홈' },
    { href: '#/chat', name: 'chat', icon: 'chat', label: 'AI 채팅' },
    { href: '#/vault', name: 'vault', icon: 'wiki', label: '경험 위키' },
    { href: '#/graph', name: 'graph', icon: 'graph', label: '경험 그래프' },
    { href: '#/resume', name: 'resume', icon: 'resume', label: '마스터 이력서' },
    { href: '#/apply', name: 'apply', icon: 'building', label: '지원 기업', apps: true },
  ];
  const MOBILE = [['home', '홈'], ['chat', 'AI 채팅'], ['vault', '위키'], ['resume', '이력서'], ['apply', '지원']];
  const PUBLIC = new Set(['login', 'signup']); // 로그인하지 않아도 볼 수 있는 화면
  // 메뉴에 없는 화면 → 어느 메뉴에 속하는지 (사이드바 강조)
  const NAV_PARENT = { card: 'vault', projects: 'vault', projectGithub: 'vault' };

  let cleanup = null;
  let returnTo = null; // 로그인하면 돌아갈 곳 { hash, who: 그때 쓰던 계정 }. 다른 계정으로 들어오면 쓰지 않는다
  let lastWho = '';

  // 지원 기업 하위 메뉴 (진행 중인 기업마다 하나씩)
  function appSubnav(currentId) {
    const apps = App.store.activeApps(); if (!apps.length) return '';
    return `<div class="nav-sub">${apps.map((a) => `<a class="nav-sub-item ${currentId === a.id ? 'active' : ''}" href="#/apply/${a.id}" title="${esc(a.company)} ${esc(a.job)}"><span class="nav-sub-name">${esc(a.company)}</span></a>`).join('')}</div>`;
  }
  // 계정 메뉴 (사이드바 아래 · 모바일 상단바)
  function accountMenu(compact) {
    const u = App.store.state.user; const me = App.auth.current();
    return `<div class="menu ${compact ? '' : 'menu-up'}">
      <button type="button" class="account" aria-haspopup="menu" aria-expanded="false" aria-label="계정 메뉴"><span class="avatar">${esc((u.name || '나').slice(0, 1))}</span><span class="account-text"><span class="account-name">${esc(u.name)}</span><span class="account-email">${esc(me ? me.email : '')}</span></span>${App.icon('more', 18)}</button>
      <div class="menu-list"><a href="#/settings">${App.icon('settings', 16)}설정</a>${compact ? `<a href="#/graph">${App.icon('graph', 16)}경험 그래프</a><a href="#/trash">${App.icon('trash', 16)}휴지통</a>` : ''}<button type="button" data-logout>${App.icon('logout', 16)}로그아웃</button></div>
    </div>`;
  }
  function sidebar(active, params) {
    const n = App.store.trash().length;
    return `<aside class="sidebar">
      <a class="brand" href="#/home"><span class="brand-mark">R</span><span class="brand-name">Rewrite</span></a>
      <nav aria-label="메뉴">${NAV.map((x) => `<a class="nav-item ${active === x.name && !(x.apps && params.id) ? 'active' : ''}" href="${x.href}" ${active === x.name ? 'aria-current="page"' : ''}><span class="ico">${App.icon(x.icon, 20)}</span><span class="nav-label">${x.label}</span></a>${x.apps ? appSubnav(active === 'apply' ? params.id : '') : ''}`).join('')}</nav>
      <div class="sidebar-foot">
        <a class="sidebar-link ${active === 'trash' ? 'active' : ''}" href="#/trash"><span class="ico">${App.icon('trash', 20)}</span><span class="nav-label">휴지통</span>${n ? `<span class="sidebar-count">${n}</span>` : ''}</a>
        ${accountMenu(false)}
      </div>
    </aside>`;
  }

  // 로그인 여부에 따라 보여 줄 주소를 정한다. 다른 곳으로 보내야 하면 그 주소를 돌려준다
  function guard(name) {
    const me = App.auth.current();
    if (!me) { if (PUBLIC.has(name)) return ''; returnTo = location.hash && location.hash !== '#/home' ? { hash: location.hash, who: lastWho } : null; return '#/login'; }
    lastWho = me.id;
    const onboarded = App.store.state.user.onboarded;
    if (PUBLIC.has(name)) return onboarded ? '#/home' : '#/onboarding';
    if (!onboarded && name !== 'onboarding') return '#/onboarding';
    if (onboarded && name === 'onboarding') return '#/home';
    return '';
  }

  function render() {
    if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
    const moved = App.legacyHash(location.hash); if (moved) { location.replace(moved); return; }
    const { name, params } = App.matchRoute(location.hash);
    const go = guard(name); if (go) { location.replace(go); return; }
    const screen = App.screens[name];
    const root = document.getElementById('app');
    if (!screen) { root.innerHTML = `<div class="empty">화면을 찾을 수 없어요</div>`; return; }
    const body = screen.render(params);
    if (screen.layout === 'full') {
      root.innerHTML = `<div class="fullscreen">${body}</div>`;
      document.title = 'Rewrite';
    } else {
      const title = typeof screen.title === 'function' ? screen.title(params) : (screen.title || '');
      const navName = NAV_PARENT[name] || name;
      // 화면이 crumb(params) → [{label, href}] 를 주면 상단바에 경로를 보여 준다. actions(params) → html 은 상단바 오른쪽
      const crumbs = screen.crumb ? (screen.crumb(params) || []) : [];
      document.title = `${title} | Rewrite`;
      root.innerHTML = `<div class="shell">${sidebar(navName, params)}<main class="main">
        <div class="topbar"><div class="topbar-title">${crumbs.map((c) => `<a class="topbar-crumb" href="${c.href}">${esc(c.label)}</a><span class="topbar-sep">${App.icon('chevron-right', 14)}</span>`).join('')}<span class="topbar-now">${esc(title)}</span></div>
          <div class="topbar-actions">${screen.actions ? screen.actions(params) : ''}</div>${accountMenu(true)}</div>
        <div id="screen">${body}</div></main>
        <nav class="mobile-nav" aria-label="메뉴">${MOBILE.map(([n, l]) => { const x = NAV.find((i) => i.name === n); return `<a href="${x.href}" class="${navName === n ? 'active' : ''}"><span class="ico">${App.icon(x.icon, 22)}</span><span class="nav-label">${l}</span></a>`; }).join('')}</nav>
      </div>`;
    }
    const mountRoot = root.querySelector('#screen') || root.querySelector('.fullscreen');
    if (screen.mount) cleanup = screen.mount(mountRoot, params) || null;
    window.scrollTo(0, 0);
  }

  // 로그인·가입한 뒤: 새 계정은 온보딩, 아니면 원래 가려던 곳
  App.afterLogin = () => { const me = App.auth.current(); const to = returnTo && (!returnTo.who || returnTo.who === me.id) ? returnTo.hash : ''; returnTo = null; App.navigate(App.store.state.user.onboarded ? to || '#/home' : '#/onboarding'); };
  App.logout = () => { if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; } App.auth.logout(); returnTo = null; App.ui.closeModal(); App.navigate('#/login'); App.ui.toast('로그아웃했어요'); };

  // [data-chat] 버튼: 새 채팅을 연다 (data-chat-project · data-chat-card · data-chat-kw · data-chat-github)
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-chat]'); if (!b) return;
    ev.preventDefault();
    App.startChat({ projectId: b.getAttribute('data-chat-project') || '', cardId: b.getAttribute('data-chat-card') || '', keyword: b.getAttribute('data-chat-kw') || '', github: b.hasAttribute('data-chat-github') });
  });
  // 카드 아이템 공통 클릭 위임: [data-href]
  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-href]');
    if (el && !ev.target.closest('button, a, input, textarea, select, label, .menu')) App.navigate(el.getAttribute('data-href'));
  });
  // 공통 메뉴: .menu > button[aria-haspopup] + .menu-list
  const closeMenus = (except, focusBack) => document.querySelectorAll('.menu.is-open').forEach((m) => { if (m !== except) { m.classList.remove('is-open'); const b = m.querySelector('[aria-haspopup]'); b.setAttribute('aria-expanded', 'false'); if (focusBack && m.contains(document.activeElement)) b.focus(); } });
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('.menu > [aria-haspopup]'); const m = b && b.parentElement; closeMenus(m);
    if (m) { const open = m.classList.toggle('is-open'); b.setAttribute('aria-expanded', String(open)); }
    if (ev.target.closest('[data-logout]')) App.logout();
  });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') closeMenus(null, true); });

  App.rerender = render;
  window.addEventListener('hashchange', () => { App.ui.closeModal(); render(); });
  // 다른 탭에서 로그아웃·로그인하면 따라간다
  // 같은 계정으로 다른 탭에서 저장했으면 그 내용을 읽어 두고, 이 탭으로 돌아올 때 다시 그린다
  let stale = false;
  window.addEventListener('storage', (ev) => {
    const me = App.auth.current();
    if (ev.key === 'rewrite-session') { App.ui.closeModal(); App.store.switchAccount(); render(); }
    else if (me && ev.key === App.store.dataKey(me.id)) { App.store.reload(); stale = true; }
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && stale) { stale = false; render(); } });
  window.addEventListener('pageshow', (ev) => { if (ev.persisted) { App.store.switchAccount(); render(); } });
  window.addEventListener('DOMContentLoaded', () => { if (!location.hash) location.replace('#/home'); render(); });
})(window.App);
