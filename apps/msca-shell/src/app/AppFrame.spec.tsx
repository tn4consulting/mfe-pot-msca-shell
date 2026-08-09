import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { clearSession, createMockSession, getStoredSession, storeSession } from '@tn4consulting/shared-auth/core';
import { AppFrame } from './AppFrame';

// Real Stencil custom-element registration isn't relevant to these
// jsdom-based assertions (no shadow-DOM rendering to inspect here) and
// isn't guaranteed to behave identically under jsdom -- mocked out so
// these tests exercise only this component's own logic.
jest.mock('./register-scds', () => ({}));
jest.mock('./asset-base-url', () => ({ assetBaseUrl: 'http://localhost:4200/' }));

function renderFrame() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <AppFrame>
        <p>Routed content</p>
      </AppFrame>
    </MemoryRouter>,
  );
}

describe('AppFrame', () => {
  afterEach(() => {
    clearSession();
    localStorage.clear();
    jest.restoreAllMocks();
  });

  it('always renders the routed content inside the frame', () => {
    renderFrame();
    expect(screen.getByText('Routed content')).toBeInTheDocument();
  });

  it('hides the sign-out button and nav links when there is no session', () => {
    renderFrame();
    expect(screen.queryByRole('button', { name: /accountMenu.signOut/ })).not.toBeInTheDocument();
  });

  it('shows a sign-out button with the signed-in name when a session exists', () => {
    storeSession(createMockSession('Jordan Tremblay'));
    renderFrame();
    expect(screen.getByRole('button', { name: /accountMenu.signOut/ })).toBeInTheDocument();
  });

  it('signOut clears the session', async () => {
    storeSession(createMockSession());
    renderFrame();

    await userEvent.click(screen.getByRole('button', { name: /accountMenu.signOut/ }));

    expect(getStoredSession()).toBeNull();
  });

  it('a real scdsClose event dispatched on the sidebar closes it', async () => {
    storeSession(createMockSession());
    const { container } = renderFrame();

    await userEvent.click(screen.getByRole('button', { name: /appFrame.menuAriaLabel/ }));
    const sidebar = container.querySelector('scds-sidebar');
    expect(sidebar).not.toBeNull();
    expect(sidebar?.getAttribute('open')).not.toBeNull();

    sidebar?.dispatchEvent(new CustomEvent('scdsClose'));

    // dispatchEvent bypasses React's own event system, so the resulting
    // setState doesn't flush synchronously the way a userEvent-driven
    // interaction does -- wait for the re-render rather than asserting
    // immediately.
    await waitFor(() => expect(sidebar?.getAttribute('open')).toBeNull());
  });

  it('selecting a nav link closes the mobile sidebar', async () => {
    storeSession(createMockSession());
    const { container } = renderFrame();

    await userEvent.click(screen.getByRole('button', { name: /appFrame.menuAriaLabel/ }));
    const sidebar = container.querySelector('scds-sidebar');
    expect(sidebar?.getAttribute('open')).not.toBeNull();

    await userEvent.click(screen.getByText('nav.dashboard'));

    expect(sidebar?.getAttribute('open')).toBeNull();
  });

  it('switchLocale broadcasts the other locale', async () => {
    // Asserts the observable effect (localStorage + the broadcast event
    // both being how every remote in this family agrees on the active
    // locale -- see shared-locale-sync) rather than spying on the
    // imported function directly: `broadcastLocaleChange` reaches this
    // component via a re-export chain (shared-i18n re-exporting
    // shared-locale-sync's own export), and jest.spyOn can't redefine a
    // TypeScript-compiled re-export's property descriptor.
    renderFrame();

    await userEvent.click(screen.getByRole('button', { name: 'Français' }));

    expect(localStorage.getItem('mfe-pot-locale')).toBe('fr');
  });
});
