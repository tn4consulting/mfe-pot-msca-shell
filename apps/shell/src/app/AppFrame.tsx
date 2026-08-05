// See App.tsx's own comment on this same import -- required for the
// classic JSX transform this app's tsconfig uses.
import * as React from 'react';
import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthSession, clearSession, getStoredSession, onSessionChange } from '@tn4consulting/shared-auth/core';
import { Locale, broadcastLocaleChange, useLocale, useTranslations } from '@tn4consulting/shared-i18n';
import { assetBaseUrl } from './asset-base-url';
import './register-gcds';

/**
 * gcds-nav-link renders (via its own shadow DOM) a real internal `<a>`
 * given its `href`, but React Router has no way to make its own `<Link>`
 * "be" a custom element -- attaching a plain click handler directly to
 * the host element works the same way Angular's `routerLink` directive
 * does (it also just intercepts a click on whatever host it's bound to,
 * real `<a>` or not), intercepting the click and using the router's own
 * navigate() instead of a full page load.
 */
function AppNavLink({ href, children }: { href: string; children: ReactNode }) {
  const navigate = useNavigate();
  return (
    <gcds-nav-link
      href={href}
      onClick={(event) => {
        event.preventDefault();
        navigate(href);
      }}
    >
      {children}
    </gcds-nav-link>
  );
}

/**
 * The GC-standard app frame (header + footer), owned by the shell only.
 * Remotes render their own content inside it via RemoteRouteHost -- they
 * never render their own header/footer (see CLAUDE.md: the shell owns the
 * app frame; remotes are content only).
 */
export function AppFrame({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const locale = useLocale();
  const { t } = useTranslations(assetBaseUrl, locale);
  const [session, setSession] = useState<AuthSession | null>(() => getStoredSession());

  useEffect(() => onSessionChange(setSession), []);

  const otherLocale: Locale = locale === 'en' ? 'fr' : 'en';

  function switchLocale(): void {
    broadcastLocaleChange(otherLocale);
  }

  function signOut(): void {
    clearSession();
    navigate('/');
  }

  return (
    <>
      <gcds-header skip-to-href="#main-content">
        <gcds-signature slot="signature" type="wordmark" />
        {session && (
          <button slot="account" type="button" onClick={signOut}>
            {t('accountMenu.signOut', { name: session.name })}
          </button>
        )}
        <button slot="toggle" type="button" onClick={switchLocale}>
          {otherLocale === 'fr' ? 'Français' : 'English'}
        </button>
        <gcds-top-nav slot="menu" label="Site menu">
          {session && (
            <>
              <AppNavLink href="/dashboard">{t('nav.dashboard')}</AppNavLink>
              <AppNavLink href="/employment-life-events">{t('nav.employmentLifeEvents')}</AppNavLink>
              <AppNavLink href="/job-bank">{t('nav.jobBank')}</AppNavLink>
              <AppNavLink href="/employment-insurance">{t('nav.employmentInsurance')}</AppNavLink>
            </>
          )}
        </gcds-top-nav>
      </gcds-header>

      <main id="main-content">
        <gcds-container size="xl">{children}</gcds-container>
      </main>

      <gcds-footer display="compact" contextual-heading="My Service Canada Account" />
    </>
  );
}
