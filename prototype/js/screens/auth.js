/* 로그인 · 회원가입 — #/login · #/signup (App.auth 의 로컬 계정) */
(function (App) {
  const esc = (s) => App.ui.esc(s);
  const PW = App.auth.MIN_PASSWORD;
  const FIELDS = {
    name: { label: '이름', type: 'text', auto: 'name', ph: '이름 또는 닉네임' },
    email: { label: '이메일', type: 'email', auto: 'username', ph: 'name@example.com' },
    password: { label: '비밀번호', type: 'password', auto: 'current-password', ph: '' },
  };
  const VIEW = {
    login: { h: '로그인', fields: ['email', 'password'], cta: '로그인', busy: '확인하는 중', other: '아직 계정이 없나요?', otherHref: '#/signup', otherLabel: '회원가입' },
    signup: { h: '회원가입', fields: ['name', 'email', 'password'], cta: '가입하기', busy: '만드는 중', other: '이미 계정이 있나요?', otherHref: '#/login', otherLabel: '로그인' },
  };
  function fieldHTML(k, signup) {
    const f = FIELDS[k]; const pw = k === 'password';
    return `<div class="field" data-field="${k}"><label class="label" for="au-${k}">${f.label}</label>
      <div class="au-input"><input class="input" id="au-${k}" name="${k}" type="${f.type}" autocomplete="${pw && signup ? 'new-password' : f.auto}" ${k === 'name' ? 'maxlength="20"' : 'autocapitalize="off" spellcheck="false"'} placeholder="${esc(f.ph)}" aria-describedby="au-${k}-msg" />${pw ? `<button type="button" class="icon-btn au-eye" data-eye aria-label="비밀번호 보기" aria-pressed="false">${App.icon('eye')}</button>` : ''}</div>
      <p class="field-hint" id="au-${k}-msg">${pw && signup ? `${PW}자 이상` : ''}</p></div>`;
  }
  function screen(kind) {
    const v = VIEW[kind]; const signup = kind === 'signup';
    return {
      title: v.h, layout: 'full',
      render() {
        const brand = '<div class="brand"><span class="brand-mark">R</span><span class="brand-name">Rewrite</span></div>';
        return `<div class="auth"><section class="auth-brand">${brand}
            <p class="auth-demo"><del>검색 API가 느려서 고쳤다.</del>N+1 쿼리를 찾아 <ins>응답 시간을 1.8초에서 0.3초로</ins> 줄였다.</p>
            <p class="auth-lead">겪은 일을 AI와 이야기하거나 GitHub를 연결하면, 이력서와 자소서에 쓸 수 있는 경험으로 정리돼요.</p></section>
          <form class="auth-form" novalidate data-au-form>${brand}<h1>${v.h}</h1>
            ${v.fields.map((k) => fieldHTML(k, signup)).join('')}
            <button class="btn btn-primary btn-lg btn-block" type="submit">${v.cta}</button>
            <button type="button" class="btn btn-lg btn-block au-demo" data-demo>예시 계정으로 둘러보기</button>
            <p class="auth-alt">${v.other} <a class="link" href="${v.otherHref}">${v.otherLabel}</a></p>
            <p class="field-hint au-note">프로토타입이라 계정과 데이터는 이 브라우저에만 저장돼요. 다른 곳에서 쓰는 비밀번호는 쓰지 마세요.</p>
          </form></div>`;
      },
      mount(root) {
        const form = root.querySelector('[data-au-form]'); const ok = form.querySelector('[type=submit]'); let alive = true;
        const hint = (k) => (k === 'password' && signup ? `${PW}자 이상` : '');
        function setError(k, msg) {
          const box = form.querySelector(`[data-field=${k}]`); if (!box) { App.ui.toast(msg); return; }
          const i = box.querySelector('input'); const p = box.querySelector(`#au-${k}-msg`);
          if (msg) i.setAttribute('aria-invalid', 'true'); else i.removeAttribute('aria-invalid');
          p.className = msg ? 'field-error' : 'field-hint'; p.innerHTML = msg ? `${App.icon('warning', 15)}${esc(msg)}` : hint(k); if (msg) i.focus();
        }
        form.addEventListener('input', (ev) => { if (ev.target.name && ev.target.hasAttribute('aria-invalid')) setError(ev.target.name, ''); });
        form.addEventListener('submit', async (ev) => {
          ev.preventDefault(); if (ok.disabled) return;
          v.fields.forEach((k) => setError(k, ''));
          const data = Object.fromEntries(v.fields.map((k) => [k, form.elements[k].value]));
          ok.disabled = true; ok.textContent = v.busy;
          try { await App.auth[kind](data); App.afterLogin(); } catch (e) { if (alive) { ok.disabled = false; ok.textContent = v.cta; setError(e.field || 'email', e.field ? e.message : '문제가 생겼어요. 다시 시도해 주세요.'); } }
        });
        root.querySelector('[data-demo]').onclick = () => { App.auth.loginDemo(); App.afterLogin(); };
        const eye = root.querySelector('[data-eye]');
        eye.onclick = () => { const i = form.elements.password; const show = i.type === 'password'; i.type = show ? 'text' : 'password'; eye.setAttribute('aria-pressed', String(show)); eye.setAttribute('aria-label', show ? '비밀번호 숨기기' : '비밀번호 보기'); };
        form.elements[v.fields[0]].focus();
        return () => { alive = false; };
      },
    };
  }
  App.screens.login = screen('login');
  App.screens.signup = screen('signup');
})(window.App);
