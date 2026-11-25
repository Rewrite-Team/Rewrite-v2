/* 온보딩: ① 목표 직무 ② 첫 프로젝트 (GitHub에서 가져오기 | 직접 만들기). 나중에 하면 홈으로 */
(function (App) {
  const esc = (s) => App.ui.esc(s); const S = App.store; const I = App.icon;
  const JOBS = ['백엔드 개발자', '프론트엔드 개발자', '서비스 기획자', 'PM/PO', '데이터 분석가', 'UX/UI 디자이너', '마케터'];

  function profileHTML(d) {
    return `<h1 tabindex="-1">어떤 일을 준비하고 있나요?</h1>
      <div class="field"><label class="label" for="ob-job">목표 직무 <span class="subtle">(선택)</span></label>
        <input class="input" id="ob-job" data-ob="targetJob" list="ob-jobs" maxlength="30" placeholder="예: 백엔드 개발자" value="${esc(d.targetJob)}" />
        <datalist id="ob-jobs">${JOBS.map((j) => `<option value="${esc(j)}"></option>`).join('')}</datalist></div>`;
  }
  function projectHTML(d) {
    const seg = (mode, label) => `<button type="button" class="seg-btn ${d.mode === mode ? 'is-on' : ''}" data-mode="${mode}" aria-pressed="${d.mode === mode}">${label}</button>`;
    return `<h1 tabindex="-1">첫 프로젝트를 만들어요</h1>
      <div class="seg">${seg('github', `${I('github', 16)}GitHub에서 가져오기`)}${seg('manual', '직접 만들기')}</div>
      <div class="ob-pane" data-pane>${d.mode === 'manual' ? `<div class="field" data-field="title"><label class="label" for="ob-title">프로젝트 이름</label>
        <input class="input" id="ob-title" data-ob="title" maxlength="40" autocomplete="off" placeholder="예: 교내 해커톤, 카페 아르바이트" value="${esc(d.title)}" /></div>` : ''}</div>`;
  }

  App.screens.onboarding = {
    title: '시작하기', layout: 'full',
    render() { return '<div class="ob" data-ob-root></div>'; },
    mount(root) {
      const box = root.querySelector('[data-ob-root]'); const u = S.state.user;
      const d = { step: 0, targetJob: u.targetJob || '', mode: 'github', title: '', repo: null };
      const okBtn = () => box.querySelector('[data-act=next]');

      function paint(focus) {
        const last = d.step === 1; d.repo = null;
        box.innerHTML = `<header class="ob-head"><span class="brand"><span class="brand-mark">R</span><span class="brand-name">Rewrite</span></span><button type="button" class="btn btn-ghost btn-sm" data-logout>로그아웃</button></header>
          <main class="ob-body"><div class="progress" role="progressbar" aria-label="시작하기 진행" aria-valuemin="0" aria-valuemax="2" aria-valuenow="${d.step + 1}"><span style="width:${(d.step + 1) * 50}%"></span></div>
            ${last ? projectHTML(d) : profileHTML(d)}
            <div class="ob-foot">${last ? '<button type="button" class="btn btn-ghost" data-act="prev">이전</button><button type="button" class="btn btn-ghost" data-act="later">나중에 하기</button>' : ''}
              <button type="button" class="btn btn-primary" data-act="next">${last ? '프로젝트 만들기' : '다음'}</button></div></main>`;
        const pane = box.querySelector('[data-pane]');
        if (pane && d.mode === 'github') { okBtn().disabled = true; App.repoFlow.mountPicker(pane, { onPick: (r) => { d.repo = r; const b = okBtn(); if (b) b.disabled = !r; } }); }
        const f = focus && box.querySelector(focus); if (f) f.focus();
      }
      function setError(key, msg) {
        const f = box.querySelector(`[data-field=${key}]`); const i = f.querySelector('input'); const old = f.querySelector('.field-error'); if (old) old.remove();
        if (!msg) { i.removeAttribute('aria-invalid'); i.removeAttribute('aria-describedby'); return; }
        f.insertAdjacentHTML('beforeend', `<p class="field-error" id="ob-${key}-e">${I('warning', 15)}${esc(msg)}</p>`);
        i.setAttribute('aria-invalid', 'true'); i.setAttribute('aria-describedby', `ob-${key}-e`); i.focus();
      }
      const saveUser = (more) => S.updateUser(Object.assign({ targetJob: d.targetJob.trim() }, more));

      function next() {
        if (d.step === 0) {
          saveUser(); d.step = 1; paint('h1'); window.scrollTo(0, 0); return;
        }
        if (d.mode === 'github') {
          if (!d.repo) return;
          saveUser({ onboarded: true }); const p = S.createProjectFromRepo(d.repo);
          App.navigate(`#/vault/p/${encodeURIComponent(p.id)}/github`); return;
        }
        const title = d.title.trim(); if (!title) { setError('title', '프로젝트 이름을 적어 주세요.'); return; }
        saveUser({ onboarded: true }); const p = S.createProject({ title }); App.startChat({ projectId: p.id });
      }

      box.addEventListener('click', (ev) => {
        const m = ev.target.closest('[data-mode]');
        if (m) { if (d.mode !== m.dataset.mode) { d.mode = m.dataset.mode; paint(d.mode === 'manual' ? '#ob-title' : '[data-mode=github]'); } return; }
        const b = ev.target.closest('[data-act]'); if (!b) return;
        if (b.dataset.act === 'next') next();
        else if (b.dataset.act === 'prev') { d.step = 0; paint('h1'); window.scrollTo(0, 0); }
        else if (b.dataset.act === 'later') { saveUser({ onboarded: true }); App.navigate('#/home'); }
      });
      box.addEventListener('input', (ev) => {
        const k = ev.target.getAttribute('data-ob'); if (!k) return;
        d[k] = ev.target.value; if (ev.target.hasAttribute('aria-invalid')) setError(k, '');
      });
      box.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && !ev.isComposing && ev.target.matches('[data-ob]')) { ev.preventDefault(); next(); } });
      paint('#ob-job');
      return null;
    },
  };
})(window.App);
