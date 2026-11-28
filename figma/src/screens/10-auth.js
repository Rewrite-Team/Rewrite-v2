/* 로그인 · 회원가입(#/login, #/signup)과 시작하기(#/onboarding).
   앱: prototype/js/screens/auth.js, css/screens/auth.css, styles.css(.auth*), js/screens/onboarding.js, css/screens/onboarding.css,
       js/repo-flow.js(레포 고르기, css/screens/repo-flow.css), 예시 계정 js/seed-repos.js(SEED.github)
   컴포넌트: Auth/Resume paper(움직임이 끝난 이력서 한 장), Auth/Brand panel(로그인 왼쪽 잉크 판),
            Onboarding/Header(로고 + 로그아웃), Onboarding/Progress(Step 1 = 50%, Step 2 = 100%) */

{ // 이 파일의 이름이 다른 화면 파일과 겹치지 않도록 한 스코프에 둔다

/* ---------- 로그인 왼쪽에 나오는 내용 (auth.js 의 SCENES, 움직임이 끝난 모습) ---------- */
const AUTH_SCENES = [
  { p: '모여봄', when: '2026.09부터', line: ['N+1 쿼리를 찾아 평균 응답 시간을 ', '1.8초에서 0.3초로', ' 단축'] },
  { p: '알고리즘 스터디', when: '2025.03 ~ 2025.12', line: ['난이도를 3단계로 나눠 10개월간 ', '평균 참여율 85%', ' 유지'] },
  { p: '카페 아르바이트', when: '2024.03 ~ 2025.02', line: ['메뉴별 주문 수를 집계해 대기 시간을 ', '절반 가까이', ' 단축'] },
];
const AUTH_PAPER_W = 720; // .au-paper 최대 폭 (안쪽 640)

// 이력서 종이의 회색 줄(.au-bars i): 폭 목록 → 세로로 쌓은 막대
function authBars(name, widths, cross = 'start') {
  const s = al('V', { name, gap: 8, cross });
  for (const w of widths) { const b = figma.createRectangle(); b.name = 'bar'; b.resize(w, 8); b.fills = fills('surface-3'); radius(b, 2); s.appendChild(b); }
  return s;
}

EXTRA_COMPONENTS.push({
  title: '로그인 · 시작하기',
  build: async (row) => {
    /* 이력서 한 장: 말한 문장이 이력서 문장으로 바뀌고 수치에 형광펜(AI가 더한 것)이 그어진 끝 모습 */
    await makeOne(row, 'Auth/Resume paper', async (c) => {
      auto(c, 'V', { pad: [36, 40, 60, 40], w: AUTH_PAPER_W, fill: 'surface', radius: [3, 3, 0, 0] });
      await c.setEffectStyleIdAsync(EFFECTS.Modal.id); // shadow() 는 동기 대입(effectStyleId)이라 dynamic-page 에서 막힌다
      const head = al('H', { name: '이름', gap: 24, pad: [0, 0, 16, 0], main: 'between', cross: 'end', stroke: 'text', strokeW: 2, sides: ['bottom'] }); put(c, head, { fill: true });
      const who = al('V', { name: '사람' }); head.appendChild(who);
      await tput(who, '김준호', 'Heading/24', 'text'); await tput(who, '백엔드 개발자', 'Small/13.5', 'text-2');
      const contact = authBars('연락처', [120, 86], 'end'); contact.paddingBottom = 4; head.appendChild(contact);

      const section = async (title) => { const s = al('V', { name: title, gap: 12, pad: [24, 0, 0, 0] }); put(c, s, { fill: true }); await tput(s, title, 'Small/13.5 Semibold', 'primary-ink'); return s; };
      const projects = await section('프로젝트');
      const slots = al('V', { name: '항목', gap: 16 }); put(projects, slots, { fill: true });
      for (const sc of AUTH_SCENES) {
        const slot = al('V', { name: sc.p, gap: 2 }); put(slots, slot, { fill: true });
        const sh = al('H', { name: '프로젝트', gap: 16, main: 'between', cross: 'center', minH: 24 }); put(slot, sh, { fill: true });
        sh.appendChild(await text(sc.p, 'Body/15 Semibold', 'text')); sh.appendChild(await text(sc.when, 'Caption/12', 'text-3'));
        const ln = al('H', { name: '이력서 문장', cross: 'center', pad: [0, 0, 0, 2], minH: 26 }); slot.appendChild(ln);
        const dot = figma.createEllipse(); dot.name = '점'; dot.resize(4, 4); dot.fills = fills('text-3'); ln.appendChild(dot); gap(ln, 1, 8);
        const [a, mark, b] = sc.line;
        ln.appendChild(await text(a, 'Body/15 Medium', 'text')); ln.appendChild(await marked(mark, 'Body/15 Semibold', 'text')); ln.appendChild(await text(b, 'Body/15 Medium', 'text'));
      }
      (await section('기술')).appendChild(authBars('막대', [410, 307]));
      (await section('학력')).appendChild(authBars('막대', [358, 512, 256]));
    }, { desc: '로그인 왼쪽의 이력서 한 장. 움직임(말한 문장 → 빨간 줄 → 이력서 문장 → 형광펜)이 끝난 모습. 판 안에서 세로 채우기' });

    /* 로그인 왼쪽 잉크 판: 로고 + 다시 보기, 소개 문구, 이력서 한 장 (아래는 판 밖으로 잘린다) */
    await makeOne(row, 'Auth/Brand panel', async (c) => {
      auto(c, 'V', { pad: [24, 24, 0, 56], w: W / 2, h: H, fill: 'primary-hover', clip: true });
      const top = al('H', { name: '위', h: 56, cross: 'center' }); put(c, top, { fill: true });
      top.appendChild(inst('Logo', { On: 'Ink' })); spacer(top);
      const replay = al('H', { name: '다시 보기', gap: 6, pad: [0, 10], h: 32, cross: 'center', radius: 'radius/sm' }); top.appendChild(replay);
      replay.appendChild(icon('refresh', 15, 'on-ink-2')); replay.appendChild(await text('다시 보기', 'Small/13.5 Medium', 'on-ink-2'));
      gap(c, 64);
      const pitch = al('V', { name: '소개 문구', gap: 12 }); c.appendChild(pitch);
      pitch.appendChild(await text('편하게 말한 경험이\n이력서 한 줄이 돼요', 'Display/34', 'on-ink', { name: '한 줄 약속' }));
      pitch.appendChild(await text('AI와 이야기하거나 GitHub를 연결하면 경험 카드로 정리하고, 이력서와 자소서까지 이어 써요.', 'Body/15', 'on-ink-2', { w: 440, name: '설명' }));
      gap(c, 48);
      const paper = inst('Auth/Resume paper'); put(c, paper, { fillV: true });
    }, { desc: '로그인 · 회원가입 왼쪽(960). 잉크색(primary-hover) 위에 로고(On=Ink), 다시 보기, 소개 문구, 이력서 한 장' });

    /* 시작하기 머리: 로고 + 로그아웃 */
    await makeOne(row, 'Onboarding/Header', async (c) => {
      auto(c, 'H', { pad: [0, 40], w: W, h: 56, main: 'between', cross: 'center', fill: 'bg' });
      c.appendChild(inst('Logo', { On: 'Light' })); c.appendChild(btn('로그아웃', 'Ghost', 'Small'));
    }, { desc: '시작하기 위쪽 줄 (.ob-head). 화면 폭 채우기' });

    /* 시작하기 진행 막대 (.progress, 폭 96) */
    await makeSet(row, 'Onboarding/Progress', ['1', '2'].map((k) => ({ props: { Step: k }, build: async (c) => {
      auto(c, 'H', { w: 96, h: 6, fill: 'surface-3', radius: 3, clip: true });
      const bar = figma.createRectangle(); bar.name = 'value'; bar.resize(k === '1' ? 48 : 96, 6); bar.fills = fills('primary'); radius(bar, 3); c.appendChild(bar);
    } })), { dir: 'H', desc: '시작하기 진행. Step 1 = 50% (목표 직무), Step 2 = 100% (첫 프로젝트)' });
  },
});

/* ---------- 로그인 · 회원가입 화면 ---------- */
// fields: [{ label, input, hint, error }] · kind: 'login' | 'signup'
async function authScreen(frame, kind, fields) {
  const signup = kind === 'signup';
  const screen = al('H', { name: '화면', w: W, h: H, fill: 'bg' }); put(frame, screen, { at: [0, 0] });
  screen.appendChild(inst('Auth/Brand panel'));
  const right = al('V', { name: '폼 자리', main: 'center', cross: 'center' }); put(screen, right, { fill: true, fillV: true });

  const form = al('V', { name: signup ? '회원가입 폼' : '로그인 폼', gap: 40, w: 408, pad: [48, 24] }); right.appendChild(form);
  const main = al('V', { name: '폼', gap: 24 }); put(form, main, { fill: true });
  await tput(main, signup ? '회원가입' : '로그인', 'Heading/24', 'text', { name: 'h1' });
  const list = al('V', { name: '입력칸', gap: 20 }); put(main, list, { fill: true });
  for (const f of fields) await field(list, f);

  const actions = al('V', { name: '단추', gap: 16 }); put(main, actions, { fill: true });
  const btns = al('V', { name: '버튼', gap: 8 }); put(actions, btns, { fill: true });
  put(btns, btn(signup ? '가입하기' : '로그인', 'Primary', 'Large'), { fill: true });
  put(btns, btn('예시 계정으로 둘러보기', 'Secondary', 'Large'), { fill: true });
  const alt = al('H', { name: '다른 쪽으로', gap: 4, main: 'center', cross: 'center' }); put(actions, alt, { fill: true });
  alt.appendChild(await text(signup ? '이미 계정이 있나요?' : '아직 계정이 없나요?', 'Small/13.5', 'text-2'));
  alt.appendChild(await text(signup ? '로그인' : '회원가입', 'Small/13.5 Medium', 'primary', { underline: true, name: 'link' }));

  await tput(form, '프로토타입이라 계정과 데이터는 이 브라우저에만 저장돼요. 다른 곳에서 쓰는 비밀번호는 쓰지 마세요.', 'Small/13.5', 'text-3', { wrap: true, name: '안내' });
  return screen;
}
const AUTH_PASSWORD = (o = {}) => Object.assign({ Content: 'Placeholder', Text: '', 'Show trailing': true, Trailing: 'eye' }, o);

SCREENS.push({
  group: '로그인', title: '로그인',
  build: async (frame) => {
    await authScreen(frame, 'login', [
      { label: '이메일', input: { State: 'Focus', Text: 'name@example.com' } },
      { label: '비밀번호', input: AUTH_PASSWORD() },
    ]);
  },
});

SCREENS.push({
  group: '로그인', title: '로그인 / 입력 오류',
  build: async (frame) => {
    // auth.js:47 — 틀린 비밀번호는 비밀번호 칸 아래에 알린다 (오류 칸에 초점)
    await authScreen(frame, 'login', [
      { label: '이메일', input: { Content: 'Value', Text: 'junho.kim@example.com' } },
      { label: '비밀번호', input: AUTH_PASSWORD({ Content: 'Value', Text: '••••••••' }), error: '이메일 또는 비밀번호가 맞지 않아요.' },
    ]);
  },
});

SCREENS.push({
  group: '로그인', title: '회원가입',
  build: async (frame) => {
    await authScreen(frame, 'signup', [
      { label: '이름', input: { State: 'Focus', Text: '이름 또는 닉네임' } },
      { label: '이메일', input: { Text: 'name@example.com' } },
      { label: '비밀번호', input: AUTH_PASSWORD(), hint: '8자 이상' },
    ]);
  },
});

/* ---------- 시작하기 (새 계정만) ---------- */
// 틀: 머리 + 가운데 560 칸(안쪽 528) → { body, content } · step: 1 | 2
async function onboarding(frame, step, title) {
  const screen = al('V', { name: '화면', w: W, fill: 'bg', cross: 'center' }); screen.minHeight = H; put(frame, screen, { at: [0, 0] });
  put(screen, inst('Onboarding/Header'), { fill: true });
  const body = al('V', { name: '가운데', gap: 24, w: 560, pad: [48, 16, 64, 16] }); screen.appendChild(body);
  const head = al('V', { name: '머리', gap: 28 }); put(body, head, { fill: true });
  head.appendChild(inst('Onboarding/Progress', { Step: String(step) }));
  await tput(head, title, 'Heading/24', 'text', { wrap: true, name: 'h1' });
  const content = al('V', { name: '내용', gap: 20 }); put(body, content, { fill: true });
  return { screen, body, content };
}
// 아래 단추 줄 (.ob-foot: 위 16 + 안쪽 12)
function onboardingFoot(body, buttons) {
  const foot = al('H', { name: '아래 단추', gap: 8, pad: [4, 0, 12, 0], cross: 'center', fill: 'bg' }); put(body, foot, { fill: true });
  return buttons(foot);
}
// 2단계: 보기 고르기 + 칸(.ob-pane, 최소 148) + 이전 · 나중에 하기 · 프로젝트 만들기
async function onboardingProject(frame, mode, pane, canCreate) {
  const { screen, body, content } = await onboarding(frame, 2, '첫 프로젝트를 만들어요');
  content.appendChild(segmented([{ label: 'GitHub에서 가져오기', icon: 'github' }, { label: '직접 만들기' }], mode === 'manual' ? 1 : 0));
  const p = al('V', { name: mode === 'manual' ? '직접 만들기' : '레포 고르기', minH: 148 }); put(content, p, { fill: true });
  await pane(p);
  onboardingFoot(body, (foot) => {
    foot.appendChild(btn('이전', 'Ghost', 'Medium')); spacer(foot);
    foot.appendChild(btn('나중에 하기', 'Ghost', 'Medium'));
    const ok = btn('프로젝트 만들기', 'Primary', 'Medium'); foot.appendChild(canCreate ? ok : disable(ok));
  });
  fit(frame, screen);
}

SCREENS.push({
  group: '시작하기', title: '1단계 목표 직무',
  build: async (frame) => {
    const { screen, body, content } = await onboarding(frame, 1, '어떤 일을 준비하고 있나요?');
    await field(content, { label: '목표 직무', note: '(선택)', input: { Content: 'Placeholder', State: 'Focus', Text: '예: 백엔드 개발자' } }); // 라벨 뒤 (선택)은 옅은 글 (.label .subtle)
    onboardingFoot(body, (foot) => put(foot, btn('다음', 'Primary', 'Large'), { fill: true }));
    fit(frame, screen);
  },
});

SCREENS.push({
  group: '시작하기', title: '2단계 GitHub에서 가져오기',
  build: async (frame) => {
    // repo-flow.js accountHTML: 계정 주소를 아직 안 불러온 상태. 레포를 고르기 전이라 프로젝트 만들기는 꺼져 있다
    await onboardingProject(frame, 'github', async (p) => {
      const form = al('V', { name: '계정 불러오기', gap: 12 }); put(p, form, { fill: true });
      await field(form, { label: 'GitHub 주소', input: { Content: 'Placeholder', State: 'Default', Text: 'github.com/내아이디' }, trailing: [btn('불러오기', 'Secondary', 'Medium')], hint: '내 레포와 소속 조직의 공개 레포를 한 번에 불러와요.' });
      const foot = al('H', { name: '계정 단추', gap: 4 }); form.appendChild(foot);
      foot.appendChild(btn('예시 계정으로 해 보기', 'Ghost', 'Small'));
    }, false);
  },
});

// 예시 계정(SEED.github, login example)의 레포를 최근에 올린 순서로. ym(pushedAt)
const AUTH_REPOS = [
  ['moyeobom-frontend', '「모여봄」 웹 프론트엔드', 'TypeScript', '2026.11'],
  ['moyeobom-backend', '동네 기반 소모임 매칭 서비스 「모여봄」 백엔드', 'Java', '2026.11'],
  ['budget-bot', '슬랙 메시지로 공동 생활비를 기록하는 봇', 'JavaScript', '2026.11'],
  ['dotfiles', '개발 환경 설정', 'Shell', '2026.08'],
  ['algorithm-notes', '알고리즘 스터디 풀이 모음', 'Java', '2025.12'],
  ['empty-classroom', '캡스톤 디자인: 빈 강의실 찾기와 예약 웹앱', 'Java', '2025.06'],
  ['lost-found-server', '24시간 해커톤: 분실물 찾기 서비스', 'Java', '2025.05'],
];

SCREENS.push({
  group: '시작하기', title: '2단계 GitHub 레포 고르기',
  build: async (frame) => {
    // repo-flow.js paint(): 계정 줄 + 검색 + 레포 목록. moyeobom-backend 를 골랐다.
    // 꺼진 줄은 다른 프로젝트에 연결된 레포의 모양을 보이려고 넣었다 (새 계정에는 보통 없다)
    await onboardingProject(frame, 'github', async (p) => {
      const picker = al('V', { name: '레포 고르기', gap: 12 }); put(p, picker, { fill: true });
      await githubAccount(picker);
      put(picker, inst('Input', { Content: 'Placeholder', Text: '레포 검색', 'Show icon': true, Icon: 'search' }), { fill: true });
      const list = al('V', { name: 'GitHub 레포', gap: 8 }); put(picker, list, { fill: true });
      for (const [name, desc, lang, ym] of AUTH_REPOS) {
        const state = name === 'moyeobom-backend' ? 'Selected' : name === 'empty-classroom' ? 'Disabled' : 'Default';
        const meta = state === 'Disabled' ? '「빈강의실」에 연결됨' : `${lang}    ${ym}`;
        const r = inst('Repo/Choice', { State: state, Name: name, Description: desc, Meta: meta }); r.name = name; put(list, r, { fill: true });
      }
    }, true);
  },
});

SCREENS.push({
  group: '시작하기', title: '2단계 직접 만들기',
  build: async (frame) => {
    // onboarding.js projectHTML: 직접 만들기를 고르면 이름 칸에 초점. 비어 있으면 누를 때 「프로젝트 이름을 적어 주세요.」
    await onboardingProject(frame, 'manual', async (p) => {
      await field(p, { label: '프로젝트 이름', input: { State: 'Focus', Text: '예: 교내 해커톤, 카페 아르바이트' } });
    }, true);
  },
});
}
