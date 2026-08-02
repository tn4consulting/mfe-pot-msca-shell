import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@tn4consulting/shared-i18n';
import { clearSession, getStoredSession, storeSession, createMockSession } from '@tn4consulting/shared-auth';
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

  it('signIn stores a mock session and navigates to the dashboard', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    const fixture = TestBed.createComponent(LoginPage);
    fixture.componentInstance['signIn']();

    expect(getStoredSession()).not.toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith('/dashboard');
  });
});
