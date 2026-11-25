/* 지원 기업 — 면접 준비 탭: 질문 목록(준비 완료, 답변에 쓸 경험 카드, 메모) + 예상 질문 받기 */
(function (App) {
  const esc = (s) => App.ui.esc(s);
  const I = (n, s) => App.icon(n, s);
  const uiStore = {};
  const acctId = () => (App.auth.current() || {}).id;
  function uiOf(appId) { const k = `${acctId()}|${appId}`; return (uiStore[k] = uiStore[k] || { open: {}, loading: false }); }

  function cardSelect(q) {
    const hits = App.ai.cardsFor(q.keywords).map((r) => r.exp); const hitIds = new Set(hits.map((e) => e.id));
    const opt = (e, withProject) => `<option value="${esc(e.id)}" ${e.id === q.expId ? 'selected' : ''}>${withProject ? `${esc((App.store.getProject(e.projectId) || {}).title || '')} / ` : ''}${esc(e.title)}</option>`;
    const groups = App.store.projects().map((p) => [p, App.store.cardsOf(p.id).filter((e) => !hitIds.has(e.id))]).filter(([, l]) => l.length);
    return `<select class="select" id="iv-card-${esc(q.id)}" data-iv-card="${esc(q.id)}"><option value="">고르지 않음</option>
      ${q.expId && !App.store.get(q.expId) ? `<option value="${esc(q.expId)}" selected>${esc(((t) => (t ? `${t.title} (휴지통)` : '지워진 카드'))(App.ui.trashedCard(q.expId)))}</option>` : ''}
      ${hits.length ? `<optgroup label="질문에 맞는 카드">${hits.map((e) => opt(e, true)).join('')}</optgroup>` : ''}
      ${groups.map(([p, l]) => `<optgroup label="${esc(p.title)}">${l.map((e) => opt(e)).join('')}</optgroup>`).join('')}</select>`;
  }
  // 고른 카드의 요점
  function brief(id) {
    const e = App.store.get(id); if (!e) return ''; const b = App.ai.starBrief(e);
    const rows = [['상황', b.situation], ['행동', b.action], ['결과', b.result]].filter(([, t]) => t);
    return rows.length ? `<dl class="iv-brief">${rows.map(([k, t]) => `<div><dt>${k}</dt><dd>${esc(t)}</dd></div>`).join('')}</dl>` : '';
  }
  function item(q, ui) {
    const open = !!ui.open[q.id]; const id = esc(q.id); const none = !App.store.list().length;
    return `<li class="iv-item ${q.checked ? 'is-done' : ''}" data-iv-item="${id}"><div class="iv-row">
        <input type="checkbox" data-iv-check="${id}" ${q.checked ? 'checked' : ''} aria-label="준비 완료: ${esc(q.text)}">
        <button type="button" class="iv-main" data-iv="toggle" aria-expanded="${open}" aria-controls="iv-body-${id}"><span class="iv-q">${esc(q.text)}</span>${q.expId ? App.applyUtil.cardRef(q.expId) : ''}${I('chevron-down', 18)}</button></div>
      ${open ? `<div class="iv-body" id="iv-body-${id}">
        <div class="field">${none ? '' : `<label class="label" for="iv-card-${id}">답변에 쓸 경험 카드</label>${cardSelect(q)}`}${none ? `<button type="button" class="btn btn-sm" data-chat data-chat-kw="${esc((q.keywords || [])[0] || '')}">${I('chat', 16)}AI 채팅으로 경험 카드 만들기</button>` : ''}${q.expId ? brief(q.expId) : ''}</div>
        <div class="field"><label class="label" for="iv-note-${id}">답변 메모</label><textarea class="textarea" id="iv-note-${id}" data-iv-note="${id}" rows="3" placeholder="꼭 말할 숫자, 마무리 한마디">${esc(q.note)}</textarea></div>
        <div class="row iv-foot"><button type="button" class="btn btn-sm btn-ghost" data-iv="edit">${I('edit', 16)}질문 고치기</button><button type="button" class="btn btn-sm btn-ghost" data-iv="del">${I('trash', 16)}질문 지우기</button></div></div>` : ''}</li>`;
  }
  function render(app) {
    const ui = uiOf(app.id); const list = app.interview || [];
    const ask = `<button type="button" class="btn btn-primary" data-iv="suggest" ${ui.loading ? 'disabled' : ''}>${ui.loading ? '<span class="spinner"></span>질문 찾는 중' : `${I('sparkle', 16)}예상 질문 받기`}</button>`;
    const add = `<button type="button" class="btn" data-iv="add">${I('plus', 16)}직접 추가</button>`;
    if (!list.length) return `<div class="empty"><div class="empty-title">아직 면접 질문이 없어요</div><p>공고와 자소서를 보고 나올 만한 질문을 찾아 드려요.</p><div class="row row-wrap iv-empty">${ask}${add}</div></div>`;
    return `<div class="iv"><div class="iv-bar"><span class="row spacer">${add}${ask}</span></div>
      <ul class="list">${list.map((q) => item(q, ui)).join('')}</ul></div>`;
  }

  App.applyTabs = App.applyTabs || {};
  App.applyTabs.interview = {
    label: '면접 준비', render,
    mount(el, app0, ctx) {
      const appId = app0.id; const ui = uiOf(appId); let alive = true;
      const cur = () => App.store.getApp(appId);
      const find = (id) => { const a = cur(); return a && a.interview.find((q) => q.id === id); };
      const put = (id, patch) => App.store.updateAppItem(appId, 'interview', id, patch);
      const saveNotes = () => el.querySelectorAll('[data-iv-note]').forEach((ta) => { const q = find(ta.dataset.ivNote); if (q && (q.note || '') !== ta.value) put(q.id, { note: ta.value }); });
      const draw = () => { if (!alive || !cur()) return; saveNotes(); el.innerHTML = render(cur()); };
      const all = () => { draw(); ctx.refreshHead(); };
      const focusOn = (id, sel) => { const t = el.querySelector(`[data-iv-item="${CSS.escape(id)}"] ${sel}`); if (t) t.focus({ preventScroll: true }); };
      const addItem = (s) => App.store.addAppItem(appId, 'interview', { text: s.text, keywords: s.keywords || [], source: s.source || 'user', expId: s.expId || null, note: '', checked: false });

      async function suggest() {
        const acct = acctId(); ui.loading = true; draw(); await App.ai.think(900); ui.loading = false;
        const a = cur(); if (!alive || acctId() !== acct || !a) return; draw();
        const have = new Set(a.interview.map((q) => q.text.trim())); const list = App.ai.interviewSuggestions(a).filter((s) => !have.has(s.text.trim()) && have.add(s.text.trim()));
        if (!list.length) { App.ui.toast('지금은 더 추천할 질문이 없어요'); return; }
        if (document.querySelector('#modal-root > *')) return; // 그사이 다른 창을 열었으면 덮지 않는다
        App.ui.modal({
          title: '예상 질문', size: 'lg', confirmText: '고른 질문 추가',
          body: `<div class="iv-sugg">${list.map((s, i) => `<label class="choice"><input type="checkbox" value="${i}" checked><span class="choice-main"><span class="choice-title">${esc(s.text)}</span>${s.expId ? `<span class="choice-sub">${App.applyUtil.cardRef(s.expId)}</span>` : ''}</span></label>`).join('')}</div>`,
          onConfirm(root) {
            const on = [...root.querySelectorAll('input:checked')].map((x) => list[+x.value]); if (!on.length) { App.ui.toast('추가할 질문을 골라 주세요'); return false; }
            on.forEach(addItem); all(); App.ui.toast(`질문 ${on.length}개를 추가했어요`); return true;
          },
        });
      }
      function openQuestion(q) {
        App.ui.modal({
          title: q ? '질문 고치기' : '면접 질문 추가', confirmText: q ? '저장' : '추가',
          body: `<label class="label" for="iv-f">질문</label><input class="input" id="iv-f" maxlength="200" autocomplete="off" value="${esc(q ? q.text : '')}"><p class="field-error" data-err role="alert" hidden></p>`,
          onConfirm(root) {
            const input = root.querySelector('#iv-f'); const text = input.value.trim(); const dup = cur().interview.some((x) => x.text.trim() === text && (!q || x.id !== q.id));
            const err = root.querySelector('[data-err]'); err.hidden = !!text && !dup; err.textContent = text ? '이미 있는 질문이에요.' : '질문을 적어 주세요.'; if (!text || dup) { input.setAttribute('aria-invalid', 'true'); input.focus(); return false; }
            if (q) put(q.id, { text, keywords: text === q.text ? q.keywords : App.applyUtil.detectKw(text) });
            else { const it = addItem({ text, keywords: App.applyUtil.detectKw(text) }); ui.open[it.id] = true; }
            all(); return true;
          },
        });
      }
      function remove(q) {
        saveNotes(); const a = cur(); const at = a.interview.indexOf(q); const keep = JSON.parse(JSON.stringify(q)); const acct = acctId();
        App.store.removeAppItem(appId, 'interview', q.id); all();
        App.ui.toast('질문을 지웠어요', { action: '되돌리기', onAction: () => { const b = cur(); if (!b || acctId() !== acct) return; const list = b.interview.slice(); list.splice(at, 0, keep); App.store.updateApp(appId, { interview: list }); if (alive) all(); } });
      }

      const onClick = (ev) => {
        const b = ev.target.closest('[data-iv]'); if (!b) return; const row = b.closest('[data-iv-item]'); const q = row && find(row.dataset.ivItem);
        switch (b.dataset.iv) {
          case 'suggest': suggest(); break;
          case 'add': openQuestion(null); break;
          case 'toggle': saveNotes(); ui.open[q.id] = !ui.open[q.id]; draw(); focusOn(q.id, '.iv-main'); break;
          case 'edit': openQuestion(q); break;
          case 'del': remove(q); break;
          default: break;
        }
      };
      const onChange = (ev) => {
        const t = ev.target;
        if (t.dataset.ivCheck) { put(t.dataset.ivCheck, { checked: t.checked }); all(); focusOn(t.dataset.ivCheck, '[data-iv-check]'); }
        else if (t.dataset.ivCard) { put(t.dataset.ivCard, { expId: t.value || null }); draw(); focusOn(t.dataset.ivCard, 'select'); }
      };
      const onBlur = (ev) => { if (ev.target.matches('[data-iv-note]')) saveNotes(); };
      el.addEventListener('click', onClick); el.addEventListener('change', onChange); el.addEventListener('focusout', onBlur);
      window.addEventListener('beforeunload', saveNotes);
      return () => { saveNotes(); alive = false; ui.loading = false; window.removeEventListener('beforeunload', saveNotes); };
    },
  };
})(window.App);
