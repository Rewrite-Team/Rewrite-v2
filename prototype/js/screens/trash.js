/* 휴지통 — #/trash. 프로젝트·채팅·경험 카드·지원 기업을 되살리거나 완전히 지운다 */
(function (App) {
  const esc = (s) => App.ui.esc(s); const S = App.store;
  const TYPE = { project: ['프로젝트', 'folder'], chat: ['채팅', 'chat'], card: ['경험 카드', 'card'], app: ['지원 기업', 'building'] };

  // 어느 프로젝트의 것인지. 그 프로젝트도 휴지통에 있으면 휴지통의 이름을 쓴다
  function projectName(t) {
    if (t.type === 'project' || !t.projectId) return '';
    const p = S.getProject(t.projectId); if (p) return p.title;
    const pt = S.trash().find((x) => x.type === 'project' && x.projectId === t.projectId); return pt ? pt.title : '';
  }
  function inside(t) {
    if (t.type !== 'project') return '';
    const n = t.data; const list = [[n.experiences, '경험 카드'], [n.chats, '채팅']].filter(([l]) => l && l.length).map(([l, name]) => `${name} ${l.length}개`);
    return list.join(', ');
  }
  // 프로젝트를 완전히 지울 때 함께 지워지는, 따로 버린 채팅과 카드의 수
  const alone = (t) => (t.type === 'project' ? S.trash().filter((x) => x.type !== 'project' && x.projectId === t.projectId).length : 0);
  function rowHTML(t) {
    const [label, icon] = TYPE[t.type]; const left = S.daysLeft(t); const pn = projectName(t);
    return `<li class="list-row tr-row" data-id="${esc(t.id)}">${App.icon(icon)}
      <div class="list-row-main"><div class="list-row-title">${esc(t.title)}</div>
        <div class="list-row-sub tr-sub"><span>${label}</span>${pn ? `<span class="proj-chip">${App.icon('folder', 14)}<span>${esc(pn)}</span></span>` : ''}${inside(t) ? `<span>${esc(inside(t))} 포함</span>` : ''}<span>${left}일 뒤 삭제</span></div></div>
      <div class="list-row-actions"><button type="button" class="btn btn-sm" data-act="restore" aria-label="${esc(t.title)} 복원">복원</button><button type="button" class="btn btn-sm btn-ghost btn-danger" data-act="purge" aria-label="${esc(t.title)} 완전 삭제">완전 삭제</button></div></li>`;
  }
  App.screens.trash = {
    title: '휴지통',
    render() {
      const list = S.trash();
      return `<div class="page page-narrow"><header class="page-head"><div><h1>휴지통</h1>${list.length ? `<p>${S.TRASH_DAYS}일이 지나면 완전히 삭제돼요.</p>` : ''}</div>${list.length ? '<div class="page-head-actions"><button type="button" class="btn btn-danger" data-act="empty">휴지통 비우기</button></div>' : ''}</header>
        ${list.length ? `<ul class="list tr-list">${list.map(rowHTML).join('')}</ul>` : `<div class="empty"><div class="empty-title">휴지통이 비어 있어요</div><p>버린 항목은 ${S.TRASH_DAYS}일 동안 여기에 있어요.</p></div>`}</div>`;
    },
    mount(root) {
      // 다시 그려도 보던 자리에 그대로
      const redraw = () => { const y = window.scrollY; App.rerender(); window.scrollTo(0, y); const b = document.querySelector('.tr-list [data-act=restore]'); if (b) b.focus({ preventScroll: true }); };
      root.onclick = (ev) => {
        const b = ev.target.closest('[data-act]'); if (!b) return; const act = b.getAttribute('data-act');
        const row = b.closest('[data-id]'); const t = row && S.getTrash(row.getAttribute('data-id'));
        if (act === 'restore' && t) {
          const r = S.restore(t.id); if (!r) { App.ui.toast('속한 프로젝트가 없어서 복원할 수 없어요'); return; }
          redraw(); App.ui.toast(r.withProject ? `「${r.withProject}」 프로젝트도 함께 복원했어요` : '복원했어요', { action: '보기', onAction: () => App.navigate(r.hash) });
        } else if (act === 'purge' && t) {
          App.ui.modal({ title: '완전히 삭제할까요?', body: `<p>${TYPE[t.type][0]} 「${esc(t.title)}」</p>${inside(t) || alone(t) ? `<p>${[inside(t), alone(t) ? `따로 버린 항목 ${alone(t)}개` : ''].filter(Boolean).join(', ')}도 함께 지워져요.</p>` : ''}<p>되돌릴 수 없어요.</p>`, confirmText: '완전 삭제', danger: true, onConfirm() { S.purge(t.id); redraw(); App.ui.toast('완전히 삭제했어요'); } });
        } else if (act === 'empty') {
          App.ui.modal({ title: '휴지통을 비울까요?', body: `<p>${S.trash().length}개 항목을 되돌릴 수 없어요.</p>`, confirmText: '비우기', danger: true, onConfirm() { S.emptyTrash(); redraw(); App.ui.toast('휴지통을 비웠어요'); } });
        }
      };
      return () => { root.onclick = null; };
    },
  };
})(window.App);
