/* App core: store, router, ui helpers, mock AI. 모든 화면이 이 API만 사용한다. */
window.App = window.App || {};
(function (App) {
  const LS_KEY = 'rewrite-proto-v7'; // v7: 대화 기록(원문 채팅방) + 대화형 이전 체크인 정리, v6: 경험 위키 (모든 기록 → ingest → 경험 페이지, 변경 기록·점검), v5: 깃허브 레포 분석 + 마스터 이력서, v2: 프로젝트와 경험 카드 분리 (1 프로젝트 : N 카드), v3: 완료 프로젝트 예시 추가, v4: 지난 질문 기록 시드 + 연속 기록을 답변 날짜에서 계산
  const clone = (o) => JSON.parse(JSON.stringify(o));

  /* ---------------- Store ---------------- */
  function load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    const s = clone(window.SEED);
    return { user: s.user, settings: s.settings, projects: s.projects, experiences: s.experiences, inbox: s.inbox, applications: s.applications, resume: s.resume, wikiLog: [], wikiMeta: { lastQueue: '' }, threads: null };
  }
  function EMPTY_RESUME() { return { profile: { name: '', headline: '', email: '', phone: '', github: '', blog: '', intro: '' }, skills: [], entries: [], versions: [] }; }
  let state = load();
  // 이전 버전 저장 데이터에는 지원 기업이 없을 수 있음
  if (!Array.isArray(state.applications)) state.applications = clone(window.SEED.applications || []);
  // 지원 상태 4단계로 통합 (이전 5단계 → 새 단계)
  const LEGACY_STATUS = { interest: 'preparing', writing: 'preparing', submitted: 'applied', interview: 'applied', done: 'failed' };
  state.applications.forEach((a) => { if (LEGACY_STATUS[a.status]) a.status = LEGACY_STATUS[a.status]; });
  if (!state.resume) state.resume = clone(window.SEED.resume || EMPTY_RESUME());
  const listeners = new Set();
  function persist() { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } }
  function emit() { persist(); listeners.forEach((fn) => fn(state)); }
  const today = () => new Date().toISOString().slice(0, 10);
  // 체크인 일정은 로컬 날짜 기준
  const pad2 = (n) => String(n).padStart(2, '0');
  const fmtDay = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const localDay = () => fmtDay(new Date());
  const parseDay = (s) => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y || 1970, (m || 1) - 1, d || 1); };
  const CHECKIN_DAYS = { daily: 1, every2days: 2, weekly: 7 };
  const projectShort = (t) => { const m = String(t || '').match(/「[^」]+」/); if (m) return m[0]; const parts = String(t || '').split(' — '); return `「${parts[parts.length - 1]}」`; };
  const uid = (p) => p + Math.random().toString(36).slice(2, 8);

  App.store = {
    get state() { return state; },
    // 프로젝트 짧은 이름: 「모여봄」 → 모여봄, '개인 프로젝트 — 가계부 슬랙봇' → 가계부 슬랙봇
    projectName(p) { return projectShort(p && p.title).slice(1, -1); },
    // 로컬 날짜 도우미
    localDay, fmtDay, parseDay,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    touch() { emit(); },
    reset() { try { localStorage.removeItem(LS_KEY); } catch (e) {} state = load(); emit(); },

    // 경험 카드
    list() { return state.experiences.slice().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')); },
    get(id) { return state.experiences.find((e) => e.id === id) || null; },
    // 이 프로젝트에서 나온 경험 카드들
    cardsOf(projectId) { return this.list().filter((e) => e.projectId === projectId); },
    create(partial = {}) {
      const exp = Object.assign({
        id: uid('e'), title: '제목 없는 경험', category: '일상', period: { start: '', end: '' }, status: 'draft', projectId: null, sourceLogIds: [],
        role: '', summary: '', star: { situation: '', task: '', action: '', result: '' }, insights: '',
        keywords: [], jobs: [], links: [], qa: [], completeness: 0, createdAt: today(), updatedAt: today(),
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
    addQA(expId, q, a) {
      const exp = this.get(expId); if (!exp) return;
      exp.qa.push({ q, a, date: today() }); exp.updatedAt = today(); emit();
    },

    // 프로젝트 (체크인 로그의 그릇). status: ongoing | done
    projects() { return state.projects.slice().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')); },
    getProject(id) { return state.projects.find((p) => p.id === id) || null; },
    createProject(partial = {}) {
      const p = Object.assign({
        id: uid('p'), title: '', period: { start: '', end: '' }, status: 'ongoing', role: '', summary: '', links: [], logs: [],
        createdAt: today(), updatedAt: today(),
      }, clone(partial));
      state.projects.push(p); emit(); return p;
    },
    updateProject(id, patch) { const p = this.getProject(id); if (!p) return null; Object.assign(p, clone(patch), { updatedAt: today() }); emit(); return p; },
    addLog(projectId, log) {
      const p = this.getProject(projectId); if (!p) return null;
      const l = Object.assign({ id: uid('l'), date: today(), keywords: App.ai.extractKeywords(log.text || '') }, log);
      p.logs.push(l); p.updatedAt = today(); emit(); return l;
    },
    updateLog(projectId, logId, patch) {
      const p = this.getProject(projectId); if (!p) return;
      const log = p.logs.find((l) => l.id === logId); if (!log) return;
      Object.assign(log, clone(patch)); p.updatedAt = today(); emit();
    },
    removeLog(projectId, logId) {
      const p = this.getProject(projectId); if (!p) return;
      p.logs = p.logs.filter((l) => l.id !== logId); p.updatedAt = today();
      state.experiences.forEach((e) => { if (e.sourceLogIds) e.sourceLogIds = e.sourceLogIds.filter((x) => x !== logId); });
      emit();
    },
    // 질문 답변이 쌓일 곳: 프로젝트 로그 또는 경험 카드
    questionTarget(q) {
      if (q && q.targetProjectId) { const p = this.getProject(q.targetProjectId); if (p) return { kind: 'project', id: p.id, title: p.title, href: '#/vault/p/' + p.id, place: '프로젝트 로그' }; }
      if (q && q.targetExpId) { const e = this.get(q.targetExpId); if (e) return { kind: 'card', id: e.id, title: e.title, href: '#/card/' + e.id, place: '경험' }; }
      return null;
    },

    // 오늘의 질문 인박스
    // 지운 질문(deleted)은 목록에서 빠지지만, 같은 질문을 곧바로 다시 묻지 않도록 자리만 남는다
    inbox() { return state.inbox.filter((q) => !q.deleted); },
    pending() { return state.inbox.filter((q) => q.status === 'pending' && !q.deleted); },
    getQuestion(qid) { return state.inbox.find((x) => x.id === qid && !x.deleted) || null; },
    /* 질문함에서 질문(대화방) 지우기: 질문과 그 질문으로 나눈 대화 원문만 지운다.
       이미 위키에 반영된 경험·변경 기록·프로젝트 타임라인 기록은 그대로 남는다. 연속 기록(답한 날)도 유지 */
    deleteQuestion(qid) {
      const q = state.inbox.find((x) => x.id === qid); if (!q) return false;
      if (App.wiki && App.wiki.threads) App.wiki.threads().filter((t) => t.questionId === qid).map((t) => t.id).forEach((id) => App.wiki.deleteThread(id, true));
      if (q.status === 'pending' || q.status === 'later') q.status = 'skipped'; // 체크인·코드 질문이 바로 다시 도착하지 않게
      q.deleted = true; delete q.answer; delete q.hint;
      emit(); return true;
    },
    // opts (프로젝트 체크인일 때): { type, keywords } — 트래커에서 답하면 사용자가 고른 유형·키워드를 그대로 쓴다
    // opts.decision: 대화에서 사용자가 정한 반영 방법 { mode:'update'|'new'|'timeline'|'skip', expId, field, text, title } — App.wiki.plan 참고
    // 답변은 모두 경험 위키를 지난다 (App.wiki.ingest). 반환값: 위키 반영 결과 entry — 화면은 App.wiki.reportHTML(entry) 로 보여 준다
    answer(qid, text, opts = {}) {
      const q = state.inbox.find((x) => x.id === qid); if (!q) return null;
      q.status = 'answered'; q.answer = text; q.answeredAt = localDay();
      let entry = null;
      if (q.targetProjectId && this.getProject(q.targetProjectId) && !q.findingId) {
        // 프로젝트 체크인: 원문은 타임라인(로그)에, 이야기는 위키의 경험 페이지에
        const t = opts.type || q.checkinType || (/결정|선택/.test(q.text) ? 'decision' : /문제|이슈|에러/.test(q.text) ? 'issue' : /팀원|의견|협업/.test(q.text) ? 'collab' : 'milestone');
        const p = this.getProject(q.targetProjectId);
        const log = { id: uid('l'), date: localDay(), type: t, text, keywords: opts.keywords || App.ai.extractKeywords(text), fromQuestion: q.checkinText || q.text };
        p.logs.push(log); p.updatedAt = localDay();
        entry = App.wiki.ingest({ type: 'checkin', text, question: q.checkinText || q.text, questionId: q.id, projectId: p.id, logId: log.id, logType: t, keywords: log.keywords, decision: opts.decision, threadId: opts.threadId });
        const tid = opts.threadId || App.wiki.activeThread(); if (tid) log.threadId = tid;
      } else if (q.findingId) {
        // 코드 분석에서 나온 질문: 그 코드가 근거로 붙은 경험으로
        entry = App.wiki.ingest({ type: 'answer', text, question: q.text, questionId: q.id, projectId: q.targetProjectId, findingId: q.findingId, decision: opts.decision, threadId: opts.threadId });
      } else {
        entry = App.wiki.ingest({ type: 'answer', text, question: q.text, questionId: q.id, expId: q.targetExpId || null, stage: q.stage || null, decision: opts.decision, threadId: opts.threadId });
      }
      if (entry) q.wikiEntry = entry.id;
      emit(); return entry;
    },
    // 질문이 답변된 날 (로컬 'YYYY-MM-DD')
    answerDay(q) { return (q && (q.answeredAt || (q.askedAt || '').slice(0, 10))) || ''; },
    // 'YYYY-MM-DD' → 그날 도착한 질문 목록 (askedAt 기준, 도착 시각 순)
    dayHistory() {
      const map = {};
      state.inbox.forEach((q) => { const d = (q.askedAt || '').slice(0, 10); if (!d || q.deleted) return; (map[d] = map[d] || []).push(q); });
      Object.keys(map).forEach((d) => map[d].sort((a, b) => (a.askedAt || '').localeCompare(b.askedAt || '')));
      return map;
    },
    // 답변이 1개 이상 있는 날 집합
    answeredDays() {
      const set = new Set();
      state.inbox.forEach((q) => { if (q.status === 'answered') { const d = this.answerDay(q); if (d) set.add(d); } });
      return set;
    },
    // 현재 연속 기록에 포함된 날들 (최근 → 과거). 오늘 아직 답이 없으면 어제부터 센다 (기록은 아직 살아 있음)
    streakDays() {
      const set = this.answeredDays(); const out = [];
      const d = new Date(); d.setHours(0, 0, 0, 0);
      if (!set.has(fmtDay(d))) d.setDate(d.getDate() - 1);
      while (set.has(fmtDay(d))) { out.push(fmtDay(d)); d.setDate(d.getDate() - 1); }
      return out;
    },
    streak() { return this.streakDays().length; },
    setQuestionStatus(qid, status) { const q = state.inbox.find((x) => x.id === qid); if (q) { q.status = status; emit(); } },
    /* ---- 프로젝트 체크인: 트래커와 오늘의 질문이 같은 질문 하나를 함께 쓴다 ----
       진행 중 프로젝트가 체크인 주기(settings.projectCheckin)를 넘기면 체크인 질문 1개를 인박스에 넣고,
       트래커의 "오늘의 체크인"도 그 질문을 보여 준다. 어디서 답하든 같은 질문이 답변 완료가 된다. */
    checkinDays() { return CHECKIN_DAYS[state.settings.projectCheckin] || 2; },
    // { due, dueDate('YYYY-MM-DD'), last } — 마지막 기록 + 주기 = 다음 체크인 날
    checkinDue(p) {
      const last = (p.logs || []).map((l) => l.date).sort().pop() || null;
      const base = last || (p.createdAt || localDay());
      const d = parseDay(base); if (last) d.setDate(d.getDate() + this.checkinDays());
      const dueDate = fmtDay(d);
      return { due: p.status === 'ongoing' && dueDate <= localDay(), dueDate, last };
    },
    // 아직 답하지 않은(대기·나중에) 이 프로젝트의 체크인 질문
    openCheckin(projectId) { return state.inbox.find((q) => q.checkin && q.targetProjectId === projectId && (q.status === 'pending' || q.status === 'later')) || null; },
    syncCheckins() {
      let added = false;
      state.projects.forEach((p) => {
        if (p.status !== 'ongoing') return;
        const open = this.openCheckin(p.id);
        const { due, dueDate } = this.checkinDue(p);
        if (!due) {
          // 그 사이 트래커에서 기록해 체크인할 때가 아니게 됐으면 대기 중 질문은 정리
          if (open && open.status === 'pending' && (open.askedAt || '').slice(0, 10) < dueDate) { open.status = 'answered'; open.answer = open.answer || '(트래커에서 직접 기록했어요)'; added = true; }
          return;
        }
        if (open) return;
        // 최근 한 주기 안에 이미 물어봤으면(건너뛰기 포함) 다시 묻지 않는다
        const since = parseDay(localDay()); since.setDate(since.getDate() - this.checkinDays() + 1);
        if (state.inbox.some((q) => q.checkin && q.targetProjectId === p.id && (q.askedAt || '').slice(0, 10) >= fmtDay(since))) return;
        const bank = window.SEED.projectCheckins; const cnt = {};
        (p.logs || []).forEach((l) => { cnt[l.type] = (cnt[l.type] || 0) + 1; });
        let bi = 0; bank.forEach((b, i) => { if ((cnt[b.type] || 0) < (cnt[bank[bi].type] || 0)) bi = i; });
        state.inbox.unshift(this.checkinQuestion(p, bi, { id: uid('q'), status: 'pending', askedAt: localDay() + ' ' + (state.settings.times && state.settings.times[0] || '12:30') }));
        added = true;
      });
      if (added) emit();
    },
    checkinQuestion(p, bankIndex, base = {}) {
      const b = window.SEED.projectCheckins[bankIndex % window.SEED.projectCheckins.length];
      return Object.assign(base, {
        type: 'project', checkin: true, targetProjectId: p.id, targetExpId: null, checkinType: b.type, checkinText: b.text, bankIndex,
        text: `${projectShort(p.title)} ${b.text}`, hint: '한두 줄이면 충분해요. 타임라인에 기록되고, 관련 경험에 반영돼요.',
      });
    },
    // 트래커에서 "다른 질문"·유형 변경 → 인박스 질문도 같이 바뀐다
    changeCheckin(qid, bankIndex) {
      const q = state.inbox.find((x) => x.id === qid); const p = q && this.getProject(q.targetProjectId); if (!p) return;
      this.checkinQuestion(p, bankIndex, q); emit();
    },
    pushQuestion(q) { state.inbox.unshift(Object.assign({ id: uid('q'), status: 'pending', askedAt: today() + ' ' + new Date().toTimeString().slice(0, 5) }, q)); emit(); },

    // 지원 기업 (기업 + 직무 단위로 역량 맵·자소서·면접 준비를 따로 관리)
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
    createApp(partial = {}) {
      const app = Object.assign({
        id: uid('a'), company: '', job: '', status: 'preparing', deadline: '', url: '', jdText: '',
        competencies: [], essays: [], interview: [], pins: {}, memo: '', createdAt: today(), updatedAt: today(),
      }, clone(partial));
      state.applications.push(app); emit(); return app;
    },
    updateApp(id, patch) { const a = this.getApp(id); if (!a) return null; Object.assign(a, clone(patch), { updatedAt: today() }); emit(); return a; },
    removeApp(id) { state.applications = state.applications.filter((a) => a.id !== id); emit(); },
    // list: 'essays' | 'interview'
    addAppItem(appId, list, item) {
      const a = this.getApp(appId); if (!a) return null;
      const it = Object.assign({ id: uid(list === 'essays' ? 'q' : 'i') }, clone(item));
      a[list].push(it); a.updatedAt = today(); emit(); return it;
    },
    updateAppItem(appId, list, itemId, patch) {
      const a = this.getApp(appId); if (!a) return null;
      const it = a[list].find((x) => x.id === itemId); if (!it) return null;
      Object.assign(it, clone(patch)); a.updatedAt = today(); emit(); return it;
    },
    removeAppItem(appId, list, itemId) {
      const a = this.getApp(appId); if (!a) return;
      a[list] = a[list].filter((x) => x.id !== itemId); a.updatedAt = today(); emit();
    },
    // 기업별 대표 경험 고정 (expId null 이면 해제)
    setPin(appId, kw, expId) {
      const a = this.getApp(appId); if (!a) return;
      a.pins = Object.assign({}, a.pins); if (expId) a.pins[kw] = expId; else delete a.pins[kw];
      a.updatedAt = today(); emit();
    },


    // ---------------- 깃허브 레포 분석 (project.repo) ----------------
    // repo = { url, owner, name, branch, source:'github'|'sample', analyzedAt, meta:{description,stars,languages:{lang:pct},topics}, stack:[], findings:[Finding] }
    // Finding = { id, category, title, bullet, detail, tags:[], confidence:'high'|'mid', evidence:[{path,start,end,code,url}], status:'new'|'added'|'dismissed' }
    setRepo(projectId, repo) {
      const p = this.getProject(projectId); if (!p) return null;
      // 다시 분석해도 이미 이력서에 담은 항목은 '담음' 상태 유지
      const added = new Set(this.resumeBullets().map((b) => b.source && b.source.findingId).filter(Boolean));
      p.repo = clone(repo); (p.repo.findings || []).forEach((f) => { if (added.has(f.id)) f.status = 'added'; else if (!f.status) f.status = 'new'; });
      p.updatedAt = today(); emit(); return p.repo;
    },
    removeRepo(projectId) { const p = this.getProject(projectId); if (!p) return; delete p.repo; emit(); },
    updateFinding(projectId, findingId, patch) {
      const p = this.getProject(projectId); const f = p && p.repo && (p.repo.findings || []).find((x) => x.id === findingId); if (!f) return null;
      Object.assign(f, clone(patch)); emit(); return f;
    },
    findFinding(findingId) {
      for (const p of state.projects) { const f = p.repo && (p.repo.findings || []).find((x) => x.id === findingId); if (f) return { project: p, finding: f }; }
      return null;
    },

    // ---------------- 마스터 이력서 (state.resume) ----------------
    // 이력서에 쓸 수 있는 모든 재료가 쌓이는 곳. included=true 인 것만 '현재 이력서'에 보인다.
    // entry = { id, section:'project'|'career'|'activity'|'education'|'award', title, org, period:{start,end}, role, projectId?, included, order, bullets:[Bullet] }
    // Bullet = { id, text, included, addedAt, source:{ type:'github'|'card'|'log'|'manual', projectId?, findingId?, expId?, logId?, evidence?:[{path,start,end,url}] } }
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
      e.bullets.forEach((b) => this._releaseFinding(b));
      state.resume.entries = state.resume.entries.filter((x) => x.id !== id); emit();
    },
    reorderResumeEntries(orderIds) { orderIds.forEach((id, i) => { const e = this.resumeEntry(id); if (e) e.order = i; }); emit(); },
    // 프로젝트에 해당하는 이력서 항목 (없으면 프로젝트 정보로 만든다)
    resumeEntryFor(projectId, create = true) {
      let e = state.resume.entries.find((x) => x.projectId === projectId);
      if (!e && create) {
        const p = this.getProject(projectId); if (!p) return null;
        e = { id: uid('re'), section: 'project', title: p.title, org: '', period: clone(p.period || { start: '', end: '' }), role: p.role || '', projectId, included: true, order: state.resume.entries.length, bullets: [] };
        state.resume.entries.push(e); emit();
      }
      return e || null;
    },
    // items: [{ text, source }] → 프로젝트 항목에 bullet 으로 추가. 같은 findingId 는 중복 추가하지 않는다. tags 는 기술 스택 풀에 쌓인다.
    addResumeBullets(projectId, items, opts = {}) {
      const e = projectId ? this.resumeEntryFor(projectId) : this.resumeEntry(opts.entryId); if (!e) return null;
      items.forEach((it) => {
        const src = clone(it.source || { type: 'manual' });
        if (src.findingId && e.bullets.some((b) => b.source && b.source.findingId === src.findingId)) return;
        e.bullets.push({ id: uid('rb'), text: it.text, included: it.included !== false, addedAt: localDay(), source: src });
        if (src.findingId) { const ff = this.findFinding(src.findingId); if (ff) ff.finding.status = 'added'; }
        (it.tags || []).forEach((t) => this._poolSkill(t, src));
      });
      emit(); return e;
    },
    updateResumeBullet(entryId, bulletId, patch) {
      const e = this.resumeEntry(entryId); const b = e && e.bullets.find((x) => x.id === bulletId); if (!b) return null;
      Object.assign(b, clone(patch)); emit(); return b;
    },
    removeResumeBullet(entryId, bulletId) {
      const e = this.resumeEntry(entryId); if (!e) return;
      const b = e.bullets.find((x) => x.id === bulletId); if (b) this._releaseFinding(b);
      e.bullets = e.bullets.filter((x) => x.id !== bulletId); emit();
    },
    reorderResumeBullets(entryId, orderIds) {
      const e = this.resumeEntry(entryId); if (!e) return;
      e.bullets.sort((a, b) => orderIds.indexOf(a.id) - orderIds.indexOf(b.id)); emit();
    },
    _releaseFinding(b) { if (b.source && b.source.findingId) { const ff = this.findFinding(b.source.findingId); if (ff && ff.finding.status === 'added') ff.finding.status = 'new'; } },
    _poolSkill(name, source) {
      if (!name || state.resume.skills.some((s) => s.name.toLowerCase() === String(name).toLowerCase())) return;
      state.resume.skills.push({ id: uid('rs'), name, group: App.store.skillGroup(name), included: false, source: clone(source || null) });
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
      // 되돌린 이력서에 없는 코드 분석 항목은 다시 '새 재료'로
      const added = new Set(this.resumeBullets().map((b) => b.source && b.source.findingId).filter(Boolean));
      state.projects.forEach((p) => ((p.repo && p.repo.findings) || []).forEach((f) => { if (added.has(f.id)) f.status = 'added'; else if (f.status === 'added') f.status = 'new'; }));
      emit();
    },
    removeResumeVersion(id) { state.resume.versions = state.resume.versions.filter((x) => x.id !== id); emit(); },

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
    // opts.focus: 지원 기업의 요구 역량 → 해당 키워드를 가진 경험에 가산점
    analyzeQuestion(text, opts = {}) {
      let kws = this.extractKeywords(text);
      const extra = { '갈등': '갈등조정', '주도': '주도성', '실패': '끈기', '새로운 기술': '학습능력', '고객': '고객지향', '사용자': '고객지향', '개선': '문제해결' };
      Object.keys(extra).forEach((w) => { if (text.includes(w) && !kws.includes(extra[w])) kws.push(extra[w]); });
      if (!kws.length) kws = (opts.focus && opts.focus.length ? opts.focus.slice(0, 2) : ['문제해결', '협업']);
      kws = kws.slice(0, 3);
      const focus = opts.focus || [];
      const recs = state.experiences.map((e) => {
        const hit = e.keywords.filter((k) => kws.includes(k)).length;
        const fhit = e.keywords.filter((k) => focus.includes(k) && !kws.includes(k)).length;
        const score = Math.min(98, Math.round(hit * 30 + fhit * 6 + e.completeness * 0.35 + (e.status === 'done' ? 6 : 0)));
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
    // 채용공고(JD) 텍스트 → 요구 역량 [{ name, weight(1~3), reason }]
    analyzeJD(text) {
      const t = String(text || '');
      const extra = {
        '트래픽': '문제해결', '장애': '문제해결', '안정': '꼼꼼함', '품질': '꼼꼼함', '코드 리뷰': '협업', '리뷰': '커뮤니케이션',
        '유관 부서': '커뮤니케이션', '이해관계자': '커뮤니케이션', '빠르게': '학습능력', '성장': '학습능력', '신기술': '학습능력',
        '오너십': '주도성', '주인의식': '주도성', '능동': '주도성', '지표': '분석력', '로그': '분석력', '고객': '고객지향', '사용자': '고객지향',
        '설계': '의사결정', '아키텍처': '의사결정', '리딩': '리더십',
      };
      const score = {}; const why = {};
      const sentences = t.split(/[\n.·•]/).map((x) => x.trim()).filter(Boolean);
      sentences.forEach((sen) => {
        const found = new Set(this.extractKeywords(sen));
        Object.keys(extra).forEach((w) => { if (sen.includes(w)) found.add(extra[w]); });
        found.forEach((k) => { score[k] = (score[k] || 0) + 1; if (!why[k]) why[k] = sen.length > 48 ? sen.slice(0, 48) + '…' : sen; });
      });
      let list = Object.keys(score).map((k) => ({ name: k, weight: Math.min(3, score[k]), reason: why[k] }));
      if (!list.length) list = [{ name: '문제해결', weight: 2, reason: '' }, { name: '협업', weight: 2, reason: '' }];
      return list.sort((a, b) => b.weight - a.weight).slice(0, 6);
    },
    // 지원 기업 준비도
    readiness(app) {
      const exps = state.experiences;
      const comps = (app.competencies || []).map((c) => {
        const pinned = app.pins && app.pins[c.name] ? exps.find((e) => e.id === app.pins[c.name]) : null;
        const cands = exps.filter((e) => e.keywords.includes(c.name)).sort((a, b) => b.completeness - a.completeness);
        const exp = pinned || cands[0] || null;
        return { name: c.name, weight: c.weight, exp, pinned: !!pinned, count: cands.length, ready: !!exp && exp.completeness >= 70 };
      });
      const essays = app.essays || []; const iv = app.interview || [];
      const essaysDone = essays.filter((q) => q.expId).length;
      const ivDone = iv.filter((q) => q.checked).length;
      // 역량·자소서·면접 세 영역을 항상 같은 비중으로 평균. 아직 비어 있는 영역은 0 (준비 안 됨)
      const ratio = (done, total) => (total ? done / total : 0);
      const parts = [ratio(comps.filter((c) => c.ready).length, comps.length), ratio(essaysDone, essays.length), ratio(ivDone, iv.length)];
      const score = Math.round(parts.reduce((a, b) => a + b, 0) / parts.length * 100);
      return { score, competencies: comps, essaysDone, essaysTotal: essays.length, interviewDone: ivDone, interviewTotal: iv.length };
    },
    // 지원 기업별 예상 면접 질문 생성 [{ text, keywords, source: 'competency'|'essay'|'common', expId }]
    interviewSuggestions(app) {
      const out = [];
      out.push({ text: `${app.company}에 지원한 이유는 무엇인가요?`, keywords: [], source: 'common', expId: null });
      out.push({ text: '1분 자기소개를 해 주세요.', keywords: [], source: 'common', expId: null });
      (app.competencies || []).forEach((c) => {
        const k = App.keywords.get(c.name);
        out.push({ text: `${k.desc.replace(/ 경험$/, '')} 경험을 구체적으로 말씀해 주세요.`, keywords: [c.name], source: 'competency', expId: (app.pins || {})[c.name] || null });
      });
      (app.essays || []).filter((q) => q.expId).forEach((q) => {
        const e = state.experiences.find((x) => x.id === q.expId); if (!e) return;
        out.push({ text: `자소서에 쓴 「${e.title.split(' — ')[0]}」에서 다른 선택지는 없었나요? 왜 그 방법을 택했나요?`, keywords: q.keywords || [], source: 'essay', expId: e.id });
        if (!/\d/.test(e.star.result || '')) out.push({ text: `「${e.title.split(' — ')[0]}」의 결과를 수치로 설명할 수 있나요?`, keywords: q.keywords || [], source: 'essay', expId: e.id });
      });
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
      return { situation: first([st.situation, st.task].filter(Boolean).join(' '), 70), action: first(st.action, 90), result: first(st.result, 70), insight: first(e.insights, 60) };
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
        ${(() => { const p = e.projectId && App.store.getProject(e.projectId); return p ? `<div class="exp-card-from">▤ ${esc(p.title.split(' — ')[0])}에서</div>` : ''; })()}
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
    ['#/onboarding', 'onboarding'], ['#/home', 'home'], ['#/discover', 'discover'],
    // 질문함: 질문 하나 = 대화방 하나. 옛 주소(#/daily, #/chat)도 질문함으로 연결
    ['#/ask/:room', 'ask'], ['#/ask', 'ask'], ['#/daily', 'ask'], ['#/chat', 'ask'],
    // 프로젝트는 경험 위키 안의 묶음 페이지 (#/projects/:id 는 옛 주소 호환)
    ['#/vault/p/:id', 'projects'], ['#/projects/:id', 'projects'], ['#/projects', 'vault'], ['#/vault', 'vault'], ['#/card/:id', 'card'],
    ['#/apply/:id/:tab', 'apply'], ['#/apply/:id', 'apply'], ['#/apply', 'apply'],
    ['#/competency', 'apply'], ['#/match', 'apply'], ['#/settings', 'settings'], ['#/resume', 'resume'],
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
