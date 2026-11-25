/* 계정 (목업): App.auth — 이 브라우저에만 저장하는 로컬 계정. 서버가 없으므로 실제 서비스의 인증이 아니다.
   비밀번호는 원문을 저장하지 않고 PBKDF2 해시만 남긴다. 데이터는 계정마다 따로 저장한다 (App.store.dataKey) */
window.App = window.App || {};
(function (App) {
  const ACCOUNTS = 'rewrite-accounts'; const SESSION = 'rewrite-session';
  const DEMO = { id: 'demo', email: 'junho@example.com', name: '김준호', demo: true };
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } };
  const accounts = () => read(ACCOUNTS, []);
  const norm = (email) => String(email || '').trim().toLowerCase();
  const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  const err = (field, message) => Object.assign(new Error(message), { field });

  async function hash(password, salt) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' }, key, 256));
  }
  const pub = (a) => (a ? { id: a.id, email: a.email, name: a.name, demo: !!a.demo } : null);
  function open(account) { write(SESSION, account.id); App.store.switchAccount(); return pub(account); }

  App.auth = {
    MIN_PASSWORD: 8,
    // 지금 로그인한 계정 { id, email, name, demo } | null
    current() {
      const id = read(SESSION, null); if (!id) return null;
      return id === DEMO.id ? pub(DEMO) : pub(accounts().find((a) => a.id === id));
    },
    // 실패하면 { field:'name'|'email'|'password', message } 를 가진 에러를 던진다
    async signup({ name, email, password }) {
      name = String(name || '').trim(); email = norm(email); password = String(password || '');
      if (!name) throw err('name', '이름을 적어 주세요.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw err('email', '이메일 주소를 확인해 주세요.');
      if (password.length < this.MIN_PASSWORD) throw err('password', `비밀번호는 ${this.MIN_PASSWORD}자 이상이어야 해요.`);
      if (email === DEMO.email || accounts().some((a) => a.email === email)) throw err('email', '이미 가입한 이메일이에요. 로그인해 주세요.');
      const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
      const a = { id: 'u' + hex(crypto.getRandomValues(new Uint8Array(6))), email, name, salt, hash: await hash(password, salt), createdAt: new Date().toISOString().slice(0, 10) };
      write(ACCOUNTS, accounts().concat(a));
      return open(a);
    },
    async login({ email, password }) {
      email = norm(email);
      if (!email) throw err('email', '이메일을 적어 주세요.');
      if (!password) throw err('password', '비밀번호를 적어 주세요.');
      if (email === DEMO.email) throw err('email', '예시 계정은 아래 버튼으로 들어갈 수 있어요.');
      const a = accounts().find((x) => x.email === email);
      if (!a || (await hash(password, a.salt)) !== a.hash) throw err('password', '이메일 또는 비밀번호가 맞지 않아요.');
      return open(a);
    },
    loginDemo() { return open(DEMO); },
    logout() { try { localStorage.removeItem(SESSION); } catch (e) { /* ignore */ } App.store.switchAccount(); },
    // 탈퇴: 비밀번호를 확인하고 계정과 그 계정의 데이터를 모두 지운다 (예시 계정은 데이터만 처음 상태로)
    async remove(password) {
      const me = this.current(); if (!me) return;
      if (!me.demo) {
        const a = accounts().find((x) => x.id === me.id);
        if ((await hash(String(password || ''), a.salt)) !== a.hash) throw err('password', '비밀번호가 맞지 않아요.');
        write(ACCOUNTS, accounts().filter((x) => x.id !== me.id));
      }
      try { localStorage.removeItem(App.store.dataKey(me.id)); localStorage.removeItem(`rewrite-chat-fold:${me.id}`); } catch (e) { /* ignore */ }
      this.logout();
    },
    rename(name) { const me = this.current(); if (!me || me.demo) return; write(ACCOUNTS, accounts().map((a) => (a.id === me.id ? Object.assign({}, a, { name }) : a))); },
  };
})(window.App);
