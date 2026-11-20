/* 지원 기업 상세 — 면접 준비 탭. 기업마다 집중할 포인트와 예상 질문 리스트를 따로 관리한다. */
(function (App) {
  const esc = (s) => App.ui.esc(s);

  const SOURCES = [
    ['common', '공통 질문', '어느 기업이든 거의 꼭 나와요'],
    ['competency', '요구 역량 질문', '공고에서 찾은 역량을 확인하는 질문이에요'],
    ['essay', '자소서 꼬리질문', '자소서에 쓴 경험을 더 깊게 파고들어요'],
    ['user', '직접 추가한 질문', '스터디·후기에서 들은 질문을 모아 두세요'],
  ];
  const SRC_SHORT = { common: '공통', competency: '요구 역량', essay: '자소서 꼬리질문', user: '직접 추가' };

  // 탭이 다시 그려져도(ctx.refresh) 펼침·연습 위치 등은 유지되도록 기업별로 보관
  const UI_CACHE = {};
  function uiOf(appId) {
    if (!UI_CACHE[appId]) UI_CACHE[appId] = { open: {}, editing: null, adding: false, sugg: null, loading: false, practice: null };
    return UI_CACHE[appId];
  }

  const shortTitle = (e) => String(e.title || '').split(' — ')[0];
  const focusNames = (app) => (app.competencies || []).map((c) => c.name);
  const chips = (kws) => (kws || []).map((k) => App.ui.keywordChip(k)).join('');
  const orderedItems = (app) => {
    const iv = app.interview || [];
    const known = SOURCES.map((s) => s[0]);
    return SOURCES.flatMap(([src]) => iv.filter((q) => (src === 'user' ? !known.slice(0, 3).includes(q.source) : q.source === src)));
  };
  const groupOf = (q) => (['common', 'competency', 'essay'].includes(q.source) ? q.source : 'user');

  /* ---------- 이 기업 면접에서 집중할 것 ---------- */
  function focusPanel(app) {
    const comps = (app.competencies || []).slice().sort((a, b) => b.weight - a.weight);
    const rd = App.ai.readiness(app);
    const rows = [];

    if (comps.length) {
      const top = comps[0];
      const others = comps.slice(1, 3);
      rows.push(`<li class="ai2-fp-row">
        <span class="ai2-fp-ico" aria-hidden="true">🎯</span>
        <div class="ai2-fp-body">
          <div class="ai2-fp-main">${esc(app.company)}는 ${App.ui.keywordChip(top.name)} 을 가장 중요하게 봐요</div>
          ${top.reason ? `<div class="ai2-fp-sub">공고: “${esc(top.reason)}”</div>` : ''}
          ${others.length ? `<div class="ai2-fp-sub">${others.map((c) => App.ui.keywordChip(c.name)).join(' ')} 도 함께 물어볼 가능성이 높아요</div>` : ''}
        </div>
      </li>`);
    }

    const essayExps = [];
    (app.essays || []).forEach((q) => {
      if (!q.expId || essayExps.some((x) => x.exp.id === q.expId)) return;
      const e = App.store.get(q.expId); if (e) essayExps.push({ exp: e, q });
    });
    if (essayExps.length) {
      rows.push(`<li class="ai2-fp-row">
        <span class="ai2-fp-ico" aria-hidden="true">📝</span>
        <div class="ai2-fp-body">
          <div class="ai2-fp-main">자소서에 쓴 내용은 꼭 꼬리질문이 나와요</div>
          <div class="ai2-fp-links">${essayExps.map(({ exp }) => `<a class="ai2-fp-exp" href="#/card/${esc(exp.id)}">${esc(shortTitle(exp))}</a>`).join('')}</div>
          <div class="ai2-fp-sub">왜 그 방법을 택했는지, 결과를 숫자로 말할 수 있는지 다시 확인해 두세요.</div>
        </div>
      </li>`);
    }

    rd.competencies.filter((c) => !c.ready).slice(0, 3).forEach((c) => {
      const none = !c.exp;
      rows.push(`<li class="ai2-fp-row is-weak">
        <span class="ai2-fp-ico" aria-hidden="true">⚠️</span>
        <div class="ai2-fp-body">
          <div class="ai2-fp-main">${App.ui.keywordChip(c.name)} 질문이 나오면 쓸 경험이 ${none ? '아직 없어요' : '약해요'}</div>
          <div class="ai2-fp-sub">${none ? '떠오르는 경험이 있는지 같이 찾아봐요.' : `「${esc(shortTitle(c.exp))}」 완성도 ${c.exp.completeness}% — 결과와 숫자를 채우면 단단해져요.`}</div>
        </div>
        <a class="btn btn-sm ai2-fp-cta" href="${none ? `#/discover?kw=${encodeURIComponent(c.name)}` : `#/card/${esc(c.exp.id)}`}">${none ? '경험 찾기' : '보강하기'}</a>
      </li>`);
    });

    if (app.memo && app.memo.trim()) {
      rows.push(`<li class="ai2-fp-row is-memo">
        <span class="ai2-fp-ico" aria-hidden="true">📌</span>
        <div class="ai2-fp-body"><div class="ai2-fp-sub ai2-fp-label">내 메모</div><div class="ai2-fp-main ai2-fp-memo">${esc(app.memo)}</div></div>
      </li>`);
    }

    if (!rows.length) {
      rows.push(`<li class="ai2-fp-row"><span class="ai2-fp-ico" aria-hidden="true">💡</span><div class="ai2-fp-body"><div class="ai2-fp-sub">채용공고를 넣으면 이 기업이 중요하게 보는 역량을 정리해 드려요.</div></div></li>`);
    }

    return `<section class="card ai2-focus">
      <div class="ai2-focus-head">
        <div class="ai2-eyebrow">${esc(app.company)} · ${esc(app.job || '')}</div>
        <h2 class="ai2-h2">이 기업 면접에서 집중할 것</h2>
      </div>
      <ul class="ai2-fp-list">${rows.join('')}</ul>
    </section>`;
  }

  /* ---------- 툴바 / 진행도 ---------- */
  function toolbar(app, ui) {
    const iv = app.interview || [];
    const done = iv.filter((q) => q.checked).length;
    const pct = iv.length ? Math.round(done / iv.length * 100) : 0;
    return `<div class="ai2-bar">
      <div class="ai2-bar-prog">
        <div class="ai2-bar-label">준비 완료 <b>${done}</b>/${iv.length}</div>
        ${App.ui.progress(pct)}
      </div>
      <div class="ai2-bar-actions">
        <button class="btn btn-sm" type="button" data-ai2="practice" ${iv.length ? '' : 'disabled'}>🎤 연습 모드</button>
        <button class="btn btn-sm btn-primary" type="button" data-ai2="suggest" ${ui.loading ? 'disabled' : ''}>${ui.loading ? '질문 만드는 중…' : '✦ AI 예상 질문 더 받기'}</button>
      </div>
    </div>`;
  }

  /* ---------- AI 추천 질문 ---------- */
  function suggestPanel(ui) {
    if (ui.loading) {
      return `<div class="ai2-sugg is-loading"><div class="ai-badge"><span class="ai-dot">R</span>기업 정보와 자소서를 보고 예상 질문을 고르는 중이에요</div>
        <div class="ai2-skel"></div><div class="ai2-skel"></div><div class="ai2-skel short"></div></div>`;
    }
    if (!ui.sugg) return '';
    if (!ui.sugg.length) {
      return `<div class="ai2-sugg"><div class="ai2-sugg-head"><div class="ai-badge"><span class="ai-dot">R</span>지금은 새로 추천할 질문이 없어요</div>
        <button class="btn btn-ghost btn-sm" type="button" data-ai2="sugg-close">닫기</button></div>
        <p class="subtle">자소서 문항에 경험을 연결하면 꼬리질문을 더 만들어 드려요. 들은 질문이 있다면 직접 추가해 보세요.</p></div>`;
    }
    return `<div class="ai2-sugg">
      <div class="ai2-sugg-head">
        <div class="ai-badge"><span class="ai-dot">R</span>예상 질문 ${ui.sugg.length}개를 찾았어요</div>
        <div class="row">
          <button class="btn btn-sm btn-primary" type="button" data-ai2="sugg-all">모두 추가</button>
          <button class="btn btn-ghost btn-sm" type="button" data-ai2="sugg-close">닫기</button>
        </div>
      </div>
      <ul class="ai2-sugg-list">${ui.sugg.map((s, i) => `<li class="ai2-sugg-item">
        <div class="ai2-sugg-text">
          <span class="ai2-src" data-src="${esc(s.source)}">${esc(SRC_SHORT[s.source] || '추천')}</span>
          <span>${esc(s.text)}</span>
          ${(s.keywords || []).length ? `<span class="ai2-chips">${chips(s.keywords)}</span>` : ''}
        </div>
        <button class="btn btn-sm" type="button" data-ai2="sugg-add" data-i="${i}">＋ 추가</button>
      </li>`).join('')}</ul>
    </div>`;
  }

  /* ---------- 질문 아이템 ---------- */
  function briefBlock(exp) {
    const b = App.ai.starBrief(exp);
    const line = (label, t) => `<div class="ai2-brief-row"><span class="ai2-brief-k">${label}</span><span class="ai2-brief-v ${t ? '' : 'is-empty'}">${t ? esc(t) : '아직 비어 있어요'}</span></div>`;
    const hasGap = !b.situation || !b.action || !b.result;
    return `<div class="ai2-brief">
      <div class="ai2-sub-label">답변 뼈대 <span class="subtle">— 「${esc(shortTitle(exp))}」에서 가져왔어요</span></div>
      ${line('상황', b.situation)}${line('행동', b.action)}${line('결과', b.result)}
      ${hasGap ? `<a class="ai2-brief-fix" href="#/card/${esc(exp.id)}">빈 칸 채우러 가기 →</a>` : ''}
    </div>`;
  }

  function itemBody(app, q, ui) {
    const exps = App.store.list();
    const exp = q.expId ? App.store.get(q.expId) : null;
    let rec = null;
    if (!exp && (q.keywords || []).length) {
      const r = App.ai.analyzeQuestion(q.text, { focus: focusNames(app) }).recommendations[0];
      if (r) rec = r;
    }
    const editing = ui.editing === q.id;
    return `<div class="ai2-item-body">
      ${editing ? `<div class="ai2-edit">
        <input class="input ai2-edit-input" data-ai2-edit="${esc(q.id)}" value="${esc(q.text)}" maxlength="200" />
        <div class="row"><button class="btn btn-sm btn-primary" type="button" data-ai2="edit-save" data-id="${esc(q.id)}">저장</button>
        <button class="btn btn-sm btn-ghost" type="button" data-ai2="edit-cancel">취소</button></div>
      </div>` : ''}
      <div class="ai2-field">
        <label class="ai2-sub-label" for="ai2-exp-${esc(q.id)}">연결할 경험</label>
        <select class="select ai2-select" id="ai2-exp-${esc(q.id)}" data-ai2-exp="${esc(q.id)}">
          <option value="">— 아직 고르지 않았어요 —</option>
          ${exps.map((e) => `<option value="${esc(e.id)}" ${e.id === q.expId ? 'selected' : ''}>${esc(e.title)}</option>`).join('')}
        </select>
        ${rec ? `<div class="ai2-rec">
          <span class="ai-dot">R</span>
          <span class="ai2-rec-text">「${esc(shortTitle(rec.exp))}」가 잘 맞아요 <span class="subtle">적합도 ${rec.score}%</span></span>
          <button class="btn btn-sm" type="button" data-ai2="link-rec" data-id="${esc(q.id)}" data-exp="${esc(rec.exp.id)}">연결하기</button>
        </div>` : ''}
      </div>
      <div class="ai2-field">
        <label class="ai2-sub-label" for="ai2-note-${esc(q.id)}">답변 포인트 <span class="ai2-saved" data-ai2-saved="${esc(q.id)}"></span></label>
        <textarea class="textarea ai2-note" id="ai2-note-${esc(q.id)}" data-ai2-note="${esc(q.id)}" rows="3" placeholder="꼭 말할 숫자, 키워드, 마무리 한 마디를 적어 두세요">${esc(q.note || '')}</textarea>
      </div>
      ${exp ? briefBlock(exp) : ''}
      <div class="ai2-item-foot">
        ${editing ? '' : `<button class="btn btn-ghost btn-sm" type="button" data-ai2="edit" data-id="${esc(q.id)}">질문 수정</button>`}
        <button class="btn btn-ghost btn-sm ai2-del" type="button" data-ai2="delete" data-id="${esc(q.id)}">삭제</button>
      </div>
    </div>`;
  }

  function item(app, q, ui) {
    const open = !!ui.open[q.id];
    const exp = q.expId ? App.store.get(q.expId) : null;
    return `<li class="ai2-item ${q.checked ? 'is-done' : ''} ${open ? 'is-open' : ''}" data-ai2-item="${esc(q.id)}">
      <div class="ai2-item-head" data-ai2="toggle" data-id="${esc(q.id)}">
        <button class="ai2-check" type="button" role="checkbox" aria-checked="${q.checked ? 'true' : 'false'}" aria-label="준비 완료" data-ai2="check" data-id="${esc(q.id)}">${q.checked ? '✓' : ''}</button>
        <div class="ai2-item-main">
          <div class="ai2-q">${esc(q.text)}</div>
          <div class="ai2-meta">
            ${chips(q.keywords)}
            ${exp ? `<span class="ai2-link">🔗 ${esc(shortTitle(exp))}</span>` : '<span class="ai2-link is-none">경험 미연결</span>'}
            ${q.note ? '<span class="ai2-has-note">✎ 포인트</span>' : ''}
          </div>
        </div>
        <span class="ai2-chev" aria-hidden="true">›</span>
      </div>
      ${open ? itemBody(app, q, ui) : ''}
    </li>`;
  }

  function list(app, ui) {
    const iv = app.interview || [];
    const groups = SOURCES.map(([src, label, hint]) => {
      const items = iv.filter((q) => groupOf(q) === src);
      if (!items.length) return '';
      const done = items.filter((q) => q.checked).length;
      return `<section class="ai2-group">
        <div class="ai2-group-head"><b>${label}</b><span class="ai2-group-count">${done}/${items.length}</span><span class="subtle ai2-group-hint">${hint}</span></div>
        <ul class="ai2-items">${items.map((q) => item(app, q, ui)).join('')}</ul>
      </section>`;
    }).join('');
    return `<div class="ai2-list">${groups}${addRow(ui)}</div>`;
  }

  function addRow(ui) {
    if (!ui.adding) return `<button class="ai2-add-btn" type="button" data-ai2="add-open">＋ 질문 직접 추가</button>`;
    return `<div class="ai2-add">
      <input class="input" data-ai2-add placeholder="예) 결제 도메인에서 가장 중요하다고 생각하는 건 뭔가요?" maxlength="200" />
      <div class="row"><button class="btn btn-primary btn-sm" type="button" data-ai2="add-save">추가</button>
      <button class="btn btn-ghost btn-sm" type="button" data-ai2="add-cancel">취소</button></div>
    </div>`;
  }

  function emptyState(ui) {
    return `<div class="card ai2-empty">
      <div class="ai2-empty-ico" aria-hidden="true">🎤</div>
      <h3>아직 예상 질문이 없어요</h3>
      <p>요구 역량과 자소서를 바탕으로 이 기업에서 나올 만한 질문을 뽑아 드릴게요.</p>
      <button class="btn btn-primary btn-lg" type="button" data-ai2="suggest" ${ui.loading ? 'disabled' : ''}>${ui.loading ? '질문 만드는 중…' : '✦ AI 예상 질문 만들기'}</button>
      <div class="ai2-empty-sub">${ui.adding ? '' : '<button class="btn btn-ghost btn-sm" type="button" data-ai2="add-open">직접 추가할래요</button>'}</div>
      ${ui.adding ? addRow(ui) : ''}
    </div>`;
  }

  /* ---------- 연습 모드 ---------- */
  function practiceView(app, ui) {
    const items = orderedItems(app);
    if (!items.length) { ui.practice = null; return ''; }
    const p = ui.practice;
    p.idx = Math.max(0, Math.min(items.length - 1, p.idx));
    const q = items[p.idx];
    const exp = q.expId ? App.store.get(q.expId) : null;
    const done = items.filter((x) => x.checked).length;
    return `<div class="ai2-practice">
      <div class="ai2-pr-top">
        <button class="btn btn-ghost btn-sm" type="button" data-ai2="practice-exit">← 리스트로</button>
        <span class="ai2-pr-count"><b>${p.idx + 1}</b> / ${items.length}</span>
        <span class="ai2-pr-done">준비 완료 ${done}/${items.length}</span>
      </div>
      <div class="ai2-pr-dots">${items.map((x, i) => `<button class="ai2-pr-dot ${x.checked ? 'is-done' : ''} ${i === p.idx ? 'is-on' : ''}" type="button" data-ai2="practice-go" data-i="${i}" aria-label="${i + 1}번 질문"></button>`).join('')}</div>
      <div class="card ai2-pr-card ${q.checked ? 'is-done' : ''}">
        <span class="ai2-src" data-src="${esc(groupOf(q))}">${esc(SRC_SHORT[groupOf(q)])}</span>
        <div class="ai2-pr-q">${esc(q.text)}</div>
        ${(q.keywords || []).length ? `<div class="ai2-chips">${chips(q.keywords)}</div>` : ''}
        <p class="ai2-pr-tip">소리 내어 30초~1분 정도 답해 보세요.</p>
        ${p.reveal ? `<div class="ai2-pr-point">
          <div class="ai2-sub-label">연결한 경험</div>
          <div class="ai2-pr-exp">${exp ? esc(exp.title) : '<span class="subtle">아직 연결한 경험이 없어요</span>'}</div>
          <div class="ai2-sub-label">답변 포인트</div>
          <div class="ai2-pr-note">${q.note ? esc(q.note) : '<span class="subtle">적어 둔 포인트가 없어요</span>'}</div>
        </div>` : `<button class="btn ai2-pr-reveal" type="button" data-ai2="practice-reveal">포인트 보기</button>`}
      </div>
      <div class="ai2-pr-nav">
        <button class="btn" type="button" data-ai2="practice-prev" ${p.idx === 0 ? 'disabled' : ''}>← 이전</button>
        <button class="btn ${q.checked ? '' : 'btn-primary'}" type="button" data-ai2="practice-check" data-id="${esc(q.id)}">${q.checked ? '✓ 준비 완료됨' : '준비 완료로 표시'}</button>
        <button class="btn" type="button" data-ai2="practice-next" ${p.idx >= items.length - 1 ? 'disabled' : ''}>다음 →</button>
      </div>
    </div>`;
  }

  function inner(app) {
    const ui = uiOf(app.id);
    if (ui.practice) {
      const pv = practiceView(app, ui);
      if (pv) return pv;
    }
    const iv = app.interview || [];
    return `${focusPanel(app)}
      <section class="ai2-qsec">
        <div class="ai2-qsec-head">
          <h2 class="ai2-h2">예상 질문 리스트</h2>
          <p class="subtle">질문마다 쓸 경험과 답변 포인트를 정리하고, 준비가 되면 체크하세요.</p>
        </div>
        ${iv.length ? toolbar(app, ui) : ''}
        ${suggestPanel(ui)}
        ${iv.length ? list(app, ui) : (ui.sugg || ui.loading ? '' : emptyState(ui))}
        ${!iv.length && (ui.sugg || ui.loading) ? addRow(ui) : ''}
      </section>`;
  }

  App.applyTabs = App.applyTabs || {};
  App.applyTabs.interview = {
    label: '면접 준비',
    render(app) {
      return `<div class="ai2" data-ai2-root>${inner(App.store.getApp(app.id) || app)}</div>`;
    },
    mount(el, app0, ctx) {
      const appId = app0.id;
      const ui = uiOf(appId);
      let alive = true;
      const getApp = () => App.store.getApp(appId);
      const root = () => el.querySelector('[data-ai2-root]') || el;
      const draw = () => { const a = getApp(); if (a && alive) root().innerHTML = inner(a); };
      const refresh = () => { if (ctx && typeof ctx.refresh === 'function') ctx.refresh(); else draw(); };
      if (!el.querySelector('[data-ai2-root]')) el.innerHTML = this.render(app0);

      function addItem(s) {
        return App.store.addAppItem(appId, 'interview', { text: s.text, keywords: s.keywords || [], source: s.source || 'user', expId: s.expId || null, note: '', checked: false });
      }
      function existingTexts() { return new Set((getApp().interview || []).map((q) => q.text.trim())); }

      async function suggest() {
        if (ui.loading) return;
        ui.loading = true; ui.sugg = null; draw();
        await App.ai.think(900);
        const a = getApp(); if (!a) return;
        const have = existingTexts();
        ui.sugg = App.ai.interviewSuggestions(a).filter((s) => !have.has(s.text.trim()));
        ui.loading = false;
        draw();
      }
      function saveAdd() {
        const input = root().querySelector('[data-ai2-add]');
        const text = input ? input.value.trim() : '';
        if (!text) { if (input) input.focus(); return; }
        if (existingTexts().has(text)) { App.ui.toast('이미 리스트에 있는 질문이에요'); return; }
        const kws = App.ai.analyzeQuestion(text, { focus: focusNames(getApp()) }).keywords;
        const it = addItem({ text, keywords: kws, source: 'user' });
        ui.adding = false; if (it) ui.open[it.id] = true;
        App.ui.toast('질문을 추가했어요');
        refresh();
      }
      function saveEdit(id) {
        const input = root().querySelector(`[data-ai2-edit="${CSS.escape(id)}"]`);
        const text = input ? input.value.trim() : '';
        if (!text) { if (input) input.focus(); return; }
        const q = (getApp().interview || []).find((x) => x.id === id);
        const patch = { text };
        if (q && q.source === 'user') patch.keywords = App.ai.analyzeQuestion(text, { focus: focusNames(getApp()) }).keywords;
        App.store.updateAppItem(appId, 'interview', id, patch);
        ui.editing = null; draw();
      }
      function toggleCheck(id) {
        const q = (getApp().interview || []).find((x) => x.id === id); if (!q) return;
        App.store.updateAppItem(appId, 'interview', id, { checked: !q.checked });
        if (!q.checked) App.ui.toast('준비 완료! 준비도에 반영했어요');
        refresh();
      }

      function onClick(ev) {
        const t = ev.target.closest('[data-ai2]');
        if (!t || !el.contains(t)) return;
        const act = t.getAttribute('data-ai2');
        const id = t.getAttribute('data-id');
        if (act === 'toggle') {
          if (ev.target.closest('button, a, input, select, textarea')) return;
          ui.open[id] = !ui.open[id]; if (!ui.open[id] && ui.editing === id) ui.editing = null; draw(); return;
        }
        ev.stopPropagation();
        switch (act) {
          case 'check': toggleCheck(id); break;
          case 'suggest': suggest(); break;
          case 'sugg-close': ui.sugg = null; draw(); break;
          case 'sugg-add': {
            const s = ui.sugg && ui.sugg[Number(t.getAttribute('data-i'))]; if (!s) return;
            addItem(s); ui.sugg = ui.sugg.filter((x) => x !== s); if (!ui.sugg.length) ui.sugg = null;
            App.ui.toast('질문을 추가했어요'); refresh(); break;
          }
          case 'sugg-all': {
            const n = (ui.sugg || []).length; (ui.sugg || []).forEach(addItem); ui.sugg = null;
            App.ui.toast(`예상 질문 ${n}개를 추가했어요`); refresh(); break;
          }
          case 'add-open': ui.adding = true; draw(); { const i = root().querySelector('[data-ai2-add]'); if (i) i.focus(); } break;
          case 'add-cancel': ui.adding = false; draw(); break;
          case 'add-save': saveAdd(); break;
          case 'edit': ui.editing = id; draw(); { const i = root().querySelector(`[data-ai2-edit="${CSS.escape(id)}"]`); if (i) { i.focus(); i.select(); } } break;
          case 'edit-cancel': ui.editing = null; draw(); break;
          case 'edit-save': saveEdit(id); break;
          case 'link-rec':
            App.store.updateAppItem(appId, 'interview', id, { expId: t.getAttribute('data-exp') });
            App.ui.toast('경험을 연결했어요'); draw(); break;
          case 'delete': {
            const q = (getApp().interview || []).find((x) => x.id === id); if (!q) return;
            App.ui.modal({
              title: '이 질문을 삭제할까요?', danger: true, confirmText: '삭제',
              body: `<p>“${esc(q.text)}”</p><p class="subtle" style="margin-top:6px">적어 둔 답변 포인트도 함께 사라져요.</p>`,
              onConfirm: () => { App.store.removeAppItem(appId, 'interview', id); delete ui.open[id]; App.ui.toast('질문을 삭제했어요'); refresh(); },
            });
            break;
          }
          case 'practice': ui.practice = { idx: Math.max(0, orderedItems(getApp()).findIndex((q) => !q.checked)), reveal: false }; ui.sugg = null; draw(); el.scrollIntoView({ block: 'start', behavior: 'smooth' }); break;
          case 'practice-exit': ui.practice = null; draw(); break;
          case 'practice-prev': ui.practice.idx -= 1; ui.practice.reveal = false; draw(); break;
          case 'practice-next': ui.practice.idx += 1; ui.practice.reveal = false; draw(); break;
          case 'practice-go': ui.practice.idx = Number(t.getAttribute('data-i')); ui.practice.reveal = false; draw(); break;
          case 'practice-reveal': ui.practice.reveal = true; draw(); break;
          case 'practice-check': toggleCheck(id); break;
          default: break;
        }
      }
      function onChange(ev) {
        const sel = ev.target.closest('[data-ai2-exp]');
        if (sel) {
          App.store.updateAppItem(appId, 'interview', sel.getAttribute('data-ai2-exp'), { expId: sel.value || null });
          draw();
        }
      }
      // 답변 포인트는 포커스가 빠질 때 저장 (다시 그리지 않아 다음 클릭을 방해하지 않음)
      function onBlur(ev) {
        const ta = ev.target.closest && ev.target.closest('[data-ai2-note]'); if (!ta) return;
        const id = ta.getAttribute('data-ai2-note');
        const q = (getApp().interview || []).find((x) => x.id === id); if (!q || (q.note || '') === ta.value) return;
        App.store.updateAppItem(appId, 'interview', id, { note: ta.value });
        const mark = el.querySelector(`[data-ai2-saved="${CSS.escape(id)}"]`);
        if (mark) { mark.textContent = '저장됨'; setTimeout(() => { mark.textContent = ''; }, 1600); }
        const head = el.querySelector(`[data-ai2-item="${CSS.escape(id)}"] .ai2-meta`);
        if (head) {
          const has = head.querySelector('.ai2-has-note');
          if (ta.value.trim() && !has) head.insertAdjacentHTML('beforeend', '<span class="ai2-has-note">✎ 포인트</span>');
          if (!ta.value.trim() && has) has.remove();
        }
      }
      function onKey(ev) {
        if (ev.target.matches && ev.target.matches('[data-ai2-add]')) {
          if (ev.key === 'Enter' && !ev.isComposing) { ev.preventDefault(); saveAdd(); }
          if (ev.key === 'Escape') { ui.adding = false; draw(); }
        } else if (ev.target.matches && ev.target.matches('[data-ai2-edit]')) {
          if (ev.key === 'Enter' && !ev.isComposing) { ev.preventDefault(); saveEdit(ev.target.getAttribute('data-ai2-edit')); }
          if (ev.key === 'Escape') { ui.editing = null; draw(); }
        }
      }
      // 연습 모드: ← → 로 이동
      function onDocKey(ev) {
        if (!ui.practice || !alive) return;
        if (ev.target.closest && ev.target.closest('input, textarea, select, [contenteditable]')) return;
        if (document.getElementById('modal-root') && document.getElementById('modal-root').children.length) return;
        const n = orderedItems(getApp()).length;
        if (ev.key === 'ArrowLeft' && ui.practice.idx > 0) { ui.practice.idx -= 1; ui.practice.reveal = false; draw(); }
        if (ev.key === 'ArrowRight' && ui.practice.idx < n - 1) { ui.practice.idx += 1; ui.practice.reveal = false; draw(); }
      }

      el.addEventListener('click', onClick);
      el.addEventListener('change', onChange);
      el.addEventListener('focusout', onBlur);
      el.addEventListener('keydown', onKey);
      document.addEventListener('keydown', onDocKey);
      // 추천을 받는 중에 다시 그려진 경우 결과가 오면 새 화면에 반영
      if (ui.loading) {
        const wait = setInterval(() => { if (!ui.loading) { clearInterval(wait); draw(); } }, 150);
        setTimeout(() => clearInterval(wait), 4000);
      }

      return () => {
        alive = false;
        el.removeEventListener('click', onClick);
        el.removeEventListener('change', onChange);
        el.removeEventListener('focusout', onBlur);
        el.removeEventListener('keydown', onKey);
        document.removeEventListener('keydown', onDocKey);
      };
    },
  };
})(window.App);
