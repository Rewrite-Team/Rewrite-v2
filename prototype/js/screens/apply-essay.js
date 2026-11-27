/* 지원 기업 — 자소서 탭: 왼쪽 문항 목록, 오른쪽 문항 → 경험 카드 고르기 → AI 초안
   문항에 저장하는 값: expIds(고른 카드), answer(본문), gen { text, ids }(마지막으로 생성한 글과 그때 고른 카드), prevAnswer·prevGen(되돌리기) */
(function (App) {
  const esc = (s) => App.ui.esc(s);
  const I = (n, s) => App.icon(n, s);
  const U = () => App.applyUtil;
  const MAX = 3;
  const num = (n) => Number(n).toLocaleString();

  /* ---------- 화면 상태: 계정 + 기업마다 ---------- */
  const uiStore = {}; const writing = new Set(); // writing: 지금 AI 가 쓰고 있는 문항
  const keyOf = (appId) => `${(App.auth.current() || {}).id}|${appId}`;
  function uiOf(appId) { const k = keyOf(appId); return (uiStore[k] = uiStore[k] || { sel: null, inside: false, q: {} }); }
  const qui = (ui, q) => (ui.q[q.id] = ui.q[q.id] || { pick: null, others: null, find: '', manual: false });

  const idsOf = (q) => q.expIds || [];
  const liveIds = (q) => idsOf(q).filter((id) => App.store.get(id));
  const written = (q) => !!String(q.answer || '').trim();
  const edited = (q) => written(q) && q.answer !== ((q.gen && q.gen.text) || '');
  const cardsChanged = (q) => !!q.gen && q.gen.ids.slice().sort().join() !== liveIds(q).sort().join();
  // AI 가 비워 둔 곳 [ ] 중 아직 남은 것. 사용자가 쓴 [소제목]은 세지 않는다
  function slots(q, text) {
    const t = text == null ? String(q.answer || '') : text;
    return [...new Set((((q.gen && q.gen.text) || '').match(/\[[^[\]\n]+\]/g)) || [])].filter((s) => t.includes(s));
  }
  function current(app, ui) { const list = app.essays || []; return list.find((q) => q.id === ui.sel) || list[0] || null; }

  /* ---------- 문항 목록 ---------- */
  function stateText(q) {
    const n = liveIds(q).length;
    return writing.has(keyOf(q.id)) ? '쓰는 중' : App.ai.essayDone(q) ? '작성됨' : written(q) ? '다듬는 중' : n ? `카드 ${n}장` : '쓰기 전';
  }
  const countText = (q, len) => `${num(len)}${q.limit ? ` / ${num(q.limit)}` : ''}자`;
  function navHtml(app, ui) {
    const sel = current(app, ui);
    return `<ol>${app.essays.map((q, i) => { const len = String(q.answer || '').length; return `<li><button type="button" class="ae-item" data-ae-sel="${esc(q.id)}" ${q === sel ? 'aria-current="true"' : ''}>
      <span class="ae-item-n">${i + 1}</span><span class="ae-item-main"><span class="ae-item-t">${esc(q.text)}</span>
      <span class="meta"><span class="${App.ai.essayDone(q) ? 'ae-done' : ''}">${App.ai.essayDone(q) ? I('check', 14) : ''}${stateText(q)}</span><span class="${q.limit && len > q.limit ? 'ae-over' : ''}">${countText(q, len)}</span></span></span></button></li>`; }).join('')}</ol>
      <button type="button" class="btn btn-sm btn-block" data-ae="add">${I('plus', 16)}문항 추가</button>`;
  }

  /* ---------- 문항 머리 ---------- */
  function headHtml(q, i) {
    const kws = q.keywords || [];
    return `<button type="button" class="btn btn-ghost btn-sm ae-back" data-ae="back">${I('chevron-left', 16)}문항 목록</button>
      <header class="ae-q"><div class="ae-q-top"><h2 class="ae-q-text"><span class="ae-q-n">${i + 1}</span>${esc(q.text)}</h2>
        <div class="menu"><button type="button" class="icon-btn" aria-haspopup="menu" aria-expanded="false" aria-label="문항 더 보기">${I('more')}</button>
          <div class="menu-list"><button type="button" data-ae="edit">${I('edit', 16)}문항과 역량 고치기</button><hr><button type="button" class="is-danger" data-ae="del">${I('trash', 16)}문항 지우기</button></div></div></div>
        <dl class="ae-facts"><div><dt>글자 수</dt><dd>${q.limit ? `${num(q.limit)}자 이내` : '제한 없음'}</dd></div>
          <div><dt>핵심 역량</dt><dd class="row row-wrap">${kws.length ? kws.map((k) => App.ui.keywordChip(k, true)).join('') : '<span class="subtle">특정 역량을 묻지 않아요</span>'}<button type="button" class="icon-btn ae-kw-edit" data-ae="edit" aria-label="핵심 역량 고치기">${I('edit', 15)}</button></dd></div></dl></header>`;
  }

  /* ---------- 경험 카드 고르기 ---------- */
  // 같은 기업의 다른 문항에서 쓴 곳
  const usedIn = (app, q, id) => app.essays.map((x, i) => (x.id !== q.id && idsOf(x).includes(id) ? i + 1 : 0)).filter(Boolean);
  function choice(app, q, e, matched) {
    const used = usedIn(app, q, e.id);
    return `<label class="choice ae-choice"><input type="checkbox" data-ae-card="${esc(e.id)}" ${idsOf(q).includes(e.id) ? 'checked' : ''}>
      <span class="choice-main"><span class="ae-choice-top">${App.ui.projChip(e.projectId)}${used.length ? `<span class="ae-used">${used.join(', ')}번 문항에서 사용</span>` : ''}</span>
        <span class="choice-title">${esc(e.title)}</span><span class="choice-sub">${esc(e.resumeLine || e.summary)}</span>
        <span class="ae-kws">${e.keywords.map((k) => App.ui.keywordChip(k, matched.includes(k))).join('')}</span></span>
      <a class="icon-btn" href="#/card/${esc(e.id)}" target="_blank" rel="noopener" title="카드 열기" aria-label="「${esc(e.title)}」 카드 새 창에서 열기">${I('external', 16)}</a></label>`;
  }
  // 핵심 역량이 겹치지 않는 카드 (프로젝트끼리 모아서)
  function otherCards(q) {
    const hit = new Set(App.ai.cardsFor(q.keywords).map((r) => r.exp.id));
    return App.store.projects().map((p) => App.ai.rankCards(App.store.cardsOf(p.id).filter((e) => !hit.has(e.id)))).filter((l) => l.length);
  }
  function otherList(app, q, find) {
    const t = find.trim().toLowerCase();
    const groups = otherCards(q).map((l) => l.filter((e) => !t || [e.title, e.summary, e.resumeLine, (App.store.getProject(e.projectId) || {}).title, ...e.keywords].join(' ').toLowerCase().includes(t))).filter((l) => l.length);
    return groups.length ? groups.map((l) => `<div class="ae-group">${l.map((e) => choice(app, q, e, [])).join('')}</div>`).join('') : '<p class="subtle ae-none">찾는 카드가 없어요.</p>';
  }
  function cardsHtml(app, q, st) {
    if (!App.store.list().length) return `<section class="ae-sec"><h3 class="section-title">경험 카드 고르기</h3><div class="panel ae-nocard"><p>아직 경험 카드가 없어요. 카드가 있으면 AI가 자소서를 써 드려요.</p>
      ${written(q) ? '' : '<button type="button" class="btn btn-ghost" data-ae="manual">직접 쓰기</button>'}<button type="button" class="btn" data-chat data-chat-kw="${esc((q.keywords || [])[0] || '')}">${I('chat', 16)}AI 채팅 시작하기</button></div></section>`;
    const hits = App.ai.cardsFor(q.keywords); const kws = q.keywords || []; const rest = otherCards(q).reduce((n, l) => n + l.length, 0);
    const pick = st.pick == null ? !written(q) : st.pick;
    const others = !kws.length || (st.others == null ? !hits.length || U().isOpen(q.text) : st.others);
    const find = `<div class="input-icon ae-find">${I('search', 16)}<input class="input" type="search" data-ae-find value="${esc(st.find)}" placeholder="카드 검색" aria-label="카드 검색"></div>`;
    const title = (n) => `<h3 class="section-title">경험 카드 고르기${n ? ` <span class="count">${n}</span>` : ''}<span class="subtle ae-cap">${MAX}장까지</span>${written(q) && !writing.has(keyOf(q.id)) ? `<button type="button" class="more link" data-ae="pick" aria-expanded="${pick}">${pick ? '접기' : '카드 바꾸기'}</button>` : ''}</h3>`;
    if (!pick) return `<section class="ae-sec">${title(0)}<div data-ae-picked>${pickedHtml(q)}</div></section>`;
    return `<section class="ae-sec">${title(kws.length ? hits.length : rest)}
      ${kws.length ? (hits.length ? `<div>${hits.map((r) => choice(app, q, r.exp, r.matched)).join('')}</div>`
        : `<div class="panel ae-nocard"><p>${kws.length > 1 ? '이 역량들' : `‘${esc(kws[0])}’ 역량`}과 맞는 경험 카드가 없어요.</p><button type="button" class="btn" data-chat data-chat-kw="${esc(kws[0])}">${I('chat', 16)}AI 채팅으로 찾기</button></div>`) : find}
      ${!kws.length ? `<div data-ae-others>${otherList(app, q, st.find)}</div>` : rest ? `<button type="button" class="btn btn-sm ae-more" data-ae="others" aria-expanded="${others}">${I('chevron-down', 16)}다른 카드 보기 <span class="count">${rest}</span></button>
        ${others ? `${find}<div data-ae-others>${otherList(app, q, st.find)}</div>` : ''}` : ''}
      <div data-ae-picked class="is-sticky">${pickedHtml(q)}</div></section>`;
  }
  // 고른 카드: 어느 프로젝트의 어떤 카드인지 + 생성 버튼
  function pickedHtml(q) {
    const ids = idsOf(q); const n = liveIds(q).length; const busy = writing.has(keyOf(q.id)); const redo = written(q);
    const hint = !n ? '경험 카드를 하나 이상 골라 주세요' : n > 2 ? '1~2장을 고르면 한 경험을 더 자세히 쓸 수 있어요' : redo && cardsChanged(q) ? '다시 생성하면 바꾼 카드로 새로 써요' : '';
    return `<div class="ae-picked"><div class="ae-picked-main"><div class="label">고른 경험 카드 ${n ? `<span class="count">${n}</span>` : ''}</div>
        ${ids.length ? `<ul>${ids.map((id) => `<li class="ae-chip">${U().cardRef(id)}<button type="button" class="chip-x" data-ae-unpick="${esc(id)}" aria-label="${esc((App.store.get(id) || { title: '휴지통에 있는 카드' }).title)} 빼기">${I('close', 14)}</button></li>`).join('')}</ul>` : ''}
        ${hint ? `<p class="subtle">${hint}</p>` : ''}</div>
      <div class="ae-picked-go">${!redo && !busy ? '<button type="button" class="btn btn-ghost" data-ae="manual">직접 쓰기</button>' : ''}<button type="button" class="btn ${!redo || cardsChanged(q) ? 'btn-primary' : ''}" data-ae="write" ${!n || busy ? 'disabled' : ''}>${busy ? '<span class="spinner"></span>쓰는 중' : redo ? `${I('refresh', 16)}다시 생성` : `${I('sparkle', 16)}AI로 자소서 생성`}</button></div></div>`;
  }

  /* ---------- 초안 ---------- */
  const mirror = (q, text) => {
    let h = esc(text); slots(q, text).forEach((s) => { h = h.split(esc(s)).join(`<span class="ae-slot">${esc(s)}</span>`); });
    return h + '\n';
  };
  function countHtml(q, text) {
    const n = text.length; const over = q.limit ? n - q.limit : 0;
    return `<span class="${over > 0 ? 'ae-over' : ''}">${num(n)}${q.limit ? ` / ${num(q.limit)}` : ''}자${over > 0 ? `, ${num(over)}자 넘었어요` : ''}</span> <span class="subtle">공백 포함</span>`;
  }
  function slotBanner(q, text) {
    const n = slots(q, text).length;
    return n ? `<div class="banner banner-warn">${I('warning')}<span>채워야 할 곳 ${n}군데</span><button type="button" class="btn btn-sm" data-ae="slot">찾아가기</button></div>` : '';
  }
  function draftHtml(q, st) {
    if (writing.has(keyOf(q.id))) return `<section class="ae-sec"><h3 class="section-title">자소서</h3><div class="ae-wait" role="status"><span class="sr-only">고른 카드로 자소서를 쓰고 있어요</span>${[96, 100, 88, 94, 60].map((w) => `<span class="skeleton" style="width:${w}%"></span>`).join('')}</div></section>`;
    if (!written(q) && !st.manual) return '';
    const text = String(q.answer || '');
    return `<section class="ae-sec" data-wr><h3 class="section-title"><label for="ae-text">자소서</label></h3>
      <div data-ae-slots>${slotBanner(q, text)}</div>
      <div class="ae-editor"><div class="ae-mirror" aria-hidden="true" data-ae-mirror>${mirror(q, text)}</div><textarea id="ae-text" data-q="${esc(q.id)}" class="textarea" spellcheck="false" aria-describedby="ae-count" placeholder="자소서를 써 주세요.">${esc(text)}</textarea></div>
      ${App.ui.wrFoot(`<span id="ae-count" data-ae-count>${countHtml(q, text)}</span>${q.prevAnswer ? `<button type="button" class="btn btn-sm btn-ghost" data-ae="undo">${I('restore', 16)}이전 글로 되돌리기</button>` : ''}<button type="button" class="btn btn-sm" data-ae="copy">${I('copy', 16)}복사</button>`)}</section>
      ${q.note ? `<section class="ae-sec" data-wr><h3 class="section-title"><label for="ae-note">메모</label></h3><textarea id="ae-note" data-q="${esc(q.id)}" class="textarea ae-note" rows="2">${esc(q.note)}</textarea>${App.ui.wrFoot()}</section>` : ''}`;
  }

  function detailHtml(app, ui) {
    const q = current(app, ui); if (!q) return ''; const st = qui(ui, q);
    return `${headHtml(q, app.essays.indexOf(q))}<div class="ae-work"><div data-ae-cards>${cardsHtml(app, q, st)}</div><div class="ae-draft" data-ae-draft>${draftHtml(q, st)}</div></div>`;
  }
  function render(app) {
    const ui = uiOf(app.id);
    if (!(app.essays || []).length) return `<div class="empty"><div class="empty-title">자소서 문항이 없어요</div><p>문항을 넣으면 어울리는 경험 카드를 찾아 드려요.</p><button type="button" class="btn btn-primary" data-ae="add">${I('plus', 16)}문항 추가</button></div>`;
    return `<div class="ae ${ui.inside ? 'is-inside' : ''}"><nav class="ae-nav" aria-label="자소서 문항">${navHtml(app, ui)}</nav><div class="ae-detail">${detailHtml(app, ui)}</div></div>`;
  }

  App.applyTabs = App.applyTabs || {};
  App.applyTabs.essay = {
    label: '자소서', render,
    mount(el, app0, ctx) {
      const appId = app0.id; const ui = uiOf(appId); let alive = true; let dirty = false;
      const cur = () => App.store.getApp(appId);
      const now = () => { const a = cur(); return a && current(a, ui); };
      const byId = (id) => { const a = cur(); return a && a.essays.find((x) => x.id === id); };
      const $ = (s) => el.querySelector(s);
      const put = (id, patch) => App.store.updateAppItem(appId, 'essays', id, patch);
      const drawNav = () => { const a = cur(); if (a && $('.ae-nav')) $('.ae-nav').innerHTML = navHtml(a, ui); };
      const drawDetail = () => { const a = cur(); if (a && $('.ae-detail')) $('.ae-detail').innerHTML = detailHtml(a, ui); };
      const drawCards = () => { const q = now(); if (q) $('[data-ae-cards]').innerHTML = cardsHtml(cur(), q, qui(ui, q)); };
      const drawDraft = () => { const q = now(); if (q) $('[data-ae-draft]').innerHTML = draftHtml(q, qui(ui, q)); };
      const drawPicked = () => { const q = now(); const box = $('[data-ae-picked]'); if (q && box) box.innerHTML = pickedHtml(q); };

      /* 본문 저장: 저장 버튼, 또는 다른 동작을 하거나 떠날 때 */
      function flush() {
        const ta = $('#ae-text'); const q = ta && byId(ta.dataset.q); if (!dirty) return; dirty = false;
        if (!q || (q.answer || '') === ta.value) return;
        const had = written(q); put(q.id, { answer: ta.value }); App.ui.wrSaved(ta);
        drawNav(); if (had !== written(q)) ctx.refreshHead();
      }
      function leave() {
        flush(); const note = $('#ae-note'); const q = note && byId(note.dataset.q);
        if (q && note.value !== (q.note || '')) { put(q.id, { note: note.value }); App.ui.wrSaved(note); }
      }
      function select(id, inside) {
        leave(); ui.sel = id; ui.inside = inside; const a = cur(); if (!$('.ae')) return;
        $('.ae').classList.toggle('is-inside', inside); drawNav(); drawDetail();
        if (!a.essays.length) ctx.refresh();
      }

      /* 카드 고르기 */
      function setCard(id, on) {
        const q = now(); if (!q) return false;
        if (on && liveIds(q).length >= MAX) { App.ui.toast(`카드는 ${MAX}장까지 고를 수 있어요`); return false; }
        put(q.id, { expIds: idsOf(q).filter((x) => x !== id).concat(on ? id : []) });
        drawPicked(); drawNav(); return true;
      }

      /* AI 로 쓰기 */
      function askWrite() {
        flush(); const q = now(); if (!q || !liveIds(q).length) return;
        if (edited(q)) App.ui.modal({ title: '다시 생성할까요?', confirmText: '다시 생성', body: '<p>지금 글을 AI가 새로 쓴 글로 바꿔요. 바꾼 뒤에 이전 글로 되돌릴 수 있어요.</p>', onConfirm: () => { write(q); } });
        else write(q);
      }
      async function write(q) {
        const a = cur(); const acct = (App.auth.current() || {}).id; const key = keyOf(q.id); if (writing.has(key)) return;
        const ids = liveIds(q);
        const cards = ids.map((id) => { const e = App.store.get(id); return { title: e.title, projectTitle: App.store.projectName(App.store.getProject(e.projectId)), role: e.role, summary: e.summary, star: e.star, keywords: e.keywords }; });
        const ask = { question: q.text, keywords: q.keywords || [], limit: q.limit || 0, cards, company: a.company, job: a.job };
        writing.add(key); qui(ui, q).pick = false; drawCards(); drawDraft(); drawNav(); // 목록을 접어 고른 카드와 초안이 한눈에 보이게
        const box = $('[data-ae-cards]'); if (box && box.getBoundingClientRect().top < 56) box.scrollIntoView({ block: 'start' });
        let text = '';
        try { await App.ai.think(900); text = App.essay.writeEssay(ask); } catch (e) { console.error(e); } finally { writing.delete(key); }
        if ((App.auth.current() || {}).id !== acct) return; // 그사이 로그아웃했거나 다른 계정
        const fresh = byId(q.id); if (!fresh) return;
        const before = fresh.answer || '';
        if (text && text === before) App.ui.toast('카드가 같아서 글도 같아요. 다른 카드를 골라 보세요.');
        else if (text) put(q.id, { answer: text, gen: { text, ids }, prevAnswer: before.trim() ? before : fresh.prevAnswer || '', prevGen: before.trim() ? fresh.gen || null : fresh.prevGen || null });
        else App.ui.toast('글을 만들지 못했어요. 다시 시도해 주세요.');
        if (text && text === before && cardsChanged(fresh)) put(q.id, { gen: { text, ids } });
        qui(uiOf(appId), q).pick = null;
        if (!alive) return;
        ctx.refreshHead(); drawNav();
        if (now() && now().id === q.id) { drawCards(); drawDraft(); }
      }
      function undo() {
        flush(); const q = now(); if (!q || !q.prevAnswer) return;
        put(q.id, { answer: q.prevAnswer, gen: q.prevGen || null, prevAnswer: q.answer, prevGen: q.gen || null });
        App.ui.toast('이전 글로 되돌렸어요'); drawDraft(); drawPicked(); drawNav(); ctx.refreshHead();
      }
      async function copy() {
        flush(); const q = now(); const ta = $('#ae-text'); if (!q || !ta) return; let ok = true;
        try { await navigator.clipboard.writeText(ta.value); } catch (e) { const s = ta.selectionStart; ta.focus(); ta.select(); ok = document.execCommand('copy'); ta.setSelectionRange(s, s); }
        const n = slots(q).length; App.ui.toast(!ok ? '복사하지 못했어요' : n ? `복사했어요. 채워야 할 곳이 ${n}군데 남아 있어요.` : '복사했어요');
      }
      function goSlot() {
        const ta = $('#ae-text'); const q = now(); if (!ta || !q) return; const from = ta.selectionEnd === ta.value.length ? 0 : ta.selectionEnd;
        const list = slots(q, ta.value).map((s) => [ta.value.indexOf(s), s.length]).sort((x, y) => x[0] - y[0]); const hit = list.find(([i]) => i >= from) || list[0]; if (!hit) return;
        ta.focus({ preventScroll: true }); ta.setSelectionRange(hit[0], hit[0] + hit[1]);
        const mark = $('[data-ae-mirror]').querySelectorAll('.ae-slot')[list.indexOf(hit)]; if (mark) mark.scrollIntoView({ block: 'center' });
      }

      /* 문항 추가·고치기 */
      function openQuestion(q) {
        const samples = window.SEED.sampleQuestions || []; let touched = !!q;
        App.ui.modal({
          title: q ? '문항 고치기' : '문항 추가', confirmText: q ? '저장' : '추가',
          body: `<div class="field"><label class="label" for="ae-f-text">문항</label><textarea class="textarea" id="ae-f-text" rows="4" maxlength="500">${esc(q ? q.text : '')}</textarea>
              <p class="field-error" data-err role="alert" hidden>${I('warning', 15)}문항을 적어 주세요.</p></div>
            ${q ? '' : `<select class="select ae-sample" aria-label="예시 문항"><option value="">예시 문항에서 고르기</option>${samples.map((s) => `<option>${esc(s)}</option>`).join('')}</select>`}
            <div class="field"><label class="label" for="ae-f-limit">글자 수 제한 <span class="subtle">비워 두면 제한 없음</span></label><input class="input" id="ae-f-limit" type="number" min="0" step="50" inputmode="numeric" value="${esc(q ? q.limit || '' : 800)}"></div>
            <div class="field"><div class="label" id="ae-f-kw">핵심 역량 <span class="subtle">3개까지</span></div><div role="group" aria-labelledby="ae-f-kw" data-kwbox>${U().kwPicker(q ? q.keywords : [])}</div></div>`,
          onOpen(root) {
            const ta = root.querySelector('#ae-f-text'); const box = root.querySelector('[data-kwbox]');
            const detect = () => { if (!touched) box.innerHTML = U().kwPicker(U().detectKw(ta.value)); };
            ta.addEventListener('input', detect); box.addEventListener('kwpick', () => { touched = true; });
            const sm = root.querySelector('.ae-sample'); if (sm) sm.onchange = () => { if (sm.value) { ta.value = sm.value; detect(); } };
          },
          onConfirm(root) {
            const ta = root.querySelector('#ae-f-text'); const text = ta.value.trim(); const lim = parseInt(root.querySelector('#ae-f-limit').value, 10);
            root.querySelector('[data-err]').hidden = !!text; ta.setAttribute('aria-invalid', String(!text)); if (!text) { ta.focus(); return false; }
            const data = { text, limit: lim > 0 ? lim : null, keywords: U().kwPicked(root) };
            if (q) { leave(); put(q.id, data); ui.q[q.id] = null; drawNav(); drawDetail(); return true; }
            leave(); const it = App.store.addAppItem(appId, 'essays', Object.assign(data, { expIds: [], answer: '', note: '' })); if (!it) return true;
            ui.sel = it.id; ui.inside = true; ctx.refresh(); return true;
          },
        });
      }
      function removeQuestion() {
        leave(); const a = cur(); const q = now(); if (!q) return; const at = a.essays.indexOf(q); const keep = JSON.parse(JSON.stringify(q)); const acct = (App.auth.current() || {}).id;
        App.store.removeAppItem(appId, 'essays', q.id); ui.sel = null; ui.inside = false; ctx.refresh();
        App.ui.toast('문항을 지웠어요', { action: '되돌리기', onAction: () => {
          const b = cur(); if (!b || (App.auth.current() || {}).id !== acct) return; const list = b.essays.slice(); list.splice(at, 0, keep); App.store.updateApp(appId, { essays: list }); ui.sel = keep.id; if (alive) ctx.refresh();
        } });
      }

      const onClick = (ev) => {
        const sel = ev.target.closest('[data-ae-sel]'); if (sel) { select(sel.dataset.aeSel, true); const box = $('.ae'); if (box.getBoundingClientRect().top < 56 || !$('.ae-nav').offsetParent) box.scrollIntoView({ block: 'start' }); return; }
        const un = ev.target.closest('[data-ae-unpick]');
        if (un) {
          const id = un.dataset.aeUnpick; setCard(id, false); const c = el.querySelector(`[data-ae-card="${CSS.escape(id)}"]`); if (c) c.checked = false;
          const next = $('[data-ae-unpick]') || $('[data-ae-card]'); if (next) next.focus({ preventScroll: true }); return;
        }
        const b = ev.target.closest('[data-ae]'); if (!b) return; const q = now(); const st = q && qui(ui, q);
        switch (b.dataset.ae) {
          case 'add': openQuestion(null); break;
          case 'edit': if (q) openQuestion(q); break;
          case 'del': removeQuestion(); break;
          case 'back': select(q && q.id, false); break;
          case 'pick': st.pick = b.getAttribute('aria-expanded') !== 'true'; drawCards(); { const t = $('[data-ae=pick]'); if (t) t.focus({ preventScroll: true }); } break;
          case 'others': st.others = b.getAttribute('aria-expanded') !== 'true'; drawCards(); { const t = $('[data-ae=others]'); if (t) t.focus({ preventScroll: true }); } break;
          case 'write': askWrite(); break;
          case 'manual': st.manual = true; drawDraft(); $('#ae-text').focus(); break;
          case 'undo': undo(); break;
          case 'copy': copy(); break;
          case 'slot': goSlot(); break;
          default: break;
        }
      };
      const onChange = (ev) => { const id = ev.target.dataset && ev.target.dataset.aeCard; if (id && !setCard(id, ev.target.checked)) ev.target.checked = !ev.target.checked; };
      const onInput = (ev) => {
        const q = now(); if (!q) return; const t = ev.target;
        if (t.matches('[data-ae-find]')) { qui(ui, q).find = t.value; $('[data-ae-others]').innerHTML = otherList(cur(), q, t.value); return; }
        if (t.id !== 'ae-text') return;
        $('[data-ae-mirror]').innerHTML = mirror(q, t.value); $('[data-ae-count]').innerHTML = countHtml(q, t.value);
        const n = slots(q, t.value).length; const bn = $('[data-ae-slots]'); if (bn.dataset.n !== String(n)) { bn.dataset.n = n; bn.innerHTML = slotBanner(q, t.value); }
        dirty = true;
      };
      el.addEventListener('click', onClick); el.addEventListener('change', onChange); el.addEventListener('input', onInput); el.addEventListener('wr-save', leave);
      window.addEventListener('beforeunload', leave);
      return () => { leave(); alive = false; window.removeEventListener('beforeunload', leave); };
    },
  };
})(window.App);
