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
 * dashboard is the CONSUMER of both widget loaders below -- its own
 * (still-Angular, at time of writing) `App` embeds job-bank's applications
 * widget and employment-insurance's reporting-status widget inline in the
 * overview. Until dashboard itself converts to React (a later phase of
 * the family-wide migration), `RemoteRouteHost` here can't actually mount
 * dashboard's exported `App` at all -- it's an Angular component class,
 * not a React one -- so this route degrades to RemoteRouteHost's own
 * error-boundary fallback. The Context wiring below is still correct and
 * complete: once dashboard converts, this route needs zero further
 * changes.
 */
function DashboardRoute() {
  const loadRemoteModule = useRemoteModuleLoader();

  return (
    <JobApplicationsWidgetLoaderContext.Provider
      value={async () => {
        const widgetModule = await loadRemoteModule('job-bank', './JobApplicationsWidget');
        return { component: widgetModule['JobApplicationsList'] as ComponentType<Record<string, unknown>> };
      }}
    >
      <EiReportingStatusWidgetLoaderContext.Provider
        value={async () => {
          // TRANSITIONAL: employment-insurance is still Angular at time of
          // writing, so this resolves to an Angular component class, not
          // a real React ComponentType -- see the module doc above.
          const widgetModule = await loadRemoteModule('employment-insurance', './EiReportingStatusWidget');
          return {
            component: widgetModule['EmploymentInsuranceFeatureReportingStatus'] as ComponentType<
              Record<string, unknown>
            >,
          };
        }}
      >
        <RemoteRouteHost remoteName="dashboard" />
      </EiReportingStatusWidgetLoaderContext.Provider>
    </JobApplicationsWidgetLoaderContext.Provider>
  );
}

/**
 * employment-life-events is the CONSUMER of dashboard's payment-history
 * widget. Same transitional caveat as above: dashboard is still Angular,
 * so this Context resolves to an Angular component class until dashboard
 * converts -- and employment-life-events' own route below can't render at
 * all yet either (it's also still Angular), so neither side of this
 * wiring is reachable today. Wired correctly now regardless, per the same
 * "zero further changes once both sides convert" reasoning.
 */
function EmploymentLifeEventsRoute() {
  const loadRemoteModule = useRemoteModuleLoader();

  return (
    <PaymentHistoryWidgetLoaderContext.Provider
      value={async () => {
        const widgetModule = await loadRemoteModule('dashboard', './PaymentHistoryWidget');
        return { component: widgetModule['DashboardFeaturePaymentHistory'] as ComponentType<Record<string, unknown>> };
      }}
    >
      <RemoteRouteHost remoteName="employment-life-events" />
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
        path="/employment-life-events"
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
            <RemoteRouteHost remoteName="job-bank" />
          </RequireSession>
        }
      />
      <Route
        path="/employment-insurance"
        element={
          <RequireSession>
            <RemoteRouteHost remoteName="employment-insurance" />
          </RequireSession>
        }
      />
    </Routes>
  );
}
