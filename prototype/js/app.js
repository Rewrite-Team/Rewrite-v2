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
    { group: '커리어 활용' },
    { href: '#/apply', name: 'apply', ico: '◎', label: '지원 기업', apps: true },
  ];
  const MOBILE = [['#/home', 'home', '⌂', '홈'], ['#/daily', 'daily', '✉', '질문'], ['#/discover', 'discover', '✦', '발굴'], ['#/vault', 'vault', '▦', '보관함'], ['#/apply', 'apply', '◎', '지원']];
  const APP_STATUS_TONE = { preparing: '#4b4fd6', applied: '#f2994a', passed: '#2f9e6b', failed: '#b9b3a8' };

  // 지원 기업 하위 메뉴 (기업마다 하나씩)
  function appSubnav(params) {
    const apps = App.store.activeApps();
    if (!apps.length) return '';
    return `<div class="nav-sub">${apps.map((a) => `<a class="nav-sub-item ${params && params.id === a.id ? 'active' : ''}" href="#/apply/${a.id}" title="${App.ui.esc(a.company + ' · ' + a.job)}">
      <span class="nav-sub-dot" style="background:${APP_STATUS_TONE[a.status] || '#ccc'}"></span><span class="nav-sub-name">${App.ui.esc(a.company)}</span><span class="nav-sub-job">${App.ui.esc(a.job.replace(/\s*\(.*\)$/, ''))}</span></a>`).join('')}</div>`;
  }

  // 메뉴에 없는 화면 → 어느 메뉴 탭에 속하는지 (사이드바 강조 + 상단 경로 표시)
  const NAV_PARENT = { card: 'vault' };

  let cleanup = null;

  function sidebar(active, params) {
    const u = App.store.state.user;
    return `<aside class="sidebar">
      <a class="brand" href="#/home"><div class="brand-mark">R</div><div><div class="brand-name">Rewrite</div><div class="brand-sub">경험을 다시 쓰다</div></div></a>
      ${NAV.map((n) => n.group ? `<div class="nav-group-label">${n.group}</div>` : `
        <a class="nav-item ${active === n.name ? 'active' : ''}" href="${n.href}"><span class="ico">${n.ico}</span>${n.label}
        ${n.badge && n.badge() ? `<span class="badge-count">${n.badge()}</span>` : ''}${n.beta ? '<span class="beta">BETA</span>' : ''}</a>
        ${n.apps ? appSubnav(active === 'apply' ? params : null) : ''}`).join('')}
      <div class="sidebar-foot">
        <div class="avatar">${App.ui.esc(u.name.slice(0, 1))}</div>
        <div style="flex:1;min-width:0"><div style="font-weight:600;font-size:13px">${App.ui.esc(u.name)}</div><div class="subtle" style="font-size:12px">${App.ui.esc(u.targetJob)} 준비중</div></div>
        <a class="btn btn-ghost btn-sm" href="#/settings" title="설정">⚙</a>
      </div>
    </aside>`;
  }

  function render() {
    if (cleanup) { try { cleanup(); } catch (e) {} cleanup = null; }
    App.store.syncCheckins(); // 체크인 주기가 돌아온 프로젝트 → 오늘의 질문함에 체크인 질문
    const { name, params } = App.matchRoute(location.hash);
    const screen = App.screens[name];
    const root = document.getElementById('app');
    if (!screen) { root.innerHTML = `<div class="empty"><div class="big">🚧</div>화면 준비중: ${name}</div>`; return; }
    const body = screen.render(params);
    if (screen.layout === 'full') {
      root.innerHTML = `<div class="fullscreen">${body}</div>`;
    } else {
      const title = typeof screen.title === 'function' ? screen.title(params) : (screen.title || '');
      const navName = NAV_PARENT[name] || name;
      const parent = NAV_PARENT[name] ? NAV.find((n) => n.name === NAV_PARENT[name]) : null;
      // 화면이 crumb(params) → [{label, href}] 를 주면 그걸 사용, 아니면 NAV_PARENT
      const crumbs = screen.crumb ? (screen.crumb(params) || []) : parent ? [{ label: parent.label, href: parent.href }] : [];
      const crumb = crumbs.map((c) => `<a class="topbar-crumb" href="${c.href}">${App.ui.esc(c.label)}</a><span class="topbar-sep">›</span>`).join('');
      root.innerHTML = `<div class="shell">${sidebar(navName, params)}<main class="main">
        <div class="topbar"><div class="topbar-title">${crumb}${App.ui.esc(title)}</div>
          <div class="topbar-actions">
            <a class="btn btn-sm" href="#/card/new">＋ 경험 직접 추가</a>
            <a class="btn btn-sm btn-primary" href="#/discover">✦ 경험 발굴 시작</a>
          </div></div>
        <div id="screen">${body}</div></main>
        <nav class="mobile-nav">${MOBILE.map(([h, n, i, l]) => `<a href="${h}" class="${navName === n ? 'active' : ''}"><span class="ico">${i}</span>${l}</a>`).join('')}</nav>
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
