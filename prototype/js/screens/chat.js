/* AI 채팅: 왼쪽은 프로젝트별 대화방, 가운데는 대화, 오른쪽은 그 프로젝트의 경험 카드 (고른 카드는 펼쳐지고, AI 가 바꾼 카드와 칸이 움직여 보인다).
   #/chat (최근 대화방, 모바일은 목록) · #/chat/<대화방id> · #/chat/new?project=&card=&kw=&text=&github=1 (card: 오른쪽에서 펼쳐 둘 카드) */
(function (App) {
  const S = App.store; const C = App.chat; const esc = App.ui.esc; const I = App.icon;
  const SHOW = 5; // 프로젝트마다 먼저 보여 줄 채팅 수

  /* ---------------- 화면 상태 (계정마다 따로) ---------------- */
  // typing: chatId → 답을 만드는 중 · fresh: chatId → 방금 담은 rev (바뀐 글자를 보여 준다) · played: chatId → 움직임을 이미 보여 준 rev · made: chatId → GitHub 에서 방금 만든 카드 id · panel: 좁은 화면에서 카드를 펼쳤는가 · runs: msgId → GitHub 분석 중 · drafts: 쓰던 글 · keep: 다시 그릴 때 지킬 스크롤
  let ui = null; let view = null; // view: 지금 열려 있는 화면 { chatId, draw, drawTree }
  const foldKey = (id) => `rewrite-chat-fold:${id}`;
  function U() {
    const id = (App.auth.current() || {}).id || '';
    if (ui && ui.id === id) return ui;
    let fold = {}; try { fold = JSON.parse(localStorage.getItem(foldKey(id)) || '{}'); } catch (e) { /* ignore */ }
    ui = { id, fold, more: {}, typing: {}, fresh: {}, played: {}, made: {}, panel: false, runs: {}, drafts: {}, treeTop: 0, keep: null };
    return ui;
  }
  // 목록과 경험 카드의 너비 (모든 계정 같은 화면 설정). dir: 오른쪽으로 끌 때 넓어지면 1, 좁아지면 -1
  const GRIP = {
    tree: { key: 'rewrite-chat-tree-w', min: 200, max: 480, prop: '--tree-w', el: '.chat-tree', dir: 1, label: '채팅 목록 너비' },
    card: { key: 'rewrite-chat-card-w', min: 300, max: 640, prop: '--card-w', el: '.chat-card', dir: -1, label: '경험 카드 너비' },
  };
  const savedW = (g) => { const n = Number(localStorage.getItem(g.key)); return n >= g.min && n <= g.max ? n : 0; };
  const gripHTML = (k) => `<div class="chat-resize is-${k}" data-grip="${k}" role="separator" aria-orientation="vertical" aria-label="${GRIP[k].label}" aria-valuemin="${GRIP[k].min}" aria-valuemax="${GRIP[k].max}" tabindex="0" title="끌어서 너비를 바꿔요. 두 번 누르면 처음 너비로 돌아가요"></div>`;
  const saveFold = () => { try { localStorage.setItem(foldKey(U().id), JSON.stringify(U().fold)); } catch (e) { /* ignore */ } };
  const refresh = (chatId, opts) => { if (!view) return; if (view.chatId === chatId) view.draw(opts); view.drawTree(); };

  const isMobile = () => window.matchMedia('(max-width: 900px)').matches;
  const isMobileCard = () => window.matchMedia('(max-width: 1240px)').matches; // 오른쪽 카드가 겹쳐 열리는 너비
  const motionOK = () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EASE = 'cubic-bezier(.2,.7,.2,1)';
  // FLIP: first 는 다시 그리기 전 자리. 같은 카드는 옛 자리에서 미끄러지고, 펼친 카드(opened)는 옛 타일 크기에서 넓어지며, 새로 생긴 카드는 살짝 커지며 나타난다
  function flip(el, first, opened) {
    el.querySelectorAll('[data-flip]').forEach((n) => {
      const a = first.get(n.dataset.flip); const b = n.getBoundingClientRect();
      if (!a) { if (first.size || n.classList.contains('is-new')) n.animate([{ opacity: 0, transform: 'scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 280, delay: 80, easing: EASE, fill: 'backwards' }); return; }
      const dx = a.left - b.left; const dy = a.top - b.top;
      if (n.dataset.flip === opened && n.classList.contains('cc-detail')) {
        n.animate([{ transform: `translate(${dx}px, ${dy}px)`, clipPath: `inset(0 0 ${Math.max(0, b.height - a.height)}px 0 round 8px)` }, { transform: 'none', clipPath: 'inset(0 0 0 0 round 8px)' }], { duration: 340, easing: EASE });
        n.querySelectorAll('.chat-f, .chat-card-foot').forEach((f, i) => f.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 240, delay: 140 + i * 45, easing: EASE, fill: 'backwards' }));
      } else if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) n.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 360, easing: EASE });
    });
  }
  const hasRepos = (p) => !!(p && (p.repos || []).length);
  const projectsForList = () => S.projects().sort((a, b) => (a.status === b.status ? 0 : a.status === 'ongoing' ? -1 : 1));
  function whenLabel(at) {
    const day = String(at || '').slice(0, 10); if (!day) return '';
    if (day === S.localDay()) return String(at).slice(11, 16);
    const d = S.parseDay(day); return `${d.getMonth() + 1}/${d.getDate()}`;
  }

  /* ---------------- 왼쪽: 프로젝트 › 채팅 ---------------- */
  const menu = (label, items, size = 18) => `<div class="menu"><button type="button" class="icon-btn" aria-haspopup="menu" aria-expanded="false" aria-label="${esc(label)}">${I('more', size)}</button><div class="menu-list">${items}</div></div>`;
  const act = (name, id, icon, text, danger) => `<button type="button" data-do="${name}" data-id="${id}" ${danger ? 'class="is-danger"' : ''}>${I(icon, 16)}${text}</button>`;
  const chatMenu = (c) => menu(`「${c.title}」 대화방 메뉴`, `${act('rename', c.id, 'edit', '이름 바꾸기')}<hr>${act('del-chat', c.id, 'trash', '휴지통으로 옮기기', true)}`);
  const projectMenu = (p) => menu(`「${p.title}」 프로젝트 메뉴`, `<a href="#/vault/p/${p.id}">${I('folder', 16)}프로젝트 열기</a>${hasRepos(p) ? act('find', p.id, 'github', 'GitHub에서 찾기') : act('connect', p.id, 'github', 'GitHub 연결')}<hr>${act('del-project', p.id, 'trash', '휴지통으로 옮기기', true)}`);

  function treeHTML(cur) {
    const u = U(); const list = projectsForList();
    return `<div class="chat-tree-head">${list.length ? `<button type="button" class="btn btn-primary" data-do="new-chat">${I('plus', 16)}새 채팅</button><button type="button" class="btn" data-do="new-project">새 프로젝트</button>` : `<button type="button" class="btn btn-primary" data-do="new-project">${I('plus', 16)}새 프로젝트</button>`}</div>
      <nav class="chat-tree-list" aria-label="프로젝트별 채팅" data-tree>${list.map((p) => {
        const chats = S.chatsOf(p.id); const closed = !!u.fold[p.id]; const isNew = cur.isNew && cur.projectId === p.id;
        const shown = u.more[p.id] || (cur.chatId && chats.findIndex((c) => c.id === cur.chatId) >= SHOW) ? chats : chats.slice(0, SHOW);
        return `<div class="chat-proj">
          <div class="chat-proj-row">
            <button type="button" class="chat-proj-btn" data-do="fold" data-id="${p.id}" aria-expanded="${!closed}">${I(closed ? 'chevron-right' : 'chevron-down', 16)}<span class="chat-proj-name">${esc(p.title)}</span>${hasRepos(p) ? `<span class="chat-proj-gh" title="GitHub 연결됨">${I('github', 14)}<span class="sr-only">GitHub 연결됨</span></span>` : ''}</button>
            <div class="chat-row-acts"><button type="button" class="icon-btn" data-do="new-chat" data-id="${p.id}" aria-label="「${esc(p.title)}」에서 새 채팅">${I('plus')}</button>${projectMenu(p)}</div>
          </div>
          ${closed ? '' : `<div class="chat-rows">${isNew ? `<div class="chat-row is-on"><span class="chat-row-link" aria-current="page"><span class="chat-row-title">새 채팅</span></span></div>` : ''}${shown.map((c) => `<div class="chat-row ${c.id === cur.chatId ? 'is-on' : ''}"><a class="chat-row-link" href="#/chat/${c.id}" ${c.id === cur.chatId ? 'aria-current="page"' : ''}><span class="chat-row-title" title="${esc(c.title)}">${esc(c.title)}</span><span class="chat-row-when">${whenLabel(c.updatedAt)}</span></a><div class="chat-row-acts">${chatMenu(c)}</div></div>`).join('')}
            ${!chats.length && !isNew ? '<p class="chat-none">아직 대화방이 없어요</p>' : ''}
            ${chats.length > shown.length ? `<button type="button" class="chat-more" data-do="more" data-id="${p.id}">${chats.length - shown.length}개 더 보기</button>` : ''}</div>`}
        </div>`;
      }).join('') || '<p class="chat-none is-top">프로젝트를 만들면 바로 이야기를 시작할 수 있어요.</p>'}</nav>`;
  }

  /* ---------------- 오른쪽: 이 프로젝트의 경험 카드 ---------------- */
  // 카드 목록은 늘 그 순서 그대로다. 고른 카드는 제자리에서 펼쳐지고, 머리를 다시 누르면 접힌다.
  // AI 가 카드를 바꾸면 그 카드가 펼쳐지고, 바뀐 칸에 형광펜이 지나간다. 움직임은 바뀐 직후 한 번만
  const BLANK = '아직 비어 있어요';
  const cardsIn = (pid) => S.state.experiences.filter((e) => e.projectId === pid).reverse(); // 새 카드가 위로. 고칠 때마다 순서가 바뀌지 않는다
  // 방금 바뀐 글자: 덧붙인 것은 형광펜, 바꾼 것은 취소선 → 형광펜, 지운 것은 취소선
  function diffHTML(old, now, show) {
    if (!show || old === now) return esc(now);
    if (!old) return `<mark class="mark is-in">${esc(now)}</mark>`;
    if (now && now.startsWith(old)) return `${esc(old)}<mark class="mark is-in">${esc(now.slice(old.length))}</mark>`;
    return `<del>${esc(old)}</del>${now ? ` <ins class="is-in">${esc(now)}</ins>` : ''}`;
  }
  // 이 방에서 방금 바뀐 카드 → { card, before, created } | null
  function freshOf(chat) {
    const l = chat && chat.last; const e = l && S.get(l.cardId);
    return e && l.rev === e.rev && U().fresh[chat.id] === e.rev ? { card: e, before: l.before, created: !l.before } : null;
  }
  const focusOf = (chat, cur) => { const id = chat ? chat.focus : cur && cur.focus; const e = id && S.get(id); return e && e.projectId === (chat ? chat.projectId : cur.projectId) ? e : null; };
  function tileHTML(e, isNew) {
    const kws = e.keywords.length ? `<span class="cc-tile-kws">${e.keywords.map((k) => App.ui.keywordChip(k)).join('')}</span>` : '';
    const line = e.resumeLine ? `<span class="cc-tile-line">${esc(e.resumeLine)}</span>` : '';
    return `<li><button type="button" class="cc-tile ${isNew ? 'is-new' : ''}" data-do="see" data-id="${e.id}" data-flip="${e.id}" aria-expanded="false"><span class="cc-tile-title">${esc(e.title)}</span>${line}${kws}</button></li>`;
  }
  function detailHTML(e, f, flash) {
    const show = !!(f && f.card === e); const b = (show && f.before) || { title: '', star: {}, keywords: [], resumeLine: '' };
    const row = (label, html, changed, cls = '') => `<div class="chat-f ${cls} ${changed ? 'is-changed' : ''}"><dt>${label}</dt><dd>${html}</dd></div>`;
    const blank = `<span class="chat-blank">${BLANK}</span>`;
    const text = (old, now) => (now || (show && old) ? `<p>${diffHTML(old, now, show)}</p>${now ? '' : blank}` : blank);
    const ch = (old, now) => show && (old || '') !== (now || '');
    const kwNew = (k) => show && !b.keywords.includes(k);
    // 고른 카드는 목록의 제자리에서 펼쳐진다. 머리를 다시 누르면 접힌다
    return `<li><section class="cc-detail ${flash ? 'is-flash' : ''}" data-flip="${e.id}" aria-labelledby="cc-title">
        <button type="button" class="cc-detail-head" data-do="see" data-id="" aria-expanded="true" aria-label="「${esc(e.title)}」 카드 접기"><span class="chat-card-title" id="cc-title">${diffHTML(b.title, e.title, show && !!f.before)}</span><span class="cc-fold">${I('chevron-up', 16)}</span></button>
        <dl class="chat-fs">${C.STAGES.map((k) => row(C.LABEL[k], text(b.star[k] || '', e.star[k] || ''), ch(b.star[k], e.star[k]), `is-${k}`)).join('')}
          ${row('역량', e.keywords.length ? `<span class="chat-kws">${e.keywords.map((k) => App.ui.keywordChip(k, kwNew(k))).join('')}</span>` : blank, show && e.keywords.some(kwNew))}
          ${row('이력서 한 줄', text(b.resumeLine || '', e.resumeLine || ''), ch(b.resumeLine, e.resumeLine))}</dl>
        <div class="chat-card-foot"><a class="btn btn-block" href="#/card/${e.id}">${I('card', 16)}경험 카드 열기</a></div>
      </section></li>`;
  }
  function panelHTML(chat, project, cur) {
    const u = U(); const typing = !!(chat && u.typing[chat.id]); const list = project ? cardsIn(project.id) : [];
    const focus = focusOf(chat, cur); const f = freshOf(chat); const made = new Set((chat && u.made[chat.id]) || []);
    const flash = !!(f && focus === f.card && u.played[chat.id] !== f.card.rev); if (flash) u.played[chat.id] = f.card.rev;
    const close = `<button type="button" class="icon-btn chat-card-x" data-do="panel" aria-label="경험 카드 닫기">${I('close')}</button>`;
    const asking = !!(chat && chat.msgs.some((m) => m.pending && m.pending.status === 'wait'));
    const st = typing ? '<span class="chat-card-st" role="status"><span class="spinner"></span>담는 중</span>' : asking ? `<span class="chat-card-st">${I('lock', 15)}허락을 기다려요</span>` : f && S.canRevert(chat.id) ? `<button type="button" class="btn btn-ghost btn-sm" data-do="revert">${I('restore', 15)}되돌리기</button>` : '';
    const top = `<div class="chat-card-top"><h2>경험 카드${list.length ? `<span class="cc-n">${list.length}장</span>` : ''}</h2>${st}${close}</div>`;
    if (!list.length) return `${top}<div class="chat-card-body" data-card-scroll><div class="cc-empty"><p>이야기를 들려주면 AI가 이 프로젝트의 경험 카드를 만들어요.</p><p class="subtle">어느 카드에 담을지는 AI가 골라요.</p></div></div>`;
    return `${top}<div class="chat-card-body" data-card-scroll>${focus ? '' : '<p class="cc-hint">카드를 누르면 자세히 볼 수 있어요.</p>'}<ul class="cc-list">${list.map((e) => (e === focus ? detailHTML(e, f, flash) : tileHTML(e, made.has(e.id)))).join('')}</ul></div>`;
  }

  /* ---------------- 채팅 안의 GitHub ---------------- */
  const leftDrafts = (g) => (g.drafts || []).filter((d) => !S.cardByKey(d.key));
  // 저장된 상태에 지금 상태를 더한다: 새로 고침으로 끊긴 분석은 error, 남은 초안이 없으면 done
  function ghState(m) {
    const g = m.gh || {};
    if (g.status === 'running' && !U().runs[m.id]) return 'stopped';
    if (g.status === 'ready' && !leftDrafts(g).length) return 'done';
    return g.status;
  }
  function ghText(m) {
    const st = ghState(m);
    if (st === 'stopped') return 'GitHub 레포를 읽다가 멈췄어요.';
    if (st === 'done' && m.gh.status === 'ready' && !(m.gh.madeIds || []).length) return '찾은 작업은 모두 경험 카드로 있어요.';
    return m.text;
  }
  function madeHTML(ids) {
    return `<div class="list chat-made">${ids.map((id) => {
      const e = S.get(id); const where = C.cardState(id);
      if (!e) return `<div class="list-row">${I(where === 'trash' ? 'trash' : 'card')}<span class="list-row-main subtle row">${App.ui.goneCard(id)}</span></div>`;
      const miss = C.missingOf(e).map((f) => C.LABEL[f]);
      return `<div class="list-row">${I('card')}<span class="list-row-main"><a class="list-row-title" href="#/card/${id}">${esc(e.title)}</a><span class="list-row-sub">${App.ui.projChip(e.projectId)}${miss.length ? `<span>비어 있는 칸: ${miss.join(', ')}</span>` : ''}</span></span><button type="button" class="btn btn-sm" data-do="see" data-id="${id}">카드 보기</button></div>`;
    }).join('')}</div>`;
  }
  function ghFootHTML(m) {
    const left = leftDrafts(m.gh); const n = left.filter((d) => m.gh.picked.includes(d.key)).length;
    return `${left.length > 1 ? `<button type="button" class="btn btn-ghost btn-sm" data-do="gh-all" data-id="${m.id}">${n === left.length ? '모두 해제' : '모두 고르기'}</button>` : ''}
      <span class="chat-gh-btns"><button type="button" class="btn btn-primary" data-do="gh-make" data-id="${m.id}" ${n ? '' : 'disabled'}>${n ? `경험 카드 ${n}장 만들기` : '경험 카드 만들기'}</button></span>`;
  }
  function ghHTML(chat, m) {
    const g = m.gh || {}; const st = ghState(m); const p = S.getProject(chat.projectId); const made = g.madeIds || [];
    const retry = `<button type="button" class="btn btn-sm" data-do="gh-run" data-id="${m.id}">다시 시도</button>`;
    if (st === 'running') { const x = U().runs[m.id].progress; return `<div class="chat-gh panel" role="status"><p class="chat-gh-repo" data-gh-repo="${m.id}">${ghRepoHTML(x, p)}</p><div data-gh-steps="${m.id}">${App.repoFlow.stepsHTML(x)}</div></div>`; }
    if (st === 'connect') return `<div><button type="button" class="btn" data-do="gh-connect" data-id="${m.id}">${I('github', 16)}${hasRepos(p) ? 'GitHub에서 찾기' : 'GitHub 연결'}</button></div>`;
    if (st === 'stopped') return `<div>${hasRepos(p) ? retry : `<button type="button" class="btn" data-do="gh-connect" data-id="${m.id}">${I('github', 16)}GitHub 연결</button>`}</div>`;
    if (st === 'error') return `<div class="banner banner-danger">${I('warning')}<span>${esc(g.error)}</span>${retry}</div>`;
    if (st === 'empty') return `${made.length ? madeHTML(made) : ''}<div>${retry.replace('다시 시도', '다시 찾기')}</div>`;
    const note = g.error ? `<p class="subtle">${esc(g.error)}</p>` : '';
    if (st === 'ready') return `${note}<div class="chat-gh">${App.repoFlow.draftsHTML(leftDrafts(g), new Set(g.picked))}</div><div class="chat-gh-foot" data-gh-foot="${m.id}">${ghFootHTML(m)}</div>`;
    const left = leftDrafts(g).length;
    return `${made.length ? madeHTML(made) : ''}${left ? `<div><button type="button" class="btn btn-ghost btn-sm" data-do="gh-more" data-id="${m.id}">남은 작업 ${left}개 보기</button></div>` : ''}`;
  }
  const ghRepoHTML = (x, p) => { const l = (p && p.repos) || []; const r = x.repo || l[0]; return `${I('github', 16)}<b>${esc(r ? r.name : '')}</b>${l.length > 1 ? `<span class="subtle">${(x.index || 0) + 1} / ${l.length}</span>` : ''}`; };

  // 연결한 레포를 분석해 msg.gh 에 담는다. 화면을 떠나도 이어지고, 로그아웃하거나 채팅·프로젝트가 휴지통으로 가면 그만둔다
  async function runGithub(chatId, msgId) {
    const u = U(); const c = S.getChat(chatId); const m = c && c.msgs.find((x) => x.id === msgId); if (!m) return;
    const p = S.getProject(c.projectId);
    if (!hasRepos(p)) { const x = C.githubMsg(c.projectId); S.updateMsg(chatId, msgId, { text: x.text, gh: x.gh }); refresh(chatId); return; }
    const run = (u.runs[msgId] = { progress: { step: 0, text: '', total: 1, index: 0 } });
    S.updateMsg(chatId, msgId, { text: C.githubMsg(c.projectId).text, gh: { status: 'running', step: 0, picked: [], drafts: [], madeIds: [], error: '' } });
    refresh(chatId, { jump: true });
    const alive = () => U() === u && u.runs[msgId] === run && !!S.getChat(chatId) && !!S.getProject(p.id);
    let out = null; let error = '';
    try {
      out = await App.repoFlow.analyze(p.id, { isAlive: alive, onProgress(x) {
        if (!alive()) return; run.progress = x;
        const el = document.querySelector(`[data-gh-steps="${msgId}"]`); if (!el) return;
        el.innerHTML = App.repoFlow.stepsHTML(x); document.querySelector(`[data-gh-repo="${msgId}"]`).innerHTML = ghRepoHTML(x, p);
      } });
    } catch (e) { error = e.message; }
    const ok = alive(); if (u.runs[msgId] === run) delete u.runs[msgId];
    if (!ok) return;
    if (!out && !error) { refresh(chatId); return; }
    if (!out) out = { drafts: [], made: [], errors: [error], notes: [], commits: 0, prs: 0 };
    const gh = { status: 'ready', step: 0, drafts: out.drafts, picked: out.drafts.filter((d) => !d.trashed).map((d) => d.key), madeIds: [], error: out.errors.concat(out.notes).join(' ') }; let text;
    if (out.drafts.length) text = `커밋 ${out.commits}개와 PR ${out.prs}개를 읽고 경험이 될 작업을 ${out.drafts.length}개 찾았어요. 카드로 만들 작업을 골라 주세요.`;
    else if (out.errors.length) { gh.status = 'error'; text = '레포를 다 읽지 못했어요.'; gh.error = out.errors.join(' '); }
    else { gh.status = 'empty'; gh.madeIds = out.made.map((x) => x.card.id); text = gh.madeIds.length ? '새로 카드로 만들 작업은 없어요. 이 레포에서 만든 경험 카드예요.' : '카드로 만들 만한 작업을 찾지 못했어요. 새 채팅에서 있었던 일을 직접 들려주셔도 좋아요.'; }
    S.updateMsg(chatId, msgId, { text, gh }); refresh(chatId);
  }
  function addGithub(chatId) {
    const c = S.getChat(chatId); if (!c) return;
    const m = S.addMsg(chatId, C.githubMsg(c.projectId)); if (m.gh.status === 'running') runGithub(chatId, m.id); else refresh(chatId, { jump: true });
  }
  // 새 채팅에서 바로 찾기. 같은 프로젝트에서 이미 찾는 중이면 그 채팅을 연다
  function startGithubChat(projectId, replace) {
    const p = S.getProject(projectId); if (!p) return;
    const busy = S.chatsOf(projectId).find((c) => c.msgs.some((m) => U().runs[m.id]));
    const c = busy || S.createChat({ projectId, title: C.GH_TITLE });
    if (!busy) addGithub(c.id);
    if (replace) location.replace('#/chat/' + c.id); else App.navigate('#/chat/' + c.id);
  }
  const connectThenFind = (projectId, then) => App.repoFlow.connect(projectId, () => { if (S.getProject(projectId)) then(); }, { keepAccount: true });

  /* ---------------- 사용자의 말 → AI 답 ---------------- */
  // 화면을 떠나도 답은 대화에 남는다. 그사이 로그아웃하거나 채팅·프로젝트가 휴지통으로 가면 쓰지 않는다
  async function answer(chatId) {
    const u = U(); const tok = (u.typing[chatId] = {}); refresh(chatId, { jump: true });
    await App.ai.think(650);
    if (U() !== u || u.typing[chatId] !== tok) return;
    delete u.typing[chatId];
    const c = S.getChat(chatId); const last = c && c.msgs[c.msgs.length - 1];
    if (!c || !S.getProject(c.projectId) || last.who !== 'me') { refresh(chatId); return; }
    const rev = c.last && c.last.rev; const msg = C.respond(c); // 카드에 담고, 할 말을 돌려준다
    if (c.last && c.last.rev !== rev) u.fresh[chatId] = c.last.rev; else delete u.fresh[chatId];
    if (c.last && c.last.rev !== rev) delete u.made[chatId];
    S.addMsg(chatId, msg);
    if (msg.kind === 'deleted' && view && view.chatId === chatId) { view.rerender(); return; } // 사이드바의 휴지통 수까지
    refresh(chatId);
  }

  /* ---------------- 가운데: 대화 ---------------- */
  const aiHTML = (inner, id) => `<div class="chat-m is-ai" ${id ? `data-m-id="${id}"` : ''}><span class="ai-dot" aria-hidden="true">R</span><div class="chat-ai"><span class="sr-only">AI</span>${inner}</div></div>`;
  function msgHTML(chat, m) {
    if (m.who === 'me') return `<div class="chat-m is-me" data-m-id="${m.id}"><div class="chat-b"><span class="sr-only">나</span>${esc(m.text)}</div></div>`;
    return aiHTML(`${m.touch ? touchHTML(m.touch) : ''}<p class="chat-t">${esc(m.kind === 'github' ? ghText(m) : m.text)}</p>${m.kind === 'link' ? linkHTML(chat, m) : m.kind === 'github' ? ghHTML(chat, m) : m.kind === 'confirm' ? confirmHTML(m) : m.kind === 'deleted' ? deletedHTML(m) : ''}`, m.id);
  }
  // 허락을 구하는 답: 바뀔 칸만 앞뒤로 보여 주고(지운 글자는 취소선, 더한 글자는 형광펜), 허용·항상 허용·거절
  function confirmHTML(m) {
    const p = m.pending; const st = p.status; const wait = st === 'wait';
    let rows = '';
    if (p.op === 'delete') rows = `<div class="cf-row"><dt>카드</dt><dd><del>${esc(p.before.title)}</del></dd></div>`;
    else {
      const b = p.before || { title: '', star: {}, keywords: [], resumeLine: '' }; const a = p.after; const show = wait;
      const row = (label, html) => `<div class="cf-row"><dt>${label}</dt><dd>${html}</dd></div>`;
      if (b.title !== a.title) rows += row('제목', diffHTML(b.title, a.title, show));
      C.STAGES.forEach((k) => { if ((b.star[k] || '') !== (a.star[k] || '')) rows += row(C.LABEL[k], diffHTML(b.star[k] || '', a.star[k] || '', show) || '<span class="subtle">비움</span>'); });
      if ((b.keywords || []).join() !== (a.keywords || []).join()) rows += row('역량', `<span class="chat-kws">${a.keywords.map((k) => App.ui.keywordChip(k, show && !(b.keywords || []).includes(k))).join('')}</span>`);
      if ((b.resumeLine || '') !== (a.resumeLine || '')) rows += row('이력서 한 줄', diffHTML(b.resumeLine || '', a.resumeLine || '', show));
    }
    const yes = { create: '만들기', update: '반영하기', delete: '휴지통으로 옮기기' }[p.op];
    const done = { ok: [p.op === 'delete' ? '휴지통으로 옮겼어요' : '허용했어요', 'check'], no: ['거절했어요', 'close'], fail: ['반영하지 못했어요', 'warning'] }[st];
    const foot = wait ? `<div class="cf-foot"><button type="button" class="btn ${p.op === 'delete' ? 'btn-danger' : 'btn-primary'} btn-sm" data-do="cf-ok" data-id="${m.id}">${I(p.op === 'delete' ? 'trash' : 'check', 15)}${yes}</button><button type="button" class="btn btn-sm" data-do="cf-all" data-id="${m.id}" title="앞으로는 묻지 않고 바로 카드에 반영해요. 입력창 위의 「카드 바꾸기 전에 묻기」로 다시 켤 수 있어요">항상 허용</button><button type="button" class="btn btn-ghost btn-sm" data-do="cf-no" data-id="${m.id}">거절</button></div>`
      : `<p class="cf-st">${I(done[1], 15)}${done[0]}</p>`;
    return `<div class="cf ${wait ? '' : 'is-closed'}" role="group" aria-label="바뀔 내용">${rows ? `<dl class="cf-rows">${rows}</dl>` : ''}${foot}</div>`;
  }
  const deletedHTML = (m) => (!m.restored && m.trash && S.getTrash(m.trash) ? `<div><button type="button" class="btn btn-sm" data-do="undel" data-id="${m.id}">${I('restore', 15)}되돌리기</button></div>` : '');
  // 경험 카드 권한 토글: 켜면 AI가 카드를 만들고 고치고 지우기 전에 묻는다, 끄면 바로 반영한다
  const permHTML = () => `<label class="chat-perm" title="끄면 묻지 않고 바로 카드에 반영해요. 「되돌리기」로 마지막 변경을 취소할 수 있어요"><span class="switch"><input type="checkbox" role="switch" data-perm ${S.cardPerm() === 'ask' ? 'checked' : ''} /><span></span></span>카드 바꾸기 전에 묻기</label>`;
  // 이 답에서 바꾼 카드: 누르면 오른쪽에서 그 카드를 펼친다
  function touchHTML(t) {
    const e = S.get(t.card); const names = (t.fields || []).map((f) => C.LABEL[f] || (f === 'keywords' ? '역량' : '')).filter(Boolean);
    if (!e) return `<p class="chat-touch is-gone">${I('card', 16)}<span>${App.ui.trashedCard(t.card) ? `${esc(App.ui.trashedCard(t.card).title)} (휴지통)` : '지워진 카드'}</span></p>`;
    return `<button type="button" class="chat-touch" data-do="see" data-id="${e.id}">${I('card', 16)}<span class="chat-touch-title">${esc(e.title)}</span>${names.length ? `<span class="chat-touch-f"><span class="sr-only">바뀐 칸: </span>${names.join(', ')}</span>` : ''}</button>`;
  }
  const linkHTML = (chat, m) => `<div>${m.link === 'new' ? `<button type="button" class="btn" data-do="new-chat" data-id="${chat.projectId}">${I('plus', 16)}새 채팅</button>` : hasRepos(S.getProject(chat.projectId)) ? `<button type="button" class="btn" data-do="find-here">${I('github', 16)}GitHub에서 찾기</button>` : `<button type="button" class="btn" data-do="connect-here">${I('github', 16)}GitHub 연결</button>`}</div>`;
  function bodyHTML(chat) {
    return chat.msgs.map((m) => msgHTML(chat, m)).join('') + (U().typing[chat.id] ? aiHTML('<div class="chat-typing" role="status"><span class="sr-only">답을 쓰는 중</span><i></i><i></i><i></i></div>') : '');
  }
  function composer(ph, quick) {
    return `<form class="chat-form" data-form>${quick ? `<div class="chat-quick">${quick}</div>` : ''}<div class="chat-input"><textarea class="textarea" rows="1" data-text placeholder="${ph}" aria-label="메시지"></textarea><button type="submit" class="icon-btn chat-send" aria-label="보내기">${I('send', 20)}</button></div></form>`;
  }
  const ghQuick = (p, off = '') => (hasRepos(p) ? `<button type="button" class="btn btn-ghost btn-sm" data-do="find-here" ${off}>${I('github', 16)}GitHub에서 찾기</button>` : `<button type="button" class="btn btn-ghost btn-sm" data-do="connect-here" ${off}>${I('github', 16)}GitHub 연결</button>`);
  const footHTML = (chat) => composer('이야기를 이어서 적어 주세요', ghQuick(S.getProject(chat.projectId)) + permHTML());
  function headHTML(o) {
    return `<header class="chat-head"><a class="icon-btn chat-back" href="#/chat" aria-label="채팅 목록">${I('chevron-left', 22)}</a>
      <div class="chat-head-main">${o.projectId ? App.ui.projChip(o.projectId, { link: true }) : ''}<h1>${esc(o.title)}</h1></div>${o.right || ''}</header>`;
  }
  const panelBtn = () => `<button type="button" class="btn btn-sm chat-head-card" data-do="panel" aria-label="경험 카드 보기">${I('card', 16)}<span>경험 카드</span></button>`;
  function roomHTML(chat) {
    return `${headHTML({ projectId: chat.projectId, title: chat.title, right: `${panelBtn()}${chatMenu(chat)}` })}
      <div class="chat-body" data-body tabindex="0" aria-label="대화"><div class="chat-col" data-col>${bodyHTML(chat)}</div></div>
      <button type="button" class="btn btn-sm chat-jump" data-do="jump" hidden>${I('chevron-down', 16)}새 답변</button>
      <p class="sr-only" role="status" data-live></p>
      <div class="chat-foot" data-foot>${footHTML(chat)}</div>`;
  }
  function newHTML(params, cur) {
    const p = S.getProject(cur.projectId);
    if (!p) {
      const list = projectsForList();
      return `${headHTML({ title: '새 채팅' })}<div class="chat-body"><div class="chat-pick"><h2>${list.length ? '어떤 프로젝트 이야기인가요?' : '먼저 프로젝트를 만들어 주세요'}</h2>
        ${list.length ? `<div class="list">${list.map((x) => `<button type="button" class="list-row" data-do="pick" data-id="${x.id}">${I('folder')}<span class="list-row-main"><span class="list-row-title">${esc(x.title)}</span></span>${hasRepos(x) ? `<span class="list-row-actions" title="GitHub 연결됨">${I('github', 16)}<span class="sr-only">GitHub 연결됨</span></span>` : ''}</button>`).join('')}</div>` : '<p class="muted">팀 과제, 동아리, 아르바이트도 프로젝트예요.</p>'}
        <button type="button" class="btn ${list.length ? '' : 'btn-primary'}" data-do="new-project">${I('plus', 16)}새 프로젝트</button></div></div>`;
    }
    const connect = params.github && !hasRepos(p);
    const first = connect ? aiHTML(`<p class="chat-t">${esc(C.githubMsg(p.id).text)}</p><div><button type="button" class="btn" data-do="connect-here">${I('github', 16)}GitHub 연결</button></div>`)
      : guideHTML(p, App.keywords.has(params.kw) ? params.kw : '', focusOf(null, cur));
    return `${headHTML({ projectId: p.id, title: '새 채팅', right: connect ? '' : panelBtn() })}<div class="chat-body" data-body><div class="chat-col" data-col>${first}</div></div>
      <div class="chat-foot" data-foot>${composer(connect ? '한 줄이어도 괜찮아요' : '예: 검색 API가 느려서 고쳤어요', connect ? '' : ghQuick(p) + permHTML())}</div>`;
  }
  // 새 채팅 안내. AI 의 말이 아니라서 대화에 남기지 않는다
  function guideHTML(p, kw, card) {
    if (card) return `<section class="chat-guide"><h2>「${esc(card.title)}」 카드에 담을 이야기를 적어 주세요</h2><p>${esc(C.opening(card).text)}</p><p>다른 카드 이야기를 해도 괜찮아요. AI가 알맞은 카드에 담아요.</p></section>`;
    return `<section class="chat-guide"><h2>${kw ? `「${esc(kw)}」 역량이 드러난 일을 적어 주세요` : '있었던 일을 적어 주세요'}</h2>
      <p>${kw ? `${esc(App.keywords.get(kw).desc)}이면 돼요. ` : ''}한 줄이어도 괜찮아요. AI가 이 프로젝트의 알맞은 경험 카드를 골라 채우고, 빠진 내용은 물어봐요.</p>
      <p>${hasRepos(p) ? '아래 「GitHub에서 찾기」를 누르면 커밋과 PR에서도 경험을 찾을 수 있어요.' : 'GitHub를 연결하면 커밋과 PR에서도 경험을 찾을 수 있어요.'}</p></section>`;
  }
  function emptyHTML(cur) {
    if (cur.missing) return `${isMobile() ? headHTML({ title: 'AI 채팅' }) : ''}<div class="empty chat-empty"><div class="empty-title">휴지통에 있거나 지워진 대화방이에요</div><a class="btn" href="#/trash">휴지통 보기</a></div>`;
    return S.projects().length ? '<div class="empty chat-empty"><div class="empty-title">아직 채팅이 없어요</div><p>있었던 일을 한 줄만 적어도 이야기가 시작돼요.</p></div>'
      : '<div class="empty chat-empty"><div class="empty-title">첫 프로젝트를 만들어 주세요</div><p>GitHub 레포에서 가져오거나 직접 만들 수 있어요.</p></div>';
  }

  function current(params) {
    const room = params.room || '';
    if (room === 'new') { const card = S.get(params.card); return { isNew: true, focus: card ? card.id : null, projectId: (card && card.projectId) || params.project || '', chatId: '' }; }
    const chat = room ? S.getChat(room) : (isMobile() ? null : S.chats()[0] || null);
    return { chat, chatId: chat ? chat.id : '', projectId: chat ? chat.projectId : '', missing: !!room && !chat };
  }

  App.screens.chat = {
    title: 'AI 채팅',
    render(params) {
      const cur = current(params);
      if (cur.projectId && U().fold[cur.projectId]) { delete U().fold[cur.projectId]; saveFold(); } // 연 채팅의 프로젝트는 펼쳐 둔다
      const p = S.getProject(cur.projectId); const has = cur.chat ? !!p : cur.isNew && p && !(params.github && !hasRepos(p)); // 오른쪽 카드가 있는 화면인가
      const ws = Object.values(GRIP).map((g) => (savedW(g) ? `${g.prop}:${savedW(g)}px` : '')).filter(Boolean).join(';');
      return `<div class="chat-app ${params.room ? 'is-room' : ''} ${has ? 'has-card' : ''} ${has && U().panel && !isMobile() ? 'is-card-open' : ''}" ${ws ? `style="${ws}"` : ''}>${gripHTML('tree')}${has ? gripHTML('card') : ''}<aside class="chat-tree">${!cur.isNew && !cur.chat && !cur.missing ? '<h1 class="sr-only">AI 채팅</h1>' : ''}${treeHTML(cur)}</aside><section class="chat-room">${cur.isNew ? newHTML(params, cur) : cur.chat ? roomHTML(cur.chat) : emptyHTML(cur)}</section>${has ? `<aside class="chat-card" data-panel aria-label="이 프로젝트의 경험 카드">${panelHTML(cur.chat, p, cur)}</aside>` : ''}</div>`;
    },
    mount(root, params) {
      const u = U(); const cur = current(params); const draftKey = cur.chatId || (cur.isNew ? 'new:' + cur.projectId : '');
      const $ = (s) => root.querySelector(s);
      const chatNow = () => cur.chatId && S.getChat(cur.chatId);
      const msgOf = (id) => { const c = chatNow(); return c && c.msgs.find((x) => x.id === id); };
      const atEnd = (b) => b.scrollHeight - b.scrollTop - b.clientHeight < 64;
      // 가장 새 말이 보이게. 새 말이 화면보다 길면 그 말의 머리부터
      function toNewest() {
        const b = $('[data-body]'); const last = b && $('[data-col]').lastElementChild; if (!last) return;
        b.scrollTop = last.offsetHeight > b.clientHeight - 48 ? last.offsetTop - 24 : b.scrollHeight;
        const j = $('[data-do=jump]'); if (j) j.hidden = true;
      }
      function drawTree() { const t = $('.chat-tree'); if (!t) return; const y = $('[data-tree]').scrollTop; t.innerHTML = treeHTML(cur); $('[data-tree]').scrollTop = y; }
      // 카드 목록을 다시 그린다. 같은 카드는 있던 자리에서 새 자리로 미끄러지고(FLIP), 고른 카드는 그 자리에서 펼쳐진다
      function drawPanel() {
        const el = $('[data-panel]'); if (!el) return; const sc = $('[data-card-scroll]'); const y = sc ? sc.scrollTop : 0;
        const was = (el.querySelector('.cc-detail') || {}).dataset; const wasId = was ? was.flip : '';
        const first = new Map(); const move = motionOK() && el.offsetParent !== null;
        if (move) el.querySelectorAll('[data-flip]').forEach((n) => first.set(n.dataset.flip, n.getBoundingClientRect()));
        el.innerHTML = panelHTML(chatNow(), S.getProject(cur.projectId), cur);
        const n = $('[data-card-scroll]'); if (!n) return; const d = n.querySelector('.cc-detail');
        n.scrollTop = y; const opened = d && d.dataset.flip !== wasId ? d : null; // 목록은 제자리. 새로 펼친 카드만 보이게 끌어온다
        if (move) flip(el, first, opened ? opened.dataset.flip : '');
        const fl = n.querySelector('.cc-detail.is-flash .is-changed'); const target = fl || (opened && opened.querySelector('.cc-detail-head'));
        const show = (x) => { if (!x.isConnected) return; const r = x.getBoundingClientRect(); const v = n.getBoundingClientRect(); if (r.top < v.top || r.bottom > v.bottom) x.scrollIntoView({ block: x === fl ? 'nearest' : 'start', behavior: move ? 'smooth' : 'auto' }); };
        if (target) { if (move) setTimeout(() => show(target), 380); else show(target); }
        if (n.querySelector('.cc-detail.is-flash')) ping();
      }
      // 좁은 화면에서 카드가 닫혀 있으면 「경험 카드」 버튼이 한 번 울린다
      function ping() { const b = $('.chat-head-card'); if (!b || !b.offsetParent || root.querySelector('.is-card-open') || !motionOK()) return; b.animate([{ boxShadow: '0 0 0 0 var(--primary)' }, { boxShadow: '0 0 0 6px transparent' }], { duration: 700, iterations: 2, easing: 'ease-out' }); }
      // stay: 제자리 고치기(스크롤 그대로) · jump: 새 말로 이동 · 둘 다 없으면 끝을 보고 있을 때만 따라간다
      function draw({ stay, jump } = {}) {
        const c = chatNow(); if (!c) return; drawPanel(); const h1 = $('.chat-head h1'); if (h1) h1.textContent = c.title;
        const b = $('[data-body]'); const y = b.scrollTop; const follow = jump || (!stay && atEnd(b));
        const open = [...b.querySelectorAll('details[open]')].map((d) => { const k = d.closest('.rf-draft'); const i = k && k.querySelector('[data-draft]'); return i ? i.dataset.draft : ''; }).filter(Boolean);
        const a = document.activeElement; const key = a && b.contains(a) ? ['data-do', 'data-id', 'data-kw'].map((k) => (a.hasAttribute(k) ? `[${k}="${CSS.escape(a.getAttribute(k))}"]` : '')).join('') : '';
        const before = $('[data-col]').lastElementChild; const lastId = before && before.dataset.mId;
        $('[data-col]').innerHTML = bodyHTML(c);
        b.querySelectorAll('.rf-draft').forEach((d) => { if (open.includes(d.querySelector('[data-draft]').dataset.draft)) d.querySelector('details').open = true; });
        const f = $('[data-foot]'); const had = f.contains(a); f.innerHTML = footHTML(c); fillDraft(had && a.matches('[data-text]'));
        if (key) { const el = b.querySelector(key); if (el) el.focus({ preventScroll: true }); }
        if (follow) toNewest(); else { b.scrollTop = y; if (!stay && !atEnd(b) && $('[data-col]').lastElementChild.dataset.mId !== lastId) $('[data-do=jump]').hidden = false; }
        const m = c.msgs[c.msgs.length - 1]; if (m && m.who === 'ai' && m.id !== lastId && !stay) $('[data-live]').textContent = m.kind === 'github' ? ghText(m) : m.text;
      }
      function grow(t) { t.style.height = 'auto'; t.style.height = Math.min(140, t.scrollHeight + 2) + 'px'; t.style.overflowY = t.scrollHeight > 140 ? 'auto' : 'hidden'; const s = $('.chat-send'); if (s) s.disabled = !t.value.trim(); }
      function fillDraft(focus) { const t = $('[data-text]'); if (!t) return; t.value = u.drafts[draftKey] || ''; grow(t); if (focus) t.focus({ preventScroll: true }); }
      function submit(text) {
        text = String(text || '').trim(); if (!text || (cur.chatId && u.typing[cur.chatId])) return;
        u.drafts[draftKey] = ''; const t = $('[data-text]'); if (t) { t.value = ''; grow(t); }
        if (!cur.isNew) { if (!chatNow()) return; S.addMsg(cur.chatId, { who: 'me', text }); answer(cur.chatId); return; }
        if (!S.getProject(cur.projectId)) return;
        if (C.wantsGithub(text) && hasRepos(S.getProject(cur.projectId))) { startGithubChat(cur.projectId, true); return; }
        const fc = focusOf(null, cur); const c = S.createChat({ projectId: cur.projectId, title: App.ai.brief(text, 18), focus: fc ? fc.id : null });
        if (fc) { const o = C.opening(fc); S.addMsg(c.id, { who: 'ai', card: fc.id, stage: o.stage, text: o.stage ? `「${fc.title}」 카드의 ${o.text}` : `「${fc.title}」 카드에 더 담고 싶은 일을 적어 주세요.` }); }
        S.addMsg(c.id, { who: 'me', text }); answer(c.id);
        location.replace('#/chat/' + c.id);
      }
      // 지금 보던 자리를 지키며 화면 전체를 다시 그린다 (사이드바의 휴지통 수까지 바뀔 때)
      function rerender() { const b = $('[data-body]'); u.keep = { chatId: cur.chatId, top: b ? b.scrollTop : 0 }; App.rerender(); }
      function setPicked(m, keys) { S.updateMsg(cur.chatId, m.id, { gh: Object.assign({}, m.gh, { picked: keys }) }); }
      function afterMade(m, ids) {
        const g = m.gh; const all = [...new Set((g.madeIds || []).concat(ids))];
        S.updateMsg(cur.chatId, m.id, { text: `경험 카드 ${all.length}장을 만들었어요.${all.some((id) => S.get(id) && C.missingOf(S.get(id)).length) ? ' 비어 있는 칸은 이 대화방에서 이어서 채울 수 있어요.' : ''}`, gh: Object.assign({}, g, { status: 'done', madeIds: all, picked: [] }) });
      }
      // 제안을 허용하거나 거절한다. 허용하면 바뀐 칸을 오른쪽 카드에서 보여 준다
      function decideNow(id, yes) {
        const r = C.decide(cur.chatId, id, yes); if (!r) { draw({ stay: true }); return; }
        const c = chatNow(); if (r.changed && c.last) { u.fresh[cur.chatId] = c.last.rev; delete u.made[cur.chatId]; }
        S.addMsg(cur.chatId, r.msg); if (r.removed) { rerender(); return; }
        draw({ jump: true }); drawTree();
      }
      const startNew = (pid) => App.startChat({ projectId: pid || '', keyword: cur.isNew ? params.kw || '' : '', text: cur.isNew ? params.text || '' : '', github: cur.isNew && !!params.github });

      const DO = {
        'new-chat': (id) => { const l = S.projects(); App.startChat({ projectId: id || (l.length === 1 ? l[0].id : '') }); },
        'new-project': () => App.repoFlow.openNewProject((p) => { if (hasRepos(p) && !(cur.isNew && params.text)) App.startChat({ projectId: p.id, github: true }); else startNew(p.id); }, { keepAccount: true }),
        pick: (id) => startNew(id),
        fold: (id) => { if (u.fold[id]) delete u.fold[id]; else u.fold[id] = true; saveFold(); drawTree(); const b = $(`[data-do=fold][data-id="${id}"]`); if (b) b.focus(); },
        more: (id) => { u.more[id] = true; drawTree(); },
        rename: (id) => {
          const c = S.getChat(id); if (!c) return;
          App.ui.modal({
            title: '이름 바꾸기', confirmText: '저장', body: `<div class="field"><label class="label" for="chat-name">대화방 이름</label><input class="input" id="chat-name" maxlength="60" value="${esc(c.title)}" /></div>`,
            onOpen(r) { r.querySelector('#chat-name').select(); },
            onConfirm(r) { const v = r.querySelector('#chat-name').value.trim(); if (!v) return false; S.rename(id, v); rerender(); setTimeout(() => { const l = document.querySelector(`.chat-row-link[href="#/chat/${id}"]`); if (l) l.focus({ preventScroll: true }); }, 0); return true; },
          });
        },
        'del-chat': (id) => { const t = S.removeChat(id); if (!t) return; if (id === cur.chatId) App.navigate('#/chat'); else rerender(); App.ui.trashed(t); },
        'del-project': (id) => {
          const p = S.getProject(id); if (!p) return; const n = [[S.chatsOf(id).length, '대화방', '개'], [S.cardsOf(id).length, '경험 카드', '장']].filter((x) => x[0]).map(([k, w, s]) => `${w} ${k}${s}`);
          App.ui.modal({
            title: `「${p.title}」 프로젝트를 휴지통으로 옮길까요?`, danger: true, confirmText: '휴지통으로 옮기기', body: `<p>${n.length ? `${n.join('와 ')}도 함께 옮겨져요. ` : ''}${S.TRASH_DAYS}일 안에는 되돌릴 수 있어요.</p>`,
            onConfirm() { const t = S.removeProject(id); if (id === cur.projectId) setTimeout(() => App.navigate('#/chat'), 0); else rerender(); App.ui.trashed(t); return true; },
          });
        },
        connect: (id) => connectThenFind(id, () => startGithubChat(id)),
        find: (id) => startGithubChat(id),
        'find-here': () => { if (cur.chatId) addGithub(cur.chatId); else startGithubChat(cur.projectId, true); },
        'connect-here': () => connectThenFind(cur.projectId, () => { if (cur.chatId && S.getChat(cur.chatId)) addGithub(cur.chatId); else startGithubChat(cur.projectId, true); }),
        jump: () => toNewest(),
        // 카드
        panel: () => { const on = root.querySelector('.chat-app').classList.toggle('is-card-open'); u.panel = on; const b = $(on ? '.chat-card-x' : '.chat-head-card'); if (b) b.focus(); },
        revert: () => {
          const r = S.revert(cur.chatId); if (!r) return; delete u.fresh[cur.chatId];
          if (r.removed) { S.setFocus(cur.chatId, null); S.addMsg(cur.chatId, { who: 'ai', text: `방금 만든 「${r.removed.title}」 카드를 휴지통으로 옮겼어요.` }); rerender(); return; }
          S.addMsg(cur.chatId, { who: 'ai', text: `「${r.card.title}」 카드에 방금 담은 내용을 되돌렸어요.` }); draw({ jump: true }); drawTree();
        },
        // 허락 받기
        'cf-ok': (id) => decideNow(id, true),
        'cf-all': (id) => { S.setCardPerm('auto'); decideNow(id, true); App.ui.toast('이제 묻지 않고 바로 카드에 반영할게요'); },
        'cf-no': (id) => decideNow(id, false),
        undel: (id) => {
          const m = msgOf(id); const r = m && S.restore(m.trash); if (!r) { App.ui.toast('휴지통에 없는 카드예요'); draw({ stay: true }); return; }
          S.updateMsg(cur.chatId, id, { restored: true }); S.addMsg(cur.chatId, { who: 'ai', text: `카드를 되살렸어요.${r.withProject ? ` 「${r.withProject}」 프로젝트도 함께 되살렸어요.` : ''}` }); rerender();
        },
        // 오른쪽에서 카드 펼치기 (id 가 비면 모든 카드)
        see: (id, b) => {
          if (cur.chatId) S.setFocus(cur.chatId, id || null); else cur.focus = id && S.get(id) ? id : null;
          if (!root.querySelector('.is-card-open') && isMobileCard()) { root.querySelector('.chat-app').classList.add('is-card-open'); u.panel = true; }
          const was = (root.querySelector('.cc-detail') || {}).dataset; const wasId = was ? was.flip : ''; const inPanel = !!(b && b.closest('[data-panel]'));
          drawPanel();
          if (!inPanel) return; // 대화 속 칩에서 열면 포커스는 그대로
          const t = id ? $('.cc-detail-head') : wasId && $(`.cc-tile[data-id="${wasId}"]`); if (t) t.focus({ preventScroll: true });
        },
        // GitHub
        'gh-run': (id) => runGithub(cur.chatId, id),
        'gh-connect': (id) => { if (hasRepos(S.getProject(cur.projectId))) runGithub(cur.chatId, id); else connectThenFind(cur.projectId, () => runGithub(cur.chatId, id)); },
        'gh-all': (id) => { const m = msgOf(id); const left = leftDrafts(m.gh); setPicked(m, left.every((d) => m.gh.picked.includes(d.key)) ? [] : left.map((d) => d.key)); draw({ stay: true }); },
        'gh-more': (id) => { const m = msgOf(id); S.updateMsg(cur.chatId, id, { text: '남은 작업이에요. 카드로 만들 작업을 골라 주세요.', gh: Object.assign({}, m.gh, { status: 'ready', picked: [] }) }); draw({ stay: true }); },
        'gh-make': (id) => {
          const m = msgOf(id); const made = App.repoFlow.saveDrafts(cur.projectId, leftDrafts(m.gh).filter((d) => m.gh.picked.includes(d.key)));
          if (!made.length) { App.ui.toast('만들 카드가 없어요'); draw({ stay: true }); return; }
          afterMade(m, made.map((e) => e.id)); u.made[cur.chatId] = made.map((e) => e.id); S.setFocus(cur.chatId, null); drawPanel(); App.ui.toast(`경험 카드 ${made.length}장을 만들었어요`); draw({ jump: true }); drawTree();
        },
      };
      const onClick = (ev) => {
        const h = ev.target.closest('.menu > [aria-haspopup]'); // 목록 아래쪽에서는 위로 연다
        if (h) { const list = h.closest('[data-tree]'); if (list) h.parentElement.classList.toggle('menu-up', h.getBoundingClientRect().bottom + h.nextElementSibling.childElementCount * 44 > list.getBoundingClientRect().bottom && h.getBoundingClientRect().top - list.getBoundingClientRect().top > 180); return; }
        const b = ev.target.closest('[data-do]'); if (b && DO[b.dataset.do]) DO[b.dataset.do](b.dataset.id || '', b);
      };
      const onChange = (ev) => {
        const t = ev.target;
        if (t.matches('[data-perm]')) { S.setCardPerm(t.checked ? 'ask' : 'auto'); App.ui.toast(t.checked ? '이제 카드를 바꾸기 전에 물어볼게요' : '이제 묻지 않고 바로 카드에 반영할게요'); return; }
        if (t.matches('[data-draft]')) {
          const id = t.closest('[data-m-id]').dataset.mId; const m = msgOf(id); const k = t.dataset.draft;
          setPicked(m, t.checked ? m.gh.picked.concat(k) : m.gh.picked.filter((x) => x !== k));
          t.closest('.rf-draft').classList.toggle('is-on', t.checked); $(`[data-gh-foot="${id}"]`).innerHTML = ghFootHTML(msgOf(id));
        }
      };
      const onSubmit = (ev) => { if (!ev.target.matches('[data-form]')) return; ev.preventDefault(); submit($('[data-text]').value); };
      const onKey = (ev) => {
        if (ev.key === 'Escape' && root.querySelector('.is-card-open') && ev.target.closest('[data-panel]')) { DO.panel(); return; } if (ev.target.matches('[data-text]') && ev.key === 'Enter' && !ev.shiftKey && !ev.isComposing && ev.keyCode !== 229) { ev.preventDefault(); submit(ev.target.value); } };
      const onInput = (ev) => { if (ev.target.matches('[data-text]')) { u.drafts[draftKey] = ev.target.value; grow(ev.target); } };
      const onScroll = (ev) => { if (ev.target.matches && ev.target.matches('[data-body]') && atEnd(ev.target)) { const j = $('[data-do=jump]'); if (j) j.hidden = true; } };
      // 목록 너비 조절
      // 너비 조절: 목록 오른쪽 테두리, 경험 카드 왼쪽 테두리를 끌거나 포커스한 뒤 ←→ (두 번 누르면 처음 너비)
      const app = $('.chat-app');
      const widthOf = (k) => { const el = $(GRIP[k].el); return el ? el.getBoundingClientRect().width : 0; };
      const cardCol = () => app.classList.contains('has-card') && window.innerWidth > 1240; // 경험 카드가 한 단을 차지하는가
      const maxW = (k) => { const g = GRIP[k]; const other = k === 'tree' ? (cardCol() ? widthOf('card') : 0) : widthOf('tree'); return Math.max(g.min, Math.min(g.max, app.clientWidth - other - 360)); }; // 대화는 360px 이상 남긴다
      app.querySelectorAll('[data-grip]').forEach((grip) => {
        const k = grip.dataset.grip; const g = GRIP[k];
        const setW = (w, save) => { w = Math.round(Math.max(g.min, Math.min(maxW(k), w))); app.style.setProperty(g.prop, w + 'px'); grip.setAttribute('aria-valuenow', w); if (save) try { localStorage.setItem(g.key, String(w)); } catch (e) { /* ignore */ } };
        grip.setAttribute('aria-valuenow', Math.round(widthOf(k)));
        grip.onpointerdown = (ev) => {
          if (ev.button !== 0) return; ev.preventDefault(); grip.setPointerCapture(ev.pointerId);
          const x0 = ev.clientX; const w0 = widthOf(k); app.classList.add('is-resizing'); grip.classList.add('is-drag');
          grip.onpointermove = (e) => setW(w0 + (e.clientX - x0) * g.dir, false);
          grip.onpointerup = grip.onpointercancel = () => { grip.onpointermove = grip.onpointerup = grip.onpointercancel = null; app.classList.remove('is-resizing'); grip.classList.remove('is-drag'); setW(widthOf(k), true); };
        };
        grip.ondblclick = () => { app.style.removeProperty(g.prop); try { localStorage.removeItem(g.key); } catch (e) { /* ignore */ } grip.setAttribute('aria-valuenow', Math.round(widthOf(k))); };
        // 화살표는 테두리가 움직이는 쪽으로
        grip.onkeydown = (ev) => { const d = { ArrowLeft: -16, ArrowRight: 16 }[ev.key]; if (d) { ev.preventDefault(); setW(widthOf(k) + d * g.dir, true); } else if (ev.key === 'Home' || ev.key === 'End') { ev.preventDefault(); setW(ev.key === 'Home' ? g.min : g.max, true); } };
      });
      const EV = [['click', onClick], ['change', onChange], ['submit', onSubmit], ['keydown', onKey], ['input', onInput]];
      EV.forEach(([n, f]) => root.addEventListener(n, f)); root.addEventListener('scroll', onScroll, true);

      view = { chatId: cur.chatId, draw, drawTree, rerender: () => rerender() }; const me = view;
      $('[data-tree]').scrollTop = u.treeTop;
      if (u.keep && u.keep.chatId === cur.chatId && cur.chatId) { $('[data-body]').scrollTop = u.keep.top; } else toNewest();
      u.keep = null;
      const on = $('.chat-row.is-on'); if (on) on.scrollIntoView({ block: 'nearest' });
      fillDraft(!isMobile() && !document.querySelector('#modal-root > *'));
      if (cur.isNew && S.getProject(cur.projectId)) {
        if (params.text) submit(params.text);
        else if (params.github && hasRepos(S.getProject(cur.projectId))) startGithubChat(cur.projectId, true);
      } else if (cur.chat) { // 답을 쓰다 새로 고침했거나 로그아웃했던 대화는 이어서 답한다
        const last = cur.chat.msgs[cur.chat.msgs.length - 1]; if (last && last.who === 'me' && !u.typing[cur.chatId]) answer(cur.chatId);
      }
      return () => {
        const tr = $('[data-tree]'); if (tr) u.treeTop = tr.scrollTop;
        if (view === me) view = null;
        EV.forEach(([n, f]) => root.removeEventListener(n, f)); root.removeEventListener('scroll', onScroll, true);
      };
    },
  };
})(window.App);
