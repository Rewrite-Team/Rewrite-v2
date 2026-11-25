/* 아이콘: App.icon('home') · App.icon('home', 20) → inline SVG 문자열.
   어떤 크기로 그려도 선 굵기는 화면에서 1.6px 이고 색은 글자색(currentColor)을 따른다.
   장식이므로 aria-hidden. 아이콘만 있는 버튼에는 버튼에 aria-label 을 단다. */
window.App = window.App || {};
(function (App) {
  const PATHS = {
    home: '<path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z"/>',
    chat: '<path d="M5 5h14a1 1 0 0 1 1 1v9.5a1 1 0 0 1-1 1h-7L7.5 20v-3.5H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/><path d="M8 9.2h8M8 12.5h5"/>',
    graph: '<circle cx="6" cy="17" r="2.5"/><circle cx="12" cy="6" r="2.5"/><circle cx="18.5" cy="15.5" r="2.5"/><path d="m7.2 14.8 3.6-6.6M13.4 8.1l3.7 5.2M8.5 16.8l7.5-1"/>',
    wiki: '<path d="M12 6.5C10.3 5.4 7.6 5 4 5v13c3.6 0 6.3.4 8 1.5 1.7-1.1 4.4-1.5 8-1.5V5c-3.6 0-6.3.4-8 1.5z"/><path d="M12 6.5v13"/>',
    resume: '<path d="M6 3.5h12a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z"/><circle cx="9.5" cy="8.5" r="1.6"/><path d="M13.5 8.5H16M8 13h8M8 16.5h5"/>',
    building: '<path d="M5 20V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v15M14 10h4a1 1 0 0 1 1 1v9M3 20h18"/><path d="M8 8h3M8 12h3M8 16h3M16.5 14v2"/>',
    settings: '<path d="M4 7.5h9M17 7.5h3M4 16.5h3M11 16.5h9"/><circle cx="15" cy="7.5" r="2"/><circle cx="9" cy="16.5" r="2"/>',
    trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l.8 12a1 1 0 0 0 1 1h7.4a1 1 0 0 0 1-1l.8-12M10.3 11v5M13.7 11v5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="6"/><path d="m15.5 15.5 4.5 4.5"/>',
    github: '<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3.1-3.1a4 4 0 0 0-5.7-5.7L12 6.3"/><path d="M14 10a4 4 0 0 0-5.7 0l-3.1 3.1a4 4 0 0 0 5.7 5.7l1.1-1.1"/>',
    unlink: '<path d="m13.5 17-1.7 1.7a4 4 0 0 1-5.7-5.7L7.5 11.5M10.5 7l1.7-1.7a4 4 0 0 1 5.7 5.7l-1.4 1.5"/><path d="M4 8.5h2.5M8.5 4v2.5M20 15.5h-2.5M15.5 20v-2.5"/>',
    external: '<path d="M13.5 4.5h6v6M19.5 4.5 11 13M17 14v4.5a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1H10"/>',
    edit: '<path d="m4.5 19.5.8-3.8L16 5a1.4 1.4 0 0 1 2 0l1 1a1.4 1.4 0 0 1 0 2L8.3 18.7zM14 7l3 3"/>',
    more: '<g fill="currentColor" stroke="none"><circle cx="5.5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="18.5" cy="12" r="1.5"/></g>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
    'chevron-down': '<path d="m6 9.5 6 6 6-6"/>',
    'chevron-right': '<path d="m9.5 6 6 6-6 6"/>',
    'chevron-left': '<path d="m14.5 6-6 6 6 6"/>',
    'arrow-up': '<path d="M12 19V5M6 11l6-6 6 6"/>',
    'arrow-left': '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    calendar: '<path d="M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM4 10.5h16M8.5 3.5V7M15.5 3.5V7"/>',
    sparkle: '<path d="M11 4.5c.7 4.2 2.3 5.8 6.5 6.5-4.2.7-5.8 2.3-6.5 6.5-.7-4.2-2.3-5.8-6.5-6.5 4.2-.7 5.8-2.3 6.5-6.5zM18.5 15.5v5M16 18h5"/>',
    folder: '<path d="M4 18V6.5a1 1 0 0 1 1-1h4.2l2 2.5H19a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/>',
    card: '<path d="M4.5 5h15a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/><path d="M7 9.5h6M7 13h10M7 16h7"/>',
    restore: '<path d="M8.5 13.5 4 9l4.5-4.5"/><path d="M4 9h10a5.5 5.5 0 0 1 0 11H9"/>',
    logout: '<path d="M10 4.5H6a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h4M15 8l4 4-4 4M19 12h-9"/>',
    user: '<circle cx="12" cy="8.5" r="3.7"/><path d="M4.8 20c.7-3.5 3.5-5.3 7.2-5.3s6.5 1.8 7.2 5.3"/>',
    copy: '<path d="M9.5 8.5h9a1 1 0 0 1 1 1v9.5a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V9.5a1 1 0 0 1 1-1z"/><path d="M15.5 8.5V5a1 1 0 0 0-1-1h-9a1 1 0 0 0-1 1v9.5a1 1 0 0 0 1 1h3"/>',
    print: '<path d="M7.5 9V4h9v5M7.5 16.5H5a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v5.5a1 1 0 0 1-1 1h-2.5M7.5 14h9v6h-9z"/>',
    drag: '<path d="M12 3.5v17M3.5 12h17M9.5 6 12 3.5 14.5 6M9.5 18l2.5 2.5 2.5-2.5M6 9.5 3.5 12 6 14.5M18 9.5l2.5 2.5-2.5 2.5"/>',
    grip: '<g fill="currentColor" stroke="none"><circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/></g>',
    send: '<path d="m4 11.5 16-7-6.5 16-3-6.5zM10.5 14 20 4.5"/>',
    history: '<path d="M4.5 12A7.5 7.5 0 1 0 7 6.4L4.5 8.5M4.5 4.5v4h4M12 8v4.3l3 1.8"/>',
    clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>',
    eye: '<path d="M3 12c2-4 5.2-6 9-6s7 2 9 6c-2 4-5.2 6-9 6s-7-2-9-6z"/><circle cx="12" cy="12" r="2.7"/>',
    lock: '<path d="M6.5 10.5h11a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-7.5a1 1 0 0 1 1-1zM8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5M12 14v2.5"/>',
    mail: '<path d="M5 5.5h14a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1zM4.5 7.5l7.5 6 7.5-6"/>',
    file: '<path d="M6.5 3.5H14l4.5 4.5v11.5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1zM13.5 3.8V8.5h4.7"/>',
    refresh: '<path d="M19.5 11A7.6 7.6 0 0 0 5.8 8L4.5 9.5M4.5 4.8v4.7h4.7M4.5 13a7.6 7.6 0 0 0 13.7 3l1.3-1.5M19.5 19.2v-4.7h-4.7"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    warning: '<path d="M12 4.5 21 19.5H3zM12 10v4.5"/><circle cx="12" cy="17" r=".9" fill="currentColor" stroke="none"/>',
  };
  App.icon = (name, size = 18) => {
    const body = PATHS[name];
    if (!body) { console.warn('App.icon: 없는 아이콘', name); return ''; }
    const stroke = Math.round((1.6 * 24 / size) * 100) / 100;
    return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
  };
  App.icon.names = Object.keys(PATHS);
})(window.App);
