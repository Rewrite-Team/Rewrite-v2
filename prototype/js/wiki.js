/* 경험 위키 엔진 — 카파시의 "LLM 위키" 구조를 프로토타입으로 흉내 낸다.
   ┌ 기록(원문, 바뀌지 않음) ─ 오늘의 질문 답변 · 프로젝트 체크인 · AI 대화 · 코드 분석 · 직접 작성
   ├ 위키(AI가 정리·유지) ── 경험 페이지(state.experiences) + 프로젝트 페이지(state.projects)
   └ 꺼내 쓰기(질의) ────── 이력서 · 자소서 · 면접 — 위키 페이지를 근거로 인용

   모든 입력은 App.wiki.ingest() 한 곳을 지난다. ingest 는
     1) 기존 경험과 맞춰 보고(match) → 있으면 그 페이지를 고치고, 없으면 새 페이지를 만들고
     2) 무엇이 바뀌었는지(changes)를 변경 기록(state.wikiLog)에 남기고
     3) 되돌리기·다른 경험으로 옮기기를 위한 스냅숏을 같이 둔다.
   화면은 돌려받은 entry 를 App.wiki.reportHTML(entry) 로 "반영 결과"로 보여 주기만 하면 된다.

   change.kind
     create   새 경험 페이지         { expId }
     fill     빈 칸을 채움            { expId, field, after }
     append   기존 칸에 덧붙임        { expId, field, after }
     evidence 근거(원문·코드) 연결    { expId, text }
     keyword  역량 키워드 추가        { expId, after:[...] }
     link     프로젝트에 연결         { expId, projectId }
     log      프로젝트 타임라인 기록  { projectId, text }
     question 다음 질문 예약          { questionId, text }
*/
(function (App) {
  const S = App.store;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const uid = (p) => p + Math.random().toString(36).slice(2, 8);
  const st = () => S.state;
  const FIELD_LABEL = { situation: '상황', task: '과제', action: '행동', result: '결과', insights: '배운 점', summary: '요약' };
  const SOURCE_LABEL = { answer: '오늘의 질문 답변', checkin: '프로젝트 체크인', chat: 'AI와 대화', code: '코드 분석', manual: '직접 작성' };
  const SOURCE_ICO = { answer: '✉', checkin: '▤', chat: '✦', code: '⌥', manual: '✎' };
  // 코드 분석 카테고리 → 역량 키워드
  const CODE_KW = { '성능': ['문제해결', '분석력'], '인증·보안': ['꼼꼼함', '책임감'], '데이터': ['문제해결', '꼼꼼함'], '아키텍처': ['의사결정'], '테스트': ['꼼꼼함'], '인프라': ['책임감', '학습능력'], '배포·인프라': ['책임감', '학습능력'], '품질': ['꼼꼼함'], '협업': ['협업', '커뮤니케이션'] };
  const STOP = new Set(['그리고', '그래서', '했어요', '있어요', '없어요', '같은', '하는', '하고', '해서', '에서', '으로', '이번', '최근', '정말', '그냥', '프로젝트', '경험', '개선', '구현', '해결', '조회', '문제', '적용', '처리', '구성', '사용', '방지', '먼저', '위해', '통해']);

  // ---------- 상태 준비 (이전 저장 데이터 호환) ----------
  function ensure() {
    const s = st();
    if (!Array.isArray(s.wikiLog)) s.wikiLog = [];
    if (!s.wikiMeta) s.wikiMeta = { lastQueue: '' };
    s.experiences.forEach((e) => { if (!Array.isArray(e.codeRefs)) e.codeRefs = []; if (!Array.isArray(e.qa)) e.qa = []; if (!Array.isArray(e.sourceLogIds)) e.sourceLogIds = []; });
  }

  // ---------- 텍스트 도우미 ----------
  function tokens(t) {
    return String(t || '').replace(/[「」『』"'“”‘’()\[\]·,.!?~—\-→/]/g, ' ').split(/\s+/)
      .map((w) => w.replace(/(은|는|이|가|을|를|에|의|도|로|와|과|랑|에서|으로|했|했어요|해요|이에요|예요)$/, ''))
      .filter((w) => w.length >= 2 && !STOP.has(w));
  }
  function sentence(t) { t = String(t || '').trim(); if (!t) return ''; return /[.!?。요다]$/.test(t) ? t : t + '.'; }
  function short(t, n = 26) { t = String(t || '').replace(/\s+/g, ' ').trim(); const first = t.split(/[.!?。]\s|(?<=요)\s|→/)[0] || t; return first.length > n ? first.slice(0, n) + '…' : first; }
  // 텍스트에서 프로젝트 언급 찾기 (「모여봄」, 모여봄, 가계부 슬랙봇…)
  function detectProject(text) {
    const t = String(text || '');
    let best = null;
    st().projects.forEach((p) => {
      const names = [];
      const m = p.title.match(/「([^」]+)」/); if (m) names.push(m[1]);
      const tail = p.title.split(' — ').pop(); if (tail) names.push(tail.replace(/\s*—.*$/, ''));
      tokens(p.title).filter((w) => w.length >= 3).forEach((w) => names.push(w));
      if (names.some((n) => n && n.length >= 2 && t.includes(n))) best = best || p;
    });
    return best;
  }
  function guessCategory(text, project) {
    if (project) return '프로젝트';
    const t = String(text || '');
    if (/알바|아르바이트|카페|편의점|매장|손님|점장/.test(t)) return '아르바이트';
    if (/스터디|동아리|모임/.test(t)) return '동아리';
    if (/수업|과제|교수|학기|시험/.test(t)) return '수업·과제';
    if (/해커톤|공모전|대회|봉사|서포터즈/.test(t)) return '대외활동';
    if (/인턴|회사|사수|입사/.test(t)) return '인턴·직장';
    if (/개발|서버|코드|API|배포|봇|앱|웹/.test(t)) return '프로젝트';
    return '일상';
  }
  // 질문·답변이 STAR 의 어느 칸을 채우는지
  function inferField(answer, question, stage) {
    if (stage && FIELD_LABEL[stage === 'insight' ? 'insights' : stage]) return stage === 'insight' ? 'insights' : stage;
    const q = String(question || ''); const a = String(answer || '');
    if (/왜 이렇게 만들|계기|어떤 문제가 있었/.test(q)) return 'situation';
    if (/배운|배웠|달라진 점|다르게 하게/.test(q)) return 'insights';
    if (/결과|달라졌|줄었|늘었|수치|숫자|반응|회복|통과/.test(q)) return 'result';
    if (/역할|맡은|책임|목표/.test(q)) return 'task';
    if (/어떻게|방법|왜 그|설득|준비|먼저 한|대응|정했/.test(q)) return 'action';
    if (/배웠|알게 됐|깨달|느꼈|이후로/.test(a)) return 'insights';
    if (/\d/.test(a) && /(줄|늘|개선|→|%|배|초|건|명|만에|회복|통과|상|등)/.test(a)) return 'result';
    if (/(했어요|했다|만들|제안|바꿨|추가|설명|정리|보여|확인|나눠|맞추)/.test(a)) return 'action';
    return 'situation';
  }

  // ---------- 매칭: 이 기록이 어느 경험 이야기인가 ----------
  function scoreCard(e, text, ctx = {}) {
    let s = 0;
    const tt = new Set(tokens(text));
    const kws = App.ai.extractKeywords(text);
    s += e.keywords.filter((k) => kws.includes(k)).length * 1.5;
    if (ctx.projectId && e.projectId === ctx.projectId) s += 3;
    const titleToks = tokens(e.title);
    s += titleToks.filter((w) => tt.has(w) || String(text).includes(w)).length * 2.5;
    const body = [e.summary, e.star.situation, e.star.action, e.star.result].join(' ');
    const bodyToks = new Set(tokens(body));
    s += [...tt].filter((w) => w.length >= 2 && bodyToks.has(w)).length * 1;
    return s;
  }
  function match(text, ctx = {}) {
    const pool = st().experiences.filter((e) => !ctx.projectOnly || e.projectId === ctx.projectId);
    const ranked = pool.map((e) => ({ exp: e, score: scoreCard(e, text, ctx) })).filter((r) => r.score > 0).sort((a, b) => b.score - a.score);
    const top = ranked[0];
    const confidence = !top ? 'none' : top.score >= 7 ? 'high' : top.score >= 4 ? 'mid' : 'low';
    return { best: top ? top.exp : null, score: top ? top.score : 0, confidence, candidates: ranked.slice(0, 4).map((r) => r.exp) };
  }

  // 코드 발견 ↔ 경험: 프로젝트가 같다는 것만으로는 부족하고, 제목·본문에 같은 기술 이야기가 있어야 한다
  function codeMatch(f, projectId) {
    const text = `${f.title} ${f.bullet || ''} ${(f.tags || []).join(' ')}`;
    const ft = new Set(tokens(text).map((w) => w.toLowerCase()));
    let best = null; let bs = 0;
    st().experiences.filter((e) => e.projectId === projectId).forEach((e) => {
      const et = tokens([e.title, e.summary, e.star.action, e.star.result].join(' ')).map((w) => w.toLowerCase());
      const hit = new Set(et.filter((w) => ft.has(w) && w.length >= 2));
      const titleHit = tokens(e.title).some((w) => ft.has(w.toLowerCase()));
      const sc = hit.size + (titleHit ? 2 : 0);
      if (sc > bs) { bs = sc; best = e; }
    });
    return bs >= 4 && best && tokens(best.title).filter((w) => ft.has(w.toLowerCase())).length >= 2 ? best : null;
  }

  // ---------- 스냅숏 ----------
  function snapExp(snap, id) { if (!(id in snap.exps)) { const e = S.get(id); snap.exps[id] = e ? clone(e) : null; } }
  function snapProject(snap, id) { if (!(id in snap.projects)) { const p = S.getProject(id); snap.projects[id] = p ? clone(p) : null; } }

  // 경험 페이지에 원문을 엮는다: STAR 칸 채우기/덧붙이기 + 근거 + 키워드
  function compileInto(e, text, opts, changes) {
    const field = inferField(text, opts.question, opts.stage);
    const cur = field === 'insights' ? e.insights : field === 'summary' ? e.summary : e.star[field];
    const add = sentence(text);
    if (!String(cur || '').includes(text.trim().slice(0, 20))) {
      const next = cur && cur.trim() ? `${cur.trim()} ${add}` : add;
      if (field === 'insights') e.insights = next; else e.star[field] = next;
      changes.push({ kind: cur && cur.trim() ? 'append' : 'fill', expId: e.id, field, after: add });
    }
    if (!e.summary && field !== 'summary') { e.summary = short(text, 60); }
    // 새 페이지는 키워드 2개까지, 기존 페이지는 1개만 조심스럽게 보탠다 (최대 5개)
    const room = Math.max(0, Math.min(e.keywords.length ? 1 : 2, 5 - e.keywords.length));
    const kws = (opts.keywords || App.ai.extractKeywords(text)).filter((k) => !e.keywords.includes(k)).slice(0, room);
    if (kws.length) { e.keywords.push(...kws); changes.push({ kind: 'keyword', expId: e.id, after: kws }); }
    if (opts.question || opts.source === 'answer' || opts.source === 'chat') e.qa.push({ q: opts.question || '(직접 기록)', a: text, date: S.localDay(), source: opts.source, qid: opts.questionId || null });
    if (opts.logId && !e.sourceLogIds.includes(opts.logId)) e.sourceLogIds.push(opts.logId);
    (opts.findingIds || []).forEach((f) => { if (!e.codeRefs.includes(f)) e.codeRefs.push(f); });
    if (opts.logId || (opts.findingIds || []).length) changes.push({ kind: 'evidence', expId: e.id, text: opts.logId ? '체크인 기록 연결' : '코드 근거 연결' });
    if (opts.projectId && !e.projectId) { e.projectId = opts.projectId; changes.push({ kind: 'link', expId: e.id, projectId: opts.projectId }); }
    e.updatedAt = S.localDay();
    e.completeness = App.ai.completeness(e);
  }
  function newCard(text, opts, changes) {
    const project = opts.projectId ? S.getProject(opts.projectId) : detectProject(text);
    const finding = opts.finding || null;
    const title = opts.title || (finding ? finding.title : (project ? `「${S.projectName(project)}」 ` : '') + short(text, 24));
    const e = {
      id: uid('e'), title: title.trim(), category: guessCategory(text, project), period: { start: S.localDay().slice(0, 7), end: '' }, status: 'draft',
      projectId: project ? project.id : null, sourceLogIds: [], codeRefs: [], role: project ? (project.role || '') : '', summary: '',
      star: { situation: '', task: '', action: '', result: '' }, insights: '', keywords: [], jobs: [], links: [], qa: [],
      completeness: 0, createdAt: S.localDay(), updatedAt: S.localDay(),
    };
    if (finding) { e.star.action = sentence(finding.bullet || finding.title); e.keywords = (CODE_KW[finding.category] || ['문제해결']).slice(); }
    st().experiences.push(e);
    changes.push({ kind: 'create', expId: e.id });
    if (project) changes.push({ kind: 'link', expId: e.id, projectId: project.id });
    compileInto(e, text, Object.assign({}, opts, { projectId: null }), changes);
    return e;
  }

  function record(source, changes, snap, extra = {}) {
    const entry = Object.assign({ id: uid('w'), date: S.localDay(), at: new Date().toTimeString().slice(0, 5), source, changes, snap, undone: false }, extra);
    st().wikiLog.unshift(entry);
    if (st().wikiLog.length > 200) st().wikiLog.length = 200;
    return entry;
  }

  function done(source, changes, snap, extra) { const e = record(source, changes, snap, extra); persist(); return e; }

  /* ---------- ingest: 모든 기록이 들어오는 단 하나의 입구 ----------
     src = { type: 'answer'|'checkin'|'chat'|'code'|'manual', text, question?, questionId?, stage?, expId?, projectId?, logId?, logType?, findingId?, keywords?, forceNew? }
     반환: wikiLog entry (entry.changes 로 무엇이 바뀌었는지, entry.target 으로 최종 경험) */
  function ingest(src) {
    ensure();
    const text = String(src.text || '').trim();
    const snap = { exps: {}, projects: {} };
    const changes = [];
    let target = null; let decided = 'auto'; let candidates = [];
    const finding = src.findingId ? (S.findFinding(src.findingId) || {}).finding : null;
    const opts = { question: src.question, questionId: src.questionId, stage: src.stage, source: src.type, keywords: src.keywords, logId: src.logId, projectId: src.projectId, findingIds: src.findingId ? [src.findingId] : [], finding, title: src.title };

    if (src.type === 'checkin' && src.projectId) {
      changes.push({ kind: 'log', projectId: src.projectId, text: '타임라인에 기록' });
    }
    if (!text) { return done({ type: src.type, text, question: src.question, questionId: src.questionId, projectId: src.projectId }, changes, snap); }

    // 1) 대상 경험 정하기
    if (src.expId && S.get(src.expId) && !src.forceNew) { target = S.get(src.expId); decided = src.decided || 'question'; }
    else if (finding && !src.forceNew) {
      // 코드 질문의 답: 같은 기술 이야기를 하는 경험이 그 프로젝트에 있으면 거기로, 없으면 코드를 근거로 새 경험
      const hit = codeMatch(finding, src.projectId); if (hit) { target = hit; decided = 'high'; }
      opts.projectId = src.projectId;
    }
    else if (!src.forceNew) {
      const projectId = src.projectId || (detectProject(text) || {}).id || null;
      const m = match(text + ' ' + (finding ? finding.title : ''), { projectId, projectOnly: src.type === 'checkin' || src.type === 'code' });
      candidates = m.candidates.map((e) => e.id);
      const threshold = src.type === 'checkin' ? 'high' : 'mid';
      if (m.best && (m.confidence === 'high' || (threshold === 'mid' && m.confidence === 'mid'))) { target = m.best; decided = m.confidence; }
      if (!projectId) opts.projectId = null; else opts.projectId = projectId;
    }

    // 2) 반영
    if (target) {
      snapExp(snap, target.id);
      compileInto(target, text, opts, changes);
    } else {
      // 체크인 중 '마일스톤'은 타임라인에만 — 경험 페이지는 이야기(결정·문제·협업·배움)가 있을 때 만든다
      if (src.type === 'checkin' && src.logType === 'milestone') {
        return done({ type: src.type, text, question: src.question, questionId: src.questionId, projectId: src.projectId, logId: src.logId }, changes, snap, { candidates });
      }
      const e = newCard(text, opts, changes);
      snap.exps[e.id] = null; target = e; decided = 'new';
    }
    if (src.questionId) { const q = st().inbox.find((x) => x.id === src.questionId); if (q) q.compiledTo = target.id; }
    return done({ type: src.type, text, question: src.question, questionId: src.questionId, projectId: src.projectId, logId: src.logId, findingId: src.findingId }, changes, snap, { target: target.id, decided, candidates: candidates.filter((id) => id !== target.id) });
  }

  // 이 기록 뒤에 같은 경험을 바꾼 기록이 있으면 되돌릴 수 없다 (스냅숏이 나중 변경까지 지워 버리므로)
  function canUndo(entry) {
    if (!entry || entry.undone) return false;
    const ids = Object.keys(entry.snap.exps); if (!ids.length) return false;
    const log = st().wikiLog; const idx = log.indexOf(entry);
    return !log.slice(0, idx).some((w) => !w.undone && Object.keys(w.snap.exps).some((id) => ids.includes(id)));
  }
  // 되돌리기: 이 기록이 위키에 만든 변화만 원래대로 (원문 기록은 남는다)
  function undo(entryId, silent) {
    ensure();
    const entry = st().wikiLog.find((x) => x.id === entryId); if (!canUndo(entry)) return null;
    Object.keys(entry.snap.exps).forEach((id) => {
      const before = entry.snap.exps[id];
      const i = st().experiences.findIndex((e) => e.id === id);
      if (before === null) { if (i >= 0) st().experiences.splice(i, 1); }
      else if (i >= 0) st().experiences[i] = clone(before); else st().experiences.push(clone(before));
    });
    Object.keys(entry.snap.projects).forEach((id) => {
      const before = entry.snap.projects[id]; const i = st().projects.findIndex((p) => p.id === id);
      if (before && i >= 0) st().projects[i] = clone(before);
    });
    entry.undone = true;
    if (entry.source.questionId) { const q = st().inbox.find((x) => x.id === entry.source.questionId); if (q) delete q.compiledTo; }
    if (!silent) { persist(); }
    return entry;
  }
  // 다른 경험으로 옮기기 (toExpId=null 이면 새 경험으로 분리)
  function reroute(entryId, toExpId) {
    const entry = undo(entryId, true); if (!entry) return null;
    const src = Object.assign({}, entry.source, toExpId ? { expId: toExpId, decided: 'user' } : { forceNew: true, expId: null });
    if (src.logId) { const p = S.getProject(src.projectId); const log = p && p.logs.find((l) => l.id === src.logId); src.logType = log ? log.type : src.logType; }
    const next = ingest(src); next.decided = toExpId ? 'user' : 'new'; next.rerouteOf = entry.id;
    persist(); return next;
  }

  // 화면 밖에서 직접 고친 경우(AI 대화·직접 작성)도 변경 기록에 남긴다
  function recordEdit(type, expId, before, opts = {}) {
    ensure();
    const e = S.get(expId); if (!e) return null;
    const changes = [];
    if (!before) changes.push({ kind: 'create', expId });
    ['situation', 'task', 'action', 'result'].forEach((f) => {
      const a = (before && before.star && before.star[f]) || ''; const b = e.star[f] || '';
      if (a !== b) changes.push({ kind: a ? 'append' : 'fill', expId, field: f, after: b.startsWith(a) ? b.slice(a.length).trim() || b : b });
    });
    if (((before && before.insights) || '') !== (e.insights || '')) changes.push({ kind: before && before.insights ? 'append' : 'fill', expId, field: 'insights', after: e.insights });
    const newKw = e.keywords.filter((k) => !((before && before.keywords) || []).includes(k));
    if (newKw.length) changes.push({ kind: 'keyword', expId, after: newKw });
    if (e.projectId && (!before || before.projectId !== e.projectId)) changes.push({ kind: 'link', expId, projectId: e.projectId });
    const newCode = (e.codeRefs || []).filter((f) => !((before && before.codeRefs) || []).includes(f));
    newCode.forEach((fid) => { const ff = S.findFinding(fid); changes.push({ kind: 'evidence', expId, text: `코드 근거 「${short(ff ? ff.finding.title : fid, 30)}」` }); });
    if (!changes.length) return null;
    const snap = { exps: { [expId]: before ? clone(before) : null }, projects: {} };
    const entry = record({ type, text: opts.text || '', question: opts.question || '' }, changes, snap, { target: expId, decided: before ? 'edit' : 'new' });
    persist(); return entry;
  }

  // 체크인 로그 하나를 위키에 반영 (트래커에서 직접 기록했을 때 / 아직 경험이 안 된 기록 정리)
  function ingestLog(projectId, logId) {
    const p = S.getProject(projectId); const log = p && p.logs.find((l) => l.id === logId); if (!log) return null;
    const entry = ingest({ type: 'checkin', text: log.text, projectId, logId, logType: log.type, keywords: log.keywords, question: log.fromQuestion || '' });
    persist(); return entry;
  }

  // 코드 분석 결과를 위키에 반영: 맞는 경험이 있으면 코드 근거로 붙이고, 없으면 "왜 이렇게 만들었는지" 질문을 예약
  function ingestCode(projectId, findings) {
    ensure();
    const p = S.getProject(projectId); if (!p) return null;
    const snap = { exps: {}, projects: {} }; const changes = [];
    let asked = 0;
    (findings || []).filter((f) => f.status !== 'dismissed').forEach((f) => {
      if (st().experiences.some((e) => (e.codeRefs || []).includes(f.id))) return;
      const hit = codeMatch(f, projectId);
      if (hit) {
        snapExp(snap, hit.id);
        hit.codeRefs.push(f.id);
        changes.push({ kind: 'evidence', expId: hit.id, text: `코드 근거 「${short(f.title, 30)}」` });
      } else if (asked < 2 && !st().inbox.some((q) => q.findingId === f.id && q.status !== 'skipped')) {
        const q = codeQuestion(p, f); st().inbox.unshift(q); asked++;
        changes.push({ kind: 'question', questionId: q.id, text: q.text });
      }
    });
    const entry = record({ type: 'code', text: `${(p.repo && p.repo.name) || '레포'} 분석 · 발견 ${(findings || []).length}개`, projectId }, changes, snap);
    persist(); return entry;
  }
  function codeQuestion(p, f) {
    const short2 = `「${S.projectName(p)}」`;
    return {
      id: uid('q'), type: 'code', status: 'pending', askedAt: S.localDay() + ' ' + new Date().toTimeString().slice(0, 5),
      targetProjectId: p.id, targetExpId: null, findingId: f.id,
      text: `${short2} 코드에서 「${f.title}」를 찾았어요. 왜 이렇게 만들게 됐나요?`,
      hint: '어떤 문제가 있었는지 한두 줄이면 돼요. 답하면 이 코드가 근거로 붙은 경험이 만들어져요.',
    };
  }

  /* ---------- 위키 점검 (lint) ----------
     issue = { id, kind, severity:1~3, text, expId?, projectId?, logId?, findingId?, question?:{ text, stage, ... }, action?:'compileLog'|'link' } */
  function lint() {
    ensure();
    const out = [];
    const exps = st().experiences;
    exps.forEach((e) => {
      const brief = `「${short(e.title.replace(/[「」]/g, ''), 22)}」`;
      if (!e.star.result) out.push({ id: 'nr_' + e.id, kind: 'no-result', severity: 3, expId: e.id, text: `${brief}에 결과가 비어 있어요`, question: { text: `${short(e.title, 30)} — 그 결과 무엇이 달라졌나요?`, stage: 'result', targetExpId: e.id } });
      else if (!/\d/.test(e.star.result)) out.push({ id: 'nn_' + e.id, kind: 'no-number', severity: 2, expId: e.id, text: `${brief}의 결과에 숫자가 없어요`, question: { text: `${short(e.title, 30)} — 결과를 숫자로 말해 본다면요? (시간, 건수, 사람 수…)`, stage: 'result', targetExpId: e.id } });
      if (!e.star.action) out.push({ id: 'na_' + e.id, kind: 'no-action', severity: 3, expId: e.id, text: `${brief}에서 내가 한 행동이 아직 없어요`, question: { text: `${short(e.title, 30)} — 그때 가장 먼저 한 행동은 무엇이었나요?`, stage: 'action', targetExpId: e.id } });
      if (!e.projectId && e.category === '프로젝트') { const p = detectProject(e.title + ' ' + e.summary); if (p) out.push({ id: 'lk_' + e.id, kind: 'unlinked', severity: 1, expId: e.id, projectId: p.id, action: 'link', text: `${brief}이 「${S.projectName(p)}」 이야기 같아요. 프로젝트에 연결할까요?` }); }
    });
    st().projects.forEach((p) => {
      const used = new Set(exps.flatMap((e) => e.sourceLogIds || []));
      (p.logs || []).filter((l) => l.type !== 'milestone' && !used.has(l.id)).forEach((l) => {
        out.push({ id: 'ol_' + l.id, kind: 'orphan-log', severity: 2, projectId: p.id, logId: l.id, action: 'compileLog', text: `「${S.projectName(p)}」 체크인 "${short(l.text, 28)}"이 아직 경험에 반영되지 않았어요` });
      });
      const linked = new Set(exps.flatMap((e) => e.codeRefs || []));
      ((p.repo && p.repo.findings) || []).filter((f) => f.status !== 'dismissed' && !linked.has(f.id)).forEach((f) => {
        out.push({ id: 'cf_' + f.id, kind: 'code-unlinked', severity: f.confidence === 'high' ? 2 : 1, projectId: p.id, findingId: f.id, text: `코드 분석 「${short(f.title, 28)}」을 뒷받침할 경험 이야기가 없어요`, question: codeQuestion(p, f) });
      });
    });
    // 지원 기업이 요구하는 역량 중 근거가 없는 것
    const counts = App.keywords.counts();
    const wanted = new Set((st().applications || []).filter((a) => a.status === 'preparing' || a.status === 'applied').flatMap((a) => (a.competencies || []).map((c) => c.name)));
    wanted.forEach((k) => { if (!counts[k]) { const kk = App.keywords.get(k); out.push({ id: 'kw_' + k, kind: 'no-evidence', severity: 2, keyword: k, text: `지원 기업이 찾는 #${k}을 보여 줄 경험이 아직 없어요`, question: { text: `최근에 ${String(kk.desc || k).replace(/ 경험$/, ' 적이 있나요?')}`, type: 'recall' } }); } });
    return out.sort((a, b) => b.severity - a.severity);
  }
  // 점검 항목을 오늘의 질문으로 받기
  function askIssue(issue) {
    if (!issue || !issue.question) return null;
    const open = (q) => q.status === 'pending' || q.status === 'later';
    const qi = issue.question;
    const exists = st().inbox.find((q) => open(q) && (q.lintId === issue.id
      || (qi.targetExpId && q.targetExpId === qi.targetExpId && (!qi.stage || !q.stage || q.stage === qi.stage))
      || (qi.findingId && q.findingId === qi.findingId)));
    if (exists) return exists;
    const qq = issue.question;
    const q = Object.assign({ id: uid('q'), status: 'pending', askedAt: S.localDay() + ' ' + new Date().toTimeString().slice(0, 5), hint: '' },
      qq.findingId ? qq : { type: qq.type || (qq.targetExpId ? 'deepen' : 'recall'), text: qq.text, targetExpId: qq.targetExpId || null, stage: qq.stage || null, hint: qq.targetExpId ? '답하면 이 경험의 비어 있는 칸이 채워져요.' : '' },
      { lintId: issue.id });
    st().inbox.unshift(q); persist(); return q;
  }
  function fixIssue(issue) {
    if (issue.action === 'compileLog') return ingestLog(issue.projectId, issue.logId);
    if (issue.action === 'link') { const before = clone(S.get(issue.expId)); S.get(issue.expId).projectId = issue.projectId; return recordEdit('manual', issue.expId, before); }
    return null;
  }
  // 하루 한 번, 질문함이 비어 갈 때 위키의 빈 곳에서 질문 하나를 자동으로 만든다 (코드 분석 → 빈 결과 순)
  function autoQueue() {
    ensure();
    const today = S.localDay();
    if (st().wikiMeta.lastQueue === today) return;
    if (st().inbox.filter((q) => q.status === 'pending').length >= 3) return;
    st().wikiMeta.lastQueue = today;
    const issue = lint().find((i) => i.question && (i.kind === 'code-unlinked' || i.kind === 'no-result' || i.kind === 'no-number'));
    if (issue) askIssue(issue); else persist();
  }

  // ---------- 조회 ----------
  function entries(filter = {}) {
    ensure();
    return st().wikiLog.filter((w) => !w.undone && (!filter.expId || w.target === filter.expId || w.changes.some((c) => c.expId === filter.expId)) && (!filter.projectId || w.source.projectId === filter.projectId || w.changes.some((c) => c.projectId === filter.projectId)));
  }
  // 경험 페이지의 모든 출처를 한 줄로 (답변·대화·체크인·코드)
  function sourcesOf(e) {
    const out = [];
    (e.qa || []).forEach((x) => out.push({ type: x.source || 'answer', date: x.date, q: x.q, text: x.a }));
    const p = e.projectId && S.getProject(e.projectId);
    (e.sourceLogIds || []).forEach((id) => { const l = p && p.logs.find((x) => x.id === id); if (l) out.push({ type: 'checkin', date: l.date, q: l.fromQuestion || '', text: l.text, logType: l.type, href: '#/projects/' + p.id }); });
    (e.codeRefs || []).forEach((fid) => { const ff = S.findFinding(fid); if (ff) out.push({ type: 'code', date: (ff.project.repo.analyzedAt || '').slice(0, 10), q: ff.finding.category, text: ff.finding.title, finding: ff.finding, href: '#/projects/' + ff.project.id + '?tab=code' }); });
    return out.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }
  function cardsForFinding(fid) { return st().experiences.filter((e) => (e.codeRefs || []).includes(fid)); }
  function stats() {
    ensure();
    const exps = st().experiences;
    return { pages: exps.length, projects: st().projects.length, sources: exps.reduce((n, e) => n + sourcesOf(e).length, 0), issues: lint().length, updatesThisWeek: entries().filter((w) => (Date.now() - new Date(w.date + 'T00:00:00')) < 7 * 864e5).length };
  }

  function persist() { S.touch(); }

  /* ---------- 반영 결과 UI (모든 입력 화면이 같이 쓴다) ---------- */
  const esc = (s) => App.ui.esc(s);
  function changeLine(c) {
    const e = c.expId && S.get(c.expId); const t = e ? `「${esc(short(e.title.replace(/[「」]/g, ''), 30))}」` : '';
    const p = c.projectId && S.getProject(c.projectId); const pt = p ? esc(`「${S.projectName(p)}」`) : '';
    switch (c.kind) {
      case 'create': return `<li class="wk-ch wk-create"><span class="wk-ico">＋</span><span>새 경험 ${t} 을 만들었어요</span></li>`;
      case 'fill': return `<li class="wk-ch"><span class="wk-ico">✎</span><span>${t} <b>${FIELD_LABEL[c.field] || c.field}</b> 칸을 채웠어요<q>${esc(short(c.after, 70))}</q></span></li>`;
      case 'append': return `<li class="wk-ch"><span class="wk-ico">✎</span><span>${t} <b>${FIELD_LABEL[c.field] || c.field}</b>에 덧붙였어요<q>${esc(short(c.after, 70))}</q></span></li>`;
      case 'keyword': return `<li class="wk-ch"><span class="wk-ico">#</span><span>${t} 역량 ${c.after.map((k) => App.ui.keywordChip(k)).join(' ')}</span></li>`;
      case 'evidence': return `<li class="wk-ch"><span class="wk-ico">↳</span><span>${t} ${esc(c.text || '근거 연결')}</span></li>`;
      case 'link': return `<li class="wk-ch"><span class="wk-ico">▤</span><span>${t || '경험'} → ${pt} 프로젝트에 연결</span></li>`;
      case 'log': return `<li class="wk-ch"><span class="wk-ico">▤</span><span>${pt} 타임라인에 기록했어요</span></li>`;
      case 'question': return `<li class="wk-ch"><span class="wk-ico">✉</span><span>오늘의 질문 예약<q>${esc(short(c.text, 70))}</q></span></li>`;
      default: return '';
    }
  }
  // entry → "위키에 반영했어요" 카드. opts.compact: 홈/피드용 한 줄 요약
  function reportHTML(entry, opts = {}) {
    if (!entry) return '';
    const tgt = entry.target && S.get(entry.target);
    const head = entry.undone ? (entry.source.type === 'chat' || entry.source.type === 'manual' ? '되돌렸어요 — 이 수정 전 상태로 돌아갔어요' : '되돌렸어요 — 원문 기록만 남아 있어요')
      : entry.decided === 'new' ? '새 경험으로 위키에 추가했어요'
      : entry.decided === 'question' || entry.decided === 'edit' ? '이 경험 페이지에 반영했어요'
      : entry.decided === 'user' ? '고른 경험에 반영했어요'
      : tgt ? '비슷한 경험을 찾아 거기에 반영했어요'
      : entry.source.type === 'code' ? (entry.changes.length ? '코드 분석 결과를 위키에 반영했어요' : '새로 연결할 경험이 없어요 — 발견 항목은 코드 분석 탭에 그대로 있어요')
      : entry.changes.some((c) => c.kind === 'log') ? '타임라인에 기록했어요 — 결정·문제·협업 이야기가 생기면 경험으로 정리돼요' : '위키에 기록했어요';
    if (opts.compact) {
      return `<div class="wk-feed-item" ${tgt ? `data-href="#/card/${tgt.id}"` : ''}>
        <span class="wk-src" title="${esc(SOURCE_LABEL[entry.source.type] || '')}">${SOURCE_ICO[entry.source.type] || '•'}</span>
        <div class="wk-feed-body"><div class="wk-feed-t">${tgt ? `「${esc(short(tgt.title.replace(/[「」]/g, ''), 28))}」` : esc(SOURCE_LABEL[entry.source.type] || '기록')} <span class="subtle">${esc(summaryText(entry))}</span></div>
        <div class="subtle wk-feed-meta">${esc(SOURCE_LABEL[entry.source.type] || '')} · ${esc(entry.date.slice(5).replace('-', '.'))}</div></div></div>`;
    }
    const alts = (entry.candidates || []).map((id) => S.get(id)).filter(Boolean).slice(0, 3);
    // AI 대화·직접 작성은 여러 칸을 한꺼번에 고친 것이라 옮기기 대신 되돌리기만
    const canMove = canUndo(entry) && tgt && entry.source.text && entry.source.type !== 'chat' && entry.decided !== 'edit';
    return `<div class="wk-report ${entry.undone ? 'is-undone' : ''}" data-wk-entry="${entry.id}">
      <div class="wk-report-head"><span class="wk-badge">위키 반영</span><b>${esc(head)}</b></div>
      ${entry.undone ? '' : `<ul class="wk-changes">${entry.changes.map(changeLine).join('')}</ul>`}
      ${canMove ? `<div class="wk-report-move">
        <span class="subtle">${entry.decided === 'new' ? '이미 있는 경험 이야기였나요?' : '다른 경험 이야기였나요?'}</span>
        <select class="input wk-move-sel" data-wk-move>
          <option value="">옮기기…</option>
          ${entry.decided !== 'new' ? '<option value="__new">＋ 새 경험으로 분리</option>' : ''}
          ${(alts.length ? alts : S.list().filter((e) => e.id !== tgt.id).slice(0, 6)).map((e) => `<option value="${e.id}">「${esc(short(e.title.replace(/[「」]/g, ''), 26))}」에 반영</option>`).join('')}
        </select>
      </div>` : ''}
      <div class="wk-report-foot">
        ${canUndo(entry) && entry.changes.some((c) => c.expId) ? `<button class="btn btn-ghost btn-sm" data-wk-undo>되돌리기</button>` : !entry.undone && entry.changes.some((c) => c.expId) ? `<span class="subtle" style="font-size:12px;align-self:center">이후 다른 기록이 이 경험을 바꿔서 되돌릴 수 없어요</span>` : ''}
        ${tgt && !entry.undone ? `<a class="btn btn-sm" href="#/card/${tgt.id}">경험 페이지 보기 →</a>` : ''}
      </div>
    </div>`;
  }
  function summaryText(entry) {
    const c = entry.changes;
    if (c.some((x) => x.kind === 'create')) return '새 경험';
    const f = c.filter((x) => x.kind === 'fill' || x.kind === 'append').map((x) => FIELD_LABEL[x.field]).filter(Boolean);
    if (f.length) return f.join('·') + ' 보강';
    if (c.some((x) => x.kind === 'evidence')) return '근거 추가';
    if (c.some((x) => x.kind === 'question')) return '질문 ' + c.filter((x) => x.kind === 'question').length + '개 예약';
    if (c.some((x) => x.kind === 'log')) return '타임라인 기록';
    return '수정';
  }
  // reportHTML 을 넣은 root 에 되돌리기/옮기기 동작 연결. onChange(newEntry) 로 화면이 다시 그린다
  function bindReport(root, onChange) {
    if (!root) return;
    root.querySelectorAll('[data-wk-entry]').forEach((box) => {
      const id = box.getAttribute('data-wk-entry');
      const u = box.querySelector('[data-wk-undo]');
      if (u) u.onclick = (ev) => { ev.preventDefault(); ev.stopPropagation(); const r = undo(id); App.ui.toast('위키 반영을 되돌렸어요. 원문 기록은 남아 있어요.'); onChange && onChange(r); };
      const sel = box.querySelector('[data-wk-move]');
      if (sel) sel.onchange = () => { if (!sel.value) return; const r = reroute(id, sel.value === '__new' ? null : sel.value); App.ui.toast(sel.value === '__new' ? '새 경험으로 분리했어요' : '고른 경험에 반영했어요'); onChange && onChange(r); };
    });
  }

  App.wiki = { canUndo, ingest, ingestLog, ingestCode, recordEdit, undo, reroute, match, detectProject, inferField, lint, askIssue, fixIssue, autoQueue, entries, sourcesOf, cardsForFinding, stats, reportHTML, bindReport, codeQuestion, get: (id) => (st().wikiLog || []).find((w) => w.id === id) || null, SOURCE_LABEL, SOURCE_ICO, FIELD_LABEL, short };
  ensure();
  // 시드: 이미 분석된 레포의 발견 항목 중 같은 이야기를 하는 경험이 있으면 코드 근거로 조용히 연결
  if (!st().wikiMeta.seededCode) {
    st().projects.forEach((p) => ((p.repo && p.repo.findings) || []).forEach((f) => {
      const hit = codeMatch(f, p.id);
      if (hit && !hit.codeRefs.includes(f.id)) hit.codeRefs.push(f.id);
    }));
    st().wikiMeta.seededCode = true;
  }
})(window.App);
