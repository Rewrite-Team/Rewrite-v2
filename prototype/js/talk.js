/* 기록 대화 — 오늘의 질문 · 위키 점검 · ＋기록하기 · 체크인이 모두 같이 쓰는 "AI와 대화하며 적는 곳"
   흐름: AI 질문 → 사용자 답 → (필요하면 꼬리질문 1번) → AI 제안 "어느 경험의 어느 칸에, 이런 문장으로" → 사용자가 고르거나 말로 고침 → 반영
   직접 수정(경험 페이지의 ✎ 수정)은 이 대화를 쓰지 않는다 — 사용자가 쓴 그대로 저장.

   App.talk.mount(el, {
     ask: { text, hint?, label? },      // AI 첫 질문 (prefill 이 있으면 생략 가능)
     prefill?: '원문',                   // 이미 적힌 기록(체크인 로그 등) → 바로 제안부터
     src: { type, question, questionId, expId, stage, projectId, logId, logType, findingId },
     commit?: (text, decision) => entry, // 기본: App.wiki.ingest({ ...src, text, decision }) — 대화 id 는 자동으로 이어진다
     thread?: { source, label },         // 대화 기록에 남길 출처 (생략하면 src 로 추정). threadId 를 주면 그 대화를 이어서 쓴다
     room?: true,                         // 옆에 대화 기록(채팅방) 패널을 같이 보여 줄지
     onDone?: (entry) => void,
     next?: { label, onClick },          // 반영 뒤 보여 줄 다음 행동
     placeholder?, followup?: true
   }) → { destroy() }
   모든 대화는 App.wiki 의 대화 기록(state.threads)에 원문 그대로 남는다 — 경험으로 확정하지 않고 '경험 후보'로 보관한 것도. */
(function (App) {
  const esc = (s) => App.ui.esc(s);
  const FIELDS = [['situation', '상황'], ['task', '과제'], ['action', '행동'], ['result', '결과'], ['insights', '배운 점']];
  const FL = Object.fromEntries(FIELDS);
  const bare = (t) => String(t || '').replace(/[「」]/g, '');

  function mount(el, cfg) {
    const src = Object.assign({}, cfg.src || {});
    const st = { phase: cfg.prefill ? 'propose' : 'ask', msgs: [], answer: cfg.prefill || '', plan: null, follows: 0, busy: false, entry: null };
    const W = App.wiki; const S = App.store;
    let alive = true;
    // ---------- 대화 기록 (원문 보관) ----------
    // 같은 질문으로 하다 만 대화가 있으면 새로 시작하지 않고 그 대화를 이어 간다
    const resume = !cfg.threadId && src.questionId ? W.threads().find((t) => t.questionId === src.questionId && t.outcome && t.outcome.kind === 'open' && t.msgs.some((m) => m.who === 'me')) : null;
    let threadId = cfg.threadId || (resume ? resume.id : null);
    const pending = []; // 사용자가 첫 말을 하기 전까지는 기록을 만들지 않는다 (열어 보기만 한 대화는 남기지 않음)
    const sourceOf = () => (cfg.thread && cfg.thread.source) || (src.findingId ? 'code' : src.type === 'checkin' ? 'checkin' : src.questionId ? 'daily' : src.type === 'manual' ? 'capture' : src.expId ? 'coach' : 'capture');
    function log(who, text) {
      if (!text) return;
      if (!threadId && who === 'ai') { pending.push(text); return; }
      if (!threadId) {
        const t = W.startThread({ source: sourceOf(), label: cfg.thread && cfg.thread.label, projectId: src.projectId || null, questionId: src.questionId || null, expId: src.expId || null, findingId: src.findingId || null });
        threadId = t.id; pending.splice(0).forEach((x) => W.addMsg(threadId, 'ai', x));
      }
      W.addMsg(threadId, who, text);
    }
    const plain = (html) => String(html || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, (m) => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" }[m] || ' ')).replace(/\s+/g, ' ').trim();

    function planFor(text, keep) {
      const p = W.plan(Object.assign({}, src, { text }));
      if (keep) { // 사용자가 이미 고른 대상·칸은 유지
        if (keep.mode) { p.mode = keep.mode; p.expId = keep.expId; if (keep.expId) p.title = (S.get(keep.expId) || {}).title || p.title; }
        if (keep.field) p.field = keep.field;
        if (keep.mode === 'new' && keep.title) p.title = keep.title;
        p.current = p.mode === 'update' && p.expId ? W.currentOf(S.get(p.expId), p.field) : '';
      }
      return p;
    }
    const ai = (html, extra = {}) => { st.msgs.push(Object.assign({ who: 'ai', html }, extra)); if (!extra.prop && !extra.report && !extra.nolog) log('ai', plain(html)); };
    const me = (text) => { st.msgs.push({ who: 'me', html: esc(text) }); log('me', text); };

    // ---------- 제안 카드 ----------
    function proposalHTML(p, live) {
      const e = p.expId && S.get(p.expId);
      if (!live) {
        const where = p.mode === 'update' && e ? `「${esc(W.short(bare(e.title), 26))}」 · ${FL[p.field]}` : p.mode === 'new' ? `새 경험 「${esc(W.short(bare(p.title), 26))}」` : '경험 후보로 보관';
        return `<div class="tk-prop is-past"><span class="subtle">제안</span> ${where}</div>`;
      }
      const opts = [];
      if (e) opts.push([e.id, `「${W.short(bare(e.title), 26)}」`]);
      p.candidates.filter((id) => id !== p.expId).forEach((id) => { const c = S.get(id); if (c) opts.push([id, `「${W.short(bare(c.title), 26)}」`]); });
      const sel = p.mode === 'update' ? p.expId : p.mode === 'new' ? '__new' : '__keep';
      const head = p.mode === 'update' ? `<b>「${esc(W.short(bare(e && e.title), 28))}」</b>의 <b>${FL[p.field]}</b> 칸에 이렇게 적을게요`
        : p.mode === 'new' ? '비슷한 경험이 없어서 <b>새 경험</b>으로 만들게요'
        : '아직 확정하기엔 근황에 가까워요. <b>경험 후보</b>로 보관해 둘게요<div class="tk-keep-note subtle">원문은 그대로 남아 있어서, 나중에 이야기가 이어지면 질문함의 경험 후보에서 바로 경험으로 확정할 수 있어요.</div>';
      const editable = p.mode === 'update' || p.mode === 'new';
      return `<div class="tk-prop" data-tk-prop>
        <div class="tk-prop-head">${head}</div>
        ${p.mode === 'new' ? `<label class="tk-prop-lab">제목<input class="input tk-title" data-tk-title value="${esc(p.title)}"></label>` : ''}
        ${editable ? `
          ${p.mode === 'update' && p.current ? `<div class="tk-cur"><span class="subtle">지금 적힌 내용</span>${esc(W.short(p.current, 90))}<span class="subtle"> ← 뒤에 덧붙여요</span></div>` : ''}
          <textarea class="input tk-prop-text" data-tk-text rows="2">${esc(p.text)}</textarea>
          <div class="tk-fields">${FIELDS.map(([k, l]) => `<button type="button" class="tk-chip ${p.field === k ? 'on' : ''}" data-tk-field="${k}">${l}</button>`).join('')}</div>` : ''}
        <div class="tk-prop-row">
          <select class="input tk-target" data-tk-target>
            ${opts.map(([id, l]) => `<option value="${id}" ${sel === id ? 'selected' : ''}>${esc(l)}에 반영</option>`).join('')}
            <option value="__new" ${sel === '__new' ? 'selected' : ''}>＋ 새 경험으로 만들기</option>
            <option value="__keep" ${sel === '__keep' ? 'selected' : ''}>📝 경험 후보로 보관 (아직 확정하지 않음)</option>
          </select>
          <button type="button" class="btn btn-primary btn-sm" data-tk-ok>${p.mode === 'keep' ? '경험 후보로 보관' : '이렇게 반영'}</button>
        </div>
        <div class="tk-tip subtle">말로 해도 돼요 — "새로 만들어 줘", "결과 칸에", "카페 알바 경험에 넣어 줘", "후보로 보관해 줘"</div>
      </div>`;
    }

    function propText(p) {
      const e = p.expId && S.get(p.expId);
      return p.mode === 'update' && e ? `제안: 「${bare(e.title)}」의 ${FL[p.field]} 칸에 "${p.text}"` : p.mode === 'new' ? `제안: 새 경험 「${bare(p.title)}」 (${FL[p.field]}: "${p.text}")` : '제안: 경험 후보로 보관';
    }

    // ---------- 그리기 ----------
    function render() {
      if (!alive) return;
      const last = st.msgs.length - 1;
      const inputOn = st.phase !== 'done' && !st.busy;
      const roomOn = !!cfg.room;
      el.innerHTML = `${roomOn ? `<div class="tk-shell"><aside class="tk-room-pane">${roomPaneHTML()}</aside><div class="tk-main">` : ''}<div class="tk">
        <div class="tk-msgs">${st.msgs.map((m, i) => m.who === 'ai'
          ? `<div class="tk-msg ai"><span class="ai-dot">R</span><div class="tk-bubble">${m.prop ? proposalHTML(m.prop, i === last && st.phase === 'propose') : m.html}</div></div>`
          : `<div class="tk-msg me"><div class="tk-bubble">${m.html}</div></div>`).join('')}
          ${st.busy ? '<div class="tk-msg ai"><span class="ai-dot">R</span><div class="tk-bubble tk-typing"><i></i><i></i><i></i></div></div>' : ''}
        </div>
        ${st.phase === 'done' ? (cfg.next ? `<div class="tk-next"><button type="button" class="btn btn-primary btn-sm" data-tk-next>${esc(cfg.next.label)}</button></div>` : '') : `
        <div class="tk-input">
          ${st.phase === 'follow' ? '<div class="tk-quick"><button type="button" class="tk-chip" data-tk-enough>이대로 충분해요</button></div>' : ''}
          <div class="tk-input-row">
            <textarea class="input" data-tk-in rows="1" placeholder="${esc(st.phase === 'propose' ? '고칠 점을 말하거나, 위에서 고르고 [이렇게 반영]' : (cfg.placeholder || '한두 줄이면 충분해요'))}" ${inputOn ? '' : 'disabled'}></textarea>
            <button type="button" class="btn btn-primary tk-send" data-tk-send ${inputOn ? '' : 'disabled'} aria-label="보내기">↑</button>
          </div>
        </div>`}
      </div>${roomOn ? '</div></div>' : ''}`;
      bind();
      const rb = el.querySelector('.tk-room-body'); if (rb) rb.scrollTop = rb.scrollHeight;
      const box = el.querySelector('.tk-msgs'); if (box) box.scrollTop = box.scrollHeight;
    }

    function bind() {
      const input = el.querySelector('[data-tk-in]');
      const send = el.querySelector('[data-tk-send]');
      if (input) {
        input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && !ev.shiftKey && !ev.isComposing) { ev.preventDefault(); onSend(); } });
        input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = Math.min(140, input.scrollHeight) + 'px'; });
        if (st.phase !== 'propose' && !cfg.noAutofocus) setTimeout(() => { try { input.focus({ preventScroll: true }); } catch (e) {} }, 20);
      }
      if (send) send.onclick = onSend;
      const enough = el.querySelector('[data-tk-enough]'); if (enough) enough.onclick = () => { me('이대로 충분해요'); propose(); };
      const nx = el.querySelector('[data-tk-next]'); if (nx) nx.onclick = () => cfg.next.onClick(st.entry);
      const prop = el.querySelector('[data-tk-prop]');
      if (prop) {
        const p = st.plan;
        const sync = () => { const t = prop.querySelector('[data-tk-text]'); if (t) p.text = t.value; const ti = prop.querySelector('[data-tk-title]'); if (ti) p.title = ti.value; };
        prop.querySelectorAll('[data-tk-field]').forEach((b) => b.onclick = () => { sync(); p.field = b.dataset.tkField; p.current = p.mode === 'update' ? W.currentOf(S.get(p.expId), p.field) : ''; render(); });
        prop.querySelector('[data-tk-target]').onchange = (ev) => { sync(); retarget(ev.target.value); render(); };
        prop.querySelector('[data-tk-ok]').onclick = () => { sync(); confirm(); };
      }
      W.bindReport(el, (n) => { if (n) { st.entry = n; const m = st.msgs.find((x) => x.report); if (m) m.html = W.reportHTML(n); render(); } });
    }

    function retarget(v) {
      const p = st.plan;
      if (v === '__new') { p.mode = 'new'; p.expId = null; if (!p.title || S.list().some((e) => e.title === p.title)) p.title = W.short(st.answer, 24); }
      else if (v === '__keep' || v === '__skip') { p.mode = 'keep'; p.expId = null; }
      else { p.mode = 'update'; p.expId = v; p.title = (S.get(v) || {}).title; }
      p.current = p.mode === 'update' ? W.currentOf(S.get(p.expId), p.field) : '';
    }

    // ---------- 대화 진행 ----------
    function roomPaneHTML() {
      const list = W.threadsFor().filter((t) => t.id !== threadId).slice(-6);
      return `<details class="tk-room" ${window.matchMedia && window.matchMedia('(min-width: 900px)').matches ? 'open' : ''}>
        <summary class="tk-room-head"><span>💬 지난 대화</span><a href="#/ask" class="tk-room-all">질문함에서 보기 →</a></summary>
        <div class="tk-room-body">${list.length ? roomHTML(list, { compact: true }) : '<p class="subtle" style="font-size:12.5px;margin:8px 0">아직 대화가 없어요.</p>'}</div>
      </details>`;
    }

    async function think(ms = 550) { st.busy = true; render(); await App.ai.think(ms); st.busy = false; }

    function onSend() {
      const input = el.querySelector('[data-tk-in]'); if (!input) return;
      const text = input.value.trim(); if (!text || st.busy) return;
      me(text);
      if (cfg.onFirstSend && !st.started) { st.started = true; cfg.onFirstSend(); }
      if (st.phase === 'ask') { st.answer = text; afterAnswer(); }
      else if (st.phase === 'follow') { st.answer = `${st.answer} ${text}`; propose(); }
      else if (st.phase === 'propose') instruct(text);
    }

    async function afterAnswer() {
      await think();
      const p = planFor(st.answer);
      const want = cfg.followup !== false && st.follows < 1 && followup(st.answer, p);
      if (want) { st.follows++; st.phase = 'follow'; ai(esc(want)); render(); return; }
      propose(p);
    }
    // 모의 AI 꼬리질문: 너무 짧거나, 결과인데 숫자가 없을 때 한 번만
    function followup(a, p) {
      if (a.replace(/\s/g, '').length < 14) return '조금만 더 들려주세요. 언제, 누구와, 어떤 상황이었어요?';
      if (p.field === 'result' && !/\d/.test(a)) return '좋아요. 혹시 숫자로 말할 수 있는 게 있을까요? (시간, 건수, 사람 수…) 없으면 "이대로 충분해요"를 눌러도 돼요.';
      if (p.mode === 'new' && p.field === 'situation' && !/(했|만들|제안|바꿨|찾았|정리)/.test(a)) return '그때 직접 한 행동이 있었나요? 한 가지만 떠올려 봐도 좋아요.';
      return '';
    }
    async function propose(pp) {
      await think(450);
      const p = pp || planFor(st.answer, st.plan && st.plan.userSet ? st.plan : null);
      st.plan = p; st.phase = 'propose';
      const e = p.expId && S.get(p.expId);
      const lead = p.mode === 'update'
        ? (p.confidence === 'question' ? `이 답은 「${esc(W.short(bare(e.title), 26))}」 이야기죠.` : `「${esc(W.short(bare(e.title), 26))}」와 같은 이야기 같아요.`)
        : p.mode === 'keep' ? '기록해 둘게요.' : '처음 듣는 이야기예요.';
      ai(`${lead} ${p.mode === 'keep' ? '' : '이렇게 정리해 봤어요. 맞는지 봐 주세요.'}`);
      ai('', { prop: p }); log('ai', propText(p));
      render();
    }
    // 제안 단계에서 사용자가 말로 고치기
    async function instruct(t) {
      const p = st.plan; let changed = [];
      if (/^(좋아|응|네|넹|ㅇㅇ|맞아|그래|오케이|ok|괜찮아|그대로)/i.test(t) && t.length <= 12) { confirm(); return; }
      const titleM = t.match(/제목[은는을를이가]?\s*["“'「]?(.+?)["”'」]?\s*(?:으로|로)?\s*(?:해\s*줘|해줘|바꿔\s*줘|바꿔줘|할게|해|하자|바꿔)?\.?\s*$/);
      if (/제목/.test(t) && titleM && titleM[1]) {
        // 제목을 말하면 새 경험 이야기로 본다
        if (p.mode !== 'new') { retarget('__new'); changed.push('새 경험으로'); }
        p.title = titleM[1].trim(); changed.push(`제목을 「${W.short(p.title, 24)}」로`);
      } else if (/새로|새 경험|따로|새로운/.test(t)) { retarget('__new'); changed.push('새 경험으로'); }
      else if (/보관|후보|반영\s*안|하지\s*마|원문만|안\s*넣|넣지\s*마|답변만|나중에|아직/.test(t)) { retarget('__keep'); changed.push('경험 후보로 보관하도록'); }
      else if (/(에|으로|로|쪽)\s*(넣|반영|붙|추가|합|옮)|경험(이야|이에요|에)|이야기(야|예요|에)/.test(t)) {
        // "카페 알바 경험에 넣어 줘" — 대상 경험을 가리킬 때만 바꾼다 (흔한 단어는 빼고 비교)
        const GENERIC = /^(경험|프로젝트|아르바이트|해결|개선|문제|버그|구현|운영|기록|중복|팀|수업)$/;
        const scoreOf = (e) => bare(e.title).split(/[\s—\-·()]+/).filter((w) => w.length >= 2 && !GENERIC.test(w) && t.includes(w)).length;
        const hit = S.list().map((e) => [e, scoreOf(e)]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1])[0];
        if (hit && hit[0].id !== p.expId) { retarget(hit[0].id); changed.push(`「${W.short(bare(hit[0].title), 20)}」에 반영하도록`); }
      }
      const fm = [['result', /결과|성과|숫자/], ['action', /행동|한 일|내가 한/], ['situation', /상황|배경|계기/], ['task', /과제|역할|목표|맡은/], ['insights', /배운|느낀|교훈|배움/]].find(([, re]) => re.test(t) && !/제목/.test(t));
      if (fm && fm[0] !== p.field) { p.field = fm[0]; p.current = p.mode === 'update' ? W.currentOf(S.get(p.expId), p.field) : ''; changed.push(`${FL[fm[0]]} 칸에 적도록`); }
      await think(400);
      if (changed.length) { p.userSet = true; ai(`알겠어요. ${esc(changed.join(', '))} 바꿨어요.`); ai('', { prop: p }); log('ai', propText(p)); }
      else {
        // 지시가 아니면 내용을 보탠 것으로 본다
        st.answer = `${st.answer} ${t}`;
        const keep = { mode: p.mode, expId: p.expId, field: p.field, title: p.title };
        const np = planFor(st.answer, keep); np.userSet = p.userSet; st.plan = np;
        ai('내용을 보태서 다시 정리했어요.'); ai('', { prop: np }); log('ai', propText(np));
      }
      render();
    }
    async function confirm() {
      const p = st.plan; if (!p || st.busy) return;
      if ((p.mode === 'update' || p.mode === 'new') && !String(p.text || '').trim()) return;
      const decision = { mode: p.mode, expId: p.mode === 'update' ? p.expId : null, field: p.field, text: p.text, title: p.mode === 'new' ? (p.title || W.short(st.answer, 24)) : undefined, projectId: p.projectId };
      st.phase = 'done';
      me(p.mode === 'keep' ? '경험 후보로 보관해 주세요' : '이렇게 반영해 주세요');
      await think(350);
      const entry = W.withThread(threadId, () => (cfg.commit ? cfg.commit(st.answer, decision, threadId) : W.ingest(Object.assign({}, src, { text: st.answer, decision, threadId }))));
      st.entry = entry;
      const tgt = entry && entry.target && S.get(entry.target);
      if (p.mode === 'keep' || !tgt) { W.closeThread(threadId, { kind: 'kept', entryId: entry && entry.id }); log('ai', '경험 후보로 보관했어요. 나중에 경험으로 확정할 수 있어요.'); }
      else { W.closeThread(threadId, { kind: 'applied', expId: tgt.id, entryId: entry.id, field: p.field, mode: p.mode }); log('ai', `「${bare(tgt.title)}」에 반영했어요.`); }
      ai(entry ? W.reportHTML(entry) : '반영했어요.', { report: true });
      render();
      if (cfg.onDone) cfg.onDone(entry);
    }

    // 시작
    if (resume) {
      resume.msgs.forEach((m) => st.msgs.push({ who: m.who, html: esc(m.text) }));
      st.answer = W.threadText(resume);
      st.msgs.push({ who: 'ai', html: '지난번에 하다 만 대화를 이어서 정리할게요.' });
      propose(); return ctlOf();
    }
    if (cfg.ask) ai(`${cfg.ask.label ? `<div class="tk-label">${esc(cfg.ask.label)}</div>` : ''}<div class="tk-q">${esc(cfg.ask.text)}</div>${cfg.ask.hint ? `<div class="tk-hint">💡 ${esc(cfg.ask.hint)}</div>` : ''}`);
    if (cfg.prefill) {
      if (threadId) { st.msgs.push({ who: 'me', html: esc(cfg.prefill) }); } else me(cfg.prefill); // 이어 쓰는 대화면 원문은 이미 기록돼 있다
      propose();
    } else render();
    return ctlOf();
    function ctlOf() { return { destroy() { alive = false; el.innerHTML = ''; }, get phase() { return st.phase; }, get threadId() { return threadId; } }; }
  }

  /* 대화 기록(채팅방) 그리기 — talk 옆 패널과 질문함(#/ask) 대화방이 같이 쓴다
     opts: { compact, organize (경험 후보에 '경험으로 확정' 버튼), highlight: threadId } */
  const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
  function dayLabel(d) { const x = App.store.parseDay(d); const today = App.store.localDay(); return d === today ? '오늘' : `${x.getMonth() + 1}월 ${x.getDate()}일 (${WEEK[x.getDay()]})`; }
  function outcomeHTML(t, opts) {
    const o = t.outcome || {}; const S = App.store;
    if (o.kind === 'applied') { const e = S.get(o.expId); return e ? `<a class="tk-out is-applied" href="#/card/${e.id}">→ 「${esc(App.wiki.short(bare(e.title), 24))}」에 반영</a>` : '<span class="tk-out is-applied">경험에 반영됨</span>'; }
    if (o.kind === 'kept') return `<span class="tk-out is-kept">📝 경험 후보</span>${opts.organize ? `<button type="button" class="btn btn-sm tk-organize" data-room-organize="${t.id}">경험으로 확정</button>` : ''}`;
    return `<span class="tk-out is-open">정리 전 대화</span>${opts.organize ? `<button type="button" class="btn btn-sm tk-organize" data-room-organize="${t.id}">이어서 정리</button>` : ''}`;
  }
  function roomHTML(list, opts = {}) {
    let last = '';
    return list.map((t) => {
      const sep = t.date !== last ? `<div class="tk-day"><span>${esc(dayLabel(t.date))}</span></div>` : ''; last = t.date;
      const p = t.projectId && App.store.getProject(t.projectId);
      const msgs = opts.compact ? t.msgs.filter((m, i) => m.who === 'me' || i === 0).slice(0, 3) : t.msgs;
      return `${sep}<div class="tk-thread ${opts.highlight === t.id ? 'is-hl' : ''}" id="thread-${t.id}" data-thread="${t.id}">
        <div class="tk-thread-meta"><span class="tk-thread-src">${esc(t.label || '대화')}</span>${p ? `<span>▤ ${esc(App.store.projectName(p))}</span>` : ''}<span>${esc(t.at || '')}</span></div>
        ${msgs.map((m) => `<div class="tk-rm ${m.who}"><div class="tk-rm-b">${esc(opts.compact ? App.wiki.short(m.text, 70) : m.text)}</div></div>`).join('')}
        <div class="tk-thread-foot">${outcomeHTML(t, opts)}</div>
      </div>`;
    }).join('');
  }

  // 모달로 띄우기 (위키 점검·홈·경험 페이지 등에서 그 자리에서 답하기)
  function open(cfg) {
    const root = document.getElementById('modal-root');
    root.innerHTML = `<div class="modal-backdrop"><div class="modal tk-modal ${cfg.room === false ? '' : 'has-room'}">
      <div class="modal-head">${esc(cfg.title || 'AI와 대화하며 기록')}<button class="btn btn-ghost btn-sm tk-close" data-tk-close aria-label="닫기">✕</button></div>
      <div class="modal-body"><div class="tk-modal-body"></div>${cfg.footerHTML ? `<div class="tk-modal-foot">${cfg.footerHTML}</div>` : ''}</div></div></div>`;
    let changed = false;
    const close = () => { root.innerHTML = ''; ctl.destroy(); if (changed && cfg.onClose) cfg.onClose(); else if (changed) App.rerender(); };
    root.querySelector('[data-tk-close]').onclick = close;
    root.querySelector('.modal-backdrop').onclick = (ev) => { if (ev.target.classList.contains('modal-backdrop') || ev.target.closest('.tk-modal-foot a')) close(); };
    const ctl = mount(root.querySelector('.tk-modal-body'), Object.assign({ room: true }, cfg, {
      onFirstSend: () => { const f = root.querySelector('.tk-modal-foot'); if (f) f.remove(); },
      onDone: (e) => { changed = true; if (cfg.onDone) cfg.onDone(e); },
      next: cfg.next || { label: '닫기', onClick: close },
    }));
    return { close };
  }

    // 보관된 대화를 나중에 경험으로 정리 — 같은 대화(thread)에 이어서 쓴다
  function organize(el, threadId, cfg = {}) {
    const t = App.wiki.getThread(threadId); if (!t) return null;
    const text = App.wiki.threadText(t);
    const q = (t.msgs.find((m) => m.who === 'ai') || {}).text || '';
    const src = { type: t.source === 'checkin' ? 'checkin' : 'answer', question: q, questionId: t.questionId || null, projectId: t.projectId || null, findingId: t.findingId || null, expId: null };
    return mount(el, Object.assign({ prefill: text, src, threadId, followup: false }, cfg));
  }

  App.talk = { mount, open, organize, roomHTML };
})(window.App);
