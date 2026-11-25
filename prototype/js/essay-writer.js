/* 자소서 초안 템플릿(모의 AI). 카드에 적힌 사실만 쓴다. 모르는 것은 [ ] 로 남긴다.
   polite(text)  : 음슴체·명사형·~다·해요체 → ~습니다
   writeEssay({ question, keywords, limit, cards, company, job }) → string (문단은 \n\n)
   resumeLineOf(card) : 새 카드용 「이력서 한 줄」 (card.resumeLine 이 없을 때) */
(function (App) {

/* ---------- 한글 조각 ---------- */
// 음절 → [초성, 중성, 종성] 번호. 한글 음절이 아니면 null
function hangul(ch) { const c = String(ch || '').charCodeAt(0) - 0xac00; return c >= 0 && c <= 11171 ? [Math.floor(c / 588), Math.floor((c % 588) / 28), c % 28] : null; }
function syllable(i, v, t) { return String.fromCharCode(0xac00 + i * 588 + v * 28 + t); }
// 조사: 괄호·따옴표는 건너뛰고 앞 글자를 본다. 숫자·%·영문 끝소리도 처리
function withJosa(word, a, b) {
  const bare = String(word).replace(/\s*\([^()]*\)\s*$/, '').replace(/[’'"”」)\]\s]+$/, '');
  const ch = bare.slice(-1); const h = hangul(ch); let closed;
  if (h) closed = h[2] > 0; else if (/\d/.test(ch)) closed = /[013678]/.test(ch); else closed = /[lmnrLMNR]/.test(ch);
  if (a === '으로' || a === '으로서') closed = closed && !(h && h[2] === 8) && !/[178lrLR]/.test(ch); // ㄹ 받침 뒤는 로
  return word + (closed ? a : b);
}

/* ---------- 문장 하나의 끝을 ~습니다로 ---------- */
const P_NOUN_M = /(?:팀|시스템|프로그램|모임|알림|경험|시험|체험|위험|게임|이름|처음|마음|다음|사람|점|플랫폼|아이템|알고리즘|도움|소음|관심|중심|핵심|책임|결함|그림|(?:^|\s)힘)$/; // ㅁ으로 끝나지만 동사가 아닌 말
const P_DO = '완성|완료|유지|통과|수상|수료|합격|달성|단축|감소|증가|개선|해결|도입|구축|제작|적용|배포|출시|운영|설계|구현|개발|분석|제안|진행|작성|정리|제거|방지|확보|선정|공유|합의|검증|추가|도출|참여|참가|담당|획득';
const P_SELF = /^(?:감소|증가|합의)$/; // 앞말에 이/가
function pAttach(noun, verb) {
  // "장려상 수상" → "장려상을 수상". 이미 조사·쉼표가 있으면 그대로
  const n = noun.trim(); if (!n) return verb;
  if (/(?:[을를이가은는에도로의과와,]|에서|까지|으로)$/.test(n) && !/(?:회의|동의|사이|차이|문의|높이|길이|논의|정의)$/.test(n)) return `${n} ${verb}`;
  if (P_SELF.test(verb)) return `${withJosa(n, '이', '가')} ${verb}`;
  return `${withJosa(n, '을', '를')} ${verb}`;
}
function pEnd(body) {
  let m;
  // 1) 이미 ~니다 / ~니까
  if (/(?:니다|니까)$/.test(body)) return body;
  // 2) 과거형 + 음/다/어요 : 했음 했다 했어요, 없음 있다
  if ((m = body.match(/^([\s\S]*)([가-힣])(?:음|다|어요|어|슴)$/)) && [20, 18].includes(hangul(m[2])[2])) return m[1] + m[2] + '습니다';
  // 3) 해요체·해라체 (현재형은 현재형으로)
  if (/(?:이에요|이예요|이다)$/.test(body)) return body.replace(/(?:이에요|이예요|이다)$/, '입니다');
  if (/예요$/.test(body)) return body.replace(/예요$/, '입니다');
  if (/해요$/.test(body)) return body.replace(/해요$/, '합니다');
  if (/[돼되]요$/.test(body)) return body.replace(/[돼되]요$/, '됩니다');
  if (/[가-힣]는다$/.test(body)) return body.replace(/는다$/, '습니다');
  if ((m = body.match(/^([\s\S]*)([가-힣])다$/))) {
    const h = hangul(m[2]);
    if (h[2] === 4 || h[2] === 0) return m[1] + syllable(h[0], h[1], 17) + '니다'; // 한다·크다 → 합니다·큽니다
    return m[1] + m[2] + '습니다';
  }
  if ((m = body.match(/^([\s\S]*)([가-힣])(?:아|어)요$/)) && hangul(m[2])[2]) return m[1] + m[2] + '습니다';
  // 4) "응답시간 1.8초 → 0.3초"
  if ((m = body.match(/^(.*?)\s*(\d[\d,.]*)\s*([^\s\d→]*)\s*→\s*(\d[\d,.]*)\s*([^\s\d→]*)$/))) {
    const a = parseFloat(m[2].replace(/,/g, '')); const b = parseFloat(m[4].replace(/,/g, ''));
    const unit = m[3] || m[5]; const word = a > b ? '줄었습니다' : a < b ? '늘었습니다' : '유지되었습니다';
    const head = m[1].replace(/[:：]$/, '').trim();
    return `${head ? withJosa(head, '이', '가') + ' ' : ''}${m[2]}${unit}에서 ${withJosa(m[4] + (m[5] || unit), '으로', '로')} ${word}`;
  }
  // 5) ㅁ으로 끝나는 명사 + 임
  if ((m = body.match(/^([\s\S]*?)임$/)) && !P_NOUN_M.test(body) && !/(?:보|붙|줄|쓰|높|움직|들|먹|섞|녹|기울|숙|늘|끓|속)$/.test(m[1])) return withJosa(m[1], '이었습니다', '였습니다');
  if (P_NOUN_M.test(body)) {
    if ((m = body.match(/^(.+(?:해커톤|대회|공모전)), (\d+인 팀)$/))) return `${m[1]}에 ${m[2]}으로 참여했습니다`;
    return body + '이었습니다';
  }
  // 6) 동사 명사형 -ㅁ/-음/-ㄻ → 과거 (카드 속 행동은 지난 일)
  const last = body.slice(-1); const h = hangul(last); const prev = hangul(body.slice(-2, -1)); const cut = body.slice(0, -1);
  if (h && (h[2] === 16 || h[2] === 10)) {
    if (last === '함') return cut + '했습니다';
    if (last === '됨') return cut + '되었습니다';
    if (h[2] === 10) return cut + syllable(h[0], h[1], 8) + ([0, 8].includes(h[1]) ? '았' : '었') + '습니다'; // 만듦 → 만들었
    if (last === '음' && prev) return cut + ([0, 2, 8].includes(prev[1]) ? '았' : '었') + '습니다'; // 받음·않음·넣음·지음
    if (last === '름' && prev) { // 고름 → 골랐, 흐름 → 흘렀
      const p = body.slice(-2, -1);
      if (/[고다모오자]/.test(p)) return body.slice(0, -2) + syllable(prev[0], prev[1], 8) + '랐습니다';
      if (/[흐서기부이누]/.test(p)) return body.slice(0, -2) + syllable(prev[0], prev[1], 8) + '렀습니다';
    }
    if ('줌둠'.includes(last)) return cut + syllable(h[0], h[1], 0) + '었습니다'; // 줌 → 주었, 둠 → 두었
    const past = { 20: 6, 13: 14, 8: 9, 0: 0, 1: 1, 4: 4, 5: 5, 6: 6, 18: 4 }[h[1]]; // ㅣ→ㅕ ㅜ→ㅝ ㅗ→ㅘ, 나머지 그대로
    if (past != null) return cut + syllable(h[0], past, 20) + '습니다'; // 짐→졌 갈림→갈렸 바꿈→바꿨 봄→봤 냄→냈 씀→썼
    return cut + syllable(h[0], h[1], 0) + '었습니다'; // 뜀 → 뛰었
  }
  // 7) 명사로 끝난 결과
  if ((m = body.match(new RegExp(`^([\\s\\S]*?)(${P_DO})$`))) && /(^|\s)$/.test(m[1])) return `${pAttach(m[1], m[2])}했습니다`;
  if ((m = body.match(/^([\s\S]*?)\s*(향상|상승|하락)$/))) return `${m[1] ? (/(?:[을를이가은는에로])$/.test(m[1]) || /%$/.test(m[1]) ? m[1] : withJosa(m[1], '이', '가')) + ' ' : ''}${m[2]}${m[2] === '향상' ? '되었습니다' : '했습니다'}`;
  if ((m = body.match(/^(.*(?:대회|해커톤|공모전))\s+대상$/))) return `${m[1]}에서 대상을 받았습니다`;
  if (/상$/.test(body) && !/(?:이상|영상|대상|현상|예상|보상|비상|인상|정상|가상|세상|책상|일상|발상)$/.test(body)) {
    m = body.match(/^(.*(?:발표|대회|해커톤|공모전|심사))\s+(\S+상)$/);
    return m ? `${m[1]}에서 ${m[2]}을 받았습니다` : `${body}을 받았습니다`;
  }
  if (/\d\s*(?:건|명|회|개|번|점|위|%|퍼센트|초|분|시간|일|주|개월|배)$/.test(body)) return `${withJosa(body, '을', '를')} 기록했습니다`;
  return hangul(last) ? withJosa(body, '이었습니다', '였습니다') : body;
}
function splitSentences(text) {
  return String(text || '').replace(/\s+/g, ' ').trim().split(/(?<=[.!?。])\s+/).filter(Boolean);
}
function polite(text) {
  return splitSentences(text).map((raw) => {
    let s = raw.replace(/\s*\(PR #\d+\)/g, '').replace(/(\d)\s?s(?![A-Za-z])/g, '$1초').replace(/\s*(?:->|➔|⇒)\s*/g, ' → ').replace(/[「『]/g, '‘').replace(/[」』]/g, '’');
    // 큰따옴표 안의 남의 말은 건드리지 않고 나 → 저, 우리 → 저희
    s = s.split(/("[^"]*"|“[^”]*”)/).map((x, i) => (i % 2 ? x : x
      .replace(/(^|\s)내가(?=\s)/g, '$1제가').replace(/(^|\s)내(?=\s)/g, '$1제')
      .replace(/(^|\s)나(는|를|도|와|에게|의)(?=\s)/g, '$1저$2').replace(/(^|\s)우리(?=[\s가는를])/g, '$1저희'))).join('');
    s = s.replace(new RegExp(`(^|\\s)(\\S+) (${P_DO}) 및 `, 'g'), (_, sp, n, v) => `${sp}${pAttach(n, v)}하고 `);
    if (/[!?]$/.test(s)) return s;
    const tail = s.match(/\s*(\([^()]*\))?[.。]?$/); const paren = (tail && tail[1]) || ''; // "확인함(락 전에는 …)." 은 괄호를 떼고 바꾼다
    const core = s.slice(0, tail.index).trim(); if (!core) return s;
    const done = paren && !hangul(core.slice(-1)) ? core + paren : pEnd(core) + paren;
    return done + '.';
  }).join(' ');
}

/* ---------- 자소서 ---------- */
const E_KW = { '커뮤니케이션': '커뮤니케이션 능력' };
const eName = (k) => E_KW[k] || k;
function eJoin(list) { return list.map((k, i) => (i < list.length - 1 ? withJosa(eName(k), '과', '와') + ' ' : eName(k))).join(''); }
// "‘모여봄’ 프로젝트" / "카페 아르바이트"
function ePlace(card) {
  const t = String(card.projectTitle || '').split(' — ')[0].trim(); if (!t) return '';
  return /(?:아르바이트|알바|인턴|스터디|동아리|학회|과제|해커톤|공모전|대회|프로젝트|캠프|봉사|활동|수업|근무)$/.test(t) ? t : `‘${t}’ 프로젝트`;
}
// 첫 문장(요약)과 절반 넘게 겹치는 상황 문장인지
function eOverlap(sentence, base) {
  const w = String(sentence).replace(/[‘’"“”.,()]/g, ' ').split(/\s+/).filter((x) => x.length > 1);
  return w.length > 0 && w.filter((x) => base.includes(x.length > 2 ? x.slice(0, -1) : x)).length / w.length >= 0.6;
}
function eLead(card, mode, word) {
  // mode: 'first' 첫 카드 / 'same' 앞과 같은 프로젝트 / 'next' 다른 프로젝트
  const raw = card.summary || ''; let body = polite(raw);
  const t = String(card.projectTitle || '').split(' — ')[0].trim();
  const dup = !t || raw.includes(t.split(/\s+/).pop()) || raw.includes(t);
  if (!body) body = `${withJosa(`‘${String(card.title || '').split(' — ')[0]}’`, '을', '를')} 맡아 진행했습니다.`;
  const place = ePlace(card);
  if (mode === 'same') return `같은 프로젝트에서 ${body}`;
  if (mode === 'next') return dup ? `${word} ${body}` : `${word} ${place}에서는 ${body}`;
  return dup ? body : `${place}에서 ${body}`;
}
function writeEssay({ question, keywords, limit, cards, company, job }) {
  const q = String(question || ''); const kws = keywords || []; const max = Number(limit) > 0 ? Number(limit) : Infinity;
  const star = (c, k) => ((c.star || {})[k] || '').trim();
  const score = (c) => (c.keywords || []).filter((k) => kws.includes(k)).length * 30 + ['situation', 'task', 'action', 'result'].filter((k) => star(c, k)).length * 7 + (/\d/.test(star(c, 'result')) ? 5 : 0);
  const list = (cards || []).filter(Boolean).map((c, i) => ({ c, i, s: score(c) })).sort((a, b) => b.s - a.s || a.i - b.i).map((x) => x.c).slice(0, 3);
  if (!list.length) return '';
  // 같은 프로젝트 카드는 붙여 놓는다 (첫 카드는 그대로)
  if (list.length === 3 && list[0].projectTitle !== list[1].projectTitle && list[0].projectTitle === list[2].projectTitle) list.splice(1, 2, list[2], list[1]);

  const co = String(company || '').trim(); const jb = String(job || '').replace(/\s*\(.*?\)\s*/g, '').trim();
  const where = [co, jb].filter(Boolean).join(' ');
  const motive = /지원\s*동기|지원한 이유|지원하게 된|지원하신|지원 이유|왜 .*지원|선택한 이유/.test(q);
  const future = /입사 후|포부|이루고 싶은|목표/.test(q);

  // 단위 = 문장. pr 이 작을수록 먼저 남긴다. req = 함께 있어야 하는 앞 문장
  const units = []; const paraOf = []; let para = 0;
  const add = (text, pr, req) => { if (!text) return null; const u = { id: units.length, text: text.trim(), pr, req: req ? req.id : null, para }; units.push(u); return u; };

  if (motive) {
    add(`[${co || '이 회사'}에 끌린 이유 한 가지: 서비스·기술 블로그·공고에서 직접 확인한 사실]`, 0);
    add(`${where ? where + ' 직무' : '이 직무'}에 지원하면서 제가 가장 먼저 보여 드리고 싶은 것은 ${eJoin((list[0].keywords || []).filter((k) => kws.includes(k)).concat(list[0].keywords || []).slice(0, 1)) ? withJosa(eJoin((list[0].keywords || []).filter((k) => kws.includes(k)).concat(list[0].keywords || []).slice(0, 1)), '을', '를') + ' 발휘한' : '다음'} 경험입니다.`, 0.5);
    para++;
  }
  list.forEach((c, n) => {
    const same = n > 0 && c.projectTitle && c.projectTitle === list[n - 1].projectTitle;
    const base = n * 10; // 뒤 카드의 살은 앞 카드 다음 순서
    const lead = add(eLead(c, n === 0 ? 'first' : same ? 'same' : 'next', n === 2 ? '마지막으로' : '또한'), n === 0 ? 0 : 3 + n * 0.1);
    if (n === 0 && !motive) para++; // 두괄식 첫 문장은 한 문단
    const sit = splitSentences(polite(star(c, 'situation'))); let prevS = lead;
    sit.filter((s) => !eOverlap(s, lead.text)).forEach((s, i) => { prevS = add(s, base + 6 + i * 0.1, prevS) || prevS; });
    // 첫 카드만 과제를 쓴다. "작업을 맡음" 같은 PR 제목은 정보가 없어 뺀다
    if (n === 0 && star(c, 'task') && !/작업을 맡음/.test(star(c, 'task'))) add(polite(star(c, 'task')), base + 7, lead);
    const sitHead = units.find((u) => u.id > lead.id && u.para === para && u.req === lead.id);
    let prevA = lead; let firstA = null;
    splitSentences(polite(star(c, 'action'))).forEach((s, i) => { prevA = add(s, base + (i ? 5 + i * 0.1 : 4), prevA) || prevA; firstA = firstA || prevA; });
    if (n > 0 && sitHead) sitHead.req = firstA ? firstA.id : -1; // 뒤 카드의 상황은 행동까지 들어갈 때만 쓴다 (문제만 말하고 끝나지 않게)
    const res = splitSentences(polite(star(c, 'result'))); let prevR = n === 0 ? lead : firstA || lead; // 뒤 카드의 결과는 행동이 있을 때만 (요약과 겹치지 않게)
    res.forEach((s, i) => {
      const t = i === 0 && !/^(?:그 뒤|그 결과|이후|그 후|처음|결과|바꾸|한 달|\d+[주달일])/.test(s) ? `그 결과 ${s}` : s;
      prevR = add(t, base + (n ? 4.2 : i ? 4.5 : 2), prevR) || prevR;
    });
    if (!res.length && n === 0) add('[결과: 달라진 점이나 받은 반응, 숫자가 있으면 함께]', 2.5, lead);
    para++;
  });
  // 문항이 따로 묻는데 카드에 없는 것
  if (/배운 점|느낀 점|깨달은/.test(q)) add('[이 경험에서 배운 점 한 문장]', 1.2);
  if (/실패|좌절/.test(q)) add('[뜻대로 되지 않았던 순간과 다시 시도한 이유]', 1.2);
  if (/단점/.test(q)) add('[단점과 보완하려고 실제로 하는 일]', 1.2);
  if (motive && future || /입사 후|포부/.test(q)) add(`[입사 후 이루고 싶은 목표: ${co ? co + ' ' : ''}공고의 담당 업무와 연결해 한 가지]`, 1.1);
  // 맺음: 문항 역량 ∩ 카드 역량 (없으면 첫 카드 역량)
  const own = [...new Set(list.flatMap((c) => c.keywords || []))];
  const hit = kws.filter((k) => own.includes(k)); const strong = (hit.length ? hit : own).slice(0, 2);
  const role = jb || (co ? '구성원' : '');
  const end = [co, role].filter(Boolean).join(' ');
  if (strong.length) add(`${list.length > 1 ? '이 경험들에서' : '이 경험에서'} 보여 드린 ${withJosa(eJoin(strong), '을', '를')} ${end ? withJosa(end, '으로서', '로서') + '도' : '입사 후에도'} 실제 업무에서 발휘하겠습니다.`, 1, motive ? null : units[0]);

  const on = new Set();
  const render = (set) => {
    const out = []; units.forEach((u) => { if (set.has(u.id)) (out[u.para] = out[u.para] || []).push(u.text); });
    return out.filter(Boolean).map((p) => p.join(' ')).join('\n\n');
  };
  // 뒤 카드는 행동까지 들어갈 때만 의미가 있으므로 우선순위대로 담고, 넘치면 그 문장만 건너뛴다
  units.slice().sort((a, b) => a.pr - b.pr || a.id - b.id).forEach((u) => {
    if (u.req != null && !on.has(u.req)) return;
    on.add(u.id); if (render(on).length > max) on.delete(u.id);
  });
  const out = render(on); if (out) return out;
  return units[0].text.slice(0, max).replace(/\s+\S*$/, ''); // 제한이 한 문장보다 짧을 때만
}

/* ---------- 이력서 한 줄 (새 카드용): 요약의 끝을 명사형으로 ---------- */
function resumeLineOf(card, max = 80) {
  const VERB = [
    [/줄었(?:다|음)$/, '감소'], [/늘었(?:다|음)$/, '증가'], [/없앴(?:다|음)$/, '제거'], [/빨라졌(?:다|음)$/, '단축'], [/[을를] 크게 줄였(?:다|음)$/, ' 크게 감소'], [/줄였(?:다|음)$/, '단축'], [/늘렸(?:다|음)$/, '확대'], [/(?:만들어 ?냈|만들었)(?:다|음)$/, '제작'], [/막았(?:다|음)$/, '방지'], [/(?:바꿨|바꾸었)(?:다|음)$/, '변경'],
    [/고쳤(?:다|음)$/, '개선'], [/(?:골랐|정했)(?:다|음)$/, '선정'], [/찾았(?:다|음)$/, '발견'], [/([가-힣]*상)을 받았(?:다|음)$/, '$1 수상'], [/게 했(?:다|음)$/, '게 함'], [/받았(?:다|음)$/, '획득'], [/지켰(?:다|음)$/, '유지'],
    [/나눴(?:다|음)$/, '분담'], [/썼(?:다|음)$/, '작성'], [/끝냈(?:다|음)$/, '완료'], [/맡았(?:다|음)$/, '담당'],
  ];
  let s = String(card.summary || card.title || '').trim().split(/(?<=[.])\s+/)[0].replace(/[.。]+$/, '');
  const hit = VERB.find(([re]) => re.test(s));
  if (hit) s = /상을 받았(?:다|음)$|게 했(?:다|음)$|크게 줄였(?:다|음)$|줄었(?:다|음)$|늘었(?:다|음)$|빨라졌(?:다|음)$/.test(s) ? s.replace(hit[0], hit[1]) : s.replace(/[을를] ([가-힣]+)$/, ' $1').replace(hit[0], hit[1]);
  else if (/(?:했다|했음|함)$/.test(s)) s = s.replace(/(?:을|를)?\s?([가-힣]+?)(?:했다|했음|함)$/, ' $1').replace(/\s+/g, ' ');
  else s = s.replace(/([가-힣])다$/, (x, p) => (hangul(p)[2] === 20 ? p + '음' : x));
  s = s.trim();
  while (s.length > max && /,\s/.test(s)) s = s.replace(/^[^,]*,\s*/, ''); // 넘치면 앞의 배경 절부터 뺀다
  return s;
}
  App.essay = { polite, writeEssay };
  // 새 카드의 이력서 한 줄 (카드에 resumeLine 이 없을 때)
  App.ai.resumeLine = (card) => resumeLineOf(card) || card.title;
})(window.App);
