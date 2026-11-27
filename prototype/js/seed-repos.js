/* 시드: 예시 GitHub 계정(window.SEED.github)과 레포 분석 예시(window.SEED.repoSamples). 담당: 레포 분석
   example · moyeobom-team · cse-capstone · campus-hack 은 실제로 없는 예시예요. 근거(커밋·PR·코드 줄)의 모양은 실제 분석 결과와 같다.
   data.js 바로 다음에 실행되어 프로젝트의 연결 레포(repos), 대화로 만든 카드의 GitHub 근거, 레포에서 만든 카드(g1~g3)를 채운다. */
(function (SEED) {
  const clone = (o) => JSON.parse(JSON.stringify(o));
  // 레포 하나의 예시 분석 결과를 만드는 도우미
  const sample = (owner, name, info, build) => {
    const repo = `${owner}/${name}`; const base = `https://github.com/${repo}`;
    const h = {
      // 코드 근거: code 의 줄 수로 end 를 계산하고 blob 링크(#Lstart-Lend)를 만든다. hl = 강조할 줄 번호(절대값)
      f: (path, start, code, hl) => {
        const lines = code.replace(/^\n/, '').replace(/\s+$/, '').split('\n'); const end = start + lines.length - 1;
        return { path, start, end, code: lines.join('\n'), url: `${base}/blob/main/${path}#L${start}-L${end}`, hl: hl || [start] };
      },
      c: (sha, date, message) => ({ sha, message, date, url: `${base}/commit/${sha}` }),
      pr: (number, date, title) => ({ number, title, date, url: `${base}/pull/${number}` }),
      draft: (rule, d) => {
        const key = `gh:${repo}:${rule}`; const days = d.commits.concat(d.prs).map((x) => x.date).sort();
        return {
          key, title: d.title, summary: d.summary, star: Object.assign({ situation: '', task: '', action: '', result: '' }, d.star), keywords: d.keywords,
          period: { start: days[0].slice(0, 7), end: days[days.length - 1].slice(0, 7) },
          evidence: { repo, keys: [key], commits: d.commits, prs: d.prs, files: d.files },
        };
      },
    };
    return { repo: Object.assign({ owner, name, url: base, branch: 'main' }, info), drafts: build ? build(h) : [] };
  };

  /* ---------------- 모여봄 백엔드 (p1) ---------------- */
  const J = 'src/main/java/com/moyeobom';
  const moyeobom = sample('moyeobom-team', 'moyeobom-backend', { analyzedAt: '2026-11-18', commits: 87, prs: 34 }, ({ f, c, pr, draft }) => [
    draft('jpa_fetch_join', {
      title: '검색 API N+1을 fetch join으로 해결', keywords: ['문제 해결력', '분석적 사고'],
      summary: '모임 검색에서 주최자·지역을 모임 수만큼 다시 조회하던 쿼리를 fetch join으로 묶고 검색 조건 인덱스를 추가했다.',
      star: {
        situation: '모임 목록을 불러올 때 주최자·지역이 지연 로딩되어 모임 수만큼 추가 쿼리가 나가고 있었음.',
        task: '「검색 API N+1 문제 해결」(PR #31) 작업을 맡음.',
        action: 'MeetingRepository의 검색 쿼리에 fetch join을 적용해 주최자·지역을 한 번에 조회하게 하고, Meeting에 (region_id, category, start_at) 복합 인덱스를 추가함.',
      },
      commits: [c('a1f4c2e', '2026-10-02', 'fix: 모임 검색 N+1을 fetch join으로 해결'), c('7be09d1', '2026-10-02', 'perf: 지역·카테고리·시작일 복합 인덱스 추가'), c('5c3a8f0', '2026-10-03', 'fix: 컬렉션 조회는 batch size로 분리')],
      prs: [pr(31, '2026-10-03', '검색 API N+1 문제 해결 및 인덱스 추가')],
      files: [
          f(`${J}/meeting/repository/MeetingRepository.java`, 18, `
    @Query("select distinct m from Meeting m " +
           "join fetch m.host h " +
           "join fetch m.region r " +
           "where r.code = :regionCode " +
           "and m.category = :category " +
           "and m.status = 'RECRUITING' " +
           "order by m.startAt asc")
    List<Meeting> searchWithHostAndRegion(@Param("regionCode") String regionCode,
                                          @Param("category") MeetingCategory category);`, [19, 20]),
          f(`${J}/meeting/domain/Meeting.java`, 14, `
@Entity
@Table(name = "meeting", indexes = {
        @Index(name = "idx_meeting_region_category_start", columnList = "region_id, category, start_at")
})
public class Meeting extends BaseTimeEntity {`, [16]),
      ],
    }),
    draft('spring_cache', {
      title: 'Redis 캐시로 인기 모임 목록 조회 개선', keywords: ['문제 해결력', '의사결정 능력'],
      summary: '홈에서 매번 불리는 인기 모임 목록을 지역별로 Redis에 캐시하고, 모임이 바뀌면 캐시를 비우게 했다.',
      star: {
        situation: '홈 화면에 들어올 때마다 인기 모임 목록을 DB에서 다시 조회하고 있었음.',
        task: '「인기 모임 목록 캐시 적용」(PR #42) 작업을 맡음.',
        action: '인기 모임 조회에 @Cacheable을 적용해 지역 코드별로 Redis에 캐시하고 TTL을 5분으로 설정함. 모임이 새로 생기거나 마감되면 @CacheEvict로 해당 지역 캐시를 비우게 함.',
      },
      commits: [c('e90b7d4', '2026-10-13', 'feat: RedisCacheManager 설정 추가 (TTL 5분)'), c('2f61ac8', '2026-10-13', 'perf: 인기 모임 목록 지역별 캐시 적용'), c('b47d0e3', '2026-10-14', 'fix: 모임 생성·마감 시 인기 모임 캐시 비우기')],
      prs: [pr(42, '2026-10-14', '인기 모임 목록 캐시 적용')],
      files: [
          f(`${J}/meeting/service/PopularMeetingService.java`, 22, `
    @Cacheable(value = "popularMeetings", key = "#regionCode")
    @Transactional(readOnly = true)
    public List<MeetingSummaryResponse> getPopularMeetings(String regionCode) {
        return meetingRepository.findTop10ByRegionCodeOrderByParticipantCountDesc(regionCode)
                .stream()
                .map(MeetingSummaryResponse::from)
                .toList();
    }

    @CacheEvict(value = "popularMeetings", key = "#regionCode")
    public void evictPopularMeetings(String regionCode) {
    }`, [22, 31]),
          f(`${J}/global/config/RedisConfig.java`, 27, `
    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(5))
                .serializeKeysWith(SerializationPair.fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(SerializationPair.fromSerializer(new GenericJackson2JsonRedisSerializer()));
        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(config)
                .build();
    }`, [28, 30]),
      ],
    }),
    draft('jwt_security', {
      title: 'JWT + Refresh Token 인증 구현', keywords: ['의사결정 능력', '실행력'],
      summary: 'Spring Security 필터 체인에 JWT 인증 필터와 Refresh Token 재발급을 구성했다.',
      star: {
        situation: '팀 프로젝트 초기에 로그인·인증 구조를 만들어야 했음.',
        task: '「JWT 로그인 및 토큰 재발급」(PR #9) 작업을 맡음.',
        action: '세션을 쓰지 않는 STATELESS 설정에 JWT 인증 필터를 추가하고, 저장해 둔 Refresh Token과 일치할 때만 새 토큰을 발급하게 함.',
      },
      commits: [c('3d8e5a1', '2026-09-17', 'feat: JwtTokenProvider, 인증 필터 추가'), c('c06f2b9', '2026-09-18', 'feat: Refresh Token Redis 저장 및 재발급'), c('91ab47c', '2026-09-19', 'fix: 재발급 시 기존 Refresh Token 교체')],
      prs: [pr(9, '2026-09-19', 'JWT 로그인 및 토큰 재발급')],
      files: [
          f(`${J}/global/security/SecurityConfig.java`, 31, `
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/**", "/swagger-ui/**", "/v3/api-docs/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/meetings/**").permitAll()
                        .anyRequest().authenticated())
                .addFilterBefore(new JwtAuthenticationFilter(jwtTokenProvider),
                        UsernamePasswordAuthenticationFilter.class)
                .build();
    }`, [32, 35, 40]),
          f(`${J}/global/security/JwtAuthenticationFilter.java`, 20, `
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String token = resolveToken(request);
        if (token != null && jwtTokenProvider.validateToken(token)) {
            Authentication authentication = jwtTokenProvider.getAuthentication(token);
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }
        chain.doFilter(request, response);
    }`, [24, 25]),
          f(`${J}/global/security/JwtTokenProvider.java`, 41, `
    public TokenResponse reissue(String refreshToken) {
        if (!validateToken(refreshToken)) {
            throw new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN);
        }
        Long memberId = Long.valueOf(parseClaims(refreshToken).getSubject());
        String saved = refreshTokenRepository.findByMemberId(memberId)
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN));
        if (!saved.equals(refreshToken)) {
            throw new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN);
        }
        return createTokens(memberId);
    }`, [41, 46]),
      ],
    }),
    draft('pessimistic_lock', {
      title: '모임 정원 초과 참여를 비관적 락으로 방지', keywords: ['문제 해결력', '실행력'],
      summary: '정원이 얼마 남지 않은 모임에 동시에 참여하면 정원을 넘길 수 있는 문제를 비관적 락으로 막고 동시 참여 테스트로 확인했다.',
      star: {
        situation: '정원이 1자리 남은 모임에 여러 명이 동시에 참여하면 정원 확인을 함께 통과할 수 있는 상태였음.',
        task: '「동시 참여 시 정원 초과 방지」(PR #47) 작업을 맡음.',
        action: '참여 처리 때 모임을 비관적 락(PESSIMISTIC_WRITE)으로 조회해 요청을 순서대로 처리하고, 락 대기 시간을 3초로 제한함. 정원 1자리에 동시에 참여하는 테스트를 추가함.',
        result: '동시 참여 테스트에서 정원을 넘는 참여가 저장되지 않는 것을 확인함.',
      },
      commits: [c('60d9f13', '2026-10-20', 'fix: 모임 참여 시 비관적 락 적용'), c('f7a25be', '2026-10-21', 'test: 정원 1자리 동시 참여 테스트 추가 — 1명만 성공')],
      prs: [pr(47, '2026-10-21', '동시 참여 시 정원 초과 방지')],
      files: [
          f(`${J}/meeting/repository/MeetingRepository.java`, 30, `
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints({@QueryHint(name = "jakarta.persistence.lock.timeout", value = "3000")})
    @Query("select m from Meeting m where m.id = :id")
    Optional<Meeting> findByIdForUpdate(@Param("id") Long id);`, [30]),
          f(`${J}/participation/service/ParticipationService.java`, 26, `
    @Transactional
    public ParticipationResponse join(Long meetingId, Long memberId) {
        Meeting meeting = meetingRepository.findByIdForUpdate(meetingId)
                .orElseThrow(() -> new BusinessException(ErrorCode.MEETING_NOT_FOUND));
        if (meeting.isFull()) {
            throw new BusinessException(ErrorCode.MEETING_FULL);
        }
        Participation participation = participationRepository.save(new Participation(meeting, memberId));
        meeting.increaseParticipantCount();
        return ParticipationResponse.from(participation);
    }`, [28, 30]),
      ],
    }),
    draft('api_docs', {
      title: 'Swagger로 API 명세 먼저 공유', keywords: ['협업능력', '커뮤니케이션'],
      summary: '컨트롤러에 OpenAPI 명세를 붙여 구현 전에 프론트와 API 형식을 확인할 수 있게 했다.',
      star: {
        situation: '프론트와 API 응답 형식을 맞춰 가며 개발하고 있었음.',
        task: '「Swagger 명세 우선 작성」(PR #38) 작업을 맡음.',
        action: 'springdoc-openapi를 추가하고 컨트롤러에 @Operation·@ApiResponse 명세를 작성함. 응답 형식을 바꿀 때 명세를 먼저 고치는 규칙을 PR 템플릿에 추가함.',
      },
      commits: [c('d2c71e8', '2026-10-12', 'docs: springdoc-openapi 추가, 검색 API 명세 작성'), c('08fb6a4', '2026-10-15', 'chore: PR 템플릿에 API 명세 변경 항목 추가')],
      prs: [pr(38, '2026-10-15', 'Swagger 명세 우선 작성')],
      files: [
          f(`${J}/meeting/controller/MeetingController.java`, 24, `
    @Operation(summary = "모임 검색", description = "지역·카테고리로 모집 중인 모임을 검색합니다.")
    @ApiResponse(responseCode = "200", description = "검색 성공")
    @GetMapping("/search")
    public ApiResult<List<MeetingSummaryResponse>> search(@RequestParam String regionCode,
                                                          @RequestParam MeetingCategory category) {
        return ApiResult.ok(meetingSearchService.search(regionCode, category));
    }`, [24]),
          f('build.gradle', 31, `
    implementation 'org.springframework.boot:spring-boot-starter-data-redis'
    implementation 'org.springdoc:springdoc-openapi-starter-webmvc-ui:2.6.0'
    implementation 'io.jsonwebtoken:jjwt-api:0.12.6'`, [32]),
      ],
    }),
    draft('pr-63', {
      title: '배포 후 이미지 업로드 500 에러 수정', keywords: ['문제 해결력', '실행력'],
      summary: '운영 설정에 빠져 있던 파일 크기 제한을 추가해 이미지 업로드 500 에러를 고치고 배포 체크리스트를 넣었다.',
      star: {
        situation: '배포 직후 이미지 업로드가 500 에러로 실패함.',
        task: '「이미지 업로드 500 에러 수정」(PR #63) 작업을 맡음.',
        action: '운영 설정(application-prod.yml)에 빠져 있던 multipart 파일 크기 제한을 추가하고, 배포 전에 확인할 설정값 체크리스트 문서를 저장소에 추가함.',
      },
      commits: [c('4e17c9d', '2026-11-10', 'fix: 운영 프로필에 multipart 파일 크기 제한 추가'), c('a83d06f', '2026-11-10', 'docs: 배포 전 설정값 체크리스트 추가')],
      prs: [pr(63, '2026-11-10', '이미지 업로드 500 에러 수정')],
      files: [
          f('src/main/resources/application-prod.yml', 12, `
  servlet:
    multipart:
      max-file-size: 10MB
      max-request-size: 10MB`, [14, 15]),
      ],
    }),
    draft('gh_actions', {
      title: 'GitHub Actions 배포 자동화', keywords: ['실행력', '추진력'],
      summary: 'main에 병합되면 테스트, 이미지 빌드, 서버 배포가 이어지도록 GitHub Actions와 Docker Compose를 구성했다.',
      star: {
        situation: '백엔드·MySQL·Redis를 서버에 함께 올려야 했음.',
        task: '「배포 자동화」(PR #52) 작업을 맡음.',
        action: 'GitHub Actions에서 테스트 → Docker 이미지 빌드·푸시 → EC2의 compose 재시작이 이어지게 하고, 앱·MySQL·Redis를 docker-compose.yml로 정의함.',
      },
      commits: [c('1c5b9e7', '2026-10-27', 'ci: 테스트·이미지 빌드 워크플로 추가'), c('e64a0d2', '2026-10-28', 'ci: EC2 배포 단계 추가'), c('97f3c58', '2026-10-28', 'chore: docker-compose에 redis 추가')],
      prs: [pr(52, '2026-10-28', '배포 자동화 (GitHub Actions + Docker Compose)')],
      files: [
          f('.github/workflows/deploy.yml', 14, `
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '17'
      - name: Test
        run: ./gradlew test
      - name: Build & push image
        run: |
          docker build -t \${{ secrets.DOCKER_REPO }}/moyeobom:\${{ github.sha }} .
          docker push \${{ secrets.DOCKER_REPO }}/moyeobom:\${{ github.sha }}
      - name: Deploy to EC2
        uses: appleboy/ssh-action@v1
        with:
          host: \${{ secrets.EC2_HOST }}
          script: cd ~/moyeobom && IMAGE_TAG=\${{ github.sha }} docker compose up -d`, [14, 21, 27]),
          f('docker-compose.yml', 1, `
services:
  app:
    image: \${DOCKER_REPO}/moyeobom:\${IMAGE_TAG}
    ports: ["8080:8080"]
    env_file: .env
    depends_on: [mysql, redis]
  mysql:
    image: mysql:8.0
    volumes: ["mysql-data:/var/lib/mysql"]
  redis:
    image: redis:7-alpine`, [1]),
      ],
    }),
    draft('spring_test', {
      title: 'Testcontainers로 검색·참여 통합 테스트 구성', keywords: ['실행력'],
      summary: '운영과 같은 MySQL 컨테이너에서 검색·참여 API를 검증하는 통합 테스트를 만들었다.',
      star: {
        situation: '검색·참여 API를 바꿀 때 실제 MySQL에서 동작하는지 확인할 테스트가 필요했음.',
        task: '「검색·참여 통합 테스트 추가」(PR #55) 작업을 맡음.',
        action: 'Testcontainers로 MySQL 8.0 컨테이너를 띄우고, 지역·카테고리 검색이 모집 중인 모임만 돌려주는지 검증하는 테스트를 작성함.',
      },
      commits: [c('bd04e71', '2026-11-02', 'test: Testcontainers(MySQL) 설정 추가'), c('36c8fa5', '2026-11-03', 'test: 모임 검색 통합 테스트 추가')],
      prs: [pr(55, '2026-11-03', '검색·참여 통합 테스트 추가')],
      files: [
          f('src/test/java/com/moyeobom/meeting/MeetingSearchIntegrationTest.java', 17, `
@SpringBootTest
@Testcontainers
class MeetingSearchIntegrationTest {

    @Container
    @ServiceConnection
    static MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0");

    @Autowired MeetingSearchService meetingSearchService;

    @Test
    void 지역과_카테고리로_모집중인_모임을_검색한다() {
        List<MeetingSummaryResponse> result = meetingSearchService.search("1168010100", MeetingCategory.SPORTS);
        assertThat(result).extracting("status").containsOnly("RECRUITING");
    }
}`, [17, 18, 21]),
      ],
    }),
  ]);

  /* ---------------- 빈강의실 (p3) ---------------- */
  const K = 'src/main/java/kr/ac/emptyclassroom';
  const classroom = sample('cse-capstone', 'empty-classroom', { analyzedAt: '2026-11-14', commits: 64, prs: 21 }, ({ f, c, pr, draft }) => [
    draft('optimistic_lock', {
      title: '유니크 제약 + 낙관적 락으로 중복 예약 방지', keywords: ['문제 해결력', '의사결정 능력'],
      summary: '같은 강의실·시간에 예약이 두 건 들어가지 않도록 DB 유니크 제약과 버전 필드를 적용했다.',
      star: {
        situation: '같은 강의실·시간에 예약이 두 건 저장되는 문제가 이슈로 올라옴.',
        task: '「중복 예약 방지」(PR #14) 작업을 맡음.',
        action: '(강의실, 날짜, 교시)에 유니크 제약을 걸고 Reservation에 @Version 필드를 추가함. 충돌 예외가 나면 다른 시간을 고르도록 안내하는 예외로 바꿔 돌려줌.',
      },
      commits: [c('5f0a3d9', '2025-05-07', 'fix: 예약 테이블 유니크 제약 추가'), c('c81e46b', '2025-05-08', 'fix: Reservation 버전 필드(낙관적 락) 추가')],
      prs: [pr(14, '2025-05-09', '중복 예약 방지')],
      files: [
          f(`${K}/reservation/domain/Reservation.java`, 11, `
@Entity
@Table(name = "reservation", uniqueConstraints = {
        @UniqueConstraint(name = "uk_classroom_date_period",
                columnNames = {"classroom_id", "reserved_date", "period"})
})
public class Reservation {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    private Long version;`, [13, 21]),
          f(`${K}/reservation/service/ReservationService.java`, 34, `
    @Transactional
    public ReservationResponse reserve(ReservationRequest request, Long studentId) {
        try {
            Reservation saved = reservationRepository.saveAndFlush(request.toEntity(studentId));
            return ReservationResponse.from(saved);
        } catch (DataIntegrityViolationException | ObjectOptimisticLockingFailureException e) {
            throw new DuplicateReservationException("이미 예약된 시간이에요. 다른 시간을 골라 주세요.");
        }
    }`, [39, 40]),
      ],
    }),
    draft('concurrency_test', {
      title: '동시 예약 재현 테스트 작성', keywords: ['분석적 사고', '실행력'],
      summary: '스레드 10개가 같은 강의실·시간을 동시에 예약하는 재현 테스트를 작성했다.',
      star: {
        situation: '동시에 들어온 예약에서 생기는 문제를 눈으로만 확인하고 있었음.',
        task: '「동시 예약 재현 테스트」(PR #13) 작업을 맡음.',
        action: 'ExecutorService와 CountDownLatch로 스레드 10개가 같은 강의실·시간을 예약하게 하고, 한 건만 성공해야 통과하는 테스트를 작성함.',
      },
      commits: [c('ad7c250', '2025-05-06', 'test: 동시 예약 재현 테스트 추가')],
      prs: [pr(13, '2025-05-06', '동시 예약 재현 테스트')],
      files: [
          f('src/test/java/kr/ac/emptyclassroom/reservation/ReservationConcurrencyTest.java', 28, `
    @Test
    void 같은_강의실_같은_시간에_동시에_예약하면_한_건만_성공한다() throws InterruptedException {
        int threads = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch latch = new CountDownLatch(threads);
        AtomicInteger success = new AtomicInteger();

        for (int i = 0; i < threads; i++) {
            long studentId = i + 1;
            executor.submit(() -> {
                try { reservationService.reserve(request, studentId); success.incrementAndGet(); }
                catch (DuplicateReservationException ignored) { }
                finally { latch.countDown(); }
            });
        }
        latch.await();
        assertThat(success.get()).isEqualTo(1);
    }`, [31, 32, 44]),
      ],
    }),
    draft('pr-5', {
      title: '시간표 PDF 파싱으로 강의실 데이터 적재', keywords: ['문제 해결력', '실행력'],
      summary: '시간표 PDF를 PDFBox로 파싱해 강의실 사용 정보를 만드는 파서를 작성했다.',
      star: {
        situation: '시간표 데이터를 PDF 파일로만 구할 수 있었음.',
        task: '「시간표 PDF 파서」(PR #5) 작업을 맡음.',
        action: 'PDFBox로 텍스트를 뽑고 정규식으로 강의실·요일·교시를 읽어 LectureSlot 목록으로 바꾸는 파서를 작성함. 강의실 이름 별칭 표를 추가해 다른 표기를 같은 강의실로 맞춤.',
      },
      commits: [c('70be9f4', '2025-03-26', 'feat: 시간표 PDF 파서 초안'), c('e2d518a', '2025-04-02', 'fix: 강의실 이름 별칭 표 추가')],
      prs: [pr(5, '2025-04-02', '시간표 PDF 파서')],
      files: [
          f(`${K}/timetable/TimetablePdfParser.java`, 25, `
    public List<LectureSlot> parse(InputStream pdf) throws IOException {
        try (PDDocument document = Loader.loadPDF(pdf.readAllBytes())) {
            String text = new PDFTextStripper().getText(document);
            return text.lines()
                    .map(SLOT_PATTERN::matcher)
                    .filter(Matcher::find)
                    .map(m -> new LectureSlot(m.group("room"), DayOfWeek.of(Integer.parseInt(m.group("day"))),
                            Integer.parseInt(m.group("start")), Integer.parseInt(m.group("end"))))
                    .toList();
        }
    }`, [26, 27]),
      ],
    }),
    draft('jpa_index', {
      title: '빈 강의실 검색 쿼리와 복합 인덱스', keywords: ['분석적 사고', '문제 해결력'],
      summary: '수업·예약이 없는 강의실을 한 번의 쿼리로 찾게 하고 예약 테이블에 복합 인덱스를 추가했다.',
      star: {
        situation: '빈 강의실을 찾으려면 수업과 예약을 모두 확인해야 했고, 강의실마다 따로 조회하고 있었음.',
        task: '「빈 강의실 검색 쿼리 개선」(PR #9) 작업을 맡음.',
        action: 'not exists 서브쿼리로 수업·예약이 없는 강의실만 한 번에 찾게 하고, 예약 테이블에 (강의실, 날짜, 교시) 복합 인덱스를 추가함.',
      },
      commits: [c('9a63fd0', '2025-04-15', 'perf: 빈 강의실 검색을 쿼리 한 번으로 변경'), c('0d7b1e6', '2025-04-16', 'perf: 예약 테이블 복합 인덱스 추가')],
      prs: [pr(9, '2025-04-16', '빈 강의실 검색 쿼리 개선')],
      files: [
          f(`${K}/classroom/repository/ClassroomRepository.java`, 15, `
    @Query("select c from Classroom c where c.building = :building " +
           "and not exists (select r from Reservation r where r.classroom = c " +
           "    and r.reservedDate = :date and r.period = :period) " +
           "and not exists (select l from LectureSlot l where l.room = c.roomNo " +
           "    and l.dayOfWeek = :dow and :period between l.startPeriod and l.endPeriod)")
    List<Classroom> findEmpty(@Param("building") String building, @Param("date") LocalDate date,
                              @Param("period") int period, @Param("dow") DayOfWeek dow);`, [16, 18]),
      ],
    }),
    draft('docker_compose', {
      title: 'Docker Compose + Nginx로 학과 서버 배포', keywords: ['실행력'],
      summary: '프론트·백엔드·DB를 Docker Compose로 묶고 Nginx를 앞에 둬 학과 서버에 배포했다.',
      star: {
        situation: '시범 운영을 위해 프론트·백엔드·DB를 학과 서버 한 대에 올려야 했음.',
        task: '「학과 서버 배포 구성」(PR #18) 작업을 맡음.',
        action: 'Nginx·API·MySQL을 docker-compose.yml로 정의하고, Nginx가 프론트 빌드 결과를 내려 주면서 API로 요청을 넘기게 함. API는 멈추면 다시 시작되게 설정함.',
      },
      commits: [c('b5e08c7', '2025-05-26', 'chore: docker-compose, nginx 설정 추가'), c('683fd1a', '2025-05-28', 'fix: API 컨테이너 재시작 정책 추가')],
      prs: [pr(18, '2025-05-28', '학과 서버 배포 구성')],
      files: [
          f('docker-compose.yml', 1, `
services:
  nginx:
    image: nginx:1.25-alpine
    ports: ["80:80"]
    volumes: ["./nginx/default.conf:/etc/nginx/conf.d/default.conf", "./frontend/dist:/usr/share/nginx/html"]
    depends_on: [api]
  api:
    build: ./backend
    restart: unless-stopped
    environment:
      SPRING_PROFILES_ACTIVE: prod
    depends_on: [db]
  db:
    image: mysql:8.0
    volumes: ["db-data:/var/lib/mysql"]`, [1, 9]),
      ],
    }),
  ]);

  /* ---------------- 슬랙봇 (아직 프로젝트에 연결하지 않은 레포) ---------------- */
  const budgetBot = sample('example', 'budget-bot', { analyzedAt: '2026-11-18', commits: 41, prs: 9 }, ({ f, c, pr, draft }) => [
    draft('scheduler', {
      title: '주간 지출 리포트 자동 발송', keywords: ['기획력', '실행력'],
      summary: '매주 월요일 아침 지난주 지출을 분류별로 모아 슬랙 채널에 보내는 작업을 만들었다.',
      star: {
        situation: '지출은 슬랙 메시지로 쌓이지만 한 주 동안 얼마를 썼는지는 직접 세어야 했음.',
        task: '「주간 리포트 자동 발송」(PR #6) 작업을 맡음.',
        action: 'node-cron으로 매주 월요일 9시에 지난주 지출을 분류별로 합산하고, 결과를 채널에 메시지로 보내게 함. 서버 시간대와 상관없이 한국 시간으로 실행되게 시간대를 지정함.',
      },
      commits: [c('d90c4b2', '2026-11-01', 'feat: 주간 지출 집계 쿼리'), c('71fa3e8', '2026-11-02', 'feat: 월요일 9시 주간 리포트 발송'), c('0c8d6f5', '2026-11-03', 'fix: 크론 시간대를 Asia/Seoul로 지정')],
      prs: [pr(6, '2026-11-03', '주간 리포트 자동 발송')],
      files: [
        f('src/jobs/weeklyReport.js', 8, `
cron.schedule('0 9 * * 1', async () => {
  const { rows } = await pool.query(
    \`select category, sum(amount) as total from expenses
     where spent_at >= now() - interval '7 days'
     group by category order by total desc\`);
  await app.client.chat.postMessage({ channel: CHANNEL_ID, text: formatReport(rows) });
}, { timezone: 'Asia/Seoul' });`, [8, 14]),
      ],
    }),
    draft('js_transaction', {
      title: '지출과 정산 내역을 트랜잭션으로 함께 저장', keywords: ['문제 해결력', '실행력'],
      summary: '지출 저장과 사람별 정산 금액 저장을 한 트랜잭션으로 묶어 중간에 실패하면 모두 되돌리게 했다.',
      star: {
        situation: '지출을 저장한 뒤 정산 내역 저장이 실패하면 지출만 남는 경우가 있었음.',
        task: '「지출·정산 저장을 트랜잭션으로 묶기」(PR #4) 작업을 맡음.',
        action: '지출 저장과 사람별 정산 금액 저장을 BEGIN–COMMIT으로 묶고, 중간에 오류가 나면 ROLLBACK한 뒤 사용자에게 다시 입력해 달라고 안내함.',
      },
      commits: [c('58b2e9a', '2026-10-28', 'fix: 정산 저장 실패 시 지출만 남는 문제'), c('f41d07c', '2026-10-29', 'refactor: withTransaction 헬퍼로 분리')],
      prs: [pr(4, '2026-10-29', '지출·정산 저장을 트랜잭션으로 묶기')],
      files: [
        f('src/db/withTransaction.js', 3, `
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}`, [6, 8, 11]),
      ],
    }),
    draft('pr-2', {
      title: '자유롭게 쓴 지출 메시지 해석하기', keywords: ['분석적 사고', '기획력'],
      summary: '"장보기 3만2천"처럼 사람마다 다르게 쓰는 지출 메시지를 금액과 분류로 나누는 파서를 만들고 테스트로 묶었다.',
      star: {
        situation: '지출 메시지가 「32,000원」, 「3만2천」처럼 사람마다 다른 형식으로 들어옴.',
        task: '「지출 메시지 파서」(PR #2) 작업을 맡음.',
        action: '금액 표현을 숫자로 바꾸는 규칙과 낱말로 분류를 고르는 규칙을 나눠 파서를 작성하고, 실제로 들어온 메시지 형식을 Jest 테스트로 추가함.',
      },
      commits: [c('2be74d1', '2026-10-24', 'feat: 지출 메시지 파서'), c('a95f30e', '2026-10-25', 'fix: 만·천 단위 금액 해석'), c('6d1c8b7', '2026-10-25', 'test: 메시지 형식별 파서 테스트 추가')],
      prs: [pr(2, '2026-10-25', '지출 메시지 파서')],
      files: [
        f('src/parser/parseExpense.js', 11, `
function parseAmount(text) {
  const man = text.match(/(\\d+)\\s*만/);
  const chun = text.match(/(\\d+)\\s*천/);
  if (man || chun) return (man ? Number(man[1]) * 10000 : 0) + (chun ? Number(chun[1]) * 1000 : 0);
  const won = text.match(/([\\d,]+)\\s*원?/);
  return won ? Number(won[1].replace(/,/g, '')) : null;
}`, [12, 13]),
        f('test/parseExpense.test.js', 5, `
test.each([
  ['장보기 32,000원', 32000],
  ['장보기 3만2천', 32000],
  ['택시 8천', 8000],
])('%s 의 금액을 읽는다', (text, amount) => {
  expect(parseExpense(text).amount).toBe(amount);
});`, [5, 10]),
      ],
    }),
    draft('request_verify', {
      title: '슬랙 요청 서명 검증', keywords: ['실행력', '학습능력'],
      summary: '슬랙이 보낸 요청인지 서명과 시간을 확인한 뒤에만 지출을 처리하게 했다.',
      star: {
        situation: '봇 주소를 알면 누구나 요청을 보낼 수 있는 상태였음.',
        task: '「슬랙 요청 서명 검증」(PR #8) 작업을 맡음.',
        action: '슬랙 서명(X-Slack-Signature)을 같은 방식으로 계산해 비교하고, 5분이 지난 요청은 거절하는 미들웨어를 추가함.',
      },
      commits: [c('e37a5c9', '2026-11-08', 'feat: 슬랙 요청 서명 검증 미들웨어'), c('14d8f0b', '2026-11-09', 'fix: 5분 지난 요청 거절')],
      prs: [pr(8, '2026-11-09', '슬랙 요청 서명 검증')],
      files: [
        f('src/middleware/verifySlack.js', 4, `
module.exports = function verifySlack(req, res, next) {
  const ts = Number(req.headers['x-slack-request-timestamp']);
  if (Math.abs(Date.now() / 1000 - ts) > 60 * 5) return res.status(400).end();
  const base = \`v0:\${ts}:\${req.rawBody}\`;
  const mine = 'v0=' + crypto.createHmac('sha256', SIGNING_SECRET).update(base).digest('hex');
  const theirs = Buffer.from(req.headers['x-slack-signature'] || '');
  if (theirs.length !== mine.length || !crypto.timingSafeEqual(Buffer.from(mine), theirs)) return res.status(401).end();
  next();
};`, [6, 8, 10]),
      ],
    }),
  ]);

  /* ---------------- 해커톤 · 그 밖의 레포 ---------------- */
  const lostFound = sample('campus-hack', 'lost-found-server', { analyzedAt: '2026-11-18', commits: 23, prs: 3 }, ({ f, c, pr, draft }) => [
    draft('domain_event', {
      title: '분실물 등록 알림을 이메일로 분리', keywords: ['의사결정 능력', '실행력'],
      summary: '분실물이 등록되면 이벤트를 받아 이메일을 보내도록 알림을 등록 처리에서 분리했다.',
      star: {
        situation: '분실물이 등록되면 찾는 사람에게 알려 주는 기능이 필요했음.',
        task: '「등록 알림 이메일로 대체」(PR #3) 작업을 맡음.',
        action: '등록이 끝나면 이벤트를 발행하고, 커밋 이후에 이벤트를 받아 이메일을 보내게 함.',
      },
      commits: [c('8c02da6', '2025-05-18', 'feat: 푸시 알림을 이메일로 대체'), c('f5e93b1', '2025-05-18', 'refactor: 등록 이벤트로 알림 분리')],
      prs: [pr(3, '2025-05-18', '등록 알림 이메일로 대체')],
      files: [
        f('src/main/java/kr/ac/lostfound/item/ItemMailListener.java', 14, `
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onRegistered(ItemRegisteredEvent event) {
        mailSender.send(MailTemplates.registered(event.itemName(), event.seekerEmail()));
    }`, [14, 16]),
      ],
    }),
  ]);
  const plain = [
    sample('moyeobom-team', 'moyeobom-frontend', { analyzedAt: '2026-11-18', commits: 2, prs: 0 }),
    sample('example', 'algorithm-notes', { analyzedAt: '2026-11-18', commits: 58, prs: 0 }),
    sample('example', 'dotfiles', { analyzedAt: '2026-11-18', commits: 12, prs: 0 }),
  ];

  SEED.repoSamples = {};
  [moyeobom, classroom, budgetBot, lostFound].concat(plain).forEach((s) => { SEED.repoSamples[`${s.repo.owner}/${s.repo.name}`.toLowerCase()] = s; });

  /* ---------------- 예시 계정 ---------------- */
  const r = (owner, name, description, language, pushedAt, fork = false) => ({ owner, name, url: `https://github.com/${owner}/${name}`, description, language, pushedAt, fork });
  const board = (org, number, title) => ({ number, title, url: `https://github.com/orgs/${org}/projects/${number}` });
  SEED.github = {
    login: 'example', type: 'user', name: '김준호', url: 'https://github.com/example', source: 'sample', fetchedAt: '2026-11-18',
    owners: [
      { login: 'example', type: 'user', name: '김준호', projects: [], repos: [
        r('example', 'budget-bot', '슬랙 메시지로 공동 생활비를 기록하는 봇', 'JavaScript', '2026-11-09'),
        r('example', 'algorithm-notes', '알고리즘 스터디 풀이 모음', 'Java', '2025-12-18'),
        r('example', 'dotfiles', '개발 환경 설정', 'Shell', '2026-08-30'),
      ] },
      { login: 'moyeobom-team', type: 'org', name: '모여봄 팀', projects: [board('moyeobom-team', 1, '모여봄 스프린트 보드')], repos: [
        r('moyeobom-team', 'moyeobom-backend', '동네 기반 소모임 매칭 서비스 「모여봄」 백엔드', 'Java', '2026-11-17'),
        r('moyeobom-team', 'moyeobom-frontend', '「모여봄」 웹 프론트엔드', 'TypeScript', '2026-11-18'),
      ] },
      { login: 'cse-capstone', type: 'org', name: '컴퓨터공학과 캡스톤', projects: [board('cse-capstone', 4, '빈강의실 일정')], repos: [
        r('cse-capstone', 'empty-classroom', '캡스톤 디자인: 빈 강의실 찾기와 예약 웹앱', 'Java', '2025-06-13'),
      ] },
      { login: 'campus-hack', type: 'org', name: '교내 해커톤', projects: [board('campus-hack', 2, '분실물 찾기 할 일')], repos: [
        r('campus-hack', 'lost-found-server', '24시간 해커톤: 분실물 찾기 서비스', 'Java', '2025-05-18'),
      ] },
    ],
  };

  /* ---------------- 프로젝트 · 카드에 연결 ---------------- */
  const link = (pid, s) => { const p = SEED.projects.find((x) => x.id === pid); if (p) p.repos = [clone(s.repo)]; };
  link('p1', moyeobom); link('p3', classroom);

  const pick = (s, rules) => {
    const list = rules.map((rule) => s.drafts.find((d) => d.key.endsWith(':' + rule))); const all = (k) => clone(list.flatMap((d) => d.evidence[k]));
    return { repo: list[0].evidence.repo, keys: all('keys'), commits: all('commits'), prs: all('prs'), files: all('files') };
  };
  // 대화로 만든 카드에 이어 붙인 GitHub 근거 (keys 가 있어 다시 분석해도 같은 카드를 또 만들지 않는다)
  [['e1', moyeobom, ['jpa_fetch_join']], ['e8', moyeobom, ['api_docs']], ['e10', moyeobom, ['jwt_security']], ['e11', moyeobom, ['pr-63']],
    ['e9', classroom, ['optimistic_lock', 'concurrency_test']], ['e13', classroom, ['pr-5']]].forEach(([id, s, rules]) => {
    const e = SEED.experiences.find((x) => x.id === id); if (e) e.evidence = pick(s, rules);
  });
  // 레포 분석으로 만든 카드
  const card = (id, projectId, role, s, rule, at) => {
    const d = clone(s.drafts.find((x) => x.key.endsWith(':' + rule)));
    return Object.assign(d, { id, projectId, role, retrospect: '', source: 'github', createdAt: at, updatedAt: at });
  };
  SEED.experiences.push(
    card('g1', 'p1', '백엔드', moyeobom, 'spring_cache', '2026-11-18'),
    card('g2', 'p1', '백엔드', moyeobom, 'pessimistic_lock', '2026-11-18'),
    card('g3', 'p3', '백엔드 + 팀장', classroom, 'jpa_index', '2026-11-14'),
  );
  // 레포 분석은 프로젝트마다 대화방 하나에 남는다: 만든 카드 목록을 보여 주는 GitHub 메시지 하나
  [...new Set(['g1', 'g2', 'g3'].map((id) => SEED.experiences.find((x) => x.id === id).projectId))].forEach((projectId) => {
    const made = SEED.experiences.filter((e) => e.projectId === projectId && /^g\d+$/.test(e.id));
    const at = `${made[0].createdAt} 21:00`;
    SEED.chats.push({
      id: 'c_gh_' + projectId, projectId, title: 'GitHub에서 찾은 경험', focus: made[made.length - 1].id, createdAt: at, updatedAt: at,
      msgs: [{ id: 'm_gh_' + projectId + '_1', who: 'ai', at, kind: 'github', text: `경험 카드 ${made.length}장을 만들었어요.`,
        gh: { status: 'done', step: 0, picked: [], drafts: [], madeIds: made.map((e) => e.id), error: '' } }],
    });
  });
})(window.SEED);
