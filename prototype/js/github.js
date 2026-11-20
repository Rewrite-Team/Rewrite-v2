/* 깃허브 레포 분석: App.github. 담당: 레포 분석
   공개 GitHub REST API(비인증)로 레포 메타·언어·파일 트리를 받고, 고른 파일(≤30개)을 raw 로 읽어
   규칙 기반 분석기(정규식 = 목업 "AI")로 이력서에 쓸 만한 기술 포인트를 찾는다.
   각 포인트는 어느 파일 몇 번째 줄에서 나왔는지(evidence) 를 함께 돌려준다. */
(function (App) {
  const API = 'https://api.github.com';
  const RAW = 'https://raw.githubusercontent.com';
  const MAX_FILES = 30;
  const MAX_FINDINGS = 10;
  const MAX_SNIPPET = 18;

  const today = () => { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const keyOf = (owner, name) => `${owner}/${name}`.toLowerCase();

  /* ---------------- URL ---------------- */
  // https://github.com/o/r, .git, /tree/branch, 끝 슬래시, github.com/o/r, git@github.com:o/r.git 를 받는다.
  function parseUrl(url) {
    let s = String(url || '').trim();
    if (!s) return null;
    s = s.replace(/^git@github\.com:/i, 'https://github.com/').replace(/^(?:https?:\/\/)?(?:www\.)?github\.com\//i, '');
    if (/^[a-z]+:\/\//i.test(s)) return null; // github 가 아닌 주소
    s = s.split(/[?#]/)[0];
    const parts = s.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    const owner = parts[0]; const name = parts[1].replace(/\.git$/i, '');
    if (!/^[A-Za-z0-9-]+$/.test(owner) || !/^[A-Za-z0-9._-]+$/.test(name)) return null;
    const out = { owner, name };
    if ((parts[2] === 'tree' || parts[2] === 'blob') && parts[3]) out.branch = decodeURIComponent(parts[3]);
    return out;
  }

  /* ---------------- 에러 ---------------- */
  function ghError(code, extra = {}) {
    const resetAt = extra.reset ? new Date(Number(extra.reset) * 1000) : null;
    const hhmm = resetAt ? `${String(resetAt.getHours()).padStart(2, '0')}:${String(resetAt.getMinutes()).padStart(2, '0')}` : '';
    const MSG = {
      invalid: 'GitHub 레포 주소 형식이 아니에요. 예) https://github.com/owner/repo',
      not_found: '레포를 찾을 수 없어요. 주소가 맞는지, 공개(public) 레포인지 확인해 주세요. 비공개 레포는 아직 분석할 수 없어요.',
      rate_limit: `GitHub API 호출 한도에 걸렸어요. 로그인 없이 쓰면 1시간에 60회까지만 부를 수 있어요.${hhmm ? ` ${hhmm} 이후에 다시 시도해 주세요.` : ' 잠시 뒤 다시 시도해 주세요.'}`,
      network: '네트워크에 연결할 수 없어요. 인터넷 연결을 확인하고 다시 시도해 주세요.',
      empty: '아직 커밋이 없는 빈 레포예요. 코드를 올린 뒤 다시 분석해 주세요.',
      http: `GitHub에서 응답을 받지 못했어요 (${extra.status || '?'}). 잠시 뒤 다시 시도해 주세요.`,
    };
    const e = new Error(MSG[code] || MSG.http);
    e.code = code; Object.assign(e, extra);
    return e;
  }

  async function getJson(url) {
    let res;
    try { res = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } }); } catch (err) { throw ghError('network'); }
    if (res.ok) return res.json();
    const remaining = res.headers.get('x-ratelimit-remaining');
    if (res.status === 429 || (res.status === 403 && remaining === '0')) throw ghError('rate_limit', { reset: res.headers.get('x-ratelimit-reset') });
    if (res.status === 404 || res.status === 451) throw ghError('not_found');
    if (res.status === 403) throw ghError('not_found'); // 접근 권한 없음 (비공개 등)
    if (res.status === 409) throw ghError('empty');
    throw ghError('http', { status: res.status });
  }
  async function getRaw(o, r, branch, path) {
    try {
      const res = await fetch(`${RAW}/${o}/${r}/${encodeURIComponent(branch)}/${path.split('/').map(encodeURIComponent).join('/')}`);
      return res.ok ? await res.text() : null;
    } catch (e) { return null; }
  }
  async function pool(items, n, fn) {
    let i = 0; const out = new Array(items.length);
    await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); }
    }));
    return out;
  }

  /* ---------------- 파일 고르기 ---------------- */
  const SKIP_DIR = /(^|\/)(node_modules|dist|build|out|target|vendor|\.next|\.nuxt|coverage|\.gradle|\.idea|\.vscode|__pycache__|venv|\.venv|site-packages|migrations|static|public|assets|docs|fixtures|\.mvn|gradle\/wrapper)\//i;
  const SRC_EXT = /\.(java|kt|kts|js|jsx|ts|tsx|mjs|cjs|py)$/i;
  const PATH_HINT = /(config|security|auth|jwt|token|filter|repositor|repo\b|service|controller|handler|exception|advice|error|cache|redis|lock|middleware|guard|interceptor|router|routes?|views?|models?|serializer|schema|entity|domain|tasks?|worker|consumer|producer|listener|event|client|api|app|main|server|index|settings)/i;
  const isTestPath = (p) => /(^|\/)(src\/test\/|tests?\/|__tests__\/|spec\/)|[._-](test|spec)\.[a-z]+$|(^|\/)test_[^/]+\.py$|Tests?\.(java|kt)$/i.test(p);

  function classify(path) {
    const base = path.split('/').pop();
    if (/^(build\.gradle(\.kts)?|settings\.gradle(\.kts)?|pom\.xml|package\.json|requirements(-dev)?\.txt|pyproject\.toml|Pipfile|tsconfig\.json)$/i.test(base)) return 'build';
    if (/^\.github\/workflows\/[^/]+\.ya?ml$/i.test(path)) return 'ci';
    if (/^(Dockerfile(\..+)?|.+\.Dockerfile|docker-compose[^/]*\.ya?ml|compose\.ya?ml)$/i.test(base)) return 'docker';
    if (/^application[^/]*\.(ya?ml|properties)$/i.test(base) || /^\.env\.example$/.test(base)) return 'conf';
    if (/^(schema\.prisma|nginx\.conf|jest\.config\.[jt]s|\.eslintrc(\.[a-z]+)?|\.prettierrc(\.[a-z]+)?|eslint\.config\.[mc]?js|pytest\.ini|conftest\.py|manage\.py)$/i.test(base)) return 'conf';
    if (/^(k8s|kubernetes|deploy|helm)\/.+\.ya?ml$/i.test(path)) return 'docker';
    if (/^db\/migration\/V\d+.*\.sql$|\/db\/migration\/V\d+.*\.sql$|schema\.sql$/i.test(path)) return 'sql';
    if (SRC_EXT.test(base)) return isTestPath(path) ? 'test' : 'src';
    return null;
  }

  function pickFiles(tree) {
    const blobs = tree.filter((t) => t.type === 'blob' && !SKIP_DIR.test('/' + t.path) && (t.size || 0) < 80000);
    const scored = [];
    blobs.forEach((t) => {
      const kind = classify(t.path); if (!kind) return;
      if (/\.min\.|\.d\.ts$|generated|\.stories\./i.test(t.path)) return;
      const depth = t.path.split('/').length;
      let s = { build: 100, ci: 95, docker: 92, conf: 80, sql: 50, src: 30, test: 26 }[kind];
      if (kind === 'build' && depth > 3) s -= 40;
      if (kind === 'src' || kind === 'test') {
        const hits = (t.path.match(new RegExp(PATH_HINT.source, 'gi')) || []).length;
        s += Math.min(hits, 3) * 12;
        s -= Math.min(20, (t.size || 0) / 1500); // 작은 파일 우선
        if ((t.size || 0) < 200) s -= 25; // 거의 빈 파일
      }
      scored.push({ path: t.path, size: t.size || 0, kind, score: s });
    });
    scored.sort((a, b) => b.score - a.score);
    // 종류별 몫: 설정·빌드 → 테스트 → 나머지는 소스 코드
    const cap = { build: 6, ci: 3, docker: 4, conf: 4, sql: 2, test: 5, src: MAX_FILES };
    const out = [];
    ['build', 'ci', 'docker', 'conf', 'sql', 'test', 'src'].forEach((kind) => {
      scored.filter((f) => f.kind === kind).slice(0, cap[kind]).forEach((f) => { if (out.length < MAX_FILES) out.push(f); });
    });
    return out;
  }

  /* ---------------- 스택 ---------------- */
  const STACK_RULES = [
    [/spring-boot|org\.springframework\.boot/i, 'Spring Boot'], [/spring-boot-starter-data-jpa|hibernate|jakarta\.persistence/i, 'JPA'],
    [/spring-boot-starter-security|spring-security/i, 'Spring Security'], [/querydsl/i, 'QueryDSL'], [/spring-boot-starter-webflux/i, 'WebFlux'],
    [/thymeleaf/i, 'Thymeleaf'], [/jjwt|java-jwt|jsonwebtoken|pyjwt|python-jose|@nestjs\/jwt/i, 'JWT'], [/springdoc|springfox|swagger/i, 'Swagger'],
    [/flyway/i, 'Flyway'], [/liquibase/i, 'Liquibase'], [/kafka/i, 'Kafka'], [/rabbitmq|amqp/i, 'RabbitMQ'], [/redisson/i, 'Redisson'],
    [/"@nestjs\/core"/i, 'NestJS'], [/"express"/i, 'Express'], [/"next"\s*:/i, 'Next.js'], [/"react"\s*:/i, 'React'], [/"vue"\s*:/i, 'Vue'],
    [/"typescript"\s*:/i, 'TypeScript'], [/"prisma"|"@prisma\/client"/i, 'Prisma'], [/"typeorm"/i, 'TypeORM'], [/"mongoose"|mongodb/i, 'MongoDB'],
    [/"sequelize"/i, 'Sequelize'], [/"socket\.io"/i, 'Socket.IO'], [/"graphql"|apollo/i, 'GraphQL'], [/"tailwindcss"/i, 'Tailwind CSS'],
    [/"@tanstack\/react-query"|"react-query"/i, 'React Query'], [/"redux"|"@reduxjs\/toolkit"/i, 'Redux'],
    [/^django\b|\bdjango[=<>~ ]/im, 'Django'], [/djangorestframework/i, 'DRF'], [/fastapi/i, 'FastAPI'], [/^flask\b|\bflask[=<>~ ]/im, 'Flask'],
    [/sqlalchemy/i, 'SQLAlchemy'], [/celery/i, 'Celery'],
    [/mysql/i, 'MySQL'], [/postgres|psycopg|"pg"\s*:/i, 'PostgreSQL'], [/redis/i, 'Redis'], [/\bh2database|com\.h2|:h2:/i, 'H2'],
    [/testcontainers/i, 'Testcontainers'], [/junit|spring-boot-starter-test/i, 'JUnit5'], [/"jest"|"vitest"/i, 'Jest'], [/pytest/i, 'pytest'],
  ];
  function deriveStack(files, langs, tree) {
    const build = files.filter((f) => f.kind === 'build' || f.kind === 'docker' || f.kind === 'conf').map((f) => f.text || '').join('\n');
    const s = [];
    const add = (x) => { if (x && !s.includes(x)) s.push(x); };
    Object.keys(langs).filter((l) => ['Java', 'Kotlin', 'TypeScript', 'Python', 'JavaScript', 'Go'].includes(l)).slice(0, 2).forEach(add);
    STACK_RULES.forEach(([re, name]) => { if (re.test(build)) add(name); });
    if (s.includes('TypeScript') && s.includes('JavaScript')) s.splice(s.indexOf('JavaScript'), 1);
    if (tree.some((t) => /(^|\/)(Dockerfile|docker-compose[^/]*\.ya?ml|compose\.ya?ml)$/i.test(t.path))) add('Docker');
    if (tree.some((t) => /^\.github\/workflows\//.test(t.path))) add('GitHub Actions');
    return s.slice(0, 14);
  }

  /* ---------------- 규칙 ----------------
     rule = { id, cat, conf, file: 경로 정규식, need: 줄 정규식(필수), also?: [보조 근거 정규식], when?(ctx),
              title, bullet, detail, tags: 문자열·함수 }   (title/bullet/detail/tags 는 ctx 를 받는 함수일 수 있다) */
  const JVM = /\.(java|kt)$/i, JS = /\.(m?[jt]sx?|cjs)$/i, PY = /\.py$/i, SRCANY = /\.(java|kt|m?[jt]sx?|cjs|py)$/i;
  const GRADLE = /(build\.gradle(\.kts)?|pom\.xml)$/i;
  const TC_RE = /testcontainers|@Container\b|(MySQL|PostgreSQL|MariaDB|Mongo(DB)?|Generic|Kafka)Container\b/i;
  const FILL = '수치는 코드만으로 알 수 없어서 ○○로 비워 뒀어요. 직접 측정한 값으로 채워 주세요.';
  const RULES = [
    /* ---- 성능 ---- */
    { id: 'jpa_fetch_join', pri: 3, cat: '성능', conf: 'high', file: JVM, need: /join\s+fetch|JOIN\s+FETCH|@EntityGraph/,
      title: 'fetch join으로 N+1 쿼리 문제 해결',
      bullet: '연관 엔티티 조회 시 발생하던 N+1 쿼리를 fetch join(@EntityGraph)으로 묶어 조회 쿼리 수 ○○회→1회로 감소',
      detail: `연관 관계를 지연 로딩할 때 생기는 N+1을 직접 인지하고 해결한 흔적이에요. 면접에서는 "N+1을 어떻게 발견했는지", "컬렉션 fetch join + 페이징의 한계"를 자주 물어요. ${FILL}`,
      tags: ['JPA'] },
    { id: 'jpa_batch_size', cat: '성능', conf: 'mid', file: /\.(java|kt|ya?ml|properties)$/i, need: /default_batch_fetch_size|@BatchSize/,
      title: '배치 페치로 지연 로딩 쿼리 수 줄이기',
      bullet: 'Hibernate batch fetch size 설정으로 지연 로딩 시 IN 절로 묶어 조회해 쿼리 수 감소',
      detail: 'fetch join을 쓰기 어려운 컬렉션 페이징 상황의 대안으로 자주 쓰여요. fetch join과 무엇이 다른지 설명할 수 있으면 좋아요.', tags: ['JPA'] },
    { id: 'spring_cache', pri: 3, cat: '성능', conf: 'high', file: JVM, need: /@Cacheable|@EnableCaching|RedisCacheManager|CacheManager\b/,
      also: [/@CacheEvict|@CachePut/, /RedisCacheConfiguration|RedisTemplate|JCacheManager|Caffeine/],
      title: (c) => (c.has('Redis') ? 'Redis 캐시로 조회 성능 개선' : 'Spring Cache로 반복 조회 줄이기'),
      bullet: (c) => (c.has('Redis') ? '자주 조회되는 데이터에 Redis 캐시(@Cacheable)를 적용해 조회 API 응답시간 ○○ms→○○ms로 단축' : '반복 조회되는 데이터에 Spring Cache(@Cacheable)를 적용해 DB 조회 횟수 감소'),
      detail: `어떤 데이터를 왜 캐시했는지, 데이터가 바뀌면 캐시를 어떻게 무효화(@CacheEvict, TTL)하는지가 단골 질문이에요. ${FILL}`,
      tags: (c) => (c.has('Redis') ? ['Redis', 'Spring Cache'] : ['Spring Cache']) },
    { id: 'jpa_index', pri: 1, cat: '성능', conf: 'mid', file: /\.(java|kt|sql)$/i, need: /@Index\s*\(|CREATE\s+(UNIQUE\s+)?INDEX/i,
      title: '조회 조건에 인덱스 설계',
      bullet: '검색 조건 컬럼에 인덱스를 설계해 조회 쿼리 응답시간 ○○% 단축',
      detail: `어떤 쿼리를 보고 어떤 컬럼에 인덱스를 걸었는지, 복합 인덱스 순서를 어떻게 정했는지 설명할 수 있으면 강해요. ${FILL}`, tags: ['MySQL'] },
    { id: 'paging', pri: 1, cat: '성능', conf: 'mid', file: SRCANY, need: /\bPageable\b|\bSlice<|PageRequest\.of|\.paginate\(|PageNumberPagination|CursorPagination/,
      title: '페이지네이션으로 대량 목록 조회 처리',
      bullet: '목록 조회 API에 페이지네이션을 적용해 한 번에 불러오는 데이터 양을 제한',
      detail: '오프셋 방식과 커서(무한 스크롤) 방식의 차이, 데이터가 많아지면 오프셋이 느려지는 이유를 함께 준비해 두면 좋아요.', tags: [] },
    { id: 'async', cat: '성능', conf: 'mid', file: JVM, need: /@Async\b|@EnableAsync|CompletableFuture\.(supplyAsync|runAsync)/,
      title: '비동기 처리로 응답 지연 줄이기',
      bullet: '알림·메일 등 부가 작업을 @Async 비동기로 분리해 핵심 API 응답시간 단축',
      detail: '스레드 풀을 어떻게 설정했는지, 비동기 작업이 실패하면 어떻게 되는지를 물어볼 수 있어요.', tags: [] },
    { id: 'django_select_related', pri: 3, cat: '성능', conf: 'high', file: PY, need: /\.(select_related|prefetch_related)\(/,
      title: 'select_related / prefetch_related로 N+1 해결',
      bullet: 'Django ORM의 select_related·prefetch_related로 N+1 쿼리를 제거해 목록 API 쿼리 수 ○○회→○회로 감소',
      detail: `두 메서드가 JOIN과 별도 쿼리 중 어떤 방식으로 동작하는지 차이를 설명할 수 있으면 좋아요. ${FILL}`, tags: ['Django'] },
    { id: 'py_cache', cat: '성능', conf: 'mid', file: PY, need: /@lru_cache|@cache_page|cache\.(get|set)\(|@cached\b|redis\.Redis\(/,
      title: '캐시로 반복 계산·조회 줄이기', bullet: '반복 조회 결과를 캐시해 응답시간 ○○% 단축',
      detail: `무엇을 캐시했고 언제 만료되는지(TTL) 설명할 수 있어야 해요. ${FILL}`, tags: (c) => (c.has('Redis') ? ['Redis'] : []) },
    { id: 'js_cache', cat: '성능', conf: 'mid', file: JS, need: /new\s+Redis\(|createClient\(|redis\.(get|set|setex)\(|\.setEx?\(|cache-manager|CacheModule/,
      when: (c) => c.has('Redis') || c.hasDep('cache-manager'),
      title: 'Redis 캐시로 조회 부하 줄이기', bullet: '자주 조회되는 데이터를 Redis에 캐시해 DB 부하를 줄이고 응답시간 ○○ms 단축',
      detail: `캐시 키 설계와 만료 정책, 캐시와 DB 데이터가 어긋날 때의 처리 방법을 준비해 두세요. ${FILL}`, tags: ['Redis'] },
    { id: 'react_memo', pri: 1, cat: '성능', conf: 'mid', file: /\.(jsx|tsx)$/i, need: /\buseMemo\(|\buseCallback\(|React\.memo\(|\bmemo\(/,
      title: '메모이제이션으로 불필요한 리렌더링 줄이기', bullet: 'useMemo·useCallback·React.memo로 불필요한 리렌더링을 줄여 화면 반응 속도 개선',
      detail: '어떤 컴포넌트가 왜 다시 그려졌는지(Profiler 등으로) 확인한 과정이 있으면 훨씬 설득력이 생겨요.', tags: ['React'] },
    { id: 'react_lazy', cat: '성능', conf: 'mid', file: /\.(jsx|tsx|js|ts)$/i, need: /React\.lazy\(|\blazy\(\s*\(\)\s*=>\s*import|dynamic\(\s*\(\)\s*=>\s*import/,
      title: '코드 스플리팅으로 초기 로딩 줄이기', bullet: '라우트 단위 코드 스플리팅(lazy import)으로 초기 번들 크기 ○○% 감소',
      detail: `번들 크기 전후를 측정해 두면 좋아요. ${FILL}`, tags: ['React'] },

    /* ---- 인증·보안 ---- */
    { id: 'jwt_security', pri: 3, cat: '인증·보안', conf: 'high', file: JVM, need: /Jwts\.|JwtTokenProvider|JwtProvider|JWT\.create|JwtDecoder|JwtAuthentication/,
      also: [/SecurityFilterChain|@EnableWebSecurity|WebSecurityConfigurerAdapter/, /OncePerRequestFilter|addFilterBefore/],
      title: (c) => (c.has('Spring Security') ? 'JWT + Spring Security 인증 구현' : 'JWT 기반 인증 구현'),
      bullet: (c) => `${c.has('Spring Security') ? 'Spring Security 필터 체인에 ' : ''}JWT 인증 필터를 구성해 세션 없이 확장 가능한 토큰 기반 인증 구현`,
      detail: '세션 대신 JWT를 고른 이유, 토큰 탈취·만료 처리(Refresh Token), 필터가 어디서 동작하는지를 꼭 물어봐요.',
      tags: (c) => ['JWT'].concat(c.has('Spring Security') ? ['Spring Security'] : []) },
    { id: 'spring_security', cat: '인증·보안', conf: 'mid', file: JVM, need: /SecurityFilterChain|@EnableWebSecurity|WebSecurityConfigurerAdapter/,
      also: [/PasswordEncoder|BCrypt/], skipIf: ['jwt_security'],
      title: 'Spring Security로 인증·인가 구성', bullet: 'Spring Security로 URL별 접근 권한과 비밀번호 암호화(BCrypt)를 구성',
      detail: '인증(Authentication)과 인가(Authorization)의 차이, 필터 체인 흐름을 설명할 수 있으면 좋아요.', tags: ['Spring Security'] },
    { id: 'oauth2', cat: '인증·보안', conf: 'high', file: /\.(java|kt|ya?ml|properties|[jt]sx?|py)$/i, need: /oauth2Login|OAuth2User|spring\.security\.oauth2|passport-(google|kakao|naver|github)|NextAuth|social_django|allauth/,
      title: '소셜 로그인(OAuth 2.0) 연동', bullet: 'OAuth 2.0 기반 소셜 로그인을 연동해 회원가입 절차 간소화',
      detail: 'Authorization Code 흐름을 그림으로 설명할 수 있게 준비해 두세요. 가입 전환율 같은 수치가 있으면 더 좋아요.', tags: ['OAuth 2.0'] },
    { id: 'js_jwt', pri: 3, cat: '인증·보안', conf: 'high', file: JS, need: /jwt\.(sign|verify)\(|jsonwebtoken|JwtService|passport\.authenticate|@UseGuards\(/,
      also: [/bcrypt\.(hash|compare)|argon2/],
      title: 'JWT 인증 미들웨어 구현', bullet: 'JWT 검증 미들웨어(가드)로 보호 API 접근을 제어하고 비밀번호는 해시로 안전하게 저장',
      detail: '토큰을 어디에 저장하는지(쿠키 vs 로컬스토리지), 만료·재발급을 어떻게 처리했는지 물어볼 수 있어요.', tags: ['JWT'] },
    { id: 'js_security_mw', cat: '인증·보안', conf: 'mid', file: JS, need: /helmet\(|express-rate-limit|rateLimit\(|ThrottlerModule|csurf/,
      title: '보안 미들웨어·요청 제한 적용', bullet: 'helmet·rate limit 미들웨어로 보안 헤더와 요청 횟수 제한을 적용해 API 남용 방지',
      detail: '어떤 공격(무차별 대입, XSS 등)을 막으려고 넣었는지 말할 수 있으면 좋아요.', tags: [] },
    { id: 'py_auth', cat: '인증·보안', conf: 'mid', file: PY, need: /permission_classes|IsAuthenticated|OAuth2PasswordBearer|jwt\.(encode|decode)\(|@login_required|JWTAuthentication/,
      title: '토큰·권한 기반 API 인증', bullet: '토큰 인증과 권한 클래스로 사용자별 API 접근 권한을 분리',
      detail: '인증과 인가를 어디서 어떻게 나눴는지 설명할 수 있게 준비해 두세요.', tags: [] },

    /* ---- 데이터 ---- */
    { id: 'optimistic_lock', pri: 3, cat: '데이터', conf: 'high', file: JVM, need: /@Version\b/,
      also: [/OptimisticLock|ObjectOptimisticLockingFailureException|@Retryable/],
      title: '낙관적 락으로 동시 수정 충돌 제어', bullet: '엔티티 버전 필드(@Version) 기반 낙관적 락으로 동시 요청 시 데이터 정합성 보장',
      detail: '왜 비관적 락이 아니라 낙관적 락인지, 충돌이 나면 사용자에게 어떻게 안내/재시도하는지가 핵심 질문이에요. 동시성 테스트를 했다면 꼭 함께 적어 주세요.', tags: ['JPA'] },
    { id: 'pessimistic_lock', pri: 3, cat: '데이터', conf: 'high', file: JVM, need: /PESSIMISTIC_(WRITE|READ)|@Lock\s*\(/,
      title: '비관적 락으로 동시 요청 정합성 보장', bullet: '비관적 락(SELECT … FOR UPDATE)으로 동시 요청 시 재고·정원 초과 문제 방지',
      detail: '락 범위와 데드락 가능성, 낙관적 락과 비교해 고른 이유를 설명할 수 있어야 해요.', tags: ['JPA'] },
    { id: 'distributed_lock', pri: 3, cat: '데이터', conf: 'high', file: SRCANY, need: /RedissonClient|RLock|getLock\(|redlock|SETNX|setIfAbsent\(/,
      title: 'Redis 분산 락으로 동시성 제어', bullet: 'Redisson 분산 락으로 여러 서버에서 동시에 들어오는 요청의 중복 처리 방지',
      detail: 'DB 락 대신 분산 락을 쓴 이유, 락 타임아웃과 해제 실패 처리 방법이 단골 질문이에요.', tags: ['Redis'] },
    { id: 'py_lock', pri: 3, cat: '데이터', conf: 'high', file: PY, need: /select_for_update\(|transaction\.atomic|with_for_update\(/,
      title: '트랜잭션·행 잠금으로 데이터 정합성 보장', bullet: 'transaction.atomic과 select_for_update로 동시 요청 시 데이터 정합성 보장',
      detail: '어떤 상황에서 경쟁 조건이 생기는지 예시를 들어 설명할 수 있으면 좋아요.', tags: [] },
    { id: 'js_transaction', pri: 3, cat: '데이터', conf: 'high', file: JS, need: /\$transaction\(|startTransaction\(|\.transaction\(\s*(async)?\s*\(|withTransaction\(|@Transaction\(/,
      title: '트랜잭션으로 여러 쓰기 작업 묶기', bullet: '여러 테이블에 걸친 쓰기 작업을 트랜잭션으로 묶어 중간 실패 시 데이터 불일치 방지',
      detail: '트랜잭션이 없으면 어떤 문제가 생기는지 실제 시나리오로 설명해 보세요.', tags: [] },
    { id: 'unique_constraint', pri: 1, cat: '데이터', conf: 'mid', file: /\.(java|kt|sql|prisma|py)$/i, need: /@UniqueConstraint|unique\s*=\s*(true|True)|UNIQUE\s*(KEY|\()|@@unique|UniqueConstraint\(/,
      title: 'DB 유니크 제약으로 중복 데이터 차단', bullet: 'DB 유니크 제약으로 애플리케이션 검증을 우회한 중복 데이터 저장을 원천 차단',
      detail: '애플리케이션 검증만으로는 동시 요청을 막을 수 없는 이유를 설명할 수 있으면 좋아요.', tags: [] },
    { id: 'readonly_tx', pri: 1, cat: '데이터', conf: 'mid', file: JVM, need: /@Transactional\s*\(\s*readOnly\s*=\s*true/,
      title: '읽기 전용 트랜잭션 분리', bullet: '조회 로직에 readOnly 트랜잭션을 적용해 불필요한 변경 감지(dirty checking) 비용 절감',
      detail: 'readOnly가 JPA·DB 레벨에서 각각 어떤 효과가 있는지 물어볼 수 있어요.', tags: ['JPA'] },
    { id: 'querydsl', cat: '데이터', conf: 'mid', file: JVM, need: /JPAQueryFactory|BooleanExpression|BooleanBuilder/,
      title: 'QueryDSL로 동적 검색 쿼리 구현', bullet: 'QueryDSL로 검색 조건 조합에 따라 바뀌는 동적 쿼리를 타입 안전하게 구현',
      detail: 'JPQL 문자열 대신 QueryDSL을 고른 이유(컴파일 타임 검증, 조건 조합)를 설명해 보세요.', tags: ['QueryDSL'] },
    { id: 'migration', cat: '데이터', conf: 'mid', file: /(db\/migration\/[^/]+\.sql|build\.gradle(\.kts)?|pom\.xml|package\.json)$/i, need: /flyway|liquibase|prisma\s+migrate|knex\s+migrate|CREATE\s+TABLE/i,
      title: 'DB 스키마 마이그레이션 관리', bullet: '마이그레이션 도구로 DB 스키마 변경 이력을 코드로 관리해 팀원 간 스키마 불일치 해소',
      detail: '운영 중 컬럼을 바꿀 때 어떻게 무중단으로 반영하는지 같은 질문으로 이어질 수 있어요.', tags: (c) => (c.has('Flyway') ? ['Flyway'] : []) },
    { id: 'orm_schema', cat: '데이터', conf: 'mid', file: /\.(prisma|[jt]s)$/i, need: /^model\s+\w+\s*\{|new\s+(mongoose\.)?Schema\(|@Entity\(\)|sequelize\.define\(/,
      title: 'ORM으로 데이터 모델 설계', bullet: 'ORM 스키마로 도메인 데이터 모델과 연관 관계를 설계하고 타입 안전한 쿼리 구성',
      detail: '정규화 수준, 관계를 어떻게 정했는지 ERD와 함께 설명할 수 있으면 좋아요.', tags: (c) => ['Prisma', 'TypeORM', 'MongoDB', 'Sequelize'].filter((x) => c.has(x)).slice(0, 1) },

    /* ---- 아키텍처 ---- */
    { id: 'domain_event', pri: 3, cat: '아키텍처', conf: 'high', file: JVM, need: /ApplicationEventPublisher|@TransactionalEventListener|@EventListener|publishEvent\(/,
      title: '도메인 이벤트로 기능 간 결합도 낮추기', bullet: '스프링 이벤트(@TransactionalEventListener)로 핵심 로직과 알림 등 부가 로직을 분리해 결합도 감소',
      detail: '트랜잭션 커밋 이후에 이벤트를 처리한 이유, 이벤트 처리가 실패하면 어떻게 되는지가 좋은 질문 거리예요.', tags: [] },
    { id: 'mq', pri: 3, cat: '아키텍처', conf: 'high', file: SRCANY, need: /@KafkaListener|KafkaTemplate|RabbitTemplate|@RabbitListener|@Processor\(|new\s+Queue\(|amqplib|kafkajs/,
      title: '메시지 큐로 비동기 처리', bullet: '메시지 큐로 요청 처리와 후속 작업을 분리해 트래픽 몰림에도 안정적으로 처리',
      detail: '메시지 유실·중복 처리를 어떻게 다뤘는지(멱등성) 물어볼 가능성이 높아요.', tags: (c) => ['Kafka', 'RabbitMQ'].filter((x) => c.has(x)) },
    { id: 'celery', pri: 3, cat: '아키텍처', conf: 'high', file: PY, need: /@shared_task|@app\.task|@celery_app\.task|Celery\(/,
      title: 'Celery 비동기 작업 큐', bullet: '오래 걸리는 작업을 Celery 비동기 작업으로 분리해 API 응답시간 단축',
      detail: '작업 실패 시 재시도 정책과 결과 확인 방법을 준비해 두세요.', tags: ['Celery'] },
    { id: 'realtime', pri: 3, cat: '아키텍처', conf: 'high', file: SRCANY, need: /@WebSocketGateway|socket\.io|io\.on\(\s*['"]connection|@MessageMapping|StompEndpointRegistry|WebSocketHandler|websocket\.accept\(|SseEmitter/,
      title: 'WebSocket 실시간 통신 구현', bullet: 'WebSocket 기반 실시간 통신으로 새로고침 없이 알림·채팅을 전달',
      detail: '폴링 대신 WebSocket을 고른 이유, 서버가 여러 대일 때 메시지를 어떻게 전달하는지 물어볼 수 있어요.', tags: (c) => (c.has('Socket.IO') ? ['Socket.IO'] : ['WebSocket']) },
    { id: 'scheduler', pri: 1, cat: '아키텍처', conf: 'mid', file: SRCANY, need: /@Scheduled\s*\(|@EnableScheduling|node-cron|cron\.schedule\(|@Cron\(|crontab\(/,
      title: '스케줄러로 주기 작업 자동화', bullet: '스케줄러로 정산·알림 등 주기 작업을 자동화',
      detail: '서버가 여러 대일 때 스케줄러가 중복 실행되지 않게 하는 방법을 함께 준비하면 좋아요.', tags: [] },
    { id: 'external_api', cat: '아키텍처', conf: 'mid', file: JVM, need: /@FeignClient|WebClient\.(builder|create)|RestTemplate\b|RestClient\.(builder|create)/,
      also: [/@Retryable|@CircuitBreaker|Resilience4j|timeout/i],
      title: '외부 API 연동', bullet: '외부 API 연동 시 타임아웃·재시도를 설정해 외부 장애가 서비스 전체로 번지지 않도록 처리',
      detail: '외부 API가 느리거나 죽었을 때 우리 서비스는 어떻게 되는지가 좋은 질문이에요. 실제로 넣은 장치만 적어 주세요.', tags: [] },
    { id: 'aop', cat: '아키텍처', conf: 'mid', file: JVM, need: /@Aspect\b|@Around\s*\(/,
      title: 'AOP로 공통 관심사 분리', bullet: 'AOP로 로깅·실행시간 측정 등 공통 관심사를 비즈니스 로직에서 분리',
      detail: '프록시 기반 AOP가 같은 클래스 내부 호출에는 적용되지 않는 이유를 물어볼 수 있어요.', tags: [] },
    { id: 'nest_module', cat: '아키텍처', conf: 'mid', file: /\.ts$/i, need: /@Module\(\s*\{/, also: [/@Injectable\(\)/],
      title: 'NestJS 모듈 구조와 의존성 주입', bullet: 'NestJS 모듈·DI 구조로 도메인별 책임을 분리해 테스트하기 쉬운 구조 설계',
      detail: '모듈을 어떤 기준으로 나눴는지 설명할 수 있으면 좋아요.', tags: ['NestJS'] },
    { id: 'py_api', cat: '아키텍처', conf: 'mid', file: PY, need: /class\s+\w+\((viewsets\.\w+|APIView|generics\.\w+)\)|APIRouter\(|Depends\(/,
      title: (c) => (c.has('FastAPI') ? 'FastAPI 라우터·의존성 주입 구조' : 'DRF ViewSet으로 REST API 구성'),
      bullet: (c) => (c.has('FastAPI') ? 'FastAPI 라우터와 Depends 의존성 주입으로 인증·DB 세션 등 공통 로직 재사용' : 'DRF ViewSet·Serializer로 REST API를 일관된 구조로 구성'),
      detail: '공통 로직을 어디에 두었는지, 왜 그 구조를 택했는지 설명할 수 있게 준비해 두세요.', tags: (c) => ['FastAPI', 'DRF'].filter((x) => c.has(x)) },
    { id: 'multi_module', cat: '아키텍처', conf: 'mid', file: /settings\.gradle(\.kts)?$/i, need: /^\s*include\s*[\(\s'"]/,
      title: '멀티 모듈 프로젝트 구성', bullet: 'Gradle 멀티 모듈로 API·도메인·공통 모듈을 분리해 의존 방향 관리',
      detail: '모듈을 나눈 기준과 순환 의존을 어떻게 막았는지 물어볼 수 있어요.', tags: ['Gradle'] },

    /* ---- 테스트 ---- */
    { id: 'spring_test', pri: 3, cat: '테스트', conf: 'high', file: JVM, need: /@SpringBootTest|@DataJpaTest|@WebMvcTest|@ExtendWith\(\s*MockitoExtension/,
      also: [/@Testcontainers|@Container\b|@ServiceConnection|MySQLContainer|PostgreSQLContainer/, /@MockBean|@MockitoBean|Mockito\.|given\(|\bmockMvc\b/i],
      title: (c) => (c.hasCode(TC_RE) ? 'Testcontainers 통합 테스트 구성' : '계층별 테스트 코드 작성'),
      bullet: (c) => `${c.testCount ? `테스트 코드 ${c.testCount}개 파일로 ` : ''}${c.hasCode(TC_RE) ? 'Testcontainers 기반 실제 DB 통합 테스트와 ' : ''}슬라이스 테스트(@WebMvcTest·@DataJpaTest)를 구성해 리팩터링 시 회귀 방지`,
      detail: '단위·슬라이스·통합 테스트를 어떤 기준으로 나눴는지, 테스트 커버리지가 얼마인지 물어볼 수 있어요. 커버리지 수치를 알고 있다면 함께 적어 주세요.',
      tags: (c) => ['JUnit5'].concat(c.hasCode(TC_RE) ? ['Testcontainers'] : []) },
    { id: 'js_test', pri: 3, cat: '테스트', conf: 'high', file: /\.(test|spec)\.[jt]sx?$/i, need: /\b(describe|it|test)\(\s*['"`]/,
      also: [/supertest|request\(app\)|render\(|screen\.|Test\.createTestingModule/],
      title: '자동화 테스트 코드 작성', bullet: (c) => `${c.testCount ? `테스트 코드 ${c.testCount}개 파일로 ` : ''}핵심 API·컴포넌트 동작을 자동 검증해 배포 전 회귀 방지`,
      detail: '무엇을 테스트하고 무엇을 목(mock)으로 대체했는지 설명할 수 있으면 좋아요.', tags: (c) => (c.has('Jest') ? ['Jest'] : []) },
    { id: 'pytest', pri: 3, cat: '테스트', conf: 'high', file: PY, need: /^\s*def\s+test_\w+\(|@pytest\.fixture|class\s+\w+\((TestCase|APITestCase)\)/,
      title: 'pytest 테스트 코드 작성', bullet: (c) => `${c.testCount ? `테스트 코드 ${c.testCount}개 파일로 ` : ''}API·비즈니스 로직을 자동 검증해 배포 전 회귀 방지`,
      detail: 'fixture를 어떻게 구성했는지, DB가 필요한 테스트는 어떻게 격리했는지 물어볼 수 있어요.', tags: ['pytest'] },
    { id: 'coverage', pri: 1, cat: '테스트', conf: 'mid', file: /(build\.gradle(\.kts)?|pom\.xml|package\.json|jest\.config\.[jt]s|pyproject\.toml|\.ya?ml)$/i, need: /jacoco|coverageThreshold|--cov\b|codecov|"coverage"\s*:/i,
      title: '테스트 커버리지 측정', bullet: '커버리지 리포트(JaCoCo 등)를 빌드에 연동해 테스트 커버리지 ○○% 유지',
      detail: `커버리지를 몇 %로 관리했는지는 코드에서 정확히 알 수 없어요. ${FILL}`, tags: [] },

    /* ---- 인프라·배포 ---- */
    { id: 'gh_actions', pri: 3, cat: '인프라·배포', conf: 'high', file: /^\.github\/workflows\/.+\.ya?ml$/i, need: /^\s*steps\s*:/,
      title: (c) => (c.hasCode(/docker\s+(build|push)|deploy|ssh|aws|codedeploy|ecr|ghcr/i, /\.github\/workflows/) ? 'GitHub Actions CI/CD 파이프라인 구축' : 'GitHub Actions CI 구성'),
      bullet: (c) => (c.hasCode(/docker\s+(build|push)|deploy|ssh|aws|codedeploy|ecr|ghcr/i, /\.github\/workflows/) ? 'GitHub Actions로 빌드·테스트·배포 CI/CD 파이프라인을 구축해 배포 시간 ○○분→○분으로 단축' : 'GitHub Actions로 PR마다 빌드·테스트를 자동 실행하는 CI를 구성해 깨진 코드의 병합 방지'),
      detail: '어떤 이벤트(push, PR)에 무엇이 실행되는지, 실패하면 어떻게 알 수 있는지 설명해 보세요. 배포 시간 같은 수치는 직접 채워 주세요.', tags: ['GitHub Actions'] },
    { id: 'docker_compose', pri: 3, cat: '인프라·배포', conf: 'high', file: /(docker-compose[^/]*|compose)\.ya?ml$/i, need: /^\s*services\s*:/,
      title: 'Docker Compose로 실행 환경 구성', bullet: 'Docker Compose로 애플리케이션·DB·캐시 실행 환경을 코드로 정의해 명령 한 줄로 동일한 환경 구성',
      detail: '로컬과 운영 환경 차이를 어떻게 줄였는지, 컨테이너 간 네트워크를 어떻게 연결했는지 물어볼 수 있어요.', tags: ['Docker'] },
    { id: 'dockerfile', cat: '인프라·배포', conf: 'mid', file: /(^|\/)(Dockerfile(\..+)?|.+\.Dockerfile)$/i, need: /^\s*FROM\s+/i, whole: true, skipIf: ['docker_compose'],
      title: (c) => (c.multiStage ? '멀티 스테이지 Docker 이미지 빌드' : 'Docker로 애플리케이션 컨테이너화'),
      bullet: (c) => (c.multiStage ? '멀티 스테이지 Dockerfile로 빌드 도구를 뺀 경량 이미지를 만들어 이미지 크기 ○○MB→○○MB로 감소' : 'Dockerfile로 애플리케이션을 컨테이너화해 어디서나 같은 환경으로 실행'),
      detail: '이미지 크기를 줄이려고 한 시도, 레이어 캐시를 활용한 방법을 물어볼 수 있어요.', tags: ['Docker'] },
    { id: 'k8s', cat: '인프라·배포', conf: 'high', file: /\.ya?ml$/i, need: /^\s*kind\s*:\s*(Deployment|StatefulSet|Ingress)\b/,
      title: '쿠버네티스 배포 매니페스트 작성', bullet: '쿠버네티스 Deployment·Service 매니페스트로 애플리케이션 배포 구성',
      detail: '레플리카 수, 헬스 체크(probe)를 어떻게 설정했는지 질문받을 수 있어요.', tags: ['Kubernetes'] },
    { id: 'monitoring', pri: 1, cat: '인프라·배포', conf: 'mid', file: /\.(gradle|kts|xml|ya?ml|properties)$/i, need: /actuator|micrometer|prometheus|grafana/i,
      title: '헬스 체크·모니터링 지표 노출', bullet: 'Actuator·Prometheus로 애플리케이션 상태와 지표를 노출해 장애를 빠르게 감지',
      detail: '어떤 지표를 보고 있었는지, 실제로 문제를 잡은 경험이 있으면 함께 적어 주세요.', tags: (c) => (c.hasCode(/prometheus/i) ? ['Prometheus'] : []) },

    /* ---- 협업·품질 ---- */
    { id: 'global_exception', pri: 3, cat: '협업·품질', conf: 'high', file: JVM, need: /@RestControllerAdvice|@ControllerAdvice/,
      also: [/@ExceptionHandler/, /class\s+\w*(ErrorCode|Exception)\b/],
      title: '공통 예외 처리로 일관된 에러 응답', bullet: '@RestControllerAdvice 기반 전역 예외 처리로 에러 응답 형식을 통일해 프론트와의 에러 처리 비용 감소',
      detail: '에러 코드를 어떻게 설계했는지, 예상하지 못한 예외는 어떻게 처리하는지 물어볼 수 있어요.', tags: [] },
    { id: 'js_error_mw', pri: 1, cat: '협업·품질', conf: 'mid', file: JS, need: /\(\s*err\s*,\s*req\s*,\s*res\s*,\s*next\s*\)|@Catch\(|ExceptionFilter/,
      title: '공통 에러 처리 미들웨어', bullet: '전역 에러 처리 미들웨어로 API 에러 응답 형식을 통일',
      detail: '비동기 에러가 미들웨어까지 전달되게 한 방법을 물어볼 수 있어요.', tags: [] },
    { id: 'api_docs', pri: 3, cat: '협업·품질', conf: 'high', file: /\.(java|kt|gradle|kts|xml|ya?ml|[jt]s|py)$/i, need: /springdoc|@Operation\s*\(|@Tag\s*\(|@ApiOperation|OpenAPIDefinition|SwaggerModule|swagger-ui|swagger-jsdoc|drf_spectacular|restdocs/i,
      title: (c) => (c.hasCode(/restdocs/i) ? 'Spring REST Docs로 API 문서 자동화' : 'Swagger(OpenAPI) API 문서 자동화'),
      bullet: (c) => (c.hasCode(/restdocs/i) ? 'Spring REST Docs로 테스트를 통과한 API만 문서화해 문서와 실제 동작 불일치 방지' : 'Swagger(OpenAPI)로 API 명세를 코드에서 자동 생성해 프론트와 명세를 먼저 합의하고 개발'),
      detail: '명세를 누가 언제 합의했는지, 바뀔 때 어떻게 공유했는지 같은 협업 과정을 함께 이야기하면 좋아요.', tags: (c) => (c.hasCode(/restdocs/i) ? ['Spring REST Docs'] : ['Swagger']) },
    { id: 'validation', pri: 1, cat: '협업·품질', conf: 'mid', file: /\.(java|kt|[jt]s|py)$/i, need: /@Valid\b|@Validated\b|ValidationPipe|class-validator|z\.object\(|Joi\.object\(|Field\(\s*\.\.\./,
      also: [/@NotBlank|@NotNull|@Size|@Email|@IsString|@IsNotEmpty/],
      title: '요청 값 검증 계층 분리', bullet: '요청 DTO 검증(Bean Validation 등)을 컨트롤러 진입 시점에 적용해 잘못된 입력을 일관되게 차단',
      detail: '검증 로직을 어디(DTO, 도메인)에 두었는지와 그 이유를 물어볼 수 있어요.', tags: [] },
    { id: 'lint', pri: 1, cat: '협업·품질', conf: 'mid', file: /(package\.json|\.eslintrc(\.[a-z]+)?|eslint\.config\.[mc]?js|\.prettierrc(\.[a-z]+)?|pyproject\.toml|build\.gradle(\.kts)?)$/i, need: /"husky"|lint-staged|"eslint"|prettier|ruff|black|flake8|spotless|checkstyle|ktlint/i,
      title: '린트·포맷터로 코드 스타일 통일', bullet: '린터·포맷터와 커밋 훅을 설정해 팀 코드 스타일을 자동으로 통일하고 리뷰 시간 단축',
      detail: '팀원과 규칙을 어떻게 합의했는지 이야기하면 협업 역량을 함께 보여줄 수 있어요.', tags: [] },
    { id: 'ts_strict', pri: 1, cat: '협업·품질', conf: 'mid', file: /tsconfig\.json$/i, need: /"strict"\s*:\s*true/,
      title: 'TypeScript strict 모드', bullet: 'TypeScript strict 모드로 런타임 이전에 타입 오류를 잡아 버그 감소',
      detail: 'any를 줄이려고 한 노력, 타입을 어떻게 설계했는지 질문받을 수 있어요.', tags: ['TypeScript'] },
  ];

  /* ---------------- 코드 조각 ---------------- */
  const BRACE = /\.(java|kt|kts|[mc]?[jt]sx?|gradle|groovy|go|cs|prisma)$/i;
  const INDENT = /\.(py|ya?ml)$/i;
  const indentOf = (s) => (s.match(/^\s*/) || [''])[0].replace(/\t/g, '    ').length;
  const isComment = (s, path) => { const t = s.trim(); return /^(\/\/|\/\*|\*)/.test(t) || (/\.(py|ya?ml|toml|txt|properties)$|Dockerfile/i.test(path) && /^#/.test(t)); };
  const isDecorator = (s) => /^\s*@/.test(s);

  // 매치된 줄(0-base i)을 감싸는 블록을 찾아 [start, end] (0-base, 포함) 를 돌려준다.
  function blockAround(lines, i, path, whole) {
    const n = lines.length; let s = i; let e = i;
    if (whole) return [0, Math.min(n - 1, MAX_SNIPPET - 1)];
    if (BRACE.test(path)) {
      // 매치 줄이 메서드·클래스 안쪽이면 바로 위 블록 시작(…{) 을 찾는다
      const ind = indentOf(lines[i]); let opener = -1;
      const selfOpens = /\{\s*$/.test(lines[i]) || /^\s*@/.test(lines[i]);
      if (!selfOpens) {
        for (let k = i - 1; k >= Math.max(0, i - 8); k--) {
          if (!lines[k].trim()) continue;
          if (indentOf(lines[k]) < ind && /\{\s*$/.test(lines[k])) { if (!/^\s*(public\s+|private\s+|protected\s+)?(abstract\s+|final\s+)?(class|interface|enum|object|record)\b/.test(lines[k]) && !/^\s*(export\s+)?(default\s+)?class\b/.test(lines[k])) opener = k; break; }
          if (indentOf(lines[k]) < ind) break;
        }
      }
      s = opener >= 0 ? opener : i;
      // 위로: 어노테이션·주석·이어지는 줄 포함
      for (let k = 0; k < 6 && s > 0; k++) {
        const prev = lines[s - 1]; const t = prev.trim(); const cur = lines[s].trim();
        if (!t) break;
        if (isDecorator(prev) || /^(\/\/|\*|\/\*\*?)/.test(t) || /[(+,]\s*$/.test(t) || /^["'+.)]/.test(cur) || /^["'+]/.test(t)) s--; else break;
      }
      // 아래로: 괄호 균형 맞을 때까지
      let depth = 0; let opened = false; e = s;
      for (let k = s; k < n && k < s + 40; k++) {
        const code = lines[k].replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\/\/.*$/g, '');
        for (const ch of code) { if (ch === '{') { depth++; opened = true; } else if (ch === '}') depth--; }
        e = k;
        if (opened && depth <= 0) break;
        if (!opened && k >= i && /;\s*$|\)\s*$/.test(code) && !/^\s*@/.test(lines[k]) && !/[(,+]\s*$/.test(code)) break;
      }
    } else if (INDENT.test(path)) {
      const ind = indentOf(lines[i]);
      if (/:\s*$/.test(lines[i]) || /^\s*(def|class|async\s+def)\b/.test(lines[i])) s = i;
      else {
        for (let k = i - 1; k >= Math.max(0, i - 10); k--) {
          if (!lines[k].trim()) continue;
          if (indentOf(lines[k]) < ind && /:\s*$/.test(lines[k].replace(/#.*$/, ''))) { s = k; break; }
          if (indentOf(lines[k]) < ind) break;
        }
      }
      while (s > 0 && i - s < 6 && isDecorator(lines[s - 1])) s--;
      const base = indentOf(lines[s]); e = s;
      for (let k = s + 1; k < n; k++) {
        if (lines[k].trim() && indentOf(lines[k]) <= base && !(indentOf(lines[k]) === base && /^\s*-\s/.test(lines[k]) && /:\s*$/.test(lines[s]))) break;
        e = k;
      }
      while (e > i && !lines[e].trim()) e--;
    }
    // 너무 짧으면 앞뒤 문맥을 조금 붙인다
    if (e - s < 2) { s = Math.max(0, s - 2); e = Math.min(n - 1, e + 3); }
    // 최대 길이 제한 (매치 줄은 반드시 포함)
    if (e - s + 1 > MAX_SNIPPET) {
      if (i - s > MAX_SNIPPET - 6) s = Math.max(0, i - 6);
      e = Math.min(e, s + MAX_SNIPPET - 1);
    }
    while (e > s && !lines[e].trim()) e--;
    while (s < e && !lines[s].trim()) s++;
    return [s, e];
  }
  function snippet(lines, s, e) {
    const seg = lines.slice(s, e + 1).map((l) => l.replace(/\t/g, '    ').replace(/\s+$/, ''));
    const min = Math.min(...seg.filter((l) => l.trim()).map(indentOf));
    return seg.map((l) => l.slice(Math.min(min, indentOf(l)))).join('\n');
  }

  /* ---------------- 분석 ---------------- */
  function makeCtx(files, stack, tree) {
    const all = files.map((f) => f.text || '').join('\n');
    const build = files.filter((f) => f.kind === 'build').map((f) => f.text || '').join('\n');
    const testCount = tree.filter((t) => t.type === 'blob' && SRC_EXT.test(t.path) && isTestPath(t.path) && !SKIP_DIR.test('/' + t.path)).length;
    const dockerfiles = files.filter((f) => /Dockerfile/i.test(f.path));
    return {
      stack, testCount,
      has: (x) => stack.includes(x),
      hasDep: (x) => build.includes(x),
      hasCode: (re, pathRe) => files.some((f) => (!pathRe || pathRe.test(f.path)) && re.test(f.text || '')),
      multiStage: dockerfiles.some((f) => ((f.text || '').match(/^\s*FROM\s+/gim) || []).length > 1),
      all,
    };
  }
  const val = (v, ctx) => (typeof v === 'function' ? v(ctx) : v);

  function runRules(files, meta, ctx) {
    const { owner, name, branch } = meta;
    const blobUrl = (path, s, e) => `https://github.com/${owner}/${name}/blob/${encodeURIComponent(branch)}/${path.split('/').map(encodeURIComponent).join('/')}#L${s}-L${e}`;
    const found = [];
    // import 줄은 근거로 약해서, 다른 근거가 없을 때만 쓴다
    const IMPORT = /^\s*(import\s|package\s|from\s+\S+\s+import\s|(const|let|var)\s+[\w{}\s,]+=\s*require\()/;
    const hitIn = (re, pool) => {
      const hits = []; const weak = [];
      pool.forEach((f) => {
        const lines = f.lines;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].length > 400 || isComment(lines[i], f.path)) continue;
          if (re.test(lines[i])) (IMPORT.test(lines[i]) ? weak : hits).push({ f, i });
        }
      });
      return hits.length ? hits : weak;
    };
    const toEvidence = (h, re, whole) => {
      const [s, e] = blockAround(h.f.lines, h.i, h.f.path, whole);
      const hl = []; for (let k = s; k <= e; k++) if (re.test(h.f.lines[k]) && !isComment(h.f.lines[k], h.f.path) && (!IMPORT.test(h.f.lines[k]) || k === h.i)) hl.push(k + 1);
      return { path: h.f.path, start: s + 1, end: e + 1, code: snippet(h.f.lines, s, e), url: blobUrl(h.f.path, s + 1, e + 1), hl: hl.length ? hl : [h.i + 1] };
    };
    RULES.forEach((r) => {
      if (r.when && !r.when(ctx)) return;
      const isTestRule = r.cat === '테스트';
      const pool = files.filter((f) => r.file.test(f.path) && (isTestRule || r.id === 'coverage' || f.kind !== 'test' || /docker|ci|conf|build/.test(f.kind)));
      if (!pool.length) return;
      const hits = hitIn(r.need, pool);
      if (!hits.length) return;
      // 근거: 필수 패턴 최대 2곳(서로 다른 파일) + 보조 패턴 각 1곳, 최대 3개
      const byFile = []; hits.forEach((h) => { if (!byFile.some((x) => x.f === h.f)) byFile.push(h); });
      byFile.sort((a, b) => hits.filter((x) => x.f === b.f).length - hits.filter((x) => x.f === a.f).length);
      const ev = [toEvidence(byFile[0], r.need, r.whole)];
      (r.also || []).forEach((re) => {
        if (ev.length >= 3) return;
        const ah = hitIn(re, pool).filter((h) => !ev.some((x) => x.path === h.f.path && h.i + 1 >= x.start && h.i + 1 <= x.end));
        if (ah.length) ev.push(toEvidence(ah[0], re));
      });
      if (ev.length < 2 && byFile[1]) ev.push(toEvidence(byFile[1], r.need, r.whole));
      const pri = r.pri || 2;
      const conf = r.conf === 'mid' && pri >= 2 && (byFile.length >= 3 || ev.length >= 3) ? 'high' : r.conf;
      found.push({
        rid: r.id, skipIf: r.skipIf || [], weight: hits.length + ev.length, pri,
        finding: {
          id: `gh_${owner}_${name}_${r.id}`.replace(/[^A-Za-z0-9_]/g, '_').toLowerCase(),
          category: r.cat, title: val(r.title, ctx), bullet: val(r.bullet, ctx), detail: val(r.detail, ctx),
          tags: (val(r.tags, ctx) || []).filter(Boolean), confidence: conf, evidence: ev, status: 'new',
        },
      });
    });
    // 중복 제거: 상위 규칙이 있으면 하위 규칙(skipIf)은 뺀다 + 같은 근거를 쓰는 항목 정리
    const ids = new Set(found.map((x) => x.rid));
    let list = found.filter((x) => !x.skipIf.some((s) => ids.has(s)));
    const seen = new Set();
    list = list.filter((x) => { const k = x.finding.evidence[0].path + ':' + x.finding.evidence[0].start + ':' + x.finding.category; if (seen.has(k)) return false; seen.add(k); return true; });
    const confRank = (x) => (x.finding.confidence === 'high' ? 0 : 1);
    list.sort((a, b) => confRank(a) - confRank(b) || b.pri - a.pri || b.weight - a.weight);
    // 카테고리당 최대 3개, 전체 최대 10개
    const perCat = {}; const out = [];
    list.forEach((x) => { const c = x.finding.category; perCat[c] = (perCat[c] || 0) + 1; if (perCat[c] <= 3 && out.length < MAX_FINDINGS) out.push(x.finding); });
    return out;
  }

  /* ---------------- 진입점 ---------------- */
  const STEPS = ['레포 정보 불러오는 중', '파일 구조 살펴보는 중', '코드 읽는 중', '이력서 문장으로 정리하는 중'];
  async function analyzeLive(parsed, url, report) {
    const { owner, name } = parsed;
    report(0, STEPS[0]);
    const info = await getJson(`${API}/repos/${owner}/${name}`);
    const branch = parsed.branch || info.default_branch || 'main';
    const langBytes = await getJson(`${API}/repos/${owner}/${name}/languages`).catch((e) => { if (e.code === 'rate_limit') throw e; return {}; });
    const total = Object.values(langBytes).reduce((a, b) => a + b, 0) || 1;
    const languages = {};
    Object.entries(langBytes).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => { const pct = Math.round((v / total) * 1000) / 10; if (pct >= 0.5) languages[k] = pct; });

    report(1, STEPS[1]);
    const treeRes = await getJson(`${API}/repos/${info.owner.login}/${info.name}/git/trees/${encodeURIComponent(branch)}?recursive=1`);
    const tree = treeRes.tree || [];
    if (!tree.length) throw ghError('empty');
    const picked = pickFiles(tree);

    let done = 0;
    report(2, `${STEPS[2]} (0/${picked.length})`, 0, picked.length);
    await pool(picked, 6, async (f) => {
      f.text = await getRaw(info.owner.login, info.name, branch, f.path);
      f.lines = (f.text || '').split(/\r?\n/);
      done++; report(2, `${STEPS[2]} (${done}/${picked.length})`, done, picked.length);
    });
    const files = picked.filter((f) => f.text != null);

    report(3, STEPS[3]);
    const stack = deriveStack(files, languages, tree);
    const ctx = makeCtx(files, stack, tree);
    const meta = { owner: info.owner.login, name: info.name, branch };
    const findings = runRules(files, meta, ctx);
    await sleep(350);
    return {
      url: info.html_url || url, owner: meta.owner, name: meta.name, branch, source: 'github', analyzedAt: today(),
      meta: { description: info.description || '', stars: info.stargazers_count || 0, languages, topics: info.topics || [] },
      stack, findings, filesRead: files.length,
    };
  }

  // 시드에 있는 예시 레포 (실제로 없는 레포) — 오프라인에서도 다시 분석이 되도록 그대로 돌려준다
  function sampleRepo(key) {
    const s = App.github.SAMPLES[key]; if (!s) return null;
    const r = clone(s); r.source = 'sample'; r.analyzedAt = today();
    (r.findings || []).forEach((f) => { f.status = 'new'; });
    return r;
  }
  async function playSample(key, report) {
    const r = sampleRepo(key); const n = r.filesRead || 24;
    report(0, STEPS[0]); await sleep(380);
    report(1, STEPS[1]); await sleep(380);
    for (let k = 0; k <= n; k += 4) { report(2, `${STEPS[2]} (${Math.min(k, n)}/${n})`, Math.min(k, n), n); await sleep(90); }
    report(2, `${STEPS[2]} (${n}/${n})`, n, n);
    report(3, STEPS[3]); await sleep(420);
    return r;
  }

  async function analyze(url, opts = {}) {
    const report = (step, text, done, total) => { if (opts.onProgress) try { opts.onProgress({ step, text, done, total, steps: STEPS }); } catch (e) { /* ignore */ } };
    const parsed = parseUrl(url);
    if (!parsed) throw ghError('invalid');
    const key = keyOf(parsed.owner, parsed.name);
    if (App.github.SAMPLES[key] && !opts.live) return playSample(key, report);
    try {
      return await analyzeLive(parsed, url, report);
    } catch (e) {
      if (!e.code) { console.warn('[github] analyze failed', e); throw ghError('network'); }
      if ((e.code === 'rate_limit' || e.code === 'network') && App.github.SAMPLES[key]) e.sample = sampleRepo(key);
      throw e;
    }
  }

  // 예시 레포: seed-repos.js 가 window.SEED.projects[*].repo 에 넣어 둔 것 ('owner/name' 소문자 키)
  const SAMPLES = {};
  ((window.SEED && window.SEED.projects) || []).forEach((p) => { if (p.repo) SAMPLES[keyOf(p.repo.owner, p.repo.name)] = clone(p.repo); });

  App.github = { parseUrl, analyze, SAMPLES, STEPS, keyOf, sampleRepo, RULES, _internals: { blockAround, pickFiles, runRules, deriveStack, makeCtx } };
})(window.App);
