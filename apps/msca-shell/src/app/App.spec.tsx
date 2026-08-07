import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { App } from './App';

jest.mock('./register-scds', () => ({}));
jest.mock('./asset-base-url', () => ({ assetBaseUrl: 'http://localhost:4200/' }));

describe('App', () => {
  it('renders the login page at the root route by default', () => {
    const loadRemoteModule = jest.fn();
    render(<App loadRemoteModule={loadRemoteModule} />);

    expect(screen.getByRole('button', { name: 'login.signInButton' })).toBeInTheDocument();
  });
});
