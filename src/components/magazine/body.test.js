import { articleBody, safeLink, articleTeaser } from './body';

const parse = html => {
  const container = document.createElement('div');
  container.innerHTML = html;
  return container;
};

describe('article rich text boundary', () => {
  test('keeps hidden editor material out of article text and reserves h1 for the page', () => {
    const body = parse(articleBody('<p hidden>Draft</p><p style="display:none">Metadata</p><div style="visibility:hidden">Hidden</div><h1>Section</h1><p>Visible body.</p>'));
    expect(body.textContent).toBe('SectionVisible body.');
    expect(body.querySelector('h1')).toBeNull();
    expect(body.querySelector('h2').textContent).toBe('Section');
  });
  test('fallback excerpts use a visible body paragraph without exposing embeds or hidden text', () => {
    const text = 'A thoughtful opening paragraph introduces the story and its central question.';
    expect(articleTeaser('<p style="display:none">A very long private draft that must remain hidden here.</p><iframe src="https://remote.example.test"></iframe><p>' + text + '</p>')).toBe(text);
    expect(articleTeaser('<p>' + text.repeat(5) + '</p>', 60).length).toBeLessThanOrEqual(61);
  });
  const originalOrigin = process.env.REACT_APP_API_URL;
  beforeEach(() => { process.env.REACT_APP_API_URL = 'https://repository.example.test'; });
  afterAll(() => {
    if (originalOrigin === undefined) delete process.env.REACT_APP_API_URL;
    else process.env.REACT_APP_API_URL = originalOrigin;
  });

  test('retains headings, paragraphs, emphasis, lists, quotations and tables as semantic rich text', () => {
    const body = parse(articleBody('<h2>A heading</h2><p>A <em>careful</em> <strong>review</strong> &amp; more.</p>' +
      '<blockquote><p>A quotation.</p></blockquote><ul><li>One</li><li>Two</li></ul>' +
      '<table><thead><tr><th colspan="2">Comparison</th></tr></thead><tbody><tr><td>Left</td><td>Right</td></tr></tbody></table>'));
    expect(body.querySelector('h2').textContent).toBe('A heading');
    expect(body.querySelector('p em').textContent).toBe('careful');
    expect(body.querySelector('p strong').textContent).toBe('review');
    expect(body.querySelector('blockquote').textContent).toBe('A quotation.');
    expect(body.querySelectorAll('li')).toHaveLength(2);
    expect(body.querySelector('th').getAttribute('colspan')).toBe('2');
    expect(body.querySelectorAll('td')).toHaveLength(2);
    expect(body.textContent).toContain('& more.');
  });

  test('removes executable/embed/form content, events, styles and unsafe links', () => {
    const body = parse(articleBody('<script>alert(1)</script><style>body{display:none}</style>' +
      '<iframe src="https://third.example.test"></iframe><svg><script>alert(1)</script></svg>' +
      '<form><input name="secret"><button>Send</button></form>' +
      '<p class="injected" style="color:red" onclick="alert(1)">Safe text</p>' +
      '<a href="javascript:alert(1)" onmouseover="alert(1)">Bad link</a>' +
      '<a href="java&#9;script:alert(1)">Obfuscated link</a>' +
      '<a href="data:text/html,hello">Data link</a>'));
    expect(body.querySelector('script,style,iframe,svg,form,input,button')).toBeNull();
    expect(body.querySelector('p').getAttributeNames()).toEqual([]);
    expect([...body.querySelectorAll('a')].every(link => !link.hasAttribute('href'))).toBe(true);
    expect(body.textContent).toContain('Safe text');
  });

  test('allows repository images and safe links, removing remote and credential-bearing image URLs', () => {
    const body = parse(articleBody('<img src="/Root/Content/Images/cover.png" alt="Cover" onerror="alert(1)">' +
      '<img src="https://remote.example.test/cover.png" alt="Remote">' +
      '<img src="https://user:secret@repository.example.test/cover.png" alt="Credentials">' +
      '<a href="https://user:secret@reader.example.test/review">Credentials link</a>' +
      '<a href="https://reader.example.test/review">Reference</a><a href="/archive">Archive</a><a href="#chapter">Chapter</a>'));
    expect(body.querySelectorAll('img')).toHaveLength(1);
    expect(body.querySelector('img').getAttribute('src')).toBe('https://repository.example.test/Root/Content/Images/cover.png');
    expect(body.querySelector('img').getAttribute('alt')).toBe('Cover');
    expect(body.querySelector('img').hasAttribute('onerror')).toBe(false);
    const links = [...body.querySelectorAll('a')];
    expect(links[0].hasAttribute('href')).toBe(false);
    expect(links.slice(1).map(link => link.getAttribute('href'))).toEqual(['https://reader.example.test/review', '/archive', '#chapter']);
    expect(links[1].getAttribute('rel')).toContain('noopener');
  });

  test('does not retain remote or credential-bearing resource URLs on other media elements', () => {
    const body = parse(articleBody('<p>Listen or watch.</p>' +
      '<audio src="https://user:secret@remote.example.test/sound.mp3"></audio>' +
      '<video src="https://remote.example.test/video.mp4"><source src="https://remote.example.test/video.webm"></video>' +
      '<track src="https://remote.example.test/subtitles.vtt">'));
    expect([...body.querySelectorAll('[src]')].map(node => node.getAttribute('src'))).toEqual([]);
    expect(body.textContent).toBe('Listen or watch.');
  });

  test.each(['javascript:alert(1)', '//remote.example.test', '/\\remote.example.test', 'data:text/html,test',
    'https://user:secret@reader.example.test/review', 'https://reader.example.test/\nreview'])('safeLink rejects %p', value => {
    expect(safeLink(value)).toBe('');
  });

  test('empty/non-string editor values produce empty rich text', () => {
    expect(articleBody(null)).toBe('');
    expect(articleBody({ html: '<p>Not a string</p>' })).toBe('');
    expect(articleBody('')).toBe('');
  });
});
