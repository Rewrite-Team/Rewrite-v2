/* 프로젝트 — #/vault/p/:id
   머리 → GitHub → 경험 카드. 수정 모달은 App.ui.openProjectModal(p, done) (p 가 없으면 새 프로젝트: App.repoFlow) */
(function (App) {
  const esc = (s) => App.ui.esc(s); const S = App.store;
  const me = () => (App.auth.current() || {}).id;

  /* ---------- 수정 모달 ---------- */
  App.ui.openProjectModal = function (p, done) {
    if (!p) return App.repoFlow.openNewProject(done);
    const per = p.period || {};
    const opt = (v, label) => `<option value="${v}"${p.status === v ? ' selected' : ''}>${label}</option>`;
    return App.ui.modal({
      title: '프로젝트 수정', confirmText: '저장',
      body: `<div class="pj-form">
        <div class="field"><label class="label" for="pj-title">프로젝트 이름</label><input class="input" id="pj-title" maxlength="40" value="${esc(p.title)}" /><p class="field-error" id="pj-title-e" role="alert" hidden></p></div>
        <div class="field"><label class="label" for="pj-role">맡은 역할</label><input class="input" id="pj-role" maxlength="40" value="${esc(p.role)}" /></div>
        <div class="field"><label class="label" for="pj-status">상태</label><select class="select" id="pj-status">${opt('ongoing', '진행중')}${opt('done', '완료')}</select></div>
        <div class="pj-months">
          <div class="field"><label class="label" for="pj-start">시작한 달</label><input class="input" type="month" id="pj-start" value="${esc(per.start)}" /><p class="field-error" id="pj-start-e" role="alert" hidden></p></div>
          <div class="field" data-end><label class="label" for="pj-end">끝난 달</label><input class="input" type="month" id="pj-end" value="${esc(per.end)}" /><p class="field-error" id="pj-end-e" role="alert" hidden></p></div>
        </div>
      </div>`,
      // 진행중이면 끝난 달을 묻지 않는다
      onOpen(root) {
        const st = root.querySelector('#pj-status'); const end = root.querySelector('[data-end]');
        const sync = () => { end.hidden = st.value === 'ongoing'; }; st.onchange = sync; sync(); root.querySelector('#pj-title').focus();
      },
      onConfirm(root) {
        const val = (id) => root.querySelector('#' + id).value.trim();
        root.querySelectorAll('.field-error').forEach((x) => { x.hidden = true; }); root.querySelectorAll('[aria-invalid]').forEach((x) => x.removeAttribute('aria-invalid'));
        const fail = (msg, id) => { const i = root.querySelector('#' + id); const e = root.querySelector(`#${id}-e`); e.innerHTML = App.icon('warning', 15) + `<span>${esc(msg)}</span>`; e.hidden = false; i.setAttribute('aria-invalid', 'true'); i.setAttribute('aria-describedby', id + '-e'); i.focus(); return false; };
        const title = val('pj-title'), role = val('pj-role'), status = val('pj-status'), start = val('pj-start'), end = status === 'done' ? val('pj-end') : '';
        if (!title) return fail('이름을 적어 주세요.', 'pj-title');
        if (end && !start) return fail('시작한 달을 골라 주세요.', 'pj-start');
        if (end && end < start) return fail('끝난 달이 시작한 달보다 빨라요.', 'pj-end');
        if (status === 'done' && start && !end) return fail('끝난 달을 골라 주세요.', 'pj-end');
        const saved = S.updateProject(p.id, { title, role, status, period: { start, end } });
        if (done) setTimeout(() => done(saved), 0);
        return true;
      },
    });
  };

  // 완료 ↔ 진행중. 프로젝트 화면과 경험 위키 목록에서 쓴다
  App.ui.setProjectDone = function (id, done) {
    const p = S.getProject(id); if (!p) return; const who = me(); const before = { status: p.status, period: Object.assign({}, p.period) };
    S.setProjectDone(id, done); App.rerender();
    App.ui.toast(done ? `「${p.title}」 프로젝트를 완료했어요` : `「${p.title}」 프로젝트를 다시 진행해요`, { action: '되돌리기', onAction: () => { if (me() !== who || !S.getProject(id)) return; S.updateProject(id, before); App.rerender(); App.ui.toast('되돌렸어요'); } });
  };

  function remove(p) {
    const n = [[S.cardsOf(p.id).length, '경험 카드', '장'], [S.chatsOf(p.id).length, '대화방', '개']].filter(([c]) => c).map(([c, l, u]) => `${l} ${c}${u}`).join(', ');
    App.ui.modal({
      title: '프로젝트를 휴지통으로 옮길까요?', confirmText: '휴지통으로 옮기기', danger: true,
      body: `<p>「${esc(p.title)}」${n ? ` 안의 ${n}도 함께 옮겨요.` : ' 프로젝트를 옮겨요.'} ${S.TRASH_DAYS}일 안에 되돌릴 수 있어요.</p>`,
      onConfirm() { const t = S.removeProject(p.id); App.navigate('#/vault'); App.ui.trashed(t); },
    });
  }

  /* ---------- 머리 ---------- */
  function headHTML(p) {
    const period = App.ui.projectPeriod(p);
    return `<header class="page-head pj-head"><div><h1>${esc(p.title)}</h1>
        <div class="meta pj-meta">${App.ui.statusTag(p.status)}${period ? `<span>${App.icon('calendar', 15)}${esc(period)}</span>` : ''}${p.role ? `<span>${esc(p.role)}</span>` : ''}</div>
        ${p.summary ? `<p>${esc(p.summary)}</p>` : ''}</div>
      <div class="page-head-actions">${p.status === 'done' ? `<button type="button" class="btn btn-ghost" data-act="reopen">${App.icon('restore', 16)}다시 진행하기</button>` : `<button type="button" class="btn" data-act="done">${App.icon('check', 16)}프로젝트 완료</button>`}
        <div class="menu"><button type="button" class="icon-btn" aria-haspopup="menu" aria-expanded="false" aria-label="프로젝트 메뉴">${App.icon('more')}</button>
        <div class="menu-list"><button type="button" data-act="edit">${App.icon('edit', 16)}수정</button><button type="button" class="is-danger" data-act="remove">${App.icon('trash', 16)}휴지통으로 옮기기</button></div></div></div>
    </header>`;
  }

  /* ---------- GitHub ---------- */
  // 예시 레포는 실제로 없는 주소라서 링크를 걸지 않는다
  const isSample = (r) => !!(window.SEED.repoSamples || {})[App.github.keyOf(r.owner, r.name)];
  function repoRow(r, i) {
    const name = `${r.owner}/${r.name}`; const url = /^https:\/\//.test(r.url || '') ? r.url : `https://github.com/${name}`;
    return `<li class="pj-repo">${App.icon('github')}
      <span class="pj-repo-main">${isSample(r) ? `<span class="pj-repo-name">${esc(name)}</span><span class="tag">예시</span>` : `<a class="pj-repo-name" href="${esc(url)}" target="_blank" rel="noopener">${esc(name)}</a>`}<span class="subtle">${r.analyzedAt ? `${App.ui.date(r.analyzedAt)} 분석` : '아직 분석하지 않았어요'}</span></span>
      <span class="menu"><button type="button" class="icon-btn" aria-haspopup="menu" aria-expanded="false" aria-label="${esc(r.name)} 레포 메뉴">${App.icon('more')}</button><span class="menu-list"><button type="button" data-act="unlink" data-i="${i}">${App.icon('unlink', 16)}연결 해제</button></span></span></li>`;
  }
  function githubHTML(p, primary) {
    const repos = p.repos || [];
    if (!repos.length) return `<section class="panel pj-gh" aria-label="GitHub"><div class="pj-gh-off">${App.icon('github', 20)}<p>GitHub를 연결하면 커밋과 PR에서 경험을 찾아 줘요.</p><button type="button" class="btn" data-act="connect">GitHub 연결</button></div></section>`;
    return `<section class="panel pj-gh" aria-label="GitHub"><ul class="pj-repos">${repos.map(repoRow).join('')}</ul>
      <div class="pj-gh-acts"><a class="btn ${primary ? 'btn-primary' : ''}" href="#/vault/p/${encodeURIComponent(p.id)}/github">${App.icon('github', 16)}GitHub로 경험 카드 만들기</a><button type="button" class="btn btn-ghost" data-act="connect">${App.icon('plus', 16)}레포 추가</button></div></section>`;
  }

  /* ---------- 경험 카드 ---------- */
  const chatBtn = (p, primary, cls = '') => `<button type="button" class="btn ${primary ? 'btn-primary' : ''} ${cls}" data-chat data-chat-project="${esc(p.id)}">${App.icon('chat', 16)}AI 채팅으로 만들기</button>`;
  const manualBtn = () => `<button type="button" class="btn btn-ghost" data-act="manual">${App.icon('edit', 16)}직접 만들기</button>`;
  const makeBtns = (p, primary) => `<div class="pj-make">${chatBtn(p, primary)}${manualBtn()}</div>`;
  // 직접 만들기: 제목만 받아 빈 카드를 만들고 카드 화면에서 나머지를 쓴다 (AI 없이)
  App.ui.openManualCard = function (projectId) {
    App.ui.modal({
      title: '경험 카드 직접 만들기', confirmText: '만들기',
      body: `<div class="field"><label class="label" for="mc-title">제목</label><input class="input" id="mc-title" maxlength="60" placeholder="예: 검색 API 응답 속도 개선" /><p class="field-hint">만든 뒤 카드에서 상황·과제·행동·결과와 역량을 직접 써요.</p><p class="field-error" id="mc-title-e" role="alert" hidden></p></div>`,
      onOpen(r) { r.querySelector('#mc-title').focus(); },
      onConfirm(r) {
        const i = r.querySelector('#mc-title'); const v = i.value.trim();
        if (!v) { const x = r.querySelector('#mc-title-e'); x.innerHTML = App.icon('warning', 15) + '<span>제목을 적어 주세요.</span>'; x.hidden = false; i.setAttribute('aria-invalid', 'true'); i.focus(); return false; }
        const e = S.createManual(projectId, v); if (!e) return true;
        setTimeout(() => { App.navigate('#/card/' + e.id); App.ui.toast('경험 카드를 만들었어요'); setTimeout(() => { const t = document.getElementById('cd-situation'); if (t) t.focus(); }, 0); }, 0);
        return true;
      },
    });
  };
  function cardsHTML(p, cards, primary) {
    const linked = (p.repos || []).length;
    return `<section class="section"><div class="pj-sec-head"><h2 class="section-title">경험 카드 ${cards.length ? `<span class="count">${cards.length}</span>` : ''}</h2>${cards.length ? makeBtns(p, primary) : ''}</div>
      ${cards.length ? `<div class="grid">${cards.map((e) => App.ui.expCard(e)).join('')}</div>`
        : `<div class="empty pj-empty"><div class="empty-title">아직 경험 카드가 없어요</div><p>${linked ? '연결한 GitHub에서 여러 장을 한 번에 만들거나, AI와 이야기하며 한 장씩 만들 수 있어요.' : 'AI와 이야기하면 첫 카드가 만들어져요. GitHub를 연결하면 여러 장을 한 번에 만들 수도 있어요.'} AI 없이 직접 써도 돼요.</p>${makeBtns(p, primary)}</div>`}</section>`;
  }
  function missingHTML(id) {
    const t = S.trash().find((x) => x.type === 'project' && x.projectId === id);
    return `<div class="page"><div class="empty"><div class="empty-title">${t ? '휴지통에 있는 프로젝트예요' : '프로젝트를 찾을 수 없어요'}</div>${t ? `<p>「${esc(t.title)}」</p><button type="button" class="btn btn-primary" data-restore="${esc(t.id)}">복원하기</button>` : '<a class="btn" href="#/vault">경험 위키로</a>'}</div></div>`;
  }

  App.screens.projects = {
    title: (params) => { const p = S.getProject(params.id); return p ? p.title : '프로젝트'; },
    crumb: () => [{ label: '경험 위키', href: '#/vault' }],
    render(params) {
      const p = S.getProject(params.id); if (!p) return missingHTML(params.id);
      const cards = S.cardsOf(p.id); const ghFirst = (p.repos || []).length > 0 && !cards.length; // 주 버튼은 하나만
      return `<div class="page">${headHTML(p)}${githubHTML(p, ghFirst)}${cardsHTML(p, cards, !ghFirst)}</div>`;
    },
    mount(root, params) {
      const id = params.id;
      const acts = {
        done: () => App.ui.setProjectDone(id, true),
        reopen: () => App.ui.setProjectDone(id, false),
        edit: () => App.ui.openProjectModal(S.getProject(id), () => { App.rerender(); App.ui.toast('저장했어요'); }),
        remove: () => remove(S.getProject(id)),
        connect: () => App.repoFlow.connect(id, () => App.rerender()),
        manual: () => App.ui.openManualCard(id),
        unlink: (b) => {
          const r = Object.assign({}, S.getProject(id).repos[Number(b.dataset.i)]); const who = me();
          S.unlinkRepo(id, r.owner, r.name); App.rerender();
          App.ui.toast(`${r.name} 연결을 해제했어요`, { action: '되돌리기', onAction: () => { if (me() !== who || !S.getProject(id) || S.projectOfRepo(r.owner, r.name)) return; S.linkRepo(id, r); App.rerender(); App.ui.toast('되돌렸어요'); } });
        },
      };
      root.onclick = (ev) => {
        const r = ev.target.closest('[data-restore]'); if (r) { if (S.restore(r.dataset.restore)) { App.rerender(); App.ui.toast('복원했어요'); } return; }
        const b = ev.target.closest('[data-act]'); if (b && S.getProject(id)) acts[b.dataset.act](b);
      };
      return () => { root.onclick = null; };
    },
  };
})(window.App);
