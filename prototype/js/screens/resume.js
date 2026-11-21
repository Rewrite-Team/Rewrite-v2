/* 마스터 이력서 — #/resume. 담당: 마스터 이력서
   이력서에 쓸 수 있는 재료를 모두 '풀'에 쌓고, 그중 지금 이력서에 넣을 것만 고른다.
   왼쪽: 재료 풀 편집 (포함/제외·수정·순서·삭제), 오른쪽: 포함된 것만 보이는 현재 이력서, 아래: 버전 기록. */
(function (App) {
  const esc = (s) => App.ui.esc(s);
  const S = () => App.store;

  const SECTIONS = [
    ['project', '프로젝트', '코드 분석과 경험 위키의 경험에서 나온 한 줄이 쌓여요'],
    ['career', '경력', '인턴, 아르바이트, 직장'],
    ['activity', '활동', '동아리, 스터디, 교육 과정, 대외활동'],
    ['education', '학력', ''],
    ['award', '수상·자격', ''],
  ];
  const SECTION_LABEL = Object.fromEntries(SECTIONS.map(([k, l]) => [k, l]));
  const SKILL_GROUPS = ['언어', '프레임워크·라이브러리', 'DB·인프라', '도구·협업'];
  const PROFILE_FIELDS = [
    ['name', '이름', '김준호'], ['headline', '한 줄 소개', '예) 데이터로 병목을 찾는 백엔드 개발자'],
    ['email', '이메일', 'name@example.com'], ['phone', '연락처', '010-0000-0000'],
    ['github', 'GitHub', 'github.com/아이디'], ['blog', '블로그·포트폴리오', 'velog.io/@아이디'],
  ];
  const CATEGORY_SECTION = { '프로젝트': 'project', '아르바이트': 'career', '인턴·직장': 'career' };
  const LOG_LABEL = { decision: '의사결정', issue: '이슈', collab: '협업', milestone: '마일스톤', learning: '배움' };

  // 이번 세션에서 '숨기기' 한 경험 카드 (새 재료 함에서만 숨김)
  const hiddenCards = new Set();

  /* ---------------- 도우미 ---------------- */
  const projShort = (p) => (p ? (p.title.match(/「[^」]+」/) || [p.title.split(' — ')[0]])[0] : '');
  const ym = (s) => (s ? s.replace('-', '.') : '');
  function fmtPeriod(p) {
    if (!p || !p.start) return '';
    if (p.end && p.end === p.start) return ym(p.start);
    return `${ym(p.start)} – ${p.end ? ym(p.end) : '현재'}`;
  }
  const sorted = () => S().resume().entries.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const ofSection = (sec) => sorted().filter((e) => e.section === sec);

  function refs() {
    const bs = S().resumeBullets();
    return {
      findings: new Set(bs.map((b) => b.source && b.source.findingId).filter(Boolean)),
      cards: new Set(bs.map((b) => b.source && b.source.type === 'card' && b.source.expId).filter(Boolean)),
    };
  }

  // 풀 전체 vs 지금 이력서에 들어간 것 (항목 + 한 줄 + 기술)
  function counts() {
    const r = S().resume();
    let pool = 0, inc = 0;
    r.entries.forEach((e) => {
      pool++; if (e.included) inc++;
      e.bullets.forEach((b) => { pool++; if (e.included && b.included) inc++; });
    });
    r.skills.forEach((s) => { pool++; if (s.included) inc++; });
    return { pool, inc };
  }

  // 경험 카드 → 이력서 한 줄 (목업: 행동의 핵심 + 결과)
  function oneLiner(exp) {
    const st = exp.star || {};
    const clean = (t) => String(t || '').trim().replace(/[.。]+$/, '').replace(/(했음|하였음|함|했다|하였다|음)$/, '').trim();
    const sentences = String(st.action || '').split(/(?<=[.。])\s+/).map((x) => x.trim()).filter(Boolean);
    let action = clean(sentences[sentences.length - 1] || '');
    if (action.length > 80) action = action.slice(0, 78) + '…';
    const result = clean(st.result);
    if (action && result) return `${action} → ${result}`;
    if (action) return action;
    return clean(exp.summary) || exp.title;
  }

  function evidenceOf(src) {
    const ff = src && src.findingId ? S().findFinding(src.findingId) : null;
    const ev = (ff && ff.finding.evidence && ff.finding.evidence.length ? ff.finding.evidence : (src && src.evidence) || []);
    return { ff, ev };
  }
  const evLabel = (x) => `${x.path}${x.start ? `:${x.start}${x.end && x.end !== x.start ? '–' + x.end : ''}` : ''}`;

  /* ---------------- 출처 칩 ---------------- */
  function srcChip(e, b) {
    const s = b.source || { type: 'manual' };
    const data = `data-e="${esc(e.id)}" data-b="${esc(b.id)}"`;
    if (s.type === 'github') return `<button type="button" class="rs-src rs-src-gh" data-act="src" ${data} title="근거 코드 보기"><span class="rs-src-ico">&lt;/&gt;</span>GitHub 코드</button>`;
    if (s.type === 'card') {
      const c = S().get(s.expId);
      return c ? `<a class="rs-src rs-src-card" href="#/card/${encodeURIComponent(c.id)}" title="${esc(c.title)}"><span class="rs-src-ico">▦</span>경험</a>`
        : '<span class="rs-src rs-src-card is-gone"><span class="rs-src-ico">▦</span>경험 (삭제됨)</span>';
    }
    if (s.type === 'log') return `<button type="button" class="rs-src rs-src-log" data-act="src" ${data} title="체크인 기록 보기"><span class="rs-src-ico">✎</span>체크인 기록</button>`;
    return '<span class="rs-src rs-src-manual">직접 작성</span>';
  }

  function openSource(e, b) {
    const s = b.source || {};
    if (s.type === 'github') {
      const { ff, ev } = evidenceOf(s);
      const p = S().getProject(s.projectId || (ff && ff.project.id));
      const f = ff && ff.finding;
      App.ui.modal({
        title: f ? f.title : '코드에서 찾은 근거',
        body: `<div class="rs-srcm">
          <div class="rs-srcm-top"><span class="rs-src rs-src-gh"><span class="rs-src-ico">&lt;/&gt;</span>GitHub 코드</span>${p ? `<span class="subtle">${esc(projShort(p))} 레포</span>` : ''}${f && f.category ? `<span class="tag">${esc(f.category)}</span>` : ''}</div>
          <p class="rs-srcm-line">“${esc(b.text)}”</p>
          ${f && f.detail ? `<p class="rs-srcm-detail">${esc(f.detail)}</p>` : ''}
          <div class="rs-srcm-lb">근거 코드</div>
          ${ev.length ? ev.map((x) => `<div class="rs-ev">
            <div class="rs-ev-head"><span class="rs-ev-path">${esc(evLabel(x))}</span>${x.url ? `<a class="rs-ev-link" href="${esc(x.url)}" target="_blank" rel="noopener">GitHub에서 열기 ↗</a>` : ''}</div>
            ${x.code ? `<pre class="rs-ev-code"><code>${esc(x.code)}</code></pre>` : ''}</div>`).join('')
            : '<div class="subtle">저장된 근거 위치가 없어요.</div>'}
          ${!f ? '<div class="rs-srcm-note">지금은 레포 분석 결과가 없어 파일 위치만 보여요. 프로젝트에서 다시 분석하면 코드도 함께 보여요.</div>' : ''}
        </div>`,
        cancelText: '닫기', confirmText: p ? '프로젝트에서 보기 →' : '확인',
        onConfirm() { if (p) App.navigate('#/projects/' + encodeURIComponent(p.id)); },
      });
    } else if (s.type === 'log') {
      const p = S().getProject(s.projectId);
      const l = p && p.logs.find((x) => x.id === s.logId);
      App.ui.modal({
        title: '체크인 기록에서 나온 한 줄',
        body: `<div class="rs-srcm">
          <p class="rs-srcm-line">“${esc(b.text)}”</p>
          <div class="rs-srcm-lb">${p ? esc(projShort(p)) + ' 체크인 로그' : '체크인 로그'}</div>
          ${l ? `<div class="rs-log"><div class="rs-log-top"><span class="tag">${esc(LOG_LABEL[l.type] || '기록')}</span><span class="subtle">${esc(l.date)}</span></div><div>${esc(l.text)}</div></div>` : '<div class="subtle">원래 기록을 찾을 수 없어요. 삭제되었을 수 있어요.</div>'}
        </div>`,
        cancelText: '닫기', confirmText: p ? '프로젝트 타임라인 →' : '확인',
        onConfirm() { if (p) App.navigate('#/projects/' + encodeURIComponent(p.id)); },
      });
    }
  }

  /* ---------------- 카드 → 한 줄 담기 (card.js 에서도 사용) ---------------- */
  function cardTargetOptions(exp) {
    const own = exp.projectId ? S().resume().entries.find((x) => x.projectId === exp.projectId) : null;
    const p = exp.projectId ? S().getProject(exp.projectId) : null;
    const sec = CATEGORY_SECTION[exp.category] || 'activity';
    const opts = [];
    if (p && !own) opts.push({ v: '__project', l: `새 프로젝트 항목 · ${p.title.split(' — ').pop()}` });
    sorted().forEach((e) => opts.push({ v: e.id, l: `${SECTION_LABEL[e.section]} · ${e.title || '제목 없음'}${e.included ? '' : ' (풀에 보관 중)'}` }));
    opts.push({ v: '__new', l: `새 ${SECTION_LABEL[sec]} 항목 만들기 · ${exp.title.split(' — ')[0]}` });
    // 프로젝트가 없는 카드는 제목이 겹치는 항목을 먼저 추천 (예: 「교내 해커톤」 카드 → 「교내 해커톤 장려상」 항목)
    const words = exp.title.split(' — ')[0].replace(/[「」()]/g, ' ').split(/\s+/).filter((w) => w.length >= 2);
    const similar = !p && sorted().map((e) => ({ e, n: words.filter((w) => (e.title || '').includes(w)).length })).filter((x) => x.n).sort((a, b) => b.n - a.n)[0];
    const def = own ? own.id : p ? '__project' : similar ? similar.e.id : '__new';
    return { opts, def, sec };
  }

  function openCardModal(exp, onDone) {
    const { opts, def, sec } = cardTargetOptions(exp);
    App.ui.modal({
      title: '이력서에 한 줄로 담기',
      body: `<div class="rs-form">
        <div class="rs-form-src">${App.ui.statusTag(exp.status)}<b>${esc(exp.title)}</b></div>
        <label class="label" for="rk-text">이력서 한 줄 <span class="rs-ai-mini">AI</span> <span class="subtle">경험의 행동·결과로 만든 초안이에요</span></label>
        <textarea class="textarea" id="rk-text" data-rk-text rows="3">${esc(oneLiner(exp))}</textarea>
        <div class="rs-help">무엇을 했는지 + 숫자로 된 결과가 한 줄에 보이면 좋아요. 담은 뒤에도 마스터 이력서에서 고칠 수 있어요.</div>
        <label class="label" for="rk-target" style="margin-top:14px">담을 곳</label>
        <select class="select" id="rk-target" data-rk-target>${opts.map((o) => `<option value="${esc(o.v)}" ${o.v === def ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}</select>
      </div>`,
      confirmText: '풀에 담기',
      onConfirm(root) {
        const text = root.querySelector('[data-rk-text]').value.trim();
        const target = root.querySelector('[data-rk-target]').value;
        if (!text) { App.ui.toast('한 줄을 적어 주세요'); return false; }
        const item = [{ text, source: { type: 'card', expId: exp.id } }];
        let entry;
        if (target === '__project') entry = S().addResumeBullets(exp.projectId, item);
        else if (target === '__new') {
          const e = S().addResumeEntry({ section: sec, title: exp.title.split(' — ')[0], org: '', period: exp.period || { start: '', end: '' }, role: exp.role || '' });
          entry = S().addResumeBullets(null, item, { entryId: e.id });
        } else entry = S().addResumeBullets(null, item, { entryId: target });
        App.ui.toast(entry && !entry.included ? `담았어요. 「${entry.title}」 항목은 지금 이력서에서 빠져 있어요` : `「${entry ? entry.title : ''}」에 담았어요`);
        if (onDone) onDone(entry);
      },
    });
  }

  App.resumeKit = {
    oneLiner,
    openCardModal,
    isCardIn(expId) { return S().resumeBullets().some((b) => b.source && b.source.type === 'card' && b.source.expId === expId); },
  };

  /* ---------------- 버전 비교 ---------------- */
  function effective(snap) {
    const skills = new Map(); (snap.skills || []).filter((s) => s.included).forEach((s) => skills.set(s.name.toLowerCase(), s.name));
    const entries = new Map(); const bullets = new Map();
    (snap.entries || []).filter((e) => e.included).forEach((e) => {
      entries.set(e.id, e);
      e.bullets.filter((b) => b.included).forEach((b) => bullets.set(b.id, { text: b.text, entry: e.title }));
    });
    return { profile: snap.profile || {}, skills, entries, bullets };
  }
  // 버전(then) → 지금(now) 사이 이력서에 보이는 내용의 차이
  function diff(thenSnap, nowSnap) {
    const a = effective(thenSnap), b = effective(nowSnap);
    const out = [];
    [['name', '이름'], ['headline', '한 줄 소개'], ['email', '이메일'], ['phone', '연락처'], ['github', 'GitHub'], ['blog', '블로그'], ['intro', '자기소개']].forEach(([k, l]) => {
      if ((a.profile[k] || '') !== (b.profile[k] || '')) out.push({ m: '~', kind: '기본 정보', text: `${l}: ${b.profile[k] || '(비움)'}`, before: a.profile[k] || '(비어 있었음)' });
    });
    b.skills.forEach((n, k) => { if (!a.skills.has(k)) out.push({ m: '+', kind: '기술 스택', text: n }); });
    a.skills.forEach((n, k) => { if (!b.skills.has(k)) out.push({ m: '−', kind: '기술 스택', text: n }); });
    const entryLine = (e) => [e.title, e.org, fmtPeriod(e.period)].filter(Boolean).join(' · ');
    b.entries.forEach((e, id) => {
      const o = a.entries.get(id);
      if (!o) out.push({ m: '+', kind: SECTION_LABEL[e.section] || '항목', text: entryLine(e) });
      else if (entryLine(o) !== entryLine(e) || (o.role || '') !== (e.role || '')) out.push({ m: '~', kind: SECTION_LABEL[e.section] || '항목', text: entryLine(e), before: entryLine(o) });
    });
    a.entries.forEach((e, id) => { if (!b.entries.has(id)) out.push({ m: '−', kind: SECTION_LABEL[e.section] || '항목', text: entryLine(e) }); });
    const aTexts = new Set([...a.bullets.values()].map((x) => x.text)); const bTexts = new Set([...b.bullets.values()].map((x) => x.text));
    b.bullets.forEach((x, id) => {
      const o = a.bullets.get(id);
      if (!o) { if (!aTexts.has(x.text)) out.push({ m: '+', kind: '한 줄', text: x.text, where: x.entry }); }
      else if (o.text !== x.text) out.push({ m: '~', kind: '한 줄', text: x.text, before: o.text, where: x.entry });
    });
    a.bullets.forEach((x, id) => { if (!b.bullets.has(id) && !bTexts.has(x.text)) out.push({ m: '−', kind: '한 줄', text: x.text, where: x.entry }); });
    return out;
  }
  const nowSnap = () => { const r = S().resume(); return { profile: r.profile, skills: r.skills, entries: r.entries }; };

  function diffHTML(list) {
    if (!list.length) return '<div class="rs-diff-empty">지금 이력서와 똑같아요.</div>';
    const order = { '+': 0, '~': 1, '−': 2 };
    return `<ul class="rs-diff">${list.slice().sort((x, y) => order[x.m] - order[y.m]).map((d) => `
      <li class="rs-diff-row" data-m="${d.m === '+' ? 'add' : d.m === '−' ? 'del' : 'mod'}">
        <span class="rs-diff-m">${d.m}</span>
        <div class="rs-diff-body"><div class="rs-diff-kind">${esc(d.kind)}${d.where ? ` · ${esc(d.where)}` : ''}</div>
          <div class="rs-diff-text">${esc(d.text)}</div>
          ${d.before ? `<div class="rs-diff-before">이전: ${esc(d.before)}</div>` : ''}</div>
      </li>`).join('')}</ul>`;
  }

  /* ---------------- 렌더: 머리말 ---------------- */
  function headHTML() {
    const c = counts(); const r = S().resume();
    return `<div class="page-head rs-head">
      <div><h1>마스터 이력서</h1>
        <p>회사마다 새로 쓰지 않아도 돼요. 쌓인 재료 중에서 지금 가장 마음에 드는 것만 골라 하나의 이력서를 계속 업그레이드해요.</p></div>
      <div class="rs-head-side">
        <div class="rs-meter" title="풀에 쌓인 재료 중 지금 이력서에 들어간 수">
          <div class="rs-meter-num"><b>${c.inc}</b><span> / ${c.pool}</span></div>
          <div class="rs-meter-lb">풀 ${c.pool}개 중 ${c.inc}개 포함</div>
          <div class="progress"><span style="width:${c.pool ? Math.round(c.inc / c.pool * 100) : 0}%"></span></div>
        </div>
        <div class="rs-head-btns">
          <button type="button" class="btn btn-primary" data-act="save-version">현재 상태를 버전으로 저장</button>
          <a class="btn btn-ghost btn-sm" href="#rs-versions" data-act="goto-versions">버전 기록 ${r.versions.length}개</a>
        </div>
      </div>
    </div>`;
  }

  /* ---------------- 렌더: 새로 쌓인 재료 ---------------- */
  function inboxItems() {
    const rf = refs();
    const items = [];
    let anyRepo = false;
    S().projects().forEach((p) => {
      const fs = (p.repo && p.repo.findings) || [];
      if (p.repo) anyRepo = true;
      fs.filter((f) => f.status !== 'dismissed' && !rf.findings.has(f.id)).forEach((f) => items.push({ kind: 'github', p, f }));
    });
    S().list().filter((e) => e.status === 'done' && !rf.cards.has(e.id) && !hiddenCards.has(e.id)).forEach((e) => items.push({ kind: 'card', e }));
    return { items, anyRepo };
  }

  function inboxHTML(ui) {
    const { items, anyRepo } = inboxItems();
    const shown = ui.inboxAll ? items : items.slice(0, 3);
    const gh = items.filter((x) => x.kind === 'github').length;
    return `<section class="card rs-inbox ${items.length ? '' : 'is-empty'}">
      <div class="rs-inbox-head">
        <div class="rs-inbox-title"><span class="rs-inbox-dot">${items.length}</span>새로 쌓인 재료
          <span class="subtle">아직 풀에 없는 것들이에요. 담으면 바로 이력서에 포함돼요.</span></div>
      </div>
      ${items.length ? `<div class="rs-inbox-list">${shown.map((it) => it.kind === 'github' ? `
        <div class="rs-mat" data-kind="github">
          <div class="rs-mat-top"><span class="rs-src rs-src-gh"><span class="rs-src-ico">&lt;/&gt;</span>GitHub 코드</span>
            <a class="rs-mat-from" href="#/projects/${encodeURIComponent(it.p.id)}">${esc(projShort(it.p))}</a>
            ${it.f.category ? `<span class="subtle">· ${esc(it.f.category)}</span>` : ''}</div>
          <div class="rs-mat-text">${esc(it.f.bullet || it.f.title)}</div>
          <div class="rs-mat-foot">
            ${(it.f.evidence || [])[0] ? `<span class="rs-ev-path rs-ev-sm">${esc(evLabel(it.f.evidence[0]))}${it.f.evidence.length > 1 ? ` 외 ${it.f.evidence.length - 1}곳` : ''}</span>` : ''}
            ${(it.f.tags || []).slice(0, 4).map((t) => `<span class="rs-tagchip">${esc(t)}</span>`).join('')}
            <span class="rs-mat-btns"><button type="button" class="btn btn-sm btn-ghost" data-act="dismiss-finding" data-p="${esc(it.p.id)}" data-f="${esc(it.f.id)}">숨기기</button>
            <button type="button" class="btn btn-sm btn-primary" data-act="add-finding" data-p="${esc(it.p.id)}" data-f="${esc(it.f.id)}">이력서에 담기</button></span>
          </div>
        </div>` : `
        <div class="rs-mat" data-kind="card">
          <div class="rs-mat-top"><span class="rs-src rs-src-card"><span class="rs-src-ico">▦</span>경험</span>
            <a class="rs-mat-from" href="#/card/${encodeURIComponent(it.e.id)}">${esc(it.e.title)}</a></div>
          <div class="rs-mat-text"><span class="rs-ai-mini">AI</span> ${esc(oneLiner(it.e))}</div>
          <div class="rs-mat-foot">
            ${it.e.keywords.slice(0, 3).map((k) => App.ui.keywordChip(k)).join('')}
            <span class="rs-mat-btns"><button type="button" class="btn btn-sm btn-ghost" data-act="hide-card" data-id="${esc(it.e.id)}">숨기기</button>
            <button type="button" class="btn btn-sm" data-act="add-card" data-id="${esc(it.e.id)}">다듬어서 담기</button></span>
          </div>
        </div>`).join('')}</div>
        ${items.length > 3 ? `<button type="button" class="rs-inbox-more" data-act="inbox-more">${ui.inboxAll ? '접기' : `${items.length - 3}개 더 보기`}</button>` : ''}`
        : '<div class="rs-inbox-empty">새 재료를 모두 확인했어요. 체크인과 답변은 경험 위키의 경험이 되고, 경험을 완성하면 여기에 이력서 재료로 쌓여요.</div>'}
      ${!gh ? `<div class="rs-inbox-cta"><span>${anyRepo ? '연결된 레포에서 새로 찾은 코드가 없어요.' : 'GitHub 레포를 연결하면 코드에서 이력서 한 줄을 찾아 드려요.'}</span><a class="cd-link rs-link" href="#/projects">프로젝트에서 코드 분석하기 →</a></div>` : ''}
    </section>`;
  }

  /* ---------------- 렌더: 편집 (재료 풀) ---------------- */
  function tools(kind, id, extra = '', i, n) {
    return `<div class="rs-tools">
      <button type="button" class="rs-ib" data-act="${kind}-up" ${extra} ${i === 0 ? 'disabled' : ''} title="위로" aria-label="위로">↑</button>
      <button type="button" class="rs-ib" data-act="${kind}-down" ${extra} ${i === n - 1 ? 'disabled' : ''} title="아래로" aria-label="아래로">↓</button>
      ${kind === 'entry' ? `<button type="button" class="rs-ib" data-act="entry-edit" ${extra} title="수정" aria-label="수정">✎</button>` : ''}
      <button type="button" class="rs-ib rs-ib-del" data-act="${kind}-del" ${extra} title="풀에서 삭제" aria-label="삭제">×</button>
    </div>`;
  }

  function profileHTML(ui) {
    const pr = S().resume().profile;
    if (ui.editProfile) {
      return `<section class="card rs-sec" id="rs-sec-profile">
        <div class="rs-sec-head"><h3>기본 정보</h3></div>
        <div class="rs-pf-grid">${PROFILE_FIELDS.map(([k, l, ph]) => `<div class="${k === 'headline' ? 'rs-span2' : ''}"><label class="label">${l}</label><input class="input" data-pf="${k}" value="${esc(pr[k])}" placeholder="${esc(ph)}"></div>`).join('')}
          <div class="rs-span2"><label class="label">자기소개 <span class="subtle">2~3문장이면 충분해요</span></label><textarea class="textarea" data-pf="intro" rows="3">${esc(pr.intro)}</textarea></div>
        </div>
        <div class="rs-form-actions"><button type="button" class="btn btn-sm" data-act="profile-cancel">취소</button><button type="button" class="btn btn-sm btn-primary" data-act="profile-save">저장</button></div>
      </section>`;
    }
    const contact = [pr.email, pr.phone, pr.github, pr.blog].filter(Boolean);
    return `<section class="card rs-sec" id="rs-sec-profile">
      <div class="rs-sec-head"><h3>기본 정보</h3><button type="button" class="btn btn-sm btn-ghost" data-act="profile-edit">✎ 수정</button></div>
      <div class="rs-pf-view">
        <div class="rs-pf-name">${esc(pr.name || '이름 없음')} <span class="rs-pf-headline">${esc(pr.headline || '한 줄 소개를 적어 주세요')}</span></div>
        <div class="subtle">${contact.length ? contact.map(esc).join(' · ') : '연락처가 비어 있어요'}</div>
        ${pr.intro ? `<p class="rs-pf-intro">${esc(pr.intro)}</p>` : ''}
      </div>
    </section>`;
  }

  function skillsHTML(ui) {
    const sk = S().resume().skills;
    const inc = sk.filter((s) => s.included).length;
    return `<section class="card rs-sec" id="rs-sec-skills">
      <div class="rs-sec-head"><h3>기술 스택</h3><span class="rs-sec-count">${sk.length}개 중 ${inc}개 포함</span></div>
      <p class="rs-sec-help">눌러서 넣고 빼요. 코드 분석에서 찾은 기술도 여기에 먼저 쌓여요.</p>
      ${SKILL_GROUPS.map((g) => {
        const list = sk.filter((s) => (s.group || '프레임워크·라이브러리') === g);
        if (!list.length) return '';
        return `<div class="rs-skg"><div class="rs-skg-lb">${g}</div><div class="rs-skg-chips">${list.map((s) => `
          <span class="rs-skill ${s.included ? 'is-on' : ''}" title="${s.source && s.source.type === 'github' ? 'GitHub 코드에서 찾은 기술' : s.source && s.source.type === 'card' ? '경험에서 나온 기술' : ''}">
            <button type="button" class="rs-skill-t" data-act="skill-toggle" data-id="${esc(s.id)}" aria-pressed="${s.included}">${s.included ? '✓' : '＋'} ${esc(s.name)}${s.source && s.source.type === 'github' ? '<span class="rs-skill-gh">GH</span>' : ''}</button>
            <button type="button" class="rs-skill-x" data-act="skill-del" data-id="${esc(s.id)}" aria-label="${esc(s.name)} 삭제">×</button>
          </span>`).join('')}</div></div>`;
      }).join('')}
      <div class="rs-skill-add"><input class="input" data-skill-input placeholder="기술 추가 (예: Kafka) 후 Enter" value="${esc(ui.skillDraft || '')}"><button type="button" class="btn btn-sm" data-act="skill-add">추가</button></div>
    </section>`;
  }

  function entryFormHTML(e) {
    return `<div class="rs-entry-form">
      <div class="rs-pf-grid">
        <div class="rs-span2"><label class="label">제목</label><input class="input" data-ef="title" value="${esc(e.title)}"></div>
        <div><label class="label">소속·구분</label><input class="input" data-ef="org" value="${esc(e.org)}" placeholder="예) 부트캠프 최종 프로젝트"></div>
        <div><label class="label">역할</label><input class="input" data-ef="role" value="${esc(e.role)}" placeholder="예) 백엔드 · 4인 팀"></div>
        <div><label class="label">시작</label><input class="input" type="month" data-ef="start" value="${esc(e.period && e.period.start)}"></div>
        <div><label class="label">종료</label><input class="input" type="month" data-ef="end" value="${esc(e.period && e.period.end)}"><div class="rs-help">비워 두면 ‘현재’로 보여요</div></div>
      </div>
      <div class="rs-form-actions"><button type="button" class="btn btn-sm" data-act="entry-cancel">취소</button><button type="button" class="btn btn-sm btn-primary" data-act="entry-save" data-id="${esc(e.id)}">저장</button></div>
    </div>`;
  }

  function bulletHTML(e, b, i, n, ui) {
    const data = `data-e="${esc(e.id)}" data-b="${esc(b.id)}"`;
    const editing = ui.editBullet === b.id;
    return `<li class="rs-bullet ${b.included ? '' : 'is-off'} ${ui.flash === b.id ? 'rs-flash' : ''}" data-bullet="${esc(b.id)}">
      <label class="rs-check" title="${b.included ? '이력서에서 빼기 (풀에는 남아요)' : '이력서에 넣기'}"><input type="checkbox" data-act="bullet-toggle" ${data} ${b.included ? 'checked' : ''}><span></span></label>
      <div class="rs-bullet-body">
        ${editing ? `<textarea class="textarea rs-bullet-ta" data-bullet-ta ${data} rows="2">${esc(b.text)}</textarea>
          <div class="rs-form-actions rs-inline-actions"><span class="subtle">Enter 저장 · Esc 취소</span><button type="button" class="btn btn-sm" data-act="bullet-cancel">취소</button><button type="button" class="btn btn-sm btn-primary" data-act="bullet-save" ${data}>저장</button></div>`
          : `<div class="rs-bullet-text" data-act="bullet-edit" ${data} title="눌러서 고치기">${esc(b.text)}</div>`}
        <div class="rs-bullet-meta">${srcChip(e, b)}${b.included ? '' : '<span class="rs-pool-tag">풀에 보관</span>'}</div>
      </div>
      ${editing ? '' : tools('bullet', b.id, data, i, n)}
    </li>`;
  }

  function entryHTML(e, i, n, ui) {
    const p = e.projectId ? S().getProject(e.projectId) : null;
    const incB = e.bullets.filter((b) => b.included).length;
    const meta = [e.org, fmtPeriod(e.period), e.role].filter(Boolean);
    return `<div class="rs-entry ${e.included ? '' : 'is-off'}" data-entry="${esc(e.id)}">
      ${ui.editEntry === e.id ? entryFormHTML(e) : `
      <div class="rs-entry-head">
        <label class="rs-switch" title="${e.included ? '이 항목을 이력서에서 빼기' : '이 항목을 이력서에 넣기'}"><input type="checkbox" data-act="entry-toggle" data-id="${esc(e.id)}" ${e.included ? 'checked' : ''}><span></span></label>
        <div class="rs-entry-main">
          <div class="rs-entry-title">${esc(e.title || '제목 없는 항목')}${e.included ? '' : '<span class="rs-pool-tag">풀에 보관</span>'}</div>
          <div class="rs-entry-meta">${meta.map(esc).join(' · ') || '기간·역할을 적어 주세요'}${p ? ` · <a class="rs-proj-link" href="#/projects/${encodeURIComponent(p.id)}">▤ 프로젝트</a>` : ''}</div>
          ${e.bullets.length ? `<div class="rs-entry-count">한 줄 ${e.bullets.length}개 중 ${incB}개 포함</div>` : ''}
        </div>
        ${tools('entry', e.id, `data-id="${esc(e.id)}"`, i, n)}
      </div>`}
      ${e.bullets.length ? `<ul class="rs-bullets">${e.bullets.map((b, j) => bulletHTML(e, b, j, e.bullets.length, ui)).join('')}</ul>` : ''}
      ${ui.addBullet === e.id ? `<div class="rs-add-form">
          <textarea class="textarea rs-bullet-ta" data-new-bullet="${esc(e.id)}" rows="2" placeholder="예) 무엇을 했는지 + 어떤 결과가 났는지 (숫자가 있으면 좋아요)"></textarea>
          <div class="rs-form-actions rs-inline-actions"><button type="button" class="btn btn-sm" data-act="bullet-add-cancel">취소</button><button type="button" class="btn btn-sm btn-primary" data-act="bullet-add-save" data-id="${esc(e.id)}">추가</button></div></div>`
        : `<button type="button" class="rs-add-line" data-act="bullet-add" data-id="${esc(e.id)}">＋ 한 줄 직접 쓰기</button>`}
    </div>`;
  }

  function sectionHTML([key, label, help], ui) {
    const list = ofSection(key);
    const inc = list.filter((e) => e.included).length;
    return `<section class="card rs-sec" id="rs-sec-${key}">
      <div class="rs-sec-head"><h3>${label}</h3>${list.length ? `<span class="rs-sec-count">${list.length}개 중 ${inc}개 포함</span>` : ''}
        <button type="button" class="btn btn-sm btn-ghost rs-sec-add" data-act="entry-add" data-sec="${key}">＋ ${label} 추가</button></div>
      ${help && list.length ? `<p class="rs-sec-help">${help}</p>` : ''}
      ${list.length ? `<div class="rs-entries">${list.map((e, i) => entryHTML(e, i, list.length, ui)).join('')}</div>`
        : `<div class="rs-sec-empty">아직 없어요. ${key === 'project' ? '프로젝트 페이지를 불러오거나 ' : ''}직접 추가해 보세요.</div>`}
    </section>`;
  }

  function versionsHTML() {
    const vs = S().resume().versions;
    const now = nowSnap();
    return `<section class="card rs-sec" id="rs-versions">
      <div class="rs-sec-head"><h3>버전 기록</h3><span class="rs-sec-count">${vs.length}개</span>
        <button type="button" class="btn btn-sm btn-ghost rs-sec-add" data-act="save-version">＋ 지금 상태 저장</button></div>
      <p class="rs-sec-help">마음에 드는 상태를 저장해 두면, 나중에 비교하거나 그때로 되돌릴 수 있어요.</p>
      ${vs.length ? `<ol class="rs-vlist">${vs.map((v, i) => {
        const d = diff(v.snapshot, now);
        return `<li class="rs-v">
          <div class="rs-v-dot ${i === 0 ? 'is-latest' : ''}"></div>
          <div class="rs-v-body">
            <div class="rs-v-top"><b>${esc(v.name)}</b><span class="subtle">${esc(v.savedAt)}</span>${i === 0 ? '<span class="tag">최근</span>' : ''}</div>
            ${v.note ? `<div class="rs-v-note">${esc(v.note)}</div>` : ''}
            <div class="rs-v-diff">${d.length ? `지금과 <b>${d.length}군데</b> 달라요 · <span class="rs-d-add">+${d.filter((x) => x.m === '+').length}</span> <span class="rs-d-mod">~${d.filter((x) => x.m === '~').length}</span> <span class="rs-d-del">−${d.filter((x) => x.m === '−').length}</span>` : '지금 이력서와 같아요'}</div>
            <div class="rs-v-actions">
              <button type="button" class="btn btn-sm" data-act="v-compare" data-id="${esc(v.id)}">비교</button>
              <button type="button" class="btn btn-sm btn-ghost" data-act="v-restore" data-id="${esc(v.id)}">이 버전으로 되돌리기</button>
              <button type="button" class="btn btn-sm btn-ghost rs-v-del" data-act="v-del" data-id="${esc(v.id)}">삭제</button>
            </div>
          </div></li>`;
      }).join('')}</ol>` : '<div class="rs-sec-empty">아직 저장한 버전이 없어요. 지원서를 내기 전에 한 번 저장해 두면 좋아요.</div>'}
    </section>`;
  }

  function editorHTML(ui) {
    return `${profileHTML(ui)}${skillsHTML(ui)}${SECTIONS.map((s) => sectionHTML(s, ui)).join('')}${versionsHTML()}`;
  }

  /* ---------------- 렌더: 미리보기 ---------------- */
  function previewHTML() {
    const r = S().resume(); const pr = r.profile;
    const skills = r.skills.filter((s) => s.included);
    const contact = [pr.email, pr.phone, pr.github, pr.blog].filter(Boolean);
    const secs = SECTIONS.map(([key, label]) => {
      const list = ofSection(key).filter((e) => e.included);
      if (!list.length) return '';
      return `<section class="rs-p-sec"><h3>${label}</h3>${list.map((e) => {
        const bs = e.bullets.filter((b) => b.included);
        return `<div class="rs-p-entry">
          <div class="rs-p-row"><b>${esc(e.title)}</b><span class="rs-p-date">${esc(fmtPeriod(e.period))}</span></div>
          ${e.org || e.role ? `<div class="rs-p-sub">${[e.org, e.role].filter(Boolean).map(esc).join(' | ')}</div>` : ''}
          ${bs.length ? `<ul>${bs.map((b) => `<li>${esc(b.text)}</li>`).join('')}</ul>` : ''}
        </div>`;
      }).join('')}</section>`;
    }).join('');
    const body = `
      <header class="rs-p-head">
        <h2>${esc(pr.name || '이름')}</h2>
        ${pr.headline ? `<div class="rs-p-headline">${esc(pr.headline)}</div>` : ''}
        ${contact.length ? `<div class="rs-p-contact">${contact.map(esc).join('<span>·</span>')}</div>` : ''}
      </header>
      ${pr.intro ? `<p class="rs-p-intro">${esc(pr.intro)}</p>` : ''}
      ${skills.length ? `<section class="rs-p-sec"><h3>기술 스택</h3><dl class="rs-p-skills">${SKILL_GROUPS.map((g) => {
        const l = skills.filter((s) => (s.group || '프레임워크·라이브러리') === g);
        return l.length ? `<dt>${g}</dt><dd>${l.map((s) => esc(s.name)).join(', ')}</dd>` : '';
      }).join('')}</dl></section>` : ''}
      ${secs}`;
    const empty = !skills.length && !secs;
    return `<div class="rs-prev-bar">
        <div><b>현재 이력서</b> <span class="subtle">포함한 것만 보여요</span></div>
        <div class="row"><button type="button" class="btn btn-sm btn-ghost" data-act="copy">텍스트 복사</button><button type="button" class="btn btn-sm" data-act="print">인쇄·PDF</button></div>
      </div>
      <div class="rs-paper">${body}${empty ? '<div class="rs-p-empty">아직 포함한 항목이 없어요. 왼쪽에서 체크해 보세요.</div>' : ''}</div>`;
  }

  function plainText() {
    const r = S().resume(); const pr = r.profile; const L = [];
    L.push(pr.name); if (pr.headline) L.push(pr.headline);
    L.push([pr.email, pr.phone, pr.github, pr.blog].filter(Boolean).join(' | '));
    if (pr.intro) L.push('', pr.intro);
    const sk = r.skills.filter((s) => s.included);
    if (sk.length) { L.push('', '[기술 스택]'); SKILL_GROUPS.forEach((g) => { const l = sk.filter((s) => s.group === g); if (l.length) L.push(`${g}: ${l.map((s) => s.name).join(', ')}`); }); }
    SECTIONS.forEach(([k, label]) => {
      const list = ofSection(k).filter((e) => e.included); if (!list.length) return;
      L.push('', `[${label}]`);
      list.forEach((e) => {
        L.push(`${e.title}${fmtPeriod(e.period) ? ` (${fmtPeriod(e.period)})` : ''}`);
        if (e.org || e.role) L.push([e.org, e.role].filter(Boolean).join(' | '));
        e.bullets.filter((b) => b.included).forEach((b) => L.push(`- ${b.text}`));
      });
    });
    return L.join('\n');
  }

  /* ---------------- 화면 ---------------- */
  function pageHTML(ui) {
    return `${headHTML()}
      ${inboxHTML(ui)}
      <div class="rs-tabs" role="tablist">
        <button type="button" role="tab" class="${ui.view === 'edit' ? 'is-on' : ''}" data-act="view" data-v="edit">재료 풀 편집</button>
        <button type="button" role="tab" class="${ui.view === 'preview' ? 'is-on' : ''}" data-act="view" data-v="preview">이력서 미리보기</button>
      </div>
      <div class="rs-layout" data-view="${ui.view}">
        <div class="rs-editor" data-rs-editor>${editorHTML(ui)}</div>
        <aside class="rs-preview" data-rs-preview>${previewHTML()}</aside>
      </div>`;
  }

  const freshUI = () => ({ view: 'edit', inboxAll: false, editProfile: false, editEntry: null, editBullet: null, addBullet: null, flash: null, skillDraft: '' });

  App.screens.resume = {
    title: '마스터 이력서',
    render() { return `<div class="page rs-page" data-rs-root>${pageHTML(freshUI())}</div>`; },
    mount(screenEl) {
      const root = screenEl.querySelector('[data-rs-root]');
      const ui = freshUI();
      let flashTimer = null;

      function draw(opts = {}) {
        const y = window.scrollY;
        root.innerHTML = pageHTML(ui);
        window.scrollTo(0, y);
        if (opts.focus) { const el = root.querySelector(opts.focus); if (el) { el.focus(); if (el.setSelectionRange && el.value) el.setSelectionRange(el.value.length, el.value.length); } }
        if (ui.flash) { clearTimeout(flashTimer); flashTimer = setTimeout(() => { ui.flash = null; }, 1500); }
      }
      const drawPreview = () => { const el = root.querySelector('[data-rs-preview]'); if (el) el.innerHTML = previewHTML(); };

      function moveEntry(id, dir) {
        const e = S().resumeEntry(id); if (!e) return;
        const all = sorted(); const same = all.filter((x) => x.section === e.section);
        const i = same.findIndex((x) => x.id === id); const j = i + dir;
        if (j < 0 || j >= same.length) return;
        const ai = all.indexOf(same[i]), aj = all.indexOf(same[j]);
        [all[ai], all[aj]] = [all[aj], all[ai]];
        S().reorderResumeEntries(all.map((x) => x.id));
      }
      function moveBullet(eid, bid, dir) {
        const e = S().resumeEntry(eid); if (!e) return;
        const ids = e.bullets.map((b) => b.id); const i = ids.indexOf(bid); const j = i + dir;
        if (j < 0 || j >= ids.length) return;
        [ids[i], ids[j]] = [ids[j], ids[i]];
        S().reorderResumeBullets(eid, ids);
      }

      function saveVersionModal() {
        const r = S().resume();
        const last = r.versions[0];
        const d = last ? diff(last.snapshot, nowSnap()) : null;
        App.ui.modal({
          title: '현재 상태를 버전으로 저장',
          body: `<div class="rs-form">
            <p class="rs-form-lead">${d ? (d.length ? `마지막 버전 「${esc(last.name)}」 이후 <b>${d.length}군데</b>가 바뀌었어요.` : `마지막 버전 「${esc(last.name)}」과 내용이 같아요. 그래도 저장할 수 있어요.`) : '첫 버전이에요. 지금 이력서를 그대로 보관해 둘게요.'}</p>
            <label class="label" for="rv-name">버전 이름</label>
            <input class="input" id="rv-name" data-rv-name value="v${r.versions.length + 1} " placeholder="예) v3 토스 지원 전">
            <label class="label" for="rv-note" style="margin-top:12px">메모 <span class="subtle">선택</span></label>
            <textarea class="textarea" id="rv-note" data-rv-note rows="2" placeholder="예) 레포 분석 결과로 모여봄 한 줄을 바꿨어요"></textarea>
          </div>`,
          confirmText: '저장',
          onConfirm(m) {
            const name = m.querySelector('[data-rv-name]').value.trim();
            if (!name) { App.ui.toast('버전 이름을 적어 주세요'); return false; }
            S().saveResumeVersion(name, m.querySelector('[data-rv-note]').value.trim());
            App.ui.toast(`「${name}」 버전으로 저장했어요`); draw();
          },
        });
        setTimeout(() => { const el = document.querySelector('[data-rv-name]'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 30);
      }

      function restoreModal(v) {
        const d = diff(v.snapshot, nowSnap());
        App.ui.modal({
          title: `「${v.name}」 버전으로 되돌릴까요?`,
          body: `<div class="rs-form">
            <p class="rs-form-lead">이력서와 재료 풀이 ${esc(v.savedAt)}에 저장한 상태로 바뀌어요.${d.length ? ` 지금과 <b>${d.length}군데</b> 달라요.` : ''} 그 뒤에 담은 재료는 풀에서도 빠져요.</p>
            <label class="rs-checkline"><input type="checkbox" data-rv-backup checked> 되돌리기 전에 지금 상태를 버전으로 저장해 두기</label>
          </div>`,
          confirmText: '되돌리기', danger: true,
          onConfirm(m) {
            if (m.querySelector('[data-rv-backup]').checked) S().saveResumeVersion('되돌리기 전 자동 저장', `「${v.name}」 버전으로 되돌리기 전 상태`);
            S().restoreResumeVersion(v.id);
            Object.assign(ui, { editEntry: null, editBullet: null, addBullet: null, editProfile: false });
            App.ui.toast(`「${v.name}」 상태로 되돌렸어요`); draw();
          },
        });
      }

      function compareModal(v) {
        const d = diff(v.snapshot, nowSnap());
        App.ui.modal({
          title: `「${v.name}」 → 지금`,
          body: `<div class="rs-form">
            <p class="rs-form-lead">${esc(v.savedAt)}에 저장한 이력서와 지금 이력서에 <b>보이는 내용</b>을 비교했어요.</p>
            <div class="rs-diff-legend"><span class="rs-d-add">+ 새로 들어감</span><span class="rs-d-mod">~ 고침</span><span class="rs-d-del">− 빠짐</span></div>
            ${diffHTML(d)}
          </div>`,
          cancelText: '닫기', confirmText: '이 버전으로 되돌리기', danger: true,
          onConfirm() { setTimeout(() => restoreModal(v), 0); },
        });
      }

      function addEntryModal(sec) {
        const used = new Set(S().resume().entries.map((e) => e.projectId).filter(Boolean));
        const fresh = sec === 'project' ? S().projects().filter((p) => !used.has(p.id)) : [];
        App.ui.modal({
          title: `${SECTION_LABEL[sec]} 추가`,
          body: `<div class="rs-form">
            ${fresh.length ? `<label class="label">프로젝트에서 불러오기</label>
              <select class="select" data-ae-proj><option value="">직접 입력</option>${fresh.map((p) => `<option value="${esc(p.id)}">${esc(p.title)}</option>`).join('')}</select>
              <div class="rs-help">불러오면 기간·역할이 채워지고, 코드 분석 결과도 이 항목에 담겨요.</div>` : ''}
            <div class="rs-pf-grid" style="margin-top:12px">
              <div class="rs-span2"><label class="label">제목</label><input class="input" data-ae="title" placeholder="${sec === 'education' ? '예) ○○대학교 컴퓨터공학과' : sec === 'award' ? '예) SQLD, 교내 해커톤 장려상' : '예) 알고리즘 스터디'}"></div>
              <div><label class="label">${sec === 'education' ? '학위·상태' : sec === 'award' ? '주최·발급' : '소속·구분'}</label><input class="input" data-ae="org"></div>
              <div><label class="label">${sec === 'education' ? '학점' : '역할'}</label><input class="input" data-ae="role"></div>
              <div><label class="label">시작</label><input class="input" type="month" data-ae="start"></div>
              <div><label class="label">종료</label><input class="input" type="month" data-ae="end"></div>
            </div></div>`,
          confirmText: '추가',
          onConfirm(m) {
            const v = (k) => m.querySelector(`[data-ae="${k}"]`).value.trim();
            const pid = m.querySelector('[data-ae-proj]') ? m.querySelector('[data-ae-proj]').value : '';
            const p = pid && S().getProject(pid);
            const title = v('title') || (p ? p.title.split(' — ').pop().replace(/[「」]/g, '') : '');
            if (!title) { App.ui.toast('제목을 적어 주세요'); return false; }
            const e = S().addResumeEntry({
              section: sec, title, org: v('org') || (p ? p.title.split(' — ')[0].replace(/\s*「[^」]+」/, '') : ''),
              role: v('role') || (p ? p.role : ''), projectId: p ? p.id : null,
              period: { start: v('start') || (p ? p.period.start : ''), end: v('end') || (p ? p.period.end : '') },
            });
            ui.addBullet = e.id; App.ui.toast('항목을 추가했어요. 한 줄을 적어 보세요');
            draw({ focus: `[data-new-bullet="${e.id}"]` });
          },
        });
        const sel = document.querySelector('[data-ae-proj]');
        if (sel) sel.onchange = () => {
          const p = S().getProject(sel.value); const set = (k, val) => { const el = document.querySelector(`[data-ae="${k}"]`); if (el) el.value = val || ''; };
          if (!p) return;
          set('title', p.title.split(' — ').pop().replace(/[「」]/g, '')); set('org', p.title.split(' — ')[0].replace(/\s*「[^」]+」/, '')); set('role', p.role); set('start', p.period.start); set('end', p.period.end);
        };
      }

      function confirmDel(title, body, fn) { App.ui.modal({ title, body: `<p>${body}</p>`, confirmText: '삭제', danger: true, onConfirm: fn }); }

      function addSkill() {
        const inp = root.querySelector('[data-skill-input]'); const name = (inp ? inp.value : '').trim();
        if (!name) return;
        if (S().resume().skills.some((s) => s.name.toLowerCase() === name.toLowerCase())) { App.ui.toast(`${name}은(는) 이미 풀에 있어요`); return; }
        S().addSkill({ name, group: S().skillGroup(name), included: true });
        ui.skillDraft = ''; draw({ focus: '[data-skill-input]' });
      }
      function saveBullet(eid, bid) {
        const ta = root.querySelector(`[data-bullet-ta][data-b="${bid}"]`); const text = ta ? ta.value.trim() : '';
        if (!text) { App.ui.toast('내용이 비어 있어요. 지우려면 × 를 눌러 주세요'); return; }
        S().updateResumeBullet(eid, bid, { text }); ui.editBullet = null; draw();
      }
      function addBullet(eid) {
        const ta = root.querySelector(`[data-new-bullet="${eid}"]`); const text = ta ? ta.value.trim() : '';
        if (!text) { App.ui.toast('한 줄을 적어 주세요'); return; }
        const e = S().addResumeBullets(null, [{ text, source: { type: 'manual' } }], { entryId: eid });
        ui.addBullet = null; ui.flash = e && e.bullets[e.bullets.length - 1].id; draw();
      }

      function onClick(ev) {
        const a = ev.target.closest('[data-act]'); if (!a || !root.contains(a)) return;
        const act = a.getAttribute('data-act');
        const id = a.getAttribute('data-id'), eid = a.getAttribute('data-e'), bid = a.getAttribute('data-b');
        if (a.matches('input[type=checkbox]')) return; // change 이벤트에서 처리
        switch (act) {
          case 'view': { ui.view = a.getAttribute('data-v'); draw(); const y = root.querySelector('.rs-layout').getBoundingClientRect().top + window.scrollY - 120; if (window.scrollY > y) window.scrollTo(0, y); break; }
          case 'goto-versions': ev.preventDefault(); ui.view = 'edit'; draw(); root.querySelector('#rs-versions').scrollIntoView({ behavior: 'smooth', block: 'start' }); break;
          case 'save-version': saveVersionModal(); break;
          case 'inbox-more': ui.inboxAll = !ui.inboxAll; draw(); break;
          case 'add-finding': {
            const p = S().getProject(a.getAttribute('data-p')); const f = p && p.repo && p.repo.findings.find((x) => x.id === a.getAttribute('data-f')); if (!f) return;
            const e = S().addResumeBullets(p.id, [{ text: f.bullet || f.title, tags: f.tags || [], source: { type: 'github', projectId: p.id, findingId: f.id, evidence: (f.evidence || []).map(({ path, start, end, url }) => ({ path, start, end, url })) } }]);
            const nb = e && e.bullets.find((b) => b.source && b.source.findingId === f.id);
            ui.flash = nb && nb.id; App.ui.toast(`「${e.title}」 항목에 담았어요${(f.tags || []).length ? ' · 기술은 스택 풀에 쌓였어요' : ''}`); draw();
            break;
          }
          case 'dismiss-finding': S().updateFinding(a.getAttribute('data-p'), a.getAttribute('data-f'), { status: 'dismissed' }); App.ui.toast('숨겼어요. 프로젝트 화면에서 다시 볼 수 있어요'); draw(); break;
          case 'add-card': { const e = S().get(id); if (e) openCardModal(e, (entry) => { ui.flash = entry && entry.bullets[entry.bullets.length - 1].id; draw(); }); break; }
          case 'hide-card': hiddenCards.add(id); draw(); break;
          case 'profile-edit': ui.editProfile = true; draw({ focus: '[data-pf="headline"]' }); break;
          case 'profile-cancel': ui.editProfile = false; draw(); break;
          case 'profile-save': {
            const patch = {}; root.querySelectorAll('[data-pf]').forEach((el) => { patch[el.getAttribute('data-pf')] = el.value.trim(); });
            S().updateResumeProfile(patch); ui.editProfile = false; App.ui.toast('기본 정보를 저장했어요'); draw(); break;
          }
          case 'skill-toggle': { const s = S().resume().skills.find((x) => x.id === id); if (s) { S().updateSkill(id, { included: !s.included }); draw(); } break; }
          case 'skill-del': { const s = S().resume().skills.find((x) => x.id === id); if (s) { S().removeSkill(id); App.ui.toast(`${s.name}을(를) 풀에서 지웠어요`); draw(); } break; }
          case 'skill-add': addSkill(); break;
          case 'entry-up': moveEntry(id, -1); draw(); break;
          case 'entry-down': moveEntry(id, 1); draw(); break;
          case 'entry-edit': ui.editEntry = id; draw({ focus: `[data-entry="${id}"] [data-ef="title"]` }); break;
          case 'entry-cancel': ui.editEntry = null; draw(); break;
          case 'entry-save': {
            const box = root.querySelector(`[data-entry="${id}"]`); const v = (k) => box.querySelector(`[data-ef="${k}"]`).value.trim();
            if (!v('title')) { App.ui.toast('제목을 적어 주세요'); return; }
            if (v('start') && v('end') && v('end') < v('start')) { App.ui.toast('종료가 시작보다 빨라요'); return; }
            S().updateResumeEntry(id, { title: v('title'), org: v('org'), role: v('role'), period: { start: v('start'), end: v('end') } });
            ui.editEntry = null; draw(); break;
          }
          case 'entry-del': {
            const e = S().resumeEntry(id); if (!e) return;
            confirmDel('이 항목을 풀에서 삭제할까요?', `<b>${esc(e.title)}</b>와 한 줄 ${e.bullets.length}개가 함께 지워져요. 이력서에서만 빼고 싶다면 왼쪽 스위치를 끄면 돼요. 풀에 보관돼요.`,
              () => { S().removeResumeEntry(id); App.ui.toast('항목을 삭제했어요'); draw(); });
            break;
          }
          case 'entry-add': addEntryModal(a.getAttribute('data-sec')); break;
          case 'bullet-edit': ui.editBullet = bid; ui.addBullet = null; draw({ focus: `[data-bullet-ta][data-b="${bid}"]` }); break;
          case 'bullet-cancel': ui.editBullet = null; draw(); break;
          case 'bullet-save': saveBullet(eid, bid); break;
          case 'bullet-up': moveBullet(eid, bid, -1); draw(); break;
          case 'bullet-down': moveBullet(eid, bid, 1); draw(); break;
          case 'bullet-del': {
            const e = S().resumeEntry(eid); const b = e && e.bullets.find((x) => x.id === bid); if (!b) return;
            confirmDel('이 한 줄을 풀에서 삭제할까요?', `“${esc(b.text)}”<br><br>이력서에서만 빼고 싶다면 체크를 해제하면 돼요. 풀에 남아 있어서 나중에 다시 넣을 수 있어요.${b.source && b.source.type === 'github' ? ' 삭제하면 이 코드 분석 결과는 ‘새로 쌓인 재료’로 돌아가요.' : ''}`,
              () => { S().removeResumeBullet(eid, bid); draw(); });
            break;
          }
          case 'bullet-add': ui.addBullet = id; ui.editBullet = null; draw({ focus: `[data-new-bullet="${id}"]` }); break;
          case 'bullet-add-cancel': ui.addBullet = null; draw(); break;
          case 'bullet-add-save': addBullet(id); break;
          case 'src': { const e = S().resumeEntry(eid); const b = e && e.bullets.find((x) => x.id === bid); if (b) openSource(e, b); break; }
          case 'v-compare': { const v = S().resume().versions.find((x) => x.id === id); if (v) compareModal(v); break; }
          case 'v-restore': { const v = S().resume().versions.find((x) => x.id === id); if (v) restoreModal(v); break; }
          case 'v-del': {
            const v = S().resume().versions.find((x) => x.id === id); if (!v) return;
            confirmDel('이 버전을 삭제할까요?', `<b>${esc(v.name)}</b> (${esc(v.savedAt)}) 기록이 사라져요. 지금 이력서는 그대로예요.`, () => { S().removeResumeVersion(id); draw(); });
            break;
          }
          case 'copy': {
            const done = () => App.ui.toast('이력서 텍스트를 복사했어요');
            if (navigator.clipboard) navigator.clipboard.writeText(plainText()).then(done, done); else done();
            break;
          }
          case 'print': window.print(); break;
          default: break;
        }
      }

      function onChange(ev) {
        const t = ev.target;
        if (t.matches('[data-act="entry-toggle"]')) {
          const id = t.getAttribute('data-id'); S().updateResumeEntry(id, { included: t.checked });
          if (t.checked) { const e = S().resumeEntry(id); if (e && e.bullets.length && !e.bullets.some((b) => b.included)) App.ui.toast('이 항목의 한 줄이 모두 빠져 있어요. 넣을 줄을 체크해 주세요'); }
          draw();
        } else if (t.matches('[data-act="bullet-toggle"]')) {
          const eid = t.getAttribute('data-e'); S().updateResumeBullet(eid, t.getAttribute('data-b'), { included: t.checked });
          const e = S().resumeEntry(eid);
          if (t.checked && e && !e.included) { S().updateResumeEntry(eid, { included: true }); App.ui.toast(`「${e.title}」 항목도 함께 이력서에 넣었어요`); }
          draw();
        }
      }

      function onKey(ev) {
        const t = ev.target;
        if (ev.isComposing) return;
        if (t.matches('[data-skill-input]') && ev.key === 'Enter') { ev.preventDefault(); addSkill(); }
        else if (t.matches('[data-bullet-ta]')) {
          if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); saveBullet(t.getAttribute('data-e'), t.getAttribute('data-b')); }
          else if (ev.key === 'Escape') { ui.editBullet = null; draw(); }
        } else if (t.matches('[data-new-bullet]')) {
          if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); addBullet(t.getAttribute('data-new-bullet')); }
          else if (ev.key === 'Escape') { ui.addBullet = null; draw(); }
        } else if (t.matches('[data-pf]') && ev.key === 'Enter' && t.tagName === 'INPUT') {
          ev.preventDefault(); root.querySelector('[data-act="profile-save"]').click();
        }
      }
      function onInput(ev) {
        if (ev.target.matches('[data-skill-input]')) ui.skillDraft = ev.target.value;
        // 기본 정보는 입력하는 동안 미리보기에 바로 반영 (저장은 '저장'에서)
        if (ev.target.matches('[data-pf]')) {
          const pr = S().resume().profile; const prev = Object.assign({}, pr);
          root.querySelectorAll('[data-pf]').forEach((el) => { pr[el.getAttribute('data-pf')] = el.value; });
          drawPreview(); Object.assign(pr, prev);
        }
      }

      root.addEventListener('click', onClick);
      root.addEventListener('change', onChange);
      root.addEventListener('keydown', onKey);
      root.addEventListener('input', onInput);
      return () => {
        clearTimeout(flashTimer);
        root.removeEventListener('click', onClick); root.removeEventListener('change', onChange);
        root.removeEventListener('keydown', onKey); root.removeEventListener('input', onInput);
      };
    },
  };
})(window.App);
