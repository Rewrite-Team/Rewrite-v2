/* AI 채팅: 왼쪽은 프로젝트별 채팅 목록, 오른쪽은 채팅방.
   #/chat (최근 채팅, 모바일은 목록) · #/chat/<채팅id> · #/chat/new?project=&card=&kw=&text=&github=1 */
(function (App) {
  const S = App.store; const C = App.chat; const esc = App.ui.esc; const I = App.icon;
  const SHOW = 5; // 프로젝트마다 먼저 보여 줄 채팅 수

  /* ---------------- 화면 상태 (계정마다 따로) ---------------- */
  // typing: chatId → 답을 만드는 중 · editing: msgId → 제안을 고치는 중 · runs: msgId → GitHub 분석 중 · drafts: 쓰던 글 · keep: 다시 그릴 때 지킬 스크롤
  let ui = null; let view = null; // view: 지금 열려 있는 화면 { chatId, draw, drawTree }
  const foldKey = (id) => `rewrite-chat-fold:${id}`;
  function U() {
    const id = (App.auth.current() || {}).id || '';
    if (ui && ui.id === id) return ui;
    let fold = {}; try { fold = JSON.parse(localStorage.getItem(foldKey(id)) || '{}'); } catch (e) { /* ignore */ }
    ui = { id, fold, more: {}, typing: {}, editing: {}, runs: {}, drafts: {}, treeTop: 0, keep: null };
    return ui;
  }
  const saveFold = () => { try { localStorage.setItem(foldKey(U().id), JSON.stringify(U().fold)); } catch (e) { /* ignore */ } };
  const refresh = (chatId, opts) => { if (!view) return; if (view.chatId === chatId) view.draw(opts); view.drawTree(); };

  const isMobile = () => window.matchMedia('(max-width: 900px)').matches;
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
  const chatMenu = (c) => menu(`「${c.title}」 채팅 메뉴`, `${act('rename', c.id, 'edit', '이름 바꾸기')}<hr>${act('del-chat', c.id, 'trash', '휴지통으로 옮기기', true)}`);
  const projectMenu = (p) => menu(`「${p.title}」 프로젝트 메뉴`, `<a href="#/vault/p/${p.id}">${I('folder', 16)}프로젝트 열기</a>${hasRepos(p) ? act('find', p.id, 'github', 'GitHub에서 찾기') : act('connect', p.id, 'github', 'GitHub 연결')}<hr>${act('del-project', p.id, 'trash', '휴지통으로 옮기기', true)}`);

  function treeHTML(cur) {
    const u = U(); const list = projectsForList();
    return `<div class="chat-tree-head">${list.length ? `<button type="button" class="btn btn-primary" data-do="new-chat">${I('plus', 16)}새 채팅</button><button type="button" class="btn" data-do="new-project">새 프로젝트</button>` : `<button type="button" class="btn btn-primary" data-do="new-project">${I('plus', 16)}새 프로젝트</button>`}</div>
      <nav class="chat-tree-list" aria-label="프로젝트별 채팅" data-tree>${list.map((p) => {
        const chats = S.chatsOf(p.id); const closed = !!u.fold[p.id]; const isNew = cur.isNew && cur.projectId === p.id;
        const shown = u.more[p.id] || chats.findIndex((c) => c.id === cur.chatId) >= SHOW ? chats : chats.slice(0, SHOW);
        return `<div class="chat-proj">
          <div class="chat-proj-row">
            <button type="button" class="chat-proj-btn" data-do="fold" data-id="${p.id}" aria-expanded="${!closed}">${I(closed ? 'chevron-right' : 'chevron-down', 16)}<span class="chat-proj-name">${esc(p.title)}</span>${hasRepos(p) ? `<span class="chat-proj-gh" title="GitHub 연결됨">${I('github', 14)}<span class="sr-only">GitHub 연결됨</span></span>` : ''}</button>
            <div class="chat-row-acts"><button type="button" class="icon-btn" data-do="new-chat" data-id="${p.id}" aria-label="「${esc(p.title)}」에서 새 채팅">${I('plus')}</button>${projectMenu(p)}</div>
          </div>
          ${closed ? '' : `<div class="chat-rows">${isNew ? '<div class="chat-row is-on"><span class="chat-row-link" aria-current="page"><span class="chat-row-title">새 채팅</span></span></div>' : ''}${shown.map((c) => `<div class="chat-row ${c.id === cur.chatId ? 'is-on' : ''}"><a class="chat-row-link" href="#/chat/${c.id}" ${c.id === cur.chatId ? 'aria-current="page"' : ''}><span class="chat-row-title">${esc(c.title)}</span><span class="chat-row-when">${whenLabel(c.updatedAt)}</span></a><div class="chat-row-acts">${chatMenu(c)}</div></div>`).join('')}
            ${!chats.length && !isNew ? '<p class="chat-none">아직 채팅이 없어요</p>' : ''}
            ${chats.length > shown.length ? `<button type="button" class="chat-more" data-do="more" data-id="${p.id}">${chats.length - shown.length}개 더 보기</button>` : ''}</div>`}
        </div>`;
      }).join('') || '<p class="chat-none is-top">프로젝트를 만들면 바로 이야기를 시작할 수 있어요.</p>'}</nav>`;
  }

  /* ---------------- 제안 → 경험 카드 ---------------- */
  const doneRow = (main, btn = '') => `<div class="chat-done">${main}${btn}</div>`;
  function proposalHTML(chat, m) {
    const pr = m.proposal; const where = C.cardState(pr.cardId); const card = S.get(pr.cardId);
    const gone = where === 'trash' ? `「${esc(pr.title)}」 카드는 휴지통에 있어요` : `「${esc(pr.title)}」 카드는 지워졌어요`;
    if (pr.status === 'applied') {
      if (!card) return doneRow(`${I(where === 'trash' ? 'trash' : 'card')}<span class="chat-done-main"><span class="subtle">${gone}</span></span>${where === 'trash' ? '<a class="btn btn-sm btn-ghost" href="#/trash">휴지통 보기</a>' : ''}`);
      return doneRow(`${I('check')}<span class="chat-done-main"><a href="#/card/${card.id}">${esc(card.title)}</a>${App.ui.projChip(card.projectId)}<span class="subtle">${pr.mode === 'update' ? '경험 카드에 반영했어요' : '경험 카드를 만들었어요'}</span></span>`,
        S.canUndo(pr) ? `<button type="button" class="btn btn-ghost btn-sm" data-do="undo" data-id="${m.id}">되돌리기</button>` : '');
    }
    // 되돌린 제안은 그 뒤로 이야기가 이어지지 않았을 때만 다시 반영할 수 있다 (이어졌으면 새 제안이 그 내용까지 담는다)
    if (pr.status === 'undone') {
      const again = chat.msgs[chat.msgs.length - 1] === m && (pr.mode === 'new' || card);
      return doneRow(`${I('restore')}<span class="chat-done-main"><span class="subtle">반영을 되돌렸어요</span></span>`, again ? `<button type="button" class="btn btn-sm" data-do="apply" data-id="${m.id}">다시 반영</button>` : '');
    }
    const lost = pr.mode === 'update' && !card; const ed = !!U().editing[m.id] && !lost; const isNew = pr.mode === 'new'; const L = C.LABEL;
    const curOf = (f) => (card ? (card.star[f] != null ? card.star[f] : card[f]) || '' : '');
    const row = (label, html, id) => `<div class="chat-prop-row">${id ? `<label for="${id}">${label}</label>` : `<span>${label}</span>`}<div>${html}</div></div>`;
    const rows = pr.changes.map((ch) => {
      const old = curOf(ch.field); const id = `pr-${m.id}-${ch.field}`;
      if (ch.add == null) return row(L[ch.field], `<p>${old ? `<del>${esc(old)}</del> ` : ''}<ins>${esc(ch.after)}</ins></p>`);
      if (ed) return row(L[ch.field], `<textarea class="textarea" id="${id}" data-ch="${m.id}" data-field="${ch.field}">${esc(ch.add)}</textarea>`, id);
      // 새 카드의 STAR 는 내가 한 말을 다듬은 것. 이미 있는 카드에는 더하는 부분만 긋는다
      return row(L[ch.field], `<p>${isNew ? esc(ch.add) : `${old ? `<span class="muted">${esc(old)}</span> ` : ''}<mark class="mark">${esc(ch.add)}</mark>`}</p>`);
    }).join('');
    const line = C.lineOf(pr); const oldLine = card ? card.resumeLine : '';
    const lineRow = !line ? '' : ed ? row('이력서 한 줄', `<textarea class="textarea" id="pr-${m.id}-line" data-line="${m.id}">${esc(line)}</textarea>`, `pr-${m.id}-line`)
      : row('이력서 한 줄', `<p>${oldLine === line ? esc(line) : oldLine && line.startsWith(oldLine + ',') ? `<span class="muted">${esc(oldLine)},</span> <mark class="mark">${esc(line.slice(oldLine.length).replace(/^,\s*/, ''))}</mark>` : oldLine ? `<del>${esc(oldLine)}</del> <ins>${esc(line)}</ins>` : `<mark class="mark">${esc(line)}</mark>`}</p>`);
    const kws = ed ? `<div class="chat-kws">${App.keywords.names().map((k) => `<button type="button" class="kw" aria-pressed="${pr.keywords.includes(k)}" data-do="kw" data-id="${m.id}" data-kw="${esc(k)}">${esc(k)}</button>`).join('')}</div>`
      : `<div class="chat-kws">${pr.keywords.map((k) => App.ui.keywordChip(k, !!card && !card.keywords.includes(k))).join('')}</div>`;
    const target = !pr.fixed ? row('담을 곳', `<select class="select" id="pr-${m.id}-to" data-target="${m.id}"><option value="new" ${isNew ? 'selected' : ''}>새 경험 카드</option>${lost ? `<option value="" selected>${esc(pr.title)} (${where === 'trash' ? '휴지통' : '지워짐'})</option>` : ''}${S.cardsOf(chat.projectId).map((e) => `<option value="${e.id}" ${pr.cardId === e.id ? 'selected' : ''}>${esc(e.title)}</option>`).join('')}</select>`, `pr-${m.id}-to`) : '';
    return `<section class="chat-prop" aria-label="경험 카드 제안">
      <div class="chat-prop-head">${App.ui.projChip(chat.projectId)}${ed && isNew ? '' : `<h2>${esc(isNew ? pr.title : card ? card.title : pr.title)}</h2>`}</div>
      ${lost ? `<p class="banner banner-warn">${I('warning')}<span>${gone}</span>${where === 'trash' ? '<a class="btn btn-sm" href="#/trash">휴지통 보기</a>' : ''}</p>` : ''}
      <div class="chat-prop-rows">${target}${ed && isNew ? row('카드 제목', `<input class="input" id="pr-${m.id}-title" data-title="${m.id}" maxlength="60" value="${esc(pr.title)}" />`, `pr-${m.id}-title`) : ''}${rows}${row('역량', kws)}${lineRow}</div>
      <div class="chat-prop-foot">${pr.fixed || lost ? '' : `<button type="button" class="btn btn-ghost" data-do="edit" data-id="${m.id}">${ed ? '다 고쳤어요' : '고치기'}</button>`}<button type="button" class="btn btn-primary" data-do="apply" data-id="${m.id}" ${lost ? 'disabled' : ''}>${isNew ? '카드 만들기' : '카드에 반영'}</button></div>
    </section>`;
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
      return `<div class="list-row">${I('card')}<span class="list-row-main"><a class="list-row-title" href="#/card/${id}">${esc(e.title)}</a><span class="list-row-sub">${App.ui.projChip(e.projectId)}${miss.length ? `<span>비어 있는 칸: ${miss.join(', ')}</span>` : ''}</span></span>${miss.length ? `<button type="button" class="btn btn-sm" data-do="talk" data-id="${id}">이야기하기</button>` : ''}</div>`;
    }).join('')}</div>`;
  }
  function ghFootHTML(m) {
    const left = leftDrafts(m.gh); const n = left.filter((d) => m.gh.picked.includes(d.key)).length;
    return `${left.length > 1 ? `<button type="button" class="btn btn-ghost btn-sm" data-do="gh-all" data-id="${m.id}">${n === left.length ? '모두 해제' : '모두 고르기'}</button>` : ''}
      <span class="chat-gh-btns">${n === 1 ? `<button type="button" class="btn" data-do="gh-talk" data-id="${m.id}">이 작업 이야기하기</button>` : ''}<button type="button" class="btn btn-primary" data-do="gh-make" data-id="${m.id}" ${n ? '' : 'disabled'}>${n ? `경험 카드 ${n}장 만들기` : '경험 카드 만들기'}</button></span>`;
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
    else { gh.status = 'empty'; gh.madeIds = out.made.map((x) => x.card.id); text = gh.madeIds.length ? '새로 카드로 만들 작업은 없어요. 이 레포에서 만든 경험 카드예요.' : '카드로 만들 만한 작업을 찾지 못했어요. 있었던 일을 직접 들려주셔도 좋아요.'; }
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
  const connectThenFind = (projectId, then) => App.repoFlow.connect(projectId, () => { if (S.getProject(projectId)) then(); });

  // 경험 카드 하나를 두고 이야기 시작. 이 채팅에 다른 이야기가 있으면 새 채팅에서
  function talk(chat, cardId) {
    const card = S.get(cardId); if (!card) return;
    const other = (chat.cardId && chat.cardId !== cardId && S.get(chat.cardId)) || C.collect(chat).answers > 0 || U().typing[chat.id];
    const c = other ? S.createChat({ projectId: card.projectId, title: App.ai.brief(card.title, 28), cardId }) : S.updateChat(chat.id, { cardId });
    if (!card.chatIds.includes(c.id)) card.chatIds.push(c.id);
    S.addMsg(c.id, C.opening({ projectId: card.projectId, cardId }));
    if (other) App.navigate('#/chat/' + c.id); else App.rerender();
  }

  /* ---------------- 사용자의 말 → AI 답 ---------------- */
  // 화면을 떠나도 답은 대화에 남는다. 그사이 로그아웃하거나 채팅·프로젝트가 휴지통으로 가면 쓰지 않는다
  async function answer(chatId) {
    const u = U(); const tok = (u.typing[chatId] = {}); refresh(chatId, { jump: true });
    await App.ai.think(650);
    if (U() !== u || u.typing[chatId] !== tok) return;
    delete u.typing[chatId];
    const c = S.getChat(chatId); const last = c && c.msgs[c.msgs.length - 1];
    if (!c || !S.getProject(c.projectId) || last.who !== 'me') { refresh(chatId); return; }
    const msg = C.reply(c);
    // 새 이야기를 더하면 아직 반영하지 않은 앞 제안은 새 제안이 대신한다 (말로 고친 제안과 이야기 제안은 따로)
    if (msg.kind === 'proposal') {
      if (view && view.chatId === chatId) view.save();
      const is = (m) => m.kind === 'proposal' && m.proposal.status === 'pending' && !!m.proposal.fixed === !!msg.proposal.fixed;
      const old = c.msgs.filter(is).pop(); c.msgs = c.msgs.filter((m) => !is(m));
      if (old && old.proposal.target && !msg.proposal.fixed) Object.assign(msg, C.proposalMsg(c, old.proposal.target)); // 고른 담을 곳을 이어받는다
      if (!msg.proposal.fixed) C.carry(old && old.proposal, msg.proposal);
    }
    const m = S.addMsg(chatId, msg);
    if (m.kind === 'github' && m.gh.status === 'running') runGithub(chatId, m.id); else refresh(chatId);
  }

  /* ---------------- 오른쪽: 채팅방 ---------------- */
  const aiHTML = (inner, id) => `<div class="chat-m is-ai" ${id ? `data-m-id="${id}"` : ''}><span class="ai-dot" aria-hidden="true">R</span><div class="chat-ai"><span class="sr-only">AI</span>${inner}</div></div>`;
  function msgHTML(chat, m) {
    if (m.who === 'me') return `<div class="chat-m is-me" data-m-id="${m.id}"><div class="chat-b"><span class="sr-only">나</span>${esc(m.text)}</div></div>`;
    return aiHTML(`<p class="chat-t">${esc(m.kind === 'github' ? ghText(m) : m.text)}</p>${m.kind === 'proposal' ? proposalHTML(chat, m) : m.kind === 'github' ? ghHTML(chat, m) : ''}`, m.id);
  }
  function bodyHTML(chat) {
    return chat.msgs.map((m) => msgHTML(chat, m)).join('') + (U().typing[chat.id] ? aiHTML('<div class="chat-typing" role="status"><span class="sr-only">답을 쓰는 중</span><i></i><i></i><i></i></div>') : '');
  }
  function composer(ph, quick) {
    return `<form class="chat-form" data-form>${quick ? `<div class="chat-quick">${quick}</div>` : ''}<div class="chat-input"><textarea class="textarea" rows="1" data-text placeholder="${ph}" aria-label="메시지"></textarea><button type="submit" class="icon-btn chat-send" aria-label="보내기">${I('send', 20)}</button></div></form>`;
  }
  const ghQuick = (p, off = '') => (hasRepos(p) ? `<button type="button" class="btn btn-ghost btn-sm" data-do="find-here" ${off}>${I('github', 16)}GitHub에서 찾기</button>` : `<button type="button" class="btn btn-ghost btn-sm" data-do="connect-here" ${off}>${I('github', 16)}GitHub 연결</button>`);
  function footHTML(chat) {
    const off = U().typing[chat.id] ? 'disabled' : '';
    const last = chat.msgs[chat.msgs.length - 1]; // 이미 찾고 있거나 고르는 중이면 또 권하지 않는다
    const ghOpen = chat.msgs.some((m) => m.kind === 'github' && (['running', 'ready', 'connect'].includes(ghState(m)) || (m === last && ghState(m) !== 'done')));
    return composer('이야기를 이어서 적어 주세요', (C.canSummarize(chat) ? `<button type="button" class="btn btn-ghost btn-sm" data-do="sum" ${off}>${I('card', 16)}지금까지 이야기를 경험 카드로 정리</button>` : '') + (ghOpen ? '' : ghQuick(S.getProject(chat.projectId), off)));
  }
  function headHTML(o) {
    return `<header class="chat-head"><a class="icon-btn chat-back" href="#/chat" aria-label="채팅 목록">${I('chevron-left', 22)}</a>
      <div class="chat-head-main">${o.projectId ? App.ui.projChip(o.projectId, { link: true }) : ''}<h1>${esc(o.title)}</h1></div>${o.right || ''}</header>`;
  }
  function roomHTML(chat) {
    const card = chat.cardId && S.get(chat.cardId);
    return `${headHTML({ projectId: chat.projectId, title: chat.title, right: `${card ? `<a class="btn btn-sm chat-head-card" href="#/card/${card.id}" aria-label="경험 카드 「${esc(card.title)}」" title="${esc(card.title)}">${I('card', 16)}<span>경험 카드</span></a>` : ''}${chatMenu(chat)}` })}
      <div class="chat-body" data-body tabindex="0" aria-label="대화"><div class="chat-col" data-col>${bodyHTML(chat)}</div></div>
      <button type="button" class="btn btn-sm chat-jump" data-do="jump" hidden>${I('chevron-down', 16)}새 답변</button>
      <p class="sr-only" role="status" data-live></p>
      <div class="chat-foot" data-foot>${footHTML(chat)}</div>`;
  }
  function newHTML(params, cur) {
    const p = S.getProject(cur.projectId); const card = params.card && S.get(params.card);
    if (!p) {
      const list = projectsForList();
      return `${headHTML({ title: '새 채팅' })}<div class="chat-body"><div class="chat-pick"><h2>${list.length ? '어떤 프로젝트 이야기인가요?' : '먼저 프로젝트를 만들어 주세요'}</h2>
        ${list.length ? `<div class="list">${list.map((x) => `<button type="button" class="list-row" data-do="pick" data-id="${x.id}">${I('folder')}<span class="list-row-main"><span class="list-row-title">${esc(x.title)}</span></span>${hasRepos(x) ? `<span class="list-row-actions" title="GitHub 연결됨">${I('github', 16)}<span class="sr-only">GitHub 연결됨</span></span>` : ''}</button>`).join('')}</div>` : '<p class="muted">팀 과제, 동아리, 아르바이트도 프로젝트예요.</p>'}
        <button type="button" class="btn ${list.length ? '' : 'btn-primary'}" data-do="new-project">${I('plus', 16)}새 프로젝트</button></div></div>`;
    }
    const connect = params.github && !hasRepos(p);
    const first = connect ? aiHTML(`<p class="chat-t">${esc(C.githubMsg(p.id).text)}</p><div><button type="button" class="btn" data-do="connect-here">${I('github', 16)}GitHub 연결</button></div>`)
      : aiHTML(`<p class="chat-t">${esc(openingOf(params, cur).text)}</p>`);
    return `${headHTML({ projectId: p.id, title: '새 채팅' })}<div class="chat-body" data-body><div class="chat-col" data-col>${first}</div></div>
      <div class="chat-foot" data-foot>${composer('한 줄이어도 괜찮아요', connect || card ? '' : ghQuick(p))}</div>`;
  }
  const openingOf = (params, cur) => C.opening({ projectId: cur.projectId, cardId: params.card && S.get(params.card) ? params.card : '', keyword: App.keywords.has(params.kw) ? params.kw : '' });
  function emptyHTML(cur) {
    if (cur.missing) return `${isMobile() ? headHTML({ title: 'AI 채팅' }) : ''}<div class="empty chat-empty"><div class="empty-title">휴지통에 있거나 지워진 채팅이에요</div><a class="btn" href="#/trash">휴지통 보기</a></div>`;
    return S.projects().length ? '<div class="empty chat-empty"><div class="empty-title">아직 채팅이 없어요</div><p>있었던 일을 한 줄만 적어도 이야기가 시작돼요.</p></div>'
      : '<div class="empty chat-empty"><div class="empty-title">첫 프로젝트를 만들어 주세요</div><p>GitHub 레포에서 가져오거나 직접 만들 수 있어요.</p></div>';
  }

  function current(params) {
    const room = params.room || '';
    if (room === 'new') { const card = params.card && S.get(params.card); return { isNew: true, projectId: (card && card.projectId) || params.project || '', chatId: '' }; }
    const chat = room ? S.getChat(room) : (isMobile() ? null : S.chats()[0] || null);
    return { chat, chatId: chat ? chat.id : '', projectId: chat ? chat.projectId : '', missing: !!room && !chat };
  }

  App.screens.chat = {
    title: 'AI 채팅',
    render(params) {
      const cur = current(params);
      if (cur.projectId && U().fold[cur.projectId]) { delete U().fold[cur.projectId]; saveFold(); } // 연 채팅의 프로젝트는 펼쳐 둔다
      return `<div class="chat-app ${params.room ? 'is-room' : ''}"><aside class="chat-tree">${treeHTML(cur)}</aside><section class="chat-room">${cur.isNew ? newHTML(params, cur) : cur.chat ? roomHTML(cur.chat) : emptyHTML(cur)}</section></div>`;
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
      // stay: 제자리 고치기(스크롤 그대로) · jump: 새 말로 이동 · 둘 다 없으면 끝을 보고 있을 때만 따라간다
      function draw({ stay, jump } = {}) {
        const c = chatNow(); if (!c) return; save();
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
      // 고치는 중인 제안의 입력값을 대화에 담아 둔다
      function save() {
        const c = chatNow(); if (!c) return; let hit = false;
        c.msgs.forEach((m) => {
          const pr = m.proposal; if (!pr || pr.status !== 'pending' || !u.editing[m.id]) return;
          const ti = $(`[data-title="${m.id}"]`); const ln = $(`[data-line="${m.id}"]`); let body = false;
          if (ti && ti.value.trim() && ti.value.trim() !== pr.title) { pr.title = pr.titleEdited = ti.value.trim(); hit = true; }
          const typed = ln && ln.value.trim().replace(/\s+/g, ' ');
          if (typed && typed !== ln.defaultValue) { pr.resumeLine = typed; pr.lineEdited = true; hit = true; }
          root.querySelectorAll(`[data-ch="${m.id}"]`).forEach((ta) => { const ch = pr.changes.find((x) => x.field === ta.dataset.field); if (ch && ch.add !== ta.value.trim()) { ch.add = ta.value.trim(); body = hit = true; } });
          if (body && !pr.lineEdited) pr.resumeLine = C.lineOf(pr);
        });
        if (hit) S.touch();
      }
      function submit(text) {
        text = String(text || '').trim(); if (!text || (cur.chatId && u.typing[cur.chatId])) return;
        u.drafts[draftKey] = ''; const t = $('[data-text]'); if (t) { t.value = ''; grow(t); }
        if (!cur.isNew) { if (!chatNow()) return; S.addMsg(cur.chatId, { who: 'me', text }); answer(cur.chatId); return; }
        if (!S.getProject(cur.projectId)) return;
        const card = params.card && S.get(params.card); const open = openingOf(params, cur);
        const c = S.createChat({ projectId: cur.projectId, title: C.wantsGithub(text) ? C.GH_TITLE : App.ai.brief(text, 18), cardId: card ? card.id : null });
        S.addMsg(c.id, open); S.addMsg(c.id, { who: 'me', text }); answer(c.id);
        location.replace('#/chat/' + c.id);
      }
      // 지금 보던 자리를 지키며 화면 전체를 다시 그린다 (사이드바의 휴지통 수까지 바뀔 때)
      function rerender() { const b = $('[data-body]'); u.keep = { chatId: cur.chatId, top: b ? b.scrollTop : 0 }; App.rerender(); }
      function setPicked(m, keys) { S.updateMsg(cur.chatId, m.id, { gh: Object.assign({}, m.gh, { picked: keys }) }); }
      function afterMade(m, ids) {
        const g = m.gh; const all = [...new Set((g.madeIds || []).concat(ids))];
        S.updateMsg(cur.chatId, m.id, { text: `경험 카드 ${all.length}장을 만들었어요.${all.some((id) => S.get(id) && C.missingOf(S.get(id)).length) ? ' 비어 있는 칸은 이야기하면서 채울 수 있어요.' : ''}`, gh: Object.assign({}, g, { status: 'done', madeIds: all, picked: [] }) });
      }
      const startNew = (pid) => App.startChat({ projectId: pid || '', keyword: cur.isNew ? params.kw || '' : '', text: cur.isNew ? params.text || '' : '', github: cur.isNew && !!params.github });

      const DO = {
        'new-chat': (id) => { const l = S.projects(); App.startChat({ projectId: id || (l.length === 1 ? l[0].id : '') }); },
        'new-project': () => App.repoFlow.openNewProject((p) => { if (hasRepos(p) && !(cur.isNew && params.text)) App.startChat({ projectId: p.id, github: true }); else startNew(p.id); }),
        pick: (id) => startNew(id),
        fold: (id) => { if (u.fold[id]) delete u.fold[id]; else u.fold[id] = true; saveFold(); drawTree(); const b = $(`[data-do=fold][data-id="${id}"]`); if (b) b.focus(); },
        more: (id) => { u.more[id] = true; drawTree(); },
        rename: (id) => {
          const c = S.getChat(id); if (!c) return;
          App.ui.modal({
            title: '채팅 이름 바꾸기', confirmText: '저장', body: `<div class="field"><label class="label" for="chat-name">채팅 이름</label><input class="input" id="chat-name" maxlength="40" value="${esc(c.title)}" /></div>`,
            onOpen(r) { r.querySelector('#chat-name').select(); },
            onConfirm(r) { const v = r.querySelector('#chat-name').value.trim(); if (!v) return false; S.updateChat(id, { title: v }); rerender(); setTimeout(() => { const l = document.querySelector(`.chat-row-link[href="#/chat/${id}"]`); if (l) l.focus({ preventScroll: true }); }, 0); return true; },
          });
        },
        'del-chat': (id) => { const t = S.removeChat(id); if (!t) return; if (id === cur.chatId) App.navigate('#/chat'); else rerender(); App.ui.trashed(t); },
        'del-project': (id) => {
          const p = S.getProject(id); if (!p) return; const n = [[S.chatsOf(id).length, '채팅', '개'], [S.cardsOf(id).length, '경험 카드', '장']].filter((x) => x[0]).map(([k, w, s]) => `${w} ${k}${s}`);
          App.ui.modal({
            title: `「${p.title}」 프로젝트를 휴지통으로 옮길까요?`, danger: true, confirmText: '휴지통으로 옮기기', body: `<p>${n.length ? `${n.join('와 ')}도 함께 옮겨져요. ` : ''}${S.TRASH_DAYS}일 안에는 되돌릴 수 있어요.</p>`,
            onConfirm() { const t = S.removeProject(id); if (id === cur.projectId) setTimeout(() => App.navigate('#/chat'), 0); else rerender(); App.ui.trashed(t); return true; },
          });
        },
        connect: (id) => connectThenFind(id, () => startGithubChat(id)),
        find: (id) => startGithubChat(id),
        'find-here': () => { if (cur.isNew) startGithubChat(cur.projectId, true); else addGithub(cur.chatId); },
        'connect-here': () => connectThenFind(cur.projectId, () => { if (cur.isNew) startGithubChat(cur.projectId, true); else addGithub(cur.chatId); }),
        sum: () => { const c = chatNow(); if (c && !u.typing[c.id] && C.canSummarize(c)) { S.addMsg(c.id, C.proposalMsg(c)); draw({ jump: true }); drawTree(); } },
        jump: () => toNewest(),
        // 제안
        edit: (id) => { const m = msgOf(id); if (!m) return; save(); if (u.editing[id]) delete u.editing[id]; else u.editing[id] = true; draw({ stay: true }); },
        kw: (id, b) => {
          save(); const m = msgOf(id); if (!m) return; const pr = m.proposal; const k = b.dataset.kw;
          if (pr.keywords.includes(k)) { if (pr.keywords.length > 1) pr.keywords = pr.keywords.filter((x) => x !== k); }
          else if (pr.keywords.length >= C.MAX_KW) App.ui.toast(`역량은 ${C.MAX_KW}개까지 고를 수 있어요`);
          else pr.keywords = pr.keywords.concat(k);
          S.touch(); draw({ stay: true });
        },
        apply: (id) => { save(); const m = msgOf(id); if (!m) return; const isNew = m.proposal.mode === 'new'; const e = C.apply(cur.chatId, id); if (e) { delete u.editing[id]; App.ui.toast(isNew ? '경험 카드를 만들었어요' : '경험 카드에 반영했어요'); rerender(); } else App.ui.toast('반영할 내용이 없어요'); },
        undo: (id) => {
          const m = msgOf(id); const e = m && S.get(m.proposal.cardId); const go = () => { C.undo(cur.chatId, id); rerender(); };
          if (e && !m.proposal.snap && e.retrospect) App.ui.modal({ title: '카드를 되돌릴까요?', body: '이 카드에 쓴 회고는 보관해 두었다가, 다시 반영하면 되살아나요.', confirmText: '되돌리기', onConfirm() { setTimeout(go, 0); return true; } }); else go();
        },
        // GitHub
        'gh-run': (id) => runGithub(cur.chatId, id),
        'gh-connect': (id) => { if (hasRepos(S.getProject(cur.projectId))) runGithub(cur.chatId, id); else connectThenFind(cur.projectId, () => runGithub(cur.chatId, id)); },
        'gh-all': (id) => { const m = msgOf(id); const left = leftDrafts(m.gh); setPicked(m, left.every((d) => m.gh.picked.includes(d.key)) ? [] : left.map((d) => d.key)); draw({ stay: true }); },
        'gh-more': (id) => { const m = msgOf(id); S.updateMsg(cur.chatId, id, { text: '남은 작업이에요. 카드로 만들 작업을 골라 주세요.', gh: Object.assign({}, m.gh, { status: 'ready', picked: [] }) }); draw({ stay: true }); },
        'gh-make': (id) => {
          const m = msgOf(id); const made = App.repoFlow.saveDrafts(cur.projectId, leftDrafts(m.gh).filter((d) => m.gh.picked.includes(d.key)));
          if (!made.length) { App.ui.toast('만들 카드가 없어요'); draw({ stay: true }); return; }
          afterMade(m, made.map((e) => e.id)); App.ui.toast(`경험 카드 ${made.length}장을 만들었어요`); draw({ jump: true }); drawTree();
        },
        'gh-talk': (id) => {
          const m = msgOf(id); const d = leftDrafts(m.gh).find((x) => m.gh.picked.includes(x.key)); if (!d) return;
          const [e] = App.repoFlow.saveDrafts(cur.projectId, [d]); if (!e) return;
          afterMade(m, [e.id]); App.ui.toast('경험 카드를 만들었어요'); talk(chatNow(), e.id);
        },
        talk: (id) => talk(chatNow(), id),
      };
      const onClick = (ev) => {
        const h = ev.target.closest('.menu > [aria-haspopup]'); // 목록 아래쪽에서는 위로 연다
        if (h) { const list = h.closest('[data-tree]'); if (list) h.parentElement.classList.toggle('menu-up', h.getBoundingClientRect().bottom + h.nextElementSibling.childElementCount * 44 > list.getBoundingClientRect().bottom && h.getBoundingClientRect().top - list.getBoundingClientRect().top > 180); return; }
        const b = ev.target.closest('[data-do]'); if (b && DO[b.dataset.do]) DO[b.dataset.do](b.dataset.id || '', b);
      };
      const onChange = (ev) => {
        const t = ev.target;
        if (t.matches('[data-target]')) { const id = t.dataset.target; save(); if (t.value) C.retarget(chatNow(), id, t.value); draw({ stay: true }); }
        else if (t.matches('[data-draft]')) {
          const id = t.closest('[data-m-id]').dataset.mId; const m = msgOf(id); const k = t.dataset.draft;
          setPicked(m, t.checked ? m.gh.picked.concat(k) : m.gh.picked.filter((x) => x !== k));
          t.closest('.rf-draft').classList.toggle('is-on', t.checked); $(`[data-gh-foot="${id}"]`).innerHTML = ghFootHTML(msgOf(id));
        }
      };
      const onSubmit = (ev) => { if (!ev.target.matches('[data-form]')) return; ev.preventDefault(); submit($('[data-text]').value); };
      const onKey = (ev) => { if (ev.target.matches('[data-text]') && ev.key === 'Enter' && !ev.shiftKey && !ev.isComposing && ev.keyCode !== 229) { ev.preventDefault(); submit(ev.target.value); } };
      const onInput = (ev) => { if (ev.target.matches('[data-text]')) { u.drafts[draftKey] = ev.target.value; grow(ev.target); } };
      const onScroll = (ev) => { if (ev.target.matches && ev.target.matches('[data-body]') && atEnd(ev.target)) { const j = $('[data-do=jump]'); if (j) j.hidden = true; } };
      const EV = [['click', onClick], ['change', onChange], ['submit', onSubmit], ['keydown', onKey], ['input', onInput]];
      EV.forEach(([n, f]) => root.addEventListener(n, f)); root.addEventListener('scroll', onScroll, true);

      view = { chatId: cur.chatId, draw, drawTree, save }; const me = view;
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
        const tr = $('[data-tree]'); if (tr) u.treeTop = tr.scrollTop; if (App.auth.current() && U() === u) save();
        if (view === me) view = null;
        EV.forEach(([n, f]) => root.removeEventListener(n, f)); root.removeEventListener('scroll', onScroll, true);
      };
    },
  };
})(window.App);
