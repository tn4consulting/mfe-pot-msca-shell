import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { App } from './App';

jest.mock('./register-scds', () => ({}));
jest.mock('./asset-base-url', () => ({ assetBaseUrl: 'http://localhost:4200/' }));

describe('App', () => {
  it('renders the login page at the root route by default', () => {
    const loadRemoteModule = jest.fn();
    render(<App loadRemoteModule={loadRemoteModule} />);

    // scds-button isn't hydrated in this test (register-scds is mocked
    // out above), so it has no accessible button role -- assert on its
    // (real, light-DOM) text content instead.
    expect(screen.getByText('login.signInButton')).toBeInTheDocument();
  });
});
