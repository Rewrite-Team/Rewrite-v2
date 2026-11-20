/* 집중 발굴 — "앉은 자리에서" AI가 꼬리질문으로 경험을 끌어내고, 실시간으로 카드 초안을 채운다. */
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

  App.screens.discover = {
    title: '집중 발굴',
    render() {
      return '<div class="page dc-page"><div class="dc-root" id="dc-root"></div></div>';
    },
    mount(screenEl, params) {
      const root = screenEl.querySelector('#dc-root');
      let alive = true;
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
          keywords: [], suggested: [], dismissed: [], qa: [],
        };
      }

      /* ================= PICKER ================= */
      function showPicker(opts = {}) {
        session++;
        const P = window.SEED.recallPrompts;
        const cats = window.SEED.categories;
        const activeCat = opts.cat || '';
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

        root.innerHTML = `
          <div class="dc-picker">
            ${opts.onboarding ? `<div class="dc-welcome"><span class="ai-dot">R</span><div><b>환영해요, ${esc(user.name)}님!</b> 첫 경험 카드를 함께 만들어 볼까요? 거창한 경험이 아니어도 괜찮아요.</div></div>` : ''}
            <div class="dc-picker-head">
              <div class="ai-badge"><span class="ai-dot">R</span>집중 발굴</div>
              <h1>어떤 경험부터 떠올려 볼까요?</h1>
              <p>질문 하나에 답하다 보면 경험이 저절로 정리돼요. 마음에 드는 질문을 골라 주세요.</p>
            </div>

            <div class="dc-cats" role="tablist">
              <button class="dc-cat-chip ${!activeCat ? 'is-on' : ''}" data-cat="">전체</button>
              ${cats.map((c) => `<button class="dc-cat-chip ${activeCat === c ? 'is-on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}
            </div>

            <div class="dc-seeds">${recallCards}</div>

            <div class="card dc-free">
              <div class="dc-free-title">✍️ 이미 생각난 경험이 있어요</div>
              <p class="subtle">한 줄이면 충분해요. 예) 카페 알바에서 메뉴 준비 순서를 바꾼 일</p>
              <form class="dc-free-row" id="dc-free-form">
                <input class="input" id="dc-free-input" maxlength="80" placeholder="어떤 경험인지 짧게 적어 주세요" autocomplete="off" />
                <button class="btn btn-primary" type="submit">시작하기</button>
              </form>
            </div>

            ${drafts.length ? `<a class="dc-to-vault" href="#/vault">작성 중인 카드 ${drafts.length}개는 <b>경험 보관함</b>에서 이어서 채울 수 있어요 →</a>` : ''}
          </div>`;
        S.picker = { cat: activeCat, onboarding: !!opts.onboarding };
        const input = root.querySelector('#dc-free-input');
        root.querySelector('#dc-free-form').addEventListener('submit', (ev) => {
          ev.preventDefault();
          const v = input.value.trim();
          if (!v) { input.focus(); App.ui.toast('어떤 경험인지 한 줄만 적어 주세요'); return; }
          startChat({ type: 'free', text: v, cat: activeCat });
        });
      }

      /* ================= CHAT ================= */
      function startChat(src) {
        session++;
        Object.assign(S, {
          d: blankDraft(), src, stage: 'situation', asked: {}, idx: {}, altTurn: 0,
          currentQ: '', busy: false, wrap: false, answers: 0, kwCooldown: 0, crossedHalf: false, sheet: false,
          startComp: 0, initialQa: 0, edits: [],
        });
        ORDER.forEach((k) => { S.asked[k] = 0; S.idx[k] = 0; });

        let intro = '', firstQ = '', firstStage = 'situation';
        if (src.type === 'exp') {
          const e = src.exp;
          Object.assign(S.d, {
            id: e.id, title: e.title, titleSource: 'user', category: e.category, status: e.status,
            star: Object.assign({ situation: '', task: '', action: '', result: '' }, JSON.parse(JSON.stringify(e.star || {}))),
            insights: e.insights || '', summary: e.summary || '', keywords: (e.keywords || []).slice(), qa: JSON.parse(JSON.stringify(e.qa || [])),
          });
          S.initialQa = S.d.qa.length;
          let g = App.ai.gapQuestion(e);
          if (src.stage && STAGE[src.stage]) {
            const F = window.SEED.followups;
            g = { stage: src.stage, text: src.stage === 'insight' ? '이 경험 이후 당신이 다르게 하게 된 것이 있나요?' : F[src.stage][0] };
          }
          intro = `「${esc(e.title)}」 카드를 이어서 채워 볼게요. 지금 완성도는 <b>${App.ai.completeness(e)}%</b>예요.`;
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
            intro += ` 비어 있는 <b>${STAGE[g.stage].label}</b> 부분부터 물어볼게요.`;
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
        }
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
          ask(firstQ, firstStage);
          focusInput();
        })();
      }

      function renderChatShell() {
        root.innerHTML = `
          <div class="dc-layout" id="dc-layout">
            <section class="card dc-chat">
              <header class="dc-chat-head">
                <ol class="dc-stepper" id="dc-stepper"></ol>
                <button class="dc-draft-toggle" data-act="sheet" type="button"><span>카드 초안</span><b id="dc-toggle-pct">0%</b></button>
              </header>
              <div class="dc-msgs" id="dc-msgs" aria-live="polite"></div>
              <div class="dc-composer">
                <div class="dc-input-wrap">
                  <textarea id="dc-input" class="dc-input" rows="1" placeholder="${window.matchMedia('(max-width: 480px)').matches ? '편하게 적어 주세요' : '편하게 적어 주세요. 한두 문장이면 충분해요'}"></textarea>
                  <button class="btn btn-primary dc-send" id="dc-send" data-act="send" type="button" aria-label="보내기">↑</button>
                </div>
                <div class="dc-escapes">
                  <button class="dc-esc" data-act="forgot" type="button">🤔 기억이 잘 안 나요</button>
                  <button class="dc-esc" data-act="skip" type="button">⏭ 이 질문 건너뛰기</button>
                  <button class="dc-esc" data-act="later" type="button">🔔 나중에 다시 물어봐 줘</button>
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
            <span class="ai-badge"><span class="ai-dot">R</span>실시간 카드 초안</span>
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
            <button class="btn btn-primary dc-save" data-act="save" type="button">${d.id ? '카드에 저장하기' : '카드로 저장하기'}</button>
            <p class="subtle">질문과 답변 원문은 카드의 ‘원문 기록’에 그대로 보관돼요.</p>
          </div>`;
        el.querySelectorAll('.dc-field-ta').forEach((ta) => autoGrow(ta, 400));
        el.querySelector('#dc-title').addEventListener('input', (ev) => {
          S.d.title = ev.target.value; S.d.titleSource = 'user';
          const m = el.querySelector('.dc-ai-mini'); if (m) m.remove();
        });
        el.querySelector('#dc-cat').addEventListener('change', (ev) => { S.d.category = ev.target.value; });
        el.querySelectorAll('.dc-field-ta').forEach((ta) => ta.addEventListener('input', () => {
          setField(ta.dataset.ta, ta.value); autoGrow(ta, 400);
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
        if (!S.sheet && window.matchMedia('(min-width: 901px)').matches) {
          const pane = root.querySelector('#dc-draft-pane');
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
      function ask(text, stage, ack) {
        S.currentQ = text; S.stage = stage; S.wrap = false;
        const st = STAGE[stage];
        addAi(`${ack ? `<div class="dc-ack">${ack}</div>` : ''}
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
          // 기존 카드 다듬기 → 저장하거나 다른 칸을 골라 계속
          addAi(`${ack ? `<div class="dc-ack">${ack}</div>` : ''}
            <div class="dc-q">이 부분은 꽤 단단해졌어요. 지금 카드에 저장할까요?</div>
            <div class="dc-sub">다른 부분도 다듬고 싶으면 골라 주세요. 그냥 이어서 적으면 가장 얇은 칸에 덧붙일게요.</div>
            <div class="dc-inline-acts">
              <button class="btn btn-primary btn-sm" data-act="save" type="button">카드에 저장하기</button>
              ${STAGES.map((x) => `<button class="btn btn-sm" data-act="goto" data-stage="${x.key}" type="button">${x.label}</button>`).join('')}
            </div>`);
          renderDraft(); updateMeta(); syncBusy();
          return;
        }
        addAi(`${ack ? `<div class="dc-ack">${ack}</div>` : ''}
          <div class="dc-q">와, 상황부터 배운 점까지 한 바퀴 다 돌았어요! 지금 카드로 저장해 둘까요?</div>
          <div class="dc-sub">더 이야기하고 싶다면 계속 적어도 좋아요. 가장 얇은 부분을 더 물어볼게요.</div>
          <div class="dc-inline-acts">
            <button class="btn btn-primary btn-sm" data-act="save" type="button">카드로 저장하기</button>
            <button class="btn btn-sm" data-act="more" type="button">조금 더 이야기할래요</button>
          </div>`);
        renderDraft(); updateMeta(); syncBusy();
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
        S.d.qa.push({ q: S.currentQ || '(자유롭게 덧붙인 이야기)', a: text, date: today() });
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
          note = '카드가 벌써 절반 넘게 채워졌어요. 이 페이스 좋아요!';
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
        ed.state = mode;
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

      function onLater() {
        if (S.busy || S.wrap || !S.currentQ) return;
        addUser('나중에 다시 물어봐 줘', true);
        const hasContent = S.answers > 0 || !!S.d.id;
        const id = hasContent ? persist() : null;
        App.store.pushQuestion({
          text: S.currentQ, type: id ? 'deepen' : 'recall', targetExpId: id,
          hint: '집중 발굴에서 잠시 미뤄둔 질문이에요. 한두 줄이면 충분해요.',
        });
        App.ui.toast('오늘의 질문으로 보내둘게요');
        const sid = session;
        (async () => {
          await advance('알겠어요, 이 질문은 오늘의 질문으로 보내둘게요. 편할 때 한두 줄만 답해 주세요. 다른 걸 물어볼게요.', sid);
          focusInput();
        })();
      }

      function onStop() {
        if (S.busy) return;
        const n = S.d.qa.length - S.initialQa;
        if (!n && !S.d.id) {
          App.ui.modal({
            title: '오늘은 여기까지 할까요?',
            body: '<p>아직 저장할 답변이 없어요. 괜찮아요, 다음에 오늘의 질문으로 먼저 말 걸게요.</p>',
            confirmText: '나가기', cancelText: '조금 더 할래요',
            onConfirm: () => { App.navigate('#/home'); },
          });
          return;
        }
        const c = comp();
        const done = STAGES.filter((s) => filled(s.key));
        App.ui.modal({
          title: '오늘은 여기까지 할까요?',
          body: `
            <div class="dc-sum">
              <p>오늘 이야기한 내용을 카드에 저장해 둘게요. 언제든 이어서 채울 수 있어요.</p>
              <div class="dc-sum-stats">
                <div><b>${n}</b><span>답변</span></div>
                <div><b>${done.length}/5</b><span>채운 칸</span></div>
                <div><b>${c}%</b><span>완성도</span></div>
              </div>
              <div class="dc-sum-steps">${STAGES.map((s) => `<span class="${filled(s.key) ? 'on' : ''}">${s.label}</span>`).join('')}</div>
              ${allKw().length ? `<div class="dc-sum-kws">${allKw().map((k) => App.ui.keywordChip(k)).join('')}</div>` : ''}
            </div>`,
          confirmText: '저장하고 마치기', cancelText: '조금 더 할래요',
          onConfirm: () => { save(); },
        });
      }

      function persist() {
        const d = S.d;
        const data = {
          title: d.title.trim() || '제목 없는 경험', category: d.category,
          star: d.star, insights: d.insights, summary: d.summary || autoSummary(),
          keywords: allKw(), qa: d.qa,
        };
        if (d.id && App.store.get(d.id)) App.store.update(d.id, data);
        else { const e = App.store.create(Object.assign({ status: 'draft' }, data)); d.id = e.id; }
        return d.id;
      }

      function save() {
        if (S.busy) { App.ui.toast('AI가 질문을 준비 중이에요. 잠시만요!'); return; }
        const id = persist();
        showDone(id);
      }

      function showDone(id) {
        session++;
        const e = App.store.get(id);
        const n = S.d.qa.length - S.initialQa;
        const g = App.ai.gapQuestion(e);
        const delta = e.completeness - S.startComp;
        const updated = S.src.type === 'exp';
        root.innerHTML = `
          <div class="dc-done">
            <div class="dc-done-check" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
            <h1>${updated ? '경험 카드가 더 단단해졌어요' : '경험 카드가 만들어졌어요'}</h1>
            <p class="dc-done-sub">답변 ${n}개로 ${STAGES.filter((s) => filled(s.key)).length}칸을 채웠어요.
              ${delta > 0 ? `완성도가 <b>+${delta}%</b> 올랐어요.` : ''} 언제든 이어서 더 채울 수 있어요.</p>
            <div class="dc-done-card">${App.ui.expCard(e)}</div>
            ${e.keywords.length ? `
            <div class="dc-done-kws">
              <div class="dc-done-label">이번 이야기에서 찾은 역량</div>
              <div class="dc-done-chips">${e.keywords.map((k) => App.ui.keywordChip(k, { size: 'lg' })).join('')}</div>
            </div>` : ''}
            ${g ? `<div class="dc-done-next"><span class="ai-dot">R</span><div><div class="dc-done-label">다음에 이어서 물어볼게요</div><div>${esc(g.text)}</div></div></div>` : ''}
            <div class="dc-done-actions">
              <a class="btn btn-primary btn-lg" href="#/card/${esc(id)}">카드 보기</a>
              <button class="btn btn-lg" data-act="another" type="button">다른 경험 발굴하기</button>
              <a class="btn btn-ghost btn-lg" href="#/home">홈으로</a>
            </div>
          </div>`;
        window.scrollTo(0, 0);
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
        if (seed) { App.navigate('#/discover?seed=' + seed.dataset.seed); return; }
        const cseed = t.closest('[data-custom-seed]');
        if (cseed) {
          const cat = cseed.dataset.customSeed;
          startChat({ type: 'custom', cat, text: `${cat}에서 "이건 기억에 남는다" 싶은 순간이 있나요?` }); return;
        }
        const cat = t.closest('[data-cat]');
        if (cat && S.picker) { showPicker({ cat: cat.dataset.cat, onboarding: S.picker.onboarding }); return; }
        const cont = t.closest('[data-exp]');
        if (cont) { App.navigate('#/discover?exp=' + cont.dataset.exp); return; }

        const actEl = t.closest('[data-act]');
        if (!actEl || actEl.disabled) return;
        const act = actEl.dataset.act;
        if (act === 'send') send();
        else if (act === 'forgot') onForgot();
        else if (act === 'skip') onSkip();
        else if (act === 'later') onLater();
        else if (act === 'stop') onStop();
        else if (act === 'save') save();
        else if (act === 'another') App.navigate('#/discover');
        else if (act === 'goto') gotoStage(actEl.dataset.stage);
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
      if (params.exp) {
        const e = App.store.get(params.exp);
        if (e) startChat({ type: 'exp', exp: e, stage: params.stage });
        else { App.ui.toast('카드를 찾을 수 없어요. 새 경험부터 떠올려 볼까요?'); showPicker(); }
      } else if (params.seed != null && params.seed !== '' && params.seed !== 'onboarding' && window.SEED.recallPrompts[Number(params.seed)]) {
        startChat({ type: 'seed', index: Number(params.seed) });
      } else if (params.free && params.free.trim()) {
        startChat({ type: 'free', text: params.free.trim().slice(0, 80), cat: params.cat || '' });
      } else if (params.kw) {
        const k = App.keywords.get(params.kw);
        startChat({ type: 'custom', cat: params.cat || '일상', text: `#${k.name} 역량이 드러났던 순간을 찾아볼게요. ${k.desc ? '"' + k.desc + '"' : ''} — 아주 작은 일이라도 비슷한 장면이 떠오르나요?` });
      } else if (params.seed === 'onboarding' && App.store.state.user.firstSeed && (App.store.state.user.firstSeed.text || '').trim()) {
        const fs = App.store.state.user.firstSeed;
        startChat({ type: 'free', text: fs.text.trim(), cat: (fs.categories || [])[0] || '' });
      } else {
        showPicker({ onboarding: params.seed === 'onboarding', cat: params.cat || (params.seed === 'onboarding' && App.store.state.user.firstSeed ? (App.store.state.user.firstSeed.categories || [])[0] || '' : '') });
      }

      return () => {
        alive = false; session++;
        root.removeEventListener('click', onClick);
      };
    },
  };
})(window.App);
