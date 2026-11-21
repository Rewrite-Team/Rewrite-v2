/* 대화 기록 — #/chat?thread=<threadId>
   AI와 나눈 모든 대화(state.threads)를 원문 그대로 보여 주는 채팅방.
   경험에 반영된 대화도, 아직 대화에만 보관 중인 대화도 여기 있다. 보관 중인 대화는 그 자리에서 경험으로 정리할 수 있다. */
(function (App) {
  const esc = (s) => App.ui.esc(s);
  const FILTER_KEY = 'rewrite-chat-filter';
  const FILTERS = [['all', '전체'], ['kept', '보관 중'], ['applied', '경험에 반영']];

  function loadFilter() {
    try {
      const v = JSON.parse(localStorage.getItem(FILTER_KEY) || 'null');
      if (v && (FILTERS.some(([k]) => k === v.kind) || (v.kind === 'project' && v.projectId))) return { kind: v.kind, projectId: v.projectId || '' };
    } catch (e) { /* ignore */ }
    return { kind: 'all', projectId: '' };
  }
  function saveFilter(f) { try { localStorage.setItem(FILTER_KEY, JSON.stringify(f)); } catch (e) { /* ignore */ } }

  const isApplied = (t) => (t.outcome || {}).kind === 'applied';
  function allThreads() { return App.wiki.threadsFor(); } // 오래된 것부터
  function counts() {
    const all = allThreads();
    const applied = all.filter(isApplied).length;
    return { all: all.length, applied, kept: all.length - applied };
  }
  // '보관 중' = 아직 경험에 반영되지 않은 대화 (대화에 보관 + 정리 전)
  function filtered(f) {
    const all = allThreads();
    if (f.kind === 'kept') return all.filter((t) => !isApplied(t));
    if (f.kind === 'applied') return all.filter(isApplied);
    if (f.kind === 'project') return all.filter((t) => t.projectId === f.projectId);
    return all;
  }

  function countsHTML() {
    const c = counts();
    return `<span>전체 <b>${c.all}</b></span><span class="ch-dot">·</span><span>경험에 반영 <b>${c.applied}</b></span><span class="ch-dot">·</span><span>보관 중 <b>${c.kept}</b></span>`;
  }
  function chipsHTML(f) {
    const projects = App.store.projects();
    return `${FILTERS.map(([k, l]) => `<button type="button" class="ch-chip ${f.kind === k ? 'is-on' : ''}" data-ch-filter="${k}">${l}</button>`).join('')}
      ${projects.length ? `<select class="ch-chip ch-proj ${f.kind === 'project' ? 'is-on' : ''}" data-ch-project aria-label="프로젝트별">
        <option value="">프로젝트별</option>
        ${projects.map((p) => `<option value="${esc(p.id)}" ${f.kind === 'project' && f.projectId === p.id ? 'selected' : ''}>▤ ${esc(App.store.projectName(p))}</option>`).join('')}
      </select>` : ''}`;
  }
  function bodyHTML(f, highlight) {
    if (!allThreads().length) {
      return `<div class="empty ch-empty"><div class="big">💬</div><p>아직 AI와 나눈 대화가 없어요.</p><p class="subtle">아래 입력창에 무엇이든 적어 보세요. 오늘의 질문에 답한 대화도 여기에 쌓여요.</p></div>`;
    }
    const list = filtered(f);
    if (!list.length) return '<div class="empty ch-empty"><p>이 조건에 맞는 대화가 없어요.</p></div>';
    return App.talk.roomHTML(list, { organize: true, highlight });
  }

  App.screens.chat = {
    title: '대화 기록',
    render(params) {
      const f = loadFilter();
      return `<div class="page ch-page">
        <div class="page-head ch-head">
          <h1>대화 기록</h1>
          <p>AI와 나눈 대화가 원문 그대로 남아요. 경험에 반영된 대화도, 아직 보관 중인 대화도 여기 있어요.</p>
          <div class="ch-counts" data-ch-counts>${countsHTML()}</div>
        </div>
        <div class="ch-filters" data-ch-filters>${chipsHTML(f)}</div>
        <section class="card ch-room">
          <div class="ch-body" data-ch-body>${bodyHTML(f, params.thread)}</div>
          <div class="ch-composer" data-ch-composer></div>
        </section>
      </div>`;
    },
    mount(root, params) {
      const $ = (s) => root.querySelector(s);
      const bodyEl = $('[data-ch-body]');
      let f = loadFilter();
      let highlight = params.thread || null;
      let org = null; // { id, ctl, wrap }
      let composer = null;

      // 링크로 온 대화가 지금 필터에 없으면 이번에만 '전체'로 보여 준다 (저장하지 않음)
      if (highlight && !filtered(f).some((t) => t.id === highlight) && App.wiki.getThread(highlight)) {
        f = { kind: 'all', projectId: '' };
        $('[data-ch-filters]').innerHTML = chipsHTML(f);
        bodyEl.innerHTML = bodyHTML(f, highlight);
      }

      function closeOrg() { if (org) { try { org.ctl && org.ctl.destroy(); } catch (e) { /* ignore */ } org = null; } }
      function scrollTo(id) {
        const el = id && bodyEl.querySelector(`[data-thread="${CSS && CSS.escape ? CSS.escape(id) : id}"]`);
        if (el) bodyEl.scrollTop = Math.max(0, el.offsetTop - 24);
        else bodyEl.scrollTop = bodyEl.scrollHeight;
      }
      function refreshHead() {
        $('[data-ch-counts]').innerHTML = countsHTML();
        $('[data-ch-filters]').innerHTML = chipsHTML(f);
        bindFilters();
      }
      function renderBody(scrollId) {
        closeOrg();
        bodyEl.innerHTML = bodyHTML(f, highlight);
        refreshHead();
        scrollTo(scrollId);
      }

      // ---------- 필터 ----------
      function bindFilters() {
        root.querySelectorAll('[data-ch-filter]').forEach((b) => b.onclick = () => {
          f = { kind: b.dataset.chFilter, projectId: '' }; saveFilter(f); highlight = null; renderBody();
        });
        const sel = $('[data-ch-project]');
        if (sel) sel.onchange = () => {
          f = sel.value ? { kind: 'project', projectId: sel.value } : { kind: 'all', projectId: '' };
          saveFilter(f); highlight = null; renderBody();
        };
      }

      // ---------- 보관된 대화를 그 자리에서 정리 ----------
      function openOrg(threadId) {
        const wasOpen = org && org.id;
        closeOrg();
        bodyEl.querySelectorAll('.ch-org').forEach((x) => x.remove());
        if (wasOpen === threadId) return; // 같은 버튼 다시 누르면 닫기
        const th = bodyEl.querySelector(`[data-thread="${threadId}"]`); if (!th) return;
        const wrap = document.createElement('div');
        wrap.className = 'ch-org';
        wrap.innerHTML = '<div class="ch-org-head"><span>경험으로 정리</span><button type="button" class="btn btn-ghost btn-sm" data-ch-org-close aria-label="닫기">✕</button></div><div class="ch-org-slot"></div>';
        th.after(wrap);
        const close = () => { closeOrg(); renderBody(threadId); };
        wrap.querySelector('[data-ch-org-close]').onclick = close; // 정리 중에 오간 말도 대화에 남으므로 다시 그린다
        org = { id: threadId, wrap, ctl: null };
        org.ctl = App.talk.organize(wrap.querySelector('.ch-org-slot'), threadId, {
          noAutofocus: true,
          onDone: () => {
            // 대화와 결과 칩을 새로 그리되, 열려 있는 정리 대화(결과 보고)는 유지한다
            const t = App.wiki.getThread(threadId);
            const fresh = document.createElement('div');
            fresh.innerHTML = App.talk.roomHTML([t], { organize: true, highlight });
            const nt = fresh.querySelector('.tk-thread');
            const old = bodyEl.querySelector(`[data-thread="${threadId}"]`);
            if (nt && old) { nt.querySelectorAll('[data-room-organize]').forEach((b) => b.remove()); old.replaceWith(nt); }
            $('[data-ch-counts]').innerHTML = countsHTML();
          },
          next: { label: '닫기', onClick: close },
        });
        wrap.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
      bodyEl.addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-room-organize]');
        if (b && bodyEl.contains(b)) { ev.preventDefault(); openOrg(b.dataset.roomOrganize); }
      });

      // ---------- 아래 입력창 ----------
      const composerEl = $('[data-ch-composer]');
      function mountComposer(focus) {
        if (composer) { try { composer.destroy(); } catch (e) { /* ignore */ } }
        composer = App.talk.mount(composerEl, {
          ask: { text: '무엇이든 기록해 두세요. 어디에 넣을지는 같이 정해요.' },
          src: { type: 'manual', question: '(직접 기록)' },
          thread: { source: 'capture' },
          room: false,
          noAutofocus: !focus,
          onDone: () => {
            const id = composer && composer.threadId;
            // 새 대화가 보이도록 필터가 가리면 전체로
            if (id && !filtered(f).some((t) => t.id === id)) { f = { kind: 'all', projectId: '' }; saveFilter(f); }
            highlight = id || highlight;
            renderBody(id);
          },
          next: { label: '새 대화', onClick: () => mountComposer(true) },
        });
      }
      mountComposer(false);

      bindFilters();
      // 첫 화면: 링크로 온 대화가 있으면 그 대화로, 없으면 맨 아래(가장 최근)로
      requestAnimationFrame(() => scrollTo(highlight));

      return () => { closeOrg(); if (composer) { try { composer.destroy(); } catch (e) { /* ignore */ } } };
    },
  };
})(window.App);
