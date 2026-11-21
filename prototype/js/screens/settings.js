/* 설정: 프로필 · 질문 알림 리듬 · 데이터. 변경 즉시 저장 */
(function (App) {
  const esc = (s) => App.ui.esc(s);
  const DAYS = ['월', '화', '수', '목', '금', '토', '일'];
  const TYPES = [['newgrad', '신입 취업 준비'], ['switcher', '직무 전환 준비'], ['junior', '주니어 이직 준비']];
  const JOBS = ['백엔드 개발자', '프론트엔드 개발자', '서비스 기획자', 'PM/PO', '데이터 분석가', 'UX/UI 디자이너', '마케터'];
  const CADENCE = [['daily', '매일'], ['weekdays', '평일만'], ['custom', '직접 고르기']];
  const CHANNELS = [['push', '앱 푸시', '휴대폰 잠금화면으로 바로 받아요'], ['kakao', '카카오톡', '알림톡으로 받아서 바로 답해요'], ['email', '이메일', '하루치 질문을 메일로 모아 받아요']];
  const STYLES = [['light', '가볍게', '한두 줄로 답할 수 있는 질문'], ['deep', '깊게', '조금 더 생각해 볼 만한 질문']];
  const CHECKIN = [['daily', '매일'], ['every2days', '이틀마다'], ['weekly', '주 1회']];
  const CHECKIN_LABEL = { daily: '매일', every2days: '이틀마다', weekly: '일주일에 한 번' };

  function daysFor(cadence, cur) {
    if (cadence === 'daily') return DAYS.slice();
    if (cadence === 'weekdays') return DAYS.slice(0, 5);
    return cur && cur.length ? cur.slice() : DAYS.slice(0, 5);
  }

  function preview(s) {
    const times = (s.times || []).slice().sort();
    const ch = CHANNELS.filter(([id]) => s.channels && s.channels[id]).map(([, l]) => l);
    const days = DAYS.filter((d) => (s.days || []).includes(d));
    if (!times.length) return { warn: true, text: '질문 받을 시간이 없어요. 시간을 하나 이상 추가해 주세요.' };
    if (!ch.length) return { warn: true, text: '켜져 있는 채널이 없어서 질문을 보낼 수 없어요.' };
    if (!days.length) return { warn: true, text: '질문 받을 요일을 하나 이상 골라 주세요.' };
    const when = days.length === 7 ? '매일' : (days.join('') === '월화수목금' ? '평일마다' : (days.join('') === '토일' ? '주말마다' : days.join('·') + '요일'));
    const style = s.questionStyle === 'deep' ? '조금 깊이 생각해 볼' : '가볍게 답할 수 있는';
    const q = s.quietHours || {};
    return {
      warn: false,
      text: `${when} ${times.join(', ')}에 ${style} 질문 1개를 ${ch.join('·')}${/톡$/.test(ch[ch.length - 1]) ? '으로' : '로'} 보내드려요.`,
      sub: (q.start && q.end ? `${q.start}~${q.end}에는 알림을 보내지 않아요. ` : '') + `진행 중 프로젝트는 ${CHECKIN_LABEL[s.projectCheckin] || '이틀마다'} 체크인 질문을 드려요.`,
    };
  }

  function toggle(on, attrs) {
    return `<button type="button" class="set-switch ${on ? 'on' : ''}" role="switch" aria-checked="${on}" ${attrs}><span></span></button>`;
  }

  function seg(list, cur, attr) {
    return `<div class="set-seg">${list.map(([id, l]) => `<button type="button" class="${cur === id ? 'on' : ''}" ${attr}="${id}">${l}</button>`).join('')}</div>`;
  }

  function view() {
    const u = App.store.state.user, s = App.store.state.settings;
    const p = preview(s);
    const times = (s.times || []).slice().sort();
    const ch = s.channels || {};
    const q = s.quietHours || { start: '', end: '' };
    return `<div class="page page-narrow set">
      <div class="page-head"><h1>설정</h1><p>바꾸는 즉시 저장돼요. 질문이 부담스럽다면 리듬부터 줄여 보세요.</p></div>

      <section class="card set-sec">
        <div class="set-sec-head"><h2>프로필</h2><p>목표 직무에 맞춰 역량 키워드와 질문 방향을 정해요.</p></div>
        <div class="set-row">
          <div class="set-row-label">이름</div>
          <div class="set-row-ctrl"><input class="input set-input" data-set-user="name" maxlength="20" value="${esc(u.name)}" /></div>
        </div>
        <div class="set-row">
          <div class="set-row-label">사용자 유형</div>
          <div class="set-row-ctrl">${seg(TYPES, u.userType, 'data-set-type')}</div>
        </div>
        <div class="set-row set-row-top">
          <div class="set-row-label">목표 직무</div>
          <div class="set-row-ctrl">
            <input class="input set-input" data-set-user="targetJob" maxlength="30" placeholder="예: 백엔드 개발자" value="${esc(u.targetJob)}" />
            <div class="set-chips">${JOBS.map((j) => `<button type="button" class="set-chip ${u.targetJob === j ? 'on' : ''}" data-set-job="${esc(j)}">${esc(j)}</button>`).join('')}</div>
          </div>
        </div>
      </section>

      <section class="card set-sec">
        <div class="set-sec-head"><h2>질문 알림 리듬</h2><p>서비스가 먼저 말을 거는 시간이에요. 질문은 한 번에 하나만 보내요.</p></div>
        <div class="set-preview ${p.warn ? 'warn' : ''}">
          <span class="ai-dot">${p.warn ? '!' : 'R'}</span>
          <div><div class="set-preview-text">${esc(p.text)}</div>${p.sub ? `<div class="set-preview-sub">${esc(p.sub)}</div>` : ''}</div>
        </div>

        <div class="set-row">
          <div class="set-row-label">주기</div>
          <div class="set-row-ctrl">${seg(CADENCE, s.cadence, 'data-set-cadence')}</div>
        </div>
        <div class="set-row">
          <div class="set-row-label">요일</div>
          <div class="set-row-ctrl"><div class="set-days">${DAYS.map((d) => `<button type="button" class="set-day ${(s.days || []).includes(d) ? 'on' : ''} ${d === '토' || d === '일' ? 'wkend' : ''}" data-set-day="${d}">${d}</button>`).join('')}</div>
            <div class="subtle set-hint">요일을 직접 바꾸면 ‘직접 고르기’로 바뀌어요.</div></div>
        </div>
        <div class="set-row set-row-top">
          <div class="set-row-label">시간</div>
          <div class="set-row-ctrl">
            <div class="set-times">
              ${times.map((t) => `<span class="set-time">${esc(t)}<button type="button" class="set-time-x" data-set-time-rm="${esc(t)}" aria-label="${esc(t)} 삭제">×</button></span>`).join('')}
              <span class="set-time-add"><input type="time" class="input set-time-input" value="18:00" step="300" /><button type="button" class="btn btn-sm" data-set-act="time-add">＋ 추가</button></span>
            </div>
          </div>
        </div>
        <div class="set-row set-row-top">
          <div class="set-row-label">받을 곳</div>
          <div class="set-row-ctrl set-channels">${CHANNELS.map(([id, l, desc]) => `
            <div class="set-channel"><div><b>${l}</b><span>${desc}</span></div>${toggle(!!ch[id], `data-set-channel="${id}"`)}</div>`).join('')}
          </div>
        </div>
        <div class="set-row">
          <div class="set-row-label">방해 금지 시간</div>
          <div class="set-row-ctrl set-quiet">
            <input type="time" class="input set-time-input" data-set-quiet="start" value="${esc(q.start)}" />
            <span class="subtle">부터</span>
            <input type="time" class="input set-time-input" data-set-quiet="end" value="${esc(q.end)}" />
            <span class="subtle">까지는 조용히</span>
          </div>
        </div>
        <div class="set-row set-row-top">
          <div class="set-row-label">질문 스타일</div>
          <div class="set-row-ctrl"><div class="set-styles">${STYLES.map(([id, l, desc]) => `
            <button type="button" class="set-style ${s.questionStyle === id ? 'on' : ''}" data-set-style="${id}"><b>${l}</b><span>${desc}</span></button>`).join('')}</div></div>
        </div>
        <div class="set-row">
          <div class="set-row-label">프로젝트 체크인</div>
          <div class="set-row-ctrl">${seg(CHECKIN, s.projectCheckin, 'data-set-checkin')}</div>
        </div>
        <div class="set-demo">
          <div><b>알림이 어떻게 오는지 궁금하다면</b><p class="subtle">지금 바로 질문 하나를 받아 볼 수 있어요.</p></div>
          <button type="button" class="btn btn-accent" data-set-act="demo">✉ 지금 질문 받아보기 (데모)</button>
        </div>
      </section>

      <section class="card set-sec">
        <div class="set-sec-head"><h2>데이터</h2><p>이 프로토타입의 데이터는 브라우저에만 저장돼요.</p></div>
        <div class="set-row">
          <div class="set-row-label">온보딩</div>
          <div class="set-row-ctrl"><a class="btn btn-sm" href="#/onboarding">다시 온보딩 보기</a></div>
        </div>
        <div class="set-row">
          <div class="set-row-label">초기화</div>
          <div class="set-row-ctrl set-danger-row"><span class="subtle">경험·답변·설정을 처음 상태로 되돌려요.</span>
            <button type="button" class="btn btn-sm btn-danger" data-set-act="reset">프로토타입 데이터 초기화</button></div>
        </div>
      </section>
    </div>`;
  }

  App.screens.settings = {
    title: '설정',
    render: view,
    mount(root) {
      const st = () => App.store.state.settings;
      let toastTimer = null;
      const saved = (msg) => {
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => App.ui.toast(msg || '저장했어요'), 120);
      };
      const repaint = () => {
        const y = window.scrollY;
        root.innerHTML = view();
        window.scrollTo(0, y);
      };
      const saveSettings = (patch, msg) => { App.store.updateSettings(patch); repaint(); saved(msg); };
      // 사이드바(이름·직무)까지 갱신해야 하는 경우
      const saveUser = (patch, msg) => {
        App.store.updateUser(patch);
        const y = window.scrollY; App.rerender(); window.scrollTo(0, y);
        saved(msg);
      };

      function onClick(ev) {
        const b = ev.target.closest('button');
        if (!b || !root.contains(b)) return;
        const ds = b.dataset;
        const s = st();
        if (ds.setType) return saveUser({ userType: ds.setType }, '사용자 유형을 바꿨어요');
        if (ds.setJob) return saveUser({ targetJob: ds.setJob }, `목표 직무를 ‘${ds.setJob}’(으)로 바꿨어요`);
        if (ds.setCadence) return saveSettings({ cadence: ds.setCadence, days: daysFor(ds.setCadence, s.days) }, '질문 주기를 바꿨어요');
        if (ds.setDay) {
          const days = s.days.includes(ds.setDay) ? s.days.filter((d) => d !== ds.setDay) : DAYS.filter((d) => s.days.includes(d) || d === ds.setDay);
          const cadence = days.length === 7 ? 'daily' : days.join('') === '월화수목금' ? 'weekdays' : 'custom';
          return saveSettings({ days, cadence });
        }
        if (ds.setTimeRm) return saveSettings({ times: s.times.filter((t) => t !== ds.setTimeRm) }, `${ds.setTimeRm} 알림을 뺐어요`);
        if (ds.setChannel) {
          const channels = Object.assign({}, s.channels, { [ds.setChannel]: !s.channels[ds.setChannel] });
          const name = CHANNELS.find((c) => c[0] === ds.setChannel)[1];
          return saveSettings({ channels }, `${name} 알림을 ${channels[ds.setChannel] ? '켰어요' : '껐어요'}`);
        }
        if (ds.setStyle) return saveSettings({ questionStyle: ds.setStyle }, '질문 스타일을 바꿨어요');
        if (ds.setCheckin) return saveSettings({ projectCheckin: ds.setCheckin }, '프로젝트 체크인 주기를 바꿨어요');
        if (ds.setAct === 'time-add') {
          const v = root.querySelector('.set-time-add .set-time-input').value;
          if (!v) return;
          if (s.times.includes(v)) { App.ui.toast('이미 있는 시간이에요'); return; }
          if (s.times.length >= 6) { App.ui.toast('시간은 최대 6개까지 정할 수 있어요'); return; }
          return saveSettings({ times: s.times.concat(v).sort() }, `${v}에도 질문을 보내드릴게요`);
        }
        if (ds.setAct === 'demo') {
          const list = window.SEED.recallPrompts;
          const rp = list[Math.floor(Math.random() * list.length)];
          App.store.pushQuestion({ text: rp.text, type: 'recall', targetExpId: null, hint: '떠오르는 장면 하나면 충분해요.' });
          App.ui.pushToast('오늘의 질문이 도착했어요', rp.text, '#/ask');
          const y = window.scrollY; App.rerender(); window.scrollTo(0, y); // 사이드바 배지 갱신
          return;
        }
        if (ds.setAct === 'reset') {
          App.ui.modal({
            title: '프로토타입 데이터를 초기화할까요?',
            body: '<p>지금까지 추가하거나 수정한 경험, 답변, 설정이 모두 처음 상태로 돌아가요. 되돌릴 수 없어요.</p>',
            confirmText: '초기화', danger: true,
            onConfirm: () => { App.store.reset(); App.rerender(); App.ui.toast('처음 상태로 되돌렸어요'); },
          });
        }
      }

      function onChange(ev) {
        const t = ev.target;
        const uf = t.getAttribute('data-set-user');
        if (uf) {
          const v = t.value.trim();
          if (!v) { t.value = App.store.state.user[uf] || ''; App.ui.toast('비워 둘 수 없어요'); return; }
          if (v === App.store.state.user[uf]) return;
          return saveUser({ [uf]: v }, uf === 'name' ? '이름을 바꿨어요' : '목표 직무를 바꿨어요');
        }
        const qf = t.getAttribute('data-set-quiet');
        if (qf) {
          const quietHours = Object.assign({}, st().quietHours, { [qf]: t.value });
          return saveSettings({ quietHours }, '방해 금지 시간을 바꿨어요');
        }
      }
      function onKey(ev) {
        if (ev.key === 'Enter' && !ev.isComposing && ev.target.matches('[data-set-user]')) ev.target.blur();
        if (ev.key === 'Enter' && ev.target.closest('.set-time-add')) { ev.preventDefault(); root.querySelector('[data-set-act=time-add]').click(); }
      }

      root.addEventListener('click', onClick);
      root.addEventListener('change', onChange);
      root.addEventListener('keydown', onKey);
      return () => {
        root.removeEventListener('click', onClick);
        root.removeEventListener('change', onChange);
        root.removeEventListener('keydown', onKey);
      };
    },
  };
})(window.App);
