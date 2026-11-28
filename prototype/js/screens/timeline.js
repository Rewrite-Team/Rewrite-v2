/* 경험 타임라인 — #/timeline
   왼쪽에서 오른쪽으로 시간이 흐른다. 프로젝트는 시작한 달에서 가지를 내어 끝난 달(진행 중이면 지금)까지 뻗고,
   경험 카드는 그 가지에서 그 카드의 달에 잔가지로 갈라져 나온다. 프로젝트는 시작한 순서대로 위에서 아래로.
   들어오면 한 번, 가지가 시간 순서대로 자라 나온다 (다시 보기 버튼, 움직임 줄이기면 완성된 모습만).
   역량을 고르면 그 역량이 담긴 카드만 형광펜으로 남는다 (내가 고른 것). 프로젝트마다 카드를 접었다 펼 수 있다 (계정마다 기억) */
(function (App) {
  const esc = (s) => App.ui.esc(s); const S = App.store; const I = App.icon;
  const G = { left: 28, right: 300, top: 52, head: 30, row: 30, gap: 30, minMW: 16, maxMW: 64 }; // right: 마지막 카드 이름이 들어갈 자리
  const GROW = 1.8; // 가지가 다 자라는 데 걸리는 초
  const ui = { kw: '', me: '', fold: new Set() };
  const foldKey = (id) => `rewrite-tl-fold:${id}`;
  const saveFold = () => { try { localStorage.setItem(foldKey(ui.me), JSON.stringify([...ui.fold])); } catch (e) { /* ignore */ } };
  const shortTitle = (e) => e.title.split(' — ')[0];
  const motionOK = () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- 달 ---------------- */
  const ym = (s) => { const m = String(s || '').match(/^(\d{4})-(\d{2})/); return m ? Number(m[1]) * 12 + Number(m[2]) - 1 : null; };
  const nowM = () => ym(S.localDay());
  const label = (m) => `${Math.floor(m / 12)}년 ${(m % 12) + 1}월`;
  const cardM = (e) => ym(e.period && e.period.start) ?? ym(e.createdAt);

  // 프로젝트마다 가지 하나: { p, start, end, ongoing, cards:[{ e, m }] }. 시작한 순서대로
  function branches() {
    const now = nowM();
    return S.projects().map((p) => {
      const cards = S.cardsOf(p.id).map((e) => ({ e, m: cardM(e) })).filter((c) => c.m != null)
        .sort((a, b) => a.m - b.m || String(a.e.createdAt).localeCompare(String(b.e.createdAt)));
      const ms = cards.map((c) => c.m);
      const start = Math.min(ym(p.period && p.period.start) ?? Infinity, ...ms);
      const ongoing = p.status !== 'done';
      const end = ongoing ? now : Math.max(ym(p.period && p.period.end) ?? -Infinity, ...ms, start);
      return { p, start, end: Math.min(Math.max(end, start), now), ongoing, cards };
    }).filter((b) => Number.isFinite(b.start)).sort((a, b) => a.start - b.start || a.end - b.end);
  }

  /* ---------------- 그리기 ---------------- */
  function figure(list, width) {
    const first = Math.min(...list.map((b) => b.start)) - 1; const last = nowM() + 1; const months = last - first + 1;
    const MW = Math.max(G.minMW, Math.min(G.maxMW, (width - G.left - G.right) / months));
    const x = (m) => G.left + (m - first) * MW + MW / 2;
    const W = Math.ceil(G.left + months * MW + G.right);
    let y = G.top; const span = x(last) - x(first);
    const at = (px) => ((px - x(first)) / span) * GROW; // 그 자리가 자라나는 때
    const kw = ui.kw;
    const parts = list.map((b) => {
      y += G.head; const ly = y; const xs = x(b.start); const xe = x(b.end) + (b.ongoing ? MW / 2 : 0);
      const lane = `<path class="tl-lane ${b.ongoing ? 'is-on' : ''}" d="M${xs} ${ly}H${xe}" pathLength="1" style="--d:${at(xs).toFixed(2)}s;--t:${Math.max(0.2, at(xe) - at(xs)).toFixed(2)}s"/>`;
      const cap = b.ongoing ? `<path class="tl-tail" d="M${xe} ${ly}h${MW}" style="--d:${at(xe).toFixed(2)}s"/>` : `<circle class="tl-end" cx="${xe}" cy="${ly}" r="3.5" style="--d:${at(xe).toFixed(2)}s"/>`;
      const shut = ui.fold.has(b.p.id) && b.cards.length; const name = S.projectName(b.p);
      // 접기 단추(프로젝트 이름 왼쪽)와 이름(프로젝트로 가는 링크)
      const fold = b.cards.length ? `<g class="tl-fold" role="button" tabindex="0" data-fold="${esc(b.p.id)}" aria-expanded="${!shut}" aria-label="「${esc(name)}」 카드 ${b.cards.length}장 ${shut ? '펴기' : '접기'}" style="--d:${at(xs).toFixed(2)}s"><rect x="${xs - 8}" y="${ly - 28}" width="20" height="22" rx="4"/><path d="${shut ? `M${xs - 1} ${ly - 22}l5 5-5 5` : `M${xs - 3} ${ly - 19}l5 5 5-5`}"/></g>` : '';
      const head = `${fold}<a class="tl-proj" href="#/vault/p/${esc(b.p.id)}" style="--d:${at(xs).toFixed(2)}s"><circle class="tl-start" cx="${xs}" cy="${ly}" r="5"/><text x="${b.cards.length ? xs + 15 : xs - 5}" y="${ly - 12}">${esc(name)}</text></a>`;
      if (shut) { // 접으면 가지 위에 카드가 갈라지던 자리만 점으로 남기고, 끝에 카드 수
        const forks = b.cards.map((c) => `<circle class="tl-fork ${kw && c.e.keywords.includes(kw) ? 'is-hit' : ''}" cx="${x(c.m)}" cy="${ly}" r="${kw && c.e.keywords.includes(kw) ? 4.5 : 3}" style="--d:${at(x(c.m)).toFixed(2)}s"/>`).join('');
        const hits = kw ? b.cards.filter((c) => c.e.keywords.includes(kw)).length : 0;
        const more = `<text class="tl-more" x="${xe + (b.ongoing ? MW : 0) + 12}" y="${ly + 4.5}" style="--d:${at(xe).toFixed(2)}s">카드 ${b.cards.length}장${hits ? `, 그중 「${esc(kw)}」 ${hits}장` : ''}</text>`;
        y = ly + G.gap;
        return lane + cap + forks + more + head;
      }
      const twigs = b.cards.map((c, k) => {
        const cy = ly + G.row * (k + 1); const cx = x(c.m); const hit = !kw || c.e.keywords.includes(kw);
        const d = at(cx);
        return `<g class="tl-card ${kw ? (hit ? 'is-hit' : 'is-dim') : ''}" style="--d:${d.toFixed(2)}s">
          <path class="tl-twig" d="M${cx} ${ly}V${cy - 9}Q${cx} ${cy} ${cx + 9} ${cy}H${cx + 14}" pathLength="1"/>
          <circle class="tl-fork" cx="${cx}" cy="${ly}" r="2.5"/>
          <a href="#/card/${esc(c.e.id)}" data-tl="${esc(c.e.id)}" aria-label="${esc(c.e.title)}, ${label(c.m)}${c.e.keywords.length ? `, 역량 ${esc(c.e.keywords.join(', '))}` : ''}">
            <rect class="tl-hit" x="${cx + 10}" y="${cy - 12}" width="${Math.min(260, G.right - 30)}" height="24" rx="4"/>
            <circle class="tl-dot" cx="${cx + 19}" cy="${cy}" r="5"/>
            <text class="tl-name" x="${cx + 30}" y="${cy + 4.5}">${esc(shortTitle(c.e).length > 26 ? shortTitle(c.e).slice(0, 25) + '…' : shortTitle(c.e))}</text>
          </a></g>`;
      }).join('');
      y = ly + G.row * b.cards.length + G.gap;
      return lane + cap + twigs + head;
    }).join('');
    const H = y + 8;
    // 해마다 세로 눈금, 그리고 지금
    let axis = '';
    for (let m = first; m <= last; m++) {
      if (m % 12 === 0 || m === first) axis += `<line class="tl-grid" x1="${x(m) - MW / 2}" y1="${G.top - 22}" x2="${x(m) - MW / 2}" y2="${H}"/><text class="tl-year" x="${x(m) - MW / 2 + 6}" y="${G.top - 28}">${Math.floor(m / 12)}년</text>`;
    }
    const nx = x(nowM());
    axis += `<line class="tl-now" x1="${nx}" y1="${G.top - 22}" x2="${nx}" y2="${H}"/><text class="tl-now-t" x="${nx}" y="${G.top - 28}" text-anchor="middle">지금</text>`;
    return { W, H, svg: `<svg class="tl-svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="프로젝트와 경험 카드의 시간 흐름">${axis}${parts}</svg>` };
  }

  function listHTML(list) {
    // 화면 읽기용: 같은 내용을 시간 순서 목록으로
    return `<ol class="sr-only">${list.map((b) => `<li>${esc(S.projectName(b.p))}, ${label(b.start)}부터 ${b.ongoing ? '지금까지' : label(b.end) + '까지'}<ol>${b.cards.map((c) => `<li><a href="#/card/${esc(c.e.id)}">${esc(c.e.title)}</a>, ${label(c.m)}</li>`).join('')}</ol></li>`).join('')}</ol>`;
  }

  App.screens.timeline = {
    title: '경험 타임라인', bar: true,
    render() {
      if (!S.list().length) return `<div class="page"><div class="empty"><div class="empty-title">아직 경험 카드가 없어요</div><p>AI와 이야기하면 카드가 만들어지고, 여기에서 시간에 따라 뻗어 나가는 모습을 볼 수 있어요.</p><button type="button" class="btn btn-primary" data-chat>${I('chat', 16)}AI 채팅 시작</button></div></div>`;
      const me = (App.auth.current() || {}).id;
      if (ui.me !== me) { ui.me = me; ui.kw = ''; let f = []; try { f = JSON.parse(localStorage.getItem(foldKey(me)) || '[]'); } catch (e) { /* ignore */ } ui.fold = new Set(f); }
      ui.fold.forEach((id) => { if (!S.getProject(id)) ui.fold.delete(id); });
      const n = ui.kw ? S.list().filter((e) => e.keywords.includes(ui.kw)).length : 0;
      return `<div class="tl" data-tl-root>
        <div class="tl-bar">
          <select class="select tl-select" data-kw aria-label="역량"><option value="">모든 역량</option>${App.keywords.names().map((k) => `<option value="${esc(k)}" ${k === ui.kw ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select>
          <span class="tl-count" role="status">${ui.kw ? `「${esc(ui.kw)}」 역량이 담긴 카드 ${n}장` : ''}</span>
          <button type="button" class="btn btn-ghost btn-sm" data-fold-all>${ui.fold.size ? '모두 펴기' : '모두 접기'}</button>
          <button type="button" class="btn btn-ghost btn-sm" data-replay>${I('restore', 15)}다시 보기</button>
        </div>
        <div class="tl-stage" data-stage tabindex="0" aria-label="경험 타임라인. 옆으로 스크롤해요"></div>
        <div class="tl-tip" role="tooltip" hidden></div>
        ${listHTML(branches())}
      </div>`;
    },
    mount(root) {
      const wrap = root.querySelector('[data-tl-root]'); if (!wrap) return null;
      const stage = wrap.querySelector('[data-stage]'); const tip = wrap.querySelector('.tl-tip');
      let lastW = 0;
      function draw(grow) {
        const list = branches(); const w = stage.clientWidth - 16; lastW = stage.clientWidth; // 세로 스크롤 막대가 생길 자리를 빼 둔다
        const f = figure(list, w); stage.innerHTML = f.svg;
        const svg = stage.querySelector('svg');
        svg.classList.add(grow && motionOK() ? 'is-grow' : 'is-still'); // 시간은 왼쪽부터. 스크롤은 사용자가 정한 자리 그대로
        if (grow && motionOK()) setTimeout(() => { if (svg.isConnected) svg.classList.replace('is-grow', 'is-still'); }, (GROW + 1) * 1000);
        svg.querySelectorAll('.tl-card a').forEach((a) => { const t = a.querySelector('.tl-name'); a.querySelector('.tl-hit').setAttribute('width', Math.ceil(t.getComputedTextLength() + 30)); }); // 형광펜은 이름 길이만큼
      }
      // 카드에 올리면: 프로젝트, 달, 역량
      const show = (a) => {
        if (!a) { tip.hidden = true; return; }
        const e = S.get(a.dataset.tl); if (!e) return;
        tip.innerHTML = `<b>${esc(e.title)}</b><span>${esc(S.projectName(S.getProject(e.projectId)))}</span><span>${label(cardM(e))}</span>${e.keywords.length ? `<span class="tl-tip-kws">${e.keywords.map((k) => App.ui.keywordChip(k, k === ui.kw)).join('')}</span>` : ''}`;
        tip.hidden = false;
        const r = a.querySelector('.tl-dot').getBoundingClientRect(); const box = wrap.getBoundingClientRect();
        let left = r.left - box.left - 8; left = Math.max(8, Math.min(box.width - tip.offsetWidth - 8, left));
        let top = r.bottom - box.top + 10; if (top + tip.offsetHeight > box.height - 8) top = r.top - box.top - tip.offsetHeight - 10;
        tip.style.left = left + 'px'; tip.style.top = top + 'px';
      };
      stage.addEventListener('pointerover', (e) => show(e.target.closest('[data-tl]')));
      stage.addEventListener('pointerleave', () => show(null));
      stage.addEventListener('focusin', (e) => show(e.target.closest('[data-tl]')));
      stage.addEventListener('focusout', () => show(null));
      stage.addEventListener('scroll', () => show(null), { passive: true });
      wrap.querySelector('[data-kw]').onchange = (e) => { ui.kw = e.target.value; const y = stage.scrollTop; const x = stage.scrollLeft; App.rerender(); const s = document.querySelector('[data-stage]'); if (s) { s.scrollTop = y; s.scrollLeft = x; } };
      wrap.querySelector('[data-replay]').onclick = () => draw(true);
      // 접고 펴기: 보던 자리 그대로 다시 그리고, 누른 단추에 포커스를 돌려준다
      const allBtn = wrap.querySelector('[data-fold-all]');
      const syncAll = () => { allBtn.textContent = ui.fold.size ? '모두 펴기' : '모두 접기'; };
      const redraw = (focusId) => { const y = stage.scrollTop; const x = stage.scrollLeft; show(null); draw(false); stage.scrollTop = y; stage.scrollLeft = x; syncAll(); if (focusId) { const b = stage.querySelector(`[data-fold="${CSS.escape(focusId)}"]`); if (b) b.focus({ preventScroll: true }); } };
      const toggle = (id) => { if (ui.fold.has(id)) ui.fold.delete(id); else ui.fold.add(id); saveFold(); redraw(id); };
      stage.addEventListener('click', (e) => { const b = e.target.closest('[data-fold]'); if (b) toggle(b.dataset.fold); });
      stage.addEventListener('keydown', (e) => { const b = e.target.closest('[data-fold]'); if (b && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggle(b.dataset.fold); } });
      allBtn.onclick = () => { if (ui.fold.size) ui.fold.clear(); else branches().forEach((b) => { if (b.cards.length) ui.fold.add(b.p.id); }); saveFold(); redraw(); };
      const ro = new ResizeObserver(() => { if (Math.abs(stage.clientWidth - lastW) > 40) { const y = stage.scrollTop; draw(false); stage.scrollTop = y; } });
      draw(!ui.seen); ui.seen = true; ro.observe(stage);
      return () => ro.disconnect();
    },
  };
})(window.App);
