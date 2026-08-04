import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@tn4consulting/shared-i18n';
import { clearSession, storeSession, createMockSession } from '@tn4consulting/shared-auth';
import * as browserRedirect from '../browser-redirect';
import { consumeAuthFlight } from '../auth-flight';
import { LoginPage } from './login-page';

describe('LoginPage', () => {
  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [
        LoginPage,
        TranslocoTestingModule.forRoot({
          langs: { en: {}, fr: {} },
          translocoConfig: { availableLangs: ['en', 'fr'], defaultLang: 'en' },
        }),
      ],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => clearSession());

  it('stays put when there is no active session', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    const fixture = TestBed.createComponent(LoginPage);
    fixture.componentInstance.ngOnInit();

    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('redirects to the dashboard when a session already exists', () => {
    storeSession(createMockSession());
    const router = TestBed.inject(Router);
    const navigateSpy = jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    const fixture = TestBed.createComponent(LoginPage);
    fixture.componentInstance.ngOnInit();

    expect(navigateSpy).toHaveBeenCalledWith('/dashboard');
  });

  it("signIn redirects to mock-idp's /authorize with a PKCE code challenge", async () => {
    const redirectSpy = jest.spyOn(browserRedirect, 'redirectTo').mockImplementation(() => undefined);

    const fixture = TestBed.createComponent(LoginPage);
    await fixture.componentInstance['signIn']();

    expect(redirectSpy).toHaveBeenCalledTimes(1);
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

    const fixture = TestBed.createComponent(LoginPage);
    await fixture.componentInstance['signIn']();

    const flight = consumeAuthFlight();
    expect(flight?.state).toBeTruthy();
    expect(flight?.codeVerifier).toBeTruthy();
  });
});
