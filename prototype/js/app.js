/* App shell: sidebar + topbar + router mount. */
(function (App) {
  const NAV = [
    { group: '경험 발굴' },
    { href: '#/home', name: 'home', ico: '⌂', label: '홈' },
    { href: '#/daily', name: 'daily', ico: '✉', label: '오늘의 질문', badge: () => App.store.pending().length },
    { href: '#/discover', name: 'discover', ico: '✦', label: '집중 발굴' },
    { href: '#/projects', name: 'projects', ico: '▤', label: '프로젝트 트래커' },
    { group: '경험 관리' },
    { href: '#/vault', name: 'vault', ico: '▦', label: '경험 보관함' },
    { href: '#/competency', name: 'competency', ico: '◎', label: '역량 맵' },
    { group: '커리어 활용' },
    { href: '#/match', name: 'match', ico: '⇄', label: '자소서·면접 매칭', beta: true },
  ];
  const MOBILE = [['#/home', 'home', '⌂', '홈'], ['#/daily', 'daily', '✉', '질문'], ['#/discover', 'discover', '✦', '발굴'], ['#/vault', 'vault', '▦', '보관함'], ['#/competency', 'competency', '◎', '역량']];

  let cleanup = null;

  function sidebar(active) {
    const u = App.store.state.user;
    return `<aside class="sidebar">
      <a class="brand" href="#/home"><div class="brand-mark">R</div><div><div class="brand-name">Rewrite</div><div class="brand-sub">경험을 다시 쓰다</div></div></a>
      ${NAV.map((n) => n.group ? `<div class="nav-group-label">${n.group}</div>` : `
        <a class="nav-item ${active === n.name ? 'active' : ''}" href="${n.href}"><span class="ico">${n.ico}</span>${n.label}
        ${n.badge && n.badge() ? `<span class="badge-count">${n.badge()}</span>` : ''}${n.beta ? '<span class="beta">BETA</span>' : ''}</a>`).join('')}
      <div class="sidebar-foot">
        <div class="avatar">${App.ui.esc(u.name.slice(0, 1))}</div>
        <div style="flex:1;min-width:0"><div style="font-weight:600;font-size:13px">${App.ui.esc(u.name)}</div><div class="subtle" style="font-size:12px">${App.ui.esc(u.targetJob)} 준비중</div></div>
        <a class="btn btn-ghost btn-sm" href="#/settings" title="설정">⚙</a>
      </div>
    </aside>`;
  }

  function render() {
    if (cleanup) { try { cleanup(); } catch (e) {} cleanup = null; }
    const { name, params } = App.matchRoute(location.hash);
    const screen = App.screens[name];
    const root = document.getElementById('app');
    if (!screen) { root.innerHTML = `<div class="empty"><div class="big">🚧</div>화면 준비중: ${name}</div>`; return; }
    const body = screen.render(params);
    if (screen.layout === 'full') {
      root.innerHTML = `<div class="fullscreen">${body}</div>`;
    } else {
      const title = typeof screen.title === 'function' ? screen.title(params) : (screen.title || '');
      root.innerHTML = `<div class="shell">${sidebar(name)}<main class="main">
        <div class="topbar"><div class="topbar-title">${App.ui.esc(title)}</div>
          <div class="topbar-actions">
            <a class="btn btn-sm" href="#/card/new">＋ 경험 직접 추가</a>
            <a class="btn btn-sm btn-primary" href="#/discover">✦ 경험 발굴 시작</a>
          </div></div>
        <div id="screen">${body}</div></main>
        <nav class="mobile-nav">${MOBILE.map(([h, n, i, l]) => `<a href="${h}" class="${name === n ? 'active' : ''}"><span class="ico">${i}</span>${l}</a>`).join('')}</nav>
      </div>`;
    }
    const mountRoot = root.querySelector('#screen') || root.querySelector('.fullscreen');
    if (screen.mount) cleanup = screen.mount(mountRoot, params) || null;
    window.scrollTo(0, 0);
  }

  // 카드 아이템 공통 클릭 위임: [data-href]
  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-href]');
    if (el && !ev.target.closest('button, a, input, textarea, select, [data-remove-kw]')) App.navigate(el.getAttribute('data-href'));
  });

  App.rerender = render;
  window.addEventListener('hashchange', render);
  window.addEventListener('DOMContentLoaded', () => {
    if (!location.hash) location.hash = App.store.state.user.onboarded ? '#/home' : '#/onboarding';
    render();
    // 데모: 서비스가 먼저 말을 거는 순간 시뮬레이션 (진입 8초 후 1회)
    setTimeout(() => {
      const p = App.store.pending()[0];
      if (p && !location.hash.startsWith('#/daily') && !location.hash.startsWith('#/onboarding')) App.ui.pushToast('오늘의 질문이 도착했어요', p.text, '#/daily');
    }, 8000);
  });
})(window.App);
