/* 프로젝트 — #/projects (목록), #/projects/:id (상세)
   프로젝트 페이지는 위키의 허브: 이 프로젝트의 경험 페이지 + 타임라인(원문 체크인) + 코드 분석이 한곳에서 이어진다. */
(function (App) {
  const esc = (s) => App.ui.esc(s);

  const TYPES = {
    decision: { label: '의사결정', ico: '◆' },
    issue: { label: '이슈·문제해결', ico: '!' },
    collab: { label: '협업', ico: '⇄' },
    milestone: { label: '마일스톤', ico: '⚑' },
    learning: { label: '배움', ico: '✎' },
  };
  const TYPE_ORDER = ['decision', 'issue', 'collab', 'milestone', 'learning'];
  const CADENCE = { daily: [1, '매일'], every2days: [2, '이틀마다'], weekly: [7, '매주'] };

  /* ---------- 날짜 유틸 (로컬 기준) ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  const toDate = (s) => { const [y, m, d] = String(s || '').split('-').map(Number); return new Date(y || 1970, (m || 1) - 1, d || 1); };
  const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const todayD = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
  const daysBetween = (a, b) => Math.round((b - a) / 86400000);
  const md = (s) => { const d = toDate(s); return `${d.getMonth() + 1}월 ${d.getDate()}일`; };
  const ago = (s) => {
    const n = daysBetween(toDate(s), todayD());
    if (n <= 0) return '오늘'; if (n === 1) return '어제'; if (n < 7) return `${n}일 전`;
    if (n < 30) return `${Math.floor(n / 7)}주 전`; return `${Math.floor(n / 30)}개월 전`;
  };
  const weekStart = (s) => { const d = toDate(s); const dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow); return d; };
  const weekLabel = (ws) => {
    const cur = weekStart(fmt(todayD()));
    const diff = Math.round(daysBetween(ws, cur) / 7);
    const end = new Date(ws); end.setDate(end.getDate() + 6);
    const range = `${ws.getMonth() + 1}.${pad(ws.getDate())} – ${end.getMonth() + 1}.${pad(end.getDate())}`;
    if (diff === 0) return ['이번 주', range]; if (diff === 1) return ['지난 주', range];
    return [`${ws.getMonth() + 1}월 ${Math.ceil(ws.getDate() / 7)}째 주`, range];
  };

  /* ---------- 프로젝트 파생 데이터 ---------- */
  const sortedLogs = (e) => (e.logs || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const lastLog = (e) => sortedLogs(e)[0] || null;
  // 체크인 일정은 store 와 공유 (오늘의 질문함과 같은 기준)
  function nextCheckin(e) {
    const [, label] = CADENCE[App.store.state.settings.projectCheckin] || CADENCE.every2days;
    const { dueDate, last } = App.store.checkinDue(e);
    if (App.store.openCheckin(e.id)) return { due: true, text: last ? '오늘 체크인할 차례예요' : '첫 체크인을 남겨 주세요', label };
    if (!last) return { due: true, text: '첫 체크인을 남겨 주세요', label };
    const next = toDate(dueDate);
    const diff = daysBetween(todayD(), next);
    if (diff <= 0) return { due: true, text: '오늘 체크인할 차례예요', label };
    return { due: false, text: diff === 1 ? '내일 체크인' : `${diff}일 뒤 체크인 (${next.getMonth() + 1}/${next.getDate()})`, label };
  }
  function logKeywordCounts(e) {
    const m = {};
    (e.logs || []).forEach((l) => (l.keywords || []).forEach((k) => { m[k] = (m[k] || 0) + 1; }));
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }
  function typeCounts(e) {
    const m = {}; TYPE_ORDER.forEach((t) => { m[t] = 0; });
    (e.logs || []).forEach((l) => { m[l.type] = (m[l.type] || 0) + 1; });
    return m;
  }
  const topKeywords = (e, n) => logKeywordCounts(e).map(([k]) => k).slice(0, n);
  // 로그 id → 그 로그가 반영된 경험들
  function cardsByLog(p) {
    const m = {}; const ids = new Set((p.logs || []).map((l) => l.id));
    App.store.list().forEach((c) => (c.sourceLogIds || []).forEach((lid) => { if (ids.has(lid)) (m[lid] = m[lid] || []).push(c); }));
    return m;
  }
  const orphanLogs = (p) => { const used = cardsByLog(p); return (p.logs || []).filter((l) => !used[l.id] && l.type !== 'milestone'); };
  const short = (t, n) => App.wiki.short(t, n);
  const shortName = (t) => { const m = String(t || '').match(/「[^」]+」/); return m ? m[0] : String(t || '').split(' — ')[0]; };
  const ghLink = (e) => (e.links || []).find((l) => /github/i.test(l)) || (e.links || [])[0] || '';
  const prettyLink = (u) => String(u).replace(/^https?:\/\//, '').replace(/\/$/, '');

  /* ---------- 목록 ---------- */
  function projectCard(e) {
    const last = lastLog(e); const nx = nextCheckin(e);
    return `<div class="card pj-card" data-href="#/projects/${esc(e.id)}">
      <div class="pj-card-top">${App.ui.statusTag(e.status)}<span class="subtle">${App.ui.period(e.period)}</span>
        ${e.status === 'ongoing' ? `<span class="pj-due ${nx.due ? 'is-due' : ''}">${nx.due ? '● ' : ''}${esc(nx.text)}</span>` : ''}</div>
      <div class="pj-card-title">${esc(e.title)}</div>
      <div class="pj-card-role">${esc(e.role || '역할 미입력')}</div>
      ${e.repo ? (() => { const live = liveFindings(e.repo); const added = live.filter((f) => f.status === 'added').length;
        return `<a class="pj-card-gh" href="#/projects/${esc(e.id)}?tab=code" title="${esc(e.repo.owner + '/' + e.repo.name)} 코드 분석 결과"><span>⌥ 코드 분석 ${live.length}</span>${added ? `<span class="pj-card-gh-n">이력서에 ${added}개 담음</span>` : ''}</a>`; })() : ''}
      <div class="pj-card-stats">
        <div><b>${(e.logs || []).length}</b><span>기록</span></div>
        <div><b>${App.store.cardsOf(e.id).length}</b><span>경험</span></div>
        <div><b>${last ? esc(md(last.date)) : '—'}</b><span>마지막 체크인${last ? ` · ${ago(last.date)}` : ''}</span></div>
      </div>
      <div class="exp-card-kws">${topKeywords(e, 4).map((k) => App.ui.keywordChip(k)).join('') || '<span class="subtle">체크인을 남기면 역량 키워드가 생겨요</span>'}</div>
    </div>`;
  }
  function renderList() {
    const all = App.store.projects();
    const ongoing = all.filter((e) => e.status !== 'done');
    const done = all.filter((e) => e.status === 'done');
    const [, cadLabel] = CADENCE[App.store.state.settings.projectCheckin] || CADENCE.every2days;
    const dueCount = ongoing.filter((e) => nextCheckin(e).due).length;
    return `<div class="page pj">
      <div class="page-head pj-head">
        <div><h1>프로젝트</h1><p>짧게 체크인하면 타임라인에 기록되고, AI가 관련 경험 페이지에 반영해요. 코드 분석도 같은 경험에 근거로 붙어요.</p></div>
        <button class="btn btn-primary" data-pj="new">＋ 새 프로젝트 시작</button>
      </div>
      <div class="pj-value">
        <div class="pj-value-ico">⚑</div>
        <div class="pj-value-body"><b>결과물은 GitHub에 남지만, 과정은 지금 기록해야 남아요.</b>
          <span>${esc(cadLabel)} 체크인 질문을 하나씩 드릴게요. 한두 줄이면 충분해요. <a class="pj-link" href="#/settings">주기 바꾸기</a></span></div>
        ${dueCount ? `<span class="pj-value-pill">오늘 체크인 ${dueCount}개</span>` : ''}
      </div>
      <div class="section-title">진행 중 <span class="subtle">${ongoing.length}</span></div>
      ${ongoing.length ? `<div class="pj-grid">${ongoing.map(projectCard).join('')}
        <button class="pj-card-new" data-pj="new"><span>＋</span>새 프로젝트 시작</button></div>`
        : `<div class="card empty pj-empty"><div class="big">▤</div><div>지금 진행 중인 프로젝트가 있나요?</div>
          <div class="subtle" style="margin:4px 0 16px">팀 프로젝트, 사이드 프로젝트, 과제 무엇이든 좋아요.</div>
          <button class="btn btn-primary" data-pj="new">＋ 첫 프로젝트 시작하기</button></div>`}
      ${done.length ? `<div class="section-title" style="margin-top:32px">마무리한 프로젝트 <span class="subtle">${done.length}</span></div>
        <div class="pj-grid">${done.map(projectCard).join('')}</div>` : ''}
    </div>`;
  }

  function openNewModal() {
    const n = new Date(); const month = `${n.getFullYear()}-${pad(n.getMonth() + 1)}`;
    App.ui.modal({
      title: '새 프로젝트 시작하기',
      confirmText: '프로젝트 만들기',
      body: `<div class="pj-form">
        <p class="pj-form-intro">진행하는 동안 체크인 질문을 보내 드릴게요. 답한 기록은 타임라인에 쌓이고, 이야기마다 경험 페이지로 정리돼요.</p>
        <label class="label" for="pj-f-title">프로젝트 이름 <span class="pj-req">*</span></label>
        <input class="input" id="pj-f-title" placeholder="예) 팀 프로젝트 「모여봄」" maxlength="60" />
        <label class="label" for="pj-f-role">내 역할</label>
        <input class="input" id="pj-f-role" placeholder="예) 백엔드 (Spring Boot), 4인 팀" maxlength="60" />
        <label class="label" for="pj-f-start">시작한 달</label>
        <input class="input" id="pj-f-start" type="month" value="${month}" />
        <label class="label" for="pj-f-gh">GitHub 레포 <span class="subtle">(선택)</span></label>
        <input class="input" id="pj-f-gh" placeholder="https://github.com/owner/repo" spellcheck="false" />
        <label class="pj-form-check"><input type="checkbox" id="pj-f-analyze" checked /> 만들고 바로 코드 분석하기</label>
        <p class="subtle pj-form-note">레포를 분석하면 코드에서 찾은 기술 포인트가 이 프로젝트의 경험에 근거로 붙고, 아직 이야기가 없는 코드는 오늘의 질문으로 여쭤봐요.</p>
      </div>`,
      onConfirm(root) {
        const v = (id) => (root.querySelector('#' + id).value || '').trim();
        const title = v('pj-f-title');
        if (!title) { App.ui.toast('프로젝트 이름을 알려 주세요'); root.querySelector('#pj-f-title').focus(); return false; }
        const role = v('pj-f-role'); const gh = v('pj-f-gh');
        const exp = App.store.createProject({
          status: 'ongoing', title, role,
          period: { start: v('pj-f-start') || month, end: '' }, links: gh ? [gh] : [],
        });
        App.store.addLog(exp.id, { type: 'milestone', text: `프로젝트 시작!${role ? ' 역할: ' + role : ''}` });
        const isRepo = gh && App.github && App.github.parseUrl(gh);
        const now = isRepo && root.querySelector('#pj-f-analyze').checked;
        if (isRepo) ui.tab[exp.id] = 'code';
        if (now) ui.autoAnalyze = { pid: exp.id, url: gh };
        App.ui.toast(now ? '프로젝트를 만들었어요 · 레포 코드를 분석하고 있어요' : isRepo ? '프로젝트를 만들었어요 · 코드 분석 탭에서 레포를 분석할 수 있어요' : '프로젝트를 만들었어요');
        App.navigate('#/projects/' + exp.id);
        return true;
      },
    });
    setTimeout(() => { const el = document.getElementById('pj-f-title'); if (el) el.focus(); }, 30);
  }

  /* ---------- 상세 ---------- */
  // 화면 상태 (프로젝트별 질문 인덱스)
  // tab: 프로젝트별 'exp'|'timeline'|'code', gh: 레포 분석 화면 상태
  // report: { pid, id(위키 반영 entry), where:'code' } — 코드 분석을 위키에 반영한 결과를 그 자리에 보여 준다
  // logTalk / codeTalk: 타임라인 기록·코드 항목 아래에 열어 둔 기록 대화 (logId / findingId)
  // autoAnalyze: { pid, url } — 새 프로젝트를 만들며 레포를 넣었으면 상세 화면에 들어가자마자 분석
  const ui = { qIndex: {}, type: {}, typeQ: {}, edit: null, tab: {}, gh: {}, ghView: null, report: null, logTalk: null, codeTalk: null, autoAnalyze: null };
  const reportAt = (pid, where) => {
    const r = ui.report; if (!r || r.pid !== pid || r.where !== where) return '';
    return App.wiki.reportHTML(App.wiki.get(r.id));
  };

  /* ---------- 역량 키워드 편집기 (로그 수정) ----------
     selected = 직접 고른 것(manual) ∪ (AI 추천(suggested) − 사용자가 뺀 것(rejected))
     AI 추천은 자동으로 선택되지만, 빼면 다시 자동으로 들어오지 않는다. */
  const uniq = (a) => [...new Set(a)];
  const kwNew = (manual = [], suggested = []) => ({
    manual: manual.slice(), suggested: suggested.slice(), rejected: suggested.filter((k) => !manual.includes(k)), open: false,
  });
  const kwSelected = (st) => uniq(st.manual.concat(st.suggested.filter((k) => !st.rejected.includes(k))));
  function kwAdd(st, k) { k = String(k || '').replace(/^#/, '').trim(); if (!k) return; st.rejected = st.rejected.filter((x) => x !== k); if (!st.manual.includes(k)) st.manual.push(k); }
  function kwRemove(st, k) { st.manual = st.manual.filter((x) => x !== k); if (st.suggested.includes(k) && !st.rejected.includes(k)) st.rejected.push(k); }
  function kwEditor(st, scope) {
    const sel = kwSelected(st);
    const dismissed = st.suggested.filter((k) => st.rejected.includes(k) && !sel.includes(k));
    const others = App.keywords.all().map((k) => k.name).filter((k) => !sel.includes(k));
    const isAi = (k) => st.suggested.includes(k) && !st.manual.includes(k);
    return `<div class="pj-kwed" data-kw-scope="${scope}">
      <div class="pj-kwed-row">
        <span class="pj-kwed-label">역량 키워드</span>
        ${sel.map((k) => `<span class="kw pj-kwed-chip" data-tone="${App.keywords.tone(k)}">#${esc(k)}${isAi(k) ? '<span class="pj-kwed-ai" title="AI가 찾은 키워드">AI</span>' : ''}<button type="button" class="pj-kwed-x" data-kwact="remove" data-k="${esc(k)}" aria-label="#${esc(k)} 빼기">×</button></span>`).join('')}
        ${dismissed.map((k) => `<button type="button" class="pj-kwed-sug" data-kwact="add" data-k="${esc(k)}" title="다시 넣기">＋ #${esc(k)}</button>`).join('')}
        <button type="button" class="pj-kwed-add ${st.open ? 'on' : ''}" data-kwact="picker">${st.open ? '닫기' : '＋ 직접 고르기'}</button>
      </div>
      ${!sel.length && !dismissed.length && !st.open ? '<div class="pj-kwed-hint">쓰는 동안 AI가 역량을 찾아 넣어 드려요. 마음에 안 들면 ×로 빼고, 직접 고를 수도 있어요.</div>' : ''}
      ${sel.length && st.suggested.length ? '<div class="pj-kwed-hint">AI 표시는 자동으로 찾은 키워드예요. 아니다 싶으면 ×로 빼 주세요.</div>' : ''}
      ${st.open ? `<div class="pj-kwed-picker">
        ${others.map((k) => `<button type="button" class="pj-kwed-opt" data-tone="${App.keywords.tone(k)}" data-kwact="add" data-k="${esc(k)}" title="${esc(App.keywords.get(k).desc)}">#${esc(k)}</button>`).join('')}
        <input class="input pj-kwed-input" data-kw-input placeholder="목록에 없으면 입력 후 Enter" maxlength="12" />
      </div>` : ''}
    </div>`;
  }

  function pickInitialQuestion(e) {
    // AI가 가장 덜 기록된 유형의 질문부터 골라요
    const c = typeCounts(e); const Q = window.SEED.projectCheckins;
    let best = 0;
    Q.forEach((q, i) => { if ((c[q.type] || 0) < (c[Q[best].type] || 0)) best = i; });
    return best;
  }
  function currentQ(e) {
    // 체크인할 때가 됐으면 오늘의 질문함에 도착한 바로 그 질문을 보여 준다
    const oq = App.store.openCheckin(e.id);
    if (oq) {
      // 질문이 바뀔 때만 유형을 질문에 맞추고, 그 뒤 사용자가 고른 유형은 그대로 둔다
      const k = oq.id + ':' + oq.checkinType;
      if (ui.typeQ[e.id] !== k) { ui.type[e.id] = oq.checkinType || 'milestone'; ui.typeQ[e.id] = k; }
      return { type: oq.checkinType, text: oq.checkinText || oq.text, inbox: oq }; }
    const Q = window.SEED.projectCheckins;
    if (ui.qIndex[e.id] == null) ui.qIndex[e.id] = pickInitialQuestion(e);
    const q = Q[ui.qIndex[e.id] % Q.length];
    if (!ui.type[e.id]) ui.type[e.id] = q.type;
    return q;
  }
  function whyQuestion(e, q) {
    const c = typeCounts(e);
    if (!c[q.type]) return `아직 ‘${TYPES[q.type].label}’ 기록이 없어서 먼저 여쭤봐요.`;
    if (c[q.type] <= 1) return `‘${TYPES[q.type].label}’ 기록이 적은 편이라 골라 봤어요.`;
    return '지금 단계에서 남겨 두면 좋은 질문이에요.';
  }

  function checkinCard(e) {
    const q = currentQ(e); const sel = ui.type[e.id];
    const { dueDate } = App.store.checkinDue(e);
    return `<div class="card pj-checkin ${q.inbox ? 'is-due' : ''}">
      <div class="pj-checkin-head"><span class="ai-badge"><span class="ai-dot">R</span>${q.inbox ? '오늘의 체크인' : '체크인 남기기'}</span>
        <button class="btn btn-ghost btn-sm" data-pj="next-q">↻ 다른 질문</button></div>
      ${q.inbox ? '<a class="pj-ck-sync" href="#/daily">✉ 오늘의 질문함에도 같은 질문이 도착했어요 · 어디서 답해도 함께 완료돼요</a>'
        : `<div class="pj-ck-sync is-quiet">다음 체크인 질문은 ${esc(md(dueDate))}에 드릴게요. 지금 자유롭게 남겨도 좋아요.</div>`}
      <div class="pj-types" role="radiogroup" aria-label="기록 유형">
        ${TYPE_ORDER.map((t) => `<button class="pj-type ${sel === t ? 'on' : ''}" data-type="${t}" data-pj-type="${t}" role="radio" aria-checked="${sel === t}">
          <span class="pj-type-ico">${TYPES[t].ico}</span>${TYPES[t].label}</button>`).join('')}
      </div>
      <div data-pj-talk="ck"></div>
    </div>`;
  }
  // 체크인 대화: 질문함에 온 체크인이면 그 질문에 답한 것으로, 아니면 타임라인에 기록을 남기고 위키에 반영
  function checkinTalkCfg(e) {
    const q = currentQ(e); const oq = q.inbox; const pid = e.id;
    const typeOf = () => ui.type[pid] || (oq && oq.checkinType) || 'milestone';
    return {
      sig: oq ? `q:${oq.id}:${q.text}` : `b:${q.text}`,
      ask: { label: (TYPES[q.type] || TYPES.milestone).label, text: q.text, hint: whyQuestion(e, q) },
      placeholder: '한두 줄이면 충분해요. 예) JWT와 세션 중 고민하다가 모바일 확장 때문에 JWT로 결정했어요.',
      noAutofocus: true,
      src: oq ? { type: 'checkin', question: oq.checkinText || oq.text, questionId: oq.id, projectId: pid, logType: typeOf() }
        : { type: 'checkin', projectId: pid, logType: typeOf(), question: '(직접 기록)' },
      commit: oq ? (text, d) => App.store.answer(oq.id, text, { decision: d, type: typeOf() })
        : (text, d) => {
          const t = typeOf(); const log = App.store.addLog(pid, { type: t, text });
          return App.wiki.ingest({ type: 'checkin', text, projectId: pid, logId: log.id, logType: t, keywords: log.keywords, decision: d });
        },
      inbox: !!oq,
    };
  }
  // 방금 반영한 결과 (자리마다 하나)
  function reportBox(pid, where, lead) {
    const html = reportAt(pid, where); if (!html) return '';
    return `<div class="pj-report" data-pj-report="${esc(where)}">${lead ? `<div class="pj-report-lead">✓ ${esc(lead)}</div>` : ''}${html}
      <button type="button" class="pj-report-x" data-pj="close-report" aria-label="반영 결과 닫기">×</button></div>`;
  }

  function timeline(e) {
    const logs = sortedLogs(e);
    const used = cardsByLog(e);
    if (!logs.length) return '<div class="card empty"><div class="big">✎</div>아직 기록이 없어요. 첫 체크인을 남겨 볼까요?</div>';
    const groups = [];
    logs.forEach((l) => {
      const ws = fmt(weekStart(l.date));
      let g = groups.find((x) => x.key === ws);
      if (!g) { g = { key: ws, items: [] }; groups.push(g); }
      g.items.push(l);
    });
    return `<div class="pj-tl">${groups.map((g) => {
      const [label, range] = weekLabel(toDate(g.key));
      return `<div class="pj-week"><div class="pj-week-head"><b>${label}</b><span>${range}</span><span class="pj-week-n">${g.items.length}개</span></div>
        ${g.items.map((l) => {
          const t = TYPES[l.type] || TYPES.milestone;
          if (ui.edit && ui.edit.logId === l.id) return logEditor(l);
          const cards = used[l.id] || [];
          return `<div class="pj-log" data-type="${esc(l.type)}">
            <div class="pj-log-ico">${t.ico}</div>
            <div class="pj-log-body">
              <div class="pj-log-meta"><span class="pj-log-type">${t.label}</span><span>${esc(md(l.date))}</span>
                <span class="pj-log-acts"><button type="button" data-pj-log="edit" data-id="${esc(l.id)}">수정</button><button type="button" data-pj-log="del" data-id="${esc(l.id)}">삭제</button></span></div>
              <div class="pj-log-text">${esc(l.text)}</div>
              ${(l.keywords || []).length ? `<div class="exp-card-kws">${l.keywords.map((k) => App.ui.keywordChip(k)).join('')}</div>` : ''}
              <div class="pj-log-wiki">
                ${cards.length ? cards.map((c) => `<a class="pj-log-card" href="#/card/${esc(c.id)}" title="${esc(c.title)}">→ 「${esc(short(c.title, 24))}」</a>`).join('')
                  : l.type === 'milestone' || ui.logTalk === l.id ? '' : `<span class="subtle">아직 경험에 반영되지 않았어요</span><button type="button" class="btn btn-sm pj-log-ingest" data-pj-log="ingest" data-id="${esc(l.id)}">경험에 반영</button>`}
              </div>
              ${ui.logTalk === l.id ? `<div data-pj-talk="log:${esc(l.id)}"></div>` : ''}
            </div></div>`;
        }).join('')}</div>`;
    }).join('')}</div>`;
  }

  function logEditor(l) {
    const ed = ui.edit; const t = TYPES[ed.type] || TYPES.milestone;
    return `<div class="pj-log is-editing" data-type="${esc(ed.type)}">
      <div class="pj-log-ico">${t.ico}</div>
      <div class="pj-log-body">
        <div class="pj-log-meta"><span class="pj-log-type">기록 수정</span></div>
        <div class="pj-types pj-types-sm">${TYPE_ORDER.map((x) => `<button type="button" class="pj-type ${ed.type === x ? 'on' : ''}" data-type="${x}" data-pj-etype="${x}"><span class="pj-type-ico">${TYPES[x].ico}</span>${TYPES[x].label}</button>`).join('')}</div>
        <textarea class="textarea pj-ta" id="pj-edit-ta" rows="3" maxlength="400">${esc(ed.text)}</textarea>
        <div id="pj-ed-kw">${kwEditor(ed.kw, 'ed')}</div>
        <div class="pj-log-edit-foot">
          <label class="subtle">날짜 <input type="date" class="input pj-date" id="pj-edit-date" value="${esc(ed.date)}" /></label>
          <span style="flex:1"></span>
          <button type="button" class="btn btn-sm" data-pj-log="cancel">취소</button>
          <button type="button" class="btn btn-sm btn-primary" data-pj-log="save">저장</button>
        </div>
      </div></div>`;
  }

  function sidePanel(e) {
    const kc = logKeywordCounts(e); const max = kc.length ? kc[0][1] : 1;
    const c = typeCounts(e);
    const missing = TYPE_ORDER.filter((t) => !c[t] && t !== 'milestone');
    const cards = App.store.cardsOf(e.id);
    const unused = orphanLogs(e);
    return `<aside class="pj-side">
      <div class="card card-pad pj-cards-box">
        <div class="section-title">이 프로젝트의 경험 <span class="subtle">${cards.length}</span></div>
        ${cards.length ? `<div class="pj-cards">${cards.slice(0, 4).map((x) => `<a class="pj-cardlink" href="#/card/${esc(x.id)}">
            <div class="pj-cardlink-top">${App.ui.statusTag(x.status)}<span class="pj-cardlink-pct">${x.completeness}%</span></div>
            <div class="pj-cardlink-title">${esc(x.title)}</div></a>`).join('')}</div>
            ${cards.length > 4 ? `<button class="pj-link" data-pj-tab="exp">경험 ${cards.length}개 모두 보기 →</button>` : ''}`
          : '<p class="subtle">아직 없어요. 체크인을 남기면 AI가 이야기마다 경험 페이지로 정리해요.</p>'}
        ${unused.length ? `<p class="pj-side-hint"><span class="ai-dot">R</span>아직 경험에 반영되지 않은 체크인이 ${unused.length}개 있어요.</p>
          <button class="btn btn-sm pj-full" data-pj-tab="timeline">타임라인에서 반영하기</button>` : ''}
      </div>
      ${ghSideBox(e)}
      <div class="card card-pad">
        <div class="section-title">이 프로젝트에서 드러난 역량</div>
        ${kc.length ? `<div class="pj-comp">${kc.slice(0, 6).map(([k, n]) => `<div class="pj-comp-row">
            ${App.ui.keywordChip(k)}<div class="pj-comp-bar" data-tone="${App.keywords.tone(k)}"><span style="width:${Math.round((n / max) * 100)}%"></span></div><span class="pj-comp-n">${n}</span></div>`).join('')}</div>`
          : '<p class="subtle">체크인을 남기면 로그에서 역량 키워드를 찾아 보여 드려요.</p>'}
        <div class="divider"></div>
        <div class="pj-types-sum">${TYPE_ORDER.map((t) => `<div data-type="${t}"><span class="pj-dot"></span>${TYPES[t].label}<b>${c[t] || 0}</b></div>`).join('')}</div>
        ${missing.length ? `<p class="pj-side-hint"><span class="ai-dot">R</span>‘${TYPES[missing[0]].label}’ 기록이 아직 없어요. 면접에서 자주 묻는 부분이라 다음 체크인에서 여쭤볼게요.</p>` : ''}
      </div>
      ${e.status === 'done' ? `<div class="card card-pad pj-done-box"><b>마무리한 프로젝트예요</b>
          <p class="subtle">다시 진행해야 한다면 언제든 이어서 기록할 수 있어요.</p>
          <button class="btn btn-sm" data-pj="reopen">다시 진행중으로</button></div>`
        : `<button class="btn pj-full pj-finish" data-pj="finish">프로젝트 마무리하기</button>`}
    </aside>`;
  }

  /* ---------- 코드 분석 (GitHub 레포) — 찾은 기술 포인트는 경험의 근거가 되고, 이야기가 없으면 질문이 된다 ---------- */
  const GH_CATS = ['성능', '아키텍처', '인증·보안', '데이터', '테스트', '인프라·배포', '협업·품질'];
  const GH_CONF = { high: ['근거 확실', 'is-high', '코드에서 분명한 근거를 찾았어요'], mid: ['확인 필요', 'is-mid', '패턴은 보이지만 실제로 쓰였는지 한 번 확인해 주세요'] };
  const LANG_COLOR = { Java: '#b07219', Kotlin: '#a97bff', JavaScript: '#e8c930', TypeScript: '#3178c6', Python: '#3572a5', HTML: '#e34c26', CSS: '#563d7c',
    SCSS: '#c6538c', Shell: '#89e051', Dockerfile: '#384d54', Go: '#00add8', Vue: '#41b883', Groovy: '#4298b8', Ruby: '#701516', 'C#': '#178600', Swift: '#f05138' };
  const ghState = (pid) => (ui.gh[pid] = ui.gh[pid] || { url: '', running: false, progress: null, error: null, sample: null, sel: [], open: {}, cat: '전체', showDismissed: false });
  const isGh = (u) => !!(App.github && App.github.parseUrl(u));
  const ghUrlOf = (e) => (e.links || []).find(isGh) || '';
  const liveFindings = (repo) => ((repo && repo.findings) || []).filter((f) => f.status !== 'dismissed');
  const ghBulletOf = (f) => App.store.resumeBullets().find((b) => b.source && b.source.findingId === f.id) || null;

  function ghEmpty(e, st) {
    const prefill = st.url || ghUrlOf(e);
    return `<div class="card pj-gh-empty">
      <span class="ai-badge"><span class="ai-dot">R</span>코드 분석</span>
      <div class="pj-gh-empty-title">${prefill ? '연결한 레포의 코드를 분석해 볼까요?' : 'GitHub 레포를 연결하면, 코드도 이 프로젝트의 기록이 돼요'}</div>
      <p class="pj-gh-empty-desc">캐시·인증·동시성 제어·테스트·CI 같은 구현을 찾아 <b>어느 파일 몇 번째 줄</b>인지 근거와 함께 보여 드려요. 찾은 코드는 관련 경험에 근거로 붙고, 아직 이야기가 없는 코드는 오늘의 질문으로 "왜 이렇게 만들었는지" 여쭤봐요.</p>
      <div class="pj-gh-form">
        <input class="input" id="pj-gh-url" value="${esc(prefill)}" placeholder="https://github.com/owner/repo" spellcheck="false" autocomplete="off" />
        <button class="btn btn-primary" data-gh="analyze">코드 분석하기</button>
      </div>
      ${st.error ? ghErrorBox(st) : ''}
      <div class="pj-gh-note">공개(public) 레포만 분석할 수 있어요 · 로그인 없이 GitHub API를 쓰기 때문에 1시간에 약 20번까지 분석할 수 있어요.
        ${prefill ? '' : ' <button type="button" class="pj-link pj-gh-try" data-gh="fill" data-url="https://github.com/spring-projects/spring-petclinic">예시 레포로 해 보기</button>'}</div>
    </div>`;
  }
  function ghErrorBox(st) {
    return `<div class="pj-gh-error" role="alert"><b>분석하지 못했어요</b><span>${esc(st.error.message)}</span>
      <div class="pj-gh-error-acts">
        ${st.sample ? '<button class="btn btn-sm btn-primary" data-gh="use-sample">저장해 둔 예시 데이터로 보기</button>' : ''}
        ${st.error.code !== 'invalid' ? '<button class="btn btn-sm" data-gh="retry">다시 시도</button>' : ''}
      </div></div>`;
  }
  function ghProgress(st) {
    const steps = App.github.STEPS; const p = st.progress || { step: 0 };
    const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
    return `<div class="card pj-gh-run" aria-live="polite">
      <span class="ai-badge"><span class="ai-dot">R</span>코드를 읽고 있어요</span>
      <div class="pj-gh-run-url">${esc(prettyLink(st.url))}</div>
      <ol class="pj-gh-steps">${steps.map((s, i) => `<li class="${i < p.step ? 'is-done' : i === p.step ? 'is-now' : ''}">
          <span class="pj-gh-step-ico">${i < p.step ? '✓' : i === p.step ? '<span class="pj-spin"></span>' : i + 1}</span>
          <span>${esc(i === p.step && p.text ? p.text : s)}</span>
          ${i === 2 && i === p.step && p.total ? `<span class="pj-gh-step-bar"><span style="width:${pct}%"></span></span>` : ''}</li>`).join('')}</ol>
      <p class="subtle">빌드 파일·설정·서비스 코드 위주로 최대 30개 파일을 골라 읽어요. 보통 10초 안에 끝나요.</p>
    </div>`;
  }
  function langBar(langs) {
    const entries = Object.entries(langs || {}); if (!entries.length) return '';
    return `<div class="pj-gh-langs"><div class="pj-gh-langbar">${entries.map(([l, v]) => `<span style="width:${v}%;background:${LANG_COLOR[l] || '#c9c4bb'}" title="${esc(l)} ${v}%"></span>`).join('')}</div>
      <div class="pj-gh-langkeys">${entries.slice(0, 5).map(([l, v]) => `<span><i style="background:${LANG_COLOR[l] || '#c9c4bb'}"></i>${esc(l)} <b>${v}%</b></span>`).join('')}</div></div>`;
  }
  function ghHead(e, repo, st) {
    const live = liveFindings(repo); const added = live.filter((f) => f.status === 'added').length;
    return `<div class="card pj-gh-head">
      <div class="pj-gh-head-top">
        <a class="pj-gh-repo" href="${esc(repo.url)}" target="_blank" rel="noopener noreferrer"><span class="pj-gh-repo-ico">⌥</span>${esc(repo.owner)}/<b>${esc(repo.name)}</b> ↗</a>
        ${repo.source === 'sample' ? '<span class="pj-gh-badge" title="실제 GitHub가 아닌 프로토타입용 예시 레포예요">예시 데이터</span>' : ''}
        <span class="pj-gh-when">${repo.meta && repo.meta.stars ? `★ ${repo.meta.stars} · ` : ''}${esc(md(repo.analyzedAt))} 분석${repo.branch ? ` · ${esc(repo.branch)}` : ''}</span>
        <span class="pj-gh-head-acts"><button class="btn btn-sm" data-gh="reanalyze">↻ 다시 분석</button><button class="btn btn-sm btn-ghost" data-gh="disconnect">연결 해제</button></span>
      </div>
      ${repo.meta && repo.meta.description ? `<div class="pj-gh-desc">${esc(repo.meta.description)}</div>` : ''}
      ${langBar(repo.meta && repo.meta.languages)}
      ${(repo.stack || []).length ? `<div class="pj-gh-stack"><span class="pj-gh-k">기술 스택</span>${repo.stack.map((s) => `<span class="pj-gh-chip">${esc(s)}</span>`).join('')}</div>` : ''}
      <div class="pj-gh-sum"><span class="ai-dot">R</span><span>${live.length ? `기술 포인트 <b>${live.length}개</b>를 찾았어요 · 경험에 근거로 붙은 것 <b>${live.filter((f) => App.wiki.cardsForFinding(f.id).length).length}개</b>${added ? ` · 마스터 이력서에 <b>${added}개</b> 담았어요` : ''}.` : '쓸 만한 패턴을 아직 찾지 못했어요. 코드가 더 쌓이면 다시 분석해 보세요.'}</span></div>
      ${st.error ? ghErrorBox(st) : ''}
    </div>`;
  }
  function codeBlock(ev) {
    const hl = new Set(ev.hl || []);
    const lines = String(ev.code || '').split('\n');
    return `<div class="pj-ev">
      <div class="pj-ev-head"><span class="pj-ev-path" title="${esc(ev.path)}">${esc(ev.path)}</span><span class="pj-ev-lines">L${ev.start}${ev.end !== ev.start ? `–${ev.end}` : ''}</span>
        <a class="pj-ev-link" href="${esc(ev.url)}" target="_blank" rel="noopener noreferrer">GitHub에서 보기 ↗</a></div>
      <div class="pj-ev-code" tabindex="0" aria-label="${esc(ev.path)} ${ev.start}~${ev.end}번째 줄"><pre>${lines.map((l, i) => `<span class="pj-ev-ln${hl.has(ev.start + i) ? ' is-hl' : ''}"><span class="pj-ev-n">${ev.start + i}</span><span class="pj-ev-c">${esc(l) || ' '}</span></span>`).join('')}</pre></div>
    </div>`;
  }
  function findingCard(e, f, st) {
    const conf = GH_CONF[f.confidence] || GH_CONF.mid; const open = !!st.open[f.id];
    const sel = st.sel.includes(f.id); const added = f.status === 'added';
    const ev = f.evidence || [];
    const rows = Math.max(2, Math.ceil(String(f.bullet || '').length / 52));
    return `<div class="pj-gf ${added ? 'is-added' : ''} ${sel ? 'is-sel' : ''}" data-cat="${esc(f.category)}">
      <div class="pj-gf-top">
        ${added ? '<span class="pj-gf-check is-on" aria-hidden="true">✓</span>' : `<label class="pj-gf-check-wrap" title="담을 항목으로 고르기"><input type="checkbox" class="pj-gf-cb" data-gh-sel="${esc(f.id)}" ${sel ? 'checked' : ''} aria-label="${esc(f.title)} 고르기" /></label>`}
        <span class="pj-gf-cat">${esc(f.category)}</span>
        <span class="pj-gf-conf ${conf[1]}" title="${esc(conf[2])}">${conf[0]}</span>
        ${added ? '<span class="pj-gf-added">이력서에 담김 ✓</span>' : ''}
      </div>
      <div class="pj-gf-title">${esc(f.title)}</div>
      ${added ? `<div class="pj-gf-bullet is-static">${esc((ghBulletOf(f) || {}).text || f.bullet)}</div>`
        : `<textarea class="textarea pj-gf-ta" data-gh-bullet="${esc(f.id)}" rows="${rows}" maxlength="200" aria-label="이력서 문장">${esc(f.bullet)}</textarea>`}
      ${!added && /○○|○/.test(f.bullet) ? '<div class="pj-gf-fill">○○ 자리는 코드만으로 알 수 없는 수치예요. 직접 잰 값으로 바꿔 주세요.</div>' : ''}
      ${(f.tags || []).length ? `<div class="pj-gf-tags">${f.tags.map((t) => `<span class="pj-gh-chip">${esc(t)}</span>`).join('')}</div>` : ''}
      <div class="pj-gf-detail"><b>면접 포인트</b> ${esc(f.detail)}</div>
      ${findingWiki(f)}
      <div class="pj-gf-foot">
        <button type="button" class="pj-gf-evtoggle ${open ? 'on' : ''}" data-gh="toggle-ev" data-id="${esc(f.id)}" aria-expanded="${open}"><span class="pj-gf-evlabel">${open ? '▾' : '▸'} 근거 코드 ${ev.length}곳</span> <span class="pj-gf-evfiles">${esc(ev.map((x) => x.path.split('/').pop() + ':' + x.start).slice(0, 2).join(', '))}</span></button>
        <span class="pj-gf-acts">
          ${added ? `<a class="btn btn-sm btn-ghost" href="#/resume">이력서에서 보기</a><button class="btn btn-sm" data-gh="undo" data-id="${esc(f.id)}">담기 취소</button>`
            : `<button class="btn btn-sm btn-ghost" data-gh="dismiss" data-id="${esc(f.id)}">제외</button><button class="btn btn-sm" data-gh="add-one" data-id="${esc(f.id)}">＋ 이력서에 담기</button>`}
        </span>
      </div>
      ${open ? `<div class="pj-gf-evs">${ev.map(codeBlock).join('')}</div>` : ''}
    </div>`;
  }
  // 이 코드가 근거로 붙은 경험 / 없으면 그 자리에서 이야기를 들려주기
  const openCodeQ = (fid) => App.store.state.inbox.find((q) => q.findingId === fid && (q.status === 'pending' || q.status === 'later')) || null;
  function findingWiki(f) {
    const talk = ui.codeTalk === f.id ? `<div data-pj-talk="code:${esc(f.id)}"></div>` : '';
    const exps = App.wiki.cardsForFinding(f.id);
    if (exps.length) return `<div class="pj-gf-wiki">${exps.map((x) => `<a class="pj-gf-exp" href="#/card/${esc(x.id)}">↳ 「${esc(short(x.title, 28))}」 근거</a>`).join('')}</div>${talk}`;
    if (talk) return talk;
    const queued = !!openCodeQ(f.id);
    return `<div class="pj-gf-wiki is-empty"><span class="subtle">${queued ? '오늘의 질문에 이 코드 이야기가 와 있어요' : '이 코드를 뒷받침할 경험이 아직 없어요'}</span>
      <button type="button" class="btn btn-sm" data-gh="ask" data-id="${esc(f.id)}">${queued ? '여기서 답하기' : '이 코드로 경험 만들기'}</button></div>`;
  }
  function codeSection(e) {
    const st = ghState(e.id);
    if (st.running) return ghProgress(st);
    const repo = e.repo;
    if (!repo) return ghEmpty(e, st);
    const live = liveFindings(repo); const dismissed = (repo.findings || []).filter((f) => f.status === 'dismissed');
    const counts = {}; live.forEach((f) => { counts[f.category] = (counts[f.category] || 0) + 1; });
    if (st.cat !== '전체' && !counts[st.cat]) st.cat = '전체';
    const shown = live.filter((f) => st.cat === '전체' || f.category === st.cat);
    const selectable = shown.filter((f) => f.status === 'new');
    st.sel = st.sel.filter((id) => live.some((f) => f.id === id && f.status === 'new'));
    const allOn = selectable.length && selectable.every((f) => st.sel.includes(f.id));
    return `${ghHead(e, repo, st)}
      ${reportBox(e.id, 'code', '코드 분석 결과를 위키에 반영했어요')}
      ${live.length ? `<div class="pj-gh-filter">
        <div class="pj-gh-cats" role="tablist" aria-label="분류">${['전체'].concat(GH_CATS.filter((c) => counts[c])).map((c) => `<button type="button" class="pj-gh-cat ${st.cat === c ? 'on' : ''}" data-gh="cat" data-cat="${esc(c)}">${esc(c)} <span>${c === '전체' ? live.length : counts[c]}</span></button>`).join('')}</div>
        ${selectable.length ? `<button type="button" class="pj-link pj-gh-all" data-gh="select-all">${allOn ? '선택 해제' : `담을 수 있는 ${selectable.length}개 모두 고르기`}</button>` : ''}
      </div>
      <div class="pj-gf-list">${shown.map((f) => findingCard(e, f, st)).join('')}</div>` : ''}
      ${dismissed.length ? `<div class="pj-gh-dismissed">
        <button type="button" class="pj-gh-dis-toggle" data-gh="show-dismissed">${st.showDismissed ? '▾' : '▸'} 제외한 항목 ${dismissed.length}개</button>
        ${st.showDismissed ? dismissed.map((f) => `<div class="pj-gh-dis-row"><span class="pj-gf-cat">${esc(f.category)}</span><span class="pj-gh-dis-title">${esc(f.title)}</span><button class="btn btn-sm btn-ghost" data-gh="restore" data-id="${esc(f.id)}">되살리기</button></div>`).join('') : ''}
      </div>` : ''}
      ${st.sel.length ? `<div class="pj-gh-bar"><span><b>${st.sel.length}개</b> 골랐어요 <span class="subtle">· ${esc(shortName(e.title))} 항목에 들어가요</span></span>
        <span class="pj-gh-bar-acts"><button class="btn btn-sm btn-ghost" data-gh="clear-sel">취소</button><button class="btn btn-sm btn-primary" data-gh="add-selected">선택한 ${st.sel.length}개 마스터 이력서에 담기</button></span></div>` : ''}`;
  }
  function ghSideBox(e) {
    const repo = e.repo;
    if (!repo) {
      const url = ghUrlOf(e);
      return `<div class="card card-pad pj-gh-side"><div class="section-title">코드 분석</div>
        <p class="subtle">${url ? '연결한 레포를 아직 분석하지 않았어요. 코드에서 찾은 구현이 경험의 근거가 돼요.' : 'GitHub 레포를 연결하면 캐시·인증·테스트 같은 구현을 찾아 경험의 근거로 붙여 드려요.'}</p>
        <button class="btn btn-sm pj-full" data-pj-tab="code">⌥ ${url ? '레포 분석하기' : '레포 연결하기'}</button></div>`;
    }
    const live = liveFindings(repo); const linked = live.filter((f) => App.wiki.cardsForFinding(f.id).length).length;
    return `<div class="card card-pad pj-gh-side"><div class="section-title">코드 분석 <span class="subtle">${live.length}</span></div>
      <div class="pj-gh-side-row"><span>경험에 근거로 붙음</span><b>${linked} / ${live.length}</b></div>
      ${App.ui.progress(live.length ? Math.round((linked / live.length) * 100) : 0)}
      <button class="btn btn-sm pj-full" data-pj-tab="code" style="margin-top:12px">⌥ 코드 분석 결과 보기</button></div>`;
  }

  // 경험 탭: 이 프로젝트의 경험 페이지 + 최근 위키 반영
  function expSection(e) {
    const cards = App.store.cardsOf(e.id);
    const feed = App.wiki.entries({ projectId: e.id }).filter((w) => w.target).slice(0, 5);
    const unused = orphanLogs(e).length;
    return `<div class="pj-exp">
      <div class="pj-exp-head"><p class="subtle">체크인·AI와 대화·코드 분석에서 나온 이 프로젝트의 경험 페이지예요. 기록할수록 같은 페이지가 채워져요.</p>
        <button class="btn btn-sm btn-primary" data-capture data-capture-project="${esc(e.id)}">＋ 이 프로젝트 기록하기</button></div>
      ${cards.length ? `<div class="pj-exp-grid">${cards.map((x) => App.ui.expCard(x)).join('')}</div>`
        : `<div class="card empty"><div class="big">▣</div>아직 이 프로젝트의 경험이 없어요.<div class="subtle" style="margin-top:4px">체크인을 남기거나 코드를 분석하면 경험 페이지가 생겨요.</div></div>`}
      ${unused ? `<p class="pj-side-hint"><span class="ai-dot">R</span>아직 경험에 반영되지 않은 체크인이 ${unused}개 있어요. <button class="pj-link" data-pj-tab="timeline">타임라인에서 반영하기 →</button></p>` : ''}
      ${feed.length ? `<div class="section-title" style="margin-top:20px">최근 위키 반영</div><div class="card card-pad wk-feed">${feed.map((w) => App.wiki.reportHTML(w, { compact: true })).join('')}</div>` : ''}
    </div>`;
  }

  function renderDetail(id) {
    const e = App.store.getProject(id);
    if (!e) {
      return `<div class="page"><div class="card empty"><div class="big">▤</div>프로젝트를 찾을 수 없어요.
        <div style="margin-top:14px"><a class="btn" href="#/projects">← 프로젝트 목록으로</a></div></div></div>`;
    }
    const gh = ghLink(e); const nx = nextCheckin(e);
    const tab = ui.tab[e.id] || (App.store.cardsOf(e.id).length ? 'exp' : 'timeline');
    const ghUrl = ghUrlOf(e);
    return `<div class="page pj">
      <a class="pj-back" href="#/projects">← 프로젝트 목록</a>
      <div class="card pj-hero">
        <div class="pj-hero-main">
          <div class="pj-card-top">${App.ui.statusTag(e.status)}<span class="subtle">${App.ui.period(e.period)}</span>
            ${e.status === 'ongoing' ? `<span class="pj-due ${nx.due ? 'is-due' : ''}">${esc(nx.label)} 체크인 · ${esc(nx.text)}</span>` : ''}</div>
          <h1 class="pj-hero-title">${esc(e.title)}</h1>
          <div class="pj-card-role">${esc(e.role || '역할 미입력')}</div>
        </div>
        <div class="pj-hero-side">
          ${gh ? `<a class="pj-source" href="${esc(gh)}" target="_blank" rel="noopener noreferrer"><span class="pj-source-k">결과물</span><span class="pj-source-v">${esc(prettyLink(gh))} ↗</span></a>`
            : '<button class="pj-source pj-source-add" data-pj="add-link"><span class="pj-source-k">결과물</span><span class="pj-source-v">＋ GitHub 링크 연결</span></button>'}
          ${e.repo ? `<button class="pj-source pj-source-code" data-pj-tab="code"><span class="pj-source-k">코드 분석</span><span class="pj-source-v">⌥ 기술 포인트 ${liveFindings(e.repo).length}개 보기</span></button>`
            : ghUrl ? '<button class="pj-source pj-source-add" data-pj-tab="code"><span class="pj-source-k">코드 분석</span><span class="pj-source-v">⌥ 이 레포 분석하기</span></button>' : ''}
        </div>
      </div>
      <div class="pj-layout">
        <div class="pj-main">
          ${e.status !== 'done' ? checkinCard(e) : ''}
          <div class="pj-tabs" role="tablist">
            <button type="button" class="pj-tab ${tab === 'exp' ? 'on' : ''}" data-pj-tab="exp" role="tab" aria-selected="${tab === 'exp'}">경험 <span>${App.store.cardsOf(e.id).length}</span></button>
            <button type="button" class="pj-tab ${tab === 'timeline' ? 'on' : ''}" data-pj-tab="timeline" role="tab" aria-selected="${tab === 'timeline'}">타임라인 <span>${(e.logs || []).length}</span></button>
            <button type="button" class="pj-tab ${tab === 'code' ? 'on' : ''}" data-pj-tab="code" role="tab" aria-selected="${tab === 'code'}">⌥ 코드 분석 <span>${e.repo ? liveFindings(e.repo).length : '＋'}</span></button>
          </div>
          ${tab === 'code' ? `<div id="pj-gh" class="pj-gh">${codeSection(e)}</div>` : tab === 'exp' ? expSection(e) : timeline(e)}
        </div>
        ${sidePanel(e)}
      </div>
    </div>`;
  }

  /* ---------- 화면 등록 ---------- */
  App.screens.projects = {
    title: '프로젝트',
    render(params) {
      if (params && params.id && params.tab) ui.tab[params.id] = ['code', 'exp', 'timeline'].includes(params.tab) ? params.tab : 'timeline';
      return params && params.id ? renderDetail(params.id) : renderList();
    },
    mount(root, params) {
      const id = params && params.id;
      const rerenderLocal = () => {
        root.innerHTML = params && params.id ? renderDetail(id) : renderList();
        fitTas(); bindReports(); placeTalks();
      };
      /* ---- 기록 대화 (App.talk) ----
         다시 그려도 대화가 이어지도록, 대화 DOM(host)을 따로 들고 있다가 자리표시([data-pj-talk])에 끼운다 */
      const talks = {}; // key → { host, ctl, sig, done }
      const dropTalk = (key) => { const t = talks[key]; if (!t) return; t.ctl.destroy(); t.host.remove(); delete talks[key]; };
      const closeTalk = (key) => () => { if (key.startsWith('log:')) ui.logTalk = null; else if (key.startsWith('code:')) ui.codeTalk = null; dropTalk(key); rerenderLocal(); };
      function talkCfg(key) {
        const e = App.store.getProject(id); if (!e) return null;
        if (key === 'ck') {
          const c = checkinTalkCfg(e);
          return Object.assign(c, {
            onDone: () => { talks.ck.done = true; App.ui.toast(c.inbox ? '체크인 완료! 오늘의 질문에서도 답변 완료로 바뀌었어요' : '타임라인에 기록했어요'); rerenderLocal(); },
            next: { label: '다른 체크인 남기기', onClick: () => {
              const Q = window.SEED.projectCheckins;
              if (!App.store.openCheckin(id)) { ui.qIndex[id] = ((ui.qIndex[id] || 0) + 1) % Q.length; ui.type[id] = Q[ui.qIndex[id]].type; }
              dropTalk('ck'); rerenderLocal();
            } },
          });
        }
        if (key.startsWith('log:')) {
          const l = (e.logs || []).find((x) => x.id === key.slice(4)); if (!l) return null;
          return {
            sig: key, ask: { label: '타임라인 기록', text: '이 기록, 어느 경험에 어떻게 반영할까요?' }, prefill: l.text,
            src: { type: 'checkin', projectId: id, logId: l.id, logType: l.type, question: l.fromQuestion || '', keywords: l.keywords },
            onDone: () => rerenderLocal(), next: { label: '닫기', onClick: closeTalk(key) },
          };
        }
        if (key.startsWith('code:')) {
          const fid = key.slice(5); const f = e.repo && e.repo.findings.find((x) => x.id === fid); if (!f) return null;
          const cq = openCodeQ(fid) || App.wiki.codeQuestion(e, f);
          return {
            sig: key, ask: { label: '코드 분석', text: cq.text, hint: cq.hint },
            src: { type: 'answer', projectId: id, findingId: fid, question: cq.text },
            // 오늘의 질문 기록에도 남도록, 질문함의 질문에 답한 것으로 처리
            commit: (text, d) => {
              let q = openCodeQ(fid);
              if (!q) {
                const { id: _i, status: _s, askedAt: _a, ...nq } = App.wiki.codeQuestion(App.store.getProject(id), f);
                App.store.pushQuestion(nq);
                q = App.store.state.inbox.find((x) => x.findingId === fid && x.status === 'pending');
              }
              return q ? App.store.answer(q.id, text, { decision: d }) : null;
            },
            onDone: () => rerenderLocal(), next: { label: '닫기', onClick: closeTalk(key) },
          };
        }
        return null;
      }
      function placeTalks() {
        root.querySelectorAll('[data-pj-talk]').forEach((ph) => {
          const key = ph.getAttribute('data-pj-talk');
          let t = talks[key];
          const cfg = !t || !t.done ? talkCfg(key) : null;
          if (t && cfg && cfg.sig !== t.sig) { dropTalk(key); t = null; }
          if (!t) {
            if (!cfg) return;
            const host = document.createElement('div'); host.className = 'pj-talk';
            t = talks[key] = { host, sig: cfg.sig, done: false };
            t.ctl = App.talk.mount(host, cfg);
          }
          ph.replaceWith(t.host);
        });
      }
      // 체크인 대화를 아직 시작하지 않았는지 (유형을 바꾸면 질문도 바꿔도 되는지)
      const ckUntouched = () => { const t = talks.ck; if (!t) return true; const inp = t.host.querySelector('[data-tk-in]'); return !t.done && t.ctl.phase === 'ask' && !(inp && inp.value.trim()); };
      // 방금 반영한 결과 카드: 되돌리기·옮기기 후 새 entry 로 다시 그린다
      const bindReports = () => root.querySelectorAll('[data-pj-report]').forEach((box) => {
        App.wiki.bindReport(box, (n) => { if (n && ui.report) ui.report.id = n.id; rerenderLocal(); });
      });
      const showReport = (where, entry) => { ui.report = entry ? { pid: id, id: entry.id, where } : null; };
      // 이력서 문장 입력칸은 내용 길이에 맞춰 높이 조절
      const fitTa = (ta) => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 2 + 'px'; };
      const fitTas = () => root.querySelectorAll('.pj-gf-ta').forEach(fitTa);

      const kwStateOf = () => ui.edit && ui.edit.kw;
      const redrawKw = (scope) => {
        const st = kwStateOf(); if (!st) return;
        const box = root.querySelector('#pj-ed-kw'); if (box) box.innerHTML = kwEditor(st, scope);
      };
      /* ---- 코드 분석 ---- */
      let alive = true;
      const ghRedraw = () => { if (!alive) return; const box = root.querySelector('#pj-gh'); const e = App.store.getProject(id); if (box && e) { box.innerHTML = codeSection(e); fitTas(); placeTalks(); } };
      ui.ghView = { pid: id, redraw: ghRedraw, full: () => alive && rerenderLocal() };
      // 다른 화면에 갔다 와도 진행 중인 분석은 계속되고, 돌아오면 이어서 보인다
      const view = (pid) => (ui.ghView && ui.ghView.pid === pid ? ui.ghView : null);
      async function runAnalyze(pid, url) {
        const st = ghState(pid); if (st.running) return;
        url = String(url || '').trim();
        if (!App.github.parseUrl(url)) { st.error = { code: 'invalid', message: 'GitHub 레포 주소 형식이 아니에요. 예) https://github.com/owner/repo' }; st.sample = null; st.url = url; const v = view(pid); if (v) v.redraw(); return; }
        Object.assign(st, { url, running: true, error: null, sample: null, progress: { step: 0, text: App.github.STEPS[0] } });
        { const v = view(pid); if (v) v.full(); }
        try {
          const repo = await App.github.analyze(url, { onProgress: (pr) => { st.progress = pr; const v = view(pid); if (v) v.redraw(); } });
          st.running = false; st.sel = []; st.open = {}; st.cat = '전체';
          const entry = applyRepo(pid, repo);
          if (entry) ui.report = { pid, id: entry.id, where: 'code' };
          const n = liveFindings(App.store.getProject(pid).repo).length;
          App.ui.toast(n ? `기술 포인트 ${n}개를 찾아 위키에 반영했어요` : '분석은 끝났는데, 쓸 만한 패턴을 찾지 못했어요');
        } catch (err) {
          st.running = false; st.error = { code: err.code || 'network', message: err.message || '분석하지 못했어요' }; st.sample = err.sample || null;
        }
        const v = view(pid); if (v) v.full();
      }
      function applyRepo(pid, repo) {
        const p = App.store.getProject(pid); const old = {};
        ((p.repo && p.repo.findings) || []).forEach((f) => { old[f.id] = f; });
        // 다시 분석해도 제외한 항목·직접 고친 문장은 그대로
        (repo.findings || []).forEach((f) => { const o = old[f.id]; if (!o) return; if (o.status === 'dismissed') f.status = 'dismissed'; if (o.edited) { f.bullet = o.bullet; f.edited = true; } });
        App.store.setRepo(pid, repo);
        const key = App.github.keyOf(repo.owner, repo.name);
        const links = p.links || [];
        if (!links.some((l) => { const x = App.github.parseUrl(l); return x && App.github.keyOf(x.owner, x.name) === key; })) App.store.updateProject(pid, { links: links.concat([repo.url]) });
        // 코드 분석도 기록: 맞는 경험엔 코드 근거로 붙고, 이야기가 없는 코드는 오늘의 질문으로
        return App.wiki.ingestCode(pid, App.store.getProject(pid).repo.findings);
      }
      const draftOf = (fid) => { const ta = root.querySelector(`[data-gh-bullet="${CSS.escape(fid)}"]`); return ta ? ta.value.trim() : ''; };
      function addFindings(ids) {
        const p = App.store.getProject(id); if (!p || !p.repo) return;
        const fs = ids.map((fid) => p.repo.findings.find((f) => f.id === fid)).filter((f) => f && f.status === 'new');
        if (!fs.length) return;
        const items = fs.map((f) => {
          const text = draftOf(f.id) || f.bullet;
          if (text !== f.bullet) App.store.updateFinding(id, f.id, { bullet: text, edited: true });
          return { text, tags: f.tags || [], source: { type: 'github', projectId: id, findingId: f.id, evidence: (f.evidence || []).map(({ path, start, end, url }) => ({ path, start, end, url })) } };
        });
        App.store.addResumeBullets(id, items);
        const st = ghState(id); st.sel = st.sel.filter((x) => !ids.includes(x));
        const hasBlank = items.some((it) => /○/.test(it.text));
        App.ui.pushToast(`마스터 이력서에 ${items.length}개 담았어요`, `${shortName(p.title)} 항목에 들어갔어요.${hasBlank ? ' ○○ 수치는 이력서에서 채워 주세요.' : ''} 눌러서 확인하기 →`, '#/resume');
        rerenderLocal();
      }
      function onGh(btn) {
        const a = btn.getAttribute('data-gh'); const e = App.store.getProject(id); if (!e) return;
        const st = ghState(id); const fid = btn.getAttribute('data-id');
        if (a === 'analyze') { const inp = root.querySelector('#pj-gh-url'); runAnalyze(id, inp ? inp.value : st.url); }
        else if (a === 'fill') { const inp = root.querySelector('#pj-gh-url'); if (inp) { inp.value = btn.getAttribute('data-url'); inp.focus(); } }
        else if (a === 'retry') runAnalyze(id, st.url || (e.repo && e.repo.url) || ghUrlOf(e));
        else if (a === 'reanalyze') runAnalyze(id, e.repo.url);
        else if (a === 'use-sample' && st.sample) { const s2 = st.sample; Object.assign(st, { error: null, sample: null, sel: [], open: {} }); showReport('code', applyRepo(id, s2)); App.ui.toast('저장해 둔 예시 데이터를 불러와 위키에 반영했어요'); rerenderLocal(); }
        else if (a === 'disconnect') {
          App.ui.modal({
            title: '레포 연결을 해제할까요?', confirmText: '연결 해제', danger: true,
            body: '<p>코드에서 찾은 항목 목록이 지워져요. 이미 마스터 이력서에 담은 문장은 그대로 남아요. 언제든 다시 분석할 수 있어요.</p>',
            onConfirm() { st.url = e.repo.url; App.store.removeRepo(id); Object.assign(st, { sel: [], open: {}, error: null }); App.ui.toast('레포 연결을 해제했어요'); rerenderLocal(); return true; },
          });
        }
        else if (a === 'cat') { st.cat = btn.getAttribute('data-cat'); ghRedraw(); }
        else if (a === 'toggle-ev') { st.open[fid] = !st.open[fid]; ghRedraw(); }
        else if (a === 'select-all') {
          const shown = liveFindings(e.repo).filter((f) => f.status === 'new' && (st.cat === '전체' || f.category === st.cat)).map((f) => f.id);
          const allOn = shown.every((x) => st.sel.includes(x));
          st.sel = allOn ? st.sel.filter((x) => !shown.includes(x)) : [...new Set(st.sel.concat(shown))];
          ghRedraw();
        }
        else if (a === 'clear-sel') { st.sel = []; ghRedraw(); }
        else if (a === 'add-one') addFindings([fid]);
        else if (a === 'add-selected') addFindings(st.sel.slice());
        else if (a === 'undo') {
          const f = e.repo.findings.find((x) => x.id === fid); if (!f) return;
          const b = ghBulletOf(f);
          if (b) App.store.removeResumeBullet(b.entryId, b.id); else App.store.updateFinding(id, fid, { status: 'new' });
          App.ui.toast('마스터 이력서에서 뺐어요'); rerenderLocal();
        }
        else if (a === 'dismiss') { App.store.updateFinding(id, fid, { status: 'dismissed' }); st.sel = st.sel.filter((x) => x !== fid); App.ui.toast('이 항목은 제외했어요 · 아래에서 되살릴 수 있어요'); rerenderLocal(); }
        else if (a === 'restore') { App.store.updateFinding(id, fid, { status: 'new' }); rerenderLocal(); }
        else if (a === 'show-dismissed') { st.showDismissed = !st.showDismissed; ghRedraw(); }
        else if (a === 'ask') {
          // 이 코드 이야기를 그 자리에서 들려주면, 코드가 근거로 붙은 경험이 생긴다 (오늘의 질문 기록에도 남음)
          if (ui.codeTalk && ui.codeTalk !== fid) dropTalk('code:' + ui.codeTalk);
          ui.codeTalk = fid; ghRedraw();
        }
      }

      const focusEdit = () => { const ta = root.querySelector('#pj-edit-ta'); if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); } };

      const onClick = (ev) => {
        const tabBtn = ev.target.closest('[data-pj-tab]');
        if (tabBtn && id) {
          ui.tab[id] = tabBtn.getAttribute('data-pj-tab'); rerenderLocal();
          if (tabBtn.closest('.pj-side')) { const t = root.querySelector('.pj-tabs'); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
          return;
        }
        const selCb = ev.target.closest('[data-gh-sel]');
        if (selCb) {
          const st = ghState(id); const fid = selCb.getAttribute('data-gh-sel');
          st.sel = selCb.checked ? [...new Set(st.sel.concat([fid]))] : st.sel.filter((x) => x !== fid);
          ghRedraw(); return;
        }
        const ghBtn = ev.target.closest('[data-gh]');
        if (ghBtn) { onGh(ghBtn); return; }
        const kwBtn = ev.target.closest('[data-kwact]');
        if (kwBtn) {
          const scope = kwBtn.closest('[data-kw-scope]').getAttribute('data-kw-scope'); const st = kwStateOf(); if (!st) return;
          const a = kwBtn.getAttribute('data-kwact'); const k = kwBtn.getAttribute('data-k');
          if (a === 'remove') kwRemove(st, k);
          else if (a === 'add') kwAdd(st, k);
          else if (a === 'picker') st.open = !st.open;
          redrawKw(scope);
          if (a === 'picker' && st.open) { const inp = root.querySelector(`[data-kw-scope="${scope}"] [data-kw-input]`); if (inp) inp.focus(); }
          return;
        }
        const eType = ev.target.closest('[data-pj-etype]');
        if (eType && ui.edit) { ui.edit.type = eType.getAttribute('data-pj-etype'); rerenderLocal(); focusEdit(); return; }
        const logBtn = ev.target.closest('[data-pj-log]');
        if (logBtn) {
          const a = logBtn.getAttribute('data-pj-log'); const e = App.store.getProject(id); if (!e) return;
          if (a === 'ingest') {
            // 바로 반영하지 않고, 이 기록 아래에서 AI와 어디에 어떻게 넣을지 정한다
            if (ui.logTalk) dropTalk('log:' + ui.logTalk);
            ui.logTalk = logBtn.getAttribute('data-id'); rerenderLocal();
          } else if (a === 'edit') {
            const l = e.logs.find((x) => x.id === logBtn.getAttribute('data-id')); if (!l) return;
            ui.edit = { logId: l.id, type: l.type, text: l.text, date: l.date, kw: kwNew(l.keywords || [], App.ai.extractKeywords(l.text)) };
            rerenderLocal(); focusEdit();
          } else if (a === 'cancel') {
            ui.edit = null; rerenderLocal();
          } else if (a === 'save' && ui.edit) {
            const text = (ui.edit.text || '').trim();
            if (!text) { App.ui.toast('내용이 비어 있어요. 지우려면 삭제를 눌러 주세요'); focusEdit(); return; }
            App.store.updateLog(id, ui.edit.logId, { type: ui.edit.type, text, date: ui.edit.date || fmt(todayD()), keywords: kwSelected(ui.edit.kw) });
            ui.edit = null; App.ui.toast('기록을 수정했어요'); rerenderLocal();
          } else if (a === 'del') {
            const l = e.logs.find((x) => x.id === logBtn.getAttribute('data-id')); if (!l) return;
            const usedBy = cardsByLog(e)[l.id] || [];
            App.ui.modal({
              title: '이 기록을 삭제할까요?', confirmText: '삭제', danger: true,
              body: `<p>「${esc(l.text.length > 60 ? l.text.slice(0, 60) + '…' : l.text)}」</p><p style="margin-top:8px">삭제한 기록은 되돌릴 수 없어요.${usedBy.length ? ' 이 기록이 반영된 경험 페이지는 그대로 남아요.' : ''}</p>`,
              onConfirm() { App.store.removeLog(id, l.id); if (ui.edit && ui.edit.logId === l.id) ui.edit = null; if (ui.logTalk === l.id) { ui.logTalk = null; dropTalk('log:' + l.id); } App.ui.toast('기록을 삭제했어요'); rerenderLocal(); return true; },
            });
          }
          return;
        }
        const typeBtn = ev.target.closest('[data-pj-type]');
        if (typeBtn) {
          const t = typeBtn.getAttribute('data-pj-type');
          ui.type[id] = t;
          // 아직 답하기 전이면 그 유형에 맞는 질문으로 (오늘의 질문함의 질문도 함께) — 대화를 시작했으면 기록 유형만 바꾼다
          if (ckUntouched()) {
            const qi = window.SEED.projectCheckins.findIndex((q) => q.type === t);
            const oq = App.store.openCheckin(id);
            if (qi >= 0) { if (oq) App.store.changeCheckin(oq.id, qi); else ui.qIndex[id] = qi; }
          }
          rerenderLocal();
          return;
        }
        const btn = ev.target.closest('[data-pj]'); if (!btn) return;
        const act = btn.getAttribute('data-pj'); const e = id ? App.store.getProject(id) : null;
        if (act === 'new') return openNewModal();
        if (!e) return;
        if (act === 'next-q') {
          const Q = window.SEED.projectCheckins;
          const oq = App.store.openCheckin(id);
          if (oq) App.store.changeCheckin(oq.id, ((oq.bankIndex != null ? oq.bankIndex : Q.findIndex((x) => x.type === oq.checkinType)) + 1) % Q.length);
          else { ui.qIndex[id] = ((ui.qIndex[id] || 0) + 1) % Q.length; ui.type[id] = Q[ui.qIndex[id]].type; }
          dropTalk('ck'); rerenderLocal();
        } else if (act === 'close-report') {
          ui.report = null; rerenderLocal();
        } else if (act === 'add-link') {
          App.ui.modal({
            title: '결과물 링크 연결', confirmText: '연결하기',
            body: `<p class="pj-form-intro">GitHub 저장소나 배포 주소를 보조 근거로 붙여 둘게요.</p><input class="input" id="pj-f-link" placeholder="https://github.com/..." />`,
            onConfirm(r) {
              const v = (r.querySelector('#pj-f-link').value || '').trim();
              if (!v) { App.ui.toast('링크를 입력해 주세요'); return false; }
              App.store.updateProject(id, { links: (e.links || []).concat([v]) });
              // GitHub 레포면 같은 레포를 코드 분석 탭으로 이어서 분석
              if (isGh(v) && !e.repo) { ui.tab[id] = 'code'; App.ui.toast('결과물 링크를 연결했어요 · 레포 코드를 분석할게요'); setTimeout(() => runAnalyze(id, v), 0); }
              else { App.ui.toast('결과물 링크를 연결했어요'); rerenderLocal(); }
              return true;
            },
          });
        } else if (act === 'finish') {
          App.ui.modal({
            title: '프로젝트를 마무리할까요?', confirmText: '마무리하기',
            body: `<p>상태가 <b>완성</b>으로 바뀌고 체크인 질문이 멈춰요. ${orphanLogs(e).length ? ` 아직 경험에 반영되지 않은 체크인 <b>${orphanLogs(e).length}개</b>를 타임라인에서 반영해 두면 면접 준비가 훨씬 쉬워져요.` : ''}</p>`,
            onConfirm() {
              const n = new Date();
              App.store.addLog(id, { type: 'milestone', text: '프로젝트 마무리.' });
              App.store.updateProject(id, { status: 'done', period: Object.assign({}, e.period, { end: `${n.getFullYear()}-${pad(n.getMonth() + 1)}` }) });
              App.ui.toast('수고했어요! 프로젝트를 마무리했어요'); rerenderLocal(); return true;
            },
          });
        } else if (act === 'reopen') {
          App.store.updateProject(id, { status: 'ongoing', period: Object.assign({}, e.period, { end: '' }) });
          App.ui.toast('다시 진행중으로 바꿨어요'); rerenderLocal();
        }
      };

      // 기록 수정 중 키워드 미리보기
      let t = null;
      const onInput = (ev) => {
        if (ev.target.matches && ev.target.matches('.pj-gf-ta')) { fitTa(ev.target); return; }
        if (ev.target.id === 'pj-edit-date' && ui.edit) { ui.edit.date = ev.target.value; return; }
        if (ev.target.id !== 'pj-edit-ta' || !ui.edit) return;
        const scope = 'ed';
        ui.edit.text = ev.target.value;
        const val = ev.target.value || '';
        clearTimeout(t);
        t = setTimeout(() => {
          const st = kwStateOf(); if (!st) return;
          const next = App.ai.extractKeywords(val);
          if (next.join() === st.suggested.join()) return;
          st.suggested = next; redrawKw(scope);
        }, 250);
      };
      // 담기 전에 고친 이력서 문장은 포커스가 빠질 때 저장
      const onChange = (ev) => {
        const fid = ev.target.getAttribute && ev.target.getAttribute('data-gh-bullet'); if (!fid) return;
        const text = ev.target.value.trim(); const p = App.store.getProject(id);
        const f = p && p.repo && p.repo.findings.find((x) => x.id === fid);
        if (f && text && text !== f.bullet) App.store.updateFinding(id, fid, { bullet: text, edited: true });
      };
      const onKey = (ev) => {
        if (ev.target.id === 'pj-gh-url' && ev.key === 'Enter' && !ev.isComposing) { ev.preventDefault(); runAnalyze(id, ev.target.value); return; }
        if (ev.target.matches && ev.target.matches('[data-kw-input]') && ev.key === 'Enter' && !ev.isComposing) {
          ev.preventDefault();
          const scope = ev.target.closest('[data-kw-scope]').getAttribute('data-kw-scope'); const st = kwStateOf();
          if (st && ev.target.value.trim()) { kwAdd(st, ev.target.value); redrawKw(scope); const inp = root.querySelector(`[data-kw-scope="${scope}"] [data-kw-input]`); if (inp) inp.focus(); }
          return;
        }
        if (ev.target.id === 'pj-edit-ta' && ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) { const b = root.querySelector('[data-pj-log=save]'); if (b) b.click(); return; }
        if (ev.target.id === 'pj-edit-ta' && ev.key === 'Escape') { ui.edit = null; rerenderLocal(); }
      };
      root.addEventListener('click', onClick);
      root.addEventListener('input', onInput);
      root.addEventListener('keydown', onKey);
      root.addEventListener('change', onChange);
      fitTas(); bindReports(); placeTalks();
      if (ui.autoAnalyze && ui.autoAnalyze.pid === id) { const u = ui.autoAnalyze.url; ui.autoAnalyze = null; setTimeout(() => runAnalyze(id, u), 0); }
      return () => {
        clearTimeout(t); ui.edit = null; ui.logTalk = null; ui.codeTalk = null; alive = false;
        Object.keys(talks).forEach(dropTalk);
        if (ui.report && ui.report.pid === id) ui.report = null; if (ui.ghView && ui.ghView.redraw === ghRedraw) ui.ghView = null;
        root.removeEventListener('click', onClick); root.removeEventListener('input', onInput); root.removeEventListener('keydown', onKey); root.removeEventListener('change', onChange);
      };
    },
  };
})(window.App);
