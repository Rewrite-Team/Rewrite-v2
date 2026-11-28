/* 경험 위키 (#/vault): 프로젝트 목록, 전체 카드, 새 프로젝트 모달(G1 레포 고르기, G2), 프로젝트 완료 알림.
   앱: prototype/js/screens/vault.js, js/repo-flow.js (css/screens/vault.css, repo-flow.css)
   내용: 예시 계정 김준호 (prototype/js/data.js, seed-repos.js) */

(() => { // 이 파일의 이름이 다른 화면 파일과 겹치지 않도록 한 스코프에 둔다

/* ---------- 예시 계정 데이터 ---------- */
// [이름, 진행중, 기간, 역할, 레포, 카드 수]. 진행중 먼저, 끝난 것은 최근에 끝난 순 (vault.js projectsView)
const WIKI_PROJECTS = [
  ['모여봄', true, '2026.09부터', '백엔드 (Spring Boot), 4인 팀', 'moyeobom-backend', 6],
  ['슬랙봇', true, '2026.10부터', '1인 개발 (Node.js, PostgreSQL)', '', 2],
  ['알고리즘 스터디', false, '2025.03 ~ 2025.12', '스터디장, 6명', '', 2],
  ['데이터베이스 팀과제', false, '2025.09 ~ 2025.12', '팀원 (ERD 설계), 4인 팀', '', 1],
  ['빈강의실', false, '2025.03 ~ 2025.06', '백엔드 + 팀장, 3인 팀', 'empty-classroom', 5],
  ['교내 해커톤', false, '2025.05', '백엔드 + 발표, 3인 팀', '', 2],
  ['카페 아르바이트', false, '2024.03 ~ 2025.02', '바리스타 (주말 오픈조)', '', 1],
  ['편의점 야간 아르바이트', false, '2023.07 ~ 2023.12', '야간 근무자', '', 1],
];
// [제목, 프로젝트, 기간, GitHub 으로 만든 카드, 역량, 이력서 한 줄]
const WIKI_CARDS = [
  ['배포 후 업로드 500 에러와 배포 체크리스트', '모여봄', '2026.11', false, '문제 해결력,실행력', '배포 후 발생한 업로드 500 에러의 원인(파일 크기 제한 누락)을 찾고 배포 체크리스트 도입'],
  ['프론트와 API 명세 먼저 합의하기', '모여봄', '2026.10 ~ 2026.11', false, '협업능력,추진력,커뮤니케이션', '구현 전 Swagger 명세를 프론트와 먼저 합의하는 규칙을 제안해 응답 형식 변경으로 인한 재작업 감소'],
  ['JWT + Refresh Token 인증 설계', '모여봄', '2026.09', false, '의사결정 능력,커뮤니케이션,실행력', '모바일 확장을 고려해 JWT + Refresh Token 인증 구조를 설계하고, 세션 방식과의 장단점을 팀에 공유'],
  ['Redis 캐시로 인기 모임 목록 조회 개선', '모여봄', '2026.10', true, '문제 해결력,의사결정 능력', '인기 모임 목록에 Redis 캐시(TTL 5분)를 적용해 메인 화면 진입 시 반복되는 DB 조회 개선'],
  ['모임 정원 초과 참여를 비관적 락으로 방지', '모여봄', '2026.10', true, '문제 해결력,실행력', '동시 참여 시 정원 초과를 비관적 락(대기 3초 제한)으로 막고 동시 참여 테스트로 검증'],
  ['흐지부지되던 스터디 참여율 되살리기', '알고리즘 스터디', '2025.03 ~ 2025.12', false, '리더십,커뮤니케이션,도전정신', '그만두려던 이유를 직접 묻고 난이도를 3단계로 나눠 10개월간 평균 참여율 85% 유지, 6명 중 4명 코딩테스트 통과'],
  ['재고 실수 줄이기', '편의점 야간 아르바이트', '2023.07 ~ 2023.12', false, '실행력,추진력', '재고 누락 원인을 찾아 품목별 검수표를 만들어 한 달 만에 누락을 거의 해소, 다른 야간 근무자까지 사용'],
  ['24시간 해커톤에서 MVP 범위 줄이기', '교내 해커톤', '2025.05', false, '의사결정 능력,협업능력,커뮤니케이션', '24시간 안에 분실물 찾기 서비스 MVP 완성 (백엔드·발표 담당)'],
  ['연락 끊긴 팀원과 역할 재분배', '데이터베이스 팀과제', '2025.09 ~ 2025.12', false, '커뮤니케이션,실행력,협업능력', '팀원 연락 두절 상황에서 남은 작업을 재분배하고, ERD 설계에 쿼리 작성까지 맡아 마감 내 과제 제출'],
  ['빈 강의실 검색 쿼리와 복합 인덱스', '빈강의실', '2025.04', true, '분석적 사고,문제 해결력', '강의실별 반복 조회를 not exists 단일 쿼리로 통합하고 예약 테이블에 복합 인덱스 추가'],
  ['사용자 테스트로 예약 동선 고치기', '빈강의실', '2025.05 ~ 2025.06', false, '기획력', '실사용자 5명 테스트 피드백을 반영해 예약 취소 버튼 동선 개선'],
  ['중복 예약 버그 해결', '빈강의실', '2025.04 ~ 2025.06', false, '문제 해결력,실행력,분석적 사고', 'DB 유니크 제약과 낙관적 락으로 동시 예약 충돌을 막아 시범 운영 2주간 예약 120건 중 중복 0건'],
  ['주문 대기 줄 줄이기', '카페 아르바이트', '2024.03 ~ 2025.02', false, '기획력,분석적 사고,추진력', '일주일간 메뉴별 주문 수를 집계해 피크 전 사전 준비와 역할 고정을 제안, 체감 대기 시간을 절반 가까이 단축'],
  ['PDF 시간표 파싱으로 강의실 데이터 만들기', '빈강의실', '2025.03 ~ 2025.04', false, '문제 해결력,의사결정 능력,실행력', '시간표 API가 없는 문제를 PDF 시간표 파서로 해결해 학기마다 재사용 가능한 강의실 데이터 구축'],
  ['지출이 두 번씩 저장되던 문제 해결', '슬랙봇', '2026.11', false, '문제 해결력,도전정신,학습능력', '요청 로그로 지출 중복 저장의 원인(슬랙 3초 재시도)을 찾고 선응답·이벤트 id 중복 체크로 재발 방지'],
  ['일정이 밀렸을 때 기능 범위 조율', '빈강의실', '2025.04', false, '커뮤니케이션,리더십', '일정이 밀린 팀원의 가능한 작업량부터 확인하고 범위를 「검색·예약·취소」 3개로 조율, 역할 재분배'],
  ['검색 API 응답 속도 개선 (N+1)', '모여봄', '2026.10', false, '문제 해결력,분석적 사고,학습능력', '모임 검색 API의 N+1 쿼리를 fetch join과 복합 인덱스로 해결해 평균 응답 시간 1.8s → 0.3s 단축'],
  ['쓰는 사람에 맞춰 슬랙 봇과 Postgres 고르기', '슬랙봇', '2026.10 ~ 2026.11', false, '의사결정 능력,기획력', '사용자 요청에 맞춰 웹 대신 슬랙 봇으로 전환하고, 동시 입력을 고려해 SQLite 대신 PostgreSQL 선택'],
  ['발표 중 데모가 멈출 때를 대비한 녹화본 준비', '교내 해커톤', '2025.05', false, '실행력,기획력', '발표 중 데모 중단에 대비해 전체 흐름을 담은 화면 녹화본 사전 제작'],
  ['발표 순서 교체 규칙으로 빈자리 줄이기', '알고리즘 스터디', '2025.06', false, '리더십,추진력', '발표자 불참으로 끊기던 스터디에 다음 순서와 발표를 바꾸는 규칙 도입'],
];
// [이름, 설명, 언어와 달 | 연결된 프로젝트, 다른 프로젝트에 연결됨]. 최근에 올린 순 (repo-flow.js repos)
const WIKI_REPOS = [
  ['moyeobom-frontend', '「모여봄」 웹 프론트엔드', 'TypeScript    2026.11', false],
  ['moyeobom-backend', '동네 기반 소모임 매칭 서비스 「모여봄」 백엔드', '「모여봄」에 연결됨', true],
  ['budget-bot', '슬랙 메시지로 공동 생활비를 기록하는 봇', 'JavaScript    2026.11', false],
  ['dotfiles', '개발 환경 설정', 'Shell    2026.08', false],
  ['algorithm-notes', '알고리즘 스터디 풀이 모음', 'Java    2025.12', false],
  ['empty-classroom', '캡스톤 디자인: 빈 강의실 찾기와 예약 웹앱', '「빈강의실」에 연결됨', true],
  ['lost-found-server', '24시간 해커톤: 분실물 찾기 서비스', 'Java    2025.05', false],
];

/* ---------- 조립 도우미 ---------- */
// 경험 위키 화면 머리 + 보기 고르기. o: { view: 0 프로젝트 | 1 전체 카드, empty: 프로젝트가 없음(단추와 보기 고르기 숨김) }
async function wikiPage(frame, o = {}) {
  const { screen, main } = shell(frame, 'Wiki');
  const col = await page(main, { title: '경험 위키', actions: o.empty ? [] : [btn('새 프로젝트', 'Primary', 'Medium', 'plus')], after: 20 }); // 앱의 .vt-head 아래 20
  if (!o.empty) { col.appendChild(segmented(['프로젝트', '전체 카드'], o.view || 0)); gap(col, 20); }
  return { screen, col };
}

// 프로젝트 목록. done: 방금 완료한 프로젝트 이름 (진행중에서 빠져 끝난 것 맨 앞으로)
function projectList(col, done) {
  let rows = WIKI_PROJECTS.map((p) => p.slice());
  if (done) {
    const p = rows.find((r) => r[0] === done); p[1] = false; p[2] = `${p[2].replace('부터', '')} ~ 2026.11`; // 끝난 달이 비어 있으면 이번 달
    rows = rows.filter((r) => r[1]).concat([p], rows.filter((r) => !r[1] && r !== p));
  }
  const list = al('V', { name: '프로젝트 목록', stroke: 'border', sides: ['top'] }); put(col, list, { fill: true });
  for (const [name, ongoing, period, role, repo, n] of rows) {
    const r = inst('Wiki/Project row', Object.assign({ State: ongoing ? 'Ongoing' : 'Done', Name: name, Period: period, Role: role, 'Show repo': !!repo, Cards: `카드 ${n}장` }, repo ? { Repo: repo } : {}));
    r.name = name; put(list, r, { fill: true });
  }
  return list;
}
async function projectsScreen(frame, o = {}) {
  const { screen, col } = await wikiPage(frame, { view: 0 });
  projectList(col, o.done);
  fit(frame, screen); return screen;
}

// 전체 카드의 조건 줄: 검색 (채우기) + 프로젝트 200 + 역량 170 (vault.css .vt-filter)
function cardFilter(col, o = {}) {
  const row = al('H', { name: '조건', gap: 8, cross: 'center' }); put(col, row, { fill: true });
  const q = inst('Input', { Content: o.q ? 'Value' : 'Placeholder', Text: o.q || '카드 검색', 'Show icon': true, Icon: 'search' }); q.name = '카드 검색'; put(row, q, { fill: true });
  const p = inst('Select', { Text: o.project || '모든 프로젝트' }); p.name = '프로젝트'; row.appendChild(p); p.resize(200, p.height);
  const k = inst('Select', { Text: o.kw || '모든 역량' }); k.name = '역량'; row.appendChild(k); k.resize(170, k.height);
  gap(col, 20);
  return row;
}
// 카드 격자: 3칸, 카드 사이 16, 한 줄의 카드는 높이를 맞춘다. make(카드 데이터) → 인스턴스
function cardGrid(col, cards, make) {
  const grid = al('V', { name: '카드', gap: 16 }); put(col, grid, { fill: true });
  for (let i = 0; i < cards.length; i += 3) {
    const row = al('H', { name: `줄 ${i / 3 + 1}`, gap: 16 }); put(grid, row, { fill: true });
    const made = cards.slice(i, i + 3).map((c) => { const card = make(c); card.name = c[0]; put(row, card, { fill: true }); return card; });
    for (let k = row.children.length; k < 3; k++) { const e = al('V', { name: '빈 칸' }); put(row, e, { fill: true }); }
    // 줄 높이를 가장 긴 카드에 고정하고 카드는 세로 채우기 (모두 FILL 인 hug 줄은 접혀 버린다)
    const tallest = Math.ceil(Math.max(...made.map((c) => c.height)));
    row.layoutSizingVertical = 'FIXED'; row.resize(row.width, tallest); row.layoutSizingHorizontal = 'FILL';
    made.forEach((c) => { c.layoutSizingVertical = 'FILL'; });
  }
  return grid;
}
// 카드 한 장. match: 거른 역량 (그 역량에 형광펜)
const wikiCard = ([title, project, period, github, kws, line], match) => indexCard({ project, period, github, title, line, keywords: kws.split(','), match });

/* ---------- 새 프로젝트 모달 (G2) 과 레포 고르기 (G1) ---------- */
// 레포 고르기 본문. o: { state: 'list' | 'account', picked: 고른 레포 이름 }
async function repoPicker(parent, o = {}) {
  const pane = al('V', { name: o.state === 'account' ? '레포 고르기 (계정 주소)' : '레포 고르기 (레포 목록)', minH: 132 }); put(parent, pane, { fill: true });
  if (o.state === 'account') {
    await field(pane, { label: 'GitHub 주소', input: { Content: 'Placeholder', State: 'Focus', Text: 'github.com/내아이디' }, trailing: [btn('불러오기')], hint: '내 레포와 소속 조직의 공개 레포를 한 번에 불러와요.' });
    gap(pane, 12);
    const foot = al('H', { name: '아래 단추', gap: 4 }); pane.appendChild(foot);
    foot.appendChild(btn('예시 계정으로 해 보기', 'Ghost', 'Small'));
    return pane;
  }
  await githubAccount(pane);
  gap(pane, 8);
  const q = inst('Input', { Content: 'Placeholder', Text: '레포 검색', 'Show icon': true, Icon: 'search' }); q.name = '레포 검색'; put(pane, q, { fill: true });
  gap(pane, 12);
  const list = al('V', { name: '레포', gap: 8 }); put(pane, list, { fill: true });
  for (const [name, desc, meta, linked] of WIKI_REPOS) {
    const r = inst('Repo/Choice', { State: linked ? 'Disabled' : name === o.picked ? 'Selected' : 'Default', Name: name, Description: desc, Meta: meta });
    r.name = name; put(list, r, { fill: true });
  }
  return pane;
}
// 직접 만들기 본문
async function manualPane(parent) {
  const pane = al('V', { name: '직접 만들기', gap: 18, minH: 132 }); put(parent, pane, { fill: true });
  await field(pane, { label: '프로젝트 이름', input: { Content: 'Placeholder', State: 'Focus', Text: '예: 교내 해커톤, 카페 아르바이트' }, hint: '팀 과제, 동아리, 아르바이트도 프로젝트예요.' });
  await field(pane, { label: '맡은 역할 (선택)', input: { Content: 'Placeholder', Text: ' ' } });
  return pane;
}
// 새 프로젝트 모달. o: { mode: 0 GitHub | 1 직접, ready: 프로젝트 만들기를 누를 수 있음, pane: async (body) => {} }
async function newProjectModal(frame, o) {
  const ok = btn('프로젝트 만들기', 'Primary'); if (!o.ready) disable(ok);
  return modal(frame, {
    title: '새 프로젝트', width: 760,
    body: async (b) => {
      const seg = segmented([{ label: 'GitHub에서 가져오기', icon: 'github' }, { label: '직접 만들기' }], o.mode || 0); seg.name = '만드는 방법'; b.appendChild(seg);
      await o.pane(b);
    },
    buttons: [btn('취소'), ok],
  });
}
// 모달은 1080 화면 가운데에 띄운다
async function underProjects(frame) { await projectsScreen(frame); frame.resize(frame.width, H); }
async function underEmpty(frame) { const { screen, col } = await wikiPage(frame, { empty: true }); await noProjects(col); fit(frame, screen); }
const noProjects = (col) => empty(col, '아직 프로젝트가 없어요', '팀 과제, 동아리, 아르바이트도 프로젝트가 돼요.', [btn('새 프로젝트', 'Primary', 'Medium', 'plus')]);

/* ---------- 화면 ---------- */
SCREENS.push({
  group: '경험 위키', title: '프로젝트',
  build: async (frame) => { await projectsScreen(frame); },
});

SCREENS.push({
  group: '경험 위키', title: '전체 카드',
  build: async (frame) => {
    const { screen, col } = await wikiPage(frame, { view: 1 });
    cardFilter(col);
    cardGrid(col, WIKI_CARDS, (c) => wikiCard(c));
    fit(frame, screen);
  },
});

SCREENS.push({
  group: '경험 위키', title: '전체 카드 / 역량으로 거르기',
  build: async (frame) => {
    const kw = '리더십';
    const { screen, col } = await wikiPage(frame, { view: 1 });
    cardFilter(col, { kw });
    cardGrid(col, WIKI_CARDS.filter((c) => c[4].split(',').includes(kw)), (c) => wikiCard(c, kw));
    fit(frame, screen);
  },
});

SCREENS.push({
  group: '경험 위키', title: '전체 카드 / 결과 없음',
  build: async (frame) => {
    // 교내 해커톤 카드에는 리더십이 없다
    const { screen, col } = await wikiPage(frame, { view: 1 });
    cardFilter(col, { project: '교내 해커톤', kw: '리더십' });
    await empty(col, '조건에 맞는 경험 카드가 없어요', null, [btn('조건 지우기'), btn('AI 채팅으로 만들기', 'Secondary', 'Medium', 'chat')]);
    fit(frame, screen);
  },
});

SCREENS.push({
  group: '경험 위키', title: '프로젝트 / 처음',
  build: async (frame) => { await underEmpty(frame); },
});

SCREENS.push({
  group: '경험 위키', title: '새 프로젝트 / GitHub에서 가져오기',
  build: async (frame) => {
    await underProjects(frame);
    await newProjectModal(frame, { mode: 0, pane: (b) => repoPicker(b, { state: 'list' }) });
  },
});

SCREENS.push({
  group: '경험 위키', title: '새 프로젝트 / 레포를 고른 뒤',
  build: async (frame) => {
    await underProjects(frame);
    await newProjectModal(frame, { mode: 0, ready: true, pane: (b) => repoPicker(b, { state: 'list', picked: 'budget-bot' }) });
  },
});

SCREENS.push({
  group: '경험 위키', title: '새 프로젝트 / GitHub 계정 불러오기',
  build: async (frame) => {
    // GitHub 계정이 아직 없는 새 계정: 경험 위키의 빈 화면에서 연다
    await underEmpty(frame);
    await newProjectModal(frame, { mode: 0, pane: (b) => repoPicker(b, { state: 'account' }) });
  },
});

SCREENS.push({
  group: '경험 위키', title: '새 프로젝트 / 직접 만들기',
  build: async (frame) => {
    await underProjects(frame);
    await newProjectModal(frame, { mode: 1, pane: (b) => manualPane(b) });
  },
});

SCREENS.push({
  group: '경험 위키', title: '프로젝트 완료 알림',
  build: async (frame) => {
    // 「모여봄」의 프로젝트 완료를 누른 뒤: 끝난 프로젝트 맨 앞으로 옮겨지고 알림이 뜬다
    await projectsScreen(frame, { done: '모여봄' });
    toast(frame, '「모여봄」 프로젝트를 완료했어요', '되돌리기');
  },
});
})();
