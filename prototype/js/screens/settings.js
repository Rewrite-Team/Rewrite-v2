/* 설정: 프로필 · GitHub 계정 · 계정. 프로필은 저장 버튼으로 */
(function (App) {
  const esc = (s) => App.ui.esc(s); const S = App.store; const I = App.icon;
  const JOBS = ['백엔드 개발자', '프론트엔드 개발자', '서비스 기획자', 'PM/PO', '데이터 분석가', 'UX/UI 디자이너', '마케터'];
  const meId = () => (App.auth.current() || {}).id;
  const row = (label, body, forId) => `<div class="set-row">${forId ? `<label class="set-label" for="${forId}">${label}</label>` : `<div class="set-label">${label}</div>`}<div class="set-ctrl">${body}</div></div>`;

  function githubHTML() {
    const gh = S.github();
    if (!gh) return row('GitHub 주소', '<span class="set-value subtle">연결하지 않았어요</span><button type="button" class="btn btn-sm" data-act="gh-on">GitHub 연결</button>');
    const url = gh.url || `https://github.com/${gh.login}`;
    return row('GitHub 주소', `<span class="set-value">${esc(url.replace(/^https?:\/\//, ''))}${gh.source === 'sample' ? ' <span class="tag">예시</span>' : ''}</span>
      <button type="button" class="btn btn-sm" data-act="gh-on">바꾸기</button><button type="button" class="btn btn-sm btn-ghost btn-danger" data-act="gh-off">연결 해제</button>`);
  }
  function view() {
    const u = S.state.user; const me = App.auth.current() || {};
    return `<div class="page page-narrow set"><header class="page-head"><h1>설정</h1></header>
      <section class="section"><h2 class="section-title">프로필</h2><div class="set-rows">
        ${row('이름', `<div class="set-field" data-field="name" data-wr><input class="input" id="set-name" data-user="name" maxlength="20" autocomplete="name" value="${esc(u.name)}" />${App.ui.wrFoot()}</div>`, 'set-name')}
        ${row('목표 직무', `<div class="set-field" data-wr><input class="input" id="set-job" data-user="targetJob" list="set-jobs" maxlength="30" placeholder="예: 백엔드 개발자" value="${esc(u.targetJob)}" /><datalist id="set-jobs">${JOBS.map((j) => `<option value="${esc(j)}"></option>`).join('')}</datalist>${App.ui.wrFoot()}</div>`, 'set-job')}
      </div></section>
      <section class="section"><h2 class="section-title">GitHub 계정</h2><div class="set-rows" data-github>${githubHTML()}</div></section>
      <section class="section"><h2 class="section-title">계정</h2><div class="set-rows">
        ${row('이메일', `<span class="set-value">${esc(me.email)}</span><button type="button" class="btn btn-sm" data-logout>로그아웃</button>`)}
        ${row('회원 탈퇴', '<span class="set-value subtle">계정과 모든 데이터를 지워요</span><button type="button" class="btn btn-sm btn-ghost btn-danger" data-act="leave">탈퇴하기</button>')}
      </div></section></div>`;
  }

  App.screens.settings = {
    title: '설정',
    render: view,
    mount(root) {
      const mine = meId();
      const drawGithub = () => { const el = root.querySelector('[data-github]'); if (el) el.innerHTML = githubHTML(); };
      // 모달 안의 입력칸 아래 오류. msg 가 비면 지운다
      function fieldError(field, msg) {
        const i = field.querySelector('input'); const old = field.querySelector('.field-error'); if (old) old.remove();
        if (!msg) { i.removeAttribute('aria-invalid'); i.removeAttribute('aria-describedby'); return; }
        field.insertAdjacentHTML('beforeend', `<p class="field-error" id="${i.id}-e" role="alert">${I('warning', 15)}${esc(msg)}</p>`);
        i.setAttribute('aria-invalid', 'true'); i.setAttribute('aria-describedby', `${i.id}-e`);
      }

      function connectGithub() {
        const changing = !!S.github(); const me = meId();
        App.ui.modal({
          title: changing ? 'GitHub 계정 바꾸기' : 'GitHub 연결', confirmText: '불러오기',
          body: '<div class="field"><label class="label" for="set-gh">GitHub 주소</label><input class="input" id="set-gh" placeholder="github.com/내아이디" inputmode="url" autocapitalize="off" autocomplete="off" spellcheck="false" maxlength="200" /></div><p class="set-busy" role="status" data-busy></p>',
          onOpen(m) { const i = m.querySelector('#set-gh'); i.oninput = () => fieldError(i.closest('.field'), ''); i.focus(); },
          async onConfirm(m) {
            const i = m.querySelector('#set-gh'); const field = i.closest('.field'); const busy = m.querySelector('[data-busy]'); const v = i.value.trim();
            if (!v) { fieldError(field, 'GitHub 주소를 적어 주세요.'); i.focus(); return false; }
            fieldError(field, ''); i.disabled = true;
            const show = (t) => { busy.innerHTML = t ? `<span class="spinner"></span><span>${esc(t)}</span>` : ''; };
            show('계정 확인하는 중');
            try {
              const account = await App.github.fetchAccount(v, { onProgress: (p) => show(typeof p === 'string' ? p : (p && p.text) || '') });
              if (!i.isConnected || meId() !== me) return false; // 닫았거나 다른 계정으로 바뀌었다
              S.setGithub(account); drawGithub(); App.ui.toast(`${account.login} 계정을 연결했어요`); return true;
            } catch (e) { if (i.isConnected) { i.disabled = false; show(''); fieldError(field, e.message); i.focus(); } return false; }
          },
        });
      }
      function leave() {
        const me = App.auth.current(); if (!me) return;
        App.ui.modal({
          title: '회원 탈퇴', confirmText: '탈퇴하기', danger: true,
          body: me.demo ? '<p>예시 계정이라 계정은 남고, 데이터만 처음 상태로 돌아가요. 되돌릴 수 없어요.</p>'
            : '<p class="set-leave">프로젝트, AI 채팅, 경험 카드, 지원 기업, 이력서가 모두 지워지고 되돌릴 수 없어요.</p><div class="field"><label class="label" for="set-pw">비밀번호 확인</label><input class="input" id="set-pw" type="password" autocomplete="current-password" /></div>',
          onOpen(m) { const i = m.querySelector('#set-pw'); if (i) i.oninput = () => fieldError(i.closest('.field'), ''); },
          async onConfirm(m) {
            const i = m.querySelector('#set-pw');
            if (i && !i.value) { fieldError(i.closest('.field'), '비밀번호를 적어 주세요.'); i.focus(); return false; }
            try { await App.auth.remove(i ? i.value : ''); } catch (e) {
              if (i && i.isConnected) { fieldError(i.closest('.field'), e.field ? e.message : '문제가 생겼어요. 다시 시도해 주세요.'); i.select(); }
              return false;
            }
            App.ui.closeModal(); App.navigate('#/login'); App.ui.toast(me.demo ? '예시 데이터를 처음 상태로 되돌렸어요' : '탈퇴했어요');
            return true;
          },
        });
      }

      function onClick(ev) {
        const b = ev.target.closest('[data-act]'); if (!b) return; const act = b.dataset.act;
        if (act === 'gh-on') connectGithub();
        else if (act === 'gh-off') { const old = S.github(); S.setGithub(null); drawGithub(); App.ui.toast('GitHub 연결을 해제했어요', { action: '되돌리기', onAction: ((me) => () => { if (meId() !== me || S.github()) return; S.setGithub(old); drawGithub(); App.ui.toast('되돌렸어요'); })(meId()) }); }
        else if (act === 'leave') leave();
      }
      function saveUser(i) {
        const key = i.getAttribute('data-user'); const v = i.value.trim(); const field = i.parentElement;
        if (!v && key === 'name') { fieldError(field, '이름을 적어 주세요.'); return; }
        fieldError(field, ''); i.value = v; if (v === (S.state.user[key] || '')) { App.ui.wrSync(i); return; }
        S.updateUser({ [key]: v });
        if (key === 'name') { document.querySelectorAll('.account-name').forEach((x) => { x.textContent = v; }); document.querySelectorAll('.account .avatar').forEach((x) => { x.textContent = v.slice(0, 1); }); }
        App.ui.wrSaved(i);
      }
      const onSave = (ev) => saveUser(ev.target);
      const onInput = (ev) => { if (ev.target.matches('[data-user][aria-invalid]')) fieldError(ev.target.parentElement, ''); };

      root.addEventListener('click', onClick); root.addEventListener('wr-save', onSave); root.addEventListener('input', onInput);
      return () => { root.removeEventListener('click', onClick); root.removeEventListener('wr-save', onSave); root.removeEventListener('input', onInput); if (meId() === mine) root.querySelectorAll('[data-user]').forEach((i) => { const v = i.value.trim(); if (v !== i.defaultValue && (v || i.dataset.user !== 'name')) S.updateUser({ [i.dataset.user]: v }); }); };
    },
  };
})(window.App);
