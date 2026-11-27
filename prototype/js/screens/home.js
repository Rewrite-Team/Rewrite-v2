/* 홈: 내 역량(레이더) · 이어서 대화하기 · 마감이 가까운 지원 기업 */
(function (App) {
  const esc = (s) => App.ui.esc(s); const S = App.store; const I = App.icon;

  const chatBtn = `<button type="button" class="btn btn-primary" data-chat>${I('chat', 16)}AI 채팅 시작</button>`;
  function body() {
    if (!S.projects().length) return `<div class="empty home-empty"><h1>첫 프로젝트를 만들어 보세요</h1>
      <p>팀 과제, 동아리, 아르바이트도 프로젝트예요.</p>
      <button type="button" class="btn btn-primary btn-lg" data-new>${I('plus', 16)}새 프로젝트</button></div>${appsBlock()}`;
    const blocks = skillsBlock() + chatsBlock() + appsBlock();
    return `<header class="page-head"><h1>홈</h1><div class="page-head-actions">${chatBtn}</div></header>
      ${blocks || '<div class="empty"><div class="empty-title">아직 채팅이 없어요</div><p>있었던 일을 AI와 이야기하면 경험 카드가 만들어져요.</p></div>'}`;
  }

  /* ---------- 내 역량: 정해 둔 12개 역량마다 그 역량이 담긴 경험 카드 수 ----------
     점수를 지어내지 않고 카드 수를 그대로 보여 준다. 축 이름을 누르면 그 역량의 카드 목록으로 */
  const SK = { w: 600, h: 452, cx: 300, cy: 226, r: 150 };
  function skillsBlock() {
    const cards = S.list(); if (!cards.length) return '';
    const ks = App.keywords.all(); const n = ks.length;
    const data = ks.map((k) => ({ k, count: cards.filter((e) => e.keywords.includes(k.name)).length }));
    const top = Math.max(4, ...data.map((d) => d.count)); const rings = top <= 6 ? top : 4; // 눈금: 카드 수가 적으면 한 장마다, 많으면 4칸
    const at = (i, v) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; return [SK.cx + Math.cos(a) * SK.r * v, SK.cy + Math.sin(a) * SK.r * v]; };
    const poly = (v) => data.map((d, i) => at(i, typeof v === 'function' ? v(d) : v).map((x) => x.toFixed(1)).join(',')).join(' ');
    const grid = Array.from({ length: rings }, (_, j) => `<polygon class="sk-ring ${j === rings - 1 ? 'is-out' : ''}" points="${poly((j + 1) / rings)}"/>`).join('')
      + data.map((d, i) => { const [x, y] = at(i, 1); return `<line class="sk-spoke" x1="${SK.cx}" y1="${SK.cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; }).join('');
    const shape = `<polygon class="sk-area" points="${poly((d) => d.count / top)}"/>`;
    const dots = data.map((d, i) => { const [x, y] = at(i, d.count / top); return `<circle class="sk-dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5"/>`; }).join('');
    // 축 이름과 카드 수: 그림 밖에, 축 방향에 맞춰 붙인다
    const labels = data.map((d, i) => {
      const [x, y] = at(i, 1.1); const dx = x - SK.cx; const al = Math.abs(dx) < 8 ? (y < SK.cy ? 'top' : 'bottom') : dx > 0 ? 'start' : 'end'; // 라벨이 축 끝에 붙는 쪽
      return `<a class="sk-label is-${al}" href="#/vault?view=cards&kw=${encodeURIComponent(d.k.name)}" style="left:${(x / SK.w * 100).toFixed(2)}%;top:${(y / SK.h * 100).toFixed(2)}%" data-sk="${i}" aria-label="${esc(d.k.name)}: 경험 카드 ${d.count}장"><span class="sk-name">${esc(d.k.name)}</span><span class="sk-n ${d.count ? '' : 'is-zero'}">${d.count}장</span></a>`;
    }).join('');
    const none = data.filter((d) => !d.count).map((d) => d.k.name);
    return `<section class="section"><h2 class="section-title">내 역량<a class="more" href="#/graph">경험 그래프</a></h2>
      <div class="panel sk"><div class="sk-fig">
        <svg viewBox="0 0 ${SK.w} ${SK.h}" role="img" aria-label="역량별 경험 카드 수">${grid}${shape}${dots}</svg>${labels}
        <div class="sk-tip" role="tooltip" hidden></div></div>
        <p class="sk-note">역량마다 그 역량이 담긴 경험 카드 수예요. 이름을 누르면 그 카드들을 볼 수 있어요.${none.length ? ` 아직 카드가 없는 역량: ${none.map(esc).join(', ')}` : ''}</p>
        <table class="sr-only"><caption>역량별 경험 카드 수</caption><thead><tr><th scope="col">역량</th><th scope="col">카드 수</th></tr></thead><tbody>${data.map((d) => `<tr><th scope="row">${esc(d.k.name)}</th><td>${d.count}장</td></tr>`).join('')}</tbody></table></div></section>`;
  }

  /* ---------- 이어서 대화하기 (최근 3개) ---------- */
  function chatsBlock() {
    const chats = S.chats().filter((c) => S.getProject(c.projectId)).slice(0, 3);
    if (!chats.length) return '';
    return `<section class="section"><h2 class="section-title">이어서 대화하기<a class="more" href="#/chat">전체 보기</a></h2>
      <div class="list">${chats.map((c) => `<a class="list-row home-chat" href="#/chat/${esc(c.id)}">
        <span class="list-row-title truncate">${esc(c.title)}</span>${App.ui.projChip(c.projectId)}</a>`).join('')}</div></section>`;
  }

  /* ---------- 마감이 가까운 지원 기업 (준비중, 마감이 남은 3곳) ---------- */
  const daysTo = (deadline) => Math.round((S.parseDay(deadline) - S.parseDay(S.localDay())) / 86400000);
  function appsBlock() {
    const apps = S.apps().filter((a) => a.status === 'preparing' && a.deadline && daysTo(a.deadline) >= 0)
      .sort((a, b) => a.deadline.localeCompare(b.deadline)).slice(0, 3);
    if (!apps.length) return '';
    return `<section class="section"><h2 class="section-title">마감이 가까운 지원 기업<a class="more" href="#/apply">전체 보기</a></h2>
      <div class="list">${apps.map((a) => {
        const n = daysTo(a.deadline);
        return `<a class="list-row" href="#/apply/${esc(a.id)}">
          <span class="list-row-main"><span class="list-row-title">${esc(a.company)}</span>${a.job ? `<span class="list-row-sub">${esc(a.job)}</span>` : ''}</span>
          <span class="list-row-actions"><span class="home-date">${esc(App.ui.date(a.deadline))}</span><span class="tag ${n <= 7 ? 'tag-warn' : ''}">${n ? `D-${n}` : '오늘 마감'}</span></span></a>`;
      }).join('')}</div></section>`;
  }

  App.screens.home = {
    title: '홈',
    render() { return `<div class="page page-narrow home">${body()}</div>`; },
    mount(root) {
      // 역량 축에 올리면 그 역량의 설명과 카드 수, 그림의 점도 함께 짙어진다
      const fig = root.querySelector('.sk-fig');
      if (fig) {
        const tip = fig.querySelector('.sk-tip'); const ks = App.keywords.all();
        const on = (el) => {
          fig.querySelectorAll('.sk-dot.is-on').forEach((d) => d.classList.remove('is-on')); if (!el) { tip.hidden = true; return; }
          const i = Number(el.dataset.sk); fig.querySelectorAll('.sk-dot')[i].classList.add('is-on');
          tip.innerHTML = `<b>${esc(ks[i].name)}</b><span>${esc(ks[i].desc)}</span>`; tip.hidden = false;
          const f = fig.getBoundingClientRect(); const r = el.getBoundingClientRect();
          tip.style.left = Math.max(0, Math.min(f.width - tip.offsetWidth, r.left - f.left + r.width / 2 - tip.offsetWidth / 2)) + 'px';
          tip.style.top = (r.bottom - f.top + 6 + tip.offsetHeight > f.height ? r.top - f.top - tip.offsetHeight - 6 : r.bottom - f.top + 6) + 'px';
        };
        fig.addEventListener('pointerover', (e) => on(e.target.closest('[data-sk]')));
        fig.addEventListener('pointerleave', () => on(null));
        fig.addEventListener('focusin', (e) => on(e.target.closest('[data-sk]')));
        fig.addEventListener('focusout', () => on(null));
      }
      const make = root.querySelector('[data-new]');
      if (make) make.onclick = () => App.repoFlow.openNewProject((p) => {
        if ((p.repos || []).length) App.navigate(`#/vault/p/${encodeURIComponent(p.id)}/github`); else App.startChat({ projectId: p.id });
      });
      return null;
    },
  };
})(window.App);
