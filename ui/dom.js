export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs ?? {})) {
    if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === 'className') el.className = value;
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key in el && !key.startsWith('aria') && key !== 'role') el[key] = value;
    else if (value !== false && value != null) el.setAttribute(key, String(value));
  }
  el.append(...children.flat(Infinity).filter(child => child != null && child !== false).map(child => child instanceof Node ? child : document.createTextNode(String(child))));
  return el;
}

export function clear(el) {
  el.replaceChildren();
}

export const button = (label, onclick, attrs = {}) => h('button', { type: 'button', onclick, ...attrs }, label);
export const heading = (eyebrow, title) => h('header', { className: 'page-header' }, h('p', { className: 'eyebrow' }, eyebrow), h('h1', { tabIndex: -1 }, title));
export const lawLabel = basis => `산업안전보건법 제${basis}조(${String(basis) === '38' ? '안전조치' : '보건조치'})`;
