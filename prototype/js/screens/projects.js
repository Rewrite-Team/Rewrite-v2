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
  const topKeywords = (e, n) => {
    const set = []; e.keywords.forEach((k) => set.push(k));
    logKeywordCounts(e).forEach(([k]) => { if (!set.includes(k)) set.push(k); });
    return set.slice(0, n);
  };
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
        <p class="pj-form-intro">프로젝트를 경험 카드로 만들고, 진행하는 동안 체크인 질문을 보내 드릴게요.</p>
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
        const exp = App.store.create({
          isProject: true, status: 'ongoing', category: '프로젝트', title, role,
          period: { start: v('pj-f-start') || month, end: '' }, links: gh ? [gh] : [],
          summary: '', jobs: [App.store.state.user.targetJob].filter(Boolean),
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
  const ui = { qIndex: {}, type: {} };

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
      <div class="pj-checkin-foot"><span class="subtle" id="pj-kw-preview">쓰는 동안 역량 키워드를 찾아 드려요</span>
        <button class="btn btn-primary" data-pj="save">기록하기</button></div>
    </div>`;
  }

  function timeline(e) {
    const logs = sortedLogs(e);
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
          return `<div class="pj-log" data-type="${esc(l.type)}">
            <div class="pj-log-ico">${t.ico}</div>
            <div class="pj-log-body">
              <div class="pj-log-meta"><span class="pj-log-type">${t.label}</span><span>${esc(md(l.date))}</span></div>
              <div class="pj-log-text">${esc(l.text)}</div>
              ${(l.keywords || []).length ? `<div class="exp-card-kws">${l.keywords.map((k) => App.ui.keywordChip(k)).join('')}</div>` : ''}
            </div></div>`;
        }).join('')}</div>`;
    }).join('')}</div>`;
  }

  function sidePanel(e) {
    const kc = logKeywordCounts(e); const max = kc.length ? kc[0][1] : 1;
    const c = typeCounts(e);
    const missing = TYPE_ORDER.filter((t) => !c[t] && t !== 'milestone');
    const notOnCard = kc.map(([k]) => k).filter((k) => !e.keywords.includes(k));
    return `<aside class="pj-side">
      <div class="card card-pad">
        <div class="section-title">이 프로젝트에서 드러난 역량</div>
        ${kc.length ? `<div class="pj-comp">${kc.slice(0, 6).map(([k, n]) => `<div class="pj-comp-row">
            ${App.ui.keywordChip(k)}<div class="pj-comp-bar" data-tone="${App.keywords.tone(k)}"><span style="width:${Math.round((n / max) * 100)}%"></span></div><span class="pj-comp-n">${n}</span></div>`).join('')}</div>
          ${notOnCard.length ? `<div class="pj-side-note">카드에 아직 없는 역량: ${notOnCard.map((k) => '#' + esc(k)).join(' ')}
            <button class="btn btn-sm" data-pj="add-kws">카드에 추가</button></div>` : ''}`
          : '<p class="subtle">체크인을 남기면 로그에서 역량 키워드를 찾아 보여 드려요.</p>'}
        <div class="divider"></div>
        <div class="pj-types-sum">${TYPE_ORDER.map((t) => `<div data-type="${t}"><span class="pj-dot"></span>${TYPES[t].label}<b>${c[t] || 0}</b></div>`).join('')}</div>
        ${missing.length ? `<p class="pj-side-hint"><span class="ai-dot">R</span>‘${TYPES[missing[0]].label}’ 기록이 아직 없어요. 면접에서 자주 묻는 부분이라 다음 체크인에서 여쭤볼게요.</p>` : ''}
      </div>
      <div class="card card-pad pj-star-box">
        <div class="section-title">STAR로 정리하기</div>
        <p class="subtle">쌓인 로그를 상황·과제·행동·결과로 묶어 카드 초안을 만들어 드려요.</p>
        <div class="pj-star-map">
          <div><b>A</b> 행동 ← 의사결정·이슈·협업</div>
          <div><b>R</b> 결과 ← 마일스톤</div>
          <div><b>+</b> 배운 점 ← 배움</div>
        </div>
        <button class="btn btn-primary pj-full" data-pj="star" ${(e.logs || []).length ? '' : 'disabled'}>✦ STAR 초안 만들기</button>
        <div class="pj-complete"><span>카드 완성도</span><b>${e.completeness}%</b></div>${App.ui.progress(e.completeness)}
      </div>
      ${e.status === 'done' ? `<div class="card card-pad pj-done-box"><b>마무리한 프로젝트예요</b>
          <p class="subtle">다시 진행해야 한다면 언제든 이어서 기록할 수 있어요.</p>
          <button class="btn btn-sm" data-pj="reopen">다시 진행중으로</button></div>`
        : `<button class="btn pj-full pj-finish" data-pj="finish">프로젝트 마무리하기</button>`}
    </aside>`;
  }

  function renderDetail(id) {
    const e = App.store.get(id);
    if (!e || !e.isProject) {
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
          <a class="btn" href="#/card/${esc(e.id)}">카드 보기</a>
        </div>
      </div>
      <div class="pj-layout">
        <div class="pj-main">
          ${e.status !== 'done' ? checkinCard(e) : ''}
          <div class="section-title pj-tl-title">과정 타임라인 <span class="subtle">${(e.logs || []).length}개 기록</span></div>
          ${timeline(e)}
        </div>
        ${sidePanel(e)}
      </div>
    </div>`;
  }

  /* ---------- STAR 초안 ---------- */
  const sentence = (t) => { const s = String(t || '').trim(); return s && !/[.!?。]$/.test(s) ? s + '.' : s; };
  function draftStar(e) {
    const logs = (e.logs || []).slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const of = (...ts) => logs.filter((l) => ts.includes(l.type));
    const ms = of('milestone');
    const first = ms[0];
    const acts = of('decision', 'issue', 'collab').slice(-4);
    const resultLogs = ms.length > 1 ? ms.slice(1) : [];
    const numeric = of('issue', 'decision').filter((l) => /\d/.test(l.text) && /→|->|개선|단축|줄/.test(l.text));
    const s = e.star || {};
    const draft = {
      situation: s.situation || sentence(e.summary || (first ? first.text : `${e.title} 프로젝트를 진행함`)),
      task: s.task || sentence(e.role ? `${e.role} 역할을 맡음` : ''),
      action: acts.length ? acts.map((l) => sentence(l.text)).join(' ') : (s.action || ''),
      result: (resultLogs.length || numeric.length)
        ? [...numeric.map((l) => sentence(l.text.split(/[.。]/).filter((x) => /\d/.test(x)).pop() || l.text)), ...resultLogs.map((l) => sentence(l.text))].join(' ')
        : (s.result || ''),
    };
    const learn = of('learning');
    const insights = learn.length ? learn.map((l) => sentence(l.text)).join(' ') : (e.insights || '');
    const src = { situation: s.situation ? '기존 카드' : (e.summary ? '카드 요약' : '첫 마일스톤'), task: s.task ? '기존 카드' : '내 역할',
      action: acts.length ? `로그 ${acts.length}개` : '기존 카드', result: (resultLogs.length + numeric.length) ? `로그 ${resultLogs.length + numeric.length}개` : '기존 카드',
      insights: learn.length ? `배움 로그 ${learn.length}개` : '기존 카드' };
    const newKws = logKeywordCounts(e).map(([k]) => k).filter((k) => !e.keywords.includes(k)).slice(0, Math.max(0, 6 - e.keywords.length));
    return { draft, insights, src, newKws };
  }
  function openStarModal(e) {
    const { draft, insights, src, newKws } = draftStar(e);
    const rows = [['situation', 'S', '상황'], ['task', 'T', '과제'], ['action', 'A', '행동'], ['result', 'R', '결과']];
    App.ui.modal({
      title: 'STAR 초안을 만들었어요',
      confirmText: '카드에 반영하기',
      body: `<div class="pj-star-prev">
        <p class="pj-form-intro">원문 로그는 그대로 두고, 카드의 STAR 정리만 바꿔요. 반영 후에도 카드에서 고칠 수 있어요.</p>
        ${rows.map(([k, l, name]) => `<div class="pj-star-row"><div class="pj-star-k">${l}<span>${name}</span></div>
          <div class="pj-star-v">${draft[k] ? esc(draft[k]) : '<span class="subtle">비어 있어요 — 관련 로그가 쌓이면 채워져요</span>'}
          <div class="pj-star-src">${esc(src[k])}에서</div></div></div>`).join('')}
        ${insights ? `<div class="pj-star-row"><div class="pj-star-k">+<span>배운 점</span></div><div class="pj-star-v">${esc(insights)}<div class="pj-star-src">${esc(src.insights)}에서</div></div></div>` : ''}
        ${newKws.length ? `<div class="pj-star-kws">로그에서 찾은 역량도 함께 추가돼요 ${newKws.map((k) => App.ui.keywordChip(k, { ai: true })).join('')}</div>` : ''}
        <label class="pj-check"><input type="checkbox" id="pj-only-empty" /> 이미 쓴 칸은 그대로 두고 빈 칸만 채우기</label>
      </div>`,
      onConfirm(root) {
        const onlyEmpty = root.querySelector('#pj-only-empty').checked;
        const cur = e.star || {}; const star = {};
        ['situation', 'task', 'action', 'result'].forEach((k) => { star[k] = onlyEmpty && cur[k] ? cur[k] : (draft[k] || cur[k] || ''); });
        const patch = { star, keywords: e.keywords.concat(newKws) };
        if (insights && (!onlyEmpty || !e.insights)) patch.insights = insights;
        const up = App.store.update(e.id, patch);
        App.ui.toast(`카드에 반영했어요 · 완성도 ${up.completeness}%`);
        App.rerender();
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
      const rerenderLocal = () => { root.innerHTML = params && params.id ? renderDetail(id) : renderList(); };

      const onClick = (ev) => {
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
        const act = btn.getAttribute('data-pj'); const e = id ? App.store.get(id) : null;
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
          const kws = App.ai.extractKeywords(text);
          App.store.addLog(id, { type: ui.type[id] || 'milestone', text });
          App.ui.toast(kws.length ? `기록했어요 · ${kws.map((k) => '#' + k).join(' ')} 역량이 보였어요` : '기록했어요. 과정이 하나 더 쌓였어요');
          const Q = window.SEED.projectCheckins;
          ui.qIndex[id] = ((ui.qIndex[id] || 0) + 1) % Q.length; ui.type[id] = Q[ui.qIndex[id]].type;
          rerenderLocal();
        } else if (act === 'star') {
          openStarModal(e);
        } else if (act === 'add-kws') {
          const add = logKeywordCounts(e).map(([k]) => k).filter((k) => !e.keywords.includes(k));
          App.store.update(id, { keywords: e.keywords.concat(add) });
          App.ui.toast('카드에 역량 키워드를 추가했어요'); rerenderLocal();
        } else if (act === 'add-link') {
          App.ui.modal({
            title: '결과물 링크 연결', confirmText: '연결하기',
            body: `<p class="pj-form-intro">GitHub 저장소나 배포 주소를 보조 근거로 붙여 둘게요.</p><input class="input" id="pj-f-link" placeholder="https://github.com/..." />`,
            onConfirm(r) {
              const v = (r.querySelector('#pj-f-link').value || '').trim();
              if (!v) { App.ui.toast('링크를 입력해 주세요'); return false; }
              App.store.update(id, { links: (e.links || []).concat([v]) }); App.ui.toast('결과물 링크를 연결했어요'); rerenderLocal(); return true;
            },
          });
        } else if (act === 'finish') {
          App.ui.modal({
            title: '프로젝트를 마무리할까요?', confirmText: '마무리하기',
            body: `<p>상태가 <b>완성</b>으로 바뀌고 체크인 질문이 멈춰요. 마무리 전에 <b>STAR로 정리하기</b>를 한 번 해 두면 면접 준비가 훨씬 쉬워져요.</p>`,
            onConfirm() {
              const n = new Date();
              App.store.addLog(id, { type: 'milestone', text: '프로젝트 마무리.' });
              App.store.update(id, { status: 'done', period: Object.assign({}, e.period, { end: `${n.getFullYear()}-${pad(n.getMonth() + 1)}` }) });
              App.ui.toast('수고했어요! 프로젝트를 마무리했어요'); rerenderLocal(); return true;
            },
          });
        } else if (act === 'reopen') {
          App.store.update(id, { status: 'ongoing', period: Object.assign({}, e.period, { end: '' }) });
          App.ui.toast('다시 진행중으로 바꿨어요'); rerenderLocal();
        }
      };

      // 입력 중 키워드 미리보기
      let t = null;
      const onInput = (ev) => {
        if (ev.target.id !== 'pj-ta') return;
        clearTimeout(t);
        t = setTimeout(() => {
          const el = root.querySelector('#pj-kw-preview'); if (!el) return;
          const kws = App.ai.extractKeywords(ev.target.value || '');
          el.innerHTML = kws.length ? `<span class="pj-kw-found">AI가 찾은 역량</span> ${kws.map((k) => App.ui.keywordChip(k, { ai: true })).join(' ')}` : '쓰는 동안 역량 키워드를 찾아 드려요';
        }, 250);
      };
      const onKey = (ev) => {
        if (ev.target.id === 'pj-ta' && ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) { const b = root.querySelector('[data-pj=save]'); if (b) b.click(); }
      };
      root.addEventListener('click', onClick);
      root.addEventListener('input', onInput);
      root.addEventListener('keydown', onKey);
      return () => { clearTimeout(t); root.removeEventListener('click', onClick); root.removeEventListener('input', onInput); root.removeEventListener('keydown', onKey); };
    },
  };
})(window.App);
