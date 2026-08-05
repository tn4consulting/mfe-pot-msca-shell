import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { clearSession, createMockSession, storeSession } from '@tn4consulting/shared-auth/core';
import { RequireSession } from './RequireSession';

function renderGuarded() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/" element={<p>Login page</p>} />
        <Route
          path="/dashboard"
          element={
            <RequireSession>
              <p>Protected</p>
            </RequireSession>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireSession', () => {
  afterEach(() => clearSession());

  it('redirects to / when there is no session', () => {
    renderGuarded();
    expect(screen.getByText('Login page')).toBeInTheDocument();
    expect(screen.queryByText('Protected')).not.toBeInTheDocument();
  });

  it('renders children when a session exists', () => {
    storeSession(createMockSession());
    renderGuarded();
    expect(screen.getByText('Protected')).toBeInTheDocument();
  });
});
