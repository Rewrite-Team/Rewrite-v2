/* AI 채팅의 AI (목업): App.chat — 대화방은 프로젝트의 것이고, 카드를 고르는 건 AI 의 일이다.
   말을 들으면 그 프로젝트에서 가장 맞는 카드(없으면 새 카드)의 알맞은 칸에 바로 담고(respond), 그 카드의 빈칸을 이어서 묻는다.
   어느 카드에 담았는지는 답에 적고(touch), 오른쪽 카드 목록이 그 카드로 옮겨 가 바뀐 칸을 보여 준다.
   회고(retrospect)는 사용자가 카드에서 직접 쓰는 칸이라 여기서 다루지 않는다. */
(function (App) {
  const S = App.store;
  const STAGES = ['situation', 'task', 'action', 'result'];
  const LABEL = { situation: '상황', task: '과제', action: '행동', result: '결과', title: '제목', role: '역할', summary: '한 줄 요약', resumeLine: '이력서 한 줄' };
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
    if (/(제안|바꿨|바꾸|추가|만들었|만들어|설명|정리했|적용|고쳤|나눠|나눴|찾아|확인했|도입|작성|구현|개발했|수정했|변경했|자동화)/.test(a)) return 'action';
    return 'situation';
  }

  // ---------- 아직 카드에 담지 않은 말 ----------
  const waiting = (chat) => chat.msgs.filter((m) => m.who === 'me' && !m.done && !m.command && !m.hold);
  // 이 말이 들어갈 칸: 분명하면 그 칸, 아니면 바로 앞에서 이 카드에 대해 물어본 칸
  function fieldOf(chat, m, card) {
    let asked = null; for (const x of chat.msgs) { if (x === m) break; if (x.who === 'ai') asked = (x.card || null) === (card ? card.id : null) ? x.stage || null : null; }
    const guess = inferField(m.text, null);
    if (!asked) return guess === 'situation' && card && !missingOf(card).length ? 'action' : guess; // 다 채운 카드에 더하는 말은 행동으로
    if (guess === 'result' || guess === 'situation' || asked === 'result') return guess === 'result' ? 'result' : asked;
    if (asked === 'task') return /(기로 했|맡|담당|역할|책임|해야|목표)/.test(m.text) ? 'task' : guess;
    return asked === 'action' ? 'action' : guess;
  }
  // → { fields:{ situation:[...], ... }, text, msgs }
  function collect(chat, card) {
    const out = { fields: {}, text: '', msgs: waiting(chat) };
    out.msgs.forEach((m) => { const t = m.text.replace(SWITCH_LEAD, '').trim() || m.text; const f = fieldOf(chat, m, card); (out.fields[f] = out.fields[f] || []).push(t); out.text += (out.text ? ' ' : '') + t; });
    return out;
  }

  // ---------- 다른 카드 이야기인가 ----------
  // 제목 낱말이 겹치면 크게, 내용 낱말이 겹치면 조금 센다. 프로젝트 이름은 세지 않는다
  function score(e, text) {
    const p = S.getProject(e.projectId); const skip = new Set(tokens(p ? p.title : '')); const tt = new Set(tokens(text).filter((w) => !skip.has(w)));
    const hit = new Set(tokens(e.title).filter((w) => tt.has(w))).size; // close: 제목이 꽤 겹친다
    const body = new Set(tokens([e.summary, e.resumeLine, e.star.situation, e.star.task, e.star.action, e.star.result].join(' ')));
    return { hit, close: hit >= 3 || (hit === 2 && hit / new Set(tokens(e.title)).size >= 0.4), total: hit * 3 + [...tt].filter((w) => body.has(w)).length };
  }
  // 같은 프로젝트에서 이 말과 가장 닮은 카드
  function match(projectId, text, exceptId) {
    let best = null; let bs = 0;
    S.cardsOf(projectId).forEach((e) => {
      if (e.id === exceptId) return; const x = score(e, text);
      if (x.close && x.total > bs) { bs = x.total; best = e; }
    });
    return best && { card: best, total: bs };
  }
  // 이 카드와 겹치는 낱말이 하나도 없는 새 이야기인가. 다른 이야기라고 말했거나, 빈칸을 묻던 중이 아닐 때만 본다
  const SWITCH = /^(다른|또 다른|새로운)\s?(이야기|얘기|경험)|^(이건|이번엔|이번에는)\s?(다른|별개)|(다른|별개의?)\s?(이야기|얘기|경험)(인데|예요|이에요|입니다|할게요|할래요|하고 싶)/;
  function newStory(card, text) {
    if (SWITCH.test(text.trim())) return true;
    if (missingOf(card).length || text.length < 18) return false;
    if (/^(아\s|그리고|그래서|그때|그 ?뒤|그 ?후|이후|덕분에|결과|추가로|참고로|또|근데|그런데)/.test(text.trim())) return false;
    const body = new Set(tokens([card.title, card.summary, card.star.situation, card.star.task, card.star.action, card.star.result].join(' ')));
    return !tokens(text).some((w) => body.has(w) || [...body].some((b) => b.length >= 2 && w.length >= 2 && b.slice(0, 2) === w.slice(0, 2)));
  }
  // 이 말을 담을 카드 → 카드 | null(새 카드)
  // 1) "다른 이야기인데…"는 새 카드 2) 펼쳐 둔 카드(없으면 방금 AI 가 물어본 카드)가 있으면 그 카드, 단 다른 카드가 훨씬 닮았으면 그 카드
  // 3) 펼쳐 둔 카드와 겹치는 게 없는 새 이야기면 새 카드 4) 아무것도 없으면 가장 닮은 카드, 그것도 없으면 새 카드
  function route(chat, text) {
    if (SWITCH.test(text.trim())) return null;
    const mine = (id) => { const e = id && S.get(id); return e && e.projectId === chat.projectId ? e : null; };
    const lastAi = chat.msgs.slice().reverse().find((m) => m.who === 'ai'); // 바로 앞의 AI 말이 어느 카드의 빈칸을 묻던 중일 때만
    const cur = mine(chat.focus) || (lastAi && lastAi.card && lastAi.stage ? mine(lastAi.card) : null);
    const m = match(chat.projectId, text, cur && cur.id);
    if (!cur) return m ? m.card : null;
    if (m && m.total > score(cur, text).total + 2) return m.card;
    return newStory(cur, text) ? null : cur;
  }

  // ---------- 카드에 담기 ----------
  // 새 카드 제목: 첫 문장을 이름꼴로. 길면 마지막 절
  const unlead = (t) => String(t || '').replace(/^((그래서|그때|제가|저는|저희는|우리는)\s+)+/, '');
  function draftTitle(seed) {
    const first = unlead(polish(String(seed).split(/(?<=[.!?])\s+/)[0])).replace(/[.!?]$/, '');
    const name = App.ai.resumeLine({ summary: first, title: first });
    if (name.length <= 34) return name;
    const tail = name.split(/(?<=(?:어서|아서|해서|하고|면서|지만))\s+/).pop(); // 길면 마지막 절
    if (tail.length >= 8 && tail.length <= 34) return tail;
    return shorten(name, 30);
  }
  function shorten(t, max) { const x = App.ai.brief(t, max); return /…$/.test(x) ? x.slice(0, -1).replace(/\s+\S*$/, '') : x; }
  // 카드가 지금 어디에 있는가: 'alive' | 'trash' | 'gone'
  function cardState(id) {
    if (!id) return 'gone'; if (S.get(id)) return 'alive';
    return S.trash().some((t) => (t.data.experiences || []).some((e) => e.id === id)) ? 'trash' : 'gone';
  }
  // 담은 뒤의 카드에서 제목·요약·이력서 한 줄을 정한다. 사용자가 직접 정한 제목과 줄은 건드리지 않는다
  function settle(added, retitle) {
    return (e) => {
      if (e.auto && !e.titled && retitle) e.title = draftTitle(e.star.action || e.star.situation || e.star.result || e.star.task);
      if (e.auto || !e.summary) e.summary = shorten(unlead(e.star.action || e.star.situation || e.star.result || e.star.task), 80);
      if (e.resumeLineEdited) return;
      let line = (!e.auto && e.resumeLine) || App.ai.resumeLine(e);
      // 결과에 수치가 있으면 뒤에 붙인다 (이미 다듬어진 카드에는 이번에 들은 결과만)
      const from = e.auto ? e.star.result : added.result || '';
      let res = /\d/.test(from) ? shorten(String(from).split(/(?<=[.!?])\s+/).find((x) => /\d/.test(x)).replace(/^(그 결과|결과로|결과적으로|덕분에)\s+/, ''), 48).replace(/[.!?]$/, '') : '';
      if (res) res = App.ai.resumeLine({ summary: res, title: res });
      if (res && !line.includes(res) && line.length + res.length <= 100) line = `${line.replace(/[.,]$/, '')}, ${res}`;
      e.resumeLine = line;
    };
  }
  // 담지 않은 말을 모두 카드 하나에 담는다 (card 가 없으면 새 카드) → { card, created, fields, before } | null
  function feed(chat, card) {
    const c = collect(chat, card); if (!c.msgs.length) return null;
    const changes = STAGES.filter((f) => c.fields[f]).map((f) => ({ field: f, add: c.fields[f].map(polish).join(' ') }));
    const keywords = App.keywords.clean([...(card ? card.keywords : []), ...App.ai.extractKeywords(c.text)]).slice(0, MAX_KW);
    const added = {}; changes.forEach((ch) => { added[ch.field] = ch.add; });
    const seed = (c.fields.action || c.fields.situation || c.fields.result || c.fields.task)[0];
    const r = S.feed(chat.id, { cardId: card ? card.id : null, changes, keywords, title: card ? '' : draftTitle(seed), patch: settle(added, true) }); if (!r) return null;
    c.msgs.forEach((m) => S.updateMsg(chat.id, m.id, { done: true, card: r.card.id }));
    return Object.assign(r, { fields: changes.map((ch) => ch.field) });
  }
  // 담은 뒤에 할 말: 그 카드의 다음 빈칸. 어느 카드의 어느 칸에 담았는지는 touch 로 답 위에 붙는다 (같은 말을 두 번 하지 않는다)
  function told(chat, r, focus) {
    const moved = !r.created && focus && focus !== r.card.id; // 펼쳐 둔 카드와 다른 카드에 담았다
    const where = r.created ? (S.cardsOf(chat.projectId).length > 1 ? '있던 카드와 다른 이야기라 새 경험 카드를 만들었어요.' : '새 경험 카드를 만들었어요.') : moved ? '펼쳐 둔 카드보다 이 카드에 더 맞는 이야기라 여기에 담았어요.' : '';
    const touch = { card: r.card.id, title: r.card.title, created: r.created, fields: r.fields };
    const miss = missingOf(r.card);
    if (!miss.length) return { who: 'ai', card: r.card.id, touch, text: `${where ? where + ' ' : ''}${r.before && !missingOf(r.before).length ? '' : '네 칸이 모두 채워졌어요. '}더 있었던 일이 있으면 이어서 적어 주세요.` };
    const q = ask(chat, miss[0]); return Object.assign(q, { card: r.card.id, touch, text: where ? `${where}\n${q.text}` : q.text });
  }

  // 펼쳐 둔 카드 (이 프로젝트의 것만)
  const focusCard = (chat) => { const e = chat.focus && S.get(chat.focus); return e && e.projectId === chat.projectId ? e : null; };
  // "제목을 …로 바꿔 줘", "역량에 리더십 추가해 줘", "결과 지워 줘" 처럼 말로 고치기
  function command(chat, text) {
    text = text.trim();
    // 명령형("…로 바꿔 줘")으로 끝날 때만. 이야기 속의 "바꿔서", "해결했어요" 는 명령이 아니다
    const ORDER = '(?:바꿔|고쳐|변경해|수정해|해)\\s?(?:줘|줘요|주세요|줄래요?|주실래요?)[.!?~]*$';
    const FIELD = { 제목: 'title', 역할: 'role', 요약: 'summary', '이력서 한 줄': 'resumeLine', 상황: 'situation', 과제: 'task', 행동: 'action', 결과: 'result' };
    const card = focusCard(chat); const mk = (o) => S.feed(chat.id, Object.assign({ cardId: card.id }, o));
    const isCmd = new RegExp('^(제목|역할|요약|이력서 한 줄|상황|과제|행동|결과|역량|키워드)').test(text) && new RegExp(ORDER).test(text) || /(지워|비워)\s?(줘|줘요|주세요|줄래요?)[.!?~]*$/.test(text) && /^(상황|과제|행동|결과)/.test(text);
    if (isCmd && !card) return { who: 'ai', text: '어느 카드를 고칠까요? 오른쪽에서 카드를 먼저 골라 주세요.' };
    if (!card) return null;
    const done = (name, fields) => ({ who: 'ai', card: card.id, touch: { card: card.id, title: card.title, created: false, fields }, text: `${josa(name, '을', '를')} 바꿨어요.` });
    const t = text.match(new RegExp('^(제목|역할|요약|이력서 한 줄|상황|과제|행동|결과)(?:을|를|은|는)?\\s*["\'「“]?(.+?)["\'」”]?\\s*(?:으로|로)\\s*' + ORDER));
    if (t) {
      const f = FIELD[t[1]];
      if (f === 'resumeLine') mk({ patch: (e) => { if (!e.resumeLineEdited) e.aiLine = e.resumeLine; e.resumeLine = t[2]; e.resumeLineEdited = true; } });
      else { const after = STAGES.includes(f) ? sentence(t[2]) : t[2]; mk({ changes: [{ field: f, after }], patch: STAGES.includes(f) ? settle({ [f]: after }) : (e) => { if (f === 'title') e.titled = true; } }); }
      return done(t[1], [f]);
    }
    const x = text.match(/^(상황|과제|행동|결과)(?:을|를|은|는)?\s*(?:내용을?\s*)?(?:지워|비워)\s?(?:줘|줘요|주세요|줄래요?)[.!?~]*$/);
    if (x) { mk({ changes: [{ field: FIELD[x[1]], after: '' }], patch: settle({}) }); return { who: 'ai', card: card.id, stage: FIELD[x[1]], touch: { card: card.id, title: card.title, created: false, fields: [FIELD[x[1]]] }, text: `${josa(x[1], '을', '를')} 비웠어요.` }; }
    const k = /(역량|키워드)/.test(text) && /(바꿔|고쳐|변경해|수정해|넣어|추가해|해)\s?(줘|주세요|줄래)/.test(text) && App.keywords.names().filter((n) => text.includes(n) || text.includes(n.replace(/\s/g, '')));
    if (k && k.length) { mk({ keywords: (/(추가|넣어)/.test(text) ? App.keywords.clean([...k, ...card.keywords]) : k).slice(0, MAX_KW) }); return done('역량', ['keywords']); }
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
  // 카드를 펼쳐 두고 새 채팅을 열 때의 안내
  function opening(card) {
    const miss = missingOf(card)[0]; const q = miss && window.SEED.followups[miss][0];
    if (!miss) return { stage: null, text: '네 칸이 모두 채워진 카드예요. 더 있었던 일이 있으면 적어 주세요.' };
    return { stage: miss, text: `${josa(LABEL[miss], '은', '는')} 아직 비어 있어요. ${q}` };
  }
  function ask(chat, stage, alt) {
    const F = window.SEED.followups; const asked = chat.msgs.filter((m) => m.who === 'ai').map((m) => m.text).join('\n');
    const pool = alt ? F.alt : F[stage];
    return { who: 'ai', stage: alt ? null : stage, text: pool.find((t) => !asked.includes(t)) || pool[0] };
  }
  // 「이 카드 지워 줘」: 펼쳐 둔 카드를 휴지통으로
  const DEL = /^(이|지금|펼친|고른|펼쳐 둔|이번)?\s?(경험\s?)?카드(를|을|는)?\s*(통째로\s*)?(지워|삭제해|없애|버려|휴지통(?:으로|에)\s*(?:옮겨|넣어|보내))\s?(줘|줘요|주세요|줄래요?|주실래요?)[.!?~]*$/;
  const wantsDelete = (t) => DEL.test(String(t || '').trim());
  // 사용자의 마지막 말을 듣고 카드에 담은 뒤, AI 가 할 말을 돌려준다. opt.ask: 지우기는 하지 않고 허락을 구하는 말을 돌려준다
  function reply(chat, opt = {}) {
    const me = chat.msgs[chat.msgs.length - 1]; const text = me.text.trim(); const focus = focusCard(chat) ? chat.focus : null;
    const skip = (m) => { S.updateMsg(chat.id, me.id, { command: true }); return m; };
    if (wantsDelete(text)) {
      const card = focusCard(chat); if (!card) return skip({ who: 'ai', text: '어느 카드를 지울까요? 오른쪽에서 카드를 먼저 골라 주세요.' });
      if (opt.ask) return skip(proposal({ op: 'delete', cardId: card.id, before: JSON.parse(JSON.stringify(card)), after: null, fields: [], ids: [], cmd: '' }));
      const t = S.remove(card.id); return skip({ who: 'ai', trash: t ? t.id : '', text: `「${card.title}」 카드를 휴지통으로 옮겼어요. 대화방은 그대로 남아요.` });
    }
    const cmd = command(chat, text); if (cmd) return skip(cmd);
    if (wantsGithub(text)) return skip({ who: 'ai', kind: 'link', link: 'github', text: 'GitHub에서 찾은 작업은 이 프로젝트의 경험 카드로 만들어져요.' });
    const st = smallTalk(text); if (st) return skip(st);
    if (wantsSummary(text)) return skip({ who: 'ai', text: S.cardsOf(chat.projectId).length ? '말씀하신 내용은 오른쪽 경험 카드에 바로 담고 있어요.' : '아직 담을 이야기가 없어요. 있었던 일을 한 줄만 들려주세요.' });
    if (/(모르겠|기억이 안|기억 안|글쎄|^(딱히|별로|특별히)?\s*(없어요?|없습니다|없었어요|없음|딱히요?|별로요?)[\s.!~]*$)/.test(text) && text.length < 20) return skip(Object.assign(ask(chat, null, true), { card: focus }));
    if (SWITCH.test(text) && text.replace(SWITCH_LEAD, '').trim().length < 6) { S.setFocus(chat.id, null); return skip({ who: 'ai', text: '좋아요. 어떤 일이었는지 들려주세요. 새 경험 카드로 담을게요.' }); }
    const r = feed(chat, route(chat, text)); if (!r) return { who: 'ai', text: '아직 담을 이야기가 없어요. 있었던 일을 한 줄만 들려주세요.' };
    return told(chat, r, focus);
  }
  /* ---------- 허락 받기 (설정: 매번 묻기) ----------
     카드를 만들거나 고치거나 지우기 전에, 무엇을 바꿀지 보여 주고 허락을 받는다.
     바꿀 내용은 상태의 복사본에서 미리 해 보고(S.dry) 그 앞뒤 모습을 메시지에 담는다. 허락하면 그대로 반영하고, 그사이 카드가 바뀌었으면 반영하지 않는다.
     msg.pending = { op:'create'|'update'|'delete', cardId, before, after, fields, ids:[카드에 담길 내 말], cmd:명령이었던 내 말 id, next:허락한 뒤 AI 가 할 말, status:'wait'|'ok'|'no'|'fail' } */
  function proposal(p) {
    const title = (p.after || p.before).title;
    const names = (p.fields || []).map((f) => LABEL[f] || (f === 'keywords' ? '역량' : '')).filter(Boolean);
    const text = p.op === 'create' ? `새 경험 카드 「${title}」${josa(title, '을', '를').slice(-1)} 만들까요?`
      : p.op === 'delete' ? `「${title}」 카드를 휴지통으로 옮길까요? ${S.TRASH_DAYS}일 안에는 되돌릴 수 있어요.`
      : `「${title}」 카드의 ${names.length ? josa(names.join('·'), '을', '를') : '내용을'} 이렇게 바꿀까요?`;
    return { who: 'ai', kind: 'confirm', card: p.op === 'create' ? null : p.cardId, text, pending: Object.assign({ status: 'wait' }, p) };
  }
  function respond(chat) {
    if (S.cardPerm() !== 'ask') return reply(chat);
    const me = chat.msgs[chat.msgs.length - 1];
    if (wantsDelete(me.text)) return reply(chat, { ask: true });
    const rev0 = chat.last && chat.last.rev; const done0 = new Set(chat.msgs.filter((m) => m.done).map((m) => m.id));
    const r = S.dry(() => {
      const c = S.getChat(chat.id); const msg = reply(c, { ask: true }); const l = c.last;
      if (!l || l.rev === rev0) return null; // 카드를 바꾸지 않는 답
      return { msg, cardId: l.cardId, before: l.before, after: S.get(l.cardId), ids: c.msgs.filter((m) => m.who === 'me' && m.done && !done0.has(m.id)).map((m) => m.id) };
    });
    if (!r) return reply(chat);
    const cmd = r.ids.includes(me.id) ? '' : me.id;
    r.ids.concat(cmd ? [cmd] : []).forEach((id) => S.updateMsg(chat.id, id, { hold: true })); // 허락을 받을 때까지 다른 카드에 담지 않는다
    if (r.before) S.setFocus(chat.id, r.cardId);
    const t = r.msg.touch || {}; const next = { text: r.msg.text, stage: r.msg.stage || null, card: r.cardId, touch: { card: r.cardId, title: r.after.title, created: !r.before, fields: t.fields || [] } };
    return proposal({ op: r.before ? 'update' : 'create', cardId: r.cardId, before: r.before, after: r.after, fields: t.fields || [], ids: r.ids, cmd, next });
  }
  // 허락하거나(yes) 거절한다 → { msg: AI 가 이어서 할 말, changed?, removed? } | null
  function decide(chatId, msgId, yes) {
    const c = S.getChat(chatId); const m = c && c.msgs.find((x) => x.id === msgId); const p = m && m.pending; if (!p || p.status !== 'wait') return null;
    const release = (patch) => { p.ids.forEach((id) => S.updateMsg(chatId, id, Object.assign({ hold: false }, patch))); if (p.cmd) S.updateMsg(chatId, p.cmd, { hold: false, command: true }); };
    const close = (status) => S.updateMsg(chatId, msgId, { pending: Object.assign({}, p, { status }) });
    if (!yes) { release({ command: true }); close('no'); return { msg: { who: 'ai', text: p.op === 'delete' ? '카드를 지우지 않았어요.' : '카드는 그대로 두었어요. 다르게 담고 싶으면 다시 말씀해 주세요.' } }; }
    const r = S.applyProposal(chatId, p);
    if (r.error) { release({ command: true }); close('fail'); return { msg: { who: 'ai', text: r.error === 'changed' ? '그사이 카드가 바뀌어서 반영하지 않았어요. 다시 말씀해 주시면 지금 카드에 맞춰 담을게요.' : '카드나 프로젝트가 휴지통에 있어서 반영하지 못했어요.' } }; }
    close('ok');
    if (r.removed) return { removed: true, msg: { who: 'ai', trash: r.trash ? r.trash.id : '', text: `「${r.removed.title}」 카드를 휴지통으로 옮겼어요. 대화방은 그대로 남아요.` } };
    release({ done: true, card: r.card.id });
    return { changed: true, msg: Object.assign({ who: 'ai' }, p.next) };
  }
  const SWITCH_LEAD = /^(다른|또 다른|새로운)\s?(이야기|얘기|경험)(인데요?|예요|이에요|입니다|할게요|할래요)?[,.\s]*/;

  /* ---------- 오늘의 질문 ----------
     프로젝트마다 고정된 방(chat.daily)에 날마다 질문 하나. 비어 있는 칸이 있는 카드가 있으면 그 칸을 묻고(답은 그 카드로 간다),
     없으면 있었던 일을 떠올리게 하는 질문. 같은 날에는 같은 질문 (날짜로 고른다) */
  const PROMPTS = [
    '오늘 이 프로젝트에서 한 일 중 가장 기억에 남는 건 뭐였나요?',
    '최근에 가장 오래 고민한 문제는 뭐였나요? 어떻게 풀었는지도 들려주세요.',
    '최근에 팀원에게 설명하거나 설득한 일이 있었나요?',
    '처음 계획과 다르게 바뀐 게 있었다면 무엇이었고, 왜 바뀌었나요?',
    '숫자로 말할 수 있는 변화가 있었나요? 시간, 횟수, 비율 같은 것도 좋아요.',
    '새로 배워서 바로 써먹은 게 있나요?',
    '실수했던 일과, 그다음에 어떻게 했는지 들려주세요.',
    '누군가에게 도움을 받거나 준 일이 있었나요?',
  ];
  const seedOf = (t) => [...String(t)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  function dailyQuestion(projectId, day) {
    const open = S.cardsOf(projectId).filter((e) => missingOf(e).length);
    if (open.length) {
      const e = open[seedOf(day) % open.length]; const f = missingOf(e)[0];
      return { card: e.id, stage: f, text: `「${e.title}」 카드의 ${josa(LABEL[f], '이', '가')} 아직 비어 있어요. ${window.SEED.followups[f][0]}` };
    }
    return { card: null, stage: null, text: PROMPTS[seedOf(day + projectId) % PROMPTS.length] };
  }
  // 오늘 질문이 아직 없으면 남긴다 → 남겼으면 true
  function askToday(chat) {
    const day = S.localDay(); if (!chat || !chat.daily || chat.msgs.some((m) => m.daily === day)) return false;
    const q = dailyQuestion(chat.projectId, day);
    S.addMsg(chat.id, Object.assign({ who: 'ai', daily: day }, q)); if (q.card) S.setFocus(chat.id, q.card);
    return true;
  }
  // 오늘의 질문에 답했는가 (오늘 그 방에 말을 남겼는가)
  const answeredToday = (chat) => !!chat && chat.msgs.some((m) => m.who === 'me' && String(m.at || '').startsWith(S.localDay()));

  App.chat = { opening, respond, decide, askToday, answeredToday, cardState, missingOf, githubMsg, wantsGithub, GH_TITLE, LABEL, STAGES };
})(window.App);
