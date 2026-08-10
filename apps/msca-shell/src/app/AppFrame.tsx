// See App.tsx's own comment on this same import -- required for the
// classic JSX transform this app's tsconfig uses.
import * as React from 'react';
import { ReactNode, useEffect, useRef, useState } from 'react';
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
function AppNavLink({
  href,
  iconName,
  children,
  onSelect,
}: {
  href: string;
  iconName?: string;
  children: ReactNode;
  onSelect?: () => void;
}) {
  const navigate = useNavigate();
  return (
    <scds-nav-link
      href={href}
      icon-name={iconName}
      onClick={(event) => {
        event.preventDefault();
        navigate(href);
        onSelect?.();
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
 * A real link to a sibling demo service (Grafana, CMS, the job-bank-shell
 * host) -- unlike AppNavLink, it's a genuine cross-origin destination, so it
 * gets a plain browser navigation rather than a preventDefault()+navigate()
 * intercept (there's no client-side route on the other end for React Router
 * to own).
 */
function DemoNavLink({ href, iconName, children }: { href: string; iconName?: string; children: ReactNode }) {
  return (
    <scds-nav-link href={href} icon-name={iconName}>
      {children}
    </scds-nav-link>
  );
}

/**
 * Every other demo/observability surface in the family lives one Ingress
 * label over from this app's own host on the same base domain -- true on
 * both kind (`msca.mfe-pot.local` -> `grafana.mfe-pot.local`) and EKS
 * (`msca.aws.tn4consulting.com` -> `grafana.aws.tn4consulting.com`), per the
 * naming convention in `mfe-pot-platform/CLAUDE.md`. Deriving it from the
 * current origin avoids wiring a third runtime-config field per sibling
 * service just for a sidebar link.
 */
function siblingServiceUrl(serviceLabel: string): string {
  const { protocol, hostname } = window.location;
  const baseDomain = hostname.replace(/^[^.]+\./, '');
  return `${protocol}//${serviceLabel}.${baseDomain}`;
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
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => onSessionChange(setSession), []);

  /**
   * scds-sidebar emits a real bubbling `scdsClose` CustomEvent (overlay
   * click, internal close button) -- but React 19 doesn't wire an
   * `onScdsClose`-shaped JSX prop to a real addEventListener call on a
   * custom element the way it does for a recognized native event like
   * `click`; it silently sets an inert same-named property instead. Same
   * delegated-listener fix employment-insurance-mfe's EiApplicationForm.tsx
   * already established for this exact gotcha.
   */
  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) {
      return;
    }
    function handleClose(): void {
      setSidebarOpen(false);
    }
    sidebar.addEventListener('scdsClose', handleClose);
    return () => sidebar.removeEventListener('scdsClose', handleClose);
  }, [session]);

  const otherLocale: Locale = locale === 'en' ? 'fr' : 'en';

  function switchLocale(): void {
    broadcastLocaleChange(otherLocale);
  }

  function signOut(): void {
    setSidebarOpen(false);
    clearSession();
    navigate('/');
  }

  return (
    <>
      <scds-header app-title={t('appFrame.appTitle')} skip-to-href="#main-content">
        {session && (
          <button
            slot="nav-toggle"
            className="scds-nav-toggle"
            type="button"
            aria-label={t('appFrame.menuAriaLabel')}
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
          <scds-sidebar ref={sidebarRef} open={sidebarOpen} label={t('appFrame.sidebarLabel')}>
            <div slot="primary">
              <AppNavLink href="/dashboard" iconName="home" onSelect={() => setSidebarOpen(false)}>
                {t('nav.dashboard')}
              </AppNavLink>
              <AppNavLink href="/life-events" iconName="activity" onSelect={() => setSidebarOpen(false)}>
                {t('nav.lifeEvents')}
              </AppNavLink>
              <scds-nav-group label={t('appFrame.nav.employmentGroupLabel')} icon-name="briefcase">
                <AppNavLink href="/job-bank" onSelect={() => setSidebarOpen(false)}>
                  {t('nav.jobBank')}
                </AppNavLink>
                <AppNavLink href="/employment-insurance" onSelect={() => setSidebarOpen(false)}>
                  {t('nav.employmentInsurance')}
                </AppNavLink>
              </scds-nav-group>
              {/* The remaining entries mirror the real "Sign in to your account to
                  access services for:" list on Canada.ca/MSCA (see
                  mfe-pot/TODO.md's "Menu / sidebar nav scope" item) -- none of
                  these have a backing remote/BFF in this family yet, so they
                  render inert rather than as dead/misleading links. */}
              <scds-nav-group label={t('appFrame.nav.pensionsGroupLabel')} icon-name="finance">
                <InertNavLink>{t('appFrame.nav.cpp')}</InertNavLink>
                <InertNavLink>{t('appFrame.nav.cppDisability')}</InertNavLink>
                <InertNavLink>{t('appFrame.nav.oas')}</InertNavLink>
                <InertNavLink>{t('appFrame.nav.disabilityBenefit')}</InertNavLink>
              </scds-nav-group>
              <InertNavLink iconName="heart">{t('appFrame.nav.dentalCarePlan')}</InertNavLink>
              <InertNavLink iconName="shield">{t('appFrame.nav.sin')}</InertNavLink>
              <scds-nav-group label={t('appFrame.nav.studentLoansGroupLabel')} icon-name="book">
                <InertNavLink>{t('appFrame.nav.nslsc')}</InertNavLink>
                <InertNavLink>{t('appFrame.nav.apprenticeLoan')}</InertNavLink>
              </scds-nav-group>
              <InertNavLink iconName="plane">{t('appFrame.nav.passport')}</InertNavLink>
            </div>
            <scds-nav-divider slot="secondary"></scds-nav-divider>
            <div slot="secondary">
              <InertNavLink iconName="message">{t('appFrame.nav.messages')}</InertNavLink>
              <InertNavLink iconName="document">{t('appFrame.nav.documents')}</InertNavLink>
              <scds-nav-group label={t('appFrame.nav.accountGroupLabel', { name: session.name })} icon-name="user">
                <InertNavLink>{t('appFrame.nav.myProfile')}</InertNavLink>
                <InertNavLink>{t('appFrame.nav.preferences')}</InertNavLink>
                <InertNavLink>{t('appFrame.nav.authorizations')}</InertNavLink>
                <InertNavLink>{t('appFrame.nav.security')}</InertNavLink>
              </scds-nav-group>
              <InertNavLink iconName="user-check">{t('appFrame.nav.actOnBehalf', { name: session.name })}</InertNavLink>
              <scds-nav-link icon-name="log-out" onClick={signOut}>
                {t('appFrame.nav.logOut')}
              </scds-nav-link>
            </div>
            {/* Links out to the other demo/observability surfaces in the
                family -- not a citizen-facing service, so it stays last and
                visually separated from the real nav above. */}
            <scds-nav-divider slot="secondary"></scds-nav-divider>
            <div slot="secondary">
              <scds-nav-group label={t('appFrame.nav.demoGroupLabel')} icon-name="info-circle">
                <DemoNavLink href={siblingServiceUrl('grafana')}>{t('appFrame.nav.demoGrafana')}</DemoNavLink>
                <DemoNavLink href={siblingServiceUrl('cms')}>{t('appFrame.nav.demoCms')}</DemoNavLink>
                <DemoNavLink href={siblingServiceUrl('unleash')}>{t('appFrame.nav.demoUnleash')}</DemoNavLink>
                <DemoNavLink href={siblingServiceUrl('job-bank')}>{t('appFrame.nav.demoJobBank')}</DemoNavLink>
              </scds-nav-group>
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
          {t('footer.contactUs')}
        </a>
        <a slot="column-1" href="/news">
          {t('footer.news')}
        </a>
        <a slot="column-1" href="/prime-minister">
          {t('footer.primeMinister')}
        </a>
        <a slot="column-2" href="/departments-agencies">
          {t('footer.departmentsAgencies')}
        </a>
        <a slot="column-2" href="/treaties-laws-regulations">
          {t('footer.treatiesLawsRegulations')}
        </a>
        <a slot="column-2" href="/government">
          {t('footer.aboutGovernment')}
        </a>
        <a slot="column-3" href="/public-service-military">
          {t('footer.publicServiceMilitary')}
        </a>
        <a slot="column-3" href="/government-wide-reporting">
          {t('footer.governmentWideReporting')}
        </a>
        <a slot="column-3" href="/open-government">
          {t('footer.openGovernment')}
        </a>
        <a slot="bottom" href="/social-media">
          {t('footer.socialMedia')}
        </a>
        <a slot="bottom" href="/mobile-applications">
          {t('footer.mobileApplications')}
        </a>
        <a slot="bottom" href="/about">
          {t('footer.aboutCanada')}
        </a>
        <a slot="bottom" href="/terms-conditions">
          {t('footer.termsConditions')}
        </a>
        <a slot="bottom" href="/site-privacy">
          {t('footer.sitePrivacy')}
        </a>
      </scds-footer>
    </>
  );
}
