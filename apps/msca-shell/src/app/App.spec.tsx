import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { App } from './App';

jest.mock('./register-scds', () => ({}));
jest.mock('./asset-base-url', () => ({ assetBaseUrl: 'http://localhost:4200/' }));

// This test only renders the login route, which never calls
// loadRemoteModule -- mocked directly rather than exercising the real
// jose-backed createVerifiedRemoteModuleLoader, both for isolation (a
// component-render smoke test shouldn't need real crypto -- that's
// shared-remote-integrity's own test suite's job) and to sidestep Jest's
// buildable-library resolver quirk against a locally file:-linked
// package.
const mockCreateVerifiedRemoteModuleLoader = jest.fn((rawLoadRemoteModule: unknown) => rawLoadRemoteModule);
jest.mock('@tn4consulting/shared-remote-integrity', () => ({
  createVerifiedRemoteModuleLoader: (...args: unknown[]) => mockCreateVerifiedRemoteModuleLoader(...args),
}));

describe('App', () => {
  beforeEach(() => {
    mockCreateVerifiedRemoteModuleLoader.mockClear();
  });

  it('renders the login page at the root route by default', () => {
    const loadRemoteModule = jest.fn();
    const verifiedRemoteContext = {
      verifiedManifests: new Map(),
      remoteBaseUrls: new Map(),
      allowUnverifiedRemotes: false,
    };
    render(<App loadRemoteModule={loadRemoteModule} verifiedRemoteContext={verifiedRemoteContext} />);

    // scds-button isn't hydrated in this test (register-scds is mocked
    // out above), so it has no accessible button role -- assert on its
    // (real, light-DOM) text content instead.
    expect(screen.getByText('login.signInButton')).toBeInTheDocument();
  });

  it('wraps loadRemoteModule with verification when allowUnverifiedRemotes is false', () => {
    const loadRemoteModule = jest.fn();
    const verifiedRemoteContext = {
      verifiedManifests: new Map(),
      remoteBaseUrls: new Map(),
      allowUnverifiedRemotes: false,
    };
    render(<App loadRemoteModule={loadRemoteModule} verifiedRemoteContext={verifiedRemoteContext} />);
    expect(mockCreateVerifiedRemoteModuleLoader).toHaveBeenCalledWith(loadRemoteModule, verifiedRemoteContext);
  });

  it('skips the verification wrapper entirely when allowUnverifiedRemotes is true (dev escape hatch)', () => {
    const loadRemoteModule = jest.fn();
    const verifiedRemoteContext = {
      verifiedManifests: new Map(),
      remoteBaseUrls: new Map(),
      allowUnverifiedRemotes: true,
    };
    render(<App loadRemoteModule={loadRemoteModule} verifiedRemoteContext={verifiedRemoteContext} />);
    expect(mockCreateVerifiedRemoteModuleLoader).not.toHaveBeenCalled();
  });
});
