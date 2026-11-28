/* AI 채팅 (#/chat, #/chat/:room, #/chat/new?…): 대화방 목록(프로젝트마다 맨 위에 「오늘의 질문」), 대화방, 오른쪽 경험 카드.
   앱: prototype/js/screens/chat.js, js/chat.js, js/repo-flow.js (css/screens/chat.css)
   내용: 예시 계정 김준호 (prototype/js/data.js, seed-replies.js 「AI 답변 종류 모아 보기」, seed-daily.js, seed-repos.js). 오늘은 2026년 11월 28일
   틀(1920): 왼쪽 메뉴 236 + 대화방 목록 252 + 대화방 1072 + 경험 카드 360. 프로젝트가 없는 화면은 경험 카드 없이 대화방이 넓어진다 */

(() => { // 이 파일의 이름이 다른 화면 파일과 겹치지 않도록 한 스코프에 둔다

/* ---------- 예시 계정 데이터 ---------- */
const KW_GAP = '    '; // 역량 사이 (앱의 칩 사이 틈)
const TREE_W = 252, PANEL_W = 360, COL_W = 760;
// 대화방 목록: 진행 중인 프로젝트 먼저. 프로젝트마다 5개(오늘의 질문 포함)까지 보이고 나머지는 「N개 더 보기」
const MOYEOBOM_ROOMS = [['AI 답변 종류 모아 보기', '09:00'], ['배포 후 업로드 500 에러와 배포 체크리스트', '11/19'], ['GitHub에서 찾은 경험', '11/18'], ['JWT + Refresh Token 인증 설계', '11/18']];
const TREE = [
  { name: '모여봄', gh: true, ongoing: true, rooms: MOYEOBOM_ROOMS, more: 2 },
  { name: '슬랙봇', gh: false, ongoing: true, rooms: [['AI 답변 종류: GitHub 연결 전', '08:59'], ['지출이 두 번씩 저장되던 문제 해결', '11/6'], ['쓰는 사람에 맞춰 슬랙 봇과 Postgres 고르기', '11/4']] },
  { name: '빈강의실', gh: true, rooms: [['GitHub에서 찾은 경험', '11/14'], ['사용자 테스트로 예약 동선 고치기', '11/13'], ['빈강의실 개발 이야기', '11/12']] },
  { name: '카페 아르바이트', rooms: [['주문 대기 줄 줄이기', '11/11']] },
  { name: '편의점 야간 아르바이트', rooms: [['재고 실수 줄이기', '11/17']] },
  { name: '알고리즘 스터디', rooms: [['흐지부지되던 스터디 참여율 되살리기', '11/17'], ['발표 순서 교체 규칙으로 빈자리 줄이기', '10/27']] },
  { name: '데이터베이스 팀과제', rooms: [['연락 끊긴 팀원과 역할 재분배', '11/15']] },
  { name: '교내 해커톤', rooms: [['24시간 해커톤에서 MVP 범위 줄이기', '11/16'], ['발표 중 데모가 멈출 때를 대비한 녹화본 준비', '11/3']] },
];
// 모여봄의 경험 카드 (새 카드가 위로: g2, g1, e11, e10, e8, e1). star: [상황, 과제, 행동, 결과]
const JWT_RESULT = '팀이 같은 기준으로 인증 방식을 합의했고, 탈취된 Refresh Token은 한 번만 쓰일 수 있게 막음.';
const JWT_LOGOUT = '로그아웃하면 Redis에서 토큰을 바로 지워 다른 기기의 세션도 끊김.';
const JWT_ACTION = '모바일 앱 확장 가능성을 기준으로 세션과 JWT의 장단점을 표로 비교해 공유하고, JWT + Refresh Token으로 결정함. 토큰 탈취 걱정에는 Refresh Token을 Redis에 사용자별로 저장하고 재발급할 때마다 새 토큰으로 바꾸는 방식으로 답함.';
const CARDS = {
  g2: { title: '모임 정원 초과 참여를 비관적 락으로 방지', line: '동시 참여 시 정원 초과를 비관적 락(대기 3초 제한)으로 막고 동시 참여 테스트로 검증', kws: ['문제 해결력', '실행력'] },
  g1: { title: 'Redis 캐시로 인기 모임 목록 조회 개선', line: '인기 모임 목록에 Redis 캐시(TTL 5분)를 적용해 메인 화면 진입 시 반복되는 DB 조회 개선', kws: ['문제 해결력', '의사결정 능력'],
    star: ['홈 화면에 들어올 때마다 인기 모임 목록을 DB에서 다시 조회하고 있었음.', '「인기 모임 목록 캐시 적용」(PR #42) 작업을 맡음.', '인기 모임 조회에 @Cacheable을 적용해 지역 코드별로 Redis에 캐시하고 TTL을 5분으로 설정함. 모임이 새로 생기거나 마감되면 @CacheEvict로 해당 지역 캐시를 비우게 함.', ''] },
  e11: { title: '배포 후 업로드 500 에러와 배포 체크리스트', line: '배포 후 발생한 업로드 500 에러의 원인(파일 크기 제한 누락)을 찾고 배포 체크리스트 도입', kws: ['문제 해결력', '실행력'] },
  e10: { title: 'JWT + Refresh Token 인증 설계', line: '모바일 확장을 고려해 JWT + Refresh Token 인증 구조를 설계하고, 세션 방식과의 장단점을 팀에 공유', kws: ['의사결정 능력', '커뮤니케이션', '실행력'],
    star: ['「모여봄」 인증 방식을 정해야 했는데 팀원마다 세션과 JWT 의견이 갈림.', '인증 담당으로 팀이 납득할 수 있는 근거를 갖고 방식을 정해야 했음.', JWT_ACTION, `${JWT_RESULT} ${JWT_LOGOUT}`] },
  e8: { title: '프론트와 API 명세 먼저 합의하기', line: '구현 전 Swagger 명세를 프론트와 먼저 합의하는 규칙을 제안해 응답 형식 변경으로 인한 재작업 감소', kws: ['협업능력', '추진력', '커뮤니케이션'] },
  e1: { title: '검색 API 응답 속도 개선 (N+1)', line: '모임 검색 API의 N+1 쿼리를 fetch join과 복합 인덱스로 해결해 평균 응답 시간 1.8s → 0.3s 단축', kws: ['문제 해결력', '분석적 사고', '학습능력'] },
};
const MOYEOBOM_CARDS = ['g2', 'g1', 'e11', 'e10', 'e8', 'e1'];
const STAR = ['상황', '과제', '행동', '결과'];
const STEPS = ['레포 정보 불러오는 중', '커밋·PR 읽는 중', '파일 구조 살펴보는 중', '코드 읽는 중', '경험 카드로 정리하는 중']; // github.js STEPS
const DEPLOY = [[14, '    steps:'], [15, '      - uses: actions/checkout@v4'], [16, '      - uses: actions/setup-java@v4'], [17, '        with:'], [18, '          distribution: temurin'], [19, "          java-version: '17'"], [20, '      - name: Test'], [21, '        run: ./gradlew test'], [22, '      - name: Build & push image'], [23, '        run: |'], [24, '          docker build -t ${{ secrets.DOCKER_REPO }}/moyeobom:${{ github.sha }} .'], [25, '          docker push ${{ secrets.DOCKER_REPO }}/moyeobom:${{ github.sha }}'], [26, '      - name: Deploy to EC2'], [27, '        uses: appleboy/ssh-action@v1'], [28, '        with:'], [29, '          host: ${{ secrets.EC2_HOST }}'], [30, '          script: cd ~/moyeobom && IMAGE_TAG=${{ github.sha }} docker compose up -d']];
const COMPOSE = [[1, 'services:'], [2, '  app:'], [3, '    image: ${DOCKER_REPO}/moyeobom:${IMAGE_TAG}'], [4, '    ports: ["8080:8080"]'], [5, '    env_file: .env'], [6, '    depends_on: [mysql, redis]'], [7, '  mysql:'], [8, '    image: mysql:8.0'], [9, '    volumes: ["mysql-data:/var/lib/mysql"]'], [10, '  redis:'], [11, '    image: redis:7-alpine']];
const PH = { room: '이야기를 이어서 적어 주세요', daily: '오늘의 질문에 답해 주세요. 한 줄이어도 괜찮아요', guide: '예: 검색 API가 느려서 고쳤어요', connect: '한 줄이어도 괜찮아요' };

/* ---------- 이 화면 파일의 컴포넌트 ---------- */
EXTRA_COMPONENTS.push({
  title: 'AI 채팅: 묻기, 레포 분석, 펼친 카드',
  build: async (row) => {
    // 묻기 상자의 한 칸: 칸 이름, 원래 글, 더한 글(기다리는 중에는 형광펜)
    await makeSet(row, 'Chat/Diff row', ['Wait', 'Closed'].map((k) => ({ props: { Tone: k }, build: async (c) => {
      const wait = k === 'Wait';
      auto(c, 'V', { gap: 2, w: 600 });
      c.appendChild(named(await text('행동', 'Small/13.5 Semibold', 'text-3'), 'field'));
      const b = named(await text('원래 글', 'Body/15', wait ? 'text' : 'text-2'), 'before'); c.appendChild(b); b.layoutSizingHorizontal = 'FILL'; b.textAutoResize = 'HEIGHT';
      const a = al('H', Object.assign({ name: 'added' }, wait ? { pad: [1, 3], fill: 'hl', radius: MARK_RADIUS } : {})); c.appendChild(a); a.layoutSizingHorizontal = 'FILL';
      const t = named(await text('더한 글', 'Body/15', wait ? 'text' : 'text-2'), 'addedText'); a.appendChild(t); t.layoutSizingHorizontal = 'FILL'; t.textAutoResize = 'HEIGHT';
    } })), { dir: 'H', desc: '카드를 바꾸기 전에 묻는 상자의 한 칸. Wait: 더한 글에 형광펜. Closed(답한 뒤): 흐린 글, 형광펜 없음', props: [
      { name: 'Field', type: 'TEXT', default: '행동', node: 'field' }, { name: 'Before', type: 'TEXT', default: '원래 글', node: 'before' }, { name: 'Show before', type: 'BOOLEAN', default: true, node: 'before' },
      { name: 'Added', type: 'TEXT', default: '더한 글', node: 'addedText' }, { name: 'Show added', type: 'BOOLEAN', default: true, node: 'added' }] });

    // 묻기 상자: 바뀔 칸(최대 4) + 단추 또는 결과. 칸은 노출한 안쪽 「row 1」… 인스턴스를 setNested 로 채운다
    const DONE = { Ok: ['check', '허용했어요'], No: ['close', '거절했어요'], Fail: ['warning', '반영하지 못했어요'] };
    await makeSet(row, 'Chat/Confirm', ['Wait', 'Ok', 'No', 'Fail'].map((k) => ({ props: { State: k }, build: async (c) => {
      const wait = k === 'Wait';
      auto(c, 'V', { gap: 12, pad: [14, 16], w: 640, fill: wait ? 'surface' : null, stroke: 'border-strong', radius: 'radius/md' });
      if (!wait) c.dashPattern = [4, 4];
      const rows = al('V', { name: 'rows', gap: 10 }); c.appendChild(rows); rows.layoutSizingHorizontal = 'FILL';
      for (let n = 1; n <= 4; n++) { const r = expose(rows, named(inst('Chat/Diff row', { Tone: wait ? 'Wait' : 'Closed' }), `row ${n}`)); r.layoutSizingHorizontal = 'FILL'; }
      if (wait) {
        const f = al('H', { name: 'actions', gap: 8, wrap: true }); c.appendChild(f);
        const yes = btn('반영하기', 'Primary', 'Small', 'check'); yes.name = 'allow'; f.appendChild(yes);
        f.appendChild(btn('항상 허용', 'Secondary', 'Small')); f.appendChild(btn('거절', 'Ghost', 'Small'));
      } else {
        const st = al('H', { name: 'status', gap: 6, cross: 'center' }); c.appendChild(st);
        st.appendChild(icon(DONE[k][0], 15, 'text-3')); st.appendChild(await text(DONE[k][1], 'Small/13.5', 'text-3'));
      }
    } })), { desc: '카드를 바꾸기 전에 묻는 답. Wait: 흰 바탕 + 반영하기·항상 허용·거절 (새 카드는 안의 allow 단추를 「만들기」로). 답한 뒤(Ok·No·Fail)는 점선 테두리와 결과 한 줄', props: [
      { name: 'Show row 2', type: 'BOOLEAN', default: true, node: 'row 2' }, { name: 'Show row 3', type: 'BOOLEAN', default: false, node: 'row 3' }, { name: 'Show row 4', type: 'BOOLEAN', default: false, node: 'row 4' }] });

    // 오른쪽 펼친 카드의 한 칸
    await makeSet(row, 'Chat/Card field', ['Default', 'Changed', 'Blank', 'Keywords'].map((k) => ({ props: { State: k }, build: async (c) => {
      auto(c, 'V', { gap: 4, pad: [12, 8], w: 304, fill: k === 'Changed' ? 'hl-soft' : null, stroke: 'border-strong', sides: ['top'] });
      c.appendChild(named(await text('상황', 'Small/13.5 Semibold', 'text-3'), 'label'));
      if (k === 'Blank') {
        const b = al('H', { name: 'blank', pad: [6, 12], fill: 'surface-2', stroke: 'border-strong', radius: 'radius/sm' }); b.dashPattern = [4, 3]; c.appendChild(b); b.layoutSizingHorizontal = 'FILL';
        b.appendChild(await text('아직 비어 있어요', 'Small/13.5', 'text-3')); return;
      }
      const kw = k === 'Keywords';
      const v = named(await text('내용', kw ? 'Small/13.5 Medium' : 'Body/15', kw ? 'text-2' : 'text'), 'value'); c.appendChild(v); v.layoutSizingHorizontal = 'FILL'; v.textAutoResize = 'HEIGHT';
      if (k === 'Changed') {
        const m = al('H', { name: 'added', pad: [1, 3], fill: 'hl', radius: MARK_RADIUS }); c.appendChild(m); m.layoutSizingHorizontal = 'FILL';
        const t = named(await text('더한 글', 'Body/15', 'text'), 'addedText'); m.appendChild(t); t.layoutSizingHorizontal = 'FILL'; t.textAutoResize = 'HEIGHT';
      }
    } })), { desc: 'AI 채팅 오른쪽 펼친 카드의 한 칸(상황·과제·행동·결과·역량·이력서 한 줄). Changed: AI가 방금 바꾼 칸(연한 형광펜 바탕, 더한 글은 형광펜). Blank: 아직 비어 있어요', props: [
      { name: 'Label', type: 'TEXT', default: '상황', node: 'label' }, { name: 'Value', type: 'TEXT', default: '내용', node: 'value' },
      { name: 'Added', type: 'TEXT', default: '더한 글', node: 'addedText' }] });

    // 경험 카드 머리의 상태
    await makeSet(row, 'Chat/Panel status', ['Typing', 'Wait', 'Revert'].map((k) => ({ props: { State: k }, build: async (c) => {
      auto(c, 'H', { gap: 6, cross: 'center' });
      if (k === 'Revert') { c.appendChild(btn('되돌리기', 'Ghost', 'Small', 'restore')); return; }
      if (k === 'Typing') c.appendChild(spinner(14)); // 앱의 .chat-card-st .spinner
      else c.appendChild(icon('lock', 15, 'text-2'));
      c.appendChild(await text(k === 'Typing' ? '담는 중' : '허락을 기다려요', 'Small/13.5', 'text-2'));
    } })), { dir: 'H', desc: '오른쪽 경험 카드 머리의 상태. Typing: 담는 중, Wait: 허락을 기다려요, Revert: 방금 담은 것 되돌리기' });

    // 새 채팅 › 프로젝트 고르기의 한 줄
    await makeOne(row, 'Chat/Project choice', async (c) => {
      auto(c, 'H', { gap: 12, pad: [11, 8], w: 464, cross: 'center', stroke: 'border', sides: ['bottom'] }); c.minHeight = 56;
      c.appendChild(icon('folder', 18, 'text-3'));
      const t = named(await text('프로젝트', 'Body/15 Semibold', 'text'), 'name'); c.appendChild(t); t.layoutSizingHorizontal = 'FILL';
      c.appendChild(named(icon('github', 16, 'text-3'), 'github'));
    }, { desc: '「새 채팅」에서 프로젝트 고르기. 레포를 연결한 프로젝트는 GitHub 표시', props: [{ name: 'Name', type: 'TEXT', default: '프로젝트', node: 'name' }, { name: 'Show GitHub', type: 'BOOLEAN', default: false, node: 'github' }] });
  },
});

/* ---------- 작은 도구 ---------- */
// 내 말풍선 폭: 글 길이에 맞추되 최대 520 (한글 15, 빈칸 4, 영숫자 8.5)
function bubbleW(s) {
  let w = 0; for (const ch of s) w += /[가-힣]/.test(ch) ? 15 : ch === ' ' ? 4 : 8.5;
  return Math.min(520, Math.ceil(w) + 30);
}
const kwText = (kws) => kws.join(KW_GAP);

/* ---------- 왼쪽: 대화방 목록 ---------- */
// o: { active: { project, room } (room: 이름 | 'daily' | 'new'), rooms: { 프로젝트: { rooms, more } }, hover: 프로젝트, projects: 목록 바꾸기, noChats }
async function chatTree(parent, o = {}) {
  const list = o.projects || TREE; const act = o.active || {};
  const t = al('V', { name: '대화방 목록', w: TREE_W, fill: 'surface', clip: true }); put(parent, t, { fillV: true });
  const head = al('H', { name: '단추', gap: 8, pad: [16, 16, 12, 16] }); put(t, head, { fill: true });
  if (list.length) { put(head, btn('새 채팅', 'Primary', 'Medium', 'plus'), { fill: true }); put(head, btn('새 프로젝트', 'Secondary', 'Medium'), { fill: true }); }
  else put(head, btn('새 프로젝트', 'Primary', 'Medium', 'plus'), { fill: true });
  const nav = al('V', { name: '프로젝트별 채팅', gap: 12, pad: [4, 10, 24, 10] }); put(t, nav, { fill: true });
  if (!list.length) { const p = al('V', { name: '프로젝트 없음', pad: [8, 8] }); put(nav, p, { fill: true }); await tput(p, '프로젝트를 만들면 바로 이야기를 시작할 수 있어요.', 'Small/13.5', 'text-3', { wrap: true }); return t; }
  for (const p of list) {
    const over = (o.rooms || {})[p.name] || {}; const rooms = over.rooms || p.rooms; const more = 'more' in over ? over.more : p.more;
    const pj = al('V', { name: p.name }); put(nav, pj, { fill: true });
    const hover = o.hover === p.name;
    const pr = al('H', { name: '프로젝트 이름', gap: 6, pad: [4, 6], cross: 'center', minH: 38, radius: 'radius/sm', fill: hover ? 'surface-2' : null }); put(pj, pr, { fill: true });
    pr.appendChild(icon('chevron-down', 16, 'text-3')); pr.appendChild(await text(p.name, 'Small/13.5 Semibold', 'text'));
    if (p.gh) pr.appendChild(named(icon('github', 14, 'text-3'), 'GitHub 연결됨'));
    if (hover) { spacer(pr); pr.appendChild(inst('Icon button', { Size: 'Small', Icon: 'plus' })); const m = inst('Icon button', { Size: 'Small', Icon: 'more' }); m.name = '프로젝트 메뉴'; m.fills = fills('surface-3'); pr.appendChild(m); }
    const here = act.project === p.name;
    if (here && act.room === 'new') put(pj, inst('Chat/Room row', { State: 'Active', Name: '새 채팅', 'Show time': false }), { fill: true });
    if (o.noChats) { const n = al('H', { name: '대화방 없음', pad: [6, 0, 6, 28] }); put(pj, n, { fill: true }); n.appendChild(await text('아직 대화방이 없어요', 'Small/13.5', 'text-3')); continue; }
    const d = inst('Chat/Daily row', { State: here && act.room === 'daily' ? 'Active' : 'Default', Unanswered: !!p.ongoing }); put(pj, d, { fill: true });
    for (const [name, when] of rooms) put(pj, inst('Chat/Room row', { State: here && act.room === name ? 'Active' : 'Default', Name: name, Time: when }), { fill: true });
    if (more) { const m = al('H', { name: '더 보기', pad: [6, 0, 6, 28] }); put(pj, m, { fill: true }); m.appendChild(await text(`${more}개 더 보기`, 'Small/13.5', 'text-3')); }
  }
  return t;
}

/* ---------- 오른쪽: 이 프로젝트의 경험 카드 ---------- */
// o: { cards: [id], open: id, changed: { 칸: 더한 글 }, before: { 칸: 원래 글 }, status: 'Typing' | 'Wait' | 'Revert' }
async function cardPanel(parent, o = {}) {
  const ids = o.cards || MOYEOBOM_CARDS;
  const p = al('V', { name: '경험 카드', w: PANEL_W, fill: 'surface-2', clip: true }); put(parent, p, { fillV: true });
  const top = al('H', { name: '머리', gap: 8, pad: [8, 20], cross: 'center', minH: 57, stroke: 'border', sides: ['bottom'] }); put(p, top, { fill: true });
  const h2 = al('H', { name: '제목', gap: 8, cross: 'center' }); put(top, h2, { fill: true });
  h2.appendChild(await text('경험 카드', 'Body/15 Semibold', 'text')); if (ids.length) h2.appendChild(await text(`${ids.length}장`, 'Small/13.5 Medium', 'text-3'));
  if (o.status) top.appendChild(inst('Chat/Panel status', { State: o.status }));
  const body = al('V', { name: '카드 목록', gap: 8, pad: 20 }); put(p, body, { fill: true });
  if (!ids.length) {
    const e = al('V', { name: '빈 목록', gap: 4, pad: [16, 0] }); put(body, e, { fill: true });
    await tput(e, '이야기를 들려주면 AI가 이 프로젝트의 경험 카드를 만들어요.', 'Body/15', 'text-2', { wrap: true });
    await tput(e, '어느 카드에 담을지는 AI가 골라요.', 'Small/13.5', 'text-3', { wrap: true }); return p;
  }
  if (!o.open) await tput(body, '카드를 누르면 자세히 볼 수 있어요.', 'Small/13.5', 'text-3', { name: '안내' });
  for (const id of ids) {
    const c = CARDS[id];
    if (id === o.open) await openCard(body, c, o.changed, o.before);
    else { const tile = inst('Card/Tile', { Title: c.title, 'Resume line': c.line, Keywords: kwText(c.kws) }); tile.name = c.title; put(body, tile, { fill: true }); }
  }
  return p;
}
// 목록의 제자리에서 펼친 카드. changed: 방금 바뀐 칸 → 더한 글 (before 에 원래 글)
async function openCard(list, c, changed = {}, before = {}) {
  const det = al('V', { name: `펼친 카드: ${c.title}`, gap: 8, pad: [16, 8, 14, 8], fill: 'surface', stroke: 'primary', radius: 'radius/md' }); put(list, det, { fill: true });
  const head = al('H', { name: '머리 (누르면 접힘)', gap: 8, pad: [0, 8], cross: 'start' }); put(det, head, { fill: true });
  await tput(head, c.title, 'Title/17', 'text', { wrap: true }); head.appendChild(icon('chevron-up', 16, 'text-3'));
  const fs = al('V', { name: '칸', pad: [4, 0, 0, 0] }); put(det, fs, { fill: true });
  const row = (props) => { const f = inst('Chat/Card field', props); f.name = props.Label; put(fs, f, { fill: true }); };
  STAR.forEach((label, i) => {
    const add = changed[label];
    if (add) row({ State: 'Changed', Label: label, Value: before[label] || '', Added: add });
    else if (c.star[i]) row({ State: 'Default', Label: label, Value: c.star[i] });
    else row({ State: 'Blank', Label: label });
  });
  row({ State: 'Keywords', Label: '역량', Value: kwText(c.kws) });
  row({ State: 'Default', Label: '이력서 한 줄', Value: c.line });
  const foot = al('H', { name: '아래', pad: [4, 8, 0, 8] }); put(det, foot, { fill: true });
  put(foot, btn('경험 카드 열기', 'Secondary', 'Medium', 'card'), { fill: true });
  return det;
}

/* ---------- 가운데: 대화방 ---------- */
async function roomHead(room, o) {
  const h = al('H', { name: '머리', gap: 10, pad: [8, 20, 8, 28], cross: 'center', minH: 57, stroke: 'border', sides: ['bottom'] }); put(room, h, { fill: true });
  if (o.project) h.appendChild(inst('Project chip', { Label: o.project }));
  h.appendChild(await text(o.title, 'Body/15 Semibold', 'text', { name: '제목 (h1)' })); spacer(h);
  if (o.menu) { const m = inst('Icon button', { Size: 'Medium', Icon: 'more' }); m.name = '대화방 메뉴'; if (o.menuOpen) m.fills = fills('surface-3'); h.appendChild(m); }
  return h;
}
// 머리 + 대화 열. grow: 대화 길이만큼 늘어난다, 아니면 화면 높이에서 잘리고 align(end: 최근 대화가 보이게, start: 위부터)
async function roomBody(room, o) {
  await roomHead(room, o);
  const body = al('V', { name: '대화', cross: 'center', main: o.grow ? 'start' : (o.align || 'end'), clip: !o.grow }); put(room, body, { fill: true, fillV: !o.grow });
  const col = al('V', { name: '대화 열', w: COL_W, gap: 20, pad: [28, 28, 24, 28] }); body.appendChild(col);
  return col;
}
// 대화를 차례로 쌓는다
function talk(col) {
  return {
    async me(s, w) {
      const r = al('H', { name: '내 말', main: 'end' }); put(col, r, { fill: true });
      const b = inst('Chat/My message', { Text: s }); r.appendChild(b); b.layoutSizingHorizontal = 'FIXED'; b.resize(w || bubbleW(s), b.height); return r;
    },
    // o: { name, chip: [카드, 바뀐 칸], then: async (box) => {} 글 아래에 붙는 것 }
    async ai(s, o = {}) {
      const r = al('H', { name: o.name || 'AI 답', gap: 12 }); put(col, r, { fill: true });
      r.appendChild(inst('Chat/AI mark'));
      const box = al('V', { name: '내용', gap: 12 }); put(r, box, { fill: true });
      if (o.chip) box.appendChild(inst('Chat/Card chip', { Card: o.chip[0], Fields: o.chip[1] }));
      if (s) await tput(box, s, 'Body/15', 'text', { wrap: true, name: '글' });
      if (o.then) await o.then(box);
      return box;
    },
    day(label) { const d = inst('Chat/Day divider', { Label: label }); d.name = `날짜: ${label}`; put(col, d, { fill: true }); },
    typing() { const r = al('H', { name: 'AI 답 쓰는 중', gap: 12 }); put(col, r, { fill: true }); r.appendChild(inst('Chat/AI mark')); r.appendChild(inst('Chat/Typing')); },
  };
}
// 입력: 빠른 단추(GitHub, 카드 바꾸기 전에 묻기) + 입력칸. o: { quick: false, connect: GitHub 연결 전, permOn }
async function composer(room, ph, o = {}) {
  const foot = al('V', { name: '입력', cross: 'center', fill: 'surface', stroke: 'border', sides: ['top'] }); put(room, foot, { fill: true });
  const form = al('V', { name: '입력 폼', w: COL_W, gap: 4, pad: [8, 28, 20, 28] }); foot.appendChild(form);
  if (o.quick !== false) {
    const q = al('H', { name: '빠른 단추', cross: 'center' }); put(form, q, { fill: true });
    q.appendChild(btn(o.connect ? 'GitHub 연결' : 'GitHub에서 찾기', 'Ghost', 'Small', 'github')); spacer(q);
    const perm = al('H', { name: '카드 바꾸기 전에 묻기', gap: 8, pad: [0, 10], cross: 'center' }); q.appendChild(perm);
    perm.appendChild(inst('Switch', { On: o.permOn ? 'On' : 'Off' })); perm.appendChild(await text('카드 바꾸기 전에 묻기', 'Small/13.5 Medium', 'text-2'));
  }
  const input = al('H', { name: '입력칸', gap: 8, pad: [5, 6, 5, 14], cross: 'center', fill: 'surface', stroke: 'field-border', radius: 'radius/sm', minH: 48 }); put(form, input, { fill: true });
  await tput(input, ph, 'Body/15', 'text-3', { wrap: true, name: '안내 글' });
  const send = inst('Icon button', { Size: 'Medium', Icon: 'send' }); send.name = '보내기'; recolor(send, 'primary'); disable(send); input.appendChild(send);
  return foot;
}

/* ---------- 대화 안의 GitHub (G3, G4) ---------- */
const ghButton = (label) => btn(label, 'Secondary', 'Medium', 'github');
const ghError = (box, msg) => put(box, named(banner('Danger', msg, '다시 시도'), '실패 알림'), { fill: true }); // 앱의 .banner-danger + 다시 시도
async function madeList(box, rows) {
  const l = al('V', { name: '만든 카드', stroke: 'border', sides: ['top'] }); put(box, l, { fill: true });
  for (const [title, miss] of rows) {
    const r = inst('Repo/Made card', Object.assign({ Title: title, 'Show empty': !!miss }, miss ? { 'Empty fields': `비어 있는 칸: ${miss}` } : {})); r.name = title; put(l, r, { fill: true });
  }
}
async function analysisSteps(box, at, current) {
  const pn = al('V', { name: '분석 중', gap: 16, pad: 20, fill: 'surface-2', radius: 'radius/md' }); put(box, pn, { fill: true });
  const repo = al('H', { name: '레포', gap: 8, cross: 'center' }); put(pn, repo, { fill: true });
  repo.appendChild(icon('github', 16, 'text')); repo.appendChild(await text('moyeobom-backend', 'Body/15 Semibold', 'text'));
  const n = await text('1 / 2', 'Small/13.5', 'text-3', { name: '레포 순서 (연결한 레포가 둘 이상일 때)' }); n.visible = false; repo.appendChild(n);
  const st = al('V', { name: '단계', gap: 12 }); put(pn, st, { fill: true });
  STEPS.forEach((s, k) => put(st, inst('Analysis/Step', { State: k < at ? 'Done' : k === at ? 'Current' : 'Pending', Label: k === at && current ? current : s }), { fill: true }));
}
// 찾은 작업 고르기: 첫 작업은 「자세히 보기」를 펼친 모습 (seed-repos.js gh_actions)
const GH_ACTIONS = { title: 'GitHub Actions 배포 자동화', line: 'main에 병합되면 테스트, 이미지 빌드, 서버 배포가 이어지도록 GitHub Actions와 Docker Compose 구성', keywords: kwText(['실행력', '추진력']),
  star: [['상황', '백엔드·MySQL·Redis를 서버에 함께 올려야 했음.'], ['과제', '「배포 자동화」(PR #52) 작업을 맡음.'], ['행동', 'GitHub Actions에서 테스트 → Docker 이미지 빌드·푸시 → EC2의 compose 재시작이 이어지게 하고, 앱·MySQL·Redis를 docker-compose.yml로 정의함.'], ['결과', '']],
  evidence: { repo: 'moyeobom-team/moyeobom-backend', sample: true,
    commits: [['1c5b9e7', 'ci: 테스트·이미지 빌드 워크플로 추가', '10월 27일'], ['e64a0d2', 'ci: EC2 배포 단계 추가', '10월 28일'], ['97f3c58', 'chore: docker-compose에 redis 추가', '10월 28일']],
    prs: [['#52', '배포 자동화 (GitHub Actions + Docker Compose)', '10월 28일']],
    code: [{ path: '.github/workflows/deploy.yml:14-30', lines: DEPLOY, hl: [14, 21, 27] }, { path: 'docker-compose.yml:1-11', lines: COMPOSE, hl: [1] }] } };
async function draftList(box) {
  const list = al('V', { name: '찾은 작업', gap: 12 }); put(box, list, { fill: true });
  await openDraft(list, GH_ACTIONS);
  const d2 = inst('Repo/Draft', { Selected: 'Off', Title: 'Testcontainers로 검색·참여 통합 테스트 구성', 'Resume line': '운영과 같은 MySQL 컨테이너에서 검색·참여 API를 검증하는 통합 테스트 제작', Keywords: '실행력', Evidence: '커밋 2개  PR 1개  코드 1곳' });
  put(list, d2, { fill: true });
  const foot = al('H', { name: '고르기 단추', cross: 'center' }); put(box, foot, { fill: true });
  foot.appendChild(btn('모두 고르기', 'Ghost', 'Small')); spacer(foot); foot.appendChild(btn('경험 카드 1장 만들기', 'Primary', 'Medium'));
}
// 묻기 상자. rows: [[칸, 원래 글, 더한 글]]
async function confirmBox(box, state, rows) {
  const wait = state === 'Wait';
  const cf = inst('Chat/Confirm', { State: state, 'Show row 2': rows.length >= 2, 'Show row 3': rows.length >= 3, 'Show row 4': rows.length >= 4 }); cf.name = '바뀔 내용'; put(box, cf, { fill: true });
  rows.forEach(([field, before, added], i) => {
    const full = [before, added].filter(Boolean).join(' '); // 답한 뒤에는 바뀐 모습만 흐리게
    setNested(cf, `row ${i + 1}`, wait ? { Field: field, Before: before || ' ', 'Show before': !!before, Added: added || ' ', 'Show added': !!added } : { Field: field, Before: full, 'Show before': true, 'Show added': false });
  });
  return cf;
}

/* ---------- 화면 틀 ---------- */
// o: { tree, panel: cardPanel 옵션 | null, grow, room: async (room) => {} }
async function chatScreen(frame, o) {
  const { screen, main } = shell(frame, 'Chat');
  // 화면 높이(1080)에 맞춘 틀. grow 면 대화방이 늘어나는 만큼 틀도 늘어난다
  const app = al('H', o.grow ? { name: 'AI 채팅', minH: H } : { name: 'AI 채팅', h: H }); put(main, app, { fill: true });
  await chatTree(app, o.tree);
  const room = al('V', { name: '대화방', fill: 'surface', stroke: 'border', sides: o.panel ? ['left', 'right'] : ['left'] }); put(app, room, { fill: true, fillV: !o.grow });
  if (o.panel) await cardPanel(app, o.panel);
  await o.room(room);
  if (o.grow) screen.minHeight = Math.max(H, Math.ceil(room.height));
  fit(frame, screen);
  return { screen, room };
}

/* ---------- 방 내용 ---------- */
// 「AI 답변 종류 모아 보기」 (seed-replies.js c_kinds): 메시지 26개
async function kindsRoom(room, grow) {
  const col = await roomBody(room, { project: '모여봄', title: 'AI 답변 종류 모아 보기', menu: true, grow, align: 'start' });
  const c = talk(col);
  // 1. 카드 칩
  await c.ai('이 대화방은 AI 채팅의 답변 종류를 한곳에서 볼 수 있게 모아 둔 예시예요. 위에서부터 차례로 내려가며 보세요.');
  await c.me('로그인 쪽 이야기 더 할게요. Refresh Token은 재발급할 때마다 새 토큰으로 바꿔서 한 번만 쓰이게 했어요.', 520);
  await c.ai('그 결과 무엇이 달라졌나요? 숫자로 말할 수 있는 게 있을까요?', { name: 'AI 답: 카드 칩', chip: [CARDS.e10.title, '행동'] });
  await c.ai('나중에 휴지통으로 옮긴 카드를 바꿨던 답이에요. 칩은 똑같이 보이고, 누르면 휴지통에 있다고 알려 줘요.', { name: 'AI 답: 카드 칩 (휴지통 카드)', chip: ['모임 공지 푸시 알림 붙이기', '행동'] });
  await c.ai('나중에 완전히 지운 카드를 만들었던 답이에요. 누르면 지워진 카드라고 알려 줘요.', { name: 'AI 답: 카드 칩 (지워진 카드)', chip: ['모임 일정 투표 만들기', '상황'] });
  // 2. GitHub로 이어 주기
  await c.me('깃허브에서 찾아줘', 160);
  await c.ai('GitHub에서 찾은 작업은 이 프로젝트의 경험 카드로 만들어져요.', { name: 'AI 답: GitHub로 이어 주기', then: async (b) => b.appendChild(ghButton('GitHub에서 찾기')) });
  // 3. 레포 분석
  await c.ai('GitHub 레포를 읽다가 멈췄어요.', { name: 'AI 답: 레포 분석 (멈춤)', then: async (b) => b.appendChild(btn('다시 시도', 'Secondary', 'Small')) });
  await c.ai('레포를 다 읽지 못했어요.', { name: 'AI 답: 레포 분석 (실패)', then: (b) => ghError(b, 'GitHub 요청 한도를 넘었어요. 1시간 뒤에 다시 시도해 주세요.') });
  await c.ai('커밋 87개와 PR 34개를 읽고 경험이 될 작업을 2개 찾았어요. 카드로 만들 작업을 골라 주세요.', { name: 'AI 답: 레포 분석 (고르기)', then: draftList });
  await c.ai('새로 카드로 만들 작업은 없어요. 이 레포에서 만든 경험 카드예요.', { name: 'AI 답: 레포 분석 (새로 만들 것 없음)', then: (b) => madeList(b, [[CARDS.g1.title, '결과'], [CARDS.g2.title, '']]) });
  await c.ai('경험 카드 1장을 만들었어요.', { name: 'AI 답: 레포 분석 (만든 뒤)', then: async (b) => { await madeList(b, [[CARDS.g1.title, '결과']]); b.appendChild(btn('남은 작업 2개 보기', 'Ghost', 'Small')); } });
  // 4. 바꾸기 전에 묻기
  await c.me('다른 이야기인데, 모임 사진을 올리기 전에 브라우저에서 이미지를 압축했어요.', 520);
  await c.ai('새 경험 카드 「업로드 전에 모임 사진 압축하기」를 만들까요?', { name: 'AI 답: 묻기 (만들기, 거절함)', then: (b) => confirmBox(b, 'No', [['제목', '', '업로드 전에 모임 사진 압축하기'], ['행동', '', '모임 사진을 올리기 전에 브라우저에서 이미지를 압축함.'], ['역량', '', '문제 해결력'], ['이력서 한 줄', '', '업로드 전 이미지 압축으로 모임 사진 용량 절감']]) });
  await c.ai('카드는 그대로 두었어요. 다르게 담고 싶으면 다시 말씀해 주세요.');
  await c.me('로그아웃하면 Redis에서 토큰을 바로 지워서 다른 기기의 세션도 끊겼어요.', 484);
  await c.ai(`「${CARDS.e10.title}」 카드의 결과를 이렇게 바꿀까요?`, { name: 'AI 답: 묻기 (고치기, 허용함)', then: (b) => confirmBox(b, 'Ok', [['결과', JWT_RESULT, JWT_LOGOUT]]) });
  await c.ai('더 있었던 일이 있으면 이어서 적어 주세요.', { name: 'AI 답: 카드 칩', chip: [CARDS.e10.title, '결과'] });
  await c.me('검색 API는 그 뒤로 슬로우 쿼리 로그를 주마다 점검했어요.', 420);
  await c.ai(`「${CARDS.e1.title}」 카드의 행동을 이렇게 바꿀까요?`, { name: 'AI 답: 묻기 (고치기, 반영 못 함)', then: (b) => confirmBox(b, 'Fail', [['행동', '감으로 고치지 않고 쿼리 로그부터 확인해 N+1 문제를 발견함. fetch join으로 쿼리를 묶고, 검색 조건으로 가장 많이 쓰는 지역·카테고리 컬럼에 인덱스를 추가한 뒤 EXPLAIN으로 풀 스캔이 사라진 것을 확인함. 페이징과 함께 쓸 때 생긴 경고는 컬렉션 조회만 batch size로 따로 처리함.', '느린 쿼리는 주마다 슬로우 쿼리 로그로 점검함.']]) });
  await c.ai('그사이 카드가 바뀌어서 반영하지 않았어요. 다시 말씀해 주시면 지금 카드에 맞춰 담을게요.');
  await c.me('이 카드 지워 줘', 140);
  await c.ai('「모임 공지 푸시 알림 붙이기」 카드를 휴지통으로 옮길까요? 30일 안에는 되돌릴 수 있어요.', { name: 'AI 답: 묻기 (지우기, 답한 뒤)' }); // 지우기는 답한 뒤 단추가 사라지고, 이어지는 답이 결과를 말한다
  await c.ai('「모임 공지 푸시 알림 붙이기」 카드를 휴지통으로 옮겼어요. 대화방은 그대로 남아요.');
  await c.me('재발급 요청이 몰릴 때를 대비해서 사용자별로 1초에 한 번만 재발급하게 막았어요.', 520);
  await c.ai(`「${CARDS.e10.title}」 카드의 행동을 이렇게 바꿀까요?`, { name: 'AI 답: 묻기 (고치기, 기다리는 중)', then: (b) => confirmBox(b, 'Wait', [['행동', JWT_ACTION, '재발급 요청이 몰릴 때를 대비해 사용자별로 1초에 한 번만 재발급하게 막음.']]) });
  await composer(room, PH.room, { permOn: true }); // 기다리는 제안이 있으니 묻기가 켜져 있다
}
const KINDS = { tree: { active: { project: '모여봄', room: 'AI 답변 종류 모아 보기' } }, panel: { open: 'e10', status: 'Wait' } };

// 「JWT + Refresh Token 인증 설계」 방에서 이야기를 이어 가는 중 (data.js c_e10 + 방금 결과를 더한 답)
const JWT_TREE = { active: { project: '모여봄', room: CARDS.e10.title }, rooms: { 모여봄: { rooms: [[CARDS.e10.title, '21:12'], ['AI 답변 종류 모아 보기', '09:00'], ['배포 후 업로드 500 에러와 배포 체크리스트', '11/19'], ['GitHub에서 찾은 경험', '11/18']] } } };
const JWT_CHANGED = { changed: { 결과: JWT_LOGOUT }, before: { 결과: JWT_RESULT } };
async function jwtRoom(room, o = {}) {
  const col = await roomBody(room, { project: '모여봄', title: CARDS.e10.title, menu: true, menuOpen: o.menuOpen });
  const c = talk(col);
  await c.ai('코드에서 「JWT + Spring Security 인증 구현」을 찾았어요. 왜 이렇게 만들게 됐나요?');
  await c.me('나중에 모바일 앱도 붙일 생각이라 세션보다 JWT가 낫다고 봤어요. 다만 팀원들이 토큰이 털리면 어떡하냐고 걱정해서 Refresh Token을 같이 두기로 했어요.', 520);
  await c.ai('Refresh Token은 어디에 두고, 탈취는 어떻게 막았어요?');
  await c.me('Redis에 사용자별로 저장하고, 재발급할 때마다 새 토큰으로 바꿔서 털린 토큰은 한 번만 쓸 수 있게 했어요.', 520);
  await c.ai('지금까지 이야기를 경험 카드로 정리했어요.');
  await c.me('로그아웃하면 Redis에서 토큰을 바로 지워서 다른 기기의 세션도 끊겼어요.', 484);
  await c.ai('더 있었던 일이 있으면 이어서 적어 주세요.', { name: 'AI 답: 카드 칩', chip: [CARDS.e10.title, '결과'] });
  if (o.typing) { await c.me('재발급 요청이 몰릴 때를 대비해서 사용자별로 1초에 한 번만 재발급하게 막았어요.', 520); c.typing(); }
  await composer(room, PH.room, { permOn: o.permOn });
}
const jwtScreen = (frame, o = {}) => chatScreen(frame, { tree: JWT_TREE, panel: Object.assign({ open: 'e10', status: o.typing ? 'Typing' : 'Revert' }, JWT_CHANGED), room: (r) => jwtRoom(r, o) });

// 새 채팅 안내 (AI 의 말이 아니라 대화에 남지 않는다)
async function guide(col, title, paras) {
  const g = al('V', { name: '안내', gap: 8, w: 576 }); col.appendChild(g);
  await tput(g, title, 'Title/17', 'text', { wrap: true, name: '제목 (h2)' });
  const ps = al('V', { name: '글', gap: 6 }); put(g, ps, { fill: true });
  for (const p of paras) await tput(ps, p, 'Body/15', 'text-2', { wrap: true });
}
// 가운데를 비운 화면 (빈 화면, 없는 방)
async function emptyRoom(room, title, desc, buttons) {
  const b = al('V', { name: '빈 화면', main: 'center', cross: 'center' }); put(room, b, { fill: true, fillV: true });
  await empty(b, title, desc, buttons);
}

/* ---------- 화면 ---------- */
const G = 'AI 채팅';

// 1. 답변 종류 모아 보기: 높이는 대화 길이에 맞춘다
SCREENS.push({ group: G, title: 'AI 답변 종류 모아 보기', build: async (frame) => {
  await chatScreen(frame, Object.assign({ grow: true, room: (r) => kindsRoom(r, true) }, KINDS));
} });

// 2. 오늘의 질문 (모여봄): 날짜 줄로 나뉜 지난 질문과 답, 아직 답하지 않은 오늘 질문. 오른쪽에는 그 질문이 묻는 카드
SCREENS.push({ group: G, title: '오늘의 질문', build: async (frame) => {
  await chatScreen(frame, { tree: { active: { project: '모여봄', room: 'daily' } }, panel: { open: 'g1' }, room: async (room) => {
    const col = await roomBody(room, { project: '모여봄', title: '오늘의 질문', menu: false }); // 오늘의 질문 방은 이름 바꾸기·지우기 메뉴가 없다
    const c = talk(col);
    c.day('11월 26일');
    await c.ai('최근에 팀원에게 설명하거나 설득한 일이 있었나요?');
    await c.me('프론트 팀원한테 페이지네이션 응답 형식을 설명했어요. 무한 스크롤이라 커서 방식으로 바꾸자고 설득했어요.', 520);
    await c.ai('더 있었던 일이 있으면 이어서 적어 주세요.', { chip: [CARDS.e8.title, '행동'] });
    c.day('11월 27일');
    await c.ai('최근에 가장 오래 고민한 문제는 뭐였나요? 어떻게 풀었는지도 들려주세요.');
    await c.me('코드 리뷰에서 검색 쿼리의 트랜잭션 범위가 너무 넓다는 피드백을 받고 메서드를 나눴어요.', 520);
    await c.ai('더 있었던 일이 있으면 이어서 적어 주세요.', { chip: [CARDS.e1.title, '행동'] });
    c.day('오늘');
    await c.ai(`「${CARDS.g1.title}」 카드의 결과가 아직 비어 있어요. 그 결과 무엇이 달라졌나요? 숫자로 말할 수 있는 게 있을까요?`, { name: 'AI 답: 오늘의 질문 (아직 답하지 않음)' });
    await composer(room, PH.daily);
  } });
} });

// 3. 대화방: AI 가 답을 쓰는 중, 오른쪽은 방금 바뀐 카드(바뀐 칸 연한 형광펜, 더한 글 형광펜)와 「담는 중」
SCREENS.push({ group: G, title: '대화방', build: async (frame) => { await jwtScreen(frame, { typing: true }); } });

// 4. 새 채팅
SCREENS.push({ group: G, title: '새 채팅 / 프로젝트 고르기', build: async (frame) => {
  await chatScreen(frame, { tree: {}, panel: null, room: async (room) => {
    await roomHead(room, { title: '새 채팅' });
    const body = al('V', { name: '대화', cross: 'center' }); put(room, body, { fill: true, fillV: true });
    const pick = al('V', { name: '프로젝트 고르기', gap: 16, pad: [40, 28], w: 520 }); body.appendChild(pick);
    await tput(pick, '어떤 프로젝트 이야기인가요?', 'Title/17', 'text', { name: '제목 (h2)' });
    const list = al('V', { name: '프로젝트', stroke: 'border', sides: ['top'] }); put(pick, list, { fill: true });
    for (const p of TREE) { const r = inst('Chat/Project choice', { Name: p.name, 'Show GitHub': !!p.gh }); r.name = p.name; put(list, r, { fill: true }); }
    pick.appendChild(btn('새 프로젝트', 'Secondary', 'Medium', 'plus'));
  } });
} });
SCREENS.push({ group: G, title: '새 채팅 / 프로젝트 없음', build: async (frame) => {
  await chatScreen(frame, { tree: { projects: [] }, panel: null, room: async (room) => {
    await roomHead(room, { title: '새 채팅' });
    const body = al('V', { name: '대화', cross: 'center' }); put(room, body, { fill: true, fillV: true });
    const pick = al('V', { name: '프로젝트 고르기', gap: 16, pad: [40, 28], w: 520 }); body.appendChild(pick);
    await tput(pick, '먼저 프로젝트를 만들어 주세요', 'Title/17', 'text', { name: '제목 (h2)' });
    await tput(pick, '팀 과제, 동아리, 아르바이트도 프로젝트예요.', 'Body/15', 'text-2');
    pick.appendChild(btn('새 프로젝트', 'Primary', 'Medium', 'plus'));
  } });
} });
SCREENS.push({ group: G, title: '새 채팅 / 안내', build: async (frame) => {
  await chatScreen(frame, { tree: { active: { project: '모여봄', room: 'new' } }, panel: {}, room: async (room) => {
    const col = await roomBody(room, { project: '모여봄', title: '새 채팅', align: 'start' });
    await guide(col, '있었던 일을 적어 주세요', ['한 줄이어도 괜찮아요. AI가 이 프로젝트의 알맞은 경험 카드를 골라 채우고, 빠진 내용은 물어봐요.', '아래 「GitHub에서 찾기」를 누르면 커밋과 PR에서도 경험을 찾을 수 있어요.']);
    await composer(room, PH.guide);
  } });
} });
SCREENS.push({ group: G, title: '새 채팅 / 카드를 펼쳐 두고', build: async (frame) => {
  await chatScreen(frame, { tree: { active: { project: '모여봄', room: 'new' } }, panel: { open: 'g1' }, room: async (room) => {
    const col = await roomBody(room, { project: '모여봄', title: '새 채팅', align: 'start' });
    await guide(col, `「${CARDS.g1.title}」 카드에 담을 이야기를 적어 주세요`, ['결과는 아직 비어 있어요. 그 결과 무엇이 달라졌나요? 숫자로 말할 수 있는 게 있을까요?', '다른 카드 이야기를 해도 괜찮아요. AI가 알맞은 카드에 담아요.']);
    await composer(room, PH.guide);
  } });
} });
SCREENS.push({ group: G, title: '새 채팅 / GitHub 연결 전', build: async (frame) => { // #/chat/new?github=1, 레포가 없는 슬랙봇. 오른쪽 카드 없음
  await chatScreen(frame, { tree: { active: { project: '슬랙봇', room: 'new' } }, panel: null, room: async (room) => {
    const col = await roomBody(room, { project: '슬랙봇', title: '새 채팅', align: 'start' });
    await talk(col).ai('이 프로젝트에 연결한 GitHub 레포가 아직 없어요. 연결하면 바로 찾아볼게요.', { name: 'AI 답: GitHub 연결', then: async (b) => b.appendChild(ghButton('GitHub 연결')) });
    await composer(room, PH.connect, { quick: false });
  } });
} });

// 5. GitHub 분석 중 (G3): 새로 만든 「GitHub에서 찾은 경험」 방
SCREENS.push({ group: G, title: 'GitHub 분석 중', build: async (frame) => {
  const tree = { active: { project: '모여봄', room: 'GitHub에서 찾은 경험' }, rooms: { 모여봄: { rooms: [['GitHub에서 찾은 경험', '21:30'], ['AI 답변 종류 모아 보기', '09:00'], ['배포 후 업로드 500 에러와 배포 체크리스트', '11/19'], ['GitHub에서 찾은 경험', '11/18']], more: 3 } } };
  await chatScreen(frame, { tree, panel: {}, room: async (room) => {
    const col = await roomBody(room, { project: '모여봄', title: 'GitHub에서 찾은 경험', menu: true, align: 'start' });
    await talk(col).ai('연결한 GitHub 레포를 읽고 있어요.', { name: 'AI 답: 레포 분석 (읽는 중)', then: (b) => analysisSteps(b, 3, '코드 읽는 중 (3/8)') });
    await composer(room, PH.room);
  } });
} });

// 6. 띄우는 것
SCREENS.push({ group: G, title: '대화방 메뉴', build: async (frame) => {
  const { screen } = await jwtScreen(frame, { menuOpen: true });
  menuUnder(frame, screen.findOne((n) => n.name === '대화방 메뉴'), [{ label: '이름 바꾸기', icon: 'edit' }, '-', { label: '휴지통으로 옮기기', icon: 'trash', danger: true }], { at: [1308, 52] });
} });
SCREENS.push({ group: G, title: '프로젝트 메뉴', build: async (frame) => {
  const { screen } = await chatScreen(frame, { tree: Object.assign({ hover: '모여봄' }, JWT_TREE), panel: Object.assign({ open: 'e10', status: 'Revert' }, JWT_CHANGED), room: (r) => jwtRoom(r) });
  menuUnder(frame, screen.findOne((n) => n.name === '프로젝트 메뉴'), [{ label: '프로젝트 열기', icon: 'folder' }, { label: 'GitHub에서 찾기', icon: 'github' }, '-', { label: '휴지통으로 옮기기', icon: 'trash', danger: true }], { align: 'start', at: [446, 110] });
} });
SCREENS.push({ group: G, title: '이름 바꾸기', build: async (frame) => {
  await jwtScreen(frame);
  await modal(frame, { title: '이름 바꾸기', body: async (b) => { await field(b, { label: '대화방 이름', input: { Content: 'Value', State: 'Focus', Text: CARDS.e10.title } }); }, buttons: [btn('취소', 'Secondary'), btn('저장', 'Primary')] });
} });
SCREENS.push({ group: G, title: '프로젝트를 휴지통으로', build: async (frame) => {
  await jwtScreen(frame);
  await modal(frame, { title: '「모여봄」 프로젝트를 휴지통으로 옮길까요?', body: (b) => modalText(b, '대화방 7개와 경험 카드 6장도 함께 옮겨져요. 30일 안에는 되돌릴 수 있어요.'), buttons: [btn('취소', 'Secondary'), btn('휴지통으로 옮기기', 'Danger')] });
} });
SCREENS.push({ group: G, title: '휴지통으로 옮긴 카드 알림', build: async (frame) => { // 휴지통에 있는 카드의 칩을 눌렀을 때
  await chatScreen(frame, Object.assign({ room: (r) => kindsRoom(r, false) }, KINDS));
  toast(frame, '휴지통으로 옮긴 카드예요', '휴지통 보기');
} });
SCREENS.push({ group: G, title: '카드 바꾸기 전에 묻기 켬', build: async (frame) => {
  await jwtScreen(frame, { permOn: true });
  toast(frame, '이제 카드를 바꾸기 전에 물어볼게요');
} });

// 7. 빈 화면
SCREENS.push({ group: G, title: '대화방 없음', build: async (frame) => {
  await chatScreen(frame, { tree: { projects: [{ name: '교내 해커톤', rooms: [] }], noChats: true }, panel: null, room: (r) => emptyRoom(r, '아직 채팅이 없어요', '있었던 일을 한 줄만 적어도 이야기가 시작돼요.') });
} });
SCREENS.push({ group: G, title: '없는 대화방', build: async (frame) => {
  await chatScreen(frame, { tree: {}, panel: null, room: (r) => emptyRoom(r, '휴지통에 있거나 지워진 대화방이에요', '', [btn('휴지통 보기', 'Secondary')]) });
} });
SCREENS.push({ group: G, title: '프로젝트 없음', build: async (frame) => {
  await chatScreen(frame, { tree: { projects: [] }, panel: null, room: (r) => emptyRoom(r, '첫 프로젝트를 만들어 주세요', 'GitHub 레포에서 가져오거나 직접 만들 수 있어요.') });
} });

})();
