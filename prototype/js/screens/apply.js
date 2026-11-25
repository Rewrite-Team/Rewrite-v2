/* 지원 기업 — #/apply (보드), #/apply/:id[/:tab] (기업 화면: 공고 overview / 자소서 essay / 면접 준비 interview)
   자소서·면접 준비 탭은 App.applyTabs.<tab> = { label, render(app), mount(el, app, ctx) → cleanup } 로 다른 파일이 제공한다.
   ctx = { refresh() 화면 전체, refreshHead() 머리와 탭만 } */
(function (App) {
  const esc = (s) => App.ui.esc(s);
  const I = (n, s) => App.icon(n, s);
  App.applyTabs = App.applyTabs || {};

  const STATUS = { preparing: '지원 준비중', applied: '지원 완료', passed: '합격', failed: '불합격' };
  const STATUS_ORDER = ['preparing', 'applied', 'passed', 'failed'];
  const TAB_ORDER = ['overview', 'essay', 'interview'];
  const normTab = (t) => (TAB_ORDER.includes(t) ? t : 'overview');
  const hrefOf = (id, tab) => `#/apply/${encodeURIComponent(id)}${tab ? '/' + tab : ''}`;

  /* ---------- 채용공고 링크 ---------- */
  // 주소로 쓸 수 있으면 정리한 주소, 아니면 ''
  function cleanUrl(text) {
    const s = String(text || '').trim(); if (!s) return '';
    try {
      const u = new URL(/^[a-z][a-z\d+.-]*:/i.test(s) && !/^[^/]+:\d/.test(s) ? s : 'https://' + s);
      return /^https?:$/.test(u.protocol) && /\.[^.]/.test(u.hostname) ? u.href : '';
    } catch (e) { return ''; }
  }
  const hostOf = (url) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };
  function urlForm(value, opts = {}) {
    return `<form class="ap-urlform" data-ap-urlform novalidate>
      <div class="row"><div class="input-icon">${I('link', 16)}<input class="input" name="url" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="채용공고 링크" placeholder="채용공고 주소를 붙여 넣어 주세요" value="${esc(value || '')}"></div>
        <button class="btn">저장</button>${opts.cancel ? '<button type="button" class="btn btn-ghost" data-act="url-cancel">취소</button>' : ''}</div>
      <p class="field-error" role="alert" hidden>${I('warning', 15)}주소를 확인해 주세요.</p></form>`;
  }
  // 저장했으면 true. 빈칸으로 저장하면 링크를 지운다
  function saveUrl(form, id) {
    const raw = form.elements.url.value.trim(); const url = cleanUrl(raw);
    const bad = !!raw && !url; form.querySelector('.field-error').hidden = !bad; form.elements.url.setAttribute('aria-invalid', String(bad));
    if (bad) { form.elements.url.focus(); return false; }
    App.store.updateApp(id, { url }); App.ui.toast(url ? '채용공고 링크를 저장했어요' : '채용공고 링크를 지웠어요'); return true;
  }

  /* ---------- 마감 ---------- */
  // 지원 준비중일 때만 의미가 있다
  function dday(a) {
    if (a.status !== 'preparing' || !a.deadline) return '';
    const n = Math.round((App.store.parseDay(a.deadline) - App.store.parseDay(App.store.localDay())) / 86400000);
    const [text, lv] = n < 0 ? ['마감 지남', ''] : n === 0 ? ['오늘 마감', 'urgent'] : [`D-${n}`, n <= 3 ? 'urgent' : ''];
    return `<span class="ap-dday" data-lv="${lv}">${text}</span>`;
  }
  const countText = (done, total) => (total ? `${done}/${total}` : '');

  /* ---------- 보드 ---------- */
  function appCard(a) {
    const r = App.ai.readiness(a); const url = cleanUrl(a.url); const name = esc(a.company || '이름 없는 기업');
    return `<article class="card ap-card" data-href="${hrefOf(a.id)}" data-id="${esc(a.id)}">
      <div class="ap-card-top"><a class="ap-card-co" href="${hrefOf(a.id)}" draggable="false">${name}</a>${dday(a)}
        <div class="menu"><button type="button" class="icon-btn" aria-haspopup="menu" aria-expanded="false" aria-label="${name} 더 보기">${I('more')}</button>
          <div class="menu-list"><span class="ap-menu-label">상태 바꾸기</span>
            ${STATUS_ORDER.map((s) => `<button type="button" data-move="${s}" ${s === a.status ? 'aria-current="true"' : ''}><span class="dot" data-status="${s}"></span>${STATUS[s]}${s === a.status ? I('check', 16) : ''}</button>`).join('')}
            <hr><button type="button" class="is-danger" data-act="trash">${I('trash', 16)}휴지통으로 옮기기</button></div></div></div>
      <div class="ap-card-job">${esc(a.job)}</div>
      ${r.essaysTotal || url ? `<div class="ap-card-foot"><span class="subtle">${r.essaysTotal ? `자소서 ${r.essaysDone}/${r.essaysTotal}` : ''}</span>
        ${url ? `<a class="icon-btn" href="${esc(url)}" target="_blank" rel="noopener" draggable="false" title="채용공고" aria-label="${name} 채용공고 새 창에서 열기">${I('external', 16)}</a>` : ''}</div>` : ''}</article>`;
  }
  function renderBoard() {
    const apps = App.store.apps(); const add = `<button type="button" class="btn btn-primary" data-act="add">${I('plus', 16)}지원 기업 추가</button>`;
    if (!apps.length) return `<div class="page"><header class="page-head"><h1>지원 기업</h1></header>
      <div class="empty"><div class="empty-title">아직 지원 기업이 없어요</div><p>기업마다 채용공고, 자소서, 면접 준비를 모아 둘 수 있어요.</p>${add}</div></div>`;
    return `<div class="page"><header class="page-head"><h1>지원 기업</h1><div class="page-head-actions">${add}</div></header>
      <div class="ap-board" id="ap-board">${STATUS_ORDER.map((st) => {
        const list = apps.filter((a) => a.status === st);
        return `<section class="ap-col ${list.length ? '' : 'is-empty'}" aria-label="${STATUS[st]}">
          <h2 class="ap-col-head"><span class="dot" data-status="${st}"></span>${STATUS[st]}<span class="count">${list.length}</span></h2>
          <div class="ap-col-body" data-drop="${st}">${list.map(appCard).join('')}</div></section>`;
      }).join('')}</div></div>`;
  }
  function moveTo(a, status) {
    if (!a || a.status === status) return;
    App.store.moveApp(a.id, status, App.store.apps().filter((x) => x.status === status && x.id !== a.id).map((x) => x.id).concat(a.id));
    movedToast(a, status); App.rerender();
  }
  const movedToast = (a, status) => App.ui.toast(status === 'passed' ? `${a.company} 합격을 축하해요` : `${a.company} 상태를 ‘${STATUS[status]}’${status === 'applied' ? '로' : '으로'} 바꿨어요`);
  function trashApp(id) { const t = App.store.removeApp(id); if (location.hash === '#/apply') App.rerender(); else App.navigate('#/apply'); App.ui.trashed(t); }

  // 마우스로 끌어서 옮기기 (터치·키보드는 카드의 ⋯ 메뉴)
  function mountBoard(root) {
    let pending = null; let drag = null; let suppress = false; let raf = 0;
    const onClick = (ev) => {
      if (suppress) { ev.stopPropagation(); ev.preventDefault(); return; }
      const b = ev.target.closest('[data-act], [data-move]'); if (!b) return;
      if (b.dataset.act === 'add') { openAppModal(null); return; }
      const card = b.closest('.ap-card'); const a = card && App.store.getApp(card.dataset.id); if (!a) return;
      if (b.dataset.act === 'trash') { trashApp(a.id); return; }
      moveTo(a, b.dataset.move);
      const btn = document.querySelector(`.ap-card[data-id="${CSS.escape(a.id)}"] .menu > button`); if (btn) btn.focus();
    };
    const start = (card, ev) => {
      const r = card.getBoundingClientRect(); const ghost = card.cloneNode(true);
      ghost.classList.add('ap-ghost'); Object.assign(ghost.style, { width: r.width + 'px', left: r.left + 'px', top: r.top + 'px' });
      document.body.appendChild(ghost); card.classList.add('is-dragging');
      drag = { card, ghost, from: card.closest('[data-drop]').dataset.drop, ox: r.left, oy: r.top, sx: ev.clientX, sy: ev.clientY, x: 0, y: 0 };
      root.querySelector('#ap-board').classList.add('is-dragging'); move(ev); scrollNear();
    };
    const move = (ev) => {
      drag.x = ev.clientX; drag.y = ev.clientY;
      drag.ghost.style.transform = `translate(${ev.clientX - drag.sx}px, ${ev.clientY - drag.sy}px)`;
      const hit = document.elementFromPoint(ev.clientX, ev.clientY); const colEl = hit && hit.closest('.ap-col'); const col = colEl && colEl.querySelector('[data-drop]');
      root.querySelectorAll('.ap-col').forEach((c) => c.classList.toggle('is-over', c === colEl));
      if (!col) return;
      const after = [...col.querySelectorAll('.ap-card')].find((c) => { if (c === drag.card) return false; const b = c.getBoundingClientRect(); return ev.clientY < b.top + b.height / 2; }) || null;
      if (drag.card.parentElement !== col || drag.card.nextElementSibling !== after) col.insertBefore(drag.card, after);
    };
    const scrollNear = () => { if (!drag) return; if (drag.y < 70) window.scrollBy(0, -12); else if (drag.y > window.innerHeight - 70) window.scrollBy(0, 12); raf = requestAnimationFrame(scrollNear); };
    const end = (cancel) => {
      const d = drag; drag = null; cancelAnimationFrame(raf); d.ghost.remove(); suppress = true; setTimeout(() => { suppress = false; }, 0);
      const col = d.card.closest('[data-drop]'); const to = col.dataset.drop; const a = App.store.getApp(d.card.dataset.id);
      if (!cancel && a) { App.store.moveApp(a.id, to, [...col.querySelectorAll('.ap-card')].map((c) => c.dataset.id)); if (to !== d.from) movedToast(a, to); }
      setTimeout(App.rerender, 0);
    };
    const onDown = (ev) => {
      const card = ev.target.closest('.ap-card');
      if (!card || ev.button > 0 || ev.pointerType === 'touch' || ev.target.closest('button, .menu, .icon-btn')) return;
      pending = { card, x: ev.clientX, y: ev.clientY };
    };
    const onMove = (ev) => {
      if (drag) { ev.preventDefault(); move(ev); return; }
      if (pending && Math.hypot(ev.clientX - pending.x, ev.clientY - pending.y) > 6) { const c = pending.card; pending = null; start(c, ev); }
    };
    const onUp = () => { pending = null; if (drag) end(false); };
    const onCancel = () => { pending = null; if (drag) end(true); };
    const onKey = (ev) => { if (ev.key === 'Escape' && drag) end(true); };
    root.addEventListener('click', onClick, true); root.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove, { passive: false }); window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', onCancel);
    document.addEventListener('keydown', onKey);
    return () => {
      if (drag) { drag.ghost.remove(); drag = null; } cancelAnimationFrame(raf);
      root.removeEventListener('click', onClick, true); root.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onCancel);
      document.removeEventListener('keydown', onKey);
    };
  }

  /* ---------- 추가 / 정보 수정 모달 ---------- */
  function openAppModal(a) {
    const field = (id, label, attrs, error) => `<div class="field"><label class="label" for="ap-f-${id}">${label}</label><input class="input" id="ap-f-${id}" ${attrs}>${error ? `<p class="field-error" data-err="${id}" role="alert" hidden>${I('warning', 15)}${error}</p>` : ''}</div>`;
    const v = a || { company: '', job: '', deadline: '', url: '' };
    App.ui.modal({
      title: a ? '정보 수정' : '지원 기업 추가', confirmText: a ? '저장' : '추가',
      body: `${field('company', '회사', `maxlength="40" autocomplete="off" value="${esc(v.company)}"`, '회사 이름을 적어 주세요.')}
        ${field('job', '직무', `maxlength="50" autocomplete="off" value="${esc(v.job)}"`, '직무를 적어 주세요.')}
        ${field('deadline', '마감일', `type="date" value="${esc(v.deadline)}"`)}
        ${field('url', '채용공고 링크', `inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="https://" value="${esc(v.url)}"`, '주소를 확인해 주세요.')}
        ${a ? '' : '<div class="field"><label class="label" for="ap-f-jd">공고 내용 <span class="subtle">선택</span></label><textarea class="textarea" id="ap-f-jd" rows="4" placeholder="주요 업무, 자격 요건, 우대 사항"></textarea></div>'}`,
      onConfirm(root) {
        const el = (k) => root.querySelector('#ap-f-' + k); const val = (k) => el(k).value.trim();
        const url = cleanUrl(val('url'));
        const bad = { company: !val('company'), job: !val('job'), url: !!val('url') && !url };
        Object.keys(bad).forEach((k) => { el(k).setAttribute('aria-invalid', String(bad[k])); root.querySelector(`[data-err="${k}"]`).hidden = !bad[k]; });
        const first = Object.keys(bad).find((k) => bad[k]); if (first) { el(first).focus(); return false; }
        const data = { company: val('company'), job: val('job'), deadline: val('deadline'), url };
        if (a) { App.store.updateApp(a.id, data); App.ui.toast('저장했어요'); App.rerender(); return true; }
        const made = App.store.createApp(Object.assign(data, { jdText: val('jd') }));
        App.ui.toast('지원 기업을 추가했어요'); App.navigate(hrefOf(made.id)); return true;
      },
    });
  }

  /* ---------- 기업 화면 ---------- */
  function headHtml(a, tab, adding) {
    const url = cleanUrl(a.url); const d = dday(a); const r = App.ai.readiness(a);
    const n = { essay: countText(r.essaysDone, r.essaysTotal), interview: countText(r.interviewDone, r.interviewTotal) };
    const link = url && !adding ? `<span class="ap-posting-set"><a class="btn ap-posting" href="${esc(url)}" target="_blank" rel="noopener">${I('external', 16)}채용공고<span class="ap-host">${esc(hostOf(url))}</span><span class="sr-only">새 창에서 열기</span></a><button type="button" class="icon-btn" data-act="url-add" aria-label="채용공고 링크 고치기">${I('edit', 16)}</button></span>`
      : adding ? urlForm(a.url, { cancel: true }) : tab === 'overview' ? '' : `<button type="button" class="btn" data-act="url-add">${I('plus', 16)}채용공고 링크 추가</button>`;
    return `<header class="page-head ap-head"><div><h1>${esc(a.company || '이름 없는 기업')}</h1>
        <div class="meta">${a.job ? `<span>${esc(a.job)}</span>` : ''}${a.deadline ? `<span>${I('calendar', 15)}${esc(App.ui.date(a.deadline))} 마감</span>` : ''}${d}</div></div>
      <div class="page-head-actions">${link}
        <select class="select ap-status" data-act="status" aria-label="지원 상태">${STATUS_ORDER.map((s) => `<option value="${s}" ${a.status === s ? 'selected' : ''}>${STATUS[s]}</option>`).join('')}</select>
        <div class="menu"><button type="button" class="icon-btn" aria-haspopup="menu" aria-expanded="false" aria-label="더 보기">${I('more')}</button>
          <div class="menu-list"><button type="button" data-act="edit">${I('edit', 16)}정보 수정</button><hr><button type="button" class="is-danger" data-act="trash">${I('trash', 16)}휴지통으로 옮기기</button></div></div>
      </div></header>
      <div class="tabs" role="tablist">${TAB_ORDER.map((t) => `<a class="tab ${t === tab ? 'is-on' : ''}" role="tab" aria-selected="${t === tab}" href="${hrefOf(a.id, t)}">${esc(App.applyTabs[t].label)}${n[t] ? ` <span class="count">${n[t]}</span>` : ''}</a>`).join('')}</div>`;
  }
  function renderDetail(params) {
    const a = App.store.getApp(params.id);
    const t = !a && App.store.trash().find((x) => x.type === 'app' && x.data.applications[0].id === params.id);
    if (t) return `<div class="page"><div class="empty"><div class="empty-title">휴지통에 있는 지원 기업이에요</div><p>${esc(t.title)}</p><button type="button" class="btn btn-primary" data-restore="${esc(t.id)}">복원</button></div></div>`;
    if (!a) return `<div class="page"><div class="empty"><div class="empty-title">지원 기업을 찾을 수 없어요</div><a class="btn" href="#/apply">지원 기업 보기</a></div></div>`;
    const tab = normTab(params.tab);
    return `<div class="page ap-page" data-tab="${tab}"><div id="ap-head">${headHtml(a, tab)}</div><div id="ap-body">${App.applyTabs[tab].render(a)}</div></div>`;
  }
  function mountDetail(root, params) {
    const id = params.id; const tab = normTab(params.tab); const T = App.applyTabs[tab];
    if (!App.store.getApp(id)) { const b = root.querySelector('[data-restore]'); if (b) b.onclick = () => { if (App.store.restore(b.dataset.restore)) { App.rerender(); App.ui.toast('복원했어요'); } }; return null; }
    const head = root.querySelector('#ap-head'); let body = root.querySelector('#ap-body'); let off = null; let adding = false;
    const ctx = {
      refreshHead() { const a = App.store.getApp(id); if (!a || !head.isConnected) return; const u = head.querySelector('[name=url]'); const typed = u && u.value; const had = u && document.activeElement === u; head.innerHTML = headHtml(a, tab, adding); const n = head.querySelector('[name=url]'); if (n && u) { n.value = typed; if (had) n.focus(); } },
      refresh() {
        const a = App.store.getApp(id); if (!a || !head.isConnected) return;
        if (off) off(); ctx.refreshHead();
        const fresh = document.createElement('div'); fresh.id = 'ap-body'; fresh.innerHTML = T.render(a); body.replaceWith(fresh); body = fresh;
        off = T.mount(body, a, ctx) || null;
      },
    };
    head.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-act]'); const a = b && App.store.getApp(id); if (!a) return;
      const act = b.dataset.act;
      if (act === 'url-add') { adding = true; ctx.refreshHead(); head.querySelector('[name=url]').focus(); }
      else if (act === 'url-cancel') { adding = false; ctx.refreshHead(); }
      else if (act === 'edit') openAppModal(a);
      else if (act === 'trash') trashApp(id);
    });
    head.addEventListener('submit', (ev) => { ev.preventDefault(); if (saveUrl(ev.target, id)) { adding = false; if (tab === 'overview') ctx.refresh(); else ctx.refreshHead(); } });
    head.addEventListener('change', (ev) => {
      if (ev.target.dataset.act !== 'status') return;
      const a = App.store.getApp(id); const st = ev.target.value; moveTo(a, st);
      const sel = document.querySelector('.ap-status'); if (sel) sel.focus();
    });
    off = T.mount(body, App.store.getApp(id), ctx) || null;
    return () => { if (off) off(); };
  }

  /* ---------- 공고 탭 ---------- */
  // 글머리표가 있는 줄은 목록으로
  function jdHtml(text) {
    const out = []; let li = [];
    const flush = () => { if (li.length) out.push(`<ul>${li.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`); li = []; };
    String(text).split('\n').forEach((raw) => {
      const s = raw.trim(); const m = s.match(/^(?:[•·▪◦*-])\s*(.+)$/);
      if (m) li.push(m[1]); else { flush(); if (s) out.push(`<p>${esc(s)}</p>`); }
    });
    flush(); return out.join('');
  }
  function todoHtml(a) {
    const r = App.ai.readiness(a); const items = [];
    const row = (tab, icon, text) => `<a class="list-row" href="${hrefOf(a.id, tab)}">${I(icon)}<span class="list-row-main">${text}</span>${I('chevron-right', 16)}</a>`;
    if (!r.essaysTotal) items.push(row('essay', 'edit', '자소서 문항 추가하기'));
    else if (r.essaysDone < r.essaysTotal) items.push(row('essay', 'edit', `쓰지 않은 자소서 ${r.essaysTotal - r.essaysDone}개`));
    if (!r.interviewTotal) items.push(row('interview', 'chat', '예상 면접 질문 받기'));
    else if (r.interviewDone < r.interviewTotal) items.push(row('interview', 'chat', `준비할 면접 질문 ${r.interviewTotal - r.interviewDone}개`));
    return items.length ? `<section><h2 class="section-title">할 일</h2><div class="list">${items.join('')}</div></section>` : '';
  }
  App.applyTabs.overview = {
    label: '공고',
    render(a, ui = {}) {
      const url = cleanUrl(a.url);
      return `<div class="split">
        <div>
          ${url ? '' : `<section class="ap-link"><h2 class="section-title">채용공고 링크</h2>${urlForm('', {})}</section>`}
          <section class="section"><h2 class="section-title">공고 내용${a.jdText && !ui.jd ? `<button type="button" class="icon-btn" data-ov="jd-edit" aria-label="공고 내용 고치기">${I('edit', 16)}</button>` : ''}</h2>
            ${a.jdText && !ui.jd ? `<div class="ap-jd">${jdHtml(a.jdText)}</div>`
              : `<textarea class="textarea" data-ov-jd rows="10" aria-label="공고 내용" placeholder="주요 업무, 자격 요건, 우대 사항을 붙여 넣어 주세요.">${esc(a.jdText)}</textarea><div class="row ap-jd-foot"><button type="button" class="btn" data-ov="jd-save">저장</button>${a.jdText ? '<button type="button" class="btn btn-ghost" data-ov="jd-cancel">취소</button>' : ''}</div>`}</section>
        </div>
        <div class="split-side ap-side">${todoHtml(a)}
          <section><h2 class="section-title"><label for="ap-memo">메모</label><span class="count" role="status" data-ov-saved></span></h2>
            <textarea class="textarea" id="ap-memo" rows="5" placeholder="면접 일정, 회사 조사">${esc(a.memo)}</textarea></section></div>
      </div>`;
    },
    mount(el, app, ctx) {
      const id = app.id; const ui = {}; let timer = null;
      const cur = () => App.store.getApp(id);
      const draw = () => {
        flush(); const typed = ['[data-ov-jd]', '[name=url]'].map((q) => [q, (el.querySelector(q) || {}).value]);
        el.innerHTML = App.applyTabs.overview.render(cur(), ui);
        typed.forEach(([q, v]) => { const t = el.querySelector(q); if (t && v != null) t.value = v; }); // 쓰던 글은 남긴다
      };
      // 메모: 쉬면 저장
      const flush = () => {
        clearTimeout(timer); timer = null; const ta = el.querySelector('#ap-memo'); const a = cur(); if (!ta || !a || (a.memo || '') === ta.value) return;
        App.store.updateApp(id, { memo: ta.value }); el.querySelector('[data-ov-saved]').textContent = '저장됨';
      };
      const saveJd = () => { const ta = el.querySelector('[data-ov-jd]'); const a = cur(); if (ta && a && (a.jdText || '') !== ta.value.trim()) App.store.updateApp(id, { jdText: ta.value.trim() }); };
      el.addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-ov]'); if (!b) return; const k = b.dataset.ov;
        if (k === 'jd-edit') { ui.jd = true; draw(); el.querySelector('[data-ov-jd]').focus(); }
        else if (k === 'jd-cancel') { ui.jd = false; draw(); }
        else if (k === 'jd-save') { const t = el.querySelector('[data-ov-jd]'); if (!t.value.trim() && !cur().jdText) { t.focus(); return; } saveJd(); ui.jd = false; draw(); App.ui.toast('공고 내용을 저장했어요'); }
      });
      el.addEventListener('submit', (ev) => { ev.preventDefault(); if (saveUrl(ev.target, id)) { draw(); ctx.refreshHead(); } });
      el.addEventListener('input', (ev) => { if (ev.target.id !== 'ap-memo') return; el.querySelector('[data-ov-saved]').textContent = ''; clearTimeout(timer); timer = setTimeout(flush, 600); });
      el.addEventListener('focusout', (ev) => { if (ev.target.id === 'ap-memo') flush(); });
      const leave = () => { flush(); if (cur()) saveJd(); };
      window.addEventListener('beforeunload', leave);
      // 공고 내용을 쓰다가 다른 탭으로 가도 쓴 글은 남긴다
      return () => { leave(); window.removeEventListener('beforeunload', leave); };
    },
  };

  /* ---------- 자소서·면접 준비 탭 공용 ---------- */
  // 특정 역량을 묻지 않는 문항
  const OPEN_Q = /지원\s*동기|지원한\s*이유|지원하게\s*된|지원하신|왜.*지원|입사\s*후|포부|이루고\s*싶은|자기\s*소개|성장\s*과정|장단점|장점|단점|가치관/;
  App.applyUtil = {
    isOpen: (text) => OPEN_Q.test(text),
    // 문항 → 핵심 역량. 역량을 묻지 않는 문항은 낱말이 실제로 걸린 역량만
    detectKw(text) {
      const t = String(text || '').trim(); if (!t) return [];
      const kws = App.ai.questionKeywords(t);
      return OPEN_Q.test(t) && !App.ai.extractKeywords(t).length && kws.join() === App.ai.questionKeywords('').join() ? [] : kws;
    },
    kwPicker(sel) { return `<div class="ap-kws" data-kwpick>${App.keywords.all().map((k) => `<button type="button" class="kw" data-kwpick-k="${esc(k.name)}" aria-pressed="${(sel || []).includes(k.name)}" title="${esc(k.desc)}">${esc(k.name)}</button>`).join('')}</div>`; },
    kwPicked(root) { return [...root.querySelectorAll('[data-kwpick-k][aria-pressed="true"]')].map((b) => b.dataset.kwpickK); },
    // 프로젝트 + 카드 제목. 휴지통에 있으면 흐리게
    cardRef(id) {
      const e = App.store.get(id);
      return e ? `<span class="ap-ref">${App.ui.projChip(e.projectId)}<span class="ap-ref-t">${esc(e.title)}</span></span>`
        : `<span class="ap-ref is-gone">${I('trash', 15)}${App.ui.goneCard(id)}</span>`;
    },
  };
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-kwpick-k]'); if (!b) return;
    const on = b.getAttribute('aria-pressed') === 'true';
    if (!on && b.parentElement.querySelectorAll('[aria-pressed="true"]').length >= 3) { App.ui.toast('역량은 3개까지 고를 수 있어요'); return; }
    b.setAttribute('aria-pressed', String(!on)); b.dispatchEvent(new CustomEvent('kwpick', { bubbles: true }));
  });

  /* ---------- 화면 등록 ---------- */
  App.screens.apply = {
    title(params) { if (!params || !params.id) return '지원 기업'; const a = App.store.getApp(params.id); return a ? a.company : '찾을 수 없음'; },
    crumb(params) { return params && params.id ? [{ label: '지원 기업', href: '#/apply' }] : []; },
    render(params) { return params && params.id ? renderDetail(params) : renderBoard(); },
    mount(root, params) { return params && params.id ? mountDetail(root, params) : mountBoard(root); },
  };
})(window.App);
