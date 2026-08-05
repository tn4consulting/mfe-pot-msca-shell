import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { clearSession, storeSession, createMockSession } from '@tn4consulting/shared-auth/core';
import * as browserRedirect from './browser-redirect';
import { consumeAuthFlight } from './auth-flight';
import { LoginPage } from './LoginPage';

// `import.meta.url` (asset-base-url.ts's own computation) is a syntax
// construct ts-jest can't downlevel to CommonJS -- see that module's own
// doc comment. Mocked rather than executed, same as job-bank's precedent.
jest.mock('./asset-base-url', () => ({ assetBaseUrl: 'http://localhost:4200/' }));

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<p>Dashboard page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => clearSession());

  it('stays put when there is no active session', () => {
    renderLoginPage();
    expect(screen.queryByText('Dashboard page')).not.toBeInTheDocument();
  });

  it('redirects to the dashboard when a session already exists', async () => {
    storeSession(createMockSession());
    renderLoginPage();
    expect(await screen.findByText('Dashboard page')).toBeInTheDocument();
  });

  it("signIn redirects to mock-idp's /authorize with a PKCE code challenge", async () => {
    const redirectSpy = jest.spyOn(browserRedirect, 'redirectTo').mockImplementation(() => undefined);
    renderLoginPage();

    await userEvent.click(screen.getByRole('button', { name: 'login.signInButton' }));
    await waitFor(() => expect(redirectSpy).toHaveBeenCalledTimes(1));

    const url = new URL(redirectSpy.mock.calls[0][0]);
    expect(url.origin).toBe('http://localhost:3005');
    expect(url.pathname).toBe('/authorize');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe('mfe-pot-shell');
    expect(url.searchParams.get('redirect_uri')).toBe(`${window.location.origin}/auth/callback`);
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('state')).toBeTruthy();
    expect(url.searchParams.get('code_challenge')).toBeTruthy();
  });

  it('signIn stores flight state for the callback page to consume', async () => {
    jest.spyOn(browserRedirect, 'redirectTo').mockImplementation(() => undefined);
    renderLoginPage();

    await userEvent.click(screen.getByRole('button', { name: 'login.signInButton' }));

    await waitFor(() => {
      const flight = consumeAuthFlight();
      expect(flight?.state).toBeTruthy();
      expect(flight?.codeVerifier).toBeTruthy();
    });
  });
});
