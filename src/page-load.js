const namedError = (name, message) => {
  const error = new Error(message);
  error.name = name;
  return error;
};

export function loadWithTimeout(repo, options = {}, signal, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(namedError('AbortError', 'Page loading was cancelled.'));
      return;
    }

    const controller = new AbortController();
    let timer;
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      callback(value);
    };
    const onAbort = () => {
      finish(reject, namedError('AbortError', 'Page loading was cancelled.'));
      controller.abort();
    };

    signal?.addEventListener('abort', onAbort, { once: true });
    timer = setTimeout(() => {
      finish(reject, namedError('TimeoutError', 'Page loading timed out.'));
      controller.abort();
    }, timeoutMs);

    try {
      // Keep handlers attached after cancellation: some repositories ignore abort.
      Promise.resolve(repo.load({
        ...options,
        requestInit: { ...options.requestInit, signal: controller.signal },
      })).then(
        value => finish(resolve, value),
        error => finish(reject, error),
      );
    } catch (error) {
      finish(reject, error);
    }
  });
}

export function pageTypeForError(error) {
  const status = error?.statusCode ?? error?.response?.status ?? error?.status;
  return status === 404 || (typeof status === 'string' && status.trim() === '404')
    ? 'not_found'
    : 'error';
}
