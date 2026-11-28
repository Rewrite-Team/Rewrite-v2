# v1 화면 목록 (그려야 하는 것 전부)

앱(prototype)에서 뽑은 1차 범위의 화면, 상태, 모달, 메뉴, 알림 목록이에요. 마스터 이력서(#/resume)와 지원 기업(#/apply…)은 1차에서 빠져요.
Figma 스크립트(figma/src/screens)는 이 목록을 기준으로 그려요. 화면이나 기능을 바꾸면 이 목록도 함께 고쳐 주세요.

**1차에서 빼는 것 (앱에는 남아 있음)**
- 왼쪽 메뉴의 「마스터 이력서」, 「지원 기업」과 그 아래 기업 목록
- 홈의 「마감이 가까운 지원 기업」
- 카드 화면의 「쓰인 곳」 (이력서, 자소서, 면접에서 쓰인 곳)
- 휴지통의 「지원 기업」 항목, 회원 탈퇴 안내 문구의 「지원 기업, 이력서」

---

Design inventory for the v1 Figma redraw (desktop 1920). Excluded: #/resume and #/apply* (essay and interview). Every path is under /Users/yong/study/rewrite/v2/prototype/js/. Copy is quoted exactly. `「…」` stands for dynamic names.

Common building blocks:
- **Modal** (core.js:621-646): head, body, foot. Buttons are `취소` and `확인` unless overridden. A `danger` modal makes the confirm button btn-danger. A `size:'lg'` variant exists. Backdrop click and Esc close it.
- **Toast** (core.js:606-614): text plus an optional action button. Stays 2.6s, or 6s when it has an action.
- **"Moved to trash" toast** (core.js:616-619): `「title」 항목을 휴지통으로 옮겼어요` + `되돌리기`. Pressing it gives the toast `되돌렸어요`.
- **Menu**: `.menu` wrapping an icon-btn `more` and a `.menu-list`. Danger items use `is-danger`, separators are `<hr>`, and some menus open upward (`menu-up`). Figma: `menuUnder(frame, 단추, items, { up })`.
- **Inline write field** (core.js:599-604): footer is `[extra] [status text] 취소 저장`. `저장` is disabled until something changes, then becomes primary. After saving the status reads `저장했어요`.
- **Experience card tile** (core.js:567-574): project chip, period, optional `GitHub` source tag, title, resume line, keyword chips (matched ones highlighted). Figma: `Card/Index` via `indexCard({ …, match })`.
- **Project chip** (core.js:558-561): folder icon + name. Falls back to `지워진 프로젝트`.
- **Status tag** (core.js:553): `완료` or `진행중`.
- **Period text** (core.js:555): `기간 미입력` when empty. Another formatter, projectPeriod (vault.js:15-19), produces `2026.09부터` or `2025.03 ~ 2025.06`.
- **GitHub evidence block** (core.js:576-596): counts `커밋 N개 / PR N개 / 코드 N곳`. Body shows the repo line (with an `예시` tag for sample repos), then sections `커밋` (sha · message · date rows), `PR` (#n · title · date) and `코드` (path:range header plus a line-numbered code block with highlighted lines). Figma: `Evidence/Row`, `Evidence/Code line` via `evidence()`; the `예시` tag is `Tag` Tone=Neutral.
- **Keyword chips**: 12 fixed competencies, each with a colour tone (data.js:7-18): 문제 해결력, 분석적 사고, 창의력, 기획력, 커뮤니케이션, 의사결정 능력, 리더십, 추진력, 실행력, 도전정신, 학습능력, 협업능력.

---

## 1. Auth and onboarding (full-screen layout, no shell)

**#/login and #/signup** (screens/auth.js; one template, config at :10-13, render at :74-87)
- Two columns:
  - Left (brand side): pitch `편하게 말한 경험이<br>이력서 한 줄이 돼요` plus a sub-paragraph (:77-78). Below it an animated "paper" resume with 3 scenes (모여봄, 알고리즘 스터디, 카페 아르바이트) where a spoken sentence turns into a resume line with a highlight (:22-41).
  - The replay button toggles `건너뛰기` and `다시 보기` (:45).
- Login form: h1 `로그인`, fields 이메일 (placeholder `name@example.com`) and 비밀번호 with an eye toggle (`비밀번호 보기` / `비밀번호 숨기기`).
- Signup form: adds 이름 (placeholder `이름 또는 닉네임`). Password hint reads `8자 이상`.
- Buttons and text below the fields:
  - Primary: `로그인` or `가입하기`. While busy it reads `확인하는 중` or `만드는 중`.
  - Secondary: `예시 계정으로 둘러보기`.
  - Switch link: `아직 계정이 없나요? 회원가입` or `이미 계정이 있나요? 로그인`.
  - Footnote: `프로토타입이라 계정과 데이터는 이 브라우저에만 저장돼요. 다른 곳에서 쓰는 비밀번호는 쓰지 마세요.`
- Field error state: red text with a warning icon under the field (:92-97). Messages (auth.js:32-47):
  - `이름을 적어 주세요.`
  - `이메일 주소를 확인해 주세요.`
  - `비밀번호는 8자 이상이어야 해요.`
  - `이미 가입한 이메일이에요. 로그인해 주세요.`
  - `이메일을 적어 주세요.`
  - `비밀번호를 적어 주세요.`
  - `예시 계정은 아래 버튼으로 들어갈 수 있어요.`
  - `이메일 또는 비밀번호가 맞지 않아요.`
  - Fallback: `문제가 생겼어요. 다시 시도해 주세요.`
- States to draw: login, signup, field errors, busy button.

**#/onboarding** (screens/onboarding.js:28-36). Only new accounts see it; the demo account is already onboarded.
- Header: brand plus a ghost `로그아웃` button. Progress bar: 50% on step 1, 100% on step 2.
- **Step 1** (:6-11):
  - h1 `어떤 일을 준비하고 있나요?`
  - Field `목표 직무 (선택)`, placeholder `예: 백엔드 개발자`.
  - Datalist: 백엔드 개발자, 프론트엔드 개발자, 서비스 기획자, PM/PO, 데이터 분석가, UX/UI 디자이너, 마케터.
  - Button `다음`.
- **Step 2** (:12-18):
  - h1 `첫 프로젝트를 만들어요`
  - Segmented control: `GitHub에서 가져오기` | `직접 만들기`.
  - Footer: `이전`, `나중에 하기`, primary `프로젝트 만들기` (disabled until a repo is picked or a name is typed).
  - Variant 2a, GitHub: embeds the repo picker (see Global G1), in every picker state.
  - Variant 2b, manual: `프로젝트 이름`, placeholder `예: 교내 해커톤, 카페 아르바이트`. Empty name shows `프로젝트 이름을 적어 주세요.` (:56).
- Outcomes: the GitHub path goes to #/vault/p/:id/github. The manual path opens a new chat for that project. `나중에 하기` goes to #/home.

---

## 2. Shell: sidebar, top bar, account (app.js)

**Sidebar** (:34-44)
- Brand `R Rewrite`.
- Nav items: 홈, AI 채팅, 경험 위키, 경험 타임라인, 마스터 이력서, 지원 기업.
- Under 지원 기업 there is a sub-nav listing each active application (demo: 모아페이, 그린로지스, 핏플랜) (:22-25). Draw it even though the apply screens are out of scope.
- Active state. card, projects and projectGithub highlight 경험 위키 (:15).
- Footer: `휴지통` link with a count badge (demo shows 1), then the account button.

**Account button** (:27-33): avatar (first letter), name, email, more icon.

**Account menu** (opens upward from the sidebar): `설정`, `로그아웃`. The compact top-bar copy (mobile only) adds `경험 타임라인` and `휴지통`.

**Top bar variants** (:73-79):
- (a) Crumb: `‹ 경험 위키`. Used on the project page, card detail and the project GitHub page.
- (b) Title bar with an h1. Only the timeline uses it (`bar:true`).
- (c) Hidden on wide screens. All other screens.

**Other shell states**
- Logout toast: `로그아웃했어요` (:91).
- Unknown screen: `화면을 찾을 수 없어요` (:65). Rare.

---

## 3. Home (#/home, screens/home.js)

- **Empty state, no projects** (:7-9): h1 `첫 프로젝트를 만들어 보세요`, text `팀 과제, 동아리, 아르바이트도 프로젝트예요.`, button `+ 새 프로젝트` (opens the New project modal). The apps block can still show below it.
- **Filled state** (:11-12): header h1 `홈`, primary button `AI 채팅 시작`. Then these blocks:
  1. **`꾸준히 기록하기`** (:30-58): one-year contribution grid, 5 shade levels, month and weekday (월/수/금) labels.
     - Streak line: `N일 연속 기록하고 있어요` or `오늘 기록하면 연속 기록이 시작돼요`.
     - Summary: `최근 1년 동안 N일 기록했어요`.
     - Legend: `적게 … 많이`.
     - Nudge: `오늘 기록하면 N+1일째예요.` or `오늘도 기록했어요.`
     - CTA: `오늘의 질문 답하기` (calendar icon), or the done state `✓ 오늘의 질문에 모두 답했어요`.
     - Hover tooltip: `M월 D일 기록 N개` or `기록 없음` (:123).
  2. **`내 역량`** + link `경험 타임라인` (:63-86): radar chart over the 12 competencies. Each axis label shows `N장` (zero is styled differently) and links to #/vault?view=cards&kw=.
     - Hover tooltip: name plus description (:137).
     - Note: `역량마다 그 역량이 담긴 경험 카드 수예요. 이름을 누르면 그 카드들을 볼 수 있어요. 아직 카드가 없는 역량: …`
     - Hidden when there are no cards.
  3. **`이어서 대화하기`** + `전체 보기` (:89-95): the 3 most recent non-daily chats as rows (title + project chip).
  4. **`마감이 가까운 지원 기업`** + `전체 보기` (:99-110): rows with company, job, date and a `D-n` tag (warning style when ≤7 days) or `오늘 마감`. The rows link into the excluded apply screens. Demo: 모아페이 D-2 (warning), 핏플랜 D-14.
- The empty text `아직 채팅이 없어요 / 있었던 일을 AI와 이야기하면…` (:12) is practically unreachable, because the record block always renders.

---

## 4. AI chat (#/chat, #/chat/:room, #/chat/new?…; screens/chat.js, logic in chat.js)

**Layout** (:337): three columns.
- Left: project tree.
- Middle: the room.
- Right: experience card panel. Only present when a project is in context.
- Draggable resize grips between columns (:19-24, tooltip `끌어서 너비를 바꿔요. 두 번 누르면 처음 너비로 돌아가요`).
- On desktop, plain #/chat opens the most recent room (:325).

**Left tree** (:63-79)
- Head: primary `+ 새 채팅` and `새 프로젝트`. With no projects, only `+ 새 프로젝트`.
- Project row: fold chevron, name, GitHub icon (tooltip `GitHub 연결됨`), hover actions (`+` "new chat here", plus the project menu).
- `오늘의 질문` row: pinned first, calendar icon, unread dot when an ongoing project has no answer today (dot tooltip `오늘 아직 답하지 않았어요`). It has no menu (:59-62).
- Chat row: title, time or M/D, menu. Selected state. A temporary `새 채팅` row appears while composing a new chat.
- Other states: `아직 대화방이 없어요`, `N개 더 보기` (5 shown per project), folded project, and with no projects at all `프로젝트를 만들면 바로 이야기를 시작할 수 있어요.`

**Menus**
- **Chat room menu** (:55): `이름 바꾸기` | `휴지통으로 옮기기` (danger). Appears on tree rows and in the room header for non-daily rooms.
- **Project menu in the tree** (:56): `프로젝트 열기`, then `GitHub에서 찾기` (repo linked) or `GitHub 연결` (none), then `휴지통으로 옮기기` (danger).

**Room states (middle column)**
- **Header** (:283-287): back chevron (mobile), project chip link, h1 title, `경험 카드` button (opens the panel when narrow), room menu.
- **Messages** (:234-244):
  - AI bubble with an `R` dot.
  - My bubble.
  - Daily date divider (`오늘` or `M월 D일`).
  - Typing indicator: 3 dots (:276).
  - Floating `새 답변` jump button (:291).
- **Touch chip above an AI reply** (:269-272): card icon, card title, changed fields (e.g. `행동, 결과`). If the card has since been trashed, clicking shows the toast `휴지통으로 옮긴 카드예요` + `휴지통 보기`. If it was deleted outright, the toast is `지워진 카드예요` (:451-456).
- **Link message** (:274): button `GitHub에서 찾기` or `GitHub 연결`.
- **Confirm (permission) message** (:246-263):
  - Diff rows for 제목, 상황, 과제, 행동, 결과, 역량 and 이력서 한 줄. Deleted text is struck through, added text highlighted; a cleared field reads `비움`.
  - Waiting buttons: primary `만들기`, `반영하기` or `휴지통으로 옮기기` (danger), then `항상 허용`, then ghost `거절`.
  - Closed states: `✓ 허용했어요`, `✕ 거절했어요`, `⚠ 반영하지 못했어요`.
- **GitHub analysis message** (:155-173, states listed at chat.js:186):
  - running: repo name, `i / n`, and a 5-step list (Global G3).
  - connect: button.
  - stopped: text `GitHub 레포를 읽다가 멈췄어요.` + `다시 시도`.
  - error: danger banner with the message + `다시 시도`.
  - ready: draft checklist (Global G4); footer `모두 고르기`/`모두 해제` and primary `경험 카드 N장 만들기` (disabled `경험 카드 만들기` when nothing is picked).
  - empty: list of made cards.
  - done: made-cards list with rows of icon, title, project chip, `비어 있는 칸: …` and `카드 보기`; plus `남은 작업 N개 보기`.
- **Composer** (:278-282):
  - Textarea. Placeholder in a room: `이야기를 이어서 적어 주세요`. In the daily room: `오늘의 질문에 답해 주세요. 한 줄이어도 괜찮아요`.
  - Send icon button.
  - Quick row: ghost `GitHub에서 찾기` or `GitHub 연결`, plus the switch `카드 바꾸기 전에 묻기`.
  - Toggling the switch shows a toast: `이제 카드를 바꾸기 전에 물어볼게요` or `이제 묻지 않고 바로 카드에 반영할게요` (:482).

**New chat (#/chat/new) variants** (:295-315)
- (a) **Project picker** (no project in context): h2 `어떤 프로젝트 이야기인가요?`, a list of project rows (folder icon, GitHub icon) and a `+ 새 프로젝트` button. With no projects: h2 `먼저 프로젝트를 만들어 주세요`, text `팀 과제, 동아리, 아르바이트도 프로젝트예요.`, primary `새 프로젝트`.
- (b) **Guide** (project chosen):
  - h2 `있었던 일을 적어 주세요`.
  - Text: `한 줄이어도 괜찮아요. AI가 이 프로젝트의 알맞은 경험 카드를 골라 채우고, 빠진 내용은 물어봐요.`
  - GitHub line: `아래 「GitHub에서 찾기」를 누르면 커밋과 PR에서도 경험을 찾을 수 있어요.` or `GitHub를 연결하면 커밋과 PR에서도 경험을 찾을 수 있어요.`
  - Composer placeholder: `예: 검색 API가 느려서 고쳤어요`.
- (c) **Keyword guide** (?kw=): h2 `「역량」 역량이 드러난 일을 적어 주세요`. The body starts with `<desc>이면 돼요.`
- (d) **Card preselected** (?card=):
  - h2 `「title」 카드에 담을 이야기를 적어 주세요`.
  - Opening line, e.g. `결과는 아직 비어 있어요. …`, or `네 칸이 모두 채워진 카드예요…` (chat.js:199-203).
  - Text: `다른 카드 이야기를 해도 괜찮아요. AI가 알맞은 카드에 담아요.`
  - The right panel already has that card expanded.
- (e) **GitHub, no repo** (?github=1 and no repo): AI bubble `이 프로젝트에 연결한 GitHub 레포가 아직 없어요. 연결하면 바로 찾아볼게요.` + `GitHub 연결`. No right panel. Composer placeholder `한 줄이어도 괜찮아요`.

**Empty and missing rooms** (:316-320)
- `아직 채팅이 없어요` / `있었던 일을 한 줄만 적어도 이야기가 시작돼요.`
- No projects: `첫 프로젝트를 만들어 주세요` / `GitHub 레포에서 가져오거나 직접 만들 수 있어요.`
- Missing room: `휴지통에 있거나 지워진 대화방이에요` + `휴지통 보기`.

**Right card panel** (:120-130)
- Header: `경험 카드 N장`, a status slot and a close X (narrow only).
- Status slot: `담는 중` (spinner), `🔒 허락을 기다려요`, or ghost `되돌리기` (:126).
- Empty: `이야기를 들려주면 AI가 이 프로젝트의 경험 카드를 만들어요.` / `어느 카드에 담을지는 AI가 골라요.`
- Tile list: hint `카드를 누르면 자세히 볼 수 있어요.`. Tiles show title, resume line and keywords. A "new" tile animates in.
- **Expanded card** (:104-119):
  - Header: title + chevron-up to collapse.
  - Rows: 상황/과제/행동/결과, then 역량, then 이력서 한 줄. Empty rows read `아직 비어 있어요`.
  - "Just changed" state: field highlight flash, `<mark>` for appended text, del/ins for replaced text, new keyword chips highlighted.
  - Footer button `경험 카드 열기`.

**AI reply copy and system messages**
- Reply copy lives in chat.js:138-145, :157, :176-181, :217-227 and :264-268. Examples: `새 경험 카드를 만들었어요.`, `있던 카드와 다른 이야기라 새 경험 카드를 만들었어요.`, `네 칸이 모두 채워졌어요. 더 있었던 일이 있으면 이어서 적어 주세요.`
- Revert replies: `방금 만든 「…」 카드를 휴지통으로 옮겼어요.` and `「…」 카드에 방금 담은 내용을 되돌렸어요.` (:443-444).
- GitHub result texts (:197-199, :401):
  - `커밋 N개와 PR N개를 읽고 경험이 될 작업을 N개 찾았어요. 카드로 만들 작업을 골라 주세요.`
  - `레포를 다 읽지 못했어요.`
  - `새로 카드로 만들 작업은 없어요. 이 레포에서 만든 경험 카드예요.`
  - `카드로 만들 만한 작업을 찾지 못했어요. 새 채팅에서 있었던 일을 직접 들려주셔도 좋아요.`
  - `경험 카드 N장을 만들었어요. 비어 있는 칸은 이 대화방에서 이어서 채울 수 있어요.`
  - Also `찾은 작업은 모두 경험 카드로 있어요.` (:144) and `남은 작업이에요. 카드로 만들 작업을 골라 주세요.` (:468).

**Chat modals**
- **Rename chat** (:420-424): title `이름 바꾸기`, field `대화방 이름` (prefilled), buttons `취소` / `저장`.
- **Move project to trash, from the tree** (:428-432): danger. Title `「title」 프로젝트를 휴지통으로 옮길까요?`. Body `대화방 N개와 경험 카드 N장도 함께 옮겨져요. 30일 안에는 되돌릴 수 있어요.` Buttons `취소` / `휴지통으로 옮기기`.
- Also used from here: New project modal (Global G2) and GitHub connect modal (Global G5).
- Moving a chat to trash has no confirm; it goes straight to the "moved to trash" toast (:426).

**Chat toasts**
- `이제 묻지 않고 바로 카드에 반영할게요` (항상 허용) (:448).
- `만들 카드가 없어요` (:471).
- `경험 카드 N장을 만들었어요` (:472).

**Demo data, 모여봄 (p1)**
- Rooms: 오늘의 질문 with ~12 weeks of answers (seed-daily.js), 검색 API 응답 속도 개선 (N+1), 프론트와 API 명세 먼저 합의하기, JWT + Refresh Token 인증 설계, 배포 후 업로드 500 에러…, GitHub에서 찾은 경험 (done state, cards g1 and g2).
- **`AI 답변 종류 모아 보기`** (seed-replies.js:41-76) is a ready-made showcase of every special message: touch chips (alive, trashed, deleted), link, GitHub stopped/error/ready/empty/done, and confirm (create rejected, update allowed, update failed, delete allowed, waiting).
- 슬랙봇 (p2), which has no repo, has `AI 답변 종류: GitHub 연결 전` showing the connect state (:79-83).
- Other projects: 빈강의실 (p3, repo linked), 카페 아르바이트, 편의점 야간 아르바이트, 알고리즘 스터디, 데이터베이스 팀과제, 교내 해커톤.

---

## 5. Experience wiki

**#/vault, projects view** (screens/vault.js:71-81)
- Header h1 `경험 위키` + primary `+ 새 프로젝트`. Segmented control `프로젝트` | `전체 카드`.
- Project row (:20-29): folder icon, name link, `진행중` tag (ongoing only), meta (period · role · GitHub repo name, plus `외 N개` when more), `카드 N장`.
  - Ongoing projects end with a `✓ 프로젝트 완료` button, done ones with a static `✓ 완료`.
  - Ordering: ongoing first, then done.
- Empty (:36-37): `아직 프로젝트가 없어요` / `팀 과제, 동아리, 아르바이트도 프로젝트가 돼요.` + `새 프로젝트`. The segmented control is hidden in this state.
- Toast from 완료: `「…」 프로젝트를 완료했어요` + `되돌리기` (projects.js:45-49).

**#/vault?view=cards, all cards** (:60-69)
- Filter bar: search (placeholder `카드 검색`), a project select (`모든 프로젝트`), a competency select (`모든 역량`).
- Grid of card tiles; the matched keyword is highlighted when filtering by kw.
- Empty states (:51-58): `아직 경험 카드가 없어요` or `조건에 맞는 경험 카드가 없어요`, with buttons `조건 지우기` and/or `AI 채팅으로 만들기`.

**#/vault/p/:id, project page** (screens/projects.js:118-125)
- **Header** (:61-70): h1, status tag, period with calendar icon, role, summary.
  - Action: `✓ 프로젝트 완료` (ongoing) or ghost `↺ 다시 진행하기` (done).
  - **Project menu**: `수정`, `휴지통으로 옮기기` (danger).
- **GitHub panel** (:81-86)
  - Not connected: `GitHub를 연결하면 커밋과 PR에서 경험을 찾아 줘요.` + `GitHub 연결`.
  - Connected: repo list rows (:75-80) with the GitHub icon, `owner/name` (a link, or plain text plus an `예시` tag for sample repos), and `M월 D일 분석` or `아직 분석하지 않았어요`. Each row has a **repo menu** with one item: `연결 해제`.
  - Actions: `GitHub로 경험 카드 만들기` (primary when there are repos but no cards) and ghost `+ 레포 추가`.
- **Cards section** (:107-112)
  - Header: `경험 카드` with a count, buttons `AI 채팅으로 만들기` and ghost `직접 만들기`.
  - Grid of tiles.
  - Empty: `아직 경험 카드가 없어요`, body text varies with whether a repo is linked, then the same 2 buttons.
- **Missing or trashed project** (:113-116): `휴지통에 있는 프로젝트예요` + `「title」` + primary `복원하기`, or `프로젝트를 찾을 수 없어요` + `경험 위키로`.
- **Variants to draw**:
  - ongoing + repo + cards (demo 모여봄)
  - done + repo (빈강의실)
  - no repo + cards (슬랙봇)
  - brand-new: no repo, no cards
  - repo but no cards (GitHub button becomes primary)
  - trashed
- **Project modals**
  - **프로젝트 수정** (:8-42): fields `프로젝트 이름`, `맡은 역할`, `상태` (진행중/완료 select), `시작한 달` and `끝난 달` month inputs. 끝난 달 is hidden while the status is 진행중. Buttons `취소` / `저장`. Errors: `이름을 적어 주세요.`, `시작한 달을 골라 주세요.`, `끝난 달이 시작한 달보다 빨라요.`, `끝난 달을 골라 주세요.` Saving shows the toast `저장했어요`.
  - **프로젝트를 휴지통으로 옮길까요?** (:51-58): danger. Body `「title」 안의 경험 카드 N장, 대화방 N개도 함께 옮겨요. 30일 안에 되돌릴 수 있어요.` Buttons `취소` / `휴지통으로 옮기기`. Afterwards it navigates to #/vault and shows the "moved to trash" toast.
  - **경험 카드 직접 만들기** (:93-106): field `제목`, placeholder `예: 검색 API 응답 속도 개선`. Hint `만든 뒤 카드에서 상황·과제·행동·결과와 역량을 직접 써요.` Error `제목을 적어 주세요.` Buttons `취소` / `만들기`. On success it opens the card and shows the toast `경험 카드를 만들었어요`.
- **Project page toasts**
  - Done/reopen: `「…」 프로젝트를 완료했어요` or `「…」 프로젝트를 다시 진행해요`, each with `되돌리기`.
  - Unlink: `repo 연결을 해제했어요` + `되돌리기` (:138).
  - Restore: `복원했어요` (:142).

**#/vault/p/:id/github, project GitHub analysis** (screens/project-github.js). Narrow page.
- Header (:79-84): h1 `GitHub로 경험 카드 만들기`.
  - Meta: project chip link, then `커밋 N개, PR N개를 읽었어요`, then an `예시` tag.
  - Once results are in, a refresh icon button (`다시 분석하기`).
- States:
  - (a) **No repo** (:76): `연결한 레포가 없어요` / `GitHub를 연결하면 커밋과 PR에서 경험을 찾아 줘요.` + primary `GitHub 연결`.
  - (b) **Analysing** (:36-39): GitHub icon, repo name `(i/n)`, 5-step list (done / current / pending).
  - (c) **Review** (:62-72):
    - Danger error banner (+ `다시 시도`) and/or a note banner with the GitHub icon.
    - Draft checklist (Global G4).
    - Collapsible `› 이미 카드로 만든 경험 N개` listing card rows; it can be collapsed or expanded.
    - Sticky bottom bar: checkbox `모두 고르기` + primary `경험 카드 N장 만들기` (disabled at 0).
  - (d) **Nothing new** (:67): `새로 만들 경험이 없어요` / `찾은 경험은 모두 카드로 만들었어요.` + `AI 채팅으로 만들기`.
  - (e) **Nothing found**: `커밋과 PR에서 경험을 찾지 못했어요` / `AI와 이야기하며 만들 수 있어요.`
  - (f) **Error only**: banner plus `AI 채팅으로 만들기`.
  - Missing project: `프로젝트를 찾을 수 없어요` + `경험 위키로` (:101).
- Error copy for the banner and the chat error state is in github.js:54-63:
  - `GitHub 레포 주소 형식이 아니에요. 예) https://github.com/owner/repo`
  - `레포를 찾을 수 없어요. 공개(public) 레포인지 확인해 주세요. 비공개 레포는 아직 분석할 수 없어요.`
  - Rate limit: `GitHub API 호출 한도에 걸렸어요. 로그인 없이 쓰면 1시간에 60회까지만 부를 수 있어요. HH:MM 이후에 다시 시도해 주세요.`
  - `네트워크에 연결할 수 없어요. 인터넷 연결을 확인하고 다시 시도해 주세요.`
  - `아직 커밋이 없는 빈 레포예요. 코드를 올린 뒤 다시 분석해 주세요.`
  - `GitHub에서 응답을 받지 못했어요 (status). 잠시 뒤 다시 시도해 주세요.`
  - Fallback `분석을 마치지 못했어요. 다시 시도해 주세요.` (project-github.js:20)
  - Note `login 계정의 커밋·PR을 찾지 못해 레포 전체 기록으로 정리했어요.` (github.js:714)
- Saving: navigates back to the project and shows the toast `경험 카드 N장을 만들었어요` (:114).
- **Demo**: 모여봄's repo moyeobom-team/moyeobom-backend (87 commits, 34 PRs) gives 8 drafts. 6 already exist as cards, so the review shows 2 drafts (gh_actions, spring_test) plus `이미 카드로 만든 경험 6개`. 빈강의실 (cse-capstone/empty-classroom, 64 commits, 21 PRs) gives 6 drafts with about 2 left. The sample analysis plays the steps offline in about 2s.

---

## 6. Card detail (#/card/:id, screens/card.js). Narrow page.

- **Header** (:9-19)
  - Project chip link.
  - h1 title.
  - Meta: period, role, `GitHub` (source github) or `직접 만든 카드` (manual).
  - Keyword chips + text link `역량 바꾸기` (`역량 고르기` when empty).
  - Primary `AI 채팅으로 채우기` (opens new chat variant d).
  - **Card menu**: `제목 바꾸기` | `휴지통으로 옮기기` (danger). There is no confirm; it goes to the project page plus the "moved to trash" toast (:126).
- **Resume line panel** (:21-27)
  - Label `이력서 한 줄`, character counter `N자`.
  - One-line textarea, placeholder `이 경험을 이력서에 적을 한 문장`.
  - Inline write footer with hint `마스터 이력서에 이 문장이 그대로 들어가요.` and ghost `AI 문장으로 되돌리기` (only after a user edit on a non-manual card).
  - Revert toast: `AI 문장으로 되돌렸어요` + `취소`.
- **STAR** (:30-37): 4 rows (상황, 과제, 행동, 결과), each an auto-growing textarea with its own write footer.
  - Placeholders: `언제, 어디서, 누구와 있었던 일인가요?` / `맡은 역할이나 풀어야 했던 문제는 무엇이었나요?` / `구체적으로 무엇을 했나요?` / `무엇이 달라졌나요? 숫자가 있으면 좋아요.`
  - An empty row shows the link `AI 채팅에서 채우기`.
  - Write states per row: idle, dirty (취소 / 저장 primary), saved (`저장했어요`).
- **회고** (:65-68): label + `직접 쓰는 칸`. 4-row textarea, placeholder `다시 한다면 무엇을 다르게 할지, 무엇을 배웠는지 적어 보세요.`
- **쓰인 곳** (:71-79): list rows `마스터 이력서`, `company 자소서` / `company 면접` with the question as sub-text. Hidden when the card is unused. The rows link into the excluded screens, but the section itself must be drawn.
- **근거 evidence** (:82-85): a `<details>`.
  - **Collapsed**: chevron, h2 `근거`, counts `커밋 N개 PR N개 코드 N곳`.
  - **Expanded**: core.js:576-596 contents (repo line with `예시` tag, commit/PR rows, code blocks with highlighted lines). Sample repos have no links.
  - Shown only when evidence exists. In the demo: e1, e8, e10, e11, e9, e13 and the g1-g3 GitHub cards.
- **Missing card** (:87-90)
  - In trash: `휴지통에 있는 카드예요`, then `「…」 프로젝트와 함께 들어 있어요.` or `「title」`, then primary `복원하기`. Toast `복원했어요` or `「…」 프로젝트도 함께 복원했어요`.
  - Gone: `지워진 카드예요` + `전체 카드 보기`.
- **Card modals**
  - **제목 바꾸기** (:39-50): field `경험 카드 제목`. Error `제목을 적어 주세요.` Buttons `취소` / `저장`. Toast `제목을 바꿨어요`.
  - **역량 고르기** (:51-63): help text `이 경험에서 드러난 역량을 골라 주세요. 자소서와 면접 준비에서 이 역량으로 카드를 찾아요.`, then 12 toggle chips (aria-pressed, description as tooltip). Buttons `취소` / `저장`. Toast `역량을 저장했어요`.
- **Variants**: chat card (no evidence), GitHub card (evidence), manual card (empty STAR, `직접 만든 카드` tag), card with no keywords, trashed.

---

## 7. Timeline (#/timeline, screens/timeline.js). The top bar shows the h1 `경험 타임라인`.

- **Empty** (:94): `아직 경험 카드가 없어요` / `AI와 이야기하면 카드가 만들어지고, 여기에서 시간에 따라 뻗어 나가는 모습을 볼 수 있어요.` + primary `AI 채팅 시작`.
- **Toolbar** (:100-105): competency select (`모든 역량`); count `「kw」 역량이 담긴 카드 N장`; ghost `모두 접기` or `모두 펴기`; ghost `↺ 다시 보기` (replays the grow animation).
- **SVG canvas** (:37-84), horizontally scrollable:
  - Year gridlines labelled `YYYY년`, and a `지금` line.
  - One lane per project: a start dot and name link; ongoing lanes are styled differently with a tail, done lanes end in a dot.
  - Card twigs: branch, dot and truncated name (26 characters).
- **Expanded project**: twigs listed below the lane.
- **Folded project** (:53-58): fork dots stay on the lane; the end label reads `카드 N장` (`, 그중 「kw」 N장` while filtering). The fold toggle sits left of the name.
- **Keyword filter state**: matching cards highlighted, the rest dimmed.
- **Hover tooltip** (:127): title, project, `YYYY년 M월`, keyword chips.
- Demo: 8 projects from 2023-07 to now, about 21 cards.

---

## 8. Settings (#/settings, screens/settings.js). Narrow page.

- **프로필** (:18-21): label/control rows `이름` and `목표 직무` (datalist). Each has an inline write footer. Empty name shows `이름을 적어 주세요.`
- **GitHub 계정** (:8-14)
  - Not connected: `연결하지 않았어요` + `GitHub 연결`.
  - Connected: `github.com/login` (+ `예시` tag) + `바꾸기` + ghost-danger `연결 해제`.
  - Unlink toast: `GitHub 연결을 해제했어요` + `되돌리기`.
- **계정** (:23-26): `이메일` row with value + `로그아웃`; `회원 탈퇴` row with `계정과 모든 데이터를 지워요` + ghost-danger `탈퇴하기`.
- **Settings modals**
  - **GitHub 연결** / **GitHub 계정 바꾸기** (:43-62): field `GitHub 주소`, placeholder `github.com/내아이디`. Buttons `취소` / `불러오기`.
    - Busy line: spinner + step text (`계정 확인하는 중` → `조직 찾는 중` → `레포와 프로젝트 불러오는 중` → `기여한 레포 찾는 중`; github.js:97).
    - Errors: `GitHub 주소를 적어 주세요.`, `GitHub 주소 형식이 아니에요. 예) https://github.com/octocat`, `GitHub 계정을 찾을 수 없어요. 주소가 맞는지 확인해 주세요.`, rate limit, network.
    - Success toast: `login 계정을 연결했어요`.
  - **회원 탈퇴** (:63-81): danger, buttons `취소` / `탈퇴하기`.
    - Demo body: `예시 계정이라 계정은 남고, 데이터만 처음 상태로 돌아가요. 되돌릴 수 없어요.`
    - Real account body: `프로젝트, AI 채팅, 경험 카드, 지원 기업, 이력서가 모두 지워지고 되돌릴 수 없어요.` + field `비밀번호 확인`. Errors `비밀번호를 적어 주세요.` and `비밀번호가 맞지 않아요.`
    - Toast: `예시 데이터를 처음 상태로 되돌렸어요` or `탈퇴했어요`.
- Logout has no confirm dialog anywhere (app.js:91, settings `[data-logout]`).

---

## 9. Trash (#/trash, screens/trash.js). Narrow page.

- **Empty** (:31): `휴지통이 비어 있어요` / `버린 항목은 30일 동안 여기에 있어요.`. No header action.
- **With items**
  - Header subtitle `30일이 지나면 완전히 삭제돼요.` + danger `휴지통 비우기`.
  - Row (:19-25): type icon, title, sub-line (type label 프로젝트/채팅/경험 카드/지원 기업, project chip, `경험 카드 N개, 채팅 N개 포함` for projects, `N일 뒤 삭제`). Buttons `복원` and ghost-danger `완전 삭제`.
- **Modals**
  - **완전히 삭제할까요?** (:43): body `type 「title」`, optionally `…, 따로 버린 항목 N개도 함께 지워져요.`, then `되돌릴 수 없어요.` Buttons `취소` / danger `완전 삭제`. Toast `완전히 삭제했어요`.
  - **휴지통을 비울까요?** (:45): body `N개 항목을 되돌릴 수 없어요.` Buttons `취소` / danger `비우기`. Toast `휴지통을 비웠어요`.
- **Restore toasts** (:40-41): `복원했어요` (or `「…」 프로젝트도 함께 복원했어요`) + `보기`. Failure: `속한 프로젝트가 없어서 복원할 수 없어요`.
- Demo: 1 item, the card `모임 공지 푸시 알림 붙이기` (project 모여봄, `29일 뒤 삭제`). For variety, draw project, chat, card and app rows.

---

## 10. Global: GitHub flow components (repo-flow.js) and the full toast list

**G1. Repo picker** (repo-flow.js:16-90), used in onboarding, the New project modal and the GitHub connect modal.
- **Account form state** (:27-39), shown when no GitHub account is set or while changing account:
  - Field `GitHub 주소`, placeholder `github.com/내아이디`, inline `불러오기` button.
  - Hint `내 레포와 소속 조직의 공개 레포를 한 번에 불러와요.`; error state uses the warning icon. Empty input: `GitHub 주소를 적어 주세요.`
  - Busy line: spinner + step text.
  - Footer: ghost `예시 계정으로 해 보기`, and `이전 계정으로` while changing.
- **Repo list state** (:55-62):
  - Bar: GitHub icon + **login** + `예시` tag, and ghost `계정 바꾸기` (hidden in chat, keepAccount).
  - Warning banners (e.g. `조직은 N개까지만 가져왔어요.`).
  - Search `레포 검색`.
  - Radio rows: name, description or owner, language + `YYYY.MM`. Selected state. A disabled row reads `이 프로젝트에 연결됨` or `「project」에 연결됨`.
  - `N개 더 보기` (8 per page).
  - Empty: `찾는 레포가 없어요.` / `공개 레포가 없어요. 다른 계정을 불러오거나 직접 만들어 주세요.` / (chat) `공개 레포가 없어요. GitHub 계정은 설정에서 바꿀 수 있어요.`

**G2. New project modal** (lg) (:93-123): title `새 프로젝트`, segmented control `GitHub에서 가져오기` | `직접 만들기`, confirm `프로젝트 만들기` (disabled until valid), plus `취소`.
- GitHub tab: picker (G1).
- Manual tab (:95-98): `프로젝트 이름` (placeholder `예: 교내 해커톤, 카페 아르바이트`, hint `팀 과제, 동아리, 아르바이트도 프로젝트예요.`) and `맡은 역할 (선택)`.
- Toast: `「title」 프로젝트를 만들었어요`.
- Triggers: home empty state, vault `새 프로젝트`, chat tree and project picker.

**G3. Analysis steps** (:162, github.js:683): `레포 정보 불러오는 중` → `커밋·PR 읽는 중` → `파일 구조 살펴보는 중` → `코드 읽는 중 (k/n)` → `경험 카드로 정리하는 중`. Steps are done / current / pending. Figma: `Analysis/Step` (State: Done, Current, Pending).

**G4. Draft checklist item** (:167-177). Figma: `Repo/Draft`; opened details (`Repo/STAR row` + evidence) via `openDraft()`.
- Checkbox with title, resume line and keywords; a `휴지통에 있는 카드` tag when applicable.
- Collapsible `› 자세히 보기` with evidence counts.
- Expanded: STAR list (empty field reads `비어 있어요. AI 채팅에서 채울 수 있어요.`) plus the evidence body.
- States: checked, unchecked, collapsed, expanded.

**G5. GitHub connect modal** (lg) (:126-138): title `「project」에 GitHub 연결`, picker, buttons `취소` / `연결하기`. Toast `repo 레포를 연결했어요`. Triggers: project page `GitHub 연결` / `레포 추가`, chat connect buttons, project-github empty state.

**Toast list (non-excluded screens)**
- General: `로그아웃했어요`; "moved to trash" + `되돌리기` → `되돌렸어요`.
- Projects: `「…」 프로젝트를 만들었어요`; `repo 레포를 연결했어요`; `「…」 프로젝트를 완료했어요` / `다시 진행해요` (+`되돌리기`); `repo 연결을 해제했어요` (+`되돌리기`); `저장했어요`; `경험 카드를 만들었어요`; `경험 카드 N장을 만들었어요`.
- Card: `제목을 바꿨어요`; `역량을 저장했어요`; `AI 문장으로 되돌렸어요` (+`취소`).
- Restore: `복원했어요` (+`보기` in trash); `「…」 프로젝트도 함께 복원했어요`; `속한 프로젝트가 없어서 복원할 수 없어요`.
- Trash: `완전히 삭제했어요`; `휴지통을 비웠어요`.
- Settings: `login 계정을 연결했어요`; `GitHub 연결을 해제했어요` (+`되돌리기`); `탈퇴했어요` / `예시 데이터를 처음 상태로 되돌렸어요`.
- Chat: `휴지통으로 옮긴 카드예요` (+`휴지통 보기`); `지워진 카드예요`; the two permission toasts; `만들 카드가 없어요`.

**Inline banners** (`.banner`, `.banner-warn`, `.banner-danger`): picker warnings, chat GitHub error, project-github error and notes. Figma: `Banner` via `banner(tone, 글, 단추 글?)` (단추는 Show action).

---

## Live GitHub data vs demo data

**Live GitHub (api.github.com)**: the picker (fetchAccount) and analysis (analyzeRepo) only call GitHub when a real address is typed in. Errors and rate limits are possible there; github.js:54-63 has the copy.

**Demo account** (김준호, junho@example.com, target job 백엔드 개발자):
- GitHub login `example` with an `예시` tag everywhere.
- Repos (seed-repos.js:584-602): example/budget-bot, algorithm-notes, dotfiles; moyeobom-team/moyeobom-backend and moyeobom-frontend; cse-capstone/empty-classroom; campus-hack/lost-found-server.
- Linked: p1 → moyeobom-backend, p3 → empty-classroom. In the picker these show as disabled `「모여봄」에 연결됨` / `「빈강의실」에 연결됨`.
- Sample repos are unlinked text tagged `예시`, and sample analysis runs offline.
- For realistic Figma content: 8 projects (data.js:27-112; 모여봄 and 슬랙봇 ongoing, the rest done), about 21 cards, the daily rooms that fill the home grid, the showcase chat `AI 답변 종류 모아 보기`, 1 trash item, and 3 applications (sidebar sub-nav and home deadlines only).

A new account (logged in, not the demo) starts empty with no GitHub. That is how you reach every empty state: onboarding, home empty, chat with no projects, vault empty, timeline empty, trash empty, settings `연결하지 않았어요`.
