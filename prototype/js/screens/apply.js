/* 지원 기업 — #/apply (목록), #/apply/:id[/:tab] (상세: 개요 / 역량 맵 / 자소서 / 면접 준비)
   역량 맵·자소서·면접 준비 탭은 App.applyTabs.<tab> = { label, render(app), mount(el, app, ctx) } 로 다른 파일이 제공한다.
   ctx = { refresh(), isActive(), goTab(tab), params } */
(function (App) {
  const esc = (s) => App.ui.esc(s);
  App.applyTabs = App.applyTabs || {};

  const STATUS = {
    preparing: { label: '지원 준비중', hint: '역량 정리 · 자소서 작성', empty: '지원할 기업을 추가해 보세요' },
    applied: { label: '지원 완료', hint: '결과 대기 · 면접 준비', empty: '지원을 마친 기업을 여기로 옮겨요' },
    passed: { label: '합격', hint: '축하해요!', empty: '합격한 기업을 여기로 옮겨요' },
    failed: { label: '불합격', hint: '다음 지원의 밑거름', empty: '결과가 아쉬운 기업은 여기로' },
  };
  const STATUS_ORDER = ['preparing', 'applied', 'passed', 'failed'];
  const TAB_ORDER = ['overview', 'competency', 'essay', 'interview'];
  const TAB_LABEL = { overview: '개요', competency: '역량 맵', essay: '자소서', interview: '면접 준비' };
  const normTab = (t) => (TAB_ORDER.includes(t) ? t : 'overview');
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const safeUrl = (u) => (/^https?:\/\//i.test(String(u || '').trim()) ? String(u).trim() : '');
  const prettyUrl = (u) => String(u).replace(/^https?:\/\//, '').replace(/\/$/, '');

  /* ---------- 날짜 ---------- */
  const toDate = (s) => { const [y, m, d] = String(s || '').split('-').map(Number); return new Date(y || 1970, (m || 1) - 1, d || 1); };
  const todayD = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
  const mdLabel = (s) => { const d = toDate(s); return `${d.getMonth() + 1}월 ${d.getDate()}일`; };
  // 지원 기업의 마감 표시. 지원 준비중일 때만 의미가 있음
  function dday(app) {
    if (!app || app.status !== 'preparing') return null;
    if (!app.deadline) return { text: '마감일 미정', cls: 'none', days: null };
    const n = Math.round((toDate(app.deadline) - todayD()) / 86400000);
    if (n < 0) return { text: '마감 지남', cls: 'past', days: n };
    if (n === 0) return { text: '오늘 마감', cls: 'urgent', days: 0 };
    return { text: `D-${n}`, cls: n <= 3 ? 'urgent' : n <= 7 ? 'soon' : '', days: n };
  }

  /* ---------- 공용 조각 ---------- */
  const statusPill = (s) => `<span class="ap-st" data-st="${esc(s)}"><i></i>${esc((STATUS[s] || STATUS.preparing).label)}</span>`;
  const ddayPill = (dd) => (dd ? `<span class="ap-dday" data-d="${dd.cls}">${esc(dd.text)}</span>` : '');
  const wdots = (w) => `<span class="ap-wdots" title="중요도 ${w}/3">${[1, 2, 3].map((n) => `<i class="${n <= w ? 'on' : ''}"></i>`).join('')}</span>`;
  const compChip = (c) => `<span class="kw ap-cchip" data-tone="${App.keywords.tone(c.name)}">#${esc(c.name)}${wdots(c.weight)}</span>`;
  function ring(score, size = 72) {
    const r = (size - 9) / 2; const c = 2 * Math.PI * r; const off = c * (1 - Math.max(0, Math.min(100, score)) / 100);
    const lv = score >= 80 ? 'hi' : score >= 40 ? 'mid' : 'lo';
    return `<div class="ap-ring" data-lv="${lv}" style="width:${size}px;height:${size}px" title="준비도 ${score}%">
      <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">
        <circle class="ap-ring-bg" cx="${size / 2}" cy="${size / 2}" r="${r}" />
        <circle class="ap-ring-fg" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}" transform="rotate(-90 ${size / 2} ${size / 2})" />
      </svg><div class="ap-ring-v"><b>${score}</b><span>%</span></div></div>`;
  }
  const readyCount = (r) => r.competencies.filter((c) => c.ready).length;

  /* ---------- 요구 역량 편집기 (추가 모달 · 개요 탭 공용) ---------- */
  function compRows(comps) {
    if (!comps.length) return '<div class="ap-comp-empty">아직 요구 역량이 없어요. 공고를 분석하거나 직접 추가해 주세요.</div>';
    return comps.map((c, i) => `<div class="ap-comp">
      <span class="kw" data-tone="${App.keywords.tone(c.name)}">#${esc(c.name)}</span>
      <span class="ap-stars" role="group" aria-label="중요도">${[1, 2, 3].map((n) => `<button type="button" class="ap-star ${n <= c.weight ? 'on' : ''}" data-act="weight" data-i="${i}" data-w="${n}" title="중요도 ${n}" aria-label="중요도 ${n}">★</button>`).join('')}</span>
      <input class="ap-reason" data-act="reason" data-i="${i}" value="${esc(c.reason || '')}" placeholder="왜 필요한 역량인지 (선택)" maxlength="80" />
      <button type="button" class="ap-x" data-act="remove-comp" data-i="${i}" aria-label="#${esc(c.name)} 빼기" title="빼기">×</button>
    </div>`).join('');
  }
  function compPicker(comps) {
    const have = comps.map((c) => c.name);
    const others = App.keywords.all().filter((k) => !have.includes(k.name));
    if (!others.length) return '<div class="ap-picker"><span class="subtle">모든 역량을 추가했어요.</span></div>';
    return `<div class="ap-picker">${others.map((k) => `<button type="button" class="ap-opt" data-tone="${k.tone}" data-act="add-comp" data-k="${esc(k.name)}" title="${esc(k.desc)}">＋ #${esc(k.name)}</button>`).join('')}</div>`;
  }
  // comps 배열을 직접 수정. 바뀌었으면 true
  function applyCompAction(comps, b) {
    const i = Number(b.dataset.i);
    switch (b.dataset.act) {
      case 'weight': if (comps[i]) { comps[i].weight = Number(b.dataset.w); return true; } break;
      case 'remove-comp': if (comps[i]) { comps.splice(i, 1); return true; } break;
      case 'add-comp': { const k = b.dataset.k; if (k && !comps.some((c) => c.name === k)) { comps.push({ name: k, weight: 2, reason: '' }); return true; } break; }
      default: break;
    }
    return false;
  }
  const sortComps = (comps) => comps.slice().sort((a, b) => b.weight - a.weight);

  /* ---------- 목록 ---------- */
  function appCard(a) {
    const r = App.ai.readiness(a); const comps = sortComps(a.competencies || []);
    return `<div class="card ap-card" data-href="#/apply/${esc(a.id)}" data-st="${esc(a.status)}" data-id="${esc(a.id)}" tabindex="0" aria-roledescription="끌어서 옮길 수 있는 카드">
      <div class="ap-card-top">${statusPill(a.status)}${ddayPill(dday(a))}</div>
      <div class="ap-card-id"><div class="ap-card-co">${esc(a.company || '이름 없는 기업')}</div><div class="ap-card-job">${esc(a.job || '직무 미입력')}</div></div>
      <div class="ap-card-kws">${comps.slice(0, 4).map(compChip).join('')}${comps.length > 4 ? `<span class="ap-more">+${comps.length - 4}</span>` : ''}
        ${comps.length ? '' : '<span class="subtle">요구 역량을 정리해 주세요</span>'}</div>
      <div class="ap-card-ready"><div class="ap-card-ready-row"><span>준비도</span><b>${r.score}%</b></div>${App.ui.progress(r.score)}</div>
      <div class="ap-card-counts">
        <span>역량 <b>${readyCount(r)}/${r.competencies.length}</b></span>
        <span>자소서 <b>${r.essaysDone}/${r.essaysTotal}</b> 연결</span>
        <span>면접 <b>${r.interviewDone}/${r.interviewTotal}</b> 준비</span>
      </div>
    </div>`;
  }
  function legacyBanner(q, apps) {
    const open = App.store.activeApps();
    return `<div class="ap-banner">
      <div class="ap-banner-ico">✎</div>
      <div class="ap-banner-body"><b>이 문항을 어느 기업 자소서에 추가할까요?</b>
        <span class="ap-banner-q">“${esc(q)}”</span>
        <div class="ap-banner-acts">${open.map((a) => `<button class="btn btn-sm" data-act="legacy-add" data-id="${esc(a.id)}">${esc(a.company)}<span class="subtle">${esc(a.job)}</span></button>`).join('')}
          ${open.length ? '' : '<span class="subtle">먼저 지원 기업을 추가해 주세요.</span>'}</div></div>
    </div>`;
  }
  function renderList(params) {
    const apps = App.store.apps();
    const active = App.store.activeApps();
    const soon = active.filter((a) => { const d = dday(a); return d && d.days != null && d.days >= 0 && d.days <= 7; }).length;
    const passed = apps.filter((a) => a.status === 'passed').length;
    const avg = active.length ? Math.round(active.reduce((s, a) => s + App.ai.readiness(a).score, 0) / active.length) : 0;
    return `<div class="page ap ap-page-board">
      <div class="page-head ap-head">
        <div><h1>지원 기업</h1><p>기업마다 원하는 역량도, 자소서 문항도, 면접 포인트도 달라요. 기업별로 따로 준비해요.</p></div>
        <button class="btn btn-primary" data-act="add">＋ 지원 기업 추가</button>
      </div>
      ${params && params.q ? legacyBanner(params.q, apps) : ''}
      ${apps.length ? `<div class="ap-stats">
        <div><b>${active.length}</b><span>진행 중인 지원</span></div>
        <div><b>${soon}</b><span>7일 안에 서류 마감</span></div>
        <div><b>${passed}</b><span>합격</span></div>
        <div><b>${avg}%</b><span>평균 준비도</span></div>
      </div>
      <div class="ap-board-hint subtle">카드를 끌어서 다른 칸으로 옮기면 상태가 바뀌어요. 칸 안에서 순서도 바꿀 수 있어요.<span class="ap-hint-touch"> 휴대폰에서는 카드를 길게 눌러 옮겨요.</span></div>` : ''}
      ${apps.length ? `<div class="ap-board" id="ap-board">${STATUS_ORDER.map((st) => {
        const list = apps.filter((a) => a.status === st);
        return `<section class="ap-col" data-st="${st}">
          <header class="ap-col-head"><span class="ap-gdot"></span><b>${STATUS[st].label}</b><span class="ap-col-n">${list.length}</span>
            <span class="ap-col-hint">${STATUS[st].hint}</span></header>
          <div class="ap-col-body" data-drop="${st}">
            ${list.map(appCard).join('')}
            <div class="ap-col-empty">${STATUS[st].empty}</div>
          </div>
          ${st === 'preparing' ? '<button class="ap-col-add" data-act="add">＋ 지원 기업 추가</button>' : ''}
        </section>`;
      }).join('')}</div>` : `<div class="card empty ap-empty"><div class="big">◎</div><div>아직 등록한 지원 기업이 없어요</div>
        <div class="subtle" style="margin:4px 0 16px">채용공고를 붙여 넣으면 그 기업이 원하는 역량을 정리해 드려요.</div>
        <button class="btn btn-primary" data-act="add">＋ 첫 지원 기업 추가하기</button></div>`}
    </div>`;
  }

  /* ---------- 보드: 끌어서 옮기기 (마우스) · 길게 눌러 옮기기 (터치) ---------- */
  function mountBoard(root) {
    let drag = null; let suppressClick = false; let pressTimer = null; let raf = 0;
    const board = () => root.querySelector('#ap-board');
    const redraw = () => { const y = window.scrollX; const sy = window.scrollY; root.innerHTML = renderList({}); window.scrollTo(y, sy); };
    const columnAt = (x, y) => { const el = document.elementFromPoint(x, y); return el && el.closest('[data-drop]'); };

    function commit(id, prevSt) {
      const card = root.querySelector(`.ap-card[data-id="${CSS.escape(id)}"]`); if (!card) return;
      const col = card.closest('[data-drop]'); const st = col.dataset.drop;
      const order = [...col.querySelectorAll('.ap-card')].map((c) => c.dataset.id);
      App.store.moveApp(id, st, order);
      const a = App.store.getApp(id);
      if (st !== prevSt) {
        App.ui.toast(st === 'passed' ? `🎉 ${a.company} 합격 축하해요!` : `${a.company} → ${STATUS[st].label}`);
        App.rerender(); // 사이드바 상태 점·목록 갱신
      } else redraw();
    }

    function startDrag(card, ev) {
      const r = card.getBoundingClientRect();
      const ghost = card.cloneNode(true);
      ghost.classList.add('ap-ghost'); ghost.removeAttribute('data-href');
      Object.assign(ghost.style, { width: r.width + 'px', left: r.left + 'px', top: r.top + 'px' });
      document.body.appendChild(ghost);
      card.classList.add('ap-placeholder');
      root.querySelector('#ap-board').classList.add('is-dragging');
      drag = { card, ghost, id: card.dataset.id, prevSt: card.closest('[data-drop]').dataset.drop, dx: ev.clientX - r.left, dy: ev.clientY - r.top, x: ev.clientX, y: ev.clientY };
      moveDrag(ev);
      autoScroll();
    }
    function moveDrag(ev) {
      if (!drag) return;
      drag.x = ev.clientX; drag.y = ev.clientY;
      drag.ghost.style.transform = `translate(${ev.clientX - drag.dx - parseFloat(drag.ghost.style.left)}px, ${ev.clientY - drag.dy - parseFloat(drag.ghost.style.top)}px) rotate(1.5deg)`;
      drag.ghost.style.visibility = 'hidden';
      const col = columnAt(ev.clientX, ev.clientY);
      drag.ghost.style.visibility = '';
      root.querySelectorAll('.ap-col').forEach((c) => c.classList.toggle('is-over', !!col && c.contains(col)));
      if (!col) return;
      // 포인터 위치 기준으로 placeholder 를 끼워 넣을 자리 찾기
      const cards = [...col.querySelectorAll('.ap-card:not(.ap-placeholder)')];
      const after = cards.find((c) => { const b = c.getBoundingClientRect(); return ev.clientY < b.top + b.height / 2; });
      if (after) { if (after.previousElementSibling !== drag.card) col.insertBefore(drag.card, after); }
      else { const empty = col.querySelector('.ap-col-empty'); if (drag.card.nextElementSibling !== empty) col.insertBefore(drag.card, empty); }
    }
    function endDrag(cancel) {
      if (!drag) return;
      cancelAnimationFrame(raf);
      const d = drag; drag = null;
      d.ghost.remove(); d.card.classList.remove('ap-placeholder');
      const b = board(); if (b) b.classList.remove('is-dragging');
      root.querySelectorAll('.ap-col.is-over').forEach((c) => c.classList.remove('is-over'));
      suppressClick = true; setTimeout(() => { suppressClick = false; }, 0);
      if (cancel) redraw(); else commit(d.id, d.prevSt);
    }
    // 화면 가장자리에서 자동 스크롤 (세로: 창, 가로: 보드)
    function autoScroll() {
      if (!drag) return;
      const edge = 70; const sp = 14;
      if (drag.y < edge) window.scrollBy(0, -sp); else if (drag.y > window.innerHeight - edge) window.scrollBy(0, sp);
      const b = board();
      if (b) { const r = b.getBoundingClientRect(); if (drag.x < r.left + 40) b.scrollLeft -= sp; else if (drag.x > r.right - 40) b.scrollLeft += sp; }
      raf = requestAnimationFrame(autoScroll);
    }

    // 터치: 길게 누르면 상태 선택 시트
    function openMoveSheet(card) {
      const a = App.store.getApp(card.dataset.id); if (!a) return;
      App.ui.modal({
        title: `${a.company} 상태 옮기기`,
        body: `<div class="ap-modal ap-move-sheet">${STATUS_ORDER.map((st) => `<label class="ap-move-opt" data-st="${st}"><input type="radio" name="ap-mv" value="${st}" ${a.status === st ? 'checked' : ''}/><span class="ap-gdot"></span><b>${STATUS[st].label}</b><span class="subtle">${STATUS[st].hint}</span></label>`).join('')}</div>`,
        confirmText: '옮기기',
        onConfirm(r) {
          const v = (r.querySelector('input[name=ap-mv]:checked') || {}).value;
          if (!v || v === a.status) return true;
          const order = App.store.apps().filter((x) => x.status === v && x.id !== a.id).map((x) => x.id).concat(a.id);
          App.store.moveApp(a.id, v, order);
          App.ui.toast(v === 'passed' ? `🎉 ${a.company} 합격 축하해요!` : `${a.company} → ${STATUS[v].label}`);
          App.rerender(); return true;
        },
      });
    }

    let pending = null;
    const onDown = (ev) => {
      const card = ev.target.closest('.ap-board .ap-card');
      if (!card || ev.button > 0 || ev.target.closest('a, button, input, select, textarea')) return;
      if (ev.pointerType === 'touch') {
        clearTimeout(pressTimer);
        const sx = ev.clientX; const sy = ev.clientY;
        pending = { card, sx, sy, touch: true };
        pressTimer = setTimeout(() => { if (pending && pending.card === card) { pending = null; suppressClick = true; setTimeout(() => { suppressClick = false; }, 400); if (navigator.vibrate) try { navigator.vibrate(15); } catch (e) {} openMoveSheet(card); } }, 450);
        return;
      }
      pending = { card, sx: ev.clientX, sy: ev.clientY };
    };
    const onMove = (ev) => {
      if (drag) { ev.preventDefault(); moveDrag(ev); return; }
      if (!pending) return;
      const moved = Math.hypot(ev.clientX - pending.sx, ev.clientY - pending.sy);
      if (pending.touch) { if (moved > 8) { clearTimeout(pressTimer); pending = null; } return; }
      if (moved > 6) { const c = pending.card; pending = null; startDrag(c, ev); }
    };
    const onUp = () => { clearTimeout(pressTimer); pending = null; if (drag) endDrag(false); };
    const onKey = (ev) => { if (ev.key === 'Escape' && drag) endDrag(true); };
    const onClickCapture = (ev) => { if (suppressClick) { ev.stopPropagation(); ev.preventDefault(); } };
    // 키보드: 카드에 포커스 후 Enter 열기, Shift+←/→ 로 옆 칸 이동
    const onCardKey = (ev) => {
      const card = ev.target.closest && ev.target.closest('.ap-board .ap-card'); if (!card) return;
      if (ev.key === 'Enter') { App.navigate(card.dataset.href); return; }
      if (ev.shiftKey && (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight')) {
        ev.preventDefault();
        const a = App.store.getApp(card.dataset.id); const i = STATUS_ORDER.indexOf(a.status) + (ev.key === 'ArrowRight' ? 1 : -1);
        if (i < 0 || i >= STATUS_ORDER.length) return;
        const v = STATUS_ORDER[i];
        App.store.moveApp(a.id, v, App.store.apps().filter((x) => x.status === v && x.id !== a.id).map((x) => x.id).concat(a.id));
        App.ui.toast(`${a.company} → ${STATUS[v].label}`); App.rerender();
        const again = document.querySelector(`.ap-card[data-id="${CSS.escape(a.id)}"]`); if (again) again.focus();
      }
    };

    root.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    document.addEventListener('keydown', onKey);
    root.addEventListener('keydown', onCardKey);
    root.addEventListener('click', onClickCapture, true);
    root.addEventListener('contextmenu', (ev) => { if (ev.target.closest('.ap-board .ap-card') && pending && pending.touch) ev.preventDefault(); });
    return () => {
      clearTimeout(pressTimer); if (drag) { drag.ghost.remove(); drag = null; } cancelAnimationFrame(raf);
      root.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp);
      document.removeEventListener('keydown', onKey); root.removeEventListener('keydown', onCardKey);
      root.removeEventListener('click', onClickCapture, true);
    };
  }

  /* ---------- 지원 기업 추가 모달 ---------- */
  function openAddModal() {
    const st = { comps: [], analyzing: false, analyzed: false, picker: false };
    const compsHtml = () => {
      if (st.analyzing) return '<div class="ap-thinking"><span class="ai-dot">R</span>공고를 읽고 요구 역량을 찾고 있어요…</div>';
      return `${st.analyzed ? '<div class="ap-add-note"><span class="ai-badge">✦ AI 분석</span> 공고에서 찾은 역량이에요. ★로 중요도를 바꾸거나 ×로 뺄 수 있어요.</div>' : ''}
        ${st.comps.length || st.analyzed ? `<div class="ap-comps">${compRows(st.comps)}</div>` : ''}
        <button type="button" class="ap-linkbtn" data-act="picker">${st.picker ? '닫기' : '＋ 역량 직접 고르기'}</button>
        ${st.picker ? compPicker(st.comps) : ''}`;
    };
    App.ui.modal({
      title: '지원 기업 추가',
      confirmText: '추가하고 준비 시작',
      body: `<div class="ap-add">
        <p class="ap-add-intro">공고를 붙여 넣으면 이 기업이 원하는 역량을 정리해 드려요. 나중에 개요 탭에서 언제든 고칠 수 있어요.</p>
        <div class="ap-add-grid">
          <div><label class="label" for="ap-f-co">회사 이름 <span class="ap-req">*</span></label><input class="input" id="ap-f-co" placeholder="예) 모아페이" maxlength="40" /></div>
          <div><label class="label" for="ap-f-job">직무 <span class="ap-req">*</span></label><input class="input" id="ap-f-job" placeholder="예) 백엔드 개발자 (신입)" maxlength="50" /></div>
          <div><label class="label" for="ap-f-dl">서류 마감일</label><input class="input" id="ap-f-dl" type="date" /></div>
          <div><label class="label" for="ap-f-st">지금 상태</label><select class="select" id="ap-f-st">${STATUS_ORDER.map((s) => `<option value="${s}" ${s === 'preparing' ? 'selected' : ''}>${STATUS[s].label}</option>`).join('')}</select></div>
        </div>
        <label class="label" for="ap-f-url">채용공고 URL <span class="subtle">(선택)</span></label>
        <input class="input" id="ap-f-url" placeholder="https://..." />
        <label class="label" for="ap-f-jd">채용공고 내용 <span class="subtle">(주요 업무·자격 요건·우대 사항)</span></label>
        <textarea class="textarea" id="ap-f-jd" rows="5" placeholder="공고의 주요 업무, 자격 요건, 우대 사항을 그대로 붙여 넣어 주세요."></textarea>
        <div class="ap-add-analyze"><button type="button" class="btn btn-sm" data-act="analyze">✦ 요구 역량 분석</button><span class="subtle">붙여 넣은 내용으로 AI가 역량을 찾아요</span></div>
        <div class="label ap-add-label">요구 역량</div>
        <div id="ap-add-comps">${compsHtml()}</div>
        <label class="label ap-add-label" for="ap-f-es">자소서 문항 <span class="subtle">(선택 · 한 줄에 하나씩)</span></label>
        <textarea class="textarea" id="ap-f-es" rows="3" placeholder="예) 지원 동기와 입사 후 목표를 작성해 주세요.&#10;예) 협업 과정에서 갈등을 해결한 경험을 작성해 주세요."></textarea>
      </div>`,
      onConfirm(root) {
        const v = (id) => (root.querySelector('#' + id).value || '').trim();
        if (st.analyzing) { App.ui.toast('역량 분석이 끝날 때까지 잠시만요'); return false; }
        const company = v('ap-f-co'); const job = v('ap-f-job');
        if (!company) { App.ui.toast('회사 이름을 알려 주세요'); root.querySelector('#ap-f-co').focus(); return false; }
        if (!job) { App.ui.toast('지원 직무를 알려 주세요'); root.querySelector('#ap-f-job').focus(); return false; }
        const jdText = v('ap-f-jd');
        const comps = st.comps.length ? st.comps : (jdText ? App.ai.analyzeJD(jdText) : []);
        const app = App.store.createApp({ company, job, status: v('ap-f-st') || 'preparing', deadline: v('ap-f-dl'), url: v('ap-f-url'), jdText, competencies: comps });
        v('ap-f-es').split('\n').map((s) => s.trim()).filter(Boolean).forEach((q) => {
          App.store.addAppItem(app.id, 'essays', { text: q, limit: 800, keywords: App.ai.analyzeQuestion(q).keywords, expId: null, note: '' });
        });
        App.ui.toast(`${company} 준비를 시작해요`);
        App.navigate('#/apply/' + app.id);
        return true;
      },
    });
    const mroot = document.getElementById('modal-root');
    const modal = mroot.querySelector('.modal'); modal.classList.add('ap-modal');
    const box = modal.querySelector('#ap-add-comps');
    const paint = () => { box.innerHTML = compsHtml(); };
    modal.addEventListener('click', async (ev) => {
      const b = ev.target.closest('[data-act]'); if (!b || !modal.contains(b)) return;
      const act = b.dataset.act;
      if (act === 'analyze') {
        const jd = (modal.querySelector('#ap-f-jd').value || '').trim();
        if (!jd) { App.ui.toast('채용공고 내용을 먼저 붙여 넣어 주세요'); modal.querySelector('#ap-f-jd').focus(); return; }
        st.analyzing = true; b.disabled = true; paint();
        await App.ai.think(900);
        const found = App.ai.analyzeJD(jd);
        const manual = st.comps.filter((c) => !found.some((f) => f.name === c.name));
        st.comps = found.concat(manual); st.analyzing = false; st.analyzed = true; b.disabled = false;
        b.textContent = '✦ 다시 분석'; paint();
        return;
      }
      if (act === 'picker') { st.picker = !st.picker; paint(); return; }
      if (applyCompAction(st.comps, b)) paint();
    });
    modal.addEventListener('change', (ev) => {
      const t = ev.target; if (t.dataset.act === 'reason' && st.comps[Number(t.dataset.i)]) st.comps[Number(t.dataset.i)].reason = t.value.trim();
    });
    setTimeout(() => { const el = document.getElementById('ap-f-co'); if (el) el.focus(); }, 30);
  }

  /* ---------- 상세 ---------- */
  function notFound() {
    return `<div class="page ap"><div class="card empty ap-nf"><div class="big">◎</div>
      <div class="ap-nf-title">이 지원 기업을 찾을 수 없어요</div>
      <div class="subtle" style="margin:4px 0 18px">삭제되었거나 주소가 바뀌었을 수 있어요.</div>
      <a class="btn btn-primary" href="#/apply">지원 기업 목록으로</a></div></div>`;
  }
  function heroHtml(a) {
    const r = App.ai.readiness(a); const dd = dday(a); const url = safeUrl(a.url);
    return `<div class="card ap-hero">
      <div class="ap-hero-main">
        <div class="ap-hero-top">
          <label class="ap-st-select" data-st="${esc(a.status)}"><i></i>
            <select data-act="status" aria-label="지원 상태">${STATUS_ORDER.map((s) => `<option value="${s}" ${a.status === s ? 'selected' : ''}>${STATUS[s].label}</option>`).join('')}</select><span class="ap-caret">▾</span></label>
          ${ddayPill(dd)}
          ${a.deadline ? `<span class="subtle">서류 마감 ${esc(mdLabel(a.deadline))}</span>` : ''}
        </div>
        <h1 class="ap-hero-co">${esc(a.company || '이름 없는 기업')}</h1>
        <div class="ap-hero-job">${esc(a.job || '직무 미입력')}${url ? ` · <a class="ap-link" href="${esc(url)}" target="_blank" rel="noopener">채용공고 ↗</a>` : ''}</div>
      </div>
      <div class="ap-hero-side">
        <div class="ap-hero-ready">${ring(r.score)}<div class="ap-hero-ready-t"><b>준비도</b><span>역량 ${readyCount(r)}/${r.competencies.length} · 자소서 ${r.essaysDone}/${r.essaysTotal} · 면접 ${r.interviewDone}/${r.interviewTotal}</span></div></div>
        <div class="ap-menu-wrap">
          <button class="btn btn-ghost ap-menu-btn" data-act="menu" aria-label="더보기" aria-haspopup="true">⋯</button>
          <div class="ap-menu" hidden>
            <button data-act="edit-info">기본 정보 수정</button>
            <button class="danger" data-act="delete">지원 기업 삭제</button>
          </div>
        </div>
      </div>
    </div>`;
  }
  function tabsHtml(a, tab) {
    const r = App.ai.readiness(a);
    const badge = {
      competency: r.competencies.length ? `${readyCount(r)}/${r.competencies.length}` : '',
      essay: r.essaysTotal ? `${r.essaysDone}/${r.essaysTotal}` : '',
      interview: r.interviewTotal ? `${r.interviewDone}/${r.interviewTotal}` : '',
    };
    return `<div class="ap-tabs" role="tablist">${TAB_ORDER.map((t) => {
      const T = App.applyTabs[t]; const label = (T && T.label) || TAB_LABEL[t];
      const full = badge[t] && badge[t].split('/')[0] === badge[t].split('/')[1];
      return `<button class="ap-tab ${t === tab ? 'on' : ''}" role="tab" aria-selected="${t === tab}" data-tab="${t}">${esc(label)}${badge[t] ? `<span class="ap-tab-badge ${full ? 'full' : ''}">${badge[t]}</span>` : ''}</button>`;
    }).join('')}</div>`;
  }
  function placeholder(tab, err) {
    return `<div class="card empty ap-ph"><div class="big">${err ? '⚠' : '◌'}</div>
      <div>${err ? '이 탭을 불러오지 못했어요' : `${esc(TAB_LABEL[tab])} 탭은 준비 중이에요`}</div>
      <div class="subtle" style="margin-top:4px">${err ? '잠시 후 다시 시도해 주세요.' : '곧 이 기업에 맞춘 화면이 들어와요.'}</div></div>`;
  }
  function tabBody(a, tab) {
    const T = App.applyTabs[tab];
    if (!T || typeof T.render !== 'function') return placeholder(tab);
    try { return T.render(a); } catch (e) { console.error('[apply tab render]', tab, e); return placeholder(tab, true); }
  }
  function renderDetail(params) {
    const a = App.store.getApp(params.id); if (!a) return notFound();
    const tab = normTab(params.tab);
    return `<div class="page ap ap-detail">
      <div id="ap-head">${heroHtml(a)}${tabsHtml(a, tab)}</div>
      <div class="ap-tab-body" data-tab="${tab}">${tabBody(a, tab)}</div>
    </div>`;
  }

  function mountDetail(root, params) {
    const id = params.id; const tab = normTab(params.tab);
    if (!App.store.getApp(id)) return null;
    const head = root.querySelector('#ap-head');
    let tabEl = root.querySelector('.ap-tab-body');
    let tabCleanup = null; let active = true;
    const unmountTab = () => { if (tabCleanup) { try { tabCleanup(); } catch (e) { console.error(e); } } tabCleanup = null; };
    const mountTab = () => {
      const a = App.store.getApp(id); const T = App.applyTabs[tab];
      if (!a || !T || typeof T.mount !== 'function') return;
      try { tabCleanup = T.mount(tabEl, a, ctx) || null; } catch (e) { console.error('[apply tab mount]', tab, e); }
    };
    const ctx = {
      params, tab,
      isActive: () => active,
      goTab: (t) => App.navigate(`#/apply/${id}/${normTab(t)}`),
      refresh() {
        if (!active) return;
        const a = App.store.getApp(id); if (!a) { App.navigate('#/apply'); return; }
        head.innerHTML = heroHtml(a) + tabsHtml(a, tab);
        unmountTab();
        // 탭 컨테이너는 새 요소로 교체 → 탭 모듈의 이벤트 리스너가 중복되지 않는다
        const fresh = document.createElement('div'); fresh.className = 'ap-tab-body'; fresh.dataset.tab = tab;
        fresh.innerHTML = tabBody(a, tab); tabEl.replaceWith(fresh); tabEl = fresh;
        mountTab();
      },
    };
    const menu = () => head.querySelector('.ap-menu');
    const closeMenu = () => { const m = menu(); if (m) m.hidden = true; };
    head.addEventListener('click', (ev) => {
      const t = ev.target.closest('[data-tab]');
      if (t) { if (t.dataset.tab !== tab) App.navigate(`#/apply/${id}/${t.dataset.tab}`); return; }
      const b = ev.target.closest('[data-act]'); if (!b) return;
      const a = App.store.getApp(id); if (!a) return;
      if (b.dataset.act === 'menu') { ev.stopPropagation(); const m = menu(); m.hidden = !m.hidden; return; }
      if (b.dataset.act === 'edit-info') {
        closeMenu(); ovState(id).focusInfo = true;
        if (tab === 'overview') ctx.refresh(); else App.navigate(`#/apply/${id}/overview`);
        return;
      }
      if (b.dataset.act === 'delete') {
        closeMenu();
        App.ui.modal({
          title: `${a.company} 지원 정보를 삭제할까요?`,
          body: '<p>요구 역량, 자소서 문항, 면접 준비 기록이 함께 사라지고 되돌릴 수 없어요.<br/>연결해 둔 경험 카드는 보관함에 그대로 남아요.</p>',
          confirmText: '삭제', danger: true,
          onConfirm() { App.store.removeApp(id); App.ui.toast(`${a.company}을(를) 목록에서 삭제했어요`); App.navigate('#/apply'); },
        });
      }
    });
    head.addEventListener('change', (ev) => {
      if (ev.target.dataset.act !== 'status') return;
      App.store.updateApp(id, { status: ev.target.value });
      App.ui.toast(`상태를 ‘${STATUS[ev.target.value].label}’(으)로 바꿨어요`);
      App.rerender(); // 사이드바 상태 점도 갱신
    });
    const onDoc = (ev) => { if (!ev.target.closest('.ap-menu-wrap')) closeMenu(); };
    const onKey = (ev) => { if (ev.key === 'Escape') closeMenu(); };
    document.addEventListener('click', onDoc); document.addEventListener('keydown', onKey);
    mountTab();
    return () => { active = false; unmountTab(); document.removeEventListener('click', onDoc); document.removeEventListener('keydown', onKey); };
  }

  /* ---------- 개요 탭 ---------- */
  const ovStore = {};
  const ovState = (id) => (ovStore[id] = ovStore[id] || { picker: false, sugg: null, jdOpen: false, jdEdit: false, focusInfo: false });

  function todos(a, r) {
    const out = []; const base = `#/apply/${encodeURIComponent(a.id)}`;
    const dd = dday(a);
    if (dd && dd.days != null && dd.days >= 0 && dd.days <= 3 && a.status === 'preparing') {
      out.push({ tone: 'warn', ico: '⏰', text: dd.days === 0 ? '오늘 서류 마감이에요. 제출 전에 자소서를 한 번 더 확인해요.' : `서류 마감까지 ${dd.days}일 남았어요.`, href: `${base}/essay`, cta: '자소서 보기' });
    }
    if (!r.competencies.length) out.push({ ico: '◎', text: '이 기업의 요구 역량을 먼저 정리해 주세요.', href: '', act: 'focus-comps', cta: '역량 추가' });
    sortComps(r.competencies).forEach((c) => {
      if (!c.exp) out.push({ tone: 'warn', ico: '✦', html: `${App.ui.keywordChip(c.name)} 대표 경험이 아직 없어요.`, href: `#/discover?kw=${encodeURIComponent(c.name)}`, cta: '발굴하기' });
      else if (!c.ready) out.push({ ico: '✎', html: `${App.ui.keywordChip(c.name)} 대표 경험 「${esc(c.exp.title.split(' — ')[0])}」 완성도가 ${c.exp.completeness}%예요. 조금만 더 채워요.`, href: `#/card/${encodeURIComponent(c.exp.id)}`, cta: '보완하기' });
    });
    const unpinned = r.competencies.filter((c) => c.exp && !c.pinned).length;
    if (unpinned) out.push({ ico: '📌', text: `역량 ${unpinned}개는 대표 경험을 AI가 임시로 골랐어요. 이 기업에 맞는 경험으로 고정해 두세요.`, href: `${base}/competency`, cta: '역량 맵' });
    if (!r.essaysTotal) out.push({ ico: '✎', text: '자소서 문항을 등록하면 문항마다 맞는 경험을 추천해 드려요.', href: `${base}/essay`, cta: '문항 등록' });
    else (a.essays || []).forEach((q, i) => { if (!q.expId) out.push({ ico: '✎', text: `자소서 ${i + 1}번 문항에 경험을 연결하세요.`, sub: q.text, href: `${base}/essay`, cta: '연결하기' }); });
    if (!r.interviewTotal) out.push({ ico: '💬', text: '이 기업 맞춤 예상 면접 질문을 만들어 보세요.', href: `${base}/interview`, cta: '질문 만들기' });
    else if (r.interviewDone < r.interviewTotal) out.push({ ico: '💬', text: `면접 질문 ${r.interviewTotal - r.interviewDone}개가 아직 연습 전이에요.`, href: `${base}/interview`, cta: '연습하기' });
    return out;
  }
  function todoCard(a, r) {
    const list = todos(a, r); const shown = list.slice(0, 6);
    return `<div class="card card-pad ap-ov-card">
      <div class="section-title">다음에 할 일 ${list.length ? `<span class="subtle">${list.length}</span>` : ''}</div>
      ${shown.length ? `<div class="ap-todos">${shown.map((t) => `<div class="ap-todo" data-tone="${t.tone || ''}">
        <span class="ap-todo-ico">${t.ico}</span>
        <div class="ap-todo-t"><span class="ap-todo-main">${t.html || esc(t.text)}</span>${t.sub ? `<span class="ap-todo-sub">${esc(t.sub)}</span>` : ''}</div>
        ${t.href ? `<a class="btn btn-sm" href="${esc(t.href)}">${esc(t.cta)}</a>` : `<button class="btn btn-sm" data-act="${t.act}">${esc(t.cta)}</button>`}
      </div>`).join('')}</div>${list.length > shown.length ? `<div class="subtle ap-todo-more">그 밖에 ${list.length - shown.length}개가 더 있어요.</div>` : ''}`
        : '<div class="ap-alldone"><span>✓</span>지금 할 일은 모두 끝냈어요. 면접 전에 답변을 소리 내어 한 번 더 연습해 봐요.</div>'}
    </div>`;
  }
  function suggPanel(a, st) {
    if (!st.sugg) return '';
    if (st.sugg === 'loading') return '<div class="ap-sugg"><div class="ap-thinking"><span class="ai-dot">R</span>공고를 다시 읽고 있어요…</div></div>';
    const have = (a.competencies || []).map((c) => c.name);
    const fresh = st.sugg.filter((c) => !have.includes(c.name));
    return `<div class="ap-sugg">
      <div class="ap-sugg-head"><span class="ai-badge">✦ 공고 분석 결과</span><span class="subtle">${fresh.length ? `새로 찾은 역량 ${fresh.length}개` : '새로 찾은 역량은 없어요'}</span></div>
      <div class="ap-sugg-list">${st.sugg.map((c) => `<div class="ap-sugg-item">${compChip(c)}<span class="ap-sugg-why">${esc(c.reason || '')}</span>
        ${have.includes(c.name) ? '<span class="subtle">이미 있어요</span>' : `<button type="button" class="btn btn-sm" data-act="sugg-add" data-k="${esc(c.name)}">＋ 추가</button>`}</div>`).join('')}</div>
      <div class="ap-sugg-acts">
        ${fresh.length ? '<button type="button" class="btn btn-sm btn-primary" data-act="sugg-add-all">새 역량 모두 추가</button>' : ''}
        <button type="button" class="btn btn-sm" data-act="sugg-replace">이 결과로 바꾸기</button>
        <button type="button" class="btn btn-sm btn-ghost" data-act="sugg-close">닫기</button>
      </div></div>`;
  }
  function compCard(a, st) {
    const hasJd = !!String(a.jdText || '').trim();
    return `<div class="card card-pad ap-ov-card" id="ap-ov-comps">
      <div class="section-title">요구 역량 <span class="subtle">${(a.competencies || []).length}</span>
        <button type="button" class="btn btn-sm ap-ml" data-act="reanalyze" ${hasJd ? '' : 'disabled title="공고 원문을 먼저 넣어 주세요"'}>✦ 공고 다시 분석</button></div>
      <p class="subtle ap-ov-desc">이 기업이 원하는 역량이에요. ★ 중요도가 높을수록 자소서·면접에서 먼저 보여 줘야 해요.</p>
      <div class="ap-comps">${compRows(a.competencies || [])}</div>
      <button type="button" class="ap-linkbtn" data-act="picker">${st.picker ? '닫기' : '＋ 역량 추가'}</button>
      ${st.picker ? compPicker(a.competencies || []) : ''}
      ${suggPanel(a, st)}
    </div>`;
  }
  function jdCard(a, st) {
    const jd = String(a.jdText || '');
    if (st.jdEdit) {
      return `<div class="card card-pad ap-ov-card">
        <div class="section-title">채용공고 원문</div>
        <textarea class="textarea ap-jd-ta" data-jd-input rows="8" placeholder="공고의 주요 업무, 자격 요건, 우대 사항을 붙여 넣어 주세요.">${esc(jd)}</textarea>
        <div class="ap-jd-acts"><button type="button" class="btn btn-sm btn-ghost" data-act="jd-cancel">취소</button><button type="button" class="btn btn-sm btn-primary" data-act="jd-save">저장</button></div>
      </div>`;
    }
    return `<div class="card card-pad ap-ov-card">
      <div class="section-title">채용공고 원문
        <span class="ap-ml row">${jd ? `<button type="button" class="btn btn-sm btn-ghost" data-act="jd-toggle">${st.jdOpen ? '접기' : '펼치기'}</button>` : ''}<button type="button" class="btn btn-sm" data-act="jd-edit">${jd ? '편집' : '붙여 넣기'}</button></span></div>
      ${jd ? `<div class="ap-jd ${st.jdOpen ? 'open' : ''}" ${st.jdOpen ? '' : 'data-act="jd-toggle"'}>${esc(jd)}</div>`
        : '<div class="ap-comp-empty">아직 공고 원문이 없어요. 붙여 넣으면 요구 역량을 다시 분석할 수 있어요.</div>'}
    </div>`;
  }
  function readyCard(a, r) {
    const meter = (label, n, m, unit) => `<div class="ap-meter"><div class="ap-meter-row"><span>${label}</span><b>${m ? `${n}/${m}` : '—'}</b><span class="subtle">${unit}</span></div>${App.ui.progress(m ? Math.round(n / m * 100) : 0)}</div>`;
    return `<div class="card card-pad ap-ov-card">
      <div class="section-title">준비도 <span class="ap-ml ap-score">${r.score}%</span></div>
      ${meter('역량', readyCount(r), r.competencies.length, '준비됨')}
      ${meter('자소서', r.essaysDone, r.essaysTotal, '연결')}
      ${meter('면접', r.interviewDone, r.interviewTotal, '준비')}
      ${r.competencies.length ? `<div class="ap-rlist">${sortComps(r.competencies).map((c) => `<div class="ap-ritem">
        <div class="ap-ritem-k">${compChip(c)}${c.ready ? '<span class="ap-ok" title="준비됨">✓</span>' : ''}</div>
        ${c.exp ? `<a class="ap-ritem-exp" href="#/card/${esc(c.exp.id)}">${c.pinned ? '<span class="ap-pin" title="이 기업용으로 고정한 경험">📌</span>' : ''}<span class="ap-ritem-title">${esc(c.exp.title)}</span><span class="ap-ritem-pct ${c.ready ? '' : 'low'}">${c.exp.completeness}%</span></a>`
          : `<a class="ap-ritem-exp none" href="#/discover?kw=${encodeURIComponent(c.name)}">경험 없음 → <b>발굴하기</b></a>`}
      </div>`).join('')}</div>` : ''}
      <p class="subtle ap-ov-foot">대표 경험 완성도가 70% 이상이면 ‘준비됨’으로 봐요.</p>
    </div>`;
  }
  function infoCard(a) {
    const url = safeUrl(a.url);
    return `<div class="card card-pad ap-ov-card" id="ap-ov-info">
      <div class="section-title">기본 정보</div>
      <div class="ap-info">
        <label class="label" for="ap-i-co">회사 이름</label><input class="input" id="ap-i-co" data-field="company" value="${esc(a.company)}" maxlength="40" />
        <label class="label" for="ap-i-job">직무</label><input class="input" id="ap-i-job" data-field="job" value="${esc(a.job)}" maxlength="50" />
        <label class="label" for="ap-i-dl">서류 마감일</label><input class="input" id="ap-i-dl" type="date" data-field="deadline" value="${esc(a.deadline)}" />
        <label class="label" for="ap-i-url">채용공고 URL</label>
        <div class="ap-url-row"><input class="input" id="ap-i-url" data-field="url" value="${esc(a.url)}" placeholder="https://..." />${url ? `<a class="btn btn-sm" href="${esc(url)}" target="_blank" rel="noopener" title="${esc(prettyUrl(url))}">열기 ↗</a>` : ''}</div>
      </div>
    </div>`;
  }
  function memoCard(a) {
    return `<div class="card card-pad ap-ov-card">
      <div class="section-title">메모 <span class="subtle ap-ml ap-memo-state" data-memo-state></span></div>
      <textarea class="textarea ap-memo" data-memo rows="4" placeholder="면접 일정, 회사 리서치, 공부할 것 등을 적어 두세요.">${esc(a.memo || '')}</textarea>
    </div>`;
  }

  App.applyTabs.overview = {
    label: '개요',
    render(a) {
      const st = ovState(a.id); const r = App.ai.readiness(a);
      return `<div class="ap-ov">
        <div class="ap-ov-main">${todoCard(a, r)}${compCard(a, st)}${jdCard(a, st)}</div>
        <div class="ap-ov-side">${readyCard(a, r)}${infoCard(a)}${memoCard(a)}</div>
      </div>`;
    },
    mount(el, app, ctx) {
      const id = app.id; const st = ovState(id);
      const cur = () => App.store.getApp(id);
      const compsCopy = () => clone((cur() || {}).competencies || []);
      const saveComps = (comps) => { App.store.updateApp(id, { competencies: comps }); ctx.refresh(); };
      if (st.focusInfo) {
        st.focusInfo = false;
        const box = el.querySelector('#ap-ov-info');
        if (box) { box.scrollIntoView({ block: 'center' }); const i = box.querySelector('input'); if (i) i.focus(); box.classList.add('ap-flash'); }
      }
      const onClick = async (ev) => {
        const b = ev.target.closest('[data-act]'); if (!b || !el.contains(b) || b.disabled) return;
        const act = b.dataset.act; const a = cur(); if (!a) return;
        if (act === 'picker') { st.picker = !st.picker; ctx.refresh(); return; }
        if (act === 'focus-comps') { st.picker = true; ctx.refresh(); const c = document.getElementById('ap-ov-comps'); if (c) c.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
        if (act === 'weight' || act === 'remove-comp' || act === 'add-comp') {
          const comps = compsCopy();
          if (applyCompAction(comps, b)) { if (act === 'remove-comp' && a.pins && a.pins[a.competencies[Number(b.dataset.i)].name]) App.store.setPin(id, a.competencies[Number(b.dataset.i)].name, null); saveComps(comps); }
          return;
        }
        if (act === 'reanalyze') {
          st.sugg = 'loading'; ctx.refresh();
          await App.ai.think(900);
          const latest = cur(); if (!latest) return;
          st.sugg = App.ai.analyzeJD(latest.jdText || '');
          if (ctx.isActive()) ctx.refresh();
          return;
        }
        if (act === 'sugg-add' || act === 'sugg-add-all') {
          if (!Array.isArray(st.sugg)) return;
          const comps = compsCopy(); const names = comps.map((c) => c.name);
          const add = st.sugg.filter((c) => !names.includes(c.name) && (act === 'sugg-add-all' || c.name === b.dataset.k));
          if (act === 'sugg-add-all') st.sugg = null;
          App.ui.toast(add.length > 1 ? `역량 ${add.length}개를 추가했어요` : `#${add[0] ? add[0].name : ''} 역량을 추가했어요`);
          saveComps(comps.concat(clone(add)));
          return;
        }
        if (act === 'sugg-replace') {
          if (!Array.isArray(st.sugg)) return;
          const next = clone(st.sugg); st.sugg = null;
          App.ui.toast('요구 역량을 분석 결과로 바꿨어요'); saveComps(next);
          return;
        }
        if (act === 'sugg-close') { st.sugg = null; ctx.refresh(); return; }
        if (act === 'jd-toggle') { st.jdOpen = !st.jdOpen; ctx.refresh(); return; }
        if (act === 'jd-edit') { st.jdEdit = true; ctx.refresh(); const ta = document.querySelector('[data-jd-input]'); if (ta) ta.focus(); return; }
        if (act === 'jd-cancel') { st.jdEdit = false; ctx.refresh(); return; }
        if (act === 'jd-save') {
          const ta = el.querySelector('[data-jd-input]'); const text = ta ? ta.value.trim() : '';
          const changed = text !== String(a.jdText || '').trim();
          App.store.updateApp(id, { jdText: text }); st.jdEdit = false; st.jdOpen = true;
          if (changed && text) App.ui.toast('공고를 저장했어요. ‘공고 다시 분석’으로 요구 역량을 갱신할 수 있어요');
          ctx.refresh();
        }
      };
      const onChange = (ev) => {
        const t = ev.target;
        if (t.dataset.act === 'reason') {
          const comps = compsCopy(); const c = comps[Number(t.dataset.i)]; if (!c) return;
          c.reason = t.value.trim(); App.store.updateApp(id, { competencies: comps });
          return;
        }
        const f = t.dataset.field; if (!f) return;
        const val = t.value.trim();
        if ((f === 'company' || f === 'job') && !val) { App.ui.toast(f === 'company' ? '회사 이름은 비워 둘 수 없어요' : '직무는 비워 둘 수 없어요'); t.value = (cur() || {})[f] || ''; return; }
        App.store.updateApp(id, { [f]: val });
        App.ui.toast('기본 정보를 저장했어요');
        if (f === 'company' || f === 'job') App.rerender(); else ctx.refresh(); // 제목·사이드바 갱신
      };
      const onBlur = (ev) => {
        const t = ev.target; if (!t.matches('[data-memo]')) return;
        const a = cur(); if (!a || (a.memo || '') === t.value) return;
        App.store.updateApp(id, { memo: t.value });
        const s = el.querySelector('[data-memo-state]'); if (s) { s.textContent = '저장했어요 ✓'; setTimeout(() => { s.textContent = ''; }, 1800); }
      };
      el.addEventListener('click', onClick); el.addEventListener('change', onChange); el.addEventListener('focusout', onBlur);
      return () => { el.removeEventListener('click', onClick); el.removeEventListener('change', onChange); el.removeEventListener('focusout', onBlur); };
    },
  };

  /* ---------- 다른 탭 모듈이 쓸 수 있는 유틸 ---------- */
  App.applyUtil = { STATUS, STATUS_ORDER, dday, statusPill, ddayPill, ring, compChip };

  /* ---------- 화면 등록 ---------- */
  App.screens.apply = {
    title(params) {
      if (params && params.id) { const a = App.store.getApp(params.id); return a ? a.company : '찾을 수 없음'; }
      return '지원 기업';
    },
    crumb(params) { return params && params.id ? [{ label: '지원 기업', href: '#/apply' }] : []; },
    render(params) { return params && params.id ? renderDetail(params) : renderList(params || {}); },
    mount(root, params) {
      if (params && params.id) return mountDetail(root, params);
      const onClick = (ev) => {
        const b = ev.target.closest('[data-act]'); if (!b) return;
        if (b.dataset.act === 'add') { openAddModal(); return; }
        if (b.dataset.act === 'legacy-add' && params.q) {
          const q = params.q;
          App.store.addAppItem(b.dataset.id, 'essays', { text: q, limit: 800, keywords: App.ai.analyzeQuestion(q).keywords, expId: null, note: '' });
          const a = App.store.getApp(b.dataset.id);
          App.ui.toast(`${a ? a.company : ''} 자소서에 문항을 추가했어요`);
          App.navigate(`#/apply/${b.dataset.id}/essay`);
        }
      };
      root.addEventListener('click', onClick);
      const offBoard = mountBoard(root);
      return () => { root.removeEventListener('click', onClick); offBoard(); };
    },
  };
})(window.App);
