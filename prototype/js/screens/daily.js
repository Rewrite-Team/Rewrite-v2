/* 오늘의 질문 — 서비스가 먼저 말을 건다. 질문 하나씩, 한두 줄로 가볍게. */
(function (App) {
  const esc = (s) => App.ui.esc(s);

  const TYPES = {
    recall: { label: '기억 떠올리기', ico: '🌱' },
    deepen: { label: '경험 깊이 파기', ico: '🔍' },
    project: { label: '프로젝트 체크인', ico: '📌' },
  };
  const HIST_TABS = [['answered', '답변함'], ['skipped', '건너뜀'], ['later', '나중에']];
  const CAT_HINTS = [
    ['아르바이트', ['알바', '아르바이트', '카페', '편의점', '매장', '손님']],
    ['프로젝트', ['프로젝트', '개발', '서비스', '앱', '배포']],
    ['동아리', ['동아리', '스터디', '모임', '학회']],
    ['수업·과제', ['과제', '수업', '팀플', '교수', '발표']],
    ['인턴·직장', ['인턴', '회사', '직장', '상사', '업무']],
    ['대외활동', ['공모전', '해커톤', '봉사', '서포터즈', '대외활동']],
  ];
  const DOW = ['일', '월', '화', '수', '목', '금', '토'];

  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => new Date().toISOString().slice(0, 10);
  const firstSentence = (t, n) => {
    const s = String(t || '').trim().split(/[.!?\n]/)[0].trim();
    return s.length > n ? s.slice(0, n).trim() + '…' : s;
  };
  function guessCategory(text) {
    for (const [cat, words] of CAT_HINTS) if (words.some((w) => text.includes(w))) return cat;
    return '일상';
  }
  function typeInfo(t) { return TYPES[t] || TYPES.recall; }

  // 설정된 시간 중 다음 질문 시각
  function nextTime() {
    const st = App.store.state.settings || {};
    const times = (st.times || []).slice().sort();
    if (!times.length) return { label: '설정 필요', time: '' };
    const now = new Date();
    const hm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const t = times.find((x) => x > hm);
    return t ? { label: `오늘 ${t}`, time: t } : { label: `내일 ${times[0]}`, time: times[0] };
  }
  function rhythmLabel() {
    const st = App.store.state.settings || {};
    const c = st.cadence === 'weekdays' ? '평일' : st.cadence === 'custom' ? (st.days || []).join('·') : '매일';
    return `${c} ${(st.times || []).join(' · ')}`;
  }
  function askedLabel(askedAt) {
    if (!askedAt) return '';
    const [d, t] = askedAt.split(' ');
    const now = new Date();
    const y = new Date(now); y.setDate(now.getDate() - 1);
    if (d === ymd(now)) return `오늘 ${t || ''}`.trim();
    if (d === ymd(y)) return `어제 ${t || ''}`.trim();
    const [, m, dd] = d.split('-');
    return `${Number(m)}.${Number(dd)} ${t || ''}`.trim();
  }
  function lockDate(askedAt) {
    const d = askedAt ? new Date(askedAt.split(' ')[0] + 'T00:00:00') : new Date();
    const v = isNaN(d) ? new Date() : d;
    return `${v.getMonth() + 1}월 ${v.getDate()}일 ${DOW[v.getDay()]}요일`;
  }

  App.screens.daily = {
    title: '오늘의 질문',
    render() {
      return `<div class="page dy-page">
        <div id="dy-head"></div>
        <div class="dy-grid">
          <div class="dy-main">
            <div class="dy-stage" id="dy-stage"></div>
            <div id="dy-history"></div>
          </div>
          <aside class="dy-aside">
            <div id="dy-phone"></div>
            <div class="card dy-demo">
              <div class="dy-demo-title"><span class="dy-demo-tag">데모</span>질문 도착 체험하기</div>
              <p class="subtle">설정한 시간이 되면 이렇게 질문이 하나 도착해요.</p>
              <button class="btn dy-demo-btn" data-dy="more" type="button">✉ 질문 하나 더 받기</button>
            </div>
          </aside>
        </div>
      </div>`;
    },
    mount(root) {
      let alive = true;
      const timers = new Set();
      const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); if (alive) fn(); }, ms); timers.add(t); };

      const S = {
        queue: App.store.pending().map((q) => q.id),
        pos: 0,
        feedback: null, // { qid, text, kws, expId, created }
        done: [],       // 이번 방문에서 답한 것
        tab: 'answered',
        leaving: false,
      };
      const getQ = (id) => App.store.inbox().find((q) => q.id === id) || null;
      const current = () => (S.pos < S.queue.length ? getQ(S.queue[S.pos]) : null);

      /* ---------- header ---------- */
      function renderHead() {
        const nt = nextTime();
        root.querySelector('#dy-head').innerHTML = `
          <div class="dy-head">
            <div class="dy-head-text">
              <div class="dy-eyebrow"><span class="dy-eyebrow-dot"></span>서비스가 먼저 말을 걸어요</div>
              <h1>오늘의 질문</h1>
              <p>하루 한두 번, 질문 하나씩 도착해요. 한두 줄이면 충분해요.</p>
            </div>
            <div class="dy-stats">
              <div class="dy-stat">
                <span class="dy-stat-label">다음 질문</span>
                <b>⏰ ${esc(nt.label)}</b>
              </div>
              <div class="dy-stat">
                <span class="dy-stat-label">연속 기록</span>
                <b>🔥 ${App.store.state.streak || 0}일</b>
              </div>
              <a class="dy-rhythm" href="#/settings"><span>${esc(rhythmLabel())}</span><span class="dy-rhythm-cta">리듬 바꾸기 →</span></a>
            </div>
          </div>`;
      }

      /* ---------- main stage ---------- */
      function dots() {
        return `<div class="dy-dots">${S.queue.map((_, i) => `<i class="${i < S.pos ? 'is-past' : i === S.pos ? 'is-on' : ''}"></i>`).join('')}</div>`;
      }

      function questionCard(q) {
        const t = typeInfo(q.type);
        const exp = q.targetExpId ? App.store.get(q.targetExpId) : null;
        return `
          <div class="dy-qcard dy-slide-in" data-type="${esc(q.type)}">
            <div class="dy-qtop">
              <span class="dy-type" data-type="${esc(q.type)}">${t.ico} ${t.label}</span>
              <span class="dy-asked">${esc(askedLabel(q.askedAt))} 도착</span>
              <span class="dy-count">${S.queue.length}개 중 <b>${S.pos + 1}</b>번째</span>
            </div>
            ${S.queue.length > 1 ? dots() : ''}
            ${exp ? `<a class="dy-target" href="#/card/${esc(exp.id)}"><span class="dy-target-ico">📎</span><span>「${esc(exp.title)}」</span><span class="dy-target-sub">카드에 쌓여요</span></a>` : ''}
            <h2 class="dy-qtext">${esc(q.text)}</h2>
            ${q.hint ? `<div class="dy-hint"><span>💡</span><span>${esc(q.hint)}</span></div>` : ''}
            <div class="dy-answer-wrap">
              <textarea class="dy-answer" id="dy-answer" rows="3" maxlength="400" placeholder="한두 줄이면 충분해요"></textarea>
              <span class="dy-kbd">Enter 보내기 · Shift+Enter 줄바꿈</span>
            </div>
            <div class="dy-qfoot">
              <div class="dy-qfoot-left">
                <button class="btn btn-ghost btn-sm" data-dy="skip" type="button">건너뛰기</button>
                <button class="btn btn-ghost btn-sm" data-dy="later" type="button">나중에</button>
              </div>
              <button class="btn btn-primary dy-submit" data-dy="answer" type="button" disabled>답변하기</button>
            </div>
          </div>`;
      }

      function feedbackCard() {
        const f = S.feedback;
        const q = getQ(f.qid);
        const exp = f.expId ? App.store.get(f.expId) : null;
        const isLast = S.pos + 1 >= S.queue.length;
        const merged = exp && !f.created;
        return `
          <div class="dy-qcard dy-feedback dy-slide-in">
            <div class="dy-fb-top">
              <span class="dy-fb-burst" aria-hidden="true">🎉</span>
              <div>
                <h3>좋아요, 기록해 뒀어요!</h3>
                <div class="dy-fb-streak">🔥 ${App.store.state.streak || 0}일 연속 기록 중</div>
              </div>
            </div>
            <div class="dy-fb-q">${esc(q ? q.text : '')}</div>
            <blockquote class="dy-quote">${esc(f.text)}</blockquote>

            ${merged ? `
              <div class="dy-merge">
                <div class="dy-merge-label">↳ 이 카드에 쌓였어요</div>
                <a class="dy-merge-card" href="#/card/${esc(exp.id)}">
                  <div class="dy-merge-title">${esc(exp.title)}</div>
                  <div class="dy-merge-meta"><span>원문 기록 +1</span>${f.added.length ? `<span>키워드 +${f.added.length}</span>` : ''}<span class="dy-merge-pct">완성도 ${exp.completeness}%</span></div>
                  ${App.ui.progress(exp.completeness)}
                </a>
              </div>` : f.created && exp ? `
              <div class="dy-merge dy-seed">
                <div class="dy-merge-label">🌱 새 경험 카드로 저장했어요</div>
                <a class="dy-merge-card" href="#/card/${esc(exp.id)}">
                  <div class="dy-merge-title">${esc(exp.title)}</div>
                  <div class="dy-merge-meta"><span>작성중</span><span class="dy-merge-pct">완성도 ${exp.completeness}%</span></div>
                  ${App.ui.progress(exp.completeness)}
                </a>
              </div>` : `
              <div class="dy-merge dy-seed">
                <div class="dy-merge-label">🌱 새로운 경험의 씨앗을 찾았어요</div>
                <p class="subtle">조금만 더 이야기하면 경험 카드로 만들어 드릴게요.</p>
              </div>`}

            <div class="dy-fb-kws">
              <div class="dy-fb-kws-label">${f.kws.length ? '✦ 답변에서 보이는 역량' : '✦ 역량 키워드'}</div>
              <div class="dy-fb-chips">${f.kws.length ? f.kws.map((k) => App.ui.keywordChip(k, { ai: true })).join('') : '<span class="subtle">아직 뚜렷한 키워드는 안 보여요. 조금 더 이야기하면 찾아낼 수 있어요.</span>'}</div>
            </div>

            <div class="dy-fb-actions">
              <button class="btn btn-primary" data-dy="deeper" type="button">이 이야기 더 해볼래요 →</button>
              <button class="btn" data-dy="next" type="button">${isLast ? '마치기' : '다음 질문'}</button>
              ${!exp ? '<button class="btn btn-ghost btn-sm" data-dy="save-seed" type="button">카드로만 저장해 둘게요</button>' : ''}
            </div>
          </div>`;
      }

      function emptyCard() {
        const nt = nextTime();
        const kws = [...new Set(S.done.flatMap((d) => d.kws))];
        return `
          <div class="dy-qcard dy-empty dy-slide-in">
            <div class="dy-empty-ill" aria-hidden="true"><span>✓</span></div>
            <h2>오늘 질문은 모두 답했어요 🎉</h2>
            <p>다음 질문은 <b>${esc(nt.label)}</b>에 도착해요. 그때까지 편하게 지내요.</p>
            ${S.done.length ? `
              <div class="dy-today">
                <div class="dy-today-num"><b>${S.done.length}</b>개 답변</div>
                ${kws.length ? `<div class="dy-today-kws">${kws.map((k) => App.ui.keywordChip(k)).join('')}</div>` : ''}
              </div>` : ''}
            <div class="dy-empty-actions">
              <button class="btn" data-dy="more" type="button">✉ 질문 하나 더 받기</button>
              <a class="btn btn-primary" href="#/discover">✦ 집중 발굴 하러 가기</a>
            </div>
          </div>`;
      }

      function renderStage() {
        const el = root.querySelector('#dy-stage');
        const q = current();
        if (S.feedback) el.innerHTML = feedbackCard();
        else if (q) el.innerHTML = questionCard(q);
        else el.innerHTML = emptyCard();
        S.leaving = false;
        const ta = el.querySelector('#dy-answer');
        if (ta) {
          const btn = el.querySelector('[data-dy="answer"]');
          ta.addEventListener('input', () => {
            btn.disabled = !ta.value.trim();
            ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 220) + 'px';
          });
          ta.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter' && !ev.shiftKey && !ev.isComposing && ev.keyCode !== 229) { ev.preventDefault(); submit(); }
          });
        }
        renderPhone();
      }

      function transition(fn) {
        if (S.leaving) return;
        const card = root.querySelector('#dy-stage .dy-qcard');
        S.leaving = true;
        if (card) { card.classList.remove('dy-slide-in'); card.classList.add('dy-slide-out'); }
        later(() => { fn(); renderStage(); renderHistory(); }, 220);
      }

      /* ---------- actions ---------- */
      function submit() {
        const q = current(); if (!q || S.leaving) return;
        const ta = root.querySelector('#dy-answer');
        const text = (ta && ta.value.trim()) || '';
        if (!text) { if (ta) ta.focus(); return; }
        App.store.answer(q.id, text);
        const kws = App.ai.extractKeywords(text);
        let added = [];
        const exp = q.targetExpId ? App.store.get(q.targetExpId) : null;
        if (exp) {
          added = kws.filter((k) => !exp.keywords.includes(k));
          if (added.length) App.store.update(exp.id, { keywords: exp.keywords.concat(added) });
        }
        S.feedback = { qid: q.id, text, kws, added, expId: exp ? exp.id : null, created: false };
        S.done.push({ qid: q.id, kws });
        transition(() => {});
        renderHead();
      }

      function createSeed() {
        const f = S.feedback; if (!f) return null;
        if (f.expId) return f.expId;
        const q = getQ(f.qid);
        const e = App.store.create({
          title: firstSentence(f.text, 28) || '새로 떠올린 경험', category: guessCategory(f.text), status: 'draft',
          star: { situation: f.text, task: '', action: '', result: '' },
          keywords: f.kws, qa: [{ q: q ? q.text : '', a: f.text, date: today() }],
        });
        f.expId = e.id; f.created = true;
        return e.id;
      }

      function goNext() { transition(() => { S.feedback = null; S.pos++; }); }

      function pushDemo() {
        const P = window.SEED.recallPrompts;
        const pendingTexts = App.store.pending().map((q) => q.text);
        const pool = P.filter((p) => !pendingTexts.includes(p.text));
        const p = (pool.length ? pool : P)[Math.floor(Math.random() * (pool.length || P.length))];
        App.store.pushQuestion({ text: p.text, type: 'recall', targetExpId: null, hint: '거창하지 않아도 돼요. 떠오르는 장면 하나면 충분해요.' });
        const id = App.store.inbox()[0].id;
        S.queue.push(id);
        App.ui.pushToast('오늘의 질문이 도착했어요', p.text, null);
        if (!S.feedback && S.pos === S.queue.length - 1) transition(() => {});
        else { const c = root.querySelector('.dy-count'); if (c) c.innerHTML = `${S.queue.length}개 중 <b>${S.pos + 1}</b>번째`; const dd = root.querySelector('.dy-dots'); if (dd) dd.outerHTML = dots(); }
      }

      function reask(id) {
        App.store.setQuestionStatus(id, 'pending');
        if (S.feedback) { S.feedback = null; S.pos++; }
        const old = S.queue.indexOf(id);
        if (old !== -1) { S.queue.splice(old, 1); if (old < S.pos) S.pos--; }
        S.queue.splice(S.pos, 0, id);
        renderStage(); renderHistory();
        root.querySelector('#dy-stage').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      /* ---------- phone mock ---------- */
      function renderPhone() {
        const q = S.feedback ? null : current();
        const ch = (App.store.state.settings || {}).channels || {};
        const time = q && q.askedAt ? q.askedAt.split(' ')[1] : nextTime().time;
        const lastAnswered = App.store.inbox().find((x) => x.status === 'answered' && x.targetExpId);
        const lastExp = lastAnswered ? App.store.get(lastAnswered.targetExpId) : null;
        root.querySelector('#dy-phone').innerHTML = `
          <div class="dy-phone-wrap">
            <div class="dy-phone-cap">알림은 이렇게 도착해요</div>
            <div class="dy-phone">
              <div class="dy-phone-screen">
                <div class="dy-island"></div>
                <div class="dy-lock-status"><span>${esc(time || '')}</span><span>▮▮▮ ◔</span></div>
                <div class="dy-lock-lock">🔒</div>
                <div class="dy-lock-date">${esc(lockDate(q && q.askedAt))}</div>
                <div class="dy-lock-time">${esc(time || '12:30')}</div>
                <div class="dy-notifs">
                  ${q ? `
                  <div class="dy-notif dy-notif-new">
                    <div class="dy-notif-head"><span class="dy-notif-icon">R</span><span class="dy-notif-app">REWRITE</span><span class="dy-notif-when">지금</span></div>
                    <div class="dy-notif-title">오늘의 질문이 도착했어요 ✉</div>
                    <div class="dy-notif-body">${esc(q.text)}</div>
                  </div>` : `
                  <div class="dy-notif dy-notif-new">
                    <div class="dy-notif-head"><span class="dy-notif-icon">R</span><span class="dy-notif-app">REWRITE</span><span class="dy-notif-when">지금</span></div>
                    <div class="dy-notif-title">${S.feedback ? '답변이 카드에 쌓였어요 ✓' : '오늘 질문은 모두 답했어요'}</div>
                    <div class="dy-notif-body">다음 질문은 ${esc(nextTime().label)}에 보내 드릴게요.</div>
                  </div>`}
                  ${lastExp ? `
                  <div class="dy-notif dy-notif-old">
                    <div class="dy-notif-head"><span class="dy-notif-icon">R</span><span class="dy-notif-app">REWRITE</span><span class="dy-notif-when">어제</span></div>
                    <div class="dy-notif-body">어제 답변이 「${esc(lastExp.title)}」 카드에 쌓였어요.</div>
                  </div>` : ''}
                </div>
                <div class="dy-lock-bottom"><span>🔦</span><span>📷</span></div>
                <div class="dy-homebar"></div>
              </div>
            </div>
            <div class="dy-channels">
              <span class="subtle">받는 곳</span>
              <span class="dy-ch ${ch.push ? 'is-on' : ''}">앱 푸시</span>
              <span class="dy-ch ${ch.kakao ? 'is-on' : ''}">카카오 알림톡</span>
              <span class="dy-ch ${ch.email ? 'is-on' : ''}">이메일</span>
            </div>
          </div>`;
      }

      /* ---------- history ---------- */
      function renderHistory() {
        const all = App.store.inbox();
        const groups = Object.fromEntries(HIST_TABS.map(([k]) => [k, all.filter((q) => q.status === k)]));
        const items = groups[S.tab] || [];
        root.querySelector('#dy-history').innerHTML = `
          <section class="card dy-hist">
            <div class="dy-hist-head">
              <div class="section-title">지난 질문 기록</div>
              <div class="dy-tabs" role="tablist">
                ${HIST_TABS.map(([k, l]) => `<button class="dy-tab ${S.tab === k ? 'is-on' : ''}" data-tab="${k}" type="button">${l}<span>${groups[k].length}</span></button>`).join('')}
              </div>
            </div>
            ${items.length ? `<ul class="dy-hist-list">${items.map((q) => {
              const t = typeInfo(q.type);
              const exp = q.targetExpId ? App.store.get(q.targetExpId) : null;
              return `<li class="dy-hist-item">
                <div class="dy-hist-meta"><span class="dy-type dy-type-sm" data-type="${esc(q.type)}">${t.ico} ${t.label}</span><span>${esc(askedLabel(q.askedAt))}</span></div>
                <div class="dy-hist-q">${esc(q.text)}</div>
                ${q.status === 'answered' && q.answer ? `<div class="dy-hist-a">${esc(q.answer)}</div>` : ''}
                <div class="dy-hist-foot">
                  ${exp ? `<a class="dy-hist-exp" href="#/card/${esc(exp.id)}">📎 ${esc(exp.title)}</a>` : ''}
                  ${q.status !== 'answered' ? `<button class="btn btn-sm" data-reask="${esc(q.id)}" type="button">다시 답하기</button>` : ''}
                </div>
              </li>`;
            }).join('')}</ul>` : `<div class="dy-hist-empty">${S.tab === 'answered' ? '아직 답한 질문이 없어요.' : S.tab === 'skipped' ? '건너뛴 질문이 없어요.' : '미뤄둔 질문이 없어요.'}</div>`}
          </section>`;
      }

      /* ---------- events ---------- */
      function onClick(ev) {
        const t = ev.target;
        const tab = t.closest('[data-tab]');
        if (tab) { S.tab = tab.dataset.tab; renderHistory(); return; }
        const re = t.closest('[data-reask]');
        if (re) { reask(re.dataset.reask); return; }
        const a = t.closest('[data-dy]');
        if (!a || a.disabled) return;
        const act = a.dataset.dy;
        const q = current();
        if (act === 'answer') submit();
        else if (act === 'skip' && q) {
          App.store.setQuestionStatus(q.id, 'skipped');
          App.ui.toast('건너뛰었어요. 비슷한 질문은 덜 보내 볼게요');
          transition(() => { S.pos++; });
        } else if (act === 'later' && q) {
          App.store.setQuestionStatus(q.id, 'later');
          App.ui.toast(`${nextTime().label}에 다시 물어볼게요`);
          transition(() => { S.pos++; });
        } else if (act === 'next') goNext();
        else if (act === 'deeper') {
          const id = createSeed();
          if (id) App.navigate('#/discover?exp=' + id);
        } else if (act === 'save-seed') {
          createSeed();
          App.ui.toast('작성 중인 경험 카드로 저장했어요');
          renderStage();
        } else if (act === 'more') pushDemo();
      }
      root.addEventListener('click', onClick);

      renderHead();
      renderStage();
      renderHistory();
      const ta = root.querySelector('#dy-answer');
      if (ta && window.matchMedia('(min-width: 901px)').matches) ta.focus({ preventScroll: true });

      return () => {
        alive = false;
        timers.forEach(clearTimeout); timers.clear();
        root.removeEventListener('click', onClick);
      };
    },
  };
})(window.App);
