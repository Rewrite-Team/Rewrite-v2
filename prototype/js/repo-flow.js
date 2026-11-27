/* GitHub 연결 흐름 (공용): App.repoFlow — 새 프로젝트 모달 · 레포 고르기 · 레포 분석 · STAR 초안 목록.
   경험 위키·프로젝트·AI 채팅·온보딩이 모두 이것만 쓴다.
   ① mountPicker(el, { onPick })            계정 주소 입력 → 레포 하나 고르기
   ② openNewProject(done)                   새 프로젝트: GitHub에서 가져오기 | 직접 만들기 → done(project)
   ③ connect(projectId, done)               이 프로젝트에 GitHub 레포 연결 → done(project)
   ④ analyze(projectId, { onProgress, isAlive }) 연결한 레포 분석 → { drafts, made, errors, notes, commits, prs }
   ⑤ draftsHTML(drafts, pickedKeys, opts) · saveDrafts(projectId, drafts)  초안 목록과 저장 */
(function (App) {
  const esc = (s) => App.ui.esc(s); const S = App.store;
  const keyOf = (r) => App.github.keyOf(r.owner, r.name);
  const ym = (d) => String(d || '').slice(0, 7).replace('-', '.');
  const PAGE = 8;

  /* ---------------- ① 레포 고르기 ---------------- */
  // opts: { onPick(repo|null), projectId(이 프로젝트에 연결하는 중), keepAccount(계정 바꾸기를 숨긴다: AI 채팅) }
  function mountPicker(el, opts = {}) {
    const st = { q: '', all: false, busy: '', error: '', input: '', picked: '', changing: false };
    let run = 0;
    const repos = () => {
      const seen = new Set();
      return ((S.github() || {}).owners || []).flatMap((o) => o.repos.map((r) => Object.assign({ ownerName: o.name || o.login }, r)))
        .filter((r) => !seen.has(keyOf(r)) && seen.add(keyOf(r))).sort((a, b) => String(b.pushedAt || '').localeCompare(String(a.pushedAt || '')));
    };
    const pick = (k) => { st.picked = k; if (opts.onPick) opts.onPick(repos().find((r) => keyOf(r) === k) || null); };
    const focus = (sel) => { const n = el.querySelector(sel); if (n) n.focus(); };

    function accountHTML() {
      const off = st.busy ? 'disabled' : '';
      const foot = [st.busy ? '' : '<button type="button" class="btn btn-ghost btn-sm" data-rf="sample">예시 계정으로 해 보기</button>',
        st.changing && !st.busy ? '<button type="button" class="btn btn-ghost btn-sm" data-rf="cancel">이전 계정으로</button>' : ''].join('');
      return `<form class="rf-account" data-rf-form novalidate>
        <div class="field"><label class="label" for="rf-url">GitHub 주소</label>
          <div class="rf-inline"><input class="input" id="rf-url" value="${esc(st.input)}" placeholder="github.com/내아이디" autocapitalize="off" autocomplete="off" spellcheck="false" ${off} aria-describedby="rf-url-d" ${st.error ? 'aria-invalid="true"' : ''} />
            <button class="btn" type="submit" ${off}>불러오기</button></div>
          ${st.error ? `<p class="field-error" id="rf-url-d" role="alert">${App.icon('warning', 15)}<span>${esc(st.error)}</span></p>` : '<p class="field-hint" id="rf-url-d">내 레포와 소속 조직의 공개 레포를 한 번에 불러와요.</p>'}</div>
        ${st.busy ? `<p class="rf-busy" role="status" tabindex="-1"><span class="spinner"></span><span data-rf-busy>${esc(st.busy)}</span></p>` : ''}
        <div class="rf-account-foot">${foot}</div>
      </form>`;
    }
    function rowHTML(r) {
      const linked = S.projectOfRepo(r.owner, r.name); const k = keyOf(r); const on = st.picked === k;
      const where = !linked ? '' : linked.id === opts.projectId ? '이 프로젝트에 연결됨' : `「${linked.title}」에 연결됨`;
      return `<label class="choice rf-repo ${on ? 'is-on' : ''}"><input type="radio" name="rf-repo" value="${esc(k)}" ${on ? 'checked' : ''} ${linked ? 'disabled' : ''} />
        <span class="choice-main"><span class="choice-title">${esc(r.name)}</span><span class="choice-sub">${esc(r.description || r.ownerName)}</span></span>
        <span class="rf-repo-meta">${where ? `<span>${esc(where)}</span>` : `<span>${esc(r.language || '')}</span><span>${ym(r.pushedAt)}</span>`}</span></label>`;
    }
    function listHTML() {
      const q = st.q.trim().toLowerCase();
      const list = repos().filter((r) => !q || keyOf(r) === st.picked || [r.name, r.description, r.language, r.owner, r.ownerName].join(' ').toLowerCase().includes(q));
      if (!list.length) return `<p class="rf-none">${q ? '찾는 레포가 없어요.' : opts.keepAccount ? '공개 레포가 없어요. GitHub 계정은 설정에서 바꿀 수 있어요.' : '공개 레포가 없어요. 다른 계정을 불러오거나 직접 만들어 주세요.'}</p>`;
      const shown = st.all || q ? list : list.filter((r, i) => i < PAGE || keyOf(r) === st.picked);
      return shown.map(rowHTML).join('') + (list.length > shown.length ? `<button type="button" class="btn btn-ghost btn-sm rf-more" data-rf="all">${list.length - shown.length}개 더 보기</button>` : '');
    }
    const drawList = () => { el.querySelector('[data-rf-list]').innerHTML = listHTML(); };
    function paint() {
      const g = S.github();
      if (!g || st.changing || st.busy) { el.innerHTML = accountHTML(); return; }
      el.innerHTML = `<div class="rf-bar"><span class="rf-who">${App.icon('github', 16)}<b>${esc(g.login)}</b>${g.source === 'sample' ? '<span class="tag">예시</span>' : ''}</span>${opts.keepAccount ? '' : '<button type="button" class="btn btn-ghost btn-sm" data-rf="change">계정 바꾸기</button>'}</div>
        ${(g.warnings || []).map((w) => `<p class="banner banner-warn rf-warn">${App.icon('warning')}<span>${esc(w)}</span></p>`).join('')}
        <div class="input-icon rf-search">${App.icon('search', 16)}<input class="input" type="search" data-rf-q value="${esc(st.q)}" placeholder="레포 검색" aria-label="레포 검색" /></div>
        <div class="rf-list" data-rf-list role="radiogroup" aria-label="GitHub 레포">${listHTML()}</div>`;
    }
    async function load(input) {
      const id = ++run; const me = (App.auth.current() || {}).id;
      st.input = input; st.error = ''; st.busy = App.github.ACCOUNT_STEPS[0]; paint(); focus('.rf-busy');
      const live = () => id === run && (App.auth.current() || {}).id === me && el.isConnected;
      try {
        const a = await App.github.fetchAccount(input, { onProgress: (p) => { if (!live()) return; st.busy = p.text || st.busy; const b = el.querySelector('[data-rf-busy]'); if (b) b.textContent = st.busy; } });
        if (!live()) return;
        S.setGithub(a); Object.assign(st, { busy: '', changing: false, q: '', all: false }); pick('');
      } catch (e) { if (!live()) return; st.busy = ''; st.error = e.message; }
      paint(); focus('#rf-url, [data-rf-q]');
    }
    el.addEventListener('submit', (ev) => {
      if (!ev.target.matches('[data-rf-form]')) return; ev.preventDefault(); ev.stopPropagation();
      const v = el.querySelector('#rf-url').value.trim(); if (v) { load(v); return; }
      st.input = ''; st.error = 'GitHub 주소를 적어 주세요.'; paint(); focus('#rf-url');
    });
    el.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-rf]'); if (!b) return; const a = b.getAttribute('data-rf');
      if (a === 'sample') load(App.github.sampleAccount().login);
      else if (a === 'change') { Object.assign(st, { changing: true, error: '', input: '' }); pick(''); paint(); focus('#rf-url'); }
      else if (a === 'cancel') { st.changing = false; st.error = ''; paint(); focus('#rf-url, [data-rf-q]'); }
      else if (a === 'all') { st.all = true; drawList(); focus(`.rf-repo:nth-child(n+${PAGE + 1}) input:not(:disabled)`); }
    });
    el.addEventListener('input', (ev) => { if (ev.target.matches('[data-rf-q]')) { st.q = ev.target.value; drawList(); } });
    el.addEventListener('change', (ev) => { if (ev.target.name !== 'rf-repo') return; pick(ev.target.value); el.querySelectorAll('.rf-repo').forEach((r) => r.classList.toggle('is-on', r.querySelector('input').checked)); });
    paint();
    return { repaint: paint };
  }

  /* ---------------- ② 새 프로젝트 ---------------- */
  function openNewProject(done, opts = {}) {
    let mode = 'github'; let repo = null;
    const manualHTML = `<div class="rf-manual">
        <div class="field"><label class="label" for="rf-title">프로젝트 이름</label><input class="input" id="rf-title" maxlength="40" placeholder="예: 교내 해커톤, 카페 아르바이트" /><p class="field-hint">팀 과제, 동아리, 아르바이트도 프로젝트예요.</p></div>
        <div class="field"><label class="label" for="rf-role">맡은 역할 (선택)</label><input class="input" id="rf-role" maxlength="40" /></div>
      </div>`;
    const close = App.ui.modal({
      title: '새 프로젝트', confirmText: '프로젝트 만들기', size: 'lg',
      body: `<div class="seg rf-seg" role="group" aria-label="만드는 방법"><button type="button" class="seg-btn is-on" data-mode="github" aria-pressed="true">${App.icon('github', 16)}GitHub에서 가져오기</button><button type="button" class="seg-btn" data-mode="manual" aria-pressed="false">직접 만들기</button></div><div data-rf-pane class="rf-pane"></div>`,
      onOpen(root) {
        const pane = root.querySelector('[data-rf-pane]'); const ok = root.querySelector('[data-m=ok]');
        const draw = () => {
          repo = null; const p = pane.cloneNode(false); root.querySelector('[data-rf-pane]').replaceWith(p);
          root.querySelectorAll('[data-mode]').forEach((b) => { b.classList.toggle('is-on', b.dataset.mode === mode); b.setAttribute('aria-pressed', String(b.dataset.mode === mode)); });
          if (mode === 'github') { ok.disabled = true; mountPicker(p, { keepAccount: opts.keepAccount, onPick: (r) => { repo = r; ok.disabled = !r; } }); }
          else { p.innerHTML = manualHTML; const t = p.querySelector('#rf-title'); ok.disabled = true; t.oninput = () => { ok.disabled = !t.value.trim(); }; t.focus(); }
        };
        root.querySelectorAll('[data-mode]').forEach((b) => { b.onclick = () => { if (mode === b.dataset.mode) return; mode = b.dataset.mode; draw(); }; });
        draw();
      },
      onConfirm(root) {
        let p = null;
        if (mode === 'github') { if (!repo) return false; p = S.createProjectFromRepo(repo); }
        else { const title = root.querySelector('#rf-title').value.trim(); if (!title) return false; p = S.createProject({ title, role: root.querySelector('#rf-role').value.trim() }); }
        App.ui.toast(`「${p.title}」 프로젝트를 만들었어요`);
        if (done) setTimeout(() => { const made = S.getProject(p.id); if (made) done(made); }, 0);
        return true;
      },
    });
    return close;
  }

  /* ---------------- ③ 연결 ---------------- */
  function connect(projectId, done, opts = {}) {
    const p = S.getProject(projectId); if (!p) return; let repo = null;
    App.ui.modal({
      title: `「${p.title}」에 GitHub 연결`, confirmText: '연결하기', size: 'lg', body: '<div data-rf-pane class="rf-pane"></div>',
      onOpen(root) { const ok = root.querySelector('[data-m=ok]'); ok.disabled = true; mountPicker(root.querySelector('[data-rf-pane]'), { projectId, keepAccount: opts.keepAccount, onPick: (r) => { repo = r; ok.disabled = !r; } }); },
      onConfirm() {
        if (!repo) return false;
        S.linkRepo(projectId, { owner: repo.owner, name: repo.name, url: repo.url, branch: repo.branch || 'main' });
        App.ui.toast(`${repo.name} 레포를 연결했어요`); if (done) setTimeout(() => done(S.getProject(projectId)), 0);
        return true;
      },
    });
  }

  /* ---------------- ④ 분석 ---------------- */
  // onProgress({ step, text, repo, index, total }). drafts 는 아직 카드로 만들지 않은 것(trashed: 만들었다가 휴지통에 버린 것), made 는 이미 카드가 있는 것 [{ draft, card }]
  async function analyze(projectId, opts = {}) {
    const p = S.getProject(projectId); const repos = (p && p.repos) || []; const g = S.github(); const me = (App.auth.current() || {}).id;
    const login = g && g.source === 'github' && g.type !== 'org' ? g.login : '';
    const out = { drafts: [], made: [], errors: [], notes: [], commits: 0, prs: 0, sample: false };
    const alive = () => (!opts.isAlive || opts.isAlive()) && (App.auth.current() || {}).id === me && !!S.getProject(projectId);
    const trashed = new Set(S.trash().flatMap((t) => (t.data.experiences || []).flatMap((e) => [e.key, ...((e.evidence || {}).keys || [])]).filter(Boolean)));
    for (let i = 0; i < repos.length; i++) {
      const r = repos[i];
      try { // 연결할 때는 기본 브랜치를 모르므로(main 으로 적어 둠) 브랜치는 넘기지 않고 GitHub 의 기본 브랜치를 읽는다
        const res = await App.github.analyzeRepo({ owner: r.owner, name: r.name, url: r.url }, { login, onProgress: (x) => { if (opts.onProgress && alive()) opts.onProgress(Object.assign({}, x, { repo: r, index: i, total: repos.length })); } });
        if (!alive()) return null;
        const at = S.projectOfRepo(r.owner, r.name); if (!at || at.id !== projectId) continue; // 분석하는 사이 연결을 끊은 레포
        S.linkRepo(projectId, Object.assign({}, res.repo, { owner: r.owner, name: r.name }));
        out.commits += res.repo.commits || 0; out.prs += res.repo.prs || 0; if (res.source === 'sample') out.sample = true; if (res.note) out.notes.push(res.note);
        res.drafts.forEach((d) => { const card = S.cardByKey(d.key); if (card) out.made.push({ draft: d, card }); else out.drafts.push(Object.assign({}, d, trashed.has(d.key) ? { trashed: true } : {})); });
      } catch (e) { if (!alive()) return null; out.errors.push(`${r.name}: ${e.message}`); }
    }
    return out;
  }
  const STEPS = () => App.github.STEPS;
  const stepsHTML = (x) => `<ol class="steps">${STEPS().map((t, k) => `<li class="${k < x.step ? 'is-done' : k === x.step ? 'is-now' : ''}">${esc(k === x.step && x.text ? x.text : t)}</li>`).join('')}</ol>`;

  /* ---------------- ⑤ 초안 ---------------- */
  const STAR = [['situation', '상황'], ['task', '과제'], ['action', '행동'], ['result', '결과']];
  // picked: 고른 초안 key 의 Set. 체크박스는 [data-draft=<key>]
  function draftsHTML(drafts, picked, opts = {}) {
    return drafts.map((d) => {
      const ev = App.ui.evidence(d.evidence); const on = picked.has(d.key);
      return `<div class="rf-draft"><label class="choice ${on ? 'is-on' : ''}"><input type="checkbox" data-draft="${esc(d.key)}" ${on ? 'checked' : ''} ${opts.disabled ? 'disabled' : ''} />
          <span class="choice-main"><span class="choice-title">${esc(d.title)}</span><span class="choice-sub">${esc(App.ai.resumeLine(d))}</span>
            <span class="rf-draft-kws">${d.keywords.map((k) => App.ui.keywordChip(k)).join('')}${d.trashed ? '<span class="tag">휴지통에 있는 카드</span>' : ''}</span></span></label>
        <details class="rf-draft-more"><summary>${App.icon('chevron-right', 16)}자세히 보기${ev ? `<span class="meta">${ev.counts}</span>` : ''}</summary>
          <dl class="rf-star">${STAR.map(([k, l]) => `<div><dt>${l}</dt><dd>${d.star[k] ? esc(d.star[k]) : '<span class="subtle">비어 있어요. AI 채팅에서 채울 수 있어요.</span>'}</dd></div>`).join('')}</dl>
          ${ev ? `<div class="cd-ev-body rf-ev">${ev.body}</div>` : ''}</details></div>`;
    }).join('');
  }
  // trashed 같은 표시용 값은 카드에 남기지 않는다
  function saveDrafts(projectId, drafts) { return S.addGithubCards(projectId, drafts.map((d) => { const c = Object.assign({}, d); delete c.trashed; return c; })); }

  App.repoFlow = { mountPicker, openNewProject, connect, analyze, stepsHTML, draftsHTML, saveDrafts };
})(window.App);
