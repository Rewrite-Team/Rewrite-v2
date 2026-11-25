/* App core: store, router, ui helpers, mock AI. 모든 화면이 이 API만 사용한다. */
window.App = window.App || {};
(function (App) {
  // v13: 계정별 저장 · 휴지통 · 카드의 이력서 한 줄(resumeLine) · 자소서 여러 카드(expIds)와 본문(answer) · 지원 기업의 역량 맵 제거
  const dataKey = (accountId) => `rewrite-proto-v13:${accountId}`;
  const TRASH_DAYS = 30;
  const clone = (o) => JSON.parse(JSON.stringify(o));

  /* ---------------- Store ---------------- */
  const blank = (me) => ({ user: { name: (me && me.name) || '', email: (me && me.email) || '', targetJob: '', onboarded: false }, projects: [], experiences: [], chats: [], github: null, applications: [], resume: Object.assign(EMPTY_RESUME(), { profile: Object.assign(EMPTY_RESUME().profile, { name: (me && me.name) || '', email: (me && me.email) || '' }) }), trash: [] });
  let owner = null; // 지금 state 가 누구의 것인지 (다른 탭에서 계정이 바뀐 뒤 남의 저장소에 쓰지 않도록)
  function load() {
    const me = App.auth.current(); owner = me ? me.id : null;
    if (!me) return blank(null);
    let s = null;
    try { const raw = localStorage.getItem(dataKey(me.id)); if (raw) s = JSON.parse(raw); } catch (e) { /* ignore */ }
    if (!s && me.demo) { const d = clone(window.SEED); s = { user: Object.assign(d.user, { email: me.email }), projects: d.projects, experiences: d.experiences, chats: d.chats, github: d.github || null, applications: d.applications, resume: d.resume || EMPTY_RESUME(), trash: [] }; }
    if (!s) s = blank(me);
    s.trash = (s.trash || []).filter((t) => daysLeft(t) > 0); // 기간이 지난 휴지통 항목은 지운다
    return s;
  }
  function EMPTY_RESUME() { return { profile: { name: '', headline: '', email: '', phone: '', github: '', blog: '', intro: '' }, skills: [], entries: [], versions: [] }; }
  const listeners = new Set();
  function persist() { const me = App.auth.current(); if (!me || me.id !== owner) return; try { localStorage.setItem(dataKey(me.id), JSON.stringify(state)); } catch (e) { /* ignore */ } }
  function emit() { persist(); listeners.forEach((fn) => fn(state)); }
  // 날짜는 로컬 기준
  const pad2 = (n) => String(n).padStart(2, '0');
  const fmtDay = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const localDay = () => fmtDay(new Date());
  const today = localDay;
  const nowAt = () => { const d = new Date(); return `${fmtDay(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
  const parseDay = (s) => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y || 1970, (m || 1) - 1, d || 1); };
  const daysLeft = (t) => TRASH_DAYS - Math.floor((parseDay(today()) - parseDay(String(t.deletedAt).slice(0, 10))) / 86400000);
  let state = load();
  const uid = (p) => p + Math.random().toString(36).slice(2, 8);
  // 역량은 정해 둔 12개 안에서만 (없는 이름은 버린다)
  const cleanKw = (list) => [...new Set((list || []).filter((k) => window.SEED.keywords.some((x) => x.name === k)))];
  const EMPTY_STAR = () => ({ situation: '', task: '', action: '', result: '' });

  App.store = {
    get state() { return state; },
    projectName(p) { return (p && p.title) || ''; },
    // 로컬 날짜 도우미
    localDay, fmtDay, parseDay, nowAt,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    touch() { emit(); },
    dataKey,
    // 로그인·로그아웃한 뒤 그 계정의 데이터로 바꾼다
    switchAccount() { state = load(); this._dropRefs(); if (App.auth.current()) emit(); else listeners.forEach((fn) => fn(state)); },
    // 다른 탭에서 저장한 내용을 다시 읽는다 (저장하지 않음)
    reload() { state = load(); this._dropRefs(); },
    reset() { const me = App.auth.current(); if (me) { try { localStorage.removeItem(dataKey(me.id)); } catch (e) {} } state = load(); if (me && !me.demo) state.user.onboarded = true; emit(); },

    // ---------------- 경험 카드 (projectId 필수) ----------------
    // AI 대화(applyProposal) 또는 GitHub 레포 분석(addGithubCards)으로만 만들어지고 고쳐진다. 사용자가 직접 쓰는 칸은 이력서 한 줄(setResumeLine)과 회고(setRetrospect)
    list() { return state.experiences.slice().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')); },
    get(id) { return state.experiences.find((e) => e.id === id) || null; },
    cardsOf(projectId) { return this.list().filter((e) => e.projectId === projectId); },
    create(partial = {}) {
      const p = this.getProject(partial.projectId); if (!p) return null; // 카드는 반드시 프로젝트 안에
      const exp = Object.assign({
        id: uid('e'), projectId: null, title: '제목 없는 카드', period: clone(p.period || { start: '', end: '' }), role: p.role || '', summary: '',
        star: EMPTY_STAR(), resumeLine: '', retrospect: '', keywords: [], source: 'chat', evidence: null, chatIds: [], createdAt: today(), updatedAt: today(),
      }, clone(partial));
      exp.star = Object.assign(EMPTY_STAR(), exp.star); exp.keywords = cleanKw(exp.keywords);
        if (!exp.resumeLine && App.ai.starFilled(exp)) exp.resumeLine = App.ai.resumeLine(exp);
      state.experiences.push(exp); p.updatedAt = today();
      emit(); return exp;
    },
    // 회고: 사용자가 직접 쓰는 글. AI 는 읽어서 고치지 않는다
    setRetrospect(id, text) { const e = this.get(id); if (!e) return null; e.retrospect = String(text || '').trim(); emit(); return e; },
    // 이력서 한 줄: 사용자가 고치면 그대로 남는다. 마스터 이력서에 담긴(직접 고치지 않은) 줄도 같이 바뀐다
    setResumeLine(id, text) {
      const e = this.get(id); if (!e) return null;
      if (!e.resumeLineEdited) e.aiLine = e.resumeLine; // 되돌릴 AI 문장
      e.resumeLine = String(text || '').trim().replace(/\s+/g, ' '); e.resumeLineEdited = true; this._syncLine(e); emit(); return e;
    },
    _syncLine(e) { if (e.resumeLine) state.resume.entries.forEach((en) => en.bullets.forEach((b) => { if (b.source && b.source.type === 'card' && b.source.expId === e.id && !b.edited) b.text = e.resumeLine; })); },
    // 경험 카드를 휴지통으로
    remove(id) { const e = this.get(id); if (!e) return null; state.experiences = state.experiences.filter((x) => x.id !== id); return this._toTrash('card', e.title, e.projectId, { experiences: [e] }); },
    // 완전히 지워진 카드를 가리키던 채팅·지원 기업 연결을 푼다 (휴지통에 있는 카드는 되살릴 수 있으므로 남겨 둔다)
    _dropRefs() {
      const kept = new Set(state.trash.flatMap((t) => (t.data.experiences || []).map((e) => e.id)));
      const ok = (id) => kept.has(id) || state.experiences.some((e) => e.id === id);
      const chats = state.chats.concat(state.trash.flatMap((t) => t.data.chats || []));
      const apps = state.applications.concat(state.trash.flatMap((t) => t.data.applications || []));
      chats.forEach((c) => { if (c.cardId && !ok(c.cardId)) c.cardId = null; });
      apps.forEach((a) => {
        (a.essays || []).forEach((q) => { q.expIds = (q.expIds || []).filter(ok); });
        (a.interview || []).forEach((q) => { if (q.expId && !ok(q.expId)) q.expId = null; });
      });
    },

    // ---------------- 휴지통 ----------------
    // state.trash = [{ id, type:'project'|'chat'|'card'|'app', title, projectId, deletedAt, data:{ projects?, chats?, experiences?, applications? } }]
    // 프로젝트를 버리면 그 안의 채팅·경험 카드가 한 묶음으로 들어간다. 30일이 지나면 저절로 지워진다
    TRASH_DAYS, daysLeft,
    trash() { return state.trash.slice().reverse().sort((a, b) => b.deletedAt.localeCompare(a.deletedAt)); },
    getTrash(id) { return state.trash.find((t) => t.id === id) || null; },
    _toTrash(type, title, projectId, data) { const t = { id: uid('t'), type, title, projectId: projectId || null, deletedAt: nowAt(), data: clone(data) }; state.trash.push(t); emit(); return t; },
    // 되살리기. 속한 프로젝트도 휴지통에 있으면 함께 되살린다 → { hash: 되살린 것의 주소, withProject: 함께 되살린 프로젝트 이름 }
    restore(id) {
      const t = this.getTrash(id); if (!t) return null; let withProject = '';
      if (t.type !== 'project' && t.projectId && !this.getProject(t.projectId)) {
        const pt = state.trash.find((x) => x.type === 'project' && x.projectId === t.projectId); if (!pt) return null;
        this.restore(pt.id); withProject = pt.title;
      }
      const d = t.data;
      (d.projects || []).forEach((p) => { p.repos = (p.repos || []).filter((r) => !this.projectOfRepo(r.owner, r.name)); state.projects.push(p); });
      state.chats.push(...(d.chats || [])); state.experiences.push(...(d.experiences || [])); state.applications.push(...(d.applications || []));
      state.trash = state.trash.filter((x) => x.id !== id); emit();
      const one = { project: () => '#/vault/p/' + d.projects[0].id, chat: () => '#/chat/' + d.chats[0].id, card: () => '#/card/' + d.experiences[0].id, app: () => '#/apply/' + d.applications[0].id }[t.type]();
      return { hash: one, withProject };
    },
    // 완전 삭제. 프로젝트를 완전히 지우면 그 프로젝트에서 따로 버린 채팅·카드도 함께 지운다
    purge(id) {
      const t = this.getTrash(id); if (!t) return;
      state.trash = state.trash.filter((x) => x.id !== id && !(t.type === 'project' && x.projectId === t.projectId));
      this._dropRefs(); emit();
    },
    emptyTrash() { state.trash = []; this._dropRefs(); emit(); },

    // ---------------- 프로젝트 (해커톤·팀과제·알바·스터디도 모두 프로젝트). status: ongoing | done ----------------
    projects() { return state.projects.slice().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')); },
    getProject(id) { return state.projects.find((p) => p.id === id) || null; },
    createProject(partial = {}) {
      const p = Object.assign({
        id: uid('p'), title: '', period: { start: '', end: '' }, status: 'ongoing', role: '', summary: '', repos: [], createdAt: today(), updatedAt: today(),
      }, clone(partial));
      state.projects.push(p); emit(); return p;
    },
    updateProject(id, patch) { const p = this.getProject(id); if (!p) return null; Object.assign(p, clone(patch), { updatedAt: today() }); emit(); return p; },
    // 프로젝트를 휴지통으로 (그 안의 채팅·경험 카드까지 한 묶음)
    removeProject(id) {
      const p = this.getProject(id); if (!p) return null;
      const mine = (x) => x.projectId === id;
      const data = { projects: [p], chats: state.chats.filter(mine), experiences: state.experiences.filter(mine) };
      state.projects = state.projects.filter((x) => x.id !== id); state.chats = state.chats.filter((x) => !mine(x)); state.experiences = state.experiences.filter((x) => !mine(x));
      return this._toTrash('project', p.title, id, data);
    },

    // ---------------- 채팅 (프로젝트 안의 대화방, 프로젝트마다 여러 개) ----------------
    // chat = { id, projectId, title, cardId, msgs:[{ id, who:'ai'|'me', text, at, kind?:'proposal', proposal? }], createdAt, updatedAt }
    chats() { return state.chats.slice().reverse().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')); },
    chatsOf(projectId) { return this.chats().filter((c) => c.projectId === projectId); },
    getChat(id) { return state.chats.find((c) => c.id === id) || null; },
    createChat(partial = {}) {
      const c = Object.assign({ id: uid('c'), projectId: null, title: '새 채팅', cardId: null, msgs: [], createdAt: nowAt(), updatedAt: nowAt() }, clone(partial));
      state.chats.push(c); emit(); return c;
    },
    updateChat(id, patch) { const c = this.getChat(id); if (!c) return null; Object.assign(c, clone(patch)); emit(); return c; },
    removeChat(id) { const c = this.getChat(id); if (!c) return null; state.chats = state.chats.filter((x) => x.id !== id); return this._toTrash('chat', c.title, c.projectId, { chats: [c] }); },
    addMsg(chatId, msg) {
      const c = this.getChat(chatId); if (!c) return null;
      const m = Object.assign({ id: uid('m'), who: 'ai', text: '', at: nowAt() }, clone(msg));
      c.msgs.push(m); c.updatedAt = m.at; emit(); return m;
    },
    updateMsg(chatId, msgId, patch) { const c = this.getChat(chatId); const m = c && c.msgs.find((x) => x.id === msgId); if (!m) return null; Object.assign(m, clone(patch)); emit(); return m; },
    /* AI 정리 제안을 반영: 새 경험 카드를 만들거나 기존 카드를 고친다 (결과는 항상 카드).
       proposal = { mode:'new'|'update', cardId, title, changes, keywords, resumeLine?, status:'pending'|'applied'|'undone', fixed? }
       change   = { field, add } 지금 카드 내용 뒤에 덧붙임 | { field, after } 통째로 바꿈 (사용자가 말로 고쳐 달라고 한 경우, fixed)
       덧붙이기는 반영하는 시점의 카드 내용에 더하므로, 그사이 다른 채팅에서 고친 내용을 덮어쓰지 않는다 */
    applyProposal(chatId, msgId) {
      const c = this.getChat(chatId); const m = c && c.msgs.find((x) => x.id === msgId); if (!m || !m.proposal || m.proposal.status === 'applied') return null;
      const pr = m.proposal; let e;
      const changes = pr.changes.filter((ch) => String(ch.after || ch.add || '').trim());
      const join = (cur, add) => (cur && cur.trim() ? (cur.includes(add.trim()) ? cur : `${cur.trim()} ${add.trim()}`) : add.trim());
      const put = (t) => changes.forEach((ch) => {
        const o = ch.field in EMPTY_STAR() ? t.star : ['summary', 'role', 'title'].includes(ch.field) ? t : null; if (!o) return;
        o[ch.field] = ch.add != null ? join(o[ch.field], ch.add) : ch.after;
      });
      if (pr.mode === 'update') {
        e = this.get(pr.cardId); if (!e) return null; // 그사이 지운 카드
        if (!changes.length && JSON.stringify(cleanKw(pr.keywords)) === JSON.stringify(e.keywords)) return null;
        pr.snap = clone(e); put(e); e.keywords = cleanKw(pr.keywords); e.updatedAt = today();
        if (!pr.fixed && !e.resumeLineEdited) { e.resumeLine = (pr.resumeLine || '').trim() || App.ai.resumeLine(e); this._syncLine(e); }
      } else {
        if (!changes.some((ch) => ch.field in EMPTY_STAR())) return null; // 빈 카드는 만들지 않는다
        e = this.create(Object.assign({ projectId: c.projectId, title: pr.title, keywords: pr.keywords }, pr.keepId ? { id: pr.keepId } : {})); if (!e) return null;
        pr.snap = null; put(e);
        if (!e.summary) e.summary = App.ai.brief(e.star.action || e.star.situation || e.star.result || '', 80);
        e.resumeLine = (pr.resumeLine || '').trim() || App.ai.resumeLine(e);
        if (pr.keepRetro) { e.retrospect = pr.keepRetro; pr.keepRetro = ''; }
        // 되돌렸다가 다시 반영하면 이 카드를 쓰던 자소서·면접 연결도 되살린다
        (pr.keepRefs || []).forEach((x) => { const a = this.getApp(x.app); const q = a && a[x.list].find((y) => y.id === x.item); if (!q) return; if (x.list === 'essays') { if (!q.expIds.includes(e.id)) q.expIds.push(e.id); } else if (!q.expId) q.expId = e.id; });
        pr.keepRefs = [];
        pr.cardId = e.id;
      }
      if (!e.chatIds.includes(c.id)) e.chatIds.push(c.id);
      pr.prevCardId = c.cardId; c.cardId = e.id; pr.status = 'applied'; pr.appliedAt = e.rev = uid('r');
      const p = this.getProject(c.projectId); if (p) p.updatedAt = today();
      emit(); return e;
    },
    // 되돌리기는 그 카드에 마지막으로 반영된 제안만 (e.rev 로 확인). 사용자가 쓴 회고는 지우지 않는다
    canUndo(pr) { const e = pr && pr.status === 'applied' && pr.appliedAt && this.get(pr.cardId); return !!e && e.rev === pr.appliedAt; },
    undoProposal(chatId, msgId) {
      const c = this.getChat(chatId); const m = c && c.msgs.find((x) => x.id === msgId); if (!m || !this.canUndo(m.proposal)) return false;
      const pr = m.proposal; const i = state.experiences.findIndex((e) => e.id === pr.cardId); const cur = state.experiences[i]; const retro = cur.retrospect;
      if (pr.snap) state.experiences[i] = Object.assign(clone(pr.snap), { retrospect: retro }, cur.resumeLineEdited ? { resumeLine: cur.resumeLine, resumeLineEdited: true } : {});
      else {
        pr.keepRetro = retro; pr.keepId = cur.id; pr.keepRefs = [];
        state.applications.forEach((a) => { a.essays.forEach((q) => { if ((q.expIds || []).includes(cur.id)) pr.keepRefs.push({ app: a.id, list: 'essays', item: q.id }); }); a.interview.forEach((q) => { if (q.expId === cur.id) pr.keepRefs.push({ app: a.id, list: 'interview', item: q.id }); }); });
        state.experiences.splice(i, 1); pr.cardId = null;
      }
      c.cardId = pr.prevCardId || null; pr.status = 'undone'; if (pr.snap) this._syncLine(state.experiences[i]); this._dropRefs(); emit(); return true;
    },

    // ---------------- GitHub ----------------
    // state.github = { login, name, url, source:'github'|'sample', fetchedAt, owners:[{ login, type:'user'|'org', name, projects:[{ number, title, url }], repos:[{ owner, name, url, description, language, pushedAt, fork }] }] } | null
    github() { return state.github; },
    setGithub(account) { state.github = account ? clone(account) : null; emit(); return state.github; },
    // 이 레포를 연결한 프로젝트
    projectOfRepo(owner, name) { const k = `${owner}/${name}`.toLowerCase(); return state.projects.find((p) => (p.repos || []).some((r) => `${r.owner}/${r.name}`.toLowerCase() === k)) || null; },
    // repo = { owner, name, url, branch, analyzedAt, commits, prs }
    linkRepo(projectId, repo) {
      const p = this.getProject(projectId); if (!p) return null;
      const k = `${repo.owner}/${repo.name}`.toLowerCase();
      state.projects.forEach((x) => { if (x.id !== projectId) x.repos = (x.repos || []).filter((r) => `${r.owner}/${r.name}`.toLowerCase() !== k); });
      p.repos = p.repos || []; const cur = p.repos.find((r) => `${r.owner}/${r.name}`.toLowerCase() === k);
      if (cur) Object.assign(cur, clone(repo)); else p.repos.push(clone(repo));
      p.updatedAt = today(); emit(); return p;
    },
    unlinkRepo(projectId, owner, name) {
      const p = this.getProject(projectId); if (!p) return null; const k = `${owner}/${name}`.toLowerCase();
      p.repos = (p.repos || []).filter((r) => `${r.owner}/${r.name}`.toLowerCase() !== k); emit(); return p;
    },
    // GitHub 레포로 프로젝트 만들기: 이름은 레포 이름 그대로. 이미 이 레포를 연결한 프로젝트가 있으면 그 프로젝트를 돌려준다
    createProjectFromRepo(repo) {
      const cur = this.projectOfRepo(repo.owner, repo.name); if (cur) return cur;
      const p = this.createProject({ title: repo.name, summary: repo.description || '' });
      this.linkRepo(p.id, { owner: repo.owner, name: repo.name, url: repo.url, branch: repo.branch || '' });
      return this.getProject(p.id);
    },
    // 레포 분석 결과(STAR 초안) → 경험 카드. drafts: [{ key, title, summary, star, keywords, period?, role?, evidence }]. key 가 같은 카드가 이미 있으면 건너뛴다
    addGithubCards(projectId, drafts) {
      // 같은 작업으로 만든 카드가 휴지통에 있으면 새로 만들지 않고 되살린다
      const made = drafts.filter((d) => !this.cardByKey(d.key)).map((d) => {
        const t = state.trash.find((x) => x.type === 'card' && x.projectId === projectId && x.data.experiences.some((e) => e.key === d.key || ((e.evidence || {}).keys || []).includes(d.key)));
        if (t) { this.restore(t.id); return this.get(t.data.experiences[0].id); }
        const { trashed, ...draft } = d; return this.create(Object.assign(draft, { projectId, source: 'github' }));
      }).filter(Boolean);
      // 기간을 비워 둔 프로젝트는 카드의 기간으로 채운다. 마지막 작업이 두 달보다 오래됐으면 끝난 프로젝트
      const p = this.getProject(projectId);
      if (p && made.length && !(p.period && p.period.start)) {
        const ms = made.map((e) => e.period).filter((x) => x && x.start); const starts = ms.map((m) => m.start).sort(); const last = ms.map((m) => m.end || m.start).sort().pop() || '';
        const d = new Date(); d.setMonth(d.getMonth() - 2); const old = last && last < fmtDay(d).slice(0, 7);
        this.updateProject(projectId, { period: { start: starts[0] || '', end: old ? last : '' }, status: old ? 'done' : 'ongoing' });
      }
      return made;
    },
    cardByKey(key) { return (key && state.experiences.find((e) => e.key === key || (e.evidence && (e.evidence.keys || []).includes(key)))) || null; },

    // 지원 기업 (기업 + 직무 단위로 자소서·면접 준비를 따로 관리)
    // essay = { id, text, limit, keywords, expIds:[고른 경험 카드], answer:'자소서 본문', note } · interview = { id, text, keywords, source, expId, note, checked }
    // status: preparing(지원 준비중) | applied(지원 완료) | passed(합격) | failed(불합격)
    // rank: 같은 상태 칸 안에서 사용자가 끌어다 정한 순서
    apps() {
      const order = { preparing: 0, applied: 1, passed: 2, failed: 3 };
      const rk = (a) => (typeof a.rank === 'number' ? a.rank : 999);
      return state.applications.slice().sort((a, b) => ((order[a.status] ?? 9) - (order[b.status] ?? 9)) || (rk(a) - rk(b)) || (a.deadline || '9999').localeCompare(b.deadline || '9999'));
    },
    // 아직 결과가 나지 않은(준비·진행 중인) 지원 기업
    activeApps() { return this.apps().filter((a) => a.status === 'preparing' || a.status === 'applied'); },
    // 보드에서 끌어 옮기기: status 변경 + 그 칸의 순서(orderIds) 저장
    moveApp(id, status, orderIds) {
      const a = this.getApp(id); if (!a) return;
      a.status = status; a.updatedAt = today();
      (orderIds || []).forEach((x, i) => { const t = this.getApp(x); if (t) t.rank = i; });
      emit();
    },
    getApp(id) { return state.applications.find((a) => a.id === id) || null; },
    _cleanApp(a) { ['essays', 'interview'].forEach((k) => (a[k] || []).forEach((q) => { q.keywords = cleanKw(q.keywords); })); return a; },
    createApp(partial = {}) {
      const app = Object.assign({
        id: uid('a'), company: '', job: '', status: 'preparing', deadline: '', url: '', jdText: '',
        essays: [], interview: [], memo: '', createdAt: today(), updatedAt: today(),
      }, clone(partial));
      state.applications.push(this._cleanApp(app)); emit(); return app;
    },
    updateApp(id, patch) { const a = this.getApp(id); if (!a) return null; this._cleanApp(Object.assign(a, clone(patch), { updatedAt: today() })); emit(); return a; },
    removeApp(id) { const a = this.getApp(id); if (!a) return null; state.applications = state.applications.filter((x) => x.id !== id); return this._toTrash('app', a.company, null, { applications: [a] }); },
    // list: 'essays' | 'interview'
    addAppItem(appId, list, item) {
      const a = this.getApp(appId); if (!a) return null;
      const it = Object.assign({ id: uid(list === 'essays' ? 'q' : 'i') }, clone(item));
      a[list].push(it); this._cleanApp(a); a.updatedAt = today(); emit(); return it;
    },
    updateAppItem(appId, list, itemId, patch) {
      const a = this.getApp(appId); if (!a) return null;
      const it = a[list].find((x) => x.id === itemId); if (!it) return null;
      Object.assign(it, clone(patch)); this._cleanApp(a); a.updatedAt = today(); emit(); return it;
    },
    removeAppItem(appId, list, itemId) {
      const a = this.getApp(appId); if (!a) return;
      a[list] = a[list].filter((x) => x.id !== itemId); a.updatedAt = today(); emit();
    },
    // ---------------- 마스터 이력서 (state.resume) ----------------
    // 이력서에 쓸 수 있는 모든 재료가 쌓이는 곳. included=true 인 것만 '현재 이력서'에 보인다.
    // entry = { id, section:'project'|'career'|'activity'|'education'|'award', title, org, period:{start,end}, role, projectId?, included, order, bullets:[Bullet] }
    // Bullet = { id, text, edited?(이력서에서 직접 고침), included, addedAt, source:{ type:'card'|'manual', projectId?, expId? } }
    // skill = { id, name, group:'언어'|'프레임워크·라이브러리'|'DB·인프라'|'도구·협업', included, source? }
    // version = { id, name, note, savedAt, snapshot:{profile,skills,entries} }
    resume() { return state.resume; },
    resumeBullets() { return state.resume.entries.flatMap((e) => e.bullets.map((b) => Object.assign({ entryId: e.id }, b))); },
    updateResumeProfile(patch) { Object.assign(state.resume.profile, clone(patch)); emit(); },
    resumeEntry(id) { return state.resume.entries.find((e) => e.id === id) || null; },
    addResumeEntry(partial = {}) {
      const e = Object.assign({ id: uid('re'), section: 'project', title: '', org: '', period: { start: '', end: '' }, role: '', projectId: null, included: true, order: state.resume.entries.length, bullets: [] }, clone(partial));
      state.resume.entries.push(e); emit(); return e;
    },
    updateResumeEntry(id, patch) { const e = this.resumeEntry(id); if (!e) return null; Object.assign(e, clone(patch)); emit(); return e; },
    removeResumeEntry(id) {
      const e = this.resumeEntry(id); if (!e) return;
      state.resume.entries = state.resume.entries.filter((x) => x.id !== id); emit();
    },
    reorderResumeEntries(orderIds) { orderIds.forEach((id, i) => { const e = this.resumeEntry(id); if (e) e.order = i; }); emit(); },
    // items: [{ text, source }] → 이력서 항목에 bullet 으로 추가. 같은 경험 카드(expId)는 중복 추가하지 않는다
    addResumeBullets(entryId, items) {
      const e = this.resumeEntry(entryId); if (!e) return null;
      items.forEach((it) => {
        const src = clone(it.source || { type: 'manual' });
        if (src.expId && e.bullets.some((b) => b.source && b.source.expId === src.expId)) return;
        e.bullets.push({ id: uid('rb'), text: it.text, included: it.included !== false, addedAt: localDay(), source: src });
      });
      emit(); return e;
    },
    updateResumeBullet(entryId, bulletId, patch) {
      const e = this.resumeEntry(entryId); const b = e && e.bullets.find((x) => x.id === bulletId); if (!b) return null;
      Object.assign(b, clone(patch)); emit(); return b;
    },
    removeResumeBullet(entryId, bulletId) {
      const e = this.resumeEntry(entryId); if (!e) return;
      e.bullets = e.bullets.filter((x) => x.id !== bulletId); emit();
    },
    reorderResumeBullets(entryId, orderIds) {
      const e = this.resumeEntry(entryId); if (!e) return;
      e.bullets.sort((a, b) => orderIds.indexOf(a.id) - orderIds.indexOf(b.id)); emit();
    },
    skillGroup(name) {
      const n = String(name).toLowerCase();
      if (/^(java|kotlin|javascript|typescript|python|go|c\+\+|c#|c|rust|swift|sql)$/.test(n)) return '언어';
      if (/(mysql|postgres|redis|mongo|docker|kubernetes|aws|gcp|nginx|kafka|elastic|github actions|jenkins|h2|sqlite|firebase)/.test(n)) return 'DB·인프라';
      if (/(git|jira|notion|slack|figma|swagger|postman|junit|jest)/.test(n)) return '도구·협업';
      return '프레임워크·라이브러리';
    },
    addSkill(partial) { const s = Object.assign({ id: uid('rs'), name: '', group: '프레임워크·라이브러리', included: true, source: { type: 'manual' } }, clone(partial)); state.resume.skills.push(s); emit(); return s; },
    updateSkill(id, patch) { const s = state.resume.skills.find((x) => x.id === id); if (!s) return; Object.assign(s, clone(patch)); emit(); },
    removeSkill(id) { state.resume.skills = state.resume.skills.filter((x) => x.id !== id); emit(); },
    // 버전: 현재 이력서(포함 상태 포함) 스냅숏
    saveResumeVersion(name, note = '') {
      const r = state.resume;
      const v = { id: uid('rv'), name: name || `버전 ${r.versions.length + 1}`, note, savedAt: localDay(), snapshot: clone({ profile: r.profile, skills: r.skills, entries: r.entries }) };
      r.versions.unshift(v); emit(); return v;
    },
    restoreResumeVersion(id) {
      const r = state.resume; const v = r.versions.find((x) => x.id === id); if (!v) return;
      Object.assign(r, clone(v.snapshot));
      emit();
    },
    removeResumeVersion(id) { state.resume.versions = state.resume.versions.filter((x) => x.id !== id); emit(); },

    // 사용자
    updateUser(patch) { Object.assign(state.user, patch); if (patch.name) App.auth.rename(patch.name); emit(); },
  };

  App.store._dropRefs();

  /* ---------------- Keywords ---------------- */
  // 역량 카테고리 12개 고정 (window.SEED.keywords). 새로 만들 수 없다
  App.keywords = {
    all() { return window.SEED.keywords; },
    names() { return window.SEED.keywords.map((k) => k.name); },
    has(name) { return window.SEED.keywords.some((k) => k.name === name); },
    clean: cleanKw,
    get(name) { return window.SEED.keywords.find((k) => k.name === name) || { name, tone: 'gray', desc: '', hints: [] }; },
    tone(name) { return this.get(name).tone; },
  };

  /* ---------------- Mock AI ---------------- */
  App.ai = {
    // 텍스트에서 역량 키워드 추출 (힌트 단어 매칭)
    extractKeywords(text) {
      const found = [];
      window.SEED.keywords.forEach((k) => { if (k.hints.some((h) => text.includes(h))) found.push(k.name); });
      return found.slice(0, 3);
    },
    // 자소서/면접 질문 → 핵심 역량 1~3개
    questionKeywords(text) {
      const kws = this.extractKeywords(text);
      const extra = { '갈등': '커뮤니케이션', '주도': '추진력', '실패': '도전정신', '새로운 기술': '학습능력', '고객': '기획력', '사용자': '기획력', '개선': '문제 해결력', '협업': '협업능력', '도전': '도전정신', '창의': '창의력' };
      Object.keys(extra).forEach((w) => { if (text.includes(w) && !kws.includes(extra[w])) kws.push(extra[w]); });
      return cleanKw(kws.length ? kws : ['문제 해결력', '협업능력']).slice(0, 3);
    },
    // 핵심 역량에 맞는 모든 경험 카드 (맞는 역량이 많은 순 → STAR 가 잘 채워진 순) [{ exp, matched:[역량] }]
    cardsFor(keywords) {
      return this.rankCards(state.experiences).map((exp) => ({ exp, matched: exp.keywords.filter((k) => (keywords || []).includes(k)) }))
        .filter((r) => r.matched.length).sort((a, b) => b.matched.length - a.matched.length);
    },
    // 경험 카드 → 이력서 한 줄 (essay-writer.js 가 제공한다)
    resumeLine(exp) { return exp.summary || exp.title; },
    // 채워진 STAR 칸 수 (0~4)
    starFilled(e) { return ['situation', 'task', 'action', 'result'].filter((k) => (e.star || {})[k]).length; },
    // 대표 카드 순서: STAR 가 더 채워지고 결과에 수치가 있는 카드 먼저, 같으면 최근 수정순
    rankCards(list) {
      const n = (e) => this.starFilled(e) + (/\d/.test((e.star || {}).result || '') ? 0.5 : 0);
      return list.slice().sort((a, b) => n(b) - n(a) || String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
    },
    // 문장을 max 자 안쪽으로 짧게
    brief(t, max = 60) {
      const s = String(t || '').trim().replace(/\s+/g, ' '); if (s.length <= max) return s;
      const first = s.split(/(?<=[.!?。])\s+/)[0]; return first.length <= max ? first : first.slice(0, max) + '…';
    },
    // 채용공고(JD) 텍스트 → 요구 역량 [{ name, weight(1~3), reason }]
    analyzeJD(text) {
      const t = String(text || '');
      const extra = {
        '트래픽': '문제 해결력', '장애': '문제 해결력', '안정': '실행력', '품질': '실행력', '코드 리뷰': '협업능력', '리뷰': '커뮤니케이션', '협업': '협업능력',
        '유관 부서': '커뮤니케이션', '이해관계자': '커뮤니케이션', '빠르게': '학습능력', '성장': '도전정신', '신기술': '학습능력', '도전': '도전정신',
        '오너십': '추진력', '주인의식': '추진력', '능동': '추진력', '지표': '분석적 사고', '로그': '분석적 사고', '고객': '기획력', '사용자': '기획력', '기획': '기획력',
        '설계': '의사결정 능력', '아키텍처': '의사결정 능력', '리딩': '리더십', '아이디어': '창의력',
      };
      const score = {}; const why = {};
      const sentences = t.split(/[\n.·•]/).map((x) => x.trim()).filter(Boolean);
      sentences.forEach((sen) => {
        const found = new Set(this.extractKeywords(sen));
        Object.keys(extra).forEach((w) => { if (sen.includes(w)) found.add(extra[w]); });
        found.forEach((k) => { score[k] = (score[k] || 0) + 1; if (!why[k]) why[k] = sen.length > 48 ? sen.slice(0, 48) + '…' : sen; });
      });
      let list = Object.keys(score).map((k) => ({ name: k, weight: Math.min(3, score[k]), reason: why[k] }));
      if (!list.length) list = [{ name: '문제 해결력', weight: 2, reason: '' }, { name: '협업능력', weight: 2, reason: '' }];
      return list.sort((a, b) => b.weight - a.weight).slice(0, 6);
    },
    // 자소서 문항을 다 썼는가: 본문이 있고, AI 가 비워 둔 [ ] 가 남아 있지 않고, 글자 수를 넘지 않는다
    essayDone(q) {
      const t = String(q.answer || '').trim(); if (!t || (q.limit && t.length > q.limit)) return false;
      return !(((q.gen && q.gen.text) || '').match(/\[[^[\]\n]+\]/g) || []).some((s) => t.includes(s));
    },
    // 지원 기업 준비도: 다 쓴 자소서 문항 비율과 준비를 마친 면접 질문 비율의 평균
    readiness(app) {
      const essays = app.essays || []; const iv = app.interview || [];
      const essaysDone = essays.filter((q) => this.essayDone(q)).length; const ivDone = iv.filter((q) => q.checked).length;
      const ratio = (done, total) => (total ? done / total : 0);
      return { score: Math.round((ratio(essaysDone, essays.length) + ratio(ivDone, iv.length)) / 2 * 100), essaysDone, essaysTotal: essays.length, interviewDone: ivDone, interviewTotal: iv.length };
    },
    // 지원 기업별 예상 면접 질문 생성 [{ text, keywords, source: 'competency'|'essay'|'common', expId }]
    interviewSuggestions(app) {
      const out = [];
      out.push({ text: `${app.company}에 지원한 이유는 무엇인가요?`, keywords: [], source: 'common', expId: null });
      out.push({ text: '1분 자기소개를 해 주세요.', keywords: [], source: 'common', expId: null });
      if (String(app.jdText || '').trim()) this.analyzeJD(app.jdText).slice(0, 4).forEach((c) => {
        const k = App.keywords.get(c.name);
        out.push({ text: `${k.desc.replace(/ 경험$/, '')} 경험을 구체적으로 말씀해 주세요.`, keywords: [c.name], source: 'competency', expId: null });
      });
      (app.essays || []).forEach((q) => (q.expIds || []).forEach((id) => {
        const e = state.experiences.find((x) => x.id === id); if (!e) return;
        out.push({ text: `자소서에 쓴 「${e.title.split(' — ')[0]}」에서 다른 선택지는 없었나요? 왜 그 방법을 택했나요?`, keywords: q.keywords || [], source: 'essay', expId: e.id });
        if (!/\d/.test(e.star.result || '')) out.push({ text: `「${e.title.split(' — ')[0]}」의 결과를 수치로 설명할 수 있나요?`, keywords: q.keywords || [], source: 'essay', expId: e.id });
      }));
      return out;
    },
    // 경험 카드를 짧은 STAR 문장으로 (답변 카드·개요용)
    starBrief(e) {
      const first = (t, max) => {
        const s = String(t || '').trim(); if (!s) return '';
        const parts = s.split(/(?<=[.!?。])\s+/); let o = parts[0];
        for (let i = 1; i < parts.length && (o + ' ' + parts[i]).length <= max; i++) o += ' ' + parts[i];
        return o.length > max + 30 ? o.slice(0, max) + '…' : o;
      };
      const st = e.star || {};
      return { situation: first([st.situation, st.task].filter(Boolean).join(' '), 70), action: first(st.action, 90), result: first(st.result, 70) };
    },
    // 짧은 지연으로 AI 응답 흉내
    think(ms = 700) { return new Promise((r) => setTimeout(r, ms)); },
  };

  /* ---------------- UI helpers ---------------- */
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // 프로젝트 상태 태그 (진행중 / 완료)
  
  App.ui = {
    esc,
    keywordChip(name, matched) { return `<span class="kw${matched ? ' is-match' : ''}" data-kw="${esc(name)}">${esc(name)}</span>`; },
    // 끝난 프로젝트는 기간이 말해 준다. 진행중일 때만 표시한다
    statusTag(status) { return status === 'done' ? '' : '<span class="tag tag-ongoing">진행중</span>'; },
    progress(pct) { return `<div class="progress"><span style="width:${pct}%"></span></div>`; },
    period(p) { if (!p || !p.start) return '기간 미입력'; if (p.end === p.start) return p.start.replace('-', '.'); return `${p.start.replace('-', '.')} ~ ${p.end ? p.end.replace('-', '.') : '진행중'}`; },
    date(s) { const d = parseDay(String(s || '').slice(0, 10)); return s ? `${d.getMonth() + 1}월 ${d.getDate()}일` : ''; },
    // 어느 프로젝트의 카드인지 — 경험 카드가 보이는 모든 곳에 붙인다. opts.link 면 프로젝트로 가는 링크
    projChip(projectId, opts = {}) {
      const p = App.store.getProject(projectId); const pt = p ? null : App.store.trash().find((t) => t.type === 'project' && t.projectId === projectId); const name = p ? p.title : pt ? pt.title : '지워진 프로젝트';
      return opts.link && p ? `<a class="proj-chip" href="#/vault/p/${encodeURIComponent(p.id)}">${App.icon('folder', 15)}<span>${esc(name)}</span></a>` : `<span class="proj-chip">${App.icon('folder', 15)}<span>${esc(name)}</span></span>`;
    },
    // 휴지통에 있는 경험 카드 (없으면 null)
    trashedCard(id) { for (const t of App.store.trash()) { const e = (t.data.experiences || []).find((x) => x.id === id); if (e) return e; } return null; },
    // 휴지통에 있는 카드를 가리킬 때: 어느 프로젝트의 어떤 카드였는지까지
    goneCard(id) { const e = this.trashedCard(id); return e ? `${this.projChip(e.projectId)}<span>${esc(e.title)} (휴지통)</span>` : '<span>지워진 카드</span>'; },
    // 경험 카드 요약 아이템. 클릭 시 상세로 이동. opts: { compact, matched:[강조할 역량] }
    expCard(e, opts = {}) {
      return `<article class="card exp-card" data-href="#/card/${e.id}">
        <div class="exp-card-top">${this.projChip(e.projectId)}<span class="exp-card-period">${esc(this.period(e.period))}</span>${e.source === 'github' ? `<span class="exp-src">${App.icon('github', 15)}GitHub</span>` : ''}</div>
        <a class="exp-card-title" href="#/card/${e.id}"><span>${esc(e.title)}</span></a>
        ${opts.compact ? '' : `<p class="exp-card-sum">${esc(e.resumeLine || e.summary)}</p>`}
        <div class="exp-card-kws">${e.keywords.map((k) => this.keywordChip(k, (opts.matched || []).includes(k))).join('')}</div>
      </article>`;
    },
    // toast(msg, { action:'되돌리기', onAction })
    toast(msg, opts = {}) {
      const root = document.getElementById('toast-root');
      const el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = msg;
      if (opts.action) {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = opts.action;
        b.onclick = () => { el.remove(); opts.onAction(); }; el.appendChild(b);
      }
      root.appendChild(el); setTimeout(() => el.remove(), opts.action ? 6000 : 2600);
    },
    // 휴지통으로 보낸 뒤 안내 + 되돌리기. entry = App.store.remove*() 가 돌려준 휴지통 항목
    trashed(entry, name) {
      if (!entry) return;
      this.toast(`${name || `「${entry.title}」`} 항목을 휴지통으로 옮겼어요`, { action: '되돌리기', onAction: () => { const r = App.store.restore(entry.id); if (r) { App.navigate(r.hash); App.ui.toast('되돌렸어요'); } } });
    },
    // modal({ title, body(html), confirmText, cancelText, danger, size:'lg', hideCancel, hideConfirm, onConfirm(root)→false 면 닫지 않음(Promise 가능), onOpen(root), onClose })
    modal(o) {
      const root = document.getElementById('modal-root'); const back = document.activeElement;
      root.innerHTML = `<div class="modal-backdrop"><div class="modal ${o.size === 'lg' ? 'modal-lg' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-head" id="modal-title">${esc(o.title || '')}</div><div class="modal-body">${o.body || ''}</div>
        ${o.hideCancel && o.hideConfirm ? '' : `<div class="modal-foot">${o.hideCancel ? '' : `<button type="button" class="btn" data-m="cancel">${esc(o.cancelText || '취소')}</button>`}
        ${o.hideConfirm ? '' : `<button type="button" class="btn ${o.danger ? 'btn-danger' : 'btn-primary'}" data-m="ok">${esc(o.confirmText || '확인')}</button>`}</div>`}</div></div>`;
      const box = root.querySelector('.modal'); const me = root.firstElementChild;
      const close = () => { if (root.firstElementChild !== me) return; root.innerHTML = ''; document.removeEventListener('keydown', onKey, true); if (o.onClose) o.onClose(); if (back && back.isConnected && back.focus) back.focus({ preventScroll: true }); };
      const onKey = (ev) => {
        if (root.firstElementChild !== me) { document.removeEventListener('keydown', onKey, true); return; }
        if (ev.key === 'Escape') { ev.stopPropagation(); close(); return; }
        if (ev.key !== 'Tab') return;
        const f = [...box.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]')].filter((x) => x.offsetParent !== null); if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); } else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); } else if (!box.contains(document.activeElement)) { ev.preventDefault(); first.focus(); }
      };
      document.addEventListener('keydown', onKey, true);
      const cancel = root.querySelector('[data-m=cancel]'); const ok = root.querySelector('[data-m=ok]');
      if (cancel) cancel.onclick = close;
      me.onmousedown = (ev) => { if (ev.target === me) close(); };
      if (ok) ok.onclick = async () => { const r = o.onConfirm && o.onConfirm(root); if (r && r.then) { ok.disabled = true; const v = await r.catch(() => false); ok.disabled = false; if (v !== false) close(); } else if (r !== false) close(); };
      box.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && !ev.isComposing && ok && ev.target.matches('input:not([type=checkbox]):not([type=radio]):not([type=search])') && !ev.target.closest('form')) { ev.preventDefault(); ok.click(); } });
      if (o.onOpen) o.onOpen(root, close);
      if (!box.contains(document.activeElement)) { const f = box.querySelector('input:not([type=checkbox]):not([type=radio]),textarea,select') || (o.danger ? cancel : ok) || cancel; if (f) f.focus(); }
      return close;
    },
    closeModal() { const b = document.querySelector('#modal-root > .modal-backdrop'); if (b) document.getElementById('modal-root').innerHTML = ''; },
  };

  /* ---------------- Router ---------------- */
  // 화면 등록: App.screens.<name> = { title, layout?: 'shell'|'full', render(params) => html, mount?(root, params) => cleanupFn? }
  App.screens = App.screens || {};
  App.routes = [
    ['#/login', 'login'], ['#/signup', 'signup'], ['#/onboarding', 'onboarding'], ['#/home', 'home'],
    // AI 채팅: 프로젝트마다 여러 채팅방. #/chat/new?project=&card=&kw=&text=&github=1 은 새 채팅 (github=1: GitHub 에서 이야깃거리 찾기부터)
    ['#/chat/:room', 'chat'], ['#/chat', 'chat'],
    // 프로젝트는 경험 위키 안의 묶음 페이지. /github 는 연결한 레포를 분석해 이 프로젝트의 경험 카드를 만드는 화면
    ['#/vault/p/:id/github', 'projectGithub'], ['#/vault/p/:id', 'projects'], ['#/vault', 'vault'], ['#/graph', 'graph'], ['#/card/:id', 'card'],
    ['#/apply/:id/:tab', 'apply'], ['#/apply/:id', 'apply'], ['#/apply', 'apply'],
    ['#/settings', 'settings'], ['#/resume', 'resume'], ['#/trash', 'trash'],
  ];
  // 옛 주소 → 새 주소
  App.legacyHash = (hash) => (/^#\/ask(?=\/|\?|$)/.test(hash) ? hash.replace(/^#\/ask/, '#/chat') : /^#\/github/.test(hash) ? '#/vault' : /^#\/apply\/[^/]+\/competency/.test(hash) ? hash.replace(/\/competency.*/, '') : null);
  // 채팅 시작: AI 채팅의 새 채팅을 연다. { projectId, cardId(이 카드를 고치는 대화), keyword(이 역량 경험 찾기), text, github }
  App.startChat = ({ projectId = '', cardId = '', keyword = '', text = '', github = false } = {}) => {
    const q = new URLSearchParams(); if (projectId) q.set('project', projectId); if (cardId) q.set('card', cardId); if (keyword) q.set('kw', keyword); if (text) q.set('text', text); if (github) q.set('github', '1');
    const s = q.toString(); App.navigate('#/chat/new' + (s ? '?' + s : ''));
  };
  App.navigate = (hash) => { if (location.hash === hash) window.dispatchEvent(new HashChangeEvent('hashchange')); else location.hash = hash; };
  App.matchRoute = function (hash) {
    const [path, qs] = (hash || '#/home').split('?');
    const query = Object.fromEntries(new URLSearchParams(qs || ''));
    for (const [pattern, name] of App.routes) {
      const pp = pattern.split('/'), hp = path.split('/');
      if (pp.length !== hp.length) continue;
      const params = {}; let ok = true;
      pp.forEach((seg, i) => { if (seg.startsWith(':')) { try { params[seg.slice(1)] = decodeURIComponent(hp[i]); } catch (e) { ok = false; } } else if (seg !== hp[i]) ok = false; });
      if (ok) return { name, params: Object.assign(params, query) };
    }
    return { name: 'home', params: query };
  };
})(window.App);