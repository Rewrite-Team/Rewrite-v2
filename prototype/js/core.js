/* App core: store, router, ui helpers, mock AI. 모든 화면이 이 API만 사용한다. */
window.App = window.App || {};
(function (App) {
  const LS_KEY = 'rewrite-proto-v1';
  const clone = (o) => JSON.parse(JSON.stringify(o));

  /* ---------------- Store ---------------- */
  function load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    const s = clone(window.SEED);
    return { user: s.user, settings: s.settings, experiences: s.experiences, inbox: s.inbox, streak: 6 };
  }
  let state = load();
  // 시드 완성도 값을 계산식과 일치시킴 (App.ai 정의 이후 실행)
  const listeners = new Set();
  function persist() { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } }
  function emit() { persist(); listeners.forEach((fn) => fn(state)); }
  const today = () => new Date().toISOString().slice(0, 10);
  const uid = (p) => p + Math.random().toString(36).slice(2, 8);

  App.store = {
    get state() { return state; },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    reset() { try { localStorage.removeItem(LS_KEY); } catch (e) {} state = load(); emit(); },

    // 경험 카드
    list() { return state.experiences.slice().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')); },
    get(id) { return state.experiences.find((e) => e.id === id) || null; },
    projects() { return this.list().filter((e) => e.isProject); },
    create(partial = {}) {
      const exp = Object.assign({
        id: uid('e'), title: '제목 없는 경험', category: '일상', period: { start: '', end: '' }, status: 'draft', isProject: false,
        role: '', summary: '', star: { situation: '', task: '', action: '', result: '' }, insights: '',
        keywords: [], jobs: [], links: [], logs: [], qa: [], completeness: 0, createdAt: today(), updatedAt: today(),
      }, clone(partial));
      exp.completeness = App.ai.completeness(exp);
      state.experiences.push(exp); emit(); return exp;
    },
    update(id, patch) {
      const exp = this.get(id); if (!exp) return null;
      Object.assign(exp, clone(patch), { updatedAt: today() });
      exp.completeness = App.ai.completeness(exp);
      emit(); return exp;
    },
    remove(id) { state.experiences = state.experiences.filter((e) => e.id !== id); emit(); },
    addLog(expId, log) {
      const exp = this.get(expId); if (!exp) return;
      exp.logs.push(Object.assign({ id: uid('l'), date: today(), keywords: App.ai.extractKeywords(log.text || '') }, log));
      exp.updatedAt = today(); exp.completeness = App.ai.completeness(exp); emit();
    },
    addQA(expId, q, a) {
      const exp = this.get(expId); if (!exp) return;
      exp.qa.push({ q, a, date: today() }); exp.updatedAt = today(); emit();
    },

    // 오늘의 질문 인박스
    inbox() { return state.inbox.slice(); },
    pending() { return state.inbox.filter((q) => q.status === 'pending'); },
    answer(qid, text) {
      const q = state.inbox.find((x) => x.id === qid); if (!q) return;
      q.status = 'answered'; q.answer = text;
      if (q.targetExpId) this.addQA(q.targetExpId, q.text, text);
      state.streak = (state.streak || 0) + 1; emit();
    },
    setQuestionStatus(qid, status) { const q = state.inbox.find((x) => x.id === qid); if (q) { q.status = status; emit(); } },
    pushQuestion(q) { state.inbox.unshift(Object.assign({ id: uid('q'), status: 'pending', askedAt: today() + ' ' + new Date().toTimeString().slice(0, 5) }, q)); emit(); },

    // 사용자/설정
    updateUser(patch) { Object.assign(state.user, patch); emit(); },
    updateSettings(patch) { Object.assign(state.settings, patch); emit(); },
  };

  /* ---------------- Keywords ---------------- */
  App.keywords = {
    all() { return window.SEED.keywords; },
    get(name) { return window.SEED.keywords.find((k) => k.name === name) || { name, tone: 'gray', desc: '사용자 정의 키워드', hints: [] }; },
    tone(name) { return this.get(name).tone; },
    // 키워드별 경험 수
    counts() {
      const m = {};
      state.experiences.forEach((e) => e.keywords.forEach((k) => { m[k] = (m[k] || 0) + 1; }));
      return m;
    },
  };

  /* ---------------- Mock AI ---------------- */
  App.ai = {
    // 텍스트에서 역량 키워드 추출 (힌트 단어 매칭)
    extractKeywords(text) {
      const found = [];
      window.SEED.keywords.forEach((k) => { if (k.hints.some((h) => text.includes(h))) found.push(k.name); });
      return found.slice(0, 4);
    },
    // STAR 단계 순서로 다음 꼬리질문 선택. ctx = { stage, turn, lastAnswer, alt }
    nextQuestion(ctx) {
      const F = window.SEED.followups;
      if (ctx.alt) return { stage: ctx.stage, text: F.alt[(ctx.turn || 0) % F.alt.length] };
      const order = ['situation', 'task', 'action', 'result'];
      const pool = F[ctx.stage] || F.situation;
      const text = pool[(ctx.turn || 0) % pool.length];
      return { stage: ctx.stage, text, next: order[Math.min(order.indexOf(ctx.stage) + 1, 3)] };
    },
    // 자소서/면접 질문에서 숨은 키워드 추출 + 경험 추천
    analyzeQuestion(text) {
      let kws = this.extractKeywords(text);
      const extra = { '갈등': '갈등조정', '주도': '주도성', '실패': '끈기', '새로운 기술': '학습능력', '고객': '고객지향', '사용자': '고객지향', '개선': '문제해결' };
      Object.keys(extra).forEach((w) => { if (text.includes(w) && !kws.includes(extra[w])) kws.push(extra[w]); });
      if (!kws.length) kws = ['문제해결', '협업'];
      kws = kws.slice(0, 3);
      const recs = state.experiences.map((e) => {
        const hit = e.keywords.filter((k) => kws.includes(k)).length;
        const score = Math.min(98, Math.round(hit * 30 + e.completeness * 0.35 + (e.status === 'done' ? 6 : 0)));
        return { exp: e, score, matched: e.keywords.filter((k) => kws.includes(k)) };
      }).filter((r) => r.matched.length).sort((a, b) => b.score - a.score);
      return { keywords: kws, recommendations: recs };
    },
    // 완성도: STAR 4칸 + 요약 + 키워드 + 결과 내 숫자 + 배운점
    completeness(e) {
      let s = 0;
      ['situation', 'task', 'action', 'result'].forEach((k) => { if (e.star && e.star[k] && e.star[k].trim()) s += 16; });
      if (e.summary) s += 8; if (e.keywords && e.keywords.length) s += 8;
      if (e.star && /\d/.test(e.star.result || '')) s += 6; if (e.insights) s += 6;
      return Math.min(100, s);
    },
    // 카드에서 비어 있는 부분을 채울 다음 질문
    gapQuestion(e) {
      const F = window.SEED.followups;
      for (const k of ['situation', 'task', 'action', 'result']) if (!e.star[k]) return { stage: k, text: F[k][0] };
      if (!/\d/.test(e.star.result)) return { stage: 'result', text: F.result[0] };
      if (!e.insights) return { stage: 'insight', text: '이 경험 이후 당신이 다르게 하게 된 것이 있나요?' };
      return null;
    },
    // 짧은 지연으로 AI 응답 흉내
    think(ms = 700) { return new Promise((r) => setTimeout(r, ms)); },
  };

  state.experiences.forEach((e) => { e.completeness = App.ai.completeness(e); });

  /* ---------------- UI helpers ---------------- */
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const STATUS = { draft: ['작성중', 'tag-draft'], done: ['완성', 'tag-done'], ongoing: ['진행중', 'tag-ongoing'] };

  App.ui = {
    esc,
    keywordChip(name, opts = {}) {
      const cls = ['kw', opts.size === 'lg' ? 'kw-lg' : '', opts.ai ? 'kw-ai' : '', opts.clickable ? 'clickable' : ''].join(' ');
      const x = opts.removable ? `<span class="x" data-remove-kw="${esc(name)}">×</span>` : '';
      return `<span class="${cls}" data-tone="${App.keywords.tone(name)}" data-kw="${esc(name)}">#${esc(name)}${x}</span>`;
    },
    statusTag(status) { const [t, c] = STATUS[status] || STATUS.draft; return `<span class="tag ${c}">${t}</span>`; },
    progress(pct) { return `<div class="progress"><span style="width:${pct}%"></span></div>`; },
    period(p) { if (!p || !p.start) return '기간 미입력'; return `${p.start.replace('-', '.')} ~ ${p.end ? p.end.replace('-', '.') : '진행중'}`; },
    // 경험 카드 요약 아이템. 클릭 시 상세로 이동
    expCard(e, opts = {}) {
      return `<div class="card exp-card" data-href="#/card/${e.id}">
        <div class="exp-card-top">${this.statusTag(e.status)}<span>${esc(e.category)}</span><span>·</span><span>${this.period(e.period)}</span></div>
        <div class="exp-card-title">${esc(e.title)}</div>
        ${opts.compact ? '' : `<div class="exp-card-sum">${esc(e.summary || '아직 요약이 없어요. 질문에 답하면 자동으로 채워져요.')}</div>`}
        <div class="exp-card-kws">${e.keywords.map((k) => this.keywordChip(k)).join('')}</div>
        <div class="exp-card-foot"><span>완성도 ${e.completeness}%</span>${this.progress(e.completeness)}</div>
      </div>`;
    },
    toast(msg) {
      const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg;
      document.getElementById('toast-root').appendChild(el); setTimeout(() => el.remove(), 2600);
    },
    // 서비스가 먼저 말 거는 푸시 알림 시뮬레이션
    pushToast(title, body, href) {
      const el = document.createElement('div'); el.className = 'toast push';
      el.innerHTML = `<div class="ai-dot">R</div><div><div class="t-title">${esc(title)}</div><div class="t-body">${esc(body)}</div></div>`;
      el.onclick = () => { if (href) App.navigate(href); el.remove(); };
      document.getElementById('toast-root').appendChild(el); setTimeout(() => el.remove(), 7000);
    },
    // modal({ title, body(html), confirmText, cancelText, danger, onConfirm })
    modal(o) {
      const root = document.getElementById('modal-root');
      root.innerHTML = `<div class="modal-backdrop"><div class="modal">
        <div class="modal-head">${esc(o.title || '')}</div><div class="modal-body">${o.body || ''}</div>
        <div class="modal-foot"><button class="btn" data-m="cancel">${esc(o.cancelText || '취소')}</button>
        <button class="btn ${o.danger ? 'btn-danger' : 'btn-primary'}" data-m="ok">${esc(o.confirmText || '확인')}</button></div></div></div>`;
      const close = () => { root.innerHTML = ''; };
      root.querySelector('[data-m=cancel]').onclick = close;
      root.querySelector('.modal-backdrop').onclick = (ev) => { if (ev.target.classList.contains('modal-backdrop')) close(); };
      root.querySelector('[data-m=ok]').onclick = () => { const r = o.onConfirm && o.onConfirm(root); if (r !== false) close(); };
    },
    closeModal() { document.getElementById('modal-root').innerHTML = ''; },
  };

  /* ---------------- Router ---------------- */
  // 화면 등록: App.screens.<name> = { title, layout?: 'shell'|'full', render(params) => html, mount?(root, params) => cleanupFn? }
  App.screens = App.screens || {};
  App.routes = [
    ['#/onboarding', 'onboarding'], ['#/home', 'home'], ['#/discover', 'discover'], ['#/daily', 'daily'],
    ['#/projects/:id', 'projects'], ['#/projects', 'projects'], ['#/vault', 'vault'], ['#/card/:id', 'card'],
    ['#/competency', 'competency'], ['#/match', 'match'], ['#/settings', 'settings'],
  ];
  App.navigate = (hash) => { if (location.hash === hash) window.dispatchEvent(new HashChangeEvent('hashchange')); else location.hash = hash; };
  App.matchRoute = function (hash) {
    const [path, qs] = (hash || '#/home').split('?');
    const query = Object.fromEntries(new URLSearchParams(qs || ''));
    for (const [pattern, name] of App.routes) {
      const pp = pattern.split('/'), hp = path.split('/');
      if (pp.length !== hp.length) continue;
      const params = {}; let ok = true;
      pp.forEach((seg, i) => { if (seg.startsWith(':')) params[seg.slice(1)] = decodeURIComponent(hp[i]); else if (seg !== hp[i]) ok = false; });
      if (ok) return { name, params: Object.assign(params, query) };
    }
    return { name: 'home', params: query };
  };
})(window.App);
