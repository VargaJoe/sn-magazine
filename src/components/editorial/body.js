import { repositoryImage } from './repository';

export function safeLink(value) {
  if (typeof value !== 'string' || !value.trim() || [...value].some(character => character.charCodeAt(0) < 32)) return '';
  if (value.startsWith('#')) return value;
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')) return value;
  try {
    const url = new URL(value);
    return ['https:', 'http:', 'mailto:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
  } catch (_) { return ''; }
}

export function articleBody(value) {
  if (typeof value !== 'string') return '';
  const template = document.createElement('template');
  template.innerHTML = value;
  template.content.querySelectorAll('script,style,iframe,object,embed,form,input,button,link,meta,base,template,svg,math,audio,video,source,track').forEach(node => node.remove());
  template.content.querySelectorAll('[hidden],[style]').forEach(node => {
    if (node.hasAttribute('hidden') || ['none'].includes(node.style.display.toLowerCase()) || node.style.visibility.toLowerCase() === 'hidden') node.remove();
  });
  template.content.querySelectorAll('h1').forEach(node => {
    const heading = document.createElement('h2'); heading.append(...node.childNodes); node.replaceWith(heading);
  });
  template.content.querySelectorAll('*').forEach(node => {
    [...node.attributes].forEach(attribute => {
      if (!['href', 'src', 'alt', 'title', 'colspan', 'rowspan'].includes(attribute.name)) node.removeAttribute(attribute.name);
    });
    if (node.hasAttribute('href')) {
      const href = safeLink(node.getAttribute('href'));
      if (href) { node.setAttribute('href', href); node.setAttribute('rel', 'noopener noreferrer'); }
      else node.removeAttribute('href');
    }
    if (node.tagName === 'IMG') {
      const src = repositoryImage(node.getAttribute('src'));
      if (!src) node.remove();
      else { node.setAttribute('src', src); node.setAttribute('loading', 'lazy'); }
    }
  });
  return template.innerHTML;
}

export function articleTeaser(value, limit = 220) {
  const template = document.createElement('template');
  template.innerHTML = articleBody(value);
  const paragraph = [...template.content.querySelectorAll('p')].map(node => node.textContent.replace(/\s+/g, ' ').trim()).find(text => text.length >= 30);
  if (!paragraph) return '';
  return paragraph.length <= limit ? paragraph : paragraph.slice(0, limit).replace(/\s+\S*$/, '') + '…';
}
