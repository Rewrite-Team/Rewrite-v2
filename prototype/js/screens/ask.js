/* 질문함 — 질문 하나 = 대화방 하나. (옛 '오늘의 질문' + '대화 기록'을 합친 화면)
   #/ask/:room
     room = 'new'            새 대화 (질문에 없는 이야기). ?project=<id> 면 그 프로젝트 기록으로. App.consumeCapturePreset() 로 미리 채운다
                             ?mode=deep&kw|exp|seed|free|cat|project|stage 면 바로 '경험 하나 끝까지 정리하기'(App.deep)로 연다 (옛 #/discover)
     모든 방에는 [✦ 경험 하나 끝까지 정리하기] 가 있다 — 누르면 그 방이 그 자리에서 깊은 대화(App.deep)로 바뀌고, 대화는 같은 방(thread)에 남는다
     room = 'q_<questionId>' 그 질문의 대화방 (대기·미뤄 둠·답변함)
     room = <threadId>       자유 대화방 (질문 없이 시작한 대화). 질문에 딸린 대화면 그 질문의 방으로 연다
   #/ask              기본: 첫 대기 질문 (모바일은 목록만)
   #/daily, #/chat?thread=<id>  옛 주소 */
(function (App) {
  const esc = (s) => App.ui.esc(s);

  const TYPES = {
    recall: { label: '기억 떠올리기', ico: '🌱' },
    deepen: { label: '경험 깊이 파기', ico: '🔍' },
    project: { label: '프로젝트 이야기', ico: '📌' },
    code: { label: '코드 분석에서 온 질문', ico: '⌥' },
  };
  const SRC_ICO = { capture: '✎', checkin: '📌', code: '⌥', check: '🩺', coach: '✦', chat: '✦', daily: '✉' };
  const STATUS_LABEL = { pending: '대기', answered: '답변함', skipped: '미뤄 둠' };
  // 끝낸 대화는 모두 경험이 된다. applied = 경험 카드에 담김, kept = 카드에 안 담긴 경험
  const OUT_LABEL = { applied: '카드에 담김', kept: '경험', open: '대화 중' };
  const SECTIONS = [['today', '오늘의 질문'], ['missed', '답하지 못한 질문'], ['past', '지난 대화']];
  const DOW = ['일', '월', '화', '수', '목', '금', '토'];

  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const typeInfo = (t) => TYPES[t] || TYPES.recall;
  const short = (t, n) => App.wiki.short(t, n);
  const title = (t, n) => short(String(t || '').replace(/[「」]/g, ''), n);
  const projName = (p) => App.store.projectName(p);
  const roomHref = (id) => '#/ask/' + encodeURIComponent(id);
  const isMobile = () => window.matchMedia('(max-width: 767px)').matches;

  /* ---------- 질문 → 위키 (홈도 같이 쓴다) ---------- */
  // 답하기 전: 이 답이 위키의 어디로 가는지
  function destOf(q) {
    if (!q) return null;
    if (q.type === 'code' || q.findingId) {
      const ff = q.findingId && App.store.findFinding(q.findingId);
      const p = q.targetProjectId && App.store.getProject(q.targetProjectId);
      return { kind: 'code', finding: ff ? ff.finding.title : '', text: '답하면 경험으로 저장되고, 이 코드가 근거로 붙은 경험 카드에 담겨요', href: p ? `#/vault/p/${p.id}?tab=code` : '' };
    }
    if (q.targetProjectId) {
      const p = App.store.getProject(q.targetProjectId);
      if (p) return { kind: 'project', text: `「${projName(p)}」 경험으로 저장되고, 관련 경험 카드에 담을 수 있어요`, href: '#/vault/p/' + p.id };
    }
    if (q.targetExpId) {
      const e = App.store.get(q.targetExpId);
      if (e) {
        const f = App.wiki.inferField('', q.text, q.stage);
        const cur = f === 'insights' ? e.insights : f === 'summary' ? e.summary : e.star[f];
        return { kind: 'deepen', text: `답하면 「${title(e.title, 28)}」 카드의 ${App.wiki.FIELD_LABEL[f] || f} 칸이 ${String(cur || '').trim() ? '보강돼요' : '채워져요'}`, href: '#/card/' + e.id };
      }
    }
    return { kind: 'recall', text: '답하면 경험으로 저장돼요. 비슷한 경험 카드가 있으면 거기에 담을 수 있어요', href: '' };
  }
  // 이 질문으로 나눈 대화들 (오래된 것부터)
  const qThreads = (qid) => App.wiki.threadsFor().filter((t) => t.questionId === qid);
  function threadOf(q) { const l = q ? qThreads(q.id) : []; return l.length ? l[l.length - 1] : null; }
  // 답한 뒤: 어느 경험 카드에 담겼는지 + 대화방 링크
  function wentOf(q) {
    const out = [];
    if (!q || q.status !== 'answered') return out;
    const t = threadOf(q);
    const room = roomHref('q_' + q.id);
    const e = q.compiledTo && App.store.get(q.compiledTo);
    const ee = e || (t && t.outcome && t.outcome.kind === 'applied' && t.outcome.expId && App.store.get(t.outcome.expId)) || (q.targetExpId && App.store.get(q.targetExpId));
    if (ee) out.push({ kind: 'applied', href: '#/card/' + ee.id, text: `「${title(ee.title, 28)}」 카드에 담김` });
    if (t) out.push({ kind: 'chat', href: room, text: '대화 보기' });
    return out;
  }
  function destHTML(q) {
    const d = destOf(q); if (!d) return '';
    const inner = `<span class="ask-dest-ico">→</span><span>${d.finding ? `<b>코드 「${esc(short(d.finding, 34))}」</b> · ` : ''}${esc(d.text)}</span>`;
    return d.href ? `<a class="ask-dest" data-kind="${d.kind}" href="${esc(d.href)}">${inner}</a>` : `<div class="ask-dest" data-kind="${d.kind}">${inner}</div>`;
  }

  /* ---------- 시간 ---------- */
  function nextTime() {
    const st = App.store.state.settings || {};
    const times = (st.times || []).slice().sort();
    if (!times.length) return { label: '설정 필요', time: '' };
    const now = new Date();
    const hm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const t = times.find((x) => x > hm);
    return t ? { label: `오늘 ${t}`, time: t } : { label: `내일 ${times[0]}`, time: times[0] };
  }
  function dayWord(d) {
    const now = new Date(); const y = new Date(now); y.setDate(now.getDate() - 1);
    if (d === ymd(now)) return '오늘';
    if (d === ymd(y)) return '어제';
    const x = App.store.parseDay(d);
    return `${x.getMonth() + 1}.${x.getDate()} (${DOW[x.getDay()]})`;
  }
  function askedLabel(askedAt) { if (!askedAt) return ''; const [d, t] = askedAt.split(' '); return `${dayWord(d)} ${t || ''}`.trim(); }
  // 목록용 짧은 시각: 오늘이면 HH:MM, 어제, 그 외 M.D
  function whenShort(s) {
    if (!s) return '';
    const [d, t] = s.split(' ');
    if (d === ymd(new Date())) return t || '오늘';
    const w = dayWord(d); return w === '어제' ? w : w.split(' ')[0];
  }
  // 목록 미리보기: 내가 마지막으로 한 말 (대화 끝에 자동으로 붙는 문구는 빼고 — 옛 문구 포함)
  const SYS_ME = /^(이렇게 반영해 주세요|경험 후보로 보관해 주세요|대화에만 보관해 주세요|이대로 충분해요|경험으로 저장해 주세요|이 카드에 담아 주세요|새 카드로 만들어 주세요)$/;
  const lastMine = (t) => { const m = t ? t.msgs.filter((x) => x.who === 'me' && !SYS_ME.test(x.text)).pop() : null; return m ? m.text : ''; };
  const lastAt = (t) => { const m = t.msgs[t.msgs.length - 1]; return `${(m && m.date) || t.date} ${(m && m.at) || t.at || ''}`.trim(); };

  /* ---------- 대화방 목록 ---------- */
  function rooms() {
    const qs = App.store.inbox();
    const qids = new Set(qs.map((q) => q.id));
    const out = [];
    qs.forEach((q) => {
      const ths = qThreads(q.id); const lt = ths[ths.length - 1];
      const lm = lt && lt.msgs.length ? lt.msgs[lt.msgs.length - 1] : null;
      const sec = q.status === 'pending' ? 'today' : q.status === 'answered' ? 'past' : 'missed';
      const went = wentOf(q);
      out.push({
        id: 'q_' + q.id, kind: 'question', q, threads: ths, sec, title: q.text, projectId: q.targetProjectId || null,
        ico: typeInfo(q.type).ico, type: q.type,
        when: sec === 'past' ? (lt ? lastAt(lt) : (q.answeredAt || (q.askedAt || '').slice(0, 10))) : (q.askedAt || ''),
        preview: sec === 'past' ? (lastMine(lt) || q.answer || (lm ? lm.text : '')) : (lt && lt.msgs.some((m) => m.who === 'me') ? '하다 만 대화가 있어요 · ' + (lm ? lm.text : '') : q.hint || ''),
        outcome: sec === 'past' ? (lt ? lt.outcome.kind : went.some((w) => w.kind === 'applied') ? 'applied' : '') : '',
        search: [q.text, q.answer, ...ths.flatMap((t) => t.msgs.map((m) => m.text))].join(' '),
      });
    });
    App.wiki.threadsFor().filter((t) => !t.questionId || !qids.has(t.questionId)).forEach((t) => {
      const lm = t.msgs[t.msgs.length - 1];
      const first = t.msgs.find((m) => m.who === 'me');
      out.push({
        id: t.id, kind: 'thread', t, threads: [t], sec: 'past', title: first ? first.text : (t.label || '대화'), label: t.label, projectId: t.projectId || null,
        ico: SRC_ICO[t.source] || '💬', when: lastAt(t), preview: (() => { const x = lastMine(t); return x && x !== (first && first.text) ? x : (lm ? lm.text : ''); })(), outcome: (t.outcome || {}).kind || 'open',
        search: [t.label, ...t.msgs.map((m) => m.text)].join(' '),
      });
    });
    return out;
  }
  function grouped(list) {
    const g = { today: [], missed: [], past: [] };
    list.forEach((r) => g[r.sec].push(r));
    g.missed.sort((a, b) => b.when.localeCompare(a.when));
    g.past.sort((a, b) => b.when.localeCompare(a.when));
    return g;
  }

  // 화면을 다시 그려도 유지되는 목록 상태
  const UI = { search: '', project: '', collapsed: {}, edit: false, sel: new Set(), scroll: 0 };

  function resolve(params) {
    let room = params.room || params.thread || '';
    const explicit = !!room || /^#\/daily/.test(location.hash);
    let hl = params.thread || null;
    if (room && room !== 'new' && !room.startsWith('q_')) {
      const t = App.wiki.getThread(room);
      if (t && t.questionId && App.store.getQuestion(t.questionId)) { hl = t.id; room = 'q_' + t.questionId; }
    }
    if (!room) { const p = App.store.pending()[0]; room = p ? 'q_' + p.id : ''; }
    return { room, explicit, hl };
  }

  App.screens.ask = {
    title: '질문함',
    destOf,
    wentOf,
    render(params) {
      const r = resolve(params);
      return `<div class="page ask-page">
        <div class="ask ${r.explicit ? 'has-room' : ''}">
          <aside class="card ask-list" data-ask-list></aside>
          <section class="card ask-room" data-ask-room></section>
        </div>
      </div>`;
    },
    mount(root, params) {
      const S = App.store; const W = App.wiki;
      const R = resolve(params);
      let cur = R.room; // 지금 열린 방 id
      let talk = null; let org = null; let mo = null; let deep = null;
      let newProject = null; // 새 대화방이 정해 둔 프로젝트
      const listEl = root.querySelector('[data-ask-list]');
      const roomEl = root.querySelector('[data-ask-room]');

      /* ========== 왼쪽: 목록 ========== */
      function itemHTML(r) {
        const p = r.projectId && S.getProject(r.projectId);
        const on = r.id === cur;
        const sel = UI.sel.has(r.id);
        const st = ''; // '답하지 못한 질문' 칸은 모두 미뤄 둔 질문이라 상태 칩을 따로 달지 않는다
        const oc = r.outcome ? `<span class="ask-oc is-${r.outcome}">${OUT_LABEL[r.outcome]}</span>` : '';
        const fresh = r.sec === 'today' && (r.q.askedAt || '').slice(0, 10) === S.localDay() ? '<span class="ask-st is-new">새 질문</span>' : '';
        return `<li><a class="ask-item ${on ? 'is-on' : ''} ${sel ? 'is-sel' : ''}" href="${roomHref(r.id)}" data-room-id="${esc(r.id)}">
          ${UI.edit ? `<span class="ask-check ${sel ? 'on' : ''}" aria-hidden="true">${sel ? '✓' : ''}</span>` : ''}
          <span class="ask-ico" data-type="${esc(r.type || r.kind)}">${r.ico}</span>
          <span class="ask-item-main">
            <span class="ask-item-top"><span class="ask-item-title">${esc(r.title)}</span><span class="ask-item-when">${esc(whenShort(r.when))}</span></span>
            ${r.preview ? `<span class="ask-item-sub">${esc(short(r.preview, 60))}</span>` : ''}
            ${st || oc || fresh || p || r.label ? `<span class="ask-item-tags">${fresh}${st}${oc}${r.kind === 'thread' && r.label ? `<span class="ask-tag">${esc(r.label)}</span>` : ''}${p ? `<span class="ask-tag">▤ ${esc(projName(p))}</span>` : ''}</span>` : ''}
          </span>
        </a></li>`;
      }
      function visibleRooms() {
        const s = UI.search.trim().toLowerCase();
        return rooms().filter((r) => (!UI.project || r.projectId === UI.project) && (!s || r.search.toLowerCase().includes(s)));
      }
      function sectionsHTML() {
        const g = grouped(visibleRooms());
        const filtering = UI.search.trim() || UI.project;
        const empty = {
          today: `<li class="ask-empty-li">오늘 질문은 모두 답했어요 · 다음 질문 ⏰ ${esc(nextTime().label)}</li>`,
          missed: '<li class="ask-empty-li">미뤄 둔 질문이 없어요</li>',
          past: '<li class="ask-empty-li">아직 나눈 대화가 없어요</li>',
        };
        return SECTIONS.map(([k, l]) => {
          const items = g[k];
          if (filtering && !items.length) return '';
          const closed = UI.collapsed[k];
          return `<div class="ask-sec ${closed ? 'is-closed' : ''}" data-sec="${k}">
            <button type="button" class="ask-sec-head" data-ask-toggle="${k}" aria-expanded="${!closed}">
              <span class="ask-caret">▾</span><span>${l}</span>
              ${items.length ? `<span class="ask-count ${k === 'today' ? 'is-hot' : ''}">${items.length}</span>` : ''}
            </button>
            ${closed ? '' : `<ul class="ask-items">${items.length ? items.map(itemHTML).join('') : (filtering ? '' : empty[k])}</ul>`}
          </div>`;
        }).join('') + (filtering && !Object.values(g).some((x) => x.length) ? '<p class="ask-none">조건에 맞는 대화방이 없어요.</p>' : '');
      }
      function editbarHTML() {
        if (!UI.edit) return '';
        const n = UI.sel.size; const xn = selectedExps().length;
        return `<div class="ask-editbar">
          <button type="button" class="btn btn-ghost btn-sm" data-ask-selall>${n && n === visibleRooms().length ? '선택 해제' : '전체 선택'}</button>
          <span class="subtle">${n}개 선택</span>
          <button type="button" class="btn btn-primary btn-sm" data-ask-compose ${xn ? '' : 'disabled'} title="${xn ? `경험 ${xn}개를 모아 경험 카드 하나로 만들어요` : '끝낸 대화(경험)를 골라 주세요'}">선택한 경험으로 카드 만들기</button>
          <button type="button" class="btn btn-danger btn-sm" data-ask-bulkdel ${n ? '' : 'disabled'}>선택 삭제</button>
        </div>`;
      }
      // 선택한 방들 → 그 방의 경험(끝낸 대화) id 들
      function selectedExps() {
        const ok = new Set(W.experienceItems().map((it) => it.id));
        const all = rooms();
        return [...new Set([...UI.sel].flatMap((id) => { const r = all.find((x) => x.id === id); return r ? r.threads.map((t) => t.id) : []; }))].filter((id) => ok.has(id));
      }
      function renderList() {
        const projects = S.projects();
        listEl.innerHTML = `
          <div class="ask-list-top">
            <div class="ask-list-row">
              <button type="button" class="btn btn-primary ask-new" data-ask-new>＋ 새 대화</button>
              <button type="button" class="btn btn-sm ${UI.edit ? 'is-on' : ''}" data-ask-edit>${UI.edit ? '완료' : '편집'}</button>
            </div>
            <div class="ask-stats">
              <span title="연속 기록">🔥 ${S.streak()}일 연속</span><span class="ask-dot">·</span>
              <span title="다음 질문">⏰ 다음 질문 ${esc(nextTime().label)}</span>
              <a href="#/settings" class="ask-rhythm">리듬 설정</a>
            </div>
            <div class="ask-filter">
              <input class="input ask-search" type="search" placeholder="질문·대화 검색" value="${esc(UI.search)}" data-ask-search aria-label="검색">
              ${projects.length ? `<select class="input ask-proj" data-ask-project aria-label="프로젝트별">
                <option value="">전체 프로젝트</option>
                ${projects.map((p) => `<option value="${esc(p.id)}" ${UI.project === p.id ? 'selected' : ''}>▤ ${esc(projName(p))}</option>`).join('')}
              </select>` : ''}
            </div>
          </div>
          <div class="ask-scroll" data-ask-scroll>
            <div data-ask-secs>${sectionsHTML()}</div>
            <button type="button" class="ask-demo" data-ask-demo><span class="ask-demo-tag">데모</span>✉ 질문 하나 더 받기</button>
          </div>
          <div data-ask-editbar>${editbarHTML()}</div>`;
        const sc = listEl.querySelector('[data-ask-scroll]');
        sc.scrollTop = UI.scroll;
        sc.addEventListener('scroll', () => { UI.scroll = sc.scrollTop; });
        const inp = listEl.querySelector('[data-ask-search]');
        inp.addEventListener('input', () => { UI.search = inp.value; refreshSecs(); });
        const sel = listEl.querySelector('[data-ask-project]');
        if (sel) sel.onchange = () => { UI.project = sel.value; refreshSecs(); };
      }
      function refreshSecs() {
        const box = listEl.querySelector('[data-ask-secs]'); if (box) box.innerHTML = sectionsHTML();
        const eb = listEl.querySelector('[data-ask-editbar]'); if (eb) eb.innerHTML = editbarHTML();
      }
      function updateBadge() {
        const n = S.pending().length;
        document.querySelectorAll('.nav-item[href="#/ask"]').forEach((a) => {
          let b = a.querySelector('.badge-count');
          if (!n) { if (b) b.remove(); return; }
          if (!b) { b = document.createElement('span'); b.className = 'badge-count'; b.title = '아직 답하지 않은 오늘의 질문'; a.appendChild(b); }
          b.textContent = n;
        });
      }
      function refreshAll() { refreshSecs(); updateBadge(); }

      listEl.addEventListener('click', (ev) => {
        const t = ev.target;
        const it = t.closest('[data-room-id]');
        if (it && UI.edit) { ev.preventDefault(); const id = it.dataset.roomId; if (UI.sel.has(id)) UI.sel.delete(id); else UI.sel.add(id); refreshSecs(); return; }
        if (it) { ev.preventDefault(); App.navigate(roomHref(it.dataset.roomId)); return; }
        const tg = t.closest('[data-ask-toggle]');
        if (tg) { UI.collapsed[tg.dataset.askToggle] = !UI.collapsed[tg.dataset.askToggle]; refreshSecs(); return; }
        if (t.closest('[data-ask-new]')) { App.navigate('#/ask/new'); return; }
        if (t.closest('[data-ask-edit]')) { UI.edit = !UI.edit; UI.sel.clear(); renderList(); return; }
        if (t.closest('[data-ask-selall]')) {
          const ids = visibleRooms().map((r) => r.id);
          if (UI.sel.size === ids.length) UI.sel.clear(); else ids.forEach((id) => UI.sel.add(id));
          refreshSecs(); return;
        }
        if (t.closest('[data-ask-bulkdel]')) { confirmDelete([...UI.sel]); return; }
        if (t.closest('[data-ask-compose]')) {
          const ids = selectedExps(); if (!ids.length) return;
          const e = W.composeCard(ids);
          if (!e) return;
          UI.sel.clear(); UI.edit = false;
          App.ui.toast(`경험 ${ids.length}개를 모아 경험 카드를 만들었어요`);
          App.navigate('#/card/' + e.id); return;
        }
        if (t.closest('[data-ask-demo]')) { pushDemo(); }
      });

      /* ========== 지우기 ========== */
      function deleteRoom(id) {
        if (id.startsWith('q_')) return S.deleteQuestion(id.slice(2));
        const ok = W.deleteThread(id); return ok;
      }
      function confirmDelete(ids) {
        const all = rooms(); const list = ids.map((id) => all.find((r) => r.id === id)).filter(Boolean);
        if (!list.length) return;
        const msgs = list.reduce((n, r) => n + r.threads.length, 0);
        const openQ = list.filter((r) => r.kind === 'question' && r.sec !== 'past').length;
        App.ui.modal({
          title: list.length === 1 ? '이 대화방을 지울까요?' : `대화방 ${list.length}개를 지울까요?`,
          body: `<div class="ask-del">
            ${list.length === 1 ? `<p class="ask-del-name">「${esc(short(list[0].title, 60))}」</p>` : `<ul class="ask-del-list">${list.slice(0, 5).map((r) => `<li>${r.ico} ${esc(short(r.title, 48))}</li>`).join('')}${list.length > 5 ? `<li class="subtle">외 ${list.length - 5}개</li>` : ''}</ul>`}
            <p>${msgs ? `대화 ${msgs}개의 원문이 함께 지워지고, 되돌릴 수 없어요.` : '이 방에는 아직 대화가 없어요.'}</p>
            ${openQ ? `<p>아직 답하지 않은 질문${openQ > 1 ? ` ${openQ}개` : ''}은 다시 묻지 않아요.</p>` : ''}
            <p class="ask-del-safe">✓ 이미 만든 경험 카드와 변경 기록, 프로젝트 타임라인 기록은 그대로 남아요.</p>
          </div>`,
          confirmText: '지우기', danger: true,
          onConfirm: () => {
            let n = 0; list.forEach((r) => { if (deleteRoom(r.id)) n++; });
            UI.sel.clear(); UI.edit = false;
            App.ui.toast(n > 1 ? `대화방 ${n}개를 지웠어요` : '대화방을 지웠어요');
            if (list.some((r) => r.id === cur || r.id === R.room)) App.navigate('#/ask');
            else { renderList(); updateBadge(); }
          },
        });
      }

      /* ========== 오른쪽: 대화방 ========== */
      function dropRoom() {
        if (deep) { const d = deep; deep = null; try { d(); } catch (e) { /* ignore */ } }
        if (talk) { try { talk.destroy(); } catch (e) { /* ignore */ } talk = null; }
        if (org) { try { org.destroy(); } catch (e) { /* ignore */ } org = null; }
        if (mo) { mo.disconnect(); mo = null; }
      }
      const bodyEl = () => roomEl.querySelector('[data-ask-body]');
      function toBottom() { const b = bodyEl(); if (b) b.scrollTop = b.scrollHeight; }
      // talk 가 다시 그려질 때마다 아래로 (메신저처럼)
      function follow(el) { mo = new MutationObserver(() => requestAnimationFrame(toBottom)); mo.observe(el, { childList: true, subtree: true }); }
      function headHTML({ meta, h, actions }) {
        return `<div class="ask-room-head">
          <a class="ask-back" href="#/ask" aria-label="목록으로">‹</a>
          <div class="ask-room-titles"><div class="ask-room-meta">${meta || ''}</div><h2 class="ask-room-h">${h}</h2></div>
          <div class="ask-room-actions">${actions || ''}</div>
        </div>`;
      }
      const deepBtn = () => `<button type="button" class="btn btn-sm ask-deep-btn" data-ask-act="deep" title="상황→과제→행동→결과→배운 점 순서로 이 이야기를 끝까지 정리해요">✦ <span class="ask-deep-l">경험 하나 </span>끝까지 정리하기</button>`;
      const delBtn = (id) => `<button type="button" class="btn btn-ghost btn-sm ask-del-btn" data-ask-del="${esc(id)}" title="대화방 지우기">🗑 삭제</button>`;
      function qMeta(q) {
        const t = typeInfo(q.type); const p = q.targetProjectId && S.getProject(q.targetProjectId);
        const st = q.status === 'answered' ? '<span class="ask-st is-answered">✓ 답변함</span>' : q.status !== 'pending' ? `<span class="ask-st is-${q.status}">${STATUS_LABEL[q.status]}</span>` : '';
        return `<span class="ask-type" data-type="${esc(q.type)}">${t.ico} ${t.label}</span>${p ? `<span>▤ ${esc(projName(p))}</span>` : ''}<span>${esc(askedLabel(q.askedAt))} 도착</span>${st}`;
      }
      const nextPendingOf = (qid) => S.pending().find((x) => x.id !== qid) || null;

      function renderRoom() {
        dropRoom();
        roomEl.classList.remove('is-done');
        if (cur === 'new') return roomNew();
        if (!cur) return roomDone();
        if (cur.startsWith('q_')) {
          const q = S.getQuestion(cur.slice(2));
          if (!q) return roomMissing();
          return q.status === 'answered' ? roomAnswered(q) : roomOpenQ(q);
        }
        const t = W.getThread(cur);
        return t ? roomThread(t) : roomMissing();
      }

      // ----- 아직 답하지 않은 질문 (대기 · 미뤄 둠) -----
      function srcOf(q) {
        if (q.findingId) return { type: 'answer', question: q.text, questionId: q.id, projectId: q.targetProjectId, findingId: q.findingId };
        if (q.targetProjectId && S.getProject(q.targetProjectId)) return { type: 'checkin', question: q.text, questionId: q.id, projectId: q.targetProjectId, logType: q.logType };
        if (q.targetExpId) return { type: 'answer', question: q.text, questionId: q.id, expId: q.targetExpId, stage: q.stage };
        return { type: 'answer', question: q.text, questionId: q.id };
      }
      function roomOpenQ(q) {
        const closed = qThreads(q.id).filter((t) => t.outcome.kind !== 'open');
        const actions = deepBtn() + (q.status === 'pending' ? `<button type="button" class="btn btn-ghost btn-sm" data-ask-act="skip" title="'답하지 못한 질문'으로 옮겨 두고, 언제든 답할 수 있어요">나중에 답하기</button>` : '') + delBtn(cur);
        roomEl.innerHTML = headHTML({ meta: qMeta(q), h: esc(q.text), actions }) + `
          <div class="ask-room-body" data-ask-body>
            ${closed.length ? `<div class="ask-history"><div class="ask-history-cap">지난 대화</div>${App.talk.roomHTML(closed, { highlight: R.hl })}</div>` : ''}
            ${q.status === 'skipped' ? '<div class="ask-revisit">미뤄 둔 질문이에요. 지금 답해도 괜찮아요.</div>' : ''}
            ${destHTML(q)}
            <div class="ask-talk" data-ask-talk></div>
          </div>`;
        const box = roomEl.querySelector('[data-ask-talk]');
        follow(box);
        talk = App.talk.mount(box, {
          ask: { text: q.text, hint: q.hint || '' },
          src: srcOf(q),
          commit: (text, d, tid) => S.answer(q.id, text, { decision: d, threadId: tid }),
          onDone: () => {
            App.ui.toast(`🔥 ${S.streak()}일 연속 기록 중`);
            const h = roomEl.querySelector('.ask-room-head'); const fresh = S.getQuestion(q.id);
            if (h && fresh) h.outerHTML = headHTML({ meta: qMeta(fresh), h: esc(fresh.text), actions: `${deepBtn()}<button type="button" class="btn btn-ghost btn-sm" data-ask-act="reask">다시 답하기</button>${delBtn(cur)}` });
            const rv = roomEl.querySelector('.ask-revisit'); if (rv) rv.remove();
            const ds = roomEl.querySelector('.ask-dest'); if (ds) ds.remove();
            refreshAll();
          },
          room: false,
          next: { get label() { return nextPendingOf(q.id) ? '다음 질문 →' : '질문함으로'; }, onClick: () => { const n = nextPendingOf(q.id); App.navigate(n ? roomHref('q_' + n.id) : '#/ask'); } },
          noAutofocus: isMobile(),
        });
        requestAnimationFrame(toBottom);
      }

      // ----- 답한 질문 -----
      function roomAnswered(q) {
        const ths = qThreads(q.id);
        const went = wentOf(q).filter((w) => w.kind === 'applied');
        roomEl.innerHTML = headHTML({ meta: qMeta(q), h: esc(q.text), actions: deepBtn() + delBtn(cur) }) + `
          <div class="ask-room-body" data-ask-body>
            ${ths.length ? App.talk.roomHTML(ths, { organize: true, highlight: R.hl })
              : `<div class="tk-thread"><div class="tk-rm ai"><div class="tk-rm-b">${esc(q.text)}</div></div>${q.answer ? `<div class="tk-rm me"><div class="tk-rm-b">${esc(q.answer)}</div></div>` : ''}</div>`}
            ${went.length ? `<div class="ask-went">${went.map((w) => `<a class="ask-target" href="${esc(w.href)}"><span class="ask-target-ico">✓</span><span>${esc(w.text)}</span></a>`).join('')}</div>`
              : ths.some((t) => t.outcome.kind === 'applied') ? '' : '<div class="ask-went subtle">경험으로 저장했고, 아직 어떤 카드에도 담지 않았어요. 위의 [카드에 담기]로 경험 카드에 넣을 수 있어요.</div>'}
          </div>
          <div class="ask-foot"><span class="subtle">다른 답이 떠올랐다면</span><button type="button" class="btn btn-sm" data-ask-act="reask">다시 답하기</button></div>`;
        scrollToHl();
      }

      // ----- 자유 대화 (질문 없이 시작한 대화) -----
      function roomThread(t) {
        const p = t.projectId && S.getProject(t.projectId);
        const o = (t.outcome || {}).kind || 'open';
        const meta = `<span class="ask-type" data-type="thread">${SRC_ICO[t.source] || '💬'} ${esc(t.label || '대화')}</span>${p ? `<span>▤ ${esc(projName(p))}</span>` : ''}<span>${esc(dayWord(t.date))} ${esc(t.at || '')}</span><span class="ask-oc is-${o}">${OUT_LABEL[o]}</span>`;
        const first = t.msgs.find((m) => m.who === 'me');
        roomEl.innerHTML = headHTML({ meta, h: esc(short(first ? first.text : t.label || '대화', 80)), actions: deepBtn() + delBtn(t.id) }) + `
          <div class="ask-room-body" data-ask-body>
            ${App.talk.roomHTML([t], { organize: true })}
            <div class="ask-cont" data-ask-cont></div>
          </div>
          <div class="ask-foot" data-ask-contfoot><span class="subtle">${o === 'applied' ? '이 이야기에 보탤 게 생겼나요?' : '이어서 말하면 같이 정리해요'}</span><button type="button" class="btn btn-sm" data-ask-act="continue">＋ 이어서 이야기하기</button></div>`;
        requestAnimationFrame(toBottom);
      }
      function continueThread(t) {
        const foot = roomEl.querySelector('[data-ask-contfoot]'); if (foot) foot.remove();
        const box = roomEl.querySelector('[data-ask-cont]');
        const o = t.outcome || {};
        follow(box);
        talk = App.talk.mount(box, {
          ask: { text: '이 이야기에 이어서 무엇을 남겨 둘까요?', hint: '새 경험으로 저장되고, 같은 경험 카드에 담을 수 있어요.' },
          src: t.projectId ? { type: 'checkin', projectId: t.projectId, question: '(이어서 기록)', expId: o.expId || null } : { type: 'manual', question: '(이어서 기록)', expId: o.expId || null },
          thread: { source: t.source === 'checkin' ? 'checkin' : 'capture', label: `${t.label || '대화'} · 이어서` },
          onFirstSend: () => adopt(),
          onDone: () => refreshAll(),
          next: { label: '새 대화', onClick: () => App.navigate('#/ask/new') },
        });
        requestAnimationFrame(toBottom);
      }

      // ----- 새 대화 -----
      function roomNew() {
        if (params.mode === 'deep') {
          // 옛 #/discover 와 '경험 정리하기' 링크: 새 방을 바로 깊은 대화로
          const pick = ['exp', 'stage', 'kw', 'seed', 'free', 'cat'];
          const cfg = {}; pick.forEach((k) => { if (params[k] != null && params[k] !== '') cfg[k] = params[k]; });
          if (params.project) cfg.projectId = params.project;
          return enterDeep(cfg);
        }
        const preset = App.consumeCapturePreset ? (App.consumeCapturePreset() || {}) : {};
        const pid = preset.projectId || params.project || '';
        const project = pid ? S.getProject(pid) : null;
        newProject = project;
        const meta = `<span class="ask-type" data-type="thread">✎ 새 대화</span>${project ? `<span>▤ ${esc(projName(project))}</span>` : ''}<span>질문에 없는 이야기도 괜찮아요</span>`;
        roomEl.innerHTML = headHTML({ meta, h: project ? `「${esc(projName(project))}」 기록하기` : '무엇이든 기록해 두세요', actions: deepBtn() }) + `
          <div class="ask-room-body" data-ask-body>
            <div class="ask-intro" data-ask-intro>
              <p>한 줄이면 충분해요. 끝낸 대화는 경험으로 저장되고, 어느 경험 카드에 담을지는 AI가 제안해요. 정하는 건 나예요.</p>
              <div class="ask-modes">
                <div class="ask-deep-hint"><span class="ask-mode-ico">✦</span><div><b>더 깊게 정리하고 싶어지면 언제든</b><span class="subtle">이 방 위의 [경험 하나 끝까지 정리하기]를 누르면, 지금까지 한 이야기를 이어받아 상황→과제→행동→결과→배운 점 순서로 길게 대화하고, 그 대화로 경험 카드 하나를 바로 만들어요.</span></div></div>
                <a class="ask-mode" href="${project ? `#/vault/p/${esc(project.id)}?tab=code` : '#/vault'}"><span class="ask-mode-ico">⌥</span><div><b>GitHub 레포 분석</b><span class="subtle">코드에서 찾은 기술 포인트가 근거로 붙고, 빈 이야기는 질문으로 와요</span></div></a>
              </div>
            </div>
            <div class="ask-talk" data-ask-talk></div>
          </div>`;
        const box = roomEl.querySelector('[data-ask-talk]');
        follow(box);
        talk = App.talk.mount(box, {
          ask: { text: project ? `「${projName(project)}」에서 어떤 일이 있었나요?` : '무엇을 기록해 둘까요?', hint: '한 줄이면 충분해요. 어느 경험 카드에 담을지는 같이 정해요.' },
          prefill: preset.text || '',
          src: project ? { type: 'checkin', projectId: project.id, question: '(직접 기록)' } : { type: 'manual', question: '(직접 기록)' },
          thread: project ? undefined : { source: 'capture' },
          // 프로젝트를 정해 두고 기록하면 원문은 그 프로젝트 타임라인에도 남는다
          commit: project ? (text, decision, tid) => {
            const t = /결정|선택/.test(text) ? 'decision' : /문제|에러|버그|오류/.test(text) ? 'issue' : /팀원|같이|의견/.test(text) ? 'collab' : /배웠|알게/.test(text) ? 'learning' : 'milestone';
            const log = S.addLog(project.id, Object.assign({ text, type: t }, tid ? { threadId: tid } : {}));
            return W.ingest({ type: 'checkin', text, projectId: project.id, logId: log.id, logType: t, keywords: log.keywords, decision, threadId: tid });
          } : null,
          onFirstSend: () => adopt(),
          onDone: () => refreshAll(),
          next: { label: '새 대화 하나 더', onClick: () => App.navigate('#/ask/new') },
          noAutofocus: isMobile(),
        });
        if (talk.threadId) adopt(); // 미리 채운 글이 있으면 바로 대화가 시작된다
      }
      // 첫 말을 하면 새 대화가 진짜 대화방이 된다 — 주소만 바꾸고(다시 그리지 않음) 목록에 올린다
      function adopt() {
        const tid = talk && talk.threadId; if (!tid) return;
        cur = tid;
        try { history.replaceState(null, '', roomHref(tid)); } catch (e) { /* ignore */ }
        const intro = roomEl.querySelector('[data-ask-intro]'); if (intro) intro.remove();
        const acts = roomEl.querySelector('.ask-room-actions'); if (acts && !acts.querySelector('[data-ask-del]')) acts.insertAdjacentHTML('beforeend', delBtn(tid));
        roomEl.closest('.ask').classList.add('has-room');
        refreshSecs();
      }

      // ----- 경험 하나 끝까지 정리하기 (깊은 대화) — 지금 방 그대로, 오른쪽 칸만 App.deep 으로 바꾼다 -----
      // 이 방에서 이미 한 이야기를 이어받는다: 경험에 반영된 방이면 그 경험을 다듬고, 아니면 한 말을 첫 답변으로
      function deepCfgFor() {
        const live = talk && talk.threadId ? W.getThread(talk.threadId) : null;
        const expOf = (t) => (t && t.outcome && t.outcome.kind === 'applied' && t.outcome.expId && S.get(t.outcome.expId) ? t.outcome.expId : null);
        const firstAi = (t) => ((t && t.msgs.find((m) => m.who === 'ai')) || {}).text || '';
        if (cur === 'new' && !live) return { projectId: newProject ? newProject.id : '' };
        if (cur.startsWith('q_')) {
          const q = S.getQuestion(cur.slice(2)); if (!q) return {};
          const ths = qThreads(q.id); const lt = live || ths[ths.length - 1] || null;
          const all = ths.concat(live && !ths.includes(live) ? [live] : []);
          const exp = (q.compiledTo && S.get(q.compiledTo) ? q.compiledTo : null) || expOf(lt) || (q.targetExpId && S.get(q.targetExpId) ? q.targetExpId : null);
          const applied = q.status === 'answered' || (lt && lt.outcome.kind === 'applied');
          const said = applied ? '' : (lt ? W.threadText(lt) : '');
          return {
            exp, stage: q.stage || null, projectId: q.targetProjectId || '', questionId: q.id, threadId: lt ? lt.id : null,
            ask: q.status !== 'answered' ? q.text : '', question: q.text, answer: said || (!exp && q.status === 'answered' ? q.answer || '' : ''),
            historyHTML: all.length ? App.talk.roomHTML(all, {}) : q.answer ? `<div class="tk-thread"><div class="tk-rm ai"><div class="tk-rm-b">${esc(q.text)}</div></div><div class="tk-rm me"><div class="tk-rm-b">${esc(q.answer)}</div></div></div>` : '',
          };
        }
        const t = live || W.getThread(cur); if (!t) return {};
        const exp = expOf(t);
        return {
          exp, projectId: t.projectId || (newProject ? newProject.id : ''), threadId: t.id, questionId: t.questionId || null,
          answer: exp ? '' : W.threadText(t), question: firstAi(t),
          historyHTML: App.talk.roomHTML([t], {}),
        };
      }
      function enterDeep(cfg) {
        dropRoom();
        roomEl.classList.remove('is-done');
        const q = cur.startsWith('q_') ? S.getQuestion(cur.slice(2)) : null;
        const t = !q && cur !== 'new' ? W.getThread(cur) : null;
        const p = cfg.projectId && S.getProject(cfg.projectId);
        const e = cfg.exp && S.get(cfg.exp);
        const h = q ? esc(q.text) : t ? esc(short(((t.msgs.find((m) => m.who === 'me') || {}).text) || t.label || '대화', 80)) : e ? `「${esc(title(e.title, 40))}」 다듬기` : '경험 하나 끝까지 정리하기';
        const meta = `<span class="ask-type" data-type="deep">✦ 경험 하나 끝까지 정리하기</span>${p ? `<span>▤ ${esc(projName(p))}</span>` : ''}<span>상황→과제→행동→결과→배운 점</span>`;
        const actions = `<button type="button" class="btn btn-ghost btn-sm" data-ask-act="deep-exit" title="정리를 멈추고 대화방으로">✕ 정리 닫기</button>${cur !== 'new' ? delBtn(cur) : ''}`;
        roomEl.innerHTML = headHTML({ meta, h, actions }) + '<div class="ask-deep" data-ask-deep></div>';
        roomEl.closest('.ask').classList.add('has-room');
        const qid = q ? q.id : cfg.questionId || null;
        deep = App.deep.mount(roomEl.querySelector('[data-ask-deep]'), Object.assign({}, cfg, {
          questionId: qid,
          onThread: (id) => {
            if (cur === 'new') {
              cur = id; params.mode = null;
              try { history.replaceState(null, '', roomHref(id)); } catch (e) { /* ignore */ }
              const acts = roomEl.querySelector('.ask-room-actions'); if (acts && !acts.querySelector('[data-ask-del]')) acts.insertAdjacentHTML('beforeend', delBtn(id));
            }
            refreshSecs();
          },
          onPersist: ({ expId, entryId, firstAnswer }) => {
            // 질문방에서 정리했으면 그 질문은 답한 것으로
            const qq = qid && S.getQuestion(qid);
            if (qq && qq.status !== 'answered') {
              qq.answer = qq.answer || firstAnswer || ''; qq.answeredAt = S.localDay(); qq.compiledTo = expId;
              if (entryId) qq.wikiEntry = entryId;
              // 프로젝트에 대한 질문이었다면 짧게 답할 때처럼 첫 답을 프로젝트 타임라인에도 남긴다
              if (qq.type === 'project' && !qq.findingId && qq.targetProjectId && S.getProject(qq.targetProjectId) && qq.answer) {
                const tid = cur && cur !== 'new' && !String(cur).startsWith('q_') ? cur : (W.threadsFor({}).find((t) => t.questionId === qq.id) || {}).id;
                S.addLog(qq.targetProjectId, Object.assign({ text: qq.answer, type: qq.logType || 'milestone', fromQuestion: qq.text }, tid ? { threadId: tid } : {}));
              }
              S.setQuestionStatus(qq.id, 'answered');
            }
            refreshAll();
          },
          onDone: () => { refreshAll(); },
          onExit: () => exitDeep(),
        }));
      }
      function exitDeep() {
        dropRoom();
        if (cur === 'new') { params.mode = null; try { history.replaceState(null, '', '#/ask/new'); } catch (e) { /* ignore */ } }
        renderRoom(); refreshAll();
      }

      // ----- 빈 상태 -----
      function roomDone() {
        roomEl.classList.add('is-done');
        roomEl.innerHTML = `<div class="ask-done">
          <div class="ask-done-ill" aria-hidden="true">✓</div>
          <h2>오늘 질문은 모두 답했어요 🎉</h2>
          <p>다음 질문은 <b>${esc(nextTime().label)}</b>에 도착해요. 답하지 못한 질문이나 지난 대화는 왼쪽에서 다시 열 수 있어요.</p>
          <div class="ask-done-actions">
            <button type="button" class="btn btn-primary" data-ask-go="#/ask/new">＋ 새 대화</button>
            <button type="button" class="btn" data-ask-demo>✉ 질문 하나 더 받기</button>
          </div>
        </div>`;
      }
      function roomMissing() {
        roomEl.innerHTML = `<div class="ask-done"><h2>대화방을 찾을 수 없어요</h2><p>지워졌거나 주소가 바뀌었어요.</p>
          <div class="ask-done-actions"><a class="btn" href="#/ask">질문함으로</a></div></div>`;
      }

      function scrollToHl() {
        requestAnimationFrame(() => {
          const b = bodyEl(); if (!b) return;
          const el = R.hl && b.querySelector(`[data-thread="${CSS && CSS.escape ? CSS.escape(R.hl) : R.hl}"]`);
          if (el) b.scrollTop = Math.max(0, el.offsetTop - b.offsetTop - 16); else toBottom();
        });
      }

      // 카드에 안 담긴 경험을 그 자리에서 카드에 담기 — 따로 박스를 띄우지 않고 이 방의 대화 흐름 맨 아래에 이어 쓴다.
      // 맨 아래 '다시 답하기 / 이어서 이야기하기' 바 자리는 이 대화의 입력창이 된다
      function openOrg(threadId) {
        if (org) return;
        const th = roomEl.querySelector(`[data-thread="${CSS && CSS.escape ? CSS.escape(threadId) : threadId}"]`); if (!th) return;
        const body = bodyEl(); if (!body) return;
        roomEl.querySelectorAll('.ask-foot').forEach((x) => x.remove());
        roomEl.querySelectorAll('[data-room-organize]').forEach((b) => { b.disabled = true; });
        const wrap = document.createElement('div');
        wrap.className = 'ask-cont ask-org-wrap';
        wrap.innerHTML = '<div class="ask-org-cap"><span>카드에 담는 중</span><button type="button" class="ask-org-stop" data-ask-org-close>그만두기</button></div><div class="ask-org-slot"></div>';
        body.appendChild(wrap);
        const cap = wrap.querySelector('.ask-org-cap'); const slot = wrap.querySelector('.ask-org-slot');
        const close = () => { renderRoom(); refreshAll(); };
        cap.querySelector('[data-ask-org-close]').onclick = close;
        follow(slot);
        org = App.talk.organize(slot, threadId, {
          quietPrefill: true,
          noAutofocus: isMobile(),
          onDone: () => {
            const t = W.getThread(threadId);
            const fresh = document.createElement('div');
            fresh.innerHTML = App.talk.roomHTML([t], {});
            const nt = fresh.querySelector('.tk-thread'); const old = roomEl.querySelector(`[data-thread="${threadId}"]`);
            if (nt && old) old.replaceWith(nt);
            refreshAll();
          },
          next: { label: '확인', onClick: close },
        });
        requestAnimationFrame(toBottom);
      }

      /* ========== 동작 ========== */
      function pushDemo() {
        const P = window.SEED.recallPrompts;
        const pendingTexts = S.pending().map((q) => q.text);
        const pool = P.filter((p) => !pendingTexts.includes(p.text));
        const p = (pool.length ? pool : P)[Math.floor(Math.random() * (pool.length || P.length))];
        S.pushQuestion({ text: p.text, type: 'recall', targetExpId: null, hint: '거창하지 않아도 돼요. 떠오르는 장면 하나면 충분해요.' });
        const id = 'q_' + S.inbox()[0].id;
        App.ui.pushToast('오늘의 질문이 도착했어요', p.text, roomHref(id));
        UI.collapsed.today = false;
        if (!cur) App.navigate(roomHref(id)); else refreshAll();
      }
      // 다시 답하기: 이전 답이 위키에 만든 변화(와 프로젝트 기록)를 먼저 되돌려 중복 반영을 막고, 같은 방에서 대화를 다시 연다
      function reask(qid) {
        const q = S.getQuestion(qid);
        const prev = q && q.wikiEntry ? W.get(q.wikiEntry) : null;
        if (prev && !prev.undone) {
          if (W.canUndo(prev)) W.undo(prev.id, true);
          if (prev.source.logId && prev.source.projectId) S.removeLog(prev.source.projectId, prev.source.logId);
        }
        S.setQuestionStatus(qid, 'pending');
        App.navigate(roomHref('q_' + qid));
      }
      roomEl.addEventListener('click', (ev) => {
        const t = ev.target;
        const del = t.closest('[data-ask-del]');
        if (del) { confirmDelete([del.dataset.askDel]); return; }
        const og = t.closest('[data-room-organize]');
        if (og) { ev.preventDefault(); openOrg(og.dataset.roomOrganize); return; }
        const go = t.closest('[data-ask-go]');
        if (go) { App.navigate(go.dataset.askGo); return; }
        if (t.closest('[data-ask-demo]')) { pushDemo(); return; }
        const a = t.closest('[data-ask-act]'); if (!a) return;
        const act = a.dataset.askAct;
        const q = cur.startsWith('q_') ? S.getQuestion(cur.slice(2)) : null;
        if (act === 'skip' && q) {
          S.setQuestionStatus(q.id, 'skipped');
          App.ui.toast('‘답하지 못한 질문’에 넣어 뒀어요. 언제든 답할 수 있어요');
          const n = nextPendingOf(q.id);
          App.navigate(roomHref(n ? 'q_' + n.id : cur));
        } else if (act === 'reask' && q) reask(q.id);
        else if (act === 'continue') { const th = W.getThread(cur); if (th) continueThread(th); }
        else if (act === 'deep') enterDeep(deepCfgFor());
        else if (act === 'deep-exit') exitDeep();
      });

      renderList();
      renderRoom();
      // 목록에서 지금 방이 보이도록
      requestAnimationFrame(() => {
        const on = listEl.querySelector('.ask-item.is-on'); const sc = listEl.querySelector('[data-ask-scroll]');
        if (on && sc && (on.offsetTop < sc.scrollTop || on.offsetTop > sc.scrollTop + sc.clientHeight - 40)) sc.scrollTop = Math.max(0, on.offsetTop - sc.offsetTop - 60);
      });

      return () => { dropRoom(); };
    },
  };
})(window.App);
