// These fixtures use ReactDOM directly; act is required rather than provided by Testing Library.
/* eslint testing-library/no-unnecessary-act: "off" */
import React, { useContext } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { RepositoryContext } from '@sensenet/hooks-react';
import { Repository } from '@sensenet/client-core';
import { useOidcAuthentication } from '@sensenet/authentication-oidc-react';
import { RepositoryProvider } from './app-provider';

jest.mock('./configuration', () => ({ repositoryUrl: 'http://local.example', configuration: {} }));
jest.mock('@sensenet/hooks-react', () => ({ RepositoryContext: require('react').createContext(null) }));
jest.mock('@sensenet/client-core', () => ({ Repository: jest.fn(function (configuration) { this.configuration = configuration; }) }));
jest.mock('@sensenet/authentication-oidc-react', () => ({ AuthenticationProvider: ({ children }) => children, useOidcAuthentication: jest.fn() }));

test('repository identity survives presentation rerenders and changes only with the access token', async () => {
  const previousAct = global.IS_REACT_ACT_ENVIRONMENT; global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div'); const root = createRoot(container); let observed;
  function Probe() { observed = useContext(RepositoryContext); return null; }
  const update = async (user, extra) => {
    useOidcAuthentication.mockReturnValue({ oidcUser: user });
    await act(async () => root.render(<RepositoryProvider><Probe /><span>{extra}</span></RepositoryProvider>));
    return observed;
  };
  try {
    Repository.mockClear();
    const anonymous = await update(null, 'first');
    expect(await update(undefined, 'hash/query navigation')).toBe(anonymous);
    expect(await update({ access_token: '' }, 'empty anonymous token')).toBe(anonymous);
    expect(Repository).toHaveBeenCalledTimes(1);
    const signed = await update({ access_token: 'test-only-a' }, 'signed in');
    expect(signed).not.toBe(anonymous);
    expect(await update({ access_token: 'test-only-a' }, 'new auth object')).toBe(signed);
    const refreshed = await update({ access_token: 'test-only-b' }, 'refreshed token');
    expect(refreshed).not.toBe(signed);
    expect(await update(null, 'signed out')).not.toBe(refreshed);
    expect(Repository).toHaveBeenCalledTimes(4);
    expect(Repository.mock.calls.map(([configuration]) => configuration)).toEqual([
      { repositoryUrl: 'http://local.example' },
      { repositoryUrl: 'http://local.example', accessToken: 'test-only-a' },
      { repositoryUrl: 'http://local.example', accessToken: 'test-only-b' },
      { repositoryUrl: 'http://local.example' },
    ]);
  } finally { await act(async () => root.unmount()); global.IS_REACT_ACT_ENVIRONMENT = previousAct; }
});
