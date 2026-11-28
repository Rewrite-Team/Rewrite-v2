# Rewrite Figma 스크립트

앱(prototype)의 화면과 컴포넌트를 Figma 에 그리는 스크립트예요. **한 번 실행하면 이번 버전(v1)에서 만들 모든 화면과 컴포넌트가 그려져요.**
UI 나 기능을 바꾸면 여기 스크립트도 함께 고치고, 다시 실행해서 Figma 를 최신으로 맞춰요.

## 실행

```bash
node figma/build.js            # figma/dist/rewrite-v1.js 를 만든다
node figma/build.js --check    # 만든 뒤 가짜 Figma 에서 돌려 실수가 없는지 본다
```

1. Figma 데스크톱 앱에서 디자인 파일을 열어요.
2. Plugins → **Scripter** 를 열고 `figma/dist/rewrite-v1.js` 내용을 통째로 붙여 넣은 뒤 ▶ 를 눌러요.
3. **「Rewrite v1」 페이지 하나**에 모두 그려요. 다시 실행하면 그 페이지 안만 지우고 새로 그려요 (다른 페이지는 건드리지 않아요).
   - 왼쪽 위: 기초 (색 변수와 글자 스타일 견본)
   - 그 오른쪽: 컴포넌트 라이브러리 (변형과 속성이 있는 컴포넌트)
   - 그 아래: 화면. 그룹마다 한 줄 (로그인, 시작하기, 홈, AI 채팅, 경험 위키, 프로젝트, 경험 카드, 경험 타임라인, 설정, 휴지통)
   - Figma Starter 플랜은 페이지가 3개까지예요. 「Rewrite v1」 페이지를 새로 만들 자리가 없으면, 빈 페이지 하나의 이름을 「Rewrite v1」로 바꾸고 다시 실행해 주세요.

글꼴은 그 컴퓨터에 **Pretendard** 가 있으면 Pretendard, 없으면 Noto Sans KR 로 그려요. 글자 스타일만 바꾸면 전체 글꼴이 바뀌어요.
색은 「Rewrite v1」 변수 모음(color/…, radius/…)에, 글자는 v1/… 텍스트 스타일에, 그림자는 v1/Elevation/… 효과 스타일에 있어요.

## 구조

```
figma/
  build.js              src 를 이어 붙여 dist 한 파일로 (아이콘은 prototype/js/icons.js 에서 가져온다)
  src/
    00-runtime.js       공용 도구: 색 토큰, 오토 레이아웃(al, put), 글자(text, tput), 인스턴스(inst), 아이콘(icon)
    10-foundations.js   글꼴, 색 변수, 텍스트·그림자 스타일, 페이지, Foundations 페이지
    20-icons.js         Icon/<이름> 컴포넌트
    30-components.js    컴포넌트 라이브러리
    40-patterns.js      화면 틀(shell, page), 왼쪽 메뉴, 모달, 메뉴, 알림, 빈 화면, 입력 묶음, GitHub 근거(evidence), 레포 초안(openDraft)
    screens/            화면 그룹마다 파일 하나. SCREENS.push 로 등록
    90-main.js          실행 순서와 화면 배치
  test/                 가짜 Figma (Figma 없이 스크립트 실수를 잡는다)
  docs/
    authoring.md        화면 파일 쓰는 법 (함수, 컴포넌트, 규칙)
    inventory.md        v1 에서 그릴 화면·모달·메뉴·알림 전체 목록
  dist/rewrite-v1.js    Scripter 에 붙여 넣는 파일 (빌드 결과, 커밋한다)
```

## 바꿀 때

- **화면을 바꿨다** → 해당 `src/screens/*.js` 를 고쳐요. 새 화면이면 `SCREENS.push` 를 하나 더해요.
- **새 화면 그룹** → `src/screens/` 에 파일을 만들고, 그룹 이름을 `90-main.js` 의 `GROUP_ORDER` 에 넣어요.
- **여러 화면에 쓰는 새 모양** → `30-components.js` 에 컴포넌트로 만들어요 (`makeOne`, `makeSet`). 한 파일에서만 쓰면 그 파일에서 `EXTRA_COMPONENTS`.
- **색·글자 크기를 바꿨다** → 앱의 `prototype/css/styles.css` 와 `00-runtime.js` 의 `COLORS`, `10-foundations.js` 의 `TYPE` 을 함께 고쳐요.
- **아이콘** → 앱의 `prototype/js/icons.js` 만 고치면 돼요. 빌드할 때 그대로 가져와요.
- 고친 뒤에는 `node figma/build.js --check` 가 통과해야 해요. `inventory.md` 도 함께 고쳐요.

규칙과 함수 목록은 [docs/authoring.md](docs/authoring.md)에 있어요.
