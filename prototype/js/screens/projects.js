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
  function nextCheckin(e) {
    const [days, label] = CADENCE[App.store.state.settings.projectCheckin] || CADENCE.every2days;
    const last = lastLog(e);
    if (!last) return { due: true, text: '첫 체크인을 남겨 주세요', label };
    const next = toDate(last.date); next.setDate(next.getDate() + days);
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
  function typeBar(e) {
    const c = typeCounts(e); const total = (e.logs || []).length;
    if (!total) return '<div class="pj-typebar pj-typebar-empty"></div>';
    return `<div class="pj-typebar" title="로그 유형 분포">${TYPE_ORDER.filter((t) => c[t]).map((t) =>
      `<span data-type="${t}" style="flex:${c[t]}"></span>`).join('')}</div>`;
  }
  function projectCard(e) {
    const last = lastLog(e); const nx = nextCheckin(e);
    return `<div class="card pj-card" data-href="#/projects/${esc(e.id)}">
      <div class="pj-card-top">${App.ui.statusTag(e.status)}<span class="subtle">${App.ui.period(e.period)}</span>
        ${e.status === 'ongoing' ? `<span class="pj-due ${nx.due ? 'is-due' : ''}">${nx.due ? '● ' : ''}${esc(nx.text)}</span>` : ''}</div>
      <div class="pj-card-title">${esc(e.title)}</div>
      <div class="pj-card-role">${esc(e.role || '역할 미입력')}</div>
      ${typeBar(e)}
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
        <label class="label" for="pj-f-gh">GitHub 링크 <span class="subtle">(선택)</span></label>
        <input class="input" id="pj-f-gh" placeholder="https://github.com/..." />
        <p class="subtle pj-form-note">결과물 링크는 보조 근거로만 붙여 둘게요. 핵심은 과정 기록이에요.</p>
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
        App.ui.toast('프로젝트 트래킹을 시작했어요');
        App.navigate('#/projects/' + exp.id);
        return true;
      },
    });
    setTimeout(() => { const el = document.getElementById('pj-f-title'); if (el) el.focus(); }, 30);
  }

  /* ---------- 상세 ---------- */
  // 화면 상태 (프로젝트별 질문 인덱스)
  const ui = { qIndex: {}, type: {}, ck: {}, edit: null, pick: null }; // pick: { pid, ids: [] } — 카드로 만들 로그 고르는 중

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
    return `<div class="card pj-checkin">
      <div class="pj-checkin-head"><span class="ai-badge"><span class="ai-dot">R</span>오늘의 체크인</span>
        <button class="btn btn-ghost btn-sm" data-pj="next-q">↻ 다른 질문</button></div>
      <div class="pj-q">${esc(q.text)}</div>
      <div class="pj-q-why">${esc(whyQuestion(e, q))}</div>
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

  function renderDetail(id) {
    const e = App.store.getProject(id);
    if (!e) {
      return `<div class="page"><div class="card empty"><div class="big">▤</div>프로젝트를 찾을 수 없어요.
        <div style="margin-top:14px"><a class="btn" href="#/projects">← 프로젝트 목록으로</a></div></div></div>`;
    }
    const gh = ghLink(e); const nx = nextCheckin(e);
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
          <div class="section-title pj-tl-title">과정 타임라인 <span class="subtle">${(e.logs || []).length}개 기록</span></div>
          ${pickBar(e)}
          ${timeline(e)}
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
    render(params) { return params && params.id ? renderDetail(params.id) : renderList(); },
    mount(root, params) {
      const id = params && params.id;
      const rerenderLocal = () => {
        const ck = root.querySelector('#pj-ta'); const draft = ck ? ck.value : '';
        root.innerHTML = params && params.id ? renderDetail(id) : renderList();
        const ck2 = root.querySelector('#pj-ta'); if (ck2 && draft) ck2.value = draft;
      };

      const kwStateOf = (scope) => (scope === 'ed' ? ui.edit && ui.edit.kw : ckState(id));
      const redrawKw = (scope) => {
        const st = kwStateOf(scope); if (!st) return;
        const box = root.querySelector(scope === 'ed' ? '#pj-ed-kw' : '#pj-ck-kw'); if (box) box.innerHTML = kwEditor(st, scope);
      };
      const focusEdit = () => { const ta = root.querySelector('#pj-edit-ta'); if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); } };

      const onClick = (ev) => {
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
          // 유형을 바꾸면 그 유형에 맞는 질문으로
          const qi = window.SEED.projectCheckins.findIndex((q) => q.type === t);
          const draft = (root.querySelector('#pj-ta') || {}).value || '';
          if (qi >= 0) ui.qIndex[id] = qi;
          rerenderLocal(); const ta = root.querySelector('#pj-ta'); if (ta) { ta.value = draft; ta.focus(); }
          return;
        }
        const btn = ev.target.closest('[data-pj]'); if (!btn) return;
        const act = btn.getAttribute('data-pj'); const e = id ? App.store.getProject(id) : null;
        if (act === 'new') return openNewModal();
        if (!e) return;
        if (act === 'next-q') {
          const Q = window.SEED.projectCheckins;
          ui.qIndex[id] = ((ui.qIndex[id] || 0) + 1) % Q.length; ui.type[id] = Q[ui.qIndex[id]].type;
          const draft = (root.querySelector('#pj-ta') || {}).value || '';
          rerenderLocal(); const ta = root.querySelector('#pj-ta'); if (ta) ta.value = draft;
        } else if (act === 'save') {
          const ta = root.querySelector('#pj-ta'); const text = (ta.value || '').trim();
          if (!text) { App.ui.toast('한 줄만 적어 주세요. 짧아도 괜찮아요'); ta.focus(); return; }
          const kws = kwSelected(ckState(id));
          App.store.addLog(id, { type: ui.type[id] || 'milestone', text, keywords: kws });
          delete ui.ck[id];
          App.ui.toast(kws.length ? `기록했어요 · ${kws.map((k) => '#' + k).join(' ')}` : '기록했어요. 과정이 하나 더 쌓였어요');
          const Q = window.SEED.projectCheckins;
          ui.qIndex[id] = ((ui.qIndex[id] || 0) + 1) % Q.length; ui.type[id] = Q[ui.qIndex[id]].type;
          rerenderLocal();
        } else if (act === 'pick') {
          ui.edit = null; ui.pick = { pid: id, ids: [] }; rerenderLocal();
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
      const onKey = (ev) => {
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
      return () => { clearTimeout(t); ui.edit = null; ui.pick = null; root.removeEventListener('click', onClick); root.removeEventListener('input', onInput); root.removeEventListener('keydown', onKey); };
    },
  };
})(window.App);
