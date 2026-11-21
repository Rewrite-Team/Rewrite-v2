/* App shell: sidebar + topbar + router mount. */
(function (App) {
  const NAV = [
    // 하나의 흐름: 기록한다 → 위키가 정리한다 → 꺼내 쓴다
    { group: '① 기록하기' },
    { href: '#/home', name: 'home', ico: '⌂', label: '홈' },
    { href: '#/daily', name: 'daily', ico: '✉', label: '오늘의 질문', badge: () => App.store.pending().length },
    { group: '② 경험 위키' },
    { href: '#/vault', name: 'vault', ico: '▦', label: '경험 위키', badge: () => App.wiki.lint().filter((i) => i.severity >= 3).length, badgeTone: 'soft' },
    { href: '#/projects', name: 'projects', ico: '▤', label: '프로젝트' },
    { group: '③ 꺼내 쓰기' },
    { href: '#/resume', name: 'resume', ico: '☰', label: '마스터 이력서' },
    { href: '#/apply', name: 'apply', ico: '◎', label: '지원 기업', apps: true },
  ];
  const MOBILE = [['#/home', 'home', '⌂', '홈'], ['#/daily', 'daily', '✉', '질문'], ['#/vault', 'vault', '▦', '위키'], ['#/resume', 'resume', '☰', '이력서'], ['#/apply', 'apply', '◎', '지원']];
  const APP_STATUS_TONE = { preparing: '#4b4fd6', applied: '#f2994a', passed: '#2f9e6b', failed: '#b9b3a8' };

  // 지원 기업 하위 메뉴 (기업마다 하나씩)
  function appSubnav(params) {
    const apps = App.store.activeApps();
    if (!apps.length) return '';
    return `<div class="nav-sub">${apps.map((a) => `<a class="nav-sub-item ${params && params.id === a.id ? 'active' : ''}" href="#/apply/${a.id}" title="${App.ui.esc(a.company + ' · ' + a.job)}">
      <span class="nav-sub-dot" style="background:${APP_STATUS_TONE[a.status] || '#ccc'}"></span><span class="nav-sub-name">${App.ui.esc(a.company)}</span><span class="nav-sub-job">${App.ui.esc(a.job.replace(/\s*\(.*\)$/, ''))}</span></a>`).join('')}</div>`;
  }

  // 메뉴에 없는 화면 → 어느 메뉴 탭에 속하는지 (사이드바 강조 + 상단 경로 표시)
  const NAV_PARENT = { card: 'vault', discover: 'vault' };

  let cleanup = null;

  function sidebar(active, params) {
    const u = App.store.state.user;
    return `<aside class="sidebar">
      <a class="brand" href="#/home"><div class="brand-mark">R</div><div><div class="brand-name">Rewrite</div><div class="brand-sub">경험을 다시 쓰다</div></div></a>
      ${NAV.map((n) => n.group ? `<div class="nav-group-label">${n.group}</div>` : `
        <a class="nav-item ${active === n.name ? 'active' : ''}" href="${n.href}"><span class="ico">${n.ico}</span>${n.label}
        ${n.badge && n.badge() ? `<span class="badge-count ${n.badgeTone === 'soft' ? 'badge-soft' : ''}" ${n.badgeTone === 'soft' ? 'title="위키 점검: 꼭 채울 곳"' : ''}>${n.badge()}</span>` : ''}${n.beta ? '<span class="beta">BETA</span>' : ''}</a>
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
    App.wiki.autoQueue();     // 위키의 빈 곳(코드 분석·빈 결과) → 하루 한 번 오늘의 질문으로
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
            <button class="btn btn-sm btn-primary" data-capture>＋ 기록하기</button>
          </div></div>
        <div id="screen">${body}</div></main>
        <nav class="mobile-nav">${MOBILE.map(([h, n, i, l]) => `<a href="${h}" class="${navName === n ? 'active' : ''}"><span class="ico">${i}</span>${l}</a>`).join('')}</nav>
      </div>`;
    }
    const mountRoot = root.querySelector('#screen') || root.querySelector('.fullscreen');
    if (screen.mount) cleanup = screen.mount(mountRoot, params) || null;
    window.scrollTo(0, 0);
  }

  /* ＋ 기록하기 — 무엇을 넣든 입구는 하나. 가벼운 한 줄도, AI와의 긴 대화도, 코드 분석도 같은 경험 위키에 쌓인다 */
  function openCapture(preset = {}) {
    const esc = App.ui.esc; const S = App.store;
    const projects = S.projects().filter((p) => p.status === 'ongoing').concat(S.projects().filter((p) => p.status !== 'ongoing'));
    const root = document.getElementById('modal-root');
    root.innerHTML = `<div class="modal-backdrop"><div class="modal capture-modal">
      <div class="modal-head">무엇이든 기록해 두세요</div>
      <div class="modal-body" id="cap-body">
        <p class="subtle" style="margin:0 0 10px">한 줄이면 충분해요. AI가 비슷한 경험을 찾아 거기에 보태거나, 새 경험 페이지를 만들어요.</p>
        <textarea class="input" id="cap-text" rows="4" placeholder="예) 오늘 모여봄 배포 전에 설정값 체크리스트를 같이 돌려 봤는데 에러가 한 건도 안 났다">${esc(preset.text || '')}</textarea>
        <div style="display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap">
          <span class="subtle" style="font-size:12.5px">어느 프로젝트 이야기인가요?</span>
          <select class="input" id="cap-proj" style="width:auto;padding:4px 8px;height:auto;font-size:12.5px">
            <option value="">AI가 알아서 찾기</option>
            ${projects.map((p) => `<option value="${p.id}" ${preset.projectId === p.id ? 'selected' : ''}>${esc(S.projectName(p))}</option>`).join('')}
          </select>
        </div>
        <div class="capture-more">
          <div class="subtle" style="font-size:12px;margin:16px 0 8px">더 깊게 기록하고 싶다면 — 결과는 모두 같은 위키에 쌓여요</div>
          <div class="wk-add-modes">
            <a class="wk-add-mode" href="#/discover"><span class="wk-src">✦</span><div><b>AI와 대화하며 기록</b><span class="subtle">질문을 따라 답하다 보면 상황·행동·결과가 채워져요</span></div></a>
            <a class="wk-add-mode" href="${preset.projectId ? `#/projects/${preset.projectId}?tab=code` : '#/projects'}"><span class="wk-src">⌥</span><div><b>GitHub 레포 분석</b><span class="subtle">코드에서 찾은 기술 포인트가 근거로 붙고, 빈 이야기는 질문으로 와요</span></div></a>
            <a class="wk-add-mode" href="#/card/new"><span class="wk-src">✎</span><div><b>직접 작성</b><span class="subtle">이미 정리해 둔 경험을 칸에 맞춰 옮겨 적어요</span></div></a>
          </div>
        </div>
      </div>
      <div class="modal-foot"><button class="btn" data-m="cancel">닫기</button><button class="btn btn-primary" data-m="ok">위키에 기록</button></div></div></div>`;
    const close = () => { root.innerHTML = ''; };
    root.querySelector('[data-m=cancel]').onclick = close;
    root.querySelector('.modal-backdrop').onclick = (ev) => { if (ev.target.classList.contains('modal-backdrop') || ev.target.closest('a.wk-add-mode')) close(); };
    const ok = root.querySelector('[data-m=ok]');
    ok.onclick = () => {
      const text = root.querySelector('#cap-text').value.trim();
      if (!text) { root.querySelector('#cap-text').focus(); return; }
      const projectId = root.querySelector('#cap-proj').value || null;
      let entry;
      if (projectId) {
        const p = S.getProject(projectId);
        const log = S.addLog(projectId, { text, type: /결정|선택/.test(text) ? 'decision' : /문제|에러|버그|오류/.test(text) ? 'issue' : /팀원|같이|의견/.test(text) ? 'collab' : /배웠|알게/.test(text) ? 'learning' : 'milestone' });
        entry = App.wiki.ingestLog(p.id, log.id);
      } else entry = App.wiki.ingest({ type: 'manual', text });
      const body = root.querySelector('#cap-body');
      const paint = (e) => { body.innerHTML = App.wiki.reportHTML(e); App.wiki.bindReport(body, (n) => { paint(n || e); }); };
      paint(entry);
      ok.textContent = '하나 더 기록'; ok.onclick = () => openCapture();
      root.querySelector('[data-m=cancel]').onclick = () => { close(); render(); };
    };
    setTimeout(() => { const t = root.querySelector('#cap-text'); if (t) t.focus(); }, 30);
  }
  App.capture = openCapture;
  document.addEventListener('click', (ev) => { const b = ev.target.closest('[data-capture]'); if (b) { ev.preventDefault(); openCapture({ projectId: b.getAttribute('data-capture-project') || '' }); } });

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
