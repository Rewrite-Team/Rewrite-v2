/* 프로젝트 트래커 — #/projects (목록), #/projects/:id (상세) */
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
  // 로그 id → 그 로그로 만든 카드들
  function cardsByLog(p) {
    const m = {};
    App.store.cardsOf(p.id).forEach((c) => (c.sourceLogIds || []).forEach((lid) => { (m[lid] = m[lid] || []).push(c); }));
    return m;
  }
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
        <div><b>${App.store.cardsOf(e.id).length}</b><span>경험 카드</span></div>
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
        <div><h1>프로젝트 트래커</h1><p>진행 중인 프로젝트에 짧게 체크인하면, 의사결정·이슈·협업 과정이 그대로 쌓여요.</p></div>
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
      confirmText: '트래킹 시작',
      body: `<div class="pj-form">
        <p class="pj-form-intro">진행하는 동안 체크인 질문을 보내 드릴게요. 쌓인 기록에서 에피소드를 골라 경험 카드를 여러 장 만들 수 있어요.</p>
        <label class="label" for="pj-f-title">프로젝트 이름 <span class="pj-req">*</span></label>
        <input class="input" id="pj-f-title" placeholder="예) 팀 프로젝트 「모여봄」" maxlength="60" />
        <label class="label" for="pj-f-role">내 역할</label>
        <input class="input" id="pj-f-role" placeholder="예) 백엔드 (Spring Boot), 4인 팀" maxlength="60" />
        <label class="label" for="pj-f-start">시작한 달</label>
        <input class="input" id="pj-f-start" type="month" value="${month}" />
        <label class="label" for="pj-f-gh">GitHub 레포 <span class="subtle">(선택)</span></label>
        <input class="input" id="pj-f-gh" placeholder="https://github.com/owner/repo" spellcheck="false" />
        <p class="subtle pj-form-note">GitHub 레포 주소를 넣으면 코드에서 이력서에 쓸 기술 포인트도 찾아 드려요. 핵심은 여전히 과정 기록이에요.</p>
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
        if (isRepo) ui.tab[exp.id] = 'code';
        App.ui.toast(isRepo ? '프로젝트 트래킹을 시작했어요 · 코드 분석 탭에서 레포를 분석해 보세요' : '프로젝트 트래킹을 시작했어요');
        App.navigate('#/projects/' + exp.id);
        return true;
      },
    });
    setTimeout(() => { const el = document.getElementById('pj-f-title'); if (el) el.focus(); }, 30);
  }

  /* ---------- 상세 ---------- */
  // 화면 상태 (프로젝트별 질문 인덱스)
  const ui = { qIndex: {}, type: {}, ck: {}, edit: null, pick: null, tab: {}, gh: {}, ghView: null }; // tab: 프로젝트별 'timeline'|'code', gh: 레포 분석 화면 상태 // pick: { pid, ids: [] } — 카드로 만들 로그 고르는 중

  /* ---------- 역량 키워드 편집기 (체크인·로그 수정 공용) ----------
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
  const ckState = (id) => (ui.ck[id] = ui.ck[id] || kwNew());

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
    if (oq) { ui.type[e.id] = oq.checkinType || ui.type[e.id] || 'milestone'; return { type: oq.checkinType, text: oq.checkinText || oq.text, inbox: oq }; }
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
      <div class="pj-q">${esc(q.text)}</div>
      <div class="pj-q-why">${esc(whyQuestion(e, q))}</div>
      ${q.inbox ? '<a class="pj-ck-sync" href="#/daily">✉ 오늘의 질문함에도 같은 질문이 도착했어요 · 어디서 답해도 함께 완료돼요</a>'
        : `<div class="pj-ck-sync is-quiet">다음 체크인 질문은 ${esc(md(dueDate))}에 드릴게요. 지금 자유롭게 남겨도 좋아요.</div>`}
      <div class="pj-types" role="radiogroup" aria-label="기록 유형">
        ${TYPE_ORDER.map((t) => `<button class="pj-type ${sel === t ? 'on' : ''}" data-type="${t}" data-pj-type="${t}" role="radio" aria-checked="${sel === t}">
          <span class="pj-type-ico">${TYPES[t].ico}</span>${TYPES[t].label}</button>`).join('')}
      </div>
      <textarea class="textarea pj-ta" id="pj-ta" rows="3" maxlength="400" placeholder="한두 줄이면 충분해요. 예) JWT와 세션 중 고민하다가 모바일 확장 때문에 JWT로 결정했어요."></textarea>
      <div id="pj-ck-kw">${kwEditor(ckState(e.id), 'ck')}</div>
      <div class="pj-checkin-foot"><span class="subtle">⌘/Ctrl + Enter로 바로 기록</span>
        <button class="btn btn-primary" data-pj="save">기록하기</button></div>
    </div>`;
  }

  function timeline(e) {
    const logs = sortedLogs(e);
    const used = cardsByLog(e);
    const picking = ui.pick && ui.pick.pid === e.id;
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
          const on = picking && ui.pick.ids.includes(l.id);
          const cards = used[l.id] || [];
          return `<div class="pj-log ${picking ? 'is-picking' : ''} ${on ? 'is-picked' : ''}" data-type="${esc(l.type)}" ${picking ? `data-pj-pick="${esc(l.id)}"` : ''}>
            ${picking ? `<span class="pj-log-check" aria-hidden="true">${on ? '✓' : ''}</span>` : ''}
            <div class="pj-log-ico">${t.ico}</div>
            <div class="pj-log-body">
              <div class="pj-log-meta"><span class="pj-log-type">${t.label}</span><span>${esc(md(l.date))}</span>
                ${cards.map((c) => `<a class="pj-log-card" href="#/card/${esc(c.id)}" title="${esc(c.title)}">▣ 카드</a>`).join('')}
                ${picking ? '' : `<span class="pj-log-acts"><button type="button" data-pj-log="edit" data-id="${esc(l.id)}">수정</button><button type="button" data-pj-log="del" data-id="${esc(l.id)}">삭제</button></span>`}</div>
              <div class="pj-log-text">${esc(l.text)}</div>
              ${(l.keywords || []).length ? `<div class="exp-card-kws">${l.keywords.map((k) => App.ui.keywordChip(k)).join('')}</div>` : ''}
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
    const used = cardsByLog(e);
    const unused = (e.logs || []).filter((l) => !used[l.id] && l.type !== 'milestone');
    const cardKws = new Set(cards.flatMap((x) => x.keywords));
    const notOnCard = kc.map(([k]) => k).filter((k) => !cardKws.has(k));
    return `<aside class="pj-side">
      <div class="card card-pad pj-cards-box">
        <div class="section-title">이 프로젝트에서 나온 경험 카드 <span class="subtle">${cards.length}</span></div>
        ${cards.length ? `<div class="pj-cards">${cards.map((x) => `<a class="pj-cardlink" href="#/card/${esc(x.id)}">
            <div class="pj-cardlink-top">${App.ui.statusTag(x.status)}<span class="pj-cardlink-pct">${x.completeness}%</span></div>
            <div class="pj-cardlink-title">${esc(x.title)}</div>
            <div class="exp-card-kws">${x.keywords.slice(0, 3).map((k) => App.ui.keywordChip(k)).join('')}</div></a>`).join('')}</div>`
          : '<p class="subtle">아직 없어요. 한 프로젝트에서도 에피소드마다 카드를 따로 만들면 자소서·면접에서 골라 쓰기 좋아요.</p>'}
        ${unused.length ? `<p class="pj-side-hint"><span class="ai-dot">R</span>아직 카드로 만들지 않은 기록이 ${unused.length}개 있어요${notOnCard.length ? ` · ${notOnCard.slice(0, 3).map((k) => '#' + esc(k)).join(' ')} 에피소드가 비어 있어요` : ''}.</p>` : ''}
        <button class="btn btn-primary pj-full" data-pj="pick" ${(e.logs || []).length ? '' : 'disabled'}>✦ 기록 골라 경험 카드 만들기</button>
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

  function pickBar(e) {
    if (!ui.pick || ui.pick.pid !== e.id) return '';
    const n = ui.pick.ids.length;
    return `<div class="card pj-pickbar">
      <div><b>카드로 만들 기록을 골라 주세요</b><span class="subtle">한 에피소드(하나의 문제·결정·협업)에 해당하는 기록만 묶을수록 STAR가 선명해져요.</span></div>
      <div class="pj-pickbar-acts"><button class="btn btn-sm" data-pj="pick-cancel">취소</button>
        <button class="btn btn-sm btn-primary" data-pj="make-card" ${n ? '' : 'disabled'}>${n ? `${n}개로 카드 만들기` : '기록을 골라 주세요'}</button></div>
    </div>`;
  }

  /* ---------- 코드에서 이력서 거리 찾기 (GitHub 레포 분석) ---------- */
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
      <span class="ai-badge"><span class="ai-dot">R</span>코드에서 이력서 거리 찾기</span>
      <div class="pj-gh-empty-title">GitHub 레포를 연결하면, 코드 속에서 이력서에 쓸 기술 포인트를 찾아 드려요</div>
      <p class="pj-gh-empty-desc">캐시·인증·동시성 제어·테스트·CI 같은 구현을 찾아 이력서 문장으로 정리하고, <b>어느 파일 몇 번째 줄</b>에서 찾았는지 근거 코드도 함께 보여 드려요.</p>
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
      <div class="pj-gh-sum"><span class="ai-dot">R</span><span>${live.length ? `이력서에 쓸 만한 기술 포인트 <b>${live.length}개</b>를 찾았어요${added ? ` · 마스터 이력서에 <b>${added}개</b> 담았어요` : ''}. 문장은 담기 전에 고칠 수 있어요.` : '이력서에 쓸 만한 패턴을 아직 찾지 못했어요. 코드가 더 쌓이면 다시 분석해 보세요.'}</span></div>
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
      return `<div class="card card-pad pj-gh-side"><div class="section-title">코드에서 이력서 거리 찾기</div>
        <p class="subtle">GitHub 레포를 연결하면 캐시·인증·테스트 같은 구현을 찾아 이력서 문장으로 정리해 드려요.</p>
        <button class="btn btn-sm pj-full" data-pj-tab="code">⌥ 레포 연결하기</button></div>`;
    }
    const live = liveFindings(repo); const added = live.filter((f) => f.status === 'added').length;
    return `<div class="card card-pad pj-gh-side"><div class="section-title">코드에서 찾은 이력서 거리 <span class="subtle">${live.length}</span></div>
      <div class="pj-gh-side-row"><span>마스터 이력서에 담음</span><b>${added} / ${live.length}</b></div>
      ${App.ui.progress(live.length ? Math.round((added / live.length) * 100) : 0)}
      <button class="btn btn-sm pj-full" data-pj-tab="code" style="margin-top:12px">⌥ 코드 분석 결과 보기</button></div>`;
  }

  function renderDetail(id) {
    const e = App.store.getProject(id);
    if (!e) {
      return `<div class="page"><div class="card empty"><div class="big">▤</div>프로젝트를 찾을 수 없어요.
        <div style="margin-top:14px"><a class="btn" href="#/projects">← 프로젝트 목록으로</a></div></div></div>`;
    }
    const gh = ghLink(e); const nx = nextCheckin(e);
    const tab = ui.pick && ui.pick.pid === e.id ? 'timeline' : (ui.tab[e.id] || 'timeline');
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
        </div>
      </div>
      <div class="pj-layout">
        <div class="pj-main">
          ${e.status !== 'done' && !(ui.pick && ui.pick.pid === e.id) ? checkinCard(e) : ''}
          <div class="pj-tabs" role="tablist">
            <button type="button" class="pj-tab ${tab === 'timeline' ? 'on' : ''}" data-pj-tab="timeline" role="tab" aria-selected="${tab === 'timeline'}">과정 타임라인 <span>${(e.logs || []).length}</span></button>
            <button type="button" class="pj-tab ${tab === 'code' ? 'on' : ''}" data-pj-tab="code" role="tab" aria-selected="${tab === 'code'}">⌥ 코드 분석 <span>${e.repo ? liveFindings(e.repo).length : '＋'}</span></button>
          </div>
          ${tab === 'code' ? `<div id="pj-gh" class="pj-gh">${codeSection(e)}</div>` : `${pickBar(e)}${timeline(e)}`}
        </div>
        ${sidePanel(e)}
      </div>
    </div>`;
  }

  /* ---------- 고른 로그 → 경험 카드 초안 ---------- */
  const sentence = (t) => { const s = String(t || '').trim(); return s && !/[.!?。]$/.test(s) ? s + '.' : s; };
  function draftFromLogs(p, ids) {
    const logs = (p.logs || []).filter((l) => ids.includes(l.id)).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const of = (...ts) => logs.filter((l) => ts.includes(l.type));
    const acts = of('decision', 'issue', 'collab');
    const main = acts[0] || logs[0];
    const numeric = logs.filter((l) => /\d/.test(l.text) && /→|->|개선|단축|줄|초/.test(l.text));
    const ms = of('milestone');
    const learn = of('learning');
    const name = shortName(p.title);
    // 로그 한 줄을 상황(앞) / 행동(뒤)으로 나눠 보기: 화살표가 있으면 화살표 기준, 없으면 첫 문장 기준
    const split = (t) => {
      const str = String(t).trim();
      const arrow = str.split(/\s*(?:→|->)\s*/);
      if (arrow.length > 1) return [arrow[0], arrow.slice(1).join(' ')];
      const sens = str.split(/(?<=[.。!?])\s+/);
      return sens.length > 1 ? [sens[0], sens.slice(1).join(' ')] : [str, ''];
    };
    const strip = (t) => String(t).replace(/[.。]$/, '');
    const star = {
      situation: sentence(`${name} 프로젝트 진행 중, ${strip(split(main.text)[0])}`),
      task: '',
      action: acts.map((l) => sentence(split(l.text)[1] || l.text)).join(' '),
      result: [...numeric.map((l) => sentence(l.text.split(/[.。]/).filter((x) => /\d/.test(x)).pop() || l.text)), ...ms.map((l) => sentence(l.text))].join(' '),
    };
    const kwc = {}; logs.forEach((l) => (l.keywords || []).forEach((k) => { kwc[k] = (kwc[k] || 0) + 1; }));
    const keywords = Object.entries(kwc).sort((a, b) => b[1] - a[1]).map(([k]) => k).slice(0, 4);
    const head = strip(split(main.text)[0]).slice(0, 28);
    const months = logs.map((l) => (l.date || '').slice(0, 7)).filter(Boolean);
    return {
      title: `${name} ${head}`, star, insights: learn.map((l) => sentence(l.text)).join(' '), keywords, logs,
      period: { start: months[0] || '', end: months[months.length - 1] || '' },
    };
  }
  function openCardModal(p, ids) {
    const d = draftFromLogs(p, ids);
    const rows = [['situation', 'S', '상황'], ['task', 'T', '과제'], ['action', 'A', '행동'], ['result', 'R', '결과']];
    App.ui.modal({
      title: '경험 카드 초안을 만들었어요',
      confirmText: '카드 만들기',
      body: `<div class="pj-star-prev">
        <p class="pj-form-intro">고른 기록 ${d.logs.length}개로 만든 초안이에요. 원문 로그는 프로젝트에 그대로 남고, 카드에서 언제든 고칠 수 있어요.</p>
        <label class="label" for="pj-f-ctitle">카드 제목</label>
        <input class="input" id="pj-f-ctitle" value="${esc(d.title)}" maxlength="60" />
        ${rows.map(([k, l, name]) => `<div class="pj-star-row"><div class="pj-star-k">${l}<span>${name}</span></div>
          <div class="pj-star-v">${d.star[k] ? esc(d.star[k]) : '<span class="subtle">비어 있어요 — 카드에서 AI 질문으로 채울 수 있어요</span>'}</div></div>`).join('')}
        ${d.insights ? `<div class="pj-star-row"><div class="pj-star-k">+<span>배운 점</span></div><div class="pj-star-v">${esc(d.insights)}</div></div>` : ''}
        ${d.keywords.length ? `<div class="pj-star-kws">역량 키워드 ${d.keywords.map((k) => App.ui.keywordChip(k, { ai: true })).join('')}</div>` : ''}
      </div>`,
      onConfirm(root) {
        const title = (root.querySelector('#pj-f-ctitle').value || '').trim() || d.title;
        const card = App.store.create({
          title, category: '프로젝트', status: 'draft', projectId: p.id, sourceLogIds: d.logs.map((l) => l.id),
          period: d.period, role: p.role, summary: '', star: d.star, insights: d.insights, keywords: d.keywords,
          jobs: [App.store.state.user.targetJob].filter(Boolean), links: (p.links || []).slice(0, 1),
        });
        ui.pick = null;
        App.ui.toast(`경험 카드를 만들었어요 · 완성도 ${card.completeness}%`);
        App.navigate('#/card/' + card.id);
        return true;
      },
    });
  }

  /* ---------- 화면 등록 ---------- */
  App.screens.projects = {
    title: '프로젝트 트래커',
    render(params) {
      if (params && params.id && params.tab) ui.tab[params.id] = params.tab === 'code' ? 'code' : 'timeline';
      return params && params.id ? renderDetail(params.id) : renderList();
    },
    mount(root, params) {
      const id = params && params.id;
      const rerenderLocal = () => {
        const ck = root.querySelector('#pj-ta'); const draft = ck ? ck.value : '';
        root.innerHTML = params && params.id ? renderDetail(id) : renderList();
        const ck2 = root.querySelector('#pj-ta'); if (ck2 && draft) ck2.value = draft;
        fitTas();
      };
      // 이력서 문장 입력칸은 내용 길이에 맞춰 높이 조절
      const fitTa = (ta) => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 2 + 'px'; };
      const fitTas = () => root.querySelectorAll('.pj-gf-ta').forEach(fitTa);

      const kwStateOf = (scope) => (scope === 'ed' ? ui.edit && ui.edit.kw : ckState(id));
      const redrawKw = (scope) => {
        const st = kwStateOf(scope); if (!st) return;
        const box = root.querySelector(scope === 'ed' ? '#pj-ed-kw' : '#pj-ck-kw'); if (box) box.innerHTML = kwEditor(st, scope);
      };
      /* ---- 코드 분석 ---- */
      let alive = true;
      const ghRedraw = () => { if (!alive) return; const box = root.querySelector('#pj-gh'); const e = App.store.getProject(id); if (box && e) { box.innerHTML = codeSection(e); fitTas(); } };
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
          applyRepo(pid, repo);
          const n = liveFindings(App.store.getProject(pid).repo).length;
          App.ui.toast(n ? `이력서에 쓸 만한 기술 포인트 ${n}개를 찾았어요` : '분석은 끝났는데, 이력서에 쓸 만한 패턴을 찾지 못했어요');
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
        else if (a === 'use-sample' && st.sample) { const s2 = st.sample; Object.assign(st, { error: null, sample: null, sel: [], open: {} }); applyRepo(id, s2); App.ui.toast('저장해 둔 예시 데이터를 불러왔어요'); rerenderLocal(); }
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
      }

      const focusEdit = () => { const ta = root.querySelector('#pj-edit-ta'); if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); } };

      const onClick = (ev) => {
        const tabBtn = ev.target.closest('[data-pj-tab]');
        if (tabBtn && id) {
          ui.tab[id] = tabBtn.getAttribute('data-pj-tab'); ui.pick = null; rerenderLocal();
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
          const scope = kwBtn.closest('[data-kw-scope]').getAttribute('data-kw-scope'); const st = kwStateOf(scope); if (!st) return;
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
        const pickEl = ev.target.closest('[data-pj-pick]');
        if (pickEl && ui.pick) {
          if (ev.target.closest('a')) return;
          const lid = pickEl.getAttribute('data-pj-pick');
          ui.pick.ids = ui.pick.ids.includes(lid) ? ui.pick.ids.filter((x) => x !== lid) : ui.pick.ids.concat([lid]);
          rerenderLocal(); return;
        }
        const logBtn = ev.target.closest('[data-pj-log]');
        if (logBtn) {
          const a = logBtn.getAttribute('data-pj-log'); const e = App.store.getProject(id); if (!e) return;
          if (a === 'edit') {
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
              body: `<p>「${esc(l.text.length > 60 ? l.text.slice(0, 60) + '…' : l.text)}」</p><p style="margin-top:8px">삭제한 기록은 되돌릴 수 없어요.${usedBy.length ? ' 이 기록으로 만든 경험 카드는 그대로 남아요.' : ''}</p>`,
              onConfirm() { App.store.removeLog(id, l.id); if (ui.edit && ui.edit.logId === l.id) ui.edit = null; App.ui.toast('기록을 삭제했어요'); rerenderLocal(); return true; },
            });
          }
          return;
        }
        const typeBtn = ev.target.closest('[data-pj-type]');
        if (typeBtn) {
          const t = typeBtn.getAttribute('data-pj-type');
          ui.type[id] = t;
          // 유형을 바꾸면 그 유형에 맞는 질문으로 (오늘의 질문함의 질문도 함께)
          const qi = window.SEED.projectCheckins.findIndex((q) => q.type === t);
          const draft = (root.querySelector('#pj-ta') || {}).value || '';
          const oq = App.store.openCheckin(id);
          if (qi >= 0) { if (oq) App.store.changeCheckin(oq.id, qi); else ui.qIndex[id] = qi; }
          rerenderLocal(); const ta = root.querySelector('#pj-ta'); if (ta) { ta.value = draft; ta.focus(); }
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
          const draft = (root.querySelector('#pj-ta') || {}).value || '';
          rerenderLocal(); const ta = root.querySelector('#pj-ta'); if (ta) ta.value = draft;
        } else if (act === 'save') {
          const ta = root.querySelector('#pj-ta'); const text = (ta.value || '').trim();
          if (!text) { App.ui.toast('한 줄만 적어 주세요. 짧아도 괜찮아요'); ta.focus(); return; }
          const kws = kwSelected(ckState(id));
          const oq = App.store.openCheckin(id);
          // 오늘의 질문함에 온 체크인이면 그 질문에 답한 것으로 처리 (질문함에서도 답변 완료)
          if (oq) App.store.answer(oq.id, text, { type: ui.type[id] || oq.checkinType, keywords: kws });
          else App.store.addLog(id, { type: ui.type[id] || 'milestone', text, keywords: kws });
          delete ui.ck[id];
          App.ui.toast(oq ? '체크인 완료! 오늘의 질문함에서도 답변 완료로 바뀌었어요' : kws.length ? `기록했어요 · ${kws.map((k) => '#' + k).join(' ')}` : '기록했어요. 과정이 하나 더 쌓였어요');
          const Q = window.SEED.projectCheckins;
          ui.qIndex[id] = ((ui.qIndex[id] || 0) + 1) % Q.length; ui.type[id] = Q[ui.qIndex[id]].type;
          rerenderLocal();
        } else if (act === 'pick') {
          ui.edit = null; ui.pick = { pid: id, ids: [] }; ui.tab[id] = 'timeline'; rerenderLocal();
          const bar = root.querySelector('.pj-pickbar'); if (bar) bar.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (act === 'pick-cancel') {
          ui.pick = null; rerenderLocal();
        } else if (act === 'make-card') {
          if (ui.pick && ui.pick.ids.length) openCardModal(e, ui.pick.ids);
        } else if (act === 'add-link') {
          App.ui.modal({
            title: '결과물 링크 연결', confirmText: '연결하기',
            body: `<p class="pj-form-intro">GitHub 저장소나 배포 주소를 보조 근거로 붙여 둘게요.</p><input class="input" id="pj-f-link" placeholder="https://github.com/..." />`,
            onConfirm(r) {
              const v = (r.querySelector('#pj-f-link').value || '').trim();
              if (!v) { App.ui.toast('링크를 입력해 주세요'); return false; }
              App.store.updateProject(id, { links: (e.links || []).concat([v]) }); App.ui.toast('결과물 링크를 연결했어요'); rerenderLocal(); return true;
            },
          });
        } else if (act === 'finish') {
          App.ui.modal({
            title: '프로젝트를 마무리할까요?', confirmText: '마무리하기',
            body: `<p>상태가 <b>완성</b>으로 바뀌고 체크인 질문이 멈춰요. 마무리 전에 아직 카드로 만들지 않은 기록을 <b>경험 카드</b>로 정리해 두면 면접 준비가 훨씬 쉬워져요.</p>`,
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

      // 입력 중 키워드 미리보기
      let t = null;
      const onInput = (ev) => {
        if (ev.target.matches && ev.target.matches('.pj-gf-ta')) { fitTa(ev.target); return; }
        if (ev.target.id === 'pj-edit-date' && ui.edit) { ui.edit.date = ev.target.value; return; }
        const scope = ev.target.id === 'pj-ta' ? 'ck' : ev.target.id === 'pj-edit-ta' ? 'ed' : null;
        if (!scope) return;
        if (scope === 'ed') ui.edit.text = ev.target.value;
        const val = ev.target.value || '';
        clearTimeout(t);
        t = setTimeout(() => {
          const st = kwStateOf(scope); if (!st) return;
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
          const scope = ev.target.closest('[data-kw-scope]').getAttribute('data-kw-scope'); const st = kwStateOf(scope);
          if (st && ev.target.value.trim()) { kwAdd(st, ev.target.value); redrawKw(scope); const inp = root.querySelector(`[data-kw-scope="${scope}"] [data-kw-input]`); if (inp) inp.focus(); }
          return;
        }
        if (ev.target.id === 'pj-edit-ta' && ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) { const b = root.querySelector('[data-pj-log=save]'); if (b) b.click(); return; }
        if (ev.target.id === 'pj-edit-ta' && ev.key === 'Escape') { ui.edit = null; rerenderLocal(); return; }
        if (ev.target.id === 'pj-ta' && ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) { const b = root.querySelector('[data-pj=save]'); if (b) b.click(); }
      };
      root.addEventListener('click', onClick);
      root.addEventListener('input', onInput);
      root.addEventListener('keydown', onKey);
      root.addEventListener('change', onChange);
      fitTas();
      return () => {
        clearTimeout(t); ui.edit = null; ui.pick = null; alive = false; if (ui.ghView && ui.ghView.redraw === ghRedraw) ui.ghView = null;
        root.removeEventListener('click', onClick); root.removeEventListener('input', onInput); root.removeEventListener('keydown', onKey); root.removeEventListener('change', onChange);
      };
    },
  };
})(window.App);
