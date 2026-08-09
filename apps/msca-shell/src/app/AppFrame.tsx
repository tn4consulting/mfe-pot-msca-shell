// See App.tsx's own comment on this same import -- required for the
// classic JSX transform this app's tsconfig uses.
import * as React from 'react';
import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthSession, clearSession, getStoredSession, onSessionChange } from '@tn4consulting/shared-auth/core';
import { Locale, broadcastLocaleChange, useLocale, useTranslations } from '@tn4consulting/shared-i18n';
import { assetBaseUrl } from './asset-base-url';
import './register-scds';

/**
 * scds-nav-link renders (via its own shadow DOM) a real internal `<a>`
 * given its `href`, but React Router has no way to make its own `<Link>`
 * "be" a custom element -- attaching a plain click handler directly to
 * the host element works the same way Angular's `routerLink` directive
 * did (and the pre-conversion gcds-nav-link version of this component
 * still does), intercepting the click and using the router's own
 * navigate() instead of a full page load.
 */
function AppNavLink({ href, iconName, children }: { href: string; iconName?: string; children: ReactNode }) {
  const navigate = useNavigate();
  return (
    <scds-nav-link
      href={href}
      icon-name={iconName}
      onClick={(event) => {
        event.preventDefault();
        navigate(href);
      }}
    >
      {children}
    </scds-nav-link>
  );
}

/** A category/utility item with no backing app in this family -- renders inert (no href, no click handling), matching scds-nav-link/scds-nav-group's own `disabled` presentation. */
function InertNavLink({ iconName, children }: { iconName?: string; children: ReactNode }) {
  return (
    <scds-nav-link icon-name={iconName} disabled>
      {children}
    </scds-nav-link>
  );
}

/**
 * The app frame (header + collapsible sidebar nav + footer), owned by the
 * shell only. Remotes render their own content inside it via
 * RemoteRouteHost -- they never render their own header/footer/nav (see
 * CLAUDE.md: the shell owns the app frame; remotes are content only). The
 * nav lives here rather than in any one remote specifically because it
 * needs to appear on every route across all 4 remotes, the same reason
 * header/footer already did -- a remote-owned nav would vanish the moment
 * you navigated to a sibling remote.
 */
export function AppFrame({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const locale = useLocale();
  const { t } = useTranslations(assetBaseUrl, locale);
  const [session, setSession] = useState<AuthSession | null>(() => getStoredSession());
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      <scds-header app-title="My Service Canada Account" skip-to-href="#main-content">
        {session && (
          <button
            slot="nav-toggle"
            className="scds-nav-toggle"
            type="button"
            aria-label="Menu"
            onClick={() => setSidebarOpen(true)}
          >
            <scds-icon name="menu"></scds-icon>
          </button>
        )}
        {/* The language toggle stays available whether or not there's a
            session -- unlike sign-out/nav, it's not identity-gated -- so
            it's a plain sibling in the `account` slot rather than nested
            inside scds-user-menu (which only renders once signed in). */}
        <button slot="account" type="button" onClick={switchLocale}>
          {otherLocale === 'fr' ? 'Français' : 'English'}
        </button>
        {session && (
          <scds-user-menu slot="account" name={session.name}>
            <button type="button" onClick={signOut}>
              {t('accountMenu.signOut', { name: session.name })}
            </button>
          </scds-user-menu>
        )}
      </scds-header>

      <div className="scds-layout">
        {session && (
          <scds-sidebar open={sidebarOpen} label="Site menu" onScdsClose={() => setSidebarOpen(false)}>
            <div slot="primary">
              <AppNavLink href="/dashboard" iconName="home">
                {t('nav.dashboard')}
              </AppNavLink>
              <AppNavLink href="/life-events" iconName="compass">
                {t('nav.lifeEvents')}
              </AppNavLink>
              <InertNavLink iconName="finance">Taxes / Financial</InertNavLink>
              <scds-nav-group label="Employment" icon-name="briefcase">
                <AppNavLink href="/job-bank">{t('nav.jobBank')}</AppNavLink>
                <AppNavLink href="/employment-insurance">{t('nav.employmentInsurance')}</AppNavLink>
              </scds-nav-group>
              <InertNavLink iconName="heart">Health</InertNavLink>
              <InertNavLink iconName="activity">Recreation / Sport</InertNavLink>
              <InertNavLink iconName="plane">Travel</InertNavLink>
              <InertNavLink iconName="book">Education</InertNavLink>
            </div>
            <scds-nav-divider slot="secondary"></scds-nav-divider>
            <div slot="secondary">
              <InertNavLink iconName="message">Messages</InertNavLink>
              <InertNavLink iconName="document">Documents</InertNavLink>
              <scds-nav-group label={`Account - ${session.name}`} icon-name="user">
                <InertNavLink>My Profile</InertNavLink>
                <InertNavLink>Preferences</InertNavLink>
                <InertNavLink>Authorizations</InertNavLink>
                <InertNavLink>Security</InertNavLink>
              </scds-nav-group>
              <InertNavLink iconName="user-check">{`Act on behalf - ${session.name}`}</InertNavLink>
              <scds-nav-link icon-name="log-out" onClick={signOut}>
                Log Out
              </scds-nav-link>
            </div>
          </scds-sidebar>
        )}

        <main id="main-content">
          <div className="scds-container">{children}</div>
        </main>
      </div>

      {/* Footer links are decorative -- this PoT doesn't build out a real
          canada.ca global-footer sitemap -- but point at plausible,
          non-"#" paths (matching those real page titles/URLs) rather than
          bare "#" placeholders, which jsx-a11y/anchor-is-valid correctly
          flags as not a navigable address. */}
      <scds-footer>
        <a slot="column-1" href="/contact-us">
          Contact us
        </a>
        <a slot="column-1" href="/news">
          News
        </a>
        <a slot="column-1" href="/prime-minister">
          Prime Minister
        </a>
        <a slot="column-2" href="/departments-agencies">
          Departments and agencies
        </a>
        <a slot="column-2" href="/treaties-laws-regulations">
          Treaties, laws and regulations
        </a>
        <a slot="column-2" href="/government">
          About government
        </a>
        <a slot="column-3" href="/public-service-military">
          Public service and military
        </a>
        <a slot="column-3" href="/government-wide-reporting">
          Government-wide reporting
        </a>
        <a slot="column-3" href="/open-government">
          Open government
        </a>
        <a slot="bottom" href="/social-media">
          Social media
        </a>
        <a slot="bottom" href="/mobile-applications">
          Mobile applications
        </a>
        <a slot="bottom" href="/about">
          About Canada.ca
        </a>
        <a slot="bottom" href="/terms-conditions">
          Terms and conditions
        </a>
        <a slot="bottom" href="/site-privacy">
          Site Privacy
        </a>
      </scds-footer>
    </>
  );
}
