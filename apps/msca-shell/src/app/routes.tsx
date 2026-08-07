// See App.tsx's own comment on this same import -- required for the
// classic JSX transform this app's tsconfig uses.
import * as React from 'react';
import type { ComponentType } from 'react';
import { Route, Routes } from 'react-router-dom';
import {
  EiReportingStatusWidgetLoaderContext,
  JobApplicationsWidgetLoaderContext,
  PaymentHistoryWidgetLoaderContext,
  RemoteRouteHost,
  useRemoteModuleLoader,
} from '@tn4consulting/shared-federation-runtime';
import { LoginPage } from './LoginPage';
import { AuthCallbackPage } from './AuthCallbackPage';
import { RequireSession } from './RequireSession';

/**
 * Both widget loaders below are wired here but currently unconsumed --
 * dashboard-mfe (React, like every app in the family now; the whole
 * Angular-to-React migration is done) used to embed job-bank's
 * applications widget and employment-insurance's reporting-status widget
 * inline in its own overview, but dropped both embeds once
 * docs/msca-screenshots/dashboard.png showed neither tile actually
 * belongs on the dashboard page -- each now renders directly on its own
 * owning app's page instead (job-bank-mfe's/employment-insurance-mfe's own
 * App.tsx; see mfe-pot-dashboard-mfe's own CLAUDE.md). `RemoteRouteHost`
 * mounts dashboard-mfe's real exported `App` directly, no degraded
 * fallback. The Provider wiring stays in place regardless -- unconsumed
 * but still real and buildable, in case a future consumer wants it, same
 * "kept even though nothing reads it today" reasoning as the federation
 * exposes themselves (see job-bank-mfe's/employment-insurance-mfe's own
 * federation.config.mjs).
 */
function DashboardRoute() {
  const loadRemoteModule = useRemoteModuleLoader();

  return (
    <JobApplicationsWidgetLoaderContext.Provider
      value={async () => {
        const widgetModule = await loadRemoteModule('job-bank-mfe', './JobApplicationsWidget');
        return { component: widgetModule['JobApplicationsList'] as ComponentType<Record<string, unknown>> };
      }}
    >
      <EiReportingStatusWidgetLoaderContext.Provider
        value={async () => {
          // employment-insurance converted to React in Phase 3 -- this
          // now resolves to a real ComponentType, no cast-through-unknown
          // needed for that reason anymore (the `as` stays only because
          // loadRemoteModule's own return type is a plain
          // Record<string, unknown>, same as every other federated
          // module access in this file).
          const widgetModule = await loadRemoteModule('employment-insurance-mfe', './EiReportingStatusWidget');
          return { component: widgetModule['ReportingStatus'] as ComponentType<Record<string, unknown>> };
        }}
      >
        <RemoteRouteHost remoteName="dashboard-mfe" />
      </EiReportingStatusWidgetLoaderContext.Provider>
    </JobApplicationsWidgetLoaderContext.Provider>
  );
}

/**
 * employment-life-events is the CONSUMER of three widgets: dashboard's
 * payment-history widget (original), plus job-bank's job-applications
 * widget and employment-insurance's reporting-status widget (added for
 * its guided-journey checklist, which mounts these two to derive real
 * "have you actually applied / are you actually up to date on reporting"
 * completion state -- see employment-life-events-mfe's own GuidedJourney.tsx
 * and its JobSearchChecklistItem/EiChecklistItems). Same host-mediated
 * pattern as `DashboardRoute` above, just wired to a different consuming
 * route -- there's no conflict in the same Context also being provided
 * there; each route tree gets its own Provider instance.
 */
function EmploymentLifeEventsRoute() {
  const loadRemoteModule = useRemoteModuleLoader();

  return (
    <PaymentHistoryWidgetLoaderContext.Provider
      value={async () => {
        const widgetModule = await loadRemoteModule('dashboard-mfe', './PaymentHistoryWidget');
        return { component: widgetModule['DashboardFeaturePaymentHistory'] as ComponentType<Record<string, unknown>> };
      }}
    >
      <JobApplicationsWidgetLoaderContext.Provider
        value={async () => {
          const widgetModule = await loadRemoteModule('job-bank-mfe', './JobApplicationsWidget');
          return { component: widgetModule['JobApplicationsList'] as ComponentType<Record<string, unknown>> };
        }}
      >
        <EiReportingStatusWidgetLoaderContext.Provider
          value={async () => {
            const widgetModule = await loadRemoteModule('employment-insurance-mfe', './EiReportingStatusWidget');
            return { component: widgetModule['ReportingStatus'] as ComponentType<Record<string, unknown>> };
          }}
        >
          <RemoteRouteHost remoteName="employment-life-events-mfe" />
        </EiReportingStatusWidgetLoaderContext.Provider>
      </JobApplicationsWidgetLoaderContext.Provider>
    </PaymentHistoryWidgetLoaderContext.Provider>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route
        path="/dashboard"
        element={
          <RequireSession>
            <DashboardRoute />
          </RequireSession>
        }
      />
      <Route
        path="/job-loss"
        element={
          <RequireSession>
            <EmploymentLifeEventsRoute />
          </RequireSession>
        }
      />
      <Route
        path="/job-bank"
        element={
          <RequireSession>
            <RemoteRouteHost remoteName="job-bank-mfe" />
          </RequireSession>
        }
      />
      <Route
        path="/employment-insurance"
        element={
          <RequireSession>
            <RemoteRouteHost remoteName="employment-insurance-mfe" />
          </RequireSession>
        }
      />
    </Routes>
  );
}
