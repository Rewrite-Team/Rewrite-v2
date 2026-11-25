/* 홈: AI 채팅 시작 · 이어서 대화하기 · 마감이 가까운 지원 기업 */
(function (App) {
  const esc = (s) => App.ui.esc(s); const S = App.store; const I = App.icon;

  /* ---------- AI 채팅 시작 ---------- */
  // 진행중인 프로젝트 먼저 (각각 최근 순)
  function sortedProjects() {
    const list = S.projects();
    return list.filter((p) => p.status === 'ongoing').concat(list.filter((p) => p.status !== 'ongoing'));
  }
  const options = (selectedId) => `${sortedProjects().map((p) => `<option value="${esc(p.id)}" ${p.id === selectedId ? 'selected' : ''}>${esc(S.projectName(p))}</option>`).join('')}<option value="__new">새 프로젝트 만들기</option>`;

  function startBlock() {
    const list = sortedProjects();
    if (!list.length) return `<div class="empty home-empty"><h1>첫 프로젝트를 만들어 보세요</h1>
      <p>팀 과제, 동아리, 아르바이트도 프로젝트예요.</p>
      <button type="button" class="btn btn-primary btn-lg" data-new>${I('plus', 16)}새 프로젝트</button></div>`;
    return `<form class="home-start" data-home-form>
      <h1>오늘은 어떤 경험을 이야기해 볼까요?</h1>
      <div class="home-composer">
        <input class="home-text" data-home-text maxlength="300" autocomplete="off" aria-label="이야기할 내용" placeholder="한 줄만 적어도 돼요" />
        <div class="home-composer-foot">
          <label class="home-project">${I('folder', 16)}<select class="select" data-home-project aria-label="프로젝트">${options(list[0].id)}</select></label>
          <button type="submit" class="btn btn-primary">${I('chat', 16)}AI 채팅 시작</button>
        </div>
      </div>
    </form>`;
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
    render() { return `<div class="page page-narrow home">${startBlock()}${chatsBlock()}${appsBlock()}</div>`; },
    mount(root) {
      const make = root.querySelector('[data-new]');
      if (make) make.onclick = () => App.repoFlow.openNewProject((p) => {
        if ((p.repos || []).length) App.navigate(`#/vault/p/${encodeURIComponent(p.id)}/github`); else App.startChat({ projectId: p.id });
      });
      const form = root.querySelector('[data-home-form]'); if (!form) return null;
      const sel = form.querySelector('[data-home-project]'); const text = form.querySelector('[data-home-text]');
      let projectId = sel.value;
      sel.addEventListener('change', () => {
        if (sel.value !== '__new') { projectId = sel.value; return; }
        sel.value = projectId; // 취소하면 고르던 프로젝트 그대로
        App.repoFlow.openNewProject((p) => { projectId = p.id; sel.innerHTML = options(p.id); text.focus(); });
      });
      form.addEventListener('submit', (ev) => { ev.preventDefault(); App.startChat({ projectId, text: text.value.trim() }); });
      return null;
    },
  };
})(window.App);
