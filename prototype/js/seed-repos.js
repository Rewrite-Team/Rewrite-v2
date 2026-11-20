/* 시드: 프로젝트에 연결된 깃허브 레포 분석 결과 (window.SEED.projects[*].repo). 담당: 레포 분석
   example/* 레포는 실제로 없는 예시예요. 근거 코드의 줄 번호·링크 형식은 실제 분석 결과와 같다. */
(function (SEED) {
  // 근거 하나: code 의 줄 수로 end 를 계산하고 GitHub blob 링크(#Lstart-Lend)를 만든다. hl = 강조할 줄 번호(절대값)
  const evidence = (repo, path, start, code, hl) => {
    const lines = code.replace(/^\n/, '').replace(/\s+$/, '').split('\n');
    const end = start + lines.length - 1;
    return { path, start, end, code: lines.join('\n'), url: `https://github.com/${repo}/blob/main/${path}#L${start}-L${end}`, hl: hl || [start] };
  };

  /* ---------------- p1 「모여봄」 ---------------- */
  const M = 'example/moyeobom';
  const J = 'src/main/java/com/moyeobom';
  const moyeobom = {
    url: 'https://github.com/example/moyeobom', owner: 'example', name: 'moyeobom', branch: 'main', source: 'sample', analyzedAt: '2026-11-18', filesRead: 26,
    meta: { description: '동네 기반 소모임 매칭 서비스 「모여봄」 백엔드', stars: 12, languages: { Java: 94.6, Shell: 2.9, Dockerfile: 2.5 }, topics: ['spring-boot', 'jpa', 'redis', 'bootcamp'] },
    stack: ['Java', 'Spring Boot', 'JPA', 'Spring Security', 'JWT', 'MySQL', 'Redis', 'Swagger', 'JUnit5', 'Testcontainers', 'Docker', 'GitHub Actions'],
    findings: [
      {
        id: 'gf_p1_1', category: '성능', title: '검색 API N+1 문제를 fetch join으로 해결', confidence: 'high', status: 'added',
        bullet: '모임 검색 API의 N+1 쿼리를 fetch join과 검색 조건 인덱스로 개선해 평균 응답시간 1.8s→0.3s로 단축',
        detail: '모임 목록을 불러올 때 주최자·지역을 지연 로딩하면서 모임 수만큼 추가 쿼리가 나가던 부분을 한 번의 조인 쿼리로 묶었어요. 면접에서는 "N+1을 어떻게 발견했는지(쿼리 로그)", "컬렉션 fetch join과 페이징을 같이 쓰면 생기는 문제"를 자주 물어요. 1.8s→0.3s 는 프로젝트 기록(10/2)에 남긴 수치예요.',
        tags: ['JPA', 'MySQL'],
        evidence: [
          evidence(M, `${J}/meeting/repository/MeetingRepository.java`, 18, `
    @Query("select distinct m from Meeting m " +
           "join fetch m.host h " +
           "join fetch m.region r " +
           "where r.code = :regionCode " +
           "and m.category = :category " +
           "and m.status = 'RECRUITING' " +
           "order by m.startAt asc")
    List<Meeting> searchWithHostAndRegion(@Param("regionCode") String regionCode,
                                          @Param("category") MeetingCategory category);`, [19, 20]),
          evidence(M, `${J}/meeting/domain/Meeting.java`, 14, `
@Entity
@Table(name = "meeting", indexes = {
        @Index(name = "idx_meeting_region_category_start", columnList = "region_id, category, start_at")
})
public class Meeting extends BaseTimeEntity {`, [16]),
        ],
      },
      {
        id: 'gf_p1_2', category: '성능', title: 'Redis 캐시로 인기 모임 목록 조회 개선', confidence: 'high', status: 'added',
        bullet: '홈 화면 인기 모임 목록에 Redis 캐시(@Cacheable, TTL 5분)를 적용해 조회 API 응답시간 ○○ms→○○ms로 단축',
        detail: '모든 사용자가 들어오자마자 부르는 인기 모임 목록을 지역별로 캐시하고, 모임이 새로 생기거나 마감되면 캐시를 비우도록(@CacheEvict) 했어요. "왜 이 데이터를 캐시했는지", "캐시와 DB가 어긋나면 어떻게 하는지"를 준비해 두세요. 전후 응답시간은 코드만으로 알 수 없어서 ○○로 비워 뒀어요.',
        tags: ['Redis', 'Spring Cache'],
        evidence: [
          evidence(M, `${J}/meeting/service/PopularMeetingService.java`, 22, `
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
          evidence(M, `${J}/global/config/RedisConfig.java`, 27, `
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
      },
      {
        id: 'gf_p1_3', category: '인증·보안', title: 'JWT + Spring Security 인증 구현', confidence: 'high', status: 'new',
        bullet: 'Spring Security 필터 체인에 JWT 인증 필터와 Refresh Token 재발급을 구성해 모바일 확장을 고려한 무상태(stateless) 인증 구현',
        detail: '세션 대신 JWT를 고른 이유는 프로젝트 기록(9/19)에 남아 있어요. 면접에서는 "Access/Refresh Token 만료 시간을 어떻게 정했는지", "토큰이 탈취되면 어떻게 대응하는지", "필터가 어느 시점에 동작하는지"를 자주 물어요.',
        tags: ['JWT', 'Spring Security'],
        evidence: [
          evidence(M, `${J}/global/security/SecurityConfig.java`, 31, `
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
          evidence(M, `${J}/global/security/JwtAuthenticationFilter.java`, 20, `
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
          evidence(M, `${J}/global/security/JwtTokenProvider.java`, 41, `
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
      },
      {
        id: 'gf_p1_4', category: '데이터', title: '모임 참여 정원 초과를 비관적 락으로 방지', confidence: 'high', status: 'new',
        bullet: '모임 참여 시 비관적 락(SELECT … FOR UPDATE)으로 동시 참여 요청을 순서대로 처리해 정원 초과 참여 ○건→0건으로 방지',
        detail: '정원이 1자리 남은 모임에 여러 명이 동시에 참여하면 둘 다 통과할 수 있는 경쟁 조건을 막는 코드예요. "낙관적 락 대신 비관적 락을 고른 이유(충돌이 잦은 인기 모임)", "락 대기 시간·데드락"을 물어볼 수 있어요. 동시성 테스트 결과가 있다면 ○건 자리에 채워 주세요.',
        tags: ['JPA', 'MySQL'],
        evidence: [
          evidence(M, `${J}/meeting/repository/MeetingRepository.java`, 30, `
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints({@QueryHint(name = "jakarta.persistence.lock.timeout", value = "3000")})
    @Query("select m from Meeting m where m.id = :id")
    Optional<Meeting> findByIdForUpdate(@Param("id") Long id);`, [30]),
          evidence(M, `${J}/participation/service/ParticipationService.java`, 26, `
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
      },
      {
        id: 'gf_p1_5', category: '인프라·배포', title: 'GitHub Actions CI/CD + Docker Compose 배포', confidence: 'high', status: 'new',
        bullet: 'GitHub Actions로 테스트·Docker 이미지 빌드·EC2 배포를 자동화하고 Docker Compose로 앱·MySQL·Redis 환경을 구성해 배포 시간 ○○분→○분으로 단축',
        detail: 'main 브랜치에 머지되면 테스트 → 이미지 빌드·푸시 → 서버에서 compose 재시작까지 자동으로 돌아가요. "배포 중 장애가 나면 어떻게 되는지", "환경 변수·비밀 값을 어떻게 관리했는지"를 준비해 두세요. 배포 시간은 직접 채워 주세요.',
        tags: ['GitHub Actions', 'Docker'],
        evidence: [
          evidence(M, '.github/workflows/deploy.yml', 14, `
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
          evidence(M, 'docker-compose.yml', 1, `
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
      },
      {
        id: 'gf_p1_6', category: '테스트', title: 'Testcontainers 통합 테스트 구성', confidence: 'high', status: 'new',
        bullet: 'Testcontainers(MySQL) 기반 통합 테스트로 검색·참여 API를 운영과 같은 DB 환경에서 검증해 배포 후 쿼리 오류 방지',
        detail: 'H2 대신 실제 MySQL 컨테이너로 테스트를 돌려 운영 DB와의 문법·동작 차이를 없앴어요. "테스트 속도는 어떻게 관리했는지", "단위·통합 테스트를 어떤 기준으로 나눴는지"를 물어볼 수 있어요. 테스트 파일 수나 커버리지를 알고 있다면 함께 적어 주세요.',
        tags: ['JUnit5', 'Testcontainers'],
        evidence: [
          evidence(M, 'src/test/java/com/moyeobom/meeting/MeetingSearchIntegrationTest.java', 17, `
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
      },
      {
        id: 'gf_p1_7', category: '협업·품질', title: '공통 예외 처리로 일관된 에러 응답', confidence: 'high', status: 'new',
        bullet: '@RestControllerAdvice 전역 예외 처리와 ErrorCode 체계로 에러 응답 형식을 통일해 프론트의 에러 분기 처리 단순화',
        detail: '에러마다 응답 모양이 달라 프론트가 고생하던 문제를 공통 형식(code, message)으로 정리한 코드예요. "에러 코드를 어떻게 설계했는지", "예상 못 한 예외는 어떻게 처리하는지"를 물어볼 수 있어요.',
        tags: [],
        evidence: [
          evidence(M, `${J}/global/error/GlobalExceptionHandler.java`, 12, `
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusiness(BusinessException e) {
        ErrorCode code = e.getErrorCode();
        return ResponseEntity.status(code.getStatus()).body(ErrorResponse.of(code));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException e) {
        return ResponseEntity.badRequest().body(ErrorResponse.of(ErrorCode.INVALID_INPUT, e.getBindingResult()));
    }
}`, [12, 15]),
        ],
      },
      {
        id: 'gf_p1_8', category: '협업·품질', title: 'Swagger(OpenAPI)로 API 명세 먼저 합의', confidence: 'high', status: 'new',
        bullet: 'springdoc-openapi로 API 명세를 코드에서 자동 생성하고, 구현 전에 프론트와 명세를 먼저 합의하는 규칙을 도입해 응답 형식 변경으로 인한 재작업 감소',
        detail: '경험 카드 「API 명세 먼저 합의하기」와 이어지는 코드 근거예요. 협업 과정(누가 언제 명세를 합의했는지)과 함께 쓰면 기술+협업 역량을 같이 보여줄 수 있어요.',
        tags: ['Swagger'],
        evidence: [
          evidence(M, `${J}/meeting/controller/MeetingController.java`, 24, `
    @Operation(summary = "모임 검색", description = "지역·카테고리로 모집 중인 모임을 검색합니다.")
    @ApiResponse(responseCode = "200", description = "검색 성공")
    @GetMapping("/search")
    public ApiResult<List<MeetingSummaryResponse>> search(@RequestParam String regionCode,
                                                          @RequestParam MeetingCategory category) {
        return ApiResult.ok(meetingSearchService.search(regionCode, category));
    }`, [24]),
          evidence(M, 'build.gradle', 31, `
    implementation 'org.springframework.boot:spring-boot-starter-data-redis'
    implementation 'org.springdoc:springdoc-openapi-starter-webmvc-ui:2.6.0'
    implementation 'io.jsonwebtoken:jjwt-api:0.12.6'`, [32]),
        ],
      },
    ],
  };

  /* ---------------- p3 「빈강의실」 ---------------- */
  const E = 'example/empty-classroom';
  const K = 'src/main/java/kr/ac/emptyclassroom';
  const emptyClassroom = {
    url: 'https://github.com/example/empty-classroom', owner: 'example', name: 'empty-classroom', branch: 'main', source: 'sample', analyzedAt: '2026-11-14', filesRead: 19,
    meta: { description: '캡스톤 디자인 — 빈 강의실 찾기 & 예약 웹앱', stars: 5, languages: { Java: 71.8, TypeScript: 24.6, Dockerfile: 3.6 }, topics: ['capstone', 'spring-boot'] },
    stack: ['Java', 'Spring Boot', 'JPA', 'MySQL', 'PDFBox', 'React', 'TypeScript', 'JUnit5', 'Docker', 'Nginx'],
    findings: [
      {
        id: 'gf_p3_1', category: '데이터', title: '유니크 제약 + 낙관적 락으로 중복 예약 방지', confidence: 'high', status: 'new',
        bullet: '강의실·날짜·교시 유니크 제약과 낙관적 락(@Version)으로 동시 예약 충돌을 차단해 시범 운영 2주간 예약 120건 중 중복 예약 0건 달성',
        detail: '경험 카드 「중복 예약 버그 해결」의 코드 근거예요. 애플리케이션 검증만으로는 동시 요청을 막을 수 없어 DB 제약을 최종 방어선으로 두고, 충돌이 나면 사용자에게 다시 고르도록 안내했어요. "왜 비관적 락이 아니라 낙관적 락인지"를 꼭 준비해 두세요.',
        tags: ['JPA', 'MySQL'],
        evidence: [
          evidence(E, `${K}/reservation/domain/Reservation.java`, 11, `
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
          evidence(E, `${K}/reservation/service/ReservationService.java`, 34, `
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
      },
      {
        id: 'gf_p3_2', category: '테스트', title: '동시 예약 재현 테스트', confidence: 'high', status: 'new',
        bullet: 'ExecutorService·CountDownLatch로 같은 강의실·시간에 10건을 동시에 예약하는 재현 테스트를 작성해 동시성 버그를 배포 전에 검증',
        detail: '"동시성 문제는 재현 테스트부터"라는 배운 점과 이어지는 코드예요. 멀티스레드 테스트를 어떻게 설계했는지, 테스트가 가끔만 실패하는 문제(flaky)를 어떻게 다뤘는지 물어볼 수 있어요.',
        tags: ['JUnit5'],
        evidence: [
          evidence(E, 'src/test/java/kr/ac/emptyclassroom/reservation/ReservationConcurrencyTest.java', 28, `
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
      },
      {
        id: 'gf_p3_3', category: '데이터', title: '시간표 PDF 파싱으로 강의실 데이터 자동 적재', confidence: 'mid', status: 'new',
        bullet: '학과 시간표 API가 없어 PDFBox로 시간표 PDF를 파싱해 강의실 사용 정보 ○○건을 자동 적재, 학기마다 수작업 입력 없이 재사용',
        detail: '프로젝트 기록(3/24)의 "PDF 시간표 파싱" 결정과 이어지는 코드예요. 파싱 실패(표 형식이 바뀌는 경우)를 어떻게 검증했는지 물어볼 수 있어요. 적재 건수는 직접 채워 주세요.',
        tags: ['PDFBox'],
        evidence: [
          evidence(E, `${K}/timetable/TimetablePdfParser.java`, 25, `
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
      },
      {
        id: 'gf_p3_4', category: '성능', title: '빈 강의실 검색 쿼리와 복합 인덱스', confidence: 'mid', status: 'new',
        bullet: '빈 강의실 검색에 not exists 서브쿼리와 (강의실, 날짜, 교시) 복합 인덱스를 적용해 검색 응답시간 ○○ms→○○ms로 단축',
        detail: '예약·수업이 없는 강의실만 한 번의 쿼리로 찾는 코드예요. 인덱스 컬럼 순서를 어떻게 정했는지 설명할 수 있으면 좋아요. 전후 수치는 코드에 없어서 ○○로 비워 뒀어요.',
        tags: ['MySQL'],
        evidence: [
          evidence(E, `${K}/classroom/repository/ClassroomRepository.java`, 15, `
    @Query("select c from Classroom c where c.building = :building " +
           "and not exists (select r from Reservation r where r.classroom = c " +
           "    and r.reservedDate = :date and r.period = :period) " +
           "and not exists (select l from LectureSlot l where l.room = c.roomNo " +
           "    and l.dayOfWeek = :dow and :period between l.startPeriod and l.endPeriod)")
    List<Classroom> findEmpty(@Param("building") String building, @Param("date") LocalDate date,
                              @Param("period") int period, @Param("dow") DayOfWeek dow);`, [16, 18]),
        ],
      },
      {
        id: 'gf_p3_5', category: '인프라·배포', title: 'Docker Compose + Nginx로 학과 서버 배포', confidence: 'mid', status: 'new',
        bullet: 'Docker Compose와 Nginx 리버스 프록시로 프론트·백엔드·DB를 학과 서버에 배포해 2주간 시범 운영',
        detail: '학과 서버 한 대에 서비스 전체를 올린 구성이에요. HTTPS 적용, 서버 재시작 시 자동 복구 같은 운영 경험이 있었다면 함께 적어 주세요.',
        tags: ['Docker', 'Nginx'],
        evidence: [
          evidence(E, 'docker-compose.yml', 1, `
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
      },
    ],
  };

  const byId = { p1: moyeobom, p3: emptyClassroom };
  (SEED.projects || []).forEach((p) => { if (byId[p.id]) p.repo = byId[p.id]; });
})(window.SEED);
