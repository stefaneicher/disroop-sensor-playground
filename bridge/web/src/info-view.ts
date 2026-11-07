// ⓘ buttons (`button.info[data-info]`) open one shared popover with the glossary text; the "Messgrössen erklärt"
// table is rendered from the same data. Works with mouse, touch and keyboard (Enter/Space, Escape, focus return).
import { GLOSSARY, glossaryEntry, type GlossaryEntry } from './glossary.ts';
import { placePopover } from './placement.ts';

function el<K extends keyof HTMLElementTagNameMap>(doc: Document, tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = doc.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function facts(doc: Document, entry: GlossaryEntry): HTMLDListElement {
  const dl = el(doc, 'dl', 'info-facts');
  for (const [k, v] of [['Einheit', entry.unit], ['Sensor', entry.sensor], ['Typisch', entry.typical]]) {
    const row = el(doc, 'div');
    row.append(el(doc, 'dt', undefined, k), el(doc, 'dd', undefined, v));
    dl.append(row);
  }
  return dl;
}

export function renderGlossary(doc: Document): void {
  const body = doc.getElementById('glossary-rows');
  if (!body) return;
  body.replaceChildren(...GLOSSARY.map((e) => {
    const tr = el(doc, 'tr');
    tr.id = `glossary-${e.id}`;
    const name = el(doc, 'th', undefined, e.title);
    name.scope = 'row';
    tr.append(
      name,
      el(doc, 'td', 'g-unit', e.unit),
      el(doc, 'td', 'g-sensor', e.sensor),
      el(doc, 'td', 'g-text', e.text),
      el(doc, 'td', 'g-typical', e.typical),
    );
    return tr;
  }));
}

function openGlossary(doc: Document, id?: string): void {
  const details = doc.getElementById('glossary-details') as HTMLDetailsElement | null;
  if (!details) return;
  details.open = true;
  const target = (id && doc.getElementById(`glossary-${id}`)) || details;
  target.scrollIntoView({ block: 'start', behavior: 'smooth' });
  details.querySelector('summary')?.focus({ preventScroll: true });
}

export function bindInfo(doc: Document): void {
  const win = doc.defaultView ?? window;
  const pop = el(doc, 'div', 'info-pop');
  pop.id = 'info-pop';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-labelledby', 'info-pop-title');
  pop.tabIndex = -1;
  pop.hidden = true;
  doc.body.append(pop);
  let current: HTMLElement | null = null;

  const close = (returnFocus: boolean): void => {
    if (!current) return;
    const btn = current;
    current = null;
    pop.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    if (returnFocus) btn.focus();
  };

  const open = (btn: HTMLElement, entry: GlossaryEntry): void => {
    if (current) close(false);
    const title = el(doc, 'h4', undefined, entry.title);
    title.id = 'info-pop-title';
    const shut = el(doc, 'button', 'info-close', '×');
    shut.type = 'button';
    shut.setAttribute('aria-label', 'Erklärung schliessen');
    shut.addEventListener('click', () => close(true));
    const more = el(doc, 'a', 'info-more', 'Alle Messgrössen erklärt ↓');
    more.href = `#glossary-${entry.id}`;
    more.addEventListener('click', (ev) => { ev.preventDefault(); close(false); openGlossary(doc, entry.id); });
    pop.replaceChildren(el(doc, 'i', 'info-arrow'), shut, title, el(doc, 'p', 'info-text', entry.text), facts(doc, entry), more);
    pop.hidden = false;
    current = btn;
    btn.setAttribute('aria-expanded', 'true');
    const p = placePopover(btn.getBoundingClientRect(), pop.getBoundingClientRect(), { width: doc.documentElement.clientWidth, height: win.innerHeight });
    pop.style.left = `${p.left + win.scrollX}px`;
    pop.style.top = `${p.top + win.scrollY}px`;
    pop.style.setProperty('--arrow-x', `${p.arrowX}px`);
    pop.dataset.above = String(p.above);
    pop.focus({ preventScroll: true });
  };

  for (const btn of doc.querySelectorAll<HTMLButtonElement>('button.info[data-info]')) {
    const entry = glossaryEntry(btn.dataset.info ?? '');
    if (!entry) continue;
    btn.type = 'button';
    btn.textContent = 'i';
    btn.setAttribute('aria-label', `Erklärung: ${entry.title}`);
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.setAttribute('aria-controls', 'info-pop');
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (current === btn) close(false);
      else open(btn, entry);
    });
  }

  doc.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') close(true); });
  doc.addEventListener('pointerdown', (ev) => {
    const t = ev.target as Node | null;
    if (current && t && !pop.contains(t) && !current.contains(t)) close(false);
  });
  pop.addEventListener('focusout', (ev) => {
    const next = ev.relatedTarget as Node | null;
    if (current && next && !pop.contains(next) && !current.contains(next)) close(false);
  });
  win.addEventListener('resize', () => close(false));

  renderGlossary(doc);
  if (win.location.hash.startsWith('#glossary')) openGlossary(doc);
}
