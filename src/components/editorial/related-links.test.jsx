// ReactDOM fixtures need act; deliberately unsafe protocol fixtures verify the URL boundary.
/* eslint testing-library/no-unnecessary-act: "off", no-script-url: "off" */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';
import { RelatedLinks } from './related-links';

const rootPath = '/Root/Content/example';
const link = { Id: 10, DisplayName: 'A related interview', Url: 'https://publisher.example/interview',
  Path: `${rootPath}/interview` };

describe('canonical related links', () => {
  let root;
  let container;
  const originalOrigin = process.env.REACT_APP_API_URL;
  const originalAct = global.IS_REACT_ACT_ENVIRONMENT;
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-06T12:00:00Z'));
    process.env.REACT_APP_API_URL = 'https://repository.example';
    global.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    jest.restoreAllMocks();
  });
  afterAll(() => {
    if (originalOrigin === undefined) delete process.env.REACT_APP_API_URL;
    else process.env.REACT_APP_API_URL = originalOrigin;
    global.IS_REACT_ACT_ENVIRONMENT = originalAct;
  });
  const render = async items => act(async () => root.render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <RelatedLinks items={items} root={rootPath} />
    </MemoryRouter>));

  test('preserves rich descriptions outside the title link while removing executable material', async () => {
    await render([{ ...link, DisplayName: '<b>A related interview</b>', Description:
      '<p>A <em>thoughtful</em> interview with <a href="https://other.example/author">the author</a>.</p>' +
      '<ul><li>A second detail</li></ul><script>bad()</script><iframe src="https://other.example"></iframe>' +
      '<p onclick="bad()" style="color:red">Visible</p><p hidden>Private draft</p>' +
      '<a href="javascript:bad()">Unsafe link</a><img src="https://other.example/tracker.png">' }]);
    expect(container.querySelector('h3 a').textContent).toBe('A related interview');
    expect(container.querySelector('h3 a').getAttribute('href')).toBe(link.Url);
    expect(container.querySelector('.ed-related-description em').textContent).toBe('thoughtful');
    expect(container.querySelector('.ed-related-description li').textContent).toBe('A second detail');
    expect(container.querySelector('.ed-related-description a').getAttribute('href')).toBe('https://other.example/author');
    expect(container.querySelectorAll('a a')).toHaveLength(0);
    expect(container.querySelector('script,iframe,img,[onclick],[hidden],[style]')).toBeNull();
    expect(container.textContent).not.toMatch(/bad\(\)|Private draft/);
    expect(container.querySelectorAll('.ed-related-description a')[1].hasAttribute('href')).toBe(false);
  });

  test('uses the explicit root for native routes and rejects unusable or hidden references', async () => {
    await render({ results: [
      { ...link, Id: 1, Url: '', Path: `${rootPath}/a readable (title)` },
      { ...link, Id: 2, Hidden: true },
      { ...link, Id: 3, Url: 'javascript:bad()', Path: '/Root/Content/other/article' },
      { ...link, Id: 4, Url: 'data:text/html,bad', Path: `${rootPath}/../outside` },
      { ...link, Id: 5, DisplayName: '<script>bad()</script>' }, null,
    ] });
    expect(container.querySelectorAll('.ed-related-item')).toHaveLength(1);
    expect(container.querySelector('h3 a').getAttribute('href')).toBe('/a%20readable%20(title)');
    await render(null);
    expect(container.innerHTML).toBe('');
  });

  test('allows publication-date-free SoftLinks and valid published references including the current instant', async () => {
    await render([
      { ...link, Id: 1, Type: 'SoftLink' },
      { ...link, Id: 2, PublishDate: '2020-01-01T00:00:00Z' },
      { ...link, Id: 3, PublishDate: '2026-11-06T12:00:00Z' },
      { ...link, Id: 4, PublishDate: '/Date(0)/' },
    ]);
    expect(container.querySelectorAll('.ed-related-item')).toHaveLength(4);
  });

  test.each([
    undefined, null, '', 'not-a-date', '0001-01-01T00:00:00Z', '0000-01-01T00:00:00Z',
    `/Date(${Date.parse('0001-01-01T00:00:00Z')})/`,
    '2026-02-30T00:00:00Z', '2026-11-06T12:00:01Z', '2099-01-01T00:00:00Z',
    `/Date(${Date.parse('2099-01-01T00:00:00Z')})/`,
  ])('withholds the entire related row when a present PublishDate is invalid, sentinel or future: %p', async PublishDate => {
    await render([{ ...link, PublishDate, Description: '<p>Unpublished description</p>',
      Embed: '<iframe src="https://www.youtube.com/embed/abcdefghijk"></iframe>' }]);
    expect(container.innerHTML).toBe('');
  });

  test.each(['javascript:bad()', 'data:text/html,bad', '//unsafe.example/path',
    'https://user:secret@unsafe.example/path', '/\\unsafe.example/path', '   ', { href: link.Url }])(
    'does not fall back to a native SoftLink redirect path for unsafe/nonempty Url %p', async Url => {
      await render([{ ...link, Type: 'SoftLink', Url, Path: `${rootPath}/links/unsafe-redirect`,
        Description: '<p>This redirect must remain unavailable.</p>' }]);
      expect(container.innerHTML).toBe('');
    });

  test('uses native routes only for absent or empty URLs and keeps the configured root boundary', async () => {
    await render([
      { ...link, Id: 1, Url: undefined, Path: `${rootPath}/first` },
      { ...link, Id: 2, Url: null, Path: `${rootPath}/second` },
      { ...link, Id: 3, Url: '', Path: `${rootPath}/third` },
      { ...link, Id: 4, Url: '', Path: '/Root/Content/another-site/article' },
    ]);
    expect([...container.querySelectorAll('h3 a')].map(anchor => anchor.getAttribute('href')))
      .toEqual(['/first', '/second', '/third']);
  });

  test.each(['www.youtube.com', 'youtube.com', 'www.youtube-nocookie.com', 'youtube-nocookie.com'])(
    'reconstructs %s players without editor attributes or tracking/autoplay parameters', async host => {
      await render([{ ...link, Embed: `<iframe src="https://${host}/embed/abcdefghijk?si=tracking&autoplay=1" ` +
        'title="An interview video" srcdoc="&lt;script&gt;bad()&lt;/script&gt;" onload="bad()" style="position:fixed" allow="camera; microphone"></iframe>' }]);
      const player = container.querySelector('iframe');
      expect(player.getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/abcdefghijk');
      expect(player.getAttribute('title')).toBe('An interview video');
      expect(player.getAttribute('loading')).toBe('lazy');
      expect(player.getAttribute('sandbox')).toBe('allow-scripts allow-same-origin allow-presentation');
      expect(player.getAttribute('referrerpolicy')).toBe('strict-origin-when-cross-origin');
      expect(player.getAttribute('allow')).not.toMatch(/camera|microphone|autoplay/);
      expect(player.hasAttribute('srcdoc')).toBe(false);
      expect(player.hasAttribute('onload')).toBe(false);
      expect(player.style.position).toBe('');
    });

  test('reconstructs the known Vimeo player path and supplies an accessible default title', async () => {
    await render([{ ...link, Embed: '<iframe src="https://player.vimeo.com/video/123456789?autoplay=1"></iframe>' }]);
    expect(container.querySelector('iframe').getAttribute('src')).toBe('https://player.vimeo.com/video/123456789');
    expect(container.querySelector('iframe').getAttribute('title')).toContain(link.DisplayName);
  });

  test('keeps native video/audio sources and controls, without executable or autoplay attributes', async () => {
    await render([{ ...link, Embed:
      '<video src="https://media.example/clip.mp4" controls autoplay loop onplay="bad()" poster="javascript:bad()">' +
      '<source src="https://media.example/clip.webm" type="video/webm"><source src="javascript:bad()"></video>' +
      '<audio autoplay onerror="bad()"><source src="/Root/Content/audio/talk.ogg" type="audio/ogg">' +
      '<source src="https://media.example/talk.mp3" type="text/html"></audio>' }]);
    const video = container.querySelector('video');
    const audio = container.querySelector('audio');
    expect(video.controls).toBe(true);
    expect(audio.controls).toBe(true);
    expect(video.getAttribute('preload')).toBe('none');
    expect(audio.getAttribute('preload')).toBe('none');
    expect(video.getAttribute('aria-label')).toBe(link.DisplayName);
    expect([...video.querySelectorAll('source')].map(source => source.getAttribute('src')))
      .toEqual(['https://media.example/clip.mp4', 'https://media.example/clip.webm']);
    expect(video.querySelectorAll('source')[1].getAttribute('type')).toBe('video/webm');
    expect(audio.querySelector('source').getAttribute('src')).toBe('https://repository.example/Root/Content/audio/talk.ogg');
    expect(audio.querySelectorAll('source')[1].hasAttribute('type')).toBe(false);
    expect(container.querySelector('[autoplay],[loop],[onplay],[onerror],[poster]')).toBeNull();
  });

  test.each([
    '<iframe src="https://unrecognized.example/player/123"></iframe>',
    '<iframe src="https://www.youtube.com.evil.example/embed/abcdefghijk"></iframe>',
    '<iframe src="https://user:secret@www.youtube.com/embed/abcdefghijk"></iframe>',
    '<iframe src="https://www.youtube.com:8443/embed/abcdefghijk"></iframe>',
    '<iframe src="https://www.youtube.com/embed/too-short"></iframe>',
    '<iframe src="https://www.youtube.com/watch?v=abcdefghijk"></iframe>',
    '<iframe src="https://www.youtube.com/embed/abcdefghijk#extra"></iframe>',
    '<iframe src="//www.youtube.com/embed/abcdefghijk"></iframe>',
    '<iframe src="javascript:bad()" srcdoc="bad"></iframe>',
    '<iframe src="data:text/html,bad"></iframe>',
    '<iframe src="https://www.youtube.com/\\embed/abcdefghijk"></iframe>',
    '<video src="https://user:secret@media.example/clip.mp4"></video>',
    '<audio src="data:audio/mp3;base64,AAAA"></audio>',
    '<video><source src="java&#9;script:bad()"></video>',
    '<iframe src="https://www.youtube.com/embed/abcdefghijk',
    '<script>bad()</script><object data="https://media.example/movie"></object>',
    { html: '<iframe src="https://www.youtube.com/embed/abcdefghijk"></iframe>' },
  ])('retains the descriptive link fallback for unsupported or malformed media %p', async Embed => {
    await render([{ ...link, Description: '<p>Watch or read the interview.</p>', Embed }]);
    expect(container.querySelector('h3 a').getAttribute('href')).toBe(link.Url);
    expect(container.textContent).toContain('Watch or read the interview.');
    expect(container.querySelector('iframe,video,audio,source,script,object,embed')).toBeNull();
  });

  test('does not expose hidden embedded media or repeat media from nested fallback markup', async () => {
    await render([{ ...link, Embed:
      '<div hidden><iframe src="https://www.youtube.com/embed/abcdefghijk"></iframe></div>' +
      '<div style="display:none"><video src="https://media.example/private.mp4"></video></div>' +
      '<audio src="https://media.example/talk.mp3"><video src="https://media.example/fallback.mp4"></video></audio>' }]);
    expect(container.querySelectorAll('audio')).toHaveLength(1);
    expect(container.querySelector('iframe,video')).toBeNull();
    expect(container.querySelectorAll('source')).toHaveLength(1);
  });
});
