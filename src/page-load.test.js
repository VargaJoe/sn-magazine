import { loadWithTimeout, pageTypeForError } from './page-load';

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

describe('loadWithTimeout', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    expect(jest.getTimerCount()).toBe(0);
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('returns the repository result and preserves options with a child signal', async () => {
    const result = { d: { Id: 42 } };
    const repo = { load: jest.fn().mockResolvedValue(result) };
    const controller = new AbortController();
    const removeListener = jest.spyOn(controller.signal, 'removeEventListener');
    const options = { idOrPath: '/page', requestInit: { credentials: 'include' } };

    await expect(loadWithTimeout(repo, options, controller.signal)).resolves.toBe(result);

    const passedOptions = repo.load.mock.calls[0][0];
    expect(passedOptions).toEqual({
      ...options,
      requestInit: { credentials: 'include', signal: expect.any(AbortSignal) },
    });
    expect(passedOptions.requestInit.signal).not.toBe(controller.signal);
    expect(options.requestInit).toEqual({ credentials: 'include' });
    expect(removeListener).toHaveBeenCalledWith('abort', expect.any(Function));
    jest.runAllTimers();
    expect(passedOptions.requestInit.signal.aborted).toBe(false);
  });

  it.each(['promise rejection', 'synchronous throw'])('cleans up after a %s', async kind => {
    const error = new Error('Backend failure');
    const repo = { load: jest.fn(() => {
      if (kind === 'synchronous throw') throw error;
      return Promise.reject(error);
    }) };
    const controller = new AbortController();
    const removeListener = jest.spyOn(controller.signal, 'removeEventListener');

    await expect(loadWithTimeout(repo, {}, controller.signal, 100)).rejects.toBe(error);

    expect(removeListener).toHaveBeenCalledWith('abort', expect.any(Function));
    jest.runAllTimers();
    expect(repo.load.mock.calls[0][0].requestInit.signal.aborted).toBe(false);
  });

  it('does not call the repository for an already cancelled request', async () => {
    const repo = { load: jest.fn() };
    const controller = new AbortController();
    controller.abort();

    await expect(loadWithTimeout(repo, {}, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });

    expect(repo.load).not.toHaveBeenCalled();
  });

  it('cancels immediately even when the repository ignores the signal', async () => {
    const pending = deferred();
    const repo = { load: jest.fn().mockReturnValue(pending.promise) };
    const controller = new AbortController();
    const removeListener = jest.spyOn(controller.signal, 'removeEventListener');
    const request = loadWithTimeout(repo, {}, controller.signal, 100);
    const assertion = expect(request).rejects.toMatchObject({ name: 'AbortError' });

    controller.abort();

    await assertion;
    expect(repo.load.mock.calls[0][0].requestInit.signal.aborted).toBe(true);
    expect(removeListener).toHaveBeenCalledWith('abort', expect.any(Function));
    pending.resolve('late result');
    await Promise.resolve();
  });

  it('bounds an ignored signal with the default fifteen second timeout', async () => {
    const repo = { load: jest.fn(() => new Promise(() => {})) };
    const controller = new AbortController();
    const removeListener = jest.spyOn(controller.signal, 'removeEventListener');
    const request = loadWithTimeout(repo, {}, controller.signal);
    const assertion = expect(request).rejects.toMatchObject({ name: 'TimeoutError' });
    const childSignal = repo.load.mock.calls[0][0].requestInit.signal;

    jest.advanceTimersByTime(14999);
    expect(childSignal.aborted).toBe(false);
    jest.advanceTimersByTime(1);

    await assertion;
    expect(childSignal.aborted).toBe(true);
    expect(removeListener).toHaveBeenCalledWith('abort', expect.any(Function));
  });

  it('preserves TimeoutError when aborting makes the repository reject', async () => {
    const repo = { load: jest.fn(({ requestInit }) => new Promise((resolve, reject) => {
      requestInit.signal.addEventListener('abort', () => {
        const error = new Error('Aborted transport');
        error.name = 'AbortError';
        reject(error);
      });
    })) };
    const request = loadWithTimeout(repo, {}, undefined, 25);
    const assertion = expect(request).rejects.toMatchObject({ name: 'TimeoutError' });

    jest.advanceTimersByTime(25);

    await assertion;
  });

  it('handles a late repository rejection after timing out', async () => {
    const pending = deferred();
    const repo = { load: jest.fn().mockReturnValue(pending.promise) };
    const unhandledRejection = jest.fn();
    process.on('unhandledRejection', unhandledRejection);
    try {
      const request = loadWithTimeout(repo, {}, undefined, 25);
      const assertion = expect(request).rejects.toMatchObject({ name: 'TimeoutError' });
      jest.advanceTimersByTime(25);
      await assertion;

      pending.reject(new Error('Late backend rejection'));
      await new Promise(resolve => jest.requireActual('timers').setImmediate(resolve));

      expect(unhandledRejection).not.toHaveBeenCalled();
    } finally {
      process.removeListener('unhandledRejection', unhandledRejection);
    }
  });
});

describe('pageTypeForError', () => {
  it.each([
    ['SenseNet extended error', Object.assign(new Error('Not found'), { statusCode: 404 })],
    ['response status', { response: { status: 404 } }],
    ['direct status', { status: 404 }],
    ['string statusCode', { statusCode: '404' }],
    ['string response status', { response: { status: '404' } }],
    ['trimmed direct status', { status: ' 404 ' }],
  ])('recognizes a 404 from %s', (description, error) => {
    expect(pageTypeForError(error)).toBe('not_found');
  });

  it.each([
    ['network failure', new TypeError('Failed to fetch')],
    ['timeout', Object.assign(new Error('Timed out'), { name: 'TimeoutError' })],
    ['cancelled request', Object.assign(new Error('Cancelled'), { name: 'AbortError' })],
    ['server error', { statusCode: 500 }],
    ['unavailable backend', { response: { status: '503' } }],
    ['unauthenticated request', { status: 401 }],
    ['forbidden request', { statusCode: 403 }],
    ['message mentioning 404', new Error('Unexpected 404 in payload')],
    ['malformed string status', { status: '404 missing' }],
    ['object coercible to 404', { status: { valueOf: () => 404 } }],
    ['missing error', undefined],
    ['null error', null],
    ['conflicting fallback', { statusCode: 500, response: { status: 404 } }],
  ])('keeps %s on the error page', (description, error) => {
    expect(pageTypeForError(error)).toBe('error');
  });
});
