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

  /* ---------- 왼쪽: 말한 문장이 이력서 문장으로 바뀌며 한 장이 채워진다 (한 번만) ---------- */
  const SCENES = [
    { p: '모여봄', when: '2026.09부터', say: '검색 API가 느려서 고쳤어요', line: 'N+1 쿼리를 찾아 평균 응답 시간을 [1.8초에서 0.3초로] 단축' },
    { p: '알고리즘 스터디', when: '2025.03 ~ 2025.12', say: '자꾸 그만두는 사람이 생겼어요', line: '난이도를 3단계로 나눠 10개월간 [평균 참여율 85%] 유지' },
    { p: '카페 아르바이트', when: '2024.03 ~ 2025.02', say: '주문이 밀리면 정신이 없었어요', line: '메뉴별 주문 수를 집계해 대기 시간을 [절반 가까이] 단축' },
  ];
  // 낱말마다 감싸서 차례로 나타나게 한다. [ ] 안은 강조할 핵심 구절
  function lineHTML(text) {
    let i = 0; const words = (t) => t.split(/(\s+)/).map((w) => (w.trim() ? `<span class="au-w" style="--i:${i++}">${esc(w)}</span>` : w)).join('');
    return text.split(/[[\]]/).map((t, k) => (k % 2 ? `<mark class="au-mark">${words(t)}</mark>` : words(t))).join('');
  }
  function paperHTML() {
    const bars = (...w) => w.map((x) => `<i style="width:${x}%"></i>`).join('');
    return `<div class="au-paper" data-paper role="img" aria-label="편하게 말한 문장이 이력서 문장으로 바뀌는 예시">
      <div aria-hidden="true"><div class="au-p-head"><div><strong>김준호</strong><span>백엔드 개발자</span></div><div class="au-bars">${bars(100, 72)}</div></div>
        <div class="au-p-title">프로젝트</div>
        <ul class="au-slots">${SCENES.map((x) => `<li class="au-slot"><div class="au-slot-head"><b>${esc(x.p)}</b><span>${esc(x.when)}</span></div>
          <div class="au-say"><div><p><span class="au-said" data-say="${esc(x.say)}">${esc(x.say)}</span></p></div></div><p class="au-line">${lineHTML(x.line)}</p></li>`).join('')}</ul>
        <div class="au-p-title">기술</div><div class="au-bars">${bars(64, 48)}</div>
        <div class="au-p-title">학력</div><div class="au-bars">${bars(56, 80, 40)}</div></div></div>`;
  }
  function play(root) {
    const paper = root.querySelector('[data-paper]'); const btn = root.querySelector('[data-replay]'); const slots = [...paper.querySelectorAll('.au-slot')];
    let run = 0; let timer = 0;
    const label = (on) => { btn.innerHTML = on ? '건너뛰기' : `${App.icon('refresh', 15)}다시 보기`; btn.dataset.on = on ? '1' : ''; };
    function end() { run++; clearTimeout(timer); slots.forEach((li) => { const t = li.querySelector('[data-say]'); t.textContent = t.dataset.say; li.className = 'au-slot is-in is-struck is-line is-marked is-done'; }); label(false); }
    async function start() {
      const id = ++run; const wait = (ms) => new Promise((ok) => { timer = setTimeout(ok, ms); }); const live = () => id === run && paper.isConnected;
      paper.classList.add('is-reset'); slots.forEach((li) => { li.className = 'au-slot'; li.querySelector('[data-say]').textContent = ''; }); void paper.offsetWidth; paper.classList.remove('is-reset');
      label(true); await wait(700);
      for (const li of slots) {
        if (!live()) return;
        const t = li.querySelector('[data-say]'); const step = async (c, ms) => { li.classList.add(c); await wait(ms); return live(); };
        if (!await step('is-in', 350)) return;
        li.classList.add('is-typing');
        for (let n = 1; n <= t.dataset.say.length; n++) { t.textContent = t.dataset.say.slice(0, n); await wait(48); if (!live()) return; }
        await wait(450); if (!live()) return; li.classList.remove('is-typing');
        if (!await step('is-struck', 620)) return;
        if (!await step('is-line', 900)) return;
        if (!await step('is-marked', 1000)) return;
        if (!await step('is-done', 500)) return;
      }
      label(false);
    }
    btn.onclick = () => { if (btn.dataset.on) end(); else start(); };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { end(); btn.hidden = true; } else start();
    return () => { run++; clearTimeout(timer); };
  }

  function screen(kind) {
    const v = VIEW[kind]; const signup = kind === 'signup';
    return {
      title: v.h, layout: 'full',
      render() {
        const brand = '<div class="brand"><span class="brand-mark">R</span><span class="brand-name">Rewrite</span></div>';
        return `<div class="auth"><section class="auth-brand">${brand}
            <div class="au-pitch"><h2>편하게 말한 경험이<br>이력서 한 줄이 돼요</h2>
              <p>AI와 이야기하거나 GitHub를 연결하면 경험 카드로 정리하고, 이력서와 자소서까지 이어 써요.</p></div>
            ${paperHTML()}
            <button type="button" class="btn btn-sm au-replay" data-replay></button></section>
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
        form.elements[v.fields[0]].focus(); const stop = play(root);
        return () => { alive = false; stop(); };
      },
    };
  }
  App.screens.login = screen('login');
  App.screens.signup = screen('signup');
})(window.App);
