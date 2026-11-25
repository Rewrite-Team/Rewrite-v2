# Rewrite 디자인 가이드

**콘셉트: 흰 종이, 블루블랙 잉크, 형광펜 하나.** 경험을 다시 쓰는 일은 교정 작업이다. 화면은 종이와 잉크로 조용히 두고, 노란 형광펜만 눈에 띈다.

## 1. 형광펜 규칙 (가장 중요)
노란색(`--hl`)의 뜻은 둘뿐이다. **① 내가 고른 것 ② AI가 더한 것.** 이 밖에는 쓰지 않는다.
- 고른 것: 현재 메뉴, `.choice`의 제목, `.exp-card.is-on`의 제목, `.kw.is-match` / `.is-on`
- AI가 더한 것: `.mark`(`<mark>`), `.ai-dot`. 고치기 전후는 `<del>` `<ins>` (빨간 취소선 → 형광펜)
- 버튼·배너·상태 태그·제목 장식에는 쓰지 않는다. 노란색만으로 뜻을 전하지 말고 굵기·체크·테두리를 함께 쓴다.

## 2. 토큰
| 쓰임 | 토큰 |
|---|---|
| 바탕 / 가라앉은 면 / 눌린 면 | `--bg`, `--surface` / `--surface-2` / `--surface-3` |
| 선: 구분 / 또렷한 테두리 / 입력칸 | `--border` / `--border-strong` / `--field-border` |
| 글자: 본문 / 보조 / 흐린 | `--text` / `--text-2` / `--text-3` (셋 다 AA) |
| 잉크(주 버튼·링크·진행) | `--primary`, `--primary-hover`, `--primary-soft`, `--primary-ink` |
| 형광펜 | `--hl`, `--hl-soft` |
| 역량 노드 (경험 그래프에서만) | `--kw`, `--kw-ink`, `--kw-line` |
| 상태 | `--success` `--warn` `--danger` 와 각 `-soft` |
| 모서리 | 버튼·입력 `--radius-sm` 6, 카드·패널 `--radius` 8, 모달 `--radius-lg` 14 |
| 그림자 | 떠 있는 것만: 메뉴·종이 `--shadow`, 모달 `--shadow-lg`. 카드는 그림자 없음 |

## 3. 글자
글꼴은 Pretendard 하나(`--font`). 근거 코드만 고정폭이다.
크기 다섯 개: `--fs-xs` 12(태그·하단 메뉴) · `--fs-sm` 13.5(보조) · `--fs-md` 15(본문) · `--fs-lg` 17(섹션 제목) · `--fs-xl` 24(페이지 제목, 모바일 22).
굵기: 400 본문, 500 조작, 600 이름·버튼, 700 제목. 800은 로고와 `.ai-dot`만. 글 읽는 폭은 64ch 이하.

## 4. 간격과 배치
- 간격: 4 · 8 · 12 · 16 · 20 · 28 · 40. 섹션 사이 40(`.section`), 카드 사이 16(`.grid`), 카드 안 16~20.
- 페이지: `.page`(최대 `--page-w` 1200). 읽고 쓰는 화면은 `.page.page-narrow`(안쪽 폭만 760). 왼쪽 시작선은 어느 화면이나 같다.
- 제목은 한 화면에 `h1` 하나, 한 번만. 상단바는 세 가지: 기본은 숨김(모바일은 로고), `crumb`이 있으면 위로 가는 경로(현재 이름은 넣지 않는다), `bar: true`면 제목과 `actions`(이력서·그래프처럼 화면을 꽉 쓰는 곳). 화면에 붙는 요소는 `--topbar-h`를 기준으로 한다. 주 버튼은 한 화면에 하나.
- 면의 위계: ① 목록은 `.list` ② 묶음·보조는 `.panel` ③ 하나씩 꺼내 쓰는 물건(경험 카드)만 테두리 카드(`.exp-card`, `.card`). 카드 안에 카드 금지.
- 두 단: `.split > div + .split-side` (1100px 아래 한 단, 같은 너비는 `.split-even`). 중단점은 1100 / 900(사이드바 → 하단 메뉴, 조작 44px) / 600(모달이 아래에서 올라옴).

## 5. 컴포넌트
`I = App.icon`. 아이콘 크기는 버튼 안 16, 목록 18, 메뉴 20, 하단 메뉴 22.
```html
<!-- 버튼: btn-primary / btn-ghost / btn-danger, btn-sm / btn-lg / btn-block. 처리 중: 안에 .spinner + disabled -->
<button class="btn btn-primary">${I('plus',16)}새 프로젝트</button>
<button class="icon-btn" aria-label="더 보기">${I('more')}</button>

<!-- 페이지 머리 -->
<header class="page-head"><div><h1>모여봄</h1><div class="meta"><span>${I('calendar',15)}2026.03 ~ 진행중</span><span>4인 팀</span></div></div>
  <div class="page-head-actions">…</div></header>
<h2 class="section-title">최근 채팅 <span class="count">3</span><a class="more" href="#">전체 보기</a></h2>

<!-- 경험 카드(색인 카드): 머리칸은 프로젝트와 기간, 줄 아래가 본문. proj-chip 은 어디서나 반드시 보이고, 바탕 없이 글자로만. 고른 카드는 .is-on -->
<article class="exp-card" data-href="#/card/1">
  <div class="exp-card-top"><span class="proj-chip">${I('folder',15)}<span>모여봄</span></span><span class="exp-card-period">2026.10</span><span class="exp-src">${I('github',15)}GitHub</span></div>
  <a class="exp-card-title" href="#/card/1"><span>제목</span></a><div class="exp-card-sum">요약</div>
  <div class="exp-card-kws"><span class="kw is-match">문제 해결력</span><span class="kw">협업능력</span></div></article>

<!-- 목록 (.list-flush 는 위아래 선 없음) -->
<div class="list"><a class="list-row" href="#">${I('chat')}<span class="list-row-main"><span class="list-row-title">제목</span><span class="list-row-sub">설명</span></span><span class="list-row-actions">어제</span></a></div>

<!-- 메뉴: aria-expanded="true" 일 때 열린다. .menu-up 위로, .menu-left 왼쪽 맞춤. Esc·바깥 클릭으로 닫기 -->
<div class="menu"><button class="icon-btn" aria-haspopup="menu" aria-expanded="false" aria-label="더 보기">${I('more')}</button>
  <div class="menu-list"><button>${I('edit')}이름 바꾸기</button><hr><button class="is-danger">${I('trash')}휴지통으로 옮기기</button></div></div>

<div class="seg"><button class="seg-btn is-on" aria-pressed="true">프로젝트</button><button class="seg-btn" aria-pressed="false">전체 카드</button></div>
<div class="tabs" role="tablist"><a class="tab is-on" role="tab" aria-selected="true">역량</a><a class="tab" role="tab">자소서</a></div>

<!-- 고르기: input:checked 이면 저절로 켜진다 (.is-on 도 같음) -->
<label class="choice"><input type="checkbox"><span class="choice-main"><span class="choice-title">slack-bot</span><span class="choice-sub">커밋 40개</span></span></label>
<!-- 폼 -->
<div class="field"><label class="label" for="em">이메일</label><input id="em" class="input" aria-invalid="true" aria-describedby="em-e">
  <p class="field-error" id="em-e">${I('warning',15)}이메일 주소를 끝까지 입력해 주세요.</p></div>
<div class="input-icon">${I('search',16)}<input class="input" placeholder="카드 검색"></div>
<label class="switch"><input type="checkbox" aria-label="이력서에 포함"><span></span></label>

<span class="chip"><span>Spring Boot</span><button class="chip-x" aria-label="Spring Boot 지우기">${I('close',14)}</button></span>
<span class="tag tag-ongoing">진행중</span> <!-- 끝난 프로젝트는 기간으로 알 수 있어 표시하지 않는다. tag-done tag-warn tag-danger --> <span class="dot" data-status="preparing"></span> <!-- applied passed failed -->
<div class="banner banner-warn" role="status">${I('warning')}<span>저장하지 않은 문장이 있어요.</span><button class="btn btn-sm">저장</button></div>
<ol class="steps"><li class="is-done">커밋 읽기</li><li class="is-now">STAR 초안 쓰기</li><li>역량 고르기</li></ol>
<div class="empty"><div class="empty-title">아직 경험 카드가 없어요</div><p>AI와 이야기하면 첫 카드가 만들어져요.</p><button class="btn btn-primary">대화 시작하기</button></div>

<!-- 로그인: 모바일에서는 auth-form 만 -->
<div class="auth"><div class="auth-brand"><a class="brand">…</a><p class="auth-demo"><del>전</del>후 <ins>강조</ins></p><p class="auth-lead">설명</p></div>
  <form class="auth-form"><a class="brand">…</a><h1>로그인</h1>.field… <button class="btn btn-primary btn-lg btn-block">로그인</button><p class="auth-alt">처음이신가요? <a class="link">회원가입</a></p></form></div>

<!-- 사이드바 / 하단 메뉴: 글자는 꼭 .nav-label 로 감싼다 -->
<a class="nav-item active" aria-current="page"><span class="ico">${I('wiki',20)}</span><span class="nav-label">경험 위키</span></a>
<a class="btn sidebar-link"><span class="ico">${I('trash',20)}</span><span class="nav-label">휴지통</span><span class="sidebar-count">2</span></a>
<div class="menu menu-up"><button class="account" aria-haspopup="menu" aria-expanded="false"><span class="avatar">김</span><span class="account-text"><span class="account-name">김준호</span><span class="account-email">…</span></span>${I('more')}</button><div class="menu-list">…</div></div>
```
그 밖에: `.paper`(이력서, h1~h3·ul), `.modal-lg`, `.spinner`, `.skeleton`, `.progress`, `.link`, `.truncate`, `.divider`, `.sr-only`, `.hide-mobile`, `.row-wrap`, `.spacer`.

## 6. 한다 / 하지 않는다
- 한다: 토큰과 공용 클래스를 먼저 쓰고 화면 CSS에는 배치만. 아이콘 버튼에는 `aria-label`. 빈 화면에는 다음 행동 하나. 버튼 이름과 결과 알림의 말을 맞춘다(저장 → 저장했어요).
- 하지 않는다: 색 값 직접 쓰기, 유니코드 기호·이모지 아이콘, 가운뎃점으로 잇는 정보(`.meta` 사용), 버튼 끝 화살표, 번호 붙인 묶음 이름, 대문자 라벨, 제목 위 작은 라벨, 왼쪽 색 띠, 그라데이션, 떠오르는 hover, 역량마다 다른 색, 같은 정보 두 번, 제목을 줄표로 잇기(「무엇 — 무엇」).
