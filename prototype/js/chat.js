/* AI 채팅의 AI (목업): App.chat — 대화를 듣고 꼬리질문을 하거나, 경험 카드로 정리한 제안을 만들거나, GitHub 에서 이야깃거리를 찾는다.
   결과는 항상 경험 카드다: 같은 프로젝트에 같은 이야기를 하는 카드가 있으면 그 카드를 고치고, 없으면 새 카드를 만든다.
   회고(retrospect)는 사용자가 카드에서 직접 쓰는 칸이라 여기서 다루지 않는다. */
(function (App) {
  const S = App.store;
  const STAGES = ['situation', 'task', 'action', 'result'];
  const LABEL = { situation: '상황', task: '과제', action: '행동', result: '결과', title: '제목', role: '역할', summary: '한 줄 요약' };
  const MAX_KW = 3;
  const STOP = new Set(['그리고', '그래서', '했어요', '있어요', '없어요', '같은', '하는', '하고', '해서', '에서', '으로', '이번', '최근', '정말', '그냥', '프로젝트', '경험', '문제', '처음', '다시', '먼저', '위해']);

  // ---------- 텍스트 ----------
  const tokens = (t) => String(t || '').replace(/[「」『』"'“”‘’()\[\]·,.!?~—\-→/+]/g, ' ').split(/\s+/)
    .map((w) => w.replace(/(은|는|이|가|을|를|에|의|도|로|와|과|랑|에서|으로|했어요|했다|해요)$/, ''))
    .filter((w) => w.length >= 2 && !STOP.has(w));
  const sentence = (t) => { t = String(t || '').trim(); return !t || /[.!?。]$/.test(t) ? t : t + '.'; };
  // 구어체 → 카드 문체
  function polish(text) {
    let t = String(text || '').trim().replace(/\s+/g, ' ');
    t = t.replace(/(^|\s)(그냥|약간|좀|뭔가|그래서|아무튼|일단|음|어)\s/g, '$1');
    t = t.replace(/했었어요/g, '했었음').replace(/([았었였했됐줬봤왔갔났웠렸켰쳤겼꿨졌])(어요|습니다)/g, '$1음').replace(/(해요|합니다)/g, '함').replace(/(이에요|예요|입니다)/g, '임').replace(/있어요/g, '있음').replace(/없어요/g, '없음').replace(/돼요/g, '됨').replace(/거든요|더라고요|네요/g, '음');
    return sentence(t);
  }
  // 어느 STAR 칸 이야기인가
  function inferField(answer, stage) {
    const a = String(answer || '');
    // 다른 걸 물었어도 수치가 있는 변화를 말하면 결과
    if (/\d/.test(a) && /(줄었|늘었|단축|→|통과|합격|수상|만에)/.test(a)) return 'result';
    if (stage) return stage;
    if (/(결과|덕분에|줄었|늘었|단축|수상|통과|합격|0건)/.test(a) || (/\d/.test(a) && /(→|%|배|만에)/.test(a))) return 'result';
    if (/(맡았|맡아|담당|역할|해야 했|목표)/.test(a)) return 'task';
    if (/(제안|바꿨|바꾸|추가|만들었|만들어|설명|정리했|적용|고쳤|나눠|나눴|찾아|확인했|도입|작성)/.test(a)) return 'action';
    return 'situation';
  }

  // ---------- 대화에서 아직 반영하지 않은 말 모으기 ----------
  // 말로 고친 제안(fixed)은 이야기를 담은 게 아니라서 경계로 세지 않는다
  function lastApplied(chat) { let i = -1; chat.msgs.forEach((m, k) => { if (m.kind === 'proposal' && m.proposal.status === 'applied' && !m.proposal.fixed) i = k; }); return i; }
  // → { fields:{ situation:[...], ... }, text, answers }
  function collect(chat) {
    const out = { fields: {}, text: '', answers: 0 };
    let stage = null;
    chat.msgs.slice(lastApplied(chat) + 1).forEach((m) => {
      if (m.who === 'ai') { if (m.kind !== 'proposal') stage = m.stage || null; return; }
      if (m.command) return;
      const f = inferField(m.text, stage);
      (out.fields[f] = out.fields[f] || []).push(m.text);
      out.text += (out.text ? ' ' : '') + m.text; out.answers++;
    });
    return out;
  }

  // 같은 프로젝트에서 같은 이야기를 하는 카드
  function match(projectId, text) {
    const tt = new Set(tokens(text)); let best = null; let bs = 0;
    S.cardsOf(projectId).forEach((e) => {
      const hit = new Set(tokens(e.title).filter((w) => tt.has(w))).size; if (hit < 2) return; // 낱말 하나 겹친 정도로는 같은 이야기라고 보지 않는다
      const title = hit * 3;
      const body = new Set(tokens([e.summary, e.star.situation, e.star.action].join(' ')));
      const s = title + [...tt].filter((w) => body.has(w)).length;
      if (s > bs) { bs = s; best = e; }
    });
    return bs >= 6 ? best : null;
  }

  // 이 채팅에서 만든 카드가 있는데 전혀 다른 이야기를 꺼냈는가 (겹치는 낱말이 없고, 이어 말하는 표현도 아닐 때)
  function newStory(chat, text) {
    const card = chat.cardId && S.get(chat.cardId); if (!card || lastApplied(chat) < 0 || text.length < 18) return false;
    if (/^(아\s|그리고|그래서|그때|그 ?뒤|그 ?후|이후|덕분에|결과|추가로|참고로|또|근데|그런데)/.test(text.trim())) return false;
    const body = new Set(tokens([card.title, card.summary, card.star.situation, card.star.task, card.star.action, card.star.result].join(' ')));
    return !tokens(text).some((w) => body.has(w) || [...body].some((b) => b.length >= 2 && w.length >= 2 && b.slice(0, 2) === w.slice(0, 2)));
  }

  // ---------- 정리 제안 ----------
  // 새 카드 제목: 첫 문장을 이름꼴로. 길면 마지막 절이나 사용자가 정한 채팅 이름 (제안에서 바로 고칠 수 있다)
  const unlead = (t) => String(t || '').replace(/^((그래서|그때|제가|저는|저희는|우리는)\s+)+/, '');
  function draftTitle(chat, seed) {
    const first = unlead(polish(String(seed).split(/(?<=[.!?])\s+/)[0])).replace(/[.!?]$/, '');
    const name = App.ai.resumeLine({ summary: first, title: first });
    if (name.length <= 34) return name;
    const tail = name.split(/(?<=(?:어서|아서|해서|하고|면서|지만))\s+/).pop(); // 길면 마지막 절
    if (tail.length >= 8 && tail.length <= 34) return tail;
    return chat.title && !/…$|^새 채팅$/.test(chat.title) && chat.title !== GH_TITLE ? chat.title : shorten(name, 30);
  }
  // target: 카드 id | 'new' | undefined(AI 가 고름)
  function buildProposal(chat, target) {
    const c = collect(chat);
    const card = target === 'new' ? null : target ? S.get(target) : match(chat.projectId, c.text) || (!newStory(chat, c.text) && chat.cardId && S.get(chat.cardId)) || null;
    const changes = STAGES.filter((f) => c.fields[f]).map((f) => { const add = c.fields[f].map(polish).join(' '); return { field: f, add, raw: add }; });
    const found = App.ai.extractKeywords(c.text);
    const keywords = App.keywords.clean([...(card ? card.keywords : []), ...found]).slice(0, MAX_KW);
    if (!keywords.length) keywords.push('실행력');
    const seed = (c.fields.action || c.fields.situation || c.fields.result || [''])[0];
    const pr = { mode: card ? 'update' : 'new', cardId: card ? card.id : null, title: card ? card.title : draftTitle(chat, seed), changes, keywords, status: 'pending' };
    pr.resumeLine = lineOf(pr); return pr;
  }
  // 이 제안을 반영하면 카드의 「이력서 한 줄」이 될 문장. 사용자가 직접 고친 줄이 있는 카드이거나 말로 한 칸만 고치는 제안이면 ''
  function lineOf(pr) {
    const card = pr.mode === 'update' ? S.get(pr.cardId) : null;
    if (pr.fixed || (pr.mode === 'update' && (!card || card.resumeLineEdited))) return '';
    if (pr.lineEdited && pr.resumeLine) return pr.resumeLine;
    const would = { title: pr.title, summary: card ? card.summary : '', star: Object.assign({ situation: '', task: '', action: '', result: '' }, card && card.star) };
    const added = {};
    pr.changes.forEach((ch) => { if (!(ch.field in would.star) || !ch.add) return; added[ch.field] = ch.add; would.star[ch.field] = [would.star[ch.field], ch.add].filter(Boolean).join(' '); });
    if (!would.summary) would.summary = shorten(unlead(would.star.action || would.star.situation || would.star.result), 80);
    let line = (card && card.resumeLine) || App.ai.resumeLine(would);
    // 이번에 들은 결과에 수치가 있으면 뒤에 붙인다
    let res = /\d/.test(added.result || '') ? shorten(String(added.result).split(/(?<=[.!?])\s+/).find((x) => /\d/.test(x)).replace(/^(그 결과|결과로|결과적으로|덕분에)\s+/, ''), 48).replace(/[.!?]$/, '') : '';
    if (res) res = App.ai.resumeLine({ summary: res, title: res });
    if (res && !line.includes(res) && line.length + res.length <= 100) line = `${line.replace(/[.,]$/, '')}, ${res}`;
    return line;
  }
  function shorten(t, max) { const x = App.ai.brief(t, max); return /…$/.test(x) ? x.slice(0, -1).replace(/\s+\S*$/, '') : x; }
  // 카드가 지금 어디에 있는가: 'alive' | 'trash' | 'gone'
  function cardState(id) {
    if (!id) return 'gone'; if (S.get(id)) return 'alive';
    return S.trash().some((t) => (t.data.experiences || []).some((e) => e.id === id)) ? 'trash' : 'gone';
  }
  // 반영 · 되돌리기: 제안에서 사용자가 고친 이력서 한 줄은 카드에서도 직접 고친 줄로 남는다
  function apply(chatId, msgId) {
    const c = S.getChat(chatId); const m = c && c.msgs.find((x) => x.id === msgId); if (!m || !m.proposal) return null;
    const pr = m.proposal; pr.resumeLine = lineOf(pr);
    const e = S.applyProposal(chatId, msgId);
    if (e && pr.lineEdited && pr.resumeLine) { e.resumeLineEdited = true; S.touch(); }
    return e;
  }
  function undo(chatId, msgId) {
    const c = S.getChat(chatId); const m = c && c.msgs.find((x) => x.id === msgId); const pr = m && m.proposal; const e = pr && S.get(pr.cardId);
    if (!e || !S.canUndo(pr)) return false;
    if (!pr.snap && e.resumeLineEdited) { pr.resumeLine = e.resumeLine; pr.lineEdited = true; } // 새 카드: 다시 반영할 때 그대로 쓴다
    else if (pr.lineEdited && e.resumeLine === pr.resumeLine) e.resumeLineEdited = false;
    return S.undoProposal(chatId, msgId);
  }
  function proposalMsg(chat, target) {
    const pr = buildProposal(chat, target);
    const text = pr.mode === 'update' ? `「${pr.title}」 카드를 이렇게 고칠게요.` : '새 경험 카드로 정리해 봤어요.';
    return { who: 'ai', kind: 'proposal', text, proposal: pr };
  }
  // 제안의 대상 카드를 바꾼다 (기존 카드 ↔ 새 카드). 사용자가 고친 문장은 그대로 둔다
  function retarget(chat, msgId, target) {
    const m = chat.msgs.find((x) => x.id === msgId); if (!m) return;
    const old = m.proposal; const next = proposalMsg(chat, target || 'new'); next.proposal.target = old.target = target || 'new';
    S.updateMsg(chat.id, msgId, { text: next.text, proposal: carry(old, next.proposal) });
  }
  // 앞 제안에서 사용자가 고친 제목·문장을 새 제안이 이어받는다
  function carry(old, next) {
    if (!old) return next;
    if (old.target) next.target = old.target;
    if (old.lineEdited) { next.lineEdited = true; next.resumeLine = old.resumeLine; }
    if (old.titleEdited) { next.titleEdited = old.titleEdited; if (next.mode === 'new') next.title = old.titleEdited; }
    next.changes.forEach((ch) => {
      const o = old.changes.find((x) => x.field === ch.field);
      if (!o || o.add === o.raw || !String(ch.raw).startsWith(o.raw)) return;
      ch.add = `${o.add} ${ch.raw.slice(o.raw.length)}`.trim();
    });
    next.resumeLine = lineOf(next);
    return next;
  }

  // "제목을 …로 바꿔 줘", "역량은 리더십으로" 처럼 말로 고치기 (카드가 정해진 대화에서)
  function command(chat, text) {
    const card = chat.cardId && S.get(chat.cardId); if (!card) return null;
    const base = { mode: 'update', cardId: card.id, title: card.title, changes: [], keywords: card.keywords.slice(), status: 'pending', fixed: true };
    // 명령형("…로 바꿔 줘")으로 끝날 때만. 이야기 속의 "바꿔서", "해결했어요" 는 명령이 아니다
    const ORDER = '(?:바꿔|고쳐|변경해|수정해|해)\\s?(?:줘|줘요|주세요|줄래요?|주실래요?)[.!?~]*$';
    const t = text.match(new RegExp('^(제목|역할|요약)(?:을|를|은|는)?\\s*["\'「“]?(.+?)["\'」”]?\\s*(?:으로|로)\\s*' + ORDER));
    if (t) {
      const field = { 제목: 'title', 역할: 'role', 요약: 'summary' }[t[1]];
      base.changes.push({ field, before: card[field] || '', after: t[2] });
      return { who: 'ai', kind: 'proposal', text: `${t[1]}${t[1] === '제목' || t[1] === '역할' ? '을' : '를'} 이렇게 바꿀게요.`, proposal: base };
    }
    const k = /(역량|키워드)/.test(text) && /(바꿔|고쳐|변경해|수정해|넣어|추가해|해)\s?(줘|주세요|줄래)/.test(text) && App.keywords.names().filter((n) => text.includes(n) || text.includes(n.replace(/\s/g, '')));
    if (k && k.length) {
      base.keywords = /(추가|넣어)/.test(text) ? App.keywords.clean([...k, ...card.keywords]).slice(0, MAX_KW) : k.slice(0, MAX_KW);
      return { who: 'ai', kind: 'proposal', text: '역량을 이렇게 바꿀게요.', proposal: base };
    }
    const r = text.match(new RegExp('^(상황|과제|행동|결과)(?:을|를|은|는)?\\s*["\'「“]?(.+?)["\'」”]?\\s*(?:으로|로)\\s*' + ORDER));
    if (r) {
      const field = { 상황: 'situation', 과제: 'task', 행동: 'action', 결과: 'result' }[r[1]];
      base.changes.push({ field, before: card.star[field], after: sentence(r[2]) });
      return { who: 'ai', kind: 'proposal', text: `${r[1]}${r[1] === '상황' || r[1] === '행동' ? '을' : '를'} 이렇게 바꿀게요.`, proposal: base };
    }
    return null;
  }
  // 이야기가 아니라 부탁·인사인 말 → 카드에 담지 않고 되묻는다
  function smallTalk(text) {
    const t = text.trim();
    if (/^(고마워요?|고맙습니다|감사해요|감사합니다|안녕|안녕하세요?|네+|넵|응|ㅇㅇ|좋아요|알겠어요|알겠습니다|[ㅋㅎㅠㅜ]+)[\s.!~ㅋㅎ]*$/.test(t)) return { who: 'ai', text: '네! 더 담고 싶은 이야기가 있으면 이어서 적어 주세요.' };
    // 짧은 부탁으로 끝나는 말만 (이야기 속의 "고쳐 줬어요" 등은 그대로 담는다)
    if (t.length > 45 || !/((고치|쓰|적|바꾸|더하|추가하|보완하|채우|다듬)고 싶(어요|습니다|은데요?)|(고쳐|수정해|다듬어|보완해|채워|바꿔)\s?(줘|줘요|주세요|줄래요?)|(어색|이상)(해요|한데요?|하네요))[.!?~]*$/.test(t)) return null;
    const f = [['결과', 'result'], ['행동', 'action'], ['과제', 'task'], ['상황', 'situation']].find(([n]) => text.includes(n));
    return f ? { who: 'ai', stage: f[1], text: `${LABEL[f[1]]}에 어떤 내용을 담을까요? ${window.SEED.followups[f[1]][0]}` }
      : { who: 'ai', text: '어느 부분을 어떻게 바꿀까요? 예) "결과를 0.3초로 바꿔 줘", "제목을 …로 바꿔 줘"' };
  }
  const wantsSummary = (t) => t.length < 30 && /(정리해\s?(줘|주세요|줄래|볼까|요)|카드(로|를)?\s?만들어\s?(줘|주세요)?|이 정도면|여기까지)[.!?~]*$/.test(t.trim());

  // ---------- GitHub ----------
  // msg.gh = { status:'running'|'ready'|'done'|'error'|'empty'|'connect', step, picked:[key], drafts:[초안], madeIds:[카드 id], error }
  const GH_TITLE = 'GitHub에서 찾은 경험';
  const GH_REQ = /(깃허브|깃헙|github|레포)/i; const GH_END = /(찾기|분석|((찾아|분석해|가져와|읽어|훑어|살펴)\s?(봐|보아)?\s?(줘|줘요|주세요|줄래요?|주실래요?|볼래요?|달라)?))[.!?~]*$/;
  const wantsGithub = (t) => { t = String(t || '').trim(); return t.length <= 32 && GH_REQ.test(t) && GH_END.test(t); };
  function githubMsg(projectId) {
    const p = S.getProject(projectId); const on = !!(p && (p.repos || []).length);
    return { who: 'ai', kind: 'github', text: on ? '연결한 GitHub 레포를 읽고 있어요.' : '이 프로젝트에 연결한 GitHub 레포가 아직 없어요. 연결하면 바로 찾아볼게요.', gh: { status: on ? 'running' : 'connect', step: 0, picked: [], drafts: [], madeIds: [], error: '' } };
  }

  // ---------- 질문 ----------
  const josa = (w, a, b) => { const c = String(w).charCodeAt(String(w).length - 1) - 0xac00; return w + (c >= 0 && c <= 11171 && c % 28 === 0 ? b : a); };
  const missingOf = (card) => STAGES.filter((f) => !card.star[f]);
  function opening({ projectId, cardId, keyword }) {
    const card = cardId && S.get(cardId);
    if (card) {
      const miss = missingOf(card)[0]; const q = miss && window.SEED.followups[miss][0];
      if (card.source === 'github') {
        const read = ['situation', 'action'].filter((f) => card.star[f]).map((f) => `${LABEL[f]}: ${card.star[f]}`).join('\n');
        return { who: 'ai', stage: miss || 'action', text: `「${card.title}」 작업을 GitHub에서 이렇게 읽었어요.\n\n${read}\n\n${miss ? `${josa(LABEL[miss], '은', '는')} 코드만 봐서는 알 수 없었어요. ${q}` : '왜 이 방법을 골랐는지 들려주세요.'}` };
      }
      return miss
        ? { who: 'ai', stage: miss, text: `「${card.title}」 카드의 ${josa(LABEL[miss], '이', '가')} 비어 있어요. ${q}` }
        : { who: 'ai', text: `「${card.title}」 카드에서 어떤 부분을 고치거나 더할까요? 편하게 말해 주세요.` };
    }
    if (keyword) return { who: 'ai', text: `「${keyword}」 역량을 보여 줄 수 있는 일이 있었나요? ${App.keywords.get(keyword).desc}이면 돼요.` };
    const n = S.chatsOf(projectId).length;
    return { who: 'ai', text: window.SEED.openers[n % window.SEED.openers.length] };
  }
  function ask(chat, stage, alt) {
    const F = window.SEED.followups; const asked = new Set(chat.msgs.filter((m) => m.who === 'ai').map((m) => m.text));
    const pool = alt ? F.alt : F[stage];
    return { who: 'ai', stage: alt ? null : stage, text: pool.find((t) => !asked.has(t)) || pool[0] };
  }
  // 사용자가 말한 뒤 AI 가 할 말
  function reply(chat) {
    const me = chat.msgs[chat.msgs.length - 1];
    const cmd = command(chat, me.text); if (cmd) { S.updateMsg(chat.id, me.id, { command: true }); return cmd; }
    if (wantsGithub(me.text)) { S.updateMsg(chat.id, me.id, { command: true }); return githubMsg(chat.projectId); }
    const st = smallTalk(me.text); if (st) { S.updateMsg(chat.id, me.id, { command: true }); return st; }
    if (wantsSummary(me.text)) { S.updateMsg(chat.id, me.id, { command: true }); return collect(chat).answers ? proposalMsg(chat) : { who: 'ai', text: '아직 담을 이야기가 없어요. 있었던 일을 한 줄만 들려주세요.' }; }
    if (/(모르겠|기억이 안|기억 안|글쎄|^(딱히|별로|특별히)?\s*(없어요?|없습니다|없었어요|없음|딱히요?|별로요?)[\s.!~]*$)/.test(me.text.trim()) && me.text.length < 20) { S.updateMsg(chat.id, me.id, { command: true }); return ask(chat, null, true); }
    const c = collect(chat);
    if (chat.cardId && S.get(chat.cardId) && !newStory(chat, c.text)) return proposalMsg(chat); // 이미 카드가 있는 대화는 바로 그 카드를 고친다
    const missing = STAGES.find((f) => !c.fields[f]);
    if (!missing || c.answers >= 5) return proposalMsg(chat);
    return ask(chat, missing);
  }
  // 정리할 거리가 있고, 아직 정리 제안이 걸려 있지 않은가
  function canSummarize(chat) { return collect(chat).answers > 0 && !chat.msgs.some((m) => m.kind === 'proposal' && m.proposal.status === 'pending'); }

  App.chat = { opening, reply, proposalMsg, retarget, carry, lineOf, apply, undo, cardState, missingOf, githubMsg, wantsGithub, GH_TITLE, canSummarize, collect, LABEL, STAGES, MAX_KW, _internals: { polish, inferField, match } };
})(window.App);
