/* 홈: 꾸준히 기록하기(잔디와 오늘의 질문) · 내 역량(레이더) · 이어서 대화하기 · 마감이 가까운 지원 기업 */
(function (App) {
  const esc = (s) => App.ui.esc(s); const S = App.store; const I = App.icon;

  const chatBtn = `<button type="button" class="btn btn-primary" data-chat>${I('chat', 16)}AI 채팅 시작</button>`;
  function body() {
    if (!S.projects().length) return `<div class="empty home-empty"><h1>첫 프로젝트를 만들어 보세요</h1>
      <p>팀 과제, 동아리, 아르바이트도 프로젝트예요.</p>
      <button type="button" class="btn btn-primary btn-lg" data-new>${I('plus', 16)}새 프로젝트</button></div>${appsBlock()}`;
    const blocks = recordBlock() + skillsBlock() + chatsBlock() + appsBlock();
    return `<header class="page-head"><h1>홈</h1><div class="page-head-actions">${chatBtn}</div></header>
      ${blocks || '<div class="empty"><div class="empty-title">아직 채팅이 없어요</div><p>있었던 일을 AI와 이야기하면 경험 카드가 만들어져요.</p></div>'}`;
  }

  /* ---------- 꾸준히 기록하기: 지난 1년, 하루에 남긴 기록(보낸 말, 직접·GitHub로 만든 카드) 수를 칸의 진하기로 ----------
     연속 기록일과 1년 동안 기록한 날, 그리고 오늘의 질문으로 가는 단추 */
  const DAY = 86400000;
  const dayKey = (d) => S.fmtDay(d);
  const level = (n) => (n <= 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : n <= 5 ? 3 : 4);
  function streakOf(act) {
    const today = S.parseDay(S.localDay()); let d = new Date(today); if (!act[dayKey(d)]) d = new Date(d - DAY); // 오늘 아직 없으면 어제까지
    let n = 0; while (act[dayKey(d)]) { n++; d = new Date(d - DAY); } return { n, today: !!act[dayKey(today)] };
  }
  // 오늘의 질문: 진행 중인 프로젝트 먼저, 아직 답하지 않은 방
  function todayRooms() {
    S.ensureDaily(); const ps = S.projects().slice().sort((a, b) => (a.status === b.status ? 0 : a.status === 'ongoing' ? -1 : 1));
    const rooms = ps.map((p) => S.dailyOf(p.id)).filter(Boolean); rooms.forEach((c) => App.chat.askToday(c));
    return { all: rooms, todo: rooms.filter((c) => !App.chat.answeredToday(c)), ongoing: ps.filter((p) => p.status === 'ongoing').map((p) => S.dailyOf(p.id)).filter(Boolean) };
  }
  function recordBlock() {
    const act = S.activity(); const today = S.parseDay(S.localDay());
    const start = new Date(today - 364 * DAY); start.setDate(start.getDate() - start.getDay()); // 53주 전 일요일부터
    const weeks = Math.ceil((today - start) / DAY / 7 + 1 / 7);
    let cells = ''; let months = ''; let lastMonth = -1; let days = 0;
    for (let w = 0; w < weeks; w++) {
      for (let r = 0; r < 7; r++) {
        const d = new Date(start.getTime() + (w * 7 + r) * DAY); if (d > today) { cells += '<i class="rc-cell is-out" aria-hidden="true"></i>'; continue; }
        const k = dayKey(d); const n = act[k] || 0; if (n) days++;
        if (r === 0 && d.getMonth() !== lastMonth && d.getDate() <= 7) { months += `<span style="grid-column:${w + 1}">${d.getMonth() + 1}월</span>`; lastMonth = d.getMonth(); }
        cells += `<i class="rc-cell is-l${level(n)}${k === S.localDay() ? ' is-today' : ''}" data-day="${k}" data-n="${n}"></i>`;
      }
    }
    const st = streakOf(act); const rooms = todayRooms(); const go = rooms.todo.find((c) => rooms.ongoing.includes(c)) || rooms.todo[0];
    const streak = st.n ? `<b>${st.n}일</b> 연속 기록하고 있어요` : '오늘 기록하면 연속 기록이 시작돼요';
    const nudge = !st.today && st.n ? `오늘 기록하면 ${st.n + 1}일째예요.` : st.today ? '오늘도 기록했어요.' : '';
    const legend = [0, 1, 2, 3, 4].map((l) => `<i class="rc-cell is-l${l}"></i>`).join('');
    return `<section class="section"><h2 class="section-title">꾸준히 기록하기</h2>
      <div class="panel rc">
        <div class="rc-top"><p class="rc-streak">${streak}</p><p class="rc-sum">최근 1년 동안 ${days}일 기록했어요</p></div>
        <div class="rc-scroll" data-rc-scroll><div class="rc-fig" data-rc style="--weeks:${weeks}">
          <div class="rc-months" aria-hidden="true">${months}</div>
          <div class="rc-days" aria-hidden="true"><span style="grid-row:2">월</span><span style="grid-row:4">수</span><span style="grid-row:6">금</span></div>
          <div class="rc-grid" role="img" aria-label="최근 1년 동안 ${days}일 기록, ${st.n}일 연속">${cells}</div>
          <div class="rc-tip" role="tooltip" hidden></div></div></div>
        <div class="rc-foot"><span class="rc-legend" aria-hidden="true">적게${legend}많이</span>
          <span class="rc-cta">${nudge ? `<span class="rc-nudge">${nudge}</span>` : ''}${go ? `<a class="btn btn-sm" href="#/chat/${go.id}">${I('calendar', 15)}오늘의 질문 답하기</a>` : rooms.all.length ? `<span class="rc-done">${I('check', 15)}오늘의 질문에 모두 답했어요</span>` : ''}</span></div>
      </div></section>`;
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
    return `<section class="section"><h2 class="section-title">내 역량<a class="more" href="#/timeline">경험 타임라인</a></h2>
      <div class="panel sk"><div class="sk-fig">
        <svg viewBox="0 0 ${SK.w} ${SK.h}" role="img" aria-label="역량별 경험 카드 수">${grid}${shape}${dots}</svg>${labels}
        <div class="sk-tip" role="tooltip" hidden></div></div>
        <p class="sk-note">역량마다 그 역량이 담긴 경험 카드 수예요. 이름을 누르면 그 카드들을 볼 수 있어요.${none.length ? ` 아직 카드가 없는 역량: ${none.map(esc).join(', ')}` : ''}</p>
        <table class="sr-only"><caption>역량별 경험 카드 수</caption><thead><tr><th scope="col">역량</th><th scope="col">카드 수</th></tr></thead><tbody>${data.map((d) => `<tr><th scope="row">${esc(d.k.name)}</th><td>${d.count}장</td></tr>`).join('')}</tbody></table></div></section>`;
  }

  /* ---------- 이어서 대화하기 (최근 3개) ---------- */
  function chatsBlock() {
    const chats = S.chats().filter((c) => !c.daily && S.getProject(c.projectId)).slice(0, 3); // 오늘의 질문 방은 위 「꾸준히 기록하기」에서
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
      // 잔디: 칸에 올리면 그날 기록 수. 좁은 화면에서는 최근(오른쪽)부터 보이게
      const rc = root.querySelector('[data-rc]');
      if (rc) {
        const sc = root.querySelector('[data-rc-scroll]'); sc.scrollLeft = sc.scrollWidth; const tip = rc.querySelector('.rc-tip');
        const show = (cell) => {
          if (!cell || !cell.dataset.day) { tip.hidden = true; return; }
          const d = S.parseDay(cell.dataset.day); const n = Number(cell.dataset.n);
          tip.textContent = `${d.getMonth() + 1}월 ${d.getDate()}일 ${n ? `기록 ${n}개` : '기록 없음'}`; tip.hidden = false;
          const f = rc.getBoundingClientRect(); const r = cell.getBoundingClientRect();
          tip.style.left = Math.max(0, Math.min(f.width - tip.offsetWidth, r.left - f.left + r.width / 2 - tip.offsetWidth / 2)) + 'px'; tip.style.top = (r.top - f.top - tip.offsetHeight - 6) + 'px';
        };
        rc.addEventListener('pointerover', (e) => show(e.target.closest('.rc-cell')));
        rc.addEventListener('pointerleave', () => show(null));
      }
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
