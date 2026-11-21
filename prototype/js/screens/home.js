/* 홈: 하나의 흐름 — 오늘의 질문에 답하거나 ＋ 기록하기 → 위키에 반영된 변경 → 위키 점검 */
(function (App) {
  const esc = (s) => App.ui.esc(s);
  const TYPE_LABEL = { project: '프로젝트 체크인', deepen: '경험 깊이 파기', recall: '기억 떠올리기', code: '코드 분석에서 온 질문' };
  // 답변 캘린더 상태 (화면을 떠났다 와도 유지)
  let calMonth = null; // 'YYYY-MM' — null이면 이번 달
  let calSel = null;   // 'YYYY-MM-DD' — null이면 오늘
  const WEEK = ['월', '화', '수', '목', '금', '토', '일'];
  const STATUS_CHIP = { answered: ['답변함', 'is-answered'], skipped: ['건너뜀', 'is-skipped'], later: ['나중에', 'is-later'], pending: ['아직 안 답함', 'is-pending'] };

  function greetWord() {
    const h = new Date().getHours();
    if (h < 6) return '늦은 밤이에요';
    if (h < 11) return '좋은 아침이에요';
    if (h < 17) return '좋은 오후예요';
    return '오늘 하루 수고했어요';
  }
  const daily = () => App.screens.daily || {};
  const destOf = (q) => (daily().destOf ? daily().destOf(q) : null);
  const wentOf = (q) => (daily().wentOf ? daily().wentOf(q) : []);

  function todayCard() {
    const pending = App.store.pending();
    const q = pending[0];
    if (!q) {
      return `<section class="card home-today home-today-done">
        <div class="home-today-head"><span class="home-pill home-pill-done">✓ 오늘 질문 완료</span></div>
        <h2 class="home-today-q">오늘 도착한 질문에 모두 답했어요.</h2>
        <p class="home-today-hint">떠오른 일이 있으면 ＋ 기록하기로 한 줄 남겨 두세요. 위키가 알아서 맞는 경험에 반영해요.</p>
        <div class="home-today-actions">
          <a class="btn btn-ghost" href="#/daily">지난 답변 보기</a>
        </div>
      </section>`;
    }
    const d = destOf(q);
    // 답변은 오늘의 질문 화면 한 곳에서만 받는다. 홈은 미리보기 + 바로가기
    return `<section class="card home-today" data-href="#/daily">
      <div class="home-today-head">
        <span class="home-pill"><span class="home-pill-dot"></span>오늘의 질문</span>
        <span class="subtle">${q.type === 'code' ? '⌥ ' : ''}${esc(TYPE_LABEL[q.type] || '질문')} · ${esc((q.askedAt || '').slice(11) || '방금')} 도착</span>
        <a class="home-today-count" href="#/daily">남은 질문 ${pending.length}개 →</a>
      </div>
      <h2 class="home-today-q">${esc(q.text)}</h2>
      ${q.hint ? `<p class="home-today-hint">💡 ${esc(q.hint)}</p>` : ''}
      <div class="home-today-foot">
        <span class="subtle home-today-merge">${d ? `→ ${d.finding ? `코드 「${esc(App.wiki.short(d.finding, 30))}」 · ` : ''}${esc(d.text)}` : ''}</span>
        <div class="home-today-actions">
          <a class="btn btn-primary" href="#/daily">답하러 가기 →</a>
        </div>
      </div>
    </section>`;
  }

  /* ---------- 위키 최근 변경 ---------- */
  function feedBlock() {
    const list = App.wiki.entries().slice(0, 5);
    const st = App.wiki.stats();
    const kept = App.wiki.threadsFor ? App.wiki.threadsFor({ kind: 'kept' }).length : 0;
    return `<section class="card card-pad home-feed">
      <div class="section-title">위키 최근 변경<a class="more" href="#/vault">경험 위키 →</a></div>
      <p class="subtle home-feed-sub">경험 ${st.pages}개 · 이번 주 반영 ${st.updatesThisWeek}번</p>
      ${kept ? `<a class="home-kept" href="#/chat">💬 보관 중인 대화 ${kept}개 → 대화 기록</a>` : ''}
      ${list.length ? `<div class="wk-feed">${list.map((e) => App.wiki.reportHTML(e, { compact: true })).join('')}</div>`
        : '<p class="home-soft">아직 반영된 기록이 없어요. 오늘의 질문에 답하거나 ＋ 기록하기로 시작해 보세요.</p>'}
    </section>`;
  }

  /* ---------- 위키 점검 (맛보기) ---------- */
  function lintIssues() { return App.wiki.lint(); }
  function lintBlock() {
    const all = lintIssues();
    const top = all.filter((i) => i.question).slice(0, 2);
    return `<section class="card card-pad home-lint">
      <div class="section-title">위키 점검<a class="more" href="#/vault">점검 전체 보기 →</a></div>
      ${top.length ? `<p class="subtle home-feed-sub">채울 곳 ${all.length}개 중 먼저 볼 것</p>
      <ul class="wk-issues">${top.map((i) => `<li class="wk-issue" data-sev="${i.severity}">
        <span class="wk-issue-dot"></span><span class="wk-issue-text">${esc(i.text)}</span>
        <span class="wk-issue-actions">
          <button type="button" class="btn btn-ghost btn-sm home-lint-later" data-home-act="ask" data-issue="${esc(i.id)}">나중에 질문으로</button>
          <button type="button" class="btn btn-primary btn-sm" data-home-act="talk" data-issue="${esc(i.id)}">바로 답하기</button>
        </span>
      </li>`).join('')}</ul>` : '<p class="subtle">지금은 비어 있는 곳이 없어요. 위키가 잘 채워져 있어요.</p>'}
    </section>`;
  }

  // 위키 점검 → 그 자리에서 AI와 대화하며 답하기. 답은 오늘의 질문(askIssue)으로도 남아 기록·캘린더에 잡힌다
  function issueSrc(qi) {
    if (qi.findingId) return { type: 'answer', question: qi.text, projectId: qi.targetProjectId, findingId: qi.findingId };
    if (qi.targetExpId) return { type: 'answer', question: qi.text, expId: qi.targetExpId, stage: qi.stage || null };
    return { type: 'answer', question: qi.text };
  }
  function answerIssue(issue) {
    if (!issue || !issue.question) return;
    const qi = issue.question;
    const hint = qi.hint || (qi.targetExpId ? '답하면 이 경험의 비어 있는 칸이 채워져요.' : '');
    App.talk.open({
      title: '위키 점검',
      ask: { text: qi.text, label: '위키 점검', hint },
      src: issueSrc(qi),
      thread: { source: 'check' },
      commit: (text, d, tid) => { const q = App.wiki.askIssue(issue); return App.store.answer(q.id, text, { decision: d, threadId: tid }); },
      onClose: () => App.rerender(),
    });
  }

  /* ---------- 답변 캘린더 ---------- */
  function dayStatus(qs) {
    if (!qs || !qs.length) return 'empty';
    const n = qs.filter((q) => q.status === 'answered').length;
    return n === qs.length ? 'all' : n > 0 ? 'part' : 'none';
  }
  function truncate(t, n) { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n) + '…' : t; }

  function calDetail(day, qs) {
    const d = App.store.parseDay(day);
    const label = `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEK[(d.getDay() + 6) % 7]})`;
    const isToday = day === App.store.localDay();
    if (!qs.length) {
      return `<div class="home-cal-detail">
        <div class="home-cal-detail-head"><b>${esc(label)}${isToday ? ' · 오늘' : ''}</b></div>
        <p class="home-cal-empty">이 날은 도착한 질문이 없었어요</p>
      </div>`;
    }
    const answered = qs.filter((q) => q.status === 'answered').length;
    return `<div class="home-cal-detail">
      <div class="home-cal-detail-head"><b>${esc(label)}${isToday ? ' · 오늘' : ''}</b><span class="subtle">질문 ${qs.length}개 · 답변 ${answered}개</span></div>
      <ul class="home-cal-list">${qs.map((q) => {
        const chip = STATUS_CHIP[q.status] || STATUS_CHIP.pending;
        const went = wentOf(q);
        const open = q.status === 'pending' || q.status === 'later';
        return `<li class="home-cal-item">
          <div class="home-cal-item-top">
            <span class="home-cal-type">${esc(TYPE_LABEL[q.type] || '질문')}</span>
            <span class="home-cal-chip ${chip[1]}">${esc(chip[0])}</span>
          </div>
          <p class="home-cal-q">${esc(q.text)}</p>
          ${q.status === 'answered' && q.answer ? `<p class="home-cal-ans">“${esc(truncate(q.answer, 80))}”</p>` : ''}
          ${went.length || open ? `<div class="home-cal-links">
            ${went.map((w) => `<a class="home-cal-link" href="${esc(w.href)}">${esc(w.text)} →</a>`).join('')}
            ${open ? `<a class="home-cal-link home-cal-go" href="#/daily">답하러 가기 →</a>` : ''}
          </div>` : ''}
        </li>`;
      }).join('')}</ul>
    </div>`;
  }

  function calendarBlock() {
    const S = App.store;
    const todayStr = S.localDay();
    const thisMonth = todayStr.slice(0, 7);
    const month = calMonth || thisMonth;
    const sel = calSel || todayStr;
    const [y, m] = month.split('-').map(Number);
    const first = new Date(y, m - 1, 1);
    const daysIn = new Date(y, m, 0).getDate();
    const lead = (first.getDay() + 6) % 7; // 월요일 시작
    const hist = S.dayHistory();
    const streakDays = S.streakDays();
    const streakSet = new Set(streakDays);
    const streak = streakDays.length;
    const answeredToday = S.answeredDays().has(todayStr);

    const cells = [];
    for (let i = 0; i < lead; i++) cells.push('<span class="home-cal-cell is-blank" aria-hidden="true"></span>');
    for (let dd = 1; dd <= daysIn; dd++) {
      const day = `${month}-${String(dd).padStart(2, '0')}`;
      const col = (lead + dd - 1) % 7;
      const qs = hist[day] || [];
      const st = dayStatus(qs);
      const future = day > todayStr;
      const cls = ['home-cal-cell', 'st-' + st];
      if (future) cls.push('is-future');
      if (day === todayStr) cls.push('is-today');
      if (day === sel) cls.push('is-sel');
      if (streakSet.has(day)) {
        cls.push('is-streak');
        const prev = S.fmtDay(new Date(y, m - 1, dd - 1));
        const next = S.fmtDay(new Date(y, m - 1, dd + 1));
        if (!streakSet.has(prev) || col === 0 || dd === 1) cls.push('band-start');
        if (!streakSet.has(next) || col === 6 || dd === daysIn) cls.push('band-end');
      }
      const answered = qs.filter((q) => q.status === 'answered').length;
      const title = qs.length ? `질문 ${qs.length}개 중 ${answered}개 답변` : '질문 없음';
      cells.push(future
        ? `<span class="${cls.join(' ')}" aria-disabled="true"><span class="home-cal-num">${dd}</span><span class="home-cal-mark"></span></span>`
        : `<button type="button" class="${cls.join(' ')}" data-home-act="cal-day" data-day="${day}" title="${esc(title)}" aria-pressed="${day === sel}" aria-label="${m}월 ${dd}일, ${esc(title)}"><span class="home-cal-num">${dd}</span><span class="home-cal-mark"></span></button>`);
    }

    const pill = streak > 0
      ? `<span class="home-cal-streak">🔥 ${streak}일 연속</span>${answeredToday ? '' : `<span class="home-cal-nudge">오늘 답하면 ${streak + 1}일째예요</span>`}`
      : `<span class="home-cal-nudge">오늘 답하면 연속 기록이 시작돼요</span>`;

    return `<section class="card home-cal" aria-label="답변 캘린더">
      <div class="home-cal-head">
        <div class="home-cal-title"><b>답변 캘린더</b>${pill}</div>
        <div class="home-cal-nav">
          <button type="button" class="home-cal-arrow" data-home-act="cal-prev" aria-label="이전 달">‹</button>
          <span class="home-cal-month">${y}년 ${m}월</span>
          <button type="button" class="home-cal-arrow" data-home-act="cal-next" aria-label="다음 달" ${month >= thisMonth ? 'disabled' : ''}>›</button>
        </div>
      </div>
      <div class="home-cal-grid home-cal-week">${WEEK.map((w, i) => `<span class="${i >= 5 ? 'is-weekend' : ''}">${w}</span>`).join('')}</div>
      <div class="home-cal-grid home-cal-days">${cells.join('')}</div>
      <div class="home-cal-legend">
        <span><i class="home-cal-dot st-all"></i>모두 답함</span>
        <span><i class="home-cal-dot st-part"></i>일부 답함</span>
        <span><i class="home-cal-dot st-none"></i>답하지 못함</span>
        <span><i class="home-cal-band"></i>연속 기록</span>
      </div>
      ${calDetail(sel, hist[sel] || [])}
    </section>`;
  }

  // 지원 기업 — 마감 임박 순, 준비도
  function applyBlock() {
    const apps = App.store.activeApps();
    const dday = (d) => {
      if (!d) return '';
      const [y, m, dd] = d.split('-').map(Number); const t = new Date(); t.setHours(0, 0, 0, 0);
      const n = Math.round((new Date(y, m - 1, dd) - t) / 86400000);
      return n < 0 ? '마감 지남' : n === 0 ? '오늘 마감' : `D-${n}`;
    };
    const sorted = apps.slice().sort((a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999')).slice(0, 3);
    return `<section class="card card-pad home-apply">
      <div class="section-title">지원 기업<a class="more" href="#/apply">전체 보기 →</a></div>
      ${sorted.length ? `<div class="home-apply-list">${sorted.map((a) => {
        const r = App.ai.readiness(a); const dd = dday(a.deadline);
        return `<a class="home-apply-row" href="#/apply/${esc(a.id)}">
          <div class="home-apply-top"><b>${esc(a.company)}</b>${dd ? `<span class="home-apply-dday ${/D-[0-7]$|오늘/.test(dd) ? 'is-soon' : ''}">${esc(dd)}</span>` : ''}</div>
          <div class="subtle home-apply-job">${esc(a.job)}</div>
          <div class="home-apply-prog"><span>준비도 ${r.score}%</span>${App.ui.progress(r.score)}</div>
        </a>`;
      }).join('')}</div>` : `<p class="subtle">지원하려는 기업을 추가하면 기업별로 필요한 역량과 자소서·면접 준비를 따로 챙겨 드려요.</p>
        <a class="btn btn-sm" href="#/apply" style="margin-top:10px">＋ 지원 기업 추가</a>`}
    </section>`;
  }

  App.screens.home = {
    title: '홈',
    render() {
      const st = App.store.state;
      const u = st.user;
      return `<div class="page home">
        <header class="home-hello">
          <div>
            <p class="home-hello-sub">${esc(greetWord())}, ${esc(u.name)}님</p>
            <h1 class="home-hello-title">오늘도 경험 하나, 가볍게 기록해 볼까요?</h1>
            <div class="home-hello-meta">
              <span class="home-chip">🎯 ${esc(u.targetJob || '목표 직무 미설정')}</span>
            </div>
          </div>
        </header>
        <div class="home-grid">
          <div class="home-col">
            ${todayCard()}
            ${feedBlock()}
            ${calendarBlock()}
          </div>
          <aside class="home-col home-side">
            ${lintBlock()}
            ${applyBlock()}
          </aside>
        </div>
      </div>`;
    },
    mount(root) {
      function swap(sel, html) { const el = root.querySelector(sel); if (el) el.outerHTML = html; }
      const swapCal = () => swap('.home-cal', calendarBlock());

      function onClick(ev) {
        const btn = ev.target.closest('[data-home-act]');
        if (!btn) return;
        const act = btn.getAttribute('data-home-act');
        if (act === 'talk') { answerIssue(lintIssues().find((i) => i.id === btn.getAttribute('data-issue'))); return; }
        if (act === 'ask') {
          const issue = lintIssues().find((i) => i.id === btn.getAttribute('data-issue'));
          if (App.wiki.askIssue(issue)) App.ui.toast('오늘의 질문으로 받았어요. 답하면 이 빈칸이 채워져요');
          swap('.home-today', todayCard()); swapCal();
          return;
        }
        if (act === 'cal-prev' || act === 'cal-next') {
          const [y, m] = (calMonth || App.store.localDay().slice(0, 7)).split('-').map(Number);
          const d = new Date(y, m - 1 + (act === 'cal-next' ? 1 : -1), 1);
          const next = App.store.fmtDay(d).slice(0, 7);
          if (next > App.store.localDay().slice(0, 7)) return;
          calMonth = next;
          // 다른 달로 가면 그 달에서 질문이 있었던 마지막 날을 선택 (이번 달이면 오늘)
          if (next === App.store.localDay().slice(0, 7)) calSel = null;
          else { const days = Object.keys(App.store.dayHistory()).filter((k) => k.startsWith(next)).sort(); calSel = days.length ? days[days.length - 1] : next + '-01'; }
          swapCal(); return;
        }
        if (act === 'cal-day') { calSel = btn.getAttribute('data-day'); swapCal(); return; }
      }
      root.addEventListener('click', onClick);
      return () => { root.removeEventListener('click', onClick); };
    },
  };
})(window.App);
