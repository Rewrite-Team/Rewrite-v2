/* 시드 데이터 & 정적 사전 — 프로토타입 전용 (실제 AI/백엔드 없음) */
window.SEED = (function () {
  // 역량 키워드 마스터. tone 은 styles.css 의 .kw[data-tone] 과 매칭
  const keywords = [
    { name: '협업', tone: 'blue', desc: '여러 사람과 목표를 맞추고 함께 결과를 낸 경험', hints: ['같이', '팀', '역할', '분담', '함께', '팀원'] },
    { name: '문제해결', tone: 'green', desc: '원인을 찾고 해결책을 실행한 경험', hints: ['문제', '해결', '원인', '버그', '오류', '개선', '장애'] },
    { name: '커뮤니케이션', tone: 'teal', desc: '상대에 맞춰 설명하고 설득한 경험', hints: ['설명', '공유', '설득', '소통', '회의', '피드백'] },
    { name: '리더십', tone: 'purple', desc: '방향을 제시하고 사람을 이끈 경험', hints: ['리드', '팀장', '이끌', '주도', '방향'] },
    { name: '주도성', tone: 'orange', desc: '시키지 않아도 먼저 시작한 경험', hints: ['먼저', '제안', '자발', '스스로', '처음으로'] },
    { name: '책임감', tone: 'yellow', desc: '맡은 일을 끝까지 해낸 경험', hints: ['끝까지', '마감', '맡', '책임'] },
    { name: '분석력', tone: 'blue', desc: '데이터·상황을 쪼개서 판단한 경험', hints: ['데이터', '분석', '측정', '지표', '비교', '수치'] },
    { name: '학습능력', tone: 'green', desc: '모르는 것을 빠르게 익힌 경험', hints: ['공부', '배우', '처음', '학습', '익히', '문서'] },
    { name: '고객지향', tone: 'pink', desc: '사용자·고객 관점에서 생각한 경험', hints: ['고객', '손님', '사용자', '불편', '만족'] },
    { name: '꼼꼼함', tone: 'yellow', desc: '디테일과 품질을 챙긴 경험', hints: ['검토', '확인', '테스트', '체크', '실수'] },
    { name: '갈등조정', tone: 'purple', desc: '의견 차이를 조율한 경험', hints: ['갈등', '의견', '충돌', '조율', '다툼', '반대'] },
    { name: '의사결정', tone: 'teal', desc: '선택지를 비교하고 결정한 경험', hints: ['결정', '선택', '고민', '비교', '대안', '트레이드오프'] },
    { name: '끈기', tone: 'orange', desc: '어려움에도 포기하지 않은 경험', hints: ['포기', '계속', '버티', '반복', '다시'] },
    { name: '창의성', tone: 'pink', desc: '새로운 방식을 시도한 경험', hints: ['아이디어', '새로운', '시도', '다르게'] },
  ];

  const categories = ['프로젝트', '동아리', '아르바이트', '수업·과제', '대외활동', '인턴·직장', '일상'];

  const user = {
    name: '김준호',
    userType: 'newgrad', // newgrad | switcher | junior
    targetJob: '백엔드 개발자',
    onboarded: true,
  };

  const settings = {
    cadence: 'daily',              // daily | weekdays | custom
    times: ['12:30', '21:30'],
    days: ['월', '화', '수', '목', '금', '토', '일'],
    channels: { push: true, email: false, kakao: true },
    questionStyle: 'light',        // light | deep
    quietHours: { start: '23:00', end: '08:00' },
    projectCheckin: 'every2days',  // daily | every2days | weekly
  };

  // 프로젝트 = 체크인 로그를 담는 그릇. 경험 카드는 여기서 에피소드 단위로 여러 장 나온다 (card.projectId → project.id)
  const projects = [
    {
      id: 'p1', title: '팀 프로젝트 「모여봄」 — 동네 모임 매칭 서비스',
      period: { start: '2026-09', end: '' }, status: 'ongoing',
      role: '백엔드 (Spring Boot), 4인 팀', summary: '부트캠프 최종 프로젝트로 4인 팀(프론트 2, 백엔드 2)이 8주간 동네 기반 소모임 매칭 서비스를 개발 중.',
      links: ['https://github.com/example/moyeobom'],
      logs: [
        { id: 'l1', date: '2026-09-08', type: 'milestone', text: '킥오프. 역할 분담 — 나는 백엔드 인증/검색 담당.', keywords: ['협업'] },
        { id: 'l2', date: '2026-09-19', type: 'decision', text: 'JWT vs 세션 고민. 모바일 확장 고려해서 JWT + Refresh Token으로 결정. 팀원에게 장단점 표로 공유.', keywords: ['의사결정', '커뮤니케이션'] },
        { id: 'l3', date: '2026-10-02', type: 'issue', text: '모임 검색이 1.8초 걸림. 쿼리 로그 보니 N+1. fetch join + 인덱스 추가로 0.3초.', keywords: ['문제해결', '분석력'] },
        { id: 'l4', date: '2026-10-15', type: 'collab', text: '프론트가 API 응답 형식이 자꾸 바뀐다고 힘들어함 → Swagger 명세 먼저 합의 후 구현하는 규칙 제안.', keywords: ['협업', '주도성'] },
        { id: 'l5', date: '2026-11-10', type: 'issue', text: '배포 후 이미지 업로드 500 에러. 파일 크기 제한 설정 누락이었음. 체크리스트 만듦.', keywords: ['문제해결', '꼼꼼함'] },
      ],
      createdAt: '2026-09-08', updatedAt: '2026-11-10',
    },
    {
      id: 'p2', title: '개인 프로젝트 — 가계부 슬랙봇',
      period: { start: '2026-10', end: '' }, status: 'ongoing',
      role: '1인 개발 (Node.js, PostgreSQL)', summary: '친구들과 공동 생활비를 관리하려고, 슬랙 메시지로 지출을 기록하고 주간 리포트를 받는 봇을 만들고 있다.',
      links: ['https://github.com/example/budget-bot'],
      logs: [
        { id: 'l6', date: '2026-10-21', type: 'milestone', text: '아이디어 시작. 친구 3명이 실제로 쓰겠다고 함.', keywords: ['주도성'] },
        { id: 'l7', date: '2026-11-04', type: 'decision', text: 'DB를 SQLite로 할지 Postgres로 할지 → 동시 입력 고려해서 Postgres.', keywords: ['의사결정'] },
      ],
      createdAt: '2026-10-21', updatedAt: '2026-11-04',
    },
    {
      id: 'p3', title: '캡스톤 디자인 「빈강의실」 — 강의실 예약 웹앱',
      period: { start: '2025-03', end: '2025-06' }, status: 'done',
      role: '백엔드 + 팀장, 3인 팀', summary: '학과 캡스톤으로 3인 팀이 빈 강의실을 찾아 예약하는 웹앱을 만들어 학과 공식 서비스로 시범 운영했다.',
      links: ['https://github.com/example/empty-classroom'],
      logs: [
        { id: 'l8', date: '2025-03-10', type: 'milestone', text: '팀 결성. 내가 팀장 겸 백엔드. 학생들이 빈 강의실을 찾으려고 건물을 돌아다니는 문제에서 출발.', keywords: ['리더십'] },
        { id: 'l9', date: '2025-03-24', type: 'decision', text: '학과 시간표 API가 없어서 PDF 시간표를 파싱하기로 결정. 수작업 입력 대비 학기마다 재사용 가능.', keywords: ['의사결정', '문제해결'] },
        { id: 'l10', date: '2025-04-14', type: 'issue', text: '같은 강의실·시간에 예약이 두 건 들어가는 중복 예약 발생 → DB 유니크 제약 + 낙관적 락으로 막음.', keywords: ['문제해결', '꼼꼼함'] },
        { id: 'l11', date: '2025-04-28', type: 'collab', text: '중간발표 앞두고 팀원 한 명이 일정이 밀려 의견이 갈림 → 기능을 "검색·예약·취소" 3개로 줄이자고 조율.', keywords: ['갈등조정', '협업'] },
        { id: 'l12', date: '2025-05-19', type: 'learning', text: '실사용자 5명 테스트에서 "예약 취소가 어디 있는지 모르겠다"는 피드백. 기능보다 사용자가 찾을 수 있는지가 먼저라는 걸 배움.', keywords: ['고객지향'] },
        { id: 'l13', date: '2025-06-13', type: 'milestone', text: '최종 발표 우수상. 학과 사무실에서 2주간 시범 운영, 예약 120건.', keywords: [] },
      ],
      createdAt: '2025-03-10', updatedAt: '2025-06-13',
    },
  ];

  const experiences = [
    {
      id: 'e1', title: '「모여봄」 검색 API 응답 속도 개선 (N+1)', category: '프로젝트',
      period: { start: '2026-10', end: '2026-10' }, status: 'done', projectId: 'p1', sourceLogIds: ['l3'],
      role: '백엔드 (검색 API 담당)', summary: '모임 검색 API가 느리다는 피드백을 받고, 쿼리 로그로 N+1을 찾아 응답 시간을 1.8초에서 0.3초로 줄였다.',
      star: {
        situation: '4인 팀 프로젝트 「모여봄」에서 프론트 팀원이 모임 검색 화면이 버벅인다고 알려 줌.',
        task: '검색 API 담당으로서 원인을 찾고 응답 속도를 개선해야 했음.',
        action: '감으로 고치지 않고 쿼리 로그부터 확인해 N+1 문제를 발견함. fetch join으로 쿼리를 묶고, 검색 조건 컬럼에 인덱스를 추가함.',
        result: '검색 API 평균 응답시간 1.8s → 0.3s.',
      },
      insights: '성능 문제는 감이 아니라 측정부터 해야 한다는 것을 배움.',
      keywords: ['문제해결', '분석력'], jobs: ['백엔드 개발자'],
      links: ['https://github.com/example/moyeobom'],
      qa: [
        { q: '검색 API가 느리다는 걸 처음 어떻게 알게 됐어요?', a: '프론트 팀원이 화면이 버벅인다고 해서 로그를 봤어요.', date: '2026-10-02' },
      ],
      completeness: 82, createdAt: '2026-10-02', updatedAt: '2026-11-10',
    },
    {
      id: 'e8', title: '「모여봄」 API 명세 먼저 합의하기 — 프론트와의 협업', category: '프로젝트',
      period: { start: '2026-10', end: '2026-10' }, status: 'draft', projectId: 'p1', sourceLogIds: ['l4'],
      role: '백엔드', summary: '프론트가 API 응답 형식 변경으로 재작업이 잦자, Swagger 명세를 먼저 합의하고 구현하는 규칙을 제안했다.',
      star: {
        situation: '「모여봄」 개발 중 프론트 팀원이 API 응답 형식이 자꾸 바뀌어 힘들다고 이야기함.',
        task: '백엔드 담당으로서 프론트의 재작업을 줄일 방법이 필요했음.',
        action: '구현 전에 Swagger로 명세를 먼저 작성해 프론트와 합의하고, 바꿀 때는 미리 공유하는 규칙을 제안함.',
        result: '',
      },
      insights: '',
      keywords: ['협업', '주도성', '커뮤니케이션'], jobs: ['백엔드 개발자'],
      links: [], qa: [],
      completeness: 60, createdAt: '2026-10-15', updatedAt: '2026-10-15',
    },
    {
      id: 'e9', title: '「빈강의실」 중복 예약 버그 해결', category: '프로젝트',
      period: { start: '2025-04', end: '2025-06' }, status: 'done', projectId: 'p3', sourceLogIds: ['l10', 'l13'],
      role: '백엔드 + 팀장', summary: '같은 강의실·시간에 예약이 두 건 들어가는 문제를 DB 제약과 낙관적 락으로 막아, 시범 운영 동안 중복 예약 0건을 지켰다.',
      star: {
        situation: '캡스톤 「빈강의실」 테스트 중 같은 강의실·시간에 예약이 두 건 들어가는 중복 예약이 발생함.',
        task: '백엔드 담당으로 시범 운영 전에 동시 예약 문제를 확실히 막아야 했음.',
        action: '요청이 동시에 들어올 때 조회 후 저장 사이에 틈이 생기는 것을 재현 테스트로 확인. 강의실·시간 조합에 DB 유니크 제약을 걸고, 엔티티에 버전 필드를 둬 낙관적 락으로 충돌 시 사용자에게 다시 선택하도록 안내함.',
        result: '학과 시범 운영 2주 동안 예약 120건, 중복 예약 0건.',
      },
      insights: '동시성 문제는 코드만 봐서는 안 보이고, 재현 테스트를 먼저 만들어야 잡힌다.',
      keywords: ['문제해결', '꼼꼼함'], jobs: ['백엔드 개발자'],
      links: ['https://github.com/example/empty-classroom'], qa: [],
      completeness: 100, createdAt: '2025-06-20', updatedAt: '2025-06-20',
    },
    {
      id: 'e2', title: '카페 아르바이트 — 주문 대기 줄 줄이기', category: '아르바이트',
      period: { start: '2024-03', end: '2025-02' }, status: 'done',
      role: '바리스타 (주말 오픈조)', summary: '주말 피크 타임 대기 줄이 길어지는 문제를 보고, 주문 동선과 사전 준비 방식을 바꿔 대기 시간을 줄였다.',
      star: {
        situation: '주말 오전 10~12시에 주문이 몰리면 대기 줄이 매장 밖까지 이어지고 손님 불만이 잦았음.',
        task: '오픈조 3명이 피크 시간을 더 빨리 처리할 방법이 필요했음.',
        action: '일주일 동안 메뉴별 주문 수를 직접 세어보니 아메리카노·라떼가 70%였음. 피크 30분 전에 샷을 미리 준비하고, 주문받는 사람/제조하는 사람 역할을 고정하자고 점장님께 제안함.',
        result: '체감 대기 시간이 절반 가까이 줄었고, 점장님이 다른 타임에도 같은 방식을 적용함.',
      },
      insights: '평범한 알바에서도 "세어보기"만으로 개선 포인트를 찾을 수 있다.',
      keywords: ['고객지향', '분석력', '주도성'], jobs: ['백엔드 개발자', '서비스 기획자'],
      links: [],
      qa: [
        { q: '그 아르바이트에서 "이건 좀 비효율적인데?" 싶었던 순간이 있었나요?', a: '주말 오전에 줄이 너무 길어서 손님들이 그냥 나가는 경우가 있었어요.', date: '2026-11-02' },
        { q: '그때 어떤 걸 먼저 확인해 봤어요?', a: '어떤 메뉴가 많이 나가는지 일주일 정도 메모했어요.', date: '2026-11-02' },
      ],
      completeness: 90, createdAt: '2026-11-02', updatedAt: '2026-11-03',
    },
    {
      id: 'e3', title: '알고리즘 스터디 운영', category: '동아리',
      period: { start: '2025-03', end: '2025-12' }, status: 'done',
      role: '스터디장, 6명', summary: '흐지부지되던 알고리즘 스터디를 맡아 규칙과 발표 방식을 바꿔 10개월 동안 유지했다.',
      star: {
        situation: '학과 알고리즘 스터디가 3주 만에 참여율이 절반으로 떨어짐.',
        task: '스터디장을 맡아 끝까지 유지할 구조를 만들어야 했음.',
        action: '참여자 인터뷰로 "문제가 너무 어렵다"는 원인을 파악. 난이도 3단계로 나누고, 매주 1명이 풀이를 발표하는 로테이션을 도입함.',
        result: '10개월간 평균 참여율 85% 유지, 6명 중 4명이 코딩테스트 통과.',
      },
      insights: '사람이 떠나는 이유를 직접 묻는 게 가장 빠르다.',
      keywords: ['리더십', '커뮤니케이션', '끈기'], jobs: ['백엔드 개발자'],
      links: [], qa: [],
      completeness: 85, createdAt: '2026-10-20', updatedAt: '2026-10-22',
    },
    {
      id: 'e4', title: '데이터베이스 수업 팀과제 — 무임승차 갈등', category: '수업·과제',
      period: { start: '2025-09', end: '2025-12' }, status: 'draft',
      role: '팀원 (ERD 설계)', summary: '팀원 한 명이 연락이 안 되던 상황에서 역할을 다시 나누고 일정을 조정해 과제를 제출했다.',
      star: {
        situation: '4인 팀과제에서 한 명이 2주째 연락이 닿지 않음.',
        task: '',
        action: '남은 팀원들과 미팅을 잡아 남은 작업을 쪼개고 다시 분배함.',
        result: '',
      },
      insights: '',
      keywords: ['갈등조정', '책임감'], jobs: [],
      links: [], qa: [
        { q: '그 팀원에게 직접 연락해 본 적이 있나요? 어떻게 했어요?', a: '카톡이랑 학과 메일 둘 다 보냈는데 답이 없었어요.', date: '2026-11-15' },
      ],
      completeness: 45, createdAt: '2026-11-15', updatedAt: '2026-11-15',
    },
    {
      id: 'e6', title: '교내 해커톤 — 24시간 안에 MVP', category: '대외활동',
      period: { start: '2025-05', end: '2025-05' }, status: 'done',
      role: '백엔드 + 발표', summary: '교내 해커톤에서 분실물 찾기 서비스를 만들어 장려상을 받았다.',
      star: {
        situation: '24시간 교내 해커톤, 3인 팀.',
        task: '시간 안에 실제로 동작하는 데모를 완성해야 했음.',
        action: '기능을 "등록-검색-알림" 3개로 과감히 줄이자고 제안하고, 새벽에 막힌 알림 기능은 이메일로 대체함.',
        result: '데모 완성 및 장려상 수상.',
      },
      insights: '완벽함보다 범위를 줄이는 결정이 중요할 때가 있다.',
      keywords: ['의사결정', '협업'], jobs: ['백엔드 개발자'],
      links: [], qa: [], completeness: 75, createdAt: '2026-10-28', updatedAt: '2026-10-28',
    },
    {
      id: 'e7', title: '편의점 야간 아르바이트 — 재고 실수 줄이기', category: '아르바이트',
      period: { start: '2023-07', end: '2023-12' }, status: 'draft',
      role: '야간 근무자', summary: '야간 검수 때 자주 생기던 재고 누락을 체크리스트로 줄였다.',
      star: { situation: '야간 물류 검수 때 누락이 자주 생겨 아침 근무자와 마찰이 있었음.', task: '', action: '', result: '' },
      insights: '', keywords: ['꼼꼼함'], jobs: [], links: [], qa: [],
      completeness: 25, createdAt: '2026-11-17', updatedAt: '2026-11-17',
    },
  ];

  // 서비스가 먼저 보내는 "오늘의 질문" 인박스
  const inbox = [
    { id: 'q1', text: '이번 주 「모여봄」 프로젝트에서 팀원과 의견이 갈렸던 순간이 있었나요?', type: 'project', targetExpId: null, targetProjectId: 'p1', hint: '작은 의견 차이도 좋아요. 변수명, 일정, 기술 선택 같은 것도요.', status: 'pending', askedAt: '2026-11-19 12:30' },
    { id: 'q2', text: '편의점 야간 알바에서 재고 누락이 생겼을 때, 처음에 어떻게 대응했어요?', type: 'deepen', targetExpId: 'e7', hint: '누구에게 알렸는지, 무엇을 먼저 확인했는지 떠올려 보세요.', status: 'pending', askedAt: '2026-11-18 21:30' },
    { id: 'q3', text: '최근 한 달 동안 "이건 내가 처음 해본 거다" 싶은 일이 있었나요?', type: 'recall', targetExpId: null, hint: '공부, 운동, 요리, 여행 계획… 뭐든 괜찮아요.', status: 'pending', askedAt: '2026-11-18 12:30' },
    { id: 'q4', text: '알고리즘 스터디에서 그만두려던 팀원을 붙잡은 적이 있나요?', type: 'deepen', targetExpId: 'e3', hint: '', status: 'answered', askedAt: '2026-11-17 21:30', answer: '한 명이 너무 어렵다고 나가려 해서, 쉬운 문제 트랙을 따로 만들어 줬어요.' },
    { id: 'q5', text: '누군가에게 무언가를 가르쳐 준 기억이 있나요?', type: 'recall', targetExpId: null, hint: '', status: 'skipped', askedAt: '2026-11-17 12:30' },
  ];

  // 회상(기억 떠올리기)용 질문 뱅크 — "경험이 없다"는 사용자를 위한 트리거
  const recallPrompts = [
    { theme: '일상', text: '최근에 누군가 "고마워"라고 말한 순간이 있었나요? 무엇 때문이었나요?' },
    { theme: '아르바이트', text: '아르바이트하면서 "이건 좀 비효율적인데?" 싶었던 순간이 있었나요?' },
    { theme: '수업·과제', text: '팀과제에서 가장 답답했던 순간은 언제였나요?' },
    { theme: '프로젝트', text: '프로젝트에서 가장 오래 붙잡고 있었던 문제는 무엇이었나요?' },
    { theme: '동아리', text: '모임이나 동아리에서 맡았던 "공식적이지 않은" 역할이 있나요?' },
    { theme: '일상', text: '스스로 정한 목표를 꾸준히 지킨 경험이 있나요? (운동, 공부, 기록 등)' },
    { theme: '대외활동', text: '처음 보는 사람들과 함께 무언가를 완성해 본 적이 있나요?' },
  ];

  // 집중 발굴 대화용 꼬리질문 템플릿 (STAR 단계별)
  const followups = {
    situation: [
      '그때가 언제쯤이었고, 누구와 함께였나요?',
      '그 일이 시작된 계기는 무엇이었나요?',
      '당시 상황을 모르는 사람에게 한 문장으로 설명한다면요?',
    ],
    task: [
      '그 상황에서 당신이 맡은 역할이나 책임은 무엇이었나요?',
      '꼭 해결해야 했던 목표나 제약(시간, 인원 등)이 있었나요?',
      '누가 시킨 일이었나요, 아니면 스스로 시작한 일이었나요?',
    ],
    action: [
      '그때 가장 먼저 한 행동은 무엇이었나요?',
      '다른 방법도 있었을 텐데, 왜 그 방법을 선택했나요?',
      '혼자 한 부분과 함께 한 부분을 나눠 본다면요?',
      '중간에 막혔던 순간이 있었나요? 어떻게 넘어갔어요?',
    ],
    result: [
      '그 결과 무엇이 달라졌나요? 숫자로 말할 수 있는 게 있을까요?',
      '주변 사람들(팀원, 손님, 상사)의 반응은 어땠나요?',
      '그 경험 이후 당신이 다르게 하게 된 것이 있나요?',
    ],
    alt: [
      '좋아요, 다른 쪽에서 볼게요. 그때 가장 기억에 남는 감정은 무엇이었나요?',
      '세부 내용은 괜찮아요. 그 일을 하면서 "잘했다" 싶었던 장면 하나만 떠올려 볼까요?',
      '혹시 그때 주고받은 메시지나 사진, 기록이 남아 있나요? 거기서 힌트를 얻어볼 수 있어요.',
    ],
  };

  // 프로젝트 체크인 질문 (로그 유형별)
  const projectCheckins = [
    { type: 'decision', text: '이번 주에 내린 기술적·기획적 결정이 있나요? 다른 선택지는 무엇이었나요?' },
    { type: 'issue', text: '최근에 막혔던 문제가 있었나요? 원인은 무엇이었나요?' },
    { type: 'collab', text: '팀원과 의견을 맞추거나 도움을 주고받은 순간이 있었나요?' },
    { type: 'milestone', text: '이번 주에 완성하거나 배포한 것이 있나요?' },
    { type: 'learning', text: '이번 주에 새로 배운 기술이나 방법이 있나요?' },
  ];

  // 자소서·면접 질문 예시 (확장 기능)
  const sampleQuestions = [
    '팀 프로젝트에서 갈등을 해결한 경험을 구체적으로 서술해 주세요.',
    '본인이 주도적으로 문제를 발견하고 개선한 경험을 말씀해 주세요.',
    '새로운 기술을 빠르게 학습해 성과를 낸 경험이 있나요?',
    '고객(사용자) 관점에서 서비스를 개선한 경험을 작성해 주세요.',
    '실패했던 경험과 그로부터 배운 점을 말씀해 주세요.',
  ];

  // 지원 기업 — 기업(+직무)마다 요구 역량·자소서 문항·면접 준비가 다르다 (가상의 기업)
  // status: preparing(지원 준비중) | applied(지원 완료) | passed(합격) | failed(불합격)
  const applications = [
    {
      id: 'a1', company: '모아페이', job: '백엔드 개발자 (신입)', status: 'preparing', deadline: '2026-11-30', url: '',
      jdText: '• 결제 API 서버 개발 및 운영\n• 대용량 트래픽 환경에서의 장애 대응과 성능 개선\n• 코드 리뷰를 통한 팀 내 협업\n• 새로운 기술을 빠르게 학습하고 적용하는 분\n• 로그와 지표를 기반으로 문제의 원인을 분석할 수 있는 분',
      competencies: [
        { name: '문제해결', weight: 3, reason: '대용량 트래픽 환경에서의 장애 대응과 성능 개선' },
        { name: '분석력', weight: 2, reason: '로그와 지표를 기반으로 문제의 원인을 분석' },
        { name: '협업', weight: 2, reason: '코드 리뷰를 통한 팀 내 협업' },
        { name: '학습능력', weight: 2, reason: '새로운 기술을 빠르게 학습하고 적용' },
        { name: '꼼꼼함', weight: 1, reason: '결제 도메인 특성상 안정성이 중요' },
      ],
      essays: [
        { id: 'aq1', text: '지원 동기와 입사 후 이루고 싶은 목표를 작성해 주세요.', limit: 700, keywords: ['주도성'], expId: null, note: '' },
        { id: 'aq2', text: '기술적인 문제를 해결했던 경험과 그 과정에서의 본인 역할을 구체적으로 작성해 주세요.', limit: 1000, keywords: ['문제해결', '분석력'], expId: 'e1', note: 'N+1 개선 수치 강조' },
        { id: 'aq3', text: '팀원과의 협업 과정에서 갈등을 해결한 경험을 작성해 주세요.', limit: 800, keywords: ['협업', '갈등조정'], expId: null, note: '' },
      ],
      interview: [
        { id: 'ai1', text: '모아페이에 지원한 이유는 무엇인가요?', keywords: [], source: 'common', expId: null, note: '', checked: false },
        { id: 'ai2', text: '검색 API 성능을 개선할 때 다른 방법은 고려하지 않았나요?', keywords: ['문제해결', '의사결정'], source: 'essay', expId: 'e1', note: '캐시 vs 인덱스 비교 이야기', checked: true },
      ],
      pins: { '문제해결': 'e1' }, memo: '결제 도메인 — 정합성/트랜잭션 공부해 두기', createdAt: '2026-11-12', updatedAt: '2026-11-18',
    },
    {
      id: 'a2', company: '그린로지스', job: '서버 개발자', status: 'applied', deadline: '2026-11-25', url: '',
      jdText: '• 물류 배차 시스템 서버 개발\n• 유관 부서와 소통하며 요구사항을 정리\n• 오너십을 가지고 문제를 먼저 발견하는 분\n• 현장 사용자 불편을 개선하는 데 관심 있는 분',
      competencies: [
        { name: '주도성', weight: 3, reason: '오너십을 가지고 문제를 먼저 발견하는 분' },
        { name: '커뮤니케이션', weight: 2, reason: '유관 부서와 소통하며 요구사항을 정리' },
        { name: '고객지향', weight: 2, reason: '현장 사용자 불편을 개선하는 데 관심' },
        { name: '문제해결', weight: 1, reason: '물류 배차 시스템 서버 개발' },
      ],
      essays: [
        { id: 'bq1', text: '스스로 문제를 발견하고 개선한 경험을 작성해 주세요.', limit: 800, keywords: ['주도성', '문제해결'], expId: 'e2', note: '' },
        { id: 'bq2', text: '다른 직군과 협업하며 의견을 조율한 경험이 있다면 작성해 주세요.', limit: 800, keywords: ['커뮤니케이션', '협업'], expId: 'e8', note: '' },
      ],
      interview: [
        { id: 'bi1', text: '그린로지스에 지원한 이유는 무엇인가요?', keywords: [], source: 'common', expId: null, note: '물류 현장 효율 — 카페 알바 경험과 연결', checked: true },
        { id: 'bi2', text: '1분 자기소개를 해 주세요.', keywords: [], source: 'common', expId: null, note: '', checked: false },
        { id: 'bi3', text: '시키지 않았는데 먼저 시작한 일이 있나요?', keywords: ['주도성'], source: 'competency', expId: 'e2', note: '', checked: false },
        { id: 'bi4', text: '현장 사용자의 불편을 어떻게 파악하겠어요?', keywords: ['고객지향'], source: 'user', expId: 'e2', note: '', checked: false },
      ],
      pins: { '주도성': 'e2', '고객지향': 'e2' }, memo: '1차 면접 11/25 14:00 · 기술+인성 통합', createdAt: '2026-11-05', updatedAt: '2026-11-19',
    },
    {
      id: 'a3', company: '핏플랜', job: '서비스 기획자 (직무 전환)', status: 'preparing', deadline: '2026-12-12', url: '',
      jdText: '• 사용자 인터뷰와 데이터 분석으로 개선점 도출\n• 개발·디자인과 협업하여 기능 출시\n• 지표 기반으로 의사결정',
      competencies: [
        { name: '고객지향', weight: 3, reason: '사용자 인터뷰로 개선점 도출' },
        { name: '분석력', weight: 2, reason: '데이터 분석, 지표 기반' },
        { name: '협업', weight: 2, reason: '개발·디자인과 협업하여 기능 출시' },
        { name: '의사결정', weight: 2, reason: '지표 기반으로 의사결정' },
      ],
      essays: [], interview: [], pins: {}, memo: '', createdAt: '2026-11-19', updatedAt: '2026-11-19',
    },
  ];

  return { keywords, categories, user, settings, projects, experiences, inbox, applications, recallPrompts, followups, projectCheckins, sampleQuestions };
})();
