/* 경험 그래프 — #/graph
   프로젝트 · 경험 카드 · 역량의 연결. 힘으로 자리를 잡는다: 이어진 것은 용수철처럼 당기고, 서로는 밀어내고, 가운데로 중력이 끈다.
   노드를 끌면 이어진 것들이 딸려 오고, 놓으면 다시 제자리를 찾는다. 바탕을 끌면 화면이 움직인다.
   노드는 모두 button: Tab 으로 들어와 화살표로 옮기고 Enter 로 고르고 Esc 로 놓는다 */
(function (App) {
  const esc = (s) => App.ui.esc(s); const S = App.store; const I = App.icon;
  const PAD = { x: 16, top: 72, bottom: 56 }; // 판 가장자리 (위: 프로젝트 고르기, 아래: 확대 버튼)
  const ui = { me: '', project: '', pos: {} }; // 화면을 오가도 남는 것 (계정마다). pos: 자리
  const shortTitle = (e) => e.title.split(' — ')[0];

  /* ---------------- 그래프 만들기 ---------------- */
  // 프로젝트 하나를 고르면 그 프로젝트의 카드와, 그 카드들이 보여 주는 역량만
  function buildGraph(projectId) {
    const nodes = []; const byId = {}; const edges = [];
    const add = (type, ref, label) => { const n = { id: `${type}:${ref}`, type, ref, label, nb: [] }; byId[n.id] = n; nodes.push(n); return n; };
    const link = (a, b) => { if (!b || a.nb.includes(b)) return; a.nb.push(b); b.nb.push(a); edges.push([a, b]); };
    const cards = S.list().filter((e) => !projectId || e.projectId === projectId);
    S.projects().filter((p) => !projectId || p.id === projectId).forEach((p) => {
      const pn = add('project', p.id, S.projectName(p));
      cards.filter((e) => e.projectId === p.id).forEach((e) => link(add('card', e.id, shortTitle(e)), pn));
    });
    App.keywords.names().forEach((k) => {
      const mine = cards.filter((e) => e.keywords.includes(k)); if (projectId && !mine.length) return;
      const kn = add('kw', k, k); mine.forEach((e) => { const c = byId['card:' + e.id]; if (c) link(c, kn); });
    });
    return { nodes, edges, byId, of: (t) => nodes.filter((n) => n.type === t) };
  }

  /* ---------------- 힘 ---------------- */
  const REST = { project: 64, kw: 104 };       // 카드와 이어진 줄의 길이
  const CHARGE = { project: 1200, card: 380, kw: 950 }; // 밀어내는 힘
  const START = { project: 60, card: 110, kw: 190 };   // 처음 흩어 놓는 거리 (가운데서 퍼져 나간다)
  function createSim(g, pos, key, aspect) {
    const one = g.of('project').length === 1; let known = 0;
    const a2 = aspect * aspect; const gx = Math.min(0.13, 0.042 / a2), gy = Math.min(0.13, Math.max(0.02, 0.042 * a2)); const dense = aspect < 0.9 ? 0.4 : 1; // 좁은 화면은 촘촘하게
    g.nodes.forEach((n, i) => {
      const p = pos[key + n.id]; const a = i * 2.39996; const r = START[n.type] * (0.7 + ((i * 37) % 60) / 100);
      if (p) { n.x = p.x; n.y = p.y; known++; } else { n.x = Math.cos(a) * r * Math.sqrt(aspect); n.y = Math.sin(a) * r / Math.sqrt(aspect); }
      n.vx = 0; n.vy = 0; n.fx = null;
    });
    const edges = g.edges.map(([s, t]) => {
      const other = s.type === 'card' ? t : s;
      return { s, t, own: other.type === 'project', rest: REST[other.type] * (one ? 2.2 : 1) + (other.type === 'project' ? other.nb.length * 3 : 0), str: 1 / Math.min(s.nb.length, t.nb.length), bias: s.nb.length / (s.nb.length + t.nb.length) };
    });
    const sim = { alpha: known > g.nodes.length * 0.8 ? 0.15 : 1, target: 0, hit: false };
    sim.tick = () => {
      const N = g.nodes, A = sim.alpha;
      edges.forEach((e) => { // 용수철
        let x = e.t.x + e.t.vx - e.s.x - e.s.vx, y = e.t.y + e.t.vy - e.s.y - e.s.vy; const l = Math.hypot(x, y) || 0.01;
        const f = ((l - e.rest) / l) * A * e.str * (e.own ? 1.4 : 0.6); x *= f; y *= f;
        e.t.vx -= x * e.bias; e.t.vy -= y * e.bias; e.s.vx += x * (1 - e.bias); e.s.vy += y * (1 - e.bias);
      });
      for (let i = 0; i < N.length; i++) for (let j = i + 1; j < N.length; j++) { // 밀어내기
        const a = N[i], b = N[j]; let dx = b.x - a.x, dy = b.y - a.y; let d2 = dx * dx + dy * dy; if (d2 > 490000) continue;
        if (d2 < 1) { dx = (i % 2) - 0.5; dy = (j % 2) - 0.5; d2 = 1; } d2 = Math.max(d2, 400);
        const ca = a.nb.length ? CHARGE[a.type] : 60, cb = b.nb.length ? CHARGE[b.type] : 60; const lone = !a.nb.length || !b.nb.length ? 0.35 : 1; // 이어진 게 없는 역량은 멀리 밀려나지 않게
        const fa = (cb * A * lone * dense) / d2, fb = (ca * A * lone * dense) / d2; a.vx -= dx * fa; a.vy -= dy * fa; b.vx += dx * fb; b.vy += dy * fb;
      }
      N.forEach((n) => { // 가운데로 끄는 중력 + 감쇠. 화면이 넓으면 옆으로 더 퍼지게
        n.vx -= n.x * gx * A; n.vy -= n.y * gy * A;
        if (n.fx != null) { n.x = n.fx; n.y = n.fy; n.vx = n.vy = 0; return; }
        n.vx *= 0.62; n.vy *= 0.62; n.x += n.vx; n.y += n.vy;
      });
      sim.hit = false;
      for (let i = 0; i < N.length; i++) for (let j = i + 1; j < N.length; j++) { // 이름이 겹치지 않게
        const a = N[i], b = N[j]; const dx = b.x - a.x, dy = b.y - a.y; const ox = a.hw + b.hw + 8 - Math.abs(dx), oy = a.hh + b.hh + 6 - Math.abs(dy);
        if (ox <= 0.5 || oy <= 0.5) continue; sim.hit = true;
        const ma = a.fx != null ? 0 : b.fx != null ? 1 : 0.5, mb = 1 - ma; const sx = dx < 0 ? -1 : 1, sy = dy < 0 ? -1 : 1;
        if (ox < oy) { a.x -= sx * ox * 0.5 * ma; b.x += sx * ox * 0.5 * mb; } else { a.y -= sy * oy * 0.5 * ma; b.y += sy * oy * 0.5 * mb; }
      }
      sim.alpha += (sim.target - sim.alpha) * 0.024;
    };
    sim.active = () => sim.alpha > 0.004 || sim.target > 0;
    sim.settle = () => { for (let i = 0; i < 400 && sim.active(); i++) sim.tick(); for (let i = 0; i < 120 && sim.hit; i++) sim.tick(); sim.alpha = 0; };
    return sim;
  }

  /* ---------------- 화면 ---------------- */
  App.screens.graph = {
    title: '경험 그래프',
    render() {
      if (!S.list().length) return `<div class="page"><div class="empty"><div class="empty-title">아직 경험 카드가 없어요</div><p>AI와 이야기하면 카드가 만들어지고, 여기에서 이어진 모습을 볼 수 있어요.</p><button type="button" class="btn btn-primary" data-chat>${I('chat', 16)}AI 채팅 시작</button></div></div>`;
      const me = (App.auth.current() || {}).id; if (ui.me !== me) { ui.me = me; ui.project = ''; ui.pos = {}; }
      if (ui.project && !S.getProject(ui.project)) ui.project = '';
      return `<div class="gr" data-gr>
        <select class="select gr-select" data-project aria-label="프로젝트"><option value="">모든 프로젝트</option>${S.projects().map((p) => `<option value="${esc(p.id)}" ${p.id === ui.project ? 'selected' : ''}>${esc(S.projectName(p))}</option>`).join('')}</select>
        <div class="gr-stage" data-stage></div>
        <ul class="gr-legend" aria-hidden="true"><li><i class="is-project"></i>프로젝트</li><li><i class="is-card"></i>경험 카드</li><li><i class="is-kw"></i>역량</li></ul>
        <div class="gr-zoom"><button type="button" class="icon-btn" data-zoom="in" aria-label="확대">${I('plus')}</button><button type="button" class="icon-btn" data-zoom="out" aria-label="축소"><span class="gr-minus"></span></button><button type="button" class="btn btn-sm btn-ghost" data-zoom="fit">맞추기</button></div>
        <aside class="gr-panel" data-panel hidden></aside>
      </div>`;
    },

    mount(root) {
      const wrap = root.querySelector('[data-gr]'); if (!wrap) return null;
      const stage = wrap.querySelector('[data-stage]'); const panel = wrap.querySelector('[data-panel]');
      let g, sim = null, view = null, W = 0, H = 0, edgeG; let selected = null; let hover = null; let raf = 0; let last = 0; let alive = true;
      let fitted = true; // 사용자가 화면을 끌거나 확대하지 않은 상태: 자리를 잡는 동안 화면이 따라간다
      const calm = window.matchMedia('(prefers-reduced-motion: reduce)');

      const aria = (n) => (n.type === 'project' ? `프로젝트 ${n.label}, 경험 카드 ${n.nb.length}개` : n.type === 'kw' ? `역량 ${n.label}, 경험 카드 ${n.nb.length}개` : `경험 카드 ${n.label}, ${n.nb.map((m) => m.label).join(', ')}`);
      const inner = (n) => (n.type === 'card' ? `<i class="gr-dot"></i><span class="gr-name">${esc(n.label)}</span>` : `<span class="gr-name">${esc(n.label)}</span>`);

      function build() {
        keep(); g = buildGraph(ui.project); sim = null; selected = null; hover = null; closePanel();
        const one = !!ui.project; g.key = ui.project + '|';
        if (!g.of('card').length && one) {
          stage.innerHTML = `<div class="empty gr-none"><div class="empty-title">이 프로젝트에는 아직 경험 카드가 없어요</div><button type="button" class="btn btn-primary" data-chat data-chat-project="${esc(ui.project)}">${I('chat', 16)}AI 채팅 시작</button></div>`;
          g.nodes = []; g.edges = []; return;
        }
        stage.innerHTML = `<svg class="gr-edges" aria-hidden="true"><g></g></svg><div class="gr-nodes ${one ? 'is-one' : ''}" role="group" aria-label="프로젝트, 경험 카드, 역량의 연결. 화살표로 옮기고 Enter로 고를 수 있어요">${g.nodes.map((n, i) => `<button type="button" class="gr-node is-${n.type} ${n.type === 'kw' && !n.nb.length ? 'is-none' : ''}" data-i="${i}" ${n.type === 'kw' ? `style="--n:${Math.min(8, n.nb.length)}"` : ''} tabindex="${i ? -1 : 0}" aria-pressed="false" aria-label="${esc(aria(n))}">${inner(n)}</button>`).join('')}</div>`;
        g.nodes.forEach((n, i) => { n.el = stage.querySelector(`[data-i="${i}"]`); n.hw = n.el.offsetWidth / 2; n.hh = n.el.offsetHeight / 2; });
        edgeG = stage.querySelector('.gr-edges g');
        edgeG.innerHTML = g.edges.map(([a, b]) => `<line class="${a.type === 'project' || b.type === 'project' ? 'is-own' : ''}" />`).join('');
        g.lines = [...edgeG.children]; view = null; fitted = true;
        sim = createSim(g, ui.pos, g.key, Math.max(0.4, (W - PAD.x * 2) / (H - PAD.top - PAD.bottom)));
        if (calm.matches || document.hidden) sim.settle(); else for (let i = 0; i < 12; i++) sim.tick();
        fit(); emphasize(); run();
      }
      // 자리를 기억해 두었다가 돌아오면 그대로 보여 준다
      function keep() { if (g && sim) g.nodes.forEach((n) => { ui.pos[g.key + n.id] = { x: n.x, y: n.y }; }); }
      function frame() {
        raf = 0; if (!alive || !sim) return;
        // 화면이 느려도 같은 빠르기로 움직인다 (밀린 만큼 여러 번, 많아야 8번)
        const now = performance.now(); const steps = Math.max(1, Math.min(8, Math.round((now - last) / 16.7))); last = now;
        for (let i = 0; i < steps && (sim.active() || sim.hit); i++) { sim.tick(); if (!sim.active() && sim.hit && ++sim.extra > 240) sim.hit = false; }
        if (fitted && !(drag && drag.node)) { const t = fitView(); const r = 1 - Math.pow(0.88, steps); view = { k: view.k + (t.k - view.k) * r, x: view.x + (t.x - view.x) * r, y: view.y + (t.y - view.y) * r }; }
        apply();
        const t = fitted && !(drag && drag.node) ? fitView() : view;
        if (sim.active() || sim.hit || Math.abs(t.x - view.x) + Math.abs(t.y - view.y) > 0.5) raf = requestAnimationFrame(frame); else keep();
      }
      function run() { if (sim) sim.extra = 0; if (!raf && alive) { last = performance.now(); raf = requestAnimationFrame(frame); } }

      /* 보기: 화면 = 판 × k + (x, y) */
      function fitView() {
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; g.nodes.forEach((n) => { x0 = Math.min(x0, n.x - n.hw); x1 = Math.max(x1, n.x + n.hw); y0 = Math.min(y0, n.y - n.hh); y1 = Math.max(y1, n.y + n.hh); });
        const aw = W - PAD.x * 2, ah = H - PAD.top - PAD.bottom; const k = Math.max(W < 600 ? 0.68 : 0.3, Math.min(1.25, aw / Math.max(1, x1 - x0), ah / Math.max(1, y1 - y0))); // 좁은 화면에서는 글자가 읽히는 크기까지만 줄이고 끌어서 본다
        return { k, x: W / 2 - ((x0 + x1) / 2) * k, y: PAD.top + ah / 2 - ((y0 + y1) / 2) * k };
      }
      function fit() { if (!g.nodes.length) return; fitted = true; if (!view || calm.matches) view = fitView(); apply(); run(); }
      function zoomAt(sx, sy, factor) {
        const k = Math.max(0.2, Math.min(4, view.k * factor)); const wx = (sx - view.x) / view.k, wy = (sy - view.y) / view.k;
        view = { k, x: sx - wx * k, y: sy - wy * k }; fitted = false; apply();
      }
      function apply() {
        if (!g.nodes.length) return;
        const s = Math.min(1, view.k);
        g.lines.forEach((l, i) => { const [a, b] = g.edges[i]; l.setAttribute('x1', a.x); l.setAttribute('y1', a.y); l.setAttribute('x2', b.x); l.setAttribute('y2', b.y); });
        g.nodes.forEach((n) => { n.el.style.transform = `translate(-50%, -50%) translate(${n.x * view.k + view.x}px, ${n.y * view.k + view.y}px) scale(${s})`; });
        edgeG.setAttribute('transform', `translate(${view.x} ${view.y}) scale(${view.k})`);
        labels();
      }
      // 확대하면 자리가 있는 카드부터 이름을 보여 준다
      function labels() {
        if (ui.project) return; const on = view.k >= 1.5; if (!on && !labels.on) return; labels.on = on; const boxes = g.nodes.map((n) => ({ n, x0: n.x * view.k - n.hw, x1: n.x * view.k + n.hw, y0: n.y * view.k - n.hh, y1: n.y * view.k + n.hh }));
        g.of('card').forEach((n) => {
          const w = Math.min(160, n.label.length * 12 + 12) / 2; const b = { n, x0: n.x * view.k - w, x1: n.x * view.k + w, y0: n.y * view.k + 8, y1: n.y * view.k + 34 };
          const ok = on && !boxes.some((o) => o.n !== n && o.x0 < b.x1 && o.x1 > b.x0 && o.y0 < b.y1 && o.y1 > b.y0);
          if (ok) boxes.push(b); n.el.classList.toggle('is-named', ok);
        });
      }
      const atEdge = (n) => { const x = n.x * view.k + view.x; n.el.classList.toggle('is-left', x > W - 110); n.el.classList.toggle('is-right', x < 110); };

      /* 고르기 */
      function emphasize() {
        const n = hover || selected; const near = n ? new Set([n, ...n.nb, ...(n.type === 'card' ? [] : n.nb.flatMap((c) => c.nb.filter((m) => m.type !== n.type)))]) : null;
        g.nodes.forEach((m) => { m.el.classList.toggle('is-dim', !!near && !near.has(m)); m.el.classList.toggle('is-on', m === selected); m.el.setAttribute('aria-pressed', String(m === selected)); if (m === n && m.type === 'card') atEdge(m); });
        g.lines.forEach((l, i) => { const e = g.edges[i]; l.classList.toggle('is-kw', !!n && n.type === 'kw'); const hot = !!n && (e.includes(n) || (n.type !== 'card' && near.has(e[0]) && near.has(e[1]) && n.nb.includes(e[0].type === 'card' ? e[0] : e[1]))); l.classList.toggle('is-hot', hot && e.includes(n)); l.classList.toggle('is-dim', !!n && !hot); });
      }
      function select(n) { selected = n; emphasize(); if (n) { openPanel(n); reveal(n); } else closePanel(); }
      function closePanel() { panel.hidden = true; panel.innerHTML = ''; }
      function openPanel(n) {
        const close = `<button type="button" class="icon-btn" data-close aria-label="닫기">${I('close')}</button>`; let body = '';
        if (n.type === 'card') {
          const e = S.get(n.ref); if (!e) return;
          body = `<div class="gr-panel-top">${App.ui.projChip(e.projectId)}${close}</div><h2>${esc(e.title)}</h2>${e.resumeLine || e.summary ? `<p>${esc(e.resumeLine || e.summary)}</p>` : ''}
            <a class="btn btn-sm" href="#/card/${encodeURIComponent(e.id)}">열기</a>`;
        } else {
          const cards = n.nb.map((c) => S.get(c.ref)).filter(Boolean); const project = n.type === 'project';
          body = `<div class="gr-panel-top"><h2>${esc(n.label)}</h2>${close}</div>
            ${cards.length ? `<div class="list gr-panel-list">${cards.map((e) => `<a class="list-row" href="#/card/${encodeURIComponent(e.id)}"><span class="list-row-main"><span class="list-row-title">${esc(shortTitle(e))}</span>${project ? '' : `<span class="list-row-sub">${App.ui.projChip(e.projectId)}</span>`}</span></a>`).join('')}</div>` : '<p>아직 경험 카드가 없어요.</p>'}
            ${project ? `<a class="btn btn-sm" href="#/vault/p/${encodeURIComponent(n.ref)}">프로젝트 열기</a>` : cards.length ? '' : `<button type="button" class="btn btn-sm" data-chat data-chat-kw="${esc(n.ref)}">AI 채팅으로 찾기</button>`}`;
        }
        panel.innerHTML = body; panel.hidden = false; panel.setAttribute('aria-label', n.label); panel.scrollTop = 0;
      }
      const nodeOf = (t) => { const b = t && t.closest && t.closest('.gr-node'); return b ? g.nodes[+b.dataset.i] : null; };
      function focusNode(n) { g.nodes.forEach((m) => { m.el.tabIndex = m === n ? 0 : -1; }); n.el.focus({ preventScroll: true }); reveal(n); }
      function reveal(n) { // 화면 밖이면 끌어온다
        const pr = panel.hidden ? null : panel.getBoundingClientRect(); const sheet = pr && pr.width > W * 0.6; // 좁은 화면에서는 패널이 아래에 깔린다
        const right = W - 50 - (pr && !sheet ? pr.width + 24 : 0), bottom = H - 30 - (sheet ? pr.height + 8 : 0);
        const x = n.x * view.k + view.x, y = n.y * view.k + view.y; const dx = Math.max(0, 40 - x) - Math.max(0, x - right), dy = Math.max(0, PAD.top - y) - Math.max(0, y - bottom);
        if (dx || dy) { view = { k: view.k, x: view.x + dx, y: view.y + dy }; fitted = false; apply(); }
      }

      /* 끌기 · 두 손가락 확대 */
      const pts = new Map(); let drag = null; let moved = false;
      const local = (ev) => { const r = stage.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; };
      const two = () => { const [a, b] = [...pts.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; };
      stage.addEventListener('pointerdown', (ev) => {
        if (!g.nodes.length || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
        pts.set(ev.pointerId, local(ev)); if (pts.size === 1) moved = false;
        if (drag && drag.node) letGo();
        drag = pts.size === 2 ? two() : Object.assign(local(ev), { grab: nodeOf(ev.target) });
      });
      // 노드를 놓는다: 다시 용수철과 중력이 끌어간다
      function letGo() { const n = drag && drag.node; if (!n) return; n.fx = null; sim.target = 0; drag = null; run(); }
      stage.addEventListener('pointermove', (ev) => {
        const p = local(ev);
        if (!pts.has(ev.pointerId)) { if (ev.pointerType === 'mouse') { const n = nodeOf(ev.target); if (n !== hover) { hover = n; if (g.nodes.length) emphasize(); } } return; }
        pts.set(ev.pointerId, p);
        if (pts.size === 2) { const t = two(); view = { k: view.k, x: view.x + t.x - drag.x, y: view.y + t.y - drag.y }; moved = true; zoomAt(t.x, t.y, t.d / drag.d); drag = t; return; }
        if (!moved && Math.hypot(p.x - drag.x, p.y - drag.y) < 5) return;
        if (!moved) {
          moved = true; hover = drag.grab || null; emphasize();
          if (drag.grab) { drag.node = drag.grab; sim.target = 0.3; sim.alpha = Math.max(sim.alpha, 0.3); }
          stage.classList.add('is-drag'); try { stage.setPointerCapture(ev.pointerId); } catch (e) { /* 이미 뗀 포인터 */ }
        }
        if (drag.node) { drag.node.fx = (p.x - view.x) / view.k; drag.node.fy = (p.y - view.y) / view.k; run(); return; }
        view = { k: view.k, x: view.x + p.x - drag.x, y: view.y + p.y - drag.y }; drag = p; fitted = false; apply();
      });
      const onUp = (ev) => { pts.delete(ev.pointerId); const threw = drag && drag.node; if (threw) { letGo(); hover = ev.pointerType === 'mouse' && ev.type === 'pointerup' ? nodeOf(document.elementFromPoint(ev.clientX, ev.clientY)) : null; emphasize(); } if (pts.size === 1) drag = [...pts.values()][0]; if (!pts.size) { drag = null; setTimeout(() => { moved = false; }, 0); stage.classList.remove('is-drag'); } };
      stage.addEventListener('dragstart', (ev) => ev.preventDefault());
      stage.addEventListener('pointerup', onUp); stage.addEventListener('pointercancel', onUp);
      stage.addEventListener('pointerleave', () => { if (hover && !(drag && drag.node)) { hover = null; emphasize(); } });
      stage.addEventListener('wheel', (ev) => {
        if (!g.nodes.length) return; ev.preventDefault(); const p = local(ev); const dy = ev.deltaMode === 1 ? ev.deltaY * 16 : ev.deltaY;
        zoomAt(p.x, p.y, Math.exp(-dy * (ev.ctrlKey ? 0.01 : 0.0016)));
      }, { passive: false });

      stage.addEventListener('click', (ev) => {
        if (!g.nodes.length) return; if (moved) { moved = false; return; }
        const n = nodeOf(ev.target); if (n) focusNode(n); select(n && n !== selected ? n : null);
      });
      stage.addEventListener('focusin', (ev) => { const n = nodeOf(ev.target); if (n && n.el.matches(':focus-visible')) { hover = n; emphasize(); } });
      stage.addEventListener('focusout', () => { if (hover) { hover = null; emphasize(); } });
      stage.addEventListener('keydown', (ev) => {
        const n = nodeOf(ev.target); const d = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[ev.key]; if (!n || !d) return;
        ev.preventDefault(); let best = null;
        g.nodes.forEach((m) => { const x = m.x - n.x, y = m.y - n.y; const along = x * d[0] + y * d[1]; if (m === n || along <= 1) return; const cost = along + Math.abs(x * d[1] + y * d[0]) * 2; if (!best || cost < best.cost) best = { m, cost }; });
        if (best) focusNode(best.m);
      });
      const onKey = (ev) => { if (ev.key !== 'Escape' || !selected || document.querySelector('.modal-backdrop')) return; const n = selected; select(null); focusNode(n); };
      wrap.addEventListener('keydown', onKey);
      panel.addEventListener('click', (ev) => { if (ev.target.closest('[data-close]')) { const n = selected; select(null); if (n) focusNode(n); } });

      wrap.querySelector('[data-project]').onchange = (ev) => { ui.project = ev.target.value; build(); };
      wrap.querySelector('.gr-zoom').onclick = (ev) => { const b = ev.target.closest('[data-zoom]'); if (!b || !g.nodes.length) return; if (b.dataset.zoom === 'fit') fit(); else zoomAt(W / 2, H / 2, b.dataset.zoom === 'in' ? 1.35 : 1 / 1.35); };

      function size() {
        const r = stage.getBoundingClientRect(); if (!r.width || !r.height) return; const first = !W; const changed = Math.abs(r.width - W) > 1 || Math.abs(r.height - H) > 1; if (!changed) return;
        W = r.width; H = r.height; if (first) build(); else if (fitted) fit(); else apply();
      }
      const ro = new ResizeObserver(() => { if (stage.isConnected) size(); }); ro.observe(stage); size();
      // 글꼴이 늦게 오면 이름 너비가 달라진다
      if (document.fonts && document.fonts.status !== 'loaded') document.fonts.ready.then(() => { if (!alive || !sim) return; g.nodes.forEach((n) => { n.hw = n.el.offsetWidth / 2; n.hh = n.el.offsetHeight / 2; }); sim.alpha = Math.max(sim.alpha, 0.2); run(); });
      return () => { alive = false; if (raf) cancelAnimationFrame(raf); keep(); ro.disconnect(); };
    },
  };
})(window.App);
