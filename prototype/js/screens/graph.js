/* 경험 그래프 — #/graph
   AI와 나눈 대화(경험) · 경험 카드 · 프로젝트 · 역량 키워드 · 코드 분석을 하나의 힘-그래프로 보여 준다.
   캔버스 + 간단한 물리(반발력 · 스프링 · 약한 중심 중력 · 감쇠). 노드 드래그 · 배경 팬 · 휠/핀치 줌 · 필터 · 상세 패널. */
(function (App) {
  const esc = (s) => App.ui.esc(s);

  const TYPES = {
    card: { label: '경험 카드', color: '#4b4fd6' },
    project: { label: '프로젝트', color: '#1f9a8a' },
    exp: { label: '경험', color: '#8e96aa' },
    kw: { label: '역량', color: '#ee8a32' },
    code: { label: '코드 분석', color: '#8a63c9' },
  };
  const TYPE_ORDER = ['card', 'exp', 'project', 'kw', 'code'];
  const GRAY = [201, 198, 191];
  const REST = { 'exp-card': 42, 'exp-kw': 78, 'exp-project': 96, 'card-project': 84, 'card-kw': 96, 'code-project': 70, 'code-card': 52, 'code-exp': 52 };

  // 화면을 오가도 유지되는 모듈 상태
  const ui = { filter: { kind: 'all', value: '' }, view: null, pos: {}, selected: null };

  const hexRgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  Object.values(TYPES).forEach((t) => { t.rgb = hexRgb(t.color); });
  const clip = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n) + '…' : s; };
  const arr = (a) => (Array.isArray(a) ? a : []);

  /* ---------------- 그래프 만들기 ---------------- */
  function buildGraph() {
    const S = App.store; const st = S.state || {};
    const nodes = []; const byId = {}; const edges = []; const ekeys = new Set();
    const add = (type, ref, label, extra) => {
      const id = type + ':' + ref;
      if (!byId[id]) { byId[id] = Object.assign({ id, type, ref, label: label || ref, deg: 0 }, extra || {}); nodes.push(byId[id]); }
      return byId[id];
    };
    const link = (a, b) => {
      if (!a || !b || a === b) return;
      const k = a.id < b.id ? a.id + '|' + b.id : b.id + '|' + a.id;
      if (ekeys.has(k)) return; ekeys.add(k);
      edges.push({ s: a, t: b, kind: a.type + '-' + b.type, focus: 1 }); a.deg++; b.deg++;
    };
    let items = [];
    try { items = arr(App.wiki && App.wiki.experienceItems && App.wiki.experienceItems()); } catch (e) { items = []; }
    const projects = arr(st.projects); const cards = arr(st.experiences);
    const projNode = (pid) => { const p = pid && projects.find((x) => x.id === pid); return p ? add('project', p.id, S.projectName(p) || p.title, { data: p }) : null; };
    const cardNode = (cid) => { const c = cid && cards.find((x) => x.id === cid); return c ? add('card', c.id, String(c.title || '경험 카드').split(' — ')[0].replace(/^「[^」]*」\s*/, '') || c.title, { data: c }) : null; };
    const kwNode = (k) => (k ? add('kw', k, k) : null);
    const findingNode = (fid) => {
      const ff = fid && S.findFinding && S.findFinding(fid);
      if (!ff || !ff.finding || ff.finding.status === 'dismissed') return null;
      const n = add('code', fid, ff.finding.title || '코드 분석', { data: ff.finding, projectId: ff.project.id });
      link(n, projNode(ff.project.id));
      return n;
    };

    // 경험(대화) 노드
    const cardKwViaExp = {};
    items.forEach((it) => {
      if (!it || !it.id) return;
      const n = add('exp', it.id, it.title || clip(it.text, 18), { data: it });
      arr(it.cardIds).forEach((cid) => {
        const c = cardNode(cid); if (!c) return; link(n, c);
        const set = cardKwViaExp[cid] || (cardKwViaExp[cid] = new Set());
        arr(it.keywords).forEach((k) => set.add(k));
      });
      arr(it.keywords).forEach((k) => link(n, kwNode(k)));
      link(n, projNode(it.projectId));
      if (it.findingId) link(findingNode(it.findingId), n);
    });
    // 경험 카드
    cards.forEach((c) => {
      const n = cardNode(c.id); if (!n) return;
      link(n, projNode(c.projectId));
      const via = cardKwViaExp[c.id] || new Set();
      arr(c.keywords).forEach((k) => { if (!via.has(k)) link(n, kwNode(k)); });
      arr(c.codeRefs).forEach((fid) => link(findingNode(fid), n));
    });
    // 남은 프로젝트 · 코드 분석 (연결이 없어도 프로젝트 아래에 보이게)
    projects.forEach((p) => {
      projNode(p.id);
      arr(p.repo && p.repo.findings).forEach((f) => { if (f && f.id && f.status !== 'dismissed') findingNode(f.id); });
    });

    nodes.forEach((n) => {
      const d = Math.min(n.deg, 14);
      n.r = n.type === 'card' ? 9 + d * 0.55 : n.type === 'project' ? 12 + d * 0.45 : n.type === 'kw' ? 7 + d * 0.45 : n.type === 'code' ? 4.5 : 4.5 + Math.min(d, 4) * 0.25;
      n.charge = -(70 + n.r * 11);
      n.focus = 1; n.nb = new Set();
    });
    edges.forEach((e) => { e.s.nb.add(e.t); e.t.nb.add(e.s); e.rest = (REST[e.kind] || REST[e.t.type + '-' + e.s.type] || 70) * 1.4; });
    return { nodes, edges, byId, hasExp: items.length > 0 };
  }

  /* ---------------- 필터 ---------------- */
  // 강조할 노드 집합 (null = 전부)
  function activeSet(g, f) {
    if (!f || f.kind === 'all') return null;
    if (f.kind === 'type') return new Set(g.nodes.filter((n) => n.type === f.value));
    const center = g.byId[(f.kind === 'kw' ? 'kw:' : 'project:') + f.value];
    const set = new Set(); if (!center) return set;
    set.add(center); center.nb.forEach((n) => set.add(n));
    if (f.kind === 'project') center.nb.forEach((n) => { if (n.type === 'card' || n.type === 'code') n.nb.forEach((m) => { if (m.type !== 'project' && m.type !== 'kw') set.add(m); }); });
    return set;
  }

  function filterBar(g) {
    const f = ui.filter; const cnt = (t) => g.nodes.filter((n) => n.type === t).length;
    const chip = (kind, value, label, count) => {
      const on = f.kind === kind && (kind === 'all' || f.value === value);
      const dot = value && TYPES[value] ? `<span class="gr-dot" style="background:${TYPES[value].color}"></span>` : '';
      return `<button type="button" class="gr-chip ${on ? 'is-on' : ''}" data-gf="${kind}" data-gv="${esc(value)}">${dot}${label}<span class="gr-cnt">${count}</span></button>`;
    };
    const kws = g.nodes.filter((n) => n.type === 'kw').sort((a, b) => b.deg - a.deg);
    const projs = g.nodes.filter((n) => n.type === 'project');
    return `<div class="gr-chips">${chip('all', '', '전체', g.nodes.length)}${TYPE_ORDER.map((t) => chip('type', t, TYPES[t].label, cnt(t))).join('')}</div>
      <div class="gr-selects">
        <select class="gr-sel" data-gsel="kw" aria-label="역량 키워드로 보기"><option value="">역량 키워드 고르기</option>${kws.map((n) => `<option value="${esc(n.ref)}" ${f.kind === 'kw' && f.value === n.ref ? 'selected' : ''}>#${esc(n.ref)} (${n.deg})</option>`).join('')}</select>
        <select class="gr-sel" data-gsel="project" aria-label="프로젝트로 보기"><option value="">프로젝트 고르기</option>${projs.map((n) => `<option value="${esc(n.ref)}" ${f.kind === 'project' && f.value === n.ref ? 'selected' : ''}>${esc(n.label)}</option>`).join('')}</select>
      </div>`;
  }

  /* ---------------- 상세 패널 ---------------- */
  function panelHTML(g, n) {
    if (!n) return '';
    const T = TYPES[n.type]; const d = n.data || {};
    const counts = TYPE_ORDER.map((t) => [t, [...n.nb].filter((m) => m.type === t).length]).filter(([, c]) => c).map(([t, c]) => `${TYPES[t].label} ${c}`).join(' · ');
    let body = ''; let links = '';
    if (n.type === 'exp') {
      const src = (App.wiki.THREAD_LABEL && App.wiki.THREAD_LABEL[d.label]) || (App.wiki.SOURCE_LABEL && App.wiki.SOURCE_LABEL[d.source]) || '';
      body = `${d.question ? `<div class="gr-q">${esc(clip(d.question, 80))}</div>` : ''}<p class="gr-text">${esc(clip(d.text, 180))}</p>
        <div class="subtle">${esc([d.date, src].filter(Boolean).join(' · '))}</div>`;
      links = `<a class="btn btn-sm btn-primary" href="#/ask/${encodeURIComponent(n.ref)}">대화 보기</a>`;
    } else if (n.type === 'card') {
      const s = d.star || {};
      body = `<p class="gr-text">${esc(clip(d.summary || s.situation || s.action || '아직 요약이 없어요.', 180))}</p>
        ${arr(d.keywords).length ? `<div class="gr-kws">${arr(d.keywords).map((k) => App.ui.keywordChip(k)).join('')}</div>` : ''}`;
      links = `<a class="btn btn-sm btn-primary" href="#/card/${encodeURIComponent(n.ref)}">경험 카드 열기</a>`;
    } else if (n.type === 'project') {
      body = `<p class="gr-text">${esc(clip(d.summary || d.description || d.title || '', 160))}</p>`;
      links = `<a class="btn btn-sm btn-primary" href="#/vault/p/${encodeURIComponent(n.ref)}">프로젝트 열기</a>`;
    } else if (n.type === 'kw') {
      const k = App.keywords.get(n.ref);
      const cardsOf = arr(App.store.state.experiences).filter((c) => arr(c.keywords).includes(n.ref) || n.nb.has(g.byId['card:' + c.id]));
      body = `<div class="gr-kws">${App.ui.keywordChip(n.ref)}</div><p class="gr-text">${esc(k.desc || '')}</p>`;
      links = cardsOf.length ? `<div class="gr-sub">이 역량이 담긴 경험 카드</div><div class="gr-cardlinks">${cardsOf.map((c) => `<a href="#/card/${encodeURIComponent(c.id)}">${esc(clip(String(c.title || '').split(' — ')[0], 30))}</a>`).join('')}</div>` : '<div class="subtle">아직 이 역량이 담긴 경험 카드가 없어요.</div>';
    } else if (n.type === 'code') {
      body = `<p class="gr-text">${esc(clip(d.summary || d.detail || d.desc || '', 160))}</p>${d.category ? `<div class="subtle">${esc(d.category)}</div>` : ''}`;
      links = n.projectId ? `<a class="btn btn-sm btn-primary" href="#/vault/p/${encodeURIComponent(n.projectId)}?tab=code">코드 분석 보기</a>` : '';
    }
    const nbs = [...n.nb].sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) || b.deg - a.deg);
    return `<div class="gr-ph">
        <span class="gr-type"><span class="gr-dot" style="background:${T.color}"></span>${T.label}</span>
        <button type="button" class="gr-x" data-gclose aria-label="닫기">×</button></div>
      <h3 class="gr-title">${esc(n.type === 'kw' ? '#' + n.label : n.type === 'card' ? (d.title || n.label) : n.label)}</h3>
      ${body}
      <div class="gr-meta">연결 ${n.nb.size}개${counts ? ' — ' + esc(counts) : ''}</div>
      <div class="gr-links">${links}</div>
      ${nbs.length ? `<div class="gr-sub">이어진 것</div><div class="gr-nbs">${nbs.slice(0, 40).map((m) => `<button type="button" class="gr-nb" data-gfocus="${esc(m.id)}"><span class="gr-dot" style="background:${TYPES[m.type].color}"></span><span class="gr-nb-t">${esc(TYPES[m.type].label)}</span><span class="gr-nb-l">${esc(clip(m.label, 34))}</span></button>`).join('')}${nbs.length > 40 ? `<div class="subtle">외 ${nbs.length - 40}개</div>` : ''}</div>` : ''}`;
  }

  /* ---------------- 화면 ---------------- */
  App.screens.graph = {
    title: '경험 그래프',
    render() {
      const head = `<div class="page-head gr-head"><h1>경험 그래프</h1>
        <p>AI와 나눈 대화가 모두 경험이 되고, 경험이 모여 경험 카드가 돼요. 역량·프로젝트·코드 분석과 어떻게 이어지는지 한눈에 봐요.</p></div>`;
      let g; try { g = buildGraph(); } catch (e) { g = { nodes: [], edges: [], byId: {}, hasExp: false }; }
      if (!g.hasExp) {
        return `<div class="page gr-page">${head}<div class="card empty"><div class="big">◉</div>아직 그래프에 올릴 경험이 없어요.<br />질문함에서 AI와 이야기를 나누면 여기에 경험이 하나씩 생겨요.
          <div style="margin-top:14px"><a class="btn btn-primary" href="#/ask">질문함으로 가기</a></div></div></div>`;
      }
      return `<div class="page gr-page">${head}
        <div class="gr-filters" data-gfilters></div>
        <div class="card gr-stage" data-gstage>
          <canvas class="gr-canvas" data-gcanvas aria-label="경험 그래프"></canvas>
          <div class="gr-zoom">
            <button type="button" class="btn btn-sm" data-gzoom="in" aria-label="확대">＋</button>
            <button type="button" class="btn btn-sm" data-gzoom="out" aria-label="축소">－</button>
            <button type="button" class="btn btn-sm" data-gzoom="fit">맞추기</button>
          </div>
          <div class="gr-legend">${TYPE_ORDER.map((t) => `<span><span class="gr-dot" style="background:${TYPES[t].color}"></span>${TYPES[t].label}</span>`).join('')}</div>
          <div class="gr-hint subtle">드래그로 옮기고, 휠로 확대해요</div>
          <aside class="gr-panel" data-gpanel hidden></aside>
        </div>
      </div>`;
    },

    mount(root) {
      const canvas = root.querySelector('[data-gcanvas]');
      if (!canvas) return null;
      const stage = root.querySelector('[data-gstage]');
      const panel = root.querySelector('[data-gpanel]');
      const filtersEl = root.querySelector('[data-gfilters]');
      const ctx = canvas.getContext('2d');
      const g = buildGraph();
      const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const font = getComputedStyle(document.body).fontFamily || 'Pretendard Variable, sans-serif';
      const css = getComputedStyle(document.documentElement);
      const surface = (css.getPropertyValue('--surface') || '#fff').trim() || '#fff';
      const textColor = (css.getPropertyValue('--text') || '#1f1d1a').trim() || '#1f1d1a';

      let W = 0, H = 0, dpr = 1;
      let view = ui.view ? Object.assign({}, ui.view) : null; // { x, y, k }: screen = world * k + (x, y)
      let viewTo = null;
      let alpha = 1, alphaTarget = 0;
      let raf = 0, dirty = true, alive = true;
      let hover = null, selected = ui.selected && g.byId[ui.selected] ? g.byId[ui.selected] : null;
      let active = activeSet(g, ui.filter);
      let autoFit = !ui.view; // 처음 열 때: 자리 잡으면 한 번 화면에 맞춘다 (사용자가 만지면 취소)

      /* 초기 위치: 캐시가 있으면 그대로, 없으면 유형별 고리 + 이웃 근처 */
      const RING = { project: 60, card: 150, kw: 260, code: 200, exp: 220 };
      let cached = 0;
      g.nodes.forEach((n, i) => {
        const p = ui.pos[n.id];
        if (p) { n.x = p.x; n.y = p.y; cached++; }
        else { const a = (i / g.nodes.length) * Math.PI * 2 * 7.3 + Math.random() * 0.4; const r = RING[n.type] * (0.8 + Math.random() * 0.4); n.x = Math.cos(a) * r; n.y = Math.sin(a) * r; }
        n.vx = 0; n.vy = 0; n.fx = null; n.fy = null;
      });
      g.nodes.forEach((n) => { // 새 노드는 이미 놓인 이웃 근처에서 시작
        if (ui.pos[n.id]) return;
        const placed = [...n.nb].find((m) => ui.pos[m.id]);
        if (placed) { n.x = placed.x + (Math.random() - 0.5) * 40; n.y = placed.y + (Math.random() - 0.5) * 40; }
      });
      const mostlyCached = cached > g.nodes.length * 0.8;
      if (mostlyCached) alpha = 0.12;

      // 엣지 스프링 강도 (d3 forceLink 방식)
      g.edges.forEach((e) => { e.str = 1 / Math.min(e.s.nb.size, e.t.nb.size); e.bias = e.s.nb.size / (e.s.nb.size + e.t.nb.size); });

      function tick() {
        const ns = g.nodes, N = ns.length;
        // 스프링
        for (const e of g.edges) {
          const s = e.s, t = e.t;
          let x = t.x + t.vx - s.x - s.vx, y = t.y + t.vy - s.y - s.vy;
          let l = Math.sqrt(x * x + y * y) || 0.01;
          l = (l - e.rest) / l * alpha * e.str * 0.9;
          x *= l; y *= l;
          t.vx -= x * e.bias; t.vy -= y * e.bias;
          s.vx += x * (1 - e.bias); s.vy += y * (1 - e.bias);
        }
        // 반발력 (n ≈ 100 → 직접 계산)
        for (let i = 0; i < N; i++) {
          const a = ns[i];
          for (let j = i + 1; j < N; j++) {
            const b = ns[j];
            let dx = b.x - a.x, dy = b.y - a.y; let d2 = dx * dx + dy * dy;
            if (d2 > 360000) continue;
            if (d2 < 1) { dx = (Math.random() - 0.5) || 0.5; dy = (Math.random() - 0.5) || 0.5; d2 = dx * dx + dy * dy; }
            const minD = a.r + b.r + 4; if (d2 < minD * minD) d2 = Math.max(d2, minD * minD * 0.6);
            const fa = b.charge * alpha / d2, fb = a.charge * alpha / d2;
            a.vx += dx * fa; a.vy += dy * fa;
            b.vx -= dx * fb; b.vy -= dy * fb;
          }
        }
        // 중심 중력 + 감쇠 + 이동
        for (const n of ns) {
          n.vx -= n.x * 0.035 * alpha; n.vy -= n.y * 0.035 * alpha;
          if (n.fx != null) { n.x = n.fx; n.y = n.fy; n.vx = 0; n.vy = 0; continue; }
          n.vx *= 0.62; n.vy *= 0.62;
          n.x += n.vx; n.y += n.vy;
        }
        alpha += (alphaTarget - alpha) * 0.0228;
      }

      if (reduced) { for (let i = 0; i < 320 && alpha > 0.002; i++) tick(); alpha = 0; }
      else if (!mostlyCached) { for (let i = 0; i < 60; i++) tick(); }

      /* 크기 · 좌표 */
      function resize() {
        const r = stage.getBoundingClientRect();
        dpr = Math.max(1, window.devicePixelRatio || 1);
        W = Math.max(1, r.width); H = Math.max(1, r.height);
        canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
        canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
        if (view && ui.vw && Math.abs(ui.vw - W) > 40) { view = null; ui.vw = 0; } // 저장된 화면과 크기가 다르면 다시 맞춘다
        if (!view) fit(true);
        kick();
      }
      function bounds(list) {
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        list.forEach((n) => { x0 = Math.min(x0, n.x - n.r); y0 = Math.min(y0, n.y - n.r); x1 = Math.max(x1, n.x + n.r); y1 = Math.max(y1, n.y + n.r); });
        return { x0, y0, x1, y1 };
      }
      function fit(instant) {
        if (!g.nodes.length) return;
        const list = active && active.size ? [...active] : g.nodes;
        const b = bounds(list); const pad = 70;
        const panelW = !panel.hidden && W > 720 ? Math.min(320, W * 0.4) : 0;
        const aw = W - panelW;
        const k = Math.max(0.2, Math.min(2.2, Math.min((aw - pad * 2) / Math.max(1, b.x1 - b.x0), (H - pad * 2) / Math.max(1, b.y1 - b.y0))));
        const v = { k, x: aw / 2 - ((b.x0 + b.x1) / 2) * k, y: H / 2 - ((b.y0 + b.y1) / 2) * k };
        if (instant || reduced || !view) { view = v; viewTo = null; } else viewTo = v;
        kick();
      }
      function zoomAt(sx, sy, factor) {
        const base = viewTo || view;
        const k = Math.max(0.15, Math.min(4, base.k * factor));
        const wx = (sx - base.x) / base.k, wy = (sy - base.y) / base.k;
        const v = { k, x: sx - wx * k, y: sy - wy * k };
        if (reduced) { view = v; viewTo = null; } else viewTo = v;
        kick();
      }
      function centerOn(n) {
        const panelW = !panel.hidden && W > 720 ? Math.min(320, W * 0.4) : 0;
        const k = Math.max(view.k, 1);
        const v = { k, x: (W - panelW) / 2 - n.x * k, y: (H > 0 ? H / 2 : 0) - n.y * k };
        if (reduced) view = v; else viewTo = v;
        kick();
      }
      const toWorld = (sx, sy) => ({ x: (sx - view.x) / view.k, y: (sy - view.y) / view.k });
      function hit(sx, sy) {
        const p = toWorld(sx, sy); let best = null, bd = Infinity;
        for (const n of g.nodes) {
          const dx = n.x - p.x, dy = n.y - p.y; const d = Math.sqrt(dx * dx + dy * dy);
          const lim = n.r + 6 / view.k;
          if (d < lim && d < bd) { bd = d; best = n; }
        }
        return best;
      }

      /* 그리기 */
      function mix(rgb, f) { // f: 1 = 원래 색, 0 = 회색
        return `${Math.round(GRAY[0] + (rgb[0] - GRAY[0]) * f)},${Math.round(GRAY[1] + (rgb[1] - GRAY[1]) * f)},${Math.round(GRAY[2] + (rgb[2] - GRAY[2]) * f)}`;
      }
      function targets() {
        const hs = hover ? new Set([hover, ...hover.nb]) : null;
        let moving = false;
        const rate = reduced ? 1 : 0.16;
        for (const n of g.nodes) {
          const t = hs ? (hs.has(n) ? 1 : 0) : active ? (active.has(n) ? 1 : 0) : 1;
          if (Math.abs(n.focus - t) > 0.004) { n.focus += (t - n.focus) * rate; moving = true; } else n.focus = t;
        }
        for (const e of g.edges) {
          const t = hover ? (e.s === hover || e.t === hover ? 1 : 0)
            : active ? (ui.filter.kind === 'type' ? (active.has(e.s) || active.has(e.t) ? 1 : 0) : (active.has(e.s) && active.has(e.t) ? 1 : 0)) : 1;
          if (Math.abs(e.focus - t) > 0.004) { e.focus += (t - e.focus) * rate; moving = true; } else e.focus = t;
        }
        return moving;
      }
      function draw() {
        const k = view.k;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);
        const sx = (n) => n.x * k + view.x, sy = (n) => n.y * k + view.y;
        // 엣지
        ctx.lineWidth = Math.max(0.6, Math.min(1.6, k));
        for (const e of g.edges) {
          const f = e.focus; const hot = hover && f > 0.5;
          const base = TYPES[e.s.type === 'exp' ? e.t.type : e.s.type].rgb;
          ctx.strokeStyle = hot ? `rgba(${mix(TYPES[hover.type].rgb, 1)},0.7)` : `rgba(${mix(base, f * 0.55)},${0.1 + 0.32 * f})`;
          ctx.beginPath(); ctx.moveTo(sx(e.s), sy(e.s)); ctx.lineTo(sx(e.t), sy(e.t)); ctx.stroke();
        }
        // 노드 (흐린 것 먼저)
        const order = g.nodes.slice().sort((a, b) => a.focus - b.focus || a.r - b.r);
        for (const n of order) {
          const f = n.focus; const T = TYPES[n.type];
          const r = Math.max(1.8, n.r * Math.sqrt(k) * (n === hover ? 1.18 : 1));
          const x = sx(n), y = sy(n);
          if (x < -40 || y < -40 || x > W + 40 || y > H + 40) continue;
          ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${mix(T.rgb, f)},${0.25 + 0.75 * f})`; ctx.fill();
          if (n.type !== 'exp' && n.type !== 'code') { ctx.lineWidth = 1.5; ctx.strokeStyle = `rgba(255,255,255,${0.5 + 0.5 * f})`; ctx.stroke(); }
          if (n === selected) { ctx.beginPath(); ctx.arc(x, y, r + 4, 0, Math.PI * 2); ctx.lineWidth = 2; ctx.strokeStyle = `rgba(${T.rgb.join(',')},0.85)`; ctx.stroke(); }
        }
        // 라벨
        ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.lineJoin = 'round';
        const hs = hover ? new Set([hover, ...hover.nb]) : null;
        for (const n of order) {
          const big = n.type === 'card' || n.type === 'project' || n.type === 'kw';
          // 많이 축소했을 때는 경험 카드 라벨을 줄여 겹침을 막는다 (필터로 강조된 카드는 계속 보임)
          const show = (big && (n.type !== 'card' || k >= 0.6 || (active && active.has(n)))) || k > 1.45 || n === hover || n === selected || (hs && hs.has(n));
          if (!show) continue;
          const f = n.focus; if (!big && f < 0.3 && n !== selected) continue;
          const x = sx(n), y = sy(n); if (x < -80 || y < -40 || x > W + 80 || y > H + 40) continue;
          const r = Math.max(1.8, n.r * Math.sqrt(k));
          const size = n.type === 'project' ? 13 : big ? 12 : 11;
          ctx.font = `${n.type === 'project' || n === hover ? 700 : 600} ${size}px ${font}`;
          const label = n.type === 'kw' ? '#' + n.label : clip(n.label, n === hover ? 40 : 16);
          const a = n === hover ? 1 : 0.18 + 0.82 * f;
          ctx.lineWidth = 3.5; ctx.strokeStyle = surface; ctx.globalAlpha = a;
          ctx.strokeText(label, x, y + r + 3);
          ctx.fillStyle = f > 0.5 ? textColor : '#9c978f';
          ctx.fillText(label, x, y + r + 3);
          ctx.globalAlpha = 1;
        }
      }

      function frame() {
        raf = 0; if (!alive) return;
        let busy = false;
        if (alpha > 0.002 || alphaTarget > 0) { tick(); busy = true; }
        if (viewTo) {
          const r = 0.22;
          view = { k: view.k + (viewTo.k - view.k) * r, x: view.x + (viewTo.x - view.x) * r, y: view.y + (viewTo.y - view.y) * r };
          if (Math.abs(view.k - viewTo.k) < 0.001 && Math.abs(view.x - viewTo.x) < 0.3 && Math.abs(view.y - viewTo.y) < 0.3) { view = viewTo; viewTo = null; }
          busy = true;
        }
        if (autoFit && alpha < 0.08) { autoFit = false; fit(false); busy = true; }
        if (targets()) busy = true;
        if (busy || dirty) { draw(); dirty = false; }
        if (busy) raf = requestAnimationFrame(frame);
      }
      function kick() { dirty = true; if (!raf && alive) raf = requestAnimationFrame(frame); }
      function reheat(a) { if (reduced) { kick(); return; } alpha = Math.max(alpha, a); kick(); }

      /* 필터 · 패널 */
      function renderFilters() { filtersEl.innerHTML = filterBar(g); }
      function setFilter(kind, value) {
        ui.filter = kind === 'all' || !value && kind !== 'all' ? { kind: 'all', value: '' } : { kind, value };
        active = activeSet(g, ui.filter); hover = null;
        renderFilters();
        reheat(0.08);
      }
      function select(n, center) {
        selected = n; ui.selected = n ? n.id : null;
        if (!n) { panel.hidden = true; panel.innerHTML = ''; kick(); return; }
        panel.innerHTML = panelHTML(g, n); panel.hidden = false; panel.scrollTop = 0;
        if (center) centerOn(n);
        kick();
      }
      renderFilters();
      filtersEl.addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-gf]'); if (!b) return;
        const kind = b.getAttribute('data-gf'), value = b.getAttribute('data-gv');
        if (kind !== 'all' && ui.filter.kind === kind && ui.filter.value === value) setFilter('all'); else setFilter(kind, value);
      });
      filtersEl.addEventListener('change', (ev) => {
        const s = ev.target.closest('[data-gsel]'); if (!s) return;
        setFilter(s.getAttribute('data-gsel'), s.value);
        if (s.value) fit(false);
      });
      panel.addEventListener('click', (ev) => {
        if (ev.target.closest('[data-gclose]')) { select(null); return; }
        const b = ev.target.closest('[data-gfocus]');
        if (b && g.byId[b.getAttribute('data-gfocus')]) select(g.byId[b.getAttribute('data-gfocus')], true);
      });
      root.querySelector('.gr-zoom').addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-gzoom]'); if (!b) return;
        const z = b.getAttribute('data-gzoom');
        autoFit = false;
        if (z === 'fit') fit(false); else zoomAt(W / 2, H / 2, z === 'in' ? 1.3 : 1 / 1.3);
      });

      /* 포인터: 노드 드래그 · 배경 팬 · 핀치 줌 */
      const pts = new Map(); let gesture = null; // { mode:'node'|'pan'|'pinch', node, sx, sy, moved, vx, vy, dist, mid }
      const local = (ev) => { const r = canvas.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; };
      function setCursor() { canvas.style.cursor = gesture && gesture.moved ? 'grabbing' : hover ? 'pointer' : 'grab'; }
      function onDown(ev) {
        if (ev.button != null && ev.button !== 0 && ev.pointerType === 'mouse') return;
        canvas.setPointerCapture && canvas.setPointerCapture(ev.pointerId);
        const p = local(ev); pts.set(ev.pointerId, p);
        if (pts.size === 2) {
          const [a, b] = [...pts.values()];
          if (gesture && gesture.node) { gesture.node.fx = gesture.node.fy = null; alphaTarget = 0; }
          gesture = { mode: 'pinch', moved: true, dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
          return;
        }
        const n = hit(p.x, p.y); autoFit = false;
        gesture = { mode: n ? 'node' : 'pan', node: n, sx: p.x, sy: p.y, moved: false, vx: view.x, vy: view.y };
        if (viewTo) { view = viewTo; viewTo = null; }
        if (n) { n.fx = n.x; n.fy = n.y; }
      }
      function onMove(ev) {
        const p = local(ev);
        if (!gesture) {
          const h = hit(p.x, p.y);
          if (h !== hover) { hover = h; setCursor(); kick(); }
          return;
        }
        if (!pts.has(ev.pointerId)) return;
        pts.set(ev.pointerId, p);
        if (gesture.mode === 'pinch') {
          if (pts.size < 2) return;
          const [a, b] = [...pts.values()];
          const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1; const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
          const k = Math.max(0.15, Math.min(4, view.k * dist / gesture.dist));
          const wx = (gesture.mid.x - view.x) / view.k, wy = (gesture.mid.y - view.y) / view.k;
          view = { k, x: mid.x - wx * k, y: mid.y - wy * k };
          gesture.dist = dist; gesture.mid = mid; kick();
          return;
        }
        if (!gesture.moved && Math.hypot(p.x - gesture.sx, p.y - gesture.sy) > 4) {
          gesture.moved = true;
          if (gesture.node) { alphaTarget = reduced ? 0.05 : 0.3; alpha = Math.max(alpha, 0.3); hover = gesture.node; }
          setCursor();
        }
        if (!gesture.moved) return;
        if (gesture.node) { const w = toWorld(p.x, p.y); gesture.node.fx = w.x; gesture.node.fy = w.y; }
        else view = { k: view.k, x: gesture.vx + p.x - gesture.sx, y: gesture.vy + p.y - gesture.sy };
        kick();
      }
      function onUp(ev) {
        pts.delete(ev.pointerId);
        if (!gesture) return;
        if (gesture.mode === 'pinch') { if (!pts.size) gesture = null; return; }
        const gs = gesture; gesture = null;
        if (gs.node) { gs.node.fx = gs.node.fy = null; alphaTarget = 0; }
        if (!gs.moved && ev.type === 'pointerup') select(gs.node && gs.node === selected ? null : gs.node);
        if (ev.pointerType !== 'mouse') hover = null; else { const p = local(ev); hover = hit(p.x, p.y); }
        setCursor(); kick();
      }
      function onLeave() { if (!gesture && hover) { hover = null; setCursor(); kick(); } }
      function onWheel(ev) {
        ev.preventDefault(); autoFit = false;
        const p = local(ev);
        const dy = ev.deltaMode === 1 ? ev.deltaY * 16 : ev.deltaY;
        zoomAt(p.x, p.y, Math.exp(-dy * (ev.ctrlKey ? 0.01 : 0.0016)));
      }
      function onKey(ev) { if (ev.key === 'Escape' && selected) select(null); }

      canvas.addEventListener('pointerdown', onDown);
      canvas.addEventListener('pointermove', onMove);
      canvas.addEventListener('pointerup', onUp);
      canvas.addEventListener('pointercancel', onUp);
      canvas.addEventListener('pointerleave', onLeave);
      canvas.addEventListener('wheel', onWheel, { passive: false });
      window.addEventListener('keydown', onKey);
      let ro = null;
      if (window.ResizeObserver) { ro = new ResizeObserver(resize); ro.observe(stage); } else window.addEventListener('resize', resize);
      resize();
      if (selected) select(selected, false);
      setCursor();

      return () => {
        alive = false;
        if (raf) cancelAnimationFrame(raf); raf = 0;
        if (ro) ro.disconnect(); else window.removeEventListener('resize', resize);
        window.removeEventListener('keydown', onKey);
        g.nodes.forEach((n) => { ui.pos[n.id] = { x: n.x, y: n.y }; });
        ui.view = viewTo || view; ui.vw = W;
      };
    },
  };
})(window.App);
