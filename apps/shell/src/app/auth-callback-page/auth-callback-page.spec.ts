import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@tn4consulting/shared-i18n';
import { clearSession, getStoredSession } from '@tn4consulting/shared-auth';
import { storeAuthFlight } from '../auth-flight';
import { AuthCallbackPage } from './auth-callback-page';

function activatedRouteStub(queryParams: Record<string, string>) {
  return {
    snapshot: { queryParamMap: convertToParamMap(queryParams) },
  };
}

async function createFixture(queryParams: Record<string, string>) {
  await TestBed.configureTestingModule({
    imports: [
      AuthCallbackPage,
      TranslocoTestingModule.forRoot({
        langs: { en: {}, fr: {} },
        translocoConfig: { availableLangs: ['en', 'fr'], defaultLang: 'en' },
      }),
    ],
    providers: [provideRouter([]), { provide: ActivatedRoute, useValue: activatedRouteStub(queryParams) }],
  }).compileComponents();

  return TestBed.createComponent(AuthCallbackPage);
}

describe('AuthCallbackPage', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    clearSession();
    global.fetch = originalFetch;
  });

  it('fails when code/state are missing from the URL', async () => {
    const fixture = await createFixture({});
    await fixture.componentInstance.ngOnInit();

    expect(fixture.componentInstance['failed']).toBe(true);
    expect(getStoredSession()).toBeNull();
  });

  it('fails when state does not match the stored flight state', async () => {
    storeAuthFlight({ state: 'expected-state', codeVerifier: 'verifier' });
    const fixture = await createFixture({ code: 'abc', state: 'wrong-state' });
    await fixture.componentInstance.ngOnInit();

    expect(fixture.componentInstance['failed']).toBe(true);
    expect(getStoredSession()).toBeNull();
  });

  it('fails when the token exchange response is not ok', async () => {
    storeAuthFlight({ state: 'xyz', codeVerifier: 'verifier' });
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;

    const fixture = await createFixture({ code: 'abc', state: 'xyz' });
    await fixture.componentInstance.ngOnInit();

    expect(fixture.componentInstance['failed']).toBe(true);
    expect(getStoredSession()).toBeNull();
  });

  it('fails when the token exchange throws (e.g. network error)', async () => {
    storeAuthFlight({ state: 'xyz', codeVerifier: 'verifier' });
    global.fetch = jest.fn().mockRejectedValue(new Error('network down')) as unknown as typeof fetch;

    const fixture = await createFixture({ code: 'abc', state: 'xyz' });
    await fixture.componentInstance.ngOnInit();

    expect(fixture.componentInstance['failed']).toBe(true);
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

    const fixture = await createFixture({ code: 'abc', state: 'xyz' });
    const router = TestBed.inject(Router);
    const navigateSpy = jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    await fixture.componentInstance.ngOnInit();

    expect(fixture.componentInstance['failed']).toBe(false);
    expect(getStoredSession()).toMatchObject({
      sub: 'citizen-abc123',
      name: 'Alex Chen',
      claims: ['dashboard:access'],
      accessToken: 'real-looking.jwt.value',
    });
    expect(navigateSpy).toHaveBeenCalledWith('/dashboard');
  });

  it('returnToSignIn navigates back to the login route', async () => {
    const fixture = await createFixture({});
    const router = TestBed.inject(Router);
    const navigateSpy = jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    fixture.componentInstance['returnToSignIn']();

    expect(navigateSpy).toHaveBeenCalledWith('/');
  });
});
