'use strict';
/* Unified accordion used by every list screen. items: [{id,icon,title,sub,badge,open,body:()=>Node|Node[]}] — bodies render lazily on first open. */
CD.accordion = (items, { single = false, key } = {}) => {
  const { h, ic } = CD; const root = h('.acc');
  const store = key ? (() => { try { return JSON.parse(sessionStorage.getItem('acc.' + key) || '[]'); } catch { return []; } })() : [];
  const save = () => { if (key) try { sessionStorage.setItem('acc.' + key, JSON.stringify([...root.children].filter((e) => e.classList.contains('open')).map((e) => e.dataset.id))); } catch { /* ok */ } };
  for (const it of items) {
    const inner = h('.acc-in'); let built = false;
    const el = h('.acc-item', { 'data-id': it.id || it.title });
    const build = () => { if (built) return; built = true; CD.mount(inner, typeof it.body === 'function' ? it.body() : it.body); };
    const toggle = (force) => {
      const open = force ?? !el.classList.contains('open');
      if (open) { build(); if (single) [...root.children].forEach((o) => o !== el && o.classList.remove('open')); }
      el.classList.toggle('open', open); head.setAttribute('aria-expanded', open); save();
    };
    const head = h('button.acc-h', { onclick: () => toggle(), 'aria-expanded': 'false' }, it.icon ? h('span.ai', { html: ic(it.icon) }) : null, h('span.at', h('b', it.title), it.sub ? h('small', it.sub) : null), it.badge != null ? h('span.pill', it.badge) : null, h('span.chev', { html: ic('down') }));
    el.append(head, h('.acc-b', h('div', inner))); root.append(el);
    if (it.open || store.includes(el.dataset.id)) toggle(true);
  }
  return root;
};
