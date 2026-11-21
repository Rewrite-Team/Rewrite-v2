/* 온보딩: 6단계 위저드 (환영 → 유형 → 목표 직무 → 질문 리듬 → GitHub 레포(선택) → 첫 기록)
   끝나면 홈으로 간다. 한 줄 첫 기록은 App.capture() 로 위키에 반영하고, AI와의 긴 대화는 선택지로만 둔다. */
(function (App) {
  const esc = (s) => App.ui.esc(s);
  const STEPS = ['환영', '유형', '목표 직무', '질문 리듬', 'GitHub', '첫 기록'];
  const STEP_GH = 4;
  const TYPES = [
    { id: 'newgrad', ico: '🎓', title: '신입 취업 준비', desc: '경험이 평범하거나 부족하다고 느껴요. 쓸 만한 경험부터 찾고 싶어요.' },
    { id: 'switcher', ico: '🔀', title: '직무 전환 준비', desc: '지금까지의 경험을 새 직무의 언어로 다시 해석하고 싶어요.' },
    { id: 'junior', ico: '🚀', title: '주니어 이직 준비', desc: '실무에서 한 기여와 성과를 정리해 두고 싶어요.' },
  ];
  const JOBS = ['백엔드 개발자', '프론트엔드 개발자', '서비스 기획자', 'PM/PO', '데이터 분석가', 'UX/UI 디자이너', '마케터', '영업/고객관리', '인사/HR'];
  const CADENCE = [['daily', '매일'], ['weekdays', '평일만'], ['custom', '직접 고르기']];
  const TIMES = ['08:30', '12:30', '18:00', '21:30', '23:00'];
  const TIME_NOTE = { '08:30': '출근·등교길', '12:30': '점심시간', '18:00': '퇴근길', '21:30': '하루 마무리', '23:00': '자기 전' };
  const DAYS = ['월', '화', '수', '목', '금', '토', '일'];
  const CHANNELS = [['push', '앱 푸시', '🔔'], ['kakao', '카카오톡', '💬'], ['email', '이메일', '✉️']];
  const SEEDS = [
    ['아르바이트', '☕'], ['팀과제', '📚'], ['동아리', '🎸'], ['프로젝트', '💻'], ['대외활동', '🌏'],
    ['인턴·직장', '🏢'], ['일상', '🌱'], ['봉사', '🤝'], ['운동·취미', '🏃'], ['여행', '🧳'],
  ];
  const SEED_Q = {
    '아르바이트': '아르바이트하면서 "이건 좀 비효율적인데?" 싶었던 순간이 있었나요?',
    '팀과제': '팀과제에서 가장 답답했던 순간은 언제였나요?',
    '동아리': '모임이나 동아리에서 맡았던 "공식적이지 않은" 역할이 있나요?',
    '프로젝트': '프로젝트에서 가장 오래 붙잡고 있었던 문제는 무엇이었나요?',
  };

  function initialData() {
    const u = App.store.state.user, s = App.store.state.settings;
    return {
      name: u.name || '', userType: u.userType || 'newgrad', targetJob: u.targetJob || '',
      cadence: s.cadence || 'daily', times: (s.times || ['12:30', '21:30']).slice(), days: (s.days || DAYS).slice(),
      channels: Object.assign({ push: true, kakao: false, email: false }, s.channels || {}),
      seeds: [], seedText: '', repoUrl: '',
    };
  }

  function dots(step) {
    return `<div class="ob-dots" aria-label="진행 단계">${STEPS.map((l, i) =>
      `<span class="ob-dot ${i === step ? 'on' : ''} ${i < step ? 'past' : ''}" title="${esc(l)}"></span>`).join('')}</div>`;
  }

  function stepWelcome() {
    return `<div class="ob-hero">
      <div class="ob-hero-mark">R</div>
      <p class="ob-eyebrow">Rewrite에 오신 걸 환영해요</p>
      <h1 class="ob-title">평범한 경험도<br/>경험이에요.</h1>
      <p class="ob-lead">무엇을 써야 할지 몰라도 괜찮아요. 빈칸을 채우라고 하지 않을게요.<br/>제가 먼저 질문을 드리고, 답변을 나만의 경험 위키로 정리해 드릴게요.</p>
      <ul class="ob-values">
        <li><span class="ob-v-ico">✉</span><div><b>질문이 먼저 와요</b><p>정해진 시간에 질문 1개. 한두 줄이면 충분해요.</p></div></li>
        <li><span class="ob-v-ico">✦</span><div><b>꼬리질문으로 끌어내요</b><p>그때 내가 한 행동과 판단을 상황·과제·행동·결과로 정리해요.</p></div></li>
        <li><span class="ob-v-ico">◎</span><div><b>꺼내 쓰기만 하면 돼요</b><p>위키에 쌓인 경험이 이력서·자소서·면접의 근거가 돼요.</p></div></li>
      </ul>
    </div>`;
  }

  function stepType(d) {
    return `<p class="ob-eyebrow">1분이면 끝나요</p>
      <h2 class="ob-h2">어떻게 불러드릴까요?</h2>
      <input class="input ob-name" data-ob-field="name" maxlength="20" placeholder="이름 또는 닉네임" value="${esc(d.name)}" />
      <h2 class="ob-h2 ob-mt">지금 어떤 준비를 하고 있나요?</h2>
      <p class="ob-sub">유형에 맞춰 질문의 방향을 바꿔 드려요.</p>
      <div class="ob-types">${TYPES.map((t) => `
        <button type="button" class="ob-type ${d.userType === t.id ? 'on' : ''}" data-ob-type="${t.id}">
          <span class="ob-type-ico">${t.ico}</span>
          <span class="ob-type-body"><b>${esc(t.title)}</b><span>${esc(t.desc)}</span></span>
          <span class="ob-radio"></span>
        </button>`).join('')}
      </div>`;
  }

  function stepJob(d) {
    const custom = d.targetJob && !JOBS.includes(d.targetJob);
    return `<p class="ob-eyebrow">목표 직무</p>
      <h2 class="ob-h2">어떤 직무를 목표로 하고 있나요?</h2>
      <p class="ob-sub">경험마다 이 직무와 얼마나 맞닿아 있는지 알려 드려요. 나중에 바꿀 수 있어요.</p>
      <div class="ob-chips">${JOBS.map((j) => `<button type="button" class="ob-chip ${d.targetJob === j ? 'on' : ''}" data-ob-job="${esc(j)}">${esc(j)}</button>`).join('')}</div>
      <label class="label ob-mt">목록에 없다면 직접 적어 주세요</label>
      <input class="input" data-ob-field="targetJob" placeholder="예: 게임 클라이언트 개발자" value="${custom ? esc(d.targetJob) : ''}" />
      <p class="subtle ob-mt-sm">아직 못 정했어도 괜찮아요. 비워 두면 다음 단계로 넘어갈 수 있어요.</p>`;
  }

  function scheduleSentence(d) {
    const times = d.times.slice().sort();
    const when = d.cadence === 'daily' ? '매일' : d.cadence === 'weekdays' ? '평일마다' : (d.days.length ? DAYS.filter((x) => d.days.includes(x)).join('·') + '요일' : '고른 요일');
    if (!times.length) return '시간을 하나 이상 골라 주세요.';
    return `${when} ${times.join(', ')}에 질문 1개씩 보내드릴게요.`;
  }

  function lockscreen(d) {
    const t = d.times.slice().sort()[0] || '12:30';
    const ch = CHANNELS.filter(([id]) => d.channels[id]);
    const first = ch[0] ? ch[0][0] : null;
    const q = '오늘 점심, 누군가에게 도움을 준 순간이 있었나요? 한 줄이면 충분해요.';
    const notif = (id) => {
      if (id === 'kakao') return `<div class="ob-notif ob-notif-kakao"><div class="ob-notif-head"><span class="ob-notif-app ob-app-kakao">K</span>카카오톡 · Rewrite 알림톡<span>지금</span></div><div class="ob-notif-title">[Rewrite] 오늘의 질문이 도착했어요</div><div class="ob-notif-body">${esc(q)}</div></div>`;
      if (id === 'email') return `<div class="ob-notif"><div class="ob-notif-head"><span class="ob-notif-app ob-app-mail">@</span>메일<span>지금</span></div><div class="ob-notif-title">Rewrite · 오늘의 질문</div><div class="ob-notif-body">${esc(q)}</div></div>`;
      return `<div class="ob-notif"><div class="ob-notif-head"><span class="ob-notif-app">R</span>Rewrite<span>지금</span></div><div class="ob-notif-title">오늘의 질문 ✉</div><div class="ob-notif-body">${esc(q)}</div></div>`;
    };
    return `<div class="ob-phone" aria-hidden="true">
      <div class="ob-phone-notch"></div>
      <div class="ob-phone-date">11월 19일 수요일</div>
      <div class="ob-phone-time">${esc(t)}</div>
      <div class="ob-phone-notifs">${first ? ch.slice(0, 2).map(([id]) => notif(id)).join('') : '<div class="ob-notif ob-notif-off">알림 채널을 하나 이상 켜 주세요</div>'}</div>
      <div class="ob-phone-bar"></div>
    </div>`;
  }

  function stepRhythm(d) {
    return `<p class="ob-eyebrow">질문 받는 리듬</p>
      <h2 class="ob-h2">언제 질문을 받으면 좋을까요?</h2>
      <p class="ob-sub">하루 한두 번, 짧은 틈에 답할 수 있는 시간이 좋아요.</p>
      <div class="ob-rhythm">
        <div class="ob-rhythm-form">
          <label class="label">주기</label>
          <div class="ob-seg">${CADENCE.map(([id, l]) => `<button type="button" class="${d.cadence === id ? 'on' : ''}" data-ob-cadence="${id}">${l}</button>`).join('')}</div>
          ${d.cadence === 'custom' ? `<div class="ob-days">${DAYS.map((x) => `<button type="button" class="ob-day ${d.days.includes(x) ? 'on' : ''}" data-ob-day="${x}">${x}</button>`).join('')}</div>` : ''}
          <label class="label ob-mt">시간 <span class="subtle">(여러 개 고를 수 있어요)</span></label>
          <div class="ob-times">${TIMES.map((t) => `<button type="button" class="ob-time ${d.times.includes(t) ? 'on' : ''}" data-ob-time="${t}"><b>${t}</b><span>${TIME_NOTE[t]}</span></button>`).join('')}</div>
          <label class="label ob-mt">받을 곳</label>
          <div class="ob-channels">${CHANNELS.map(([id, l, ico]) => `
            <button type="button" class="ob-channel ${d.channels[id] ? 'on' : ''}" data-ob-channel="${id}"><span>${ico}</span>${l}<span class="ob-check">✓</span></button>`).join('')}
          </div>
          <div class="ob-sentence"><span class="ai-dot">R</span>${esc(scheduleSentence(d))}</div>
        </div>
        ${lockscreen(d)}
      </div>`;
  }

  const seedQuestion = (pick) => SEED_Q[pick] || pick + '에서 가장 기억에 남는 장면 하나를 떠올려 볼까요? 언제, 누구와 함께였나요?';
  function firstQ(d) {
    const pick = d.seeds[0], txt = d.seedText.trim();
    if (!pick && !txt) return '';
    if (txt) return `<div class="ob-firstq"><span class="ai-dot">R</span><div><span class="ob-firstq-label">시작하면 이렇게 돼요</span><p>“${esc(txt)}”를 경험 위키에 기록해요. AI가 비슷한 경험에 보태거나 새 경험 페이지를 만들어요.</p></div></div>`;
    return `<div class="ob-firstq"><span class="ai-dot">R</span><div><span class="ob-firstq-label">첫 오늘의 질문</span><p>${esc(seedQuestion(pick))}</p></div></div>`;
  }

  function stepGithub(d) {
    return `<p class="ob-eyebrow">선택 · 건너뛰어도 돼요</p>
      <h2 class="ob-h2">GitHub 레포가 있나요?</h2>
      <p class="ob-sub">주소를 알려 주면 프로젝트를 만들고 코드를 분석해 드려요. 코드에서 찾은 기술 포인트는 경험의 근거로 붙고, 이야기가 빠진 부분은 오늘의 질문으로 물어볼게요.</p>
      <input class="input" data-ob-field="repoUrl" maxlength="200" inputmode="url" autocomplete="off" spellcheck="false" placeholder="https://github.com/owner/repo" value="${esc(d.repoUrl)}" />
      <p class="subtle ob-mt-sm">없으면 비워 두고 넘어가세요. 나중에 프로젝트 화면에서 언제든 연결할 수 있어요.</p>`;
  }

  function stepSeed(d) {
    return `<p class="ob-eyebrow">첫 기록</p>
      <h2 class="ob-h2">최근에 있었던 일, 한 줄만 적어 볼까요?</h2>
      <p class="ob-sub">대단하지 않아도 돼요. 비워 두면 고른 주제로 첫 질문을 먼저 보내 드릴게요.</p>
      <div class="ob-seeds">${SEEDS.map(([s, ico]) => `
        <button type="button" class="ob-seed ${d.seeds.includes(s) ? 'on' : ''}" data-ob-seed="${esc(s)}"><span>${ico}</span>${esc(s)}</button>`).join('')}
      </div>
      <label class="label ob-mt">한 줄 기록 <span class="subtle">(선택)</span></label>
      <input class="input" data-ob-field="seedText" maxlength="80" placeholder="예: 카페 알바에서 마감 체크리스트를 만들었어요" value="${esc(d.seedText)}" />
      <div class="ob-firstq-slot">${firstQ(d)}</div>
      <button type="button" class="ob-chat-alt" data-ob-nav="chat"><span class="ai-dot">R</span><span><b>AI와 대화하며 기록할래요</b><span>질문을 따라 상황·행동·결과까지 한 번에 채워요 →</span></span></button>`;
  }

  function nextLabel(step) {
    if (step === 0) return '시작하기';
    if (step === STEPS.length - 1) return '시작하기';
    return '다음';
  }

  function view(step, d) {
    const body = [stepWelcome, stepType, stepJob, stepRhythm, stepGithub, stepSeed][step](d);
    return `<div class="ob-card card ${step === 3 ? 'ob-wide' : ''}">
      <div class="ob-top">
        ${dots(step)}
        <span class="ob-step-n">${step + 1} / ${STEPS.length}</span>
        <a class="ob-skip" href="#/home">건너뛰기</a>
      </div>
      <div class="ob-body" data-step="${step}">${body}</div>
      <div class="ob-foot">
        ${step > 0 ? '<button type="button" class="btn btn-ghost" data-ob-nav="prev">← 이전</button>' : '<span></span>'}
        <button type="button" class="btn btn-primary btn-lg" data-ob-nav="next">${nextLabel(step)}</button>
      </div>
    </div>`;
  }

  App.screens.onboarding = {
    title: '시작하기',
    layout: 'full',
    render() { return '<div class="ob-wrap"></div>'; },
    mount(root) {
      const wrap = root.querySelector('.ob-wrap');
      const d = initialData();
      let step = 0;
      const paint = () => { wrap.innerHTML = view(step, d); };

      function finish(mode) {
        const days = d.cadence === 'daily' ? DAYS.slice() : d.cadence === 'weekdays' ? DAYS.slice(0, 5) : d.days.slice();
        App.store.updateUser({
          name: d.name.trim() || App.store.state.user.name, userType: d.userType,
          targetJob: d.targetJob.trim() || App.store.state.user.targetJob, onboarded: true,
          firstSeed: { categories: d.seeds.slice(), text: d.seedText.trim() },
        });
        App.store.updateSettings({ cadence: d.cadence, times: d.times.slice().sort(), days, channels: Object.assign({}, d.channels) });
        // GitHub 레포 → 프로젝트를 만들고 코드 탭으로 (분석은 프로젝트 화면이 맡는다)
        const gh = d.repoUrl.trim(); const parsed = gh && App.github && App.github.parseUrl(gh);
        let project = null;
        if (parsed) {
          const url = /^https?:\/\//i.test(gh) ? gh : `https://github.com/${parsed.owner}/${parsed.name}`;
          project = App.store.createProject({ title: parsed.name, links: [url] });
        }
        const text = d.seedText.trim();
        if (mode === 'chat') {
          App.ui.toast('준비 완료! AI와 대화하며 기록해 볼게요');
          App.navigate('#/discover?seed=onboarding' + (project ? '&project=' + encodeURIComponent(project.id) : ''));
          return;
        }
        if (!text && d.seeds.length) {
          App.store.pushQuestion({ type: 'recall', text: seedQuestion(d.seeds[0]), hint: '한두 줄이면 충분해요. 답하면 경험 위키에 반영돼요.' });
        }
        App.ui.toast(project ? '준비 완료! 레포를 분석해 볼까요?' : '준비 완료!');
        App.navigate(project ? `#/projects/${project.id}?tab=code` : '#/home');
        // 한 줄 첫 기록은 전역 "＋ 기록하기"로 위키에 반영 (결과 화면까지 그 안에서 보여 준다)
        if (text && App.capture) setTimeout(() => App.capture({ text }), 80);
      }

      function onClick(ev) {
        const t = ev.target.closest('button');
        if (!t || !wrap.contains(t)) return;
        const ds = t.dataset;
        if (ds.obNav === 'next') {
          if (step === 3 && !d.times.length) { App.ui.toast('질문 받을 시간을 하나 이상 골라 주세요'); return; }
          if (step === 3 && !Object.values(d.channels).some(Boolean)) { App.ui.toast('받을 곳을 하나 이상 켜 주세요'); return; }
          if (step === STEP_GH && d.repoUrl.trim() && !(App.github && App.github.parseUrl(d.repoUrl))) { App.ui.toast('GitHub 레포 주소를 확인해 주세요 (예: github.com/owner/repo)'); return; }
          if (step === STEPS.length - 1) { finish(); return; }
          step++; paint(); window.scrollTo(0, 0); return;
        }
        if (ds.obNav === 'prev') { step = Math.max(0, step - 1); paint(); return; }
        if (ds.obNav === 'chat') { finish('chat'); return; }
        if (ds.obType) d.userType = ds.obType;
        else if (ds.obJob) d.targetJob = d.targetJob === ds.obJob ? '' : ds.obJob;
        else if (ds.obCadence) d.cadence = ds.obCadence;
        else if (ds.obDay) d.days = d.days.includes(ds.obDay) ? d.days.filter((x) => x !== ds.obDay) : d.days.concat(ds.obDay);
        else if (ds.obTime) d.times = d.times.includes(ds.obTime) ? d.times.filter((x) => x !== ds.obTime) : d.times.concat(ds.obTime);
        else if (ds.obChannel) d.channels[ds.obChannel] = !d.channels[ds.obChannel];
        else if (ds.obSeed) d.seeds = d.seeds.includes(ds.obSeed) ? d.seeds.filter((x) => x !== ds.obSeed) : [ds.obSeed].concat(d.seeds);
        else return;
        paint();
      }
      function onInput(ev) {
        const f = ev.target.getAttribute('data-ob-field');
        if (!f) return;
        d[f] = ev.target.value;
        if (f === 'targetJob') wrap.querySelectorAll('.ob-chip.on').forEach((c) => c.classList.remove('on'));
        if (f === 'seedText') {
          // 한글 IME 조합을 깨지 않도록 미리보기만 갱신
          const slot = wrap.querySelector('.ob-firstq-slot'); if (slot) slot.innerHTML = firstQ(d);
        }
      }
      function onKey(ev) {
        if (ev.key === 'Enter' && !ev.isComposing && ev.target.matches('input[data-ob-field]')) {
          ev.preventDefault();
          const next = wrap.querySelector('[data-ob-nav=next]'); if (next) next.click();
        }
      }
      wrap.addEventListener('click', onClick);
      wrap.addEventListener('input', onInput);
      wrap.addEventListener('keydown', onKey);
      paint();
      return () => {
        wrap.removeEventListener('click', onClick);
        wrap.removeEventListener('input', onInput);
        wrap.removeEventListener('keydown', onKey);
      };
    },
  };
})(window.App);
