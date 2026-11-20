/* 홈: 빈 화면 없이 항상 "답할 질문"이 먼저 보이는 대시보드 */
(function (App) {
  const esc = (s) => App.ui.esc(s);
  const TYPE_LABEL = { project: '프로젝트 체크인', deepen: '경험 깊이 파기', recall: '기억 떠올리기' };
  const STAGE_LABEL = { situation: '상황', task: '과제', action: '행동', result: '결과', insight: '배운 점' };
  let recallIdx = 0;
  // 답변 캘린더 상태 (화면을 떠났다 와도 유지)
  let calMonth = null; // 'YYYY-MM' — null이면 이번 달
  let calSel = null;   // 'YYYY-MM-DD' — null이면 오늘
  const WEEK = ['월', '화', '수', '목', '금', '토', '일'];
  const STATUS_CHIP = { answered: ['답변함', 'is-answered'], skipped: ['건너뜀', 'is-skipped'], later: ['나중에', 'is-later'], pending: ['아직 안 답함', 'is-pending'] };

  function daysAgo(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr.slice(0, 10) + 'T00:00:00');
    const t = new Date(); t.setHours(0, 0, 0, 0);
    return Math.round((t - d) / 86400000);
  }
  function relDay(dateStr) {
    const n = daysAgo(dateStr);
    if (n == null) return '기록 없음';
    if (n <= 0) return '오늘';
    if (n === 1) return '어제';
    if (n < 7) return n + '일 전';
    return dateStr.slice(5, 10).replace('-', '.');
  }
  function greetWord() {
    const h = new Date().getHours();
    if (h < 6) return '늦은 밤이에요';
    if (h < 11) return '좋은 아침이에요';
    if (h < 17) return '좋은 오후예요';
    return '오늘 하루 수고했어요';
  }
  function kwQuestion(k) {
    return '최근에 ' + String(k.desc || '').replace(/ 경험$/, ' 적이 있나요?');
  }
  function weeklyAnswers() {
    return App.store.inbox().filter((q) => q.status === 'answered' && daysAgo(q.askedAt) != null && daysAgo(q.askedAt) < 7).length;
  }

  function todayCard() {
    const pending = App.store.pending();
    const q = pending[0];
    if (!q) {
      const rp = window.SEED.recallPrompts[recallIdx % window.SEED.recallPrompts.length];
      return `<section class="card home-today home-today-done">
        <div class="home-today-head"><span class="home-pill home-pill-done">✓ 오늘 질문 완료</span></div>
        <h2 class="home-today-q">오늘 도착한 질문에 모두 답했어요. 하나 더 떠올려 볼까요?</h2>
        <p class="home-today-hint">“${esc(rp.text)}”</p>
        <div class="home-today-actions">
          <a class="btn btn-primary" href="#/discover?seed=${recallIdx % window.SEED.recallPrompts.length}">✦ 이 질문으로 발굴하기</a>
          <a class="btn btn-ghost" href="#/daily">지난 답변 보기</a>
        </div>
      </section>`;
    }
    const target = App.store.questionTarget(q);
    // 답변은 오늘의 질문 화면 한 곳에서만 받는다. 홈은 미리보기 + 바로가기
    return `<section class="card home-today" data-href="#/daily">
      <div class="home-today-head">
        <span class="home-pill"><span class="home-pill-dot"></span>오늘의 질문</span>
        <span class="subtle">${esc(TYPE_LABEL[q.type] || '질문')} · ${esc((q.askedAt || '').slice(11) || '방금')} 도착</span>
        <a class="home-today-count" href="#/daily">남은 질문 ${pending.length}개 →</a>
      </div>
      <h2 class="home-today-q">${esc(q.text)}</h2>
      ${q.hint ? `<p class="home-today-hint">💡 ${esc(q.hint)}</p>` : ''}
      <div class="home-today-foot">
        <span class="subtle home-today-merge">${target ? `답변은 「${esc(target.title)}」 ${esc(target.place)}에 쌓여요` : '답하고 나면 새 경험 카드로 저장할 수 있어요'}</span>
        <div class="home-today-actions">
          <a class="btn btn-primary" href="#/daily">답하러 가기 →</a>
        </div>
      </div>
    </section>`;
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
        const target = App.store.questionTarget(q);
        const open = q.status === 'pending' || q.status === 'later';
        return `<li class="home-cal-item">
          <div class="home-cal-item-top">
            <span class="home-cal-type">${esc(TYPE_LABEL[q.type] || '질문')}</span>
            <span class="home-cal-chip ${chip[1]}">${esc(chip[0])}</span>
          </div>
          <p class="home-cal-q">${esc(q.text)}</p>
          ${q.status === 'answered' && q.answer ? `<p class="home-cal-ans">“${esc(truncate(q.answer, 80))}”</p>` : ''}
          ${target || open ? `<div class="home-cal-links">
            ${target ? `<a class="home-cal-link" href="${esc(target.href)}">${esc(target.place)} · ${esc(truncate(target.title, 28))} →</a>` : ''}
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

  function draftsBlock() {
    const drafts = App.store.list().filter((e) => e.status === 'draft').slice(0, 3);
    if (!drafts.length) {
      return `<div class="card home-soft">작성 중인 카드가 없어요. <a class="home-link" href="#/discover">새 경험 발굴하기 →</a></div>`;
    }
    return `<div class="home-drafts">${drafts.map((e) => {
      const gq = App.ai.gapQuestion(e);
      return `<div class="card home-draft" data-href="#/discover?exp=${esc(e.id)}">
        <div class="home-draft-top">${App.ui.statusTag(e.status)}<span class="subtle">${esc(e.category)}</span><span class="home-draft-pct">${e.completeness}%</span></div>
        <div class="home-draft-title">${esc(e.title)}</div>
        ${App.ui.progress(e.completeness)}
        ${gq ? `<div class="home-draft-next"><span class="home-next-label">다음 질문 · ${esc(STAGE_LABEL[gq.stage] || '')}</span><span>${esc(gq.text)}</span></div>`
          : `<div class="home-draft-next"><span class="home-next-label">거의 다 왔어요</span><span>마지막으로 한 번 훑어보고 완성해 볼까요?</span></div>`}
        <div class="home-draft-cta">이어서 답하기 →</div>
      </div>`;
    }).join('')}</div>`;
  }

  function projectsBlock() {
    const ps = App.store.projects().filter((p) => p.status === 'ongoing');
    if (!ps.length) {
      return `<div class="card home-soft">진행 중인 프로젝트가 없어요. 지금 하는 일이 있다면 <a class="home-link" href="#/projects">프로젝트로 등록</a>해 보세요.</div>`;
    }
    return `<div class="card home-projects">${ps.map((p) => {
      const last = (p.logs || []).map((l) => l.date).sort().pop();
      const n = daysAgo(last);
      const stale = n != null && n >= 3;
      return `<div class="home-proj" data-href="#/projects/${esc(p.id)}">
        <div class="home-proj-ico">▤</div>
        <div class="home-proj-body">
          <div class="home-proj-title">${esc(p.title)}</div>
          <div class="subtle">로그 ${(p.logs || []).length}개 · 카드 ${App.store.cardsOf(p.id).length}장 · 마지막 기록 <b class="${stale ? 'home-stale' : ''}">${esc(relDay(last))}</b>${stale ? ' · 체크인할 때가 됐어요' : ''}</div>
        </div>
        <a class="btn btn-sm ${stale ? 'btn-accent' : ''}" href="#/projects/${esc(p.id)}">체크인</a>
      </div>`;
    }).join('')}</div>`;
  }

  function statsBlock() {
    const exps = App.store.list();
    const avg = exps.length ? Math.round(exps.reduce((s, e) => s + (e.completeness || 0), 0) / exps.length) : 0;
    return `<div class="home-stats">
      <a class="card home-stat" href="#/vault"><div class="home-stat-num">${exps.length}<small>개</small></div><div class="home-stat-label">경험 카드</div></a>
      <a class="card home-stat" href="#/daily"><div class="home-stat-num">${weeklyAnswers()}<small>개</small></div><div class="home-stat-label">이번 주 답변</div></a>
      <a class="card home-stat" href="#/vault"><div class="home-stat-num">${avg}<small>%</small></div><div class="home-stat-label">평균 완성도</div></a>
    </div>`;
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

  function keywordBlock() {
    const counts = App.keywords.counts();
    const rows = Object.keys(counts).map((k) => [k, counts[k]]).sort((a, b) => b[1] - a[1]);
    const max = rows.length ? rows[0][1] : 1;
    const empty = App.keywords.all().filter((k) => !counts[k.name]);
    const pick = empty.length ? empty[Math.floor(new Date().getDate() % empty.length)] : null;
    return `<section class="card card-pad home-kw">
      <div class="section-title">역량 키워드 분포<a class="more" href="#/vault">보관함 →</a></div>
      <div class="home-bars">${rows.map(([k, c]) => `
        <div class="home-bar" role="link" tabindex="0" data-href="#/vault?kw=${encodeURIComponent(k)}" data-tone="${esc(App.keywords.tone(k))}" title="#${esc(k)} 경험 보기">
          <span class="home-bar-name">#${esc(k)}</span>
          <span class="home-bar-track"><span class="home-bar-fill" style="width:${Math.max(8, Math.round((c / max) * 100))}%"></span></span>
          <span class="home-bar-n">${c}</span>
        </div>`).join('')}
      </div>
      ${pick ? `<div class="home-gap">
        <div class="home-gap-head"><span class="home-gap-label">아직 비어 있는 역량</span>
          <span class="home-gap-kws">${empty.slice(0, 4).map((k) => App.ui.keywordChip(k.name)).join('')}</span></div>
        <p class="home-gap-q">${esc(kwQuestion(pick))}</p>
        <a class="home-link" href="#/discover?kw=${encodeURIComponent(pick.name)}">#${esc(pick.name)} 경험 떠올려 보기 →</a>
      </div>` : ''}
    </section>`;
  }

  function recallBlock() {
    const list = window.SEED.recallPrompts;
    const i = recallIdx % list.length;
    const rp = list[i];
    return `<section class="card home-recall">
      <div class="home-recall-head"><span class="ai-dot">R</span><b>기억이 안 나도 괜찮아요</b>
        <button class="btn btn-ghost btn-sm home-recall-next" data-home-act="recall-next" title="다른 질문">↻</button></div>
      <div class="home-recall-body">
        <span class="home-recall-theme">${esc(rp.theme)}</span>
        <p class="home-recall-text">${esc(rp.text)}</p>
      </div>
      <div class="home-recall-foot">
        <div class="home-recall-dots">${list.map((_, j) => `<span class="${j === i ? 'on' : ''}"></span>`).join('')}</div>
        <a class="btn btn-sm btn-primary" href="#/discover?seed=${i}">이걸로 발굴 시작</a>
      </div>
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
            <h1 class="home-hello-title">오늘도 경험 하나, 가볍게 꺼내 볼까요?</h1>
            <div class="home-hello-meta">
              <span class="home-chip">🎯 ${esc(u.targetJob || '목표 직무 미설정')}</span>
            </div>
          </div>
        </header>
        <div class="home-grid">
          <div class="home-col">
            ${todayCard()}
            ${calendarBlock()}
            <section>
              <div class="section-title">작성 중인 경험 이어가기<a class="more" href="#/vault">보관함 →</a></div>
              ${draftsBlock()}
            </section>
            <section>
              <div class="section-title">진행 중 프로젝트<a class="more" href="#/projects">전체 보기 →</a></div>
              ${projectsBlock()}
            </section>
          </div>
          <aside class="home-col home-side">
            ${statsBlock()}
            ${applyBlock()}
            ${recallBlock()}
            ${keywordBlock()}
          </aside>
        </div>
      </div>`;
    },
    mount(root) {

      function swapRecall() {
        const el = root.querySelector('.home-recall');
        if (!el) return;
        el.outerHTML = recallBlock();
      }

      function swapCal() {
        const el = root.querySelector('.home-cal');
        if (el) el.outerHTML = calendarBlock();
      }

      function onClick(ev) {
        const btn = ev.target.closest('[data-home-act]');
        if (!btn) return;
        const act = btn.getAttribute('data-home-act');
        if (act === 'recall-next') { recallIdx++; swapRecall(); restartTimer(); return; }
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

      let timer = null;
      function restartTimer() {
        if (timer) clearInterval(timer);
        timer = setInterval(() => {
          const el = root.querySelector('.home-recall');
          if (!el || el.matches(':hover')) return;
          recallIdx++; swapRecall();
        }, 9000);
      }
      restartTimer();

      return () => { if (timer) clearInterval(timer); root.removeEventListener('click', onClick); };
    },
  };
})(window.App);
