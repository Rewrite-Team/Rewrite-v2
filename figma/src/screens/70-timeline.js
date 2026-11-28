/* 경험 타임라인 (#/timeline, prototype/js/screens/timeline.js + css/screens/timeline.css)
   왼쪽에서 오른쪽으로 시간. 프로젝트는 가지(주황 선), 카드는 그 달에서 갈라져 나온 잔가지.
   화면: 경험 타임라인 · 경험 타임라인 / 역량으로 거르기 · 경험 타임라인 / 처음
   그림은 앱의 SVG 좌표(G, 달 폭 MW)를 그대로 따른다. 선과 점은 토큰 색, 이름은 텍스트 스타일 */
{
  const G = { left: 28, right: 300, top: 52, head: 30, row: 30, gap: 30, minMW: 16, maxMW: 64 };
  const NOW = 2026 * 12 + 10; // 2026년 11월
  const ym = (s) => { const [y, m] = s.split('-').map(Number); return y * 12 + m - 1; };
  // 예시 계정의 프로젝트와 카드 (data.js + seed-repos.js). 시작한 순서대로
  const PROJECTS = [
    { name: '편의점 야간 아르바이트', start: '2023-07', end: '2023-12', cards: [['2023-07', '재고 실수 줄이기', ['실행력', '추진력']]] },
    { name: '카페 아르바이트', start: '2024-03', end: '2025-02', cards: [['2024-03', '주문 대기 줄 줄이기', ['기획력', '분석적 사고', '추진력']]] },
    { name: '빈강의실', start: '2025-03', end: '2025-06', cards: [
      ['2025-03', 'PDF 시간표 파싱으로 강의실 데이터 만들기', ['문제 해결력', '의사결정 능력', '실행력']],
      ['2025-04', '중복 예약 버그 해결', ['문제 해결력', '실행력', '분석적 사고']],
      ['2025-04', '일정이 밀렸을 때 기능 범위 조율', ['커뮤니케이션', '리더십']],
      ['2025-04', '빈 강의실 검색 쿼리와 복합 인덱스', ['분석적 사고', '문제 해결력']],
      ['2025-05', '사용자 테스트로 예약 동선 고치기', ['기획력']]] },
    { name: '알고리즘 스터디', start: '2025-03', end: '2025-12', cards: [
      ['2025-03', '흐지부지되던 스터디 참여율 되살리기', ['리더십', '커뮤니케이션', '도전정신']],
      ['2025-06', '발표 순서 교체 규칙으로 빈자리 줄이기', ['리더십', '추진력']]] },
    { name: '교내 해커톤', start: '2025-05', end: '2025-05', cards: [
      ['2025-05', '24시간 해커톤에서 MVP 범위 줄이기', ['의사결정 능력', '협업능력', '커뮤니케이션']],
      ['2025-05', '발표 중 데모가 멈출 때를 대비한 녹화본 준비', ['실행력', '기획력']]] },
    { name: '데이터베이스 팀과제', start: '2025-09', end: '2025-12', cards: [['2025-09', '연락 끊긴 팀원과 역할 재분배', ['커뮤니케이션', '실행력', '협업능력']]] },
    { name: '모여봄', start: '2026-09', ongoing: true, cards: [
      ['2026-09', 'JWT + Refresh Token 인증 설계', ['의사결정 능력', '커뮤니케이션', '실행력']],
      ['2026-10', '검색 API 응답 속도 개선 (N+1)', ['문제 해결력', '분석적 사고', '학습능력']],
      ['2026-10', '프론트와 API 명세 먼저 합의하기', ['협업능력', '추진력', '커뮤니케이션']],
      ['2026-10', 'Redis 캐시로 인기 모임 목록 조회 개선', ['문제 해결력', '의사결정 능력']],
      ['2026-10', '모임 정원 초과 참여를 비관적 락으로 방지', ['문제 해결력', '실행력']],
      ['2026-11', '배포 후 업로드 500 에러와 배포 체크리스트', ['문제 해결력', '실행력']]] },
    { name: '슬랙봇', start: '2026-10', ongoing: true, cards: [
      ['2026-10', '쓰는 사람에 맞춰 슬랙 봇과 Postgres 고르기', ['의사결정 능력', '기획력']],
      ['2026-11', '지출이 두 번씩 저장되던 문제 해결', ['문제 해결력', '도전정신', '학습능력']]] },
  ];
  const OPEN = new Set(['모여봄', '빈강의실']); // 펼친 프로젝트 (나머지는 접어 둔 모습)
  const short = (t) => (t.length > 26 ? `${t.slice(0, 25)}…` : t);

  /* ---------- 이 화면의 컴포넌트 ---------- */
  EXTRA_COMPONENTS.push({ title: '경험 타임라인', build: async (row) => {
    // 카드 잔가지 끝: 굽은 가지 + 점 + 이름. 인스턴스를 (카드 달의 x - 0.75, 줄 가운데 - 12)에 놓고, 가지 위쪽(줄기)은 화면에서 선으로 잇는다
    await makeSet(row, 'Timeline/Twig', ['Default', 'Hit', 'Dim'].map((k) => ({ props: { State: k }, build: async (c) => {
      auto(c, 'H', { h: 24, cross: 'center', opacity: k === 'Dim' ? 0.28 : 1 });
      const hold = figma.createFrame(); hold.name = 'elbow'; hold.fills = []; hold.clipsContent = false; hold.resize(10, 24); c.appendChild(hold);
      const el = figma.createFrame(); el.name = 'twig'; el.fills = []; el.resize(10, 12.75); stroke(el, k === 'Hit' ? 'primary-strong' : 'primary-light', k === 'Hit' ? 2.2 : 1.8, ['left', 'bottom']); el.bottomLeftRadius = 9; hold.appendChild(el); el.x = 0; el.y = 0;
      const pill = al('H', { name: 'card', gap: 6, pad: [0, 6, 0, 4], h: 24, cross: 'center', fill: k === 'Hit' ? 'primary-tint' : null, radius: 'radius/pill' }); c.appendChild(pill);
      const dot = figma.createEllipse(); dot.name = 'dot'; dot.resize(10, 10); dot.fills = [paint(k === 'Hit' ? 'primary-strong' : 'surface')]; stroke(dot, k === 'Hit' ? 'primary-ink' : 'primary-strong', 2); pill.appendChild(dot);
      pill.appendChild(named(await text('카드 이름', k === 'Hit' ? 'Small/13.5 Semibold' : 'Small/13.5 Medium', k === 'Hit' ? 'text' : 'text-2'), 'tw-name'));
    } })), { dir: 'H', desc: '타임라인의 카드 한 장. Hit: 고른 역량이 담긴 카드(연한 주황 알약), Dim: 고른 역량이 없는 카드', props: [{ name: 'Name', type: 'TEXT', default: '카드 이름', node: 'tw-name' }] });
    // 프로젝트 이름과 접기 단추. 인스턴스를 (시작 x - 8, 가지 y - 28)에 놓는다
    await makeSet(row, 'Timeline/Project', ['Open', 'Folded'].map((k) => ({ props: { Fold: k }, build: async (c) => {
      auto(c, 'H', { gap: 3, cross: 'center' });
      const b = al('H', { name: 'fold', w: 20, h: 22, main: 'center', cross: 'center', radius: 8 }); c.appendChild(b);
      b.appendChild(icon(k === 'Open' ? 'chevron-down' : 'chevron-right', 14, 'text-3'));
      c.appendChild(named(await text('프로젝트', 'Small/13.5 Semibold', 'text'), 'tp-name'));
    } })), { dir: 'H', desc: '타임라인의 프로젝트 이름(누르면 프로젝트로)과 왼쪽 접기 단추. Folded: 카드를 접어 둔 모습', props: [{ name: 'Name', type: 'TEXT', default: '프로젝트', node: 'tp-name' }] });
  } });

  /* ---------- 그리기 ---------- */
  const rect = (parent, name, x, y, w, h, color, o = {}) => {
    const r = figma.createRectangle(); r.name = name; r.resize(Math.max(0.01, w), Math.max(0.01, h)); r.fills = [paint(color)]; if (o.radius) r.cornerRadius = o.radius; if (o.opacity != null) r.opacity = o.opacity;
    parent.appendChild(r); r.x = x; r.y = y; return r;
  };
  const dotAt = (parent, name, cx, cy, r, color, o = {}) => {
    const d = figma.createEllipse(); d.name = name; d.resize(r * 2, r * 2); d.fills = [paint(color)]; if (o.stroke) { stroke(d, o.stroke, o.sw || 2); d.strokeAlign = 'OUTSIDE'; }
    parent.appendChild(d); d.x = cx - r; d.y = cy - r; return d;
  };
  const place = async (parent, chars, style, color, x, y, o = {}) => { const t = await text(chars, style, color, o); parent.appendChild(t); t.x = x; t.y = y; return t; };

  // 캔버스(무대) 하나: { canvas, cards: { 카드 이름: 인스턴스 } }
  async function canvasOf(main, kw) {
    const width = 1684 - 16;
    const first = Math.min(...PROJECTS.map((p) => ym(p.start))) - 1; const last = NOW + 1; const months = last - first + 1;
    const MW = Math.max(G.minMW, Math.min(G.maxMW, (width - G.left - G.right) / months));
    const x = (m) => G.left + (m - first) * MW + MW / 2;
    // 높이 먼저
    let H = G.top; for (const p of PROJECTS) H += G.head + (OPEN.has(p.name) ? G.row * p.cards.length : 0) + G.gap; H += 8;
    const cv = figma.createFrame(); cv.name = '타임라인'; cv.fills = []; cv.clipsContent = true; cv.resize(1684, H); put(main, cv);
    const axis = figma.createFrame(); axis.name = '눈금'; axis.fills = []; axis.clipsContent = false; axis.resize(width, H); cv.appendChild(axis);
    for (let m = first; m <= last; m++) {
      if (!(m % 12 === 0 || m === first)) continue;
      const gx = x(m) - MW / 2; rect(axis, `${Math.floor(m / 12)}년 눈금`, gx, G.top - 22, 1, H - (G.top - 22), 'border');
      await place(axis, `${Math.floor(m / 12)}년`, 'Caption/12 Semibold', 'text-3', gx + 6, G.top - 28 - 12);
    }
    const nx = x(NOW);
    const now = figma.createFrame(); now.name = '지금 선'; now.fills = []; now.resize(1, H - (G.top - 22)); stroke(now, 'primary-light', 1.5, ['left']); now.dashPattern = [3, 4]; axis.appendChild(now); now.x = nx; now.y = G.top - 22;
    await place(axis, '지금', 'Caption/12 Semibold', 'primary-ink', nx - 20, G.top - 28 - 12, { w: 40, align: 'center' });

    const cards = {}; let y = G.top;
    for (const p of PROJECTS) {
      y += G.head; const ly = y; const xs = x(ym(p.start)); const end = p.ongoing ? NOW : ym(p.end); const xe = x(end) + (p.ongoing ? MW / 2 : 0);
      const open = OPEN.has(p.name);
      const g = figma.createFrame(); g.name = p.name; g.fills = []; g.clipsContent = false; g.resize(width, 1); cv.appendChild(g); g.x = 0; g.y = 0;
      // 가지
      rect(g, '가지', xs, ly - 1.75, Math.max(3.5, xe - xs), 3.5, 'primary-strong', { radius: 1.75 });
      if (p.ongoing) {
        const tail = al('H', { name: '진행 중', gap: 5, cross: 'center', opacity: 0.6 }); g.appendChild(tail); tail.x = xe + 4; tail.y = ly - 1.75;
        for (let i = 0; i < Math.floor(MW / 7); i++) { const d = figma.createRectangle(); d.name = 'dash'; d.resize(2, 3.5); d.cornerRadius = 1.75; d.fills = [paint('primary-strong')]; tail.appendChild(d); }
      } else dotAt(g, '끝', xe, ly, 4, 'primary-strong');
      const hits = kw ? p.cards.filter((c) => c[2].includes(kw)) : [];
      if (!open) {
        for (const c of p.cards) { const hit = kw && c[2].includes(kw); dotAt(g, `갈래: ${c[1]}`, x(ym(c[0])), ly, hit ? 4.5 : 3, hit ? 'primary-tint' : 'primary-strong', hit ? { stroke: 'primary-ink', sw: 2 } : {}); }
        await place(g, `카드 ${p.cards.length}장${hits.length ? `, 그중 「${kw}」 ${hits.length}장` : ''}`, 'Caption/12', 'text-3', xe + (p.ongoing ? MW : 0) + 12, ly - 8);
        y = ly + G.gap;
      } else {
        p.cards.forEach((c, k) => {
          const cy = ly + G.row * (k + 1); const cx = x(ym(c[0])); const hit = !kw || c[2].includes(kw);
          const state = kw ? (hit ? 'Hit' : 'Dim') : 'Default';
          rect(g, '줄기', cx - 0.75, ly, 1.5, cy - 12 - ly, state === 'Hit' ? 'primary-strong' : 'primary-light', { opacity: state === 'Dim' ? 0.28 : 1 });
          const tw = inst('Timeline/Twig', { State: state, Name: short(c[1]) }); tw.name = c[1]; g.appendChild(tw); tw.x = cx - 0.75; tw.y = cy - 12;
          cards[c[1]] = { node: tw, card: c, project: p.name };
        });
        for (const c of p.cards) dotAt(g, '갈래', x(ym(c[0])), ly, 2.5, 'primary-strong');
        y = ly + G.row * p.cards.length + G.gap;
      }
      dotAt(g, '시작', xs, ly, 5, 'primary-strong', { stroke: 'surface', sw: 2 });
      const head = inst('Timeline/Project', { Fold: open ? 'Open' : 'Folded', Name: p.name }); head.name = `${p.name} 이름`; g.appendChild(head); head.x = xs - 8; head.y = ly - 28;
    }
    return { canvas: cv, cards };
  }

  async function toolbar(main, kw) {
    const bar = al('H', { name: '도구', gap: 12, pad: [16, 40, 8, 40], cross: 'center' }); put(main, bar, { fill: true });
    const sel = inst('Select', { Text: kw || '모든 역량' }); sel.resize(160, sel.height); bar.appendChild(sel);
    if (kw) bar.appendChild(await text(`「${kw}」 역량이 담긴 카드 3장`, 'Small/13.5', 'text-2'));
    bar.appendChild(btn('모두 펴기', 'Ghost', 'Small'));
    spacer(bar); bar.appendChild(btn('다시 보기', 'Ghost', 'Small', 'restore'));
  }

  async function timeline(frame, kw) {
    const { screen, main } = shell(frame, 'Timeline');
    await titleBar(main, '경험 타임라인');
    await toolbar(main, kw);
    const r = await canvasOf(main, kw);
    fit(frame, screen);
    return r;
  }

  SCREENS.push({ group: '경험 타임라인', title: '경험 타임라인', build: async (frame) => { await timeline(frame, ''); } });

  SCREENS.push({ group: '경험 타임라인', title: '역량으로 거르기', build: async (frame) => {
    const { cards } = await timeline(frame, '리더십');
    // 카드에 올렸을 때: 제목, 프로젝트, 달, 역량 (고른 역량은 주황)
    const c = cards['일정이 밀렸을 때 기능 범위 조율'];
    const tip = al('V', { name: '카드 툴팁', gap: 2, pad: [12, 14], fill: 'surface', stroke: 'border', radius: 'radius/md', maxW: 280 }); shadow(tip, 'Menu'); frame.appendChild(tip);
    await tput(tip, c.card[1], 'Small/13.5 Semibold', 'text'); await tput(tip, c.project, 'Small/13.5', 'text-2');
    const [yy, mm] = c.card[0].split('-').map(Number); await tput(tip, `${yy}년 ${mm}월`, 'Small/13.5', 'text-2');
    const kws = al('H', { name: '역량', gap: 6, pad: [6, 0, 0, 0], wrap: true, cross: 'center' }); kws.counterAxisSpacing = 6; tip.appendChild(kws);
    for (const k of c.card[2]) kws.appendChild(inst('Keyword', { State: k === '리더십' ? 'Selected' : 'Default', Label: k }));
    const dot = c.node.findOne((n) => n.name === 'dot');
    const b = boxIn(dot, frame) || { x: SIDEBAR_W + c.node.x + 6, y: 56 + 56 + c.node.y + 7, h: 10 }; // 계산할 수 없을 때: 왼쪽 메뉴 + 잔가지 자리, 상단바 · 도구 줄 아래
    tip.x = Math.round(b.x - 8); tip.y = Math.round(b.y + b.h + 10);
  } });

  SCREENS.push({ group: '경험 타임라인', title: '처음', build: async (frame) => {
    const { screen, main } = shell(frame, 'Timeline', { trash: 0 });
    await titleBar(main, '경험 타임라인');
    const col = await page(main, {});
    await empty(col, '아직 경험 카드가 없어요', 'AI와 이야기하면 카드가 만들어지고, 여기에서 시간에 따라 뻗어 나가는 모습을 볼 수 있어요.', [btn('AI 채팅 시작', 'Primary', 'Medium', 'chat')]);
    fit(frame, screen);
  } });
}
