/* 시드: 마스터 이력서 (window.SEED.resume). 담당: 마스터 이력서
   지금까지 김준호가 조금씩 업그레이드해 온 이력서 한 벌. 풀에는 쌓아 둔 재료가 모두 있고, included=true 인 것만 현재 이력서에 들어간다. */
(function (SEED) {
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const GH = 'https://github.com/example/moyeobom/blob/main/';
  const ev = (path, start, end) => ({ path, start, end, url: `${GH}${path}#L${start}-L${end}` });

  const profile = {
    name: '김준호',
    headline: '데이터로 병목을 찾는 백엔드 개발자',
    email: 'junho@example.com',
    phone: '010-0000-0000',
    github: 'github.com/example',
    blog: '',
    intro: '감으로 고치기보다 쿼리 로그와 지표로 원인부터 확인하는 신입 백엔드 개발자예요. Spring Boot·JPA 기반 팀 프로젝트 2건에서 검색 API 응답 시간을 1.8초에서 0.3초로 줄이고, 동시 예약 충돌을 0건으로 막았어요.',
  };

  const skills = [
    { id: 'rs1', name: 'Java', group: '언어', included: true, source: { type: 'manual' } },
    { id: 'rs2', name: 'Python', group: '언어', included: false, source: { type: 'manual' } },
    { id: 'rs3', name: 'Spring Boot', group: '프레임워크·라이브러리', included: true, source: { type: 'github', projectId: 'p1' } },
    { id: 'rs4', name: 'JPA', group: '프레임워크·라이브러리', included: true, source: { type: 'github', projectId: 'p1' } },
    { id: 'rs5', name: 'MySQL', group: 'DB·인프라', included: true, source: { type: 'manual' } },
    { id: 'rs6', name: 'Redis', group: 'DB·인프라', included: true, source: { type: 'github', projectId: 'p1', findingId: 'gf_p1_2' } },
    { id: 'rs7', name: 'Docker', group: 'DB·인프라', included: true, source: { type: 'manual' } },
    { id: 'rs8', name: 'GitHub Actions', group: 'DB·인프라', included: false, source: { type: 'github', projectId: 'p1' } },
    { id: 'rs9', name: 'PostgreSQL', group: 'DB·인프라', included: false, source: { type: 'manual' } },
    { id: 'rs10', name: 'Git', group: '도구·협업', included: true, source: { type: 'manual' } },
    { id: 'rs11', name: 'Swagger', group: '도구·협업', included: true, source: { type: 'card', expId: 'e8' } },
    { id: 'rs12', name: 'JUnit5', group: '도구·협업', included: false, source: { type: 'manual' } },
    { id: 'rs13', name: 'Notion', group: '도구·협업', included: false, source: { type: 'manual' } },
  ];

  const b = (id, text, source, included = true, addedAt = '2026-11-05') => ({ id, text, included, addedAt, source });

  const entries = [
    {
      id: 're1', section: 'project', title: '모여봄 — 동네 모임 매칭 서비스', org: '부트캠프 최종 프로젝트 (4인 팀)',
      period: { start: '2026-09', end: '' }, role: '백엔드 · 인증/검색 API 담당', projectId: 'p1', included: true, order: 0,
      bullets: [
        b('rb1', '모임 검색 API의 N+1 쿼리를 fetch join과 복합 인덱스로 해결해 평균 응답 시간 1.8s → 0.3s 단축',
          { type: 'github', projectId: 'p1', findingId: 'gf_p1_1', evidence: [ev('src/main/java/com/moyeobom/meeting/MeetingRepository.java', 18, 24)] }, true, '2026-11-18'),
        b('rb2', '인기 모임 목록에 Redis 캐시(TTL 5분)를 적용해 메인 화면 진입 시 반복되는 DB 조회 제거',
          { type: 'github', projectId: 'p1', findingId: 'gf_p1_2', evidence: [ev('src/main/java/com/moyeobom/config/RedisConfig.java', 12, 31)] }, true, '2026-11-18'),
        b('rb3', '구현 전 Swagger 명세를 프론트와 먼저 합의하는 규칙을 제안해 응답 형식 변경으로 인한 재작업 감소',
          { type: 'card', expId: 'e8' }),
        b('rb4', '모바일 확장을 고려해 JWT + Refresh Token 인증 구조를 설계하고, 세션 방식과의 장단점을 팀에 공유',
          { type: 'log', projectId: 'p1', logId: 'l2' }),
        b('rb5', '배포 후 발생한 업로드 500 에러의 원인(파일 크기 제한 누락)을 찾고 배포 체크리스트 도입',
          { type: 'log', projectId: 'p1', logId: 'l5' }, false, '2026-11-12'),
      ],
    },
    {
      id: 're2', section: 'project', title: '빈강의실 — 강의실 예약 웹앱', org: '학과 캡스톤 디자인 (3인 팀)',
      period: { start: '2025-03', end: '2025-06' }, role: '팀장 · 백엔드', projectId: 'p3', included: true, order: 1,
      bullets: [
        b('rb6', 'DB 유니크 제약과 낙관적 락으로 동시 예약 충돌을 막아 시범 운영 2주간 예약 120건 중 중복 0건',
          { type: 'card', expId: 'e9' }, true, '2026-10-02'),
        b('rb7', '시간표 API가 없는 문제를 PDF 시간표 파서로 해결해 학기마다 재사용 가능한 강의실 데이터 구축',
          { type: 'log', projectId: 'p3', logId: 'l9' }, true, '2026-10-02'),
        b('rb8', '일정이 밀리자 범위를 「검색·예약·취소」 3개로 조율해 기한 내 학과 시범 운영까지 완료, 최종 발표 우수상',
          { type: 'manual' }, true, '2026-10-02'),
        b('rb9', '실사용자 5명 테스트 피드백을 반영해 예약 취소 버튼 동선 개선',
          { type: 'log', projectId: 'p3', logId: 'l12' }, false, '2026-10-02'),
      ],
    },
    {
      id: 're3', section: 'project', title: '가계부 슬랙봇', org: '개인 프로젝트',
      period: { start: '2026-10', end: '' }, role: '1인 개발 (Node.js, PostgreSQL)', projectId: 'p2', included: false, order: 2,
      bullets: [
        b('rb10', '슬랙 메시지로 공동 생활비 지출을 기록하고 주간 리포트를 보내는 봇 개발, 친구 3명이 실사용 중', { type: 'manual' }),
      ],
    },
    {
      id: 're4', section: 'career', title: '카페 바리스타 (아르바이트)', org: '○○커피 ○○점',
      period: { start: '2024-03', end: '2025-02' }, role: '주말 오픈조', projectId: null, included: false, order: 3,
      bullets: [
        b('rb11', '일주일간 메뉴별 주문 수를 집계해 피크 30분 전 사전 준비와 역할 고정을 제안, 대기 시간 절반으로 단축',
          { type: 'card', expId: 'e2' }),
      ],
    },
    {
      id: 're5', section: 'activity', title: '알고리즘 스터디', org: '○○대학교 컴퓨터공학과',
      period: { start: '2025-03', end: '2025-12' }, role: '스터디장 · 6명', projectId: null, included: true, order: 4,
      bullets: [
        b('rb12', '난이도 3단계 트랙과 풀이 발표 로테이션을 도입해 10개월간 평균 참여율 85% 유지, 6명 중 4명 코딩테스트 통과',
          { type: 'card', expId: 'e3' }, true, '2026-10-22'),
      ],
    },
    {
      id: 're6', section: 'activity', title: '○○ 부트캠프 백엔드 과정', org: '○○ 부트캠프',
      period: { start: '2026-07', end: '2026-12' }, role: '수강생', projectId: null, included: true, order: 5,
      bullets: [
        b('rb13', 'Java·Spring 기반 웹 백엔드 600시간 과정, 코드 리뷰 스터디 운영', { type: 'manual' }),
      ],
    },
    {
      id: 're7', section: 'education', title: '○○대학교 컴퓨터공학과', org: '학사 · 졸업 예정',
      period: { start: '2020-03', end: '2027-02' }, role: '학점 3.8 / 4.5', projectId: null, included: true, order: 6,
      bullets: [
        b('rb14', '주요 과목: 자료구조, 운영체제, 데이터베이스, 컴퓨터네트워크', { type: 'manual' }, true, '2026-10-02'),
      ],
    },
    {
      id: 're8', section: 'award', title: '교내 해커톤 장려상', org: '○○대학교 SW중심대학사업단',
      period: { start: '2025-05', end: '2025-05' }, role: '', projectId: null, included: true, order: 7,
      bullets: [
        b('rb15', '24시간 안에 분실물 찾기 서비스 MVP 완성 (백엔드·발표 담당)', { type: 'manual' }, true, '2026-10-02'),
      ],
    },
    {
      id: 're9', section: 'award', title: 'SQLD (SQL 개발자)', org: '한국데이터산업진흥원',
      period: { start: '2025-09', end: '2025-09' }, role: '', projectId: null, included: true, order: 8, bullets: [],
    },
    {
      id: 're10', section: 'award', title: '정보처리기사 필기 합격', org: '한국산업인력공단',
      period: { start: '2026-05', end: '2026-05' }, role: '', projectId: null, included: false, order: 9, bullets: [],
    },
  ];

  /* ---- 지난 버전: 현재 상태에서 거꾸로 되짚어 만든 스냅숏 ---- */
  const snap = () => clone({ profile, skills, entries });
  const entry = (s, id) => s.entries.find((e) => e.id === id);
  const bullet = (s, eid, bid) => entry(s, eid).bullets.find((x) => x.id === bid);
  const skill = (s, name) => s.skills.find((x) => x.name === name);

  // v2 (2026-11-05): 모여봄을 처음 넣은 버전. 아직 레포 분석 전이라 GitHub 코드에서 나온 줄은 없다.
  const v2 = snap();
  v2.profile.headline = '꼼꼼하게 원인을 파고드는 백엔드 개발자';
  v2.profile.intro = 'Spring Boot·JPA로 팀 프로젝트를 만들어 온 신입 백엔드 개발자예요. 문제를 만나면 로그부터 확인하고, 팀과 명세를 먼저 맞추는 걸 중요하게 생각해요.';
  entry(v2, 're1').bullets = entry(v2, 're1').bullets.filter((x) => !['rb1', 'rb2', 'rb5'].includes(x.id));
  entry(v2, 're1').bullets.unshift({ id: 'rb0', text: '모임 검색 API 성능 개선 (fetch join, 인덱스)', included: true, addedAt: '2026-11-05', source: { type: 'manual' } });
  skill(v2, 'Redis').included = false;
  v2.skills = v2.skills.filter((x) => x.name !== 'GitHub Actions');
  bullet(v2, 're2', 'rb9').included = true;

  // v1 (2026-10-02): 첫 이력서. 캡스톤·학력 위주, 알바 경력도 넣어 뒀었다.
  const v1 = snap();
  v1.profile.headline = '성실한 신입 백엔드 개발자';
  v1.profile.intro = '캡스톤 프로젝트에서 팀장과 백엔드를 맡아 학과 시범 서비스까지 운영해 봤어요.';
  v1.entries = v1.entries.filter((e) => !['re1', 're3', 're6'].includes(e.id));
  bullet(v1, 're2', 'rb6').text = '중복 예약 버그를 낙관적 락으로 해결';
  bullet(v1, 're2', 'rb9').included = true;
  entry(v1, 're4').included = true;
  entry(v1, 're5').bullets = [];
  entry(v1, 're8').bullets = [];
  v1.skills = v1.skills.filter((x) => !['Redis', 'Docker', 'GitHub Actions', 'Swagger', 'PostgreSQL', 'JUnit5'].includes(x.name));
  skill(v1, 'Python').included = true;
  skill(v1, 'Notion').included = true;

  SEED.resume = {
    profile, skills, entries,
    versions: [
      { id: 'rv2', name: 'v2 모여봄 추가', note: '부트캠프 프로젝트 모여봄을 넣고 알바 경력은 뺐어요.', savedAt: '2026-11-05', snapshot: v2 },
      { id: 'rv1', name: 'v1 첫 이력서', note: '캡스톤 중심으로 처음 만든 이력서', savedAt: '2026-10-02', snapshot: v1 },
    ],
  };
})(window.SEED);
