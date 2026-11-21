/* 오늘의 질문 — 서비스가 먼저 말을 건다. 질문 하나씩, 한두 줄로 가볍게. */
(function (App) {
  const esc = (s) => App.ui.esc(s);

  const TYPES = {
    recall: { label: '기억 떠올리기', ico: '🌱' },
    deepen: { label: '경험 깊이 파기', ico: '🔍' },
    project: { label: '프로젝트 체크인', ico: '📌' },
    code: { label: '코드 분석에서 온 질문', ico: '⌥' },
  };
  const HIST_TABS = [['answered', '답변함'], ['skipped', '건너뜀'], ['later', '나중에']];
  const DOW = ['일', '월', '화', '수', '목', '금', '토'];

  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  function typeInfo(t) { return TYPES[t] || TYPES.recall; }
  const short = (t, n) => App.wiki.short(t, n);
  const title = (t, n) => short(String(t || '').replace(/[「」]/g, ''), n); // 「」 안에 「」가 겹치지 않게
  const projName = (p) => App.store.projectName(p);

  // 답하기 전: 이 답이 위키의 어디로 가는지 (홈 미리보기도 같이 쓴다)
  function destOf(q) {
    if (!q) return null;
    if (q.type === 'code' || q.findingId) {
      const ff = q.findingId && App.store.findFinding(q.findingId);
      const p = q.targetProjectId && App.store.getProject(q.targetProjectId);
      return { kind: 'code', finding: ff ? ff.finding.title : '', text: '답하면 이 코드가 근거로 붙은 경험에 반영돼요', href: p ? `#/projects/${p.id}?tab=code` : '' };
    }
    if (q.targetProjectId) {
      const p = App.store.getProject(q.targetProjectId);
      if (p) return { kind: 'project', text: `「${projName(p)}」 타임라인에 기록되고, 관련 경험에 반영돼요`, href: '#/projects/' + p.id };
    }
    if (q.targetExpId) {
      const e = App.store.get(q.targetExpId);
      if (e) {
        const f = App.wiki.inferField('', q.text, q.stage);
        const cur = f === 'insights' ? e.insights : f === 'summary' ? e.summary : e.star[f];
        return { kind: 'deepen', text: `답하면 「${title(e.title, 28)}」의 ${App.wiki.FIELD_LABEL[f] || f} 칸이 ${String(cur || '').trim() ? '보강돼요' : '채워져요'}`, href: '#/card/' + e.id };
      }
    }
    return { kind: 'recall', text: '비슷한 경험이 있으면 거기에, 없으면 새 경험으로 반영돼요', href: '' };
  }
  // 답한 뒤: 실제로 어디에 반영됐는지
  function wentOf(q) {
    const out = [];
    if (!q || q.status !== 'answered') return out;
    const e = q.compiledTo && App.store.get(q.compiledTo);
    // 위키 이전에 답한 '깊이 파기' 질문도 그 경험의 출처로 들어가 있다
    const ee = e || (q.targetExpId && App.store.get(q.targetExpId));
    if (ee) out.push({ href: '#/card/' + ee.id, text: `「${title(ee.title, 28)}」에 반영됨` });
    if (q.targetProjectId && !q.findingId) { const p = App.store.getProject(q.targetProjectId); if (p) out.push({ href: '#/projects/' + p.id, text: `「${projName(p)}」 타임라인에 기록됨` }); }
    return out;
  }
  function destHTML(q) {
    const d = destOf(q); if (!d) return '';
    const inner = `<span class="dy-dest-ico">→</span><span>${d.finding ? `<b>코드 「${esc(short(d.finding, 34))}」</b> · ` : ''}${esc(d.text)}</span>`;
    return d.href ? `<a class="dy-dest" data-kind="${d.kind}" href="${esc(d.href)}">${inner}</a>` : `<div class="dy-dest" data-kind="${d.kind}">${inner}</div>`;
  }
  function wentHTML(q, cls = 'dy-target') {
    return wentOf(q).map((w) => `<a class="${cls}" href="${esc(w.href)}"><span class="dy-target-ico">✓</span><span>${esc(w.text)}</span></a>`).join('');
  }

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
    destOf,
    wentOf,
    render() {
      return `<div class="page dy-page">
        <div id="dy-head"></div>
        <div class="dy-grid">
          <div class="dy-main">
            <div class="dy-stage-wrap">
              <div id="dy-nav"></div>
              <div class="dy-stage" id="dy-stage"></div>
            </div>
            <div id="dy-queue"></div>
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
        feedback: null, // { qid, text, entryId } — 위키 반영 결과
        done: [],       // 이번 방문에서 답한 것
        tab: 'answered',
        leaving: false,
        drafts: {},     // 질문별 작성 중 답변 (왔다갔다 해도 유지)
        dir: 'fwd',     // 슬라이드 방향
      };
      const STATUS_LABEL = { pending: '대기', answered: '답변함', skipped: '건너뜀', later: '나중에' };
      const statusOf = (id) => { const q = getQ(id); return q ? q.status : 'pending'; };
      // from 이후의 첫 대기 질문 → 없으면 앞쪽 대기 질문 → 없으면 끝(완료 화면)
      function nextOpen(from) {
        for (let i = from + 1; i < S.queue.length; i++) if (statusOf(S.queue[i]) === 'pending') return i;
        for (let i = 0; i <= from && i < S.queue.length; i++) if (statusOf(S.queue[i]) === 'pending') return i;
        return S.queue.length;
      }
      const openCount = () => S.queue.filter((id) => statusOf(id) === 'pending').length;
      function saveDraft() { const ta = root.querySelector('#dy-answer'); const q = current(); if (ta && q) S.drafts[q.id] = ta.value; }
      function go(i) {
        i = Math.max(0, Math.min(S.queue.length, i));
        if (i === S.pos && !S.feedback) return;
        saveDraft();
        const dir = i < S.pos ? 'back' : 'fwd';
        transition(() => { S.feedback = null; S.pos = i; }, dir);
      }
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
                <b>🔥 ${App.store.streak()}일</b>
              </div>
              <a class="dy-rhythm" href="#/settings"><span>${esc(rhythmLabel())}</span><span class="dy-rhythm-cta">리듬 바꾸기 →</span></a>
            </div>
          </div>`;
      }

      /* ---------- main stage ---------- */
      function dots() {
        return `<div class="dy-dots">${S.queue.map((id, i) => {
          const q = getQ(id); const st = statusOf(id);
          return `<button type="button" class="dy-dot is-${st} ${i === S.pos ? 'is-on' : ''}" data-dy-jump="${i}" title="${i + 1}. ${esc(q ? q.text : '')}" aria-label="${i + 1}번째 질문 (${STATUS_LABEL[st]})"></button>`;
        }).join('')}</div>`;
      }

      function renderNav() {
        const el = root.querySelector('#dy-nav'); if (!el) return;
        const n = S.queue.length;
        if (!n) { el.innerHTML = ''; return; }
        const atEnd = S.pos >= n;
        const left = openCount();
        el.innerHTML = `<div class="dy-nav">
          <button type="button" class="dy-nav-btn" data-dy-go="prev" ${S.pos <= 0 ? 'disabled' : ''} aria-label="이전 질문">‹</button>
          <div class="dy-nav-mid">
            <div class="dy-nav-count">${atEnd ? '모든 질문을 확인했어요' : `${n}개 중 <b>${S.pos + 1}</b>번째`}<span class="dy-nav-left">${left ? `· 남은 질문 ${left}개` : '· 모두 답했어요'}</span></div>
            ${n > 1 ? dots() : ''}
          </div>
          <button type="button" class="dy-nav-btn" data-dy-go="next" ${S.pos >= n - 1 ? 'disabled' : ''} aria-label="다음 질문">›</button>
        </div>`;
      }

      function renderQueue() {
        const el = root.querySelector('#dy-queue'); if (!el) return;
        if (S.queue.length < 2) { el.innerHTML = ''; return; }
        el.innerHTML = `<div class="card dy-queue">
          <div class="dy-queue-head"><b>도착한 질문 미리 보기</b><span class="subtle">끌리는 질문부터 골라 답해도 돼요 · ← → 키로 이동</span></div>
          <ol class="dy-queue-list">${S.queue.map((id, i) => {
            const q = getQ(id); if (!q) return '';
            const st = statusOf(id); const t = typeInfo(q.type); const hasDraft = st === 'pending' && (S.drafts[id] || '').trim();
            return `<li><button type="button" class="dy-qrow is-${st} ${i === S.pos ? 'is-on' : ''}" data-dy-jump="${i}">
              <span class="dy-qrow-n">${i + 1}</span>
              <span class="dy-qrow-ico" title="${esc(t.label)}">${t.ico}</span>
              <span class="dy-qrow-text">${esc(q.text)}</span>
              ${hasDraft ? '<span class="dy-qrow-draft">작성 중</span>' : ''}
              <span class="dy-qrow-st">${i === S.pos ? '보는 중' : STATUS_LABEL[st]}</span>
            </button></li>`;
          }).join('')}</ol>
        </div>`;
      }

      function answeredCard(q) {
        const t = typeInfo(q.type);
        const nx = nextOpen(S.pos);
        return `
          <div class="dy-qcard dy-answered dy-slide-in" data-type="${esc(q.type)}">
            <div class="dy-qtop">
              <span class="dy-type" data-type="${esc(q.type)}">${t.ico} ${t.label}</span>
              <span class="dy-asked">${esc(askedLabel(q.askedAt))} 도착</span>
              <span class="dy-done-tag">✓ 답변 완료</span>
            </div>
            <h2 class="dy-qtext">${esc(q.text)}</h2>
            <blockquote class="dy-quote">${esc(q.answer || '')}</blockquote>
            ${wentOf(q).length ? `<div class="dy-went">${wentHTML(q)}</div>` : '<div class="dy-went subtle">위키 반영을 되돌린 답변이에요. 다시 답하면 새로 반영돼요.</div>'}
            <div class="dy-qfoot">
              <div class="dy-qfoot-left"><button class="btn btn-ghost btn-sm" data-reask="${esc(q.id)}" type="button">다시 답하기</button></div>
              <button class="btn btn-primary" data-dy="next" type="button">${nx >= S.queue.length ? '마치기' : '남은 질문 보기 →'}</button>
            </div>
          </div>`;
      }

      function questionCard(q) {
        const t = typeInfo(q.type);
        return `
          <div class="dy-qcard dy-slide-in" data-type="${esc(q.type)}">
            <div class="dy-qtop">
              <span class="dy-type" data-type="${esc(q.type)}">${t.ico} ${t.label}</span>
              <span class="dy-asked">${esc(askedLabel(q.askedAt))} 도착</span>
            </div>
            ${q.status === 'skipped' || q.status === 'later' ? `<div class="dy-revisit">${q.status === 'skipped' ? '건너뛴' : '나중에로 미뤄 둔'} 질문이에요. 지금 답해도 괜찮아요.</div>` : ''}
            <h2 class="dy-qtext">${esc(q.text)}</h2>
            ${q.hint ? `<div class="dy-hint"><span>💡</span><span>${esc(q.hint)}</span></div>` : ''}
            ${destHTML(q)}
            <div class="dy-answer-wrap">
              <textarea class="dy-answer" id="dy-answer" rows="3" maxlength="400" placeholder="한두 줄이면 충분해요">${esc(S.drafts[q.id] || '')}</textarea>
              <span class="dy-kbd">Enter 보내기 · Shift+Enter 줄바꿈</span>
            </div>
            <div class="dy-qfoot">
              <div class="dy-qfoot-left">
                <button class="btn btn-ghost btn-sm" data-dy="skip" type="button">건너뛰기</button>
                <button class="btn btn-ghost btn-sm" data-dy="later" type="button">나중에</button>
              </div>
              <button class="btn btn-primary dy-submit" data-dy="answer" type="button" ${(S.drafts[q.id] || '').trim() ? '' : 'disabled'}>답변하기</button>
            </div>
          </div>`;
      }

      function feedbackCard() {
        const f = S.feedback;
        const q = getQ(f.qid);
        const entry = f.entryId ? App.wiki.get(f.entryId) : null;
        const tgt = entry && !entry.undone && entry.target ? App.store.get(entry.target) : null;
        const gap = tgt ? App.ai.gapQuestion(tgt) : null;
        const gapField = gap ? App.wiki.FIELD_LABEL[gap.stage === 'insight' ? 'insights' : gap.stage] : '';
        const isLast = nextOpen(S.pos) >= S.queue.length;
        return `
          <div class="dy-qcard dy-feedback dy-slide-in">
            <div class="dy-fb-top">
              <span class="dy-fb-burst" aria-hidden="true">🎉</span>
              <div>
                <h3>좋아요, 기록했어요!</h3>
                <div class="dy-fb-streak">🔥 ${App.store.streak()}일 연속 기록 중</div>
              </div>
            </div>
            <div class="dy-fb-q">${esc(q ? q.text : '')}</div>
            <blockquote class="dy-quote">${esc(f.text)}</blockquote>
            ${App.wiki.reportHTML(entry)}
            <div class="dy-fb-actions">
              <button class="btn btn-primary" data-dy="next" type="button">${isLast ? '마치기' : '다음 질문 →'}</button>
              ${gap ? `<a class="btn" href="#/discover?exp=${esc(tgt.id)}">AI와 이어서 채우기 →</a>
              <span class="subtle dy-fb-gap">다음으로 채울 칸 · ${esc(gapField || '')}</span>` : ''}
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
              <a class="btn btn-primary" href="#/discover">✦ AI와 대화하며 기록</a>
            </div>
          </div>`;
      }

      function renderStage(still) {
        const el = root.querySelector('#dy-stage');
        const q = current();
        if (S.feedback) el.innerHTML = feedbackCard();
        else if (q && q.status === 'answered') el.innerHTML = answeredCard(q);
        else if (q) el.innerHTML = questionCard(q);
        else el.innerHTML = emptyCard();
        const card = el.querySelector('.dy-slide-in');
        if (card && still) card.classList.remove('dy-slide-in');
        else if (card && S.dir === 'back') { card.classList.remove('dy-slide-in'); card.classList.add('dy-slide-in-back'); }
        if (S.feedback) App.wiki.bindReport(el, onReport);
        S.leaving = false;
        renderNav(); renderQueue();
        const ta = el.querySelector('#dy-answer');
        if (ta) {
          const btn = el.querySelector('[data-dy="answer"]');
          ta.addEventListener('input', () => {
            if (q) S.drafts[q.id] = ta.value;
            btn.disabled = !ta.value.trim();
            ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 220) + 'px';
          });
          ta.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter' && !ev.shiftKey && !ev.isComposing && ev.keyCode !== 229) { ev.preventDefault(); submit(); }
          });
        }
        renderPhone();
      }

      function transition(fn, dir = 'fwd') {
        if (S.leaving) return;
        const card = root.querySelector('#dy-stage .dy-qcard');
        S.leaving = true; S.dir = dir;
        if (card) { card.classList.remove('dy-slide-in', 'dy-slide-in-back'); card.classList.add(dir === 'back' ? 'dy-slide-out-back' : 'dy-slide-out'); }
        later(() => { fn(); renderStage(); renderHistory(); }, 220);
      }

      /* ---------- actions ---------- */
      function submit() {
        const q = current(); if (!q || S.leaving) return;
        const ta = root.querySelector('#dy-answer');
        const text = (ta && ta.value.trim()) || '';
        if (!text) { if (ta) ta.focus(); return; }
        // 다시 답하기: 이전 답이 위키에 만든 변화(와 체크인 기록)를 먼저 되돌려 중복 반영을 막는다
        const prev = q.wikiEntry ? App.wiki.get(q.wikiEntry) : null;
        if (prev && !prev.undone) {
          App.wiki.undo(prev.id, true);
          if (prev.source.logId && prev.source.projectId) App.store.removeLog(prev.source.projectId, prev.source.logId);
        }
        const entry = App.store.answer(q.id, text);
        delete S.drafts[q.id];
        S.feedback = { qid: q.id, text, entryId: entry ? entry.id : null };
        S.done.push({ qid: q.id, kws: App.ai.extractKeywords(text) });
        transition(() => {});
        renderHead();
      }

      // 반영 결과 카드에서 되돌리기/옮기기 했을 때
      function onReport(r) {
        if (!S.feedback) return;
        const q = getQ(S.feedback.qid);
        if (r && !r.undone) { S.feedback.entryId = r.id; if (q) { q.wikiEntry = r.id; App.store.touch(); } }
        renderStage(true); renderHistory();
      }

      function goNext() { saveDraft(); const to = nextOpen(S.pos); transition(() => { S.feedback = null; S.pos = to; }, to < S.pos ? 'back' : 'fwd'); }

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
        else { renderNav(); renderQueue(); }
      }

      function reask(id) {
        App.store.setQuestionStatus(id, 'pending');
        saveDraft();
        if (S.feedback) { S.feedback = null; }
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
        const lastAnswered = App.store.inbox().find((x) => x.status === 'answered' && x.compiledTo && App.store.get(x.compiledTo));
        const lastExp = lastAnswered ? App.store.get(lastAnswered.compiledTo) : null;
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
                    <div class="dy-notif-title">${S.feedback ? '답변을 위키에 반영했어요 ✓' : '오늘 질문은 모두 답했어요'}</div>
                    <div class="dy-notif-body">다음 질문은 ${esc(nextTime().label)}에 보내 드릴게요.</div>
                  </div>`}
                  ${lastExp ? `
                  <div class="dy-notif dy-notif-old">
                    <div class="dy-notif-head"><span class="dy-notif-icon">R</span><span class="dy-notif-app">REWRITE</span><span class="dy-notif-when">어제</span></div>
                    <div class="dy-notif-body">지난 답변이 「${esc(lastExp.title)}」에 반영됐어요.</div>
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
              return `<li class="dy-hist-item">
                <div class="dy-hist-meta"><span class="dy-type dy-type-sm" data-type="${esc(q.type)}">${t.ico} ${t.label}</span><span>${esc(askedLabel(q.askedAt))}</span></div>
                <div class="dy-hist-q">${esc(q.text)}</div>
                ${q.status === 'answered' && q.answer ? `<div class="dy-hist-a">${esc(q.answer)}</div>` : ''}
                <div class="dy-hist-foot">
                  ${q.status === 'answered' ? wentHTML(q, 'dy-hist-exp') : `<span class="dy-hist-exp">→ ${esc((destOf(q) || {}).text || '')}</span>`}
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
        const jump = t.closest('[data-dy-jump]');
        if (jump) { go(Number(jump.dataset.dyJump)); if (jump.classList.contains('dy-qrow')) root.querySelector('#dy-stage').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
        const nav = t.closest('[data-dy-go]');
        if (nav && !nav.disabled) { go(S.pos + (nav.dataset.dyGo === 'prev' ? -1 : 1)); return; }
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
          saveDraft(); { const to = nextOpen(S.pos); transition(() => { S.pos = to; }, to < S.pos ? 'back' : 'fwd'); }
        } else if (act === 'later' && q) {
          App.store.setQuestionStatus(q.id, 'later');
          App.ui.toast(`${nextTime().label}에 다시 물어볼게요`);
          saveDraft(); { const to = nextOpen(S.pos); transition(() => { S.pos = to; }, to < S.pos ? 'back' : 'fwd'); }
        } else if (act === 'next') goNext();
        else if (act === 'more') pushDemo();
      }
      root.addEventListener('click', onClick);
      const onKey = (ev) => {
        if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
        const tag = (ev.target.tagName || '').toLowerCase();
        if (tag === 'textarea' || tag === 'input' || tag === 'select' || ev.target.isContentEditable) return;
        if (document.querySelector('#modal-root .modal')) return;
        if (ev.key === 'ArrowLeft' && S.pos > 0) { ev.preventDefault(); go(S.pos - 1); }
        else if (ev.key === 'ArrowRight' && S.pos < S.queue.length - 1) { ev.preventDefault(); go(S.pos + 1); }
      };
      document.addEventListener('keydown', onKey);

      renderHead();
      renderStage();
      renderHistory();
      const ta = root.querySelector('#dy-answer');
      if (ta && window.matchMedia('(min-width: 901px)').matches) ta.focus({ preventScroll: true });

      return () => {
        alive = false;
        timers.forEach(clearTimeout); timers.clear();
        root.removeEventListener('click', onClick);
        document.removeEventListener('keydown', onKey);
      };
    },
  };
})(window.App);
