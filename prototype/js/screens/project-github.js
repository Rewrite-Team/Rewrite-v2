/* GitHub로 경험 카드 만들기 — #/vault/p/:id/github
   들어오면 이 프로젝트에 연결한 레포를 바로 분석하고(steps), 찾은 초안을 골라 경험 카드로 만든다 */
(function (App) {
  const esc = (s) => App.ui.esc(s); const S = App.store;
  const me = () => (App.auth.current() || {}).id || '';

  // 화면을 떠났다 돌아와도 결과가 남는다. 계정이 바뀌면 다른 계정의 것은 버린다
  // run = { who, repos, prog, res, picked:Set }  res 가 없으면 분석 중
  const runs = new Map();
  const keyOf = (id) => `${me()}:${id}`;
  const reposOf = (p) => (p.repos || []).map((r) => App.github.keyOf(r.owner, r.name)).sort().join(',');
  let view = null; // 지금 보이는 화면 { key, root, pid }

  const runOf = (id) => runs.get(keyOf(id)) || null;
  async function start(p) {
    const key = keyOf(p.id); const run = { who: me(), repos: reposOf(p), prog: { step: 0, text: '', repo: p.repos[0], index: 0, total: p.repos.length }, res: null, picked: new Set() };
    runs.set(key, run);
    const alive = () => runs.get(key) === run && me() === run.who;
    let res = null;
    try { res = await App.repoFlow.analyze(p.id, { isAlive: alive, onProgress: (x) => { run.prog = x; if (shown(key)) paintSteps(run); } }); } catch (e) { console.warn('[github] analyze', e); if (alive()) res = { drafts: [], made: [], errors: ['분석을 마치지 못했어요. 다시 시도해 주세요.'], notes: [], commits: 0, prs: 0, sample: false }; }
    if (!alive() || !res) { if (runs.get(key) === run) runs.delete(key); return; } // 그만두었거나 그사이 로그아웃했으면 버린다
    run.res = res; res.drafts.forEach((d) => { if (!d.trashed) run.picked.add(d.key); });
    if (shown(key)) paint();
  }
  const shown = (key) => !!view && view.key === key && view.root.isConnected;

  // 그사이 카드로 만들었거나 휴지통에 버린 것도 맞게 나눈다
  function split(run) {
    const all = run.res.drafts.concat(run.res.made.map((m) => m.draft)); const drafts = []; const made = [];
    all.forEach((d) => { const card = S.cardByKey(d.key); if (card) made.push(card); else drafts.push(d); });
    return { drafts, made: made.filter((c, i) => made.findIndex((x) => x.id === c.id) === i) };
  }

  /* ---------- 분석 중 ---------- */
  const repoLabel = (x) => `${x.repo ? x.repo.name : ''}${x.total > 1 ? ` (${x.index + 1}/${x.total})` : ''}`;
  function runHTML(run) {
    return `<div class="pg-run" aria-busy="true"><p class="meta"><span>${App.icon('github', 15)}<span data-pg-repo>${esc(repoLabel(run.prog))}</span></span></p>
      <div data-pg-steps data-step="${run.prog.step}">${App.repoFlow.stepsHTML(run.prog)}</div><span class="sr-only" role="status" data-pg-say>${esc(run.prog.text || '분석하는 중')}</span>
      <button type="button" class="btn" data-act="stop">그만두기</button></div>`;
  }
  // 단계가 그대로면 글자만 바꾼다 (돌아가는 표시가 끊기지 않게)
  function paintSteps(run) {
    const box = view.root.querySelector('[data-pg-steps]'); if (!box) return; const x = run.prog;
    view.root.querySelector('[data-pg-repo]').textContent = repoLabel(x);
    const now = box.querySelector('.is-now');
    if (box.dataset.step === String(x.step) && now) { now.textContent = x.text; return; }
    box.dataset.step = x.step; box.innerHTML = App.repoFlow.stepsHTML(x); view.root.querySelector('[data-pg-say]').textContent = x.text;
  }

  /* ---------- 고르기 ---------- */
  const chatBtn = (pid, primary) => `<button type="button" class="btn ${primary ? 'btn-primary' : ''}" data-chat data-chat-project="${esc(pid)}">${App.icon('chat', 16)}AI 채팅으로 만들기</button>`;
  const again = '<button type="button" class="btn btn-sm" data-act="again">다시 시도</button>';
  function madeHTML(made, pid) {
    if (!made.length) return '';
    return `<details class="pg-made"><summary>${App.icon('chevron-right', 16)}이미 카드로 만든 경험 ${made.length}개</summary>
      <div class="list">${made.map((c) => `<a class="list-row" href="#/card/${encodeURIComponent(c.id)}">${App.icon('card')}<span class="list-row-main"><span class="list-row-title">${esc(c.title)}</span>${c.projectId === pid ? '' : `<span class="list-row-sub">${App.ui.projChip(c.projectId)}</span>`}</span></a>`).join('')}</div></details>`;
  }
  function barHTML(drafts, run) {
    const n = drafts.filter((d) => run.picked.has(d.key)).length;
    return `<label class="pg-all"><input type="checkbox" data-pg-all ${n === drafts.length ? 'checked' : ''} /><span>모두 고르기</span></label>
      <button type="button" class="btn btn-primary" data-act="save" ${n ? '' : 'disabled'}>경험 카드 ${n}장 만들기</button>`;
  }
  function reviewHTML(p, run) {
    const { drafts, made } = split(run); const r = run.res;
    const banners = (r.errors.length ? `<div class="banner banner-danger" role="alert">${App.icon('warning')}<span>${r.errors.map(esc).join('<br>')}</span>${again}</div>` : '')
      + [...new Set(r.notes)].map((t) => `<div class="banner">${App.icon('github')}<span>${esc(t)}</span></div>`).join('');
    const empty = r.errors.length ? (made.length ? '' : `<div class="empty">${chatBtn(p.id, false)}</div>`)
      : `<div class="empty"><div class="empty-title">${made.length ? '새로 만들 경험이 없어요' : '커밋과 PR에서 경험을 찾지 못했어요'}</div><p>${made.length ? '찾은 경험은 모두 카드로 만들었어요.' : 'AI와 이야기하며 만들 수 있어요.'}</p>${chatBtn(p.id, true)}</div>`;
    return `${banners ? `<div class="pg-banners">${banners}</div>` : ''}
      ${drafts.length ? `<div data-pg-drafts>${App.repoFlow.draftsHTML(drafts, run.picked)}</div>` : empty}
      ${madeHTML(made, p.id)}
      ${drafts.length ? `<div class="pg-bar" data-pg-bar>${barHTML(drafts, run)}</div>` : ''}`;
  }

  /* ---------- 화면 ---------- */
  function bodyHTML(p) {
    if (!(p.repos || []).length) return `<div class="empty"><div class="empty-title">연결한 레포가 없어요</div><p>GitHub를 연결하면 커밋과 PR에서 경험을 찾아 줘요.</p><button type="button" class="btn btn-primary" data-act="connect">GitHub 연결</button></div>`;
    const run = runOf(p.id); return !run ? '' : run.res ? reviewHTML(p, run) : runHTML(run);
  }
  function headHTML(p) {
    const run = runOf(p.id); const r = run && run.res;
    return `<header class="page-head pj-head"><div><h1>GitHub로 경험 카드 만들기</h1>
      <div class="meta pj-meta">${App.ui.projChip(p.id, { link: true })}${r && (r.commits || r.prs) ? `<span>${[[r.commits, '커밋'], [r.prs, 'PR']].filter(([n]) => n).map(([n, l]) => `${l} ${n}개`).join(', ')}를 읽었어요</span>` : ''}${r && r.sample ? '<span class="tag">예시</span>' : ''}</div></div>
      ${r && !r.errors.length ? `<div class="page-head-actions"><button type="button" class="icon-btn" data-act="again" aria-label="다시 분석하기" title="다시 분석하기">${App.icon('refresh')}</button></div>` : ''}</header>`;
  }
  const pageHTML = (p) => `<div class="page page-narrow">${headHTML(p)}<div>${bodyHTML(p)}</div></div>`;
  function paint() {
    const p = view && S.getProject(view.pid); if (!p || !view.root.isConnected) return;
    view.root.innerHTML = pageHTML(p);
  }
  function ensure(p) {
    runs.forEach((run, k) => { if (run.who !== me()) runs.delete(k); });
    const run = runOf(p.id);
    if ((p.repos || []).length && (!run || run.repos !== reposOf(p))) start(p);
  }

  App.screens.projectGithub = {
    title: 'GitHub로 경험 카드 만들기',
    crumb: () => [{ label: '경험 위키', href: '#/vault' }], // 프로젝트는 제목 아래 이름이 링크다
    render(params) {
      const p = S.getProject(params.id);
      if (!p) return `<div class="page"><div class="empty"><div class="empty-title">프로젝트를 찾을 수 없어요</div><a class="btn" href="#/vault">경험 위키로</a></div></div>`;
      ensure(p); return pageHTML(p);
    },
    mount(root, params) {
      const id = params.id; if (!S.getProject(id)) return null;
      view = { key: keyOf(id), root, pid: id }; const mine = view;
      const back = () => App.navigate('#/vault/p/' + encodeURIComponent(id));
      const acts = {
        stop() { runs.delete(keyOf(id)); back(); },
        again() { start(S.getProject(id)); paint(); window.scrollTo(0, 0); },
        connect() { App.repoFlow.connect(id, () => App.rerender()); },
        save() {
          const run = runOf(id); if (!run || !run.res) return;
          const made = App.repoFlow.saveDrafts(id, split(run).drafts.filter((d) => run.picked.has(d.key))); if (!made.length) return;
          runs.delete(keyOf(id)); back(); App.ui.toast(`경험 카드 ${made.length}장을 만들었어요`);
        },
      };
      root.onclick = (ev) => { const b = ev.target.closest('[data-act]'); if (b && S.getProject(id)) acts[b.dataset.act](); };
      root.onchange = (ev) => {
        const run = runOf(id); if (!run || !run.res) return; const t = ev.target; const { drafts } = split(run);
        const set = (k, on) => { if (on) run.picked.add(k); else run.picked.delete(k); };
        if (t.matches('[data-pg-all]')) {
          drafts.forEach((d) => set(d.key, t.checked));
          root.querySelectorAll('[data-draft]').forEach((x) => { x.checked = t.checked; x.closest('.choice').classList.toggle('is-on', t.checked); });
        } else if (t.matches('[data-draft]')) { set(t.getAttribute('data-draft'), t.checked); t.closest('.choice').classList.toggle('is-on', t.checked); } else return;
        // 아래 줄은 통째로 다시 그리지 않는다 (포커스 유지)
        const n = drafts.filter((d) => run.picked.has(d.key)).length; const save = root.querySelector('[data-act=save]');
        root.querySelector('[data-pg-all]').checked = n === drafts.length; save.disabled = !n; save.textContent = `경험 카드 ${n}장 만들기`;
      };
      return () => { root.onclick = null; root.onchange = null; if (view === mine) view = null; };
    },
  };
})(window.App);
