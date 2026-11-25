/* 홈: 이어서 대화하기 · 마감이 가까운 지원 기업 */
(function (App) {
  const esc = (s) => App.ui.esc(s); const S = App.store; const I = App.icon;

  const chatBtn = `<button type="button" class="btn btn-primary" data-chat>${I('chat', 16)}AI 채팅 시작</button>`;
  function body() {
    if (!S.projects().length) return `<div class="empty home-empty"><h1>첫 프로젝트를 만들어 보세요</h1>
      <p>팀 과제, 동아리, 아르바이트도 프로젝트예요.</p>
      <button type="button" class="btn btn-primary btn-lg" data-new>${I('plus', 16)}새 프로젝트</button></div>${appsBlock()}`;
    const blocks = chatsBlock() + appsBlock();
    return `<header class="page-head"><h1>홈</h1><div class="page-head-actions">${chatBtn}</div></header>
      ${blocks || '<div class="empty"><div class="empty-title">아직 채팅이 없어요</div><p>있었던 일을 AI와 이야기하면 경험 카드가 만들어져요.</p></div>'}`;
  }

  /* ---------- 이어서 대화하기 (최근 3개) ---------- */
  function chatsBlock() {
    const chats = S.chats().filter((c) => S.getProject(c.projectId)).slice(0, 3);
    if (!chats.length) return '';
    return `<section class="section"><h2 class="section-title">이어서 대화하기<a class="more" href="#/chat">전체 보기</a></h2>
      <div class="list">${chats.map((c) => `<a class="list-row home-chat" href="#/chat/${esc(c.id)}">
        <span class="list-row-title truncate">${esc(c.title)}</span>${App.ui.projChip(c.projectId)}</a>`).join('')}</div></section>`;
  }

  /* ---------- 마감이 가까운 지원 기업 (준비중, 마감이 남은 3곳) ---------- */
  const daysTo = (deadline) => Math.round((S.parseDay(deadline) - S.parseDay(S.localDay())) / 86400000);
  function appsBlock() {
    const apps = S.apps().filter((a) => a.status === 'preparing' && a.deadline && daysTo(a.deadline) >= 0)
      .sort((a, b) => a.deadline.localeCompare(b.deadline)).slice(0, 3);
    if (!apps.length) return '';
    return `<section class="section"><h2 class="section-title">마감이 가까운 지원 기업<a class="more" href="#/apply">전체 보기</a></h2>
      <div class="list">${apps.map((a) => {
        const n = daysTo(a.deadline);
        return `<a class="list-row" href="#/apply/${esc(a.id)}">
          <span class="list-row-main"><span class="list-row-title">${esc(a.company)}</span>${a.job ? `<span class="list-row-sub">${esc(a.job)}</span>` : ''}</span>
          <span class="list-row-actions"><span class="home-date">${esc(App.ui.date(a.deadline))}</span><span class="tag ${n <= 7 ? 'tag-warn' : ''}">${n ? `D-${n}` : '오늘 마감'}</span></span></a>`;
      }).join('')}</div></section>`;
  }

  App.screens.home = {
    title: '홈',
    render() { return `<div class="page page-narrow home">${body()}</div>`; },
    mount(root) {
      const make = root.querySelector('[data-new]');
      if (make) make.onclick = () => App.repoFlow.openNewProject((p) => {
        if ((p.repos || []).length) App.navigate(`#/vault/p/${encodeURIComponent(p.id)}/github`); else App.startChat({ projectId: p.id });
      });
      return null;
    },
  };
})(window.App);
