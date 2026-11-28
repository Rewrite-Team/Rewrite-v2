/* 프로젝트(#/vault/p/:id)와 GitHub로 경험 카드 만들기(#/vault/p/:id/github).
   앱: prototype/js/screens/projects.js, css/screens/projects.css(.pj-*, .pg-*), js/screens/project-github.js,
       js/repo-flow.js(레포 고르기 · 분석 단계 · 초안, css/screens/repo-flow.css), js/github.js(단계·오류 문구),
       예시 데이터 js/data.js, js/seed-repos.js (moyeobom-team/moyeobom-backend: 커밋 87개, PR 34개, 초안 8개 중 6개는 이미 카드)
   이 파일의 컴포넌트: Project/Repo row. 공용: Analysis/Step, Repo/Draft, Repo/STAR row, Evidence/* (evidence(), openDraft()), Banner(banner()) */

{ // 이 파일의 이름이 다른 화면 파일과 겹치지 않도록 한 스코프에 둔다

/* ---------- 예시 데이터 ---------- */
// 카드: [제목, 기간, GitHub에서 만든 카드, 역량, 이력서 한 줄]
const PJ_CARDS = {
  모여봄: [
    ['배포 후 업로드 500 에러와 배포 체크리스트', '2026.11', false, ['문제 해결력', '실행력'], '배포 후 발생한 업로드 500 에러의 원인(파일 크기 제한 누락)을 찾고 배포 체크리스트 도입'],
    ['프론트와 API 명세 먼저 합의하기', '2026.10 ~ 2026.11', false, ['협업능력', '추진력', '커뮤니케이션'], '구현 전 Swagger 명세를 프론트와 먼저 합의하는 규칙을 제안해 응답 형식 변경으로 인한 재작업 감소'],
    ['JWT + Refresh Token 인증 설계', '2026.09', false, ['의사결정 능력', '커뮤니케이션', '실행력'], '모바일 확장을 고려해 JWT + Refresh Token 인증 구조를 설계하고, 세션 방식과의 장단점을 팀에 공유'],
    ['Redis 캐시로 인기 모임 목록 조회 개선', '2026.10', true, ['문제 해결력', '의사결정 능력'], '인기 모임 목록에 Redis 캐시(TTL 5분)를 적용해 메인 화면 진입 시 반복되는 DB 조회 개선'],
    ['모임 정원 초과 참여를 비관적 락으로 방지', '2026.10', true, ['문제 해결력', '실행력'], '동시 참여 시 정원 초과를 비관적 락(대기 3초 제한)으로 막고 동시 참여 테스트로 검증'],
    ['검색 API 응답 속도 개선 (N+1)', '2026.10', false, ['문제 해결력', '분석적 사고', '학습능력'], '모임 검색 API의 N+1 쿼리를 fetch join과 복합 인덱스로 해결해 평균 응답 시간 1.8s → 0.3s 단축'],
  ],
  빈강의실: [
    ['빈 강의실 검색 쿼리와 복합 인덱스', '2025.04', true, ['분석적 사고', '문제 해결력'], '강의실별 반복 조회를 not exists 단일 쿼리로 통합하고 예약 테이블에 복합 인덱스 추가'],
    ['사용자 테스트로 예약 동선 고치기', '2025.05 ~ 2025.06', false, ['기획력'], '실사용자 5명 테스트 피드백을 반영해 예약 취소 버튼 동선 개선'],
    ['중복 예약 버그 해결', '2025.04 ~ 2025.06', false, ['문제 해결력', '실행력', '분석적 사고'], 'DB 유니크 제약과 낙관적 락으로 동시 예약 충돌을 막아 시범 운영 2주간 예약 120건 중 중복 0건'],
    ['PDF 시간표 파싱으로 강의실 데이터 만들기', '2025.03 ~ 2025.04', false, ['문제 해결력', '의사결정 능력', '실행력'], '시간표 API가 없는 문제를 PDF 시간표 파서로 해결해 학기마다 재사용 가능한 강의실 데이터 구축'],
    ['일정이 밀렸을 때 기능 범위 조율', '2025.04', false, ['커뮤니케이션', '리더십'], '일정이 밀린 팀원의 가능한 작업량부터 확인하고 범위를 「검색·예약·취소」 3개로 조율, 역할 재분배'],
  ],
  슬랙봇: [
    ['지출이 두 번씩 저장되던 문제 해결', '2026.11', false, ['문제 해결력', '도전정신', '학습능력'], '요청 로그로 지출 중복 저장의 원인(슬랙 3초 재시도)을 찾고 선응답·이벤트 id 중복 체크로 재발 방지'],
    ['쓰는 사람에 맞춰 슬랙 봇과 Postgres 고르기', '2026.10 ~ 2026.11', false, ['의사결정 능력', '기획력'], '사용자 요청에 맞춰 웹 대신 슬랙 봇으로 전환하고, 동시 입력을 고려해 SQLite 대신 PostgreSQL 선택'],
  ],
};
const PJ_MOYEOBOM_REPO = { name: 'moyeobom-team/moyeobom-backend', sample: true, at: '11월 18일 분석' };
const PJ = {
  모여봄: { title: '모여봄', status: 'ongoing', period: '2026.09부터', role: '백엔드 (Spring Boot), 4인 팀', summary: '부트캠프 최종 프로젝트로 4인 팀(프론트 2, 백엔드 2)이 8주간 동네 기반 소모임 매칭 서비스를 개발 중.', repos: [PJ_MOYEOBOM_REPO], cards: PJ_CARDS.모여봄 },
  빈강의실: { title: '빈강의실', status: 'done', period: '2025.03 ~ 2025.06', role: '백엔드 + 팀장, 3인 팀', summary: '학과 캡스톤으로 3인 팀이 빈 강의실을 찾아 예약하는 웹앱을 만들어 학과 공식 서비스로 시범 운영했다.', repos: [{ name: 'cse-capstone/empty-classroom', sample: true, at: '11월 14일 분석' }], cards: PJ_CARDS.빈강의실 },
  슬랙봇: { title: '슬랙봇', status: 'ongoing', period: '2026.10부터', role: '1인 개발 (Node.js, PostgreSQL)', summary: '친구들과 공동 생활비를 관리하려고, 슬랙 메시지로 지출을 기록하고 주간 리포트를 받는 봇을 만들고 있다.', repos: [], cards: PJ_CARDS.슬랙봇 },
  // 새 계정에서 「직접 만들기」로 만든 프로젝트 (기간·소개 없음)
  새프로젝트: { title: '카페 아르바이트', status: 'ongoing', period: '', role: '바리스타 (주말 오픈조)', summary: '', repos: [], cards: [] },
  // 새 계정에서 「GitHub에서 가져오기」로 만든 프로젝트: 이름은 레포 이름, 소개는 레포 설명
  레포만: { title: 'budget-bot', status: 'ongoing', period: '', role: '', summary: '슬랙 메시지로 공동 생활비를 기록하는 봇', repos: [{ name: 'example/budget-bot', sample: true, at: '' }], cards: [] },
};

// 고르기 화면의 초안 (seed-repos.js 의 gh_actions, spring_test)
const PJ_DRAFTS = [
  { title: 'GitHub Actions 배포 자동화', line: 'main에 병합되면 테스트, 이미지 빌드, 서버 배포가 이어지도록 GitHub Actions와 Docker Compose 구성', kws: ['실행력', '추진력'], counts: ['커밋 3개', 'PR 1개', '코드 2곳'],
    star: [['상황', '백엔드·MySQL·Redis를 서버에 함께 올려야 했음.'], ['과제', '「배포 자동화」(PR #52) 작업을 맡음.'], ['행동', 'GitHub Actions에서 테스트 → Docker 이미지 빌드·푸시 → EC2의 compose 재시작이 이어지게 하고, 앱·MySQL·Redis를 docker-compose.yml로 정의함.'], ['결과', '']],
    commits: [['1c5b9e7', 'ci: 테스트·이미지 빌드 워크플로 추가', '10월 27일'], ['e64a0d2', 'ci: EC2 배포 단계 추가', '10월 28일'], ['97f3c58', 'chore: docker-compose에 redis 추가', '10월 28일']],
    prs: [['#52', '배포 자동화 (GitHub Actions + Docker Compose)', '10월 28일']],
    files: [
      ['.github/workflows/deploy.yml:14-30', 14, ['    steps:', '      - uses: actions/checkout@v4', '      - uses: actions/setup-java@v4', '        with:', '          distribution: temurin', "          java-version: '17'", '      - name: Test', '        run: ./gradlew test', '      - name: Build & push image', '        run: |', '          docker build -t ${{ secrets.DOCKER_REPO }}/moyeobom:${{ github.sha }} .', '          docker push ${{ secrets.DOCKER_REPO }}/moyeobom:${{ github.sha }}', '      - name: Deploy to EC2', '        uses: appleboy/ssh-action@v1', '        with:', '          host: ${{ secrets.EC2_HOST }}', '          script: cd ~/moyeobom && IMAGE_TAG=${{ github.sha }} docker compose up -d'], [14, 21, 27]],
      ['docker-compose.yml:1-11', 1, ['services:', '  app:', '    image: ${DOCKER_REPO}/moyeobom:${IMAGE_TAG}', '    ports: ["8080:8080"]', '    env_file: .env', '    depends_on: [mysql, redis]', '  mysql:', '    image: mysql:8.0', '    volumes: ["mysql-data:/var/lib/mysql"]', '  redis:', '    image: redis:7-alpine'], [1]],
    ] },
  { title: 'Testcontainers로 검색·참여 통합 테스트 구성', line: '운영과 같은 MySQL 컨테이너에서 검색·참여 API를 검증하는 통합 테스트 제작', kws: ['실행력'], counts: ['커밋 2개', 'PR 1개', '코드 1곳'] },
];
// 이미 카드로 만든 경험 (초안 순서: jpa_fetch_join, spring_cache, jwt_security, pessimistic_lock, api_docs, pr-63)
const PJ_MADE = ['검색 API 응답 속도 개선 (N+1)', 'Redis 캐시로 인기 모임 목록 조회 개선', 'JWT + Refresh Token 인증 설계', '모임 정원 초과 참여를 비관적 락으로 방지', '프론트와 API 명세 먼저 합의하기', '배포 후 업로드 500 에러와 배포 체크리스트'];
const PJ_STEPS = ['레포 정보 불러오는 중', '커밋·PR 읽는 중', '파일 구조 살펴보는 중', '코드 읽는 중', '경험 카드로 정리하는 중']; // github.js STEPS
// 레포 고르기 (최근에 올린 순). [이름, 설명, 메타, 상태]
const PJ_REPOS = [
  ['moyeobom-frontend', '「모여봄」 웹 프론트엔드', 'TypeScript    2026.11', 'Selected'],
  ['moyeobom-backend', '동네 기반 소모임 매칭 서비스 「모여봄」 백엔드', '이 프로젝트에 연결됨', 'Disabled'],
  ['budget-bot', '슬랙 메시지로 공동 생활비를 기록하는 봇', 'JavaScript    2026.11', 'Default'],
  ['dotfiles', '개발 환경 설정', 'Shell    2026.08', 'Default'],
  ['algorithm-notes', '알고리즘 스터디 풀이 모음', 'Java    2025.12', 'Default'],
  ['empty-classroom', '캡스톤 디자인: 빈 강의실 찾기와 예약 웹앱', '「빈강의실」에 연결됨', 'Disabled'],
  ['lost-found-server', '24시간 해커톤: 분실물 찾기 서비스', 'Java    2025.05', 'Default'],
];
const PJ_KW_GAP = '    '; // 역량 사이 (앱의 .exp-card-kws gap 14px)

/* ---------- 컴포넌트 ---------- */
EXTRA_COMPONENTS.push({
  title: '프로젝트',
  build: async (row) => {
    // 프로젝트 화면 GitHub 패널의 레포 한 줄 (.pj-repo)
    await makeOne(row, 'Project/Repo row', async (c) => {
      auto(c, 'H', { gap: 12, w: 1080, cross: 'center' }); c.minHeight = 40;
      c.appendChild(icon('github', 20, 'text-2'));
      const m = al('H', { name: 'main', gap: 12, cross: 'center' }); c.appendChild(m); m.layoutSizingHorizontal = 'FILL';
      m.appendChild(named(await text('owner/repo', 'Body/15 Semibold', 'text'), 'repoName'));
      m.appendChild(named(inst('Tag', { Tone: 'Neutral', Label: '예시' }), 'sampleTag'));
      m.appendChild(named(await text('11월 18일 분석', 'Small/13.5', 'text-3'), 'analyzedAt'));
      c.appendChild(named(inst('Icon button', { Size: 'Medium', Icon: 'more' }), '레포 메뉴'));
    }, { desc: '프로젝트 › GitHub 패널의 연결한 레포. 예시 레포는 링크 대신 글자 + 예시 태그. 분석: 「M월 D일 분석」 또는 「아직 분석하지 않았어요」. ⋯ 메뉴는 「연결 해제」', props: [{ name: 'Name', type: 'TEXT', default: 'owner/repo', node: 'repoName' }, { name: 'Show sample', type: 'BOOLEAN', default: true, node: 'sampleTag' }, { name: 'Analyzed', type: 'TEXT', default: '11월 18일 분석', node: 'analyzedAt' }] });
  },
});

/* ---------- 조립 도구 ---------- */
// 프로젝트 머리: h1, 상태 · 기간 · 역할, 소개 + 완료/다시 진행 + ⋯ → { col, more }
async function pjHead(main, p) {
  const meta = [inst('Tag', p.status === 'done' ? { Tone: 'Success', Label: '완료' } : { Tone: 'Ink', Label: '진행중' })];
  if (p.period) { const per = al('H', { name: '기간', gap: 5, cross: 'center' }); per.appendChild(icon('calendar', 15, 'text-3')); per.appendChild(await text(p.period, 'Small/13.5', 'text-3')); meta.push(per); }
  if (p.role) meta.push(await text(p.role, 'Small/13.5', 'text-3', { name: '역할' }));
  const more = named(inst('Icon button', { Size: 'Medium', Icon: 'more' }), '프로젝트 메뉴');
  const done = p.status === 'done' ? btn('다시 진행하기', 'Ghost', 'Medium', 'restore') : btn('프로젝트 완료', 'Secondary', 'Medium', 'check');
  const col = await page(main, { crumb: '경험 위키', title: p.title, meta, sub: p.summary, actions: [done, more] });
  return { col, more };
}

// GitHub 패널 (.panel.pj-gh). primary: 레포는 있고 카드가 없을 때 「GitHub로 경험 카드 만들기」가 주 버튼
async function pjGithub(col, p, primary) {
  const panel = al('V', { name: 'GitHub', fill: 'surface-2', radius: 'radius/lg', pad: 20 }); put(col, panel, { fill: true });
  const rows = [];
  if (!p.repos.length) {
    const off = al('H', { name: '연결 전', gap: 12, cross: 'center' }); put(panel, off, { fill: true });
    off.appendChild(icon('github', 20, 'text-2'));
    await tput(off, 'GitHub를 연결하면 커밋과 PR에서 경험을 찾아 줘요.', 'Body/15', 'text-2', { wrap: true });
    off.appendChild(btn('GitHub 연결', 'Secondary', 'Medium'));
    return { panel, rows };
  }
  panel.paddingTop = 14; // .pj-repos { margin: -6px 0 12px }
  const list = al('V', { name: '레포', gap: 4 }); put(panel, list, { fill: true });
  for (const r of p.repos) {
    const row = inst('Project/Repo row', { Name: r.name, 'Show sample': r.sample, Analyzed: r.at || '아직 분석하지 않았어요' });
    put(list, row, { fill: true }); rows.push(row);
  }
  gap(panel, 12);
  const acts = al('H', { name: '단추', gap: 8, cross: 'center' }); panel.appendChild(acts);
  acts.appendChild(btn('GitHub로 경험 카드 만들기', primary ? 'Primary' : 'Secondary', 'Medium', 'github'));
  acts.appendChild(btn('레포 추가', 'Ghost', 'Medium', 'plus'));
  return { panel, rows };
}

// 카드 3열 (.grid minmax(300px, 1fr), 사이 16)
function pjGrid(parent, cards, project) {
  const grid = al('V', { name: '카드', gap: 16 }); put(parent, grid, { fill: true });
  for (let i = 0; i < cards.length; i += 3) {
    const line = al('H', { name: `줄 ${i / 3 + 1}`, gap: 16, cross: 'start' }); put(grid, line, { fill: true });
    for (let k = i; k < i + 3; k++) {
      if (k >= cards.length) { const f = figma.createFrame(); f.name = '빈 칸'; f.fills = []; f.resize(10, 1); put(line, f, { fill: true }); continue; }
      const [title, period, gh, kws, resume] = cards[k];
      put(line, indexCard({ project, period, github: gh, title, line: resume, keywords: kws }), { fill: true });
    }
  }
  return grid;
}
const pjMakeBtns = (primary) => [btn('AI 채팅으로 만들기', primary ? 'Primary' : 'Secondary', 'Medium', 'chat'), btn('직접 만들기', 'Ghost', 'Medium', 'edit')];

// 경험 카드 섹션 (.section, 위 40)
async function pjCards(col, p, primary) {
  gap(col, 40);
  const sec = al('V', { name: '경험 카드' }); put(col, sec, { fill: true });
  const h = al('H', { name: '섹션 머리', gap: 16, main: 'between', cross: 'center', pad: [0, 0, 12, 0] }); put(sec, h, { fill: true });
  const t = al('H', { name: '제목', gap: 8, cross: 'center' }); h.appendChild(t);
  t.appendChild(await text('경험 카드', 'Title/18', 'text'));
  if (p.cards.length) {
    t.appendChild(await text(String(p.cards.length), 'Small/13.5', 'text-3', { name: '개수' }));
    const b = al('H', { name: '만들기', gap: 8, cross: 'center' }); h.appendChild(b); pjMakeBtns(primary).forEach((x) => b.appendChild(x));
    pjGrid(sec, p.cards, p.title);
  } else {
    const desc = `${p.repos.length ? '연결한 GitHub에서 여러 장을 한 번에 만들거나, AI와 이야기하며 한 장씩 만들 수 있어요.' : 'AI와 이야기하면 첫 카드가 만들어져요. GitHub를 연결하면 여러 장을 한 번에 만들 수도 있어요.'} AI 없이 직접 써도 돼요.`;
    const e = await empty(sec, '아직 경험 카드가 없어요', desc, pjMakeBtns(primary)); e.paddingTop = e.paddingBottom = 40; e.fills = fills('primary-soft'); radius(e, 'radius/lg'); // .pj-empty: 연한 주황 면
  }
  return sec;
}

// 프로젝트 화면 전체 → { screen, more, rows }
async function pjProjectPage(frame, p) {
  const { screen, main } = shell(frame, 'Wiki');
  const ghFirst = p.repos.length > 0 && !p.cards.length; // 주 버튼은 하나만
  const { col, more } = await pjHead(main, p);
  const { rows } = await pjGithub(col, p, ghFirst);
  await pjCards(col, p, !ghFirst);
  fit(frame, screen);
  return { screen, more, rows };
}

/* ---------- GitHub로 경험 카드 만들기 (좁은 페이지) ---------- */
// o: { counts: 커밋·PR 수를 읽은 뒤, sample: 예시 태그, refresh: 다시 분석하기 단추 }
async function pjGhPage(frame, o = {}) {
  const { screen, main } = shell(frame, 'Wiki');
  const meta = [inst('Project chip', { Label: o.project || '모여봄' })];
  if (o.counts) meta.push(await text(o.counts, 'Small/13.5', 'text-3'));
  if (o.sample) meta.push(inst('Tag', { Tone: 'Neutral', Label: '예시' }));
  const actions = o.refresh ? [named(inst('Icon button', { Size: 'Medium', Icon: 'refresh' }), '다시 분석하기')] : [];
  const col = await page(main, { narrow: true, crumb: '경험 위키', title: 'GitHub로 경험 카드 만들기', meta, actions });
  const body = al('V', { name: '본문' }); put(col, body, { fill: true });
  return { screen, col: body };
}
const PJ_READ = '커밋 87개, PR 34개를 읽었어요';

// 찾은 작업 → openDraft() 옵션
const pjDraft = (d) => ({ title: d.title, line: d.line, keywords: d.kws.join(PJ_KW_GAP), star: d.star, evidence: {
  repo: PJ_MOYEOBOM_REPO.name, sample: PJ_MOYEOBOM_REPO.sample, commits: d.commits, prs: d.prs,
  code: d.files.map(([path, start, lines, hl]) => ({ path, lines: lines.map((src, i) => [start + i, src]), hl })) } });
// 「이미 카드로 만든 경험 N개」 (details.pg-made)
async function pjMadeList(parent, count, titles) {
  const open = !!titles;
  const sec = al('V', { name: '이미 카드로 만든 경험', pad: [28, 0, 0, 0] }); put(parent, sec, { fill: true });
  const sum = al('H', { name: '접는 줄', gap: 4, cross: 'center', minH: 36 }); sec.appendChild(sum);
  sum.appendChild(icon(open ? 'chevron-down' : 'chevron-right', 16, 'text-2'));
  sum.appendChild(await text(`이미 카드로 만든 경험 ${count}개`, 'Body/15', 'text-2'));
  if (open) {
    gap(sec, 4);
    const list = al('V', { name: '목록', stroke: 'border', sides: ['top'] }); put(sec, list, { fill: true });
    for (const t of titles) put(list, named(inst('List row', { Title: t, 'Show subtitle': false, 'Show meta': false, Icon: 'card' }), t), { fill: true });
  }
  return sec;
}

/* ---------- 화면 ---------- */
const PJ_GROUP = '프로젝트';
const PJ_MENU_AT = [1406, 101]; // 1920 화면에서 머리 ⋯ 아래 메뉴 자리 (자리를 계산할 수 없을 때)

SCREENS.push({
  group: PJ_GROUP, title: '모여봄',
  build: async (frame) => { await pjProjectPage(frame, PJ.모여봄); },
});
SCREENS.push({
  group: PJ_GROUP, title: '빈강의실 (완료)',
  build: async (frame) => { await pjProjectPage(frame, PJ.빈강의실); },
});
SCREENS.push({
  group: PJ_GROUP, title: '슬랙봇 (GitHub 연결 전)',
  build: async (frame) => { await pjProjectPage(frame, PJ.슬랙봇); },
});
SCREENS.push({
  group: PJ_GROUP, title: '새 프로젝트 (빈 상태)',
  build: async (frame) => { await pjProjectPage(frame, PJ.새프로젝트); },
});
SCREENS.push({
  group: PJ_GROUP, title: '레포만 연결 (카드 없음)',
  build: async (frame) => { await pjProjectPage(frame, PJ.레포만); },
});
SCREENS.push({
  group: PJ_GROUP, title: '프로젝트 메뉴',
  build: async (frame) => {
    const { more } = await pjProjectPage(frame, PJ.모여봄);
    menuUnder(frame, more, [{ label: '수정', icon: 'edit' }, { label: '휴지통으로 옮기기', icon: 'trash', danger: true }], { at: PJ_MENU_AT });
  },
});
SCREENS.push({
  group: PJ_GROUP, title: '레포 메뉴',
  build: async (frame) => {
    const { rows } = await pjProjectPage(frame, PJ.모여봄);
    const repoMore = rows[0].findOne((n) => n.name === '레포 메뉴');
    menuUnder(frame, repoMore, [{ label: '연결 해제', icon: 'unlink' }], { at: [1386, 261] });
  },
});
SCREENS.push({
  group: PJ_GROUP, title: '프로젝트 수정',
  build: async (frame) => {
    const p = PJ.빈강의실; await pjProjectPage(frame, p);
    await modal(frame, {
      title: '프로젝트 수정',
      body: async (b) => {
        b.paddingTop = 16;
        await field(b, { label: '프로젝트 이름', input: { Content: 'Value', State: 'Focus', Text: p.title } });
        await field(b, { label: '맡은 역할', input: { Content: 'Value', Text: p.role } });
        await field(b, { label: '상태', select: '완료' });
        const months = al('H', { name: '달', gap: 12, cross: 'start' }); put(b, months, { fill: true });
        await field(months, { label: '시작한 달', input: { Content: 'Value', Text: '2025년 03월', 'Show trailing': true, Trailing: 'calendar' } });
        await field(months, { label: '끝난 달', input: { Content: 'Value', Text: '2025년 06월', 'Show trailing': true, Trailing: 'calendar' } });
      },
      buttons: [btn('취소', 'Secondary'), btn('저장', 'Primary')],
    });
  },
});
SCREENS.push({
  group: PJ_GROUP, title: '프로젝트를 휴지통으로',
  build: async (frame) => {
    await pjProjectPage(frame, PJ.모여봄);
    await modal(frame, {
      title: '프로젝트를 휴지통으로 옮길까요?',
      body: async (b) => { await modalText(b, '「모여봄」 안의 경험 카드 6장, 대화방 7개도 함께 옮겨요. 30일 안에 되돌릴 수 있어요.'); },
      buttons: [btn('취소', 'Secondary'), btn('휴지통으로 옮기기', 'Danger')],
    });
  },
});
SCREENS.push({
  group: PJ_GROUP, title: '경험 카드 직접 만들기',
  build: async (frame) => {
    await pjProjectPage(frame, PJ.모여봄);
    await modal(frame, {
      title: '경험 카드 직접 만들기',
      body: async (b) => { await field(b, { label: '제목', input: { Content: 'Placeholder', State: 'Focus', Text: '예: 검색 API 응답 속도 개선' }, hint: '만든 뒤 카드에서 상황·과제·행동·결과와 역량을 직접 써요.' }); },
      buttons: [btn('취소', 'Secondary'), btn('만들기', 'Primary')],
    });
  },
});
SCREENS.push({
  group: PJ_GROUP, title: 'GitHub 연결',
  build: async (frame) => {
    await pjProjectPage(frame, PJ.모여봄);
    await modal(frame, {
      title: '「모여봄」에 GitHub 연결', width: 760,
      body: async (b) => {
        b.itemSpacing = 0; b.paddingTop = 18;
        await githubAccount(b, 'example', { pad: [0, 0, 8, 0] });
        put(b, inst('Input', { Content: 'Placeholder', Text: '레포 검색', 'Show icon': true, Icon: 'search' }), { fill: true });
        gap(b, 12);
        const list = al('V', { name: '레포 목록', gap: 8 }); put(b, list, { fill: true });
        for (const [name, desc, meta, state] of PJ_REPOS) put(list, named(inst('Repo/Choice', { State: state, Name: name, Description: desc, Meta: meta }), name), { fill: true });
      },
      buttons: [btn('취소', 'Secondary'), btn('연결하기', 'Primary')],
    });
  },
});
SCREENS.push({
  group: PJ_GROUP, title: '연결 해제 알림',
  build: async (frame) => {
    await pjProjectPage(frame, Object.assign({}, PJ.모여봄, { repos: [] })); // 해제한 뒤: GitHub 연결 전 패널
    toast(frame, 'moyeobom-backend 연결을 해제했어요', '되돌리기');
  },
});

SCREENS.push({
  group: PJ_GROUP, title: 'GitHub로 경험 카드 만들기 / 분석 중',
  build: async (frame) => {
    const { screen, col } = await pjGhPage(frame); // 분석 중에는 읽은 수와 예시 태그가 아직 없다
    const run = al('V', { name: '분석 중', gap: 20 }); put(col, run, { fill: true });
    const repo = al('H', { name: '레포', gap: 5, cross: 'center' }); run.appendChild(repo);
    repo.appendChild(icon('github', 15, 'text-3')); repo.appendChild(await text('moyeobom-backend', 'Small/13.5', 'text-3')); // 레포가 하나면 (i/n) 없이
    const steps = al('V', { name: '단계', gap: 12 }); put(run, steps, { fill: true });
    PJ_STEPS.forEach((t, k) => put(steps, inst('Analysis/Step', { State: k < 3 ? 'Done' : k === 3 ? 'Current' : 'Pending', Label: k === 3 ? `${t} (12/24)` : t }), { fill: true }));
    fit(frame, screen);
  },
});
SCREENS.push({
  group: PJ_GROUP, title: 'GitHub로 경험 카드 만들기 / 고르기',
  build: async (frame) => {
    const { screen, col } = await pjGhPage(frame, { counts: PJ_READ, sample: true, refresh: true });
    const drafts = al('V', { name: '찾은 경험', gap: 12 }); put(col, drafts, { fill: true });
    await openDraft(drafts, pjDraft(PJ_DRAFTS[0]));
    const d2 = PJ_DRAFTS[1];
    put(drafts, named(inst('Repo/Draft', { Selected: 'Off', Title: d2.title, 'Resume line': d2.line, Keywords: d2.kws.join(PJ_KW_GAP), Evidence: d2.counts.join('  ') }), d2.title), { fill: true });
    await pjMadeList(col, PJ_MADE.length, PJ_MADE);
    gap(col, 24);
    const bar = al('H', { name: '아래 줄 (화면에 붙음)', gap: 12, main: 'between', cross: 'center', pad: [12, 0], fill: 'bg', stroke: 'border', sides: ['top'] }); put(col, bar, { fill: true });
    const all = al('H', { name: '모두 고르기', gap: 10, cross: 'center', minH: 39 }); bar.appendChild(all);
    all.appendChild(inst('Checkbox', { Checked: 'Off' })); all.appendChild(await text('모두 고르기', 'Body/15', 'text'));
    bar.appendChild(btn('경험 카드 1장 만들기', 'Primary', 'Medium'));
    fit(frame, screen);
  },
});
SCREENS.push({
  group: PJ_GROUP, title: 'GitHub로 경험 카드 만들기 / 새로 만들 것 없음',
  build: async (frame) => {
    const { screen, col } = await pjGhPage(frame, { counts: PJ_READ, sample: true, refresh: true });
    await empty(col, '새로 만들 경험이 없어요', '찾은 경험은 모두 카드로 만들었어요.', [btn('AI 채팅으로 만들기', 'Primary', 'Medium', 'chat')]);
    await pjMadeList(col, 8);
    fit(frame, screen);
  },
});
SCREENS.push({
  group: PJ_GROUP, title: 'GitHub로 경험 카드 만들기 / 레포 없음',
  build: async (frame) => {
    const { screen, col } = await pjGhPage(frame, { project: '슬랙봇' });
    await empty(col, '연결한 레포가 없어요', 'GitHub를 연결하면 커밋과 PR에서 경험을 찾아 줘요.', [btn('GitHub 연결', 'Primary', 'Medium')]);
    fit(frame, screen);
  },
});
SCREENS.push({
  group: PJ_GROUP, title: 'GitHub로 경험 카드 만들기 / 오류',
  build: async (frame) => {
    const { screen, col } = await pjGhPage(frame); // 오류가 있으면 다시 분석하기 단추 없이
    const banners = al('V', { name: '알림', gap: 8, pad: [0, 0, 20, 0] }); put(col, banners, { fill: true });
    put(banners, banner('Danger', 'moyeobom-backend: GitHub API 호출 한도에 걸렸어요. 로그인 없이 쓰면 1시간에 60회까지만 부를 수 있어요. 21:40 이후에 다시 시도해 주세요.', '다시 시도'), { fill: true });
    const e = al('V', { name: '빈 화면', pad: [42, 20, 56, 20], cross: 'center' }); put(col, e, { fill: true }); // 오류만 있을 때: 제목 없이 단추만 (.empty)
    e.appendChild(btn('AI 채팅으로 만들기', 'Secondary', 'Medium', 'chat'));
    fit(frame, screen);
  },
});
}
