/* 홈 (#/home, prototype/js/screens/home.js + css/screens/home.css). 좁은 페이지(내용 760)
   화면: 홈 · 홈 / 처음 · 홈 / 계정 메뉴 · 홈 / 잔디 툴팁
   1차 범위라 「마감이 가까운 지원 기업」은 그리지 않는다 */
{
  // 잔디: 2025-11-23(일) ~ 2026-11-28(토, 오늘) 371일. 숫자는 하루 기록 수의 진하기 0~4 (앱의 예시 계정과 같은 값)
  const LEVELS = '00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000110110010021120221100002201210101001010011010321230232121422240222222242442141212120';
  const GRASS_START = [2025, 10, 23];
  const CELL = 10, CGAP = 2;
  // 12개 역량과 그 역량이 담긴 예시 계정의 카드 수 (data.js + seed-repos.js 로 센 값)
  const SKILLS = [['문제 해결력', 8], ['분석적 사고', 4], ['창의력', 0], ['기획력', 4], ['커뮤니케이션', 6], ['의사결정 능력', 5], ['리더십', 3], ['추진력', 4], ['실행력', 8], ['도전정신', 2], ['학습능력', 2], ['협업능력', 3]];
  const RECENT = [['AI 답변 종류 모아 보기', '모여봄'], ['AI 답변 종류: GitHub 연결 전', '슬랙봇'], ['배포 후 업로드 500 에러와 배포 체크리스트', '모여봄']];

  // SVG 로 만든 그림의 색을 같은 값의 색 변수로 바꿔 묶는다
  const hexOf = (c) => '#' + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
  const tokenOf = (c) => Object.keys(COLORS).find((k) => COLORS[k] === hexOf(c));
  const bindSvg = (node) => {
    const re = (ps) => ps.map((p) => { if (p.type !== 'SOLID') return p; const t = tokenOf(p.color); return t ? paint(t, p.opacity) : p; });
    for (const v of node.findAll(() => true)) { if (v.fills && v.fills.length) v.fills = re(v.fills); if (v.strokes && v.strokes.length) v.strokes = re(v.strokes); }
    return node;
  };

  /* ---------- 이 화면의 컴포넌트: 이어서 대화하기 한 줄 ---------- */
  EXTRA_COMPONENTS.push({ title: '홈', build: async (row) => {
    await makeOne(row, 'Home/Chat row', async (c) => {
      auto(c, 'H', { gap: 12, pad: [13, 18], w: 760, cross: 'center', stroke: 'border', sides: ['bottom'] }); c.minHeight = 56;
      const t = named(await text('대화방 이름', 'Body/15 Semibold', 'text'), 'hc-title'); c.appendChild(t); t.layoutSizingHorizontal = 'FILL'; t.maxLines = 1; t.textTruncation = 'ENDING';
      const chip = al('H', { name: 'project', gap: 5, cross: 'center' }); c.appendChild(chip);
      chip.appendChild(icon('folder', 15, 'primary-ink')); chip.appendChild(named(await text('프로젝트', 'Small/13.5 Semibold', 'primary-ink'), 'hc-project'));
    }, { desc: '홈 › 이어서 대화하기의 한 줄: 대화방 이름과 프로젝트. 누르면 그 대화방으로', props: [{ name: 'Title', type: 'TEXT', default: '대화방 이름', node: 'hc-title' }, { name: 'Project', type: 'TEXT', default: '프로젝트', node: 'hc-project' }] });
  } });

  /* ---------- 블록 ---------- */
  const cellRect = (level, name) => { const r = figma.createRectangle(); r.name = name; r.resize(CELL, CELL); r.cornerRadius = 3; r.fills = [paint(`record-${level}`)]; return r; };

  // 꾸준히 기록하기 → 11월 27일 칸을 돌려준다 (툴팁 자리)
  async function recordBlock(col) {
    await sectionTitle(col, '꾸준히 기록하기');
    const rc = al('V', { name: '꾸준히 기록하기', gap: 18, pad: 24, fill: 'surface-2', radius: 'radius/lg' }); put(col, rc, { fill: true });
    const top = al('H', { name: '연속 기록', gap: 16, cross: 'center' }); put(rc, top, { fill: true });
    const st = al('H', { name: '연속', gap: 4, cross: 'baseline' }); top.appendChild(st);
    st.appendChild(await text('20일', 'Title/18', 'primary-ink')); st.appendChild(await text('연속 기록하고 있어요', 'Body/15', 'text'));
    spacer(top); top.appendChild(await text('최근 1년 동안 61일 기록했어요', 'Small/13.5', 'text-3'));

    // 잔디: 왼쪽 요일 열 + (달 줄, 주마다 한 열)
    const fig = al('H', { name: '잔디', gap: 6 }); rc.appendChild(fig);
    const days = al('V', { name: '요일', gap: CGAP, w: 22 }); fig.appendChild(days); gap(days, 16 + 4 - CGAP);
    for (let r = 0; r < 7; r++) {
      const slot = figma.createFrame(); slot.name = `요일 ${r}`; slot.fills = []; slot.clipsContent = false; slot.resize(22, CELL); days.appendChild(slot);
      const lab = { 1: '월', 3: '수', 5: '금' }[r]; if (lab) { const t = await text(lab, 'Caption/12', 'text-3'); slot.appendChild(t); t.x = 0; t.y = -3; }
    }
    const right = al('V', { name: '달과 칸', gap: 4 }); fig.appendChild(right);
    const months = al('H', { name: '달', gap: CGAP }); right.appendChild(months);
    const grid = al('H', { name: '칸', gap: CGAP }); right.appendChild(grid);
    const weeks = Math.ceil(LEVELS.length / 7); let lastMonth = -1; let hover = null;
    for (let w = 0; w < weeks; w++) {
      const slot = figma.createFrame(); slot.name = `${w + 1}주`; slot.fills = []; slot.clipsContent = false; slot.resize(CELL, 16); months.appendChild(slot);
      const wk = al('V', { name: `${w + 1}주`, gap: CGAP }); grid.appendChild(wk);
      for (let r = 0; r < 7; r++) {
        const i = w * 7 + r; const d = new Date(GRASS_START[0], GRASS_START[1], GRASS_START[2] + i);
        if (i >= LEVELS.length) { const e = figma.createFrame(); e.name = '빈 칸'; e.fills = []; e.resize(CELL, CELL); wk.appendChild(e); continue; }
        const cell = cellRect(Number(LEVELS[i]), `${d.getMonth() + 1}/${d.getDate()}`); wk.appendChild(cell);
        if (i === LEVELS.length - 1) { cell.name = '오늘'; stroke(cell, 'text-2', 1.5); cell.strokeAlign = 'OUTSIDE'; }
        if (d.getMonth() === 10 && d.getDate() === 27 && d.getFullYear() === 2026) hover = cell;
        if (r === 0 && d.getMonth() !== lastMonth && d.getDate() <= 7) { slot.appendChild(await text(`${d.getMonth() + 1}월`, 'Caption/12', 'text-3')); lastMonth = d.getMonth(); }
      }
    }
    // 아래: 범례와 오늘의 질문
    const foot = al('H', { name: '아래', gap: 16, cross: 'center' }); put(rc, foot, { fill: true });
    const legend = al('H', { name: '범례', gap: 6, cross: 'center' }); foot.appendChild(legend);
    legend.appendChild(await text('적게', 'Caption/12', 'text-3'));
    const shades = al('H', { name: '진하기', gap: 5, cross: 'center' }); legend.appendChild(shades); for (let l = 0; l <= 4; l++) shades.appendChild(cellRect(l, `진하기 ${l}`));
    legend.appendChild(await text('많이', 'Caption/12', 'text-3'));
    spacer(foot);
    const cta = al('H', { name: '오늘의 질문', gap: 12, cross: 'center' }); foot.appendChild(cta);
    cta.appendChild(await text('오늘 기록하면 21일째예요.', 'Small/13.5', 'text-2')); cta.appendChild(btn('오늘의 질문 답하기', 'Secondary', 'Small', 'calendar'));
    return hover;
  }

  // 내 역량: 레이더 (그림은 SVG, 이름과 카드 수는 글자)
  async function skillsBlock(col) {
    await sectionTitle(col, '내 역량', '경험 타임라인');
    const sk = al('V', { name: '내 역량', gap: 16, pad: 24, fill: 'surface-2', radius: 'radius/lg', cross: 'center' }); put(col, sk, { fill: true });
    const W0 = 600, H0 = 452, CX = 300, CY = 226, R = 150, N = SKILLS.length, TOPV = 8, RINGS = 4;
    const at = (i, v) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / N; return [CX + Math.cos(a) * R * v, CY + Math.sin(a) * R * v]; };
    const poly = (fn) => SKILLS.map((k, i) => at(i, fn(k)).map((x) => x.toFixed(1)).join(',')).join(' ');
    const C = COLORS;
    let s = `<svg width="${W0}" height="${H0}" viewBox="0 0 ${W0} ${H0}" xmlns="http://www.w3.org/2000/svg" fill="none">`;
    s += `<polygon points="${poly(() => 1)}" fill="${C.surface}"/>`;
    for (let j = 1; j <= RINGS; j++) s += `<polygon points="${poly(() => j / RINGS)}" stroke="${C['border-strong']}" stroke-width="1" ${j === RINGS ? '' : 'stroke-dasharray="3 4"'}/>`;
    SKILLS.forEach((k, i) => { const [x, y] = at(i, 1); s += `<line x1="${CX}" y1="${CY}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${C.border}" stroke-width="1"/>`; });
    s += `<polygon points="${poly((k) => k[1] / TOPV)}" fill="${C.primary}" fill-opacity="0.2" stroke="${C['primary-strong']}" stroke-width="2.5" stroke-linejoin="round"/>`;
    SKILLS.forEach((k, i) => { const [x, y] = at(i, k[1] / TOPV); s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" fill="${C['primary-strong']}" stroke="${C.surface}" stroke-width="2"/>`; });
    s += '</svg>';
    const fig = figma.createFrame(); fig.name = '레이더'; fig.fills = []; fig.clipsContent = false; fig.resize(W0, H0); sk.appendChild(fig);
    const chart = bindSvg(figma.createNodeFromSvg(s)); chart.name = '그림'; fig.appendChild(chart); chart.x = 0; chart.y = 0;
    for (const [i, [name, n]] of SKILLS.entries()) {
      const [x, y] = at(i, 1.1); const dx = x - CX; const side = Math.abs(dx) < 8 ? (y < CY ? 'top' : 'bottom') : dx > 0 ? 'start' : 'end';
      const lb = al('V', { name, pad: [2, 4], cross: side === 'start' ? 'start' : side === 'end' ? 'end' : 'center' }); fig.appendChild(lb);
      lb.appendChild(await text(name, 'Small/13.5 Semibold', 'text')); lb.appendChild(await text(`${n}장`, n ? 'Small/13.5 Semibold' : 'Small/13.5 Medium', n ? 'text-2' : 'text-3'));
      lb.x = Math.round(side === 'start' ? x : side === 'end' ? x - lb.width : x - lb.width / 2); lb.y = Math.round(side === 'top' ? y - lb.height : side === 'bottom' ? y : y - lb.height / 2);
    }
    const none = SKILLS.filter((k) => !k[1]).map((k) => k[0]).join(', ');
    await tput(sk, `역량마다 그 역량이 담긴 경험 카드 수예요. 이름을 누르면 그 카드들을 볼 수 있어요. 아직 카드가 없는 역량: ${none}`, 'Small/13.5', 'text-3', { wrap: true });
  }

  async function chatsBlock(col) {
    await sectionTitle(col, '이어서 대화하기', '전체 보기');
    const list = listBox(col, '대화방');
    for (const [t, p] of RECENT) { const r = inst('Home/Chat row', { Title: t, Project: p }); r.name = t; put(list, r, { fill: true }); }
    lastRow(list);
  }

  // 홈 전체 → { screen, hover(11월 27일 칸) }
  async function home(frame) {
    const { screen, main } = shell(frame, 'Home');
    const col = await page(main, { narrow: true, title: '홈', actions: [btn('AI 채팅 시작', 'Primary', 'Medium', 'chat')] });
    const hover = await recordBlock(col); gap(col, 40);
    await skillsBlock(col); gap(col, 40);
    await chatsBlock(col);
    fit(frame, screen);
    return { screen, hover };
  }

  SCREENS.push({ group: '홈', title: '홈', build: async (frame) => { await home(frame); } });

  SCREENS.push({ group: '홈', title: '처음', build: async (frame) => {
    const { screen, main } = shell(frame, 'Home', { trash: 0 });
    const col = await page(main, { narrow: true });
    const e = al('V', { name: '빈 화면', gap: 4, pad: [96, 20, 40, 20], cross: 'center' }); put(col, e, { fill: true });
    await tput(e, '첫 프로젝트를 만들어 보세요', 'Heading/26', 'text', { align: 'center' });
    await tput(e, '팀 과제, 동아리, 아르바이트도 프로젝트예요.', 'Body/15', 'text-2', { align: 'center' });
    gap(e, 14); e.appendChild(btn('새 프로젝트', 'Primary', 'Large', 'plus'));
    fit(frame, screen);
  } });

  SCREENS.push({ group: '홈', title: '계정 메뉴', build: async (frame) => {
    const { screen } = await home(frame);
    const acct = screen.findOne((n) => n.name === 'account'); acct.fills = fills('surface-3'); // 누른 계정 줄
    const m = menuUnder(frame, acct, [{ label: '설정', icon: 'settings' }, { label: '로그아웃', icon: 'logout' }],
      { w: SIDEBAR_W - 24, align: 'start', up: true, gap: 6, at: (mm) => [12, frame.height - 12 - 58 - 6 - mm.height] }); // 계정 줄 위로 연다
    m.name = '계정 메뉴';
  } });

  SCREENS.push({ group: '홈', title: '잔디 툴팁', build: async (frame) => {
    const { hover } = await home(frame);
    const t = tooltip(frame, '11월 27일 기록 2개', [0, 0]);
    const b = boxIn(hover, frame) || { x: 1202, y: 283, w: 10 }; // 계산할 수 없을 때: 마지막 주 금요일 칸 (내용 열 518 + 안쪽 20 + 요일 28 + 53주)
    t.x = Math.round(b.x + b.w / 2 - t.width / 2); t.y = Math.round(b.y - t.height - 6);
  } });
}
