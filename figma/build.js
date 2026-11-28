#!/usr/bin/env node
/* Figma 스크립트 빌드: figma/src 의 파일을 이름순으로 이어 붙여 Scripter 에 붙여 넣을 한 파일(figma/dist/rewrite-v1.js)을 만든다.
   - 아이콘은 앱의 prototype/js/icons.js 에서 그대로 가져온다 (앱과 Figma 아이콘이 늘 같다)
   - src 파일은 한 스코프를 함께 쓴다. 화면 파일은 SCREENS.push({...}) 로 자기를 등록만 한다 (src/90-main.js 가 그린다)
   사용: node figma/build.js            → dist/rewrite-v1.js
         node figma/build.js --check    → 빌드 뒤 figma/test/run.js 로 가짜 Figma 에서 돌려 본다 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'dist', 'rewrite-v1.js');
const ICONS = path.join(ROOT, '..', 'prototype', 'js', 'icons.js');

function icons() {
  const code = fs.readFileSync(ICONS, 'utf8');
  const m = code.match(/const PATHS = (\{[\s\S]*?\n {2}\});/);
  if (!m) throw new Error('prototype/js/icons.js 에서 PATHS 를 찾지 못했어요');
  return Function(`return ${m[1]}`)(); // 앱의 아이콘 정의 (경로 문자열만 있는 객체)
}

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((d) => (d.isDirectory() ? files(path.join(dir, d.name)) : d.name.endsWith('.js') ? [path.join(dir, d.name)] : []));
}

const ordered = files(SRC).sort((a, b) => /main\.js$/.test(a) - /main\.js$/.test(b)); // 화면 파일이 먼저 등록하고 main 이 맨 끝에서 그린다
const parts = ordered.map((f) => `/* ===== ${path.relative(SRC, f)} ===== */\n${fs.readFileSync(f, 'utf8').trim()}\n`);
const head = `/* Rewrite v1 디자인 — 자동으로 만든 파일이에요. 고치려면 figma/src 를 고치고 \`node figma/build.js\` 를 다시 실행하세요.
   실행: Figma 데스크톱 앱에서 파일을 열고 Plugins → Scripter 에 이 파일 내용을 통째로 붙여 넣은 뒤 ▶.
   만드는 것: 「v1 Foundations」(색·글자), 「v1 Components」(컴포넌트), 「v1 Screens」(화면) 페이지. 다시 실행하면 세 페이지를 지우고 새로 그려요.
   빌드: ${new Date().toISOString().slice(0, 16).replace('T', ' ')} */\n`;
const body = `${head}\nconst ICON_PATHS = ${JSON.stringify(icons(), null, 0)};\n\n${parts.join('\n')}`;
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, body);
console.log(`빌드했어요: ${path.relative(process.cwd(), OUT)} (${(body.length / 1024).toFixed(0)}KB, 파일 ${parts.length}개)`);

if (process.argv.includes('--check')) {
  const r = require('child_process').spawnSync(process.execPath, [path.join(ROOT, 'test', 'run.js'), OUT], { stdio: 'inherit' });
  process.exit(r.status);
}
