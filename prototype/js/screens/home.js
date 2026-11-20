/* 홈: 빈 화면 없이 항상 "답할 질문"이 먼저 보이는 대시보드 */
(function (App) {
  const esc = (s) => App.ui.esc(s);
  const TYPE_LABEL = { project: '프로젝트 체크인', deepen: '경험 깊이 파기', recall: '기억 떠올리기' };
  const STAGE_LABEL = { situation: '상황', task: '과제', action: '행동', result: '결과', insight: '배운 점' };
  let recallIdx = 0;

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
              <span class="home-chip home-chip-streak">🔥 연속 답변 <b>${st.streak || 0}일</b></span>
            </div>
          </div>
        </header>
        <div class="home-grid">
          <div class="home-col">
            ${todayCard()}
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

      function onClick(ev) {
        const btn = ev.target.closest('[data-home-act]');
        if (!btn) return;
        const act = btn.getAttribute('data-home-act');
        if (act === 'recall-next') { recallIdx++; swapRecall(); restartTimer(); return; }
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
