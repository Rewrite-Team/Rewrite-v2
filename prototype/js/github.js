/* GitHub: App.github. 담당: 레포 분석
   ① fetchAccount(주소) — 사용자 주소 하나로 조직·GitHub 프로젝트·레포를 모두 가져온다 (공개 REST API, 비인증)
   ② analyzeRepo({ owner, name, url }, { login }) — 코드(고른 파일 ≤30개, 규칙 기반 = 목업 "AI")와 커밋·PR 을 읽어
      STAR 초안 카드로 정리한다. 커밋·PR·코드에서 알 수 있는 사실만 쓰고, 수치·결과는 지어내지 않는다. */
(function (App) {
  const API = 'https://api.github.com';
  const RAW = 'https://raw.githubusercontent.com';
  const MAX_FILES = 30;
  const MAX_DRAFTS = 8;
  const MAX_SNIPPET = 18;
  const MAX_ORGS = 8;
  const MAX_CONTRIB_OWNERS = 8;   // 조직 멤버십이 비공개일 때 커밋·PR 로 보충하는 owner 수
  const MAX_CONTRIB_REPOS = 4;    // 그 owner 하나당 레포 수

  const today = () => App.store.localDay();
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const keyOf = (owner, name) => `${owner}/${name}`.toLowerCase();
  const day = (s) => String(s || '').slice(0, 10);

  /* ---------------- 주소 ---------------- */
  const LOGIN = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
  const RESERVED = /^(settings|topics|explore|marketplace|features|pricing|about|login|join|notifications|search|sponsors|issues|pulls|new|apps|collections|trending)$/i;
  // github.com 주소에서 경로 조각만. github 가 아닌 주소면 null
  function pathParts(input) {
    let s = String(input || '').trim();
    if (!s) return null;
    s = s.replace(/^git@github\.com:/i, 'https://github.com/').replace(/^(?:https?:\/\/)?(?:www\.)?github\.com(\/|$)/i, '');
    if (/^[a-z]+:\/\//i.test(s)) return null;
    return s.split(/[?#]/)[0].split('/').filter(Boolean);
  }
  // 레포 주소: https://github.com/o/r, .git, /tree/branch, git@github.com:o/r.git → { owner, name, branch? }
  function parseUrl(url) {
    const parts = pathParts(url);
    if (!parts || parts.length < 2) return null;
    const owner = parts[0]; const name = parts[1].replace(/\.git$/i, '');
    if (!LOGIN.test(owner) || !/^[A-Za-z0-9._-]+$/.test(name)) return null;
    const out = { owner, name };
    if ((parts[2] === 'tree' || parts[2] === 'blob') && parts[3]) out.branch = decodeURIComponent(parts[3]);
    return out;
  }
  // 사용자·조직 주소 → login. 레포 주소가 들어오면 그 owner. 'github.com/octocat', 'github.com/orgs/x', '@octocat', 'octocat'
  function parseAccount(input) {
    const parts = pathParts(input);
    if (!parts || !parts.length) return null;
    const login = (/^(orgs|users)$/i.test(parts[0]) ? parts[1] : parts[0].replace(/^@/, '')) || '';
    return LOGIN.test(login) && !RESERVED.test(login) && !/^(orgs|users)$/i.test(login) ? login : null;
  }

  /* ---------------- 에러 ---------------- */
  function ghError(code, extra = {}) {
    const resetAt = extra.reset ? new Date(Number(extra.reset) * 1000) : null;
    const hhmm = resetAt ? `${String(resetAt.getHours()).padStart(2, '0')}:${String(resetAt.getMinutes()).padStart(2, '0')}` : '';
    const MSG = {
      invalid: 'GitHub 레포 주소 형식이 아니에요. 예) https://github.com/owner/repo',
      invalid_account: 'GitHub 주소 형식이 아니에요. 예) https://github.com/octocat',
      not_found: '레포를 찾을 수 없어요. 공개(public) 레포인지 확인해 주세요. 비공개 레포는 아직 분석할 수 없어요.',
      account_not_found: 'GitHub 계정을 찾을 수 없어요. 주소가 맞는지 확인해 주세요.',
      rate_limit: `GitHub API 호출 한도에 걸렸어요. 로그인 없이 쓰면 1시간에 60회까지만 부를 수 있어요.${hhmm ? ` ${hhmm} 이후에 다시 시도해 주세요.` : ' 잠시 뒤 다시 시도해 주세요.'}`,
      network: '네트워크에 연결할 수 없어요. 인터넷 연결을 확인하고 다시 시도해 주세요.',
      empty: '아직 커밋이 없는 빈 레포예요. 코드를 올린 뒤 다시 분석해 주세요.',
      http: `GitHub에서 응답을 받지 못했어요 (${extra.status || '?'}). 잠시 뒤 다시 시도해 주세요.`,
    };
    const e = new Error(MSG[code] || MSG.http);
    e.code = code; Object.assign(e, extra);
    return e;
  }

  async function getJson(path, notFound = 'not_found') {
    let res;
    try { res = await fetch(API + path, { headers: { Accept: 'application/vnd.github+json' } }); } catch (err) { throw ghError('network'); }
    if (res.ok) return res.json();
    const remaining = res.headers.get('x-ratelimit-remaining');
    if (res.status === 429 || (res.status === 403 && (remaining === '0' || res.headers.get('retry-after')))) throw ghError('rate_limit', { reset: res.headers.get('x-ratelimit-reset') });
    if (res.status === 404 || res.status === 451 || res.status === 403) throw ghError(notFound); // 403: 접근 권한 없음 (비공개 등)
    if (res.status === 409) throw ghError('empty');
    throw ghError('http', { status: res.status });
  }
  // 없어도 되는 정보: 실패하면 기본값
  const optional = (path, fallback) => getJson(path).catch(() => fallback);
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
  const reporter = (opts, steps) => (step, text, done, total) => { if (opts.onProgress) try { opts.onProgress({ step, text: text || steps[step], done, total, steps }); } catch (e) { /* ignore */ } };

  /* ---------------- 계정: 조직 · 프로젝트 · 레포 ---------------- */
  const ACCOUNT_STEPS = ['계정 확인하는 중', '조직 찾는 중', '레포와 프로젝트 불러오는 중', '기여한 레포 찾는 중'];
  const PUBLIC_ONLY = '공개 레포만 가져올 수 있어요. 비공개 레포와 비공개 조직은 보이지 않아요.';
  const byPushed = (a, b) => (a.fork - b.fork) || String(b.pushedAt).localeCompare(String(a.pushedAt));
  const toRepo = (r) => ({ owner: r.owner.login, name: r.name, url: r.html_url, description: r.description || '', language: r.language || '', pushedAt: day(r.pushed_at), fork: !!r.fork });
  const toBoards = (list, kind, login) => (Array.isArray(list) ? list : []).filter((p) => p && p.title && !p.is_template && !p.deleted_at)
    .map((p) => ({ number: p.number, title: p.title, url: `https://github.com/${kind}/${login}/projects/${p.number}` }));

  function sampleAccount() { return Object.assign(clone(window.SEED.github), { fetchedAt: today(), note: PUBLIC_ONLY, warnings: [] }); }
  const isSampleLogin = (login) => !!window.SEED.github && login.toLowerCase() === window.SEED.github.login.toLowerCase();

  // 커밋·PR 검색으로 "내가 기여한 다른 owner 의 레포" 찾기. 실패하면 빈 배열
  async function contributedOwners(login, known) {
    const q = encodeURIComponent(`author:${login}`);
    const [commits, prs] = await Promise.all([
      optional(`/search/commits?q=${q}&sort=author-date&per_page=100`, { items: [] }),
      optional(`/search/issues?q=${encodeURIComponent(`author:${login} type:pr`)}&per_page=100`, { items: [] }),
    ]);
    const map = {};
    const put = (full, info, date, weight) => {
      const [owner, name] = full.split('/'); if (!owner || !name || known.has(owner.toLowerCase())) return;
      const k = full.toLowerCase();
      const r = map[k] = map[k] || { owner, name, url: `https://github.com/${full}`, description: '', language: '', pushedAt: '', fork: false, source: 'contributed', n: 0, type: '' };
      r.n += weight; if (day(date) > r.pushedAt) r.pushedAt = day(date);
      if (info) { r.description = info.description || r.description; r.fork = r.fork || !!info.fork; r.type = (info.owner && info.owner.type) || r.type; }
    };
    (commits.items || []).forEach((c) => { if (c.repository && !c.repository.private) put(c.repository.full_name, c.repository, c.commit && c.commit.author && c.commit.author.date, 1); });
    (prs.items || []).forEach((p) => {
      const full = String(p.repository_url || '').split('/repos/')[1]; if (!full) return;
      if (p.pull_request && p.pull_request.merged_at) put(full, null, p.pull_request.merged_at, 2); // 병합된 PR 만
    });
    const owners = {};
    Object.values(map).filter((r) => !r.fork).sort((a, b) => b.n - a.n).forEach((r) => { (owners[r.owner] = owners[r.owner] || []).push(r); });
    return Object.entries(owners).map(([o, repos]) => ({ o, repos: repos.slice(0, MAX_CONTRIB_REPOS), n: repos.reduce((s, r) => s + r.n, 0), type: (repos.find((r) => r.type) || {}).type }))
      .sort((a, b) => b.n - a.n).slice(0, MAX_CONTRIB_OWNERS)
      .map((x) => ({ login: x.o, type: x.type === 'User' ? 'user' : 'org', name: x.o, source: 'contributed', projects: [], repos: x.repos.map(({ n, type, ...r }) => r).sort(byPushed) }));
  }

  // → { login, type, name, url, source:'github'|'sample', fetchedAt, note, warnings:[문장], owners:[{ login, type:'user'|'org', name, source?, projects, repos }] }
  async function fetchAccount(input, opts = {}) {
    const report = reporter(opts, ACCOUNT_STEPS);
    const login = parseAccount(input);
    if (!login) throw ghError('invalid_account');
    if (isSampleLogin(login)) {
      for (let k = 0; k < ACCOUNT_STEPS.length; k++) { report(k); await sleep(220); }
      return sampleAccount();
    }
    report(0);
    const u = await getJson(`/users/${login}`, 'account_not_found');
    const isOrg = u.type === 'Organization'; const kind = isOrg ? 'orgs' : 'users';
    const warnings = [];
    report(1);
    const [orgs, mine, boards] = await Promise.all([
      isOrg ? [] : optional(`/users/${u.login}/orgs?per_page=100`, []),
      getJson(`/${kind}/${u.login}/repos?per_page=100&sort=pushed`, 'account_not_found'),
      optional(`/${kind}/${u.login}/projectsV2?per_page=30`, []),
    ]);
    if ((u.public_repos || 0) > 100) warnings.push(`${u.login}: 최근에 푸시한 레포 100개만 가져왔어요.`);
    const owners = [{ login: u.login, type: isOrg ? 'org' : 'user', name: u.name || u.login, projects: toBoards(boards, kind, u.login), repos: mine.map(toRepo).sort(byPushed) }];

    const list = orgs.slice(0, MAX_ORGS); let done = 0;
    if (orgs.length > MAX_ORGS) warnings.push(`조직은 ${MAX_ORGS}개까지만 가져왔어요.`);
    report(2, '', 0, list.length);
    let limited = null;
    const fetched = await pool(list, 4, async (o) => {
      const [repos, projects] = await Promise.all([
        getJson(`/orgs/${o.login}/repos?per_page=100&sort=pushed`).catch((e) => { if (e.code === 'rate_limit') limited = e; else warnings.push(`${o.login}: 레포를 가져오지 못했어요.`); return []; }),
        optional(`/orgs/${o.login}/projectsV2?per_page=30`, []),
      ]);
      done++; report(2, `${ACCOUNT_STEPS[2]} (${done}/${list.length})`, done, list.length);
      return { login: o.login, type: 'org', name: o.name || o.login, projects: toBoards(projects, 'orgs', o.login), repos: repos.map(toRepo).sort(byPushed) };
    });
    owners.push(...fetched);

    if (!isOrg && !limited) {
      report(3);
      const extra = await contributedOwners(u.login, new Set(owners.map((o) => o.login.toLowerCase())));
      await pool(extra.filter((o) => o.type === 'org').slice(0, 4), 4, async (o) => { o.projects = toBoards(await optional(`/orgs/${o.login}/projectsV2?per_page=30`, []), 'orgs', o.login); });
      owners.push(...extra);
    }
    if (limited) warnings.push(limited.message + ' 일부 조직의 레포는 빠져 있어요.');
    return { login: u.login, type: isOrg ? 'org' : 'user', name: u.name || u.login, url: u.html_url || `https://github.com/${u.login}`, source: 'github', fetchedAt: today(), note: PUBLIC_ONLY, warnings, owners };
  }

  /* ---------------- 파일 고르기 ---------------- */
  const SKIP_DIR = /(^|\/)(node_modules|dist|build|out|target|vendor|\.next|\.nuxt|coverage|\.gradle|\.idea|\.vscode|__pycache__|venv|\.venv|site-packages|migrations|static|public|assets|docs|fixtures|\.mvn|gradle\/wrapper)\//i;
  const SRC_EXT = /\.(java|kt|kts|js|jsx|ts|tsx|mjs|cjs|py)$/i;
  const PATH_HINT = /(config|security|auth(?!or)|jwt|token|filter|repositor|repo\b|service|controller|handler|exception|advice|error|cache|redis|lock|middleware|guard|interceptor|router|routes?|views?|models?|serializer|schema|entity|domain|tasks?|worker|consumer|producer|listener|event|client|api|app|main|server|index|settings)/i;
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
  function deriveStack(files, language, tree) {
    const build = files.filter((f) => f.kind === 'build' || f.kind === 'docker' || f.kind === 'conf').map((f) => f.text || '').join('\n');
    const s = [];
    const add = (x) => { if (x && !s.includes(x)) s.push(x); };
    add(language);
    STACK_RULES.forEach(([re, name]) => { if (re.test(build)) add(name); });
    if (s.includes('TypeScript') && s.includes('JavaScript')) s.splice(s.indexOf('JavaScript'), 1);
    if (tree.some((t) => /(^|\/)(Dockerfile|docker-compose[^/]*\.ya?ml|compose\.ya?ml)$/i.test(t.path))) add('Docker');
    if (tree.some((t) => /^\.github\/workflows\//.test(t.path))) add('GitHub Actions');
    return s;
  }

  /* ---------------- 규칙 ----------------
     rule = { id, cat, conf, pri?, file: 경로 정규식, need: 줄 정규식(필수), also?: [보조 근거 정규식], when?(ctx), skipIf?, whole?,
              title, act: 코드에서 확인되는 일('~함'), log: 커밋·PR 제목에서 같은 작업을 찾는 정규식 }   (title·act 는 ctx 를 받는 함수일 수 있다)
     pri 1 = 흔한 코드라 커밋·PR 근거가 있을 때만 카드로 만든다 */
  const JVM = /\.(java|kt)$/i, JS = /\.(m?[jt]sx?|cjs)$/i, PY = /\.py$/i, SRCANY = /\.(java|kt|m?[jt]sx?|cjs|py)$/i;
  const TC_RE = /testcontainers|@Container\b|(MySQL|PostgreSQL|MariaDB|Mongo(DB)?|Generic|Kafka)Container\b/i;
  const DEPLOY_RE = /docker\s+(build|push)|deploy|ssh|aws|codedeploy|ecr|ghcr/i;
  const RULES = [
    /* ---- 성능 ---- */
    { id: 'jpa_fetch_join', pri: 3, cat: '성능', conf: 'high', file: JVM, need: /join\s+fetch|JOIN\s+FETCH|@EntityGraph/,
      title: 'fetch join으로 연관 데이터 한 번에 조회', act: '연관 엔티티를 fetch join(@EntityGraph)으로 한 번에 조회하게 함.', log: /n\s*\+\s*1|fetch\s*join|entity\s*graph|페치\s*조인/i },
    { id: 'jpa_batch_size', cat: '성능', conf: 'mid', file: /\.(java|kt|ya?ml|properties)$/i, need: /default_batch_fetch_size|@BatchSize/,
      title: '배치 페치로 지연 로딩 쿼리 묶기', act: 'batch fetch size를 설정해 지연 로딩 쿼리를 IN 절로 묶어 조회하게 함.', log: /batch\s*(fetch|size)|배치\s*(페치|사이즈|조회)/i },
    { id: 'spring_cache', pri: 3, cat: '성능', conf: 'high', file: JVM, need: /@Cacheable|@EnableCaching|RedisCacheManager|CacheManager\b/, also: [/@CacheEvict|@CachePut/, /RedisCacheConfiguration|RedisTemplate|JCacheManager|Caffeine/],
      title: (c) => (c.has('Redis') ? 'Redis 캐시로 반복 조회 줄이기' : 'Spring Cache로 반복 조회 줄이기'), act: (c) => `반복 조회되는 데이터에 ${c.has('Redis') ? 'Redis ' : ''}캐시(@Cacheable)를 적용함.`, log: /cache|캐시|캐싱/i },
    { id: 'jpa_index', pri: 1, cat: '성능', conf: 'mid', file: /\.(java|kt|sql)$/i, need: /@Index\s*\(|CREATE\s+(UNIQUE\s+)?INDEX/i,
      title: '조회 조건에 인덱스 설계', act: '조회 조건 컬럼에 인덱스를 추가함.', log: /\bindex(es|ing)?\b|인덱스/i },
    { id: 'paging', pri: 1, cat: '성능', conf: 'mid', file: SRCANY, need: /\bPageable\b|\bSlice<|PageRequest\.of|\.paginate\(|PageNumberPagination|CursorPagination/,
      title: '목록 조회에 페이지네이션 적용', act: '목록 조회에 페이지네이션을 적용함.', log: /pagina|paging|페이징|페이지네이션|무한\s*스크롤/i },
    { id: 'async', cat: '성능', conf: 'mid', file: JVM, need: /@Async\b|@EnableAsync|CompletableFuture\.(supplyAsync|runAsync)/,
      title: '부가 작업을 비동기로 분리', act: '일부 작업을 @Async(CompletableFuture) 비동기로 실행하게 함.', log: /\basync|비동기/i },
    { id: 'django_select_related', pri: 3, cat: '성능', conf: 'high', file: PY, need: /\.(select_related|prefetch_related)\(/,
      title: 'select_related·prefetch_related로 조회 쿼리 묶기', act: 'select_related·prefetch_related로 연관 데이터를 묶어 조회하게 함.', log: /n\s*\+\s*1|select_related|prefetch|쿼리\s*(최적화|개선)/i },
    { id: 'py_cache', cat: '성능', conf: 'mid', file: PY, need: /@lru_cache|@cache_page|cache\.(get|set)\(|@cached\b|redis\.Redis\(/,
      title: '반복 계산·조회에 캐시 적용', act: '반복되는 계산·조회 결과를 캐시하게 함.', log: /cache|캐시|캐싱/i },
    { id: 'js_cache', cat: '성능', conf: 'mid', file: JS, need: /new\s+Redis\(|createClient\(|redis\.(get|set|setex)\(|\.setEx?\(|cache-manager|CacheModule/, when: (c) => c.has('Redis') || c.hasDep('cache-manager'),
      title: '자주 조회되는 데이터에 캐시 적용', act: '자주 조회되는 데이터를 캐시에 저장해 다시 쓰게 함.', log: /cache|redis|캐시|캐싱/i },
    { id: 'react_memo', pri: 1, cat: '성능', conf: 'mid', file: /\.(jsx|tsx)$/i, need: /\buseMemo\(|\buseCallback\(|React\.memo\(|\bmemo\(/,
      title: '메모이제이션으로 리렌더링 줄이기', act: 'useMemo·useCallback·React.memo로 다시 그려지는 범위를 줄이게 함.', log: /memo|re-?render|리렌더|렌더링/i },
    { id: 'react_lazy', cat: '성능', conf: 'mid', file: /\.(jsx|tsx|js|ts)$/i, need: /React\.lazy\(|\blazy\(\s*\(\)\s*=>\s*import|dynamic\(\s*\(\)\s*=>\s*import/,
      title: '코드 스플리팅 적용', act: '화면 단위로 코드를 나눠 필요할 때 불러오게 함.', log: /lazy|code\s*split|번들|스플리팅/i },

    /* ---- 인증·보안 ---- */
    { id: 'jwt_security', pri: 3, cat: '인증·보안', conf: 'high', file: JVM, need: /Jwts\.|JwtTokenProvider|JwtProvider|JWT\.create|JwtDecoder|JwtAuthentication/, also: [/SecurityFilterChain|@EnableWebSecurity|WebSecurityConfigurerAdapter/, /OncePerRequestFilter|addFilterBefore/],
      title: (c) => (c.has('Spring Security') ? 'JWT + Spring Security 인증 구현' : 'JWT 기반 인증 구현'), act: (c) => `${c.has('Spring Security') ? 'Spring Security에 ' : ''}JWT 기반 인증을 구성함.`, log: /jwt|token|auth(?!or)|security|로그인|인증|인가|토큰/i },
    { id: 'spring_security', cat: '인증·보안', conf: 'mid', file: JVM, need: /SecurityFilterChain|@EnableWebSecurity|WebSecurityConfigurerAdapter/, also: [/PasswordEncoder|BCrypt/], skipIf: ['jwt_security'],
      title: 'Spring Security로 인증·인가 구성', act: 'Spring Security로 접근 권한을 구성함.', log: /security|auth(?!or)|로그인|인증|인가|권한/i },
    { id: 'oauth2', cat: '인증·보안', conf: 'high', file: /\.(java|kt|ya?ml|properties|[jt]sx?|py)$/i, need: /oauth2Login|OAuth2User|spring\.security\.oauth2|passport-(google|kakao|naver|github)|NextAuth|social_django|allauth/,
      title: '소셜 로그인(OAuth 2.0) 연동', act: 'OAuth 2.0 소셜 로그인을 연동함.', log: /oauth|social|kakao|google|naver|소셜|카카오|구글|네이버/i },
    { id: 'js_jwt', pri: 3, cat: '인증·보안', conf: 'high', file: JS, need: /jwt\.(sign|verify)\(|jsonwebtoken|JwtService|passport\.authenticate|@UseGuards\(/, also: [/bcrypt\.(hash|compare)|argon2/],
      title: 'JWT 인증 구현', act: 'JWT를 발급·검증해 보호된 API 접근을 제어하게 함.', log: /jwt|token|auth(?!or)|guard|로그인|인증|토큰/i },
    { id: 'js_security_mw', cat: '인증·보안', conf: 'mid', file: JS, need: /helmet\(|express-rate-limit|rateLimit\(|ThrottlerModule|csurf/,
      title: '보안 헤더·요청 제한 적용', act: '보안 헤더와 요청 횟수 제한 미들웨어를 적용함.', log: /helmet|rate.?limit|throttl|csrf|보안|요청 제한/i },
    { id: 'py_auth', cat: '인증·보안', conf: 'mid', file: PY, need: /permission_classes|IsAuthenticated|OAuth2PasswordBearer|jwt\.(encode|decode)\(|@login_required|JWTAuthentication/,
      title: '토큰·권한 기반 API 인증', act: '토큰 인증과 권한 검사로 API 접근을 제어하게 함.', log: /jwt|token|auth(?!or)|permission|로그인|인증|권한|토큰/i },

    /* ---- 데이터 ---- */
    { id: 'optimistic_lock', pri: 3, cat: '데이터', conf: 'high', file: JVM, need: /@Version\b/, also: [/OptimisticLock|ObjectOptimisticLockingFailureException|@Retryable/],
      title: '낙관적 락으로 동시 수정 충돌 제어', act: '엔티티에 버전 필드(@Version)를 둬 동시에 수정되면 충돌을 감지하게 함.', log: /optimistic|@?version\s*field|concurren|낙관|동시|중복/i },
    { id: 'pessimistic_lock', pri: 3, cat: '데이터', conf: 'high', file: JVM, need: /PESSIMISTIC_(WRITE|READ)|@Lock\s*\(/,
      title: '비관적 락으로 동시 요청 처리', act: '비관적 락으로 조회해 동시 요청을 순서대로 처리하게 함.', log: /pessimistic|\block\b|concurren|비관|동시|(^|[^가-힣])락/i },
    { id: 'distributed_lock', pri: 3, cat: '데이터', conf: 'high', file: SRCANY, need: /RedissonClient|RLock|redlock|SETNX|setIfAbsent\(/,
      title: 'Redis 분산 락으로 동시성 제어', act: 'Redis 분산 락으로 같은 작업이 동시에 처리되지 않게 함.', log: /redisson|distributed|\block\b|concurren|분산|동시/i },
    { id: 'py_lock', pri: 3, cat: '데이터', conf: 'high', file: PY, need: /select_for_update\(|transaction\.atomic|with_for_update\(/,
      title: '트랜잭션·행 잠금으로 데이터 정합성 처리', act: '트랜잭션(행 잠금)으로 여러 쓰기를 함께 처리하게 함.', log: /transaction|atomic|\block\b|concurren|트랜잭션|동시|정합/i },
    { id: 'js_transaction', pri: 3, cat: '데이터', conf: 'high', file: JS, need: /\$transaction\(|startTransaction\(|\.transaction\(\s*(async)?\s*\(|withTransaction\(|@Transaction\(|query\(\s*['"`]BEGIN/,
      title: '여러 쓰기 작업을 트랜잭션으로 묶기', act: '여러 쓰기 작업을 한 트랜잭션으로 묶어 처리하게 함.', log: /transaction|rollback|트랜잭션|정합/i },
    { id: 'unique_constraint', pri: 1, cat: '데이터', conf: 'mid', file: /\.(java|kt|sql|prisma|py)$/i, need: /@UniqueConstraint|unique\s*=\s*(true|True)|UNIQUE\s*(KEY|\()|@@unique|UniqueConstraint\(/,
      title: 'DB 유니크 제약으로 중복 저장 차단', act: 'DB 유니크 제약을 추가해 중복 저장을 막게 함.', log: /unique|duplicat|유니크|중복/i },
    { id: 'readonly_tx', pri: 1, cat: '데이터', conf: 'mid', file: JVM, need: /@Transactional\s*\(\s*readOnly\s*=\s*true/,
      title: '읽기 전용 트랜잭션 분리', act: '조회 로직에 readOnly 트랜잭션을 적용함.', log: /read-?only|읽기 전용/i },
    { id: 'querydsl', cat: '데이터', conf: 'mid', file: JVM, need: /JPAQueryFactory|BooleanExpression|BooleanBuilder/,
      title: 'QueryDSL로 동적 검색 쿼리 구현', act: 'QueryDSL로 조건에 따라 바뀌는 검색 쿼리를 구현함.', log: /query\s*dsl|동적\s*쿼리|검색|search|filter/i },
    { id: 'migration', cat: '데이터', conf: 'mid', file: /(db\/migration\/[^/]+\.sql|build\.gradle(\.kts)?|pom\.xml|package\.json)$/i, need: /flyway|liquibase|prisma\s+migrate|knex\s+migrate/i,
      title: 'DB 스키마 변경 이력 관리', act: '마이그레이션 도구로 DB 스키마 변경을 코드로 관리하게 함.', log: /flyway|liquibase|migrat|마이그레이션|스키마/i },
    { id: 'orm_schema', pri: 1, cat: '데이터', conf: 'mid', file: /\.(prisma|[jt]s)$/i, need: /^model\s+\w+\s*\{|new\s+(mongoose\.)?Schema\(|@Entity\(\)|sequelize\.define\(/,
      title: '데이터 모델 설계', act: 'ORM 스키마로 데이터 모델과 관계를 정의함.', log: /schema|model|entity|erd|스키마|모델|테이블/i },

    /* ---- 아키텍처 ---- */
    { id: 'domain_event', pri: 3, cat: '아키텍처', conf: 'high', file: JVM, need: /ApplicationEventPublisher|@TransactionalEventListener|@EventListener|publishEvent\(/,
      title: '이벤트로 기능 간 결합 낮추기', act: '스프링 이벤트를 발행·구독하는 구조로 후속 처리를 분리함.', log: /\bevents?\b|이벤트/i },
    { id: 'mq', pri: 3, cat: '아키텍처', conf: 'high', file: SRCANY, need: /@KafkaListener|KafkaTemplate|RabbitTemplate|@RabbitListener|@Processor\(|new\s+Queue\(|amqplib|kafkajs/,
      title: '메시지 큐로 작업 분리', act: '메시지 큐로 요청 처리와 후속 작업을 분리함.', log: /kafka|rabbit|queue|consumer|producer|메시지|큐/i },
    { id: 'celery', pri: 3, cat: '아키텍처', conf: 'high', file: PY, need: /@shared_task|@app\.task|@celery_app\.task|Celery\(/,
      title: '오래 걸리는 작업을 Celery로 분리', act: '일부 작업을 Celery 비동기 작업으로 분리함.', log: /celery|task|worker|비동기/i },
    { id: 'realtime', pri: 3, cat: '아키텍처', conf: 'high', file: SRCANY, need: /@WebSocketGateway|socket\.io|io\.on\(\s*['"]connection|@MessageMapping|StompEndpointRegistry|WebSocketHandler|websocket\.accept\(|SseEmitter/,
      title: '실시간 통신 구현', act: 'WebSocket(SSE) 기반 실시간 통신을 구현함.', log: /socket|stomp|sse|real-?time|chat|채팅|실시간/i },
    { id: 'scheduler', pri: 2, cat: '아키텍처', conf: 'mid', file: SRCANY, need: /@Scheduled\s*\(|@EnableScheduling|node-cron|cron\.schedule\(|@Cron\(|crontab\(/,
      title: '주기 작업 자동화', act: '스케줄러로 정해진 시간에 작업이 실행되게 함.', log: /schedul|cron|batch|스케줄|배치|정기/i },
    { id: 'external_api', pri: 1, cat: '아키텍처', conf: 'mid', file: JVM, need: /@FeignClient|WebClient\.(builder|create)|RestTemplate\b|RestClient\.(builder|create)/, also: [/@Retryable|@CircuitBreaker|Resilience4j|timeout/i],
      title: '외부 API 연동', act: '외부 API를 호출하는 클라이언트를 구현함.', log: /feign|web\s*client|rest\s*template|external|open\s*api|외부|연동/i },
    { id: 'aop', cat: '아키텍처', conf: 'mid', file: JVM, need: /@Aspect\b|@Around\s*\(/,
      title: 'AOP로 공통 로직 분리', act: 'AOP로 여러 곳에서 쓰는 공통 로직을 분리함.', log: /aop|aspect|공통|로깅|logging/i },
    { id: 'nest_module', pri: 1, cat: '아키텍처', conf: 'mid', file: /\.ts$/i, need: /@Module\(\s*\{/, also: [/@Injectable\(\)/],
      title: 'NestJS 모듈 구조 설계', act: 'NestJS 모듈로 기능을 나눠 구성함.', log: /module|nest|모듈|구조/i },
    { id: 'py_api', pri: 1, cat: '아키텍처', conf: 'mid', file: PY, need: /class\s+\w+\((viewsets\.\w+|APIView|generics\.\w+)\)|APIRouter\(|Depends\(/,
      title: (c) => (c.has('FastAPI') ? 'FastAPI 라우터 구성' : 'DRF로 REST API 구성'), act: (c) => (c.has('FastAPI') ? 'FastAPI 라우터와 의존성 주입으로 API를 구성함.' : 'DRF 뷰로 REST API를 구성함.'), log: /api|router|view|endpoint|엔드포인트/i },
    { id: 'multi_module', cat: '아키텍처', conf: 'mid', file: /settings\.gradle(\.kts)?$/i, need: /^\s*include\s*[\(\s'"]/,
      title: '멀티 모듈 구조로 분리', act: 'Gradle 멀티 모듈로 프로젝트를 나눠 구성함.', log: /module|모듈/i },

    /* ---- 테스트 ---- */
    { id: 'spring_test', pri: 3, cat: '테스트', conf: 'high', file: JVM, need: /@SpringBootTest|@DataJpaTest|@WebMvcTest|@ExtendWith\(\s*MockitoExtension/, also: [/@Testcontainers|@Container\b|@ServiceConnection|MySQLContainer|PostgreSQLContainer/, /@MockBean|@MockitoBean|Mockito\.|given\(|\bmockMvc\b/i],
      title: (c) => (c.hasCode(TC_RE) ? 'Testcontainers 통합 테스트 구성' : '계층별 테스트 코드 작성'), act: (c) => `${c.hasCode(TC_RE) ? 'Testcontainers로 실제 DB를 띄우는 통합 테스트' : '스프링 테스트 코드'}를 작성함${c.testCount ? ` (테스트 파일 ${c.testCount}개)` : ''}.`, log: /\btests?\b|testcontainers|junit|테스트/i },
    { id: 'js_test', pri: 3, cat: '테스트', conf: 'high', file: /\.(test|spec)\.[jt]sx?$/i, need: /\b(describe|it|test)\(\s*['"`]/, also: [/supertest|request\(app\)|render\(|screen\.|Test\.createTestingModule/],
      title: '자동화 테스트 코드 작성', act: (c) => `API·컴포넌트 동작을 검증하는 테스트를 작성함${c.testCount ? ` (테스트 파일 ${c.testCount}개)` : ''}.`, log: /\btests?\b|jest|vitest|테스트/i },
    { id: 'pytest', pri: 3, cat: '테스트', conf: 'high', file: PY, need: /^\s*def\s+test_\w+\(|@pytest\.fixture|class\s+\w+\((TestCase|APITestCase)\)/,
      title: '파이썬 테스트 코드 작성', act: (c) => `동작을 검증하는 테스트를 작성함${c.testCount ? ` (테스트 파일 ${c.testCount}개)` : ''}.`, log: /\btests?\b|pytest|테스트/i },
    { id: 'coverage', pri: 1, cat: '테스트', conf: 'mid', file: /(build\.gradle(\.kts)?|pom\.xml|package\.json|jest\.config\.[jt]s|pyproject\.toml|\.ya?ml)$/i, need: /jacoco|coverageThreshold|--cov\b|codecov|"coverage"\s*:/i,
      title: '테스트 커버리지 측정', act: '빌드에 커버리지 측정을 연결함.', log: /coverage|jacoco|codecov|커버리지/i },

    /* ---- 인프라·배포 ---- */
    { id: 'gh_actions', pri: 3, cat: '인프라·배포', conf: 'high', file: /^\.github\/workflows\/.+\.ya?ml$/i, need: /^\s*steps\s*:/,
      title: (c) => (c.hasCode(DEPLOY_RE, /\.github\/workflows/) ? 'GitHub Actions 배포 자동화' : 'GitHub Actions CI 구성'), act: (c) => (c.hasCode(DEPLOY_RE, /\.github\/workflows/) ? 'GitHub Actions로 빌드와 배포 과정을 자동화함.' : 'GitHub Actions로 빌드·검사가 자동 실행되게 함.'), log: /\bci\b|\bcd\b|ci\/cd|github\s*action|workflow|deploy|배포|자동화/i },
    { id: 'docker_compose', pri: 3, cat: '인프라·배포', conf: 'high', file: /(docker-compose[^/]*|compose)\.ya?ml$/i, need: /^\s*services\s*:/,
      title: 'Docker Compose로 실행 환경 구성', act: 'Docker Compose로 함께 실행할 서비스를 정의함.', log: /docker|compose|도커|컨테이너/i },
    { id: 'dockerfile', cat: '인프라·배포', conf: 'mid', file: /(^|\/)(Dockerfile(\..+)?|.+\.Dockerfile)$/i, need: /^\s*FROM\s+/i, whole: true, skipIf: ['docker_compose'],
      title: (c) => (c.multiStage ? '멀티 스테이지 Docker 이미지 빌드' : 'Docker로 애플리케이션 컨테이너화'), act: (c) => (c.multiStage ? '멀티 스테이지 Dockerfile로 빌드와 실행 단계를 나눠 이미지를 만들게 함.' : 'Dockerfile을 작성해 애플리케이션을 컨테이너로 실행하게 함.'), log: /docker|image|도커|컨테이너/i },
    { id: 'k8s', cat: '인프라·배포', conf: 'high', file: /\.ya?ml$/i, need: /^\s*kind\s*:\s*(Deployment|StatefulSet|Ingress)\b/,
      title: '쿠버네티스 배포 구성', act: '쿠버네티스 매니페스트로 배포를 구성함.', log: /k8s|kubernetes|helm|ingress|쿠버네티스/i },
    { id: 'monitoring', pri: 1, cat: '인프라·배포', conf: 'mid', file: /\.(gradle|kts|xml|ya?ml|properties)$/i, need: /actuator|micrometer|prometheus|grafana/i,
      title: '상태·지표 모니터링 구성', act: '애플리케이션 상태와 지표를 확인할 수 있게 노출함.', log: /monitor|actuator|prometheus|grafana|metric|모니터링|지표/i },

    /* ---- 협업·품질 ---- */
    { id: 'global_exception', pri: 3, cat: '협업·품질', conf: 'high', file: JVM, need: /@RestControllerAdvice|@ControllerAdvice/, also: [/@ExceptionHandler/, /class\s+\w*(ErrorCode|Exception)\b/],
      title: '공통 예외 처리로 에러 응답 통일', act: '전역 예외 처리(@RestControllerAdvice)로 에러 응답을 한곳에서 만들게 함.', log: /exception|error\s*(code|handl|response)|예외|에러/i },
    { id: 'js_error_mw', pri: 1, cat: '협업·품질', conf: 'mid', file: JS, need: /\(\s*err\s*,\s*req\s*,\s*res\s*,\s*next\s*\)|@Catch\(|ExceptionFilter/,
      title: '공통 에러 처리', act: '전역 에러 처리로 에러 응답을 한곳에서 만들게 함.', log: /error\s*(handl|middleware)|exception|예외|에러/i },
    { id: 'api_docs', pri: 3, cat: '협업·품질', conf: 'high', file: /\.(java|kt|gradle|kts|xml|ya?ml|[jt]s|py)$/i, need: /springdoc|@Operation\s*\(|@Tag\s*\(|@ApiOperation|OpenAPIDefinition|SwaggerModule|swagger-ui|swagger-jsdoc|drf_spectacular|restdocs/i,
      title: (c) => (c.hasCode(/restdocs/i) ? 'Spring REST Docs로 API 문서 작성' : 'Swagger(OpenAPI) API 문서 작성'), act: (c) => (c.hasCode(/restdocs/i) ? 'Spring REST Docs로 테스트에서 API 문서를 만들게 함.' : 'Swagger(OpenAPI)로 API 명세를 코드에서 만들게 함.'), log: /swagger|open\s*api|rest\s*docs|api\s*(docs?|문서|명세)|명세/i },
    { id: 'validation', pri: 1, cat: '협업·품질', conf: 'mid', file: /\.(java|kt|[jt]s|py)$/i, need: /@Valid\b|@Validated\b|ValidationPipe|class-validator|z\.object\(|Joi\.object\(|Field\(\s*\.\.\./, also: [/@NotBlank|@NotNull|@Size|@Email|@IsString|@IsNotEmpty/],
      title: '요청 값 검증 적용', act: '요청이 들어오는 시점에 값을 검증하게 함.', log: /validat|검증|유효성/i },
    { id: 'lint', pri: 1, cat: '협업·품질', conf: 'mid', file: /(package\.json|\.eslintrc(\.[a-z]+)?|eslint\.config\.[mc]?js|\.prettierrc(\.[a-z]+)?|pyproject\.toml|build\.gradle(\.kts)?)$/i, need: /"husky"|lint-staged|"eslint"|prettier|ruff|black|flake8|spotless|checkstyle|ktlint/i,
      title: '린트·포맷터로 코드 스타일 통일', act: '린터와 포맷터를 설정해 코드 스타일을 맞추게 함.', log: /\blint|eslint|prettier|husky|format|린트|컨벤션/i },
    { id: 'ts_strict', pri: 1, cat: '협업·품질', conf: 'mid', file: /tsconfig\.json$/i, need: /"strict"\s*:\s*true/,
      title: 'TypeScript strict 모드 적용', act: 'TypeScript strict 모드로 타입을 검사하게 함.', log: /strict|typescript|타입/i },
  ];
  // 발견 카테고리 → 역량(고정 12개)
  const CAT_KW = {
    성능: ['문제 해결력', '분석적 사고'], '인증·보안': ['실행력', '의사결정 능력'], 데이터: ['문제 해결력', '실행력'], 아키텍처: ['의사결정 능력', '실행력'],
    테스트: ['실행력', '분석적 사고'], '인프라·배포': ['실행력', '추진력'], '협업·품질': ['협업능력', '커뮤니케이션'],
  };

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

  /* ---------------- 코드에서 찾기 ---------------- */
  function makeCtx(files, stack, tree) {
    const build = files.filter((f) => f.kind === 'build').map((f) => f.text || '').join('\n');
    const testCount = tree.filter((t) => t.type === 'blob' && SRC_EXT.test(t.path) && isTestPath(t.path) && !SKIP_DIR.test('/' + t.path)).length;
    const dockerfiles = files.filter((f) => /Dockerfile/i.test(f.path));
    return {
      stack, testCount,
      has: (x) => stack.includes(x),
      hasDep: (x) => build.includes(x),
      hasCode: (re, pathRe) => files.some((f) => (!pathRe || pathRe.test(f.path)) && re.test(f.text || '')),
      multiStage: dockerfiles.some((f) => ((f.text || '').match(/^\s*FROM\s+/gim) || []).length > 1),
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
      found.push({ rule: r, weight: hits.length + ev.length, conf, title: val(r.title, ctx), act: val(r.act, ctx), files: ev });
    });
    // 중복 제거: 상위 규칙이 있으면 하위 규칙(skipIf)은 뺀다 + 같은 근거를 쓰는 항목 정리
    const ids = new Set(found.map((x) => x.rule.id)); const seen = new Set();
    return found.filter((x) => !(x.rule.skipIf || []).some((s) => ids.has(s)))
      .filter((x) => { const k = x.files[0].path + ':' + x.files[0].start + ':' + x.rule.cat; if (seen.has(k)) return false; seen.add(k); return true; })
      .sort((x, y) => (x.conf === 'high' ? 0 : 1) - (y.conf === 'high' ? 0 : 1) || (y.rule.pri || 2) - (x.rule.pri || 2) || y.weight - x.weight);
  }


  /* ---------------- 커밋 · PR ---------------- */
  const isBot = (u) => !!u && (u.type === 'Bot' || /\[bot\]$|^dependabot|^renovate/i.test(u.login || ''));
  const toCommit = (c) => {
    const msg = String((c.commit && c.commit.message) || '');
    return { sha: c.sha.slice(0, 7), message: msg.split('\n')[0].trim(), body: msg.split('\n').slice(1).join('\n').trim(), date: day(c.commit && ((c.commit.author || {}).date || (c.commit.committer || {}).date)), url: c.html_url };
  };
  const goodCommit = (c) => !isBot(c.author) && (c.parents || []).length < 2 && !/^merge\b/i.test((c.commit && c.commit.message) || '');
  const toPr = (p) => ({ number: p.number, title: p.title.trim(), body: p.body || '', date: day(p.merged_at || p.closed_at || p.created_at), from: day(p.created_at), url: p.html_url, merged: !!p.merged_at, open: p.state === 'open' });
  const sameLogin = (u, login) => !!u && !!login && u.login.toLowerCase() === login.toLowerCase();

  /* 커밋·PR 읽기. login 의 것이 있으면 그것만, 하나도 없으면 레포 전체 → { commits, prs, byAuthor } */
  async function readHistory(owner, name, branch, login) {
    const base = `/repos/${owner}/${name}`; const sha = `&sha=${encodeURIComponent(branch)}`;
    const soft = (path) => getJson(path).catch((e) => { if (e.code === 'rate_limit') throw e; return []; });
    const [mine, pulls] = await Promise.all([
      login ? soft(`${base}/commits?author=${encodeURIComponent(login)}&per_page=100${sha}`) : [],
      soft(`${base}/pulls?state=all&per_page=100`),
    ]);
    const human = pulls.filter((p) => !isBot(p.user) && (p.merged_at || p.state === 'open')); // 병합되지 않고 닫힌 PR 은 뺀다
    const myPrs = human.filter((p) => sameLogin(p.user, login));
    if (mine.length || myPrs.length) return { commits: mine.filter(goodCommit).map(toCommit), prs: myPrs.map(toPr), byAuthor: true };
    const all = await soft(`${base}/commits?per_page=100${sha}`);
    return { commits: all.filter(goodCommit).map(toCommit), prs: human.map(toPr), byAuthor: false };
  }

  // 작업 종류. 문서·스타일·버전 올리기처럼 경험 카드가 되기 어려운 것은 ''
  const KINDS = { perf: 5, fix: 4, refactor: 4, feat: 3, test: 2, ci: 2 };
  function kindOf(title) {
    const t = title.trim();
    const m = t.match(/^\W*(feat|feature|fix|bugfix|hotfix|bug|perf|refactor|refact|test|ci|cd|build|chore|docs?|style|release|merge|revert)\b/i);
    if (m) {
      const k = m[1].toLowerCase();
      return { feature: 'feat', bugfix: 'fix', hotfix: 'fix', bug: 'fix', refact: 'refactor', cd: 'ci' }[k] || (KINDS[k] ? k : '');
    }
    if (/^(merge|release|bump|update (readme|dependency|dependencies)|v?\d+\.\d+|revert)\b|readme|오타|typo/i.test(t)) return '';
    if (/성능|최적화|속도|optimi[sz]|performance|speed ?up/i.test(t)) return 'perf';
    if (/수정|버그|해결|에러|오류|\bfix(es|ed)?\b|\bresolve/i.test(t)) return 'fix';
    if (/리팩|구조|분리|refactor|restructure|clean ?up/i.test(t)) return 'refactor';
    if (/테스트|\btests?\b/i.test(t)) return 'test';
    if (/배포|\bci\b|deploy|pipeline/i.test(t)) return 'ci';
    if (/구현|추가|기능|도입|적용|개선|연동|\b(add|implement|support|introduce|create)(s|ed)?\b/i.test(t)) return 'feat';
    return '';
  }
  const KIND_KW = { perf: ['문제 해결력', '분석적 사고'], fix: ['문제 해결력', '실행력'], refactor: ['의사결정 능력', '실행력'], feat: ['실행력'], test: ['실행력', '분석적 사고'], ci: ['실행력', '추진력'] };

  // 'feat(auth): …', '[Feat] …', '#12 …', '… (#34)' 같은 꾸밈을 뗀 제목
  const cleanTitle = (t) => String(t || '').replace(/^(?:\s|:[a-z_]+:|\p{Extended_Pictographic}|\uFE0F)+/u, '').replace(/^\s*(\[[^\]]*\]\s*)+/, '').replace(/^\W*(feat|feature|fix|bugfix|hotfix|bug|perf|refactor|refact|test|ci|cd|build|chore|docs?|style)(\([^)]*\))?!?\s*[:：\-\/]\s*/i, '')
    .replace(/^#\d+\s*[:\-]?\s*/, '').replace(/\s*\(?#\d+\)?\s*$/, '').replace(/\s+/g, ' ').trim();
  const cut = (s, n) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length <= n ? t : t.slice(0, n - 1).trim() + '…'; };

  // PR 본문의 제목(##)별 내용을 STAR 칸으로 나눈다. 본문에 적힌 글만 쓴다
  const SECTION = [
    ['result', /결과|성과|효과|before|after|result|benchmark|impact/i],
    ['situation', /배경|문제|이유|원인|상황|현상|why|problem|motivation|background|context|cause/i],
    ['task', /목적|목표|관련 ?이슈|goal|purpose|objective/i],
    ['action', /변경|작업|구현|내용|해결|방법|요약|개요|what|change|solution|how|summary|description|implementation|fix/i],
    ['skip', /./],
  ];
  function cleanBody(md) {
    return String(md || '').replace(/<!--[\s\S]*?-->/g, '').replace(/```[\s\S]*?```/g, '').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/<[^>]+>/g, '')
      .replace(/^\s*[-*]\s*\[ \].*$/gm, '').replace(/^\s*(close[sd]?|fix(e[sd])?|resolve[sd]?|related to|관련 이슈)?\s*:?\s*#\d+\s*$/gim, '').replace(/https?:\/\/\S+/g, '').replace(/\r/g, '');
  }
  function sections(md) {
    const out = { situation: [], task: [], action: [], result: [] }; let cur = null; let headed = false;
    cleanBody(md).split('\n').forEach((line) => {
      const h = line.match(/^\s*#{1,6}\s+(.+)$/) || line.match(/^\s*\*\*([^*]+)\*\*\s*:?\s*$/);
      if (h) { headed = true; cur = SECTION.find(([, re]) => re.test(h[1]))[0]; return; }
      const t = line.replace(/^\s*(?:[-*+>]|\d+\.)\s+/, '').replace(/^\[x\]\s*/i, '').replace(/[*_`]{1,3}/g, '').trim();
      if (!t || /^[-=|:\s]+$/.test(t) || /^\|/.test(t)) return;
      const k = cur || (headed ? 'skip' : 'action');
      if (out[k]) out[k].push(/[.!?。]$/.test(t) ? t : t + '.');
    });
    const r = {}; Object.keys(out).forEach((k) => { r[k] = cut(out[k].join(' '), 360); });
    return r;
  }

  // 같은 작업을 다룬 커밋·PR 찾기 (제목 매칭 + 근거 파일 이름이 언급된 것)
  function matchHistory(rule, finding, history) {
    const names = finding.files.map((f) => f.path.split('/').pop().replace(/\.[^.]+$/, '')).filter((n) => n.length >= 8 && !/^(application|settings|docker-compose|package|requirements|Dockerfile)$/i.test(n));
    const hit = (text) => rule.log.test(text) || names.some((n) => text.includes(n));
    const bodyHit = (b) => { const t = cleanBody(b); return t.length > 40 && (t.match(new RegExp(rule.log.source, 'gi')) || []).length >= 2; };
    return {
      prs: history.prs.map((p) => ({ p, s: (hit(p.title) ? 2 : 0) + (bodyHit(p.body) ? 1 : 0) })).filter((x) => x.s).sort((a, b) => b.s - a.s).slice(0, 3).map((x) => x.p),
      commits: history.commits.filter((c) => hit(c.message)).slice(0, 5),
    };
  }
  // PR 하나와 이어지는 커밋: 'PR 번호'가 적혀 있거나 제목 낱말이 두 개 이상 겹치는 것
  function commitsOfPr(pr, commits) {
    const words = (s) => new Set(cleanTitle(s).toLowerCase().split(/[^a-z0-9가-힣]+/).filter((w) => w.length >= 2));
    const w = words(pr.title);
    return commits.filter((c) => new RegExp(`#${pr.number}\\b`).test(c.message) || [...words(c.message)].filter((x) => w.has(x)).length >= 2).slice(0, 5);
  }

  /* ---------------- STAR 초안 ---------------- */
  const evCommit = ({ sha, message, date, url }) => ({ sha, message: cut(message, 120), date, url });
  const evPr = ({ number, title, date, url }) => ({ number, title, date, url });
  function periodOf(commits, prs) {
    const ds = commits.map((c) => c.date).concat(prs.map((p) => p.from), prs.map((p) => p.date)).filter(Boolean).sort();
    return ds.length ? { start: ds[0].slice(0, 7), end: ds[ds.length - 1].slice(0, 7) } : null;
  }
  const quoted = (list) => list.map((x) => `「${cut(cleanTitle(x), 70)}」`).join(', ');
  function makeDraft(meta, id, { title, act, files, commits, prs, keywords, lead }) {
    const key = `gh:${meta.key}:${id}`; const sec = lead ? sections(lead.body) : {};
    const own = meta.byAuthor; // 내가 쓴 PR·커밋일 때만 "맡음"
    const fileNames = [...new Set(files.map((f) => f.path.split('/').pop()))].slice(0, 3);
    const situation = sec.situation || `${meta.full}${meta.description ? `(${cut(meta.description, 80)})` : ''} 개발 중의 작업.`;
    const task = sec.task || (lead ? `「${cut(cleanTitle(lead.title), 80)}」(PR #${lead.number}) ${own ? '작업을 맡음' : '작업'}.` : '');
    const parts = [];
    if (sec.action) parts.push(sec.action);
    if (act) parts.push(act + (fileNames.length ? ` (${fileNames.join(', ')})` : ''));
    if (!parts.length) parts.push(`「${cut(title, 80)}」 작업을 진행함.`);
    const others = commits.filter((c) => cleanTitle(c.message) !== title).slice(0, 3); // 제목과 같은 커밋은 되풀이하지 않는다
    if (!sec.action && others.length) parts.push(`관련 커밋은 ${quoted(others.map((c) => c.message))}.`);
    const d = {
      key, title: cut(title, 60), summary: cut((act ? act.replace(/함(?=\s*\(|\.$)/, '했다') : '') || App.ai.brief(sec.action || `${meta.full}에서 「${cut(title, 60)}」 작업을 진행했다.`, 90), 110),
      star: { situation, task, action: parts.join(' '), result: sec.result || '' },
      keywords: App.keywords.clean(keywords).slice(0, 3),
      evidence: { repo: meta.full, keys: [key], commits: commits.map(evCommit), prs: prs.map(evPr), files },
    };
    const period = periodOf(commits, prs); if (period) d.period = period;
    return d;
  }

  async function buildDrafts(found, history, meta) {
    const has = (x) => x.m.prs.length || x.m.commits.length;
    found.forEach((x) => { x.m = matchHistory(x.rule, x, history); });
    // 커밋·PR 제목으로 못 찾은 것은 근거 파일을 고친 커밋으로 확인한다 (호출 수를 아끼려고 앞의 4개만)
    const author = history.byAuthor ? `&author=${encodeURIComponent(meta.login)}` : '';
    await pool(found.filter((x) => !has(x) && (x.rule.pri || 2) > 1).slice(0, 4), 4, async (x) => {
      const list = await optional(`/repos/${meta.full}/commits?path=${encodeURIComponent(x.files[0].path)}&per_page=5&sha=${encodeURIComponent(meta.branch)}${author}`, []);
      x.m.commits = list.filter(goodCommit).map(toCommit);
    });
    // 근거 커밋·PR 이 없으면: 내 레포의 뚜렷한 코드만 남긴다 (팀 레포에서 다른 사람이 쓴 코드가 내 경험이 되지 않게)
    const rows = found.filter((x) => has(x) || (meta.personal && (x.rule.pri || 2) > 1));
    const w = (x) => (x.m.prs.length ? 4 : 0) + Math.min(3, x.m.commits.length) + (x.conf === 'high' ? 2 : 0) + (x.rule.pri || 2);
    rows.sort((a, b) => w(b) - w(a));
    const perCat = {}; const used = new Set(); const ruleDrafts = [];
    rows.forEach((x) => {
      if ((perCat[x.rule.cat] || 0) >= 2) return; perCat[x.rule.cat] = (perCat[x.rule.cat] || 0) + 1;
      const lead = x.m.prs.find((p) => !used.has(p.number)) || null; if (lead) used.add(lead.number);
      const prs = lead ? [lead].concat(x.m.prs.filter((p) => p !== lead)) : x.m.prs;
      ruleDrafts.push({ w: w(x), d: makeDraft(meta, x.rule.id, { title: x.title, act: x.act, files: x.files, commits: x.m.commits, prs, keywords: CAT_KW[x.rule.cat], lead }) });
    });
    // 코드 규칙에 걸리지 않은 의미 있는 PR
    const prW = (p, k) => KINDS[k] + Math.min(3, cleanBody(p.body).trim().length / 150) + (p.merged ? 1 : 0);
    const prDrafts = history.prs.filter((p) => !used.has(p.number)).map((p) => ({ p, k: kindOf(p.title) })).filter((x) => x.k && cleanTitle(x.p.title).length >= 6)
      .sort((a, b) => prW(b.p, b.k) - prW(a.p, a.k)).slice(0, MAX_DRAFTS)
      .map(({ p, k }) => ({ w: prW(p, k), d: makeDraft(meta, `pr-${p.number}`, { title: cleanTitle(p.title), act: '', files: [], commits: commitsOfPr(p, history.commits), prs: [p], keywords: KIND_KW[k], lead: p }) }));
    // PR 을 쓰지 않는 레포면 커밋에서
    const inRules = new Set(ruleDrafts.flatMap((x) => x.d.evidence.commits.map((c) => c.sha)));
    const cDrafts = history.prs.length ? [] : history.commits.filter((c) => !inRules.has(c.sha)).map((c) => ({ c, k: kindOf(c.message) }))
      .filter((x) => ['perf', 'fix', 'refactor', 'feat'].includes(x.k) && cleanTitle(x.c.message).length >= 10).sort((a, b) => (KINDS[b.k] + (b.c.body ? 2 : 0)) - (KINDS[a.k] + (a.c.body ? 2 : 0))).slice(0, 3)
      .map(({ c, k }) => ({ w: KINDS[k], d: makeDraft(meta, `commit-${c.sha}`, { title: cleanTitle(c.message), act: '', files: [], commits: [c], prs: [], keywords: KIND_KW[k], lead: null }) }));
    // 코드 근거가 있는 초안을 앞에 두되, PR 초안 자리를 남겨 둔다
    const rest = prDrafts.concat(cDrafts); const keep = Math.max(MAX_DRAFTS - rest.length, 5);
    return ruleDrafts.slice(0, keep).concat(rest).slice(0, MAX_DRAFTS).map((x) => x.d);
  }

  /* ---------------- 레포 분석 ---------------- */
  const STEPS = ['레포 정보 불러오는 중', '커밋·PR 읽는 중', '파일 구조 살펴보는 중', '코드 읽는 중', '경험 카드로 정리하는 중'];
  async function analyzeLive(parsed, login, report) {
    report(0);
    const info = await getJson(`/repos/${parsed.owner}/${parsed.name}`);
    const owner = info.owner.login; const name = info.name; const branch = parsed.branch || info.default_branch || 'main';

    report(1);
    const history = await readHistory(owner, name, branch, login);
    report(2);
    const treeRes = await getJson(`/repos/${owner}/${name}/git/trees/${encodeURIComponent(branch)}?recursive=1`);
    const tree = treeRes.tree || [];
    if (!tree.length) throw ghError('empty');
    const picked = pickFiles(tree);

    let done = 0;
    report(3, `${STEPS[3]} (0/${picked.length})`, 0, picked.length);
    await pool(picked, 6, async (f) => {
      f.text = await getRaw(owner, name, branch, f.path);
      f.lines = (f.text || '').split(/\r?\n/);
      done++; report(3, `${STEPS[3]} (${done}/${picked.length})`, done, picked.length);
    });
    const files = picked.filter((f) => f.text != null);

    report(4);
    const ctx = makeCtx(files, deriveStack(files, info.language, tree), tree);
    const meta = { owner, name, branch, full: `${owner}/${name}`, key: keyOf(owner, name), description: info.description || '', login, byAuthor: history.byAuthor, personal: !info.fork && (!login || sameLogin(info.owner, login)) };
    const drafts = await buildDrafts(runRules(files, meta, ctx), history, meta);
    return {
      repo: { owner, name, url: info.html_url, branch, analyzedAt: today(), commits: history.commits.length, prs: history.prs.length },
      drafts, source: 'github',
      // login 의 커밋·PR 이 없어 레포 전체 기록으로 정리했으면 알려 준다
      note: login && !history.byAuthor ? `${login} 계정의 커밋·PR을 찾지 못해 레포 전체 기록으로 정리했어요.` : '',
    };
  }

  // 예시 계정의 레포 (실제로 없는 레포): 네트워크 없이 준비된 초안을 돌려준다
  function sampleOf(owner, name) {
    const s = (window.SEED.repoSamples || {})[keyOf(owner, name)]; if (!s) return null;
    return { repo: Object.assign(clone(s.repo), { analyzedAt: today() }), drafts: clone(s.drafts), source: 'sample', note: '' };
  }
  async function playSample(res, report) {
    const n = 24;
    report(0); await sleep(320); report(1); await sleep(420); report(2); await sleep(300);
    for (let k = 0; k <= n; k += 4) { report(3, `${STEPS[3]} (${k}/${n})`, k, n); await sleep(80); }
    report(4); await sleep(420);
    return res;
  }

  // → { repo:{ owner, name, url, branch, analyzedAt, commits, prs }, drafts:[{ key, title, summary, star, keywords, period?, evidence }], source:'github'|'sample', note }
  async function analyzeRepo(repo, opts = {}) {
    const report = reporter(opts, STEPS);
    const parsed = repo && repo.owner && repo.name ? { owner: repo.owner, name: repo.name, branch: repo.branch } : parseUrl(repo && repo.url);
    if (!parsed) throw ghError('invalid');
    const sample = sampleOf(parsed.owner, parsed.name);
    if (sample) return playSample(sample, report);
    try {
      return await analyzeLive(parsed, opts.login || '', report);
    } catch (e) {
      if (!e.code) { console.warn('[github] analyze failed', e); throw ghError('http'); }
      throw e;
    }
  }

  App.github = { fetchAccount, analyzeRepo, sampleAccount, STEPS, ACCOUNT_STEPS, keyOf };
})(window.App);
