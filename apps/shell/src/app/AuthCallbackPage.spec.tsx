import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { clearSession, getStoredSession } from '@tn4consulting/shared-auth/core';
import { storeAuthFlight } from './auth-flight';
import { AuthCallbackPage } from './AuthCallbackPage';

jest.mock('./asset-base-url', () => ({ assetBaseUrl: 'http://localhost:4200/' }));

function renderCallbackPage(search: string) {
  return render(
    <MemoryRouter initialEntries={[`/auth/callback${search}`]}>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/" element={<p>Login page</p>} />
        <Route path="/dashboard" element={<p>Dashboard page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AuthCallbackPage', () => {
  const originalFetch = global.fetch;

  beforeEach(() => sessionStorage.clear());
  afterEach(() => {
    clearSession();
    global.fetch = originalFetch;
  });

  it('fails when code/state are missing from the URL', async () => {
    renderCallbackPage('');

    expect(await screen.findByRole('heading')).toHaveTextContent('authCallback.errorHeading');
    expect(getStoredSession()).toBeNull();
  });

  it('fails when state does not match the stored flight state', async () => {
    storeAuthFlight({ state: 'expected-state', codeVerifier: 'verifier' });
    renderCallbackPage('?code=abc&state=wrong-state');

    expect(await screen.findByRole('heading')).toHaveTextContent('authCallback.errorHeading');
    expect(getStoredSession()).toBeNull();
  });

  it('fails when the token exchange response is not ok', async () => {
    storeAuthFlight({ state: 'xyz', codeVerifier: 'verifier' });
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;

    renderCallbackPage('?code=abc&state=xyz');

    expect(await screen.findByRole('heading')).toHaveTextContent('authCallback.errorHeading');
    expect(getStoredSession()).toBeNull();
  });

  it('fails when the token exchange throws (e.g. network error)', async () => {
    storeAuthFlight({ state: 'xyz', codeVerifier: 'verifier' });
    global.fetch = jest.fn().mockRejectedValue(new Error('network down')) as unknown as typeof fetch;

    renderCallbackPage('?code=abc&state=xyz');

    expect(await screen.findByRole('heading')).toHaveTextContent('authCallback.errorHeading');
  });

  it('stores the session and navigates to /dashboard on a successful exchange', async () => {
    storeAuthFlight({ state: 'xyz', codeVerifier: 'verifier' });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: 'real-looking.jwt.value',
          expires_in: 1800,
          sub: 'citizen-abc123',
          name: 'Alex Chen',
          claims: ['dashboard:access'],
        }),
    }) as unknown as typeof fetch;

    renderCallbackPage('?code=abc&state=xyz');

    expect(await screen.findByText('Dashboard page')).toBeInTheDocument();
    expect(getStoredSession()).toMatchObject({
      sub: 'citizen-abc123',
      name: 'Alex Chen',
      claims: ['dashboard:access'],
      accessToken: 'real-looking.jwt.value',
    });
  });

  it('returnToSignIn navigates back to the login route', async () => {
    renderCallbackPage('');

    await screen.findByRole('heading');
    await userEvent.click(screen.getByRole('button', { name: 'authCallback.returnToSignIn' }));

    await waitFor(() => expect(screen.getByText('Login page')).toBeInTheDocument());
  });
});
