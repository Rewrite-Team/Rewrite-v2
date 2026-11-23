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

  // 프로젝트 = 체크인 로그를 담는 그릇. 체크인 하나하나도 경험이고, 경험 카드는 여기서 에피소드 단위로 여러 장 나온다 (card.projectId → project.id)
  const projects = [
    {
      id: 'p1', title: '모여봄',
      period: { start: '2026-09', end: '' }, status: 'ongoing',
      role: '백엔드 (Spring Boot), 4인 팀', summary: '부트캠프 최종 프로젝트로 4인 팀(프론트 2, 백엔드 2)이 8주간 동네 기반 소모임 매칭 서비스를 개발 중.',
      links: ['https://github.com/example/moyeobom'],
      logs: [
        { id: 'l2', date: '2026-09-19', type: 'decision', text: 'JWT vs 세션 고민. 모바일 확장 고려해서 JWT + Refresh Token으로 결정. 팀원에게 장단점 표로 공유.', keywords: ['의사결정', '커뮤니케이션'] },
        { id: 'l3', date: '2026-10-02', type: 'issue', text: '모임 검색이 1.8초 걸림. 쿼리 로그 보니 N+1. fetch join + 인덱스 추가로 0.3초.', keywords: ['문제해결', '분석력'] },
        { id: 'l4', date: '2026-10-15', type: 'collab', text: '프론트가 API 응답 형식이 자꾸 바뀐다고 힘들어함 → Swagger 명세 먼저 합의 후 구현하는 규칙 제안.', keywords: ['협업', '주도성'] },
        { id: 'l5', date: '2026-11-10', type: 'issue', text: '배포 후 이미지 업로드 500 에러. 파일 크기 제한 설정 누락이었음. 체크리스트 만듦.', keywords: ['문제해결', '꼼꼼함'] },
      ],
      createdAt: '2026-09-08', updatedAt: '2026-11-10',
    },
    {
      id: 'p2', title: '슬랙봇',
      period: { start: '2026-10', end: '' }, status: 'ongoing',
      role: '1인 개발 (Node.js, PostgreSQL)', summary: '친구들과 공동 생활비를 관리하려고, 슬랙 메시지로 지출을 기록하고 주간 리포트를 받는 봇을 만들고 있다.',
      links: ['https://github.com/example/budget-bot'],
      logs: [
        { id: 'l7', date: '2026-11-04', type: 'decision', text: 'DB를 SQLite로 할지 Postgres로 할지 → 동시 입력 고려해서 Postgres.', keywords: ['의사결정'] },
      ],
      createdAt: '2026-10-21', updatedAt: '2026-11-04',
    },
    {
      id: 'p3', title: '빈강의실',
      period: { start: '2025-03', end: '2025-06' }, status: 'done',
      role: '백엔드 + 팀장, 3인 팀', summary: '학과 캡스톤으로 3인 팀이 빈 강의실을 찾아 예약하는 웹앱을 만들어 학과 공식 서비스로 시범 운영했다.',
      links: ['https://github.com/example/empty-classroom'],
      logs: [
        { id: 'l9', date: '2025-03-24', type: 'decision', text: '학과 시간표 API가 없어서 PDF 시간표를 파싱하기로 결정. 수작업 입력 대비 학기마다 재사용 가능.', keywords: ['의사결정', '문제해결'] },
        { id: 'l10', date: '2025-04-14', type: 'issue', text: '같은 강의실·시간에 예약이 두 건 들어가는 중복 예약 발생 → DB 유니크 제약 + 낙관적 락으로 막음.', keywords: ['문제해결', '꼼꼼함'] },
        { id: 'l11', date: '2025-04-28', type: 'collab', text: '중간발표 앞두고 팀원 한 명이 일정이 밀려 의견이 갈림 → 기능을 "검색·예약·취소" 3개로 줄이자고 조율.', keywords: ['갈등조정', '협업'] },
        { id: 'l12', date: '2025-05-19', type: 'learning', text: '실사용자 5명 테스트에서 "예약 취소가 어디 있는지 모르겠다"는 피드백. 기능보다 사용자가 찾을 수 있는지가 먼저라는 걸 배움.', keywords: ['고객지향'] },
        { id: 'l13', date: '2025-06-13', type: 'milestone', text: '최종 발표 우수상. 학과 사무실에서 2주간 시범 운영, 예약 120건.', keywords: ['책임감'] },
      ],
      createdAt: '2025-03-10', updatedAt: '2025-06-13',
    },
  ];

  /* 경험 카드 = 흩어진 경험(끝난 대화) 여러 개를 모아 면접·이력서·자소서에 쓰기 좋게 정리한 STAR 페이지.
     어떤 경험이 이 카드에 담겼는지는 inbox[].cardIds · chats[].cardIds · sourceLogIds(프로젝트 체크인) 로 정해지고,
     카드의 qa(출처)는 파일 아래에서 그 답변들로 채운다 */
  const experiences = [
    {
      id: 'e1', title: '「모여봄」 검색 API 응답 속도 개선 (N+1)', category: '프로젝트',
      period: { start: '2026-10', end: '2026-10' }, status: 'done', projectId: 'p1', sourceLogIds: ['l3'], codeRefs: ['gf_p1_1'],
      role: '백엔드 (검색 API 담당)', summary: '모임 검색 API가 느리다는 피드백을 받고, 쿼리 로그로 N+1을 찾아 응답 시간을 1.8초에서 0.3초로 줄였다.',
      star: {
        situation: '4인 팀 프로젝트 「모여봄」에서 프론트 팀원이 모임 검색 화면이 버벅인다고 알려 줌. 검색 한 번에 1.8초가 걸렸음.',
        task: '검색 API 담당으로서 원인을 찾고 응답 속도를 개선해야 했음.',
        action: '감으로 고치지 않고 쿼리 로그부터 확인해 N+1 문제를 발견함. fetch join으로 쿼리를 묶고, 검색 조건으로 가장 많이 쓰는 지역·카테고리 컬럼에 인덱스를 추가한 뒤 EXPLAIN으로 풀 스캔이 사라진 것을 확인함. 페이징과 함께 쓸 때 생긴 경고는 컬렉션 조회만 batch size로 따로 처리함.',
        result: '검색 API 평균 응답시간 1.8s → 0.3s.',
      },
      insights: '성능 문제는 감이 아니라 측정부터 해야 하고, 고친 방법이 만드는 부작용(페이징)까지 확인해야 한다.',
      keywords: ['문제해결', '분석력', '학습능력'], jobs: ['백엔드 개발자'],
      links: ['https://github.com/example/moyeobom'], qa: [],
      completeness: 92, createdAt: '2026-10-02', updatedAt: '2026-11-05',
    },
    {
      id: 'e8', title: '「모여봄」 API 명세 먼저 합의하기 — 프론트와의 협업', category: '프로젝트',
      period: { start: '2026-10', end: '2026-11' }, status: 'done', projectId: 'p1', sourceLogIds: ['l4'], codeRefs: ['gf_p1_8'],
      role: '백엔드', summary: '프론트가 API 응답 형식 변경으로 재작업이 잦자, Swagger 명세를 먼저 합의하고 구현하는 규칙을 제안해 수정 요청을 크게 줄였다.',
      star: {
        situation: '「모여봄」 개발 중 프론트 팀원이 API 응답 형식이 자꾸 바뀌어 힘들다고 이야기함.',
        task: '백엔드 담당으로서 프론트의 재작업을 줄일 방법이 필요했음.',
        action: '아무도 시키지 않았지만 구현 전에 Swagger로 명세를 먼저 작성해 프론트와 합의하고, 바꿀 때는 미리 공유하는 규칙을 제안함. 일이 늘어난다는 백엔드 팀원에게는 한 번만 해 보자고 설득함.',
        result: '프론트 팀원의 응답 형식 수정 요청이 주 2~3회에서 1회 정도로 줄었음. 처음엔 반대하던 백엔드 팀원도 해 본 뒤 오히려 편하다고 함.',
      },
      insights: '협업 문제는 사람이 아니라 합의 시점의 문제일 때가 많다.',
      keywords: ['협업', '주도성', '커뮤니케이션'], jobs: ['백엔드 개발자'],
      links: [], qa: [],
      completeness: 88, createdAt: '2026-10-15', updatedAt: '2026-11-18',
    },
    {
      id: 'e9', title: '「빈강의실」 중복 예약 버그 해결', category: '프로젝트',
      period: { start: '2025-04', end: '2025-06' }, status: 'done', projectId: 'p3', sourceLogIds: ['l10', 'l13'], codeRefs: ['gf_p3_1', 'gf_p3_2'],
      role: '백엔드 + 팀장', summary: '같은 강의실·시간에 예약이 두 건 들어가는 문제를 재현 테스트로 확인하고 DB 제약과 낙관적 락으로 막아, 시범 운영 동안 중복 예약 0건을 지켰다.',
      star: {
        situation: '캡스톤 「빈강의실」 테스트 중 같은 강의실·시간에 예약이 두 건 들어가는 중복 예약이 발생함.',
        task: '백엔드 담당으로 시범 운영 전에 동시 예약 문제를 확실히 막아야 했음.',
        action: 'CountDownLatch로 스레드 10개를 동시에 출발시켜 같은 강의실을 예약하는 재현 테스트를 만들어, 조회 후 저장 사이에 틈이 생기는 것을 확인함(락 전에는 10번 중 3~4번 중복). 강의실·시간 조합에 DB 유니크 제약을 걸고, 엔티티에 버전 필드를 둬 낙관적 락으로 충돌 시 사용자에게 다시 선택하도록 안내함.',
        result: '최종 발표 우수상. 학과 시범 운영 2주 동안 예약 120건, 중복 예약 0건.',
      },
      insights: '동시성 문제는 코드만 봐서는 안 보이고, 재현 테스트를 먼저 만들어야 잡힌다.',
      keywords: ['문제해결', '꼼꼼함', '분석력'], jobs: ['백엔드 개발자'],
      links: ['https://github.com/example/empty-classroom'], qa: [],
      completeness: 100, createdAt: '2025-06-20', updatedAt: '2026-11-12',
    },
    {
      id: 'e2', title: '카페 아르바이트 — 주문 대기 줄 줄이기', category: '아르바이트',
      period: { start: '2024-03', end: '2025-02' }, status: 'done',
      role: '바리스타 (주말 오픈조)', summary: '주말 피크 타임 대기 줄이 길어지는 문제를 보고, 주문 수를 직접 세어 근거를 만든 뒤 사전 준비와 역할 고정을 제안해 대기 시간을 줄였다.',
      star: {
        situation: '주말 오전 10~12시에 주문이 몰리면 대기 줄이 매장 밖까지 이어지고, 기다리다 그냥 나가는 손님도 있었음.',
        task: '오픈조 3명이 피크 시간을 더 빨리 처리할 방법이 필요했음.',
        action: '일주일 동안 메뉴별 주문 수를 직접 메모해 보니 아메리카노·라떼가 70%였음. 이 수치를 점장님께 보여 드리며 피크 30분 전에 샷을 미리 준비하고, 주문받는 사람/제조하는 사람 역할을 고정하자고 제안함.',
        result: '체감 대기 시간이 절반 가까이 줄었고, 단골손님이 먼저 기다리는 시간이 줄었다고 말해 줌. 점장님이 다른 타임에도 같은 방식을 적용함.',
      },
      insights: '평범한 알바에서도 "세어보기"만으로 개선 포인트를 찾을 수 있고, 바쁠수록 역할을 나눠야 덜 꼬인다.',
      keywords: ['고객지향', '분석력', '주도성', '커뮤니케이션'], jobs: ['백엔드 개발자', '서비스 기획자'],
      links: [], qa: [],
      completeness: 95, createdAt: '2026-11-02', updatedAt: '2026-11-11',
    },
    {
      id: 'e3', title: '알고리즘 스터디 운영', category: '동아리',
      period: { start: '2025-03', end: '2025-12' }, status: 'done',
      role: '스터디장, 6명', summary: '흐지부지되던 알고리즘 스터디를 맡아, 빠진 사람들에게 이유를 직접 묻고 난이도·진행 방식을 바꿔 10개월 동안 유지했다.',
      star: {
        situation: '학과 알고리즘 스터디가 3주 만에 참여율이 절반으로 떨어짐.',
        task: '스터디장을 맡아 끝까지 유지할 구조를 만들어야 했음.',
        action: '빠진 사람들에게 한 명씩 연락해 "언제 제일 그만두고 싶었는지" 물어보니, 문제를 못 풀고 발표만 듣는 날이라는 답이 많았음. 난이도를 3단계로 나누고 나가려던 팀원을 위해 쉬운 문제 트랙을 따로 만들었으며, 매주 기출 유형을 정리해 공유함.',
        result: '바꾸고 2주쯤 지나 빠지던 사람들이 다시 나오기 시작했고, 10개월간 평균 참여율 85% 유지. 6명 중 4명이 코딩테스트 통과.',
      },
      insights: '사람이 떠나는 이유를 직접 묻는 게 가장 빠르다.',
      keywords: ['리더십', '커뮤니케이션', '끈기'], jobs: ['백엔드 개발자'],
      links: [], qa: [],
      completeness: 90, createdAt: '2026-10-20', updatedAt: '2026-11-17',
    },
    {
      id: 'e4', title: '데이터베이스 수업 팀과제 — 연락 끊긴 팀원과 역할 재분배', category: '수업·과제',
      period: { start: '2025-09', end: '2025-12' }, status: 'done',
      role: '팀원 (ERD 설계)', summary: '팀원 한 명이 2주째 연락이 안 되던 상황에서 남은 셋이 역할을 다시 나누고, 교수님께 미리 알려 마감 안에 과제를 제출했다.',
      star: {
        situation: '4인 팀과제에서 한 명이 2주째 연락이 닿지 않음. 카톡과 학과 메일 모두 답이 없었음.',
        task: '마감까지 3주 남은 상황에서 남은 3명이 과제를 끝내야 했음.',
        action: '남은 팀원들과 미팅을 잡아 남은 작업을 쪼개고 다시 분배함. ERD 설계를 맡고 있던 내가 연락이 끊긴 팀원 몫이던 쿼리 작성까지 가져오고, 발표 자료는 다른 팀원이 맡음. 일정이 빠듯해 교수님께 상황을 미리 말씀드리고 중간 점검 일정을 받음.',
        result: '마감 안에 제출해 B+를 받음.',
      },
      insights: '문제가 생기면 혼자 떠안기보다 빨리 알리고 다시 나누는 게 낫다.',
      keywords: ['갈등조정', '책임감', '협업'], jobs: [],
      links: [], qa: [],
      completeness: 80, createdAt: '2026-11-15', updatedAt: '2026-11-15',
    },
    {
      id: 'e6', title: '교내 해커톤 — 24시간 안에 MVP', category: '대외활동',
      period: { start: '2025-05', end: '2025-05' }, status: 'done',
      role: '백엔드 + 발표', summary: '교내 해커톤에서 기능 범위를 과감히 줄이자고 제안해 분실물 찾기 서비스 데모를 완성하고 장려상을 받았다.',
      star: {
        situation: '24시간 교내 해커톤, 3인 팀. 시작 8시간쯤 지난 중간 점검에서 계획한 기능의 절반도 못 만든 상태였음.',
        task: '시간 안에 실제로 동작하는 데모를 완성해야 했음.',
        action: '처음부터 백엔드·프론트·발표로 역할을 나눠 두었고, 중간 점검 뒤 기능을 "등록-검색-알림" 3개로 줄이자고 제안함. 새벽에 막힌 알림 기능은 이메일로 대체하자고 했고, 아쉬워하는 팀원들에게 데모가 안 돌아가는 것보다 낫다고 설명함. 발표 중 데모가 멈출 때를 대비해 화면 녹화본도 따로 만들어 둠.',
        result: '데모 완성 및 장려상 수상.',
      },
      insights: '완벽함보다 범위를 줄이는 결정이 중요할 때가 있다.',
      keywords: ['의사결정', '협업', '커뮤니케이션'], jobs: ['백엔드 개발자'],
      links: [], qa: [], completeness: 90, createdAt: '2026-10-28', updatedAt: '2026-11-16',
    },
    {
      id: 'e7', title: '편의점 야간 아르바이트 — 재고 실수 줄이기', category: '아르바이트',
      period: { start: '2023-07', end: '2023-12' }, status: 'done',
      role: '야간 근무자', summary: '야간 검수 때 자주 생기던 재고 누락의 원인을 찾아 품목별 검수표를 만들었고, 한 달 만에 누락이 거의 사라졌다.',
      star: {
        situation: '새벽 2시쯤 들어오는 물류를 검수하는데, 아침에 보면 몇 개씩 비어 있어 아침 근무자와 자주 부딪힘.',
        task: '야간 근무자로서 검수 누락을 줄여야 했음.',
        action: '박스 단위로만 세고 낱개는 안 세던 것, 손님이 오면 검수가 중간에 끊기던 것이 원인이라고 보고 점장님께 말씀드려 품목별 검수표를 만듦. 낱개까지 체크하고, 끊기면 어디까지 했는지 표시하는 칸을 넣음.',
        result: '한 달쯤 지나 아침에 비는 일이 거의 없어졌고, 점장님이 다른 야간 근무자에게도 그 표를 쓰게 함.',
      },
      insights: '실수는 사람보다 절차의 빈틈에서 생긴다.',
      keywords: ['꼼꼼함', '주도성', '책임감'], jobs: [], links: [], qa: [],
      completeness: 85, createdAt: '2026-11-14', updatedAt: '2026-11-17',
    },
    {
      id: 'e10', title: '「모여봄」 JWT + Refresh Token 인증 설계', category: '프로젝트',
      period: { start: '2026-09', end: '2026-09' }, status: 'draft', projectId: 'p1', sourceLogIds: ['l2'], codeRefs: ['gf_p1_3'],
      role: '백엔드 (인증 담당)', summary: '모바일 확장을 고려해 세션 대신 JWT + Refresh Token 인증을 고르고, 장단점을 표로 정리해 팀에 공유했다.',
      star: {
        situation: '「모여봄」 인증 방식을 정해야 했는데 팀원마다 세션과 JWT 의견이 갈림.',
        task: '인증 담당으로 팀이 납득할 수 있는 근거를 갖고 방식을 정해야 했음.',
        action: '모바일 앱 확장 가능성을 기준으로 세션과 JWT의 장단점을 표로 비교해 공유하고, JWT + Refresh Token으로 결정함. 토큰 탈취 걱정에는 Refresh Token을 Redis에 사용자별로 저장하고 재발급할 때마다 새 토큰으로 바꾸는 방식으로 답함.',
        result: '팀이 같은 기준으로 인증 방식을 합의했고, 탈취된 Refresh Token은 한 번만 쓰일 수 있게 막음.',
      },
      insights: '', keywords: ['의사결정', '커뮤니케이션', '꼼꼼함'], jobs: ['백엔드 개발자'], links: [], qa: [],
      completeness: 70, createdAt: '2026-09-19', updatedAt: '2026-11-18',
    },
    {
      id: 'e11', title: '「모여봄」 배포 후 업로드 500 에러와 배포 체크리스트', category: '프로젝트',
      period: { start: '2026-11', end: '2026-11' }, status: 'draft', projectId: 'p1', sourceLogIds: ['l5'], codeRefs: ['gf_p1_5'],
      role: '백엔드', summary: '배포 직후 이미지 업로드가 500 에러로 실패한 원인을 찾고, 같은 실수를 막는 배포 체크리스트를 만들어 팀이 함께 쓰게 했다.',
      star: {
        situation: '「모여봄」 배포 직후 이미지 업로드가 500 에러로 실패함.',
        task: '원인을 찾아 고치고, 같은 실수가 다시 생기지 않게 해야 했음.',
        action: '서버 로그로 원인을 좁혀 파일 크기 제한 설정이 빠진 것을 찾아 고치고, 배포 전에 설정값을 확인하는 체크리스트를 만듦. 팀 회의에서 체크리스트를 같이 보며 배포 전에 한 번씩 확인하기로 함.',
        result: '이후 배포에서 같은 설정 실수가 다시 생기지 않았고, 팀원들도 실수가 줄었다고 함.',
      },
      insights: '', keywords: ['문제해결', '꼼꼼함', '책임감'], jobs: ['백엔드 개발자'], links: [], qa: [],
      completeness: 65, createdAt: '2026-11-10', updatedAt: '2026-11-19',
    },
    {
      id: 'e12', title: '「슬랙봇」 쓰는 사람에 맞춘 설계 — 슬랙 봇과 Postgres', category: '프로젝트',
      period: { start: '2026-10', end: '2026-11' }, status: 'draft', projectId: 'p2', sourceLogIds: ['l7'], codeRefs: [],
      role: '1인 개발', summary: '친구들이 슬랙에서 바로 쓰고 싶다는 말에 웹 대신 슬랙 봇으로 방향을 바꾸고, 여럿이 동시에 입력하는 상황을 고려해 SQLite 대신 Postgres를 골랐다.',
      star: {
        situation: '친구 3명과 공동 생활비를 관리할 가계부 서비스를 만들기로 함. 친구들이 실제로 쓰겠다고 함.',
        task: '1인 개발로, 친구들이 실제로 계속 쓸 수 있는 형태와 기술을 정해야 했음.',
        action: '처음엔 웹으로 만들려다가 친구들이 슬랙에서 바로 쓰고 싶다고 해서 봇으로 바꿈. DB는 여러 명이 동시에 입력하는 경우를 따져 보고 SQLite 대신 Postgres를 선택함.',
        result: '',
      },
      insights: '', keywords: ['의사결정', '고객지향'], jobs: ['백엔드 개발자'], links: [], qa: [],
      completeness: 55, createdAt: '2026-10-21', updatedAt: '2026-11-04',
    },
    {
      id: 'e16', title: '「슬랙봇」 지출이 두 번씩 저장되던 문제 해결', category: '프로젝트',
      period: { start: '2026-11', end: '2026-11' }, status: 'done', projectId: 'p2', sourceLogIds: [], codeRefs: [],
      role: '1인 개발', summary: '지출이 두 번씩 저장되던 문제를 요청 로그로 추적해 슬랙의 3초 재시도 때문인 걸 찾고, 먼저 응답하기와 이벤트 id 중복 체크로 막았다.',
      star: {
        situation: '친구 3명이 쓰는 가계부 슬랙봇에서 지출을 한 번 입력했는데 두 번씩 저장돼, 생활비가 두 배로 집계됨.',
        task: '혼자 만든 봇이라 직접 원인을 찾아 고쳐야 했음.',
        action: '처음엔 저장 코드를 의심했지만, 요청 로그를 찍어 같은 이벤트가 몇 초 간격으로 다시 들어오는 것을 확인함. 공식 문서에서 3초 안에 응답하지 않으면 슬랙이 재시도한다는 것을 찾고, 재시도 헤더(X-Slack-Retry-Num)가 있으면 바로 200을 돌려주며 이벤트 id를 저장해 같은 id는 한 번만 처리하게 함. 무거운 처리는 응답 뒤로 미룸.',
        result: '그 뒤로 중복 저장이 다시 생기지 않음.',
      },
      insights: '외부 서비스와 연동할 때는 같은 요청이 여러 번 올 수 있다는 걸 전제로 만들어야 한다.',
      keywords: ['문제해결', '끈기', '학습능력'], jobs: ['백엔드 개발자'], links: [], qa: [],
      completeness: 90, createdAt: '2026-11-06', updatedAt: '2026-11-06',
    },
    {
      id: 'e13', title: '「빈강의실」 PDF 시간표 파싱으로 강의실 데이터 만들기', category: '프로젝트',
      period: { start: '2025-03', end: '2025-04' }, status: 'draft', projectId: 'p3', sourceLogIds: ['l9'], codeRefs: ['gf_p3_3'],
      role: '백엔드 + 팀장', summary: '학과 시간표 API가 없어서, PDF 시간표를 파싱해 학기마다 다시 쓸 수 있는 강의실 데이터를 만들었다.',
      star: {
        situation: '빈 강의실을 찾으려면 시간표 데이터가 필요했지만 학과에 시간표 API가 없었음.',
        task: '시범 운영 전까지 강의실·시간 데이터를 확보해야 했음.',
        action: '수작업 입력 대신 학과 PDF 시간표를 파싱하기로 결정하고, 학기마다 다시 돌릴 수 있게 파서를 만듦. 강의실 이름 표기가 학기·과목마다 달라(「공학관 301」, 「공301」) 별칭 표를 따로 두고 맞춤.',
        result: '',
      },
      insights: '', keywords: ['문제해결', '의사결정', '꼼꼼함'], jobs: ['백엔드 개발자'], links: [], qa: [],
      completeness: 60, createdAt: '2025-03-24', updatedAt: '2026-11-08',
    },
    {
      id: 'e14', title: '「빈강의실」 일정이 밀렸을 때 기능 범위 조율', category: '프로젝트',
      period: { start: '2025-04', end: '2025-04' }, status: 'draft', projectId: 'p3', sourceLogIds: ['l11'], codeRefs: [],
      role: '팀장', summary: '중간발표 전 팀원 일정이 밀려 의견이 갈리자, 탓하지 않고 각자 가능한 양을 먼저 묻고 기능을 검색·예약·취소 3개로 줄이자고 조율했다.',
      star: {
        situation: '중간발표를 앞두고 팀원 한 명의 일정이 밀려 무엇을 먼저 할지 의견이 갈림.',
        task: '팀장으로서 발표 일정 안에 동작하는 결과물을 내야 했음.',
        action: '탓하는 말은 빼고 남은 3주 동안 각자 할 수 있는 양을 먼저 물어봄. 핵심 흐름만 남기자고 제안해 기능을 「검색·예약·취소」 3개로 줄이고 역할을 다시 나눔. 일정이 밀린 팀원은 취소 기능을 끝까지 맡겠다고 함.',
        result: '',
      },
      insights: '', keywords: ['갈등조정', '리더십', '커뮤니케이션'], jobs: ['백엔드 개발자'], links: [], qa: [],
      completeness: 60, createdAt: '2025-04-28', updatedAt: '2026-11-06',
    },
    {
      id: 'e15', title: '「빈강의실」 사용자 테스트로 예약 동선 고치기', category: '프로젝트',
      period: { start: '2025-05', end: '2025-06' }, status: 'draft', projectId: 'p3', sourceLogIds: ['l12'], codeRefs: [],
      role: '백엔드 + 팀장', summary: '실사용자 테스트와 시범 운영에서 받은 피드백으로 예약 취소·예약 확인 동선을 고쳤다.',
      star: {
        situation: '실사용자 5명 테스트에서 "예약 취소가 어디 있는지 모르겠다"는 피드백이 나왔고, 시범 운영 중에는 "예약이 됐는지 확인이 안 된다"는 말도 들음.',
        task: '',
        action: '예약 목록에서 바로 취소할 수 있게 버튼 위치를 옮기고, 예약 완료 화면에 강의실·시간을 크게 다시 보여 주게 바꿈.',
        result: '',
      },
      insights: '기능보다 사용자가 찾을 수 있는지가 먼저라는 걸 배움.', keywords: ['고객지향'], jobs: ['백엔드 개발자'], links: [], qa: [],
      completeness: 45, createdAt: '2025-05-19', updatedAt: '2026-11-13',
    },
  ];

  /* 서비스가 먼저 보내는 "오늘의 질문" 인박스. 답한 질문 하나 = 대화 하나 = 경험 하나.
     cardIds: 이 경험이 담긴 경험 카드 (빈 배열 = 아직 카드로 모으지 않은 경험) · keywords: 이 경험의 역량 키워드
     followups: 같은 대화에서 이어진 꼬리 질문과 답 · aboutProjectId: 체크인은 아니지만 이 프로젝트 이야기인 경우 */
  const inbox = [
    { id: 'h1', text: '요즘 "이건 꼭 기록해 두고 싶다" 싶었던 장면이 있었나요?', type: 'recall', targetExpId: null, hint: '', status: 'answered', askedAt: '2026-11-19 21:30', answer: '모여봄 회의에서 배포 체크리스트를 같이 보면서 다들 실수가 줄었다고 해서 뿌듯했어요.', answeredAt: '2026-11-19', cardIds: ['e11'], keywords: ['꼼꼼함', '협업'] },
    { id: 'q1', text: '「모여봄」 이번 주에 팀원과 의견이 갈렸던 순간이 있었나요?', type: 'project', targetExpId: null, targetProjectId: 'p1', checkin: true, checkinType: 'collab', checkinText: '이번 주에 팀원과 의견이 갈렸던 순간이 있었나요?', hint: '작은 의견 차이도 좋아요. 변수명, 일정, 기술 선택 같은 것도요.', status: 'pending', askedAt: '2026-11-19 12:30' },
    { id: 'q2', text: '편의점 야간 알바에서 재고 누락이 생겼을 때, 아침 근무자분과는 어떻게 이야기했어요?', type: 'deepen', targetExpId: 'e7', hint: '서로 어떤 말을 주고받았는지 떠올려 보세요.', status: 'pending', askedAt: '2026-11-18 21:30' },
    { id: 'h54', text: '「모여봄」 코드에서 「JWT + Spring Security 인증 구현」을 찾았어요. 왜 이렇게 만들게 됐나요?', type: 'code', targetExpId: null, targetProjectId: 'p1', findingId: 'gf_p1_3', hint: '어떤 문제가 있었는지 한두 줄이면 돼요.', status: 'answered', askedAt: '2026-11-18 21:00', answer: '나중에 모바일 앱도 붙일 생각이라 세션보다 JWT가 낫다고 봤어요. 다만 팀원들이 토큰이 털리면 어떡하냐고 걱정해서 Refresh Token을 같이 두기로 했어요.', answeredAt: '2026-11-18', cardIds: ['e10'], keywords: ['의사결정', '꼼꼼함'],
      followups: [{ ai: 'Refresh Token은 어디에 두고, 탈취는 어떻게 막았어요?', me: 'Redis에 사용자별로 저장하고, 재발급할 때마다 새 토큰으로 바꿔서 털린 토큰은 한 번만 쓸 수 있게 했어요.' }] },
    { id: 'h2', text: 'API 명세를 먼저 합의하고 나서, 프론트와의 재작업이 실제로 줄었나요?', type: 'deepen', targetExpId: 'e8', hint: '전후로 달라진 점을 숫자나 장면으로 떠올려 보세요.', status: 'answered', askedAt: '2026-11-18 12:30', answer: '응답 형식 때문에 다시 고치는 일이 거의 없어졌어요. 프론트 팀원이 주 2~3번 하던 수정 요청이 한 번 정도로 줄었다고 했어요.', answeredAt: '2026-11-18', cardIds: ['e8'], keywords: ['협업', '커뮤니케이션'] },
    { id: 'q3', text: '최근 한 달 동안 "이건 내가 처음 해본 거다" 싶은 일이 있었나요?', type: 'recall', targetExpId: null, hint: '공부, 운동, 요리, 여행 계획… 뭐든 괜찮아요.', status: 'pending', askedAt: '2026-11-18 12:30' },
    { id: 'q4', text: '알고리즘 스터디에서 그만두려던 팀원을 붙잡은 적이 있나요?', type: 'deepen', targetExpId: 'e3', hint: '', status: 'answered', askedAt: '2026-11-17 21:30', answer: '한 명이 너무 어렵다고 나가려 해서, 쉬운 문제 트랙을 따로 만들어 줬어요.', answeredAt: '2026-11-17', cardIds: ['e3'], keywords: ['리더십', '창의성'] },
    { id: 'q5', text: '누군가에게 무언가를 가르쳐 준 기억이 있나요?', type: 'recall', targetExpId: null, hint: '', status: 'skipped', askedAt: '2026-11-17 12:30' },
    // ---- 지난 기록 (홈 달력·연속 기록용) ----
    { id: 'h3', text: '해커톤에서 알림 기능을 이메일로 대체하자고 했을 때, 팀원들 반응은 어땠어요?', type: 'deepen', targetExpId: 'e6', hint: '', status: 'answered', askedAt: '2026-11-16 21:30', answer: '처음엔 아쉬워했는데, 데모가 안 돌아가는 것보다 낫다고 설명하니까 바로 동의해 줬어요.', answeredAt: '2026-11-16', cardIds: ['e6'], keywords: ['커뮤니케이션', '의사결정'] },
    { id: 'h4', text: '최근에 누군가에게 고맙다는 말을 들은 일이 있나요?', type: 'recall', targetExpId: null, hint: '사소한 도움도 괜찮아요.', status: 'answered', askedAt: '2026-11-16 12:30', answer: '스터디 후배가 제가 정리해 준 DP 풀이 덕분에 코테 문제를 풀었다고 연락 왔어요.', answeredAt: '2026-11-16', cardIds: [], keywords: ['커뮤니케이션'] },
    { id: 'h5', text: '그 팀원에게 직접 연락해 본 적이 있나요? 어떻게 했어요?', type: 'deepen', targetExpId: 'e4', hint: '', status: 'answered', askedAt: '2026-11-15 21:30', answer: '카톡이랑 학과 메일 둘 다 보냈는데 답이 없었어요.', answeredAt: '2026-11-15', cardIds: ['e4'], keywords: ['책임감', '커뮤니케이션'] },
    { id: 'h6', text: '수업 팀과제에서 마음고생했던 기억이 있나요?', type: 'recall', targetExpId: null, hint: '연락 두절, 역할 분담, 마감 직전 같은 상황도요.', status: 'answered', askedAt: '2026-11-15 12:30', answer: '데이터베이스 수업 팀과제 때 한 명이 2주 동안 연락이 안 돼서 남은 셋이 다시 역할을 나눴어요.', answeredAt: '2026-11-15', cardIds: ['e4'], keywords: ['갈등조정', '협업'],
      followups: [
        { ai: '역할을 다시 나눌 때, 본인은 어떤 부분을 맡았어요?', me: '제가 ERD 설계를 맡고 있어서, 연락 안 되는 팀원 몫이던 쿼리 작성까지 가져왔어요. 대신 발표 자료는 다른 팀원이 맡기로 했어요.' },
        { ai: '마감은 지킬 수 있었어요?', me: '빠듯했는데 교수님께 미리 상황을 말씀드리고 중간 점검 일정을 받아서 제때 냈어요. 결과는 B+였어요.' },
      ] },
    { id: 'h8', text: '평소에 남들보다 꼼꼼하게 챙기는 일이 있나요?', type: 'recall', targetExpId: null, hint: '', status: 'answered', askedAt: '2026-11-14 21:30', answer: '편의점 야간 알바할 때 검수표를 따로 만들어서 들어온 물건을 하나씩 체크했어요.', answeredAt: '2026-11-14', cardIds: ['e7'], keywords: ['꼼꼼함', '주도성'] },
    { id: 'h7', text: '「슬랙봇」 이번 주에 새로 배운 기술이나 방법이 있나요?', type: 'project', targetExpId: null, targetProjectId: 'p2', checkin: true, checkinType: 'learning', checkinText: '이번 주에 새로 배운 기술이나 방법이 있나요?', hint: '', status: 'skipped', askedAt: '2026-11-14 12:30' },
    { id: 'h9', text: '「빈강의실」 시범 운영 중에 사용자에게 받은 피드백 중 기억나는 게 있나요?', type: 'deepen', targetExpId: 'e15', hint: '', status: 'answered', askedAt: '2026-11-13 21:30', answer: '학생들이 예약이 됐는지 확인이 안 된다고 해서, 예약 완료 화면에 강의실이랑 시간을 크게 다시 보여 주게 바꿨어요.', answeredAt: '2026-11-13', cardIds: ['e15'], keywords: ['고객지향'] },
    { id: 'h10', text: '최근에 계획대로 안 됐지만 끝까지 해낸 일이 있나요?', type: 'recall', targetExpId: null, hint: '', status: 'skipped', askedAt: '2026-11-13 12:30' },
    { id: 'h11', text: '중복 예약을 재현 테스트로 확인할 때, 어떻게 동시 요청을 만들었어요?', type: 'deepen', targetExpId: 'e9', hint: '사용한 도구나 방법을 떠올려 보세요.', status: 'answered', askedAt: '2026-11-12 12:30', answer: 'CountDownLatch로 스레드 10개를 동시에 출발시켜서 같은 강의실을 예약하게 했어요. 락 넣기 전엔 10번 중 3~4번은 중복이 생겼어요.', answeredAt: '2026-11-12', cardIds: ['e9'], keywords: ['문제해결', '꼼꼼함', '분석력'] },
    { id: 'h12', text: '샷을 미리 준비하자고 했을 때, 점장님을 어떻게 설득했어요?', type: 'deepen', targetExpId: 'e2', hint: '', status: 'answered', askedAt: '2026-11-11 21:30', answer: '일주일 동안 센 메뉴별 주문 수를 보여 드렸더니 한번 해 보자고 하셨어요.', answeredAt: '2026-11-11', cardIds: ['e2'], keywords: ['커뮤니케이션', '분석력'] },
    { id: 'h13', text: '최근에 실수를 하고 나서 다시 안 생기게 바꾼 게 있나요?', type: 'recall', targetExpId: null, hint: '', status: 'answered', askedAt: '2026-11-11 12:30', answer: '이미지 업로드 에러 이후로 배포 전에 설정값을 확인하는 체크리스트를 만들어서 쓰고 있어요.', answeredAt: '2026-11-11', cardIds: ['e11'], keywords: ['꼼꼼함', '책임감'] },
    { id: 'h14', text: '「모여봄」 최근에 막혔던 문제가 있었나요? 원인은 무엇이었나요?', type: 'project', targetExpId: null, targetProjectId: 'p1', checkin: true, checkinType: 'issue', checkinText: '최근에 막혔던 문제가 있었나요? 원인은 무엇이었나요?', hint: '', status: 'answered', askedAt: '2026-11-10 21:30', answer: '배포 후 이미지 업로드 500 에러. 파일 크기 제한 설정 누락이었음. 체크리스트 만듦.', answeredAt: '2026-11-10', cardIds: ['e11'] },
    { id: 'h15', text: '요즘 가장 시간을 많이 쓰고 있는 일은 뭐예요?', type: 'recall', targetExpId: null, hint: '', status: 'answered', askedAt: '2026-11-10 12:30', answer: '모여봄 배포 준비랑 코테 공부를 번갈아 하고 있어요.', answeredAt: '2026-11-10', cardIds: [], keywords: ['학습능력'], aboutProjectId: 'p1' },
    { id: 'h16', text: '스터디 참여자 인터뷰를 할 때, 어떤 질문을 했어요?', type: 'deepen', targetExpId: 'e3', hint: '', status: 'answered', askedAt: '2026-11-09 21:30', answer: '"언제 제일 그만두고 싶었는지"를 물어봤어요. 대부분 문제를 못 풀고 발표만 듣는 날이라고 했어요.', answeredAt: '2026-11-09', cardIds: ['e3'], keywords: ['커뮤니케이션', '분석력'] },
    { id: 'h17', text: '처음 보는 사람들과 금방 친해졌던 경험이 있나요?', type: 'recall', targetExpId: null, hint: '', status: 'answered', askedAt: '2026-11-09 12:30', answer: '부트캠프 첫 주에 조 편성이 됐는데, 제가 먼저 점심 같이 먹자고 해서 금방 친해졌어요.', answeredAt: '2026-11-09', cardIds: [], keywords: ['주도성', '협업'] },
    { id: 'h52', text: 'PDF 시간표를 파싱할 때 가장 까다로웠던 부분은 뭐였어요?', type: 'deepen', targetExpId: 'e13', hint: '', status: 'answered', askedAt: '2026-11-08 21:30', answer: '강의실 이름 표기가 과목마다 달랐어요. 「공학관 301」이라고 쓴 데도 있고 「공301」이라고 쓴 데도 있어서 별칭 표를 따로 만들어 맞췄어요.', answeredAt: '2026-11-08', cardIds: ['e13'], keywords: ['문제해결', '꼼꼼함'] },
    { id: 'h19', text: '최근에 다른 사람의 부탁을 들어준 일이 있나요?', type: 'recall', targetExpId: null, hint: '', status: 'answered', askedAt: '2026-11-07 21:30', answer: '친구 졸업작품 서버가 자꾸 죽는다고 해서 같이 로그를 봐 줬어요. 메모리가 부족해서 죽는 거였어요.', answeredAt: '2026-11-07', cardIds: [], keywords: ['문제해결', '협업'] },
    { id: 'h18', text: '「슬랙봇」 팀원과 의견을 맞추거나 도움을 주고받은 순간이 있었나요?', type: 'project', targetExpId: null, targetProjectId: 'p2', checkin: true, checkinType: 'collab', checkinText: '팀원과 의견을 맞추거나 도움을 주고받은 순간이 있었나요?', hint: '', status: 'skipped', askedAt: '2026-11-07 12:30' },
    { id: 'h53', text: '「빈강의실」 기능을 3개로 줄이자고 했을 때, 일정이 밀린 팀원과는 어떻게 이야기했어요?', type: 'deepen', targetExpId: 'e14', hint: '', status: 'answered', askedAt: '2026-11-06 21:30', answer: '탓하는 말은 빼고, 남은 3주 동안 각자 할 수 있는 양을 먼저 물어봤어요. 그 팀원이 취소 기능은 끝까지 맡겠다고 했어요.', answeredAt: '2026-11-06', cardIds: ['e14'], keywords: ['갈등조정', '커뮤니케이션', '리더십'] },
    { id: 'h20', text: '마감에 쫓기면서 우선순위를 정해야 했던 적이 있나요?', type: 'recall', targetExpId: null, hint: '', status: 'skipped', askedAt: '2026-11-06 12:30' },
    { id: 'h21', text: '인덱스를 추가할 때, 어떤 컬럼에 걸지 어떻게 정했어요?', type: 'deepen', targetExpId: 'e1', hint: '실행 계획(EXPLAIN)을 봤는지도 떠올려 보세요.', status: 'answered', askedAt: '2026-11-05 21:30', answer: '검색 조건으로 제일 많이 쓰는 지역이랑 카테고리 컬럼을 골랐어요. EXPLAIN으로 풀 스캔이 사라진 걸 확인했어요.', answeredAt: '2026-11-05', cardIds: ['e1'], keywords: ['분석력', '문제해결'] },
    { id: 'h22', text: '혼자 힘으로 끝까지 파고들어 해결한 일이 있나요?', type: 'recall', targetExpId: null, hint: '', status: 'answered', askedAt: '2026-11-05 12:30', answer: '슬랙봇 이벤트가 두 번씩 들어오는 문제를 공식 문서 뒤져서 재시도 헤더 때문인 걸 찾았어요.', answeredAt: '2026-11-05', cardIds: ['e16'], keywords: ['끈기', '학습능력', '문제해결'],
      followups: [{ ai: '재시도 헤더를 찾고 나서 어떻게 고쳤어요?', me: 'X-Slack-Retry-Num 헤더가 있으면 바로 200을 돌려주고, 이벤트 id를 DB에 저장해서 같은 id는 한 번만 처리하게 했어요.' }] },
    { id: 'h23', text: '「슬랙봇」 이번 주에 내린 기술적·기획적 결정이 있나요? 다른 선택지는 무엇이었나요?', type: 'project', targetExpId: null, targetProjectId: 'p2', checkin: true, checkinType: 'decision', checkinText: '이번 주에 내린 기술적·기획적 결정이 있나요? 다른 선택지는 무엇이었나요?', hint: '', status: 'answered', askedAt: '2026-11-04 21:30', answer: 'DB를 SQLite로 할지 Postgres로 할지 → 동시 입력 고려해서 Postgres.', answeredAt: '2026-11-04', cardIds: ['e12'] },
    { id: 'h24', text: '돈이나 시간을 아끼려고 직접 방법을 만들어 본 적이 있나요?', type: 'recall', targetExpId: null, hint: '', status: 'answered', askedAt: '2026-11-04 12:30', answer: '친구들이랑 생활비 나누는 게 귀찮아서 엑셀 대신 슬랙봇을 만들고 있어요.', answeredAt: '2026-11-04', cardIds: [], keywords: ['주도성', '창의성'], aboutProjectId: 'p2' },
    { id: 'h25', text: '해커톤에서 기능을 3개로 줄이자고 한 건 몇 시쯤이었고, 왜 그때였어요?', type: 'deepen', targetExpId: 'e6', hint: '', status: 'answered', askedAt: '2026-11-03 21:30', answer: '시작하고 8시간쯤 지났을 때요. 중간 점검에서 절반도 못 만든 걸 보고 이대로는 안 되겠다 싶었어요.', answeredAt: '2026-11-04', cardIds: ['e6'], keywords: ['의사결정', '리더십'] },
    { id: 'h26', text: '해커톤에서 발표를 맡았을 때 어떻게 준비했어요?', type: 'deepen', targetExpId: 'e6', hint: '', status: 'answered', askedAt: '2026-11-03 12:30', answer: '데모가 중간에 멈출까 봐 화면 녹화본을 따로 만들어 뒀어요.', answeredAt: '2026-11-03', cardIds: ['e6'], keywords: ['꼼꼼함', '책임감'] },
    { id: 'h27', text: '아르바이트하면서 "이건 좀 비효율적인데?" 싶었던 순간이 있었나요?', type: 'recall', targetExpId: null, hint: '', status: 'answered', askedAt: '2026-11-02 21:30', answer: '카페에서 주말 오전에 줄이 너무 길어서 손님들이 그냥 나가는 경우가 있었어요.', answeredAt: '2026-11-02', cardIds: ['e2'], keywords: ['고객지향', '분석력'],
      followups: [{ ai: '손님이 나가는 걸 보고 먼저 뭘 해 봤어요?', me: '바로 바꾸진 못했고, 일주일 동안 메뉴별로 몇 잔 나가는지 메모했어요. 아메리카노랑 라떼가 70% 정도였어요.' }] },
    { id: 'h28', text: '손님이나 사용자를 상대하면서 기억에 남는 일이 있나요?', type: 'recall', targetExpId: null, hint: '', status: 'answered', askedAt: '2026-11-02 12:30', answer: '카페에서 단골손님이 주문 기다리는 시간이 줄었다고 먼저 말해 준 적이 있어요.', answeredAt: '2026-11-02', cardIds: ['e2'], keywords: ['고객지향'] },
    { id: 'h29', text: '스터디 난이도를 3단계로 나눈 뒤, 참여율이 언제부터 회복됐어요?', type: 'deepen', targetExpId: 'e3', hint: '', status: 'answered', askedAt: '2026-10-31 21:30', answer: '바꾸고 2주쯤 지나니까 빠지던 사람들이 다시 나오기 시작했어요.', answeredAt: '2026-10-31', cardIds: ['e3'], keywords: ['끈기', '리더십'] },
    { id: 'h30', text: '「모여봄」 이번 주에 완성하거나 배포한 것이 있나요?', type: 'project', targetExpId: null, targetProjectId: 'p1', checkin: true, checkinType: 'milestone', checkinText: '이번 주에 완성하거나 배포한 것이 있나요?', hint: '', status: 'skipped', askedAt: '2026-10-31 12:30' },
    { id: 'h31', text: '최근에 새로 시작한 습관이 있나요?', type: 'recall', targetExpId: null, hint: '', status: 'answered', askedAt: '2026-10-30 21:30', answer: '아침마다 알고리즘 문제 하나씩 풀고 깃허브에 올리고 있어요.', answeredAt: '2026-10-30', cardIds: [], keywords: ['끈기', '학습능력'] },
    { id: 'h32', text: '다른 사람의 의견을 듣고 생각을 바꾼 적이 있나요?', type: 'recall', targetExpId: null, hint: '', status: 'answered', askedAt: '2026-10-30 12:30', answer: '슬랙봇을 웹으로 만들려다가 친구들이 슬랙에서 바로 쓰고 싶다고 해서 봇으로 바꿨어요.', answeredAt: '2026-10-30', cardIds: ['e12'], keywords: ['고객지향', '의사결정'] },
    { id: 'h33', text: 'N+1을 찾기 전에 의심했던 다른 원인이 있었나요?', type: 'deepen', targetExpId: 'e1', hint: '', status: 'skipped', askedAt: '2026-10-29 21:30' },
    { id: 'h34', text: '처음 맡아 본 역할 때문에 부담됐던 적이 있나요?', type: 'recall', targetExpId: null, hint: '', status: 'skipped', askedAt: '2026-10-29 12:30' },
    { id: 'h35', text: '대회나 공모전에 나가 본 적이 있나요?', type: 'recall', targetExpId: null, hint: '교내 행사, 해커톤, 아이디어 공모전도 좋아요.', status: 'answered', askedAt: '2026-10-28 21:30', answer: '작년 교내 해커톤에서 분실물 찾기 서비스를 24시간 안에 만들어서 장려상 받았어요.', answeredAt: '2026-10-28', cardIds: ['e6'], keywords: ['협업', '책임감'] },
    { id: 'h36', text: '「슬랙봇」 최근에 막혔던 문제가 있었나요? 원인은 무엇이었나요?', type: 'project', targetExpId: null, targetProjectId: 'p2', checkin: true, checkinType: 'issue', checkinText: '최근에 막혔던 문제가 있었나요? 원인은 무엇이었나요?', hint: '', status: 'skipped', askedAt: '2026-10-28 12:30' },
    { id: 'h37', text: '모임에서 정해 둔 규칙을 바꿔 본 적이 있나요?', type: 'recall', targetExpId: null, hint: '', status: 'answered', askedAt: '2026-10-27 21:30', answer: '스터디 발표 순서인 사람이 자주 빠져서, 못 오면 다음 사람이랑 바꾸는 규칙을 추가했어요.', answeredAt: '2026-10-27', cardIds: [], keywords: ['리더십', '책임감'] },
    { id: 'h38', text: '오래 붙잡고 있던 일을 결국 해낸 경험이 있나요?', type: 'recall', targetExpId: null, hint: '', status: 'answered', askedAt: '2026-10-26 21:30', answer: '골드 문제 하나를 일주일 넘게 붙잡다가 결국 풀었을 때가 기억나요.', answeredAt: '2026-10-26', cardIds: [], keywords: ['끈기'] },
    { id: 'h39', text: '요즘 가장 재미있게 하고 있는 일은 뭐예요?', type: 'recall', targetExpId: null, hint: '', status: 'answered', askedAt: '2026-10-26 12:30', answer: '가계부 슬랙봇이요. 친구들이 실제로 써 주니까 기능 하나 붙일 때마다 재밌어요.', answeredAt: '2026-10-26', cardIds: [], keywords: ['고객지향'], aboutProjectId: 'p2' },
    { id: 'h40', text: 'fetch join으로 바꾸고 나서 생긴 부작용은 없었나요?', type: 'deepen', targetExpId: 'e1', hint: '페이징, 중복 데이터 같은 것도요.', status: 'answered', askedAt: '2026-10-25 21:30', answer: '페이징이랑 같이 쓰니까 경고가 떠서, 컬렉션 조회는 batch size로 따로 처리했어요.', answeredAt: '2026-10-25', cardIds: ['e1'], keywords: ['문제해결', '학습능력'] },
    { id: 'h41', text: '아르바이트를 하면서 배운 점이 있나요?', type: 'recall', targetExpId: null, hint: '', status: 'answered', askedAt: '2026-10-25 12:30', answer: '바쁠수록 역할을 딱 나눠야 덜 꼬인다는 걸 카페에서 배웠어요. 해커톤 때도 그래서 백엔드·프론트·발표를 처음부터 나눴어요.', answeredAt: '2026-10-25', cardIds: ['e2', 'e6'], keywords: ['협업', '의사결정'] },
    { id: 'h42', text: 'Swagger 명세를 먼저 쓰자고 제안했을 때, 백엔드 팀원은 어떻게 반응했어요?', type: 'deepen', targetExpId: 'e8', hint: '', status: 'answered', askedAt: '2026-10-24 21:30', answer: '처음엔 일이 늘어난다고 했는데, 한 번 해 보고 나서는 오히려 편하다고 했어요.', answeredAt: '2026-10-24', cardIds: ['e8'], keywords: ['커뮤니케이션', '협업'] },
    { id: 'h43', text: '최근에 팀에서 먼저 나서서 한 일이 있나요?', type: 'recall', targetExpId: null, hint: '', status: 'answered', askedAt: '2026-10-24 12:30', answer: '모여봄에서 API 명세를 먼저 맞추자고 제가 제안했어요.', answeredAt: '2026-10-24', cardIds: ['e8'], keywords: ['주도성'] },
    { id: 'h44', text: '동아리나 모임에서 맡았던 역할이 있나요?', type: 'recall', targetExpId: null, hint: '', status: 'answered', askedAt: '2026-10-23 21:30', answer: '학과 알고리즘 스터디에서 스터디장을 10개월 동안 맡았어요.', answeredAt: '2026-10-24', cardIds: [], keywords: ['리더십', '책임감'] },
    { id: 'h45', text: '스터디원 6명 중 4명이 코테를 통과했을 때, 본인은 어떤 역할을 했다고 생각해요?', type: 'deepen', targetExpId: 'e3', hint: '', status: 'answered', askedAt: '2026-10-23 12:30', answer: '매주 기출 유형을 정리해서 공유했어요. 다들 그 정리본으로 복습했다고 했어요.', answeredAt: '2026-10-23', cardIds: ['e3'], keywords: ['책임감', '커뮤니케이션'] },
    { id: 'h46', text: '스터디 참여율이 떨어졌을 때, 가장 먼저 한 일은 뭐였어요?', type: 'deepen', targetExpId: 'e3', hint: '', status: 'answered', askedAt: '2026-10-22 21:30', answer: '빠진 사람들한테 한 명씩 따로 연락해서 왜 안 나오는지 물어봤어요.', answeredAt: '2026-10-22', cardIds: ['e3'], keywords: ['주도성', '커뮤니케이션'],
      followups: [{ ai: '연락해 보니 어떤 이유가 가장 많았어요?', me: '문제가 너무 어려워서 혼자 못 풀고 오면 민망하다는 얘기가 제일 많았어요.' }] },
    { id: 'h47', text: '최근에 새로 시작한 프로젝트나 공부가 있나요?', type: 'recall', targetExpId: null, hint: '', status: 'answered', askedAt: '2026-10-22 12:30', answer: '친구들이랑 쓸 가계부 슬랙봇을 혼자 만들기 시작했어요.', answeredAt: '2026-10-22', cardIds: [], keywords: ['주도성'], aboutProjectId: 'p2' },
    { id: 'h48', text: '「슬랙봇」 이번 주에 완성하거나 배포한 것이 있나요?', type: 'project', targetExpId: null, targetProjectId: 'p2', checkin: true, checkinType: 'milestone', checkinText: '이번 주에 완성하거나 배포한 것이 있나요?', hint: '', status: 'answered', askedAt: '2026-10-21 21:30', answer: '아이디어 시작. 친구 3명이 실제로 쓰겠다고 함.', answeredAt: '2026-10-21', cardIds: ['e12'], keywords: ['고객지향'] },
    { id: 'h49', text: '사람들을 모아서 무언가를 해 본 적이 있나요?', type: 'recall', targetExpId: null, hint: '', status: 'answered', askedAt: '2026-10-21 12:30', answer: '스터디원들 시간 맞춰서 매주 모이게 하는 게 제 일이었어요.', answeredAt: '2026-10-21', cardIds: [], keywords: ['리더십', '협업'] },
    { id: 'h50', text: '「모여봄」 팀원과 의견을 맞추거나 도움을 주고받은 순간이 있었나요?', type: 'project', targetExpId: null, targetProjectId: 'p1', checkin: true, checkinType: 'collab', checkinText: '팀원과 의견을 맞추거나 도움을 주고받은 순간이 있었나요?', hint: '', status: 'skipped', askedAt: '2026-10-20 21:30' },
    { id: 'h51', text: '무언가를 꾸준히 오래 해 본 경험이 있나요?', type: 'recall', targetExpId: null, hint: '', status: 'skipped', askedAt: '2026-10-20 12:30' },
  ];

  /* AI와 길게 나눈 대화 — 한 번의 깊은 대화로 경험 카드 한 장이 바로 만들어진 경우 (대화 기록 source 'chat') */
  const chats = [
    {
      id: 'c1', date: '2026-11-17', at: '22:10', projectId: null, cardIds: ['e7'], keywords: ['꼼꼼함', '주도성', '책임감'], title: '편의점 야간 검수 누락을 검수표로 줄인 이야기',
      msgs: [
        { who: 'ai', text: '편의점 야간 아르바이트 이야기를 해 볼까요? 그때 가장 기억에 남는 일이 뭐예요?' },
        { who: 'me', text: '새벽 2시쯤 물류가 들어오면 검수를 하는데, 아침에 보면 몇 개씩 비어 있어서 아침 근무자분이랑 자주 부딪혔어요.' },
        { who: 'ai', text: '누락이 왜 생겼는지 짐작 가는 게 있었어요?' },
        { who: 'me', text: '박스 단위로만 세고 안에 든 낱개는 안 세서, 박스 안 수량이 다르면 놓쳤어요. 손님이 오면 중간에 끊기기도 했고요.' },
        { who: 'ai', text: '그래서 어떻게 바꿨어요?' },
        { who: 'me', text: '점장님께 말씀드리고 품목별 검수표를 따로 만들었어요. 낱개까지 체크하고, 손님 때문에 끊기면 어디까지 했는지 표시해 두는 칸을 넣었어요.' },
        { who: 'ai', text: '바꾸고 나서 달라진 게 있었어요?' },
        { who: 'me', text: '한 달쯤 지나니까 아침에 비는 일이 거의 없어졌고, 점장님이 다른 야간 근무자한테도 그 표를 쓰게 하셨어요.' },
      ],
    },
    {
      id: 'c2', date: '2026-11-06', at: '22:40', projectId: 'p2', cardIds: ['e16'], keywords: ['문제해결', '끈기', '학습능력'], title: '슬랙봇 지출 중복 저장의 원인을 찾은 이야기',
      msgs: [
        { who: 'ai', text: '「슬랙봇」을 만들면서 가장 오래 붙잡고 있던 문제가 뭐였어요?' },
        { who: 'me', text: '지출을 한 번 입력했는데 기록이 두 번씩 저장되는 문제요. 친구들이 이번 달 생활비가 두 배로 나왔다고 해서 알았어요.' },
        { who: 'ai', text: '원인을 찾으려고 처음에 뭘 해 봤어요?' },
        { who: 'me', text: '처음엔 제 코드에서 저장을 두 번 하는 줄 알고 한참 봤는데 아니었어요. 요청 로그를 찍어 보니까 같은 이벤트가 몇 초 간격으로 다시 들어오고 있었어요.' },
        { who: 'ai', text: '왜 다시 들어왔던 거예요?' },
        { who: 'me', text: '슬랙은 3초 안에 응답이 없으면 이벤트를 다시 보내더라고요. 제가 DB 저장이랑 리포트 계산까지 다 끝내고 응답해서 3초를 넘겼던 거예요.' },
        { who: 'ai', text: '이번 일로 배운 게 있다면요?' },
        { who: 'me', text: '외부 서비스랑 연동할 땐 같은 요청이 여러 번 올 수 있다는 걸 기본으로 두고 만들어야 한다는 거요. 그 뒤로는 응답부터 보내고 무거운 처리는 나중에 해요.' },
      ],
    },
  ];

  // 경험 카드의 출처(qa) = 그 카드에 담긴 경험(대화)의 질문·답. 프로젝트 체크인은 sourceLogIds 로 이어지므로 qa 에 넣지 않는다
  (function linkCardSources() {
    const card = (id) => experiences.find((e) => e.id === id);
    inbox.filter((q) => q.status === 'answered' && q.answer && q.type !== 'project').forEach((q) => {
      const ids = Array.isArray(q.cardIds) ? q.cardIds : q.targetExpId ? [q.targetExpId] : [];
      const tid = 't_' + q.id; const date = q.answeredAt || String(q.askedAt || '').slice(0, 10);
      ids.map(card).filter(Boolean).forEach((e) => {
        e.qa.push({ q: q.text, a: q.answer, date, source: 'answer', qid: q.id, threadId: tid });
        (q.followups || []).forEach((f) => e.qa.push({ q: f.ai, a: f.me, date, source: 'answer', qid: q.id, threadId: tid }));
      });
    });
    chats.forEach((c) => {
      const tid = 't_' + c.id;
      (c.cardIds || []).map(card).filter(Boolean).forEach((e) => {
        c.msgs.forEach((m, i) => { if (m.who === 'me') e.qa.push({ q: (c.msgs[i - 1] && c.msgs[i - 1].who === 'ai') ? c.msgs[i - 1].text : '(대화방에서 한 이야기)', a: m.text, date: c.date, source: 'chat', qid: null, threadId: tid }); });
      });
    });
    experiences.forEach((e) => e.qa.sort((a, b) => a.date.localeCompare(b.date)));
  })();

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

  return { keywords, categories, user, settings, projects, experiences, inbox, chats, applications, recallPrompts, followups, projectCheckins, sampleQuestions };
})();
