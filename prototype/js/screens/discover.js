/* 경험 하나 끝까지 정리하기 (깊은 대화) — AI가 상황→과제→행동→결과→배운 점 순서로 꼬리질문을 하며 경험을 끌어내고,
   실시간으로 경험 페이지 초안을 채운다. 질문함의 대화방 안에 붙는다 (따로 된 화면은 없다).
   대화가 끝나거나(저장·그만하기·나중에) 방을 떠나면 경험 위키에 반영하고, 반영 결과(App.wiki.reportHTML)를 보여 준다.

   App.deep.mount(el, {
     exp?, stage?,                 // 이 경험을 이어서 다듬기 (stage: 그 칸부터)
     kw?, seed?, free?, cat?,      // 옛 #/discover 파라미터 그대로 (seed='onboarding' 이면 첫 경험 흐름)
     projectId?,                   // 어느 프로젝트 이야기인지
     answer?, question?,           // 대화방에서 이미 한 말 → 첫 답변으로 초안에 넣고 다시 묻지 않는다
     ask?,                         // 첫 질문을 이걸로 (질문함의 질문)
     threadId?, questionId?,       // 이 대화를 남길 대화방(thread). 없으면 첫 답변 때 새로 만든다
     historyHTML?,                 // 대화창 맨 위에 보여 줄 이 방의 지난 대화
     onThread?(id), onPersist?({ expId, entryId, threadId, firstAnswer }), onDone?(entry), onExit?()
   }) → cleanup()
   #/discover?... 는 옛 주소 → #/ask/new?mode=deep&... 로 넘긴다 */
(function (App) {
  const esc = (s) => App.ui.esc(s);

  const STAGES = [
    { key: 'situation', short: 'S', label: '상황', ph: '어떤 상황이었는지 답하면 여기에 채워져요' },
    { key: 'task', short: 'T', label: '과제', ph: '내가 맡은 역할·목표가 여기에 정리돼요' },
    { key: 'action', short: 'A', label: '행동', ph: '내가 실제로 한 행동과 판단이 들어가요' },
    { key: 'result', short: 'R', label: '결과', ph: '달라진 점, 숫자로 말할 수 있는 성과' },
    { key: 'insight', short: 'L', label: '배운 점', ph: '이 경험이 나에게 남긴 것' },
  ];
  const ORDER = STAGES.map((s) => s.key);
  const STAGE = Object.fromEntries(STAGES.map((s) => [s.key, s]));
  const QUOTA = { situation: 2, task: 1, action: 2, result: 1, insight: 1 };
  const INSIGHT_POOL = [
    '이 경험을 통해 배운 점이나 달라진 점이 있다면 무엇인가요?',
    '다시 그 상황으로 돌아간다면 무엇을 다르게 해보고 싶어요?',
    '그 경험 이후 당신이 다르게 하게 된 것이 있나요?',
  ];
  const STAGE_INTRO = {
    task: '이제 그 안에서 당신이 맡은 몫을 살펴볼게요.',
    action: '여기가 제일 중요해요. 당신이 실제로 한 행동을 꺼내 볼게요.',
    result: '거의 다 왔어요! 그래서 어떻게 됐는지 볼까요?',
    insight: '마지막이에요. 이 경험이 남긴 걸 정리해 볼게요.',
  };
  // 이미 채워진 칸을 다듬을 때 쓰는 질문 (더 구체적으로 / 근거 / 수치)
  const REFINE = {
    situation: ['처음 듣는 면접관도 그려지게, 언제·어디서·누구와였는지 조금 더 알려 줄래요?', '그때 왜 그게 문제였어요? 그대로 두면 어떻게 됐을까요?'],
    task: ['그 안에서 당신만 맡았던 몫은 정확히 뭐였어요?', '목표를 숫자나 기준으로 말할 수 있었나요? (예: 언제까지, 얼마나)'],
    action: ['그 방법을 고른 이유는 뭐였어요? 다른 선택지도 있었나요?', '하는 중에 가장 막혔던 순간과, 그걸 어떻게 넘겼는지 알려 줄래요?', '혼자 한 일과 함께 한 일을 나눠 보면 어떻게 되나요?'],
    result: ['결과를 숫자로 말할 수 있을까요? (시간, 비율, 횟수, 금액 등)', '팀원·고객·상사의 반응은 어땠어요?', '그 결과가 이후에도 이어졌나요? (규칙이 됐다, 다른 곳에도 적용됐다 등)'],
    insight: ['그 경험 이후 실제로 다르게 하게 된 행동이 있나요?', '지원하는 직무에서 이 배움을 어떻게 써먹을 수 있을까요?'],
  };
  const ACKS = ['그렇군요.', '좋아요, 그림이 그려져요.', '오, 구체적이에요!', '고마워요. 조금만 더 들어가 볼게요.', '흥미로운데요?'];
  const EMPATHY = ['괜찮아요, 오래된 일은 흐릿한 게 당연해요.', '그럴 수 있어요. 정확하지 않아도 돼요.', '천천히 해도 괜찮아요. 떠오르는 조각만 있어도 충분해요.'];
  const CAT_HINTS = [
    ['아르바이트', ['알바', '아르바이트', '카페', '편의점', '매장', '손님']],
    ['프로젝트', ['프로젝트', '개발', '서비스', '앱', '배포']],
    ['동아리', ['동아리', '스터디', '모임', '학회']],
    ['수업·과제', ['과제', '수업', '팀플', '교수', '발표']],
    ['인턴·직장', ['인턴', '회사', '직장', '상사', '업무']],
    ['대외활동', ['공모전', '해커톤', '봉사', '서포터즈', '대외활동']],
  ];

  const today = () => new Date().toISOString().slice(0, 10);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const firstSentence = (t, n) => {
    const s = String(t || '').trim().split(/[.!?\n]/)[0].trim();
    return s.length > n ? s.slice(0, n).trim() + '…' : s;
  };
  function guessCategory(text) {
    for (const [cat, words] of CAT_HINTS) if (words.some((w) => text.includes(w))) return cat;
    return null;
  }
  function hasNum(t) { return /\d/.test(t || ''); }
  const clone = (o) => JSON.parse(JSON.stringify(o));
  // 프로젝트 이름: 「모여봄」 처럼 짧게
  const projLabel = (p) => (p.title.match(/「[^」]+」/) || [p.title.split(' — ')[0]])[0];
  const projectsSorted = () => App.store.projects().filter((p) => p.status === 'ongoing').concat(App.store.projects().filter((p) => p.status !== 'ongoing'));

  // 옛 주소: #/discover?kw=… → #/ask/new?mode=deep&kw=…
  App.screens.discover = {
    title: '질문함',
    render() { return '<div class="page"></div>'; },
    mount() {
      const qs = (location.hash.split('?')[1] || '');
      const p = new URLSearchParams(qs); p.delete('mode');
      const rest = p.toString();
      location.replace('#/ask/new?mode=deep' + (rest ? '&' + rest : ''));
    },
  };

  function mountDeep(root, opts = {}) {
      const params = Object.assign({}, opts, { project: opts.projectId || opts.project || '' });
      root.classList.add('dc-root', 'dc-embed');
      let alive = true;
      let threadBase = null; // 이 방(thread)에 원래 있던 메시지 수 — 그 뒤에 이번 대화를 붙인다
      let session = 0; // 새 대화를 시작하거나 화면을 떠나면 증가 → 진행 중이던 AI 응답(think)을 무효화
      const S = {};

      /* ---------- draft helpers ---------- */
      const field = (key) => (key === 'insight' ? S.d.insights : S.d.star[key]) || '';
      const setField = (key, v) => { if (key === 'insight') S.d.insights = v; else S.d.star[key] = v; };
      const filled = (key) => !!field(key).trim();
      const allKw = () => S.d.keywords.concat(S.d.suggested.filter((k) => !S.d.keywords.includes(k)));
      function autoSummary() {
        const a = firstSentence(S.d.star.situation, 46);
        const b = firstSentence(S.d.star.action, 40);
        return [a, b].filter(Boolean).join(' → ');
      }
      const asExp = () => ({ star: S.d.star, insights: S.d.insights, summary: S.d.summary || autoSummary(), keywords: allKw() });
      const comp = () => App.ai.completeness(asExp());

      function blankDraft() {
        return {
          id: null, title: '', titleSource: null, category: '일상', status: 'draft',
          star: { situation: '', task: '', action: '', result: '' }, insights: '', summary: '',
          keywords: [], suggested: [], dismissed: [], qa: [], codeRefs: [],
        };
      }

      /* ================= PICKER ================= */
      function showPicker(opts = {}) {
        session++;
        const P = window.SEED.recallPrompts;
        const cats = window.SEED.categories;
        const activeCat = opts.cat || '';
        // 어느 프로젝트 이야기인지: '' = AI가 대화에서 찾기, 'none' = 프로젝트 밖 경험, 그 외 = 프로젝트 id
        const proj = opts.projectId && opts.projectId !== 'none' ? App.store.getProject(opts.projectId) : null;
        const projChoice = proj ? proj.id : opts.projectId === 'none' ? 'none' : '';
        const projects = projectsSorted();
        const list = P.map((p, i) => ({ p, i })).filter((x) => !activeCat || x.p.theme === activeCat);
        const user = App.store.state.user;
        const drafts = App.store.list().filter((e) => e.status === 'draft');
        const recallCards = list.length
          ? list.map(({ p, i }) => `
            <button class="dc-seed" data-seed="${i}">
              <span class="dc-seed-theme">${esc(p.theme)}</span>
              <span class="dc-seed-text">${esc(p.text)}</span>
              <span class="dc-seed-go">이 질문으로 시작 <span aria-hidden="true">→</span></span>
            </button>`).join('')
          : `<button class="dc-seed" data-custom-seed="${esc(activeCat)}">
              <span class="dc-seed-theme">${esc(activeCat)}</span>
              <span class="dc-seed-text">${esc(activeCat)}에서 "이건 기억에 남는다" 싶은 순간이 있나요?</span>
              <span class="dc-seed-go">이 질문으로 시작 <span aria-hidden="true">→</span></span>
            </button>`;

        const projSeed = proj ? `
            <button class="dc-seed dc-seed-proj" data-project-seed="${esc(proj.id)}">
              <span class="dc-seed-theme">▤ ${esc(projLabel(proj))}</span>
              <span class="dc-seed-text">${esc(projectFirstQ(proj))}</span>
              <span class="dc-seed-go">이 질문으로 시작 <span aria-hidden="true">→</span></span>
            </button>` : '';
        root.innerHTML = `
          <div class="dc-picker">
            ${opts.onboarding ? `<div class="dc-welcome"><span class="ai-dot">R</span><div><b>환영해요, ${esc(user.name)}님!</b> 첫 경험을 AI와 대화하며 기록해 볼까요? 거창한 경험이 아니어도 괜찮아요.</div></div>` : ''}
            <div class="dc-picker-head">
              <div class="ai-badge"><span class="ai-dot">R</span>AI와 대화하며 기록</div>
              <h1>어떤 경험부터 떠올려 볼까요?</h1>
              <p>질문 하나에 답하다 보면 경험이 저절로 정리돼요. 마음에 드는 질문을 골라 주세요.</p>
            </div>

            ${projects.length ? `<div class="dc-proj">
              <div class="dc-proj-q">어느 프로젝트 이야기인가요?</div>
              <div class="dc-cats">
                <button class="dc-cat-chip ${!projChoice ? 'is-on' : ''}" data-proj="">잘 모르겠어요 <span class="dc-proj-hint">AI가 찾기</span></button>
                ${projects.map((p) => `<button class="dc-cat-chip ${projChoice === p.id ? 'is-on' : ''}" data-proj="${esc(p.id)}">▤ ${esc(projLabel(p))}</button>`).join('')}
                <button class="dc-cat-chip ${projChoice === 'none' ? 'is-on' : ''}" data-proj="none">프로젝트 밖 경험</button>
              </div>
            </div>` : ''}

            <div class="dc-cats" role="tablist">
              <button class="dc-cat-chip ${!activeCat ? 'is-on' : ''}" data-cat="">전체</button>
              ${cats.map((c) => `<button class="dc-cat-chip ${activeCat === c ? 'is-on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}
            </div>

            <div class="dc-seeds">${projSeed}${recallCards}</div>

            <div class="card dc-free">
              <div class="dc-free-title">✍️ 이미 생각난 경험이 있어요</div>
              <p class="subtle">한 줄이면 충분해요. 예) 카페 알바에서 메뉴 준비 순서를 바꾼 일</p>
              <form class="dc-free-row" id="dc-free-form">
                <input class="input" id="dc-free-input" maxlength="80" placeholder="어떤 경험인지 짧게 적어 주세요" autocomplete="off" />
                <button class="btn btn-primary" type="submit">시작하기</button>
              </form>
            </div>

            ${drafts.length ? `<a class="dc-to-vault" href="#/vault">작성 중인 경험 ${drafts.length}개는 <b>경험 위키</b>에서 이어서 채울 수 있어요 →</a>` : ''}
          </div>`;
        S.picker = { cat: activeCat, onboarding: !!opts.onboarding, projectId: projChoice };
        const input = root.querySelector('#dc-free-input');
        root.querySelector('#dc-free-form').addEventListener('submit', (ev) => {
          ev.preventDefault();
          const v = input.value.trim();
          if (!v) { input.focus(); App.ui.toast('어떤 경험인지 한 줄만 적어 주세요'); return; }
          startChat({ type: 'free', text: v, cat: activeCat, projectId: projChoice });
        });
      }
      function projectFirstQ(p) {
        return `${projLabel(p)}에서 ${p.role ? `'${p.role}' 역할을 맡으며 ` : ''}가장 오래 붙잡고 있었던 문제는 무엇이었나요?`;
      }

      /* ================= CHAT ================= */
      function startChat(src) {
        session++;
        Object.assign(S, {
          d: blankDraft(), src, stage: 'situation', asked: {}, idx: {}, altTurn: 0,
          currentQ: '', busy: false, wrap: false, answers: 0, kwCooldown: 0, crossedHalf: false, sheet: false,
          startComp: 0, initialQa: 0, edits: [],
          // 프로젝트: 'set' = 사용자가 골랐음, 'auto' = 반영할 때 대화에서 찾기
          projectId: null, projectMode: 'auto',
          mergeChecked: false, mergeInto: null, pendingTarget: null, merged: false,
          dirty: false, finished: false, codeOffered: false, entryId: null, baseBefore: undefined,
          threadId: S.threadId || opts.threadId || null,
        });
        if (src.type === 'exp') { S.projectId = src.exp.projectId || null; S.projectMode = src.exp.projectId ? 'set' : 'auto'; }
        else if (src.projectId === 'none') S.projectMode = 'set';
        else if (src.projectId && App.store.getProject(src.projectId)) { S.projectId = src.projectId; S.projectMode = 'set'; }
        ORDER.forEach((k) => { S.asked[k] = 0; S.idx[k] = 0; });

        let intro = '', firstQ = '', firstStage = 'situation';
        if (src.type === 'exp') {
          const e = src.exp;
          Object.assign(S.d, {
            id: e.id, title: e.title, titleSource: 'user', category: e.category, status: e.status,
            star: Object.assign({ situation: '', task: '', action: '', result: '' }, JSON.parse(JSON.stringify(e.star || {}))),
            insights: e.insights || '', summary: e.summary || '', keywords: (e.keywords || []).slice(), qa: JSON.parse(JSON.stringify(e.qa || [])),
            codeRefs: (e.codeRefs || []).slice(),
          });
          S.initialQa = S.d.qa.length;
          let g = App.ai.gapQuestion(e);
          if (src.stage && STAGE[src.stage]) {
            const F = window.SEED.followups;
            g = { stage: src.stage, text: src.stage === 'insight' ? '이 경험 이후 당신이 다르게 하게 된 것이 있나요?' : F[src.stage][0] };
          }
          intro = `「${esc(e.title)}」 경험 페이지를 이어서 채워 볼게요. 지금 완성도는 <b>${App.ai.completeness(e)}%</b>예요.`;
          if (src.ask && !src.answer) {
            // 질문함의 질문으로 시작 (그 질문이 겨냥한 칸부터)
            const st = src.stage && STAGE[src.stage] ? src.stage : g ? g.stage : 'situation';
            g = { stage: st, text: src.ask };
          }
          const cur = src.stage && STAGE[src.stage] ? (src.stage === 'insight' ? e.insights : (e.star || {})[src.stage]) : '';
          if (cur && cur.trim()) {
            // 이미 채운 칸을 다듬기
            const pool = REFINE[src.stage];
            firstStage = src.stage; firstQ = pool[0]; S.idx[firstStage] = 1;
            intro = `「${esc(e.title)}」의 <b>${STAGE[src.stage].label}</b> 부분을 다듬어 볼게요. 지금은 이렇게 적혀 있어요.
              <blockquote class="dc-cur">${esc(cur)}</blockquote>
              <span class="dc-sub">답변은 기존 내용 뒤에 덧붙여요. 통째로 바꾸고 싶으면 답변 아래 <b>이 답변으로 바꾸기</b>를 누르거나, 오른쪽 초안에서 직접 고쳐도 돼요.</span>`;
          } else if (g) {
            firstStage = g.stage; firstQ = g.text;
            intro += src.ask && !src.answer ? ` <b>${STAGE[g.stage].label}</b> 부분부터 물어볼게요.` : ` 비어 있는 <b>${STAGE[g.stage].label}</b> 부분부터 물어볼게요.`;
          } else {
            firstStage = 'action'; firstQ = REFINE.action[0];
            intro += ` 빈 칸은 없어요. 행동의 이유부터 한 번 더 깊게 파 볼게요. 다른 부분을 다듬고 싶으면 위 단계(${STAGES.map((x) => x.label).join('·')})를 눌러 골라 주세요.`;
          }
          if (!(cur && cur.trim())) S.idx[firstStage] = 1;
        } else if (src.type === 'seed') {
          const p = window.SEED.recallPrompts[src.index];
          S.d.category = p.theme;
          S.seedIndex = src.index;
          intro = '좋아요, 이 질문으로 시작해 볼게요. 떠오르는 장면을 편하게 적어 주세요. 정리는 제가 할게요.';
          firstQ = p.text;
        } else if (src.type === 'free') {
          S.d.title = src.text; S.d.titleSource = 'user';
          S.d.category = guessCategory(src.text) || src.cat || '일상';
          intro = `「${esc(src.text)}」 이야기군요! 하나씩 꺼내 볼게요.`;
          firstQ = window.SEED.followups.situation[1];
          S.idx.situation = 2;
        } else if (src.type === 'custom') {
          S.d.category = src.cat || '일상';
          intro = '좋아요, 이 질문으로 시작해 볼게요. 떠오르는 장면을 편하게 적어 주세요.';
          firstQ = src.text;
        } else if (src.type === 'room') {
          S.d.category = guessCategory(src.answer || '') || src.cat || '일상';
        }
        // 대화방에서 이미 한 말 → 첫 답변으로 초안에 넣는다 (다시 묻지 않는다)
        if (src.answer) {
          const text = String(src.answer).trim();
          const f = App.wiki.inferField ? App.wiki.inferField(text, src.question || '', src.stage || null) : 'situation';
          const stage = f === 'insights' ? 'insight' : STAGE[f] ? f : 'situation';
          S.d.qa.push({ q: src.question || '(대화방에서 한 이야기)', a: text, date: today(), source: 'chat', seeded: true });
          const prev = field(stage).trim();
          setField(stage, prev ? prev + ' ' + text : text);
          if (!S.d.title.trim()) { S.d.title = firstSentence(text, 28); S.d.titleSource = 'ai'; }
          S.asked[stage] = (S.asked[stage] || 0) + 1; S.answers++;
          acceptKeywords(text);
          if (src.type !== 'exp' || !firstQ) {
            // 비어 있는 첫 칸부터 (상황에 넣었으면 상황을 한 번 더 파고든다)
            firstStage = stage === 'situation' && S.asked.situation < QUOTA.situation ? 'situation' : (ORDER.find((k) => !stageSatisfied(k)) || 'action');
            firstQ = nextQText(firstStage);
          }
          intro = src.type === 'exp'
            ? `「${esc(S.d.title)}」 경험 페이지를 이어서 채워 볼게요. 방금 한 이야기는 초안의 <b>${STAGE[stage].label}</b> 칸에 넣어 뒀어요.`
            : `방금 한 이야기를 바탕으로 이 경험을 끝까지 정리해 볼게요. 이미 말한 건 초안의 <b>${STAGE[stage].label}</b> 칸에 넣어 뒀어요.
              <blockquote class="dc-cur">${esc(text)}</blockquote>`;
        }
        const proj = S.projectId && App.store.getProject(S.projectId);
        if (proj) S.d.category = '프로젝트';
        // 고른 프로젝트의 맥락(이름·역할)을 첫 질문에 같이 보여 준다
        const ctx = proj && src.type !== 'exp' ? `▤ ${esc(projLabel(proj))}${proj.role ? ` · ${esc(proj.role)}` : ''} 이야기로 기록할게요` : '';
        S.stage = firstStage;
        S.startComp = comp();
        renderChatShell();
        renderDraft();
        updateMeta();
        const sid = session;
        (async () => {
          if (!(await typing(500, sid))) return;
          addAi(`<div class="dc-ack">${intro}</div>`);
          if (!(await typing(800, sid))) return;
          ask(firstQ, firstStage, '', ctx);
          focusInput();
        })();
      }

      function renderChatShell() {
        root.innerHTML = `
          <div class="dc-layout" id="dc-layout">
            <section class="card dc-chat">
              <header class="dc-chat-head">
                <ol class="dc-stepper" id="dc-stepper"></ol>
                <button class="dc-draft-toggle" data-act="sheet" type="button"><span>경험 초안</span><b id="dc-toggle-pct">0%</b></button>
              </header>
              <div class="dc-msgs" id="dc-msgs" aria-live="polite">${opts.historyHTML ? `<div class="dc-history"><div class="dc-history-cap">이 방에서 나눈 대화</div>${opts.historyHTML}</div>` : ''}</div>
              <div class="dc-composer">
                <div class="dc-input-wrap">
                  <textarea id="dc-input" class="dc-input" rows="1" placeholder="${window.matchMedia('(max-width: 480px)').matches ? '편하게 적어 주세요' : '편하게 적어 주세요. 한두 문장이면 충분해요'}"></textarea>
                  <button class="btn btn-primary dc-send" id="dc-send" data-act="send" type="button" aria-label="보내기">↑</button>
                </div>
                <div class="dc-escapes">
                  <button class="dc-esc" data-act="forgot" type="button">🤔 기억이 잘 안 나요</button>
                  <button class="dc-esc" data-act="skip" type="button">⏭ 이 질문 건너뛰기</button>
                  <button class="dc-esc dc-esc-stop" data-act="stop" type="button">✋ 오늘은 여기까지</button>
                  <span class="dc-kbd">Enter 보내기 · Shift+Enter 줄바꿈</span>
                </div>
              </div>
            </section>
            <aside class="dc-draft-pane" id="dc-draft-pane"><div class="card dc-draft" id="dc-draft"></div></aside>
            <div class="dc-backdrop" data-act="sheet"></div>
          </div>`;
        const input = root.querySelector('#dc-input');
        input.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter' && !ev.shiftKey && !ev.isComposing && ev.keyCode !== 229) { ev.preventDefault(); send(); }
        });
        input.addEventListener('input', () => { autoGrow(input, 140); syncBusy(); });
        syncBusy();
      }

      function renderStepper() {
        const el = root.querySelector('#dc-stepper'); if (!el) return;
        el.innerHTML = STAGES.map((s, i) => {
          const done = filled(s.key);
          const cur = !S.wrap && S.stage === s.key;
          return `<li class="dc-step ${done ? 'is-done' : ''} ${cur ? 'is-current' : ''}">
            <button type="button" class="dc-step-btn" data-act="goto" data-stage="${s.key}" title="${s.label} 부분 이야기하기">
            <span class="dc-step-dot">${done ? '✓' : i + 1}</span><span class="dc-step-label">${s.label}</span></button></li>`;
        }).join('');
      }

      function renderDraft() {
        const el = root.querySelector('#dc-draft'); if (!el) return;
        const d = S.d;
        const c = comp();
        const sug = d.suggested.filter((k) => !d.keywords.includes(k));
        el.innerHTML = `
          <div class="dc-draft-head">
            <span class="ai-badge"><span class="ai-dot">R</span>실시간 경험 페이지</span>
            <span class="dc-live"><i></i>답변할 때마다 채워져요</span>
            <button class="btn btn-ghost btn-sm dc-sheet-close" data-act="sheet" type="button">닫기</button>
          </div>
          <div class="dc-title-wrap">
            <input class="dc-title" id="dc-title" value="${esc(d.title)}" placeholder="제목은 첫 답변에서 자동으로 제안해 드려요" maxlength="60" />
            ${d.titleSource === 'ai' ? '<span class="dc-ai-mini">AI 제안</span>' : ''}
          </div>
          <div class="dc-meta-row">
            <select class="dc-cat" id="dc-cat" aria-label="경험 유형">
              ${window.SEED.categories.map((cat) => `<option ${cat === d.category ? 'selected' : ''}>${esc(cat)}</option>`).join('')}
            </select>
            <select class="dc-cat dc-proj-sel" id="dc-proj" aria-label="어느 프로젝트 이야기인가요?">
              <option value="">${S.projectMode === 'set' ? '프로젝트 밖 경험' : '프로젝트: AI가 찾기'}</option>
              ${projectsSorted().map((p) => `<option value="${esc(p.id)}" ${S.projectId === p.id ? 'selected' : ''}>▤ ${esc(projLabel(p))}</option>`).join('')}
            </select>
            ${App.ui.statusTag(d.status)}
            <span class="dc-qa-count">답변 ${d.qa.length - S.initialQa}개</span>
          </div>
          <div class="dc-comp">
            <div class="dc-comp-top"><span>완성도</span><b id="dc-comp-num">${c}%</b></div>
            <div id="dc-comp-bar">${App.ui.progress(c)}</div>
          </div>
          <div class="dc-fields">
            ${STAGES.map((s) => `
              <div class="dc-field ${filled(s.key) ? 'is-filled' : ''} ${!S.wrap && S.stage === s.key ? 'is-current' : ''}" data-field="${s.key}">
                <div class="dc-field-label"><span class="dc-field-letter">${s.short}</span>${s.label}
                  ${!S.wrap && S.stage === s.key ? '<span class="dc-now">지금 채우는 중</span>' : ''}</div>
                <textarea class="dc-field-ta" data-ta="${s.key}" rows="1" placeholder="${esc(s.ph)}">${esc(field(s.key))}</textarea>
              </div>`).join('')}
          </div>
          <div class="dc-kws">
            <div class="dc-kws-head">역량 키워드</div>
            <div class="dc-kw-list">
              ${d.keywords.length ? d.keywords.map((k) => `<span class="dc-kw" data-kwgroup="acc">${App.ui.keywordChip(k, { removable: true })}</span>`).join('') : ''}
              ${sug.length ? `<span class="dc-ai-label">AI 추천</span>${sug.map((k) => `<span class="dc-kw" data-kwgroup="sug" title="눌러서 확정">${App.ui.keywordChip(k, { ai: true, clickable: true, removable: true })}</span>`).join('')}` : ''}
              ${!d.keywords.length && !sug.length ? '<span class="subtle">답변 속에서 역량 키워드를 찾아 드릴게요</span>' : ''}
            </div>
            ${sug.length ? '<div class="dc-kw-tip">점선은 AI 추천이에요. 누르면 확정, ×로 뺄 수 있어요.</div>' : ''}
          </div>
          <div class="dc-draft-foot">
            <button class="btn btn-primary dc-save" data-act="save" type="button">${d.id ? '이 경험에 반영하기' : '위키에 반영하기'}</button>
            <p class="subtle">질문과 답변 원문은 경험 페이지의 출처에 그대로 남아요.</p>
          </div>`;
        el.querySelectorAll('.dc-field-ta').forEach((ta) => autoGrow(ta, 400));
        el.querySelector('#dc-title').addEventListener('input', (ev) => {
          S.d.title = ev.target.value; S.d.titleSource = 'user'; S.dirty = true;
          const m = el.querySelector('.dc-ai-mini'); if (m) m.remove();
        });
        el.querySelector('#dc-cat').addEventListener('change', (ev) => { S.d.category = ev.target.value; S.dirty = true; });
        el.querySelector('#dc-proj').addEventListener('change', (ev) => {
          S.projectId = ev.target.value || null; S.projectMode = 'set'; S.dirty = true;
          if (S.projectId) S.d.category = '프로젝트';
          renderDraft(); updateMeta();
        });
        el.querySelectorAll('.dc-field-ta').forEach((ta) => ta.addEventListener('input', () => {
          setField(ta.dataset.ta, ta.value); autoGrow(ta, 400); S.dirty = true;
          ta.closest('.dc-field').classList.toggle('is-filled', !!ta.value.trim());
          updateMeta();
        }));
      }

      function updateMeta() {
        const c = comp();
        const n = root.querySelector('#dc-comp-num'); if (n) n.textContent = c + '%';
        const b = root.querySelector('#dc-comp-bar'); if (b) b.innerHTML = App.ui.progress(c);
        const t = root.querySelector('#dc-toggle-pct'); if (t) t.textContent = c + '%';
        renderStepper();
      }

      function flashField(key) {
        const f = root.querySelector(`.dc-field[data-field="${key}"]`); if (!f) return;
        f.classList.remove('dc-flash'); void f.offsetWidth; f.classList.add('dc-flash');
        const pane = root.querySelector('#dc-draft-pane');
        if (!S.sheet && pane && getComputedStyle(pane).position !== 'fixed') {
          if (pane && pane.scrollHeight > pane.clientHeight) pane.scrollTo({ top: f.offsetTop - 120, behavior: 'smooth' });
        }
        const tg = root.querySelector('.dc-draft-toggle');
        if (tg) { tg.classList.remove('dc-pulse'); void tg.offsetWidth; tg.classList.add('dc-pulse'); }
      }

      /* ---------- messages ---------- */
      function msgs() { return root.querySelector('#dc-msgs'); }
      function scrollDown() { const m = msgs(); if (m) m.scrollTo({ top: m.scrollHeight, behavior: 'smooth' }); }
      function addEl(html) {
        const m = msgs(); if (!m) return null;
        const w = document.createElement('div'); w.innerHTML = html.trim();
        const el = w.firstChild; m.appendChild(el); scrollDown(); return el;
      }
      function addAi(inner) { return addEl(`<div class="dc-msg dc-ai"><span class="ai-dot">R</span><div class="dc-bubble">${inner}</div></div>`); }
      function addUser(text, meta) { return addEl(`<div class="dc-msg dc-user ${meta ? 'dc-user-meta' : ''}"><div class="dc-bubble">${esc(text)}</div></div>`); }
      function addNote(inner) { return addEl(`<div class="dc-note"><span class="dc-note-ico">✦</span><span>${inner}</span></div>`); }
      async function typing(ms, sid) {
        S.busy = true; syncBusy();
        const el = addEl('<div class="dc-msg dc-ai dc-typing-msg"><span class="ai-dot">R</span><div class="dc-bubble"><span class="dc-typing"><i></i><i></i><i></i></span></div></div>');
        await App.ai.think(ms);
        if (el) el.remove();
        if (!alive || sid !== session) return false;
        S.busy = false; syncBusy();
        return true;
      }
      function ask(text, stage, ack, ctx) {
        S.currentQ = text; S.stage = stage; S.wrap = false;
        const st = STAGE[stage];
        addAi(`${ack ? `<div class="dc-ack">${ack}</div>` : ''}
          ${ctx ? `<div class="dc-ctx">${ctx}</div>` : ''}
          <div class="dc-stage-pill"><b>${st.short}</b>${st.label}</div>
          <div class="dc-q">${esc(text)}</div>`);
        renderDraft(); updateMeta();
      }
      function syncBusy() {
        const input = root.querySelector('#dc-input'); if (!input) return;
        const sendBtn = root.querySelector('#dc-send');
        if (sendBtn) sendBtn.disabled = S.busy || !input.value.trim();
        root.querySelectorAll('.dc-esc').forEach((b) => {
          const act = b.dataset.act;
          b.disabled = S.busy || (S.wrap && act !== 'stop');
        });
      }
      function focusInput() {
        const i = root.querySelector('#dc-input');
        if (i && window.matchMedia('(min-width: 901px)').matches) i.focus();
      }
      function autoGrow(el, max) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, max) + 'px'; }

      /* ---------- flow ---------- */
      function nextQText(stage) {
        const i = S.idx[stage]++;
        if (S.src.type === 'exp' && filled(stage)) return REFINE[stage][i % REFINE[stage].length];
        if (stage === 'insight') return INSIGHT_POOL[i % INSIGHT_POOL.length];
        return App.ai.nextQuestion({ stage, turn: i }).text;
      }
      function stageSatisfied(key) { return key === 'result' ? hasNum(field('result')) : filled(key); }
      function nextStage(from) {
        for (let i = ORDER.indexOf(from) + 1; i < ORDER.length; i++) if (!stageSatisfied(ORDER[i])) return ORDER[i];
        return null;
      }
      async function advance(ack, sid) {
        const ns = nextStage(S.stage);
        if (!(await typing(650 + Math.random() * 400, sid))) return;
        if (!ns) { showWrap(ack); return; }
        const intro = STAGE_INTRO[ns];
        ask(nextQText(ns), ns, [ack, intro].filter(Boolean).join(' '));
      }
      function showWrap(ack) {
        S.wrap = true; S.currentQ = '';
        if (S.src.type === 'exp') {
          // 기존 경험 다듬기 → 반영하거나 다른 칸을 골라 계속
          addAi(`${ack ? `<div class="dc-ack">${ack}</div>` : ''}
            <div class="dc-q">이 부분은 꽤 단단해졌어요. 지금 위키에 반영할까요?</div>
            <div class="dc-sub">다른 부분도 다듬고 싶으면 골라 주세요. 그냥 이어서 적으면 가장 얇은 칸에 덧붙일게요.</div>
            <div class="dc-inline-acts">
              <button class="btn btn-primary btn-sm" data-act="save" type="button">이 경험에 반영하기</button>
              ${STAGES.map((x) => `<button class="btn btn-sm" data-act="goto" data-stage="${x.key}" type="button">${x.label}</button>`).join('')}
            </div>`);
          renderDraft(); updateMeta(); syncBusy();
          offerCode();
          return;
        }
        addAi(`${ack ? `<div class="dc-ack">${ack}</div>` : ''}
          <div class="dc-q">와, 상황부터 배운 점까지 한 바퀴 다 돌았어요! 지금 경험 위키에 반영해 둘까요?</div>
          <div class="dc-sub">더 이야기하고 싶다면 계속 적어도 좋아요. 가장 얇은 부분을 더 물어볼게요.</div>
          <div class="dc-inline-acts">
            <button class="btn btn-primary btn-sm" data-act="save" type="button">위키에 반영하기</button>
            <button class="btn btn-sm" data-act="more" type="button">조금 더 이야기할래요</button>
          </div>`);
        renderDraft(); updateMeta(); syncBusy();
        offerCode();
      }

      /* ---------- 코드 분석과 잇기: 이 프로젝트에 아직 이야기가 없는 코드 발견이 있으면 한 번만 물어본다 ---------- */
      function codeCandidate() {
        resolveProject();
        const p = S.projectId && App.store.getProject(S.projectId);
        const fs = ((p && p.repo && p.repo.findings) || []).filter((f) => f.status !== 'dismissed'
          && App.wiki.cardsForFinding(f.id).length === 0 && !(S.d.codeRefs || []).includes(f.id));
        if (!fs.length) return null;
        const text = convoText().toLowerCase();
        const score = (f) => String(f.title + ' ' + (f.tags || []).join(' ')).toLowerCase().split(/[\s·,()/]+/).filter((w) => w.length >= 2 && text.includes(w)).length;
        return fs.map((f) => ({ f, sc: score(f) })).sort((a, b) => b.sc - a.sc)[0].f;
      }
      function offerCode() {
        if (S.codeOffered) return;
        const f = codeCandidate(); if (!f) return;
        S.codeOffered = true;
        addAi(`<div class="dc-q">코드에서 「${esc(App.wiki.short(f.title, 40))}」도 찾았어요. 이 경험과 관련 있나요?</div>
          <div class="dc-sub">관련 있다면 이 코드를 경험의 근거로 붙여 둘게요. 이력서·면접에서 같이 쓸 수 있어요.</div>
          <div class="dc-inline-acts" data-code-acts>
            <button class="btn btn-primary btn-sm" data-act="code-yes" data-finding="${esc(f.id)}" type="button">네, 관련 있어요</button>
            <button class="btn btn-sm" data-act="code-no" type="button">아니에요</button>
          </div>`);
      }

      function acceptKeywords(text) {
        const found = App.ai.extractKeywords(text);
        const fresh = found.filter((k) => !S.d.keywords.includes(k) && !S.d.suggested.includes(k) && !S.d.dismissed.includes(k));
        S.d.suggested.push(...fresh);
        return fresh;
      }

      function send() {
        const input = root.querySelector('#dc-input');
        const text = input.value.trim();
        if (!text || S.busy) return;
        input.value = ''; autoGrow(input, 140);
        addUser(text);
        const sid = session;
        const before = comp();

        if (S.wrap) {
          // 마무리 후 추가 이야기 → 가장 얇은 칸에 덧붙임
          S.stage = weakestStage(); S.wrap = false;
        }
        const stage = S.stage;
        S.d.qa.push({ q: S.currentQ || '(자유롭게 덧붙인 이야기)', a: text, date: today(), source: 'chat' });
        S.dirty = true;
        const prev = field(stage).trim();
        setField(stage, prev ? prev + ' ' + text : text);
        if (prev) {
          // 기존 내용이 있던 칸 → 덧붙임. 바꾸기/되돌리기 선택지를 준다
          const eid = 'ed' + (S.edits.length);
          S.edits.push({ stage, prev, text, state: 'appended' });
          addEl(`<div class="dc-edit" data-edit="${eid}"><span>↳ <b>${STAGE[stage].label}</b>에 덧붙였어요</span>
            <button type="button" class="dc-edit-btn" data-act="edit-replace" data-edit-id="${eid}">이 답변으로 바꾸기</button>
            <button type="button" class="dc-edit-btn" data-act="edit-undo" data-edit-id="${eid}">되돌리기</button></div>`);
        }
        if (!S.d.title.trim()) {
          S.d.title = firstSentence(text, 28); S.d.titleSource = 'ai';
          const gc = guessCategory(text); if (gc && S.src.type !== 'seed') S.d.category = gc;
        }
        S.answers++; S.asked[stage]++;
        writeThread();
        const fresh = acceptKeywords(text);
        renderDraft(); updateMeta(); flashField(stage);

        // 격려 메시지 (가끔)
        const after = comp();
        let note = '';
        S.kwCooldown = Math.max(0, S.kwCooldown - 1);
        if (fresh.length && S.kwCooldown === 0) {
          note = `좋아요! 방금 답변에서 ${fresh.slice(0, 2).map((k) => App.ui.keywordChip(k, { ai: true })).join(' ')} 역량이 보여요`;
          S.kwCooldown = 2;
        } else if (stage === 'result' && hasNum(text)) {
          note = '숫자가 들어가니 훨씬 설득력 있어요 👍';
        } else if (!S.crossedHalf && before < 50 && after >= 50) {
          note = '경험 페이지가 벌써 절반 넘게 채워졌어요. 이 페이스 좋아요!';
        }
        if (after >= 50) S.crossedHalf = true;

        const ack = text.length > 120 ? '자세히 적어 줘서 고마워요!' : text.length < 10 ? '짧아도 괜찮아요.' : pick(ACKS);
        (async () => {
          if (note) {
            await App.ai.think(350);
            if (!alive || sid !== session) return;
            addNote(note);
          }
          if (S.asked[stage] >= QUOTA[stage]) { await advance(ack, sid); }
          else {
            if (!(await typing(700 + Math.random() * 400, sid))) return;
            ask(nextQText(stage), stage, ack);
          }
          focusInput();
        })();
      }

      // 사용자가 다룰 칸을 직접 고르기 (단계 표시를 눌러서)
      function gotoStage(stage) {
        if (!STAGE[stage] || S.busy || (!S.wrap && S.stage === stage && S.currentQ)) return;
        addUser(`${STAGE[stage].label} 부분을 이야기할래요`, true);
        const cur = field(stage).trim();
        const sid = session;
        (async () => {
          if (!(await typing(600, sid))) return;
          const ack = cur
            ? `좋아요, <b>${STAGE[stage].label}</b> 부분을 다듬어 볼게요. 지금은 이렇게 적혀 있어요.<blockquote class="dc-cur">${esc(cur)}</blockquote>`
            : `좋아요, 비어 있는 <b>${STAGE[stage].label}</b>부터 채워 볼게요.`;
          ask(nextQText(stage), stage, ack);
          focusInput();
        })();
      }
      function applyEdit(eid, mode) {
        const i = Number(String(eid).slice(2)); const ed = S.edits[i]; if (!ed || ed.state !== 'appended') return;
        const curVal = field(ed.stage);
        const appended = ed.prev + ' ' + ed.text;
        // 덧붙인 뒤 사용자가 초안을 직접 고쳤으면 해당 부분만 바꾼다
        if (mode === 'replaced') setField(ed.stage, curVal.includes(appended) ? curVal.replace(appended, ed.text) : ed.text);
        else setField(ed.stage, curVal.includes(appended) ? curVal.replace(appended, ed.prev) : curVal.replace(' ' + ed.text, ''));
        ed.state = mode; S.dirty = true;
        const box = root.querySelector(`[data-edit="${eid}"]`);
        if (box) box.innerHTML = mode === 'replaced' ? `<span>↳ <b>${STAGE[ed.stage].label}</b> 칸을 이 답변으로 바꿨어요</span>` : `<span>↳ <b>${STAGE[ed.stage].label}</b> 칸은 원래대로 두었어요 <span class="subtle">(답변은 원문 기록에 남아요)</span></span>`;
        renderDraft(); updateMeta(); flashField(ed.stage);
      }

      function weakestStage() {
        let best = 'action', len = Infinity;
        ['situation', 'task', 'action', 'result'].forEach((k) => { const l = field(k).trim().length; if (l < len) { len = l; best = k; } });
        return best;
      }

      function onForgot() {
        if (S.busy || S.wrap) return;
        addUser('기억이 잘 안 나요', true);
        const sid = session;
        const fresh = S.src.type === 'seed' && S.stage === 'situation' && !filled('situation');
        (async () => {
          if (!(await typing(800, sid))) return;
          if (fresh) {
            const P = window.SEED.recallPrompts;
            S.seedIndex = (S.seedIndex + 1) % P.length;
            const p = P[S.seedIndex];
            S.d.category = p.theme; renderDraft();
            ask(p.text, 'situation', '괜찮아요! 바로 떠오르지 않는 게 당연해요. 그럼 이 질문은 어때요?');
          } else {
            const q = App.ai.nextQuestion({ stage: S.stage, turn: S.altTurn++, alt: true }).text;
            ask(q, S.stage, pick(EMPATHY));
          }
          focusInput();
        })();
      }

      function onSkip() {
        if (S.busy || S.wrap) return;
        addUser('이 질문은 건너뛸게요', true);
        const sid = session;
        (async () => { await advance('좋아요, 넘어갈게요.', sid); focusInput(); })();
      }

      function onStop() {
        if (S.busy) return;
        const n = sessionAnswers();
        if (!n && !S.d.id) {
          App.ui.modal({
            title: '오늘은 여기까지 할까요?',
            body: '<p>아직 반영할 답변이 없어요. 괜찮아요, 다음에 오늘의 질문으로 먼저 말 걸게요.</p>',
            confirmText: '나가기', cancelText: '조금 더 할래요',
            onConfirm: () => { if (opts.onExit) opts.onExit(); else App.navigate('#/ask'); },
          });
          return;
        }
        const c = comp();
        const done = STAGES.filter((s) => filled(s.key));
        App.ui.modal({
          title: '오늘은 여기까지 할까요?',
          body: `
            <div class="dc-sum">
              <p>오늘 이야기한 내용을 경험 위키에 반영해 둘게요. 언제든 이어서 채울 수 있어요.</p>
              <div class="dc-sum-stats">
                <div><b>${n}</b><span>답변</span></div>
                <div><b>${done.length}/5</b><span>채운 칸</span></div>
                <div><b>${c}%</b><span>완성도</span></div>
              </div>
              <div class="dc-sum-steps">${STAGES.map((s) => `<span class="${filled(s.key) ? 'on' : ''}">${s.label}</span>`).join('')}</div>
              ${allKw().length ? `<div class="dc-sum-kws">${allKw().map((k) => App.ui.keywordChip(k)).join('')}</div>` : ''}
            </div>`,
          confirmText: '반영하고 마치기', cancelText: '조금 더 할래요',
          onConfirm: () => { save(); },
        });
      }

      /* ---------- 위키에 반영 ---------- */
      const sessionAnswers = () => S.d.qa.length - S.initialQa;
      // 이번 대화에서 나온 이야기 (매칭·프로젝트 찾기에 쓴다)
      const convoText = () => [S.d.title].concat(S.d.qa.slice(S.initialQa).map((x) => x.a)).join(' ');
      function resolveProject() {
        if (S.projectMode !== 'auto' || S.projectId) return;
        const p = App.wiki.detectProject(convoText());
        if (p) { S.projectId = p.id; S.d.category = '프로젝트'; }
      }
      // 새 대화를 처음 반영할 때, 이미 있는 경험과 같은 이야기 같으면 먼저 물어본다
      function withTarget(cb) {
        if (S.pendingTarget) { App.ui.toast('먼저 위에서 같은 이야기인지 골라 주세요'); scrollDown(); return; }
        if (S.d.id || S.mergeChecked || S.src.type === 'exp' || sessionAnswers() === 0) { cb(); return; }
        S.mergeChecked = true;
        resolveProject();
        const m = App.wiki.match(convoText(), { projectId: S.projectId });
        if (m.confidence !== 'high' || !m.best) { cb(); return; }
        S.pendingTarget = cb;
        const t = esc(App.wiki.short(m.best.title, 30));
        addAi(`<div class="dc-q">「${t}」와 같은 이야기 같아요. 거기에 반영할까요?</div>
          <div class="dc-sub">같은 이야기는 한 페이지에 모아 두어야 이력서·면접에서 근거가 흩어지지 않아요.</div>
          <div class="dc-inline-acts" data-merge-acts>
            <button class="btn btn-primary btn-sm" data-act="merge-yes" data-exp-id="${esc(m.best.id)}" type="button">「${t}」에 반영</button>
            <button class="btn btn-sm" data-act="merge-no" type="button">새 경험으로</button>
          </div>`);
      }
      const joinText = (a, b) => { a = String(a || '').trim(); b = String(b || '').trim(); return !b || a.includes(b) ? a : a ? a + ' ' + b : b; };
      // 대화 초안을 기존 경험 페이지에 합친다. 이후 대화는 그 페이지를 이어서 채운다
      function mergeInto(e) {
        const d = S.d;
        S.baseBefore = clone(e); S.merged = true;
        const newQa = d.qa.slice(S.initialQa);
        const star = {};
        ['situation', 'task', 'action', 'result'].forEach((k) => { star[k] = joinText(e.star[k], d.star[k]); });
        const kws = e.keywords.concat(allKw().filter((k) => !e.keywords.includes(k))).slice(0, Math.max(5, e.keywords.length));
        App.store.update(e.id, {
          star, insights: joinText(e.insights, d.insights), summary: e.summary || d.summary || autoSummary(), keywords: kws,
          qa: (e.qa || []).concat(newQa), codeRefs: [...new Set((e.codeRefs || []).concat(d.codeRefs || []))],
          projectId: e.projectId || S.projectId || null,
        });
        const u = App.store.get(e.id);
        Object.assign(d, {
          id: u.id, title: u.title, titleSource: 'user', category: u.category, status: u.status, star: clone(u.star), insights: u.insights || '',
          summary: u.summary || '', keywords: u.keywords.slice(), suggested: [], qa: clone(u.qa), codeRefs: (u.codeRefs || []).slice(),
        });
        S.initialQa = u.qa.length - newQa.length;
        S.projectId = u.projectId || null; S.projectMode = u.projectId ? 'set' : S.projectMode; S.mergeInto = null;
        if (root.querySelector('#dc-draft')) { renderDraft(); updateMeta(); }
        return u.id;
      }

      function persist() {
        const d = S.d;
        resolveProject();
        const proj = S.projectId && App.store.getProject(S.projectId);
        const last = d.qa.length > S.initialQa ? d.qa[d.qa.length - 1] : null;
        let id = d.id && App.store.get(d.id) ? d.id : null;
        if (!id && S.mergeInto && App.store.get(S.mergeInto)) id = mergeInto(App.store.get(S.mergeInto));
        else {
          const cur = id ? App.store.get(id) : null;
          const data = {
            title: d.title.trim() || '제목 없는 경험', category: d.category,
            star: d.star, insights: d.insights, summary: d.summary || autoSummary(),
            keywords: allKw(), qa: d.qa, projectId: S.projectId || null,
            codeRefs: [...new Set(((cur && cur.codeRefs) || []).concat(d.codeRefs || []))],
          };
          if (cur) { if (S.baseBefore === undefined) S.baseBefore = clone(cur); App.store.update(id, data); }
          else {
            S.baseBefore = null;
            const e = App.store.create(Object.assign({ status: 'draft', role: proj ? proj.role || '' : '' }, data));
            d.id = id = e.id;
          }
        }
        // 한 번의 대화는 변경 기록 하나로: 앞서 남긴 기록을 지우고, 대화 전 상태를 기준으로 다시 남긴다
        const log = App.store.state.wikiLog || [];
        const i = S.entryId ? log.findIndex((w) => w.id === S.entryId && !w.undone) : -1;
        if (i >= 0) log.splice(i, 1);
        const entry = App.wiki.recordEdit('chat', id, S.baseBefore, { text: last ? last.a : '', question: last ? last.q : '' });
        S.entryId = entry ? entry.id : i >= 0 ? null : S.entryId;
        // 이 대화의 원문도 같은 대화방(thread)에 남긴다 — 저장할 때마다 이번 대화분으로 다시 맞춘다
        const t = writeThread(id);
        if (t) App.wiki.closeThread(t.id, { kind: 'applied', expId: id, entryId: S.entryId || null });
        S.dirty = false;
        const first = d.qa.slice(S.initialQa || 0)[0];
        if (opts.onPersist) { try { opts.onPersist({ expId: id, entryId: S.entryId || null, threadId: S.threadId || null, firstAnswer: first ? first.a : '' }); } catch (e) { /* ignore */ } }
        return id;
      }

      /* ---------- 대화방(thread)에 원문 남기기 ----------
         방에 원래 있던 메시지는 그대로 두고, 그 뒤에 이번 깊은 대화(질문·답)를 붙인다. 대화방에서 이미 한 말(seeded)은 다시 적지 않는다.
         appliedId 를 주면 끝에 '반영했어요' 한 줄을 붙인다 */
      function writeThread(appliedId) {
        if (!S.d) return null;
        const turns = S.d.qa.slice(S.initialQa || 0).filter((x) => !x.seeded);
        let t = S.threadId && App.wiki.getThread(S.threadId);
        if (!t && !turns.length && !(appliedId && S.d.qa.length > (S.initialQa || 0))) return null;
        if (!t) {
          t = App.wiki.startThread({ source: 'chat', projectId: S.projectId || null, expId: appliedId || S.d.id || null, questionId: opts.questionId || null });
          S.threadId = t.id; threadBase = 0;
          if (opts.onThread) { try { opts.onThread(t.id); } catch (e) { /* ignore */ } }
        }
        if (threadBase == null) threadBase = t.msgs.length;
        const now = new Date(); const at = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const date = App.store.localDay();
        t.msgs = t.msgs.slice(0, threadBase);
        t.msgs.push({ who: 'ai', text: '✦ 경험 하나 끝까지 정리하기 — 상황→과제→행동→결과→배운 점 순서로 물어볼게요.', at, date });
        turns.forEach((x) => { t.msgs.push({ who: 'ai', text: x.q, at, date }); t.msgs.push({ who: 'me', text: x.a, at, date }); x.threadId = t.id; });
        if (!t.projectId && S.projectId) t.projectId = S.projectId;
        if (appliedId) {
          const ex = App.store.get(appliedId);
          t.msgs.push({ who: 'ai', text: `「${String(ex ? ex.title : '').replace(/[「」]/g, '')}」에 반영했어요.`, at, date });
        } else App.store.touch();
        return t;
      }

      function save() {
        if (S.busy) { App.ui.toast('AI가 질문을 준비 중이에요. 잠시만요!'); return; }
        withTarget(() => { persist(); showDone(); });
      }

      function showDone() {
        session++;
        S.finished = true;
        const entry = S.entryId ? App.wiki.get(S.entryId) : null;
        paintDone(entry);
        root.scrollTop = 0;
        if (opts.onDone) { try { opts.onDone(entry); } catch (e) { /* ignore */ } }
      }

      function paintDone(entry) {
        const id = entry && entry.target ? entry.target : S.d.id;
        const e = id ? App.store.get(id) : null;
        const n = sessionAnswers();
        const undone = !!(entry && entry.undone);
        const head = !entry ? '경험 페이지는 그대로예요'
          : undone ? '위키 반영을 되돌렸어요'
          : entry.decided === 'new' ? '새 경험이 위키에 추가됐어요'
          : entry.decided === 'user' ? '고른 경험으로 옮겼어요'
          : S.merged ? '같은 이야기를 하던 경험에 반영했어요'
          : '경험 페이지가 더 단단해졌어요';
        const delta = e && entry && entry.decided !== 'new' ? e.completeness - S.startComp : 0;
        const g = e && !undone ? App.ai.gapQuestion(e) : null;
        root.innerHTML = `
          <div class="dc-done">
            <div class="dc-done-check" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
            <h1>${head}</h1>
            <p class="dc-done-sub">${undone ? '대화 전 상태로 돌려 두었어요.' : `답변 ${n}개를 위키에 반영했어요.
              ${e ? `「${esc(App.wiki.short(e.title, 30))}」 완성도 <b>${e.completeness}%</b>${delta > 0 ? ` (+${delta}%)` : ''}.` : ''} 언제든 이어서 더 채울 수 있어요.`}</p>
            <div class="dc-done-report">${entry ? App.wiki.reportHTML(entry) : ''}</div>
            ${g ? (() => { const queued = App.store.state.inbox.some((q) => q.targetExpId === e.id && q.status === 'pending');
              return `<div class="dc-done-next"><span class="ai-dot">R</span><div style="flex:1"><div class="dc-done-label">다음에 채우면 좋은 질문</div><div>${esc(g.text)}</div></div>
              ${queued ? '<span class="subtle" style="font-size:12.5px;align-self:center">✓ 오늘의 질문에 있어요</span>' : `<button class="btn btn-sm" data-act="queue-gap" data-stage="${esc(g.stage)}" data-text="${esc(g.text)}" data-exp="${esc(e.id)}" type="button">오늘의 질문으로 받기</button>`}</div>`; })() : ''}
            <div class="dc-done-actions">
              ${!entry && e ? `<a class="btn btn-lg" href="#/card/${esc(e.id)}">경험 페이지 보기</a>` : ''}
              ${opts.onExit ? '<button class="btn btn-primary btn-lg" data-act="exit" type="button">대화방으로 돌아가기</button>' : ''}
              <button class="btn btn-lg" data-act="another" type="button">다른 경험 정리하기</button>
            </div>
          </div>`;
        App.wiki.bindReport(root.querySelector('.dc-done-report'), (ne) => paintDone(ne || entry));
      }

      /* ---------- events ---------- */
      function onClick(ev) {
        const t = ev.target;
        // 키워드 칩
        const x = t.closest('[data-remove-kw]');
        if (x && root.contains(x) && S.d) {
          const k = x.getAttribute('data-remove-kw');
          S.d.keywords = S.d.keywords.filter((v) => v !== k);
          S.d.suggested = S.d.suggested.filter((v) => v !== k);
          if (!S.d.dismissed.includes(k)) S.d.dismissed.push(k);
          renderDraft(); updateMeta(); return;
        }
        const sug = t.closest('[data-kwgroup="sug"]');
        if (sug && S.d) {
          const k = sug.querySelector('[data-kw]').getAttribute('data-kw');
          if (!S.d.keywords.includes(k)) S.d.keywords.push(k);
          renderDraft(); updateMeta(); App.ui.toast(`#${k} 키워드를 확정했어요`); return;
        }
        const seed = t.closest('[data-seed]');
        const pickedProj = S.picker ? S.picker.projectId : '';
        if (seed) { startChat({ type: 'seed', index: Number(seed.dataset.seed), projectId: pickedProj }); return; }
        const pseed = t.closest('[data-project-seed]');
        if (pseed) {
          const p = App.store.getProject(pseed.dataset.projectSeed);
          if (p) startChat({ type: 'custom', cat: '프로젝트', projectId: p.id, text: projectFirstQ(p) });
          return;
        }
        const cseed = t.closest('[data-custom-seed]');
        if (cseed) {
          const cat = cseed.dataset.customSeed;
          startChat({ type: 'custom', cat, projectId: pickedProj, text: `${cat}에서 "이건 기억에 남는다" 싶은 순간이 있나요?` }); return;
        }
        const projBtn = t.closest('[data-proj]');
        if (projBtn && S.picker) { showPicker({ cat: S.picker.cat, onboarding: S.picker.onboarding, projectId: projBtn.dataset.proj }); return; }
        const cat = t.closest('[data-cat]');
        if (cat && S.picker) { showPicker({ cat: cat.dataset.cat, onboarding: S.picker.onboarding, projectId: S.picker.projectId }); return; }

        const actEl = t.closest('[data-act]');
        if (!actEl || actEl.disabled) return;
        const act = actEl.dataset.act;
        if (act === 'send') send();
        else if (act === 'forgot') onForgot();
        else if (act === 'skip') onSkip();
        else if (act === 'stop') onStop();
        else if (act === 'save') save();
        else if (act === 'another') App.navigate('#/ask/new?mode=deep');
        else if (act === 'exit') { if (opts.onExit) opts.onExit(); }
        else if (act === 'queue-gap') {
          App.store.pushQuestion({ type: 'deepen', targetExpId: actEl.dataset.exp, stage: actEl.dataset.stage, text: actEl.dataset.text, hint: '답하면 이 경험의 비어 있는 칸이 채워져요.' });
          actEl.outerHTML = '<span class="subtle" style="font-size:12.5px;align-self:center">✓ 오늘의 질문에 있어요</span>';
          App.ui.toast('오늘의 질문으로 보냈어요');
        }
        else if (act === 'goto') gotoStage(actEl.dataset.stage);
        else if (act === 'merge-yes' || act === 'merge-no') {
          const cb = S.pendingTarget; S.pendingTarget = null;
          const box = actEl.closest('[data-merge-acts]'); if (box) box.remove();
          if (act === 'merge-yes') { S.mergeInto = actEl.dataset.expId; addUser('네, 거기에 반영할래요', true); }
          else addUser('새 경험으로 할래요', true);
          if (cb) cb();
        } else if (act === 'code-yes' || act === 'code-no') {
          const box = actEl.closest('[data-code-acts]'); if (box) box.remove();
          if (act === 'code-yes') {
            const fid = actEl.dataset.finding;
            if (!S.d.codeRefs.includes(fid)) S.d.codeRefs.push(fid);
            S.dirty = true;
            addUser('네, 관련 있어요', true);
            addNote('이 코드를 경험의 근거로 붙여 둘게요. 위키에 반영할 때 함께 연결돼요.');
          } else addUser('관련 없어요', true);
        }
        else if (act === 'edit-replace' || act === 'edit-undo') applyEdit(actEl.dataset.editId, act === 'edit-replace' ? 'replaced' : 'undone');
        else if (act === 'sheet') {
          S.sheet = !S.sheet;
          const l = root.querySelector('#dc-layout'); if (l) l.classList.toggle('is-sheet-open', S.sheet);
          if (S.sheet) root.querySelectorAll('.dc-field-ta').forEach((ta) => autoGrow(ta, 400));
        } else if (act === 'more') {
          actEl.closest('.dc-inline-acts').remove();
          const st = weakestStage(); const sid = session;
          (async () => {
            if (!(await typing(600, sid))) return;
            ask(nextQText(st), st, `좋아요! 지금 가장 얇은 ${STAGE[st].label} 부분을 조금 더 채워 볼게요.`);
            focusInput();
          })();
        }
      }
      root.addEventListener('click', onClick);

      /* ---------- entry ---------- */
      const extra = { answer: opts.answer || '', question: opts.question || '', ask: opts.ask || '' };
      if (params.exp) {
        const e = App.store.get(params.exp);
        if (e) startChat(Object.assign({ type: 'exp', exp: e, stage: params.stage }, extra));
        else { App.ui.toast('경험을 찾을 수 없어요. 새 경험부터 떠올려 볼까요?'); showPicker(); }
      } else if (extra.answer) {
        startChat({ type: 'room', answer: extra.answer, question: extra.question, cat: params.cat || '', projectId: params.project || '' });
      } else if (extra.ask) {
        startChat({ type: 'custom', cat: params.cat || '일상', projectId: params.project || '', text: extra.ask });
      } else if (params.seed != null && params.seed !== '' && params.seed !== 'onboarding' && window.SEED.recallPrompts[Number(params.seed)]) {
        startChat({ type: 'seed', index: Number(params.seed), projectId: params.project || '' });
      } else if (params.free && params.free.trim()) {
        startChat({ type: 'free', text: params.free.trim().slice(0, 80), cat: params.cat || '', projectId: params.project || '' });
      } else if (params.seed === 'onboarding' && App.store.state.user.firstSeed && (App.store.state.user.firstSeed.text || '').trim()) {
        const fs = App.store.state.user.firstSeed;
        startChat({ type: 'free', text: fs.text.trim(), cat: (fs.categories || [])[0] || '', projectId: params.project || '' });
      } else if (params.project && App.store.getProject(params.project) && !params.kw) {
        const p = App.store.getProject(params.project);
        startChat({ type: 'custom', cat: '프로젝트', projectId: p.id, text: projectFirstQ(p) });
      } else if (params.kw) {
        const k = App.keywords.get(params.kw);
        startChat({ type: 'custom', cat: params.cat || '일상', projectId: params.project || '', text: `#${k.name} 역량이 드러났던 순간을 찾아볼게요. ${k.desc ? '"' + k.desc + '"' : ''} — 아주 작은 일이라도 비슷한 장면이 떠오르나요?` });
      } else {
        showPicker({ projectId: params.project || '', onboarding: params.seed === 'onboarding', cat: params.cat || (params.seed === 'onboarding' && App.store.state.user.firstSeed ? (App.store.state.user.firstSeed.categories || [])[0] || '' : '') });
      }

      return () => {
        alive = false; session++;
        root.removeEventListener('click', onClick);
        // 대화 중에 떠나도 답변은 잃지 않는다: 작성 중인 경험으로 위키에 반영
        if (S.d && !S.finished && S.dirty && (sessionAnswers() > 0 || S.d.id)) {
          try { S.pendingTarget = null; persist(); App.ui.toast('나눈 이야기는 작성 중인 경험으로 위키에 반영해 뒀어요'); } catch (e) { /* noop */ }
        }
        root.innerHTML = '';
        root.classList.remove('dc-root', 'dc-embed');
      };
  }

  App.deep = { mount: mountDeep };
})(window.App);
