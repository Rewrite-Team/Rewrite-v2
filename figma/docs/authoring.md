# 화면 파일 쓰는 법 (figma/src/screens)

화면 파일 하나는 화면 그룹 하나예요. 파일은 `SCREENS.push(...)` 로 화면을 등록만 하고, 실제 그리기는 `src/90-main.js` 가 해요.
`node figma/build.js --check` 로 빌드하고 가짜 Figma(figma/test)에서 돌려 봐요. 실제 Figma 에서는 dist 파일을 Scripter 에 붙여 넣어요.

## 규칙 (프론트 전문가가 만든 것처럼)

1. **색은 토큰, 글자는 텍스트 스타일만.** hex, 글자 크기, 글꼴을 화면 파일에 직접 쓰지 않아요.
   - 색 토큰: `src/00-runtime.js` 의 `COLORS` 키 (`text`, `text-2`, `text-3`, `primary`, `surface-2`, `border`, `hl`, `danger` …)
   - 텍스트 스타일: `src/10-foundations.js` 의 `TYPE` 이름 (`Heading/24`, `Title/17`, `Body/15`, `Body/15 Semibold`, `Small/13.5`, `Small/13.5 Semibold`, `Caption/12`, `Mono/12` …)
2. **있는 컴포넌트를 먼저 써요** (`inst('이름', {속성})`). 같은 모양을 두 번 손으로 그리지 않아요.
   한 화면 파일에서 여러 번 반복되는 새 모양이 필요하면 그 파일에서 `EXTRA_COMPONENTS.push({ title, build })` 로 컴포넌트를 만들어 써요 (`makeOne`, `makeSet` 사용).
   **두 화면 파일 이상에서 쓰는 모양은 공용(`30-components.js`, 조립은 `40-patterns.js`)으로 올려요.** 화면 파일에서 공용 컴포넌트의 색이나 글자를 덮어쓰지 않아요 (필요하면 변형을 더해요. 예: `Button` 의 `Ghost danger`).
   안쪽 인스턴스를 화면에서 바꿔야 하면 컴포넌트에서 `expose(parent, node)` 로 노출하고 화면에서는 `setNested` 나 그 컴포넌트의 도우미(`shell`, `banner`, `indexCard`)를 써요.
3. **오토 레이아웃으로 조립해요** (`al`, `put`). 좌표를 직접 정하는 건 겹쳐 띄우는 것(모달, 메뉴, 툴팁, 알림)뿐이에요.
4. **내용은 앱과 똑같이.** 문구는 앱 코드(prototype/js)에서 그대로 가져와요. 예시 계정(김준호, 모여봄 …)의 데이터를 써요. 지어내지 않아요.
5. **1차 범위만.** 마스터 이력서, 지원 기업과 관련된 것(메뉴, 홈의 마감 목록, 카드의 「쓰인 곳」, 휴지통의 지원 기업 항목)은 그리지 않아요. 목록은 `figma/docs/inventory.md`.
6. 디자인 규칙은 `docs/design-guide.md` (형광펜은 「내가 고른 것」과 「AI가 더한 것」에만, 가운뎃점으로 정보 잇지 않기, 이모지·유니코드 기호 아이콘 금지 …).

## 등록

```js
SCREENS.push({
  group: '경험 위키',            // 화면 페이지의 줄 이름. 90-main.js 의 GROUP_ORDER 에 있는 것
  title: '프로젝트',              // 프레임 이름은 「경험 위키 / 프로젝트」
  h: 1080,                       // 선택. 기본 1080. 길어지면 build 끝에서 fit(frame, screen)
  build: async (frame) => {
    const { screen, main } = shell(frame, 'Wiki');   // 왼쪽 메뉴 + 가운데. Active: Home | Chat | Wiki | Timeline | Trash | None
    const col = await page(main, { title: '경험 위키', actions: [btn('새 프로젝트', 'Primary', 'Medium', 'plus')] });
    // … 조립
    fit(frame, screen);
  },
});
```

모달이 뜬 화면은 아래 화면을 그린 뒤 `await modal(frame, {...})`, 메뉴가 열린 화면은 `menuUnder(frame, 누른 단추, items, { at: [x, y] })` (자리를 못 재면 at), 알림은 `toast(frame, '…', '되돌리기')`.
화면 파일은 `{ … }` 블록이나 `(() => { … })()` 로 감싸서 이름이 다른 파일과 겹치지 않게 해요.

## 쓸 수 있는 함수

| 함수 | 하는 일 |
|---|---|
| `al('H'│'V', { name, gap, pad, fill, stroke, sides, radius, w, h, main, cross, wrap, clip, minH, minW, maxW, opacity })` | 오토 레이아웃 틀. `pad`: 숫자, [세로, 가로], [위, 오른쪽, 아래, 왼쪽]. `main`/`cross`: start, center, end, between. w/h 를 주면 그 축 고정, 없으면 내용에 맞춤 |
| `put(parent, child, { fill, fillV, at:[x,y] })` | 부모에 넣고 가로/세로 채우기. **FILL 은 반드시 부모에 넣은 다음** (put 이 해 줘요) |
| `spacer(parent)`, `gap(parent, h, w?)` | 늘어나는 빈 칸, 정해진 틈 |
| `await text(글, 스타일, 색, { w, align, maxLines, underline, name })` | 글자 노드 (부모에 넣지 않음) |
| `await tput(parent, 글, 스타일, 색, { wrap, align, maxLines, name })` | 글자를 넣고, `wrap` 이면 부모 폭에 맞춰 줄바꿈 |
| `await marked(글, 스타일, 색)` | 형광펜 글자 (AI가 더한 것) |
| `inst('컴포넌트', { 속성 })` | 인스턴스. VARIANT 는 이름=값, TEXT/BOOLEAN 은 속성 이름, INSTANCE_SWAP 은 아이콘 이름 |
| `setNested(인스턴스, '안쪽 레이어', { 속성 })` | 노출한 안쪽 인스턴스의 속성 바꾸기 (inst 와 같은 규칙) |
| `icon('이름', 크기, 색)` | 아이콘 (prototype/js/icons.js 의 이름) |
| `btn(라벨, 'Primary'│'Secondary'│'Ghost'│'Danger'│'Ghost danger', 'Small'│'Medium'│'Large', 아이콘?)`, `disable(node)` | 버튼, 꺼진 버튼(투명도 45%) |
| `spinner(크기 = 16)` | 불러오는 중 (Spinner). 앱의 .spinner 는 18 |
| `banner('Info'│'Warn'│'Danger', 글, 단추 글?)` | 화면 안 알림 (Banner). 단추 글을 주면 오른쪽에 Small Secondary 단추 |
| `segmented([{label, icon}], 고른 순서)` | 나란한 보기 고르기 |
| `await field(parent, { label, note, input:{Content, State, Text, 'Show icon', Icon, 'Show trailing', Trailing} │ textarea:{Content, Text} │ select:'글', trailing:[노드], hint, error })` | 라벨(+ 옅은 note 「(선택)」) + 입력칸(+ 오른쪽 trailing 노드: 불러오기 단추) + 안내/오류 |
| `await empty(parent, 제목, 설명, [버튼])` | 빈 화면 |
| `shell(frame, Active, { name, email, trash })` → `{screen, main, side}` | 왼쪽 메뉴가 있는 화면 틀. `trash`: 휴지통 개수 (0 이면 숨김, 주지 않으면 1). 가운데는 내용 높이(최소 화면 높이)라 따로 맞출 필요 없어요 |
| `await page(main, { narrow, crumb, above, title, titleExtra, meta, sub, below, actions, after })` → `col` | 폭 1200 페이지 (내용 1120, narrow 면 760). 머리: `above` 제목 위 줄, `titleExtra` 제목 옆, `meta` 제목 아래 정보 줄(사이 14), `sub` 설명(최대 600), `below` 그 아래 줄, `actions` 오른쪽 단추, `after` 머리 아래 틈(기본 28) |
| `await titleBar(main, 제목)`, `await sectionTitle(col, 제목, 오른쪽링크?, 개수?)` | 상단바, 섹션 제목 |
| `indexCard({ project, period, github, title, line, keywords, match })` | 경험 카드 한 장 (Card/Index). `match`: 거른 역량에 형광펜 |
| `await githubAccount(parent, 'example', { sample, pad })` | 레포 고르기 위 GitHub 계정 줄 (+ 예시 태그, 계정 바꾸기) |
| `await evidence(parent, { repo, sample, commits:[[sha, 글, 날짜]], prs:[[#번호, 글, 날짜]], code:[{ path, lines:[[번호, 코드]], hl:[번호] }] })`, `evidenceCounts(같은 옵션)` | GitHub 근거 묶음 (레포 줄 + 커밋 · PR · 코드), 근거 수 글 ['커밋 3개', …] |
| `await openDraft(parent, { title, line, keywords, star:[[칸, 글]], evidence })` | 레포 분석에서 찾은 작업을 고르고 「자세히 보기」를 펼친 모습 |
| `await modal(frame, { title, width:480│760, close, body: async (b) => {}, buttons:[…] })`, `modalText(body, 글)` | 모달 |
| `menu(frame, [{label, icon, danger} │ '-'], [x, y], { w })`, `menuUnder(frame, 단추, items, { w, align:'end'│'start', up, gap, at })` | 메뉴. menuUnder 는 단추 아래(up 이면 위)에 띄우고, 자리를 잴 수 없으면 `at` ([x, y] 또는 (메뉴) => [x, y]) |
| `boxIn(node, frame)` → `{x, y, w, h}` 또는 null | 프레임 안 노드 자리 (툴팁 놓기). 가짜 Figma 처럼 잴 수 없으면 null |
| `toast(frame, 글, 동작?)`, `tooltip(frame, 글, [x, y])` | 띄우는 것 |
| `fit(frame, node)` | 프레임 높이를 내용에 맞춤 (최소 1080) |
| `stroke(node, 색, 굵기, sides)`, `radius(node, 숫자│'radius/md')`, `shadow(node, 'Menu'│'Modal')`, `paint(색, 투명도)`, `fills(색)`, `recolor(node, 색)` | 꾸미기 (recolor 는 아이콘에만) |

컴포넌트를 만들 때(`30-components.js`, `EXTRA_COMPONENTS`): `makeOne(parent, 이름, build, { desc, props })`, `makeSet(parent, 이름, [{ props, build }], { dir, desc, props })`, `auto(c, 'H'│'V', al 옵션)`, `named(node, 이름)`, `expose(parent, 안쪽 인스턴스)`.
`props` 는 `[{ name, type: 'TEXT'│'BOOLEAN'│'INSTANCE_SWAP', default, node: 레이어 이름 }]`. 안쪽 인스턴스 속의 레이어에는 묶지 않아요 (Figma 가 막아요) → 노출해서 setNested.

## 컴포넌트

공용 (`30-components.js`, `40-patterns.js`의 Shell/Sidebar):

- 기본: `Button` (Variant: Primary, Secondary, Ghost, Danger, Ghost danger / Size: Small, Medium, Large / Label, Show icon, Icon) ·
  `Icon button` (Size: Medium, Small / Icon) · `Tag` (Tone: Neutral(예시), Ink(진행중), Success(완료), Warn, Danger / Label) · `Avatar` (Initial) · `Logo` (On: Light, Ink) · `Divider` · `Spinner`
- 입력: `Input` (Content: Placeholder, Value / State: Default, Focus, Error, Disabled / Text, Show icon, Icon, Show trailing, Trailing) · `Textarea` (Content / Text) · `Select` (Text) ·
  `Checkbox` (Checked: Off, On) · `Radio` (Checked) · `Switch` (On: Off, On) · `Segment` (Selected / Label, Show icon, Icon)
- 탐색: `Nav item` (State: Default, Active / Label, Icon, Count, Show count) · `Project chip` (Label) · `Keyword` (State: Default, Selected / Label) · `Keyword option` (Selected: Off, On / Label)
- 알림과 메뉴: `Menu item` (Tone: Default, Danger / Label, Show icon, Icon) · `Toast` (Label, Action, Show action) · `Tooltip` (Label) · `Banner` (Tone: Info, Warn, Danger / Label, Show action; 노출한 단추 `action`)
- AI 채팅: `Chat/AI mark` · `Chat/My message` (Text; 폭은 인스턴스에서 `layoutSizingHorizontal='FIXED'` 후 resize) · `Chat/Card chip` (Card, Fields) · `Chat/Room row` (State / Name, Time, Show time) · `Chat/Daily row` (State / Unanswered) · `Chat/Day divider` (Label) · `Chat/Typing`
- 경험 카드: `Card/Tile` (Title, Resume line, Keywords) · `Card/Index` (Project, Period, Show GitHub, Title, Resume line, Show keyword 2, Show keyword 3; 노출한 Keyword `kw1`~`kw3` → `indexCard()`)
- 목록: `List row` (Title, Subtitle, Show subtitle, Meta, Show meta, Show icon, Icon) · `Wiki/Project row` (State: Ongoing, Done / Name, Period, Role, Repo, Show repo, Cards) ·
  `Repo/Choice` (State: Default, Selected, Disabled / Name, Description, Meta) · `Repo/Draft` (Selected: Off, On / Title, Resume line, Keywords, Evidence, Show more) · `Repo/Made card` (Title, Empty fields, Show empty)
- GitHub 분석과 근거: `Analysis/Step` (State: Done, Current, Pending / Label) · `Repo/STAR row` (Content: Value, Empty / Label, Text) · `Evidence/Row` (Id, Message, Date) · `Evidence/Code line` (Highlight: Off, On / Number, Code)
- 화면 틀: `Shell/Sidebar` (Active: Home, Chat, Wiki, Timeline, Trash, None / Name, Email; 노출한 `avatar`, `trash` → `shell()` 의 옵션)

화면 파일에만 있는 것 (`EXTRA_COMPONENTS`): `Auth/Resume paper`, `Auth/Brand panel`, `Onboarding/Header`, `Onboarding/Progress` (10-auth) · `Home/Chat row` (20-home) ·
`Chat/Diff row`, `Chat/Confirm`, `Chat/Card field`, `Chat/Panel status`, `Chat/Project choice` (30-chat) · `Project/Repo row` (50-project) · `Card/Write footer`, `Card/STAR row` (60-card) ·
`Timeline/Twig`, `Timeline/Project` (70-timeline) · `Settings/Row` (80-settings) · `Trash/Row` (85-trash)

## 자주 하는 실수

- `layoutSizingHorizontal = 'FILL'` 은 오토 레이아웃 부모에 넣은 **다음에** (`put(parent, x, { fill: true })`)
- `resize()` 는 FILL/HUG 를 FIXED 로 되돌려요 → resize 먼저, 채우기는 나중에
- 인스턴스 안에는 노드를 넣을 수 없어요 (속성으로 바꾸거나, 인스턴스 옆에 둬요)
- 글자 줄바꿈은 `tput(..., { wrap: true })` (부모 폭이 정해져 있어야 해요)
